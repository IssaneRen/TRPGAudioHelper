import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image


PROJECT_DIR = Path(__file__).resolve().parents[1]
MODULE_PATH = PROJECT_DIR / "render_coc_card.py"


def load_module():
    spec = importlib.util.spec_from_file_location("render_coc_card", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    sys.modules["render_coc_card"] = module
    spec.loader.exec_module(module)
    return module


class RenderCocCardTest(unittest.TestCase):
    def test_render_card_creates_expected_png(self):
        renderer = load_module()
        sample_path = PROJECT_DIR / "sample_character.json"

        with tempfile.TemporaryDirectory() as tmp_dir:
            output_path = Path(tmp_dir) / "card.png"
            character = renderer.load_character(str(sample_path))

            renderer.render_card(character, str(output_path))

            self.assertTrue(output_path.exists())
            with Image.open(output_path) as image:
                self.assertEqual(image.size, (1200, 1800))
                self.assertEqual(image.format, "PNG")

    def test_load_character_rejects_missing_name(self):
        renderer = load_module()

        with tempfile.TemporaryDirectory() as tmp_dir:
            bad_path = Path(tmp_dir) / "bad.json"
            bad_path.write_text(json.dumps({"attributes": {}}), encoding="utf-8")

            with self.assertRaises(ValueError):
                renderer.load_character(str(bad_path))

    def test_load_wiki_entry_extracts_coc_sheet(self):
        renderer = load_module()
        wiki_path = PROJECT_DIR.parents[1] / "public/wiki/entities/entries/char.leina.json"

        character = renderer.load_wiki_entry(str(wiki_path), project_root=str(PROJECT_DIR.parents[1]))

        self.assertEqual(character["name"], "莱纳·托尔拓 Leina")
        self.assertEqual(character["occupation"], "士兵 / 一战老兵")
        self.assertEqual(character["attributes"]["STR"], 80)
        self.assertEqual(character["derived"]["hp"], "13/13")
        self.assertEqual(character["skills"]["侦查"], 71)
        self.assertTrue(character["avatar_path"].endswith("public/wiki/characters/char.leina.png"))

    def test_skill_templates_support_classic_and_modern(self):
        renderer = load_module()

        classic = renderer.get_skill_template("classic_1920s")
        modern = renderer.get_skill_template("modern")

        self.assertIn("图书馆使用", classic)
        self.assertIn("骑术", classic)
        self.assertNotIn("计算机使用", classic)
        self.assertIn("计算机使用", modern)
        self.assertIn("电子学", modern)


if __name__ == "__main__":
    unittest.main()
