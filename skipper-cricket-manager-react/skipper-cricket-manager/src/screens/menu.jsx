// Main menu, new career, quick match, tournament, saves, settings, help
import { useState } from 'react';
import { SK } from '../engine';
import { app } from '../app/app';
import { nav, ui } from '../app/core';
import { COMP_ORDER } from '../app/consts';
import Page from '../components/Page';
import Icon from '../components/Icon';
import { Badge, Stars, Seg, Toggle } from '../components/bits';
import { confirm } from '../components/dialogs';
import { useSt, useBack, refresh } from '../components/hooks';

const { U, World: W, Store: S } = SK;

const TeamRows = ({ teams, onPick }) => teams.map(t => (
  <button key={t.key} className="row" onClick={() => onPick(t.key)}>
    <Badge team={t} />
    <div className="grow"><div className="t ellip">{t.name}</div><div className="s">{t.city || ''}</div></div>
    <Stars v={t.strength} />
  </button>
));

const Item = ({ title, sub, onClick, chev = true }) => (
  <button className="row" onClick={onClick}>
    <div className="grow"><div className="t">{title}</div>{sub ? <div className="s">{sub}</div> : null}</div>
    {chev && <span className="chev"><Icon name="chev" /></span>}
  </button>
);

// ---------------------------------------------------------- main menu
export function MenuScreen() {
  const last = S.latestSave();
  const m = last && last.meta;
  return (
    <Page noTop cls="menu">
      <div className="title">
        <div className="stumps" aria-hidden="true"><i /><i /><i /></div>
        <h1 className="word">SKIPPER</h1>
        <div className="tag">Cricket manager. Real squads from October 2026, every major league, your decisions on every ball.</div>
      </div>
      {last && (
        <button className="contcard" onClick={() => app.loadSlot(last.slot)} style={{ border: 0, width: 'calc(100% - 32px)', textAlign: 'left', color: 'inherit' }}>
          <Badge team={{ short: m.short || '?', c1: m.c1, c2: m.c2 }} size="lg" />
          <div className="grow">
            <div className="b" style={{ fontSize: 17 }}>Continue: {m.team}</div>
            <div className="small dim">{m.manager}, {U.fmtDate(m.date)}{m.mode === 'tournament' ? ', tournament' : ''}</div>
          </div>
          <Icon name="chev" />
        </button>
      )}
      <div className="list">
        <Item title="New career" sub="Take any team, survive the board, get headhunted" onClick={() => nav.go('newCareer')} />
        <Item title="Quick match" sub="Any two teams, any format" onClick={() => nav.go('quickSetup')} />
        <Item title="Tournament" sub="Play one season or a World Cup" onClick={() => nav.go('tournSetup')} />
        <Item title="Load and save games" sub="Save slots, back up to a file" onClick={() => nav.go('saves')} />
        <Item title="Squad editor" sub="Update squads and ratings for new games" onClick={() => nav.go('editor')} />
        <Item title="Settings" sub="Speed, captaincy defaults, data" onClick={() => nav.go('settings')} />
        <Item title="How to play" sub="Captaincy, auctions, the board" onClick={() => nav.go('help')} />
      </div>
      <p className="sec tiny dimmer">Squads as researched on 20 Oct 2026. Ratings are estimates. Not affiliated with any league or board.</p>
    </Page>
  );
}

// ---------------------------------------------------------- new career
export function NewCareerScreen() {
  const st = useSt({ name: S.settings.lastManager || '', comp: null, team: null });
  useBack(() => {
    if (st.team) { st.team = null; refresh(); return true; }
    if (st.comp) { st.comp = null; refresh(); return true; }
    return false;
  });
  const compInfo = COMP_ORDER.find(c => c[0] === st.comp);
  let body;
  if (!st.comp) {
    body = (
      <>
        <div className="field">
          <label htmlFor="mgr">Your name</label>
          <input id="mgr" className="input" maxLength={28} placeholder="e.g. Jamil" value={st.name} onChange={(e) => { st.name = e.target.value; refresh(); }} />
        </div>
        <div className="sec"><h2>Where do you start?</h2><p className="small dim">You can move between leagues and national teams later through job offers.</p></div>
        <div className="list">
          {COMP_ORDER.map(([id, n, d]) => (
            <Item key={id} title={n} sub={d} onClick={() => { st.comp = id; refresh(); }} />
          ))}
        </div>
      </>
    );
  } else if (!st.team) {
    body = (
      <>
        <p className="sec small dim">Stars show current squad strength. Strong teams come with tougher board targets.</p>
        <div className="list"><TeamRows teams={app.baseTeams(st.comp)} onPick={(k) => { st.team = k; refresh(); }} /></div>
      </>
    );
  } else {
    const t = app.baseTeams(st.comp).find(x => x.key === st.team);
    const league = W.LEAGUES.includes(st.comp);
    body = (
      <>
        <div className="vs"><div className="side"><Badge team={t} size="lg" /><span className="nm">{t.name}</span><Stars v={t.strength} /></div></div>
        <div className="list">
          {league && (
            <div className="row">
              <div className="grow"><div className="t">Run my own auctions</div><div className="s">Off: the computer handles retentions and auctions for you</div></div>
              <Toggle checked={st.auctions !== false} onChange={(v) => { st.auctions = v; }} />
            </div>
          )}
          <div className="row">
            <div className="grow"><div className="t">Choose bowlers myself</div><div className="s">You can change this before any match</div></div>
            <Toggle checked={S.settings.manualBowl} onChange={(v) => { S.settings.manualBowl = v; S.saveSettings(); }} />
          </div>
        </div>
        <p className="sec small dim">The career starts on 1 November 2026. {st.comp === 'IPL' ? 'IPL 2027 retentions close in mid-November and the auction is on 16 December.' : st.comp === 'INTL' ? 'You will pick a squad before every series.' : ''}</p>
        <div className="btnrow">
          <button className="btn" onClick={() => {
            const name = (st.name || '').trim() || 'The Skipper';
            S.settings.lastManager = name; S.saveSettings();
            app.startCareer({ team: st.team, manager: name, auctions: st.auctions !== false });
          }}>Start career</button>
        </div>
      </>
    );
  }
  return <Page title={st.comp ? 'Choose your team' : 'New career'} sub={st.comp && compInfo ? compInfo[1] : ''}>{body}</Page>;
}

// ---------------------------------------------------------- quick match
const QFMTS = [['T20', 'T20'], ['ODI', 'ODI'], ['TEST', 'Test'], ['HUN', 'Hundred'], ['FC4', '4-day']];

function TeamPickerSheet({ onPick, comps }) {
  const [comp, setComp] = useState(null);
  const list = comps || COMP_ORDER.map(c => c[0]);
  if (!comp) {
    return (
      <>
        <h3>Choose a competition</h3>
        <div className="list">
          {list.map(id => (
            <button key={id} className="row" onClick={() => setComp(id)}>
              <span className="grow t">{(COMP_ORDER.find(c => c[0] === id) || [id, id])[1]}</span>
              <span className="chev"><Icon name="chev" /></span>
            </button>
          ))}
        </div>
      </>
    );
  }
  return (
    <>
      <h3>Choose a team</h3>
      <div className="list"><TeamRows teams={app.baseTeams(comp)} onPick={(k) => { ui.closeSheet(); onPick(k); }} /></div>
    </>
  );
}
export const openTeamPicker = (cb, comps) => ui.openSheet(<TeamPickerSheet onPick={cb} comps={comps} />);

export function QuickSetupScreen() {
  const st = useSt({ fmt: 'T20', ctl: 0, pitch: 'home' });
  if (!st.a) { const ipl = app.baseTeams('IPL'); st.a = ipl[0].key; st.b = ipl[1].key; }
  const ta = app.findBaseTeam(st.a), tb = app.findBaseTeam(st.b);
  const pick = (side, t) => (
    <button className="row" onClick={() => openTeamPicker((key) => { st[side] = key; refresh(); })}>
      <Badge team={t} />
      <div className="grow"><div className="t">{t.name}</div><div className="s">{side === 'a' ? 'Home side' : 'Away side'}</div></div>
      <span className="chev"><Icon name="chev" /></span>
    </button>
  );
  const go = () => {
    if (ta.key === tb.key) { ui.toast('Pick two different teams.'); return; }
    const eng = st.fmt === 'T20' ? (ta.comp === 'INTL' && tb.comp === 'INTL' ? 'T20I' : 'T20') : st.fmt;
    const venue = { name: ta.venue, city: ta.city, cc: ta.cc, pitch: st.pitch && st.pitch !== 'home' ? st.pitch : ta.pitch };
    const ctx = { kind: 'quick', teams: [ta, tb], fmt: eng, venue, userSide: st.ctl < 0 ? null : st.ctl, title: `${ta.short} v ${tb.short}, ${SK.FORMATS[eng].label}` };
    nav.go('prematch', { ctx });
  };
  return (
    <Page title="Quick match">
      <div className="sec"><h2>Format</h2></div>
      <div className="ctl"><Seg cls="wide" options={QFMTS} value={st.fmt} onChange={(v) => { st.fmt = v; refresh(); }} /></div>
      <div className="sec"><h2>Teams</h2></div>
      <div className="list">{pick('a', ta)}{pick('b', tb)}</div>
      <div className="sec"><h2>Pitch</h2></div>
      <div className="ctl"><Seg options={[['home', 'Home'], ['F', 'Flat'], ['G', 'Green'], ['D', 'Turner'], ['P', 'Bouncy']]} value={st.pitch} onChange={(v) => { st.pitch = v; refresh(); }} /></div>
      <div className="sec"><h2>You captain</h2></div>
      <div className="ctl"><Seg cls="wide" options={[['0', ta.short], ['1', tb.short], ['-1', 'Watch']]} value={String(st.ctl)} onChange={(v) => { st.ctl = +v; refresh(); }} /></div>
      <div className="btnrow"><button className="btn" onClick={go}>Continue to team selection</button></div>
    </Page>
  );
}

// ---------------------------------------------------------- tournament
const TOURNEYS = [
  ['T20WC', 'T20 World Cup', '20 nations, groups, Super 8, knockouts'], ['ODIWC', 'ODI World Cup', '14 nations, groups, Super Six, knockouts'],
  ['CT', 'Champions Trophy', 'Top eight ODI nations'], ['IPL', 'IPL 2027', 'One season with real squads'], ['BBL', 'BBL|16', ''], ['PSL', 'PSL 2027', ''],
  ['SA20', 'SA20 2027', ''], ['HUN', 'The Hundred 2027', ''], ['CPL', 'CPL 2027', ''], ['ILT20', 'ILT20 Season 5', ''], ['MLC', 'MLC 2027', ''],
  ['SHF', 'Sheffield Shield 2026-27', ''], ['CC1', 'County Championship 2027', 'Division One'],
];
export function TournSetupScreen() {
  const st = useSt({ comp: null });
  useBack(() => { if (st.comp) { st.comp = null; refresh(); return true; } return false; });
  let body;
  if (!st.comp) {
    body = (
      <>
        <p className="sec small dim">A single competition with no board and no sacking.</p>
        <div className="list">{TOURNEYS.map(([id, n, d]) => <Item key={id} title={n} sub={d} onClick={() => { st.comp = id; refresh(); }} />)}</div>
      </>
    );
  } else {
    const icc = ['T20WC', 'ODIWC', 'CT'].includes(st.comp);
    let teams = app.baseTeams(icc ? 'INTL' : st.comp);
    if (st.comp === 'CT') teams = teams.slice(0, 8);
    if (st.comp === 'ODIWC') teams = teams.slice(0, 14);
    body = <div className="list"><TeamRows teams={teams} onPick={(key) => app.startTournament(st.comp, key)} /></div>;
  }
  return <Page title={st.comp ? 'Choose your team' : 'Tournament'}>{body}</Page>;
}

export function TournamentDoneScreen() {
  const w = app.world; const ed = w.editions[w.user.oneEd];
  const champ = ed && ed.champion ? w.teams[ed.champion] : null;
  const me = w.teams[w.user.team || w.user.formerTeam];
  const ob = w.user.objectives[ed.id] || {};
  const lb = W.leaderboards(w, ed, 5);
  return (
    <Page title="Tournament complete" back={false}>
      <div className="banner">
        <div className="big">{champ ? `${champ.name} win ${ed.name}` : `${ed.name} finished`}</div>
        <p className="dim">{me.name}: {ob.finish || ''}</p>
      </div>
      <div className="sec"><h2>Most runs</h2></div>
      <div className="list">{lb.runs.map(r => <div className="row" key={r.pid}><span className="grow t">{w.players[r.pid].name}</span><span className="num">{r.s.r}</span></div>)}</div>
      <div className="sec"><h2>Most wickets</h2></div>
      <div className="list">{lb.wkts.map(r => <div className="row" key={r.pid}><span className="grow t">{w.players[r.pid].name}</span><span className="num">{r.s.w}</span></div>)}</div>
      <div className="btnrow">
        <button className="btn ghost" onClick={() => nav.go('tables')}>Tables</button>
        <button className="btn" onClick={() => app.toMenu()}>Main menu</button>
      </div>
    </Page>
  );
}

// ---------------------------------------------------------- saves
export function SavesScreen() {
  const saves = S.listSaves();
  const hasWorld = !!app.world;
  const exp = () => {
    const w = app.world;
    const name = `skipper-${(w.user.name || 'career').replace(/\W+/g, '-')}-${U.fmtDate(w.date).replace(/ /g, '-')}.json`;
    S.exportText(name, JSON.stringify({ skipperSave: 1, world: w })).then(ok => ui.toast(ok ? 'Exported.' : 'Export cancelled.'));
  };
  const imp = () => S.importText().then(txt => {
    if (!txt) return;
    try {
      const o = JSON.parse(txt); const w = o.world || o;
      if (!w.players || !w.teams || !w.fx) throw new Error('Not a Skipper save');
      app.world = w; app.slot = 'auto'; app.save('auto', true); ui.toast('Game imported.'); nav.go('home', {}, { reset: true });
    } catch (e) { ui.toast('That file is not a Skipper save.'); }
  });
  return (
    <Page title="Load and save">
      <div className="list">
        {saves.map(s => {
          const m = s.meta; const label = s.slot === 'auto' ? 'Autosave' : 'Slot ' + s.slot.slice(4);
          return (
            <div className="row" key={s.slot}>
              {m ? <Badge team={{ short: m.short || '?', c1: m.c1, c2: m.c2 }} /> : <span className="badge" style={{ '--b1': '#173329', '--b2': '#2a4a3e' }} />}
              <div className="grow"><div className="t">{label}</div><div className="s">{m ? `${m.team}, ${U.fmtDate(m.date)}` : 'Empty'}</div></div>
              {m && <button className="btn sm" onClick={() => app.loadSlot(s.slot)}>Load</button>}
              {hasWorld && s.slot !== 'auto' && <button className="btn ghost sm" onClick={() => { app.save(s.slot); refresh(); }}>Save</button>}
              {m && s.slot !== 'auto' && (
                <button className="iconbtn" aria-label="Delete" onClick={() => confirm({ title: 'Delete this save?' }, 'Delete', 'Keep', true).then(ok => { if (ok) { S.deleteSave(s.slot); refresh(); } })}><Icon name="close" /></button>
              )}
            </div>
          );
        })}
      </div>
      <div className="sec"><h2>Back up</h2><p className="small dim">Copy a game to a file so you can keep it safe or move it to another phone.</p></div>
      <div className="btnrow">
        {hasWorld && <button className="btn ghost" onClick={exp}>Export this game</button>}
        <button className="btn ghost" onClick={imp}>Import a game file</button>
      </div>
    </Page>
  );
}

// ---------------------------------------------------------- settings
export function SettingsScreen() {
  const st = S.settings;
  const tg = (k, t, s) => (
    <div className="row">
      <div className="grow"><div className="t">{t}</div>{s ? <div className="s">{s}</div> : null}</div>
      <Toggle checked={st[k]} onChange={(v) => { S.settings[k] = v; S.saveSettings(); }} />
    </div>
  );
  return (
    <Page title="Settings">
      <div className="sec"><h2>Match speed</h2><p className="small dim">How fast balls play when you press Play.</p></div>
      <div className="ctl"><Seg cls="wide" options={[['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast'], ['turbo', 'Turbo']]} value={st.speed} onChange={(v) => { S.settings.speed = v; S.saveSettings(); refresh(); }} /></div>
      <div className="sec"><h2>Captaincy defaults</h2></div>
      <div className="list">
        {tg('manualBowl', 'Choose bowlers myself', 'You pick the bowler at the end of every over')}
        {tg('manualField', 'Set fields myself')}
        {tg('showField', 'Show the field view')}
        {tg('keepAwake', 'Keep the screen on during matches')}
        {tg('autoSave', 'Autosave', 'After every match and stop')}
      </div>
      <div className="sec"><h2>Data</h2></div>
      <div className="list">
        <button className="row" onClick={() => confirm({ title: 'Restore original squads?', body: 'Your edited squads will be removed. Existing careers are not changed.' }, 'Restore').then(ok => {
          if (!ok) return;
          S.clearCustomDB(); if (window.SKIPPER_DB_BASE) { window.SKIPPER_DB = window.SKIPPER_DB_BASE; window.SKIPPER_DB_BASE = null; }
          app.resetBaseCache(); ui.toast('Original squads restored.');
        })}><div className="grow"><div className="t">Restore original squads</div><div className="s">Undo squad editor changes for new games</div></div></button>
        <button className="row" onClick={() => confirm({ title: 'Delete every save?', body: 'This cannot be undone.' }, 'Delete all', 'Cancel', true).then(ok => {
          if (ok) { for (const s of S.SLOTS) S.deleteSave(s); ui.toast('All saves deleted.'); }
        })}><div className="grow"><div className="t neg">Delete all saves</div></div></button>
      </div>
      <p className="sec tiny dimmer">Fonts: Barlow and Big Shoulders Display, SIL Open Font License.</p>
    </Page>
  );
}

// ---------------------------------------------------------- help
const Help = ({ h, children }) => <div className="sec"><h2>{h}</h2>{children}</div>;
export function HelpScreen() {
  return (
    <Page title="How to play">
      <Help h="The calendar"><p className="dim">Press <b>Continue</b> on the home screen. The world plays on, every league and every international series, and stops whenever you are needed: a match, an auction, or picking a national squad.</p></Help>
      <Help h="Before a match"><p className="dim">Pick your XI and batting order, choose a captain and keeper, read the pitch report, then go to the toss. Respect the overseas limit in franchise and county cricket.</p></Help>
      <Help h="Batting"><p className="dim">Each batter has an approach from <b>Block</b> to <b>Slog</b>. Auto lets the computer judge the situation. Attacking scores faster but gets players out. Set batters are harder to dismiss, so protect new batters.</p></Help>
      <Help h="Bowling">
        <p className="dim">Choose who bowls each over. Pace bowlers love new balls, green pitches and cloud cover. Spinners grow into Test matches as the pitch wears. Watch tiredness in long spells, and keep your best death bowlers for the end of a T20.</p>
        <p className="dim">Field settings: Attacking takes more wickets but leaks boundaries. Defensive dries up boundaries.</p>
      </Help>
      <Help h="Tests and first-class"><p className="dim">Declare from the batting controls. Lead by 200 in a Test (150 in four-day games) and you can enforce the follow-on. A new ball is available every 80 overs.</p></Help>
      <Help h="Auctions"><p className="dim">In franchise leagues you release players before the auction, then bid against the other teams. Keep enough purse to fill the minimum squad. Each team can only hold a limited number of overseas players.</p></Help>
      <Help h="The board"><p className="dim">Every competition comes with a target based on your squad strength. Results move board confidence. Drop too low at the end of a season and you are sacked. Do well and other teams, even national sides, will approach you.</p></Help>
      <Help h="Keeping squads current"><p className="dim">Squads change constantly. Use the Squad editor from the main menu to fix squads and ratings, or import a squads file. Changes apply to new careers.</p></Help>
    </Page>
  );
}
