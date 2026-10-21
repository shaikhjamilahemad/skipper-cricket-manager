import sys; sys.path.insert(0, '.')
from harness import *
with sync_playwright() as p:
    g = Game(p)
    g.js("SK.App.startCareer({team:'IPL:KKR', manager:'Jamil'})"); g.pg.wait_for_timeout(300); g.wait_idle()
    g.click('continue'); g.wait_idle(); g.pg.wait_for_timeout(200)
    g.click('confirm'); g.pg.wait_for_timeout(300); g.wait_idle(); g.pg.wait_for_timeout(300)
    print('screen', g.screen())
    g.click('go'); g.pg.wait_for_timeout(400); g.wait_idle()
    bought = 0
    for i in range(400):
        if g.screen() != 'auction': break
        # bid if rating >= 75 and price < 8 Cr else pass
        info = g.js("(() => { const S = SK.App.auction; const c = S.run.cur; const p = SK.App.world.players[c.lot.pid]; return { v: SK.Auction.value(SK.App.world, p, S.run.comp), next: S.next, name: p.name }; })()")
        if info['v'] >= 74 and info['next'] < 9: g.click('bid')
        else: g.click('pass')
        g.pg.wait_for_timeout(20)
    print('screen', g.screen()); g.shot('90_auction_done2', True)
    print(g.text()[:600])
    print('ERRORS', g.errors[:5], len(g.errors))
    g.close()
