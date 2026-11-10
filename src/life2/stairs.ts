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
/** the sprite of a stair tile: the up stairs have their landing to the south, the down stairs to the north, and the artwork is the same turned over */
const stairSpriteId = (t: number, x: number, y: number) => (t === T.STAIR || t === T.STAIRU) ? 'stair_up' : 'stair_down';
const stairClear = (x: number, y: number) => x >= 3 && y >= 3 && x < W - 3 && y < H - 3 && walkable(x, y) && !lfPropAt(x, y) && !tileOwner.get(y * W + x) && !town.siteAt[y * W + x] && !town.nodeMap.has(y * W + x) && [T.GRASS, T.PATH, T.SAND, T.FLOOR, T.DIRTF, T.DECK].includes(grid[y][x]);
function stairLink(s0: number, l0: number, s1: number, l1: number, kind: string) {
  town.portals = town.portals || new Map(); town.stairs = town.stairs || []; town.portals.set(l0, l1); town.portals.set(l1, l0); town.stairs.push({ s0, l0, s1, l1, kind });
}
/** make the staircase itself (checked by the caller). UP: the stair stands north of its landing (you climb it walking north); a deck is laid over the whole building one level up, with the stair down in the same place and its landing north of it.
    DOWN: the stair stands south of its landing; below, in the earth, a 3 x 3 chamber with the stair up in the same place and its landing south of it. (lx, ly) the landing you stand on. */
function stairMake(lx: number, ly: number, down: boolean) {
  const h0 = town.h0;
  if (down) {
    const sx = lx, sy = ly + 1, shift = lvlOf(ly) === 0 ? LV_MINE * h0 : h0, s1y = sy + shift, l1y = s1y + 1;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const x = sx + i, y = s1y + j; setT(x, y, T.DIRTF); town.ore[y * W + x] = 0; roomAt[y][x] = -1; }
    setT(sx, sy, T.STAIRM); setT(sx, s1y, T.STAIRU);
    stairLink(sy * W + sx, ly * W + lx, s1y * W + sx, l1y * W + sx, 'down');
    town.gridV = (town.gridV || 0) + 1; markDirty(sx - 1, sy - 1, 3, 3); markDirty(sx - 2, s1y - 2, 5, 5); refreshReach(); return;
  }
  const sx = lx, sy = ly - 1, r = rooms[roomAt[sy][sx]], fp = stairFootprint(r), s1y = sy + h0, l1y = s1y - 1;
  for (const [x, y] of fp) if (grid[y + h0][x] === T.SKY) setT(x, y + h0, T.DECK);
  if (grid[l1y][sx] === T.SKY) setT(sx, l1y, T.DECK);
  setT(sx, sy, T.STAIR); setT(sx, s1y, T.STAIRD);
  stairLink(sy * W + sx, ly * W + lx, s1y * W + sx, l1y * W + sx, 'up');
  markDirty(sx - 1, sy - 1, 3, 3); for (const [x, y] of fp) markDirty(x, y + h0, 1, 1); markDirty(sx - 1, l1y - 1, 3, 4);
  town.gridV = (town.gridV || 0) + 1; town.lfPV = (town.lfPV || 0) + 1; refreshReach();
}
/** build mode: stairs up go on the floor just north of where you stand (you climb them walking north from here); stairs down just south of you. */
function stairPlace(n, down = false) {
  const lx = n.tx, ly = n.ty, h0 = town.h0; if (!h0) return null;
  const L = lvlOf(ly), kit = down ? 'stairdown' : 'stair', sx = lx, sy = down ? ly + 1 : ly - 1;
  if (town.portals && town.portals.has(ly * W + lx)) { playerSay(n, 'You are standing on the landing of another staircase. Step away from it.'); return null; }
  if (down) {
    if (L !== 0 && L !== LV_MINE) { playerSay(n, 'Stairs down go on the ground, or deep in a mine.'); return null; }
    if (!stairClear(sx, sy) || !walkable(lx, ly)) { playerSay(n, 'Stairs down go just south of you: that ground has to be clear.'); return null; }
    const s1y = sy + (L === 0 ? LV_MINE * h0 : h0);
    if (sx < 4 || sx >= W - 4 || s1y + 3 >= H - 3) { playerSay(n, 'The earth is too thin here.'); return null; }
    stairMake(lx, ly, true); kitTake(kit); sndPlace(); playerSay(n, 'A staircase. It goes down into the earth.'); return { stair: true };
  }
  if (L < 0 || L >= LV_UP_MAX) { playerSay(n, 'There is nothing higher to climb to.'); return null; }
  const ri = roomAt[sy] && roomAt[sy][sx];
  if (!(ri >= 0) || ri !== roomAt[ly][lx] || !rooms[ri] || rooms[ri].dead) { playerSay(n, 'Stairs up go on the floor of a room, just north of where you stand.'); return null; }
  if (grid[sy][sx] !== T.FLOOR || lfPropAt(sx, sy) || tileOwner.get(sy * W + sx) || grid[ly][lx] !== T.FLOOR) { playerSay(n, 'The floor just north of you has to be clear.'); return null; }
  stairMake(lx, ly, false); kitTake(kit); sndPlace(); playerSay(n, 'A staircase. It goes up to the roof.'); return { stair: true };
}
/** walking into a stair: only from its landing, following the arrow; a straight cut to the landing at the other end (the next floor). From anywhere else the stair is just a solid thing with a message. */
function stairAction(n, x: number, y: number) {
  const k = y * W + x, st = (town.stairs || []).find(q => q.s0 === k || q.s1 === k); if (!st) return null;
  const fromA = st.s0 === k, land = fromA ? st.l0 : st.l1, up = st.kind === 'up' ? fromA : !fromA;
  if (n.tx !== land % W || n.ty !== ((land / W) | 0)) return { msg: 'Stairs up are climbed from the south, stairs down from the north.' };
  return { key: 'stair' + x + ',' + y, min: 0.08, text: up ? 'Going up' : 'Going down', tool: null, run(nn) {
    const t = fromA ? st.l1 : st.l0, [tx, ty] = stairArrivalTile(t, nn), sk = fromA ? st.s1 : st.s0; teleportTo(nn, tx, ty);
    if (nn.player) { const pp = nn.player; pp.stairHold = {}; for (const d of ['up', 'down', 'left', 'right']) if (pp.keys[d]) pp.stairHold[d] = true; pp.keys = {}; pp.order = []; }   // (you arrive ON the landing: a key still held does not walk you off it)
    nn.face = { dx: -Math.sign((sk % W) - tx), dy: -Math.sign(((sk / W) | 0) - ty) };   // (turned away from the stair you came out of)
    sndStairs(up); playerSay(nn, st.kind === 'down' ? (fromA ? 'Underground.' : 'Daylight.') : (up ? 'The roof.' : 'Downstairs.')); } };
}
/** the hammer on solid earth: dig it out. Some of it is ore. */
function digAction(n, x: number, y: number) {
  if (x < 3 || x >= W - 3 || y < LV_MINE * town.h0 + 1 || y >= H - 2 || (y + 1) % town.h0 === 0 || y % town.h0 === 0) return { msg: 'Solid rock. It does not give.' };
  return { key: 'dig' + x + ',' + y, min: 2.2, text: 'Digging', tool: 'hammer', run(nn) {
    if (grid[y][x] !== T.EARTH) return; const o = town.ore[y * W + x]; town.ore[y * W + x] = 0; setT(x, y, T.DIRTF); markDirty(x - 1, y - 1, 3, 3); workFx('split', x, y, nn); sndDig();
    if (o) { const good = ['', 'iron', 'copper', 'gold'][o], q = o === 3 ? 1 : 1 + (Math.random() < 0.4 ? 1 : 0); nn.inv[good] = (nn.inv[good] || 0) + q; sndOre(); playerSay(nn, '+' + q + ' ' + (GOODS[good] ? GOODS[good].name : good)); }
    else if (Math.random() < 0.35) { bagGet(nn, 'stone'); }
  } };
}

/** the ready village (the built test): a staircase in a big enough building up to a roof with a hut on it, and one down into the earth with a dug-out hut, torches and a tunnel */
function prebuildLevels() {
  if (!town.h0) return; if (!town.props) lfInitProps(); const h0 = town.h0, cx = town.cx, cy = town.cy;
  const hut = (x0: number, y0: number, doorX: number) => { const placed: number[][] = []; for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) if (i === 0 || j === 0 || i === 4 || j === 4) { lfAddProp(i === doorX && j === 4 ? 'bdoor' : 'bwall', x0 + i, y0 + j); placed.push([x0 + i, y0 + j]); }
    lfAddProp('bed', x0 + 1, y0 + 1); lfAddProp('bed', x0 + 3, y0 + 1); placed.push([x0 + 1, y0 + 1], [x0 + 3, y0 + 1]); town.bldQ = placed; bldTick(); };
  // 1. up: the biggest building at least 7 x 7: stairs in it up to a roof with a hut
  const big = rooms.filter(r => !r.dead && !r.free && r.w >= 7 && r.h >= 7).sort((a, b) => b.w * b.h - a.w * a.h);   // (the biggest building: room for a hut up there beside the stair)
  for (const r of big) {
    let st: number[] | null = null; const ri0 = roomAt[r.y + 1][r.x + 1];
    for (let y = r.y + 3; y < r.y + r.h - 1 && !st; y++) for (let x = r.x + 1; x < r.x + r.w - 1 && !st; x++) { const ok = (a, b) => grid[b][a] === T.FLOOR && roomAt[b][a] === ri0 && !lfPropAt(a, b); if (ok(x, y) && ok(x, y - 1)) st = [x, y]; }
    if (!st) continue; const [lx, ly] = st; stairMake(lx, ly, false);
    const y0 = r.y, hitY = (b: number) => b >= y0 && b <= y0 + 5;
    for (const x0 of [r.x, r.x + r.w - 5]) { const hit = (a: number) => a >= x0 - 1 && a <= x0 + 5; if (hit(lx) && (hitY(ly) || hitY(ly - 2))) continue; hut(x0, y0 + h0, 2); break; }
    break;
  }
  // 2. down: open ground near the square, a dug-out hut, a tunnel and torches
  let done = false;
  for (let d = 5; d < 24 && !done; d++) for (let a = 0; a < 16 && !done; a++) {
    const ang = a * Math.PI / 8, lx = Math.round(cx + Math.cos(ang) * d), ly = Math.round(cy + Math.sin(ang) * d * 0.8);
    if (!stairClear(lx, ly) || !stairClear(lx, ly + 1) || [-1, 0, 1, 2].some(dy => [-1, 0, 1].some(dx => roomAt[ly + dy] && roomAt[ly + dy][lx + dx] >= 0))) continue;
    const my = ly + LV_MINE * h0; if (lx < 14 || lx > W - 18) continue;
    stairMake(lx, ly, true);
    for (let j = -4; j <= 6; j++) for (let i = -4; i <= 9; i++) { const x = lx + i, y = my + j; if (grid[y][x] === T.EARTH) { setT(x, y, T.DIRTF); town.ore[y * W + x] = 0; } }
    for (let i = 10; i <= 17; i++) { const x = lx + i, y = my + 1; if (grid[y][x] === T.EARTH) { setT(x, y, T.DIRTF); town.ore[y * W + x] = 0; } }
    hut(lx + 4, my - 3, 2);
    for (const [tx, ty] of [[lx - 2, my - 2], [lx + 2, my + 4], [lx + 6, my + 4], [lx + 12, my], [lx + 16, my + 2]]) if (!lfPropAt(tx, ty) && grid[ty][tx] === T.DIRTF) lfAddProp('torch', tx, ty);
    done = true;
  }
  if (typeof visHomes === 'function') visHomes(); refreshReach();
}

/** a free tile at (or next to) a landing, for somebody to arrive on when somebody else is already standing on it */
function stairArrivalTile(t: number, self?: any): [number, number] {
  const tx = t % W, ty = (t / W) | 0, ok = (x: number, y: number) => walkable(x, y) && !lfPropAt(x, y) && (!tileOwner.get(tkey(x, y)) || tileOwner.get(tkey(x, y)) === self);
  if (ok(tx, ty)) return [tx, ty];
  for (let r = 1; r <= 2; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dy) === r && ok(tx + dx, ty + dy) && lvlOf(ty + dy) === lvlOf(ty)) return [tx + dx, ty + dy];
  return [tx, ty];
}
/** pushing something that stands on a landing into its stair sends it to the landing at the other end (the next floor): where it would arrive, or null when that is not a stair push or the way is blocked */
function stairPushTarget(px: number, py: number, dx: number, dy: number): [number, number] | null {
  const sx = px + dx, sy = py + dy, g = grid[sy] && grid[sy][sx]; if (g !== T.STAIR && g !== T.STAIRD && g !== T.STAIRM && g !== T.STAIRU) return null;
  const k = sy * W + sx, st = (town.stairs || []).find(q => q.s0 === k || q.s1 === k); if (!st) return null;
  const fromA = st.s0 === k, land = fromA ? st.l0 : st.l1; if (land !== py * W + px) return null;
  const to = fromA ? st.l1 : st.l0, [ax, ay] = stairArrivalTile(to); if (!walkable(ax, ay) || lfPropAt(ax, ay) || tileOwner.get(tkey(ax, ay))) return null;
  return [ax, ay];
}

/* ---------------- villagers in the mine ---------------- */
const MINE_CAP = 900;   // how many tiles villagers will dig out before they call it a mine
/** the earth that can be dug now: walk out from each stair down over the dug-out floor, and every solid tile touching it is a candidate (ore first, then the nearest) */
function mineSpots(max = 1): { sx: number; sy: number; ex: number; ey: number; ore: number }[] {
  const out: any[] = [], h0 = town.h0; if (!h0) return out;
  for (const st of town.stairs || []) {
    if (st.kind !== 'down') continue; const start = st.l1, seen = new Set<number>([start]), q = [start]; let head = 0;
    while (head < q.length && q.length < 700) {
      const k = q[head++], x = k % W, y = (k / W) | 0;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy, nk = ny * W + nx; if (seen.has(nk)) continue; seen.add(nk);
        if (grid[ny][nx] === T.EARTH) { if (nx >= 4 && nx < W - 4 && ny > LV_MINE * h0 + 1 && ny < H - 3 && ny % h0 !== 0 && (ny + 1) % h0 !== 0 && !town.treeClaim.has(nk)) out.push({ sx: x, sy: y, ex: nx, ey: ny, ore: town.ore[nk] }); }
        else if (walkable(nx, ny)) q.push(nk);
      }
    }
  }
  out.sort((a, b) => (b.ore ? 1 : 0) - (a.ore ? 1 : 0));   // (stable: ore first, otherwise the order they were found in: nearest the stairs)
  return out.slice(0, Math.max(1, max));
}
const mineWork = () => !!town.h0 && (town.mined || 0) < MINE_CAP && (town.stairs || []).some(s => s.kind === 'down') && mineSpots().length > 0;
/** a villager goes down and digs one tile: ore goes where it is wanted (iron to the smithy, copper and gold sold) */
function minePlan(n) {
  const sp = mineSpots()[0]; if (!sp) return null; const k = sp.ey * W + sp.ex; town.treeClaim.add(k);
  return [goS({ x: sp.sx, y: sp.sy, face: { dx: Math.sign(sp.ex - sp.sx), dy: Math.sign(sp.ey - sp.sy) } }, 'Going down to the mine'),
    waitS(11, 'work', 'Digging in the mine', { tool: 'hammer', onEnd(n) {
      town.treeClaim.delete(k); if (grid[sp.ey][sp.ex] !== T.EARTH) return;
      const o = town.ore[k]; town.ore[k] = 0; setT(sp.ex, sp.ey, T.DIRTF); markDirty(sp.ex - 1, sp.ey - 1, 3, 3); workFx('split', sp.ex, sp.ey, n); town.mined = (town.mined || 0) + 1;
      if (o === 1) { const sm = typeof lf2Room === 'function' ? lf2Room('smithy') : null, q = 1 + (n.rand() < 0.4 ? 1 : 0); if (sm) { lf2Stock(sm).iron = (lf2Stock(sm).iron || 0) + q; n.coin = (n.coin || 0) + 2 * q; } else n.inv.iron = (n.inv.iron || 0) + q; }
      else if (o === 2) n.coin = (n.coin || 0) + 3; else if (o === 3) n.coin = (n.coin || 0) + 9;
    } })];
}
