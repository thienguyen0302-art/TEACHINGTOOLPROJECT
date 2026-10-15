import { useEffect, useReducer, useRef } from 'react';
import { askGlobalChat } from '../services/globalChatService.js';
import TutorIcon from './TutorIcon.jsx';
import Icon from './Icon.jsx';
import './GlobalPeanutChat.css';

export default function GlobalPeanutChat({ open, onClose, triggerRef, pathname }) {
  const [state, update] = useReducer((s, patch) => ({ ...s, ...patch }), { messages: [], draft: '', pending: false, pendingMessage: '', error: '' });
  const { messages, draft, pending, pendingMessage, error } = state;
  const controllerRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const logRef = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    inputRef.current?.focus();
    const keydown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key === 'Tab') {
        const nodes = [...panelRef.current.querySelectorAll('button:not(:disabled), textarea:not(:disabled)')];
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && (document.activeElement === first || !panelRef.current.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !panelRef.current.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      controllerRef.current?.abort(); controllerRef.current = null;
      update({ pending: false, pendingMessage: '' });
      closeRef.current();
      if (trigger?.isConnected) trigger.focus();
    };
  }, [open, triggerRef]);
  useEffect(() => () => { controllerRef.current?.abort(); }, []);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [messages, pending, error, open]);
  function cancel() { controllerRef.current?.abort(); controllerRef.current = null; update({ pending: false, pendingMessage: '' }); }
  async function send(value = draft) {
    const message = value.trim();
    if (!open || !message || message.length > 2000 || controllerRef.current) return;
    const controller = new AbortController(); controllerRef.current = controller;
    update({ draft: message, pending: true, pendingMessage: message, error: '' });
    try {
      const reply = await askGlobalChat({ message, history: messages.slice(-8), language: 'general', pageContext: { pathname }, signal: controller.signal });
      if (!controller.signal.aborted) update({ messages: [...messages, { role: 'user', text: message }, { role: 'assistant', text: reply.message.slice(0, 2500) }].slice(-8), draft: '' });
    } catch (failure) {
      if (!controller.signal.aborted) update({ error: failure instanceof TypeError ? 'Không kết nối được Peanut AI. Hãy thử lại.' : failure.message });
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      if (!controller.signal.aborted) update({ pending: false, pendingMessage: '' });
    }
  }
  if (!open) return null;
  return <div className="global-peanut-overlay">
    <button className="global-peanut-backdrop" aria-label="Đóng Peanut AI" onClick={onClose} tabIndex={-1} />
    <section id="global-peanut-chat" className="global-peanut-panel" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="global-peanut-title">
      <header><TutorIcon /><div><h2 id="global-peanut-title">Peanut AI</h2><p>Gia sư HSG Tin học</p></div><button type="button" onClick={onClose} aria-label="Đóng trò chuyện"><Icon name="x" /></button></header>
      <div className="global-peanut-toolbar"><small>Hội thoại trong phiên</small><button type="button" onClick={() => { cancel(); update({ messages: [], draft: '', error: '' }); inputRef.current?.focus(); }}>Cuộc trò chuyện mới</button></div>
      <div ref={logRef} className="global-peanut-log" role="log" aria-label="Hội thoại Peanut AI" aria-live="polite" aria-busy={pending}>
        {!messages.length && <div className="global-peanut-welcome"><TutorIcon /><h3>Hôm nay bạn muốn học gì?</h3><p>Cùng tìm hiểu C++, Python và cách tư duy thuật toán.</p>{['Giải thích Binary Search', 'Gợi ý lộ trình học DP', 'Tôi nên luyện bài gì tiếp?'].map(text => <button key={text} disabled={pending} onClick={() => send(text)}>{text}</button>)}</div>}
        {messages.map((item, index) => <div key={index} className={`global-peanut-message is-${item.role}`}><strong>{item.role === 'user' ? 'Bạn' : 'Peanut AI'}</strong><p>{item.text}</p></div>)}
        {pending && <><div className="global-peanut-message is-user"><strong>Bạn</strong><p>{pendingMessage}</p></div><p role="status">Peanut AI đang trả lời…</p></>}
      </div>
      {error && <div className="global-peanut-error" role="alert"><p>{error}</p><button type="button" onClick={() => send()} disabled={pending}>Thử gửi lại</button></div>}
      <form onSubmit={e => { e.preventDefault(); send(); }}>
        <label htmlFor="global-peanut-input">Hỏi Peanut AI</label>
        <textarea ref={inputRef} id="global-peanut-input" rows={3} maxLength={2000} placeholder="Hỏi Peanut AI..." value={draft} disabled={pending} onChange={e => update({ draft: e.target.value })} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} />
        <div><small>{draft.length}/2000 · Shift+Enter xuống dòng</small>{pending ? <button key="cancel" type="button" onClick={cancel}>Dừng trả lời</button> : <button key="send" type="submit" disabled={!draft.trim()}><TutorIcon name="arrow" />Gửi</button>}</div>
      </form>
    </section>
  </div>;
}
