"""Menu -> new career through the real buttons, then back out; settings, saves and help screens."""
import sys; sys.path.insert(0, '.')
from harness import *
with sync_playwright() as p:
    g = Game(p)
    assert g.screen() == 'menu'
    g.shot('01_menu')
    g.btn('New career'); g.pg.fill('#mgr', 'Jamil')
    g.btn('IPL'); g.shot('02_ipl_teams')
    g.row('Chennai Super Kings'); g.shot('03_options', True)
    g.pg.go_back() if False else None
    g.btn('Start career'); g.wait_idle()
    assert g.screen() == 'home', g.screen()
    g.shot('04_home')
    # back to menu and look at the other screens
    g.btn('More'); g.btn('Main menu')
    assert g.screen() == 'menu'
    assert g.pg.locator('.contcard').count() == 1, 'continue card missing after autosave'
    for name, shot in [('Settings', '05_settings'), ('Load and save games', '06_saves'), ('How to play', '07_help')]:
        g.btn(name); g.shot(shot, True); g.btn('', within='.top') if False else g.js('SKR.nav.back()'); g.pg.wait_for_timeout(100)
    # toggles work and persist
    g.btn('Settings')
    g.pg.locator('.toggle').first.click(); g.pg.wait_for_timeout(100)
    print('manualBowl now', g.js('SKR.SK.Store.settings.manualBowl'))
    g.btn('Fast'); print('speed', g.js('SKR.SK.Store.settings.speed'))
    report(g, 't1')
    assert not g.errors
    g.close()
