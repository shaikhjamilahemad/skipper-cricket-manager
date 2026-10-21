import sys; sys.path.insert(0, '.')
from harness import *
CTX = """(() => { SK.Store.settings.manualField = true; const tA = SK.App.findBaseTeam('IPL:RCB'), tB = SK.App.findBaseTeam('IPL:KKR');
 const ctx = { kind:'quick', teams:[tA,tB], fmt:'T20', venue:{name:tA.venue, city:tA.city, cc:'IND', pitch:'F'}, userSide:0, title:'RCB v KKR, T20' };
 SK.UI.go('prematch', { ctx }); return 'ok'; })()"""
def clear(g):
    for k in range(5):
        if not g.pg.locator('.sheet').count(): return
        g.js("(() => { const s = document.querySelector('.sheet'); const b = s.querySelector('[data-act=pick]:not([disabled])') || s.querySelector('[data-act=auto]') || s.querySelector('[data-act]'); SK.UI.handle(b); })()")
        g.pg.wait_for_timeout(80)
with sync_playwright() as p:
    g = Game(p)
    g.js(CTX); g.pg.wait_for_timeout(300)
    g.click('changeXI'); g.pg.wait_for_timeout(200); g.shot('80_xisheet'); g.js("SK.UI.closeSheet()")
    g.pg.locator('[data-act="xiMenu"]').first.click(); g.pg.wait_for_timeout(150); g.shot('81_ximenu'); g.js("SK.UI.closeSheet()")
    g.click('toss'); g.pg.wait_for_timeout(100)
    g.click('call', 'H', within='.sheet'); g.pg.wait_for_timeout(100)
    if g.pg.locator('.sheet [data-act="dec"]').count(): g.pg.locator('.sheet [data-act="dec"]').last.click()
    else: g.click('go', within='.sheet')
    g.pg.wait_for_timeout(200); clear(g)
    if g.js("SK.App.match.m.cur.bat") == 0:
        g.js("SK.MatchUI.live.step('innings')"); g.pg.wait_for_timeout(200)
        if g.pg.locator('.sheet').count(): g.shot('82_first_bowler')
        clear(g)
    for i in range(8):
        clear(g); g.js("SK.MatchUI.live.step('ball')"); g.pg.wait_for_timeout(50)
    clear(g)
    g.pg.mouse.wheel(0, 450); g.pg.wait_for_timeout(100)
    g.shot('83_bowling_ctl')
    print(g.js("document.getElementById('lv-ctl') ? document.getElementById('lv-ctl').innerText : 'no ctl'"))
    print('ERRORS', g.errors[:5], len(g.errors))
    g.close()
