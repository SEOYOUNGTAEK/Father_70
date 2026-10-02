import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
import make_certificates as mc


class LoadTest(unittest.TestCase):
    def test_reads_json_array_from_js(self):
        js = '// 설명\nwindow.CERTIFICATES = [\n  { "title": "가", "body": "나 [괄호]" }\n];\n'
        self.assertEqual(mc.load_certificates(js), [{"title": "가", "body": "나 [괄호]"}])

    def test_real_file_has_two(self):
        certs = mc.load_certificates((mc.ROOT / "data" / "certificates.js").read_text(encoding="utf-8"))
        self.assertEqual([c["seal"] for c in certs], ["손주", "자녀"])


class WrapTest(unittest.TestCase):
    def test_wraps_on_spaces_by_width(self):
        measure = len  # 글자 수 = 폭
        self.assertEqual(mc.wrap("가나 다라마 바사", 6, measure), ["가나 다라마", "바사"])


if __name__ == "__main__":
    unittest.main()
