"""Quick match (Test, by hand with declare / follow-on / bowler sheets), tournament, national-team career."""
import sys; sys.path.insert(0, '.')
from harness import *

def pick_team(g, which_row, comp_label, team_text):
    g.pg.locator('button.row').filter(has_text=which_row).first.click(); g.pg.wait_for_timeout(200)
    g.row(comp_label, within='.sheet'); g.row(team_text, within='.sheet')

with sync_playwright() as p:
    g = Game(p)
    # ---- quick Test match from the menu
    g.row('Quick match')
    assert g.screen() == 'quickSetup'
    g.btn('Test', within='.ctl')
    pick_team(g, 'Home side', 'International', 'India')
    pick_team(g, 'Away side', 'International', 'England')
    g.shot('50_quick_setup', True)
    g.btn('Continue to team selection'); assert g.screen() == 'prematch', g.screen()
    g.btn('Go to the toss'); g.btn('Heads', within='.sheet')
    if g.has_btn('Bat first', within='.sheet'): g.btn('Bat first', within='.sheet')
    else: g.btn('Start match', within='.sheet')
    g.pg.wait_for_timeout(300); g.clear_sheets()
    assert g.screen() == 'live'
    for _ in range(3): g.btn('Next over'); g.clear_sheets()
    g.shot('51_test_live', True)
    g.btn('More'); g.shot('52_test_more'); g.btn('To the end of the session'); g.clear_sheets()
    g.shot('53_after_session', True)
    # declare when batting (the control lives in the batting panel)
    if g.has_btn('Declare innings'):
        g.btn('Declare innings'); g.btn('Declare', within='.sheet'); g.clear_sheets(); print('declared')
    g.btn('More'); g.btn('Sim the rest of the match'); g.wait_idle(); g.pg.wait_for_timeout(300); g.clear_sheets()
    m = g.js('({ph: SKR.app.match.m.phase, res: SKR.app.match.m.result && SKR.app.match.m.result.text})')
    print('test result', m); assert m['ph'] == 'done'
    g.shot('54_test_done', True)
    g.btn('Scorecard', within='.mtabs'); g.shot('55_test_card', True)
    g.btn('Continue', within='.dock'); g.wait_idle(); print('after quick match ->', g.screen())
    # ---- tournament: ICC T20 World Cup via the screens
    while g.screen() != 'menu':
        if not g.js('SKR.nav.back()'): g.js("SKR.app.toMenu()")
        g.pg.wait_for_timeout(150)
    g.row('Tournament'); g.row('T20 World Cup'); g.pg.wait_for_timeout(200)
    g.row('India'); g.wait_idle(); g.pg.wait_for_function("SKR.nav.cur().name === 'home'")
    g.shot('56_wc_home', True)
    # play the event: first user match by hand (toss + live), the rest simmed from the pre-match screen
    played_live = False
    for i in range(120):
        scr = g.screen()
        if scr == 'tournamentDone': break
        if scr == 'home':
            g.btn('Continue'); g.wait_idle()
        elif scr == 'natSquad':
            g.btn('Confirm squad'); g.wait_idle()
        elif scr == 'prematch':
            if not played_live:
                g.btn('Go to the toss'); g.btn('Heads', within='.sheet')
                g.btn('Bat first', within='.sheet') if g.has_btn('Bat first', within='.sheet') else g.btn('Start match', within='.sheet')
                g.pg.wait_for_timeout(300); g.clear_sheets(); played_live = True
                g.btn('More'); g.btn('Sim the rest of the match'); g.wait_idle(); g.pg.wait_for_timeout(200); g.clear_sheets()
                g.btn('Continue', within='.dock'); g.wait_idle()
            else:
                g.btn('Sim match'); g.wait_idle()
        elif scr in ('matchReport', 'quickResult', 'review', 'inbox', 'scorecard'):
            for t in ('Continue', 'Done'):
                if g.has_btn(t): g.btn(t); g.wait_idle(); break
            else: g.js('SKR.nav.back()'); g.pg.wait_for_timeout(150)
        else:
            print('unexpected screen', scr); g.shot('57_unexpected', True); break
    else:
        print('did not finish in 120 steps')
    print('end screen', g.screen()); g.shot('58_wc_end', True)
    report(g, 't5')
    assert not g.errors
    g.close()
