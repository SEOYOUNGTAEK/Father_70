"""photos/ 원본을 웹용으로 줄여 assets/photos/ 에 저장하고 manifest.js 를 만든다.

- '_'로 시작하는 폴더는 건너뜀 (_제외)
- photos/베스트컷_목록.txt 의 '폴더: X' 아래 파일만 슬라이드에 사용, 없으면 폴더 전체(촬영시각 순)
- data/*.js 가 참조한 사진은 슬라이드에 없어도 변환 (확대퀴즈용 등은 2560px)
- EXIF(위치정보 포함)는 저장하지 않음
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
SLIDE_PX, REF_PX, QUALITY = 1920, 2560, 82


def web_name(name):
    stem = re.sub(r"[^a-z0-9_-]+", "_", Path(name).stem.lower()).strip("_")
    return stem + ".jpg"


def parse_picks(text):
    picks, folder = {}, None
    for line in text.splitlines():
        m = re.match(r"\s*폴더:\s*(\S+)", line)
        if m:
            folder = m.group(1)
            picks.setdefault(folder, [])
            continue
        m = re.match(r"\s*(\S+\.(?:jpe?g|png))\b", line, re.I)
        if m and folder:
            picks[folder].append(m.group(1))
    return picks


def find_refs(js_text):
    return set(re.findall(r"assets/photos/([^'\"]+?\.jpg)", js_text))


def taken_key(path):
    from PIL import Image
    try:
        ex = Image.open(path).getexif()
        d = ex.get_ifd(0x8769).get(36867) or ex.get(306)
        if d:
            return str(d)
    except Exception:
        pass
    return path.name


def convert(src, dst, px):
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
        files = {web_name(f.name): f for f in folder.iterdir() if f.suffix.lower() in EXTS}
        if not files:
            continue
        if picks.get(folder.name):
            order = [web_name(n) for n in picks[folder.name] if web_name(n) in files]
        else:
            order = sorted(files, key=lambda w: taken_key(files[w]))
        ref_here = {r.split("/", 1)[1] for r in refs if r.split("/", 1)[0] == folder.name}
        for w in sorted(set(order) | ref_here):
            if w not in files:
                print("  ! data에서 참조했지만 없는 사진:", folder.name, w)
                continue
            convert(files[w], OUT / folder.name / w, REF_PX if w in ref_here else SLIDE_PX)
        manifest[folder.name] = [f"assets/photos/{folder.name}/{w}" for w in order]
        print(f"{folder.name}: 슬라이드 {len(order)}장, 참조 {len(ref_here)}장")

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "manifest.js").write_text(
        "// tools/build_photos.py 가 생성 — 직접 고치지 마세요\nwindow.PHOTOS = "
        + json.dumps(manifest, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")


if __name__ == "__main__":
    main()
