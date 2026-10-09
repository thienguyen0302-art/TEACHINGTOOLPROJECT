"""Regression checks for malformed Problem Bank content and global collisions."""
import copy
import json
from pathlib import Path
import tempfile
import unittest

from validate_content import ROOT, validate_problem, validate_problem_bank


class ProblemBankValidationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="problem-bank-validation-")
        self.addCleanup(self.temp.cleanup)
        self.bank = Path(self.temp.name)
        for index in range(1, 15):
            (self.bank / f"ch{index:02}").mkdir()
        self.path = self.bank / "ch01" / "sample.json"
        self.problem = json.loads((ROOT / "problems/ch01/tong-hai-so.json").read_text())

    def write(self, path, problem):
        path.write_text(json.dumps(problem), encoding="utf-8")

    def test_valid_problem(self):
        validate_problem(self.path, self.problem, self.bank)
        self.write(self.path, self.problem)
        self.assertEqual(validate_problem_bank(self.bank), 1)

    def test_all_required_fields(self):
        required = ["id", "slug", "chapterId", "title", "type", "difficulty", "level",
                    "tags", "statement", "inputDescription", "outputDescription",
                    "constraints", "samples", "hints", "starterCode", "solution", "aiContext"]
        for key in required:
            with self.subTest(field=key):
                problem = copy.deepcopy(self.problem)
                del problem[key]
                with self.assertRaisesRegex(ValueError, f"missing {key}"):
                    validate_problem(self.path, problem, self.bank)

    def test_required_nested_fields(self):
        required = {
            "starterCode": ["cpp", "python"],
            "solution": ["explanation", "code", "complexity"],
            "solution.code": ["cpp", "python"],
            "solution.complexity": ["time", "space"],
            "aiContext": ["objectives", "prerequisites", "commonMistakes"],
        }
        for parent, keys in required.items():
            for key in keys:
                with self.subTest(field=f"{parent}.{key}"):
                    problem = copy.deepcopy(self.problem)
                    value = problem
                    for part in parent.split("."):
                        value = value[part]
                    del value[key]
                    with self.assertRaisesRegex(ValueError, f"missing {key}"):
                        validate_problem(self.path, problem, self.bank)
        for key in ["input", "output", "explanation"]:
            with self.subTest(sample_field=key):
                problem = copy.deepcopy(self.problem)
                del problem["samples"][0][key]
                with self.assertRaisesRegex(ValueError, f"missing {key}"):
                    validate_problem(self.path, problem, self.bank)

    def test_invalid_types_and_values(self):
        invalid = {
            "id": [None, 42, " "], "slug": ["Có dấu", "bad_slug", "UPPER"],
            "chapterId": ["ch00", "ch15", "ch1"], "title": [None, ""],
            "type": ["quiz"], "difficulty": ["hard"], "level": [True, 0, -1, 1.5, "1"],
            "tags": ["tag", [None]], "statement": [None, ""],
            "inputDescription": [None], "outputDescription": [123],
            "constraints": [[], "n > 0", [""]], "samples": [[], None, ["sample"]],
            "hints": ["hint", [False]], "starterCode": [None, []],
            "solution": [None, []], "aiContext": [None, []],
        }
        for key, values in invalid.items():
            for value in values:
                with self.subTest(field=key, value=value):
                    problem = copy.deepcopy(self.problem)
                    problem[key] = value
                    with self.assertRaises(ValueError):
                        validate_problem(self.path, problem, self.bank)
        for parent, key, value in [
            ("starterCode", "cpp", 1), ("starterCode", "python", ""),
            ("solution", "code", []), ("solution", "complexity", None),
            ("solution", "explanation", ""), ("solution.code", "cpp", None),
            ("solution.code", "python", ""), ("solution.complexity", "time", 1),
            ("solution.complexity", "space", ""), ("aiContext", "objectives", "text"),
            ("aiContext", "prerequisites", [1]), ("aiContext", "commonMistakes", [""]),
        ]:
            with self.subTest(field=f"{parent}.{key}", value=value):
                problem = copy.deepcopy(self.problem)
                target = problem
                for part in parent.split("."):
                    target = target[part]
                target[key] = value
                with self.assertRaises(ValueError):
                    validate_problem(self.path, problem, self.bank)
        problem = copy.deepcopy(self.problem)
        problem["samples"][0]["input"] = 1
        with self.assertRaises(ValueError):
            validate_problem(self.path, problem, self.bank)
        with self.assertRaisesRegex(ValueError, "expected object"):
            validate_problem(self.path, [], self.bank)

    def test_duplicate_id_and_slug_across_chapters(self):
        self.write(self.path, self.problem)
        for key in ["id", "slug"]:
            with self.subTest(duplicate=key):
                other = copy.deepcopy(self.problem)
                other.update(id="ch14-p001", slug="another-problem", chapterId="ch14")
                other[key] = self.problem[key]
                self.write(self.bank / "ch14/other.json", other)
                with self.assertRaisesRegex(ValueError, f"duplicate {key}"):
                    validate_problem_bank(self.bank)

    def test_chapter_folder_mismatch(self):
        with self.assertRaisesRegex(ValueError, "does not match folder"):
            validate_problem(self.bank / "ch14/sample.json", self.problem, self.bank)

    def test_missing_chapter_folder(self):
        (self.bank / "ch14").rmdir()
        with self.assertRaisesRegex(ValueError, "missing chapter folder ch14"):
            validate_problem_bank(self.bank)

    def test_empty_folders_and_excluded_templates(self):
        (self.bank / "_template.json").write_text("invalid JSON")
        (self.bank / "ch14/_draft.json").write_text("invalid JSON")
        self.assertEqual(validate_problem_bank(self.bank), 0)

    def test_invalid_json_in_real_problem(self):
        self.path.write_text("invalid JSON")
        with self.assertRaisesRegex(ValueError, "problems/ch01/sample.json: invalid JSON"):
            validate_problem_bank(self.bank)

    def test_empty_optional_arrays_and_sample_strings(self):
        self.problem.update(tags=[], hints=[])
        self.problem["aiContext"] = dict(objectives=[], prerequisites=[], commonMistakes=[])
        self.problem["samples"] = [dict(input="", output="", explanation="")]
        validate_problem(self.path, self.problem, self.bank)


if __name__ == "__main__":
    unittest.main()
