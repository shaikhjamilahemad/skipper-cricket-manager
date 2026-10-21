import { ui } from '../app/core';

function ConfirmSheet({ msg, ok, cancel, danger, done }) {
  return (
    <>
      <h3>{msg.title || 'Are you sure?'}</h3>
      {msg.body ? <p className="sec dim" style={{ paddingTop: 0 }}>{msg.body}</p> : null}
      <div className="btnrow">
        <button className="btn ghost" onClick={() => { done(false); ui.closeSheet(); }}>{cancel || 'Cancel'}</button>
        <button className={`btn ${danger ? "danger" : ""}`} onClick={() => { done(true); ui.closeSheet(); }}>{ok || 'OK'}</button>
      </div>
    </>
  );
}

// confirm({ title, body }, 'OK label', 'Cancel label', danger) -> Promise<boolean>
export function confirm(msg, ok, cancel, danger) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; resolve(v); } };
    ui.openSheet(<ConfirmSheet msg={msg} ok={ok} cancel={cancel} danger={danger} done={done} />, () => done(false));
  });
}

// Generic sheet title + body helper
export function SheetTitle({ children }) { return <h3>{children}</h3>; }
