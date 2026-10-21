// Read-only helpers over the current world, shared by several screens.
import { SK } from '../engine';
import { app } from './app';

const { U, World: W } = SK;

export const world = () => app.world;
export const userTeam = () => { const w = app.world; return w.user.team ? w.teams[w.user.team] : null; };
export const fmtForTeam = (t) => {
  if (!t) return 'T20';
  const c = app.world.comps[t.comp];
  return t.comp === 'INTL' ? 'ODI' : c.fmt === '100' ? 'HUN' : c.fmt === 'FC4' ? 'FC4' : 'T20';
};
export const userEditions = () => {
  const w = app.world; const k = w.user.team; if (!k) return [];
  return Object.values(w.editions).filter(e => e.teams && e.teams.includes(k) && !e.pruned).sort((a, b) => a.start - b.start);
};
export const currentEdition = () => {
  const eds = userEditions(); const w = app.world;
  return eds.find(e => e.status === 'live') || eds.filter(e => e.status === 'scheduled' && e.start >= w.date - 1)[0] || eds.filter(e => e.status === 'done').pop() || null;
};
export const anyEdition = () => {
  const w = app.world;
  const live = Object.values(w.editions).filter(e => e.status === 'live' && e.type !== 'series');
  return live.length ? live[0].id : null;
};
export const resultFor = (fx, key) => {
  const r = fx.result; if (!r) return '';
  if (!r.winner) return r.kind === 'tie' ? 'T' : 'D';
  return r.winner === key ? 'W' : 'L';
};
export const scoreLine = (fx) => {
  const w = app.world; const r = fx.result; if (!r) return '';
  return r.inns.map(i => `${w.teams[i.team].short} ${i.runs}/${i.wkts}${i.dec ? 'd' : ''}`).join(', ');
};
export const oppOf = (fx, key) => (fx.home === key ? fx.away : fx.home);
// a player from the running career, or from the base database in quick matches
export const playerById = (id) => (app.world ? app.world.players[id] : (app.quickPlayers || [])[id]);
export const ageOf = (x) => (app.world ? W.age(app.world, x) : 2026 - x.yob);
export const fmtDate = U.fmtDate;
