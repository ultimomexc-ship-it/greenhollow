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
const stairClear = (x: number, y: number) => x >= 3 && y >= 3 && x < W - 3 && y < H - 3 && walkable(x, y) && !lfPropAt(x, y) && !tileOwner.get(y * W + x) && !town.siteAt[y * W + x] && !town.nodeMap.has(y * W + x) && [T.GRASS, T.PATH, T.SAND, T.FLOOR, T.DIRTF, T.DECK].includes(grid[y][x]);
function stairLink(s0: number, l0: number, s1: number, l1: number, kind: string) {
  town.portals = town.portals || new Map(); town.stairs = town.stairs || []; town.portals.set(l0, l1); town.portals.set(l1, l0); town.stairs.push({ s0, l0, s1, l1, kind });
}
/** build mode: put a staircase on the floor in front of you. You stand on its landing. `down`: into the earth. */
function stairPlace(n, down = false) {
  const f = lf2Front(n), sx = f.x, sy = f.y, lx = n.tx, ly = n.ty, h0 = town.h0; if (!h0) return null;
  const L = lvlOf(ly), kit = down ? 'stairdown' : 'stair';
  if (down) {
    if (L !== 0 && L !== LV_MINE) { playerSay(n, 'Stairs down go on the ground, or deep in a mine.'); return null; }
    if (!stairClear(sx, sy) || !walkable(lx, ly)) { playerSay(n, 'The ground in front of you has to be clear.'); return null; }
    const shift = L === 0 ? LV_MINE * h0 : h0, l1y = ly + shift, s1y = sy + shift;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const x = lx + i, y = l1y + j; if (x < 3 || x >= W - 3 || y >= H - 3) { playerSay(n, 'The earth is too thin here.'); return null; } }
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const x = lx + i, y = l1y + j; setT(x, y, T.DIRTF); town.ore[y * W + x] = 0; roomAt[y][x] = -1; }
    setT(sx, sy, T.STAIRM); setT(sx, s1y, T.STAIRU);
    stairLink(sy * W + sx, ly * W + lx, s1y * W + sx, l1y * W + lx, 'down'); kitTake(kit);
    town.gridV = (town.gridV || 0) + 1; markDirty(sx - 1, sy - 1, 3, 3); markDirty(lx - 2, l1y - 2, 5, 5); refreshReach(); playerSay(n, 'A staircase. It goes down into the earth.'); return { stair: true };
  }
  if (L < 0 || L >= LV_UP_MAX) { playerSay(n, 'There is nothing higher to climb to.'); return null; }
  const ri = roomAt[sy] && roomAt[sy][sx];
  if (!(ri >= 0) || ri !== roomAt[ly][lx] || !rooms[ri] || rooms[ri].dead) { playerSay(n, 'Stairs up go on the floor of a room, with you standing beside them.'); return null; }
  if (grid[sy][sx] !== T.FLOOR || lfPropAt(sx, sy) || tileOwner.get(sy * W + sx) || grid[ly][lx] !== T.FLOOR) { playerSay(n, 'The floor in front of you has to be clear.'); return null; }
  const r = rooms[ri], fp = stairFootprint(r);
  for (const [x, y] of fp) if (grid[y + h0][x] === T.SKY) setT(x, y + h0, T.DECK);
  setT(sx, sy, T.STAIR); setT(sx, sy + h0, T.STAIRD);
  stairLink(sy * W + sx, ly * W + lx, (sy + h0) * W + sx, (ly + h0) * W + lx, 'up'); kitTake(kit);
  markDirty(sx - 1, sy - 1, 3, 3); for (const [x, y] of fp) markDirty(x, y + h0, 1, 1); markDirty(sx, sy + h0 - 1, 3, 3);
  town.gridV = (town.gridV || 0) + 1; town.lfPV = (town.lfPV || 0) + 1; refreshReach();
  playerSay(n, 'A staircase. It goes up to the roof.'); return { stair: true };
}
/** the action for walking into a stair: up or down */
function stairAction(n, x: number, y: number) {
  const k = y * W + x, st = (town.stairs || []).find(q => q.s0 === k || q.s1 === k); if (!st) return null;
  const fromA = st.s0 === k, up = st.kind === 'up' ? fromA : !fromA;
  return { key: 'stair' + x + ',' + y, min: 0.5, text: up ? 'Going up' : 'Going down', tool: null, run(nn) { const t = fromA ? st.l1 : st.l0; teleportTo(nn, t % W, (t / W) | 0); playerSay(nn, st.kind === 'down' ? (fromA ? 'Underground.' : 'Daylight.') : (up ? 'The roof.' : 'Downstairs.')); } };
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
