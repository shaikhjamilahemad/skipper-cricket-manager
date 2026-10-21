"""Autopilot: plays N seasons for one team through the real buttons. Usage: python3 t7_season.py IPL:CSK [years] [auctions 0/1]
Match days alternate: first user match of each competition by hand for a few overs, the rest from 'Sim match'."""
import sys, collections; sys.path.insert(0, '.')
from harness import *

team = sys.argv[1] if len(sys.argv) > 1 else 'IPL:CSK'
years = float(sys.argv[2]) if len(sys.argv) > 2 else 2
auctions = (sys.argv[3] != '0') if len(sys.argv) > 3 else True
tag = team.replace(':', '_')

def now(g): return g.js('SKR.SK.U.yearOf(SKR.app.world.date) + SKR.app.world.date % 365 / 365')

with sync_playwright() as p:
    g = Game(p)
    g.start_career(team, auctions=auctions)
    t0 = now(g); hist = collections.Counter(); live_done = 0; steps = 0; last = None; same = 0
    while now(g) - t0 < years and steps < 1500:
        steps += 1
        scr = g.screen(); hist[scr] += 1
        if scr == last: same += 1
        else: same = 0
        last = scr
        if same > 12:
            g.shot(f'70_stuck_{tag}', True); print('STUCK on', scr, g.text()[:500]); break
        if scr == 'menu': print('left to menu (sacked or ended?)'); g.shot(f'70_menu_{tag}'); break
        if scr == 'home':
            if g.sheet_open(): g.shot(f'71_home_sheet_{tag}'); print('home sheet:', g.sheet().inner_text()[:160].replace('\n', ' | ')); g.pg.locator('.sheet button').first.click(); g.pg.wait_for_timeout(150); continue
            g.btn('Continue', wait=100); g.wait_idle()
        elif scr == 'retention': g.btn('Confirm'); g.wait_idle()
        elif scr == 'auctionIntro': g.btn('Go to the auction'); g.wait_idle()
        elif scr == 'auction':
            g.btn('Finish'); g.btn('Analysts bid for me'); g.wait_idle()
        elif scr == 'natSquad':
            g.btn('Confirm squad'); g.wait_idle()
        elif scr == 'prematch':
            if live_done < 2:
                live_done += 1
                g.btn('Go to the toss'); g.btn('Heads', within='.sheet')
                g.btn('Bat first', within='.sheet') if g.has_btn('Bat first', within='.sheet') else g.btn('Start match', within='.sheet')
                g.pg.wait_for_timeout(300); g.clear_sheets()
                for _ in range(2):
                    if g.screen() == 'live': g.btn('Next 5' if g.has_btn('Next 5') else 'Next over'); g.clear_sheets()
                g.btn('More'); g.btn('Sim the rest of the match'); g.wait_idle(); g.pg.wait_for_timeout(200); g.clear_sheets()
                g.btn('Continue', within='.dock'); g.wait_idle()
            else:
                g.btn('Sim match'); g.wait_idle()
        elif scr == 'live':
            g.clear_sheets(); g.btn('More'); g.btn('Sim the rest of the match'); g.wait_idle(); g.pg.wait_for_timeout(200); g.clear_sheets()
            g.btn('Continue', within='.dock'); g.wait_idle()
        elif g.sheet_open():
            print('sheet on', scr, g.sheet().inner_text()[:140].replace('\n', ' | ')); g.shot(f'72_sheet_{scr}_{tag}')
            g.pg.locator('.sheet button').first.click(); g.pg.wait_for_timeout(150)
        else:
            for t in ('Continue', 'Confirm', 'Done', 'Accept', 'OK'):
                if g.has_btn(t): g.btn(t); g.wait_idle(); break
            else:
                if not g.js('SKR.nav.back()'): print('no way out of', scr); g.shot(f'73_noexit_{tag}', True); break
                g.pg.wait_for_timeout(150)
    w = g.js('({y: SKR.SK.U.yearOf(SKR.app.world.date), team: SKR.app.world.user.team, seasons: Object.values(SKR.app.world.editions).filter(e => e.champion).length})')
    print(team, 'steps', steps, 'years played %.2f' % (now(g) - t0), w); print(dict(hist))
    g.shot(f'74_end_{tag}', True)
    report(g, 't7 ' + team); assert not g.errors
    g.close()
