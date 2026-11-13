/* Build mode looks like a blueprint (docs/tutorial-round3.md G): the world goes cool and grey-blue with a faint tile grid, a frame and a banner say
   that time has stopped and how to leave, and the tile in front of you is outlined green where a thing can go and red where it cannot.
   Drawn in screen space at the start of the overlays (render/main.ts), so bubbles and labels stay readable on top. */
function buildLook(c: any, now: number) {
  const P = game.player, on = !!(P && P.player && itBuildOn(P));
  if (typeof document !== 'undefined') {
    document.body.classList.toggle('buildmode', on);
    const b = tut2Dom('buildbanner', 'buildbanner'); if (b && b.dataset.on !== String(on)) { b.dataset.on = String(on); b.hidden = !on; b.innerHTML = '<b>BUILD</b> · time has stopped · <b>B</b> to leave'; }
  }
  if (!on) return;
  const w = cam.cw, h = cam.ch;
  c.save();
  c.globalCompositeOperation = 'saturation'; c.globalAlpha = 0.3; c.fillStyle = '#808080'; c.fillRect(0, 0, w, h);   // (the colour drains out)
  c.globalCompositeOperation = 'multiply'; c.globalAlpha = 0.28; c.fillStyle = '#9fbde8'; c.fillRect(0, 0, w, h);   // (and turns blueprint blue)
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  const ts = TS * cam.z, o = toScreen(0, 0);
  if (ts >= 10) {   // a faint tile grid
    c.strokeStyle = 'rgba(220,235,255,.13)'; c.lineWidth = 1; c.beginPath();
    for (let x = ((o.x % ts) + ts) % ts; x < w; x += ts) { c.moveTo(Math.round(x) + 0.5, 0); c.lineTo(Math.round(x) + 0.5, h); }
    for (let y = ((o.y % ts) + ts) % ts; y < h; y += ts) { c.moveTo(0, Math.round(y) + 0.5); c.lineTo(w, Math.round(y) + 0.5); }
    c.stroke();
  }
  // the tile in front of you: green where a thing can go, red where it cannot
  const f = lf2Front(P); if (f && grid[f.y]) {
    const free = typeof fieldBrushOn === 'function' && fieldBrushOn(P) ? fieldPaintable(P, f.x, f.y) : walkable(f.x, f.y) && !lfPropAt(f.x, f.y) && !tileOwner.get(f.y * W + f.x) && roomAt[f.y][f.x] < 0 || (roomAt[f.y][f.x] >= 0 && grid[f.y][f.x] === T.FLOOR && !lfPropAt(f.x, f.y));
    const s = toScreen(f.x * TS, f.y * TS), pu = 0.75 + 0.25 * Math.sin(now / 220);
    c.globalAlpha = pu; c.lineWidth = 2.5; c.setLineDash([6, 4]); c.strokeStyle = free ? '#7ee07e' : '#ff7a6a'; c.fillStyle = free ? 'rgba(126,224,126,.18)' : 'rgba(255,122,106,.16)';
    c.fillRect(s.x + 2, s.y + 2, ts - 4, ts - 4); c.strokeRect(s.x + 2, s.y + 2, ts - 4, ts - 4); c.setLineDash([]);
  }
  c.restore();
}

/** ripe crops glow yellow, so you can see what is ready to pull (world space, after the ground and the guides) */
/* ripe crops: a thin yellow outline traced round each plant's own shape (a yellow silhouette drawn a hair out in eight directions, the plant over it), pulsing gently */
const RIPE_SIL: any = {};
function ripeSil(frame: any): any {
  const k = frame.__silId || (frame.__silId = 'f' + Object.keys(RIPE_SIL).length); if (RIPE_SIL[k]) return RIPE_SIL[k];
  const cv = document.createElement('canvas'); cv.width = frame.width; cv.height = frame.height; const g = cv.getContext('2d'); g.drawImage(frame, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#ffe066'; g.fillRect(0, 0, cv.width, cv.height);
  return (RIPE_SIL[k] = cv);
}
function drawRipeGlow(c: any, now: number) {
  if (!town || !town.crops || !town.crops.length) return;
  const x0 = Math.floor(cam.x / TS) - 1, y0 = Math.floor(cam.y / TS) - 1, x1 = x0 + Math.ceil(cam.cw / cam.z / TS) + 2, y1 = y0 + Math.ceil(cam.ch / cam.z / TS) + 2;
  const pu = 0.7 + 0.3 * Math.sin(now / 380), o = Math.max(0.55, 1.2 / cam.z);
  for (const k of town.crops) {
    if (k.x < x0 || k.x > x1 || k.y < y0 || k.y > y1 || !k.st || cropStage(k) !== 4 || itIsFlower(k)) continue;
    const sd = k.seed && k.seed !== 'barley' && IT_SEEDS[k.seed] ? k.seed : null, id = sd ? 'crop_' + sd + '_4' : 'crop_4', it = ART.BYID[id]; if (!it) continue;
    const fr = ART.frameOf(it, gaFrame(it, now, k.x + k.y)), sil = ripeSil(fr), X = k.x * TS, Y = k.y * TS + TS - it.gh;
    c.save(); c.globalAlpha = pu;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) c.drawImage(sil, X + dx * o, Y + dy * o, it.gw, it.gh);
    c.restore(); c.drawImage(fr, X, Y, it.gw, it.gh);
  }
}
