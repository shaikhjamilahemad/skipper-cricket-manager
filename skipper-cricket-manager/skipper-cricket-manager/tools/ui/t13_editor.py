import sys; sys.path.insert(0, '.')
from harness import *
with sync_playwright() as p:
    g = Game(p)
    g.click('editor'); g.pg.wait_for_timeout(200); g.shot('70_editor')
    g.click('comp', 'IPL'); g.pg.wait_for_timeout(200); g.shot('71_ed_comp')
    g.click('team', 'MI'); g.pg.wait_for_timeout(200); g.shot('72_ed_team')
    # open first player menu and edit
    g.pg.locator('[data-act="pl"]').first.click(); g.pg.wait_for_timeout(150); g.shot('73_ed_member')
    g.click('edit', within='.sheet'); g.pg.wait_for_timeout(200); g.shot('74_ed_player', True)
    g.pg.fill('#pform [name=name]', 'Rohit Sharma Jr')
    g.pg.locator('#pform [name=bt]').fill('90')
    g.click('save'); g.pg.wait_for_timeout(300)
    print('after save screen', g.screen())
    print('db name now', g.js("SKIPPER_DB.players.findIndex(a => a[0] === 'Rohit Sharma Jr')"), g.js("!!SKIPPER_DB_BASE"))
    # add a player
    g.click('add'); g.pg.wait_for_timeout(200); g.shot('75_ed_add')
    g.pg.locator('.sheet [data-act="pick"]').first.click(); g.pg.wait_for_timeout(200)
    # create new player
    g.click('newp'); g.pg.wait_for_timeout(200)
    g.pg.fill('#pform [name=name]', 'Jamil Test Player'); g.click('save'); g.pg.wait_for_timeout(300)
    print('new player idx', g.js("SKIPPER_DB.players.findIndex(a => a[0] === 'Jamil Test Player')"))
    g.click('teamEdit'); g.pg.wait_for_timeout(200); g.shot('76_ed_teamsheet')
    g.click('save', within='.sheet'); g.pg.wait_for_timeout(200)
    # reload page: custom db should persist (localStorage)
    g.pg.reload(); g.pg.wait_for_timeout(600)
    print('after reload custom?', g.js("!!SKIPPER_DB_BASE"), g.js("SKIPPER_DB.players.findIndex(a => a[0] === 'Jamil Test Player')"))
    # quick match uses new squad: check MI pool has the new player
    print('MI quick pool has new', g.js("SK.App.baseTeams('IPL').find(t => t.id === 'MI').pool.some(p => p.name === 'Jamil Test Player')"))
    # settings + saves screens
    g.click('settings'); g.pg.wait_for_timeout(200); g.shot('77_settings', True); g.click('__back')
    g.click('saves'); g.pg.wait_for_timeout(200); g.shot('78_saves', True); g.click('__back')
    g.click('help'); g.pg.wait_for_timeout(200); g.shot('79_help', True)
    print('ERRORS', g.errors[:5], len(g.errors))
    g.close()
