import { useEffect, useRef, useState } from 'react';
import TutorIcon from './TutorIcon';
import './CodeStepVisualizer.css';

export default function CodeStepVisualizer({ visualization, source }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const activeLine = useRef(null);
  const steps = visualization.steps;
  const step = steps[index];
  const previous = steps[index - 1];
  const isPlaying = playing && index < steps.length - 1;
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(() => setIndex((value) => Math.min(value + 1, steps.length - 1)), 1800);
    return () => clearTimeout(timer);
  }, [index, isPlaying, steps.length]);
  useEffect(() => {
    const line = activeLine.current;
    if (line) line.parentElement.scrollTop = Math.max(0, line.offsetTop - line.parentElement.offsetTop - 80);
  }, [index]);
  function move(next) { setPlaying(false); setIndex(next); }
  return <section className="code-trace" aria-label="Trực quan hóa code từng bước">
    <header className="code-trace__header"><div><span className="code-trace__eyebrow">KHÁM PHÁ CODE</span><h4>{visualization.title}</h4></div><span className="code-trace__counter">{index + 1}<small> / {steps.length}</small></span></header>
    <p className="code-trace__note">Minh họa do AI suy luận từ code và ví dụ công khai, không phải trace thực thi của Judge0.</p>
    {visualization.input !== null && <details className="code-trace__sample"><summary>Ví dụ dùng để minh họa</summary><div><section><span>INPUT</span><pre>{visualization.input || '(Rỗng)'}</pre></section><section><span>OUTPUT MẪU</span><pre>{visualization.expectedOutput || '(Rỗng)'}</pre></section></div></details>}
    <div className="code-trace__progress" aria-hidden="true"><span style={{ width: `${(index + 1) / steps.length * 100}%` }} /></div>
    <div className="code-trace__source" tabIndex={0} role="region" aria-label={`Code của em, đang xem dòng ${step.line}`}>
      {source.split('\n').map((line, i) => <div key={i} ref={i + 1 === step.line ? activeLine : null} className={`code-trace__line${i + 1 === step.line ? ' is-active' : ''}`}><span aria-hidden="true">{i + 1}</span><code>{line || ' '}</code>{i + 1 === step.line && <b aria-hidden="true">←</b>}</div>)}
    </div>
    <div className="code-trace__state" aria-live="polite"><div className="code-trace__step-title"><span>{String(index + 1).padStart(2, '0')}</span><h4>{step.title}</h4><small>Dòng {step.line}</small></div><p>{step.explanation}</p>
      <div className="code-trace__variables">{step.variables.length ? step.variables.map((variable, i) => {
        const before = previous?.variables.find((v) => v.name === variable.name);
        const changed = before && before.value !== variable.value;
        return <div key={`${variable.name}:${i}`} className={changed ? 'is-changed' : ''}><span>{variable.name}</span><strong>{variable.value || '—'}</strong>{changed && <small>Trước: {before.value}</small>}</div>;
      }) : <p className="code-trace__empty">Bước này chưa có trạng thái biến để hiển thị.</p>}</div>
    </div>
    <div className="code-trace__controls"><button type="button" disabled={index === 0} onClick={() => move(index - 1)} aria-label="Bước trước"><TutorIcon name="back" /></button><button className="code-trace__play" type="button" onClick={() => { if (index === steps.length - 1) setIndex(0); setPlaying(!isPlaying); }}><TutorIcon name={isPlaying ? 'pause' : 'play'} />{isPlaying ? 'Tạm dừng' : index === steps.length - 1 ? 'Phát lại' : 'Tự động'}</button><button type="button" disabled={index === steps.length - 1} onClick={() => move(index + 1)} aria-label="Bước tiếp theo"><TutorIcon name="next" /></button><button type="button" onClick={() => move(0)} aria-label="Về bước đầu"><TutorIcon name="reset" /></button></div>
    <label className="code-trace__slider">Bước {index + 1} / {steps.length}<input type="range" min="0" max={steps.length - 1} value={index} onChange={(event) => move(Number(event.target.value))} aria-label="Chọn bước minh họa" /></label>
  </section>;
}
