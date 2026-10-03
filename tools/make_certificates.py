"""data/certificates.js 의 상장을 A4 세로(300dpi) 인쇄용 PNG 와 PDF 로 만든다.

사용: python tools/make_certificates.py      → print/ 폴더에 저장
진짜 상장처럼: 금색 물결무늬(기요셰) 테두리, 모서리 장식, 금빛 메달·리본, 금색 제목, 七旬 워터마크, 붉은 사각 직인.
글꼴(고운바탕 TTF)은 처음 실행할 때 tools/.fonts/ 에 내려받는다.
"""
import json
import math
import random
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "print"
FONT_DIR = ROOT / "tools" / ".fonts"
FONT_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/gowunbatang/"
W, H = 2480, 3508  # A4 300dpi
MARGIN = 130  # 바깥 흰 여백(약 11mm) — 프린터가 못 찍는 가장자리가 생겨도 흰 테두리로 자연스럽게
INK, SOFT = (52, 36, 26), (120, 96, 76)
GOLD_DARK, GOLD, GOLD_LIGHT = (138, 98, 34), (190, 145, 60), (236, 204, 128)
SEAL_RED = (190, 40, 36)
THEME = {"fun": {"accent": (176, 46, 34)}, "warm": {"accent": (110, 44, 40)}}


def load_certificates(js_text):
    start, end = re.search(r"=\s*\[", js_text).end() - 1, js_text.rindex("]")
    return json.loads(js_text[start:end + 1])


def wrap(text, width, measure):
    """띄어쓰기 단위로 줄바꿈 (한국어 낱말이 중간에 끊기지 않게)"""
    lines, cur = [], ""
    for word in text.split(" "):
        cand = (cur + " " + word).strip()
        if cur and measure(cand) > width:
            lines.append(cur)
            cur = word
        else:
            cur = cand
    if cur:
        lines.append(cur)
    return lines


def font(bold, size):
    from PIL import ImageFont
    name = "GowunBatang-Bold.ttf" if bold else "GowunBatang-Regular.ttf"
    path = FONT_DIR / name
    if not path.exists():
        FONT_DIR.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(FONT_URL + name, path)
    return ImageFont.truetype(str(path), size)


def hanja_font(size):
    """七旬 처럼 한자가 있는 바탕체 (고운바탕에는 한자가 없음) — Windows 기본 글꼴 사용"""
    from PIL import ImageFont
    for path in ("C:/Windows/Fonts/HANBatangB.ttf", "C:/Windows/Fonts/batang.ttc", "/System/Library/Fonts/AppleMyungjo.ttf"):
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return font(True, size)


def gold_gradient(w, h):
    """위→아래 금박 느낌 그라데이션 (어두움→밝음→어두움)"""
    from PIL import Image
    g = Image.new("RGB", (1, h))
    stops = [(0, GOLD_DARK), (0.45, GOLD_LIGHT), (0.55, GOLD_LIGHT), (1, GOLD_DARK)]
    for y in range(h):
        t = y / max(1, h - 1)
        for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
            if t0 <= t <= t1:
                k = (t - t0) / (t1 - t0) if t1 > t0 else 0
                g.putpixel((0, y), tuple(int(c0[i] + (c1[i] - c0[i]) * k) for i in range(3)))
                break
    return g.resize((w, h))


def gold_text(im, xy, text, fnt, anchor="mm", shadow=True):
    from PIL import Image, ImageDraw
    mask = Image.new("L", im.size, 0)
    ImageDraw.Draw(mask).text(xy, text, font=fnt, fill=255, anchor=anchor)
    box = mask.getbbox()
    if not box:
        return
    if shadow:
        sh = Image.new("L", im.size, 0)
        ImageDraw.Draw(sh).text((xy[0] + 6, xy[1] + 6), text, font=fnt, fill=70, anchor=anchor)
        im.paste((90, 60, 20), (0, 0), sh)
    grad = gold_gradient(box[2] - box[0], box[3] - box[1])
    im.paste(grad, box[:2], mask.crop(box))


def paper(d_im):
    """상아색 종이 + 가장자리 살짝 어둡게 + 미세한 결"""
    from PIL import Image
    base = Image.new("RGB", (W, H), (253, 249, 236))
    edge = Image.new("RGB", (W, H), (232, 218, 186))
    vign = Image.radial_gradient("L").resize((W, H)).point(lambda v: max(0, v - 90) * 1.1)
    base = Image.composite(edge, base, vign)
    noise = Image.effect_noise((W // 2, H // 2), 22).resize((W, H)).convert("RGB")
    base = Image.blend(base, noise, 0.035)
    sheet = Image.new("RGB", (W, H), (255, 255, 255))  # 테두리 밖은 흰 종이 그대로
    box = (MARGIN, MARGIN, W - MARGIN, H - MARGIN)
    sheet.paste(base.crop(box), box[:2])
    return sheet


def guilloche_frame(d):
    """금색 이중선 사이에 서로 엇갈린 물결무늬"""
    o, band, inner = MARGIN, 150, MARGIN + 168
    d.rectangle([o, o, W - o, H - o], outline=GOLD_DARK, width=16)
    d.rectangle([o + 26, o + 26, W - o - 26, H - o - 26], outline=GOLD, width=4)
    cy_top, cy_bot, cx_l, cx_r = o + 26 + band // 2 - 8, H - o - 26 - band // 2 + 8, o + 26 + band // 2 - 8, W - o - 26 - band // 2 + 8
    amp, period = 34, 84
    for phase in (0, 2 * math.pi / 3, 4 * math.pi / 3):
        for horiz, c0, a, b in ((True, cy_top, o + 30, W - o - 30), (True, cy_bot, o + 30, W - o - 30),
                                (False, cx_l, o + 30, H - o - 30), (False, cx_r, o + 30, H - o - 30)):
            pts = []
            for t in range(a, b, 4):
                v = c0 + amp * math.sin(2 * math.pi * t / period + phase)
                pts.append((t, v) if horiz else (v, t))
            d.line(pts, fill=GOLD, width=3)
    d.rectangle([inner, inner, W - inner, H - inner], outline=GOLD_DARK, width=8)
    d.rectangle([inner + 22, inner + 22, W - inner - 22, H - inner - 22], outline=GOLD, width=3)
    # 모서리 꽃 장식
    for cx, cy in ((cx_l, cy_top), (cx_r, cy_top), (cx_l, cy_bot), (cx_r, cy_bot)):
        d.ellipse([cx - 92, cy - 92, cx + 92, cy + 92], fill=(253, 248, 232), outline=GOLD_DARK, width=8)
        for k in range(12):
            ang = 2 * math.pi * k / 12
            px, py = cx + 52 * math.cos(ang), cy + 52 * math.sin(ang)
            d.ellipse([px - 17, py - 17, px + 17, py + 17], fill=GOLD_LIGHT, outline=GOLD_DARK, width=3)
        d.ellipse([cx - 26, cy - 26, cx + 26, cy + 26], fill=GOLD, outline=GOLD_DARK, width=4)


def medal(im, d, cx, cy, accent):
    """금빛 메달 + 리본"""
    for side in (-1, 1):  # 리본 꼬리
        x0 = cx + side * 40
        d.polygon([(x0 - 55, cy + 60), (x0 + 55, cy + 60), (x0 + 55 + side * 40, cy + 300), (x0 + side * 40, cy + 250),
                   (x0 - 55 + side * 40, cy + 300)], fill=accent, outline=(90, 20, 15))
    for k in range(48):  # 햇살 테두리
        a0, a1 = 2 * math.pi * k / 48, 2 * math.pi * (k + 0.5) / 48
        d.polygon([(cx + 150 * math.cos(a0), cy + 150 * math.sin(a0)), (cx + 190 * math.cos((a0 + a1) / 2), cy + 190 * math.sin((a0 + a1) / 2)),
                   (cx + 150 * math.cos(a1), cy + 150 * math.sin(a1))], fill=GOLD_DARK)
    grad = gold_gradient(320, 320)
    from PIL import Image, ImageDraw
    m = Image.new("L", (320, 320), 0)
    ImageDraw.Draw(m).ellipse([0, 0, 319, 319], fill=255)
    im.paste(grad, (cx - 160, cy - 160), m)
    d.ellipse([cx - 160, cy - 160, cx + 160, cy + 160], outline=GOLD_DARK, width=6)
    d.ellipse([cx - 128, cy - 128, cx + 128, cy + 128], outline=(255, 245, 210), width=4)
    d.text((cx, cy + 4), "七旬", font=hanja_font(118), fill=(120, 30, 22), anchor="mm")


def diamond(d, x, y, r, fill):
    d.polygon([(x, y - r), (x + r, y), (x, y + r), (x - r, y)], fill=fill)


def square_stamp(text, size=250):
    """붉은 사각 직인 — 2×2 글자, 이중 테두리, 인주 번진 느낌"""
    from PIL import Image, ImageDraw
    s = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(s)
    col = SEAL_RED + (225,)
    d.rounded_rectangle([6, 6, size - 6, size - 6], radius=16, outline=col, width=14)
    d.rectangle([30, 30, size - 30, size - 30], outline=col, width=4)
    f = font(True, int(size * 0.33))
    chars = list(text[:4].ljust(4))
    # 왼쪽→오른쪽, 위→아래로 읽히게: 손주 / 일동
    pos = [(0.30, 0.31), (0.70, 0.31), (0.30, 0.70), (0.70, 0.70)]
    for ch, (px, py) in zip(chars, pos):
        d.text((size * px, size * py), ch, font=f, fill=col, anchor="mm")
    rnd = random.Random(text)  # 군데군데 인주가 덜 묻은 자국
    for _ in range(260):
        x, y, r = rnd.randint(0, size), rnd.randint(0, size), rnd.randint(1, 4)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(0, 0, 0, 0))
    return s.rotate(-6, resample=Image.BICUBIC, expand=True)


def draw_certificate(c):
    from PIL import Image, ImageDraw
    accent = THEME.get(c.get("tone"), THEME["fun"])["accent"]
    im = paper(None)

    # 七旬 워터마크
    wm = Image.new("L", (W, H), 0)
    ImageDraw.Draw(wm).text((W // 2, H // 2 + 250), "七旬", font=hanja_font(900), fill=15, anchor="mm")
    im.paste(GOLD, (0, 0), wm)

    d = ImageDraw.Draw(im)
    guilloche_frame(d)
    cx = W // 2

    d.text((390, 430), c.get("no", ""), font=font(False, 58), fill=SOFT, anchor="ls")
    medal(im, d, cx, 560, accent)

    gold_text(im, (cx, 1000), "   ".join(c["head"].replace(" ", "")), font(True, 250))

    # 상 이름 + 양옆 장식선
    tf = font(True, 98)
    d.text((cx, 1235), c["title"], font=tf, fill=accent, anchor="mm")
    tw = d.textlength(c["title"], font=tf)
    for side in (-1, 1):
        x0, x1 = cx + side * (tw / 2 + 50), cx + side * (tw / 2 + 330)
        d.line([(x0, 1235), (x1, 1235)], fill=GOLD_DARK, width=5)
        diamond(d, x0, 1235, 14, GOLD_DARK)
        diamond(d, x1, 1235, 10, GOLD)

    # 받는 분
    nf, gf = font(True, 128), font(False, 84)
    name, honor = c["to"], "  귀하"
    nw, hw = d.textlength(name, font=nf), d.textlength(honor, font=gf)
    x = cx - (nw + hw) / 2
    d.text((x, 1480), name, font=nf, fill=INK, anchor="ls")
    d.text((x + nw, 1480), honor, font=gf, fill=SOFT, anchor="ls")
    for k in (-1, 0, 1):
        diamond(d, cx + k * 50, 1570, 9 if k else 13, GOLD_DARK if k == 0 else GOLD)

    # 본문 — 가운데 정렬, 길면 글씨를 줄여 날짜 위에 맞춤
    left, right = 420, W - 420
    top, limit = 1760, H - 1110
    for size in (104, 98, 92, 86, 80):
        bf = font(False, size)
        lines = wrap(c["body"], right - left, lambda t: d.textlength(t, font=bf))
        step = int(size * 1.95)
        if top + (len(lines) - 1) * step <= limit:
            break
    y = top
    for line in lines:
        d.text((cx, y), line, font=bf, fill=INK, anchor="ms")
        y += step

    d.text((cx, H - 900), c.get("date", ""), font=font(False, 88), fill=INK, anchor="mm")

    # 주는 사람 + 붉은 사각 직인
    # 한 줄에 들어가면 한 줄(필요하면 글씨를 조금 줄임), 그래도 길면 ' · ' 기준 두 줄
    room = right - left - 340
    ff = font(True, 90)
    for size in (90, 84, 78):
        if d.textlength(c["from"], font=font(True, size)) <= room:
            ff = font(True, size)
            break
    lines = [c["from"]]
    if d.textlength(c["from"], font=ff) > room:
        parts = c["from"].split(" · ")
        half = len(parts) // 2
        lines = [" · ".join(parts[:half]), " · ".join(parts[half:])]
    fw = max(d.textlength(t, font=ff) for t in lines)
    base = H - 680 - (len(lines) - 1) * 72
    for k, t in enumerate(lines):
        d.text((cx - 110, base + k * 145), t, font=ff, fill=INK, anchor="mm")
    stamp = square_stamp(c.get("stamp") or c.get("seal", ""))
    sx = int(cx - 110 + fw / 2 + 30)
    sy = int(H - 680 - stamp.height / 2)
    im.paste(stamp, (sx, sy), stamp)
    return im


def main():
    certs = load_certificates((ROOT / "data" / "certificates.js").read_text(encoding="utf-8"))
    OUT.mkdir(exist_ok=True)
    pages = []
    for n, c in enumerate(certs, 1):
        im = draw_certificate(c)
        name = f"상장_{n}_{c['seal']}_{c['title'].replace(' ', '')}.png"
        im.save(OUT / name, dpi=(300, 300))
        pages.append(im)
        print("저장:", OUT / name)
    # PDF 뷰어에서 열려 있으면 덮어쓸 수 없으니 _2, _3 … 새 이름으로
    for n in range(1, 20):
        pdf = OUT / ("상장_전체_인쇄용.pdf" if n == 1 else f"상장_전체_인쇄용_{n}.pdf")
        try:
            pages[0].save(pdf, save_all=True, append_images=pages[1:], resolution=300)
            break
        except PermissionError:
            continue
    print("저장:", pdf)


if __name__ == "__main__":
    main()
