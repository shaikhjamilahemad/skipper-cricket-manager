/* Skipper Cricket Manager — utilities */
(function (G) {
  'use strict';
  const SK = G.SK = G.SK || {};
  const U = SK.U = {};

  // ---------- seeded RNG (sfc32) ----------
  U.makeRng = function (seed) {
    let a = 0x9E3779B9, b = 0x243F6A88, c = 0xB7E15162, d = (seed >>> 0) || 1;
    const next = function () {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
      let t = (a + b) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      d = (d + 1) | 0;
      t = (t + d) | 0;
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
    for (let i = 0; i < 12; i++) next();
    const r = next;
    r.int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
    r.pick = (arr) => arr[Math.floor(next() * arr.length)];
    r.chance = (p) => next() < p;
    r.normal = () => { let u = 0, v = 0; while (u === 0) u = next(); while (v === 0) v = next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    r.weighted = (weights) => { let s = 0; for (const w of weights) s += w; let x = next() * s; for (let i = 0; i < weights.length; i++) { x -= weights[i]; if (x <= 0) return i; } return weights.length - 1; };
    r.shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; };
    return r;
  };
  U.hash = function (str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  U.clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.sum = (arr, f) => { let s = 0; for (const x of arr) s += f ? f(x) : x; return s; };
  U.avg = (arr, f) => (arr.length ? U.sum(arr, f) / arr.length : 0);
  U.by = (f, desc) => (a, b) => { const x = f(a), y = f(b); return desc ? (y > x ? 1 : y < x ? -1 : 0) : (x > y ? 1 : x < y ? -1 : 0); };
  U.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // ---------- formatting ----------
  U.overs = (balls, bpo) => { bpo = bpo || 6; const o = Math.floor(balls / bpo), b = balls % bpo; return b ? `${o}.${b}` : `${o}`; };
  U.rr = (runs, balls) => (balls ? (runs * 6 / balls).toFixed(2) : '0.00');
  U.sr = (runs, balls) => (balls ? (runs * 100 / balls).toFixed(1) : '-');
  U.avgStr = (runs, outs) => (outs ? (runs / outs).toFixed(2) : (runs ? '—' : '-'));
  U.econ = (runs, balls) => (balls ? (runs * 6 / balls).toFixed(2) : '-');
  U.money = (v, cur) => {
    if (!cur) return String(v);
    if (cur.startsWith('INR')) return `₹${(+v).toFixed(v < 10 ? 2 : 1).replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1')} Cr`;
    const sym = cur.startsWith('USD') ? '$' : cur.startsWith('GBP') ? '£' : cur.startsWith('AUD') ? 'A$' : cur.startsWith('ZAR') ? 'R' : '';
    const unit = cur.endsWith(' m') ? 'm' : 'k';
    return `${sym}${Math.round(v * 10) / 10}${unit}`;
  };
  U.ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };

  // ---------- dates (day index 0 = 1 Nov 2026) ----------
  const EPOCH = Date.UTC(2026, 10, 1);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  U.MONTHS = MONTHS;
  U.dayToDate = (d) => new Date(EPOCH + d * 86400000);
  U.dateToDay = (y, m, dd) => Math.round((Date.UTC(y, m, dd) - EPOCH) / 86400000);
  U.fmtDate = (d, withYear = true) => { const dt = U.dayToDate(d); return `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]}${withYear ? ' ' + dt.getUTCFullYear() : ''}`; };
  U.yearOf = (d) => U.dayToDate(d).getUTCFullYear();
  U.monthOf = (d) => U.dayToDate(d).getUTCMonth();

  // ---------- names ----------
  const PARTICLES = new Set(['de', 'van', 'der', 'du', 'von', 'da', 'ul', 'bin', 'ur', 'le', 'la', 'di', 'ten']);
  U.surname = function (full) {
    const clean = full.replace(/\s*\(.*\)\s*$/, '').trim();
    const parts = clean.split(/\s+/);
    if (parts.length === 1) return parts[0];
    let i = parts.length - 1;
    while (i > 1 && PARTICLES.has(parts[i - 1].toLowerCase())) i--;
    return parts.slice(i).join(' ');
  };
  U.shortName = function (full) {
    const clean = full.replace(/\s*\(.*\)\s*$/, '').trim();
    const parts = clean.split(/\s+/);
    if (parts.length === 1) return parts[0];
    const sur = U.surname(clean);
    const first = parts.slice(0, parts.length - sur.split(' ').length);
    const initials = first.map(w => (w.length <= 3 && w === w.toUpperCase()) ? w : w[0]).join('');
    return `${initials} ${sur}`;
  };

  // ---------- small LZW compressor for browser saves (all output units < 0xD800) ----------
  const MAXD = 50000, ESC = 50001, RST = 50002;
  U.compress = function (str) {
    if (!str) return '';
    let dict = new Map(); let next = 256; let w = '';
    const out = [];
    const reset = () => { dict = new Map(); for (let i = 0; i < 256; i++) dict.set(String.fromCharCode(i), i); next = 256; };
    reset();
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      const code = c.charCodeAt(0);
      if (code > 255) {
        if (w) { out.push(dict.get(w)); w = ''; }
        out.push(ESC, code >> 8, code & 255);
        continue;
      }
      const wc = w + c;
      if (dict.has(wc)) w = wc;
      else {
        out.push(dict.get(w));
        if (next < MAXD) dict.set(wc, next++);
        else { reset(); out.push(RST); }
        w = c;
      }
    }
    if (w) out.push(dict.get(w));
    let s = '';
    const CH = 8192;
    for (let i = 0; i < out.length; i += CH) s += String.fromCharCode.apply(null, out.slice(i, i + CH));
    return s;
  };
  U.decompress = function (s) {
    if (!s) return '';
    let dict; let next; const out = []; let w = null;
    const reset = () => { dict = []; for (let j = 0; j < 256; j++) dict[j] = String.fromCharCode(j); next = 256; };
    reset();
    for (let i = 0; i < s.length; i++) {
      const k = s.charCodeAt(i);
      if (k === ESC) { out.push(String.fromCharCode((s.charCodeAt(i + 1) << 8) | s.charCodeAt(i + 2))); i += 2; w = null; continue; }
      if (k === RST) { reset(); w = null; continue; }
      let entry;
      if (k < next && dict[k] !== undefined) entry = dict[k];
      else if (k === next && w !== null) entry = w + w[0];
      else throw new Error('bad save data');
      out.push(entry);
      if (w !== null && next < MAXD) dict[next++] = w + entry[0];
      w = entry;
    }
    return out.join('');
  };
})(typeof window !== 'undefined' ? window : globalThis);
