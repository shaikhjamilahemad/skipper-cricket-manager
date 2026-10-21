/* Skipper — squad editor: change the built-in squads and ratings used by new games */
(function (G) {
  'use strict';
  const SK = G.SK = G.SK || {};
  const U = SK.U, UI = SK.UI, R = SK.R, S = SK.Store, DB = SK.DB, esc = SK.U.esc;
  const App = SK.App;
  const E = SK.Editor = {};
  const db = () => G.SKIPPER_DB;
  const ROLE_ORD = { BAT: 0, WK: 1, AR: 2, BWL: 3 };
  const BOWLS = ['-', 'RF', 'RFM', 'RM', 'LF', 'LFM', 'LM', 'OB', 'LB', 'SLA', 'LWS'];

  // work on a private copy so "Restore original squads" can always undo
  E.ensureCopy = function () {
    if (!G.SKIPPER_DB_BASE) { G.SKIPPER_DB_BASE = G.SKIPPER_DB; G.SKIPPER_DB = JSON.parse(JSON.stringify(G.SKIPPER_DB)); }
  };
  E.commit = function (quiet) {
    const d = db(); d.edited = Date.now();
    const ok = S.setCustomDB(d);
    App._quick = null; App._bt = null; App.quickPlayers = null; E._mem = null; E._objs = null;
    if (!ok) UI.toast('Could not save the squads. Storage may be full.', 3000);
    else if (!quiet) UI.toast('Saved. New games will use this.');
    return ok;
  };
  E.obj = function (i) { E._objs = E._objs || {}; if (!E._objs[i]) E._objs[i] = DB.makePlayer(db().players[i], i, 2026); return E._objs[i]; };
  E.memberships = function () {
    if (E._mem) return E._mem;
    const m = {};
    for (const c of db().comps) { if (c.id === 'INTL') continue; for (const t of c.teams) for (const i of t.squad) (m[i] = m[i] || []).push({ c, t }); }
    E._mem = m; return m;
  };
  E.fmtOfComp = (c) => (c.id === 'INTL' ? 'ODI' : c.fmt === '100' ? 'HUN' : c.fmt === 'FC4' ? 'FC4' : 'T20');
  E.compOrder = () => (App.COMP_ORDER ? App.COMP_ORDER.map(x => x[0]) : db().comps.map(c => c.id)).map(id => db().comps.find(c => c.id === id)).filter(Boolean);
  E.findComp = (id) => db().comps.find(c => c.id === id);
  E.findTeam = (cid, tid) => { const c = E.findComp(cid); return c && c.teams.find(t => t.id === tid); };
  E.natPlayers = (cc) => db().players.map((a, i) => i).filter(i => db().players[i][1] === cc);
  E.row = function (i, fmt, opts) {
    opts = opts || {};
    const p = E.obj(i); const age = 2026 - p.yob;
    const tags = `${opts.cap ? '<span class="pill gold">C</span> ' : ''}${opts.os ? '<span class="pill os">OS</span> ' : ''}${p.ret.X ? '<span class="pill">No intl</span> ' : ''}${p.retired ? '<span class="pill inj">Retired</span>' : ''}`;
    return `<button class="row" data-act="${opts.act || 'pl'}" data-arg="${i}"><div class="grow"><div class="t ellip">${esc(p.name)} ${tags}</div><div class="s">${UI.roleName[p.role]}${p.bowl !== '-' ? ', ' + UI.bowlShort[p.bowl] : ''}, ${age}, ${esc(p.cc)}</div></div><span class="num b">${Math.round(R.overall(p, fmt))}</span></button>`;
  };

  // ---------------------------------------------------------- root
  UI.register('editor', {
    title: 'Squad editor', cls: 'no-tabs',
    render() {
      const d = db(); const custom = !!G.SKIPPER_DB_BASE;
      let h = `<p class="sec small dim">Fix squads, transfers and ratings. Changes are used by new careers, tournaments and quick matches. Games you have already started keep their own squads. ${custom ? '<span class="hi">You are using edited squads.</span>' : `Built-in squads are as of ${esc(d.version)}.`}</p>`;
      h += `<div class="ctl"><input class="input" type="search" placeholder="Find a player" data-change="find" value=""></div>`;
      h += `<div class="sec"><h2>Competitions</h2></div><div class="list">${E.compOrder().map(c => `<button class="row" data-act="comp" data-arg="${c.id}"><div class="grow"><div class="t">${esc(c.name)}</div><div class="s">${c.teams.length} teams</div></div><span class="chev">${UI.icons.chev}</span></button>`).join('')}</div>`;
      h += `<div class="sec"><h2>Players</h2></div><div class="list"><button class="row" data-act="newp"><div class="grow"><div class="t">Add a new player</div><div class="s">${d.players.length} players in the database</div></div></button></div>`;
      h += `<div class="sec"><h2>Share and back up</h2></div><div class="list"><button class="row" data-act="exp"><div class="grow"><div class="t">Export squads to a file</div><div class="s">A JSON file you can keep or share</div></div></button><button class="row" data-act="imp"><div class="grow"><div class="t">Import squads from a file</div><div class="s">Replaces the squads used for new games</div></div></button>${custom ? '<button class="row" data-act="reset"><div class="grow"><div class="t neg">Restore original squads</div></div></button>' : ''}</div>`;
      return h;
    },
    actions: {
      comp(id) { UI.go('edComp', { comp: id }); },
      find(v) { if (v.trim()) UI.go('edFind', { q: v.trim() }); },
      newp() { E.newPlayer(null, null); },
      exp() {
        const name = `skipper-squads-${new Date().toISOString().slice(0, 10)}.json`;
        S.exportText(name, JSON.stringify(db())).then(ok => UI.toast(ok ? 'Squads exported.' : 'Export cancelled.'));
      },
      imp() {
        S.importText().then(txt => {
          if (!txt) return;
          let d; try { d = JSON.parse(txt); } catch (e) { UI.toast('That file is not a squads file.'); return; }
          const err = E.validate(d); if (err) { UI.toast('That file cannot be used: ' + err, 3500); return; }
          if (!G.SKIPPER_DB_BASE) G.SKIPPER_DB_BASE = G.SKIPPER_DB;
          G.SKIPPER_DB = d; E.commit(true); UI.toast(`Imported ${d.players.length} players.`); UI.refresh();
        });
      },
      reset() {
        UI.confirm({ title: 'Restore original squads?', body: 'All your edits will be removed. Games already started are not changed.' }, 'Restore', 'Cancel', true).then(ok => {
          if (!ok) return; S.clearCustomDB(); if (G.SKIPPER_DB_BASE) { G.SKIPPER_DB = G.SKIPPER_DB_BASE; G.SKIPPER_DB_BASE = null; }
          App._quick = null; App._bt = null; App.quickPlayers = null; E._mem = null; E._objs = null; UI.toast('Original squads restored.'); UI.refresh();
        });
      },
    },
  });
  E.validate = function (d) {
    if (!d || !Array.isArray(d.players) || !Array.isArray(d.comps)) return 'missing players or competitions.';
    if (d.players.length < 100) return 'too few players.';
    for (const a of d.players) if (!Array.isArray(a) || a.length < 11 || typeof a[0] !== 'string') return 'a player entry is damaged.';
    const need = ['INTL', 'IPL'];
    for (const id of need) if (!d.comps.find(c => c.id === id)) return `the ${id} competition is missing.`;
    for (const c of d.comps) for (const t of c.teams || []) for (const i of t.squad || []) if (!(i >= 0 && i < d.players.length)) return `a squad in ${c.id} points to a missing player.`;
    return null;
  };

  // ---------------------------------------------------------- search
  UI.register('edFind', {
    title: 'Find a player', cls: 'no-tabs',
    render(p) {
      const q = p.q.toLowerCase(); const d = db();
      const hits = d.players.map((a, i) => i).filter(i => d.players[i][0].toLowerCase().includes(q)).slice(0, 60);
      return `<div class="ctl"><input class="input" type="search" placeholder="Find a player" data-change="find" value="${esc(p.q)}"></div><div class="list">${hits.map(i => E.row(i, 'T20')).join('') || '<div class="empty">No players match.</div>'}</div>`;
    },
    actions: { find(v) { if (v.trim()) UI.go('edFind', { q: v.trim() }, { replace: true }); }, pl(i) { UI.go('edPlayer', { pid: +i }); } },
  });

  // ---------------------------------------------------------- competition
  UI.register('edComp', {
    title: (p) => E.findComp(p.comp).name, cls: 'no-tabs',
    render(p) {
      const c = E.findComp(p.comp);
      return `<div class="list">${c.teams.map(t => `<button class="row" data-act="team" data-arg="${esc(t.id)}">${UI.badge(t)}<div class="grow"><div class="t">${esc(t.name)}</div><div class="s">${c.id === 'INTL' ? E.natPlayers(t.id === 'SCOT' ? 'SCO' : t.id).length + ' players from this country' : t.squad.length + ' players'}</div></div><span class="chev">${UI.icons.chev}</span></button>`).join('')}</div>`;
    },
    actions: { team(id, el, p) { UI.go('edTeam', { comp: p.comp, team: id }); } },
  });

  // ---------------------------------------------------------- team
  UI.register('edTeam', {
    title: (p) => E.findTeam(p.comp, p.team).name, sub: (p) => E.findComp(p.comp).name, cls: 'no-tabs',
    right: () => `<button class="iconbtn" data-act="teamEdit" aria-label="Edit team details">${UI.icons.edit}</button>`,
    render(p) {
      const c = E.findComp(p.comp); const t = E.findTeam(p.comp, p.team); const fmt = E.fmtOfComp(c);
      const nat = c.id === 'INTL';
      const ids = nat ? E.natPlayers(t.id === 'SCOT' ? 'SCO' : t.id) : t.squad.slice();
      ids.sort((a, b) => (ROLE_ORD[E.obj(a).role] - ROLE_ORD[E.obj(b).role]) || (R.overall(E.obj(b), fmt) - R.overall(E.obj(a), fmt)));
      const capName = t.cap;
      let h = '';
      if (nat) h += `<p class="sec small dim">Everyone with ${esc(DB.CC_NAMES[t.id === 'SCOT' ? 'SCO' : t.id] || t.id)} as their country can be picked. Change a player's country to move him. Captain: ${esc(capName || 'not set')}.</p>`;
      else {
        const os = ids.filter(i => DB.isOverseasFor(E.obj(i), c.home)).length;
        h += `<p class="sec small dim">${ids.length} players (max ${c.squadMax}), ${os} overseas (max ${c.osSquad}). Captain: ${esc(capName || 'not set')}.</p><div class="btnrow" style="padding-top:0"><button class="btn ghost sm" data-act="add">Add a player</button><button class="btn ghost sm" data-act="newp">Create new player</button></div>`;
      }
      h += `<div class="list">${ids.map(i => E.row(i, fmt, { act: 'pl', cap: E.obj(i).name === capName, os: !nat && DB.isOverseasFor(E.obj(i), c.home) })).join('') || '<div class="empty small">No players.</div>'}</div>`;
      if (nat) h += `<div class="btnrow"><button class="btn ghost sm" data-act="newp">Create new player</button></div>`;
      return h;
    },
    actions: {
      pl(i, el, p) { E.memberSheet(+i, p.comp, p.team); },
      add(a, el, p) { E.addSheet(p.comp, p.team); },
      newp(a, el, p) { E.newPlayer(p.comp, p.team); },
      teamEdit(a, el, p) { E.teamSheet(p.comp, p.team); },
    },
  });
  E.memberSheet = function (i, cid, tid) {
    const c = E.findComp(cid); const t = E.findTeam(cid, tid); const pl = E.obj(i); const nat = c.id === 'INTL';
    const others = c.teams.filter(x => x.id !== tid);
    UI.sheet(`<h3>${esc(pl.name)}</h3><div class="list">
      <button class="row" data-act="edit"><div class="grow"><div class="t">Edit player</div><div class="s">Name, country, role and ratings</div></div></button>
      <button class="row" data-act="cap"><div class="grow"><div class="t">Make captain</div></div></button>
      ${nat ? '' : `<button class="row" data-act="move"><div class="grow"><div class="t">Move to another ${esc(c.name)} team</div></div></button><button class="row" data-act="rm"><div class="grow"><div class="t neg">Remove from ${esc(t.name)}</div></div></button>`}
    </div>`, {
      edit: () => { UI.closeSheet(); UI.go('edPlayer', { pid: i }); },
      cap: () => {
        E.ensureCopy(); const t2 = E.findTeam(cid, tid); t2.cap = pl.name;
        if (nat) { t2.caps = t2.caps || {}; t2.caps.TEST = i; t2.caps.ODI = i; t2.caps.T20I = i; }
        E.commit(true); UI.closeSheet(); UI.toast(`${pl.name} is captain.`); UI.refresh();
      },
      move: () => {
        UI.sheet(`<h3>Move ${esc(pl.name)} to</h3><div class="list">${others.map(o => `<button class="row" data-act="to" data-arg="${esc(o.id)}">${UI.badge(o, 'sm')}<span class="grow t">${esc(o.name)}</span><span class="small dim">${o.squad.length}</span></button>`).join('')}</div>`, {
          to: (oid) => { E.ensureCopy(); const a = E.findTeam(cid, tid), b = E.findTeam(cid, oid); a.squad = a.squad.filter(x => x !== i); if (a.cap === pl.name) a.cap = ''; if (!b.squad.includes(i)) b.squad.push(i); E.commit(true); UI.closeSheet(); UI.toast(`${pl.name} moved to ${b.name}.`); UI.refresh(); },
        });
      },
      rm: () => { E.ensureCopy(); const a = E.findTeam(cid, tid); a.squad = a.squad.filter(x => x !== i); if (a.cap === pl.name) a.cap = ''; E.commit(true); UI.closeSheet(); UI.toast(`${pl.name} removed.`); UI.refresh(); },
    });
  };
  E.addSheet = function (cid, tid) {
    const c = E.findComp(cid); const fmt = E.fmtOfComp(c);
    const inComp = new Set(); c.teams.forEach(t => t.squad.forEach(i => inComp.add(i)));
    let q = '';
    const draw = () => {
      const ql = q.toLowerCase();
      const ids = db().players.map((a, i) => i).filter(i => !inComp.has(i) && (!ql || db().players[i][0].toLowerCase().includes(ql)));
      ids.sort((a, b) => R.overall(E.obj(b), fmt) - R.overall(E.obj(a), fmt));
      return `<h3>Add to ${esc(E.findTeam(cid, tid).name)}</h3><div class="ctl"><input class="input" type="search" placeholder="Search by name" value="${esc(q)}" data-change="q"></div><p class="sec tiny dimmer" style="padding-top:0">Players not already in a ${esc(c.name)} squad, best first.</p><div class="list">${ids.slice(0, 40).map(i => E.row(i, fmt, { act: 'pick', os: DB.isOverseasFor(E.obj(i), c.home) })).join('') || '<div class="empty small">Nobody found.</div>'}</div>`;
    };
    const sh = UI.sheet(draw(), {
      q: (v) => { q = v.trim(); sh.innerHTML = '<div class="grab"></div>' + draw(); },
      pick: (i) => { E.ensureCopy(); const t = E.findTeam(cid, tid); i = +i; if (!t.squad.includes(i)) t.squad.push(i); E.commit(true); UI.closeSheet(); UI.toast(`${E.obj(i).name} added to ${t.name}.`); UI.refresh(); },
    });
  };
  E.teamSheet = function (cid, tid) {
    const t = E.findTeam(cid, tid);
    const pitches = [['F', 'Flat'], ['B', 'Bouncy'], ['G', 'Green'], ['D', 'Dry, turning'], ['P', 'Balanced'], ['S', 'Slow']];
    UI.sheet(`<h3>Team details</h3><form id="tform" onsubmit="return false">
      <div class="field"><label>Name</label><input class="input" name="name" value="${esc(t.name)}"></div>
      <div class="field"><label>Short name (up to 4 letters)</label><input class="input" name="short" maxlength="4" value="${esc(t.short)}"></div>
      <div class="field" style="display:flex;gap:12px"><div class="grow"><label>Main colour</label><input class="input" type="color" name="c1" value="${esc(t.c1)}"></div><div class="grow"><label>Trim colour</label><input class="input" type="color" name="c2" value="${esc(t.c2)}"></div></div>
      <div class="field"><label>Home ground</label><input class="input" name="venue" value="${esc(t.venue || '')}"></div>
      <div class="field"><label>Home pitch</label><select class="input" name="pitch">${pitches.map(([k, l]) => `<option value="${k}" ${t.pitch === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    </form><div class="btnrow"><button class="btn ghost" data-act="__closeSheet">Cancel</button><button class="btn" data-act="save">Save</button></div>`, {
      save: () => {
        const f = document.getElementById('tform'); const v = (n) => f.elements[n].value.trim();
        if (!v('name') || !v('short')) { UI.toast('Name and short name are needed.'); return; }
        E.ensureCopy(); const t2 = E.findTeam(cid, tid);
        t2.name = v('name'); t2.short = v('short').toUpperCase(); t2.c1 = v('c1'); t2.c2 = v('c2'); t2.venue = v('venue'); t2.pitch = v('pitch');
        E.commit(true); UI.closeSheet(); UI.toast('Team saved.'); UI.refresh();
      },
    });
  };

  // ---------------------------------------------------------- player
  E.newPlayer = function (cid, tid) {
    E.ensureCopy();
    const c = cid ? E.findComp(cid) : null; const t = c ? E.findTeam(cid, tid) : null;
    const cc = c ? (c.id === 'INTL' ? (t.id === 'SCOT' ? 'SCO' : t.id) : (c.home && c.home !== '-' ? c.home : 'IND')) : 'IND';
    UI.go('edPlayer', { pid: null, cid, tid, cc });
  };
  UI.register('edPlayer', {
    title: (p) => (p.pid == null ? 'New player' : db().players[p.pid][0]), cls: 'no-tabs',
    render(p) {
      const a = p.pid == null ? ['', p.cc || 'IND', 2000, 'R', '-', 'BAT', 55, 55, 0, 0, 60, '', 0] : db().players[p.pid];
      const f = DB.parseFlags(a[11]);
      const sl = (name, label, v) => `<div class="rbar"><span class="l">${label}</span><input type="range" min="0" max="99" name="${name}" value="${v}" oninput="this.nextElementSibling.textContent=this.value" style="flex:1"><span class="v">${v}</span></div>`;
      const ck = (name, label, on) => `<label class="row check"><span class="grow t">${label}</span><span class="toggle"><input type="checkbox" name="${name}" ${on ? 'checked' : ''}><span></span></span></label>`;
      const mem = p.pid == null ? [] : (E.memberships()[p.pid] || []);
      return `<form id="pform" onsubmit="return false">
        <div class="field"><label>Name</label><input class="input" name="name" value="${esc(a[0])}" autocomplete="off"></div>
        <div class="field" style="display:flex;gap:12px"><div class="grow"><label>Country</label><select class="input" name="cc">${Object.entries(DB.CC_NAMES).map(([k, n]) => `<option value="${k}" ${a[1] === k ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div><div style="width:110px"><label>Year of birth</label><input class="input" name="yob" type="number" min="1970" max="2015" value="${a[2]}"></div></div>
        <div class="field" style="display:flex;gap:12px"><div class="grow"><label>Role</label><select class="input" name="role">${[['BAT', 'Batter'], ['WK', 'Wicketkeeper'], ['AR', 'All-rounder'], ['BWL', 'Bowler']].map(([k, n]) => `<option value="${k}" ${a[5] === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div><div style="width:110px"><label>Bats</label><select class="input" name="hand"><option value="R" ${a[3] === 'R' ? 'selected' : ''}>Right</option><option value="L" ${a[3] === 'L' ? 'selected' : ''}>Left</option></select></div></div>
        <div class="field"><label>Bowling</label><select class="input" name="bowl">${BOWLS.map(k => `<option value="${k}" ${a[4] === k ? 'selected' : ''}>${esc(SK.BOWL_NAMES[k])}</option>`).join('')}</select></div>
        <div class="sec"><h2>Ratings</h2><p class="small dim">Out of 99. Test-class players sit around 70 to 85.</p></div>
        ${sl('bt', 'Technique', a[6])}${sl('bp', 'Power', a[7])}${sl('bw', 'Bowling', a[8])}${sl('be', 'Control', a[9])}${sl('fd', 'Fielding', a[10])}
        <div class="sec"><h2>Availability</h2></div><div class="list">
          ${ck('rT', 'Retired from Tests', f.ret.T)}${ck('rO', 'Retired from ODIs', f.ret.O)}${ck('rI', 'Retired from T20Is', f.ret.I)}${ck('rX', 'Retired from all international cricket', f.ret.X)}
          ${ck('wb', 'White-ball specialist', f.ret.WB)}${ck('rb', 'Red-ball specialist', f.ret.RB)}${ck('noipl', 'Not available for the IPL', f.ret.NOIPL)}${ck('out', 'Retired completely', f.ret.OUT)}
        </div>
        <div class="field"><label>Also counts as local in (country codes, comma separated)</label><input class="input" name="loc" value="${esc(f.loc.join(','))}" placeholder="For example ENG"></div>
      </form>
      ${mem.length ? `<div class="sec"><h2>Teams</h2></div><div class="list">${mem.map(m => `<div class="row">${UI.badge(m.t, 'sm')}<span class="grow t">${esc(m.t.name)}</span><span class="small dim">${esc(m.c.name)}</span></div>`).join('')}</div>` : ''}
      <div class="btnrow"><button class="btn" data-act="save">${p.pid == null ? 'Create player' : 'Save player'}</button></div>`;
    },
    actions: {
      save(a, el, p) {
        const f = document.getElementById('pform'); const v = (n) => f.elements[n].value; const on = (n) => f.elements[n].checked;
        const name = v('name').trim(); if (!name) { UI.toast('Enter a name.'); return; }
        const num = (n) => U.clamp(parseInt(v(n), 10) || 0, 0, 99);
        const yob = U.clamp(parseInt(v('yob'), 10) || 2000, 1970, 2015);
        const ret = { T: on('rT'), O: on('rO'), I: on('rI'), X: on('rX'), WB: on('wb'), RB: on('rb'), OUT: on('out'), NOIPL: on('noipl') };
        const loc = v('loc').split(',').map(s => s.trim().toUpperCase()).filter(s => /^[A-Z]{2,4}$/.test(s));
        const flags = DB.flagsString({ ret, loc });
        let bowl = v('bowl'); const role = v('role');
        const row = [name, v('cc'), yob, v('hand'), bowl, role, num('bt'), num('bp'), bowl === '-' ? 0 : num('bw'), bowl === '-' ? 0 : num('be'), num('fd'), flags, 0];
        E.ensureCopy(); const d = db();
        if (p.pid == null) {
          const create = () => {
            d.players.push(row); const i = d.players.length - 1;
            if (p.cid && p.cid !== 'INTL') { const t = E.findTeam(p.cid, p.tid); if (t && !t.squad.includes(i)) t.squad.push(i); }
            E.commit(true); UI.toast(`${name} created.`); UI.back();
          };
          if (d.players.some(x => x[0].toLowerCase() === name.toLowerCase())) UI.confirm({ title: 'This name already exists', body: 'Create a second player with the same name?' }, 'Create').then(ok => { if (ok) create(); });
          else create();
          return;
        }
        const old = d.players[p.pid][0];
        d.players[p.pid] = row;
        if (old !== name) for (const c of d.comps) for (const t of c.teams) if (t.cap === old) t.cap = name;
        E.commit(true); UI.toast(`${name} saved.`); UI.back();
      },
    },
  });

  // ---------------------------------------------------------- quick edit of a player inside a running career
  E.quickEdit = function (pl, done) {
    if (!pl) return;
    const sl = (k, label) => `<div class="rbar"><span class="l">${label}</span><input type="range" min="0" max="99" name="${k}" value="${Math.round(pl[k])}" oninput="this.nextElementSibling.textContent=this.value" style="flex:1"><span class="v">${Math.round(pl[k])}</span></div>`;
    const ck = (k, label) => `<label class="row check"><span class="grow t">${label}</span><span class="toggle"><input type="checkbox" name="${k}" ${pl.ret[k] ? 'checked' : ''}><span></span></span></label>`;
    UI.sheet(`<h3>Edit ${esc(pl.name)}</h3><p class="sec small dim" style="padding-top:0">Changes apply to this career only.</p><form id="qform" onsubmit="return false">
      <div class="field"><label>Role</label><select class="input" name="role">${[['BAT', 'Batter'], ['WK', 'Wicketkeeper'], ['AR', 'All-rounder'], ['BWL', 'Bowler']].map(([k, n]) => `<option value="${k}" ${pl.role === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      ${sl('bt', 'Technique')}${sl('bp', 'Power')}${pl.bowl !== '-' ? sl('bw', 'Bowling') + sl('be', 'Control') : ''}${sl('fd', 'Fielding')}
      <div class="list" style="margin-top:8px">${ck('T', 'Retired from Tests')}${ck('O', 'Retired from ODIs')}${ck('I', 'Retired from T20Is')}${ck('X', 'Retired from all internationals')}</div>
    </form><div class="btnrow"><button class="btn ghost" data-act="__closeSheet">Cancel</button><button class="btn" data-act="save">Save</button></div>`, {
      save: () => {
        const f = document.getElementById('qform');
        pl.role = f.elements.role.value;
        for (const k of ['bt', 'bp', 'bw', 'be', 'fd']) if (f.elements[k]) pl[k] = U.clamp(parseInt(f.elements[k].value, 10) || 0, 0, 99);
        for (const k of ['T', 'O', 'I', 'X']) { if (f.elements[k].checked) pl.ret[k] = 1; else delete pl.ret[k]; }
        UI.closeSheet(); UI.toast('Player updated.'); if (done) done();
      },
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
