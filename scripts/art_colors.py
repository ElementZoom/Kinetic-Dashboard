#!/usr/bin/env python3
"""
art_colors.py: dominant colour of an album-art picture, worked out exactly like the dashboard's Now playing glow.

Usage (called by a Home Assistant shell_command):
    python3 /config/scripts/art_colors.py "<picture url or file path>"

Prints one line of JSON, always, so the automation can read it with response_variable:
    {"ok": true, "color": [r, g, b], "hex": "#rrggbb", "gradient": ["#...", x5], "grey": false}
    {"ok": false, "error": "..."}            (nothing could be read: the automation falls back)
Needs only Python 3 and Pillow, which Home Assistant already ships with.
"""
import colorsys
import io
import json
import sys
import urllib.request

SIZE = 24   # same 24 x 24 sample as the dashboard


def load(src):
    if src.startswith(("http://", "https://")):
        req = urllib.request.Request(src, headers={"User-Agent": "ha-art-colors"})
        with urllib.request.urlopen(req, timeout=8) as r:
            return r.read()
    with open(src, "rb") as f:
        return f.read()


def dominant(img):
    from PIL import Image
    im = img.convert("RGB").resize((SIZE, SIZE), Image.BILINEAR)
    raw = im.tobytes()
    px = [(raw[i], raw[i + 1], raw[i + 2]) for i in range(0, len(raw), 3)]
    r = g = b = w = 0.0
    ar = ag = ab = 0
    for R, G, B in px:
        mx, mn = max(R, G, B), min(R, G, B)
        sat = (mx - mn) / mx if mx else 0
        wt = sat * sat * (0.25 + mx / 255) + 0.001   # colourful and bright pixels count most
        r += R * wt; g += G * wt; b += B * wt; w += wt
        ar += R; ag += G; ab += B
    col = [r / w, g / w, b / w]
    grey = (max(col) - min(col)) < 18
    if grey:   # greyscale art: plain average
        n = len(px)
        col = [ar / n, ag / n, ab / n]
    m = max(col) or 1
    k = 150 / m if m < 150 else 1   # keep it bright enough to glow
    return [int(round(min(255, v * k))) for v in col], grey


def gradient(col, grey):
    """Five hues around the dominant one (-30, -15, 0, +15, +30 degrees), saturated and bright, for a gradient light."""
    if grey:
        return []
    h, s, v = colorsys.rgb_to_hsv(*[c / 255 for c in col])
    s = max(s, 0.6)
    out = []
    for off in (-30, -15, 0, 15, 30):
        rr, gg, bb = colorsys.hsv_to_rgb(((h * 360 + off) % 360) / 360, s, 1.0)
        out.append("#%02x%02x%02x" % (round(rr * 255), round(gg * 255), round(bb * 255)))
    return out


def main():
    try:
        from PIL import Image
        data = load(sys.argv[1])
        img = Image.open(io.BytesIO(data))
        col, grey = dominant(img)
        print(json.dumps({"ok": True, "color": col, "hex": "#%02x%02x%02x" % tuple(col), "gradient": gradient(col, grey), "grey": grey}))
    except Exception as e:   # never crash: the automation reads this line
        print(json.dumps({"ok": False, "error": str(e)[:200]}))


if __name__ == "__main__":
    main()
