/* Blank island: homes you build and the people who come to live in them.
   A sealed room (sealing.ts) with a bed standing inside it and a door becomes a hut (kind 'house'): the bed props are its beds.
   A visitor arrives by the shore when a bed is free and there is enough food on the island; the first ones come easily, later ones need more.
   Alone, you talk to yourself about what to build next (`visitorMutter`). */

const VIS_FIRST_DAY = 1, VIS_GAP = [3, 5];   // days between arrivals (first one a day after the first bed)
/* the people who arrive do not know why they are here: an ordinary moment, then sand (put together at random, so no two are the same) */
const VIS_ORD = ['was ironing a shirt', 'had just put the kettle on', 'was waiting for a bus that never came', 'was looking for a lost cat', 'was reading a timetable', 'was listening to the radio',
  'was cutting an onion', 'was on the way to the post office', 'was in the bath', 'was counting change', 'was standing in a queue', 'was watering a plant', 'was folding the washing', 'was reaching for the light switch'];
const VIS_ARR = ['and then there was sand', 'and then the floor was a beach', 'and then somebody turned the light off and the sea was there', 'and then, without any door, here', 'and then it was afternoon, somewhere else', 'and then the wind smelled of salt',
  'and then the street simply ended', 'and then there were gulls'];

const VIS_HOME_KINDS = ['house'];

function visBedProps() { return (town.props || []).filter(p => p.kind === 'bed'); }
/** a privy seat standing inside a built room makes it a place to relieve yourself: villagers stand beside the seat */
function visToilet(r) {
  const ts = (town.props || []).filter(p => p.kind === 'toilet' && r.cells.has(p.x + p.y * W));
  if (!ts.length || r.doorX == null) { r.toilet = null; r.ptoilet = false; r.pseats = []; if (r.priv) { r.priv = false; r.name = r.hut ? 'Hut' : 'Room'; } return; }
  const taken = new Set<number>(), old = r.pseats || [], seats: any[] = [];
  for (const t of ts) {
    let at: any = null;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const x = t.x + dx, y = t.y + dy, k = x + y * W; if (r.cells.has(k) && !taken.has(k) && walkable(x, y) && !lfPropAt(x, y)) { at = { x, y, face: { dx: -dx, dy: -dy } }; taken.add(k); break; } }
    if (!at) continue; const was = old.find(q => q.prop === t);
    seats.push({ toilet: at, prop: t, ptoilet: true, room: r, name: r.hut ? 'the hut' : 'the privy', user: was ? was.user : null, until: was ? was.until : 0 });   // (every seat with a free tile beside it is a privy of its own)
  }
  r.pseats = seats; r.toilet = seats.length ? seats[0].toilet : null; r.ptoilet = seats.length > 0; if (seats.length && !r.hut) { r.priv = true; r.name = 'Privy'; }
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
    if (!yardOn()) for (const b of r.beds) if (!inside.includes(b) && b.owner) { const o = b.owner; if (o && o.bed === b) { o.bed = { owner: null }; o.homeless = true; o.homeRoom = null; } b.owner = null; }
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
    setRole(n, 'Worker'); n.coin = 10; n.inv = n.inv || {}; n.inv.grain = (n.inv.grain || 0) + 6; n.seat = null; n.x = n.tx = p.x; n.y = n.ty = p.y; n.back = pick(R, VIS_ORD) + ', ' + pick(R, VIS_ARR); n.newcomer = { t0: game.time, met: [], next: game.time + 20 }; npcs.push(n);
    npcs.forEach(o => { if (o !== n && !n.know[o.id]) { n.know[o.id] = 4; o.know[n.id] = 4; n.aff[o.id] = 8; o.aff[n.id] = 8; } });
  }
  { const B0 = typeof townBalance === 'function' ? townBalance() : null; if (kitOn() && town.scenario !== 'hamlet' && B0 && B0.harvests >= 1 && !(town.tut && town.tut.carpenter) && grp.length === 1) carpArrive(grp[0]); }
  const a = grp[0]; chron(grp.length > 1 ? `${nameOf(a)} and ${nameOf(grp[1])} came ashore, looking as though they had just woken up. ${a.first} ${a.back}.` : `${nameOf(a)} came ashore, looking as though they had just woken up. ${a.first} ${a.back}.`, 'life');
  lfEmit('arrival', { actor: a, tags: ['news'], sev: 1.6, loud: true, chron: false });   // (the island will talk about it: talk/events.ts)
  housingTick();
  for (const n of grp) { if (!n.homeRoom) n.homeless = true; }
  lfShout(a, anyOf(['Excuse me, is this a dream?', 'I think I am still asleep. Hello.', 'This is not where I was a moment ago. ...All right.', 'Is anybody here? Or is that not how it works?', 'Hm. Sand. Of course.']));
  const pl = game.player; if (pl && pl.player) playerSay(pl, `${a.first} is on the beach. I do not think they know why, either.`);
  return grp;
}
function visitorTick() {
  if (!town) return;
  visHomes(); if (game.time - (town.ovenSweep || -1e9) > 1440) { town.ovenSweep = game.time; clearOrphanOvens(); }   // (a day at a time: leftovers of huts that came down)

  if (town.scenario !== 'blank') return;   // (the Hamlet has its own arrivals: life2/arrivals.ts)
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
  const L = !hasBed ? ['I woke up here and I do not remember going to sleep. A bed, I think. B for build mode, then the bed from the menu (I).', 'No idea how I got here. A bed first, though. Somebody may come if there is a place to sleep.']
    : !hasRoom ? ['A bed on its own is just a bed on a beach. It wants walls, and a door that leads somewhere real.', 'Walls and a door. I push them into place one at a time, and the sand does not seem to mind.']
    : !hasHut ? ['The room is closed, but it has no bed in it. That seems wrong, like a kitchen with no kettle.', 'A bed inside the room, and I think it counts as a home.']
    : visFood() < 12 ? ['If anyone is going to stay they will want to eat. Berries, fish, a field of barley. I have the strange feeling I have done this before.', 'I ought to sow something. There is a hoe, and a few seeds, and nobody to tell me it is odd.']
    : ['A free bed and something to eat. Now I wait, and try not to wonder who.', 'Another bed would not hurt. Somebody might need it. They usually do.'];
  pl.player.msg = L[m.i++ % L.length]; pl.player.msgAt = clk(); m.at = game.time;
}
LF2.hourly.push(() => visitorMutter());

/* villagers tell you what they are missing (a shout over their head when you are near; each need at most once every six hours per person) */
function visNeeds() {
  const pl = game.player; if (!pl || !town || (town.scenario !== 'blank' && town.scenario !== 'hamlet')) return;
  for (const n of npcs) {
    if (n.player || n.dead || n.infant || n.pose === 'sleep' || isPaullus(n) || Math.hypot(n.tx - pl.tx, n.ty - pl.ty) > 16) continue;
    const said = n.said = n.said || {}, once = (k, t) => { if (game.time - (said[k] || -1e9) < 360) return false; said[k] = game.time; lfShout(n, t); return true; };
    const homeless = town.scenario === 'hamlet' ? !(n.bed && n.bed.x != null) : !n.homeRoom || !n.bed || n.bed.owner !== n;
    const food = FOODS.reduce((s, g) => s + (n.inv[g] || 0), 0) + (n.homeRoom && n.homeRoom.pantry ? FOODS.reduce((s, g) => s + (n.homeRoom.pantry[g] || 0), 0) : 0);
    if (homeless) { once('bed', anyOf(["I have nowhere to sleep. It's all right. Though a bed would be better.", 'Is there a spare bed? I do not need much. A blanket would do.', 'I would like a bed, if one is going. Walls, a door, a bed inside.'])); continue; }
    if (modOn('rule.bladder') && !lfPrivies().length && n.bladder > 45) { once('privy', anyOf(["Is there a privy? I only ask because it keeps coming up.", 'We need a privy. A seat in a closed room would do.'])); continue; }
    if (n.hunger > 65 && food < 1) { once('food', anyOf(["I am hungry and I have nothing to eat. It occurred to me that this might be a problem.", 'There is no food. A field, a net, anything.'])); continue; }
    { const nd = (typeof islandNeeds === 'function' ? islandNeeds() : []).find(q => !['bed', 'bed2', 'privy', 'field', 'food', 'harvest'].includes(q.id)); if (nd && game.time - (said['n:' + nd.id] || -1e9) > 720) { said['n:' + nd.id] = game.time; lfShout(n, nd.say); continue; } }
    if (n.energy < 25 && homeless) once('tired', 'I can hardly keep my eyes open. This may or may not be the dream.');
    else if (n.newcomer && game.time - (said.isle || -1e9) > 180) { said.isle = game.time; lfShout(n, pick(Math.random, VIS_ISLE)); }
  }
}
LF2.hourly.push(() => visNeeds());

/* a newcomer introduces themselves around the place and talks about the island for the first couple of days */
const VIS_ISLE = [
  'The sea is very blue. It looks painted, but I do not mind.', 'I keep expecting to wake up. I am in no hurry.', 'My shoes are full of sand. That feels real, at least.', 'Nobody has asked how we got here. I think that is polite.',
  'It is an odd place. I like it more than I should.', 'I had a whole afternoon planned. This is better, somehow.', 'If this is a dream, it is a very detailed one. Somebody even built a wall.', 'I do not remember falling asleep. I do not remember anything wrong, either.',
  'The grass is exactly the right green. That is what worries me, a little.', 'Is it strange that I am not frightened? I thought I would be.', 'The gulls here do not seem to want anything. I find that restful.', 'I will need a place to sleep. That seems like the practical thing.',
];
const VIS_HELLO = ["Hello. I am {me}. I do not know why I am here, to be honest.", "{me}. Is this a dream, do you think? ...It does not feel like one.", "Good morning. {me}. I seem to have arrived.", "I am {me}. I was somewhere else a minute ago. You do not have to explain."];
const VIS_WELCOME = ['Welcome, {me}. I am {you}. I am not sure how I got here either.', "{you}. Nice to meet you, {me}. We seem to be all right, whatever this is.", 'Well met, {me}. I am {you}. Best not to ask too much. There is a bed, I think.', "{you}. Sit down, {me}. The kettle, I am told, will turn up."];
function visNearTile(t) { for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]]) { const x = t.tx + dx, y = t.ty + dy; if (walkable(x, y) && !lfPropAt(x, y) && !npcs.some(o => o !== t && o.tx === x && o.ty === y)) return { x, y, face: { dx: -dx, dy: -dy } }; } return null; }
function visFill(s, me, you?) { return s.replace(/\{me\}/g, me).replace(/\{you\}/g, you || ''); }
function visIntroTick() {
  if (!town || !game.player) return;
  for (const n of npcs) {
    const nc = n.newcomer; if (!nc || n.player || n.dead || n.pose === 'sleep' || n.moving) continue;
    if (game.time - nc.t0 > 2 * 1440) { n.newcomer = null; continue; }
    if (game.time < (nc.next || 0)) continue;
    if (!isAwake(n, game.time % 1440)) continue;
    if (n.hunger > 60) continue;   // (hungry first: introductions wait until they have eaten)
    { const st = n.plan && n.plan[n.si]; if (st && (st.act === 'eat' || /eat|food|larder|shopping/i.test(st.text || ''))) continue; }
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
    `where: ${esc(placeOf(n))}${levelWord(n.y) && !/upstairs|underground|high up|roof|mine/.test(placeOf(n)) ? ' (' + levelWord(n.y) + ')' : ''} · doing: ${esc(n.status || n.pose || '')}<br><b>${need.length ? 'needs next: ' + need.join(', ') : 'needs nothing right now'}</b>`;
}
