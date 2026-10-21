"""Playwright harness: opens the built game (dist/index.html) in a phone-sized Chromium.
Build first with `npm run build`. Set SKIPPER_URL to test the dev server instead (http://localhost:5173).
Everything is driven through the real buttons; the page also exposes window.SKR (app, nav, ui, SK) for checks."""
import os, re, time
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
URL = os.environ.get('SKIPPER_URL') or 'file://' + os.path.normpath(os.path.join(HERE, '..', '..', 'dist', 'index.html'))
OUT = os.environ.get('SKIPPER_SHOTS', os.path.join(HERE, 'shots'))  # screenshots (git-ignored)
os.makedirs(OUT, exist_ok=True)


class Game:
    def __init__(self, p, scale=1):
        self.b = p.chromium.launch()
        self.ctx = self.b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=scale, is_mobile=True, has_touch=True)
        self.pg = self.ctx.new_page()
        self.errors = []
        self.pg.on('console', lambda m: self.errors.append(m.text) if m.type == 'error' else None)
        self.pg.on('pageerror', lambda e: self.errors.append('PAGEERROR ' + str(e)))
        self.pg.goto(URL)
        self.pg.wait_for_function('window.SKR && SKR.nav.cur()')
        self.pg.wait_for_timeout(200)

    def js(self, code):
        return self.pg.evaluate(code)

    def shot(self, name, full=False):
        self.pg.screenshot(path=f'{OUT}/{name}.png', full_page=full)
        return f'{OUT}/{name}.png'

    def screen(self):
        return self.js('SKR.nav.cur() && SKR.nav.cur().name')

    def wait_idle(self, timeout=180):
        t0 = time.time()
        self.pg.wait_for_timeout(60)
        while time.time() - t0 < timeout:
            if not self.js('!!SKR.ui.busy'):
                self.pg.wait_for_timeout(60)
                if not self.js('!!SKR.ui.busy'):
                    return True
            self.pg.wait_for_timeout(200)
        raise TimeoutError('still busy')

    def _btns(self, text, within=None):
        # a button whose visible text starts with `text` (rows hold a title and a subtitle)
        root = self.pg.locator(within) if within else self.pg
        return root.locator('button').filter(has_text=re.compile(r'^\s*' + re.escape(text)))

    def btn(self, text, within=None, nth=0, wait=120):
        self._btns(text, within).nth(nth).click()
        self.pg.wait_for_timeout(wait)

    def row(self, text, within=None, wait=120):
        # a list row (button.row) that contains `text` anywhere, e.g. a team name next to its badge
        root = self.pg.locator(within) if within else self.pg
        root.locator('button.row').filter(has_text=text).first.click()
        self.pg.wait_for_timeout(wait)

    def has_btn(self, text, within=None):
        return self._btns(text, within).count() > 0

    def sheet(self):
        return self.pg.locator('.sheet')

    def sheet_open(self):
        return self.pg.locator('.sheet').count() > 0

    def text(self):
        return self.js('document.getElementById("app").innerText')

    def start_career(self, team, auctions=True, manager='Jamil'):
        self.js(f"SKR.app.startCareer({{team:'{team}', manager:'{manager}', auctions:{str(auctions).lower()}}})")
        self.pg.wait_for_timeout(200)
        self.wait_idle()
        self.pg.wait_for_function("SKR.nav.cur().name === 'home'")

    def clear_sheets(self, limit=6):
        """Answer bowler / follow-on sheets like a player: enforce, else pick the first enabled option."""
        for _ in range(limit):
            if not self.sheet_open(): return
            txt = self.sheet().inner_text().lower()
            if 'follow-on' in txt:
                self.btn('Enforce', within='.sheet'); continue
            rows = self.sheet().locator('button.row:not([disabled])')
            if rows.count(): rows.first.click(); self.pg.wait_for_timeout(100)
            else: self.btn('Let the computer choose', within='.sheet')

    def close(self):
        self.b.close()


def report(g, label=''):
    print(label, 'ERRORS:', len(g.errors), g.errors[:5])
