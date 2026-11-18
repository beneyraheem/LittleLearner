import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { sfx } from '../lib/sfx';
import { letterGuide, trackWidths } from '../lib/letterGuide';

// The child paints inside the outlined letter with their finger.
// Paint is clipped to the letter shape, and we measure how much of the
// letter has been coloured in. Once enough is covered the letter is complete.

const COMPLETE_AT = 0.8; // fraction of the letter that must be coloured
const DONE_AT = 0.7; // fraction of the path's dots passed before the last dot finishes the letter
const TRACK_EXTRA = 0.02; // every letter is drawn a little bolder (fraction of font size)
// Pen colours: the multi-colour pen (the default) is last.
const CRAYONS = [
  { id: '#222222', label: 'Black' },
  { id: '#ff5b5b', label: 'Red' },
  { id: '#ffb03a', label: 'Orange' },
  { id: '#ffd23f', label: 'Yellow' },
  { id: '#3ccf6e', label: 'Green' },
  { id: '#3ab0ff', label: 'Blue' },
  { id: '#9b6bff', label: 'Purple' },
  { id: '#ff6fb5', label: 'Pink' },
  { id: 'rainbow', label: 'Rainbow', swatch: 'conic-gradient(#ff5b5b, #ffb03a, #ffe14d, #4cd964, #3ab0ff, #9b6bff, #ff5b5b)' },
];

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Ink box of the largest letter in an alphabet, at 100px – cached per font.
const refBoxCache = new Map();
function referenceBox(font, chars, weight = 700) {
  const key = weight + font + chars.join('');
  if (!refBoxCache.has(key)) {
    const m = makeCanvas(10, 10).getContext('2d');
    m.font = `${weight} 100px ${font}`;
    let w = 1, h = 1;
    for (const c of chars) {
      const t = m.measureText(c);
      w = Math.max(w, (t.actualBoundingBoxLeft || 0) + (t.actualBoundingBoxRight || t.width));
      h = Math.max(h, (t.actualBoundingBoxAscent || 70) + (t.actualBoundingBoxDescent || 0));
    }
    refBoxCache.set(key, { w, h });
  }
  return refBoxCache.get(key);
}

// Distance from point p to the segment a–b.
function distToSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

const distToLine = (p, pts) => {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) best = Math.min(best, distToSegment(p, pts[i - 1], pts[i]));
  return pts.length === 1 ? Math.hypot(p.x - pts[0].x, p.y - pts[0].y) : best;
};

// Points every few pixels along a drawn line.
function along(pts, step) {
  const out = pts.length ? [pts[0]] : [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step);
    for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
}

// How closely the child's lines followed the letter's path, 0–100, and 1–3 stars.
// Two parts: how much of what they drew sits on the path (wobbles and wandering
// count against it), and how much of the path their lines went along.
function scoreTrace(ink, guide, width, pen) {
  const lines = guide.strokes.filter((g) => !g.tap).map((g) => g.points);
  if (!lines.length) return { score: 100, stars: 3 };
  // right on the line: within about a pen's width; nothing for wandering near the edge of the letter
  const close = Math.max(pen * 1.1, width * 0.1), far = Math.max(close * 2, Math.min(width * 0.42, pen * 2.6));
  const drawn = ink.flatMap((l) => along(l, 3));
  let onPath = 0;
  for (const p of drawn) {
    const d = Math.min(...lines.map((l) => distToLine(p, l)));
    onPath += d <= close ? 1 : d >= far ? 0 : (far - d) / (far - close);
  }
  const accuracy = drawn.length ? onPath / drawn.length : 0;
  const path = lines.flatMap((l) => along(l, 6));
  const inkLines = ink.filter((l) => l.length);
  let covered = 0;
  for (const p of path) if (inkLines.some((l) => distToLine(p, l) <= Math.max(pen * 2, width * 0.25))) covered++;
  const coverage = path.length ? covered / path.length : 1;
  const score = Math.round(100 * (0.6 * accuracy + 0.4 * coverage));
  if (window.__debugGuide) window.__score = { accuracy, coverage, width, pen, close, far };
  return { score, stars: score >= 80 ? 3 : score >= 60 ? 2 : 1 };
}

// The letter's path as a dashed line (with a light edge so it shows on any
// colour). After the letter is done it is drawn over the child's lines, so
// they can see how close they came.
function drawPath(ctx, guide, S, theme, taps = true) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const g of guide.strokes) {
    const pts = g.points;
    if (g.tap) {
      if (!taps) continue;
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, Math.max(5, S * 0.018), 0, Math.PI * 2);
      ctx.lineWidth = Math.max(2, S * 0.007);
      ctx.strokeStyle = theme.deep;
      ctx.stroke();
      continue;
    }
    ctx.beginPath();
    pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
    ctx.setLineDash([]);
    ctx.lineWidth = Math.max(5, S * 0.02);
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.stroke();
    ctx.setLineDash([Math.max(7, S * 0.03), Math.max(6, S * 0.024)]);
    ctx.lineWidth = Math.max(3, S * 0.011);
    ctx.strokeStyle = theme.deep;
    ctx.stroke();
  }
  ctx.restore();
}

// Draw the letter, optionally thickened by stroking its outline – used for
// fonts with thin strokes so there is room for little fingers to colour.
function drawShape(ctx, char, glyph, thicken, color) {
  ctx.font = glyph.font;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(char, glyph.x, glyph.y);
  if (thicken > 0) {
    ctx.lineWidth = thicken;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.strokeText(char, glyph.x, glyph.y);
  }
}

// Guide: dots along each stroke, with an arrow every few dots for direction.
// Dots already reached are hidden; the next one to reach is highlighted.
// The pen's colour for the next-dot indicator (the rainbow pen gets a colour wheel).
function penFill(ctx, pen, x, y) {
  if (pen !== 'rainbow') return pen;
  if (!ctx.createConicGradient) return '#ff5b5b';
  const g = ctx.createConicGradient(0, x, y);
  ['#ff5b5b', '#ffb03a', '#ffe14d', '#4cd964', '#3ab0ff', '#9b6bff', '#ff5b5b'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
  return g;
}

// Of neighbouring dots along each stroke that were both passed, the share passed
// in writing order – low when strokes are traced backwards.
function forwardShare(s) {
  let pairs = 0, fwd = 0;
  for (let i = 1; i < s.seq.length; i++) {
    if (s.seq[i].si !== s.seq[i - 1].si || !s.hit[i] || !s.hit[i - 1]) continue;
    pairs++;
    if (s.hit[i] > s.hit[i - 1]) fwd++;
  }
  return pairs ? fwd / pairs : 1;
}

// Dots passed going the right way (a stroke's start, or right after the dot
// before it) – what the progress meter shows.
function forwardDots(s) {
  let n = 0;
  for (let i = 0; i < s.seq.length; i++) {
    if (!s.hit[i]) continue;
    const start = i === 0 || s.seq[i].si !== s.seq[i - 1].si;
    if (start || (s.hit[i - 1] && s.hit[i - 1] < s.hit[i])) n++;
  }
  return n;
}

// While tracing: the letter's path as a dashed line, and a dot in the pen's
// colour where it finishes (reaching it completes the letter).
function drawGuide(ctx, guide, S, theme, pen = '#222222', end = null) {
  drawPath(ctx, guide, S, theme, false);
  if (!end || end.tap) return; // a final tap is already marked by its ring
  const r = Math.max(6, S * 0.024);
  ctx.save();
  ctx.beginPath();
  ctx.arc(end.x, end.y, r, 0, Math.PI * 2);
  ctx.fillStyle = penFill(ctx, pen, end.x, end.y);
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.35);
  ctx.strokeStyle = '#fff';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(end.x, end.y, r + ctx.lineWidth / 2 + 1, 0, Math.PI * 2);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = theme.deep;
  ctx.stroke();
  ctx.restore();
}

// Points every 2px along a polyline (where a start marker may be placed).
function alongLine(pts) {
  const out = [];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
    for (let k = 0; k < n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
}

// Numbered green circle where each stroke starts (Arabic dots: a ring to tap).
function drawStarts(ctx, guide, S, startIdx = null, hit = null) {
  const R = Math.max(10, S * 0.034);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${R * 1.15}px Fredoka, system-ui, sans-serif`;
  const placed = [];
  guide.strokes.forEach((st, i) => {
    // if another stroke starts at the same spot (A), nudge this marker along its stroke
    // look along the whole line (not just the dots) so short strokes can space their numbers out
    const free = (d) => placed.every((q) => Math.hypot(d.x - q.x, d.y - q.y) > R * 2.2);
    const p = free(st.dots[0]) ? st.dots[0] : alongLine(st.points).find(free) || st.dots[0];
    placed.push(p);
    if (startIdx && hit?.[startIdx[i]]) return; // stroke already started
    ctx.beginPath();
    ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
    ctx.fillStyle = st.tap ? 'rgba(255,255,255,.92)' : '#22b45a';
    ctx.fill();
    ctx.lineWidth = Math.max(2, R * 0.18);
    ctx.strokeStyle = st.tap ? '#22b45a' : '#fff';
    ctx.stroke();
    ctx.fillStyle = st.tap ? '#22b45a' : '#fff';
    ctx.fillText(String(i + 1), p.x, p.y + R * 0.06);
  });
  ctx.restore();
}

// "Watch me" demo: a finger draws each stroke in order, leaving a light trail.
function drawDemo(ctx, s, theme) {
  const { demo, guide, S } = s;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = s.pen * 1.4;
  ctx.strokeStyle = theme.main;
  ctx.globalAlpha = 0.45;
  let left = demo.d, head = null;
  for (const st of guide.strokes) {
    if (left <= 0) break;
    if (st.tap) {
      head = st.points[0];
      ctx.beginPath();
      ctx.arc(head.x, head.y, s.pen * 1.6, 0, Math.PI * 2);
      ctx.fillStyle = theme.main;
      ctx.fill();
      left -= s.tapLen;
      continue;
    }
    const pts = st.points;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    head = pts[0];
    for (let i = 1; i < pts.length && left > 0; i++) {
      const a = pts[i - 1], b = pts[i], seg = Math.hypot(b.x - a.x, b.y - a.y);
      const t = Math.min(1, left / (seg || 1));
      head = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      ctx.lineTo(head.x, head.y);
      left -= seg;
    }
    ctx.stroke();
    left -= s.gapLen;
  }
  ctx.restore();
  if (head) {
    ctx.save();
    ctx.font = `${S * 0.11}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('👆', head.x, head.y - S * 0.012);
    ctx.restore();
  }
}

export default function TraceCanvas({ char, font, theme, onComplete, reference = [char], thicken = 0, outlineScale = 1, rtl = false, weight = 700, startNear = null, guidePaths = null, dotCount = 0, penScale = 1 }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const st = useRef({}); // mutable drawing state, not needed for React renders
  const [size, setSize] = useState(0);
  const [ready, setReady] = useState(false);
  const [coverage, setCoverage] = useState(0);
  const [done, setDone] = useState(false);
  const [crayon, setCrayon] = useState('rainbow');
  const [demoOn, setDemoOn] = useState(false);
  const rafRef = useRef(0);
  const crayonRef = useRef(crayon);
  crayonRef.current = crayon;

  // Square canvas that fits the available space.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    const measure = () => {
      const w = el.clientWidth;
      const h = window.innerHeight - 300;
      setSize(Math.max(220, Math.min(w, h, 460)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const render = useCallback(() => {
    const s = st.current;
    const canvas = canvasRef.current;
    if (!canvas || !s.mask) return;
    const ctx = canvas.getContext('2d');
    const { S, dpr, glyph } = s;

    // Paint clipped to the letter shape.
    const lc = s.layer.getContext('2d');
    lc.globalCompositeOperation = 'copy';
    lc.drawImage(s.paint, 0, 0);
    lc.globalCompositeOperation = 'destination-in';
    lc.drawImage(s.mask, 0, 0);
    lc.globalCompositeOperation = 'source-over';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, S, S);
    // The letter is a solid "track" with a bold border and a dotted
    // centre line to follow; the child's crayon goes on top.
    const outline = Math.max(3, S * 0.014 * outlineScale);
    drawShape(ctx, char, glyph, glyph.thick + outline * 2, theme.deep);
    drawShape(ctx, char, glyph, glyph.thick, theme.soft);
    if (s.guide && !s.finished) drawGuide(ctx, s.guide, S, theme, crayonRef.current, s.seq.at(-1));
    if (s.demo) drawDemo(ctx, s, theme);
    ctx.drawImage(s.layer, 0, 0, S, S);
    if (s.guide && s.finished) drawPath(ctx, s.guide, S, theme);
    // Start markers stay visible on top of the crayon until the letter is done.
    if (s.guide && !s.finished) drawStarts(ctx, s.guide, S, s.startIdx, s.hit);
  }, [char, theme, outlineScale]);

  // Redraw when a new pen colour is picked (the next dot shows it).
  useEffect(() => {
    render();
  }, [crayon, render]);

  // (Re)build the letter mask whenever the letter or size changes.
  useEffect(() => {
    if (!size) return;
    let cancelled = false;
    setReady(false);
    setDone(false);
    setCoverage(0);
    setProgress(0);

    const family = font.split(',')[0];
    document.fonts
      .load(`${weight} 100px ${family}`, reference.join(''))
      .catch(() => {})
      .then(() => {
        if (cancelled) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const S = size;
        const W = Math.round(S * dpr);
        const canvas = canvasRef.current;
        canvas.width = W;
        canvas.height = W;

        // Size the letter relative to its whole alphabet (so a small letter
        // stays smallish), but let small letters grow a bit so they are
        // comfortable to colour, and never overflow the square.
        const m = makeCanvas(10, 10).getContext('2d');
        m.font = `${weight} 100px ${font}`;
        const mt = m.measureText(char);
        const L = mt.actualBoundingBoxLeft || 0;
        const R = mt.actualBoundingBoxRight || mt.width;
        const A = mt.actualBoundingBoxAscent || 70;
        const D = mt.actualBoundingBoxDescent || 0;
        const ref = referenceBox(font, reference, weight);
        const base = (S * 0.72) / Math.max(ref.w, ref.h);
        const fit = (S * 0.72) / Math.max(L + R, A + D, 1);
        const scale = Math.min(fit, base * 1.6);
        const fontSize = 100 * scale;
        const glyph = {
          font: `${weight} ${fontSize}px ${font}`,
          x: S / 2 - ((R - L) * scale) / 2,
          y: S / 2 - ((D - A) * scale) / 2,
          fontSize,
          thick: (thicken + TRACK_EXTRA) * fontSize,
        };

        const mask = makeCanvas(W, W);
        const mc = mask.getContext('2d');
        mc.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawShape(mc, char, glyph, glyph.thick, '#000');

        // Sample points inside the letter, used to measure coverage.
        const data = mc.getImageData(0, 0, W, W).data;
        const step = Math.max(2, Math.round(3 * dpr));
        const samples = [];
        for (let y = 0; y < W; y += step) {
          for (let x = 0; x < W; x += step) {
            const i = (y * W + x) * 4 + 3;
            if (data[i] > 160) samples.push(i);
          }
        }

        // Centre-line guide dots and a crayon about as wide as the letter's stroke.
        // The guide follows the letter's own pen shape (before thickening), so
        // the dots keep its bends and waves; the crayon is sized from the
        // thick track so one pass fills it.
        const pen = makeCanvas(W, W).getContext('2d');
        pen.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawShape(pen, char, glyph, 0, '#000');
        const guide = letterGuide(pen.getImageData(0, 0, W, W).data, W, dpr, {
          rtl,
          startNear: startNear && { x: startNear[0] * S, y: startNear[1] * S },
          dots: dotCount,
          // hand-drawn paths are given as fractions of the letter's ink box
          manual:
            guidePaths &&
            guidePaths.map((stroke) =>
              stroke.map(([fx, fy]) => ({
                x: glyph.x - L * scale + fx * (L + R) * scale,
                y: glyph.y - A * scale + fy * (A + D) * scale,
              })),
            ),
        });
        const widths = trackWidths(data, W, dpr);
        if (window.__debugGuide && guide) {
          // debug: how much of the letter is far from every guide stroke
          const pts = guide.strokes.flatMap((g) => g.points);
          let miss = 0, mx = 0, my = 0;
          for (const i of samples) {
            const p = (i - 3) / 4, x = (p % W) / dpr, y = Math.floor(p / W) / dpr;
            if (pts.every((q) => Math.hypot(q.x - x, q.y - y) > guide.halfWidth * 1.7)) { miss++; mx += x; my += y; }
          }
          window.__guide = guide;
          window.__miss = { ratio: miss / samples.length, at: miss ? [Math.round(mx / miss), Math.round(my / miss)] : null };
        }
        const brush = guide
          ? Math.min(S * 0.17, Math.max(14, (widths?.half ?? guide.halfWidth) * 2 * 1.3, (widths?.wide ?? guide.wideHalf) * 2 * 1.15))
          : Math.max(12, S * 0.065);

        const paint = makeCanvas(W, W);
        const pc = paint.getContext('2d');
        pc.setTransform(dpr, 0, 0, dpr, 0, 0);
        pc.lineCap = 'round';
        pc.lineJoin = 'round';

        // Every guide dot in writing order: the child completes the letter by
        // reaching them one after another (starting each stroke at its start).
        const seq = [], startIdx = [];
        guide?.strokes.forEach((g, si) => {
          startIdx[si] = seq.length;
          g.dots.forEach((d) => seq.push({ x: d.x, y: d.y, si, tap: !!g.tap }));
        });

        st.current = {
          S, dpr, W, glyph, mask, paint, samples, guide, seq, startIdx,
          brush, // width of the letter's track (for how close is "on" the path)
          // tracing pen: a thin line so the path and dots stay visible
          // (letters without a guide keep the wide crayon and the colour-in rule)
          pen: guide ? Math.max(3, S * 0.02 * penScale) : brush,
          hit: new Uint32Array(seq.length), // when each guide dot was passed (0 = not yet)
          tick: 0,
          hits: 0,
          reach: Math.max(brush * 0.5, 14), // how close the finger must pass to a dot
          maskData: data, // letter shape, to notice when the finger leaves the letter
          lost: false,
          layer: makeCanvas(W, W),
          hue: Math.floor(Math.random() * 360),
          last: null,
          lastCheck: 0,
          finished: false,
          ink: [], // the child's lines, to compare with the path at the end
        };
        render();
        setReady(true);
        setTimeout(() => !cancelled && playDemo(), 500); // show the way once
      });
    return () => {
      cancelled = true;
    };
  }, [char, font, size, thicken, rtl, weight, startNear?.join(), JSON.stringify(guidePaths), dotCount, penScale, render]); // eslint-disable-line react-hooks/exhaustive-deps

  const measureCoverage = useCallback(() => {
    const s = st.current;
    if (!s.samples?.length) return 0;
    const data = s.layer.getContext('2d').getImageData(0, 0, s.W, s.W).data;
    let hit = 0;
    for (const i of s.samples) if (data[i] > 40) hit++;
    return hit / s.samples.length;
  }, []);

  const finish = useCallback(() => {
    const s = st.current;
    if (s.finished) return;
    s.finished = true;
    s.demo = null;
    cancelAnimationFrame(rafRef.current);
    setDemoOn(false);
    const pc = s.paint.getContext('2d');
    if (s.guide) {
      // Keep the child's own lines and score them against the letter's path.
      const result = scoreTrace(s.ink, s.guide, s.brush, s.pen);
      s.result = result;
      render();
      setCoverage(1);
      setDone(true);
      onComplete?.(result);
      return;
    }
    // No guide: magic fill – colour any gaps behind the child's strokes.
    const g = pc.createLinearGradient(0, 0, s.S, s.S);
    ['#ff5b5b', '#ffb03a', '#ffe14d', '#4cd964', '#3ab0ff', '#9b6bff'].forEach((c, i, arr) =>
      g.addColorStop(i / (arr.length - 1), c),
    );
    pc.globalCompositeOperation = 'destination-over';
    pc.fillStyle = g;
    pc.fillRect(0, 0, s.S, s.S);
    pc.globalCompositeOperation = 'source-over';
    render();
    setCoverage(1);
    setDone(true);
    onComplete?.();
  }, [render, onComplete]);

  const check = useCallback(
    (force) => {
      const s = st.current;
      const now = performance.now();
      if (!force && now - s.lastCheck < 180) return;
      s.lastCheck = now;
      const c = measureCoverage();
      setCoverage(c);
      if (c >= COMPLETE_AT) finish();
    },
    [measureCoverage, finish],
  );

  // Tick off the guide dots the finger passes. Reaching the last dot finishes
  // the letter once most of the path has been traced; wobbles and small
  // mistakes are allowed and show up in the stars instead.
  const [progress, setProgress] = useState(0);
  const advance = (a, b) => {
    const s = st.current;
    if (!s.seq?.length || s.finished) return;
    // Leaving the letter during a drag stops that drag from counting (no
    // sweeping over everything); lift and carry on.
    const off = (q) =>
      [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => {
        const x = Math.round((q.x + dx * s.brush * 0.3) * s.dpr), y = Math.round((q.y + dy * s.brush * 0.3) * s.dpr);
        return x < 0 || y < 0 || x >= s.W || y >= s.W || s.maskData[(y * s.W + x) * 4 + 3] < 100;
      });
    if (off(b)) s.lost = true;
    if (s.lost) return;
    const before = s.hits;
    // dots passed in this move, in the order the finger reached them
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
    s.seq
      .map((d, i) => ({ i, t: ((d.x - a.x) * dx + (d.y - a.y) * dy) / l2 }))
      .filter(({ i }) => !s.hit[i] && distToSegment(s.seq[i], a, b) <= s.reach)
      .sort((p, q) => p.t - q.t)
      .forEach(({ i }) => {
        s.hit[i] = ++s.tick; // when it was passed, to tell the direction of travel
        s.hits++;
      });
    if (s.hits !== before) setProgress(forwardDots(s) / s.seq.length);
    const last = s.seq.length - 1;
    // the finish: touch the last dot (closely, coming along the end of its stroke)
    const first = s.startIdx[s.seq[last].si];
    const leadUp = [1, 2, 3].map((k) => last - k).filter((i) => i >= first); // the dots leading to it
    const atEnd = s.seq[last].tap || first === last
      ? distToSegment(s.seq[last], a, b) <= s.reach
      : leadUp.every((i) => s.hit[i]) && distToSegment(s.seq[last], a, b) <= Math.max(s.pen * 2, s.reach * 0.6);
    if (atEnd && s.hits >= s.seq.length * DONE_AT && forwardShare(s) >= 0.6) finish();
  };

  const colorFor = () => {
    const s = st.current;
    if (crayonRef.current === 'rainbow') {
      s.hue = (s.hue + 3) % 360;
      return `hsl(${s.hue} 90% 60%)`;
    }
    return crayonRef.current;
  };

  const point = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * st.current.S, y: ((e.clientY - r.top) / r.height) * st.current.S };
  };

  // Animate the finger along the strokes, in order.
  const stopDemo = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (st.current.demo) {
      st.current.demo = null;
      render();
    }
    setDemoOn(false);
  }, [render]);

  const playDemo = useCallback(() => {
    const s = st.current;
    if (!s.guide?.strokes.length || s.finished) return;
    cancelAnimationFrame(rafRef.current);
    s.tapLen = s.S * 0.12;
    s.gapLen = s.S * 0.12;
    const total = s.guide.strokes.reduce((n, g) => n + (g.tap ? s.tapLen : g.length + s.gapLen), 0);
    const speed = s.S * 0.5; // px per second
    const t0 = performance.now();
    s.demo = { d: 0 };
    setDemoOn(true);
    const tick = (now) => {
      if (!st.current.demo) return;
      s.demo.d = ((now - t0) / 1000) * speed;
      render();
      if (s.demo.d < total + s.S * 0.25) rafRef.current = requestAnimationFrame(tick);
      else stopDemo();
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [render, stopDemo]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const onDown = (e) => {
    const s = st.current;
    if (!ready || s.finished) return;
    if (s.demo) stopDemo();
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    const p = point(e);
    s.last = p;
    s.lost = false;
    s.ink.push([p]);
    const pc = s.paint.getContext('2d');
    pc.fillStyle = colorFor();
    pc.beginPath();
    pc.arc(p.x, p.y, s.pen / 2, 0, Math.PI * 2);
    pc.fill();
    advance(p, p);
    render();
  };

  const onMove = (e) => {
    const s = st.current;
    if (!s.last || s.finished) return;
    e.preventDefault();
    const pc = s.paint.getContext('2d');
    const events = e.nativeEvent.getCoalescedEvents?.() || [e.nativeEvent];
    pc.lineWidth = s.pen;
    for (const ev of events) {
      const p = point(ev);
      s.ink.at(-1)?.push(p);
      pc.strokeStyle = colorFor();
      pc.beginPath();
      pc.moveTo(s.last.x, s.last.y);
      pc.lineTo(p.x, p.y);
      pc.stroke();
      advance(s.last, p);
      s.last = p;
    }
    render();
    if (!s.seq?.length) check(false); // no guide: fall back to how much is coloured
  };

  const onUp = () => {
    const s = st.current;
    if (!s.last) return;
    s.last = null;
    if (!s.finished) {
      sfx.pop();
      if (!s.seq?.length) check(true);
    }
  };

  const clear = () => {
    const s = st.current;
    if (!s.paint || s.finished) return;
    s.paint.getContext('2d').clearRect(0, 0, s.S, s.S);
    s.hit = new Uint32Array(s.seq?.length || 0);
    s.tick = 0;
    s.hits = 0;
    s.ink = [];
    render();
    setCoverage(0);
    setProgress(0);
  };

  const usesDots = !!st.current.seq?.length;
  const pct = usesDots ? Math.round(progress * 100) : Math.min(100, Math.round((coverage / COMPLETE_AT) * 100));

  return (
    <div className="trace">
      <div className="trace-meter" aria-label={usesDots ? `${pct}% of the path traced` : `Coloured ${pct}%`}>
        <div className="trace-meter-fill" style={{ width: `${pct}%`, background: theme.main }} />
        <span>{done ? 'Done! ⭐' : `${pct}%`}</span>
      </div>

      <div className="trace-stage" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className={`trace-canvas ${done ? 'is-done' : ''}`}
          style={{ width: size, height: size, borderColor: theme.soft }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
        />
        {!ready && <div className="trace-loading">✏️</div>}
        {ready && (usesDots ? progress === 0 : coverage === 0) && !done && !demoOn && (
          <div className="trace-hint">👆 Start at the green 1 and follow the dashes!</div>
        )}
      </div>

      {!done && (
        <button className="btn btn-soft btn-small show-me" onClick={playDemo} disabled={!ready || demoOn}>
          👀 Show me
        </button>
      )}

      {!done && (
        <div className="crayons" role="radiogroup" aria-label="Crayon colour">
          {CRAYONS.map((c) => (
            <button
              key={c.id}
              role="radio"
              aria-checked={crayon === c.id}
              aria-label={c.label}
              className={`crayon ${crayon === c.id ? 'is-active' : ''}`}
              style={{ background: c.swatch || c.id }}
              onClick={() => setCrayon(c.id)}
            />
          ))}
          <button className="crayon crayon-clear" aria-label="Start over" onClick={clear} disabled={done}>
            ↺
          </button>
        </div>
      )}
    </div>
  );
}
