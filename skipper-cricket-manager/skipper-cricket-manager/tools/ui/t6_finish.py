import sys; sys.path.insert(0, '.')
from harness import *
with sync_playwright() as p:
    g = Game(p)
    g.js("SK.App.startCareer({team:'IPL:CSK', manager:'Jamil', auctions:false})"); g.pg.wait_for_timeout(300); g.wait_idle()
    g.click('continue'); g.wait_idle(); g.pg.wait_for_timeout(300)
    g.click('toss'); g.pg.wait_for_timeout(100)
    g.click('call', 'H', within='.sheet'); g.pg.wait_for_timeout(100)
    if g.pg.locator('.sheet [data-act="dec"]').count(): g.pg.locator('.sheet [data-act="dec"]').nth(1).click()
    else: g.click('go', within='.sheet')
    g.pg.wait_for_timeout(200)
    # we may be bowling: bowler sheet may pop up
    for i in range(6):
        if g.pg.locator('.sheet').count():
            g.shot('22_bowler_sheet'); g.pg.locator('.sheet [data-act]').first.click(); g.pg.wait_for_timeout(100)
        g.click('step', 'over'); g.pg.wait_for_timeout(100)
    if g.pg.locator('.sheet').count(): g.pg.locator('.sheet [data-act]').first.click(); g.pg.wait_for_timeout(100)
    g.click('sim'); g.pg.wait_for_timeout(150); g.shot('23_simmenu')
    g.click('rest', within='.sheet'); g.pg.wait_for_timeout(500); g.wait_idle(); g.pg.wait_for_timeout(300)
    g.shot('24_done'); print('screen', g.screen())
    g.click('tab', 'card'); g.pg.wait_for_timeout(200); g.shot('25_card', True)
    g.click('tab', 'charts'); g.pg.wait_for_timeout(200); g.shot('26_charts', True)
    g.click('finish'); g.pg.wait_for_timeout(400); g.wait_idle()
    print('screen', g.screen()); g.shot('27_report', True)
    print(g.text()[:800])
    print('ERRORS', g.errors)
    g.close()
