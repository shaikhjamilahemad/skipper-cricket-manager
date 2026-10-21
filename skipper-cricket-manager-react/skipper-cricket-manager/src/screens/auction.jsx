// Squad building: national squads, retentions, auctions, domestic signings
import { Fragment, useEffect, useReducer, useState } from 'react';
import { SK } from '../engine';
import { app } from '../app/app';
import { nav, ui } from '../app/core';
import { ROLE_NAME, ROLE_ORD, BOWL_SHORT, fmtWord } from '../app/consts';
import Page from '../components/Page';
import Icon from '../components/Icon';
import { Badge, Seg, FormArrow, Empty } from '../components/bits';
import { confirm } from '../components/dialogs';
import { useSt, refresh } from '../components/hooks';

const { U, R, World: W, Auction: A } = SK;
const wd = () => app.world;
const goPlayer = (pid) => nav.go('player', { pid: +pid });

export const AU = {};

// remove a calendar event from the queue; optionally run it (the computer's side of the event)
AU.finishEvent = function (ev, run) {
  const w = wd(); if (!ev) return;
  w.queue = w.queue.filter(q => !(q.kind === 'ev' && q.id === ev.id));
  if (run) W.runEvent(w, ev); else ev.done = true;
};
AU.mix = function (players) {
  const n = (f) => players.filter(f).length;
  const pace = n(p => SK.isPace(p.bowl) && p.role !== 'BAT' && p.role !== 'WK');
  const spin = n(p => SK.isSpin(p.bowl) && p.role !== 'BAT' && p.role !== 'WK');
  return `${n(p => p.role === 'BAT')} batters, ${n(p => p.role === 'WK')} keepers, ${n(p => p.role === 'AR')} all-rounders, ${n(p => p.role === 'BWL')} bowlers. ${pace} pace and ${spin} spin options.`;
};

// a player row with an action area and an info button
function PRow({ p, efmt, onAct, sel, os, note, noRatings, extraPill, right }) {
  const w = wd();
  const b = Math.round(R.bat(p, efmt)); const bw = p.bowl === '-' ? null : Math.round(R.bowl(p, efmt));
  return (
    <div className={`row ${sel ? 'sel' : ''}`} style={{ paddingRight: 4 }}>
      <button className="grow" onClick={() => onAct(p.id)} style={{ background: 'none', border: 0, textAlign: 'left', padding: 0, display: 'flex', gap: 12, alignItems: 'center', minHeight: 40 }}>
        <div className="grow">
          <div className="t ellip">{p.name} {os ? <><span className="pill os">OS</span>{' '}</> : null}{p.injury > 0 ? <><span className="pill inj">Injured</span>{' '}</> : null}{extraPill}</div>
          <div className="s ellip">{ROLE_NAME[p.role]}{p.bowl !== '-' ? ', ' + BOWL_SHORT[p.bowl] : ''}, {W.age(w, p)}, {p.cc}{noRatings ? `. Rating ${Math.round(R.overall(p, efmt))}` : ''} <FormArrow f={p.form} quiet /></div>
          {note ? <div className="s ellip">{note}</div> : null}
        </div>
        {!noRatings && <div className="num small"><div>Bat <b>{b}</b></div>{bw != null && <div className="dim">Bowl <b>{bw}</b></div>}</div>}
      </button>
      {right}
      <button className="iconbtn" aria-label={`View ${p.name}`} onClick={() => goPlayer(p.id)}><Icon name="chev" /></button>
    </div>
  );
}

// =================================================================== national squad selection
AU.sqSize = (ed, f) => (ed.type === 'icc' ? 15 : f === 'TEST' ? 16 : 15);
AU.sqMax = (ed, f) => (ed.type === 'icc' ? 15 : f === 'TEST' ? 18 : 17);
AU.SQ_MIN = 12;

export function NatSquadScreen({ params }) {
  const w = wd(); const ed = w.editions[params.ed]; const key = w.user.team; const t = w.teams[key];
  const st = useSt();
  const fmts = ed.type === 'series' ? [...new Set(ed.legs.map(l => l.fmt))] : [ed.fmt];
  if (!st.picks) {
    st.picks = {};
    for (const f of fmts) { const have = ed.squads[key] && ed.squads[key][f]; st.picks[f] = have ? have.slice() : W.selectNationalSquad(w, key, f, AU.sqSize(ed, f)); }
    st.fmt = fmts[0]; st.role = 'ALL';
  }
  const f = st.fmt; const efmt = f === 'T20' ? 'T20I' : f; const max = AU.sqMax(ed, f);
  const picks = st.picks[f]; const pickSet = new Set(picks);
  const inSquad = picks.map(id => w.players[id]).sort((a, b) => (ROLE_ORD[a.role] - ROLE_ORD[b.role]) || (R.overall(b, efmt) - R.overall(a, efmt)));
  const pool = W.nationalPool(w, t).filter(x => !pickSet.has(x.id) && SK.Sel.available(x, efmt)).filter(x => st.role === 'ALL' || x.role === st.role).sort(U.by(x => R.overall(x, efmt), true)).slice(0, 30);
  const opp = ed.type === 'series' ? w.teams[ed.teams.find(k => k !== key)] : null;

  const add = (id) => { if (picks.length >= max) { ui.toast('The squad is full. Drop someone first.'); return; } picks.push(+id); refresh(); };
  const drop = (id) => { st.picks[f] = picks.filter(x => x !== +id); refresh(); };
  const confirmSquad = () => {
    for (const ff of Object.keys(st.picks)) {
      if (st.picks[ff].length < AU.SQ_MIN) { st.fmt = ff; refresh(); ui.toast(`Pick at least ${AU.SQ_MIN} players for the ${fmtWord(ff)} squad.`); return; }
    }
    ed.squads[key] = ed.squads[key] || {};
    for (const ff of Object.keys(st.picks)) ed.squads[key][ff] = st.picks[ff].slice();
    const ev = params.ev ? W.getEvent(w, params.ev) : null;
    if (ev && !ev.done) AU.finishEvent(ev, true); else W.assignDuty(w, ed);
    app.autosave();
    nav.go('home', {}, { reset: true });
    app.continue();
  };
  const dock = (
    <>
      <button className="btn ghost" onClick={() => { st.picks[f] = W.selectNationalSquad(w, key, f, AU.sqSize(ed, f)); refresh(); ui.toast('The selectors have picked a squad.'); }}>Pick for me</button>
      <button className="btn" onClick={confirmSquad}>Confirm squad</button>
    </>
  );
  return (
    <Page title="Pick your squad" sub={ed.name} back={false} dock={dock}>
      <p className="sec small dim">
        {opp ? `${t.name} v ${opp.name}, starting ${U.fmtDate(ed.legs[0] ? w.fx[ed.legs[0].fixtures[0]].date : ed.start)}.` : `${ed.name} starts ${U.fmtDate(ed.start)}.`} Pick {AU.SQ_MIN} to {max} players{fmts.length > 1 ? ' for each format' : ''}. Tap a player to add or drop him.
      </p>
      {fmts.length > 1 && <div className="ctl"><Seg options={fmts.map(x => [x, `${fmtWord(x)} (${st.picks[x].length})`])} value={f} onChange={(v) => { st.fmt = v; refresh(); }} /></div>}
      <div className="sec hrow"><h2>In the squad</h2><span className={`b ${picks.length < AU.SQ_MIN ? 'neg' : ''}`}>{picks.length}/{max}</span></div>
      <p className="sec small dim" style={{ paddingTop: 0 }}>{AU.mix(inSquad)}</p>
      <div className="list">
        {inSquad.map(x => <PRow key={x.id} p={x} efmt={efmt} sel onAct={drop} extraPill={!SK.Sel.available(x, efmt) ? <span className="pill inj">Unavailable</span> : null} />)}
        {!inSquad.length && <Empty small>Nobody picked yet.</Empty>}
      </div>
      <div className="sec"><h2>Available</h2></div>
      <div className="ctl"><Seg options={[['ALL', 'All'], ['BAT', 'Bat'], ['WK', 'Keep'], ['AR', 'All-round'], ['BWL', 'Bowl']]} value={st.role} onChange={(v) => { st.role = v; refresh(); }} /></div>
      <div className="list">
        {pool.map(x => <PRow key={x.id} p={x} efmt={efmt} onAct={add} />)}
        {!pool.length && <Empty small>No more players in this role.</Empty>}
      </div>
    </Page>
  );
}

// =================================================================== releases (shared by retention + auction intro)
function ReleaseList({ t, comp, rel, mega, onToggle }) {
  const w = wd(); const fmt = A.fmtOf(comp);
  const ps = t.squad.map(id => w.players[id]).sort((a, b) => (ROLE_ORD[a.role] - ROLE_ORD[b.role]) || (R.overall(b, fmt) - R.overall(a, fmt)));
  const kept = ps.filter(x => !rel.has(x.id));
  const freed = U.sum(ps.filter(x => rel.has(x.id)), x => (x.sal && x.sal[comp.id]) || 0);
  const osKept = kept.filter(x => A.isOS(x, comp)).length;
  return (
    <>
      <div className="cond">
        <div><div className="k">Purse now</div><div className="vv">{U.money(t.purse, comp.cur)}</div></div>
        <div><div className="k">After releases</div><div className="vv">{U.money(t.purse + freed, comp.cur)}</div></div>
        <div><div className="k">Squad kept</div><div className="vv">{kept.length}<span className="dim small"> of max {comp.squadMax}</span></div></div>
        <div><div className="k">Overseas kept</div><div className="vv">{osKept}<span className="dim small"> of max {comp.osSquad}</span></div></div>
      </div>
      {mega && <p className="sec small hi">Mega auction year: you can keep at most 5 players, no more than 2 of them overseas. Everyone else goes back into the auction.</p>}
      <div className="list">
        {ps.map(x => {
          const r = rel.has(x.id); const sal = (x.sal && x.sal[comp.id]) || 0; const worth = A.round(comp, A.price(w, x, comp));
          return (
            <PRow key={x.id} p={x} efmt={fmt} onAct={onToggle} os={A.isOS(x, comp)} noRatings
              note={`Paid ${U.money(sal, comp.cur)}, worth about ${U.money(worth, comp.cur)}`}
              right={<span className={`pill ${r ? 'inj' : ''}`} style={{ minWidth: 70, justifyContent: 'center' }}>{r ? 'Release' : 'Keep'}</span>} />
          );
        })}
      </div>
    </>
  );
}
AU.applyReleases = function (t, comp, rel) {
  const w = wd(); const players = [...rel].map(id => w.players[id]).filter(Boolean);
  if (players.length) A.doRelease(w, t, comp, players);
  return players.length;
};
AU.checkMega = function (t, comp, rel) {
  const w = wd(); const kept = t.squad.filter(id => !rel.has(id)).map(id => w.players[id]);
  if (kept.length > 5) return 'You can keep at most 5 players in a mega auction year.';
  if (kept.filter(x => A.isOS(x, comp)).length > 2) return 'You can keep at most 2 overseas players in a mega auction year.';
  return null;
};

export function RetentionScreen({ params }) {
  const w = wd(); const ev = W.getEvent(w, params.ev); const comp = w.comps[ev.comp]; const t = w.teams[w.user.team];
  const st = useSt();
  A.ensureSalaries(w, comp.id);
  const mega = comp.id === 'IPL' && A.megaYear(ev.season);
  if (!st.rel) st.rel = new Set(A.releaseList(w, t, comp, ev.season).map(x => x.id));
  const toggle = (id) => { if (st.rel.has(id)) st.rel.delete(id); else st.rel.add(id); refresh(); };
  const confirmIt = () => {
    if (mega) { const err = AU.checkMega(t, comp, st.rel); if (err) { ui.toast(err, 3000); return; } }
    const n = AU.applyReleases(t, comp, st.rel);
    AU.finishEvent(ev, true); // the computer's teams make their releases
    W.addNews(w, `${t.name} release ${n} player${n === 1 ? '' : 's'} ahead of the ${comp.name} auction.`, 'auction');
    app.autosave(); nav.go('home', {}, { reset: true }); app.continue();
  };
  return (
    <Page title="Retentions" sub={`${comp.name} ${ev.season}`} back={false}
      dock={<><button className="btn ghost" onClick={() => { st.rel = new Set(); refresh(); }}>Keep everyone</button><button className="btn" onClick={confirmIt}>Confirm</button></>}>
      <p className="sec small dim">Choose who to keep before the auction. Released players go into the auction pool, and their salaries go back into your purse. Your analysts have marked their suggestions.</p>
      <ReleaseList t={t} comp={comp} rel={st.rel} mega={mega} onToggle={toggle} />
    </Page>
  );
}

// =================================================================== auction
export function AuctionIntroScreen({ params }) {
  const w = wd(); const ev = W.getEvent(w, params.ev); const comp = w.comps[ev.comp]; const t = w.teams[w.user.team];
  const st = useSt();
  A.ensureSalaries(w, comp.id);
  if (!st.rel) st.rel = new Set();
  const ipl = comp.id === 'IPL';
  const toggle = (id) => { if (st.rel.has(id)) st.rel.delete(id); else st.rel.add(id); refresh(); };
  return (
    <Page title="Auction day" sub={`${comp.name} ${ev.season}`} back={false}
      dock={<>
        <button className="btn ghost" onClick={() => confirm({ title: 'Let your analysts bid for you?', body: 'They will bid on players your squad needs, within your purse. You will see the results at the end.' }, 'Let them bid').then(ok => { if (ok) AU.begin(params.ev, st.rel, false); })}>Analysts bid for me</button>
        <button className="btn" onClick={() => AU.begin(params.ev, st.rel, true)}>Go to the auction</button>
      </>}>
      <p className="sec small dim">You need at least {A.squadMin(comp)} players and can have up to {comp.squadMax}, with no more than {comp.osSquad} from overseas. {ipl ? 'Retentions are done, but you can still release players now.' : 'Release any players you no longer want before bidding starts.'}</p>
      <ReleaseList t={t} comp={comp} rel={st.rel} mega={false} onToggle={toggle} />
    </Page>
  );
}

AU.begin = function (evId, rel, interactive) {
  const w = wd(); const ev = W.getEvent(w, evId); const comp = w.comps[ev.comp]; const t = w.teams[w.user.team];
  AU.applyReleases(t, comp, rel || new Set());
  ui.setBusy(true, 'Auction', 'Setting up the player pool');
  setTimeout(() => {
    const run = new A.AuctionRun(w, comp.id, ev.season);
    run.interactive = interactive;
    app.auction = { run, ev: ev.id, recent: [], before: new Set(t.squad), skip: false };
    ui.setBusy(false);
    if (!interactive) { run.simAll(); AU.complete(); return; }
    AU.advance();
    nav.go('auction', {}, { reset: true });
  }, 30);
};
AU.note = function (r) {
  const S = app.auction; if (!r || !r.lot) return;
  S.recent.unshift({ pid: r.lot.pid, to: r.lot.to || null, price: r.lot.price || 0 });
  if (S.recent.length > 8) S.recent.length = 8;
};
// move on to the next lot that needs the user; false when the auction is over
AU.advance = function () {
  const S = app.auction; const run = S.run;
  for (let guard = 0; guard < 600; guard++) {
    if (run.done) return false;
    if (S.skip && !run.lots.some((l, i) => i >= run.idx && l.status === 'pending' && l.want)) S.skip = false;
    const c = run.startLot(); if (!c) return false;
    if (S.skip && !c.lot.want) { AU.note(run.userPass()); continue; }
    const r = run.aiStep();
    if (r.state === 'user') { S.next = r.next; S.skip = false; return true; }
    if (S.skip && c.lot.want) { S.skip = false; ui.toast(`You could not bid for ${wd().players[c.lot.pid].name}: no purse, squad or overseas room.`, 3200); }
    AU.note(r);
  }
  return false;
};
AU.complete = function () {
  const S = app.auction; const run = S.run; const w = wd(); const comp = run.comp; const t = w.teams[w.user.team];
  if (!run.done) run.finish();
  // make sure the user can field a side: cheapest useful locals at base price
  if (t.squad.length < A.squadMin(comp)) {
    const inLeague = new Set(); comp.teams.forEach(k => w.teams[k].squad.forEach(id => inLeague.add(id)));
    const fill = w.players.filter(p => !inLeague.has(p.id) && A.eligible(w, p, comp) && !A.isOS(p, comp)).sort(U.by(p => A.value(w, p, comp), true));
    while (t.squad.length < A.squadMin(comp) && fill.length) { const p = fill.shift(); t.squad.push(p.id); p.teams[comp.id] = t.key; p.sal = p.sal || {}; p.sal[comp.id] = A.base(comp); t.purse = Math.round((t.purse - A.base(comp)) * 100) / 100; }
  }
  const buys = t.squad.filter(id => !S.before.has(id));
  const top = run.log.filter(l => l.to).sort((a, b) => b.price - a.price).slice(0, 10);
  AU.finishEvent(W.getEvent(w, S.ev), false);
  app.auction = null;
  app.autosave();
  nav.go('auctionDone', { comp: comp.id, season: run.season, buys, top }, { reset: true });
};

function MySquadSheet() {
  const w = wd(); const S = app.auction; const comp = S.run.comp; const t = w.teams[w.user.team]; const fmt = A.fmtOf(comp);
  const ps = t.squad.map(id => w.players[id]).sort((a, b) => (ROLE_ORD[a.role] - ROLE_ORD[b.role]) || (R.overall(b, fmt) - R.overall(a, fmt)));
  return (
    <>
      <h3>{t.name}</h3>
      <p className="sec small dim" style={{ paddingTop: 0 }}>{AU.mix(ps)}</p>
      <div className="list">
        {ps.map(x => (
          <div className="row" key={x.id}>
            <div className="grow">
              <div className="t ellip">{x.name} {A.isOS(x, comp) ? <span className="pill os">OS</span> : null} {S.before.has(x.id) ? null : <span className="pill gold">New</span>}</div>
              <div className="s">{ROLE_NAME[x.role]}{x.bowl !== '-' ? ', ' + BOWL_SHORT[x.bowl] : ''}, {W.age(w, x)}</div>
            </div>
            <span className="num small">{U.money((x.sal && x.sal[comp.id]) || 0, comp.cur)}</span>
          </div>
        ))}
      </div>
    </>
  );
}
function UpcomingSheet() {
  const w = wd(); const S = app.auction; const run = S.run; const comp = run.comp; const fmt = A.fmtOf(comp);
  const [, bump] = useReducer(x => x + 1, 0);
  const lots = run.lots.filter((l, i) => i > run.idx && l.status === 'pending').slice(0, 60);
  return (
    <>
      <h3>Coming up</h3>
      <p className="sec small dim" style={{ paddingTop: 0 }}>Tap players to add them to your list. Then use Finish, Skip to my next target, to jump straight to them.</p>
      <div className="list">
        {lots.map(l => {
          const x = w.players[l.pid];
          return (
            <button key={l.pid} className={`row ${l.want ? 'sel' : ''}`} onClick={() => { l.want = !l.want; bump(); }}>
              <div className="grow">
                <div className="t ellip">{x.name} {A.isOS(x, comp) ? <span className="pill os">OS</span> : null}</div>
                <div className="s">{ROLE_NAME[x.role]}{x.bowl !== '-' ? ', ' + BOWL_SHORT[x.bowl] : ''}, {W.age(w, x)}, base {U.money(l.base, comp.cur)}</div>
              </div>
              <span className="num small">{Math.round(R.overall(x, fmt))}</span>
              {l.want ? <span className="pill gold">Listed</span> : null}
            </button>
          );
        })}
        {!lots.length && <Empty small>No more players.</Empty>}
      </div>
    </>
  );
}
function SpeedSheet() {
  const S = app.auction;
  const anyWant = S.run.lots.some((l, i) => i > S.run.idx && l.status === 'pending' && l.want);
  return (
    <>
      <h3>Speed things up</h3>
      <div className="list">
        {anyWant && (
          <button className="row" onClick={() => { ui.closeSheet(); S.skip = true; if (S.run.userPass && S.run.cur) AU.note(S.run.userPass()); if (!AU.advance()) { AU.complete(); return; } refresh(); }}>
            <div className="grow"><div className="t">Skip to my next target</div><div className="s">Pass on everyone until a player on your list comes up</div></div>
          </button>
        )}
        <button className="row" onClick={() => { ui.closeSheet(); S.run.interactive = false; S.run.simAll(); AU.complete(); }}>
          <div className="grow"><div className="t">Analysts bid for me</div><div className="s">They finish the auction for you, buying what the squad needs</div></div>
        </button>
        <button className="row" onClick={() => { ui.closeSheet(); S.run.simAll(); AU.complete(); }}>
          <div className="grow"><div className="t">Stop buying</div><div className="s">The other teams finish the auction without you</div></div>
        </button>
      </div>
    </>
  );
}

export function AuctionScreen() {
  const S = app.auction;
  const open = S && !S.run.cur;
  useEffect(() => { if (open) { const id = setTimeout(AU.complete, 0); return () => clearTimeout(id); } return undefined; }, [open]);
  if (!S) return <Page title="Auction" back={false}><div className="empty">The auction is over.</div></Page>;
  const w = wd(); const run = S.run; const comp = run.comp; const t = w.teams[w.user.team]; const c = run.cur;
  const head = { title: `${comp.name} auction`, sub: `Player ${Math.min(run.idx + 1, run.lots.length)} of ${run.lots.length}`, back: false };
  if (!c) return <Page {...head}><div className="empty">Wrapping up the auction.</div></Page>;
  const p = w.players[c.lot.pid]; const fmt = A.fmtOf(comp); const os = A.isOS(p, comp);
  const lead = c.leader ? w.teams[c.leader] : null;
  const last = p.stats && (p.stats[fmt === 'HUN' ? 'HUN' : 'T20']);

  const bid = () => {
    const r = run.userBid();
    if (r.state === 'error') { ui.toast(r.msg); return; }
    if (r.state === 'user') { S.next = r.next; refresh(); return; }
    AU.note(r);
    if (r.state === 'sold' && r.lot.to === w.user.team) ui.toast(`You signed ${w.players[r.lot.pid].name} for ${U.money(r.lot.price, run.comp.cur)}.`);
    if (!AU.advance()) { AU.complete(); return; }
    refresh();
  };
  const pass = () => { AU.note(run.userPass()); if (!AU.advance()) { AU.complete(); return; } refresh(); };
  return (
    <Page {...head} dock={<><button className="btn ghost" onClick={pass}>Pass</button><button className="btn" onClick={bid}>Bid {U.money(S.next, comp.cur)}</button></>}>
      <div className="cond three" style={{ marginTop: 8 }}>
        <div><div className="k">Your purse</div><div className="vv">{U.money(t.purse, comp.cur)}</div></div>
        <div><div className="k">Squad</div><div className="vv">{t.squad.length}<span className="dim small">/{comp.squadMax}</span></div></div>
        <div><div className="k">Overseas</div><div className="vv">{run.overseasCount(t)}<span className="dim small">/{comp.osSquad}</span></div></div>
      </div>
      <div className="lot">
        <div className="small dim">{c.lot.want ? <><span className="pill gold">On your list</span>{' '}</> : null}{os ? <><span className="pill os">Overseas</span>{' '}</> : null}{SK.DB.CC_NAMES[p.cc] || p.cc}, age {W.age(w, p)}</div>
        <div className="nm" style={{ marginTop: 6 }}>{p.name}</div>
        <div className="small dim" style={{ marginTop: 4 }}>
          {ROLE_NAME[p.role]}{p.bowl !== '-' ? ', ' + SK.BOWL_NAMES[p.bowl].toLowerCase() : ''}. Bat {Math.round(R.bat(p, fmt))}{p.bowl !== '-' ? `, bowl ${Math.round(R.bowl(p, fmt))}` : ''}.{(p.form || 0) > 3 ? ' In form.' : (p.form || 0) < -3 ? ' Out of form.' : ''}
        </div>
        {last && last.m ? <div className="small dim">In this game: {last.m} T20s, {last.r} runs at SR {U.sr(last.r, last.b)}{last.w ? `, ${last.w} wickets at ${U.econ(last.rc, last.bb)} an over` : ''}</div> : null}
        <div className={`price ${c.leader === t.key ? 'pos' : ''}`}>{U.money(c.price == null ? c.lot.base : c.price, comp.cur)}</div>
        <div className="lead">{lead ? <><Badge team={lead} size="sm" /><span>{lead.key === t.key ? 'Your bid' : lead.name + ' lead the bidding'}</span></> : <span>Base price. No bids yet.</span>}</div>
        {c.history.length > 1 && <div className="tiny dimmer" style={{ marginTop: 6 }}>{c.history.slice(-5).reverse().map(([k, v]) => `${w.teams[k].short} ${U.money(v, comp.cur)}`).join(', ')}</div>}
      </div>
      <div className="btnrow" style={{ paddingTop: 0 }}>
        <button className="btn ghost sm" onClick={() => ui.openSheet(<MySquadSheet />)}>My squad</button>
        <button className="btn ghost sm" onClick={() => ui.openSheet(<UpcomingSheet />)}>Upcoming</button>
        <button className="btn ghost sm" onClick={() => ui.openSheet(<SpeedSheet />)}>Finish</button>
      </div>
      {S.recent.length > 0 && (
        <>
          <div className="sec"><h2>Recent lots</h2></div>
          <div className="list">
            {S.recent.map((r, i) => {
              const x = w.players[r.pid]; const tt = r.to ? w.teams[r.to] : null;
              return (
                <div className="row" key={i}>
                  {tt ? <Badge team={tt} size="sm" /> : <span className="badge sm" style={{ '--b1': '#22392f', '--b2': '#2a4a3e' }}>-</span>}
                  <div className="grow"><div className="t ellip">{x.name}</div><div className="s">{tt ? 'Sold to ' + tt.name : 'Unsold'}</div></div>
                  {tt ? <span className={`num b ${r.to === t.key ? 'pos' : ''}`}>{U.money(r.price, comp.cur)}</span> : null}
                </div>
              );
            })}
          </div>
        </>
      )}
    </Page>
  );
}

export function AuctionDoneScreen({ params }) {
  const w = wd(); const comp = w.comps[params.comp]; const t = w.teams[w.user.team];
  return (
    <Page title="Auction complete" sub={`${comp.name} ${params.season}`} back={false} dock={<button className="btn" onClick={() => { nav.go('home', {}, { reset: true }); app.continue(); }}>Continue</button>}>
      <div className="cond" style={{ marginTop: 8 }}>
        <div><div className="k">Purse left</div><div className="vv">{U.money(t.purse, comp.cur)}</div></div>
        <div><div className="k">Squad</div><div className="vv">{t.squad.length}</div></div>
      </div>
      <div className="sec"><h2>Your signings</h2></div>
      <div className="list">
        {params.buys.map(id => {
          const x = w.players[id];
          return (
            <button className="row" key={id} onClick={() => goPlayer(id)}>
              <div className="grow"><div className="t ellip">{x.name} {A.isOS(x, comp) ? <span className="pill os">OS</span> : null}</div><div className="s">{ROLE_NAME[x.role]}, {W.age(w, x)}</div></div>
              <span className="num b">{U.money((x.sal && x.sal[comp.id]) || 0, comp.cur)}</span>
            </button>
          );
        })}
        {!params.buys.length && <Empty small>You did not sign anyone.</Empty>}
      </div>
      <div className="sec"><h2>Biggest buys</h2></div>
      <div className="list">
        {params.top.map((l, i) => {
          const x = w.players[l.pid]; const tt = w.teams[l.to];
          return (
            <button className="row" key={i} onClick={() => goPlayer(l.pid)}>
              <Badge team={tt} size="sm" />
              <div className="grow"><div className="t ellip">{x.name}</div><div className="s">{tt.name}</div></div>
              <span className="num b">{U.money(l.price, comp.cur)}</span>
            </button>
          );
        })}
      </div>
    </Page>
  );
}

// =================================================================== domestic free agents
AU.domGroup = (t) => (t.comp === 'SHF' ? { reg: 'SHF', comps: ['SHF'], cc: 'AUS', max: 26 } : { reg: 'CC', comps: ['CC1', 'CC2'], cc: 'ENG', max: 26 });
export function SigningsScreen() {
  const w = wd(); const t = w.teams[w.user.team]; const g = AU.domGroup(t); const comp = w.comps[t.comp];
  const st = useSt({ kind: 'local', role: 'ALL' });
  const taken = new Set(); g.comps.forEach(c => w.comps[c].teams.forEach(k => w.teams[k].squad.forEach(id => taken.add(id))));
  const isLocal = (x) => !SK.DB.isOverseasFor(x, g.cc);
  const osNow = t.squad.filter(id => !isLocal(w.players[id])).length;
  let pool = w.players.filter(x => !x.retired && !taken.has(x.id) && (st.kind === 'local' ? isLocal(x) : !isLocal(x) && R.overall(x, 'FC4') >= 58 && !x.ret.WB && x.cc !== 'IND'));
  if (st.role !== 'ALL') pool = pool.filter(x => x.role === st.role);
  pool = pool.sort(U.by(x => R.overall(x, 'FC4'), true)).slice(0, 40);
  const sign = (id) => {
    const x = w.players[+id];
    if (t.squad.length >= g.max) { ui.toast('Your squad is full. Release someone first.'); return; }
    const os = SK.DB.isOverseasFor(x, g.cc);
    if (os && t.squad.filter(q => SK.DB.isOverseasFor(w.players[q], g.cc)).length >= comp.osSquad) { ui.toast('You already have the maximum number of overseas players.'); return; }
    confirm({ title: `Sign ${x.name}?`, body: `${ROLE_NAME[x.role]}, ${W.age(w, x)}, first-class rating ${Math.round(R.overall(x, 'FC4'))}.` }, 'Sign').then(ok => {
      if (!ok) return;
      t.squad.push(x.id); x.teams[g.reg] = t.key; if (g.reg === 'CC') x.teams[t.comp] = t.key;
      W.addNews(w, `${t.name} sign ${x.name}.`, 'news');
      ui.toast(`${x.name} has signed.`); refresh();
    });
  };
  return (
    <Page title="Sign players" sub={t.name}>
      <p className="sec small dim">Squad {t.squad.length} of {g.max}. Overseas {osNow} of {comp.osSquad}. Signing is free between seasons and during the season.</p>
      <div className="ctl"><Seg options={[['local', 'Local players'], ['os', 'Overseas']]} value={st.kind} onChange={(v) => { st.kind = v; refresh(); }} /></div>
      <div className="ctl"><Seg options={[['ALL', 'All'], ['BAT', 'Bat'], ['WK', 'Keep'], ['AR', 'All-round'], ['BWL', 'Bowl']]} value={st.role} onChange={(v) => { st.role = v; refresh(); }} /></div>
      <div className="list">
        {pool.map(x => <PRow key={x.id} p={x} efmt="FC4" onAct={sign} os={!isLocal(x)} />)}
        {!pool.length && <Empty small>Nobody available.</Empty>}
      </div>
    </Page>
  );
}
