/* The build town: a start game under the Hamlet's rules (yards, rent, the household store, farming, the trader, stalls as upgrades, the
   progression), but already grown: twenty people in nine fenced yards, each with a small house sealed from blocks (a door, a window), a bed for
   everyone in it, and fields along the side, some of them sown. Islands panel: "Build town" (`loadTown(seed, 'L', 'town')`, `town.scenario` stays
   'hamlet' so every rule applies, `town.variant = 'town'`). No tutorial. From here it is the full game: more yards and houses bring more people.

   One lot (relative to its top-left corner), LOT_W x LOT_H, the fence ring on its edge with the gate in the bottom row:
     the house: walls x 1..5, y 1..4 (inside 3 x 2), the door at (3, 4), a window at (4, 1); the fields: x 7..9, y 1..6 (three across, six down). */
const LOT_W = 11, LOT_H = 9;
/** the households that come with the town, beyond you, the trader and the family from the Hamlet's start: 4 + 3 + 2 + 2 + 2 + 1 + 1 = 15, twenty in all */
const TOWN_HOMES = [4, 3, 2, 2, 2, 1, 1];

/** can a lot stand here: open ground (trees, rocks and bushes are cleared), nothing built, nothing claimed, a tile of margin round it */
function townLotFree(x0: number, y0: number, taken: Set<number>): boolean {
  for (let j = -1; j <= LOT_H; j++) for (let i = -1; i <= LOT_W; i++) {
    const x = x0 + i, y = y0 + j; if (x < 4 || y < 4 || x >= W - 4 || y >= (town.h0 || H) - 4) return false;
    const g = grid[y][x]; if (taken.has(y * W + x) || roomAt[y][x] >= 0 || lfPropAt(x, y) || tileOwner.get(y * W + x)) return false;
    if (![T.GRASS, T.PATH, T.SAND, T.TREE, T.ROCK, T.CROP].includes(g)) return false;
    if (town.markets && town.markets.some((m: any) => (m.plaza || []).some((p: any) => p.x === x && p.y === y))) return false;
    if (town.stalls && town.stalls.some((s: any) => Math.abs(s.x - x) <= 1 && Math.abs(s.y - y) <= 2)) return false;
  }
  return true;
}
/** the next free lot, in rings round the camp, a street apart */
function townLotFind(cx: number, cy: number, taken: Set<number>): any {
  for (let r = 6; r < 60; r += 2) for (let k = 0; k < 64; k++) {
    const an = k / 64 * 6.283, x0 = Math.round(cx + Math.cos(an) * r * 1.3 - LOT_W / 2), y0 = Math.round(cy + Math.sin(an) * r - LOT_H / 2);
    if (townLotFree(x0, y0, taken)) return { x: x0, y: y0 };
  }
  return null;
}
/** make a household: a couple and children, or one adult */
function townHousehold(R: any, size: number): any[] {
  const sn = pick(R, SURNAMES), out: any[] = [];
  if (size === 1) { out.push(newPerson(R, 'Child', ri(R, 20, 40), town.used, { female: R() < 0.5, surname: sn })); }
  else { const a: any = newPerson(R, 'Child', ri(R, 25, 40), town.used, { female: false, surname: sn }), b: any = newPerson(R, 'Child', ri(R, 23, 38), town.used, { female: true, surname: sn }); setSpouse(a, b); out.push(a, b);
    for (let i = 2; i < size; i++) { const c: any = newPerson(R, 'Child', ri(R, 3, 13), town.used, { mother: b, father: a, surname: sn }); linkKin(b, a, c); fam2(a, c, 'parent', 'child'); fam2(b, c, 'parent', 'child'); out.push(c); } }
  for (const n of out) {
    n.adult = n.age >= 16; n.infant = false; n.age = ageNow(n); updateLook(n); n.rand = rng(town.seed + n.id * 977); n.jit = 0; n.bornHere = false;
    n.homeRoom = null; n.bed = { owner: null }; n.seat = null; n.homeless = true; routine(R, n); town.byId.set(n.id, n); initNpcSim(n); if (n.adult) setRole(n, 'Worker'); n.inv = n.inv || {};
    if (n.adult) { n.back = pick(R, VIS_ORD) + ', ' + pick(R, VIS_ARR); n.coin = ri(R, 14, 26); n.inv.grain = 6; n.inv['seed_' + pick(R, ['barley', 'turnip', 'cabbage'])] = 4; } else n.coin = 0;
    npcs.push(n);
  }
  return out;
}
/** stamp one lot: clear it, ring it with fence and a gate, seal a house from blocks, put a bed in it for each person, lay the fields */
function townLot(R: any, at: any, people: any[], taken: Set<number>) {
  const X = at.x, Y = at.y;
  for (let j = 0; j < LOT_H; j++) for (let i = 0; i < LOT_W; i++) { const x = X + i, y = Y + j; taken.add(y * W + x);
    if (grid[y][x] !== T.GRASS) setT(x, y, T.GRASS); if (town.nodeMap && town.nodeMap.has(y * W + x)) { const nd = town.nodeMap.get(y * W + x); town.nodes = town.nodes.filter((q: any) => q !== nd); town.nodeMap.delete(y * W + x); }
    town.crops = town.crops.filter((c: any) => !(c.x === x && c.y === y)); markDirty(x, y, 1, 1); }
  // the fence ring, the gate in the middle of the bottom row
  const gx = X + Math.floor(LOT_W / 2), gy = Y + LOT_H - 1;
  for (let j = 0; j < LOT_H; j++) for (let i = 0; i < LOT_W; i++) if (i === 0 || j === 0 || i === LOT_W - 1 || j === LOT_H - 1) { const x = X + i, y = Y + j, f: any = lfAddProp(x === gx && y === gy ? 'gate' : 'fence', x, y); f.rot = 0; }
  // the house: wall blocks, a window in the back wall, the door in the front; sealed by the same code that seals what you build
  const spots: [number, number][] = [];
  for (let j = 1; j <= 4; j++) for (let i = 1; i <= 5; i++) if (i === 1 || j === 1 || i === 5 || j === 4) { const x = X + i, y = Y + j, k = i === 3 && j === 4 ? 'bdoor' : i === 4 && j === 1 ? 'bwindow' : 'bwall'; lfAddProp(k, x, y); spots.push([x, y]); }
  bldEvaluate(spots);
  // a bed each, inside (six floor tiles: up to four beds and room to get in)
  const inside = [[2, 2], [4, 2], [2, 3], [4, 3], [3, 2], [3, 3]];
  people.forEach((n, i) => { const [ix, iy] = inside[i % inside.length], pr: any = lfAddProp('bed', X + ix, Y + iy); pr.v = Math.floor(R() * 5); pr.rot = 0; pr.owner = n; n.bed = pr; n.homeless = false; });
  // the fields: six a grown-up, three across from the top, about half of them sown and growing
  const adults = people.filter(n => n.adult).length, nf = Math.min(18, Math.max(6, adults * 6)), seeds = ['barley', 'barley', 'turnip', 'cabbage'];
  for (let k = 0; k < nf; k++) { const x = X + 7 + (k % 3), y = Y + 1 + Math.floor(k / 3); setT(x, y, T.CROP); const c: any = { x, y, pl: 1, st: 0, t0: 0, byField: people[0].id };
    if (R() < 0.55) { c.st = 1; c.seed = pick(R, seeds); c.t0 = game.time - R() * itGrow(c) * 0.9; } town.crops.push(c); markDirty(x, y, 1, 1); }
  // everyone stands in the yard, in front of the house
  people.forEach((n, i) => { abortPlan(n); n.tx = n.x = X + 2 + (i % 4); n.ty = n.y = Y + 5 + Math.floor(i / 4); n.path = []; n.moving = false; n.pose = 'stand'; n.face = { dx: 0, dy: 1 }; });
}
/** the whole town, after the Hamlet's start has made you, the trader (with his yard and stall) and the family */
function townBuild(R: any, P: any, fam: any[], taken: Set<number>, cx: number, cy: number) {
  // the family's and your own loose beds from the Hamlet's start go: everybody gets a bed in a house
  for (const pr of town.props.slice()) if (pr.kind === 'bed' && (pr.owner === P || fam.includes(pr.owner))) { town.props.splice(town.props.indexOf(pr), 1); town.propAt.delete(pr.y * W + pr.x); town.pblock[pr.y * W + pr.x] = 0; }
  for (const n of [P].concat(fam)) { n.bed = { owner: null }; n.homeless = true; }
  const homes: any[][] = [[P], fam].concat(TOWN_HOMES.map(s => townHousehold(R, s)));
  for (const h of homes) { const at = townLotFind(cx, cy, taken); if (!at) break; townLot(R, at, h, taken); }
  // everybody has met everybody (a town that has been here a while), neighbours a little better than strangers
  for (const x of npcs) for (const y of npcs) if (x !== y) { x.know[y.id] = Math.max(x.know[y.id] || 0, 12); x.aff[y.id] = Math.max(x.aff[y.id] || 0, 10); }
  // what you start with is nothing new to you: no cards for your tools, seed, bed, fences or the crops of the town (the cards are for the tutorial)
  const seen = town.itemSeen = town.itemSeen || {}; for (const k of ['axe', 'hammer', 'hoe', 'rod', 'lockpick', 'bed', 'fence', 'gate', 'field', 'wall', 'bwall', 'door', 'window', 'grain', 'turnip', 'cabbage', 'poppy', 'flowers'].concat(Object.keys(IT_STACKS))) seen[k] = true;
  P.coin = 80; game.time = Math.floor(game.time / 1440) * 1440 + 7 * 60; game.ft = game.time;
  if (typeof visHomes === 'function') visHomes();
  for (const n of npcs) { const b = n.bed; if (b && b.x != null) { const r = rooms.find((q: any) => !q.dead && q.cells && q.cells.has(b.x + b.y * W)); if (r) { n.homeRoom = r; r.name = (n.surname || 'The') + ' house'; } } }
  town.gridV = (town.gridV || 0) + 1; town.lfPV = (town.lfPV || 0) + 1; rebuildOcc(); refreshReach(); yardScan(true); yardHousing();
  chron('The town has been here a little while: ' + npcs.length + ' people in ' + (town.yards || []).filter((y: any) => yardPeople(y).length).length + ' yards, a trader at his stall. More yards and houses will bring more people.', 'note');
}
