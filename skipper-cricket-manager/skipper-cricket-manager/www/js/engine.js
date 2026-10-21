/* Skipper Cricket Manager — match engine (all formats) */
(function (G) {
  'use strict';
  const SK = G.SK = G.SK || {};
  const U = SK.U;

  // ---------------------------------------------------------------- formats
  const FORMATS = {
    T20: { key: 'T20', label: 'T20', lo: true, overs: 20, bpo: 6, maxOv: 4, inns: 1, pp: 6, death: 16, stat: 'T20', wide: 0.036, nb: 0.005, revs: 2 },
    T20I: { key: 'T20I', label: 'T20I', lo: true, overs: 20, bpo: 6, maxOv: 4, inns: 1, pp: 6, death: 16, stat: 'T20I', wide: 0.036, nb: 0.005, intl: true, revs: 2 },
    ODI: { key: 'ODI', label: 'ODI', lo: true, overs: 50, bpo: 6, maxOv: 10, inns: 1, pp: 10, death: 40, stat: 'ODI', wide: 0.024, nb: 0.004, intl: true, revs: 2 },
    HUN: { key: 'HUN', label: 'The Hundred', lo: true, overs: 20, bpo: 5, maxOv: 4, inns: 1, pp: 5, death: 16, stat: 'HUN', wide: 0.036, nb: 0.005, consec: true, revs: 1 },
    TEST: { key: 'TEST', label: 'Test', lo: false, overs: 0, bpo: 6, inns: 2, days: 5, opd: 90, followOn: 200, stat: 'TEST', wide: 0.004, nb: 0.006, intl: true, revs: 3 },
    FC4: { key: 'FC4', label: 'First-class', lo: false, overs: 0, bpo: 6, inns: 2, days: 4, opd: 96, followOn: 150, stat: 'FC', wide: 0.004, nb: 0.006, revs: 0, wMul: 1.22 },
  };
  SK.FORMATS = FORMATS;

  const PITCH = {
    F: { name: 'Flat road', seam: 0.25, spin: 0.25, bounce: 0.5, flat: 0.85, wear: 0.6 },
    B: { name: 'Balanced', seam: 0.45, spin: 0.4, bounce: 0.5, flat: 0.55, wear: 0.8 },
    G: { name: 'Green seamer', seam: 0.82, spin: 0.15, bounce: 0.6, flat: 0.35, wear: 0.6 },
    D: { name: 'Dry turner', seam: 0.2, spin: 0.82, bounce: 0.35, flat: 0.5, wear: 1.25 },
    P: { name: 'Pace & bounce', seam: 0.6, spin: 0.25, bounce: 0.92, flat: 0.6, wear: 0.7 },
    S: { name: 'Slow & low', seam: 0.3, spin: 0.62, bounce: 0.25, flat: 0.4, wear: 1.0 },
  };
  SK.PITCH = PITCH;

  const PACE = { RF: 1, LF: 1, RFM: 0.8, LFM: 0.8, RM: 0.5, LM: 0.5 };
  const isPace = (t) => PACE[t] !== undefined;
  const isSpin = (t) => t === 'OB' || t === 'LB' || t === 'SLA' || t === 'LWS';
  const ASIA = new Set(['IND', 'PAK', 'SL', 'BAN', 'AFG', 'NEP', 'UAE', 'OMA']);
  SK.isPace = isPace; SK.isSpin = isSpin;

  const BOWL_NAMES = { RF: 'Right-arm fast', RFM: 'Right-arm fast-medium', RM: 'Right-arm medium', LF: 'Left-arm fast', LFM: 'Left-arm fast-medium', LM: 'Left-arm medium', OB: 'Right-arm off-break', LB: 'Right-arm leg-break', SLA: 'Slow left-arm orthodox', LWS: 'Left-arm wrist-spin', '-': 'Does not bowl' };
  SK.BOWL_NAMES = BOWL_NAMES;

  // ---------------------------------------------------------------- ratings
  const R = SK.R = {};
  R.fmtGroup = (fmt) => (fmt === 'TEST' || fmt === 'FC4') ? 'FC' : (fmt === 'ODI' ? 'ODI' : 'T20');
  R.bat = (p, fmt) => { const g = R.fmtGroup(fmt); return g === 'FC' ? 0.8 * p.bt + 0.2 * p.bp : g === 'ODI' ? 0.55 * p.bt + 0.45 * p.bp : 0.3 * p.bt + 0.7 * p.bp; };
  R.bowl = (p, fmt) => { if (p.bowl === '-') return 0; const g = R.fmtGroup(fmt); return g === 'FC' ? 0.65 * p.bw + 0.35 * p.be : g === 'ODI' ? 0.5 * p.bw + 0.5 * p.be : 0.38 * p.bw + 0.62 * p.be; };
  R.keep = (p) => (p.role === 'WK' ? p.fd : Math.min(40, p.fd * 0.4));
  R.overall = (p, fmt) => {
    const b = R.bat(p, fmt), w = R.bowl(p, fmt);
    if (p.role === 'BAT') return b;
    if (p.role === 'WK') return b * 0.85 + p.fd * 0.15;
    if (p.role === 'BWL') return Math.max(w, b);
    return Math.max(b, w) * 0.78 + Math.min(b, w) * 0.32;
  };
  R.formMod = (p) => (p.form || 0) * 0.6 - (p.fatigue || 0) * 0.08;
  R.vsSpin = (p) => (ASIA.has(p.cc) ? 3 : -2) + ((U.hash(p.name) % 7) - 3);
  R.vsPace = (p) => (ASIA.has(p.cc) ? -1 : 1) + ((U.hash(p.name + 'p') % 5) - 2);

  // ---------------------------------------------------------------- tables
  // non-wicket outcomes [0,1,2,3,4,6] for aggression 1..5 (avg batter vs avg bowler)
  const RUN_TAB = [
    [0.862, 0.104, 0.016, 0.003, 0.0135, 0.0015],
    [0.728, 0.192, 0.035, 0.005, 0.0355, 0.0045],
    [0.565, 0.290, 0.055, 0.006, 0.068, 0.016],
    [0.417, 0.345, 0.066, 0.006, 0.111, 0.055],
    [0.322, 0.296, 0.058, 0.004, 0.149, 0.171],
  ];
  const W_TAB = [0.0062, 0.0100, 0.0150, 0.046, 0.080];
  const EP = SK.ENGINE_PARAMS = { RUN: RUN_TAB, W: W_TAB, K: 0.028, KN: 0.016, OFF: 2, B4: 1, B6: 1, DOT: 1 };
  const AGG_NAMES = ['', 'Block', 'Defend', 'Normal', 'Attack', 'Slog'];
  SK.AGG_NAMES = AGG_NAMES;

  function interpRow(a) {
    const x = U.clamp(a, 1, 5) - 1; const i = Math.min(3, Math.floor(x)); const t = x - i;
    const r0 = EP.RUN[i], r1 = EP.RUN[i + 1]; const W = EP.W;
    const out = new Array(6);
    for (let k = 0; k < 6; k++) out[k] = r0[k] + (r1[k] - r0[k]) * t;
    const w = Math.exp(Math.log(W[i]) + (Math.log(W[i + 1]) - Math.log(W[i])) * t);
    return { runs: out, w };
  }

  // ---------------------------------------------------------------- field / shot geometry
  // angle: 0 = straight back past bowler, increasing clockwise looking from batter (RHB off side 0-180)
  const REGIONS = [
    [0, 12, 'straight', 'long-off'], [12, 38, 'mid-off', 'long-off'], [38, 62, 'extra cover', 'deep extra cover'], [62, 88, 'cover', 'deep cover'],
    [88, 112, 'point', 'deep point'], [112, 140, 'backward point', 'third man'], [140, 175, 'gully', 'third man'], [175, 185, 'the keeper', 'fine leg'],
    [185, 215, 'fine leg', 'fine leg'], [215, 245, 'backward square leg', 'deep backward square'], [245, 278, 'square leg', 'deep square leg'],
    [278, 310, 'mid-wicket', 'deep mid-wicket'], [310, 340, 'mid-on', 'long-on'], [340, 360, 'straight', 'long-on'],
  ];
  function regionName(angle, dist) {
    const a = ((angle % 360) + 360) % 360;
    for (const r of REGIONS) if (a >= r[0] && a < r[1]) return dist > 52 ? r[3] : r[2];
    return 'straight';
  }
  SK.regionName = regionName;
  // fielder sets for RHB (angle, dist metres). Keeper and bowler implied.
  const FIELDS = {
    paceA: [[165, 17], [158, 18], [150, 19], [132, 20], [95, 24], [55, 25], [22, 27], [325, 25], [205, 62]],
    paceN: [[163, 17], [154, 18], [130, 21], [95, 25], [55, 26], [20, 27], [330, 27], [280, 30], [200, 64]],
    paceD: [[160, 18], [118, 62], [80, 66], [20, 66], [335, 66], [290, 64], [245, 62], [200, 64], [55, 27]],
    spinA: [[160, 13], [100, 8], [255, 7], [60, 22], [20, 24], [330, 24], [290, 24], [230, 22], [200, 55]],
    spinN: [[160, 14], [95, 24], [60, 24], [20, 27], [330, 27], [285, 26], [250, 25], [200, 60], [45, 62]],
    spinD: [[115, 62], [75, 66], [25, 66], [335, 66], [295, 66], [255, 64], [210, 60], [95, 26], [300, 27]],
    ppN: [[160, 17], [130, 21], [95, 25], [55, 26], [20, 27], [330, 27], [285, 27], [210, 62], [120, 62]],
  };

  const SHOTS = {
    off: ['drive', 'cover drive', 'punch', 'square cut', 'late cut', 'steer', 'push', 'slash'],
    leg: ['flick', 'pull', 'clip', 'glance', 'nudge', 'whip', 'tuck'],
    loftOff: ['lofted drive', 'inside-out loft', 'slap over the infield', 'uppercut'],
    loftLeg: ['slog', 'pull', 'heave', 'swipe', 'flick over the top'],
    spinLeg: ['sweep', 'slog sweep', 'paddle sweep'],
    spinOff: ['reverse sweep', 'cut', 'drive'],
    straight: ['straight drive', 'drive', 'lofted drive'],
  };

  // ---------------------------------------------------------------- selection helpers
  const Sel = SK.Sel = {};
  Sel.available = (p, fmt) => {
    if (!p || p.injury > 0) return false;
    const f = FORMATS[fmt];
    if (p.ret && p.ret.WB && (fmt === 'TEST' || fmt === 'FC4')) return false;
    if (p.ret && p.ret.RB && (fmt === 'ODI' || fmt === 'T20I')) return false;
    if (f && f.intl && p.ret) {
      if (p.ret.X) return false;
      if (fmt === 'TEST' && p.ret.T) return false;
      if (fmt === 'ODI' && p.ret.O) return false;
      if (fmt === 'T20I' && p.ret.I) return false;
    }
    return true;
  };
  Sel.isBowler = (p, fmt) => p.bowl !== '-' && R.bowl(p, fmt) >= 50;
  // Pick a balanced XI by role template. opts: {fmt, maxOverseas, isOverseas(p), pitch}
  Sel.pickXI = function (pool, opts) {
    const fmt = opts.fmt; const g = R.fmtGroup(fmt);
    const maxOS = opts.maxOverseas == null ? 11 : opts.maxOverseas;
    const isOS = opts.isOverseas || (() => false);
    const cands = pool.filter(p => Sel.available(p, fmt));
    const pref = opts.pref || null;
    const fm = (p) => R.formMod(p) * 0.8 + (pref && pref.has(p.id) ? 7 : 0);
    const batV = (p) => R.bat(p, fmt) + fm(p);
    const bowlV = (p) => (p.bowl === '-' ? 0 : R.bowl(p, fmt) + fm(p));
    const xi = []; let os = 0;
    const can = (p) => p && !xi.includes(p) && (!isOS(p) || os < maxOS);
    const add = (p) => { if (can(p)) { xi.push(p); if (isOS(p)) os++; return true; } return false; };
    const left = () => cands.filter(p => can(p));
    // 1. keeper
    const keepV = (p) => g === 'FC' ? p.fd * 0.55 + batV(p) * 0.45 : p.fd * 0.3 + batV(p) * 0.7;
    const keepers = cands.filter(p => p.role === 'WK').sort(U.by(keepV, true));
    let kp = keepers.find(can); if (!kp) kp = left().sort(U.by(p => p.fd, true))[0]; add(kp);
    // 2. frontline bowlers (4) with a spin/pace mix
    const nSpin = (opts.pitch === 'D' || opts.pitch === 'S') ? 2 : 1;
    const front = () => left().filter(p => (p.role === 'BWL' || p.role === 'AR') && bowlV(p) >= 45).sort(U.by(bowlV, true));
    let pace = 0, spin = 0;
    for (const p of front()) { if (spin >= nSpin) break; if (isSpin(p.bowl) && add(p)) spin++; }
    for (const p of front()) { if (pace + spin >= 4) break; if (isPace(p.bowl) && add(p)) pace++; }
    for (const p of front()) { if (pace + spin >= 4) break; if (add(p)) { if (isSpin(p.bowl)) spin++; else pace++; } }
    // 3. specialist batters
    const nBat = g === 'FC' ? 5 : 4;
    let nb = 0;
    for (const p of left().filter(p => p.role === 'BAT' || p.role === 'WK' || (p.role === 'AR' && batV(p) >= bowlV(p))).sort(U.by(batV, true))) { if (nb >= nBat) break; if (add(p)) nb++; }
    // 4. flex slots
    const bowlOpts = () => xi.filter(p => bowlV(p) >= 58).length;
    while (xi.length < 11) {
      const rest = left(); if (!rest.length) break;
      let pick;
      if (bowlOpts() < 5) pick = rest.filter(p => p.role === 'AR' || p.role === 'BWL').sort(U.by(p => bowlV(p) + 0.15 * batV(p), true))[0];
      if (!pick) pick = rest.sort(U.by(p => {
        const b = batV(p), w = bowlV(p);
        if (p.role === 'AR') return Math.max(b, w) + (w >= 52 && b >= 45 ? 0.3 * Math.min(b, w) : 0);
        if (p.role === 'BWL') return w * 0.94;
        return b;
      }, true))[0];
      if (!add(pick)) break;
    }
    for (const p of pool) { if (xi.length >= 11) break; if (!xi.includes(p) && p.injury <= 0) xi.push(p); }
    return Sel.battingOrder(xi, fmt);
  };
  Sel.battingOrder = function (xi, fmt) {
    const g = R.fmtGroup(fmt);
    const batV = (p) => R.bat(p, fmt) + R.formMod(p) * 0.5;
    const specialistBowler = (p) => p.role === 'BWL' && batV(p) < 50;
    const top = xi.filter(p => !specialistBowler(p)).sort(U.by(batV, true));
    const tail = xi.filter(specialistBowler).sort(U.by(batV, true));
    // openers: in T20 prefer power + quality; in FC technique
    const openScore = (p) => (g === 'FC' ? p.bt * 1.0 + p.bp * 0.15 : g === 'ODI' ? p.bt * 0.6 + p.bp * 0.55 : p.bt * 0.5 + p.bp * 0.75) - (p.role === 'WK' && g === 'FC' ? 6 : 0);
    const pool = top.slice(0, 7);
    const openers = pool.filter(p => p.role === 'BAT' || p.role === 'WK' || (g !== 'FC' && p.role === 'AR' && p.bt >= 60)).sort(U.by(p => openScore(p) + (p.role === 'AR' ? -4 : 0), true)).slice(0, 2);
    const others = top.filter(p => !openers.includes(p));
    // finishers / all-rounders at 5-7 by batting
    const order = openers.concat(others).concat(tail);
    return order;
  };
  Sel.captain = function (xi, preferredId) {
    if (preferredId != null) { const c = xi.find(p => p.id === preferredId); if (c) return c; }
    return xi.slice().sort(U.by(p => (2026 - p.yob) * 1.5 + R.overall(p, 'ODI'), true))[0];
  };
  Sel.keeper = function (xi) {
    const k = xi.filter(p => p.role === 'WK').sort(U.by(p => p.fd, true))[0];
    return k || xi.slice().sort(U.by(p => p.fd, true))[0];
  };

  // ---------------------------------------------------------------- Match
  class Match {
    constructor(o) {
      this.fmtKey = o.format; this.F = FORMATS[o.format];
      if (!this.F) throw new Error('bad format ' + o.format);
      this.seed = o.seed == null ? (Math.random() * 1e9) >>> 0 : o.seed;
      this.rng = U.makeRng(this.seed);
      this.fast = !!o.fast;
      this.knockout = !!o.knockout;
      this.compName = o.compName || '';
      this.title = o.title || '';
      this.venue = o.venue || { name: 'Neutral Ground', city: '', cc: '', pitch: 'B' };
      const base = PITCH[this.venue.pitch] || PITCH.B; const r = this.rng;
      this.pitch = { code: this.venue.pitch || 'B', name: base.name, seam: U.clamp(base.seam + (r() - 0.5) * 0.2, 0, 1), spin: U.clamp(base.spin + (r() - 0.5) * 0.2, 0, 1), bounce: U.clamp(base.bounce + (r() - 0.5) * 0.15, 0, 1), flat: U.clamp(base.flat + (r() - 0.5) * 0.2, 0.1, 1), wear: base.wear };
      const cloudy = { ENG: 0.55, NZ: 0.5, IRE: 0.6, SCO: 0.6, NED: 0.5 }[this.venue.cc] || 0.22;
      this.overcast = U.clamp(cloudy + (r() - 0.5) * 0.5, 0, 1);
      this.dew = this.F.lo && !this.F.consec && ASIA.has(this.venue.cc) ? 0.4 + r() * 0.5 : r() * 0.25;
      this.boundary = o.venue && o.venue.boundary ? o.venue.boundary : 1;
      this.homeSide = o.homeSide == null ? null : o.homeSide;
      this.userSide = o.userSide == null ? null : o.userSide;
      this.manual = Object.assign({ bowl: true, field: false, bat: false }, o.manual || {});
      this.sides = o.teams.map((t, i) => {
        const xi = t.xi.slice(0, 11);
        const cap = Sel.captain(xi, t.captainId);
        const keeper = t.keeperId != null && xi.find(p => p.id === t.keeperId) ? xi.find(p => p.id === t.keeperId) : Sel.keeper(xi);
        return { i, team: t, name: t.name, short: t.short || t.name.slice(0, 3).toUpperCase(), c1: t.c1, c2: t.c2, xi, order: xi.map(p => p.id), cap, keeper };
      });
      this.byId = new Map();
      for (const s of this.sides) for (const p of s.xi) this.byId.set(p.id, { p, side: s.i });
      // display names, disambiguate surnames
      const counts = {};
      for (const [, v] of this.byId) { const sn = U.surname(v.p.name); counts[sn] = (counts[sn] || 0) + 1; }
      for (const [, v] of this.byId) { const sn = U.surname(v.p.name); v.sn = counts[sn] > 1 ? U.shortName(v.p.name) : sn; v.short = U.shortName(v.p.name); }
      this.agg = {}; // pid -> 1..5 (user override)
      this.fieldSet = [null, null]; // per bowling side override 'A' 'N' 'D'
      this.inns = []; this.cur = null;
      this.phase = 'pre'; this.pending = null; this.result = null;
      this.events = []; this.toss = null;
      this.day = 1; this.dayBalls = 0; this.dayLimit = this.F.lo ? 0 : this.F.opd * 6; this.totalBalls = 0;
      this.weatherLog = [];
      this.superOvers = [];
      this.mom = null;
      this.ballCount = 0; this.evSeq = 0;
    }

    p(id) { return this.byId.get(id).p; }
    nm(id) { return this.byId.get(id).sn; }
    shortNm(id) { return this.byId.get(id).short; }

    // ------------------------------------------------ toss
    doToss(call /* 'H'|'T' or null */, callerSide) {
      const r = this.rng; const coin = r() < 0.5 ? 'H' : 'T';
      let winner;
      if (call && callerSide != null) winner = coin === call ? callerSide : 1 - callerSide;
      else winner = r() < 0.5 ? 0 : 1;
      this.toss = { winner, coin, call, decision: null };
      if (this.userSide !== winner) this.tossDecide(this.aiTossChoice(winner));
      return this.toss;
    }
    aiTossChoice(side) {
      const F = this.F, p = this.pitch;
      if (F.lo) {
        let chase = 0.55 + this.dew * 0.25 - (p.spin - 0.4) * 0.3;
        return this.rng() < chase ? 'bowl' : 'bat';
      }
      let bowlFirst = 0.2 + (p.seam - 0.45) * 0.8 + (this.overcast - 0.3) * 0.5 - (p.spin - 0.4) * 0.6;
      return this.rng() < U.clamp(bowlFirst, 0.05, 0.8) ? 'bowl' : 'bat';
    }
    tossDecide(choice) {
      this.toss.decision = choice;
      const batFirst = choice === 'bat' ? this.toss.winner : 1 - this.toss.winner;
      this.phase = 'play';
      const txt = `${this.sides[this.toss.winner].name} won the toss and chose to ${choice === 'bat' ? 'bat' : 'bowl'} first.`;
      this.emit({ type: 'toss', text: txt });
      this.startInnings(batFirst);
      if (!this.F.lo) this.rollWeather();
    }

    // ------------------------------------------------ innings
    startInnings(batSide, opts) {
      opts = opts || {};
      const n = this.inns.length;
      const bowlSide = 1 - batSide;
      const s = this.sides[batSide];
      const inn = {
        n, bat: batSide, bowl: bowlSide, target: null, runs: 0, wkts: 0, balls: 0,
        ext: { b: 0, lb: 0, w: 0, nb: 0 }, card: [], order: s.order.slice(), next: 0, st: -1, ns: -1,
        bw: {}, bowlOrder: [], cur: null, prev: null, overRuns: 0, overWk: 0, overBalls: 0,
        overs: [], fow: [], pship: { runs: 0, balls: 0 }, pships: [], freeHit: false,
        revBat: this.F.revs, revBowl: this.F.revs, ballAt: 0, declared: false, closed: false, allOut: false,
        followOn: !!opts.followOn, log: [], spellOvers: {}, maxOv: this.F.maxOv || 999, so: !!opts.superOver,
        maxBalls: opts.superOver ? this.F.bpo : (this.F.lo ? this.F.overs * this.F.bpo : 0), wktLimit: opts.superOver ? 2 : 10,
      };
      if (this.F.lo && n === 1) inn.target = this.inns[0].runs + 1;
      if (opts.target) inn.target = opts.target;
      if (!this.F.lo && n === 3) {
        const a = this.inns[0], b = this.inns[1], c = this.inns[2];
        const sideRuns = (side) => this.inns.filter(x => x.bat === side).reduce((t, x) => t + x.runs, 0);
        inn.target = sideRuns(1 - batSide) - sideRuns(batSide) + 1;
        if (inn.target < 1) inn.target = 1;
        void a; void b; void c;
      }
      if (opts.superOver) inn.order = opts.order;
      this.inns.push(inn); this.cur = inn;
      this.newBatter(inn); this.newBatter(inn);
      inn.st = 0; inn.ns = 1;
      if (!this.F.lo && n > 0 && !opts.superOver) { // changeover time
        this.dayLimit -= 12;
      }
      this.chooseNextBowler(inn, true);
      this.emit({ type: 'innStart', inn: n, text: opts.superOver ? `Super Over: ${s.name} to bat.` : (inn.target ? `${s.name} need ${inn.target} to win.` : `${s.name} innings begins.`) });
      return inn;
    }
    newBatter(inn) {
      while (inn.next < inn.order.length) {
        const pid = inn.order[inn.next++];
        if (inn.card.some(c => c.pid === pid)) continue;
        inn.card.push({ pid, runs: 0, balls: 0, f4: 0, f6: 0, dots: 0, out: false, how: '', bowler: null, fielder: null, pos: inn.card.length + 1 });
        return inn.card.length - 1;
      }
      return -1;
    }
    bowlerStat(inn, pid) {
      let b = inn.bw[pid];
      if (!b) { b = inn.bw[pid] = { pid, balls: 0, runs: 0, wkts: 0, maid: 0, wd: 0, nb: 0, dots: 0, spell: 0, fat: 0, lastOver: -9, f4: 0, f6: 0 }; inn.bowlOrder.push(pid); }
      return b;
    }

    // ------------------------------------------------ bowling choice
    bowlingOptions(inn) {
      const side = this.sides[inn.bowl];
      const F = this.F;
      const overIdx = Math.floor(inn.balls / F.bpo);
      const res = [];
      for (const p of side.xi) {
        if (p.id === side.keeper.id) continue;
        const b = inn.bw[p.id];
        const oversBowled = b ? Math.floor(b.balls / F.bpo) : 0;
        let ok = true, why = '';
        if (F.lo && oversBowled >= inn.maxOv) { ok = false; why = 'Quota done'; }
        if (b && b.lastOver === overIdx - 1 && inn.prev === p.id) {
          if (!F.consec) { ok = false; why = 'Bowled last over'; }
          else if (b.consec >= 2) { ok = false; why = 'Max 10 balls in a row'; }
        }
        if (inn.so && this.superBowlerUsed && this.superBowlerUsed.has(p.id) && false) ok = false;
        res.push({ p, ok, why, stat: b, overs: oversBowled });
      }
      return res;
    }
    chooseNextBowler(inn, first) {
      if (this.isUserBowling(inn) && this.manual.bowl && !inn.so) {
        this.pending = { type: 'bowler', inn: inn.n };
        return;
      }
      const pid = this.aiPickBowler(inn, first);
      this.setBowler(inn, pid);
    }
    isUserBowling(inn) { return this.userSide != null && inn.bowl === this.userSide; }
    isUserBatting(inn) { return this.userSide != null && inn.bat === this.userSide; }
    setBowler(inn, pid) {
      const opts = this.bowlingOptions(inn);
      let o = opts.find(x => x.p.id === pid && x.ok);
      if (!o) { o = opts.find(x => x.ok) || opts[0]; pid = o.p.id; }
      const overIdx = Math.floor(inn.balls / this.F.bpo);
      const b = this.bowlerStat(inn, pid);
      if (b.lastOver !== overIdx - 1 || inn.prev !== pid) b.consec = 0;
      // spell tracking: consecutive overs from same end (every other over)
      if (b.lastOver === overIdx - 2 || (this.F.consec && b.lastOver === overIdx - 1)) b.spell += 1; else b.spell = 1;
      inn.cur = pid; inn.overRuns = 0; inn.overWk = 0; inn.overBalls = 0; inn.overStartRuns = inn.runs; inn.overBowlerRuns0 = b.runs;
      this.pending = null;
      if (!this.fast) this.emit({ type: 'bowler', pid, text: `${this.nm(pid)} into the attack.`, quiet: b.balls > 0 });
    }
    aiPickBowler(inn, first) {
      const F = this.F; const opts = this.bowlingOptions(inn).filter(o => o.ok);
      if (!opts.length) return this.bowlingOptions(inn)[0].p.id;
      const overIdx = Math.floor(inn.balls / F.bpo);
      const g = R.fmtGroup(this.fmtKey);
      const ballAge = this.ballAgeOvers(inn);
      const scores = [];
      // quota feasibility for limited overs
      const oversLeft = F.lo ? (inn.maxBalls - inn.balls) / F.bpo : 0;
      for (const o of opts) {
        const p = o.p; const st = o.stat;
        let s = R.bowl(p, this.fmtKey) + R.formMod(p) * 0.5 + this.condBonus(p, inn) * 0.8;
        if (s < 30) s -= 25; // genuine part-timers last
        if (F.lo) {
          const phasePP = overIdx < F.pp, death = overIdx >= F.death;
          if (phasePP) s += isPace(p.bowl) ? 4 + (p.bw - 70) * 0.05 : -4;
          if (death) s += isPace(p.bowl) ? (p.be - 70) * 0.15 + 3 : -6;
          if (!phasePP && !death && isSpin(p.bowl)) s += 4;
          // save best bowlers for the death
          const left = inn.maxOv - o.overs;
          if (!death && left <= 1 && isPace(p.bowl) && p.be >= 70 && overIdx < F.death - 1) s -= 7;
          if (!phasePP && left > 0) s += Math.min(6, (left / Math.max(1, oversLeft)) * 20); // spread usage
          if (inn.so) s = p.be * 0.7 + p.bw * 0.3 + (isPace(p.bowl) ? 4 : 0);
        } else {
          const fat = st ? st.fat : 0;
          s -= fat * 30;
          if (st && st.spell >= (isPace(p.bowl) ? 6 : 12)) s -= 12;
          if (ballAge < 12 && isPace(p.bowl)) s += 6;
          if (ballAge < 8 && isSpin(p.bowl)) s -= 10;
          if (first && isSpin(p.bowl)) s -= 15;
        }
        s += this.rng() * 3;
        scores.push([s, p.id]);
      }
      // feasibility: make sure remaining quotas can cover remaining overs
      if (F.lo && !inn.so) {
        scores.sort((a, b) => b[0] - a[0]);
        for (const [, pid] of scores) {
          if (this.quotaFeasibleWith(inn, pid)) return pid;
        }
      }
      scores.sort((a, b) => b[0] - a[0]);
      return scores[0][1];
    }
    quotaFeasibleWith(inn, pid) {
      const F = this.F; const side = this.sides[inn.bowl];
      const remainingAfter = (inn.maxBalls - inn.balls) / F.bpo - 1;
      let cap = 0;
      for (const p of side.xi) {
        if (p.id === side.keeper.id || p.bowl === '-') continue;
        const b = inn.bw[p.id]; const used = b ? Math.floor(b.balls / F.bpo) : 0;
        cap += Math.max(0, inn.maxOv - used - (p.id === pid ? 1 : 0));
      }
      return cap >= remainingAfter;
    }
    ballAgeOvers(inn) { return (inn.balls - inn.ballAt) / this.F.bpo; }

    // ------------------------------------------------ conditions
    condBonus(p, inn) {
      const pc = this.pitch; const F = this.F;
      const ageOv = this.ballAgeOvers(inn);
      const newBall = Math.max(0, 1 - ageOv / (F.lo ? 12 : 25));
      const wear = F.lo ? 0.15 * pc.wear : U.clamp(((this.day - 1) + this.dayBalls / Math.max(1, F.opd * 6)) / (F.days - 0.5), 0, 1) * pc.wear;
      if (isPace(p.bowl)) {
        const lvl = PACE[p.bowl];
        let b = 10 * (pc.seam - 0.45) + 6 * (pc.bounce - 0.5) * lvl + newBall * (3 + 9 * this.overcast) * (0.6 + 0.4 * lvl) - 3 * (pc.flat - 0.55);
        if (!F.lo && ageOv > 45 && pc.flat > 0.5) b += 3; // reverse swing
        if (!F.lo) b -= wear * 2;
        if (p.bowl === 'LF' || p.bowl === 'LFM') b += 1.5; // angle
        return b * (0.7 + 0.3 * lvl);
      }
      if (isSpin(p.bowl)) {
        let b = 12 * (pc.spin - 0.4) + 14 * wear * pc.spin - 5 * newBall;
        if (F.lo && inn.n === 1) b -= this.dew * 5;
        if (p.bowl === 'LB' || p.bowl === 'LWS') b += 1;
        return b;
      }
      return -10;
    }

    // ------------------------------------------------ AI captaincy (batting aggression)
    aiAggression(inn, card) {
      const F = this.F; const pl = this.p(card.pid);
      const g = R.fmtGroup(this.fmtKey);
      const style = (pl.bp - pl.bt) / 40; // >0 hitter, <0 anchor
      let a;
      if (F.lo) {
        const ballsLeft = inn.maxBalls - inn.balls;
        const ovIdx = inn.balls / F.bpo;
        const wktsIn = inn.wktLimit - inn.wkts;
        if (inn.so) return 4.8;
        if (inn.target) {
          const need = inn.target - inn.runs;
          const rrr = need * 6 / Math.max(1, ballsLeft);
          const base = g === 'ODI' ? [[3, 2.6], [4.5, 2.95], [6, 3.25], [7.5, 3.7], [9, 4.15], [11, 4.6], [14, 5]] : [[5, 3.0], [7, 3.45], [8.5, 3.8], [10, 4.15], [12, 4.5], [14, 4.8], [16, 5]];
          a = interpTable(base, rrr);
          if (wktsIn <= 3 && rrr < (g === 'ODI' ? 7 : 10)) a -= 0.35;
          if (wktsIn <= 2 && rrr < (g === 'ODI' ? 6 : 9)) a -= 0.25;
          if (ballsLeft <= F.bpo * 2) a = Math.max(a, need > 6 ? 4.6 : a);
        } else if (g === 'ODI') {
          if (ovIdx < F.pp) a = 3.1; else if (ovIdx < 30) a = 2.92; else if (ovIdx < F.death) a = 3.2; else a = 4.25;
          if (inn.wkts >= 5 && ovIdx < 35) a -= 0.35;
          if (inn.wkts >= 7 && ovIdx < F.death) a -= 0.3;
          if (ovIdx >= F.death && wktsIn >= 5) a += 0.25;
        } else {
          if (ovIdx < F.pp) a = 3.85; else if (ovIdx < F.death - 4) a = 3.55; else if (ovIdx < F.death) a = 3.85; else a = 4.45;
          if (inn.wkts >= 4 && ovIdx < 10) a -= 0.4;
          if (inn.wkts >= 6 && ovIdx < F.death) a -= 0.25;
          if (ovIdx >= F.death && wktsIn >= 4) a += 0.3;
        }
        a += style * 0.35;
        if (pl.role === 'BWL' && pl.bt < 35 && !inn.target) a += (ovIdx >= F.death ? 0.3 : -0.2);
        if (card.balls < 4 && !inn.target) a -= 0.2;
        if (inn.freeHit) a = Math.max(a, 4.6);
      } else {
        // first-class / Tests
        a = 2.3 + style * 0.25;
        if (pl.bt < 40) a = 2.7; // tail swings
        const timeLeft = this.ballsLeftInMatch() / 6;
        const lead = this.leadFor(inn.bat);
        if (inn.target) {
          const need = inn.target - inn.runs; const rr = need / Math.max(1, timeLeft);
          const wIn = 10 - inn.wkts;
          const chaseable = rr < 3.4 && wIn >= 4 || rr < 4.2 && wIn >= 7 || need <= 30;
          if (!chaseable && timeLeft > 3) a = pl.bt < 40 ? 1.5 : 1.65; // bat for the draw
          else if (rr > 4) a = 3.2; else if (rr > 3.2) a = 2.85; else a = 2.45;
          if (need < 40) a += 0.3;
        } else if (inn.n >= 2 && lead > 150 && timeLeft < 120) a = 3.3 + Math.min(1.2, (lead - 150) / 250); // pushing for declaration
        else if (inn.n >= 1 && lead < -50 && timeLeft < 140 && inn.n === 2) a = 2.1; // saving
        if (card.balls < 10) a -= 0.25;
        if (this.dayBalls > this.dayLimit - 18 && inn.wkts >= 3) a -= 0.35; // see out the day
      }
      return U.clamp(a, 1, 5);
    }
    aggressionFor(inn, card) {
      if (this.isUserBatting(inn) && !inn.so) {
        const ov = this.agg[card.pid];
        if (ov) return ov;
      }
      return this.aiAggression(inn, card);
    }
    aiField(inn) {
      const F = this.F; const st = inn.card[inn.st]; const bat = this.p(st.pid);
      if (F.lo) {
        const ov = inn.balls / F.bpo;
        if (ov < F.pp) return 'N';
        if (ov >= F.death) return 'D';
        if (st.balls > 15 && st.runs / Math.max(1, st.balls) > 1.3) return 'D';
        return 'N';
      }
      const age = this.ballAgeOvers(inn);
      if (bat.bt < 40) return 'A';
      if (age < 15) return 'A';
      if (st.balls > 60 && st.runs > 40) return 'D';
      if (inn.target && inn.target - inn.runs < 60) return 'A';
      return 'N';
    }
    fieldFor(inn) {
      if (this.isUserBowling(inn) && this.fieldSet[inn.bowl]) return this.fieldSet[inn.bowl];
      return this.aiField(inn);
    }

    // ------------------------------------------------ main step
    next() {
      if (this.phase !== 'play') return null;
      if (this.pending) {
        // AI resolves pending decision if it isn't the user's to make
        if (this.pending.type === 'bowler' && !(this.isUserBowling(this.cur) && this.manual.bowl)) this.setBowler(this.cur, this.aiPickBowler(this.cur));
        else return { type: 'waiting', pending: this.pending };
      }
      const inn = this.cur;
      if (!this.F.lo && this.dayBalls >= this.dayLimit) { this.endDay(); return this.lastEvent(); }
      return this.simBall(inn);
    }
    lastEvent() { return this.events[this.events.length - 1]; }
    emit(ev) {
      ev.seq = ++this.evSeq;
      ev.inn = this.cur ? this.cur.n : 0; ev.day = this.day;
      if (this.cur) { ev.score = `${this.cur.runs}/${this.cur.wkts}`; ev.ov = U.overs(this.cur.balls, this.F.bpo); }
      if (this.fast && ev.type !== 'end') { this.events.length = 0; }
      this.events.push(ev);
      if (this.events.length > 2000) this.events.splice(0, 500);
      if (this.onEvent) this.onEvent(ev);
      return ev;
    }

    simBall(inn) {
      const F = this.F, r = this.rng;
      const stC = inn.card[inn.st], nsC = inn.card[inn.ns];
      const batP = this.p(stC.pid); const bowP = this.p(inn.cur);
      const bs = this.bowlerStat(inn, inn.cur);
      const a = this.aggressionFor(inn, stC);
      const field = this.fieldFor(inn);
      const ovIdx = Math.floor(inn.balls / F.bpo);
      const isPP = F.lo && ovIdx < F.pp;
      const isDeath = F.lo && ovIdx >= F.death;
      this.ballCount++;

      // --- effective skills
      const home = this.homeSide == null ? 0 : (inn.bat === this.homeSide ? 2 : -1);
      const bowlHome = this.homeSide == null ? 0 : (inn.bowl === this.homeSide ? 1.5 : -0.5);
      const setB = stC.balls < 4 ? -8 : stC.balls < 10 ? -4 : stC.balls < 20 ? -1 : stC.balls < 40 ? 1.5 : 2.5;
      const typeMod = isSpin(bowP.bowl) ? R.vsSpin(batP) : R.vsPace(batP);
      let S = batP.bt + R.formMod(batP) + setB + home + typeMod * 0.8 - (stC.balls > 300 ? 5 : stC.balls > 200 ? 3 : stC.balls > 130 ? 1.5 : 0);
      if (stC.runs >= 90 && stC.runs < 100) S -= 4; // nervous nineties
      let P = batP.bp + R.formMod(batP) * 0.6 + setB * 0.5 + home * 0.5;
      const fat = bs.fat || 0;
      const cond = this.condBonus(bowP, inn);
      let T = bowP.bw + R.formMod(bowP) + cond + bowlHome - fat * 14;
      let C = bowP.be + R.formMod(bowP) * 0.6 + cond * 0.35 + bowlHome * 0.5 - fat * 10;
      if (bowP.bowl === '-') { T = 18; C = 22; }

      // --- extras
      const spin = isSpin(bowP.bowl);
      let pWd = F.wide * (1.35 - C / 100 * 0.7) * (spin ? 0.6 : 1.12) * (a >= 4 ? 1.08 : 1);
      if (inn.so) pWd *= 1.2;
      let pNb = F.nb * (spin ? 0.25 : 1.25);
      const ev = { type: 'ball', bowler: inn.cur, batter: stC.pid, nonStriker: nsC ? nsC.pid : null, runs: 0, bat: 0, ex: null, exRuns: 0, wkt: null, legal: true, agg: a, field };
      const x = r();
      if (x < pWd) {
        const wr = r() < 0.035 ? 5 : 1;
        ev.ex = 'wd'; ev.exRuns = wr; ev.legal = false; ev.runs = wr;
        inn.runs += wr; inn.ext.w += wr; bs.runs += wr; bs.wd += 1; inn.overRuns += wr;
        inn.pship.runs += wr;
        if (wr === 5) { /* wides to the boundary: no strike change */ }
        if (!this.fast) { ev.text = this.commWide(ev, bowP, batP, wr); ev.shot = { angle: (batP.hand === 'R' ? 120 : 240), dist: wr === 5 ? 70 : 8, wide: true }; }
        inn.overOpen = true;
        this.emit(ev);
        this.afterDelivery(inn, ev);
        return ev;
      }
      let noBall = false;
      if (x < pWd + pNb) { noBall = true; ev.ex = 'nb'; ev.legal = false; }
      const freeHit = inn.freeHit;
      if (ev.legal) inn.freeHit = false;

      // --- outcome
      const row = interpRow(a);
      const diff = S - T + EP.OFF;
      let pW = row.w * Math.exp(diff >= 0 ? -EP.K * diff : -EP.KN * diff);
      pW *= Math.exp(0.004 * (a - 2.5) * (70 - S));
      pW *= field === 'A' ? 1.16 : field === 'D' ? 0.86 : 1;
      if (isPP) pW *= 1.02;
      pW *= 1.18 - 0.36 * this.pitch.flat;
      if (inn.so) pW *= 1.5;
      if (F.wMul) pW *= F.wMul;
      if (!F.lo && this.dayBalls > this.dayLimit - 12 && inn.wkts < 10) pW *= 1.08; // late-day pressure
      pW = U.clamp(pW, 0.0008, 0.35);

      const out = row.runs.slice();
      const d = (P - C) / 100;
      out[4] *= Math.exp(1.8 * d) * EP.B4; out[5] *= Math.exp(2.6 * d) * EP.B6; out[1] *= Math.exp(0.45 * d); out[2] *= Math.exp(0.55 * d); out[3] *= Math.exp(0.4 * d);
      // field
      if (field === 'A') { out[4] *= 1.12; out[5] *= 1.04; out[1] *= 1.06; out[2] *= 0.9; }
      else if (field === 'D') { out[4] *= 0.78; out[5] *= 0.9; out[1] *= 1.1; out[2] *= 1.22; }
      if (isPP) { out[4] *= 1.24; out[5] *= 1.06; out[1] *= 0.95; }
      if (isDeath) { out[4] *= 1.05; out[5] *= 1.1; }
      const flatF = 0.82 + 0.36 * this.pitch.flat;
      out[4] *= flatF; out[5] *= flatF * this.boundary; out[1] *= 0.94 + 0.12 * this.pitch.flat;
      if (spin) { out[5] *= 1.08; }
      if (F.lo && inn.n === 1 && this.dew > 0.5) { out[4] *= 1.04; }
      let nonDot = out[1] + out[2] + out[3] + out[4] + out[5];
      if (nonDot > 0.86) { const k = 0.86 / nonDot; for (let i = 1; i < 6; i++) out[i] *= k; nonDot = 0.86; }
      out[0] = 1 - nonDot;

      let wicket = !freeHit && !noBall && r() < pW;
      let runOutOnFreeHit = false;
      if ((freeHit || noBall) && r() < pW * 0.08) runOutOnFreeHit = true;
      let how = null, fielder = null, outPid = stC.pid, runsBat = 0, drop = false, drs = null;

      if (wicket || runOutOnFreeHit) {
        how = runOutOnFreeHit ? 'runout' : this.dismissalType(a, bowP, field);
        if (how === 'caught' || how === 'caughtKeeper' || how === 'cb') {
          fielder = how === 'caughtKeeper' ? this.sides[inn.bowl].keeper : (how === 'cb' ? bowP : this.randomFielder(inn, bowP));
          const dropP = how === 'caughtKeeper' ? 0.05 : U.clamp(0.07 + (72 - fielder.fd) / 300, 0.02, 0.2);
          if (r() < dropP) { drop = true; wicket = false; }
        } else if (how === 'stumped') {
          fielder = this.sides[inn.bowl].keeper;
          if (r() < 0.1 + (75 - fielder.fd) / 300) { drop = true; wicket = false; }
        } else if (how === 'runout') {
          fielder = this.randomFielder(inn, bowP);
          if (r() < 0.45 && nsC) outPid = nsC.pid;
          runsBat = r() < 0.5 ? 1 : 0;
        }
        // DRS: umpire misses an lbw / caught-behind, bowling side reviews
        if (wicket && (how === 'lbw' || how === 'caughtKeeper') && F.revs > 0 && r() < 0.09) {
          const wantReview = inn.revBowl > 0 && r() < 0.75;
          if (wantReview) { drs = { by: 'bowl', result: 'overturned' }; }
          else { wicket = false; drs = { by: 'none', result: 'missed' }; }
        }
        if (!wicket && drop) { runsBat = r() < 0.55 ? 0 : r() < 0.8 ? 1 : 2; }
      } else if (!wicket && F.revs > 0 && !freeHit && !noBall && r() < 0.0035) {
        // a wrong out decision that gets reviewed
        const kind = r() < 0.65 ? 'lbw' : 'caughtKeeper';
        if (inn.revBat > 0 && r() < 0.88) { drs = { by: 'bat', result: 'overturned', kind }; }
        else { wicket = true; how = kind; fielder = kind === 'caughtKeeper' ? this.sides[inn.bowl].keeper : null; drs = { by: 'none', result: 'umpire', kind }; }
      }

      if (!wicket) {
        if (!(how && drop)) {
          const k = r.weighted(out);
          runsBat = [0, 1, 2, 3, 4, 6][k];
        }
      }
      if (drs && drs.by === 'bat' && drs.result === 'overturned') runsBat = 0;

      // byes / leg byes on dot balls
      let bye = 0, legBye = 0;
      if (!wicket && runsBat === 0 && !drop) {
        if (r() < (F.lo ? 0.026 : 0.011)) legBye = r() < 0.06 ? 4 : r() < 0.12 ? 2 : 1;
        else if (r() < (spin ? 0.016 : 0.008) * (1.3 - this.sides[inn.bowl].keeper.fd / 150)) bye = r() < 0.15 ? 4 : 1;
      }

      // --- apply
      ev.bat = runsBat; ev.drop = drop; ev.drs = drs;
      const nbRun = noBall ? 1 : 0;
      ev.exRuns = nbRun + bye + legBye;
      if (bye) ev.ex = 'b'; if (legBye) ev.ex = 'lb'; if (noBall) ev.ex = 'nb';
      ev.runs = runsBat + ev.exRuns;
      inn.runs += ev.runs; inn.overRuns += ev.runs; inn.pship.runs += ev.runs;
      inn.ext.nb += nbRun; inn.ext.b += bye; inn.ext.lb += legBye;
      bs.runs += runsBat + nbRun; if (noBall) bs.nb += 1;
      stC.runs += runsBat;
      if (ev.legal || noBall) { stC.balls += ev.legal ? 1 : 0; }
      if (noBall) stC.balls += 1; // a no-ball counts as a ball faced
      if (runsBat === 4) stC.f4++; if (runsBat === 6) stC.f6++;
      if (runsBat === 4) bs.f4++; if (runsBat === 6) bs.f6++;
      inn.overOpen = true;
      if (ev.legal) {
        inn.balls++; bs.balls++; inn.overBalls++; inn.pship.balls++;
        this.totalBalls++; this.dayBalls++;
        if (runsBat === 0 && !bye && !legBye) { stC.dots++; bs.dots++; }
        else if (runsBat === 0) stC.dots++;
      } else if (noBall) { inn.freeHit = F.lo; }

      if (wicket) {
        const outC = inn.card.find(c => c.pid === outPid);
        outC.out = true; outC.how = how; outC.bowler = how === 'runout' ? null : inn.cur; outC.fielder = fielder ? fielder.id : null;
        if (how !== 'runout') { bs.wkts++; }
        inn.wkts++; inn.overWk++;
        inn.fow.push({ w: inn.wkts, runs: inn.runs, balls: inn.balls, pid: outPid });
        inn.pships.push({ runs: inn.pship.runs, balls: inn.pship.balls, a: stC.pid, b: nsC ? nsC.pid : null });
        inn.pship = { runs: 0, balls: 0 };
        ev.wkt = { how, pid: outPid, bowler: inn.cur, fielder: fielder ? fielder.id : null };
      }

      // strike rotation (runs actually run)
      const ran = (wicket && how === 'runout') ? runsBat : (runsBat === 4 || runsBat === 6) ? 0 : runsBat;
      const exRan = (bye === 4 || legBye === 4) ? 0 : (bye + legBye);
      if ((ran + exRan) % 2 === 1) { const t = inn.st; inn.st = inn.ns; inn.ns = t; }

      if (!this.fast) {
        ev.shot = this.shotFor(ev, batP, bowP, a);
        ev.text = this.commBall(ev, inn, batP, bowP, freeHit);
      }
      this.emit(ev);
      this.recordBallLog(inn, ev);

      if (wicket) {
        // replace dismissed batter
        const outIdx = inn.card.findIndex(c => c.pid === outPid);
        const allOut = inn.wkts >= Math.min(inn.wktLimit, this.sides[inn.bat].xi.length - 1);
        if (!allOut) {
          const nb = this.newBatter(inn);
          if (nb < 0) { inn.allOut = true; }
          else { if (inn.st === outIdx) inn.st = nb; else inn.ns = nb; }
        } else inn.allOut = true;
        // after a run out where batters crossed... keep simple
      }
      this.afterDelivery(inn, ev);
      return ev;
    }

    dismissalType(a, bowP, field) {
      const r = this.rng; const spin = isSpin(bowP.bowl);
      const hi = U.clamp((a - 2.5) / 2.5, -0.6, 1);
      const w = spin
        ? { bowled: 0.17 - hi * 0.03, lbw: 0.2 - hi * 0.06, caught: 0.43 + hi * 0.12, caughtKeeper: 0.06, cb: 0.035, stumped: 0.055 + hi * 0.05, runout: 0.035 + hi * 0.03 }
        : { bowled: 0.17 - hi * 0.03, lbw: 0.15 - hi * 0.05, caught: 0.37 + hi * 0.1, caughtKeeper: 0.2 - hi * 0.06 + (field === 'A' ? 0.04 : 0), cb: 0.025, stumped: 0.002, runout: 0.045 + hi * 0.03 };
      const keys = Object.keys(w); const vals = keys.map(k => Math.max(0.001, w[k]));
      return keys[r.weighted(vals)];
    }
    randomFielder(inn, bowP) {
      const side = this.sides[inn.bowl];
      const opts = side.xi.filter(p => p.id !== side.keeper.id && p.id !== bowP.id);
      const w = opts.map(p => 0.6 + p.fd / 100);
      return opts[this.rng.weighted(w)];
    }

    afterDelivery(inn, ev) {
      const F = this.F;
      // innings over?
      let ended = false, why = '';
      if (inn.allOut) { ended = true; why = 'allout'; }
      if (inn.target && inn.runs >= inn.target) { ended = true; why = 'target'; }
      if (F.lo && inn.balls >= inn.maxBalls) { ended = true; why = why || 'overs'; }
      const overDone = ev.legal && inn.balls % F.bpo === 0 && inn.balls > 0 && inn.overBalls >= F.bpo;
      if (overDone || (ended && inn.overOpen && inn.overBalls > 0)) this.endOver(inn, ended);
      if (ended) { this.endInnings(inn, why); return; }
      if (!F.lo) {
        if (this.declareCheck(inn)) return;
      }
      if (overDone) this.chooseNextBowler(inn, false);
    }
    endOver(inn, ended) {
      const F = this.F; const bs = this.bowlerStat(inn, inn.cur);
      const ovIdx = Math.ceil(inn.balls / F.bpo) - 1;
      if (inn.overBalls >= F.bpo && bs.runs - (inn.overBowlerRuns0 || 0) === 0) bs.maid++;
      inn.overOpen = false;
      bs.lastOver = ovIdx; bs.consec = (inn.prev === inn.cur ? (bs.consec || 1) + 1 : 1);
      inn.overs.push({ runs: inn.overRuns, wkts: inn.overWk, bowler: inn.cur, total: inn.runs, wk: inn.wkts });
      // fatigue (first-class): bowling raises, resting lowers
      if (!F.lo) {
        for (const pid in inn.bw) {
          const b = inn.bw[pid]; const p = this.p(+pid);
          if (+pid === inn.cur) b.fat = U.clamp(b.fat + (isPace(p.bowl) ? 0.045 + 0.02 * PACE[p.bowl] : 0.018), 0, 1);
          else b.fat = U.clamp(b.fat - (isPace(p.bowl) ? 0.03 : 0.02), 0, 1);
        }
      }
      inn.prev = inn.cur;
      // swap ends
      const t = inn.st; inn.st = inn.ns; inn.ns = t;
      const ovNum = inn.overs.length;
      if (!this.fast) {
        const st = inn.card[inn.st], ns = inn.card[inn.ns];
        const bat = (c) => c ? `${this.nm(c.pid)} ${c.runs}(${c.balls})` : '';
        this.emit({ type: 'over', over: ovNum, runs: inn.overRuns, wkts: inn.overWk, bowler: inn.cur, text: `End of over ${ovNum}: ${inn.overRuns} run${inn.overRuns === 1 ? '' : 's'}${inn.overWk ? `, ${inn.overWk} wkt` : ''}. ${this.sides[inn.bat].short} ${inn.runs}/${inn.wkts}. ${bat(st)} ${bat(ns)}` });
      }
      if (!F.lo && !ended) {
        // sessions & new ball
        const dayOv = this.dayBalls / 6;
        if (Math.abs(dayOv - 30) < 0.01 && !this.fast) this.emit({ type: 'session', text: 'Lunch.' });
        if (Math.abs(dayOv - 60) < 0.01 && !this.fast) this.emit({ type: 'session', text: 'Tea.' });
        if (this.ballAgeOvers(inn) >= 80 && this.shouldTakeNewBall(inn)) this.takeNewBall(inn);
      }
    }
    shouldTakeNewBall(inn) {
      if (this.isUserBowling(inn) && this.manual.bowl) return false; // user takes it manually
      const side = this.sides[inn.bowl];
      const pacers = side.xi.filter(p => isPace(p.bowl) && p.id !== side.keeper.id);
      return pacers.length >= 2 && this.pitch.spin < 0.75;
    }
    canTakeNewBall() { const inn = this.cur; return !!inn && !this.F.lo && this.ballAgeOvers(inn) >= 80; }
    takeNewBall(inn) {
      inn = inn || this.cur; if (!inn || this.F.lo || this.ballAgeOvers(inn) < 80) return false;
      inn.ballAt = inn.balls;
      this.emit({ type: 'newball', text: `New ball taken by ${this.sides[inn.bowl].name}.` });
      return true;
    }

    // ------------------------------------------------ first-class specifics
    ballsLeftInMatch() {
      if (this.F.lo) return 0;
      const F = this.F;
      return (this.dayLimit - this.dayBalls) + (F.days - this.day) * F.opd * 6;
    }
    leadFor(side) {
      let a = 0, b = 0;
      for (const x of this.inns) { if (x.bat === side) a += x.runs; else b += x.runs; }
      return a - b;
    }
    declareCheck(inn) {
      if (this.isUserBatting(inn)) return false;
      if (inn.target) return false;
      if (inn.overBalls !== 0 && inn.balls % 6 !== 0) return false;
      const left = this.ballsLeftInMatch() / 6;
      const lead = this.leadFor(inn.bat);
      let declare = false;
      if (inn.n <= 1) {
        if (inn.runs >= 650 || (inn.runs >= 520 && inn.wkts >= 6 && left < 260) || (inn.runs >= 450 && left < 200 && inn.n === 1 && lead > 120)) declare = true;
      } else if (inn.n === 2) {
        // third innings: set a target
        if (lead >= 80) {
          const need = lead + 1;
          if (left < 150 && need > left * 3.1 + 40 && left > 35) declare = true;
          else if (need >= 420 && left < 200) declare = true;
          else if (need >= 520) declare = true;
          else if (left < 70 && need > 170 && left > 25) declare = true;
        }
      }
      if (declare && inn.wkts < 10) { this.declare(inn); return true; }
      return false;
    }
    declare(inn) {
      inn = inn || this.cur;
      if (this.F.lo || inn.target) return false;
      inn.declared = true;
      this.emit({ type: 'declare', text: `${this.sides[inn.bat].name} declare at ${inn.runs}/${inn.wkts}.` });
      if (inn.overOpen && inn.overBalls > 0) this.endOver(inn, true);
      this.endInnings(inn, 'declared');
      return true;
    }
    rollWeather() {
      const r = this.rng;
      if (!this.F.lo) { const slow = Math.floor(r() * 5); this.dayLimit = Math.max(0, this.dayLimit - slow * 6); }
      const wet = { ENG: 0.2, NZ: 0.17, IRE: 0.25, SCO: 0.25, NED: 0.2, SL: 0.14, BAN: 0.1, WI: 0.12 }[this.venue.cc] || 0.07;
      if (r() < wet) {
        const lost = Math.round(this.F.opd * (0.15 + r() * 0.85));
        this.dayLimit = Math.max(0, this.dayLimit - lost * 6);
        this.weatherLog.push({ day: this.day, lost });
        this.emit({ type: 'weather', text: lost >= this.F.opd * 0.9 ? `Day ${this.day}: washed out by rain.` : `Day ${this.day}: rain costs ${lost} overs.` });
      }
    }
    endDay() {
      const F = this.F;
      const inn = this.cur;
      if (this.day >= F.days) { this.finishMatch('draw'); return; }
      this.emit({ type: 'stumps', text: `Stumps, Day ${this.day}: ${this.sides[inn.bat].short} ${inn.runs}/${inn.wkts}${inn.target ? `, need ${inn.target - inn.runs} more` : ''}.` });
      this.day++; this.dayBalls = 0; this.dayLimit = F.opd * 6;
      for (const i of this.inns) for (const pid in i.bw) i.bw[pid].fat = Math.max(0, i.bw[pid].fat - 0.6);
      if (inn.overBalls > 0 && inn.overBalls < F.bpo) { /* resume same over next day */ }
      this.rollWeather();
    }

    endInnings(inn, why) {
      const F = this.F;
      inn.closed = true;
      inn.endWhy = why;
      if (inn.pship.balls > 0 || inn.pship.runs > 0) inn.pships.push({ runs: inn.pship.runs, balls: inn.pship.balls, a: inn.card[inn.st] ? inn.card[inn.st].pid : null, b: inn.card[inn.ns] ? inn.card[inn.ns].pid : null, unbroken: true });
      this.emit({ type: 'innEnd', text: `${this.sides[inn.bat].name} ${inn.runs}/${inn.wkts}${why === 'declared' ? 'd' : ''} (${U.overs(inn.balls, F.bpo)} ov).` });
      if (inn.so) return this.afterSuperOverInnings(inn);
      if (F.lo) {
        if (inn.n === 0) { this.startInnings(1 - inn.bat); return; }
        // result
        const a = this.inns[0], b = this.inns[1];
        if (b.runs >= b.target) this.finishMatch('win', b.bat, 'wickets', b.wktLimit - b.wkts, inn.maxBalls - b.balls);
        else if (b.runs === b.target - 1) {
          if (this.knockout || this.F.key === 'T20' || this.F.key === 'T20I' || this.F.key === 'HUN') return this.startSuperOver();
          this.finishMatch('tie');
        } else this.finishMatch('win', a.bat, 'runs', a.runs - b.runs);
        return;
      }
      // first-class
      const n = inn.n;
      if (n === 0) { this.startInnings(1 - inn.bat); return; }
      if (n === 1) {
        const lead = this.inns[0].runs - inn.runs; // positive: team batting first leads
        const leader = this.inns[0].bat;
        if (lead >= F.followOn && this.ballsLeftInMatch() > 0) {
          if (this.userSide === leader) { this.pending = { type: 'followon', lead }; this.phase = 'play'; return; }
          if (this.aiEnforce(lead)) { this.enforceFollowOn(true); return; }
        }
        this.startInnings(leader); return;
      }
      if (n === 2) {
        // could the side batting 3rd have lost by an innings?
        const batSide = inn.bat;
        const lead = this.leadFor(batSide);
        if (lead < 0) { this.finishMatch('win', 1 - batSide, 'innings', -lead); return; }
        this.startInnings(1 - batSide); return;
      }
      if (n === 3) {
        const target = inn.target;
        if (inn.runs >= target) this.finishMatch('win', inn.bat, 'wickets', 10 - inn.wkts);
        else if (inn.allOut || inn.declared) {
          if (inn.runs === target - 1) this.finishMatch('tie');
          else this.finishMatch('win', inn.bowl, 'runs', target - 1 - inn.runs);
        } else this.finishMatch('draw');
      }
    }
    aiEnforce(lead) { const left = this.ballsLeftInMatch() / 6; return left < 230 || lead >= 300 || this.rng() < 0.4; }
    enforceFollowOn(yes) {
      this.pending = null;
      const leader = this.inns[0].bat;
      if (yes) { this.emit({ type: 'followon', text: `${this.sides[leader].name} enforce the follow-on.` }); this.startInnings(1 - leader, { followOn: true }); }
      else this.startInnings(leader);
    }

    // ------------------------------------------------ super over
    startSuperOver() {
      const n = this.superOvers.length;
      if (n >= 5) { this.finishMatch('tie'); return; }
      const first = 1 - this.inns[this.inns.length - 1].bat; // team batting second in match bats first in SO... (rule: team batting 2nd bats first)
      const batFirst = n === 0 ? this.inns[1].bat : this.superOvers[n - 1].secondBat;
      void first;
      this.superOvers.push({ firstBat: batFirst, secondBat: 1 - batFirst, inns: [] });
      this.emit({ type: 'super', text: n === 0 ? 'Scores level! We go to a SUPER OVER.' : 'Super Over tied! Another Super Over.' });
      this.startSOInnings(batFirst);
    }
    startSOInnings(side) {
      const xi = this.sides[side].xi.slice().sort(U.by(p => p.bp * 0.8 + p.bt * 0.2, true));
      const order = xi.slice(0, 3).map(p => p.id);
      const so = this.superOvers[this.superOvers.length - 1];
      let target = null;
      if (so.inns.length === 1) target = so.inns[0].runs + 1;
      const inn = this.startInnings(side, { superOver: true, order, target });
      so.inns.push(inn);
    }
    afterSuperOverInnings(inn) {
      const so = this.superOvers[this.superOvers.length - 1];
      if (so.inns.length === 1) { this.startSOInnings(1 - inn.bat); return; }
      const a = so.inns[0], b = so.inns[1];
      if (b.runs >= b.target) this.finishMatch('win', b.bat, 'superover');
      else if (b.runs < a.runs) this.finishMatch('win', a.bat, 'superover');
      else this.startSuperOver();
    }

    // ------------------------------------------------ finish
    finishMatch(kind, winner, by, margin, ballsLeft) {
      this.phase = 'done'; this.pending = null;
      const res = { kind, winner: winner == null ? null : winner, by: by || null, margin: margin || 0, ballsLeft: ballsLeft || 0 };
      if (kind === 'draw') res.text = 'Match drawn';
      else if (kind === 'tie') res.text = 'Match tied';
      else {
        const nm = this.sides[winner].name;
        if (by === 'runs') res.text = `${nm} won by ${margin} run${margin === 1 ? '' : 's'}`;
        else if (by === 'wickets') res.text = `${nm} won by ${margin} wicket${margin === 1 ? '' : 's'}` + (this.F.lo && ballsLeft ? ` (${ballsLeft} ball${ballsLeft === 1 ? '' : 's'} left)` : '');
        else if (by === 'innings') res.text = `${nm} won by an innings and ${margin} run${margin === 1 ? '' : 's'}`;
        else if (by === 'superover') res.text = `${nm} won the Super Over`;
      }
      this.result = res;
      this.mom = this.pickPlayerOfMatch();
      this.emit({ type: 'end', text: res.text + (this.mom != null ? `. Player of the match: ${this.byId.get(this.mom).p.name}` : '') });
    }
    pickPlayerOfMatch() {
      const score = new Map();
      const add = (pid, v) => score.set(pid, (score.get(pid) || 0) + v);
      const lo = this.F.lo;
      for (const inn of this.inns) {
        if (inn.so) continue;
        for (const c of inn.card) {
          let v = c.runs;
          if (lo && c.balls > 0) v += (c.runs - c.balls * (this.F.overs === 20 ? 1.3 : 0.9)) * 0.35;
          if (c.runs >= 100) v += 25; else if (c.runs >= 50) v += 10;
          add(c.pid, v);
        }
        for (const pid in inn.bw) {
          const b = inn.bw[pid];
          let v = b.wkts * (lo ? 22 : 18);
          if (lo && b.balls >= 12) v += ((this.F.overs === 20 ? 8.4 : 5.6) - b.runs * 6 / b.balls) * b.balls / 6 * 3.5;
          if (b.wkts >= 5) v += 20;
          add(+pid, v);
        }
      }
      let best = null, bv = -1e9;
      for (const [pid, v] of score) {
        const side = this.byId.get(pid).side;
        const bonus = this.result && this.result.winner === side ? 15 : 0;
        if (v + bonus > bv) { bv = v + bonus; best = pid; }
      }
      return best;
    }

    // ------------------------------------------------ simulation helpers
    simToEnd(maxBalls) {
      let n = 0; maxBalls = maxBalls || 20000;
      while (this.phase === 'play' && n < maxBalls) {
        if (this.pending) {
          if (this.pending.type === 'bowler') { this.setBowler(this.cur, this.aiPickBowler(this.cur)); continue; }
          if (this.pending.type === 'followon') { this.enforceFollowOn(this.aiEnforce(this.pending.lead)); continue; }
        }
        this.next(); n++;
      }
      return this.result;
    }
    // AI takes over any pending user decision (used by "sim" buttons)
    resolvePendingAI() {
      if (!this.pending) return;
      if (this.pending.type === 'bowler') this.setBowler(this.cur, this.aiPickBowler(this.cur));
      else if (this.pending.type === 'followon') this.enforceFollowOn(this.aiEnforce(this.pending.lead));
    }

    // ------------------------------------------------ commentary & visuals
    shotFor(ev, batP, bowP, a) {
      const r = this.rng; const left = batP.hand === 'L';
      let angle, dist;
      const spin = isSpin(bowP.bowl);
      const runs = ev.bat;
      if (ev.wkt && (ev.wkt.how === 'bowled' || ev.wkt.how === 'lbw')) return { angle: 0, dist: 0, stumps: true };
      if (ev.wkt && ev.wkt.how === 'caughtKeeper') return { angle: 180, dist: 16, keeper: true };
      if (runs === 0 && !ev.wkt) {
        if (r() < 0.35) return { angle: 180, dist: 16, leave: true };
        angle = r() * 360; dist = 6 + r() * 16;
      } else {
        // off side bias for pace, leg side for spin/high aggression
        let offBias = spin ? 0.42 : 0.56; if (a >= 4) offBias -= 0.12;
        const off = r() < offBias;
        if (off) angle = 8 + r() * 165; else angle = 190 + r() * 165;
        if (runs === 1) dist = 22 + r() * 18; else if (runs === 2) dist = 45 + r() * 15; else if (runs === 3) dist = 58 + r() * 8;
        else if (runs === 4) dist = 70; else if (runs === 6) dist = 76 + r() * 18; else dist = 20 + r() * 30;
        if (ev.wkt && (ev.wkt.how === 'caught' || ev.wkt.how === 'cb')) dist = ev.wkt.how === 'cb' ? 12 : (a >= 4 ? 55 + r() * 15 : 12 + r() * 25);
      }
      if (left) angle = 360 - angle;
      return { angle: ((angle % 360) + 360) % 360, dist, aerial: runs === 6 || (ev.wkt && ev.wkt.how === 'caught') };
    }
    shotName(shot, batP, bowP, a) {
      const r = this.rng; const spin = isSpin(bowP.bowl);
      let ang = shot.angle; if (batP.hand === 'L') ang = 360 - ang;
      const off = ang > 0 && ang < 180;
      if (ang < 15 || ang > 345) return r.pick(SHOTS.straight);
      if (shot.aerial || a >= 4.3) return off ? r.pick(SHOTS.loftOff) : (spin ? r.pick(SHOTS.spinLeg) : r.pick(SHOTS.loftLeg));
      if (spin && !off && r() < 0.4) return r.pick(SHOTS.spinLeg);
      return off ? r.pick(SHOTS.off) : r.pick(SHOTS.leg);
    }
    commWide(ev, bowP, batP, wr) {
      const b = this.nm(bowP.id), s = this.nm(batP.id);
      if (wr === 5) return `${b} to ${s}, FIVE WIDES! Sprayed down the leg side and away to the fence.`;
      return `${b} to ${s}, wide. ${this.rng.pick(['Too far outside off.', 'Drifts down leg.', 'Strays down the leg side.', 'Way outside the tramline.'])}`;
    }
    commBall(ev, inn, batP, bowP, freeHit) {
      const r = this.rng; const b = this.nm(bowP.id), s = this.nm(batP.id);
      const pre = `${b} to ${s}, `;
      const reg = ev.shot ? regionName(batP.hand === 'L' ? 360 - ev.shot.angle : ev.shot.angle, ev.shot.dist) : '';
      const shot = ev.shot ? this.shotName(ev.shot, batP, bowP, ev.agg) : '';
      let t = '';
      if (ev.ex === 'nb') t += 'NO BALL! ';
      if (freeHit && ev.legal) t += 'Free hit: ';
      if (ev.drs && ev.drs.by === 'bat' && ev.drs.result === 'overturned') {
        return pre + `given out ${ev.drs.kind === 'lbw' ? 'LBW' : 'caught behind'}... ${s} reviews straight away. DRS: NOT OUT! ${ev.drs.kind === 'lbw' ? 'Missing leg stump.' : 'Nothing on UltraEdge.'} Decision overturned.`;
      }
      if (ev.wkt) {
        const w = ev.wkt; const f = w.fielder != null ? this.nm(w.fielder) : '';
        let out;
        switch (w.how) {
          case 'bowled': out = r.pick([`OUT! BOWLED! ${b} knocks over the stumps!`, `BOWLED HIM! Through the gate and the off stump goes cartwheeling.`, `OUT! Bowled! ${s} plays all around it.`, `Timber! ${b} hits the top of off.`]); break;
          case 'lbw': out = r.pick([`OUT! LBW! Trapped plumb in front.`, `OUT! Given LBW. Pinned on the crease.`, `LBW! Big appeal and the finger goes up.`]); break;
          case 'caught': out = r.pick([`OUT! ${s} goes for the ${shot} and ${f} takes it at ${reg}.`, `OUT! Caught by ${f} at ${reg}. ${s} has to go.`, `OUT! Top edge, swirling... ${f} holds on at ${reg}!`, `OUT! Straight to ${f} at ${reg}. Soft dismissal.`]); break;
          case 'caughtKeeper': out = r.pick([`OUT! Edged and taken by ${f} behind the stumps.`, `OUT! Thin nick, ${f} gloves it.`, `OUT! Feather edge through to the keeper.`]); break;
          case 'cb': out = r.pick([`OUT! Caught and bowled! ${b} takes a sharp return catch.`, `OUT! Chipped straight back to ${b}.`]); break;
          case 'stumped': out = r.pick([`OUT! STUMPED! ${s} dances down and misses, ${f} whips the bails off.`, `OUT! Stumped by ${f}. Beaten in the flight.`]); break;
          case 'runout': out = r.pick([`OUT! RUN OUT! Terrible mix-up, ${this.nm(w.pid)} is short of the crease.`, `OUT! Direct hit from ${f}! ${this.nm(w.pid)} run out.`, `RUN OUT! ${f} with a sharp throw, ${this.nm(w.pid)} is well short.`]); break;
          default: out = 'OUT!';
        }
        if (ev.drs && ev.drs.by === 'bowl') out = `Not out says the umpire... ${this.sides[inn.bowl].short} review. ` + out.replace(/^OUT! /, '') + ' Decision overturned!';
        if (ev.drs && ev.drs.result === 'umpire') out += ` ${s} reviews, but it's umpire's call. Out.`;
        const c = inn.card.find(x => x.pid === w.pid);
        t += out + (c ? ` ${this.nm(w.pid)} ${c.runs}(${c.balls}).` : '');
        return pre + t;
      }
      if (ev.drop) return pre + t + r.pick([`DROPPED! ${s} offers a chance and it goes down. ${ev.bat ? `They take ${ev.bat}.` : ''}`, `Put down! That should have been taken. ${ev.bat ? ev.bat + ' run' + (ev.bat > 1 ? 's' : '') + '.' : ''}`, `Edged... and dropped! A lifeline for ${s}.`]);
      if (ev.drs && ev.drs.result === 'missed') t += `Huge appeal, not out... and no review. Replays suggest that was out! `;
      const runs = ev.bat;
      if (ev.ex === 'lb') return pre + t + `${ev.exRuns} leg bye${ev.exRuns > 1 ? 's' : ''}, off the pad.`;
      if (ev.ex === 'b') return pre + t + `${ev.exRuns} bye${ev.exRuns > 1 ? 's' : ''}, beats everyone.`;
      if (runs === 0) {
        if (ev.shot && ev.shot.leave) return pre + t + r.pick(['left alone outside off.', 'shoulders arms.', 'beaten! Lovely delivery.', 'plays and misses.', 'good length, lets it go.']);
        return pre + t + r.pick(['defended solidly.', 'no run, pushed to ' + reg + '.', 'blocked back to the bowler.', 'dot ball, straight to ' + reg + '.', 'tight line, no run.', 'mistimed to ' + reg + '.']);
      }
      if (runs === 4) return pre + t + r.pick([`FOUR! Glorious ${shot} through ${reg}.`, `FOUR! Cracked away to ${reg}.`, `FOUR! ${s} finds the gap at ${reg}.`, `FOUR! Short and punished, races to the ${reg} fence.`]);
      if (runs === 6) return pre + t + r.pick([`SIX! Massive ${shot} over ${reg}!`, `SIX! Into the stands at ${reg}.`, `SIX! ${s} launches it over ${reg}. Huge hit.`, `SIX! Clean strike, way over ${reg}.`]);
      if (runs === 1) return pre + t + r.pick([`single, ${shot} to ${reg}.`, `worked to ${reg} for one.`, `pushed to ${reg}, quick single.`, `1 run, ${shot} to ${reg}.`]);
      if (runs === 2) return pre + t + r.pick([`two, ${shot} into the gap at ${reg}.`, `they come back for the second, ${reg}.`, `2 runs, placed to ${reg}.`]);
      if (runs === 3) return pre + t + `three, chased down just short of the ${reg} rope.`;
      return pre + t + `${runs} runs.`;
    }
    recordBallLog(inn, ev) {
      if (this.fast) return;
      inn.log.push({ o: Math.floor((inn.balls - (ev.legal ? 1 : 0)) / this.F.bpo), b: ev.legal ? ((inn.balls - 1) % this.F.bpo) + 1 : 0, bt: ev.batter, bw: ev.bowler, r: ev.runs, br: ev.bat, ex: ev.ex, w: ev.wkt ? ev.wkt.how : null, a: ev.shot ? Math.round(ev.shot.angle) : null, d: ev.shot ? Math.round(ev.shot.dist) : null });
      if (inn.log.length > 3000) inn.log.shift();
      // milestones
      const c = inn.card.find(x => x.pid === ev.batter);
      if (c && !ev.wkt) {
        const before = c.runs - ev.bat;
        for (const m of [50, 100, 150, 200, 250, 300]) if (before < m && c.runs >= m) this.emit({ type: 'milestone', pid: c.pid, text: m === 50 ? `FIFTY for ${this.nm(c.pid)}! ${c.runs} off ${c.balls} balls.` : `${m === 100 ? 'HUNDRED' : m} for ${this.nm(c.pid)}! What an innings. ${c.runs} off ${c.balls}.` });
      }
      if (ev.wkt) {
        const b = inn.bw[ev.bowler];
        if (b && b.wkts === 5 && ev.wkt.how !== 'runout') this.emit({ type: 'milestone', pid: ev.bowler, text: `FIVE-WICKET HAUL for ${this.nm(ev.bowler)}!` });
        const lastTwo = inn.log.slice(-3).filter(x => x.bw === ev.bowler && x.w && x.w !== 'runout');
        if (lastTwo.length === 3 && inn.log.slice(-3).every(x => x.w && x.bw === ev.bowler)) this.emit({ type: 'milestone', pid: ev.bowler, text: `HAT-TRICK! ${this.nm(ev.bowler)} has done it!` });
      }
    }
    fieldPositions(inn) {
      inn = inn || this.cur; if (!inn) return [];
      const bowP = inn.cur != null && this.byId.has(inn.cur) ? this.p(inn.cur) : null;
      const sc = inn.card[inn.st]; const bat = sc ? this.p(sc.pid) : { hand: 'R' };
      const field = this.fieldFor(inn);
      const spin = bowP ? isSpin(bowP.bowl) : false;
      let key = (spin ? 'spin' : 'pace') + field;
      if (this.F.lo && inn.balls / this.F.bpo < this.F.pp && field !== 'A') key = 'ppN';
      const set = FIELDS[key] || FIELDS.paceN;
      return set.map(([a, d]) => ({ angle: bat.hand === 'L' ? 360 - a : a, dist: d }));
    }

    // ------------------------------------------------ user API
    chooseBowler(pid) { if (this.pending && this.pending.type === 'bowler') this.setBowler(this.cur, pid); }
    setAggression(pid, level) { if (level) this.agg[pid] = U.clamp(level, 1, 5); else delete this.agg[pid]; }
    setField(side, f) { this.fieldSet[side] = f; }
    setBattingOrder(side, pids) {
      const s = this.sides[side]; s.order = pids.slice();
      const inn = this.cur;
      if (inn && inn.bat === side && !inn.closed) {
        const done = new Set(inn.card.map(c => c.pid));
        inn.order = inn.card.map(c => c.pid).concat(pids.filter(id => !done.has(id)));
        inn.next = inn.card.length;
      }
    }
    // ------------------------------------------------ summaries for stats
    scorecards() { return this.inns; }
  }
  function interpTable(tab, x) {
    if (x <= tab[0][0]) return tab[0][1];
    for (let i = 1; i < tab.length; i++) if (x <= tab[i][0]) { const [x0, y0] = tab[i - 1], [x1, y1] = tab[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
    return tab[tab.length - 1][1];
  }
  SK.Match = Match;
})(typeof window !== 'undefined' ? window : globalThis);
