import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { sfx } from '../lib/sfx';

// The child paints inside the outlined letter with their finger.
// Paint is clipped to the letter shape, and we measure how much of the
// letter has been coloured in. Once enough is covered the letter is complete.

const COMPLETE_AT = 0.8; // fraction of the letter that must be coloured
const CRAYONS = [
  { id: 'rainbow', label: 'Rainbow', swatch: 'conic-gradient(#ff5b5b, #ffb03a, #ffe14d, #4cd964, #3ab0ff, #9b6bff, #ff5b5b)' },
  { id: '#ff5b5b', label: 'Red' },
  { id: '#ffb03a', label: 'Orange' },
  { id: '#ffd23f', label: 'Yellow' },
  { id: '#3ccf6e', label: 'Green' },
  { id: '#3ab0ff', label: 'Blue' },
  { id: '#9b6bff', label: 'Purple' },
  { id: '#ff6fb5', label: 'Pink' },
];

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Ink box of the largest letter in an alphabet, at 100px – cached per font.
const refBoxCache = new Map();
function referenceBox(font, chars) {
  const key = font + chars.join('');
  if (!refBoxCache.has(key)) {
    const m = makeCanvas(10, 10).getContext('2d');
    m.font = `700 100px ${font}`;
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

// Draw the letter, optionally thickened by stroking its outline – used for
// fonts with thin strokes so there is room for little fingers to colour.
function drawShape(ctx, char, glyph, thicken, color) {
  ctx.font = glyph.font;
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

export default function TraceCanvas({ char, font, theme, onComplete, reference = [char], thicken = 0 }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const st = useRef({}); // mutable drawing state, not needed for React renders
  const [size, setSize] = useState(0);
  const [ready, setReady] = useState(false);
  const [coverage, setCoverage] = useState(0);
  const [done, setDone] = useState(false);
  const [crayon, setCrayon] = useState('rainbow');
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
    const outline = Math.max(2, S * 0.008);
    if (glyph.thick > 0) {
      // Thickened letter: solid outline ring drawn underneath the shape.
      drawShape(ctx, char, glyph, glyph.thick + outline * 2, theme.deep);
      drawShape(ctx, char, glyph, glyph.thick, theme.soft);
      ctx.drawImage(s.layer, 0, 0, S, S);
      return;
    }
    drawShape(ctx, char, glyph, 0, theme.soft);
    ctx.drawImage(s.layer, 0, 0, S, S);
    // Dashed outline on top so the shape is always visible.
    ctx.setLineDash([S * 0.018, S * 0.014]);
    ctx.lineWidth = outline;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = theme.deep;
    ctx.strokeText(char, glyph.x, glyph.y);
    ctx.setLineDash([]);
  }, [char, theme]);

  // (Re)build the letter mask whenever the letter or size changes.
  useEffect(() => {
    if (!size) return;
    let cancelled = false;
    setReady(false);
    setDone(false);
    setCoverage(0);

    const family = font.split(',')[0];
    document.fonts
      .load(`700 100px ${family}`, reference.join(''))
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
        m.font = `700 100px ${font}`;
        const mt = m.measureText(char);
        const L = mt.actualBoundingBoxLeft || 0;
        const R = mt.actualBoundingBoxRight || mt.width;
        const A = mt.actualBoundingBoxAscent || 70;
        const D = mt.actualBoundingBoxDescent || 0;
        const ref = referenceBox(font, reference);
        const base = (S * 0.72) / Math.max(ref.w, ref.h);
        const fit = (S * 0.72) / Math.max(L + R, A + D, 1);
        const scale = Math.min(fit, base * 1.6);
        const fontSize = 100 * scale;
        const glyph = {
          font: `700 ${fontSize}px ${font}`,
          x: S / 2 - ((R - L) * scale) / 2,
          y: S / 2 - ((D - A) * scale) / 2,
          fontSize,
          thick: thicken * fontSize,
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

        const paint = makeCanvas(W, W);
        const pc = paint.getContext('2d');
        pc.setTransform(dpr, 0, 0, dpr, 0, 0);
        pc.lineCap = 'round';
        pc.lineJoin = 'round';

        st.current = {
          S, dpr, W, glyph, mask, paint, samples,
          layer: makeCanvas(W, W),
          brush: Math.max(12, S * 0.065),
          hue: Math.floor(Math.random() * 360),
          last: null,
          lastCheck: 0,
          finished: false,
        };
        render();
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [char, font, size, thicken, render]); // eslint-disable-line react-hooks/exhaustive-deps

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
    // Magic fill: colour any gaps behind the child's strokes.
    const pc = s.paint.getContext('2d');
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

  const onDown = (e) => {
    const s = st.current;
    if (!ready || s.finished) return;
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    const p = point(e);
    s.last = p;
    const pc = s.paint.getContext('2d');
    pc.fillStyle = colorFor();
    pc.beginPath();
    pc.arc(p.x, p.y, s.brush / 2, 0, Math.PI * 2);
    pc.fill();
    render();
  };

  const onMove = (e) => {
    const s = st.current;
    if (!s.last || s.finished) return;
    e.preventDefault();
    const pc = s.paint.getContext('2d');
    const events = e.nativeEvent.getCoalescedEvents?.() || [e.nativeEvent];
    pc.lineWidth = s.brush;
    for (const ev of events) {
      const p = point(ev);
      pc.strokeStyle = colorFor();
      pc.beginPath();
      pc.moveTo(s.last.x, s.last.y);
      pc.lineTo(p.x, p.y);
      pc.stroke();
      s.last = p;
    }
    render();
    check(false);
  };

  const onUp = () => {
    const s = st.current;
    if (!s.last) return;
    s.last = null;
    if (!s.finished) {
      sfx.pop();
      check(true);
    }
  };

  const clear = () => {
    const s = st.current;
    if (!s.paint || s.finished) return;
    s.paint.getContext('2d').clearRect(0, 0, s.S, s.S);
    render();
    setCoverage(0);
  };

  const pct = Math.min(100, Math.round((coverage / COMPLETE_AT) * 100));

  return (
    <div className="trace">
      <div className="trace-meter" aria-label={`Coloured ${pct}%`}>
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
        {ready && coverage === 0 && !done && <div className="trace-hint">👆 Colour inside the letter!</div>}
      </div>

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
    </div>
  );
}
