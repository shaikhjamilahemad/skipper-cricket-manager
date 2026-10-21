import sys; sys.path.insert(0, '.')
from harness import *
with sync_playwright() as p:
    g = Game(p)
    # quick match
    g.click('quick'); g.pg.wait_for_timeout(200); g.shot('40_quick')
    print('quick screen', g.screen()); print(g.text()[:500])
    g.click('start') if g.pg.locator('[data-act="start"]').count() else None
    g.pg.wait_for_timeout(300); print('after start', g.screen()); g.shot('41_quick_pre')
    print('ERRORS', g.errors); g.errors.clear()
    # national career
    g.js("SK.App.startCareer({team:'INTL:IND', manager:'Jamil'})"); g.pg.wait_for_timeout(300); g.wait_idle()
    g.shot('42_ind_home'); print(g.text()[:400])
    g.js("SK.App.continue()"); g.wait_idle(); g.pg.wait_for_timeout(300)
    print('screen', g.screen()); g.shot('43_natsquad', True)
    print(g.text()[:600])
    print('ERRORS', g.errors); g.errors.clear()
    g.close()
