/* ================= life2 / push: pushing things like Sokoban =================
   In Push mode, walking into a pushable thing pushes it one tile, and it moves at exactly your pace: you walk into the tile it leaves, and it is drawn that much
   further on at every moment (it follows your step, not a timer). Pushables in a line go together: up to three pieces at once, so you can shove a crate
   into a barrel into a stool. A line moves only if the last piece has somewhere to go.
   What can be pushed: crates, barrels and stools in the open; rocks (a rock you push becomes a loose rock; break it with the hammer to get stone and, now and then,
   iron; a loose rock can be pushed anywhere a crate can, so you can build with them); and light furniture inside a house: chairs, beds and the family barrel.
   Loose things can be pushed through a doorway and into a house (they stay loose things; the neighbours still drag one away if it traps somebody behind a door).
   Furniture stays in its room, never onto the doorstep inside, never onto somebody, and never so that it cuts a seat, bed or the pantry off from the door.
   Villagers shoving things about (lfPush) work as before.                                                                                                      */
const PUSH_MAX = 3;
const LF_ROCK_ART = ['boulder_0', 'boulder_1', 'boulder_2', 'boulder_3'];
Object.assign(LF_NOUN, { rock: 'rock' });
/** how a loose thing is drawn (a chair or bed pushed out of a house keeps its look) */
const lfPropArt = pr => pr.kind === 'rock' ? LF_ROCK_ART[(pr.v || 0) & 3] : pr.kind === 'chair' ? 'seat_down' : pr.kind === 'bed' ? 'bed_head_up_' + ((pr.v || 0) % 5) : (LF_ART[pr.kind] || 'crate');
const PUSH_FURNITURE = new Set([T.SEAT, T.BED, T.BARREL]);
const pushRoomOf = (x, y) => { const i = roomAt[y] && roomAt[y][x]; return i != null && i >= 0 ? rooms[i] : null; };
/** the light furniture standing on this tile (a house or tavern chair, bed or the family barrel), or null */
function pushFurniture(x, y) {
  const g = grid[y] && grid[y][x]; if (!PUSH_FURNITURE.has(g)) return null; const r = pushRoomOf(x, y); if (!r || r.dead || r.kind === 'privy' || r.kind === 'church' || r.kind === 'jail') return null;
  if (g === T.SEAT) { const s = (r.seats || []).find(q => q.x === x && q.y === y && !q.out); return s ? { type: 'seat', t: g, r, o: s } : null; }
  if (g === T.BED) { const b = (r.beds || []).find(q => q.x === x && q.y === y && !q.out); return b ? { type: 'bed', t: g, r, o: b } : null; }
  if (r.barrel && !r.barrel.out && r.barrel.x === x && r.barrel.y === y) return { type: 'barrel', t: g, r, o: r.barrel };
  return null;
}
/** the tile is inside the room, but not the one just inside the door (a house must never be sealed by its own furniture) */

/** can a loose thing be pushed onto (nx, ny)? Loose things may cross a doorway and go into a house. */
function pushLooseOK(nx, ny, ignoreOwner?) {
  if (nx < 2 || ny < 2 || nx >= W - 2 || ny >= H - 2) return false;
  if (!walkable(nx, ny) || (!ignoreOwner && tileOwner.get(ny * W + nx))) return false;
  const g = grid[ny][nx];
  if (g === T.SEAT || g === T.BED || g === T.PEW || g === T.CROP || g === T.PLOT || g === T.TENT) return false;
  if (town.siteAt[ny * W + nx] || noStep(nx, ny)) return false;
  if ((town.stalls || []).some(s => s.front.x === nx && s.front.y === ny)) return false;
  const y = town.yard; if (y && Math.abs(nx - y.x) <= 1 && ny >= y.y - 1 && ny <= y.y + 1) return false;
  const rm = pushRoomOf(nx, ny); if (rm && (rm.kind === 'jail' || rm.kind === 'church' || rm.kind === 'privy')) return false;
  return true;
}
/** can this bit of furniture go to (nx, ny)? Within its room, onto bare floor or a rug; or onto the doorway, which takes it outside (it becomes a loose thing). */
function pushFurnitureOK(f, nx, ny, ignoreOwner?) {
  const r = f.r;
  if (nx === r.doorX && ny === r.doorY) return pushLooseOK(nx, ny, ignoreOwner);          // out of the door
  if (pushRoomOf(nx, ny) !== r || nx <= r.x || nx >= r.x + r.w - 1 || ny <= r.y || ny >= r.y + r.h - 1) return false;
  if (!ignoreOwner && tileOwner.get(ny * W + nx)) return false;
  const g = grid[ny][nx]; if (g !== T.FLOOR && g !== T.RUG) return false; if (lfPropAt(nx, ny)) return false;
  if (f.type === 'barrel') { const sp = r.spots && r.spots.pantry; if (sp) { const sx = sp.x + (nx - f.o.x), sy = sp.y + (ny - f.o.y), sg = grid[sy] && grid[sy][sx]; if (pushRoomOf(sx, sy) !== r || (sg !== T.FLOOR && sg !== T.RUG && sg !== T.SEAT && sg !== T.BED)) return false; } }
  return true;
}
/** after laying the furniture out like this, can every seat, bed and the pantry still be reached from the door? (only a barrel blocks; chairs and beds are walked over) */
function pushRoomConnected(r, moves: [number, number, number, number][]) {
  const inside = (x, y) => x > r.x && x < r.x + r.w - 1 && y > r.y && y < r.y + r.h - 1, b = r.barrel && !r.barrel.out ? r.barrel : null, mb = b && moves.find(m => m[0] === b.x && m[1] === b.y), leaving = m => !(m[2] > r.x && m[2] < r.x + r.w - 1 && m[3] > r.y && m[3] < r.y + r.h - 1);
  const barrel = b ? (mb && !leaving(mb) ? [mb[2], mb[3]] : mb ? null : [b.x, b.y]) : null, key = (x, y) => y * W + x;
  const blocked = (x, y) => (BLOCKED.has(grid[y][x]) && grid[y][x] !== T.BARREL) || (barrel && barrel[0] === x && barrel[1] === y) || (grid[y][x] === T.BARREL && !(b && b.x === x && b.y === y));
  const din = { x: r.doorX, y: r.side === 'b' ? r.doorY - 1 : r.doorY + 1 }, seen = new Set<number>([key(din.x, din.y)]), q = [din];
  while (q.length) { const c = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = c.x + dx, y = c.y + dy; if (!inside(x, y) || seen.has(key(x, y)) || blocked(x, y)) continue; seen.add(key(x, y)); q.push({ x, y }); } }
  const at = o => { const m = moves.find(mm => mm[0] === o.x && mm[1] === o.y); return m ? (leaving(m) ? null : [m[2], m[3]]) : [o.x, o.y]; };
  const need = [...(r.seats || []), ...(r.beds || [])].filter(o => !o.out).map(at).filter(Boolean), sp = r.spots && r.spots.pantry; if (sp && !(b === null && r.barrel)) need.push(mb && !leaving(mb) ? [sp.x + (mb[2] - mb[0]), sp.y + (mb[3] - mb[1])] : [sp.x, sp.y]);
  return need.every(([x, y]) => seen.has(key(x, y)));
}

/** a rock turns into a loose rock when it is pushed */
function pushRockToProp(x, y) {
  if (grid[y][x] !== T.ROCK) return null; setT(x, y, T.GRASS); markDirty(x, y, 1, 1); town.treeDirty = true; town.stoneCache = null; if (town.treeClaim) town.treeClaim.delete(y * W + x);
  const pr: any = lfAddProp('rock', x, y); pr.v = Math.floor(ART.h32(x, y, 64, 64) * 4); return pr;
}

/** the line of things in front of the player in this direction (up to PUSH_MAX + 1, to know when it is too much), or null when the first tile has nothing pushable */
function pushLine(n, x, y, dx, dy) {
  const line: any[] = [];
  for (let i = 0; i <= PUSH_MAX; i++) {
    const px = x + dx * i, py = y + dy * i; if (px < 0 || py < 0 || px >= W || py >= H) break;
    const pr = lfPropAt(px, py), f = pr ? null : pushFurniture(px, py), rock = !pr && !f && grid[py][px] === T.ROCK;
    if (pr) line.push({ kind: 'prop', x: px, y: py, pr }); else if (f) line.push({ kind: 'furniture', x: px, y: py, f }); else if (rock) line.push({ kind: 'rock', x: px, y: py }); else break;
  }
  return line.length ? line : null;
}
/** a person where the last piece is going is shoved out of the way (ahead, else to a side); sleepers and people sitting down are not shoved. Returns the tile they go to, null (nobody there) or a reason. */
function pushShoveTarget(n, nx, ny, dx, dy): any {
  const who = tileOwner.get(ny * W + nx); if (!who || who === n || who.dead || who.infant) return null;
  if (who.pose === 'sleep' || who.pose === 'sit' || who.pose === 'kneel') return (who.first || 'Somebody') + ' is in the way.';
  for (const [ax, ay] of [[dx, dy], [dy, dx], [-dy, -dx]]) { const x = nx + ax, y = ny + ay; if (lf2PersonOK(x, y) && !tileOwner.get(y * W + x) && !lfPropAt(x, y)) return { who, x, y }; }
  return (who.first || 'Somebody') + ' has nowhere to go.';
}
/** push the line one tile; returns true, or the reason it cannot be done (null: nothing to push). A line is all loose things or all furniture.
    When the last piece cannot move (a wall, a corner) you swap places with the piece you are holding, and so on down the line: push on and you pass through it. */
function lf2PushLine(n, x, y, dx, dy): true | string | null {
  const line = pushLine(n, x, y, dx, dy); if (!line) return null;
  const furn = line[0].kind === 'furniture'; if (line.some(p => (p.kind === 'furniture') !== furn)) return pushSwap(n, line[0]);
  const last = line[line.length - 1], nx = last.x + dx, ny = last.y + dy; let shove: any = null, name = 'It';
  if (furn) {
    const r = line[0].f.r; if (line.some(p => p.f.r !== r)) return pushSwap(n, line[0]);
    for (const p of line) { const who = tileOwner.get(p.y * W + p.x); if (who && who !== n) return (who.first || 'Somebody') + ' is using it.'; }
    name = 'The ' + (line[0].f.type === 'seat' ? 'chair' : line[0].f.type);
    if (!pushFurnitureOK(last.f, nx, ny, true)) return pushSwap(n, line[0]);
    shove = pushShoveTarget(n, nx, ny, dx, dy); if (typeof shove === 'string') return shove;
    const leaves = nx === r.doorX && ny === r.doorY || line.some(p => p.x + dx === r.doorX && p.y + dy === r.doorY);
    if (!pushRoomConnected(r, line.map(p => [p.x, p.y, p.x + dx, p.y + dy] as [number, number, number, number]))) return 'That would block the way in the ' + (r.kind === 'house' ? 'house' : 'room') + '.';
  } else {
    if (!pushLooseOK(nx, ny, true)) return pushSwap(n, line[0]);
    shove = pushShoveTarget(n, nx, ny, dx, dy); if (typeof shove === 'string') return shove;
  }
  if (line.length > PUSH_MAX) return 'Too much to push at once.';
  if (shove) { lf2Relocate(shove.who, shove.x, shove.y); if (Math.random() < 0.5) lfShout(shove.who, anyOf(['Oi!', 'Hey! Watch it!', 'Oh! Excuse me.', 'Steady on!'])); }
  // move from the front, so each piece lands on the tile the next one has just left
  const moved: any[] = [];
  for (let i = line.length - 1; i >= 0; i--) {
    const p = line[i];
    if (p.kind === 'rock') { const pr = pushRockToProp(p.x, p.y); if (!pr) return 'It won\'t budge.'; p.pr = pr; p.kind = 'prop'; }
    if (p.kind === 'prop') { pushMoveProp(p.pr, dx, dy, n); moved.push(p.pr); } else { const pr = pushMoveFurniture(p.f, dx, dy, n); if (pr) moved.push(pr); }
  }
  if (typeof refreshReach === 'function') refreshReach();
  for (const pr of moved) if (typeof lf2AfterPush === 'function' && lfPropAt(pr.x, pr.y) === pr) lf2AfterPush(n, pr);
  return true;
}
/** swap places with the piece in front of you: it goes to the tile you stand on (the same step carries you into its tile, and it is drawn following your step) */
function pushSwap(n, piece): true | string {
  const px = n.tx, py = n.ty;
  if (piece.kind === 'furniture') {
    const f = piece.f; if (tileOwner.get(piece.y * W + piece.x) && tileOwner.get(piece.y * W + piece.x) !== n) return 'It won\'t budge.';
    if (!pushFurnitureOK(f, px, py, true) || !(px !== f.r.doorX || py !== f.r.doorY)) return 'The ' + (f.type === 'seat' ? 'chair' : f.type) + ' won\'t budge.';
    if (!pushRoomConnected(f.r, [[piece.x, piece.y, px, py]])) return 'That would block the way in the room.';
    pushMoveFurniture(f, px - piece.x, py - piece.y, n); if (typeof refreshReach === 'function') refreshReach(); return true;
  }
  let pr = piece.pr; if (!pr && piece.kind === 'rock') pr = pushRockToProp(piece.x, piece.y); if (!pr) return 'It won\'t budge.';
  if (!pushLooseOK(px, py, true)) return 'It won\'t budge.';
  pushMoveProp(pr, px - pr.x, py - pr.y, n); if (typeof refreshReach === 'function') refreshReach(); return true;
}
/** move a loose thing one tile; for the player it is drawn following the player's own step (and only that step: see lfPropPos) */
function pushMoveProp(pr, dx, dy, by) {
  town.pblock[pr.y * W + pr.x] = 0; town.propAt.delete(pr.y * W + pr.x);
  pr.fx = pr.x; pr.fy = pr.y; pr.x += dx; pr.y += dy; pr.st = by && by.player ? 0 : performance.now(); pr.follow = by && by.player ? by : null; pr.followW = by ? by.walked : 0; pr.moved = game.time; pr.by = by ? by.id : null;
  town.pblock[pr.y * W + pr.x] = 1; town.propAt.set(pr.y * W + pr.x, pr); town.lfPV = (town.lfPV || 0) + 1;
  pr.seen = []; for (const o of npcs) if (o !== by && !o.dead && !o.infant && o.pose !== 'sleep' && Math.abs(o.tx - pr.x) + Math.abs(o.ty - pr.y) <= 10) pr.seen.push(o.id);
  if (pr.fur) pushMaybeRestore(pr);
}
/** a chair, bed or barrel that was pushed out of a house and has been pushed back inside goes back to being the house's furniture */
function pushMaybeRestore(pr) {
  const f = pr.fur, r = f.r, ri = rooms.indexOf(r); if (roomAt[pr.y][pr.x] !== ri || pr.x === r.doorX && pr.y === r.doorY) return;
  const g = grid[pr.y][pr.x]; if (g !== T.FLOOR && g !== T.RUG) return;
  const o = f.o, dx = pr.x - o.x, dy = pr.y - o.y; town.pblock[pr.y * W + pr.x] = 0; town.propAt.delete(pr.y * W + pr.x); town.props = town.props.filter(q => q !== pr);
  setT(pr.x, pr.y, f.t); o.x = pr.x; o.y = pr.y; delete o.out; if (f.type === 'barrel' && r.spots && r.spots.pantry) { r.spots.pantry.x += dx; r.spots.pantry.y += dy; }
  if (f.type === 'seat') for (const [ax, ay] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (grid[pr.y + ay] && grid[pr.y + ay][pr.x + ax] === T.TABLE) { o.face = { dx: ax, dy: ay }; break; }
  markDirty(pr.x, pr.y, 1, 1); town.lfPV = (town.lfPV || 0) + 1; town.gridV = (town.gridV || 0) + 1;
}
/** move a chair, bed or the family barrel one tile inside its room: the tile type, the room's lists and the pantry spot all move with it. Onto the doorway it goes outside and becomes a loose thing. */
function pushMoveFurniture(f, dx, dy, by?) {
  const o = f.o, fx = o.x, fy = o.y, tx = fx + dx, ty = fy + dy;
  if (tx === f.r.doorX && ty === f.r.doorY) {   // out of the door: a loose thing now (the room keeps its record, marked out, so it can come back)
    setT(fx, fy, T.FLOOR); o.out = true; const kind = f.type === 'seat' ? 'chair' : f.type, pr: any = lfAddProp(kind, tx, ty); pr.fur = f; pr.v = Math.floor(ART.h32(fx, fy, 61, 61) * 5);
    pr.fx = fx; pr.fy = fy; pr.st = by && by.player ? 0 : performance.now(); pr.follow = by && by.player ? by : null; pr.followW = by ? by.walked : 0; pr.moved = game.time; pr.by = by ? by.id : null; pr.seen = [];
    markDirty(Math.min(fx, tx), Math.min(fy, ty), Math.abs(dx) + 1, Math.abs(dy) + 1); town.gridV = (town.gridV || 0) + 1; return pr;
  }
  setT(fx, fy, T.FLOOR); setT(tx, ty, f.t); o.x = tx; o.y = ty;
  if (f.type === 'barrel') { const sp = f.r.spots && f.r.spots.pantry; if (sp) { sp.x += dx; sp.y += dy; } }
  if (f.type === 'seat') { // a chair turns to face the table beside it, if there is one
    for (const [ax, ay] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (grid[ty + ay] && grid[ty + ay][tx + ax] === T.TABLE) { o.face = { dx: ax, dy: ay }; break; } }
  markDirty(Math.min(fx, tx), Math.min(fy, ty), Math.abs(dx) + 1, Math.abs(dy) + 1);
  town.lfPV = (town.lfPV || 0) + 1; town.gridV = (town.gridV || 0) + 1; return null;
}
/** where a loose thing is drawn: a thing the player is pushing follows the player's own step (so it moves at exactly the player's pace), anything else slides on a timer */
function lfPropPos(pr, now): [number, number] {
  let x = pr.x, y = pr.y;
  if (pr.follow) { const f = pr.follow; if (f.moving && f.path && f.path.length && f.walked === pr.followW) { const t = Math.max(0, Math.min(1, f.t || 0)); x = pr.fx + (pr.x - pr.fx) * t; y = pr.fy + (pr.y - pr.fy) * t; } else pr.follow = null; }
  else if (pr.st) { const e = Math.min(1, (now - pr.st) / pr.dur); if (e < 1) { const q = e * e * (3 - 2 * e); x = pr.fx + (pr.x - pr.fx) * q; y = pr.fy + (pr.y - pr.fy) * q; } else pr.st = 0; }
  return [x, y];
}
/** a loose rock broken with the hammer: it is gone, and leaves stone (and now and then iron) */
function lf2BreakRock(n, pr) {
  if (lfPropAt(pr.x, pr.y) !== pr) return; workFx('split', pr.x, pr.y, n);
  town.pblock[pr.y * W + pr.x] = 0; town.propAt.delete(pr.y * W + pr.x); town.props = town.props.filter(q => q !== pr); town.lfPV = (town.lfPV || 0) + 1;
  dropAt(pr.x, pr.y, 'stone'); if (typeof itRockOre === 'function' && itRockOre(n)) playerSay(n, 'Iron ore in the rock!');
}
