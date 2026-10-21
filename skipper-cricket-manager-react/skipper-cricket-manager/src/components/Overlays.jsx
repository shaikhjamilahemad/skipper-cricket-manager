import { ui, useStore, stores } from '../app/core';

// Sheets, toasts and the busy overlay. Each listens only to its own store, so a busy
// counter ticking does not redraw the screen underneath.
function SheetHost() {
  useStore(stores.sheet);
  const s = ui.sheet;
  if (!s) return null;
  return (
    <div className="backdrop" onClick={(e) => { if (e.target === e.currentTarget) ui.closeSheet(); }}>
      <div className="sheet" role="dialog" key={s.id}>
        <div className="grab" />
        {s.node}
      </div>
    </div>
  );
}
function Toasts() {
  useStore(stores.toast);
  return <>{ui.toasts.map(t => <div className="toast" key={t.id} role="status">{t.msg}</div>)}</>;
}
function Busy() {
  useStore(stores.busy);
  const b = ui.busy;
  if (!b) return null;
  return (
    <div className="busy">
      <div className="box">
        <div className="spinner" />
        <div className="date">{b.text}</div>
        <div className="what">{b.sub}</div>
        {b.stoppable && <button className="btn ghost sm" style={{ marginTop: 18 }} onClick={() => { ui.stopRequested = true; }}>Stop</button>}
      </div>
    </div>
  );
}
export default function Overlays() { return <><SheetHost /><Toasts /><Busy /></>; }
