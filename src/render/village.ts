/* ================= the village, painted =================
   The ground is painted in chunks of 8 x 8 tiles at whatever resolution the camera needs (and kept while it is useful); everything that stands on it
   is a painted sprite from the Greenhollow set; villagers are paper dolls. The game's own tiles, rooms and people decide what goes where. */
const GA: any = { CT: 8, LODS: [12, 24, 48, 96], chunks: new Map(), px: 0, maxPx: 56e6, frame: 0, ov: null, ovc: null, shal: null, seed: 7, boost: 0, hour: 12, stats: { bake: 0, baked: 0, ms: 0 } };
const OVP = 4;                                       // pixels a tile in the overview
const gaFrame = (it, now, ph) => it.frames <= 1 ? 0 : Math.floor(now / 1000 * (it.fps || it.frames / 2) + (ph || 0)) % it.frames;
function gaDraw(c, id, x, y, now, ph) { const it = ART.BYID[id]; if (!it) return; c.drawImage(ART.frameOf(it, gaFrame(it, now, ph)), x, y + TS - it.gh, it.gw, it.gh); }
const gaOnScreen = (x, y, m) => { const sx = (x * TS - cam.x) * cam.z, sy = (y * TS - cam.y) * cam.z; return sx > -m * cam.z * TS && sy > -m * cam.z * TS && sx < cam.cw + m * cam.z * TS && sy < cam.ch + m * cam.z * TS; };

/* ---- what is where: the corners of a tile decide how it blends ---- */
const gaK = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 'water' : gclass(x, y);
function gaLevel(vx, vy) {                           // 0 deep sea, 1 shallows, 2 sand, 3 grass: land wins over water, sand over grass
  let land = false, sand = false, shal = false;
  for (let j = vy - 1; j <= vy; j++) for (let i = vx - 1; i <= vx; i++) {
    const K = gaK(i, j);
    if (K === 'water') { if (i >= 0 && j >= 0 && i < W && j < H && GA.shal[j * W + i]) shal = true; }
    else { land = true; if (K === 'sand') sand = true; }
  }
  return land ? (sand ? 2 : 3) : (shal ? 1 : 0);
}
const gaPathV = (vx, vy) => gaK(vx - 1, vy - 1) === 'path' || gaK(vx, vy - 1) === 'path' || gaK(vx - 1, vy) === 'path' || gaK(vx, vy) === 'path';
const gaFlat = (i, j) => i >= 0 && j >= 0 && i < W && j < H && town.hgt[j * W + i] >= 0;
function gaFlatV(vx, vy) {                           // the mud runs out to the water, and rounds off against the dry sand
  let f = 0; for (let j = vy - 1; j <= vy; j++) for (let i = vx - 1; i <= vx; i++) { if (gaFlat(i, j)) f++; else if (gaK(i, j) !== 'water') return false; }
  return f > 0;
}
const GA_LAYERS = ['shallow', 'sand', 'grass'];
function gaTerrain(g, x, y, wt) {
  if (lvlOf(y) >= 1) {   // another level: nothing (SKY), a roof deck (stone) you can walk and build on, or the earth below the island
    const X = x * TS, Y = y * TS, t = grid[y][x];
    if (t === T.SKY) return;   // transparent, so the ground below shows through, dimmed (render)
    if (isMineY(y)) {
      const v = (ART.h32(x, y, GA.seed, 4) * 4) | 0, hh = n => ART.h32(x, y, n, n);
      if (t === T.EARTH) { g.drawImage(ART.terr('soil', v & 1), X, Y, TS, TS); g.fillStyle = 'rgba(34,20,10,.5)'; g.fillRect(X, Y, TS, TS);
        for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? 'rgba(20,12,6,.5)' : 'rgba(150,120,90,.35)'; g.fillRect(X + 2 + hh(20 + i) * 18, Y + 2 + hh(30 + i) * 18, 2 + hh(40 + i) * 2.4, 1.6 + hh(50 + i) * 2); }
        const o = town.ore && town.ore[y * W + x]; if (o) { const col = o === 1 ? '#d27a3e' : o === 2 ? '#38c2a0' : '#f4cc38'; for (let i = 0; i < 5; i++) { g.fillStyle = '#1d1410'; g.fillRect(X + 3 + hh(60 + i) * 15, Y + 3 + hh(70 + i) * 15, 4.2, 3.6); g.fillStyle = col; g.fillRect(X + 3.5 + hh(60 + i) * 15, Y + 3.4 + hh(70 + i) * 15, 3.2, 2.6); } } return; }
      g.drawImage(ART.terr('path', v), X, Y, TS, TS); g.fillStyle = 'rgba(24,14,8,.4)'; g.fillRect(X, Y, TS, TS);
      if (t === T.STAIRU || t === T.STAIRM) { const it = ART.BYID[stairSpriteId(t, x, y)]; if (it) g.drawImage(ART.frameOf(it, 0), X, Y, TS, TS); }   // (a stair up to the way you came, or a stair down to the next mine)
      return;
    }
    g.drawImage(ART.terr('stone', 1), X, Y, TS, TS);
    if (t === T.STAIRD || t === T.STAIR) { const it = ART.BYID[stairSpriteId(t, x, y)]; if (it) g.drawImage(ART.frameOf(it, 0), X, Y, TS, TS); }   // (the way down, or a stair up to a higher roof)
    return;
  }
  const X = x * TS, Y = y * TS, v = (ART.h32(x, y, GA.seed, 4) * 4) | 0, D = im => g.drawImage(im, X, Y, TS, TS);
  const lv = [gaLevel(x, y), gaLevel(x + 1, y), gaLevel(x + 1, y + 1), gaLevel(x, y + 1)], masks = [1, 2, 3].map(L => { let m = 0; for (let i = 0; i < 4; i++) if (lv[i] >= L) m |= 1 << i; return m; });
  if (wt && masks[1] === 0) { wt.push(x, y, masks[0]); return; }              // open water: painted afresh each frame
  let top = -1; for (let i = 2; i >= 0; i--) if (masks[i] === 15) { top = i; break; }
  if (top < 0) D(ART.water('deep', 0));
  for (let i = Math.max(top, 0); i < 3; i++) { const m = masks[i]; if (!m) continue; D(m === 15 ? (i === 0 ? ART.water('shallow', 0) : ART.terr(GA_LAYERS[i], v)) : ART.overlay(GA_LAYERS[i], m, 0)); }
  let pm = 0; if (gaPathV(x, y)) pm |= 1; if (gaPathV(x + 1, y)) pm |= 2; if (gaPathV(x + 1, y + 1)) pm |= 4; if (gaPathV(x, y + 1)) pm |= 8;
  if (pm) D(pm === 15 ? ART.terr('path', v) : ART.overlay('path', pm, 0));
  if (town.hgt) { let fm = 0; if (gaFlatV(x, y)) fm |= 1; if (gaFlatV(x + 1, y)) fm |= 2; if (gaFlatV(x + 1, y + 1)) fm |= 4; if (gaFlatV(x, y + 1)) fm |= 8; if (fm === 15) { const q = (ART.h32(x, y, 9, 9) * 8) | 0; g.save(); g.translate(X + TS / 2, Y + TS / 2); g.rotate((q & 3) * Math.PI / 2); if (q & 4) g.scale(-1, 1); g.drawImage(ART.terr('flats', v & 1), -TS / 2, -TS / 2, TS, TS); g.restore(); } else if (fm) D(ART.overlay('flats', fm, 0)); }
  if (grid[y][x] === T.CROP) D(ART.terr('soil', v & 1));
}

/* ---- the buildings: the cutaway rooms ---- */
function gaCap(r, x, y) { const N = y === r.y, Sx = y === r.y + r.h - 1, Wl = x === r.x, E = x === r.x + r.w - 1; if (N && (Wl || E)) return 'cap_' + (Wl ? 'W' : 'E') + 'N'; const s = (Wl ? 'W' : '') + (E ? 'E' : '') + (Sx ? 'S' : ''); return s === '' ? 'cap_plain' : 'cap_' + s; }
function gaFurniture(r, x, y, t) {
  const hh = n => ART.h32(x, y, n, n);
  switch (t) {
    case T.BED: { const b = (r.beds || []).find(q => q.x === x && q.y === y); return `bed_head_${(r.side === 'b') !== !!(b && b.flip) ? 'up' : 'down'}_${b && !(b.owner && !b.owner.dead) ? 5 : (hh(60) * 5) | 0}`; }
    case T.SEAT: { if (r.kind === 'privy') return 'toilet'; const s = (r.seats || []).find(q => q.x === x && q.y === y), f = s && s.face ? s.face : { dx: 0, dy: 1 }; return 'seat_' + (f.dy > 0 ? 'down' : f.dy < 0 ? 'up' : f.dx > 0 ? 'right' : 'left'); }
    case T.TABLE: { const l = grid[y][x - 1] === T.TABLE, rr = grid[y][x + 1] === T.TABLE, part = l && rr ? 'mid' : l ? 'right' : rr ? 'left' : 'single', d = hh(71); return `table_${part}_${d < 0.35 ? 'plate' : d < 0.5 ? 'vase' : 'plain'}`; }
    case T.STAIR: case T.STAIRM: return stairSpriteId(t, x, y);
    case T.BARREL: return 'barrel'; case T.SHELF: return 'shelf_' + ((x + y) & 1); case T.RUG: return ['rug', 'rug_1', 'rug_2'][Math.floor(hh(72) * 3)];
    case T.COUNTER: return 'counter_' + (hh(70) < 0.6 ? 0 : 1); case T.PEW: return 'pew'; case T.ALTAR: return (x + y) % 3 === 0 ? 'altar_1' : 'altar_0';
    case T.FORGE: return 'forge'; case T.ANVIL: return 'anvil'; case T.LOOM: return 'loom'; case T.OVEN: return 'oven';
  }
  return null;
}
function gaRoomTile(g, x, y) {
  const r = rooms[roomAt[y][x]], t = grid[y][x], X = x * TS, Y = y * TS, v = (ART.h32(x, y, 5, 5) * 2) | 0, fk = r.floor === 'stone' ? 'stone' : 'wood';
  const P = id => { const it = ART.BYID[id]; if (it) g.drawImage(ART.frameOf(it, 0), X, Y, TS, TS); };
  if (r.free) { gaFreeTile(g, r, x, y, t, X, Y, v, fk, P); return; }
  if (t === T.WALL || t === T.DOOR) {
    if (t === T.DOOR) { g.drawImage(ART.terr(fk, v), X, Y, TS, TS); if (y === r.y) P('wall_face'); return; }
    if (y === r.y && x !== r.x && x !== r.x + r.w - 1) { P(x !== r.doorX && (x - r.x) % 3 === 2 ? 'wall_window' : 'wall_face'); return; }
    P(gaCap(r, x, y)); return;
  }
  g.drawImage(ART.terr(fk, v), X, Y, TS, TS);
  if (t === T.POOL) { lf2DrawPool(g, x, y); return; }
  const f = gaFurniture(r, x, y, t); if (f) P(f);
}
/** a tile of a free-form room: the walls are chosen by their neighbours (a face where the floor lies just below, otherwise a cap with an outline on each open side) */
const gaSolidW = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (grid[y][x] === T.WALL || grid[y][x] === T.DOOR);
const gaInside = (x, y) => x >= 0 && y >= 0 && x < W && y < H && grid[y][x] === T.FLOOR && roomAt[y][x] >= 0 && !!rooms[roomAt[y][x]] && !!rooms[roomAt[y][x]].free;
function gaFreeTile(g, r, x, y, t, X, Y, v, fk, P) {
  if (t === T.DOOR) { g.drawImage(ART.terr(fk, v), X, Y, TS, TS); if (gaInside(x, y + 1)) P('wall_face'); return; }
  if (t === T.WALL) {
    if (gaInside(x, y + 1)) { P(town.win && town.win.has(y * W + x) ? 'wall_window' : 'wall_face'); return; }
    const k = (!gaSolidW(x - 1, y) ? 'W' : '') + (!gaSolidW(x + 1, y) ? 'E' : '') + (!gaSolidW(x, y - 1) && !gaInside(x, y - 1) ? 'N' : '') + (!gaSolidW(x, y + 1) ? 'S' : '');
    P(k === '' ? 'cap_plain' : 'cap_' + k); if (town.winS && town.winS.has(y * W + x)) P('window_side'); return;   // (a window in a side wall: the glass is set across the top of the wall)
  }
  g.drawImage(ART.terr(fk, v), X, Y, TS, TS);
  if (t === T.STAIR || t === T.STAIRM) { const it = ART.BYID[stairSpriteId(t, x, y)]; if (it) g.drawImage(ART.frameOf(it, 0), X, Y, TS, TS); }   // (a staircase in a room you built)
}
function gaRoomShade(g, r, k) {                      // the walls hold their own shade inside, and the furniture sits on the floor
  if (r.free) return;
  g.save(); g.beginPath(); g.rect((r.x + 1) * TS, (r.y + 1) * TS, (r.w - 2) * TS, (r.h - 2) * TS); g.clip();
  const X0 = (r.x + 1) * TS, Y0 = (r.y + 1) * TS, X1 = (r.x + r.w - 1) * TS, Y1 = (r.y + r.h - 1) * TS;
  const strip = (x0, y0, x1, y1, a) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, `rgba(54,40,74,${a})`); gr.addColorStop(1, 'rgba(54,40,74,0)'); g.fillStyle = gr; };
  strip(0, Y0, 0, Y0 + 1.5 * TS, 0.34); g.fillRect(X0, Y0, X1 - X0, 1.5 * TS);
  strip(X0, 0, X0 + 1.1 * TS, 0, 0.22); g.fillRect(X0, Y0, 1.1 * TS, Y1 - Y0);
  strip(X1, 0, X1 - 1.1 * TS, 0, 0.16); g.fillRect(X1 - 1.1 * TS, Y0, 1.1 * TS, Y1 - Y0);
  strip(0, Y1, 0, Y1 - 0.9 * TS, 0.14); g.fillRect(X0, Y1 - 0.9 * TS, X1 - X0, 0.9 * TS);
  g.filter = 'blur(' + Math.max(0.6, TS * 0.05 * k) + 'px)'; g.fillStyle = 'rgba(50,34,60,0.26)';
  for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) { if (roomAt[y][x] < 0) continue; const t = grid[y][x]; if (t === T.RUG || !gaFurniture(r, x, y, t)) continue; g.fillRect(x * TS + TS * 0.08, y * TS + TS * 0.62, TS * 0.98, TS * 0.42); }
  g.restore();
}
function gaBuildingShade(g, r, k) {                  // (switched off: buildings throw no shade for now)
  if (!LF2.shadows) return;
  g.save(); g.filter = 'blur(' + Math.max(0.6, TS * 0.07 * k) + 'px)'; g.fillStyle = 'rgba(48,52,116,0.3)'; g.fillRect((r.x + 0.55) * TS, (r.y + 0.5) * TS, r.w * TS, r.h * TS);
  g.fillStyle = 'rgba(48,52,116,0.14)'; g.fillRect((r.x + 0.9) * TS, (r.y + 0.9) * TS, r.w * TS, r.h * TS); g.restore();
}

/* ---- the things that stand on a tile ---- */
function gaSpriteId(x, y, t) {
  switch (t) {
    case T.TREE: { const kind = treeKind(x, y); return 'tree_' + kind + '_' + Math.floor(hash(x, y, 102) * (kind === 'oldpine' || (kind as string) === 'pine' ? 2 : 3)); }
    case T.ROCK: return 'boulder_' + Math.floor(hash(x, y, 64) * 4);
    case T.MOUNTAIN: return 'crag_' + Math.floor(hash(x, y, 6) * 4);
    case T.TENT: return 'tent_' + Math.floor(hash(x, y, 91) * 4);
    case T.STALL: { const sk = typeof stallKindAt === 'function' ? stallKindAt(x, y) : ''; return 'stall_' + (sk ? sk + '_' : '') + (((x >> 1) + y) % 4); }
    case T.GRAVE: { const k = hash(x, y, 90); return k < 0.45 ? 'grave_stone' : k < 0.8 ? 'grave_cross' : 'grave_cross2'; }
  }
  return null;
}
function gaStand(g, x, y, t) { const id = gaSpriteId(x, y, t), it = id && ART.BYID[id]; if (it) g.drawImage(ART.frameOf(it, 0), x * TS, y * TS + TS - it.gh, it.gw, it.gh); }
function gaWell(g) { const w = town.well; if (w) g.drawImage(ART.frameOf((ART.BYID as any).well, 0), w.x * TS, w.y * TS, 2 * TS, 2 * TS); }

/* ---- a chunk of ground ---- */
function gaPaintRect(g, x0, y0, w, h, k, wt) {
  const x1 = Math.min(W, x0 + w), y1 = Math.min(H, y0 + h);
  g.save(); g.beginPath(); g.rect(x0 * TS, y0 * TS, (x1 - x0) * TS, (y1 - y0) * TS); g.clip();
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (roomAt[y][x] < 0) gaTerrain(g, x, y, wt);
  const near = rooms.filter(r => !r.dead && r.x + r.w + 1 > x0 && r.x - 1 < x1 && r.y + r.h + 1 > y0 && r.y - 1 < y1);
  for (const r of near) gaBuildingShade(g, r, k);
  /* shade under every canopy, laid on the grass before the trees stand on it */
  if (LF2.shadows) { let any = false; g.save(); g.filter = 'blur(' + Math.max(0.6, TS * 0.16 * k) + 'px)'; g.fillStyle = 'rgba(34,58,112,0.24)'; g.beginPath();
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (grid[y][x] === T.TREE) { any = true; const cx = (x + 0.5) * TS, cy = (y + 0.86) * TS, rx = TS * 0.32, ry = TS * 0.104; g.moveTo(cx + rx, cy); g.ellipse(cx, cy, rx, ry, 0, 0, 6.2832); }
    if (any) g.fill(); g.restore(); }
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (roomAt[y][x] >= 0) gaRoomTile(g, x, y);
  for (const r of near) { gaRoomShade(g, r, k); if (r.free) continue; const ri = rooms.indexOf(r); g.save(); ART.roomDress(g, r, ri, doors.filter(d => d.room === ri).map(d => d.x), GA.seed); g.restore(); }
  for (let y = y0; y <= Math.min(H - 1, y1); y++) for (let x = x0; x < x1; x++) { if (roomAt[y][x] >= 0) continue; const t = grid[y][x]; if (t === T.TREE && wt && TREES.on) continue; if (t === T.TREE || t === T.ROCK || t === T.MOUNTAIN || t === T.TENT || t === T.STALL || t === T.GRAVE) gaStand(g, x, y, t); else if ((t === T.STAIR || t === T.STAIRM) && lvlOf(y) === 0) { const it = ART.BYID[stairSpriteId(t, x, y)]; if (it) g.drawImage(ART.frameOf(it, 0), x * TS, y * TS, TS, TS); } }
  const wl = town.well; if (wl && wl.x + 2 > x0 && wl.x < x1 && wl.y + 2 > y0 && wl.y < y1) gaWell(g);
  g.restore();
}
const gaKey = (li, cx, cy) => li * 1e6 + cy * 1000 + cx;
function gaBake(li, cx, cy) {
  const t0 = performance.now(), pp = GA.LODS[li], n = GA.CT * pp, key = gaKey(li, cx, cy);
  let ch = GA.chunks.get(key);
  if (!ch) { ch = { cv: document.createElement('canvas'), li, cx, cy, stale: true, used: GA.frame }; ch.cv.width = ch.cv.height = n; GA.chunks.set(key, ch); GA.px += n * n; }
  const g = ch.cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, n, n); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  const k = pp / TS; g.setTransform(k, 0, 0, k, -cx * GA.CT * pp, -cy * GA.CT * pp);
  const wt = li >= 1 ? [] : null; gaPaintRect(g, cx * GA.CT, cy * GA.CT, GA.CT, GA.CT, k, wt); ch.wt = wt && wt.length ? wt : null;
  ch.stale = false; ch.used = GA.frame; GA.stats.baked++; GA.stats.ms += performance.now() - t0;
  return ch;
}
function gaEvict() {
  if (GA.px < GA.maxPx) return;
  const all = [...GA.chunks.entries()].sort((a, b) => a[1].used - b[1].used);
  for (const [key, ch] of all) { if (GA.px < GA.maxPx * 0.7 || ch.used >= GA.frame - 1) break; GA.px -= ch.cv.width * ch.cv.height; ch.cv.width = ch.cv.height = 1; GA.chunks.delete(key); }
}

/* ---- the whole island at a glance, for when the camera is far out (and while a chunk is still being painted) ---- */
function gaTileColour(x, y) {
  if (lvlOf(y) >= 1) return null;   // (the other levels are not in the overview: its smoothing would bleed a grey band round a roof)
  if (roomAt[y][x] >= 0) { const t = grid[y][x]; return t === T.WALL || t === T.DOOR ? '#a69a80' : '#9c7a52'; }
  const t = grid[y][x], K = gclass(x, y);
  if (t === T.TREE) return '#3f7a3a'; if (t === T.ROCK) return '#8c8f92'; if (t === T.MOUNTAIN) return '#8f9488'; if (t === T.TENT) return '#cdbf94'; if (t === T.STALL) return '#b5683a'; if (t === T.GRAVE) return '#7d9a6a';
  if (K === 'water') return GA.shal[y * W + x] ? '#58b0bf' : '#3f8aa8';
  if (K === 'sand') return town.hgt && town.hgt[y * W + x] >= 0 ? '#d4c192' : '#ead9a4';
  if (K === 'path') return '#d2b57c'; if (K === 'soil') return '#8c6a45';
  return '#79a845';
}
function gaOverview() {
  const cv = GA.ov || (GA.ov = document.createElement('canvas')); cv.width = W * OVP; cv.height = H * OVP; const g = GA.ovc = cv.getContext('2d');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const col = gaTileColour(x, y); if (!col) continue; g.fillStyle = col; g.fillRect(x * OVP, y * OVP, OVP, OVP); }
}
function gaOverviewRect(x0, y0, x1, y1) { const g = GA.ovc; if (!g) return; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { g.fillStyle = gaTileColour(x, y); g.fillRect(x * OVP, y * OVP, OVP, OVP); } }

/* ---- the game's hooks ---- */
function buildStatic() {
  dirtyList = []; GA.chunks.clear(); GA.px = 0; GA.seed = ((town.seed | 0) % 997 + 997) % 997 + 7; GA.boost = 3;
  const sh = GA.shal = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (grid[y][x] !== T.WATER) continue; let near = false; for (let j = -2; j <= 2 && !near; j++) for (let i = -2; i <= 2; i++) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < W && yy < H && grid[yy][xx] !== T.WATER) { near = true; break; } } if (near) sh[y * W + x] = 1; }
  waterList = []; gaNearFlats(); gaOverview();
  darkCanvas.width = Math.round(W * TS * DK); darkCanvas.height = Math.round(H * TS * DK); dctx.setTransform(DK, 0, 0, DK, 0, 0);
}
function flushDirty() {
  if (!dirtyList.length) return;
  const list = dirtyList; dirtyList = [];
  for (const r of list) {
    const x0 = Math.max(0, r.x - 1), y0 = Math.max(0, r.y - 1), x1 = Math.min(W, r.x + r.w + 1), y1 = Math.min(H, r.y + r.h + 1);
    gaOverviewRect(x0, y0, x1, y1);
    const cx0 = Math.floor(x0 / GA.CT), cx1 = Math.floor((x1 - 1) / GA.CT), cy0 = Math.floor(y0 / GA.CT), cy1 = Math.floor((y1 - 1) / GA.CT);
    for (let li = 0; li < GA.LODS.length; li++) for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) { const ch = GA.chunks.get(gaKey(li, cx, cy)); if (ch) ch.stale = true; }
  }
}
const gaFi = now => Math.floor(now / 1000 * ART.FR / 2) % ART.FR;
function drawGround(c, now) {
  GA.frame++; const fi = gaFi(now);
  const Z = cam.z * cam.dpr, s = Z * TS;
  c.imageSmoothingEnabled = true; c.drawImage(GA.ov, 0, 0, W * TS, H * TS);
  if (s < 7) return;
  const li = s < 18 ? 0 : s < 36 ? 1 : s < 72 ? 2 : 3, CTp = GA.CT * TS;
  const vx0 = Math.max(0, Math.floor(cam.x / CTp)), vy0 = Math.max(0, Math.floor(cam.y / CTp)), vx1 = Math.min(Math.ceil(W / GA.CT) - 1, Math.floor((cam.x + cam.cw / cam.z) / CTp)), vy1 = Math.min(Math.ceil(H / GA.CT) - 1, Math.floor((cam.y + cam.ch / cam.z) / CTp));
  const t0 = performance.now(), budget = GA.boost > 0 ? 900 : 8; if (GA.boost > 0) GA.boost--;
  const cxm = (cam.x + cam.cw / cam.z / 2) / CTp, cym = (cam.y + cam.ch / cam.z / 2) / CTp, todo = [];
  for (let cy = vy0; cy <= vy1; cy++) for (let cx = vx0; cx <= vx1; cx++) todo.push({ cx, cy, d: Math.hypot(cx + 0.5 - cxm, cy + 0.5 - cym) });
  todo.sort((a, b) => a.d - b.d);
  for (const q of todo) {
    let ch = GA.chunks.get(gaKey(li, q.cx, q.cy));
    if ((!ch || ch.stale) && performance.now() - t0 < budget) ch = gaBake(li, q.cx, q.cy);
    if (!ch) { for (const alt of [li + 1, li - 1, li + 2, li - 2]) { if (alt < 0 || alt > 3) continue; const a = GA.chunks.get(gaKey(alt, q.cx, q.cy)); if (a) { ch = a; break; } } }   // something coarser or finer until the right one is ready
    if (!ch) continue;
    ch.used = GA.frame;
    if (ch.wt && ch.li >= 1) { const w = ch.wt; for (let i = 0; i < w.length; i += 3) { const X = w[i] * TS, Y = w[i + 1] * TS, m = w[i + 2]; if (m === 15) c.drawImage(ART.water('shallow', fi), X, Y, TS, TS); else { c.drawImage(ART.water('deep', fi), X, Y, TS, TS); if (m) c.drawImage(ART.overlay('shallow', m, fi), X, Y, TS, TS); } } }
    c.drawImage(ch.cv, q.cx * CTp, q.cy * CTp, CTp, CTp);
  }
  gaEvict();
}

/* ---- what moves and what changes: drawn every frame, over the visible ground only ---- */
const gaView = () => ({ x0: Math.max(0, Math.floor(cam.x / TS) - 1), y0: Math.max(0, Math.floor(cam.y / TS) - 1), x1: Math.min(W, Math.ceil((cam.x + cam.cw / cam.z) / TS) + 1), y1: Math.min(H, Math.ceil((cam.y + cam.ch / cam.z) / TS) + 2) });
function drawTreeSprite(c, px, py, x, y, ox, oy) { const it = ART.BYID[gaSpriteId(x, y, T.TREE)]; if (it) c.drawImage(ART.frameOf(it, 0), px + (ox || 0), py + (oy || 0) + TS - it.gh, it.gw, it.gh); }
function drawBoulder(c, x, y, px, py) { const it = ART.BYID[gaSpriteId(x, y, T.ROCK)]; if (it) c.drawImage(ART.frameOf(it, 0), px, py + TS - it.gh, it.gw, it.gh); }
function drawTallTile(c, x, y, t) { const id = gaSpriteId(x, y, t), it = id && ART.BYID[id]; if (it) c.drawImage(ART.frameOf(it, 0), x * TS, y * TS + TS - it.gh, it.gw, it.gh); }
function drawDoors(c, dt) {
  tsPropDoors();
  for (const d of doors) {
    let near = !!d.propped && !d.shut;
    for (const n of npcs) if (Math.abs(n.x - d.x) + Math.abs(n.y - d.y) < 1.7) { near = true; break; }
    if (d.shut) near = false; d.o += ((near ? 1 : 0) - d.o) * Math.min(1, dt * 9);
    if (!gaOnScreen(d.x, d.y, 1)) continue;
    const r = rooms[d.room]; if (!r) continue; const op = d.o > 0.5, fk = r.floor === 'stone' ? 'stone' : 'wood';
    c.drawImage(ART.terr(fk, (ART.h32(d.x, d.y, 5, 5) * 2) | 0), d.x * TS, d.y * TS, TS, TS);
    gaDraw(c, (r.free ? gaInside(d.x, d.y + 1) : d.y === r.y) ? (op ? 'door_back_open' : 'door_back_closed') : (op ? 'door_mat_open' : 'door_mat_closed'), d.x * TS, d.y * TS, 0, 0);
  }
}
function cropHoles(c, X, Y) {
  for (const [hx, hy] of [[0.2, 0.74], [0.5, 0.78], [0.8, 0.74]]) { const x = X + hx * TS, y = Y + hy * TS;
    c.fillStyle = 'rgba(160,118,74,.85)'; c.beginPath(); c.ellipse(x, y - 0.6, TS * 0.12, TS * 0.075, 0, 0, 6.3); c.fill();   // (the earth thrown up round the rim)
    c.fillStyle = '#24160b'; c.beginPath(); c.ellipse(x, y, TS * 0.09, TS * 0.055, 0, 0, 6.3); c.fill();
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(x, y + 0.5, TS * 0.07, TS * 0.035, 0, 0, 6.3); c.fill();
    c.fillStyle = '#8a6239'; c.fillRect(x + TS * 0.11, y - TS * 0.05, 1.1, 1.1); c.fillRect(x - TS * 0.14, y + TS * 0.02, 1, 1); }
}
function drawCrops(c, now) {
  if (!town.crops) return; const v = gaView();
  for (const t of town.crops) {
    if (t.x < v.x0 || t.x >= v.x1 || t.y < v.y0 || t.y >= v.y1) continue;
    const st = t.pl ? cropStage(t) : -1;   // -1 untilled (rough and weedy), 0 ploughed (dark furrows), 1-4 growing
    if (st > 0) gaDraw(c, 'crop_0', t.x * TS, t.y * TS, now, 0);   // the ploughed earth under whatever is growing
    const sd = st > 0 && t.seed && t.seed !== 'barley' && IT_SEEDS[t.seed] ? t.seed : null;   // every other crop and flower has its own plant
    gaDraw(c, sd ? 'crop_' + sd + '_' + (itWilted(t) ? 5 : Math.min(4, st)) : st < 0 ? 'crop_raw' : 'crop_' + Math.min(4, st), t.x * TS, t.y * TS, now, t.x + t.y);
    if (t.holes && !t.st && t.pl) cropHoles(c, t.x * TS, t.y * TS);   // (pulled up: the holes the crop came out of, until the plot is sown again)
  }
}
function drawNodes(c, now) {
  const v = gaView();
  for (const nd of town.nodes) {
    if (nd.x < v.x0 || nd.x >= v.x1 || nd.y < v.y0 || nd.y >= v.y1) continue; const f = nd.amt / nd.max, s = f <= 0.05 ? 0 : f < 0.6 ? 1 : 2;
    const bid = (nd.kind === 'berry' ? 'berry_' : 'herb_') + s; if (typeof treesLive === 'function' && treesLive()) drawBushSway(c, bid, nd.x, nd.y, now, nd.x * 3 + nd.y); else gaDraw(c, bid, nd.x * TS, nd.y * TS, now, nd.x * 3 + nd.y);
  }
}
function drawWild(c, now) {
  for (const a of WILD.list) {
    const id = a.kind === 'owl' ? 'owl_wild' : a.kind + (a.flee ? '_run' : '_idle'), it = ART.BYID[id]; if (!it) continue;
    c.save(); c.translate(a.x * TS + TS / 2, 0); c.scale(a.face < 0 ? -1 : 1, 1);
    c.drawImage(ART.frameOf(it, gaFrame(it, now, a.born)), -it.gw / 2, a.y * TS + TS - it.gh, it.gw, it.gh); c.restore();
  }
}
function drawSea(c, now) {
  for (const a of SEA.list) { const it = ART.BYID[a.kind === 'crab' ? 'crab' : 'seal']; if (!it) continue; c.save(); c.translate(a.x * TS + TS / 2, 0); c.scale((a.face || 1) < 0 ? -1 : 1, 1); c.drawImage(ART.frameOf(it, gaFrame(it, now, a.born)), -it.gw / 2, a.y * TS + TS - it.gh, it.gw, it.gh); c.restore(); }
  if (SEA.whale) { const k = Math.max(0, Math.min(1, (now - SEA.whale.t0) / 6000)), up = Math.sin(k * Math.PI), it = (ART.BYID as any).whale; if (it && up > 0.02) { c.globalAlpha = Math.min(1, up * 2); c.drawImage(ART.frameOf(it, gaFrame(it, now, 0)), SEA.whale.x * TS - 12, SEA.whale.y * TS + TS - it.gh + (1 - up) * 8, it.gw, it.gh); c.globalAlpha = 1; } }
}
function drawSites(c, now) {
  for (const s of town.sites) {
    const px = s.x * TS, py = s.y * TS, w = s.w * TS, h = s.h * TS;
    if (s.kind === 'road') { c.fillStyle = 'rgba(232,192,112,.28)'; for (let i = s.laid || 0; i < s.route.length; i++) c.fillRect(s.route[i].x * TS + 3, s.route[i].y * TS + 3, TS - 6, TS - 6); continue; }
    if (!gaOnScreen(s.x + s.w / 2, s.y + s.h / 2, Math.max(s.w, s.h) + 2)) continue;
    const col = s.kind === 'demolish' ? '#d8604a' : s.kind === 'field' ? '#c8a060' : s.kind === 'graveyard' ? '#a9b0b8' : '#e8c070';
    c.fillStyle = s.kind === 'demolish' ? 'rgba(180,70,50,.12)' : 'rgba(120,90,50,.14)'; c.fillRect(px, py, w, h);
    if (s.slots) for (const q of s.slots) gaDraw(c, `site_${q.mat === 'stone' ? 'stone' : 'wood'}_${q.built ? 'built' : 'open'}`, q.x * TS, q.y * TS, now, 0);
    c.setLineDash([6, 5]); c.lineDashOffset = -now / 80; c.strokeStyle = col; c.lineWidth = 1.5; c.strokeRect(px + 1, py + 1, w - 2, h - 2); c.setLineDash([]);
    for (const q of [[0, 0], [w, 0], [0, h], [w, h]]) gaDraw(c, 'stake', px + q[0] - 12, py + q[1] - 20, now, 0);
  }
}
function drawRemains(c) { for (const r of town.remains || []) gaDraw(c, 'remains', r.x * TS, r.y * TS, 0, 0); }
function drawDrops(c) {
  const t = performance.now();
  for (const d of town.drops || []) { const age = t - d.rt, hop = age < 450 ? Math.sin(age / 450 * Math.PI) * 6 : 0; gaDraw(c, d.k === 'wood' ? 'drop_wood' : 'drop_stone', d.x * TS, d.y * TS - hop, 0, 0); }
}
function drawYard(c, now) {
  if (!town.yard) return;
  { const w = town.wedding, pt = typeof activeParty === 'function' && activeParty(); if ((w && !w.done && !(w.place && w.place.church) && game.time >= w.at - 40) || (pt && game.time >= pt.at - 10)) return; }
  if (!town.fireGone) gaDraw(c, 'campfire', town.cx * TS, (town.cy + 1) * TS, now, 0);
}
/* standing things that share the y-sorted pass with the people: lamps, crosses, the cake, the feast fire */
YSORT.push(function (c, now) {
  const out = [], lit = daylight(GA.hour) < 0.55;
  for (const l of lamps) if (gaOnScreen(l.x, l.y, 2)) out.push({ k: l.y - 0.02, f: () => gaDraw(c, lit ? 'lamp_lit' : 'lamp_unlit', l.x * TS, l.y * TS, now, l.x) });
  for (const q of town.crosses || []) if (gaOnScreen(q.x, q.y, 2)) out.push({ k: q.y - 0.02, f: () => { const a = crossAge(q); gaDraw(c, a < 0.45 ? 'cross_0' : a < 0.75 ? 'cross_1' : 'cross_2', q.x * TS, q.y * TS, 0, 0); } });
  { const pt = typeof activeParty === 'function' && activeParty(); if (pt && game.time >= pt.at - 10) { const ct = cakeTile(); out.push({ k: ct.y - 0.02, f: () => gaDraw(c, 'cake', ct.x * TS, ct.y * TS, now, 0) }); } }
  { const f = town.feast; if (f && game.time >= f.at - 10 && game.time < f.end) out.push({ k: town.cy + 1 - 0.02, f: () => gaDraw(c, 'feastfire', town.cx * TS, (town.cy + 1) * TS, now, 0) }); }
  return out;
});
function drawCrosses() {} function drawCake() {}
function drawFeast(c, now) {
  const f = town.feast; if (!f || game.time < f.at - 10 || game.time >= f.end) return;
  const s = toScreen(town.cx * TS + TS / 2, (town.cy + 1) * TS + TS / 2), k = cam.z, g = c.createRadialGradient(s.x, s.y, 2, s.x, s.y, 70 * k);
  g.addColorStop(0, 'rgba(255,170,60,.38)'); g.addColorStop(1, 'rgba(255,140,40,0)'); c.fillStyle = g; c.beginPath(); c.arc(s.x, s.y, 70 * k, 0, 6.3); c.fill();
}

