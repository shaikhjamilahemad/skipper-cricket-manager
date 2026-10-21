"""IPL retentions, then the interactive auction: bid, pass, upcoming list, skip, analysts, summary."""
import sys; sys.path.insert(0, '.')
from harness import *
with sync_playwright() as p:
    g = Game(p)
    g.start_career('IPL:CSK')
    g.btn('Continue'); g.wait_idle()
    assert g.screen() == 'retention', g.screen()
    g.shot('10_retention')
    g.btn('Confirm'); g.wait_idle()
    assert g.screen() == 'auctionIntro', g.screen()
    g.shot('12_intro')
    g.btn('Go to the auction'); g.wait_idle()
    assert g.screen() == 'auction', g.screen()
    g.shot('13_auction')
    for i in range(3):
        if g.screen() == 'auction': g.btn('Bid')
    g.shot('14_bid')
    for i in range(5):
        if g.screen() == 'auction': g.btn('Pass', wait=60)
    g.btn('Upcoming'); g.shot('15_upcoming')
    g.sheet().locator('button.row').nth(2).click(); g.sheet().locator('button.row').nth(5).click()
    assert g.sheet().locator('.pill.gold').count() == 2, 'listing two players failed'
    g.shot('16_upcoming_marked')
    g.pg.locator('.backdrop').click(position={'x': 10, 'y': 10}); g.pg.wait_for_timeout(100)
    assert not g.sheet_open()
    g.btn('My squad'); g.shot('17_my_squad'); g.pg.locator('.backdrop').click(position={'x': 10, 'y': 10})
    g.btn('Finish'); g.shot('18_finish_menu')
    g.btn('Skip to my next target'); g.pg.wait_for_timeout(300)
    print('after skip:', g.screen())
    g.btn('Finish'); g.btn('Analysts bid for me'); g.wait_idle()
    assert g.screen() == 'auctionDone', g.screen()
    g.shot('19_done', True)
    print(g.text()[:500])
    g.btn('Continue'); g.wait_idle()
    print('after auction:', g.screen())
    report(g, 't2')
    assert not g.errors
    g.close()
