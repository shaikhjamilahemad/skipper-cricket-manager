"""Drive a whole career through the real UI screens, simming the user's matches, to catch runtime errors."""
import sys, time; sys.path.insert(0, '.')
from harness import *

ACT = {
 'prematch': "SK.App.simUserFixture(SK.UI.cur().params.ctx.fxId)",
 'matchReport': "SK.UI.screens.matchReport.actions.continue()",
 'retention': "SK.UI.handle(document.querySelector('[data-act=confirm]'))",
 'auctionIntro': "SK.AuctionUI.begin(SK.UI.cur().params.ev, new Set(), false)",
 'auction': "SK.App.auction.run.interactive=false; SK.App.auction.run.simAll(); SK.AuctionUI.complete()",
 'auctionDone': "SK.UI.screens.auctionDone.actions.done()",
 'natSquad': "SK.UI.handle(document.querySelector('[data-act=confirm]'))",
 'review': "SK.UI.screens.review.actions.ok()",
 'home': "SK.App.continue()",
}

def drive(g, until_day, shots_prefix=None, max_steps=3000, log_every=50):
    seen = {}
    t0 = time.time()
    for step in range(max_steps):
        g.wait_idle(300)
        s = g.screen(); day = g.js('SK.App.world ? SK.App.world.date : -1')
        seen[s] = seen.get(s, 0) + 1
        if shots_prefix and seen[s] <= 1 and s not in ('home', 'prematch', 'matchReport'):
            g.shot(f'{shots_prefix}_{s}', True)
        if day >= until_day and s == 'home': break
        if s == 'tournamentDone': break
        a = ACT.get(s)
        if not a: print('stuck on', s); break
        try: g.js(a)
        except Exception as e: print('js error', s, e); break
        g.pg.wait_for_timeout(30)
        if step % log_every == 0: print(f'step {step} day {day} screen {s} t={time.time()-t0:.0f}s errors={len(g.errors)}', flush=True)
    return seen
