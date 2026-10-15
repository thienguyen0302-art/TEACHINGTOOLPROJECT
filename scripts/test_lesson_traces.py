import json
import unittest
from build_lesson_traces import ROOT, build


class FullTraceTests(unittest.TestCase):
    def test_all_traces_start_at_first_line_and_match_expected_output(self):
        count = 0
        for language in ('cpp', 'python'):
            for path in sorted((ROOT / language).glob('ch*.json')):
                chapter = json.loads(path.read_text())
                for theory in chapter['theory']:
                    if not theory.get('visualization'):
                        continue
                    with self.subTest(language=language, chapter=chapter['id'], theory=theory['id']):
                        steps = build(chapter['id'], theory, language)
                        self.assertEqual(steps, theory['visualization']['steps'])
                        self.assertEqual(steps[0]['line'], 1)
                        self.assertTrue(all(1 <= s['line'] <= len(theory['code'].splitlines()) for s in steps))
                        output = next((c['value'] for c in steps[-1]['cells'] if c['label'] == 'Output'), None)
                        if output is not None and 'output' in theory:
                            self.assertEqual(output.split(), theory['output'].split())
                        count += 1
        self.assertEqual(count, 34)

    def test_for_loop_returns_to_condition_and_accumulates(self):
        chapter = json.loads((ROOT / 'python/ch03.json').read_text())
        steps = build('ch03', chapter['theory'][0], 'python')
        self.assertEqual([s['line'] for s in steps], [1,2,3,2,3,2,3,2,3,2,4])
        totals = [next(c['value'] for c in s['cells'] if c['label']=='s') for s in steps if s['line']==3]
        self.assertEqual(totals, ['1','3','6','10'])

    def test_false_branch_is_skipped(self):
        chapter = json.loads((ROOT / 'python/ch02.json').read_text())
        steps = build('ch02', chapter['theory'][0], 'python')
        self.assertEqual([s['line'] for s in steps], [1,2,4,6,7])
