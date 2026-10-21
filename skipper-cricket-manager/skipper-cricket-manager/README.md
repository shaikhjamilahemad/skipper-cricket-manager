# Skipper — cricket manager for Android

An offline cricket management and gameplay app in the style of *Cricket Captain*.
Real squads as of 20 October 2026, every major T20 league, Test cricket, a full career mode, and ball-by-ball captaincy.

Personal project. Not published on the Play Store.

| Menu | Career home | Auction | Live match |
|---|---|---|---|
| <img src="docs/screenshots/1-menu.png" width="200"> | <img src="docs/screenshots/2-home.png" width="200"> | <img src="docs/screenshots/3-auction.png" width="200"> | <img src="docs/screenshots/4-live-match.png" width="200"> |

| Scorecard | Charts | National squad |
|---|---|---|
| <img src="docs/screenshots/5-scorecard.png" width="200"> | <img src="docs/screenshots/6-charts.png" width="200"> | <img src="docs/screenshots/7-national-squad.png" width="200"> |

## Features
- **Career mode:** coach any IPL, BBL, PSL, SA20, CPL, Hundred, ILT20, MLC, County Championship (Div 1 and 2) or Sheffield Shield team, or any of 21 national teams.
  - The board sets targets each season.
  - You can be sacked, or headhunted by other teams.
- **Formats:** Test, 4-day first-class, ODI, T20 and The Hundred.
- **Captaincy on every ball:**
  - Batting approach per batter, bowling changes and field settings
  - Declarations, follow-on, new ball and DRS
- **Match screens:** ball-by-ball commentary, a 2D field view, full scorecards, and charts (runs per over, the worm, scoring shots).
- **IPL-style retentions and live auctions** against AI teams, with a mega auction every 3 years.
- **National squads:** you pick the squad for every tour and every ICC event.
- **ICC events:** T20 World Cups, ODI World Cups, the Champions Trophy, and the World Test Championship with its final.
- **The wider world:** rankings, records, an honours list, ageing, retirements, and new young players every season.
- **Other modes:** quick match, single tournaments, and a squad editor with JSON import and export.
- **Fully offline:** no ads, no internet, no Android permissions.

## Install on an Android phone
1. Copy `releases/Skipper-1.0.0.apk` to the phone and open it.
2. Allow installs from this source when Android asks. The app isn't from the Play Store, so this warning is expected.
3. Newer APKs from this repo install over older ones and keep your saves, because they share the same signing key.
4. **Uninstalling deletes your saves.** Export them first: Load and save → Export.

## Play on a computer
Open `www/index.html` in Chrome or Edge. Saves go to the browser's local storage.

## Project layout
```
www/          the game: HTML, CSS, JavaScript, fonts (packed into the APK as assets)
data_src/     squads and player ratings as plain text (edit these)
android/      Android wrapper: MainActivity.java (WebView + save-file bridge), manifest, icons
tools/        data builder, APK build script, signing key script, tests (Node and Playwright)
docs/         CONTEXT.md (full technical context: read this first), NOTES.md, screenshots
releases/     ready-to-install APK
```

## Build the APK
You need Linux (Debian, Ubuntu, or WSL on Windows).
```bash
sudo apt install aapt apksigner zipalign dalvik-exchange android-sdk-platform-23 \
                 android-framework-res openjdk-17-jdk-headless python3-cryptography nodejs
bash tools/build_apk.sh 1.0.1 3        # versionName, versionCode
# output: android/build/skipper.apk
```
- **Always raise the versionCode.** 1.0.0 used code 2, so the next build needs 3 or higher, or Android refuses the update.
- `tools/make_key.py` recreates the same signing key on every machine, so updates install over old versions.

## Update squads and ratings
- **For the APK:** edit the text files in `data_src/` (formats are explained at the top of each file and in `docs/CONTEXT.md`). Then run:
  ```bash
  node tools/build_data.js     # rebuilds www/js/data.js (never edit data.js by hand)
  ```
- **Inside the app:** use the Squad editor from the main menu. Its changes stay on that phone (export them as JSON to keep a copy).

## Tests
```bash
node tools/engine_check.js            # match engine consistency (720 matches)
node tools/sim_test.js T20 400        # scoring averages by format (POS=1 for batting positions)
node tools/world_test.js 3 IPL:CSK    # 3-season career with no UI
node tools/auction_test.js IPL 2027   # AI auction report
pip install playwright                # UI tests need Chromium: python3 -m playwright install chromium
python3 tools/ui/t10_season.py        # plays 2 IPL seasons through the real screens
python3 tools/ui/make_screenshots.py  # refreshes docs/screenshots
```

## Continuing development
Read **`docs/CONTEXT.md`** first. It covers:
- the architecture and every data format
- how the game rules and AI work
- the build and signing details
- known bugs and the planned next steps

Any AI or developer can use it to pick up the work.

## Notes
- **Keep this repository private.** `tools/make_key.py` holds the passphrase that creates the signing key. Anyone with the repo could build an APK that installs over yours.
- **Data accuracy:** ratings, salaries and youth players are estimates. Tours beyond the known fixtures are generated by the game.
- **Fonts:** Barlow and Big Shoulders Display, under the SIL Open Font License (texts in `www/fonts/`).
- **Code licence:** none chosen yet, so all rights are reserved by default.
- **Trademarks:** not affiliated with any league, cricket board or the Cricket Captain games. Team names are used for personal, non-commercial play.

## Versions
| Version | versionCode | Date | Notes |
|---|---|---|---|
| 0.9.0 | 1 | 20 Oct 2026 | Early test build |
| 1.0.0 | 2 | 21 Oct 2026 | Reworked auction AI, shared WTC final titles, faster Test skips, home screen shows next stop, editor fixes |
