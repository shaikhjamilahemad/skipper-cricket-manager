import sys; sys.path.insert(0, '.')
from harness import *
with sync_playwright() as p:
    g = Game(p)
    g.click('newCareer')
    g.pg.fill('#mgr', 'Jamil')
    g.click('comp', 'IPL'); g.shot('03_ipl_teams')
    g.click('team', 'IPL:CSK'); g.shot('04_options', True)
    g.click('start'); g.wait_idle(); g.pg.wait_for_timeout(300)
    print('screen', g.screen()); g.shot('05_home')
    print(g.text()[:900])
    print('ERRORS', g.errors)
    g.close()
