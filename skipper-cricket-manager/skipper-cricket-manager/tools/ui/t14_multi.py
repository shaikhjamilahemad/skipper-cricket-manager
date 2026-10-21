import sys; sys.path.insert(0, '.')
from drive import *
team = sys.argv[1]; until = int(sys.argv[2]); tag = sys.argv[3]
with sync_playwright() as p:
    g = Game(p)
    g.js(f"SK.App.startCareer({{team:'{team}', manager:'Jamil'}})"); g.pg.wait_for_timeout(300); g.wait_idle()
    seen = drive(g, until, tag, log_every=100)
    print(team, seen)
    print(team, g.js("(() => { const w = SK.App.world; return { date: SK.U.fmtDate(w.date), team: w.user.team, conf: Math.round(w.user.conf), hist: w.user.history.map(h => h.name + ': ' + (h.finish||'')).slice(-4) } })()"))
    print(team, 'ERRORS', g.errors[:5], len(g.errors))
    g.close()
