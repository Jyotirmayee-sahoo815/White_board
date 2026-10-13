/**
 * Draw a stroke onto a 2D context using logical board coordinates.
 * Eraser uses destination-out so it removes ink instead of painting white.
 */
export function drawStroke(ctx, stroke, fromIndex = 0) {
  const points = stroke.points;
  if (!points || points.length === 0) return;

  ctx.save();
  if (stroke.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.fillStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
  }

  ctx.lineWidth = stroke.lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, stroke.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  const start = Math.max(0, fromIndex);
  ctx.beginPath();
  ctx.moveTo(points[Math.max(0, start - 1)].x, points[Math.max(0, start - 1)].y);

  for (let i = start; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    ctx.quadraticCurveTo(current.x, current.y, midX, midY);
  }

  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
  ctx.restore();
}

export function redrawAll(ctx, strokes, width, height) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
  ctx.clearRect(0, 0, width, height);
  for (const stroke of strokes) {
    drawStroke(ctx, stroke, 0);
  }
}
