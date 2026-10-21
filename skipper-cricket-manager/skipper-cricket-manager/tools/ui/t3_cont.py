import sys; sys.path.insert(0, '.')
from harness import *
with sync_playwright() as p:
    g = Game(p)
    g.js("SK.App.startCareer({team:'IPL:CSK', manager:'Jamil'})"); g.pg.wait_for_timeout(300); g.wait_idle()
    g.click('continue'); g.wait_idle(); g.pg.wait_for_timeout(300)
    print('screen', g.screen()); g.shot('06_retention')
    print(g.text()[:1500])
    print('ERRORS', g.errors)
    g.close()
