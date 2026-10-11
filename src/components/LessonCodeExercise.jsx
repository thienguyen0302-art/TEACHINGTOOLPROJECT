import AITutorPanel from "./AITutorPanel";
import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { judgeCode } from '../services/judgeService';
import JudgeResults from './JudgeResults';
import '../pages/ProblemBank.css';
import './LessonCodeExercise.css';

const CodeEditor = lazy(() => import('./CodeEditor'));
const starters = {
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Viết lời giải tại đây.\n    return 0;\n}\n',
  python: '# Đọc dữ liệu và viết lời giải tại đây.\n',
};

export default function LessonCodeExercise({ problem, language, chapterId, section }) {
  const [source, setSource] = useState(starters[language]);
  const [stdin, setStdin] = useState(problem.sampleInput ?? '');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [submission, setSubmission] = useState(null);
  const requestRef = useRef(null);
  const inputId = useId();
  useEffect(() => () => requestRef.current?.abort(), []);

  async function execute(mode) {
    if (requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(mode);
    setError('');
    setSubmission(null);
    try {
      const result = await judgeCode({ slug: `lesson/${language}/${chapterId}/${section}/${problem.id}`, source, language, mode, stdin, signal: controller.signal });
      if (!controller.signal.aborted) setSubmission({ ...result, language, judgedSource: source });
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message);
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (!controller.signal.aborted) setBusy('');
    }
  }

  return <section className="lesson-code-exercise" aria-label={`Viết code cho ${problem.title}`}>
    <h4>Viết và chấm code · {language === 'cpp' ? 'C++' : 'Python'}</h4>
    <p>Chạy thử với input tự nhập. Nộp bài để chấm bộ test hiện có của bài học. Bản nháp giữ khi đang mở phần luyện tập.</p>
    <div className="lesson-code-exercise__editor">
      <Suspense fallback={<p role="status">Đang tải trình soạn thảo…</p>}>
        <CodeEditor language={language} value={source} onChange={setSource} />
      </Suspense>
    </div>
    <label htmlFor={inputId}>Input chạy thử</label>
    <textarea id={inputId} className="judge-input" rows={4} value={stdin} maxLength={10000} onChange={(event) => setStdin(event.target.value)} spellCheck={false} />
    <div className="problem-editor__actions">
      <button type="button" disabled={Boolean(busy) || !source.trim()} onClick={() => execute('run')}>{busy === 'run' ? 'Đang chạy…' : '▷ Chạy code'}</button>
      <button type="button" className="bank-submit" disabled={Boolean(busy) || !source.trim()} onClick={() => execute('submit')}>{busy === 'submit' ? 'Đang chấm…' : 'Nộp bài ↑'}</button>
    </div>
    <JudgeResults busy={busy} error={error} submission={submission} />
    <AITutorPanel slug={`lesson/${language}/${chapterId}/${section}/${problem.id}`} language={language} source={source} judgeBusy={Boolean(busy)} judgeResult={submission?.judgedSource === source ? submission : null} />
  </section>;
}
