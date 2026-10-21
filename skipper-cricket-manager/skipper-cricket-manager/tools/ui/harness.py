"""Playwright harness: load the game in a phone-sized Chromium, collect console errors, take screenshots."""
import sys, json, time, os
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = 'file://' + os.path.normpath(os.path.join(HERE, '..', '..', 'www', 'index.html'))
OUT = os.environ.get('SKIPPER_SHOTS', os.path.join(HERE, 'shots'))  # screenshots (git-ignored)
os.makedirs(OUT, exist_ok=True)

class Game:
    def __init__(self, p, scale=1):
        self.b = p.chromium.launch(args=['--allow-file-access-from-files'])
        self.ctx = self.b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=scale, is_mobile=True, has_touch=True)
        self.pg = self.ctx.new_page()
        self.errors = []
        self.pg.on('console', lambda m: self.errors.append(m.text) if m.type in ('error',) else None)
        self.pg.on('pageerror', lambda e: self.errors.append('PAGEERROR ' + str(e)))
        self.pg.goto(ROOT)
        self.pg.wait_for_timeout(400)
    def js(self, code):
        return self.pg.evaluate(code)
    def shot(self, name, full=False):
        self.pg.screenshot(path=f'{OUT}/{name}.png', full_page=full)
        return f'{OUT}/{name}.png'
    def click(self, act, arg=None, within=None):
        sel = f'[data-act="{act}"]' + (f'[data-arg="{arg}"]' if arg is not None else '')
        if within: sel = within + ' ' + sel
        self.pg.locator(sel).first.click()
        self.pg.wait_for_timeout(150)
    def screen(self):
        return self.js('SK.UI.cur() && SK.UI.cur().name')
    def wait_idle(self, timeout=120):
        t0 = time.time()
        while time.time() - t0 < timeout:
            busy = self.js('!!SK.UI.busyEl')
            if not busy: return True
            self.pg.wait_for_timeout(250)
        return False
    def text(self):
        return self.js('document.getElementById("app").innerText')
    def close(self):
        self.b.close()
