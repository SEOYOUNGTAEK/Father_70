"""금메달 VIP 카드(화면 부상 수여 장면과 같은 디자인)를 실제 카드 크기로 인쇄용 PDF/PNG 로 만든다.

카드 크기: 85.6 × 54 mm (신용카드·ATM 카드 표준), 600dpi.
A4 한 장에 앞면·뒷면 2세트와 자르는 선을 배치 → print/금메달카드_인쇄용.pdf
사용: python tools/make_card.py   (인쇄할 때 '실제 크기 100%')
"""
import math
from pathlib import Path

from make_certificates import ROOT, font, hanja_font

OUT = ROOT / "print"
DPI = 600
MM = DPI / 25.4
CW, CH = round(85.6 * MM), round(54 * MM)  # 2022 × 1276
RADIUS = round(3.18 * MM)
STOPS = [(0, (138, 98, 34)), (.22, (233, 196, 106)), (.38, (255, 241, 194)), (.55, (217, 169, 63)),
         (.72, (247, 220, 140)), (1, (155, 112, 38))]
INK = (74, 50, 16)


def lerp_stops(t):
    for (t0, c0), (t1, c1) in zip(STOPS, STOPS[1:]):
        if t0 <= t <= t1:
            k = (t - t0) / (t1 - t0)
            return tuple(round(c0[i] + (c1[i] - c0[i]) * k) for i in range(3))
    return STOPS[-1][1]


def gold_diagonal(w, h):
    """135도 방향 금박 그라데이션 (화면 카드와 같은 색 단계)"""
    from PIL import Image, ImageChops
    lut = [lerp_stops(i / 255) for i in range(256)]
    vert = Image.linear_gradient("L").resize((w, h))              # 위→아래 0→255
    horiz = Image.linear_gradient("L").rotate(90).transpose(Image.FLIP_LEFT_RIGHT).resize((w, h))  # 왼→오
    g = ImageChops.add(vert, horiz, scale=2)                      # 왼쪽 위 0 → 오른쪽 아래 255
    return Image.merge("RGB", [g.point([c[ch] for c in lut]) for ch in range(3)])


def rounded_mask(w, h, r):
    from PIL import Image, ImageDraw
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], radius=r, fill=255)
    return m


def spaced(d, xy, text, fnt, fill, gap):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=fnt, fill=fill, anchor="ls")
        x += d.textlength(ch, font=fnt) + gap


def front():
    from PIL import Image, ImageDraw
    card = gold_diagonal(CW, CH).convert("RGBA")
    d = ImageDraw.Draw(card)
    # 반짝이는 빛 줄기
    shine = Image.new("L", (CW, CH), 0)
    ImageDraw.Draw(shine).polygon([(CW * .52, 0), (CW * .64, 0), (CW * .44, CH), (CW * .32, CH)], fill=70)
    card.paste((255, 255, 255, 255), (0, 0), shine)
    d.rounded_rectangle([18, 18, CW - 19, CH - 19], radius=RADIUS - 14, outline=(255, 245, 200), width=5)

    pad = round(5.5 * MM)
    spaced(d, (pad, pad + 80), "LIFE GOLD MEDAL", font(True, 92), INK, 26)
    d.text((CW - pad, pad + 96), "七旬", font=hanja_font(150), fill=(122, 42, 20), anchor="rs")

    # IC 칩
    cx0, cy0, cw, ch = pad, round(20 * MM), round(11.5 * MM), round(8.8 * MM)
    chip = Image.new("RGB", (cw, ch))
    chip.paste(gold_diagonal(cw, ch))
    card.paste(chip, (cx0, cy0), rounded_mask(cw, ch, 26))
    d.rounded_rectangle([cx0, cy0, cx0 + cw, cy0 + ch], radius=26, outline=(120, 80, 20), width=6)
    for fy in (.33, .66):
        d.line([(cx0, cy0 + ch * fy), (cx0 + cw, cy0 + ch * fy)], fill=(140, 96, 30), width=5)
    d.line([(cx0 + cw * .5, cy0), (cx0 + cw * .5, cy0 + ch)], fill=(140, 96, 30), width=5)

    spaced(d, (pad, round(38.5 * MM)), "0070  1984  1004  2026", font(True, 112), INK, 14)
    d.text((pad, CH - pad), "서강석 님", font=font(True, 150), fill=INK, anchor="ls")

    # VIP + 작은 금메달
    mx, my, mr = CW - pad - 70, CH - pad - 60, 68
    for side in (-1, 1):
        d.polygon([(mx + side * 14, my - mr - 60), (mx + side * 50, my - mr - 60), (mx + side * 26, my - mr + 10)], fill=(176, 46, 34))
    d.ellipse([mx - mr, my - mr, mx + mr, my + mr], fill=(230, 186, 80), outline=(120, 80, 20), width=8)
    d.text((mx, my + 4), "1", font=font(True, 90), fill=(120, 80, 20), anchor="mm")
    d.text((mx - mr - 30, CH - pad), "VIP", font=font(True, 110), fill=INK, anchor="rs")

    out = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    out.paste(card, (0, 0), rounded_mask(CW, CH, RADIUS))
    return out


def back():
    from PIL import Image, ImageDraw
    card = Image.new("RGBA", (CW, CH), (255, 250, 235, 255))
    card.paste(gold_diagonal(CW, CH).convert("RGBA"), (0, 0), Image.new("L", (CW, CH), 90))
    d = ImageDraw.Draw(card)
    d.rectangle([0, round(5 * MM), CW, round(13.5 * MM)], fill=(40, 28, 18))  # 마그네틱 띠
    pad = round(5.5 * MM)
    sy = round(18 * MM)
    d.rectangle([pad, sy, CW - pad - round(14 * MM), sy + round(8 * MM)], fill=(255, 255, 255), outline=(170, 140, 90), width=4)
    for k in range(0, CW, 40):  # 서명란 무늬
        d.line([(pad + k, sy), (pad + k - 60, sy + round(8 * MM))], fill=(240, 228, 200), width=3)
    d.text((pad + 40, sy + round(4 * MM)), "서강석", font=font(True, 120), fill=(30, 40, 120), anchor="lm")
    d.text((CW - pad, sy + round(4 * MM)), "七旬", font=hanja_font(100), fill=(122, 42, 20), anchor="rm")
    lines = ["인생 금메달 VIP 카드", "칠순을 진심으로 축하드립니다 · 2026. 10. 4.", "이 카드는 사랑과 감사가 무제한으로 인출됩니다 💛"]
    y = round(33 * MM)
    for k, t in enumerate(lines):
        d.text((pad, y), t.replace(" 💛", ""), font=font(k == 0, 92 if k == 0 else 70), fill=INK, anchor="ls")
        y += round(6.4 * MM)
    out = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    out.paste(card, (0, 0), rounded_mask(CW, CH, RADIUS))
    return out


def crop_marks(d, x, y, w, h, length=round(4 * MM), gap=round(1.5 * MM)):
    for px, py in ((x, y), (x + w, y), (x, y + h), (x + w, y + h)):
        sx = -1 if px == x else 1
        sy = -1 if py == y else 1
        d.line([(px + sx * gap, py), (px + sx * (gap + length), py)], fill=(60, 60, 60), width=3)
        d.line([(px, py + sy * gap), (px, py + sy * (gap + length))], fill=(60, 60, 60), width=3)


def main():
    from PIL import Image, ImageDraw
    OUT.mkdir(exist_ok=True)
    f, b = front(), back()
    f.save(OUT / "금메달카드_앞면.png", dpi=(DPI, DPI))
    b.save(OUT / "금메달카드_뒷면.png", dpi=(DPI, DPI))

    AW, AH = round(210 * MM), round(297 * MM)
    page = Image.new("RGB", (AW, AH), (255, 255, 255))
    d = ImageDraw.Draw(page)
    gx = (AW - 2 * CW - round(20 * MM)) // 2
    for row, top in enumerate((round(40 * MM), round(120 * MM))):
        for col, im in enumerate((f, b)):
            x = gx + col * (CW + round(20 * MM))
            page.paste(im, (x, top), im)
            crop_marks(d, x, top, CW, CH)
            d.text((x + CW // 2, top + CH + round(6 * MM)), ("앞면" if col == 0 else "뒷면") + (" (여분)" if row else ""),
                   font=font(False, 60), fill=(120, 120, 120), anchor="mm")
    d.text((AW // 2, round(20 * MM)), "금메달 VIP 카드 — 실제 크기 85.6 × 54 mm · '실제 크기(100%)'로 인쇄 후 모서리 표시선을 따라 자르세요",
           font=font(False, 56), fill=(90, 90, 90), anchor="mm")
    d.text((AW // 2, round(200 * MM)), "앞면을 ATM 장난감 카드에 붙이거나, 앞·뒷면을 맞붙여 코팅하면 진짜 카드처럼 돼요",
           font=font(False, 56), fill=(90, 90, 90), anchor="mm")
    for n in range(1, 20):
        pdf = OUT / ("금메달카드_인쇄용.pdf" if n == 1 else f"금메달카드_인쇄용_{n}.pdf")
        try:
            page.save(pdf, resolution=DPI)
            break
        except PermissionError:
            continue
    print("저장:", pdf)


if __name__ == "__main__":
    main()
