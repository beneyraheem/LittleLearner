// Works out a tracing guide from a letter's pixel mask:
//  - the letter's centre line (skeleton), turned into evenly spaced guide dots
//  - the letter's stroke width, so the crayon can match it
// Runs on a small grid so it is fast enough to do for every letter.

const N = 160; // grid resolution

export function letterGuide(alpha, W, dpr) {
  const cell = W / N;
  const inside = new Uint8Array(N * N);
  for (let gy = 0; gy < N; gy++) {
    for (let gx = 0; gx < N; gx++) {
      const x = Math.min(W - 1, Math.floor((gx + 0.5) * cell));
      const y = Math.min(W - 1, Math.floor((gy + 0.5) * cell));
      inside[gy * N + gx] = alpha[(y * W + x) * 4 + 3] > 128 ? 1 : 0;
    }
  }

  // Chamfer distance to the edge (3-4 weights, in units of 1/3 cell).
  const BIG = 1e9;
  const dist = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) dist[i] = inside[i] ? BIG : 0;
  const at = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? 0 : dist[y * N + x]);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      if (!dist[i]) continue;
      dist[i] = Math.min(dist[i], at(x - 1, y) + 3, at(x, y - 1) + 3, at(x - 1, y - 1) + 4, at(x + 1, y - 1) + 4);
    }
  for (let y = N - 1; y >= 0; y--)
    for (let x = N - 1; x >= 0; x--) {
      const i = y * N + x;
      if (!dist[i]) continue;
      dist[i] = Math.min(dist[i], at(x + 1, y) + 3, at(x, y + 1) + 3, at(x + 1, y + 1) + 4, at(x - 1, y + 1) + 4);
    }

  // Zhang–Suen thinning → one-cell-wide centre line.
  const sk = inside.slice();
  const px = (x, y) => (x < 0 || y < 0 || x >= N || y >= N ? 0 : sk[y * N + x]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const pass of [0, 1]) {
      const del = [];
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          if (!sk[y * N + x]) continue;
          const p = [px(x, y - 1), px(x + 1, y - 1), px(x + 1, y), px(x + 1, y + 1),
                     px(x, y + 1), px(x - 1, y + 1), px(x - 1, y), px(x - 1, y - 1)];
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

  // Stroke half-width = typical distance-to-edge along the centre line.
  const ds = skel.map((i) => dist[i]).sort((a, b) => a - b);
  const median = ds[Math.floor(ds.length / 2)];
  const toCss = cell / 3 / dpr; // chamfer units → CSS px
  const halfWidth = median * toCss;

  // Guide dots: centre-line points (skipping tiny corner spurs), evenly spaced.
  const spacing = Math.max(halfWidth * 0.9, 9);
  const dots = [];
  for (const i of skel) {
    if (dist[i] < median * 0.6) continue;
    const x = ((i % N) + 0.5) * (cell / dpr);
    const y = (Math.floor(i / N) + 0.5) * (cell / dpr);
    if (dots.every((d) => (d.x - x) ** 2 + (d.y - y) ** 2 >= spacing * spacing)) dots.push({ x, y });
  }
  return { halfWidth, dots };
}
