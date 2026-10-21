/* Skipper — career layer: objectives, board confidence, sackings, job offers, scorecards */
(function (G) {
  'use strict';
  const SK = G.SK = G.SK || {};
  const U = SK.U, R = SK.R, W = SK.World, DB = SK.DB;
  const C = SK.Career = {};

  C.TARGETS = { win: 'Win the title', final: 'Reach the final', playoffs: 'Reach the playoffs', tophalf: 'Finish in the top half', avoidlast: 'Avoid finishing last', promo: 'Win promotion', survive: 'Avoid relegation', winseries: 'Win the series', drawseries: 'Avoid losing the series', compete: 'Avoid a whitewash', semis: 'Reach the semi-finals', super: 'Reach the next stage', winone: 'Win at least one match' };

  C.userComp = (w) => (w.user && w.user.team ? w.teams[w.user.team].comp : null);
  C.isUserEd = (w, ed) => !!(w.user && w.user.team && ed.teams && ed.teams.includes(w.user.team));

  C.onNewJob = function (w, teamKey, first) {
    const t = w.teams[teamKey];
    w.user.team = teamKey; w.user.conf = 60; w.user.since = w.date; w.user.sacked = false; w.user.offers = [];
    w.user.objectives = w.user.objectives || {};
    const where = t.comp === 'INTL' ? `the ${t.name} national team` : `${t.name} (${W.COMP_LABEL[t.comp]})`;
    W.mail(w, first ? `Welcome, ${w.user.name}` : `New job: ${t.name}`,
      `You are the new head coach of ${where}. The board expects steady progress. Check your squad, then press Continue to move through the calendar. You will be stopped before every match you play.` +
      (t.comp === 'INTL' ? ' Before each series you pick the squad.' : W.LEAGUES.includes(t.comp) ? ' Before each season you can release players and buy new ones in the auction.' : ''), 'board');
    // set objectives for any live/scheduled editions involving the team
    for (const id in w.editions) { const ed = w.editions[id]; if (ed.status !== 'done' && ed.teams && ed.teams.includes(teamKey)) C.setObjective(w, ed); }
  };

  C.rankInEdition = function (w, ed, key) {
    const fmt = ed.fmt === 'INT' ? 'ODI' : (ed.fmt === 'HUN' ? 'T20' : ed.fmt);
    const scores = ed.teams.map(k => ({ k, s: W.teamStrength(w, w.teams[k], fmt) })).sort((a, b) => b.s - a.s);
    return { rank: scores.findIndex(x => x.k === key) + 1, n: scores.length, scores };
  };
  C.setObjective = function (w, ed) {
    if (!C.isUserEd(w, ed)) return;
    const key = w.user.team; const o = w.user.objectives;
    if (o[ed.id]) return;
    let target;
    if (ed.type === 'league') {
      const { rank, n } = C.rankInEdition(w, ed, key);
      if (ed.comp === 'CC2') target = rank <= 2 ? 'promo' : rank <= 5 ? 'tophalf' : 'avoidlast';
      else if (ed.comp === 'CC1') target = rank <= 2 ? 'win' : rank <= 6 ? 'tophalf' : 'survive';
      else target = rank <= 2 ? 'win' : rank <= Math.ceil(n * 0.45) ? 'playoffs' : rank <= Math.ceil(n * 0.7) ? 'tophalf' : 'avoidlast';
    } else if (ed.type === 'series') {
      const opp = ed.teams.find(k => k !== key);
      const mine = W.teamStrength(w, w.teams[key], 'ODI'), theirs = W.teamStrength(w, w.teams[opp], 'ODI');
      const home = ed.host === key;
      const d = mine - theirs + (home ? 2 : -1);
      target = d > 2 ? 'winseries' : d > -2 ? 'drawseries' : 'compete';
    } else if (ed.type === 'icc') {
      const fmt = ed.icc === 'T20WC' ? 'T20I' : ed.icc === 'WTCF' ? 'TEST' : 'ODI';
      const ranked = ed.teams.slice().sort((a, b) => (w.rank[fmt][b] || 0) - (w.rank[fmt][a] || 0));
      const r = ranked.indexOf(key) + 1;
      target = ed.icc === 'WTCF' ? 'win' : r <= 2 ? 'final' : r <= 5 ? 'semis' : r <= 9 ? 'super' : 'winone';
    }
    if (!target) return;
    o[ed.id] = { target, set: w.date, name: ed.name };
    W.mail(w, `Board target: ${ed.name}`, `The board has set your target for ${ed.name}: ${C.TARGETS[target]}.`, 'board', { ed: ed.id });
  };

  C.evaluate = function (w, ed) {
    const key = w.user.team; const ob = w.user.objectives[ed.id]; if (!ob) return null;
    let met = false, exceeded = false, badly = false, finish = '';
    if (ed.type === 'league') {
      const table = W.sortTable(ed); const pos = table.indexOf(key) + 1; const n = table.length;
      const champ = ed.champion === key;
      const inPO = (ed.playoff === 'ipl4' ? pos <= 4 : ed.playoff === 'top3' ? pos <= 3 : ed.playoff === 'final2' ? pos <= 2 : pos <= 1);
      const finals = ed.fixtures.map(id => w.fx[id]).filter(f => f && f.stage === 'F');
      const inFinal = finals.some(f => f.home === key || f.away === key);
      finish = champ ? 'Champions' : inFinal ? 'Runners-up' : `${U.ordinal(pos)} of ${n}`;
      switch (ob.target) {
        case 'win': met = champ; badly = !inPO; break;
        case 'playoffs': met = inPO; exceeded = champ; badly = pos > n - 2; break;
        case 'tophalf': met = pos <= Math.ceil(n / 2); exceeded = inPO || champ; badly = pos === n; break;
        case 'avoidlast': met = pos < n; exceeded = pos <= Math.ceil(n / 2); break;
        case 'promo': met = pos <= 2; exceeded = pos === 1; badly = pos > n - 2; break;
        case 'survive': met = pos <= n - 2; exceeded = pos <= 3; badly = pos === n; break;
      }
      ob.finish = finish; ob.pos = pos;
    } else if (ed.type === 'series') {
      let won = 0, lost = 0;
      for (const leg of ed.legs) { const opp = ed.teams.find(k => k !== key); if (leg.score[key] > leg.score[opp]) won++; else if (leg.score[key] < leg.score[opp]) lost++; }
      const opp = ed.teams.find(k => k !== key);
      const allLost = ed.legs.every(l => l.score[opp] === l.fixtures.length && l.score[key] === 0);
      finish = `${won} won, ${lost} lost of ${ed.legs.length} format${ed.legs.length > 1 ? 's' : ''}`;
      if (ob.target === 'winseries') { met = won > lost; badly = lost > won && lost === ed.legs.length; }
      else if (ob.target === 'drawseries') { met = won >= lost; exceeded = won > lost && lost === 0; badly = lost === ed.legs.length; }
      else { met = !allLost; exceeded = won > lost; }
      ob.finish = finish;
    } else if (ed.type === 'icc') {
      const fx = ed.fixtures.map(id => w.fx[id]).filter(f => f.home === key || f.away === key);
      const reached = fx.some(f => f.stage === 'F') ? (ed.champion === key ? 'win' : 'final') : fx.some(f => f.stage === 'SF') ? 'semis' : fx.some(f => /Super/.test(f.stage)) ? 'super' : 'group';
      const wins = fx.filter(f => f.result && f.result.winner === key).length;
      const lvl = { group: 0, super: 1, semis: 2, final: 3, win: 4 }[reached];
      const need = { winone: -1, super: 1, semis: 2, final: 3, win: 4 }[ob.target];
      met = ob.target === 'winone' ? wins > 0 : lvl >= need; exceeded = lvl > need + (ob.target === 'winone' ? 2 : 0); badly = lvl < need - 1;
      finish = ed.champion === key ? 'Champions' : { final: 'Runners-up', semis: 'Semi-finalists', super: 'Second stage', group: 'Group stage' }[reached];
      if (ed.shared && ed.shared.includes(key)) { finish = 'Joint champions'; met = true; exceeded = false; badly = false; }
      ob.finish = finish;
    }
    ob.met = met; ob.exceeded = exceeded; ob.badly = badly; ob.done = w.date;
    return ob;
  };

  // ------------------------------------------------------------ world hooks
  W.onEditionStart = function (w, ed) { if (C.isUserEd(w, ed)) C.setObjective(w, ed); };
  W.onUserMatch = function (w, fx, m) {
    const u = w.user; const key = u.team;
    if (fx.home !== key && fx.away !== key) return;
    const res = fx.result;
    const opp = fx.home === key ? fx.away : fx.home;
    const diff = (w.teams[opp].strength || 60) - (w.teams[key].strength || 60);
    let d = 0;
    if (res.winner === key) d = 2.4 + diff * 0.12; else if (res.winner === opp) d = -2.4 + diff * 0.12; else d = diff * 0.06;
    if (fx.stage === 'F') d *= 2.5; else if (fx.ko) d *= 1.6;
    u.conf = U.clamp(u.conf + d, 0, 100);
    u.played = (u.played || 0) + 1; if (res.winner === key) u.won = (u.won || 0) + 1; else if (res.winner === opp) u.lost = (u.lost || 0) + 1;
    C.storeCard(w, fx, m);
  };
  W.onEditionDone = function (w, ed) {
    if (!w.user || !w.user.team) return;
    if (!C.isUserEd(w, ed)) return;
    const ob = C.evaluate(w, ed);
    if (!ob) return;
    const u = w.user;
    let delta = ob.exceeded ? 16 : ob.met ? 9 : ob.badly ? -26 : -14;
    const shared = !!(ed.shared && ed.shared.includes(u.team));
    if (ed.champion === u.team || shared) { delta += shared ? 8 : 14; u.rep = Math.min(99, u.rep + (shared ? 4 : 7)); u.titles = (u.titles || []).concat([{ name: ed.name + (shared ? ' (shared)' : ''), date: w.date }]); }
    u.rep = U.clamp(u.rep + (ob.met ? 2 : -2) + (ob.exceeded ? 2 : 0), 5, 99);
    u.conf = U.clamp(u.conf + delta, 0, 100);
    const t = w.teams[u.team];
    if (ed.type !== 'series') u.history.push({ season: ed.season, ed: ed.id, name: ed.name, team: u.team, teamName: t.name, target: ob.target, finish: ob.finish, met: ob.met });
    const verdict = ob.exceeded ? 'The board is delighted.' : ob.met ? 'The board is satisfied.' : ob.badly ? 'The board is furious.' : 'The board is disappointed.';
    W.mail(w, `${ed.name}: ${ob.finish}`, `Target: ${C.TARGETS[ob.target]}. Result: ${ob.finish}. ${verdict} Board confidence is now ${Math.round(u.conf)}/100.`, 'board', { ed: ed.id });
    // big editions trigger a review (franchise/domestic leagues and ICC events), series reviews happen at season end
    if (ed.type === 'league' || ed.type === 'icc') { u.alert = { type: 'edition', ed: ed.id }; C.review(w, ed); }
  };
  W.onSeasonEnd = function (w, season) {
    if (!w.user || !w.user.team) { if (w.user) C.makeOffers(w, 'unemployed'); return; }
    const t = w.teams[w.user.team];
    if (t.comp === 'INTL') {
      const eds = Object.values(w.editions).filter(e => e.season === season && e.teams && e.teams.includes(t.key) && w.user.objectives[e.id] && w.user.objectives[e.id].done);
      const met = eds.filter(e => w.user.objectives[e.id].met).length;
      w.user.history.push({ season, name: `${season - 1}-${String(season).slice(2)} international season`, team: t.key, teamName: t.name, finish: `${met}/${eds.length} targets met`, met: met >= eds.length / 2 });
      w.user.alert = { type: 'season', season, met, total: eds.length };
      C.review(w, null, season);
    }
  };

  C.review = function (w, ed, season) {
    const u = w.user;
    if (u.oneSeason) { if (!u.oneEd || (ed && ed.id === u.oneEd)) u.finishedTournament = true; return; }
    if (u.conf < 22) {
      const t = w.teams[u.team];
      W.mail(w, 'Sacked', `The ${t.name} board has lost patience and terminated your contract. You will receive job offers from other teams; you can also wait for better ones.`, 'board');
      u.history.push({ season: season || (ed && ed.season), name: 'Sacked', team: u.team, teamName: t.name, sacked: true });
      u.rep = Math.max(5, u.rep - 8);
      u.formerTeam = u.team; u.team = null; u.sacked = true;
      u.alert = { type: 'sacked', ed: ed ? ed.id : null };
      C.makeOffers(w, 'sacked');
      return;
    }
    C.makeOffers(w, 'review');
  };
  C.makeOffers = function (w, why) {
    const u = w.user; const rng = W.rngFor(w, 'offers' + w.date);
    const all = Object.values(w.teams).filter(t => t.key !== u.team && t.key !== u.formerTeam);
    const rep = u.rep;
    let lo = rep - 22, hi = rep + (why === 'review' ? 8 : 0);
    if (why === 'review' && u.conf < 45) return; // nobody headhunts a struggling coach
    const cands = all.filter(t => t.rep >= lo && t.rep <= hi && (t.comp !== 'INTL' || rep >= (t.rep >= 75 ? 72 : 55)));
    rng.shuffle(cands);
    const n = why === 'review' ? (rng() < 0.55 ? rng.int(1, 2) : 0) : rng.int(2, 4);
    const offers = cands.slice(0, n).map(t => ({ team: t.key, expires: w.date + 40, made: w.date }));
    if (!offers.length && why !== 'review') { const fallback = all.filter(t => t.rep < rep + 5).sort(() => rng() - 0.5).slice(0, 2); for (const t of fallback) offers.push({ team: t.key, expires: w.date + 40, made: w.date }); }
    u.offers = (u.offers || []).filter(o => o.expires > w.date).concat(offers);
    if (offers.length && !u.alert) u.alert = { type: 'offers' };
    if (offers.length) W.mail(w, why === 'review' ? 'Job approach' : 'Job offers', `You have ${offers.length} job offer${offers.length > 1 ? 's' : ''}: ${offers.map(o => w.teams[o.team].name + ' (' + W.COMP_LABEL[w.teams[o.team].comp] + ')').join(', ')}. Open the Career tab to accept or decline.`, 'offer');
  };
  C.acceptOffer = function (w, teamKey) {
    const u = w.user;
    const was = u.team ? w.teams[u.team].name : null;
    u.offers = [];
    if (was) u.history.push({ season: W.seasonOf(w.date), name: `Left ${was}`, team: u.team, teamName: was, left: true });
    C.onNewJob(w, teamKey, false);
    W.addNews(w, `${u.name} has been appointed head coach of ${w.teams[teamKey].name}.`, 'news');
  };
  C.resign = function (w) {
    const u = w.user; if (!u.team) return;
    u.history.push({ season: W.seasonOf(w.date), name: 'Resigned', team: u.team, teamName: w.teams[u.team].name, left: true });
    u.formerTeam = u.team; u.team = null; u.rep = Math.max(5, u.rep - 3);
    C.makeOffers(w, 'unemployed');
  };

  // ------------------------------------------------------------ compact scorecards
  C.storeCard = function (w, fx, m) {
    fx.card = C.compactCard(m);
    const u = w.user; u.cards = (u.cards || []).concat([fx.id]).slice(-30);
    // drop full cards of old user fixtures
    const keep = new Set(u.cards);
    for (const id of Object.keys(w.fx)) { const f = w.fx[id]; if (f.card && !keep.has(id) && f.stage !== 'F') delete f.card; }
  };
  C.compactCard = function (m) {
    return {
      fmt: m.fmtKey, venue: m.venue.name, toss: m.toss ? [m.toss.winner, m.toss.decision] : null, mom: m.mom, res: m.result ? m.result.text : '',
      sides: m.sides.map(s => ({ name: s.name, short: s.short, xi: s.xi.map(p => p.id), cap: s.cap && s.cap.id, wk: s.keeper && s.keeper.id })),
      inns: m.inns.map(i => ({
        bat: i.bat, runs: i.runs, wkts: i.wkts, balls: i.balls, dec: i.declared, fo: i.followOn, so: i.so, ext: i.ext,
        card: i.card.map(c => [c.pid, c.runs, c.balls, c.f4, c.f6, c.out ? c.how : '', c.bowler, c.fielder]),
        bowl: i.bowlOrder.map(pid => { const b = i.bw[pid]; return [b.pid, b.balls, b.maid, b.runs, b.wkts, b.wd, b.nb]; }),
        fow: i.fow.map(f => [f.w, f.runs, f.balls, f.pid]), overs: i.overs.map(o => [o.runs, o.wkts, o.bowler]),
        log: i.log && i.log.length ? i.log.filter(x => x.a != null).map(x => [x.bt, x.br, x.a, x.d, x.w ? 1 : 0]) : [],
      })),
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
