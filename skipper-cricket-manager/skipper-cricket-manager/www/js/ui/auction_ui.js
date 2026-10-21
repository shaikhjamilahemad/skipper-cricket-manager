/* Skipper — squad building screens: national squads, retentions, auctions, domestic signings */
(function (G) {
  'use strict';
  const SK = G.SK = G.SK || {};
  const U = SK.U, UI = SK.UI, R = SK.R, W = SK.World, A = SK.Auction, esc = SK.U.esc;
  const App = SK.App;
  const AU = SK.AuctionUI = {};
  const wd = () => App.world;
  const roleOrd = { BAT: 0, WK: 1, AR: 2, BWL: 3 };
  const fmtWord = (f) => (f === 'TEST' ? 'Test' : f === 'ODI' ? 'ODI' : f === 'T20' ? 'T20I' : f);

  // remove a calendar event from the queue; optionally run it (AI side of the event)
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
  AU.pRow = function (p, efmt, opts) {
    const w = wd(); opts = opts || {};
    const b = Math.round(R.bat(p, efmt)); const bw = p.bowl === '-' ? null : Math.round(R.bowl(p, efmt));
    const pills = `${opts.os ? '<span class="pill os">OS</span> ' : ''}${p.injury > 0 ? '<span class="pill inj">Injured</span> ' : ''}${opts.extraPill || ''}`;
    const ratings = opts.noRatings ? '' : `<div class="num small"><div>Bat <b>${b}</b></div>${bw != null ? `<div class="dim">Bowl <b>${bw}</b></div>` : ''}</div>`;
    const line2 = `${UI.roleName[p.role]}${p.bowl !== '-' ? ', ' + UI.bowlShort[p.bowl] : ''}, ${W.age(w, p)}, ${esc(p.cc)}${opts.noRatings ? `. Rating ${Math.round(R.overall(p, efmt))}` : ''} ${UI.formArrow(p.form, true)}`;
    return `<div class="row ${opts.sel ? 'sel' : ''}" style="padding-right:4px"><button class="grow" data-act="${opts.act}" data-arg="${p.id}" style="background:none;border:0;text-align:left;padding:0;display:flex;gap:12px;align-items:center;min-height:40px"><div class="grow"><div class="t ellip">${esc(p.name)} ${pills}</div><div class="s ellip">${line2}</div>${opts.note ? `<div class="s ellip">${opts.note}</div>` : ''}</div>${ratings}</button>${opts.right || ''}<button class="iconbtn" data-act="info" data-arg="${p.id}" aria-label="View ${esc(p.name)}">${UI.icons.chev}</button></div>`;
  };

  // =================================================================== national squad selection
  AU.sqSize = (ed, f) => (ed.type === 'icc' ? 15 : f === 'TEST' ? 16 : 15);
  AU.sqMax = (ed, f) => (ed.type === 'icc' ? 15 : f === 'TEST' ? 18 : 17);
  AU.SQ_MIN = 12;
  UI.register('natSquad', {
    title: 'Pick your squad', cls: 'no-tabs has-dock', back: false,
    sub: (p) => { const ed = wd().editions[p.ed]; return ed ? ed.name : ''; },
    render(p, st) {
      const w = wd(); const ed = w.editions[p.ed]; const key = w.user.team; const t = w.teams[key];
      const fmts = ed.type === 'series' ? [...new Set(ed.legs.map(l => l.fmt))] : [ed.fmt];
      if (!st.picks) {
        st.picks = {};
        for (const f of fmts) { const have = ed.squads[key] && ed.squads[key][f]; st.picks[f] = have ? have.slice() : W.selectNationalSquad(w, key, f, AU.sqSize(ed, f)); }
        st.fmt = fmts[0]; st.role = 'ALL';
      }
      const f = st.fmt; const efmt = f === 'T20' ? 'T20I' : f; const max = AU.sqMax(ed, f);
      const picks = st.picks[f]; const pickSet = new Set(picks);
      const inSquad = picks.map(id => w.players[id]).sort((a, b) => (roleOrd[a.role] - roleOrd[b.role]) || (R.overall(b, efmt) - R.overall(a, efmt)));
      const pool = W.nationalPool(w, t).filter(x => !pickSet.has(x.id) && SK.Sel.available(x, efmt)).filter(x => st.role === 'ALL' || x.role === st.role).sort(U.by(x => R.overall(x, efmt), true)).slice(0, 30);
      let h = '';
      const opp = ed.type === 'series' ? w.teams[ed.teams.find(k => k !== key)] : null;
      h += `<p class="sec small dim">${opp ? `${esc(t.name)} v ${esc(opp.name)}, starting ${U.fmtDate(ed.legs[0] ? w.fx[ed.legs[0].fixtures[0]].date : ed.start)}.` : `${esc(ed.name)} starts ${U.fmtDate(ed.start)}.`} Pick ${AU.SQ_MIN} to ${max} players${fmts.length > 1 ? ' for each format' : ''}. Tap a player to add or drop him.</p>`;
      if (fmts.length > 1) h += `<div class="ctl">${UI.seg('fmt', fmts.map(x => [x, `${fmtWord(x)} (${st.picks[x].length})`]), f)}</div>`;
      h += `<div class="sec hrow"><h2>In the squad</h2><span class="b ${picks.length < AU.SQ_MIN ? 'neg' : ''}">${picks.length}/${max}</span></div><p class="sec small dim" style="padding-top:0">${AU.mix(inSquad)}</p>`;
      h += `<div class="list">${inSquad.map(x => AU.pRow(x, efmt, { act: 'drop', sel: true, extraPill: !SK.Sel.available(x, efmt) ? '<span class="pill inj">Unavailable</span>' : '' })).join('') || '<div class="empty small">Nobody picked yet.</div>'}</div>`;
      h += `<div class="sec"><h2>Available</h2></div><div class="ctl">${UI.seg('role', [['ALL', 'All'], ['BAT', 'Bat'], ['WK', 'Keep'], ['AR', 'All-round'], ['BWL', 'Bowl']], st.role)}</div>`;
      h += `<div class="list">${pool.map(x => AU.pRow(x, efmt, { act: 'add' })).join('') || '<div class="empty small">No more players in this role.</div>'}</div>`;
      h += `<div class="dock"><button class="btn ghost" data-act="auto">Pick for me</button><button class="btn" data-act="confirm">Confirm squad</button></div>`;
      return h;
    },
    actions: {
      fmt(v, el, p, st) { st.fmt = v; UI.refresh(); },
      role(v, el, p, st) { st.role = v; UI.refresh(); },
      add(id, el, p, st) {
        const ed = wd().editions[p.ed]; const list = st.picks[st.fmt];
        if (list.length >= AU.sqMax(ed, st.fmt)) { UI.toast(`The squad is full. Drop someone first.`); return; }
        list.push(+id); UI.refresh();
      },
      drop(id, el, p, st) { st.picks[st.fmt] = st.picks[st.fmt].filter(x => x !== +id); UI.refresh(); },
      info(id) { UI.go('player', { pid: +id }); },
      auto(a, el, p, st) { const w = wd(); const ed = w.editions[p.ed]; st.picks[st.fmt] = W.selectNationalSquad(w, w.user.team, st.fmt, AU.sqSize(ed, st.fmt)); UI.refresh(); UI.toast('The selectors have picked a squad.'); },
      confirm(a, el, p, st) {
        const w = wd(); const ed = w.editions[p.ed]; const key = w.user.team;
        for (const f of Object.keys(st.picks)) {
          if (st.picks[f].length < AU.SQ_MIN) { st.fmt = f; UI.refresh(); UI.toast(`Pick at least ${AU.SQ_MIN} players for the ${fmtWord(f)} squad.`); return; }
        }
        ed.squads[key] = ed.squads[key] || {};
        for (const f of Object.keys(st.picks)) ed.squads[key][f] = st.picks[f].slice();
        const ev = p.ev ? W.getEvent(w, p.ev) : null;
        if (ev && !ev.done) AU.finishEvent(ev, true); else W.assignDuty(w, ed);
        App.autosave();
        UI.go('home', {}, { reset: true });
        App.continue();
      },
    },
  });

  // =================================================================== releases (shared by retention + auction intro)
  AU.releaseHTML = function (t, comp, rel, mega) {
    const w = wd(); const fmt = A.fmtOf(comp);
    const ps = t.squad.map(id => w.players[id]).sort((a, b) => (roleOrd[a.role] - roleOrd[b.role]) || (R.overall(b, fmt) - R.overall(a, fmt)));
    const kept = ps.filter(x => !rel.has(x.id));
    const freed = U.sum(ps.filter(x => rel.has(x.id)), x => (x.sal && x.sal[comp.id]) || 0);
    const osKept = kept.filter(x => A.isOS(x, comp)).length;
    let h = `<div class="cond"><div><div class="k">Purse now</div><div class="vv">${U.money(t.purse, comp.cur)}</div></div><div><div class="k">After releases</div><div class="vv">${U.money(t.purse + freed, comp.cur)}</div></div><div><div class="k">Squad kept</div><div class="vv">${kept.length}<span class="dim small"> of max ${comp.squadMax}</span></div></div><div><div class="k">Overseas kept</div><div class="vv">${osKept}<span class="dim small"> of max ${comp.osSquad}</span></div></div></div>`;
    if (mega) h += `<p class="sec small hi">Mega auction year: you can keep at most 5 players, no more than 2 of them overseas. Everyone else goes back into the auction.</p>`;
    h += `<div class="list">${ps.map(x => {
      const r = rel.has(x.id); const sal = (x.sal && x.sal[comp.id]) || 0; const worth = A.round(comp, A.price(w, x, comp));
      return AU.pRow(x, fmt, { act: 'toggle', os: A.isOS(x, comp), noRatings: true, note: `Paid ${U.money(sal, comp.cur)}, worth about ${U.money(worth, comp.cur)}`, right: `<span class="pill ${r ? 'inj' : ''}" style="min-width:70px;justify-content:center">${r ? 'Release' : 'Keep'}</span>` });
    }).join('')}</div>`;
    return h;
  };
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

  UI.register('retention', {
    title: 'Retentions', cls: 'no-tabs has-dock', back: false,
    sub: (p) => { const ev = W.getEvent(wd(), p.ev); return ev ? `${wd().comps[ev.comp].name} ${ev.season}` : ''; },
    render(p, st) {
      const w = wd(); const ev = W.getEvent(w, p.ev); const comp = w.comps[ev.comp]; const t = w.teams[w.user.team];
      A.ensureSalaries(w, comp.id);
      const mega = comp.id === 'IPL' && A.megaYear(ev.season);
      if (!st.rel) st.rel = new Set(A.releaseList(w, t, comp, ev.season).map(x => x.id));
      return `<p class="sec small dim">Choose who to keep before the auction. Released players go into the auction pool, and their salaries go back into your purse. Your analysts have marked their suggestions.</p>${AU.releaseHTML(t, comp, st.rel, mega)}<div class="dock"><button class="btn ghost" data-act="none">Keep everyone</button><button class="btn" data-act="confirm">Confirm</button></div>`;
    },
    actions: {
      toggle(id, el, p, st) { id = +id; if (st.rel.has(id)) st.rel.delete(id); else st.rel.add(id); UI.refresh(); },
      none(a, el, p, st) { st.rel = new Set(); UI.refresh(); },
      info(id) { UI.go('player', { pid: +id }); },
      confirm(a, el, p, st) {
        const w = wd(); const ev = W.getEvent(w, p.ev); const comp = w.comps[ev.comp]; const t = w.teams[w.user.team];
        if (comp.id === 'IPL' && A.megaYear(ev.season)) { const err = AU.checkMega(t, comp, st.rel); if (err) { UI.toast(err, 3000); return; } }
        const n = AU.applyReleases(t, comp, st.rel);
        AU.finishEvent(ev, true); // AI teams make their releases
        W.addNews(w, `${t.name} release ${n} player${n === 1 ? '' : 's'} ahead of the ${comp.name} auction.`, 'auction');
        App.autosave(); UI.go('home', {}, { reset: true }); App.continue();
      },
    },
  });

  // =================================================================== auction
  UI.register('auctionIntro', {
    title: 'Auction day', cls: 'no-tabs has-dock', back: false,
    sub: (p) => { const ev = W.getEvent(wd(), p.ev); return ev ? `${wd().comps[ev.comp].name} ${ev.season}` : ''; },
    render(p, st) {
      const w = wd(); const ev = W.getEvent(w, p.ev); const comp = w.comps[ev.comp]; const t = w.teams[w.user.team];
      A.ensureSalaries(w, comp.id);
      st.rel = st.rel || new Set();
      const ipl = comp.id === 'IPL';
      let h = `<p class="sec small dim">You need at least ${A.squadMin(comp)} players and can have up to ${comp.squadMax}, with no more than ${comp.osSquad} from overseas. ${ipl ? 'Retentions are done, but you can still release players now.' : 'Release any players you no longer want before bidding starts.'}</p>`;
      h += AU.releaseHTML(t, comp, st.rel, false);
      h += `<div class="dock"><button class="btn ghost" data-act="ai">Analysts bid for me</button><button class="btn" data-act="go">Go to the auction</button></div>`;
      return h;
    },
    actions: {
      toggle(id, el, p, st) { id = +id; if (st.rel.has(id)) st.rel.delete(id); else st.rel.add(id); UI.refresh(); },
      info(id) { UI.go('player', { pid: +id }); },
      go(a, el, p, st) { AU.begin(p.ev, st.rel, true); },
      ai(a, el, p, st) {
        UI.confirm({ title: 'Let your analysts bid for you?', body: 'They will bid on players your squad needs, within your purse. You will see the results at the end.' }, 'Let them bid').then(ok => { if (ok) AU.begin(p.ev, st.rel, false); });
      },
    },
  });
  AU.begin = function (evId, rel, interactive) {
    const w = wd(); const ev = W.getEvent(w, evId); const comp = w.comps[ev.comp]; const t = w.teams[w.user.team];
    AU.applyReleases(t, comp, rel || new Set());
    UI.busy(true, 'Auction', 'Setting up the player pool');
    setTimeout(() => {
      const run = new A.AuctionRun(w, comp.id, ev.season);
      run.interactive = interactive;
      App.auction = { run, ev: ev.id, recent: [], before: new Set(t.squad), skip: false };
      UI.busy(false);
      if (!interactive) { run.simAll(); AU.complete(); return; }
      AU.advance();
      UI.go('auction', {}, { reset: true });
    }, 30);
  };
  AU.note = function (r) {
    const S = App.auction; if (!r || !r.lot) return;
    S.recent.unshift({ pid: r.lot.pid, to: r.lot.to || null, price: r.lot.price || 0 });
    if (S.recent.length > 8) S.recent.length = 8;
  };
  // move on to the next lot that needs the user; false when the auction is over
  AU.advance = function () {
    const S = App.auction; const run = S.run;
    for (let guard = 0; guard < 600; guard++) {
      if (run.done) return false;
      if (S.skip && !run.lots.some((l, i) => i >= run.idx && l.status === 'pending' && l.want)) S.skip = false;
      const c = run.startLot(); if (!c) return false;
      if (S.skip && !c.lot.want) { AU.note(run.userPass()); continue; }
      const r = run.aiStep();
      if (r.state === 'user') { S.next = r.next; S.skip = false; return true; }
      if (S.skip && c.lot.want) { S.skip = false; UI.toast(`You could not bid for ${wd().players[c.lot.pid].name}: no purse, squad or overseas room.`, 3200); }
      AU.note(r);
    }
    return false;
  };
  AU.complete = function () {
    const S = App.auction; const run = S.run; const w = wd(); const comp = run.comp; const t = w.teams[w.user.team];
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
    App.auction = null;
    App.autosave();
    UI.go('auctionDone', { comp: comp.id, season: run.season, buys, top }, { reset: true });
  };

  UI.register('auction', {
    title: () => (App.auction ? `${App.auction.run.comp.name} auction` : 'Auction'), cls: 'no-tabs has-dock', back: false,
    sub: () => { const S = App.auction; if (!S) return ''; const run = S.run; return `Player ${Math.min(run.idx + 1, run.lots.length)} of ${run.lots.length}`; },
    render() {
      const S = App.auction; if (!S) return '<div class="empty">The auction is over.</div>';
      const w = wd(); const run = S.run; const comp = run.comp; const t = w.teams[w.user.team]; const c = run.cur;
      if (!c) { setTimeout(AU.complete, 0); return '<div class="empty">Wrapping up the auction.</div>'; }
      const p = w.players[c.lot.pid]; const fmt = A.fmtOf(comp); const os = A.isOS(p, comp);
      const lead = c.leader ? w.teams[c.leader] : null;
      const last = p.stats && (p.stats[fmt === 'HUN' ? 'HUN' : 'T20']);
      let h = `<div class="cond three" style="margin-top:8px"><div><div class="k">Your purse</div><div class="vv">${U.money(t.purse, comp.cur)}</div></div><div><div class="k">Squad</div><div class="vv">${t.squad.length}<span class="dim small">/${comp.squadMax}</span></div></div><div><div class="k">Overseas</div><div class="vv">${run.overseasCount(t)}<span class="dim small">/${comp.osSquad}</span></div></div></div>`;
      h += `<div class="lot"><div class="small dim">${c.lot.want ? '<span class="pill gold">On your list</span> ' : ''}${os ? '<span class="pill os">Overseas</span> ' : ''}${esc(SK.DB.CC_NAMES[p.cc] || p.cc)}, age ${W.age(w, p)}</div>
        <div class="nm" style="margin-top:6px">${esc(p.name)}</div>
        <div class="small dim" style="margin-top:4px">${UI.roleName[p.role]}${p.bowl !== '-' ? ', ' + esc(SK.BOWL_NAMES[p.bowl].toLowerCase()) : ''}. Bat ${Math.round(R.bat(p, fmt))}${p.bowl !== '-' ? `, bowl ${Math.round(R.bowl(p, fmt))}` : ''}.${(p.form || 0) > 3 ? ' In form.' : (p.form || 0) < -3 ? ' Out of form.' : ''}</div>
        ${last && last.m ? `<div class="small dim">In this game: ${last.m} T20s, ${last.r} runs at SR ${U.sr(last.r, last.b)}${last.w ? `, ${last.w} wickets at ${U.econ(last.rc, last.bb)} an over` : ''}</div>` : ''}
        <div class="price ${c.leader === t.key ? 'pos' : ''}">${U.money(c.price == null ? c.lot.base : c.price, comp.cur)}</div>
        <div class="lead">${lead ? `${UI.badge(lead, 'sm')}<span>${lead.key === t.key ? 'Your bid' : esc(lead.name) + ' lead the bidding'}</span>` : `<span>Base price. No bids yet.</span>`}</div>
        ${c.history.length > 1 ? `<div class="tiny dimmer" style="margin-top:6px">${c.history.slice(-5).reverse().map(([k, v]) => `${esc(w.teams[k].short)} ${U.money(v, comp.cur)}`).join(', ')}</div>` : ''}
      </div>`;
      h += `<div class="btnrow" style="padding-top:0"><button class="btn ghost sm" data-act="mine">My squad</button><button class="btn ghost sm" data-act="upcoming">Upcoming</button><button class="btn ghost sm" data-act="menu">Finish</button></div>`;
      if (S.recent.length) h += `<div class="sec"><h2>Recent lots</h2></div><div class="list">${S.recent.map(r => { const x = w.players[r.pid]; const tt = r.to ? w.teams[r.to] : null; return `<div class="row">${tt ? UI.badge(tt, 'sm') : '<span class="badge sm" style="--b1:#22392f;--b2:#2a4a3e">-</span>'}<div class="grow"><div class="t ellip">${esc(x.name)}</div><div class="s">${tt ? 'Sold to ' + esc(tt.name) : 'Unsold'}</div></div>${tt ? `<span class="num b ${r.to === t.key ? 'pos' : ''}">${U.money(r.price, comp.cur)}</span>` : ''}</div>`; }).join('')}</div>`;
      h += `<div class="dock"><button class="btn ghost" data-act="pass">Pass</button><button class="btn" data-act="bid">Bid ${U.money(S.next, comp.cur)}</button></div>`;
      return h;
    },
    actions: {
      bid() {
        const S = App.auction; const run = S.run; const w = wd();
        const r = run.userBid();
        if (r.state === 'error') { UI.toast(r.msg); return; }
        if (r.state === 'user') { S.next = r.next; UI.refresh(); return; }
        AU.note(r);
        if (r.state === 'sold' && r.lot.to === w.user.team) UI.toast(`You signed ${w.players[r.lot.pid].name} for ${U.money(r.lot.price, run.comp.cur)}.`);
        if (!AU.advance()) { AU.complete(); return; }
        UI.refresh();
      },
      pass() {
        const S = App.auction; const r = S.run.userPass(); AU.note(r);
        if (!AU.advance()) { AU.complete(); return; }
        UI.refresh();
      },
      mine() {
        const w = wd(); const S = App.auction; const comp = S.run.comp; const t = w.teams[w.user.team]; const fmt = A.fmtOf(comp);
        const ps = t.squad.map(id => w.players[id]).sort((a, b) => (roleOrd[a.role] - roleOrd[b.role]) || (R.overall(b, fmt) - R.overall(a, fmt)));
        UI.sheet(`<h3>${esc(t.name)}</h3><p class="sec small dim" style="padding-top:0">${AU.mix(ps)}</p><div class="list">${ps.map(x => `<div class="row"><div class="grow"><div class="t ellip">${esc(x.name)} ${A.isOS(x, comp) ? '<span class="pill os">OS</span>' : ''} ${S.before.has(x.id) ? '' : '<span class="pill gold">New</span>'}</div><div class="s">${UI.roleName[x.role]}${x.bowl !== '-' ? ', ' + UI.bowlShort[x.bowl] : ''}, ${W.age(w, x)}</div></div><span class="num small">${U.money((x.sal && x.sal[comp.id]) || 0, comp.cur)}</span></div>`).join('')}</div>`, {});
      },
      upcoming() { AU.upcomingSheet(); },
      menu() {
        const S = App.auction; const anyWant = S.run.lots.some((l, i) => i > S.run.idx && l.status === 'pending' && l.want);
        UI.sheet(`<h3>Speed things up</h3><div class="list">
          ${anyWant ? '<button class="row" data-act="skip"><div class="grow"><div class="t">Skip to my next target</div><div class="s">Pass on everyone until a player on your list comes up</div></div></button>' : ''}
          <button class="row" data-act="analysts"><div class="grow"><div class="t">Analysts bid for me</div><div class="s">They finish the auction for you, buying what the squad needs</div></div></button>
          <button class="row" data-act="stop"><div class="grow"><div class="t">Stop buying</div><div class="s">The other teams finish the auction without you</div></div></button>
        </div>`, {
          skip: () => { UI.closeSheet(); S.skip = true; S.run.userPass && S.run.cur && AU.note(S.run.userPass()); if (!AU.advance()) { AU.complete(); return; } UI.refresh(); },
          analysts: () => { UI.closeSheet(); S.run.interactive = false; S.run.simAll(); AU.complete(); },
          stop: () => { UI.closeSheet(); S.run.simAll(); AU.complete(); },
        });
      },
    },
  });
  AU.upcomingSheet = function () {
    const w = wd(); const S = App.auction; const run = S.run; const comp = run.comp; const fmt = A.fmtOf(comp);
    const lots = run.lots.filter((l, i) => i > run.idx && l.status === 'pending').slice(0, 60);
    const draw = () => `<h3>Coming up</h3><p class="sec small dim" style="padding-top:0">Tap players to add them to your list. Then use Finish, Skip to my next target, to jump straight to them.</p><div class="list">${lots.map(l => { const x = w.players[l.pid]; return `<button class="row ${l.want ? 'sel' : ''}" data-act="want" data-arg="${l.pid}"><div class="grow"><div class="t ellip">${esc(x.name)} ${A.isOS(x, comp) ? '<span class="pill os">OS</span>' : ''}</div><div class="s">${UI.roleName[x.role]}${x.bowl !== '-' ? ', ' + UI.bowlShort[x.bowl] : ''}, ${W.age(w, x)}, base ${U.money(l.base, comp.cur)}</div></div><span class="num small">${Math.round(R.overall(x, fmt))}</span>${l.want ? '<span class="pill gold">Listed</span>' : ''}</button>`; }).join('') || '<div class="empty small">No more players.</div>'}</div>`;
    const sh = UI.sheet(draw(), {
      want: (pid) => { const l = run.lots.find(x => x.pid === +pid); if (l) l.want = !l.want; const y = sh.scrollTop; sh.innerHTML = '<div class="grab"></div>' + draw(); sh.scrollTop = y; },
    });
  };
  UI.register('auctionDone', {
    title: 'Auction complete', cls: 'no-tabs has-dock', back: false,
    sub: (p) => `${wd().comps[p.comp].name} ${p.season}`,
    render(p) {
      const w = wd(); const comp = w.comps[p.comp]; const t = w.teams[w.user.team];
      let h = `<div class="cond" style="margin-top:8px"><div><div class="k">Purse left</div><div class="vv">${U.money(t.purse, comp.cur)}</div></div><div><div class="k">Squad</div><div class="vv">${t.squad.length}</div></div></div>`;
      h += `<div class="sec"><h2>Your signings</h2></div><div class="list">${p.buys.map(id => { const x = w.players[id]; return `<button class="row" data-act="player" data-arg="${id}"><div class="grow"><div class="t ellip">${esc(x.name)} ${A.isOS(x, comp) ? '<span class="pill os">OS</span>' : ''}</div><div class="s">${UI.roleName[x.role]}, ${W.age(w, x)}</div></div><span class="num b">${U.money((x.sal && x.sal[comp.id]) || 0, comp.cur)}</span></button>`; }).join('') || '<div class="empty small">You did not sign anyone.</div>'}</div>`;
      h += `<div class="sec"><h2>Biggest buys</h2></div><div class="list">${p.top.map(l => { const x = w.players[l.pid]; const tt = w.teams[l.to]; return `<button class="row" data-act="player" data-arg="${l.pid}">${UI.badge(tt, 'sm')}<div class="grow"><div class="t ellip">${esc(x.name)}</div><div class="s">${esc(tt.name)}</div></div><span class="num b">${U.money(l.price, comp.cur)}</span></button>`; }).join('')}</div>`;
      h += `<div class="dock"><button class="btn" data-act="done">Continue</button></div>`;
      return h;
    },
    actions: { player(id) { UI.go('player', { pid: +id }); }, done() { UI.go('home', {}, { reset: true }); App.continue(); } },
  });

  // =================================================================== domestic free agents
  AU.domGroup = (t) => (t.comp === 'SHF' ? { reg: 'SHF', comps: ['SHF'], cc: 'AUS', max: 26 } : { reg: 'CC', comps: ['CC1', 'CC2'], cc: 'ENG', max: 26 });
  UI.register('signings', {
    title: 'Sign players', cls: 'no-tabs',
    sub: () => { const w = wd(); return w.teams[w.user.team].name; },
    render(p, st) {
      const w = wd(); const t = w.teams[w.user.team]; const g = AU.domGroup(t); const comp = w.comps[t.comp];
      st.kind = st.kind || 'local'; st.role = st.role || 'ALL';
      const taken = new Set(); g.comps.forEach(c => w.comps[c].teams.forEach(k => w.teams[k].squad.forEach(id => taken.add(id))));
      const isLocal = (x) => !SK.DB.isOverseasFor(x, g.cc);
      const osNow = t.squad.filter(id => !isLocal(w.players[id])).length;
      let pool = w.players.filter(x => !x.retired && !taken.has(x.id) && (st.kind === 'local' ? isLocal(x) : !isLocal(x) && R.overall(x, 'FC4') >= 58 && !x.ret.WB && x.cc !== 'IND'));
      if (st.role !== 'ALL') pool = pool.filter(x => x.role === st.role);
      pool = pool.sort(U.by(x => R.overall(x, 'FC4'), true)).slice(0, 40);
      let h = `<p class="sec small dim">Squad ${t.squad.length} of ${g.max}. Overseas ${osNow} of ${comp.osSquad}. Signing is free between seasons and during the season.</p>`;
      h += `<div class="ctl">${UI.seg('kind', [['local', 'Local players'], ['os', 'Overseas']], st.kind)}</div><div class="ctl">${UI.seg('role', [['ALL', 'All'], ['BAT', 'Bat'], ['WK', 'Keep'], ['AR', 'All-round'], ['BWL', 'Bowl']], st.role)}</div>`;
      h += `<div class="list">${pool.map(x => AU.pRow(x, 'FC4', { act: 'sign', os: !isLocal(x) })).join('') || '<div class="empty small">Nobody available.</div>'}</div>`;
      return h;
    },
    actions: {
      kind(v, el, p, st) { st.kind = v; UI.refresh(); },
      role(v, el, p, st) { st.role = v; UI.refresh(); },
      info(id) { UI.go('player', { pid: +id }); },
      sign(id) {
        const w = wd(); const t = w.teams[w.user.team]; const g = AU.domGroup(t); const comp = w.comps[t.comp]; const x = w.players[+id];
        if (t.squad.length >= g.max) { UI.toast('Your squad is full. Release someone first.'); return; }
        const os = SK.DB.isOverseasFor(x, g.cc);
        if (os && t.squad.filter(q => SK.DB.isOverseasFor(w.players[q], g.cc)).length >= comp.osSquad) { UI.toast('You already have the maximum number of overseas players.'); return; }
        UI.confirm({ title: `Sign ${x.name}?`, body: `${UI.roleName[x.role]}, ${W.age(w, x)}, first-class rating ${Math.round(R.overall(x, 'FC4'))}.` }, 'Sign').then(ok => {
          if (!ok) return;
          t.squad.push(x.id); x.teams[g.reg] = t.key; if (g.reg === 'CC') x.teams[t.comp] = t.key;
          W.addNews(w, `${t.name} sign ${x.name}.`, 'news');
          UI.toast(`${x.name} has signed.`); UI.refresh();
        });
      },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
