/* ================= TrueSight: what the player can actually see (Nox-style line of sight) =================
   Visibility, not lighting. From the player's eye, rays go out to every corner of every obstacle on screen (and a hair either side of
   each corner); each ray stops at the first thing it hits. The hit points, in order of angle, are the VISIBILITY POLYGON: walls give
   straight edges, corners sharp turns, doorways openings. Everything outside it is covered by darkness, and people outside it are not drawn.
   The view reaches the edge of the screen: there is no radius. Night, lamps and shadows stay with the lighting (lighting-wild.ts).

   Obstacles come from the tile grid (the same walls people bump into):
     walls, mountains, closed doors      a full tile          (windows in a back wall let sight through)
     trees                               a box inside the tile (you see past its edges, not through the trunk and crown)
     boulders                            a smaller box
   Furniture, crates and people never block the view.
   NPC perception is separate: tsLine(a, b) answers "is there a clear line?" on the same geometry, for any system that wants it,
   with its own range and rules.                                                                                                          */
const TSIGHT: any = { on: true, poly: null, hits: null, key: '', rect: null, eye: null, ms: 0, cv: null, K: 8 };
const TS_INSET: any = { tree: 0.24, rock: 0.3 };
/** is this back-wall tile a window (see room drawing in render/village.ts) */
function tsWindow(x, y) {
  const ri = roomAt[y] && roomAt[y][x]; if (ri == null || ri < 0) return false; const r = rooms[ri]; if (!r || r.dead || r.noWindows) return false;
  return y === r.y && x !== r.x && x !== r.x + r.w - 1 && x !== r.doorX && (x - r.x) % 3 === 2;
}
/** is this door open: somebody is at it, it is propped open, or (for public buildings) it is opening hours */
function tsDoorOpen(x, y) { const d = doors.find(q => q.x === x && q.y === y); if (!d) return true; return !d.shut && (d.o > 0.5 || !!d.propped); }
/** what a tile does to sight: 0 nothing, 1 a full block, or the inset of the box that blocks */
function tsOcc(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return 1; const t = grid[y][x];
  if (t === T.WALL) return tsWindow(x, y) ? 0 : 1;
  if (t === T.MOUNTAIN) return 1;
  if (t === T.DOOR) return tsDoorOpen(x, y) ? 0 : 1;
  if (t === T.TREE) return TS_INSET.tree;
  if (t === T.ROCK) return TS_INSET.rock;
  return 0;
}
/** cast a ray from (ox, oy) along (dx, dy) (unit), at most tMax tiles; returns { t, cx, cy } of the first hit (cx = -1 when nothing was hit) */
function tsCast(ox, oy, dx, dy, tMax, occ = tsOcc) {
  let cx = Math.floor(ox), cy = Math.floor(oy); const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
  const tdx = dx !== 0 ? Math.abs(1 / dx) : Infinity, tdy = dy !== 0 ? Math.abs(1 / dy) : Infinity;
  let tmx = dx !== 0 ? ((sx > 0 ? cx + 1 - ox : ox - cx) * tdx) : Infinity, tmy = dy !== 0 ? ((sy > 0 ? cy + 1 - oy : oy - cy) * tdy) : Infinity, tIn = 0, first = true;
  const EPS = 1e-9;
  for (let guard = 0; guard < 400; guard++) {
    if (!first) { const o = occ(cx, cy);
      if (o === 1) return { t: tIn, cx, cy };
      if (o > 0) { // a box inside the tile: slab test
        const x0 = cx + o, x1 = cx + 1 - o, y0 = cy + o, y1 = cy + 1 - o;
        let a = -Infinity, b = Infinity;
        if (dx !== 0) { const t1 = (x0 - ox) / dx, t2 = (x1 - ox) / dx; a = Math.max(a, Math.min(t1, t2)); b = Math.min(b, Math.max(t1, t2)); } else if (ox < x0 || ox > x1) b = -1;
        if (dy !== 0) { const t1 = (y0 - oy) / dy, t2 = (y1 - oy) / dy; a = Math.max(a, Math.min(t1, t2)); b = Math.min(b, Math.max(t1, t2)); } else if (oy < y0 || oy > y1) b = -1;
        if (b >= a && b > 0 && a <= tMax) return { t: Math.max(a, 0), cx, cy };
      } }
    first = false;
    const tNext = Math.min(tmx, tmy); if (tNext > tMax) return { t: tMax, cx: -1, cy: -1 };
    if (Math.abs(tmx - tmy) < EPS) {      // through a corner exactly: two walls touching corner to corner do not leak
      if (occ(cx + sx, cy) === 1 && occ(cx, cy + sy) === 1) return { t: tmx, cx: cx + sx, cy };
      tIn = tmx; cx += sx; cy += sy; tmx += tdx; tmy += tdy;
    } else if (tmx < tmy) { tIn = tmx; cx += sx; tmx += tdx; } else { tIn = tmy; cy += sy; tmy += tdy; }
  }
  return { t: tMax, cx: -1, cy: -1 };
}
/** the visibility polygon from the eye, inside the rectangle (tile coords). Returns { pts: [[x, y]...] in angle order, hits: Set of 'x,y' cells whose faces are seen } */
function tsPolygon(ex, ey, R) {
  const verts: number[][] = [[R.x0, R.y0], [R.x1, R.y0], [R.x1, R.y1], [R.x0, R.y1]];
  const full = (x, y) => tsOcc(x, y) === 1;
  // corners of the full-tile shapes: grid points where the boundary turns (not along a straight wall, not inside one)
  for (let gy = Math.floor(R.y0); gy <= Math.ceil(R.y1); gy++) for (let gx = Math.floor(R.x0); gx <= Math.ceil(R.x1); gx++) {
    const a = full(gx - 1, gy - 1), b = full(gx, gy - 1), c = full(gx - 1, gy), d = full(gx, gy), n = +a + +b + +c + +d;
    if (n === 1 || n === 3 || (n === 2 && a === d)) verts.push([gx, gy]);
  }
  // corners of trees and boulders
  for (let y = Math.floor(R.y0); y < Math.ceil(R.y1); y++) for (let x = Math.floor(R.x0); x < Math.ceil(R.x1); x++) {
    const o = tsOcc(x, y); if (o > 0 && o < 1) verts.push([x + o, y + o], [x + 1 - o, y + o], [x + 1 - o, y + 1 - o], [x + o, y + 1 - o]);
  }
  const out: number[][] = [], hits = new Set<string>(), E = 1e-4;
  const exitT = (dx, dy) => { let t = Infinity; if (dx > 0) t = Math.min(t, (R.x1 - ex) / dx); if (dx < 0) t = Math.min(t, (R.x0 - ex) / dx); if (dy > 0) t = Math.min(t, (R.y1 - ey) / dy); if (dy < 0) t = Math.min(t, (R.y0 - ey) / dy); return Math.max(0, t); };
  for (const [vx, vy] of verts) {
    const base = Math.atan2(vy - ey, vx - ex);
    for (const a of [base - E, base, base + E]) {
      const dx = Math.cos(a), dy = Math.sin(a), h = tsCast(ex, ey, dx, dy, exitT(dx, dy));
      out.push([a, ex + dx * h.t, ey + dy * h.t]); if (h.cx >= 0) hits.add(h.cx + ',' + h.cy);
    }
  }
  out.sort((p, q) => p[0] - q[0]);
  return { pts: out.map(p => [p[1], p[2]]), hits };
}
/** every obstacle with a face you can see: a wall face turned towards you with a clear line to it, a tree or boulder you can see an edge of */
function tsFaces(ex, ey, R, hits) {
  const out = new Set<string>(hits), clear = (bx, by) => { const dx = bx - ex, dy = by - ey, d = Math.hypot(dx, dy); return d < 1e-6 || tsCast(ex, ey, dx / d, dy / d, d).cx < 0; };
  for (let y = Math.floor(R.y0); y < Math.ceil(R.y1); y++) for (let x = Math.floor(R.x0); x < Math.ceil(R.x1); x++) {
    const win = (grid[y][x] === T.WALL && tsWindow(x, y)) || grid[y][x] === T.DOOR, o = win ? 1 : tsOcc(x, y);   // windows and doorways are part of the wall you look at if (!o || out.has(x + ',' + y)) continue;
    if (o === 1) { for (const [fx, fy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) { if (tsOcc(x + fx, y + fy) === 1) continue; const mx = x + 0.5 + fx * 0.52, my = y + 0.5 + fy * 0.52;
        if ((ex - mx) * fx + (ey - my) * fy <= 0) continue; if (clear(mx, my)) { out.add(x + ',' + y); break; } } }
    else { const a = o - 0.03, b = 1 - o + 0.03; for (const [px, py] of [[a, a], [b, a], [b, b], [a, b], [0.5, a], [0.5, b], [a, 0.5], [b, 0.5]]) if (clear(x + px, y + py)) { out.add(x + ',' + y); break; } }
  }
  return out;
}
/** a clear line between two points (tile coords) on the same geometry; used for the player's view of a point, and open to NPC perception */
function tsLine(ax, ay, bx, by, occ = tsOcc) {
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy); if (d < 1e-6) return true;
  const h = tsCast(ax, ay, dx / d, dy / d, d, occ); return h.cx < 0 || (h.cx === Math.floor(bx) && h.cy === Math.floor(by) && h.t >= d - 0.75);
}
/** is TrueSight in charge right now (a player to see for, and not zoomed out to the map) */
const tsActive = () => TSIGHT.on && !!game.player && !game.player.dead && cam.z >= 0.6;
/** the player's eye, where they are drawn this frame */
function tsEye(now) { const p = game.player, s = typeof gaSlide === 'function' ? gaSlide(p, now) : [p.x, p.y]; return [s[0] + 0.5, s[1] + 0.55]; }
/** can the player see this tile position (a person standing at x, y)? */
function tsSees(x, y) {
  if (!tsActive() || !TSIGHT.eye) return true; const R = TSIGHT.rect, px = x + 0.5, py = y + 0.6;
  if (R && (px < R.x0 || px > R.x1 || py < R.y0 || py > R.y1)) return false;
  return tsLine(TSIGHT.eye[0], TSIGHT.eye[1], px, py);
}
/** recompute the polygon when the eye, the view or a door has changed */
function tsUpdate(now) {
  const eye = tsEye(now), M = 2, R = { x0: Math.max(0, cam.x / TS - M), y0: Math.max(0, cam.y / TS - M), x1: Math.min(W, (cam.x + cam.cw / cam.z) / TS + M), y1: Math.min(H, (cam.y + cam.ch / cam.z) / TS + M) };
  let ds = ''; for (const d of doors) if (d.x >= R.x0 - 1 && d.x <= R.x1 && d.y >= R.y0 - 1 && d.y <= R.y1) ds += tsDoorOpen(d.x, d.y) ? '1' : '0';
  const key = eye[0].toFixed(3) + ',' + eye[1].toFixed(3) + '|' + [R.x0, R.y0, R.x1, R.y1].map(v => v.toFixed(2)).join(',') + '|' + ds + '|' + (town.gridV || 0);
  if (key === TSIGHT.key) return; const t0 = performance.now();
  const P = tsPolygon(eye[0], eye[1], R); TSIGHT.poly = P.pts; TSIGHT.hits = tsFaces(eye[0], eye[1], R, P.hits); TSIGHT.rect = R; TSIGHT.eye = eye; TSIGHT.key = key; TSIGHT.ms = performance.now() - t0;
}
/** public buildings keep their doors open during the day, so you can look in from the street */
const TS_PUBLIC = new Set(['tavern', 'bakery', 'smithy', 'shop', 'thermopolium', 'baths', 'macellum', 'church']);
function tsPropDoors() { const h = (game.time % 1440) / 60; for (const d of doors) { const r = rooms[d.room]; d.propped = !!(r && !r.dead && TS_PUBLIC.has(r.kind) && h >= 8 && h < 20); } }
/** the darkness over everything the player cannot see (world coordinates; drawn after the world and the lighting) */
function drawTrueSight(c, now) {
  if (!tsActive()) { TSIGHT.eye = null; return; }
  tsUpdate(now); const R = TSIGHT.rect, K = TSIGHT.K, w = Math.ceil((R.x1 - R.x0) * K), h = Math.ceil((R.y1 - R.y0) * K);
  if (!TSIGHT.cv) TSIGHT.cv = document.createElement('canvas'); const cv = TSIGHT.cv; if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const g = cv.getContext('2d'); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, w, h); g.fillStyle = '#04060a'; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
  const X = x => (x - R.x0) * K, Y = y => (y - R.y0) * K, pts = TSIGHT.poly;
  g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); g.closePath(); g.fill();
  // the faces of what stops your eye are seen: a wall you look at, a tree (its crown stands a tile above its trunk)
  for (const k of TSIGHT.hits) { const [x, y] = k.split(',').map(Number), t = grid[y] && grid[y][x], up = t === T.TREE ? 1.2 : t === T.ROCK ? 0.4 : 0; g.fillRect(X(x), Y(y - up), K, K * (1 + up)); }
  // people you can see are seen whole, even where their head stands against a dark patch
  for (const n of npcs) { if (n.dead || n.inShip || !(n.player || tsSees(n.x, n.y))) continue; const s = typeof gaSlide === 'function' ? gaSlide(n, now) : [n.x, n.y]; g.fillRect(X(s[0] - 0.05), Y(s[1] - 0.6), K * 1.1, K * 1.55); }
  g.globalCompositeOperation = 'source-over';
  const sm = c.imageSmoothingEnabled; c.imageSmoothingEnabled = true; c.globalAlpha = 0.96; c.drawImage(cv, R.x0 * TS, R.y0 * TS, (R.x1 - R.x0) * TS, (R.y1 - R.y0) * TS); c.globalAlpha = 1; c.imageSmoothingEnabled = sm;
}

/* ---------------- the TrueSight test ground (tests and tools/truesight.mjs; never called by the game itself) ----------------
   Cleared ground with: a building of three rooms (an open archway between the first two, a shut door to the third), a corridor with three
   corners, a house with windows in its back wall, trees, a shed, and two walls touching only at a corner. Returns the named places.     */
function tsLab() {
  const LW = 46, LH = 32; let ox = -1, oy = -1;
  for (let t = 0; t < 4000 && ox < 0; t++) { const x = 4 + Math.floor(Math.random() * (W - LW - 8)), y = 4 + Math.floor(Math.random() * (H - LH - 8)); let ok = true;
    for (let j = y - 1; j < y + LH + 1 && ok; j++) for (let i = x - 1; i < x + LW + 1; i++) { const g = grid[j][i]; if (roomAt[j][i] >= 0 || g === T.WATER || g === T.MOUNTAIN || (town.hgt && town.hgt[j * W + i] >= 0)) { ok = false; break; } }
    if (ok) { ox = x; oy = y; } }
  if (ox < 0) return null;
  for (let j = oy; j < oy + LH; j++) for (let i = ox; i < ox + LW; i++) { setT(i, j, T.GRASS); if (town.siteAt) town.siteAt[j * W + i] = 0; }
  if (town.sites) town.sites = town.sites.filter(st => st.x + (st.w || 1) < ox || st.x > ox + LW || st.y + (st.h || 1) < oy || st.y > oy + LH);
  if (town.crops) town.crops = town.crops.filter(c => c.x < ox || c.x >= ox + LW || c.y < oy || c.y >= oy + LH);
  const room = (x, y, w, h, name, side = 'b') => buildRoom({ kind: 'lab', id: 'lab' + rooms.length, name }, ox + x, oy + y, w, h, side, null);
  const shutDoor = (x, y) => { const d = doors.find(q => q.x === ox + x && q.y === oy + y); if (d) d.shut = true; else { setT(ox + x, oy + y, T.DOOR); doors.push({ x: ox + x, y: oy + y, room: roomAt[oy + y][ox + x], o: 0, shut: true }); } };
  // 1. three rooms in a row, sharing walls; an open archway between the first two, a shut door to the third (whose own way out is shut too)
  const A = room(0, 0, 7, 7, 'Room A'), B = room(6, 0, 7, 7, 'Room B'), C = room(12, 0, 7, 7, 'Room C');
  setT(ox + 6, oy + 3, T.FLOOR); shutDoor(12, 3); shutDoor(15, 6);
  // 2. a corridor with three corners inside a walled block (in at the bottom left, out of sight at the top right)
  const K = room(22, 0, 17, 14, 'Corridor'); for (let j = 1; j < 13; j++) for (let i = 1; i < 16; i++) setT(ox + 22 + i, oy + j, T.WALL);
  const lane = [[2, 8, 2, 12], [2, 8, 13, 8], [13, 2, 13, 8], [6, 2, 13, 2]];
  for (const [x1, y1, x2, y2] of lane) for (let j = Math.min(y1, y2); j <= Math.max(y1, y2); j++) for (let i = Math.min(x1, x2); i <= Math.max(x1, x2); i++) setT(ox + 22 + i, oy + j, T.FLOOR);
  const kd = doors.find(q => q.room === rooms.indexOf(K)); if (kd) { setT(kd.x, kd.y, T.WALL); doors.splice(doors.indexOf(kd), 1); } setT(ox + 24, oy + 13, T.DOOR); doors.push({ x: ox + 24, y: oy + 13, room: rooms.indexOf(K), o: 1, propped: true }); K.doorX = ox + 24; K.doorY = oy + 13;
  // 3. a house with windows in its back wall (door at the bottom)
  const Hh = room(0, 12, 10, 6, 'Window House');
  // 4. outdoors: trees, a shed, and two walls that touch only corner to corner
  for (const [x, y] of [[14, 14], [16, 17], [13, 20], [18, 21], [15, 24], [20, 15]]) setT(ox + x, oy + y, T.TREE);
  const Sh = room(26, 20, 5, 5, 'Shed'); shutDoor(28, 24);
  for (let i = 0; i < 4; i++) { setT(ox + 36 + i, oy + 22, T.WALL); setT(ox + 40 + i, oy + 23, T.WALL); }
  town.treeDirty = true; town.treeCache = null; if (typeof markDirty === 'function') markDirty(ox, oy, LW, LH); if (typeof refreshReach === 'function') refreshReach(); rebuildOcc();
  return { ox, oy, A, B, C, K, H: Hh, shed: Sh };
}
