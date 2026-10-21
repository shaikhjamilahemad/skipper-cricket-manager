/* Skipper — app controller: boot, saving, advancing the calendar, routing between screens */
(function (G) {
  'use strict';
  const SK = G.SK = G.SK || {};
  const U = SK.U, UI = SK.UI, W = SK.World, S = SK.Store;
  const App = SK.App = { world: null, match: null, slot: 'auto' };

  App.boot = function () {
    S.loadSettings();
    const custom = S.getCustomDB();
    if (custom && custom.players && custom.comps) { G.SKIPPER_DB_BASE = G.SKIPPER_DB; G.SKIPPER_DB = custom; }
    UI.init(document.getElementById('app'));
    G.__onPause = () => { if (App.world && S.settings.autoSave && !App.match && !App.auction) App.save('auto', true); };
    App.toMenu();
  };
  App.quickBase = function () {
    if (!App._quick) { const b = SK.DB.build(); App._quick = b; App.quickPlayers = b.players; }
    return App._quick;
  };
  App.toMenu = function () {
    if (App.world && S.settings.autoSave) App.save(App.slot || 'auto', true);
    App.match = null; App.world = null;
    UI.go('menu', {}, { reset: true });
  };

  // ---------------------------------------------------------- career lifecycle
  App.startCareer = function (opts) {
    UI.busy(true, 'Building the world', 'Loading squads, fixtures and the calendar');
    setTimeout(() => {
      try {
        const w = W.create({ userTeam: opts.team, manager: opts.manager, mode: opts.oneSeason ? 'tournament' : 'career', settings: { auctions: opts.auctions !== false } });
        if (opts.oneSeason) { w.user.oneSeason = true; w.user.oneEd = opts.edition || null; }
        App.world = w; App.slot = opts.slot || 'auto';
        App.save(App.slot, true);
        UI.busy(false);
        UI.go('home', {}, { reset: true });
      } catch (e) { console.error(e); UI.busy(false); UI.toast('Could not start: ' + e.message, 4000); }
    }, 40);
  };
  App.loadSlot = function (slot) {
    UI.busy(true, 'Loading', '');
    setTimeout(() => {
      const w = S.loadGame(slot);
      UI.busy(false);
      if (!w) { UI.toast('That save could not be read.'); return; }
      App.world = w; App.slot = slot === 'auto' ? 'auto' : slot;
      UI.go('home', {}, { reset: true });
    }, 30);
  };
  App.save = function (slot, quiet) {
    if (!App.world) return false;
    const r = S.saveGame(slot || App.slot, App.world);
    if (!quiet) UI.toast(r.ok ? 'Game saved.' : 'Save failed: ' + r.error);
    return r.ok;
  };
  App.tab = function (name) { UI.go(name, {}, { reset: true }); };

  // ---------------------------------------------------------- advancing time
  App.continue = function () {
    const w = App.world; if (!w) return;
    UI.stopRequested = false;
    let simmed = 0;
    const startDate = w.date;
    UI.busy(true, U.fmtDate(w.date), 'Simulating');
    const busyBtn = UI.busyEl && UI.busyEl.querySelector('[data-act=__stopBusy]'); if (busyBtn) busyBtn.hidden = false;
    const stopIf = () => w.user && (w.user.alert || w.user.finishedTournament);
    const tick = () => {
      let r;
      try { r = W.advance(w, { budgetMs: 45 }); } catch (e) { console.error(e); UI.busy(false); UI.toast('Simulation error: ' + e.message, 5000); return; }
      simmed += r.simmed || 0;
      if (UI.busyEl) UI.busy(true, U.fmtDate(w.date), `${simmed} match${simmed === 1 ? '' : 'es'} played around the world`);
      if (r.stop === 'user') { UI.busy(false); App.handleStop(r); return; }
      if (stopIf()) { UI.busy(false); App.handleAlert(); return; }
      if (UI.stopRequested) { UI.busy(false); App.autosave(); UI.refresh(); return; }
      if (r.stop === 'empty') { UI.busy(false); UI.toast('Nothing left to play.'); return; }
      if (w.date - startDate > 400 && !w.user.team) { UI.busy(false); App.autosave(); UI.go('home', {}, { reset: true }); return; }
      setTimeout(tick, 0);
    };
    setTimeout(tick, 20);
  };
  App.autosave = function () { if (S.settings.autoSave) App.save('auto', true); };
  App.handleStop = function (r) {
    App.autosave();
    if (App.world.user.alert) { App.handleAlert(r); return; }
    if (r.type === 'match') UI.go('prematch', { ctx: { kind: 'career', fxId: r.fx.id } }, { reset: true });
    else if (r.type === 'squad') UI.go('natSquad', { ed: r.ed.id, ev: r.ev ? r.ev.id : null }, { reset: true });
    else if (r.type === 'retention') UI.go('retention', { ev: r.ev.id }, { reset: true });
    else if (r.type === 'auction') UI.go('auctionIntro', { ev: r.ev.id }, { reset: true });
    else UI.go('home', {}, { reset: true });
  };
  App.handleAlert = function (pendingStop) {
    const w = App.world; const a = w.user.alert;
    App.autosave();
    if (w.user.finishedTournament) { UI.go('tournamentDone', {}, { reset: true }); return; }
    if (a) { UI.go('review', { alert: a, pending: pendingStop ? true : false }, { reset: true }); }
  };
  App.afterUserMatch = function (fx) {
    const w = App.world;
    App.autosave();
    UI.go('matchReport', { fx: fx.id }, { reset: true });
    void w;
  };
  // a fixture the user chose to simulate from the home screen
  App.simUserFixture = function (fxId) {
    const w = App.world; const fx = w.fx[fxId];
    const m = W.buildMatch(w, fx, { fast: true, userSide: null });
    m.doToss(); m.simToEnd(80000);
    W.applyMatch(w, fx, m);
    w.queue = w.queue.filter(q => q.id !== fx.id);
    App.afterUserMatch(fx);
  };
})(typeof window !== 'undefined' ? window : globalThis);
