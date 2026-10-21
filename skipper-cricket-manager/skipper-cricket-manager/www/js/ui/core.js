/* Skipper — tiny UI framework: screens, navigation stack, sheets, toasts, shared components */
(function (G) {
  'use strict';
  const SK = G.SK = G.SK || {};
  const U = SK.U;
  const UI = SK.UI = { screens: {}, stack: [], actions: {}, sheetActions: null, sheetEl: null };
  const esc = U.esc;
  UI.esc = esc;

  UI.icons = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    chev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/></svg>',
    squad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.3c2.3.2 4.1 1.9 4.9 4.7"/></svg>',
    fixtures: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
    table: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 6h14M5 12h14M5 18h14"/><path d="M9 4v16"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    bat: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M14.5 3.5l6 6-9.8 9.8a2 2 0 0 1-2.8 0l-3.2-3.2a2 2 0 0 1 0-2.8z"/><path d="M5.2 15.6l3.2 3.2-2.2 2.2-3.2-3.2z" opacity=".6"/></svg>',
    ball: '<svg viewBox="0 0 24 24" width="14" height="14"><circle cx="12" cy="12" r="8" fill="#c8312f"/><path d="M7 6.5c2.5 3 2.5 8 0 11M17 6.5c-2.5 3-2.5 8 0 11" stroke="#f3d7c6" stroke-width="1.2" fill="none" stroke-dasharray="1.6 1.4"/></svg>',
  };

  // ---------------------------------------------------------- navigation
  UI.register = (name, def) => { UI.screens[name] = def; };
  UI.cur = () => UI.stack[UI.stack.length - 1];
  UI.go = function (name, params, opts) {
    opts = opts || {};
    const c = UI.cur(); if (c) c.scroll = window.scrollY;
    if (opts.replace && UI.stack.length) UI.stack.pop();
    if (opts.reset) UI.stack.length = 0;
    UI.stack.push({ name, params: params || {}, state: {} });
    UI.render(true);
  };
  UI.back = function () {
    if (UI.sheetEl) { UI.closeSheet(); return true; }
    if (UI.busyEl) return true;
    const c = UI.cur(); const def = c && UI.screens[c.name];
    if (def && def.onBack && def.onBack(c.params, c.state) === true) return true;
    if (UI.stack.length > 1) {
      const leaving = UI.stack.pop(); const ldef = UI.screens[leaving.name]; if (ldef && ldef.unmount) ldef.unmount(leaving.params, leaving.state);
      UI.render(false); return true;
    }
    return false;
  };
  UI.render = function (fresh) {
    const c = UI.cur(); if (!c) return;
    const def = UI.screens[c.name];
    if (!def) { UI.root.innerHTML = `<div class="empty">Unknown screen ${esc(c.name)}</div>`; return; }
    const title = typeof def.title === 'function' ? def.title(c.params, c.state) : def.title;
    const sub = def.sub ? def.sub(c.params, c.state) : '';
    const showBack = def.back !== false && UI.stack.length > 1;
    const right = def.right ? def.right(c.params, c.state) : '';
    const tabs = def.tabs ? UI.tabBar(def.tabs) : '';
    const top = def.noTop ? '' : `<header class="top">${showBack ? `<button class="iconbtn" data-act="__back" aria-label="Back">${UI.icons.back}</button>` : '<span style="width:6px"></span>'}<h1>${esc(title || '')}${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</h1>${right}</header>`;
    let body = '';
    try { body = def.render(c.params, c.state); }
    catch (e) { console.error(e); body = `<div class="empty">Something went wrong drawing this screen.<br><span class="tiny dimmer">${esc(e.message)}</span></div>`; }
    UI.root.innerHTML = `<div class="screen ${def.tabs ? '' : 'no-tabs'} ${def.cls || ''}">${top}${body}</div>${tabs}`;
    if (def.mount) { try { def.mount(UI.root, c.params, c.state); } catch (e) { console.error(e); } }
    window.scrollTo(0, fresh ? 0 : (c.scroll || 0));
  };
  UI.refresh = () => { const c = UI.cur(); if (c) c.scroll = window.scrollY; UI.render(false); };

  UI.tabBar = function (active) {
    const items = [['home', 'Home', 'home'], ['squad', 'Squad', 'squad'], ['fixtures', 'Fixtures', 'fixtures'], ['tables', 'Tables', 'table'], ['more', 'More', 'more']];
    return `<nav class="tabs">${items.map(([k, l, ic]) => `<button class="${active === k ? 'on' : ''}" data-act="__tab" data-arg="${k}">${UI.icons[ic]}<span>${l}</span></button>`).join('')}</nav>`;
  };

  // ---------------------------------------------------------- events
  UI.handle = function (el, ev) {
    const act = el.dataset.act; const arg = el.dataset.arg;
    if (act === '__back') { UI.back(); return; }
    if (act === '__tab') { SK.App && SK.App.tab(arg); return; }
    if (act === '__closeSheet') { UI.closeSheet(); return; }
    if (el.closest('.sheet') && UI.sheetActions && UI.sheetActions[act]) { UI.sheetActions[act](arg, el, ev); return; }
    const c = UI.cur(); const def = c && UI.screens[c.name];
    if (def && def.actions && def.actions[act]) { def.actions[act](arg, el, c.params, c.state, ev); return; }
    if (UI.actions[act]) UI.actions[act](arg, el, ev);
  };
  UI.init = function (root) {
    UI.root = root;
    document.addEventListener('click', (ev) => {
      const el = ev.target.closest('[data-act]');
      if (!el) { if (ev.target.classList && ev.target.classList.contains('backdrop')) UI.closeSheet(); return; }
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT') return;
      ev.preventDefault();
      UI.handle(el, ev);
    });
    document.addEventListener('change', (ev) => {
      const el = ev.target.closest('[data-change]'); if (!el) return;
      const act = el.dataset.change;
      const handler = (el.closest('.sheet') && UI.sheetActions && UI.sheetActions[act]) || (() => { const c = UI.cur(); const def = c && UI.screens[c.name]; return def && def.actions && def.actions[act] && ((a, e) => def.actions[act](a, e, c.params, c.state)); })();
      if (handler) handler(el.value, el);
    });
    window.__onBack = () => UI.back();
  };

  // ---------------------------------------------------------- sheets, toasts, confirm, busy
  UI.sheet = function (html, actions) {
    UI.closeSheet();
    const bd = document.createElement('div'); bd.className = 'backdrop';
    bd.innerHTML = `<div class="sheet" role="dialog"><div class="grab"></div>${html}</div>`;
    document.body.appendChild(bd); UI.sheetEl = bd; UI.sheetActions = actions || {};
    return bd.querySelector('.sheet');
  };
  UI.closeSheet = function () { if (UI.sheetEl) { UI.sheetEl.remove(); UI.sheetEl = null; UI.sheetActions = null; } };
  UI.toast = function (msg, ms) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.remove(), ms || 2200);
  };
  UI.confirm = function (msg, ok, cancel, danger) {
    return new Promise(res => {
      UI.sheet(`<h3>${esc(msg.title || 'Are you sure?')}</h3>${msg.body ? `<p class="sec dim" style="padding-top:0">${esc(msg.body)}</p>` : ''}<div class="btnrow"><button class="btn ghost" data-act="no">${esc(cancel || 'Cancel')}</button><button class="btn ${danger ? 'danger' : ''}" data-act="yes">${esc(ok || 'OK')}</button></div>`,
        { yes: () => { UI.closeSheet(); res(true); }, no: () => { UI.closeSheet(); res(false); } });
    });
  };
  UI.busy = function (on, text, sub) {
    if (!on) { if (UI.busyEl) { UI.busyEl.remove(); UI.busyEl = null; } return; }
    if (!UI.busyEl) { UI.busyEl = document.createElement('div'); UI.busyEl.className = 'busy'; UI.busyEl.innerHTML = '<div class="box"><div class="spinner"></div><div class="date"></div><div class="what"></div><button class="btn ghost sm" data-act="__stopBusy" style="margin-top:18px" hidden>Stop</button></div>'; document.body.appendChild(UI.busyEl); }
    UI.busyEl.querySelector('.date').textContent = text || '';
    UI.busyEl.querySelector('.what').textContent = sub || '';
  };
  UI.actions.__stopBusy = () => { UI.stopRequested = true; };

  // ---------------------------------------------------------- shared components
  UI.badge = function (team, size) {
    if (!team) return `<span class="badge ${size || ''}" style="--b1:#333;--b2:#555">?</span>`;
    const s = (team.short || team.name || '?').slice(0, 4);
    return `<span class="badge ${size || ''}" style="--b1:${team.c1};--b2:${team.c2}" aria-hidden="true">${esc(s)}</span>`;
  };
  UI.flag = (cc) => `<span class="flag">${esc(cc)}</span>`;
  UI.roleName = { BAT: 'Batter', WK: 'Wicketkeeper', AR: 'All-rounder', BWL: 'Bowler' };
  UI.roleShort = { BAT: 'BAT', WK: 'WK', AR: 'AR', BWL: 'BWL' };
  UI.bowlShort = { RF: 'RF', RFM: 'RFM', RM: 'RM', LF: 'LF', LFM: 'LFM', LM: 'LM', OB: 'OB', LB: 'LB', SLA: 'SLA', LWS: 'LWS', '-': '' };
  UI.mini = (v) => `<span class="mini"><i style="width:${U.clamp(v, 0, 99)}%"></i></span>`;
  UI.formArrow = function (f, quiet) {
    f = f || 0;
    if (f > 3) return '<span class="pos" title="In form">▲</span>';
    if (f < -3) return '<span class="neg" title="Out of form">▼</span>';
    return quiet ? '' : '<span class="dimmer">–</span>';
  };
  UI.stars = function (v) { // v 0-100 -> 0.5..5 stars
    const n = U.clamp(Math.round((v - 45) / 9), 1, 5);
    return `<span class="stars" aria-label="${n} of 5">${'★'.repeat(n)}<span class="dimmer">${'★'.repeat(5 - n)}</span></span>`;
  };
  UI.rbar = (label, v) => `<div class="rbar"><span class="l">${esc(label)}</span><span class="track"><span class="fill" style="width:${U.clamp(v, 0, 99)}%"></span></span><span class="v">${Math.round(v)}</span></div>`;
  UI.seg = function (act, options, value, cls) {
    return `<div class="seg ${cls || ''}" role="group">${options.map(([v, l]) => `<button class="${String(v) === String(value) ? 'on' : ''}" data-act="${act}" data-arg="${esc(v)}">${esc(l)}</button>`).join('')}</div>`;
  };
  UI.toggle = (change, checked, arg) => `<label class="toggle"><input type="checkbox" data-change="${change}" ${checked ? 'checked' : ''} value="${esc(arg || '')}"><span></span></label>`;
  UI.pct = (v) => `${Math.round(v)}%`;
})(typeof window !== 'undefined' ? window : globalThis);
