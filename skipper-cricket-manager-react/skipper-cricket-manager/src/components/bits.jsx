// Small shared pieces: team badge, stars, rating bar, segmented control, toggle...
import { useState } from 'react';
import { SK } from '../engine';

const { U } = SK;

export function Badge({ team, size }) {
  if (!team) return <span className={`badge ${size || ''}`} style={{ '--b1': '#333', '--b2': '#555' }}>?</span>;
  const s = (team.short || team.name || '?').slice(0, 4);
  return <span className={`badge ${size || ''}`} style={{ '--b1': team.c1, '--b2': team.c2 }} aria-hidden="true">{s}</span>;
}

export function Stars({ v }) {
  const n = U.clamp(Math.round((v - 45) / 9), 1, 5);
  return <span className="stars" aria-label={`${n} of 5`}>{'★'.repeat(n)}<span className="dimmer">{'★'.repeat(5 - n)}</span></span>;
}

export function RBar({ label, v }) {
  return (
    <div className="rbar">
      <span className="l">{label}</span>
      <span className="track"><span className="fill" style={{ width: U.clamp(v, 0, 99) + '%' }} /></span>
      <span className="v">{Math.round(v)}</span>
    </div>
  );
}

export function FormArrow({ f, quiet }) {
  f = f || 0;
  if (f > 3) return <span className="pos" title="In form">▲</span>;
  if (f < -3) return <span className="neg" title="Out of form">▼</span>;
  return quiet ? null : <span className="dimmer">–</span>;
}

export function Pill({ kind, children }) {
  return <span className={`pill ${kind || ''}`}>{children}</span>;
}

// options: [[value, label], ...]
export function Seg({ options, value, onChange, cls }) {
  return (
    <div className={`seg ${cls || ''}`} role="group">
      {options.map(([v, l]) => (
        <button key={v} className={String(v) === String(value) ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}

// keeps its own on/off state so it also works inside sheets
export function Toggle({ checked, onChange }) {
  const [on, setOn] = useState(!!checked);
  return (
    <label className="toggle">
      <input type="checkbox" checked={on} onChange={(e) => { setOn(e.target.checked); onChange && onChange(e.target.checked); }} />
      <span />
    </label>
  );
}

export function Empty({ children, small }) {
  return <div className={`empty ${small ? 'small' : ''}`}>{children}</div>;
}

export function Sec({ title, children, hrow, style }) {
  return <div className={`sec ${hrow ? 'hrow' : ''}`} style={style}>{title && <h2>{title}</h2>}{children}</div>;
}

export const money = (v, cur) => U.money(v, cur);
