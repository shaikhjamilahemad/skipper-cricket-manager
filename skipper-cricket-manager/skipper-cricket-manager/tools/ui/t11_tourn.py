import sys; sys.path.insert(0, '.')
from drive import *
with sync_playwright() as p:
    g = Game(p)
    g.click('tourn'); g.pg.wait_for_timeout(200); g.shot('50_tourn')
    print(g.text()[:700])
    g.js("SK.App.startTournament('T20WC', 'INTL:IND')"); g.pg.wait_for_timeout(500); g.wait_idle()
    print('screen', g.screen()); g.shot('51_t_home')
    seen = drive(g, 99999, 't20wc', max_steps=200)
    print(seen, 'final screen', g.screen())
    g.shot('52_t_done', True)
    print(g.text()[:900])
    print('ERRORS', g.errors[:5], len(g.errors))
    g.close()
