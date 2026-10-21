/* Skipper — match UI: pre-match, toss, live play, scorecards, charts, field view */
(function (G) {
  'use strict';
  const SK = G.SK = G.SK || {};
  const U = SK.U, UI = SK.UI, R = SK.R, W = SK.World, esc = SK.U.esc;
  const MU = SK.MatchUI = {};

  const SPEEDS = { slow: 1300, normal: 650, fast: 260, turbo: 70 };
  const fmtLabel = (k) => SK.FORMATS[k] ? SK.FORMATS[k].label : k;

  // ===================================================================== pre-match
  // ctx: { kind:'career', fxId } | { kind:'quick', teams:[{...team, squad:[pids], comp}], fmt, venue, userSide, title }
  MU.contextTeams = function (ctx) {
    const w = SK.App.world;
    if (ctx.kind === 'career') {
      const fx = w.fx[ctx.fxId];
      return [fx.home, fx.away].map(k => w.teams[k]);
    }
    return ctx.teams;
  };
  MU.poolFor = function (ctx, side) {
    const w = SK.App.world;
    if (ctx.kind === 'career') {
      const fx = w.fx[ctx.fxId]; const key = [fx.home, fx.away][side];
      return W.squadFor(w, key, fx).concat(W.isNat(key) ? [] : w.teams[key].squad.map(id => w.players[id]).filter(p => !p.retired && W.onDuty(p, fx.date)))
        .filter((p, i, a) => a.indexOf(p) === i);
    }
    return ctx.teams[side].pool;
  };
  MU.engineFmt = (ctx) => {
    if (ctx.kind === 'career') { const fx = SK.App.world.fx[ctx.fxId]; return W.engineFmt(fx.comp === 'ICC' ? 'INTL' : fx.comp, fx.fmt); }
    return ctx.fmt;
  };
  MU.userSide = (ctx) => {
    if (ctx.kind === 'career') { const w = SK.App.world; const fx = w.fx[ctx.fxId]; return fx.home === w.user.team ? 0 : fx.away === w.user.team ? 1 : null; }
    return ctx.userSide;
  };
  MU.osRules = function (ctx, side) {
    const w = SK.App.world;
    const team = MU.contextTeams(ctx)[side];
    const compId = team.comp; const comp = w && w.comps[compId];
    if (!comp || compId === 'INTL' || !comp.home || comp.home === '-') return { max: 11, isOS: () => false, home: null };
    return { max: comp.osXI, isOS: (p) => SK.DB.isOverseasFor(p, comp.home), home: comp.home };
  };
  MU.defaultXI = function (ctx, side) {
    const w = SK.App.world;
    if (ctx.kind === 'career') { const fx = w.fx[ctx.fxId]; return W.pickXIFor(w, [fx.home, fx.away][side], fx).map(p => p.id); }
    const os = MU.osRules(ctx, side);
    return SK.Sel.pickXI(ctx.teams[side].pool, { fmt: ctx.fmt, maxOverseas: os.max, isOverseas: os.isOS, pitch: ctx.venue && ctx.venue.pitch }).map(p => p.id);
  };

  UI.register('prematch', {
    title: (p) => 'Match day',
    sub: (p) => MU.titleOf(p.ctx),
    cls: 'no-tabs',
    right: (p) => (p.ctx.kind === 'career' ? `<button class="iconbtn" data-act="hub" aria-label="Back to home">${UI.icons.home}</button>` : ''),
    render(p, st) {
      const w = SK.App.world; const ctx = p.ctx;
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
      let html = `<div class="vs"><div class="side">${UI.badge(teams[0], 'lg')}<span class="nm">${esc(teams[0].name)}</span><span class="tiny dim">XI rating ${strength(0).toFixed(1)}</span></div><span class="v">v</span><div class="side">${UI.badge(teams[1], 'lg')}<span class="nm">${esc(teams[1].name)}</span><span class="tiny dim">XI rating ${strength(1).toFixed(1)}</span></div></div>`;
      html += `<div class="cond"><div><div class="k">Format</div><div class="vv">${esc(F.label)}${F.lo ? `, ${F.overs * F.bpo / (F.bpo === 5 ? 1 : F.bpo)}${F.bpo === 5 ? ' balls' : ' overs'}` : `, ${F.days} days`}</div></div><div><div class="k">Venue</div><div class="vv ellip">${esc(venue.name || 'Neutral')}</div></div>
        <div><div class="k">Pitch</div><div class="vv">${esc(pitch.name)}</div></div><div><div class="k">${date ? 'Date' : 'Home side'}</div><div class="vv">${esc(date || (teams[0].name))}</div></div></div>`;
      html += `<p class="sec small dim">${esc(MU.pitchReport(venue.pitch, F))}</p>`;
      if (us != null) {
        html += `<div class="sec hrow"><h2>Your XI</h2><span><button class="linkbtn" data-act="autoXI">Auto-pick</button> &nbsp; <button class="linkbtn" data-act="changeXI">Change players</button></span></div>`;
        html += MU.xiEditor(st, us, fmtk, ctx);
        const os = MU.osRules(ctx, us);
        if (os.home) { const n = players(us).filter(os.isOS).length; html += `<p class="sec tiny ${n > os.max ? 'neg' : 'dim'}">Overseas players: ${n} of ${os.max} allowed</p>`; }
        html += `<div class="sec"><h2>Captaincy</h2></div><div class="list">
          <div class="row"><div class="grow"><div class="t">Choose bowlers myself</div><div class="s">Off: the computer picks your bowling changes</div></div>${UI.toggle('setManualBowl', SK.Store.settings.manualBowl)}</div>
          <div class="row"><div class="grow"><div class="t">Set field myself</div><div class="s">Off: the computer sets attacking or defensive fields</div></div>${UI.toggle('setManualField', SK.Store.settings.manualField)}</div></div>`;
      }
      const oppSide = us == null ? null : 1 - us;
      const show = us == null ? [0, 1] : [oppSide];
      for (const s of show) {
        html += `<div class="sec"><h2>${esc(teams[s].short)} probable XI</h2></div><div class="list">${players(s).map((x, i) => `<button class="row" data-act="player" data-arg="${x.id}"><span class="dimmer small" style="width:18px">${i + 1}</span><div class="grow"><div class="t ellip">${esc(x.name)}</div><div class="s">${MU.roleLine(x)}</div></div><span class="num small dim">${Math.round(R.overall(x, fmtk))}</span></button>`).join('')}</div>`;
      }
      html += `<div class="btnrow"><button class="btn ghost" data-act="simMatch">Sim match</button><button class="btn" data-act="toss">${us == null ? 'Start match' : 'Go to the toss'}</button></div>`;
      return html;
    },
    actions: {
      autoXI(a, el, p, st) { const us = MU.userSide(p.ctx); st.xi[us] = MU.defaultXI(p.ctx, us); st.cap[us] = null; st.wk[us] = null; UI.refresh(); },
      up(a, el, p, st) { const us = MU.userSide(p.ctx); const i = +a; if (i > 0) { const x = st.xi[us]; [x[i - 1], x[i]] = [x[i], x[i - 1]]; UI.refresh(); } },
      down(a, el, p, st) { const us = MU.userSide(p.ctx); const i = +a; const x = st.xi[us]; if (i < x.length - 1) { [x[i + 1], x[i]] = [x[i], x[i + 1]]; UI.refresh(); } },
      changeXI(a, el, p, st) { MU.xiSheet(p, st); },
      xiMenu(a, el, p, st) { MU.xiMenu(p, st, +a); },
      player(a) { UI.go('player', { pid: +a }); },
      setManualBowl(v, el) { SK.Store.settings.manualBowl = el.checked; SK.Store.saveSettings(); },
      setManualField(v, el) { SK.Store.settings.manualField = el.checked; SK.Store.saveSettings(); },
      toss(a, el, p, st) { MU.startToss(p, st); },
      simMatch(a, el, p, st) { MU.simWhole(p, st); },
      hub() { UI.go('home', {}, { reset: true }); },
    },
  });
  MU.pl = (id) => (SK.App.world ? SK.App.world.players[id] : SK.App.quickPlayers[id]);
  MU.roleLine = function (x) {
    const b = x.bowl !== '-' ? ` / ${UI.bowlShort[x.bowl]}` : '';
    return `${UI.roleName[x.role]}${b}${x.injury > 0 ? ' <span class="pill inj">Injured</span>' : ''}`;
  };
  MU.titleOf = function (ctx) {
    const w = SK.App.world;
    if (ctx.kind === 'career') return W.fixtureTitle(w, w.fx[ctx.fxId]);
    return ctx.title || 'Quick match';
  };
  MU.venueOf = function (ctx) {
    if (ctx.kind === 'career') return SK.App.world.fx[ctx.fxId].venue;
    return ctx.venue;
  };
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
  MU.xiEditor = function (st, us, fmtk) {
    const ids = st.xi[us];
    return `<div class="list">${ids.map((id, i) => { const x = MU.pl(id); const cap = st.cap[us] === id, wk = st.wk[us] === id;
      return `<div class="xirow"><span class="no">${i + 1}</span><button class="grow" style="background:none;border:0;text-align:left;padding:0;color:inherit" data-act="xiMenu" data-arg="${i}"><div class="t ellip b">${esc(x.name)}${cap ? ' <span class="pill gold">C</span>' : ''}${wk ? ' <span class="pill">WK</span>' : ''}</div><div class="s small dim">${MU.roleLine(x)} &nbsp;Bat ${Math.round(R.bat(x, fmtk))}${x.bowl !== '-' ? ` Bowl ${Math.round(R.bowl(x, fmtk))}` : ''} ${UI.formArrow(x.form, true)}</div></button><span class="mv"><button data-act="up" data-arg="${i}" aria-label="Move up">▲</button><button data-act="down" data-arg="${i}" aria-label="Move down">▼</button></span></div>`; }).join('')}</div>`;
  };
  MU.xiMenu = function (p, st, i) {
    const us = MU.userSide(p.ctx); const id = st.xi[us][i]; const x = MU.pl(id);
    UI.sheet(`<h3>${esc(x.name)}</h3><div class="list">
      <button class="row" data-act="cap"><span class="grow t">Make captain</span></button>
      <button class="row" data-act="wk"><span class="grow t">Make wicketkeeper</span></button>
      <button class="row" data-act="swap"><span class="grow t">Replace with another player</span></button>
      <button class="row" data-act="view"><span class="grow t">View profile</span></button></div>`, {
      cap: () => { st.cap[us] = id; UI.closeSheet(); UI.refresh(); },
      wk: () => { st.wk[us] = id; UI.closeSheet(); UI.refresh(); },
      swap: () => { UI.closeSheet(); MU.xiSheet(p, st, i); },
      view: () => { UI.closeSheet(); UI.go('player', { pid: id }); },
    });
  };
  MU.xiSheet = function (p, st, replaceIdx) {
    const us = MU.userSide(p.ctx); const fmtk = MU.engineFmt(p.ctx);
    const pool = MU.poolFor(p.ctx, us).slice().sort(U.by(x => R.overall(x, fmtk), true));
    const sel = new Set(st.xi[us]);
    const os = MU.osRules(p.ctx, us);
    const w = SK.App.world; const fx = p.ctx.kind === 'career' ? w.fx[p.ctx.fxId] : null;
    const row = (x) => {
      const on = sel.has(x.id);
      const duty = fx && W.onDuty(x, fx.date);
      return `<button class="row ${on ? 'sel' : ''}" data-act="pick" data-arg="${x.id}"><div class="grow"><div class="t ellip">${esc(x.name)} ${os.isOS(x) ? '<span class="pill os">OS</span>' : ''}${x.injury > 0 ? ' <span class="pill inj">Injured</span>' : ''}${duty ? ' <span class="pill duty">On duty</span>' : ''}</div><div class="s">${MU.roleLine(x)}</div></div><span class="num small">Bat ${Math.round(R.bat(x, fmtk))}<br>${x.bowl !== '-' ? 'Bowl ' + Math.round(R.bowl(x, fmtk)) : ''}</span></button>`;
    };
    const draw = () => `<h3>${replaceIdx != null ? 'Choose replacement' : 'Pick your XI'}</h3><p class="sec small dim" style="padding-top:0">${replaceIdx != null ? 'Tap a player to bring him in.' : `${sel.size} of 11 selected. Tap to add or remove.`}</p><div class="list">${pool.map(row).join('')}</div><div class="btnrow"><button class="btn" data-act="done">Done</button></div>`;
    const sheet = UI.sheet(draw(), {
      pick: (a) => {
        const id = +a; const x = MU.pl(id);
        if (x.injury > 0) { UI.toast('He is injured.'); return; }
        if (replaceIdx != null) {
          if (sel.has(id)) { UI.toast('Already in the XI.'); return; }
          st.xi[us][replaceIdx] = id; UI.closeSheet(); UI.refresh(); return;
        }
        if (sel.has(id)) sel.delete(id); else { if (sel.size >= 11) { UI.toast('Remove someone first.'); return; } sel.add(id); }
        sheet.innerHTML = '<div class="grab"></div>' + draw();
      },
      done: () => {
        if (replaceIdx == null) {
          if (sel.size !== 11) { UI.toast('Pick exactly 11 players.'); return; }
          const keep = st.xi[us].filter(id => sel.has(id)); const add = [...sel].filter(id => !keep.includes(id));
          st.xi[us] = keep.concat(add);
          if (!sel.has(st.cap[us])) st.cap[us] = null; if (!sel.has(st.wk[us])) st.wk[us] = null;
        }
        UI.closeSheet(); UI.refresh();
      },
    });
  };
  MU.validateXI = function (p, st) {
    const us = MU.userSide(p.ctx); if (us == null) return true;
    const ids = st.xi[us];
    if (ids.length !== 11) { UI.toast('You need 11 players.'); return false; }
    const os = MU.osRules(p.ctx, us);
    if (ids.map(MU.pl).filter(os.isOS).length > os.max) { UI.toast(`Too many overseas players (max ${os.max}).`); return false; }
    if (ids.map(MU.pl).some(x => x.injury > 0)) { UI.toast('Your XI includes an injured player.'); return false; }
    return true;
  };
  MU.buildMatch = function (p, st, fast) {
    const ctx = p.ctx; const us = MU.userSide(ctx);
    const manual = { bowl: !!SK.Store.settings.manualBowl, field: !!SK.Store.settings.manualField };
    if (ctx.kind === 'career') {
      const w = SK.App.world; const fx = w.fx[ctx.fxId];
      if (us != null) { w.user.lineup = w.user.lineup || {}; w.user.lineup[w.user.team + ':' + MU.engineFmt(ctx)] = { xi: st.xi[us].slice(), cap: st.cap[us], wk: st.wk[us] }; }
      return W.buildMatch(w, fx, { fast, userSide: us, manual, xi: st.xi, cap: st.cap, keeper: st.wk });
    }
    const teams = ctx.teams.map((t, i) => ({ id: t.id, name: t.name, short: t.short, c1: t.c1, c2: t.c2, xi: st.xi[i].map(MU.pl), captainId: st.cap[i] != null ? st.cap[i] : t.cap, keeperId: st.wk[i] }));
    return new SK.Match({ format: ctx.fmt, teams, venue: ctx.venue, homeSide: ctx.neutral ? null : 0, fast, userSide: us, manual, knockout: true, title: ctx.title || 'Quick match' });
  };
  MU.simWhole = function (p, st) {
    if (!MU.validateXI(p, st)) return;
    const m = MU.buildMatch(p, st, true);
    m.doToss(); m.simToEnd(80000);
    MU.finishMatch(p.ctx, m);
  };
  MU.startToss = function (p, st) {
    if (!MU.validateXI(p, st)) return;
    const m = MU.buildMatch(p, st, false);
    const us = MU.userSide(p.ctx);
    SK.App.match = { m, ctx: p.ctx };
    if (us == null) { m.doToss(); UI.go('live', { ctx: p.ctx }, { replace: true }); return; }
    const teams = m.sides;
    const callerSide = us; // user calls (simplification: away captain calls, we let the user call)
    UI.sheet(`<h3>The toss</h3><p class="sec dim" style="padding-top:0">${esc(teams[1 - us].name)} captain tosses. Call it.</p><div class="btnrow"><button class="btn ghost" data-act="call" data-arg="H">Heads</button><button class="btn ghost" data-act="call" data-arg="T">Tails</button></div>`, {
      call: (c) => {
        const t = m.doToss(c, callerSide);
        if (t.winner === us && !t.decision) {
          const sh = document.querySelector('.sheet');
          sh.innerHTML = `<div class="grab"></div><h3>It's ${t.coin === 'H' ? 'heads' : 'tails'}. You won the toss</h3><p class="sec dim" style="padding-top:0">${esc(MU.pitchReport(m.pitch.code, m.F))}${m.F.lo && m.dew > 0.5 ? ' Heavy dew is expected later.' : ''}${!m.F.lo && m.overcast > 0.6 ? ' It is overcast.' : ''}</p><div class="btnrow"><button class="btn" data-act="dec" data-arg="bat">Bat first</button><button class="btn" data-act="dec" data-arg="bowl">Bowl first</button></div>`;
        } else {
          const sh = document.querySelector('.sheet');
          sh.innerHTML = `<div class="grab"></div><h3>It's ${t.coin === 'H' ? 'heads' : 'tails'}. ${esc(teams[t.winner].name)} won the toss</h3><p class="sec dim" style="padding-top:0">They chose to ${t.decision} first.</p><div class="btnrow"><button class="btn" data-act="go">Start match</button></div>`;
        }
      },
      dec: (d) => { m.tossDecide(d); UI.closeSheet(); UI.go('live', { ctx: p.ctx }, { replace: true }); },
      go: () => { UI.closeSheet(); UI.go('live', { ctx: p.ctx }, { replace: true }); },
    });
  };

  // ===================================================================== live
  const L = MU.live = {};
  UI.register('live', {
    title: (p) => { const a = SK.App.match; return a ? `${a.m.sides[0].short} v ${a.m.sides[1].short}` : 'Match'; },
    sub: (p) => { const a = SK.App.match; return a ? (a.m.title || '') : ''; },
    cls: 'match no-tabs',
    right: () => `<button class="iconbtn" data-act="menu" aria-label="Match options">${UI.icons.more}</button>`,
    render(p, st) {
      const a = SK.App.match; if (!a) return '<div class="empty">No match in progress.</div>';
      st.tab = st.tab || 'live';
      const tabs = `<div class="mtabs">${[['live', 'Live'], ['card', 'Scorecard'], ['charts', 'Charts']].map(([k, l]) => `<button class="${st.tab === k ? 'on' : ''}" data-act="tab" data-arg="${k}">${l}</button>`).join('')}</div>`;
      let body = '';
      if (st.tab === 'live') body = `<div id="lv-board"></div><div id="lv-balls"></div><div id="lv-banner"></div>${SK.Store.settings.showField ? '<div class="fieldwrap"><canvas id="lv-field"></canvas><span class="fieldcap" id="lv-fcap"></span></div>' : ''}<div id="lv-ctl"></div><div class="sec"><h2>Commentary</h2></div><div class="comm" id="lv-comm"></div>`;
      else if (st.tab === 'card') body = `<div id="lv-board"></div>` + MU.scorecardHTML(MU.cardFromMatch(a.m));
      else body = `<div id="lv-board"></div>` + MU.chartsHTML(MU.cardFromMatch(a.m));
      return tabs + body + `<div class="dock" id="lv-dock"></div>`;
    },
    mount(root, p, st) {
      const a = SK.App.match; if (!a) return;
      L.ctx = p.ctx; L.st = st;
      if (st.lastSeq == null) st.lastSeq = 0;
      if (!st.comm) st.comm = [];
      L.drawBoard(); L.drawDock();
      if (st.tab === 'live') { L.drawBalls(); L.drawCtl(); L.drawBanner(); L.drawComm(true); L.drawField(null); }
      SK.Store.keepAwake(SK.Store.settings.keepAwake);
      L.checkPending();
    },
    unmount() { L.stopAuto(); SK.Store.keepAwake(false); },
    onBack(p, st) {
      const a = SK.App.match;
      if (a && a.m.phase !== 'done') { L.stopAuto(); UI.confirm({ title: 'Leave this match?', body: 'The rest of the match will be simulated by the computer.' }, 'Sim and leave', 'Keep playing').then(ok => { if (ok) { L.simRest(true); } }); return true; }
      if (a && a.m.phase === 'done') { MU.finishMatch(L.ctx, a.m); return true; }
      return false;
    },
    actions: {
      tab(k, el, p, st) { L.stopAuto(); st.tab = k; UI.refresh(); },
      step(k) { L.step(k); },
      auto() { if (L.timer) L.stopAuto(); else L.startAuto(); L.drawDock(); },
      sim() { L.simMenu(); },
      menu() { L.optionsMenu(); },
      agg(a, el) { const [pid, lv] = a.split(':'); SK.App.match.m.setAggression(+pid, lv === 'auto' ? null : +lv); L.drawCtl(); },
      field(f) { const m = SK.App.match.m; m.setField(m.cur.bowl, f === 'auto' ? null : f); L.drawCtl(); L.drawField(null); },
      bowlerSheet() { L.bowlerSheet(false); },
      declare() { UI.confirm({ title: 'Declare now?', body: `Your innings will close at ${SK.App.match.m.cur.runs}/${SK.App.match.m.cur.wkts}.` }, 'Declare').then(ok => { if (ok) { SK.App.match.m.declare(); L.afterSteps(); } }); },
      newball() { const m = SK.App.match.m; if (m.takeNewBall()) { L.afterSteps(); UI.toast('New ball taken.'); } },
      finish() { MU.finishMatch(L.ctx, SK.App.match.m); },
      viewCard() { L.st.tab = 'card'; UI.refresh(); },
      player(a) { UI.go('player', { pid: +a }); },
    },
  });

  L.isUserBat = () => { const m = SK.App.match.m; return m.userSide != null && m.cur && m.cur.bat === m.userSide; };
  L.isUserBowl = () => { const m = SK.App.match.m; return m.userSide != null && m.cur && m.cur.bowl === m.userSide; };
  L.nm = (id) => SK.App.match.m.nm(id);

  L.drawBoard = function (flash) {
    const el = document.getElementById('lv-board'); if (!el) return;
    const m = SK.App.match.m; const inn = m.cur; const F = m.F;
    if (!inn) { el.innerHTML = `<div class="board"><div class="ttl"><span>${esc(m.title)}</span></div><div class="main"><span class="team">${esc(m.sides[0].short)} v ${esc(m.sides[1].short)}</span></div></div>`; return; }
    const bat = m.sides[inn.bat];
    const st = inn.card[inn.st], ns = inn.card[inn.ns];
    const ovs = U.overs(inn.balls, F.bpo);
    let meta = [];
    if (F.lo) {
      const ballsLeft = inn.maxBalls - inn.balls;
      if (F.bpo === 5) meta.push(`<span><b>${inn.balls}</b> balls</span>`); else meta.push(`<span><b>${ovs}</b>${inn.so ? '' : `/${F.overs}`} ov</span>`);
      meta.push(`<span>RR <b>${U.rr(inn.runs, inn.balls)}</b></span>`);
      if (inn.target && m.phase !== 'done') { const need = inn.target - inn.runs; meta.push(`<span class="need">Need ${need} off ${ballsLeft}</span>`); meta.push(`<span>Req <b>${U.rr(need, ballsLeft)}</b></span>`); }
      else if (inn.n === 0 && inn.balls >= 30 && !inn.so) { const proj = Math.round(inn.runs + (inn.runs / inn.balls) * ballsLeft); meta.push(`<span>Projected <b>${proj}</b></span>`); }
    } else {
      const sess = Math.min(3, 1 + Math.floor(m.dayBalls / (30 * 6)));
      meta.push(`<span><b>${ovs}</b> ov</span>`, `<span>Day <b>${m.day}</b>, session ${sess}</span>`);
      const lead = m.leadFor(inn.bat);
      if (inn.target && m.phase !== 'done') meta.push(`<span class="need">Need ${inn.target - inn.runs} to win</span>`);
      else if (inn.n > 0) meta.push(`<span class="${lead >= 0 ? '' : 'need'}">${lead >= 0 ? 'Lead by' : 'Trail by'} <b>${Math.abs(lead)}</b></span>`);
      meta.push(`<span>RR <b>${U.rr(inn.runs, inn.balls)}</b></span>`);
    }
    const plate = (c, on) => c ? `<div class="plate ${on ? 'on' : ''}"><span class="n">${esc(m.nm(c.pid))}</span><span class="r">${c.runs}</span><span class="bb">${c.balls}</span></div>` : '<div class="plate"><span class="n dimmer">—</span></div>';
    const b = inn.cur != null ? inn.bw[inn.cur] : null;
    const bowl = inn.cur != null && b ? `<div class="plate bowl"><span class="n">${esc(m.nm(inn.cur))}</span><span class="r">${b.wkts}-${b.runs}</span><span class="bb">${U.overs(b.balls, F.bpo)} ov</span></div>` : '';
    const prev = m.inns.filter(i => i !== inn && !i.so).map(i => `${m.sides[i.bat].short} ${i.runs}/${i.wkts}${i.declared ? 'd' : ''}`).join(', ');
    el.innerHTML = `<div class="board ${flash || ''}"><div class="ttl"><span>${esc(inn.so ? 'Super Over' : (F.lo ? (inn.n === 0 ? 'First innings' : 'Chase') : U.ordinal(inn.n + 1) + ' innings'))}</span><span>${esc(prev)}</span></div>
      <div class="main"><span class="team">${esc(bat.short)}</span><span class="score">${inn.runs}<small>/${inn.wkts}${inn.declared ? 'd' : ''}</small></span></div>
      <div class="meta">${meta.join('')}</div><div class="plates">${plate(st, true)}${plate(ns, false)}${bowl}</div></div>`;
  };
  L.drawBalls = function () {
    const el = document.getElementById('lv-balls'); if (!el) return;
    const m = SK.App.match.m; const inn = m.cur; if (!inn) { el.innerHTML = ''; return; }
    const curOver = Math.floor((inn.balls - (inn.overOpen ? 0 : 1)) / m.F.bpo);
    let balls = inn.log.filter(x => x.o === (inn.overOpen ? Math.floor(inn.balls / m.F.bpo) - (inn.balls % m.F.bpo === 0 && inn.overBalls > 0 ? 1 : 0) : curOver));
    if (!inn.overOpen && inn.overs.length) { const last = inn.overs.length - 1; balls = inn.log.filter(x => x.o === last); }
    const chip = (x) => {
      if (x.w) return '<span class="ball w">W</span>';
      if (x.ex === 'wd') return `<span class="ball x">${x.r > 1 ? x.r : ''}wd</span>`;
      if (x.ex === 'nb') return `<span class="ball x">${x.br || ''}nb</span>`;
      if (x.ex === 'lb' || x.ex === 'b') return `<span class="ball x">${x.r}${x.ex}</span>`;
      if (x.br === 4) return '<span class="ball r4">4</span>'; if (x.br === 6) return '<span class="ball r6">6</span>';
      return `<span class="ball">${x.br === 0 ? '•' : x.br}</span>`;
    };
    el.innerHTML = `<div class="balls"><span class="ballslabel">${inn.overOpen ? 'This over' : 'Last over'}</span>${balls.map(chip).join('') || '<span class="dimmer small">New over</span>'}</div>`;
  };
  L.drawCtl = function () {
    const el = document.getElementById('lv-ctl'); if (!el) return;
    const m = SK.App.match.m; const inn = m.cur;
    if (!inn || m.phase === 'done') { el.innerHTML = ''; return; }
    let h = '';
    if (L.isUserBat()) {
      const opts = [['auto', 'Auto'], ['1', 'Block'], ['2', 'Defend'], ['3', 'Normal'], ['4', 'Attack'], ['5', 'Slog']];
      for (const idx of [inn.st, inn.ns]) {
        const c = inn.card[idx]; if (!c) continue;
        const set = m.agg[c.pid]; const ai = m.aiAggression(inn, c);
        h += `<div class="ctl"><div class="lbl"><span>${esc(m.nm(c.pid))} ${idx === inn.st ? '(on strike)' : ''}</span><span>${set ? '' : 'Auto: ' + SK.AGG_NAMES[Math.round(ai)]}</span></div>${UI.seg('agg', opts.map(([v, l]) => [c.pid + ':' + v, l]), c.pid + ':' + (set || 'auto'))}</div>`;
      }
      if (!m.F.lo && !inn.target) h += `<div class="ctl"><button class="btn ghost block sm" data-act="declare">Declare innings</button></div>`;
    } else if (L.isUserBowl()) {
      const f = m.fieldSet[inn.bowl] || 'auto';
      const cur = m.fieldFor(inn);
      h += `<div class="ctl"><div class="lbl"><span>Field setting</span><span>${f === 'auto' ? 'Auto: ' + ({ A: 'Attacking', N: 'Normal', D: 'Defensive' }[cur]) : ''}</span></div>${UI.seg('field', [['auto', 'Auto'], ['A', 'Attacking'], ['N', 'Normal'], ['D', 'Defensive']], f)}</div>`;
      h += `<div class="ctl" style="display:flex;gap:8px"><button class="btn ghost sm grow" data-act="bowlerSheet">Bowlers</button>${m.canTakeNewBall() ? '<button class="btn sm grow" data-act="newball">Take new ball</button>' : ''}</div>`;
    } else {
      h += `<p class="sec small dim">You are watching. Use the buttons below to move the game on.</p>`;
    }
    el.innerHTML = h;
  };
  L.drawBanner = function () {
    const el = document.getElementById('lv-banner'); if (!el) return;
    const m = SK.App.match.m;
    if (m.phase === 'done') {
      const mom = m.mom != null ? m.byId.get(m.mom).p : null;
      el.innerHTML = `<div class="banner"><div class="big">${esc(m.result.text)}</div>${mom ? `<p class="dim">Player of the match: <b class="hi">${esc(mom.name)}</b></p>` : ''}<div class="btnrow" style="padding:8px 0 0"><button class="btn ghost" data-act="viewCard">Scorecard</button><button class="btn" data-act="finish">Continue</button></div></div>`;
    } else el.innerHTML = '';
  };
  L.drawDock = function () {
    const el = document.getElementById('lv-dock'); if (!el) return;
    const m = SK.App.match.m;
    if (m.phase === 'done') { el.innerHTML = `<button class="btn ghost" data-act="viewCard">Scorecard</button><button class="btn" data-act="finish">Continue</button>`; return; }
    const playing = !!L.timer;
    el.innerHTML = `<button class="btn ghost" data-act="auto" aria-label="${playing ? 'Pause' : 'Auto-play'}">${playing ? 'Pause' : 'Play'}</button><button class="btn" data-act="step" data-arg="ball">Next ball</button><button class="btn" data-act="step" data-arg="over">${m.F.bpo === 5 ? 'Next 5' : 'Next over'}</button><button class="btn ghost" data-act="sim">More</button>`;
  };
  L.drawComm = function (full) {
    const el = document.getElementById('lv-comm'); if (!el) return;
    const st = L.st;
    const item = (e) => {
      let cls = '';
      if (e.type === 'ball') { if (e.wkt) cls = 'w'; else if (e.bat === 4) cls = 'b4'; else if (e.bat === 6) cls = 'b6'; }
      else if (e.type === 'over') cls = 'ov'; else if (e.type === 'milestone' || e.type === 'end' || e.type === 'innEnd' || e.type === 'super' || e.type === 'declare') cls = 'ms'; else cls = 'ov';
      return `<div class="c ${cls}"><span class="o">${e.type === 'ball' ? esc(e.ov) : ''}</span><span class="tx">${esc(e.text)}</span></div>`;
    };
    el.innerHTML = st.comm.slice(0, 120).map(item).join('') || '<div class="empty small">Waiting for the first ball.</div>';
  };
  L.collect = function () {
    const m = SK.App.match.m; const st = L.st;
    const fresh = m.events.filter(e => e.seq > st.lastSeq);
    if (fresh.length) st.lastSeq = fresh[fresh.length - 1].seq;
    for (const e of fresh) if (e.text && (e.type !== 'bowler' || !e.quiet)) st.comm.unshift(e);
    if (st.comm.length > 400) st.comm.length = 400;
    return fresh;
  };
  L.afterSteps = function (events, animate) {
    events = events || L.collect();
    const lastBall = events.filter(e => e.type === 'ball').pop();
    let flash = '';
    if (lastBall) { if (lastBall.wkt) flash = 'flashW'; else if (lastBall.bat >= 4) flash = 'flash4'; }
    L.drawBoard(flash); L.drawBalls(); L.drawCtl(); L.drawBanner(); L.drawComm(); L.drawDock();
    L.drawField(animate && lastBall ? lastBall : null);
    L.checkPending();
  };
  L.checkPending = function () {
    const m = SK.App.match.m;
    if (m.phase === 'done') { L.stopAuto(); return true; }
    if (m.pending) {
      L.stopAuto();
      if (m.pending.type === 'bowler') L.bowlerSheet(true);
      else if (m.pending.type === 'followon') L.followOnSheet();
      return true;
    }
    return false;
  };
  L.step = function (kind) {
    const m = SK.App.match.m;
    if (m.phase === 'done') return;
    if (m.pending) { L.checkPending(); return; }
    const inn0 = m.cur; const day0 = m.day;
    let n = 0; const limit = kind === 'ball' ? 1 : 6000;
    const longSkip = kind === 'wicket' || kind === 'innings' || kind === 'session';
    while (n < limit && m.phase === 'play') {
      if (m.pending) { if (longSkip && m.pending.type === 'bowler') { m.resolvePendingAI(); continue; } break; }
      const ev = m.next(); n++;
      if (!ev) break;
      if (kind === 'over') { const last = m.events[m.events.length - 1]; if (m.events.some(e => e.seq > L.st.lastSeq && (e.type === 'over' || e.type === 'innEnd'))) break; void last; }
      if (kind === 'wicket' && m.events.some(e => e.seq > L.st.lastSeq && ((e.type === 'ball' && e.wkt) || e.type === 'innEnd'))) break;
      if (kind === 'innings' && (m.cur !== inn0 || m.phase !== 'play')) break;
      if (kind === 'session' && (m.events.some(e => e.seq > L.st.lastSeq && (e.type === 'session' || e.type === 'stumps' || e.type === 'innEnd')) || m.day !== day0)) break;
      if (kind === 'ball') break;
    }
    L.afterSteps(null, kind === 'ball' || kind === 'over');
  };
  L.startAuto = function () {
    L.stopAuto();
    const delay = SPEEDS[SK.Store.settings.speed] || 650;
    const tick = () => {
      const m = SK.App.match.m;
      if (m.phase !== 'play' || m.pending) { L.stopAuto(); L.afterSteps(); return; }
      m.next();
      const ev = L.collect();
      const wk = ev.some(e => e.type === 'ball' && e.wkt);
      L.afterSteps(ev, delay >= 200);
      if (m.cur && ev.some(e => e.type === 'innEnd')) { L.stopAuto(); L.drawDock(); return; }
      L.timer = setTimeout(tick, wk ? delay * 2.2 : delay);
    };
    L.timer = setTimeout(tick, 50);
  };
  L.stopAuto = function () { if (L.timer) { clearTimeout(L.timer); L.timer = null; } };
  L.simMenu = function () {
    const m = SK.App.match.m; const fc = !m.F.lo;
    const sp = SK.Store.settings.speed;
    UI.sheet(`<h3>Move the game on</h3><div class="list">
      <button class="row" data-act="go" data-arg="wicket"><span class="grow t">To the next wicket</span></button>
      ${fc ? '<button class="row" data-act="go" data-arg="session"><span class="grow t">To the end of the session</span></button>' : ''}
      <button class="row" data-act="go" data-arg="innings"><span class="grow t">To the end of this innings</span></button>
      <button class="row" data-act="rest"><div class="grow"><div class="t">Sim the rest of the match</div><div class="s">The computer captains both sides</div></div></button></div>
      <div class="sec"><h2>Play speed</h2></div><div class="ctl">${UI.seg('speed', [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast'], ['turbo', 'Turbo']], sp)}</div>`, {
      go: (k) => { UI.closeSheet(); L.step(k); },
      rest: () => { UI.closeSheet(); L.simRest(false); },
      speed: (v) => { SK.Store.settings.speed = v; SK.Store.saveSettings(); UI.closeSheet(); UI.toast(`Speed: ${v}`); },
    });
  };
  L.simRest = function (thenLeave) {
    const m = SK.App.match.m;
    L.stopAuto();
    UI.busy(true, 'Simulating', 'The computer is finishing the match');
    setTimeout(() => {
      let guard = 0;
      while (m.phase === 'play' && guard++ < 80000) { if (m.pending) m.resolvePendingAI(); else m.next(); }
      UI.busy(false);
      L.collect();
      if (thenLeave) MU.finishMatch(L.ctx, m); else L.afterSteps();
    }, 30);
  };
  L.optionsMenu = function () {
    const m = SK.App.match.m;
    UI.sheet(`<h3>Match options</h3><div class="list">
      <div class="row"><div class="grow"><div class="t">Choose bowlers myself</div></div>${UI.toggle('mb', m.manual.bowl)}</div>
      <div class="row"><div class="grow"><div class="t">Show the field view</div></div>${UI.toggle('sf', SK.Store.settings.showField)}</div>
      <button class="row" data-act="order"><span class="grow t">Change batting order</span></button>
      <button class="row" data-act="rest"><span class="grow t">Sim the rest of the match</span></button></div>`, {
      mb: (v, el) => { m.manual.bowl = el.checked; SK.Store.settings.manualBowl = el.checked; SK.Store.saveSettings(); },
      sf: (v, el) => { SK.Store.settings.showField = el.checked; SK.Store.saveSettings(); UI.closeSheet(); UI.refresh(); },
      order: () => { UI.closeSheet(); L.orderSheet(); },
      rest: () => { UI.closeSheet(); L.simRest(false); },
    });
  };
  L.orderSheet = function () {
    const m = SK.App.match.m; const side = m.userSide; if (side == null) return;
    const s = m.sides[side];
    let order = s.order.slice();
    const inn = m.cur && m.cur.bat === side ? m.cur : null;
    const locked = new Set(inn ? inn.card.map(c => c.pid) : []);
    const draw = () => `<h3>Batting order</h3><p class="sec small dim" style="padding-top:0">Players who have batted are locked.</p><div class="list">${order.map((id, i) => `<div class="xirow"><span class="no">${i + 1}</span><span class="grow ${locked.has(id) ? 'dimmer' : 'b'}">${esc(m.p(id).name)}</span>${locked.has(id) ? '' : `<span class="mv"><button data-act="u" data-arg="${i}">▲</button><button data-act="d" data-arg="${i}">▼</button></span>`}</div>`).join('')}</div><div class="btnrow"><button class="btn" data-act="ok">Done</button></div>`;
    const sh = UI.sheet(draw(), {
      u: (a) => { const i = +a; if (i > 0 && !locked.has(order[i - 1])) { [order[i - 1], order[i]] = [order[i], order[i - 1]]; sh.innerHTML = '<div class="grab"></div>' + draw(); } },
      d: (a) => { const i = +a; if (i < order.length - 1) { [order[i + 1], order[i]] = [order[i], order[i + 1]]; sh.innerHTML = '<div class="grab"></div>' + draw(); } },
      ok: () => { m.setBattingOrder(side, order); UI.closeSheet(); },
    });
  };
  L.bowlerSheet = function (mustPick) {
    const m = SK.App.match.m; const inn = m.cur; if (!inn) return;
    const opts = m.bowlingOptions(inn);
    const rec = m.aiPickBowler(inn, inn.balls === 0);
    const F = m.F;
    const rows = opts.slice().sort((a, b) => (b.ok - a.ok) || (R.bowl(b.p, m.fmtKey) - R.bowl(a.p, m.fmtKey))).map(o => {
      const b = o.stat; const fig = b ? `${U.overs(b.balls, F.bpo)}-${b.maid}-${b.runs}-${b.wkts}` : 'Not bowled';
      const left = F.lo ? `, ${inn.maxOv - o.overs} left` : (b ? `, tiredness ${Math.round(b.fat * 100)}%` : '');
      return `<button class="row ${o.p.id === rec ? 'sel' : ''}" data-act="pick" data-arg="${o.p.id}" ${o.ok ? '' : 'disabled style="opacity:.45"'}><div class="grow"><div class="t ellip">${esc(o.p.name)} ${o.p.id === rec ? '<span class="pill gold">Suggested</span>' : ''}</div><div class="s">${UI.bowlShort[o.p.bowl] || 'Part-time'}, bowling ${Math.round(R.bowl(o.p, m.fmtKey))}. ${fig}${o.ok ? left : '. ' + o.why}</div></div></button>`;
    }).join('');
    UI.sheet(`<h3>${mustPick ? 'Who bowls the next over?' : 'Your bowlers'}</h3><div class="list">${rows}</div><div class="btnrow"><button class="btn ghost" data-act="auto">Let the computer choose</button></div>`, {
      pick: (a) => { if (!m.pending) { UI.closeSheet(); UI.toast('You can change bowler at the end of the over.'); return; } m.chooseBowler(+a); UI.closeSheet(); L.afterSteps(); },
      auto: () => { if (m.pending) { m.chooseBowler(rec); } UI.closeSheet(); L.afterSteps(); },
    });
  };
  L.followOnSheet = function () {
    const m = SK.App.match.m;
    UI.sheet(`<h3>Enforce the follow-on?</h3><p class="sec dim" style="padding-top:0">You lead by ${m.pending.lead} runs. Make them bat again now, or bat yourselves and set a target.</p><div class="btnrow"><button class="btn ghost" data-act="no">Bat again</button><button class="btn" data-act="yes">Enforce</button></div>`, {
      yes: () => { m.enforceFollowOn(true); UI.closeSheet(); L.afterSteps(); },
      no: () => { m.enforceFollowOn(false); UI.closeSheet(); L.afterSteps(); },
    });
  };

  // ---------------------------------------------------------- field view (canvas)
  L.drawField = function (ev) {
    const cv = document.getElementById('lv-field'); if (!cv) return;
    const m = SK.App.match.m; const inn = m.cur;
    const dpr = Math.min(2, G.devicePixelRatio || 1);
    const Wd = cv.clientWidth || 360, Hd = Math.round(Wd * 0.8);
    if (cv.width !== Math.round(Wd * dpr)) { cv.width = Math.round(Wd * dpr); cv.height = Math.round(Hd * dpr); cv.style.height = Hd + 'px'; }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = Wd / 2, cy = Hd / 2 - 4; const sc = Math.min(Wd, Hd) / 2 / 76;
    const sx = cx, sy = cy + 10 * sc; // striker end
    const pt = (ang, d) => { const a = ang * Math.PI / 180; return [sx + Math.sin(a) * d * sc, sy - Math.cos(a) * d * sc]; };
    const base = () => {
      ctx.clearRect(0, 0, Wd, Hd);
      // outfield with mowing stripes
      ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, 70 * sc, 72 * sc, 0, 0, Math.PI * 2); ctx.clip();
      for (let i = -8; i < 8; i++) { ctx.fillStyle = i % 2 ? '#2b6643' : '#2f7049'; ctx.fillRect(cx + i * 10 * sc, 0, 10 * sc, Hd); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(238,241,232,0.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cx, cy, 70 * sc, 72 * sc, 0, 0, Math.PI * 2); ctx.stroke();
      if (m.F.lo) { ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(238,241,232,0.35)'; ctx.beginPath(); ctx.ellipse(cx, cy, 28 * sc, 30 * sc, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      // pitch
      ctx.fillStyle = '#cdb98a'; ctx.fillRect(cx - 1.6 * sc, cy - 11 * sc, 3.2 * sc, 22 * sc);
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(cx - 2.2 * sc, sy - 1.2 * sc, 4.4 * sc, 0.4); ctx.fillRect(cx - 2.2 * sc, cy - 10 * sc + 1.2 * sc, 4.4 * sc, 0.4);
      if (!inn) return;
      // fielders
      const fp = m.fieldPositions(inn);
      for (const f of fp) { const [x, y] = pt(f.angle, f.dist); dot(x, y, 4.2, '#eef1e8', '#123'); }
      const [kx, ky] = pt(180, 13); dot(kx, ky, 4.2, '#eef1e8', '#123'); // keeper
      dot(cx, cy - 12 * sc, 4.6, '#e0564d', '#3a0f0d'); // bowler
      dot(sx + 2.5, sy, 4.6, '#d9c27e', '#3b3115'); // striker
      dot(cx - 2.5, cy - 9.2 * sc, 4, '#d9c27e', '#3b3115'); // non-striker
    };
    const dot = (x, y, r, fill, stroke) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = stroke; ctx.stroke(); };
    const cap = document.getElementById('lv-fcap');
    if (cap && inn) { const f = m.fieldFor(inn); cap.textContent = `${{ A: 'Attacking', N: 'Normal', D: 'Defensive' }[f]} field${m.F.lo && inn.balls / m.F.bpo < m.F.pp ? ', powerplay' : ''}`; }
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
      // delivery
      ctx.beginPath(); ctx.moveTo(bx0, by0); ctx.lineTo(sx, sy - 1);
      if (!shot.stumps && !shot.leave && !shot.wide) { const qx = sx + (ex - sx) * t, qy = sy + (ey - sy) * t; ctx.moveTo(sx, sy); ctx.lineTo(qx, qy); ctx.stroke(); ctx.setLineDash([]); dot(qx, qy, 3.4, '#fff', col); }
      else { ctx.stroke(); ctx.setLineDash([]); }
      if (shot.stumps && t >= 1) { ctx.fillStyle = '#e0564d'; ctx.font = '700 15px Barlow, sans-serif'; ctx.fillText(ev.wkt && ev.wkt.how === 'lbw' ? 'LBW' : 'BOWLED', sx + 10, sy + 5); }
      if (ev.wkt && !shot.stumps && t >= 1) { ctx.strokeStyle = '#e0564d'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ex - 5, ey - 5); ctx.lineTo(ex + 5, ey + 5); ctx.moveTo(ex + 5, ey - 5); ctx.lineTo(ex - 5, ey + 5); ctx.stroke(); }
      if (t < 1) L.anim = requestAnimationFrame(frame);
    };
    L.anim = requestAnimationFrame(frame);
  };

  // ===================================================================== scorecards
  // normalise a live match or a stored compact card into one structure
  MU.cardFromMatch = function (m) {
    const C = SK.Career.compactCard(m);
    C.names = {}; for (const [id, v] of m.byId) C.names[id] = v.p.name;
    return C;
  };
  MU.cardFromStored = function (card) {
    const w = SK.App.world; const C = card;
    C.names = C.names || {};
    for (const s of C.sides) for (const id of s.xi) C.names[id] = w.players[id] ? w.players[id].name : '?';
    return C;
  };
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
  MU.scorecardHTML = function (C) {
    const F = SK.FORMATS[C.fmt] || SK.FORMATS.T20;
    let h = '';
    if (C.res) h += `<div class="sec"><p class="b hi" style="margin:4px 0 0">${esc(C.res)}</p>${C.mom != null && C.names[C.mom] ? `<p class="small dim">Player of the match: ${esc(C.names[C.mom])}</p>` : ''}</div>`;
    C.inns.forEach((inn, k) => {
      const side = C.sides[inn.bat]; const bowlSide = C.sides[1 - inn.bat];
      const ext = inn.ext; const extT = ext.b + ext.lb + ext.w + ext.nb;
      h += `<div class="sec hrow"><h2>${esc(side.name)}${inn.so ? ' super over' : inn.fo ? ' (f/o)' : ''}</h2><span class="b">${inn.runs}/${inn.wkts}${inn.dec ? 'd' : ''} <span class="dim small">(${U.overs(inn.balls, F.bpo)} ov)</span></span></div>`;
      h += `<div class="tblwrap"><table class="tbl"><thead><tr><th class="l">Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead><tbody>`;
      for (const r of inn.card) {
        const [pid, runs, balls, f4, f6] = r;
        const cap = side.cap === pid ? ' (c)' : ''; const wk = side.wk === pid ? ' †' : '';
        h += `<tr class="tap" data-act="player" data-arg="${pid}"><td class="l"><div class="b">${esc(C.names[pid] || '?')}${cap}${wk}</div><div class="how">${esc(HOW(r, C.names))}</div></td><td class="b">${runs}</td><td>${balls}</td><td>${f4}</td><td>${f6}</td><td class="dim">${U.sr(runs, balls)}</td></tr>`;
      }
      h += `<tr><td class="l dim">Extras <span class="tiny">(b ${ext.b}, lb ${ext.lb}, w ${ext.w}, nb ${ext.nb})</span></td><td class="b">${extT}</td><td colspan="4"></td></tr>`;
      h += `</tbody></table></div>`;
      const batted = new Set(inn.card.map(r => r[0]));
      const dnb = side.xi.filter(id => !batted.has(id));
      if (dnb.length && !inn.so) h += `<p class="sec tiny dim">Did not bat: ${dnb.map(id => esc(U.shortName(C.names[id] || '?'))).join(', ')}</p>`;
      if (inn.fow.length) h += `<p class="sec tiny dim">Fall of wickets: ${inn.fow.map(f => `${f[1]}-${f[0]} (${esc(U.surname(C.names[f[3]] || ''))}, ${U.overs(f[2], F.bpo)})`).join(', ')}</p>`;
      h += `<div class="tblwrap"><table class="tbl"><thead><tr><th class="l">Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th></tr></thead><tbody>`;
      for (const b of inn.bowl) {
        const [pid, balls, md, runs, wk, wd, nb] = b;
        h += `<tr class="tap" data-act="player" data-arg="${pid}"><td class="l b">${esc(C.names[pid] || '?')}${wd || nb ? ` <span class="tiny dim">${wd ? wd + 'wd' : ''}${wd && nb ? ' ' : ''}${nb ? nb + 'nb' : ''}</span>` : ''}</td><td>${U.overs(balls, F.bpo)}</td><td>${md}</td><td>${runs}</td><td class="b">${wk}</td><td class="dim">${U.econ(runs, balls)}</td></tr>`;
      }
      h += `</tbody></table></div>`;
      void bowlSide; void k;
    });
    return h || '<div class="empty">No play yet.</div>';
  };
  MU.chartsHTML = function (C) {
    const F = SK.FORMATS[C.fmt] || SK.FORMATS.T20;
    const inns = C.inns.filter(i => !i.so);
    if (!inns.length || !inns[0].overs.length) return '<div class="empty">Charts appear after the first over.</div>';
    const cols = ['#d9c27e', '#8fc3e6', '#e8a07a', '#9be3b2'];
    let h = '';
    // Manhattan per innings
    h += `<div class="sec"><h2>Runs per over</h2></div>`;
    inns.forEach((inn, k) => {
      const n = inn.overs.length; const maxR = Math.max(12, ...inn.overs.map(o => o[0]));
      const Wd = 360, Hd = 130, bw = Math.max(2, (Wd - 30) / Math.max(n, F.lo ? F.overs : 20)); const sy = (Hd - 24) / maxR;
      let bars = '';
      inn.overs.forEach((o, i) => { const x = 24 + i * bw, hgt = o[0] * sy; bars += `<rect x="${x.toFixed(1)}" y="${(Hd - 16 - hgt).toFixed(1)}" width="${Math.max(1, bw - 1.5).toFixed(1)}" height="${hgt.toFixed(1)}" fill="${cols[k % 4]}" opacity="0.9"/>`; for (let j = 0; j < o[1]; j++) bars += `<circle cx="${(x + bw / 2).toFixed(1)}" cy="${(Hd - 22 - hgt - j * 8).toFixed(1)}" r="3" fill="#e0564d"/>`; });
      const ticks = [0, Math.round(maxR / 2), maxR].map(v => `<text x="2" y="${(Hd - 16 - v * sy + 4).toFixed(1)}" fill="#7f968a" font-size="10">${v}</text>`).join('');
      h += `<div class="chart"><div class="small dim" style="margin:0 4px 4px">${esc(C.sides[inn.bat].name)} ${inn.runs}/${inn.wkts}</div><svg viewBox="0 0 ${Wd} ${Hd}" role="img" aria-label="Runs per over">${ticks}<line x1="22" x2="${Wd}" y1="${Hd - 16}" y2="${Hd - 16}" stroke="#36594b"/>${bars}</svg></div>`;
    });
    if (F.lo && inns.length >= 2) {
      // worm
      const Wd = 360, Hd = 170; const maxO = F.overs; const all = inns.map(i => { let t = 0; return [0].concat(i.overs.map(o => (t += o[0]))); });
      const maxR = Math.max(...all.flat(), 50);
      const x = (o) => 26 + o * (Wd - 32) / maxO, y = (r) => Hd - 18 - r * (Hd - 30) / maxR;
      let paths = all.map((pts, k) => `<polyline fill="none" stroke="${cols[k % 4]}" stroke-width="2.4" points="${pts.map((r, o) => `${x(o).toFixed(1)},${y(r).toFixed(1)}`).join(' ')}"/>`).join('');
      inns.forEach((inn, k) => { let t = 0; inn.overs.forEach((o, i) => { t += o[0]; if (o[1]) paths += `<circle cx="${x(i + 1).toFixed(1)}" cy="${y(t).toFixed(1)}" r="3.2" fill="#e0564d"/>`; }); void k; });
      h += `<div class="sec"><h2>The worm</h2></div><div class="chart"><svg viewBox="0 0 ${Wd} ${Hd}" role="img" aria-label="Cumulative runs"><line x1="24" x2="${Wd}" y1="${Hd - 18}" y2="${Hd - 18}" stroke="#36594b"/>${[0, Math.round(maxR / 2), Math.round(maxR)].map(v => `<text x="0" y="${(y(v) + 4).toFixed(1)}" fill="#7f968a" font-size="10">${v}</text>`).join('')}${paths}</svg></div>`;
      h += `<div class="legend">${inns.map((inn, k) => `<span><i style="background:${cols[k % 4]}"></i>${esc(C.sides[inn.bat].short)}</span>`).join('')}<span><i style="background:#e0564d;border-radius:50%"></i>Wicket</span></div>`;
    }
    // wagon wheel for user / top scorer of last innings
    const last = inns[inns.length - 1];
    if (last.log && last.log.length) {
      const Wd = 300, Hd = 300, cx = 150, cy = 150, sc = 140 / 76;
      let lines = '';
      for (const [, br, a, d] of last.log) { if (!br) continue; const ang = a * Math.PI / 180; const dd = Math.min(76, d); lines += `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.sin(ang) * dd * sc).toFixed(1)}" y2="${(cy - Math.cos(ang) * dd * sc).toFixed(1)}" stroke="${br === 6 ? '#9be3b2' : br === 4 ? '#d9c27e' : 'rgba(238,241,232,0.35)'}" stroke-width="${br >= 4 ? 1.8 : 1}"/>`; }
      h += `<div class="sec"><h2>Scoring shots</h2><p class="small dim">${esc(C.sides[last.bat].name)}: where the runs went. Gold fours, green sixes. Off side on the right for right-handers.</p></div><div class="chart" style="max-width:320px;margin:0 auto"><svg viewBox="0 0 ${Wd} ${Hd}" role="img" aria-label="Wagon wheel"><ellipse cx="${cx}" cy="${cy}" rx="${70 * sc}" ry="${72 * sc}" fill="#2b6643" stroke="#eef1e8" stroke-width="1"/><rect x="${cx - 3}" y="${cy - 20}" width="6" height="40" fill="#cdb98a"/>${lines}</svg></div>`;
    }
    return h;
  };

  // ===================================================================== finish & stored scorecard screen
  MU.finishMatch = function (ctx, m) {
    L.stopAuto();
    SK.App.match = null;
    if (ctx.kind === 'career') {
      const w = SK.App.world; const fx = w.fx[ctx.fxId];
      if (fx.status !== 'done') {
        W.applyMatch(w, fx, m);
        w.queue = w.queue.filter(q => q.id !== fx.id);
      }
      SK.App.afterUserMatch(fx);
    } else {
      UI.go('quickResult', { card: MU.cardFromMatch(m), ctx }, { replace: true });
    }
  };
  UI.register('quickResult', {
    title: 'Result', cls: 'no-tabs',
    render(p) { return MU.scorecardHTML(p.card) + `<div class="btnrow"><button class="btn ghost" data-act="again">Rematch</button><button class="btn" data-act="menu">Main menu</button></div>`; },
    actions: {
      again(a, el, p) { UI.go('prematch', { ctx: p.ctx }, { replace: true }); },
      menu() { SK.App.toMenu(); },
      player(a) { UI.go('player', { pid: +a }); },
    },
  });
  UI.register('scorecard', {
    title: (p) => 'Scorecard', sub: (p) => { const w = SK.App.world; const fx = w.fx[p.fx]; return fx ? W.fixtureTitle(w, fx) : ''; }, cls: 'no-tabs',
    render(p, st) {
      const w = SK.App.world; const fx = w.fx[p.fx];
      if (!fx) return '<div class="empty">This match is no longer stored.</div>';
      if (!fx.card) {
        const r = fx.result; if (!r) return '<div class="empty">Not played yet.</div>';
        return `<div class="sec"><p class="b hi">${esc(r.text)}</p>${r.inns.map(i => `<p>${esc(w.teams[i.team].name)} ${i.runs}/${i.wkts}${i.dec ? 'd' : ''} <span class="dim">(${U.overs(i.balls, fx.fmt === 'HUN' ? 5 : 6)} ov)</span></p>`).join('')}${r.mom != null ? `<p class="small dim">Player of the match: ${esc(w.players[r.mom].name)}</p>` : ''}</div>
          ${(r.tops || []).length ? `<div class="sec"><h2>Top performers</h2></div><div class="list">${r.tops.map(t => `<button class="row" data-act="player" data-arg="${t.pid}"><span class="grow t">${esc(w.players[t.pid].name)}</span><span class="num">${t.t === 'b' ? `${t.r}${t.no ? '*' : ''} (${t.b})` : `${t.w}/${t.r}`}</span></button>`).join('')}</div>` : ''}<p class="sec tiny dimmer">Full scorecards are kept for your own matches.</p>`;
      }
      st.tab = st.tab || 'card';
      const C = MU.cardFromStored(fx.card);
      return `<div class="mtabs">${[['card', 'Scorecard'], ['charts', 'Charts']].map(([k, l]) => `<button class="${st.tab === k ? 'on' : ''}" data-act="tab" data-arg="${k}">${l}</button>`).join('')}</div>` + (st.tab === 'card' ? MU.scorecardHTML(C) : MU.chartsHTML(C));
    },
    actions: { tab(k, el, p, st) { st.tab = k; UI.refresh(); }, player(a) { UI.go('player', { pid: +a }); } },
  });
})(typeof window !== 'undefined' ? window : globalThis);
