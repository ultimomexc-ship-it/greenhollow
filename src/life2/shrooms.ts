/* Magic mushrooms. They grow scattered about the island, mostly at the edge of the trees, and one more springs up now and then.
   Walk into one and you eat it: for a few hours everything waves, melts and glows (`psyPost`, drawn over the finished frame). */

const SH_TRIP = 210;   // game minutes of a trip (a few hours)
const SH_CAP = 90;     // how many may stand on the island at once
const shroomAt = (x: number, y: number) => (town.shrooms || []).find(s => s.x === x && s.y === y);
function shroomSpot(R: () => number, nearTree: boolean) {
  for (let t = 0; t < 400; t++) {
    const x = 4 + Math.floor(R() * (W - 8)), y = 4 + Math.floor(R() * (GH() - 8));
    if (grid[y][x] !== T.GRASS || roomAt[y][x] >= 0 || (town.siteAt && town.siteAt[y * W + x]) || (town.nodeMap && town.nodeMap.has(y * W + x)) || lfPropAt(x, y) || shroomAt(x, y) || (typeof reach !== 'undefined' && reach && !reach[y * W + x])) continue;
    if (Math.hypot(x - town.cx, y - town.cy) < 6) continue;
    if (nearTree) { let tr = false; for (let dy = -2; dy <= 2 && !tr; dy++) for (let dx = -2; dx <= 2; dx++) if (grid[y + dy] && grid[y + dy][x + dx] === T.TREE) { tr = true; break; } if (!tr) continue; }
    if ((town.shrooms || []).some(s => Math.abs(s.x - x) + Math.abs(s.y - y) < 3)) continue;
    return { x, y };
  }
  return null;
}
/** scatter the first mushrooms when an island is made (the same ones for the same seed) */
function shroomScatter() {
  town.shrooms = []; const R = rng(town.seed + 777);
  for (let i = 0; i < 40; i++) { const p = shroomSpot(R, R() < 0.8); if (p) town.shrooms.push(p); }
}
/** once a day a new one may appear, usually near an old one or under the trees */
function shroomGrow() {
  town.shrooms = (town.shrooms || []).filter(s => grid[s.y][s.x] === T.GRASS && roomAt[s.y][s.x] < 0 && !lfPropAt(s.x, s.y));   // (built over: gone)
  if (town.shrooms.length >= SH_CAP || Math.random() > 0.5) return;
  const R = Math.random, old = town.shrooms.length ? town.shrooms[Math.floor(R() * town.shrooms.length)] : null; let p = null;
  if (old && R() < 0.6) for (let t = 0; t < 30 && !p; t++) { const x = old.x + Math.round((R() - 0.5) * 8), y = old.y + Math.round((R() - 0.5) * 8); if (x > 3 && y > 3 && x < W - 4 && y < H - 4 && grid[y][x] === T.GRASS && roomAt[y][x] < 0 && !lfPropAt(x, y) && !shroomAt(x, y) && !(town.nodeMap && town.nodeMap.has(y * W + x))) p = { x, y }; }
  if (!p) p = shroomSpot(R, true); if (p) town.shrooms.push(p);
}
LF2.hourly.push(h => { if (h === 4) shroomGrow(); });
/** walk into one: eat it */
function eatShroom(n: any, s: any) {
  sndMagic();
  town.shrooms = town.shrooms.filter(q => q !== s);
  const tr = game.trip && game.time < game.trip.until ? game.trip : null;
  if (tr) { tr.until += SH_TRIP * 0.6; tr.dose = (tr.dose || 1) + 1; playerSay(n, 'Another one. The colours get louder.'); }
  else { game.trip = { t0: game.time, until: game.time + SH_TRIP, dose: 1, next: game.time + 6 }; playerSay(n, 'You eat it. It tastes of purple.'); }
}
const SH_THOUGHTS = ['The grass is breathing.', 'Everything is connected. Everything.', 'My hands are so far away.', 'The trees are talking, but quietly.', 'I can hear the colours.', 'Was the sky always this loud?', 'I am the island. The island is me.',
  'Why is the ground waving at me?', 'Everyone is made of light.', 'Time is melting. Nice.', 'The wind has a face.', 'Somebody is humming in the soil.', 'I should write this down. With what? With a sound.'];
const SH_NPC = ['Are you all right? You look... glowing.', 'Why are you staring at the tree?', 'You have been eating the funny mushrooms again.', 'Sit down before you fall into the sea.', 'Your eyes are the size of plates.'];
/** 0 = sober, 1 = right in the middle of it (it rises over the first minutes and fades over the last) */
function psyLevel(): number {
  const t = game.trip; if (!t || game.time >= t.until) return 0;
  const up = Math.min(1, (game.time - t.t0) / 25), down = Math.min(1, (t.until - game.time) / 50);
  return Math.max(0, Math.min(1, up * down)) * Math.min(1.35, 0.85 + 0.15 * (t.dose || 1));
}
LF2.tickers.push(() => {
  const t = game.trip, pl = game.player; if (!t || !pl || !pl.player) return;
  if (game.time >= t.until) { if (!t.done) { t.done = true; playerSay(pl, 'The world settles. It is a bit grey, now.'); } return; }
  if (game.time >= (t.next || 0)) {
    t.next = game.time + 10 + Math.random() * 16; playerSay(pl, anyOf(SH_THOUGHTS));
    const near = npcs.find(q => q !== pl && !q.dead && !q.infant && Math.hypot(q.tx - pl.tx, q.ty - pl.ty) < 6 && q.pose !== 'sleep'); if (near && Math.random() < 0.5) lfShout(near, anyOf(SH_NPC));
  }
});
function drawShrooms(c: any, now: number) {
  const v = gaView(), k = psyLevel();
  for (const s of town.shrooms || []) {
    if (s.x < v.x0 || s.x >= v.x1 || s.y < v.y0 || s.y >= v.y1) continue;
    if (k > 0.05) { const px = s.x * TS + TS / 2, py = s.y * TS + TS * 0.6, r = TS * (0.9 + 0.4 * Math.sin(now / 300 + s.x)), g = c.createRadialGradient(px, py, 1, px, py, r); const h = Math.floor((now / 12 + s.x * 20) % 360); g.addColorStop(0, `hsla(${h},100%,70%,${0.55 * k})`); g.addColorStop(1, `hsla(${h},100%,60%,0)`); c.fillStyle = g; c.fillRect(px - r, py - r, r * 2, r * 2); }
    gaDraw(c, 'magic_shroom', s.x * TS, s.y * TS, now, s.x * 3 + s.y);
  }
}
/* the trip itself: the finished frame is copied, warped in strips, colour-shifted and echoed, with a pulsing rim and drifting sparks */
const PSY: any = { tmp: null, prev: null };
function psyPost(now: number) {
  const k = psyLevel(); if (k <= 0.01) { PSY.prev = null; return; }
  const cv: any = canvas, c: any = ctx, w = cv.width, h = cv.height, t = now / 1000, dpr = cam.dpr || 1;
  if (!PSY.tmp) { PSY.tmp = document.createElement('canvas'); }
  const tmp = PSY.tmp; if (tmp.width !== w || tmp.height !== h) { tmp.width = w; tmp.height = h; PSY.prev = null; }
  const tc = tmp.getContext('2d'); tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalCompositeOperation = 'source-over';
  try { tc.filter = `hue-rotate(${Math.floor((t * 45 + 70 * Math.sin(t * 0.6)) % 360)}deg) saturate(${(1 + 1.9 * k).toFixed(2)}) contrast(${(1 + 0.18 * k).toFixed(2)})`; } catch (e) {}
  tc.drawImage(cv, 0, 0); try { tc.filter = 'none'; } catch (e) {}
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  const strips = 44, sh = Math.ceil(h / strips), amp = (3 + 11 * k) * dpr, zoom = 1 + 0.03 * k * Math.sin(t * 1.1), ox = -(zoom - 1) * w / 2, oy = -(zoom - 1) * h / 2;
  for (let i = 0; i < strips; i++) { const y = i * sh, off = Math.sin(t * 2.1 + i * 0.33) * amp + Math.sin(t * 0.9 + i * 0.09) * amp * 0.7; c.drawImage(tmp, 0, y, w, sh, ox + off, oy + y * zoom, w * zoom, sh * zoom + 1); }
  if (PSY.prev) { c.globalCompositeOperation = 'screen'; c.globalAlpha = 0.3 * k; c.drawImage(PSY.prev, Math.sin(t * 1.7) * 6 * dpr, Math.cos(t * 1.3) * 6 * dpr); c.globalAlpha = 1; }   // echoes of the last frame
  // a pulsing rim, and sparks round you
  c.globalCompositeOperation = 'source-over';
  const g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75), hh = Math.floor((t * 60) % 360);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `hsla(${hh},90%,45%,${0.35 * k + 0.15 * k * Math.sin(t * 2.4)})`); c.fillStyle = g; c.fillRect(0, 0, w, h);
  const pl = game.player; if (pl) { const Z = cam.z * dpr, sx = (pl.x * TS + TS / 2 - cam.x) * Z, sy = (pl.y * TS + TS / 2 - cam.y) * Z; c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) { const a = t * (0.6 + (i % 5) * 0.15) + i * 2.4, r = (26 + 14 * Math.sin(t + i)) * Z * (1 + (i % 3) * 0.35), x = sx + Math.cos(a) * r, y = sy + Math.sin(a * 1.2) * r * 0.7; c.fillStyle = `hsla(${(hh + i * 25) % 360},100%,65%,${0.6 * k})`; c.beginPath(); c.arc(x, y, (2.2 + (i % 3)) * dpr, 0, 6.3); c.fill(); } }
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  if (!PSY.prev) PSY.prev = document.createElement('canvas'); const pv = PSY.prev; if (pv.width !== w || pv.height !== h) { pv.width = w; pv.height = h; }
  const pc = pv.getContext('2d'); pc.setTransform(1, 0, 0, 1, 0, 0); pc.globalCompositeOperation = 'copy'; pc.drawImage(cv, 0, 0);
}
