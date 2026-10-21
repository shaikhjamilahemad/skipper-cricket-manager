/* Skipper — franchise retentions and auctions (AI + interactive) */
(function (G) {
  'use strict';
  const SK = G.SK = G.SK || {};
  const U = SK.U, R = SK.R, DB = SK.DB, W = SK.World;
  const A = SK.Auction = {};

  A.fmtOf = (comp) => (comp.fmt === '100' ? 'HUN' : 'T20');
  A.value = function (w, p, comp) {
    const fmt = A.fmtOf(comp);
    const age = W.age(w, p);
    let v = R.overall(p, fmt) + (p.form || 0) * 0.35;
    if (age < 24) v += Math.max(0, (p.pot || 0) - R.overall(p, fmt)) * 0.18;
    if (age > 33) v -= (age - 33) * 1.2;
    if (p.injury > 30) v -= 4;
    // bowlers whose bowling is their skill: value by bowling
    return v;
  };
  A.share = (v) => (v <= 62 ? 0.0024 : U.clamp(0.0024 + 3.7e-5 * Math.pow(v - 62, 2.58), 0.0024, 0.24));
  A.price = (w, p, comp) => comp.purse * A.share(A.value(w, p, comp));
  A.base = (comp) => comp.purse * 0.0024;
  A.round = (comp, x) => { const b = A.base(comp); const step = b / 6; return Math.max(b, Math.round(x / step) * step); };
  A.inc = (comp, cur) => { const b = A.base(comp); if (cur < b * 3.4) return b / 6; if (cur < b * 6.7) return b / 3; if (cur < b * 16.7) return b * 2 / 3; return b * 5 / 6; };
  A.squadMin = (comp) => (comp.id === 'IPL' ? 18 : comp.id === 'HUN' ? 15 : 16);
  A.isOS = (p, comp) => DB.isOverseasFor(p, comp.home);
  A.leagueCount = (p) => W.LEAGUES.filter(c => p.teams[c]).length;
  A.maxLeagues = (p) => (p.ret.X ? 6 : (p.ret.WB || p.ret.T) ? 4 : 2);
  A.eligible = function (w, p, comp) {
    if (p.retired) return false;
    if (p.cc === 'IND' && comp.id !== 'IPL' && !p.ret.X) return false; // Indian players only play the IPL
    if (comp.id === 'IPL' && (p.cc === 'PAK' || p.ret.NOIPL)) return false;
    if ((comp.id === 'PSL' && p.teams.IPL) || (comp.id === 'IPL' && p.teams.PSL)) return false; // overlapping windows
    const local = !A.isOS(p, comp);
    if (!local && A.leagueCount(p) >= A.maxLeagues(p)) return false;
    if (!local) {
      const fmt = A.fmtOf(comp);
      if (R.overall(p, fmt) < 60) return false; // overseas signings must be genuine quality
    }
    if (comp.id === 'ILT20' && local && p.cc !== 'UAE') return false;
    return true;
  };
  A.salaryOf = function (w, p, compId) { return p.sal && p.sal[compId] != null ? p.sal[compId] : null; };
  A.ensureSalaries = function (w, compId) {
    const comp = w.comps[compId];
    for (const k of comp.teams) {
      const t = w.teams[k];
      let total = 0;
      for (const id of t.squad) {
        const p = w.players[id]; p.sal = p.sal || {};
        if (p.sal[compId] == null) { const rng = W.rngFor(w, p.name + compId); p.sal[compId] = A.round(comp, A.price(w, p, comp) * (0.7 + rng() * 0.6)); }
        total += p.sal[compId];
      }
      // first time only: keep the books sane so every squad has some purse left for the auction
      const maxSpend = comp.purse * 0.74;
      if (!comp.salInit && total > maxSpend) { const f = maxSpend / total; for (const id of t.squad) { const p = w.players[id]; p.sal[compId] = A.round(comp, p.sal[compId] * f); } total = U.sum(t.squad, id => w.players[id].sal[compId]); }
      t.purse = Math.max(0, Math.round((comp.purse - total) * 100) / 100);
    }
    comp.salInit = true;
  };
  A.megaYear = (season) => season >= 2028 && (season - 2028) % 3 === 0;

  // AI teams release weak / old / expensive players
  A.releaseList = function (w, t, comp, season) {
    const mega = comp.id === 'IPL' && A.megaYear(season);
    const ps = t.squad.map(id => w.players[id]);
    const scored = ps.map(p => ({ p, v: A.value(w, p, comp), sal: A.salaryOf(w, p, comp.id) || 0 }));
    scored.sort((a, b) => b.v - a.v);
    const release = [];
    if (mega) {
      // retain top 5 (max 2 overseas), release the rest
      let os = 0, kept = 0;
      for (const s of scored) {
        const keep = kept < 5 && (!A.isOS(s.p, comp) || os < 2) && s.v >= 68;
        if (keep) { kept++; if (A.isOS(s.p, comp)) os++; } else release.push(s.p);
      }
      return release;
    }
    const n = scored.length;
    const minKeep = Math.max(A.squadMin(comp) - 3, Math.floor(comp.squadMax * 0.6));
    const targetRel = Math.round(comp.squadMax * 0.26 + (U.hash(t.key + season) % 4));
    for (let i = n - 1; i >= 0; i--) {
      const s = scored[i];
      if (n - release.length <= minKeep) break;
      const age = W.age(w, s.p);
      const overpaid = s.sal > A.price(w, s.p, comp) * 1.6 && s.sal > A.base(comp) * 4;
      const bottom = i >= n * 0.68 && release.length < targetRel;
      if (s.p.retired || (age >= 38 && s.v < 74) || age >= 41 || s.p.injury > 90 || s.v < 62 || overpaid || bottom) release.push(s.p);
    }
    return release;
  };
  A.doRelease = function (w, t, comp, players) {
    for (const p of players) {
      t.squad = t.squad.filter(id => id !== p.id);
      if (p.teams[comp.id] === t.key) delete p.teams[comp.id];
      if (p.sal) delete p.sal[comp.id];
      if (t.cap === p.id) t.cap = null;
    }
    const total = U.sum(t.squad, id => (w.players[id].sal && w.players[id].sal[comp.id]) || 0);
    t.purse = Math.round((comp.purse - total) * 100) / 100;
  };
  A.retentionAI = function (w, compId, season, skipUser) {
    const comp = w.comps[compId];
    A.ensureSalaries(w, compId);
    let n = 0;
    for (const k of comp.teams) {
      if (w.user && w.user.team === k && w.settings.auctions) continue;
      const t = w.teams[k];
      const rel = A.releaseList(w, t, comp, season);
      A.doRelease(w, t, comp, rel); n += rel.length;
    }
    comp.retainedFor = season;
    return n;
  };

  // ------------------------------------------------------------ auction object
  class AuctionRun {
    constructor(w, compId, season) {
      this.w = w; this.compId = compId; this.season = season; this.comp = w.comps[compId];
      const comp = this.comp;
      if (comp.retainedFor !== season) A.retentionAI(w, compId, season);
      A.ensureSalaries(w, compId);
      this.rng = W.rngFor(w, 'auction' + compId + season);
      const inLeague = new Set(); comp.teams.forEach(k => w.teams[k].squad.forEach(id => inLeague.add(id)));
      const pool = w.players.filter(p => !inLeague.has(p.id) && A.eligible(w, p, comp));
      pool.forEach(p => { p._av = A.value(w, p, comp); });
      pool.sort((a, b) => b._av - a._av);
      const nLots = compId === 'IPL' ? 130 : 90;
      // keep enough locals for every league
      const locals = pool.filter(p => !A.isOS(p, comp)).slice(0, Math.ceil(nLots * 0.55));
      const os = pool.filter(p => A.isOS(p, comp)).slice(0, Math.ceil(nLots * 0.6));
      const lots = locals.concat(os).sort((a, b) => b._av - a._av).slice(0, nLots);
      // marquee set first, then by role sets
      const marquee = lots.slice(0, 10);
      const rest = lots.slice(10);
      const byRole = (r) => rest.filter(p => p.role === r);
      this.lots = marquee.concat(byRole('BAT'), byRole('WK'), byRole('AR'), byRole('BWL')).map(p => ({ pid: p.id, base: A.round(comp, Math.max(A.base(comp), A.price(w, p, comp) * 0.35)), status: 'pending' }));
      this.idx = 0; this.log = []; this.done = false;
      this.teams = comp.teams.slice();
      this.cur = null;
    }
    team(k) { return this.w.teams[k]; }
    overseasCount(t) { return t.squad.filter(id => A.isOS(this.w.players[id], this.comp)).length; }
    slotsLeft(t) { return this.comp.squadMax - t.squad.length; }
    needFactor(t, p) {
      const w = this.w, comp = this.comp;
      if (this.slotsLeft(t) <= 0) return 0;
      if (A.isOS(p, comp) && this.overseasCount(t) >= comp.osSquad) return 0;
      const ps = t.squad.map(id => w.players[id]);
      const count = (f) => ps.filter(f).length;
      let f = 1;
      if (p.role === 'WK' && count(x => x.role === 'WK') < 2) f *= 1.3;
      if (p.role === 'WK' && count(x => x.role === 'WK') >= 3) f *= 0.5;
      if (SK.isSpin(p.bowl) && (p.role === 'BWL' || p.role === 'AR') && count(x => SK.isSpin(x.bowl) && x.role !== 'BAT') < 3) f *= 1.2;
      if (SK.isPace(p.bowl) && (p.role === 'BWL' || p.role === 'AR') && count(x => SK.isPace(x.bowl) && x.role !== 'BAT') < 5) f *= 1.2;
      if (p.role === 'BAT' && count(x => x.role === 'BAT') >= 8) f *= 0.7;
      if (this.slotsLeft(t) <= 3) f *= 0.8;
      return f;
    }
    maxBidFor(k, lot) {
      const t = this.team(k); const p = this.w.players[lot.pid]; const comp = this.comp;
      if (this.w.user && this.w.user.team === k && this.interactive) return 0; // user decides
      const need = this.needFactor(t, p); if (!need) return 0;
      const reserve = Math.max(0, A.squadMin(comp) - t.squad.length - 1) * A.base(comp);
      const avail = t.purse - reserve;
      if (avail < lot.base) return 0;
      // spend the purse: money per open slot raises or lowers how far a team will go
      const want = Math.max(1, Math.min(this.slotsLeft(t), comp.squadMax - 2 - t.squad.length));
      const budget = U.clamp(Math.sqrt((avail / want) / (comp.purse * 0.025)), 0.6, 2.4);
      const r = U.makeRng(U.hash(k + lot.pid + this.season))();
      let v = A.price(this.w, p, comp) * need * budget * (0.72 + r * 0.6);
      v = Math.min(v, this.slotsLeft(t) <= 2 ? avail : avail * 0.45);
      if (v < lot.base) return r < 0.25 ? lot.base : 0;
      return Math.min(avail, A.round(comp, v));
    }
    // ---- interactive API
    startLot() {
      while (this.idx < this.lots.length && this.lots[this.idx].status !== 'pending') this.idx++;
      if (this.idx >= this.lots.length || this.teams.every(k => this.slotsLeft(this.team(k)) <= 0)) { this.finish(); return null; }
      const lot = this.lots[this.idx];
      const maxes = {}; for (const k of this.teams) maxes[k] = this.maxBidFor(k, lot);
      this.cur = { lot, price: null, leader: null, maxes, userOut: false, history: [] };
      return this.cur;
    }
    // AI responds until the user must act or the lot closes. Returns {state:'user'|'sold'|'unsold'}
    aiStep() {
      const c = this.cur; const comp = this.comp; const userKey = this.w.user && this.interactive ? this.w.user.team : null;
      for (let guard = 0; guard < 400; guard++) {
        const next = c.price == null ? c.lot.base : c.price + A.inc(comp, c.price);
        const bidders = this.teams.filter(k => k !== c.leader && k !== userKey && c.maxes[k] >= next);
        if (!bidders.length) {
          if (userKey && !c.userOut && c.leader !== userKey && this.userCanBid(next)) return { state: 'user', next };
          return this.close();
        }
        // the keenest rival bids (some randomness)
        bidders.sort((a, b) => c.maxes[b] - c.maxes[a]);
        const pick = bidders.length > 1 && this.rng() < 0.35 ? bidders[1] : bidders[0];
        c.price = next; c.leader = pick; c.history.push([pick, next]);
        if (userKey && !c.userOut && this.userCanBid(c.price + A.inc(comp, c.price))) return { state: 'user', next: c.price + A.inc(comp, c.price) };
      }
      return this.close();
    }
    userCanBid(amount) {
      const t = this.team(this.w.user.team); const p = this.w.players[this.cur.lot.pid];
      if (this.slotsLeft(t) <= 0) return false;
      if (A.isOS(p, this.comp) && this.overseasCount(t) >= this.comp.osSquad) return false;
      const reserve = Math.max(0, A.squadMin(this.comp) - t.squad.length - 1) * A.base(this.comp);
      return t.purse - reserve >= amount;
    }
    userBid() {
      const c = this.cur; const next = c.price == null ? c.lot.base : c.price + A.inc(this.comp, c.price);
      if (!this.userCanBid(next)) return { state: 'error', msg: 'Not enough purse or squad space.' };
      c.price = next; c.leader = this.w.user.team; c.history.push([c.leader, next]);
      return this.aiStep();
    }
    userPass() { this.cur.userOut = true; return this.aiStep(); }
    close() {
      const c = this.cur; const lot = c.lot; const p = this.w.players[lot.pid];
      if (c.leader) {
        const t = this.team(c.leader);
        lot.status = 'sold'; lot.to = c.leader; lot.price = c.price;
        t.squad.push(p.id); p.teams[this.compId] = c.leader; p.sal = p.sal || {}; p.sal[this.compId] = c.price;
        t.purse = Math.round((t.purse - c.price) * 100) / 100;
        this.log.push({ pid: p.id, to: c.leader, price: c.price });
      } else { lot.status = 'unsold'; this.log.push({ pid: p.id, to: null }); }
      this.idx++;
      const st = lot.status; this.cur = null;
      return { state: st, lot };
    }
    // quick-resolve one lot without user input
    simLot() {
      const lot = this.startLot(); if (!lot) return null;
      const c = this.cur;
      const bids = this.teams.map(k => [k, c.maxes[k]]).filter(x => x[1] >= lot.lot.base).sort((a, b) => b[1] - a[1]);
      if (!bids.length) return this.close();
      const [winner, max] = bids[0];
      const second = bids[1] ? bids[1][1] : null;
      c.leader = winner;
      c.price = second == null ? lot.lot.base : Math.min(max, A.round(this.comp, second + A.inc(this.comp, second)));
      return this.close();
    }
    simAll() { let r; let n = 0; while ((r = this.simLot()) && n++ < 1000) { /* loop */ } this.finish(); }
    finish() {
      if (this.done) return; this.done = true;
      const w = this.w, comp = this.comp;
      // accelerated round: unsold and unlisted players at base price, so squads end up close to full
      const inLeague = new Set(); comp.teams.forEach(k => w.teams[k].squad.forEach(id => inLeague.add(id)));
      let fillers = w.players.filter(p => !inLeague.has(p.id) && A.eligible(w, p, comp)).sort((a, b) => A.value(w, b, comp) - A.value(w, a, comp));
      const base = A.base(comp); const target = comp.squadMax - 1;
      const order = comp.teams.slice().sort((a, b) => w.teams[a].squad.length - w.teams[b].squad.length);
      for (let round = 0; round < comp.squadMax; round++) {
        let any = false;
        for (const k of order) {
          const t = w.teams[k];
          if (w.user && w.user.team === k && this.interactive) continue;
          const must = t.squad.length < A.squadMin(comp);
          if (t.squad.length >= target || (!must && t.purse < base)) continue;
          const osFull = this.overseasCount(t) >= comp.osSquad;
          const i = fillers.findIndex(p => !(osFull && A.isOS(p, comp)));
          if (i < 0) continue;
          const p = fillers.splice(i, 1)[0];
          t.squad.push(p.id); p.teams[comp.id] = k; p.sal = p.sal || {}; p.sal[comp.id] = base; t.purse = Math.max(0, Math.round((t.purse - base) * 100) / 100);
          any = true;
        }
        if (!any) break;
      }
      const sold = this.log.filter(l => l.to).sort((a, b) => b.price - a.price);
      if (sold.length) {
        const top = sold.slice(0, 3).map(l => `${w.players[l.pid].name} (${w.teams[l.to].short}, ${U.money(l.price, comp.cur)})`).join(', ');
        W.addNews(w, `${comp.name} ${this.season} auction: ${sold.length} players sold. Biggest buys: ${top}.`, 'auction');
      }
      comp.lastAuction = this.season;
    }
  }
  A.AuctionRun = AuctionRun;
  A.runAI = function (w, compId, season) {
    const run = new AuctionRun(w, compId, season);
    run.interactive = false;
    run.simAll();
    return run;
  };
})(typeof window !== 'undefined' ? window : globalThis);
