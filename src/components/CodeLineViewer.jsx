import { useEffect, useRef } from "react";

export default function CodeLineViewer({ code, activeLines = [] }) {
  const viewportRef = useRef(null);
  const lineRefs = useRef(new Map());
  const lines = typeof code === "string" ? code.split("\n") : [];
  const active = new Set(activeLines);

  useEffect(() => {
    const viewport = viewportRef.current;
    const current = lineRefs.current.get(activeLines[0]);
    if (!viewport || !current) return;
    const target = current.offsetTop - viewport.clientHeight / 2 + current.offsetHeight / 2;
    viewport.scrollTop = Math.max(0, target);
  }, [activeLines]);

  if (!lines.length) return null;
  return (
    <section className="code-line-viewer" aria-label="Code đang được minh họa">
      <div className="code-line-viewer__label">CODE</div>
      <div className="code-line-viewer__viewport" ref={viewportRef} tabIndex={0}>
        <code>
          {lines.map((source, index) => {
            const number = index + 1;
            const isActive = active.has(number);
            return (
              <span
                className={`code-line-viewer__line${isActive ? " is-active" : ""}`}
                key={number}
                ref={(node) => { if (node) lineRefs.current.set(number, node); else lineRefs.current.delete(number); }}
                aria-current={isActive ? "step" : undefined}
              >
                <span className="code-line-viewer__number" aria-hidden="true">{number}</span>
                <span className="code-line-viewer__source">{source || " "}</span>
                {isActive && <span className="code-line-viewer__marker"><span aria-hidden="true">●</span><span className="sr-only">Dòng đang thực thi</span></span>}
              </span>
            );
          })}
        </code>
      </div>
    </section>
  );
}
