#!/usr/bin/env python3
"""Generate every Android branding asset from the single uploaded New Royal Cars logo.

The source logo is a white line-art car on a black background. It is NOT
redrawn: the black background is turned into transparency by using the image's
own luminance as the alpha channel, so the exact original strokes are reused at
every density.

Usage:
    python android/tools/generate-brand-assets.py [source-logo.png]

Outputs (all under android/app/src/main/res):
    mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher{,_round,_foreground}.png
    drawable/splash.png, drawable-port-*/splash.png, drawable-land-*/splash.png
    drawable/ic_stat_nrc.png        (monochrome status-bar / notification icon)
"""

import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
RES = os.path.normpath(os.path.join(HERE, "..", "app", "src", "main", "res"))
DEFAULT_SOURCE = os.path.normpath(os.path.join(HERE, "..", "brand", "newroyalcars-logo.png"))

# Brand palette, matching the existing website theme.
BACKGROUND = (5, 6, 7, 255)  # #050607
GOLD = (201, 162, 39, 255)  # #c9a227
WHITE = (255, 255, 255, 255)

# (density folder, legacy icon px, adaptive foreground px)
MIPMAPS = [
    ("mipmap-mdpi", 48, 108),
    ("mipmap-hdpi", 72, 162),
    ("mipmap-xhdpi", 96, 216),
    ("mipmap-xxhdpi", 144, 324),
    ("mipmap-xxxhdpi", 192, 432),
]

# (density folder, portrait size, landscape size)
SPLASHES = [
    ("drawable-port-mdpi", (320, 480), (480, 320)),
    ("drawable-port-hdpi", (480, 800), (800, 480)),
    ("drawable-port-xhdpi", (720, 1280), (1280, 720)),
    ("drawable-port-xxhdpi", (960, 1600), (1600, 960)),
    ("drawable-port-xxxhdpi", (1280, 1920), (1920, 1280)),
]


def load_glyph(source_path):
    """Return the logo as white RGBA line art on a fully transparent canvas."""
    source = Image.open(source_path).convert("RGB")

    # The uploaded mark is white line art on a very dark panel: the panel is not
    # a pure #000000 (it measures ~9/255), so using raw luminance as alpha would
    # leave a faint grey rectangle behind the car. Everything at or below the
    # floor is treated as background, and the rest of the range is stretched so
    # the original strokes become crisp, fully opaque white.
    floor = 40
    alpha = source.convert("L").point(
        lambda value: 0
        if value <= floor
        else min(255, int((value - floor) * 255 / (255 - floor)))
    )

    histogram = alpha.histogram()
    total = sum(histogram)
    if total:
        print(
            "  source %dx%d | %.1f%% of pixels are stroke"
            % (source.width, source.height, 100.0 * (total - histogram[0]) / total)
        )

    white = Image.new("L", source.size, 255)
    glyph = Image.merge("RGBA", (white, white, white, alpha))

    # Drop empty margins so centring is based on the mark itself.
    box = alpha.getbbox()
    if box:
        glyph = glyph.crop(box)
    return glyph


def scaled(glyph, width):
    width = max(1, int(width))
    height = max(1, round(glyph.height * width / glyph.width))
    return glyph.resize((width, height), Image.LANCZOS)


def centred(canvas, glyph, ratio, y_ratio=0.5):
    art = scaled(glyph, canvas.width * ratio)
    x = (canvas.width - art.width) // 2
    y = int(canvas.height * y_ratio - art.height / 2)
    canvas.alpha_composite(art, (max(0, x), max(0, y)))


def rounded_background(size, colour, radius_ratio=None):
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    if radius_ratio is None:
        draw.ellipse((0, 0, size - 1, size - 1), fill=255)
    else:
        draw.rounded_rectangle(
            (0, 0, size - 1, size - 1), radius=int(size * radius_ratio), fill=255
        )
    layer = Image.new("RGBA", (size, size), colour)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(layer, (0, 0), mask)
    return canvas


def load_font(size):
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/segoeuib.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def draw_tracked_text(draw, text, font, centre_x, y, fill, tracking):
    widths = [draw.textlength(char, font=font) for char in text]
    total = sum(widths) + tracking * (len(text) - 1)
    x = centre_x - total / 2
    for char, width in zip(text, widths):
        draw.text((x, y), char, font=font, fill=fill)
        x += width + tracking


def build_launcher_icons(glyph):
    for folder, legacy, foreground in MIPMAPS:
        directory = os.path.join(RES, folder)
        os.makedirs(directory, exist_ok=True)

        # Adaptive icon foreground: mark only, sized so the wide 2.5:1 logo's
        # diagonal still fits inside the 66dp safe zone of the 108dp canvas.
        fg = Image.new("RGBA", (foreground, foreground), (0, 0, 0, 0))
        centred(fg, glyph, 0.55)
        fg.save(os.path.join(directory, "ic_launcher_foreground.png"))

        # Legacy launcher icons (API 24-25): mark on the brand tile.
        square = rounded_background(legacy, BACKGROUND, radius_ratio=0.20)
        centred(square, glyph, 0.70)
        square.save(os.path.join(directory, "ic_launcher.png"))

        circle = rounded_background(legacy, BACKGROUND)
        centred(circle, glyph, 0.64)
        circle.save(os.path.join(directory, "ic_launcher_round.png"))
        print("  %s -> ic_launcher, ic_launcher_round, ic_launcher_foreground" % folder)


def build_splashes(glyph):
    label = "NEW ROYAL CARS"
    targets = [("drawable", (1080, 1080))]
    for folder, portrait, landscape in SPLASHES:
        targets.append((folder, portrait))
        targets.append((folder.replace("port", "land"), landscape))

    for folder, (width, height) in targets:
        directory = os.path.join(RES, folder)
        os.makedirs(directory, exist_ok=True)

        canvas = Image.new("RGBA", (width, height), BACKGROUND)
        base = min(width, height)

        centred(canvas, glyph, 0.40, y_ratio=0.44)

        font = load_font(max(11, int(base * 0.042)))
        draw = ImageDraw.Draw(canvas)
        draw_tracked_text(
            draw,
            label,
            font,
            width / 2,
            int(height * 0.60),
            GOLD,
            tracking=max(1.0, base * 0.010),
        )

        rule_width = int(width * 0.22)
        rule_y = int(height * 0.685)
        draw.rectangle(
            ((width - rule_width) / 2, rule_y, (width + rule_width) / 2, rule_y + max(1, int(base * 0.0025))),
            fill=(201, 162, 39, 90),
        )

        canvas.convert("RGB").save(os.path.join(directory, "splash.png"))
        print("  %s/splash.png %dx%d" % (folder, width, height))


def notification_mark(glyph, size):
    """The mark as pure white art whose alpha carries the shape.

    Android tints small icons by their alpha channel, so colour is irrelevant;
    the strokes are thickened a little (and re-smoothed) so the thin original
    lines stay readable when the system scales this down to ~24dp.
    """
    oversized = scaled(glyph, max(160, size * 3))
    alpha = oversized.split()[3]
    alpha = alpha.filter(ImageFilter.MaxFilter(3))
    alpha = alpha.filter(ImageFilter.GaussianBlur(max(0.5, oversized.width / 320.0)))
    alpha = alpha.point(lambda value: min(255, int(value * 1.35)))

    white = Image.new("L", oversized.size, 255)
    mark = Image.merge("RGBA", (white, white, white, alpha))
    mark = mark.resize((size, max(1, round(size * mark.height / mark.width))), Image.LANCZOS)

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))
    return canvas


def build_notification_icon(glyph):
    """Monochrome status-bar / notification icon."""
    canvas = notification_mark(glyph, 96)
    directory = os.path.join(RES, "drawable")
    os.makedirs(directory, exist_ok=True)
    canvas.save(os.path.join(directory, "ic_stat_nrc.png"))
    print("  drawable/ic_stat_nrc.png 96x96")


def build_preview(glyph, source_note):
    """Write a self-contained HTML sheet (base64 images) so the generated
    branding can be eyeballed in the app's preview panel."""
    import base64
    import io

    def data_uri(image, fmt="PNG"):
        buffer = io.BytesIO()
        image.save(buffer, fmt)
        return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")

    tile = lambda size: rounded_background(size, BACKGROUND, radius_ratio=0.20)  # noqa: E731
    circle = lambda size: rounded_background(size, BACKGROUND)  # noqa: E731

    adaptive_bg = Image.new("RGBA", (216, 216), BACKGROUND)
    adaptive_fg = Image.new("RGBA", (216, 216), (0, 0, 0, 0))
    centred(adaptive_fg, glyph, 0.55)
    adaptive = adaptive_bg.copy()
    adaptive.alpha_composite(adaptive_fg)

    square = tile(192)
    centred(square, glyph, 0.70)
    round_icon = circle(192)
    centred(round_icon, glyph, 0.64)

    notch = notification_mark(glyph, 96)

    splash = Image.open(os.path.join(RES, "drawable", "splash.png")).resize((300, 300), Image.LANCZOS)

    def cell(title, image, bg="#0d0f11"):
        return (
            '<figure style="margin:0;text-align:center">'
            '<div style="width:208px;height:208px;display:flex;align-items:center;'
            'justify-content:center;background:%s;border:1px solid #26282c;border-radius:14px">'
            '<img src="%s" style="max-width:170px;max-height:170px">'
            '</div><figcaption style="color:#9aa0a6;font:11px system-ui;margin-top:8px">%s</figcaption>'
            '</figure>' % (bg, data_uri(image), title)
        )

    html = """<!doctype html><html><body style="background:#050607;margin:0;padding:26px;font-family:system-ui">
<div style="color:#c9a227;letter-spacing:.28em;font-size:12px;text-transform:uppercase">New Royal Cars &mdash; Android branding</div>
<div style="color:#6b7280;font-size:11.5px;margin-top:6px">Derived from the uploaded logo (%s) &mdash; same art, no redraw.</div>
<div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:22px">
%s
</div></body></html>""" % (
        source_note,
        "\n".join(
            [
                cell("Adaptive icon (API 26+)", adaptive),
                cell("Launcher tile", square),
                cell("Launcher round", round_icon),
                cell("Notification icon on dark", notch),
                cell("Notification icon on light", notch, bg="#f2f2f2"),
                cell("Splash screen", splash),
            ]
        ),
    )

    out = os.path.join(HERE, "brand-preview.html")
    with open(out, "w", encoding="utf-8") as handle:
        handle.write(html)
    print("Preview: %s" % out)


def main():
    source = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SOURCE
    if not os.path.exists(source):
        raise SystemExit("Source logo not found: %s" % source)

    print("Loading New Royal Cars logo from %s" % source)
    glyph = load_glyph(source)
    print("  glyph bounding box: %dx%d" % glyph.size)

    print("Launcher icons:")
    build_launcher_icons(glyph)
    print("Notification icon:")
    build_notification_icon(glyph)
    print("Splash screens:")
    build_splashes(glyph)
    build_preview(glyph, os.path.basename(source))
    print("Done.")


if __name__ == "__main__":
    main()
