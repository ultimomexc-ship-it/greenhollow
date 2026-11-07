/* ================= Greenhollow generator: constants, world, people ================= */
let W = 128, H = 84;
const TS = 24;
const SIZES = { S: [148, 136], M: [196, 180], L: [244, 224] };
const NORTH = {}, SOUTH = {};   // (the world used to be stacked in bands; now it is one island)
let sizeKey = 'L';
function setSize(k) { const z = SIZES[k] || SIZES.M; sizeKey = SIZES[k] ? k : 'M'; W = z[0]; H = z[1] + (NORTH[sizeKey] || 0) + (SOUTH[sizeKey] || 0); reach = new Uint8Array(W * H); }
const T = { GRASS: 0, PATH: 1, FLOOR: 2, WALL: 3, DOOR: 4, TREE: 5, WATER: 6, CROP: 7, TABLE: 8, BED: 9, SEAT: 10,
  COUNTER: 11, FORGE: 12, ANVIL: 13, LOOM: 14, WELL: 15, ALTAR: 16, PEW: 17, LAMP: 18, SHELF: 19, RUG: 20, OVEN: 21, STALL: 22, GRAVE: 23, PLOT: 24, SAND: 25, ROCK: 26, PILE: 27, TENT: 28, BARREL: 29, MOUNTAIN: 30 };
const BLOCKED = new Set([T.WALL, T.TREE, T.WATER, T.TABLE, T.COUNTER, T.FORGE, T.ANVIL, T.LOOM, T.WELL, T.ALTAR, T.LAMP, T.SHELF, T.OVEN, T.STALL, T.GRAVE, T.ROCK, T.PILE, T.BARREL, T.MOUNTAIN]);
const COST = { [T.GRASS]: 1.5, [T.CROP]: 1.8, [T.PLOT]: 1.3, [T.SAND]: 1.25 };
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const TILE_MIN = 0.9;
const YEAR = 3 * 1440;

let grid = [], roomAt = [], rooms = [], doors = [], lamps = [], reach = new Uint8Array(W * H);
let town = null, npcs = [], NEXT_ID = 1;
let plazaTiles = [], shoreTiles = [];
const game = { time: 5 * 60 + 30, failures: 0, events: [] };

/* ---------- random helpers ---------- */
function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const ri = (R, a, b) => a + Math.floor(R() * (b - a + 1));
const pick = (R, a) => a[Math.floor(R() * a.length)];
const chance = (R, p) => R() < p;
function wpick(R, o) {
  const e = Object.entries(o); let r = R() * e.reduce((s, x) => s + x[1], 0);
  for (const [k, w] of e) { r -= w; if (r < 0) return k; }
  return e[e.length - 1][0];
}
function shuffle(R, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/* ---------- names and looks ---------- */
const FIRST_F = ['Hilda', 'Brenna', 'Wynne', 'Mira', 'Isla', 'Edda', 'Maren', 'Thea', 'Lyra', 'Odette', 'Rosalind', 'Sunniva', 'Tilda', 'Agnes', 'Berta', 'Cora', 'Dagny', 'Elsbeth', 'Freya', 'Greta', 'Helga', 'Ingrid', 'Joan', 'Linnea', 'Maud', 'Nell', 'Orla', 'Petra', 'Sigrid', 'Una'];
const FIRST_M = ['Edmund', 'Aldric', 'Tobias', 'Gareth', 'Rowan', 'Cormac', 'Osric', 'Piers', 'Bram', 'Corwin', 'Dunstan', 'Ewan', 'Finn', 'Godric', 'Hamon', 'Ivo', 'Jorund', 'Kell', 'Leofric', 'Merrick', 'Nolan', 'Oswin', 'Percival', 'Roderic', 'Silas', 'Torin', 'Ulric', 'Wulf', 'Alaric', 'Bertram'];
const SURNAMES = ['Thorne', 'Marsh', 'Hale', 'Reed', 'Ashby', 'Brook', 'Cobb', 'Dunmore', 'Fenwick', 'Greaves', 'Holloway', 'Ironside', 'Kettle', 'Lark', 'Miller', 'Nettle', 'Oakes', 'Pike', 'Quince', 'Rook', 'Sparrow', 'Tanner', 'Underhill', 'Vane', 'Wick', 'Yarrow', 'Crane', 'Dray', 'Elder', 'Fisk'];
const TOWN_PRE = ['Oak', 'Wolf', 'Ash', 'Brook', 'Stone', 'Mill', 'Raven', 'Elm', 'Fern', 'Thorn', 'Cold', 'Green', 'Red', 'Mist', 'Hart', 'Bright', 'Crow', 'Salt', 'Moss', 'Iron', 'Swan', 'Ember', 'Lark', 'Gray'];
const TOWN_SUF = ['ford', 'hollow', 'wick', 'bury', 'haven', 'stead', 'mere', 'dale', 'moor', 'fell', 'by', 'ton', 'wood', 'cross', 'rest', 'gate'];
const SHIRTS = ['#9a4a30', '#6a8fb8', '#7b8f3a', '#b0643e', '#a8493f', '#3f8a6a', '#8a5aa5', '#b03a3a', '#4f9a8a', '#c0953a', '#7a5a8a', '#4a6fa5', '#8a8a4a', '#a0603a'];
const HAIRS = ['#3b2a20', '#7a4a2a', '#6a4a2a', '#2e2118', '#c08a3a', '#8a3a22', '#2a2a2a', '#9a6a3a', '#5a3a22', '#d2b06a'];
const SKINS = ['#e9b98f', '#d9a074', '#b97a50', '#8a5a3a', '#f1c9a5'];
const TRAITS = ['cheerful', 'grumpy', 'devout', 'gossipy', 'curious', 'lazy', 'greedy', 'brave', 'shy', 'generous', 'jovial', 'anxious', 'proud', 'dreamy', 'early bird', 'night owl', 'homebody', 'sociable'];
const TRAIT_CLASH = [['cheerful', 'grumpy'], ['shy', 'sociable'], ['lazy', 'early bird'], ['early bird', 'night owl'], ['jovial', 'grumpy'], ['shy', 'gossipy'], ['homebody', 'sociable'], ['anxious', 'brave'], ['generous', 'greedy']];
const KID_TRAITS = ['cheerful', 'curious', 'shy', 'brave', 'dreamy', 'sociable', 'anxious'];
const QUIRKS = ['hums while working and does not notice', 'is afraid of geese', 'is saving rope to build a boat and leave one day', 'writes poems nobody has read',
  'secretly feeds the stray cats', 'claims to have once seen a dragon', 'collects odd stones', 'talks to the weather', 'never forgets a face or a debt',
  'cannot cook but keeps trying', 'keeps a diary of everyone\'s habits', 'swears they can predict rain by their knee', 'has a lucky pebble they never let go of',
  'sings terribly and loudly', 'is certain the well is haunted', 'dreams of owning a boat'];
const TAV_ADJ = ['Rusty', 'Gilded', 'Sleepy', 'Crooked', 'Laughing', 'Drowned', 'Merry', 'Silver', 'Hungry', 'Wandering'];
const TAV_NOUN = ['Flagon', 'Goose', 'Lantern', 'Anchor', 'Stag', 'Barrel', 'Heron', 'Plough', 'Crown', 'Kettle'];
const CHAPEL = ['Dawn', 'Lantern', 'Hollow', 'Quiet Hours', 'Seven Bells', 'Willow', 'Last Light'];

function buildRoom(spec, x, y, w, h, side, roadY) {
  const kind = spec.kind, idx = rooms.length;
  rectT(x, y, w, h, T.WALL); rectT(x + 1, y + 1, w - 2, h - 2, T.FLOOR);
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) roomAt[j][i] = idx;
  const doorU = w >> 1, dx = x + doorU, dy = side === 'b' ? y + h - 1 : y;
  setT(dx, dy, T.DOOR); doors.push({ x: dx, y: dy, room: idx, o: 0 });
  if (roadY != null) { if (side === 'b') for (let yy = dy + 1; yy <= roadY; yy++) setT(dx, yy, T.PATH);
  else for (let yy = dy - 1; yy >= roadY + 1; yy--) setT(dx, yy, T.PATH); }
  const room = { id: spec.id, name: spec.name, kind, x, y, w, h, side, doorX: dx, doorY: dy, lit: 0, beds: [], seats: [], pews: [], spots: {},
    floor: (kind === 'church' || kind === 'smithy' || kind === 'barracks') ? 'stone' : 'wood' };
  rooms.push(room);
  const sgn = side === 'b' ? 1 : -1;
  const L = (u, v) => ({ x: x + u, y: side === 'b' ? y + v : y + h - 1 - v });
  const put = (u, v, t) => { const p = L(u, v); setT(p.x, p.y, t); return p; };
  const fv = (du, dv) => ({ dx: du, dy: dv * sgn });
  const bed = (u, v) => { const p = put(u, v, T.BED); room.beds.push({ x: p.x, y: p.y, bed: true }); };
  const seat = (u, v, du, dv) => { const p = put(u, v, T.SEAT); room.seats.push({ x: p.x, y: p.y, sit: true, face: fv(du, dv) }); };
  const spot = (name, u, v, du, dv) => { const p = L(u, v); room.spots[name] = { x: p.x, y: p.y, face: fv(du, dv) }; };

  if (kind === 'house' || kind === 'barracks') {
    // beds side by side along the back wall; one long family table in the middle, a seat for everyone
    const n = Math.max(1, spec.beds), iw = w - 2, per = Math.min(n, iw);
    const b0 = 1 + Math.floor((iw - per) / 2);
    for (let i = 0; i < n; i++) bed(b0 + (i % per), 1 + Math.floor(i / per));
    const tv = h - 3; let L = 1, tA, tB, spots;
    for (;;) {
      tA = 1 + Math.floor((iw - L) / 2); tB = tA + L - 1; spots = [[tA - 1, tv, 1, 0], [tB + 1, tv, -1, 0]];
      for (let u = tA; u <= tB; u++) { spots.push([u, tv - 1, 0, 1]); if (u !== doorU) spots.push([u, tv + 1, 0, -1]); }
      if (spots.length >= n || L >= iw - 2) break; L++;
    }
    for (let u = tA; u <= tB; u++) put(u, tv, T.TABLE);
    spots.slice(0, Math.max(n, 2)).forEach(([u, v, du, dv]) => seat(u, v, du, dv));
    // the family pantry: a barrel in the corner by the door
    if (kind === 'house') { const pb = put(w - 2, h - 2, T.BARREL); room.barrel = { x: pb.x, y: pb.y }; spot('pantry', w - 2, h - 3, 0, 1); }
  } else if (kind === 'tavern') {
    for (let u = doorU - 1; u <= doorU + 1; u++) put(u, 2, T.COUNTER);
    spot('bar', doorU, 1, 0, 1); spot('barFront', doorU, 3, 0, -1);
    bed(1, 1); bed(w - 2, 1);
    const tv = h - 4, tabs = [2, w - 3]; if (w >= 12 && h >= 9) tabs.push(doorU);
    tabs.forEach(u => { put(u, tv, T.TABLE); seat(u - 1, tv, 1, 0); seat(u + 1, tv, -1, 0); seat(u, tv - 1, 0, 1); });
    for (let u = 1; u <= 3; u++) for (let v = h - 3; v <= h - 2; v++) put(u, v, T.RUG);
    spot('stage', 2, h - 2, 1, 0);
  } else if (kind === 'church') {
    for (let u = doorU - 1; u <= doorU + 1; u++) put(u, 1, T.ALTAR);
    spot('altar', doorU, 2, 0, -1);
    bed(w - 2, 1);
    const rowsV = []; for (let v = 3; v <= h - 3; v += 2) rowsV.push(v); if (!rowsV.length) rowsV.push(3);
    rowsV.forEach(v => { for (let u = 1; u <= w - 2; u++) { if (Math.abs(u - doorU) <= 1) continue; const p = put(u, v, T.PEW); room.pews.push({ x: p.x, y: p.y, sit: true, pew: true, face: fv(0, -1) }); } });
  } else if (kind === 'smithy') {
    for (let v = 2; v <= 4; v++) { const p = put(w - 2, v, T.FORGE); town.forges.push({ x: p.x, y: p.y }); }
    put(w - 4, 3, T.ANVIL); spot('work', w - 3, 3, -1, 0); spot('front', w - 3, 4, 0, -1);
  } else if (kind === 'shop') {
    [1, 2, 3, w - 4, w - 3, w - 2].forEach(u => put(u, 1, T.SHELF));
    for (let u = 2; u <= 4; u++) put(u, h - 4, T.COUNTER);
    spot('counter', 3, h - 5, 0, 1); spot('front', 3, h - 3, 0, -1);
    put(w - 2, h - 4, T.LOOM); spot('loom', w - 3, h - 4, 1, 0); spot('loomFront', w - 3, h - 3, 0, -1);
  } else if (kind === 'privy') {
    seat(1, 1, 0, 1); room.toilet = { x: room.seats[0].x, y: room.seats[0].y, face: room.seats[0].face };
  } else if (kind === 'bakery') {
    for (let u = 2; u <= 4; u++) { const p = put(u, 1, T.OVEN); town.ovens.push({ x: p.x, y: p.y }); put(u, 3, T.COUNTER); }
    spot('oven', 3, 2, 0, -1); spot('front', 3, 4, 0, -1);
  } else lf2Furnish(kind, room, put, spot, seat, bed, w, h, doorU);
  return room;
}


/* ================= roles and people ================= */
const ROLES = {
  Worker: { work: 'any', hat: ['beanie', 'floppy', 'straw', 'scarf', 'cap', 'bonnet'], cols: ['#b03a3a', '#3a6a8a', '#6a8a3a', '#c9b27a', '#d8bd62', '#7ab35a'] },
  Priest: { work: 'church', hat: ['colander'], cols: ['#e9e2d0'] },
  Barkeep: { work: 'bar', hat: ['cap'], cols: ['#8a5a30', '#6a4a2a'] },
  Woodcutter: { work: 'forest', hat: ['beanie'], cols: ['#b03a3a', '#3a6a8a', '#6a8a3a'] },
  Fisher: { work: 'fish', hat: ['floppy'], cols: ['#c9b27a', '#5a7a9a'] },
  Gatherer: { work: 'gather', hat: ['scarf', 'bonnet'], cols: ['#7ab35a', '#9a7ad0', '#c9a27a'] },
  Farmer: { work: 'field', hat: ['straw'], cols: ['#d8bd62', '#cdaf55'] },
  Trader: { work: 'stall', hat: ['scarf', 'cap'], cols: ['#c0392b', '#2a7a9a', '#d49a2a'] },
  Elder: { work: null, hat: ['bonnet', 'cap'], cols: ['#b9b2a2', '#9a9486'] },
  Child: { work: null, hat: ['none'], cols: ['#e9e2d0'] }
};
const GREY = '#e4e2dc';
function styleFor(R, n) {
  const rd = ROLES[n.role];
  if (n.age < 16) { n.hat = 'none'; n.hatCol = '#ccc'; }
  else { n.hat = pick(R, rd.hat); n.hatCol = pick(R, rd.cols); }
  n.workKey = rd.work; n.robe = n.role === 'Priest' && n.age >= 16; n.apron = n.role === 'Barkeep' || n.role === 'Trader';
  if (n.robe) n.shirt = '#e4e0d4';
  updateLook(n);
}
const PANTS = ['#3d352f', '#4a3a2a', '#2f3a4a', '#5a4a3a', '#3a4a3a', '#6a5a4a', '#2a2a30', '#5a3a3a'];
const HS_M = ['short', 'crop', 'shaggy', 'bald', 'curly', 'long', 'short', 'crop'], HS_F = ['long', 'bun', 'braids', 'ponytail', 'curly', 'short', 'long', 'bob'];
const PATTERNS = ['plain', 'plain', 'stripe', 'vest', 'belt', 'sash', 'collar'];
/* every villager gets their own combination of hair, clothes and build, never the same as anyone else alive */
function assignLook(n) {
  const R = rng(town.seed + n.id * 7717 + 13), used = town.lookSigs || (town.lookSigs = new Set());
  let L, sig, tries = 0;
  do {
    L = { hs: pick(R, n.female ? HS_F : HS_M), beard: !n.female && R() < 0.5 ? pick(R, ['full', 'mustache', 'goatee', 'stubble']) : null, pants: pick(R, PANTS), pat: pick(R, PATTERNS), acc: pick(R, SHIRTS), w: 0.9 + R() * 0.22, h: 0.93 + R() * 0.12, hatOn: R() < 0.35 };
    if (tries > 6) n.shirt = pick(R, SHIRTS);
    sig = [n.skin, n.hair0, L.hs, L.beard, n.shirt, L.pat, L.pat === 'plain' ? '' : L.acc, L.pants].join('|'); tries++;
  } while (used.has(sig) && tries < 60);
  used.add(sig); L.sig = sig; n.look = L; return L;
}
function updateLook(n) {
  const a = n.age;
  n.scale = a < 3 ? 0.5 : a < 16 ? 0.64 : 1;
  n.hair = a >= 60 ? GREY : (a >= 48 && n.hair0 ? n.hair0 : n.hair0 || n.hair);
  if (n.age >= 16) n.adult = true;
  n.infant = a < 3;
}
function newPerson(R, role, age, used, o) {
  o = o || {};
  const female = o.female !== undefined ? o.female : chance(R, 0.5);
  let first, tries = 0; do { first = pick(R, female ? FIRST_F : FIRST_M); tries++; } while (used.has(first) && tries < 70);
  if (used.has(first)) first = first + ' ' + pick(R, ['the Younger', 'the Second', 'the Lesser']);
  used.add(first);
  const par = [o.mother, o.father].filter(Boolean), pa = par.length ? pick(R, par) : null;
  const n = {
    id: NEXT_ID++, first, female, role, surname: o.surname || '', age, born: game.time - age * YEAR - Math.floor(R() * YEAR), adult: age >= 16, infant: age < 3,
    traits: [], skin: pa && chance(R, .8) ? pa.skin : pick(R, SKINS), hair0: pa && chance(R, .7) ? pa.hair0 : pick(R, HAIRS), hair: '', shirt: pick(R, SHIRTS),
    scale: 1, hat: 'none', hatCol: '#ccc', robe: false, apron: false, rel: {}, aff: {}, know: {}, quirk: pick(R, QUIRKS), workKey: null,
    fam: { mother: o.mother ? o.mother.id : null, father: o.father ? o.father.id : null, spouse: null, kids: [], partner: null },
    social: 60 + R() * 30, grief: 0, preg: null, lastBirth: -1e9, courtSince: 0, bornHere: !!(o.mother || o.father)
  };
  n.hair = n.hair0;
  const pool = age >= 16 ? TRAITS : KID_TRAITS;
  if (par.length) { const pt = par.flatMap(p => p.traits).filter(t => pool.includes(t)); const t0 = pt.length ? pick(R, pt) : null; if (t0) n.traits.push(t0); }
  while (n.traits.length < 2) {
    const t = pick(R, pool);
    if (!n.traits.includes(t) && !n.traits.some(x => TRAIT_CLASH.some(c => (c[0] === x && c[1] === t) || (c[1] === x && c[0] === t)))) n.traits.push(t);
  }
  styleFor(R, n);
  return n;
}
function linkKin(mother, father, child) {
  child.fam.mother = mother ? mother.id : null; child.fam.father = father ? father.id : null;
  [mother, father].forEach(p => { if (p) { p.fam.kids.push(child.id); fam2(p, child, 'parent', 'child'); } });
}
function fam2(a, b, x, y) { a.rel[b.id] = x; b.rel[a.id] = y || x; a.aff[b.id] = Math.max(a.aff[b.id] || 0, 55); b.aff[a.id] = Math.max(b.aff[a.id] || 0, 55); a.know[b.id] = 100; b.know[a.id] = 100; }
function setSpouse(a, b) { a.fam.spouse = b.id; b.fam.spouse = a.id; a.fam.partner = b.id; b.fam.partner = a.id; a.rel[b.id] = b.rel[a.id] = 'spouse'; a.aff[b.id] = Math.max(a.aff[b.id] || 0, 80); b.aff[a.id] = Math.max(b.aff[a.id] || 0, 80); a.know[b.id] = b.know[a.id] = 100; }

/* ---------- daily rhythm: only wake and bed times are fixed ---------- */
function routine(R, n) {
  const has = t => n.traits.includes(t);
  const sh = ri(R, -18, 18) + (has('lazy') ? 55 : 0) + (has('night owl') ? 40 : 0) - (has('early bird') ? 45 : 0);
  const C = { Worker: [5.5, 21.5], Priest: [5.5, 21.5], Barkeep: [9, 25], Farmer: [5.25, 21.5], Trader: [6.5, 22], Woodcutter: [5.5, 21.5], Gatherer: [6, 21.5], Fisher: [4.75, 21.5], Elder: [6.5, 21], Child: [6.75, 20.75] }[n.role] || [6, 21.5];
  n.wake = Math.round(C[0] * 60 + sh); n.sleepAt = Math.round(C[1] * 60 + sh * 0.5);
}

