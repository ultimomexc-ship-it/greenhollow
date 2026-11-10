/* ================= Stairs and the level above (src/life2/stairs.ts) =================
   The map has a second level below the island: row y + town.h0 is the level above row y (growSky in world/construction.ts). It is ordinary map, so building, sealing, props,
   rooms, walking and sight work up there unchanged. A staircase links the two: on the ground a stair tile (T.STAIR) in a room with a landing tile in front of it, on the roof deck
   (T.DECK, laid over the whole footprint of the building) a stair down (T.STAIRD) with its own landing. town.portals maps each landing to the other, and pathfinding, reach and walking
   use it, so villagers go up and down like anybody. Bump the stair to use it. */

/** every tile of a building: a rectangle room, or a free-form room with its walls */
function stairFootprint(r): [number, number][] {
  const out: [number, number][] = [];
  if (!r.free) { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) out.push([x, y]); return out; }
  for (const k of r.cells || []) out.push([k % W, (k / W) | 0]); for (const k of r.walls || []) out.push([k % W, (k / W) | 0]);
  return out;
}
const stairUp = (k: number) => k + W * (town.h0 || 0);
/** move somebody to a tile at once (stairs): the same step bookkeeping a walk would do */
function teleportTo(n, x: number, y: number) {
  if (tileOwner.get(tkey(n.tx, n.ty)) === n) tileOwner.delete(tkey(n.tx, n.ty));
  n.tx = x; n.ty = y; n.x = x; n.y = y; n.t = 0; n.slide = null; n.walked = (n.walked || 0) + 1; tileOwner.set(tkey(x, y), n);
  if (n.path && n.path.length && n.path[0].x === x && n.path[0].y === y) n.path.shift();
}
/** build mode: put a staircase on the floor in front of you. You stand on its landing. */
function stairPlace(n) {
  const f = lf2Front(n), sx = f.x, sy = f.y, lx = n.tx, ly = n.ty, ri = roomAt[sy] && roomAt[sy][sx];
  if (!(ri >= 0) || ri !== roomAt[ly][lx] || !rooms[ri] || rooms[ri].dead) { playerSay(n, 'Stairs go on the floor of a room, with you standing beside them.'); return null; }
  if (grid[sy][sx] !== T.FLOOR || lfPropAt(sx, sy) || tileOwner.get(sy * W + sx) || grid[ly][lx] !== T.FLOOR) { playerSay(n, 'The floor in front of you has to be clear.'); return null; }
  const h0 = town.h0; if (!h0) return null; const r = rooms[ri], fp = stairFootprint(r);
  for (const [x, y] of fp) if (grid[y + h0][x] === T.SKY) setT(x, y + h0, T.DECK);
  setT(sx, sy, T.STAIR); setT(sx, sy + h0, T.STAIRD);
  const l0 = ly * W + lx, l1 = stairUp(l0), s0 = sy * W + sx, s1 = stairUp(s0);
  town.portals = town.portals || new Map(); town.stairs = town.stairs || []; town.portals.set(l0, l1); town.portals.set(l1, l0); town.stairs.push({ s0, l0, s1, l1 });
  kitTake('stair'); markDirty(sx - 1, sy - 1, 3, 3); for (const [x, y] of fp) markDirty(x, y + h0, 1, 1); markDirty(sx, sy + h0 - 1, 3, 3);
  town.gridV = (town.gridV || 0) + 1; town.lfPV = (town.lfPV || 0) + 1; refreshReach();
  playerSay(n, 'A staircase. It goes up to the roof.'); return { stair: true };
}
/** the action for walking into a stair: up or down */
function stairAction(n, x: number, y: number) {
  const g = grid[y][x], k = y * W + x, st = (town.stairs || []).find(q => q.s0 === k || q.s1 === k); if (!st) return null; const up = g === T.STAIR;
  return { key: 'stair' + x + ',' + y, min: 0.5, text: up ? 'Going up' : 'Going down', tool: null, run(nn) { const t = up ? st.l1 : st.l0; teleportTo(nn, t % W, (t / W) | 0); playerSay(nn, up ? 'The roof.' : 'Downstairs.'); } };
}
