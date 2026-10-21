import sys; sys.path.insert(0, '.')
from harness import *
SIMNEXT = """(() => { const c = SK.UI.cur(); if (c.name === 'prematch') { SK.App.simUserFixture(c.params.ctx.fxId); return 'simmed'; } return c.name; })()"""
with sync_playwright() as p:
    g = Game(p)
    g.js("SK.App.startCareer({team:'IPL:CSK', manager:'Jamil', auctions:false})"); g.pg.wait_for_timeout(300); g.wait_idle()
    for i in range(4):
        g.js("SK.App.continue()"); g.wait_idle(); g.pg.wait_for_timeout(200)
        print(i, g.js(SIMNEXT)); g.pg.wait_for_timeout(200)
    g.js("SK.UI.go('home', {}, {reset:true})"); g.pg.wait_for_timeout(200); g.shot('28_home_after')
    g.click('__tab', 'squad'); g.shot('29_squad')
    g.click('__tab', 'fixtures'); g.shot('31_fixtures')
    g.click('__tab', 'tables'); g.shot('32_tables')
    g.click('view', 'stats'); g.shot('33_stats')
    g.click('world'); g.shot('34_world')
    g.click('v', 'wtc'); g.shot('35_wtc')
    g.click('__back'); g.click('__tab', 'more'); g.shot('36_more')
    g.click('career'); g.shot('37_career')
    print('ERRORS', g.errors)
    g.close()
