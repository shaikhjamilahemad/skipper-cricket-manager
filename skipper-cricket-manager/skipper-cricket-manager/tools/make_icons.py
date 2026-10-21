"""Draw the Skipper launcher icon (original art: stumps, bails and a ball) at every Android density."""
from PIL import Image, ImageDraw
import os, math
RES = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'android', 'res')
BG = (16, 38, 31, 255); CHALK = (238, 241, 232, 255); STRAW = (217, 194, 126, 255); RED = (200, 49, 47, 255); SEAM = (243, 215, 198, 255)

def art(size, unit_box=108, full_bg=False, radius=0.0):
    S = size * 4  # supersample
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    u = S / unit_box
    if full_bg:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * radius), fill=BG)
    off = (unit_box - 108) / 2  # center the 108 design
    def R(x0, y0, x1, y1): return [(x0 + off) * u, (y0 + off) * u, (x1 + off) * u, (y1 + off) * u]
    # stumps
    sw, gap, top, bot = 7.2, 6.4, 33, 79
    total = 3 * sw + 2 * gap; x = 54 - total / 2
    xs = []
    for i in range(3):
        d.rounded_rectangle(R(x, top, x + sw, bot), radius=int(sw * u * 0.42), fill=CHALK)
        xs.append(x); x += sw + gap
    # bails: two, resting on the stump tops
    bh = 3.6
    d.rounded_rectangle(R(xs[0] - 1.2, top - bh - 1.2, xs[1] + sw - 0.6, top - 1.2), radius=int(bh * u / 2), fill=STRAW)
    d.rounded_rectangle(R(xs[1] + 0.6, top - bh - 1.2, xs[2] + sw + 1.2, top - 1.2), radius=int(bh * u / 2), fill=STRAW)
    # ball in front, lower right
    cx, cy, r = 68.5, 72.5, 10.5
    d.ellipse(R(cx - r - 1.6, cy - r - 1.6, cx + r + 1.6, cy + r + 1.6), fill=BG)
    d.ellipse(R(cx - r, cy - r, cx + r, cy + r), fill=RED)
    # seam: a curved stitched line across the ball
    pts = []
    for t in range(0, 101):
        a = -1.05 + 2.1 * t / 100
        px = cx + (r * 0.92) * math.sin(a) * 0.55 + (t / 100 - 0.5) * 2.0
        py = cy - (r * 0.92) * math.cos(a) * 0.0 + (t / 100 - 0.5) * 2 * r * 0.88
        pts.append(((px + off) * u, (py + off) * u))
    d.line(pts, fill=SEAM, width=max(1, int(1.1 * u)))
    for k in range(1, 9):
        t = k / 9
        px, py = pts[int(t * 100)]
        d.line([(px - 1.6 * u, py), (px + 1.6 * u, py)], fill=SEAM, width=max(1, int(0.8 * u)))
    return im.resize((size, size), Image.LANCZOS)

dens = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for name, f in dens.items():
    dd = f'{RES}/mipmap-{name}'; os.makedirs(dd, exist_ok=True)
    # legacy (API < 26): rounded square, art zoomed so the 108 design fills the 48dp icon nicely
    art(int(48 * f), unit_box=80, full_bg=True, radius=0.2).save(f'{dd}/ic_launcher.png')
    # adaptive foreground layer: 108dp
    art(int(108 * f), unit_box=108).save(f'{dd}/ic_fg.png')
os.makedirs(f'{RES}/mipmap-anydpi-v26', exist_ok=True)
open(f'{RES}/mipmap-anydpi-v26/ic_launcher.xml', 'w').write('''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_bg"/>
    <foreground android:drawable="@mipmap/ic_fg"/>
</adaptive-icon>
''')
# preview: legacy + adaptive in a circle mask
prev = Image.new('RGBA', (560, 220), (40, 40, 40, 255))
leg = art(192, unit_box=80, full_bg=True, radius=0.2); prev.paste(leg, (14, 14), leg)
fg = art(432, unit_box=108); bg = Image.new('RGBA', (432, 432), BG); bg.alpha_composite(fg)
mask = Image.new('L', (432, 432), 0); ImageDraw.Draw(mask).ellipse([36, 36, 396, 396], fill=255)
circ = Image.new('RGBA', (432, 432), (0, 0, 0, 0)); circ.paste(bg, (0, 0), mask)
circ = circ.crop((36, 36, 396, 396)).resize((192, 192), Image.LANCZOS); prev.paste(circ, (220, 14), circ)
small = art(48, unit_box=80, full_bg=True, radius=0.2); prev.paste(small, (440, 14), small)
prev.save(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'icon_preview.png'))
print('icons ok')
