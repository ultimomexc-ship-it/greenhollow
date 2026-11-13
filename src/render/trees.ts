/* Living trees: every tree on screen sways in a travelling wind and leans away from whoever walks past, then springs back, shedding a leaf
   now and then. Close up the trees are left out of the baked ground (gaPaintRect skips them when the chunk is a close one) and drawn here,
   in depth order with people (a YSORT provider), skewed about the foot of the trunk so the trunk stays put and the crown moves.
   Zoomed out (the coarsest chunks) they stay baked and still. Nothing in it changes the game; its random numbers are its own. */
const TREES: any = { on: true, wind: 1, push: 1, spring: new Map(), last: 0, seed: 777 };
const trRand = () => { TREES.seed = (TREES.seed * 1103515245 + 12345) & 0x7fffffff; return TREES.seed / 0x7fffffff; };
/** are trees drawn live now (the same test drawGround uses to pick the close chunks) */
function treesLive() { return TREES.on && cam.z * cam.dpr * TS >= 18; }
/** this frame's wind and walkers, worked out once and shared by the trees and the bushes */
function swayFrame(now: number) {
  const F = TREES.f || (TREES.f = {}); if (F.now === now) return F;
  const v = gaView(), t = now / 1000; F.dt = Math.min(0.05, Math.max(0, (now - (F.now || now)) / 1000)); F.now = now; F.t = t;
  if (!(F.n = (F.n || 0) + 1) || F.n % 120 === 0) for (const [k, sp] of TREES.spring) if (now - (sp.now || 0) > 2000) TREES.spring.delete(k);   // (springs gone off screen)
  F.gust = 0.55 + 0.45 * Math.sin(t * 0.31) * Math.sin(t * 0.11 + 1.3);
  F.walkers = npcs.filter((n: any) => !n.dead && !n.inShip && n.x >= v.x0 - 2 && n.x <= v.x1 + 2 && n.y >= v.y0 - 2 && n.y <= v.y1 + 2);
  return F;
}
/** the skew of a swaying thing at (x, y): the wind, plus a spring that leans it away from anybody close by (amp: how much it gives) */
function swaySk(key: number, x: number, y: number, now: number, amp: number, reach = 1.6) {
  const F = swayFrame(now), t = F.t, dt = F.dt;
  let push = 0; for (const n of F.walkers) { const dx = x - n.x, dy = y - n.y; if (Math.abs(dx) > reach || dy < -1.2 || dy > 0.9) continue; const d = Math.hypot(dx, dy * 1.4); if (d < reach) push += Math.sign(dx || (n.face || 1) * -0.01) * (1 - d / reach) * (n.moving || n.player ? 0.38 : 0.1) * TREES.push * amp; }
  let sp = TREES.spring.get(key);
  if (push || sp) {   // (a spring per thing that has been touched: it overshoots a little and settles)
    if (!sp) { sp = { p: 0, v: 0 }; TREES.spring.set(key, sp); }
    if (sp.now !== now) { sp.now = now; sp.v += ((push - sp.p) * 60 - sp.v * 7) * dt; sp.p += sp.v * dt; }
    if (!push && Math.abs(sp.p) < 0.002 && Math.abs(sp.v) < 0.01) { TREES.spring.delete(key); sp = null; }
  }
  const wind = (Math.sin(t * 1.15 + x * 0.55 + y * 0.35) * 0.085 * F.gust + Math.sin(t * 2.7 + x * 1.3) * 0.025 + 0.035 * F.gust) * TREES.wind * amp;
  return { sk: wind + (sp ? sp.p : 0), push, v: sp ? sp.v : 0 };
}
YSORT.push(function (c: any, now: number) {
  if (!town || !treesLive()) return [];
  const v = gaView(); swayFrame(now);
  const chop = new Map<number, any>(); for (const w of workTargets()) if (w.kind === 'tree') chop.set(w.y * W + w.x, w);
  const items: any[] = [];
  for (let y = v.y0; y < Math.min(H, v.y1 + 2); y++) {
    const row = grid[y];
    for (let x = v.x0; x < v.x1; x++) {
      if (row[x] !== T.TREE || roomAt[y][x] >= 0) continue; const key = y * W + x, w = chop.get(key);
      const S = swaySk(key, x, y, now, 1);
      if (Math.abs(S.push) > 0.1 && Math.abs(S.v) > 0.5 && trRand() < 0.1 && typeof jBurst === 'function') { const R = Math.random; Math.random = trRand; try { jBurst((x + 0.5) * TS, (y + 0.2) * TS, 1, 'leaf', ['#4e8f2c', '#3f7a3a', '#6aa646'], 0.35, 0.2); } finally { Math.random = R; } }
      let sk = S.sk;
      if (w) {   // being felled: the crown shudders with each blow and leans away from the axe as the cut deepens
        const f = w.f, side = w.n.tx < x ? -1 : w.n.tx > x ? 1 : -1, swing = Math.max(0, Math.sin(now / 95));
        sk += swing * (0.5 + f) * (Math.sin(now / 37) > 0 ? 1 : -1) * 0.07 + (f > 0.65 ? (f - 0.65) * 0.45 * -side : 0);
      }
      items.push({ k: y - 0.02, f: () => {
        const id = gaSpriteId(x, y, T.TREE), it = id && ART.BYID[id]; if (!it) return;
        const bx = x * TS + it.gw / 2, by = y * TS + TS;
        c.save(); c.translate(bx, by); c.transform(1, 0, -sk, 1 - Math.abs(sk) * 0.2, 0, 0);
        c.drawImage(ART.frameOf(it, 0), -it.gw / 2, -it.gh, it.gw, it.gh); c.restore();
        if (w) chopMarks(c, w, now);
      } });
    }
  }
  return items;
});
/** a bush (berry or herb) drawn swaying about its foot */
function drawBushSway(c: any, id: string, x: number, y: number, now: number, seed: number) {
  const sk = swaySk(-1 - (y * W + x), x, y, now, 0.8, 1.3).sk;
  c.save(); c.translate(x * TS + TS / 2, y * TS + TS - 2); c.transform(1, 0, -sk, 1 - Math.abs(sk) * 0.15, 0, 0); c.translate(-(x * TS + TS / 2), -(y * TS + TS - 2));
  gaDraw(c, id, x * TS, y * TS, now, seed); c.restore();
}
