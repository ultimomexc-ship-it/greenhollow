/* ================= world construction ================= */
const setT = (x, y, t) => { if (x >= 0 && y >= 0 && x < W && y < H && grid[y][x] !== t) { grid[y][x] = t; if (town) town.gridV = (town.gridV || 0) + 1; } };   // gridV: anything that caches the map (TrueSight) knows it changed
const rectT = (x, y, w, h, t) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) setT(i, j, t); };
function resetWorld() {
  grid = Array.from({ length: H }, () => Array(W).fill(T.GRASS));
  roomAt = Array.from({ length: H }, () => Array(W).fill(-1));
  rooms = []; doors = []; lamps = [];
}
/** a loose bed, chair or pew is walked over (and sat on), like the ones in a house (so its owner can get into it) */
const lfBedAt = (x, y) => { const p = town.propAt && town.propAt.get(y * W + x); return !!p && (p.kind === 'bed' || p.kind === 'chair' || p.kind === 'pew' || p.kind === 'gate'); };   // (a gate is walked through)
function walkable(x, y) { return x >= 0 && y >= 0 && x < W && y < H && !BLOCKED.has(grid[y][x]) && !(town && town.block && town.block[y * W + x]) && !(town && town.hgt && town.hgt[y * W + x] >= 0) && !(town && town.fmask && town.fmask[y * W + x]) && !(town && town.pblock && town.pblock[y * W + x] && !LF.seeThru && !lfBedAt(x, y)); }
function tileCost(x, y) { return COST[grid[y][x]] || 1; }
const vh = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function vnoise(x, y, s) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = vh(x0, y0, s), b = vh(x0 + 1, y0, s), c = vh(x0, y0 + 1, s), d = vh(x0 + 1, y0 + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function refreshReach() { const _st = LF.seeThru; LF.seeThru = true; try { refreshReach0(); } finally { LF.seeThru = _st; } }
function refreshReach0() {
  const seen = new Uint8Array(W * H), st = [[town.yard.stand.x, town.yard.stand.y]]; seen[town.yard.stand.y * W + town.yard.stand.x] = 1;
  while (st.length) { const [x, y] = st.pop(); for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (walkable(nx, ny) && !seen[ny * W + nx]) { seen[ny * W + nx] = 1; st.push([nx, ny]); } }
    const po = town.portals && town.portals.get(y * W + x); if (po !== undefined && !seen[po]) { seen[po] = 1; st.push([po % W, (po / W) | 0]); } }
  reach = seen;
}
function refreshShore() {
  shoreTiles = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const g = grid[y][x]; if ((g !== T.GRASS && g !== T.SAND) || roomAt[y][x] >= 0 || !reach[y * W + x]) continue;
    const w = DIRS.find(([dx, dy]) => grid[y + dy][x + dx] === T.WATER);
    if (!w) continue;
    const z = (x >> 3) + (y >> 3) * 64;
    shoreTiles.push({ x, y, z, face: { dx: w[0], dy: w[1] } });
    if (!town.fishZones[z]) town.fishZones[z] = { stock: 14, cap: 14 };
  }
  town.shoreSpots = shoreTiles;
}

/** The levels: the map is stacked downwards in blocks of town.h0 rows. Block 0 is the ground; row y + h0 is the level above row y (roof decks, SKY elsewhere), blocks 3 and 4 are the earth below the island
    (EARTH with ore in it, dug out by hand). Everything that works on the ground works on every level unchanged (building, sealing, props, rooms, walking, TrueSight), because it is only more map; stairs link
    the levels (town.portals). Safe to call twice, and for islands saved with fewer levels. */
function growLevels() {
  const H0 = town.h0 || H; town.h0 = H0; const have = Math.max(1, Math.round(grid.length / H0)); if (have >= LV_N) { H = grid.length; return; }
  const oldH = grid.length;
  for (let b = have; b < LV_N; b++) for (let y = 0; y < H0; y++) { grid.push(Array(W).fill(b >= LV_MINE ? T.EARTH : T.SKY)); roomAt.push(Array(W).fill(-1)); }
  H = grid.length;
  const ext = (a, Ctor, fill = 0) => { if (!a || a.length !== W * oldH) return a; const b = new Ctor(W * H).fill(fill); b.set(a); return b; };
  for (const [k, fill, C] of [['hgt', -1, Float32Array], ['fmask', 0, Uint8Array], ['cmask', 0, Uint8Array], ['islet', 0, Uint8Array], ['fout', 255, Uint8Array], ['fin', 255, Uint8Array], ['cout', 255, Uint8Array], ['siteAt', 0, Uint16Array], ['block', 0, Uint8Array], ['pblock', 0, Uint8Array]] as any[]) if (town[k]) town[k] = ext(town[k], C, fill);   // (the other levels are neither water, forest nor coast)
  town.portals = town.portals || new Map(); town.stairs = town.stairs || [];
  town.ore = new Uint8Array(W * H); const seed = (town.seed | 0) + 17;   // 1 iron, 2 copper, 3 gold: in veins; the second mine is richer
  for (let y = 2 * 0 + LV_MINE * H0; y < H; y++) for (let x = 2; x < W - 2; x++) { const deep = y >= (LV_MINE + 1) * H0, v = vnoise(x * 0.17, y * 0.17, seed), w = vnoise(x * 0.21, y * 0.21, seed + 5), q = vh(x, y, seed + 9);
    if (v > (deep ? 0.72 : 0.76) && q < 0.75) town.ore[y * W + x] = 1; else if (w > (deep ? 0.74 : 0.79) && q < 0.7) town.ore[y * W + x] = 2; else if (q < (deep ? 0.012 : 0.002) && vh(x, y, seed + 3) < 0.5) town.ore[y * W + x] = 3; }
  reach = new Uint8Array(W * H); town.gridV = (town.gridV || 0) + 1;
}
function generateTown(seed, size) {
  setSize(size || 'M');
  const R = rng(seed >>> 0); NEXT_ID = 1; resetWorld();
  town = { seed, cx: 0, cy: 0, vx: 0, roadY: 0, well: null, wants: {}, church: null, tavern: null, stalls: [], sites: [], dead: [], chron: [], salvage: 0, clearR: 1, nodes: [], nodeMap: new Map(), crops: [], fields: 0,
    forges: [], ovens: [], patrol: [], troubles: [], used: new Set(), nextSite: 1, treasury: 0, hist: { pop: [], price: {}, coins: [], treasury: [] }, size: sizeKey, graves: 0, births: 0, deaths: 0, weddings: 0 };
  town.siteAt = new Uint16Array(W * H); town.block = new Uint8Array(W * H); town.treeClaim = new Set();
  town.fishZones = {}; town.markets = [];
  const ns = Math.floor(R() * 1000), ns2 = Math.floor(R() * 1000);
  const I = carveIsland(R, ns, ns2);
  const cx = I.cx, cy = I.cy; town.cx = cx; town.cy = cy; town.vx = cx; town.roadY = cy;
  // the settlers' camp: a bare patch of ground, a lamp and two piles
  const mk0 = { id: 0, x: cx, y: cy + 1, name: 'The Camp', stalls: [], plaza: [], camp: true };
  town.markets.push(mk0);
  // a round camp ground, wide enough for tents around the edge and a gathering in the middle
  const inCamp = (x, y) => (x - cx) * (x - cx) + (y - cy - 0.5) * (y - cy - 0.5) <= 6.6 * 6.6;
  for (let y = cy - 7; y <= cy + 8; y++) for (let x = cx - 7; x <= cx + 7; x++) if (inCamp(x, y)) grid[y][x] = T.PATH;
  setT(cx, cy - 1, T.LAMP); lamps.push({ x: cx, y: cy - 1 });
  town.yard = { x: cx, y: cy, wood: { x: cx - 1, y: cy }, stone: { x: cx + 1, y: cy }, stand: { x: cx, y: cy + 1, face: { dx: 0, dy: -1 } } };
  const wild = (x, y) => town.fmask[y * W + x] || town.cmask[y * W + x];
  // a few small rocky knolls within reach of the camp
  for (let k = 0; k < 3; k++) {
    const a = R() * 6.283 + k * 2.1, d = 13 + R() * 9, ox = Math.round(cx + Math.cos(a) * d * 1.3), oy = Math.round(cy + Math.sin(a) * d);
    for (let y = oy - 5; y <= oy + 5; y++) for (let x = ox - 7; x <= ox + 7; x++) { if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) continue; if (grid[y][x] === T.WATER || wild(x, y)) continue; const e = ((x - ox) / 3.6) ** 2 + ((y - oy) / 2.6) ** 2; const v = e + (vnoise(x * 0.5, y * 0.5, ns2 + k) - 0.5) * 0.7; if (Math.hypot(x - cx, y - cy) <= 9) continue;
      if (v < 0.5) grid[y][x] = T.MOUNTAIN; else if (v < 1.5 && (grid[y][x] === T.GRASS || grid[y][x] === T.TREE) && R() < 0.4) grid[y][x] = T.ROCK; }
  }
  // loose boulders: the stone people can actually break. They gather at the foot of the knolls, with a few strays in the grass
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    if (grid[y][x] !== T.GRASS || Math.hypot(x - cx, y - cy) < 9 || wild(x, y)) continue;
    let mt = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (grid[y + j][x + i] === T.MOUNTAIN) mt++;
    if ((mt && R() < 0.16) || R() < 0.0025) grid[y][x] = T.ROCK;
  }
  { let nb = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (grid[y][x] === T.ROCK && !wild(x, y)) nb++; town.rockCap = nb; }
  islandFeatures(R, I, ns2);
  town.graveyard = { x: 0, y: 0, w: 0, h: 0, slots: [], blocks: [] };
  town.pondInfo = { cap: 0, stock: 0, fishedToday: 0, fishedTotal: 0 };
  refreshReach(); refreshShore();
  plazaTiles = mk0.plaza;
  for (let y = cy - 7; y <= cy + 8; y++) for (let x = cx - 7; x <= cx + 7; x++) if (grid[y][x] === T.PATH && (x - cx) * (x - cx) + (y - cy - 0.5) * (y - cy - 0.5) <= 6.6 * 6.6) plazaTiles.push({ x, y });
  town.patrol = [];
  // the founding families
  startPeople(R);
  townName(R);
  growLevels();
  refreshReach(); refreshShore(); spawnNodes(18);
  return town;
}
