import { useEffect, useState } from "react";
import "./StepVisualizer.css";
import CodeLineViewer from "./CodeLineViewer";
import { activeVisualizationLines } from "../utils/visualizationLines";

function Icon({ name }) {
  const paths = {
    back: "M15 18l-6-6 6-6",
    next: "M9 6l6 6-6 6",
    reset: "M3 10a9 9 0 1 1 2.6 8M3 4v6h6",
    play: "M8 5l11 7-11 7V5z",
    pause: "M8 5v14M16 5v14",
  };
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

function Diagram({ step }) {
  if (step.intervals) {
    const { items, selectedIndices = [], rejectedIndices = [], currentIndex } = step.intervals;
    const maximum = Math.max(...items.map((item) => item.end), 1);
    const scale = 280 / maximum;
    const ticks = Array.from({ length: Math.min(maximum, 6) + 1 }, (_, i) => i * maximum / Math.min(maximum, 6));
    return <svg className="visual-intervals" viewBox={`0 0 360 ${items.length * 36 + 38}`} role="img" aria-label="Các khoảng hoạt động trên trục thời gian"><title>Lịch hoạt động</title><desc>{items.map((item, i) => `${item.start} đến ${item.end}: ${selectedIndices.includes(i) ? "đã chọn" : rejectedIndices.includes(i) ? "bị bỏ" : "chưa xét"}`).join("; ")}</desc>{ticks.map((value, i) => <g key={i}><line x1={60 + value * scale} x2={60 + value * scale} y1="5" y2={items.length * 36 + 6} stroke="#e0e8f4" /><text x={60 + value * scale} y={items.length * 36 + 27} textAnchor="middle">{value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}</text></g>)}{items.map((item, i) => <g key={i}><text x="6" y={i * 36 + 24}>{item.label || `A${i + 1}`}</text><rect x={60 + item.start * scale} y={i * 36 + 8} width={(item.end - item.start) * scale} height="24" rx="5" fill={selectedIndices.includes(i) ? "#2563eb" : rejectedIndices.includes(i) ? "#e2e8f0" : "#bfd6fa"} stroke={i === currentIndex ? "#142f58" : "none"} strokeWidth="2" /><text x={60 + (item.start + item.end) / 2 * scale} y={i * 36 + 24} textAnchor="middle" fill={selectedIndices.includes(i) ? "white" : "#49678e"}>{item.start}–{item.end}</text></g>)}</svg>;
  }
  if (step.flow) {
    return <div className="visual-flow" aria-label="Luồng quyết định">{step.flow.map((node, i) => <div className={`visual-flow__node${node.active ? " is-active" : ""}`} key={i}><span>{node.label}</span><strong>{node.value}</strong></div>)}</div>;
  }
  if (step.array) {
    const { values, activeIndices = [], discardedIndices = [], pointers = [] } = step.array;
    return (
      <div className="visual-array" aria-label="Dãy dữ liệu và vị trí đang xét">
        {values.map((value, i) => (
          <div className={`visual-array__item${activeIndices.includes(i) ? " is-active" : ""}${discardedIndices.includes(i) ? " is-discarded" : ""}`} key={i}>
            <div className="visual-array__pointers">{pointers.filter((p) => p.index === i).map((p) => <span key={p.label}>{p.label}</span>)}</div>
            <strong>{value}</strong><span className="visual-array__index">[{i}]</span>
          </div>
        ))}
      </div>
    );
  }
  if (step.matrix) {
    const { rows, activeCells = [] } = step.matrix;
    return (
      <div className="visual-matrix" tabIndex={0} aria-label="Bảng trạng thái">
        <table><tbody>{rows.map((row, r) => <tr key={r}>{row.map((value, c) => <td key={c} className={activeCells.some(([i, j]) => i === r && j === c) ? "is-active" : ""}>{value}</td>)}</tr>)}</tbody></table>
      </div>
    );
  }
  if (step.stack) {
    return <ol className="visual-stack" aria-label="Ngăn xếp lời gọi">{step.stack.map((frame, i) => <li key={i} className={frame.active ? "is-active" : ""}><span className="visual-stack__depth">{i + 1}</span><code>{frame.label}</code><strong>{frame.value}</strong></li>)}</ol>;
  }
  return null;
}

// Authored traces let students inspect every decision at their own pace.
export default function StepVisualizer({ visualization, code }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const steps = visualization.steps ?? [];
  const total = steps.length;
  const isPlaying = playing && index < total - 1;

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(() => setIndex((current) => Math.min(current + 1, total - 1)), 2200);
    return () => clearTimeout(timer);
  }, [index, isPlaying, total]);

  if (!total) return null;
  const step = steps[index];
  const source = visualization.code ?? code;
  const activeLines = activeVisualizationLines(step, source);
  const previous = steps[index - 1];
  const hasDiagram = Boolean(step.array || step.matrix || step.stack || step.flow || step.intervals);
  function goTo(next) {
    setPlaying(false);
    setIndex(next);
  }

  return (
    <section className="step-visualizer" aria-label={visualization.title}>
      <header className="step-visualizer__header">
        <div><span className="step-visualizer__eyebrow">KHÁM PHÁ TỪNG BƯỚC</span><h4>{visualization.title}</h4><p>{visualization.description}</p></div>
        <span className="step-visualizer__counter"><strong>{String(index + 1).padStart(2, "0")}</strong> / {String(total).padStart(2, "0")}</span>
      </header>
      <div className="step-visualizer__progress" aria-hidden="true"><span style={{ width: `${(index + 1) / total * 100}%` }} /></div>
      {source && <CodeLineViewer code={source} activeLines={activeLines} />}
      <div className="step-visualizer__body">
        <nav className="step-visualizer__timeline" aria-label="Chọn bước minh họa">
          {steps.map((item, i) => <button type="button" key={i} className={`${i === index ? "is-current" : ""}${i < index ? " is-complete" : ""}`} aria-current={i === index ? "step" : undefined} onClick={() => goTo(i)}><span>{i + 1}</span><span>{item.title || `Bước ${i + 1}`}</span></button>)}
        </nav>
        <div className="step-visualizer__workspace">
          <div className="step-visualizer__stage">
            <div className="step-visualizer__stage-heading"><span>{hasDiagram ? "Dữ liệu đang xử lý" : "Trạng thái biến"}</span><span><i /> Đang xét</span></div>
            <Diagram step={step} />
            <div className={`step-visualizer__cells${hasDiagram ? " step-visualizer__cells--compact" : ""}`} aria-label="Giá trị các biến">
              {step.cells.map((cell, i) => {
                const old = previous?.cells.find((item) => item.label === cell.label);
                const changed = old && old.value !== cell.value;
                return <div key={cell.label + i} className={`step-visualizer__cell${cell.active ? " step-visualizer__cell--active" : ""}`}><span className="step-visualizer__cell-label">{cell.label}</span><div>{changed && <span className="step-visualizer__old">{old.value} → </span>}<strong>{cell.value}</strong></div><span className="step-visualizer__cell-status">{changed ? "Vừa cập nhật" : cell.active ? "Đang xét" : "Giữ nguyên"}</span></div>;
              })}
            </div>
          </div>
          <div className="step-visualizer__explanation" aria-live="polite" aria-atomic="true"><span className="step-visualizer__explanation-number">{index + 1}</span><div><h5>{step.title || `Điều gì xảy ra ở bước ${index + 1}?`}</h5><p>{step.explanation}</p>{step.formula && <code className="step-visualizer__formula">{step.formula}</code>}</div></div>
        </div>
      </div>
      <footer className="step-visualizer__footer">
        <button className="visual-control visual-control--quiet" type="button" onClick={() => goTo(0)} disabled={index === 0 && !isPlaying}><Icon name="reset" /> Về đầu</button>
        <div className="step-visualizer__controls">
          <button className="visual-control" type="button" disabled={index === 0} onClick={() => goTo(index - 1)}><Icon name="back" /><span>Trước</span></button>
          <button className="visual-control visual-control--primary" type="button" disabled={total < 2} aria-pressed={isPlaying} onClick={() => { if (index === total - 1) setIndex(0); setPlaying(!isPlaying); }}><Icon name={isPlaying ? "pause" : "play"} />{isPlaying ? "Tạm dừng" : "Tự chạy"}</button>
          <button className="visual-control" type="button" disabled={index === total - 1} onClick={() => goTo(index + 1)}><span>Tiếp</span><Icon name="next" /></button>
        </div>
      </footer>
      <p className="step-visualizer__note">Hãy thử giải thích bước tiếp theo trước khi bấm. Dữ liệu mẫu được giữ cố định để dễ đối chiếu.</p>
    </section>
  );
}
