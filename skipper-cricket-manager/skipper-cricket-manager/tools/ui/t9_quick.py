import sys; sys.path.insert(0, '.')
from harness import *
with sync_playwright() as p:
    g = Game(p)
    g.click('quick'); g.pg.wait_for_timeout(200)
    g.click('fmt', 'TEST'); g.pg.wait_for_timeout(100)
    g.click('pickTeam', 'a'); g.pg.wait_for_timeout(200); g.shot('44_teampicker')
    print(g.pg.locator('.sheet').inner_text()[:300])
    # pick india and england if picker lists comps first
    g.pg.locator('.sheet [data-act]').first.click(); g.pg.wait_for_timeout(200); g.shot('45_teampicker2')
    print(g.pg.locator('.sheet').inner_text()[:300] if g.pg.locator('.sheet').count() else 'closed')
    print('ERRORS', g.errors)
    g.close()
