// Consistency checks for the engine: node tools/engine_check.js
globalThis.window = globalThis;
const path = require('path');
const W = path.join(__dirname, '..', 'src', 'engine');
require(path.join(W, 'util.js')); require(path.join(W, 'data.js')); require(path.join(W, 'engine.js'));
const { U, Match, Sel } = SK;
const DB = globalThis.SKIPPER_DB;
const players = DB.players.map((a, id) => ({ id, name: a[0], cc: a[1], yob: a[2], hand: a[3], bowl: a[4], role: a[5], bt: a[6], bp: a[7], bw: a[8], be: a[9], fd: a[10], ret: {}, form: 0, fatigue: 0, injury: 0 }));
const comps = Object.fromEntries(DB.comps.map(c => [c.id, c]));
let problems = 0;
function check(m) {
  const F = m.F;
  m.inns.forEach((inn, k) => {
    const bat = inn.card.reduce((s, c) => s + c.runs, 0);
    const ext = inn.ext.b + inn.ext.lb + inn.ext.w + inn.ext.nb;
    if (bat + ext !== inn.runs) { problems++; console.log('runs mismatch', m.fmtKey, k, bat, ext, inn.runs); }
    let br = 0, bb = 0, bwk = 0; const overs = {};
    for (const pid in inn.bw) { const b = inn.bw[pid]; br += b.runs; bb += b.balls; bwk += b.wkts; if (F.lo && b.balls > inn.maxOv * F.bpo) { problems++; console.log('quota exceeded', m.fmtKey, m.p(+pid).name, b.balls); } }
    if (br + inn.ext.b + inn.ext.lb !== inn.runs) { problems++; console.log('bowler runs mismatch', m.fmtKey, k, br, inn.ext, inn.runs); }
    if (bb !== inn.balls) { problems++; console.log('balls mismatch', m.fmtKey, k, bb, inn.balls); }
    const ro = inn.card.filter(c => c.out && c.how === 'runout').length;
    if (bwk + ro !== inn.wkts) { problems++; console.log('wkts mismatch', m.fmtKey, k, bwk, ro, inn.wkts); }
    for (let i = 1; i < inn.overs.length; i++) if (inn.overs[i].bowler === inn.overs[i - 1].bowler && !F.consec && !inn.so) {
      // allowed only across innings breaks / day breaks? never within innings
      problems++; console.log('consecutive overs', m.fmtKey, k, i, m.p(inn.overs[i].bowler).name); break;
    }
    if (inn.card.filter(c => c.out).length !== inn.wkts) { problems++; console.log('out count mismatch', m.fmtKey, k); }
    const keeper = m.sides[inn.bowl].keeper.id;
    if (inn.bw[keeper]) { problems++; console.log('keeper bowled', m.fmtKey); }
  });
  if (!m.result) { problems++; console.log('no result', m.fmtKey); }
}
const fmts = ['T20', 'T20I', 'ODI', 'HUN', 'TEST', 'FC4'];
let count = 0;
for (const fmt of fmts) for (let i = 0; i < 120; i++) {
  const c = fmt === 'HUN' ? comps.HUN : fmt === 'FC4' ? comps.CC1 : comps.IPL;
  const ts = U.makeRng(i * 3 + 1).shuffle(c.teams.slice());
  const mk = (t) => ({ id: t.id, name: t.name, short: t.short, xi: Sel.pickXI(t.squad.map(x => players[x]), { fmt, maxOverseas: c.osXI }) });
  const full = i % 4 === 0;
  const m = new Match({ format: fmt, teams: [mk(ts[0]), mk(ts[1])], venue: { cc: c.home, pitch: ts[0].pitch }, seed: i, fast: !full, userSide: full ? 0 : null, manual: { bowl: true } });
  m.doToss('H', 0);
  if (m.userSide === m.toss.winner && !m.toss.decision) m.tossDecide('bat');
  let guard = 0;
  while (m.phase === 'play' && guard++ < 40000) {
    if (m.pending && m.pending.type === 'bowler') { const o = m.bowlingOptions(m.cur).filter(x => x.ok); m.chooseBowler(o[(guard * 7) % o.length].p.id); continue; }
    if (m.pending && m.pending.type === 'followon') { m.enforceFollowOn(guard % 2 === 0); continue; }
    if (full && guard % 50 === 0) m.setAggression(m.cur.card[m.cur.st].pid, 1 + (guard % 5));
    if (full && guard % 333 === 0 && !m.F.lo && m.cur.bat === 0 && m.cur.n >= 2) m.declare();
    m.next();
  }
  check(m); count++;
  if (i === 0 && fmt === 'T20') {
    console.log('--- sample commentary (T20, full mode) ---');
    m.events.filter(e => e.text).slice(0, 18).forEach(e => console.log(`[${e.ov || ''}] ${e.text}`));
    console.log('...');
    m.events.filter(e => e.text).slice(-4).forEach(e => console.log(`[${e.ov || ''}] ${e.text}`));
  }
}
console.log(`checked ${count} matches, problems: ${problems}`);
