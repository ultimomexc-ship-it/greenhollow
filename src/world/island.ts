/* ================= The island =================
   An island in the open sea (its old forest was cleared for building); a ring of meadow and woodland runs round it, where the
   village grows; then the beach, and on one side a great tidal bay where the sea goes out for miles at low tide. */
const angDiff = (a, b) => { let d = (a - b) % 6.2832; if (d > 3.1416) d -= 6.2832; if (d < -3.1416) d += 6.2832; return d; };
function carveIsland(R, ns, ns2) {
  const bay = R() * 6.2832, campA = bay + (R() < 0.5 ? 1 : -1) * (2.1 + R() * 0.7);
  // the island sits off-centre, leaving room on the bay side for the flats to run out to sea
  const ix = W / 2 - Math.cos(bay) * W * 0.07, iy = H / 2 - Math.sin(bay) * H * 0.07, rx = W * 0.27, ry = H * 0.27;
  // the forest's heart lies back from the camp, so the meadows are widest where the settlers came ashore
  const fcx = ix - Math.cos(campA) * rx * 0.28, fcy = iy - Math.sin(campA) * ry * 0.28;
  const ring = (a, s, f) => vnoise(Math.cos(a) * f + 5, Math.sin(a) * f + 5, s);
  const shape = a => 1 + 0.32 * (ring(a, ns + 1, 1.3) - 0.5) + 0.14 * (ring(a, ns + 2, 3.2) - 0.5);
  const forestR = a => 0.54 + 0.16 * (ring(a, ns + 3, 1.6) - 0.5);
  const flatW0 = a => Math.max(0, 0.03 + 0.06 * ring(a, ns + 4, 2.4) + 0.44 * Math.exp(-((angDiff(a, bay) / 0.85) ** 2)) - 0.1 * Math.exp(-((angDiff(a, campA) / 0.6) ** 2)));
  const at = (a, d) => ({ x: Math.round(ix + Math.cos(a) * d * rx * shape(a)), y: Math.round(iy + Math.sin(a) * d * ry * shape(a)) });
  // the flats never run off the edge of the world: trim them to fit, leaving open sea beyond
  const fwTab = new Float32Array(720); for (let i = 0; i < 720; i++) { const a = i / 720 * 6.2832; let fw = flatW0(a); while (fw > 0) { const p = at(a, 1 + fw + 0.04); if (p.x >= 22 && p.y >= 22 && p.x < W - 22 && p.y < H - 22) break; fw -= 0.01; } fwTab[i] = Math.max(0, fw); }
  const flatW = a => fwTab[((Math.round(a / 6.2832 * 720) % 720) + 720) % 720];
  const camp = at(campA, 0.6);
  const hgt = new Float32Array(W * H).fill(-1), fmask = new Uint8Array(W * H), cmask = new Uint8Array(W * H), islet = new Uint8Array(W * H);
  town.hgt = hgt; town.fmask = fmask; town.cmask = cmask; town.islet = islet;
  const chans = []; for (let k = 0; k < 4; k++) chans.push({ a: bay + (R() - 0.5) * 1.3, dep: 14 + R() * 10, wig: R() * 6 });
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x, dx = (x - ix) / rx, dy = (y - iy) / ry, a = Math.atan2(dy, dx), d = Math.hypot(dx, dy) / shape(a) + (vnoise(x * 0.11, y * 0.11, ns + 5) - 0.5) * 0.05;
    const fdx = (x - fcx) / rx, fdy = (y - fcy) / ry, fa = Math.atan2(fdy, fdx), fd = Math.hypot(fdx, fdy) / shape(fa) + (vnoise(x * 0.09, y * 0.09, ns + 6) - 0.5) * 0.06;
    // (the old forest that once filled the island's heart has been cleared: it is ordinary, buildable countryside now; fmask stays empty)
    if (d < 0.94) {
      const f = vnoise(x * 0.045, y * 0.045, ns) * 0.75 + vnoise(x * 0.15, y * 0.15, ns + 7) * 0.25, pf = f < 0.4 ? 0.03 : f < 0.55 ? 0.3 : 0.7;
      const cd = ((x - camp.x) / 22) ** 2 + ((y - camp.y) / 15) ** 2, shore = 0.94 - d;
      let p = cd < 1 ? (cd > 0.85 && R() < 0.05 ? 1 : 0) : cd < 1.35 ? Math.min(pf, 0.4) : pf;
      if (shore < 0.04) p *= 0.3;                                  // wind-bent scrub near the shore
      grid[y][x] = R() < p ? T.TREE : T.GRASS; continue;
    }
    cmask[k] = 1;
    if (d < 1) { grid[y][x] = T.SAND; continue; }                   // dry beach above the highest tide
    const fw = flatW(a), r = (d - 1) / Math.max(0.0001, fw);
    if (r >= 1) { grid[y][x] = T.WATER; continue; }
    let h = 95 - 88 * Math.pow(r, 0.85) + (vnoise(x * 0.08, y * 0.08, ns + 44) - 0.5) * 16;
    for (const c of chans) { const off = Math.abs(angDiff(a, c.a + Math.sin(d * 9 + c.wig) * 0.05)) * d * (rx + ry) / 2; h -= c.dep * Math.exp(-((off / 2.4) ** 2)) * Math.min(1, r * 4); }
    hgt[k] = Math.max(0, h); grid[y][x] = T.SAND;
  }
  // rocky hills out in the meadows: the island's stone, and where boulders keep tumbling down
  for (let k = 0, made = 0; k < 40 && made < 3; k++) {
    const a = R() * 6.2832, p = at(a, 0.6 + R() * 0.28); if (Math.hypot(p.x - camp.x, p.y - camp.y) < 16) continue;
    let bad = false; for (let j = -6; j <= 6 && !bad; j++) for (let i = -8; i <= 8; i++) { const xx = p.x + i, yy = p.y + j; if (xx < 2 || yy < 2 || xx >= W - 2 || yy >= H - 2 || fmask[yy * W + xx] || cmask[yy * W + xx]) { bad = true; break; } } if (bad) continue;
    made++; const sx = 4.5 + R() * 2.5, sy = 3 + R() * 1.5;
    for (let y = p.y - 7; y <= p.y + 7; y++) for (let x = p.x - 10; x <= p.x + 10; x++) { const e = ((x - p.x) / sx) ** 2 + ((y - p.y) / sy) ** 2 + (vnoise(x * 0.4, y * 0.4, ns2 + 60 + k) - 0.5) * 0.8; if (e < 0.55) grid[y][x] = T.MOUNTAIN; else if (e < 1.6 && R() < 0.45) grid[y][x] = T.ROCK; else if (e < 1.6 && grid[y][x] === T.TREE) grid[y][x] = T.GRASS; }
  }
  // sea-worn boulders scattered along the beaches
  for (let k = 0; k < W * H; k++) { const y = (k / W) | 0, x = k % W; if (cmask[k] && hgt[k] < 0 && grid[y][x] === T.SAND && R() < 0.025) grid[y][x] = T.ROCK; }
  // fresh water: a spring at the forest's edge running down to the sea, a couple of ponds, a home pond near the camp
  const disc = (px, py, r) => { for (let y = Math.floor(py - r - 1); y <= Math.ceil(py + r + 1); y++) for (let x = Math.floor(px - r - 1); x <= Math.ceil(px + r + 1); x++) { if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue; const k = y * W + x; if ((x - px) ** 2 + (y - py) ** 2 <= r * r && Math.hypot(x - camp.x, y - camp.y) > 9 && !fmask[k]) { grid[y][x] = T.WATER; hgt[k] = -1; } } };
  const blob = (px, py, rxx, ryy, seed) => { for (let y = Math.floor(py - ryy * 1.5); y <= Math.ceil(py + ryy * 1.5); y++) for (let x = Math.floor(px - rxx * 1.5); x <= Math.ceil(px + rxx * 1.5); x++) { if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2 || fmask[y * W + x] || cmask[y * W + x]) continue; const a = (x - px) / rxx, b2 = (y - py) / ryy, wob = 1 + 0.38 * (vnoise(x * 0.35, y * 0.35, seed) - 0.5); if (a * a + b2 * b2 <= wob * wob) grid[y][x] = T.WATER; } };
  { const ra = campA + (R() < 0.5 ? 1 : -1) * (0.45 + R() * 0.3); let d0 = 0.5; while (d0 < 0.9 && fmask[at(ra, d0).y * W + at(ra, d0).x]) d0 += 0.02; d0 += 0.04; const src = at(ra, d0); blob(src.x, src.y, 3 + R() * 1.5, 2.4 + R(), ns2 + 3);
    for (let i = 0, n = 90; i <= n; i++) { const t = i / n, a = ra + Math.sin(t * 7 + ns) * 0.06, p = at(a, d0 + (1.06 - d0) * t); disc(p.x, p.y, 1.0 + 1.3 * t); } }
  for (let k = 0; k < 1 + Math.floor(R() * 2); k++) { const a = R() * 6.2832, p = at(a, 0.6 + R() * 0.2); blob(p.x, p.y, 2.5 + R() * 2.5, 2 + R() * 2, ns2 + 20 + k); }
  { const a = campA + (R() < 0.5 ? 0.35 : -0.35), p = at(a, 0.78); blob(p.x, p.y, 3.2 + R(), 2.3 + R(), ns2 + 50); }
  for (let y = camp.y - 7; y <= camp.y + 8; y++) for (let x = camp.x - 8; x <= camp.x + 8; x++) if (grid[y] && grid[y][x] === T.WATER && !cmask[y * W + x]) grid[y][x] = T.GRASS;
  // soft sandy banks round the fresh water
  { const wet = new Uint8Array(W * H); for (let k = 0; k < W * H; k++) if (grid[(k / W) | 0][k % W] === T.WATER && !cmask[k]) wet[k] = 1;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const k = y * W + x; if (fmask[k] || cmask[k] || (grid[y][x] !== T.GRASS && grid[y][x] !== T.TREE)) continue; let w = false; for (let j = -1; j <= 1 && !w; j++) for (let i = -1; i <= 1; i++) if (wet[(y + j) * W + x + i]) { w = true; break; } if (w) grid[y][x] = T.SAND; } }
  // tier 1: three islets out on the tidal flats, walkable at low tide
  const isl = [];
  const islet0 = (cxk, cyk, rad, rocky, bare?) => { for (let y = Math.floor(cyk - rad - 2); y <= cyk + rad + 2; y++) for (let x = Math.floor(cxk - rad * 1.4 - 2); x <= cxk + rad * 1.4 + 2; x++) { if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3) continue; const k = y * W + x; if (!cmask[k] || (hgt[k] < 0 && grid[y][x] === T.SAND && !islet[k])) continue;
      const e = ((x - cxk) / (rad * 1.35)) ** 2 + ((y - cyk) / rad) ** 2 + (vnoise(x * 0.3, y * 0.3, ns2 + 45 + cxk) - 0.5) * 0.5; if (e > 1) continue;
      islet[k] = 1; cmask[k] = 1; hgt[k] = -1; grid[y][x] = e > 0.62 ? T.SAND : (R() < (rocky ? 0.22 : 0.08) ? T.ROCK : !bare && R() < 0.12 ? T.TREE : T.GRASS); } const o = { x: cxk, y: cyk, r: rad }; isl.push(o); return o; };
  const tier1 = [];
  for (const [fa, fr] of [[-0.38, 0.5], [0.02, 0.62], [0.4, 0.5]]) { for (let t = 0; t < 6; t++) { const a = bay + fa + (R() - 0.5) * 0.2, fw = flatW(a); if (fw < 0.12) continue; const p = at(a, 1 + fw * (fr + (R() - 0.5) * 0.15)); if (tier1.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 14)) continue; tier1.push(islet0(p.x, p.y, 2.6 + R() * 1.6, R() < 0.5)); break; } }
  // seabed that never uncovers is plain sea; the rest is tidal sand
  for (let k = 0; k < W * H; k++) { if (hgt[k] < 0) continue; const y = (k / W) | 0, x = k % W; if (hgt[k] < 7) { hgt[k] = -1; grid[y][x] = T.WATER; } else { hgt[k] = Math.min(95, hgt[k]); grid[y][x] = T.SAND; } }
  // how far out to sea is each tile? (open water from anything you can stand on, even at high tide)
  const seaD = new Uint8Array(W * H).fill(255); { const q = []; for (let k = 0; k < W * H; k++) if (grid[(k / W) | 0][k % W] !== T.WATER) { seaD[k] = 0; q.push(k); } for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = (k / W) | 0, v = seaD[k]; if (v >= 60) continue; for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const nk = ny * W + nx; if (seaD[nk] > v + 1) { seaD[nk] = v + 1; q.push(nk); } } } }
  const seaSpot = (lo, hi, away, sp) => { for (let t = 0; t < 8000; t++) { const x = 9 + Math.floor(R() * (W - 18)), y = 9 + Math.floor(R() * (H - 18)), d = seaD[y * W + x]; if (d < lo || d > hi) continue; if (away.some(q => Math.hypot(q.x - x, q.y - y) < sp)) continue; return { x, y }; } return null; };
  // tier 2: two islands a short swim out (you need flippers); tier 3: two far out to sea (you need a raft)
  const tier2 = [], tier3 = [];
  for (let i = 0; i < 2; i++) { const p = seaSpot(10, 12, [...tier2, ...tier1], 30) || seaSpot(9, 13, [...tier2, ...tier1], 18); if (p) tier2.push(islet0(p.x, p.y, 2.4 + R() * 0.8, R() < 0.5)); }
  for (let i = 0; i < 2; i++) { let q = null; for (let t = 0; t < 40 && !q; t++) { const c = seaSpot(22, 36, tier3, 30); if (c && tier2.every(s => Math.hypot(s.x - c.x, s.y - c.y) >= 26)) q = c; } if (!q) for (let t = 0; t < 40 && !q; t++) { const c = seaSpot(19, 40, tier3, 20); if (c && tier2.every(s => Math.hypot(s.x - c.x, s.y - c.y) >= 22)) q = c; } if (q) tier3.push(islet0(q.x, q.y, i === 0 ? 2.6 : 3 + R() * 0.6, true, i === 0)); }
  const lh = tier3[0] ? { x: tier3[0].x, y: tier3[0].y } : { x: Math.round(ix), y: Math.round(iy) }, lhIs = tier3[0] || null;
  const gapSet = new Set();
  // the map's rim is always open sea
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) { const k = y * W + x; grid[y][x] = T.WATER; hgt[k] = -1; fmask[k] = 0; }
  // distances in and out of the forest and the shore, for lighting and for knowing where you are
  const bfs = (inside) => { const out = new Uint8Array(W * H).fill(255), q = []; for (let k = 0; k < W * H; k++) if (inside(k)) { out[k] = 0; q.push(k); } for (let i = 0; i < q.length; i++) { const k = q[i], x = k % W, y = (k / W) | 0, v = out[k]; if (v >= 40) continue; for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const nk = ny * W + nx; if (out[nk] > v + 1) { out[nk] = v + 1; q.push(nk); } } } return out; };
  town.fout = bfs(k => fmask[k]); town.fin = bfs(k => !fmask[k]); town.cout = bfs(k => cmask[k]);
  // where the forest begins, nearest the camp
  let ent = null, eb = 1e9; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const k = y * W + x; if (!fmask[k] || town.fin[k] !== 1) continue; const dd = Math.hypot(x - camp.x, y - camp.y); if (dd < eb) { eb = dd; ent = { x, y }; } }
  let fmax = 1; for (let k = 0; k < W * H; k++) if (fmask[k] && town.fin[k] < 255) fmax = Math.max(fmax, town.fin[k]); town.fmax = fmax;
  // the beach nearest the tidal bay: where you walk out onto the flats
  let landing = null, lb = 1e9; const bayP = at(bay, 1); for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const k = y * W + x; if (!cmask[k] || hgt[k] >= 0 || islet[k] || grid[y][x] !== T.SAND) continue; const dd = Math.hypot(x - bayP.x, y - bayP.y); if (dd < lb) { lb = dd; landing = { x, y }; } }
  town.region = null;   // no named wild region any more (the old forest was cleared)
  return { cx: camp.x, cy: camp.y, ix, iy, rx, ry, bay, campA, at, isl, tier1, tier2, tier3, lhIs, lh, gapSet, landing: landing || { x: camp.x, y: camp.y }, ent: ent || { x: Math.round(ix), y: Math.round(iy) } };
}
// the path in from the forest's edge; the bay is just scenery now
function islandFeatures(R, I, ns2) {
  town.coast = { name: 'The Tidal Flats' };
  wayIn(I.cx, I.cy, I.ent.x, I.ent.y);
}

function wayIn(sx, sy, tx, ty) {
  const C = t => t === T.MOUNTAIN ? 80 : t === T.WATER ? 120 : (t === T.TREE || t === T.ROCK) ? 3 : 1;
  const dist = new Int32Array(W * H).fill(1e9), prev = new Int32Array(W * H).fill(-1), B = [];
  const s = sy * W + sx; dist[s] = 0; (B[0] = B[0] || []).push(s);
  for (let c = 0; c < B.length; c++) { const q = B[c]; if (!q) continue;
    for (let i = 0; i < q.length; i++) { const k = q[i]; if (dist[k] !== c) continue; const x = k % W, y = (k / W) | 0; if (x === tx && y === ty) { c = B.length; break; }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue; const nk = ny * W + nx, nc = c + C(grid[ny][nx]); if (nc < dist[nk]) { dist[nk] = nc; prev[nk] = k; (B[nc] = B[nc] || []).push(nk); } } } }
  let k = ty * W + tx, fixed = 0; if (prev[k] < 0) return 0;
  while (k >= 0 && k !== s) { const x = k % W, y = (k / W) | 0; if (grid[y][x] === T.MOUNTAIN) { grid[y][x] = T.ROCK; fixed++; } else if (grid[y][x] === T.WATER) { grid[y][x] = T.SAND; fixed++; } k = prev[k]; }
  return fixed;
}
function inCoast(x, y) { return !!(town && town.cmask && x >= 0 && y >= 0 && x < W && y < H && town.cmask[y * W + x]); }
// is this tile in the old forest at the island's heart?
function inForest(x, y) { return !!(town && town.fmask && x >= 0 && y >= 0 && x < W && y < H && town.fmask[y * W + x]); }
function townName(R) {
  const name = pick(R, TOWN_PRE) + pick(R, TOWN_SUF);
  town.name = name.charAt(0).toUpperCase() + name.slice(1);
  const f = [`A few families followed the old road inland and stopped where the ground was dry. They named it ${town.name} and started on the first houses.`,
    `${town.name} began with an axe, a net and three households. Everything else, they decided, they would build themselves.`,
    `There was a great forest here once. The founders of ${town.name} cleared it, and the island has been all fields and building ground since.`];
  town.founding = pick(R, f);
  town.arch = { id: 'founding', name: 'Founding settlement' };
}

function houseDims(beds) { return { w: Math.max(7, Math.min(10, beds + 4)), h: 6 }; }
function startPeople(R) {
  const used = town.used, cast = [];
  const add = (n) => { cast.push(n); return n; };
  const mk = (role, age, o) => add(newPerson(R, role, age, used, o));
  const fams = [];
  const sn = () => { let s; do { s = pick(R, SURNAMES); } while (fams.some(f => f.sn === s)); return s; };
  // family one: woodcutter and gatherer, two older children
  { const s = sn(), f = mk('Worker', ri(R, 36, 44), { female: false, surname: s }), m = mk('Worker', ri(R, 33, 41), { female: true, surname: s });
    setSpouse(f, m); const k1 = mk('Child', ri(R, 14, 15), { female: false, surname: s, mother: m, father: f }), k2 = mk('Child', ri(R, 7, 11), { mother: m, father: f, surname: s });
    [k1, k2].forEach(k => linkKin(m, f, k)); fams.push({ sn: s, members: [f, m, k1, k2] }); }
  // family two: fisher and trader, a teenage daughter, a small child, and a grandmother
  { const s = sn(), f = mk('Worker', ri(R, 38, 46), { female: false, surname: s }), m = mk('Worker', ri(R, 35, 43), { female: true, surname: s });
    setSpouse(f, m); const k1 = mk('Child', ri(R, 15, 16), { female: true, surname: s, mother: m, father: f }), k2 = mk('Child', ri(R, 4, 8), { mother: m, father: f, surname: s });
    [k1, k2].forEach(k => linkKin(m, f, k)); const g = mk('Elder', ri(R, 62, 69), { female: true, surname: pick(R, SURNAMES) });
    linkKin(g, null, m); fams.push({ sn: s, members: [f, m, k1, k2, g] }); }
  // family three: a young couple
  { const s = sn(), f = mk('Worker', ri(R, 23, 29), { female: false, surname: s }), m = mk('Worker', ri(R, 22, 28), { female: true, surname: s });
    setSpouse(f, m); const mem = [f, m]; if (chance(R, .6)) { const k = mk('Child', ri(R, 3, 5), { mother: m, father: f, surname: s }); linkKin(m, f, k); mem.push(k); }
    fams.push({ sn: s, members: mem }); }
  // siblings share quirks of knowing each other
  cast.forEach(a => cast.forEach(b => { if (a !== b && !a.rel[b.id]) { a.know[b.id] = 55; a.aff[b.id] = 18 + Math.floor(R() * 20); } }));
  fams.forEach(f => { const k = f.members.filter(x => x.fam.mother && x.fam.father); k.forEach(a => k.forEach(b => { if (a !== b && a.fam.mother === b.fam.mother) fam2(a, b, 'sibling'); })); });
  town.founders = cast.length;
  npcs = cast; makeTownIndex(); cast.forEach(n => { n.rand = rng(town.seed + n.id * 977); n.jit = 0; });
  // everyone starts in the camp
  cast.forEach((n, k) => { const p = plazaTiles.filter(t => !(t.y === town.cy && Math.abs(t.x - town.cx) <= 1))[k % 20] || { x: town.cx, y: town.cy + 2 }; n.x = n.tx = p.x; n.y = n.ty = p.y; n.homeRoom = null; n.bed = { owner: null }; });
  cast.forEach(n => { routine(rng(town.seed ^ (n.id * 31)), n); });
  town.tents = []; cast.forEach(n => { if (!n.infant && n.age >= 3) addTent(); });
}

