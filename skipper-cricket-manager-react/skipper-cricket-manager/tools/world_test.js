// Headless world/career simulation: node tools/world_test.js [seasons] [userTeam]
globalThis.window = globalThis;
const path = require('path');
const Wd = path.join(__dirname, '..', 'src', 'engine');
for (const f of ['util.js', 'data.js', 'engine.js', 'db.js', 'names.js', 'world.js', 'auction.js', 'career.js']) require(path.join(Wd, f));
const { U, World: W, Auction: A, Career: C } = SK;
const seasons = +(process.argv[2] || 1);
const userTeam = process.argv[3] || 'IPL:CSK';
const t0 = Date.now();
const w = W.create({ seed: 42, userTeam, manager: 'Test Coach' });
console.log('created in', Date.now() - t0, 'ms; queue', w.queue.length, 'fixtures', Object.keys(w.fx).length, 'editions', Object.keys(w.editions).length);
const endDay = U.dateToDay(2026 + seasons, 9, 5);
let userMatches = 0, stops = {}, guard = 0;
const t1 = Date.now();
while (w.date < endDay && guard++ < 200000) {
  const r = W.advance(w, { budgetMs: 1000, until: endDay });
  stops[r.stop] = (stops[r.stop] || 0) + 1;
  if (r.stop === 'user') {
    if (r.type === 'match') { const m = W.simFixture(w, r.fx); userMatches++; w.queue = w.queue.filter(q => q.id !== r.fx.id); }
    else if (r.type === 'squad') { const ed = r.ed; ed.squads[w.user.team] = {}; if (ed.legs) { for (const leg of ed.legs) ed.squads[w.user.team][leg.fmt] = W.selectNationalSquad(w, w.user.team, leg.fmt, 16); } else { ed.squads[w.user.team][ed.fmt] = W.selectNationalSquad(w, w.user.team, ed.fmt, 15); W.assignDuty(w, ed); } }
    else if (r.type === 'retention') { const comp = w.comps[r.ev.comp]; A.ensureSalaries(w, comp.id); const t = w.teams[w.user.team]; A.doRelease(w, t, comp, A.releaseList(w, t, comp, r.ev.season)); r.ev.done = true; w.queue = w.queue.filter(q => q.id !== r.ev.id); }
    else if (r.type === 'auction') { const run = new A.AuctionRun(w, r.ev.comp, r.ev.season); run.interactive = false; run.simAll(); r.ev.done = true; w.queue = w.queue.filter(q => q.id !== r.ev.id); }
    if (!w.user.team && w.user.offers && w.user.offers.length) { C.acceptOffer(w, w.user.offers[0].team); }
  }
  if (r.stop === 'empty') break;
}
const ms = Date.now() - t1;
console.log(`simulated to ${U.fmtDate(w.date)} in ${ms} ms; user matches ${userMatches}; stops`, stops);
const done = Object.values(w.editions).filter(e => e.status === 'done');
console.log('editions done:', done.length, 'pending:', Object.values(w.editions).filter(e => e.status !== 'done').length);
for (const ed of done.filter(e => e.type !== 'series').sort((a, b) => a.start - b.start)) {
  const lb = W.leaderboards(w, ed, 1);
  const r = lb.runs[0], k = lb.wkts[0];
  console.log(`  ${ed.name.padEnd(36)} champ: ${(ed.champion ? w.teams[ed.champion].name : '-').padEnd(26)} runs: ${r ? w.players[r.pid].name + ' ' + r.s.r : '-'} | wkts: ${k ? w.players[k.pid].name + ' ' + k.s.w : '-'}`);
}
const series = done.filter(e => e.type === 'series');
console.log('series done:', series.length, 'e.g.', series.slice(0, 4).map(s => s.name + ': ' + s.legs.map(l => l.text).join('; ')).join('\n   '));
console.log('WTC:', W.wtcStandings(w).slice(0, 4).map(x => `${w.teams[x.key].short} ${x.pct.toFixed(1)}`).join(', '));
console.log('T20I ranks:', Object.entries(w.rank.T20I).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => w.teams[k].short + ' ' + v).join(', '));
// squads sanity
let bad = 0;
for (const cid of W.LEAGUES) { const comp = w.comps[cid]; for (const k of comp.teams) { const t = w.teams[k]; if (t.squad.length < 14) { bad++; console.log('small squad', k, t.squad.length); } const os = t.squad.filter(id => A.isOS(w.players[id], comp)).length; if (os > comp.osSquad + 3) console.log('many overseas', k, os); } }
console.log('players total', w.players.length, 'retired', w.players.filter(p => p.retired).length, 'regens', w.players.filter(p => p.regen).length);
console.log('user', w.user.team, 'conf', Math.round(w.user.conf), 'rep', w.user.rep, 'history', JSON.stringify(w.user.history.slice(-3)));
console.log('inbox sample:', w.inbox.slice(0, 5).map(m => m.title).join(' | '));
const json = JSON.stringify(w);
console.log('save size (JSON chars):', json.length, 'compressed:', U.compress(json).length);
console.log('bad', bad);
