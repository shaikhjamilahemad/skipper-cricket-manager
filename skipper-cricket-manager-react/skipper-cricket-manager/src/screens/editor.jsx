// Squad editor: change the built-in squads and ratings used by new games
import { useState } from 'react';
import { SK } from '../engine';
import { app } from '../app/app';
import { nav, ui } from '../app/core';
import { ROLE_NAME, ROLE_ORD, BOWL_SHORT, COMP_ORDER } from '../app/consts';
import Page, { IconBtn } from '../components/Page';
import Icon from '../components/Icon';
import { Badge, Empty } from '../components/bits';
import { confirm } from '../components/dialogs';
import { refresh } from '../components/hooks';

const { U, R, Store: S, DB } = SK;

const BOWLS = ['-', 'RF', 'RFM', 'RM', 'LF', 'LFM', 'LM', 'OB', 'LB', 'SLA', 'LWS'];
const ROLES = [['BAT', 'Batter'], ['WK', 'Wicketkeeper'], ['AR', 'All-rounder'], ['BWL', 'Bowler']];
const PITCHES = [['F', 'Flat'], ['B', 'Balanced'], ['G', 'Green'], ['D', 'Dry, turning'], ['P', 'Bouncy'], ['S', 'Slow']];
const db = () => window.SKIPPER_DB;

export const E = {};
// work on a private copy so "Restore original squads" can always undo
E.ensureCopy = function () {
  if (!window.SKIPPER_DB_BASE) { window.SKIPPER_DB_BASE = window.SKIPPER_DB; window.SKIPPER_DB = JSON.parse(JSON.stringify(window.SKIPPER_DB)); }
};
E.commit = function (quiet) {
  const d = db(); d.edited = Date.now();
  const ok = S.setCustomDB(d);
  app.resetBaseCache(); E._mem = null; E._objs = null;
  if (!ok) ui.toast('Could not save the squads. Storage may be full.', 3000);
  else if (!quiet) ui.toast('Saved. New games will use this.');
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
E.compOrder = () => COMP_ORDER.map(x => x[0]).map(id => db().comps.find(c => c.id === id)).filter(Boolean);
E.findComp = (id) => db().comps.find(c => c.id === id);
E.findTeam = (cid, tid) => { const c = E.findComp(cid); return c && c.teams.find(t => t.id === tid); };
E.natPlayers = (cc) => db().players.map((a, i) => i).filter(i => db().players[i][1] === cc);
E.validate = function (d) {
  if (!d || !Array.isArray(d.players) || !Array.isArray(d.comps)) return 'missing players or competitions.';
  if (d.players.length < 100) return 'too few players.';
  for (const a of d.players) if (!Array.isArray(a) || a.length < 11 || typeof a[0] !== 'string') return 'a player entry is damaged.';
  for (const id of ['INTL', 'IPL']) if (!d.comps.find(c => c.id === id)) return `the ${id} competition is missing.`;
  for (const c of d.comps) for (const t of c.teams || []) for (const i of t.squad || []) if (!(i >= 0 && i < d.players.length)) return `a squad in ${c.id} points to a missing player.`;
  return null;
};
E.newPlayer = function (cid, tid) {
  E.ensureCopy();
  const c = cid ? E.findComp(cid) : null; const t = c ? E.findTeam(cid, tid) : null;
  const cc = c ? (c.id === 'INTL' ? (t.id === 'SCOT' ? 'SCO' : t.id) : (c.home && c.home !== '-' ? c.home : 'IND')) : 'IND';
  nav.go('edPlayer', { pid: null, cid, tid, cc });
};

// ---------------------------------------------------------- small form pieces
function Slider({ label, value, onChange }) {
  return (
    <div className="rbar">
      <span className="l">{label}</span>
      <input type="range" min="0" max="99" value={value} onChange={(e) => onChange(+e.target.value)} style={{ flex: 1 }} />
      <span className="v">{value}</span>
    </div>
  );
}
function CheckRow({ label, checked, onChange }) {
  return (
    <label className="row check">
      <span className="grow t">{label}</span>
      <span className="toggle"><input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} /><span /></span>
    </label>
  );
}
function EdRow({ i, fmt, onClick, cap, os }) {
  const p = E.obj(i); const age = 2026 - p.yob;
  return (
    <button className="row" onClick={() => onClick(i)}>
      <div className="grow">
        <div className="t ellip">
          {p.name} {cap ? <><span className="pill gold">C</span>{' '}</> : null}{os ? <><span className="pill os">OS</span>{' '}</> : null}{p.ret.X ? <><span className="pill">No intl</span>{' '}</> : null}{p.retired ? <span className="pill inj">Retired</span> : null}
        </div>
        <div className="s">{ROLE_NAME[p.role]}{p.bowl !== '-' ? ', ' + BOWL_SHORT[p.bowl] : ''}, {age}, {p.cc}</div>
      </div>
      <span className="num b">{Math.round(R.overall(p, fmt))}</span>
    </button>
  );
}
function SearchBox({ initial, onSearch }) {
  return (
    <div className="ctl">
      <input className="input" type="search" enterKeyHint="search" placeholder="Find a player (press Enter)" defaultValue={initial || ''}
        onKeyDown={(e) => { if (e.key === 'Enter') { const v = e.currentTarget.value.trim(); if (v) onSearch(v); } }} />
    </div>
  );
}

// ---------------------------------------------------------- root
export function EditorScreen() {
  const d = db(); const custom = !!window.SKIPPER_DB_BASE;
  const exp = () => S.exportText(`skipper-squads-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(db())).then(ok => ui.toast(ok ? 'Squads exported.' : 'Export cancelled.'));
  const imp = () => S.importText().then(txt => {
    if (!txt) return;
    let data; try { data = JSON.parse(txt); } catch (e) { ui.toast('That file is not a squads file.'); return; }
    const err = E.validate(data); if (err) { ui.toast('That file cannot be used: ' + err, 3500); return; }
    if (!window.SKIPPER_DB_BASE) window.SKIPPER_DB_BASE = window.SKIPPER_DB;
    window.SKIPPER_DB = data; E.commit(true); ui.toast(`Imported ${data.players.length} players.`); refresh();
  });
  const reset = () => confirm({ title: 'Restore original squads?', body: 'All your edits will be removed. Games already started are not changed.' }, 'Restore', 'Cancel', true).then(ok => {
    if (!ok) return;
    S.clearCustomDB(); if (window.SKIPPER_DB_BASE) { window.SKIPPER_DB = window.SKIPPER_DB_BASE; window.SKIPPER_DB_BASE = null; }
    app.resetBaseCache(); E._mem = null; E._objs = null; ui.toast('Original squads restored.'); refresh();
  });
  return (
    <Page title="Squad editor">
      <p className="sec small dim">Fix squads, transfers and ratings. Changes are used by new careers, tournaments and quick matches. Games you have already started keep their own squads. {custom ? <span className="hi">You are using edited squads.</span> : `Built-in squads are as of ${d.version}.`}</p>
      <SearchBox onSearch={(q) => nav.go('edFind', { q })} />
      <div className="sec"><h2>Competitions</h2></div>
      <div className="list">
        {E.compOrder().map(c => (
          <button className="row" key={c.id} onClick={() => nav.go('edComp', { comp: c.id })}>
            <div className="grow"><div className="t">{c.name}</div><div className="s">{c.teams.length} teams</div></div>
            <span className="chev"><Icon name="chev" /></span>
          </button>
        ))}
      </div>
      <div className="sec"><h2>Players</h2></div>
      <div className="list"><button className="row" onClick={() => E.newPlayer(null, null)}><div className="grow"><div className="t">Add a new player</div><div className="s">{d.players.length} players in the database</div></div></button></div>
      <div className="sec"><h2>Share and back up</h2></div>
      <div className="list">
        <button className="row" onClick={exp}><div className="grow"><div className="t">Export squads to a file</div><div className="s">A JSON file you can keep or share</div></div></button>
        <button className="row" onClick={imp}><div className="grow"><div className="t">Import squads from a file</div><div className="s">Replaces the squads used for new games</div></div></button>
        {custom && <button className="row" onClick={reset}><div className="grow"><div className="t neg">Restore original squads</div></div></button>}
      </div>
    </Page>
  );
}

export function EdFindScreen({ params }) {
  const q = params.q.toLowerCase(); const d = db();
  const hits = d.players.map((a, i) => i).filter(i => d.players[i][0].toLowerCase().includes(q)).slice(0, 60);
  return (
    <Page title="Find a player">
      <SearchBox initial={params.q} onSearch={(v) => nav.go('edFind', { q: v }, { replace: true })} />
      <div className="list">
        {hits.map(i => <EdRow key={i} i={i} fmt="T20" onClick={(x) => nav.go('edPlayer', { pid: +x })} />)}
        {!hits.length && <div className="empty">No players match.</div>}
      </div>
    </Page>
  );
}

// ---------------------------------------------------------- competition and team
export function EdCompScreen({ params }) {
  const c = E.findComp(params.comp);
  return (
    <Page title={c.name}>
      <div className="list">
        {c.teams.map(t => (
          <button className="row" key={t.id} onClick={() => nav.go('edTeam', { comp: params.comp, team: t.id })}>
            <Badge team={t} />
            <div className="grow"><div className="t">{t.name}</div><div className="s">{c.id === 'INTL' ? E.natPlayers(t.id === 'SCOT' ? 'SCO' : t.id).length + ' players from this country' : t.squad.length + ' players'}</div></div>
            <span className="chev"><Icon name="chev" /></span>
          </button>
        ))}
      </div>
    </Page>
  );
}

export function EdTeamScreen({ params }) {
  const c = E.findComp(params.comp); const t = E.findTeam(params.comp, params.team); const fmt = E.fmtOfComp(c);
  const nat = c.id === 'INTL';
  const ids = nat ? E.natPlayers(t.id === 'SCOT' ? 'SCO' : t.id) : t.squad.slice();
  ids.sort((a, b) => (ROLE_ORD[E.obj(a).role] - ROLE_ORD[E.obj(b).role]) || (R.overall(E.obj(b), fmt) - R.overall(E.obj(a), fmt)));
  const capName = t.cap;
  return (
    <Page title={t.name} sub={c.name} right={<IconBtn icon="edit" label="Edit team details" onClick={() => ui.openSheet(<TeamSheet cid={params.comp} tid={params.team} />)} />}>
      {nat ? (
        <p className="sec small dim">Everyone with {DB.CC_NAMES[t.id === 'SCOT' ? 'SCO' : t.id] || t.id} as their country can be picked. Change a player's country to move him. Captain: {capName || 'not set'}.</p>
      ) : (
        <>
          <p className="sec small dim">{ids.length} players (max {c.squadMax}), {ids.filter(i => DB.isOverseasFor(E.obj(i), c.home)).length} overseas (max {c.osSquad}). Captain: {capName || 'not set'}.</p>
          <div className="btnrow" style={{ paddingTop: 0 }}>
            <button className="btn ghost sm" onClick={() => ui.openSheet(<AddSheet cid={params.comp} tid={params.team} />)}>Add a player</button>
            <button className="btn ghost sm" onClick={() => E.newPlayer(params.comp, params.team)}>Create new player</button>
          </div>
        </>
      )}
      <div className="list">
        {ids.map(i => <EdRow key={i} i={i} fmt={fmt} cap={E.obj(i).name === capName} os={!nat && DB.isOverseasFor(E.obj(i), c.home)} onClick={(x) => ui.openSheet(<MemberSheet i={+x} cid={params.comp} tid={params.team} />)} />)}
        {!ids.length && <Empty small>No players.</Empty>}
      </div>
      {nat && <div className="btnrow"><button className="btn ghost sm" onClick={() => E.newPlayer(params.comp, params.team)}>Create new player</button></div>}
    </Page>
  );
}

function MoveSheet({ i, cid, tid }) {
  const c = E.findComp(cid); const pl = E.obj(i);
  const others = c.teams.filter(x => x.id !== tid);
  return (
    <>
      <h3>Move {pl.name} to</h3>
      <div className="list">
        {others.map(o => (
          <button className="row" key={o.id} onClick={() => {
            E.ensureCopy(); const a = E.findTeam(cid, tid), b = E.findTeam(cid, o.id);
            a.squad = a.squad.filter(x => x !== i); if (a.cap === pl.name) a.cap = ''; if (!b.squad.includes(i)) b.squad.push(i);
            E.commit(true); ui.closeSheet(); ui.toast(`${pl.name} moved to ${b.name}.`); refresh();
          }}>
            <Badge team={o} size="sm" /><span className="grow t">{o.name}</span><span className="small dim">{o.squad.length}</span>
          </button>
        ))}
      </div>
    </>
  );
}
function MemberSheet({ i, cid, tid }) {
  const c = E.findComp(cid); const t = E.findTeam(cid, tid); const pl = E.obj(i); const nat = c.id === 'INTL';
  return (
    <>
      <h3>{pl.name}</h3>
      <div className="list">
        <button className="row" onClick={() => { ui.closeSheet(); nav.go('edPlayer', { pid: i }); }}><div className="grow"><div className="t">Edit player</div><div className="s">Name, country, role and ratings</div></div></button>
        <button className="row" onClick={() => {
          E.ensureCopy(); const t2 = E.findTeam(cid, tid); t2.cap = pl.name;
          if (nat) { t2.caps = t2.caps || {}; t2.caps.TEST = i; t2.caps.ODI = i; t2.caps.T20I = i; }
          E.commit(true); ui.closeSheet(); ui.toast(`${pl.name} is captain.`); refresh();
        }}><div className="grow"><div className="t">Make captain</div></div></button>
        {!nat && (
          <>
            <button className="row" onClick={() => ui.openSheet(<MoveSheet i={i} cid={cid} tid={tid} />)}><div className="grow"><div className="t">Move to another {c.name} team</div></div></button>
            <button className="row" onClick={() => {
              E.ensureCopy(); const a = E.findTeam(cid, tid); a.squad = a.squad.filter(x => x !== i); if (a.cap === pl.name) a.cap = '';
              E.commit(true); ui.closeSheet(); ui.toast(`${pl.name} removed.`); refresh();
            }}><div className="grow"><div className="t neg">Remove from {t.name}</div></div></button>
          </>
        )}
      </div>
    </>
  );
}
function AddSheet({ cid, tid }) {
  const c = E.findComp(cid); const fmt = E.fmtOfComp(c);
  const [q, setQ] = useState('');
  const inComp = new Set(); c.teams.forEach(t => t.squad.forEach(i => inComp.add(i)));
  const ql = q.trim().toLowerCase();
  const ids = db().players.map((a, i) => i).filter(i => !inComp.has(i) && (!ql || db().players[i][0].toLowerCase().includes(ql)));
  ids.sort((a, b) => R.overall(E.obj(b), fmt) - R.overall(E.obj(a), fmt));
  return (
    <>
      <h3>Add to {E.findTeam(cid, tid).name}</h3>
      <div className="ctl"><input className="input" type="search" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <p className="sec tiny dimmer" style={{ paddingTop: 0 }}>Players not already in a {c.name} squad, best first.</p>
      <div className="list">
        {ids.slice(0, 40).map(i => (
          <EdRow key={i} i={i} fmt={fmt} os={DB.isOverseasFor(E.obj(i), c.home)} onClick={() => {
            E.ensureCopy(); const t = E.findTeam(cid, tid); if (!t.squad.includes(i)) t.squad.push(i);
            E.commit(true); ui.closeSheet(); ui.toast(`${E.obj(i).name} added to ${t.name}.`); refresh();
          }} />
        ))}
        {!ids.length && <Empty small>Nobody found.</Empty>}
      </div>
    </>
  );
}
function TeamSheet({ cid, tid }) {
  const t = E.findTeam(cid, tid);
  const [f, setF] = useState({ name: t.name, short: t.short, c1: t.c1, c2: t.c2, venue: t.venue || '', pitch: t.pitch });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = () => {
    const name = f.name.trim(), short = f.short.trim();
    if (!name || !short) { ui.toast('Name and short name are needed.'); return; }
    E.ensureCopy(); const t2 = E.findTeam(cid, tid);
    t2.name = name; t2.short = short.toUpperCase(); t2.c1 = f.c1; t2.c2 = f.c2; t2.venue = f.venue.trim(); t2.pitch = f.pitch;
    E.commit(true); ui.closeSheet(); ui.toast('Team saved.'); refresh();
  };
  return (
    <>
      <h3>Team details</h3>
      <div className="field"><label>Name</label><input className="input" value={f.name} onChange={set('name')} /></div>
      <div className="field"><label>Short name (up to 4 letters)</label><input className="input" maxLength={4} value={f.short} onChange={set('short')} /></div>
      <div className="field" style={{ display: 'flex', gap: 12 }}>
        <div className="grow"><label>Main colour</label><input className="input" type="color" value={f.c1} onChange={set('c1')} /></div>
        <div className="grow"><label>Trim colour</label><input className="input" type="color" value={f.c2} onChange={set('c2')} /></div>
      </div>
      <div className="field"><label>Home ground</label><input className="input" value={f.venue} onChange={set('venue')} /></div>
      <div className="field"><label>Home pitch</label><select className="input" value={f.pitch} onChange={set('pitch')}>{PITCHES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
      <div className="btnrow"><button className="btn ghost" onClick={() => ui.closeSheet()}>Cancel</button><button className="btn" onClick={save}>Save</button></div>
    </>
  );
}

// ---------------------------------------------------------- player
export function EdPlayerScreen({ params }) {
  const p = params;
  const a = p.pid == null ? ['', p.cc || 'IND', 2000, 'R', '-', 'BAT', 55, 55, 0, 0, 60, '', 0] : db().players[p.pid];
  const fl = DB.parseFlags(a[11]);
  const [f, setF] = useState({
    name: a[0], cc: a[1], yob: a[2], hand: a[3], bowl: a[4], role: a[5], bt: a[6], bp: a[7], bw: a[8], be: a[9], fd: a[10],
    rT: !!fl.ret.T, rO: !!fl.ret.O, rI: !!fl.ret.I, rX: !!fl.ret.X, wb: !!fl.ret.WB, rb: !!fl.ret.RB, noipl: !!fl.ret.NOIPL, out: !!fl.ret.OUT, loc: fl.loc.join(','),
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const num = (k) => (v) => setF({ ...f, [k]: v });
  const chk = (k) => (v) => setF({ ...f, [k]: v });
  const mem = p.pid == null ? [] : (E.memberships()[p.pid] || []);

  const save = () => {
    const name = f.name.trim(); if (!name) { ui.toast('Enter a name.'); return; }
    const n = (v) => U.clamp(parseInt(v, 10) || 0, 0, 99);
    const yob = U.clamp(parseInt(f.yob, 10) || 2000, 1970, 2015);
    const ret = { T: f.rT, O: f.rO, I: f.rI, X: f.rX, WB: f.wb, RB: f.rb, OUT: f.out, NOIPL: f.noipl };
    const loc = f.loc.split(',').map(s => s.trim().toUpperCase()).filter(s => /^[A-Z]{2,4}$/.test(s));
    const flags = DB.flagsString({ ret, loc });
    const bowl = f.bowl;
    const row = [name, f.cc, yob, f.hand, bowl, f.role, n(f.bt), n(f.bp), bowl === '-' ? 0 : n(f.bw), bowl === '-' ? 0 : n(f.be), n(f.fd), flags, 0];
    E.ensureCopy(); const d = db();
    if (p.pid == null) {
      const create = () => {
        d.players.push(row); const i = d.players.length - 1;
        if (p.cid && p.cid !== 'INTL') { const t = E.findTeam(p.cid, p.tid); if (t && !t.squad.includes(i)) t.squad.push(i); }
        E.commit(true); ui.toast(`${name} created.`); nav.back();
      };
      if (d.players.some(x => x[0].toLowerCase() === name.toLowerCase())) confirm({ title: 'This name already exists', body: 'Create a second player with the same name?' }, 'Create').then(ok => { if (ok) create(); });
      else create();
      return;
    }
    const old = d.players[p.pid][0];
    d.players[p.pid] = row;
    if (old !== name) for (const c of d.comps) for (const t of c.teams) if (t.cap === old) t.cap = name;
    E.commit(true); ui.toast(`${name} saved.`); nav.back();
  };
  return (
    <Page title={p.pid == null ? 'New player' : db().players[p.pid][0]}>
      <div className="field"><label>Name</label><input className="input" value={f.name} autoComplete="off" onChange={set('name')} /></div>
      <div className="field" style={{ display: 'flex', gap: 12 }}>
        <div className="grow"><label>Country</label><select className="input" value={f.cc} onChange={set('cc')}>{Object.entries(DB.CC_NAMES).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></div>
        <div style={{ width: 110 }}><label>Year of birth</label><input className="input" type="number" min="1970" max="2015" value={f.yob} onChange={set('yob')} /></div>
      </div>
      <div className="field" style={{ display: 'flex', gap: 12 }}>
        <div className="grow"><label>Role</label><select className="input" value={f.role} onChange={set('role')}>{ROLES.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></div>
        <div style={{ width: 110 }}><label>Bats</label><select className="input" value={f.hand} onChange={set('hand')}><option value="R">Right</option><option value="L">Left</option></select></div>
      </div>
      <div className="field"><label>Bowling</label><select className="input" value={f.bowl} onChange={set('bowl')}>{BOWLS.map(k => <option key={k} value={k}>{SK.BOWL_NAMES[k]}</option>)}</select></div>
      <div className="sec"><h2>Ratings</h2><p className="small dim">Out of 99. Test-class players sit around 70 to 85.</p></div>
      <Slider label="Technique" value={f.bt} onChange={num('bt')} />
      <Slider label="Power" value={f.bp} onChange={num('bp')} />
      <Slider label="Bowling" value={f.bw} onChange={num('bw')} />
      <Slider label="Control" value={f.be} onChange={num('be')} />
      <Slider label="Fielding" value={f.fd} onChange={num('fd')} />
      <div className="sec"><h2>Availability</h2></div>
      <div className="list">
        <CheckRow label="Retired from Tests" checked={f.rT} onChange={chk('rT')} />
        <CheckRow label="Retired from ODIs" checked={f.rO} onChange={chk('rO')} />
        <CheckRow label="Retired from T20Is" checked={f.rI} onChange={chk('rI')} />
        <CheckRow label="Retired from all international cricket" checked={f.rX} onChange={chk('rX')} />
        <CheckRow label="White-ball specialist" checked={f.wb} onChange={chk('wb')} />
        <CheckRow label="Red-ball specialist" checked={f.rb} onChange={chk('rb')} />
        <CheckRow label="Not available for the IPL" checked={f.noipl} onChange={chk('noipl')} />
        <CheckRow label="Retired completely" checked={f.out} onChange={chk('out')} />
      </div>
      <div className="field"><label>Also counts as local in (country codes, comma separated)</label><input className="input" value={f.loc} placeholder="For example ENG" onChange={set('loc')} /></div>
      {mem.length > 0 && (
        <>
          <div className="sec"><h2>Teams</h2></div>
          <div className="list">{mem.map((m, i) => <div className="row" key={i}><Badge team={m.t} size="sm" /><span className="grow t">{m.t.name}</span><span className="small dim">{m.c.name}</span></div>)}</div>
        </>
      )}
      <div className="btnrow"><button className="btn" onClick={save}>{p.pid == null ? 'Create player' : 'Save player'}</button></div>
    </Page>
  );
}

// ---------------------------------------------------------- quick edit of a player inside a running career
function QuickEditSheet({ pl, done }) {
  const [f, setF] = useState({ role: pl.role, bt: Math.round(pl.bt), bp: Math.round(pl.bp), bw: Math.round(pl.bw), be: Math.round(pl.be), fd: Math.round(pl.fd), T: !!pl.ret.T, O: !!pl.ret.O, I: !!pl.ret.I, X: !!pl.ret.X });
  const num = (k) => (v) => setF({ ...f, [k]: v });
  const chk = (k) => (v) => setF({ ...f, [k]: v });
  const save = () => {
    pl.role = f.role;
    for (const k of ['bt', 'bp', 'bw', 'be', 'fd']) if (k === 'bw' || k === 'be' ? pl.bowl !== '-' : true) pl[k] = U.clamp(parseInt(f[k], 10) || 0, 0, 99);
    for (const k of ['T', 'O', 'I', 'X']) { if (f[k]) pl.ret[k] = 1; else delete pl.ret[k]; }
    ui.closeSheet(); ui.toast('Player updated.'); if (done) done();
  };
  return (
    <>
      <h3>Edit {pl.name}</h3>
      <p className="sec small dim" style={{ paddingTop: 0 }}>Changes apply to this career only.</p>
      <div className="field"><label>Role</label><select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{ROLES.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></div>
      <Slider label="Technique" value={f.bt} onChange={num('bt')} />
      <Slider label="Power" value={f.bp} onChange={num('bp')} />
      {pl.bowl !== '-' && <><Slider label="Bowling" value={f.bw} onChange={num('bw')} /><Slider label="Control" value={f.be} onChange={num('be')} /></>}
      <Slider label="Fielding" value={f.fd} onChange={num('fd')} />
      <div className="list" style={{ marginTop: 8 }}>
        <CheckRow label="Retired from Tests" checked={f.T} onChange={chk('T')} />
        <CheckRow label="Retired from ODIs" checked={f.O} onChange={chk('O')} />
        <CheckRow label="Retired from T20Is" checked={f.I} onChange={chk('I')} />
        <CheckRow label="Retired from all internationals" checked={f.X} onChange={chk('X')} />
      </div>
      <div className="btnrow"><button className="btn ghost" onClick={() => ui.closeSheet()}>Cancel</button><button className="btn" onClick={save}>Save</button></div>
    </>
  );
}
export const openQuickEdit = (pl, done) => { if (pl) ui.openSheet(<QuickEditSheet pl={pl} done={done} />); };
