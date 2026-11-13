/* Footprints and footstep particles: whoever walks leaves prints that fade, and each step kicks up a little of the ground it falls on
   (sand, dust off a path, earth off a field, a fleck of green in the grass). Nothing in it changes the game: it watches positions and draws.
   Cheap: only walkers on screen, at most STEPS.max prints, its own random numbers (the game's seeded stream is never touched). */
const STEPS: any = { on: true, prints: [] as any[], last: new Map(), max: 260, seed: 12345, stride: 0.42 };
const stRand = () => { STEPS.seed = (STEPS.seed * 1103515245 + 12345) & 0x7fffffff; return STEPS.seed / 0x7fffffff; };
/** what a surface leaves: print colour and alpha, how long it stays (ms), the particles a step throws (colours, count) */
function stSurface(x: number, y: number): any {
  const t = grid[y] && grid[y][x], room = roomAt[y] && roomAt[y][x] >= 0;
  if (room || t === T.FLOOR || t === T.DECK) return { col: '#3a2a18', a: 0.22, life: 1800, dust: [], n: 0 };
  if (t === T.SAND) return { col: '#6e5028', a: 0.6, life: 5500, dust: ['#c9ab78', '#d8bd8b', '#bb9c66'], n: 3 };
  if (t === T.CROP || t === T.PLOT || t === T.DIRTF) return { col: '#2c1c0c', a: 0.55, life: 4500, dust: ['#8a6239', '#6b4a2b', '#7a5532'], n: 2 };
  if (t === T.PATH) return { col: '#4a3520', a: 0.42, life: 3000, dust: ['#a27b50', '#b08959', '#8f6b44'], n: 2 };
  if (t === T.GRASS) return { col: '#173a0e', a: 0.38, life: 2600, dust: ['#6db03f', '#86c452', '#4e8f2c'], n: 1, leaf: true };
  return null;
}
/** jBurst on our own random numbers, so footsteps never move the game's seeded stream */
function stBurst(...a: any[]) { const R = Math.random; Math.random = stRand; try { (jBurst as any)(...a); } finally { Math.random = R; } }
/** called each frame: a print and a puff for every stride someone on screen has walked */
function stTrack(now: number) {
  const x0 = cam.x / TS - 2, y0 = cam.y / TS - 2, x1 = x0 + cam.cw / cam.z / TS + 4, y1 = y0 + cam.ch / cam.z / TS + 4;
  const walkers = npcs.filter((n: any) => !n.dead && !n.inShip && !n.infant && n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1);
  for (const n of walkers) {
    const L = STEPS.last.get(n.id);
    if (!L || Math.abs(n.x - L.x) > 3 || Math.abs(n.y - L.y) > 3) { STEPS.last.set(n.id, { x: n.x, y: n.y, side: 1 }); continue; }   // (new, or came by stairs)
    const dx = n.x - L.x, dy = n.y - L.y, d = Math.hypot(dx, dy); if (d < STEPS.stride) continue;
    const tx = Math.round(n.x), ty = Math.round(n.y), s = stSurface(tx, ty); L.side = -L.side;
    if (s) {
      const ux = dx / d, uy = dy / d, fx = (n.x + 0.5) * TS - uy * L.side * 2.4, fy = (n.y + 0.86) * TS + ux * L.side * 1.6;
      STEPS.prints.push({ x: fx, y: fy, a: Math.atan2(uy, ux), t0: now, life: s.life, col: s.col, al: s.a * (n.child ? 0.8 : 1), sm: n.child ? 0.75 : 1 });
      if (STEPS.prints.length > STEPS.max) STEPS.prints.splice(0, STEPS.prints.length - STEPS.max);
      const near = n.player || stRand() < 0.5;
      if (near && s.n && typeof jBurst === 'function') stBurst(fx, fy, s.n, s.leaf ? 'leaf' : 'dot', s.dust, s.leaf ? 0.35 : 0.3, s.leaf ? 0.5 : 0.25);
    }
    L.x = n.x; L.y = n.y;
  }
}
/** the prints, on the ground under everybody (before the depth-sorted pass) */
function drawSteps(c: any, now: number) {
  if (!STEPS.on || !town || cam.z < 0.7) return;
  if (!(typeof itBuildOn === 'function' && game.player && itBuildOn(game.player))) stTrack(now);
  const ps = STEPS.prints; if (!ps.length) return;
  c.save();
  for (let i = ps.length - 1; i >= 0; i--) {
    const q = ps[i], k = (now - q.t0) / q.life; if (k >= 1) { ps.splice(i, 1); continue; }
    c.globalAlpha = q.al * (1 - k * k); c.fillStyle = q.col;
    c.save(); c.translate(q.x, q.y); c.rotate(q.a);
    c.beginPath(); c.ellipse(0.6, 0, 1.9 * q.sm, 1.15 * q.sm, 0, 0, 6.3); c.fill();                     // the sole
    c.beginPath(); c.ellipse(-1.9 * q.sm, 0, 0.95 * q.sm, 0.9 * q.sm, 0, 0, 6.3); c.fill();             // the heel
    c.restore();
  }
  c.restore();
}
