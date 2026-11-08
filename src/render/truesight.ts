/* ================= TrueSight: what the player can actually see (Nox-style line of sight) =================
   Visibility, not lighting. BUILDINGS are polygons: walls are as thick as they are drawn, and their edges are straight line segments
   (an outer corner casts from the outermost point of its tile; a doorway is an opening between two jambs, so the beam through it is bounded by
   the inside corners of the door frame; a window is a gap in the middle of its tile). From the player's eye a ray goes to every end of every
   segment (and a hair either side); each ray stops at the first segment it meets. The hit points, in order of angle, are the VISIBILITY
   POLYGON: a wall gives a straight edge, a corner a sharp turn, a doorway an opening. Everything outside the polygon is covered by darkness,
   cut along those straight lines (not along tiles).
   Only buildings block sight: walls, closed doors, and the solid bits either side of a window. Trees, boulders, furniture, crates and people
   never do; you see around and past them.
   What you see of a wall is a strip of it behind each stretch of face a sight line reaches, so a glancing view shows a sliver, never a whole tile.
   NPC perception is separate: tsLine(a, b) answers "is there a clear line?" on the same segments, for any system that wants it, with its
   own range and rules.                                                                                                                 */
const TSIGHT: any = { on: true, poly: null, hits: null, key: '', rect: null, eye: null, ms: 0, cv: null, geo: null, geoKey: '' };
/** is this back-wall tile a window (see room drawing in render/village.ts) */
function tsWindow(x, y) {
  if (town.win && town.win.has(y * W + x)) return true;   // (a window block in a free-form wall)
  const ri = roomAt[y] && roomAt[y][x]; if (ri == null || ri < 0) return false; const r = rooms[ri]; if (!r || r.dead || r.noWindows) return false;
  return y === r.y && x !== r.x && x !== r.x + r.w - 1 && x !== r.doorX && (x - r.x) % 3 === 2;
}
/** is this door open: somebody is at it, it is propped open, or (for public buildings) it is opening hours */
function tsDoorOpen(x, y) { const d = doors.find(q => q.x === x && q.y === y); if (!d) return true; return !d.shut && (d.o > 0.5 || !!d.propped); }
/** what a wall-ring tile is to sight: 1 solid, 0 open (an open door or an archway), 2 a window (open in the middle only) */
function tsTile(x, y) {
  const t = grid[y] && grid[y][x]; if (t === T.DOOR) return tsDoorOpen(x, y) ? 0 : 1; if (t !== T.WALL) return 0; return tsWindow(x, y) ? 2 : 1;
}

/* ---------------- the geometry: segments in a grid, so a ray only meets the ones near it ---------------- */
const TS_CELL = 2;
/** segments (x1, y1, x2, y2 ... flat), the wall tiles to show when seen, and a cell grid over the map.
    Walls are as thick as they are drawn: every wall tile is a solid square, and the segments are the straight edges of the solid parts, merged along each wall.
    So a building's outer corner casts from the outermost point of its corner tile, and a doorway is a real opening between two door jambs: the beam through
    it is bounded by the inside corners of the door frame. A window is a gap in the middle of its tile with a solid piece either side. */
function tsBuild() {
  const full = (x, y) => x >= 0 && y >= 0 && x < W && y < H && ((grid[y][x] === T.WALL && !tsWindow(x, y)) || (grid[y][x] === T.DOOR && !tsDoorOpen(x, y)));
  const win = (x, y) => x >= 0 && y >= 0 && x < W && y < H && grid[y][x] === T.WALL && tsWindow(x, y);
  const hard = (x, y) => full(x, y) || win(x, y);
  const hE = new Map<number, number[][]>(), vE = new Map<number, number[][]>(), walls: any[] = [];
  const addH = (y, x1, x2) => { let l = hE.get(y); if (!l) hE.set(y, l = []); l.push([x1, x2]); }, addV = (x, y1, y2) => { let l = vE.get(x); if (!l) vE.set(x, l = []); l.push([y1, y2]); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = grid[y][x]; if (t !== T.WALL && t !== T.DOOR) continue;
    if (full(x, y)) {
      const pts: number[][] = [];
      if (!hard(x, y - 1)) { addH(y, x, x + 1); pts.push([x + 0.5, y], [x + 0.15, y], [x + 0.85, y]); } if (!hard(x, y + 1)) { addH(y + 1, x, x + 1); pts.push([x + 0.5, y + 1], [x + 0.15, y + 1], [x + 0.85, y + 1]); }
      if (!hard(x - 1, y)) { addV(x, y, y + 1); pts.push([x, y + 0.5], [x, y + 0.15], [x, y + 0.85]); } if (!hard(x + 1, y)) { addV(x + 1, y, y + 1); pts.push([x + 1, y + 0.5], [x + 1, y + 0.15], [x + 1, y + 0.85]); }
      walls.push({ x, y, pts: pts.length ? pts : [[x + 0.5, y + 0.5]] });
    } else if (win(x, y)) {   // a window: a solid piece either side of a gap in the middle (the back wall, so it runs along x)
      addH(y, x, x + 0.25); addH(y + 1, x, x + 0.25); addV(x + 0.25, y, y + 1); addH(y, x + 0.75, x + 1); addH(y + 1, x + 0.75, x + 1); addV(x + 0.75, y, y + 1);
      if (!hard(x - 1, y)) addV(x, y, y + 1); if (!hard(x + 1, y)) addV(x + 1, y, y + 1);
      walls.push({ x, y, pts: [[x + 0.5, y + 0.5], [x + 0.125, y], [x + 0.875, y], [x + 0.125, y + 1], [x + 0.875, y + 1]] });
    }
  }
  // merge the straight edges along each line into single segments
  const seg: number[] = [], merge = (m: Map<number, number[][]>, horiz: boolean) => { for (const [k, list] of m) { list.sort((a, b) => a[0] - b[0]); let cur = list[0].slice();
    for (let n = 1; n < list.length; n++) { const e = list[n]; if (e[0] <= cur[1] + 1e-6) cur[1] = Math.max(cur[1], e[1]); else { horiz ? seg.push(cur[0], k, cur[1], k) : seg.push(k, cur[0], k, cur[1]); cur = e.slice(); } }
    horiz ? seg.push(cur[0], k, cur[1], k) : seg.push(k, cur[0], k, cur[1]); } };
  merge(hE, true); merge(vE, false);
  // a cell grid over the map: each cell lists the segments that pass through it
  const cw = Math.ceil(W / TS_CELL), ch = Math.ceil(H / TS_CELL), cells: (number[] | null)[] = new Array(cw * ch).fill(null);
  for (let s = 0; s < seg.length; s += 4) {
    const x1 = seg[s], y1 = seg[s + 1], x2 = seg[s + 2], y2 = seg[s + 3], n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / (TS_CELL * 0.5))); let last = -1;
    for (let i = 0; i <= n; i++) { const px = x1 + (x2 - x1) * i / n, py = y1 + (y2 - y1) * i / n, cx = Math.min(cw - 1, Math.max(0, Math.floor(px / TS_CELL))), cy = Math.min(ch - 1, Math.max(0, Math.floor(py / TS_CELL))), k = cy * cw + cx; if (k !== last) { last = k; (cells[k] || (cells[k] = [])).push(s); }
      // a segment along a cell border also belongs to the cell next door
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1]]) { const nx = Math.floor((px + 1e-6 * dx) / TS_CELL), ny = Math.floor((py + 1e-6 * dy) / TS_CELL); if ((dx && nx !== cx) || (dy && ny !== cy)) { const k2 = Math.min(ch - 1, ny) * cw + Math.min(cw - 1, nx); if (k2 !== k && !(cells[k2] && cells[k2].includes(s))) (cells[k2] || (cells[k2] = [])).push(s); } } }
  }
  return { seg, walls, cells, cw, ch };
}
/** the nearest segment a ray meets: { t, s } (s = -1 when it reaches tMax first). Inclusive at segment ends, so two walls touching corner to corner do not leak. */
function tsRay(G, ox, oy, dx, dy, tMax) {
  const seg = G.seg, cells = G.cells, cw = G.cw, ch = G.ch; let best = tMax, bs = -1;
  let cx = Math.floor(ox / TS_CELL), cy = Math.floor(oy / TS_CELL); const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
  const tdx = dx !== 0 ? Math.abs(TS_CELL / dx) : Infinity, tdy = dy !== 0 ? Math.abs(TS_CELL / dy) : Infinity;
  let tmx = dx !== 0 ? ((sx > 0 ? (cx + 1) * TS_CELL - ox : ox - cx * TS_CELL) * Math.abs(1 / dx)) : Infinity, tmy = dy !== 0 ? ((sy > 0 ? (cy + 1) * TS_CELL - oy : oy - cy * TS_CELL) * Math.abs(1 / dy)) : Infinity;
  for (let guard = 0; guard < 2000; guard++) {
    if (cx >= 0 && cy >= 0 && cx < cw && cy < ch) { const L = cells[cy * cw + cx];
      if (L) for (let i = 0; i < L.length; i++) { const s = L[i], x1 = seg[s], y1 = seg[s + 1], ex = seg[s + 2] - x1, ey = seg[s + 3] - y1, den = dx * ey - dy * ex; if (den > -1e-12 && den < 1e-12) continue;
        const px = x1 - ox, py = y1 - oy, t = (px * ey - py * ex) / den, u = (px * dy - py * dx) / den; if (t >= -1e-9 && t < best && u >= -1e-7 && u <= 1 + 1e-7) { best = t; bs = s; } } }
    const tn = Math.min(tmx, tmy); if (tn > best || tn > tMax) break;
    if (tmx < tmy) { cx += sx; tmx += tdx; } else { cy += sy; tmy += tdy; }
    if ((cx < 0 && sx < 0) || (cy < 0 && sy < 0) || (cx >= cw && sx > 0) || (cy >= ch && sy > 0)) break;
  }
  return { t: best, s: bs };
}
/** the visibility polygon from the eye, inside the rectangle (tile coords): points in order of angle */
function tsPolygon(ex, ey, R, G = tsGeo()) {
  const ends: number[][] = [[R.x0, R.y0], [R.x1, R.y0], [R.x1, R.y1], [R.x0, R.y1]], seg = G.seg;
  for (let s = 0; s < seg.length; s += 4) for (let k = 0; k < 4; k += 2) { const x = seg[s + k], y = seg[s + k + 1]; if (x >= R.x0 - 1 && x <= R.x1 + 1 && y >= R.y0 - 1 && y <= R.y1 + 1) ends.push([x, y]); }
  const out: number[][] = [], E = 2e-4;
  const exitT = (dx, dy) => { let t = Infinity; if (dx > 1e-12) t = Math.min(t, (R.x1 - ex) / dx); if (dx < -1e-12) t = Math.min(t, (R.x0 - ex) / dx); if (dy > 1e-12) t = Math.min(t, (R.y1 - ey) / dy); if (dy < -1e-12) t = Math.min(t, (R.y0 - ey) / dy); return Math.max(0, t); };
  for (const [vx, vy] of ends) {
    const base = Math.atan2(vy - ey, vx - ex);
    for (const a of [base - E, base + E]) { const dx = Math.cos(a), dy = Math.sin(a), h = tsRay(G, ex, ey, dx, dy, exitT(dx, dy)); out.push([a, ex + dx * h.t, ey + dy * h.t, h.s]); }
  }
  out.sort((p, q) => p[0] - q[0]);
  const pts: any = out.map(p => [p[1], p[2]]); pts.segs = out.map(p => p[3]);   // segs: the wall segment each point lies on (-1: the edge of the view)
  return pts;
}
/** the wall you can see, and only the part you can see: along every stretch of the polygon that lies on a wall face, a strip of wall (one tile deep) behind it.
    A glancing view of a wall gives a sliver; nothing is switched on as a whole tile. Returns quads in tile coordinates. */
function tsFaces(ex, ey, pts, G = tsGeo(), depth = 1) {
  const quads: number[][] = [], n = pts.length, seg = G.seg;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, s = pts.segs[i]; if (s < 0 || s !== pts.segs[j]) continue;
    const a = pts[i], b = pts[j]; if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) < 1e-5) continue;
    let nx = -(seg[s + 3] - seg[s + 1]), ny = seg[s + 2] - seg[s], l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    if ((ex - a[0]) * nx + (ey - a[1]) * ny > 0) { nx = -nx; ny = -ny; }   // pointing away from you, into the wall
    // a hair of overlap (along the face and back into the lit floor) so neighbouring strips and the polygon never show a seam
    let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx = tx / tl * 0.03; ty = ty / tl * 0.03; const o = 0.03;
    let a0 = a[0] - tx - nx * o, a1 = a[1] - ty - ny * o, b0 = b[0] + tx - nx * o, b1 = b[1] + ty - ny * o;
    // an inner corner: where the face ends at the segment's own end and the wall carries on round the corner (solid ahead and solid beside), the corner tile is shown too
    { const ux = tx / 0.03, uy = ty / 0.03, hard = (px, py) => tsTile(Math.floor(px), Math.floor(py)) >= 1, ends = [[seg[s], seg[s + 1]], [seg[s + 2], seg[s + 3]]], at = (p, q) => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) < 0.02;
      const corner = (p, dx, dy) => ends.some(q => at(p, q)) && hard(p[0] + dx * 0.5 + nx * 0.5, p[1] + dy * 0.5 + ny * 0.5) && hard(p[0] + dx * 0.5 - nx * 0.5, p[1] + dy * 0.5 - ny * 0.5);
      if (corner(a, -ux, -uy)) { a0 -= ux; a1 -= uy; } if (corner(b, ux, uy)) { b0 += ux; b1 += uy; } }
    quads.push([a0, a1, b0, b1, b0 + nx * (depth + o), b1 + ny * (depth + o), a0 + nx * (depth + o), a1 + ny * (depth + o)]);
  }
  return quads;
}
/** is the point (tile coords) in a clear line from the eye? (nothing of any building between them) */
function tsClear(G, ex, ey, px, py, slack = 0) {
  const dx = px - ex, dy = py - ey, d = Math.hypot(dx, dy); if (d < 1e-6) return true; return tsRay(G, ex, ey, dx / d, dy / d, d - slack).s < 0;
}
/** the wall tiles you can see (shown whole): a wall tile counts as seen when a ray reaches its middle or either end; an open door or window when its middle is seen */
function tsWalls(ex, ey, R, G = tsGeo()) {
  const out = new Set<string>();
  for (const w of G.walls) {
    if (w.x + 1 < R.x0 - 1 || w.x > R.x1 + 1 || w.y + 1 < R.y0 - 1 || w.y > R.y1 + 1) continue;
    for (const p of w.pts) if (tsClear(G, ex, ey, p[0], p[1], 0.03)) { out.add(w.x + ',' + w.y); break; }
  }
  return out;
}
/** a clear line between two points (tile coords) on the building geometry; open to NPC perception */
function tsLine(ax, ay, bx, by) { return tsClear(tsGeo(), ax, ay, bx, by); }
/** the geometry, rebuilt when the map or a door changes */
function tsGeo() {
  let ds = ''; for (const d of doors) ds += tsDoorOpen(d.x, d.y) ? '1' : '0';
  const key = (town.gridV || 0) + '|' + rooms.length + '|' + ds; if (key !== TSIGHT.geoKey || !TSIGHT.geo) { TSIGHT.geo = tsBuild(); TSIGHT.geoKey = key; } return TSIGHT.geo;
}
/** is TrueSight in charge right now (a player to see for, and not zoomed out to the map) */
const tsActive = () => TSIGHT.on && !!game.player && !game.player.dead && cam.z >= 0.6;
/** the player's eye, where they are drawn this frame */
function tsEye(now) { const p = game.player, s = typeof gaSlide === 'function' ? gaSlide(p, now) : [p.x, p.y]; return [s[0] + 0.5, s[1] + 0.55]; }
/** can the player see this tile position (a person standing at x, y)? */
function tsSees(x, y) {
  if (!tsActive() || !TSIGHT.eye || !TSIGHT.geo) return true; const R = TSIGHT.rect, px = x + 0.5, py = y + 0.6;
  if (R && (px < R.x0 || px > R.x1 || py < R.y0 || py > R.y1)) return false;
  return tsClear(TSIGHT.geo, TSIGHT.eye[0], TSIGHT.eye[1], px, py);
}
/** recompute the polygon when the eye, the view or a door has changed */
function tsUpdate(now) {
  const eye = tsEye(now), M = 2, R = { x0: Math.max(0, cam.x / TS - M), y0: Math.max(0, cam.y / TS - M), x1: Math.min(W, (cam.x + cam.cw / cam.z) / TS + M), y1: Math.min(H, (cam.y + cam.ch / cam.z) / TS + M) };
  const G = tsGeo(), key = eye[0].toFixed(3) + ',' + eye[1].toFixed(3) + '|' + [R.x0, R.y0, R.x1, R.y1].map(v => v.toFixed(2)).join(',') + '|' + TSIGHT.geoKey;
  if (key === TSIGHT.key && TSIGHT.poly) return; const t0 = performance.now();
  TSIGHT.poly = tsPolygon(eye[0], eye[1], R, G); TSIGHT.faces = tsFaces(eye[0], eye[1], TSIGHT.poly, G); TSIGHT.hits = tsWalls(eye[0], eye[1], R, G); TSIGHT.rect = R; TSIGHT.eye = eye; TSIGHT.key = key; TSIGHT.ms = performance.now() - t0;
}
/** public buildings keep their doors open during the day, so you can look in from the street */
const TS_PUBLIC = new Set(['tavern', 'bakery', 'smithy', 'shop', 'thermopolium', 'baths', 'macellum', 'church', 'mill']);
function tsPropDoors() { const h = (game.time % 1440) / 60; for (const d of doors) { const r = rooms[d.room]; d.propped = !!(r && !r.dead && TS_PUBLIC.has(r.kind) && h >= 8 && h < 20); } }
/** the darkness over everything the player cannot see (drawn in world coordinates after the world and the lighting) */
function drawTrueSight(c, now) {
  if (!tsActive()) { TSIGHT.eye = null; return; }
  tsUpdate(now); const cv = c.canvas; if (!TSIGHT.cv) TSIGHT.cv = document.createElement('canvas'); const sc = TSIGHT.cv; if (sc.width !== cv.width || sc.height !== cv.height) { sc.width = cv.width; sc.height = cv.height; }
  const g = sc.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, sc.width, sc.height); g.fillStyle = 'rgba(4,6,10,0.97)'; g.fillRect(0, 0, sc.width, sc.height);
  g.setTransform(c.getTransform()); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000';
  g.beginPath(); TSIGHT.poly.forEach((p, i) => i ? g.lineTo(p[0] * TS, p[1] * TS) : g.moveTo(p[0] * TS, p[1] * TS)); g.closePath(); g.fill();
  for (const q of TSIGHT.faces) { g.beginPath(); for (let i = 0; i < 8; i += 2) i ? g.lineTo(q[i] * TS, q[i + 1] * TS) : g.moveTo(q[i] * TS, q[i + 1] * TS); g.closePath(); g.fill(); }   // the wall behind each visible stretch of face
  g.globalCompositeOperation = 'source-over';
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(sc, 0, 0); c.restore();
}

/* ---------------- the TrueSight test ground (tests and tools/truesight.mjs; never called by the game itself) ----------------
   Cleared ground with: a building of three rooms (an open archway between the first two, a shut door to the third), a corridor with three
   corners, a house with windows in its back wall, trees (scenery: they do not block), a shed, and two walls touching only at a corner. Returns the named places.     */
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
