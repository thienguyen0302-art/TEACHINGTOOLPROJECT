import { readFileSync, readdirSync } from 'node:fs';

export function loadLessonProblems(root = new URL('../src/content/', import.meta.url)) {
  const problems = new Map();
  for (const language of ['cpp', 'python']) {
    const directory = new URL(`${language}/`, root);
    for (const filename of readdirSync(directory).filter((name) => /^ch\d+\.json$/.test(name))) {
      const chapter = JSON.parse(readFileSync(new URL(filename, directory), 'utf8'));
      for (const section of ['practice', 'advanced']) {
        for (const exercise of chapter[section] ?? []) {
          if (!exercise.runnable) continue;
          const samples = [{ input: exercise.sampleInput, output: exercise.sampleOutput }, ...(exercise.testCases ?? [])];
          // Existing chapter test cases are public educational examples.
          const unique = [...new Map(samples.map((sample) => [JSON.stringify([sample.input, sample.output]), sample])).values()];
          problems.set(`lesson/${language}/${chapter.id}/${section}/${exercise.id}`, { language, samples: unique });
        }
      }
    }
  }
  return problems;
}
