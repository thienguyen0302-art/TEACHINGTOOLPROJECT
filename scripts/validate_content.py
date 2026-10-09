"""Validate lesson and Problem Bank schemas; optionally run lesson reference code.

Usage: python3 scripts/validate_content.py [--run-code]
Code execution requires Python 3 and g++ with C++17 support.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1] / "src" / "content"


def require(condition, message):
    if not condition:
        raise ValueError(message)


def fields(item, keys, context):
    for key in keys:
        require(key in item, f"{context}: missing {key}")


def validate_problem(path, problem, bank_root):
    """Check authored problems, including nested fields, before Vite bundles them."""
    context = f"problems/{path.relative_to(bank_root)}"

    def object_fields(value, keys, location):
        require(isinstance(value, dict), f"{location}: expected object")
        fields(value, keys, location)

    def string(value, location, allow_empty=False):
        require(isinstance(value, str) and (allow_empty or bool(value.strip())),
                f"{location}: expected {'string' if allow_empty else 'non-empty string'}")

    def string_list(value, location, non_empty=False):
        require(isinstance(value, list) and (not non_empty or bool(value)),
                f"{location}: expected {'non-empty ' if non_empty else ''}string array")
        for index, item in enumerate(value):
            string(item, f"{location}[{index}]")

    object_fields(problem, ["id", "slug", "chapterId", "title", "type", "difficulty",
                            "level", "tags", "statement", "inputDescription",
                            "outputDescription", "constraints", "samples", "hints",
                            "starterCode", "solution", "aiContext"], context)
    for key in ["id", "slug", "chapterId", "title", "type", "difficulty",
                "statement", "inputDescription", "outputDescription"]:
        string(problem[key], f"{context}.{key}")
    require(re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", problem["slug"]),
            f"{context}.slug: expected lowercase kebab-case")
    require(problem["chapterId"] in {f"ch{i:02}" for i in range(1, 15)},
            f"{context}.chapterId: expected ch01..ch14")
    require(path.parent == bank_root / problem["chapterId"],
            f"{context}.chapterId: does not match folder {path.parent.name}")
    require(problem["type"] == "coding", f"{context}.type: expected coding in Phase 1")
    require(problem["difficulty"] in ["basic", "intermediate", "advanced"],
            f"{context}.difficulty: invalid difficulty")
    require(type(problem["level"]) is int and problem["level"] >= 1,
            f"{context}.level: expected positive integer")
    for key in ["tags", "constraints", "hints"]:
        string_list(problem[key], f"{context}.{key}", non_empty=key == "constraints")

    samples = problem["samples"]
    require(isinstance(samples, list) and samples, f"{context}.samples: expected non-empty array")
    for index, sample in enumerate(samples):
        location = f"{context}.samples[{index}]"
        object_fields(sample, ["input", "output", "explanation"], location)
        for key in ["input", "output", "explanation"]:
            string(sample[key], f"{location}.{key}", allow_empty=True)

    object_fields(problem["starterCode"], ["cpp", "python"], f"{context}.starterCode")
    for language in ["cpp", "python"]:
        string(problem["starterCode"][language], f"{context}.starterCode.{language}")

    solution = problem["solution"]
    object_fields(solution, ["explanation", "code", "complexity"], f"{context}.solution")
    string(solution["explanation"], f"{context}.solution.explanation")
    object_fields(solution["code"], ["cpp", "python"], f"{context}.solution.code")
    for language in ["cpp", "python"]:
        string(solution["code"][language], f"{context}.solution.code.{language}")
    object_fields(solution["complexity"], ["time", "space"], f"{context}.solution.complexity")
    for key in ["time", "space"]:
        string(solution["complexity"][key], f"{context}.solution.complexity.{key}")

    object_fields(problem["aiContext"], ["objectives", "prerequisites", "commonMistakes"],
                  f"{context}.aiContext")
    for key in ["objectives", "prerequisites", "commonMistakes"]:
        string_list(problem["aiContext"][key], f"{context}.aiContext.{key}")


def validate_problem_bank(bank_root):
    """Allow empty chapter folders, exclude templates, enforce global uniqueness."""
    for index in range(1, 15):
        folder = bank_root / f"ch{index:02}"
        require(folder.is_dir(), f"problems: missing chapter folder {folder.name}")
    ids, slugs = {}, {}
    paths = sorted(path for path in bank_root.rglob("*.json") if not path.name.startswith("_"))
    for path in paths:
        context = f"problems/{path.relative_to(bank_root)}"
        try:
            problem = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as error:
            raise ValueError(f"{context}: invalid JSON ({error})") from error
        validate_problem(path, problem, bank_root)
        for key, seen in [("id", ids), ("slug", slugs)]:
            value = problem[key]
            require(value not in seen,
                    f"{context}: duplicate {key} {value!r} (first in {seen.get(value)})")
            seen[value] = context
    return len(paths)


def validate(path, chapter):
    context = str(path.relative_to(ROOT))
    fields(chapter, ["id", "language", "title", "order", "description",
                    "objectives", "prerequisites", "theory", "examples", "quiz",
                    "practice", "advanced", "commonMistakes", "chapterSummary"], context)
    require(chapter["id"] == path.stem, f"{context}: mismatched ID")
    require(chapter["language"] == path.parent.name, f"{context}: mismatched language")
    require(chapter["id"] == f'ch{chapter["order"]:02}', f"{context}: mismatched order")
    for key in ["objectives", "prerequisites", "chapterSummary"]:
        require(isinstance(chapter[key], list) and chapter[key] and
                all(isinstance(x, str) and x.strip() for x in chapter[key]),
                f"{context}: invalid {key}")
    ids = set()
    jobs = []
    for section in ["theory", "examples", "quiz", "practice", "advanced"]:
        require(isinstance(chapter[section], list) and chapter[section], f"{context}: empty {section}")
        for item in chapter[section]:
            location = f'{context}/{item.get("id", "?")}'
            fields(item, ["id"], location)
            require(item["id"] not in ids, f"{location}: duplicate ID")
            ids.add(item["id"])
            prefix = "example" if section == "examples" else section
            require(item["id"].startswith(prefix), f"{location}: invalid ID prefix")
            if section == "theory":
                fields(item, ["title", "content", "keywords", "sections", "selfCheck"], location)
                require(len(item["sections"]) >= 3, f"{location}: insufficient theory sections")
                for block in item["sections"]:
                    require(bool(block.get("title")), f"{location}: missing section title")
                    texts = block.get("paragraphs", []) + block.get("bullets", [])
                    require(bool(texts) and all(isinstance(text, str) and text.strip() for text in texts),
                            f"{location}: empty theory section")
                require(bool(item["selfCheck"].get("question")) and bool(item["selfCheck"].get("answer")),
                        f"{location}: missing self-check")
            elif section == "examples":
                fields(item, ["title", "description", "difficulty", "code", "explanation"], location)
            elif section == "quiz":
                fields(item, ["type", "difficulty", "tags", "question", "choices", "answer",
                              "explanation", "betterApproach"], location)
                choices = item["choices"]
                require(isinstance(choices, list) and len(choices) >= 2 and
                        len(set(choices)) == len(choices), f"{location}: invalid choices")
                require(item["answer"] in choices, f"{location}: answer not in choices")
                require(item["type"] in ["multiple_choice", "output_prediction"], f"{location}: invalid quiz type")
                if item["type"] == "output_prediction" and chapter["order"] > 1:
                    require(bool(item.get("code")), f"{location}: missing snippet")
                require(bool(item["explanation"]) and bool(item["betterApproach"]), f"{location}: missing feedback")
            else:
                fields(item, ["title", "difficulty", "tags", "problem", "inputDescription",
                              "outputDescription", "constraints", "sampleInput", "sampleOutput",
                              "hint", "answer", "explanation", "betterApproach", "complexity",
                              "solutionCode"], location)
                require(bool(item["solutionCode"]), f"{location}: empty solution")
            if "difficulty" in item:
                require(item["difficulty"] in ["basic", "intermediate", "advanced"], f"{location}: invalid difficulty")
            if item.get("visualization"):
                visual = item["visualization"]
                fields(visual, ["title", "description", "steps"], location)
                require(bool(visual["steps"]), f"{location}: empty trace")
                for step in visual["steps"]:
                    fields(step, ["cells", "explanation"], location)
                    require(bool(step["cells"]) and bool(step["explanation"]), f"{location}: invalid step")
                    for cell in step["cells"]:
                        fields(cell, ["label", "value", "active"], location)
                        require(isinstance(cell["value"], str) and isinstance(cell["active"], bool), f"{location}: invalid cell")
                    if step.get("array"):
                        array = step["array"]
                        require(bool(array.get("values")), f"{location}: empty array diagram")
                        indices = array.get("activeIndices", []) + array.get("discardedIndices", [])
                        indices += [p["index"] for p in array.get("pointers", [])]
                        require(all(isinstance(i, int) and 0 <= i < len(array["values"]) for i in indices),
                                f"{location}: array pointer out of bounds")
                    if step.get("matrix"):
                        matrix = step["matrix"]
                        rows = matrix.get("rows", [])
                        require(bool(rows) and all(len(row) == len(rows[0]) for row in rows), f"{location}: invalid matrix")
                        require(all(0 <= r < len(rows) and 0 <= c < len(rows[r]) for r, c in matrix.get("activeCells", [])),
                                f"{location}: matrix cell out of bounds")
                    if step.get("intervals"):
                        items = step["intervals"]["items"]
                        require(all(0 <= interval["start"] < interval["end"] for interval in items),
                                f"{location}: invalid interval")
            if item.get("runnable"):
                if section in ["practice", "advanced"]:
                    code, stdin, expected = item["solutionCode"], item["sampleInput"], item["sampleOutput"]
                elif section == "quiz":
                    code, stdin, expected = item["code"], "", item["answer"]
                else:
                    code, stdin, expected = item["code"], item.get("input") or "", item["output"]
                jobs.append((chapter["language"], code, stdin, expected, location))
                for i, case in enumerate(item.get("testCases", []), 1):
                    fields(case, ["input", "output"], location)
                    jobs.append((chapter["language"], code, case["input"], case["output"], f"{location}/test{i}"))
    require(any(t.get("visualization") for t in chapter["theory"]), f"{context}: no visualizations")
    require(bool(chapter.get("references")), f"{context}: no references")
    for source in chapter["references"]:
        require(source["url"].startswith("https://"), f"{context}: invalid source URL")
    return jobs


def run_group(group, directory):
    lang, code, cases = group
    digest = hashlib.sha256(code.encode()).hexdigest()[:20]
    source = directory / (digest + (".cpp" if lang == "cpp" else ".py"))
    source.write_text(code)
    if lang == "cpp":
        binary = directory / digest
        result = subprocess.run(["g++", "-std=c++17", "-O2", str(source), "-o", str(binary)],
                                capture_output=True, text=True, timeout=30)
        require(result.returncode == 0, f'{cases[0][2]}: compilation failed\n{result.stderr}')
        command = [str(binary)]
    else:
        command = [sys.executable, str(source)]
    for stdin, expected, location in cases:
        result = subprocess.run(command, input=stdin + "\n", capture_output=True, text=True, timeout=5)
        require(result.returncode == 0, f"{location}: execution failed\n{result.stderr}")
        # Online-judge style comparison permits differences in whitespace.
        require(result.stdout.split() == expected.split(),
                f"{location}: expected {expected!r}, received {result.stdout!r}")
    return len(cases)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-code", action="store_true")
    args = parser.parse_args()
    jobs, chapters = [], []
    for language in ["cpp", "python"]:
        paths = sorted((ROOT / language).glob("ch*.json"))
        require([p.stem for p in paths] == [f"ch{i:02}" for i in range(1, 15)], f"{language}: expected chapters 1..14")
        for path in paths:
            chapter = json.loads(path.read_text())
            jobs.extend(validate(path, chapter))
            chapters.append(chapter)
    problem_count = validate_problem_bank(ROOT / "problems")
    print(f'Schema OK: {len(chapters)} chapters, '
          f'{sum(len(c["quiz"]) for c in chapters)} quiz questions, '
          f'{sum(len(c["practice"])+len(c["advanced"]) for c in chapters)} exercises.', flush=True)
    print(f'Problem Bank OK: {problem_count} problems, 14 chapter folders (ch01..ch14).', flush=True)
    if args.run_code:
        grouped = {}
        for lang, code, stdin, expected, location in jobs:
            grouped.setdefault((lang, code), []).append((stdin, expected, location))
        with tempfile.TemporaryDirectory(prefix="teaching-content-") as temp:
            directory = Path(temp)
            groups = [(lang, code, cases) for (lang, code), cases in grouped.items()]
            with ThreadPoolExecutor(max_workers=4) as executor:
                results = list(executor.map(lambda group: run_group(group, directory), groups))
        print(f'Code OK: {sum(results)} output checks across {len(groups)} unique programs (C++17/Python).')


if __name__ == "__main__":
    main()
