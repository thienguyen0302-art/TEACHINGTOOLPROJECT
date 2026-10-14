import { lazy, Suspense } from "react";
const CodeEditor = lazy(() => import("./CodeEditor"));

export default function LessonCodeSnippet({ code, language, activeLines = [] }) {
  const source = String(code ?? "");
  const height = Math.min(420, Math.max(90, source.split("\n").length * 23 + 36));
  return <div className="lesson-code-snippet" style={{ height }}>
    <Suspense fallback={<pre><code>{source}</code></pre>}>
      <CodeEditor language={language} value={source} readOnly activeLines={activeLines} />
    </Suspense>
  </div>;
}
