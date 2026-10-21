"""A career T20 match played by hand: XI tools, toss, live controls, bowler picks, sim the rest, scorecard, report."""
import sys; sys.path.insert(0, '.')
from harness import *

def clear_sheets(g): g.clear_sheets()

with sync_playwright() as p:
    g = Game(p)
    g.start_career('IPL:CSK', auctions=False)
    g.btn('Continue'); g.wait_idle()
    assert g.screen() == 'prematch', g.screen()
    g.shot('20_prematch', True)
    # XI tools
    g.btn('Change players'); g.shot('21_xi_sheet'); g.pg.locator('.backdrop').click(position={'x': 10, 'y': 10})
    g.pg.locator('.xirow button.grow').first.click(); g.shot('22_xi_menu')
    g.btn('Make captain', within='.sheet'); g.shot('23_captain', True)
    assert g.pg.locator('.xirow .pill.gold').count() == 1
    g.btn('Go to the toss'); g.shot('24_toss')
    g.btn('Heads', within='.sheet'); g.shot('25_toss_result')
    if g.has_btn('Bat first', within='.sheet'): g.btn('Bat first', within='.sheet')
    else: g.btn('Start match', within='.sheet')
    g.pg.wait_for_timeout(300)
    assert g.screen() == 'live', g.screen()
    clear_sheets(g); g.shot('26_live')
    for i in range(4): g.btn('Next ball', wait=60); clear_sheets(g)
    g.shot('27_balls')
    for i in range(3): g.btn('Next over'); clear_sheets(g)
    g.shot('28_overs', True)
    # play / pause
    g.btn('Play'); g.pg.wait_for_timeout(1500); assert g.has_btn('Pause'); g.btn('Pause'); clear_sheets(g)
    # tabs while the match is on
    g.btn('Scorecard', within='.mtabs'); g.shot('29_card_live', True)
    g.btn('Charts', within='.mtabs'); g.shot('30_charts_live', True)
    g.btn('Live', within='.mtabs')
    g.btn('More'); g.shot('31_more_menu'); g.btn('To the end of this innings'); clear_sheets(g); g.shot('32_inns_end')
    g.btn('More'); g.btn('Sim the rest of the match'); g.wait_idle(); g.pg.wait_for_timeout(300)
    clear_sheets(g)
    assert g.js('SKR.app.match.m.phase') == 'done'
    g.shot('33_done', True)
    g.btn('Scorecard', within='.mtabs'); g.shot('34_card', True)
    g.btn('Charts', within='.mtabs'); g.shot('35_charts', True)
    g.btn('Continue', within='.dock'); g.wait_idle()
    assert g.screen() == 'matchReport', g.screen()
    g.shot('36_report', True)
    print(g.text()[:400])
    g.btn('Scorecard'); assert g.screen() == 'scorecard'; g.shot('37_stored_card', True)
    report(g, 't3')
    assert not g.errors
    g.close()
