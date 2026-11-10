/* ================= Stairs, the levels above and the earth below (src/life2/stairs.ts) =================
   The map is stacked in blocks of town.h0 rows (growLevels in world/construction.ts): 0 the ground, 1 and 2 the levels above it, 3 and 4 the earth beneath it. A level is ordinary map, so building, sealing,
   props, rooms, walking and sight work on every one unchanged, only the coordinates differ.
   A staircase links two levels: a stair tile on each, with a landing tile beside it. town.portals maps each landing to the other, town.stairs lists the pairs, and pathfinding, reach and walking use them, so
   villagers go up and down like anybody. Bump the stair to use it.
   UP: in a room (on the ground or on a deck), a stair goes to the roof of that building: a deck is laid over its whole footprint one level up, and you can build on it, and put stairs there to a third level.
   DOWN: on the ground (or in a mine), a stair goes into the earth: a 3 x 3 chamber, surrounded by solid earth (T.EARTH) with ore in it. The hammer digs earth away (digAction): make mines or houses underground. */

/** every tile of a building: a rectangle room, or a free-form room with its walls */
function stairFootprint(r): [number, number][] {
  const out: [number, number][] = [];
  if (!r.free) { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) out.push([x, y]); return out; }
  for (const k of r.cells || []) out.push([k % W, (k / W) | 0]); for (const k of r.walls || []) out.push([k % W, (k / W) | 0]);
  return out;
}
/** move somebody to a tile at once (stairs): the same step bookkeeping a walk would do */
function teleportTo(n, x: number, y: number) {
  if (tileOwner.get(tkey(n.tx, n.ty)) === n) tileOwner.delete(tkey(n.tx, n.ty));
  n.tx = x; n.ty = y; n.x = x; n.y = y; n.t = 0; n.slide = null; n.walked = (n.walked || 0) + 1; tileOwner.set(tkey(x, y), n);
  if (n.path && n.path.length && n.path[0].x === x && n.path[0].y === y) n.path.shift();
}
/** which way the arrow on a stair tile points (0 north, 1 east, 2 south, 3 west): from its landing into the stair, the one way in */
function stairRot(x: number, y: number): number {
  const k = y * W + x; for (const st of town.stairs || []) { const l = st.s0 === k ? st.l0 : st.s1 === k ? st.l1 : -1; if (l < 0) continue; const dx = x - (l % W), dy = y - ((l / W) | 0); return dy < 0 ? 0 : dx > 0 ? 1 : dy > 0 ? 2 : 3; }
  return 0;
}
/** the sprite of a stair tile (the up and down kinds, turned to its arrow) */
const stairSpriteId = (t: number, x: number, y: number) => ((t === T.STAIR || t === T.STAIRU) ? 'stair_up' : 'stair_down') + (stairRot(x, y) ? '_' + stairRot(x, y) : '');
const stairClear = (x: number, y: number) => x >= 3 && y >= 3 && x < W - 3 && y < H - 3 && walkable(x, y) && !lfPropAt(x, y) && !tileOwner.get(y * W + x) && !town.siteAt[y * W + x] && !town.nodeMap.has(y * W + x) && [T.GRASS, T.PATH, T.SAND, T.FLOOR, T.DIRTF, T.DECK].includes(grid[y][x]);
function stairLink(s0: number, l0: number, s1: number, l1: number, kind: string) {
  town.portals = town.portals || new Map(); town.stairs = town.stairs || []; town.portals.set(l0, l1); town.portals.set(l1, l0); town.stairs.push({ s0, l0, s1, l1, kind });
}
/** make the staircase itself (checked by the caller): up from a room's floor to a deck over the whole building, or down into the earth with a 3 x 3 chamber. (sx, sy) the stair, (lx, ly) its landing. */
function stairMake(sx: number, sy: number, lx: number, ly: number, down: boolean) {
  const h0 = town.h0;
  if (down) {
    const shift = lvlOf(ly) === 0 ? LV_MINE * h0 : h0, l1y = ly + shift, s1x = lx - (sx - lx), s1y = l1y - (sy - ly);   // the stair at the other end stands on the far side of its landing: you come out facing away from it
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const x = lx + i, y = l1y + j; setT(x, y, T.DIRTF); town.ore[y * W + x] = 0; roomAt[y][x] = -1; }
    setT(sx, sy, T.STAIRM); setT(s1x, s1y, T.STAIRU);
    stairLink(sy * W + sx, ly * W + lx, s1y * W + s1x, l1y * W + lx, 'down');
    town.gridV = (town.gridV || 0) + 1; markDirty(sx - 1, sy - 1, 3, 3); markDirty(lx - 2, l1y - 2, 5, 5); refreshReach(); return;
  }
  const r = rooms[roomAt[sy][sx]], fp = stairFootprint(r);
  for (const [x, y] of fp) if (grid[y + h0][x] === T.SKY) setT(x, y + h0, T.DECK);
  const s1x = lx - (sx - lx), s1y = ly - (sy - ly) + h0;
  for (const [x, y] of [[s1x, s1y]]) if (grid[y][x] === T.SKY) setT(x, y, T.DECK);
  setT(sx, sy, T.STAIR); setT(s1x, s1y, T.STAIRD);
  stairLink(sy * W + sx, ly * W + lx, s1y * W + s1x, (ly + h0) * W + lx, 'up');
  markDirty(sx - 1, sy - 1, 3, 3); for (const [x, y] of fp) markDirty(x, y + h0, 1, 1); markDirty(s1x - 1, s1y - 1, 3, 3);
  town.gridV = (town.gridV || 0) + 1; town.lfPV = (town.lfPV || 0) + 1; refreshReach();
}
/** build mode: put a staircase on the floor in front of you. You stand on its landing. `down`: into the earth. */
function stairPlace(n, down = false) {
  const f = lf2Front(n), sx = f.x, sy = f.y, lx = n.tx, ly = n.ty, h0 = town.h0; if (!h0) return null;
  const L = lvlOf(ly), kit = down ? 'stairdown' : 'stair';
  if (down) {
    if (L !== 0 && L !== LV_MINE) { playerSay(n, 'Stairs down go on the ground, or deep in a mine.'); return null; }
    if (!stairClear(sx, sy) || !walkable(lx, ly)) { playerSay(n, 'The ground in front of you has to be clear.'); return null; }
    if (town.portals && town.portals.has(ly * W + lx)) { playerSay(n, 'You are standing on the landing of another staircase. Step away from it.'); return null; }
    const l1y = ly + (L === 0 ? LV_MINE * h0 : h0);
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const x = lx + i, y = l1y + j; if (x < 3 || x >= W - 3 || y >= H - 3) { playerSay(n, 'The earth is too thin here.'); return null; } }
    stairMake(sx, sy, lx, ly, true); kitTake(kit); playerSay(n, 'A staircase. It goes down into the earth.'); return { stair: true };
  }
  if (L < 0 || L >= LV_UP_MAX) { playerSay(n, 'There is nothing higher to climb to.'); return null; }
  const ri = roomAt[sy] && roomAt[sy][sx];
  if (!(ri >= 0) || ri !== roomAt[ly][lx] || !rooms[ri] || rooms[ri].dead) { playerSay(n, 'Stairs up go on the floor of a room, with you standing beside them.'); return null; }
  if (grid[sy][sx] !== T.FLOOR || lfPropAt(sx, sy) || tileOwner.get(sy * W + sx) || grid[ly][lx] !== T.FLOOR) { playerSay(n, 'The floor in front of you has to be clear.'); return null; }
  if (town.portals && town.portals.has(ly * W + lx)) { playerSay(n, 'You are standing on the landing of another staircase. Step away from it.'); return null; }
  stairMake(sx, sy, lx, ly, false); kitTake(kit); playerSay(n, 'A staircase. It goes up to the roof.'); return { stair: true };
}
/** walking into a stair: only from its landing, following the arrow; a straight cut to the landing at the other end (the next floor). From anywhere else the stair is just a solid thing with a message. */
function stairAction(n, x: number, y: number) {
  const k = y * W + x, st = (town.stairs || []).find(q => q.s0 === k || q.s1 === k); if (!st) return null;
  const fromA = st.s0 === k, land = fromA ? st.l0 : st.l1, up = st.kind === 'up' ? fromA : !fromA;
  if (n.tx !== land % W || n.ty !== ((land / W) | 0)) return { msg: 'Stairs are entered from their landing, following the arrow.' };
  return { key: 'stair' + x + ',' + y, min: 0.08, text: up ? 'Going up' : 'Going down', tool: null, run(nn) {
    const t = fromA ? st.l1 : st.l0, tx = t % W, ty = (t / W) | 0, sk = fromA ? st.s1 : st.s0; teleportTo(nn, tx, ty);
    nn.face = { dx: -Math.sign((sk % W) - tx), dy: -Math.sign(((sk / W) | 0) - ty) };   // (turned away from the stair you came out of)
    playerSay(nn, st.kind === 'down' ? (fromA ? 'Underground.' : 'Daylight.') : (up ? 'The roof.' : 'Downstairs.')); } };
}
/** the hammer on solid earth: dig it out. Some of it is ore. */
function digAction(n, x: number, y: number) {
  if (x < 3 || x >= W - 3 || y < LV_MINE * town.h0 + 1 || y >= H - 2 || (y + 1) % town.h0 === 0 || y % town.h0 === 0) return { msg: 'Solid rock. It does not give.' };
  return { key: 'dig' + x + ',' + y, min: 2.2, text: 'Digging', tool: 'hammer', run(nn) {
    if (grid[y][x] !== T.EARTH) return; const o = town.ore[y * W + x]; town.ore[y * W + x] = 0; setT(x, y, T.DIRTF); markDirty(x - 1, y - 1, 3, 3); workFx('split', x, y, nn);
    if (o) { const good = ['', 'iron', 'copper', 'gold'][o], q = o === 3 ? 1 : 1 + (Math.random() < 0.4 ? 1 : 0); nn.inv[good] = (nn.inv[good] || 0) + q; playerSay(nn, '+' + q + ' ' + (GOODS[good] ? GOODS[good].name : good)); }
    else if (Math.random() < 0.35) { bagGet(nn, 'stone'); }
  } };
}

/** the ready village (the built test): a staircase in a big enough building up to a roof with a hut on it, and one down into the earth with a dug-out hut, torches and a tunnel */
function prebuildLevels() {
  if (!town.h0) return; if (!town.props) lfInitProps(); const h0 = town.h0, cx = town.cx, cy = town.cy;
  const hut = (x0: number, y0: number, doorX: number) => { const placed: number[][] = []; for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) if (i === 0 || j === 0 || i === 4 || j === 4) { lfAddProp(i === doorX && j === 4 ? 'bdoor' : 'bwall', x0 + i, y0 + j); placed.push([x0 + i, y0 + j]); }
    lfAddProp('bed', x0 + 1, y0 + 1); lfAddProp('bed', x0 + 3, y0 + 1); placed.push([x0 + 1, y0 + 1], [x0 + 3, y0 + 1]); town.bldQ = placed; bldTick(); };
  // 1. up: the nearest building at least 7 x 7, preferring a house
  const big = rooms.filter(r => !r.dead && !r.free && r.w >= 7 && r.h >= 7).sort((a, b) => b.w * b.h - a.w * a.h);   // (the biggest building: room for a hut up there beside the stair)
  for (const r of big) {
    let st: number[] | null = null;
    for (let y = r.y + 2; y < r.y + r.h - 2 && !st; y++) for (let x = r.x + 1; x < r.x + r.w - 2 && !st; x++) { const ok = (a, b) => grid[b][a] === T.FLOOR && roomAt[b][a] === roomAt[r.y + 1][r.x + 1] && !lfPropAt(a, b); if (ok(x, y) && ok(x + 1, y) && ok(x, y + 1) && ok(x + 1, y + 1)) st = [x + 1, y, x, y]; }
    if (!st) continue; const [sx, sy, lx, ly] = st; stairMake(sx, sy, lx, ly, false);
    const y0 = r.y, hitY = (b: number) => b >= y0 && b <= y0 + 5;
    for (const x0 of [r.x, r.x + r.w - 5]) { const hit = (a: number) => a >= x0 - 1 && a <= x0 + 5; if ((hit(lx) || hit(sx)) && (hitY(ly) || hitY(sy))) continue; hut(x0, y0 + h0, 2); break; }
    break;
  }
  // 2. down: open ground near the square, a dug-out hut, a tunnel and torches
  let done = false;
  for (let d = 5; d < 24 && !done; d++) for (let a = 0; a < 16 && !done; a++) {
    const ang = a * Math.PI / 8, lx = Math.round(cx + Math.cos(ang) * d), ly = Math.round(cy + Math.sin(ang) * d * 0.8), sx = lx + 1, sy = ly;
    if (!stairClear(sx, sy) || !stairClear(lx, ly) || [-1, 0, 1].some(dy => [-1, 0, 1, 2].some(dx => roomAt[ly + dy] && roomAt[ly + dy][lx + dx] >= 0))) continue;
    const my = ly + LV_MINE * h0; if (lx < 14 || lx > W - 18) continue;
    stairMake(sx, sy, lx, ly, true);
    for (let j = -4; j <= 4; j++) for (let i = -4; i <= 9; i++) { const x = lx + i, y = my + j; if (grid[y][x] === T.EARTH) { setT(x, y, T.DIRTF); town.ore[y * W + x] = 0; } }
    for (let i = 10; i <= 17; i++) { const x = lx + i, y = my; if (grid[y][x] === T.EARTH) { setT(x, y, T.DIRTF); town.ore[y * W + x] = 0; } }
    hut(lx + 4, my - 3, 2);
    for (const [tx, ty] of [[lx, my - 2], [lx + 2, my + 2], [lx + 6, my + 3], [lx + 12, my - 1], [lx + 16, my + 1]]) if (!lfPropAt(tx, ty) && grid[ty][tx] === T.DIRTF) lfAddProp('torch', tx, ty);
    done = true;
  }
  if (typeof visHomes === 'function') visHomes(); refreshReach();
}
