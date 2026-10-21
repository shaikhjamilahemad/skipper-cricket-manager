// Calibration harness: node tools/sim_test.js [format] [n]
globalThis.window = globalThis;
const path = require('path');
const W = path.join(__dirname, '..', 'src', 'engine');
require(path.join(W, 'util.js')); require(path.join(W, 'data.js')); require(path.join(W, 'engine.js'));
const { U, Match, Sel, R } = SK;
if (process.env.EP) Object.assign(SK.ENGINE_PARAMS, JSON.parse(process.env.EP));
const DB = SK_DB();
function SK_DB() { return globalThis.SKIPPER_DB; }

const players = DB.players.map((a, id) => {
  const ret = {}; (a[11] || '').split(',').forEach(f => { if (f === 'rT') ret.T = 1; if (f === 'rO') ret.O = 1; if (f === 'rI') ret.I = 1; if (f === 'rX') ret.X = 1; });
  return { id, name: a[0], cc: a[1], yob: a[2], hand: a[3], bowl: a[4], role: a[5], bt: a[6], bp: a[7], bw: a[8], be: a[9], fd: a[10], ret, form: 0, fatigue: 0, injury: 0 };
});
const comps = Object.fromEntries(DB.comps.map(c => [c.id, c]));

const fmt = process.argv[2] || 'T20';
const N = +(process.argv[3] || 300);
const venueCC = { IPL: 'IND', BBL: 'AUS', CC1: 'ENG', CC2: 'ENG', INTL: null };

function teamFrom(comp, t, fmt) {
  const pool = t.squad.map(i => players[i]);
  const home = comp.home;
  const isOS = (p) => home !== '-' && p.cc !== home;
  const xi = Sel.pickXI(pool, { fmt, maxOverseas: comp.osXI || 11, isOverseas: isOS, pitch: t.pitch });
  return { id: t.id, name: t.name, short: t.short, xi, captainId: null };
}
function natTeam(cc, fmt) {
  const pool = players.filter(p => p.cc === cc);
  const t = comps.INTL.teams.find(x => x.id === cc || (cc === 'SCO' && x.id === 'SCOT'));
  return { id: cc, name: t.name, short: t.short, xi: Sel.pickXI(pool, { fmt, pitch: t.pitch }), pitch: t.pitch, venue: t.venue };
}

const agg = { inns: [0, 0], runs: [0, 0], wk: [0, 0], balls: [0, 0], f4: 0, f6: 0, ext: 0, chaseWins: 0, ties: 0, so: 0, draws: 0, results: 0, inn100: 0, inn50: 0, fivefor: 0, totalInns: 0, days: 0, dots: 0, legal: 0, matchBalls: 0, maxScore: 0, minScore: 9999, innByWin: 0, followOns: 0 };
const scoreHist = [];
const pos = Array.from({ length: 11 }, () => ({ inns: 0, outs: 0, runs: 0, balls: 0 }));
const t0 = Date.now();
let totalBalls = 0;
for (let i = 0; i < N; i++) {
  let A, B, venue;
  if (fmt === 'T20' || fmt === 'HUN') {
    const c = comps[fmt === 'HUN' ? 'HUN' : (i % 3 === 0 ? 'BBL' : 'IPL')];
    const ts = U.makeRng(i + 7).shuffle(c.teams.slice());
    A = teamFrom(c, ts[0], fmt); B = teamFrom(c, ts[1], fmt);
    venue = { name: ts[0].venue, cc: c.home, pitch: ts[0].pitch };
  } else if (fmt === 'FC4') {
    const c = comps[i % 2 ? 'CC1' : 'SHF'];
    const ts = U.makeRng(i + 7).shuffle(c.teams.slice());
    A = teamFrom(c, ts[0], fmt); B = teamFrom(c, ts[1], fmt);
    venue = { name: ts[0].venue, cc: c.home, pitch: ts[0].pitch };
  } else {
    const nations = process.env.TOP ? ['IND', 'AUS', 'ENG', 'SA', 'NZ', 'PAK'] : ['IND', 'AUS', 'ENG', 'SA', 'NZ', 'PAK', 'SL', 'WI', 'BAN', 'AFG'];
    const rr = U.makeRng(i + 11); const a = rr.pick(nations); let b = rr.pick(nations); while (b === a) b = rr.pick(nations);
    A = natTeam(a, fmt); B = natTeam(b, fmt);
    venue = { name: A.venue, cc: a, pitch: A.pitch };
  }
  const m = new Match({ format: fmt, teams: [A, B], venue, homeSide: 0, seed: 1000 + i, fast: true });
  m.doToss();
  m.simToEnd(50000);
  totalBalls += m.ballCount;
  const res = m.result;
  if (!res) { console.log('NO RESULT', i); continue; }
  if (res.kind === 'tie') agg.ties++;
  if (m.superOvers.length) agg.so++;
  if (res.kind === 'draw') agg.draws++; else agg.results++;
  if (res.by === 'innings') agg.innByWin++;
  if (res.kind === 'win' && SK.FORMATS[fmt].lo && res.winner === m.inns[1].bat) agg.chaseWins++;
  agg.days += m.day;
  for (const inn of m.inns) {
    if (inn.so) continue;
    if (inn.followOn) agg.followOns++;
    const k = SK.FORMATS[fmt].lo ? inn.n : (inn.n === 0 ? 0 : 1);
    agg.inns[k]++; agg.runs[k] += inn.runs; agg.wk[k] += inn.wkts; agg.balls[k] += inn.balls; agg.totalInns++;
    if (inn.n === 0) { scoreHist.push(inn.runs); agg.maxScore = Math.max(agg.maxScore, inn.runs); agg.minScore = Math.min(agg.minScore, inn.runs); }
    agg.ext += inn.ext.b + inn.ext.lb + inn.ext.w + inn.ext.nb;
    inn.card.forEach((c, ci) => { if (ci < 11 && c.balls + (c.out ? 1 : 0) > 0) { const q = pos[ci]; q.inns++; q.outs += c.out ? 1 : 0; q.runs += c.runs; q.balls += c.balls; } });
    for (const c of inn.card) { agg.f4 += c.f4; agg.f6 += c.f6; if (c.runs >= 100) agg.inn100++; else if (c.runs >= 50) agg.inn50++; agg.dots += c.dots; agg.legal += c.balls; }
    for (const pid in inn.bw) if (inn.bw[pid].wkts >= 5) agg.fivefor++;
  }
}
const ms = Date.now() - t0;
const f = (x) => x.toFixed(2);
console.log(`format ${fmt}: ${N} matches in ${ms}ms (${(totalBalls / ms * 1000 / 1e3).toFixed(0)}k balls/s, ${(ms / N).toFixed(2)} ms/match)`);
for (const k of [0, 1]) {
  if (!agg.inns[k]) continue;
  console.log(`  ${k === 0 ? '1st inns' : 'later inns'}: avg ${f(agg.runs[k] / agg.inns[k])} / ${f(agg.wk[k] / agg.inns[k])} wkts, RR ${f(agg.runs[k] * 6 / agg.balls[k])}, runs/wkt ${f(agg.runs[k] / Math.max(1, agg.wk[k]))}, overs ${f(agg.balls[k] / agg.inns[k] / 6)}`);
}
scoreHist.sort((a, b) => a - b);
const q = (p) => scoreHist[Math.floor(p * (scoreHist.length - 1))];
console.log(`  1st inns score p10 ${q(0.1)} p50 ${q(0.5)} p90 ${q(0.9)} min ${agg.minScore} max ${agg.maxScore}`);
console.log(`  per innings: 4s ${f(agg.f4 / agg.totalInns)}, 6s ${f(agg.f6 / agg.totalInns)}, extras ${f(agg.ext / agg.totalInns)}, dot% ${f(agg.dots * 100 / agg.legal)}`);
console.log(`  per match: 100s ${f(agg.inn100 / N)}, 50s ${f(agg.inn50 / N)}, 5-fors ${f(agg.fivefor / N)}`);
if (SK.FORMATS[fmt].lo) console.log(`  chasing wins ${f(agg.chaseWins * 100 / N)}%, ties ${agg.ties}, super overs ${agg.so}`);
else console.log(`  results ${f(agg.results * 100 / N)}%, draws ${f(agg.draws * 100 / N)}%, innings wins ${agg.innByWin}, follow-ons ${agg.followOns}, avg days used ${f(agg.days / N)}`);
if (process.env.POS) pos.forEach((q, i) => console.log(`pos ${i + 1}: inns ${q.inns} notout ${(100 * (1 - q.outs / Math.max(1, q.inns))).toFixed(0)}% avg ${(q.runs / Math.max(1, q.outs)).toFixed(1)} sr ${(100 * q.runs / Math.max(1, q.balls)).toFixed(0)} runs/inn ${(q.runs / Math.max(1, q.inns)).toFixed(1)}`));
