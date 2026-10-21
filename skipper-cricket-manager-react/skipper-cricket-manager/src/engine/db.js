/* Skipper — base database helpers (turns window.SKIPPER_DB into game objects) */
(function (G) {
  'use strict';
  const SK = G.SK = G.SK || {};
  const U = SK.U;
  const DB = SK.DB = {};

  DB.NATION_OF = { SCO: 'SCOT' }; // player cc -> national team id (when different)
  DB.CC_NAMES = { IND: 'India', AUS: 'Australia', ENG: 'England', SA: 'South Africa', NZ: 'New Zealand', PAK: 'Pakistan', SL: 'Sri Lanka', WI: 'West Indies', BAN: 'Bangladesh', AFG: 'Afghanistan', IRE: 'Ireland', ZIM: 'Zimbabwe', NED: 'Netherlands', SCO: 'Scotland', NEP: 'Nepal', USA: 'USA', UAE: 'UAE', NAM: 'Namibia', OMA: 'Oman', CAN: 'Canada', ITA: 'Italy', OTH: 'Other' };
  DB.TEST_NATIONS = ['IND', 'AUS', 'ENG', 'SA', 'NZ', 'PAK', 'SL', 'WI', 'BAN', 'AFG', 'IRE', 'ZIM'];

  DB.parseFlags = function (str) {
    const ret = {}; const loc = [];
    (str || '').split(',').map(s => s.trim()).filter(Boolean).forEach(f => {
      if (f === 'rT') ret.T = 1; else if (f === 'rO') ret.O = 1; else if (f === 'rI') ret.I = 1; else if (f === 'rX') ret.X = 1;
      else if (f === 'wb') ret.WB = 1; else if (f === 'rb') ret.RB = 1; else if (f === 'out') ret.OUT = 1; else if (f === 'noipl') ret.NOIPL = 1;
      else if (f.startsWith('loc=')) loc.push(f.slice(4));
    });
    return { ret, loc };
  };
  DB.flagsString = function (p) {
    const out = [];
    if (p.ret.T) out.push('rT'); if (p.ret.O) out.push('rO'); if (p.ret.I) out.push('rI'); if (p.ret.X) out.push('rX');
    if (p.ret.WB) out.push('wb'); if (p.ret.RB) out.push('rb'); if (p.ret.OUT) out.push('out'); if (p.ret.NOIPL) out.push('noipl');
    for (const l of p.loc || []) out.push('loc=' + l);
    return out.join(',');
  };
  // potential: young players can grow, older are at their peak
  DB.estimatePotential = function (p, year) {
    const age = year - p.yob;
    const best = Math.max(p.role === 'BWL' ? 0 : (p.bt * 0.6 + p.bp * 0.4), p.role === 'BAT' || p.role === 'WK' ? 0 : (p.bw * 0.6 + p.be * 0.4));
    const r = (U.hash(p.name + 'pot') % 1000) / 1000;
    let grow = 0;
    if (age <= 19) grow = 10 + r * 22; else if (age <= 22) grow = 6 + r * 16; else if (age <= 25) grow = 2 + r * 9; else if (age <= 28) grow = r * 4;
    return Math.round(U.clamp(best + grow, 30, 97));
  };
  DB.makePlayer = function (a, id, year) {
    const f = DB.parseFlags(a[11]);
    const p = { id, name: a[0], cc: a[1], yob: a[2], hand: a[3], bowl: a[4], role: a[5], bt: a[6], bp: a[7], bw: a[8], be: a[9], fd: a[10], ret: f.ret, loc: f.loc, gen: !!a[12],
      form: 0, fatigue: 0, injury: 0, fit: 100, stats: {}, ss: {}, teams: {}, hist: [] };
    p.pot = DB.estimatePotential(p, year || 2026);
    if (f.ret.OUT) p.retired = year || 2026;
    return p;
  };
  DB.build = function () {
    const raw = G.SKIPPER_DB;
    const players = raw.players.map((a, i) => DB.makePlayer(a, i, 2026));
    const comps = JSON.parse(JSON.stringify(raw.comps));
    return { version: raw.version, players, comps };
  };
  DB.isOverseasFor = function (p, homeCC) {
    if (!homeCC || homeCC === '-') return false;
    if (p.cc === homeCC) return false;
    if (p.loc && p.loc.includes(homeCC)) return false;
    if (homeCC === 'ENG' && (p.cc === 'SCO' || p.cc === 'IRE')) return false;
    return true;
  };
})(typeof window !== 'undefined' ? window : globalThis);
