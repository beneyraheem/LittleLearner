// Works out a tracing guide from a letter's pixel mask, for any script:
//  - the letter's stroke width, so the crayon can match it
//  - the letter's strokes, in a sensible writing order and direction, each
//    with evenly spaced guide dots (used for start markers and arrows)
//
// How: thin the letter to a one-pixel centre line (skeleton), split it into
// pieces at junctions, drop tiny corner spurs, join pieces that continue
// straight through a junction, then order/orient the resulting strokes:
// strokes start at their top end (or, for flat strokes, on the side the
// script is written from); closed loops start at the top and go
// anticlockwise; small separate marks (Arabic dots) come last as taps.
// Runs on a small grid so it is fast enough to do for every letter.

const N = 160; // grid resolution
const NB = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]; // clockwise ring

export function letterGuide(alpha, W, dpr, { rtl = false, startNear = null, manual = null, dots = 0, centre = true } = {}) {
  const cell = W / N;
  const toCss = (i) => ({ x: ((i % N) + 0.5) * (cell / dpr), y: (Math.floor(i / N) + 0.5) * (cell / dpr) });
  const inside = new Uint8Array(N * N);
  for (let gy = 0; gy < N; gy++) {
    for (let gx = 0; gx < N; gx++) {
      const x = Math.min(W - 1, Math.floor((gx + 0.5) * cell));
      const y = Math.min(W - 1, Math.floor((gy + 0.5) * cell));
      inside[gy * N + gx] = alpha[(y * W + x) * 4 + 3] > 128 ? 1 : 0;
    }
  }
  const neighbours = (i, arr) => {
    const x = i % N, y = (i - x) / N, out = [];
    for (const [dx, dy] of NB) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < N && ny < N && arr[ny * N + nx]) out.push(ny * N + nx);
    }
    return out;
  };

  // ---- Distance to the edge (chamfer 3-4, units of 1/3 cell) ------------
  const dist = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) dist[i] = inside[i] ? 1e9 : 0;
  const at = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? 0 : dist[y * N + x]);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      if (dist[i]) dist[i] = Math.min(dist[i], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4);
    }
  for (let y = N - 1; y >= 0; y--)
    for (let x = N - 1; x >= 0; x--) {
      const i = y * N + x;
      if (dist[i]) dist[i] = Math.min(dist[i], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4);
    }

  // ---- Zhang–Suen thinning → one-cell-wide centre line ------------------
  const sk = inside.slice();
  const px = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? 0 : sk[y * N + x]);
  for (let changed = true; changed; ) {
    changed = false;
    for (const pass of [0, 1]) {
      const del = [];
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          if (!sk[y * N + x]) continue;
          const p = [px(x, y - 1), px(x + 1, y - 1), px(x + 1, y), px(x + 1, y + 1), px(x, y + 1), px(x - 1, y + 1), px(x - 1, y), px(x - 1, y - 1)];
          const b = p.reduce((a, v) => a + v, 0);
          if (b < 2 || b > 6) continue;
          let a = 0;
          for (let k = 0; k < 8; k++) if (!p[k] && p[(k + 1) % 8]) a++;
          if (a !== 1) continue;
          if (pass === 0 ? p[0] * p[2] * p[4] || p[2] * p[4] * p[6] : p[0] * p[2] * p[6] || p[0] * p[4] * p[6]) continue;
          del.push(y * N + x);
        }
      if (del.length) changed = true;
      for (const i of del) sk[i] = 0;
    }
  }

  const skel = [];
  for (let i = 0; i < N * N; i++) if (sk[i]) skel.push(i);
  if (!skel.length) return null;

  const ds = skel.map((i) => dist[i]).sort((a, b) => a - b);
  const median = ds[Math.floor(ds.length / 2)];
  const halfWidth = (median * cell) / 3 / dpr; // CSS px
  // thicker parts of the letter (bends, bumps) – the crayon should reach these too
  const wideHalf = (ds[Math.floor(ds.length * 0.9)] * cell) / 3 / dpr;
  const halfCells = median / 3;

  // ---- Separate parts of the letter; small ones (Arabic dots) are taps ---
  const comp = new Int32Array(N * N).fill(-1);
  const comps = [];
  for (let i = 0; i < N * N; i++) {
    if (!inside[i] || comp[i] >= 0) continue;
    const id = comps.length, stack = [i], cells = [];
    comp[i] = id;
    while (stack.length) {
      const c = stack.pop();
      cells.push(c);
      for (const n of neighbours(c, inside)) if (comp[n] < 0) { comp[n] = id; stack.push(n); }
    }
    comps.push(cells);
  }
  const spanOf = (cells) => {
    const xs = cells.map((c) => c % N), ys = cells.map((c) => Math.floor(c / N));
    return { xs, ys, span: Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) };
  };
  const biggestCells = comps.reduce((a, c) => (c.length > a.length ? c : a), []);
  const biggest = biggestCells.length, bigSpan = spanOf(biggestCells).span;
  // small, compact marks next to the main shape: dots, to be tapped last
  let dotParts = comps.filter((cells) => {
    if (cells === biggestCells) return false;
    const { span } = spanOf(cells);
    return cells.length < biggest * 0.4 && span < bigSpan * 0.6;
  });
  for (const cells of dotParts) for (const c of cells) sk[c] = 0; // not part of the stroke graph
  // In some fonts a letter's dots touch (ت, ث, ش, ق): split the biggest blob
  // until there are as many dots as the letter has.
  while (dots && dotParts.length && dotParts.length < dots) {
    const big = dotParts.reduce((a, c) => (c.length > a.length ? c : a));
    const halves = split2(big);
    if (!halves) break;
    dotParts = dotParts.filter((c) => c !== big).concat(halves);
  }
  const taps = dotParts.map((cells) => {
    const { xs, ys } = spanOf(cells);
    const cx = xs.reduce((a, b) => a + b, 0) / xs.length, cy = ys.reduce((a, b) => a + b, 0) / ys.length;
    return { x: (cx + 0.5) * (cell / dpr), y: (cy + 0.5) * (cell / dpr) };
  });

  // ---- Skeleton graph: end points, junctions and the pieces between ------
  const ring = (i) => {
    const x = i % N, y = (i - x) / N;
    return NB.map(([dx, dy]) => px(x + dx, y + dy));
  };
  const nodeOf = new Int32Array(N * N).fill(-1);
  const nodes = []; // { cells, end }
  const isJunction = (i) => {
    const r = ring(i);
    let a = 0;
    for (let k = 0; k < 8; k++) if (!r[k] && r[(k + 1) % 8]) a++;
    return a >= 3;
  };
  for (let i = 0; i < N * N; i++) {
    if (!sk[i] || nodeOf[i] >= 0) continue;
    const n = neighbours(i, sk).length;
    if (n <= 1) {
      nodeOf[i] = nodes.length;
      nodes.push({ cells: [i], end: true });
    } else if (isJunction(i)) {
      // junction pixels that touch form one junction
      const id = nodes.length, stack = [i], cells = [];
      nodeOf[i] = id;
      while (stack.length) {
        const c = stack.pop();
        cells.push(c);
        for (const nb of neighbours(c, sk)) if (nodeOf[nb] < 0 && isJunction(nb)) { nodeOf[nb] = id; stack.push(nb); }
      }
      nodes.push({ cells, end: false });
    }
  }

  const visited = new Uint8Array(N * N);
  const edges = []; // { a, b, cells }
  const is4 = (i, j) => Math.abs(i - j) === 1 || Math.abs(i - j) === N;
  const walk = (start, first, fromNode) => {
    const cells = [start, first];
    visited[first] = 1;
    let cur = first;
    for (;;) {
      const nbs = neighbours(cur, sk);
      const free = nbs.filter((n) => nodeOf[n] < 0 && !visited[n]);
      const next = free.find((n) => is4(cur, n)) ?? free[0];
      if (next !== undefined) {
        visited[next] = 1;
        cells.push(next);
        cur = next;
        continue;
      }
      const stop = nbs.find((n) => nodeOf[n] >= 0 && (nodeOf[n] !== fromNode || cells.length > 3));
      if (stop !== undefined) {
        cells.push(stop);
        return { a: fromNode, b: nodeOf[stop], cells };
      }
      nodeOf[cur] = nodes.length; // dead end: treat as an end point
      nodes.push({ cells: [cur], end: true });
      return { a: fromNode, b: nodeOf[cur], cells };
    }
  };
  nodes.forEach((node, id) => {
    for (const c of node.cells)
      for (const n of neighbours(c, sk)) if (nodeOf[n] < 0 && !visited[n]) edges.push(walk(c, n, id));
  });
  // Closed loops with no junction or end (O, 0): start at the top.
  for (let i = 0; i < N * N; i++) {
    if (!sk[i] || nodeOf[i] >= 0 || visited[i]) continue;
    const id = nodes.length;
    nodeOf[i] = id;
    nodes.push({ cells: [i], end: false });
    for (const n of neighbours(i, sk)) if (nodeOf[n] < 0 && !visited[n]) { edges.push(walk(i, n, id)); break; }
  }

  // ---- Remove short spurs (thinning artefacts at corners) ----------------
  const spur = Math.max(3, halfCells * 1.8);
  for (let round = 0; round < 3; round++) {
    const deg = new Array(nodes.length).fill(0);
    for (const e of edges) if (!e.dead) { deg[e.a]++; deg[e.b]++; }
    let removed = false;
    for (const e of edges) {
      if (e.dead || e.cells.length >= spur) continue;
      const aEnd = deg[e.a] === 1, bEnd = deg[e.b] === 1;
      const tip = aEnd ? e.cells[0] : e.cells.at(-1);
      if (dist[tip] > median * 0.6) continue; // a real stroke end, not a corner artefact
      if ((aEnd && deg[e.b] >= 3) || (bEnd && deg[e.a] >= 3)) {
        e.dead = true;
        // a short branch into a bump or tooth (Faafu's bends) becomes a detour:
        // the guide goes in and back out, so tracing covers it
        if (e.cells.length >= halfCells * 0.7) e.detour = aEnd ? [...e.cells].reverse() : e.cells; // junction → tip
        removed = true;
        deg[e.a]--;
        deg[e.b]--;
      }
    }
    if (!removed) break;
  }
  const live = edges.filter((e) => !e.dead && e.cells.length >= 2);

  // ---- Join pieces that carry straight on through a junction ------------
  const dirAt = (e, end) => {
    const c = end === 0 ? e.cells : [...e.cells].reverse();
    const p0 = toCss(c[0]), p1 = toCss(c[Math.min(c.length - 1, Math.max(3, Math.round(halfCells * 2)))]);
    const dx = p1.x - p0.x, dy = p1.y - p0.y, l = Math.hypot(dx, dy) || 1;
    return { x: dx / l, y: dy / l };
  };
  const atNode = new Map();
  live.forEach((e, k) => {
    for (const end of [0, 1]) {
      const n = end === 0 ? e.a : e.b;
      if (!atNode.has(n)) atNode.set(n, []);
      atNode.get(n).push({ k, end });
    }
  });
  const partner = new Map();
  const key = (r) => `${r.k}:${r.end}`;
  for (const list of atNode.values()) {
    if (list.length === 2) {
      partner.set(key(list[0]), list[1]);
      partner.set(key(list[1]), list[0]);
      continue;
    }
    const pairs = [];
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const u = dirAt(live[list[i].k], list[i].end), v = dirAt(live[list[j].k], list[j].end);
        pairs.push({ i, j, cos: u.x * v.x + u.y * v.y });
      }
    pairs.sort((p, q) => p.cos - q.cos);
    const used = new Set();
    for (const p of pairs) {
      if (p.cos > -0.55 || used.has(p.i) || used.has(p.j)) continue;
      used.add(p.i);
      used.add(p.j);
      partner.set(key(list[p.i]), list[p.j]);
      partner.set(key(list[p.j]), list[p.i]);
    }
  }

  const done = new Set();
  const chains = [];
  const follow = (startRef) => {
    let ref = startRef, cells = [], closed = false;
    for (;;) {
      done.add(ref.k);
      const e = live[ref.k];
      const c = ref.end === 0 ? e.cells : [...e.cells].reverse();
      cells = cells.concat(cells.length ? c.slice(1) : c);
      const next = partner.get(key({ k: ref.k, end: 1 - ref.end }));
      if (!next) break;
      if (done.has(next.k)) { closed = next.k === startRef.k; break; }
      ref = next;
    }
    chains.push({ cells, closed });
  };
  live.forEach((e, k) => {
    for (const end of [0, 1]) if (!done.has(k) && !partner.has(key({ k, end }))) follow({ k, end });
  });
  live.forEach((e, k) => { if (!done.has(k)) follow({ k, end: 0 }); });

  // ---- Smooth, orient and order the strokes ------------------------------
  const smooth = (pts, closed) =>
    pts.map((p, i) => {
      if (!closed && (i < 2 || i > pts.length - 3)) return p;
      let x = 0, y = 0;
      for (let k = -2; k <= 2; k++) {
        const q = pts[(i + k + pts.length) % pts.length];
        x += q.x;
        y += q.y;
      }
      return { x: x / 5, y: y / 5 };
    });
  const lengthOf = (pts) => pts.reduce((l, p, i) => (i ? l + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0), 0);
  const hw = halfWidth;

  let polys = chains.map(({ cells, closed }) => {
    const pts = smooth(cells.map(toCss), closed);
    if (closed && pts.length > 2 && Math.hypot(pts[0].x - pts.at(-1).x, pts[0].y - pts.at(-1).y) < 1e-6) pts.pop();
    return { pts, closed };
  });
  polys = tidy(polys, hw);

  // Splice the bump detours into the stroke that passes their junction.
  for (const e of edges) {
    if (!e.detour) continue;
    const spur = smooth(e.detour.map(toCss), false);
    const J = spur[0];
    let best = null;
    polys.forEach((s, si) =>
      s.pts.forEach((p, k) => {
        const dd = Math.hypot(p.x - J.x, p.y - J.y);
        if (dd < hw * 1.5 && (!best || dd < best.dd)) best = { si, k, dd };
      }),
    );
    if (!best) continue;
    const s = polys[best.si];
    const out = [...spur, ...[...spur].reverse()];
    s.pts = [...s.pts.slice(0, best.k + 1), ...out, ...s.pts.slice(best.k)];
  }
  polys = polys.filter((s, _, all) => lengthOf(s.pts) >= hw * 1.3 || all.length === 1);

  // The centre line stops about half a stroke short of each rounded tip, so
  // stretch open strokes out to the real ends of the letter: a stroke then
  // starts right at the top of the letter, not a little below it.
  const insideAt = (x, y) => {
    const gx = Math.floor((x * dpr) / cell), gy = Math.floor((y * dpr) / cell);
    return gx >= 0 && gy >= 0 && gx < N && gy < N && inside[gy * N + gx] === 1;
  };
  const extend = (pts) => {
    if (pts.length < 3) return pts;
    const a = pts[0], b = pts[Math.min(pts.length - 1, 6)];
    const l = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const dx = (a.x - b.x) / l, dy = (a.y - b.y) / l;
    let t = 0;
    while (t < hw * 2.5 && insideAt(a.x + dx * (t + 1), a.y + dy * (t + 1))) t += 1;
    t -= Math.max(2, hw * 0.3); // stay a little inside the tip
    if (t <= 1) return pts;
    const added = [];
    for (let k = Math.floor(t); k > 0; k -= 2) added.push({ x: a.x + dx * k, y: a.y + dy * k });
    return [...added, ...pts];
  };
  polys = polys.map((s) => (s.closed ? s : { ...s, pts: extend([...extend(s.pts)].reverse()).reverse() }));

  // A start hint in the middle of a stroke (P, R: top of the stem) splits it
  // there into two strokes that both start at the hint.
  if (startNear) {
    const dn = (p) => Math.hypot(p.x - startNear.x, p.y - startNear.y);
    polys = polys.flatMap((s) => {
      if (s.closed || Math.min(dn(s.pts[0]), dn(s.pts.at(-1))) < hw * 4) return [s];
      let k = 0;
      s.pts.forEach((p, i) => { if (dn(p) < dn(s.pts[k])) k = i; });
      if (dn(s.pts[k]) > hw * 3 || k < 3 || k > s.pts.length - 4) return [s];
      return [{ pts: s.pts.slice(k), closed: false }, { pts: s.pts.slice(0, k + 1).reverse(), closed: false }];
    });
  }

  let strokes = polys.map(({ pts, closed }) => {
    // a long stroke whose two ends meet (B) is really a loop
    if (!closed && lengthOf(pts) > hw * 6 && Math.hypot(pts[0].x - pts.at(-1).x, pts[0].y - pts.at(-1).y) < hw * 2.2) closed = true;
    if (closed) {
      // start at the top (or where the letter says), then go anticlockwise (towards the left first)
      let top = 0;
      pts.forEach((p, i) => { if (p.y < pts[top].y - 0.01) top = i; });
      if (startNear) {
        let near = 0;
        const dn = (p) => Math.hypot(p.x - startNear.x, p.y - startNear.y);
        pts.forEach((p, i) => { if (dn(p) < dn(pts[near])) near = i; });
        if (dn(pts[near]) < hw * 4) top = near;
      }
      pts = [...pts.slice(top), ...pts.slice(0, top)];
      const ahead = pts[Math.min(pts.length - 1, 4)];
      if (ahead.x > pts[0].x) pts = [pts[0], ...pts.slice(1).reverse()];
      pts = [...pts, pts[0]];
    } else {
      const a = pts[0], b = pts.at(-1);
      const dy = b.y - a.y, dx = b.x - a.x;
      // start at the top end; flat strokes start on the side the script is written from
      let flip = Math.abs(dy) >= Math.abs(dx) * 0.5 ? dy < 0 : rtl ? dx > 0 : dx < 0;
      // a letter can say where its writing starts (e.g. N from the bottom left)
      if (startNear) {
        const da = Math.hypot(a.x - startNear.x, a.y - startNear.y), db = Math.hypot(b.x - startNear.x, b.y - startNear.y);
        if (Math.min(da, db) < hw * 4) flip = db < da;
      }
      if (flip) pts = [...pts].reverse();
    }
    return { points: pts, closed, length: lengthOf(pts) };
  });

  // Writing order: top to bottom, then from the script's starting side;
  // strokes that start together go towards the starting side first (A: left leg).
  const band = hw * 2.5;
  const along = (s) => s.points[Math.min(s.points.length - 1, Math.round(s.points.length / 4))].x;
  const topOf = (s) => Math.min(...s.points.map((p) => p.y));
  strokes.sort((s, t) => {
    const dy = topOf(s) - topOf(t);
    if (Math.abs(dy) > band) return dy;
    const dx = s.points[0].x - t.points[0].x;
    if (Math.abs(dx) > hw) return rtl ? -dx : dx;
    return rtl ? along(t) - along(s) : along(s) - along(t);
  });
  // dots: top row first; dots side by side in the script's direction (ت: right, then left)
  taps.sort((a, b) => (Math.abs(a.y - b.y) > hw * 0.8 ? a.y - b.y : rtl ? b.x - a.x : a.x - b.x));

  // Hand-drawn guide (letters whose bends the centre line can't see, e.g.
  // Faafu's zigzag): use it instead, keeping the measured widths.
  if (manual) {
    // Hand-placed points can sit a little off the middle of the stroke, so
    // slide each point across the stroke to its centre.
    const penAt = (x, y) => {
      const px = Math.round(x * dpr), py = Math.round(y * dpr);
      return px >= 0 && py >= 0 && px < W && py < W && alpha[(py * W + px) * 4 + 3] > 128;
    };
    const toMiddle = (pts) => {
      const dense = densify(pts, 2);
      const moved = dense.map((p, i) => {
        const a = dense[Math.max(0, i - 3)], b = dense[Math.min(dense.length - 1, i + 3)];
        const tl = Math.hypot(b.x - a.x, b.y - a.y);
        if (!tl || !penAt(p.x, p.y)) return p;
        const nx = -(b.y - a.y) / tl, ny = (b.x - a.x) / tl; // across the stroke
        const reach = (sgn) => {
          let d = 0;
          while (d < hw * 3 && penAt(p.x + sgn * nx * (d + 0.5), p.y + sgn * ny * (d + 0.5))) d += 0.5;
          return d;
        };
        const d1 = reach(1), d2 = reach(-1);
        // only where the stroke is a normal width (not a crossing, blob or bend)
        if (d1 + d2 > hw * 4.4) return p;
        const shift = Math.max(-hw * 1.2, Math.min(hw * 1.2, (d1 - d2) / 2));
        return { x: p.x + nx * shift, y: p.y + ny * shift };
      });
      // a straight stroke (stem, bar) stays straight: move it as a whole
      const A = dense[0], B = dense.at(-1), L = Math.hypot(B.x - A.x, B.y - A.y) || 1;
      const straight = dense.every((p) => Math.abs((B.x - A.x) * (A.y - p.y) - (A.x - p.x) * (B.y - A.y)) / L < 1.5);
      if (straight) {
        const mx = moved.reduce((s, p, i) => s + p.x - dense[i].x, 0) / moved.length;
        const my = moved.reduce((s, p, i) => s + p.y - dense[i].y, 0) / moved.length;
        return dense.map((p) => ({ x: p.x + mx, y: p.y + my }));
      }
      // smooth out small wobbles, keeping the two ends where they are
      return moved.map((p, i) => {
        if (i < 2 || i > moved.length - 3) return p;
        let x = 0, y = 0;
        for (let k = -2; k <= 2; k++) { x += moved[i + k].x; y += moved[i + k].y; }
        return { x: x / 5, y: y / 5 };
      });
    };
    strokes = manual.filter((pts) => pts.length > 1).map((pts) => {
      const p = centre ? toMiddle(chaikin(pts, 2)) : chaikin(pts, 2);
      return { points: p, closed: false, length: lengthOf(p) };
    });
    taps.length = 0;
    for (const pts of manual) if (pts.length === 1) taps.push(pts[0]);
  }

  // Evenly spaced guide dots along each stroke.
  const spacing = Math.max(halfWidth * 0.9, 9);
  strokes = strokes.map((s) => ({ ...s, dots: resample(s.points, spacing) }));
  for (const t of taps) strokes.push({ points: [t], tap: true, closed: false, length: 0, dots: [t] });

  return { halfWidth, wideHalf, strokes };
}

// Points every `step` px along a polyline, each with its direction (angle).
function resample(pts, step) {
  const out = [];
  let acc = 0, next = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (!seg) continue;
    while (next <= acc + seg) {
      const t = (next - acc) / seg;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      next += step;
    }
    acc += seg;
  }
  // direction at each dot, from its neighbours, so arrows follow the curve
  return out.map((d, i) => {
    const p = out[Math.max(0, i - 1)], n = out[Math.min(out.length - 1, i + 1)];
    return { ...d, ang: p === n ? 0 : Math.atan2(n.y - p.y, n.x - p.x) };
  });
}

// ---- Clean-up of the stroke polylines --------------------------------------
// 1. Where a stroke's end touches the middle of another stroke (a T-junction
//    the thinning missed), split that stroke there and re-join the two pieces
//    that carry on most straight (T: the two halves of the bar).
// 2. Join strokes whose ends touch (corners where the centre line has a gap).
function tidy(polys, hw) {
  const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const cum = (pts) => pts.reduce((acc, p, i) => (acc.push(i ? acc[i - 1] + d(p, pts[i - 1]) : 0), acc), []);
  const dirOut = (pts) => {
    // direction leaving pts[0], measured about 1.5 stroke-widths along
    const c = cum(pts);
    let k = c.findIndex((v) => v >= hw * 1.5);
    if (k < 0) k = pts.length - 1;
    const l = d(pts[0], pts[k]) || 1;
    return { x: (pts[k].x - pts[0].x) / l, y: (pts[k].y - pts[0].y) / l };
  };
  const cos = (u, v) => u.x * v.x + u.y * v.y;
  const lengthOf = (pts) => cum(pts).at(-1);
  const handled = []; // junctions already resolved – don't split there again

  for (let guard = 0; guard < 24; guard++) {
    let did = false;
    // 1. T-junctions
    outer: for (let i = 0; i < polys.length; i++) {
      const s = polys[i];
      if (s.closed) continue;
      for (const atEnd of [false, true]) {
        const e = atEnd ? s.pts.at(-1) : s.pts[0];
        if (handled.some((h) => d(h, e) < hw)) continue;
        for (let j = 0; j < polys.length; j++) {
          if (j === i) continue;
          const t = polys[j], c = cum(t.pts), L = c.at(-1);
          let best = -1, bd = hw * 0.9;
          t.pts.forEach((p, k) => {
            if (!t.closed && (c[k] < hw * 1.2 || L - c[k] < hw * 1.2)) return;
            const dd = d(p, e);
            if (dd < bd) { bd = dd; best = k; }
          });
          if (best < 0) continue;
          const J = t.pts[best];
          handled.push(J, e);
          const sOut = [J, ...(atEnd ? [...s.pts].reverse() : s.pts)];
          let next;
          if (t.closed && lengthOf(sOut) < hw * 4) continue; // short tail on a loop (Q): keep it a separate stroke
          if (t.closed) {
            const rot = [...t.pts.slice(best), ...t.pts.slice(0, best), J];
            const loop = cos(dirOut(rot), dirOut(sOut)) < cos(dirOut([...rot].reverse()), dirOut(sOut)) ? rot : [...rot].reverse();
            next = [{ pts: [...sOut].reverse().concat(loop.slice(1)), closed: false }];
          } else {
            const outs = [sOut, [...t.pts.slice(0, best + 1)].reverse(), t.pts.slice(best)];
            const dirs = outs.map(dirOut);
            const pairs = [[0, 1], [0, 2], [1, 2]].sort((p, q) => cos(dirs[p[0]], dirs[p[1]]) - cos(dirs[q[0]], dirs[q[1]]));
            const [u, v] = pairs[0], w = 3 - u - v;
            next = [{ pts: [...outs[u]].reverse().concat(outs[v].slice(1)), closed: false }, { pts: outs[w], closed: false }];
          }
          polys = polys.filter((_, k) => k !== i && k !== j).concat(next);
          did = true;
          break outer;
        }
      }
    }
    if (did) continue;
    // 2. ends that touch
    let bestPair = null, bd = hw * 1.5;
    for (let i = 0; i < polys.length; i++)
      for (let j = i + 1; j < polys.length; j++) {
        const a = polys[i], b = polys[j];
        if (a.closed || b.closed) continue;
        for (const ea of [0, 1])
          for (const eb of [0, 1]) {
            const dd = d(ea ? a.pts.at(-1) : a.pts[0], eb ? b.pts.at(-1) : b.pts[0]);
            if (dd < bd) { bd = dd; bestPair = { i, j, ea, eb }; }
          }
      }
    if (bestPair) {
      const { i, j, ea, eb } = bestPair;
      const a = ea ? polys[i].pts : [...polys[i].pts].reverse(); // ends at the joint
      const b = eb ? [...polys[j].pts].reverse() : polys[j].pts; // starts at the joint
      polys = polys.filter((_, k) => k !== i && k !== j).concat([{ pts: a.concat(b), closed: false }]);
      continue;
    }
    break;
  }
  return polys;
}

// Stroke half-widths (CSS px) of the thick tracing shape, for sizing the crayon:
// `half` is the typical width, `wide` covers the thicker parts (bends, bumps).
// Uses the ridge of the distance-to-edge map (cells at least as far from the
// edge as all their neighbours), which runs along the middle of each stroke.
export function trackWidths(alpha, W, dpr) {
  const cell = W / N;
  const dist = new Float32Array(N * N);
  for (let gy = 0; gy < N; gy++)
    for (let gx = 0; gx < N; gx++) {
      const x = Math.min(W - 1, Math.floor((gx + 0.5) * cell)), y = Math.min(W - 1, Math.floor((gy + 0.5) * cell));
      dist[gy * N + gx] = alpha[(y * W + x) * 4 + 3] > 128 ? 1e9 : 0;
    }
  const at = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? 0 : dist[y * N + x]);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      if (dist[i]) dist[i] = Math.min(dist[i], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4);
    }
  for (let y = N - 1; y >= 0; y--)
    for (let x = N - 1; x >= 0; x--) {
      const i = y * N + x;
      if (dist[i]) dist[i] = Math.min(dist[i], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4);
    }
  const ridge = [];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const v = dist[y * N + x];
      if (v >= 6 && NB.every(([dx, dy]) => at(x + dx, y + dy) <= v)) ridge.push(v);
    }
  if (!ridge.length) return null;
  ridge.sort((a, b) => a - b);
  const px = (v) => (v * cell) / 3 / dpr;
  return { half: px(ridge[Math.floor(ridge.length / 2)]), wide: px(ridge[Math.floor(ridge.length * 0.9)]) };
}

// Round the corners of a hand-drawn path a little (keeps both end points).
function chaikin(pts, rounds) {
  let p = pts;
  for (let r = 0; r < rounds; r++) {
    const q = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      q.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 }, { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    q.push(p.at(-1));
    p = q;
  }
  return p;
}

// Split a blob of grid cells into two halves (2-means, seeded at its two ends).
function split2(cells) {
  if (cells.length < 4) return null;
  const P = cells.map((c) => [c % N, Math.floor(c / N)]);
  const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
  const wide = Math.max(...xs) - Math.min(...xs) >= Math.max(...ys) - Math.min(...ys);
  const key = (p) => (wide ? p[0] : p[1]);
  let a = P.reduce((m, p) => (key(p) < key(m) ? p : m)), b = P.reduce((m, p) => (key(p) > key(m) ? p : m));
  let groups;
  for (let it = 0; it < 10; it++) {
    groups = [[], []];
    P.forEach((p, i) => groups[(p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2 <= (p[0] - b[0]) ** 2 + (p[1] - b[1]) ** 2 ? 0 : 1].push(i));
    if (!groups[0].length || !groups[1].length) return null;
    const mean = (g) => [g.reduce((s, i) => s + P[i][0], 0) / g.length, g.reduce((s, i) => s + P[i][1], 0) / g.length];
    [a, b] = [mean(groups[0]), mean(groups[1])];
  }
  return groups.map((g) => g.map((i) => cells[i]));
}

// Extra points along a polyline so neighbouring points are at most `step` apart.
function densify(pts, step) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
}
