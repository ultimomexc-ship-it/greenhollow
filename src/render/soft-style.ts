/* ================= Rendering ================= */
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const bgCanvas = document.createElement('canvas'), bctx = bgCanvas.getContext('2d');
const darkCanvas = document.createElement('canvas'), dctx = darkCanvas.getContext('2d');
const cam = { x: 0, y: 0, z: 1, fit: 1, dpr: 1, cw: 800, ch: 520, follow: false };
let BK = 2; const DK = 0.5;
const view = { selected: null, hover: null, showRoutes: false };

function hash(x, y, k) {
  let h = (x * 374761393 + y * 668265263 + (k || 0) * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const fillR = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const circ = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); };
/* ---------- soft style (trial): round gradients and gentle light across the land. G toggles it ---------- */
const STYLE = { soft: true };
/* ================= painted sprites (soft style): built once, then stamped ================= */
const SPR_SCALE = 3, SPR = {};
function sprite(key, w, h, draw) {
  if (SPR[key]) return SPR[key];
  const cv = document.createElement('canvas'); cv.width = w * SPR_SCALE; cv.height = h * SPR_SCALE;
  const c = cv.getContext('2d'); c.scale(SPR_SCALE, SPR_SCALE); draw(c);
  return (SPR[key] = { cv, w, h });
}
// a leafy outline: lots of small scallops around an ellipse
function leafPath(c, cx, cy, rx, ry, seed, n, amp) {
  c.beginPath();
  for (let i = 0; i <= 144; i++) {
    const a = i / 144 * 6.2832, w = 1 - amp + amp * 2 * Math.abs(Math.sin(a * n / 2 + seed)) + 0.035 * Math.sin(a * 3 + seed * 1.7);
    const x = cx + Math.cos(a) * rx * w, y = cy + Math.sin(a) * ry * w; if (i) c.lineTo(x, y); else c.moveTo(x, y);
  }
  c.closePath();
}
function softShadow(c, x, y, rx, ry, a) {
  c.save(); c.translate(x, y); c.scale(1, ry / rx);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0.3, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, 6.2832); c.fill(); c.restore();
}
function speckle(c, seed, n, x0, y0, w, h, col, r) {
  let s = seed * 7919 + 13; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  c.fillStyle = col; for (let i = 0; i < n; i++) { c.beginPath(); c.arc(x0 + R() * w, y0 + R() * h, r * (0.6 + R() * 0.7), 0, 6.2832); c.fill(); }
}
// a crown in the house style: flat colour, a lighter cap top-left, a shadow along the bottom, one dark outline
function crown(c, cx, cy, rx, ry, seed, pal) {
  const bump = (k) => { c.beginPath(); for (let i = 0; i <= 72; i++) { const a = i / 72 * 6.2832, w = 1 + 0.05 * Math.abs(Math.sin(a * 4 + seed)) - 0.025; const x = cx + Math.cos(a) * rx * w * k, y = cy + Math.sin(a) * ry * w * k; if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.closePath(); };
  bump(1); c.fillStyle = pal.base; c.fill();
  c.save(); c.clip();
  c.fillStyle = pal.dark; c.beginPath(); c.ellipse(cx + rx * 0.15, cy + ry * 0.75, rx * 1.05, ry * 0.55, 0, 0, 6.2832); c.fill();
  c.fillStyle = pal.light; c.beginPath(); c.ellipse(cx - rx * 0.28, cy - ry * 0.32, rx * 0.55, ry * 0.42, -0.3, 0, 6.2832); c.fill();
  c.fillStyle = pal.shine; c.beginPath(); c.ellipse(cx - rx * 0.42, cy - ry * 0.48, rx * 0.16, ry * 0.12, -0.3, 0, 6.2832); c.fill();
  if (pal.flowers) { let s = seed * 7919 + 13; const R = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 6; i++) { const a = R() * 6.28, d = R() * 0.75; circ(c, cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, 1.1, '#fbf6ea'); circ(c, cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, 0.45, '#f2c94c'); } }
  c.restore();
  bump(1); c.lineWidth = 0.9; c.strokeStyle = '#2f3a1e'; c.stroke();
}
const TREE_PAL = {
  round: { base: '#5f9438', dark: '#4a7a2c', light: '#78ad45', shine: '#9cc860' },
  dark: { base: '#4f7a34', dark: '#3d6228', light: '#65913f', shine: '#86ad58' },
  pine: { base: '#3f7a46', dark: '#316238', light: '#559256', shine: '#77ad6f' },
  flower: { base: '#5f9438', dark: '#4a7a2c', light: '#78ad45', shine: '#9cc860', flowers: true },
  oldpine: { base: '#2c5a4a', dark: '#1f4438', light: '#3d7060', shine: '#5a8c78' },   // the Old Forest: dark, blue-green, nothing like the village trees
};
function trunk(c, cx, base, top, wid) {
  c.beginPath(); if (c.roundRect) c.roundRect(cx - wid / 2, top, wid, base - top, [0, 0, 1, 1]); else c.rect(cx - wid / 2, top, wid, base - top);
  c.fillStyle = '#7a5232'; c.fill(); c.lineWidth = 0.9; c.strokeStyle = '#3a2e24'; c.stroke();
  fillR(c, cx - wid / 2 + 0.6, top, wid * 0.35, base - top - 0.5, '#94683f');
}
// the Old Forest is all old pines (no use for building); everywhere else grows broadleaf trees you can cut for timber
function treeKind(x, y) { const h = hash(x, y, 101); if (typeof inForest === 'function' && inForest(x, y)) return 'oldpine'; return h < 0.62 ? 'round' : h < 0.86 ? 'dark' : 'flower'; }
// tree sprites fit their tile: 24 x 24, trunk base at (12, 22.5)
function treeSprite(kind, v) {
  return sprite('tree:' + kind + v, 24, 24, c => {
    const seed = v * 2.7 + (kind.length * 1.3);
    softShadow(c, 12, 21.8, 9.5, 2.6, 0.45);
    if (kind === 'pine') {
      trunk(c, 12, 22.6, 17, 2.4);
      for (let k = 0; k < 3; k++) crown(c, 12, 15.5 - k * 5.2, 9 - k * 2.2, 4.6 - k * 0.5, seed + k, TREE_PAL.pine);
      return;
    }
    if (kind === 'oldpine') {
      trunk(c, 12, 22.6, 18, 2.2);
      for (let k = 0; k < 4; k++) crown(c, 12, 17.2 - k * 4.4, 8.6 - k * 1.8, 3.9 - k * 0.35, seed + k, TREE_PAL.oldpine);
      return;
    }
    trunk(c, 12, 22.6, 15.5, 2.8);
    const rx = 10 + (v % 3) * 0.35, ry = 8.6 + (v % 2) * 0.4;
    crown(c, 12, 9.6, rx, ry, seed, TREE_PAL[kind]);
    c.fillStyle = 'rgba(40,30,10,.45)'; c.beginPath(); c.ellipse(12, 17.6, 3, 0.9, 0, 0, 6.2832); c.fill();
  });
}
/* ================= soft ground: every terrain rounds its corners into its neighbours ================= */
const GPAL = {
  grass: { base: '#78a03f', edge: null },
  path: { base: '#d4b47c', edge: '#a8844e' },
  sand: { base: '#ead8a0', edge: '#c9b06e' },
  water: { base: '#4b93d1', edge: null },
  soil: { base: '#9a7248', edge: '#6a4a2c' },
  mount: { base: '#7a7f74', edge: '#4f5450' },
  hedge: { base: '#6f9a45', edge: '#4a6e2c' },
};
const GPRI = { water: 0, sand: 1, soil: 2, grass: 3, hedge: 3.5, path: 4, mount: 5 };
function gclass(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return null;
  if (roomAt[y][x] >= 0) return null;
  const t = grid[y][x];
  if (t === T.WATER) return 'water';
  if (t === T.SAND) return 'sand';
  if (t === T.PATH || t === T.LAMP || t === T.WELL || t === T.PILE || t === T.STALL || t === T.TENT) return 'path';
  if (t === T.CROP) return 'soil';
  if (t === T.PLOT || t === T.GRAVE) return 'hedge';
  if (t === T.ROCK && town && town.cmask && town.cmask[y * W + x]) { let s = 0; for (const [dx, dy] of DIRS) { const q = grid[y + dy] && grid[y + dy][x + dx]; if (q === T.SAND || q === T.WATER) s++; } if (s >= 2) return 'sand'; }
  if (t === T.GRASS || t === T.TREE || t === T.ROCK || t === T.MOUNTAIN) return 'grass';
  return null;
}
function groundTile(c, x, y, K) {
  const px = x * TS, py = y * TS, R = 9, ext = 4;
  const nb = (dx, dy) => gclass(x + dx, y + dy), same = (dx, dy) => { const k = nb(dx, dy); return k === null || k === K; };
  const u = same(0, -1), d = same(0, 1), l = same(-1, 0), r = same(1, 0);
  c.save(); c.beginPath(); c.rect(px, py, TS, TS); c.clip();
  const cornerCol = (a, b) => { const k = (a !== null && a !== K) ? a : b; return k && GPAL[k] ? GPAL[k].base : GPAL[K].base; };
  const tl = !u && !l, tr = !u && !r, br = !d && !r, bl = !d && !l;
  const h = TS / 2;
  fillR(c, px, py, TS, TS, GPAL[K].base);
  if (tl) fillR(c, px, py, h, h, cornerCol(nb(0, -1), nb(-1, 0)));
  if (tr) fillR(c, px + h, py, h, h, cornerCol(nb(0, -1), nb(1, 0)));
  if (br) fillR(c, px + h, py + h, h, h, cornerCol(nb(0, 1), nb(1, 0)));
  if (bl) fillR(c, px, py + h, h, h, cornerCol(nb(0, 1), nb(-1, 0)));
  const X0 = l ? px - ext : px, X1 = r ? px + TS + ext : px + TS, Y0 = u ? py - ext : py, Y1 = d ? py + TS + ext : py + TS;
  c.beginPath(); if (c.roundRect) c.roundRect(X0, Y0, X1 - X0, Y1 - Y0, [tl ? R : 0, tr ? R : 0, br ? R : 0, bl ? R : 0]); else c.rect(X0, Y0, X1 - X0, Y1 - Y0);
  c.fillStyle = GPAL[K].base;
  c.fill();
  c.save(); c.clip();
  if (K === 'grass') { for (let i = 0; i < 3; i++) { c.fillStyle = i % 2 ? 'rgba(70,110,40,.45)' : 'rgba(170,205,100,.45)'; c.beginPath(); c.ellipse(px + 3 + hash(x, y, 2 + i) * 18, py + 3 + hash(x, y, 9 + i) * 18, 1.7, 0.9, 0, 0, 6.3); c.fill(); }
    if (hash(x, y, 30) < 0.05) circ(c, px + 6 + hash(x, y, 31) * 12, py + 6 + hash(x, y, 32) * 12, 1.7, ['#f2d65a', '#ec8fa8', '#fbf7ec'][(hash(x, y, 33) * 3) | 0]); }
  else if (K === 'path') { for (let i = 0; i < 3; i++) { c.fillStyle = i % 2 ? 'rgba(150,115,65,.4)' : 'rgba(240,220,170,.55)'; c.beginPath(); c.ellipse(px + 3 + hash(x, y, 40 + i) * 18, py + 3 + hash(x, y, 50 + i) * 18, 1.8, 1.1, 0, 0, 6.3); c.fill(); } }
  else if (K === 'sand') { for (let i = 0; i < 4; i++) circ(c, px + 2 + hash(x, y, 2 + i) * 20, py + 2 + hash(x, y, 9 + i) * 20, 0.8, i % 2 ? 'rgba(180,150,90,.5)' : 'rgba(255,248,220,.7)'); if (hash(x, y, 40) < 0.04) circ(c, px + 12, py + 12, 1.8, '#f6eedf'); }
  else if (K === 'soil') { for (let i = 0; i < 3; i++) { c.fillStyle = 'rgba(80,52,28,.45)'; c.beginPath(); if (c.roundRect) c.roundRect(px + 1, py + 3 + i * 8, TS - 2, 3, 1.5); else c.rect(px + 1, py + 3 + i * 8, TS - 2, 3); c.fill(); fillR(c, px + 1, py + 2 + i * 8, TS - 2, 1, 'rgba(190,150,100,.4)'); } }
  else if (K === 'mount') { const g = c.createLinearGradient(0, py, 0, py + TS); g.addColorStop(0, 'rgba(255,255,255,.08)'); g.addColorStop(1, 'rgba(0,0,0,.12)'); c.fillStyle = g; c.fillRect(px, py, TS, TS); }
  else if (K === 'water') { const k = hash(x, y, 7); if (k < 0.3) { c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 1; c.beginPath(); c.moveTo(px + 5 + k * 20, py + 9 + k * 10); c.quadraticCurveTo(px + 8 + k * 20, py + 7 + k * 10, px + 11 + k * 20, py + 9 + k * 10); c.stroke(); } }
  if (y > 0 && roomAt[y - 1][x] >= 0) { const g = c.createLinearGradient(0, py, 0, py + 7); g.addColorStop(0, 'rgba(20,30,10,.35)'); g.addColorStop(1, 'rgba(20,30,10,0)'); c.fillStyle = g; c.fillRect(px, py, TS, 7); }
  if (x > 0 && roomAt[y][x - 1] >= 0) { const g = c.createLinearGradient(px, 0, px + 5, 0); g.addColorStop(0, 'rgba(20,30,10,.22)'); g.addColorStop(1, 'rgba(20,30,10,0)'); c.fillStyle = g; c.fillRect(px, py, 5, TS); }
  c.restore();
  if (!u || !r || !d || !l) {
    if (K === 'water') { c.lineWidth = 3; c.strokeStyle = 'rgba(240,250,255,.6)'; c.stroke(); c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,.9)'; c.stroke(); }
    else {
      const lower = [nb(0, -1), nb(1, 0), nb(0, 1), nb(-1, 0)].some(k => k && k !== K && GPRI[k] < GPRI[K]);
      if (lower) { c.lineWidth = K === 'grass' ? 2 : 1.8; c.strokeStyle = K === 'grass' ? 'rgba(58,90,32,.6)' : (GPAL[K].edge || 'rgba(0,0,0,.2)'); c.stroke(); }
    }
  }
  c.restore();
}
const TALL = new Set([T.TREE, T.ROCK, T.MOUNTAIN, T.TENT]);
// things that join the y-sorted pass (people, the forest sprites, the statue, Old Hoot...): each provider returns
// a list of { k: the row its feet stand on, f: draw(c) }
const YSORT = [];

/* ================= cosy interiors: cream-capped walls, stone wall faces, plank floors, outlined furniture ================= */
const IN = { cap: '#cdbf9f', capDk: '#b8a985', line: '#3a2e24', trim: '#8a5a34', stone: '#7c8288', stoneLt: '#8a9096', mortar: '#5e6368', base: '#cdbf9f',
  plank: ['#b08a5e', '#a88258', '#b89264'], seam: '#7a5a38', wood: '#9a6238', woodLt: '#b4794a', woodDk: '#6a4024' };
function obox(c, x, y, w, h, fill, r) { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r || 1.5); else c.rect(x, y, w, h); c.fillStyle = fill; c.fill(); c.lineWidth = 1; c.strokeStyle = IN.line; c.stroke(); }
function plankFloor(c, x, y, px, py, stone) {
  if (stone) {
    fillR(c, px, py, TS, TS, '#a39f96');
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const o = j % 2 ? 6 : 0; c.fillStyle = hash(x * 2 + i, y * 2 + j, 3) < 0.5 ? '#aeaaa0' : '#9a968c'; c.fillRect(px + i * 12 + 1 + (o && i === 0 ? 0 : 0), py + j * 12 + 1, 10.5, 10.5); }
    return;
  }
  for (let i = 0; i < 4; i++) {
    fillR(c, px + i * 6, py, 6, TS, IN.plank[(hash(x * 4 + i, 0, 5) * 3) | 0]);
    fillR(c, px + i * 6 + 5.3, py, 0.9, TS, IN.seam);
    const j = Math.floor(hash(x * 4 + i, y, 6) * 3); if (j < 2) fillR(c, px + i * 6, py + 4 + j * 9 + hash(x, y + i, 7) * 6, 5.3, 0.9, IN.seam);
    fillR(c, px + i * 6, py, 1, TS, 'rgba(255,255,255,.08)');
  }
}
function wallFace(c, x, y, px, py, room) {
  // the back wall seen from the front: cream cap, wooden trim, blue-grey stone, cream skirting
  fillR(c, px, py, TS, 7, IN.cap); fillR(c, px, py + 5.5, TS, 1.5, IN.capDk);
  fillR(c, px, py + 7, TS, 2, IN.trim); fillR(c, px, py + 9, TS, 0.8, IN.woodDk);
  fillR(c, px, py + 9.8, TS, 10.4, IN.stone);
  for (let r = 0; r < 2; r++) { const yy = py + 9.8 + r * 5.2, off = (r + x) % 2 ? 0 : 6; for (let i = -1; i < 3; i++) { const xx = px + off + i * 12; c.fillStyle = hash(x * 3 + i, y + r, 8) < 0.5 ? IN.stoneLt : IN.stone; c.fillRect(xx + 0.6, yy + 0.6, 10.8, 4); } fillR(c, px, yy + 4.6, TS, 0.6, IN.mortar); }
  fillR(c, px, py + 20.2, TS, 3.8, IN.base); fillR(c, px, py + 20.2, TS, 0.8, '#c9bc9a'); for (let i = 0; i < 2; i++) fillR(c, px + ((x % 2) ? 5 : 11) + i * 12, py + 20.2, 0.8, 3.8, '#c9bc9a');
  fillR(c, px, py, TS, 1, IN.line);
  // a window here and there
  const inner = x > room.x && x < room.x + room.w - 1;
  if (inner && x !== room.doorX && (x - room.x) % 3 === 2 && y === room.y) { obox(c, px + 6.5, py + 10.5, 11, 8.5, IN.woodDk, 1); fillR(c, px + 8, py + 12, 8, 5.5, '#6a7fd0'); fillR(c, px + 8, py + 12, 8, 2, '#8fa3e8'); fillR(c, px + 11.6, py + 12, 0.8, 5.5, IN.woodDk); fillR(c, px + 8, py + 14.4, 8, 0.8, IN.woodDk); }
}
function capBand(c, px, py, side) {
  // the top of a side or front wall, seen from above: a cream cap, dark on the outside edge, a soft shadow falling inside
  fillR(c, px, py, TS, TS, IN.cap);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) fillR(c, px + 2 + i * 5.5, py + 2 + j * 5.5, 2, 2, IN.capDk);
  if (side.includes('W')) { fillR(c, px, py, 1.2, TS, IN.line); fillR(c, px + TS - 3, py, 3, TS, 'rgba(60,45,30,.25)'); }
  if (side.includes('E')) { fillR(c, px + TS - 1.2, py, 1.2, TS, IN.line); fillR(c, px, py, 3, TS, 'rgba(60,45,30,.25)'); }
  if (side.includes('S')) { fillR(c, px, py + TS - 1.2, TS, 1.2, IN.line); fillR(c, px, py, TS, 3, 'rgba(60,45,30,.25)'); }
  if (side.includes('N')) fillR(c, px, py, TS, 1.2, IN.line);
}
function softRoomTile(c, x, y, room) {
  const t = grid[y][x], px = x * TS, py = y * TS;
  const N = y === room.y, S = y === room.y + room.h - 1, Wl = x === room.x, E = x === room.x + room.w - 1;
  const stone = room.floor === 'stone';
  if (t === T.WALL || (t === T.DOOR)) {
    // we always look at the north wall's face; the others show their tops
    if (t === T.DOOR) {
      plankFloor(c, x, y, px, py, stone);
      if (N) { wallFace(c, x, y, px, py, room); c.fillStyle = IN.woodDk; c.beginPath(); c.moveTo(px + 5, py + 24); c.lineTo(px + 5, py + 13); c.quadraticCurveTo(px + 12, py + 6, px + 19, py + 13); c.lineTo(px + 19, py + 24); c.closePath(); c.fill(); c.fillStyle = '#9a6238'; c.beginPath(); c.moveTo(px + 6.5, py + 24); c.lineTo(px + 6.5, py + 13.5); c.quadraticCurveTo(px + 12, py + 8, px + 17.5, py + 13.5); c.lineTo(px + 17.5, py + 24); c.closePath(); c.fill(); fillR(c, px + 11.6, py + 9, 0.8, 15, IN.woodDk); circ(c, px + 15, py + 18, 0.9, '#e0c060'); }
      else { fillR(c, px + 3, py + 4, 18, 16, '#9a3b3b'); fillR(c, px + 4, py + 5, 16, 14, '#b24a46'); for (let i = 0; i < 6; i++) fillR(c, px + 3.5 + i * 3, py + 20, 1, 2.5, '#9a3b3b'); }
      return true;
    }
    // the side walls run all the way up, so the back corners show wall tops, framing the back wall
    if (N && (Wl || E)) { capBand(c, px, py, (Wl ? 'W' : 'E') + 'N'); return true; }
    if (N) { wallFace(c, x, y, px, py, room); return true; }
    capBand(c, px, py, (Wl ? 'W' : '') + (E ? 'E' : '') + (S ? 'S' : ''));
    return true;
  }
  plankFloor(c, x, y, px, py, stone);
  const back = room.side === 'b' ? -1 : 1; // which way is the back wall: up (-1) or down (+1)
  switch (t) {
    case T.BED: {
      const bc = BLANKETS[(hash(x, y, 60) * 5) | 0], top = back < 0;
      softShadow(c, px + 12, py + 22, 10, 2.4, 0.35);
      obox(c, px + 3, py + 1.5, 18, 21, IN.wood, 2);
      const hy = top ? py + 2.5 : py + 17.5; fillR(c, px + 4, hy, 16, 4, IN.woodDk);
      obox(c, px + 5, top ? py + 6.5 : py + 12.5, 14, 5, '#f2e2ac', 1.5);
      const by = top ? py + 11.5 : py + 3, bh = 9.5;
      c.beginPath(); if (c.roundRect) c.roundRect(px + 4, by, 16, bh, 1.5); else c.rect(px + 4, by, 16, bh); c.fillStyle = bc; c.fill(); c.lineWidth = 1; c.strokeStyle = IN.line; c.stroke();
      fillR(c, px + 4.5, top ? by + 0.5 : by + bh - 2.5, 15, 2, 'rgba(255,255,255,.25)');
      return true;
    }
    case T.SEAT: {
      const st = (room.seats || []).find(q => q.x === x && q.y === y), f = st && st.face ? st.face : { dx: 0, dy: 1 };
      softShadow(c, px + 12, py + 20, 7, 2, 0.35);
      obox(c, px + 6.5, py + 7.5, 11, 10, IN.woodLt, 1.5);
      fillR(c, px + 7.5, py + 8.5, 9, 1.5, 'rgba(255,255,255,.18)');
      // the chair back sits on the side away from where it faces
      if (f.dy > 0) obox(c, px + 6.5, py + 3, 11, 4, IN.wood, 1); else if (f.dy < 0) obox(c, px + 6.5, py + 18, 11, 4, IN.wood, 1);
      else if (f.dx > 0) obox(c, px + 2.5, py + 6, 4, 12, IN.wood, 1); else obox(c, px + 17.5, py + 6, 4, 12, IN.wood, 1);
      return true;
    }
    case T.TABLE: {
      const tl = grid[y][x - 1] === T.TABLE, trr = grid[y][x + 1] === T.TABLE;
      const x0 = px + (tl ? 0 : 2), x1 = px + TS - (trr ? 0 : 2);
      fillR(c, x0, py + 19, x1 - x0, 3, 'rgba(0,0,0,.25)');
      c.fillStyle = IN.woodLt; c.fillRect(x0, py + 3, x1 - x0, 16);
      c.fillStyle = IN.wood; c.fillRect(x0, py + 15.5, x1 - x0, 3.5);
      fillR(c, x0, py + 8, x1 - x0, 0.8, 'rgba(90,55,25,.5)'); fillR(c, x0, py + 12, x1 - x0, 0.8, 'rgba(90,55,25,.5)');
      fillR(c, x0, py + 3, x1 - x0, 1, IN.line); fillR(c, x0, py + 19, x1 - x0, 1, IN.line);
      if (!tl) fillR(c, x0, py + 3, 1, 17, IN.line); if (!trr) fillR(c, x1 - 1, py + 3, 1, 17, IN.line);
      if (hash(x, y, 71) < 0.35) { circ(c, px + 12, py + 9.5, 3, IN.line); circ(c, px + 12, py + 9.5, 2.4, '#efe6cf'); }
      else if (hash(x, y, 71) < 0.5) { obox(c, px + 9, py + 5.5, 6, 6, '#3f4a7a', 2); circ(c, px + 12, py + 5, 1.5, '#ec8fa8'); }
      return true;
    }
    case T.BARREL: {
      softShadow(c, px + 12, py + 21, 8, 2.4, 0.35);
      obox(c, px + 5, py + 4, 14, 17, '#8a5a32', 3);
      for (let i = 0; i < 3; i++) fillR(c, px + 7 + i * 4, py + 5, 0.8, 15, 'rgba(60,35,15,.45)');
      fillR(c, px + 5, py + 8, 14, 1.4, '#3d3d3d'); fillR(c, px + 5, py + 16, 14, 1.4, '#3d3d3d');
      c.beginPath(); c.ellipse(px + 12, py + 6, 6, 2, 0, 0, 6.3); c.fillStyle = '#a67444'; c.fill(); c.strokeStyle = IN.line; c.lineWidth = 0.8; c.stroke();
      circ(c, px + 10, py + 5.8, 1.2, '#d2423a'); circ(c, px + 13.5, py + 6, 1.2, '#e0a93f');
      return true;
    }
    case T.SHELF: {
      softShadow(c, px + 12, py + 22, 10, 2, 0.3);
      obox(c, px + 2, py + 2, 20, 20, IN.wood, 1.5); fillR(c, px + 3.5, py + 3.5, 17, 7.5, IN.woodDk); fillR(c, px + 3.5, py + 12.5, 17, 7.5, IN.woodDk);
      const cols = ['#c9463c', '#3f6fb0', '#e0b040', '#5a9a4c', '#8a5ab0'];
      for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) { const h2 = 5 + hash(x + i, y + r, 80) * 2.4; fillR(c, px + 4 + i * 3.3, py + (r ? 19.5 : 10.5) - h2, 2.6, h2, cols[(hash(x + i, y + r, 81) * 5) | 0]); }
      return true;
    }
    case T.RUG: {
      c.beginPath(); if (c.roundRect) c.roundRect(px + 1, py + 1, 22, 22, 4); else c.rect(px + 1, py + 1, 22, 22); c.fillStyle = '#a33a3a'; c.fill();
      c.beginPath(); if (c.roundRect) c.roundRect(px + 3, py + 3, 18, 18, 3); else c.rect(px + 3, py + 3, 18, 18); c.strokeStyle = '#d07a5a'; c.lineWidth = 0.8; c.stroke();
      return true;
    }
    case T.COUNTER: {
      fillR(c, px, py + 20, TS, 2.5, 'rgba(0,0,0,.25)'); obox(c, px - 0.5, py + 4, TS + 1, 16, IN.wood, 0); fillR(c, px, py + 5, TS, 4, IN.woodLt);
      if (hash(x, y, 70) < 0.6) { obox(c, px + 8, py + 7, 6, 6, '#d8d2c0', 1); circ(c, px + 11, py + 8.5, 1.4, '#e0a93f'); }
      return true;
    }
    case T.PEW: { softShadow(c, px + 12, py + 20, 11, 2, 0.3); obox(c, px + 1, py + 6, 22, 11, IN.woodLt, 1.5); fillR(c, px + 1.5, py + (back < 0 ? 15 : 6.5), 21, 2.5, IN.woodDk); return true; }
    case T.ALTAR: { obox(c, px - 0.5, py + 4, TS + 1, 15, '#e8e0cc', 0); fillR(c, px, py + 10, TS, 4, '#c9a44c'); if ((x + y) % 3 === 0) { fillR(c, px + 11, py + 1, 2, 6, '#fff3c8'); circ(c, px + 12, py + 0.8, 1.3, '#ffd36a'); } return true; }
    case T.FLOOR: return true;
  }
  return false;
}
