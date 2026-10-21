import Icon from './Icon';
import { nav } from '../app/core';
import { app } from '../app/app';

const TABS = [['home', 'Home', 'home'], ['squad', 'Squad', 'squad'], ['fixtures', 'Fixtures', 'fixtures'], ['tables', 'Tables', 'table'], ['more', 'More', 'more']];

export function IconBtn({ icon, label, onClick }) {
  return <button className="iconbtn" aria-label={label} onClick={onClick}><Icon name={icon} /></button>;
}

// One screen: top bar, content, optional bottom dock and tab bar.
//   tabs: which tab is active (shows the tab bar), back: false hides the back arrow,
//   dock: buttons pinned to the bottom, right: extra top bar buttons, noTop: no top bar
export default function Page({ title, sub, tabs, cls, back, right, noTop, dock, children }) {
  const showBack = back !== false && nav.stack.length > 1;
  return (
    <>
      <div className={`screen ${tabs ? '' : 'no-tabs'} ${dock ? 'has-dock' : ''} ${cls || ''}`}>
        {!noTop && (
          <header className="top">
            {showBack ? <IconBtn icon="back" label="Back" onClick={() => nav.back()} /> : <span style={{ width: 6 }} />}
            <h1>{title || ''}{sub ? <span className="sub">{sub}</span> : null}</h1>
            {right}
          </header>
        )}
        {children}
        {dock && <div className="dock">{dock}</div>}
      </div>
      {tabs && (
        <nav className="tabs">
          {TABS.map(([k, l, ic]) => (
            <button key={k} className={tabs === k ? 'on' : ''} onClick={() => app.tab(k)}><Icon name={ic} /><span>{l}</span></button>
          ))}
        </nav>
      )}
    </>
  );
}
