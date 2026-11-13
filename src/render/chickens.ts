/* Chickens: the island's only animals (the deer, rabbits, foxes and owls are gone). A dozen of them live on the island for good (`town.chickens`,
   saved with it): they peck about on open ground, scatter away from you when you come close, and that is how you herd them. Chased, a chicken
   squeezes through a gate; left alone it treats a gate like a fence, so one that ends up inside a closed yard stays there (`c.yard`), and the
   yard's sign counts its hens. Everything here runs on its own random numbers, so the game's seeded stream never moves. */
const HENS: any = { seed: 4242, last: 0, n: 12 };
const henRand = () => { HENS.seed = (HENS.seed * 1103515245 + 12345) & 0x7fffffff; return HENS.seed / 0x7fffffff; };
/** may a chicken stand here: open ground, nothing built on it; a gate only when it is being chased */
function henFree(x: number, y: number, chased: boolean): boolean {
  if (x < 2 || y < 2 || x >= W - 2 || y >= (town.h0 || H) - 2) return false;
  const t = grid[y][x]; if (t !== T.GRASS && t !== T.PATH && t !== T.SAND && t !== T.CROP) return false;
  if (roomAt[y][x] >= 0) return false;
  const pr = town.propAt && town.propAt.get(y * W + x); if (pr) return pr.kind === 'gate' && chased;
  return true;
}
/** a dozen hens about the island, scattered over open ground away from the camp (once per island; old saves get theirs on load) */
function henSpawn() {
  if (!town || town.chickens) return; town.chickens = []; HENS.seed = (Number(String(town.seed).split('').reduce((a: number, ch: string) => a * 31 + ch.charCodeAt(0), 7)) & 0x7fffffff) || 4242;
  for (let tries = 0; tries < 2000 && town.chickens.length < HENS.n; tries++) {
    const a = henRand() * 6.283, d = 7 + henRand() * 22, x = Math.round(town.cx + Math.cos(a) * d), y = Math.round(town.cy + Math.sin(a) * d);
    if (!henFree(x, y, false) || (typeof yardAtXY === 'function' && yardAtXY(x, y))) continue;
    town.chickens.push({ id: town.chickens.length + 1, x, y, tx: x, ty: y, face: henRand() < 0.5 ? -1 : 1, peck: 0, chased: 0, yard: null });
  }
}
/** one step for every hen (called each frame with the wild): peck and potter, or run from you */
function henStep(now: number) {
  const P = game.player; if (!town || !P) return; henSpawn();
  const dt = Math.min(0.1, Math.max(0, (now - (HENS.last || now)) / 1000)); HENS.last = now; if (!dt) return;
  const frozen = typeof itBuildOn === 'function' && itBuildOn(P);   // (build mode: time stands still for hens too)
  if (frozen) return;
  for (const c of town.chickens) {
    const dp = Math.hypot(c.x - P.x, c.y - P.y);
    if (dp < 2.6) {   // too close: run, away from you, a little to one side or the other
      if (!c.chased && typeof sndTone === 'function' && typeof sndReady === 'function' && sndReady() && dp < 2) { sndTone(900 + henRand() * 300, 0.07, 'square', 0.03, 1300); sndTone(700, 0.09, 'square', 0.025, 500, 0.08); }   // (a squawk)
      const ang = Math.atan2(c.y - P.y, c.x - P.x) + (henRand() - 0.5) * 0.9; c.tx = c.x + Math.cos(ang) * 3; c.ty = c.y + Math.sin(ang) * 3; c.chased = 1.2;
    } else if (c.chased > 0) c.chased -= dt;
    else if (Math.hypot(c.tx - c.x, c.ty - c.y) < 0.15) { if (henRand() < 0.4 * dt) { c.peck = 0.6; } else if (henRand() < 0.5 * dt) { c.tx = c.x + (henRand() - 0.5) * 3; c.ty = c.y + (henRand() - 0.5) * 3; } }
    if (c.peck > 0) { c.peck -= dt; continue; }
    const chased = c.chased > 0, sp = (chased ? 3.2 : 0.7) * dt, dx = c.tx - c.x, dy = c.ty - c.y, dd = Math.hypot(dx, dy);
    if (dd < 0.03) continue;
    const k = Math.min(1, sp / dd), nx = c.x + dx * k, ny = c.y + dy * k, rx = Math.round(nx), ry = Math.round(ny);
    if ((rx === Math.round(c.x) && ry === Math.round(c.y)) || henFree(rx, ry, chased)) { c.x = nx; c.y = ny; if (Math.abs(dx) > 0.02) c.face = dx < 0 ? -1 : 1; }
    else { // blocked: try sliding along one axis, else give up on that way
      if (henFree(rx, Math.round(c.y), chased)) { c.x = nx; c.face = dx < 0 ? -1 : 1; } else if (henFree(Math.round(c.x), ry, chased)) c.y = ny; else { c.tx = c.x; c.ty = c.y; } }
    const y2 = typeof yardAtXY === 'function' ? yardAtXY(Math.round(c.x), Math.round(c.y)) : null, was = c.yard;
    c.yard = y2 && y2.open == null ? y2.id : null;
    if (c.yard && c.yard !== was && typeof jBurst === 'function') { const R = Math.random; Math.random = henRand; try { jBurst((c.x + 0.5) * TS, (c.y + 0.5) * TS, 8, 'spark', ['#fff4b0', '#ffe08a'], 0.6, 0.6); } finally { Math.random = R; } if (typeof jsDing === 'function') jsDing(); }   // (a hen comes home)
  }
}
/** how many hens a yard holds now */
const henCount = (y: any) => (town.chickens || []).filter((c: any) => c.yard === y.id).length;
/* drawn with the people, in depth order */
YSORT.push(function (c: any, now: number) {
  if (!town || !town.chickens || cam.z < 0.55) return []; henStep(now);
  const v = gaView(), out: any[] = [];
  for (const h of town.chickens) {
    if (h.x < v.x0 - 1 || h.x > v.x1 + 1 || h.y < v.y0 - 1 || h.y > v.y1 + 1) continue; if (typeof canSee === 'function' && !canSee(Math.round(h.x), Math.round(h.y))) continue;
    out.push({ k: h.y + 0.1, f: () => drawHen(c, h, now) });
  }
  return out;
});
function drawHen(c: any, h: any, now: number) {
  const X = h.x * TS + TS / 2, Y = h.y * TS + TS * 0.78, run = h.chased > 0, t = now / 1000 + h.id * 0.7, bob = run ? Math.abs(Math.sin(t * 18)) * 1.2 : 0, pk = h.peck > 0 ? Math.sin(h.peck * 12) * 0.5 + 0.5 : 0;
  c.save(); c.translate(X, Y); c.scale(h.face < 0 ? -1 : 1, 1);
  c.fillStyle = 'rgba(30,30,60,.22)'; c.beginPath(); c.ellipse(0, 0.6, 4.6, 1.5, 0, 0, 6.3); c.fill();
  c.strokeStyle = '#d98a2b'; c.lineWidth = 0.8; c.lineCap = 'round'; const st = run ? Math.sin(t * 18) * 1.4 : 0;   // (legs)
  c.beginPath(); c.moveTo(-1, -2.4); c.lineTo(-1 - st, 0); c.moveTo(1.2, -2.4); c.lineTo(1.2 + st, 0); c.stroke();
  c.translate(0, -bob);
  c.fillStyle = '#efe9dc'; c.strokeStyle = '#6e604f'; c.lineWidth = 0.7;
  c.beginPath(); c.moveTo(-5.2, -6.2); c.lineTo(-3.6, -4.2); c.lineTo(-5.4, -4.4); c.closePath(); c.fill(); c.stroke();   // (tail)
  c.beginPath(); c.ellipse(-0.4, -4.2, 4.4, 3.2, 0, 0, 6.3); c.fill(); c.stroke();   // (body)
  c.fillStyle = '#e2d9c6'; c.beginPath(); c.ellipse(-1, -4, 2.4, 1.6, -0.3, 0, 6.3); c.fill();   // (wing)
  const hx = 3.2, hy = -7.2 + pk * 3.4;
  c.fillStyle = '#efe9dc'; c.beginPath(); c.arc(hx, hy, 2.1, 0, 6.3); c.fill(); c.stroke();   // (head)
  c.fillStyle = '#d8443a'; c.beginPath(); c.arc(hx - 0.6, hy - 2.1, 0.8, 0, 6.3); c.arc(hx + 0.5, hy - 2.2, 0.7, 0, 6.3); c.fill();   // (comb)
  c.beginPath(); c.ellipse(hx + 1.2, hy + 1.5, 0.5, 0.8, 0, 0, 6.3); c.fill();   // (wattle)
  c.fillStyle = '#f2b632'; c.beginPath(); c.moveTo(hx + 1.8, hy - 0.4); c.lineTo(hx + 3.4, hy + 0.2); c.lineTo(hx + 1.8, hy + 0.7); c.closePath(); c.fill();   // (beak)
  c.fillStyle = '#1b1410'; c.beginPath(); c.arc(hx + 0.7, hy - 0.4, 0.45, 0, 6.3); c.fill();
  c.restore();
}
