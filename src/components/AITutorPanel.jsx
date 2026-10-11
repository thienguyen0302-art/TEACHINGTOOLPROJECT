import { useEffect, useRef, useState } from 'react';
import { askTutor } from '../services/aiService';
import { preferredTutorAction, tutorActions } from '../utils/tutorActions';
import './AITutorPanel.css';

export default function AITutorPanel(props) {
  // Reset/cancel only tutor state on context edits; editor and Judge state stay intact.
  return <TutorRequest key={`${props.language}:${props.source}:${JSON.stringify(props.judgeResult)}`} {...props} />;
}
function TutorRequest({ slug, language, source, judgeResult, judgeBusy }) {
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [lastAction, setLastAction] = useState('hint');
  const controllerRef = useRef(null);
  useEffect(() => () => controllerRef.current?.abort(), []);
  const preferred = preferredTutorAction(judgeResult);
  const disabled = Boolean(pending || judgeBusy || !source?.trim());

  async function request(action) {
    if (controllerRef.current || disabled) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setPending(action); setLastAction(action); setError(''); setFeedback(null);
    try {
      const result = await askTutor({ slug, language, source, action, judgeResult, signal: controller.signal });
      if (!controller.signal.aborted) setFeedback(result);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message);
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      if (!controller.signal.aborted) setPending('');
    }
  }
  return <aside className="ai-tutor-panel" aria-label="AI Tutor">
    <h3>AI Tutor</h3>
    <p>Judge0 quyết định đúng/sai. AI giúp em hiểu lỗi và tìm bước tiếp theo.</p>
    {!judgeResult && <p>Chưa có kết quả Judge cho bản code này. Em vẫn có thể hỏi gợi ý.</p>}
    <div className="ai-tutor-actions">
      {tutorActions.map(({ id, label }) => <button key={id} type="button" disabled={disabled} className={id === preferred ? 'ai-tutor-recommended' : ''} onClick={() => request(id)}>{label}{id === preferred && <small>Đề xuất</small>}</button>)}
    </div>
    <div aria-live="polite" aria-busy={Boolean(pending)}>
      {pending && <p role="status">AI đang phân tích…</p>}
      {error && <div role="alert"><p>{error}</p><button type="button" disabled={disabled} onClick={() => request(lastAction)}>Thử lại</button></div>}
      {feedback && <div className="ai-tutor-feedback"><h4>{feedback.title}</h4><p>{feedback.message}</p>{feedback.nextStep && <p><b>Bước tiếp theo:</b> {feedback.nextStep}</p>}<small>Gợi ý tham khảo; hãy kiểm chứng bằng Judge0.</small></div>}
    </div>
  </aside>;
}
