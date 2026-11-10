/* ===== Greenhollow painters (sealed) ===== */
const ART = (function () {
/* ================= numbers ================= */
const S = 96, FR = 12, FPS = 30, TAU = Math.PI * 2, BAND = 12;
const LT = [-0.55, -0.835];                 // toward the sun: top left
const INK = '#2a2332';
function h32(a, b, c, d) { let h = (Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1) ^ Math.imul(d | 0, 0x85ebca77)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39); h ^= h >>> 15; return (h >>> 0) / 4294967296; }
function mul(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const sm = t => t * t * (3 - 2 * t), clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const wrapI = (a, p) => ((a % p) + p) % p;
/* value noise that repeats every tile (u, v in tile units; p lattice cells per tile) */
function vn(u, v, p, s) { const fx = u * p, fy = v * p, ix = Math.floor(fx), iy = Math.floor(fy), tx = sm(fx - ix), ty = sm(fy - iy);
  const x0 = wrapI(ix, p), x1 = wrapI(ix + 1, p), y0 = wrapI(iy, p), y1 = wrapI(iy + 1, p);
  const a = h32(x0, y0, s, 0), b = h32(x1, y0, s, 0), c = h32(x0, y1, s, 0), d = h32(x1, y1, s, 0);
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty; }
function fbm(u, v, s, p0, oct) { let t = 0, amp = 0.5, tot = 0, p = p0; for (let o = 0; o < oct; o++) { t += amp * vn(u, v, p, s + o * 17); tot += amp; amp *= 0.5; p *= 2; } return t / tot; }
/* the same, looping in time too (w in loop units, pt cells per loop) */
function vn3(u, v, w, p, pt, s, py = p) { const fx = u * p, fy = v * py, fz = w * pt, ix = Math.floor(fx), iy = Math.floor(fy), iz = Math.floor(fz);
  const tx = sm(fx - ix), ty = sm(fy - iy), tz = sm(fz - iz), x0 = wrapI(ix, p), x1 = wrapI(ix + 1, p), y0 = wrapI(iy, py), y1 = wrapI(iy + 1, py), z0 = wrapI(iz, pt), z1 = wrapI(iz + 1, pt);
  const l = (z) => { const a = h32(x0, y0, s, z), b = h32(x1, y0, s, z), c = h32(x0, y1, s, z), d = h32(x1, y1, s, z); return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty; };
  const A = l(z0), Bv = l(z1); return A + (Bv - A) * tz; }
/* world noise for laying out the sample island (does not repeat) */
function wn(x, y, s) { const ix = Math.floor(x), iy = Math.floor(y), tx = sm(x - ix), ty = sm(y - iy);
  const a = h32(ix, iy, s, 9), b = h32(ix + 1, iy, s, 9), c = h32(ix, iy + 1, s, 9), d = h32(ix + 1, iy + 1, s, 9); return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty; }
const wfbm = (x, y, s) => (wn(x, y, s) * 0.6 + wn(x * 2.1, y * 2.1, s + 3) * 0.3 + wn(x * 4.3, y * 4.3, s + 7) * 0.1);

/* ================= colour ================= */
const hx = s => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
function ramp(cols, t) { t = clamp(t, 0, 0.9999) * (cols.length - 1); const i = Math.floor(t); return mixc(cols[i], cols[i + 1], t - i); }
const SKY = [86, 98, 168];                  // the fill light every shadow leans toward
const kage = (c, k = 1) => mixc(c, SKY, 0.36 * k).map(v => v * (1 - 0.2 * k));
const grain = (c, x, y, a = 7) => { const g = (h32(x, y, 7, 7) - 0.5) * a; return [c[0] + g, c[1] + g, c[2] + g]; };
const SHADOW = 'rgba(54,58,120,0.30)';

/* ================= canvases ================= */
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function pixels(w, h, fn) { const c = mk(w, h), g = c.getContext('2d'), im = g.createImageData(w, h), d = im.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const col = fn(x, y), i = (y * w + x) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = col.length > 3 ? col[3] : 255; }
  g.putImageData(im, 0, 0); return c; }
const edgeD = (x, y) => Math.min(x, S - x, y, S - y);
/* noise that is shared near the tile's edges (so every variant meets every other) and the variant's own inside */
const inW = (x, y) => sm(clamp((edgeD(x, y) - BAND) / BAND, 0, 1));
function vary(x, y, s, v, p0, oct) { const u = x / S, w = y / S, k = inW(x, y); let a = fbm(u, w, s, p0, oct); a = 0.5 + (a - 0.5) * (0.62 + 0.38 * k);   /* the shared rim is calmer, so the seams between variants do not draw a grid */
  return k <= 0 ? a : a * (1 - k) + (0.5 + (fbm(u, w, s + 1000 * (v + 1), p0, oct) - 0.5) * (0.62 + 0.38 * k)) * k; }
/* brush marks: the ones near an edge are shared by all variants and wrap round; the rest belong to the variant */
function scatter(n, s, v, fn) { for (let i = 0; i < n; i++) {
  const x = h32(i, 1, s, 0) * S, y = h32(i, 2, s, 0) * S;
  if (edgeD(x, y) < BAND) for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { const X = x + ox, Y = y + oy; if (X > -14 && X < S + 14 && Y > -14 && Y < S + 14) fn(X, Y, h32(i, 3, s, 0), h32(i, 4, s, 0)); }
  const x2 = h32(i, 1, s, v + 1) * S, y2 = h32(i, 2, s, v + 1) * S; if (edgeD(x2, y2) >= BAND) fn(x2, y2, h32(i, 3, s, v + 1), h32(i, 4, s, v + 1)); } }
function scatterIn(n, s, v, fn, m = BAND) { for (let i = 0; i < n; i++) { const x = h32(i, 5, s, v + 1) * S, y = h32(i, 6, s, v + 1) * S; if (edgeD(x, y) >= m) fn(x, y, h32(i, 7, s, v + 1), h32(i, 8, s, v + 1)); } }

/* ================= shapes, ink, cel ================= */
const shift = (s, dx, dy) => s.map(p => [p[0] + dx, p[1] + dy]);
const cen = s => { let x = 0, y = 0; for (const p of s) { x += p[0]; y += p[1]; } return [x / s.length, y / s.length]; };
const scl = (s, k, ky = k) => { const c = cen(s); return s.map(p => [c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * ky]); };
function trace(g, s, smooth = true) { const n = s.length;
  if (!smooth) { g.moveTo(s[0][0], s[0][1]); for (let i = 1; i < n; i++) g.lineTo(s[i][0], s[i][1]); g.closePath(); return; }
  const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; const p = m(s[n - 1], s[0]); g.moveTo(p[0], p[1]);
  for (let i = 0; i < n; i++) { const q = m(s[i], s[(i + 1) % n]); g.quadraticCurveTo(s[i][0], s[i][1], q[0], q[1]); } g.closePath(); }
function offsetPts(s, wfn) { const c = cen(s), n = s.length; return s.map((p, i) => { const a = s[(i - 1 + n) % n], b = s[(i + 1) % n];
  let nx = b[1] - a[1], ny = -(b[0] - a[0]); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
  if (nx * (p[0] - c[0]) + ny * (p[1] - c[1]) < 0) { nx = -nx; ny = -ny; } const w = wfn(nx, ny, i); return [p[0] + nx * w, p[1] + ny * w]; }); }
/* ink: heavier on the side away from the sun, light where the sun hits, a little hand wobble that never changes */
const inkW = (base = 1.0, heavy = 1.6, seed = 1) => (nx, ny, i) => base + heavy * Math.max(0, -(nx * LT[0] + ny * LT[1])) + 0.3 * (h32(i, seed, 5, 5) - 0.5);
function blob(cx, cy, rx, ry, s, n = 36, amp = 0.15, p = 5) { const out = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 + amp * (vn(i / n, 0.37, p, s) * 2 - 1); out.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); } return out; }
function poly(cx, cy, r, s, n = 8, sq = 0.74) { const R = mul(s), out = []; for (let i = 0; i < n; i++) { const a = (i + R() * 0.5) / n * TAU - Math.PI / 2, k = 0.8 + R() * 0.32; out.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * sq]); } return out; }
const pal = (base, rim, hi, k = 1) => ({ base, rim, hi, kage: rgba(kage(hx(base), k)) });
function inkUnion(g, shapes, smooth, w, col = INK) { g.fillStyle = col; g.beginPath(); for (const s of shapes) trace(g, offsetPts(s, w), smooth); g.fill(); }
/* one cel-painted mass: ink round the whole silhouette, then each clump with rim light, base, shadow and a hard highlight */
/* outline by stroking: a thin line all round plus a copy pushed away from the sun, so the shadow side is heavier (works on any outline, concave or not) */
function inkStroke(g, shapes, smooth, ow, os, col = INK) { g.save(); g.fillStyle = g.strokeStyle = col; g.lineJoin = 'round'; g.lineWidth = ow * 2;
  for (const k of [0, 1]) { g.save(); if (k) g.translate(-LT[0] * os, -LT[1] * os); g.beginPath(); for (const s of shapes) trace(g, s, smooth); g.fill(); g.stroke(); g.restore(); } g.restore(); }
function cel(g, shapes, P, o: any = {}) { const smooth = o.smooth !== false, lx = o.lx ?? -5, ly = o.ly ?? -7, rim = o.rim ?? 1.7;
  if (o.ink !== false) { if (o.ow !== undefined) inkStroke(g, shapes, smooth, o.ow, o.os ?? 0, o.inkCol || INK); else inkUnion(g, shapes, smooth, o.inkW || inkW(), o.inkCol || INK); }
  for (const s of shapes) { g.save(); g.beginPath(); trace(g, s, smooth); g.clip();
    g.fillStyle = P.rim; g.fillRect(-500, -500, 1200, 1200);
    g.beginPath(); trace(g, shift(s, rim, rim), smooth); g.clip();
    g.fillStyle = P.kage; g.fillRect(-500, -500, 1200, 1200);
    g.fillStyle = P.base; g.beginPath(); trace(g, shift(s, lx, ly), smooth); g.fill();
    if (P.hi) { g.fillStyle = P.hi; g.beginPath(); trace(g, shift(scl(s, o.hs ?? 0.5), lx * 1.9, ly * 1.9), smooth); g.fill(); }
    if (o.detail) o.detail(g, s);
    g.restore();
    if (o.inner !== false) { g.save(); g.globalAlpha = 0.55; g.strokeStyle = o.inkCol || INK; g.lineWidth = o.iw || 0.8; g.beginPath(); trace(g, s, smooth); g.stroke(); g.restore(); } } }
/* a cast shadow: the sun is top left, so it leans to the right and a little down; a soft rim and a denser core */
function shadowE(g, x, y, rx, ry) {
  /* a shadow is never cut off by the edge of its own frame: it is pulled in (and, if it must, made a little smaller) until its soft outer ring stays clear of every side */
  { const T = g.getTransform && g.getTransform(), cv = g.canvas; if (T && cv && T.a > 0.5 && !T.b && !T.c) { const x0 = -T.e / T.a + 0.7, x1 = (cv.width - T.e) / T.a - 0.7, yb = (cv.height - T.f) / T.d - 0.5, kL = 0.94, kR = 1.34;
      if (x + kR * rx > x1 || x - kL * rx < x0) { const fit = (x1 - x0) / (kL + kR); if (rx > fit) rx = fit; if (x + kR * rx > x1) x = x1 - kR * rx; if (x - kL * rx < x0) x = x0 + kL * rx; }
      const bot = y + 1.3 * ry; if (bot > yb) y -= Math.min(bot - yb, ry * 0.9); } }
  const sx = x + rx * 0.16, sy = y + ry * 0.1; g.fillStyle = 'rgba(54,58,120,0.13)'; g.beginPath(); g.ellipse(sx + rx * 0.04, sy, rx * 1.1, ry * 1.18, -0.03, 0, TAU); g.fill();
  g.fillStyle = 'rgba(54,58,120,0.17)'; g.beginPath(); g.ellipse(sx, sy, rx * 0.94, ry * 0.98, -0.03, 0, TAU); g.fill(); g.fillStyle = 'rgba(52,54,118,0.2)'; g.beginPath(); g.ellipse(sx - rx * 0.06, sy - ry * 0.05, rx * 0.72, ry * 0.7, -0.03, 0, TAU); g.fill(); }
function inkPoly(g, pts, w = 1.6) { inkUnion(g, [pts], false, inkW(w * 0.6, w * 0.8)); }
function fillPoly(g, pts, col) { g.fillStyle = col; g.beginPath(); trace(g, pts, false); g.fill(); }
function rect(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }

/* ================= ground ================= */
const C = {
  grass: ['#4b773b', '#5c8a40', '#6c9944', '#82ab4e', '#9bbe5a'].map(hx),
  sand: ['#d8bd8b', '#e2c997', '#ead5a6', '#f2e2bb'].map(hx),
  path: ['#a27b50', '#b08959', '#be9966', '#cdab7a'].map(hx),
  soil: ['#61402e', '#704b34', '#80583c', '#946847'].map(hx),
  flats: ['#ad9878', '#b9a382', '#c4ae8d'].map(hx),
};
function blade(g, x, y, r1, r2, dk, lt) { const len = 4 + r1 * 5, a = -Math.PI / 2 + (r2 - 0.5) * 0.9, tx = x + Math.cos(a) * len, ty = y + Math.sin(a) * len, bend = (r2 - 0.5) * 3;
  g.fillStyle = dk; g.beginPath(); g.moveTo(x - 1.1, y); g.quadraticCurveTo(x + bend - 0.6, (y + ty) / 2, tx, ty); g.quadraticCurveTo(x + bend + 0.6, (y + ty) / 2, x + 1.1, y); g.fill();
  g.fillStyle = lt; g.beginPath(); g.moveTo(x - 1.2, y - 0.8); g.quadraticCurveTo(x + bend - 1.1, (y + ty) / 2 - 0.6, tx - 0.5, ty + 0.6); g.lineTo(x - 0.1, y - 0.8); g.fill(); }
function dab(g, x, y, rx, ry, a, col) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, a, 0, TAU); g.fill(); }
function flower(g, x, y, r) { const col = r < 0.4 ? '#f7f3e6' : r < 0.75 ? '#f3d55a' : '#ef9fb4';
  for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; dab(g, x + Math.cos(a) * 1.6, y + Math.sin(a) * 1.3, 1.25, 1.05, a, col); } dab(g, x, y, 0.9, 0.9, 0, '#e0952c'); }

function paintGrass(v) {
  const c = pixels(S, S, (x, y) => { const n = vary(x, y, 11, v, 2, 4), m = vary(x, y, 12, v, 6, 3); let t = n * 0.9 + (m - 0.5) * 0.4; const q = Math.floor(t * 6) / 6; t = t * 0.5 + q * 0.5; return grain(ramp(C.grass, t), x, y); });
  const g = c.getContext('2d');
  scatter(26, 13, v, (X, Y, r1, r2) => dab(g, X, Y, 6 + r1 * 6, 2.5 + r2 * 2, -0.25, r1 < 0.5 ? 'rgba(130,170,80,.22)' : 'rgba(54,94,62,.20)'));   // broad gouache strokes
  scatter(250, 21, v, (X, Y, r1, r2) => { const dark = vn(X / S, Y / S, 4, 11) < 0.47; blade(g, X, Y, r1, r2, dark ? '#3c6539' : '#4f7d3c', dark ? '#6f9a46' : '#a7c862'); });
  if (v === 2 || v === 3) scatterIn(v === 2 ? 7 : 4, 31, v, (X, Y, r) => flower(g, X, Y, r), 16);
  if (v === 1) scatterIn(5, 33, v, (X, Y, r1, r2) => { for (let k = 0; k < 3; k++) dab(g, X + (k - 1) * 2.2, Y + (k % 2) * 1.5, 1.8, 1.4, 0, k % 2 ? '#7fae4c' : '#93c25a'); }, 16);
  return c; }
function paintSand(v) {
  const c = pixels(S, S, (x, y) => { const u = x / S, w = y / S, n = vary(x, y, 41, v, 2, 4); let col = ramp(C.sand, n * 0.9 + 0.08);
    const r = w * 6 + (fbm(u, w, 42, 2, 3) - 0.5) * 2.4, fr = r - Math.floor(r);
    if (fr < 0.07) col = mixc(col, [248, 237, 210], 0.55); else if (fr < 0.15) col = mixc(col, [196, 170, 140], 0.28);
    return grain(col, x, y, 9); });
  const g = c.getContext('2d');
  scatter(170, 43, v, (X, Y, r1, r2) => dab(g, X, Y, 0.5 + r1 * 0.7, 0.45 + r1 * 0.5, 0, r2 < 0.55 ? 'rgba(160,128,98,.7)' : 'rgba(255,248,226,.85)'));
  if (v === 1) scatterIn(1, 45, v, (X, Y) => { g.fillStyle = '#f6e8de'; g.beginPath(); g.moveTo(X - 3, Y + 2); g.quadraticCurveTo(X, Y - 4, X + 3, Y + 2); g.closePath(); g.fill(); g.strokeStyle = 'rgba(140,100,110,.8)'; g.lineWidth = 0.6; g.stroke(); for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(X, Y + 1.6); g.lineTo(X + k * 2, Y - 1.5); g.stroke(); } }, 18);
  if (v === 3) scatterIn(4, 46, v, (X, Y, r) => pebble(g, X, Y, 1.4 + r * 1.2), 16);
  return c; }
function pebble(g, x, y, r) { dab(g, x + 0.6, y + 0.7, r * 1.05, r * 0.72, 0, 'rgba(100,96,130,.55)'); dab(g, x, y, r, r * 0.7, 0, '#cbc1ad'); dab(g, x - r * 0.3, y - r * 0.25, r * 0.5, r * 0.32, 0, '#ece4d2');
  g.strokeStyle = 'rgba(60,50,64,.55)'; g.lineWidth = 0.6; g.beginPath(); g.ellipse(x, y, r, r * 0.7, 0, 0, TAU); g.stroke(); }
function pebbleW(g, x, y, r, tone) { dab(g, x + 0.7, y + 0.8, r * 1.05, r * 0.7, 0, 'rgba(70,52,80,.42)'); dab(g, x, y, r, r * 0.7, 0, tone ? '#c8b08a' : '#b9a285'); dab(g, x - r * 0.3, y - r * 0.28, r * 0.52, r * 0.34, 0, tone ? '#e8d6b4' : '#dccaa6');
  g.strokeStyle = 'rgba(66,44,52,.5)'; g.lineWidth = 0.55; g.beginPath(); g.ellipse(x, y, r, r * 0.7, 0, 0, TAU); g.stroke(); }
function paintPath(v) {
  const c = pixels(S, S, (x, y) => { const n = vary(x, y, 51, v, 2, 4), m = vary(x, y, 52, v, 6, 3), q = vary(x, y, 55, v, 8, 2); let col = ramp(C.path, n * 0.8 + 0.12);
    col = mixc(col, [128, 92, 66], 0.26 * clamp((m - 0.46) * 3, 0, 1));          // trodden, darker ground
    col = mixc(col, [214, 182, 128], 0.2 * sm(clamp((q - 0.56) / 0.2, 0, 1)));           // dry dust
    return grain(col, x, y, 4); });
  const g = c.getContext('2d');
  scatter(34, 53, v, (X, Y, r1, r2) => dab(g, X, Y, 4 + r1 * 5, 1.4 + r2 * 1.4, 0.08, r1 < 0.5 ? 'rgba(222,190,138,.26)' : 'rgba(112,80,60,.2)'));
  scatter(14, 56, v, (X, Y, r1, r2) => { g.strokeStyle = 'rgba(96,66,52,.26)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(X - 3 - r1 * 3, Y); g.quadraticCurveTo(X, Y - 1 - r2, X + 3 + r1 * 3, Y + 0.4); g.stroke(); });   // scuffs
  scatterIn(15, 54, v, (X, Y, r1, r2) => pebbleW(g, X, Y, 0.9 + r1 * 1.3, r2 < 0.5), 5);
  return c; }
function paintSoil(v) {
  const c = pixels(S, S, (x, y) => { const u = x / S, w = y / S, n = vary(x, y, 65, v, 3, 2), a = vn(u, w, 4, 64);
    const ph = wrapI(y + (fbm(u, w, 62, 3, 2) - 0.5) * 7 + Math.sin(u * TAU * 2 + a * 4) * 1.2, 16) / 16, hgt = 0.5 - 0.5 * Math.cos(ph * TAU);   // ridge height 0..1
    let col = ramp(C.soil, 0.18 + hgt * 0.62 + (n - 0.5) * 0.28);
    if (ph > 0.62 && ph < 0.95) col = mixc(col, [70, 46, 58], 0.34 * Math.sin((ph - 0.62) / 0.33 * Math.PI));   // the furrow's cool shade
    if (ph > 0.1 && ph < 0.3) col = mixc(col, [196, 150, 104], 0.2 * (1 - Math.abs(ph - 0.2) / 0.1));         // sun on the ridge
    return grain(col, x, y, 5); });
  const g = c.getContext('2d');
  scatterIn(46, 63, v, (X, Y, r1, r2) => { const R = 1.1 + r1 * 1.6; dab(g, X + 0.6, Y + 0.8, R, R * 0.7, 0, 'rgba(48,30,42,.4)'); dab(g, X, Y, R, R * 0.72, 0, r2 < 0.5 ? '#86603f' : '#744d36'); dab(g, X - R * 0.3, Y - R * 0.3, R * 0.5, R * 0.3, 0, 'rgba(218,170,120,.7)'); }, 5);   // clods
  return c; }
function puddle(g, cx, cy, rx, ry, seed) { const sh = blob(cx, cy, rx, ry, seed, 32, 0.3, 5);
  g.fillStyle = 'rgba(108,84,84,.55)'; g.beginPath(); trace(g, offsetPts(sh, () => 1.5)); g.fill();                         // the wet rim
  g.save(); g.beginPath(); trace(g, sh); g.clip(); const gr = g.createLinearGradient(0, cy - ry, 0, cy + ry); gr.addColorStop(0, '#9fb6cc'); gr.addColorStop(1, '#c9d9e6'); g.fillStyle = gr; g.fillRect(cx - rx - 2, cy - ry - 2, rx * 2 + 4, ry * 2 + 4);
  g.fillStyle = 'rgba(86,96,150,.3)'; g.beginPath(); trace(g, shift(sh, 1.4, 1.4)); g.rect(cx - rx - 3, cy - ry - 3, rx * 2 + 6, ry * 2 + 6); g.fill('evenodd');   // shade under the near bank
  g.fillStyle = 'rgba(246,249,252,.7)'; crescent(g, cx - rx * 0.1, cy + ry * 0.3, rx * 0.7, ry * 0.14, 0.7); g.restore(); }
function paintFlats(v) {
  const c = pixels(S, S, (x, y) => { const u = x / S, w = y / S, n = vary(x, y, 71, v, 2, 4); let col = ramp(C.flats, n * 0.9 + 0.05);
    const r = w * 8 + (fbm(u, w, 74, 2, 3) - 0.5) * 2.6, fr = r - Math.floor(r);                           // wet ripple lines the tide left
    if (fr < 0.1) col = mixc(col, [226, 214, 196], 0.32); else if (fr < 0.26) col = mixc(col, [112, 96, 100], 0.16);
    return grain(col, x, y, 4); });
  const g = c.getContext('2d');
  { const R = mul(760 + v * 13), np = 2 + (R() < 0.5 ? 1 : 0); for (let i = 0; i < np; i++) { const rx = 8 + R() * 9, ry = 4.4 + R() * 4; puddle(g, rx + 8 + R() * (S - 2 * rx - 16), ry + 8 + R() * (S - 2 * ry - 16), rx, ry, 80 + v * 7 + i * 3); } }
  scatterIn(5, 73, v, (X, Y) => { g.strokeStyle = 'rgba(96,76,70,.75)'; g.lineWidth = 0.8; g.beginPath(); for (let k = 0; k < 14; k++) { const a = k * 0.9, r = 0.4 + k * 0.17; g.lineTo(X + Math.cos(a) * r, Y + Math.sin(a) * r); } g.stroke(); }, 10);   // worm casts
  return c; }
function paintWood(v) { /* four vertical planks of 6 game px, three tones, a seam to the right of each, cross seams here and there: the game's floor */
  const c = pixels(S, S, (x, y) => { const pi = Math.floor(x / 24), lx = x % 24, tone = h32(pi, v, 81, 1);
    let col = mixc([160, 114, 74], [190, 140, 92], tone); col = mixc(col, [126, 88, 58], 0.14 * vn(x / S, y / S * 0.3, 14, 82 + pi) + 0.1 * vn(x / S, y / S, 24, 83));
    const cs = h32(pi, v, 84, 2), cy = 14 + Math.floor(cs * 3) * 28 + h32(pi, v, 85, 2) * 14, dy = y - cy;
    if (cs < 0.66 && dy >= 0 && dy < 3.4) col = [96, 62, 46]; else if (cs < 0.66 && dy >= 3.4 && dy < 5.4) col = mixc(col, [236, 196, 140], 0.35); else if (cs < 0.66 && dy < 0 && dy > -6) col = kage(col, 0.4);
    if (lx >= 21.2) col = [96, 62, 46]; else if (lx < 3.4) col = mixc(col, [236, 196, 140], 0.28); else if (lx > 17) col = kage(col, 0.35);
    return grain(col, x, y, 6); });
  const g = c.getContext('2d'); for (let i = 0; i < 4; i++) { const R = mul(900 + i * 7 + v); for (let k = 0; k < 3; k++) { const X = i * 24 + 5 + R() * 12, Y = R() * S; g.strokeStyle = 'rgba(110,72,48,.35)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(X, Y); g.lineTo(X + (R() - 0.5) * 2, Y + 8 + R() * 10); g.stroke(); } } return c; }
function paintStone(v) {
  const c = pixels(S, S, (x, y) => { const row = Math.floor(y / 48), off = 0, col0 = Math.floor(wrapI(x + off, S) / 48), lx = wrapI(x + off, S) % 48, ly = y % 48;
    const tone = h32(col0, row, 91, v); let col = mixc([150, 148, 140], [186, 180, 166], tone); col = mixc(col, [128, 132, 140], 0.25 * vn(x / S, y / S, 6, 92 + v));
    if (lx < 2 || ly < 2) col = [88, 84, 98]; else if (lx < 4 || ly < 4) col = mixc(col, [230, 224, 208], 0.5); else if (lx > 44 || ly > 44) col = kage(col, 0.75); return grain(col, x, y, 8); });
  return c; }
const TERR = {}; const TPX = {};
/* a floor's seams and grout sit half on each side of the tile edge, so the tile is the same left and right, top and bottom */
const rollTile = (c, dx, dy) => { const o = mk(S, S), g = o.getContext('2d'); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) g.drawImage(c, dx + a * S, dy + b * S); return o; };
const terr = (name, v) => { const k = name + '_' + v; if (!TERR[k]) TERR[k] = ({ grass: paintGrass, sand: paintSand, path: paintPath, soil: paintSoil, flats: paintFlats, wood: v => rollTile(paintWood(v), 1, 0), stone: v => rollTile(paintStone(v), -1, -1) })[name](v); return TERR[k]; };
const terrPx = (name) => TPX[name] || (TPX[name] = terr(name, 0).getContext('2d').getImageData(0, 0, S, S).data);

/* ================= water (animated, 60 frames at 30 fps) ================= */
const WCACHE = {};
/* a crescent of light on the water: tapered at both ends, drawn wrapped so it can cross the tile edge */
function crescent(g, x, y, w, h, th) { g.beginPath(); g.moveTo(x - w / 2, y); g.quadraticCurveTo(x, y - h * 2, x + w / 2, y); g.quadraticCurveTo(x, y - h * 2 + th * 2, x - w / 2, y); g.closePath(); g.fill(); }
function waveMarks(g, seed, t, o) { for (let r = 0; r < o.rows; r++) for (let c = 0; c < o.cols; c++) { if (h32(c, r, seed, 1) > o.fill) continue;
    const x = (c + 0.5 + (r % 2) * 0.5 + (h32(c, r, seed, 2) - 0.5) * 0.6) * S / o.cols, y = (r + 0.5 + (h32(c, r, seed, 3) - 0.5) * 0.62) * S / o.rows;
    const u = (t + h32(c, r, seed, 4)) % 1, al = Math.pow(Math.sin(Math.PI * u), 1.5); if (al < 0.05) continue;
    const w = o.w[0] + h32(c, r, seed, 5) * (o.w[1] - o.w[0]), xx = x + (u - 0.5) * o.drift, h = w * (0.16 + 0.08 * h32(c, r, seed, 6)), th = o.th * (0.8 + 0.5 * h32(c, r, seed, 7));
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { const X = xx + ox, Y = y + oy; if (X < -w || X > S + w || Y < -h - 4 || Y > S + 4) continue;
      g.fillStyle = rgba(o.sh, 0.32 * al); crescent(g, X + 0.6, Y + 2.6, w * 1.04, h, th * 1.3);
      g.fillStyle = rgba(o.hi, 0.92 * al); crescent(g, X, Y, w, h, th); } } }
function water(kind, fi) { const k = kind + fi; if (WCACHE[k]) return WCACHE[k]; const t = fi / FR;
  let c;
  if (kind === 'deep') { c = pixels(S, S, (x, y) => { const u = x / S, w = y / S, n = fbm(u, w, 101, 2, 3);
      let col = ramp([[30, 86, 128], [40, 105, 148], [56, 126, 164]], n);
      const sw = vn3(u + t, w, t, 2, 2, 103); if (sw < 0.4) col = mixc(col, [24, 72, 116], 0.34 * (0.4 - sw) / 0.4 + 0.1);
      const lt = vn3(u - t, w, t, 3, 2, 105, 5); if (lt > 0.58) col = mixc(col, [92, 156, 190], 0.2 * (lt - 0.58) / 0.42);
      return grain(col, x, y, 3); });
    waveMarks(c.getContext('2d'), 131, t, { cols: 3, rows: 4, fill: 0.72, w: [13, 27], th: 1.4, drift: 7, hi: [222, 244, 246], sh: [18, 58, 104] }); }
  else { c = pixels(S, S, (x, y) => { const u = x / S, w = y / S, n = fbm(u, w, 111, 2, 3), sb = fbm(u, w, 112, 3, 3);
      let col = ramp([[72, 160, 172], [90, 180, 186], [112, 196, 194]], n); col = mixc(col, [150, 206, 182], 0.3 * sb);
      const cs = vn3(u + t, w, t, 4, 2, 113, 4); if (cs > 0.6) col = mixc(col, [190, 236, 218], 0.32 * (cs - 0.6) / 0.4);
      return grain(col, x, y, 3); });
    waveMarks(c.getContext('2d'), 141, t, { cols: 3, rows: 4, fill: 0.7, w: [10, 20], th: 1.2, drift: 6, hi: [236, 252, 244], sh: [40, 120, 140] }); }
  WCACHE[k] = c; return c; }
const waterPx = (kind, fi) => { const k = 'px' + kind + fi; return WCACHE[k] || (WCACHE[k] = water(kind, fi).getContext('2d').getImageData(0, 0, S, S).data); };

/* ================= edges: 16 corner masks per layer ================= */
/* bits: top-left 1, top-right 2, bottom-right 4, bottom-left 8 */
const LAYERS = { shallow: { over: 'deep', seed: 201, anim: true }, sand: { over: 'shallow', seed: 202, anim: true }, grass: { over: 'sand', seed: 203 }, path: { over: 'grass', seed: 204 }, flats: { over: 'sand', seed: 205 } };
const FIELD = {}, PHASE = {};
function field(layer, m) { const k = layer + m; if (FIELD[k]) return FIELD[k]; const f = new Float32Array(S * S), s = LAYERS[layer].seed;
  const TL = m & 1, TR = (m >> 1) & 1, BR = (m >> 2) & 1, BL = (m >> 3) & 1;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const u = (x + 0.5) / S, v = (y + 0.5) / S;
    const b = TL * (1 - u) * (1 - v) + TR * u * (1 - v) + BR * u * v + BL * (1 - u) * v; f[y * S + x] = b + (fbm(u, v, s, 2, 4) - 0.5) * 0.6; }
  return FIELD[k] = f; }
function phase(layer) { if (PHASE[layer]) return PHASE[layer]; const p = new Float32Array(S * S); for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) p[y * S + x] = fbm(x / S, y / S, 300 + LAYERS[layer].seed, 2, 2); return PHASE[layer] = p; }
const OV = {}, OVC = {};
function overlay(layer, m, fi) { const L = LAYERS[layer], key = layer + m, f = field(layer, m);
  if (!L.anim && OV[key]) return OV[key];
  const ck = key + '|' + fi; if (L.anim && OVC[ck]) return OVC[ck].c;
  const c = mk(S, S), g = c.getContext('2d'), im = g.createImageData(S, S), d = im.data, t = fi / FR;
  const put = (i, col, a) => { d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = a * 255; };
  const at = (x, y) => f[clamp(y, 0, S - 1) * S + clamp(x, 0, S - 1)];
  if (layer === 'grass' || layer === 'path' || layer === 'flats') { const src = terrPx(layer);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = y * S + x, v = f[i], a = clamp((v - 0.5) / 0.012 + 0.5, 0, 1);
      let col = [src[i * 4], src[i * 4 + 1], src[i * 4 + 2]];
      if (layer === 'grass') {
        if (v < 0.528) col = mixc(col, [52, 86, 50], 0.6 * (1 - (v - 0.5) / 0.028));          // the turf's dark lip
        const sh = a < 1 && at(x - 3, y - 3) > 0.5 ? 0.32 : 0;                             // it sits a little higher than the sand
        const fa = a + (1 - a) * sh; if (fa <= 0) { put(i, [0, 0, 0], 0); continue; }
        put(i, mixc([58, 60, 118], col, a / fa), fa);
      } else {
        if (v < 0.535) col = mixc(col, [124, 90, 60], 0.55 * (1 - (v - 0.5) / 0.035));
        if (layer === 'path' && at(x - 3, y - 3) < 0.5) col = kage(col, 0.7);                                   // grass casts onto the path
        put(i, col, a); } }
    g.putImageData(im, 0, 0);
    // blades along the edge, kept inside the tile
    if (layer !== 'flats') for (let y = 3; y < S - 3; y += 3) for (let x = 3; x < S - 3; x += 3) { const jx = x + (h32(x, y, 7, L.seed) - 0.5) * 2, jy = y + (h32(x, y, 8, L.seed) - 0.5) * 2, v = at(Math.round(jx), Math.round(jy));
      if (v > 0.47 && v < 0.53) { const gx = at(Math.round(jx) + 1, Math.round(jy)) - at(Math.round(jx) - 1, Math.round(jy)), gy = at(Math.round(jx), Math.round(jy) + 1) - at(Math.round(jx), Math.round(jy) - 1); const l = Math.hypot(gx, gy) || 1;
        const dir = layer === 'grass' ? -1 : 1, nx = gx / l * dir, ny = gy / l * dir, len = 2.5 + h32(x, y, 9, L.seed) * 3;
        g.fillStyle = '#4b7a3c'; g.beginPath(); g.moveTo(jx - ny * 1.1, jy + nx * 1.1); g.lineTo(jx + nx * len, jy + ny * len - 1); g.lineTo(jx + ny * 1.1, jy - nx * 1.1); g.fill();
        g.fillStyle = '#93bd58'; g.beginPath(); g.moveTo(jx - ny * 0.9 - 0.5, jy + nx * 0.9 - 0.6); g.lineTo(jx + nx * len - 0.6, jy + ny * len - 1.5); g.lineTo(jx - 0.4, jy - 0.6); g.fill(); } }
    OV[key] = c; return c; }
  const P = phase(layer);
  if (layer === 'sand') { const src = terrPx('sand');
    for (let i = 0; i < S * S; i++) { const v = f[i], x = i % S, y = (i / S) | 0, wf = 0.5 + 0.045 * Math.sin(TAU * (t + P[i] * 1.3));
      if (v > wf) { const a = clamp((v - wf) / 0.01 + 0.3, 0, 1); let col = [src[i * 4], src[i * 4 + 1], src[i * 4 + 2]];
        const wet = clamp(1 - (v - wf) / (0.585 - wf + 0.001), 0, 1); col = mixc(col, [168, 146, 112], 0.62 * wet);
        if (v - wf < 0.012) col = mixc(col, [250, 252, 246], 0.92); put(i, col, a); }
      else { const q = vn(x / S, y / S, 9, 211), q2 = vn(x / S + t, y / S, 7, 212);
        if (wf - v < 0.013 && q > 0.28) put(i, [248, 252, 246], 0.96);
        else if (Math.abs(v - (wf - 0.07)) < 0.006 && q2 > 0.5) put(i, [238, 248, 244], 0.72);
        else if (wf - v < 0.04) put(i, [214, 242, 238], 0.28);
        else put(i, [0, 0, 0], 0); } } }
  else { const src = waterPx('shallow', fi);
    for (let i = 0; i < S * S; i++) { const v = f[i]; let a = clamp((v - 0.47) / 0.07, 0, 1); a = Math.round(a * 3) / 3;
      let col = [src[i * 4], src[i * 4 + 1], src[i * 4 + 2]];
      const r = Math.abs(v - 0.505 - 0.01 * Math.sin(TAU * (t + P[i] * 2))); if (r < 0.006 && vn(i % S / S, (i / S | 0) / S, 8, 221) > 0.35) { col = [198, 238, 234]; a = Math.max(a, 0.8); }
      put(i, col, a); } }
  g.putImageData(im, 0, 0); OVC[ck] = { fi, c }; return c; }


/* ================= painterly helpers for the object painters (game px units, painted at Q) =================
   foliage: scalloped masses built from leaf clumps (dark underside, body, bright cap) like a gouache background
   rocks:   faceted planes shaded against the sun, cracks, moss, tufts at the foot
   ink:     coloured line, leaning to the local hue, instead of one black                                              */
const inkOf = (base, k = 0.55) => rgba(mixc(hx(INK), kage(hx(base), 1.1), k));
const mixh = (a, b, t) => mixc(hx(a), hx(b), t);

/* outline with rounded bumps (leaf masses) */
function scallop(cx, cy, rx, ry, seed, amp = 0.1, size = 2.6) {
  const R = mul(seed), N = Math.max(6, Math.round(Math.PI * (rx + ry) / size)), ph = R(), M = N * 5, out = [], am = Array.from({ length: N }, () => 0.55 + R() * 0.9);
  for (let i = 0; i < M; i++) { const a = i / M * TAU, u = a / TAU * N + ph, bi = Math.floor(u) % N, f = u - Math.floor(u), bump = Math.pow(Math.sin(f * Math.PI), 0.55);
    const k = 1 - amp * 0.55 + amp * am[bi] * bump + 0.04 * (vn(i / M, 0.37, 4, seed) * 2 - 1);
    out.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  return out; }

/* one leaf clump */
function clump(g, x, y, r, B, K, H, lit, seed, flat = 0.78) {
  const t = clamp(lit * 0.5 + 0.5, 0, 1), body = mixc(mixc(K, B, 0.34 + 0.66 * t), [210, 226, 120], 0.05 * t), sc = scallop(x, y, r, r * flat, seed, 0.2, 1.4);
  g.fillStyle = rgba(mixc(body, K, 0.55)); g.beginPath(); trace(g, shift(sc, r * 0.06, r * 0.22)); g.fill();
  g.fillStyle = rgba(body); g.beginPath(); trace(g, shift(sc, 0, -r * 0.05)); g.fill();
  if (lit > -0.4) { g.fillStyle = rgba(mixc(body, H, 0.22 + 0.55 * t)); g.beginPath(); trace(g, shift(scl(sc, 0.7, 0.5), -r * 0.18, -r * 0.36)); g.fill(); } }

/* a whole mass of foliage. blobs: ellipse-ish outlines (they sway with the caller); per = clumps per unit area */
function foliage(g, blobs, P, o: any = {}) {
  const B = hx(P.base), K = kage(B, 1.05), H = hx(P.hi || P.rim), seed = o.seed || 1, R = mul(seed * 17 + 3), per = o.per ?? 0.42, rr = o.r || [1.15, 2.1];
  const sil = blobs.map((b, i) => { const bb = bbox(b); return scallop(bb.cx, bb.cy, bb.rx, bb.ry, seed * 7 + i, o.amp ?? 0.085, o.size ?? 2.7); });
  cel(g, sil, P, Object.assign({ lx: -1.1, ly: -1.5, rim: 0.42, iw: 0.17, inkW: iwf(seed) }, o.cel || {}, { seed, hs: o.hs ?? 0.5, inkCol: inkOf(P.base, 0.6) }));
  let all = bbox(sil.flat());
  g.save(); g.beginPath(); for (const s of sil) trace(g, s); g.clip();
  const list = [];
  blobs.forEach((b, bi) => { const bb = bbox(b), n = Math.round(Math.PI * bb.rx * bb.ry * per / 3.2);
    for (let i = 0; i < n; i++) { const a = R() * TAU, d = Math.sqrt(R()) * 0.96, x = bb.cx + Math.cos(a) * bb.rx * d, y = bb.cy + Math.sin(a) * bb.ry * d;
      const px = (x - all.cx) / all.rx, py = (y - all.cy) / all.ry;
      list.push({ x, y, r: rr[0] + R() * (rr[1] - rr[0]), lit: clamp(px * LT[0] + py * LT[1] + (R() - 0.5) * 0.5, -1, 1), s: Math.floor(R() * 1e6) }); } });
  list.sort((a, b) => b.y - a.y);
  for (const c of list) clump(g, c.x, c.y, c.r, B, K, H, c.lit, c.s);
  // glints and a few leaf specks
  for (let i = 0; i < Math.round(list.length * 0.5); i++) { const c = list[(R() * list.length) | 0]; if (c.lit > 0.05) dab(g, c.x - c.r * 0.35, c.y - c.r * 0.5, c.r * 0.32, c.r * 0.18, -0.4, rgba(mixc(H, [255, 255, 224], 0.5), 0.8)); }
  g.restore(); return list; }
function bbox(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; } return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: (x1 - x0) / 2, ry: (y1 - y0) / 2 }; }

/* grass blades round a foot, to sit an object into the ground: little fans of tapered blades */
function tufts(g, x0, x1, y, seed, n = 8, h = 2.2) { const R = mul(seed), dk = ['#2f5a34', '#3a6638', '#456f3a'], lt = ['#7fae4c', '#93c25a', '#a7c862'];
  for (let i = 0; i < n; i++) { const x = x0 + (i + R() * 0.8) / n * (x1 - x0), k = 3 + ((R() * 3) | 0), sc = 0.65 + R() * 0.7;
    for (let j = 0; j < k; j++) { const a = (j - (k - 1) / 2) * 0.34 + (R() - 0.5) * 0.25, len = h * sc * (0.75 + R() * 0.5) * (1 - Math.abs(j - (k - 1) / 2) * 0.12), tx = x + Math.sin(a) * len + (R() - 0.5) * 0.3, ty = y - Math.cos(a) * len, bx = x + (j - (k - 1) / 2) * 0.28, w = 0.3;
      g.fillStyle = dk[(R() * 3) | 0]; g.beginPath(); g.moveTo(bx - w, y + 0.2); g.quadraticCurveTo(bx - w * 0.5 + Math.sin(a) * len * 0.35, y - len * 0.55, tx, ty); g.quadraticCurveTo(bx + w * 0.5 + Math.sin(a) * len * 0.35, y - len * 0.5, bx + w, y + 0.2); g.fill();
      g.fillStyle = lt[(R() * 3) | 0]; g.beginPath(); g.moveTo(bx - w, y + 0.2); g.quadraticCurveTo(bx - w * 0.5 + Math.sin(a) * len * 0.35 - 0.1, y - len * 0.55, tx - 0.05, ty + 0.1); g.quadraticCurveTo(bx - w * 0.1 + Math.sin(a) * len * 0.3, y - len * 0.4, bx, y); g.fill(); } } }

/* a rock made of planes: outline points + a high interior apex; each triangle takes its tone from how it faces the sun */
function rock(g, outline, apex, P, o: any = {}) {
  const B = hx(P.base), K = kage(B, 1.1), H = hx(P.hi || P.rim), Rm = hx(P.rim), seed = o.seed || 1, R = mul(seed * 5 + 1), n = outline.length, smooth = !!o.smooth;
  cel(g, [outline], P, { smooth, seed, ow: o.ow ?? 0.2, os: o.os ?? 0.34, rim: o.rimw ?? 0.45, lx: -0.6, ly: -0.9, hs: 0.01, inkCol: inkOf(P.base, 0.6), inner: false, iw: 0.15 });
  g.save(); g.beginPath(); trace(g, outline, smooth); g.clip();
  const tones = [mixc(K, SKY, 0.05), mixc(B, K, 0.62), mixc(B, K, 0.18), mixc(B, H, 0.16), mixc(B, H, 0.5), mixc(H, [255, 255, 245], 0.5)];
  const tris = [];
  for (let i = 0; i < n; i++) { const a = outline[i], b = outline[(i + 1) % n], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], q = [apex[0] + (m[0] - apex[0]) * (0.34 + R() * 0.2) + (R() - 0.5) * 1.2, apex[1] + (m[1] - apex[1]) * (0.34 + R() * 0.2) + (R() - 0.5) * 1.2];
    tris.push([apex, a, q], [q, a, b]); }
  const lit = (t) => { const c = [(t[0][0] + t[1][0] + t[2][0]) / 3, (t[0][1] + t[1][1] + t[2][1]) / 3]; let nx = c[0] - apex[0], ny = c[1] - apex[1] - 1.2; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l; return nx * LT[0] + ny * LT[1]; };
  for (const t of tris) { let l = lit(t) + (R() - 0.5) * 0.28; const low = (t[1][1] + t[2][1]) / 2 > (o.foot ?? 19.4) - 1.4; if (low) l -= 0.5;
    const ti = l > 0.78 ? 5 : l > 0.5 ? 4 : l > 0.2 ? 3 : l > -0.18 ? 2 : l > -0.55 ? 1 : 0;
    g.fillStyle = rgba(tones[ti]); g.beginPath(); trace(g, t, false); g.fill();
    g.strokeStyle = rgba(mixc(tones[ti], hx(INK), 0.35), 0.5); g.lineWidth = 0.12; g.lineJoin = 'round'; g.stroke(); }
  // strata and cracks
  g.lineCap = 'round'; for (let i = 0; i < (o.cracks ?? 3); i++) { let x = outline[(R() * n) | 0][0], y = apex[1] + R() * 4; g.strokeStyle = rgba(hx(INK), 0.55); g.lineWidth = 0.16; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 3; k++) { x += (R() - 0.35) * 2.2; y += 0.9 + R() * 1.6; g.lineTo(x, y); } g.stroke(); }
  g.lineCap = 'butt';
  for (let i = 0; i < 26; i++) { const x = apex[0] + (R() - 0.5) * o.w, y = apex[1] + R() * (o.h ?? 10); dab(g, x, y, 0.16 + R() * 0.2, 0.1 + R() * 0.1, R(), rgba(R() < 0.5 ? K : H, 0.35)); }
  g.restore(); }

/* moss patch with a few clumps, on top of something */
function moss(g, cx, cy, rx, ry, seed, col = '#5f8f40') {
  const P = pal(col, '#b4d46c', '#8cb458'), R = mul(seed);
  foliage(g, [blob(cx, cy, rx, ry, seed, 16, 0.15, 3)], P, { seed, r: [0.7, 1.1], per: 0.9, amp: 0.1, size: 1.6, cel: { ink: false, inner: false } }); }

/* ================= stone from a heightfield of planes =================
   each body is a convex lump (the lower envelope of planes tangent to an ellipsoid), seen from the front and above, cut flat at its base.
   Every pixel takes its tone from the plane it sits on, so the facets are real planes, the ridges between them are straight and the
   terminator is where the plane turns from the sun. Ink is grown from the finished silhouette (heavier away from the sun). */
function rockPix(g, spec) {
  const { bodies, P, x0 = 0, y0 = 0, w = 24, h = 24 } = spec, W = w * Q, H = h * Q, c = mk(W, H), cg = c.getContext('2d'), im = cg.createImageData(W, H), d = im.data;
  const B = hx(P.base), K = kage(B, 1.1), Hh = hx(P.hi || P.rim), Lt = (() => { const v = [-0.62, -0.64, 0.46], l = Math.hypot(...v); return v.map(x => x / l); })();
  const base3 = [[-1, 0.05, 0.34], [1, 0.05, 0.34], [0, -1, 0.42], [-0.62, -0.72, 0.5], [0.62, -0.72, 0.5], [0, -0.3, 1], [-0.5, -0.2, 0.85], [0.5, -0.2, 0.85], [-0.8, -0.35, 0.5], [0.8, -0.35, 0.5]];
  const bs = bodies.slice().sort((a, b) => a.base - b.base).map((b, bi) => { const R = mul((b.seed || 1) * 977 + bi * 31), pl = [];
    const dirs = base3.map(v => [v[0] + (R() - 0.5) * 0.45, v[1] + (R() - 0.5) * 0.45, v[2] + (R() - 0.5) * 0.25]); for (let i = 0; i < (b.extra ?? 3); i++) { const a = R() * TAU, dz = 0.25 + R() * 0.6; dirs.push([Math.cos(a) * (1 - dz * 0.5), Math.sin(a) * (1 - dz * 0.5) - 0.15, dz]); }
    for (const dv of dirs) { const l = Math.hypot(...dv), dx = dv[0] / l, dy = Math.min(dv[1] / l, 0.4), dz = Math.max(dv[2] / l, 0.12);
      const nx = dx / b.rx, ny = dy / b.ry, nz = dz / b.rz, nl = Math.hypot(nx, ny, nz), a = -nx / nz, bb = -ny / nz, c0 = 1 / nz;
      let lit = (nx * Lt[0] + ny * Lt[1] + nz * Lt[2]) / nl + (R() - 0.5) * (b.jit ?? 0.1); pl.push({ a, b: bb, c0, lit, nz: nz / nl, id: pl.length }); }
    return { b, pl }; });
  const idx = new Int16Array(W * H).fill(-1), litM = new Float32Array(W * H), hM = new Float32Array(W * H), nzM = new Float32Array(W * H);
  bs.forEach(({ b, pl }, bi) => { for (let py = 0; py < H; py++) { const Y = py / Q + y0; if (Y > b.base) break; const yr0 = Y - b.base;
    for (let px = 0; px < W; px++) { const X = px / Q + x0, wsd = (b.seed || 1), wx = (vn(X / 24, Y / 24, 5, wsd) - 0.5) * (spec.warp ?? 1.5), wy = (vn(X / 24, Y / 24, 5, wsd + 3) - 0.5) * (spec.warp ?? 1.5), xr = X - b.cx + wx; let best = 1e9, bp = null; for (const p of pl) { const z = p.c0 + p.a * xr + p.b * (yr0 + wy); if (z < best) { best = z; bp = p; } }
      if (best > 0) { const i = py * W + px; idx[i] = bi * 64 + bp.id; litM[i] = bp.lit; hM[i] = best; nzM[i] = bp.nz; } } } });
  const sn = spec.snow;
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) { const i = py * W + px; if (idx[i] < 0) continue; const Y = py / Q + y0, X = px / Q + x0;
    let l = litM[i] + (vn(X / 24, Y / 24, 9, 77) - 0.5) * 0.2 + (vn(X / 24, Y / 24, 22, 78) - 0.5) * 0.08; const b = bs[(idx[i] / 64) | 0].b;
    let bandN = 0; if (spec.strata) { const yy = Y + Math.sin(X * 0.9 + (b.seed || 1)) * 0.35 + Math.sin(X * 2.3) * 0.15; bandN = (Math.floor(yy / spec.strata) % 2) * 0.16 - 0.08; }
    // contact shade at the foot and a little warmth on the lit side
    const foot = clamp((Y - (b.base - 1.6)) / 1.6, 0, 1); l = l + bandN - foot * 0.38;
    const wm = [250, 236, 204]; let col = l > 0.86 ? mixc(mixc(Hh, wm, 0.25), [255, 255, 246], 0.45) : l > 0.68 ? mixc(mixc(B, Hh, 0.62), wm, 0.14) : l > 0.48 ? mixc(mixc(B, Hh, 0.26), wm, 0.08) : l > 0.28 ? B : l > 0.08 ? mixc(B, K, 0.42) : l > -0.1 ? mixc(B, K, 0.75) : K;
    if (sn && Y < sn.y + (b.seed % 3) * 0.2 + Math.sin(X * 1.7) * 0.5 && nzM[i] > 0.12) col = l > 0.35 ? [250, 252, 255] : l > 0.08 ? [226, 234, 246] : [176, 188, 222];
    const j = i * 4; d[j] = col[0]; d[j + 1] = col[1]; d[j + 2] = col[2]; d[j + 3] = 255; }
  // ridges between planes: a lit edge on the brighter facet, a dark line on the darker one
  const o = d.slice(); const E = 2;
  for (let py = E; py < H - E; py++) for (let px = E; px < W - E; px++) { const i = py * W + px; if (idx[i] < 0) continue; let nb = -1;
    for (const [ox, oy] of [[E, 0], [0, E], [-E, 0], [0, -E]]) { const k = (py + oy) * W + px + ox; if (idx[k] >= 0 && idx[k] !== idx[i]) { nb = k; break; } }
    if (nb < 0) continue; const mine = litM[i], theirs = litM[nb], j = i * 4, br = mine > theirs;
    const t = br ? 0.22 : 0.3, tc = br ? [255, 252, 238] : hx(INK); d[j] = o[j] + (tc[0] - o[j]) * t; d[j + 1] = o[j + 1] + (tc[1] - o[j + 1]) * t; d[j + 2] = o[j + 2] + (tc[2] - o[j + 2]) * t; }
  cg.putImageData(im, 0, 0);
  { const bl = mk(W, H), bg = bl.getContext('2d'); bg.filter = 'blur(' + (spec.round ?? 9) + 'px)'; bg.drawImage(c, 0, 0); const bd = bg.getImageData(0, 0, W, H).data;
    for (let i = 0; i < W * H; i++) { const j = i * 4, a = clamp((bd[j + 3] - 96) / 60, 0, 1) * 255; if (d[j + 3] === 0 && a > 0) { d[j] = bd[j]; d[j + 1] = bd[j + 1]; d[j + 2] = bd[j + 2]; } d[j + 3] = a; }
    cg.putImageData(im, 0, 0); }
  // ink grown from the silhouette
  const mask = mk(W, H), mg = mask.getContext('2d'); mg.drawImage(c, 0, 0); mg.globalCompositeOperation = 'source-in'; mg.fillStyle = rgba(mixc(hx(INK), kage(B, 1.1), 0.22)); mg.fillRect(0, 0, W, H);
  const ow = spec.ow ?? 0.24, hv = spec.heavy ?? 0.5;
  for (let k = 0; k < 20; k++) { const a = k / 20 * TAU; g.drawImage(mask, x0 + Math.cos(a) * ow, y0 + Math.sin(a) * ow, w, h); }
  for (let k = 1; k <= 4; k++) g.drawImage(mask, x0 - LT[0] * hv * k / 4, y0 - LT[1] * hv * k / 4, w, h);
  g.drawImage(c, x0, y0, w, h);
  return { idx, W, H }; }

/* ================= gouache finish =================
   one static paper-and-brush texture (blotches, streaks leaning with the light, fine tooth) laid in soft light over every painted piece,
   masked to the piece, so ink, tone and texture agree from a stone to a sleeve. It never moves, so nothing shimmers. */
let TEXC = null;
function texCanvas() {
  if (TEXC) return TEXC; const N = 768, c = mk(N, N), g = c.getContext('2d'), im = g.createImageData(N, N), d = im.data, seed = 4242;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const u = x / N, v = y / N;
    // streaks run along 35 degrees: sample an anisotropic lattice in rotated coordinates
    const ca = Math.cos(0.61), sa = Math.sin(0.61), su = (u * ca + v * sa), sv = (-u * sa + v * ca), wu = ((su % 1) + 1) % 1, wv = ((sv % 1) + 1) % 1;
    const blot = fbm(u, v, seed, 3, 3), st = vn(wu, wv, 6, seed + 5) * 0.55 + vn(wu, wv, 14, seed + 9) * 0.45, tooth = vn(u, v, 192, seed + 3);
    const val = 128 + ((blot - 0.5) * 70 + (vn3(wv, wu, 0, 3, 1, seed + 11, 40) - 0.5) * 58 + (st - 0.5) * 26 + (tooth - 0.5) * 34), i = (y * N + x) * 4;
    d[i] = d[i + 1] = d[i + 2] = clamp(val, 0, 255); d[i + 3] = 255; }
  g.putImageData(im, 0, 0); return TEXC = c; }
function texturize(c, k = 1, o: any = {}) {
  const W = c.width, H = c.height, t = texCanvas(), m = mk(W, H), mg = m.getContext('2d');
  const sc = o.scale ?? 1, ox = ((o.ox ?? 0) % 1) * 768, oy = ((o.oy ?? 0) % 1) * 768;
  for (let y = -oy; y < H; y += 768 * sc) for (let x = -ox; x < W; x += 768 * sc) mg.drawImage(t, x, y, 768 * sc, 768 * sc);
  mg.globalCompositeOperation = 'destination-in'; mg.drawImage(c, 0, 0);
  const g = c.getContext('2d'); g.save(); g.globalCompositeOperation = o.mode || 'soft-light'; g.globalAlpha = clamp(k, 0, 1); g.drawImage(m, 0, 0); g.restore();
  if (k > 1) { g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = clamp(k - 1, 0, 1); g.drawImage(m, 0, 0); g.restore(); }
  return c; }

/* ================= materials =================
   wood: boards with grain, knots, seams and nails, shaded away from the sun; logs as tubes with end grain
   stone: courses of blocks, each bevelled and lit on its own, with chips and mortar in shadow                   */
const WDP = { oak: pal('#8a5a34', '#e6b27a', '#b07a48'), dark: pal('#5d4252', '#b08a7c', '#8a6141'), pale: pal('#b4845a', '#f0cf9c', '#d2a874'), grey: pal('#7a6a5a', '#cdb8a0', '#9a8670') };
function wood(g, x, y, w, h, o: any = {}) {
  const P = o.P || WDP.oak, vert = o.dir ? o.dir === 'v' : h >= w, seed = o.seed || 1, R = mul(seed * 31 + Math.round(x * 7 + y * 13)), B = hx(P.base), K = kage(B, 1.1);
  const shape = o.shape || rect(x, y, w, h);
  if (o.plain) { g.fillStyle = P.base; g.beginPath(); trace(g, shape, false); g.fill(); } else c24(g, [shape], P, { smooth: false, seed, hs: 0.01, lx: -0.3, ly: -0.4, rim: o.rim ?? 0.38, iw: 0.14 });
  g.save(); g.beginPath(); trace(g, shape, false); g.clip();
  const n = o.planks || (vert ? Math.max(1, Math.round(w / 3.6)) : Math.max(1, Math.round(h / 3.6))), pw = (vert ? w : h) / n;
  for (let i = 0; i < n; i++) { const p0 = (vert ? x : y) + i * pw, tone = (R() - 0.5) * 0.14; g.fillStyle = tone > 0 ? `rgba(255,236,200,${tone})` : `rgba(60,40,70,${-tone * 1.4})`; if (vert) g.fillRect(p0, y, pw, h); else g.fillRect(x, p0, w, pw);
    // shade away from the sun along the far edge of each board, a light edge on the sunny one
    const sh = rgba(mixc(K, SKY, 0.2), 0.34); g.fillStyle = sh; if (vert) g.fillRect(p0 + pw * 0.72, y, pw * 0.28, h); else g.fillRect(x, p0 + pw * 0.74, w, pw * 0.26);
    g.fillStyle = rgba(hx(P.rim), 0.32); if (vert) g.fillRect(p0 + 0.12, y, 0.38, h); else g.fillRect(x, p0 + 0.12, w, 0.34);
    // grain
    const nl = Math.max(2, Math.round(pw / 0.8)); for (let k = 0; k < nl; k++) { const q = p0 + (k + 0.3 + R() * 0.5) / nl * pw, len = (vert ? h : w), a0 = R() * len * 0.3, a1 = a0 + len * (0.35 + R() * 0.6), wob = (R() - 0.5) * 0.7;
      g.strokeStyle = R() < 0.72 ? rgba(mixc(K, hx('#2a1a24'), 0.5), 0.2 + R() * 0.2) : rgba(hx(P.rim), 0.22); g.lineWidth = 0.09 + R() * 0.1; g.lineCap = 'round'; g.beginPath();
      const s0 = (vert ? y : x) + a0, s1 = (vert ? y : x) + Math.min(a1, len); if (vert) { g.moveTo(q, s0); g.quadraticCurveTo(q + wob, (s0 + s1) / 2, q + wob * 0.3, s1); } else { g.moveTo(s0, q); g.quadraticCurveTo((s0 + s1) / 2, q + wob, s1, q + wob * 0.3); } g.stroke(); }
    // seam
    if (i > 0) { g.strokeStyle = rgba(hx(INK), 0.6); g.lineWidth = 0.2; g.beginPath(); if (vert) { g.moveTo(p0, y); g.lineTo(p0, y + h); } else { g.moveTo(x, p0); g.lineTo(x + w, p0); } g.stroke(); }
    // knot
    if (R() < (o.knots ?? 0.45) && pw > 1.8) { const kx = vert ? p0 + pw * (0.3 + R() * 0.4) : x + w * (0.15 + R() * 0.7), ky = vert ? y + h * (0.15 + R() * 0.7) : p0 + pw * (0.3 + R() * 0.4); for (let r = 3; r >= 1; r--) { g.strokeStyle = rgba(K, 0.28 + r * 0.05); g.lineWidth = 0.1; g.beginPath(); g.ellipse(kx, ky, 0.35 * r * (vert ? 0.7 : 1.3), 0.35 * r * (vert ? 1.3 : 0.7), 0, 0, TAU); g.stroke(); } dab(g, kx, ky, 0.3, 0.3, 0, rgba(hx('#2a1a24'), 0.7)); }
    // nails
    if (o.nails !== false && (vert ? h : w) > 4) for (const e of [0.9, (vert ? h : w) - 0.9]) { const nx = vert ? p0 + pw / 2 : x + e, ny = vert ? y + e : p0 + pw / 2; dab(g, nx, ny, 0.24, 0.24, 0, rgba(hx(INK), 0.85)); dab(g, nx - 0.06, ny - 0.07, 0.09, 0.09, 0, 'rgba(255,255,255,.6)'); } }
  g.restore(); }

/* a log lying along x, end grain at the right (rotate the context for other angles) */
function logPiece(g, x, y, len, r, P = WDP.oak, seed = 1) {
  const R = mul(seed * 13 + 5), B = hx(P.base), K = kage(B, 1.1), body = [[x, y - r], [x + len, y - r], [x + len, y + r], [x, y + r]];
  c24(g, [body], P, { smooth: false, seed, hs: 0.01, lx: -0.2, ly: -0.5, rim: 0.3, iw: 0.14 });
  g.save(); g.beginPath(); trace(g, body, false); g.clip();
  g.fillStyle = rgba(mixc(K, SKY, 0.2), 0.42); g.fillRect(x, y + r * 0.25, len, r * 0.9); g.fillStyle = rgba(hx(P.rim), 0.5); g.fillRect(x, y - r * 0.92, len, r * 0.34); g.fillStyle = rgba(hx(P.hi || P.rim), 0.3); g.fillRect(x, y - r * 0.5, len, r * 0.22);
  for (let k = 0; k < Math.round(len * 1.3); k++) { const px = x + R() * len, q = y + (R() - 0.5) * r * 1.8, l = 0.8 + R() * 2.4; g.strokeStyle = rgba(mixc(K, hx('#2a1a24'), 0.5), 0.22 + R() * 0.2); g.lineWidth = 0.1; g.beginPath(); g.moveTo(px, q); g.lineTo(px + l, q + (R() - 0.5) * 0.3); g.stroke(); }
  g.restore();
  // end grain
  const ex = x + len, er = r; g.fillStyle = rgba(mixc(hx(INK), K, 0.3)); g.beginPath(); g.ellipse(ex, y, er * 0.52 + 0.14, er + 0.14, 0, 0, TAU); g.fill();
  g.fillStyle = rgba(mixc(hx(P.rim), [255, 236, 190], 0.4)); g.beginPath(); g.ellipse(ex, y, er * 0.52, er, 0, 0, TAU); g.fill();
  for (let k = 1; k <= 3; k++) { g.strokeStyle = rgba(mixc(B, K, 0.3), 0.55); g.lineWidth = 0.1; g.beginPath(); g.ellipse(ex + 0.05, y, er * 0.52 * k / 3.4, er * k / 3.4, 0, 0, TAU); g.stroke(); }
  dab(g, ex, y, 0.14, 0.2, 0, rgba(K, 0.8)); }

/* courses of stone blocks inside a shape */
function stoneBlocks(g, shape, o: any = {}) {
  const bb = bbox(shape), P = o.P || pal('#8d939a', '#e2e4dc', '#b4b8ba'), seed = o.seed || 1, R = mul(seed * 19 + 3), B = hx(P.base), K = kage(B, 1.1), Hh = hx(P.hi || P.rim), ch = o.course || 3.6, bw = o.bw || 5;
  c24(g, [shape], P, { smooth: false, seed, hs: 0.01, lx: -0.3, ly: -0.5, rim: o.rim ?? 0.4, iw: 0.15 });
  g.save(); g.beginPath(); trace(g, shape, false); g.clip();
  let row = 0; for (let y = bb.y0; y < bb.y1; y += ch, row++) { const hh = Math.min(ch, bb.y1 - y); let x = bb.x0 - (row % 2 ? bw * 0.5 : 0) + (R() - 0.5) * 1; while (x < bb.x1) { const w = bw * (0.7 + R() * 0.7), bx = x + 0.12, by = y + 0.12, bw2 = w - 0.24, bh = hh - 0.24, tone = R();
      g.fillStyle = rgba(mixc(mixc(B, K, 0.15), mixc(B, Hh, 0.35), tone)); g.fillRect(bx, by, bw2, bh);
      g.fillStyle = rgba(Hh, 0.5); g.fillRect(bx, by, bw2, 0.3); g.fillRect(bx, by, 0.28, bh);                                   // bevel on the sunny edges
      g.fillStyle = rgba(mixc(K, SKY, 0.15), 0.6); g.fillRect(bx, by + bh - 0.42, bw2, 0.42); g.fillRect(bx + bw2 - 0.4, by, 0.4, bh);   // and in shade on the others
      for (let k = 0; k < 3; k++) dab(g, bx + R() * bw2, by + R() * bh, 0.16 + R() * 0.2, 0.1 + R() * 0.12, R(), rgba(R() < 0.5 ? K : Hh, 0.4));
      if (R() < 0.3) { g.strokeStyle = rgba(hx(INK), 0.4); g.lineWidth = 0.1; g.beginPath(); const cx = bx + R() * bw2; g.moveTo(cx, by); g.lineTo(cx + (R() - 0.5) * 1, by + bh * 0.5); g.lineTo(cx + (R() - 0.5) * 1.4, by + bh * 0.9); g.stroke(); }
      g.strokeStyle = rgba(hx(INK), 0.55); g.lineWidth = 0.17; g.strokeRect(x, y, w, hh); x += w; } }
  g.restore(); }

/* a log seen end on: bark ring, rings of growth, a check in the grain */
function endGrain(g, x, y, r, seed = 1) {
  const R = mul(seed * 7 + 2); g.fillStyle = rgba(hx(INK)); g.beginPath(); g.arc(x, y, r + 0.24, 0, TAU); g.fill();
  g.fillStyle = '#6a4630'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.fillStyle = '#4a3024'; g.beginPath(); g.arc(x + r * 0.12, y + r * 0.14, r, 0, Math.PI * 1.1); g.arc(x, y, r * 0.84, Math.PI * 1.1, 0, true); g.fill();
  g.fillStyle = '#d9b27c'; g.beginPath(); g.arc(x, y, r * 0.8, 0, TAU); g.fill(); g.fillStyle = '#e8c890'; g.beginPath(); g.arc(x - r * 0.12, y - r * 0.14, r * 0.6, 0, TAU); g.fill();
  for (let k = 1; k <= 3; k++) { g.strokeStyle = rgba(hx('#a5754a'), 0.7); g.lineWidth = 0.1; g.beginPath(); g.arc(x + (R() - 0.5) * 0.12, y + (R() - 0.5) * 0.12, r * 0.8 * k / 3.3, 0, TAU); g.stroke(); }
  const a = R() * TAU; g.strokeStyle = rgba(hx('#6a4630'), 0.75); g.lineWidth = 0.13; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78); g.stroke(); dab(g, x, y, 0.16, 0.16, 0, '#8a5a34');
  dab(g, x - r * 0.38, y - r * 0.42, r * 0.22, r * 0.12, -0.7, 'rgba(255,246,220,.7)'); }

/* ================= game geometry =================
   The game draws on a 24 px grid. Every painter below works in those 24 px units (the same numbers the game uses:
   a tree's trunk base is at (12, 22.6)), and the page paints it 4x larger, at 96 px, so the line stays crisp. */
const Q = 4, TP = 24 * Q;                  // sprites are painted at 8x (192 px a tile); the ground stays at S = 96
function g24(g, fn) { g.save(); g.scale(Q, Q); fn(g); g.restore(); }
const iwf = (seed = 1, b = 0.3, h = 0.5) => inkW(b, h, seed);
const c24 = (g, shapes, P, o: any = {}) => cel(g, shapes, P, Object.assign({ lx: -1.1, ly: -1.5, rim: 0.42, iw: 0.17, inkW: iwf(o.seed || 1), inkCol: inkOf(P.base, 0.55) }, o));
const poly24 = (g, pts, fill, w = 0.42) => { inkPoly(g, pts, w); fillPoly(g, pts, fill); };
const ln = (g, x1, y1, x2, y2, col, w = 0.5, cap = 'round') => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = cap; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.lineCap = 'butt'; };
const tw = (t, k = 1, ph = 0) => Math.sin(TAU * (t * k) - ph);
const twos = t => Math.floor(t * FR / 2) * 2 / FR;
function marks(g, n, seed, x0, y0, w, h, cols, rx = 0.9, ry = 0.45) { const R = mul(seed); for (let i = 0; i < n; i++) dab(g, x0 + R() * w, y0 + R() * h, rx * (0.6 + R() * 0.8), ry * (0.6 + R() * 0.8), (R() - 0.5) * 1.2, cols[(R() * cols.length) | 0]); }
function glow24(g, x, y, r, col, a) { g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(x, y, 0.2, x, y, r); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore(); }

/* ================= trees ================= */
const TPAL = { round: pal('#5f9438', '#d2e886', '#9cc860'), dark: pal('#3a6633', '#8fbf62', '#6a9a4a'), flower: pal('#62973a', '#d6ea8a', '#a2cc64'),
  pine: pal('#3f7a46', '#b4dc9c', '#77ad6f'), oldpine: pal('#2c5a4a', '#8cc2b2', '#5a8c78') };
const WOOD = pal('#7a5232', '#e0aa70', '#9c6e44');
function trunk24(g, cx, base, top, wid, sx = 0) { const hw = wid / 2, pts = [[cx - hw - 1.5, base + 0.5], [cx - hw - 0.5, base - 0.8], [cx - hw - 0.05, base - 3.2], [cx - wid * 0.42 + sx * 0.3, top], [cx + wid * 0.42 + sx * 0.3, top], [cx + hw + 0.05, base - 3.2], [cx + hw + 0.55, base - 0.8], [cx + hw + 1.6, base + 0.5]];
  c24(g, [pts], WOOD, { smooth: false, seed: 5, hs: 0.3, lx: -0.7, ly: -0.5 });
  g.save(); g.beginPath(); trace(g, pts, false); g.clip(); const R = mul(7 + Math.round(cx));
  for (let i = 0; i < 6; i++) { const x = cx - hw + 0.4 + R() * (wid - 0.4), y0 = top + R() * 2, y1 = y0 + 3 + R() * (base - top - 4); g.strokeStyle = rgba(hx('#3a2630'), 0.5); g.lineWidth = 0.13 + R() * 0.12; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y0); g.quadraticCurveTo(x + (R() - 0.5) * 0.8, (y0 + y1) / 2, x + (R() - 0.5) * 0.6, y1); g.stroke(); }
  g.strokeStyle = 'rgba(236,190,130,.55)'; g.lineWidth = 0.2; g.beginPath(); g.moveTo(cx - hw + 0.55, top + 1); g.lineTo(cx - hw + 0.3, base - 2); g.stroke();
  g.fillStyle = 'rgba(70,74,150,.28)'; g.beginPath(); g.moveTo(cx + 0.2, top); g.lineTo(cx + hw + 1.8, top); g.lineTo(cx + hw + 1.8, base + 1); g.lineTo(cx + 0.7, base + 1); g.fill(); g.restore(); tufts(g, cx - hw - 1.6, cx + hw + 1.6, base + 0.6, 12 + Math.round(cx), 4, 1.6); }
function tree24(g, t, kind, v) {
  const sw = tw(t) * 0.5, sw2 = tw(t, 1, 0.9) * 0.7, R = mul(v * 31 + kind.length * 7);
  shadowE(g, 13, 22, 9.4, 2.5);
  if (kind === 'pine' || kind === 'oldpine') { const old = kind === 'oldpine', tiers = old ? 4 : 3, P = TPAL[kind], B = hx(P.base), K = kage(B, 1.05), H = hx(P.hi || P.rim); trunk24(g, 12, 22.6, old ? 18 : 17, old ? 2.2 : 2.4);
    for (let k = 0; k < tiers; k++) { const y = (old ? 18.6 : 18) - k * (old ? 4.3 : 5), w = (old ? 8.6 : 9.6) - k * (old ? 1.8 : 2.5), h = old ? 5.8 : 6.6, sx = sw * (k + 1) * 0.3 + (v % 2 ? 0.3 : -0.2) * k, R = mul(500 + k * 13 + v * 7);
      const pts = [[12 + sx, y - h], [12 + w * 0.3 + sx * 0.7, y - h * 0.66], [12 + w * 0.42 + sx * 0.6, y - h * 0.52], [12 + w * 0.58 + sx * 0.45, y - h * 0.3], [12 + w * 0.8 + sx * 0.3, y - 0.9], [12 + w, y + 0.8]];
      const nz = 6; for (let i = 1; i < nz; i++) { const u = i / nz; pts.push([12 + w - u * 2 * w + (R() - 0.5) * 0.6, y + 1.0 + (i % 2 ? 1.5 : 0.2) + R() * 0.5]); }
      pts.push([12 - w, y + 0.8], [12 - w * 0.8 + sx * 0.3, y - 0.9], [12 - w * 0.58 + sx * 0.45, y - h * 0.3], [12 - w * 0.42 + sx * 0.6, y - h * 0.52], [12 - w * 0.3 + sx * 0.7, y - h * 0.66]);
      c24(g, [pts], P, { smooth: false, seed: 10 + k, hs: 0.01, lx: -0.9, ly: -1.3, rim: 0.5, cel: {} });
      g.save(); g.beginPath(); trace(g, pts, false); g.clip();
      g.fillStyle = 'rgba(60,64,150,.3)'; g.beginPath(); g.moveTo(12 + sx + 0.4, y - h); g.lineTo(12 + w + 1, y + 2); g.lineTo(12 + 0.5, y + 2); g.fill();
      // sprays of needles fanning down and out along each tier, lit on the sunny side
      for (let r = 0; r < 4; r++) for (let s2 = -1; s2 <= 1; s2 += 2) { const yy = y - h * 0.62 + r * (h * 0.5) / 3 + 0.3, ww = (w * 0.3 + (yy - (y - h)) / h * w * 0.7) ; for (let q = 0; q < 4; q++) { const x = 12 + s2 * (ww * (0.2 + q * 0.2) + R() * 0.6), y2 = yy + q * 0.35 + R() * 0.4, a = s2 * (0.8 + R() * 0.4), l = 1.4 + R() * 1.1; const lit = s2 < 0 ? 0.55 : 0.2;
          g.strokeStyle = rgba(mixc(K, hx('#10281e'), 0.3), 0.55); g.lineWidth = 0.22; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y2); g.lineTo(x + Math.sin(a) * l, y2 + Math.cos(a) * l * 0.8); g.stroke(); g.strokeStyle = rgba(mixc(B, H, lit + 0.2), 0.7); g.lineWidth = 0.16; g.beginPath(); g.moveTo(x - 0.2, y2 - 0.2); g.lineTo(x - 0.2 + Math.sin(a) * l * 0.8, y2 - 0.2 + Math.cos(a) * l * 0.65); g.stroke(); } }
      g.restore(); g.fillStyle = rgba(K, 0.5); g.beginPath(); g.ellipse(12 + sx * 0.5, y + 2.4, w * 0.8, 0.9, 0, 0, TAU); g.fill(); }
    return; }
  trunk24(g, 12, 22.6, 13.5, 2.8);
  const sets = [[[12, 11.4, 7.4, 5.4, 0.4], [6.6, 11, 5, 4.2, 0.5], [17.6, 11.2, 5, 4.2, 0.5], [8.2, 6.2, 5.4, 4.5, 0.8], [15.8, 6.6, 5.4, 4.5, 0.8], [12, 4.6, 5.8, 4.4, 1]],
    [[12, 11.8, 7.8, 5.2, 0.4], [5.8, 10.6, 4.6, 4, 0.5], [18.4, 11, 4.8, 4.2, 0.5], [9, 7, 6, 4.8, 0.8], [16, 6.2, 5.4, 4.4, 0.8], [11, 4.2, 5, 3.8, 1]],
    [[12, 11, 7.6, 5.6, 0.4], [7, 12, 4.8, 3.8, 0.5], [17.4, 12.2, 4.8, 3.8, 0.5], [7.6, 6.6, 5, 4.4, 0.8], [16.6, 6.2, 5.2, 4.6, 0.8], [12.4, 4.4, 5.4, 4.2, 1]]][v % 3];
  const L = sets.map(([x, y, rx, ry, d], i) => blob(x + sw2 * d, y + (R() - 0.5) * 0.5, rx, ry, v * 5 + i + 1, 30, 0.12, 5));
  foliage(g, L, TPAL[kind], { seed: 3 + v, r: [1.3, 2.5], per: 0.36 });
  g.fillStyle = 'rgba(60,64,150,.34)'; g.beginPath(); g.ellipse(12.6, 15.4, 4, 1.1, 0, 0, TAU); g.fill();
  if (kind === 'flower') { const F = mul(55 + v); for (let i = 0; i < 9; i++) { const a = F() * TAU, d = F() * 0.85; const x = 12 + Math.cos(a) * 8 * d + sw2 * 0.6, y = 8.4 + Math.sin(a) * 5.2 * d; dab(g, x, y, 0.95, 0.85, 0, '#fff8ea'); dab(g, x, y, 0.4, 0.4, 0, '#f2c94c'); } } }

/* ================= rocks, bushes, nodes, crags ================= */
function boulder24(g, v) { shadowE(g, 13, 20.6, 10.8, 2.5);
  const rx = 9.6 + (v % 2) * 0.8, ry = 13 - (v % 3) * 1.1, base = 20.4, cx = 12 + (v === 2 ? 0.6 : 0);
  rockPix(g, { bodies: [{ cx, base, rx, ry, rz: 8 + v % 2, seed: 20 + v * 3, extra: 3 }], P: pal('#8e949c', '#eef0e6', '#c4c9cc') });
  if (v % 2 === 0) moss(g, 14.6 - (v ? 4 : 0), base - ry + 2.8, 2.8, 1.25, 5 + v);
  tufts(g, 2.4, 21.6, base + 0.3, 70 + v, 11, 2.3); }
function bush24(g, t, v, berries, state = 2) { const sw = tw(t, 1, v) * 0.28; shadowE(g, 13, 20.4, 10.4, 2.4);
  const set = [[[13, 13, 7, 5.6], [7.4, 14, 5, 4.2], [18.6, 14.2, 5, 4.2], [10, 9, 5.2, 4.4], [16, 9.4, 5.2, 4.4]], [[13, 13.4, 7.6, 5.2], [6.8, 13.6, 4.4, 4], [19, 14, 4.6, 4.2], [11, 9, 5.6, 4.6], [16.6, 9.6, 4.6, 4]]][v % 2];
  foliage(g, set.map(([x, y, rx, ry], i) => blob(x + sw * (1 - y / 20), y, rx, ry, 70 + v * 5 + i, 26, 0.12, 5)), TPAL.round, { seed: 30 + v, r: [1.0, 1.8] });
  if (berries) { const n = [0, 3, 7][state]; const R = mul(33 + v); for (let i = 0; i < n; i++) { const x = 6 + R() * 14, y = 8 + R() * 8; dab(g, x, y, 1.15, 1.15, 0, INK); dab(g, x, y, 0.95, 0.95, 0, '#cf2f4a'); dab(g, x - 0.3, y - 0.3, 0.3, 0.3, 0, '#ffd0d6'); } } }
function herb24(g, t, v, state = 2) { shadowE(g, 12.6, 19.8, 8.2, 2);
  const R = mul(21 + v), n = [0, 4, 9][state], N = 7;
  for (let i = 0; i < N; i++) { const x = 5.4 + i * 2.2 + (R() - 0.5) * 0.8, h = 5.4 + R() * 4.6 + state * 1.2, sw = tw(t, 1, i * 0.5) * 0.4, a = (R() - 0.5) * 0.5;
    for (let k = 0; k < 2; k++) { const s = k ? 1 : -1, L = h * (0.6 + R() * 0.4), tx = x + a * 3 + sw + s * (1 + R() * 1.4), ty = 20 - L; g.fillStyle = INK; g.beginPath(); g.moveTo(x - 0.45, 20.2); g.quadraticCurveTo(x + s * 1.4, 20 - L * 0.45, tx + 0.1, ty - 0.1); g.quadraticCurveTo(x + s * 0.3, 20 - L * 0.55, x + 0.45, 20.2); g.fill();
      g.fillStyle = i % 2 ? '#3d6a38' : '#4a7a3c'; g.beginPath(); g.moveTo(x - 0.3, 20.1); g.quadraticCurveTo(x + s * 1.2, 20 - L * 0.46, tx, ty); g.quadraticCurveTo(x + s * 0.4, 20 - L * 0.56, x + 0.3, 20.1); g.fill(); g.fillStyle = '#8cc058'; g.beginPath(); g.moveTo(x - 0.25, 20.05); g.quadraticCurveTo(x + s * 1.0, 20 - L * 0.46, tx - 0.05, ty + 0.2); g.quadraticCurveTo(x + s * 0.2, 20 - L * 0.5, x - 0.05, 20); g.fill(); } }
  tufts(g, 4, 20, 20.2, 22 + v, 6, 2.2);
  for (let i = 0; i < n; i++) { const x = 5.5 + R() * 13, y = 7.6 + R() * 6, k = tw(t, 1, i) * 0.3; ln(g, x + k, y, x + k * 0.5, y + 4.4, '#4a7a3a', 0.2); for (let p = 0; p < 5; p++) { const a = p / 5 * TAU + 0.3; dab(g, x + k + Math.cos(a) * 0.9, y + Math.sin(a) * 0.8, 0.8, 0.6, a, '#b06ad0'); dab(g, x + k + Math.cos(a) * 1, y + Math.sin(a) * 0.9 - 0.1, 0.5, 0.34, a, '#d4a0ec'); } dab(g, x + k, y, 0.45, 0.45, 0, '#f4d86a'); } }
function crag24(g, v) { const R = mul(300 + v), pk = 7 + R() * 9, ph = 2 + v * 1.6; shadowE(g, 13, 21.8, 11.6, 2.8);
  const base = 21.4, snow = ph < 4.5;
  rockPix(g, { bodies: [{ cx: pk, base, rx: 5.6, ry: (base - ph) / 1.12, rz: 5.5, seed: 40 + v, extra: 2, jit: 0.16 }, { cx: pk + 6.2 + R(), base, rx: 5, ry: 8 + R() * 3.5, rz: 5, seed: 50 + v, extra: 2 }, { cx: pk - 6.4 - R(), base, rx: 5.2, ry: 6.5 + R() * 4, rz: 5, seed: 60 + v, extra: 2 }],
    P: pal('#82848c', '#f2f0e4', '#c8ccc8'), strata: 2.4, snow: snow ? { y: ph + 4.6 } : null, round: 4 });
  tufts(g, 1.4, 22.6, base + 0.3, 90 + v, 12, 2.2); }

/* ================= camp: tent, lamp, stalls, fire ================= */
const TENTC = ['#e6d3a3', '#cfdcb4', '#e7c3a4', '#c3d2e2'];
function tent24(g, t, v) { const col = TENTC[v % 4], C = hx(col), K = kage(C, 1), Hh = mixc(C, [255, 250, 236], 0.55); shadowE(g, 13.6, 21.8, 11.8, 2.8);
  const A = [12, 2.8], BL = [2.2, 21.4], BR = [21.8, 21.4], sw = tw(t, 1, 0.5) * 0.5;
  // guy ropes and pegs behind the cloth
  for (const [x1, y1, x2, y2] of [[4.2, 16.4, 0.9, 21.2], [19.8, 16.4, 23.1, 21.2]]) { ln(g, x1, y1, x2, y2, 'rgba(74,52,48,.85)', 0.2); poly24(g, [[x2 - 0.5, y2 - 0.9], [x2 + 0.5, y2 - 0.9], [x2 + 0.5, y2 + 0.4], [x2 - 0.5, y2 + 0.4]], '#7a5232', 0.2); }
  c24(g, [[A, BL, BR]], pal(col, '#fffaf0', null), { smooth: false, seed: 50 + v, lx: -1.2, ly: -1.2, rim: 0.5, hs: 0.01 });
  g.save(); g.beginPath(); trace(g, [A, BL, BR], false); g.clip();
  // two big panels: the sunny left, the shaded right; folds between them
  g.fillStyle = rgba(Hh, 0.5); g.beginPath(); g.moveTo(...A); g.lineTo(BL[0] + 1, BL[1]); g.lineTo(7.4, 21.4); g.closePath(); g.fill();
  g.fillStyle = 'rgba(60,62,150,.36)'; g.beginPath(); g.moveTo(...A); g.lineTo(21.8, 21.4); g.lineTo(13.4, 21.4); g.lineTo(12.2, 8); g.fill();
  for (const [x, a, sh] of [[5.6, 0.2, 0], [8.4, 0.3, 0], [15.6, 0.3, 1], [18.6, 0.2, 1]]) { g.strokeStyle = sh ? 'rgba(40,36,90,.42)' : 'rgba(66,54,70,.3)'; g.lineWidth = 0.2; g.beginPath(); g.moveTo(12, 3.2); g.quadraticCurveTo((12 + x) / 2 + (sh ? 0.3 : -0.3), 12, x, 21.4); g.stroke(); g.strokeStyle = sh ? 'rgba(255,255,255,.1)' : 'rgba(255,255,248,.5)'; g.lineWidth = 0.22; g.beginPath(); g.moveTo(12 - 0.3, 3.6); g.quadraticCurveTo((12 + x) / 2 - 0.5, 12, x - 0.4, 21.2); g.stroke(); }
  // patch with stitches, mud at the hem
  g.save(); g.translate(16.2, 16); g.rotate(0.14); g.fillStyle = rgba(mixc(C, [150, 120, 90], 0.3)); g.fillRect(-1.5, -1.3, 3, 2.6); g.strokeStyle = 'rgba(60,44,40,.6)'; g.lineWidth = 0.12; g.setLineDash([0.35, 0.3]); g.strokeRect(-1.5, -1.3, 3, 2.6); g.setLineDash([]); g.restore();
  g.fillStyle = 'rgba(110,86,70,.42)'; g.beginPath(); g.moveTo(1, 21.6); for (let x = 1; x <= 23; x += 1.2) g.lineTo(x, 20.2 + 0.5 * Math.sin(x * 2.1) + (x < 12 ? 0.2 : 0)); g.lineTo(23, 21.6); g.fill();
  g.restore();
  // the door: dark inside, two flaps tied back
  g.fillStyle = INK; g.beginPath(); g.moveTo(8, 21.6); g.quadraticCurveTo(10.4, 15, 12, 9.8); g.quadraticCurveTo(13.6, 15, 16, 21.6); g.fill();
  const gd = g.createLinearGradient(0, 11, 0, 21.4); gd.addColorStop(0, '#46303c'); gd.addColorStop(1, '#2a1c28'); g.fillStyle = gd; g.beginPath(); g.moveTo(9.1, 21.4); g.quadraticCurveTo(11, 15.6, 12, 11.6); g.quadraticCurveTo(13, 15.6, 14.9, 21.4); g.fill();
  g.fillStyle = rgba(mixc(C, [255, 250, 236], 0.3)); g.beginPath(); g.moveTo(12, 8.6); g.quadraticCurveTo(9.4, 15, 6.8, 21.4); g.lineTo(9.3, 21.4); g.quadraticCurveTo(10.6, 15.6, 12, 11); g.fill();
  g.fillStyle = rgba(mixc(K, C, 0.4)); g.beginPath(); g.moveTo(12, 8.6); g.quadraticCurveTo(14.6, 15, 17.2, 21.4); g.lineTo(14.7, 21.4); g.quadraticCurveTo(13.4, 15.6, 12, 11); g.fill();
  g.strokeStyle = rgba(hx(INK), 0.7); g.lineWidth = 0.2; g.beginPath(); g.moveTo(12, 8.6); g.quadraticCurveTo(9.4, 15, 6.8, 21.4); g.moveTo(12, 8.6); g.quadraticCurveTo(14.6, 15, 17.2, 21.4); g.stroke();
  ln(g, 9.1, 15.6, 10.4, 15.2, '#7a5232', 0.34); ln(g, 14.9, 15.6, 13.6, 15.2, '#6a4a2c', 0.34);
  // pole tip and the flag
  ln(g, 12, 3.4, 12, 0.6, INK, 0.5); ln(g, 12, 3.2, 12, 0.7, '#9a7048', 0.28); const fl = sw;
  g.fillStyle = INK; g.beginPath(); g.moveTo(12.1, 0.55); g.quadraticCurveTo(14 + fl, 0.9, 15.9 + fl * 1.6, 2 + fl * 0.3); g.quadraticCurveTo(14 + fl, 2.9, 12.1, 2.8); g.fill();
  g.fillStyle = '#d9534a'; g.beginPath(); g.moveTo(12.2, 1); g.quadraticCurveTo(14 + fl, 1.3, 15.2 + fl * 1.5, 2 + fl * 0.3); g.quadraticCurveTo(14 + fl, 2.5, 12.2, 2.4); g.fill(); g.fillStyle = '#f08a78'; g.beginPath(); g.moveTo(12.2, 1); g.quadraticCurveTo(14 + fl, 1.3, 15.2 + fl * 1.5, 2 + fl * 0.3); g.lineTo(14.4 + fl, 1.5); g.quadraticCurveTo(13.2, 1.3, 12.2, 1.5); g.fill();
  tufts(g, 1.6, 22.6, 21.9, 330 + v, 10, 1.8); }

function lamp24(g, t, lit) { const fl = lit ? 0.82 + 0.18 * vn(twos(t), 0.4, 7, 601) : 0; shadowE(g, 13, 21.8, 5.6, 1.7);
  if (lit) glow24(g, 12, 6, 11, '255,200,110', 0.36 * fl);
  stoneBlocks(g, rect(9, 19.8, 6, 2.5), { course: 1.25, bw: 3, seed: 12, P: pal('#8a8e92', '#dcdcd0', null) });
  wood(g, 10.8, 8.2, 2.4, 12, { dir: 'v', planks: 1, seed: 11, nails: false, knots: 0.6, P: WDP.dark });
  poly24(g, [[13, 10.4], [15.6, 8.6], [15.6, 9.6], [13, 12]], '#4a4252', 0.3);                                         // the bracket
  const box = [[7.6, 2.6], [16.4, 2.6], [16, 9.8], [8, 9.8]]; c24(g, [box], pal('#3e3846', '#9a90a6', null), { smooth: false, seed: 13, hs: 0.01, lx: -0.3, ly: -0.4 });
  const gg = g.createLinearGradient(0, 3.8, 0, 8.6); if (lit) { gg.addColorStop(0, `rgb(255,${236 + 14 * fl | 0},170)`); gg.addColorStop(1, `rgb(255,${176 + 40 * fl | 0},${80 + 30 * fl | 0})`); } else { gg.addColorStop(0, '#9fb0cc'); gg.addColorStop(1, '#58688a'); }
  g.fillStyle = gg; g.beginPath(); trace(g, [[9, 3.8], [15, 3.8], [14.7, 8.6], [9.3, 8.6]], false); g.fill();
  ln(g, 12, 3.8, 12, 8.6, 'rgba(42,35,50,.7)', 0.22); ln(g, 9.1, 6.1, 14.9, 6.1, 'rgba(42,35,50,.7)', 0.22);
  if (lit) { dab(g, 12, 6.6 - fl * 0.3, 1.2, 2 * fl, 0, '#fff4c6'); dab(g, 12, 7, 0.55, 1.1 * fl, 0, '#ffd070'); } else { fillPoly(g, [[9.2, 4], [10.8, 4], [9.6, 8.2], [9.35, 8.2]], 'rgba(255,255,255,.35)'); fillPoly(g, [[13.4, 4], [14.8, 4], [14.7, 8.4], [13.6, 8.4]], 'rgba(40,50,100,.22)'); }
  c24(g, [[[6.4, 3], [12, -0.4], [17.6, 3]]], pal('#4a4252', '#a69cb6', '#7a7086'), { smooth: false, seed: 14, hs: 0.01, lx: -0.5, ly: -0.5 }); dab(g, 12, -0.5, 0.7, 0.7, 0, INK); dab(g, 12, -0.6, 0.5, 0.5, 0, '#b8a070'); }
const AWN = ['#d9534a', '#3a92b5', '#e6aa3a', '#7aa34a'];
function stall24(g, t, v) { shadowE(g, 13, 21.6, 11.6, 2.6); const ca = AWN[v % 4], CA = hx(ca), CK = kage(CA, 1);
  wood(g, 1.6, 9.6, 20.8, 11.4, { dir: 'h', planks: 3, seed: 21 + v, P: WDP.oak, knots: 0.5 });
  g.fillStyle = 'rgba(54,40,110,.34)'; g.fillRect(1.8, 9.9, 20.4, 1.9);                                           // the awning's shade on the counter
  g.fillStyle = rgba(hx(WDP.oak.rim), 0.55); g.fillRect(1.6, 9.62, 20.8, 0.36);
  for (let i = 0; i < 3; i++) { const x = 4.6 + i * 7, col = ['#d2423a', '#e6b040', '#7aa34a'][(i + v) % 3], C = hx(col); dab(g, x + 0.2, 11.5, 2.5, 2.3, 0, INK); dab(g, x, 11.2, 2.2, 2, 0, rgba(mixc(C, kage(C), 0.4))); dab(g, x - 0.2, 10.9, 1.9, 1.6, 0, col); dab(g, x - 0.7, 10.3, 0.7, 0.5, 0, 'rgba(255,255,255,.7)'); ln(g, x, 9.4, x + 0.3, 8.9, '#5a7a38', 0.3); }
  wood(g, 1.4, 1.8, 1.1, 9.4, { dir: 'v', planks: 1, seed: 22, nails: false, P: WDP.dark, knots: 0 }); wood(g, 21.6, 1.8, 1.1, 9.4, { dir: 'v', planks: 1, seed: 23, nails: false, P: WDP.dark, knots: 0 });
  for (let i = 0; i < 4; i++) { const x0 = 1 + i * 5.5, sw = tw(t, 1, i) * 0.12, cream = i % 2, base = cream ? [250, 244, 230] : CA, ink = hx(INK);
    const Pn = [[x0, 1.6], [x0 + 5.5, 1.6], [x0 + 5.5, 6.4], [x0 + 2.75 + 1.4, 7.4 + sw], [x0 + 2.75, 7.9 + sw], [x0 + 2.75 - 1.4, 7.4 + sw], [x0, 6.4]];
    g.save(); g.beginPath(); trace(g, Pn, false); g.clip(); const gr = g.createLinearGradient(x0, 0, x0 + 5.5, 0); gr.addColorStop(0, rgba(mixc(base, [255, 255, 240], 0.28))); gr.addColorStop(0.5, rgba(base)); gr.addColorStop(1, rgba(mixc(base, SKY, 0.34).map(c => c * 0.84))); g.fillStyle = gr; g.fillRect(x0, 1.6, 5.5, 6.4);
    g.fillStyle = 'rgba(48,40,110,.18)'; g.fillRect(x0, 5.2, 5.5, 3); g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(x0 + 0.4, 1.6, 0.5, 5); g.restore(); }
  g.strokeStyle = INK; g.lineWidth = 0.34; g.lineJoin = 'round'; g.beginPath(); g.moveTo(1, 1.6); g.lineTo(23, 1.6); g.lineTo(23, 6.4); for (let i = 3; i >= 0; i--) { const x0 = 1 + i * 5.5; g.lineTo(x0 + 5.5 - 1.4 + 0.0, 7.4); g.lineTo(x0 + 2.75, 7.9); g.lineTo(x0 + 1.4, 7.4); g.lineTo(x0, 6.4); } g.closePath(); g.stroke(); g.lineJoin = 'miter';
  for (let i = 1; i < 4; i++) ln(g, 1 + i * 5.5, 1.8, 1 + i * 5.5, 6.4, 'rgba(42,35,60,.35)', 0.14); }
function campfire24(g, t, big) { const tq = twos(t), fl = 0.85 + 0.15 * vn(tq, 0.5, 6, 501), s = big ? 1.5 : 1;
  glow24(g, 12, 16, 15 * s, '255,160,60', 0.4 * fl); dab(g, 12, 18.4, 7.2 * s, 3.2 * s, 0, 'rgba(50,40,52,.9)'); dab(g, 12, 18.1, 6.2 * s, 2.5 * s, 0, '#5a4a48'); dab(g, 12, 18, 4.6 * s, 1.7 * s, 0, 'rgba(255,130,50,.35)');
  const N = big ? 11 : 8; for (let k = 0; k < N; k++) { const a = k / N * TAU + 0.3, x = 12 + Math.cos(a) * 6.5 * s, y = 18.2 + Math.sin(a) * 3.2 * s; if (Math.sin(a) < 0) continue; rockPix(g, { bodies: [{ cx: x, base: y + 1.2, rx: 2.0, ry: 2.4, rz: 1.6, seed: k * 3 + 1, extra: 1 }], P: pal('#a9a296', '#e8e0cb', '#cfc8b8'), x0: x - 3, y0: y - 3.4, w: 6, h: 6, ow: 0.13, heavy: 0.2, round: 3, warp: 0.5 }); const fa = Math.sin(a) > 0 ? 0.5 : 0.2; g.fillStyle = `rgba(255,150,60,${fa * 0.35 * fl})`; g.beginPath(); g.ellipse(x, y, 1.6, 1.0, 0, 0, TAU); g.fill(); }
  g.save(); g.translate(12, 18.4); for (const [a, off] of [[-0.45, -1.4], [0.45, 1.4]]) { g.save(); g.rotate(a); logPiece(g, -4.6 * s + off, 0, 8.4 * s, 1.15, WDP.grey, 7 + (a > 0 ? 1 : 0)); g.restore(); } g.restore();
  g.fillStyle = 'rgba(255,120,40,.3)'; g.beginPath(); g.ellipse(12, 17.2, 4.6 * s, 1.5 * s, 0, 0, TAU); g.fill();
  const tongues = big ? 6 : 5; for (let k = 0; k < tongues; k++) { const u = (k + 0.5) / tongues, bx = 12 + (u - 0.5) * 7 * s, mid = 1 - Math.abs(u - 0.5) * 1.5, h = (5 + 8 * vn(tq, k * 0.21, 8, 510 + k) * mid + 2.5 * mid) * s, sw = (vn(tq, k * 0.21 + 0.1, 8, 511 + k) - 0.5) * 3.2, wd = (1.7 + mid * 0.8) * s;
    const flame = (sc, col, lift = 0) => { g.fillStyle = col; g.beginPath(); g.moveTo(bx - wd * sc, 17.4 - lift); g.bezierCurveTo(bx - wd * 1.15 * sc + sw * 0.2, 17.4 - h * 0.45 * sc, bx + sw * 0.5 * sc - 0.4, 17.4 - h * 0.78 * sc, bx + sw * sc, 17.4 - h * sc - lift); g.bezierCurveTo(bx + 0.5 + sw * 0.4 * sc, 17.4 - h * 0.7 * sc, bx + wd * 1.1 * sc + sw * 0.2, 17.4 - h * 0.4 * sc, bx + wd * sc, 17.4 - lift); g.closePath(); g.fill(); };
    flame(1, '#d93a28'); flame(0.82, '#f06a2a', 0.2); flame(0.6, '#fba434', 0.4); flame(0.36, '#fee27c', 0.5); }
  g.fillStyle = 'rgba(255,214,120,.45)'; g.beginPath(); g.ellipse(12, 16.8, 3 * s, 0.9 * s, 0, 0, TAU); g.fill();
  for (let k = 0; k < 5; k++) { const ph = (tq * 2 + k / 5) % 1; dab(g, 9.4 + k * 1.3 + Math.sin(ph * 6 + k) * 1.1, 12 - ph * 10 * s, 0.26, 0.3, 0, `rgba(255,${200 - ph * 60 | 0},110,${1 - ph})`); }
  for (let k = 0; k < 3; k++) { const ph = (t * 1 + k / 3) % 1; g.fillStyle = `rgba(96,96,128,${0.16 * (1 - ph)})`; g.beginPath(); g.ellipse(12 + Math.sin(ph * 5 + k * 2) * 1.6 * s, 7 - ph * 7 * s, 1 + ph * 1.6, 0.8 + ph * 1.1, 0, 0, TAU); g.fill(); } }

/* ================= graves, crosses, piles, drops, chest, remains, mushrooms, cake ================= */
function earthMound(g, cx, cy, rx, ry, seed) { const R = mul(seed); c24(g, [blob(cx, cy, rx, ry, seed, 22, 0.1, 4)], pal('#7a5a3a', '#cfa070', '#9a7448'), { seed, hs: 0.4, lx: -0.8, ly: -0.7, rim: 0.4 });
  for (let i = 0; i < 9; i++) { const a = R() * TAU, d = Math.sqrt(R()) * 0.8, x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d; dab(g, x, y + 0.2, 0.7, 0.45, 0, 'rgba(50,34,40,.45)'); dab(g, x - 0.1, y - 0.1, 0.65, 0.4, 0, R() < 0.5 ? '#a88256' : '#8c6a44'); dab(g, x - 0.3, y - 0.3, 0.25, 0.14, 0, 'rgba(240,206,160,.6)'); } }
function grave24(g, v) { shadowE(g, 13, 20.6, 7.6, 1.9); earthMound(g, 12, 17.6, 8.2, 3.2, 70 + v);
  if (v === 0) { const s = [[8.2, 16], [8.2, 6.4], [8.9, 4], [10.4, 2.6], [13.6, 2.6], [15.1, 4], [15.8, 6.4], [15.8, 16]];
    c24(g, [s], pal('#9d9a98', '#eeeadc', '#cfccc2'), { smooth: true, seed: 70, hs: 0.01, lx: -0.8, ly: -1, rim: 0.45 });
    g.save(); g.beginPath(); trace(g, s, true); g.clip(); g.fillStyle = 'rgba(60,64,150,.28)'; g.fillRect(12.6, 2, 4, 15); g.fillStyle = 'rgba(255,250,236,.35)'; g.fillRect(8.4, 3, 1, 12); for (let i = 0; i < 10; i++) dab(g, 8.6 + ((i * 37) % 7), 4 + ((i * 53) % 11), 0.25, 0.15, 0, 'rgba(60,54,70,.35)'); g.restore();
    for (const [x1, y1, x2, y2, w] of [[12, 4.8, 12, 10.6, 0.6], [9.8, 7, 14.2, 7, 0.6]]) { ln(g, x1 + 0.12, y1 + 0.12, x2 + 0.12, y2 + 0.12, 'rgba(240,236,224,.7)', w * 0.7); ln(g, x1, y1, x2, y2, 'rgba(48,40,58,.8)', w); }
    ln(g, 9.6, 12.4, 10.8, 13.2, 'rgba(42,35,60,.5)', 0.14); ln(g, 14, 10.4, 14.8, 12.4, 'rgba(42,35,60,.5)', 0.14); moss(g, 9.2, 15.6, 1.8, 0.9, 71); }
  else { const white = '#e6e0d0', P = pal(white, '#fffaf0', '#fbf7ec'); wood(g, 10.6, 1.4, 2.8, 15.4, { dir: 'v', planks: 1, seed: 72, nails: false, knots: 0, P }); wood(g, 6.8, 5.2, 10.4, 2.8, { dir: 'h', planks: 1, seed: 73, nails: false, knots: 0, P });
    for (const [x, y] of [[11.4, 11.6], [15.4, 6.2], [8.2, 6.8]]) dab(g, x, y, 0.55, 0.4, 0.4, '#8a6a46'); }
  moss(g, 7.6, 18.6, 2.6, 1.1, 74 + v);
  const fc = [['#ef9fb4', '#f3d55a', '#fff8ea'], ['#f3d55a', '#c8a0e8', '#ef9fb4'], ['#c8a0e8', '#ef9fb4', '#fff8ea']][v];
  tufts(g, 3.6, 20.4, 20.4, 75 + v, 7, 1.7); for (let i = 0; i < (v === 2 ? 6 : 3); i++) { const x = 15 + (i % 3) * 1.8 - (i > 2 ? 9 : 0), y = 19 + (i % 2) * 0.9; ln(g, x, y, x, y + 1.6, '#4a7a3a', 0.2); dab(g, x, y, 0.55, 0.5, 0, INK); dab(g, x, y, 0.42, 0.4, 0, fc[i % 3]); dab(g, x, y, 0.16, 0.16, 0, '#e0952c'); } }
function cross24(g, age) { const lean = age === 2 ? 0.22 : age === 1 ? 0.06 : 0, P = [pal('#8a6238', '#e0aa70', '#b07a48'), pal('#6f5a44', '#c4a888', '#8a7458'), pal('#5d5246', '#a89c8c', '#7a6e60')][age];
  shadowE(g, 13, 19.6, 7.4, 2.2); g.save(); g.translate(12, 19.2); g.rotate(lean);
  wood(g, -1.5, -16, 3, 16, { dir: 'v', planks: 1, seed: 74 + age, nails: false, knots: 0.8, P }); wood(g, age < 2 ? -6 : -6, -12.6, age < 2 ? 12 : 6, 3, { dir: 'h', planks: 1, seed: 77 + age, nails: false, knots: 0.5, P });
  ln(g, -1.5, -11.9, 1.5, -10.4, 'rgba(120,96,70,.85)', 0.3); ln(g, -1.5, -10.4, 1.5, -11.9, 'rgba(120,96,70,.85)', 0.3); g.restore();
  moss(g, 8.6, 20.2, 2.2, 0.9, 78 + age); tufts(g, 5, 19, 20.6, 79 + age, 6, 1.6);
  if (age === 0) for (let i = 0; i < 3; i++) { const x = 8 + i * 3.8, y = 20.4; ln(g, x, y, x, y + 1.4, '#4a7a3a', 0.2); dab(g, x, y, 0.6, 0.55, 0, INK); dab(g, x, y, 0.46, 0.44, 0, ['#e88aa0', '#f4d36a', '#c8a0e8'][i]); dab(g, x, y, 0.16, 0.16, 0, '#fff6c0'); } }
function pile24(g, kind) { shadowE(g, 13, 20.8, 10.4, 2.6);
  if (kind === 'wood') { let k = 0; for (const [n, y] of [[3, 17.2], [2, 12.6], [1, 8.4]]) for (let i = 0; i < n; i++) { const x = 12 + (i - (n - 1) / 2) * 6.8; endGrain(g, x, y, 3.3, 40 + k++); }
    tufts(g, 2, 22, 20.6, 41, 8, 1.6); }
  else { rockPix(g, { bodies: [{ cx: 7.2, base: 19.6, rx: 3.9, ry: 5.2, rz: 3, seed: 3, extra: 1 }, { cx: 15, base: 20, rx: 4.5, ry: 5.8, rz: 3.2, seed: 5, extra: 1 }, { cx: 10.8, base: 14.6, rx: 3.6, ry: 4.4, rz: 2.8, seed: 7, extra: 1 }, { cx: 17.4, base: 14, rx: 2.9, ry: 3.8, rz: 2.4, seed: 9, extra: 1 }], P: pal('#8e949c', '#eef0e6', '#c4c9cc'), ow: 0.2, heavy: 0.34, round: 5, warp: 0.8 }); tufts(g, 2.4, 21.6, 20.6, 43, 7, 1.7); } }
function drop24(g, kind) { shadowE(g, 13, 18.8, 6.6, 1.7);
  if (kind === 'wood') { logPiece(g, 4.6, 13.4, 12.6, 2.6, WDP.oak, 80); tufts(g, 4, 20, 16.4, 81, 5, 1.2); }
  else { rockPix(g, { bodies: [{ cx: 12, base: 17, rx: 4.4, ry: 5.8, rz: 3.2, seed: 83, extra: 1 }], P: pal('#8e949c', '#eef0e6', '#c4c9cc'), ow: 0.2, heavy: 0.3, round: 5, warp: 0.8 }); tufts(g, 6, 18, 17.4, 84, 4, 1.2); } }
function chest24(g, open) { shadowE(g, 13, 20.8, 9, 2.1);
  wood(g, 3.6, 11.2, 16.8, 9, { dir: 'h', planks: 3, seed: 85, P: pal('#6b4423', '#c28a52', '#8a5a34'), knots: 0.4, nails: false });
  const IR = pal('#4a4a56', '#9a9ab0', null);
  const lid = open ? [[3.6, 11.4], [4.6, 5.8], [19.4, 5.8], [20.4, 11.4]] : [[3.6, 11.4], [4.2, 8.4], [7.4, 6.4], [12, 5.8], [16.6, 6.4], [19.8, 8.4], [20.4, 11.4]];
  if (open) { c24(g, [[[4.6, 5.8], [19.4, 5.8], [18.8, 8.2], [5.2, 8.2]]], pal('#2c1a10', '#6a4630', null), { smooth: false, seed: 87, hs: 0.01 }); glow24(g, 12, 9.2, 8, '255,214,120', 0.5); for (const [x, y] of [[8, 9.4], [11, 9], [14.4, 9.6], [16.4, 9.2]]) dab(g, x, y, 0.5, 0.4, 0, '#ffe9a0'); }
  wood(g, 3.6, open ? 8.4 : 6.2, 16.8, open ? 3 : 5.2, { dir: 'h', planks: 2, seed: 86, P: pal('#7d5230', '#d09860', '#9a6a3c'), knots: 0.3, nails: false, shape: open ? [[3.6, 8.4], [20.4, 8.4], [20.4, 11.4], [3.6, 11.4]] : lid });
  for (const x of [5.2, 17.8]) { c24(g, [rect(x, open ? 8.4 : 6.8, 1.6, open ? 11.8 : 13.4)], IR, { smooth: false, seed: 88, hs: 0.01, iw: 0.12 }); dab(g, x + 0.8, 12.6, 0.2, 0.2, 0, '#c8c8d8'); dab(g, x + 0.8, 18.4, 0.2, 0.2, 0, '#c8c8d8'); }
  c24(g, [rect(3.6, 14.4, 16.8, 1.1)], IR, { smooth: false, seed: 89, hs: 0.01, iw: 0.1 });
  c24(g, [[[10.4, 13.2], [13.6, 13.2], [13.6, 16.6], [12, 17.4], [10.4, 16.6]]], pal('#c9a44c', '#fff0b0', null), { smooth: false, seed: 90, hs: 0.01, iw: 0.13 }); dab(g, 12, 15, 0.45, 0.45, 0, '#3a2c18'); ln(g, 12, 15.2, 12, 16.2, '#3a2c18', 0.25); }
const rotP = (pts, cx, cy, a) => pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
const BONE = pal('#e4d9bf', '#fff9ea', '#ffffff', 0.9);
function bone24(g, cx, cy, a, len, seed) { const h = len / 2;
  const shaft = rotP([[-h, -0.5], [-h * 0.5, -0.4], [0, -0.34], [h * 0.5, -0.4], [h, -0.5], [h, 0.5], [h * 0.5, 0.4], [0, 0.34], [-h * 0.5, 0.4], [-h, 0.5]].map(([x, y]) => [cx + x, cy + y]), cx, cy, a), lobes = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) lobes.push(rotP(blob(cx + sx * (h + 0.1), cy + sy * 0.72, 1.0, 0.92, seed + sx * 3 + sy, 14, 0.07, 4), cx, cy, a));
  c24(g, [shaft, ...lobes], BONE, { seed, hs: 0.01, iw: 0.12, lx: -0.5, ly: -0.7, rim: 0.4 }); }
function remains24(g) { shadowE(g, 12.6, 19.4, 8.8, 2.5);
  bone24(g, 12, 16.2, 0.52, 13.4, 141); bone24(g, 12, 16.2, -0.52, 13.4, 147);
  for (const [x, y] of [[8.2, 17.8], [15.8, 17.8]]) dab(g, x, y, 0.5, 0.3, 0, 'rgba(110,90,120,.28)');
  const cranium = blob(12, 8.3, 4.0, 3.7, 151, 30, 0.04, 4), jaw = blob(12, 11.9, 2.55, 1.65, 153, 20, 0.05, 3);
  c24(g, [cranium, jaw], BONE, { seed: 152, hs: 0.3, iw: 0.13, lx: -0.7, ly: -0.9, rim: 0.5 });
  const sock = (x) => { dab(g, x, 8.9, 1.15, 1.3, 0.1 * (x < 12 ? 1 : -1), '#2a2230'); dab(g, x - 0.3, 8.5, 0.35, 0.4, 0, 'rgba(255,255,255,.35)'); };
  sock(10.3); sock(13.7); fillPoly(g, [[12, 10.1], [11.3, 11.3], [12.7, 11.3]], '#2a2230');
  g.strokeStyle = 'rgba(70,56,70,.5)'; g.lineWidth = 0.14; for (const x of [10.7, 11.5, 12.5, 13.3]) { g.beginPath(); g.moveTo(x, 11.9); g.lineTo(x, 13.05); g.stroke(); } g.beginPath(); g.moveTo(10.2, 12.45); g.lineTo(13.8, 12.45); g.stroke();
  g.strokeStyle = 'rgba(90,74,96,.4)'; g.lineWidth = 0.16; g.beginPath(); g.moveTo(9.4, 6.2); g.quadraticCurveTo(11, 5.5, 12.6, 5.7); g.stroke(); }
function shroom24(g, t) { const gl = 0.5 + 0.5 * tw(t); glow24(g, 12, 14, 12, '190,140,255', 0.26 + gl * 0.2);
  for (const [ox, oy, s] of [[-3.6, 3, 0.75], [3.6, 4, 0.6], [0, 0, 1]]) { const x = 12 + ox, y = 14 + oy;
    c24(g, [[[x - 1.1 * s, y], [x + 1.1 * s, y], [x + 1.4 * s, y + 5 * s], [x - 1.4 * s, y + 5 * s]]], pal('#efe6d2', '#fffaf0', null), { smooth: false, seed: 130, hs: 0.01, iw: 0.13 * s + 0.05 }); g.fillStyle = 'rgba(60,60,150,.22)'; g.fillRect(x + 0.3 * s, y, 0.9 * s, 5 * s);
    g.fillStyle = '#7a5a9a'; g.beginPath(); g.ellipse(x, y + 0.4 * s, 4.3 * s, 1.1 * s, 0, 0, Math.PI); g.fill(); g.strokeStyle = 'rgba(30,20,60,.5)'; g.lineWidth = 0.12; for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(x, y + 0.2 * s); g.lineTo(x + k * 1.3 * s, y + 1.3 * s); g.stroke(); }
    const cap = (dx, dy, kx, ky, col) => { g.beginPath(); g.ellipse(x + dx, y + dy, kx, ky, 0, Math.PI, 0); g.closePath(); g.fillStyle = col; g.fill(); };
    g.beginPath(); g.ellipse(x, y, 5.2 * s, 3.7 * s, 0, Math.PI, 0); g.closePath(); g.fillStyle = INK; g.fill(); const cg = g.createLinearGradient(x - 5 * s, 0, x + 5 * s, 0); cg.addColorStop(0, '#b27cf0'); cg.addColorStop(0.5, '#8a4ad0'); cg.addColorStop(1, '#5a2ea0'); g.beginPath(); g.ellipse(x, y, 4.9 * s, 3.4 * s, 0, Math.PI, 0); g.closePath(); g.fillStyle = cg; g.fill();
    g.fillStyle = 'rgba(40,30,110,.3)'; g.beginPath(); g.ellipse(x + 1.2 * s, y, 3.8 * s, 2.4 * s, 0, Math.PI, 0); g.fill();
    for (const [dx, dy, r] of [[-2.1, -1.7, 0.85], [1.7, -2.3, 0.62], [-0.2, -2.8, 0.5], [3, -1, 0.45]]) { dab(g, x + dx * s, y + dy * s, r * s, r * 0.78 * s, 0, '#f6ecff'); dab(g, x + dx * s - 0.12, y + dy * s - 0.1, r * 0.5 * s, r * 0.35 * s, 0, '#fff'); }
    g.strokeStyle = 'rgba(230,200,255,.6)'; g.lineWidth = 0.25; g.beginPath(); g.ellipse(x, y, 4.6 * s, 3.2 * s, 0, Math.PI * 1.05, Math.PI * 1.45); g.stroke(); } }
function cake24(g, t) { shadowE(g, 12.6, 20, 9.8, 2.7);
  c24(g, [blob(12, 18.7, 10.4, 3.1, 161, 36, 0.02, 3)], pal('#f2ebdc', '#ffffff', null, 0.8), { seed: 161, hs: 0.01, iw: 0.15, lx: -0.8, ly: -1 });
  const tier = (cx, top, bot, rx, seed, sponge) => { const ry = rx * 0.3, sh = [];
    for (let i = 0; i <= 18; i++) { const a = Math.PI * i / 18; sh.push([cx + rx * Math.cos(a), bot + ry * Math.sin(a)]); }
    sh.unshift([cx + rx, top]); sh.push([cx - rx, top]);
    c24(g, [sh], sponge, { seed, hs: 0.01, iw: 0.15, lx: -1.2, ly: -1.2, rim: 0.7 });
    g.save(); g.beginPath(); trace(g, sh, true); g.clip(); g.fillStyle = 'rgba(120,70,40,.18)'; for (const y of [top + (bot - top) * 0.45, top + (bot - top) * 0.72]) g.fillRect(cx - rx, y, rx * 2, 0.22); g.restore();    // the sponge layers
    const topE = ellipsePts2(cx, top, rx, ry), drips = [];
    c24(g, [topE], pal('#fff2f4', '#ffffff', null, 0.55), { seed: seed + 1, hs: 0.01, iw: 0.14, lx: -0.8, ly: -0.9, rim: 0.5 });
    for (let i = 0; i < 7; i++) { const a = Math.PI * (0.1 + 0.8 * (i + 0.5) / 7), x = cx + rx * Math.cos(a) * 0.98, y = top + ry * Math.sin(a), l = 0.9 + 1.5 * h32(i, seed, 3, 3); drips.push(dab(g, x, y + l * 0.5, 0.62, l * 0.62, 0, '#fff2f4')); }
    g.strokeStyle = 'rgba(190,130,150,.5)'; g.lineWidth = 0.14; g.beginPath(); g.ellipse(cx, top, rx * 0.97, ry * 0.97, 0, 0.12, Math.PI - 0.12); g.stroke();
    return { rx, ry, top, bot }; };
  const A = tier(12, 12.6, 17.6, 7.9, 162, pal('#d89a5a', '#f7d49c', null, 0.9)), B = tier(12, 7.6, 11.9, 5.0, 166, pal('#cf8a52', '#f3c68c', null, 0.9));
  for (let i = 0; i < 8; i++) { const a = Math.PI * (0.08 + 0.84 * i / 7), x = 12 + 7.2 * Math.cos(a), y = 17.9 + 2.2 * Math.sin(a) - 0.1, col = ['#e8647a', '#f2b84a', '#e8647a', '#8cc46a'][i % 4]; dab(g, x, y, 0.75, 0.7, 0, 'rgba(60,30,50,.45)'); dab(g, x, y - 0.1, 0.65, 0.6, 0, col); dab(g, x - 0.2, y - 0.3, 0.2, 0.15, 0, 'rgba(255,255,255,.8)'); }
  for (const [x, y] of [[9.4, 7.2], [14.6, 7.6], [12, 6.9]]) { dab(g, x, y, 0.55, 0.5, 0, '#d8465a'); dab(g, x - 0.15, y - 0.2, 0.18, 0.14, 0, 'rgba(255,255,255,.8)'); }
  const tq = twos(t); for (let i = 0; i < 3; i++) { const x = 9.8 + i * 2.2; c24(g, [rect(x - 0.34, 3.2, 0.68, 4.2)], pal(['#f2ecda', '#d8e8f4', '#f6d8e0'][i], '#ffffff', null, 0.6), { smooth: false, seed: 170 + i, hs: 0.01, iw: 0.1 }); g.fillStyle = 'rgba(200,80,90,.55)'; g.fillRect(x - 0.34, 4.4, 0.68, 0.3); g.fillRect(x - 0.34, 5.8, 0.68, 0.3);
    const fl = 1 + vn(tq, i * 0.3, 6, 520 + i) * 0.4; dab(g, x, 2.3, 0.78, 1.35 * fl, 0, '#ff9a3a'); dab(g, x, 2.45, 0.55, 1.0 * fl, 0, '#ffd45a'); dab(g, x, 2.7, 0.24, 0.55, 0, '#fff6d0'); }
  glow24(g, 12, 3, 8.5, '255,200,110', 0.32); }
const ellipsePts2 = (cx, cy, rx, ry, n = 28) => Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * TAU) * rx, cy + Math.sin(i / n * TAU) * ry]);

/* ================= building sites ================= */
function stake24(g, col = '#e8c070') { shadowE(g, 12.8, 21.4, 4.2, 1.2);
  const post = [[10.2, 6.4], [13.8, 6.4], [13.8, 20.4], [12, 21.8], [10.2, 20.4]]; wood(g, 10.2, 6.4, 3.6, 14.4, { dir: 'v', planks: 1, seed: 31, nails: false, knots: 0.7, shape: post });
  const rb = [[13.2, 8.2], [17.4, 9.6 + tw(0) * 0], [16.2, 11], [17.8, 12.6], [13.2, 11.2]]; c24(g, [rb], pal('#d9534a', '#f6a898', null), { smooth: false, seed: 32, hs: 0.01, lx: -0.2, ly: -0.3, iw: 0.12 });
  c24(g, [rect(9.9, 5.2, 4.2, 3.4)], pal(col, '#fff2c0', null), { smooth: false, seed: 33, hs: 0.01, lx: -0.2, ly: -0.3, iw: 0.12 }); tufts(g, 8.2, 15.8, 21.8, 34, 4, 1.4); }
function slot24(g, mat, built) { const wood_ = mat !== 'stone';
  if (built) { if (wood_) wood(g, 1.2, 1.2, 21.6, 21.6, { dir: 'h', planks: 4, seed: 91, knots: 0.55 }); else stoneBlocks(g, rect(1.2, 1.2, 21.6, 21.6), { seed: 92, course: 4.3, bw: 6 }); }
  else { g.fillStyle = 'rgba(40,30,70,.16)'; g.fillRect(2, 2, 20, 20); const col = wood_ ? '#c08a4a' : '#b8bec6';
    for (const [x, y] of [[2, 2], [22, 2], [22, 22], [2, 22]]) { ln(g, x, y + 0.6, x, y - 1.7, INK, 1.2); ln(g, x, y + 0.6, x, y - 1.5, '#9a7048', 0.8); ln(g, x - 0.2, y + 0.4, x - 0.2, y - 1.5, '#d6a870', 0.3); dab(g, x, y - 1.7, 0.9, 0.55, 0, '#d9534a'); }
    g.strokeStyle = 'rgba(70,52,46,.8)'; g.lineWidth = 0.28; g.setLineDash([1.1, 0.7]); g.strokeRect(2, 2, 20, 20); g.setLineDash([]); g.strokeStyle = rgba(hx(col), 0.9); g.lineWidth = 0.14; g.strokeRect(2, 2, 20, 20);
    dab(g, 12, 12, 3.2, 3, 0, INK); dab(g, 12, 12, 2.8, 2.6, 0, col); dab(g, 11.2, 11.1, 0.9, 0.7, 0, 'rgba(255,255,255,.7)'); } }
function crops24(g, t, st) { /* the plants sit on the soil tile: three by three, five stages (1 = sprout ... 4 = ripe) */
  g.drawImage(terr('soil', 0), 0, 0, 24, 24); }
function plants24(g, t, st) { const dkk = 'rgba(40,24,30,.55)'; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const sx = 4.4 + j * 7.6, sy = 7.6 + i * 7.6, h = [0, 2.5, 5, 8, 10][st], sw = tw(t, 1, j * 0.7 + i * 0.5) * 0.45 * (st / 4), sd = h32(i, j, 9, st), base = sy + 3;
    dab(g, sx + 0.3, base + 0.4, 1.7, 0.7, 0, 'rgba(36,20,30,.4)');
    if (st === 1) { dab(g, sx, base - 0.1, 1.5, 0.7, 0, '#5a3a2c'); for (const s of [-1, 1]) { g.fillStyle = INK; g.beginPath(); g.ellipse(sx + s * 0.9, base - 0.9, 1.2, 0.62, s * -0.5, 0, TAU); g.fill(); g.fillStyle = '#8acb4e'; g.beginPath(); g.ellipse(sx + s * 0.9, base - 0.9, 1.0, 0.46, s * -0.5, 0, TAU); g.fill(); dab(g, sx + s * 0.7, base - 1.1, 0.4, 0.15, s * -0.5, '#c6ec86'); } continue; }
    const tipx = sx + sw, tipy = base - h, ripe = st === 4, leaf = ripe ? ['#a8863a', '#d8b850'] : ['#3f7f34', '#86c24e'];
    for (const [s, hl, ll] of [[-1, 0.5, 2.6], [1, 0.36, 2.2], [-1, 0.22, 1.8]]) { if (st < 2 && hl < 0.3) continue; const ly = base - h * hl, tx = sx + s * ll + sw * hl, ty = ly - 1.4 + (ripe ? 0.8 : 0); g.fillStyle = INK; g.beginPath(); g.moveTo(sx, ly + 0.2); g.quadraticCurveTo(sx + s * ll * 0.5, ly - 1.6, tx, ty); g.quadraticCurveTo(sx + s * ll * 0.4, ly - 0.2, sx, ly + 0.8); g.fill(); g.fillStyle = leaf[0]; g.beginPath(); g.moveTo(sx, ly + 0.3); g.quadraticCurveTo(sx + s * ll * 0.5, ly - 1.4, tx - s * 0.1, ty + 0.1); g.quadraticCurveTo(sx + s * ll * 0.4, ly - 0.1, sx, ly + 0.7); g.fill(); g.fillStyle = leaf[1]; g.beginPath(); g.moveTo(sx, ly + 0.3); g.quadraticCurveTo(sx + s * ll * 0.5, ly - 1.4, tx - s * 0.1, ty + 0.1); g.quadraticCurveTo(sx + s * ll * 0.3, ly - 0.9, sx, ly + 0.3); g.fill(); }
    ln(g, sx, base, tipx, tipy + (st >= 3 ? 2 : 0), INK, 1.0); ln(g, sx, base, tipx, tipy + (st >= 3 ? 2 : 0), ripe ? '#b08a3c' : '#4f8a34', 0.62); ln(g, sx - 0.2, base, tipx - 0.2, tipy + (st >= 3 ? 2 : 0), ripe ? '#e0c060' : '#8acb4e', 0.24);
    if (st >= 3) { const ex = tipx, ey = tipy; dab(g, ex + 0.25, ey + 1.4, 1.55, 3.1, sw * 0.1, INK); const eg = g.createLinearGradient(ex - 1.3, 0, ex + 1.3, 0); eg.addColorStop(0, ripe ? '#f6d66a' : '#a4d868'); eg.addColorStop(1, ripe ? '#c8982e' : '#5a9a3c'); g.fillStyle = eg; g.beginPath(); g.ellipse(ex, ey + 1.2, 1.3, 2.7, sw * 0.1, 0, TAU); g.fill();
      g.strokeStyle = ripe ? 'rgba(150,100,20,.7)' : 'rgba(40,90,40,.6)'; g.lineWidth = 0.14; for (let r = 0; r < 5; r++) { const yy = ey - 0.9 + r * 0.95; g.beginPath(); g.moveTo(ex, yy - 0.5); g.lineTo(ex - 1.1, yy + 0.4); g.moveTo(ex, yy - 0.5); g.lineTo(ex + 1.1, yy + 0.4); g.stroke(); }
      for (const s of [-1, 1]) for (let r = 0; r < 3; r++) ln(g, ex + s * 0.4, ey - 1 + r * 1.1, ex + s * 1.9, ey - 3.4 + r * 0.5, ripe ? '#e8cc78' : '#9acf68', 0.14); dab(g, ex - 0.45, ey + 0.4, 0.3, 1.1, 0, ripe ? '#fff0a8' : '#d4f0a0'); } } }

/* ---- crops and flowers: every one its own plant, four stages (1 seedling, 2 growing, 3 nearly, 4 ripe or in bloom) and, for flowers, 5 withered ---- */
const cblob = (g, x, y, rx, ry, col, hi?, a = 0) => { dab(g, x, y, rx + 0.4, ry + 0.4, a, INK); dab(g, x, y, rx, ry, a, col); if (hi) dab(g, x - rx * 0.25, y - ry * 0.3, rx * 0.5, ry * 0.4, a, hi); };
const cleaf = (g, x, y, dx, dy, w, col, hi?) => cblob(g, x + dx / 2, y + dy / 2, Math.hypot(dx, dy) / 2, w, col, hi, Math.atan2(dy, dx));
const cstem = (g, x1, y1, x2, y2, col, w = 0.6) => { ln(g, x1, y1, x2, y2, INK, w + 0.7); ln(g, x1, y1, x2, y2, col, w); };
const CROP_ART: any = {
  turnip: (g, x, b, st, sw) => { const L = '#5e9a3c', H = '#9ad26a'; if (st === 1) { for (const s of [-1, 1]) cleaf(g, x, b, s * 1.9, -1.5, 0.6, L, H); return; }
    const h = [0, 0, 3.5, 5, 6][st], up = st >= 3 ? 1.2 : 0; if (st >= 3) { cblob(g, x, b - 0.7, st === 4 ? 2.4 : 1.6, st === 4 ? 2 : 1.3, '#f4ecf0', '#fff'); dab(g, x, b - 1.7, st === 4 ? 2 : 1.3, 0.9, 0, '#b05ec8'); }
    for (const [s, k] of [[-1, 1], [0, 1.3], [1, 0.9]]) cleaf(g, x, b - up, s * 2.3 + sw * k, -h * k, 0.9, L, H); },
  potato: (g, x, b, st, sw) => { const L = st === 4 ? '#8fa84a' : '#3f7a3a', H = st === 4 ? '#c4d66a' : '#7cc05a'; if (st === 1) { for (const s of [-1, 1]) cleaf(g, x, b, s * 1.8, -1.6, 0.6, '#5aa044', H); return; }
    const n = [0, 0, 3, 4, 4][st]; for (let k = 0; k < n; k++) { const a = -2.4 + k * 1.6; cblob(g, x + a * 0.9 + sw * 0.4, b - 2.4 - (k % 2) * 1.6, 1.8, 1.4, L, H); }
    if (st === 3) for (const [dx, dy] of [[-1.5, -4.6], [1.2, -3.2], [0.2, -5.4]]) dab(g, x + dx, b + dy, 0.55, 0.5, 0, '#fff'); if (st === 4) { cblob(g, x + 0.5, b - 0.2, 1.9, 1.2, '#c49a62', '#e6c690'); dab(g, x - 0.4, b - 0.5, 0.25, 0.2, 0, '#7a5a34'); } },
  cabbage: (g, x, b, st) => { const L = '#5f9a5a', H = '#9bd08a'; if (st === 1) { for (const s of [-1, 1]) cleaf(g, x, b, s * 1.9, -1.2, 0.6, L, H); return; }
    for (const s of [-1, 1]) cleaf(g, x, b - 0.6, s * 3.2, -0.2, 1.3, '#4f8a54', L); if (st === 2) { cleaf(g, x, b - 0.8, 0, -3, 1.5, L, H); return; }
    const r = st === 4 ? 3.1 : 2.2; cblob(g, x, b - r + 0.4, r, r * 0.92, st === 4 ? '#b4dc86' : '#8cc070', '#e4f6bc'); ln(g, x, b - r * 1.6, x - 0.3, b - 0.4, 'rgba(70,120,60,.55)', 0.22); ln(g, x - r * 0.5, b - r * 1.5, x - r * 0.4, b - 0.8, 'rgba(70,120,60,.4)', 0.2); },
  tomato: (g, x, b, st, sw) => { const h = [0, 3, 6, 8.5, 9.5][st]; cstem(g, x - 1.8, b, x - 1.8, b - h - 1, '#8a5a34', 0.45); cstem(g, x, b, x + sw * 0.4, b - h, '#4f8a3a', 0.55);
    for (let k = 0; k < (st === 1 ? 1 : 3); k++) { const yy = b - h * (0.35 + k * 0.28); cleaf(g, x + sw * 0.3, yy, -2.4, -0.8, 0.8, '#468a3a', '#86c24e'); cleaf(g, x + sw * 0.3, yy - 0.8, 2.4, -0.7, 0.8, '#468a3a', '#86c24e'); }
    if (st >= 3) for (const [dx, dy] of [[-1.7, 0.45], [1.8, 0.62], [0.3, 0.8]]) cblob(g, x + dx, b - h * dy, st === 4 ? 1.35 : 0.9, st === 4 ? 1.3 : 0.9, st === 4 ? '#e23a2c' : '#8fc24e', st === 4 ? '#ff8a70' : '#c4e88a'); },
  corn: (g, x, b, st, sw) => { const h = [0, 3, 7, 11, 13][st]; cstem(g, x, b, x + sw * 0.5, b - h, '#5a9a3a', 0.8);
    for (const [s, k] of [[-1, 0.35], [1, 0.5], [-1, 0.65]]) { if (st === 1 && k > 0.4) continue; cleaf(g, x + sw * k * 0.4, b - h * k, s * (3.4 + h * 0.1), -1 + (st >= 3 ? 1.6 : 0), 0.85, '#4f9a3a', '#98d060'); }
    if (st >= 3) { for (const s of [-1, 0, 1]) ln(g, x + sw * 0.5, b - h, x + sw * 0.5 + s * 1.4, b - h - 1.8, '#d8c060', 0.35); }
    if (st === 4) { cblob(g, x + 1.9, b - h * 0.55, 1.1, 2.6, '#f2d04a', '#fff0a0', 0.25); cleaf(g, x + 1.4, b - h * 0.5 + 1.8, 1, -3.4, 0.8, '#6aae44'); } },
  pumpkin: (g, x, b, st, sw) => { const L = '#4f8a3a', H = '#8cc65a'; for (const s of [-1, 1]) cleaf(g, x, b - 0.6, s * (st === 1 ? 2 : 3.4), -0.5 - (st >= 2 ? 0.6 : 0), st === 1 ? 0.7 : 1.5, L, H);
    if (st >= 2) ln(g, x - 3.4, b - 0.2, x + 3.4, b + 0.2, '#6aa044', 0.35);
    if (st >= 3) { const r = st === 4 ? 3.3 : 1.7; cblob(g, x, b - r * 0.8, r, r * 0.78, st === 4 ? '#e8832a' : '#a8c04a', st === 4 ? '#ffbe5a' : '#d4e480'); if (st === 4) { ln(g, x - 1.1, b - r * 1.5, x - 1.4, b - 0.4, 'rgba(150,70,10,.5)', 0.25); ln(g, x + 1.1, b - r * 1.5, x + 1.4, b - 0.4, 'rgba(150,70,10,.5)', 0.25); } cstem(g, x, b - r * 1.5, x + 0.4, b - r * 1.5 - 1.1, '#6a8a34', 0.6); } },
  strawberry: (g, x, b, st, sw) => { const L = '#3f8a3a', H = '#86c24e'; for (const [dx, dy] of st === 1 ? [[0, 0]] : [[-1.8, 0], [1.8, 0], [0, -1.2]]) { cleaf(g, x + dx, b + dy, -1.8, -1.2, 0.8, L, H); cleaf(g, x + dx, b + dy, 1.8, -1.2, 0.8, L, H); cleaf(g, x + dx, b + dy, 0, -2.2, 0.8, L, H); }
    if (st === 3) for (const [dx, dy] of [[-2.2, -2.6], [1.8, -2.2], [0, -3.4]]) { dab(g, x + dx, b + dy, 0.8, 0.8, 0, '#fff'); dab(g, x + dx, b + dy, 0.28, 0.28, 0, '#f2c030'); }
    if (st === 4) for (const [dx, dy] of [[-2.4, 0.2], [2, 0.3], [0.2, 0.6]]) { cblob(g, x + dx, b + dy, 1.05, 1.25, '#e0283a', '#ff8a90'); dab(g, x + dx - 0.3, b + dy, 0.15, 0.15, 0, '#ffe890'); dab(g, x + dx + 0.3, b + dy + 0.4, 0.15, 0.15, 0, '#ffe890'); } },
  carrot: (g, x, b, st, sw) => { const h = [0, 2.5, 4.5, 6, 6.5][st]; for (const [s, k] of [[-1, 1], [0, 1.25], [1, 1], [0.5, 0.7]]) { cstem(g, x, b, x + s * 1.9 + sw * k * 0.5, b - h * k, '#4a9a3a', 0.35); if (st > 1) cblob(g, x + s * 1.9 + sw * k * 0.5, b - h * k, 0.9, 0.7, '#5aaa44', '#98d868'); }
    if (st >= 3) cblob(g, x, b - 0.1, st === 4 ? 1.7 : 1.1, st === 4 ? 1.1 : 0.7, '#f08a1c', '#ffbe5a'); },
  bean: (g, x, b, st, sw) => { const h = [0, 3, 7, 10, 11][st]; cstem(g, x, b, x, b - h - 1, '#8a5a34', 0.5); cstem(g, x + 0.9, b, x + 0.9 + sw * 0.3, b - h * 0.8, '#5aa044', 0.45);
    for (let k = 0; k < (st === 1 ? 1 : 4); k++) { const yy = b - h * (0.25 + k * 0.2), s = k % 2 ? 1 : -1; cleaf(g, x + 0.4, yy, s * 2.4, -0.9, 0.85, '#4f9a3a', '#98d060'); }
    if (st === 3) for (const [dx, dy] of [[-1, 0.5], [1.6, 0.7]]) dab(g, x + dx, b - h * dy, 0.5, 0.5, 0, '#fff');
    if (st === 4) for (const [dx, dy] of [[-1.5, 0.4], [1.8, 0.55], [-1.1, 0.7], [1.5, 0.85]]) cleaf(g, x + dx, b - h * dy, 0.3, 2.8, 0.55, '#6fb04a', '#a8e078'); },
  lavender: (g, x, b, st, sw) => { const L = '#6a9a7a', H = '#a4c8a8'; for (const s of [-1, 0, 1]) cleaf(g, x, b, s * 2, -(st === 1 ? 1.6 : 2.6), 0.5, L, H); if (st === 1) return;
    for (const s of [-1.6, -0.6, 0.6, 1.6]) { const hh = [0, 0, 4.4, 5.8, 7][st] - Math.abs(s) * 0.5, tx = x + s * 1.1 + sw * 0.3; cstem(g, x + s * 0.5, b - 1, tx, b - hh, '#5a8a5a', 0.3);
      if (st >= 3) for (let k = 0; k < 4; k++) dab(g, tx + (k % 2 ? 0.25 : -0.25), b - hh + 0.6 - k * 0.9 + 0.9, 0.7, 0.55, 0, st === 4 ? (k % 2 ? '#8a5ad0' : '#b088f0') : '#9aa0c8'); } },
  poppy: (g, x, b, st, sw) => { const L = '#6a9a5a', H = '#a4cc84'; for (const s of [-1, 1]) cleaf(g, x, b, s * 2.1, -1.4, 0.6, L, H); if (st === 1) return; const hh = [0, 0, 4, 6, 7][st], tx = x + sw * 0.4; cstem(g, x, b - 1, tx, b - hh, '#5a8a4a', 0.35);
    if (st === 2) cleaf(g, tx, b - hh, 0.2, -1.2, 0.5, L, H); if (st === 3) cblob(g, tx, b - hh, 0.9, 1.2, '#6aaa4a', '#a8dc7a'); if (st === 4) { for (const s of [-1, 1]) cblob(g, tx + s * 1.1, b - hh, 1.4, 1.5, '#e8281c', '#ff7a5a'); cblob(g, tx, b - hh - 0.5, 1.4, 1.5, '#d8201a', '#ff6a50'); dab(g, tx, b - hh, 0.55, 0.5, 0, '#2a2030'); } },
  daisy: (g, x, b, st, sw) => { const L = '#5aa044', H = '#98d868'; for (const s of [-1, 1]) cleaf(g, x, b, s * 2, -1.3, 0.55, L, H); if (st === 1) return; const hh = [0, 0, 3.6, 5, 5.8][st], tx = x + sw * 0.35; cstem(g, x, b - 1, tx, b - hh, '#5a9a44', 0.3);
    if (st === 3) cblob(g, tx, b - hh, 0.8, 0.9, '#d8ecb0', '#fff'); if (st === 4) { for (let k = 0; k < 7; k++) { const a = k * TAU / 7; cleaf(g, tx, b - hh, Math.cos(a) * 2.5, Math.sin(a) * 2.2, 0.55, '#fffaf0', '#fff'); } cblob(g, tx, b - hh, 0.95, 0.9, '#f4c830', '#ffe880'); } },
  marigold: (g, x, b, st, sw) => { const L = '#4f9a3a', H = '#88c858'; for (const s of [-1, 0, 1]) cleaf(g, x, b, s * 1.9, -(s ? 1.6 : 2.4), 0.5, L, H); if (st === 1) return; const hh = [0, 0, 3.6, 5, 5.6][st], tx = x + sw * 0.35; cstem(g, x, b - 1, tx, b - hh, '#4f8a3a', 0.35);
    if (st === 3) cblob(g, tx, b - hh, 1, 1, '#c8c050', '#e8e090'); if (st === 4) { cblob(g, tx, b - hh, 2.1, 1.8, '#f08a14', '#ffc050'); cblob(g, tx, b - hh - 0.2, 1.3, 1.1, '#f8a828', '#ffd880'); dab(g, tx, b - hh - 0.2, 0.5, 0.4, 0, '#d86a08'); } },
  rose: (g, x, b, st, sw) => { const L = '#3a7a3a', H = '#6ab04e'; cstem(g, x, b, x - 0.6, b - [0, 2, 4, 5, 5.6][st], '#6a4a2a', 0.5); if (st === 1) { cleaf(g, x, b - 0.5, 1.8, -1.4, 0.6, L, H); return; }
    for (const [dx, dy] of [[-1.8, -2], [1.8, -2.4], [0, -4], [-1.2, -4.6], [1.4, -4.4]]) { if (st === 2 && dy < -3) continue; cblob(g, x + dx + sw * 0.2, b + dy * (st === 2 ? 0.8 : 1), 1.7, 1.3, L, H); }
    if (st === 3) for (const [dx, dy] of [[-1.5, -4.8], [1.6, -5], [0.1, -6.4]]) cblob(g, x + dx, b + dy, 0.7, 0.9, '#b8284a', '#e8607a'); if (st === 4) for (const [dx, dy] of [[-1.7, -4.6], [1.7, -5], [0, -6.4], [-0.4, -3]]) { cblob(g, x + dx, b + dy, 1.35, 1.25, '#d82a52', '#ff7a9a'); dab(g, x + dx, b + dy, 0.55, 0.45, 0, '#a01a3a'); } },
};
function cropArt24(g, t, seed, st) {
  const D = CROP_ART[seed]; if (!D) return;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const x = 4.4 + j * 7.6 + (h32(i, j, 3, 7) - 0.5) * 1.2, b = 9.2 + i * 6.6, sw = tw(t, 1, j * 0.7 + i * 0.5) * 0.45 * Math.min(1, st / 2);
    dab(g, x + 0.3, b + 0.4, 1.8, 0.7, 0, 'rgba(36,20,30,.4)');
    if (st === 5) { const dry = '#a08a58'; cstem(g, x, b, x + 1.6, b - 3.2, dry, 0.4); cleaf(g, x, b, -2.2, -0.6, 0.55, '#8a7448'); cleaf(g, x + 1.6, b - 3.2, 1.6, 1.8, 0.7, '#9a8250', '#b8a470'); continue; }
    D(g, x, b, st, sw); }
}

/* a field plot before it grows anything: rough and weedy until somebody ploughs it, then dark turned earth in three deep rows (the rows the seeds go into) */
function field24(g, raw) {
  const r = (i, n) => h32(i, n, 41, raw ? 3 : 4);
  if (raw) {
    g.fillStyle = '#85694a'; g.fillRect(0, 0, 24, 24);
    for (let i = 0; i < 16; i++) dab(g, r(i, 1) * 24, r(i, 2) * 24, 2 + r(i, 3) * 3.4, 1.2 + r(i, 4) * 1.8, r(i, 5) * 3, i % 3 ? 'rgba(168,140,98,.5)' : 'rgba(96,72,50,.5)');
    for (let i = 0; i < 9; i++) { const x = 1.5 + r(i, 6) * 21, y = 2 + r(i, 7) * 20, h = 2 + r(i, 8) * 2.4;                                    // weed tufts
      for (const d of [-1.1, 0, 1.1]) ln(g, x, y, x + d * (0.8 + r(i, 9)), y - h + Math.abs(d) * 0.5, i % 2 ? '#5f8a3a' : '#7da446', 0.55); }
    for (let i = 0; i < 4; i++) { const x = 2 + r(i, 10) * 20, y = 2 + r(i, 11) * 20; dab(g, x + 0.4, y + 0.6, 1.5, 0.8, 0, 'rgba(50,34,26,.4)'); dab(g, x, y, 1.4, 0.9, 0, '#a9a398'); dab(g, x - 0.3, y - 0.3, 0.7, 0.4, 0, '#cfcac0'); }
    return;
  }
  g.fillStyle = '#3a2418'; g.fillRect(0, 0, 24, 24);
  for (let k = 0; k < 3; k++) { const y0 = 0.6 + k * 7.6;
    g.fillStyle = '#2a190f'; g.fillRect(0, y0 + 5.1, 24, 2.4);                                                          // the furrow: deep shade between the ridges
    g.fillStyle = '#6a452d'; g.beginPath(); g.moveTo(0, y0 + 5.1); g.lineTo(0, y0 + 1.1); for (let x = 4; x < 24; x += 4) g.lineTo(x, y0 + 0.6 + r(k * 7 + x, 12) * 1.0); g.lineTo(24, y0 + 1.1); g.lineTo(24, y0 + 5.1); g.closePath(); g.fill();   // the ridge
    ln(g, 0, y0 + 1.6, 24, y0 + 1.5, '#92694a', 0.9, 'butt'); ln(g, 0, y0 + 3.4, 24, y0 + 3.5, '#4d311f', 0.8, 'butt');   // sun on its crown, shade on its flank
    for (let i = 0; i < 7; i++) { const x = r(k * 9 + i, 13) * 24, y = y0 + 1.2 + r(k * 9 + i, 14) * 2.6; dab(g, x + 0.3, y + 0.5, 1.1, 0.6, 0, 'rgba(30,16,10,.45)'); dab(g, x, y, 1.0 + r(k * 9 + i, 15) * 0.7, 0.65, 0, i % 2 ? '#80573a' : '#74502f'); }   // clods
  }
}

/* ================= the heart statue, Hoot's post, lanterns, relics ================= */
function statue24(g, t, fill) { /* 2 tiles wide, 3 tall: ground line at y = 70 */
  const px = 24, py = 62; shadowE(g, px + 0.8, py + 5, 20.4, 6.2);
  stoneBlocks(g, blob(px, py + 0.6, 19.2, 7.2, 94, 36, 0.02, 3), { P: pal('#8f9498', '#e6e4da', '#b4b8ba'), seed: 94, course: 3.6, bw: 6.4 });
  g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(px, py - 0.2, 16.6, 5.8, 0, 0, TAU); g.fill();
  const wg = g.createLinearGradient(0, py - 5, 0, py + 5); wg.addColorStop(0, '#7cc0f0'); wg.addColorStop(0.6, '#4f93d0'); wg.addColorStop(1, '#3a76b8'); g.fillStyle = INK; g.beginPath(); g.ellipse(px, py, 15.4, 5.2, 0, 0, TAU); g.fill(); g.fillStyle = wg; g.beginPath(); g.ellipse(px, py + 0.1, 14.8, 4.7, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(40,50,130,.28)'; g.beginPath(); g.ellipse(px + 3, py + 1.2, 11, 3, 0, 0, TAU); g.fill();
  for (let i = 0; i < 4; i++) { const x = px - 10 + i * 6.4 + tw(t, 1, i) * 1.4, y = py - 1 + (i % 2) * 2; ln(g, x, y, x + 2.4, y, 'rgba(255,255,255,.75)', 0.38); }
  for (let i = 0; i < 2; i++) { const p = (t * 2 + i / 2) % 1; g.strokeStyle = `rgba(255,255,255,${0.5 * (1 - p)})`; g.lineWidth = 0.3; g.beginPath(); g.ellipse(px, py + 0.4, 3 + p * 11, 1 + p * 3.8, 0, 0, TAU); g.stroke(); }
  const top = py - 34, wb = 8, wt = 6, pil = [[px - wb, py], [px - wt, top], [px + wt, top], [px + wb, py]];
  stoneBlocks(g, pil, { P: pal('#a9adb1', '#eef0ea', '#cfd2d4'), seed: 95, course: 5.6, bw: 6.4, rim: 0.5 });
  g.fillStyle = 'rgba(60,64,150,.3)'; g.beginPath(); g.moveTo(px + 1.5, top); g.lineTo(px + wt, top); g.lineTo(px + wb, py); g.lineTo(px + 2.6, py); g.fill();
  const gy0 = top + 4, gh = py - top - 7;
  g.fillStyle = INK; g.fillRect(px - 3.8, gy0 - 0.6, 7.6, gh + 1.2); g.fillStyle = '#3e4246'; g.fillRect(px - 3.2, gy0, 6.4, gh); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(px - 3.2, gy0, 6.4, 2);
  const fh = gh * (fill / 4); if (fill > 0) { const rg = g.createLinearGradient(px - 3.2, 0, px + 3.2, 0); rg.addColorStop(0, '#ff6a72'); rg.addColorStop(0.5, '#e0303a'); rg.addColorStop(1, '#a8202c'); g.fillStyle = rg; g.fillRect(px - 3.2, py - 3 - fh, 6.4, fh); g.fillStyle = 'rgba(255,200,200,.8)'; g.fillRect(px - 3.2, py - 3 - fh, 6.4, 0.9); g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(px - 2.6, py - 3 - fh + 1, 0.9, Math.max(0, fh - 1)); }
  g.fillStyle = 'rgba(255,255,255,.16)'; g.beginPath(); g.moveTo(px - 3.2, gy0); g.lineTo(px - 0.6, gy0); g.lineTo(px - 3.2, gy0 + gh * 0.55); g.fill(); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 0.2; for (let k = 1; k < 4; k++) { const y = gy0 + gh * k / 4; g.beginPath(); g.moveTo(px - 3.2, y); g.lineTo(px - 2, y); g.stroke(); }
  c24(g, [[[px - 7.4, top], [px + 7.4, top], [px + 6.4, top - 2], [px - 6.4, top - 2]]], pal('#bcc0c4', '#f4f6f0', null), { smooth: false, seed: 96, hs: 0.01, iw: 0.14 });
  const hy = top - 6, pulse = 1 + (fill >= 4 ? 0.05 * tw(t) : 0), hp = []; for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; hp.push([px + 0.6 * pulse * 9 * Math.pow(Math.sin(a), 3) / 1.0 * 0.96, hy + 1 - 0.66 * pulse * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * 0.74]); }
  c24(g, [hp], pal(fill >= 4 ? '#ff5a6a' : '#8a8f94', fill >= 4 ? '#ffc0c8' : '#d8dcde', fill >= 4 ? '#ff9aa4' : '#b8bcbe'), { seed: 96, hs: 0.5, lx: -0.7, ly: -0.9 });
  g.save(); g.beginPath(); trace(g, hp, true); g.clip(); g.fillStyle = 'rgba(60,40,120,.22)'; g.beginPath(); g.moveTo(px + 1, hy - 6); g.lineTo(px + 9, hy - 6); g.lineTo(px + 9, hy + 12); g.lineTo(px + 1, hy + 7); g.fill(); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 0.22; g.beginPath(); g.moveTo(px, hy - 3.4); g.lineTo(px, hy + 6); g.stroke(); g.restore();
  if (fill >= 4) glow24(g, px, py - 18, 30, '255,90,110', 0.3 + 0.06 * tw(t)); tufts(g, px - 19, px + 19, py + 6.6, 97, 9, 2); }
function owlpost24(g, t, jobs) { /* 1 wide, 2 tall: ground at y = 44 */
  const px = 12, py = 42, fi = Math.round(t * FR), blink = fi >= 50 && fi < 56, sway = tw(t) * 0.45;
  shadowE(g, px + 0.8, py + 2.2, 9.6, 3);
  wood(g, px - 3, py - 22, 6, 24, { dir: 'v', planks: 1, seed: 97, P: pal('#6e4a2a', '#d09860', '#9a6e44'), nails: false, knots: 0.9 }); tufts(g, px - 5, px + 5, py + 2.2, 98, 4, 1.6);
  for (let i = 0; i < Math.min(5, jobs); i++) { const nx = px + (i % 2 ? 2.4 : -7.6), ny = py - 19 + i * 4, fl = tw(t, 1, i * 1.3) * 0.5; g.save(); g.translate(nx + 3, ny + 2); g.rotate(fl * 0.04 + (i % 2 ? 0.04 : -0.05));
    c24(g, [[[-3, -2.1], [3.4, -2.1], [3.4, 2.3], [-3, 2.3]]], pal('#f3ead2', '#fffaf0', null), { smooth: false, seed: 120 + i, hs: 0.01, iw: 0.12, rim: 0.25 }); fillPoly(g, [[2.2, 2.3], [3.4, 1.1], [3.4, 2.3]], 'rgba(150,126,86,.6)');
    for (const [y, w] of [[-1.1, 4.8], [-0.1, 4.2], [0.9, 3]]) ln(g, -2.3, y, -2.3 + w, y, 'rgba(90,60,30,.55)', 0.2); dab(g, 0.4, -1.8, 0.5, 0.5, 0, INK); dab(g, 0.4, -1.9, 0.38, 0.38, 0, '#c0392b'); dab(g, 0.25, -2.05, 0.12, 0.12, 0, 'rgba(255,255,255,.8)'); g.restore(); }
  const oy = py - 31 + sway, OP = pal('#8a5a30', '#e8b078', '#b07a44'), K = kage(hx('#8a5a30'), 1);
  // wings behind, then the body with rows of feathers, the pale belly, the face disc
  for (const s of [-1, 1]) c24(g, [[[px + s * 7.4, oy - 1], [px + s * 9.6, oy + 4], [px + s * 8.4, oy + 11], [px + s * 5.6, oy + 12], [px + s * 5.8, oy + 3]]], pal('#74482a', '#d4985c', null), { smooth: true, seed: 121 + s, hs: 0.01, iw: 0.14 });
  c24(g, [blob(px, oy + 3, 8.4, 9.8, 97, 30, 0.06, 4)], OP, { seed: 97, hs: 0.01, lx: -0.9, ly: -1.1 });
  g.save(); g.beginPath(); trace(g, blob(px, oy + 3, 8.4, 9.8, 97, 30, 0.06, 4), true); g.clip(); g.fillStyle = 'rgba(60,50,140,.22)'; g.fillRect(px + 2, oy - 8, 8, 24);
  for (let r = 0; r < 6; r++) for (let k = 0; k < 6; k++) { const x = px - 6 + k * 2.4 + (r % 2) * 1.2, y = oy + 3 + r * 2.2; g.strokeStyle = 'rgba(60,34,18,.45)'; g.lineWidth = 0.17; g.beginPath(); g.arc(x, y, 1.2, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); g.strokeStyle = 'rgba(240,196,140,.4)'; g.beginPath(); g.arc(x - 0.1, y - 0.15, 1.1, 1.1 * Math.PI, 1.8 * Math.PI); g.stroke(); } g.restore();
  c24(g, [blob(px, oy + 7.4, 4.8, 5.2, 98, 20, 0.08, 3)], pal('#c89a60', '#f4d6a4', '#e6bb84'), { ink: false, hs: 0.01, iw: 0.1 }); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) dab(g, px - 2.4 + i * 2.4 + j * 1.2, oy + 5.8 + j * 2.2, 0.6, 0.42, 0, 'rgba(110,70,34,.6)');
  for (const s of [-1, 1]) { const tip = [[px + s * 8, oy - 4], [px + s * 6.4, oy - 11.4], [px + s * 3, oy - 5]]; c24(g, [tip], pal('#8a5a30', '#e8b078', null), { smooth: false, seed: 123 + s, hs: 0.01, iw: 0.14 }); fillPoly(g, [[px + s * 6.9, oy - 5.2], [px + s * 6.4, oy - 9], [px + s * 4.6, oy - 5.6]], '#4a2e1a'); }
  c24(g, [blob(px, oy - 0.6, 7.4, 4.8, 99, 24, 0.04, 3)], pal('#e8d2a4', '#fff6dc', null), { ink: false, hs: 0.01, iw: 0.1 }); ln(g, px, oy - 4, px, oy + 1.6, 'rgba(120,80,40,.35)', 0.2);
  for (const sx of [-3.6, 3.6]) { dab(g, px + sx, oy - 1, 3.7, 3.7, 0, INK); dab(g, px + sx, oy - 1, 3.2, 3.2, 0, '#f4ead0'); if (blink) ln(g, px + sx - 2.6, oy - 1, px + sx + 2.6, oy - 1, INK, 0.5); else { dab(g, px + sx, oy - 1, 1.95, 1.95, 0, '#e8a020'); dab(g, px + sx, oy - 0.8, 1.5, 1.4, 0, '#f4c040'); dab(g, px + sx + 0.2, oy - 1, 1, 1, 0, '#1a1208'); dab(g, px + sx - 0.6, oy - 1.8, 0.5, 0.5, 0, '#fff'); dab(g, px + sx + 0.5, oy - 0.2, 0.24, 0.24, 0, 'rgba(255,255,255,.7)'); } }
  c24(g, [[[px - 1.3, oy + 1.2], [px + 1.3, oy + 1.2], [px, oy + 4.2]]], pal('#e8a020', '#fff0a0', null), { smooth: false, seed: 124, hs: 0.01, iw: 0.1 }); }
function gem24(g, x, y, lit, t) { dab(g, x, y, 3.4, 3.9, 0, '#3c3e38'); dab(g, x - 0.4, y - 0.4, 2.8, 3.3, 0, '#5c5f56');
  if (lit) { const gl = 0.75 + 0.25 * tw(t); poly24(g, [[x, y - 3.2], [x + 2.6, y - 0.6], [x, y + 3.2], [x - 2.6, y - 0.6]], '#2f8fe0', 0.25); fillPoly(g, [[x, y - 3.1], [x + 2.5, y - 0.6], [x, y - 0.2]], `rgba(150,215,255,${gl})`); dab(g, x - 0.8, y - 1.4, 0.45, 0.45, 0, '#fff'); glow24(g, x, y, 9, '90,180,255', 0.4 * gl); }
  else fillPoly(g, [[x, y - 2.6], [x + 2, y - 0.5], [x, y + 2.6], [x - 2, y - 0.5]], '#1c1d1a'); }
function lantern24(g, t, lit, hasGem) { /* 1 wide, 2 tall: ground y = 46 */ shadowE(g, 12.8, 46.4, 8.8, 2.2); const fl = Math.sin(TAU * t * 2) * 1;
  stoneBlocks(g, rect(5, 40, 14, 5.6), { P: pal('#6f726a', '#c4c8b8', '#9a9e92'), seed: 101, course: 2.8, bw: 4.6 });
  stoneBlocks(g, [[8.4, 40], [8, 22], [16, 22], [15.6, 40]], { P: pal('#878a80', '#d8dccc', '#a4a79c'), seed: 102, course: 4.2, bw: 4.4 });
  g.fillStyle = 'rgba(60,64,150,.26)'; g.fillRect(12.2, 22, 3.8, 18);
  gem24(g, 12, 33.4, !!hasGem, t);
  c24(g, [[[3.6, 16.4], [20.4, 16.4], [17.4, 22.4], [6.6, 22.4]]], pal('#7c7f76', '#d0d4c4', '#a4a79c'), { smooth: false, seed: 103, hs: 0.01, lx: -0.6, ly: -0.8 });
  const bg = g.createLinearGradient(0, 10, 0, 16.6); if (lit) { bg.addColorStop(0, '#5a3418'); bg.addColorStop(1, '#2a1a10'); } else { bg.addColorStop(0, '#3a3630'); bg.addColorStop(1, '#22201c'); } g.fillStyle = bg; g.fillRect(5, 10, 14, 6.6);
  if (lit) { glow24(g, 12, 14, 13, '255,170,80', 0.42); g.fillStyle = '#ff9a3a'; g.beginPath(); g.moveTo(8, 16); g.quadraticCurveTo(10 + fl, 9, 12 + fl, 6.4); g.quadraticCurveTo(14, 12, 16, 16); g.closePath(); g.fill(); g.fillStyle = '#ffd05a'; g.beginPath(); g.moveTo(9.6, 16); g.quadraticCurveTo(11.4 + fl * 0.6, 11, 12.4 + fl * 0.6, 8.6); g.quadraticCurveTo(13.6, 12.6, 14.4, 16); g.fill(); g.fillStyle = '#fff4c0'; g.beginPath(); g.ellipse(12.2 + fl * 0.3, 14.4, 1.1, 1.7, 0, 0, TAU); g.fill(); }
  for (const x of [5.6, 18.4]) wood(g, x - 0.7, 9.4, 1.4, 7.2, { dir: 'v', planks: 1, seed: 104, P: pal('#4a4252', '#9a90a6', null), nails: false, knots: 0 }); c24(g, [[[4, 10], [12, 5.2], [20, 10]]], pal('#4a4252', '#a69cb6', '#7a7086'), { smooth: false, seed: 105, hs: 0.01, iw: 0.12 });
  moss(g, 7.4, 42.4, 2.4, 1, 106); tufts(g, 3, 21, 46, 107, 6, 1.8); }
function idol24(g, t, found) { shadowE(g, 12.8, 21.8, 10, 2.8);
  rockPix(g, { bodies: [{ cx: 12, base: 21.8, rx: 9.2, ry: 20, rz: 8, seed: 107, extra: 3, jit: 0.1 }], P: pal('#788570', '#d4dccc', '#98a890'), ow: 0.24, heavy: 0.46, round: 6, warp: 1.1, y0: 0 });
  const eye = (x) => { g.fillStyle = INK; g.fillRect(x - 0.4, 6.4, 5.8, 3); g.fillStyle = found ? '#1a3a38' : '#2a3128'; g.fillRect(x, 6.8, 5, 2.2); if (found) { g.fillStyle = 'rgba(140,255,230,.8)'; g.fillRect(x + 0.6, 7.3, 3.8, 1.1); } g.fillStyle = 'rgba(220,230,210,.45)'; g.fillRect(x - 0.4, 9.2, 5.8, 0.4); };
  g.fillStyle = 'rgba(46,56,44,.5)'; g.fillRect(3.4, 4.6, 17.2, 1.6); g.fillStyle = 'rgba(220,230,210,.4)'; g.fillRect(3.4, 3.9, 17.2, 0.5); eye(5); eye(14);
  c24(g, [[[12, 7.8], [9.4, 14.4], [14.6, 14.4]]], pal('#6d7a65', '#c8d4c0', null), { smooth: false, seed: 108, hs: 0.01, iw: 0.12 }); g.fillStyle = 'rgba(40,50,110,.3)'; g.beginPath(); g.moveTo(12, 8); g.lineTo(14.6, 14.4); g.lineTo(12, 14.4); g.fill();
  g.fillStyle = INK; g.fillRect(6.4, 15.8, 11.2, 3.6); g.fillStyle = '#3a4236'; g.fillRect(7, 16.4, 10, 2.4); for (let x = 8.4; x < 17; x += 2) ln(g, x, 16.4, x, 18.8, 'rgba(200,210,190,.5)', 0.25);
  for (const [mx, my, mr] of [[4.4, 3, 2.4], [19, 3.8, 2.2], [5.4, 18.8, 2], [19.6, 17.8, 1.8]]) moss(g, mx, my, mr, mr * 0.5, 109 + mx);
  if (found) { for (const x of [5, 14]) { g.strokeStyle = 'rgba(120,230,210,.8)'; g.lineWidth = 0.22; g.strokeRect(x, 6.8, 5, 2.2); } glow24(g, 12, 8, 11, '120,230,210', 0.22 + 0.1 * tw(t)); } tufts(g, 2.6, 21.4, 22, 110, 7, 1.8); }
function obelisk24(g, t) { shadowE(g, 13, 46.6, 9.4, 2.6);
  const L = [[5, 46], [7, 8], [12, 1.5], [12, 46]], Rr = [[12, 1.5], [17, 8], [19, 46], [12, 46]], s = [[5, 46], [7, 8], [12, 1.5], [17, 8], [19, 46]];
  c24(g, [s], pal('#16161c', '#5a5a78', '#262634'), { smooth: false, seed: 108, hs: 0.01, lx: -1, ly: -1.2, rim: 0.5 });
  g.save(); g.beginPath(); trace(g, s, false); g.clip(); const lg = g.createLinearGradient(5, 0, 12, 0); lg.addColorStop(0, '#3a3a52'); lg.addColorStop(1, '#262636'); g.fillStyle = lg; g.beginPath(); trace(g, L, false); g.fill(); g.fillStyle = '#12121a'; g.beginPath(); trace(g, Rr, false); g.fill();
  g.fillStyle = 'rgba(180,170,255,.16)'; g.beginPath(); g.moveTo(6.4, 12); g.lineTo(8, 12); g.lineTo(9.4, 46); g.lineTo(6, 46); g.fill(); g.fillStyle = 'rgba(160,150,255,.2)'; g.beginPath(); g.moveTo(12, 1.5); g.lineTo(14, 7); g.lineTo(12, 7.6); g.fill();
  g.strokeStyle = 'rgba(120,110,200,.45)'; g.lineWidth = 0.18; g.beginPath(); g.moveTo(12, 1.5); g.lineTo(12, 46); g.stroke(); for (const y of [12, 26, 38]) { g.strokeStyle = 'rgba(100,92,170,.3)'; g.beginPath(); g.moveTo(6.8, y); g.lineTo(17.2, y + 0.4); g.stroke(); }
  g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 0.14; g.beginPath(); g.moveTo(14.2, 30); g.lineTo(15, 33); g.lineTo(14.4, 36.4); g.stroke(); g.restore();
  const a = 0.35 + 0.25 * tw(t); for (const [x, y] of [[10, 14], [13.5, 20], [10.6, 28], [13, 36]]) { g.strokeStyle = `rgba(150,120,255,${a + 0.2})`; g.lineWidth = 0.3; g.beginPath(); g.moveTo(x - 1.4, y); g.lineTo(x, y - 1.8); g.lineTo(x + 1.4, y); g.lineTo(x, y + 1.8); g.closePath(); g.stroke(); glow24(g, x, y, 3.4, '140,110,255', 0.2 * (a + 0.4)); }
  tufts(g, 3, 21, 46.2, 111, 6, 1.8); }
function heartgem24(g, t) { const b = tw(t) * 1.2, s = 1 + tw(t, 2) * 0.07; glow24(g, 12, 12 + b, 12, '80,180,255', 0.4); g.save(); g.translate(12, 12 + b); g.scale(s, s);
  const P = [[-6.5, -2], [-3.6, -6], [3.6, -6], [6.5, -2], [0, 7]]; c24(g, [P], pal('#3aa8f0', '#d8f4ff', '#a8e4ff'), { smooth: false, seed: 109, hs: 0.01, lx: -0.3, ly: -0.4, rim: 0.3 });
  g.save(); g.beginPath(); trace(g, P, false); g.clip();
  const F = (pts, col) => { g.fillStyle = col; g.beginPath(); trace(g, pts, false); g.fill(); };
  F([[-3.6, -6], [3.6, -6], [2.4, -2], [-2.4, -2]], '#bff0ff');                    // the table
  F([[-3.6, -6], [-2.4, -2], [-6.5, -2]], '#8fe0ff'); F([[3.6, -6], [6.5, -2], [2.4, -2]], '#4ab0f0');          // crown facets
  F([[-6.5, -2], [-2.4, -2], [0, 7]], '#4cb8f4'); F([[-2.4, -2], [2.4, -2], [0, 7]], '#2f8fe0'); F([[2.4, -2], [6.5, -2], [0, 7]], '#1f66b8');        // pavilion
  F([[-1.2, -4.8], [1.6, -4.8], [0.6, -3.2], [-1.6, -3.2]], 'rgba(255,255,255,.7)');
  g.strokeStyle = 'rgba(20,70,130,.55)'; g.lineWidth = 0.2; for (const [x1, y1, x2, y2] of [[-6.5, -2, 6.5, -2], [-3.6, -6, -2.4, -2], [3.6, -6, 2.4, -2], [-2.4, -2, 0, 7], [2.4, -2, 0, 7], [-2.4, -2, 2.4, -2]]) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  g.restore(); const sp = 0.5 + 0.5 * tw(t, 2, 1); g.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * sp})`; g.beginPath(); g.moveTo(-4, -5.4); g.lineTo(-3.4, -4.2); g.lineTo(-2, -3.8); g.lineTo(-3.4, -3.4); g.lineTo(-4, -2.2); g.lineTo(-4.6, -3.4); g.lineTo(-6, -3.8); g.lineTo(-4.6, -4.2); g.fill(); g.restore(); }

/* ================= ground decals: the small things that lie on grass, so a lawn is never just green ================= */
const leafAt = (g, x, y, a, L, w, col, ink, rib) => { g.save(); g.translate(x, y); g.rotate(a);
  const path = (k) => { g.beginPath(); g.moveTo(-L * k, 0); g.quadraticCurveTo(-L * 0.1, -w * k * 1.1, L * k, 0); g.quadraticCurveTo(-L * 0.1, w * k * 1.1, -L * k, 0); g.closePath(); };
  g.fillStyle = ink; path(1.0); g.save(); g.lineWidth = 0.4; g.strokeStyle = ink; g.lineJoin = 'round'; g.stroke(); g.restore(); g.fill();
  g.fillStyle = col; g.save(); g.translate(0.12, 0.1); g.scale(0.84, 0.72); path(1); g.restore(); g.fill();
  if (rib) { g.strokeStyle = rib; g.lineWidth = 0.16; g.lineCap = 'round'; g.beginPath(); g.moveTo(-L * 0.7, 0); g.lineTo(L * 0.8, 0); g.stroke(); }
  g.restore(); };
function bloom24(g, x, y, r, petal, ctr, rot, ink, lit = true) {
  for (let i = 0; i < 5; i++) { const a = rot + i / 5 * TAU; dab(g, x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95 * 0.9, r * 0.86, r * 0.7, a, ink); }
  dab(g, x, y, r * 1.08, r * 1.0, 0, ink);
  for (let i = 0; i < 5; i++) { const a = rot + i / 5 * TAU; dab(g, x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95 * 0.9, r * 0.74, r * 0.57, a, petal); }
  if (lit) dab(g, x - r * 0.32, y - r * 0.5, r * 0.34, r * 0.22, -0.5, 'rgba(255,255,255,.55)');
  dab(g, x, y, r * 0.5, r * 0.46, 0, ctr); dab(g, x - r * 0.12, y - r * 0.14, r * 0.17, r * 0.13, 0, 'rgba(255,255,255,.55)'); }
function decal24(g, kind, v) { const R = mul(900 + v * 37 + kind.length * 101); const GRN = inkOf('#3f7a3a', 0.62);
  if (kind === 'flowers') { const sets = [['#fbf6ec', '#f2c94c', 'daisy'], ['#f7d84c', '#d9862a', 'butter'], ['#b79af0', '#f6e27a', 'violet']][v % 3], n = 6 + (v % 2), hs = [];
    for (let i = 0; i < n; i++) hs.push({ x: 4.5 + R() * 15, y: 9 + R() * 9, h: 2.6 + R() * 2.4, a: (R() - 0.5) * 0.7, r: 0.95 + R() * 0.4, rot: R() * TAU });
    hs.sort((a, b) => a.y - b.y);
    for (const f of hs) { const tx = f.x + Math.sin(f.a) * f.h, ty = f.y - Math.cos(f.a) * f.h; ln(g, f.x, f.y, tx, ty, GRN, 0.78); ln(g, f.x, f.y, tx, ty, '#4f9140', 0.42);
      leafAt(g, f.x + Math.sin(f.a) * f.h * 0.4 - 0.9, f.y - f.h * 0.35, -0.5 - f.a, 1.3, 0.62, '#5fa34a', GRN, 'rgba(30,70,40,.5)'); leafAt(g, f.x + Math.sin(f.a) * f.h * 0.25 + 0.9, f.y - f.h * 0.22, 0.5 - f.a, 1.1, 0.55, '#6db553', GRN, 'rgba(30,70,40,.5)'); }
    for (const f of hs) { const tx = f.x + Math.sin(f.a) * f.h, ty = f.y - Math.cos(f.a) * f.h; bloom24(g, tx, ty, f.r, sets[0], sets[1], f.rot, inkOf(sets[0] === '#fbf6ec' ? '#b8a890' : sets[0], 0.7)); } return; }
  if (kind === 'clover') { const heads = [];
    for (let i = 0; i < 16; i++) { const a = R() * TAU, d = Math.sqrt(R()) * 8.4; heads.push({ x: 12 + Math.cos(a) * d * 1.12, y: 14.5 + Math.sin(a) * d * 0.58, s: 0.8 + R() * 0.4, a: R() * TAU, k: R() }); }
    heads.sort((a, b) => a.y - b.y);
    for (const c of heads) { const col = c.k < 0.5 ? '#5ea446' : '#78b95a'; for (let j = 0; j < 3; j++) { const a = c.a + j * TAU / 3; dab(g, c.x + Math.cos(a) * c.s * 0.62, c.y + Math.sin(a) * c.s * 0.5, c.s * 0.72, c.s * 0.58, a, GRN); }
      for (let j = 0; j < 3; j++) { const a = c.a + j * TAU / 3; dab(g, c.x + Math.cos(a) * c.s * 0.62, c.y + Math.sin(a) * c.s * 0.5, c.s * 0.56, c.s * 0.44, a, col); }
      ln(g, c.x - c.s * 0.5, c.y - 0.1, c.x + c.s * 0.1, c.y + 0.05, 'rgba(235,250,210,.7)', 0.14); }
    for (let i = 0; i < 4; i++) { const c = heads[(i * 5 + 3) % heads.length], bx = c.x + 0.3, by = c.y - 1.3; ln(g, c.x, c.y, bx, by, GRN, 0.5); dab(g, bx, by, 1.15, 1.0, 0, inkOf('#e8d4dc', 0.6)); dab(g, bx, by, 0.92, 0.8, 0, i % 2 ? '#fbeef2' : '#f4c8d6'); dab(g, bx - 0.3, by - 0.3, 0.38, 0.26, -0.4, 'rgba(255,255,255,.7)'); } return; }
  if (kind === 'pebbles') { shadowE(g, 12.6, 16.6, 8.4, 1.7); const ps = [];
    for (let i = 0; i < 6; i++) ps.push({ x: 5 + R() * 14, y: 11.5 + R() * 6.5, rx: 1.2 + R() * 1.8, k: 0.55 + R() * 0.2 }); ps.sort((a, b) => a.y - b.y);
    ps.forEach((p, i) => { shadowE(g, p.x + 0.3, p.y + p.rx * 0.5, p.rx * 0.95, p.rx * 0.32); c24(g, [blob(p.x, p.y, p.rx, p.rx * p.k, 40 + i + v * 9, 12, 0.1)], pal(['#a9adb3', '#b9b2a6', '#9fa8ac'][(i + v) % 3], '#eef0f1', '#d2d5d8'), { seed: 7 + i, smooth: true, hs: 0.42, rim: 0.28, lx: -0.5, ly: -0.65 }); });
    tufts(g, 5, 19, 18.2, 77 + v, 5, 1.8); return; }
  if (kind === 'leaves') { const cols = v % 2 ? [['#e8b23c', '#a8701a'], ['#d9822b', '#9a4a1a'], ['#c0572a', '#7a2a1a'], ['#7fae4c', '#3a6638']] : [['#d9822b', '#9a4a1a'], ['#e8b23c', '#a8701a'], ['#a8c24c', '#4a7a2a'], ['#c0572a', '#7a2a1a']];
    for (let i = 0; i < 9; i++) { const c = cols[(i * 7 + v) % 4], x = 4.5 + R() * 15, y = 10 + R() * 8; leafAt(g, x, y, R() * TAU, 2.2 + R() * 1.0, 1.0 + R() * 0.35, c[0], inkOf(c[1], 0.8), 'rgba(90,40,10,.5)'); } return; }
  if (kind === 'fern') { shadowE(g, 12.4, 19.6, 7.6, 1.7); const N = 6, base = [12, 19.4];
    for (let i = 0; i < N; i++) { const a = -1.25 + i / (N - 1) * 2.5 + (R() - 0.5) * 0.2, L = 6.2 + R() * 3.2 - Math.abs(a) * 1.0, cx = base[0] + Math.sin(a) * L * 0.6, cy = base[1] - L * 0.85, ex = base[0] + Math.sin(a) * L * 1.12, ey = base[1] - L * 0.55 + Math.abs(a) * 0.4;
      const pt = (t): [number, number] => { const u = 1 - t; return [u * u * base[0] + 2 * u * t * cx + t * t * ex, u * u * base[1] + 2 * u * t * cy + t * t * ey]; };
      for (let k = 0; k < 14; k++) ln(g, ...pt(k / 14), ...pt((k + 1) / 14), '#356f38', 0.6 - k * 0.025);
      for (let k = 1; k < 10; k++) { const t = k / 10, p = pt(t), q = pt(Math.min(1, t + 0.04)), dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, s = 1.7 * (1 - t * 0.78) * (0.8 + 0.3 * R());
        for (const sd of [-1, 1]) leafAt(g, p[0] + nx * sd * s * 0.5, p[1] + ny * sd * s * 0.5, Math.atan2(ny * sd + dy / l * 0.5, nx * sd + dx / l * 0.5), s, s * 0.4, sd > 0 ? '#86c460' : '#62a64a', '#3c8040', null); }
      ln(g, base[0], base[1], pt(0.97)[0], pt(0.97)[1], '#5a9a45', 0.34); } return; } }
function stump24(g, v) { shadowE(g, 12.8, 19.8, 8.4, 2.1); const GRN = inkOf('#3f7a3a', 0.62), R = mul(31 + v), bark = pal('#7a5234', '#c08a5c', '#9a6a44');
  const trunk = spl0([[6.2, 19.2], [6.9, 15.4], [7.0, 12.8], [12, 11.4], [17, 12.8], [17.1, 15.4], [17.9, 19.2], [15.4, 20.5], [12, 20.9], [8.6, 20.5]]);
  c24(g, [trunk], bark, { seed: 3 + v, smooth: true, hs: 0.3, rim: 0.5 });
  g.save(); g.beginPath(); trace(g, trunk, true); g.clip(); g.strokeStyle = 'rgba(40,22,18,.38)'; g.lineWidth = 0.2; g.lineCap = 'round'; for (let i = 0; i < 7; i++) { const x = 7.4 + i * 1.6 + (R() - 0.5) * 0.5; g.beginPath(); g.moveTo(x, 13.6); g.quadraticCurveTo(x + (R() - 0.5), 17, x + (R() - 0.5) * 1.4, 20.6); g.stroke(); } g.restore();
  moss(g, 14.4, 18.4, 3.4, 1.5, 11 + v); const top = blob(12, 12.6, 5.6, 2.45, 13 + v, 20, 0.04, 4);
  c24(g, [top], pal('#d8b27c', '#f6e2b8', '#ecc890'), { seed: 5, smooth: true, hs: 0.3, rim: 0.35 });
  g.save(); g.beginPath(); trace(g, top, true); g.clip(); g.strokeStyle = 'rgba(138,92,48,.62)'; g.lineWidth = 0.18; for (const k of [0.78, 0.56, 0.34]) { g.beginPath(); g.ellipse(12.2 + (R() - 0.5) * 0.3, 12.6, 5.6 * k, 2.45 * k, 0, 0, TAU); g.stroke(); } g.fillStyle = 'rgba(138,92,48,.7)'; g.beginPath(); g.ellipse(12.2, 12.6, 0.4, 0.2, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(138,92,48,.5)'; g.lineWidth = 0.14; g.beginPath(); g.moveTo(12.2, 12.6); g.lineTo(17, 12.1); g.stroke(); g.restore();
  tufts(g, 5, 19, 20.6, 5 + v, 6, 2.2);
  if (v) { leafAt(g, 9.5, 11.3, -0.6, 1.5, 0.7, '#6db553', GRN, null); leafAt(g, 10.8, 10.9, -1.2, 1.2, 0.55, '#7cc45e', GRN, null); ln(g, 10, 12.4, 10, 11.2, GRN, 0.4); } }
const spl0 = pts => pts;

/* ================= cutaway rooms: wall face, caps, doors, furniture (all 24 px geometry, drawn at 4x) ================= */
const IN2 = { cap: '#d9cba7', capDk: '#bdae88', capLt: '#efe4c6', trim: '#94603a', trimDk: '#6a4024', stone: '#7f8c9c', stoneLt: '#9aa8b8', mortar: '#566170', base: '#d9cba7' };
const WOODL = pal('#a8703f', '#e8b87c', '#c48a52'), WOODD = pal('#7a4a2a', '#c08a58', null), BLANKET = ['#4a6fa5', '#a54a4a', '#4a8f6a', '#8a5aa5', '#c0953a', '#8d9096'];   // (the last, grey, is a bed nobody owns)
const STONEP = pal('#8d949c', '#e4e6de', '#b4bac0'), IRON = pal('#4b5058', '#a4acb8', '#7b828c');
function floorUnder(g, kind, v = 0) { g.drawImage(terr(kind, v), 0, 0, 24, 24); }


/* periodic strokes along a wall strip: wrap round the 24 px tile so neighbouring tiles join */
function wrapStrokes(g, y0, y1, seed, n, len, col, w, wob = 0.25) { const R = mul(seed); for (let i = 0; i < n; i++) { const x = R() * 24, y = y0 + R() * (y1 - y0), l = len * (0.5 + R()), dy = (R() - 0.5) * wob; g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
  for (const o of [-24, 0, 24]) { g.beginPath(); g.moveTo(x + o, y); g.quadraticCurveTo(x + o + l / 2, y + dy, x + o + l, y + dy * 0.4); g.stroke(); } } g.lineCap = 'butt'; }
function wallFace24(g, win) { /* north wall, seen from the front; every row repeats every 24 px so tiles join */
  const ink = 'rgba(42,35,50,.78)';
  // plaster: cream, a lit upper band, a shaded lower band under the cap, brush strokes
  const pg = g.createLinearGradient(0, 0, 0, 7); pg.addColorStop(0, '#e6dab8'); pg.addColorStop(0.55, IN2.cap); pg.addColorStop(1, '#cdbf99'); g.fillStyle = pg; g.fillRect(0, 0, 24, 7);
  wrapStrokes(g, 0.6, 5.2, 11, 7, 6, 'rgba(255,250,232,.5)', 0.45); wrapStrokes(g, 0.6, 6, 12, 7, 5, 'rgba(150,130,90,.3)', 0.3);
  g.fillStyle = IN2.capDk; g.fillRect(0, 5.5, 24, 1.5); g.fillStyle = 'rgba(70,62,140,.16)'; g.fillRect(0, 5.5, 24, 1.5);
  // timber rail with grain
  const tg = g.createLinearGradient(0, 7, 0, 9.1); tg.addColorStop(0, '#b4794a'); tg.addColorStop(0.35, IN2.trim); tg.addColorStop(1, IN2.trimDk); g.fillStyle = tg; g.fillRect(0, 7, 24, 2.1);
  wrapStrokes(g, 7.3, 8.9, 13, 9, 7, 'rgba(60,34,24,.4)', 0.13, 0.2); wrapStrokes(g, 7.2, 8.4, 14, 5, 5, 'rgba(244,200,150,.35)', 0.12, 0.2); g.fillStyle = 'rgba(255,226,180,.45)'; g.fillRect(0, 7, 24, 0.3); g.fillStyle = IN2.trimDk; g.fillRect(0, 9.1, 24, 0.8);
  // blue-grey stone, two courses of blocks 11 wide, offset by half a block on the lower course
  g.fillStyle = IN2.mortar; g.fillRect(0, 9.9, 24, 10.3);
  for (let r = 0; r < 2; r++) { const y = 9.9 + r * 5.2, off = r ? -6 : 0; for (let i = 0; i < 3; i++) { const x = off + i * 12 + 0.5, k = i % 2, R = mul(300 + k * 17 + r * 5), tone = h32(k, r, 4, 4);
      g.fillStyle = tone < 0.5 ? IN2.stoneLt : '#8695a5'; g.fillRect(x, y + 0.4, 11, 4.2); g.fillStyle = 'rgba(255,255,255,.24)'; g.fillRect(x, y + 0.4, 11, 0.6); g.fillRect(x, y + 0.4, 0.4, 4.2);
      g.fillStyle = 'rgba(56,62,130,.26)'; g.fillRect(x, y + 3.7, 11, 0.9); g.fillRect(x + 10.5, y + 0.4, 0.5, 4.2);
      for (let q = 0; q < 6; q++) dab(g, x + 0.6 + R() * 9.8, y + 0.8 + R() * 3.4, 0.2 + R() * 0.3, 0.12 + R() * 0.15, R(), R() < 0.5 ? 'rgba(48,56,90,.3)' : 'rgba(236,240,250,.35)');
      if (R() < 0.7) { g.strokeStyle = 'rgba(40,46,76,.4)'; g.lineWidth = 0.12; g.beginPath(); const cx = x + 2 + R() * 7; g.moveTo(cx, y + 0.5); g.lineTo(cx + (R() - 0.5), y + 2.4); g.lineTo(cx + (R() - 0.5) * 1.6, y + 4.4); g.stroke(); } }
    g.fillStyle = IN2.mortar; g.fillRect(0, y + 4.6, 24, 0.6); }
  // skirting
  const sg = g.createLinearGradient(0, 20.2, 0, 24); sg.addColorStop(0, IN2.capLt); sg.addColorStop(0.2, IN2.base); sg.addColorStop(1, '#c4b58e'); g.fillStyle = sg; g.fillRect(0, 20.2, 24, 3.8); g.fillStyle = 'rgba(60,64,130,.16)'; g.fillRect(0, 22.4, 24, 1.6); wrapStrokes(g, 20.8, 23.6, 15, 4, 5, 'rgba(150,130,90,.3)', 0.25);
  g.fillStyle = ink; g.fillRect(0, 0, 24, 0.4); g.fillRect(0, 20.1, 24, 0.25);
  if (win) { const fr = [[6.4, 10.2], [17.6, 10.2], [17.6, 19.2], [6.4, 19.2]];
    g.fillStyle = 'rgba(30,24,50,.35)'; g.fillRect(6.9, 10.9, 11.6, 9.2);                                         // the opening casts a little shade
    wood(g, 6.4, 10.2, 11.2, 9, { dir: 'h', planks: 1, seed: 3, nails: false, knots: 0, P: pal('#7a4a2a', '#c08a58', '#9a6238') });
    const gl = g.createLinearGradient(0, 11.8, 0, 17.6); gl.addColorStop(0, '#b4c4f8'); gl.addColorStop(0.5, '#7b8fe0'); gl.addColorStop(1, '#5a6cc0'); g.fillStyle = gl; g.fillRect(8, 11.8, 8, 5.8);
    g.fillStyle = 'rgba(255,255,255,.34)'; g.beginPath(); g.moveTo(8.4, 11.8); g.lineTo(11.2, 11.8); g.lineTo(8.4, 15.4); g.fill(); g.beginPath(); g.moveTo(12.2, 11.8); g.lineTo(13.2, 11.8); g.lineTo(9.6, 16.6); g.lineTo(8.8, 16.6); g.fill();
    g.fillStyle = IN2.trimDk; g.fillRect(11.6, 11.8, 0.8, 5.8); g.fillRect(8, 14.4, 8, 0.8); g.fillStyle = 'rgba(255,220,170,.4)'; g.fillRect(11.6, 11.8, 0.25, 5.8);
    g.strokeStyle = INK; g.lineWidth = 0.18; g.strokeRect(8, 11.8, 8, 5.8);
    c24(g, [rect(5.6, 18.6, 12.8, 1.5)], pal('#b8bcc2', '#f0f0e6', null), { smooth: false, seed: 4, hs: 0.01, iw: 0.12 }); } }
/* a window in a side wall, seen from above: a frame and glass set across the thickness of the wall top (an overlay on the wall-top tile) */
function windowSide24(g) {
  g.fillStyle = 'rgba(30,24,50,.4)'; g.fillRect(2.5, 7.6, 19, 9.2);                                         // the opening casts a little shade
  wood(g, 1.6, 6.4, 20.8, 11.2, { dir: 'v', planks: 1, seed: 8, nails: false, knots: 0, P: pal('#7a4a2a', '#c08a58', '#9a6238') });
  const gl = g.createLinearGradient(0, 8, 0, 16); gl.addColorStop(0, '#b4c4f8'); gl.addColorStop(0.5, '#7b8fe0'); gl.addColorStop(1, '#5a6cc0'); g.fillStyle = gl; g.fillRect(4, 8, 16, 8);
  g.fillStyle = 'rgba(255,255,255,.34)'; g.beginPath(); g.moveTo(4.4, 8); g.lineTo(8.4, 8); g.lineTo(4.4, 13.6); g.fill(); g.beginPath(); g.moveTo(9.6, 8); g.lineTo(11.2, 8); g.lineTo(4.8, 15.4); g.lineTo(4.4, 15.4); g.fill();
  g.fillStyle = IN2.trimDk; g.fillRect(4, 11.6, 16, 0.8); g.fillRect(11.6, 8, 0.8, 8); g.fillStyle = 'rgba(255,220,170,.4)'; g.fillRect(4, 11.6, 16, 0.25);
  g.strokeStyle = INK; g.lineWidth = 0.18; g.strokeRect(4, 8, 16, 8); g.strokeRect(1.6, 6.4, 20.8, 11.2);
}
/* a staircase seen from above: wooden treads between two rails. Going up the treads get lighter toward the top; going down they fall into shadow. */
function stair24(g, up) {
  g.fillStyle = up ? '#5a3a24' : '#1c1410'; g.fillRect(1.5, 1, 21, 22);
  for (let i = 0; i < 6; i++) { const y = 1.6 + i * 3.6, k = up ? i / 5 : 1 - i / 5; g.fillStyle = up ? `rgb(${130 + 60 * k | 0},${88 + 40 * k | 0},${52 + 24 * k | 0})` : `rgb(${120 - 70 * (1 - k) | 0},${80 - 45 * (1 - k) | 0},${48 - 26 * (1 - k) | 0})`; g.fillRect(2.4, y, 19.2, 3.1); g.fillStyle = up ? 'rgba(255,230,190,.35)' : 'rgba(255,230,190,.12)'; g.fillRect(2.4, y, 19.2, 0.5); g.fillStyle = 'rgba(30,18,12,.55)'; g.fillRect(2.4, y + 2.7, 19.2, 0.5); }
  for (const x of [0.4, 21.6]) { g.fillStyle = INK; g.fillRect(x - 0.2, 0.6, 2.2, 22.8); g.fillStyle = '#9a6238'; g.fillRect(x + 0.2, 0.9, 1.4, 22.2); g.fillStyle = 'rgba(255,220,170,.4)'; g.fillRect(x + 0.2, 0.9, 0.4, 22.2); }
  g.fillStyle = INK; g.fillRect(1.9, 0.6, 20.2, 0.5); g.fillRect(1.9, 22.9, 20.2, 0.5);
  g.fillStyle = up ? 'rgba(255,255,255,.32)' : 'rgba(255,235,190,.42)'; g.beginPath(); g.moveTo(12, 3); g.lineTo(17.5, 9.5); g.lineTo(14, 9.5); g.lineTo(14, 20); g.lineTo(10, 20); g.lineTo(10, 9.5); g.lineTo(6.5, 9.5); g.closePath(); g.fill();   // the arrow: you walk in from the landing at its tail
}
/* a standing torch: a wooden stake with a wrapped head and a flame that flickers */
function torch24(g, t) {
  const fl = tw(t, 3, 0) * 0.5 + tw(t, 5, 1.3) * 0.3, rg = g.createRadialGradient(12, 8, 1, 12, 8, 11); rg.addColorStop(0, 'rgba(255,190,90,.38)'); rg.addColorStop(1, 'rgba(255,150,40,0)'); g.fillStyle = rg; g.fillRect(0, 0, 24, 22);
  dab(g, 12.4, 22.4, 3.6, 1, 0, 'rgba(30,20,20,.35)');
  g.fillStyle = INK; g.fillRect(10.6, 9, 3.6, 14); g.fillStyle = '#8a5a34'; g.fillRect(11.2, 9.4, 2.4, 13.2); g.fillStyle = 'rgba(255,220,170,.4)'; g.fillRect(11.2, 9.4, 0.7, 13.2);
  g.fillStyle = INK; g.fillRect(9.6, 6.2, 5.6, 4.4); g.fillStyle = '#5a3a24'; g.fillRect(10.2, 6.8, 4.4, 3.4); g.fillStyle = '#c8a46a'; g.fillRect(10.2, 8, 4.4, 0.7);
  dab(g, 12.4 + fl * 0.5, 4.4 - fl, 2.6, 3.7, fl * 0.08, INK); dab(g, 12.4 + fl * 0.5, 4.6 - fl, 2.1, 3.2, fl * 0.08, '#e8641c'); dab(g, 12.4 + fl * 0.3, 5.2 - fl * 0.6, 1.4, 2.3, 0, '#ffb62a'); dab(g, 12.4, 5.9, 0.7, 1.2, 0, '#fff2a8');
}
function cap24(g, side) { /* the top of a side or front wall, seen from above: whitewashed capping stones */
  const R = mul(17 + side.length); g.fillStyle = IN2.cap; g.fillRect(0, 0, 24, 24);
  for (let j = 0; j < 4; j++) { const y = j * 6, off = j % 2 ? 6 : 0; for (let i = -1; i < 3; i++) { const x = off + i * 12 + 0.3; g.fillStyle = (h32(i & 1, j, 7, side.length) < 0.5) ? '#ded1ae' : '#e8dcba'; g.fillRect(x, y + 0.3, 11.4, 5.4); g.fillStyle = 'rgba(255,252,236,.55)'; g.fillRect(x, y + 0.3, 11.4, 0.5); g.fillStyle = 'rgba(150,130,90,.22)'; g.fillRect(x, y + 5.2, 11.4, 0.5);
      for (let q = 0; q < 3; q++) dab(g, x + 0.6 + R() * 10, y + 0.8 + R() * 4.4, 0.25 + R() * 0.3, 0.15 + R() * 0.15, R(), R() < 0.5 ? 'rgba(150,130,90,.3)' : 'rgba(255,252,236,.5)'); }
    g.fillStyle = 'rgba(120,104,70,.45)'; g.fillRect(0, y + 5.7, 24, 0.5); }
  const ink = 'rgba(42,35,50,.9)', sh = 'rgba(60,45,100,.26)', corner = side.length === 2;   // a corner tile (WS, ES, WN, EN) is where two walls meet: no inner shading, only the outline
  if (corner && side.includes('S') && (side.includes('W') || side.includes('E'))) { g.fillStyle = ink; g.fillRect(side.includes('W') ? 0 : 22.7, 0, 1.3, 24); g.fillRect(0, 22.7, 24, 1.3); return; }
  if (side.includes('W')) { g.fillStyle = sh; g.fillRect(21, 0, 3, 24); g.fillStyle = ink; g.fillRect(0, 0, 1.3, 24); g.fillStyle = IN2.capLt; g.fillRect(1.3, 0, 0.7, 24); }
  if (side.includes('E')) { g.fillStyle = sh; g.fillRect(0, 0, 3, 24); g.fillStyle = ink; g.fillRect(22.7, 0, 1.3, 24); g.fillStyle = IN2.capLt; g.fillRect(22, 0, 0.7, 24); }
  if (side.includes('S')) { g.fillStyle = sh; g.fillRect(0, 0, 24, 3); g.fillStyle = ink; g.fillRect(0, 22.7, 24, 1.3); }
  if (side.includes('N')) { g.fillStyle = ink; g.fillRect(0, 0, 24, 1.3); } }
/* doors fill the whole 24 px tile, so a shut one reads as a door (planks, iron bands, a ring) and an open one as a doorway with the leaf swung back.
   North: seen from the front, set in the wall face. South: seen from above, at floor level, between two stone jambs.                         */
const DOORWOOD = pal('#9a6238', '#e0aa70', '#b4784a'), DOORDARK = pal('#7a4a2c', '#c08858', '#8e5c38');
function doorN24(g, open) {
  g.fillStyle = INK; g.fillRect(0, 0, 24, 24);
  g.fillStyle = '#9aa8b8'; g.fillRect(0, 0.6, 1.4, 23.4); g.fillRect(22.6, 0.6, 1.4, 23.4);          // stone jambs
  g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(0.2, 1, 0.5, 23); g.fillStyle = 'rgba(56,62,130,.3)'; g.fillRect(22.9, 1, 0.8, 23);
  if (open) {   // the doorway: dark inside, warm light on the floor, the leaves swung back against the jambs
    const dg = g.createLinearGradient(0, 2, 0, 24); dg.addColorStop(0, '#120d18'); dg.addColorStop(1, '#3a2a34'); g.fillStyle = dg; g.fillRect(1.4, 2.4, 21.2, 21.6);
    g.fillStyle = 'rgba(255,214,140,.34)'; g.beginPath(); g.moveTo(4, 24); g.lineTo(20, 24); g.lineTo(17, 14); g.lineTo(7, 14); g.closePath(); g.fill();
    for (const [x0, a] of [[1.4, 1], [22.6, -1]]) { g.save(); g.beginPath(); g.moveTo(x0, 2.4); g.lineTo(x0 + a * 3.4, 3.6); g.lineTo(x0 + a * 3.4, 24); g.lineTo(x0, 24); g.closePath(); g.clip();
      wood(g, Math.min(x0, x0 + a * 3.4), 2, 3.4, 22, { dir: 'v', planks: 1, seed: 6, nails: false, knots: 0.3, plain: true, P: DOORWOOD }); g.restore();
      g.strokeStyle = INK; g.lineWidth = 0.22; g.beginPath(); g.moveTo(x0, 2.4); g.lineTo(x0 + a * 3.4, 3.6); g.lineTo(x0 + a * 3.4, 24); g.stroke();
      for (const y of [8, 17]) { g.fillStyle = '#4b5058'; g.fillRect(Math.min(x0, x0 + a * 3.4), y, 3.4, 1.1); } }
  } else {      // shut: vertical planks, two iron bands, studs, a ring pull
    g.save(); g.beginPath(); g.rect(1.4, 2.4, 21.2, 21.6); g.clip();
    wood(g, 1.4, 2.4, 21.2, 21.6, { dir: 'v', planks: 6, seed: 7, nails: false, knots: 0.5, plain: true, P: DOORWOOD });
    g.fillStyle = 'rgba(46,32,70,.22)'; g.fillRect(12, 2.4, 10.6, 21.6);                                  // the shade on the far half
    g.strokeStyle = 'rgba(40,24,30,.55)'; g.lineWidth = 0.22; for (let k = 1; k < 6; k++) { g.beginPath(); g.moveTo(1.4 + k * 3.53, 2.4); g.lineTo(1.4 + k * 3.53, 24); g.stroke(); }
    for (const y of [7.5, 17.5]) { c24(g, [rect(1.4, y - 1, 21.2, 2)], IRON, { smooth: false, seed: 8, hs: 0.01, iw: 0.12, rim: 0.2 }); for (const x of [3.4, 8, 12, 16, 20.6]) dab(g, x, y, 0.32, 0.32, 0, '#c8ccd6'); }
    g.restore();
    g.strokeStyle = '#2a2332'; g.lineWidth = 0.9; g.beginPath(); g.arc(18.4, 13.6, 1.5, 0, 6.3); g.stroke(); g.strokeStyle = '#b8bec8'; g.lineWidth = 0.45; g.beginPath(); g.arc(18.4, 13.6, 1.5, 0, 6.3); g.stroke(); dab(g, 18.4, 12, 0.7, 0.7, 0, '#6b7380');
  }
  g.fillStyle = '#6a4830'; g.fillRect(0, 0, 24, 2.4); g.fillStyle = 'rgba(255,230,190,.35)'; g.fillRect(0, 0.2, 24, 0.5); g.fillStyle = INK; g.fillRect(0, 2.2, 24, 0.35);   // the lintel beam
}
function doorS24(g, open) {
  g.fillStyle = INK; g.fillRect(0, 0, 24, 24);
  g.fillStyle = '#9aa8b8'; g.fillRect(0, 0, 24, 1.8); g.fillRect(0, 22.2, 24, 1.8);                  // the stone sills at either end of the doorway
  g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(0, 0.2, 24, 0.5); g.fillStyle = 'rgba(56,62,130,.3)'; g.fillRect(0, 21.3, 24, 0.7);
  if (open) {   // seen from above: the doorway is a dark threshold with the leaf folded back along one side
    const dg = g.createLinearGradient(0, 0, 24, 0); dg.addColorStop(0, '#2c2030'); dg.addColorStop(1, '#4a3a42'); g.fillStyle = dg; g.fillRect(0, 1.8, 24, 20.4);
    g.fillStyle = 'rgba(255,214,140,.32)'; g.fillRect(0, 1.8, 24, 20.4);
    g.save(); g.beginPath(); g.rect(0, 2, 24, 20); g.clip(); wood(g, 0.6, 2.4, 3.6, 19.2, { dir: 'v', planks: 1, seed: 6, nails: false, knots: 0.3, plain: true, P: DOORWOOD }); g.restore();
    g.strokeStyle = INK; g.lineWidth = 0.22; g.strokeRect(0.6, 2.4, 3.6, 19.2); for (const y of [4.4, 18.6]) { g.fillStyle = '#4b5058'; g.fillRect(0.6, y, 3.6, 1.1); }
  } else {      // shut: the door leaf lying across the doorway, planks along the wall, iron straps and a ring pull
    g.save(); g.beginPath(); g.rect(0, 1.8, 24, 20.4); g.clip();
    wood(g, 0, 1.8, 24, 20.4, { dir: 'h', planks: 4, seed: 9, nails: false, knots: 0.5, plain: true, P: DOORWOOD });
    g.fillStyle = 'rgba(46,32,70,.2)'; g.fillRect(0, 12.5, 24, 9.7);
    g.strokeStyle = 'rgba(40,24,30,.55)'; g.lineWidth = 0.22; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(0, 1.8 + k * 5.1); g.lineTo(24, 1.8 + k * 5.1); g.stroke(); }
    for (const x of [4.5, 19.5]) { c24(g, [rect(x - 1, 1.8, 2, 20.4)], IRON, { smooth: false, seed: 8, hs: 0.01, iw: 0.12, rim: 0.2 }); for (const y of [4.4, 9.4, 14.4, 19.4]) dab(g, x, y, 0.32, 0.32, 0, '#c8ccd6'); }
    g.restore();
    g.strokeStyle = '#2a2332'; g.lineWidth = 0.9; g.beginPath(); g.arc(12, 12, 1.7, 0, 6.3); g.stroke(); g.strokeStyle = '#b8bec8'; g.lineWidth = 0.45; g.beginPath(); g.arc(12, 12, 1.7, 0, 6.3); g.stroke(); dab(g, 12, 10.2, 0.7, 0.7, 0, '#6b7380');
  }
}

/* furniture */
function shadeC(hex, k) { const c = hx(hex); return rgba(mixc(c, [255, 255, 255], k)); }
function fabric(g, shape, col, o: any = {}) { const C = hx(col); c24(g, [shape], pal(col, rgba(mixc(C, [255, 250, 236], 0.5)), rgba(mixc(C, [255, 255, 255], 0.26))), Object.assign({ smooth: o.smooth ?? false, seed: o.seed || 8, hs: 0.01, lx: -0.4, ly: -0.6, rim: 0.4, iw: 0.15 }, o.cel || {})); }
function bed24(g, col, top) { shadowE(g, 12.8, 22.6, 10.6, 2.2); const C = hx(col);
  // frame and headboard
  wood(g, 2.4, 1.2, 19.2, 21.6, { dir: 'v', planks: 1, seed: 6, P: WOODL, nails: false, knots: 0.5 });
  wood(g, 3, top ? 1.4 : 18.4, 18, 4.2, { dir: 'h', planks: 1, seed: 7, P: pal('#7a4a2a', '#c08a58', '#9a6238'), nails: false, knots: 0.6, shape: [[3, top ? 1.4 : 18.4], [21, top ? 1.4 : 18.4], [21, top ? 5.6 : 22.6], [3, top ? 5.6 : 22.6]] });
  g.fillStyle = 'rgba(30,20,50,.18)'; g.fillRect(3.4, top ? 5.6 : 17.6, 17.2, 0.8);
  // mattress and linen
  fabric(g, rect(3.8, top ? 5.9 : 3.2, 16.4, 14.2), '#efe6cc', { seed: 5, cel: { iw: 0.12 } });
  // pillow: plump, stitched, a crease in the middle
  const py = top ? 8.6 : 14.4; c24(g, [blob(12, py, 6.6, 2.7, 3, 22, 0.06, 3)], pal('#f8efc4', '#fffcec', '#ffffff'), { seed: 7, hs: 0.45, iw: 0.15, lx: -0.5, ly: -0.7 });
  g.strokeStyle = 'rgba(170,150,100,.55)'; g.lineWidth = 0.15; g.beginPath(); g.moveTo(5.6, py - 0.2); g.quadraticCurveTo(12, py + (top ? 1 : -1) * 0.9, 18.4, py - 0.2); g.stroke(); g.setLineDash([0.4, 0.35]); g.beginPath(); g.ellipse(12, py, 6, 2.2, 0, 0, TAU); g.stroke(); g.setLineDash([]);
  // blanket with a folded-back cuff, quilting and a crease
  const by = top ? 11.4 : 3.2, bh = 8.6, cuffy = top ? by : by + bh;
  fabric(g, rect(3.8, by, 16.4, bh), col, { seed: 8 });
  g.save(); g.beginPath(); g.rect(3.8, by, 16.4, bh); g.clip(); g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 0.14; for (let i = -3; i < 9; i++) { g.beginPath(); g.moveTo(3.8 + i * 3, by); g.lineTo(3.8 + i * 3 + bh, by + bh); g.stroke(); g.beginPath(); g.moveTo(3.8 + i * 3 + bh, by); g.lineTo(3.8 + i * 3, by + bh); g.stroke(); }
  g.strokeStyle = 'rgba(30,20,60,.3)'; g.lineWidth = 0.2; for (const x of [7.4, 12.6, 17]) { g.beginPath(); g.moveTo(x, by + 1.4); g.quadraticCurveTo(x + 0.5, by + bh * 0.55, x - 0.2, by + bh - 0.6); g.stroke(); }
  g.fillStyle = 'rgba(54,56,140,.26)'; g.fillRect(14.6, by, 5.6, bh); g.restore();
  const cuff = rect(3.8, top ? by : by + bh - 2.4, 16.4, 2.4); fabric(g, cuff, rgba(mixc(C, [255, 250, 236], 0.4)), { seed: 9, cel: { iw: 0.12 } }); ln(g, 4, top ? by + 2.4 : by + bh - 2.4, 20, top ? by + 2.4 : by + bh - 2.4, 'rgba(30,20,60,.35)', 0.16);
  const wk = mul(31 + Math.round(C[0])); for (let i = 0; i < 4; i++) { const x = 5 + wk() * 14, y = by + 2.5 + wk() * (bh - 5); ln(g, x, y, x + 1.4 + wk(), y + (wk() - 0.5) * 0.6, 'rgba(255,255,255,.22)', 0.14); } }
function seat24(g, face) { shadowE(g, 12.5, 20.8, 7.6, 1.9);
  const WB = { dir: 'h', planks: 1, nails: false, knots: 0.2, P: WOODD }, post = (x, y, w, h) => wood(g, x, y, w, h, { dir: h > w ? 'v' : 'h', planks: 1, nails: false, knots: 0, P: WOODD, seed: 40 + Math.round(x) });
  const back = () => { if (face === 'down') { wood(g, 6.2, 2.6, 11.6, 4.8, { ...WB, seed: 9 }); for (const x of [8.4, 11.6, 14.6]) { ln(g, x, 3, x, 7, 'rgba(30,20,40,.5)', 0.22); } } else if (face === 'up') { wood(g, 6.2, 17.8, 11.6, 4.8, { ...WB, seed: 9 }); for (const x of [8.4, 11.6, 14.6]) ln(g, x, 18.2, x, 22.2, 'rgba(30,20,40,.5)', 0.22); } else if (face === 'right') { wood(g, 2.2, 5.6, 4.6, 12.8, { ...WB, dir: 'v', seed: 9 }); for (const y of [8.6, 12, 15.2]) ln(g, 2.4, y, 6.6, y, 'rgba(30,20,40,.5)', 0.22); } else { wood(g, 17.2, 5.6, 4.6, 12.8, { ...WB, dir: 'v', seed: 9 }); for (const y of [8.6, 12, 15.2]) ln(g, 17.4, y, 21.6, y, 'rgba(30,20,40,.5)', 0.22); } };
  if (face !== 'up') back();
  wood(g, 6.4, 14.6, 11.2, 3.4, { dir: 'h', planks: 1, seed: 10, P: WOODD, nails: false, knots: 0 });                         // the seat's front rail
  wood(g, 6.4, 7.2, 11.2, 8, { dir: 'h', planks: 3, seed: 11, P: WOODL, nails: true, knots: 0.35 });
  g.fillStyle = 'rgba(255,240,210,.32)'; g.fillRect(7.2, 7.8, 9.6, 0.7); post(6.4, 17.6, 1.5, 2); post(16.1, 17.6, 1.5, 2);
  if (face === 'up') back(); }
function table24(g, part, decor, v) { const L = part === 'left' || part === 'single', R = part === 'right' || part === 'single', x0 = L ? 1.8 : 0, x1 = R ? 22.2 : 24;
  g.fillStyle = SHADOW; g.fillRect(x0 + 0.4, 18.8, x1 - x0, 3.2);
  wood(g, x0, 15, x1 - x0, 4.4, { dir: 'h', planks: 1, seed: 11, P: WOODD, nails: false, knots: 0.2 });
  if (L) wood(g, x0 + 0.2, 17.6, 1.7, 3.4, { dir: 'v', planks: 1, seed: 12, P: WOODD, nails: false, knots: 0 }); if (R) wood(g, x1 - 1.9, 17.6, 1.7, 3.4, { dir: 'v', planks: 1, seed: 13, P: WOODD, nails: false, knots: 0 });
  wood(g, x0, 2.8, x1 - x0, 12.4, { dir: 'h', planks: 3, seed: 14 + (part.length), P: WOODL, nails: false, knots: 0.5 });
  g.fillStyle = 'rgba(60,34,70,.22)'; g.fillRect(x0, 13.4, x1 - x0, 1.8); g.fillStyle = 'rgba(255,244,214,.34)'; g.fillRect(x0, 3.3, x1 - x0, 0.7);
  if (decor === 'plate') { dab(g, 12.5, 10.6, 3.5, 2.5, 0, 'rgba(40,24,50,.4)'); dab(g, 12.3, 10, 3.5, 2.5, 0, INK); dab(g, 12.2, 9.9, 3.1, 2.2, 0, '#f4ecd8'); dab(g, 12.2, 10, 2.1, 1.4, 0, '#d9c796'); dab(g, 12.4, 10.1, 1.1, 0.7, 0, '#c8643a'); dab(g, 11.2, 9.3, 0.7, 0.4, 0, '#fff'); }
  else if (decor === 'vase') { dab(g, 12.5, 12.4, 2.6, 1, 0, 'rgba(40,24,50,.35)'); c24(g, [[[9.8, 12.8], [10.4, 8.6], [13.6, 8.6], [14.2, 12.8]]], pal('#3f4a7a', '#8a98d0', '#6a78b0'), { smooth: true, seed: 12, rim: 0.3, hs: 0.3, iw: 0.12 }); ln(g, 12, 8.4, 11.2, 5.6, '#4a7a3a', 0.2); ln(g, 12.4, 8.4, 13.4, 5.2, '#4a7a3a', 0.2); for (const [x, y, c] of [[11.2, 5.4, '#ec8fa8'], [13.4, 5, '#f4c04e'], [12, 6.6, '#fff0f4']]) { dab(g, x, y, 1.2, 1.1, 0, INK); dab(g, x, y, 0.95, 0.9, 0, c); dab(g, x, y, 0.3, 0.3, 0, '#e0952c'); } } }
function barrel24(g) { shadowE(g, 12.6, 21.8, 9.2, 2.4);
  const s = [[5, 5.4], [19, 5.4], [20.2, 12], [19, 20.6], [5, 20.6], [3.8, 12]]; c24(g, [s], pal('#8a5a32', '#d0985e', '#a8743e'), { smooth: true, seed: 13, hs: 0.01, lx: -0.7, ly: -0.8 });
  g.save(); g.beginPath(); trace(g, s, true); g.clip(); const bg = g.createLinearGradient(3.8, 0, 20.2, 0); bg.addColorStop(0, 'rgba(255,230,180,.38)'); bg.addColorStop(0.35, 'rgba(255,230,180,0)'); bg.addColorStop(0.7, 'rgba(60,40,110,0)'); bg.addColorStop(1, 'rgba(50,40,120,.42)'); g.fillStyle = bg; g.fillRect(3, 5, 18, 16);
  g.strokeStyle = 'rgba(60,35,15,.5)'; g.lineWidth = 0.18; for (let i = 1; i < 6; i++) { const x = 3.8 + i * 2.73; g.beginPath(); g.moveTo(5.5 + (x - 12) * 0.12 + 6.5 * 0, 5.6); g.quadraticCurveTo(x + (x - 12) * 0.09, 12, 5.5 + (x - 12) * 0.12, 20.6); g.stroke(); }
  for (const y of [8.4, 16.4]) { g.fillStyle = '#3a3d44'; g.fillRect(3.8, y, 16.4, 1.5); g.fillStyle = 'rgba(190,200,220,.5)'; g.fillRect(3.8, y, 16.4, 0.35); g.fillStyle = 'rgba(30,30,90,.4)'; g.fillRect(3.8, y + 1.15, 16.4, 0.35); for (const x of [6, 12, 18]) dab(g, x, y + 0.75, 0.2, 0.2, 0, '#9aa0b0'); } g.restore();
  g.fillStyle = INK; g.beginPath(); g.ellipse(12, 6, 7.4, 2.8, 0, 0, TAU); g.fill(); g.fillStyle = '#b9824a'; g.beginPath(); g.ellipse(12, 5.9, 6.8, 2.3, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(90,55,25,.5)'; g.lineWidth = 0.15; for (const x of [8.4, 12, 15.6]) { g.beginPath(); g.moveTo(x, 3.8); g.lineTo(x, 8); g.stroke(); } dab(g, 9.6, 5.1, 2, 0.5, -0.1, 'rgba(255,236,190,.5)');
  for (const [x, y, r, c] of [[10.4, 5.9, 1.3, '#d2423a'], [13.9, 6.1, 1.2, '#e0a93f']] as [number, number, number, string][]) { dab(g, x + 0.1, y + 0.2, r + 0.12, r * 0.9, 0, INK); dab(g, x, y, r, r * 0.85, 0, c); dab(g, x - 0.35, y - 0.35, 0.3, 0.22, 0, '#fff'); } }
function shelf24(g, v) { shadowE(g, 12.5, 22.4, 10.6, 1.9);
  wood(g, 2, 1.8, 20, 20.4, { dir: 'v', planks: 1, seed: 14, P: WOODL, nails: false, knots: 0.4 });
  for (const y of [3.4, 12.6]) { g.fillStyle = '#3a2218'; g.fillRect(3.4, y, 17.2, 7.6); g.fillStyle = 'rgba(14,8,34,.55)'; g.fillRect(3.4, y, 17.2, 1.7); g.fillStyle = 'rgba(40,22,60,.35)'; g.fillRect(3.4, y + 1.7, 17.2, 0.8); }
  const cols = ['#c9463c', '#3f6fb0', '#e0b040', '#5a9a4c', '#8a5ab0', '#d4784a']; for (let r = 0; r < 2; r++) { let x = 3.8; const Rr = mul(500 + v * 13 + r); for (let i = 0; i < 6 && x < 19.6; i++) { const w = 2 + Rr() * 1.1, h2 = 4.4 + Rr() * 2.4, y = r ? 20 : 10.8, C = hx(cols[(Rr() * cols.length) | 0]);
    if (Rr() < 0.18) { g.save(); g.translate(x + w / 2, y); g.rotate(0.16); fillPoly(g, rect(-w / 2 - 0.2, -h2 - 0.2, w + 0.4, h2 + 0.2), INK); fillPoly(g, rect(-w / 2, -h2, w, h2), rgba(C)); g.restore(); x += w + 1; continue; }
    fillPoly(g, rect(x - 0.2, y - h2 - 0.2, w + 0.4, h2 + 0.2), INK); const gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, rgba(mixc(C, [255, 255, 240], 0.3))); gr.addColorStop(0.5, rgba(C)); gr.addColorStop(1, rgba(mixc(C, SKY, 0.4).map(c => c * 0.85))); g.fillStyle = gr; g.fillRect(x, y - h2, w, h2);
    g.fillStyle = 'rgba(235,205,120,.85)'; g.fillRect(x, y - h2 + 0.8, w, 0.3); g.fillRect(x, y - 0.9, w, 0.3); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x + 0.3, y - h2 + 1.3, w - 0.6, 0.2); x += w + 0.4; } }
  if (v) { dab(g, 17.8, 19.8, 1.2, 0.5, 0, 'rgba(255,255,255,.12)'); } }
function rug24(g, v = 0) { const PL = [['#a33a3a', '#d8706a', '#e8b878', '#2c4a6a'], ['#2f4a86', '#6f8ed0', '#e8c878', '#a8403a'], ['#3f7a4a', '#7ab87f', '#f1e4b8', '#8a3a3a']][v], body = rr(1.2, 1.2, 21.6, 21.6, 3);
  c24(g, [body], pal(PL[0], PL[1], null), { smooth: true, seed: 15 + v, rim: 0.4, hs: 0.01, iw: 0.15 });
  g.save(); g.beginPath(); trace(g, body, true); g.clip(); g.strokeStyle = 'rgba(30,16,40,.18)'; g.lineWidth = 0.14; for (let x = 1.5; x < 23; x += 0.8) { g.beginPath(); g.moveTo(x, 1); g.lineTo(x, 23); g.stroke(); } g.strokeStyle = 'rgba(255,230,200,.14)'; for (let y = 1.5; y < 23; y += 0.8) { g.beginPath(); g.moveTo(1, y); g.lineTo(23, y); g.stroke(); }
  g.strokeStyle = PL[2]; g.lineWidth = 0.5; g.strokeRect(3.2, 3.2, 17.6, 17.6); g.strokeStyle = 'rgba(255,240,210,.5)'; g.lineWidth = 0.2; g.strokeRect(5.2, 5.2, 13.6, 13.6);
  if (v === 0) { for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.fillStyle = i % 2 ? PL[2] : PL[3]; g.beginPath(); g.moveTo(12 + Math.cos(a) * 1.6, 12 + Math.sin(a) * 1.6); g.lineTo(12 + Math.cos(a + 0.35) * 5.4, 12 + Math.sin(a + 0.35) * 5.4); g.lineTo(12 + Math.cos(a - 0.35) * 5.4, 12 + Math.sin(a - 0.35) * 5.4); g.fill(); } }
  else if (v === 1) { for (const [r, c] of [[6.4, PL[2]], [4.6, PL[3]], [2.8, PL[2]], [1.2, PL[3]]] as [number, string][]) { g.fillStyle = c; g.beginPath(); g.moveTo(12, 12 - r); g.lineTo(12 + r, 12); g.lineTo(12, 12 + r); g.lineTo(12 - r, 12); g.closePath(); g.fill(); }
    for (const [x, y] of [[6.4, 6.4], [17.6, 6.4], [6.4, 17.6], [17.6, 17.6]]) { g.fillStyle = PL[2]; g.beginPath(); g.moveTo(x, y - 1.3); g.lineTo(x + 1.3, y); g.lineTo(x, y + 1.3); g.lineTo(x - 1.3, y); g.closePath(); g.fill(); } }
  else { for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? PL[2] : PL[3]; g.fillRect(6.4, 6.6 + i * 2.8, 11.2, 1.6); } for (let i = 0; i < 5; i++) { g.fillStyle = PL[2]; g.beginPath(); g.arc(7.6 + i * 2.2, 5.2, 0.5, 0, TAU); g.fill(); g.beginPath(); g.arc(7.6 + i * 2.2, 18.8, 0.5, 0, TAU); g.fill(); } }
  g.restore(); if (v === 0) { dab(g, 12, 12, 1.6, 1.6, 0, INK); dab(g, 12, 12, 1.3, 1.3, 0, PL[2]); dab(g, 11.6, 11.6, 0.4, 0.4, 0, '#fff4d0'); }
  const sg = g.createLinearGradient(15, 0, 23, 0); sg.addColorStop(0, 'rgba(60,34,70,0)'); sg.addColorStop(1, 'rgba(60,34,70,.26)'); g.fillStyle = sg; g.fillRect(15, 3, 8, 18); }
function counter24(g, mug) { g.fillStyle = SHADOW; g.fillRect(0, 19.6, 24, 3);
  wood(g, -0.5, 8, 25, 12, { dir: 'v', planks: 3, seed: 16, P: WOODD, nails: false, knots: 0.4, plain: true });
  g.fillStyle = 'rgba(60,34,70,.26)'; g.fillRect(0, 15, 24, 4.8); for (const x of [8, 16]) { g.fillStyle = 'rgba(30,18,24,.5)'; g.fillRect(x - 0.1, 8, 0.25, 11.8); }
  wood(g, -0.5, 3.8, 25, 4.8, { dir: 'h', planks: 1, seed: 17, P: WOODL, nails: false, knots: 0.3, plain: true }); g.fillStyle = 'rgba(255,240,210,.4)'; g.fillRect(0, 4.1, 24, 0.7); g.fillStyle = 'rgba(40,20,60,.35)'; g.fillRect(0, 7.7, 24, 0.9);
  g.fillStyle = INK; g.fillRect(0, 3.5, 24, 0.5); g.fillRect(0, 19.8, 24, 0.5);
  if (mug) { dab(g, 11.4, 6.5, 2.6, 1.1, 0, 'rgba(40,24,50,.35)'); dab(g, 11, 5.4, 2.7, 2.4, 0, INK); dab(g, 11, 5.2, 2.3, 2, 0, '#e8e2d2'); dab(g, 11, 4.9, 1.6, 1.1, 0, '#e0a93f'); dab(g, 13.4, 5.5, 1, 0.8, 0, INK); dab(g, 10.2, 4.3, 0.5, 0.35, 0, '#fff'); dab(g, 11.4, 4.4, 0.7, 0.35, 0, 'rgba(255,250,220,.8)'); } }
function pew24(g) { shadowE(g, 12.5, 19.8, 11.6, 2);
  wood(g, 1, 4, 22, 4.2, { dir: 'h', planks: 1, seed: 17, P: WOODD, nails: false, knots: 0.4 });                         // backrest
  wood(g, 1, 14, 22, 3.6, { dir: 'h', planks: 1, seed: 18, P: WOODD, nails: false, knots: 0.2 });
  wood(g, 1, 7.6, 22, 7.2, { dir: 'h', planks: 2, seed: 19, P: WOODL, nails: false, knots: 0.45 });
  g.fillStyle = 'rgba(255,240,210,.34)'; g.fillRect(1.4, 8, 21.2, 0.6); for (const x of [1.8, 21.2]) wood(g, x - 0.8, 4, 1.6, 15.2, { dir: 'v', planks: 1, seed: 20, P: WOODD, nails: false, knots: 0 }); }
function altar24(g, t, candle) { g.fillStyle = SHADOW; g.fillRect(0, 18.6, 24, 2.8);
  stoneBlocks(g, rect(-1, 3.4, 26, 15.6), { P: pal('#d8d2c0', '#fbf7ec', '#eee8d8'), seed: 18, course: 5.2, bw: 8 });
  g.fillStyle = INK; g.fillRect(0, 3, 24, 0.5); g.fillRect(0, 19, 24, 0.5);
  const cl = g.createLinearGradient(0, 9.6, 0, 14); cl.addColorStop(0, '#f0d27a'); cl.addColorStop(0.3, '#d4ae50'); cl.addColorStop(1, '#a88430'); g.fillStyle = cl; g.fillRect(0, 9.6, 24, 4.4); g.fillStyle = 'rgba(70,50,20,.4)'; g.fillRect(0, 13.2, 24, 0.8); g.strokeStyle = 'rgba(120,84,24,.6)'; g.lineWidth = 0.14; g.setLineDash([0.5, 0.4]); g.beginPath(); g.moveTo(0, 11.8); g.lineTo(24, 11.8); g.stroke(); g.setLineDash([]);
  g.fillStyle = 'rgba(60,60,130,.18)'; g.fillRect(0, 14, 24, 5);
  if (candle) { c24(g, [rect(10.6, 0.8, 2.8, 5.6)], pal('#f6efd0', '#ffffff', null), { smooth: false, seed: 19, hs: 0.01, iw: 0.12 }); dab(g, 12, 6.6, 2.4, 0.8, 0, '#c9a44c'); const f = 1 + 0.25 * vn(twos(t), 0.2, 6, 540); dab(g, 12, 0.1, 0.9, 1.6 * f, 0, '#ff9a2a'); dab(g, 12, 0.3, 0.55, 1.1 * f, 0, '#ffd070'); dab(g, 12, 0.5, 0.25, 0.6 * f, 0, '#fff4c0'); glow24(g, 12, 0, 7, '255,200,110', 0.4); } }
function forge24(g, t) { const tq = twos(t), fl = 0.8 + 0.2 * vn(tq, 0.5, 6, 560);
  stoneBlocks(g, rect(1, 1, 22, 22), { P: pal('#4a4442', '#8a827a', '#6a625e'), seed: 19, course: 4.4, bw: 5.4 });
  c24(g, [rect(3, 3, 18, 18)], pal('#1e1816', '#3a302c', null), { smooth: false, seed: 20, hs: 0.01, iw: 0.15 }); const gg = g.createRadialGradient(12, 17, 1, 12, 14, 10); gg.addColorStop(0, 'rgba(255,160,60,.75)'); gg.addColorStop(1, 'rgba(255,90,30,0)'); g.fillStyle = gg; g.fillRect(3, 3, 18, 18);
  // coals
  for (let k = 0; k < 14; k++) { const x = 4.4 + (k * 1.27) % 15.2, y = 18.4 + (k % 3) * 0.7, c = vn(tq, k * 0.13, 6, 565 + k) > 0.5; dab(g, x, y, 1.3, 0.8, 0, c ? '#ff7a2a' : '#7a2a1a'); dab(g, x - 0.2, y - 0.2, 0.6, 0.35, 0, c ? '#ffd060' : '#c8481e'); }
  for (let k = 0; k < 7; k++) { const x = 5 + k * 2.3, h = 4 + 6 * vn(tq, k * 0.17, 8, 561 + k), sw = (vn(tq, k * 0.17 + 0.2, 8, 580 + k) - 0.5) * 1.6; for (const [sc, col] of [[1, '#e8481f'], [0.7, '#fb8a2a'], [0.4, '#ffd060']] as [number, string][]) { g.fillStyle = col; g.beginPath(); g.moveTo(x - 1.6 * sc, 19); g.bezierCurveTo(x - 1.5 * sc, 19 - h * 0.5 * sc, x + sw * 0.3, 19 - h * 0.8 * sc, x + sw, 19 - h * sc); g.bezierCurveTo(x + 0.6 + sw * 0.3, 19 - h * 0.7 * sc, x + 1.6 * sc, 19 - h * 0.4 * sc, x + 1.6 * sc, 19); g.fill(); } }
  for (let k = 0; k < 5; k++) { const ph = (tq * 2 + k / 5) % 1; dab(g, 7 + k * 2.4 + Math.sin(ph * 7 + k) * 0.8, 17 - ph * 12, 0.26, 0.28, 0, `rgba(255,${214 - ph * 60 | 0},120,${1 - ph})`); }
  g.fillStyle = 'rgba(0,0,0,.42)'; g.fillRect(3, 3, 18, 2); glow24(g, 12, 12, 12, '255,120,40', 0.32 * fl); g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 0.22; g.beginPath(); g.moveTo(2, 1.6); g.lineTo(22, 1.6); g.stroke(); }
function anvil24(g) { shadowE(g, 12.5, 21.8, 8.8, 2);
  wood(g, 7.4, 12, 9.2, 9.2, { dir: 'v', planks: 1, seed: 20, P: pal('#6a4a30', '#c49a6c', '#8a6642'), nails: false, knots: 0.5, shape: [[7.4, 21.2], [8.2, 12], [16, 12], [16.8, 21.2]] }); ln(g, 7.4, 17, 16.8, 17, 'rgba(30,30,40,.7)', 0.6);
  c24(g, [[[2.4, 8.6], [5.6, 6], [19, 6], [19, 10.6], [15, 12], [9, 12], [6, 9.6]]], IRON, { smooth: false, seed: 21, hs: 0.01, lx: -0.8, ly: -1 });
  g.save(); g.beginPath(); trace(g, [[2.4, 8.6], [5.6, 6], [19, 6], [19, 10.6], [15, 12], [9, 12], [6, 9.6]], false); g.clip(); const ig = g.createLinearGradient(0, 6, 0, 12); ig.addColorStop(0, 'rgba(255,255,255,.4)'); ig.addColorStop(0.3, 'rgba(255,255,255,0)'); ig.addColorStop(1, 'rgba(40,44,120,.4)'); g.fillStyle = ig; g.fillRect(2, 6, 18, 6); g.restore(); fillPoly(g, rect(5.6, 6, 13.4, 1.2), '#dde3ec'); ln(g, 3, 8.4, 5.2, 6.6, '#cdd4de', 0.3); }
function loom24(g, t) { shadowE(g, 12.5, 22.6, 10.6, 1.9); const ph = 0.5 + 0.5 * Math.sin(TAU * t);
  wood(g, 1, 2, 4, 20, { dir: 'v', planks: 1, seed: 22, P: WOODD, nails: false, knots: 0.5 }); wood(g, 19, 2, 4, 20, { dir: 'v', planks: 1, seed: 23, P: WOODD, nails: false, knots: 0.5 }); wood(g, 1, 1.4, 22, 3.6, { dir: 'h', planks: 1, seed: 24, P: WOODL, nails: false, knots: 0.3 });
  fillPoly(g, rect(5, 5, 14, 16.4), '#cdbf94'); for (let i = 0; i < 12; i++) { const x = 5.6 + i * 1.12; ln(g, x, 5, x, 21.2, i % 2 ? '#a77c48' : '#c49a5a', 0.32); } g.fillStyle = 'rgba(60,40,110,.16)'; g.fillRect(5, 5, 14, 2.4);
  c24(g, [rect(5, 14.4, 14, 6.8)], pal('#a33c48', '#e0788a', null), { smooth: false, seed: 25, rim: 0.3, hs: 0.01, iw: 0.12 }); g.save(); g.beginPath(); g.rect(5, 14.4, 14, 6.8); g.clip(); for (let y = 14.8; y < 21.2; y += 0.7) { g.strokeStyle = y % 1.4 < 0.7 ? 'rgba(255,214,200,.28)' : 'rgba(60,10,24,.22)'; g.lineWidth = 0.14; g.beginPath(); g.moveTo(5, y); g.lineTo(19, y); g.stroke(); } g.fillStyle = 'rgba(232,200,112,.9)'; g.fillRect(5, 17.2, 14, 0.7); g.restore();
  wood(g, 4.4, 13.2, 15.2, 1.2, { dir: 'h', planks: 1, seed: 26, P: WOODL, nails: false, knots: 0 });
  c24(g, [[[7 + 4 * ph, 11.6], [13 + 4 * ph, 11.6], [14 + 4 * ph, 12.4], [13 + 4 * ph, 13.2], [7 + 4 * ph, 13.2], [6 + 4 * ph, 12.4]]], pal('#e8c870', '#fff0b0', null), { smooth: false, seed: 27, rim: 0.2, hs: 0.01, iw: 0.1 }); ln(g, 8 + 4 * ph, 12.4, 12 + 4 * ph, 12.4, 'rgba(120,84,24,.6)', 0.14); }
function oven24(g, t) { const tq = twos(t), fl = 0.8 + 0.2 * vn(tq, 0.5, 6, 570);
  stoneBlocks(g, rect(1, 1, 22, 22), { P: pal('#7a5e4c', '#c49a80', '#9a7660'), seed: 28, course: 4.2, bw: 4.8 });
  g.fillStyle = INK; g.beginPath(); g.moveTo(4, 22.4); g.lineTo(4, 15); g.quadraticCurveTo(12, 5.6, 20, 15); g.lineTo(20, 22.4); g.fill();
  g.strokeStyle = '#a4806a'; g.lineWidth = 1; g.beginPath(); g.moveTo(4.6, 22.2); g.lineTo(4.6, 15.2); g.quadraticCurveTo(12, 6.6, 19.4, 15.2); g.lineTo(19.4, 22.2); g.stroke();
  g.fillStyle = '#2a1c16'; g.beginPath(); g.moveTo(5.4, 22); g.lineTo(5.4, 15.4); g.quadraticCurveTo(12, 8.2, 18.6, 15.4); g.lineTo(18.6, 22); g.fill();
  const og = g.createRadialGradient(12, 19, 1, 12, 17, 8); og.addColorStop(0, 'rgba(255,150,60,.8)'); og.addColorStop(1, 'rgba(255,100,30,0)'); g.fillStyle = og; g.fillRect(5, 9, 14, 13);
  for (let k = 0; k < 5; k++) { const x = 7.4 + k * 2.3, h = 3 + 3.4 * vn(tq, k * 0.2, 8, 571 + k); for (const [sc, col] of [[1, '#e8481f'], [0.6, '#ffc040']] as [number, string][]) { g.fillStyle = col; g.beginPath(); g.moveTo(x - 1.3 * sc, 21.6); g.quadraticCurveTo(x - 1 * sc, 21.6 - h * 0.6 * sc, x, 21.6 - h * sc); g.quadraticCurveTo(x + 1 * sc, 21.6 - h * 0.6 * sc, x + 1.3 * sc, 21.6); g.fill(); } }
  glow24(g, 12, 18, 9, '255,130,50', 0.45 * fl); }
function well24(g, t) { /* 2 x 2 tiles: 48 x 48 */ shadowE(g, 25.6, 44, 20.4, 4);
  stoneBlocks(g, blob(24, 31, 18.8, 12.9, 31, 36, 0.02, 3), { P: pal('#9aa0a6', '#eceee4', '#c4c8c8'), seed: 28, course: 4, bw: 6.2 });
  g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(24, 28.8, 16, 9.6, 0, 0, TAU); g.fill();
  g.fillStyle = '#22386a'; g.beginPath(); g.ellipse(24, 28.6, 14.5, 8.4, 0, 0, TAU); g.fill();
  const wg = g.createLinearGradient(0, 21, 0, 36); wg.addColorStop(0, '#7cbaf0'); wg.addColorStop(0.5, '#4a8fd0'); wg.addColorStop(1, '#2f6ab0'); g.fillStyle = wg; g.beginPath(); g.ellipse(24, 28.7, 13.8, 7.7, 0, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.ellipse(24, 28.7, 13.8, 7.7, 0, 0, TAU); g.clip(); g.fillStyle = 'rgba(30,40,110,.35)'; g.beginPath(); g.ellipse(26, 25, 13, 5.4, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(190,226,255,.5)'; g.beginPath(); g.ellipse(21, 29.6, 6, 2.2, 0, 0, TAU); g.fill();
  for (let i = 0; i < 3; i++) { const p = ((t * 2 + i / 3) % 1); g.strokeStyle = `rgba(255,255,255,${0.55 * (1 - p)})`; g.lineWidth = 0.3; g.beginPath(); g.ellipse(24, 28.8, 2 + p * 9.6, 1 + p * 4.6, 0, 0, TAU); g.stroke(); } g.restore();
  for (const x of [8, 40]) wood(g, x - 1.5, 8, 3, 24, { dir: 'v', planks: 1, seed: 29 + x, P: WOODD, nails: false, knots: 0.6 });
  wood(g, 5, 5, 38, 3.4, { dir: 'h', planks: 1, seed: 31, P: WOODL, nails: false, knots: 0.4 });
  const wob = Math.sin(TAU * t) * 0.6; ln(g, 24, 8.4, 24 + wob, 22, INK, 0.7); ln(g, 24, 8.4, 24 + wob, 22, '#c9a878', 0.4); for (let k = 0; k < 8; k++) ln(g, 23.8 + wob * k / 8, 9 + k * 1.6, 24.4 + wob * k / 8, 9.7 + k * 1.6, 'rgba(120,90,50,.7)', 0.2);
  wood(g, 21.4 + wob, 21.6, 5.6, 4.8, { dir: 'v', planks: 3, seed: 32, P: pal('#8a5a32', '#d0985e', '#a8743e'), nails: false, knots: 0.3 }); for (const y of [22.4, 25.4]) ln(g, 21.5 + wob, y, 26.9 + wob, y, '#3a3d44', 0.5);
  // shingled roof
  const roof = [[2.4, 5], [24, 0.4], [45.6, 5], [43, 8.8], [5, 8.8]]; c24(g, [roof], pal('#9a5a3a', '#e8a070', '#c07a52'), { smooth: false, seed: 33, hs: 0.01, lx: -0.8, ly: -1 });
  g.save(); g.beginPath(); trace(g, roof, false); g.clip(); for (let r = 0; r < 4; r++) { const y = 1.6 + r * 2.1; for (let x = -2 + (r % 2) * 1.8; x < 48; x += 3.6) { const yy = y + (x < 24 ? (24 - x) * 0.06 : (x - 24) * 0.06); g.fillStyle = (Math.floor(x / 3.6) + r) % 3 ? '#a8623e' : '#8a4a30'; g.beginPath(); g.moveTo(x, yy); g.lineTo(x + 3.4, yy); g.lineTo(x + 3.4, yy + 1.7); g.quadraticCurveTo(x + 1.7, yy + 2.5, x, yy + 1.7); g.fill(); g.strokeStyle = 'rgba(40,20,30,.5)'; g.lineWidth = 0.15; g.stroke(); g.fillStyle = 'rgba(255,214,170,.35)'; g.fillRect(x, yy, 3.4, 0.4); } }
  { const rg = g.createLinearGradient(16, 0, 34, 0); rg.addColorStop(0, 'rgba(54,56,140,0)'); rg.addColorStop(1, 'rgba(54,56,140,.28)'); g.fillStyle = rg; g.fillRect(0, 0, 48, 10); } g.restore(); tufts(g, 6, 42, 43.6, 34, 10, 2); }

/* ================= wild animals, forest sprites, the coast kit =================
   Animals face right at the middle of a 24 x 24 tile (the game draws them at the tile centre, 16 down). Coast pieces use their own sizes. */
const FUR = { deer: pal('#b4783c', '#f0b878', '#cc9050'), rabbit: pal('#c4b094', '#f4e8d0', '#dccab0'), fox: pal('#d46c2c', '#ffb070', '#e88a48') };
function animal24(g, t, kind, run) {
  const ph = run ? Math.floor(t * 6) / 6 : 0, bob = run ? Math.abs(Math.sin(TAU * ph)) * 1.4 : 0, br = Math.sin(TAU * t) * 0.18, y0 = 16 - bob;
  shadowE(g, 12, 21.4, kind === 'deer' ? 7.4 : 5.4, 1.8);
  if (kind === 'deer') {
    for (const [x, d] of [[7.6, 1], [9.6, 0], [14.4, 0], [16.6, 1]]) { const sw = run ? Math.sin(TAU * ph + d * 3) * 1.1 : 0; ln(g, x, y0 + 1.5, x + sw, 20.6, INK, 1.7); ln(g, x, y0 + 1.5, x + sw, 20.6, d ? '#8a5a30' : '#a8703c', 1.1); }
    c24(g, [blob(12, y0, 6.6, 3.8 + br, 5, 22, 0.03, 3)], FUR.deer, { seed: 80, hs: 0.5, lx: -0.8, ly: -1 });
    c24(g, [blob(12.6, y0 + 1.5, 4, 1.6, 6, 14, 0.03, 3)], pal('#ecd8b0', '#fff4dc', null), { ink: false, hs: 0.5 }); for (const [x, y] of [[9, -0.5], [12, -1.4], [14.6, 0.2], [10.6, 1]]) dab(g, x, y0 + y, 0.5, 0.4, 0, '#fff4dc');
    c24(g, [[[16.2, y0 - 2], [19.8, y0 - 6], [21.8, y0 - 5.6], [21.8, y0 - 3.2], [19, y0 - 1.6]]], FUR.deer, { seed: 81, smooth: true, hs: 0.5 });
    ln(g, 18.6, y0 - 6, 18, y0 - 9.6, INK, 0.9); ln(g, 18.6, y0 - 6, 18, y0 - 9.6, '#6a4a2c', 0.5); ln(g, 18, y0 - 8.4, 16.6, y0 - 9.6, '#6a4a2c', 0.4); ln(g, 19.6, y0 - 6, 20.8, y0 - 9.2, '#6a4a2c', 0.5); dab(g, 20, y0 - 4.2, 0.4, 0.4, 0, INK);
    fillPoly(g, [[5.6, y0 - 1], [5.6, y0 + 1], [4, y0 - 0.4]], '#fff4dc'); }
  else if (kind === 'rabbit') {
    const hop = run ? Math.abs(Math.sin(TAU * ph)) * 3 : 0; g.save(); g.translate(0, -hop + 1);
    c24(g, [blob(11.4, 18, 4.2, 3, 7, 18, 0.03, 3)], FUR.rabbit, { seed: 82, hs: 0.5 }); dab(g, 7.4, 17.6, 1.5, 1.4, 0, INK); dab(g, 7.3, 17.5, 1.2, 1.1, 0, '#fff4e4');
    c24(g, [blob(14.6, 15, 2.4, 2.2, 8, 14, 0.03, 3)], FUR.rabbit, { seed: 83, hs: 0.5 });
    c24(g, [rr(14.4, 9.4, 1.5, 4.8, 0.7)], FUR.rabbit, { smooth: true, seed: 84, iw: 0.1 }); c24(g, [rr(16.2, 9.8, 1.4, 4.4, 0.7)], FUR.rabbit, { smooth: true, seed: 85, iw: 0.1 }); fillPoly(g, rect(14.8, 10.4, 0.6, 3), '#f0a0a8');
    dab(g, 16.2, 15, 0.45, 0.45, 0, INK); dab(g, 17, 15.7, 0.4, 0.3, 0, '#f08090'); g.restore(); }
  else if (kind === 'fox') {
    const tw_ = Math.sin(TAU * t * 2) * 0.8;
    c24(g, [[[7, y0 + 0.6], [3.4 + tw_, y0 - 3], [0.8, y0 - 1.4 + tw_ * 0.4], [2.4, y0 + 2], [6.4, y0 + 2.4]]], FUR.fox, { seed: 86, smooth: true, hs: 0.4 }); fillPoly(g, [[0.8, y0 - 1.4 + tw_ * 0.4], [2.4, y0 + 2], [1.2, y0 + 1.6]], '#fff0dc');
    for (const [x, d] of [[8.6, 1], [10.6, 0], [14.2, 0], [16.2, 1]]) { const sw = run ? Math.sin(TAU * ph + d * 3) * 1 : 0; ln(g, x, y0 + 1, x + sw, 20.6, INK, 1.4); ln(g, x, y0 + 1, x + sw, 20.6, '#3a2418', 0.9); }
    c24(g, [blob(12, y0, 5.6, 3.1 + br, 9, 20, 0.03, 3)], FUR.fox, { seed: 87, hs: 0.5, lx: -0.8, ly: -1 }); c24(g, [[[15.6, y0 - 1.4], [19, y0 - 2.6], [21.4, y0 - 0.8], [19, y0 + 0.8], [15.8, y0 + 1]]], FUR.fox, { seed: 88, smooth: true, hs: 0.5 });
    fillPoly(g, [[16.4, y0 - 1.6], [17.4, y0 - 5], [18.6, y0 - 2.2]], '#d46c2c'); fillPoly(g, [[16.9, y0 - 2], [17.4, y0 - 4], [18, y0 - 2.2]], '#3a2418'); dab(g, 21.2, y0 - 0.9, 0.5, 0.45, 0, INK); dab(g, 18.8, y0 - 1.5, 0.35, 0.35, 0, INK); fillPoly(g, [[16.4, y0 + 0.6], [19, y0 + 0.4], [17, y0 + 1.4]], '#fff0dc'); }
  else { /* owl */ c24(g, [blob(12, 14.6, 3.6, 4.6 + br, 10, 22, 0.03, 3)], pal('#7a6a58', '#c4b098', '#948068'), { seed: 89, hs: 0.5 }); c24(g, [blob(12, 16, 2.1, 2.6, 11, 12, 0.03, 3)], pal('#cbb99a', '#f6ecd6', null), { ink: false, hs: 0.5 });
    fillPoly(g, [[9, 12], [9.4, 9.4], [11, 11]], '#7a6a58'); fillPoly(g, [[15, 12], [14.6, 9.4], [13, 11]], '#7a6a58'); for (const x of [10.6, 13.4]) { dab(g, x, 12.8, 1.3, 1.3, 0, INK); dab(g, x, 12.8, 1, 1, 0, '#f2d65a'); dab(g, x, 12.8, 0.4, 0.4, 0, INK); } fillPoly(g, [[11.5, 13.8], [12.5, 13.8], [12, 14.8]], '#e8a020'); ln(g, 10.4, 19.2, 10.4, 20.4, '#e8a020', 0.5); ln(g, 13.6, 19.2, 13.6, 20.4, '#e8a020', 0.5); } }
function eyes24(g, t) { const bl = (t * 3.2 % 1) < 0.045 ? 0 : 1; for (const ox of [-2.6, 2.6]) { const x = 12 + ox, y = 10; const gr = g.createRadialGradient(x, y, 0, x, y, 4.5); gr.addColorStop(0, 'rgba(230,255,150,.9)'); gr.addColorStop(0.35, 'rgba(200,240,90,.35)'); gr.addColorStop(1, 'rgba(200,240,90,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, 4.5, 0, TAU); g.fill(); if (bl) { dab(g, x, y, 0.8, 1, 0, '#f4ffc0'); dab(g, x, y, 0.3, 0.55, 0, '#243010'); } } }
const SPR = [pal('#5f8a4a', '#b4d46c', '#7fa85a'), pal('#6a8a5e', '#c0dca0', '#8aab7a'), pal('#7a8a46', '#d4de86', '#9aab5e')];
function sprite24(g, t, v) { /* the forest's round mossy creatures */ const sq = Math.sin(TAU * t), bob = Math.abs(sq) * 0.9; shadowE(g, 12, 21, 7, 2);
  c24(g, [blob(12, 14.4 - bob, 6.6, 5.4 - sq * 0.3, 90 + v, 26, 0.05, 4)], SPR[v % 3], { seed: 90, hs: 0.5, lx: -0.9, ly: -1.2 });
  marks(g, 8, 99 + v, 7, 10 - bob, 10, 8, ['rgba(30,70,34,.3)', 'rgba(220,244,150,.45)'], 0.8, 0.3);
  for (const x of [9.6, 14.4]) { dab(g, x, 14 - bob, 1.5, 1.7, 0, INK); dab(g, x, 14 - bob, 1.15, 1.35, 0, '#f6e05a'); dab(g, x, 14 - bob, 0.45, 0.8, 0, '#2a2410'); dab(g, x - 0.35, 13.4 - bob, 0.28, 0.28, 0, '#fff'); }
  ln(g, 12, 9.6 - bob, 12 + sq * 0.5, 6.4 - bob, INK, 0.9); ln(g, 12, 9.6 - bob, 12 + sq * 0.5, 6.4 - bob, '#5a8a38', 0.5); dab(g, 13 + sq * 0.5, 6.2 - bob, 1.4, 0.8, -0.4, INK); dab(g, 13 + sq * 0.5, 6.2 - bob, 1.1, 0.55, -0.4, '#8fcf5a'); dab(g, 11 + sq * 0.5, 7, 1.2, 0.7, 0.4, '#8fcf5a'); }

/* ---- the coast ---- */
function mound24(g, dug) { shadowE(g, 13, 18, 11, 3.6);
  const s = [[2, 17.4], [3.6, 12], [8, 8.8], [13, 8], [18, 9.4], [21.4, 13], [22.4, 17.4], [12, 19.2]]; c24(g, [s], pal('#d9c288', '#fff3cc', '#ecdca6'), { seed: 91, smooth: true, hs: 0.01, lx: -1, ly: -1.2, rim: 0.5 });
  g.save(); g.beginPath(); trace(g, s, true); g.clip(); g.fillStyle = 'rgba(255,248,214,.5)'; g.beginPath(); g.ellipse(9.4, 11.6, 6.4, 2.6, -0.3, 0, TAU); g.fill(); g.fillStyle = 'rgba(86,86,160,.3)'; g.beginPath(); g.ellipse(18.4, 16.4, 7, 4.4, -0.2, 0, TAU); g.fill();
  for (let k = 0; k < 5; k++) { g.strokeStyle = k % 2 ? 'rgba(170,138,90,.5)' : 'rgba(255,250,226,.7)'; g.lineWidth = 0.2; g.beginPath(); g.moveTo(3 + k * 0.4, 14.4 + k * 1.1); g.quadraticCurveTo(12, 11.6 + k * 1.3 + (k % 2) * 0.5, 21.4 - k * 0.5, 14.4 + k * 1.2); g.stroke(); }
  marks(g, 14, 191, 3, 9.4, 18, 9, ['rgba(160,128,98,.6)', 'rgba(255,248,226,.8)'], 0.3, 0.2); g.restore();
  if (dug) { g.fillStyle = INK; g.beginPath(); g.ellipse(12, 14.2, 5.4, 2.2, 0, 0, TAU); g.fill(); const dg = g.createLinearGradient(0, 12, 0, 16); dg.addColorStop(0, '#5a4630'); dg.addColorStop(1, '#8a6e48'); g.fillStyle = dg; g.beginPath(); g.ellipse(12, 14.3, 4.7, 1.8, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,240,200,.35)'; g.beginPath(); g.ellipse(10.4, 13.6, 2.2, 0.5, 0, 0, TAU); g.fill();
    for (const [x, y] of [[5, 17.6], [19.4, 17.8], [8.4, 18.8], [16.4, 19]]) dab(g, x, y, 0.8, 0.4, 0, '#a8844e'); }
  else { dab(g, 14.4, 12.4, 2.2, 1, 0, 'rgba(170,138,90,.5)'); dab(g, 10, 12.6, 0.8, 0.4, 0, 'rgba(255,250,226,.9)'); }
  tufts(g, 5, 19, 19.4, 192, 5, 1.8); }
function cave24(g, open) { shadowE(g, 12.8, 22, 14, 3.4);
  rockPix(g, { bodies: [{ cx: 12, base: 22.4, rx: 10.6, ry: 17, rz: 7.6, seed: 92, extra: 4, jit: 0.12 }], P: pal('#807c76', '#e8e4d4', '#b0aca0'), ow: 0.24, heavy: 0.5, round: 6, warp: 1.6, strata: 3.1 });
  g.fillStyle = INK; g.beginPath(); g.moveTo(6.4, 22.6); g.quadraticCurveTo(6.2, 10.6, 12, 10.6); g.quadraticCurveTo(17.8, 10.6, 17.6, 22.6); g.fill();
  const mg = g.createLinearGradient(0, 11, 0, 22.4); mg.addColorStop(0, '#120e18'); mg.addColorStop(1, open ? '#1e2a3a' : '#2a2628'); g.fillStyle = mg; g.beginPath(); g.moveTo(7.4, 22.4); g.quadraticCurveTo(7.3, 11.8, 12, 11.8); g.quadraticCurveTo(16.7, 11.8, 16.6, 22.4); g.fill();
  g.strokeStyle = 'rgba(236,230,210,.55)'; g.lineWidth = 0.3; g.beginPath(); g.moveTo(6.7, 21); g.quadraticCurveTo(6.5, 10.9, 12, 10.9); g.stroke();
  if (open) { const wg = g.createLinearGradient(0, 18, 0, 22.4); wg.addColorStop(0, '#6fb2de'); wg.addColorStop(1, '#2f6ab0'); g.fillStyle = wg; g.beginPath(); g.moveTo(7.4, 19.4); g.quadraticCurveTo(12, 18.2, 16.6, 19.4); g.lineTo(16.6, 22.4); g.lineTo(7.4, 22.4); g.fill(); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 0.2; g.beginPath(); g.moveTo(8.4, 20.6); g.quadraticCurveTo(10, 20, 11.6, 20.6); g.moveTo(13, 21.2); g.quadraticCurveTo(14.4, 20.8, 15.6, 21.2); g.stroke(); }
  else { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(7.4, 12, 9.2, 10.4); for (let y = 14; y < 22; y += 2.2) ln(g, 7.6, y, 16.4, y, 'rgba(90,80,70,.5)', 0.3); ln(g, 9, 12.4, 9, 22.4, 'rgba(90,80,70,.55)', 0.3); ln(g, 15, 12.4, 15, 22.4, 'rgba(90,80,70,.55)', 0.3); }
  moss(g, 6.6, 6.6, 2.8, 1.2, 93); moss(g, 18.6, 7.8, 2.2, 1, 94); tufts(g, 1.6, 22.4, 22.6, 95, 8, 1.8); }
function glint24(g, t) { const a = 0.5 + 0.5 * Math.sin(TAU * t); g.save(); g.translate(12, 13); g.rotate(t * 0.5); g.globalAlpha = 0.35 + 0.65 * a; for (const [l, w] of [[7, 0.9], [5, 0.7]]) { fillPoly(g, [[0, -l], [w, 0], [0, l], [-w, 0]], '#fff7c8'); g.rotate(Math.PI / 2); } dab(g, 0, 0, 1.2, 1.2, 0, '#ffffff'); g.restore(); }
function bottle24(g, t) { g.save(); g.translate(12, 15 + Math.sin(TAU * t) * 0.5); g.rotate(-0.5); c24(g, [rr(-6, -2.2, 10, 4.4, 2)], pal('#4a9a64', '#a8e0b8', null), { smooth: true, seed: 93, iw: 0.12, hs: 0.1 }); c24(g, [rr(4, -1.2, 3, 2.4, 0.6)], pal('#4a9a64', '#a8e0b8', null), { smooth: false, seed: 94, iw: 0.1, hs: 0.1 }); fillPoly(g, rect(-4, -1.2, 5, 2.4), '#efe5c8'); dab(g, 7.8, 0, 0.8, 1, 0, '#8a5a30'); g.restore(); }
function wreck24(g, t) { /* 3 x 2 tiles: 72 x 48 */ shadowE(g, 35, 44.4, 31, 3.4);
  // sand drifted against the hull, then the broken hull itself
  const hull = [[4, 28], [8, 38], [24, 43], [48, 42.5], [63, 37], [68, 27], [60, 27.6], [50, 25.4], [40, 28.6], [28, 26.6], [18, 27.4]];
  c24(g, [hull], pal('#5f4430', '#b8906a', '#7a5a3e'), { smooth: false, seed: 95, hs: 0.01, lx: -1, ly: -1.4 });
  g.save(); g.beginPath(); trace(g, hull, false); g.clip(); const hg = g.createLinearGradient(0, 26, 0, 43); hg.addColorStop(0, 'rgba(255,226,180,.3)'); hg.addColorStop(0.5, 'rgba(255,226,180,0)'); hg.addColorStop(1, 'rgba(40,44,110,.4)'); g.fillStyle = hg; g.fillRect(0, 24, 72, 22);
  for (let k = 1; k < 6; k++) { g.strokeStyle = k % 2 ? 'rgba(30,20,36,.55)' : 'rgba(255,230,190,.28)'; g.lineWidth = 0.3; g.beginPath(); for (let x = 4; x <= 68; x += 4) { const top = 28 - Math.sin((x - 4) / 64 * Math.PI) * -1.2 + (x - 4) / 64 * -1.2, bot = 43 - Math.pow((x - 36) / 32, 2) * 8, y = top + (bot - top) * k / 6; x === 4 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
  for (const [x, y] of [[20, 33], [34, 36], [47, 32], [56, 34]]) { dab(g, x, y, 0.9, 0.5, 0, 'rgba(30,20,36,.5)'); dab(g, x, y + 0.6, 0.6, 0.2, 0, 'rgba(255,230,190,.35)'); }
  { const wg = g.createLinearGradient(40, 0, 70, 0); wg.addColorStop(0, 'rgba(86,90,150,0)'); wg.addColorStop(1, 'rgba(86,90,150,.26)'); g.fillStyle = wg; g.fillRect(36, 24, 36, 20); } g.restore();
  // broken ribs standing out of the top
  for (const [x, h] of [[12, 5], [20, 7.4], [29, 3.6], [43, 5], [52, 6.4], [60, 4]]) wood(g, x - 0.9, 28 - h + 1, 1.8, h + 1, { dir: 'v', planks: 1, seed: 96 + x, P: WDP.grey, nails: false, knots: 0.3 });
  wood(g, 28.6, 8, 3.2, 22, { dir: 'v', planks: 1, seed: 97, P: WDP.grey, nails: false, knots: 0.6, shape: [[28.6, 30], [29, 12], [30.2, 8], [31.8, 11], [31.8, 30]] });                  // the stub of the mast
  ln(g, 30.6, 14, 44, 28.4, INK, 1.4); ln(g, 30.6, 14, 44, 28.2, '#4a3220', 0.9);
  const tat = [[30.6, 11], [38.4, 13.4], [36, 16.4], [37.6, 20.4], [34, 22], [30.6, 24]]; c24(g, [tat], pal('#d8d0bc', '#ffffff', '#efe8d6'), { smooth: false, seed: 98, hs: 0.01, iw: 0.14 }); ln(g, 32.4, 13, 32.4, 22, 'rgba(120,100,80,.5)', 0.2); ln(g, 35, 14.6, 34.6, 20, 'rgba(120,100,80,.4)', 0.2);
  for (const [x, y, r] of [[8, 38, 2.8], [62, 34, 2.2], [44, 42, 2.6]]) moss(g, x, y, r, r * 0.45, 98 + x);
  g.fillStyle = 'rgba(217,194,136,.9)'; g.beginPath(); g.moveTo(2, 44); g.quadraticCurveTo(10, 36, 26, 44); g.fill(); g.beginPath(); g.moveTo(48, 44); g.quadraticCurveTo(62, 38, 70, 44); g.fill();
  tufts(g, 4, 20, 44, 99, 5, 2.4); }
function lighthouse24(g, t, lit) { /* 1 x 3 tiles: 24 x 72, ground at 70 */ shadowE(g, 13, 70.2, 10.4, 2.6);
  const tw_ = [[5.2, 70], [7.4, 24], [16.6, 24], [18.8, 70]];
  stoneBlocks(g, tw_, { P: pal('#ece4d2', '#ffffff', '#fffaf0'), seed: 96, course: 4.6, bw: 5.6 });
  g.save(); g.beginPath(); trace(g, tw_, false); g.clip(); for (const y of [27, 43, 59]) { g.fillStyle = 'rgba(201,70,60,.9)'; g.beginPath(); g.moveTo(0, y); g.lineTo(24, y - 2); g.lineTo(24, y + 8); g.lineTo(0, y + 10); g.fill(); g.fillStyle = 'rgba(255,170,150,.35)'; g.fillRect(0, y - 1, 12, 9); }
  { const tg = g.createLinearGradient(7, 0, 24, 0); tg.addColorStop(0, 'rgba(66,70,150,0)'); tg.addColorStop(0.45, 'rgba(66,70,150,.12)'); tg.addColorStop(1, 'rgba(66,70,150,.4)'); g.fillStyle = tg; g.fillRect(6, 20, 18, 52); } g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(7, 24, 1.4, 46);
  for (const [y, w] of [[36, 1.6], [52, 1.8]]) { g.fillStyle = '#2a2430'; g.beginPath(); g.moveTo(11.2, y + 3); g.lineTo(11.2, y); g.quadraticCurveTo(12, y - 1.6, 12.8, y); g.lineTo(12.8, y + 3); g.fill(); } g.restore();
  c24(g, [[[10, 70], [10, 62], [11, 60.8], [13, 60.8], [14, 62], [14, 70]]], pal('#5a4230', '#a8845e', null), { smooth: false, seed: 97, hs: 0.01, iw: 0.12 }); dab(g, 13.2, 66, 0.3, 0.3, 0, '#e6c460');
  // gallery with a rail
  wood(g, 3.4, 19, 17.2, 5, { dir: 'h', planks: 1, seed: 98, P: pal('#3a3a44', '#8a8a96', '#5a5a66'), nails: false, knots: 0 }); for (let x = 4.4; x < 20; x += 2.4) ln(g, x, 17, x, 19, INK, 0.3); ln(g, 3.6, 17, 20.4, 17, INK, 0.4);
  // lantern room
  fillPoly(g, rect(5.5, 7.6, 13, 11.6), INK); const lg = g.createLinearGradient(0, 8.6, 0, 18); if (lit) { lg.addColorStop(0, '#fff6c0'); lg.addColorStop(1, '#ffd36a'); } else { lg.addColorStop(0, '#6a7890'); lg.addColorStop(1, '#2a3040'); } g.fillStyle = lg; g.fillRect(6.5, 8.6, 11, 9.6);
  g.fillStyle = INK; g.fillRect(11.6, 8.6, 0.8, 9.6); g.fillRect(6.5, 13, 11, 0.5); if (!lit) { g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.moveTo(7, 9); g.lineTo(10, 9); g.lineTo(7, 14); g.fill(); }
  if (lit) { glow24(g, 12, 13.4, 22, '255,236,160', 0.5 + 0.1 * Math.sin(TAU * t)); g.save(); g.translate(12, 13.4); g.rotate(TAU * t); g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(0, 0, 30, 0); gr.addColorStop(0, 'rgba(255,240,170,.55)'); gr.addColorStop(1, 'rgba(255,240,170,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, -1.5); g.lineTo(30, -5); g.lineTo(30, 5); g.lineTo(0, 1.5); g.fill(); g.restore(); }
  c24(g, [[[3.4, 8], [12, 0.8], [20.6, 8]]], pal('#4a4252', '#9a90ac', '#7a7086'), { smooth: false, seed: 99, hs: 0.01, iw: 0.12 }); g.fillStyle = 'rgba(54,56,140,.3)'; g.beginPath(); g.moveTo(12, 0.8); g.lineTo(20.6, 8); g.lineTo(12, 8); g.fill(); dab(g, 12, 0.4, 0.9, 0.9, 0, INK); dab(g, 12, 0.3, 0.6, 0.6, 0, '#c9a44c');
  moss(g, 7.6, 69.4, 2.6, 0.9, 100); tufts(g, 2, 22, 70.6, 101, 6, 2); }
const lerpPts = (pts, x) => { for (let i = 0; i < pts.length - 1; i++) if (x >= pts[i][0] && x <= pts[i + 1][0]) { const u = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]); return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u; } return pts[x < pts[0][0] ? 0 : pts.length - 1][1]; };
function sail(g, quad, t, ph, o: any = {}) { /* a cloth sail: billows with the wind, gradient across, seams and reef bands */
  const [a, b, c, d] = quad, mid = (p, q, k) => [(p[0] + q[0]) / 2 + k, (p[1] + q[1]) / 2], bl = Math.sin(TAU * t + ph) * 0.8 + (o.bill ?? 1.6), shp = [a, mid(a, b, bl * 0.3), b, mid(b, c, bl), c, mid(c, d, bl * 0.2), d, mid(d, a, -bl * 0.3)];
  c24(g, [shp], pal('#eee6d4', '#ffffff', null), { smooth: true, seed: 101, hs: 0.01, iw: 0.15, lx: -0.5, ly: -0.5, rim: 0.4 });
  g.save(); g.beginPath(); trace(g, shp, true); g.clip(); const x0 = Math.min(a[0], d[0]), x1 = Math.max(b[0], c[0]), gr = g.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, 'rgba(255,255,248,.55)'); gr.addColorStop(0.4, 'rgba(255,255,248,0)'); gr.addColorStop(0.72, 'rgba(70,74,150,.18)'); gr.addColorStop(1, 'rgba(60,64,150,.42)'); g.fillStyle = gr; g.fillRect(x0 - 2, Math.min(a[1], b[1]) - 2, x1 - x0 + 4, 60);
  for (let k = 1; k < 5; k++) { const u = k / 5; g.strokeStyle = 'rgba(110,96,80,.4)'; g.lineWidth = 0.17; g.beginPath(); g.moveTo(a[0] + (d[0] - a[0]) * u, a[1] + (d[1] - a[1]) * u); g.quadraticCurveTo((a[0] + b[0]) / 2 + bl * 0.6, a[1] + (d[1] - a[1]) * u + 1.2, b[0] + (c[0] - b[0]) * u, b[1] + (c[1] - b[1]) * u); g.stroke(); }
  for (let k = 0; k < 3; k++) { const u = 0.25 + k * 0.28; g.strokeStyle = 'rgba(80,66,100,.22)'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u); g.quadraticCurveTo(a[0] + (b[0] - a[0]) * u + bl * 0.8, (a[1] + d[1]) / 2, d[0] + (c[0] - d[0]) * u, d[1] + (c[1] - d[1]) * u); g.stroke(); }
  g.restore(); }
function ship24(g, t) { /* 4 x 3 tiles: 96 x 72 */ const bob = Math.sin(TAU * t) * 0.8; shadowE(g, 46, 67, 40, 4);
  g.save(); g.translate(0, bob);
  const sheer = [[4, 38], [24, 36], [50, 38], [76, 41], [92, 40]], keel = [[4, 38], [12, 58], [40, 63], [70, 62], [88, 54], [92, 40]]; const hull = [[4, 38], [12, 58], [40, 63], [70, 62], [88, 54], [92, 40], [76, 41], [50, 38], [24, 36]];
  c24(g, [hull], pal('#6a4a30', '#c49a6c', '#8a6040'), { smooth: false, seed: 100, hs: 0.01, lx: -1.2, ly: -1.6 });
  g.save(); g.beginPath(); trace(g, hull, false); g.clip(); const hg = g.createLinearGradient(0, 36, 0, 63); hg.addColorStop(0, 'rgba(255,226,180,.3)'); hg.addColorStop(0.45, 'rgba(255,226,180,0)'); hg.addColorStop(1, 'rgba(36,40,110,.5)'); g.fillStyle = hg; g.fillRect(0, 30, 96, 36);
  for (let k = 1; k < 7; k++) { g.strokeStyle = k % 2 ? 'rgba(34,22,36,.6)' : 'rgba(255,228,184,.3)'; g.lineWidth = 0.34; g.beginPath(); for (let x = 4; x <= 92; x += 3) { const top = lerpPts(sheer, x), bot = x < 12 ? 38 + (x - 4) * 2.5 : lerpPts(keel.slice(0, 5), x), y = top + (bot - top) * k / 7.4; x === 4 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
  for (let k = 0; k < 14; k++) { const x = 8 + h32(k, 1, 7, 7) * 80, y = 42 + h32(k, 2, 7, 7) * 16; ln(g, x, y, x + 2.4, y, 'rgba(34,22,36,.4)', 0.2); }
  const sg = g.createLinearGradient(40, 0, 94, 0); sg.addColorStop(0, 'rgba(70,74,150,0)'); sg.addColorStop(1, 'rgba(70,74,150,.3)'); g.fillStyle = sg; g.fillRect(36, 34, 60, 32); g.restore();
  wood(g, 4.4, 36.4, 87.6, 3, { dir: 'h', planks: 1, seed: 102, P: pal('#c0904a', '#f0cf9c', '#d6aa6a'), nails: false, knots: 0, shape: [[4.4, 38.4], [24, 36], [50, 37.8], [76, 40.8], [92, 39.8], [92, 42.6], [76, 43.4], [50, 40.4], [24, 38.4], [4.8, 40.8]] });
  for (let i = 0; i < 8; i++) { const x = 17 + i * 9.6; dab(g, x, 48, 2, 2, 0, INK); dab(g, x, 48, 1.4, 1.4, 0, '#2a2e3c'); dab(g, x - 0.4, 47.5, 0.5, 0.5, 0, 'rgba(180,200,240,.8)'); g.strokeStyle = '#c9a44c'; g.lineWidth = 0.28; g.beginPath(); g.arc(x, 48, 1.8, 0, TAU); g.stroke(); }
  // stern cabin and bowsprit
  wood(g, 4, 30, 12, 8, { dir: 'v', planks: 3, seed: 103, P: pal('#8a5a34', '#d89a62', '#a8743c'), nails: false, knots: 0.3 }); for (const x of [6.4, 11.2]) { fillPoly(g, rect(x, 32.4, 3.2, 3), INK); fillPoly(g, rect(x + 0.3, 32.7, 2.6, 2.4), '#f4d27a'); } wood(g, 3.4, 29, 13.2, 1.6, { dir: 'h', planks: 1, seed: 104, P: WDP.dark, nails: false, knots: 0 });
  ln(g, 88, 40, 92.6, 35.4, INK, 2.2); ln(g, 88, 40, 92.6, 35.5, '#7a5232', 1.4); ln(g, 92.6, 35.4, 62, 6, 'rgba(60,44,40,.75)', 0.22);
  for (const [x, h] of [[30, 34], [60, 30]]) { ln(g, x, 38 - h, 6 + (x === 30 ? 0 : 20), 37, 'rgba(60,44,40,.7)', 0.2); ln(g, x, 38 - h, 92 - (x === 30 ? 20 : 0), 40, 'rgba(60,44,40,.7)', 0.2); }
  for (const [x, h, w, ph] of [[30, 34, 20, 0.4], [60, 30, 18, 1.2]]) { ln(g, x, 38, x, 38 - h, INK, 3.2); ln(g, x, 38, x, 38 - h, '#5a3a24', 2.2); ln(g, x - 0.5, 38, x - 0.5, 38 - h, '#9a6e44', 0.6);
    wood(g, x - 10, 38 - h + 3.2, 21, 1.1, { dir: 'h', planks: 1, seed: 105 + x, P: WDP.dark, nails: false, knots: 0 });
    sail(g, [[x - 8.4, 38 - h + 4.2], [x + w - 1, 38 - h + 4.2], [x + w - 2, 38 - 9], [x - 8, 38 - 9]], t, ph); ln(g, x + w - 1, 38 - h + 4, x + w + 0, 38 - h + 2, 'rgba(60,44,40,.6)', 0.2);
    dab(g, x, 38 - h - 0.4, 1.6, 1.6, 0, INK); dab(g, x, 38 - h - 0.5, 1.2, 1.2, 0, '#9a6e44');}
  const fw = Math.sin(TAU * t * 2) * 1.2; g.fillStyle = INK; g.beginPath(); g.moveTo(59.6, 4); g.quadraticCurveTo(64 + fw, 3.6, 68 + fw, 5.6); g.quadraticCurveTo(64 + fw, 8.6, 59.6, 8.8); g.fill(); g.fillStyle = '#c0392b'; g.beginPath(); g.moveTo(60.2, 4.8); g.quadraticCurveTo(64 + fw, 4.4, 66.8 + fw, 5.8); g.quadraticCurveTo(64 + fw, 8, 60.2, 8); g.fill();
  g.restore();
  // foam along the waterline, drifting
  g.save(); g.beginPath(); g.rect(0, 52, 96, 20); g.clip(); for (let k = 0; k < 12; k++) { const x = 4 + ((k + t) * 86 / 12) % 86, y = lerpPts([[4, 56], [12, 60.4], [40, 64.2], [70, 63.4], [88, 58], [94, 54]], x) + 0.4 + bob; g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 0.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 1.8, y - 0.5, x + 3.6, y); g.stroke(); } g.restore(); }
function boat24(g, t) { /* 2 x 2 tiles: 48 x 48 */ const bob = Math.sin(TAU * t) * 0.7; shadowE(g, 24, 42.4, 21, 3.4); g.save(); g.translate(0, bob);
  const hull = [[2, 22], [8, 36], [24, 38.4], [40, 36], [46, 22], [24, 26.4]]; c24(g, [hull], pal('#8a5a32', '#d89a62', '#a8703c'), { smooth: false, seed: 102, hs: 0.01, lx: -1.1, ly: -1.4 });
  g.save(); g.beginPath(); trace(g, hull, false); g.clip(); const hg = g.createLinearGradient(0, 22, 0, 38); hg.addColorStop(0, 'rgba(255,226,180,.3)'); hg.addColorStop(1, 'rgba(36,40,110,.45)'); g.fillStyle = hg; g.fillRect(0, 20, 48, 20); for (let k = 1; k < 5; k++) { g.strokeStyle = k % 2 ? 'rgba(34,22,36,.55)' : 'rgba(255,228,184,.3)'; g.lineWidth = 0.3; g.beginPath(); for (let x = 2; x <= 46; x += 3) { const top = 22 + Math.pow((x - 24) / 22, 2) * 0, bot = 38.4 - Math.pow((x - 24) / 22, 2) * 12, y = 23.4 + (bot - 23.4) * k / 5.4; x === 2 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); } g.restore();
  wood(g, 3, 21, 42, 2.4, { dir: 'h', planks: 1, seed: 103, P: pal('#c0904a', '#f0cf9c', '#d6aa6a'), nails: false, knots: 0, shape: [[2.6, 22.6], [24, 26.6], [45.4, 22.6], [45.4, 20.6], [24, 24.6], [2.6, 20.6]] });
  wood(g, 14, 25, 20, 2.2, { dir: 'h', planks: 1, seed: 104, P: WDP.pale, nails: true, knots: 0.2 });
  ln(g, 24, 4, 24, 26, INK, 2.4); ln(g, 24, 4, 24, 26, '#5a3a20', 1.5); ln(g, 23.5, 4, 23.5, 26, '#9a6e44', 0.4);
  sail(g, [[25.4, 5.4], [41, 5.8], [40, 20.6], [25.4, 21]], t, 0.8, { bill: 1.2 }); ln(g, 24, 4, 44, 21, 'rgba(60,44,40,.6)', 0.18); ln(g, 40.6, 5.4, 44, 21, 'rgba(60,44,40,.5)', 0.16);
  g.restore(); g.save(); g.beginPath(); g.rect(0, 30, 48, 20); g.clip(); for (let k = 0; k < 9; k++) { const x = ((k * 6.3 + t * 12) % 48), y = 36.2 - Math.pow((x - 24) / 22, 2) * 11 + bob + 0.6; g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 0.45; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 1.4, y - 0.4, x + 2.8, y); g.stroke(); } g.restore(); }
function raft24(g, t) { const bob = Math.sin(TAU * t) * 0.6; shadowE(g, 12.4, 21.6, 13, 3.2); g.save(); g.translate(0, bob);
  for (let i = 0; i < 5; i++) wood(g, 1 + i * 4.5, 9, 4.3, 12.4, { dir: 'v', planks: 1, seed: 103 + i, P: i % 2 ? pal('#8a6238', '#d8a468', '#b07a48') : pal('#9a6e40', '#e8b878', '#b88a58'), nails: false, knots: 0.7, shape: [[1 + i * 4.5, 9.8], [1.5 + i * 4.5, 9], [4.8 + i * 4.5, 9], [5.3 + i * 4.5, 9.8], [5.3 + i * 4.5, 20.6], [4.8 + i * 4.5, 21.4], [1.5 + i * 4.5, 21.4], [1 + i * 4.5, 20.6]] });
  for (const y of [11.4, 18.2]) { c24(g, [rect(0.2, y - 0.8, 23.6, 1.8)], pal('#6a5236', '#b49a70', null), { smooth: false, seed: 110, hs: 0.01, iw: 0.1 }); for (let x = 1; x < 24; x += 1.4) ln(g, x, y - 0.8, x + 0.7, y + 1, 'rgba(34,22,36,.4)', 0.14); }
  ln(g, 12, 1, 12, 10, INK, 1.8); ln(g, 12, 1, 12, 10, '#5a3a20', 1.1); sail(g, [[13, 1.8], [22.4, 2.4], [21.6, 11.6], [13, 11.6]], t, 0.4, { bill: 0.8 });
  g.restore(); }
function crab24(g, t) { const w = Math.floor(t * 6) / 6, sh = Math.sin(TAU * w * 2) * 0.8; shadowE(g, 12, 18.4, 7, 1.7);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) ln(g, 12 + s * 3.6, 15 + i * 0.5, 12 + s * (6.6 + i * 0.4), 17.4 + i * 0.4 + (i % 2 ? sh : -sh) * 0.4, INK, 0.9), ln(g, 12 + s * 3.6, 15 + i * 0.5, 12 + s * (6.6 + i * 0.4), 17.4 + i * 0.4 + (i % 2 ? sh : -sh) * 0.4, '#c04a20', 0.5);
  c24(g, [blob(12, 14.4, 5.4, 3.8, 104, 20, 0.03, 3)], pal('#e0602a', '#ffb084', '#f08040'), { seed: 104, hs: 0.5, iw: 0.12 });
  for (const s of [-1, 1]) { ln(g, 12 + s * 4.4, 12, 12 + s * 7, 9.4 - sh * 0.3, INK, 1.2); ln(g, 12 + s * 4.4, 12, 12 + s * 7, 9.4 - sh * 0.3, '#e0602a', 0.7); dab(g, 12 + s * 7.6, 8.6 - sh * 0.3, 1.9, 1.5, 0, INK); dab(g, 12 + s * 7.6, 8.6 - sh * 0.3, 1.5, 1.1, 0, '#e8582a'); fillPoly(g, [[12 + s * 7.4, 8.8 - sh * 0.3], [12 + s * 9, 8.2 - sh * 0.3], [12 + s * 7.8, 7.4 - sh * 0.3]], '#24160e'); ln(g, 12 + s * 1.6, 11.6, 12 + s * 1.6, 10.4, INK, 0.6); dab(g, 12 + s * 1.6, 10, 0.7, 0.7, 0, '#fff'); dab(g, 12 + s * 1.6, 10, 0.3, 0.3, 0, INK); } }
function seal24(g, t) { const b = Math.sin(TAU * t) * 0.4; shadowE(g, 12, 19, 10, 2.4); c24(g, [[[2, 17], [4, 11], [10, 9 + b], [16, 10], [21, 14], [23, 17], [12, 19]]], pal('#7d7f86', '#c8cad4', '#9a9ca6'), { seed: 105, smooth: true, hs: 0.5, lx: -1, ly: -1.2 }); c24(g, [blob(5.4, 11.4, 2.6, 2.3, 106, 14, 0.03, 3)], pal('#7d7f86', '#c8cad4', null), { seed: 106, hs: 0.5, iw: 0.12 });
  dab(g, 4.2, 10.8, 0.5, 0.5, 0, INK); dab(g, 3, 12, 0.6, 0.45, 0, INK); fillPoly(g, [[22, 15], [25, 13.4], [24.4, 17.4]], '#6c6e76'); fillPoly(g, [[11, 15], [14, 18.4], [9, 18.6]], '#6c6e76'); }
function gull24(g, t, mode) { const fl = Math.sin(TAU * t * 2) * (mode === 'fly' ? 4.4 : 0.4); shadowE(g, 12, 21, 4, 1.2); if (mode === 'sit') { c24(g, [blob(12, 15, 4.2, 2.8, 107, 16, 0.03, 3)], pal('#f0f0f4', '#ffffff', null), { seed: 107, hs: 0.5, iw: 0.12 }); c24(g, [blob(15.4, 12.4, 1.8, 1.7, 108, 12, 0.03, 3)], pal('#f0f0f4', '#ffffff', null), { seed: 108, hs: 0.5, iw: 0.1 }); fillPoly(g, [[16.8, 12.4], [18.6, 12.8], [16.8, 13.4]], '#e8a23a'); dab(g, 15.8, 12, 0.3, 0.3, 0, INK); fillPoly(g, [[8, 14], [4.6, 15.8], [8, 16.4]], '#9a9ca6'); ln(g, 11, 17.6, 11, 19.6, '#e8a23a', 0.5); ln(g, 13.4, 17.6, 13.4, 19.6, '#e8a23a', 0.5); }
  else { g.save(); g.translate(0, 8); for (const s of [-1, 1]) { g.beginPath(); g.moveTo(12, 6); g.quadraticCurveTo(12 + s * 5, 4 - fl * s * 0, 12 + s * 11, 6 - fl); g.quadraticCurveTo(12 + s * 5, 7.6 - fl * 0.4, 12, 8); g.fillStyle = INK; g.fill(); g.beginPath(); g.moveTo(12, 6.4); g.quadraticCurveTo(12 + s * 5, 4.6, 12 + s * 10, 6.2 - fl); g.quadraticCurveTo(12 + s * 5, 7.2 - fl * 0.4, 12, 7.6); g.fillStyle = '#f2f2f6'; g.fill(); fillPoly(g, [[12 + s * 9, 6.2 - fl], [12 + s * 11, 6 - fl], [12 + s * 10, 6.6 - fl]], '#3a3a44'); } dab(g, 12, 7, 2, 1.4, 0, INK); dab(g, 12, 7, 1.6, 1.1, 0, '#f6f6fa'); dab(g, 14, 6.4, 1, 0.9, 0, '#f6f6fa'); fillPoly(g, [[14.6, 6.4], [16, 6.8], [14.6, 7.2]], '#e8a23a'); g.restore(); } }
function whale24(g, t) { /* the hump that rises out of the sea: 2 x 1 tile */ const up = Math.sin(Math.PI * t); if (up < 0.04) return; const e = Math.min(1, up * 1.5), cx = 24, wl = 23, rx = 20.5 * e, ry = 9.6 * e, top = wl - ry * 1.05;
  g.fillStyle = 'rgba(14,44,92,' + 0.34 * up + ')'; g.beginPath(); g.ellipse(cx + 1, wl + 0.6, rx * 1.14, 3.1 * e, 0, 0, TAU); g.fill();                                  // the bulk beneath the surface
  const body = [[cx - rx, wl], [cx - rx * 0.96, wl - ry * 0.45], [cx - rx * 0.78, wl - ry * 0.82], [cx - rx * 0.45, wl - ry * 1.02], [cx - rx * 0.12, wl - ry * 1.06], [cx + rx * 0.25, wl - ry * 0.98], [cx + rx * 0.62, wl - ry * 0.7], [cx + rx * 0.9, wl - ry * 0.3], [cx + rx, wl]];
  const sp = spl(body, false, 5); g.save(); g.beginPath(); g.moveTo(sp[0][0], sp[0][1]); for (const p of sp) g.lineTo(p[0], p[1]); g.closePath();
  g.lineJoin = 'round'; g.strokeStyle = '#1c2038'; g.lineWidth = 1.1; g.stroke(); g.clip();
  const gr = g.createLinearGradient(cx - rx * 0.5, top, cx + rx * 0.4, wl); gr.addColorStop(0, '#7186a2'); gr.addColorStop(0.45, '#4c5f7c'); gr.addColorStop(1, '#2c3a58'); g.fillStyle = gr; g.fillRect(cx - rx - 2, top - 2, rx * 2 + 4, ry * 1.2 + 4);
  g.fillStyle = 'rgba(70,64,140,.26)'; g.beginPath(); g.ellipse(cx + rx * 0.3, wl - ry * 0.1, rx * 0.95, ry * 0.8, 0, 0, TAU); g.fill();                                                  // cool shade on the far flank
  g.strokeStyle = 'rgba(190,208,230,.7)'; g.lineWidth = 0.55; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - rx * 0.62, wl - ry * 0.7); g.quadraticCurveTo(cx - rx * 0.3, wl - ry * 0.98, cx + rx * 0.05, wl - ry * 0.99); g.stroke();      // sunlit ridge
  for (let i = 0; i < 9; i++) { const x = cx - rx * 0.5 + i * rx * 0.12 + h32(i, 1, 2, 3) * 1.4, y = wl - ry * (0.55 + 0.25 * h32(i, 2, 3, 4)); dab(g, x, y, 0.5 + 0.35 * h32(i, 3, 4, 5), 0.38, 0, 'rgba(226,230,238,.7)'); }                // barnacles
  g.strokeStyle = 'rgba(20,28,56,.35)'; g.lineWidth = 0.3; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(cx - rx * 0.1 + i * 2.4, wl - ry * 0.35); g.quadraticCurveTo(cx + 1 + i * 2.4, wl - ry * 0.55, cx + 2.4 + i * 2.4, wl - ry * 0.28); g.stroke(); }
  g.restore();
  g.fillStyle = 'rgba(244,252,252,' + 0.9 * up + ')'; for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(cx + sx * (rx * (0.98 - k * 0.1) + k), wl + 0.2 + k * 0.5, 1.6 + k * 0.6, 0.5, 0, 0, TAU); g.fill(); }   // foam at the waterline
  g.strokeStyle = 'rgba(236,250,252,' + 0.55 * up * (1 - t) + ')'; g.lineWidth = 0.4; g.beginPath(); g.ellipse(cx, wl + 0.8, rx * (1.08 + 0.2 * t), 3.6 * e + 2 * t, 0, 0, TAU); g.stroke();                                                  // the ring that spreads
  if (t > 0.38 && t < 0.72) { const s = Math.sin(Math.PI * (t - 0.38) / 0.34); g.strokeStyle = 'rgba(240,252,255,' + 0.8 * s + ')'; g.lineWidth = 0.5; g.lineCap = 'round'; const bx = cx - rx * 0.35, by = top + 1.2;
    for (const [dx, dh, c] of [[-1.6, 5, -0.5], [0, 7, 0], [1.6, 5, 0.5]]) { g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + dx * 0.8 + c * 2, by - dh, bx + dx * 2, by - dh * 0.6); g.stroke(); } for (let i = 0; i < 6; i++) dab(g, bx + (h32(i, 5, 5, 5) - 0.5) * 6, by - 2 - h32(i, 6, 6, 6) * 6 * s, 0.35, 0.35, 0, 'rgba(244,252,255,' + 0.8 * s + ')'); } }
function thiefmark24() {}

/* ================= paper dolls: the body =================
   A villager is a stack of layers, like the game's procedural person: skin, hair, shirt, accent, pants and hat are painted in
   light grey with a lavender shadow and multiplied by their colour at draw time; faces, boots, tools and the cloth that never
   changes colour are painted in colour. Every layer is a 48 x 48 game-px frame (384 px here) with the figure's tile at
   (12, 12), so a layer lines up with the tile the villager stands on. Child and infant kits are drawn at their final size.
   Side views face right; mirror them for left.

   Everything is built from one skeleton per kit (kit(...) below): head, neck, shoulders, hips, knees, ankles. Limbs are tapered
   tubes along real joint chains, so the walk is a walk and a seated villager really sits. */
const DF = 48, DO = 12, DCX = 24, DBY = 33.5;       // frame size, tile origin, centre x, feet line (game px)
const KD = {
  adult:  { hh: 5.5, hw: 2.62, nk: 1.15, nkw: 1.4, sh: 3.55, wa: 2.85, hp: 3.1, tl: 7.7, lg: 9.8, ua: 3.5, fa: 3.2, aw: 1.0, thw: 2.4, knw: 1.9, ank: 1.55, eye: 1.0, hnd: 0.78 },
  adultF: { hh: 5.3, hw: 2.5, nk: 1.15, nkw: 1.25, sh: 3.15, wa: 2.45, hp: 3.3, tl: 7.3, lg: 10.0, ua: 3.3, fa: 3.0, aw: 0.92, thw: 2.45, knw: 1.8, ank: 1.5, eye: 1.1, hnd: 0.7 },
  child:  { hh: 5.8, hw: 2.85, nk: 0.6, nkw: 1.3, sh: 2.8, wa: 2.3, hp: 2.6, tl: 4.8, lg: 6.0, ua: 2.6, fa: 2.3, aw: 0.95, thw: 2.0, knw: 1.65, ank: 1.4, eye: 1.18, hnd: 0.62 },
  infant: { hh: 5.4, hw: 2.95, nk: 0.3, nkw: 1.3, sh: 2.4, wa: 2.2, hp: 2.5, tl: 3.0, lg: 2.4, ua: 1.6, fa: 1.4, aw: 1.25, thw: 2.2, knw: 1.9, ank: 1.6, eye: 1.28, hnd: 0.68 } };
const kitOf = age => age < 3 ? 'infant' : age < 16 ? 'child' : 'adult';
const kitFor = sp => { const k = kitOf(sp.age); return k === 'adult' && sp.female ? 'adultF' : k; };
const isAdultKit = k => k === 'adult' || k === 'adultF';
const DIRS = ['front', 'back', 'side'];
const rr = (x, y, w, h, r = 1) => [[x + r, y], [x + w - r, y], [x + w, y + r], [x + w, y + h - r], [x + w - r, y + h], [x + r, y + h], [x, y + h - r], [x, y + r]];
function geo(kit) { const K = KD[kit], u = K.tl / 6.5, hip = DBY - K.lg, hem = hip + 0.7 * u, sy = hem - K.tl, chin = sy - K.nk, top = chin - K.hh;
  return { K, u, hip, hem, sy, chin, top, hy: top + K.hh * 0.5, bh: 1.2 * Math.max(0.55, u), sit: 3.6 * u, kneel: 3.9 * u }; }

const GP = pal('#f3f3f9', '#ffffff', null), GPd = pal('#d0d0e2', '#e6e6f4', null), GPs = pal('#f6f5fa', '#ffffff', null, 0.7);
const SKINP = pal('#f8f6fa', '#ffffff', null, 0.6), HAIRP = pal('#808082', '#a8a8b8', '#b8b8c8', 1.05);
/* the grey layers are multiplied by their colour, so their ink is a grey too: skin ends up outlined in warm brown, a blue shirt in deep navy, never in black. Fixed-colour layers get a deeper shade of themselves. */
const GREYL = new Set([GP, GPd, GPs, SKINP]), inkFor = P => GREYL.has(P) ? '#5c5a6e' : inkOf(P.base, 0.5);
const D = (g, shapes, P, o = {}) => cel(g, shapes, P, Object.assign({ lx: -0.38, ly: -0.52, rim: 0.26, ow: 0.3, os: 0.26, iw: 0.1, hs: 0.5, inkCol: inkFor(P) }, o));
function frame() { const c = mk(DF * Q, DF * Q), g = c.getContext('2d'); g.scale(Q, Q); return [c, g]; }

/* ---- shape helpers ---- */
function crom(a, b, c, d, t) { const t2 = t * t, t3 = t2 * t; return 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); }
function spl(pts, closed = true, seg = 5) { const n = pts.length, out = [], m = closed ? n : n - 1, P = i => pts[closed ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < m; i++) { const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2); for (let s = 0; s < seg; s++) { const t = s / seg; out.push([crom(p0[0], p1[0], p2[0], p3[0], t), crom(p0[1], p1[1], p2[1], p3[1], t)]); } }
  if (!closed) out.push(pts[n - 1]); return out; }
/* the right half of a shape (first and last point on the axis) mirrored about x = cx */
function sym(h, cx = DCX) { const out = h.slice(); for (let i = h.length - 2; i >= 1; i--) out.push([2 * cx - h[i][0], h[i][1]]); return out; }
/* a tapered limb: centreline points and a width at each, round at both ends */
function tube(pts, ws, o: any = {}) { const seg = o.seg || 5, n = pts.length; let P = pts, W = ws;
  if (n > 2) { P = []; W = []; for (let i = 0; i < n - 1; i++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    for (let s = 0; s < seg; s++) { const t = s / seg; P.push([crom(p0[0], p1[0], p2[0], p3[0], t), crom(p0[1], p1[1], p2[1], p3[1], t)]); W.push(ws[i] + (ws[i + 1] - ws[i]) * t); } } P.push(pts[n - 1]); W.push(ws[n - 1]); }
  const m = P.length, Lp = [], Rp = [], nr = [];
  for (let i = 0; i < m; i++) { const a = P[Math.max(0, i - 1)], b = P[Math.min(m - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; nr.push([-dy, dx, dx, dy]); }
  for (let i = 0; i < m; i++) { const w = W[i] / 2, [nx, ny] = nr[i]; Lp.push([P[i][0] + nx * w, P[i][1] + ny * w]); Rp.push([P[i][0] - nx * w, P[i][1] - ny * w]); }
  const out = Lp.slice(), cs = 6, e = nr[m - 1], we = W[m - 1] / 2;
  if (o.cap1 !== false) for (let k = 1; k < cs; k++) { const a = Math.PI * k / cs; out.push([P[m - 1][0] + we * (Math.cos(a) * e[0] + Math.sin(a) * e[2]), P[m - 1][1] + we * (Math.cos(a) * e[1] + Math.sin(a) * e[3])]); }
  for (let i = m - 1; i >= 0; i--) out.push(Rp[i]);
  const s0 = nr[0], w0 = W[0] / 2;
  if (o.cap0 !== false) for (let k = 1; k < cs; k++) { const a = Math.PI * k / cs; out.push([P[0][0] - w0 * (Math.cos(a) * s0[0] + Math.sin(a) * s0[2]), P[0][1] - w0 * (Math.cos(a) * s0[1] + Math.sin(a) * s0[3])]); }
  return out; }
const xf = (pts, ox, oy, ang = 0, sx = 1, sy = sx) => { const c = Math.cos(ang), s = Math.sin(ang); return pts.map(p => [ox + (p[0] * sx) * c - (p[1] * sy) * s, oy + (p[0] * sx) * s + (p[1] * sy) * c]); };
const ellipsePts = (cx, cy, rx, ry, n = 18, ang = 0) => xf(Array.from({ length: n }, (_, i) => [Math.cos(i / n * TAU) * rx, Math.sin(i / n * TAU) * ry]), cx, cy, ang);

/* ---- the skeleton in motion ---- */
const walkPh = f => TAU * f / 6;
const lerpA = (a, b, t) => a + (b - a) * t;
/* both legs: hip, knee, ankle, foot angle. dir is the view; pose stand | walk | sit | kneel */
function legRig(kit, dir, pose, f) { const g = geo(kit), K = g.K, { hip, bh } = g, th = (K.lg - bh) / 2, side = dir === 'side', out = { legs: [], hipY: hip, dip: 0 };
  if (pose === 'sit' || pose === 'kneel') { const low = pose === 'sit' ? g.sit : g.kneel, hy = hip + low;
    if (side) { if (pose === 'sit') { const kn = [DCX + th * 0.95, hy + 0.35 * g.u], an = [kn[0] + 0.25, DBY - bh];
        out.legs = [{ far: true, hip: [DCX - 0.1, hy - 0.1], knee: [kn[0] + 0.15, kn[1] - 0.1], ank: [an[0] + 0.1, an[1]], ang: 0 }, { hip: [DCX, hy], knee: kn, ank: an, ang: 0 }]; }
      else { const kn = [DCX + 0.5, DBY - 0.95 * g.u - 0.3], an = [DCX - th * 0.85, DBY - 0.9 * g.u - 0.4];
        out.legs = [{ hip: [DCX, hy], knee: kn, ank: an, ang: -1.45, kneel: true }]; } }
    else { const hs = K.thw * 0.5 + 0.1;
      for (const s of [-1, 1]) { if (pose === 'sit') { const kn = [DCX + s * (hs + 0.3), hy + 1.05 * g.u + 0.3], an = [DCX + s * (hs + 0.4), DBY - bh];
          out.legs.push({ hip: [DCX + s * hs, hy], knee: kn, ank: an, ang: 0, fore: true }); }
        else { const kn = [DCX + s * (hs + 0.25), DBY - 1.0 * g.u - 0.35], an = [DCX + s * (hs + 0.25), DBY - 0.4]; out.legs.push({ hip: [DCX + s * hs, hy], knee: kn, ank: an, ang: 0, kneel: true, hidden: true }); } } }
    out.hipY = hy; return out; }
  const stride = pose === 'walk', phi = walkPh(f || 0);
  if (!side) { const hs = K.thw * 0.5 + 0.1, dip = stride ? 0.42 * Math.sin(phi) ** 2 : 0; out.dip = dip; out.hipY = hip + dip;
    for (const s of [-1, 1]) { const ph = phi + (s > 0 ? 0 : Math.PI), fwd = stride ? Math.sin(ph) : 0, lift = stride ? Math.max(0, Math.cos(ph)) : 0, solY = DBY + fwd * 0.62 * (dir === 'back' ? -1 : 1) - lift * 1.0, ay = solY - bh;
      const ax = DCX + s * (hs + 0.04 + lift * 0.06), hp = [DCX + s * hs, hip + dip], my = (hp[1] + ay) / 2;
      out.legs.push({ hip: hp, knee: [ax + s * (0.08 + lift * 0.2), my + lift * 0.18], ank: [ax, ay], ang: 0, fore: true, z: fwd }); }
    out.legs.sort((a, b) => (a.z || 0) - (b.z || 0)); return out; }
  const A = 0.43, S1 = th, S2 = th, leg = (ph, far) => { const al = stride ? A * Math.sin(ph) : 0, sw = stride ? Math.max(0, Math.cos(ph)) : 0, bend = stride ? 1.05 * sw * (1 - 0.3 * Math.sin(ph)) : 0, be = al - bend, kx = Math.sin(al) * S1, ky = Math.cos(al) * S1, ax = kx + Math.sin(be) * S2, ay = ky + Math.cos(be) * S2;
    return { far, kx, ky, ax, ay, ang: stride ? -0.42 * Math.sin(ph) * (sw > 0 ? Math.min(1, sw * 1.6) : 0) : 0, v: ay + bh }; };
  const R = leg(phi, false), Lg = leg(phi + Math.PI, true), hy = DBY - Math.max(R.v, Lg.v), x0 = DCX + (stride ? 0 : 0);
  out.hipY = hy; out.dip = hy - hip;
  for (const l of [Lg, R]) { const off = stride ? 0 : (l.far ? -0.5 : 0.25); out.legs.push({ far: l.far, hip: [x0 + off, hy], knee: [x0 + off + l.kx, hy + l.ky], ank: [x0 + off + l.ax, hy + l.ay], ang: l.ang }); }
  return out; }

/* ---- legs (pants tint) ---- */
function legsL(kit, dir, pose, f, robe) { const [c, g]: any = frame(); if (robe) return c; const K = KD[kit], rig = legRig(kit, dir, pose, f), side = dir === 'side';
  for (const l of rig.legs) { if (l.hidden) continue; const P = l.far ? GPd : GP, w0 = K.thw * (side ? 0.92 : 1), pts = [l.hip, l.knee, l.ank];
    if (pose === 'kneel' && side) { D(g, [tube([l.hip, l.knee], [w0, K.knw])], P, { smooth: false }); D(g, [tube([l.knee, l.ank], [K.knw, K.ank])], P, { smooth: false }); continue; }
    D(g, [tube(pts, [w0 * 0.94, K.knw * 0.9, K.ank * 0.9], { seg: 6 })], P, { smooth: true }); if (!l.far) { g.strokeStyle = 'rgba(70,62,140,.2)'; g.lineWidth = 0.12; g.lineCap = 'round'; g.beginPath(); g.moveTo(l.knee[0] - 0.5, l.knee[1] - 0.1); g.quadraticCurveTo(l.knee[0], l.knee[1] + 0.35, l.knee[0] + 0.5, l.knee[1] - 0.1); g.stroke(); } }
  return c; }

/* ---- boots (fixed colour) ---- */
const BOOT = pal('#5b4332', '#b08a62', '#7a5a42'), BOOTd = pal('#3f2f24', '#8a6a4a', null), SOLE = '#2a2019';
function bootPts(kit, dir, l, rig) { const g = geo(kit), K = g.K, s = Math.max(0.62, g.bh / 1.2), [ax, ay] = l.ank, front = dir !== 'side', a = l.ang || 0;
  if (front) { const w = K.ank * 0.45 + 0.34, tp = s * 1.55, bt = s * 1.32, tw = w + 0.2, sp = (ax >= DCX ? 1 : -1) * 0.1, X = (x, y) => [ax + (x) * Math.cos(sp) - (y - ay) * Math.sin(sp) * 0.0 + (y - ay) * Math.sin(sp) * 0, y];
    const q = [[-w, -tp], [w, -tp], [w + 0.02, -0.15], [tw * 0.96, bt * 0.22], [tw * 1.02, bt * 0.58], [tw * 0.84, bt * 0.94], [0, bt * 1.02], [-tw * 0.84, bt * 0.94], [-tw * 1.02, bt * 0.58], [-tw * 0.96, bt * 0.22], [-w - 0.02, -0.15]];
    const sh = q.map(p => { const px = p[0], py = p[1], c = Math.cos(sp), sn = Math.sin(sp); const rx = px * c - Math.max(0, py) * sn, ry = py + px * sn * Math.min(1, Math.max(0, py) / bt) * 0.5; return [ax + rx, ay + ry]; });
    return { shaft: sh, cuff: [[ax - w - 0.1, ay - tp - 0.08], [ax + w + 0.1, ay - tp - 0.08], [ax + w + 0.1, ay - tp + 0.42 * s], [ax - w - 0.1, ay - tp + 0.42 * s]], sole: [ax + (-tw * 0.78) * Math.cos(sp), ay + bt * 0.78, tw * 1.56 * Math.cos(sp), bt * 0.3], toeY: ay + bt * 0.62, sp }; }
  const L = (x, y) => [x * s, y * s], pts = [L(-1.2, -1.55), L(1.0, -1.55), L(1.18, -0.25), L(2.3, 0.35), L(3.1, 0.75), L(3.3, 1.15), L(3.05, 1.45), L(-1.2, 1.45), L(-1.38, 0.75)], mid = pts.map(p => p.slice());
  return { shaft: xf(pts, ax, ay, a), cuff: xf([L(-1.3, -1.65), L(1.1, -1.65), L(1.1, -1.05), L(-1.3, -1.05)], ax, ay, a), soleLn: xf([L(-1.3, 1.2), L(3.2, 1.2)], ax, ay, a), toe: xf([L(2.2, 0.35), L(3.1, 0.75), L(3.3, 1.15), L(3.0, 1.45), L(1.9, 1.45)], ax, ay, a) }; }
function shoesL(kit, dir, pose, f, robe) { const [c, g]: any = frame(), rig = legRig(kit, dir, pose, f); if (pose === 'kneel' && dir !== 'side') return c;
  for (const l of rig.legs) { if (l.hidden) continue; const b = bootPts(kit, dir, l, rig), P = l.far ? BOOTd : BOOT;
    if (dir === 'side') { const o = { smooth: true, lx: -0.3, ly: -0.4, rim: 0.22, ow: 0.28, os: 0.22, iw: 0.09, hs: 0.4 }; D(g, [b.shaft], P, o);
      g.save(); g.beginPath(); trace(g, b.shaft, true); g.clip(); g.strokeStyle = SOLE; g.lineWidth = 0.55; g.lineCap = 'butt'; g.beginPath(); g.moveTo(b.soleLn[0][0], b.soleLn[0][1]); g.lineTo(b.soleLn[1][0], b.soleLn[1][1]); g.stroke(); g.restore();
      g.fillStyle = 'rgba(224,196,150,.55)'; g.beginPath(); trace(g, b.cuff, false); g.fill(); g.strokeStyle = 'rgba(30,22,16,.5)'; g.lineWidth = 0.12; g.beginPath(); g.moveTo(b.cuff[3][0], b.cuff[3][1]); g.lineTo(b.cuff[2][0], b.cuff[2][1]); g.stroke(); }
    else { D(g, [b.shaft], P, { smooth: true, lx: -0.3, ly: -0.35, rim: 0.22, ow: 0.28, os: 0.22, iw: 0.09, hs: 0.4 });
      g.save(); g.beginPath(); trace(g, b.shaft, true); g.clip(); g.strokeStyle = SOLE; g.lineWidth = 0.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(b.sole[0], b.sole[1] + 0.05); g.quadraticCurveTo(b.sole[0] + b.sole[2] / 2, b.sole[1] + b.sole[3] * 1.25, b.sole[0] + b.sole[2], b.sole[1] + 0.05); g.stroke(); g.strokeStyle = 'rgba(30,22,16,.38)'; g.lineWidth = 0.1; g.beginPath(); g.moveTo(b.shaft[3][0] - 0.2, b.toeY - 0.15); g.quadraticCurveTo(b.shaft[3][0] * 0.5 + b.shaft[9][0] * 0.5, b.toeY + 0.35, b.shaft[9][0] + 0.2, b.toeY - 0.15); g.stroke(); g.restore(); g.fillStyle = 'rgba(224,196,150,.5)'; g.beginPath(); trace(g, b.cuff, false); g.fill();
      g.strokeStyle = 'rgba(30,22,16,.5)'; g.lineWidth = 0.12; g.beginPath(); g.moveTo(b.cuff[3][0], b.cuff[3][1]); g.lineTo(b.cuff[2][0], b.cuff[2][1]); g.stroke(); } }
  return c; }

/* ---- the tunic / robe outline, neckline, collar ---- */
function bodyPts(kit, dir, o: any = {}) { const { K, sy, hem } = geo(kit), sh = K.sh, tl = K.tl, hemY = o.hemY ?? hem, yb = (hemY - sy) / tl, rb = !!o.robe, X = DCX, sd = o.sway || 0;
  if (dir === 'side') { const f = (xf_, yf) => [X + xf_ * sh, sy + yf * tl]; const fl = rb ? 0.78 : 0.62;
    return spl([f(-0.28, -0.02), f(0.3, -0.04), f(0.52, 0.12), f(0.6, 0.3), f(0.58, 0.5), f(rb ? 0.55 : 0.5, 0.7), f(fl + 0.03, yb - 0.1), f(fl + sd * 0.1, yb), f(0.1, yb + 0.01), f(-fl, yb), f(-fl + 0.02, yb - 0.12), f(rb ? -0.58 : -0.5, 0.72), f(-0.62, 0.5), f(-0.66, 0.3), f(-0.55, 0.13)], true, 4); }
  const f = (xf_, yf) => [X + xf_ * sh, sy + yf * tl], fl = rb ? 1.14 : K.hp / sh, wa = rb ? 0.66 : K.wa / sh;
  const h = [f(0, -0.03), f(0.34, -0.03), f(0.68, 0.06), f(0.9, 0.16), f(0.94, 0.27), f(0.9, 0.42), f(0.87, 0.54), f(wa, 0.71), f(rb ? 0.84 : (wa + fl) / 2 + 0.02, rb ? 0.71 + (yb - 0.71) * 0.45 : 0.85), f(fl - 0.03 + sd * 0.1, yb - 0.04), f(fl + sd * 0.1, yb), f(fl * 0.55, yb + (rb ? 0.02 : 0.015)), f(0, yb + 0.02)];
  return spl(sym(h), true, 4); }
function neckLine(kit, dir) { const { K, sy, u } = geo(kit), kn = K.nkw / 1.6, X = DCX;
  if (dir === 'back') return [[X - 0.95 * kn, sy - 0.15], [X + 0.95 * kn, sy - 0.15]];
  if (dir === 'side') return spl([[X - 0.85, sy - 0.12], [X - 0.2, sy + 0.18 * u], [X + 0.55, sy + 0.12 * u], [X + 0.95, sy - 0.12]], false, 4);
  return spl([[X - 1.0 * kn, sy - 0.14], [X - 0.78 * kn, sy + 0.5 * u], [X, sy + 1.02 * u], [X + 0.78 * kn, sy + 0.5 * u], [X + 1.0 * kn, sy - 0.14]], false, 4); }

/* ---- arms: a chain shoulder -> elbow -> wrist -> hand, painted per pose ---- */
function ik(S, T, ua, fa, bend) { const dx = T[0] - S[0], dy = T[1] - S[1], d = Math.min(Math.hypot(dx, dy), ua + fa - 0.002), th = Math.atan2(dy, dx), ca = Math.max(-1, Math.min(1, (ua * ua + d * d - fa * fa) / (2 * ua * Math.max(d, 0.001)))), A = Math.acos(ca) * bend;
  const E = [S[0] + ua * Math.cos(th + A), S[1] + ua * Math.sin(th + A)], dd = Math.hypot(dx, dy) || 1, W = [S[0] + Math.cos(th) * d, S[1] + Math.sin(th) * d]; return { S, E, W }; }
function fk(S, a1, a2, ua, fa) { const E = [S[0] + Math.sin(a1) * ua, S[1] + Math.cos(a1) * ua]; return { S, E, W: [E[0] + Math.sin(a2) * fa, E[1] + Math.cos(a2) * fa] }; }
function shoulderAt(kit, dir, which) { const { K, sy } = geo(kit), side = dir === 'side';
  if (side) return [DCX + (which === 'far' ? 0.15 : -0.1), sy + 1.25]; const s = which === 'L' ? -1 : 1; return [DCX + s * (K.sh - 0.95), sy + 1.0]; }
/* the arms for stand/walk: { arms: [ {S,E,W,hand, far} ] } */
function armRig(kit, dir, pose, f) { const { K, u } = geo(kit), side = dir === 'side', phi = walkPh(f || 0), walking = pose === 'walk', out = [];
  if (pose === 'sit' || pose === 'kneel') { /* hands in the lap */
    if (side) { for (const far of [true, false]) { const S = shoulderAt(kit, dir, far ? 'far' : 'near'), T = [S[0] + 2.7 * u + (far ? 0.2 : 0), S[1] + K.ua * 1.3 + 0.2]; const r = ik(S, T, K.ua, K.fa, 1); out.push(Object.assign(r, { far, hand: { ang: 0.1, kind: 'rest' } })); } }
    else for (const s of [-1, 1]) { const S = shoulderAt(kit, dir, s < 0 ? 'L' : 'R'), T = [DCX + s * (K.thw * 0.62), S[1] + K.ua + K.fa * 0.75]; const r = ik(S, T, K.ua, K.fa, -s); out.push(Object.assign(r, { hand: { ang: Math.PI / 2 - s * 0.35, kind: 'rest' } })); }
    return out; }
  if (side) { for (const far of [true, false]) { const S = shoulderAt(kit, dir, far ? 'far' : 'near'), sw = walking ? Math.sin(phi + (far ? Math.PI : 0)) : 0, a1 = (walking ? 0.5 : 0.05) * sw + 0.05, a2 = a1 + (walking ? 0.25 + 0.55 * Math.max(0, sw) : 0.2);
      const r = fk(S, a1 - (far ? 0 : 0), a2, K.ua, K.fa); out.push(Object.assign(r, { far, hand: { ang: Math.PI / 2 - a2, kind: 'rest' } })); } return out; }
  for (const s of [-1, 1]) { const S = shoulderAt(kit, dir, s < 0 ? 'L' : 'R'), sw = walking ? Math.sin(phi + (s > 0 ? Math.PI : 0)) : 0, o1 = (walking ? 0.1 : 0.07 - (s > 0 ? 0.02 : 0)) + 0.02 * sw, o2 = (walking ? 0.04 : -0.1 + (s > 0 ? -0.03 : 0.02)) + 0.03 * sw, k = 1 - 0.1 * Math.abs(sw), ua = K.ua * k, fa = K.fa * k;
    const r = fk(S, s * o1, s * o2, ua, fa); r.W[1] += sw * (dir === 'back' ? -0.5 : 0.5) * 0.9; r.E[1] += sw * (dir === 'back' ? -0.5 : 0.5) * 0.4; out.push(Object.assign(r, { hand: { ang: Math.PI / 2 - s * 0.12, kind: 'rest' } })); }
  return out; }
function handPts(kit, A, kind) { const hs = KD[kit].hnd, a = A.hand.ang, W = A.W, sd = A.hand.thumb ?? 1;
  const palm = kind === 'fist' ? ellipsePts(0.62, 0, 0.82, 0.72, 16) : kind === 'open' ? spl([[-0.2, -0.5], [0.7, -0.66], [1.4, -0.62], [1.62, 0], [1.4, 0.62], [0.7, 0.66], [-0.2, 0.5]], true, 4) : spl([[-0.2, -0.4], [0.6, -0.54], [1.3, -0.5], [1.82, -0.3], [1.92, 0.02], [1.7, 0.3], [1.2, 0.44], [0.6, 0.5], [-0.2, 0.4]], true, 4);
  const thumb = kind === 'fist' ? spl([[0.2, 0.55 * sd], [0.75, 0.88 * sd], [1.3, 0.72 * sd], [1.15, 0.38 * sd]], true, 4) : spl([[0.3, 0.45 * sd], [0.75, 0.9 * sd], [1.25, 0.88 * sd], [1.12, 0.46 * sd]], true, 4);
  const shapes = [palm, thumb]; if (kind === 'open') for (const q of [-0.5, -0.17, 0.17, 0.5]) shapes.push(ellipsePts(1.82 + Math.abs(q) * -0.2, q * 0.95, 0.46, 0.2, 10, q * 0.6));
  return shapes.map(s => xf(s, W[0], W[1], a, hs)); }
function armL(kit, dir, A, part) { const [c, g]: any = frame(), K = KD[kit], P = A.far ? GPd : GP, { S, E, W } = A;
  if (part === 'sleeve') { const w1 = K.aw * 1.08, w2 = K.aw * 0.92, w3 = K.aw * 0.84, o = { smooth: false, ow: 0.28, os: 0.22 };
    D(g, [tube([S, E, W], [w1, w2, w3], { seg: 6 })], P, o);
    /* the shoulder: where the sleeve lies over the body its cap is rubbed out into the shirt, so the arm grows out of the shoulder instead of being laid on it */
    if (!A.far) { const body = bodyPts(kit, dir, {}), R = w1 * 1.25, cx0 = S[0] + (dir === 'side' ? 0 : (S[0] < DCX ? 0.25 : -0.25)), cy0 = S[1] - 0.1;
      g.save(); g.beginPath(); trace(g, body, false); g.clip(); const back = dir === 'back'; g.globalCompositeOperation = back ? 'source-atop' : 'destination-out'; const gr = g.createRadialGradient(cx0, cy0, 0, cx0, cy0, R); let c0 = '0,0,0'; if (back) { const ux = E[0] - S[0], uy = E[1] - S[1], ul = Math.hypot(ux, uy) || 1, px = S[0] + ux / ul * 2.0, py = S[1] + uy / ul * 2.0, im = g.getImageData(Math.round(px * Q) - 1, Math.round(py * Q) - 1, 3, 3).data; let r = 0, gg = 0, b = 0, n = 0; for (let i = 0; i < im.length; i += 4) if (im[i + 3] > 200) { r += im[i]; gg += im[i + 1]; b += im[i + 2]; n++; } c0 = n ? `${Math.round(r / n)},${Math.round(gg / n)},${Math.round(b / n)}` : '224,224,236'; } gr.addColorStop(0, `rgba(${c0},1)`); gr.addColorStop(0.5, `rgba(${c0},0.92)`); gr.addColorStop(1, `rgba(${c0},0)`);   /* from behind the hair may lie under the shoulder, so there the cap is painted over in the shirt's own grey instead */ g.fillStyle = gr; g.fillRect(cx0 - R, cy0 - R, 2 * R, 2 * R); g.restore(); }
    const ex = W[0] - E[0], ey = W[1] - E[1], l = Math.hypot(ex, ey) || 1, nx = -ey / l, ny = ex / l, cw = w3 * 0.5 + 0.06;
    g.strokeStyle = 'rgba(40,34,70,.5)'; g.lineWidth = 0.13; g.lineCap = 'round'; g.beginPath(); g.moveTo(W[0] - ex / l * 0.55 + nx * cw, W[1] - ey / l * 0.55 + ny * cw); g.lineTo(W[0] - ex / l * 0.55 - nx * cw, W[1] - ey / l * 0.55 - ny * cw); g.stroke();
    /* the crease where the elbow folds */
    const ux = E[0] - S[0], uy = E[1] - S[1], ul = Math.hypot(ux, uy) || 1, bend = Math.abs((ux * ey - uy * ex) / (ul * l));
    if (bend > 0.12) { g.strokeStyle = 'rgba(60,52,130,.32)'; g.lineWidth = 0.13; const side2 = Math.sign(ux * ey - uy * ex) || 1; g.beginPath(); g.moveTo(E[0] + nx * w2 * 0.1 * side2, E[1] + ny * w2 * 0.1 * side2); g.quadraticCurveTo(E[0] - nx * side2 * w2 * 0.25, E[1] - ny * side2 * w2 * 0.25, E[0] - nx * side2 * w2 * 0.45 - ex / l * 0.2, E[1] - ny * side2 * w2 * 0.45 - ey / l * 0.2); g.stroke(); } }
  else { const kind = A.hand.kind || 'rest'; D(g, handPts(kit, A, kind), A.far ? pal('#d9d6e0', '#eeecf4', null, 0.6) : SKINP, { smooth: true, ow: 0.24, os: 0.18, iw: 0.08, hs: 0.45, lx: -0.2, ly: -0.28, rim: 0.16 });
    if (kind !== 'open') { const hs = K.hnd, a = A.hand.ang, Wp = A.W, sd = A.hand.thumb ?? 1;   // fingers: the curl of three of them, and the knuckles
      g.strokeStyle = 'rgba(70,40,50,.42)'; g.lineWidth = 0.07; g.lineCap = 'round'; const q = [[0.7, -0.3, 1.55, -0.28], [0.7, -0.02, 1.62, 0.0], [0.7, 0.26, 1.5, 0.3]].map(l => xf([[l[0], l[1]], [l[2], l[3]]], Wp[0], Wp[1], a, hs)); for (const l of q) { g.beginPath(); g.moveTo(l[0][0], l[0][1]); g.lineTo(l[1][0], l[1][1]); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.28)'; const kn = xf([[0.78, -0.4], [0.78, -0.1], [0.78, 0.2]], Wp[0], Wp[1], a, hs); for (const p of kn) { g.beginPath(); g.arc(p[0], p[1], 0.08, 0, TAU); g.fill(); } } }
  return c; }
const armKey = (kit, dir, A, part) => `${kit}_${dir}_arm_${part}_${A.far ? 'f' : 'n'}_` + [...A.S, ...A.E, ...A.W, A.hand.ang, A.hand.kind || 'rest', A.hand.thumb ?? 1].map(v => typeof v === 'number' ? Math.round(v * 8) : v).join(',');

/* ---- torso (shirt tint): the body only, arms are separate layers ---- */
function torsoL(kit, dir, pose, f, robe, o: any = {}) { const [c, g]: any = frame(), { K, sy, hem, u } = geo(kit), side = dir === 'side', phi = pose === 'walk' ? walkPh(f || 0) : 0;
  const hemR = DBY - 1.15 * Math.max(0.7, u * 0.4 + 0.6), hemY = robe ? (o.sit ? DBY - 1.1 - geo(kit).sit * 0.95 : hemR) : hem, sway = robe && pose === 'walk' ? Math.sin(phi) * 1.4 : 0;
  const body = bodyPts(kit, dir, { robe, hemY, sway }), nl = neckLine(kit, dir);
  D(g, [body], GP, { smooth: false, ow: 0.27, os: 0.13, lx: -0.34, ly: -0.3, rim: 0.3 });
  g.save(); g.beginPath(); trace(g, body, false); g.clip();
  { const gx = g.createLinearGradient(DCX - K.sh * 1.0, sy, DCX + K.sh * 1.0, hemY), gy = g.createLinearGradient(0, sy, 0, hemY); gx.addColorStop(0, 'rgba(255,255,255,.16)'); gx.addColorStop(0.45, 'rgba(255,255,255,0)'); gx.addColorStop(1, 'rgba(70,62,150,.26)'); g.fillStyle = gx; g.fillRect(DCX - 8, sy - 1, 16, hemY - sy + 2);   /* the cloth turns away from the sun: lit on the left, cooler to the right */
    gy.addColorStop(0, 'rgba(255,255,255,.1)'); gy.addColorStop(0.6, 'rgba(255,255,255,0)'); gy.addColorStop(1, 'rgba(70,62,150,.12)'); g.fillStyle = gy; g.fillRect(DCX - 8, sy - 1, 16, hemY - sy + 2); }
  g.strokeStyle = 'rgba(70,62,140,.2)'; g.lineWidth = 0.13; g.lineCap = 'round';
  const fold = (x1, y1, x2, y2, bx, by) => { g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo(bx, by, x2, y2); g.stroke(); };
  const tl = K.tl, X = DCX;
  if (!side) { fold(X - K.sh * 0.5, sy + tl * 0.74, X - K.sh * 0.3, hemY - 0.2, X - K.sh * 0.44, sy + tl * 0.9); fold(X + K.sh * 0.34, sy + tl * 0.78, X + K.sh * 0.46, hemY - 0.25, X + K.sh * 0.42, sy + tl * 0.92); fold(X - 0.3, sy + tl * 0.62, X - 0.05, sy + tl * 0.95, X - 0.35, sy + tl * 0.8);
    fold(X - K.sh * 0.72, sy + tl * 0.34, X - K.sh * 0.5, sy + tl * 0.5, X - K.sh * 0.6, sy + tl * 0.42); fold(X + K.sh * 0.72, sy + tl * 0.34, X + K.sh * 0.52, sy + tl * 0.52, X + K.sh * 0.62, sy + tl * 0.44); }
  else { fold(X - 1.1, sy + tl * 0.62, X - 0.7, hemY - 0.2, X - 1.05, sy + tl * 0.86); fold(X + 0.7, sy + tl * 0.74, X + 1.1, hemY - 0.3, X + 1.0, sy + tl * 0.9); fold(X - 0.4, sy + tl * 0.3, X + 0.4, sy + tl * 0.46, X, sy + tl * 0.4); }
  if (dir === 'back') { g.strokeStyle = 'rgba(70,62,140,.22)'; g.beginPath(); g.moveTo(X, sy + 0.5); g.lineTo(X, hemY - 0.3); g.stroke(); }
  if (robe) { g.strokeStyle = 'rgba(70,62,140,.26)'; for (const q of [-0.55, -0.2, 0.18, 0.55]) fold(X + q * K.sh, sy + tl * 0.74, X + q * K.sh * 1.2, hemY - 0.15, X + q * K.sh * 0.95, sy + tl * 0.7 + (hemY - sy - tl * 0.7) * 0.5); }
  g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(X - K.sh * 0.5, sy + tl * 0.12, K.sh * 0.33, 0.32, -0.18, 0, TAU); g.fill();
  g.restore();
  /* collar: a rolled band round the neckline, and the dark of the inside of the shirt */
  if (dir === 'front') { const inner = nl.map(p => [p[0], p[1] + 0.0]); g.fillStyle = 'rgba(60,52,120,.32)'; g.beginPath(); trace(g, nl.concat([[nl[nl.length - 1][0], nl[nl.length - 1][1] - 0.5], [nl[0][0], nl[0][1] - 0.5]]), false); g.fill();
    g.strokeStyle = INK; g.lineWidth = 0.55; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); nl.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); g.strokeStyle = '#ffffff'; g.lineWidth = 0.34; g.beginPath(); nl.forEach((p, i) => i ? g.lineTo(p[0], p[1] + 0.02) : g.moveTo(p[0], p[1] + 0.02)); g.stroke(); g.strokeStyle = 'rgba(80,72,150,.4)'; g.lineWidth = 0.12; g.beginPath(); nl.forEach((p, i) => i ? g.lineTo(p[0], p[1] + 0.2) : g.moveTo(p[0], p[1] + 0.2)); g.stroke(); }
  else if (dir === 'back') { g.strokeStyle = INK; g.lineWidth = 0.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(nl[0][0], nl[0][1] + 0.05); g.quadraticCurveTo(DCX, sy + 0.38, nl[1][0], nl[1][1] + 0.05); g.stroke(); g.strokeStyle = '#ffffff'; g.lineWidth = 0.3; g.stroke(); }
  else { g.strokeStyle = INK; g.lineWidth = 0.5; g.lineCap = 'round'; g.beginPath(); nl.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); g.strokeStyle = '#ffffff'; g.lineWidth = 0.3; g.stroke(); }
  return c; }
/* accent patterns (stripe, vest, belt, sash, collar): tinted with the accent colour, clipped to the same outline */
function accentL(kit, dir, pose, f, pat) { const [c, g]: any = frame(), { K, sy, hem, u } = geo(kit), tl = K.tl, X = DCX, body = bodyPts(kit, dir, {}), side = dir === 'side', x0 = X - K.sh * (side ? 0.7 : 1.05), w = K.sh * (side ? 1.4 : 2.1);
  const bar = (x, y, ww, hh) => { g.fillStyle = '#eeeef6'; g.fillRect(x, y, ww, hh); g.fillStyle = 'rgba(70,70,150,.22)'; g.fillRect(x, y + hh * 0.68, ww, hh * 0.32); g.fillStyle = 'rgba(42,35,50,.4)'; g.fillRect(x, y, ww, 0.12); g.fillRect(x, y + hh - 0.1, ww, 0.1); };
  g.save(); g.beginPath(); trace(g, body, false); g.clip();
  if (pat === 'stripe') { bar(x0, sy + tl * 0.3, w, 0.95 * u); bar(x0, sy + tl * 0.56, w, 0.95 * u); bar(x0, sy + tl * 0.82, w, 0.95 * u); }
  else if (pat === 'vest') { if (dir === 'front') { for (const s of [-1, 1]) { const p = [[X + s * 0.95 * (K.nkw / 1.6), sy - 0.2], [X + s * K.sh * 0.5, sy + tl * 0.1], [X + s * K.sh * 0.62, sy + tl * 0.5], [X + s * K.sh * 0.5, hem + 0.2], [X + s * K.sh * 0.2, hem + 0.2], [X + s * 0.65, sy + tl * 0.7]]; g.fillStyle = '#eeeef6'; g.beginPath(); trace(g, p, false); g.fill(); g.fillStyle = 'rgba(70,70,150,.22)'; g.beginPath(); trace(g, p.map(q => [q[0] + s * 0.0, q[1]]).filter((_, i) => i > 1), false); g.fill(); g.strokeStyle = 'rgba(42,35,50,.5)'; g.lineWidth = 0.13; g.beginPath(); trace(g, p, false); g.stroke(); } }
    else bar(x0, sy + 0.2, w, tl * 0.95); }
  else if (pat === 'belt') { bar(x0, sy + tl * 0.76, w, 1.0 * u); g.fillStyle = 'rgba(0,0,0,0)'; if (dir === 'front') { g.fillStyle = '#d6b050'; g.strokeStyle = 'rgba(42,35,50,.7)'; g.lineWidth = 0.14; g.fillRect(X - 0.7 * u, sy + tl * 0.76 - 0.1, 1.4 * u, 1.2 * u); g.strokeRect(X - 0.7 * u, sy + tl * 0.76 - 0.1, 1.4 * u, 1.2 * u); } }
  else if (pat === 'sash') { const p = side ? [[X - 2, sy + 0.1], [X - 0.9, sy + 0.1], [X + 2.2, sy + tl * 0.86], [X + 0.9, sy + tl * 0.86]] : [[X - K.sh * 0.78, sy + 0.1], [X - K.sh * 0.3, sy], [X + K.sh * 1.1, sy + tl * 0.72], [X + K.sh * 0.95, sy + tl * 0.95], [X + K.sh * 0.5, sy + tl * 0.95], [X - K.sh * 0.95, sy + tl * 0.3]];
    g.fillStyle = '#eeeef6'; g.beginPath(); trace(g, p, false); g.fill(); g.strokeStyle = 'rgba(42,35,50,.5)'; g.lineWidth = 0.13; g.stroke(); }
  else if (pat === 'collar') { if (dir === 'back') bar(X - 1.3, sy - 0.1, 2.6, 0.6); else for (const s of [-1, 1]) { const p = [[X + s * 0.4, sy + 0.1], [X + s * 1.5, sy - 0.1], [X + s * 1.9, sy + 1.2], [X + s * 0.5, sy + 1.3]]; g.fillStyle = '#eeeef6'; g.beginPath(); trace(g, p, false); g.fill(); g.strokeStyle = 'rgba(42,35,50,.5)'; g.lineWidth = 0.13; g.stroke(); } }
  g.restore(); return c; }
/* fixed-colour clothing: apron, priest's stole, mourning sash */
function clothL(kit, dir, pose, f, what) { const [c, g]: any = frame(), { K, sy, hem, u } = geo(kit), tl = K.tl, X = DCX, side = dir === 'side';
  if (what === 'apron' && dir === 'back') { const yw = sy + tl * 0.66, hw = K.sh * 0.8;   /* seen from behind an apron is a strap round the neck and a bow at the waist */
    g.strokeStyle = INK; g.lineCap = 'round'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(X - 1.0 * u, sy - 0.05); g.quadraticCurveTo(X, sy + 0.9, X + 1.0 * u, sy - 0.05); g.stroke(); g.strokeStyle = '#efe6d0'; g.lineWidth = 0.3; g.stroke();
    g.fillStyle = '#efe6d0'; g.strokeStyle = INK; g.lineWidth = 0.14; g.fillRect(X - hw, yw, 2 * hw, 0.9 * u); g.strokeRect(X - hw, yw, 2 * hw, 0.9 * u);
    for (const s of [-1, 1]) { D(g, [spl([[X, yw + 0.4], [X + s * 1.9 * u, yw - 0.5], [X + s * 2.5 * u, yw + 0.6], [X + s * 1.4 * u, yw + 1.2], [X, yw + 0.7]], true, 3)], pal('#eee6d2', '#fbf8ee', null, 0.6), { smooth: false, ow: 0.2, os: 0.1, iw: 0.08 }); D(g, [spl([[X, yw + 0.7], [X + s * 0.5, yw + 2.9], [X + s * 1.4, yw + 3.6], [X + s * 1.2, yw + 2.4], [X + s * 0.4, yw + 0.6]], true, 3)], pal('#eee6d2', '#fbf8ee', null, 0.6), { smooth: false, ow: 0.18, os: 0.1, iw: 0.08 }); } }
  else if (what === 'apron') { const p = side ? spl([[X + 0.5, sy + tl * 0.4], [X + 2.0, sy + tl * 0.42], [X + 2.2, hem + 0.5 * u], [X + 0.3, hem + 0.55 * u]], true, 3) : spl([[X - 1.15 * u, sy + tl * 0.3], [X + 1.15 * u, sy + tl * 0.3], [X + 1.35 * u, sy + tl * 0.62], [X + 2.05 * u, sy + tl * 0.7], [X + 2.25 * u, hem + 0.6 * u], [X, hem + 0.78 * u], [X - 2.25 * u, hem + 0.6 * u], [X - 2.05 * u, sy + tl * 0.7], [X - 1.35 * u, sy + tl * 0.62]], true, 3);
    D(g, [p], pal('#eee6d2', '#fbf8ee', null, 0.6), { smooth: false, ow: 0.22, os: 0.14, iw: 0.1, lx: -0.3, ly: -0.3, rim: 0.2 }); g.strokeStyle = 'rgba(150,130,100,.55)'; g.lineWidth = 0.12; g.beginPath(); g.moveTo(X - 1.35 * u, sy + tl * 0.64); g.lineTo(X + 1.35 * u, sy + tl * 0.64); g.stroke();
    if (!side) { g.strokeStyle = 'rgba(150,130,100,.5)'; g.lineWidth = 0.12; g.strokeRect(X + 0.35 * u, sy + tl * 0.78, 1.1 * u, 0.9 * u); g.beginPath(); g.moveTo(X - 0.5, sy + tl * 0.66); g.quadraticCurveTo(X - 0.3, hem - 0.4, X - 0.9, hem + 0.5 * u); g.stroke(); }
    g.strokeStyle = 'rgba(150,130,100,.8)'; g.lineWidth = 0.2; g.beginPath(); g.moveTo(X - 1.15 * u, sy + tl * 0.3); g.lineTo(X - 0.8, sy + 0.25); g.moveTo(X + 1.15 * u, sy + tl * 0.3); g.lineTo(X + 0.8, sy + 0.25); g.stroke(); }
  else if (what === 'stole') { const p = spl([[X - 1.2, sy - 0.1], [X - 2.3, sy + 0.4], [X - 2.6, hem + 1.2], [X - 1.4, hem + 1.4], [X - 0.9, sy + 1.5]], true, 3), q = p.map(a => [2 * X - a[0], a[1]]);
    for (const s of [p, q]) D(g, [s], pal('#f4f0e6', '#ffffff', null, 0.6), { smooth: false, ow: 0.24, os: 0.2, iw: 0.1 }); g.fillStyle = '#e8c45a'; for (const s of [-1, 1]) { g.fillRect(X + s * 1.75 - 0.5, hem + 0.1, 1, 0.34); g.fillRect(X + s * 1.75 - 0.5, hem + 0.7, 1, 0.34); g.fillRect(X + s * 1.75 - 0.5, sy + tl * 0.4, 1, 0.3); } }
  else if (what === 'mourn') { const p = side ? [[X - 2.3, sy + tl * 0.34], [X + 2.1, sy + tl * 0.42], [X + 2.1, sy + tl * 0.62], [X - 2.3, sy + tl * 0.54]] : [[X - K.sh * 0.95, sy + tl * 0.3], [X + K.sh * 0.95, sy + tl * 0.3], [X + K.sh * 0.88, sy + tl * 0.52], [X - K.sh * 0.88, sy + tl * 0.52]];
    D(g, [p], pal('#34343e', '#6a6a7a', null, 0.5), { smooth: false, ow: 0.2, os: 0.16, iw: 0.08 }); }
  return c; }

/* ================= paper dolls: head, face, hair, beards, hats ================= */
/* head-local coordinates: x in units of the head's half width (forward is +x in side view), v from 0 (crown) to 1 (chin) */
function hd(kit, dir) { const g = geo(kit), K = g.K, X = dir === 'side' ? DCX + 0.15 : DCX, hw = K.hw, hh = K.hh, top = g.top;
  return { g, K, X, hw, hh, top, side: dir === 'side', back: dir === 'back', P: (xn, v) => [X + xn * hw, top + v * hh], y: v => top + v * hh }; }
const headFront = h => spl(sym([[0, 0], [0.42, 0.01], [0.78, 0.09], [0.96, 0.25], [1.0, 0.47], [0.96, 0.64], [0.82, 0.8], [0.54, 0.94], [0.22, 0.995], [0, 1]].map(p => h.P(p[0], p[1])), h.X), true, 5);
const headSide = h => spl([[0.0, 0.0], [0.52, 0.03], [0.86, 0.15], [0.97, 0.3], [0.96, 0.44], [1.1, 0.585], [1.0, 0.65], [1.0, 0.73], [0.94, 0.8], [0.96, 0.86], [0.84, 0.95], [0.6, 1.0], [0.2, 0.985], [-0.32, 0.9], [-0.76, 0.75], [-1.0, 0.52], [-0.97, 0.26], [-0.7, 0.06]].map(p => h.P(p[0], p[1])), true, 4);
const headOutline = h => h.side ? headSide(h) : headFront(h);
function neckPts(kit, dir) { const { K, sy, chin } = geo(kit), X = dir === 'side' ? DCX - 0.18 : DCX, w = (dir === 'side' ? K.nkw * 0.92 : K.nkw) / 2, top = chin - 1.4;
  if (dir === 'front') return spl([[X - w, top], [X + w, top], [X + w, sy - 0.1], ...neckLine(kit, 'front').slice(1, -1).reverse(), [X - w, sy - 0.1]], true, 1);
  if (dir === 'back') return [[X - w, top], [X + w, top], [X + w + 0.1, sy - 0.1], [X - w - 0.1, sy - 0.1]];
  return [[X - w, top], [X + w, top], [X + w + 0.3, sy - 0.05], [X - w + 0.1, sy - 0.05]]; }

/* ---- skin: head, ears, neck (hands belong to the arm layers) ---- */
function skinL(kit, dir, pose, f, o = {}) { const [c, g]: any = frame(), h = hd(kit, dir), { K, X, hw, hh } = h, { chin, sy } = h.g;
  const SK = (shapes, o2 = {}) => D(g, shapes, SKINP, Object.assign({ smooth: false, ow: 0.26, os: 0.22, iw: 0.09, hs: 0.5, lx: -0.3, ly: -0.42, rim: 0.2 }, o2));
  const nk = neckPts(kit, dir); SK([nk], { ow: 0.22 });
  g.save(); g.beginPath(); trace(g, nk, false); g.clip(); g.fillStyle = 'rgba(78,64,150,.34)'; g.beginPath(); g.ellipse(dir === 'side' ? X + 0.3 : X, chin + 0.15, hw * 0.78, K.nk * 0.9 + 0.55, 0, 0, TAU); g.fill(); g.restore();
  if (dir !== 'side') for (const s of [-1, 1]) SK([ellipsePts(X + s * hw * 0.99, h.y(0.56), dir === 'back' ? 0.4 : 0.46, dir === 'back' ? 0.74 : 0.8, 14)], { ow: 0.2, os: 0.14, iw: 0.07 });
  SK([headOutline(h)], { hs: 0.55, lx: -0.42, ly: -0.55, rim: 0.28 });
  if (dir === 'side') { SK([ellipsePts(X - hw * 0.14, h.y(0.58), 0.5, 0.86, 14, 0.18)], { ow: 0.14, os: 0.08, iw: 0.06 }); g.strokeStyle = 'rgba(120,70,70,.55)'; g.lineWidth = 0.14; g.lineCap = 'round'; g.beginPath(); g.arc(X - hw * 0.12, h.y(0.58) + 0.05, 0.26, -0.5, 2.6); g.stroke(); }
  else for (const s of [-1, 1]) { g.strokeStyle = 'rgba(120,70,70,.5)'; g.lineWidth = 0.1; g.lineCap = 'round'; g.beginPath(); g.arc(X + s * hw * 1.02, h.y(0.57), 0.2, 0, TAU); g.stroke(); }
  return c; }

/* ---- the face (fixed colour): eyes, brows, nose, mouth, blush, and the shade the hair throws on the forehead ---- */
/* ================= the face: a person's own eyes, brows, nose and mouth =================
   Every villager has a "look": the shape of the eyes, the colour of the iris, the set of the brows, the nose, the mouth, freckles, the lines
   that a life puts on a face, glasses. lookOf() chooses one from the person (their age, job and number) unless the person carries their own. */
const IRIS = { brown: ['#8a5a34', '#3e2414'], hazel: ['#92803a', '#44361a'], green: ['#62944e', '#2a4a2c'], blue: ['#6a92c6', '#26426e'], grey: ['#8a98a4', '#38444e'], dark: ['#4a3830', '#161010'] };
const EYESHAPE = { round: { h: 0.8, tilt: 0.0, lid: 0.06, w: 0.96 }, almond: { h: 0.6, tilt: 0.16, lid: 0.12, w: 1.08 }, kind: { h: 0.66, tilt: -0.12, lid: 0.14, w: 1.04 }, sleepy: { h: 0.62, tilt: -0.04, lid: 0.42, w: 1.06 }, narrow: { h: 0.44, tilt: 0.08, lid: 0.22, w: 1.06 }, wide: { h: 0.9, tilt: 0.0, lid: 0.04, w: 0.98 } };
const MOUTHS = ['smile', 'grin', 'neutral', 'smirk', 'small', 'frown', 'open'], BROWS = ['soft', 'arched', 'flat', 'thick', 'worried', 'stern', 'light'], NOSES = ['button', 'long', 'broad', 'sharp'];
const LOOK0 = { eyes: 'almond', iris: 'brown', brow: 'soft', nose: 'button', mouth: 'smile', freckles: false, lines: 0, glasses: false, blush: 0.5, bw: 1, ht: 1, hw: 1, post: 0 };
function lookOf(sp) { if (sp.look) return Object.assign({}, LOOK0, sp.look); const age = sp.age || 30, kid = age < 16, old = age >= 60, R = mul(1000 + (sp.id || 0) * 131 + Math.floor(age) * 7), pk = a => a[Math.floor(R() * a.length)], role = sp.role || 'Worker', fem = !!sp.female;
  const L: any = Object.assign({}, LOOK0, { eyes: pk(kid ? ['round', 'kind', 'almond', 'almond'] : ['almond', 'almond', 'round', 'sleepy', 'narrow', 'kind']), iris: pk(['brown', 'brown', 'brown', 'hazel', 'green', 'blue', 'grey', 'dark']), brow: pk(fem ? ['soft', 'soft', 'arched', 'light'] : ['soft', 'flat', 'thick', 'stern', 'arched']),
    nose: pk(kid ? ['button', 'button', 'sharp'] : NOSES), mouth: pk(kid ? ['grin', 'smile', 'small', 'smirk', 'smile'] : ['smile', 'neutral', 'smirk', 'small', 'smile', 'neutral']), freckles: R() < (kid ? 0.4 : 0.18), blush: kid ? 0.7 : 0.3 + R() * 0.3,
    bw: (fem ? 0.96 : 1.02) + (R() - 0.5) * 0.16, ht: (fem ? 0.97 : 1.02) + (R() - 0.5) * 0.1, hw: 0.95 + R() * 0.1, post: (R() - 0.5) * 2, lines: old ? 0.8 + R() * 0.2 : age >= 45 ? 0.35 + R() * 0.3 : age >= 33 ? 0.1 + R() * 0.15 : 0 });
  if (kid) { L.ht = age < 3 ? 1 : 0.97 + (R() - 0.5) * 0.06; L.bw = 1 + (R() - 0.5) * 0.1; L.lines = 0; }
  const OV = { Smith: { brow: 'thick', mouth: 'neutral', eyes: 'narrow', bw: 1.14, ht: 1.03, lines: 0.25 }, Priest: { eyes: 'kind', mouth: 'smile', brow: 'worried', bw: 0.96, blush: 0.25 }, Baker: { mouth: 'smile', eyes: 'kind', bw: 1.16, ht: 0.98, blush: 0.75 }, Barkeep: { mouth: 'smirk', eyes: 'sleepy', brow: 'arched', bw: 1.08 }, Farmer: { eyes: 'narrow', brow: 'thick', lines: 0.5, bw: 1.06 }, Fisher: { eyes: 'narrow', mouth: 'neutral', lines: 0.6 }, Woodcutter: { brow: 'thick', mouth: 'neutral', bw: 1.14, ht: 1.04 }, Trader: { mouth: 'smirk', eyes: 'almond', brow: 'arched', glasses: R() < 0.4 }, Elder: { eyes: 'kind', mouth: 'smile', lines: 1, brow: 'worried', glasses: R() < 0.5, ht: 0.95, bw: 0.96 } }[role];
  if (OV) Object.assign(L, OV); if (old && R() < 0.3) L.glasses = true; if (sp.age >= 70) L.post = Math.min(L.post, -0.4);
  L.browCol = old ? '#9a9aa2' : sp.hair || '#4a3020'; return L; }
const lookSig = L => [L.eyes, L.iris, L.brow, L.nose, L.mouth, L.freckles ? 1 : 0, Math.round(L.lines * 4), L.glasses ? 1 : 0, Math.round(L.blush * 4), L.browCol || ''].join('.');
function faceL(kit, dir, pose, f, o: any = {}) { const [c, g]: any = frame(); if (dir === 'back') return c; const L = Object.assign({}, LOOK0, o.look || {}), parts = o.parts || ['shade', 'eyes', 'brows', 'nose', 'mouth', 'cheeks', 'extras'], has = p => parts.includes(p);
  const h = hd(kit, dir), { K, X, hw, hh } = h, es = K.eye, side = dir === 'side', ink = '#2a1c18', kid = kit !== 'adult' && kit !== 'adultF', R = mul(77 + Math.round(L.lines * 9) + (L.nose || '').length * 13);
  const eyeY = h.y(0.55 + (es > 1.1 ? 0.02 : 0)), mouthY = h.y(0.845 - (es > 1.1 ? 0.012 : 0)), noseY = h.y(0.705), es_ = EYESHAPE[L.eyes] || EYESHAPE.almond, u = es * (kid ? 1.06 : 1);
  if (has('shade')) { g.save(); g.beginPath(); trace(g, headOutline(h), false); g.clip(); g.fillStyle = 'rgba(88,70,160,.2)'; g.beginPath(); g.ellipse(X + (side ? 0.2 : 0), h.y(0.0), hw * 1.1, hh * 0.36, 0, 0, TAU); g.fill(); g.restore(); }
  /* one eye. local x runs outward from the nose; (cx, cy) is its centre; rx its half width in game px */
  const eye = (cx, cy, out, rx, prof) => { const W = rx * es_.w, H = rx * es_.h * (prof ? 0.95 : 1) * (kid ? 1.06 : 1), t = es_.tilt, ir = IRIS[L.iris] || IRIS.brown;
    g.save(); g.translate(cx, cy); g.scale(out, 1);
    const open = () => { g.beginPath(); g.moveTo(-W, 0.04); g.bezierCurveTo(-W * 0.5, -H * 1.5, W * 0.4, -H * 1.55, W, -W * t); g.bezierCurveTo(W * 0.4, H * 0.95, -W * 0.5, H * 0.95, -W, 0.04); g.closePath(); };
    if (o.blink) { g.strokeStyle = ink; g.lineCap = 'round'; g.lineWidth = 0.2 * Math.max(0.9, es * 0.9); g.beginPath(); g.moveTo(-W, 0); g.bezierCurveTo(-W * 0.4, H * 0.9, W * 0.4, H * 0.9, W, -W * t); g.stroke(); g.lineWidth = 0.13; g.beginPath(); g.moveTo(W * 0.95, -W * t); g.lineTo(W * 1.3, -W * t - 0.28 * es); g.stroke(); g.restore(); return; }
    g.fillStyle = '#f2ece6'; open(); g.fill(); g.save(); open(); g.clip();
    const ix = prof ? W * 0.3 : W * 0.05, iy = H * 0.12, rI = Math.min(H * 0.98, W * 0.58), gr = g.createLinearGradient(0, iy - rI, 0, iy + rI); gr.addColorStop(0, ir[1]); gr.addColorStop(0.55, ir[0]); gr.addColorStop(1, ir[0]); g.fillStyle = gr; g.beginPath(); g.arc(ix, iy, rI, 0, TAU); g.fill();
    g.fillStyle = ir[1]; g.beginPath(); g.arc(ix, iy, rI * 0.8, 0, TAU); g.fill(); g.fillStyle = gr; g.beginPath(); g.arc(ix, iy + rI * 0.06, rI * 0.72, 0, TAU); g.fill(); g.fillStyle = '#120c0a'; g.beginPath(); g.arc(ix, iy, rI * 0.44, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.92)'; g.beginPath(); g.ellipse(ix - rI * 0.34, iy - rI * 0.38, rI * 0.26, rI * 0.2, -0.3, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(ix + rI * 0.32, iy + rI * 0.42, rI * 0.12, 0, TAU); g.fill();
    g.fillStyle = 'rgba(70,36,34,.42)'; g.fillRect(-W * 1.2, -H * 2, W * 2.5, H * (0.9 + 2 * es_.lid)); g.fillStyle = 'rgba(70,36,34,.55)'; g.fillRect(-W * 1.2, -H * 2, W * 2.5, H * (0.28 + 2 * es_.lid * 0.9));   /* the lid's shade on the eyeball */
    g.restore();
    g.strokeStyle = ink; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 0.27 * Math.max(0.9, es * 0.9); g.beginPath(); g.moveTo(-W * 1.02, 0.02); g.bezierCurveTo(-W * 0.5, -H * 1.5, W * 0.4, -H * 1.58, W * 1.02, -W * t); g.stroke();
    g.lineWidth = 0.16; g.beginPath(); g.moveTo(W * 0.98, -W * t); g.quadraticCurveTo(W * 1.2, -W * t - 0.05, W * 1.34, -W * t - 0.3 * es); g.stroke();
    g.strokeStyle = 'rgba(138,84,76,.4)'; g.lineWidth = 0.08; g.beginPath(); g.moveTo(-W * 0.8, H * 0.78); g.quadraticCurveTo(0, H * 1.12, W * 0.8, H * 0.7); g.stroke();
    g.strokeStyle = 'rgba(110,64,60,.34)'; g.lineWidth = 0.09; g.beginPath(); g.moveTo(-W * 0.8, -H * 1.32 - 0.22 * es); g.bezierCurveTo(-W * 0.3, -H * 2.1 - 0.25 * es, W * 0.4, -H * 2.1 - 0.25 * es, W * 0.95, -W * t - H * 0.5 - 0.1); g.stroke();   /* the fold of the lid */
    g.restore(); };
  const brow = (cx, out, w, prof) => { const by = eyeY - (0.98 + 0.2 * es_.h) * es, k = L.brow, wd = { soft: 0.2, arched: 0.17, flat: 0.22, thick: 0.34, worried: 0.2, stern: 0.3, light: 0.11 }[k] || 0.2, ar = { soft: 0.2, arched: 0.42, flat: 0.04, thick: 0.1, worried: 0.18, stern: 0.08, light: 0.2 }[k] || 0.2, sl = { soft: 0, arched: 0, flat: 0, thick: -0.08, worried: -0.34, stern: 0.3, light: 0 }[k] || 0;   // sl > 0: the inner end sits low (a frown)
    const wt = w * (prof ? 0.7 : 1) * 1.1, pts = [[-wt * 0.62, by + sl * 0.7 + 0.04], [-wt * 0.2, by - ar * 0.42 + sl * 0.3], [wt * 0.2, by - ar * 0.7 - sl * 0.05], [wt * 0.62, by - ar * 0.12 - sl * 0.1 + 0.18]].map(p => [cx + out * p[0], p[1]]);
    g.fillStyle = L.browCol || 'rgba(66,46,34,.9)'; g.beginPath(); trace(g, tube(pts, [wd * 1.0 * es, wd * 1.4 * es, wd * 1.25 * es, wd * 0.62 * es], { seg: 4 }), false); g.fill(); };
  const blush = (cx, cy, rx) => { const a = 0.18 + L.blush * 0.5, gr = g.createRadialGradient(cx, cy, 0, cx, cy, rx); gr.addColorStop(0, `rgba(238,108,118,${a})`); gr.addColorStop(1, 'rgba(238,108,118,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, rx, rx * 0.62, 0, 0, TAU); g.fill(); };
  const mouthF = () => { const w = { smile: 0.7, grin: 0.88, neutral: 0.62, smirk: 0.68, small: 0.46, frown: 0.62, open: 0.6 }[L.mouth] * Math.min(1.1, es) * 1.04, m = L.mouth, lip = 'rgba(176,72,68,.88)', lipD = '#7a2e2c';
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (m === 'grin' || m === 'open') { const dp = m === 'open' ? 0.62 : 0.5; g.fillStyle = '#5a1e22'; g.beginPath(); g.moveTo(X - w, mouthY - 0.06); g.quadraticCurveTo(X, mouthY + 0.16, X + w, mouthY - 0.06); g.quadraticCurveTo(X + w * 0.6, mouthY + dp, X, mouthY + dp * 1.02); g.quadraticCurveTo(X - w * 0.6, mouthY + dp, X - w, mouthY - 0.06); g.fill();
      if (m === 'grin') { g.fillStyle = '#f6f0e6'; g.beginPath(); g.moveTo(X - w * 0.86, mouthY - 0.02); g.quadraticCurveTo(X, mouthY + 0.14, X + w * 0.86, mouthY - 0.02); g.lineTo(X + w * 0.78, mouthY + 0.2); g.quadraticCurveTo(X, mouthY + 0.34, X - w * 0.78, mouthY + 0.2); g.fill(); }
      g.fillStyle = 'rgba(214,100,100,.85)'; g.beginPath(); g.ellipse(X, mouthY + dp * 0.8, w * 0.4, dp * 0.22, 0, 0, TAU); g.fill(); g.strokeStyle = lipD; g.lineWidth = 0.13; g.beginPath(); g.moveTo(X - w, mouthY - 0.06); g.quadraticCurveTo(X, mouthY + 0.16, X + w, mouthY - 0.06); g.stroke(); return; }
    const cy = { smile: 0.34, neutral: 0.06, smirk: 0.2, small: 0.14, frown: -0.3 }[m], lw = 0.16 * es, sk = m === 'smirk' ? 1 : 0;
    g.strokeStyle = lipD; g.lineWidth = lw; g.beginPath(); g.moveTo(X - w, mouthY + (m === 'frown' ? 0.26 : 0) - 0.02 + sk * 0.12); g.quadraticCurveTo(X, mouthY + cy, X + w, mouthY + (m === 'frown' ? 0.26 : -0.02) - sk * 0.08); g.stroke();
    if (m !== 'frown') { g.fillStyle = lip; g.beginPath(); g.moveTo(X - w * 0.72, mouthY + cy * 0.45); g.quadraticCurveTo(X, mouthY + cy * 1.32, X + w * 0.72, mouthY + cy * 0.4); g.quadraticCurveTo(X, mouthY + cy * 1.02 + 0.3 * es, X - w * 0.72, mouthY + cy * 0.45); g.fill(); g.fillStyle = 'rgba(255,230,230,.35)'; g.beginPath(); g.ellipse(X - 0.06, mouthY + cy * 1.02 + 0.1, w * 0.22, 0.05, 0, 0, TAU); g.fill(); }
    if (m === 'smile' || m === 'smirk') { g.strokeStyle = 'rgba(140,70,64,.5)'; g.lineWidth = 0.09; for (const s of [-1, 1]) { if (m === 'smirk' && s < 0) continue; g.beginPath(); g.arc(X + s * (w + 0.12), mouthY + (m === 'smirk' ? 0.02 : 0.1), 0.2, s > 0 ? -1.2 : 4.3, s > 0 ? 1.2 : 1.9 + Math.PI, s < 0); g.stroke(); } } };
  const noseF = () => { const n = L.nose, nw = { button: 0.34, long: 0.38, broad: 0.55, sharp: 0.3 }[n], tip = noseY + { button: 0.1, long: 0.26, broad: 0.14, sharp: 0.2 }[n], top = eyeY + 0.5 * es;
    g.strokeStyle = 'rgba(122,70,64,.3)'; g.lineWidth = 0.14; g.lineCap = 'round'; g.beginPath(); g.moveTo(X + 0.14, top); g.quadraticCurveTo(X + 0.2, (top + tip) / 2, X + 0.12, tip - 0.1); g.stroke();      // the bridge, shaded on the side away from the sun
    g.fillStyle = 'rgba(255,240,224,.35)'; g.beginPath(); g.ellipse(X - 0.04, tip - 0.24, 0.15, 0.12, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(132,70,64,.78)'; g.lineWidth = 0.12; g.beginPath(); g.moveTo(X - nw, tip - 0.04); g.quadraticCurveTo(X - nw * 0.9, tip + 0.1, X - nw * 0.3, tip + 0.08); g.moveTo(X + nw, tip - 0.04); g.quadraticCurveTo(X + nw * 0.9, tip + 0.1, X + nw * 0.3, tip + 0.08); g.stroke();
    g.fillStyle = 'rgba(120,56,52,.62)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(X + s * nw * 0.46, tip + 0.06, 0.1 + (n === 'broad' ? 0.04 : 0), 0.06, 0, 0, TAU); g.fill(); } };
  if (!side) { const ex = hw * 0.45, rx = 0.72 * es * (kid ? 1.08 : 1);
    if (has('eyes')) for (const s of [-1, 1]) eye(X + s * ex, eyeY, s, rx, false);
    if (has('brows')) for (const s of [-1, 1]) brow(X + s * ex, s, 1.2 * es, false);
    if (has('cheeks')) for (const s of [-1, 1]) blush(X + s * hw * 0.66, noseY + 0.2, 0.95 * es);
    if (has('nose')) noseF(); if (has('mouth')) mouthF(); }
  else { const ex = X + hw * 0.62, rx = 0.6 * es * (kid ? 1.08 : 1);
    if (has('eyes')) eye(ex, eyeY, 1, rx, true);
    if (has('brows')) brow(ex - 0.05, 1, 1.15 * es, true);
    if (has('cheeks')) blush(X + hw * 0.4, noseY + 0.2, 0.85 * es);
    if (has('mouth')) { const m = L.mouth, my = mouthY, mx0 = X + hw * 0.96, mx1 = X + hw * 0.52; g.lineCap = 'round'; g.strokeStyle = '#7a2e2c'; g.lineWidth = 0.15;
      const cy = { smile: 0.3, grin: 0.36, neutral: 0.04, smirk: 0.22, small: 0.1, frown: -0.26, open: 0.2 }[m]; g.beginPath(); g.moveTo(mx0, my - 0.12); g.quadraticCurveTo((mx0 + mx1) / 2 + 0.1, my + cy, mx1, my + (m === 'frown' ? 0.2 : 0.02) - (m === 'smile' || m === 'grin' ? 0.1 : 0)); g.stroke();
      g.fillStyle = 'rgba(176,72,68,.8)'; g.beginPath(); g.ellipse((mx0 + mx1) / 2 + 0.12, my + cy * 0.55 + 0.02, 0.32 * es, 0.12 + (m === 'open' || m === 'grin' ? 0.12 : 0), 0.1, 0, TAU); g.fill(); } }
  if (has('extras')) { const lines = L.lines || 0;
    if (L.freckles) { g.fillStyle = 'rgba(158,92,56,.62)'; const pts = side ? 8 : 12; for (let i = 0; i < pts; i++) { const s = side ? 1 : (i % 2 ? 1 : -1), px = side ? X + hw * (0.3 + R() * 0.55) : X + s * hw * (0.2 + R() * 0.62), py = noseY - 0.15 + R() * 0.7; g.beginPath(); g.arc(px, py, 0.06 + R() * 0.03, 0, TAU); g.fill(); } }
    if (lines > 0.05) { g.strokeStyle = `rgba(120,70,64,${0.18 + lines * 0.3})`; g.lineWidth = 0.09; g.lineCap = 'round';
      if (!side) { for (const s of [-1, 1]) { const ex = X + s * hw * 0.45, ox = ex + s * 0.82 * es;
          g.beginPath(); g.moveTo(ox + s * 0.1, eyeY - 0.05); g.lineTo(ox + s * 0.42, eyeY - 0.28); g.moveTo(ox + s * 0.1, eyeY + 0.1); g.lineTo(ox + s * 0.44, eyeY + 0.2); g.stroke();   // crow's feet
          g.beginPath(); g.moveTo(X + s * 0.55, noseY + 0.05); g.quadraticCurveTo(X + s * 0.8, noseY + 0.5, X + s * 0.86, mouthY - 0.05); g.stroke();                    // the smile line from nose to mouth
          if (lines > 0.5) { g.beginPath(); g.moveTo(ex - 0.5, eyeY + 0.62 * es); g.quadraticCurveTo(ex, eyeY + 0.74 * es, ex + 0.5, eyeY + 0.62 * es); g.stroke(); } }
        if (lines > 0.4) for (let i = 0; i < 2 + (lines > 0.75 ? 1 : 0); i++) { const yy = h.y(0.2) + i * 0.42; g.beginPath(); g.moveTo(X - hw * 0.5, yy); g.quadraticCurveTo(X, yy - 0.16, X + hw * 0.5, yy + 0.02); g.stroke(); } }
      else { g.beginPath(); g.moveTo(X + hw * 0.3, eyeY - 0.05); g.lineTo(X + hw * 0.0, eyeY - 0.28); g.moveTo(X + hw * 0.3, eyeY + 0.12); g.lineTo(X + hw * 0.04, eyeY + 0.22); g.stroke(); g.beginPath(); g.moveTo(X + hw * 0.55, noseY + 0.1); g.quadraticCurveTo(X + hw * 0.4, noseY + 0.5, X + hw * 0.4, mouthY - 0.02); g.stroke(); } }
    if (L.glasses) { g.strokeStyle = 'rgba(92,70,48,.95)'; g.lineWidth = 0.15; g.fillStyle = 'rgba(210,230,245,.14)';
      if (!side) { const ex = hw * 0.45, rr = 0.98 * es; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(X + s * ex, eyeY + 0.04, rr, rr * 0.86, 0, 0, TAU); g.fill(); g.stroke(); } g.beginPath(); g.moveTo(X - ex + rr, eyeY - 0.1); g.quadraticCurveTo(X, eyeY - 0.34, X + ex - rr, eyeY - 0.1); g.stroke(); for (const s of [-1, 1]) { g.beginPath(); g.moveTo(X + s * (ex + rr), eyeY - 0.06); g.lineTo(X + s * (hw * 1.0), eyeY - 0.02); g.stroke(); } }
      else { const ex = X + hw * 0.62, rr = 0.92 * es; g.beginPath(); g.ellipse(ex, eyeY + 0.04, rr * 0.8, rr * 0.86, 0, 0, TAU); g.fill(); g.stroke(); g.beginPath(); g.moveTo(ex - rr * 0.8, eyeY - 0.04); g.lineTo(X - hw * 0.1, eyeY - 0.06); g.stroke(); g.beginPath(); g.moveTo(ex + rr * 0.8, eyeY); g.lineTo(ex + rr * 0.95, eyeY + 0.12); g.stroke(); } } }
  return c; }
/* closed eyes for sleepers and the like (fixed colour) */
function faceSleepL(kit, dir) { const [c, g]: any = frame(), h = hd(kit, dir), { K, X, hw } = h, es = K.eye, eyeY = h.y(0.575); g.strokeStyle = '#2a1c18'; g.lineWidth = 0.2; g.lineCap = 'round';
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(X + s * hw * 0.44 - 0.6 * es, eyeY - 0.05); g.quadraticCurveTo(X + s * hw * 0.44, eyeY + 0.5 * es, X + s * hw * 0.44 + 0.6 * es, eyeY - 0.05); g.stroke(); } return c; }

/* ---- hair (tint) ---- */
function lockPts(A, B, w, bend) { const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, dx = B[0] - A[0], dy = B[1] - A[1], l = Math.hypot(dx, dy) || 1, C = [mx - dy / l * bend, my + dx / l * bend], pts = [], ws = [];
  for (let i = 0; i <= 6; i++) { const t = i / 6, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t; pts.push([a * A[0] + b * C[0] + c * B[0], a * A[1] + b * C[1] + c * B[1]]); ws.push(Math.max(0.03, w * (0.72 + 0.28 * Math.min(1, t * 3)) * Math.pow(1 - t, 0.78))); }
  return { poly: tube(pts, ws, { cap0: false, cap1: false, seg: 2 }), pts, w }; }
function hairStyle(kit, dir, style) { const h = hd(kit, dir), { K, hw, hh, X } = h, s = hw / 3.35, P = h.P, y = h.y, side = dir === 'side', back = dir === 'back';
  const out = { back: [], cap: null, locks: [], extra: [], ring: null, strands: [] };
  const lk = (a, b, w, bend = 0) => { const A = P(a[0], a[1]), B = P(b[0], b[1]); out.locks.push(lockPts(A, B, w * hw * 0.5, bend * hw * 0.5)); };
  const lkb = (a, b, w, bend = 0) => { const A = P(a[0], a[1]), B = P(b[0], b[1]); out.back.push(lockPts(A, B, w * hw * 0.5, bend * hw * 0.5)); };
  const capFront = (vol, hl) => spl(sym([[0, -0.17 * vol], [0.5, -0.14 * vol], [0.92, 0.0], [1.08 * vol, 0.22], [1.1 * vol, 0.47], [1.01, 0.56], [0.97, 0.44], [0.84, 0.31], [0.52, 0.23 + (hl - 0.19)], [0, hl]].map(p => P(p[0], p[1])), X), true, 4);
  const capBack = (vol, nape) => spl(sym([[0, -0.17 * vol], [0.5, -0.14 * vol], [0.92, 0.0], [1.08 * vol, 0.22], [1.1 * vol, 0.5], [1.0, 0.76], [0.74, nape - 0.06], [0.36, nape], [0, nape + 0.02]].map(p => P(p[0], p[1])), X), true, 4);
  const capSide = (vol, hl, nape) => spl([[0.99, hl + 0.06], [0.9, 0.0], [0.5, -0.14 * vol], [-0.15, -0.18 * vol], [-0.76, -0.08 * vol], [-1.08 * vol, 0.2], [-1.12 * vol, 0.46], [-1.04, nape], [-0.84, nape + 0.1], [-0.6, 0.62], [-0.4, 0.44], [-0.22, 0.3], [0.2, 0.25], [0.6, 0.24]].map(p => P(p[0], p[1])), true, 4);
  const blobAt = (cx, cy, rx, ry, n = 12) => ellipsePts(cx, cy, rx, ry, n);
  const st = style === 'short' ? 'short' : style;
  if (back) {
    const nape = { short: 0.9, crop: 0.86, shaggy: 0.92, curly: 0.9, long: 0.92, bob: 0.95, bun: 0.88, braids: 0.9, ponytail: 0.9, bald: 0.86 }[st] || 0.9;
    if (st === 'bald') { for (const q of [-1, 1]) lk([q * 1.0, 0.3], [q * 1.04, 0.66], 0.42); out.ring = null; return out; }
    out.cap = capBack(st === 'crop' ? 1.04 : st === 'curly' ? 1.14 : 1.1, nape);
    out.ring = { a: [-0.66, 0.06], b: [0.66, 0.06], dip: -0.16, th: 0.2 };
    if (st === 'shaggy') out.extra.push(spl(sym([[0, -0.1], [0.6, -0.05], [1.1, 0.3], [1.12, 0.8], [1.07, 1.12], [0.9, 1.36], [0.75, 1.12], [0.58, 1.4], [0.4, 1.14], [0.22, 1.42], [0, 1.16]].map(p => P(p[0], p[1])), X), true, 1));   /* one ragged mass, not a row of separate strips */
    if (st === 'curly') for (const [cx, cy, r] of [[-0.8, 0.1, 0.4], [0.8, 0.1, 0.4], [-0.3, -0.1, 0.42], [0.3, -0.1, 0.42], [-1.0, 0.45, 0.36], [1.0, 0.45, 0.36], [-0.55, 0.62, 0.38], [0.55, 0.62, 0.38], [0, 0.8, 0.4], [0, 0.22, 0.42], [-0.52, 0.34, 0.4], [0.52, 0.34, 0.4], [0, 0.5, 0.4]]) out.extra.push(blobAt(P(cx, cy)[0], P(cx, cy)[1], r * hw, r * hw));
    if (st === 'long') { const ln = kit === 'child' || kit === 'infant' ? 0.62 : 1, yl = v => v > 0.8 ? 0.8 + (v - 0.8) * ln : v;   /* a child's hair reaches the waist, not the knees */
      out.extra.push(spl(sym([[0, -0.1], [0.6, -0.05], [1.1, 0.3], [1.06, 0.8], [0.96, 1.25], [0.9, 1.8], [0.7, 2.12], [0.38, 1.98], [0, 2.18]].map(p => P(p[0], yl(p[1]))), X), true, 3)); }   /* falls down the back no wider than the head, so the shoulders and arms stay beside it */
    if (st === 'bob') out.extra.push(spl(sym([[0, 0.1], [0.7, 0.2], [1.14, 0.5], [1.18, 0.9], [1.12, 1.14], [0.8, 1.24], [0.4, 1.15], [0, 1.2]].map(p => P(p[0], p[1])), X), true, 3));
    if (st === 'bun') { out.extra.push(blobAt(X, y(-0.4), 0.46 * hw, 0.44 * hw, 14)); out.strands.push({ spiral: [X, y(-0.4), 0.3 * hw] }); }
    if (st === 'braids') for (const q of [-1, 1]) { const pts = [[X + q * hw * 0.78, y(0.78)], [X + q * hw * 0.98, y(1.12)], [X + q * hw * 1.0, y(1.6)], [X + q * hw * 0.96, y(2.0)]]; for (let i = 0; i < 5; i++) { const t = i / 4, px = X + q * hw * (0.78 + 0.22 * Math.sin(t * 2.2)), py = y(0.84 + t * 1.2); out.extra.push(blobAt(px, py, hw * 0.2, hw * 0.24, 8)); } }
    if (st === 'ponytail') { out.extra.push(lockPts(P(0, 0.12), P(0.1, 1.9), hw * 0.62, hw * 0.3).poly); out.strands.push({ tie: [X, y(0.14), hw * 0.34] }); }
    return out; }
  if (side) {
    const nape = { short: 0.66, crop: 0.5, shaggy: 0.8, curly: 0.74, long: 0.76, bob: 0.78, bun: 0.68, braids: 0.72, ponytail: 0.7, bald: 0.7 }[st] || 0.78;
    if (st === 'bald') { out.locks.push(lockPts(P(-0.55, 0.36), P(-0.78, 0.72), hw * 0.4, 0)); return out; }
    out.cap = capSide(st === 'crop' ? 1.02 : st === 'curly' ? 1.1 : 1.05, st === 'crop' ? 0.18 : 0.22, nape);
    out.ring = { a: [-0.75, 0.02], b: [0.6, 0.0], dip: -0.14, th: 0.2 };
    const fr = { short: [[[0.3, -0.08], [1.0, 0.3], 0.95, 0.35], [[-0.1, -0.12], [0.8, 0.24], 0.9, 0.3]], crop: [[[0.5, -0.02], [0.94, 0.16], 0.6, 0.1], [[0.1, -0.1], [0.6, 0.12], 0.6, 0.1]], shaggy: [[[0.4, -0.06], [1.04, 0.36], 0.8, 0.35], [[0.1, -0.1], [0.78, 0.3], 0.75, 0.3], [[-0.25, -0.12], [0.4, 0.28], 0.7, 0.25]] }[st] || [[[0.3, -0.08], [1.0, 0.3], 0.95, 0.35], [[-0.1, -0.12], [0.8, 0.24], 0.9, 0.3]];
    for (const [a, b, w, bd] of fr) lk(a, b, w, bd);
    if (st !== 'crop') lk([-0.02, 0.22], [0.0, 0.52], 0.3);
    if (st === 'shaggy') { lk([-0.7, 0.3], [-1.12, 1.0], 0.6, -0.2); lk([-0.4, 0.4], [-0.55, 1.05], 0.5, -0.1); lk([-0.2, -0.2], [-0.4, -0.5], 0.4); }
    if (st === 'curly') for (const [cx, cy, r] of [[-0.85, 0.05, 0.4], [-0.35, -0.12, 0.42], [0.2, -0.12, 0.42], [0.68, 0.02, 0.38], [-1.0, 0.45, 0.38], [-0.7, 0.72, 0.36], [0.85, 0.2, 0.3]]) out.extra.push(blobAt(P(cx, cy)[0], P(cx, cy)[1], r * hw, r * hw));
    if (st === 'long') out.back.push(lockPts(P(-0.9, 0.2), P(-1.25, 2.1), hw * 1.1, -hw * 0.3));
    if (st === 'bob') out.back.push(lockPts(P(-0.9, 0.2), P(-1.0, 1.2), hw * 0.95, -hw * 0.15));
    if (st === 'bun') { out.extra.push(blobAt(P(-0.74, -0.34)[0], P(-0.74, -0.34)[1], 0.46 * hw, 0.44 * hw, 14)); out.strands.push({ spiral: [P(-0.74, -0.34)[0], P(-0.74, -0.34)[1], 0.3 * hw] }); }
    if (st === 'braids') { for (let i = 0; i < 5; i++) { const t = i / 4; out.back.push({ poly: blobAt(X - hw * (1.0 + 0.12 * t), y(0.7 + t * 1.2), hw * 0.2, hw * 0.25, 8), pts: [], w: 0 }); } }
    if (st === 'ponytail') { out.back.push(lockPts(P(-0.9, 0.05), P(-1.9, 1.5), hw * 0.8, hw * 0.55)); out.strands.push({ tie: [P(-0.95, 0.06)[0], P(-0.95, 0.06)[1], hw * 0.3] }); }
    return out; }
  /* front */
  const hl = { short: 0.19, crop: 0.13, shaggy: 0.2, curly: 0.2, long: 0.19, bob: 0.19, bun: 0.17, braids: 0.19, ponytail: 0.19, bald: 0.19 }[st] || 0.19;
  if (st === 'bald') { for (const q of [-1, 1]) lk([q * 1.0, 0.28], [q * 1.04, 0.66], 0.42); return out; }
  out.cap = capFront(st === 'crop' ? 1.04 : st === 'curly' ? 1.14 : st === 'shaggy' ? 1.16 : 1.1, hl);
  out.ring = { a: [-0.7, 0.0], b: [0.7, 0.0], dip: -0.14, th: 0.2 };
  const fr = { short: [[[-0.04, 0.0], [-0.86, 0.4], 0.62, -0.24], [[0.02, 0.0], [0.46, 0.37], 0.6, 0.3], [[0.34, 0.03], [0.98, 0.52], 0.5, 0.45]],
    crop: [[[-0.55, 0.0], [-0.74, 0.25], 0.46, 0], [[-0.2, 0.0], [-0.26, 0.27], 0.46, 0], [[0.15, 0.0], [0.22, 0.28], 0.46, 0], [[0.55, 0.01], [0.82, 0.3], 0.46, 0.1]],
    shaggy: [[[-0.5, 0.0], [-0.98, 0.46], 0.55, -0.3], [[-0.2, 0.0], [-0.5, 0.4], 0.5, -0.1], [[0.1, 0.0], [0.05, 0.46], 0.5, 0.1], [[0.3, 0.0], [0.62, 0.4], 0.5, 0.15], [[0.55, 0.02], [1.0, 0.52], 0.5, 0.3]],
    bun: [[[0.0, -0.02], [-0.92, 0.34], 0.78, -0.3], [[0.0, -0.02], [0.92, 0.34], 0.78, 0.3]] }[st] || [[[-0.04, 0.0], [-0.86, 0.4], 0.62, -0.24], [[0.02, 0.0], [0.46, 0.37], 0.6, 0.3], [[0.34, 0.03], [0.98, 0.52], 0.5, 0.45]];
  for (const [a, b, w, bd] of fr) lk(a, b, w, bd);
  if (st === 'short' || st === 'shaggy') for (const q of [-1, 1]) if (q < 0 || st === 'shaggy') lk([q * 0.98, 0.3], [q * 1.02, 0.64], 0.38);
  if (st === 'bun') for (const q of [-1, 1]) lk([q * 1.0, 0.3], [q * 1.0, 0.6], 0.3);
  if (st === 'shaggy') { lk([-1.0, 0.25], [-1.14, 0.84], 0.5, -0.2); lk([1.0, 0.25], [1.14, 0.84], 0.5, 0.2); }
  if (st === 'curly') for (const [cx, cy, r] of [[-0.78, -0.06, 0.4], [-0.3, -0.18, 0.42], [0.3, -0.18, 0.42], [0.78, -0.06, 0.4], [-1.04, 0.24, 0.36], [1.04, 0.24, 0.36], [-1.06, 0.55, 0.34], [1.06, 0.55, 0.34], [-0.6, 0.18, 0.3], [-0.1, 0.15, 0.28], [0.4, 0.17, 0.3], [0.82, 0.22, 0.28]]) out.extra.push(blobAt(P(cx, cy)[0], P(cx, cy)[1], r * hw, r * hw));
  if (st === 'long') for (const q of [-1, 1]) { lk([q * 1.0, 0.25], [q * 1.1, 1.62], 0.58, -q * 0.42); lk([q * 0.96, 0.3], [q * 1.02, 1.2], 0.34, -q * 0.2); }
  if (st === 'bob') for (const q of [-1, 1]) lk([q * 1.02, 0.25], [q * 0.92, 1.0], 0.62, -q * 0.26);
  if (st === 'long') out.back.push({ poly: spl(sym([[0, 0.0], [0.7, 0.05], [1.12, 0.3], [1.16, 0.9], [1.14, 1.5], [1.1, 2.0], [0.7, 2.1], [0, 2.05]].map(p => P(p[0], p[1])), X), true, 3) });
  if (st === 'bob') out.back.push({ poly: spl(sym([[0, 0.0], [0.7, 0.05], [1.12, 0.3], [1.16, 0.8], [1.1, 1.1], [0.7, 1.2], [0, 1.18]].map(p => P(p[0], p[1])), X), true, 3) });
  if (st === 'bun') { out.extra.push(blobAt(X, y(-0.44), 0.46 * hw, 0.44 * hw, 14)); out.strands.push({ spiral: [X, y(-0.44), 0.3 * hw] }); }
  if (st === 'braids') for (const q of [-1, 1]) for (let i = 0; i < 5; i++) { const t = i / 4; out.extra.push(blobAt(X + q * hw * (1.04 + 0.1 * Math.sin(t * 2)), y(0.62 + t * 1.2), hw * 0.21, hw * 0.26, 8)); }
  if (st === 'ponytail') { out.back.push(lockPts(P(0.8, 0.04), P(1.45, 1.7), hw * 0.95, hw * 0.5)); out.strands.push({ tie: [P(0.82, 0.05)[0], P(0.82, 0.05)[1], hw * 0.3] }); }
  return out; }
function hairL(kit, dir, style, part) { const [c, g]: any = frame(), K = KD[kit]; if (kit === 'infant' && style !== 'bald') style = 'crop'; const H = hairStyle(kit, dir, style), h = hd(kit, dir);
  const D1 = (shapes, o = {}) => D(g, shapes, HAIRP, Object.assign({ smooth: false, ow: 0.28, os: 0.26, iw: 0.1, hs: 0.5, lx: -0.4, ly: -0.55, rim: 0.28 }, o));
  if (part === 'back') { if (dir === 'back') return c; for (const l of H.back) D1([l.poly], { hs: 0.4 }); return c; }
  /* from behind everything counts as "front" (the hair falls over the back) */
  const mass = [...(H.cap ? [H.cap] : []), ...H.extra.filter(e => e.length > 12 && dir !== 'back' || dir === 'back')];
  if (dir === 'back') for (const l of H.back) D1([l.poly], { hs: 0.4 });
  const capShapes = H.cap ? [H.cap] : [];
  if (style === 'curly') { if (H.cap) D1(capShapes, { hs: 0.4 }); for (const e of H.extra) D1([e], { hs: 0.45, ow: 0.17, os: 0.14, iw: 0.08 }); }
  else { for (const e of H.extra) D1([e], { hs: dir === 'back' && e.length > 12 ? 0.02 : 0.55 });
    if (H.cap) D1(capShapes, { hs: dir === 'back' ? 0.02 : 0.3 }); }
  /* the glossy band across the crown */
  if (H.ring && H.cap) { const r = H.ring, A = h.P(r.a[0], r.a[1]), B = h.P(r.b[0], r.b[1]), dp = r.dip * h.hh; g.save(); g.beginPath(); trace(g, H.cap, false); g.clip(); g.strokeStyle = 'rgba(196,196,216,.95)'; g.lineWidth = r.th * h.hh * 0.62; g.lineCap = 'round'; g.beginPath(); g.moveTo(A[0], A[1]); g.quadraticCurveTo((A[0] + B[0]) / 2, A[1] + dp * 1.9, B[0], B[1]); g.stroke();
    g.strokeStyle = 'rgba(40,36,90,.22)'; g.lineWidth = r.th * h.hh * 0.5; g.beginPath(); g.moveTo(A[0], A[1] + r.th * h.hh * 1.2); g.quadraticCurveTo((A[0] + B[0]) / 2, A[1] + dp * 1.9 + r.th * h.hh * 1.2, B[0], B[1] + r.th * h.hh * 1.2); g.stroke(); g.restore(); }
  /* locks laid over the cap */
  if (!(dir === 'back' && style !== 'bald')) for (const l of H.locks) { D1([l.poly], { hs: 0.5, ow: 0.17, os: 0.14, iw: 0.08 });
    g.save(); g.beginPath(); trace(g, l.poly, false); g.clip(); g.strokeStyle = 'rgba(70,62,140,.28)'; g.lineWidth = 0.11; g.lineCap = 'round';
    for (const q of [-0.28, 0.2]) { g.beginPath(); l.pts.forEach((p, i) => { const nx = (l.pts[Math.min(l.pts.length - 1, i + 1)][1] - l.pts[Math.max(0, i - 1)][1]), ny = -(l.pts[Math.min(l.pts.length - 1, i + 1)][0] - l.pts[Math.max(0, i - 1)][0]), nl = Math.hypot(nx, ny) || 1, wq = Math.max(0, l.w * Math.pow(1 - i / 6, 0.78)) * q * 1.6; const x = p[0] + nx / nl * wq, yy = p[1] + ny / nl * wq; i ? g.lineTo(x, yy) : g.moveTo(x, yy); }); g.stroke(); } g.restore(); }
  else for (const l of H.locks) D1([l.poly], { hs: 0.5 });
  for (const sx of H.strands) { if (sx.spiral) { g.strokeStyle = 'rgba(70,62,140,.3)'; g.lineWidth = 0.11; g.beginPath(); for (let i = 0; i < 24; i++) { const a = i * 0.55, rr = sx.spiral[2] * (i / 24); const x = sx.spiral[0] + Math.cos(a) * rr, y2 = sx.spiral[1] + Math.sin(a) * rr; i ? g.lineTo(x, y2) : g.moveTo(x, y2); } g.stroke(); }
    if (sx.tie) { D(g, [ellipsePts(sx.tie[0], sx.tie[1], sx.tie[2], sx.tie[2] * 0.8, 10)], pal('#c04a4a', '#f08a7a', null), { smooth: false, ow: 0.18, os: 0.14, iw: 0.07 }); } }
  if (dir === 'back' && H.cap && style !== 'bald') { g.strokeStyle = 'rgba(70,62,140,.3)'; g.lineWidth = 0.11; g.lineCap = 'round'; for (const q of [-0.5, 0, 0.5]) { g.beginPath(); const A = h.P(q * 0.9, 0.05), B = h.P(q * 1.0, 0.8); g.moveTo(A[0], A[1]); g.quadraticCurveTo(A[0] + q * 0.3, (A[1] + B[1]) / 2, B[0], B[1]); g.stroke(); } }
  if (dir === 'back' && (style === 'long' || style === 'bob')) { g.strokeStyle = 'rgba(70,62,140,.26)'; g.lineWidth = 0.11; g.lineCap = 'round'; const L = style === 'long' ? 2.0 : 1.1; for (const q of [-0.84, -0.46, 0.46, 0.84]) { g.beginPath(); const A = h.P(q, 0.92), B = h.P(q * 1.1, L - 0.08 * Math.abs(q)); g.moveTo(A[0], A[1]); g.quadraticCurveTo(A[0] + q * 0.5, (A[1] + B[1]) / 2, B[0], B[1]); g.stroke(); } }
  return c; }
function greyL(kit, dir) { /* streaks of grey that arrive at 45 (fixed colour) */
  const [c, g]: any = frame(), h = hd(kit, dir); if (dir === 'back') return c;
  g.fillStyle = 'rgba(232,230,238,.92)'; for (const [a, b] of dir === 'side' ? [[[0.25, -0.12], [0.6, 0.2]], [[-0.2, -0.16], [0.1, 0.05]]] : [[[-0.2, -0.16], [-0.34, 0.2]], [[0.28, -0.14], [0.46, 0.14]], [[-0.7, 0.02], [-0.8, 0.22]]]) { const l = lockPts(h.P(a[0], a[1]), h.P(b[0], b[1]), h.hw * 0.2, 0); g.beginPath(); trace(g, l.poly, false); g.fill(); }
  return c; }

/* ---- beards (tint with the hair colour) ---- */
function beardL(kit, dir, style) { const [c, g]: any = frame(), h = hd(kit, dir), { hw, hh, X } = h, P = h.P; if (dir === 'back') return c; const side = dir === 'side';
  const B = (shapes, o?) => D(g, shapes, HAIRP, Object.assign({ smooth: false, ow: 0.24, os: 0.2, iw: 0.09, hs: 0.5, lx: -0.3, ly: -0.4, rim: 0.22 }, o || {}));
  const must = side ? spl([P(0.34, 0.78), P(0.78, 0.76), P(0.93, 0.8), P(0.84, 0.85), P(0.4, 0.84)], true, 4) : spl(sym([[0, 0.775], [0.3, 0.74], [0.62, 0.78], [0.66, 0.84], [0.3, 0.83], [0, 0.82]].map(p => P(p[0], p[1])), X), true, 4);
  if (style === 'full') { const jaw = side ? spl([P(-0.4, 0.56), P(0.1, 0.72), P(0.7, 0.8), P(0.96, 0.9), P(0.82, 1.06), P(0.55, 1.16), P(0.3, 1.1), P(0.1, 1.17), P(-0.2, 1.04), P(-0.45, 0.94)], true, 4) : spl([P(-0.98, 0.46), P(-0.88, 0.66), P(-0.6, 0.8), P(-0.34, 0.9), P(-0.16, 0.88), P(0, 0.9), P(0.16, 0.88), P(0.34, 0.9), P(0.6, 0.8), P(0.88, 0.66), P(0.98, 0.46), P(1.0, 0.8), P(0.8, 1.04), P(0.52, 1.14), P(0.36, 1.1), P(0.16, 1.2), P(0, 1.14), P(-0.16, 1.2), P(-0.36, 1.1), P(-0.52, 1.14), P(-0.8, 1.04), P(-1.0, 0.8)], true, 3);
    B([jaw]); g.save(); g.beginPath(); trace(g, jaw, true); g.clip(); g.strokeStyle = 'rgba(40,30,44,.32)'; g.lineWidth = 0.1; g.lineCap = 'round';
    for (const q of (side ? [0.2, 0.4, 0.6, 0.8] : [-0.78, -0.55, -0.3, 0.3, 0.55, 0.78])) { const p0 = P(q, 0.86), p1 = P(q * 1.06, 1.12); g.beginPath(); g.moveTo(p0[0], p0[1]); g.quadraticCurveTo((p0[0] + p1[0]) / 2 + 0.15, (p0[1] + p1[1]) / 2, p1[0], p1[1]); g.stroke(); } g.restore();
    B([must], { ow: 0.2 });
    if (!side) { const m0 = P(-0.2, 0.9), m1 = P(0.2, 0.9); g.strokeStyle = 'rgba(30,18,22,.7)'; g.lineWidth = 0.16; g.lineCap = 'round'; g.beginPath(); g.moveTo(m0[0], m0[1]); g.quadraticCurveTo((m0[0] + m1[0]) / 2, m0[1] + 0.22, m1[0], m1[1]); g.stroke(); } }
  else if (style === 'mustache') B([must], { ow: 0.22 });
  else if (style === 'goatee') { B([side ? spl([P(0.6, 0.9), P(0.94, 0.92), P(0.9, 1.16), P(0.66, 1.18)], true, 3) : spl([P(-0.3, 0.9), P(0.3, 0.9), P(0.26, 1.2), P(0, 1.28), P(-0.26, 1.2)], true, 3)]); B([must], { ow: 0.2 }); }
  else { g.save(); g.beginPath(); trace(g, headOutline(h), false); g.clip(); g.fillStyle = 'rgba(80,66,84,.36)'; g.beginPath(); trace(g, side ? [P(0.1, 0.74), P(1.0, 0.7), P(1.0, 1.05), P(0.1, 1.05)] : [P(-0.95, 0.66), P(-0.7, 0.76), P(0.7, 0.76), P(0.95, 0.66), P(0.9, 1.05), P(-0.9, 1.05)], true); g.fill(); g.restore(); }
  return c; }

/* ---- hats: tint (hat colour), hair (the bun), fixed (own colour) ---- */
const HATFIX = new Set(['toque', 'colander']);
function hatL(kit, dir, hat, part) { const [c, g]: any = frame(), h = hd(kit, dir), { hw, hh, X, side } = h, P = h.P, y = h.y, back = dir === 'back', W = (v) => v * hw;
  const T = (shapes, o?) => D(g, shapes, GP, Object.assign({ smooth: false, ow: 0.3, os: 0.26, iw: 0.1, hs: 0.4, lx: -0.45, ly: -0.6, rim: 0.3 }, o || {}));
  const Fx = (shapes, col, hi, o?) => D(g, shapes, pal(col, hi, null), Object.assign({ smooth: false, ow: 0.28, os: 0.24, iw: 0.1, hs: 0.3 }, o || {}));
  const dome = (vTop, vBot, wv, back_ = 0.0) => side ? spl([[0.96 * wv, vBot], [0.9 * wv, vTop + 0.22], [0.5, vTop + 0.02], [-0.2, vTop - 0.02], [-0.8, vTop + 0.12], [-1.14 * wv, vTop + 0.4], [-1.2 * wv, vBot - 0.05], [-0.4, vBot + 0.02], [0.4, vBot + 0.01]].map(p => P(p[0], p[1])), true, 4) : spl(sym([[0, vTop - 0.02], [0.5, vTop + 0.0], [0.92, vTop + 0.1], [1.14 * wv, vTop + 0.34], [1.18 * wv, vBot], [0.6, vBot + 0.03], [0, vBot + 0.04]].map(p => P(p[0], p[1])), X), true, 4);
  const brim = (rx, v, ry = 0.38) => side ? ellipsePts(P(0.15, v)[0], P(0.15, v)[1], rx * hw, ry * hw, 22) : ellipsePts(X, y(v), rx * hw, ry * hw, 22);
  const band = (v, hgt = 0.1) => { g.save(); g.beginPath(); trace(g, g.__dome, false); g.clip(); g.fillStyle = 'rgba(52,42,100,.3)'; g.fillRect(P(-1.4, v)[0], y(v), hw * 2.8, hh * hgt); g.restore(); };
  const stitch = d => { g.save(); g.beginPath(); trace(g, d, false); g.clip(); g.strokeStyle = 'rgba(52,42,100,.28)'; g.lineWidth = 0.1; g.lineCap = 'round'; for (let i = -2; i <= 2; i++) { g.beginPath(); const A = P(i * 0.26, -0.28), B = P(i * 0.44, 0.2); g.moveTo(A[0], A[1]); g.quadraticCurveTo((A[0] + B[0]) / 2 + i * 0.12, (A[1] + B[1]) / 2, B[0], B[1]); g.stroke(); } g.restore(); };
  if (part === 'tint') switch (hat) {
    case 'cap': { const d = dome(-0.3, 0.2, 1.0); T([d]); g.__dome = d; band(0.12, 0.08); if (side) T([spl([P(0.7, 0.14), P(1.35, 0.2), P(1.38, 0.28), P(0.9, 0.28), P(0.6, 0.22)], true, 3)], { hs: 0.3 }); else if (!back) T([spl(sym([[0, 0.2], [0.55, 0.19], [0.9, 0.2], [0.95, 0.27], [0.5, 0.3], [0, 0.3]].map(p => P(p[0], p[1])), X), true, 3)], { hs: 0.3 }); stitch(d); break; }
    case 'straw': { const b = brim(2.0, 0.08, 0.5); T([b], { hs: 0.3 }); const d = dome(-0.62, 0.1, 0.9); T([d]); g.__dome = d; band(0.0, 0.1); break; }
    case 'helmet': { const d = side ? spl([[0.98, 0.36], [0.92, -0.08], [0.5, -0.32], [-0.2, -0.4], [-0.85, -0.3], [-1.22, 0.1], [-1.28, 0.55], [-0.7, 0.6], [-0.3, 0.5], [0.3, 0.38]].map(p => P(p[0], p[1])), true, 4) : dome(-0.34, 0.4, 1.04); T([d], { hs: 0.45 }); g.__dome = d; band(0.34, 0.1); break; }
    case 'beanie': { const d = dome(-0.4, 0.32, 1.04); T([d]); g.__dome = d; const cu = side ? spl([P(0.98, 0.34), P(0.98, 0.14), P(-0.2, 0.08), P(-1.18, 0.12), P(-1.22, 0.34), P(-0.2, 0.4)], true, 3) : spl(sym([[0, 0.08], [0.7, 0.12], [1.16, 0.2], [1.2, 0.34], [0.7, 0.38], [0, 0.38]].map(p => P(p[0], p[1])), X), true, 3); T([cu], { hs: 0.3 }); stitch(d); break; }
    case 'bonnet': { const d = side ? spl([[0.96, 0.2], [0.8, -0.2], [0.4, -0.34], [-0.2, -0.38], [-0.9, -0.26], [-1.28, 0.16], [-1.32, 0.72], [-1.1, 1.0], [-0.7, 0.96], [-0.42, 0.52], [-0.14, 0.3], [0.5, 0.24]].map(p => P(p[0], p[1])), true, 4) : spl(sym([[0, -0.32], [0.5, -0.3], [0.94, -0.18], [1.2, 0.2], [1.24, 0.6], [1.1, 0.92], [0.95, 0.88], [0.92, 0.48], [0.7, 0.2], [0, 0.15]].map(p => P(p[0], p[1])), X), true, 4); T([d]); g.__dome = d; if (!side && !back) T([spl(sym([[0, 0.12], [0.6, 0.14], [0.94, 0.28], [0.9, 0.34], [0.5, 0.24], [0, 0.22]].map(p => P(p[0], p[1])), X), true, 3)], { hs: 0.2 }); if (side) T([spl([P(1.0, 0.12), P(1.3, 0.2), P(1.26, 0.36), P(0.9, 0.3)], true, 3)], { hs: 0.2 }); break; }
    case 'bun': { const d = dome(-0.1, 0.1, 1.02); T([d]); g.__dome = d; break; }
    case 'scarf': { const d = dome(-0.3, 0.3, 1.06); T([d]); g.__dome = d; const knot = side ? [P(-1.15, 0.25), P(-1.5, 0.15), P(-1.65, 0.5), P(-1.3, 0.55)] : [P(0.75, 0.08), P(1.35, -0.04), P(1.45, 0.34), P(0.95, 0.3)]; T([spl(knot, true, 3)], { hs: 0.3 }); band(0.18, 0.1); break; }
    case 'floppy': { const b = side ? spl([P(-1.8, 0.14), P(-0.8, 0.0), P(0.8, 0.0), P(2.0, 0.14), P(1.5, 0.3), P(0, 0.3), P(-1.4, 0.3)], true, 4) : spl(sym([[0, -0.02], [1.2, 0.02], [2.1, 0.14], [1.7, 0.3], [0.6, 0.2], [0, 0.2]].map(p => P(p[0], p[1])), X), true, 4); T([b], { hs: 0.3 }); const d = dome(-0.5, 0.06, 0.92); T([d]); g.__dome = d; band(-0.04, 0.1); break; }
    case 'feather': { const d = dome(-0.3, 0.16, 1.0); T([d]); g.__dome = d; band(0.08, 0.08); break; } }
  if (part === 'hair' && hat === 'bun') { const bx = side ? P(-0.74, -0.34) : [X, y(-0.4)]; D(g, [ellipsePts(bx[0], bx[1], 0.46 * hw, 0.44 * hw, 14)], HAIRP, { smooth: false, ow: 0.28, os: 0.26, iw: 0.1, hs: 0.5 }); }
  if (part === 'fixed') switch (hat) {
    case 'helmet': Fx([side ? spl([P(-0.7, -0.4), P(0.6, -0.44), P(0.6, -0.34), P(-0.7, -0.3)], true, 2) : spl(sym([[0, -0.52], [0.16, -0.5], [0.16, -0.18], [0, -0.16]].map(p => P(p[0], p[1])), X), true, 2)], '#b83a3a', '#e88a7a'); if (!side && !back) Fx([spl(sym([[0, 0.34], [0.2, 0.34], [0.2, 0.62], [0.12, 0.66], [0, 0.66]].map(p => P(p[0], p[1])), X), true, 2)], '#8a929a', '#dfe3e8'); break;
    case 'beanie': Fx([ellipsePts(side ? P(-0.3, -0.5)[0] : X, y(-0.5), 0.34 * hw, 0.3 * hw, 12)], '#ece6d6', '#ffffff', { smooth: true }); break;
    case 'toque': { const pl = side ? spl([P(-1.0, 0.12), P(-0.9, -0.5), P(-0.5, -1.0), P(0.2, -1.12), P(0.8, -0.9), P(1.0, -0.4), P(1.0, 0.12)], true, 4) : spl(sym([[0, -1.14], [0.55, -1.12], [1.0, -0.86], [1.12, -0.4], [1.0, 0.1], [0, 0.12]].map(p => P(p[0], p[1])), X), true, 4); Fx([pl], '#f6f3ea', '#ffffff', { hs: 0.4 });
      g.strokeStyle = 'rgba(120,110,150,.3)'; g.lineWidth = 0.11; g.lineCap = 'round'; for (const q of [-0.6, -0.2, 0.2, 0.6]) { g.beginPath(); const A = P(q, -1.0), B = P(q * 1.2, 0.08); g.moveTo(A[0], A[1]); g.quadraticCurveTo(A[0] + q * 0.4, (A[1] + B[1]) / 2, B[0], B[1]); g.stroke(); }
      Fx([side ? spl([P(-1.12, 0.06), P(1.08, 0.06), P(1.08, 0.3), P(-1.12, 0.3)], true, 2) : spl(sym([[0, 0.04], [1.18, 0.04], [1.2, 0.3], [0, 0.3]].map(p => P(p[0], p[1])), X), true, 2)], '#f1eee4', '#ffffff'); break; }
    case 'colander': { const bowl = side ? spl([P(-1.2, 0.18), P(-1.1, -0.35), P(-0.3, -0.7), P(0.5, -0.62), P(1.1, -0.2), P(1.2, 0.18)], true, 4) : spl(sym([[0, -0.74], [0.7, -0.62], [1.2, -0.28], [1.26, 0.16], [0, 0.18]].map(p => P(p[0], p[1])), X), true, 4); Fx([bowl], '#c9ced4', '#f2f4f6', { hs: 0.4 });
      Fx([side ? spl([P(-1.5, 0.12), P(1.5, 0.12), P(1.5, 0.28), P(-1.5, 0.28)], true, 2) : spl(sym([[0, 0.1], [1.6, 0.1], [1.6, 0.28], [0, 0.28]].map(p => P(p[0], p[1])), X), true, 2)], '#a9b0b8', '#dde2e6'); if (!back) for (const [dx, dy] of [[-0.55, -0.4], [0, -0.52], [0.55, -0.4], [-0.3, -0.2], [0.3, -0.2], [-0.8, -0.1], [0.8, -0.1]]) { const q = P(dx, dy); dab(g, q[0], q[1], 0.26, 0.26, 0, '#5e656c'); } break; }
    case 'feather': { const A = side ? P(-0.5, -0.2) : P(0.7, -0.16), B = side ? P(-1.2, -1.0) : P(1.25, -1.1); const l = lockPts(A, B, hw * 0.55, hw * 0.4); Fx([l.poly], '#d8c24a', '#fbf0a0', { smooth: false }); g.strokeStyle = 'rgba(120,100,30,.6)'; g.lineWidth = 0.1; g.beginPath(); l.pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); break; } }
  return c; }
/* wedding finery and flowers, in colour */
function dressL(kit, dir, what) { const [c, g]: any = frame(), h = hd(kit, dir), { K, hw, hh, X, P } = h, { sy } = h.g, tl = K.tl;   /* (tl lives on the kit, not on the geometry: the buttonhole used to come out blank) */
  if (what === 'bride') { const back = dir === 'back', veil = dir === 'side' ? spl([P(-1.15, -0.1), P(0.6, -0.34), P(1.0, -0.18), P(0.4, 0.2), P(-1.4, 2.4), P(-1.7, 1.2)], true, 4) : dir === 'front' ? spl(sym([[0, -0.36], [0.7, -0.3], [1.2, 0.1], [1.4, 1.2], [1.5, 2.1], [0.62, 2.2], [0.5, 1.55], [0.58, 1.1], [0.92, 0.82], [0.97, 0.47], [0.74, 0.14], [0, 0.05]].map(p => P(p[0], p[1])), X), true, 4)   /* the veil frames the face: a hood open at the front */
      : spl(sym([[0, -0.34], [0.7, -0.28], [1.16, 0.12], [1.18, 0.55], [1.02, 0.95], [0.94, 1.5], [0.96, 2.05], [0.98, 2.3], [0.62, 2.38], [0.3, 2.3], [0, 2.4]].map(p => P(p[0], p[1])), X), true, 4);
    if (back) { /* from behind the veil is one sheet: sheer over the hair on the crown, then thickening as it falls down the back, narrower than the shoulders so the arms stay outside it */
      const [c2, g2]: any = frame(); D(g2, [veil], pal('#fbf8f2', '#ffffff', null, 0.5), { smooth: false, ow: 0.14, os: 0.12, iw: 0.08, hs: 0.3 });
      const y0 = P(0, 0.62)[1], y1 = P(0, 1.3)[1], gr = g2.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, 'rgba(0,0,0,.46)'); gr.addColorStop(1, 'rgba(0,0,0,.93)');
      g2.globalCompositeOperation = 'destination-in'; g2.fillStyle = gr; g2.fillRect(0, 0, 40, 40);
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(c2, 0, 0); g.restore();
      for (let i = 0; i < 5; i++) { const q = P(-0.86 + i * 0.43, -0.12 + 0.08 * Math.abs(i - 2)); dab(g, q[0], q[1], 0.42, 0.4, 0, INK); dab(g, q[0], q[1], 0.32, 0.3, 0, ['#e88aa0', '#f4d36a', '#e88aa0', '#9ad08a', '#e88aa0'][i]); dab(g, q[0] - 0.08, q[1] - 0.08, 0.1, 0.1, 0, '#fff'); } }
    else { g.save(); g.globalAlpha = 0.82; D(g, [veil], pal('#fbf8f2', '#ffffff', null, 0.5), { smooth: false, ow: 0.16, os: 0.12, iw: 0.08, hs: 0.3 }); g.restore();
      for (let i = 0; i < 5; i++) { const q = dir === 'side' ? P(-0.5 + i * 0.4, -0.12 + 0.02 * Math.abs(i - 2)) : P(-0.9 + i * 0.45, -0.1 + 0.07 * Math.abs(i - 2)); dab(g, q[0], q[1], 0.42, 0.4, 0, INK); dab(g, q[0], q[1], 0.32, 0.3, 0, ['#e88aa0', '#f4d36a', '#e88aa0', '#9ad08a', '#e88aa0'][i]); dab(g, q[0] - 0.08, q[1] - 0.08, 0.1, 0.1, 0, '#fff'); } } }
  else if (what === 'groom' && dir !== 'back') { const x = X + K.sh * 0.42, y = sy + tl * 0.22; dab(g, x, y, 0.62, 0.62, 0, INK); dab(g, x, y, 0.48, 0.48, 0, '#d84a5a'); dab(g, x - 0.12, y - 0.14, 0.14, 0.14, 0, '#ffd0d6'); dab(g, x + 0.1, y + 0.9, 0.2, 0.5, 0.3, '#4a8f4a'); }
  return c; }

/* ================= paper dolls: tools, props, sleepers, the composer ================= */
const GREYH = '#e4e2dc';
const WOODP = pal('#7a5232', '#e8b47a', '#a67a4c'), STEEL = pal('#a9b0ba', '#f2f6fb', '#e2e8f0'), TIRON = pal('#767d88', '#cfd5de', '#a8afba');
/* paints into the current game-px space; (hx, hy) is the grip, ang the direction the tool points */
function toolDraw(g, tool, hx, hy, ang) { const c = Math.cos(ang), s = Math.sin(ang), at = (u, v) => [hx + u * c - v * s, hy + u * s + v * c], pl = pts => pts.map(p => at(p[0], p[1]));
  const haft = (a, b, w) => { const A = at(a, 0), B = at(b, 0); D(g, [tube([A, B], [w, w * 0.88], { seg: 1 })], WOODP, { smooth: false, ow: 0.2, os: 0.16, iw: 0.07, lx: -0.18, ly: -0.26, rim: 0.14, hs: 0.4 });
    g.strokeStyle = 'rgba(60,34,20,.35)'; g.lineWidth = 0.08; g.lineCap = 'round'; for (const q of [-0.2, 0.15]) { const P1 = at(a + 0.8, q * w), P2 = at(b - 0.5, q * w * 0.9); g.beginPath(); g.moveTo(P1[0], P1[1]); g.lineTo(P2[0], P2[1]); g.stroke(); } };
  const metal = (pts, P, o = {}) => D(g, [pl(pts)], P, Object.assign({ smooth: false, ow: 0.22, os: 0.18, iw: 0.08, lx: -0.25, ly: -0.3, rim: 0.14, hs: 0.45 }, o));
  switch (tool) {
    case 'axe': haft(-1.4, 11.2, 0.95); metal([[8.6, -0.55], [9.2, -1.5], [10.2, -3.9], [11.6, -4.7], [12.6, -3.4], [12.9, 0.6], [12.3, 3.6], [11.1, 3.3], [10.0, 1.6], [8.6, 0.6]], STEEL); { const e1 = at(12.4, -3.2), e2 = at(12.7, 3.2); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 0.18; g.lineCap = 'round'; g.beginPath(); g.moveTo(e1[0], e1[1]); g.lineTo(e2[0], e2[1]); g.stroke(); } break;
    case 'hammer': haft(-1.4, 10.6, 0.95); metal([[8.9, -2.9], [12.9, -3.1], [13.1, 3.0], [8.9, 3.0]], TIRON, { ow: 0.24 }); metal([[8.2, -1.0], [9.0, -1.0], [9.0, 1.0], [8.2, 1.0]], TIRON, { ow: 0.18 }); break;
    case 'hoe': haft(-1.4, 12.8, 0.9); metal([[11.6, -0.8], [13.6, -0.9], [14.9, 0.2], [14.6, 4.6], [12.9, 4.4], [12.9, 1.2], [11.6, 0.8]], TIRON); break;
    case 'rod': { const A = at(-2.5, 0), B = at(16.5, -0.5), L = at(5, -0.1); g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 0.95; g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke(); g.strokeStyle = '#8a6a3c'; g.lineWidth = 0.55; g.stroke(); g.strokeStyle = '#d2a868'; g.lineWidth = 0.15; g.beginPath(); g.moveTo(A[0] - 0.1, A[1] - 0.14); g.lineTo(B[0] - 0.1, B[1] - 0.1); g.stroke();
      D(g, [ellipsePts(L[0], L[1] + 0.4, 0.75, 0.75, 10)], TIRON, { smooth: false, ow: 0.16, os: 0.12, iw: 0.07 });
      const T2 = [B[0] + 1.0, B[1] + 6.2]; g.strokeStyle = 'rgba(245,245,240,.85)'; g.lineWidth = 0.1; g.beginPath(); g.moveTo(B[0], B[1]); g.quadraticCurveTo(B[0] + 1.0, B[1] + 2.8, T2[0], T2[1]); g.stroke();
      dab(g, T2[0], T2[1] + 0.3, 0.72, 0.72, 0, INK); dab(g, T2[0], T2[1] + 0.3, 0.54, 0.54, 0, '#f6f2ea'); g.fillStyle = '#d94a3a'; g.beginPath(); g.ellipse(T2[0], T2[1] + 0.06, 0.54, 0.42, 0, Math.PI, TAU); g.fill(); dab(g, T2[0] - 0.2, T2[1] - 0.05, 0.14, 0.12, 0, '#fff'); break; }
    case 'spear': haft(-3, 14, 0.8); metal([[14, 0], [14.6, -1.1], [17.6, 0], [14.6, 1.1]], STEEL); break; } }

/* ---- props, painted straight into game space ---- */
function rr_(x, y, w, h, r = 0.7) { return spl([[x + r, y], [x + w - r, y], [x + w, y + r], [x + w, y + h - r], [x + w - r, y + h], [x + r, y + h], [x, y + h - r], [x, y + r]], true, 2); }
function propDraw(g, what, x, y, u = 0, ang = 0) { const sw = Math.sin(TAU * u), P = (px, py, rx, ry) => ellipsePts(px, py, rx, ry, 16);
  const O = (shapes, Pal, o = {}) => D(g, shapes, Pal, Object.assign({ smooth: false, ow: 0.22, os: 0.18, iw: 0.08, lx: -0.25, ly: -0.3, rim: 0.14, hs: 0.45 }, o));
  switch (what) {
    case 'cane': { const A = [x, y], B = [x + 0.7, y + 7.6]; g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 1.0; g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke(); g.strokeStyle = '#8a6440'; g.lineWidth = 0.6; g.stroke(); O([P(A[0] - 0.4, A[1] - 0.3, 0.8, 0.7)], WOODP); break; }
    case 'dough': O([spl([[x - 3.0, y + 0.2], [x - 2.2, y - 0.9], [x, y - 1.2], [x + 2.2, y - 0.9], [x + 3.0, y + 0.2], [x + 2.0, y + 1.0], [x - 2.0, y + 1.0]], true, 4)], pal('#f6efe0', '#ffffff', null, 0.6), { hs: 0.3 }); g.strokeStyle = 'rgba(170,140,90,.5)'; g.lineWidth = 0.1; g.beginPath(); g.moveTo(x - 1.6 + sw * 0.4, y - 0.3); g.quadraticCurveTo(x, y + 0.3, x + 1.6 + sw * 0.4, y - 0.3); g.stroke(); break;
    case 'rag': O([spl([[x - 0.4, y - 1.2], [x + 1.6, y - 1.4], [x + 2.2, y + 1.6], [x + 0.4, y + 2.4], [x - 1.2, y + 1.0]], true, 3)], pal('#e6dcc2', '#ffffff', null, 0.6), { hs: 0.3 }); g.fillStyle = '#e0a93f'; g.fillRect(x - 0.3, y - 1.1, 2.0, 0.5); break;
    case 'shuttle': { const A = [x - 1.9, y], B = [x + 1.9, y + 0.2]; O([tube([A, B], [0.9, 0.9], { seg: 1 })], pal('#d8b04e', '#fbe796', null, 0.6), { ow: 0.18 }); g.strokeStyle = '#c0504a'; g.lineWidth = 0.14; g.beginPath(); g.moveTo(x - 1.2, y - 0.1); g.lineTo(x + 1.0, y + 0.1); g.stroke(); break; }
    case 'plate': dab(g, x, y + 0.2, 3.7, 1.9, 0, INK); dab(g, x, y + 0.1, 3.4, 1.65, 0, '#f0eadb'); dab(g, x - 0.3, y + 0.1, 2.2, 1.0, 0, '#e2dac6'); dab(g, x - 0.9, y - 0.1, 0.95, 0.55, 0, '#c98a4a'); dab(g, x + 0.9, y + 0.3, 0.8, 0.5, 0, '#7aa34a'); dab(g, x - 1.2, y - 0.3, 0.3, 0.16, 0, '#fff'); break;
    case 'loaf': O([spl([[x - 2.0, y + 0.3], [x - 1.6, y - 1.0], [x, y - 1.5], [x + 1.6, y - 1.0], [x + 2.0, y + 0.3], [x + 1.2, y + 1.1], [x - 1.2, y + 1.1]], true, 4)], pal('#d79a46', '#f6c878', '#e9b062'), { hs: 0.4 }); g.strokeStyle = 'rgba(110,60,20,.5)'; g.lineWidth = 0.12; g.lineCap = 'round'; for (const q of [-0.9, 0, 0.9]) { g.beginPath(); g.moveTo(x + q - 0.2, y - 0.9); g.lineTo(x + q + 0.2, y + 0.1); g.stroke(); } break;
    case 'lute': { const c = Math.cos(ang), s = Math.sin(ang), at = (u2, v) => [x + u2 * c - v * s, y + u2 * s + v * c], pl = pts => pts.map(p => at(p[0], p[1]));
      const nk = [at(1.6, 0), at(8.4, 0)]; g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 1.25; g.beginPath(); g.moveTo(nk[0][0], nk[0][1]); g.lineTo(nk[1][0], nk[1][1]); g.stroke(); g.strokeStyle = '#5a3a22'; g.lineWidth = 0.8; g.stroke();
      D(g, [pl([[8.0, -0.9], [9.8, -1.0], [10.2, 0.9], [8.2, 1.1]])], pal('#5a3a22', '#9a6a3c', null), { smooth: false, ow: 0.18, os: 0.14, iw: 0.07 });
      D(g, [spl(pl([[-3.4, 0], [-2.6, -2.0], [-0.6, -2.7], [1.8, -1.9], [2.2, 0], [1.8, 1.9], [-0.6, 2.7], [-2.6, 2.0]]), true, 3)], pal('#b4763c', '#efb87c', '#d29158'), { smooth: false, ow: 0.24, os: 0.2, iw: 0.09 });
      const hole = at(-0.4, 0); dab(g, hole[0], hole[1], 0.8, 0.8, 0, '#2a1810'); g.strokeStyle = 'rgba(40,24,16,.7)'; g.lineWidth = 0.1; for (let i = -1; i <= 1; i++) { const A = at(1.0, i * 0.22), B = at(8.6, i * 0.2); g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke(); } break; }
    case 'fiddle': { const c = Math.cos(ang), s = Math.sin(ang), at = (u2, v) => [x + u2 * c - v * s, y + u2 * s + v * c], pl = pts => pts.map(p => at(p[0], p[1]));
      const nk = [at(1.4, 0), at(6.6, 0)]; g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 0.95; g.beginPath(); g.moveTo(nk[0][0], nk[0][1]); g.lineTo(nk[1][0], nk[1][1]); g.stroke(); g.strokeStyle = '#2a1a10'; g.lineWidth = 0.55; g.stroke();
      D(g, [spl(pl([[-2.2, 0], [-1.8, -1.6], [-0.2, -1.5], [0.2, -0.7], [1.0, -0.8], [1.5, -1.6], [2.0, -1.0], [1.8, 0], [2.0, 1.0], [1.5, 1.6], [1.0, 0.8], [0.2, 0.7], [-0.2, 1.5], [-1.8, 1.6]]), true, 3)], pal('#a65e30', '#e9a070', '#c07a44'), { smooth: false, ow: 0.22, os: 0.18, iw: 0.08 }); break; }
    case 'wood': for (let i = 0; i < 3; i++) { const py = y - i * 3.0, px = x + (i % 2) * 0.4; O([rr_(px, py, 12, 2.7)], WOODP, { ow: 0.2 }); dab(g, px + 11.2, py + 1.35, 1.0, 1.3, 0, '#d9b07a'); g.strokeStyle = 'rgba(60,34,20,.4)'; g.lineWidth = 0.1; g.beginPath(); g.arc(px + 11.2, py + 1.35, 0.5, 0, TAU); g.stroke(); } break;
    case 'stone': for (const [dx, dy, r] of [[-2.4, 0, 3.4], [2.8, 0.2, 3.1], [0.2, -3.6, 3.0]]) O([poly(x + dx, y + dy - r * 0.5, r, 700 + dx * 3, 8, 0.85)], pal('#9aa0a6', '#eceee6', '#c6cacc'), { smooth: true, hs: 0.4 }); break; } }

/* ---- sleepers: lying in a bed tile (24 x 24), head on the pillow ---- */
function sleepL(part, top, fi = 0) { const c = mk(TP, TP), g = c.getContext('2d'); g.scale(Q, Q); const hy = top ? 8.6 : 15.0, br = 0.5 * Math.sin(TAU * fi / FR), hh = 3.7;
  const headPts = spl(sym([[0, hy - hh], [2.0, hy - hh * 0.97], [3.3, hy - hh * 0.55], [3.65, hy + 0.1], [3.1, hy + hh * 0.7], [1.6, hy + hh * 0.97], [0, hy + hh]].map(p => [12 + p[0], p[1]]), 12), true, 5);
  if (part === 'skin') { for (const s of [-1, 1]) D(g, [ellipsePts(12 + s * 3.65, hy + 0.2, 0.5, 0.82, 12)], SKINP, { smooth: false, ow: 0.18, os: 0.12, iw: 0.07 });
    D(g, [headPts], SKINP, { smooth: false, ow: 0.28, os: 0.22, iw: 0.09, hs: 0.5, lx: -0.4, ly: -0.5, rim: 0.26 });
    g.lineCap = 'round'; for (const s of [-1, 1]) { g.strokeStyle = '#2a1c18'; g.lineWidth = 0.2; g.beginPath(); g.moveTo(12 + s * 1.6 - 0.7, hy + 0.35); g.quadraticCurveTo(12 + s * 1.6, hy + 1.0, 12 + s * 1.6 + 0.7, hy + 0.35); g.stroke(); g.strokeStyle = 'rgba(66,46,34,.85)'; g.lineWidth = 0.17; g.beginPath(); g.moveTo(12 + s * 1.6 - 0.8, hy - 0.5); g.quadraticCurveTo(12 + s * 1.6, hy - 0.85, 12 + s * 1.6 + 0.8, hy - 0.45); g.stroke(); }
    g.strokeStyle = 'rgba(146,80,70,.75)'; g.lineWidth = 0.13; g.beginPath(); g.moveTo(11.85, hy + 1.65); g.quadraticCurveTo(11.8, hy + 2.0, 12.25, hy + 2.0); g.stroke(); g.strokeStyle = '#9a3f38'; g.lineWidth = 0.14; g.beginPath(); g.moveTo(11.3, hy + 2.6); g.quadraticCurveTo(12, hy + 2.95, 12.7, hy + 2.6); g.stroke();
    for (const s of [-1, 1]) { const gr = g.createRadialGradient(12 + s * 2.3, hy + 1.9, 0, 12 + s * 2.3, hy + 1.9, 1.1); gr.addColorStop(0, 'rgba(244,116,128,.5)'); gr.addColorStop(1, 'rgba(244,116,128,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(12 + s * 2.3, hy + 1.9, 1.1, 0.7, 0, 0, TAU); g.fill(); } }
  else if (part === 'hair') { const cap = top ? spl(sym([[0, hy - hh - 0.5], [2.2, hy - hh - 0.35], [3.8, hy - hh * 0.5], [4.1, hy - 0.2], [3.4, hy - 0.5], [2.4, hy - 1.7], [0, hy - 2.0]].map(p => [12 + p[0], p[1]]), 12), true, 4) : spl(sym([[0, hy - hh - 0.5], [2.4, hy - hh - 0.3], [3.9, hy - 1.4], [4.1, hy + 0.5], [3.5, hy + 2.8], [1.8, hy + 3.9], [0, hy + 4.0]].map(p => [12 + p[0], p[1]]), 12), true, 4);
    D(g, [cap], HAIRP, { smooth: false, ow: 0.28, os: 0.24, iw: 0.1, hs: 0.5, lx: -0.4, ly: -0.55, rim: 0.28 }); g.save(); g.beginPath(); trace(g, cap, false); g.clip(); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 0.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(9.2, hy - 2.6); g.quadraticCurveTo(12, hy - 3.7, 14.8, hy - 2.6); g.stroke(); g.restore(); }
  else { const by = top ? 11.9 : 3.4, bh = 9.2, x0 = 3.2, w = 17.6, y0 = by - br, h = bh + br * 2, blank = spl([[x0 + 0.9, y0], [x0 + w - 0.9, y0], [x0 + w, y0 + 0.9], [x0 + w + 0.2, y0 + h * 0.55], [x0 + w - 0.4, y0 + h], [x0 + 0.4, y0 + h], [x0 - 0.2, y0 + h * 0.55], [x0, y0 + 0.9]], true, 3);
    D(g, [blank], GP, { smooth: false, ow: 0.3, os: 0.28, iw: 0.1, hs: 0.1, lx: -0.5, ly: -0.7, rim: 0.4 }); g.save(); g.beginPath(); trace(g, blank, false); g.clip();
    const fy = top ? y0 + 0.2 : y0 + h - 2.4; g.fillStyle = 'rgba(255,255,255,.34)'; g.fillRect(x0, fy, w, 2.2); g.strokeStyle = 'rgba(60,52,130,.24)'; g.lineWidth = 0.14; g.lineCap = 'round'; const sg = top ? 1 : -1; for (const q of [0.22, 0.46, 0.72]) { g.beginPath(); g.moveTo(x0 + w * q, y0 + (top ? 0.8 : h - 0.8)); g.quadraticCurveTo(x0 + w * q + 0.6, y0 + h * 0.5, x0 + w * q - 0.3, y0 + (top ? h - 0.6 : 0.6)); g.stroke(); }
    g.strokeStyle = 'rgba(60,52,130,.3)'; g.lineWidth = 0.16; g.beginPath(); const sy2 = top ? y0 + 2.2 : y0 + h - 2.2; g.moveTo(x0 + 0.4, sy2); g.quadraticCurveTo(x0 + w * 0.5, sy2 + sg * 0.9, x0 + w - 0.4, sy2); g.stroke(); g.restore();
    const hp = top ? y0 + 2.6 : y0 + h - 2.6; D(g, [ellipsePts(12, hp, 5.6, 2.5, 18)], pal('#eeeef8', '#ffffff', null, 0.5), { smooth: false, ow: 0.18, os: 0.1, iw: 0.07, hs: 0.3 }); }
  return c; }

/* ================= tint + cache ================= */
const TINT = {};
/* skin, shirt, accent, pants and hat are multiplied by their colour; hair is laid on with 'overlay' (mid-grey = the colour itself), so its shine can go lighter than the colour */
function tint(canvas, color, key, mode: GlobalCompositeOperation = 'multiply') { const k = key + '|' + color + '|' + mode; if (TINT[k]) return TINT[k]; const c = mk(canvas.width, canvas.height), g = c.getContext('2d'); g.drawImage(canvas, 0, 0); g.globalCompositeOperation = mode; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'destination-in'; g.drawImage(canvas, 0, 0); return TINT[k] = c; }
const LC = {};
function L(key, fn) { if (LC[key]) return LC[key]; const c = fn(); if (c && c.getContext && c.width > 64) { texturize(c, 0.5, { ox: h32(key.length, key.charCodeAt(2) || 1, 3, 3), oy: h32(key.length, key.charCodeAt(4) || 1, 4, 4) }); if (!/_face_|_grey$|^sl|_(hb|hf|bd|hat_bun_h)_/.test(key)) inkLift(c, (h32(key.length, key.charCodeAt(1), key.charCodeAt(key.length - 1), 9) * 97) | 0); } return LC[key] = c; }

/* ================= poses: where the hands go ================= */
/* hands are described in body terms: f forward, l lateral (away from the midline), h height above the shoulder line; the same pose reads
   correctly from the front, the back and the side */
function handAt(dir, S, q, near, f, l, h) { if (dir === 'side') return [S[0] + f * q, S[1] - h * q];
  const dy = (dir === 'back' ? -0.42 : 0.42) * f * q; return [DCX + (near ? 1 : -1) * (l * q), S[1] - h * q + dy]; }
function workPose(kit, dir, sp, T, id) { const G = geo(kit), K = G.K, q = K.ua / 3.1, side = dir === 'side', tool = sp.tool, u = (Math.floor(T * 30) % 20) / 20, sw = Math.sin(TAU * u), cw = Math.cos(TAU * u);
  const Sn = side ? shoulderAt(kit, dir, 'near') : shoulderAt(kit, dir, 'R'), Sf = side ? shoulderAt(kit, dir, 'far') : shoulderAt(kit, dir, 'L'), arms = [], res: any = { arms, lean: 0 };
  const H = (near, f, l, h) => handAt(dir, near ? Sn : Sf, q, near, f, l, h);
  const A = (near, T2, o: any = {}) => { const S = near ? Sn : Sf, r = ik(S, T2, K.ua, K.fa, o.bend ?? (side ? 1 : (near ? -1 : 1))), da = o.da || 0; const ang = o.ang ?? (Math.atan2(r.W[1] - r.E[1], r.W[0] - r.E[0]) + da); arms.push(Object.assign(r, { far: side && !near, hand: { ang, kind: o.kind || 'rest', thumb: o.thumb ?? (side ? -1 : (near ? 1 : -1)) } })); return r; };
  const idle = near => { const S = near ? Sn : Sf; const r = fk(S, side ? 0.05 : (near ? 0.1 : -0.1), side ? 0.25 : (near ? 0.1 : -0.1), K.ua, K.fa); arms.push(Object.assign(r, { far: side && !near, hand: { ang: Math.PI / 2 - (side ? 0.25 : (near ? 0.12 : -0.12)), kind: 'rest', thumb: side ? -1 : (near ? 1 : -1) } })); };
  const swingTool = two => { const tt = (u + (id % 7) * 0.13) % 1, a = tt < 0.22 ? tt / 0.22 : 1 - (tt - 0.22) / 0.78, e = 1 - a * a;
    const hn = H(true, 0.8 + 4.2 * a, 1.0 + (side ? 0 : 0.5 * a), 3.4 * e - 2.6 * a), ang = side ? lerpA(-1.55, 0.5, a) : lerpA(-1.4, (dir === 'back' ? -0.9 : 1.2), a);
    const hand = A(true, hn, { kind: 'fist', ang: ang + 0.1, bend: side ? 1 : -1 }); res.tool = { tool, x: hand.W[0] + Math.cos(ang) * 0.9 * q, y: hand.W[1] + Math.sin(ang) * 0.9 * q, ang };
    if (two) { const sh = 2.8 * q; A(false, [res.tool.x + Math.cos(ang) * sh, res.tool.y + Math.sin(ang) * sh], { kind: 'fist', ang: ang + 0.1, bend: 1 }); } else idle(false); };
  switch (tool) {
    case 'hammer': swingTool(false); break; case 'axe': case 'hoe': swingTool(true); break;
    case 'fish': { const ang = side ? -0.34 : -0.5; const hand = A(true, H(true, 3.4, 1.6, -1.8), { kind: 'fist', ang }); res.tool = { tool: 'rod', x: hand.W[0] + Math.cos(ang) * 0.9, y: hand.W[1] + Math.sin(ang) * 0.9, ang }; A(false, [res.tool.x + Math.cos(ang) * 2.8, res.tool.y + Math.sin(ang) * 2.8], { kind: 'fist', ang, bend: 1 }); break; }
    case 'pick': { res.lean = 0.42; const r = 0.5 + 0.5 * sw; A(true, H(true, 3.6 + r * 1.6, 1.8, -3.4 - r * 1.2), { kind: 'open' }); A(false, H(false, 3.0 - r * 1.0, 1.8, -3.2 - (1 - r) * 1.0), { kind: 'open' }); break; }
    case 'bless': A(true, H(true, 3.4, 4.6, 0.9 + 0.7 * sw), { kind: 'open', ang: side ? -0.9 : -1.15, bend: side ? 1 : 1 }); A(false, H(false, 3.4, 4.6, 0.9 - 0.7 * sw), { kind: 'open', ang: side ? -0.9 : -1.95, thumb: 1, bend: side ? 1 : -1 }); break;
    case 'wave': A(true, H(true, 2.0, 5.4, 3.7 + 0.2 * sw), { kind: 'open', ang: -1.35 + 0.4 * Math.sin(TAU * u * 3) }); idle(false); break;
    case 'knead': { const f = 3.4; A(true, H(true, f + sw * 0.9, 1.9, -2.7), { kind: 'fist', ang: side ? 0.35 : 1.3 }); A(false, H(false, f - sw * 0.9, 1.9, -2.7), { kind: 'fist', ang: side ? 0.35 : 1.3 }); res.propsB = [{ what: 'dough', x: side ? Sn[0] + 3.4 * q : DCX, y: Sn[1] + 4.6 * q + 0.4, u }]; break; }
    case 'wipe': { const r = A(true, H(true, 3.0 + sw * 1.1, 4.2 + (side ? 0 : sw * 0.6), -2.8 + cw * 0.4), { kind: 'fist' }); res.propsA = [{ what: 'rag', x: r.W[0] + 0.4, y: r.W[1] + 0.5, u }]; idle(false); break; }
    case 'weave': { const a1 = A(true, H(true, 3.0 + sw * 1.4, 2.4 + sw * 1.2, -2.4), { kind: 'fist' }), a2 = A(false, H(false, 2.6 - sw * 1.4, 2.4 + sw * 1.2, -2.5), { kind: 'fist' }); res.propsA = [{ what: 'shuttle', x: a1.W[0] + 0.8, y: a1.W[1] + 0.2 }, { what: 'shuttle', x: a2.W[0] - 0.8, y: a2.W[1] + 0.2 }]; break; }
    case 'lute': { A(true, H(true, 2.4, 1.0, -2.6 + 0.4 * sw), { kind: 'rest' }); A(false, H(false, 6.2, 4.4, 1.0), { kind: 'fist', bend: 1 }); res.propsB = [{ what: 'lute', x: side ? Sn[0] + 2.6 * q : DCX - 0.6, y: Sn[1] + 4.6 * q, ang: -0.62, u }]; break; }
    case 'spear': { const r = A(true, H(true, 2.2, 5.2, -2.2), { kind: 'fist', ang: Math.PI / 2 }); res.spear = { x: r.W[0], y: r.W[1] }; idle(false); break; }
    case 'hold': { A(true, H(true, 3.0, 2.4, -1.9), { kind: 'rest', ang: side ? 0.1 : 1.0 }); A(false, H(false, 3.0, 2.4, -1.9), { kind: 'rest', ang: side ? 0.1 : 2.1, thumb: 1 }); res.propsB = [{ what: sp.hold, x: side ? Sn[0] + 3.2 * q : DCX, y: Sn[1] + 4.2 * q }]; break; }
    default: return null; }
  return res; }

/* ================= the composer: spec -> stacked layers ================= */
/* spec: age, skin, hair, hs, beard, shirt, pat, acc, pants, hat, hatCol, hatOn, robe, role, apron, pose, tool, face {dx,dy}, status, dress, hold, mourning, wave, inv */
function dollDir(sp) { const f = sp.face || { dx: 0, dy: 1 }; return f.dy > 0 && !f.dx ? 'front' : f.dy < 0 && !f.dx ? 'back' : 'side'; }
function drawDoll(g, sp, x, y, k, T = 0) {
  const kit = kitFor(sp), G = geo(kit), K = G.K, dir = dollDir(sp), f = sp.face || { dx: 0, dy: 1 }, flip = dir === 'side' && f.dx < 0;
  const pose0 = sp.pose || (sp.moving ? 'walk' : 'stand'), wf = Math.floor(T * 9) % 6;
  const hairC = sp.age >= 60 ? GREYH : sp.hair, dress = sp.dress, robe = !!sp.robe || dress === 'bride', shirt = dress === 'bride' ? '#f6f1e8' : dress === 'groom' ? '#2f2c38' : dress === 'mourn' ? '#2a2a30' : sp.shirt;
  const pat = dress ? (dress === 'groom' ? 'collar' : 'plain') : sp.pat, acc = dress === 'groom' ? '#f4efe6' : sp.acc, hatOn = (sp.robe || sp.hatOn || sp.hat === 'toque' || sp.hat === 'helmet') && !dress;
  const sit = pose0 === 'sit' || pose0 === 'kneel';
  const wp: any = sp.wave ? workPose(kit, dir, Object.assign({}, sp, { tool: 'wave' }), T, sp.id || 0) : pose0 === 'work' && sp.tool ? workPose(kit, dir, sp, T, sp.id || 0) : sp.hold && !sit && pose0 !== 'walk' ? workPose(kit, dir, Object.assign({}, sp, { tool: 'hold' }), T, sp.id || 0) : null;
  const legPose = pose0 === 'walk' ? 'walk' : sit ? pose0 : 'stand', fr = pose0 === 'walk' ? wf : 0, rig = legRig(kit, dir, legPose, fr);
  const LK = lookOf(sp), tt = T + (sp.id || 0) * 1.9, calm = pose0 !== 'walk' && !wp, breath = pose0 === 'walk' ? 0 : Math.sin(tt * 1.7) * 0.09;
  const upDy = (pose0 === 'sit' ? G.sit : pose0 === 'kneel' ? G.kneel : rig.dip) + breath, lean = wp ? wp.lean : 0;
  const X0 = x - DO * k, Y0 = y - DO * k, W = DF * k, key = `${kit}_${dir}`;
  const put = (cv, dy = 0, dx = 0) => g.drawImage(cv, X0 + dx * k, Y0 + dy * k, W, W);
  /* the head is its own thing: it sways a little on the neck, drops if the person slouches, and is as wide as that person's head is */
  const putH = (cv, dy = 0, dx = 0) => { const a = (calm ? Math.sin(tt * 0.55) * 0.028 + Math.sin(tt * 1.1 + 1) * 0.01 : 0) + LK.post * 0.012, dyh = Math.max(0, -LK.post) * 0.14, px = X0 + DCX * k, py = Y0 + (G.chin + upDy) * k;
    g.save(); g.translate(px, py); g.rotate(dir === 'side' ? a * 0.7 : a); g.scale(LK.hw / LK.bw, 1); g.translate(-px, -py + dyh * k); g.drawImage(cv, X0 + dx * k, Y0 + dy * k, W, W); g.restore(); };
  const lay = (name, color, fn, mode?) => { const kk = `${key}_${name}`; const base = L(kk, fn); return color ? tint(base, color, kk, mode) : base; };
  const gp = pose0 === 'walk' ? 'w' + fr : sit ? pose0 : 's';
  const inFrame = fn => { g.save(); g.translate(X0, Y0 + upDy * k); g.scale(k, k); fn(); g.restore(); };
  const withLean = fn => { if (!lean) return fn(); g.save(); const px = X0 + DCX * k, py = Y0 + (G.hip + upDy) * k; g.translate(px, py); if (dir === 'side') g.rotate(lean); else g.scale(1, 1 - lean * 0.22); g.translate(-px, -py + (dir === 'side' ? 0 : lean * 2.0 * k)); fn(); g.restore(); };
  g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  if (flip) { g.translate(x + 12 * k, 0); g.scale(-1, 1); g.translate(-(x + 12 * k), 0); }
  g.fillStyle = 'rgba(40,30,80,.24)'; g.beginPath(); g.ellipse(x + 12 * k, y + (DBY - DO + 0.3) * k, (isAdultKit(kit) ? 5.4 : kit === 'child' ? 3.9 : 3.1) * k, (isAdultKit(kit) ? 1.9 : 1.4) * k, 0, 0, TAU); g.fill();
  g.save(); { const fx = x + 12 * k, fy = y + (DBY - DO) * k; g.translate(fx, fy); g.scale(LK.ht * LK.bw, LK.ht); g.translate(-fx, -fy); }   // this person's height and build
  if (!robe) put(lay(`legs_${gp}`, sp.pants, () => legsL(kit, dir, legPose, fr, false)));
  put(lay(`shoes_${gp}`, null, () => shoesL(kit, dir, legPose, fr, robe)));
  const armsOf = wp ? wp.arms : armRig(kit, dir, pose0 === 'walk' ? 'walk' : sit ? pose0 : 'stand', fr);
  const sleeveOf = A => { const kS = armKey(kit, dir, A, 'sleeve'); return tint(L(kS, () => armL(kit, dir, A, 'sleeve')), shirt, kS); }, handOf = A => { const kH = armKey(kit, dir, A, 'hand'); return tint(L(kH, () => armL(kit, dir, A, 'hand')), sp.skin, kH); };
  /* Seen from behind, everything the person holds or reaches for is in front of them, so it is behind their back and head: the forearms, hands, tools and carried things are painted first, and only the upper arms show beside the body. Arms that hang or wave stay in front. */
  const behindArms_ = () => dir === 'back' && !sp.wave && (sit || (wp && wp.arms)), behindArms = behindArms_();
  const armsEarly = !behindArms_() && dir === 'back' && !sp.wave;   // seen from behind the hair and the veil fall over the back, in front of the arms that hang at the sides
  const armBlock = () => {
    if (wp && wp.propsB) for (const p of wp.propsB) inFrame(() => propDraw(g, p.what, p.x, p.y, p.u || 0, p.ang || 0));
    if (wp && wp.spear) inFrame(() => toolDraw(g, 'spear', wp.spear.x, wp.spear.y + 5, -Math.PI / 2));
    else if (!wp && sp.tool === 'spear' && (sp.moving || pose0 === 'stand')) { const S = shoulderAt(kit, dir, 'near'); inFrame(() => toolDraw(g, 'spear', S[0] + (dir === 'side' ? 3.2 : K.sh + 1.0), S[1] + 7.5, -Math.PI / 2)); }
    for (const A of armsOf) if (!(dir === 'side' && A.far)) { put(sleeveOf(A), upDy); }
    if (wp && wp.tool) inFrame(() => toolDraw(g, wp.tool.tool, wp.tool.x, wp.tool.y, wp.tool.ang));
    for (const A of armsOf) if (!(dir === 'side' && A.far)) put(handOf(A), upDy);
    if (wp && wp.propsA) for (const p of wp.propsA) inFrame(() => propDraw(g, p.what, p.x, p.y, p.u || 0, p.ang || 0)); };
  withLean(() => {
    if (behindArms) armBlock();
    putH(lay(`hb_${sp.hs}`, hairC, () => hairL(kit, dir, sp.hs, 'back'), 'overlay'), upDy);
    if (dir === 'side') for (const A of armsOf) if (A.far) { put(sleeveOf(A), upDy); put(handOf(A), upDy); }
    put(lay(`torso_${robe ? 'r' : 'n'}${robe && sit ? 's' : ''}_${pose0 === 'walk' && robe ? 'w' + fr : 's'}`, shirt, () => torsoL(kit, dir, pose0 === 'walk' ? 'walk' : 'stand', fr, robe, { sit })), upDy);
    if (!robe && pat && pat !== 'plain') put(lay(`acc_${pat}`, acc, () => accentL(kit, dir, 'stand', 0, pat)), upDy);
    if (sp.apron) put(lay('apron', null, () => clothL(kit, dir, 'stand', 0, 'apron')), upDy);
    if (robe && sp.role === 'Priest' && dir === 'front') put(lay('stole', null, () => clothL(kit, dir, 'stand', 0, 'stole')), upDy);
    if ((sp.mourning && !sp.moving) || dress === 'mourn') put(lay('mourn', null, () => clothL(kit, dir, 'stand', 0, 'mourn')), upDy);
    if (dress === 'groom' && dir !== 'back') put(lay('groom', null, () => dressL(kit, dir, 'groom')), upDy);
    if (armsEarly) armBlock();
    putH(lay('skin', sp.skin, () => skinL(kit, dir, 'stand', 0, {})), upDy);
    { const bl = ((T + 1.3 + (sp.id || 0) * 1.37) % 4.1) < 0.15, LK = lookOf(sp); putH(lay((bl ? 'face_blink_' : 'face_') + lookSig(LK), null, () => faceL(kit, dir, 'stand', 0, { blink: bl, look: LK })), upDy); }
    if (sp.beard && sp.age >= 18 && dir !== 'back') putH(lay(`bd_${sp.beard}`, hairC, () => beardL(kit, dir, sp.beard), 'overlay'), upDy);
    putH(lay(`hf_${sp.hs}`, hairC, () => hairL(kit, dir, sp.hs, 'front'), 'overlay'), upDy);
    if (sp.age >= 45 && sp.age < 60 && sp.hs !== 'bald') putH(lay('grey', null, () => greyL(kit, dir)), upDy);
    if (hatOn && sp.hat && sp.hat !== 'none') { putH(lay(`hat_${sp.hat}_t`, sp.hatCol || '#c9a86a', () => hatL(kit, dir, sp.hat, 'tint')), upDy); if (sp.hat === 'bun') putH(lay('hat_bun_h', hairC, () => hatL(kit, dir, 'bun', 'hair'), 'overlay'), upDy); if (HATFIX.has(sp.hat) || ['helmet', 'beanie', 'feather'].includes(sp.hat)) putH(lay(`hat_${sp.hat}_f`, null, () => hatL(kit, dir, sp.hat, 'fixed')), upDy); }
    if (dress === 'bride') put(lay('bride', null, () => dressL(kit, dir, 'bride')), upDy);
    if (!behindArms && !armsEarly) armBlock();
  });
  if (sp.age >= 70 && !['sleep', 'sit', 'work', 'kneel'].includes(pose0) && isAdultKit(kit)) { const S = shoulderAt(kit, dir, 'near'); const hx = dir === 'side' ? S[0] + 2.2 : S[0] + 1.0; g.save(); g.translate(X0, Y0 + upDy * k); g.scale(k, k); propDraw(g, 'cane', hx, S[1] + 5.4); g.restore(); }
  g.restore(); g.restore(); }
/* a sleeper laid on a bed tile (x,y = the tile's top-left) */
function drawSleeper(g, sp, x, y, k, T, top, bedCol) { const fi = Math.floor(T * 30) % FR, dw = 24 * k; const put = (cv) => g.drawImage(cv, x, y, dw, dw);
  put(tint(L('sl_skin' + top, () => sleepL('skin', top)), sp.skin, 'slsk' + top)); put(tint(L('sl_hair' + top, () => sleepL('hair', top)), sp.age >= 60 ? GREYH : sp.hair, 'slh' + top, 'overlay'));
  put(tint(L('sl_bl' + top + '_' + fi, () => sleepL('blanket', top, fi)), bedCol, 'slbl' + top + '_' + fi)); }

/* ================= the catalogue ================= */
const ITEMS = [], BYID = {};
function add(it) { it.frames = it.frames || 1; ITEMS.push(it); BYID[it.id] = it; return it; }
const objCache = {};
/* Nothing a sprite paints may be cut off by its own frame. Every object is measured across its loop (the sway is what pushes a canopy over the edge) and, if it would
   touch the frame, the whole loop is scaled by one fixed factor about the bottom centre, so the frames still line up. Pieces that fill their tile on purpose opt out. */
const NOFIT = /^(site_|raft$|ship$|boat$|wreck$)/;
/* line hierarchy: where the sun lands, the outline gives way to the colour of the thing it holds (and breaks a little, by hand); where the shade falls, it stays dark and deepens */
function inkLift(c, seed) { const W = c.width, H = c.height, g = c.getContext('2d'), im = g.getImageData(0, 0, W, H), d = im.data, N = W * H, R = Math.round(Q * 1.7), dist = new Float32Array(N);
  for (let i = 0; i < N; i++) dist[i] = d[i * 4 + 3] >= 128 ? 9999 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; let v = dist[i]; if (!v) continue; if (x > 0 && dist[i - 1] + 1 < v) v = dist[i - 1] + 1; if (y > 0) { if (dist[i - W] + 1 < v) v = dist[i - W] + 1; if (x > 0 && dist[i - W - 1] + 1.414 < v) v = dist[i - W - 1] + 1.414; if (x < W - 1 && dist[i - W + 1] + 1.414 < v) v = dist[i - W + 1] + 1.414; } dist[i] = v; }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; let v = dist[i]; if (!v) continue; if (x < W - 1 && dist[i + 1] + 1 < v) v = dist[i + 1] + 1; if (y < H - 1) { if (dist[i + W] + 1 < v) v = dist[i + W] + 1; if (x < W - 1 && dist[i + W + 1] + 1.414 < v) v = dist[i + W + 1] + 1.414; if (x > 0 && dist[i + W - 1] + 1.414 < v) v = dist[i + W - 1] + 1.414; } dist[i] = v; }
  const at = (x, y) => dist[Math.max(0, Math.min(H - 1, y)) * W + Math.max(0, Math.min(W - 1, x))], out = new Uint8ClampedArray(d), r4 = 4;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, dd = dist[i]; if (dd < 1 || dd > R) continue;
    let gx = at(x + r4, y) - at(x - r4, y), gy = at(x, y + r4) - at(x, y - r4); const gl = Math.hypot(gx, gy); if (gl < 1) continue; gx /= gl; gy /= gl;     // grad points into the body
    const nl = -(gx * LT[0] + gy * LT[1]) * -1, lit = clamp(-(gx * LT[0] + gy * LT[1]) * 1.5 - 0.1, 0, 1), shade = clamp((gx * LT[0] + gy * LT[1]) * 1.4 - 0.2, 0, 1);
    const t = Math.pow(clamp(1 - (dd - 1) / R, 0, 1), 0.8), br = 0.55 + 0.9 * vn(x / W, y / H, 14, seed), s = Math.min(0.62, 0.5 * lit * t * br);
    let cr = d[i * 4], cg = d[i * 4 + 1], cb = d[i * 4 + 2];
    if (s > 0.01) { const k = R + 4 - dd, sx = Math.max(0, Math.min(W - 1, Math.round(x + gx * k))), sy = Math.max(0, Math.min(H - 1, Math.round(y + gy * k))), j = (sy * W + sx) * 4;
      if (d[j + 3] >= 128) { cr = cr * (1 - s) + (d[j] * 1.06 + 6) * s; cg = cg * (1 - s) + (d[j + 1] * 1.06 + 6) * s; cb = cb * (1 - s) + (d[j + 2] * 1.06 + 6) * s; } }
    if (shade > 0.01) { const f = 1 - 0.2 * shade * t; cr *= f; cg *= f; cb *= f; }
    out[i * 4] = cr; out[i * 4 + 1] = cg; out[i * 4 + 2] = cb; }
  im.data.set(out); g.putImageData(im, 0, 0); }
function rawFrame(it, f) { const k = it.id + '|raw' + f; if (objCache[k]) return objCache[k]; const c = mk(it.w, it.rh || it.h), g = c.getContext('2d'); it.paint(g, f / it.frames, f); if (it.tex !== 0) texturize(c, it.tex ?? 0.8); if (it.kind === 'object' && it.lift !== 0) inkLift(c, h32(it.id.length, it.id.charCodeAt(0), it.id.charCodeAt(it.id.length - 1), 3) * 97 | 0); return objCache[k] = c; }
/* Pieces that are a thing standing on its own tile are centred on it (by the body, not the shadow), and every object keeps clear air round it: no canopy, shadow or glow touches the edge of its frame. */
const NOCENTRE = /^(site_|raft$|ship$|boat$|wreck$|whale$|lighthouse|tree_|tent_|stall_|well$|statue_|lamp_|campfire|feastfire|cave_|obelisk|lantern_|owlpost_|heartgem|deer_|fox_|owl_|forest_sprite|decal_|crop_|shroom|cake|glow)/;
function fitOf(it) { if (it._fit !== undefined) return it._fit; it._fit = null; it._dx = 0; if (it.kind !== 'object' || NOFIT.test(it.id)) return null;
  const n = it.frames, fr = n === 1 ? [0] : [...new Set([0, Math.round(n * 0.25), Math.round(n * 0.75), ...Array.from({ length: 10 }, (_, i) => Math.round(i * n / 10))])];
  const W = it.w, HR = it.rh || it.h, HF = it.h, cx = W / 2, m = Q * (it.group === 'trees' ? 1.5 : 0.9); let x0 = W, x1 = 0, y0 = HR, b0 = W, b1 = 0;
  for (const f of fr) { const d = rawFrame(it, f).getContext('2d').getImageData(0, 0, W, HR).data; for (let y = 0; y < HR; y++) for (let x = 0; x < W; x++) { const a = d[(y * W + x) * 4 + 3]; if (a > 40) { if (x < x0) x0 = x; if (x + 1 > x1) x1 = x + 1; if (y < y0) y0 = y; if (a > 200) { if (x < b0) b0 = x; if (x + 1 > b1) b1 = x + 1; } } } }
  let dx = 0; if (!NOCENTRE.test(it.id) && it.gw <= 24 && b1 > b0) { const off = (b0 + b1) / 2 - cx; if (Math.abs(off) > Q * 0.3) dx = Math.round(-Math.max(-2.4 * Q, Math.min(2.4 * Q, off))); }
  const sx = Math.min((cx + dx - m) / Math.max(1, cx - x0), (W - m - cx - dx) / Math.max(1, x1 - cx)), sy = (HF - m) / Math.max(1, HR - y0), sc = Math.min(1, sx, sy);
  it._dx = dx; return it._fit = sc < 0.995 || dx || HR !== HF ? Math.min(sc, 1) : null; }
/* soft light (glows, halos) fades out before it reaches the sides and the top of its frame, so it never ends in a straight edge */
const FEATHER = /^(statue_|lantern_|heartgem|lamp_lit|campfire|feastfire)/;
function feather(c, band, all) { const o = mk(c.width, c.height), g = o.getContext('2d'); g.drawImage(c, 0, 0); g.globalCompositeOperation = 'destination-in'; const W = c.width, H = c.height;
  for (const [x0, y0, x1, y1] of [[0, 0, band, 0], [W, 0, W - band, 0], [0, 0, 0, band]].concat(all ? [[0, H, 0, H - band]] : [])) { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); } return o; }
function objFrame(it, fi) { const f = it.frames > 1 ? fi % it.frames : 0, k = it.id + '|' + f; if (objCache[k]) return objCache[k]; const sc = fitOf(it), raw = rawFrame(it, f); let out = raw;
  if (sc) { const c = mk(it.w, it.h), g = c.getContext('2d'), HR = it.rh || it.h; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(raw, it.w / 2 * (1 - sc) + (it._dx || 0), it.h - HR * sc, it.w * sc, HR * sc); out = c; }
  if (FEATHER.test(it.id)) out = feather(out, Q * 1.6, /^heartgem/.test(it.id)); return objCache[k] = out; }
function frameOf(it, fi) { if (it.canvasAt) return it.canvasAt(fi % it.frames); if (it.canvas) return it.canvas(); return objFrame(it, fi); }
const GROUND = [['grass', 4, 'Grass'], ['sand', 4, 'Sand'], ['path', 4, 'Path'], ['soil', 2, 'Tilled soil'], ['flats', 2, 'Tidal flats'], ['wood', 2, 'Plank floor'], ['stone', 2, 'Stone floor']] as [string, number, string][];
for (const [n, cnt, label] of GROUND) for (let v = 0; v < cnt; v++) add({ id: n + '_' + v, group: n === 'wood' || n === 'stone' ? 'floor' : 'ground', label: label + (cnt > 1 ? ' ' + (v + 1) : ''), w: S, h: S, kind: 'tile', canvas: () => terr(n, v) });
add({ id: 'water_deep', group: 'water', label: 'Deep sea', w: S, h: S, frames: FR, kind: 'tile', canvasAt: fi => water('deep', fi) });
add({ id: 'water_shallow', group: 'water', label: 'Shallows', w: S, h: S, frames: FR, kind: 'tile', canvasAt: fi => water('shallow', fi) });
for (const layer of ['sand', 'shallow', 'grass', 'path']) for (let m = 1; m < 15; m++) add({ id: `edge_${layer}_m${String(m).padStart(2, '0')}`, group: 'edge_' + layer, label: 'Mask ' + m, w: S, h: S, frames: LAYERS[layer].anim ? FR : 1, kind: 'overlay', layer, mask: m, canvasAt: fi => overlay(layer, m, fi) });

/* A(id, group, label, w, h, frames, painter, opts): w and h in GAME pixels (24 per tile); the painter draws in game pixels.
   bot: the painter works in the bottom tile's coordinates (the piece grows upward). under: what the sheet draws beneath. */
function A(id, group, label, w, h, frames, fn, o: any = {}) { return add(Object.assign({ id, group, label, w: w * Q, h: h * Q, rh: (o.rawH || h) * Q, gw: w, gh: h, frames, kind: 'object', paint: (g, t, fi) => { g.save(); g.scale(Q, Q); if (o.bot) g.translate(0, (o.rawH || h) - 24); fn(g, t, fi); g.restore(); } }, o)); }
const R3 = n => Array.from({ length: n }, (_, i) => i);
/* nature */
for (const kind of ['round', 'dark', 'flower']) for (const v of R3(3)) A(`tree_${kind}_${v}`, 'trees', `${kind[0].toUpperCase() + kind.slice(1)} tree ${v + 1}`, 24, 24, FR, (g, t) => tree24(g, t, kind, v), { bot: true, rawH: 30 });
for (const kind of ['pine', 'oldpine']) for (const v of R3(2)) A(`tree_${kind}_${v}`, 'trees', `${kind === 'pine' ? 'Pine' : 'Old pine'} ${v + 1}`, 24, 24, FR, (g, t) => tree24(g, t, kind, v), { bot: true, rawH: 30 });
for (const v of R3(4)) A(`boulder_${v}`, 'rocks', `Boulder ${v + 1}`, 24, 24, 1, g => boulder24(g, v));
for (const v of R3(4)) A(`crag_${v}`, 'rocks', `Crag ${v + 1}`, 24, 24, 1, g => crag24(g, v));
A('pile_stone', 'rocks', 'Stone pile', 24, 24, 1, g => pile24(g, 'stone')); A('pile_wood', 'rocks', 'Log pile', 24, 24, 1, g => pile24(g, 'wood')); A('drop_wood', 'rocks', 'Dropped log', 24, 24, 1, g => drop24(g, 'wood')); A('drop_stone', 'rocks', 'Dropped stone', 24, 24, 1, g => drop24(g, 'stone'));
for (const v of R3(2)) A(`bush_${v}`, 'plants', `Bush ${v + 1}`, 24, 24, FR, (g, t) => bush24(g, t, v, false));
for (const s of R3(3)) A(`berry_${s}`, 'plants', ['Berry bush, bare', 'Berry bush, some', 'Berry bush, ripe'][s], 24, 24, FR, (g, t) => bush24(g, t, 1, true, s));
for (const v of R3(3)) A(`decal_flowers_${v}`, 'decals', ['Wildflowers, daisies', 'Wildflowers, buttercups', 'Wildflowers, violets'][v], 24, 24, 1, g => decal24(g, 'flowers', v), { ground: true });
for (const v of R3(2)) A(`decal_clover_${v}`, 'decals', 'Clover patch ' + (v + 1), 24, 24, 1, g => decal24(g, 'clover', v), { ground: true });
for (const v of R3(2)) A(`decal_pebbles_${v}`, 'decals', 'Pebbles ' + (v + 1), 24, 24, 1, g => decal24(g, 'pebbles', v), { ground: true });
for (const v of R3(2)) A(`decal_leaves_${v}`, 'decals', 'Fallen leaves ' + (v + 1), 24, 24, 1, g => decal24(g, 'leaves', v), { ground: true });
for (const v of R3(2)) A(`decal_fern_${v}`, 'decals', 'Fern ' + (v + 1), 24, 24, 1, g => decal24(g, 'fern', v));
for (const v of R3(2)) A(`stump_${v}`, 'trees', 'Tree stump ' + (v + 1), 24, 24, 1, g => stump24(g, v));
/* magic mushrooms: a small cluster with violet spotted caps and a faint glow */
function magicShroom24(g, t) { shadowE(g, 12, 20.2, 8, 2);
  const rg = g.createRadialGradient(12, 15, 1, 12, 15, 11); rg.addColorStop(0, 'rgba(190,120,255,0.35)'); rg.addColorStop(1, 'rgba(190,120,255,0)'); g.fillStyle = rg; g.fillRect(0, 3, 24, 20);
  const sw = tw(t, 1, 3) * 0.35;
  for (const [x, y, k] of [[8.4, 17.6, 0.9], [14, 16.2, 1.25], [18, 18.2, 0.75]]) {
    const cx = x + sw * k;
    dab(g, x, y + 1.4 * k, 1.25 * k, 3.2 * k, 0, INK); dab(g, x, y + 1.4 * k, 0.95 * k, 2.9 * k, 0, '#f1e6cf');   // the stem
    dab(g, cx, y - 1.4 * k, 4.2 * k, 3.1 * k, 0, INK); dab(g, cx, y - 1.4 * k, 3.8 * k, 2.8 * k, 0, '#9a4fe0'); dab(g, cx - 0.5 * k, y - 2.2 * k, 2.6 * k, 1.5 * k, 0, '#b97af2');
    for (const [dx, dy] of [[-1.7, -0.9], [0.4, -2.2], [1.8, -0.7]]) dab(g, cx + dx * k, y + dy * k, 0.55 * k, 0.45 * k, 0, '#fff3c0');
  } }
A('magic_shroom', 'plants', 'Magic mushrooms', 24, 24, FR, (g, t) => magicShroom24(g, t));
for (const s of R3(3)) A(`herb_${s}`, 'plants', ['Herb patch, bare', 'Herb patch, some', 'Herb patch, in flower'][s], 24, 24, FR, (g, t) => herb24(g, t, 0, s));
for (const s of [1, 2, 3, 4]) A(`crop_${s}`, 'plants', ['Seedlings', 'Young wheat', 'Green wheat', 'Ripe wheat'][s - 1], 24, 24, FR, (g, t) => plants24(g, t, s), { under: 'soil' });
for (const sd of Object.keys(CROP_ART)) for (const s of [1, 2, 3, 4, 5]) { if (s === 5 && !['lavender', 'poppy', 'daisy', 'marigold', 'rose'].includes(sd)) continue; A(`crop_${sd}_${s}`, 'plants', `${sd}, stage ${s}`, 24, 24, FR, (g, t) => cropArt24(g, t, sd, s), { under: 'soil' }); }
A('crop_raw', 'plants', 'Field plot, untilled', 24, 24, 1, g => field24(g, true), { kind: 'tile', under: null });
A('crop_0', 'plants', 'Field plot, ploughed', 24, 24, 1, g => field24(g, false), { kind: 'tile', under: null });
A('shroom', 'plants', 'Glow mushrooms', 24, 24, FR, (g, t) => shroom24(g, t));
/* camp and town props */
for (const v of R3(4)) A(`tent_${v}`, 'camp', `Tent ${v + 1}`, 24, 26, FR, (g, t) => tent24(g, t, v), { bot: true });
A('lamp_unlit', 'camp', 'Lamp post, day', 24, 26, 1, g => lamp24(g, 0, false), { bot: true }); A('lamp_lit', 'camp', 'Lamp post, lit', 24, 26, FR, (g, t) => lamp24(g, t, true), { bot: true });
A('campfire', 'camp', 'Campfire', 24, 24, FR, (g, t) => campfire24(g, t, false)); A('feastfire', 'camp', 'Feast fire', 24, 24, FR, (g, t) => campfire24(g, t, true));
A('well', 'camp', 'Well (2 × 2 tiles)', 48, 48, FR, (g, t) => well24(g, t), { footprint: [2, 2] });
for (const v of R3(4)) A(`stall_${v}`, 'camp', `Market stall ${v + 1}`, 24, 24, FR, (g, t) => stall24(g, t, v));
A('stake', 'camp', 'Survey stake', 24, 24, 1, g => stake24(g)); for (const m of ['wood', 'stone']) for (const b of [0, 1]) A(`site_${m}_${b ? 'built' : 'open'}`, 'camp', `${m === 'wood' ? 'Timber' : 'Stone'} plot, ${b ? 'built' : 'marked'}`, 24, 24, 1, g => slot24(g, m, b));
A('chest_closed', 'camp', 'Chest', 24, 24, 1, g => chest24(g, false)); A('chest_open', 'camp', 'Chest, open', 24, 24, 1, g => chest24(g, true)); A('remains', 'camp', 'Remains', 24, 24, 1, g => remains24(g));
A('cake', 'camp', 'Wedding cake', 24, 24, FR, (g, t) => cake24(g, t));
A('grave_stone', 'graves', 'Gravestone', 24, 24, 1, g => grave24(g, 0)); A('grave_cross', 'graves', 'Grave, white cross', 24, 24, 1, g => grave24(g, 1)); A('grave_cross2', 'graves', 'Grave, flowers', 24, 24, 1, g => grave24(g, 2));
for (const a of R3(3)) A(`cross_${a}`, 'graves', ['Wooden cross, new', 'Wooden cross, weathered', 'Wooden cross, leaning'][a], 24, 24, 1, g => cross24(g, a), { bot: true });
/* landmarks */
for (const s of R3(5)) A(`statue_${s}`, 'landmarks', `Heart statue ${s}/4`, 48, 72, FR, (g, t) => statue24(g, t, s), { footprint: [2, 3] });
for (const j of [0, 1, 3, 5]) A(`owlpost_${j}`, 'landmarks', `Hoot’s post, ${j} notice${j === 1 ? '' : 's'}`, 24, 48, FR, (g, t) => owlpost24(g, t, j), { footprint: [1, 2] });
A('lantern_empty', 'landmarks', 'Lantern pillar, empty', 24, 48, 1, g => lantern24(g, 0, false, false), { footprint: [1, 2] }); A('lantern_gem', 'landmarks', 'Lantern pillar, gem set', 24, 48, FR, (g, t) => lantern24(g, t, false, true), { footprint: [1, 2] }); A('lantern_lit', 'landmarks', 'Lantern pillar, lit', 24, 48, FR, (g, t) => lantern24(g, t, true, true), { footprint: [1, 2] });
A('idol_0', 'landmarks', 'Stone idol', 24, 24, 1, g => idol24(g, 0, false)); A('idol_1', 'landmarks', 'Stone idol, found', 24, 24, FR, (g, t) => idol24(g, t, true));
A('obelisk', 'landmarks', 'Black obelisk', 24, 48, FR, (g, t) => obelisk24(g, t), { footprint: [1, 2] }); A('heartgem', 'landmarks', 'Heart gem', 24, 24, FR, (g, t) => heartgem24(g, t));
/* coast */
A('mound', 'coast', 'Dig mound', 24, 24, 1, g => mound24(g, false), { under: 'sand' }); A('mound_dug', 'coast', 'Dug mound', 24, 24, 1, g => mound24(g, true), { under: 'sand' });
A('cave_closed', 'coast', 'Sea cave, closed', 24, 24, 1, g => cave24(g, false), { under: 'sand' }); A('cave_open', 'coast', 'Sea cave, open', 24, 24, 1, g => cave24(g, true), { under: 'sand' });
A('glint', 'coast', 'Glint', 24, 24, FR, (g, t) => glint24(g, t), { under: 'sand' }); A('bottle', 'coast', 'Bottle', 24, 24, FR, (g, t) => bottle24(g, t), { under: 'sand' });
A('wreck', 'coast', 'Wreck (3 × 2 tiles)', 72, 48, FR, (g, t) => wreck24(g, t), { under: 'sand', footprint: [3, 2] });
A('lighthouse_dark', 'coast', 'Lighthouse', 24, 72, 1, g => lighthouse24(g, 0, false), { footprint: [1, 3] }); A('lighthouse_lit', 'coast', 'Lighthouse, lit', 24, 72, FR, (g, t) => lighthouse24(g, t, true), { footprint: [1, 3] });
A('ship', 'coast', 'Ship (4 × 3 tiles)', 96, 72, FR, (g, t) => ship24(g, t), { under: 'water', footprint: [4, 3] }); A('boat', 'coast', 'Boat (2 × 2 tiles)', 48, 48, FR, (g, t) => boat24(g, t), { under: 'water', footprint: [2, 2] }); A('raft', 'coast', 'Raft', 24, 24, FR, (g, t) => raft24(g, t), { under: 'water' });
A('crab', 'coast', 'Thief crab', 24, 24, 6, (g, t) => crab24(g, t), { under: 'sand', fps: 9 }); A('seal', 'coast', 'Seal', 24, 24, FR, (g, t) => seal24(g, t), { under: 'sand' });
A('gull_sit', 'coast', 'Gull, resting', 24, 24, FR, (g, t) => gull24(g, t, 'sit'), { under: 'sand' }); A('gull_fly', 'coast', 'Gull, flying', 24, 24, 12, (g, t) => gull24(g, t, 'fly'), { under: 'water', fps: 12 }); A('whale', 'coast', 'Whale hump (2 × 1 tiles)', 48, 24, FR, (g, t) => whale24(g, t), { under: 'water', footprint: [2, 1] });
/* wild */
for (const k of ['deer', 'rabbit', 'fox']) { A(`${k}_idle`, 'wild', `${k[0].toUpperCase() + k.slice(1)}`, 24, 24, FR, (g, t) => animal24(g, t, k, false)); A(`${k}_run`, 'wild', `${k[0].toUpperCase() + k.slice(1)}, running`, 24, 24, 6, (g, t) => animal24(g, t, k, true), { fps: 9 }); }
A('owl_wild', 'wild', 'Owl', 24, 24, FR, (g, t) => animal24(g, t, 'owl', false)); A('eyes', 'wild', 'Eyes in the dark', 24, 24, FR, (g, t) => eyes24(g, t), { under: 'dark' });
for (const v of R3(3)) A(`forest_sprite_${v}`, 'wild', `Forest sprite ${v + 1}`, 24, 24, FR, (g, t) => sprite24(g, t, v));
/* the cutaway rooms */
const WALLX = ['N', 'W', 'E', 'S', 'WS', 'ES', 'WN', 'EN'];
function T24(id, group, label, fn, o: any = {}) { return A(id, group, label, 24, 24, o.frames || 1, fn, Object.assign({ kind: 'furniture', under: 'wood' }, o)); }
T24('wall_face', 'walls', 'Back wall', g => wallFace24(g, false), { kind: 'tile', under: null }); T24('wall_window', 'walls', 'Back wall, window', g => wallFace24(g, true), { kind: 'tile', under: null });
A('torch', 'camp', 'Torch', 24, 26, FR, (g, t) => torch24(g, t), { bot: true });
for (const r of [0, 1, 2, 3]) for (const up of [true, false]) A(`stair_${up ? 'up' : 'down'}${r ? '_' + r : ''}`, 'walls', `Staircase ${up ? 'up' : 'down'}${r ? ', turned ' + r : ''}`, 24, 24, 1, g => { g.save(); g.translate(12, 12); g.rotate(r * Math.PI / 2); g.translate(-12, -12); stair24(g, up); g.restore(); }, { kind: 'tile', under: null });   // (r: which way the arrow points: 0 north, 1 east, 2 south, 3 west)
T24('window_side', 'walls', 'Window in a side wall', g => windowSide24(g), { kind: 'tile', under: null });
for (const s of ['W', 'E', 'S', 'WS', 'ES', 'WN', 'EN']) T24('cap_' + s, 'walls', 'Wall top ' + s, g => cap24(g, s), { kind: 'tile', under: null }); T24('cap_plain', 'walls', 'Wall top, inner', g => cap24(g, ''), { kind: 'tile', under: null });
/* every other combination of open edges, for free-form walls (letters in the order W, E, N, S) */
for (let m = 1; m < 16; m++) { const k = (m & 1 ? 'W' : '') + (m & 2 ? 'E' : '') + (m & 4 ? 'N' : '') + (m & 8 ? 'S' : ''); if (!['W', 'E', 'S', 'WS', 'ES', 'WN', 'EN'].includes(k)) T24('cap_' + k, 'walls', 'Wall top ' + k, g => cap24(g, k), { kind: 'tile', under: null }); }
T24('door_back_closed', 'walls', 'Wooden door, shut (north wall)', g => doorN24(g, false), { kind: 'tile', under: null }); T24('door_back_open', 'walls', 'Wooden door, open (north wall)', g => doorN24(g, true), { kind: 'tile', under: null });
T24('door_mat_closed', 'walls', 'Wooden door, shut (south wall, from above)', g => doorS24(g, false), { kind: 'furniture' }); T24('door_mat_open', 'walls', 'Wooden door, open (south wall, from above)', g => doorS24(g, true), { kind: 'furniture' });
for (const [i, c] of BLANKET.entries()) { T24(`bed_head_up_${i}`, 'furniture', `Bed, head up, ${['blue', 'red', 'green', 'violet', 'gold', 'grey'][i]}`, g => bed24(g, c, true)); T24(`bed_head_down_${i}`, 'furniture', `Bed, head down, ${['blue', 'red', 'green', 'violet', 'gold', 'grey'][i]}`, g => bed24(g, c, false)); }
for (const f of ['down', 'up', 'left', 'right']) T24(`seat_${f}`, 'furniture', `Chair facing ${f}`, g => seat24(g, f));

/* loose building blocks (pushed about, bought at the builder's yard) and the yard's sample stands */
function blkCap(g, h) { g.save(); g.beginPath(); g.rect(0, 0, 24, h); g.clip(); cap24(g, ''); g.restore(); g.fillStyle = 'rgba(42,35,50,.9)'; g.fillRect(0, 0, 24, 1); g.fillRect(0, 0, 1, 24); g.fillRect(23, 0, 1, 24); g.fillRect(0, 23, 24, 1); }
function blkWall24(g, kind) { shadowE(g, 12, 22.6, 11, 2);
  if (kind === 'door') { g.save(); g.translate(0, 9); g.beginPath(); g.rect(0, 0, 24, 15); g.clip(); doorN24(g, false); g.restore(); }
  else { g.save(); g.translate(0, 10); g.beginPath(); g.rect(0, 0, 24, 14); g.clip(); wallFace24(g, kind === 'window'); g.restore(); }
  blkCap(g, kind === 'door' ? 9 : 10); g.fillStyle = 'rgba(42,35,50,.55)'; g.fillRect(0, kind === 'door' ? 9 : 10, 24, 0.8); }
for (const k of ['wall', 'window', 'door']) T24('blk_' + k, 'furniture', 'Building block, ' + k, g => blkWall24(g, k), { under: null });
function stand24(g, draw) { shadowE(g, 12, 22.4, 11, 2.2);
  wood(g, 2.4, 17.4, 19.2, 5, { dir: 'h', planks: 2, seed: 77, P: WOODD, nails: true, knots: 0.1 });
  wood(g, 3.4, 22, 2, 1.8, { dir: 'v', planks: 1, seed: 78, P: WOODD, nails: false, knots: 0 }); wood(g, 18.6, 22, 2, 1.8, { dir: 'v', planks: 1, seed: 79, P: WOODD, nails: false, knots: 0 });
  g.save(); g.translate(12 - 12 * 0.74, 17.6 - 24 * 0.74); g.scale(0.74, 0.74); draw(g); g.restore();
  g.fillStyle = '#e8c04a'; g.fillRect(2.4, 17.4, 19.2, 1.1); g.fillStyle = 'rgba(90,60,10,.5)'; g.fillRect(2.4, 18.4, 19.2, 0.4); }
for (const k of ['wall', 'window', 'door']) T24('yd_' + k, 'furniture', 'Yard stand, ' + k, g => stand24(g, q => blkWall24(q, k)), { under: null });
T24('yd_bed', 'furniture', 'Yard stand, bed', g => stand24(g, q => bed24(q, BLANKET[1], true)), { under: null }); T24('yd_chair', 'furniture', 'Yard stand, chair', g => stand24(g, q => seat24(q, 'down')), { under: null });
T24('yd_table', 'furniture', 'Yard stand, table', g => stand24(g, q => table24(q, 'single', null, 0)), { under: null }); T24('yd_barrel', 'furniture', 'Yard stand, barrel', g => stand24(g, q => barrel24(q)), { under: null });
T24('yd_counter', 'furniture', 'Yard stand, counter', g => stand24(g, q => counter24(q, false)), { under: null }); T24('yd_oven', 'furniture', 'Yard stand, oven', g => stand24(g, q => oven24(q, 0)), { under: null }); T24('yd_forge', 'furniture', 'Yard stand, forge', g => stand24(g, q => forge24(q, 0)), { under: null });
T24('yd_anvil', 'furniture', 'Yard stand, anvil', g => stand24(g, q => anvil24(q)), { under: null }); T24('yd_loom', 'furniture', 'Yard stand, loom', g => stand24(g, q => loom24(q, 0)), { under: null }); T24('yd_shelf', 'furniture', 'Yard stand, shelf', g => stand24(g, q => shelf24(q, 0)), { under: null });
T24('table_loose', 'furniture', 'Table, loose', g => table24(g, 'single', null, 0), { under: null });for (const p of ['single', 'left', 'mid', 'right']) for (const d of ['plain', 'plate', 'vase']) T24(`table_${p}_${d}`, 'furniture', `Table ${p}${d === 'plain' ? '' : ', ' + d}`, g => table24(g, p, d, 0));
T24('barrel', 'furniture', 'Barrel', g => barrel24(g)); for (const v of [0, 1]) T24('shelf_' + v, 'furniture', 'Shelf ' + (v + 1), g => shelf24(g, v)); T24('rug', 'furniture', 'Rug', g => rug24(g, 0)); T24('rug_1', 'furniture', 'Rug, indigo', g => rug24(g, 1)); T24('rug_2', 'furniture', 'Rug, green', g => rug24(g, 2));
T24('counter_0', 'furniture', 'Counter, mug', g => counter24(g, true)); T24('counter_1', 'furniture', 'Counter', g => counter24(g, false)); T24('pew', 'furniture', 'Pew', g => pew24(g), { under: 'stone' });
T24('altar_0', 'furniture', 'Altar', (g, t) => altar24(g, 0, false), { under: 'stone' }); T24('altar_1', 'furniture', 'Altar, candle', (g, t) => altar24(g, t, true), { under: 'stone', frames: FR });
T24('forge', 'furniture', 'Forge', (g, t) => forge24(g, t), { under: 'stone', frames: FR }); T24('anvil', 'furniture', 'Anvil', g => anvil24(g), { under: 'stone' }); T24('loom', 'furniture', 'Loom', (g, t) => loom24(g, t), { frames: FR }); T24('oven', 'furniture', 'Oven', (g, t) => oven24(g, t), { frames: FR });

/* ================= paper-doll layers ================= */
const KITS = ['adult', 'adultF', 'child', 'infant'], HSTYLES = ['short', 'crop', 'shaggy', 'bald', 'curly', 'long', 'bob', 'bun', 'braids', 'ponytail'], BEARDS = ['full', 'mustache', 'goatee', 'stubble'];
const HATS = ['cap', 'straw', 'helmet', 'beanie', 'bonnet', 'bun', 'scarf', 'toque', 'floppy', 'colander', 'feather'], PATS = ['stripe', 'vest', 'belt', 'sash', 'collar'];
function DL(id, kit, dir, group, label, frames, fn, o: any = {}) { return add(Object.assign({ id, group: group, label, w: DF * Q, h: DF * Q, gw: DF, gh: DF, frames, kind: 'layer', kit, dir, canvasAt: fi => L(`${id}#${fi}`, () => fn(fi)), tinted: o.tint || null }, o)); }
for (const kit of KITS) for (const dir of DIRS) {
  const P = `doll/${kit}/${dir}/`, G = `doll_${kit}`;
  DL(P + 'legs_stand', kit, dir, G, `${dir} · legs`, 1, () => legsL(kit, dir, 'stand', 0, false), { tint: 'pants' });
  DL(P + 'legs_walk', kit, dir, G, `${dir} · legs, walk`, 6, fi => legsL(kit, dir, 'walk', fi, false), { tint: 'pants', fps: 9 });
  DL(P + 'legs_sit', kit, dir, G, `${dir} · legs, seated`, 1, () => legsL(kit, dir, 'sit', 0, false), { tint: 'pants' });
  DL(P + 'legs_kneel', kit, dir, G, `${dir} · legs, kneeling`, 1, () => legsL(kit, dir, 'kneel', 0, false), { tint: 'pants' });
  DL(P + 'shoes_stand', kit, dir, G, `${dir} · boots`, 1, () => shoesL(kit, dir, 'stand', 0, false));
  DL(P + 'shoes_walk', kit, dir, G, `${dir} · boots, walk`, 6, fi => shoesL(kit, dir, 'walk', fi, false), { fps: 9 });
  DL(P + 'shoes_sit', kit, dir, G, `${dir} · boots, seated`, 1, () => shoesL(kit, dir, 'sit', 0, false));
  DL(P + 'shoes_kneel', kit, dir, G, `${dir} · boots, kneeling`, 1, () => shoesL(kit, dir, 'kneel', 0, false));
  DL(P + 'torso', kit, dir, G, `${dir} · shirt`, 1, () => torsoL(kit, dir, 'stand', 0, false, {}), { tint: 'shirt' });
  DL(P + 'robe_stand', kit, dir, G, `${dir} · robe`, 1, () => torsoL(kit, dir, 'stand', 0, true, {}), { tint: 'shirt' });
  DL(P + 'robe_walk', kit, dir, G, `${dir} · robe, walk (hem sways)`, 6, fi => torsoL(kit, dir, 'walk', fi, true, {}), { tint: 'shirt', fps: 9 });
  DL(P + 'robe_sit', kit, dir, G, `${dir} · robe, seated`, 1, () => torsoL(kit, dir, 'stand', 0, true, { sit: true }), { tint: 'shirt' });
  for (const p of PATS) DL(P + 'accent_' + p, kit, dir, G, `${dir} · ${p}`, 1, () => accentL(kit, dir, 'stand', 0, p), { tint: 'accent' });
  for (const w of ['apron', 'stole', 'mourn']) { if (w === 'stole' && dir !== 'front') continue; DL(P + 'cloth_' + w, kit, dir, G, `${dir} · ${w === 'mourn' ? 'mourning sash' : w}`, 1, () => clothL(kit, dir, 'stand', 0, w)); }
  DL(P + 'skin', kit, dir, G, `${dir} · head, neck, ears`, 1, () => skinL(kit, dir, 'stand', 0, {}), { tint: 'skin' });
  if (dir === 'front') { const FB = { browCol: '#4a3020' }, FP = (id, label, parts, look) => DL(P + 'face_' + id, kit, dir, G, `${dir} · face part: ${label}`, 1, () => faceL(kit, dir, 'stand', 0, { parts, look: Object.assign({}, FB, look) }));   /* the face taken apart: each person picks their own eyes, brows, nose and mouth */
    for (const e of Object.keys(EYESHAPE)) FP('eyes_' + e, `eyes, ${e}`, ['eyes'], { eyes: e }); for (const b of BROWS) FP('brows_' + b, `brows, ${b}`, ['brows'], { brow: b }); for (const n of NOSES) FP('nose_' + n, `nose, ${n}`, ['nose'], { nose: n }); for (const m of MOUTHS) FP('mouth_' + m, `mouth, ${m}`, ['mouth'], { mouth: m });
    FP('cheeks', 'blush', ['cheeks'], { blush: 0.6 }); FP('freckles', 'freckles', ['extras'], { freckles: true }); FP('lines', 'age lines', ['extras'], { lines: 1 }); FP('glasses', 'spectacles', ['extras'], { glasses: true }); }
  if (dir !== 'back') { DL(P + 'face', kit, dir, G, `${dir} · face`, 1, () => faceL(kit, dir, 'stand', 0, {})); DL(P + 'face_asleep', kit, dir, G, `${dir} · face, eyes closed`, 1, () => faceSleepL(kit, dir)); }
  for (const hs of HSTYLES) { DL(P + 'hair_' + hs + '_front', kit, dir, G, `${dir} · hair ${hs}`, 1, () => hairL(kit, dir, hs, 'front'), { tint: 'hair' }); if (dir !== 'back') DL(P + 'hair_' + hs + '_back', kit, dir, G, `${dir} · hair ${hs}, behind`, 1, () => hairL(kit, dir, hs, 'back'), { tint: 'hair' }); }
  if (dir !== 'back') for (const b of BEARDS) DL(P + 'beard_' + b, kit, dir, G, `${dir} · ${b}`, 1, () => beardL(kit, dir, b), { tint: 'hair' });
  if (dir !== 'back') DL(P + 'hair_grey_streaks', kit, dir, G, `${dir} · grey streaks (45+)`, 1, () => greyL(kit, dir));
  for (const h of HATS) { DL(P + 'hat_' + h, kit, dir, G, `${dir} · ${h}`, 1, () => hatL(kit, dir, h, 'tint'), { tint: 'hat' }); if (h === 'bun') DL(P + 'hat_bun_hair', kit, dir, G, `${dir} · bun hat, hair`, 1, () => hatL(kit, dir, 'bun', 'hair'), { tint: 'hair' }); if (HATFIX.has(h) || ['helmet', 'beanie', 'feather'].includes(h)) DL(P + 'hat_' + h + '_fixed', kit, dir, G, `${dir} · ${h}, fixed colour`, 1, () => hatL(kit, dir, h, 'fixed')); }
  DL(P + 'dress_bride', kit, dir, G, `${dir} · veil and wreath`, 1, () => dressL(kit, dir, 'bride')); if (dir !== 'back') DL(P + 'dress_groom', kit, dir, G, `${dir} · buttonhole`, 1, () => dressL(kit, dir, 'groom'));
  /* the arms: each arm is two layers, a sleeve (shirt tint) and a hand (skin tint), painted for the pose */
  for (const [pn, pose, fr, fps] of [['stand', 'stand', 1, 0], ['walk', 'walk', 6, 9], ['sit', 'sit', 1, 0]]) for (let ai = 0; ai < 2; ai++) for (const part of ['sleeve', 'hand'])
    DL(P + `arm${ai}_${part}_${pn}`, kit, dir, G, `${dir} · arm ${ai + 1}, ${part}, ${pn}${dir === 'side' && ai === 0 ? ' (far arm, drawn behind the shirt)' : ''}`, fr, fi => armL(kit, dir, armRig(kit, dir, pose, fi)[ai], part), Object.assign({ tint: part === 'sleeve' ? 'shirt' : 'skin' }, fps ? { fps } : {}));
}
/* tools and carried things: painted at the hand, which sits at the frame centre (24, 24); tools point right */
for (const t of ['axe', 'hammer', 'hoe', 'rod', 'spear']) DL('doll/prop/tool_' + t, 'prop', 'any', 'doll_props', `Tool: ${t} (rotate about the frame centre)`, 1, () => { const [c, g] = frame(); toolDraw(g, t, DCX, 24, 0); return c; });
for (const kind of ['rest', 'fist', 'open']) DL('doll/prop/hand_' + kind, 'prop', 'any', 'doll_props', { rest: 'Hand, relaxed', fist: 'Hand, gripping', open: 'Hand, open (bless, wave, pick)' }[kind], 1, () => { const [c, g] = frame(); D(g, handPts('adult', { W: [DCX, 24], hand: { ang: 0, thumb: 1 } }, kind), SKINP, { smooth: true, ow: 0.24, os: 0.18, iw: 0.08, hs: 0.45, lx: -0.2, ly: -0.28, rim: 0.16 }); return c; }, { tint: 'skin' });
for (const p of ['cane', 'plate', 'loaf', 'wood', 'stone', 'dough', 'rag', 'shuttle', 'lute', 'fiddle']) DL('doll/prop/' + p, 'prop', 'any', 'doll_props', { cane: 'Walking stick', plate: 'Plate', loaf: 'Loaf', wood: 'Carried timber', stone: 'Carried stone', dough: 'Dough (kneaded)', rag: 'Wiping cloth', shuttle: 'Weaving shuttle', lute: 'Lute', fiddle: 'Fiddle' }[p], 1, () => { const [c, g] = frame(); propDraw(g, p, p === 'wood' ? 18 : DCX, p === 'wood' ? 30 : p === 'stone' ? 30 : 24, 0, p === 'lute' || p === 'fiddle' ? -0.6 : 0); return c; });
for (const top of [1, 0]) { const n = top ? 'head_up' : 'head_down'; add({ id: `doll/sleep/${n}_skin`, group: 'doll_props', label: `Sleeper, ${n.replace('_', ' ')}: skin`, w: TP, h: TP, gw: 24, gh: 24, frames: 1, kind: 'layer', tinted: 'skin', canvasAt: () => L('sk' + n, () => sleepL('skin', top)) });
  add({ id: `doll/sleep/${n}_hair`, group: 'doll_props', label: `Sleeper, ${n.replace('_', ' ')}: hair`, w: TP, h: TP, gw: 24, gh: 24, frames: 1, kind: 'layer', tinted: 'hair', canvasAt: () => L('sh' + n, () => sleepL('hair', top)) });
  add({ id: `doll/sleep/${n}_blanket`, group: 'doll_props', label: `Sleeper, ${n.replace('_', ' ')}: blanket (breathes)`, w: TP, h: TP, gw: 24, gh: 24, frames: FR, kind: 'layer', tinted: 'blanket', canvasAt: fi => L('sb' + n + fi, () => sleepL('blanket', top, fi)) }); }

/* ---- loose things you can push about, and the privy ---- */
function crate24(g, v) { shadowE(g, 12.6, 21.6, 9.6, 2.3);
  wood(g, 3.2, 8.6, 17.6, 12.6, { dir: 'v', planks: 4, seed: 21 + v, P: WOODL, nails: true, knots: 0.4 });
  wood(g, 3.2, 3.6, 17.6, 5.4, { dir: 'h', planks: 3, seed: 25 + v, P: pal('#b98a58', '#ecc794', '#d6a870'), nails: true, knots: 0.3 });
  g.fillStyle = 'rgba(30,18,50,.34)'; g.fillRect(3.2, 8.2, 17.6, 1.1);
  for (const x of [3.2, 18.6]) { g.fillStyle = 'rgba(70,42,22,.78)'; g.fillRect(x, 3.6, 2.2, 17.6); g.fillStyle = 'rgba(255,224,170,.28)'; g.fillRect(x, 3.6, 0.5, 17.6); }
  g.fillStyle = 'rgba(70,42,22,.78)'; g.fillRect(3.2, 17.6, 17.6, 1.7);
  ln(g, 5.6, 9.6, 18.4, 17.2, 'rgba(60,34,16,.62)', 0.9); ln(g, 5.6, 9.2, 18.4, 16.8, 'rgba(255,220,170,.28)', 0.3);
  if (v) { dab(g, 8.4, 6.2, 1.6, 0.7, 0.2, '#c9463c'); dab(g, 12.6, 5.6, 1.4, 0.7, -0.1, '#e0b040'); dab(g, 16, 6.2, 1.5, 0.6, 0.1, '#5a9a4c'); } }
function stool24(g) { shadowE(g, 12.4, 20.6, 7.4, 1.9);
  for (const x of [8, 14.6]) wood(g, x, 11.6, 1.7, 8.6, { dir: 'v', planks: 1, seed: 50 + (x | 0), P: WOODD, nails: false, knots: 0 });
  wood(g, 7.6, 15.4, 9, 1.1, { dir: 'h', planks: 1, seed: 53, P: WOODD, nails: false, knots: 0 });
  c24(g, [blob(12, 10.4, 7.2, 3.6, 3, 24, 0.04, 7)], pal('#a8743e', '#ecc08a', '#c8925a'), { smooth: true, seed: 15, hs: 0.3, iw: 0.15, lx: -0.5, ly: -0.7 });
  g.strokeStyle = 'rgba(80,46,20,.5)'; g.lineWidth = 0.16; g.beginPath(); g.ellipse(12, 10.4, 4.6, 2.1, 0, 0, TAU); g.stroke(); g.beginPath(); g.ellipse(12, 10.4, 2, 0.9, 0, 0, TAU); g.stroke(); }
function toilet24(g) { shadowE(g, 12.4, 21.4, 9.8, 2.2);
  wood(g, 4.2, 12.4, 15.6, 9.2, { dir: 'h', planks: 2, seed: 61, P: WOODD, nails: true, knots: 0.3 });
  wood(g, 4.2, 6.6, 15.6, 6.4, { dir: 'h', planks: 2, seed: 62, P: pal('#b98a58', '#ecc794', '#d6a870'), nails: false, knots: 0.25 });
  g.fillStyle = 'rgba(30,18,50,.3)'; g.fillRect(4.2, 12.4, 15.6, 1);
  dab(g, 12, 9.6, 4.6, 2.5, 0, INK); dab(g, 12, 9.4, 4.1, 2.1, 0, '#2a1a24'); dab(g, 11, 8.9, 1.6, 0.6, 0, 'rgba(255,230,190,.22)');
  g.strokeStyle = 'rgba(255,236,196,.55)'; g.lineWidth = 0.35; g.beginPath(); g.ellipse(12, 9.4, 4.7, 2.5, 0, Math.PI, TAU); g.stroke();
  wood(g, 7.2, 1.6, 9.6, 4.6, { dir: 'h', planks: 1, seed: 63, P: pal('#9a6a3a', '#dca56a', '#b8844c'), nails: false, knots: 0.4, shape: [[7.4, 6.2], [16.6, 6.2], [15.8, 1.8], [8.2, 1.8]] });
  dab(g, 12, 3.6, 0.9, 0.55, 0, INK); dab(g, 12, 3.5, 0.5, 0.3, 0, '#2a1a24');
  g.fillStyle = INK; g.beginPath(); g.arc(20.2, 11.2, 1.7, 0, TAU); g.fill(); g.fillStyle = '#f3ead0'; g.beginPath(); g.arc(20.2, 11.2, 1.3, 0, TAU); g.fill(); g.fillStyle = '#d9cfae'; g.beginPath(); g.arc(20.2, 11.2, 0.5, 0, TAU); g.fill();
  g.fillStyle = '#f3ead0'; g.fillRect(19.6, 12.2, 1.2, 3.4); g.fillStyle = '#d9cfae'; g.fillRect(19.6, 14.8, 1.2, 0.8); }
T24('toilet', 'furniture', 'Privy seat', g => toilet24(g));
T24('crate', 'furniture', 'Crate', g => crate24(g, 0), { under: null }); T24('crate_1', 'furniture', 'Crate, full', g => crate24(g, 1), { under: null });
T24('stool', 'furniture', 'Stool', g => stool24(g), { under: null });
T24('barrel_o', 'furniture', 'Barrel, outdoors', g => barrel24(g), { under: null });


/* ---- what the game may reach ---- */
const BLK = BLANKET;
function roomDress(g, r, ri, doorXs, seed) { const R = mul(900 + ri * 31 + seed), x0 = r.x * 24, y0 = r.y * 24, x1 = (r.x + r.w) * 24, y1 = (r.y + r.h) * 24, doors = doorXs;
  for (let x = r.x; x < r.x + r.w; x++) { if (doors.includes(x)) continue; if (R() < 0.72) { tufts(g, x * 24 + 1, x * 24 + 23, y1 + 1.6, (R() * 1000) | 0, 4 + ((R() * 4) | 0), 3.4); if (R() < 0.55) { const bx = x * 24 + 4 + R() * 16, by = y1 + 0.6 + R() * 1.4; bloom24(g, bx, by, 1.15, ['#fbf6ec', '#f7d84c', '#b79af0'][(R() * 3) | 0], '#f2c94c', R() * TAU, '#8a7a66'); } } }
  const sides = [['W', x0, 0, y0 + 30, y1 - 30, -1, 0], ['E', x1, 0, y0 + 30, y1 - 30, 1, 0], ['N', 0, y0, x0 + 30, x1 - 30, 0, -1], ['S', 0, y1, x0 + 30, x1 - 30, 0, 1]] as [string, number, number, number, number, number, number][];
  for (const [nm, ax, ay, a0, a1, nx, ny] of sides) { const n = nm === 'S' ? 4 : 4 + ((R() * 3) | 0);
    for (let i = 0; i < n; i++) { const t = a0 + (a1 - a0) * R(); if (nm === 'S' && doors.some(dx => Math.abs(t - (dx + 0.5) * 24) < 22)) continue; const px = nx ? ax : t, py = ny ? ay : t, cnt = 11 + ((R() * 6) | 0);
      for (let j = 0; j < cnt; j++) { const out = (R() - 0.5) * 7.2, tan = (R() - 0.5) * 11; let x = px + nx * out + (nx ? 0 : tan), y = py + ny * out + (ny ? 0 : tan); const gcol = ['#4f9a45', '#63ad4c', '#3f8a40', '#78b957'][(R() * 4) | 0];
        leafAt(g, x, y, R() * TAU, 2.5 + R() * 1.2, 1.1 + R() * 0.4, gcol, '#2f6a35', 'rgba(20,60,30,.4)'); } } } }
/* ---- villagers as one sprite: when the map is not zoomed right in, each look + pose + facing + walk frame is composed once
   (the same drawDoll, just into its own small canvas) and then stamped, instead of 10 to 20 draw calls per person per frame.
   Anything animated beyond the walk cycle (working, waving, holding something) and every close-up still draws live. ---- */
let dollT = -1, dollMade = 0;
const DOLL_PAD = 6, DOLL_CACHE = new Map<string, any>(), DOLL_MAX = 1500;
const dollIsLive = sp => !!(sp.wave || (sp.pose === 'work' && sp.tool) || (sp.hold && sp.pose !== 'walk' && sp.pose !== 'sit' && sp.pose !== 'kneel'));
function dollKey(sp, kc, wf) {
  const f = sp.face || { dx: 0, dy: 1 }, inv = sp.inv;
  return sp.id + '|' + kc + '|' + sp.age + (sp.female ? 'f' : 'm') + '|' + sp.skin + '|' + sp.hair + '|' + sp.hs + '|' + sp.beard + '|' + sp.shirt + '|' + sp.pat + '|' + sp.acc + '|' + sp.pants + '|' + sp.hat + '|' + sp.hatCol + (sp.hatOn ? 'h' : '') + (sp.robe ? 'r' : '') + (sp.apron ? 'a' : '')
    + '|' + f.dx + ',' + f.dy + '|' + sp.pose + (sp.moving ? 'm' : '') + '|' + sp.dress + (sp.mourning ? 'n' : '') + '|' + (inv ? (inv.wood ? 'w' : '') + (inv.stone ? 's' : '') : '') + '|' + (sp.pose === 'walk' ? wf : 0) + '|' + (sp.tool || '') + '|' + (sp.hold ? JSON.stringify(sp.hold) : '');
}
/** Draw a villager at tile-pixel position (x, y) with the screen scale Z (device pixels per game pixel). Same picture as drawDoll(g, sp, x, y, 1, T). */
function drawDollLOD(g, sp, x, y, T, Z) {
  if (Z > 2 || dollIsLive(sp)) { drawDoll(g, sp, x, y, 1, T); return; }
  const kc = Z <= 0.5 ? 0.5 : Z <= 1 ? 1 : 2, walk = sp.pose === 'walk', wf = walk ? Math.floor(T * 9) % 6 : 0, key = dollKey(sp, kc, wf);
  let e = DOLL_CACHE.get(key);
  if (!e) {
    // at most 3 new sprites are composed per frame (every villager shares the frame's T); the rest draw live this frame and are cached on a later one
    if (T !== dollT) { dollT = T; dollMade = 0; }
    if (dollMade >= 3) { drawDoll(g, sp, x, y, 1, T); return; }
    dollMade++;
    const size = Math.ceil((DF + 2 * DOLL_PAD) * kc), cv = document.createElement('canvas'); cv.width = cv.height = size;
    drawDoll(cv.getContext('2d'), sp, (DO + DOLL_PAD) * kc, (DO + DOLL_PAD) * kc, kc, walk ? (wf + 0.5) / 9 : 0);
    e = { cv, size: size / kc };
    if (DOLL_CACHE.size >= DOLL_MAX) { let n = 0; for (const k of DOLL_CACHE.keys()) { DOLL_CACHE.delete(k); if (++n >= DOLL_MAX / 4) break; } }   // oldest quarter out
    DOLL_CACHE.set(key, e);
  } else { DOLL_CACHE.delete(key); DOLL_CACHE.set(key, e); }   // most recently used goes to the back
  g.drawImage(e.cv, x - DO - DOLL_PAD, y - DO - DOLL_PAD, e.size, e.size);
}
return { Q, S, FR, DF, DO, TP, BLK, terr, water, overlay, frameOf, BYID, ITEMS, h32, mul, drawDoll, drawDollLOD, drawSleeper, roomDress, kitOf };

})();

