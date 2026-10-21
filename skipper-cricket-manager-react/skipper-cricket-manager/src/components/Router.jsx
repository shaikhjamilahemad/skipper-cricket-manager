import { Component, useLayoutEffect } from 'react';
import { nav, useStore, stores } from '../app/core';
import { EntryCtx } from './hooks';
import { SCREENS } from '../screens';

class Boundary extends Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { console.error(err); }
  render() {
    if (this.state.err) {
      return <div className="empty">Something went wrong drawing this screen.<br /><span className="tiny dimmer">{String(this.state.err.message || this.state.err)}</span></div>;
    }
    return this.props.children;
  }
}

export default function Router() {
  useStore(stores.nav);
  const entry = nav.cur();
  const id = entry ? entry.id : 0;
  // new screens open at the top; going back restores where you were
  useLayoutEffect(() => { window.scrollTo(0, entry ? entry.scroll || 0 : 0); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!entry) return null;
  const Screen = SCREENS[entry.name];
  if (!Screen) return <div className="empty">Unknown screen {entry.name}</div>;
  return (
    <EntryCtx.Provider value={entry}>
      <Boundary key={entry.id}>
        <Screen params={entry.params} />
      </Boundary>
    </EntryCtx.Provider>
  );
}
