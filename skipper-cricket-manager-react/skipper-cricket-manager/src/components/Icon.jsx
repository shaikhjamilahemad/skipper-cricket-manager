const P = {
  back: <path d="M15 5l-7 7 7 7" />,
  chev: <path d="M9 6l6 6-6 6" />,
  home: <path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />,
  squad: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5" /><circle cx="17" cy="9" r="2.6" /><path d="M15.5 14.3c2.3.2 4.1 1.9 4.9 4.7" /></>,
  fixtures: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  table: <><path d="M5 6h14M5 12h14M5 18h14" /><path d="M9 4v16" /></>,
  edit: <path d="M4 20h4L19 9l-4-4L4 16z" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  save: <><path d="M5 4h11l3 3v13H5z" /><path d="M8 4v5h7V4M8 20v-6h8v6" /></>,
};
const STROKE = { back: 2.4, chev: 2.2, close: 2.4 };

export default function Icon({ name }) {
  if (name === 'more') return <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>;
  const size = name === 'chev' ? { width: 18, height: 18 } : {};
  return (
    <svg viewBox="0 0 24 24" {...size} fill="none" stroke="currentColor" strokeWidth={STROKE[name] || 2} strokeLinecap="round" strokeLinejoin="round">
      {P[name]}
    </svg>
  );
}
