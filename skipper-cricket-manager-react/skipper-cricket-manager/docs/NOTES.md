# Skipper Cricket Manager — build notes (keep updated)
Goal: offline Android APK (WebView + React/Vite web app, 1.1.0 onwards), Cricket Captain–style management sim.
Package com.jamil.skipper. Toolchain: apt aapt(v1)+framework-res.apk(-I), javac --release 8 vs android-23 jar, dalvik-exchange(dx), zipalign, apksigner (v1+v2+v3). min 21 / target 34.
Test browser: python playwright chromium works.

## Data (research done 20 Oct 2026)
- IPL 2026 squads (Wisden) + trades: Pant LSG->DC, Kuldeep DC->LSG, Natarajan DC->SRH, Zeeshan Ansari SRH->DC. RCB won IPL 2026 (beat GT). IPL 2027 mini-auction 16 Dec 2026 Goa.
- India won T20 WC 2026 (beat NZ in final). Root back as Eng Test capt (Jul 2026), Stokes retired from intl (Jun 2026), Fleming Eng Test coach. Williamson retired intl. Khawaja retired.
- SA20 2027 squads post-auction (7 Oct 2026). CPL 2026 = 7 teams (incl. Jamaica Kingsmen). PSL 11 = 8 teams incl Rawalpindiz (ex-Multan), Hyderabad Houston Kingsmen, Sialkot Stallionz.
- Hundred 2026 names: MI London (ex Oval), Manchester Super Giants, Sunrisers Leeds, London Spirit, Southern Brave, Trent Rockets, Welsh Fire, Birmingham Phoenix.
- County 2026: Div1 (10): Somerset, Notts, Warks, Sussex, Yorks, Surrey, Glamorgan, Essex, Leics, Hants. Div2 (8): Durham(P), Northants, Kent, Middx, Derbys, Worcs, Lancs, Gloucs.
- Raw squads in data_src/squads.txt; player ratings in data_src/players_*.txt; build with tools/build_data.js -> src/engine/data.js

## Build status (21 Oct 2026)
- UI done: menu, new career, quick match, tournament, saves, settings, help, hub (home/squad/fixtures/tables/more),
  player, world (rankings/WTC/records/honours), inbox/news/career, match (prematch/toss/live/scorecard/charts),
  natSquad, retention, auctionIntro/auction/auctionDone, signings (county/shield), editor.
- APK: tools/build_apk.sh <name> <code>; deterministic key tools/make_key.py (cert sha256 89299cba...).
- Playwright tests in tools/ui (harness.py, t1..t8). 1.1.0: UI rewritten in React 19 + Vite 8; APK packages dist/.
- Auction economy reworked: AI releases ~7-10/yr (IPL), purse-aware bids, accelerated round fills squads to max-1.
