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
    if (r.dead || !r.free || !r.cells || r.fn) continue;   // (a bakery, tavern, chapel ... is not a home)
    const inside = visBedProps().filter(p => r.cells.has(p.x + p.y * W));
    if (r.kind === 'room' && inside.length && r.doorX != null) { r.kind = 'house'; r.name = 'Hut'; r.pantry = r.pantry || {}; r.hut = true; if (!r.hearth) r.hearth = { none: true }; }   // (a hut has no kitchen: the village's "hearth in every house" would drop an oven tile in it, which stays behind as a blocked tile when the hut comes down)
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
    setRole(n, 'Worker'); n.coin = 10; n.inv = n.inv || {}; n.inv.grain = (n.inv.grain || 0) + 6; n.seat = null; n.x = n.tx = p.x; n.y = n.ty = p.y; n.back = pick(R, VIS_BACK); n.newcomer = { t0: game.time, met: [], next: game.time + 20 }; npcs.push(n);
    npcs.forEach(o => { if (o !== n && !n.know[o.id]) { n.know[o.id] = 4; o.know[n.id] = 4; n.aff[o.id] = 8; o.aff[n.id] = 8; } });
  }
  { const B0 = typeof townBalance === 'function' ? townBalance() : null; if (kitOn() && B0 && B0.harvests >= 1 && !(town.tut && town.tut.carpenter) && grp.length === 1) carpArrive(grp[0]); }
  const a = grp[0]; chron(grp.length > 1 ? `${nameOf(a)} and ${nameOf(grp[1])} came ashore and asked for a place to stay. ${a.first} ${a.back}.` : `${nameOf(a)} came ashore and asked for a place to stay. ${a.first} ${a.back}.`, 'life');
  housingTick();
  for (const n of grp) { if (!n.homeRoom) n.homeless = true; }
  lfShout(a, anyOf(['Land at last!', 'Solid ground. Thank the gods.', 'Is anybody here?']));
  const pl = game.player; if (pl && pl.player) playerSay(pl, `Somebody has come ashore: ${a.first}.`);
  return grp;
}
function visitorTick() {
  if (!town) return;
  visHomes(); if (game.time - (town.ovenSweep || -1e9) > 1440) { town.ovenSweep = game.time; clearOrphanOvens(); }   // (a day at a time: leftovers of huts that came down)

  if (town.scenario !== 'blank') return;
  const v = town.vis = town.vis || { next: null, n: 0 };
  const day = game.time / 1440;
  if (v.next == null) { if (visFreeBeds() > 0) v.next = day + VIS_FIRST_DAY; else return; }
  if (day < v.next) return;
  if (visFreeBeds() < 1) return;
  if (typeof tutBlocksArrival === 'function' && tutBlocksArrival()) return;   // (a bed, a privy or food is still missing: nobody new comes until it is put right)
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
    { const nd = (typeof islandNeeds === 'function' ? islandNeeds() : []).find(q => !['bed', 'bed2', 'privy', 'field', 'food', 'harvest'].includes(q.id)); if (nd && game.time - (said['n:' + nd.id] || -1e9) > 720) { said['n:' + nd.id] = game.time; lfShout(n, nd.say); continue; } }
    if (n.energy < 25 && homeless) once('tired', 'I can hardly keep my eyes open.');
    else if (n.newcomer && game.time - (said.isle || -1e9) > 180) { said.isle = game.time; lfShout(n, pick(Math.random, VIS_ISLE)); }
  }
}
LF2.hourly.push(() => visNeeds());

/* a newcomer introduces themselves around the place and talks about the island for the first couple of days */
const VIS_ISLE = [
  'The soil here looks good. Somebody could grow barley on that slope.', 'I heard seals on the north shore last night. Or it was the wind.', 'So this is the place. Quieter than I thought.',
  'Fresh water is the first thing. Has anybody found a spring?', 'The tide leaves a lot of driftwood. That is a lot of building wood, if you know how.', 'I like it here already. The air is different.',
  'It is strange, starting over with nothing. It is a good strange.', 'Where do people fish from? I saw fish in the shallows.', 'I could stay a long time if there is a bed and a bit of work.',
];
const VIS_HELLO = ["Hello! I'm {me}. I came ashore this morning.", "Good day. {me}, newly arrived. I hope I'm not in the way.", "I don't think we've met. I'm {me}, from over the water.", "{me}. I've just landed. Is it always this peaceful?"];
const VIS_WELCOME = ['Welcome, {me}. I am {you}. There is room for one more.', "{you}. Glad of the company, {me}. Ask if you need anything.", 'Well met, {me}. I am {you}. You have picked a quiet corner of the world.'];
function visNearTile(t) { for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]]) { const x = t.tx + dx, y = t.ty + dy; if (walkable(x, y) && !lfPropAt(x, y) && !npcs.some(o => o !== t && o.tx === x && o.ty === y)) return { x, y, face: { dx: -dx, dy: -dy } }; } return null; }
function visFill(s, me, you?) { return s.replace(/\{me\}/g, me).replace(/\{you\}/g, you || ''); }
function visIntroTick() {
  if (!town || !game.player) return;
  for (const n of npcs) {
    const nc = n.newcomer; if (!nc || n.player || n.dead || n.pose === 'sleep' || n.moving) continue;
    if (game.time - nc.t0 > 2 * 1440) { n.newcomer = null; continue; }
    if (game.time < (nc.next || 0)) continue;
    if (!isAwake(n, game.time % 1440)) continue;
    const others = npcs.filter(o => o !== n && !o.dead && !o.infant && !nc.met.includes(o.id) && o.pose !== 'sleep').sort((a, b) => (b.player ? 1e3 : 0) - (a.player ? 1e3 : 0) || Math.hypot(a.tx - n.tx, a.ty - n.ty) - Math.hypot(b.tx - n.tx, b.ty - n.ty));
    const t = others[0]; if (!t) { nc.next = game.time + 120; continue; }
    nc.next = game.time + 40; nc.met.push(t.id);
    abortPlan(n);
    n.plan = [goS(() => visNearTile(t) || { x: t.tx, y: t.ty, face: null }, 'Going to say hello to ' + t.first),
      waitS(5, 'stand', 'Introducing themselves to ' + t.first, { onEnd(nn) {
        const hi = visFill(pick(Math.random, VIS_HELLO), nn.first);
        if (t.player || t.dead) { say(nn, t, [[nn, hi + ' ' + (nn.back ? nn.first + ' ' + nn.back + '.' : '')]]); return; }
        say(nn, t, [[nn, hi], [t, visFill(pick(Math.random, VIS_WELCOME), nn.first, t.first)], [nn, pick(Math.random, VIS_ISLE)]]);
        lfAff(nn, t, 3, 'welcomed me'); lfAff(t, nn, 2, 'introduced themselves');
      } })];
    n.si = 0; n.stepStarted = false;
  }
}
LF2.tickers.push(visIntroTick);

/** old saves: an oven tile left standing where a built hut used to be (no live room owns it, and it is not one of the bakery's ovens) goes back to grass */
function clearOrphanOvens() {
  const bak = new Set((town.ovens || []).map(o => o.x + o.y * W)); let k = 0;
  for (const r of rooms) if (!r.dead && r.free && r.hut && r.hearth && r.hearth.x != null && grid[r.hearth.y][r.hearth.x] === T.OVEN) { setT(r.hearth.x, r.hearth.y, T.FLOOR); markDirty(r.hearth.x, r.hearth.y, 1, 1); r.hearth = { none: true }; r.spots = r.spots || {}; delete r.spots.cook; k++; }   // (huts got a kitchen oven by mistake)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (grid[y][x] !== T.OVEN || bak.has(x + y * W)) continue; const ri = roomAt[y][x], r = ri >= 0 ? rooms[ri] : null; if (r && !r.dead) continue; setT(x, y, T.GRASS); markDirty(x, y, 1, 1); k++; }
  if (k) { town.gridV = (town.gridV || 0) + 1; if (typeof refreshReach === 'function') refreshReach(); }
  return k;
}

/** build mode, hovering a villager: who they are, where they live, what they have and what they need next (a debugging view) */
function npcDebug(n) {
  const r = n.homeRoom && !n.homeRoom.dead ? n.homeRoom : null, bed = n.bed && n.bed.owner === n ? n.bed : null;
  const food = FOODS.reduce((s, g) => s + (n.inv[g] || 0), 0) + (r && r.pantry ? FOODS.reduce((s, g) => s + (r.pantry[g] || 0), 0) : 0);
  const need: string[] = [];
  if (!r || !bed) need.push('a bed'); else if (!lfPrivies().length && n.bladder > 40) need.push('a privy'); if (n.hunger > 55 && food < 1) need.push('food');
  if (n.energy != null && n.energy < 30) need.push('rest'); if (n.social != null && n.social < 25) need.push('company');
  const pct = v => Math.round(v == null ? 0 : v) + '%';
  return `<b>${esc(n.first)}</b> · ${n.age} · ${esc(n.role || '')}${n.job ? ' / ' + esc(n.job) : ''}${n.player ? ' (you)' : ''}<br>` +
    `home: ${r ? esc(r.name || r.kind) : '<b>none</b>'} · bed: ${bed ? (bed.x - (r ? r.x : 0)) + ', ' + (bed.y - (r ? r.y : 0)) + ' (theirs)' : '<b>none</b>'}<br>` +
    `hunger ${pct(n.hunger)} · bladder ${pct(n.bladder)} · energy ${pct(n.energy)} · company ${pct(n.social)}<br>` +
    `doing: ${esc(n.status || n.pose || '')}<br><b>${need.length ? 'needs next: ' + need.join(', ') : 'needs nothing right now'}</b>`;
}
