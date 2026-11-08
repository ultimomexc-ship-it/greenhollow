/* ================= Sealing: loose wall blocks become rooms (phase 2 of building; design in NOTES.md "Building") =================
   When a block has been pushed into place and its step is over, `bldTick` looks at the ground round it. A closed region (walls and doors edge to edge: a diagonal
   touch leaks) with a door on its edge, no tree, rock or water inside, and under BLD_MAX tiles, becomes a room: the loose blocks on its edge turn into fixed wall and
   door tiles, the ground inside is laid with a floor, and a room record is made (`free: true`: any shape; `cells` are its inside tiles, `x, y, w, h` only its bounding box).
   Rooms like this have kind 'room' for now: nobody lives in them yet (households come with beds, next phase). Building a partition inside a sealed room splits it.
   Walls that border no sealed room stay loose and can be pushed about. */
const BLD_KINDS = ['bwall', 'bwindow', 'bdoor'];
const BLD_MAX = 260;                 // a region bigger than this counts as open country
const bldBlock = pr => !!pr && BLD_KINDS.includes(pr.kind) && !pr.fixed;
const bldSolid = (x, y) => { const g = grid[y][x]; return g === T.WALL || g === T.DOOR || bldBlock(lfPropAt(x, y)); };
const bldFreeRoom = (x, y) => { const i = roomAt[y][x]; const r = i >= 0 ? rooms[i] : null; return r && r.free && !r.dead ? r : null; };
const bldOKTile = (x, y) => { const g = grid[y][x]; if (g !== T.GRASS && g !== T.PATH && g !== T.FLOOR && g !== T.CROP && g !== T.SAND) return false; if (town.siteAt[y * W + x] || (town.nodeMap && town.nodeMap.has(y * W + x))) return false; const p = lfPropAt(x, y); if (p && p.fixed) return false; if (roomAt[y][x] >= 0 && !bldFreeRoom(x, y)) return false; return !bldOnPad(x, y); };
const bldOnPad = (x, y) => { const b = town.builder; return !!b && x >= b.pad.x - 1 && x < b.pad.x + b.pad.w + 1 && y >= b.pad.y - 1 && y < b.pad.y + b.pad.h + 1; };
const BLD_D8: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]], BLD_D4: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** the open tiles joined to (sx, sy) without crossing a wall, door or block; diagonal steps count, so walls that meet only at a corner do not close anything */
function bldFlood(sx, sy) {
  const seen = new Set<number>(), cells: number[] = [], q = [sx + sy * W]; seen.add(q[0]); let open = false, bad = '';
  while (q.length) {
    const k = q.pop(), x = k % W, y = (k / W) | 0; cells.push(k);
    if (cells.length > BLD_MAX) open = true;
    if (x < 4 || y < 4 || x >= W - 4 || y >= H - 4) open = true;
    if (!bad && !bldOKTile(x, y)) bad = bldOnPad(x, y) ? 'the yard\'s pad' : grid[y][x] === T.TREE ? 'a tree' : grid[y][x] === T.ROCK || grid[y][x] === T.MOUNTAIN ? 'a rock' : grid[y][x] === T.WATER ? 'water' : 'something';
    if (open) return { cells, open: true, bad };
    for (const [dx, dy] of BLD_D8) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const nk = nx + ny * W; if (seen.has(nk) || bldSolid(nx, ny)) continue; seen.add(nk); q.push(nk); }
  }
  return { cells, open, bad };
}
/** is there a door (a door block, or a fixed door of a sealed room) right beside one of these tiles? */
function bldHasDoor(cells: number[]) {
  for (const k of cells) { const x = k % W, y = (k / W) | 0; for (const [dx, dy] of BLD_D4) { const nx = x + dx, ny = y + dy, p = lfPropAt(nx, ny); if ((p && p.kind === 'bdoor' && !p.fixed) || (grid[ny][nx] === T.DOOR && doors.some(d => d.x === nx && d.y === ny && rooms[d.room] && rooms[d.room].free))) return true; } }
  return false;
}
/** can somebody inside this region walk out to the open world through doors? A door straight through to open country is an exit; a door into another region (a sealed room, or one of the `pending` regions made in the same step) lets the search carry on from there.
    Every room must have a way out: no adjoining rooms with doors only to each other. */
function bldExit(start: number[], pending: number[][]) {
  const where = new Map<number, any>(); for (const g of pending) for (const k of g) where.set(k, g);
  const groupOf = (k: number) => where.get(k) || (() => { const r = bldFreeRoom(k % W, (k / W) | 0); return r ? [...r.cells] : null; })();
  const seenG = new Set<any>([start]), seenR = new Set<number>(), q: number[][] = [start];
  while (q.length) {
    const g = q.pop()!;
    for (const k of g) { const x = k % W, y = (k / W) | 0;
      for (const [dx, dy] of BLD_D4) {
        const dxx = x + dx, dyy = y + dy, p = lfPropAt(dxx, dyy), isDoor = (p && p.kind === 'bdoor' && !p.fixed) || (grid[dyy][dxx] === T.DOOR && doors.some(d => d.x === dxx && d.y === dyy && rooms[d.room] && rooms[d.room].free));
        if (!isDoor) continue;
        const ox = dxx + dx, oy = dyy + dy; if (ox < 1 || oy < 1 || ox >= W - 1 || oy >= H - 1 || bldSolid(ox, oy)) continue;
        const ok = ox + oy * W;
        if (where.has(ok)) { const other = where.get(ok); if (!seenG.has(other)) { seenG.add(other); q.push(other); } continue; }
        const fr = bldFreeRoom(ox, oy); if (fr) { if (!seenR.has(roomAt[oy][ox])) { seenR.add(roomAt[oy][ox]); q.push([...fr.cells]); } continue; }
        if (roomAt[oy][ox] >= 0 && !(rooms[roomAt[oy][ox]] && rooms[roomAt[oy][ox]].dead)) continue;   // (into one of the village's own buildings: not the open world)
        if (bldFlood(ox, oy).open) return true;
      } }
  }
  return false;
}
/** make rooms of these region(s) (each a list of tiles): the loose blocks beside them become walls and doors, the ground gets a floor */
function bldMake(regions: number[][], dissolve: any[]) {
  const oldRooms = new Set<any>(dissolve), blocks = new Set<any>(), bounds = { x0: 1e9, y0: 1e9, x1: -1, y1: -1 };
  for (const R of regions) for (const k of R) { const x = k % W, y = (k / W) | 0; for (const [dx, dy] of BLD_D8) { const p = lfPropAt(x + dx, y + dy); if (bldBlock(p)) blocks.add(p); } }
  for (const r of oldRooms) { for (const k of r.cells) { const x = k % W, y = (k / W) | 0; for (const [dx, dy] of BLD_D8) { const p = lfPropAt(x + dx, y + dy); if (bldBlock(p)) blocks.add(p); } } r.dead = true; }
  doors = doors.filter(d => !oldRooms.has(rooms[d.room]));
  // fixed blocks first, so the floors know where the walls are
  const wall = new Map<number, string>();
  for (const p of blocks) { wall.set(p.x + p.y * W, p.kind); town.pblock[p.y * W + p.x] = 0; town.propAt.delete(p.y * W + p.x); town.props = town.props.filter(q => q !== p); setT(p.x, p.y, p.kind === 'bdoor' ? T.DOOR : T.WALL); }
  town.win = town.win || new Set<number>(); for (const k of [...town.win]) if (grid[(k / W) | 0][k % W] !== T.WALL) town.win.delete(k);
  const made: any[] = [];
  for (const R of regions) {
    const idx = rooms.length, set = new Set<number>(R); let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (const k of R) { const x = k % W, y = (k / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      if (grid[y][x] === T.CROP) town.crops = (town.crops || []).filter(c => !(c.x === x && c.y === y)); setT(x, y, T.FLOOR); roomAt[y][x] = idx; }
    const edge = new Set<number>(); for (const k of R) { const x = k % W, y = (k / W) | 0; for (const [dx, dy] of BLD_D8) { const nx = x + dx, ny = y + dy, t = grid[ny][nx]; if (t === T.WALL || t === T.DOOR) edge.add(nx + ny * W); } }
    for (const k of edge) { const x = k % W, y = (k / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); const cur = roomAt[y][x]; if (cur < 0 || (rooms[cur] && rooms[cur].dead)) roomAt[y][x] = idx; }
    const room: any = { id: 'free' + (town.bldN = (town.bldN || 0) + 1), name: 'Room', kind: 'room', free: true, x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, side: 'b', doorX: null, doorY: null, lit: 0, beds: [], seats: [], pews: [], spots: {}, floor: 'wood', pantry: {}, noWindows: true, cells: set, walls: edge, built: game.time };
    rooms.push(room); made.push(room);
    // doors: every door tile beside the room is registered once
    for (const k of edge) { const x = k % W, y = (k / W) | 0; if (grid[y][x] !== T.DOOR) continue; if (!BLD_D4.some(([dx, dy]) => set.has(x + dx + (y + dy) * W))) continue; if (!doors.some(d => d.x === x && d.y === y)) doors.push({ x, y, room: idx, o: 0 }); if (room.doorX == null) { room.doorX = x; room.doorY = y; room.side = set.has(x + (y - 1) * W) ? 'b' : 't'; } }
    bounds.x0 = Math.min(bounds.x0, x0); bounds.y0 = Math.min(bounds.y0, y0); bounds.x1 = Math.max(bounds.x1, x1); bounds.y1 = Math.max(bounds.y1, y1);
    for (const k of edge) { const x = k % W, y = (k / W) | 0; if (wall.get(k) === 'bwindow' && grid[y][x] === T.WALL && grid[y][x - 1] !== undefined && (grid[y][x - 1] === T.WALL || grid[y][x - 1] === T.DOOR) && (grid[y][x + 1] === T.WALL || grid[y][x + 1] === T.DOOR) && set.has(x + (y + 1) * W)) town.win.add(k); }
  }
  // doors of rooms that were taken apart and rebuilt: a door tile still stands, and gets a record in the room beside it
  for (const room of made) { const idx = rooms.indexOf(room); for (const k of room.walls) { const x = k % W, y = (k / W) | 0; if (grid[y][x] === T.DOOR && !doors.some(d => d.x === x && d.y === y)) doors.push({ x, y, room: idx, o: 0 }); } }
  if (bounds.x1 >= 0) { markDirty(bounds.x0 - 1, bounds.y0 - 1, bounds.x1 - bounds.x0 + 3, bounds.y1 - bounds.y0 + 3); }
  town.gridV = (town.gridV || 0) + 1; town.lfPV = (town.lfPV || 0) + 1; if (typeof refreshReach === 'function') refreshReach(); rebuildOcc();
  return made;
}
/** look round the blocks that have just landed, and seal whatever they close */
function bldEvaluate(spots: [number, number][]) {
  const seen = new Set<number>(), regions: number[][] = [], dissolve = new Set<any>(); let hint = '';   // (`seen`: tiles of regions already found closed; an open flood is never shared, or its leftovers would look closed)
  for (const [bx, by] of spots) for (const [dx, dy] of BLD_D8) {
    const x = bx + dx, y = by + dy; if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || seen.has(x + y * W) || bldSolid(x, y)) continue;
    const reg = bldFlood(x, y); if (reg.open) continue;
    for (const k of reg.cells) seen.add(k);
    const inRoom = bldFreeRoom(x, y);
    if (inRoom) {   // inside a sealed room: only a partition that really splits it counts (a lone block just stands there)
      if (dissolve.has(inRoom)) continue;
      const seen2 = new Set<number>(), comps: number[][] = []; let ok = true;
      for (const k of inRoom.cells) { if (seen2.has(k) || bldSolid(k % W, (k / W) | 0)) continue; const c = bldFlood(k % W, (k / W) | 0); if (c.open || c.bad) { ok = false; break; } for (const q of c.cells) seen2.add(q); comps.push(c.cells); }
      if (!ok || comps.length < 2 || !comps.every(c => bldExit(c, comps))) continue;
      dissolve.add(inRoom); for (const c of comps) regions.push(c); continue;
    }
    if (reg.bad) { hint = reg.bad; continue; }
    if (reg.cells.length < 1) continue;
    if (!bldHasDoor(reg.cells)) { hint = hint || 'door'; continue; }
    if (!bldExit(reg.cells, [reg.cells])) { hint = hint || 'exit'; continue; }
    regions.push(reg.cells);
  }
  if (!regions.length) return { made: [], hint };
  let made = bldMake(regions, [...dissolve]);
  // rooms that were waiting for a way out may be joined to the new ones by a door: look again from every door of what has just been made
  for (let round = 0; round < 6 && made.length; round++) {
    const ds: [number, number][] = []; for (const m of made) for (const k of m.walls) { const x = k % W, y = (k / W) | 0; if (grid[y][x] === T.DOOR) ds.push([x, y]); }
    const more = bldEvaluate(ds); if (!more.made.length) break; made = made.concat(more.made); if (more.made.length === 0) break;
  }
  return { made, hint };
}
function bldTick() {
  const q = town.bldQ; if (!q || !q.length) return;
  if (town.props.some(p => bldBlock(p) && p.follow)) return;     // wait until the pushing step is over
  const spots: [number, number][] = q.splice(0).filter(p => bldBlock(lfPropAt(p[0], p[1])));
  if (!spots.length) return;
  const r = bldEvaluate(spots), pl = game.player;
  if (r.made.length) { const cells = r.made.reduce((s, m) => s + m.cells.size, 0); chron(`${pl ? pl.first : 'Somebody'} raised ${r.made.length > 1 ? r.made.length + ' rooms' : 'a room'} out of building blocks (${cells} tiles).`, 'build'); if (pl && pl.player) playerSay(pl, r.made.length > 1 ? 'The walls close: ' + r.made.length + ' rooms.' : 'The walls close. A room!'); }
  else if (r.hint === 'exit') { const pl2 = game.player; if (pl2 && pl2.player && spots.some(s => Math.abs(s[0] - pl2.tx) + Math.abs(s[1] - pl2.ty) <= 6)) playerSay(pl2, 'Closed in, but there is no way out: a door has to lead to the outside.'); }
  else if (r.hint === 'door') { const pl2 = game.player; if (pl2 && pl2.player && spots.some(s => Math.abs(s[0] - pl2.tx) + Math.abs(s[1] - pl2.ty) <= 6)) playerSay(pl2, 'Closed in, but it needs a door.'); }
  else if (r.hint && pl && pl.player && spots.some(s => Math.abs(s[0] - pl.tx) + Math.abs(s[1] - pl.ty) <= 6)) playerSay(pl, 'Closed in, but ' + r.hint + ' is inside it.');
}
LF2.tickers.push(bldTick);
