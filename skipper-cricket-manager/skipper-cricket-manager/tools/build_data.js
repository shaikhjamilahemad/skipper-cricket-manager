// Builds www/js/data.js from data_src/*.txt and validates squads.
// Usage: node tools/build_data.js
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, '..', 'data_src');
const OUT = path.join(__dirname, '..', 'www', 'js', 'data.js');

const BOWL_TYPES = new Set(['RF', 'RFM', 'RM', 'LF', 'LFM', 'LM', 'OB', 'LB', 'SLA', 'LWS', '-']);
const ROLES = new Set(['BAT', 'WK', 'AR', 'BWL']);
const ASSOC = new Set(['NED', 'SCO', 'NEP', 'USA', 'UAE', 'NAM', 'OMA', 'CAN', 'ITA', 'OTH']);

function hash(str) { // FNV-1a
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function seeded(str) { let s = hash(str) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const errors = [];
const players = []; // arrays
const byName = new Map();

function parseRatingPair(txt, fallback) {
  if (txt === '-' || txt === undefined || txt === '') return fallback;
  const parts = txt.split('/').map(Number);
  if (parts.length === 1) return [parts[0], parts[0]];
  return [parts[0], parts[1]];
}

function genPlayer(name, cc, role, bowl) {
  const r = seeded(name);
  const rng = (a, b) => Math.round(a + (b - a) * r());
  const pen = ASSOC.has(cc) ? 4 : 0;
  const yob = rng(1995, 2004);
  const hand = r() < 0.72 ? 'R' : 'L';
  let bt, bp, bw, be, fd = rng(56, 68);
  if (!bowl) bowl = role === 'BAT' || role === 'WK' ? '-' : (r() < 0.6 ? 'RFM' : ['OB', 'LB', 'SLA', 'RM', 'LFM'][rng(0, 4)]);
  if (role === 'BAT') { bt = rng(52, 62); bp = rng(56, 74); bw = 15; be = 18; if (bowl !== '-') { bw = 30; be = 32; } }
  else if (role === 'WK') { bt = rng(48, 58); bp = rng(54, 70); bw = 0; be = 0; fd = rng(60, 68); }
  else if (role === 'AR') { bt = rng(42, 56); bp = rng(50, 68); bw = rng(52, 62); be = rng(52, 60); }
  else { bt = rng(12, 24); bp = rng(15, 34); bw = rng(55, 64); be = rng(52, 62); }
  return [name, cc, yob, hand, bowl, role, bt - pen, bp - pen, Math.max(0, bw - pen), Math.max(0, be - pen), fd, '', 1];
}

for (const file of fs.readdirSync(SRC).filter(f => f.startsWith('players_') && f.endsWith('.txt')).sort()) {
  const lines = fs.readFileSync(path.join(SRC, file), 'utf8').split('\n');
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const f = line.split('|').map(s => s.trim());
    const where = `${file}:${i + 1}`;
    let rec;
    if (f.length <= 4) {
      const [name, cc, role, bowl] = f;
      if (!ROLES.has(role)) { errors.push(`${where} bad role ${role}`); return; }
      if (bowl && !BOWL_TYPES.has(bowl)) { errors.push(`${where} bad bowl ${bowl}`); return; }
      rec = genPlayer(name, cc, role, bowl);
    } else {
      const [name, cc, yob, hand, bowl, role, bat, bowlR, fld, flags] = f;
      if (!BOWL_TYPES.has(bowl)) errors.push(`${where} bad bowl '${bowl}'`);
      if (!ROLES.has(role)) errors.push(`${where} bad role '${role}'`);
      if (!/^(19|20)\d\d$/.test(yob)) errors.push(`${where} bad yob '${yob}'`);
      if (hand !== 'R' && hand !== 'L') errors.push(`${where} bad hand '${hand}'`);
      const [bt, bp] = parseRatingPair(bat, [50, 50]);
      let [bw, be] = parseRatingPair(bowlR, bowl === '-' ? [0, 0] : [30, 30]);
      if (bowl === '-' && bowlR !== '-') { /* allow */ }
      const fd = fld === '-' ? 65 : Number(fld);
      for (const [k, v] of [['bt', bt], ['bp', bp], ['bw', bw], ['be', be], ['fd', fd]]) if (!(v >= 0 && v <= 99)) errors.push(`${where} bad ${k} ${v}`);
      rec = [name, cc, Number(yob), hand, bowl, role, bt, bp, bw, be, fd, flags || '', 0];
    }
    if (byName.has(rec[0])) { errors.push(`${where} duplicate player '${rec[0]}' (also ${byName.get(rec[0]).where})`); return; }
    byName.set(rec[0], { idx: players.length, where });
    players.push(rec);
  });
}

// squads
const comps = [];
let curComp = null, curTeam = null;
const lines = fs.readFileSync(path.join(SRC, 'squads.txt'), 'utf8').split('\n');
const missing = new Map();
lines.forEach((raw, i) => {
  const line = raw.trim();
  if (!line || line.startsWith('#')) return;
  if (line.startsWith('COMP|')) {
    const [, id, name, fmt, home, osXI, mpt, playoff, month, cur, purse, squadMax, osSquad] = line.split('|');
    curComp = { id, name, fmt, home, osXI: +osXI, mpt: +mpt, playoff, month: +month, cur, purse: +purse, squadMax: +squadMax, osSquad: +osSquad, teams: [] };
    comps.push(curComp); curTeam = null; return;
  }
  if (line.startsWith('PREF|')) {
    const [, tid, fmt, names] = line.split('|');
    const intl = comps.find(c => c.id === 'INTL');
    const t = intl && intl.teams.find(x => x.id === tid);
    if (!t) { errors.push(`PREF unknown team ${tid}`); return; }
    t.pref = t.pref || {}; t.caps = t.caps || {};
    t.pref[fmt] = [];
    for (let nm of names.split(',').map(x => x.trim()).filter(Boolean)) {
      const cap = nm.endsWith('*'); if (cap) nm = nm.slice(0, -1).trim();
      const pl = byName.get(nm);
      if (!pl) { missing.set(nm, (missing.get(nm) || []).concat(`PREF ${tid}/${fmt}`)); continue; }
      t.pref[fmt].push(pl.idx); if (cap) t.caps[fmt] = pl.idx;
      if (!t.squad.includes(pl.idx)) t.squad.push(pl.idx);
    }
    return;
  }
  if (line.startsWith('TEAM|')) {
    const [, id, name, short, c1, c2, city, venue, pitch, cap] = line.split('|');
    curTeam = { id, name, short, c1: '#' + c1, c2: '#' + c2, city, venue, pitch, cap: cap || '', squad: [] };
    curComp.teams.push(curTeam); return;
  }
  if (!curTeam) { errors.push(`squads.txt:${i + 1} players before TEAM`); return; }
  for (const nm of line.split(',').map(s => s.trim()).filter(Boolean)) {
    const p = byName.get(nm);
    if (!p) { missing.set(nm, (missing.get(nm) || []).concat(`${curComp.id}/${curTeam.id}`)); continue; }
    if (curTeam.squad.includes(p.idx)) errors.push(`dup in squad ${curComp.id}/${curTeam.id}: ${nm}`);
    curTeam.squad.push(p.idx);
  }
  if (curTeam.cap && !byName.has(curTeam.cap)) errors.push(`captain not found ${curComp.id}/${curTeam.id}: ${curTeam.cap}`);
});

// one team per league check (except INTL)
for (const c of comps) {
  if (c.id === 'INTL') continue;
  const seen = new Map();
  for (const t of c.teams) for (const pid of t.squad) {
    if (seen.has(pid)) errors.push(`${c.id}: ${players[pid][0]} in both ${seen.get(pid)} and ${t.id}`);
    else seen.set(pid, t.id);
  }
}
// County: a player should be in only one county across both divisions
{
  const seen = new Map();
  for (const c of comps.filter(c => c.id === 'CC1' || c.id === 'CC2')) for (const t of c.teams) for (const pid of t.squad) {
    if (seen.has(pid)) errors.push(`County: ${players[pid][0]} in both ${seen.get(pid)} and ${t.id}`); else seen.set(pid, t.id);
  }
}

if (missing.size) {
  errors.push(`${missing.size} squad names missing from player files:`);
  for (const [nm, where] of missing) errors.push(`  MISSING ${nm}  <- ${where.join(', ')}`);
}

// format specialists (selection hints for international / first-class picks)
const WB = `Adil Rashid|Laurie Evans|Sam Billings|Liam Dawson|Tom Banton|Will Jacks|Chris Lynn|Colin Munro|Alex Hales|Kieron Pollard|Andre Russell|Sunil Narine|Nicholas Pooran|Faf du Plessis|Heinrich Klaasen|Imad Wasim|Asif Ali|Jake Lehmann|Ashton Turner|Nathan Sowter|Andrew Tye|Hilton Cartwright|Mohammad Amir|Fazalhaq Farooqi|Mohammad Nabi|Rashid Khan|Shadab Khan|Dasun Shanaka|Tabraiz Shamsi|Usama Mir|Josh Little|Mark Chapman|Michael Bracewell|Suryakumar Yadav|Hardik Pandya|Rinku Singh|Abhishek Sharma|Tilak Varma|Sanju Samson|Arshdeep Singh|Varun Chakravarthy|Ravi Bishnoi|Shivam Dube|Ishan Kishan|Riyan Parag|Krunal Pandya|Jos Buttler|Phil Salt|Liam Livingstone|Tymal Mills|Reece Topley|Laurie Evans|Jason Roy|Chris Jordan|David Willey|Benny Howell|Adam Hose|Ross Whiteley|Danny Briggs|David Payne|Chris Wood|Richard Gleeson|Andrew Tye|Moeen Ali|Dawid Malan|Will Smeed|James Vince|Tom Moores|Glenn Maxwell|Marcus Stoinis|Adam Zampa|Tim David|Matt Short|Jake Fraser-McGurk|Josh Philippe|D'Arcy Short|Daniel Sams|David Miller|Tabraiz Shamsi|Reeza Hendricks|Rilee Rossouw|Anrich Nortje|Donovan Ferreira|Finn Allen|James Neesham|Tim Seifert|Lockie Ferguson|Adam Milne|Fakhar Zaman|Haris Rauf|Shadab Khan|Usman Tariq|Salman Mirza|Sufyan Moqim|Mohammad Nawaz|Hasan Nawaz|Sahibzada Farhan|Mohammad Haris|Khawaja Nafay|Usman Khan|Khushdil Shah|Abbas Afridi|Iftikhar Ahmed|Azam Khan|Hussain Talat|Mohammad Wasim Jr|Haider Ali|Sharjeel Khan|Zaman Khan|Ihsanullah|Mohammad Hasnain|Dasun Shanaka|Maheesh Theekshana|Wanindu Hasaranga|Matheesha Pathirana|Nuwan Thushara|Eshan Malinga|Kusal Perera|Charith Asalanka|Avishka Fernando|Kamil Mishara|Janith Liyanage|Pavan Rathnayake|Dushan Hemantha|Pramod Madushan|Binura Fernando|Rovman Powell|Sherfane Rutherford|Shimron Hetmyer|Romario Shepherd|Brandon King|Johnson Charles|Evin Lewis|Keacy Carty|Matthew Forde|Akeal Hosein|Obed McCoy|Odean Smith|Fabian Allen|Shamar Springer|Amir Jangoo|Jewel Andrew|Parvez Hossain Emon|Rishad Hossain|Tanvir Islam|Mustafizur Rahman|Nasum Ahmed|Mahedi Hasan|Shamim Hossain|Tanzim Hasan Sakib|Afif Hossain|Rahmanullah Gurbaz|Mujeeb Ur Rahman|Fazalhaq Farooqi|Allah Ghazanfar|Noor Ahmad|Gulbadin Naib|Karim Janat|Darwish Rasooli|Farid Ahmad Malik|Abdullah Ahmadzai|Ijaz Ahmadzai|Abdullah Tarakhail|Ross Adair|Gareth Delany|Josh Little|Ben White|Ryan Burl|Tadiwanashe Marumani|Tony Munyonga|Tinotenda Maposa`.split('|');
const RB = `Abhimanyu Easwaran|Karun Nair|Sarfaraz Khan|Devdutt Padikkal|Akash Deep|Scott Boland|Nathan Lyon|Jake Weatherald|Sam Konstas|Nathan McSweeney|Brendan Doggett|Peter Handscomb|Marcus Harris|Kurtis Patterson|Zak Crawley|Ollie Pope|Shoaib Bashir|Jack Leach|Ollie Robinson|Emilio Gay|Haseeb Hameed|Dom Sibley|Rory Burns|Keaton Jennings|Alex Lees|Ben Foakes|Sam Cook|Ben Compton|Sam Northeast|Ben Slater|Tom Haines|Sam Robson|Adam Lyth|Jake Libby|David Bedingham|Simon Harmer|Senuran Muthusamy|Tom Blundell|Ajaz Patel|Shan Masood|Saud Shakeel|Imam-ul-Haq|Noman Ali|Sajid Khan|Mohammad Abbas|Azan Awais|Abdullah Fazal|Ali Usman|Ghazi Ghori|Awais Zafar|Mohammad Ali|Kamran Ghulam|Dinesh Chandimal|Oshada Fernando|Prabath Jayasuriya|Vishwa Fernando|Nishan Peiris|Nishan Madushka|Milan Rathnayake|Kraigg Brathwaite|John Campbell|Tagenarine Chanderpaul|Kavem Hodge|Mikyle Louis|Kevlon Anderson|Jomel Warrican|Kirk McKenzie|Mominul Haque|Shadman Islam|Mahmudul Hasan Joy|Ebadot Hossain|Khaled Ahmed|Nayeem Hasan|Ismat Alam|Abdul Malik|Afsar Zazai|Zia-ur-Rehman Akbar|Khalil Gurbaz|Rahmanullah Zadran`.split('|');
for (const [list, tag] of [[WB, 'wb'], [RB, 'rb']]) for (const nm of list) {
  const e = byName.get(nm);
  if (!e) { errors.push(`${tag} list: unknown player ${nm}`); continue; }
  const rec = players[e.idx]; rec[11] = rec[11] ? rec[11] + ',' + tag : tag;
}

// stats
const used = new Set();
comps.forEach(c => c.teams.forEach(t => t.squad.forEach(p => used.add(p))));
const unused = players.filter((p, i) => !used.has(i)).map(p => p[0]);

const db = { version: '2026-10-20', players, comps };
const js = '/* Generated by tools/build_data.js — squads researched 20 Oct 2026 */\nwindow.SKIPPER_DB = ' + JSON.stringify(db) + ';\n';
if (!process.argv.includes('--check')) fs.writeFileSync(OUT, js);
console.log(`players: ${players.length} (generated ${players.filter(p => p[12]).length}), comps: ${comps.length}, teams: ${comps.reduce((a, c) => a + c.teams.length, 0)}, bytes: ${js.length}`);
if (unused.length) console.log(`unused players (${unused.length}): ${unused.slice(0, 40).join(', ')}${unused.length > 40 ? ' ...' : ''}`);
for (const c of comps) {
  const sizes = c.teams.map(t => `${t.id}:${t.squad.length}`).join(' ');
  console.log(`${c.id}: ${sizes}`);
}
if (errors.length) { console.log('\nERRORS (' + errors.length + '):\n' + errors.join('\n')); process.exitCode = 1; }
else console.log('OK — no errors');
