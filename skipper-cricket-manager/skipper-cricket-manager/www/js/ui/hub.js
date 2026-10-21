/* Skipper — career hub: home, squad, fixtures, tables, more, player profile, inbox, reviews */
(function (G) {
  'use strict';
  const SK = G.SK = G.SK || {};
  const U = SK.U, UI = SK.UI, R = SK.R, W = SK.World, C = SK.Career, S = SK.Store, esc = SK.U.esc;
  const App = SK.App;
  const H = SK.Hub = {};

  H.w = () => App.world;
  H.team = () => { const w = H.w(); return w.user.team ? w.teams[w.user.team] : null; };
  H.fmtForTeam = (t) => { if (!t) return 'T20'; const c = H.w().comps[t.comp]; return t.comp === 'INTL' ? 'ODI' : c.fmt === '100' ? 'HUN' : c.fmt === 'FC4' ? 'FC4' : 'T20'; };
  H.userEditions = function () {
    const w = H.w(); const k = w.user.team; if (!k) return [];
    return Object.values(w.editions).filter(e => e.teams && e.teams.includes(k) && !e.pruned).sort((a, b) => a.start - b.start);
  };
  H.currentEdition = function () {
    const eds = H.userEditions(); const w = H.w();
    return eds.find(e => e.status === 'live') || eds.filter(e => e.status === 'scheduled' && e.start >= w.date - 1)[0] || eds.filter(e => e.status === 'done').pop() || null;
  };
  H.resultFor = function (fx, key) {
    const r = fx.result; if (!r) return '';
    if (!r.winner) return r.kind === 'tie' ? 'T' : 'D';
    return r.winner === key ? 'W' : 'L';
  };
  H.scoreLine = function (fx) {
    const w = H.w(); const r = fx.result; if (!r) return '';
    return r.inns.map(i => `${w.teams[i.team].short} ${i.runs}/${i.wkts}${i.dec ? 'd' : ''}`).join(', ');
  };
  H.oppOf = (fx, key) => (fx.home === key ? fx.away : fx.home);
  const continueDock = (label) => `<div class="dock"><button class="btn" data-act="continue">${esc(label || 'Continue')}</button></div>`;

  // ---------------------------------------------------------- home
  UI.register('home', {
    title: () => { const t = H.team(); return t ? t.name : 'Out of work'; },
    sub: () => { const w = H.w(); return `${U.fmtDate(w.date)}, ${w.user.name}`; },
    tabs: 'home', cls: 'has-dock',
    right: () => `<button class="iconbtn" data-act="save" aria-label="Save game"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/></svg></button>`,
    render() {
      const w = H.w(); const u = w.user; const t = H.team();
      let h = '';
      if (!t) {
        h += `<div class="banner"><div class="big">You are between jobs</div><p class="dim">Keep the calendar moving and offers will arrive. Your reputation is ${Math.round(u.rep)}/100.</p></div>`;
        h += H.offersHTML();
        return h + continueDock('Continue');
      }
      const next = W.peekNext(w);
      if (next) {
        const opp = w.teams[H.oppOf(next, t.key)]; const home = next.home === t.key;
        h += `<div class="nextcard"><div class="when">Next match: ${U.fmtDate(next.date)}${next.date === w.date ? ' (today)' : ''}</div><div class="teams">${UI.badge(t)}<span class="x">v ${esc(opp.name)}</span>${UI.badge(opp)}</div><div class="small dim">${esc(W.fixtureTitle(w, next))}</div><div class="small dim">${esc(next.venue.name)}${next.neutral ? '' : home ? ' (home)' : ' (away)'}, ${esc(SK.FORMATS[W.engineFmt(next.comp === 'ICC' ? 'INTL' : next.comp, next.fmt)].label)}</div></div>`;
      } else h += `<div class="nextcard"><div class="when">No matches scheduled yet</div><p class="small dim" style="margin:6px 0 0">Continue and the calendar will move to your next event.</p></div>`;
      const stop = W.peekNextStop(w);
      if (stop && stop.type !== 'match') {
        const what = stop.type === 'retention' ? `${w.comps[stop.ev.comp].name} retentions` : stop.type === 'auction' ? `${w.comps[stop.ev.comp].name} auction` : stop.type === 'squad' ? `Pick your squad for ${stop.ed.name}` : '';
        if (what) h += `<p class="sec small" style="padding-top:0"><span class="hi">${next && stop.date <= next.date ? 'Before that' : 'Coming up'}:</span> ${esc(what)}, ${U.fmtDate(stop.date)}</p>`;
      }
      // board
      const ed = H.currentEdition(); const ob = ed && u.objectives[ed.id];
      const cf = Math.round(u.conf); const cc = cf >= 60 ? 'var(--runs)' : cf >= 35 ? 'var(--straw)' : 'var(--red)';
      h += `<div class="sec"><h2>The board</h2>${ob ? `<p class="small dim">Target for ${esc(ob.name)}: <b class="hi">${esc(C.TARGETS[ob.target])}</b>${ob.done ? `, result: ${esc(ob.finish || '')}` : ''}</p>` : ''}<div class="conf"><span class="small dim">Confidence</span><span class="track"><span class="fill" style="width:${cf}%;background:${cc}"></span></span><span class="b">${cf}</span></div></div>`;
      if (u.offers && u.offers.filter(o => o.expires > w.date).length) h += H.offersHTML();
      // table snippet
      if (ed) h += H.snippet(ed);
      // inbox
      const mails = w.inbox.slice(0, 4);
      h += `<div class="sec hrow"><h2>Inbox</h2><button class="linkbtn" data-act="inbox">All messages</button></div><div class="list">${mails.map(H.mailRow).join('') || '<div class="empty small">No messages.</div>'}</div>`;
      h += `<div class="sec hrow"><h2>Around the world</h2><button class="linkbtn" data-act="news">All news</button></div><div class="list">${w.news.slice(0, 5).map(n => `<div class="msg"><div class="grow"><div class="small">${esc(n.text)}</div><div class="when">${U.fmtDate(n.date)}</div></div></div>`).join('')}</div>`;
      return h + continueDock('Continue');
    },
    actions: {
      continue() { App.continue(); },
      save() { App.save(App.slot === 'auto' ? 'slot1' : App.slot); App.save('auto', true); },
      inbox() { UI.go('inbox', {}); },
      news() { UI.go('news', {}); },
      mail(id) { H.openMail(+id); },
      accept(k) { H.accept(k); },
      decline(k) { const w = H.w(); w.user.offers = w.user.offers.filter(o => o.team !== k); UI.refresh(); },
      table(id) { UI.go('tables', { ed: id }); },
    },
  });
  H.mailRow = (m) => `<button class="msg" style="width:100%;background:none;border-left:0;border-right:0;border-top:0;text-align:left;color:inherit" data-act="mail" data-arg="${m.id}"><span class="dot ${m.read ? 'read' : ''}"></span><div class="grow"><div class="b small">${esc(m.title)}</div><div class="when">${U.fmtDate(m.date)}</div></div></button>`;
  H.openMail = function (id) {
    const w = H.w(); const m = w.inbox.find(x => x.id === id); if (!m) return;
    m.read = true;
    UI.sheet(`<h3>${esc(m.title)}</h3><p class="sec dim" style="padding-top:0">${esc(m.body)}</p><p class="sec tiny dimmer">${U.fmtDate(m.date)}</p>${m.pid != null ? `<div class="btnrow"><button class="btn ghost" data-act="pl">View ${esc(w.players[m.pid].name)}</button></div>` : ''}`, { pl: () => { UI.closeSheet(); UI.go('player', { pid: m.pid }); } });
    UI.refresh();
  };
  H.offersHTML = function () {
    const w = H.w(); const offers = (w.user.offers || []).filter(o => o.expires > w.date);
    if (!offers.length) return '<p class="sec small dim">No job offers right now.</p>';
    return `<div class="sec"><h2>Job offers</h2></div><div class="list">${offers.map(o => { const t = w.teams[o.team]; return `<div class="row">${UI.badge(t)}<div class="grow"><div class="t">${esc(t.name)}</div><div class="s">${esc(W.COMP_LABEL[t.comp])}, expires ${U.fmtDate(o.expires, false)}</div></div><button class="btn sm" data-act="accept" data-arg="${esc(o.team)}">Accept</button><button class="iconbtn" data-act="decline" data-arg="${esc(o.team)}" aria-label="Decline">${UI.icons.close}</button></div>`; }).join('')}</div>`;
  };
  H.accept = function (k) {
    const w = H.w(); const t = w.teams[k];
    UI.confirm({ title: `Take the ${t.name} job?`, body: w.user.team ? `You will leave ${w.teams[w.user.team].name}.` : '' }, 'Accept').then(ok => { if (ok) { C.acceptOffer(w, k); w.user.alert = null; App.autosave(); UI.go('home', {}, { reset: true }); } });
  };
  H.snippet = function (ed) {
    const w = H.w(); const key = w.user.team;
    if (ed.type === 'series') {
      const opp = ed.teams.find(k => k !== key);
      const legs = ed.legs.map(l => `<div class="row"><span class="grow t">${l.fmt === 'TEST' ? 'Tests' : l.fmt === 'ODI' ? 'ODIs' : 'T20Is'}</span><span class="num">${l.score[key]}-${l.score[opp]}${l.score.d ? ` (${l.score.d} drawn)` : ''}</span></div>`).join('');
      return `<div class="sec hrow"><h2>${esc(ed.name)}</h2><button class="linkbtn" data-act="table" data-arg="${ed.id}">Details</button></div><div class="list">${legs}</div>`;
    }
    let prefix = '';
    const rows = ed.type === 'icc' ? (() => {
      const sg = ed.super && ed.super.find(x => x.teams.includes(key));
      if (sg) { prefix = 'S:'; return W.sortTable(ed, sg.teams.map(k => 'S:' + k)).map(k => k.slice(2)); }
      const g = ed.groups.find(x => x.teams.includes(key)); return g ? W.sortTable(ed, g.teams) : [];
    })() : W.sortTable(ed);
    if (!rows.length) return '';
    const T = {}; for (const k of rows) T[k] = ed.table[prefix + k];
    const idx = rows.indexOf(key);
    const show = rows.slice(0, 4); if (idx >= 4) show.push(key);
    return `<div class="sec hrow"><h2>${esc(ed.name)}</h2><button class="linkbtn" data-act="table" data-arg="${ed.id}">Full table</button></div><div class="tblwrap"><table class="tbl"><thead><tr><th class="l">Team</th><th>P</th><th>W</th><th>L</th><th>Pts</th></tr></thead><tbody>${show.map(k => `<tr class="${k === key ? 'me' : ''}"><td class="l">${rows.indexOf(k) + 1}. ${esc(w.teams[k].name)}</td><td>${T[k].p}</td><td>${T[k].w}</td><td>${T[k].l}</td><td class="b">${T[k].pts}</td></tr>`).join('')}</tbody></table></div>`;
  };

  // ---------------------------------------------------------- squad
  UI.register('squad', {
    title: () => { const t = H.team(); return t && t.comp === 'INTL' ? 'Player pool' : 'Squad'; },
    sub: () => { const t = H.team(); return t ? t.name : ''; },
    tabs: 'squad',
    render(p, st) {
      const w = H.w(); const t = H.team();
      if (!t) return '<div class="empty">You need a job to have a squad.</div>';
      const nat = t.comp === 'INTL';
      st.fmt = st.fmt || (nat ? 'ODI' : H.fmtForTeam(t));
      st.sort = st.sort || 'role';
      const comp = w.comps[t.comp];
      let players = nat ? W.nationalPool(w, t) : t.squad.map(id => w.players[id]).filter(x => !x.retired);
      const efmt = st.fmt === 'T20' && nat ? 'T20I' : st.fmt;
      if (nat) players = players.filter(x => SK.Sel.available(x, efmt) || x.injury > 0).sort(U.by(x => R.overall(x, efmt), true)).slice(0, 60);
      const roleOrd = { BAT: 0, WK: 1, AR: 2, BWL: 3 };
      const sorters = { role: (a, b) => (roleOrd[a.role] - roleOrd[b.role]) || (R.overall(b, efmt) - R.overall(a, efmt)), bat: U.by(x => R.bat(x, efmt), true), bowl: U.by(x => R.bowl(x, efmt), true), age: U.by(x => x.yob, true), form: U.by(x => x.form || 0, true) };
      players.sort(sorters[st.sort] || sorters.role);
      let h = '';
      if (!nat) {
        const os = players.filter(x => SK.DB.isOverseasFor(x, comp.home)).length;
        const purse = W.LEAGUES.includes(t.comp) ? `, purse ${U.money(t.purse, comp.cur)}` : '';
        h += `<p class="sec small dim">${players.length} players (max ${comp.squadMax}), ${os} overseas (max ${comp.osSquad} in squad, ${comp.osXI} in XI)${purse}</p>`;
      } else {
        const ed = H.userEditions().find(e => e.type === 'series' && e.status !== 'done' && e.squads && e.squads[t.key]);
        h += `<p class="sec small dim">Best ${players.length} eligible players for ${efmt === 'TEST' ? 'Tests' : efmt === 'ODI' ? 'ODIs' : 'T20Is'}.${ed ? ' Players in your current squad are marked.' : ''}</p>`;
        st.squadIds = ed ? new Set(Object.values(ed.squads[t.key]).flat()) : new Set();
      }
      const fmts = nat ? [['TEST', 'Test'], ['ODI', 'ODI'], ['T20', 'T20I']] : [[st.fmt, SK.FORMATS[st.fmt] ? SK.FORMATS[st.fmt].label : st.fmt]];
      if (nat) h += `<div class="ctl">${UI.seg('fmt', fmts, st.fmt)}</div>`;
      h += `<div class="ctl">${UI.seg('sort', [['role', 'Role'], ['bat', 'Batting'], ['bowl', 'Bowling'], ['age', 'Age'], ['form', 'Form']], st.sort)}</div>`;
      h += `<div class="list">${players.map(x => H.playerRow(x, efmt, { os: !nat && SK.DB.isOverseasFor(x, comp.home), cap: t.cap === x.id, inSquad: nat && st.squadIds && st.squadIds.has(x.id) })).join('')}</div>`;
      if (t.comp === 'CC1' || t.comp === 'CC2' || t.comp === 'SHF') h += `<div class="btnrow"><button class="btn ghost" data-act="sign">Sign a free agent</button></div>`;
      return h;
    },
    actions: {
      fmt(v, el, p, st) { st.fmt = v; UI.refresh(); },
      sort(v, el, p, st) { st.sort = v; UI.refresh(); },
      player(a) { UI.go('player', { pid: +a }); },
      sign() { UI.go('signings', {}); },
    },
  });
  H.playerRow = function (x, efmt, o) {
    o = o || {};
    const w = H.w(); const age = w ? W.age(w, x) : 2026 - x.yob;
    const duty = w && W.onDuty(x, w.date);
    const pills = `${o.cap ? '<span class="pill gold">C</span> ' : ''}${o.os ? '<span class="pill os">OS</span> ' : ''}${o.inSquad ? '<span class="pill gold">In squad</span> ' : ''}${x.injury > 0 ? '<span class="pill inj">Injured</span> ' : ''}${duty ? '<span class="pill duty">Intl duty</span>' : ''}`;
    const b = Math.round(R.bat(x, efmt)), bw = x.bowl === '-' ? null : Math.round(R.bowl(x, efmt));
    return `<button class="row" data-act="player" data-arg="${x.id}"><div class="grow"><div class="t ellip">${esc(x.name)} ${pills}</div><div class="s">${UI.roleName[x.role]}${x.bowl !== '-' ? ', ' + UI.bowlShort[x.bowl] : ''}, ${age}, ${esc(x.cc)} ${UI.formArrow(x.form, true)}</div></div><div class="num small"><div>Bat <b>${b}</b></div>${bw != null ? `<div class="dim">Bowl <b>${bw}</b></div>` : ''}</div></button>`;
  };

  // ---------------------------------------------------------- player profile
  UI.register('player', {
    title: (p) => { const x = H.pl(p.pid); return x ? x.name : 'Player'; },
    sub: (p) => { const x = H.pl(p.pid); if (!x) return ''; const w = H.w(); return `${SK.DB.CC_NAMES[x.cc] || x.cc}, age ${w ? W.age(w, x) : 2026 - x.yob}`; },
    cls: 'no-tabs',
    right: (p) => H.w() ? `<button class="iconbtn" data-act="edit" aria-label="Edit player">${UI.icons.edit}</button>` : '',
    render(p, st) {
      const x = H.pl(p.pid); if (!x) return '<div class="empty">Player not found.</div>';
      const w = H.w();
      let h = `<div class="sec"><p class="dim" style="margin:0">${UI.roleName[x.role]}. ${x.hand === 'L' ? 'Left' : 'Right'}-hand bat${x.bowl !== '-' ? ', ' + esc(SK.BOWL_NAMES[x.bowl].toLowerCase()) : ''}.</p>`;
      const tags = [];
      if (x.retired) tags.push(`Retired in ${x.retired}`);
      if (x.ret.X && !x.retired) tags.push('Retired from international cricket');
      else { if (x.ret.T) tags.push('No longer plays Tests'); if (x.ret.O) tags.push('No longer plays ODIs'); if (x.ret.I) tags.push('No longer plays T20Is'); }
      if (x.ret.WB) tags.push('White-ball specialist'); if (x.ret.RB) tags.push('Red-ball specialist');
      if (x.injury > 0) tags.push(`Injured${x.injuryNote ? ' (' + x.injuryNote + ')' : ''}, about ${Math.max(1, Math.round(x.injury / 7))} week${x.injury >= 14 ? 's' : ''}`);
      if (w && W.onDuty(x, w.date)) tags.push('On international duty');
      if (tags.length) h += `<p class="small hi" style="margin:6px 0 0">${tags.map(esc).join('. ')}.</p>`;
      h += `</div>`;
      h += `<div class="sec"><h2>Ratings</h2></div>`;
      h += UI.rbar('Technique', x.bt) + UI.rbar('Power', x.bp);
      if (x.bowl !== '-') h += UI.rbar('Bowling', x.bw) + UI.rbar('Control', x.be);
      h += UI.rbar(x.role === 'WK' ? 'Keeping' : 'Fielding', x.fd);
      const age = w ? W.age(w, x) : 2026 - x.yob;
      if (age <= 25) h += `<p class="sec small dim">Potential: ${UI.stars(x.pot || 60)} ${(x.pot || 0) > Math.max(R.overall(x, 'T20'), R.overall(x, 'TEST')) + 6 ? 'Still improving.' : ''}</p>`;
      h += `<div class="cond"><div><div class="k">T20 rating</div><div class="vv">${Math.round(R.overall(x, 'T20'))}</div></div><div><div class="k">ODI rating</div><div class="vv">${Math.round(R.overall(x, 'ODI'))}</div></div><div><div class="k">Test rating</div><div class="vv">${Math.round(R.overall(x, 'TEST'))}</div></div><div><div class="k">Form</div><div class="vv">${UI.formArrow(x.form)} ${x.formHist && x.formHist.length ? x.formHist.slice(-5).map(v => v > 1.5 ? '<span class="pos">●</span>' : v < -1 ? '<span class="neg">●</span>' : '<span class="dimmer">●</span>').join('') : ''}</div></div></div>`;
      // teams
      if (w) {
        const teams = Object.entries(x.teams).filter(([c]) => c !== 'CC' && w.teams[x.teams[c]]).map(([c, k]) => { const t = w.teams[k]; const sal = x.sal && x.sal[c] != null ? `, ${U.money(x.sal[c], w.comps[c] ? w.comps[c].cur : '')}` : ''; return `<div class="row">${UI.badge(t, 'sm')}<span class="grow t">${esc(t.name)}</span><span class="small dim">${esc(W.COMP_LABEL[c] || c)}${sal}</span></div>`; });
        if (teams.length) h += `<div class="sec"><h2>Teams</h2></div><div class="list">${teams.join('')}</div>`;
      }
      // stats
      const keys = W.STAT_KEYS.filter(k => x.stats && x.stats[k] && x.stats[k].m);
      if (keys.length) {
        h += `<div class="sec"><h2>Career in this game</h2></div><div class="tblwrap"><table class="tbl"><thead><tr><th class="l">Batting</th><th>M</th><th>Inn</th><th>Runs</th><th>HS</th><th>Avg</th><th>SR</th><th>100</th><th>50</th></tr></thead><tbody>${keys.map(k => { const s = x.stats[k]; return `<tr><td class="l">${W.STAT_LABEL[k]}</td><td>${s.m}</td><td>${s.i}</td><td class="b">${s.r}</td><td>${s.hs}${s.hsno ? '*' : ''}</td><td>${U.avgStr(s.r, s.i - s.no)}</td><td>${U.sr(s.r, s.b)}</td><td>${s.c100}</td><td>${s.c50}</td></tr>`; }).join('')}</tbody></table></div>`;
        const bk = keys.filter(k => x.stats[k].bb > 0);
        if (bk.length) h += `<div class="tblwrap"><table class="tbl"><thead><tr><th class="l">Bowling</th><th>Wkts</th><th>Avg</th><th>Econ</th><th>SR</th><th>Best</th><th>5w</th></tr></thead><tbody>${bk.map(k => { const s = x.stats[k]; return `<tr><td class="l">${W.STAT_LABEL[k]}</td><td class="b">${s.w}</td><td>${s.w ? (s.rc / s.w).toFixed(2) : '-'}</td><td>${U.econ(s.rc, s.bb)}</td><td>${s.w ? (s.bb / s.w).toFixed(1) : '-'}</td><td>${s.bbw}/${s.bbr}</td><td>${s.w5}</td></tr>`; }).join('')}</tbody></table></div>`;
      } else h += `<p class="sec small dim">No matches played in this game yet.</p>`;
      // actions for user's franchise / domestic team
      if (w && w.user.team) {
        const t = w.teams[w.user.team];
        if (t.comp !== 'INTL' && t.squad.includes(x.id)) {
          h += `<div class="btnrow"><button class="btn ghost" data-act="cap">Make captain</button><button class="btn ghost" data-act="release">Release</button></div>`;
        }
      }
      return h;
    },
    actions: {
      cap(a, el, p) { const w = H.w(); w.teams[w.user.team].cap = p.pid; UI.toast(`${w.players[p.pid].name} is captain.`); },
      release(a, el, p) {
        const w = H.w(); const t = w.teams[w.user.team]; const x = w.players[p.pid];
        if (t.squad.length <= 14) { UI.toast('Your squad is too small to release anyone.'); return; }
        UI.confirm({ title: `Release ${x.name}?`, body: 'He will leave the club immediately.' }, 'Release', 'Keep', true).then(ok => {
          if (!ok) return;
          const comp = w.comps[t.comp];
          if (SK.Auction && W.LEAGUES.includes(t.comp)) SK.Auction.doRelease(w, t, comp, [x]);
          else { t.squad = t.squad.filter(id => id !== x.id); for (const c of Object.keys(x.teams)) if (x.teams[c] === t.key) delete x.teams[c]; }
          UI.back();
        });
      },
      edit(a, el, p) { SK.Editor && SK.Editor.quickEdit(H.pl(p.pid), () => UI.refresh()); },
    },
  });
  H.pl = (id) => (H.w() ? H.w().players[id] : (App.quickPlayers || [])[id]);

  // ---------------------------------------------------------- fixtures
  UI.register('fixtures', {
    title: 'Fixtures', sub: () => { const t = H.team(); return t ? t.name : ''; }, tabs: 'fixtures',
    render() {
      const w = H.w(); const t = H.team(); if (!t) return '<div class="empty">No team, no fixtures.</div>';
      const fxs = W.userFixtures(w, t.key).filter(f => w.editions[f.ed] && !w.editions[f.ed].pruned);
      if (!fxs.length) return '<div class="empty">No fixtures yet. Continue to move the calendar on.</div>';
      let h = ''; let lastEd = null;
      const nextId = (W.peekNext(w) || {}).id;
      for (const f of fxs) {
        if (f.ed !== lastEd) { lastEd = f.ed; h += `<div class="sec"><h2>${esc(w.editions[f.ed].name)}</h2></div>`; }
        const opp = w.teams[H.oppOf(f, t.key)];
        const res = H.resultFor(f, t.key);
        const label = { Q1: 'Qualifier 1', E: 'Eliminator', Q2: 'Qualifier 2', F: 'Final', SF: 'Semi-final' }[f.stage] || (f.fmt === 'TEST' ? 'Test' : f.fmt === 'ODI' ? 'ODI' : f.fmt === 'FC4' ? '4-day' : '');
        h += `<button class="row ${f.id === nextId ? 'sel' : ''}" data-act="fx" data-arg="${f.id}">${UI.badge(opp, 'sm')}<div class="grow"><div class="t ellip">${f.neutral ? '' : f.home === t.key ? 'v ' : '@ '}${esc(opp.name)} ${label ? `<span class="small dim">${label}</span>` : ''}</div><div class="s ellip">${U.fmtDate(f.date)}${f.result ? ', ' + esc(f.result.text) : ', ' + esc(f.venue.name)}</div></div>${res ? `<span class="b ${res === 'W' ? 'pos' : res === 'L' ? 'neg' : 'dim'}">${res}</span>` : ''}</button>`;
      }
      return h;
    },
    actions: { fx(id) { const w = H.w(); const f = w.fx[id]; if (f.status === 'done') UI.go('scorecard', { fx: id }); else UI.toast(`${U.fmtDate(f.date)}: press Continue on Home to reach it.`); } },
  });

  // ---------------------------------------------------------- tables & stats
  UI.register('tables', {
    title: 'Tables and stats', tabs: 'tables',
    sub: (p, st) => { const ed = H.w().editions[st.ed || p.ed || (H.currentEdition() || {}).id || H.anyEdition()]; return ed ? ed.name : ''; },
    render(p, st) {
      const w = H.w();
      st.ed = st.ed || p.ed || (H.currentEdition() || {}).id || H.anyEdition();
      const ed = w.editions[st.ed];
      st.view = st.view || 'table';
      let h = `<div class="ctl" style="display:flex;gap:8px"><button class="btn ghost sm grow" data-act="pickEd">Change competition</button><button class="btn ghost sm" data-act="world">World</button></div>`;
      if (!ed) return h + '<div class="empty">No competition to show yet.</div>';
      h += `<div class="ctl">${UI.seg('view', [['table', ed.type === 'series' ? 'Series' : 'Table'], ['results', 'Results'], ['stats', 'Stats']], st.view)}</div>`;
      if (st.view === 'table') h += H.tableHTML(ed);
      else if (st.view === 'results') h += H.resultsHTML(ed);
      else h += H.statsHTML(ed, st);
      return h;
    },
    actions: {
      view(v, el, p, st) { st.view = v; UI.refresh(); },
      stat(v, el, p, st) { st.stat = v; UI.refresh(); },
      pickEd(a, el, p, st) { H.edPicker((id) => { st.ed = id; UI.refresh(); }); },
      world() { UI.go('worldHub', {}); },
      fx(id) { UI.go('scorecard', { fx: id }); },
      player(a) { UI.go('player', { pid: +a }); },
    },
  });
  H.anyEdition = function () { const w = H.w(); const live = Object.values(w.editions).filter(e => e.status === 'live' && e.type !== 'series'); return live.length ? live[0].id : null; };
  H.edPicker = function (cb) {
    const w = H.w();
    const eds = Object.values(w.editions).filter(e => !e.pruned && (e.status !== 'scheduled' || (e.start - w.date) < 60)).sort((a, b) => (a.type === 'series') - (b.type === 'series') || b.start - a.start);
    const groups = [['Live and recent leagues', eds.filter(e => e.type !== 'series')], ['International series', eds.filter(e => e.type === 'series').slice(0, 40)]];
    UI.sheet(`<h3>Competitions</h3>${groups.map(([n, list]) => list.length ? `<div class="sec"><h2>${n}</h2></div><div class="list">${list.map(e => `<button class="row" data-act="e" data-arg="${e.id}"><div class="grow"><div class="t ellip">${esc(e.name)}</div><div class="s">${e.status === 'done' ? 'Finished' : e.status === 'live' ? 'In progress' : 'Starts ' + U.fmtDate(e.start)}</div></div></button>`).join('')}</div>` : '').join('')}`, { e: (id) => { UI.closeSheet(); cb(id); } });
  };
  H.tableHTML = function (ed) {
    const w = H.w(); const me = w.user.team;
    const tbl = (keys, title, cutAt, prefix) => {
      const T = ed.table; const fc = ed.fmt === 'FC4' || ed.fmt === 'TEST';
      return `${title ? `<div class="sec"><h2>${esc(title)}</h2></div>` : ''}<div class="tblwrap"><table class="tbl"><thead><tr><th class="l">Team</th><th>P</th><th>W</th><th>L</th>${fc ? '<th>D</th><th>Bon</th>' : '<th>NRR</th>'}<th>Pts</th></tr></thead><tbody>${keys.map((k, i) => { const r = T[(prefix || '') + k]; const nrr = W.nrrFor(r); return `<tr class="${k === me ? 'me' : ''} ${cutAt && i === cutAt - 1 ? 'cut' : ''}"><td class="l">${i + 1}. ${esc(w.teams[k].name)}</td><td>${r.p}</td><td>${r.w}</td><td>${r.l}</td>${fc ? `<td>${r.d}</td><td>${(Math.round(r.bon * 10) / 10)}</td>` : `<td class="dim">${nrr >= 0 ? '+' : ''}${nrr.toFixed(2)}</td>`}<td class="b">${Math.round(r.pts * 10) / 10}</td></tr>`; }).join('')}</tbody></table></div>`;
    };
    if (ed.type === 'series') {
      const [hk, gk] = ed.teams;
      return `<div class="vs"><div class="side">${UI.badge(w.teams[hk])}<span class="nm">${esc(w.teams[hk].name)}</span></div><span class="v">v</span><div class="side">${UI.badge(w.teams[gk])}<span class="nm">${esc(w.teams[gk].name)}</span></div></div><div class="list">${ed.legs.map(l => `<div class="row"><span class="grow t">${l.fmt === 'TEST' ? 'Test series' : l.fmt === 'ODI' ? 'ODI series' : 'T20I series'} (${l.n})</span><span class="num b">${l.score[hk]}-${l.score[gk]}</span>${l.score.d ? `<span class="small dim">&nbsp;${l.score.d} drawn</span>` : ''}</div>`).join('')}</div>${ed.legs.map(l => l.text ? `<p class="sec small dim">${esc(l.text)}</p>` : '').join('')}`;
    }
    let h = '';
    if (ed.type === 'icc') {
      if (ed.icc === 'WTCF') return H.resultsHTML(ed);
      for (const g of ed.groups) h += tbl(g.order || W.sortTable(ed, g.teams), g.name, ed.icc === 'ODIWC' ? 3 : 2);
      if (ed.super) for (const g of ed.super) h += tbl(g.order || W.sortTable(ed, g.teams.map(k => 'S:' + k)).map(k => k.slice(2)), g.name, 2, 'S:');
    } else {
      const cut = { ipl4: 4, top3: 3, final2: 2 }[ed.playoff] || (ed.comp === 'CC2' ? 2 : 0);
      h += tbl(W.sortTable(ed), '', cut);
      if (ed.comp === 'CC1') h += `<p class="sec tiny dim">Bottom two are relegated.</p>`;
    }
    const ko = ed.fixtures.map(id => w.fx[id]).filter(f => f && /^(Q1|E|Q2|F|SF)$/.test(f.stage));
    if (ko.length) h += `<div class="sec"><h2>Knockouts</h2></div><div class="list">${ko.map(H.fxRow).join('')}</div>`;
    if (ed.champion) h += `<div class="banner"><div class="big">${esc(w.teams[ed.champion].name)}</div><p class="dim" style="margin:4px 0 0">Champions${ed.awards && ed.awards.topRuns ? `. Most runs: ${esc(w.players[ed.awards.topRuns.pid].name)} (${ed.awards.topRuns.v}).` : ''}${ed.awards && ed.awards.topWkts ? ` Most wickets: ${esc(w.players[ed.awards.topWkts.pid].name)} (${ed.awards.topWkts.v}).` : ''}</p></div>`;
    return h;
  };
  H.fxRow = function (f) {
    const w = H.w(); const a = w.teams[f.home], b = w.teams[f.away];
    const stage = { Q1: 'Qualifier 1', E: 'Eliminator', Q2: 'Qualifier 2', F: 'Final', SF: 'Semi-final' }[f.stage] || '';
    return `<button class="row" data-act="fx" data-arg="${f.id}"><div class="grow"><div class="t ellip">${stage ? stage + ': ' : ''}${esc(a.short)} v ${esc(b.short)}</div><div class="s ellip">${f.result ? esc(f.result.text) : U.fmtDate(f.date)}</div></div>${f.result ? `<span class="small dim num">${esc(H.scoreLine(f))}</span>` : ''}</button>`;
  };
  H.resultsHTML = function (ed) {
    const w = H.w();
    const fxs = ed.fixtures.map(id => w.fx[id]).filter(Boolean).sort((a, b) => b.date - a.date);
    const done = fxs.filter(f => f.status === 'done'), todo = fxs.filter(f => f.status !== 'done').reverse();
    return `${todo.length ? `<div class="sec"><h2>Upcoming</h2></div><div class="list">${todo.slice(0, 12).map(H.fxRow).join('')}</div>` : ''}<div class="sec"><h2>Results</h2></div><div class="list">${done.map(H.fxRow).join('') || '<div class="empty small">No results yet.</div>'}</div>`;
  };
  H.statsHTML = function (ed, st) {
    const w = H.w(); st.stat = st.stat || 'runs';
    const lb = W.leaderboards(w, ed, 15);
    const cols = { runs: ['Runs', r => r.s.r, r => `${r.s.i} inns, avg ${U.avgStr(r.s.r, r.s.i - r.s.no)}, SR ${U.sr(r.s.r, r.s.b)}`], wkts: ['Wickets', r => r.s.w, r => `avg ${r.s.w ? (r.s.rc / r.s.w).toFixed(1) : '-'}, econ ${U.econ(r.s.rc, r.s.bb)}, best ${r.s.bbw}/${r.s.bbr}`], sr: ['Strike rate', r => U.sr(r.s.r, r.s.b), r => `${r.s.r} runs off ${r.s.b}`], econ: ['Economy', r => U.econ(r.s.rc, r.s.bb), r => `${r.s.w} wkts in ${U.overs(r.s.bb)} overs`], sixes: ['Sixes', r => r.s.f6, r => `${r.s.f4} fours`], mvp: ['MVP points', r => Math.round(r.v), r => `${r.s.r} runs, ${r.s.w} wkts, ${r.s.ct} catches`] };
    const c = cols[st.stat];
    return `<div class="ctl">${UI.seg('stat', [['runs', 'Runs'], ['wkts', 'Wkts'], ['sr', 'SR'], ['econ', 'Econ'], ['sixes', '6s'], ['mvp', 'MVP']], st.stat)}</div><div class="list">${lb[st.stat].map((r, i) => { const x = w.players[r.pid]; const team = Object.values(x.teams).map(k => w.teams[k]).find(t => ed.teams && ed.teams.includes(t.key)) || w.teams[W.natKey(x.cc)]; return `<button class="row" data-act="player" data-arg="${r.pid}"><span class="dimmer small" style="width:20px">${i + 1}</span>${team ? UI.badge(team, 'sm') : ''}<div class="grow"><div class="t ellip">${esc(x.name)}</div><div class="s ellip">${esc(c[2](r))}</div></div><span class="b num" style="font-size:17px">${c[1](r)}</span></button>`; }).join('') || '<div class="empty small">No stats yet.</div>'}</div>`;
  };

  // world hub: WTC, rankings, records, honours
  UI.register('worldHub', {
    title: 'World cricket', cls: 'no-tabs',
    render(p, st) {
      const w = H.w(); st.v = st.v || 'rank'; st.f = st.f || 'TEST';
      let h = `<div class="ctl">${UI.seg('v', [['rank', 'Rankings'], ['wtc', 'WTC'], ['rec', 'Records'], ['hon', 'Honours']], st.v)}</div>`;
      if (st.v === 'rank') {
        h += `<div class="ctl">${UI.seg('f', [['TEST', 'Test'], ['ODI', 'ODI'], ['T20I', 'T20I']], st.f)}</div>`;
        const rows = Object.entries(w.rank[st.f]).sort((a, b) => b[1] - a[1]);
        h += `<div class="list">${rows.map(([k, v], i) => `<div class="row ${k === w.user.team ? 'sel' : ''}"><span class="dimmer small" style="width:20px">${i + 1}</span>${UI.badge(w.teams[k], 'sm')}<span class="grow t">${esc(w.teams[k].name)}</span><span class="num b">${Math.round((v - 1000) / 8)}</span></div>`).join('')}</div><p class="sec tiny dimmer">Ratings move with every international result.</p>`;
      } else if (st.v === 'wtc') {
        const rows = W.wtcStandings(w);
        h += `<p class="sec small dim">World Test Championship ${esc(w.wtc.cycle)}. The top two meet in the final.</p><div class="tblwrap"><table class="tbl"><thead><tr><th class="l">Team</th><th>P</th><th>W</th><th>L</th><th>D</th><th>Pts</th><th>PCT</th></tr></thead><tbody>${rows.map((x, i) => `<tr class="${x.key === w.user.team ? 'me' : ''} ${i === 1 ? 'cut' : ''}"><td class="l">${i + 1}. ${esc(w.teams[x.key].name)}</td><td>${x.r.p}</td><td>${x.r.w}</td><td>${x.r.l}</td><td>${x.r.d}</td><td>${x.r.pts}</td><td class="b">${x.pct.toFixed(1)}</td></tr>`).join('')}</tbody></table></div>`;
      } else if (st.v === 'rec') {
        st.rf = st.rf || 'TEST';
        h += `<div class="ctl">${UI.seg('rf', [['TEST', 'Test'], ['ODI', 'ODI'], ['T20I', 'T20I'], ['T20', 'T20'], ['FC', 'FC'], ['HUN', '100']], st.rf)}</div>`;
        const r = w.records[st.rf] || {};
        const sec = (title, list, fmt) => `<div class="sec"><h2>${title}</h2></div><div class="list">${(list || []).slice(0, 8).map(fmt).join('') || '<div class="empty small">None yet.</div>'}</div>`;
        h += sec('Highest scores', r.hs, x => `<button class="row" data-act="player" data-arg="${x.pid}"><div class="grow"><div class="t">${esc(w.players[x.pid].name)}</div><div class="s ellip">${esc(w.teams[x.t].short)} v ${esc(w.teams[x.vs].short)}, ${esc(x.ev)}</div></div><span class="b num">${x.v}${x.no ? '*' : ''}</span></button>`);
        h += sec('Best bowling', r.bb, x => `<button class="row" data-act="player" data-arg="${x.pid}"><div class="grow"><div class="t">${esc(w.players[x.pid].name)}</div><div class="s ellip">${esc(w.teams[x.t].short)} v ${esc(w.teams[x.vs].short)}, ${esc(x.ev)}</div></div><span class="b num">${x.w}/${x.r}</span></button>`);
        h += sec('Highest totals', r.tt, x => `<div class="row"><div class="grow"><div class="t">${esc(w.teams[x.t].name)}</div><div class="s ellip">v ${esc(w.teams[x.vs].short)}, ${esc(x.ev)}</div></div><span class="b num">${x.v}/${x.w}${x.dec ? 'd' : ''}</span></div>`);
        h += sec('Lowest all-out totals', r.lt, x => `<div class="row"><div class="grow"><div class="t">${esc(w.teams[x.t].name)}</div><div class="s ellip">v ${esc(w.teams[x.vs].short)}, ${esc(x.ev)}</div></div><span class="b num">${x.v}</span></div>`);
      } else {
        const keys = Object.keys(w.history);
        if (!keys.length) h += '<div class="empty">Champions will be listed here as competitions finish.</div>';
        for (const k of keys) h += `<div class="sec"><h2>${esc(W.COMP_LABEL[k] || W.ICC_NAMES[k] || k)}</h2></div><div class="list">${w.history[k].slice().reverse().map(x => `<div class="row"><div class="grow"><div class="t">${x.champion ? esc(w.teams[x.champion].name) : 'Shared'}</div><div class="s">${esc(x.name)}${x.runnerUp ? `, beat ${esc(w.teams[x.runnerUp].short)}` : ''}</div></div></div>`).join('')}</div>`;
      }
      return h;
    },
    actions: { v(v, el, p, st) { st.v = v; UI.refresh(); }, f(v, el, p, st) { st.f = v; UI.refresh(); }, rf(v, el, p, st) { st.rf = v; UI.refresh(); }, player(a) { UI.go('player', { pid: +a }); } },
  });

  // ---------------------------------------------------------- more
  UI.register('more', {
    title: 'More', tabs: 'more',
    render() {
      const w = H.w(); const u = w.user;
      const item = (act, t, s) => `<button class="row" data-act="${act}"><div class="grow"><div class="t">${t}</div>${s ? `<div class="s">${s}</div>` : ''}</div><span class="chev">${UI.icons.chev}</span></button>`;
      const unread = w.inbox.filter(m => !m.read).length;
      return `<div class="list">${item('career', 'My career', `Reputation ${Math.round(u.rep)}/100${(u.titles || []).length ? `, ${u.titles.length} title${u.titles.length > 1 ? 's' : ''}` : ''}`)}${item('inbox', 'Inbox', unread ? `${unread} unread` : '')}${item('news', 'News')}${item('world', 'World cricket', 'Rankings, WTC, records, honours')}${item('save', 'Save game', App.slot === 'auto' ? 'Autosave is on' : 'Saving to ' + App.slot)}${item('saves', 'Load and save games')}${item('settings', 'Settings')}${item('help', 'How to play')}${item('menu', 'Main menu')}</div>`;
    },
    actions: {
      career() { UI.go('career', {}); }, inbox() { UI.go('inbox', {}); }, news() { UI.go('news', {}); }, world() { UI.go('worldHub', {}); },
      save() { App.save(App.slot === 'auto' ? 'slot1' : App.slot); App.save('auto', true); },
      saves() { UI.go('saves', {}); }, settings() { UI.go('settings', {}); }, help() { UI.go('help', {}); },
      menu() { App.toMenu(); },
    },
  });
  UI.register('inbox', {
    title: 'Inbox', cls: 'no-tabs',
    render() { const w = H.w(); return `<div class="list">${w.inbox.map(H.mailRow).join('') || '<div class="empty">No messages.</div>'}</div>`; },
    actions: { mail(id) { H.openMail(+id); } },
  });
  UI.register('news', {
    title: 'News', cls: 'no-tabs',
    render() { const w = H.w(); return `<div class="list">${w.news.map(n => `<div class="msg"><div class="grow"><div class="small">${esc(n.text)}</div><div class="when">${U.fmtDate(n.date)}</div></div></div>`).join('') || '<div class="empty">No news yet.</div>'}</div>`; },
  });
  UI.register('career', {
    title: 'My career', cls: 'no-tabs',
    render() {
      const w = H.w(); const u = w.user;
      let h = `<div class="sec"><p class="b" style="font-size:18px;margin:0">${esc(u.name)}</p><p class="dim small">${u.team ? 'Head coach of ' + esc(w.teams[u.team].name) : 'Unemployed'}. Reputation ${Math.round(u.rep)}/100. Record ${u.won || 0} won, ${u.lost || 0} lost from ${u.played || 0}.</p></div>`;
      if ((u.titles || []).length) h += `<div class="sec"><h2>Titles</h2></div><div class="list">${u.titles.map(t => `<div class="row"><span class="grow t">${esc(t.name)}</span><span class="small dim">${U.fmtDate(t.date)}</span></div>`).join('')}</div>`;
      h += H.offersHTML();
      h += `<div class="sec"><h2>History</h2></div><div class="list">${u.history.slice().reverse().map(x => `<div class="row"><div class="grow"><div class="t">${esc(x.name)}</div><div class="s">${esc(x.teamName || '')}${x.target ? `, target: ${esc(C.TARGETS[x.target])}` : ''}${x.finish ? `, ${esc(x.finish)}` : ''}</div></div>${x.met != null ? `<span class="b ${x.met ? 'pos' : 'neg'}">${x.met ? 'Met' : 'Missed'}</span>` : ''}</div>`).join('') || '<div class="empty small">Your record starts here.</div>'}</div>`;
      if (u.team) h += `<div class="btnrow"><button class="btn danger" data-act="resign">Resign</button></div>`;
      return h;
    },
    actions: {
      accept(k) { H.accept(k); },
      decline(k) { const w = H.w(); w.user.offers = w.user.offers.filter(o => o.team !== k); UI.refresh(); },
      resign() { UI.confirm({ title: 'Resign from your job?', body: 'You will be unemployed until you accept an offer.' }, 'Resign', 'Stay', true).then(ok => { if (ok) { C.resign(H.w()); App.autosave(); UI.go('home', {}, { reset: true }); } }); },
    },
  });

  // ---------------------------------------------------------- after a match / reviews
  UI.register('matchReport', {
    title: 'Result', cls: 'no-tabs', back: false,
    render(p) {
      const w = H.w(); const fx = w.fx[p.fx]; const r = fx.result; const key = w.user.team;
      const won = r.winner === key, lost = r.winner && r.winner !== key;
      let h = `<div class="banner"><div class="big ${won ? 'pos' : lost ? 'neg' : ''}">${esc(r.text)}</div><p class="dim" style="margin:6px 0 0">${esc(W.fixtureTitle(w, fx))}</p>${r.inns.map(i => `<p style="margin:4px 0">${esc(w.teams[i.team].name)} <b>${i.runs}/${i.wkts}${i.dec ? 'd' : ''}</b> <span class="dim small">(${U.overs(i.balls, fx.fmt === 'HUN' ? 5 : 6)} ov)</span></p>`).join('')}${r.mom != null ? `<p class="small dim">Player of the match: <b class="hi">${esc(w.players[r.mom].name)}</b></p>` : ''}</div>`;
      if ((r.tops || []).length) h += `<div class="sec"><h2>Top performers</h2></div><div class="list">${r.tops.map(t => `<button class="row" data-act="player" data-arg="${t.pid}">${t.team && w.teams[t.team] ? UI.badge(w.teams[t.team], 'sm') : ''}<span class="grow t">${esc(w.players[t.pid].name)}</span><span class="num">${t.t === 'b' ? `${t.r}${t.no ? '*' : ''} (${t.b})` : `${t.w}/${t.r}`}</span></button>`).join('')}</div>`;
      const ed = w.editions[fx.ed]; if (ed) h += H.snippet(ed);
      h += `<div class="btnrow"><button class="btn ghost" data-act="card">Scorecard</button><button class="btn" data-act="continue">Continue</button></div>`;
      return h;
    },
    actions: { card(a, el, p) { UI.go('scorecard', { fx: p.fx }); }, continue() { UI.go('home', {}, { reset: true }); App.continue(); }, player(a) { UI.go('player', { pid: +a }); }, table(id) { UI.go('tables', { ed: id }); } },
  });
  UI.register('review', {
    title: (p) => ({ edition: 'Season review', sacked: 'Sacked', offers: 'Job offers', season: 'Season review' }[p.alert && p.alert.type] || 'Review'),
    cls: 'no-tabs', back: false,
    render(p) {
      const w = H.w(); const a = p.alert || {}; const u = w.user;
      let h = '';
      if (a.type === 'edition') {
        const ed = w.editions[a.ed]; const ob = u.objectives[a.ed] || {};
        h += `<div class="banner"><div class="big">${esc(ed.name)}: ${esc(ob.finish || '')}</div><p class="dim">Target: ${esc(C.TARGETS[ob.target] || '')}. ${ob.met ? '<span class="pos">Target met.</span>' : '<span class="neg">Target missed.</span>'} Board confidence ${Math.round(u.conf)}/100.</p>${ed.champion ? `<p class="small dim">Champions: ${esc(w.teams[ed.champion].name)}</p>` : ''}</div>`;
        const lb = W.leaderboards(w, ed, 40);
        const mine = (list) => list.filter(r => Object.values(w.players[r.pid].teams).includes(u.team) || u.formerTeam && Object.values(w.players[r.pid].teams).includes(u.formerTeam) || W.natKey(w.players[r.pid].cc) === (u.team || u.formerTeam)).slice(0, 3);
        const br = mine(lb.runs), bw = mine(lb.wkts);
        if (br.length || bw.length) h += `<div class="sec"><h2>Your best players</h2></div><div class="list">${br.map(r => `<div class="row"><span class="grow t">${esc(w.players[r.pid].name)}</span><span class="num">${r.s.r} runs</span></div>`).join('')}${bw.map(r => `<div class="row"><span class="grow t">${esc(w.players[r.pid].name)}</span><span class="num">${r.s.w} wkts</span></div>`).join('')}</div>`;
      } else if (a.type === 'sacked') {
        h += `<div class="banner"><div class="big neg">The board has sacked you</div><p class="dim">Your reputation has taken a hit. Take an offer below, or keep the calendar moving and wait for better ones.</p></div>`;
      } else if (a.type === 'season') {
        h += `<div class="banner"><div class="big">${a.season - 1}-${String(a.season).slice(2)} season</div><p class="dim">${a.met} of ${a.total} board targets met. Board confidence ${Math.round(u.conf)}/100.</p></div>`;
      }
      h += H.offersHTML();
      h += `<div class="btnrow"><button class="btn" data-act="ok">Continue</button></div>`;
      return h;
    },
    actions: {
      ok() { const w = H.w(); w.user.alert = null; App.autosave(); UI.go('home', {}, { reset: true }); },
      accept(k) { H.accept(k); },
      decline(k) { const w = H.w(); w.user.offers = w.user.offers.filter(o => o.team !== k); UI.refresh(); },
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
