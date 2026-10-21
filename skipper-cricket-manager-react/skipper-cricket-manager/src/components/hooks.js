import { createContext, useContext, useEffect } from 'react';
import { nav } from '../app/core';

export const EntryCtx = createContext(null);

// Per-screen state that survives going forward and coming back (like the old UI stack).
// Mutate it, then call nav.refresh().
export function useSt(defaults) {
  const entry = useContext(EntryCtx);
  const st = entry.state;
  if (defaults) for (const k of Object.keys(defaults)) if (st[k] === undefined) st[k] = typeof defaults[k] === 'function' ? defaults[k]() : defaults[k];
  return st;
}

// Let a screen handle the back button itself (return true when handled).
export function useBack(fn) {
  const entry = useContext(EntryCtx);
  useEffect(() => {
    entry.onBack = fn;
    return () => { if (entry.onBack === fn) entry.onBack = null; };
  });
}

export const refresh = () => nav.refresh();
