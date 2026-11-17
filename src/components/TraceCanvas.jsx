import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { sfx } from '../lib/sfx';
import { letterGuide, trackWidths } from '../lib/letterGuide';

// The child paints inside the outlined letter with their finger.
// Paint is clipped to the letter shape, and we measure how much of the
// letter has been coloured in. Once enough is covered the letter is complete.

const COMPLETE_AT = 0.8; // fraction of the letter that must be coloured
const TRACK_EXTRA = 0.02; // every letter is drawn a little bolder (fraction of font size)
// Pen colours: black first (the default), the multi-colour pen last.
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
function drawGuide(ctx, guide, S, theme, startIdx = null, next = 0) {
  const r = Math.max(3, Math.min(S * 0.013, guide.halfWidth * 0.38));
  ctx.fillStyle = theme.main;
  guide.strokes.forEach((st, si) => {
    if (st.tap) return;
    st.dots.forEach((d, j) => {
      const k = startIdx ? startIdx[si] + j : -1;
      if (startIdx && k < next) return; // already reached
      if (k === next && j > 0) {
        // the next dot to reach: a bigger white dot with a coloured ring
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(d.x, d.y, r * 1.9, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.lineWidth = Math.max(2, r * 0.8);
        ctx.strokeStyle = theme.deep;
        ctx.stroke();
        ctx.fillStyle = theme.main;
        return;
      }
      if (j === 0) return; // start marker drawn separately
      const arrow = j % 3 === 2 && j < st.dots.length - 1;
      ctx.globalAlpha = arrow ? 0.95 : 0.7;
      ctx.beginPath();
      if (arrow) {
        const a = r * 2.1;
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.rotate(d.ang);
        ctx.moveTo(a, 0);
        ctx.lineTo(-a * 0.7, a * 0.8);
        ctx.lineTo(-a * 0.35, 0);
        ctx.lineTo(-a * 0.7, -a * 0.8);
        ctx.closePath();
        ctx.restore();
      } else {
        ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      }
      ctx.fill();
    });
  });
  ctx.globalAlpha = 1;
}

// Numbered green circle where each stroke starts (Arabic dots: a ring to tap).
function drawStarts(ctx, guide, S, startIdx = null, next = 0) {
  const R = Math.max(10, S * 0.034);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${R * 1.15}px Fredoka, system-ui, sans-serif`;
  const placed = [];
  guide.strokes.forEach((st, i) => {
    // if another stroke starts at the same spot (A), nudge this marker along its stroke
    const p = st.dots.slice(0, Math.ceil(st.dots.length / 2)).find((d) => placed.every((q) => Math.hypot(d.x - q.x, d.y - q.y) > R * 2.3)) || st.dots[0];
    placed.push(p);
    if (startIdx && startIdx[i] < next) return; // stroke already started
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

export default function TraceCanvas({ char, font, theme, onComplete, reference = [char], thicken = 0, outlineScale = 1, rtl = false, weight = 700, startNear = null, guidePaths = null, dotCount = 0 }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const st = useRef({}); // mutable drawing state, not needed for React renders
  const [size, setSize] = useState(0);
  const [ready, setReady] = useState(false);
  const [coverage, setCoverage] = useState(0);
  const [done, setDone] = useState(false);
  const [crayon, setCrayon] = useState('#222222');
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
    if (s.guide) drawGuide(ctx, s.guide, S, theme, s.startIdx, s.next);
    if (s.demo) drawDemo(ctx, s, theme);
    ctx.drawImage(s.layer, 0, 0, S, S);
    // Start markers stay visible on top of the crayon until the letter is done.
    if (s.guide && !s.finished) drawStarts(ctx, s.guide, S, s.startIdx, s.next);
  }, [char, theme, outlineScale]);

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
          g.dots.forEach((d) => seq.push({ x: d.x, y: d.y, si }));
        });

        st.current = {
          S, dpr, W, glyph, mask, paint, samples, guide, seq, startIdx,
          brush, // width of the letter's track (for how close is "on" the path)
          // tracing pen: a thin line so the path and dots stay visible
          // (letters without a guide keep the wide crayon and the colour-in rule)
          pen: guide ? Math.max(5, S * 0.02) : brush,
          next: 0,
          reach: Math.max(brush * 0.5, 14), // how close the finger must pass to a dot
          maskData: data, // letter shape, to notice when the finger leaves the letter
          lost: false,
          layer: makeCanvas(W, W),
          hue: Math.floor(Math.random() * 360),
          last: null,
          lastCheck: 0,
          finished: false,
        };
        render();
        setReady(true);
        setTimeout(() => !cancelled && playDemo(), 500); // show the way once
      });
    return () => {
      cancelled = true;
    };
  }, [char, font, size, thicken, rtl, weight, startNear?.join(), JSON.stringify(guidePaths), dotCount, render]); // eslint-disable-line react-hooks/exhaustive-deps

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
      // Finish neatly: draw the letter's strokes as a clean line in the pen colour.
      pc.lineCap = 'round';
      pc.lineJoin = 'round';
      pc.lineWidth = s.pen * 1.2;
      for (const g of s.guide.strokes) {
        const pts = g.points;
        if (g.tap) {
          pc.fillStyle = colorFor();
          pc.beginPath();
          pc.arc(pts[0].x, pts[0].y, s.pen * 1.3, 0, Math.PI * 2);
          pc.fill();
          continue;
        }
        for (let i = 1; i < pts.length; i++) {
          pc.strokeStyle = colorFor();
          pc.beginPath();
          pc.moveTo(pts[i - 1].x, pts[i - 1].y);
          pc.lineTo(pts[i].x, pts[i].y);
          pc.stroke();
        }
      }
      render();
      setCoverage(1);
      setDone(true);
      onComplete?.();
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

  // Move along the dot sequence while the finger's path passes the next dot.
  // Only the next dot counts, so going the wrong way or jumping ahead doesn't.
  const [progress, setProgress] = useState(0);
  const advance = (a, b) => {
    const s = st.current;
    if (!s.seq?.length || s.finished) return;
    // Leaving the letter during a drag stops that drag from counting (no
    // sweeping over everything); lift and carry on from the last dot.
    const off = (q) =>
      [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => {
        const x = Math.round((q.x + dx * s.brush * 0.3) * s.dpr), y = Math.round((q.y + dy * s.brush * 0.3) * s.dpr);
        return x < 0 || y < 0 || x >= s.W || y >= s.W || s.maskData[(y * s.W + x) * 4 + 3] < 100;
      });
    if (off(b)) s.lost = true;
    if (s.lost) return;
    const before = s.next;
    const near = (d) => distToSegment(d, a, b) <= s.reach;
    while (s.next < s.seq.length) {
      if (near(s.seq[s.next])) s.next++;
      // a dot a fast finger just missed: allow skipping one within the same stroke
      else if (s.next + 1 < s.seq.length && s.seq[s.next + 1].si === s.seq[s.next].si && s.next > s.startIdx[s.seq[s.next].si] && near(s.seq[s.next + 1])) s.next += 2;
      else break;
    }
    if (s.next !== before) {
      setProgress(s.next / s.seq.length);
      if (s.next >= s.seq.length) finish();
    }
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
    s.next = 0;
    render();
    setCoverage(0);
    setProgress(0);
  };

  const usesDots = !!st.current.seq?.length;
  const pct = usesDots ? Math.round(progress * 100) : Math.min(100, Math.round((coverage / COMPLETE_AT) * 100));

  return (
    <div className="trace">
      <div className="trace-meter" aria-label={usesDots ? `${pct}% of the dots reached` : `Coloured ${pct}%`}>
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
          <div className="trace-hint">👆 Start at the green 1 and follow the arrows!</div>
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
