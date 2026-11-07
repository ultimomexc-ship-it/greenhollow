/* ================= lighting: lights that walls and trees block, what Tipping can see, and the sun's shadows ================= */
STYLE.light = true;
const LGT: any = { t: 0, key: '', cv: null, wcv: null };
// what stops light and sight: walls, mountains and boulders stop it dead; trees let a little through
function lightCost(x, y) {
  const t = grid[y][x];
  if (t === T.WALL || t === T.MOUNTAIN) return 99;
  if (t === T.ROCK) return 0.35;
  if (t === T.TREE) return 0.55;
  return 0;
}
// walk a straight line from (x0,y0) to (x1,y1): how much gets through (1 = all, 0 = none). The end tile itself is always reached.
function seeThrough(x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy, x = x0, y = y0, keep = 1;
  while (x !== x1 || y !== y1) {
    if (x !== x0 || y !== y0) { const k = lightCost(x, y); if (k >= 99) return 0; keep *= 1 - k; if (keep < 0.05) return 0; }
    const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; }
  }
  return keep;
}
function lightSources(hour) {
  const out = [], night = 1 - daylight(hour), gp = game.player;
  if (night < 0.05) return out;
  for (const l of lamps) out.push({ x: l.x, y: l.y, r: 8, s: 1 });
  if (town.yard) { const w = town.wedding, pt = typeof activeParty === 'function' && activeParty(); out.push({ x: town.cx, y: town.cy + 1, r: 6.5, s: (w && !w.done && game.time >= w.at - 40) || pt ? 0.7 : 0.95 }); }
  for (const rm of rooms) { if (rm.dead || rm.lit < 0.05) continue; out.push({ x: Math.floor(rm.x + rm.w / 2), y: Math.floor(rm.y + rm.h / 2), r: Math.hypot(rm.w, rm.h) * 0.62, s: rm.lit, room: rm }); }
  const fn = town.funeral; if (fn && fn.slot && !fn.done && game.time > fn.at - 20) out.push({ x: fn.slot.x, y: fn.slot.y, r: 3.5, s: 0.7 });
  const p = game.player; if (p && !p.dead) out.push({ x: p.tx, y: p.ty, r: 2.4, s: 0.5 });
  return out;
}
function buildLightMaps(hour) {
  const M = 9, x0 = Math.max(0, Math.floor(cam.x / TS) - M), y0 = Math.max(0, Math.floor(cam.y / TS) - M);
  const x1 = Math.min(W, Math.ceil((cam.x + cam.cw / cam.z) / TS) + M), y1 = Math.min(H, Math.ceil((cam.y + cam.ch / cam.z) / TS) + M);
  const rw = x1 - x0, rh = y1 - y0, light = new Float32Array(rw * rh), vis = new Uint8Array(rw * rh), sight = new Float32Array(rw * rh);
  for (const s of lightSources(hour)) {
    const R = Math.ceil(s.r);
    for (let y = Math.max(y0, s.y - R); y < Math.min(y1, s.y + R + 1); y++) for (let x = Math.max(x0, s.x - R); x < Math.min(x1, s.x + R + 1); x++) {
      const d = Math.hypot(x - s.x, y - s.y); if (d > s.r) continue;
      if (s.room && roomAt[y][x] !== rooms.indexOf(s.room) && grid[y][x] !== T.DOOR) { /* a lit room spills light only out through its door */
        const dr = s.room; const k = seeThrough(dr.doorX, dr.doorY, x, y) * seeThrough(s.x, s.y, dr.doorX, dr.doorY); const dd = Math.hypot(x - dr.doorX, y - dr.doorY); if (dd > 4) continue; const v = k * s.s * 0.8 * (1 - dd / 4.5); const i = (y - y0) * rw + x - x0; if (v > light[i]) light[i] = v; continue; }
      const k = seeThrough(s.x, s.y, x, y); if (k <= 0) continue;
      const f = 1 - d / (s.r + 0.5), v = s.s * k * f * (2 - f) ; const i = (y - y0) * rw + x - x0; if (v > light[i]) light[i] = v;
    }
  }
  // what Tipping can see: everything in a straight unblocked line, out to a range that shrinks at night
  const p = game.player, Rf = 7.5 + daylight(hour) * 30, R = Math.round(18 + daylight(hour) * 22); // you see daylight a short way, but a lit lamp from far off
  if (p && !p.dead) {
    for (let y = Math.max(y0, p.ty - R); y < Math.min(y1, p.ty + R + 1); y++) for (let x = Math.max(x0, p.tx - R); x < Math.min(x1, p.tx + R + 1); x++) {
      if (Math.hypot(x - p.tx, y - p.ty) > R + 0.5) continue;
      const k = seeThrough(p.tx, p.ty, x, y); if (k > 0.25) { const i = (y - y0) * rw + x - x0; vis[i] = k > 0.6 ? 2 : 1; sight[i] = Math.max(0, Math.min(1, (Rf + 2.5 - Math.hypot(x - p.tx, y - p.ty)) / 9)); }
    }
  } else { vis.fill(2); sight.fill(1); }
  // zoomed out to look at the island: everything shows plainly
  if (p && !p.dead && cam.z < 0.6) { vis.fill(2); sight.fill(1); }
  return { x0, y0, rw, rh, light, vis, sight };
}
// can the player make this tile out right now? (lighting on only)
function canSee(x, y) {
  if (!STYLE.light || !LGT.map || !game.player) return true;
  const m = LGT.map, i = (Math.round(y) - m.y0) * m.rw + Math.round(x) - m.x0;
  if (i < 0 || i >= m.vis.length || Math.round(x) < m.x0 || Math.round(x) >= m.x0 + m.rw) return false;
  if (!m.vis[i]) return false;
  const day = daylight((game.time % 1440) / 60); return day > 0.3 || m.light[i] > 0.12;
}
function drawLighting(c, hour, now) {
  const key = Math.floor(cam.x / TS) + ',' + Math.floor(cam.y / TS) + ',' + (game.player ? game.player.tx + ',' + game.player.ty : '') + ',' + cam.z.toFixed(2);
  if (!LGT.map || now - LGT.t > 150 || key !== LGT.key) { LGT.map = buildLightMaps(hour); LGT.t = now; LGT.key = key; LGT.dirty = true; }
  const day = daylight(hour), night = 1 - day, warmth = 0;                // no orange: dusk and dawn are just darker and lighter
  if (!LGT.cv) { LGT.cv = document.createElement('canvas'); LGT.wcv = document.createElement('canvas'); }
  const cv = LGT.cv, wcv = LGT.wcv;
  /* the lit texture is rebuilt (and blurred) when the lit region changes, and otherwise at 20 Hz: the light eases over about a tenth of a second, so more often is invisible */
  if (LGT.tm !== LGT.map || !(now - LGT.texT < 50)) {
  const m = LGT.map;
  if (cv.width !== m.rw || cv.height !== m.rh) { cv.width = wcv.width = m.rw; cv.height = wcv.height = m.rh; }
  const img = cv.getContext('2d').createImageData(m.rw, m.rh), d = img.data, wimg = wcv.getContext('2d').createImageData(m.rw, m.rh), wd = wimg.data;
  const nr = Math.round(10 + warmth * 150), ng = Math.round(14 + warmth * 50), nb = Math.round(42 - warmth * 15);
  const moon = 0.035;
  // light changes ease in over a fraction of a second instead of snapping as you step from tile to tile
  if (!LGT.A || LGT.A.length !== W * H || LGT.seed !== town.seed) { LGT.seed = town.seed; LGT.A = new Float32Array(W * H).fill(-1); LGT.B = new Float32Array(W * H); LGT.Wm = new Float32Array(W * H); }
  const dt = Math.min(0.25, Math.max(0, (now - (LGT.last || now)) / 1000)); LGT.last = now;
  const k = 1 - Math.exp(-dt / 0.13);
  for (let yy = 0; yy < m.rh; yy++) for (let xx = 0; xx < m.rw; xx++) {
    const i = yy * m.rw + xx, wi = (m.y0 + yy) * W + m.x0 + xx;
    const L = m.light[i], v = m.vis[i];
    const sc = m.sight[i] * m.sight[i] * (3 - 2 * m.sight[i]);     // open daylight fades to dark towards the edge of your view
    const inF = inForest(m.x0 + xx, m.y0 + yy), dayT = day;
    const canopy = inF ? 0.5 : 1;                                      // under the old trees it is gloomy even at noon
    let bright = v ? Math.max((dayT * canopy + (1 - dayT) * moon) * sc, L) : 0;
    if (v === 1) bright *= dayT > 0.5 ? 0.8 : 0.6;
    const ta = Math.min(1, 1 - bright), tb = (v === 0 || bright < 0.12) ? 1 : 0, tw = Math.min(1, L) * (1 - dayT) * (v ? 1 : 0);
    if (LGT.A[wi] < 0) { LGT.A[wi] = ta; LGT.B[wi] = tb; LGT.Wm[wi] = tw; }
    else { LGT.A[wi] += (ta - LGT.A[wi]) * k; LGT.B[wi] += (tb - LGT.B[wi]) * k; LGT.Wm[wi] += (tw - LGT.Wm[wi]) * k; }
    const a = LGT.A[wi], b = LGT.B[wi], o = i * 4;
    d[o] = Math.round(nr + (4 - nr) * b); d[o + 1] = Math.round(ng + (5 - ng) * b); d[o + 2] = Math.round(nb + (9 - nb) * b); d[o + 3] = Math.round(a * 255);
    wd[o] = 255; wd[o + 1] = 218; wd[o + 2] = 170; wd[o + 3] = Math.round(LGT.Wm[wi] * 0.2 * 255);   // lamp light is a soft warm white, not orange
  }
  cv.getContext('2d').putImageData(img, 0, 0); wcv.getContext('2d').putImageData(wimg, 0, 0);
  // soften the tile edges: blow the map up 4x with a blur so shadows have soft, round edges
  if (!LGT.bcv) LGT.bcv = document.createElement('canvas');
  const bcv = LGT.bcv, S4 = 4; if (bcv.width !== m.rw * S4 || bcv.height !== m.rh * S4) { bcv.width = m.rw * S4; bcv.height = m.rh * S4; }
  { const bx = bcv.getContext('2d'); bx.clearRect(0, 0, bcv.width, bcv.height); bx.imageSmoothingEnabled = true; bx.filter = 'blur(2.2px)'; bx.drawImage(cv, 0, 0, bcv.width, bcv.height); bx.filter = 'none'; }
  LGT.tm = m; LGT.texT = now;
  }
  const m = LGT.tm, bcv = LGT.bcv;
  const sm = c.imageSmoothingEnabled; c.imageSmoothingEnabled = true;
  // stretch the tile grid over the world: one pixel per tile, smoothed, so light falls off softly
  c.drawImage(bcv, m.x0 * TS, m.y0 * TS, m.rw * TS, m.rh * TS);
  if (night > 0.05) { c.globalCompositeOperation = 'lighter'; c.drawImage(wcv, m.x0 * TS, m.y0 * TS, m.rw * TS, m.rh * TS); c.globalCompositeOperation = 'source-over'; }
  c.imageSmoothingEnabled = sm;
}

/* ================= the wild: animals by day, foxes and owls by night ================= */
const WILD = { list: [], last: 0, spawnT: 0 };
function wildOk(x, y) { if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || (typeof inCoast === 'function' && inCoast(x, y))) return false; const t = grid[y][x]; return (t === T.GRASS) && roomAt[y][x] < 0 && Math.hypot(x - town.cx, y - town.cy) > 16; }
function stepWild(now) {
  const p = game.player; if (!p || !town) return;
  const gt = clk(), dt = Math.max(0, Math.min(5, gt - (WILD.last || gt))); WILD.last = gt; if (!dt) return;
  const day = daylight((game.time % 1440) / 60);
  // keep a handful of creatures around the player, out of reach of the village
  if (gt - WILD.spawnT > 8 && WILD.list.length < 4) {
    WILD.spawnT = gt;
    for (let t = 0; t < 30; t++) { const a = Math.random() * 6.283, d = 9 + Math.random() * 12, x = Math.round(p.tx + Math.cos(a) * d), y = Math.round(p.ty + Math.sin(a) * d);
      if (!wildOk(x, y)) continue; const inF = inForest(x, y);
      const kind = day > 0.4 ? (inF ? (Math.random() < 0.6 ? 'deer' : 'rabbit') : (Math.random() < 0.7 ? 'rabbit' : 'deer')) : (Math.random() < 0.6 ? 'fox' : 'owl');
      WILD.list.push({ kind, x, y, tx: x, ty: y, flee: 0, born: gt, face: 1 }); break; }
  }
  for (let i = WILD.list.length - 1; i >= 0; i--) {
    const a = WILD.list[i], dp = Math.hypot(a.x - p.x, a.y - p.y);
    if (dp > 30 || gt - a.born > 600) { WILD.list.splice(i, 1); continue; }
    if (a.kind === 'owl') continue;                                   // owls sit and watch
    if (dp < (a.kind === 'deer' ? 4.5 : 3)) { const ang = Math.atan2(a.y - p.y, a.x - p.x); a.tx = a.x + Math.cos(ang) * 7; a.ty = a.y + Math.sin(ang) * 7; a.flee = 1; }
    else if (Math.hypot(a.tx - a.x, a.ty - a.y) < 0.2 && Math.random() < 0.02 * dt) { a.tx = a.x + (Math.random() - 0.5) * 6; a.ty = a.y + (Math.random() - 0.5) * 6; a.flee = 0; }
    const sp = (a.flee ? (a.kind === 'rabbit' ? 0.9 : 0.75) : 0.12) * dt, dx = a.tx - a.x, dy = a.ty - a.y, dd = Math.hypot(dx, dy);
    if (dd > 0.05) { const k = Math.min(1, sp / dd), nx = a.x + dx * k, ny = a.y + dy * k; if (walkable(Math.round(nx), Math.round(ny)) || grid[Math.round(ny)] && grid[Math.round(ny)][Math.round(nx)] === T.TREE) { a.x = nx; a.y = ny; a.face = dx < 0 ? -1 : 1; } else { a.tx = a.x; a.ty = a.y; } }
  }
}

// boulders like the reference: a flat-bottomed dome, speckled, lit from the top
function boulderSprite(v) {
  return sprite('rock' + v, 26, 22, c => {
    c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(13, 18.6, 11, 2.6, 0, 0, 6.2832); c.fill();
    const w = 10.5 + (v % 2), top = 4 + (v % 3);
    const shape = () => { c.beginPath(); c.moveTo(13 - w, 18); for (let i = 0; i <= 40; i++) { const a = Math.PI + i / 40 * Math.PI, wob = 1 + 0.04 * Math.sin(a * 7 + v); c.lineTo(13 + Math.cos(a) * w * wob, 18 + Math.sin(a) * (18 - top) * wob); } c.quadraticCurveTo(13, 19.4, 13 - w, 18); c.closePath(); };
    shape(); c.fillStyle = '#959a9d'; c.fill();
    c.save(); c.clip();
    c.fillStyle = '#7b8083'; c.beginPath(); c.ellipse(15, 19, w * 1.0, 5.5, 0, 0, 6.2832); c.fill();
    c.fillStyle = '#b0b4b6'; c.beginPath(); c.ellipse(9.5, top + 4.5, w * 0.45, 3.2, -0.2, 0, 6.2832); c.fill();
    c.fillStyle = '#c8cbcc'; c.beginPath(); c.ellipse(8, top + 3.5, 1.6, 0.9, -0.2, 0, 6.2832); c.fill();
    fillR(c, 15, top + 6, 3, 0.9, '#6e7376'); fillR(c, 6, 14, 2.5, 0.9, '#6e7376');
    c.restore(); shape(); c.lineWidth = 0.9; c.strokeStyle = '#3a2e24'; c.stroke();
  });
}
function bushSprite(v) {
  return sprite('bush' + v, 26, 24, c => {
    softShadow(c, 13, 20.5, 11, 3.2, 0.4);
    crown(c, 13, 12.5, 10.5, 8.6, v * 3.1 + 5, TREE_PAL.round);
  });
}

function shadeHex(hex, amt) { const h = hex.replace('#', ''), n = parseInt(h.length === 3 ? h.split('').map(ch => ch + ch).join('') : h, 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = v => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt)))); return `rgb(${f(r)},${f(g)},${f(b)})`; }
// a ball lit from the top left: bright highlight, darker rim
function gcirc(c, x, y, r, col) {
  if (!STYLE.soft) return circ(c, x, y, r, col);
  const g = c.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.08, x, y, r * 1.05);
  g.addColorStop(0, shadeHex(col, 0.45)); g.addColorStop(0.5, col); g.addColorStop(1, shadeHex(col, -0.32));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill();
}
function gell(c, x, y, rx, ry, rot, col) {
  if (!STYLE.soft) { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, 6.3); c.fill(); return; }
  const r = Math.max(rx, ry), g = c.createRadialGradient(x - rx * 0.4, y - ry * 0.45, r * 0.08, x, y, r * 1.05);
  g.addColorStop(0, shadeHex(col, 0.35)); g.addColorStop(0.55, col); g.addColorStop(1, shadeHex(col, -0.3));
  c.fillStyle = g; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, 6.3); c.fill();
}
// big soft pools of sunlight and shade laid over the ground, continuous across tiles
function lightBlobs() {
  if (town._blobs) return town._blobs;
  let s = (town.seed || 1) * 9301 + 49297; const R = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const out = []; const n = Math.round(W * H / 90);
  for (let i = 0; i < n; i++) out.push({ x: R() * W * TS, y: R() * H * TS, r: (3 + R() * 6) * TS, lit: R() < 0.55 });
  return (town._blobs = out);
}
function drawLight(c, x0, y0, x1, y1) {
  if (!STYLE.soft || !LF2.shadows) return;
  const X0 = x0 * TS, Y0 = y0 * TS, X1 = x1 * TS, Y1 = y1 * TS;
  for (const b of lightBlobs()) {
    if (b.x + b.r < X0 || b.x - b.r > X1 || b.y + b.r < Y0 || b.y - b.r > Y1) continue;
    const g = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
    if (b.lit) { g.addColorStop(0, 'rgba(240,245,160,.2)'); g.addColorStop(1, 'rgba(240,245,160,0)'); } else { g.addColorStop(0, 'rgba(30,60,25,.13)'); g.addColorStop(1, 'rgba(30,60,25,0)'); }
    c.fillStyle = g; c.fillRect(Math.max(X0, b.x - b.r), Math.max(Y0, b.y - b.r), Math.min(X1, b.x + b.r) - Math.max(X0, b.x - b.r), Math.min(Y1, b.y + b.r) - Math.max(Y0, b.y - b.r));
  }
}
const WALLCOL = { church: ['#8d9095', '#a4a7ab', '#6d7075'], smithy: ['#68625d', '#7e7770', '#4f4a46'], tavern: ['#74503a', '#8c654a', '#5a3c2b'],
  shop: ['#7c6a50', '#947f62', '#5f5039'], barracks: ['#6d6e72', '#85868b', '#52535a'], bakery: ['#8a6a4a', '#a38058', '#6a4e36'], house: ['#7a5f48', '#927459', '#5e4836'] };
const BLANKETS = ['#4a6fa5', '#a54a4a', '#4a8f6a', '#8a5aa5', '#c0953a'];

// a loose boulder sitting in the grass: this is the stone people break
function boulderShape(x, y) { const s = 0.8 + hash(x, y, 61) * 0.35; return { s, cx: 12 + (hash(x, y, 62) - 0.5) * 3, cy: 15 }; }

