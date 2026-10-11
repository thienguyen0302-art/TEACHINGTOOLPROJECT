import { useEffect, useId, useReducer, useRef } from 'react';
import { askTutor } from '../services/aiService';
import TutorIcon from './TutorIcon';

export default function AITutorChat({ slug, language, source, judgeResult, judgeBusy }) {
  const [state, update] = useReducer((current, patch) => ({ ...current, ...patch }), { messages: [], draft: '', pending: false, pendingMessage: '', error: '' });
  const { messages, draft, pending, pendingMessage, error } = state;
  const controllerRef = useRef(null);
  const conversationRef = useRef(null);
  const inputId = useId();
  useEffect(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    update({ messages: [], pending: false, pendingMessage: '', error: '' });
    return () => { controllerRef.current?.abort(); controllerRef.current = null; };
  }, [slug, language, source, judgeResult]);
  useEffect(() => {
    const element = conversationRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, pending, error]);

  function cancel() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    update({ pending: false, pendingMessage: '' });
  }
  async function send() {
    const message = draft.trim();
    if (!message || pending || judgeBusy || controllerRef.current) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    update({ pending: true, pendingMessage: message, error: '' });
    try {
      const feedback = await askTutor({ slug, language, source, judgeResult, action: 'chat', message, history: messages.slice(-8), signal: controller.signal });
      if (!controller.signal.aborted) {
        const reply = [feedback.message, feedback.nextStep].filter(Boolean).join('\n\n');
        update({ messages: [...messages, { role: 'user', text: message }, { role: 'assistant', text: reply }].slice(-20), draft: '' });
      }
    } catch (failure) {
      if (!controller.signal.aborted) update({ error: failure.message });
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      if (!controller.signal.aborted) update({ pending: false, pendingMessage: '' });
    }
  }
  return <details className="ai-tutor-chat">
    <summary><TutorIcon /><span>Trò chuyện với AI<small>Hỏi thêm về bài toán và code của em</small></span></summary>
    <div className="ai-tutor-chat__toolbar"><span>Peanut AI · Hội thoại trong phiên</span><button type="button" onClick={() => { cancel(); update({ messages: [], error: '', draft: '' }); }}>Cuộc trò chuyện mới</button></div>
    <p className="ai-tutor-chat__note">AI dùng bài và code hiện tại. Đổi code, ngôn ngữ hoặc kết quả Judge sẽ bắt đầu hội thoại mới.</p>
    <div className="ai-tutor-chat__messages" ref={conversationRef} role="log" aria-label="Hội thoại AI Tutor" aria-live="polite" aria-busy={pending}>
      {!messages.length && !pending && <p className="ai-tutor-chat__empty">Em đang vướng ở đâu? Hỏi về một khái niệm hoặc dòng code trong bài.</p>}
      {messages.map((item, index) => <div className={`ai-tutor-chat__bubble is-${item.role}`} key={index}><strong>{item.role === 'user' ? 'Em' : 'Peanut AI'}</strong><p>{item.text}</p></div>)}
      {pending && <><div className="ai-tutor-chat__bubble is-user"><strong>Em</strong><p>{pendingMessage}</p></div><p role="status">Peanut AI đang trả lời…</p></>}
    </div>
    {error && <div className="ai-tutor-error" role="alert"><p>{error}</p><button type="button" onClick={send} disabled={pending || judgeBusy || !draft.trim()}>Thử gửi lại</button></div>}
    <form className="ai-tutor-chat__form" onSubmit={(event) => { event.preventDefault(); send(); }}>
      <label htmlFor={inputId}>Câu hỏi của em</label>
      <textarea id={inputId} rows={3} maxLength={2000} value={draft} disabled={pending} placeholder="Ví dụ: Vì sao vòng lặp này bỏ sót phần tử cuối?" onChange={(event) => update({ draft: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); } }} />
      <div><small>{draft.length}/2000 · Shift+Enter xuống dòng</small>{pending ? <button key="cancel" type="button" onClick={(event) => { event.preventDefault(); cancel(); }}>Dừng trả lời</button> : <button key="send" type="submit" disabled={!draft.trim() || judgeBusy}><TutorIcon name="arrow" />Gửi câu hỏi</button>}</div>
    </form>
  </details>;
}
