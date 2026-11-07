/* ================= Simulation: pathfinding, schedules, movement ================= */
class Heap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(v, p) {
    const k = this.k, vs = this.v; let i = k.length; k.push(p); vs.push(v);
    while (i > 0) { const q = (i - 1) >> 1; if (k[q] <= p) break; k[i] = k[q]; vs[i] = vs[q]; i = q; }
    k[i] = p; vs[i] = v;
  }
  pop() {
    const k = this.k, vs = this.v, top = vs[0], lp = k.pop(), lv = vs.pop(), n = k.length;
    if (n) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1; if (c >= n) break;
        if (c + 1 < n && k[c + 1] < k[c]) c++;
        if (k[c] >= lp) break;
        k[i] = k[c]; vs[i] = vs[c]; i = c;
      }
      k[i] = lp; vs[i] = lv;
    }
    return top;
  }
}
function findPath(sx, sy, gx, gy, avoid) {
  if (!walkable(gx, gy) || !walkable(sx, sy)) return null;
  if (sx === gx && sy === gy) return [];
  const N = W * H, g = new Float32Array(N).fill(1e9), par = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const s = sy * W + sx, e = gy * W + gx, heap = new Heap();
  g[s] = 0; heap.push(s, 0);
  while (heap.size) {
    const cur = heap.pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (cur === e) break;
    const cx = cur % W, cy = (cur / W) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (!walkable(nx, ny)) continue;
      const ni = ny * W + nx;
      if (closed[ni]) continue;
      if (avoid && ni !== e && avoid.has(ni)) continue;
      const ng = g[cur] + tileCost(nx, ny);
      if (ng < g[ni]) { g[ni] = ng; par[ni] = cur; heap.push(ni, ng + Math.abs(nx - gx) + Math.abs(ny - gy)); }
    }
  }
  if (par[e] < 0) return null;
  const path = [];
  for (let c = e; c !== s; c = par[c]) path.push({ x: c % W, y: (c / W) | 0 });
  return path.reverse();
}

