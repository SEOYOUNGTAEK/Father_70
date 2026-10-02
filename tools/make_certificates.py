"""data/certificates.js 의 상장을 A4 세로(300dpi) 인쇄용 PNG 와 PDF 로 만든다.

사용: python tools/make_certificates.py      → print/ 폴더에 저장
날짜는 손으로 쓰도록 '2026년 ___월 ___일' 로 비워 둔다.
글꼴(고운바탕 TTF)은 처음 실행할 때 tools/.fonts/ 에 내려받는다.
"""
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "print"
FONT_DIR = ROOT / "tools" / ".fonts"
FONT_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/gowunbatang/"
W, H = 2480, 3508  # A4 300dpi
INK, SOFT, GOLD = (74, 52, 38), (138, 111, 90), (211, 143, 31)
THEME = {"fun": {"band": (200, 85, 61), "border": GOLD}, "warm": {"band": (138, 90, 59), "border": (184, 134, 43)}}


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


def draw_certificate(c):
    from PIL import Image, ImageDraw
    theme = THEME.get(c.get("tone"), THEME["fun"])
    im = Image.new("RGB", (W, H), (255, 253, 246))
    d = ImageDraw.Draw(im)

    # 가장자리로 갈수록 살짝 진해지는 종이 느낌
    for i in range(60):
        shade = (255 - i // 3, 252 - i // 2, 240 - i)
        d.rectangle([i * 2, i * 2, W - i * 2, H - i * 2], outline=shade, width=2)
    # 금색 이중 테두리 + 모서리 장식
    d.rectangle([130, 130, W - 130, H - 130], outline=theme["border"], width=16)
    d.rectangle([175, 175, W - 175, H - 175], outline=theme["border"], width=5)
    for cx, cy in [(175, 175), (W - 175, 175), (175, H - 175), (W - 175, H - 175)]:
        d.regular_polygon((cx, cy, 34), 4, rotation=45, fill=theme["border"])

    cx = W // 2
    head = font(True, 260)
    d.text((cx, 560), "  ".join(c["head"].replace(" ", "")), font=head, fill=INK, anchor="mm")

    # 상 이름 띠
    tf = font(True, 104)
    tw = d.textlength(c["title"], font=tf)
    d.rounded_rectangle([cx - tw / 2 - 90, 790, cx + tw / 2 + 90, 960], radius=85, fill=theme["band"])
    d.text((cx, 875), c["title"], font=tf, fill=(255, 255, 255), anchor="mm")

    left, right = 330, W - 330
    d.text((left, 1150), c["to"] + " 귀하", font=font(True, 100), fill=INK, anchor="ls")

    bf = font(False, 88)
    y = 1330
    for line in wrap(c["body"], right - left, lambda t: d.textlength(t, font=bf)):
        d.text((left, y), line, font=bf, fill=INK, anchor="ls")
        y += 160

    d.text((cx, H - 820), "2026년      월      일", font=font(False, 84), fill=SOFT, anchor="mm")

    # 주는 사람 — 도장 자리까지 넘치면 ' · ' 기준 가운데서 두 줄로
    ff = font(True, 84)
    lines = [c["from"]]
    if d.textlength(c["from"], font=ff) > right - left - 400:
        parts = c["from"].split(" · ")
        half = len(parts) // 2
        lines = [" · ".join(parts[:half]), " · ".join(parts[half:])]
    fw = max(d.textlength(t, font=ff) for t in lines)
    base = H - 600 - (len(lines) - 1) * 70
    for k, t in enumerate(lines):
        d.text((cx - 90, base + k * 140), t, font=ff, fill=INK, anchor="mm")
    # 빨간 도장
    sx, sy, r = cx - 90 + fw / 2 + 150, H - 600, 120
    seal = Image.new("RGBA", (r * 2 + 20, r * 2 + 20), (0, 0, 0, 0))
    sd = ImageDraw.Draw(seal)
    sd.ellipse([10, 10, r * 2 + 10, r * 2 + 10], outline=(192, 57, 43, 230), width=14)
    sd.text((r + 10, r + 10), c["seal"], font=font(True, 80), fill=(192, 57, 43, 230), anchor="mm")
    seal = seal.rotate(12, resample=Image.BICUBIC)
    im.paste(seal, (int(sx - r - 10), int(sy - r - 10)), seal)
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
    pages[0].save(OUT / "상장_전체_인쇄용.pdf", save_all=True, append_images=pages[1:], resolution=300)
    print("저장:", OUT / "상장_전체_인쇄용.pdf")


if __name__ == "__main__":
    main()
