import os
import shutil
import tempfile
import unittest

from scan_codebase import parse_backlog_status, scan_codebase, scan_src_dir

SAMPLE_BACKLOG = """
## Phase 1 — Engine foundation

| ID | Task | Owner | Model | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| 1.6 | Checkpoint/respawn placement + save schema v2 | Sonnet 5 | Sonnet 5 | 1.2, 1.5, **0.2** | `blocked-with-reason` — reason text here |
| 1.7 | Some clean not-started row | Sonnet 5 | Sonnet 5 | none | `not-started` |
"""


class ScanSrcDirTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        os.makedirs(os.path.join(self.tmp, "systems"))

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def write(self, relpath, text):
        full = os.path.join(self.tmp, relpath)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "w", encoding="utf-8") as f:
            f.write(text)

    def test_finds_exported_symbols_in_a_system_file(self):
        self.write("systems/Foo.ts", "export class Foo {}\nexport const BAR = 1;\n")
        entries = scan_src_dir(self.tmp)
        foo = next(e for e in entries if e["path"] == os.path.join("systems", "Foo.ts"))
        self.assertEqual(foo["exported_symbols"], ["BAR", "Foo"])

    def test_flags_a_colocated_test_file(self):
        self.write("systems/Foo.ts", "export class Foo {}\n")
        self.write("systems/Foo.test.ts", "// test\n")
        entries = scan_src_dir(self.tmp)
        foo = next(e for e in entries if e["path"] == os.path.join("systems", "Foo.ts"))
        self.assertTrue(foo["has_colocated_test"])

    def test_a_file_with_no_test_reports_false(self):
        self.write("systems/Bar.ts", "export class Bar {}\n")
        entries = scan_src_dir(self.tmp)
        bar = next(e for e in entries if e["path"] == os.path.join("systems", "Bar.ts"))
        self.assertFalse(bar["has_colocated_test"])

    def test_does_not_treat_a_test_file_itself_as_a_source_entry(self):
        self.write("systems/Baz.ts", "export class Baz {}\n")
        self.write("systems/Baz.test.ts", "// test\n")
        entries = scan_src_dir(self.tmp)
        paths = [e["path"] for e in entries]
        self.assertNotIn(os.path.join("systems", "Baz.test.ts"), paths)

    def test_skips_missing_src_subdirs_without_error(self):
        self.write("systems/Foo.ts", "export class Foo {}\n")
        entries = scan_src_dir(self.tmp)  # no scenes/entities/data/dev dirs exist
        self.assertEqual(len(entries), 1)


class ParseBacklogStatusTest(unittest.TestCase):
    def test_extracts_status_token_for_each_task_row(self):
        rows = parse_backlog_status(SAMPLE_BACKLOG)
        self.assertEqual(rows["1.6"]["status"], "blocked-with-reason")
        self.assertEqual(rows["1.7"]["status"], "not-started")

    def test_skips_the_header_and_separator_rows(self):
        rows = parse_backlog_status(SAMPLE_BACKLOG)
        self.assertEqual(len(rows), 2)

    def test_captures_the_depends_on_column(self):
        rows = parse_backlog_status(SAMPLE_BACKLOG)
        self.assertIn("0.2", rows["1.6"]["depends_on"])

    def test_unrecognized_status_text_becomes_unknown_not_a_crash(self):
        text = "| 9.1 | Some task | Owner | Model | none | some free text, no backticks |"
        rows = parse_backlog_status(text)
        self.assertEqual(rows["9.1"]["status"], "unknown")


class ScanCodebaseTest(unittest.TestCase):
    def test_combines_src_scan_and_backlog_parse(self):
        tmp = tempfile.mkdtemp()
        try:
            os.makedirs(os.path.join(tmp, "src", "systems"))
            with open(os.path.join(tmp, "src", "systems", "Foo.ts"), "w") as f:
                f.write("export class Foo {}\n")
            backlog_path = os.path.join(tmp, "backlog.md")
            with open(backlog_path, "w") as f:
                f.write(SAMPLE_BACKLOG)
            result = scan_codebase(os.path.join(tmp, "src"), backlog_path)
            self.assertEqual(len(result["src_files"]), 1)
            self.assertIn("1.6", result["backlog_tasks"])
        finally:
            shutil.rmtree(tmp)


if __name__ == "__main__":
    unittest.main()
