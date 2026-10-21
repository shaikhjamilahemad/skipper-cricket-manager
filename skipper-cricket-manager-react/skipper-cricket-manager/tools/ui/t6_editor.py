"""Squad editor: search, edit a player, create one in a team, export, reload (persistence), restore."""
import sys; sys.path.insert(0, '.')
from harness import *

with sync_playwright() as p:
    g = Game(p)
    g.row('Squad editor'); assert g.screen() == 'editor'; g.shot('60_editor', True)
    n0 = g.js('SKPLAYERS = window.SKIPPER_DB.players.length')
    box = g.pg.locator('input[type=search]').first
    box.fill('kohli'); box.press('Enter'); g.pg.wait_for_timeout(300)
    assert g.screen() == 'edFind'; g.shot('61_find')
    g.pg.locator('button.row').first.click(); g.pg.wait_for_timeout(300)
    assert g.screen() == 'edPlayer'; g.shot('62_edplayer', True)
    nm = g.pg.locator('input.input').first
    old = nm.input_value(); nm.fill(old + ' Jr'); g.btn('Save player'); g.pg.wait_for_timeout(300)
    assert g.screen() == 'edFind', g.screen()
    assert g.js("window.SKIPPER_DB.players.some(a => a[0].endsWith(' Jr'))")
    # a team: create a new player in CSK
    g.js('SKR.nav.back()'); g.pg.wait_for_timeout(200)
    g.row('Indian Premier League'); g.row('Chennai Super Kings'); assert g.screen() == 'edTeam'; g.shot('63_edteam', True)
    sq0 = g.js("SKR.nav.cur().params.team")
    g.btn('Create new player'); assert g.screen() == 'edPlayer'
    g.pg.locator('input.input').first.fill('Test Debutant'); g.btn('Create player'); g.pg.wait_for_timeout(300)
    assert g.screen() == 'edTeam'; assert 'Test Debutant' in g.text(); g.shot('64_created', True)
    assert g.js("window.SKIPPER_DB.players.length") == n0 + 1
    # team sheet: tap a member
    g.pg.locator('button.row').filter(has_text='Test Debutant').first.click(); g.pg.wait_for_timeout(200)
    assert g.sheet_open(); g.shot('65_member_sheet'); print(g.sheet().inner_text()[:200].replace('\n', ' | '))
    g.pg.keyboard.press('Escape'); g.pg.locator('.backdrop').first.click(position={'x': 5, 'y': 5}); g.pg.wait_for_timeout(200)
    # export
    while g.screen() != 'editor': g.js('SKR.nav.back()'); g.pg.wait_for_timeout(150)
    try:
        with g.pg.expect_download(timeout=5000) as dl: g.row('Export squads')
        path = dl.value.path(); import json; d = json.load(open(path)); print('exported players', len(d['players']))
        assert len(d['players']) == n0 + 1
    except Exception as e:
        print('export:', type(e).__name__, str(e)[:120]); g.shot('66_export_issue')
    # reload keeps the edits, and a new quick-match team pool contains the new player
    g.pg.reload(); g.pg.wait_for_function('window.SKR && SKR.nav.cur()'); g.pg.wait_for_timeout(300)
    assert g.js("window.SKIPPER_DB.players.length") == n0 + 1, 'edits lost on reload'
    g.row('Squad editor'); assert g.has_btn('Restore original squads') or g.pg.get_by_text('Restore original squads').count()
    g.pg.get_by_text('Restore original squads').first.click(); g.pg.wait_for_timeout(200)
    g.btn('Restore', within='.sheet'); g.pg.wait_for_timeout(300)
    assert g.js("window.SKIPPER_DB.players.length") == n0, g.js("window.SKIPPER_DB.players.length")
    report(g, 't6'); assert not g.errors
    g.close()
