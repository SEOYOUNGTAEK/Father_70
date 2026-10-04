import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
import build_photos as bp


class WebNameTest(unittest.TestCase):
    def test_sanitizes(self):
        self.assertEqual(bp.web_name("20260118_091534(0).JPG"), "20260118_091534_0.jpg")
        self.assertEqual(bp.web_name("SNOW_20260126_070303_723.jpg"), "snow_20260126_070303_723.jpg")


class VideoTest(unittest.TestCase):
    def test_video_keeps_extension(self):
        self.assertEqual(bp.web_name("Bowling Night.MP4"), "bowling_night.mp4")

    def test_picks_include_video(self):
        text = "폴더: f\na.jpg\nbowling.mp4   볼링 영상\n"
        self.assertEqual(bp.parse_picks(text), {"f": ["a.jpg", "bowling.mp4"]})


class DateTest(unittest.TestCase):
    def test_normalize(self):
        self.assertEqual(bp.normalize_date("2009:07:09 22:29:08"), "2009-07-09 22:29")
        self.assertEqual(bp.normalize_date("2017-08-20 11:35:03:511"), "2017-08-20 11:35")
        self.assertEqual(bp.normalize_date(""), "")

    def test_fill_undated_from_neighbors_then_folder_year(self):
        self.assertEqual(bp.fill_dates(["", "2012-01-01 10:00", "", "2013-05-05 09:00", ""], "2009-2015_x"),
                         ["2012-01-01 10:00", "2012-01-01 10:00", "2012-01-01 10:00", "2013-05-05 09:00", "2013-05-05 09:00"])
        self.assertEqual(bp.fill_dates(["", ""], "2019-01_집들이"), ["2019-01-01 00:00", "2019-01-01 00:00"])


class FolderYearTest(unittest.TestCase):
    def test_scanned_old_photo_uses_folder_year(self):
        # 옛날 사진을 2025년에 폰으로 다시 찍으면 EXIF 는 2025 → 폴더 연도 범위 밖이면 폴더 시작 연도로
        self.assertEqual(bp.clamp_to_folder("2025-08-01 21:13", "1980-1995_옛날사진"), "1980-01-01 00:00")
        self.assertEqual(bp.clamp_to_folder("2012-01-01 15:17", "2009-2015_그때그시절"), "2012-01-01 15:17")
        self.assertEqual(bp.clamp_to_folder("2025-08-01 21:13", "누나공유"), "2025-08-01 21:13")
        self.assertEqual(bp.clamp_to_folder("", "1980-1995_옛날사진"), "")


class FileNameDateTest(unittest.TestCase):
    def test_epoch_millis_in_name(self):
        # 카톡 등에서 받은 파일은 이름에 밀리초 시각이 들어 있음 (한국 시간)
        self.assertEqual(bp.date_from_name("kakaotalk_1571200040371.mp4"), "2019-10-16 13:27")
        self.assertEqual(bp.date_from_name("photo.jpg"), "")


class PicksTest(unittest.TestCase):
    def test_parses_folder_sections(self):
        text = "제목\n폴더: 2026-01_한라산\n\n20260117_165343.jpg   출발\n20260118_155457.jpg  족욕\n\n기타 설명 줄\n"
        self.assertEqual(bp.parse_picks(text), {"2026-01_한라산": ["20260117_165343.jpg", "20260118_155457.jpg"]})


class RefsTest(unittest.TestCase):
    def test_finds_refs(self):
        js = "x = [{ photo: 'assets/photos/2026-01_한라산/a_1.jpg' }, \"assets/photos/f/b.jpg\"]"
        self.assertEqual(bp.find_refs(js), {"2026-01_한라산/a_1.jpg", "f/b.jpg"})


if __name__ == "__main__":
    unittest.main()
