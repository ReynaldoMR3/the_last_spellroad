import os
import tempfile
import unittest

from scan_gdd import chunk_gdd_sections, scan_gdd, slugify

SAMPLE_GDD = """# Sample Design

## Summary

One line summary.

## Gameplay Loop

Loop text here.

### Sub Detail

Nested detail text.

## Save Data And Persistence

Persistence text.
"""


class ChunkGddSectionsTest(unittest.TestCase):
    def test_splits_by_heading_in_order(self):
        sections = chunk_gdd_sections(SAMPLE_GDD)
        titles = [s["title"] for s in sections]
        self.assertEqual(
            titles,
            ["Summary", "Gameplay Loop", "Sub Detail", "Save Data And Persistence"],
        )

    def test_tracks_heading_level(self):
        sections = chunk_gdd_sections(SAMPLE_GDD)
        levels = {s["title"]: s["level"] for s in sections}
        self.assertEqual(levels["Gameplay Loop"], 2)
        self.assertEqual(levels["Sub Detail"], 3)

    def test_builds_breadcrumb_path_for_nested_headings(self):
        sections = chunk_gdd_sections(SAMPLE_GDD)
        by_title = {s["title"]: s for s in sections}
        self.assertEqual(by_title["Sub Detail"]["path"], "Gameplay Loop > Sub Detail")
        self.assertEqual(by_title["Summary"]["path"], "Summary")

    def test_a_sibling_heading_closes_the_previous_ones_nested_children(self):
        sections = chunk_gdd_sections(SAMPLE_GDD)
        by_title = {s["title"]: s for s in sections}
        self.assertEqual(
            by_title["Save Data And Persistence"]["path"], "Save Data And Persistence"
        )

    def test_captures_body_text_excluding_the_heading_line(self):
        sections = chunk_gdd_sections(SAMPLE_GDD)
        by_title = {s["title"]: s for s in sections}
        self.assertIn("Persistence text.", by_title["Save Data And Persistence"]["text"])
        self.assertNotIn(
            "## Save Data And Persistence", by_title["Save Data And Persistence"]["text"]
        )

    def test_deduplicates_ids_for_repeated_heading_text(self):
        text = "## Repeat\n\nfirst\n\n## Repeat\n\nsecond\n"
        sections = chunk_gdd_sections(text)
        ids = [s["id"] for s in sections]
        self.assertEqual(ids, ["repeat", "repeat-2"])


class SlugifyTest(unittest.TestCase):
    def test_lowercases_and_hyphenates(self):
        self.assertEqual(slugify("Save Data And Persistence"), "save-data-and-persistence")


class ScanGddTest(unittest.TestCase):
    def test_reads_a_real_file_and_returns_all_sections(self):
        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False) as f:
            f.write(SAMPLE_GDD)
            path = f.name
        try:
            result = scan_gdd(path)
            self.assertEqual(result["source_path"], path)
            self.assertEqual(len(result["sections"]), 4)
        finally:
            os.remove(path)


if __name__ == "__main__":
    unittest.main()
