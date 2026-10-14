export function codeLineCount(code) {
  return typeof code === "string" && code.length ? code.split("\n").length : 0;
}

export function activeVisualizationLines(step, code) {
  const maximum = codeLineCount(code);
  if (!maximum || !step || typeof step !== "object") return [];
  const candidates = Array.isArray(step.lines) ? step.lines : [step.line];
  return [...new Set(candidates.filter((line) => Number.isInteger(line) && line >= 1 && line <= maximum))];
}
