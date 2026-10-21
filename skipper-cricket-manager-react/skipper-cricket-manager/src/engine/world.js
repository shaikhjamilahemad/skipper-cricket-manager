/* Skipper Cricket Manager — world simulation: teams, calendar, competitions, stats, seasons */
(function (G) {
  'use strict';
  const SK = G.SK = G.SK || {};
  const U = SK.U, R = SK.R, Sel = SK.Sel, DB = SK.DB;
  const W = SK.World = {};

  // ------------------------------------------------------------------ constants
  W.LEAGUES = ['IPL', 'BBL', 'PSL', 'SA20', 'CPL', 'HUN', 'ILT20', 'MLC'];
  W.FC_COMPS = ['CC1', 'CC2', 'SHF'];
  W.COMP_LABEL = { IPL: 'IPL', BBL: 'BBL', PSL: 'PSL', SA20: 'SA20', CPL: 'CPL', HUN: 'The Hundred', ILT20: 'ILT20', MLC: 'MLC', CC1: 'County Div 1', CC2: 'County Div 2', SHF: 'Sheffield Shield', INTL: 'International' };
  // season S runs 1 Oct (S-1) .. 30 Sep (S). [startMonth(0-11), startDay, yearOffset(-1 = previous calendar year), durationDays]
  W.WINDOWS = {
    SHF: [9, 15, -1, 165], ILT20: [10, 22, -1, 29], BBL: [11, 14, -1, 42], SA20: [11, 26, -1, 40], PSL: [3, 2, 0, 38],
    IPL: [2, 20, 0, 70], CC1: [3, 3, 0, 176], CC2: [3, 3, 0, 176], MLC: [5, 12, 0, 31], HUN: [7, 1, 0, 30], CPL: [7, 15, 0, 37],
  };
  W.AUCTION_DATE = { IPL: [11, 16, -1] }; // others: 25 days before start
  W.ICC = {
    2027: [{ type: 'WTCF', month: 5, day: 9, host: 'ENG', venue: 'The Oval' }],
    2028: [{ type: 'ODIWC', month: 9, day: 9, host: 'SA', teams: 14 }],
    2029: [{ type: 'T20WC', month: 9, day: 15, host: 'AUS', teams: 20 }, { type: 'CT', month: 1, day: 19, host: 'IND', teams: 8 }, { type: 'WTCF', month: 5, day: 10, host: 'ENG', venue: "Lord's" }],
    2030: [{ type: 'T20WC', month: 5, day: 10, host: 'ENG', teams: 20 }],
    2031: [{ type: 'WTCF', month: 5, day: 10, host: 'ENG', venue: 'The Oval' }],
    2032: [{ type: 'ODIWC', month: 9, day: 8, host: 'IND', teams: 14 }],
  };
  W.iccFor = function (season) {
    if (W.ICC[season]) return W.ICC[season];
    const cyc = (season - 2029) % 4; // repeat 2029-2032 pattern
    const base = W.ICC[2029 + ((cyc + 4) % 4)] || [];
    const hosts = ['IND', 'ENG', 'AUS', 'SA', 'NZ', 'PAK', 'SL', 'WI', 'BAN'];
    return base.map(e => Object.assign({}, e, { host: e.type === 'WTCF' ? 'ENG' : hosts[(season + e.type.length) % hosts.length] }));
  };
  W.ICC_NAMES = { T20WC: 'T20 World Cup', ODIWC: 'ODI World Cup', CT: 'Champions Trophy', WTCF: 'World Test Championship Final' };
  W.STAT_KEYS = ['TEST', 'ODI', 'T20I', 'FC', 'T20', 'HUN'];
  W.STAT_LABEL = { TEST: 'Tests', ODI: 'ODIs', T20I: 'T20Is', FC: 'First-class', T20: 'T20s', HUN: 'The Hundred' };
  const WTC_SEED = { AUS: [11, 9, 2, 0, 108], NZ: [6, 4, 1, 1, 52], SA: [5, 3, 2, 0, 36], BAN: [6, 3, 2, 1, 40], IND: [11, 5, 4, 2, 68], ENG: [16, 7, 8, 1, 74], SL: [6, 1, 2, 3, 24], WI: [12, 2, 8, 2, 30], PAK: [9, 2, 7, 0, 5] };
  const WTC_NATIONS = ['IND', 'AUS', 'ENG', 'SA', 'NZ', 'PAK', 'SL', 'WI', 'BAN'];
  W.WTC_NATIONS = WTC_NATIONS;

  // ------------------------------------------------------------------ helpers
  W.year = (w) => U.yearOf(w.date);
  W.seasonOf = (day) => { const d = U.dayToDate(day); return d.getUTCMonth() >= 9 ? d.getUTCFullYear() + 1 : d.getUTCFullYear(); };
  W.dayOf = (season, month, day, yearOffset) => U.dateToDay(season + (yearOffset || 0), month, day);
  W.age = (w, p) => U.yearOf(w.date) - p.yob;
  W.team = (w, key) => w.teams[key];
  W.player = (w, id) => w.players[id];
  W.natKey = (cc) => 'INTL:' + (DB.NATION_OF[cc] || cc);
  W.ccOfNat = (key) => { const id = key.split(':')[1]; return id === 'SCOT' ? 'SCO' : id; };
  W.isNat = (key) => key.startsWith('INTL:');
  W.rngFor = (w, salt) => U.makeRng((w.seed ^ U.hash(String(salt)) ^ (w.date * 2654435761)) >>> 0);
  W.engineFmt = (comp, fmt) => {
    if (fmt === 'T20') return comp === 'INTL' || comp === 'ICC' ? 'T20I' : 'T20';
    if (fmt === 'FC4') return 'FC4';
    return fmt;
  };
  W.active = (p) => !p.retired;

  // ------------------------------------------------------------------ creation
  W.create = function (opts) {
    opts = opts || {};
    const base = DB.build();
    const w = {
      v: 1, id: U.uid(), seed: (opts.seed == null ? (Math.random() * 1e9) : opts.seed) >>> 0,
      created: Date.now(), date: 0, mode: opts.mode || 'career', dbVersion: base.version,
      players: base.players, teams: {}, comps: {}, editions: {}, fx: {}, queue: [], agenda: [],
      news: [], inbox: [], records: { TEST: {}, ODI: {}, T20I: {}, FC: {}, T20: {}, HUN: {} }, history: {},
      rank: { TEST: {}, ODI: {}, T20I: {} }, wtc: { cycle: '2025-27', table: {}, finalSeason: 2027 },
      user: null, nextId: 1, settings: Object.assign({ auctions: true, autoSave: true }, opts.settings || {}), seasonsDone: 0,
      busy: {},
    };
    for (const c of base.comps) {
      const def = { id: c.id, name: c.name, fmt: c.fmt, home: c.home, osXI: c.osXI, mpt: c.mpt, playoff: c.playoff, month: c.month, cur: c.cur, purse: c.purse, squadMax: c.squadMax, osSquad: c.osSquad, teams: [] };
      w.comps[c.id] = def;
      for (const t of c.teams) {
        const key = c.id + ':' + t.id;
        const team = { key, comp: c.id, id: t.id, name: t.name, short: t.short, c1: t.c1, c2: t.c2, city: t.city, venue: t.venue, pitch: t.pitch,
          cap: t.cap ? (base.players.find(p => p.name === t.cap) || {}).id : null, squad: c.id === 'INTL' ? [] : t.squad.slice(), purse: c.purse, rep: 50, elo: {} };
        if (c.id === 'INTL') { team.pref = t.pref || {}; team.caps = t.caps || {}; team.core = t.squad.slice(); team.cc = t.id === 'SCOT' ? 'SCO' : t.id; }
        w.teams[key] = team; def.teams.push(key);
        if (c.id !== 'INTL') for (const pid of team.squad) { const p = w.players[pid]; p.teams[c.id] = key; }
      }
    }
    // county divisions share one player registry key
    for (const p of w.players) { if (p.teams.CC1 || p.teams.CC2) p.teams.CC = p.teams.CC1 || p.teams.CC2; }
    W.initReputation(w);
    W.initRankings(w);
    for (const [cc, v] of Object.entries(WTC_SEED)) w.wtc.table[W.natKey(cc)] = { p: v[0], w: v[1], l: v[2], d: v[3], pts: v[4], t: 0 };
    W.scheduleSeason(w, 2027, 0);
    if (opts.userTeam) W.setUser(w, opts.userTeam, opts.manager || 'Manager', opts);
    W.addNews(w, 'Welcome to the 2026-27 season. Squads are as of 20 October 2026.', 'info');
    return w;
  };

  W.teamStrength = function (w, team, fmt) {
    const players = W.isNat(team.key) ? W.nationalPool(w, team) : team.squad.map(id => w.players[id]).filter(W.active);
    const comp = w.comps[team.comp];
    const efmt = W.engineFmt(team.comp, fmt);
    const xi = Sel.pickXI(players, { fmt: efmt, maxOverseas: W.isNat(team.key) ? 11 : comp.osXI, isOverseas: p => !W.isNat(team.key) && DB.isOverseasFor(p, comp.home), pitch: team.pitch, pref: team.pref && team.pref[fmt === 'T20' ? 'T20I' : fmt] ? new Set(team.pref[fmt === 'T20' ? 'T20I' : fmt]) : null });
    return U.avg(xi, p => R.overall(p, efmt));
  };
  W.initReputation = function (w) {
    for (const key in w.teams) {
      const t = w.teams[key]; const c = w.comps[t.comp];
      const fmt = c.fmt === 'INT' ? 'ODI' : c.fmt === '100' ? 'HUN' : c.fmt;
      const s = W.teamStrength(w, t, fmt === 'HUN' ? 'T20' : fmt);
      t.strength = Math.round(s * 10) / 10;
      const boost = { IPL: 22, INTL: 25, BBL: 8, SA20: 8, HUN: 6, PSL: 6, ILT20: 2, CPL: 2, MLC: 0, CC1: 4, CC2: -2, SHF: 4 }[t.comp] || 0;
      t.rep = Math.round(U.clamp((s - 55) * 2 + boost + 30, 10, 99));
    }
  };
  W.initRankings = function (w) {
    for (const fmt of ['TEST', 'ODI', 'T20I']) {
      for (const key of w.comps.INTL.teams) {
        const t = w.teams[key];
        const s = W.teamStrength(w, t, fmt === 'T20I' ? 'T20' : fmt);
        w.rank[fmt][key] = Math.round(1500 + (s - 65) * 22);
      }
    }
  };
  W.nationalPool = function (w, team) {
    const cc = team.cc || W.ccOfNat(team.key);
    return w.players.filter(p => p.cc === cc && W.active(p));
  };

  // ------------------------------------------------------------------ news / inbox
  W.addNews = function (w, text, type, extra) {
    w.news.unshift(Object.assign({ date: w.date, text, type: type || 'news' }, extra || {}));
    if (w.news.length > 300) w.news.length = 300;
  };
  W.mail = function (w, title, body, type, extra) {
    w.inbox.unshift(Object.assign({ id: w.nextId++, date: w.date, title, body, type: type || 'info', read: false }, extra || {}));
    if (w.inbox.length > 200) w.inbox.length = 200;
  };

  // ------------------------------------------------------------------ queue
  W.enqueue = function (w, item) {
    // item: {date, kind:'fx'|'ev', id, ord}
    item.ord = item.ord || 0;
    const q = w.queue; let lo = 0, hi = q.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; const m = q[mid]; if (m.date < item.date || (m.date === item.date && m.ord <= item.ord)) lo = mid + 1; else hi = mid; }
    q.splice(lo, 0, item);
  };
  W.newFixture = function (w, f) {
    const id = 'f' + (w.nextId++);
    const fx = Object.assign({ id, status: 'pending' }, f);
    w.fx[id] = fx;
    W.enqueue(w, { date: fx.date, kind: 'fx', id, ord: fx.ord || 1 });
    return fx;
  };
  W.newEvent = function (w, date, type, data) {
    const id = 'e' + (w.nextId++);
    const ev = Object.assign({ id, date, type }, data || {});
    w.agenda.push(ev);
    W.enqueue(w, { date, kind: 'ev', id, ord: data && data.ord != null ? data.ord : 0 });
    return ev;
  };
  W.getEvent = (w, id) => w.agenda.find(e => e.id === id);

  // ------------------------------------------------------------------ venues
  W.venueOf = function (w, teamKey) {
    const t = w.teams[teamKey];
    const comp = w.comps[t.comp];
    const cc = W.isNat(teamKey) ? t.cc : comp.home;
    return { name: t.venue, city: t.city, cc, pitch: t.pitch, team: teamKey };
  };
  const NAT_VENUES = {
    IND: [['Wankhede Stadium', 'Mumbai', 'F'], ['Eden Gardens', 'Kolkata', 'F'], ['MA Chidambaram Stadium', 'Chennai', 'D'], ['Narendra Modi Stadium', 'Ahmedabad', 'B'], ['M Chinnaswamy Stadium', 'Bengaluru', 'F'], ['Arun Jaitley Stadium', 'Delhi', 'D'], ['Barsapara Stadium', 'Guwahati', 'B']],
    AUS: [['MCG', 'Melbourne', 'B'], ['SCG', 'Sydney', 'B'], ['Adelaide Oval', 'Adelaide', 'F'], ['Perth Stadium', 'Perth', 'P'], ['The Gabba', 'Brisbane', 'P'], ['Bellerive Oval', 'Hobart', 'G']],
    ENG: [["Lord's", 'London', 'G'], ['The Oval', 'London', 'F'], ['Headingley', 'Leeds', 'G'], ['Old Trafford', 'Manchester', 'B'], ['Edgbaston', 'Birmingham', 'B'], ['Trent Bridge', 'Nottingham', 'G']],
    SA: [['Wanderers Stadium', 'Johannesburg', 'P'], ['Newlands', 'Cape Town', 'B'], ['Kingsmead', 'Durban', 'G'], ['SuperSport Park', 'Centurion', 'P'], ["St George's Park", 'Gqeberha', 'S']],
    NZ: [['Basin Reserve', 'Wellington', 'G'], ['Hagley Oval', 'Christchurch', 'G'], ['Eden Park', 'Auckland', 'F'], ['Seddon Park', 'Hamilton', 'B'], ['Bay Oval', 'Mount Maunganui', 'F']],
    PAK: [['Gaddafi Stadium', 'Lahore', 'F'], ['National Stadium', 'Karachi', 'F'], ['Rawalpindi Cricket Stadium', 'Rawalpindi', 'F'], ['Multan Cricket Stadium', 'Multan', 'D']],
    SL: [['R Premadasa Stadium', 'Colombo', 'D'], ['Galle International Stadium', 'Galle', 'D'], ['Pallekele Stadium', 'Kandy', 'B'], ['SSC', 'Colombo', 'D']],
    WI: [['Kensington Oval', 'Bridgetown', 'B'], ["Queen's Park Oval", 'Port of Spain', 'S'], ['Sabina Park', 'Kingston', 'P'], ['Providence Stadium', 'Providence', 'S'], ['Daren Sammy Stadium', 'Gros Islet', 'B']],
    BAN: [['Shere Bangla Stadium', 'Dhaka', 'D'], ['Zahur Ahmed Chowdhury Stadium', 'Chattogram', 'D'], ['Sylhet Stadium', 'Sylhet', 'S']],
    AFG: [['Sharjah Cricket Stadium', 'Sharjah', 'D'], ['Zayed Cricket Stadium', 'Abu Dhabi', 'S']],
    IRE: [['Malahide', 'Dublin', 'G'], ['Stormont', 'Belfast', 'G'], ['Bready', 'Bready', 'G']],
    ZIM: [['Harare Sports Club', 'Harare', 'B'], ['Queens Sports Club', 'Bulawayo', 'F']],
  };
  W.natVenue = function (w, cc, rng) {
    const list = NAT_VENUES[cc];
    if (!list) { const t = w.teams[W.natKey(cc)]; return { name: t.venue, city: t.city, cc, pitch: t.pitch }; }
    const v = rng.pick(list); return { name: v[0], city: v[1], cc, pitch: v[2] };
  };

  // ------------------------------------------------------------------ scheduling
  W.roundRobin = function (keys, rounds, rng) {
    // circle method; returns array of rounds of [home, away]
    const t = keys.slice(); if (t.length % 2) t.push(null);
    const n = t.length; const out = [];
    const base = [];
    for (let r = 0; r < n - 1; r++) {
      const pairs = [];
      for (let i = 0; i < n / 2; i++) {
        const a = t[i], b = t[n - 1 - i];
        if (a && b) pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
      }
      base.push(pairs);
      t.splice(1, 0, t.pop());
    }
    let k = 0;
    while (out.length < rounds) {
      const pr = base[k % base.length].map(p => (Math.floor(k / base.length) % 2 ? [p[1], p[0]] : p));
      out.push(pr); k++;
    }
    return out;
  };
  W.createLeagueEdition = function (w, compId, season, opts) {
    opts = opts || {};
    const c = w.comps[compId];
    const win = W.WINDOWS[compId];
    let start = W.dayOf(season, win[0], win[1], win[2]);
    if (opts.minStart != null && start < opts.minStart) start = opts.minStart;
    const label = (compId === 'BBL' ? `BBL|${season - 2011} ${season - 1}-${String(season).slice(2)}` : compId === 'SHF' ? `Sheffield Shield ${season - 1}-${String(season).slice(2)}` : compId === 'ILT20' ? `ILT20 Season ${season - 2022}` : `${c.name} ${season}`);
    const id = `${compId}-${season}`;
    const ed = { id, comp: compId, season, name: label, type: 'league', fmt: c.fmt === '100' ? 'HUN' : c.fmt, status: 'scheduled', start, teams: c.teams.slice(), table: {}, fixtures: [], stage: 'league', playoff: c.playoff, stats: {}, champion: null };
    for (const k of ed.teams) ed.table[k] = { p: 0, w: 0, l: 0, t: 0, d: 0, nr: 0, pts: 0, rf: 0, bf: 0, ra: 0, ba: 0, bon: 0 };
    w.editions[id] = ed;
    const rng = W.rngFor(w, id);
    const n = ed.teams.length;
    const fc = ed.fmt === 'FC4';
    const rounds = fc ? c.mpt : Math.ceil(c.mpt * n / (2 * Math.floor(n / 2)));
    const order = rng.shuffle(ed.teams.slice());
    const rr = W.roundRobin(order, rounds, rng);
    const games = [];
    for (const round of rr) for (const pair of round) games.push(pair);
    // trim to exact matches per team
    const cnt = {}; const keep = [];
    for (const g of games) { if ((cnt[g[0]] || 0) < c.mpt && (cnt[g[1]] || 0) < c.mpt) { keep.push(g); cnt[g[0]] = (cnt[g[0]] || 0) + 1; cnt[g[1]] = (cnt[g[1]] || 0) + 1; } }
    const dur = win[3];
    const fmt = ed.fmt;
    if (fc) {
      // rounds every ~12 days
      const perRound = Math.floor(n / 2);
      keep.forEach((g, i) => {
        const r = Math.floor(i / perRound);
        const date = start + Math.round(r * (dur - (compId === 'SHF' ? 25 : 0)) / Math.max(1, rounds));
        W.newFixture(w, { ed: id, comp: compId, date, fmt, home: g[0], away: g[1], venue: W.venueOf(w, g[0]), stage: 'league', no: i + 1 });
      });
    } else {
      const leagueDays = dur - 6;
      const perDay = Math.max(1, Math.ceil(keep.length / leagueDays));
      let day = start, today = 0; const playedOn = {};
      keep.forEach((g, i) => {
        // avoid a team playing two days running when possible
        while (today >= perDay || playedOn[g[0]] === day - 0 || playedOn[g[1]] === day) { day++; today = 0; }
        today++;
        playedOn[g[0]] = day; playedOn[g[1]] = day;
        W.newFixture(w, { ed: id, comp: compId, date: day, fmt, home: g[0], away: g[1], venue: W.venueOf(w, g[0]), stage: 'league', no: i + 1, ord: today });
      });
      ed.leagueEnd = day;
    }
    ed.fixtures = Object.values(w.fx).filter(f => f.ed === id).map(f => f.id);
    ed.end = Math.max.apply(null, ed.fixtures.map(fid => w.fx[fid].date));
    // pre-season squad event (draft / auction) for franchise leagues
    if (W.LEAGUES.includes(compId)) {
      const ad = W.AUCTION_DATE[compId];
      let adate = ad ? W.dayOf(season, ad[0], ad[1], ad[2]) : start - 25;
      if (adate < w.date) adate = Math.max(w.date, start - 25);
      if (adate >= w.date && adate < start) {
        W.newEvent(w, adate, 'auction', { comp: compId, season, ed: id, ord: -1 });
        if (compId === 'IPL') W.newEvent(w, Math.max(w.date, adate - 31), 'retention', { comp: compId, season, ed: id, ord: -1 });
      }
    }
    W.newEvent(w, start, 'edStart', { ed: id, ord: -2 });
    return ed;
  };

  // international series
  W.createSeries = function (w, host, guest, start, legs, opts) {
    opts = opts || {};
    const H = w.teams[host], A = w.teams[guest];
    const season = W.seasonOf(start);
    const id = `S${w.nextId++}`;
    const name = `${A.name} tour of ${H.name} ${U.yearOf(start)}${U.monthOf(start) >= 9 ? '-' + String(U.yearOf(start) + 1).slice(2) : ''}`;
    const ed = { id, comp: 'INTL', season, name, type: 'series', host, guest, teams: [host, guest], legs: [], fixtures: [], status: 'scheduled', start, stats: {}, squads: {} };
    w.editions[id] = ed;
    const rng = W.rngFor(w, id);
    let day = start;
    for (const leg of legs) {
      const L = { fmt: leg.fmt, n: leg.n, fixtures: [], score: { [host]: 0, [guest]: 0, d: 0 }, done: false, start: day };
      for (let i = 0; i < leg.n; i++) {
        const fx = W.newFixture(w, { ed: id, comp: 'INTL', date: day, fmt: leg.fmt, home: host, away: guest, venue: W.natVenue(w, H.cc, rng), stage: leg.fmt, no: i + 1, leg: ed.legs.length });
        L.fixtures.push(fx.id); ed.fixtures.push(fx.id);
        day += leg.fmt === 'TEST' ? 9 : leg.fmt === 'ODI' ? 3 : 2;
      }
      day += leg.fmt === 'TEST' ? 0 : 3;
      ed.legs.push(L);
    }
    ed.end = day;
    for (const k of [host, guest]) { (w.busy[k] = w.busy[k] || []).push([start - 3, day + 2]); }
    W.newEvent(w, start - 2, 'seriesStart', { ed: id, ord: -2 });
    return ed;
  };
  W.isBusy = function (w, key, a, b) { return (w.busy[key] || []).some(([s, e]) => !(b < s || a > e)); };

  W.scheduleInternational = function (w, season, minStart) {
    const rng = W.rngFor(w, 'intl' + season);
    const tests = DB.TEST_NATIONS.map(W.natKey);
    const assoc = w.comps.INTL.teams.filter(k => !tests.includes(k));
    const icc = W.iccFor(season);
    const iccBlocks = icc.filter(e => e.type !== 'WTCF').map(e => { const s = W.dayOf(season, e.month, e.day, e.month >= 9 ? -1 : 0); return [s - 10, s + 50]; });
    const blocked = (a, b) => iccBlocks.some(([s, e]) => !(b < s || a > e));
    // slots (start offsets in days from 1 Oct of season-1)
    const seasonStart = W.dayOf(season - 1, 9, 1, 0);
    const slots = [5, 48, 95, 135, 245, 290, 330].map(x => seasonStart + x);
    const big = ['INTL:IND', 'INTL:AUS', 'INTL:ENG'];
    const lastHost = w.lastHost = w.lastHost || {};
    const pairCount = {};
    const ipl = [W.dayOf(season, 2, 15, 0), W.dayOf(season, 4, 31, 0)];
    for (const slot of slots) {
      if (slot < minStart) continue;
      const free = rng.shuffle(tests.slice());
      const used = new Set();
      for (const a of free) {
        if (used.has(a)) continue;
        const cands = free.filter(b => b !== a && !used.has(b)).sort((x, y) => (pairCount[[a, x].sort()] || 0) - (pairCount[[a, y].sort()] || 0) + (rng() - 0.5) * 1.5);
        const b = cands[0]; if (!b) continue;
        if (rng() < 0.18) continue; // rest slot
        const pk = [a, b].sort().join('|');
        const host = lastHost[pk] === a ? b : (lastHost[pk] === b ? a : (rng() < 0.5 ? a : b));
        const guest = host === a ? b : a;
        const bigPair = big.includes(a) && big.includes(b);
        const weak = ['INTL:IRE', 'INTL:ZIM', 'INTL:AFG'];
        const smallPair = weak.includes(a) || weak.includes(b);
        const legs = [];
        const nTests = bigPair ? (rng() < 0.6 ? 5 : 4) : smallPair ? (rng() < 0.5 ? 1 : 2) : rng.int(2, 3);
        const order = rng() < 0.5 ? ['T20', 'ODI', 'TEST'] : ['TEST', 'ODI', 'T20'];
        for (const f of order) {
          if (f === 'TEST' && rng() < (smallPair ? 0.5 : 0.85)) legs.push({ fmt: 'TEST', n: nTests });
          if (f === 'ODI' && rng() < 0.7) legs.push({ fmt: 'ODI', n: 3 });
          if (f === 'T20' && rng() < 0.7) legs.push({ fmt: 'T20', n: rng() < 0.4 ? 5 : 3 });
        }
        if (!legs.length) legs.push({ fmt: 'ODI', n: 3 });
        const dur = U.sum(legs, l => l.n * (l.fmt === 'TEST' ? 9 : l.fmt === 'ODI' ? 3 : 2) + 3);
        const s0 = slot + rng.int(0, 6);
        if (blocked(s0, s0 + dur)) continue;
        const iplClash = (k) => k === 'INTL:IND' && !(s0 + dur < ipl[0] || s0 > ipl[1]);
        if (iplClash(a) || iplClash(b)) continue;
        if (W.isBusy(w, a, s0, s0 + dur) || W.isBusy(w, b, s0, s0 + dur)) continue;
        W.createSeries(w, host, guest, s0, legs);
        used.add(a); used.add(b); lastHost[pk] = host; pairCount[pk] = (pairCount[pk] || 0) + 1;
      }
    }
    // associates: a few white-ball series among themselves / vs weaker full members
    const assocSlots = slots.filter((s, i) => i % 2 === 1 && s >= minStart);
    for (const slot of assocSlots) {
      const pool = rng.shuffle(assoc.concat(['INTL:IRE', 'INTL:ZIM', 'INTL:AFG']));
      for (let i = 0; i + 1 < pool.length; i += 2) {
        const a = pool[i], b = pool[i + 1];
        const s0 = slot + rng.int(0, 10);
        const legs = [{ fmt: rng() < 0.5 ? 'T20' : 'ODI', n: 3 }];
        if (W.isBusy(w, a, s0, s0 + 14) || W.isBusy(w, b, s0, s0 + 14) || blocked(s0, s0 + 14)) continue;
        W.createSeries(w, a, b, s0, legs);
      }
    }
    for (const e of icc) {
      const s = W.dayOf(season, e.month, e.day, e.month >= 9 ? -1 : 0);
      if (s < minStart) continue;
      W.newEvent(w, s - 30, 'iccCreate', { icc: e, season, start: s, ord: -3 });
    }
  };

  W.scheduleSeason = function (w, season, minStart) {
    minStart = minStart || 0;
    for (const compId of Object.keys(W.WINDOWS)) {
      const win = W.WINDOWS[compId];
      let start = W.dayOf(season, win[0], win[1], win[2]);
      if (start + win[3] < minStart) continue;
      W.createLeagueEdition(w, compId, season, { minStart: Math.max(minStart + 4, start) });
    }
    W.scheduleInternational(w, season, minStart);
    W.newEvent(w, W.dayOf(season, 8, 30, 0), 'seasonEnd', { season, ord: 9 });
    w.scheduledSeason = season;
  };

  // ------------------------------------------------------------------ ICC tournaments
  W.createICC = function (w, ev) {
    const e = ev.icc; const season = ev.season;
    const nations = w.comps.INTL.teams.slice();
    const fmtRank = e.type === 'T20WC' ? 'T20I' : e.type === 'WTCF' ? 'TEST' : 'ODI';
    const ranked = nations.slice().sort((a, b) => (w.rank[fmtRank][b] || 0) - (w.rank[fmtRank][a] || 0));
    const id = `${e.type}-${season}`;
    const fmt = e.type === 'T20WC' ? 'T20' : e.type === 'WTCF' ? 'TEST' : 'ODI';
    const rng = W.rngFor(w, id);
    const hostKey = W.natKey(e.host);
    const name = e.type === 'WTCF' ? `WTC Final ${U.yearOf(ev.start)}` : `ICC ${W.ICC_NAMES[e.type]} ${U.yearOf(ev.start)}`;
    const ed = { id, comp: 'ICC', season, name, type: 'icc', icc: e.type, fmt, host: hostKey, teams: [], groups: [], stage: 'group', fixtures: [], status: 'scheduled', start: ev.start, stats: {}, squads: {}, table: {} };
    w.editions[id] = ed;
    if (e.type === 'WTCF') {
      const tbl = W.wtcStandings(w);
      const [a, b] = [tbl[0].key, tbl[1].key];
      ed.teams = [a, b]; ed.stage = 'final';
      const v = { name: e.venue || "Lord's", city: 'London', cc: 'ENG', pitch: 'G' };
      const fx = W.newFixture(w, { ed: id, comp: 'ICC', date: ev.start, fmt: 'TEST', home: a, away: b, venue: v, stage: 'F', neutral: true, ko: true });
      ed.fixtures.push(fx.id);
      W.addNews(w, `${w.teams[a].name} and ${w.teams[b].name} will contest the ${name}.`, 'icc');
      return ed;
    }
    let teams = ranked.filter(k => k !== hostKey).slice(0, e.teams - 1); teams.unshift(hostKey);
    ed.teams = teams;
    for (const k of teams) ed.table[k] = { p: 0, w: 0, l: 0, t: 0, d: 0, nr: 0, pts: 0, rf: 0, bf: 0, ra: 0, ba: 0 };
    // seeding into groups (snake)
    const nG = e.type === 'T20WC' ? 4 : 2;
    const seeded = teams.slice().sort((a, b) => (w.rank[fmtRank][b] || 0) - (w.rank[fmtRank][a] || 0));
    const groups = Array.from({ length: nG }, () => []);
    seeded.forEach((k, i) => { const r = Math.floor(i / nG); const gi = r % 2 === 0 ? i % nG : nG - 1 - (i % nG); groups[gi].push(k); });
    ed.groups = groups.map((g, i) => ({ name: 'Group ' + 'ABCD'[i], teams: g }));
    let day = ev.start; const hostCC = e.host;
    const games = [];
    for (const g of ed.groups) {
      const rr = W.roundRobin(g.teams, g.teams.length % 2 ? g.teams.length : g.teams.length - 1, rng);
      rr.forEach((round, r) => round.forEach(pair => games.push({ pair, r, g: g.name })));
    }
    games.sort((a, b) => a.r - b.r);
    let perDay = e.type === 'T20WC' ? 3 : 2, today = 0;
    for (const gm of games) {
      if (today >= perDay) { day++; today = 0; }
      today++;
      const fx = W.newFixture(w, { ed: id, comp: 'ICC', date: day, fmt, home: gm.pair[0], away: gm.pair[1], venue: W.natVenue(w, hostCC, rng), stage: gm.g, neutral: gm.pair[0] !== hostKey, ord: today });
      ed.fixtures.push(fx.id);
    }
    ed.groupEnd = day;
    W.addNews(w, `${name} begins on ${U.fmtDate(ev.start)} in ${w.teams[hostKey].name}. ${teams.length} teams.`, 'icc');
    return ed;
  };

  // ------------------------------------------------------------------ national duty
  W.assignDuty = function (w, ed) {
    for (const k of ed.teams) {
      const sq = ed.squads && ed.squads[k]; if (!sq) continue;
      if (ed.type === 'series') {
        ed.legs.forEach((leg, li) => {
          const ids = sq[leg.fmt]; if (!ids) return;
          const dates = leg.fixtures.map(id => w.fx[id].date);
          const a = Math.min.apply(null, dates) - 2, b = Math.max.apply(null, dates) + (leg.fmt === 'TEST' ? 5 : 1);
          for (const id of ids) { const p = w.players[id]; p.duty = (p.duty || []).filter(d => d[1] >= w.date - 5); p.duty.push([a, b, ed.id + ':' + li]); }
        });
      } else if (ed.type === 'icc') {
        const ids = sq[ed.fmt]; if (!ids) continue;
        const a = ed.start - 4, b = ed.start + (ed.icc === 'WTCF' ? 6 : 42);
        for (const id of ids) { const p = w.players[id]; p.duty = (p.duty || []).filter(d => d[1] >= w.date - 5); p.duty.push([a, b, ed.id]); }
      }
    }
  };
  W.onDuty = (p, day) => !!(p.duty && p.duty.some(d => day >= d[0] && day <= d[1]));

  // ------------------------------------------------------------------ team selection for a fixture
  W.squadFor = function (w, teamKey, fx) {
    const t = w.teams[teamKey];
    if (W.isNat(teamKey)) {
      const ed = w.editions[fx.ed];
      const fmt = fx.fmt;
      if (ed && ed.squads && ed.squads[teamKey] && ed.squads[teamKey][fmt]) return ed.squads[teamKey][fmt].map(id => w.players[id]).filter(p => W.active(p));
      return W.nationalPool(w, t);
    }
    return t.squad.map(id => w.players[id]).filter(p => W.active(p) && !W.onDuty(p, fx.date));
  };
  // emergency signings so every team can field a side
  W.topUpSquads = function (w, ed) {
    if (!ed.teams || ed.type !== 'league') return;
    const comp = w.comps[ed.comp]; const min = ed.comp === 'HUN' ? 14 : 15;
    const regKey = (ed.comp === 'CC1' || ed.comp === 'CC2') ? 'CC' : ed.comp;
    const inComp = new Set(); for (const k of ed.teams) for (const id of w.teams[k].squad) inComp.add(id);
    const local = (p) => !DB.isOverseasFor(p, comp.home);
    let pool = null;
    for (const k of ed.teams) {
      const t = w.teams[k];
      if (t.squad.filter(id => !w.players[id].retired).length >= min) continue;
      if (!pool) pool = w.players.filter(p => !p.retired && !inComp.has(p.id) && local(p) && (!SK.Auction || SK.Auction.eligible(w, p, comp))).sort(U.by(p => R.overall(p, W.engineFmt(ed.comp, ed.fmt)), true));
      while (t.squad.length < min && pool.length) {
        const p = pool.shift(); t.squad.push(p.id); p.teams[regKey] = k; if (regKey === 'CC') p.teams[t.comp] = k; inComp.add(p.id);
        if (SK.Auction) { p.sal = p.sal || {}; p.sal[ed.comp] = SK.Auction.base(comp); }
        if (w.user && w.user.team === k) W.mail(w, `Emergency signing: ${p.name}`, `With the squad short of players, the club has signed ${p.name} on a minimum deal.`, 'news', { pid: p.id });
      }
    }
  };
  W.pickXIFor = function (w, teamKey, fx) {
    const t = w.teams[teamKey];
    const efmt = W.engineFmt(fx.comp === 'ICC' ? 'INTL' : fx.comp, fx.fmt);
    let pool = W.squadFor(w, teamKey, fx);
    if (!W.isNat(teamKey) && pool.filter(p => p.injury <= 0).length < 12) pool = t.squad.map(id => w.players[id]).filter(W.active); // recall players from duty if desperate
    const comp = w.comps[t.comp];
    const nat = W.isNat(teamKey);
    const prefKey = fx.fmt === 'T20' ? 'T20I' : fx.fmt;
    const pref = nat && t.pref && t.pref[prefKey] && w.date < 400 ? new Set(t.pref[prefKey]) : null;
    return Sel.pickXI(pool, { fmt: efmt, maxOverseas: nat ? 11 : comp.osXI, isOverseas: p => !nat && DB.isOverseasFor(p, comp.home), pitch: fx.venue && fx.venue.pitch, pref });
  };
  W.selectNationalSquad = function (w, teamKey, fmt, size) {
    const t = w.teams[teamKey];
    const efmt = fmt === 'T20' ? 'T20I' : fmt;
    const pool = W.nationalPool(w, t).filter(p => Sel.available(p, efmt));
    const pref = t.pref && t.pref[efmt] && w.date < 400 ? new Set(t.pref[efmt]) : null;
    const xi = Sel.pickXI(pool, { fmt: efmt, pref });
    const rest = pool.filter(p => !xi.includes(p));
    const bonus = (p) => (pref && pref.has(p.id) ? 6 : 0) + R.formMod(p) * 0.6;
    const extras = [];
    const want = [['WK', 1], ['BAT', 2], ['BWL', 2]];
    for (const [role, n] of want) {
      const c = rest.filter(p => p.role === role && !extras.includes(p)).sort(U.by(p => R.overall(p, efmt) + bonus(p), true)).slice(0, n);
      extras.push(...c);
    }
    const others = rest.filter(p => !extras.includes(p)).sort(U.by(p => R.overall(p, efmt) + bonus(p), true));
    while (xi.length + extras.length < size && others.length) extras.push(others.shift());
    return xi.concat(extras).slice(0, size).map(p => p.id);
  };

  // ------------------------------------------------------------------ building & applying matches
  W.buildMatch = function (w, fx, opts) {
    opts = opts || {};
    const efmt = W.engineFmt(fx.comp === 'ICC' ? 'INTL' : fx.comp, fx.fmt);
    const sides = [fx.home, fx.away].map((key, i) => {
      const t = w.teams[key];
      const xi = (opts.xi && opts.xi[i]) ? opts.xi[i].map(id => w.players[id]) : W.pickXIFor(w, key, fx);
      const prefCap = W.isNat(key) ? (t.caps && t.caps[fx.fmt === 'T20' ? 'T20I' : fx.fmt]) : t.cap;
      return { id: t.id, key, name: t.name, short: t.short, c1: t.c1, c2: t.c2, xi, captainId: (opts.cap && opts.cap[i] != null) ? opts.cap[i] : prefCap, keeperId: opts.keeper && opts.keeper[i] != null ? opts.keeper[i] : null };
    });
    const ed = w.editions[fx.ed];
    const m = new SK.Match({ format: efmt, teams: sides, venue: fx.venue, homeSide: fx.neutral ? null : 0, seed: (w.seed ^ U.hash(fx.id)) >>> 0, fast: !!opts.fast, knockout: !!fx.ko || (fx.stage && /^(F|SF|Q1|Q2|E)$/.test(fx.stage)), userSide: opts.userSide == null ? null : opts.userSide, manual: opts.manual, compName: ed ? ed.name : '', title: W.fixtureTitle(w, fx) });
    return m;
  };
  W.fixtureTitle = function (w, fx) {
    const ed = w.editions[fx.ed];
    const st = { Q1: 'Qualifier 1', E: 'Eliminator', Q2: 'Qualifier 2', F: 'Final', SF: 'Semi-final' }[fx.stage];
    if (st) return `${ed ? ed.name : ''} ${st}`;
    if (ed && ed.type === 'series') return `${ed.name}: ${fx.fmt === 'TEST' ? U.ordinal(fx.no) + ' Test' : U.ordinal(fx.no) + (fx.fmt === 'ODI' ? ' ODI' : ' T20I')}`;
    if (ed && ed.type === 'icc') return `${ed.name}, ${fx.stage}`;
    return `${ed ? ed.name : ''}, Match ${fx.no || ''}`;
  };

  W.simFixture = function (w, fx) {
    const m = W.buildMatch(w, fx, { fast: true });
    m.doToss();
    m.simToEnd(60000);
    W.applyMatch(w, fx, m);
    return m;
  };

  function teamScore(inn, F) { return { runs: inn.runs, wkts: inn.wkts, balls: inn.balls, dec: inn.declared, fo: inn.followOn }; }
  W.applyMatch = function (w, fx, m) {
    const ed = w.editions[fx.ed];
    const keys = [fx.home, fx.away];
    const res = m.result || { kind: 'draw', text: 'Match abandoned' };
    const winner = res.kind === 'win' ? keys[res.winner] : null;
    fx.status = 'done';
    fx.result = { winner, kind: res.kind, by: res.by, margin: res.margin, text: res.text, mom: m.mom, toss: m.toss ? keys[m.toss.winner] : null, tossDec: m.toss ? m.toss.decision : null,
      inns: m.inns.filter(i => !i.so).map(i => ({ team: keys[i.bat], runs: i.runs, wkts: i.wkts, balls: i.balls, dec: i.declared, fo: i.followOn })), so: m.superOvers.length > 0 };
    // top performers for summaries
    const tops = [];
    for (const inn of m.inns) {
      if (inn.so) continue;
      for (const c of inn.card) if (c.runs >= (m.F.lo ? 30 : 50)) tops.push({ t: 'b', pid: c.pid, r: c.runs, b: c.balls, no: !c.out, team: keys[inn.bat] });
      for (const pid in inn.bw) { const b = inn.bw[pid]; if (b.wkts >= (m.F.lo ? 3 : 4)) tops.push({ t: 'w', pid: +pid, w: b.wkts, r: b.runs, team: keys[inn.bowl] }); }
    }
    fx.result.tops = tops.slice(0, 8);
    W.updateStats(w, fx, m);
    W.updatePlayersAfter(w, fx, m);
    if (ed) W.updateCompetition(w, ed, fx, m);
    if (W.isNat(fx.home) && W.isNat(fx.away)) { W.updateRanking(w, fx, m); if (fx.fmt === 'TEST' && fx.comp === 'INTL') W.updateWTC(w, fx); }
    W.updateRecords(w, fx, m);
    if (w.user && (keys.includes(w.user.team))) W.onUserMatch && W.onUserMatch(w, fx, m);
  };

  function blankStat() { return { m: 0, i: 0, no: 0, r: 0, b: 0, hs: 0, hsno: 0, c100: 0, c50: 0, d0: 0, f4: 0, f6: 0, bb: 0, rc: 0, w: 0, bbw: 0, bbr: 0, w5: 0, w10: 0, md: 0, ct: 0, st: 0 }; }
  W.blankStat = blankStat;
  W.updateStats = function (w, fx, m) {
    const key = m.F.stat;
    const ed = w.editions[fx.ed];
    const touched = new Map();
    const get = (pid) => {
      let o = touched.get(pid);
      if (!o) {
        const p = w.players[pid];
        p.stats[key] = p.stats[key] || blankStat();
        let es = null;
        if (ed) { ed.stats[pid] = ed.stats[pid] || blankStat(); es = ed.stats[pid]; }
        o = { p, c: p.stats[key], e: es, mw: 0, mr: 0 };
        touched.set(pid, o);
      }
      return o;
    };
    for (const s of m.sides) for (const p of s.xi) { const o = get(p.id); o.c.m++; if (o.e) o.e.m++; o.p.lastPlayed = w.date; }
    for (const inn of m.inns) {
      if (inn.so) continue;
      for (const c of inn.card) {
        const o = get(c.pid);
        for (const st of [o.c, o.e]) {
          if (!st) continue;
          st.i++; if (!c.out) st.no++; st.r += c.runs; st.b += c.balls; st.f4 += c.f4; st.f6 += c.f6;
          if (c.runs >= 100) st.c100++; else if (c.runs >= 50) st.c50++;
          if (c.runs === 0 && c.out) st.d0++;
          if (c.runs > st.hs || (c.runs === st.hs && !c.out)) { st.hs = c.runs; st.hsno = c.out ? 0 : 1; }
        }
        if (c.out && c.fielder != null && (c.how === 'caught' || c.how === 'caughtKeeper' || c.how === 'cb')) { const f = get(c.fielder); f.c.ct++; if (f.e) f.e.ct++; }
        if (c.out && c.how === 'stumped' && c.fielder != null) { const f = get(c.fielder); f.c.st++; if (f.e) f.e.st++; }
      }
      for (const pidS in inn.bw) {
        const b = inn.bw[pidS]; const o = get(+pidS);
        o.mw += b.wkts; o.mr += b.runs;
        for (const st of [o.c, o.e]) {
          if (!st) continue;
          st.bb += b.balls; st.rc += b.runs; st.w += b.wkts; st.md += b.maid;
          if (b.wkts >= 5) st.w5++;
          if (b.wkts > st.bbw || (b.wkts === st.bbw && b.runs < st.bbr)) { st.bbw = b.wkts; st.bbr = b.runs; }
        }
      }
    }
    if (!m.F.lo) for (const [, o] of touched) if (o.mw >= 10) { o.c.w10++; if (o.e) o.e.w10++; }
  };

  // form, fatigue, injuries
  W.updatePlayersAfter = function (w, fx, m) {
    const rng = W.rngFor(w, fx.id + 'inj');
    const lo = m.F.lo; const t20 = m.F.overs === 20;
    const perf = new Map();
    for (const inn of m.inns) {
      if (inn.so) continue;
      for (const c of inn.card) {
        let v = lo ? (c.runs - (t20 ? 18 : 28)) / (t20 ? 9 : 14) + (c.balls >= 8 ? (c.runs / c.balls - (t20 ? 1.3 : 0.9)) * (t20 ? 3 : 4) : 0) : (c.runs - 30) / 18;
        perf.set(c.pid, (perf.get(c.pid) || 0) + v);
      }
      for (const pidS in inn.bw) {
        const b = inn.bw[pidS];
        let v = b.wkts * (lo ? 1.6 : 1.1) - (lo ? 1.3 : 2.2);
        if (lo && b.balls >= 12) v += ((t20 ? 8.5 : 5.6) - b.runs * 6 / b.balls) * 0.45;
        perf.set(+pidS, (perf.get(+pidS) || 0) + v);
      }
    }
    for (const s of m.sides) for (const p of s.xi) {
      const v = U.clamp(perf.get(p.id) || -0.3, -4, 6);
      p.form = U.clamp((p.form || 0) * 0.78 + v * 0.9, -10, 10);
      p.formHist = (p.formHist || []).concat([Math.round(v * 10) / 10]).slice(-8);
      // workload
      let overs = 0;
      for (const inn of m.inns) if (inn.bw[p.id]) overs += inn.bw[p.id].balls / 6;
      const pace = SK.isPace(p.bowl);
      p.fatigue = U.clamp((p.fatigue || 0) + overs * (pace ? 0.9 : 0.4) + (lo ? 2 : 6), 0, 100);
      // injuries
      let ip = lo ? 0.0035 : 0.012;
      if (pace) ip += overs * (lo ? 0.0009 : 0.00035);
      ip *= 1 + Math.max(0, p.fatigue - 40) / 60;
      if (W.age(w, p) > 33) ip *= 1.3;
      if (rng() < ip) {
        const days = rng() < 0.6 ? rng.int(5, 18) : rng() < 0.8 ? rng.int(19, 45) : rng.int(46, 120);
        p.injury = days;
        const what = rng.pick(pace ? ['hamstring strain', 'side strain', 'back stiffness', 'ankle sprain', 'stress reaction in the back', 'groin strain'] : ['hamstring strain', 'finger fracture', 'calf strain', 'knee niggle', 'shoulder injury', 'concussion']);
        p.injuryNote = what;
        const mine = w.user && Object.values(p.teams).concat(W.natKey(p.cc)).includes(w.user.team);
        if (mine) W.mail(w, `Injury: ${p.name}`, `${p.name} has a ${what} and is expected to miss about ${Math.round(days / 7) || 1} week${days >= 14 ? 's' : ''}.`, 'injury', { pid: p.id });
      }
    }
  };
  W.dailyTick = function (w, days) {
    if (days <= 0) return;
    for (const p of w.players) {
      if (p.injury > 0) { p.injury = Math.max(0, p.injury - days); if (p.injury === 0) delete p.injuryNote; }
      if (p.fatigue > 0) p.fatigue = Math.max(0, p.fatigue - days * 1.8);
      if (p.form) p.form *= Math.pow(0.995, days);
    }
  };

  // ------------------------------------------------------------------ tables & competition flow
  W.nrrFor = function (row) {
    const rf = row.bf ? row.rf / (row.bf / 6) : 0; const ra = row.ba ? row.ra / (row.ba / 6) : 0;
    return rf - ra;
  };
  W.sortTable = function (ed, keys) {
    const t = ed.table;
    return (keys || Object.keys(t)).slice().sort((a, b) => (t[b].pts - t[a].pts) || (t[b].w - t[a].w) || (W.nrrFor(t[b]) - W.nrrFor(t[a])) || a.localeCompare(b));
  };
  function addToTable(w, ed, fx, m) {
    const T = ed.table; const [h, a] = [fx.home, fx.away];
    if (!T[h] || !T[a]) return;
    const res = fx.result; const lo = m.F.lo;
    T[h].p++; T[a].p++;
    if (lo) {
      // NRR: all out => full overs
      const maxB = m.F.overs * m.F.bpo;
      for (const inn of m.inns) {
        if (inn.so) continue;
        const bat = [h, a][inn.bat], bowl = [h, a][inn.bowl];
        const balls = inn.allOut ? maxB : inn.balls;
        T[bat].rf += inn.runs; T[bat].bf += balls; T[bowl].ra += inn.runs; T[bowl].ba += balls;
      }
      if (res.winner) { T[res.winner].w++; T[res.winner].pts += 2; T[res.winner === h ? a : h].l++; }
      else if (res.kind === 'tie') { T[h].t++; T[a].t++; T[h].pts++; T[a].pts++; }
      else { T[h].nr++; T[a].nr++; T[h].pts++; T[a].pts++; }
    } else {
      const county = ed.comp === 'CC1' || ed.comp === 'CC2';
      const winPts = county ? 16 : 6, drawPts = county ? 8 : 1;
      if (res.winner) { T[res.winner].w++; T[res.winner].pts += winPts; T[res.winner === h ? a : h].l++; }
      else if (res.kind === 'tie') { T[h].t++; T[a].t++; T[h].pts += winPts / 2; T[a].pts += winPts / 2; }
      else { T[h].d++; T[a].d++; T[h].pts += drawPts; T[a].pts += drawPts; }
      // bonus points from first innings
      for (const inn of m.inns.slice(0, 2)) {
        const bat = [h, a][inn.bat], bowl = [h, a][inn.bowl];
        let bat_b, bowl_b;
        if (county) { bat_b = U.clamp(Math.floor((inn.runs - 200) / 50), 0, 5); bowl_b = U.clamp(Math.floor(inn.wkts / 3), 0, 3); }
        else { bat_b = U.clamp(Math.round((inn.runs - 200) * 0.01 * 10) / 10, 0, 3); bowl_b = U.clamp(inn.wkts * 0.1, 0, 1); }
        T[bat].pts += bat_b; T[bat].bon += bat_b; T[bowl].pts += bowl_b; T[bowl].bon += bowl_b;
      }
      T[h].pts = Math.round(T[h].pts * 100) / 100; T[a].pts = Math.round(T[a].pts * 100) / 100;
    }
  }
  W.updateCompetition = function (w, ed, fx, m) {
    if (ed.status === 'scheduled') ed.status = 'live';
    if (ed.type === 'league') {
      if (fx.stage === 'league') addToTable(w, ed, fx, m);
      W.progressLeague(w, ed);
    } else if (ed.type === 'series') {
      const leg = ed.legs[fx.leg];
      if (fx.result.winner) leg.score[fx.result.winner]++; else leg.score.d++;
      if (leg.fixtures.every(id => w.fx[id].status === 'done')) {
        leg.done = true;
        const [h, g] = ed.teams; const sh = leg.score[h], sg = leg.score[g];
        const fname = leg.fmt === 'TEST' ? 'Test' : leg.fmt === 'ODI' ? 'ODI' : 'T20I';
        const txt = sh === sg ? `${fname} series drawn ${sh}-${sg}` : `${w.teams[sh > sg ? h : g].name} win the ${fname} series ${Math.max(sh, sg)}-${Math.min(sh, sg)}`;
        leg.text = txt;
        W.addNews(w, `${ed.name}: ${txt}.`, 'series');
        if (w.user && ed.teams.includes(w.user.team) && W.onUserSeriesLeg) W.onUserSeriesLeg(w, ed, leg);
      }
      if (ed.legs.every(l => l.done)) { ed.status = 'done'; if (W.onEditionDone) W.onEditionDone(w, ed); }
    } else if (ed.type === 'icc') {
      if (/^Group|^Super/.test(fx.stage)) addToTable(w, ed, fx, m);
      W.progressICC(w, ed);
    }
  };
  W.progressLeague = function (w, ed) {
    const fxs = ed.fixtures.map(id => w.fx[id]);
    const pending = fxs.filter(f => f.status !== 'done');
    if (pending.length) return;
    const table = W.sortTable(ed);
    const last = fxs.reduce((a, f) => Math.max(a, f.date), 0);
    const venueOf = (k) => W.venueOf(w, k);
    const mk = (stage, h, a, date) => { const f = W.newFixture(w, { ed: ed.id, comp: ed.comp, date, fmt: ed.fmt, home: h, away: a, venue: venueOf(h), stage, ko: true }); ed.fixtures.push(f.id); return f; };
    const res = (stage) => fxs.find(f => f.stage === stage);
    const win = (f) => f.result.winner || (f.result.kind === 'draw' || f.result.kind === 'tie' ? f.home : f.home);
    const lose = (f) => (win(f) === f.home ? f.away : f.home);
    if (ed.playoff === 'ipl4') {
      if (ed.stage === 'league') { ed.stage = 'playoffs'; mk('Q1', table[0], table[1], last + 2); mk('E', table[2], table[3], last + 3); return; }
      const q1 = res('Q1'), e = res('E'), q2 = res('Q2'), f = res('F');
      if (q1 && e && !q2) { mk('Q2', lose(q1), win(e), last + 2); return; }
      if (q2 && !f) { mk('F', win(q1), win(q2), last + 2); return; }
      if (f) return W.finishEdition(w, ed, win(f), lose(f));
    } else if (ed.playoff === 'top3') {
      if (ed.stage === 'league') { ed.stage = 'playoffs'; mk('E', table[1], table[2], last + 2); return; }
      const e = res('E'), f = res('F');
      if (e && !f) { mk('F', table[0], win(e), last + 2); return; }
      if (f) return W.finishEdition(w, ed, win(f), lose(f));
    } else if (ed.playoff === 'final2') {
      if (ed.stage === 'league') { ed.stage = 'final'; const ff = mk('F', table[0], table[1], last + 7); ff.fmt = 'TEST'; ff.shieldFinal = true; return; }
      const f = res('F');
      if (f) { const wn = f.result.winner || table[0]; return W.finishEdition(w, ed, wn, wn === f.home ? f.away : f.home); }
    } else {
      return W.finishEdition(w, ed, table[0], table[1]);
    }
  };
  W.progressICC = function (w, ed) {
    const fxs = ed.fixtures.map(id => w.fx[id]);
    if (fxs.some(f => f.status !== 'done')) return;
    const last = fxs.reduce((a, f) => Math.max(a, f.date), 0);
    const rng = W.rngFor(w, ed.id + ed.stage);
    const host = ed.host.split(':')[1] === 'SCOT' ? 'SCO' : ed.host.split(':')[1];
    const mk = (stage, h, a, date) => { const f = W.newFixture(w, { ed: ed.id, comp: 'ICC', date, fmt: ed.fmt, home: h, away: a, venue: W.natVenue(w, host, rng), stage, ko: stage === 'SF' || stage === 'F', neutral: true }); ed.fixtures.push(f.id); return f; };
    const win = (f) => f.result.winner || f.home; const lose = (f) => (win(f) === f.home ? f.away : f.home);
    if (ed.icc === 'WTCF') { const f = fxs[0]; const r = f.result; if (!r.winner) { ed.shared = [f.home, f.away]; W.finishEdition(w, ed, null, null, `${w.teams[f.home].name} and ${w.teams[f.away].name} share the title after a draw`); } else W.finishEdition(w, ed, r.winner, lose(f)); return; }
    if (ed.stage === 'group') {
      const qual = [];
      const perGroup = ed.icc === 'ODIWC' ? 3 : 2;
      for (const g of ed.groups) { g.order = W.sortTable(ed, g.teams); qual.push(g.order.slice(0, perGroup)); }
      if (ed.icc === 'T20WC') {
        // Super 8: two groups of 4: A1 B2 C1 D2 / B1 A2 D1 C2
        const s1 = [qual[0][0], qual[1][1], qual[2][0], qual[3][1]], s2 = [qual[1][0], qual[0][1], qual[3][0], qual[2][1]];
        ed.stage = 'super'; ed.super = [{ name: 'Super 8 Group 1', teams: s1 }, { name: 'Super 8 Group 2', teams: s2 }];
        for (const k of s1.concat(s2)) ed.table['S:' + k] = { p: 0, w: 0, l: 0, t: 0, d: 0, nr: 0, pts: 0, rf: 0, bf: 0, ra: 0, ba: 0 };
        let day = last + 2, today = 0;
        for (const g of ed.super) for (const round of W.roundRobin(g.teams, 3, rng)) for (const pair of round) { if (today >= 2) { day++; today = 0; } today++; mk('Super 8', pair[0], pair[1], day); }
        return;
      }
      if (ed.icc === 'ODIWC') {
        const six = qual[0].concat(qual[1]);
        ed.stage = 'super'; ed.super = [{ name: 'Super Six', teams: six }];
        for (const k of six) ed.table['S:' + k] = { p: 0, w: 0, l: 0, t: 0, d: 0, nr: 0, pts: 0, rf: 0, bf: 0, ra: 0, ba: 0 };
        let day = last + 2, today = 0;
        for (const a of qual[0]) for (const b of qual[1]) { if (today >= 2) { day++; today = 0; } today++; mk('Super Six', a, b, day); }
        return;
      }
      // CT: straight to semis
      ed.stage = 'semis';
      mk('SF', qual[0][0], qual[1][1], last + 3); mk('SF', qual[1][0], qual[0][1], last + 4);
      return;
    }
    if (ed.stage === 'super') {
      const superFx = fxs.filter(f => f.stage === 'Super 8' || f.stage === 'Super Six');
      if (!ed.superScored) {
        // build super tables from super fixtures
        for (const f of superFx) {
          const T = ed.table; const h = 'S:' + f.home, a = 'S:' + f.away; const r = f.result;
          T[h].p++; T[a].p++;
          for (const inn of r.inns) { const bat = 'S:' + inn.team, bowl = inn.team === f.home ? a : h; const maxB = (ed.fmt === 'T20' ? 120 : 300); const balls = inn.wkts >= 10 ? maxB : inn.balls; T[bat].rf += inn.runs; T[bat].bf += balls; T[bowl].ra += inn.runs; T[bowl].ba += balls; }
          if (r.winner) { T['S:' + r.winner].w++; T['S:' + r.winner].pts += 2; T[r.winner === f.home ? a : h].l++; } else { T[h].pts++; T[a].pts++; T[h].t++; T[a].t++; }
        }
        ed.superScored = true;
      }
      let semis = [];
      if (ed.icc === 'T20WC') {
        const g1 = W.sortTable(ed, ed.super[0].teams.map(k => 'S:' + k)).map(k => k.slice(2));
        const g2 = W.sortTable(ed, ed.super[1].teams.map(k => 'S:' + k)).map(k => k.slice(2));
        ed.super[0].order = g1; ed.super[1].order = g2;
        semis = [[g1[0], g2[1]], [g2[0], g1[1]]];
      } else {
        const g = W.sortTable(ed, ed.super[0].teams.map(k => 'S:' + k)).map(k => k.slice(2));
        ed.super[0].order = g;
        semis = [[g[0], g[3]], [g[1], g[2]]];
      }
      ed.stage = 'semis';
      mk('SF', semis[0][0], semis[0][1], last + 3); mk('SF', semis[1][0], semis[1][1], last + 4);
      return;
    }
    if (ed.stage === 'semis') {
      const sfs = fxs.filter(f => f.stage === 'SF');
      ed.stage = 'final';
      mk('F', win(sfs[0]), win(sfs[1]), last + 3);
      return;
    }
    if (ed.stage === 'final') {
      const f = fxs.find(x => x.stage === 'F');
      W.finishEdition(w, ed, win(f), lose(f));
    }
  };

  W.leaderboards = function (w, ed, n) {
    n = n || 10;
    const rows = Object.entries(ed.stats).map(([pid, s]) => ({ pid: +pid, s }));
    const runs = rows.filter(r => r.s.r > 0).sort((a, b) => b.s.r - a.s.r).slice(0, n);
    const wkts = rows.filter(r => r.s.w > 0).sort((a, b) => (b.s.w - a.s.w) || (a.s.rc - b.s.rc)).slice(0, n);
    const lo = ed.fmt !== 'FC4' && ed.fmt !== 'TEST';
    const minB = lo ? 60 : 300;
    const sr = rows.filter(r => r.s.b >= minB).sort((a, b) => (b.s.r / b.s.b) - (a.s.r / a.s.b)).slice(0, n);
    const econ = rows.filter(r => r.s.bb >= (lo ? 60 : 600)).sort((a, b) => (a.s.rc / a.s.bb) - (b.s.rc / b.s.bb)).slice(0, n);
    const sixes = rows.filter(r => r.s.f6 > 0).sort((a, b) => b.s.f6 - a.s.f6).slice(0, n);
    const mvp = rows.map(r => ({ pid: r.pid, s: r.s, v: r.s.r + r.s.w * (lo ? 22 : 20) + (r.s.ct + r.s.st) * 6 })).sort((a, b) => b.v - a.v).slice(0, n);
    return { runs, wkts, sr, econ, sixes, mvp };
  };
  W.finishEdition = function (w, ed, champ, runner, customText) {
    ed.status = 'done'; ed.champion = champ; ed.runnerUp = runner;
    const lb = W.leaderboards(w, ed, 3);
    ed.awards = { topRuns: lb.runs[0] ? { pid: lb.runs[0].pid, v: lb.runs[0].s.r } : null, topWkts: lb.wkts[0] ? { pid: lb.wkts[0].pid, v: lb.wkts[0].s.w } : null, mvp: lb.mvp[0] ? { pid: lb.mvp[0].pid } : null };
    const label = ed.comp === 'ICC' ? ed.icc : ed.comp;
    (w.history[label] = w.history[label] || []).push({ season: ed.season, name: ed.name, champion: champ, runnerUp: runner, top: ed.awards });
    const txt = customText || (champ ? `${w.teams[champ].name} are ${ed.name} champions${runner ? `, beating ${w.teams[runner].name}` : ''}!` : `${ed.name} complete.`);
    W.addNews(w, txt + (ed.awards.topRuns ? ` Top run-scorer: ${w.players[ed.awards.topRuns.pid].name} (${ed.awards.topRuns.v}).` : '') + (ed.awards.topWkts ? ` Top wicket-taker: ${w.players[ed.awards.topWkts.pid].name} (${ed.awards.topWkts.v}).` : ''), 'champion', { ed: ed.id });
    if (champ && w.teams[champ]) w.teams[champ].rep = Math.min(99, w.teams[champ].rep + 3);
    if (ed.comp === 'CC1' || ed.comp === 'CC2') W.countyPromotion(w, ed);
    if (W.onEditionDone) W.onEditionDone(w, ed);
  };
  W.countyPromotion = function (w, ed) {
    const a = w.editions[`CC1-${ed.season}`], b = w.editions[`CC2-${ed.season}`];
    if (!a || !b || a.status !== 'done' || b.status !== 'done' || a.promoDone) return;
    a.promoDone = true;
    const t1 = W.sortTable(a), t2 = W.sortTable(b);
    const down = t1.slice(-2), up = t2.slice(0, 2);
    const c1 = w.comps.CC1, c2 = w.comps.CC2;
    c1.teams = c1.teams.filter(k => !down.includes(k)).concat(up.map(k => k));
    c2.teams = c2.teams.filter(k => !up.includes(k)).concat(down);
    // re-key teams by moving the comp field while keeping their keys stable
    for (const k of up) { w.teams[k].comp = 'CC1'; }
    for (const k of down) { w.teams[k].comp = 'CC2'; }
    W.addNews(w, `County Championship: ${up.map(k => w.teams[k].name).join(' and ')} promoted; ${down.map(k => w.teams[k].name).join(' and ')} relegated.`, 'news');
  };

  // ------------------------------------------------------------------ rankings / WTC / records
  W.updateRanking = function (w, fx, m) {
    const fmt = fx.fmt === 'T20' ? 'T20I' : fx.fmt;
    const R0 = w.rank[fmt]; if (!R0) return;
    const a = fx.home, b = fx.away; const ra = R0[a] || 1500, rb = R0[b] || 1500;
    const exp = 1 / (1 + Math.pow(10, (rb - ra) / 400));
    const sc = fx.result.winner === a ? 1 : fx.result.winner === b ? 0 : 0.5;
    const K = fmt === 'TEST' ? 26 : 18;
    R0[a] = Math.round(ra + K * (sc - exp)); R0[b] = Math.round(rb - K * (sc - exp));
  };
  W.updateWTC = function (w, fx) {
    const T = w.wtc.table; const a = fx.home, b = fx.away;
    if (!WTC_NATIONS.includes(W.ccOfNat(a)) || !WTC_NATIONS.includes(W.ccOfNat(b))) return;
    for (const k of [a, b]) T[k] = T[k] || { p: 0, w: 0, l: 0, d: 0, pts: 0, t: 0 };
    T[a].p++; T[b].p++;
    const wn = fx.result.winner;
    if (wn) { T[wn].w++; T[wn].pts += 12; T[wn === a ? b : a].l++; }
    else if (fx.result.kind === 'tie') { T[a].t++; T[b].t++; T[a].pts += 6; T[b].pts += 6; }
    else { T[a].d++; T[b].d++; T[a].pts += 4; T[b].pts += 4; }
  };
  W.wtcStandings = function (w) {
    return Object.entries(w.wtc.table).map(([key, r]) => ({ key, r, pct: r.p ? r.pts * 100 / (r.p * 12) : 0 })).sort((x, y) => y.pct - x.pct);
  };
  W.resetWTC = function (w, season) {
    w.wtc = { cycle: `${season}-${String(season + 2).slice(2)}`, table: {}, finalSeason: season + 2 };
    for (const cc of WTC_NATIONS) w.wtc.table[W.natKey(cc)] = { p: 0, w: 0, l: 0, d: 0, pts: 0, t: 0 };
  };
  W.updateRecords = function (w, fx, m) {
    const key = m.F.stat; const rec = w.records[key];
    rec.hs = rec.hs || []; rec.bb = rec.bb || []; rec.tt = rec.tt || []; rec.lt = rec.lt || [];
    const ed = w.editions[fx.ed]; const where = ed ? ed.name : '';
    const keys = [fx.home, fx.away];
    for (const inn of m.inns) {
      if (inn.so) continue;
      rec.tt.push({ v: inn.runs, w: inn.wkts, t: keys[inn.bat], vs: keys[inn.bowl], d: w.date, ev: where, dec: inn.declared });
      if (inn.allOut) rec.lt.push({ v: inn.runs, t: keys[inn.bat], vs: keys[inn.bowl], d: w.date, ev: where });
      for (const c of inn.card) if (c.runs >= (m.F.lo ? 50 : 100)) rec.hs.push({ v: c.runs, no: !c.out, b: c.balls, pid: c.pid, t: keys[inn.bat], vs: keys[inn.bowl], d: w.date, ev: where });
      for (const pid in inn.bw) { const b = inn.bw[pid]; if (b.wkts >= (m.F.lo ? 4 : 5)) rec.bb.push({ w: b.wkts, r: b.runs, pid: +pid, t: keys[inn.bowl], vs: keys[inn.bat], d: w.date, ev: where }); }
    }
    rec.hs.sort((a, b) => b.v - a.v || a.b - b.b); rec.hs.length = Math.min(rec.hs.length, 15);
    rec.bb.sort((a, b) => b.w - a.w || a.r - b.r); rec.bb.length = Math.min(rec.bb.length, 15);
    rec.tt.sort((a, b) => b.v - a.v); rec.tt.length = Math.min(rec.tt.length, 15);
    rec.lt.sort((a, b) => a.v - b.v); rec.lt.length = Math.min(rec.lt.length, 15);
  };

  // ------------------------------------------------------------------ events
  W.runEvent = function (w, ev) {
    switch (ev.type) {
      case 'edStart': { const ed = w.editions[ev.ed]; if (ed && ed.status === 'scheduled') { ed.status = 'live'; W.topUpSquads(w, ed); if (W.onEditionStart) W.onEditionStart(w, ed); } break; }
      case 'seriesStart': {
        const ed = w.editions[ev.ed];
        for (const k of ed.teams) {
          ed.squads[k] = ed.squads[k] || {};
          for (const leg of ed.legs) {
            const fk = leg.fmt;
            if (!ed.squads[k][fk] && (!(w.user && w.user.team === k) || (w.user.onlyEd && w.user.onlyEd !== ed.id))) ed.squads[k][fk] = W.selectNationalSquad(w, k, fk, leg.fmt === 'TEST' ? 16 : 15);
          }
        }
        W.assignDuty(w, ed);
        if (W.onEditionStart) W.onEditionStart(w, ed);
        break;
      }
      case 'iccCreate': {
        const ed = W.createICC(w, ev);
        for (const k of ed.teams) if (!(w.user && w.user.team === k)) { ed.squads[k] = { [ed.fmt]: W.selectNationalSquad(w, k, ed.fmt, 15) }; }
        W.assignDuty(w, ed);
        if (W.onEditionStart) W.onEditionStart(w, ed);
        break;
      }
      case 'retention': SK.Auction && SK.Auction.retentionAI(w, ev.comp, ev.season); break;
      case 'auction': SK.Auction && SK.Auction.runAI(w, ev.comp, ev.season); break;
      case 'seasonEnd': W.seasonRollover(w, ev.season); break;
      default: break;
    }
    ev.done = true;
  };
  // does this queue item need the user?
  W.needsUser = function (w, item) {
    if (!w.user || !w.user.team) return null;
    const ut = w.user.team;
    if (item.kind === 'fx') {
      const fx = w.fx[item.id];
      if (fx.status === 'done') return null;
      if (w.user.onlyEd && fx.ed !== w.user.onlyEd) return null;
      if (fx.home === ut || fx.away === ut) {
        const ed = w.editions[fx.ed];
        if (ed && ed.type === 'icc' && W.isNat(ut) && !(ed.squads[ut] && ed.squads[ut][ed.fmt])) return { type: 'squad', fx, ed, ev: null };
        return { type: 'match', fx };
      }
      return null;
    }
    const ev = W.getEvent(w, item.id);
    if (!ev || ev.done) return null;
    if (w.user.onlyEd && ev.ed !== w.user.onlyEd) return null;
    const team = w.teams[ut];
    if ((ev.type === 'auction' || ev.type === 'retention') && team.comp === ev.comp && w.settings.auctions) return { type: ev.type, ev };
    if (ev.type === 'seriesStart') { const ed = w.editions[ev.ed]; if (ed.teams.includes(ut)) return { type: 'squad', ev, ed }; }
    if (ev.type === 'iccCreate') return null;
    return null;
  };
  // Advance the world. Stops when the user is needed, at `until` (day), or after `budgetMs`.
  W.advance = function (w, opts) {
    opts = opts || {};
    const t0 = Date.now(); const budget = opts.budgetMs || 60; let simmed = 0;
    while (w.queue.length) {
      const item = w.queue[0];
      if (opts.until != null && item.date > opts.until) { W.dailyTick(w, opts.until - w.date); w.date = Math.max(w.date, opts.until); return { stop: 'until', simmed }; }
      const need = W.needsUser(w, item);
      if (need && !opts.ignoreUser) {
        if (item.date > w.date) { W.dailyTick(w, item.date - w.date); w.date = item.date; }
        if (need.type === 'squad' && need.ev && need.ed.squads[w.user.team] && need.ed.legs.every(l => need.ed.squads[w.user.team][l.fmt])) { /* already chosen */ }
        else return Object.assign({ stop: 'user', simmed }, need);
        if (need.type === 'squad') { w.queue.shift(); W.runEvent(w, need.ev); continue; }
      }
      w.queue.shift();
      if (item.date > w.date) { W.dailyTick(w, item.date - w.date); w.date = item.date; }
      if (item.kind === 'fx') {
        const fx = w.fx[item.id];
        if (fx.status !== 'done') {
          if (!fx.home || !fx.away) continue;
          W.simFixture(w, fx); simmed++;
        }
      } else {
        const ev = W.getEvent(w, item.id);
        if (ev && !ev.done) W.runEvent(w, ev);
      }
      if (Date.now() - t0 > budget) return { stop: 'budget', simmed };
      if (opts.stopAfter && simmed >= opts.stopAfter) return { stop: 'count', simmed };
    }
    return { stop: 'empty', simmed };
  };
  // the next thing that will stop the calendar for the user (match, auction, squad pick...)
  W.peekNextStop = function (w) {
    for (const item of w.queue) { const need = W.needsUser(w, item); if (need) return Object.assign({ date: item.date }, need); }
    return null;
  };
  W.peekNext = function (w) {
    for (const item of w.queue) {
      if (item.kind === 'fx') { const fx = w.fx[item.id]; if (fx.status !== 'done' && w.user && (fx.home === w.user.team || fx.away === w.user.team)) return fx; }
    }
    return null;
  };
  W.userFixtures = function (w, teamKey) {
    teamKey = teamKey || (w.user && w.user.team);
    return Object.values(w.fx).filter(f => f.home === teamKey || f.away === teamKey).sort((a, b) => a.date - b.date);
  };

  // ------------------------------------------------------------------ season rollover
  W.seasonRollover = function (w, season) {
    const rng = W.rngFor(w, 'roll' + season);
    const year = season; // ages are computed from calendar year; this runs on 30 Sep
    const retired = [];
    for (const p of w.players) {
      if (p.retired) continue;
      const age = year - p.yob;
      W.developPlayer(w, p, age, rng);
      // retirement
      let pr = 0;
      if (age >= 33) pr = 0.04 + (age - 33) * 0.06;
      if (age >= 38) pr += 0.15;
      if (age >= 41) pr = 0.85;
      const best = Math.max(R.overall(p, 'T20'), R.overall(p, 'ODI'), R.overall(p, 'TEST'));
      if (best < 55 && age >= 31) pr += 0.15;
      if (p.gen && age >= 30 && best < 52) pr += 0.3;
      if (rng() < pr) { W.retirePlayer(w, p, season); retired.push(p); continue; }
      // international format retirements
      if (!p.ret.X && age >= 34) {
        if (!p.ret.I && rng() < 0.18) { p.ret.I = 1; }
        if (!p.ret.T && rng() < (age >= 36 ? 0.3 : 0.12)) { p.ret.T = 1; }
        if (!p.ret.O && age >= 36 && rng() < 0.15) { p.ret.O = 1; }
        if (p.ret.T && p.ret.O && p.ret.I) p.ret.X = 1;
      }
    }
    if (retired.length) {
      const notable = retired.filter(p => Math.max(R.overall(p, 'T20'), R.overall(p, 'TEST')) >= 72).slice(0, 6);
      if (notable.length) W.addNews(w, `Retirements: ${notable.map(p => p.name).join(', ')}${retired.length > notable.length ? ` and ${retired.length - notable.length} others` : ''} have retired.`, 'news');
    }
    W.generateRegens(w, season + 1, rng);
    W.domesticSquads(w, rng);
    // WTC cycle reset after the final season
    if (w.wtc.finalSeason && season >= w.wtc.finalSeason) W.resetWTC(w, season);
    if (W.onSeasonEnd) W.onSeasonEnd(w, season);
    W.scheduleSeason(w, season + 1, w.date + 1);
    w.seasonsDone++;
    // prune old fixtures (keep last 2 seasons)
    W.prune(w, season - 1);
  };
  W.developPlayer = function (w, p, age, rng) {
    const formBoost = U.clamp((p.form || 0) / 6, -1, 1);
    let d;
    if (age <= 20) d = 2.5 + rng() * 4; else if (age <= 23) d = 1 + rng() * 3.5; else if (age <= 26) d = -0.5 + rng() * 2.5; else if (age <= 30) d = -1.2 + rng() * 2.2;
    else if (age <= 33) d = -2.2 + rng() * 1.8; else if (age <= 36) d = -3.5 + rng() * 2; else d = -5 + rng() * 2;
    d += formBoost * 0.8;
    const cap = p.pot || 80;
    const grow = (v, weight) => {
      let nv = v + d * weight + (rng() - 0.5) * 1.2;
      if (d > 0 && nv > cap + 4) nv = Math.max(v, cap + 4 - rng() * 2);
      return Math.round(U.clamp(nv, 1, 99));
    };
    const old = { bt: p.bt, bp: p.bp, bw: p.bw, be: p.be };
    if (p.role !== 'BWL') { p.bt = grow(p.bt, 1); p.bp = grow(p.bp, 0.9); } else { p.bt = grow(p.bt, 0.4); p.bp = grow(p.bp, 0.4); }
    if (p.bowl !== '-') { const wgt = p.role === 'BAT' || p.role === 'WK' ? 0.4 : 1; p.bw = grow(p.bw, wgt); p.be = grow(p.be, wgt); }
    p.fd = Math.round(U.clamp(p.fd + (age <= 28 ? rng() * 1.2 : -rng() * 1.5), 30, 95));
    p.hist = (p.hist || []).concat([{ y: w.date, bt: old.bt, bp: old.bp, bw: old.bw, be: old.be }]).slice(-12);
    p.form = (p.form || 0) * 0.4;
  };
  W.retirePlayer = function (w, p, season) {
    p.retired = season; p.ret.X = 1;
    for (const c of Object.keys(p.teams)) {
      const k = p.teams[c]; const t = w.teams[k];
      if (t) { t.squad = t.squad.filter(id => id !== p.id); if (t.cap === p.id) t.cap = null; }
    }
    p.teams = {};
    if (w.user && W.isUserPlayer(w, p)) W.mail(w, `${p.name} retires`, `${p.name} has announced his retirement from professional cricket.`, 'news', { pid: p.id });
  };
  W.isUserPlayer = function (w, p) {
    if (!w.user || !w.user.team) return false;
    const ut = w.user.team;
    if (W.isNat(ut)) return W.natKey(p.cc) === ut;
    return Object.values(p.teams).includes(ut);
  };
  const REGEN_N = { IND: 24, ENG: 20, AUS: 15, PAK: 15, SA: 11, NZ: 8, SL: 9, WI: 10, BAN: 9, AFG: 7, IRE: 3, ZIM: 4, NED: 2, SCO: 2, NEP: 2, USA: 3, UAE: 3, NAM: 1, OMA: 1, CAN: 1, ITA: 1 };
  W.generateRegens = function (w, year, rng) {
    const taken = new Set(w.players.map(p => p.name));
    for (const [cc, n] of Object.entries(REGEN_N)) {
      for (let i = 0; i < n; i++) {
        const role = rng.pick(['BAT', 'BAT', 'BAT', 'WK', 'AR', 'AR', 'BWL', 'BWL', 'BWL', 'BWL']);
        const name = SK.makeName(cc, rng, taken); taken.add(name);
        const age = rng.int(17, 20);
        const pot = Math.round(U.clamp(58 + rng.normal() * 9 + (cc === 'IND' || cc === 'AUS' || cc === 'ENG' ? 3 : 0), 45, 94));
        const lvl = pot - rng.int(14, 26);
        const bowl = role === 'BAT' || role === 'WK' ? (rng() < 0.4 ? rng.pick(['OB', 'LB', 'RM']) : '-') : rng.pick(['RFM', 'RFM', 'RF', 'LFM', 'RM', 'OB', 'LB', 'SLA', 'LWS']);
        const hand = rng() < 0.7 ? 'R' : 'L';
        const pace = U.clamp(lvl, 25, 80);
        let bt, bp, bw, be, fd = rng.int(55, 75);
        if (role === 'BAT') { bt = pace + rng.int(-3, 3); bp = pace + rng.int(-6, 8); bw = bowl === '-' ? 0 : rng.int(20, 35); be = bowl === '-' ? 0 : rng.int(20, 35); }
        else if (role === 'WK') { bt = pace - 3 + rng.int(-3, 3); bp = pace + rng.int(-6, 6); bw = 0; be = 0; fd = U.clamp(pace + rng.int(0, 8), 45, 85); }
        else if (role === 'AR') { bt = pace - 6 + rng.int(-4, 4); bp = pace - 2 + rng.int(-6, 6); bw = pace - 4 + rng.int(-4, 4); be = pace - 6 + rng.int(-4, 4); }
        else { bt = rng.int(8, 30); bp = rng.int(12, 40); bw = pace + rng.int(-3, 4); be = pace - 3 + rng.int(-4, 4); }
        const p = { id: w.players.length, name, cc, yob: year - age, hand, bowl, role, bt, bp, bw, be, fd, ret: {}, loc: [], gen: true, regen: true, pot, form: 0, fatigue: 0, injury: 0, fit: 100, stats: {}, ss: {}, teams: {}, hist: [] };
        w.players.push(p);
      }
    }
  };
  // keep domestic first-class squads topped up with the best available local players
  W.domesticSquads = function (w, rng) {
    const groups = [['CC', ['CC1', 'CC2'], 'ENG', 18, 26], ['SHF', ['SHF'], 'AUS', 18, 26]];
    for (const [regKey, compIds, cc, minSq, maxSq] of groups) {
      const teamKeys = compIds.flatMap(c => w.comps[c].teams);
      const free = () => w.players.filter(p => !p.retired && (p.cc === cc || (p.loc || []).includes(cc) || (cc === 'ENG' && (p.cc === 'SCO' || p.cc === 'IRE'))) && !teamKeys.some(k => w.teams[k].squad.includes(p.id)));
      let pool = free().sort(U.by(p => R.overall(p, 'FC4') + (W.age(w, p) < 23 ? (p.pot - R.overall(p, 'FC4')) * 0.4 : 0), true));
      for (const k of rng.shuffle(teamKeys.slice())) {
        const t = w.teams[k];
        if (w.user && w.user.team === k) continue;
        while (t.squad.length < minSq && pool.length) {
          const p = pool.shift();
          t.squad.push(p.id); p.teams[regKey] = k; if (regKey === 'CC') { p.teams[t.comp] = k; }
        }
        // young academy prospects
        const kids = pool.filter(p => p.regen && W.age(w, p) <= 20).slice(0, 1);
        for (const p of kids) if (t.squad.length < maxSq) { t.squad.push(p.id); p.teams[regKey] = k; if (regKey === 'CC') p.teams[t.comp] = k; pool = pool.filter(x => x !== p); }
      }
    }
  };
  W.prune = function (w, keepFromSeason) {
    const dead = new Set();
    for (const id in w.editions) { const ed = w.editions[id]; if (ed.season < keepFromSeason && ed.status === 'done') { for (const f of ed.fixtures) dead.add(f); ed.fixtures = []; ed.stats = {}; ed.pruned = true; } }
    for (const f of dead) delete w.fx[f];
    w.agenda = w.agenda.filter(e => !e.done || e.date > w.date - 60);
  };

  // ------------------------------------------------------------------ user / career basics (more in career.js)
  W.setUser = function (w, teamKey, manager, opts) {
    w.user = Object.assign(w.user || {}, { name: manager, team: teamKey, rep: Math.max(25, Math.min(80, w.teams[teamKey].rep - 5)), started: w.date, history: [], conf: 60, offers: [], sacked: false, manual: { bowl: true, field: false, bat: false } }, opts && opts.userExtra || {});
    if (SK.Career && SK.Career.onNewJob) SK.Career.onNewJob(w, teamKey, true);
  };
  W.compOfTeam = (w, key) => w.teams[key].comp;
})(typeof window !== 'undefined' ? window : globalThis);
