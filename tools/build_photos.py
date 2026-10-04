"""photos/ 원본을 웹용으로 줄여 assets/photos/ 에 저장하고 manifest.js 를 만든다.

- '_'로 시작하는 폴더는 건너뜀 (_제외)
- photos/베스트컷_목록.txt 의 '폴더: X' 아래 파일만 슬라이드에 사용, 없으면 폴더 전체(촬영시각 순)
- data/*.js 가 참조한 사진은 슬라이드에 없어도 변환 (확대퀴즈용 등은 2560px)
- EXIF(위치정보 포함)는 저장하지 않음
- 동영상(.mp4)은 그대로 복사해 슬라이드에 넣음
사용: python tools/build_photos.py
"""
import json
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "photos"
OUT = ROOT / "assets" / "photos"
EXTS = {".jpg", ".jpeg", ".png"}
VIDEO_EXTS = {".mp4"}
SLIDE_PX, REF_PX, QUALITY = 1920, 3600, 82


def web_name(name):
    stem = re.sub(r"[^a-z0-9_-]+", "_", Path(name).stem.lower()).strip("_")
    return stem + (".mp4" if Path(name).suffix.lower() in VIDEO_EXTS else ".jpg")


def parse_picks(text):
    picks, folder = {}, None
    for line in text.splitlines():
        m = re.match(r"\s*폴더:\s*(\S+)", line)
        if m:
            folder = m.group(1)
            picks.setdefault(folder, [])
            continue
        m = re.match(r"\s*(\S+\.(?:jpe?g|png|mp4))\b", line, re.I)
        if m and folder:
            picks[folder].append(m.group(1))
    return picks


def find_refs(js_text):
    return set(re.findall(r"assets/photos/([^'\"]+?\.jpg)", js_text))


def exif_date(path):
    from PIL import Image
    try:
        ex = Image.open(path).getexif()
        return str(ex.get_ifd(0x8769).get(36867) or ex.get(306) or "")
    except Exception:
        return ""


def normalize_date(raw):
    """EXIF 날짜('2009:07:09 22:29:08', '2017-08-20 11:35:03:511')를 'YYYY-MM-DD HH:MM' 으로"""
    m = re.match(r"(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2})", raw or "")
    return "{}-{}-{} {}:{}".format(*m.groups()) if m else ""


def date_from_name(name):
    """파일 이름 속 13자리 밀리초 시각(카톡 저장 파일 등) → 'YYYY-MM-DD HH:MM' (한국 시간)"""
    import datetime
    m = re.search(r"(1[3-9]\d{11})", name)
    if not m:
        return ""
    t = datetime.datetime.fromtimestamp(int(m.group(1)) / 1000, datetime.timezone(datetime.timedelta(hours=9)))
    return t.strftime("%Y-%m-%d %H:%M")


def clamp_to_folder(date, folder_name):
    """폴더 이름이 'YYYY-YYYY_' 또는 'YYYY_' 로 시작하는데 사진 날짜가 그 범위 밖이면(옛날 사진을 다시 찍은 경우) 폴더 시작 연도로"""
    m = re.match(r"(\d{4})(?:-(\d{4}))?(?:-\d{2})?_", folder_name)
    if not m or not date:
        return date
    start, end = m.group(1), m.group(2) or m.group(1)
    return date if start <= date[:4] <= end else start + "-01-01 00:00"


def fill_dates(dates, folder_name):
    """날짜 없는 사진은 목록에서 바로 앞(없으면 뒤) 사진 날짜, 그것도 없으면 폴더 이름의 연도"""
    out = list(dates)
    for i, d in enumerate(out):
        if d:
            continue
        prev = next((out[j] for j in range(i - 1, -1, -1) if out[j]), "")
        nxt = next((dates[j] for j in range(i + 1, len(dates)) if dates[j]), "")
        m = re.match(r"(\d{4})", folder_name)
        out[i] = prev or nxt or (m.group(1) + "-01-01 00:00" if m else "")
    return out


def convert(src, dst, px):
    if src.suffix.lower() in VIDEO_EXTS:
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dst)
        return
    from PIL import Image, ImageOps
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    im.thumbnail((px, px), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "JPEG", quality=QUALITY, optimize=True, progressive=True)


def main():
    picks_file = SRC / "베스트컷_목록.txt"
    picks = parse_picks(picks_file.read_text(encoding="utf-8")) if picks_file.exists() else {}
    refs = set()
    for js in (ROOT / "data").glob("*.js"):
        refs |= find_refs(js.read_text(encoding="utf-8"))

    if OUT.exists():
        for d in OUT.iterdir():
            if d.is_dir():
                shutil.rmtree(d)
    manifest = {}
    for folder in sorted(d for d in SRC.iterdir() if d.is_dir() and not d.name.startswith("_")):
        files = {web_name(f.name): f for f in folder.iterdir() if f.suffix.lower() in EXTS | VIDEO_EXTS}
        if not files:
            continue
        if picks.get(folder.name):
            order = [web_name(n) for n in picks[folder.name] if web_name(n) in files]
        else:
            order = sorted(files, key=lambda w: normalize_date(exif_date(files[w])) or w)
        ref_here = {r.split("/", 1)[1] for r in refs if r.split("/", 1)[0] == folder.name}
        for w in sorted(set(order) | ref_here):
            if w not in files:
                print("  ! data에서 참조했지만 없는 사진:", folder.name, w)
                continue
            convert(files[w], OUT / folder.name / w, REF_PX if w in ref_here else SLIDE_PX)
        dates = fill_dates([clamp_to_folder(normalize_date(exif_date(files[w])) or (date_from_name(w) if w.endswith(".mp4") else ""), folder.name)
                            for w in order], folder.name)
        manifest[folder.name] = [{"src": f"assets/photos/{folder.name}/{w}", "date": d} for w, d in zip(order, dates)]
        print(f"{folder.name}: 슬라이드 {len(order)}장, 참조 {len(ref_here)}장")

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "manifest.js").write_text(
        "// tools/build_photos.py 가 생성 — 직접 고치지 마세요\nwindow.PHOTOS = "
        + json.dumps(manifest, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")


if __name__ == "__main__":
    main()
