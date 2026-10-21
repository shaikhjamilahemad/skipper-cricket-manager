/* Skipper — main menu, new career, quick match, tournament, saves, settings, help */
(function (G) {
  'use strict';
  const SK = G.SK = G.SK || {};
  const U = SK.U, UI = SK.UI, R = SK.R, W = SK.World, S = SK.Store, esc = SK.U.esc;
  const App = SK.App;

  // base teams (no world needed) for setup screens
  App.baseTeams = function (compId) {
    const b = App.quickBase(); App._bt = App._bt || {};
    if (App._bt[compId]) return App._bt[compId];
    const c = b.comps.find(x => x.id === compId);
    const fmtOf = { T20: 'T20', '100': 'HUN', FC4: 'FC4', INT: 'ODI' }[c.fmt] || 'T20';
    const list = c.teams.map(t => {
      const pool = compId === 'INTL' ? b.players.filter(p => p.cc === (t.id === 'SCOT' ? 'SCO' : t.id)) : t.squad.map(i => b.players[i]);
      const isOS = (p) => compId !== 'INTL' && SK.DB.isOverseasFor(p, c.home);
      const fm = compId === 'INTL' ? 'ODI' : fmtOf;
      const pref = t.pref && t.pref[fm === 'T20' ? 'T20I' : fm] ? new Set(t.pref[fm === 'T20' ? 'T20I' : fm]) : null;
      const xi = SK.Sel.pickXI(pool, { fmt: fm, maxOverseas: compId === 'INTL' ? 11 : c.osXI, isOverseas: isOS, pitch: t.pitch, pref });
      return { key: compId + ':' + t.id, comp: compId, id: t.id, name: t.name, short: t.short, c1: t.c1, c2: t.c2, venue: t.venue, city: t.city, pitch: t.pitch, cap: null, pool, strength: U.avg(xi, p => R.overall(p, fm)), cc: compId === 'INTL' ? (t.id === 'SCOT' ? 'SCO' : t.id) : c.home, home: c.home, osXI: c.osXI, pref: t.pref, caps: t.caps };
    }).sort((a, b) => b.strength - a.strength);
    App._bt[compId] = list; return list;
  };
  const COMP_ORDER = [['INTL', 'International', 'Coach a national side through Tests, ODIs, T20Is and World Cups'], ['IPL', 'IPL', 'Ten franchises, auctions every winter'], ['BBL', 'Big Bash League', 'Australia\'s summer T20'], ['PSL', 'Pakistan Super League', 'Eight teams in 2026'], ['SA20', 'SA20', 'South Africa\'s franchise league'], ['CPL', 'Caribbean Premier League', 'Seven teams across the islands'], ['HUN', 'The Hundred', '100-ball cricket in England'], ['ILT20', 'International League T20', 'UAE-based franchise league'], ['MLC', 'Major League Cricket', 'T20 in the USA'], ['CC1', 'County Championship Div 1', 'Four-day cricket, promotion and relegation'], ['CC2', 'County Championship Div 2', 'Four-day cricket, win promotion'], ['SHF', 'Sheffield Shield', 'Australian first-class cricket']];
  App.COMP_ORDER = COMP_ORDER;
  const teamRows = (teams, act) => teams.map(t => `<button class="row" data-act="${act}" data-arg="${esc(t.key)}">${UI.badge(t)}<div class="grow"><div class="t ellip">${esc(t.name)}</div><div class="s">${esc(t.city || '')}</div></div>${UI.stars(t.strength)}</button>`).join('');

  // ---------------------------------------------------------- main menu
  UI.register('menu', {
    title: '', noTop: true, cls: 'no-tabs menu',
    render() {
      const last = S.latestSave();
      let h = `<div class="title"><div class="stumps" aria-hidden="true"><i></i><i></i><i></i></div><h1 class="word">SKIPPER</h1><div class="tag">Cricket manager. Real squads from October 2026, every major league, your decisions on every ball.</div></div>`;
      if (last) {
        const m = last.meta;
        h += `<button class="contcard" data-act="cont" data-arg="${last.slot}" style="border:0;width:calc(100% - 32px);text-align:left;color:inherit">${UI.badge({ short: m.short || '?', c1: m.c1, c2: m.c2 }, 'lg')}<div class="grow"><div class="b" style="font-size:17px">Continue: ${esc(m.team)}</div><div class="small dim">${esc(m.manager)}, ${U.fmtDate(m.date)}${m.mode === 'tournament' ? ', tournament' : ''}</div></div>${UI.icons.chev}</button>`;
      }
      const item = (act, t, s) => `<button class="row" data-act="${act}"><div class="grow"><div class="t">${t}</div><div class="s">${s}</div></div><span class="chev">${UI.icons.chev}</span></button>`;
      h += `<div class="list">${item('newCareer', 'New career', 'Take any team, survive the board, get headhunted')}${item('quick', 'Quick match', 'Any two teams, any format')}${item('tourn', 'Tournament', 'Play one season or a World Cup')}${item('saves', 'Load and save games', 'Save slots, back up to a file')}${item('editor', 'Squad editor', 'Update squads and ratings for new games')}${item('settings', 'Settings', 'Speed, captaincy defaults, data')}${item('help', 'How to play', 'Captaincy, auctions, the board')}</div>`;
      h += `<p class="sec tiny dimmer">Squads as researched on 20 Oct 2026. Ratings are estimates. Not affiliated with any league or board.</p>`;
      return h;
    },
    actions: {
      cont(slot) { App.loadSlot(slot); },
      newCareer() { UI.go('newCareer', {}); },
      quick() { UI.go('quickSetup', {}); },
      tourn() { UI.go('tournSetup', {}); },
      saves() { UI.go('saves', {}); },
      editor() { UI.go('editor', {}); },
      settings() { UI.go('settings', {}); },
      help() { UI.go('help', {}); },
    },
  });

  // ---------------------------------------------------------- new career
  UI.register('newCareer', {
    title: (p, st) => (st.comp ? 'Choose your team' : 'New career'), cls: 'no-tabs',
    sub: (p, st) => (st.comp ? (COMP_ORDER.find(c => c[0] === st.comp) || [])[1] : ''),
    onBack(p, st) { if (st.team) { st.team = null; UI.refresh(); return true; } if (st.comp) { st.comp = null; UI.refresh(); return true; } return false; },
    render(p, st) {
      st.name = st.name || S.settings.lastManager || '';
      if (!st.comp) {
        return `<div class="field"><label for="mgr">Your name</label><input id="mgr" class="input" maxlength="28" placeholder="e.g. Jamil" value="${esc(st.name)}" data-change="name"></div>
          <div class="sec"><h2>Where do you start?</h2><p class="small dim">You can move between leagues and national teams later through job offers.</p></div>
          <div class="list">${COMP_ORDER.map(([id, n, d]) => `<button class="row" data-act="comp" data-arg="${id}"><div class="grow"><div class="t">${esc(n)}</div><div class="s">${esc(d)}</div></div><span class="chev">${UI.icons.chev}</span></button>`).join('')}</div>`;
      }
      if (!st.team) {
        const teams = App.baseTeams(st.comp);
        return `<p class="sec small dim">Stars show current squad strength. Strong teams come with tougher board targets.</p><div class="list">${teamRows(teams, 'team')}</div>`;
      }
      const t = App.baseTeams(st.comp).find(x => x.key === st.team);
      const league = SK.World.LEAGUES.includes(st.comp);
      return `<div class="vs"><div class="side">${UI.badge(t, 'lg')}<span class="nm">${esc(t.name)}</span>${UI.stars(t.strength)}</div></div>
        <div class="list">
        ${league ? `<div class="row"><div class="grow"><div class="t">Run my own auctions</div><div class="s">Off: the computer handles retentions and auctions for you</div></div>${UI.toggle('auc', st.auctions !== false)}</div>` : ''}
        <div class="row"><div class="grow"><div class="t">Choose bowlers myself</div><div class="s">You can change this before any match</div></div>${UI.toggle('mb', S.settings.manualBowl)}</div></div>
        <p class="sec small dim">The career starts on 1 November 2026. ${st.comp === 'IPL' ? 'IPL 2027 retentions close in mid-November and the auction is on 16 December.' : st.comp === 'INTL' ? 'You will pick a squad before every series.' : ''}</p>
        <div class="btnrow"><button class="btn" data-act="start">Start career</button></div>`;
    },
    actions: {
      name(v, el, p, st) { st.name = el.value.trim(); },
      comp(id, el, p, st) { const i = document.getElementById('mgr'); if (i) st.name = i.value.trim(); st.comp = id; UI.refresh(); },
      team(k, el, p, st) { st.team = k; UI.refresh(); },
      auc(v, el, p, st) { st.auctions = el.checked; },
      mb(v, el) { S.settings.manualBowl = el.checked; S.saveSettings(); },
      start(a, el, p, st) {
        const name = st.name || 'The Skipper';
        S.settings.lastManager = name; S.saveSettings();
        App.startCareer({ team: st.team, manager: name, auctions: st.auctions !== false });
      },
    },
  });

  // ---------------------------------------------------------- quick match
  const QFMTS = [['T20', 'T20'], ['ODI', 'ODI'], ['TEST', 'Test'], ['HUN', 'Hundred'], ['FC4', '4-day']];
  UI.register('quickSetup', {
    title: 'Quick match', cls: 'no-tabs',
    render(p, st) {
      st.fmt = st.fmt || 'T20';
      if (!st.a) { const ipl = App.baseTeams('IPL'); st.a = ipl[0].key; st.b = ipl[1].key; }
      st.ctl = st.ctl == null ? 0 : st.ctl;
      const ta = App.findBaseTeam(st.a), tb = App.findBaseTeam(st.b);
      const pick = (side, t) => `<button class="row" data-act="pickTeam" data-arg="${side}">${UI.badge(t)}<div class="grow"><div class="t">${esc(t.name)}</div><div class="s">${side === 'a' ? 'Home side' : 'Away side'}</div></div><span class="chev">${UI.icons.chev}</span></button>`;
      return `<div class="sec"><h2>Format</h2></div><div class="ctl">${UI.seg('fmt', QFMTS, st.fmt, 'wide')}</div>
        <div class="sec"><h2>Teams</h2></div><div class="list">${pick('a', ta)}${pick('b', tb)}</div>
        <div class="sec"><h2>Pitch</h2></div><div class="ctl">${UI.seg('pitch', [['home', 'Home'], ['F', 'Flat'], ['G', 'Green'], ['D', 'Turner'], ['P', 'Bouncy']], st.pitch || 'home')}</div>
        <div class="sec"><h2>You captain</h2></div><div class="ctl">${UI.seg('ctl', [['0', ta.short], ['1', tb.short], ['-1', 'Watch']], String(st.ctl), 'wide')}</div>
        <div class="btnrow"><button class="btn" data-act="go">Continue to team selection</button></div>`;
    },
    actions: {
      fmt(v, el, p, st) { st.fmt = v; UI.refresh(); },
      pitch(v, el, p, st) { st.pitch = v; UI.refresh(); },
      ctl(v, el, p, st) { st.ctl = +v; UI.refresh(); },
      pickTeam(side, el, p, st) { App.teamPicker((key) => { st[side] = key; UI.refresh(); }); },
      go(a, el, p, st) {
        const ta = App.findBaseTeam(st.a), tb = App.findBaseTeam(st.b);
        if (ta.key === tb.key) { UI.toast('Pick two different teams.'); return; }
        const eng = st.fmt === 'T20' ? (ta.comp === 'INTL' && tb.comp === 'INTL' ? 'T20I' : 'T20') : st.fmt;
        const venue = { name: ta.venue, city: ta.city, cc: ta.cc, pitch: st.pitch && st.pitch !== 'home' ? st.pitch : ta.pitch };
        const ctx = { kind: 'quick', teams: [ta, tb], fmt: eng, venue, userSide: st.ctl < 0 ? null : st.ctl, title: `${ta.short} v ${tb.short}, ${SK.FORMATS[eng].label}` };
        UI.go('prematch', { ctx });
      },
    },
  });
  App.findBaseTeam = function (key) { const comp = key.split(':')[0]; return App.baseTeams(comp).find(t => t.key === key); };
  App.teamPicker = function (cb, comps) {
    const list = (comps || COMP_ORDER.map(c => c[0]));
    const sh = UI.sheet(`<h3>Choose a competition</h3><div class="list">${list.map(id => `<button class="row" data-act="c" data-arg="${id}"><span class="grow t">${esc((COMP_ORDER.find(c => c[0] === id) || [id, id])[1])}</span><span class="chev">${UI.icons.chev}</span></button>`).join('')}</div>`, {
      c: (id) => { sh.innerHTML = `<div class="grab"></div><h3>Choose a team</h3><div class="list">${teamRows(App.baseTeams(id), 't')}</div>`; },
      t: (key) => { UI.closeSheet(); cb(key); },
    });
  };

  // ---------------------------------------------------------- tournament
  UI.register('tournSetup', {
    title: (p, st) => (st.comp ? 'Choose your team' : 'Tournament'), cls: 'no-tabs',
    onBack(p, st) { if (st.comp) { st.comp = null; UI.refresh(); return true; } return false; },
    render(p, st) {
      if (!st.comp) {
        const opts = [['T20WC', 'T20 World Cup', '20 nations, groups, Super 8, knockouts'], ['ODIWC', 'ODI World Cup', '14 nations, groups, Super Six, knockouts'], ['CT', 'Champions Trophy', 'Top eight ODI nations'], ['IPL', 'IPL 2027', 'One season with real squads'], ['BBL', 'BBL|16', ''], ['PSL', 'PSL 2027', ''], ['SA20', 'SA20 2027', ''], ['HUN', 'The Hundred 2027', ''], ['CPL', 'CPL 2027', ''], ['ILT20', 'ILT20 Season 5', ''], ['MLC', 'MLC 2027', ''], ['SHF', 'Sheffield Shield 2026-27', ''], ['CC1', 'County Championship 2027', 'Division One']];
        return `<p class="sec small dim">A single competition with no board and no sacking.</p><div class="list">${opts.map(([id, n, d]) => `<button class="row" data-act="comp" data-arg="${id}"><div class="grow"><div class="t">${esc(n)}</div>${d ? `<div class="s">${esc(d)}</div>` : ''}</div><span class="chev">${UI.icons.chev}</span></button>`).join('')}</div>`;
      }
      const icc = ['T20WC', 'ODIWC', 'CT'].includes(st.comp);
      let teams = App.baseTeams(icc ? 'INTL' : st.comp);
      if (st.comp === 'CT') teams = teams.slice(0, 8); if (st.comp === 'ODIWC') teams = teams.slice(0, 14);
      return `<div class="list">${teamRows(teams, 'team')}</div>`;
    },
    actions: {
      comp(id, el, p, st) { st.comp = id; UI.refresh(); },
      team(key, el, p, st) { App.startTournament(st.comp, key); },
    },
  });
  App.startTournament = function (comp, teamKey) {
    UI.busy(true, 'Setting up', 'Building the tournament');
    setTimeout(() => {
      try {
        const icc = ['T20WC', 'ODIWC', 'CT'].includes(comp);
        const w = W.create({ userTeam: teamKey, manager: S.settings.lastManager || 'The Skipper', mode: 'tournament', settings: { auctions: false } });
        w.user.oneSeason = true;
        if (icc) {
          // remove other user-blocking international series; play the event now
          const start = w.date + 10;
          const host = SK.World.ccOfNat(teamKey);
          const ev = { icc: { type: comp, teams: comp === 'T20WC' ? 20 : comp === 'ODIWC' ? 14 : 8, host: comp === 'CT' ? 'IND' : host }, season: 2027, start };
          const ed = W.createICC(w, ev);
          for (const k of ed.teams) if (k !== teamKey) ed.squads[k] = { [ed.fmt]: W.selectNationalSquad(w, k, ed.fmt, 15) };
          W.assignDuty(w, ed);
          w.user.oneEd = ed.id;
          SK.Career.setObjective(w, ed);
          if (!ed.teams.includes(teamKey)) { UI.busy(false); UI.toast('That team did not qualify.'); return; }
          // drop the user's other fixtures so only the tournament stops the calendar
          for (const id in w.editions) { const e = w.editions[id]; if (id !== ed.id && e.teams && e.teams.includes(teamKey)) { e.teams = e.teams; } }
          w.user.onlyEd = ed.id;
        } else {
          const ed = Object.values(w.editions).find(e => e.comp === comp && e.type === 'league');
          w.user.oneEd = ed.id; w.user.onlyEd = ed.id;
        }
        App.world = w; App.slot = 'auto'; App.save('auto', true);
        UI.busy(false); UI.go('home', {}, { reset: true });
      } catch (e) { console.error(e); UI.busy(false); UI.toast('Could not start: ' + e.message, 4000); }
    }, 40);
  };
  UI.register('tournamentDone', {
    title: 'Tournament complete', cls: 'no-tabs', back: false,
    render() {
      const w = App.world; const ed = w.editions[w.user.oneEd];
      const champ = ed && ed.champion ? w.teams[ed.champion] : null;
      const me = w.teams[w.user.team || w.user.formerTeam];
      const ob = w.user.objectives[ed.id] || {};
      const lb = W.leaderboards(w, ed, 5);
      return `<div class="banner"><div class="big">${champ ? esc(champ.name) + ' win ' + esc(ed.name) : esc(ed.name) + ' finished'}</div><p class="dim">${esc(me.name)}: ${esc(ob.finish || '')}</p></div>
        <div class="sec"><h2>Most runs</h2></div><div class="list">${lb.runs.map(r => `<div class="row"><span class="grow t">${esc(w.players[r.pid].name)}</span><span class="num">${r.s.r}</span></div>`).join('')}</div>
        <div class="sec"><h2>Most wickets</h2></div><div class="list">${lb.wkts.map(r => `<div class="row"><span class="grow t">${esc(w.players[r.pid].name)}</span><span class="num">${r.s.w}</span></div>`).join('')}</div>
        <div class="btnrow"><button class="btn ghost" data-act="tables">Tables</button><button class="btn" data-act="menu">Main menu</button></div>`;
    },
    actions: { menu() { App.toMenu(); }, tables() { UI.go('tables', {}); } },
  });

  // ---------------------------------------------------------- saves
  UI.register('saves', {
    title: 'Load and save', cls: 'no-tabs',
    render() {
      const saves = S.listSaves();
      const hasWorld = !!App.world;
      let h = `<div class="list">${saves.map(s => { const m = s.meta; const label = s.slot === 'auto' ? 'Autosave' : 'Slot ' + s.slot.slice(4);
        return `<div class="row">${m ? UI.badge({ short: m.short || '?', c1: m.c1, c2: m.c2 }) : '<span class="badge" style="--b1:#173329;--b2:#2a4a3e"></span>'}<div class="grow"><div class="t">${label}</div><div class="s">${m ? `${esc(m.team)}, ${U.fmtDate(m.date)}` : 'Empty'}</div></div>
        ${m ? `<button class="btn sm" data-act="load" data-arg="${s.slot}">Load</button>` : ''}${hasWorld && s.slot !== 'auto' ? `<button class="btn ghost sm" data-act="saveTo" data-arg="${s.slot}">Save</button>` : ''}${m && s.slot !== 'auto' ? `<button class="iconbtn" data-act="del" data-arg="${s.slot}" aria-label="Delete">${UI.icons.close}</button>` : ''}</div>`; }).join('')}</div>`;
      h += `<div class="sec"><h2>Back up</h2><p class="small dim">Copy a game to a file so you can keep it safe or move it to another phone.</p></div><div class="btnrow">${hasWorld ? '<button class="btn ghost" data-act="exp">Export this game</button>' : ''}<button class="btn ghost" data-act="imp">Import a game file</button></div>`;
      return h;
    },
    actions: {
      load(slot) { App.loadSlot(slot); },
      saveTo(slot) { App.save(slot); UI.refresh(); },
      del(slot) { UI.confirm({ title: 'Delete this save?' }, 'Delete', 'Keep', true).then(ok => { if (ok) { S.deleteSave(slot); UI.refresh(); } }); },
      exp() { const w = App.world; const name = `skipper-${(w.user.name || 'career').replace(/\W+/g, '-')}-${U.fmtDate(w.date).replace(/ /g, '-')}.json`; S.exportText(name, JSON.stringify({ skipperSave: 1, world: w })).then(ok => UI.toast(ok ? 'Exported.' : 'Export cancelled.')); },
      imp() {
        S.importText().then(txt => {
          if (!txt) return;
          try { const o = JSON.parse(txt); const w = o.world || o; if (!w.players || !w.teams || !w.fx) throw new Error('Not a Skipper save'); App.world = w; App.slot = 'auto'; App.save('auto', true); UI.toast('Game imported.'); UI.go('home', {}, { reset: true }); }
          catch (e) { UI.toast('That file is not a Skipper save.'); }
        });
      },
    },
  });

  // ---------------------------------------------------------- settings
  UI.register('settings', {
    title: 'Settings', cls: 'no-tabs',
    render() {
      const st = S.settings;
      const tg = (k, t, s) => `<div class="row"><div class="grow"><div class="t">${t}</div>${s ? `<div class="s">${s}</div>` : ''}</div>${UI.toggle('tg', st[k], k)}</div>`;
      return `<div class="sec"><h2>Match speed</h2><p class="small dim">How fast balls play when you press Play.</p></div><div class="ctl">${UI.seg('speed', [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast'], ['turbo', 'Turbo']], st.speed, 'wide')}</div>
        <div class="sec"><h2>Captaincy defaults</h2></div><div class="list">${tg('manualBowl', 'Choose bowlers myself', 'You pick the bowler at the end of every over')}${tg('manualField', 'Set fields myself')}${tg('showField', 'Show the field view')}${tg('keepAwake', 'Keep the screen on during matches')}${tg('autoSave', 'Autosave', 'After every match and stop')}</div>
        <div class="sec"><h2>Data</h2></div><div class="list">
          <button class="row" data-act="resetDB"><div class="grow"><div class="t">Restore original squads</div><div class="s">Undo squad editor changes for new games</div></div></button>
          <button class="row" data-act="wipe"><div class="grow"><div class="t neg">Delete all saves</div></div></button></div>
        <p class="sec tiny dimmer">Fonts: Barlow and Big Shoulders Display, SIL Open Font License.</p>`;
    },
    actions: {
      speed(v) { S.settings.speed = v; S.saveSettings(); UI.refresh(); },
      tg(k, el) { S.settings[el.value] = el.checked; S.saveSettings(); },
      resetDB() { UI.confirm({ title: 'Restore original squads?', body: 'Your edited squads will be removed. Existing careers are not changed.' }, 'Restore').then(ok => { if (ok) { S.clearCustomDB(); if (G.SKIPPER_DB_BASE) G.SKIPPER_DB = G.SKIPPER_DB_BASE; App._quick = null; App._bt = null; UI.toast('Original squads restored.'); } }); },
      wipe() { UI.confirm({ title: 'Delete every save?', body: 'This cannot be undone.' }, 'Delete all', 'Cancel', true).then(ok => { if (ok) { for (const s of S.SLOTS) S.deleteSave(s); UI.toast('All saves deleted.'); } }); },
    },
  });

  // ---------------------------------------------------------- help
  UI.register('help', {
    title: 'How to play', cls: 'no-tabs',
    render() {
      const sec = (h, ps) => `<div class="sec"><h2>${h}</h2>${ps.map(p => `<p class="dim">${p}</p>`).join('')}</div>`;
      return sec('The calendar', ['Press <b>Continue</b> on the home screen. The world plays on, every league and every international series, and stops whenever you are needed: a match, an auction, or picking a national squad.']) +
        sec('Before a match', ['Pick your XI and batting order, choose a captain and keeper, read the pitch report, then go to the toss. Respect the overseas limit in franchise and county cricket.']) +
        sec('Batting', ['Each batter has an approach from <b>Block</b> to <b>Slog</b>. Auto lets the computer judge the situation. Attacking scores faster but gets players out. Set batters are harder to dismiss, so protect new batters.']) +
        sec('Bowling', ['Choose who bowls each over. Pace bowlers love new balls, green pitches and cloud cover. Spinners grow into Test matches as the pitch wears. Watch tiredness in long spells, and keep your best death bowlers for the end of a T20.', 'Field settings: Attacking takes more wickets but leaks boundaries. Defensive dries up boundaries.']) +
        sec('Tests and first-class', ['Declare from the batting controls. Lead by 200 in a Test (150 in four-day games) and you can enforce the follow-on. A new ball is available every 80 overs.']) +
        sec('Auctions', ['In franchise leagues you release players before the auction, then bid against the other teams. Keep enough purse to fill the minimum squad. Each team can only hold a limited number of overseas players.']) +
        sec('The board', ['Every competition comes with a target based on your squad strength. Results move board confidence. Drop too low at the end of a season and you are sacked. Do well and other teams, even national sides, will approach you.']) +
        sec('Keeping squads current', ['Squads change constantly. Use the Squad editor from the main menu to fix squads and ratings, or import a squads file. Changes apply to new careers.']);
    },
  });
})(typeof window !== 'undefined' ? window : globalThis);
