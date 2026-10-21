import sys; sys.path.insert(0, '.')
from harness import *
with sync_playwright() as p:
    g = Game(p)
    print('screen', g.screen())
    g.shot('01_menu')
    g.click('newCareer'); g.shot('02_newcareer')
    print('screen', g.screen(), g.text()[:600])
    print('ERRORS', g.errors)
    g.close()
