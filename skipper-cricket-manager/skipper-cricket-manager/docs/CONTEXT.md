# Skipper — cricket manager app: project context

This file is `docs/CONTEXT.md` in the Skipper GitHub repository. **Any AI or developer continuing the app should read it first.**
The code is in the same repository. Before the repository existed, the same code was shared as `Skipper-1.0.0-source.zip`.

- Last updated: 21 Oct 2026
- Current version: **1.0.0** (Android `versionCode` 2)
- Package name: `com.jamil.skipper`, app label "Skipper"

---

## 1. Summary

- Skipper is an **offline Android cricket management and gameplay app** in the style of *Cricket Captain*.
- It is for the owner's personal fun. It is **not published** anywhere (no Play Store).
- The game is plain **HTML, CSS and JavaScript**. A small native Android app (one full-screen WebView) runs it from the APK's assets and saves games to files.
- Squads are real, as researched on **20 Oct 2026**: 1,442 players, 104 teams, 11 competitions plus 21 national teams.
- APK size is about 370 KB. No internet, no ads, no Android permissions.

## 2. The owner and how to work with him

- Owner: **Jamil**, a cricket fan. He uses the Claude mobile app on Android.
- His original request (20 Oct 2026):
  > "I want to build a cricket management and gameplay app like cricket captain. Can you build it for me .apk make it excellent with all recent updated squads and everything. It must also have all leagues and career mode also. It will not be published anywhere, its for my personal fun."
- How he wants AI to communicate (his standing instruction):
  - Direct, honest and analytical, like a senior advisor. No flattery and no emotional validation.
  - Point out weak reasoning, risks, blind spots and factual errors clearly.
  - Simple, easy English. No jargon. Short bullet points instead of long paragraphs.
  - Substance over praise. Disagree when it is warranted.

## 3. What happened in the original chat (timeline)

1. **20 Oct 2026.** Jamil asked for the app. Earlier the same day, another chat had built him a tarot app as an APK using the same WebView approach, which is why he said "another app".
2. The AI replied with a v1 scope (see section 4) and listed caveats up front: squads go stale (so an editor and import/export were added), ratings are estimates, no 3D, no real logos, and Ranji Trophy, BPL, LPL and women's cricket were left out of v1.
3. The AI researched squads, then built the match engine, the world simulation, auctions, career mode, all screens, the Android wrapper and automated tests.
4. **20 Oct, 23:54 IST.** The early build `Skipper-0.9.0-early.apk` (versionCode 1) was sent so Jamil could check that it installs.
5. **21 Oct, 00:08 IST.** The final build `Skipper-1.0.0.apk` (versionCode 2) and `Skipper-1.0.0-source.zip` were sent. Changes after 0.9.0:
   - Auction AI reworked. Before, AI teams left most of their purse unspent. Now they release more players, bid according to their purse, and fill squads in an accelerated round.
   - A drawn WTC final now gives a shared title instead of "Runners-up".
   - Skipping to the next wicket, session or innings now picks bowlers automatically instead of stopping every over.
   - The home screen shows the next non-match stop (retentions, auction, squad pick).
   - Match report shows team badges next to top performers.
   - The squad editor's competition list was fixed (it was empty).
   - A new `noipl` player flag (Ashwin, Russell and Pollard have left the IPL).
6. Jamil asked **how to play the IPL auction**. That answer is in section 16.
7. Jamil asked for this context file.
8. Jamil asked for the whole project as a GitHub-ready folder with instructions, to store it for future work. This repository layout was created:
   - `docs/` and `releases/` folders, `.gitignore` and `.gitattributes`
   - tool scripts changed to work from any folder
   - fresh screenshots for the README
   - upload steps in `docs/UPLOAD_TO_GITHUB.md`
9. **Jamil has not yet reported whether the APK installs and runs on his phone.**

## 4. Features in 1.0.0

### Modes
- **Career:** take any franchise, county, Shield or national team. Board targets, confidence, sacking, job offers from other teams, including national sides.
- **Quick match:** any two teams, any format, any pitch. Captain one side, both sides, or just watch.
- **Tournament:** one season of any league, or a one-off T20 World Cup, ODI World Cup or Champions Trophy.
- **Squad editor:** edit players, teams and squads used for new games. Export and import as a JSON file.
- **Load and save:** autosave plus 3 slots. A game can be exported to a file and imported again.
- **Settings and How to play.**

### Formats
| Key | Format | Notes |
|---|---|---|
| `T20` | T20 (franchise) | 20 overs, max 4 per bowler, powerplay 6 overs |
| `T20I` | T20 international | Same rules as T20, different stats bucket |
| `ODI` | One-day international | 50 overs, max 10 per bowler |
| `HUN` | The Hundred | 100 balls in sets of 5; a bowler may bowl 2 sets in a row |
| `TEST` | Test match | 5 days, 90 overs a day, follow-on at 200 |
| `FC4` | 4-day first-class | 4 days, 96 overs a day, follow-on at 150 |

### Competitions
Purses are stored in the units shown (for example, "AUD k 2000" means A$2.0 million).

| ID | Name | Teams | Format | Overseas in XI | Squad max | Overseas in squad | Purse | Starts | Matches per team | Play-offs |
|---|---|---|---|---|---|---|---|---|---|---|
| IPL | Indian Premier League | 10 | T20 | 4 | 25 | 8 | ₹125 Cr | 20 Mar | 14 | Q1, Eliminator, Q2, Final |
| BBL | Big Bash League | 8 | T20 | 3 | 19 | 3 | AUD k 2000 | 14 Dec | 10 | Same as IPL |
| PSL | Pakistan Super League | 8 | T20 | 4 | 20 | 6 | USD k 1600 | 2 Apr | 10 | Same as IPL |
| SA20 | SA20 | 6 | T20 | 4 | 19 | 7 | ZAR m 34 | 26 Dec | 10 | Same as IPL |
| CPL | Caribbean Premier League | 7 | T20 | 4 | 18 | 6 | USD k 1200 | 15 Aug | 10 | Same as IPL |
| HUN | The Hundred | 8 | 100-ball | 3 | 16 | 4 | GBP k 2000 | 1 Aug | 8 | Top 3 (Eliminator, Final) |
| ILT20 | International League T20 | 6 | T20 | 9 | 21 | 17 | USD k 2500 | 22 Nov | 10 | Same as IPL |
| MLC | Major League Cricket | 6 | T20 | 6 | 19 | 9 | USD k 1500 | 12 Jun | 10 | Same as IPL |
| CC1 | County Championship Div 1 | 10 | 4-day | 2 | 28 | 2 | none | 3 Apr | 14 | None; bottom 2 relegated |
| CC2 | County Championship Div 2 | 8 | 4-day | 2 | 28 | 2 | none | 3 Apr | 14 | None; top 2 promoted |
| SHF | Sheffield Shield | 6 | 4-day | 0 | 26 | 0 | none | 15 Oct | 10 | Final (top 2) |
| INTL | International | 21 | Test, ODI, T20I | – | – | – | – | all year | – | – |

- National teams: India, Australia, England, South Africa, New Zealand, Pakistan, Sri Lanka, West Indies, Bangladesh, Afghanistan, Ireland, Zimbabwe (the 12 Test nations), plus Netherlands, Scotland, Nepal, USA, UAE, Namibia, Oman, Canada and Italy.
- **ICC events** (from `W.ICC` in `world.js`; months there are 0-based, and October or later counts as the previous calendar year):
  - WTC Final at The Oval, Jun 2027
  - ODI World Cup in South Africa, Oct 2027 (14 teams)
  - T20 World Cup in Australia, Oct 2028 (20 teams)
  - Champions Trophy in India, Feb 2029 (8 teams)
  - WTC Final at Lord's, Jun 2029
  - T20 World Cup in England, Jun 2030
  - WTC Final at The Oval, Jun 2031
  - ODI World Cup in India, Oct 2031
  - After that, the 2029–2032 pattern repeats with rotating hosts.
- ICC formats: T20 WC has 4 groups, then Super 8 (two groups), semi-finals and final. ODI WC has 2 groups, then Super Six, semi-finals and final. CT has groups, semi-finals and final. The WTC Final is the top two of the WTC table, played as a Test; a draw means a shared title.
- **Bilateral tours are generated by the game** each season. They are not the real ICC Future Tours Programme.

### In career and matches
- **Before a match:** pick the XI and batting order, captain and keeper, read the pitch report, then the toss.
- **Batting:** each batter has an approach (Auto, Block, Defend, Normal, Attack, Slog).
- **Bowling:** choose the bowler every over (or let the computer), set fields (Auto, Attacking, Normal, Defensive).
- **Test controls:** declare, enforce the follow-on, take the new ball. There are sessions, days, rain and over-rate loss.
- **Engine extras:** DRS reviews, super overs, dew, overcast conditions, reverse swing, dropped catches, extras, all dismissal types.
- **Match screens:** ball-by-ball commentary, a 2D field view with fielders and shot lines, full scorecards, and charts (runs per over, the worm, scoring shots).
- **Speed controls:** play ball by ball, auto-play at 4 speeds, skip to the next wicket, session or innings, or sim the rest.
- **Squad building:**
  - Franchise teams: IPL retentions (with mega-auction rules every 3 years) and a live auction against AI teams.
  - National teams: the user picks a squad before every tour and ICC event.
  - County and Shield teams: sign free agents.
- **The wider world:**
  - Tables, results and stats leaderboards
  - Team rankings in Test, ODI and T20I (Elo-style, shown on an ICC-like scale)
  - World Test Championship table, seeded with the real table
  - Records and an honours list
  - An inbox and a news feed
- **Seasons:** player form, fatigue and injuries, ageing, development, about 100 retirements a year, and about 150 generated young players a year.

## 5. Architecture

### Why it is built this way
- The original build machine could not reach Google's Maven or Gradle servers, so there is **no Android Studio or Gradle project**. The APK is built with Debian command-line tools (`aapt`, `javac`, `dx`, `zipalign`, `apksigner`). See section 10.
- All game logic is web code. It runs the same in desktop Chromium, in Node for tests, and in Android WebView.

### Folder layout (repository root)
```
skipper-cricket-manager/
  README.md               overview, install, build, tests (start here for humans)
  .gitignore              ignores build output, generated keys, test screenshots
  .gitattributes          line endings (LF for scripts), binary files, data.js marked generated
  docs/
    CONTEXT.md            THIS FILE: full technical context
    NOTES.md              build notes and research facts
    UPLOAD_TO_GITHUB.md   how the owner uploads the repo
    screenshots/          README screenshots (regenerate with tools/ui/make_screenshots.py)
  releases/
    Skipper-1.0.0.apk     ready-to-install build (versionCode 2)
  www/                    THE GAME (copied into the APK as assets/www)
    index.html            loads CSS and scripts in a fixed order, then SK.App.boot()
    css/app.css           all styles (design tokens, components)
    fonts/                Barlow + Big Shoulders Display (woff2, OFL licences)
    js/
      data.js             GENERATED squads database (window.SKIPPER_DB); do not edit by hand
      util.js             SK.U: seeded RNG, dates, number formats, LZW compress
      engine.js           SK.FORMATS, SK.PITCH, SK.R (ratings), SK.Sel (selection), SK.Match (ball-by-ball engine)
      db.js               SK.DB: turns SKIPPER_DB into player/team objects, flags, overseas rules
      names.js            SK.NAMES: name pools per country for generated youth players
      world.js            SK.World (W): calendar, schedules, editions, fixtures, tables, ICC, rankings, WTC,
                          records, stats, injuries, duty, season rollover
      auction.js          SK.Auction (A): salaries, AI releases, retentions, the AuctionRun (AI + interactive)
      career.js           SK.Career (C): board targets, confidence, reviews, sackings, offers, stored scorecards
      app.js              SK.App: boot, save/load, Continue loop, routing after stops
      ui/core.js          SK.UI: tiny screen framework, sheets, toasts, confirm, busy overlay, components
      ui/store.js         SK.Store: settings, save slots, custom DB, file export/import (Android bridge or browser)
      ui/match.js         SK.MatchUI: pre-match, toss, live match, scorecards, charts, field view
      ui/menu.js          main menu, new career, quick match, tournament, saves, settings, help
      ui/hub.js           SK.Hub: home, squad, fixtures, tables, world, player, inbox, news, career, reports, reviews
      ui/auction_ui.js    SK.AuctionUI: national squad pick, retentions, auction screens, county signings
      ui/editor.js        SK.Editor: squad editor + quick edit of a player inside a career
  data_src/               HUMAN-EDITABLE DATA
    squads.txt            competitions, teams, squads, national preferred squads
    players_ind.txt, players_aus.txt, players_eng.txt, players_world.txt, players_assoc.txt
  android/
    AndroidManifest.xml
    src/com/jamil/skipper/MainActivity.java
    res/                  icons (legacy + adaptive), colours, theme, strings
    (build/, assets/, keys/ are created by the build and git-ignored)
  tools/
    build_data.js         data_src -> www/js/data.js (validates names and duplicates)
    build_apk.sh          build + align + sign the APK
    make_key.py           recreates the signing key deterministically
    make_icons.py         draws the launcher icons
    sim_test.js           engine calibration (averages by format)
    engine_check.js       engine consistency checks (720 matches)
    world_test.js         headless multi-season career
    auction_test.js       AI auction economy report
    ui/harness.py         Playwright helper (phone-sized Chromium, console errors, screenshots)
    ui/drive.py           plays whole careers through the real screens
    ui/t1..t16_*.py       UI test scenarios
    ui/make_screenshots.py  regenerates docs/screenshots
```

### Script load order (important)
`data.js → util → engine → db → names → world → auction → career → ui/core → ui/store → app → ui/match → ui/menu → ui/hub → ui/auction_ui → ui/editor`, then an inline `SK.App.boot()`.

- `app.js` must load **before** `ui/match`, `ui/menu`, `ui/hub`, `ui/auction_ui` and `ui/editor`, because they read `SK.App` when they load.
- Everything hangs off `window.SK`. The engine and world files also run in Node: set `globalThis.window = globalThis` before requiring them (the test scripts do this).
- JS style: classic scripts, ES2019 (arrow functions, classes, `flatMap`, `Object.fromEntries`). No modules, no bundler, no framework, no CDN.

## 6. Data

### `data_src/squads.txt`
- `COMP|id|name|format|homeCC|overseasMaxXI|matchesPerTeam|playoff|startMonth|currency|purse|squadMax|overseasMaxSquad`
- `TEAM|id|name|short|colour1|colour2|city|venue|pitchCode|captainName`, followed by a line of comma-separated player names (the squad).
- `PREF|NATION|FORMAT|names…`: the real recent national squad for that format (format is `TEST`, `ODI` or `T20I`). The captain is marked with `*`. Selection gives these players a bonus for about the first 13 months of a career, so early national squads match reality.
- Pitch codes: `F` flat road, `B` balanced, `G` green seamer, `D` dry turner, `P` pace and bounce, `S` slow and low.

### `data_src/players_*.txt`
- Full line: `Name|CC|YOB|bat hand|bowl type|role|technique/power|bowling/control|fielding (or keeping)|flags`
  - Example: `MS Dhoni|IND|1981|R|-|WK|60/80|-|78|rX`
- Short line for minor players: `Name|CC|ROLE[|BOWL]`. Ratings are generated.
- Bowl types: `RF RFM RM LF LFM LM OB LB SLA LWS -`. Roles: `BAT WK AR BWL`. Ratings run 0–99. Test-class players sit around 70–85.
- Flags (comma-separated):

| Flag | Meaning |
|---|---|
| `rT`, `rO`, `rI` | Retired from Tests / ODIs / T20Is |
| `rX` | Retired from all international cricket (can then play more leagues) |
| `wb`, `rb` | White-ball or red-ball specialist |
| `noipl` | Not available for the IPL |
| `out` | Retired completely |
| `loc=XXX` | Counts as a local player in country XXX (for example, a county Kolpak-style player) |

- Run `node tools/build_data.js` to regenerate `www/js/data.js`. It validates names and duplicates and prints team counts.

### Generated database (`window.SKIPPER_DB`)
```js
{ version: "2026-10-20",
  players: [[name, cc, yob, hand, bowl, role, bt, bp, bw, be, fd, flags, generated], ...],
  comps: [{ id, name, fmt, home, osXI, mpt, playoff, month, cur, purse, squadMax, osSquad,
            teams: [{ id, name, short, c1, c2, city, venue, pitch, cap, squad: [playerIndex...],
                      pref?: {TEST:[...], ODI:[...], T20I:[...]}, caps?: {TEST: idx, ...} }] }] }
```
- The squad editor saves an edited copy (storage key `db`). On boot it replaces `SKIPPER_DB`, and the original is kept as `SKIPPER_DB_BASE`.

### Research facts behind the squads (as of 20 Oct 2026)
- **IPL:** 2026 squads plus trades: Pant LSG→DC, Kuldeep DC→LSG, Natarajan DC→SRH, Zeeshan Ansari SRH→DC. RCB won IPL 2026 (beat GT). The IPL 2027 mini-auction is on 16 Dec 2026 in Goa.
- **International:** India won the T20 World Cup 2026 (beat NZ in the final).
  - Root is back as England Test captain (Jul 2026). Stokes retired from international cricket (Jun 2026). Fleming is England Test coach.
  - Williamson and Khawaja have retired from international cricket.
- **SA20:** 2027 squads after the 7 Oct 2026 auction.
- **CPL:** 2026 had 7 teams, including Jamaica Kingsmen.
- **PSL:** season 11 has 8 teams, including Rawalpindiz (ex-Multan), Hyderabad Houston Kingsmen and Sialkot Stallionz.
- **The Hundred 2026:** MI London (ex Oval Invincibles), Manchester Super Giants, Sunrisers Leeds, London Spirit, Southern Brave, Trent Rockets, Welsh Fire, Birmingham Phoenix.
- **County 2026:**
  - Div 1: Somerset, Notts, Warwickshire, Sussex, Yorkshire, Surrey, Glamorgan, Essex, Leicestershire, Hampshire.
  - Div 2: Durham, Northants, Kent, Middlesex, Derbyshire, Worcestershire, Lancashire, Gloucestershire.
- **Player ratings, potentials and salaries are estimates by the AI, not official data.**

## 7. Game systems

### Calendar
- Day 0 is **1 Nov 2026**, and every career starts then. Dates are stored as day numbers (`w.date`).
- Season `S` runs from 1 Oct of year S−1 to 30 Sep of year S. Season rollover runs on 30 Sep.
- Each competition has a fixed window (`W.WINDOWS`).
  - The IPL auction is on 16 Dec. Other leagues hold their auction 25 days before they start.
  - IPL retentions close 31 days before the IPL auction.
- A **queue** of fixtures and events, sorted by date, drives everything. `W.advance()` plays AI matches in the background and stops when the user is needed:
  - before a user match
  - a national squad pick
  - an IPL retention
  - an auction
  - a review alert

### Selection and availability
- `SK.Sel.pickXI()` picks a balanced XI from a role template (openers, middle order, keeper, all-rounders, pace and spin), within overseas limits and suited to the pitch.
- **National teams:**
  - The pool is every player with that country code.
  - Squads (15–18) are chosen per tour and per format.
  - Picked players are "on duty" for the tour dates, so they miss league games.
- **League eligibility (`A.eligible`):**
  - Indian players only play the IPL unless they have retired from internationals (`rX`).
  - No Pakistan players in the IPL. A player can't be in both the PSL and the IPL.
  - Overseas signings need a T20 rating of at least 60.
  - League limits per player: 2 leagues normally, 4 for white-ball specialists or players who no longer play Tests, 6 for players retired from internationals.
  - ILT20 locals must be from the UAE.

### Match engine (`SK.Match`, in `engine.js`)
- **How each ball is decided:**
  - Outcome probabilities come from the batter's approach (1 Block to 5 Slog), using a run table and a wicket table.
  - These shift with the batter-versus-bowler skill gap: asymmetric exponential with `K` 0.028 (batter better) and `KN` 0.016 (bowler better).
  - Conditions also shift them: pitch seam, spin, bounce, flatness and wear, overcast, dew, ball age, reverse swing.
  - So do fields, the powerplay and death overs, and the phase of a Test.
- **Parameters:** `SK.ENGINE_PARAMS = { K: 0.028, KN: 0.016, OFF: 2, W: [0.0062, 0.0100, 0.0150, 0.046, 0.080], RUN: [...] }`
- **Main API:**
  - `doToss(call, callerSide)`, `tossDecide('bat'|'bowl')`, `next()` (one ball), `simToEnd(maxBalls)`, `resolvePendingAI()`
  - `chooseBowler(pid)`, `setAggression(pid, 1..5|null)`, `setField(side, 'A'|'N'|'D')`, `setBattingOrder(side, pids)`
  - `declare()`, `enforceFollowOn(bool)`, `takeNewBall()`, `canTakeNewBall()`, `fieldPositions(inn)`
- **Main properties:**
  - `phase` ('pre' | 'play' | 'done'), `pending` ({type: 'bowler' | 'followon'}), `inns[]`, `cur`, `result` {kind, winner, by, margin, text}, `mom`, `events[]` (each with `seq`)
  - `inns[i].card`, `.bw`, `.overs`, `.fow`, `.log`
- **Calibration results (Node, hundreds of matches):**

| Format | Typical result |
|---|---|
| T20 | First innings: median 184, about 6 wickets. 100s 0.27 per match. Openers not out 12–17% of innings, average 35–40, strike rate about 150 |
| ODI | About 262 for 8.5 |
| Test | About 317 for 9.8 per innings, run rate 3.35, 7–11% draws |
| FC4 | About 318 for 9.8, about 20% draws |

- `tools/engine_check.js` checks 720 matches for consistency (scores add up, overs and maidens are right, and so on). Result: **0 problems**.

### Auctions and retentions (`auction.js`)
- **Salaries:** generated from player value the first time a league is used. They are scaled once so each team's total is at most 74% of the purse. Purse = league purse minus salaries.
- **IPL rules:**
  - Squad 18–25. Max 8 overseas (4 in the XI). Purse ₹125 Cr. Base price ₹0.3 Cr (purse × 0.0024).
  - **Mega auction** in 2028, 2031 and so on (season ≥ 2028 and (season − 2028) divisible by 3): teams keep at most 5 players, at most 2 of them overseas.
- **AI releases:** about 26% of the squad plus 0–3 extra. Released players are the bottom third by value, plus anyone overpaid, aged 38+ with low value, 41+, injured long-term, or valued under 62.
- **AI bidding:** a team's maximum bid = price from value × squad need × budget factor × random 0.72–1.32.
  - Budget factor = √(purse per open slot ÷ 2.5% of the league purse), limited to 0.6–2.4.
  - One player can take at most 45% of the purse still available.
- **Order of players:** the 10 marquee players first, then batters, keepers, all-rounders and bowlers.
- **Accelerated round:** after the main auction, AI squads are filled at base price up to the squad maximum minus 1. The user's squad is only filled up to the minimum.
- **Measured results (`node tools/auction_test.js`):**
  - IPL 2027 mini-auction: about ₹143 Cr spent in total, top buys ₹10–17 Cr, squads end at 24–25.
  - 2028 mega auction: about ₹695 Cr spent, top buy about ₹30 Cr.
- **Interactive API:** `run = new A.AuctionRun(w, comp, season); run.interactive = true;` then `startLot()`, `aiStep()` (returns `{state: 'user'|'sold'|'unsold', next}`), `userBid()`, `userPass()`, `simAll()`, `finish()`.

### Career and board (`career.js`)
- **Board targets** are based on the team's strength rank. Possible targets:
  - Leagues: win the title, reach the playoffs, top half, avoid finishing last
  - Counties: win promotion, avoid relegation
  - Series: win the series, avoid losing it, avoid a whitewash
  - ICC events: reach the final, semi-finals or next stage, win at least one match
- **Confidence:**
  - Starts at 60.
  - Per match: win +2.4, loss −2.4, adjusted for the strength gap. Finals count ×2.5, other knockouts ×1.6.
  - Per competition: beat the target +16, met +9, missed −14, badly missed −26, title +14.
- **Reviews:** at the end of each league or ICC event the user plays in, and at season end for national teams. **Sacked if confidence is below 22.**
- **Reputation (5–99):**
  - Starts at the team's reputation − 5, limited to 25–80.
  - Moves: +7 for a title, ±2 for a met or missed target, −8 when sacked, −3 for resigning.
- **Job offers:**
  - After a good review: a 55% chance of 1–2 offers, if confidence is at least 45.
  - When sacked or unemployed: 2–4 offers. Offers expire after 40 days.
  - National jobs need reputation 55+ (72+ for the strongest nations).

### Season rollover (30 Sep)
- Players develop or decline with age and potential.
- Retirements and generated youth players happen.
- County and Shield squads are refilled, the WTC is reset when a cycle ends, and next season is scheduled.
- Old seasons are pruned: fixtures and stats from finished old competitions are deleted. The user's last 30 scorecards are kept.

## 8. Code guide

### Save game ("world") object
Top-level keys:
- `v` (1), `id`, `seed`, `date`, `mode` ('career' | 'tournament'), `dbVersion`
- `players[]`, `teams{key}`, `comps{id}`, `editions{id}`, `fx{id}`
- `queue[]`, `agenda[]` (events), `news[]`, `inbox[]`
- `records{TEST, ODI, T20I, FC, T20, HUN}`, `history{}`, `rank{TEST, ODI, T20I}`, `wtc{cycle, table, finalSeason}`
- `user{}`, `nextId`, `settings{auctions, autoSave}`, `busy{}`

Main parts:
- **Player:**
  - `id`, `name`, `cc`, `yob`, `hand`, `bowl`, `role`
  - Ratings: `bt` (technique), `bp` (power), `bw` (bowling), `be` (control), `fd` (fielding or keeping)
  - Flags: `ret{T, O, I, X, WB, RB, OUT, NOIPL}`, `loc[]`
  - Condition: `pot`, `form`, `fatigue`, `injury` (days)
  - Stats: `stats{TEST|ODI|T20I|FC|T20|HUN: {m, i, no, r, b, hs, hsno, c100, c50, d0, f4, f6, bb, rc, w, bbw, bbr, w5, w10, md, ct, st}}`
  - Teams: `teams{compId: teamKey}` (counties also use the shared key `CC`), `sal{compId: amount}`
  - Other: `duty[[from, to, tag]]`, `retired` (year), `hist`
- **Team:**
  - Key format `COMP:ID` (for example `IPL:CSK`, `INTL:IND`, `CC1:SUR`)
  - Fields: `name`, `short`, `c1`, `c2`, `city`, `venue`, `pitch`, `cap`, `squad[ids]`, `purse`, `rep`, `strength`
  - National teams have an empty `squad`; their pool is every player of that country. They also have `pref`, `caps` and `cc`.
- **Edition (one competition season):**
  - Common: `id`, `comp`, `season`, `name`, `type` ('league' | 'series' | 'icc'), `teams`, `fixtures`, `status` ('scheduled' | 'live' | 'done'), `start`, `stats{pid: …}`, `table`, `champion`, `awards`
  - Series also have `legs[{fmt, n, fixtures, score}]` and `squads{teamKey: {fmt: [ids]}}`.
  - ICC events also have `icc`, `groups`, `super`, `stage` and `squads`. A drawn WTC final sets `shared`.
- **Fixture:**
  - `id`, `ed`, `comp`, `date`, `fmt`, `home`, `away`, `venue{name, city, cc, pitch}`, `stage`, `no`, `neutral`, `ko`, `status`
  - `result{winner, kind, by, margin, text, mom, toss, inns[{team, runs, wkts, balls, dec, fo}], tops[{t, pid, team, …}]}`
  - `card` (compact scorecard, user matches only)
- **User (career):**
  - `name`, `team`, `rep`, `conf`, `history[]`, `offers[{team, expires}]`, `objectives{edId: {target, finish, met, …}}`, `titles[]`, `played`, `won`, `lost`
  - `alert` ({type: 'edition' | 'sacked' | 'offers' | 'season'}), `lineup{teamKey:fmt → {xi, cap, wk}}`
  - Tournament mode: `oneSeason`, `oneEd`, `onlyEd`, `finishedTournament`
- **Queue item:** `{date, kind: 'fx'|'ev', id, ord}`. Event types: `edStart`, `seriesStart`, `iccCreate`, `retention`, `auction`, `seasonEnd`.

### Key world functions (`SK.World`)
- **Create and run:**
  - `W.create({userTeam, manager, mode, settings, seed})`
  - `W.advance(w, {budgetMs, until})` → `{stop: 'user'|'budget'|'until'|'empty', type, fx|ev|ed}`
  - `W.needsUser`, `W.peekNext`, `W.peekNextStop`
- **Matches:** `W.buildMatch(w, fx, opts)`, `W.simFixture`, `W.applyMatch(w, fx, match)`
- **Selection:** `W.selectNationalSquad(w, key, fmt, size)`, `W.assignDuty`, `W.topUpSquads`
- **Tables and stats:** `W.sortTable(ed, keys)`, `W.nrrFor`, `W.leaderboards(w, ed, n)`, `W.wtcStandings`
- **Helpers:** `W.fixtureTitle`, `W.age`, `W.natKey(cc)`, `W.mail(w, title, body)`, `W.addNews(w, text)`
- **Seasons:** `W.seasonRollover`

### App flow (`app.js`)
- `SK.App.continue()` calls `W.advance` in short chunks while showing a busy overlay with a Stop button.
- When it stops, `App.handleStop()` opens one of these screens:
  - `prematch` for a match
  - `natSquad` for a squad pick
  - `retention`
  - `auctionIntro`
- `App.handleAlert()` opens `review` or `tournamentDone`.
- After a user match: `MU.finishMatch` → `W.applyMatch` → `App.afterUserMatch` → `matchReport`.
- Autosave runs after every stop and match, when the app is paused (except during a match or an auction), and when returning to the menu.

### UI framework (`ui/core.js`)
- Register a screen:
  ```js
  UI.register(name, { title, sub(p, st), tabs, cls, back: false, right(p, st),
                      render(p, st) -> HTML string, mount, unmount, onBack(p, st) -> true if handled,
                      actions: { act(arg, el, params, state, ev) } })
  ```
- Navigation: `UI.go(name, params, {replace, reset})`, `UI.back()`, `UI.refresh()`.
- Clicks use `data-act` + `data-arg` attributes. Inputs use `data-change` (handler gets `(value, el)`).
- Overlays:
  - `UI.sheet(html, actions)` opens a bottom sheet with its own action map.
  - `UI.confirm({title, body}, okText, cancelText, danger)` returns a Promise of true or false.
  - `UI.toast(msg)` shows a short message. `UI.busy(on, text, sub)` shows the busy overlay.
- Components: `UI.badge(team, size)`, `UI.seg(act, options, value)`, `UI.toggle`, `UI.rbar`, `UI.stars`, `UI.formArrow(form, quiet)`, `UI.icons`.
- Bottom tabs: home, squad, fixtures, tables, more.

### Screens
| File | Screens (params) |
|---|---|
| menu.js | `menu`, `newCareer`, `quickSetup`, `tournSetup`, `tournamentDone`, `saves`, `settings`, `help` |
| hub.js | `home`, `squad`, `fixtures`, `tables {ed}`, `worldHub`, `more`, `player {pid}`, `inbox`, `news`, `career`, `matchReport {fx}`, `review {alert}` |
| match.js | `prematch {ctx}`, `live {ctx}`, `quickResult`, `scorecard {fx}`; ctx = `{kind:'career', fxId}` or `{kind:'quick', teams, fmt, venue, userSide, title}` |
| auction_ui.js | `natSquad {ed, ev}`, `retention {ev}`, `auctionIntro {ev}`, `auction` (state in `SK.App.auction`), `auctionDone {comp, season, buys, top}`, `signings` |
| editor.js | `editor`, `edFind {q}`, `edComp {comp}`, `edTeam {comp, team}`, `edPlayer {pid, cid, tid, cc}` |

### Storage (`ui/store.js`)
- **Keys:** `settings`, `db` (edited squads), and `game:<slot>` + `meta:<slot>` for each slot.
  - Slots: `auto`, `slot1`, `slot2`, `slot3`.
- **On Android:** the bridge writes plain JSON files to the app's private `files/saves/`.
- **In a browser:** `localStorage` with the prefix `skipper:` and LZW compression.
- **Save size:** about 4–4.5 MB of JSON after 3–5 seasons (about 0.5 MB compressed).
- **Settings defaults:** speed normal, choose bowlers yourself on, set fields yourself off, autosave on, auctions on, field view on, keep the screen on during matches.

## 9. Android wrapper (`MainActivity.java`)
- A full-screen WebView loads `file:///android_asset/www/index.html`.
  - JavaScript and DOM storage are on. Text zoom is fixed at 100%. Orientation is locked to portrait.
  - Status and navigation bars use the board green colours.
- JS bridge `window.AndroidBridge`:
  - `save(name, data) → boolean`, `load(name) → string ('' if missing)`, `remove(name)`
  - `exportFile(filename, text)` opens the system "create document" picker, then calls `window.__onExportDone(ok)`.
  - `importFile()` opens the system "open document" picker, then calls `window.__onImportReady(ok)`; JS then reads the text with `takeImported()`.
  - `keepScreenOn(bool)`
- **Back button:** calls `window.__onBack()`. If that returns false (nothing left to close), the app moves to the background.
- **Pause:** calls `window.__onPause()` (autosave).
- **No lambdas in Java.** The `dx` dexer used here can't handle them; use anonymous classes.
- Compiled against the API 23 jar. minSdk 21, targetSdk 34.
- **Icons:** original art (three stumps, bails, a red ball on board green). Legacy PNG icons plus an adaptive icon (`mipmap-anydpi-v26`).

## 10. Build and signing
- **Tools (Debian or Ubuntu):**
  `apt install aapt apksigner zipalign dalvik-exchange android-sdk-platform-23 android-framework-res openjdk-17-jdk-headless python3-cryptography`
- **Build:** `bash tools/build_apk.sh <versionName> <versionCode>`. The script:
  - copies `www` into `android/assets/www`
  - runs `aapt package`, then `javac --release 8` against the android-23 jar
  - runs `dalvik-exchange` (dx), `aapt add`, `zipalign -p 4`, then `apksigner` (v1 + v2 + v3 signatures)
- **Paths:** the tool scripts find the project from their own location, so the repo can live in any folder.
- **Signing key:**
  - `tools/make_key.py` recreates the same RSA key and certificate every time from a fixed passphrase.
  - Certificate SHA-256: `89299cba1a014f62b70d8a72d5eef2a076d96bc491ca7b05206bd13052d8bee7`
  - This is why new builds install over old ones without losing saves.
  - This shortcut is fine only because the app is personal and unpublished.
- **Version history:**
  - versionCode 1 = 0.9.0 (early)
  - versionCode 2 = 1.0.0
  - **The next build must use versionCode 3 or higher**, or Android refuses the update.
- **Using Android Studio instead:**
  - Put `www/` in `app/src/main/assets/www` and use `MainActivity.java` as is.
  - Keep the package `com.jamil.skipper`.
  - Sign with the same key (`keys/skipper.pk8` + `keys/skipper.x509.pem` from `make_key.py`; convert to a keystore with `openssl pkcs12` if needed). Otherwise the phone needs an uninstall, which deletes saves.

## 11. Testing
- **Node (headless):**
  - `node tools/engine_check.js`: consistency over 720 matches.
  - `node tools/sim_test.js T20 400`: averages by format. Set `POS=1` for stats by batting position, or `EP='{...}'` to try engine parameters.
  - `node tools/world_test.js 5 INTL:IND`: a multi-season career. One season takes about 3–6 seconds.
  - `node tools/auction_test.js IPL 2027`: the AI auction report.
- **Playwright (Python, Chromium, phone-sized 390×844 screen):**
  - `tools/ui/harness.py` loads the game and records console errors and screenshots.
  - `tools/ui/drive.py` plays a whole career through the real screens.
  - Tests `t1`–`t16` cover the menu, career start, retention and auction, a live match, a Test with declarations, the tournament, the editor, saves, settings and help.
  - `python3 tools/ui/make_screenshots.py` refreshes the README screenshots in `docs/screenshots/`.
  - Test screenshots go to `tools/ui/shots/` (git-ignored). Set `SKIPPER_SHOTS` to change the folder.
- **Results before 1.0.0:**
  - Full careers through the UI with **0 JS errors**: 2 IPL seasons (including a sacking), 2 England seasons, 2 Surrey seasons, a Hundred season, and a full T20 World Cup.
  - Headless: 5 seasons with India and 3 with RCB.
- **Never tested on a real Android phone or emulator.** The Android-only parts are unverified: saving to files, export and import pickers, the back button, keeping the screen on, and speed on a phone.

## 12. Design system
- **Colours:**
  - Board green `#10261F` (background), panel `#173329`, panel 2 `#1F4034`, deep `#0B1D17`, lines `#2A4A3E`
  - Chalk text `#EEF1E8` / `#B7C5BA` / `#7F968A`
  - Straw `#D9C27E` marks anything you can tap. Red `#E0564D` means wickets. Green `#6CC08A` means runs.
- **Fonts:** Big Shoulders Display (titles, scores) and Barlow (body text, with tabular numbers). Both are bundled offline under the OFL licence.
- **Layout:** mobile first, max width 600 px, a bottom tab bar, a fixed bottom "dock" for the main action, and bottom sheets for choices.
- **Copy rules:**
  - Plain English and sentence case.
  - No all-caps labels, no middle-dot (·) separators, no arrows on buttons.
  - Buttons say exactly what happens, for example "Confirm squad".

## 13. Known bugs and limitations
1. **Not tested on a device** (see section 11). This is the biggest risk.
2. **Squad editor pitch labels are swapped.** In `www/js/ui/editor.js` (the `pitches` array in `E.teamSheet`), `B` is shown as "Bouncy" and `P` as "Balanced". It should be `B` = "Balanced" and `P` = "Pace and bounce".
3. **The auction is not saved while it is running.** If the app is closed mid-auction, it restarts from the auction day screen with nothing bought.
4. **IPL salaries are generated, not real contract values.** In one test career, Rohit Sharma showed ₹3.5 Cr against a real ₹16.3 Cr. Ratings and potentials are estimates too.
5. **Bilateral tours are generated,** not the real Future Tours Programme. ICC hosts and years follow the real calendar to 2032.
6. **Not in the game:** Ranji Trophy and other Indian domestic cricket, BPL, LPL, women's cricket, and NZ, SA and WI domestic first-class. There are no real logos or kits, only team colours.
7. **Inbox clutter:** taking a new job sends one "Board target" message for every scheduled competition at once.
8. **Confusing names in one-off tournaments:** they use the start year, so a T20 World Cup started now is called "ICC T20 World Cup 2026", the same as the real one.
9. **Saves keep growing:** about 150 new players a season, and retired players are never deleted. Fine for about 10 seasons. Long careers may need retired players' details trimmed.
10. **No save migrations:** saves have `v: 1` but no code to upgrade older saves. Add one before changing the save format.
11. **Needs an up-to-date Android System WebView,** because the code uses ES2019 features.
12. **Simplifications:** the user always calls the toss. Mega-auction top prices can go slightly above the real record (about ₹30 Cr against ₹27 Cr).
13. **Data age:** squads are frozen at 20 Oct 2026. The real IPL 2027 retentions (mid-Nov 2026) and auction (16 Dec 2026) will make the IPL data stale.

## 14. Suggested next steps (in priority order)
1. Install 1.0.0 on Jamil's phone. Fix anything that fails in saving, export and import, the back button or speed.
2. Fix the editor pitch labels (bug 2).
3. After 16 Dec 2026, update the IPL squads (and real salaries, if wanted) in `data_src`, rebuild `data.js` and ship versionCode 3.
4. Save auction progress so it survives the app closing.
5. Add the competitions he might want: Ranji Trophy, BPL, LPL, women's cricket.
6. Gameplay depth: plans per bowler, player morale and training, contracts and renewals, a youth academy, press conferences.
7. If Continue feels slow on the phone, move the world simulation into a Web Worker.

## 15. Rules for whoever continues
- Keep it **fully offline**: no CDN, no network calls, everything inside `www/`. It must work from `file://` in Android WebView.
- No build step for the game: plain classic scripts. Keep the script load order (section 5).
- Never edit `www/js/data.js` by hand. Edit `data_src/` and run `node tools/build_data.js`.
- Keep the package `com.jamil.skipper` and the same signing key. Raise `versionCode` on every build.
- No lambdas in `MainActivity.java`. It compiles against API 23.
- Run the Node tests and at least one Playwright career run before sending a new APK. Check that there are 0 console errors.
- Follow the design and copy rules in section 12.
- Be honest with Jamil about what was and wasn't tested.
- After each working change: commit to the GitHub repo, update the versions table in `README.md`, and put the new APK in `releases/`.

## 16. How the IPL auction works (what Jamil was told)
1. Start an IPL career with **"Run my own auctions"** on (the default). If it's off, the computer does it.
2. Press **Continue** on Home. The game stops at retentions in mid-November and at the auction on 16 December.
3. **Retentions:** tap a player to switch between Keep and Release. The analysts have pre-marked suggestions. Released salaries go back into the purse. Press **Confirm**.
4. **Auction day:** release more players if needed. Then choose **Go to the auction** (bid yourself) or **Analysts bid for me**.
5. **Bidding:** one player at a time.
   - **Bid ₹X** raises by one step, and rival teams answer at once. If nobody tops your bid, you sign him.
   - **Pass** skips him.
   - The game skips players you can't afford or have no squad or overseas room for.
6. **Shortcuts:**
   - **Upcoming:** tap players to list them as targets.
   - **Finish → Skip to my next target:** passes on everyone until a listed player comes up.
   - **Finish → Analysts bid for me:** the computer finishes the auction for you.
   - **Finish → Stop buying:** the other teams finish without you.
7. **Rules:**
   - Squad 18–25, max 8 overseas (4 in the XI). Under 18 at the end, the game adds cheap local players.
   - Mega auction every 3 years (2028, 2031 and so on): keep at most 5 players, at most 2 overseas.
8. **Tips:**
   - Overseas slots are the real limit.
   - Don't blow the purse on the first 10 (marquee) players.
   - Stars usually go for ₹10–30 Cr, most others ₹0.3–3 Cr.
   - Don't close the app mid-auction.
