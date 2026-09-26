import { memo, useCallback, useEffect, useRef, type PointerEvent as RPointerEvent } from "react";
import { createPortal } from "react-dom";
import { IconX, IconZoomIn, IconZoomOut, IconZoomReset } from "@tabler/icons-react";

interface ImageZoomViewerProps {
  src: string;
  alt: string;
  onClose: () => void;
  labels: { close: string; zoomIn: string; zoomOut: string; reset: string; hint: string };
}

const MIN = 1;
const MAX = 6;

/**
 * Full-window image viewer: mouse-wheel zoom (towards the cursor), drag to pan, double-click to
 * reset, Esc closes (handled by the exam shortcut hook). Transform is written straight to the DOM
 * (no React re-render per wheel/mouse move) → smooth at 60+ FPS.
 */
export const ImageZoomViewer = memo(function ImageZoomViewer({ src, alt, onClose, labels }: ImageZoomViewerProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const view = useRef({ scale: 1, x: 0, y: 0 });
  const drag = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const raf = useRef<number | null>(null);

  const apply = useCallback(() => {
    if (raf.current != null) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      const { scale, x, y } = view.current;
      if (imgRef.current) imgRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
      stageRef.current?.classList.toggle("is-zoomed", scale > 1.001);
    });
  }, []);

  const zoomAt = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const px = (cx ?? rect.left + rect.width / 2) - (rect.left + rect.width / 2);
      const py = (cy ?? rect.top + rect.height / 2) - (rect.top + rect.height / 2);
      const v = view.current;
      const next = Math.min(MAX, Math.max(MIN, v.scale * factor));
      const k = next / v.scale;
      v.x = px - (px - v.x) * k;
      v.y = py - (py - v.y) * k;
      v.scale = next;
      if (next === 1) {
        v.x = 0;
        v.y = 0;
      }
      apply();
    },
    [apply]
  );

  const reset = useCallback(() => {
    view.current = { scale: 1, x: 0, y: 0 };
    apply();
  }, [apply]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    // Non-passive wheel listener so the page does not scroll behind the viewer.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      stage.removeEventListener("wheel", onWheel);
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [zoomAt]);

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const v = view.current;
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: v.x, oy: v.y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    if (view.current.scale <= 1) return;
    view.current.x = d.ox + dx;
    view.current.y = d.oy + dy;
    apply();
  };
  const onPointerUp = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (d && e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    // Click on the backdrop (not a drag, not on the image) closes the viewer.
    if (d && !d.moved && e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div className="xd-zoom" role="dialog" aria-modal="true" aria-label={alt}>
      <div
        ref={stageRef}
        className="xd-zoom__stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={reset}
      >
        <img ref={imgRef} src={src} alt={alt} className="xd-zoom__img" draggable={false} />
      </div>
      <div className="xd-zoom__toolbar">
        <button type="button" className="xd-btn xd-btn--ghost" onClick={() => zoomAt(1 / 1.3)} title={labels.zoomOut}>
          <IconZoomOut size={18} />
        </button>
        <button type="button" className="xd-btn xd-btn--ghost" onClick={reset} title={labels.reset}>
          <IconZoomReset size={18} />
        </button>
        <button type="button" className="xd-btn xd-btn--ghost" onClick={() => zoomAt(1.3)} title={labels.zoomIn}>
          <IconZoomIn size={18} />
        </button>
        <span className="xd-zoom__hint">{labels.hint}</span>
        <button type="button" className="xd-btn xd-btn--ghost" onClick={onClose}>
          <IconX size={18} /> {labels.close} <kbd className="xd-kbd">Esc</kbd>
        </button>
      </div>
    </div>,
    document.body
  );
});

export default ImageZoomViewer;
