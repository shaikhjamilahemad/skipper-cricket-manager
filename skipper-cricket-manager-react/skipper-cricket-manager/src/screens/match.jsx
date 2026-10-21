// Match screens: pre-match, toss, live play, scorecards, charts, field view
import { Fragment, useEffect, useRef, useState } from 'react';
import { SK } from '../engine';
import { app } from '../app/app';
import { nav, ui } from '../app/core';
import { ROLE_NAME, BOWL_SHORT, STAGE_NAME } from '../app/consts';
import Page, { IconBtn } from '../components/Page';
import Icon from '../components/Icon';
import { Badge, Seg, Toggle, FormArrow, Empty } from '../components/bits';
import { confirm } from '../components/dialogs';
import { useSt, useBack, refresh } from '../components/hooks';

const { U, R, World: W, Store: S } = SK;

const SPEEDS = { slow: 1300, normal: 650, fast: 260, turbo: 70 };
const goPlayer = (pid) => nav.go('player', { pid: +pid });

// ===================================================================== context helpers
// ctx: { kind:'career', fxId } | { kind:'quick', teams:[{...team, pool:[players]}], fmt, venue, userSide, title }
export const MU = {};
MU.pl = (id) => (app.world ? app.world.players[id] : app.quickPlayers[id]);
MU.contextTeams = function (ctx) {
  const w = app.world;
  if (ctx.kind === 'career') { const fx = w.fx[ctx.fxId]; return [fx.home, fx.away].map(k => w.teams[k]); }
  return ctx.teams;
};
MU.poolFor = function (ctx, side) {
  const w = app.world;
  if (ctx.kind === 'career') {
    const fx = w.fx[ctx.fxId]; const key = [fx.home, fx.away][side];
    return W.squadFor(w, key, fx).concat(W.isNat(key) ? [] : w.teams[key].squad.map(id => w.players[id]).filter(p => !p.retired && W.onDuty(p, fx.date)))
      .filter((p, i, a) => a.indexOf(p) === i);
  }
  return ctx.teams[side].pool;
};
MU.engineFmt = (ctx) => {
  if (ctx.kind === 'career') { const fx = app.world.fx[ctx.fxId]; return W.engineFmt(fx.comp === 'ICC' ? 'INTL' : fx.comp, fx.fmt); }
  return ctx.fmt;
};
MU.userSide = (ctx) => {
  if (ctx.kind === 'career') { const w = app.world; const fx = w.fx[ctx.fxId]; return fx.home === w.user.team ? 0 : fx.away === w.user.team ? 1 : null; }
  return ctx.userSide;
};
MU.osRules = function (ctx, side) {
  const w = app.world;
  const team = MU.contextTeams(ctx)[side];
  const compId = team.comp; const comp = w && w.comps[compId];
  if (!comp || compId === 'INTL' || !comp.home || comp.home === '-') return { max: 11, isOS: () => false, home: null };
  return { max: comp.osXI, isOS: (p) => SK.DB.isOverseasFor(p, comp.home), home: comp.home };
};
MU.defaultXI = function (ctx, side) {
  const w = app.world;
  if (ctx.kind === 'career') { const fx = w.fx[ctx.fxId]; return W.pickXIFor(w, [fx.home, fx.away][side], fx).map(p => p.id); }
  const os = MU.osRules(ctx, side);
  return SK.Sel.pickXI(ctx.teams[side].pool, { fmt: ctx.fmt, maxOverseas: os.max, isOverseas: os.isOS, pitch: ctx.venue && ctx.venue.pitch }).map(p => p.id);
};
MU.titleOf = function (ctx) {
  const w = app.world;
  if (ctx.kind === 'career') return W.fixtureTitle(w, w.fx[ctx.fxId]);
  return ctx.title || 'Quick match';
};
MU.venueOf = (ctx) => (ctx.kind === 'career' ? app.world.fx[ctx.fxId].venue : ctx.venue);
MU.pitchReport = function (code, F) {
  const lo = F && F.lo;
  return {
    F: lo ? 'A belter. Expect big scores and little help for bowlers.' : 'Flat and hard. Bowlers will need patience; big first-innings totals likely.',
    B: 'A fair surface with something for everyone.',
    G: 'Grass on it and moisture underneath. Seamers will enjoy the new ball.',
    D: lo ? 'Dry and slow. Spinners will grip it; stroke-making gets harder.' : 'Dry and cracked. It should turn sharply from day three.',
    P: 'Hard with pace and bounce. Quicks will be lively; true bounce for strokeplay.',
    S: 'Slow and low. Timing will be difficult and spinners will be key.',
  }[code] || '';
};
MU.validateXI = function (ctx, st) {
  const us = MU.userSide(ctx); if (us == null) return true;
  const ids = st.xi[us];
  if (ids.length !== 11) { ui.toast('You need 11 players.'); return false; }
  const os = MU.osRules(ctx, us);
  if (ids.map(MU.pl).filter(os.isOS).length > os.max) { ui.toast(`Too many overseas players (max ${os.max}).`); return false; }
  if (ids.map(MU.pl).some(x => x.injury > 0)) { ui.toast('Your XI includes an injured player.'); return false; }
  return true;
};
MU.buildMatch = function (ctx, st, fast) {
  const us = MU.userSide(ctx);
  const manual = { bowl: !!S.settings.manualBowl, field: !!S.settings.manualField };
  if (ctx.kind === 'career') {
    const w = app.world; const fx = w.fx[ctx.fxId];
    if (us != null) { w.user.lineup = w.user.lineup || {}; w.user.lineup[w.user.team + ':' + MU.engineFmt(ctx)] = { xi: st.xi[us].slice(), cap: st.cap[us], wk: st.wk[us] }; }
    return W.buildMatch(w, fx, { fast, userSide: us, manual, xi: st.xi, cap: st.cap, keeper: st.wk });
  }
  const teams = ctx.teams.map((t, i) => ({ id: t.id, name: t.name, short: t.short, c1: t.c1, c2: t.c2, xi: st.xi[i].map(MU.pl), captainId: st.cap[i] != null ? st.cap[i] : t.cap, keeperId: st.wk[i] }));
  return new SK.Match({ format: ctx.fmt, teams, venue: ctx.venue, homeSide: ctx.neutral ? null : 0, fast, userSide: us, manual, knockout: true, title: ctx.title || 'Quick match' });
};
MU.simWhole = function (ctx, st) {
  if (!MU.validateXI(ctx, st)) return;
  const m = MU.buildMatch(ctx, st, true);
  m.doToss(); m.simToEnd(80000);
  MU.finishMatch(ctx, m);
};
MU.finishMatch = function (ctx, m) {
  stopAuto();
  app.match = null;
  if (ctx.kind === 'career') {
    const w = app.world; const fx = w.fx[ctx.fxId];
    if (fx.status !== 'done') { W.applyMatch(w, fx, m); w.queue = w.queue.filter(q => q.id !== fx.id); }
    app.afterUserMatch(fx);
  } else {
    nav.go('quickResult', { card: MU.cardFromMatch(m), ctx }, { replace: true });
  }
};
MU.cardFromMatch = function (m) {
  const C = SK.Career.compactCard(m);
  C.names = {}; for (const [id, v] of m.byId) C.names[id] = v.p.name;
  return C;
};
MU.cardFromStored = function (card) {
  const w = app.world; const C = card;
  C.names = C.names || {};
  for (const s of C.sides) for (const id of s.xi) C.names[id] = w.players[id] ? w.players[id].name : '?';
  return C;
};

const RoleLine = ({ x }) => (
  <>{ROLE_NAME[x.role]}{x.bowl !== '-' ? ` / ${BOWL_SHORT[x.bowl]}` : ''}{x.injury > 0 ? <> <span className="pill inj">Injured</span></> : null}</>
);

// ===================================================================== pre-match
function XiMenuSheet({ ctx, st, i }) {
  const us = MU.userSide(ctx); const id = st.xi[us][i]; const x = MU.pl(id);
  return (
    <>
      <h3>{x.name}</h3>
      <div className="list">
        <button className="row" onClick={() => { st.cap[us] = id; ui.closeSheet(); refresh(); }}><span className="grow t">Make captain</span></button>
        <button className="row" onClick={() => { st.wk[us] = id; ui.closeSheet(); refresh(); }}><span className="grow t">Make wicketkeeper</span></button>
        <button className="row" onClick={() => { ui.closeSheet(); openXiSheet(ctx, st, i); }}><span className="grow t">Replace with another player</span></button>
        <button className="row" onClick={() => { ui.closeSheet(); goPlayer(id); }}><span className="grow t">View profile</span></button>
      </div>
    </>
  );
}
function XiSheet({ ctx, st, replaceIdx }) {
  const us = MU.userSide(ctx); const fmtk = MU.engineFmt(ctx);
  const pool = MU.poolFor(ctx, us).slice().sort(U.by(x => R.overall(x, fmtk), true));
  const [sel, setSel] = useState(() => new Set(st.xi[us]));
  const os = MU.osRules(ctx, us);
  const w = app.world; const fx = ctx.kind === 'career' ? w.fx[ctx.fxId] : null;
  const pick = (id) => {
    const x = MU.pl(id);
    if (x.injury > 0) { ui.toast('He is injured.'); return; }
    if (replaceIdx != null) {
      if (sel.has(id)) { ui.toast('Already in the XI.'); return; }
      st.xi[us][replaceIdx] = id; ui.closeSheet(); refresh(); return;
    }
    const next = new Set(sel);
    if (next.has(id)) next.delete(id);
    else { if (next.size >= 11) { ui.toast('Remove someone first.'); return; } next.add(id); }
    setSel(next);
  };
  const done = () => {
    if (replaceIdx == null) {
      if (sel.size !== 11) { ui.toast('Pick exactly 11 players.'); return; }
      const keep = st.xi[us].filter(id => sel.has(id)); const add = [...sel].filter(id => !keep.includes(id));
      st.xi[us] = keep.concat(add);
      if (!sel.has(st.cap[us])) st.cap[us] = null;
      if (!sel.has(st.wk[us])) st.wk[us] = null;
    }
    ui.closeSheet(); refresh();
  };
  return (
    <>
      <h3>{replaceIdx != null ? 'Choose replacement' : 'Pick your XI'}</h3>
      <p className="sec small dim" style={{ paddingTop: 0 }}>{replaceIdx != null ? 'Tap a player to bring him in.' : `${sel.size} of 11 selected. Tap to add or remove.`}</p>
      <div className="list">
        {pool.map(x => {
          const duty = fx && W.onDuty(x, fx.date);
          return (
            <button key={x.id} className={`row ${sel.has(x.id) ? 'sel' : ''}`} onClick={() => pick(x.id)}>
              <div className="grow">
                <div className="t ellip">{x.name} {os.isOS(x) ? <span className="pill os">OS</span> : null}{x.injury > 0 ? <> <span className="pill inj">Injured</span></> : null}{duty ? <> <span className="pill duty">On duty</span></> : null}</div>
                <div className="s"><RoleLine x={x} /></div>
              </div>
              <span className="num small">Bat {Math.round(R.bat(x, fmtk))}<br />{x.bowl !== '-' ? 'Bowl ' + Math.round(R.bowl(x, fmtk)) : ''}</span>
            </button>
          );
        })}
      </div>
      <div className="btnrow"><button className="btn" onClick={done}>Done</button></div>
    </>
  );
}
const openXiSheet = (ctx, st, replaceIdx) => ui.openSheet(<XiSheet ctx={ctx} st={st} replaceIdx={replaceIdx} />);

function TossSheet({ ctx, m, us }) {
  const [step, setStep] = useState({ k: 'call' });
  const teams = m.sides;
  const goLive = () => { ui.closeSheet(); nav.go('live', { ctx }, { replace: true }); };
  if (step.k === 'call') {
    const call = (c) => { const t = m.doToss(c, us); setStep({ k: t.winner === us && !t.decision ? 'decide' : 'told', t }); };
    return (
      <>
        <h3>The toss</h3>
        <p className="sec dim" style={{ paddingTop: 0 }}>{teams[1 - us].name} captain tosses. Call it.</p>
        <div className="btnrow"><button className="btn ghost" onClick={() => call('H')}>Heads</button><button className="btn ghost" onClick={() => call('T')}>Tails</button></div>
      </>
    );
  }
  const t = step.t;
  if (step.k === 'decide') {
    return (
      <>
        <h3>It's {t.coin === 'H' ? 'heads' : 'tails'}. You won the toss</h3>
        <p className="sec dim" style={{ paddingTop: 0 }}>{MU.pitchReport(m.pitch.code, m.F)}{m.F.lo && m.dew > 0.5 ? ' Heavy dew is expected later.' : ''}{!m.F.lo && m.overcast > 0.6 ? ' It is overcast.' : ''}</p>
        <div className="btnrow"><button className="btn" onClick={() => { m.tossDecide('bat'); goLive(); }}>Bat first</button><button className="btn" onClick={() => { m.tossDecide('bowl'); goLive(); }}>Bowl first</button></div>
      </>
    );
  }
  return (
    <>
      <h3>It's {t.coin === 'H' ? 'heads' : 'tails'}. {teams[t.winner].name} won the toss</h3>
      <p className="sec dim" style={{ paddingTop: 0 }}>They chose to {t.decision} first.</p>
      <div className="btnrow"><button className="btn" onClick={goLive}>Start match</button></div>
    </>
  );
}
MU.startToss = function (ctx, st) {
  if (!MU.validateXI(ctx, st)) return;
  const m = MU.buildMatch(ctx, st, false);
  const us = MU.userSide(ctx);
  app.match = { m, ctx };
  if (us == null) { m.doToss(); nav.go('live', { ctx }, { replace: true }); return; }
  // closing the sheet before the match starts cancels it
  ui.openSheet(<TossSheet ctx={ctx} m={m} us={us} />, () => { if (m.phase === 'pre' && app.match && app.match.m === m) app.match = null; });
};

export function PrematchScreen({ params }) {
  const ctx = params.ctx; const w = app.world;
  const st = useSt();
  const teams = MU.contextTeams(ctx);
  const us = MU.userSide(ctx);
  if (!st.xi) {
    st.xi = [MU.defaultXI(ctx, 0), MU.defaultXI(ctx, 1)];
    st.cap = [null, null]; st.wk = [null, null];
    if (ctx.kind === 'career' && us != null) {
      const saved = w.user.lineup && w.user.lineup[w.user.team + ':' + MU.engineFmt(ctx)];
      const pool = MU.poolFor(ctx, us).map(x => x.id);
      if (saved && saved.xi.every(id => pool.includes(id) && w.players[id].injury <= 0)) { st.xi[us] = saved.xi.slice(); st.cap[us] = saved.cap; st.wk[us] = saved.wk; }
    }
  }
  const venue = MU.venueOf(ctx);
  const pitch = SK.PITCH[venue.pitch] || SK.PITCH.B;
  const fmtk = MU.engineFmt(ctx);
  const F = SK.FORMATS[fmtk];
  const date = ctx.kind === 'career' ? U.fmtDate(w.fx[ctx.fxId].date) : '';
  const players = (side) => st.xi[side].map(id => MU.pl(id));
  const strength = (side) => U.avg(players(side), x => R.overall(x, fmtk));
  const os = us != null ? MU.osRules(ctx, us) : null;
  const osN = os && os.home ? players(us).filter(os.isOS).length : 0;
  const show = us == null ? [0, 1] : [1 - us];
  const move = (i, d) => { const x = st.xi[us]; const j = i + d; if (j < 0 || j >= x.length) return; [x[i], x[j]] = [x[j], x[i]]; refresh(); };
  return (
    <Page title="Match day" sub={MU.titleOf(ctx)} right={ctx.kind === 'career' ? <IconBtn icon="home" label="Back to home" onClick={() => nav.go('home', {}, { reset: true })} /> : null}>
      <div className="vs">
        {[0, 1].map(s => (
          <Fragment key={s}>
            {s === 1 && <span className="v">v</span>}
            <div className="side"><Badge team={teams[s]} size="lg" /><span className="nm">{teams[s].name}</span><span className="tiny dim">XI rating {strength(s).toFixed(1)}</span></div>
          </Fragment>
        ))}
      </div>
      <div className="cond">
        <div><div className="k">Format</div><div className="vv">{F.label}{F.lo ? `, ${F.overs * F.bpo / (F.bpo === 5 ? 1 : F.bpo)}${F.bpo === 5 ? ' balls' : ' overs'}` : `, ${F.days} days`}</div></div>
        <div><div className="k">Venue</div><div className="vv ellip">{venue.name || 'Neutral'}</div></div>
        <div><div className="k">Pitch</div><div className="vv">{pitch.name}</div></div>
        <div><div className="k">{date ? 'Date' : 'Home side'}</div><div className="vv">{date || teams[0].name}</div></div>
      </div>
      <p className="sec small dim">{MU.pitchReport(venue.pitch, F)}</p>
      {us != null && (
        <>
          <div className="sec hrow">
            <h2>Your XI</h2>
            <span>
              <button className="linkbtn" onClick={() => { st.xi[us] = MU.defaultXI(ctx, us); st.cap[us] = null; st.wk[us] = null; refresh(); }}>Auto-pick</button>
              {'   '}
              <button className="linkbtn" onClick={() => openXiSheet(ctx, st)}>Change players</button>
            </span>
          </div>
          <div className="list">
            {st.xi[us].map((id, i) => {
              const x = MU.pl(id); const cap = st.cap[us] === id, wk = st.wk[us] === id;
              return (
                <div className="xirow" key={id}>
                  <span className="no">{i + 1}</span>
                  <button className="grow" style={{ background: 'none', border: 0, textAlign: 'left', padding: 0, color: 'inherit' }} onClick={() => ui.openSheet(<XiMenuSheet ctx={ctx} st={st} i={i} />)}>
                    <div className="t ellip b">{x.name}{cap ? <> <span className="pill gold">C</span></> : null}{wk ? <> <span className="pill">WK</span></> : null}</div>
                    <div className="s small dim"><RoleLine x={x} /> &nbsp;Bat {Math.round(R.bat(x, fmtk))}{x.bowl !== '-' ? ` Bowl ${Math.round(R.bowl(x, fmtk))}` : ''} <FormArrow f={x.form} quiet /></div>
                  </button>
                  <span className="mv"><button aria-label="Move up" onClick={() => move(i, -1)}>▲</button><button aria-label="Move down" onClick={() => move(i, 1)}>▼</button></span>
                </div>
              );
            })}
          </div>
          {os.home && <p className={`sec tiny ${osN > os.max ? 'neg' : 'dim'}`}>Overseas players: {osN} of {os.max} allowed</p>}
          <div className="sec"><h2>Captaincy</h2></div>
          <div className="list">
            <div className="row"><div className="grow"><div className="t">Choose bowlers myself</div><div className="s">Off: the computer picks your bowling changes</div></div><Toggle checked={S.settings.manualBowl} onChange={(v) => { S.settings.manualBowl = v; S.saveSettings(); }} /></div>
            <div className="row"><div className="grow"><div className="t">Set field myself</div><div className="s">Off: the computer sets attacking or defensive fields</div></div><Toggle checked={S.settings.manualField} onChange={(v) => { S.settings.manualField = v; S.saveSettings(); }} /></div>
          </div>
        </>
      )}
      {show.map(s => (
        <Fragment key={s}>
          <div className="sec"><h2>{teams[s].short} probable XI</h2></div>
          <div className="list">
            {players(s).map((x, i) => (
              <button className="row" key={x.id} onClick={() => goPlayer(x.id)}>
                <span className="dimmer small" style={{ width: 18 }}>{i + 1}</span>
                <div className="grow"><div className="t ellip">{x.name}</div><div className="s"><RoleLine x={x} /></div></div>
                <span className="num small dim">{Math.round(R.overall(x, fmtk))}</span>
              </button>
            ))}
          </div>
        </Fragment>
      ))}
      <div className="btnrow">
        <button className="btn ghost" onClick={() => MU.simWhole(ctx, st)}>Sim match</button>
        <button className="btn" onClick={() => MU.startToss(ctx, st)}>{us == null ? 'Start match' : 'Go to the toss'}</button>
      </div>
    </Page>
  );
}

// ===================================================================== live
const L = { timer: null, anim: null, st: null, ctx: null };
const curMatch = () => (app.match ? app.match.m : null);
const isUserBat = () => { const m = curMatch(); return m.userSide != null && m.cur && m.cur.bat === m.userSide; };
const isUserBowl = () => { const m = curMatch(); return m.userSide != null && m.cur && m.cur.bowl === m.userSide; };

function stopAuto() { if (L.timer) { clearTimeout(L.timer); L.timer = null; } }

function collect() {
  const m = curMatch(); const st = L.st;
  const fresh = m.events.filter(e => e.seq > st.lastSeq);
  if (fresh.length) st.lastSeq = fresh[fresh.length - 1].seq;
  for (const e of fresh) if (e.text && (e.type !== 'bowler' || !e.quiet)) st.comm.unshift(e);
  if (st.comm.length > 400) st.comm.length = 400;
  return fresh;
}
function checkPending() {
  const m = curMatch();
  if (m.phase === 'done') { stopAuto(); return true; }
  if (m.pending) {
    stopAuto();
    if (m.pending.type === 'bowler') openBowlerSheet(true);
    else if (m.pending.type === 'followon') openFollowOnSheet();
    return true;
  }
  return false;
}
// redraw after the match moved on
function afterSteps(events, animate) {
  const st = L.st;
  events = events || collect();
  const lastBall = events.filter(e => e.type === 'ball').pop();
  st.flash = '';
  if (lastBall) { if (lastBall.wkt) st.flash = 'flashW'; else if (lastBall.bat >= 4) st.flash = 'flash4'; }
  st.fieldEv = animate && lastBall ? lastBall : null;
  st.tick = (st.tick || 0) + 1;
  checkPending();
  refresh();
}
function step(kind) {
  const m = curMatch(); const st = L.st;
  if (m.phase === 'done') return;
  if (m.pending) { checkPending(); return; }
  const inn0 = m.cur; const day0 = m.day;
  let n = 0; const limit = kind === 'ball' ? 1 : 6000;
  const longSkip = kind === 'wicket' || kind === 'innings' || kind === 'session';
  while (n < limit && m.phase === 'play') {
    if (m.pending) { if (longSkip && m.pending.type === 'bowler') { m.resolvePendingAI(); continue; } break; }
    const ev = m.next(); n++;
    if (!ev) break;
    if (kind === 'over' && m.events.some(e => e.seq > st.lastSeq && (e.type === 'over' || e.type === 'innEnd'))) break;
    if (kind === 'wicket' && m.events.some(e => e.seq > st.lastSeq && ((e.type === 'ball' && e.wkt) || e.type === 'innEnd'))) break;
    if (kind === 'innings' && (m.cur !== inn0 || m.phase !== 'play')) break;
    if (kind === 'session' && (m.events.some(e => e.seq > st.lastSeq && (e.type === 'session' || e.type === 'stumps' || e.type === 'innEnd')) || m.day !== day0)) break;
    if (kind === 'ball') break;
  }
  afterSteps(null, kind === 'ball' || kind === 'over');
}
function startAuto() {
  stopAuto();
  const delay = SPEEDS[S.settings.speed] || 650;
  const tick = () => {
    const m = curMatch(); if (!m) { stopAuto(); return; }
    if (m.phase !== 'play' || m.pending) { stopAuto(); afterSteps(); return; }
    m.next();
    const ev = collect();
    const wk = ev.some(e => e.type === 'ball' && e.wkt);
    if (m.cur && ev.some(e => e.type === 'innEnd')) { stopAuto(); afterSteps(ev, delay >= 200); return; }
    L.timer = setTimeout(tick, wk ? delay * 2.2 : delay);
    afterSteps(ev, delay >= 200);
  };
  L.timer = setTimeout(tick, 50);
  refresh();
}
function simRest(thenLeave) {
  const m = curMatch(); const ctx = L.ctx;
  stopAuto();
  ui.setBusy(true, 'Simulating', 'The computer is finishing the match');
  setTimeout(() => {
    let guard = 0;
    while (m.phase === 'play' && guard++ < 80000) { if (m.pending) m.resolvePendingAI(); else m.next(); }
    ui.setBusy(false);
    collect();
    if (thenLeave) MU.finishMatch(ctx, m); else afterSteps();
  }, 30);
}

// ---------------------------------------------------------- live sheets
function SimMenuSheet() {
  const m = curMatch(); const fc = !m.F.lo;
  const [speed, setSpeed] = useState(S.settings.speed);
  return (
    <>
      <h3>Move the game on</h3>
      <div className="list">
        <button className="row" onClick={() => { ui.closeSheet(); step('wicket'); }}><span className="grow t">To the next wicket</span></button>
        {fc && <button className="row" onClick={() => { ui.closeSheet(); step('session'); }}><span className="grow t">To the end of the session</span></button>}
        <button className="row" onClick={() => { ui.closeSheet(); step('innings'); }}><span className="grow t">To the end of this innings</span></button>
        <button className="row" onClick={() => { ui.closeSheet(); simRest(false); }}><div className="grow"><div className="t">Sim the rest of the match</div><div className="s">The computer captains both sides</div></div></button>
      </div>
      <div className="sec"><h2>Play speed</h2></div>
      <div className="ctl"><Seg options={[['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast'], ['turbo', 'Turbo']]} value={speed} onChange={(v) => { setSpeed(v); S.settings.speed = v; S.saveSettings(); ui.closeSheet(); ui.toast(`Speed: ${v}`); }} /></div>
    </>
  );
}
function OptionsSheet() {
  const m = curMatch();
  return (
    <>
      <h3>Match options</h3>
      <div className="list">
        <div className="row"><div className="grow"><div className="t">Choose bowlers myself</div></div><Toggle checked={m.manual.bowl} onChange={(v) => { m.manual.bowl = v; S.settings.manualBowl = v; S.saveSettings(); }} /></div>
        <div className="row"><div className="grow"><div className="t">Show the field view</div></div><Toggle checked={S.settings.showField} onChange={(v) => { S.settings.showField = v; S.saveSettings(); ui.closeSheet(); refresh(); }} /></div>
        <button className="row" onClick={() => { ui.closeSheet(); ui.openSheet(<OrderSheet />); }}><span className="grow t">Change batting order</span></button>
        <button className="row" onClick={() => { ui.closeSheet(); simRest(false); }}><span className="grow t">Sim the rest of the match</span></button>
      </div>
    </>
  );
}
function OrderSheet() {
  const m = curMatch(); const side = m.userSide;
  const [order, setOrder] = useState(() => (side == null ? [] : m.sides[side].order.slice()));
  if (side == null) return <p className="sec dim">You are watching this match.</p>;
  const inn = m.cur && m.cur.bat === side ? m.cur : null;
  const locked = new Set(inn ? inn.card.map(c => c.pid) : []);
  const swap = (i, j) => { const o = order.slice(); [o[i], o[j]] = [o[j], o[i]]; setOrder(o); };
  return (
    <>
      <h3>Batting order</h3>
      <p className="sec small dim" style={{ paddingTop: 0 }}>Players who have batted are locked.</p>
      <div className="list">
        {order.map((id, i) => (
          <div className="xirow" key={id}>
            <span className="no">{i + 1}</span>
            <span className={`grow ${locked.has(id) ? 'dimmer' : 'b'}`}>{m.p(id).name}</span>
            {!locked.has(id) && (
              <span className="mv">
                <button onClick={() => { if (i > 0 && !locked.has(order[i - 1])) swap(i - 1, i); }}>▲</button>
                <button onClick={() => { if (i < order.length - 1) swap(i, i + 1); }}>▼</button>
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="btnrow"><button className="btn" onClick={() => { m.setBattingOrder(side, order); ui.closeSheet(); }}>Done</button></div>
    </>
  );
}
function BowlerSheet({ mustPick }) {
  const m = curMatch(); const inn = m.cur; const F = m.F;
  const opts = m.bowlingOptions(inn);
  const rec = m.aiPickBowler(inn, inn.balls === 0);
  const rows = opts.slice().sort((a, b) => (b.ok - a.ok) || (R.bowl(b.p, m.fmtKey) - R.bowl(a.p, m.fmtKey)));
  return (
    <>
      <h3>{mustPick ? 'Who bowls the next over?' : 'Your bowlers'}</h3>
      <div className="list">
        {rows.map(o => {
          const b = o.stat; const fig = b ? `${U.overs(b.balls, F.bpo)}-${b.maid}-${b.runs}-${b.wkts}` : 'Not bowled';
          const left = F.lo ? `, ${inn.maxOv - o.overs} left` : (b ? `, tiredness ${Math.round(b.fat * 100)}%` : '');
          return (
            <button key={o.p.id} className={`row ${o.p.id === rec ? 'sel' : ''}`} disabled={!o.ok} style={o.ok ? undefined : { opacity: 0.45 }}
              onClick={() => { if (!m.pending) { ui.closeSheet(); ui.toast('You can change bowler at the end of the over.'); return; } m.chooseBowler(o.p.id); ui.closeSheet(); afterSteps(); }}>
              <div className="grow">
                <div className="t ellip">{o.p.name} {o.p.id === rec ? <span className="pill gold">Suggested</span> : null}</div>
                <div className="s">{BOWL_SHORT[o.p.bowl] || 'Part-time'}, bowling {Math.round(R.bowl(o.p, m.fmtKey))}. {fig}{o.ok ? left : '. ' + o.why}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="btnrow"><button className="btn ghost" onClick={() => { if (m.pending) m.chooseBowler(rec); ui.closeSheet(); afterSteps(); }}>Let the computer choose</button></div>
    </>
  );
}
const openBowlerSheet = (mustPick) => ui.openSheet(<BowlerSheet mustPick={mustPick} />);
function FollowOnSheet() {
  const m = curMatch();
  return (
    <>
      <h3>Enforce the follow-on?</h3>
      <p className="sec dim" style={{ paddingTop: 0 }}>You lead by {m.pending.lead} runs. Make them bat again now, or bat yourselves and set a target.</p>
      <div className="btnrow">
        <button className="btn ghost" onClick={() => { m.enforceFollowOn(false); ui.closeSheet(); afterSteps(); }}>Bat again</button>
        <button className="btn" onClick={() => { m.enforceFollowOn(true); ui.closeSheet(); afterSteps(); }}>Enforce</button>
      </div>
    </>
  );
}
const openFollowOnSheet = () => ui.openSheet(<FollowOnSheet />);

// ---------------------------------------------------------- field view (canvas)
function drawField(cv, m, ev) {
  const inn = m.cur;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const Wd = cv.clientWidth || 360, Hd = Math.round(Wd * 0.8);
  if (cv.width !== Math.round(Wd * dpr)) { cv.width = Math.round(Wd * dpr); cv.height = Math.round(Hd * dpr); cv.style.height = Hd + 'px'; }
  const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cx = Wd / 2, cy = Hd / 2 - 4; const sc = Math.min(Wd, Hd) / 2 / 76;
  const sx = cx, sy = cy + 10 * sc; // striker end
  const pt = (ang, d) => { const a = ang * Math.PI / 180; return [sx + Math.sin(a) * d * sc, sy - Math.cos(a) * d * sc]; };
  const dot = (x, y, r, fill, stroke) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = stroke; ctx.stroke(); };
  const base = () => {
    ctx.clearRect(0, 0, Wd, Hd);
    ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, 70 * sc, 72 * sc, 0, 0, Math.PI * 2); ctx.clip();
    for (let i = -8; i < 8; i++) { ctx.fillStyle = i % 2 ? '#2b6643' : '#2f7049'; ctx.fillRect(cx + i * 10 * sc, 0, 10 * sc, Hd); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(238,241,232,0.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cx, cy, 70 * sc, 72 * sc, 0, 0, Math.PI * 2); ctx.stroke();
    if (m.F.lo) { ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(238,241,232,0.35)'; ctx.beginPath(); ctx.ellipse(cx, cy, 28 * sc, 30 * sc, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    ctx.fillStyle = '#cdb98a'; ctx.fillRect(cx - 1.6 * sc, cy - 11 * sc, 3.2 * sc, 22 * sc);
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(cx - 2.2 * sc, sy - 1.2 * sc, 4.4 * sc, 0.4); ctx.fillRect(cx - 2.2 * sc, cy - 10 * sc + 1.2 * sc, 4.4 * sc, 0.4);
    if (!inn) return;
    for (const f of m.fieldPositions(inn)) { const [x, y] = pt(f.angle, f.dist); dot(x, y, 4.2, '#eef1e8', '#123'); }
    const [kx, ky] = pt(180, 13); dot(kx, ky, 4.2, '#eef1e8', '#123'); // keeper
    dot(cx, cy - 12 * sc, 4.6, '#e0564d', '#3a0f0d'); // bowler
    dot(sx + 2.5, sy, 4.6, '#d9c27e', '#3b3115'); // striker
    dot(cx - 2.5, cy - 9.2 * sc, 4, '#d9c27e', '#3b3115'); // non-striker
  };
  if (L.anim) cancelAnimationFrame(L.anim);
  if (!ev || !ev.shot) { base(); return; }
  const shot = ev.shot; const t0 = performance.now(); const dur = shot.stumps ? 260 : 520;
  const [ex, ey] = shot.stumps ? [sx, sy] : pt(shot.angle, Math.max(4, shot.dist));
  const col = ev.wkt ? '#e0564d' : ev.bat === 6 ? '#9be3b2' : ev.bat === 4 ? '#d9c27e' : 'rgba(238,241,232,0.9)';
  const frame = (now) => {
    const t = Math.min(1, (now - t0) / dur);
    base();
    ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.setLineDash(shot.aerial ? [6, 4] : []);
    const bx0 = cx, by0 = cy - 9 * sc;
    ctx.beginPath(); ctx.moveTo(bx0, by0); ctx.lineTo(sx, sy - 1);
    if (!shot.stumps && !shot.leave && !shot.wide) { const qx = sx + (ex - sx) * t, qy = sy + (ey - sy) * t; ctx.moveTo(sx, sy); ctx.lineTo(qx, qy); ctx.stroke(); ctx.setLineDash([]); dot(qx, qy, 3.4, '#fff', col); }
    else { ctx.stroke(); ctx.setLineDash([]); }
    if (shot.stumps && t >= 1) { ctx.fillStyle = '#e0564d'; ctx.font = '700 15px Barlow, sans-serif'; ctx.fillText(ev.wkt && ev.wkt.how === 'lbw' ? 'LBW' : 'BOWLED', sx + 10, sy + 5); }
    if (ev.wkt && !shot.stumps && t >= 1) { ctx.strokeStyle = '#e0564d'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ex - 5, ey - 5); ctx.lineTo(ex + 5, ey + 5); ctx.moveTo(ex + 5, ey - 5); ctx.lineTo(ex - 5, ey + 5); ctx.stroke(); }
    if (t < 1) L.anim = requestAnimationFrame(frame);
  };
  L.anim = requestAnimationFrame(frame);
}

function FieldView({ m, st }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current && curMatch()) drawField(ref.current, m, st.fieldEv); }, [st.tick, st.tab]); // eslint-disable-line react-hooks/exhaustive-deps
  const inn = m.cur;
  let cap = '';
  if (inn) { const f = m.fieldFor(inn); cap = `${{ A: 'Attacking', N: 'Normal', D: 'Defensive' }[f]} field${m.F.lo && inn.balls / m.F.bpo < m.F.pp ? ', powerplay' : ''}`; }
  return <div className="fieldwrap"><canvas ref={ref} /><span className="fieldcap">{cap}</span></div>;
}

// ---------------------------------------------------------- live pieces
function Board({ m, flash }) {
  const inn = m.cur; const F = m.F;
  if (!inn) return <div className="board"><div className="ttl"><span>{m.title}</span></div><div className="main"><span className="team">{m.sides[0].short} v {m.sides[1].short}</span></div></div>;
  const bat = m.sides[inn.bat];
  const st = inn.card[inn.st], ns = inn.card[inn.ns];
  const ovs = U.overs(inn.balls, F.bpo);
  const meta = [];
  if (F.lo) {
    const ballsLeft = inn.maxBalls - inn.balls;
    if (F.bpo === 5) meta.push(<span key="o"><b>{inn.balls}</b> balls</span>); else meta.push(<span key="o"><b>{ovs}</b>{inn.so ? '' : `/${F.overs}`} ov</span>);
    meta.push(<span key="rr">RR <b>{U.rr(inn.runs, inn.balls)}</b></span>);
    if (inn.target && m.phase !== 'done') { const need = inn.target - inn.runs; meta.push(<span key="n" className="need">Need {need} off {ballsLeft}</span>); meta.push(<span key="q">Req <b>{U.rr(need, ballsLeft)}</b></span>); }
    else if (inn.n === 0 && inn.balls >= 30 && !inn.so) { const proj = Math.round(inn.runs + (inn.runs / inn.balls) * ballsLeft); meta.push(<span key="p">Projected <b>{proj}</b></span>); }
  } else {
    const sess = Math.min(3, 1 + Math.floor(m.dayBalls / (30 * 6)));
    meta.push(<span key="o"><b>{ovs}</b> ov</span>, <span key="d">Day <b>{m.day}</b>, session {sess}</span>);
    const lead = m.leadFor(inn.bat);
    if (inn.target && m.phase !== 'done') meta.push(<span key="n" className="need">Need {inn.target - inn.runs} to win</span>);
    else if (inn.n > 0) meta.push(<span key="l" className={lead >= 0 ? '' : 'need'}>{lead >= 0 ? 'Lead by' : 'Trail by'} <b>{Math.abs(lead)}</b></span>);
    meta.push(<span key="rr">RR <b>{U.rr(inn.runs, inn.balls)}</b></span>);
  }
  const plate = (c, on) => c
    ? <div className={`plate ${on ? 'on' : ''}`}><span className="n">{m.nm(c.pid)}</span><span className="r">{c.runs}</span><span className="bb">{c.balls}</span></div>
    : <div className="plate"><span className="n dimmer">—</span></div>;
  const b = inn.cur != null ? inn.bw[inn.cur] : null;
  const prev = m.inns.filter(i => i !== inn && !i.so).map(i => `${m.sides[i.bat].short} ${i.runs}/${i.wkts}${i.declared ? 'd' : ''}`).join(', ');
  return (
    <div className={`board ${flash || ''}`}>
      <div className="ttl"><span>{inn.so ? 'Super Over' : (F.lo ? (inn.n === 0 ? 'First innings' : 'Chase') : U.ordinal(inn.n + 1) + ' innings')}</span><span>{prev}</span></div>
      <div className="main"><span className="team">{bat.short}</span><span className="score">{inn.runs}<small>/{inn.wkts}{inn.declared ? 'd' : ''}</small></span></div>
      <div className="meta">{meta}</div>
      <div className="plates">
        {plate(st, true)}{plate(ns, false)}
        {inn.cur != null && b ? <div className="plate bowl"><span className="n">{m.nm(inn.cur)}</span><span className="r">{b.wkts}-{b.runs}</span><span className="bb">{U.overs(b.balls, F.bpo)} ov</span></div> : null}
      </div>
    </div>
  );
}

function BallChips({ m }) {
  const inn = m.cur; if (!inn) return null;
  const curOver = Math.floor((inn.balls - (inn.overOpen ? 0 : 1)) / m.F.bpo);
  let balls = inn.log.filter(x => x.o === (inn.overOpen ? Math.floor(inn.balls / m.F.bpo) - (inn.balls % m.F.bpo === 0 && inn.overBalls > 0 ? 1 : 0) : curOver));
  if (!inn.overOpen && inn.overs.length) { const last = inn.overs.length - 1; balls = inn.log.filter(x => x.o === last); }
  const chip = (x, i) => {
    if (x.w) return <span key={i} className="ball w">W</span>;
    if (x.ex === 'wd') return <span key={i} className="ball x">{x.r > 1 ? x.r : ''}wd</span>;
    if (x.ex === 'nb') return <span key={i} className="ball x">{x.br || ''}nb</span>;
    if (x.ex === 'lb' || x.ex === 'b') return <span key={i} className="ball x">{x.r}{x.ex}</span>;
    if (x.br === 4) return <span key={i} className="ball r4">4</span>;
    if (x.br === 6) return <span key={i} className="ball r6">6</span>;
    return <span key={i} className="ball">{x.br === 0 ? '•' : x.br}</span>;
  };
  return <div className="balls"><span className="ballslabel">{inn.overOpen ? 'This over' : 'Last over'}</span>{balls.map(chip)}{!balls.length && <span className="dimmer small">New over</span>}</div>;
}

function Controls({ m }) {
  const inn = m.cur;
  if (!inn || m.phase === 'done') return null;
  if (isUserBat()) {
    const opts = [['auto', 'Auto'], ['1', 'Block'], ['2', 'Defend'], ['3', 'Normal'], ['4', 'Attack'], ['5', 'Slog']];
    return (
      <>
        {[inn.st, inn.ns].map(idx => {
          const c = inn.card[idx]; if (!c) return null;
          const set = m.agg[c.pid]; const ai = m.aiAggression(inn, c);
          return (
            <div className="ctl" key={c.pid}>
              <div className="lbl"><span>{m.nm(c.pid)} {idx === inn.st ? '(on strike)' : ''}</span><span>{set ? '' : 'Auto: ' + SK.AGG_NAMES[Math.round(ai)]}</span></div>
              <Seg options={opts.map(([v, l]) => [c.pid + ':' + v, l])} value={c.pid + ':' + (set || 'auto')}
                onChange={(v) => { const [pid, lv] = v.split(':'); m.setAggression(+pid, lv === 'auto' ? null : +lv); refresh(); }} />
            </div>
          );
        })}
        {!m.F.lo && !inn.target && (
          <div className="ctl"><button className="btn ghost block sm" onClick={() => confirm({ title: 'Declare now?', body: `Your innings will close at ${m.cur.runs}/${m.cur.wkts}.` }, 'Declare').then(ok => { if (ok) { m.declare(); afterSteps(); } })}>Declare innings</button></div>
        )}
      </>
    );
  }
  if (isUserBowl()) {
    const f = m.fieldSet[inn.bowl] || 'auto';
    const cur = m.fieldFor(inn);
    return (
      <>
        <div className="ctl">
          <div className="lbl"><span>Field setting</span><span>{f === 'auto' ? 'Auto: ' + ({ A: 'Attacking', N: 'Normal', D: 'Defensive' }[cur]) : ''}</span></div>
          <Seg options={[['auto', 'Auto'], ['A', 'Attacking'], ['N', 'Normal'], ['D', 'Defensive']]} value={f}
            onChange={(v) => { m.setField(m.cur.bowl, v === 'auto' ? null : v); L.st.fieldEv = null; L.st.tick = (L.st.tick || 0) + 1; refresh(); }} />
        </div>
        <div className="ctl" style={{ display: 'flex', gap: 8 }}>
          <button className="btn ghost sm grow" onClick={() => openBowlerSheet(false)}>Bowlers</button>
          {m.canTakeNewBall() && <button className="btn sm grow" onClick={() => { if (m.takeNewBall()) { afterSteps(); ui.toast('New ball taken.'); } }}>Take new ball</button>}
        </div>
      </>
    );
  }
  return <p className="sec small dim">You are watching. Use the buttons below to move the game on.</p>;
}

function Commentary({ comm }) {
  const item = (e, i) => {
    let cls = '';
    if (e.type === 'ball') { if (e.wkt) cls = 'w'; else if (e.bat === 4) cls = 'b4'; else if (e.bat === 6) cls = 'b6'; }
    else if (e.type === 'over') cls = 'ov'; else if (['milestone', 'end', 'innEnd', 'super', 'declare'].includes(e.type)) cls = 'ms'; else cls = 'ov';
    return <div className={`c ${cls}`} key={e.seq != null ? e.seq : i}><span className="o">{e.type === 'ball' ? e.ov : ''}</span><span className="tx">{e.text}</span></div>;
  };
  return <div className="comm">{comm.slice(0, 120).map(item)}{!comm.length && <Empty small>Waiting for the first ball.</Empty>}</div>;
}

export function LiveScreen({ params }) {
  const ctx = params.ctx;
  const st = useSt({ tab: 'live', lastSeq: 0, comm: [], tick: 0, flash: '', fieldEv: null });
  L.st = st; L.ctx = ctx;
  const a = app.match;

  useEffect(() => {
    if (!app.match) return undefined;
    S.keepAwake(S.settings.keepAwake);
    checkPending();
    refresh();
    return () => { stopAuto(); if (L.anim) cancelAnimationFrame(L.anim); S.keepAwake(false); };
  }, []);

  useBack(() => {
    const am = app.match;
    if (am && am.m.phase !== 'done') {
      stopAuto(); refresh();
      confirm({ title: 'Leave this match?', body: 'The rest of the match will be simulated by the computer.' }, 'Sim and leave', 'Keep playing').then(ok => { if (ok) simRest(true); });
      return true;
    }
    if (am && am.m.phase === 'done') { MU.finishMatch(L.ctx, am.m); return true; }
    return false;
  });

  if (!a) return <Page title="Match" cls="match"><div className="empty">No match in progress.</div></Page>;
  const m = a.m;
  const done = m.phase === 'done';
  const playing = !!L.timer;
  let body;
  if (st.tab === 'live') {
    const mom = done && m.mom != null ? m.byId.get(m.mom).p : null;
    body = (
      <>
        <Board key={st.tick} m={m} flash={st.flash} />
        <BallChips m={m} />
        {done && (
          <div className="banner">
            <div className="big">{m.result.text}</div>
            {mom && <p className="dim">Player of the match: <b className="hi">{mom.name}</b></p>}
            <div className="btnrow" style={{ padding: '8px 0 0' }}>
              <button className="btn ghost" onClick={() => { st.tab = 'card'; refresh(); }}>Scorecard</button>
              <button className="btn" onClick={() => MU.finishMatch(ctx, m)}>Continue</button>
            </div>
          </div>
        )}
        {S.settings.showField && <FieldView m={m} st={st} />}
        <Controls m={m} />
        <div className="sec"><h2>Commentary</h2></div>
        <Commentary comm={st.comm} />
      </>
    );
  } else if (st.tab === 'card') {
    body = <><Board m={m} /><ScoreCard C={MU.cardFromMatch(m)} /></>;
  } else {
    body = <><Board m={m} /><Charts C={MU.cardFromMatch(m)} /></>;
  }
  const dock = done
    ? <><button className="btn ghost" onClick={() => { st.tab = 'card'; refresh(); }}>Scorecard</button><button className="btn" onClick={() => MU.finishMatch(ctx, m)}>Continue</button></>
    : <>
        <button className="btn ghost" aria-label={playing ? 'Pause' : 'Auto-play'} onClick={() => { if (L.timer) { stopAuto(); refresh(); } else startAuto(); }}>{playing ? 'Pause' : 'Play'}</button>
        <button className="btn" onClick={() => step('ball')}>Next ball</button>
        <button className="btn" onClick={() => step('over')}>{m.F.bpo === 5 ? 'Next 5' : 'Next over'}</button>
        <button className="btn ghost" onClick={() => ui.openSheet(<SimMenuSheet />)}>More</button>
      </>;
  return (
    <Page title={`${m.sides[0].short} v ${m.sides[1].short}`} sub={m.title || ''} cls="match" dock={dock}
      right={<IconBtn icon="more" label="Match options" onClick={() => ui.openSheet(<OptionsSheet />)} />}>
      <div className="mtabs">
        {[['live', 'Live'], ['card', 'Scorecard'], ['charts', 'Charts']].map(([k, l]) => (
          <button key={k} className={st.tab === k ? 'on' : ''} onClick={() => { stopAuto(); st.tab = k; refresh(); }}>{l}</button>
        ))}
      </div>
      {body}
    </Page>
  );
}

// ===================================================================== scorecards
const HOW = (row, names) => {
  const [, , , , , how, bw, fd] = row;
  const n = (id) => (id == null ? '' : U.surname(names[id] || ''));
  switch (how) {
    case '': return 'not out';
    case 'bowled': return `b ${n(bw)}`;
    case 'lbw': return `lbw b ${n(bw)}`;
    case 'caught': return `c ${n(fd)} b ${n(bw)}`;
    case 'caughtKeeper': return `c †${n(fd)} b ${n(bw)}`;
    case 'cb': return `c & b ${n(bw)}`;
    case 'stumped': return `st †${n(fd)} b ${n(bw)}`;
    case 'runout': return `run out (${n(fd)})`;
    default: return how;
  }
};

export function ScoreCard({ C }) {
  const F = SK.FORMATS[C.fmt] || SK.FORMATS.T20;
  if (!C.inns.length && !C.res) return <div className="empty">No play yet.</div>;
  return (
    <>
      {C.res && (
        <div className="sec">
          <p className="b hi" style={{ margin: '4px 0 0' }}>{C.res}</p>
          {C.mom != null && C.names[C.mom] && <p className="small dim">Player of the match: {C.names[C.mom]}</p>}
        </div>
      )}
      {C.inns.map((inn, k) => {
        const side = C.sides[inn.bat]; const ext = inn.ext; const extT = ext.b + ext.lb + ext.w + ext.nb;
        const batted = new Set(inn.card.map(r => r[0]));
        const dnb = side.xi.filter(id => !batted.has(id));
        return (
          <Fragment key={k}>
            <div className="sec hrow"><h2>{side.name}{inn.so ? ' super over' : inn.fo ? ' (f/o)' : ''}</h2><span className="b">{inn.runs}/{inn.wkts}{inn.dec ? 'd' : ''} <span className="dim small">({U.overs(inn.balls, F.bpo)} ov)</span></span></div>
            <div className="tblwrap">
              <table className="tbl">
                <thead><tr><th className="l">Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead>
                <tbody>
                  {inn.card.map((r) => {
                    const [pid, runs, balls, f4, f6] = r;
                    return (
                      <tr className="tap" key={pid} onClick={() => goPlayer(pid)}>
                        <td className="l"><div className="b">{C.names[pid] || '?'}{side.cap === pid ? ' (c)' : ''}{side.wk === pid ? ' †' : ''}</div><div className="how">{HOW(r, C.names)}</div></td>
                        <td className="b">{runs}</td><td>{balls}</td><td>{f4}</td><td>{f6}</td><td className="dim">{U.sr(runs, balls)}</td>
                      </tr>
                    );
                  })}
                  <tr><td className="l dim">Extras <span className="tiny">(b {ext.b}, lb {ext.lb}, w {ext.w}, nb {ext.nb})</span></td><td className="b">{extT}</td><td colSpan={4} /></tr>
                </tbody>
              </table>
            </div>
            {dnb.length > 0 && !inn.so && <p className="sec tiny dim">Did not bat: {dnb.map(id => U.shortName(C.names[id] || '?')).join(', ')}</p>}
            {inn.fow.length > 0 && <p className="sec tiny dim">Fall of wickets: {inn.fow.map(f => `${f[1]}-${f[0]} (${U.surname(C.names[f[3]] || '')}, ${U.overs(f[2], F.bpo)})`).join(', ')}</p>}
            <div className="tblwrap">
              <table className="tbl">
                <thead><tr><th className="l">Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th></tr></thead>
                <tbody>
                  {inn.bowl.map((b) => {
                    const [pid, balls, md, runs, wk, wd, nb] = b;
                    return (
                      <tr className="tap" key={pid} onClick={() => goPlayer(pid)}>
                        <td className="l b">{C.names[pid] || '?'}{wd || nb ? <> <span className="tiny dim">{wd ? wd + 'wd' : ''}{wd && nb ? ' ' : ''}{nb ? nb + 'nb' : ''}</span></> : null}</td>
                        <td>{U.overs(balls, F.bpo)}</td><td>{md}</td><td>{runs}</td><td className="b">{wk}</td><td className="dim">{U.econ(runs, balls)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Fragment>
        );
      })}
    </>
  );
}

export function Charts({ C }) {
  const F = SK.FORMATS[C.fmt] || SK.FORMATS.T20;
  const inns = C.inns.filter(i => !i.so);
  if (!inns.length || !inns[0].overs.length) return <div className="empty">Charts appear after the first over.</div>;
  const cols = ['#d9c27e', '#8fc3e6', '#e8a07a', '#9be3b2'];
  // worm: cumulative runs by over for each innings
  let worm = null;
  if (F.lo && inns.length >= 2) {
    const Wd = 360, Hd = 170; const maxO = F.overs;
    const all = inns.map(i => { let t = 0; return [0].concat(i.overs.map(o => (t += o[0]))); });
    const maxR = Math.max(...all.flat(), 50);
    const x = (o) => 26 + o * (Wd - 32) / maxO, y = (r) => Hd - 18 - r * (Hd - 30) / maxR;
    worm = (
      <>
        <div className="sec"><h2>The worm</h2></div>
        <div className="chart">
          <svg viewBox={`0 0 ${Wd} ${Hd}`} role="img" aria-label="Cumulative runs">
            <line x1="24" x2={Wd} y1={Hd - 18} y2={Hd - 18} stroke="#36594b" />
            {[0, Math.round(maxR / 2), Math.round(maxR)].map(v => <text key={v} x="0" y={(y(v) + 4).toFixed(1)} fill="#7f968a" fontSize="10">{v}</text>)}
            {all.map((pts, k) => <polyline key={k} fill="none" stroke={cols[k % 4]} strokeWidth="2.4" points={pts.map((r, o) => `${x(o).toFixed(1)},${y(r).toFixed(1)}`).join(' ')} />)}
            {inns.map((inn, k) => { let t = 0; return inn.overs.map((o, i) => { t += o[0]; return o[1] ? <circle key={`${k}-${i}`} cx={x(i + 1).toFixed(1)} cy={y(t).toFixed(1)} r="3.2" fill="#e0564d" /> : null; }); })}
          </svg>
        </div>
        <div className="legend">
          {inns.map((inn, k) => <span key={k}><i style={{ background: cols[k % 4] }} />{C.sides[inn.bat].short}</span>)}
          <span><i style={{ background: '#e0564d', borderRadius: '50%' }} />Wicket</span>
        </div>
      </>
    );
  }
  // wagon wheel for the last innings
  const last = inns[inns.length - 1];
  let wheel = null;
  if (last.log && last.log.length) {
    const Wd = 300, Hd = 300, cx = 150, cy = 150, sc = 140 / 76;
    wheel = (
      <>
        <div className="sec"><h2>Scoring shots</h2><p className="small dim">{C.sides[last.bat].name}: where the runs went. Gold fours, green sixes. Off side on the right for right-handers.</p></div>
        <div className="chart" style={{ maxWidth: 320, margin: '0 auto' }}>
          <svg viewBox={`0 0 ${Wd} ${Hd}`} role="img" aria-label="Wagon wheel">
            <ellipse cx={cx} cy={cy} rx={70 * sc} ry={72 * sc} fill="#2b6643" stroke="#eef1e8" strokeWidth="1" />
            <rect x={cx - 3} y={cy - 20} width="6" height="40" fill="#cdb98a" />
            {last.log.map(([, br, a, d], i) => {
              if (!br) return null;
              const ang = a * Math.PI / 180; const dd = Math.min(76, d);
              return <line key={i} x1={cx} y1={cy} x2={(cx + Math.sin(ang) * dd * sc).toFixed(1)} y2={(cy - Math.cos(ang) * dd * sc).toFixed(1)} stroke={br === 6 ? '#9be3b2' : br === 4 ? '#d9c27e' : 'rgba(238,241,232,0.35)'} strokeWidth={br >= 4 ? 1.8 : 1} />;
            })}
          </svg>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="sec"><h2>Runs per over</h2></div>
      {inns.map((inn, k) => {
        const n = inn.overs.length; const maxR = Math.max(12, ...inn.overs.map(o => o[0]));
        const Wd = 360, Hd = 130, bw = Math.max(2, (Wd - 30) / Math.max(n, F.lo ? F.overs : 20)); const sy = (Hd - 24) / maxR;
        return (
          <div className="chart" key={k}>
            <div className="small dim" style={{ margin: '0 4px 4px' }}>{C.sides[inn.bat].name} {inn.runs}/{inn.wkts}</div>
            <svg viewBox={`0 0 ${Wd} ${Hd}`} role="img" aria-label="Runs per over">
              {[0, Math.round(maxR / 2), maxR].map(v => <text key={v} x="2" y={(Hd - 16 - v * sy + 4).toFixed(1)} fill="#7f968a" fontSize="10">{v}</text>)}
              <line x1="22" x2={Wd} y1={Hd - 16} y2={Hd - 16} stroke="#36594b" />
              {inn.overs.map((o, i) => {
                const x = 24 + i * bw, hgt = o[0] * sy;
                return (
                  <Fragment key={i}>
                    <rect x={x.toFixed(1)} y={(Hd - 16 - hgt).toFixed(1)} width={Math.max(1, bw - 1.5).toFixed(1)} height={hgt.toFixed(1)} fill={cols[k % 4]} opacity="0.9" />
                    {Array.from({ length: o[1] }, (_, j) => <circle key={j} cx={(x + bw / 2).toFixed(1)} cy={(Hd - 22 - hgt - j * 8).toFixed(1)} r="3" fill="#e0564d" />)}
                  </Fragment>
                );
              })}
            </svg>
          </div>
        );
      })}
      {worm}
      {wheel}
    </>
  );
}

// ===================================================================== stored scorecard screens
export function QuickResultScreen({ params }) {
  return (
    <Page title="Result">
      <ScoreCard C={params.card} />
      <div className="btnrow">
        <button className="btn ghost" onClick={() => nav.go('prematch', { ctx: params.ctx }, { replace: true })}>Rematch</button>
        <button className="btn" onClick={() => app.toMenu()}>Main menu</button>
      </div>
    </Page>
  );
}

export function ScorecardScreen({ params }) {
  const w = app.world; const fx = w.fx[params.fx];
  const st = useSt({ tab: 'card' });
  let body;
  if (!fx) body = <div className="empty">This match is no longer stored.</div>;
  else if (!fx.card) {
    const r = fx.result;
    body = !r ? <div className="empty">Not played yet.</div> : (
      <>
        <div className="sec">
          <p className="b hi">{r.text}</p>
          {r.inns.map((i, k) => <p key={k}>{w.teams[i.team].name} {i.runs}/{i.wkts}{i.dec ? 'd' : ''} <span className="dim">({U.overs(i.balls, fx.fmt === 'HUN' ? 5 : 6)} ov)</span></p>)}
          {r.mom != null && <p className="small dim">Player of the match: {w.players[r.mom].name}</p>}
        </div>
        {(r.tops || []).length > 0 && (
          <>
            <div className="sec"><h2>Top performers</h2></div>
            <div className="list">
              {r.tops.map((t, i) => <button className="row" key={i} onClick={() => goPlayer(t.pid)}><span className="grow t">{w.players[t.pid].name}</span><span className="num">{t.t === 'b' ? `${t.r}${t.no ? '*' : ''} (${t.b})` : `${t.w}/${t.r}`}</span></button>)}
            </div>
          </>
        )}
        <p className="sec tiny dimmer">Full scorecards are kept for your own matches.</p>
      </>
    );
  } else {
    const C = MU.cardFromStored(fx.card);
    body = (
      <>
        <div className="mtabs">
          {[['card', 'Scorecard'], ['charts', 'Charts']].map(([k, l]) => <button key={k} className={st.tab === k ? 'on' : ''} onClick={() => { st.tab = k; refresh(); }}>{l}</button>)}
        </div>
        {st.tab === 'card' ? <ScoreCard C={C} /> : <Charts C={C} />}
      </>
    );
  }
  return <Page title="Scorecard" sub={fx ? W.fixtureTitle(w, fx) : ''}>{body}</Page>;
}
