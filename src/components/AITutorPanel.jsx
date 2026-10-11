import { useEffect, useRef, useState, useReducer } from 'react';
import { askTutor } from '../services/aiService';
import { preferredTutorAction, tutorActions } from '../utils/tutorActions';
import TutorIcon from './TutorIcon';
import CodeStepVisualizer from './CodeStepVisualizer';
import './AITutorPanel.css';

export default function AITutorPanel({ slug, language, source, judgeResult, judgeBusy }) {
  const [state, update] = useReducer((current, patch) => ({ ...current, ...patch }), { pending: '', error: '', feedback: null });
  const { pending, error, feedback } = state;
  const setPending = (pending) => update({ pending });
  const setError = (error) => update({ error });
  const setFeedback = (feedback) => update({ feedback });
  const preferred = preferredTutorAction(judgeResult);
  const [selected, setSelected] = useState(preferred);
  const controllerRef = useRef(null);
  const chosen = tutorActions.find((action) => action.id === selected);
  useEffect(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    update({ pending: '', error: '', feedback: null });
    return () => { controllerRef.current?.abort(); controllerRef.current = null; };
  }, [slug, language, source, judgeResult]);
  const disabled = Boolean(pending || judgeBusy || !source?.trim());
  const status = judgeBusy ? 'Judge đang chạy' : !judgeResult ? 'Chưa chạy code' : judgeResult.mode === 'submit' ? `${judgeResult.passed}/${judgeResult.total} test đạt` : judgeResult.result.status;

  async function request(action) {
    if (controllerRef.current || disabled) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setPending(action); setError(''); setFeedback(null);
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
    <header className="ai-tutor-header"><div className="ai-tutor-brand"><span className="ai-tutor-spark"><TutorIcon /></span><strong>Peanut <span>AI</span></strong><span className="ai-tutor-beta">TUTOR</span></div><span className="ai-tutor-language">{language === 'cpp' ? 'C++' : 'Python'}</span></header>
    {!feedback && !pending && !error && <div className="ai-tutor-welcome"><h3>Cùng khám phá<br /><span>code của em.</span></h3><p>Một gợi ý đúng lúc, một bước hiểu sâu hơn.</p></div>}
    <div className="ai-tutor-actions" role="group" aria-label="Chọn cách AI hỗ trợ">
      {tutorActions.map(({ id, label, icon }) => <button key={id} type="button" disabled={Boolean(pending || judgeBusy)} aria-pressed={selected === id} onClick={() => { setSelected(id); setError(''); }}><TutorIcon name={icon} /><span>{label}</span>{id === preferred && <span className="ai-tutor-dot" title="Đề xuất cho kết quả hiện tại" aria-label="Đề xuất" />}</button>)}
    </div>
    <form className="ai-tutor-composer" onSubmit={(event) => { event.preventDefault(); request(selected); }}>
      <div className="ai-tutor-composer__prompt"><TutorIcon name={chosen.icon} /><div><strong>{chosen.label}</strong><p>{chosen.description}</p></div></div>
      <div className="ai-tutor-composer__footer"><span className="ai-tutor-context"><span />{status}</span><button type="submit" disabled={disabled} aria-label={`Gửi yêu cầu: ${chosen.label}`} title="Gửi yêu cầu"><TutorIcon name="arrow" /></button></div>
    </form>
    <div className="ai-tutor-response" aria-live="polite" aria-busy={Boolean(pending)}>
      {pending && <div className="ai-tutor-loading" role="status"><span className="ai-tutor-spark is-thinking"><TutorIcon /></span><div><p>{pending === 'visualize' ? 'Đang dựng các bước minh họa…' : 'Đang đọc code của em…'}</p><span /><span /><span /></div></div>}
      {error && <div className="ai-tutor-error" role="alert"><span>Chưa thể trả lời lúc này</span><p>{error}</p><button type="button" disabled={disabled} onClick={() => request(selected)}>Thử lại <TutorIcon name="reset" /></button></div>}
      {feedback && <article className="ai-tutor-feedback"><div className="ai-tutor-answer-heading"><span className="ai-tutor-spark"><TutorIcon /></span><div><span>PEANUT AI</span><h4>{feedback.title}</h4></div></div><p>{feedback.message}</p>{feedback.nextStep && <div className="ai-tutor-next-step"><span><TutorIcon name="arrow" />BƯỚC TIẾP THEO</span><p>{feedback.nextStep}</p></div>}
        {feedback.visualization && <CodeStepVisualizer key={JSON.stringify(feedback.visualization)} visualization={feedback.visualization} source={source} />}
        {feedback.action === 'visualize' && !feedback.visualization && <p className="ai-tutor-trace-empty">AI chưa tạo được các bước hợp lệ cho code này. Em có thể gửi lại yêu cầu hoặc chọn gỡ lỗi code.</p>}
      </article>}
    </div>
    <p className="ai-tutor-disclaimer"><TutorIcon name="spark" />AI gợi ý, em tự khám phá. Judge0 xác nhận kết quả.</p>
  </aside>;
}
