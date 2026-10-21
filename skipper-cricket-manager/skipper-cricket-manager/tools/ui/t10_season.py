import sys; sys.path.insert(0, '.')
from drive import *
with sync_playwright() as p:
    g = Game(p)
    g.js("SK.App.startCareer({team:'IPL:MI', manager:'Jamil'})"); g.pg.wait_for_timeout(300); g.wait_idle()
    seen = drive(g, 760, 's1')
    print(seen)
    w = g.js("(() => { const w = SK.App.world; return { date: w.date, user: w.user.team, conf: w.user.conf, rep: w.user.rep, hist: w.user.history.length, size: JSON.stringify(w).length } })()")
    print(w)
    print('ERRORS', g.errors[:10], len(g.errors))
    g.close()
