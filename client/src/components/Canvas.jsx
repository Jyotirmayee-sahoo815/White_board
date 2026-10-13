import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { BOARD_HEIGHT, BOARD_WIDTH, clientToBoard } from "../utils/helpers.js";
import { drawStroke, redrawAll } from "../utils/canvasDraw.js";

const Canvas = forwardRef(function Canvas(
  { tool, color, lineWidth, disabled, onDrawStart, onDrawMove, onDrawEnd, onCursorMove },
  ref
) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const ctxRef = useRef(null);
  const strokesRef = useRef([]);
  const drawingRef = useRef(false);
  const currentRef = useRef(null);
  const remoteRef = useRef(new Map());

  function setupContext() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = BOARD_WIDTH * dpr;
    canvas.height = BOARD_HEIGHT * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;
    redraw();
  }

  function redraw() {
    const ctx = ctxRef.current;
    if (!ctx) return;
    redrawAll(ctx, strokesRef.current, BOARD_WIDTH, BOARD_HEIGHT);
    remoteRef.current.forEach((stroke) => drawStroke(ctx, stroke));
    if (currentRef.current) drawStroke(ctx, currentRef.current);
  }

  useImperativeHandle(ref, () => ({
    setStrokes(strokes) {
      strokesRef.current = Array.isArray(strokes) ? strokes : [];
      remoteRef.current.clear();
      currentRef.current = null;
      redraw();
    },
    getStrokes() {
      return strokesRef.current;
    },
    startRemoteStroke(stroke) {
      remoteRef.current.set(stroke.id, { ...stroke, points: [...stroke.points] });
      drawStroke(ctxRef.current, stroke);
    },
    appendRemotePoints(strokeId, points, meta) {
      const existing = remoteRef.current.get(strokeId);
      if (existing) {
        const from = existing.points.length;
        existing.points.push(...points);
        drawStroke(ctxRef.current, existing, from);
        return;
      }
      const next = {
        id: strokeId,
        ...meta,
        points: [...points],
      };
      remoteRef.current.set(strokeId, next);
      drawStroke(ctxRef.current, next);
    },
    endRemoteStroke(strokeId) {
      const stroke = remoteRef.current.get(strokeId);
      if (stroke) {
        strokesRef.current = [...strokesRef.current, stroke];
        remoteRef.current.delete(strokeId);
      }
    },
    removeStroke(strokeId) {
      strokesRef.current = strokesRef.current.filter((s) => s.id !== strokeId);
      remoteRef.current.delete(strokeId);
      redraw();
    },
    addStroke(stroke) {
      if (strokesRef.current.some((s) => s.id === stroke.id)) return;
      strokesRef.current = [...strokesRef.current, stroke];
      drawStroke(ctxRef.current, stroke);
    },
    clear() {
      strokesRef.current = [];
      remoteRef.current.clear();
      currentRef.current = null;
      redraw();
    },
    exportPng() {
      const src = canvasRef.current;
      const out = document.createElement("canvas");
      out.width = src.width;
      out.height = src.height;
      const octx = out.getContext("2d");
      octx.fillStyle = "#ffffff";
      octx.fillRect(0, 0, out.width, out.height);
      octx.drawImage(src, 0, 0);
      return out.toDataURL("image/png");
    },
  }));

  useEffect(() => {
    setupContext();
    const wrap = wrapRef.current;
    const observer = new ResizeObserver(() => setupContext());
    if (wrap) observer.observe(wrap);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pointerDown(event) {
    if (disabled) return;
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    const point = clientToBoard(event, canvasRef.current);
    drawingRef.current = true;
    const stroke = onDrawStart(point);
    currentRef.current = stroke;
    drawStroke(ctxRef.current, stroke);
  }

  function pointerMove(event) {
    const point = clientToBoard(event, canvasRef.current);
    onCursorMove?.(point);
    if (!drawingRef.current || !currentRef.current) return;
    event.preventDefault();
    const stroke = currentRef.current;
    const from = stroke.points.length;
    stroke.points.push(point);
    drawStroke(ctxRef.current, stroke, from);
    onDrawMove(point);
  }

  function pointerUp(event) {
    if (!drawingRef.current) return;
    event.preventDefault();
    drawingRef.current = false;
    const stroke = currentRef.current;
    currentRef.current = null;
    if (stroke) {
      strokesRef.current = [...strokesRef.current, stroke];
      onDrawEnd(stroke);
    }
  }

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-crosshair bg-white dark:bg-[#111118]"
        onMouseDown={pointerDown}
        onMouseMove={pointerMove}
        onMouseUp={pointerUp}
        onMouseLeave={pointerUp}
        onTouchStart={pointerDown}
        onTouchMove={pointerMove}
        onTouchEnd={pointerUp}
        onTouchCancel={pointerUp}
      />
    </div>
  );
});

export default Canvas;
