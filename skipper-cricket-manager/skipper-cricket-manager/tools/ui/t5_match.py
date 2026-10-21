import sys; sys.path.insert(0, '.')
from harness import *
with sync_playwright() as p:
    g = Game(p)
    g.js("SK.App.startCareer({team:'IPL:CSK', manager:'Jamil', auctions:false})"); g.pg.wait_for_timeout(300); g.wait_idle()
    g.click('continue'); g.wait_idle(); g.pg.wait_for_timeout(300)
    print('screen', g.screen()); g.shot('15_prematch', True)
    g.click('toss'); g.pg.wait_for_timeout(200); g.shot('16_toss')
    g.click('call', 'H', within='.sheet'); g.pg.wait_for_timeout(200); g.shot('17_tossres')
    if g.pg.locator('.sheet [data-act="dec"]').count():
        g.pg.locator('.sheet [data-act="dec"]').first.click()
    else:
        g.click('go', within='.sheet')
    g.pg.wait_for_timeout(300)
    print('screen', g.screen()); g.shot('18_live')
    for i in range(3):
        g.click('step', 'ball'); g.pg.wait_for_timeout(80)
    g.shot('19_live_balls')
    for i in range(4):
        if g.pg.locator('.sheet').count(): 
            g.shot('20_sheet_%d' % i)
            # bowler sheet: pick first option
            g.pg.locator('.sheet [data-act]').first.click(); g.pg.wait_for_timeout(100)
        g.click('step', 'over'); g.pg.wait_for_timeout(150)
    g.shot('21_live_overs', True)
    print(g.text()[:1500])
    print('ERRORS', g.errors)
    g.close()
