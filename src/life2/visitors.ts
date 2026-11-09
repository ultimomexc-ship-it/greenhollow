/* Blank island: homes you build and the people who come to live in them.
   A sealed room (sealing.ts) with a bed standing inside it and a door becomes a hut (kind 'house'): the bed props are its beds.
   A visitor arrives by the shore when a bed is free and there is enough food on the island; the first ones come easily, later ones need more.
   Alone, you talk to yourself about what to build next (`visitorMutter`). */

const VIS_FIRST_DAY = 1, VIS_GAP = [3, 5];   // days between arrivals (first one a day after the first bed)
const VIS_BACK = [
  'lost the farm to a bad harvest and the tax collector', 'was a fisher until the boat went down', 'ran from a quarrel in a town two valleys over', 'is a younger child with no land to inherit',
  'was a shepherd whose flock was taken by wolves', 'walked here from a village the fever emptied', 'left a debt behind and a loaf in the pocket', 'heard there was an island with room',
  'was a potter whose kiln burned', 'wants a place that has not been decided already',
];
const VIS_HOME_KINDS = ['house'];

function visBedProps() { return (town.props || []).filter(p => p.kind === 'bed'); }
/** a privy seat standing inside a built room makes it a place to relieve yourself: villagers stand beside the seat */
function visToilet(r) {
  const t = (town.props || []).find(p => p.kind === 'toilet' && r.cells.has(p.x + p.y * W));
  if (!t || r.doorX == null) { r.toilet = null; r.ptoilet = false; if (r.priv) { r.priv = false; r.name = r.hut ? 'Hut' : 'Room'; } return; }
  let at = null;
  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const x = t.x + dx, y = t.y + dy; if (r.cells.has(x + y * W) && walkable(x, y) && !lfPropAt(x, y)) { at = { x, y, face: { dx: -dx, dy: -dy } }; break; } }
  if (!at) { r.toilet = null; r.ptoilet = false; return; }
  r.toilet = at; r.ptoilet = true; if (!r.hut) { r.priv = true; r.name = 'Privy'; }
}
/** free rooms that hold a bed become huts; beds that left the room are let go */
function visHomes() {
  if (!town || !rooms) return;
  for (const r of rooms) {
    if (r.dead || !r.free || !r.cells) continue;
    const inside = visBedProps().filter(p => r.cells.has(p.x + p.y * W));
    if (r.kind === 'room' && inside.length && r.doorX != null) { r.kind = 'house'; r.name = 'Hut'; r.pantry = r.pantry || {}; r.hut = true; }
    visToilet(r);
    if (r.kind !== 'house' || !r.hut) continue;
    for (const b of r.beds) if (!inside.includes(b) && b.owner) { const o = b.owner; if (o && o.bed === b) { o.bed = { owner: null }; o.homeless = true; o.homeRoom = null; } b.owner = null; }
    r.beds = r.beds.filter(b => inside.includes(b));
    for (const p of inside) if (!r.beds.includes(p)) { p.owner = p.owner || null; r.beds.push(p); }
    if (!r.beds.length) { r.kind = 'room'; r.name = 'Room'; r.hut = false; }
  }
}
function visFreeBeds() { let k = 0; for (const r of rooms) if (!r.dead && r.hut && r.kind === 'house') for (const b of r.beds) if (!b.owner || b.owner.dead || b.owner.homeRoom !== r) k++; return k; }
function visFood() {
  let f = 0; for (const n of npcs) for (const g of FOODS) f += n.inv[g] || 0;
  for (const r of rooms) if (!r.dead && r.pantry) for (const g of FOODS) f += r.pantry[g] || 0;
  f += (town.crops || []).filter(c => c.st >= 2).length * 3 + (town.nodes || []).filter(nd => nd.amt >= 1).length * 0.3;
  return f;
}
function visArrive() {
  const R = rng(town.seed + Math.floor(game.time) * 7), single = npcs.length < 3;
  const male = npcs.filter(n => n.age >= 16 && !n.female).length, fem = npcs.filter(n => n.age >= 16 && n.female).length;
  const female = male > fem ? true : male < fem ? false : chance(R, .5), sn = pick(R, SURNAMES);
  const grp: any[] = [newPerson(R, 'Child', ri(R, 18, 34), town.used, { female, surname: sn })];
  if (!single && chance(R, .3) && visFreeBeds() >= 2) { const b = newPerson(R, 'Child', ri(R, 18, 34), town.used, { female: !female, surname: sn }); setSpouse(grp[0], b); grp.push(b); }
  const sh = town.shoreTiles && town.shoreTiles.length ? town.shoreTiles[Math.floor(R() * town.shoreTiles.length)] : null;
  const p = sh ? { x: sh.x, y: sh.y } : { x: town.cx, y: town.cy };
  for (const n of grp) {
    n.adult = true; n.infant = false; n.age = ageNow(n); updateLook(n); n.rand = rng(town.seed + n.id * 977); n.jit = 0; n.bornHere = false;
    n.homeRoom = null; n.bed = { owner: null }; routine(R, n); town.byId.set(n.id, n); initNpcSim(n);
    setRole(n, 'Worker'); n.coin = 10; n.inv = n.inv || {}; n.inv.grain = (n.inv.grain || 0) + 6; n.seat = null; n.x = n.tx = p.x; n.y = n.ty = p.y; n.back = pick(R, VIS_BACK); npcs.push(n);
    npcs.forEach(o => { if (o !== n && !n.know[o.id]) { n.know[o.id] = 4; o.know[n.id] = 4; n.aff[o.id] = 8; o.aff[n.id] = 8; } });
  }
  const a = grp[0]; chron(grp.length > 1 ? `${nameOf(a)} and ${nameOf(grp[1])} came ashore and asked for a place to stay. ${a.first} ${a.back}.` : `${nameOf(a)} came ashore and asked for a place to stay. ${a.first} ${a.back}.`, 'life');
  housingTick();
  for (const n of grp) { if (!n.homeRoom) n.homeless = true; }
  const pl = game.player; if (pl && pl.player) playerSay(pl, `Somebody has come ashore: ${a.first}.`);
  return grp;
}
function visitorTick() {
  if (!town) return;
  visHomes();
  if (town.scenario !== 'blank') return;
  const v = town.vis = town.vis || { next: null, n: 0 };
  const day = game.time / 1440;
  if (v.next == null) { if (visFreeBeds() > 0) v.next = day + VIS_FIRST_DAY; else return; }
  if (day < v.next) return;
  if (visFreeBeds() < 1) return;
  const pop = npcs.length, need = 8 + pop * 6;   // the first ones come easily, later ones need more on the island
  if (v.n >= 2 && visFood() < need) return;
  visArrive(); v.n++; v.next = day + VIS_GAP[0] + Math.random() * (VIS_GAP[1] - VIS_GAP[0]);
}
LF2.hourly.push(() => visitorTick());

/* alone on the island you think aloud about what comes next */
function visitorMutter() {
  const pl = game.player; if (!pl || !pl.player || !town || town.scenario !== 'blank' || npcs.length > 1 || pl.player.act || pl.player.sleeping) return;
  const m = town.mut = town.mut || { at: 0, i: 0 };
  if (game.time - m.at < 90) return;
  const hasRoom = rooms.some(r => !r.dead && r.free), hasBed = visBedProps().length > 0, hasHut = rooms.some(r => !r.dead && r.hut);
  const L = !hasBed ? ['I should make a bed. B for build mode, then pick the bed from the menu (I).', 'A bed first. Somebody may come if there is a place to sleep.']
    : !hasRoom ? ['A bed is not a house. Walls and a door, and push them together.', 'Four walls, a door that leads outside, and the bed inside. Then it is a home.']
    : !hasHut ? ['The room is closed but there is no bed inside it. Push one in.', 'A bed inside the room, and it counts as a home.']
    : visFood() < 12 ? ['If anyone is to stay, they will need food. Berries, fish, a field of barley.', 'I should sow something. A hoe and a few seeds.']
    : ['A free bed and food on the table. Now we wait and see who comes.', 'Another bed would not hurt. Somebody might need it.'];
  pl.player.msg = L[m.i++ % L.length]; pl.player.msgAt = clk(); m.at = game.time;
}
LF2.hourly.push(() => visitorMutter());

/* villagers tell you what they are missing (a shout over their head when you are near; each need at most once every six hours per person) */
function visNeeds() {
  const pl = game.player; if (!pl || !town || town.scenario !== 'blank') return;
  for (const n of npcs) {
    if (n.player || n.dead || n.infant || n.pose === 'sleep' || Math.hypot(n.tx - pl.tx, n.ty - pl.ty) > 16) continue;
    const said = n.said = n.said || {}, once = (k, t) => { if (game.time - (said[k] || -1e9) < 360) return false; said[k] = game.time; lfShout(n, t); return true; };
    const homeless = !n.homeRoom || !n.bed || n.bed.owner !== n;
    const food = FOODS.reduce((s, g) => s + (n.inv[g] || 0), 0) + (n.homeRoom && n.homeRoom.pantry ? FOODS.reduce((s, g) => s + (n.homeRoom.pantry[g] || 0), 0) : 0);
    if (homeless) { once('bed', anyOf(["I've nowhere to sleep. Could you build a bed for me?", 'Is there a free bed? Any roof will do.', 'I could use a bed. Walls, a door, a bed inside.'])); continue; }
    if (!lfPrivies().length && n.bladder > 45) { once('privy', anyOf(["Is there a privy anywhere? I'm tired of the bushes.", 'We need a privy. A seat in a closed room would do.'])); continue; }
    if (n.hunger > 65 && food < 1) { once('food', anyOf(["I'm hungry and I've nothing to eat. Could we grow something?", 'There is no food. A field, a net, anything.'])); continue; }
    if (n.energy < 25 && homeless) once('tired', 'I can hardly keep my eyes open.');
  }
}
LF2.hourly.push(() => visNeeds());
