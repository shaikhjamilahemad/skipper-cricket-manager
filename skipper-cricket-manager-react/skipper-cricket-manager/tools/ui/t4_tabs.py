"""Every tab and every item in the More menu, opened through real clicks. Fails on any console error."""
import sys; sys.path.insert(0, '.')
from harness import *

with sync_playwright() as p:
    g = Game(p)
    g.start_career('IPL:CSK', auctions=False)
    seen = []
    def visit(tab):
        g.pg.locator('nav.tabs button').filter(has_text=tab).click(); g.pg.wait_for_timeout(250)
        seen.append(g.screen()); g.shot('40_tab_' + tab.lower(), True)
    for t in ['Squad', 'Fixtures', 'Tables']: visit(t)
    # squad -> player
    g.pg.locator('nav.tabs button').filter(has_text='Squad').click(); g.pg.wait_for_timeout(200)
    g.pg.locator('button.row').first.click(); g.pg.wait_for_timeout(250)
    assert g.screen() == 'player', g.screen(); g.shot('41_player', True)
    for t in ['Stats', 'Career', 'Form', 'Contract']:
        if g.has_btn(t): g.btn(t); g.shot('41_player_' + t.lower(), True)
    g.pg.locator('.topbar .back, .top button').first.click(); g.pg.wait_for_timeout(200)
    # More menu: open each row and come back
    g.pg.locator('nav.tabs button').filter(has_text='More').click(); g.pg.wait_for_timeout(250)
    n = g.pg.locator('button.row').count()
    print('more rows', n)
    for i in range(n - 1):  # last row is Main menu (leaves the career)
        g.pg.locator('nav.tabs button').filter(has_text='More').click(); g.pg.wait_for_timeout(200)
        row = g.pg.locator('button.row').nth(i)
        label = row.inner_text().split('\n')[0]
        row.click(); g.pg.wait_for_timeout(350)
        nm = g.screen(); seen.append(nm)
        g.shot(f'42_more_{i}_{nm}', True)
        print(i, label, '->', nm, 'sheet' if g.sheet_open() else '')
        if g.sheet_open(): g.pg.keyboard.press('Escape'); g.pg.locator('.backdrop').first.click(position={'x': 5, 'y': 5}) if g.sheet_open() else None
        while g.screen() not in ('more', 'home'):
            if not g.js('SKR.nav.back()'): break
            g.pg.wait_for_timeout(150)
    # world hub
    g.pg.locator('nav.tabs button').filter(has_text='Tables').click(); g.pg.wait_for_timeout(200)
    for t in ['World', 'Stats', 'Records', 'Rankings']:
        if g.has_btn(t): g.btn(t, wait=250); g.shot('43_tables_' + t.lower(), True)
    print('screens seen:', sorted(set(seen)))
    report(g, 't4')
    assert not g.errors
    g.close()
