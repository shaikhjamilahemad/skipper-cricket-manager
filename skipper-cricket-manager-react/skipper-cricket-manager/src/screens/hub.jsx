// Career hub: home, squad, player profile, fixtures, tables, world, more, inbox, news, career, reports
import { Fragment } from 'react';
import { SK } from '../engine';
import { app } from '../app/app';
import { nav, ui } from '../app/core';
import { ROLE_NAME, ROLE_ORD, BOWL_SHORT, STAGE_NAME } from '../app/consts';
import * as H from '../app/helpers';
import Page, { IconBtn } from '../components/Page';
import Icon from '../components/Icon';
import { Badge, Stars, RBar, Seg, FormArrow, Empty } from '../components/bits';
import { confirm } from '../components/dialogs';
import { useSt, refresh } from '../components/hooks';
import { openQuickEdit } from './editor';

const { U, R, World: W, Career: C } = SK;

const goPlayer = (pid) => nav.go('player', { pid: +pid });
const saveNow = () => { app.save(app.slot === 'auto' ? 'slot1' : app.slot); app.save('auto', true); };

// ---------------------------------------------------------- shared pieces
export function MailRow({ m }) {
  return (
    <button className="msg" style={{ width: '100%', background: 'none', borderLeft: 0, borderRight: 0, borderTop: 0, textAlign: 'left', color: 'inherit' }} onClick={() => openMail(m.id)}>
      <span className={`dot ${m.read ? 'read' : ''}`} />
      <div className="grow"><div className="b small">{m.title}</div><div className="when">{U.fmtDate(m.date)}</div></div>
    </button>
  );
}
function MailSheet({ m }) {
  const w = app.world;
  return (
    <>
      <h3>{m.title}</h3>
      <p className="sec dim" style={{ paddingTop: 0 }}>{m.body}</p>
      <p className="sec tiny dimmer">{U.fmtDate(m.date)}</p>
      {m.pid != null && <div className="btnrow"><button className="btn ghost" onClick={() => { ui.closeSheet(); goPlayer(m.pid); }}>View {w.players[m.pid].name}</button></div>}
    </>
  );
}
function openMail(id) {
  const w = app.world; const m = w.inbox.find(x => x.id === id); if (!m) return;
  m.read = true;
  ui.openSheet(<MailSheet m={m} />);
  refresh();
}

function acceptOffer(k) {
  const w = app.world; const t = w.teams[k];
  confirm({ title: `Take the ${t.name} job?`, body: w.user.team ? `You will leave ${w.teams[w.user.team].name}.` : '' }, 'Accept').then(ok => {
    if (ok) { C.acceptOffer(w, k); w.user.alert = null; app.autosave(); nav.go('home', {}, { reset: true }); }
  });
}
function declineOffer(k) { const w = app.world; w.user.offers = w.user.offers.filter(o => o.team !== k); refresh(); }

export function Offers() {
  const w = app.world; const offers = (w.user.offers || []).filter(o => o.expires > w.date);
  if (!offers.length) return <p className="sec small dim">No job offers right now.</p>;
  return (
    <>
      <div className="sec"><h2>Job offers</h2></div>
      <div className="list">
        {offers.map(o => {
          const t = w.teams[o.team];
          return (
            <div className="row" key={o.team}>
              <Badge team={t} />
              <div className="grow"><div className="t">{t.name}</div><div className="s">{W.COMP_LABEL[t.comp]}, expires {U.fmtDate(o.expires, false)}</div></div>
              <button className="btn sm" onClick={() => acceptOffer(o.team)}>Accept</button>
              <IconBtn icon="close" label="Decline" onClick={() => declineOffer(o.team)} />
            </div>
          );
        })}
      </div>
    </>
  );
}

// the small table (or series score) shown on home and after a match
export function Snippet({ ed }) {
  const w = app.world; const key = w.user.team;
  const toTable = () => nav.go('tables', { ed: ed.id });
  if (ed.type === 'series') {
    const opp = ed.teams.find(k => k !== key);
    return (
      <>
        <div className="sec hrow"><h2>{ed.name}</h2><button className="linkbtn" onClick={toTable}>Details</button></div>
        <div className="list">
          {ed.legs.map((l, i) => (
            <div className="row" key={i}>
              <span className="grow t">{l.fmt === 'TEST' ? 'Tests' : l.fmt === 'ODI' ? 'ODIs' : 'T20Is'}</span>
              <span className="num">{l.score[key]}-{l.score[opp]}{l.score.d ? ` (${l.score.d} drawn)` : ''}</span>
            </div>
          ))}
        </div>
      </>
    );
  }
  let prefix = '';
  const rows = ed.type === 'icc' ? (() => {
    const sg = ed.super && ed.super.find(x => x.teams.includes(key));
    if (sg) { prefix = 'S:'; return W.sortTable(ed, sg.teams.map(k => 'S:' + k)).map(k => k.slice(2)); }
    const g = ed.groups.find(x => x.teams.includes(key)); return g ? W.sortTable(ed, g.teams) : [];
  })() : W.sortTable(ed);
  if (!rows.length) return null;
  const T = {}; for (const k of rows) T[k] = ed.table[prefix + k];
  const idx = rows.indexOf(key);
  const show = rows.slice(0, 4); if (idx >= 4) show.push(key);
  return (
    <>
      <div className="sec hrow"><h2>{ed.name}</h2><button className="linkbtn" onClick={toTable}>Full table</button></div>
      <div className="tblwrap">
        <table className="tbl">
          <thead><tr><th className="l">Team</th><th>P</th><th>W</th><th>L</th><th>Pts</th></tr></thead>
          <tbody>
            {show.map(k => (
              <tr key={k} className={k === key ? 'me' : ''}>
                <td className="l">{rows.indexOf(k) + 1}. {w.teams[k].name}</td><td>{T[k].p}</td><td>{T[k].w}</td><td>{T[k].l}</td><td className="b">{T[k].pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ---------------------------------------------------------- home
export function HomeScreen() {
  const w = app.world; const u = w.user; const t = H.userTeam();
  const dock = <button className="btn" onClick={() => app.continue()}>Continue</button>;
  const right = <IconBtn icon="save" label="Save game" onClick={saveNow} />;
  const head = { title: t ? t.name : 'Out of work', sub: `${U.fmtDate(w.date)}, ${u.name}`, tabs: 'home', dock, right };
  if (!t) {
    return (
      <Page {...head}>
        <div className="banner"><div className="big">You are between jobs</div><p className="dim">Keep the calendar moving and offers will arrive. Your reputation is {Math.round(u.rep)}/100.</p></div>
        <Offers />
      </Page>
    );
  }
  const next = W.peekNext(w);
  const stop = W.peekNextStop(w);
  let what = '';
  if (stop && stop.type !== 'match') {
    what = stop.type === 'retention' ? `${w.comps[stop.ev.comp].name} retentions` : stop.type === 'auction' ? `${w.comps[stop.ev.comp].name} auction` : stop.type === 'squad' ? `Pick your squad for ${stop.ed.name}` : '';
  }
  const ed = H.currentEdition(); const ob = ed && u.objectives[ed.id];
  const cf = Math.round(u.conf); const cc = cf >= 60 ? 'var(--runs)' : cf >= 35 ? 'var(--straw)' : 'var(--red)';
  const mails = w.inbox.slice(0, 4);
  let nextCard;
  if (next) {
    const opp = w.teams[H.oppOf(next, t.key)]; const home = next.home === t.key;
    nextCard = (
      <div className="nextcard">
        <div className="when">Next match: {U.fmtDate(next.date)}{next.date === w.date ? ' (today)' : ''}</div>
        <div className="teams"><Badge team={t} /><span className="x">v {opp.name}</span><Badge team={opp} /></div>
        <div className="small dim">{W.fixtureTitle(w, next)}</div>
        <div className="small dim">{next.venue.name}{next.neutral ? '' : home ? ' (home)' : ' (away)'}, {SK.FORMATS[W.engineFmt(next.comp === 'ICC' ? 'INTL' : next.comp, next.fmt)].label}</div>
      </div>
    );
  } else {
    nextCard = <div className="nextcard"><div className="when">No matches scheduled yet</div><p className="small dim" style={{ margin: '6px 0 0' }}>Continue and the calendar will move to your next event.</p></div>;
  }
  return (
    <Page {...head}>
      {nextCard}
      {what && <p className="sec small" style={{ paddingTop: 0 }}><span className="hi">{next && stop.date <= next.date ? 'Before that' : 'Coming up'}:</span> {what}, {U.fmtDate(stop.date)}</p>}
      <div className="sec">
        <h2>The board</h2>
        {ob && <p className="small dim">Target for {ob.name}: <b className="hi">{C.TARGETS[ob.target]}</b>{ob.done ? `, result: ${ob.finish || ''}` : ''}</p>}
        <div className="conf"><span className="small dim">Confidence</span><span className="track"><span className="fill" style={{ width: cf + '%', background: cc }} /></span><span className="b">{cf}</span></div>
      </div>
      {u.offers && u.offers.filter(o => o.expires > w.date).length > 0 && <Offers />}
      {ed && <Snippet ed={ed} />}
      <div className="sec hrow"><h2>Inbox</h2><button className="linkbtn" onClick={() => nav.go('inbox')}>All messages</button></div>
      <div className="list">{mails.map(m => <MailRow key={m.id} m={m} />)}{!mails.length && <Empty small>No messages.</Empty>}</div>
      <div className="sec hrow"><h2>Around the world</h2><button className="linkbtn" onClick={() => nav.go('news')}>All news</button></div>
      <div className="list">{w.news.slice(0, 5).map((n, i) => <NewsItem key={i} n={n} />)}</div>
    </Page>
  );
}
const NewsItem = ({ n }) => <div className="msg"><div className="grow"><div className="small">{n.text}</div><div className="when">{U.fmtDate(n.date)}</div></div></div>;

// ---------------------------------------------------------- squad
export function PlayerRow({ x, efmt, os, cap, inSquad }) {
  const w = app.world; const age = w ? W.age(w, x) : 2026 - x.yob;
  const duty = w && W.onDuty(x, w.date);
  const b = Math.round(R.bat(x, efmt)), bw = x.bowl === '-' ? null : Math.round(R.bowl(x, efmt));
  return (
    <button className="row" onClick={() => goPlayer(x.id)}>
      <div className="grow">
        <div className="t ellip">
          {x.name}{' '}
          {cap && <><span className="pill gold">C</span>{' '}</>}
          {os && <><span className="pill os">OS</span>{' '}</>}
          {inSquad && <><span className="pill gold">In squad</span>{' '}</>}
          {x.injury > 0 && <><span className="pill inj">Injured</span>{' '}</>}
          {duty && <span className="pill duty">Intl duty</span>}
        </div>
        <div className="s">{ROLE_NAME[x.role]}{x.bowl !== '-' ? ', ' + BOWL_SHORT[x.bowl] : ''}, {age}, {x.cc} <FormArrow f={x.form} quiet /></div>
      </div>
      <div className="num small"><div>Bat <b>{b}</b></div>{bw != null && <div className="dim">Bowl <b>{bw}</b></div>}</div>
    </button>
  );
}

export function SquadScreen() {
  const w = app.world; const t = H.userTeam();
  const st = useSt({ sort: 'role' });
  if (!t) return <Page title="Squad" tabs="squad"><div className="empty">You need a job to have a squad.</div></Page>;
  const nat = t.comp === 'INTL';
  if (!st.fmt) st.fmt = nat ? 'ODI' : H.fmtForTeam(t);
  const comp = w.comps[t.comp];
  let players = nat ? W.nationalPool(w, t) : t.squad.map(id => w.players[id]).filter(x => !x.retired);
  const efmt = st.fmt === 'T20' && nat ? 'T20I' : st.fmt;
  if (nat) players = players.filter(x => SK.Sel.available(x, efmt) || x.injury > 0).sort(U.by(x => R.overall(x, efmt), true)).slice(0, 60);
  const sorters = {
    role: (a, b) => (ROLE_ORD[a.role] - ROLE_ORD[b.role]) || (R.overall(b, efmt) - R.overall(a, efmt)),
    bat: U.by(x => R.bat(x, efmt), true), bowl: U.by(x => R.bowl(x, efmt), true), age: U.by(x => x.yob, true), form: U.by(x => x.form || 0, true),
  };
  players = players.slice().sort(sorters[st.sort] || sorters.role);
  let intro; let squadIds = new Set();
  if (!nat) {
    const os = players.filter(x => SK.DB.isOverseasFor(x, comp.home)).length;
    const purse = W.LEAGUES.includes(t.comp) ? `, purse ${U.money(t.purse, comp.cur)}` : '';
    intro = `${players.length} players (max ${comp.squadMax}), ${os} overseas (max ${comp.osSquad} in squad, ${comp.osXI} in XI)${purse}`;
  } else {
    const ed = H.userEditions().find(e => e.type === 'series' && e.status !== 'done' && e.squads && e.squads[t.key]);
    intro = `Best ${players.length} eligible players for ${efmt === 'TEST' ? 'Tests' : efmt === 'ODI' ? 'ODIs' : 'T20Is'}.${ed ? ' Players in your current squad are marked.' : ''}`;
    squadIds = ed ? new Set(Object.values(ed.squads[t.key]).flat()) : new Set();
  }
  return (
    <Page title={nat ? 'Player pool' : 'Squad'} sub={t.name} tabs="squad">
      <p className="sec small dim">{intro}</p>
      {nat && <div className="ctl"><Seg options={[['TEST', 'Test'], ['ODI', 'ODI'], ['T20', 'T20I']]} value={st.fmt} onChange={(v) => { st.fmt = v; refresh(); }} /></div>}
      <div className="ctl"><Seg options={[['role', 'Role'], ['bat', 'Batting'], ['bowl', 'Bowling'], ['age', 'Age'], ['form', 'Form']]} value={st.sort} onChange={(v) => { st.sort = v; refresh(); }} /></div>
      <div className="list">
        {players.map(x => <PlayerRow key={x.id} x={x} efmt={efmt} os={!nat && SK.DB.isOverseasFor(x, comp.home)} cap={t.cap === x.id} inSquad={nat && squadIds.has(x.id)} />)}
      </div>
      {(t.comp === 'CC1' || t.comp === 'CC2' || t.comp === 'SHF') && <div className="btnrow"><button className="btn ghost" onClick={() => nav.go('signings')}>Sign a free agent</button></div>}
    </Page>
  );
}

// ---------------------------------------------------------- player profile
export function PlayerScreen({ params }) {
  const w = app.world; const x = H.playerById(params.pid);
  if (!x) return <Page title="Player"><div className="empty">Player not found.</div></Page>;
  const age = H.ageOf(x);
  const tags = [];
  if (x.retired) tags.push(`Retired in ${x.retired}`);
  if (x.ret.X && !x.retired) tags.push('Retired from international cricket');
  else { if (x.ret.T) tags.push('No longer plays Tests'); if (x.ret.O) tags.push('No longer plays ODIs'); if (x.ret.I) tags.push('No longer plays T20Is'); }
  if (x.ret.WB) tags.push('White-ball specialist'); if (x.ret.RB) tags.push('Red-ball specialist');
  if (x.injury > 0) tags.push(`Injured${x.injuryNote ? ' (' + x.injuryNote + ')' : ''}, about ${Math.max(1, Math.round(x.injury / 7))} week${x.injury >= 14 ? 's' : ''}`);
  if (w && W.onDuty(x, w.date)) tags.push('On international duty');
  const keys = W.STAT_KEYS.filter(k => x.stats && x.stats[k] && x.stats[k].m);
  const bk = keys.filter(k => x.stats[k].bb > 0);
  const teams = w ? Object.entries(x.teams).filter(([c]) => c !== 'CC' && w.teams[x.teams[c]]) : [];
  const own = w && w.user.team && w.teams[w.user.team];
  const ownsHim = own && own.comp !== 'INTL' && own.squad.includes(x.id);

  const release = () => {
    const t = w.teams[w.user.team];
    if (t.squad.length <= 14) { ui.toast('Your squad is too small to release anyone.'); return; }
    confirm({ title: `Release ${x.name}?`, body: 'He will leave the club immediately.' }, 'Release', 'Keep', true).then(ok => {
      if (!ok) return;
      const comp = w.comps[t.comp];
      if (SK.Auction && W.LEAGUES.includes(t.comp)) SK.Auction.doRelease(w, t, comp, [x]);
      else { t.squad = t.squad.filter(id => id !== x.id); for (const c of Object.keys(x.teams)) if (x.teams[c] === t.key) delete x.teams[c]; }
      nav.back();
    });
  };
  return (
    <Page title={x.name} sub={`${SK.DB.CC_NAMES[x.cc] || x.cc}, age ${age}`} right={w ? <IconBtn icon="edit" label="Edit player" onClick={() => openQuickEdit(x, refresh)} /> : null}>
      <div className="sec">
        <p className="dim" style={{ margin: 0 }}>{ROLE_NAME[x.role]}. {x.hand === 'L' ? 'Left' : 'Right'}-hand bat{x.bowl !== '-' ? ', ' + SK.BOWL_NAMES[x.bowl].toLowerCase() : ''}.</p>
        {tags.length > 0 && <p className="small hi" style={{ margin: '6px 0 0' }}>{tags.join('. ')}.</p>}
      </div>
      <div className="sec"><h2>Ratings</h2></div>
      <RBar label="Technique" v={x.bt} /><RBar label="Power" v={x.bp} />
      {x.bowl !== '-' && <><RBar label="Bowling" v={x.bw} /><RBar label="Control" v={x.be} /></>}
      <RBar label={x.role === 'WK' ? 'Keeping' : 'Fielding'} v={x.fd} />
      {age <= 25 && <p className="sec small dim">Potential: <Stars v={x.pot || 60} /> {(x.pot || 0) > Math.max(R.overall(x, 'T20'), R.overall(x, 'TEST')) + 6 ? 'Still improving.' : ''}</p>}
      <div className="cond">
        <div><div className="k">T20 rating</div><div className="vv">{Math.round(R.overall(x, 'T20'))}</div></div>
        <div><div className="k">ODI rating</div><div className="vv">{Math.round(R.overall(x, 'ODI'))}</div></div>
        <div><div className="k">Test rating</div><div className="vv">{Math.round(R.overall(x, 'TEST'))}</div></div>
        <div><div className="k">Form</div><div className="vv"><FormArrow f={x.form} /> {x.formHist && x.formHist.length ? x.formHist.slice(-5).map((v, i) => <span key={i} className={v > 1.5 ? 'pos' : v < -1 ? 'neg' : 'dimmer'}>●</span>) : null}</div></div>
      </div>
      {teams.length > 0 && (
        <>
          <div className="sec"><h2>Teams</h2></div>
          <div className="list">
            {teams.map(([c, k]) => {
              const t = w.teams[k]; const sal = x.sal && x.sal[c] != null ? `, ${U.money(x.sal[c], w.comps[c] ? w.comps[c].cur : '')}` : '';
              return <div className="row" key={c}><Badge team={t} size="sm" /><span className="grow t">{t.name}</span><span className="small dim">{W.COMP_LABEL[c] || c}{sal}</span></div>;
            })}
          </div>
        </>
      )}
      {keys.length ? (
        <>
          <div className="sec"><h2>Career in this game</h2></div>
          <div className="tblwrap"><table className="tbl"><thead><tr><th className="l">Batting</th><th>M</th><th>Inn</th><th>Runs</th><th>HS</th><th>Avg</th><th>SR</th><th>100</th><th>50</th></tr></thead><tbody>
            {keys.map(k => { const s = x.stats[k]; return <tr key={k}><td className="l">{W.STAT_LABEL[k]}</td><td>{s.m}</td><td>{s.i}</td><td className="b">{s.r}</td><td>{s.hs}{s.hsno ? '*' : ''}</td><td>{U.avgStr(s.r, s.i - s.no)}</td><td>{U.sr(s.r, s.b)}</td><td>{s.c100}</td><td>{s.c50}</td></tr>; })}
          </tbody></table></div>
          {bk.length > 0 && (
            <div className="tblwrap"><table className="tbl"><thead><tr><th className="l">Bowling</th><th>Wkts</th><th>Avg</th><th>Econ</th><th>SR</th><th>Best</th><th>5w</th></tr></thead><tbody>
              {bk.map(k => { const s = x.stats[k]; return <tr key={k}><td className="l">{W.STAT_LABEL[k]}</td><td className="b">{s.w}</td><td>{s.w ? (s.rc / s.w).toFixed(2) : '-'}</td><td>{U.econ(s.rc, s.bb)}</td><td>{s.w ? (s.bb / s.w).toFixed(1) : '-'}</td><td>{s.bbw}/{s.bbr}</td><td>{s.w5}</td></tr>; })}
            </tbody></table></div>
          )}
        </>
      ) : <p className="sec small dim">No matches played in this game yet.</p>}
      {ownsHim && (
        <div className="btnrow">
          <button className="btn ghost" onClick={() => { own.cap = x.id; ui.toast(`${x.name} is captain.`); refresh(); }}>Make captain</button>
          <button className="btn ghost" onClick={release}>Release</button>
        </div>
      )}
    </Page>
  );
}

// ---------------------------------------------------------- fixtures
export function FixturesScreen() {
  const w = app.world; const t = H.userTeam();
  if (!t) return <Page title="Fixtures" tabs="fixtures"><div className="empty">No team, no fixtures.</div></Page>;
  const fxs = W.userFixtures(w, t.key).filter(f => w.editions[f.ed] && !w.editions[f.ed].pruned);
  const nextId = (W.peekNext(w) || {}).id;
  let lastEd = null;
  return (
    <Page title="Fixtures" sub={t.name} tabs="fixtures">
      {!fxs.length && <div className="empty">No fixtures yet. Continue to move the calendar on.</div>}
      {fxs.map(f => {
        const head = f.ed !== lastEd ? <div className="sec"><h2>{w.editions[f.ed].name}</h2></div> : null;
        lastEd = f.ed;
        const opp = w.teams[H.oppOf(f, t.key)];
        const res = H.resultFor(f, t.key);
        const label = STAGE_NAME[f.stage] || (f.fmt === 'TEST' ? 'Test' : f.fmt === 'ODI' ? 'ODI' : f.fmt === 'FC4' ? '4-day' : '');
        return (
          <Fragment key={f.id}>
            {head}
            <button className={`row ${f.id === nextId ? 'sel' : ''}`} onClick={() => { if (f.status === 'done') nav.go('scorecard', { fx: f.id }); else ui.toast(`${U.fmtDate(f.date)}: press Continue on Home to reach it.`); }}>
              <Badge team={opp} size="sm" />
              <div className="grow">
                <div className="t ellip">{f.neutral ? '' : f.home === t.key ? 'v ' : '@ '}{opp.name} {label ? <span className="small dim">{label}</span> : null}</div>
                <div className="s ellip">{U.fmtDate(f.date)}{f.result ? ', ' + f.result.text : ', ' + f.venue.name}</div>
              </div>
              {res ? <span className={`b ${res === 'W' ? 'pos' : res === 'L' ? 'neg' : 'dim'}`}>{res}</span> : null}
            </button>
          </Fragment>
        );
      })}
    </Page>
  );
}

// ---------------------------------------------------------- tables and stats
function EdPickerSheet({ onPick }) {
  const w = app.world;
  const eds = Object.values(w.editions).filter(e => !e.pruned && (e.status !== 'scheduled' || (e.start - w.date) < 60)).sort((a, b) => (a.type === 'series') - (b.type === 'series') || b.start - a.start);
  const groups = [['Live and recent leagues', eds.filter(e => e.type !== 'series')], ['International series', eds.filter(e => e.type === 'series').slice(0, 40)]];
  return (
    <>
      <h3>Competitions</h3>
      {groups.map(([n, list]) => list.length ? (
        <Fragment key={n}>
          <div className="sec"><h2>{n}</h2></div>
          <div className="list">
            {list.map(e => (
              <button className="row" key={e.id} onClick={() => { ui.closeSheet(); onPick(e.id); }}>
                <div className="grow"><div className="t ellip">{e.name}</div><div className="s">{e.status === 'done' ? 'Finished' : e.status === 'live' ? 'In progress' : 'Starts ' + U.fmtDate(e.start)}</div></div>
              </button>
            ))}
          </div>
        </Fragment>
      ) : null)}
    </>
  );
}

export function FxRow({ f }) {
  const w = app.world; const a = w.teams[f.home], b = w.teams[f.away];
  const stage = STAGE_NAME[f.stage] || '';
  return (
    <button className="row" onClick={() => nav.go('scorecard', { fx: f.id })}>
      <div className="grow"><div className="t ellip">{stage ? stage + ': ' : ''}{a.short} v {b.short}</div><div className="s ellip">{f.result ? f.result.text : U.fmtDate(f.date)}</div></div>
      {f.result ? <span className="small dim num">{H.scoreLine(f)}</span> : null}
    </button>
  );
}

function TeamTable({ ed, keys, title, cutAt, prefix }) {
  const w = app.world; const me = w.user.team;
  const T = ed.table; const fc = ed.fmt === 'FC4' || ed.fmt === 'TEST';
  return (
    <>
      {title ? <div className="sec"><h2>{title}</h2></div> : null}
      <div className="tblwrap">
        <table className="tbl">
          <thead><tr><th className="l">Team</th><th>P</th><th>W</th><th>L</th>{fc ? <><th>D</th><th>Bon</th></> : <th>NRR</th>}<th>Pts</th></tr></thead>
          <tbody>
            {keys.map((k, i) => {
              const r = T[(prefix || '') + k]; const nrr = W.nrrFor(r);
              return (
                <tr key={k} className={`${k === me ? 'me' : ''} ${cutAt && i === cutAt - 1 ? 'cut' : ''}`}>
                  <td className="l">{i + 1}. {w.teams[k].name}</td><td>{r.p}</td><td>{r.w}</td><td>{r.l}</td>
                  {fc ? <><td>{r.d}</td><td>{Math.round(r.bon * 10) / 10}</td></> : <td className="dim">{nrr >= 0 ? '+' : ''}{nrr.toFixed(2)}</td>}
                  <td className="b">{Math.round(r.pts * 10) / 10}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ResultsView({ ed }) {
  const w = app.world;
  const fxs = ed.fixtures.map(id => w.fx[id]).filter(Boolean).sort((a, b) => b.date - a.date);
  const done = fxs.filter(f => f.status === 'done'), todo = fxs.filter(f => f.status !== 'done').reverse();
  return (
    <>
      {todo.length > 0 && <><div className="sec"><h2>Upcoming</h2></div><div className="list">{todo.slice(0, 12).map(f => <FxRow key={f.id} f={f} />)}</div></>}
      <div className="sec"><h2>Results</h2></div>
      <div className="list">{done.map(f => <FxRow key={f.id} f={f} />)}{!done.length && <Empty small>No results yet.</Empty>}</div>
    </>
  );
}

function TableView({ ed }) {
  const w = app.world;
  if (ed.type === 'series') {
    const [hk, gk] = ed.teams;
    return (
      <>
        <div className="vs">
          <div className="side"><Badge team={w.teams[hk]} /><span className="nm">{w.teams[hk].name}</span></div>
          <span className="v">v</span>
          <div className="side"><Badge team={w.teams[gk]} /><span className="nm">{w.teams[gk].name}</span></div>
        </div>
        <div className="list">
          {ed.legs.map((l, i) => (
            <div className="row" key={i}>
              <span className="grow t">{l.fmt === 'TEST' ? 'Test series' : l.fmt === 'ODI' ? 'ODI series' : 'T20I series'} ({l.n})</span>
              <span className="num b">{l.score[hk]}-{l.score[gk]}</span>
              {l.score.d ? <span className="small dim">&nbsp;{l.score.d} drawn</span> : null}
            </div>
          ))}
        </div>
        {ed.legs.map((l, i) => l.text ? <p className="sec small dim" key={i}>{l.text}</p> : null)}
      </>
    );
  }
  let body;
  if (ed.type === 'icc') {
    if (ed.icc === 'WTCF') return <ResultsView ed={ed} />;
    body = (
      <>
        {ed.groups.map(g => <TeamTable key={g.name} ed={ed} keys={g.order || W.sortTable(ed, g.teams)} title={g.name} cutAt={ed.icc === 'ODIWC' ? 3 : 2} />)}
        {ed.super && ed.super.map(g => <TeamTable key={g.name} ed={ed} keys={g.order || W.sortTable(ed, g.teams.map(k => 'S:' + k)).map(k => k.slice(2))} title={g.name} cutAt={2} prefix="S:" />)}
      </>
    );
  } else {
    const cut = { ipl4: 4, top3: 3, final2: 2 }[ed.playoff] || (ed.comp === 'CC2' ? 2 : 0);
    body = (
      <>
        <TeamTable ed={ed} keys={W.sortTable(ed)} title="" cutAt={cut} />
        {ed.comp === 'CC1' && <p className="sec tiny dim">Bottom two are relegated.</p>}
      </>
    );
  }
  const ko = ed.fixtures.map(id => w.fx[id]).filter(f => f && /^(Q1|E|Q2|F|SF)$/.test(f.stage));
  return (
    <>
      {body}
      {ko.length > 0 && <><div className="sec"><h2>Knockouts</h2></div><div className="list">{ko.map(f => <FxRow key={f.id} f={f} />)}</div></>}
      {ed.champion && (
        <div className="banner">
          <div className="big">{w.teams[ed.champion].name}</div>
          <p className="dim" style={{ margin: '4px 0 0' }}>
            Champions{ed.awards && ed.awards.topRuns ? `. Most runs: ${w.players[ed.awards.topRuns.pid].name} (${ed.awards.topRuns.v}).` : ''}
            {ed.awards && ed.awards.topWkts ? ` Most wickets: ${w.players[ed.awards.topWkts.pid].name} (${ed.awards.topWkts.v}).` : ''}
          </p>
        </div>
      )}
    </>
  );
}

function StatsView({ ed, st }) {
  const w = app.world; st.stat = st.stat || 'runs';
  const lb = W.leaderboards(w, ed, 15);
  const cols = {
    runs: ['Runs', r => r.s.r, r => `${r.s.i} inns, avg ${U.avgStr(r.s.r, r.s.i - r.s.no)}, SR ${U.sr(r.s.r, r.s.b)}`],
    wkts: ['Wickets', r => r.s.w, r => `avg ${r.s.w ? (r.s.rc / r.s.w).toFixed(1) : '-'}, econ ${U.econ(r.s.rc, r.s.bb)}, best ${r.s.bbw}/${r.s.bbr}`],
    sr: ['Strike rate', r => U.sr(r.s.r, r.s.b), r => `${r.s.r} runs off ${r.s.b}`],
    econ: ['Economy', r => U.econ(r.s.rc, r.s.bb), r => `${r.s.w} wkts in ${U.overs(r.s.bb)} overs`],
    sixes: ['Sixes', r => r.s.f6, r => `${r.s.f4} fours`],
    mvp: ['MVP points', r => Math.round(r.v), r => `${r.s.r} runs, ${r.s.w} wkts, ${r.s.ct} catches`],
  };
  const c = cols[st.stat];
  return (
    <>
      <div className="ctl"><Seg options={[['runs', 'Runs'], ['wkts', 'Wkts'], ['sr', 'SR'], ['econ', 'Econ'], ['sixes', '6s'], ['mvp', 'MVP']]} value={st.stat} onChange={(v) => { st.stat = v; refresh(); }} /></div>
      <div className="list">
        {lb[st.stat].map((r, i) => {
          const x = w.players[r.pid];
          const team = Object.values(x.teams).map(k => w.teams[k]).find(t => ed.teams && ed.teams.includes(t.key)) || w.teams[W.natKey(x.cc)];
          return (
            <button className="row" key={r.pid} onClick={() => goPlayer(r.pid)}>
              <span className="dimmer small" style={{ width: 20 }}>{i + 1}</span>
              {team ? <Badge team={team} size="sm" /> : null}
              <div className="grow"><div className="t ellip">{x.name}</div><div className="s ellip">{c[2](r)}</div></div>
              <span className="b num" style={{ fontSize: 17 }}>{c[1](r)}</span>
            </button>
          );
        })}
        {!lb[st.stat].length && <Empty small>No stats yet.</Empty>}
      </div>
    </>
  );
}

export function TablesScreen({ params }) {
  const w = app.world; const st = useSt({ view: 'table' });
  st.ed = st.ed || params.ed || (H.currentEdition() || {}).id || H.anyEdition();
  const ed = w.editions[st.ed];
  return (
    <Page title="Tables and stats" sub={ed ? ed.name : ''} tabs="tables">
      <div className="ctl" style={{ display: 'flex', gap: 8 }}>
        <button className="btn ghost sm grow" onClick={() => ui.openSheet(<EdPickerSheet onPick={(id) => { st.ed = id; refresh(); }} />)}>Change competition</button>
        <button className="btn ghost sm" onClick={() => nav.go('worldHub')}>World</button>
      </div>
      {!ed ? <div className="empty">No competition to show yet.</div> : (
        <>
          <div className="ctl"><Seg options={[['table', ed.type === 'series' ? 'Series' : 'Table'], ['results', 'Results'], ['stats', 'Stats']]} value={st.view} onChange={(v) => { st.view = v; refresh(); }} /></div>
          {st.view === 'table' ? <TableView ed={ed} /> : st.view === 'results' ? <ResultsView ed={ed} /> : <StatsView ed={ed} st={st} />}
        </>
      )}
    </Page>
  );
}

// ---------------------------------------------------------- world cricket: rankings, WTC, records, honours
function RecordList({ title, list, render }) {
  return (
    <>
      <div className="sec"><h2>{title}</h2></div>
      <div className="list">{(list || []).slice(0, 8).map(render)}{!(list || []).length && <Empty small>None yet.</Empty>}</div>
    </>
  );
}
export function WorldHubScreen() {
  const w = app.world; const st = useSt({ v: 'rank', f: 'TEST', rf: 'TEST' });
  let body;
  if (st.v === 'rank') {
    const rows = Object.entries(w.rank[st.f]).sort((a, b) => b[1] - a[1]);
    body = (
      <>
        <div className="ctl"><Seg options={[['TEST', 'Test'], ['ODI', 'ODI'], ['T20I', 'T20I']]} value={st.f} onChange={(v) => { st.f = v; refresh(); }} /></div>
        <div className="list">
          {rows.map(([k, v], i) => (
            <div className={`row ${k === w.user.team ? 'sel' : ''}`} key={k}>
              <span className="dimmer small" style={{ width: 20 }}>{i + 1}</span><Badge team={w.teams[k]} size="sm" /><span className="grow t">{w.teams[k].name}</span><span className="num b">{Math.round((v - 1000) / 8)}</span>
            </div>
          ))}
        </div>
        <p className="sec tiny dimmer">Ratings move with every international result.</p>
      </>
    );
  } else if (st.v === 'wtc') {
    const rows = W.wtcStandings(w);
    body = (
      <>
        <p className="sec small dim">World Test Championship {w.wtc.cycle}. The top two meet in the final.</p>
        <div className="tblwrap"><table className="tbl"><thead><tr><th className="l">Team</th><th>P</th><th>W</th><th>L</th><th>D</th><th>Pts</th><th>PCT</th></tr></thead><tbody>
          {rows.map((x, i) => <tr key={x.key} className={`${x.key === w.user.team ? 'me' : ''} ${i === 1 ? 'cut' : ''}`}><td className="l">{i + 1}. {w.teams[x.key].name}</td><td>{x.r.p}</td><td>{x.r.w}</td><td>{x.r.l}</td><td>{x.r.d}</td><td>{x.r.pts}</td><td className="b">{x.pct.toFixed(1)}</td></tr>)}
        </tbody></table></div>
      </>
    );
  } else if (st.v === 'rec') {
    const r = w.records[st.rf] || {};
    const who = (x) => `${w.teams[x.t].short} v ${w.teams[x.vs].short}, ${x.ev}`;
    body = (
      <>
        <div className="ctl"><Seg options={[['TEST', 'Test'], ['ODI', 'ODI'], ['T20I', 'T20I'], ['T20', 'T20'], ['FC', 'FC'], ['HUN', '100']]} value={st.rf} onChange={(v) => { st.rf = v; refresh(); }} /></div>
        <RecordList title="Highest scores" list={r.hs} render={(x, i) => <button className="row" key={i} onClick={() => goPlayer(x.pid)}><div className="grow"><div className="t">{w.players[x.pid].name}</div><div className="s ellip">{who(x)}</div></div><span className="b num">{x.v}{x.no ? '*' : ''}</span></button>} />
        <RecordList title="Best bowling" list={r.bb} render={(x, i) => <button className="row" key={i} onClick={() => goPlayer(x.pid)}><div className="grow"><div className="t">{w.players[x.pid].name}</div><div className="s ellip">{who(x)}</div></div><span className="b num">{x.w}/{x.r}</span></button>} />
        <RecordList title="Highest totals" list={r.tt} render={(x, i) => <div className="row" key={i}><div className="grow"><div className="t">{w.teams[x.t].name}</div><div className="s ellip">v {w.teams[x.vs].short}, {x.ev}</div></div><span className="b num">{x.v}/{x.w}{x.dec ? 'd' : ''}</span></div>} />
        <RecordList title="Lowest all-out totals" list={r.lt} render={(x, i) => <div className="row" key={i}><div className="grow"><div className="t">{w.teams[x.t].name}</div><div className="s ellip">v {w.teams[x.vs].short}, {x.ev}</div></div><span className="b num">{x.v}</span></div>} />
      </>
    );
  } else {
    const keys = Object.keys(w.history);
    body = keys.length ? keys.map(k => (
      <Fragment key={k}>
        <div className="sec"><h2>{W.COMP_LABEL[k] || W.ICC_NAMES[k] || k}</h2></div>
        <div className="list">
          {w.history[k].slice().reverse().map((x, i) => (
            <div className="row" key={i}><div className="grow"><div className="t">{x.champion ? w.teams[x.champion].name : 'Shared'}</div><div className="s">{x.name}{x.runnerUp ? `, beat ${w.teams[x.runnerUp].short}` : ''}</div></div></div>
          ))}
        </div>
      </Fragment>
    )) : <div className="empty">Champions will be listed here as competitions finish.</div>;
  }
  return (
    <Page title="World cricket">
      <div className="ctl"><Seg options={[['rank', 'Rankings'], ['wtc', 'WTC'], ['rec', 'Records'], ['hon', 'Honours']]} value={st.v} onChange={(v) => { st.v = v; refresh(); }} /></div>
      {body}
    </Page>
  );
}

// ---------------------------------------------------------- more, inbox, news, career
export function MoreScreen() {
  const w = app.world; const u = w.user;
  const unread = w.inbox.filter(m => !m.read).length;
  const item = (t, s, fn) => (
    <button className="row" onClick={fn}>
      <div className="grow"><div className="t">{t}</div>{s ? <div className="s">{s}</div> : null}</div>
      <span className="chev"><Icon name="chev" /></span>
    </button>
  );
  return (
    <Page title="More" tabs="more">
      <div className="list">
        {item('My career', `Reputation ${Math.round(u.rep)}/100${(u.titles || []).length ? `, ${u.titles.length} title${u.titles.length > 1 ? 's' : ''}` : ''}`, () => nav.go('career'))}
        {item('Inbox', unread ? `${unread} unread` : '', () => nav.go('inbox'))}
        {item('News', '', () => nav.go('news'))}
        {item('World cricket', 'Rankings, WTC, records, honours', () => nav.go('worldHub'))}
        {item('Save game', app.slot === 'auto' ? 'Autosave is on' : 'Saving to ' + app.slot, saveNow)}
        {item('Load and save games', '', () => nav.go('saves'))}
        {item('Settings', '', () => nav.go('settings'))}
        {item('How to play', '', () => nav.go('help'))}
        {item('Main menu', '', () => app.toMenu())}
      </div>
    </Page>
  );
}
export function InboxScreen() {
  const w = app.world;
  return <Page title="Inbox"><div className="list">{w.inbox.map(m => <MailRow key={m.id} m={m} />)}{!w.inbox.length && <div className="empty">No messages.</div>}</div></Page>;
}
export function NewsScreen() {
  const w = app.world;
  return <Page title="News"><div className="list">{w.news.map((n, i) => <NewsItem key={i} n={n} />)}{!w.news.length && <div className="empty">No news yet.</div>}</div></Page>;
}
export function CareerScreen() {
  const w = app.world; const u = w.user;
  return (
    <Page title="My career">
      <div className="sec">
        <p className="b" style={{ fontSize: 18, margin: 0 }}>{u.name}</p>
        <p className="dim small">{u.team ? 'Head coach of ' + w.teams[u.team].name : 'Unemployed'}. Reputation {Math.round(u.rep)}/100. Record {u.won || 0} won, {u.lost || 0} lost from {u.played || 0}.</p>
      </div>
      {(u.titles || []).length > 0 && (
        <>
          <div className="sec"><h2>Titles</h2></div>
          <div className="list">{u.titles.map((t, i) => <div className="row" key={i}><span className="grow t">{t.name}</span><span className="small dim">{U.fmtDate(t.date)}</span></div>)}</div>
        </>
      )}
      <Offers />
      <div className="sec"><h2>History</h2></div>
      <div className="list">
        {u.history.slice().reverse().map((x, i) => (
          <div className="row" key={i}>
            <div className="grow"><div className="t">{x.name}</div><div className="s">{x.teamName || ''}{x.target ? `, target: ${C.TARGETS[x.target]}` : ''}{x.finish ? `, ${x.finish}` : ''}</div></div>
            {x.met != null ? <span className={`b ${x.met ? 'pos' : 'neg'}`}>{x.met ? 'Met' : 'Missed'}</span> : null}
          </div>
        ))}
        {!u.history.length && <Empty small>Your record starts here.</Empty>}
      </div>
      {u.team && (
        <div className="btnrow">
          <button className="btn danger" onClick={() => confirm({ title: 'Resign from your job?', body: 'You will be unemployed until you accept an offer.' }, 'Resign', 'Stay', true).then(ok => { if (ok) { C.resign(w); app.autosave(); nav.go('home', {}, { reset: true }); } })}>Resign</button>
        </div>
      )}
    </Page>
  );
}

// ---------------------------------------------------------- after a match, and season reviews
export function MatchReportScreen({ params }) {
  const w = app.world; const fx = w.fx[params.fx]; const r = fx.result; const key = w.user.team;
  const won = r.winner === key, lost = r.winner && r.winner !== key;
  const ed = w.editions[fx.ed];
  return (
    <Page title="Result" back={false}>
      <div className="banner">
        <div className={`big ${won ? 'pos' : lost ? 'neg' : ''}`}>{r.text}</div>
        <p className="dim" style={{ margin: '6px 0 0' }}>{W.fixtureTitle(w, fx)}</p>
        {r.inns.map((i, k) => <p style={{ margin: '4px 0' }} key={k}>{w.teams[i.team].name} <b>{i.runs}/{i.wkts}{i.dec ? 'd' : ''}</b> <span className="dim small">({U.overs(i.balls, fx.fmt === 'HUN' ? 5 : 6)} ov)</span></p>)}
        {r.mom != null && <p className="small dim">Player of the match: <b className="hi">{w.players[r.mom].name}</b></p>}
      </div>
      {(r.tops || []).length > 0 && (
        <>
          <div className="sec"><h2>Top performers</h2></div>
          <div className="list">
            {r.tops.map((t, i) => (
              <button className="row" key={i} onClick={() => goPlayer(t.pid)}>
                {t.team && w.teams[t.team] ? <Badge team={w.teams[t.team]} size="sm" /> : null}
                <span className="grow t">{w.players[t.pid].name}</span>
                <span className="num">{t.t === 'b' ? `${t.r}${t.no ? '*' : ''} (${t.b})` : `${t.w}/${t.r}`}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {ed && <Snippet ed={ed} />}
      <div className="btnrow">
        <button className="btn ghost" onClick={() => nav.go('scorecard', { fx: params.fx })}>Scorecard</button>
        <button className="btn" onClick={() => { nav.go('home', {}, { reset: true }); app.continue(); }}>Continue</button>
      </div>
    </Page>
  );
}

export function ReviewScreen({ params }) {
  const w = app.world; const a = params.alert || {}; const u = w.user;
  const title = ({ edition: 'Season review', sacked: 'Sacked', offers: 'Job offers', season: 'Season review' }[a.type]) || 'Review';
  let top = null;
  if (a.type === 'edition') {
    const ed = w.editions[a.ed]; const ob = u.objectives[a.ed] || {};
    const lb = W.leaderboards(w, ed, 40);
    const mine = (list) => list.filter(r => Object.values(w.players[r.pid].teams).includes(u.team) || (u.formerTeam && Object.values(w.players[r.pid].teams).includes(u.formerTeam)) || W.natKey(w.players[r.pid].cc) === (u.team || u.formerTeam)).slice(0, 3);
    const br = mine(lb.runs), bw = mine(lb.wkts);
    top = (
      <>
        <div className="banner">
          <div className="big">{ed.name}: {ob.finish || ''}</div>
          <p className="dim">Target: {C.TARGETS[ob.target] || ''}. {ob.met ? <span className="pos">Target met.</span> : <span className="neg">Target missed.</span>} Board confidence {Math.round(u.conf)}/100.</p>
          {ed.champion && <p className="small dim">Champions: {w.teams[ed.champion].name}</p>}
        </div>
        {(br.length > 0 || bw.length > 0) && (
          <>
            <div className="sec"><h2>Your best players</h2></div>
            <div className="list">
              {br.map(r => <div className="row" key={'r' + r.pid}><span className="grow t">{w.players[r.pid].name}</span><span className="num">{r.s.r} runs</span></div>)}
              {bw.map(r => <div className="row" key={'w' + r.pid}><span className="grow t">{w.players[r.pid].name}</span><span className="num">{r.s.w} wkts</span></div>)}
            </div>
          </>
        )}
      </>
    );
  } else if (a.type === 'sacked') {
    top = <div className="banner"><div className="big neg">The board has sacked you</div><p className="dim">Your reputation has taken a hit. Take an offer below, or keep the calendar moving and wait for better ones.</p></div>;
  } else if (a.type === 'season') {
    top = <div className="banner"><div className="big">{a.season - 1}-{String(a.season).slice(2)} season</div><p className="dim">{a.met} of {a.total} board targets met. Board confidence {Math.round(u.conf)}/100.</p></div>;
  }
  return (
    <Page title={title} back={false}>
      {top}
      <Offers />
      <div className="btnrow"><button className="btn" onClick={() => { w.user.alert = null; app.autosave(); nav.go('home', {}, { reset: true }); }}>Continue</button></div>
    </Page>
  );
}
