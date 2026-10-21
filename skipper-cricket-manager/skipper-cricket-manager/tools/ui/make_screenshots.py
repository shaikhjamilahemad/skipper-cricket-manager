"""Regenerate the README screenshots: python3 tools/ui/make_screenshots.py  (writes docs/screenshots/*.png)"""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import *
DOCS = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'docs', 'screenshots'))
os.makedirs(DOCS, exist_ok=True)
def snap(g, name):
    g.pg.wait_for_timeout(250)
    g.pg.screenshot(path=os.path.join(DOCS, name + '.png'))
def clear(g):
    for k in range(6):
        if not g.pg.locator('.sheet').count(): return
        g.js("(() => { const s = document.querySelector('.sheet'); const b = s.querySelector('[data-act=pick]:not([disabled])') || s.querySelector('[data-act=auto]') || s.querySelector('[data-act=go]') || s.querySelector('[data-act]'); SK.UI.handle(b); })()")
        g.pg.wait_for_timeout(80)
with sync_playwright() as p:
    g = Game(p, scale=2)
    snap(g, '1-menu')
    # IPL career: retention -> auction
    g.js("SK.App.startCareer({team:'IPL:CSK', manager:'Jamil'})"); g.pg.wait_for_timeout(300); g.wait_idle()
    snap(g, '2-home')
    g.click('continue'); g.wait_idle(); g.pg.wait_for_timeout(200)
    g.click('confirm'); g.pg.wait_for_timeout(300); g.wait_idle(); g.pg.wait_for_timeout(300)
    g.click('go'); g.pg.wait_for_timeout(500); g.wait_idle()
    snap(g, '3-auction')
    g.js("SK.App.auction.run.interactive=false; SK.App.auction.run.simAll(); SK.AuctionUI.complete()"); g.pg.wait_for_timeout(300)
    g.js("SK.UI.screens.auctionDone.actions.done()"); g.wait_idle(); g.pg.wait_for_timeout(300)
    # first IPL match, played live for a few overs
    if g.screen() == 'prematch':
        g.click('toss'); g.pg.wait_for_timeout(100); g.click('call', 'H', within='.sheet'); g.pg.wait_for_timeout(100)
        if g.pg.locator('.sheet [data-act="dec"]').count(): g.pg.locator('.sheet [data-act="dec"]').first.click()
        else: g.click('go', within='.sheet')
        g.pg.wait_for_timeout(200); clear(g)
        for i in range(5): clear(g); g.js("SK.MatchUI.live.step('over')"); g.pg.wait_for_timeout(60)
        clear(g); g.js("window.scrollTo(0,0)"); snap(g, '4-live-match')
        g.js("SK.MatchUI.live.simRest(false)"); g.pg.wait_for_timeout(800); g.wait_idle(); clear(g)
        g.click('tab', 'card'); snap(g, '5-scorecard')
        g.click('tab', 'charts'); g.js("window.scrollTo(0, 330)"); snap(g, '6-charts')
    # national team squad pick
    g.js("SK.App.startCareer({team:'INTL:IND', manager:'Jamil'})"); g.pg.wait_for_timeout(300); g.wait_idle()
    g.js("SK.App.continue()"); g.wait_idle(); g.pg.wait_for_timeout(300)
    snap(g, '7-national-squad')
    print('screens done; errors:', g.errors)
    g.close()
