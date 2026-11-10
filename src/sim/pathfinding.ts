/* ================= Simulation: pathfinding, schedules, movement ================= */
class Heap {
  constructor() { (this as any).k = []; (this as any).v = []; }
  get size() { return (this as any).k.length; }
  push(v, p) {
    const k = (this as any).k, vs = (this as any).v; let i = k.length; k.push(p); vs.push(v);
    while (i > 0) { const q = (i - 1) >> 1; if (k[q] <= p) break; k[i] = k[q]; vs[i] = vs[q]; i = q; }
    k[i] = p; vs[i] = v;
  }
  pop() {
    const k = (this as any).k, vs = (this as any).v, top = vs[0], lp = k.pop(), lv = vs.pop(), n = k.length;
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
const FP: any = { g: null, par: null, cl: null, sn: null, st: 0 };
function findPath(sx, sy, gx, gy, avoid?) {
  if (!walkable(gx, gy) || !walkable(sx, sy)) return null;
  if (sx === gx && sy === gy) return [];
  const N = W * H; if (!FP.g || FP.g.length !== N) { FP.g = new Float32Array(N); FP.par = new Int32Array(N); FP.cl = new Int32Array(N); FP.sn = new Int32Array(N); FP.st = 0; }   // (the buffers are reused: a stamp says which entries belong to this search, so a big map costs nothing per call)
  const stamp = ++FP.st, g = FP.g, par = FP.par, cl = FP.cl, sn = FP.sn, G = (i: number) => sn[i] === stamp ? g[i] : 1e9, setG = (i: number, v: number, p: number) => { sn[i] = stamp; g[i] = v; par[i] = p; };
  const s = sy * W + sx, e = gy * W + gx, heap = new Heap(), pt = town && town.portals && town.portals.size ? town.portals : null, h0 = (town && town.h0) || 1e9, gUp = gy >= h0;
  const gL = h0 < 1e9 ? Math.floor(gy / h0) : 0, hops: number[][] = [];   // (on another level the way is by a staircase: the guess is the walk to a landing, the climb and the walk on)
  if (pt) for (const [a, b] of pt) { const ay = (a / W) | 0, by = (b / W) | 0; if (Math.floor(by / h0) === gL && Math.floor(ay / h0) !== gL) hops.push([a % W, ay, b % W, by, Math.floor(ay / h0)]); }
  const hh = (x, y) => { if (!pt || Math.floor(y / h0) === gL) return Math.abs(x - gx) + Math.abs(y - gy); const l = Math.floor(y / h0); let best = 0, any = false; for (const hp of hops) if (hp[4] === l) { const v = Math.abs(x - hp[0]) + Math.abs(y - hp[1]) + 3 + Math.abs(hp[2] - gx) + Math.abs(hp[3] - gy); if (!any || v < best) { best = v; any = true; } } return any ? best : 0; };
  setG(s, 0, -1); heap.push(s, 0);
  while (heap.size) {
    const cur = heap.pop();
    if (cl[cur] === stamp) continue;
    cl[cur] = stamp;
    if (cur === e) break;
    const cx = cur % W, cy = (cur / W) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (!walkable(nx, ny)) continue;
      const ni = ny * W + nx;
      if (cl[ni] === stamp) continue;
      if (avoid && ni !== e && avoid.has(ni)) continue;
      const ng = G(cur) + tileCost(nx, ny);
      if (ng < G(ni)) { setG(ni, ng, cur); heap.push(ni, ng + hh(nx, ny)); }
    }
    const po = pt && pt.get(cur);   // a staircase: from one landing to the other
    if (po !== undefined && cl[po] !== stamp && !(avoid && po !== e && avoid.has(po))) { const ng = G(cur) + 3; if (ng < G(po)) { setG(po, ng, cur); heap.push(po, ng + hh(po % W, (po / W) | 0)); } }
  }
  if (sn[e] !== stamp) return null;
  const path = [];
  for (let c = e; c !== s; c = par[c]) path.push({ x: c % W, y: (c / W) | 0 });
  return path.reverse();
}

