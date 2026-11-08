/* ================= life2 / actions: what you can do to the thing in front of you =================
   The verbs live here and in the town / law / daily-life hooks; what is in your hand (player/items.ts) picks which one happens.               */
const LF2_COIN = 'd';
const lf2Front = n => { const f = n.face || { dx: 0, dy: 1 }, dx = Math.sign(f.dx || 0), dy = dx ? 0 : Math.sign(f.dy || 0) || 1; return { x: n.tx + dx, y: n.ty + dy }; };
const lf2Occ = (x, y, n) => { const o = tileOwner.get(tkey(x, y)); return o && o !== n && !o.dead && !o.infant ? o : null; };
function lf2Do(n, a) { const p = n.player; if (!p) return; p.act = Object.assign({ t: 0, auto: true, tool: null }, a); p.keys = {}; }
function lf2Say(n, t) { if (n.player) playerSay(n, t); }
const lf2Adj = (a, b) => Math.abs(a.tx - b.tx) + Math.abs(a.ty - b.ty) <= 1.5;
/* the family whose yard or house something is in (null when it is public) */
function lf2OwnerRoom(x, y) {
  const ri = roomAt[y] && roomAt[y][x]; if (ri >= 0) { const r = rooms[ri]; return r && r.kind === 'house' ? r : null; }
  let best = null, bd = 4;
  for (const r of rooms) { if (r.dead || r.kind !== 'house') continue; const dx = Math.max(r.x - x, 0, x - (r.x + r.w - 1)), dy = Math.max(r.y - y, 0, y - (r.y + r.h - 1)), d = dx + dy; if (d < bd) { bd = d; best = r; } }
  return best;
}
const lf2RoomHead = r => { if (!r) return null; const o = (r.owners || []).map(o => typeof o === 'object' ? o : byId(o)).filter(o => o && !o.dead && o.age >= 16); return o[0] || npcs.find(q => q.homeRoom === r && !q.dead && q.age >= 16) || null; };
const lf2Family = r => r ? (r.name || 'a house').replace(/ House$/, '') : '';

/* ---------------- props: search, push, pull, swap ---------------- */
function lf2Loot(pr) {
  const day = Math.floor(game.time / 1440);
  if (pr.loot === undefined || (pr.lootDay != null && day - pr.lootDay >= 2 && !pr.loot)) {
    pr.lootDay = day; const r = Math.random();
    pr.loot = r < 0.4 ? null : r < 0.65 ? { g: anyOf(FOODS), q: 1 + (Math.random() < 0.4 ? 1 : 0) } : r < 0.88 ? { g: 'coin', q: 1 + Math.floor(Math.random() * 4) } : { g: 'herbs', q: 1 };
  }
  return pr.loot;
}
function lf2Search(n, pr) {
  const label = LF_NOUN[pr.kind], room = lf2OwnerRoom(pr.x, pr.y), mine = room && room === n.homeRoom, head = mine ? null : lf2RoomHead(room);
  const l = lf2Loot(pr); pr.loot = null; pr.searchedT = game.time;
  if (!l) { lf2Say(n, anyOf(['Nothing in here but dust.', 'Empty. Just straw and a dead spider.', 'Nothing worth having.'])); if (head) lfEmit('snoop', { actor: n, target: head, x: pr.x, y: pr.y, sev: 1, tags: ['trespass'], aware: false, chron: false, text: `${n.first} was seen rummaging through the ${lf2Family(room)} family's ${label}` }); return; }
  const what = l.g === 'coin' ? l.q + ' ' + (l.q > 1 ? 'denarii' : 'denarius') : l.q + ' ' + (GOODS[l.g] ? GOODS[l.g].name : l.g);
  if (l.g === 'coin') n.coin += l.q; else n.inv[l.g] = (n.inv[l.g] || 0) + l.q;
  lf2Say(n, 'Found ' + what + '.');
  if (head) lfEmit('theft', { actor: n, target: head, x: pr.x, y: pr.y, sev: 1, tags: ['theft', 'crime'], aware: false, value: l.g === 'coin' ? l.q : 2, chron: false, text: `${n.first} helped themself to ${what} from the ${lf2Family(room)} family's ${label}` });
}
function lf2MoveProp(pr, x, y, by) {
  town.pblock[pr.y * W + pr.x] = 0; town.propAt.delete(pr.y * W + pr.x);
  pr.fx = pr.x; pr.fy = pr.y; pr.x = x; pr.y = y; pr.st = performance.now(); pr.moved = game.time; pr.by = by ? by.id : null;
  town.pblock[y * W + x] = 1; town.propAt.set(y * W + x, pr); town.lfPV = (town.lfPV || 0) + 1;
  pr.seen = []; for (const o of npcs) if (o !== by && !o.dead && !o.infant && o.pose !== 'sleep' && Math.abs(o.tx - x) + Math.abs(o.ty - y) <= 10) pr.seen.push(o.id);
}
/* can the prop stand on tile (x, y) (which the player is standing on right now)? */
function lf2PropFits(pr, x, y) {
  if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2) return false;
  const g = grid[y][x]; if (g === T.DOOR || g === T.SEAT || g === T.BED || g === T.PEW || g === T.CROP || g === T.PLOT || g === T.TENT || BLOCKED.has(g)) return false;
  const rm = roomAt[y][x]; if (rm !== roomAt[pr.y][pr.x]) return false;
  if (rm >= 0) { const r = rooms[rm]; if (r.doorX != null && x === r.doorX && (y === r.doorY || y === r.doorY + (r.side === 'b' ? -1 : 1))) return false; }
  if (town.siteAt[y * W + x] || (town.stalls || []).some(s => s.front.x === x && s.front.y === y)) return false;
  return true;
}
/* pushing into a wall: you and the crate swap places */
function lf2Swap(n, pr) {
  if (!lf2PropFits(pr, n.tx, n.ty)) return false;
  const ox = pr.x, oy = pr.y; lf2MoveProp(pr, n.tx, n.ty, n);
  n.path = [{ x: ox, y: oy }]; n.moving = true; n.t = 0; n.pose = 'walk'; n.status = 'Squeezing past the ' + LF_NOUN[pr.kind];
  return true;
}
/* a crate left against somebody's door is a prank (and may shut them in) */
function lf2AfterPush(n, pr) {
  if (!lfNearDoor(pr.x, pr.y)) return;
  const r = rooms.find(r => !r.dead && r.doorX != null && Math.abs(pr.x - r.doorX) <= 1 && pr.y === (r.side === 'b' ? r.doorY + 1 : r.doorY - 1));
  if (!r) return; const head = r.kind === 'house' ? lf2RoomHead(r) : null;
  const ev = lfEmit('blockdoor', { actor: n, target: head, x: pr.x, y: pr.y, sev: 1, tags: ['prank', 'nuisance'], aware: false, chron: false, text: `${n.first} shoved a ${LF_NOUN[pr.kind]} against the door of ${r.name}` });
  pr.pushEv = ev.id;
}

/* ---------------- the obvious thing for what you walk into (called by the player controller) ---------------- */
function lifeAct(n, p, fx, fy, dx, dy) {
  for (const f of LF2.pre) { const r = f.player && f.player(n, p, fx, fy, dx, dy); if (r) return r; }
  const pr = lfPropAt(fx, fy);
  if (pr && pr.kind === 'rock' && itHeld(n).kind === 'hammer') return { key: 'rock' + pr.id + 'p', min: 13, text: 'Breaking stone', tool: 'hammer', run(nn) { lf2BreakRock(nn, pr); } };   // a loose rock: the hammer breaks it
  if (itHand(n, 'push')) {   // Push: push it, or the line of things it heads (life2/push.ts); against a wall a lone crate swaps places with you
    const r = lf2PushLine(n, fx, fy, dx, dy); if (r === true) return null;
    if (r) return { msg: r };
  }
  if (pr) {
    const label = LF_NOUN[pr.kind];
    const mode = itHand(n) ? itMode(n) : null;
    if (mode === 'push') return { msg: 'The ' + label + ' won\'t budge.' };
    if (mode === 'search') { if (pr.loot === null && (pr.lootDay || 0) >= Math.floor(game.time / 1440) - 1) return game.time - (pr.searchedT || -99) < 4 ? null : { msg: 'You\'ve already been through this ' + label + '.' };
      return { key: 'search' + pr.id, min: 5, text: 'Searching the ' + label, tool: 'pick', run(nn) { lf2Search(nn, pr); } }; }   // Search: search it
    return { msg: 'The ' + label + ': ' + itWant(n, 'push') };
  }
  if (grid[fy] && grid[fy][fx] === T.BARREL) { const r = rooms[roomAt[fy][fx]]; if (r && r.kind === 'house' && r !== n.homeRoom) return { msg: `The ${lf2Family(r)} family's food barrel. ` }; }
  return null;
}
/* walking into a person (in Push mode they are pushed aside instead: see lf2PushPerson in controls.ts) */
function lf2PersonAct(n, p, o, tg) {
  for (const f of LF2.pre) { const r = f.person && f.person(n, p, o, tg); if (r) return r; }
  return null;
}
function lf2Shove(n, o) {
  if (!lf2Adj(n, o)) return;
  const dx = Math.sign(o.tx - n.tx), dy = Math.sign(o.ty - n.ty), bx = o.tx + dx, by = o.ty + dy;
  const kid = o.age < 14, recent = (n.lf2Shoves || []).filter(t => game.time - t < 120); recent.push(game.time); n.lf2Shoves = recent;
  if (!o.player) { abortPlan(o); if (walkable(bx, by) && !lf2Occ(bx, by, o) && !lfPropAt(bx, by)) { o.path = [{ x: bx, y: by }]; o.moving = true; o.t = 0; o.pose = 'walk'; } o.plan = [waitS(3, 'stand', 'Picking themself up after a shove', { nopie: true })]; o.si = 0; o.stepStarted = false; o.talkUntil = game.time + 4; faceTo(o, n); }
  const sev = kid || recent.length >= 3 ? 2 : 1;
  lfEmit('shove', { actor: n, target: o, sev, loud: true, tags: sev > 1 ? ['violence', 'harm'] : ['harm', 'nuisance'], chron: sev > 1, text: `${n.first} shoved ${o.first}${kid ? ', a child,' : ''} out of the way` });
  if (!o.player) { const brave = lf2Has(o, 'brave') || lf2Has(o, 'grumpy') || lf2Has(o, 'proud'); lfShout(o, brave ? anyOf(['Oi! Watch it!', 'Do that again and see what happens.', 'Who do you think you are?']) : anyOf(['Hey!', 'Ow! What was that for?', 'Please, stop it.'])); }
}

/* ---------------- everything else: the verbs (each one belongs to a held key, see controls.ts) ---------------- */
function lf2Give(n, o, q) {
  if (n.coin < q) { lf2Say(n, 'You do not have ' + q + ' denarii.'); return; }
  n.coin -= q; o.coin = (o.coin || 0) + q; const poor = (o.coin - q) < 5;
  lfEmit('gift', { actor: n, target: o, sev: poor ? 2 : 1, tags: ['generous', 'kindness'], chron: poor, text: `${n.first} gave ${o.first} ${q} denarii${poor ? ' when they had next to nothing' : ''}` });
  if (!o.player) lfShout(o, poor ? anyOf(['Oh! Thank you. You do not know what this means.', 'Bless you. Truly.']) : anyOf(['For me? Thank you!', 'Well, that is kind.', 'Are you sure? Thank you.']));
}
function lf2GiveFood(n, o) {
  const g = FOODS.concat(['bread', 'stew']).find(g => (n.inv[g] || 0) > 0); if (!g) { lf2Say(n, 'You have no food.'); return; }
  n.inv[g]--; const hungry = o.hunger >= 55; o.hunger = Math.max(0, o.hunger - ((GOODS[g] && GOODS[g].sat) || 25));
  lfEmit('gift', { actor: n, target: o, sev: hungry ? 2 : 1, tags: ['kindness', 'generous'], chron: hungry, text: `${n.first} gave ${o.first} some ${GOODS[g] ? GOODS[g].name : g}${hungry ? ' when they were starving' : ''}` });
  if (!o.player) lfShout(o, hungry ? 'Oh, thank you. I was so hungry.' : 'How kind. Thank you.');
}
function lf2Distract(n, o) {
  const st = o.plan && o.plan[o.si], busy = st && (st.act === 'work' || st.act === 'eat');
  abortPlan(o); o.plan = [waitS(12, 'stand', 'Chatting with ' + n.first + ' (distracted)', { social: true, nopie: true })]; o.si = 0; o.stepStarted = false; faceTo(o, n);
  if (busy) { lfAff(o, n, -2); o.jobSat = Math.max(0, (o.jobSat || 50) - 5); lfShout(o, anyOf(['I really should be working...', 'Oh, go on then. Just for a minute.', 'You are a bad influence.'])); }
  else lfShout(o, anyOf(['Oh, hello!', 'What is it?']));
  if (busy && o.job) lfEmit('distract', { actor: n, target: o, sev: 1, tags: ['nuisance'], chron: false, text: `${n.first} kept ${o.first} from their work` });
}
function lf2Help(n, o) {
  const st = o.plan && o.plan[o.si]; if (!st || st.act !== 'work' || !lf2Adj(n, o)) { lf2Say(n, o.first + ' does not need a hand right now.'); return; }
  o.until = Math.max(game.time, (o.until || game.time) - 15); bumpAff(n, o, 4, 8);
  lfEmit('help', { actor: n, target: o, sev: 1, tags: ['help', 'kindness'], chron: false, text: `${n.first} lent ${o.first} a hand with the work` });
  lfShout(o, anyOf(['Many hands! Thank you.', 'That went quicker. Thanks!', 'You are a good sort.']));
}
function lf2Wake(n, o) {
  if (o.pose !== 'sleep') return; abortPlan(o); o.pose = 'stand'; o.plan = [waitS(10, 'stand', 'Woken up, and grumpy about it', { nopie: true })]; o.si = 0; o.stepStarted = false; o.energy = Math.max(0, (o.energy || 50) - 10); faceTo(o, n);
  lfShout(o, anyOf(['Wha-? What is it? Is something on fire?', 'Go AWAY.', 'Do you know what time it is?']));
  lfEmit('wake', { actor: n, target: o, sev: 1, tags: ['prank', 'nuisance'], chron: false, text: `${n.first} woke ${o.first} up for no reason` });
}
function lf2Inspect(n, o) {
  if (typeof select === 'function') select(o);
  const k = lf2Known(o).top.map(x => LF2_REPWORD[x[0]]), carried = Object.keys(o.inv || {}).filter(g => (o.inv[g] || 0) > 0).map(g => o.inv[g] + ' ' + (GOODS[g] ? GOODS[g].name : g));
  lf2Say(n, `${o.first}${o.job ? ', ' + lf2JobName(o).toLowerCase() : ''}. ${lfMoodWord ? lfMoodWord(o.mood) : ''}. Purse: ~${Math.round(o.coin || 0)}${LF2_COIN}${carried.length ? '. Carrying ' + carried.join(', ') : ''}${k.length ? '. Known as ' + k.join(', ') : ''}.`);
}
const lf2JobName = o => (typeof LF2_JOBS !== 'undefined' && LF2_JOBS[o.job] && LF2_JOBS[o.job].name) || o.job || o.role;
function lf2StealBarrel(n, r) {
  const pan = r.pantry || {}; let c = 0, got = [];
  for (const g of Object.keys(pan).sort((a, b) => ((GOODS[b] && GOODS[b].sat) || 0) - ((GOODS[a] && GOODS[a].sat) || 0))) while ((pan[g] || 0) > 0 && c < 3) { pan[g]--; n.inv[g] = (n.inv[g] || 0) + 1; c++; got.push(g); }
  if (!c) { lf2Say(n, 'Empty. They have nothing either.'); return; }
  lf2Say(n, 'Took ' + c + ' food.');
  lfEmit('theft', { actor: n, target: lf2RoomHead(r), sev: 1, aware: false, tags: ['theft', 'crime', 'trespass'], chron: false, value: c * 2, text: `${n.first} stole food from the ${lf2Family(r)} family's barrel` });
}
/* the verbs for the tile in front of you (or for tile tx, ty) */
function lf2Verbs(n, tx?, ty?) {
  const front = tx === undefined ? lf2Front(n) : { x: tx, y: ty }, x = front.x, y = front.y, out: any[] = [], o = lf2Occ(x, y, n), add = (label, f, min?, text?, tool?) => out.push({ label, mod: null, f, min: min || 0, text: text || label, tool: tool || null });
  let title = '';
  if (o) {
    title = o.first + (o.job ? ' · ' + lf2JobName(o) : '');
    if (o.pose === 'sleep') { add('Wake them up', nn => lf2Wake(nn, o)); }
    else {
      add('Talk', () => { if (typeof openTalk === 'function') openTalk(o); });
      add('Rough them up', nn => lf2Shove(nn, o), 1, 'Shoving ' + o.first);
      if (n.coin >= 5) add('Give 5 denarii', nn => lf2Give(nn, o, 5));
      if (FOODS.concat(['bread', 'stew']).some(g => (n.inv[g] || 0) > 0)) add('Give some food', nn => lf2GiveFood(nn, o));
      const st = o.plan && o.plan[o.si]; if (st && st.act === 'work') { add('Lend a hand', nn => lf2Help(nn, o), 15, 'Helping ' + o.first, st.tool); add('Distract them', nn => lf2Distract(nn, o)); }
      add('Follow', nn => { nn.player.follow = o.id; lf2Say(nn, 'Following ' + o.first + '. (Move to stop.)'); });
    }
    add('Inspect', nn => lf2Inspect(nn, o));
  } else {
    const pr = lfPropAt(x, y);
    if (pr) { title = lf2Cap(LF_NOUN[pr.kind]); add('Search it', nn => lf2Search(nn, pr), 5, 'Searching the ' + LF_NOUN[pr.kind], 'pick'); add('Push it', nn => { if (!lfPush(pr, x - nn.tx, y - nn.ty, nn) && !lf2Swap(nn, pr)) lf2Say(nn, 'It will not budge.'); else lf2AfterPush(nn, pr); }); }
    if (grid[y] && grid[y][x] === T.BARREL) { const r = rooms[roomAt[y][x]]; if (r && r.kind === 'house' && r !== n.homeRoom) { title = `The ${lf2Family(r)} family's barrel`; add('Steal some food', nn => lf2StealBarrel(nn, r), 3, 'Quietly filling your pockets', 'pick'); add('Look inside', nn => lf2Say(nn, `About ${foodCount(r.pantry || {})} meals' worth of food.`)); } }
  }
  for (const f of LF2.verbs) { try { const t = f(n, x, y, o, add); if (t && !title) title = t; } catch (e) { console.warn('verbs', e.message); } }
  return { title, list: out };
}

/* ---------------- following someone ---------------- */
function lf2Follow(n, p) {
  if (!p.follow) return false; const o = byId(p.follow);
  if (!o || o.dead || o.inShip) { p.follow = null; return false; }
  n.status = 'Following ' + o.first;
  if (lf2Adj(n, o) || n.moving) return true;
  if ((p.followT || 0) > game.time && !n.moving) return true;
  p.followT = game.time + 2;
  const b = besideTile(o.tx, o.ty, null); const path = b && findPath(n.tx, n.ty, b.x, b.y);
  if (path && path.length) { n.path = path.slice(0, 6); n.moving = true; n.t = 0; n.pose = 'walk'; }
  if (!o.player && (o.lf2Tail = (o.lf2Tail || 0) + (lf2Notice(o, n.tx, n.ty) > 0.5 ? 1 : 0)) > 12) { o.lf2Tail = 0; lfShout(o, anyOf(['Why are you following me?', 'Can I help you? You have been behind me all day.', 'Stop following me!'])); lfAff(o, n, -2); }
  return true;
}
