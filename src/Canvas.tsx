import { useLayoutEffect, useRef, useState } from 'react';
import { W, type Slide, type SlideElement } from './domain';

export function Canvas({
  slide,
  height = 720,
  selected,
  onSelect,
  onChange,
  className = '',
  interactive = false,
}: {
  slide: Slide;
  height?: number;
  selected?: string;
  onSelect?: (id?: string) => void;
  onChange?: (e: SlideElement) => void;
  className?: string;
  interactive?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [draft, setDraft] = useState<SlideElement>();
  const drag = useRef<{ element: SlideElement; x: number; y: number; resize: boolean } | undefined>(
    undefined,
  );
  useLayoutEffect(() => {
    const el = container.current!;
    const update = () => setScale(el.clientWidth / W);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  function begin(e: React.PointerEvent, el: SlideElement, resize = false) {
    if (!interactive) return;
    e.stopPropagation();
    onSelect?.(el.id);
    if (el.locked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { element: el, x: e.clientX, y: e.clientY, resize };
  }
  function move(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.x) / scale,
      dy = (e.clientY - d.y) / scale;
    const round = (n: number) => Math.round(n / 8) * 8;
    setDraft(
      d.resize
        ? {
            ...d.element,
            w: Math.max(32, Math.min(W - d.element.x, round(d.element.w + dx))),
            h: Math.max(32, Math.min(height - d.element.y, round(d.element.h + dy))),
          }
        : {
            ...d.element,
            x: Math.max(0, Math.min(W - d.element.w, round(d.element.x + dx))),
            y: Math.max(0, Math.min(height - d.element.h, round(d.element.y + dy))),
          },
    );
  }
  function end() {
    if (draft) onChange?.(draft);
    setDraft(undefined);
    drag.current = undefined;
  }
  return (
    <div ref={container} className={`canvas-wrap ${className}`} style={{ height: height * scale }}>
      <div
        className="slide-canvas"
        data-testid={interactive ? 'editor-canvas' : undefined}
        style={{ width: W, height, background: slide.background, transform: `scale(${scale})` }}
        onPointerDown={() => onSelect?.(undefined)}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={() => {
          setDraft(undefined);
          drag.current = undefined;
        }}
      >
        {slide.elements.map((original) => {
          const el = draft?.id === original.id ? draft : original;
          return (
            <div
              key={el.id}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={
                interactive
                  ? `${el.kind === 'text' ? 'Matn' : el.kind === 'image' ? 'Rasm' : 'Shakl'}: ${el.text.slice(0, 60) || el.alt || 'element'}`
                  : undefined
              }
              className={`slide-element ${interactive ? 'editable' : ''} ${selected === el.id ? 'selected' : ''} ${el.locked ? 'locked' : ''}`}
              style={{
                left: el.x,
                top: el.y,
                width: el.w,
                height: el.h,
                color: el.color,
                fontSize: el.fontSize,
                fontFamily: el.fontFamily,
                fontWeight: el.bold ? 700 : 400,
                textAlign: el.align,
                background: el.kind === 'shape' ? el.fill : undefined,
                borderRadius: el.shape === 'circle' && el.kind === 'shape' ? '50%' : undefined,
              }}
              onPointerDown={(e) => begin(e, el)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect?.(el.id);
                }
              }}
            >
              {el.kind === 'text' ? (
                el.text
              ) : el.kind === 'image' && el.src ? (
                <img src={el.src} alt={el.alt} draggable={false} />
              ) : null}
              {interactive && selected === el.id && !el.locked && (
                <button
                  aria-label="Element o‘lchamini o‘zgartirish"
                  className="resize-handle"
                  onPointerDown={(e) => begin(e, el, true)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
