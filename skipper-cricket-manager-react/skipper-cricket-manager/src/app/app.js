// App controller: boot, saving, advancing the calendar, routing between screens.
// Plain JavaScript on purpose: it can be driven from timers and from tests.
import { SK } from '../engine';
import { nav, ui } from './core';

const { U, R, World: W, Store: S } = SK;

export const app = {
  world: null,
  match: null,
  auction: null,
  slot: 'auto',
  _quick: null,
  _bt: null,
  quickPlayers: null,
};

app.boot = function () {
  S.loadSettings();
  const custom = S.getCustomDB();
  if (custom && custom.players && custom.comps) { window.SKIPPER_DB_BASE = window.SKIPPER_DB; window.SKIPPER_DB = custom; }
  // Android calls these from the native side
  window.__onBack = () => nav.back();
  window.__onPause = () => { if (app.world && S.settings.autoSave && !app.match && !app.auction) app.save('auto', true); };
  app.toMenu();
};

app.quickBase = function () {
  if (!app._quick) { const b = SK.DB.build(); app._quick = b; app.quickPlayers = b.players; }
  return app._quick;
};
// forget cached squads after the editor changed them
app.resetBaseCache = function () { app._quick = null; app._bt = null; app.quickPlayers = null; };

app.toMenu = function () {
  if (app.world && S.settings.autoSave) app.save(app.slot || 'auto', true);
  app.match = null; app.world = null;
  nav.go('menu', {}, { reset: true });
};

// ---------------------------------------------------------- team lists for setup screens (no world needed)
app.baseTeams = function (compId) {
  const b = app.quickBase(); app._bt = app._bt || {};
  if (app._bt[compId]) return app._bt[compId];
  const c = b.comps.find(x => x.id === compId);
  const fmtOf = { T20: 'T20', '100': 'HUN', FC4: 'FC4', INT: 'ODI' }[c.fmt] || 'T20';
  const list = c.teams.map(t => {
    const pool = compId === 'INTL' ? b.players.filter(p => p.cc === (t.id === 'SCOT' ? 'SCO' : t.id)) : t.squad.map(i => b.players[i]);
    const isOS = (p) => compId !== 'INTL' && SK.DB.isOverseasFor(p, c.home);
    const fm = compId === 'INTL' ? 'ODI' : fmtOf;
    const pref = t.pref && t.pref[fm === 'T20' ? 'T20I' : fm] ? new Set(t.pref[fm === 'T20' ? 'T20I' : fm]) : null;
    const xi = SK.Sel.pickXI(pool, { fmt: fm, maxOverseas: compId === 'INTL' ? 11 : c.osXI, isOverseas: isOS, pitch: t.pitch, pref });
    return { key: compId + ':' + t.id, comp: compId, id: t.id, name: t.name, short: t.short, c1: t.c1, c2: t.c2, venue: t.venue, city: t.city, pitch: t.pitch, cap: null, pool, strength: U.avg(xi, p => R.overall(p, fm)), cc: compId === 'INTL' ? (t.id === 'SCOT' ? 'SCO' : t.id) : c.home, home: c.home, osXI: c.osXI, pref: t.pref, caps: t.caps };
  }).sort((a, b) => b.strength - a.strength);
  app._bt[compId] = list; return list;
};
app.findBaseTeam = function (key) { const comp = key.split(':')[0]; return app.baseTeams(comp).find(t => t.key === key); };

// ---------------------------------------------------------- career lifecycle
app.startCareer = function (opts) {
  ui.setBusy(true, 'Building the world', 'Loading squads, fixtures and the calendar');
  setTimeout(() => {
    try {
      const w = W.create({ userTeam: opts.team, manager: opts.manager, mode: opts.oneSeason ? 'tournament' : 'career', settings: { auctions: opts.auctions !== false } });
      if (opts.oneSeason) { w.user.oneSeason = true; w.user.oneEd = opts.edition || null; }
      app.world = w; app.slot = opts.slot || 'auto';
      app.save(app.slot, true);
      ui.setBusy(false);
      nav.go('home', {}, { reset: true });
    } catch (e) { console.error(e); ui.setBusy(false); ui.toast('Could not start: ' + e.message, 4000); }
  }, 40);
};

app.startTournament = function (comp, teamKey) {
  ui.setBusy(true, 'Setting up', 'Building the tournament');
  setTimeout(() => {
    try {
      const icc = ['T20WC', 'ODIWC', 'CT'].includes(comp);
      const w = W.create({ userTeam: teamKey, manager: S.settings.lastManager || 'The Skipper', mode: 'tournament', settings: { auctions: false } });
      w.user.oneSeason = true;
      if (icc) {
        // play the event now; only the tournament stops the calendar
        const start = w.date + 10;
        const host = W.ccOfNat(teamKey);
        const ev = { icc: { type: comp, teams: comp === 'T20WC' ? 20 : comp === 'ODIWC' ? 14 : 8, host: comp === 'CT' ? 'IND' : host }, season: 2027, start };
        const ed = W.createICC(w, ev);
        for (const k of ed.teams) if (k !== teamKey) ed.squads[k] = { [ed.fmt]: W.selectNationalSquad(w, k, ed.fmt, 15) };
        W.assignDuty(w, ed);
        w.user.oneEd = ed.id;
        SK.Career.setObjective(w, ed);
        if (!ed.teams.includes(teamKey)) { ui.setBusy(false); ui.toast('That team did not qualify.'); return; }
        w.user.onlyEd = ed.id;
      } else {
        const ed = Object.values(w.editions).find(e => e.comp === comp && e.type === 'league');
        w.user.oneEd = ed.id; w.user.onlyEd = ed.id;
      }
      app.world = w; app.slot = 'auto'; app.save('auto', true);
      ui.setBusy(false); nav.go('home', {}, { reset: true });
    } catch (e) { console.error(e); ui.setBusy(false); ui.toast('Could not start: ' + e.message, 4000); }
  }, 40);
};

app.loadSlot = function (slot) {
  ui.setBusy(true, 'Loading', '');
  setTimeout(() => {
    const w = S.loadGame(slot);
    ui.setBusy(false);
    if (!w) { ui.toast('That save could not be read.'); return; }
    app.world = w; app.slot = slot === 'auto' ? 'auto' : slot;
    nav.go('home', {}, { reset: true });
  }, 30);
};

app.save = function (slot, quiet) {
  if (!app.world) return false;
  const r = S.saveGame(slot || app.slot, app.world);
  if (!quiet) ui.toast(r.ok ? 'Game saved.' : 'Save failed: ' + r.error);
  return r.ok;
};
app.autosave = function () { if (S.settings.autoSave) app.save('auto', true); };
app.tab = function (name) { nav.go(name, {}, { reset: true }); };

// ---------------------------------------------------------- advancing time
app.continue = function () {
  const w = app.world; if (!w) return;
  ui.stopRequested = false;
  let simmed = 0;
  const startDate = w.date;
  ui.setBusy(true, U.fmtDate(w.date), 'Simulating', true);
  const stopIf = () => w.user && (w.user.alert || w.user.finishedTournament);
  const tick = () => {
    let r;
    try { r = W.advance(w, { budgetMs: 45 }); } catch (e) { console.error(e); ui.setBusy(false); ui.toast('Simulation error: ' + e.message, 5000); return; }
    simmed += r.simmed || 0;
    if (ui.busy) ui.setBusy(true, U.fmtDate(w.date), `${simmed} match${simmed === 1 ? '' : 'es'} played around the world`, true);
    if (r.stop === 'user') { ui.setBusy(false); app.handleStop(r); return; }
    if (stopIf()) { ui.setBusy(false); app.handleAlert(); return; }
    if (ui.stopRequested) { ui.setBusy(false); app.autosave(); nav.refresh(); return; }
    if (r.stop === 'empty') { ui.setBusy(false); ui.toast('Nothing left to play.'); return; }
    if (w.date - startDate > 400 && !w.user.team) { ui.setBusy(false); app.autosave(); nav.go('home', {}, { reset: true }); return; }
    setTimeout(tick, 0);
  };
  setTimeout(tick, 20);
};

app.handleStop = function (r) {
  app.autosave();
  if (app.world.user.alert) { app.handleAlert(r); return; }
  if (r.type === 'match') nav.go('prematch', { ctx: { kind: 'career', fxId: r.fx.id } }, { reset: true });
  else if (r.type === 'squad') nav.go('natSquad', { ed: r.ed.id, ev: r.ev ? r.ev.id : null }, { reset: true });
  else if (r.type === 'retention') nav.go('retention', { ev: r.ev.id }, { reset: true });
  else if (r.type === 'auction') nav.go('auctionIntro', { ev: r.ev.id }, { reset: true });
  else nav.go('home', {}, { reset: true });
};
app.handleAlert = function (pendingStop) {
  const w = app.world; const a = w.user.alert;
  app.autosave();
  if (w.user.finishedTournament) { nav.go('tournamentDone', {}, { reset: true }); return; }
  if (a) nav.go('review', { alert: a, pending: pendingStop ? true : false }, { reset: true });
};
app.afterUserMatch = function (fx) {
  app.autosave();
  nav.go('matchReport', { fx: fx.id }, { reset: true });
};
// a fixture the user chose to simulate from the pre-match screen
app.simUserFixture = function (fxId) {
  const w = app.world; const fx = w.fx[fxId];
  const m = W.buildMatch(w, fx, { fast: true, userSide: null });
  m.doToss(); m.simToEnd(80000);
  W.applyMatch(w, fx, m);
  w.queue = w.queue.filter(q => q.id !== fx.id);
  app.afterUserMatch(fx);
};
