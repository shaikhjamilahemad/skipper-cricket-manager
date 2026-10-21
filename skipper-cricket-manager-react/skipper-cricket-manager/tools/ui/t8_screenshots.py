"""Refreshes docs/screenshots from the built game."""
import sys, os; sys.path.insert(0, '.')
import harness
harness.OUT = os.path.join(harness.HERE, '..', '..', 'docs', 'screenshots'); os.makedirs(harness.OUT, exist_ok=True)
from harness import *

with sync_playwright() as p:
    g = Game(p, scale=2)
    g.shot('1-menu')
    g.start_career('IPL:CSK', auctions=True)
    g.shot('2-home')
    g.btn('Continue'); g.wait_idle(); g.btn('Confirm'); g.wait_idle(); g.btn('Go to the auction'); g.wait_idle()
    for _ in range(6):
        if g.screen() == 'auction': g.btn('Pass', wait=80)
    g.shot('3-auction')
    g.btn('Finish'); g.btn('Analysts bid for me'); g.wait_idle(); g.btn('Continue'); g.wait_idle()
    g.btn('Go to the toss'); g.btn('Heads', within='.sheet'); g.btn('Bat first', within='.sheet') if g.has_btn('Bat first', within='.sheet') else g.btn('Start match', within='.sheet')
    g.pg.wait_for_timeout(300); g.clear_sheets()
    for _ in range(5): g.btn('Next over'); g.clear_sheets()
    g.shot('4-live-match')
    g.btn('Charts', within='.mtabs'); g.shot('6-charts')
    g.btn('Scorecard', within='.mtabs'); g.shot('5-scorecard')
    g.js('SKR.app.toMenu()'); g.pg.wait_for_timeout(200)
    g.start_career('INTL:IND', auctions=False)
    g.btn('Continue'); g.wait_idle()
    if g.screen() == 'natSquad': g.shot('7-national-squad')
    print(g.screen()); g.close()
