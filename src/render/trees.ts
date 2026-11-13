/* Living trees: every tree on screen sways in a travelling wind and leans away from whoever walks past, then springs back, shedding a leaf
   now and then. Close up the trees are left out of the baked ground (gaPaintRect skips them when the chunk is a close one) and drawn here,
   in depth order with people (a YSORT provider), skewed about the foot of the trunk so the trunk stays put and the crown moves.
   Zoomed out (the coarsest chunks) they stay baked and still. Nothing in it changes the game; its random numbers are its own. */
const TREES: any = { on: true, spring: new Map(), last: 0, seed: 777 };
const trRand = () => { TREES.seed = (TREES.seed * 1103515245 + 12345) & 0x7fffffff; return TREES.seed / 0x7fffffff; };
/** are trees drawn live now (the same test drawGround uses to pick the close chunks) */
function treesLive() { return TREES.on && cam.z * cam.dpr * TS >= 18; }
YSORT.push(function (c: any, now: number) {
  if (!town || !treesLive()) return [];
  const v = gaView(), t = now / 1000, dt = Math.min(0.05, Math.max(0, (now - (TREES.last || now)) / 1000)); TREES.last = now;
  const gust = 0.55 + 0.45 * Math.sin(t * 0.31) * Math.sin(t * 0.11 + 1.3);
  const busy = new Set<number>(); for (const w of workTargets()) if (w.kind === 'tree') busy.add(w.y * W + w.x);   // (a tree being felled shudders in drawWorkFx)
  const walkers = npcs.filter((n: any) => !n.dead && !n.inShip && n.x >= v.x0 - 2 && n.x <= v.x1 + 2 && n.y >= v.y0 - 2 && n.y <= v.y1 + 2);
  const items: any[] = [], seen = new Set<number>();
  for (let y = v.y0; y < Math.min(H, v.y1 + 2); y++) {
    const row = grid[y];
    for (let x = v.x0; x < v.x1; x++) {
      if (row[x] !== T.TREE || roomAt[y][x] >= 0) continue; const key = y * W + x; if (busy.has(key)) continue;
      // a push from anybody close by: away from them, harder the closer
      let push = 0; for (const n of walkers) { const dx = x - n.x, dy = y - n.y; if (Math.abs(dx) > 1.6 || dy < -1.2 || dy > 0.9) continue; const d = Math.hypot(dx, dy * 1.4); if (d < 1.6) push += Math.sign(dx || (n.face || 1) * -0.01) * (1 - d / 1.6) * (n.moving || n.player ? 0.16 : 0.05); }
      let sp = TREES.spring.get(key);
      if (push || sp) {   // (a spring per tree that has been touched: it overshoots a little and settles)
        if (!sp) { sp = { p: 0, v: 0 }; TREES.spring.set(key, sp); }
        sp.v += ((push - sp.p) * 60 - sp.v * 7) * dt; sp.p += sp.v * dt; seen.add(key);
        if (Math.abs(push) > 0.06 && Math.abs(sp.v) > 0.5 && trRand() < 0.06 && typeof jBurst === 'function') { const R = Math.random; Math.random = trRand; try { jBurst((x + 0.5) * TS, (y + 0.2) * TS, 1, 'leaf', ['#4e8f2c', '#3f7a3a', '#6aa646'], 0.35, 0.2); } finally { Math.random = R; } }
        if (!push && Math.abs(sp.p) < 0.002 && Math.abs(sp.v) < 0.01) TREES.spring.delete(key);
      }
      const wind = Math.sin(t * 1.15 + x * 0.55 + y * 0.35) * 0.028 * gust + Math.sin(t * 2.7 + x * 1.3) * 0.008 + 0.012 * gust;
      const sk = wind + (sp ? sp.p : 0);
      items.push({ k: y - 0.02, f: () => {
        const id = gaSpriteId(x, y, T.TREE), it = id && ART.BYID[id]; if (!it) return;
        const bx = x * TS + it.gw / 2, by = y * TS + TS;
        c.save(); c.translate(bx, by); c.transform(1, 0, -sk, 1 - Math.abs(sk) * 0.15, 0, 0);
        c.drawImage(ART.frameOf(it, 0), -it.gw / 2, -it.gh, it.gw, it.gh); c.restore();
      } });
    }
  }
  for (const k of TREES.spring.keys()) if (!seen.has(k)) TREES.spring.delete(k);   // (off screen: forget it)
  return items;
});
