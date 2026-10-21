/* Skipper — persistence: Android file bridge when available, otherwise browser storage */
(function (G) {
  'use strict';
  const SK = G.SK = G.SK || {};
  const U = SK.U;
  const S = SK.Store = {};
  const B = () => G.AndroidBridge;
  S.hasBridge = () => !!(G.AndroidBridge && G.AndroidBridge.save);

  function rawSet(name, data) {
    if (S.hasBridge()) return B().save(name, data) !== false;
    try { localStorage.setItem('skipper:' + name, U.compress(data)); return true; } catch (e) { console.warn('save failed', e); return false; }
  }
  function rawGet(name) {
    if (S.hasBridge()) { const v = B().load(name); return v == null || v === '' ? null : String(v); }
    try { const v = localStorage.getItem('skipper:' + name); return v == null ? null : U.decompress(v); } catch (e) { console.warn('load failed', e); return null; }
  }
  function rawDel(name) {
    if (S.hasBridge()) return B().remove(name);
    try { localStorage.removeItem('skipper:' + name); } catch (e) { /* ignore */ }
    return true;
  }
  S.rawSet = rawSet; S.rawGet = rawGet; S.rawDel = rawDel;

  // ---------- settings
  S.defaults = { speed: 'normal', manualBowl: true, manualField: false, autoSave: true, auctions: true, commentary: 'full', showField: true, keepAwake: true };
  S.settings = Object.assign({}, S.defaults);
  S.loadSettings = function () { try { const v = rawGet('settings'); if (v) Object.assign(S.settings, JSON.parse(v)); } catch (e) { /* ignore */ } return S.settings; };
  S.saveSettings = function () { rawSet('settings', JSON.stringify(S.settings)); };

  // ---------- games
  S.SLOTS = ['auto', 'slot1', 'slot2', 'slot3'];
  S.metaOf = function (w) {
    const t = w.user && w.user.team ? w.teams[w.user.team] : null;
    return { manager: w.user ? w.user.name : '', team: t ? t.name : 'Unemployed', short: t ? t.short : '', c1: t ? t.c1 : '#333', c2: t ? t.c2 : '#555', comp: t ? t.comp : '', date: w.date, savedAt: Date.now(), mode: w.mode, id: w.id };
  };
  S.saveGame = function (slot, w) {
    try {
      const json = JSON.stringify(w);
      const ok = rawSet('game:' + slot, json) && rawSet('meta:' + slot, JSON.stringify(S.metaOf(w)));
      return ok ? { ok: true, size: json.length } : { ok: false, error: 'Storage is full or unavailable.' };
    } catch (e) { return { ok: false, error: e.message }; }
  };
  S.loadGame = function (slot) {
    const v = rawGet('game:' + slot); if (!v) return null;
    try { return JSON.parse(v); } catch (e) { console.warn(e); return null; }
  };
  S.listSaves = function () {
    return S.SLOTS.map(slot => { let meta = null; try { const v = rawGet('meta:' + slot); meta = v ? JSON.parse(v) : null; } catch (e) { meta = null; } return { slot, meta }; });
  };
  S.latestSave = function () { const all = S.listSaves().filter(s => s.meta); all.sort((a, b) => b.meta.savedAt - a.meta.savedAt); return all[0] || null; };
  S.deleteSave = function (slot) { rawDel('game:' + slot); rawDel('meta:' + slot); };

  // ---------- custom database (edited squads for new games)
  S.getCustomDB = function () { const v = rawGet('db'); if (!v) return null; try { return JSON.parse(v); } catch (e) { return null; } };
  S.setCustomDB = function (db) { return rawSet('db', JSON.stringify(db)); };
  S.clearCustomDB = function () { rawDel('db'); };

  // ---------- file export / import
  S.exportText = function (filename, text) {
    if (S.hasBridge() && B().exportFile) { B().exportFile(filename, text); return new Promise(res => { G.__onExportDone = (ok) => res(!!ok); }); }
    try {
      const blob = new Blob([text], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      return Promise.resolve(true);
    } catch (e) { return Promise.resolve(false); }
  };
  S.importText = function () {
    if (S.hasBridge() && B().importFile) {
      return new Promise(res => { G.__onImportReady = (ok) => { if (!ok) return res(null); try { res(String(B().takeImported())); } catch (e) { res(null); } }; B().importFile(); });
    }
    return new Promise(res => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json,text/plain';
      inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return res(null); const rd = new FileReader(); rd.onload = () => res(String(rd.result)); rd.onerror = () => res(null); rd.readAsText(f); };
      inp.click();
    });
  };
  S.keepAwake = function (on) { try { if (S.hasBridge() && B().keepScreenOn) B().keepScreenOn(!!on); } catch (e) { /* ignore */ } };
})(typeof window !== 'undefined' ? window : globalThis);
