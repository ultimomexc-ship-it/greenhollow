/* ================= life2 / actions: walk into things for the obvious thing, E for everything else =================
   Walk into it   -> the obvious action (talk, search a crate, buy at a counter, fell a tree...)
   Space + walk   -> force: push a crate (or swap places when it is against a wall), shove a person
   E (or More)    -> a short list of everything else you could do to what is in front of you            */
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
function lf2Pull(n, pr) {
  const bx = 2 * n.tx - pr.x, by = 2 * n.ty - pr.y;
  if (!walkable(bx, by) || lf2Occ(bx, by, n) || (typeof noStep === 'function' && noStep(bx, by)) || !lf2PropFits(pr, n.tx, n.ty)) { lf2Say(n, 'No room behind me to pull it.'); return; }
  const fx = n.tx, fy = n.ty; lf2MoveProp(pr, fx, fy, n); n.path = [{ x: bx, y: by }]; n.moving = true; n.t = 0; n.pose = 'walk'; n.face = { dx: Math.sign(pr.x - bx) || 0, dy: Math.sign(pr.y - by) || 0 };
  lf2AfterPush(n, pr);
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
  if (pr) {
    const label = LF_NOUN[pr.kind];
    if (p.push) { if (lfPush(pr, dx, dy, n)) { lf2AfterPush(n, pr); return null; } if (lf2Swap(n, pr)) return { msg: '' }; return { msg: 'The ' + label + ' will not budge.' }; }
    if (pr.loot === null && (pr.lootDay || 0) >= Math.floor(game.time / 1440) - 1) return game.time - (pr.searchedT || -99) < 4 ? null : { msg: 'You have already been through this ' + label + '. (Hold Space to push it.)' };
    return { key: 'search' + pr.id, min: 5, text: 'Searching the ' + label, tool: 'pick', run(nn) { lf2Search(nn, pr); } };
  }
  if (grid[fy] && grid[fy][fx] === T.BARREL) { const r = rooms[roomAt[fy][fx]]; if (r && r.kind === 'house' && r !== n.homeRoom) return { msg: `The ${lf2Family(r)} family's food barrel. (E for more)` }; }
  return null;
}
/* walking into a person; Space shoves them */
function lf2PersonAct(n, p, o, tg) {
  for (const f of LF2.pre) { const r = f.person && f.person(n, p, o, tg); if (r) return r; }
  if (p.push && o.pose !== 'sleep') return { key: 'shove' + o.id, min: 1, text: 'Shoving ' + o.first, tool: null, run(nn) { lf2Shove(nn, o); } };
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

/* ---------------- everything else: the E list ---------------- */
function lf2Pickpocket(n, o) {
  if (!lf2Adj(n, o)) { lf2Say(n, o.first + ' moved away.'); return; }
  const asleep = o.pose === 'sleep', f = o.face || { dx: 0, dy: 1 }, away = f.dx * (n.tx - o.tx) + f.dy * (n.ty - o.ty) < 0;
  const st = o.plan && o.plan[o.si];
  let pk = asleep ? 0.88 : 0.5 + (away ? 0.22 : 0) + (st && st.act === 'work' ? 0.1 : 0) + ((o.drunk || 0) > 50 ? 0.25 : 0) - (lf2Has(o, 'curious') ? 0.12 : 0) - (lf2Has(o, 'anxious') ? 0.12 : 0) - (o.job === 'Guard' ? 0.25 : 0);
  const goods = Object.keys(o.inv || {}).filter(g => (o.inv[g] || 0) > 0 && g !== 'wood' && g !== 'stone');
  if (Math.random() < pk) {
    let what;
    if ((o.coin || 0) >= 1 && (Math.random() < 0.75 || !goods.length)) { const q = Math.max(1, Math.floor(o.coin * (0.25 + Math.random() * 0.35))); o.coin -= q; n.coin += q; what = q + (q > 1 ? ' denarii' : ' denarius'); }
    else if (goods.length) { const g = anyOf(goods); o.inv[g]--; n.inv[g] = (n.inv[g] || 0) + 1; what = '1 ' + (GOODS[g] ? GOODS[g].name : g); }
    lf2Say(n, what ? 'Got away with ' + what + '.' : 'Their pockets were empty.');
    if (!what) return;
    const ev = lfEmit('pickpocket', { actor: n, target: o, sev: 1, aware: false, tags: ['theft', 'crime'], chron: false, value: parseInt(what) || 1, text: `${n.first} picked ${o.first}'s pocket` });
    // they notice later; whoever saw it may be able to say who it was
    (town.lf2Later = town.lf2Later || []).push({ at: game.time + 30 + Math.random() * 120, f: 'noticeTheft', ev: ev.id, who: o.id, what });
  } else {
    if (asleep) { o.pose = 'stand'; abortPlan(o); }
    lfEmit('pickpocket', { actor: n, target: o, sev: 2, loud: true, tags: ['theft', 'crime'], text: `${o.first} caught ${n.first} with a hand in their pocket` });
    if (!o.player) { lfShout(o, anyOf(['Thief! THIEF!', 'Get your hands off me!', 'Help! A pickpocket!'])); faceTo(o, n); }
    lf2Say(n, 'Caught!');
  }
}
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
/* the list for the thing in front of you */
function lf2Verbs(n) {
  const { x, y } = lf2Front(n), out = [], o = lf2Occ(x, y, n), add = (label, f, min, text, tool) => out.push({ label, run: () => min ? lf2Do(n, { key: 'v' + label, min, text: text || label, tool: tool || null, run: f }) : f(n) });
  let title = '';
  if (o) {
    title = o.first + (o.job ? ' · ' + lf2JobName(o) : '');
    if (o.pose === 'sleep') { add('Pick their pocket', nn => lf2Pickpocket(nn, o), 2, 'Reaching into ' + o.first + '\'s pocket'); add('Wake them up', nn => lf2Wake(nn, o)); }
    else {
      add('Talk', () => { if (typeof openTalk === 'function') openTalk(o); });
      add('Pick their pocket', nn => lf2Pickpocket(nn, o), 2, 'Reaching into ' + o.first + '\'s pocket');
      add('Shove', nn => lf2Shove(nn, o));
      if (n.coin >= 5) add('Give 5 denarii', nn => lf2Give(nn, o, 5));
      if (FOODS.concat(['bread', 'stew']).some(g => (n.inv[g] || 0) > 0)) add('Give some food', nn => lf2GiveFood(nn, o));
      const st = o.plan && o.plan[o.si]; if (st && st.act === 'work') { add('Lend a hand', nn => lf2Help(nn, o), 15, 'Helping ' + o.first, st.tool); add('Distract them', nn => lf2Distract(nn, o)); }
      add('Follow', nn => { nn.player.follow = o.id; lf2Say(nn, 'Following ' + o.first + '. (Move to stop.)'); });
    }
    add('Inspect', nn => lf2Inspect(nn, o));
  } else {
    const pr = lfPropAt(x, y);
    if (pr) { title = lf2Cap(LF_NOUN[pr.kind]); add('Search it', nn => lf2Search(nn, pr), 5, 'Searching the ' + LF_NOUN[pr.kind], 'pick'); add('Push it', nn => { if (!lfPush(pr, x - nn.tx, y - nn.ty, nn) && !lf2Swap(nn, pr)) lf2Say(nn, 'It will not budge.'); else lf2AfterPush(nn, pr); }); add('Pull it', nn => lf2Pull(nn, pr)); }
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

/* ---------------- the hint line and the E list (DOM) ---------------- */
const lf2UI = { menu: null, items: [], prev: null, open: false };
function lf2HintText(n) {
  const p = n.player; if (!p || p.sleeping) return '';
  if (p.act && p.act.auto) return '';
  if (p.follow) { const o = byId(p.follow); return o ? 'Following ' + o.first + ' · move to stop' : ''; }
  const { x, y } = lf2Front(n), o = lf2Occ(x, y, n);
  if (o) return o.pose === 'sleep' ? `${o.first} is asleep · E for more` : `Walk: talk to ${o.first} · Space: shove · E: more`;
  const pr = lfPropAt(x, y); if (pr) return `Walk: search the ${LF_NOUN[pr.kind]} · Space: push · E: more`;
  const v = lf2Verbs(n); if (v.list.length) return (v.title ? v.title + ' · ' : '') + 'E: ' + v.list.map(i => lf2Low(i.label)).slice(0, 3).join(', ') + (v.list.length > 3 ? '…' : '');
  return '';
}
function lf2Pause(on) {
  if (on) { const cur = document.querySelector('[data-speed][aria-pressed="true"]'); lf2UI.prev = cur ? cur.dataset.speed : '2'; const ps = document.querySelector('[data-speed="0"]'); if (ps) ps.click(); }
  else { const b = document.querySelector('[data-speed="' + (lf2UI.prev || '2') + '"]'); if (b) b.click(); }
}
function lf2OpenMenu() {
  const n = game.player; if (!n || !n.player || n.player.sleeping || (talkUI && talkUI.o)) return;
  const v = lf2Verbs(n); const m = document.getElementById('lf2menu'); if (!m) return;
  if (!v.list.length) { playerSay(n, 'Nothing else to do here.'); return; }
  lf2UI.items = v.list; lf2UI.open = true;
  m.innerHTML = '<div class="t">' + esc(v.title || 'What now?') + '</div>' + v.list.map((it, i) => `<button type="button" data-v="${i}"><b>${i + 1}</b> ${esc(it.label)}</button>`).join('') + '<button type="button" data-v="x" class="x"><b>Esc</b> Never mind</button>';
  m.hidden = false; lf2Pause(true);
  const b = m.querySelector('button'); if (b) b.focus({ preventScroll: true });
}
function lf2CloseMenu(run) {
  const m = document.getElementById('lf2menu'); if (!m || !lf2UI.open) return;
  m.hidden = true; lf2UI.open = false; lf2Pause(false); canvas.focus({ preventScroll: true });
  if (run) { try { run.run(); } catch (e) { console.warn('verb', e); } }
}
(function () {
  const stage = canvas.parentNode; if (!stage) return;
  const css = document.createElement('style');
  css.textContent = '.lf2hint{position:absolute;left:50%;bottom:92px;transform:translateX(-50%);background:rgba(21,25,27,.78);color:#e8e4da;font-size:12px;padding:4px 12px;border-radius:999px;pointer-events:none;white-space:nowrap;max-width:92%;overflow:hidden;text-overflow:ellipsis;z-index:4}' +
    '.lf2menu{position:absolute;left:50%;bottom:122px;transform:translateX(-50%);background:rgba(21,25,27,.94);border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:6px;display:flex;flex-direction:column;gap:2px;min-width:200px;z-index:6;color:#e8e4da}' +
    '.lf2menu .t{font-size:12px;opacity:.75;padding:2px 8px 4px}.lf2menu button{all:unset;cursor:pointer;padding:6px 10px;border-radius:6px;font-size:14px}.lf2menu button b{display:inline-block;min-width:26px;opacity:.6;font-weight:600}' +
    '.lf2menu button:hover,.lf2menu button:focus{background:#d9a441;color:#1b1b1b}.lf2menu button.x{opacity:.7}' +
    '#lf2more{display:none;position:absolute;right:154px;bottom:122px;width:56px;height:42px;background:rgba(21,25,27,.8);border:1px solid rgba(255,255,255,.18);color:#e8e4da;border-radius:8px;font-size:13px;touch-action:none}@media (pointer:coarse){#lf2more:not([hidden]){display:block}.lf2hint{bottom:auto;top:52px}}';
  document.head.appendChild(css);
  const h = document.createElement('div'); h.id = 'lf2hint'; h.className = 'lf2hint'; h.hidden = true; stage.appendChild(h);
  const m = document.createElement('div'); m.id = 'lf2menu'; m.className = 'lf2menu'; m.hidden = true; m.setAttribute('role', 'menu'); stage.appendChild(m);
  const b = document.createElement('button'); b.type = 'button'; b.id = 'lf2more'; b.textContent = 'More'; b.hidden = true; stage.appendChild(b);
  b.addEventListener('pointerdown', e => { e.preventDefault(); if (lf2UI.open) lf2CloseMenu(); else lf2OpenMenu(); });
  m.addEventListener('click', e => { const t = e.target.closest('[data-v]'); if (!t) return; lf2CloseMenu(t.dataset.v === 'x' ? null : lf2UI.items[+t.dataset.v]); });
  window.addEventListener('keydown', e => {
    if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = (e.key || '').toLowerCase();
    if (lf2UI.open) {
      if (k === 'escape' || k === 'e') { lf2CloseMenu(); e.preventDefault(); e.stopImmediatePropagation(); return; }
      if (/^[1-9]$/.test(k) && lf2UI.items[+k - 1]) { lf2CloseMenu(lf2UI.items[+k - 1]); e.preventDefault(); e.stopImmediatePropagation(); return; }
      menuNav(e, [...m.querySelectorAll('[data-v]')], () => lf2CloseMenu()); return;
    }
    if (k === 'e' && game.player && game.player.player) { lf2OpenMenu(); e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (game.player && game.player.player && KEYDIR && (KEYDIR[e.key] || KEYDIR[k])) game.player.player.follow = null;
  }, true);
  setInterval(() => {
    const n = game.player, t = n && !lf2UI.open && !(talkUI && talkUI.o) ? lf2HintText(n) : '';
    if (h.textContent !== t) h.textContent = t; h.hidden = !t;
    b.hidden = !(n && n.player);
  }, 200);
})();

