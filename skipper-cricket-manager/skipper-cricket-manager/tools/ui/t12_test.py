import sys; sys.path.insert(0, '.')
from harness import *
CTX = """(() => { const tA = SK.App.findBaseTeam('INTL:IND'), tB = SK.App.findBaseTeam('INTL:ENG');
 const ctx = { kind:'quick', teams:[tA,tB], fmt:'TEST', venue:{name:tA.venue, city:tA.city, cc:tA.cc, pitch:'D'}, userSide:0, title:'IND v ENG, Test' };
 SK.UI.go('prematch', { ctx }); return 'ok'; })()"""
def handle_sheets(g, tag):
    for k in range(6):
        if not g.pg.locator('.sheet').count(): return
        txt = g.pg.locator('.sheet').inner_text()
        if 'follow' in txt.lower():
            g.shot(f'{tag}_followon'); print('FOLLOW-ON SHEET:', txt[:200])
            g.pg.locator('.sheet [data-act]').first.click(); g.pg.wait_for_timeout(100); continue
        if g.pg.locator('.sheet [data-act="auto"]').count():
            g.pg.locator('.sheet [data-act="auto"]').first.click(); g.pg.wait_for_timeout(80); continue
        g.pg.locator('.sheet [data-act]').first.click(); g.pg.wait_for_timeout(80)
with sync_playwright() as p:
    g = Game(p)
    print(g.js(CTX)); g.pg.wait_for_timeout(300); g.shot('60_test_pre')
    g.click('toss'); g.pg.wait_for_timeout(100)
    g.click('call', 'T', within='.sheet'); g.pg.wait_for_timeout(100)
    if g.pg.locator('.sheet [data-act="dec"]').count(): g.pg.locator('.sheet [data-act="dec"]').first.click()
    else: g.click('go', within='.sheet')
    g.pg.wait_for_timeout(200)
    for i in range(40):
        handle_sheets(g, 'tt')
        st = g.js("(() => { const m = SK.App.match && SK.App.match.m; if (!m) return null; const i = m.cur; return { phase: m.phase, day: m.day, inn: m.inns.length, runs: i && i.runs, wk: i && i.wkts, bat: i && i.bat, pending: m.pending && m.pending.type, decl: !!document.querySelector('[data-act=declare]') }; })()")
        if not st or st['phase'] == 'done': break
        # declare our first innings once past 450
        if st['bat'] == 0 and st['inn'] == 1 and st['runs'] and st['runs'] > 450 and st['decl']:
            g.shot('61_before_declare', True)
            g.click('declare'); g.pg.wait_for_timeout(100); g.click('yes', within='.sheet'); g.pg.wait_for_timeout(200); print('declared at', st)
        g.click('sim'); g.pg.wait_for_timeout(80)
        g.click('go', 'session', within='.sheet'); g.pg.wait_for_timeout(250)
        if i % 5 == 0: print(i, st)
    handle_sheets(g, 'tt')
    g.shot('62_test_end', True)
    print(g.js("SK.App.match.m.result"))
    g.click('tab', 'card'); g.pg.wait_for_timeout(200); g.shot('63_test_card', True)
    print('ERRORS', g.errors[:5], len(g.errors))
    g.close()
