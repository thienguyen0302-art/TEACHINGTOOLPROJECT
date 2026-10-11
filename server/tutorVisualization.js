const text = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : '';

// Only line references and explanatory state; never HTML, executable code or model inputs.
export function normalizeVisualization(raw, { source = '', samples = [] } = {}) {
  if (!raw || !Array.isArray(raw.steps)) return null;
  const lineCount = source.split('\n').length;
  const steps = raw.steps.slice(0, 16).flatMap((step) => {
    if (!step || !Number.isInteger(step.line) || step.line < 1 || step.line > lineCount) return [];
    const explanation = text(step.explanation, 600);
    if (!explanation) return [];
    return [{ line: step.line, title: text(step.title, 100) || `Dòng ${step.line}`, explanation,
      variables: (Array.isArray(step.variables) ? step.variables : []).slice(0, 12).flatMap((variable) => {
        const name = text(variable?.name, 60);
        return name && typeof variable?.value === 'string' ? [{ name, value: text(variable.value, 180) }] : [];
      }),
    }];
  });
  if (!steps.length) return null;
  const sample = samples[0];
  return { kind: 'ai-illustration', title: 'Code qua từng bước',
    input: typeof sample?.input === 'string' ? sample.input.slice(0, 6000) : null,
    expectedOutput: typeof sample?.output === 'string' ? sample.output.slice(0, 6000) : null,
    steps };
}
