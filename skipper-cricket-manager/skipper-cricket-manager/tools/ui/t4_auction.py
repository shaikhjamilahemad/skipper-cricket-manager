import sys; sys.path.insert(0, '.')
from harness import *
with sync_playwright() as p:
    g = Game(p)
    g.js("SK.App.startCareer({team:'IPL:CSK', manager:'Jamil'})"); g.pg.wait_for_timeout(300); g.wait_idle()
    g.click('continue'); g.wait_idle(); g.pg.wait_for_timeout(200)
    g.shot('06b_retention')
    g.click('confirm'); g.pg.wait_for_timeout(300); g.wait_idle(); g.pg.wait_for_timeout(300)
    print('screen', g.screen()); g.shot('07_auctionintro')
    g.click('go'); g.pg.wait_for_timeout(300); g.wait_idle(); g.pg.wait_for_timeout(300)
    print('screen', g.screen()); g.shot('08_auction')
    print(g.text()[:700])
    # bid a few times then pass
    for i in range(3):
        if g.screen() != 'auction': break
        g.click('bid'); g.pg.wait_for_timeout(150)
    g.shot('09_auction_bid')
    for i in range(5):
        if g.screen() != 'auction': break
        g.click('pass'); g.pg.wait_for_timeout(100)
    g.shot('10_auction_after')
    g.click('upcoming'); g.pg.wait_for_timeout(200); g.shot('11_upcoming')
    g.pg.locator('.sheet [data-act="want"]').nth(2).click(); g.pg.wait_for_timeout(100)
    g.pg.locator('.sheet [data-act="want"]').nth(5).click(); g.pg.wait_for_timeout(100)
    g.shot('11b_upcoming_marked')
    g.pg.locator('.backdrop').click(position={'x': 10, 'y': 10}); g.pg.wait_for_timeout(100)
    g.click('menu'); g.pg.wait_for_timeout(100); g.shot('12_menu')
    g.click('skip', within='.sheet'); g.pg.wait_for_timeout(300)
    print('after skip screen', g.screen()); g.shot('13_skipped')
    g.click('menu'); g.pg.wait_for_timeout(100)
    g.click('analysts', within='.sheet'); g.pg.wait_for_timeout(500); g.wait_idle()
    print('screen', g.screen()); g.shot('14_done', True)
    print(g.text()[:1200])
    print('ERRORS', g.errors)
    g.close()
