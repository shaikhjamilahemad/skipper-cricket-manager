// Inspect the AI auction economy: node tools/auction_test.js [comp] [season]
globalThis.window = globalThis;
const path = require('path');
const Wd = path.join(__dirname, '..', 'www', 'js');
for (const f of ['util.js', 'data.js', 'engine.js', 'db.js', 'names.js', 'world.js', 'auction.js', 'career.js']) require(path.join(Wd, f));
const { U, World: W, Auction: A } = SK;
const comp = process.argv[2] || 'IPL'; const season = +(process.argv[3] || 2027);
const w = W.create({ seed: 7, mode: 'career' });
const c = w.comps[comp];
A.ensureSalaries(w, comp);
const before = {}; for (const k of c.teams) before[k] = { n: w.teams[k].squad.length, purse: w.teams[k].purse };
A.retentionAI(w, comp, season);
const afterRet = {}; for (const k of c.teams) afterRet[k] = { n: w.teams[k].squad.length, purse: w.teams[k].purse };
const run = A.runAI(w, comp, season);
console.log(`${comp} ${season}: lots ${run.lots.length}, sold ${run.log.filter(l => l.to).length}`);
for (const k of c.teams) { const t = w.teams[k]; console.log(`${t.short.padEnd(5)} squad ${before[k].n}->${afterRet[k].n}->${t.squad.length}  purse ${before[k].purse}->${afterRet[k].purse}->${t.purse}`); }
const sold = run.log.filter(l => l.to).sort((a, b) => b.price - a.price);
console.log('top buys:', sold.slice(0, 12).map(l => `${w.players[l.pid].name} (${Math.round(A.value(w, w.players[l.pid], c))}) ${w.teams[l.to].short} ${U.money(l.price, c.cur)}`).join('; '));
const spend = U.sum(sold, l => l.price); console.log('total spend', U.money(spend, c.cur), 'median', U.money(sold[Math.floor(sold.length / 2)].price, c.cur));
