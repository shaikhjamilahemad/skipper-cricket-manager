// Small stores that let plain JavaScript (the app controller, timers) drive React.
// nav: the screen stack. ui: sheets, toasts and the busy overlay.
import { useSyncExternalStore } from 'react';

export function makeStore() {
  let version = 0;
  const subs = new Set();
  return {
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    snapshot: () => version,
    notify() { version++; subs.forEach(fn => fn()); },
  };
}
export const useStore = (store) => useSyncExternalStore(store.subscribe, store.snapshot);

const navStore = makeStore();
const sheetStore = makeStore();
const toastStore = makeStore();
const busyStore = makeStore();
export const stores = { nav: navStore, sheet: sheetStore, toast: toastStore, busy: busyStore };

let nextId = 1;

export const ui = {
  sheet: null, // { id, node, onClose }
  toasts: [],
  busy: null, // { text, sub, stoppable }
  stopRequested: false,
  openSheet(node, onClose) {
    if (ui.sheet) { const old = ui.sheet; ui.sheet = null; if (old.onClose) old.onClose(); }
    ui.sheet = { id: nextId++, node, onClose };
    sheetStore.notify();
  },
  closeSheet() {
    const s = ui.sheet; if (!s) return;
    ui.sheet = null; sheetStore.notify();
    if (s.onClose) s.onClose();
  },
  toast(msg, ms) {
    const t = { id: nextId++, msg };
    ui.toasts.push(t); toastStore.notify();
    setTimeout(() => { ui.toasts = ui.toasts.filter(x => x !== t); toastStore.notify(); }, ms || 2200);
  },
  setBusy(on, text, sub, stoppable) {
    ui.busy = on ? { text: text || '', sub: sub || '', stoppable: !!stoppable } : null;
    busyStore.notify();
  },
};

export const nav = {
  stack: [],
  cur: () => nav.stack[nav.stack.length - 1],
  go(name, params, opts) {
    opts = opts || {};
    const c = nav.cur(); if (c) c.scroll = window.scrollY;
    if (opts.replace && nav.stack.length) nav.stack.pop();
    if (opts.reset) nav.stack.length = 0;
    nav.stack.push({ id: nextId++, name, params: params || {}, state: {}, scroll: 0, onBack: null });
    navStore.notify();
  },
  // returns true when the back press was handled (Android uses this to decide whether to exit)
  back() {
    if (ui.sheet) { ui.closeSheet(); return true; }
    if (ui.busy) return true;
    const c = nav.cur();
    if (c && c.onBack && c.onBack() === true) return true;
    if (nav.stack.length > 1) { nav.stack.pop(); navStore.notify(); return true; }
    return false;
  },
  // re-draw the current screen after the game data changed
  refresh() { navStore.notify(); },
};
