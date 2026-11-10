/* ================= Player control: take over a worker ================= */
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
function canControl(n) { return !!n && !n.dead && !n.infant && n.age >= 8 && (n.role === 'Worker' || n.role === 'Elder' || n.role === 'Child'); }
function takeControl(n) {
  if (!canControl(n)) return false;
  if (game.player) releasePlayer();
  abortPlan(n); release(n); n.carry = null;
  n.player = { keys: {}, act: null, lock: false, sleeping: false, msg: '', msgAt: -1e9, fx: 0, fy: 1, lastKey: typeof performance !== 'undefined' ? performance.now() : 0 }; game.steer = n.id;
  n.face = n.face || { dx: 0, dy: 1 }; n.pose = 'stand'; n.tool = null; n.hold = null; n.status = 'Under your control';
  game.player = n; itEnsure(n, true); return true;
}
function releasePlayer() {
  const n = game.player; if (!n) return;
  game.player = null; n.player = null; n.pose = 'stand'; n.tool = null; n.hold = null;
  if (!n.dead) { n.plan = null; n.si = 0; n.stepStarted = false; n.path = []; n.moving = false; n.x = n.tx; n.y = n.ty; }
}
function playerSay(n, text) { n.player.msg = cvSpeak(text); n.player.msgAt = clk(); }
const nodeAt = (x, y) => { const k = y * W + x; return town.nodes.find(nd => nd.x === x && nd.y === y && nd.amt >= 1); };
const cropAt = (x, y) => town.crops.find(c => c.x === x && c.y === y);
function stallTrade(n, x, y) {
  const m = merchants.filter(m => Math.abs(m.front.x - n.tx) + Math.abs(m.front.y - n.ty) <= 1.5 && Math.abs(m.post.x - x) + Math.abs(m.post.y - y) <= 3)[0] || merchants.filter(m => Math.abs(m.front.x - n.tx) + Math.abs(m.front.y - n.ty) <= 1.5)[0];
  return m || null;
}
/* returns {key,min,text,tool,run(n)} or null (or {msg} for a message-only bump) */
function targetAt0(n, x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return null;
  const g = grid[y][x];
  { const q = town.crossAt && town.crossAt.get(y * W + x); if (q) return { msg: readCross(q) }; }
  { const r = (town.remains || []).find(r => r.x === x && r.y === y); if (r) { const f = town.funeral; return { msg: `${r.rec.first}... ${r.rec.age} years, and now just bones. ` + (f && f.rec.id === r.id ? `The funeral is ${f.at - game.time > 60 ? 'coming' : 'soon'}.` : `There will be a funeral.`) }; } }
  // the dark wood is scenery: its old pines are not for felling
  if (g === T.TREE && wildTile(x, y)) return { msg: 'The old pines grow too thick to cut through.' };
  const full = false;   // (no carrying limit: wood and stone go into the bag)
  if (g === T.TREE && itBuildOn(n) && n.build.sel === 1) return { key: 'wallt' + x + ',' + y, min: 7, text: 'Clearing the tree', tool: 'hammer', run(n) { if (grid[y][x] === T.TREE) { workFx('fall', x, y, n); setT(x, y, T.GRASS); markDirty(x, y, 1, 1); bagGet(n, 'wood'); town.treeDirty = true; town.treeCache = null; } } };   // (build mode: the hammer clears land)
  if (g === T.MOUNTAIN && itBuildOn(n) && n.build.sel === 1) return { key: 'wallm' + x + ',' + y, min: 12, text: 'Breaking up the crag', tool: 'hammer', run(n) { if (grid[y][x] === T.MOUNTAIN) { workFx('split', x, y, n); setT(x, y, T.GRASS); markDirty(x, y, 1, 1); bagGet(n, 'stone'); town.treeDirty = true; town.stoneCache = null; } } };
  if (itBuildOn(n) && n.build.sel === 2 && itBuildCanRotate(x, y)) return { key: 'rott' + x + ',' + y, min: 1.2, text: 'Turning it', tool: null, run(nn) { bldRotate(x, y); } };
  if (g === T.TREE) return { key: 'tree' + x + ',' + y, min: 10, text: full ? 'Clearing the way' : 'Felling a tree', tool: 'axe', run(n) { if (grid[y][x] === T.TREE) { workFx('fall', x, y, n); setT(x, y, T.GRASS); markDirty(x, y, 1, 1); bagGet(n, 'wood'); town.treeDirty = true; town.treeCache = null; } } };
  if (g === T.ROCK) return { key: 'rock' + x + ',' + y, min: 13, text: full ? 'Clearing the way' : 'Breaking stone', tool: 'hammer', run(n) { if (grid[y][x] === T.ROCK) { workFx('split', x, y, n); setT(x, y, T.GRASS); markDirty(x, y, 1, 1); bagGet(n, 'stone'); if (itRockOre(n)) playerSay(n, 'Iron ore in the rock!'); town.treeDirty = true; town.stoneCache = null; } } };
  if (itBuildOn(n) && bldHammerWall(x, y, typeof itHeld === 'function' && itHeld(n).kind === 'hammer')) return { key: 'wall' + x + ',' + y, min: 9, text: 'Knocking out a wall block', tool: 'hammer', run(n) { bldBreak(x, y, n); playerSay(n, 'Gone.'); } };   // the hammer is the delete button for what is built: walls of your rooms and of villagers' houses
  if (PUSH_FURNITURE.has(g) && typeof pushFurniture === 'function' && typeof itHeld === 'function' && itHeld(n).kind === 'hammer' && pushFurniture(x, y)) return { key: 'wallf' + x + ',' + y, min: 6, text: 'Smashing the furniture', tool: 'hammer', run(n) { bldDeleteFurniture(x, y); playerSay(n, 'Gone.'); } };
  if (g === T.WATER) {
    const z = town.fishZones[(n.tx >> 3) + (n.ty >> 3) * 64];
    if (!z) return { msg: 'You need to stand on the shore to fish.' };
    return { key: 'fish' + n.tx + ',' + n.ty, min: 14, text: 'Fishing', tool: 'fish', repeat: true, run(n) {
      const p = 0.2 + 0.7 * z.stock / z.cap, r = Math.random();
      if (r < p && z.stock >= 1) { const q = r < p * 0.22 ? 2 : 1; z.stock -= q; town.pondInfo.fishedToday += q; town.pondInfo.fishedTotal += q; n.inv.fish = (n.inv.fish || 0) + q; playerSay(n, '+' + q + ' fish'); }
      else playerSay(n, 'Nothing biting' + (z.stock < 3 ? ' (the fish are running low here)' : ''));
    } };
  }
  const nd = nodeAt(x, y);
  if (nd) return { key: 'node' + x + ',' + y, min: 7, text: nd.kind === 'berry' ? 'Picking berries' : 'Gathering herbs', tool: 'pick', repeat: true, run(n) {
    const t = Math.min(nd.amt, nd.kind === 'berry' ? 3 : 2); nd.amt -= t; const gd = nd.kind === 'berry' ? 'berries' : 'herbs'; n.inv[gd] = (n.inv[gd] || 0) + t; playerSay(n, '+' + t + ' ' + gd);
  } };
  if (itBuildOn(n) && n.build.sel === 1 && g === T.CROP) return { key: 'wallC' + x + ',' + y, min: 2, text: 'Digging the plot back to grass', tool: 'hammer', run(nn) { town.crops = town.crops.filter(c => !(c.x === x && c.y === y)); setT(x, y, T.GRASS); markDirty(x, y, 1, 1); town.gridV = (town.gridV || 0) + 1; if (typeof refreshReach === 'function') refreshReach(); playerSay(nn, 'Gone.'); } };
  if (g === T.WALL && !itBuildOn(n)) { const sr = signRoomAt(x, y); if (sr) return { msg: signText(sr) }; }   // (the sign beside a door)
  { const sh = !itBuildOn(n) && shroomAt(x, y); if (sh) return { key: 'shroom' + x + ',' + y, min: 0.6, text: 'Eating a mushroom', tool: null, run(nn) { eatShroom(nn, sh); } }; }
  if ((g === T.STAIR || g === T.STAIRD || g === T.STAIRM || g === T.STAIRU) && !(itBuildOn(n) && n.build.sel === 1)) { const sa = stairAction(n, x, y); if (sa) return sa; }
  if (g === T.EARTH && !itBuildOn(n)) return digAction(n, x, y);
  const c = cropAt(x, y);
  if (c && !itBuildOn(n)) {
    const st = c.st ? cropStage(c) : 0, fl = !!c.st && itIsFlower(c);
    if (fl && itWilted(c)) return { key: 'crop' + x + ',' + y + 'h', min: 2, text: 'Clearing the withered flowers', tool: 'hoe', walkOn: true, run(n) { if (c.st) { const sd = c.seed; c.st = 0; c.seed = null; itGiveStack(n, 'seed_' + sd, 1); playerSay(n, 'Cleared. The ground is ready again. +1 seed'); } } };
    if (c.st && st === 4 && !fl) return { key: 'crop' + x + ',' + y + 'h', min: 4, text: 'Harvesting grain', tool: 'hoe', walkOn: true, run(n) { if (c.st && cropStage(c) === 4) { const h = itHarvest(n, c); playerSay(n, '+' + h.q + ' ' + h.what + (h.back ? ', +' + h.back + ' seed' : '')); } } };
    if (!c.pl) return { key: 'crop' + x + ',' + y + 'p', min: 3, text: 'Ploughing the field', tool: 'hoe', walkOn: true, run(n) { c.pl = 1; playerSay(n, 'Ploughed. Let go, then walk into it again to sow.'); } };
    if (!c.st) return { key: 'crop' + x + ',' + y + 's', min: 7, text: 'Sowing seed', tool: 'hoe', walkOn: true, run(n) { if (!c.st) { c.st = 1; c.t0 = game.time; c.byPlayer = true; playerSay(n, 'Sown'); } } };   // any ploughed plot can be sown; only the farmers wait for the whole field
  }
  if (g === T.STALL) {
    const m = stallTrade(n, x, y);
    if (!m) return { msg: 'Nobody is at this stall.' };
    if (!m.serving) return { msg: 'The stall is closed right now.' };
    return { key: 'stall' + m.n.id, min: 0.8, text: 'Stepping up to the larder', tool: null, run(n) { if (typeof openShop === 'function') openShop(m); } };
  }
  if (itBuildOn(n) && n.build.sel === 1) {   // (build mode, destroy: lamp posts, fires and tents go too)
    if (g === T.LAMP) return { key: 'wallL' + x + ',' + y, min: 6, text: 'Smashing the lamp post', tool: 'hammer', run(nn) { bldDeleteLamp(x, y); playerSay(nn, 'Gone.'); } };
    if (g === T.TENT) return { key: 'wallT' + x + ',' + y, min: 6, text: 'Taking down the tent', tool: 'hammer', run(nn) { bldDeleteTent(x, y); playerSay(nn, 'Gone.'); } };
    const fire = fireList().find(f => f.x === x && f.y === y); if (fire) return { key: 'wallF' + x + ',' + y, min: 5, text: 'Putting out the fire', tool: 'hammer', run(nn) { bldDeleteFire(fire); playerSay(nn, 'Gone.'); } };
  }
  if (!itBuildOn(n) && (g === T.TENT || (g === T.BED && n.bed && n.bed.x === x && n.bed.y === y)) && awakeFor(n, game.time % 1440) < 180) return { msg: 'You have only just got up. Not tired yet.' };
  if (g === T.TENT && !itBuildOn(n)) {   // (never sleeps in build mode)
    const t = (town.tents || []).find(t => t.x === x && t.y === y);
    if (t && t.owner && t.owner !== n) return { msg: t.owner.first + ' is sleeping in this tent.' };
    if (n.homeRoom && n.bed && n.bed.x != null) return { msg: 'You have a bed of your own now.' };
    return { key: 'rest', min: 4, text: 'Crawling into the tent', tool: null, sleep: true, tent: t };
  }
  if (g === T.BARREL) {
    const room = rooms[roomAt[y][x]];
    if (!room || room !== n.homeRoom) return { msg: room ? `That is the pantry barrel of ${room.name}.` : 'A barrel.' };
    const pan = pantryOf(n);
    if (FOODS.some(f => (n.inv[f] || 0) > 0)) return { key: 'barrel', min: 3, text: 'Storing food in the barrel', tool: null, run(n) { let c = 0; FOODS.forEach(f => { const q = n.inv[f] || 0; if (q) { pan[f] = (pan[f] || 0) + q; n.inv[f] = 0; c += q; } }); playerSay(n, 'Stored ' + c + ' food in the family barrel'); } };
    if (foodCount(pan) > 0) return { key: 'barrel', min: 2, text: 'Taking food from the barrel', tool: null, run(n) { let c = 0; for (const f of FOODS.slice().sort((a, b) => GOODS[b].sat - GOODS[a].sat)) while ((pan[f] || 0) > 0 && c < 3) { pan[f]--; n.inv[f] = (n.inv[f] || 0) + 1; c++; } playerSay(n, 'Took ' + c + ' food from the barrel'); } };
    return { msg: 'The family barrel is empty.' };
  }
  if (g === T.SEAT && roomAt[y][x] >= 0 && rooms[roomAt[y][x]].kind === 'privy') return lifePrivyAct(n, x, y);
  if (!itBuildOn(n) && g === T.BED && n.bed && n.bed.x === x && n.bed.y === y) return { key: 'rest', min: 4, text: 'Going to bed', tool: null, sleep: true };
  if (g === T.TABLE && n.homeRoom && rooms[roomAt[y][x]] === n.homeRoom) return { key: 'table', min: 6, text: 'Eating at the table', tool: null, hold: 'plate', run(n) {
    stash(n); const p = pantryOf(n); if (!foodCount(p)) { playerSay(n, 'The pantry is empty.'); return; }
    const a = eatSat(n, p); playerSay(n, a ? 'Ate ' + a + ' meal' + (a > 1 ? 's' : '') : 'Not hungry. Food stored in the pantry.');
  } };
  return null;
}
function playerDir(p) { for (const d of ['up', 'down', 'left', 'right']) if (p.keys[d]) return d; return null; }
/* held keys, newest press first (so a fresh press slides you along a wall while the old key stays down) */
function playerDirs(p) {
  p.order = (p.order || []).filter(d => p.keys[d]);
  for (const d of ['up', 'down', 'left', 'right']) if (p.keys[d] && !p.order.includes(d)) p.order.push(d);
  return p.order.slice().reverse();
}
/* the direction to act on: the newest held key, unless it only leads into a wall and an older one is free */
function playerAim(n, p) {
  const ds = playerDirs(p); if (ds.length < 2) return ds[0] || null;
  for (const d of ds) {
    const X = n.tx + DIRV[d][0], Y = n.ty + DIRV[d][1], t = targetAt(n, X, Y), o = tileOwner.get(tkey(X, Y));
    if ((t && t.key) || (o && o !== n && !o.infant) || (!(t && t.msg) && walkable(X, Y))) return d;
  }
  return ds[0];
}
function playerFinish(n, a) {
  const p = n.player; p.act = null;
  if (a.sleep) {
    if (a.tent) { if (n.tent && n.tent !== a.tent && n.tent.owner === n) n.tent.owner = null; a.tent.owner = n; n.tent = a.tent; n.tx = a.tent.x; n.ty = a.tent.y; n.x = n.tx; n.y = n.ty; }
    const tod = game.time % 1440; let dl = (n.wake - tod + 1440) % 1440; if (dl < 45) dl += 1440; p.wakeAt = game.time + dl; p.needRelease = true;
  }
  if (a.sleep) { p.sleeping = true; n.pose = 'sleep'; n.tool = null; n.status = 'Sleeping'; if (a.key === 'rest' && n.bed && n.bed.x != null && (grid[n.bed.y][n.bed.x] === T.BED || lfBedAt(n.bed.x, n.bed.y))) { n.tx = n.bed.x; n.ty = n.bed.y; n.x = n.tx; n.y = n.ty; } logStep(n, 'Went to sleep'); return; }
  a.run(n); logStep(n, a.text);
}
function tickPlayer(n, dt) {
  tickPlayer0(n, dt);
}
function tickPlayer0(n, dt) {
  const p = n.player; if (!p) return;
  while (dt > 0) {
    const step = Math.min(dt, 0.3); dt -= step;
    if (p.sleeping) {
      const anyKey = !!playerDir(p), tod = game.time % 1440;
      n.pose = 'sleep'; n.status = 'Sleeping';
      if (game.time >= p.wakeAt || (p.wakeFt && clk() >= p.wakeFt) || (typeof summonEvent === 'function' && summonEvent(n))) {
        p.wakeFt = null; p.sleeping = false; if (n.tent) { if (n.tent.owner === n) n.tent.owner = null; n.tent = null; } p.idle = 0; p.lock = anyKey; n.pose = 'stand'; n.x = n.tx; n.y = n.ty; }
      continue;
    }
    // your own birthday party: you are walked to your place by the cake and stay there until it is over
    { const pt = typeof activeParty === 'function' ? activeParty() : null;
      if (pt && pt.who === n.id && game.time >= pt.at - 20) {
        p.keys = {}; p.act = null; p.grace = null; p.autoBed = false;
        const h = honourTile();
        if (!n.moving && (n.tx !== h.x || n.ty !== h.y) && game.time >= (p.partyTry || 0)) { p.partyTry = game.time + 10; const path = findPath(n.tx, n.ty, h.x, h.y); if (path && path.length) { n.path = path; n.moving = true; n.t = 0; n.pose = 'walk'; n.status = 'Walking to my own party'; } }
        if (n.moving) { stepNpc(n, step); if (n.moving) { n.pose = 'walk'; continue; } }
        n.pose = 'stand'; n.face = { dx: 0, dy: 1 }; n.status = 'At my own birthday party'; continue;
      } }
    pickUpDrops(n);
    // weddings, funerals and birthday parties: you go, like everyone else
    { const ev = typeof summonEvent === 'function' && !n.jail ? summonEvent(n) : null;
      if (ev) {
        const far = Math.abs(n.tx - ev.mid.x) + Math.abs(n.ty - ev.mid.y) > 10;
        // you are fetched once, to get there for the start; after that you are free to come and go
        if (p.summoned !== ev.key) { p.summoned = ev.key; p.summonGo = far && !ev.begun; if (p.summonGo) playerSay(n, ev.go); }
        if (p.summonGo) {
          p.keys = {}; p.act = null; p.grace = null; p.autoBed = false; p.autoGo = false;
          if (!n.moving) { const g = guestSpot(n, ev); const path = g && findPath(n.tx, n.ty, g.x, g.y);
            if (path && path.length) { n.path = path; n.moving = true; n.t = 0; n.pose = 'walk'; n.status = 'Heading to the ' + ev.kind; p.summonFace = g.face; }
            else { p.summonGo = false; if (g) n.face = g.face; } }
          if (n.moving) { stepNpc(n, step); if (n.moving) { n.pose = 'walk'; playerCarryFx(n); continue; } }
          n.pose = 'stand'; if (p.summonFace) n.face = p.summonFace; p.summonFace = null; p.summonGo = false; p.lock = true; n.status = 'At the ' + ev.kind; continue;
        }
      } else p.summoned = null; }
    // bedtime: too tired to go on, walk to bed and sleep until morning
    if (PLAYER_NEEDS && !p.autoBed && !p.act && !n.jail && !isAwake(n, game.time % 1440) && !(typeof lateNight === 'function' && lateNight()) && !(typeof talkUI !== 'undefined' && talkUI.o)) {
      p.autoBed = true; p.keys = {}; p.grace = null;
      game.events.push({ time: game.time, a: n, b: n, place: '', topic: 'greet', quiet: true, self: true, lines: [{ who: n, text: anyOf(['*yawns* I can barely keep my eyes open. Bed.', 'So tired... I could sleep standing up.', '*yawns* That is enough for one day.', 'My feet are done. Bed, now.']) }] });
      let tg = n.bed && n.bed.x != null ? { x: n.bed.x, y: n.bed.y } : null;
      if (!tg) { const t = claimTent(n); if (t) tg = { x: t.x, y: t.y }; }
      const path = tg ? findPath(n.tx, n.ty, tg.x, tg.y) : null;
      if (path && path.length) { n.path = path; n.moving = true; n.t = 0; n.pose = 'walk'; n.status = 'Heading to bed'; }
    }
    if (n.moving) { stepNpc(n, step); if (n.moving) { n.pose = 'walk'; playerCarryFx(n); continue; } n.pose = 'stand'; if (p.autoGo) { p.autoGo = false; p.lock = true; if (p.goFace) { n.face = p.goFace; p.goFace = null; } } }
    if (p.autoBed) {
      p.autoBed = false; const tod = game.time % 1440; const hhW = hhOf(n).filter(o => o !== n && o.age >= 16).map(o => o.wake), wk = Math.min(8.5 * 60, Math.max(7 * 60, n.wake + 50, ...(hhW.length ? hhW.map(w => w + 20) : [0]))); let dl = (wk - tod + 1440) % 1440; if (dl < 45) dl += 1440;
      p.wakeAt = game.time + dl; p.sleeping = true; n.pose = 'sleep'; n.tool = null; n.status = 'Sleeping'; logStep(n, 'Went to bed, worn out'); continue;
    }
    // automatic eating
    if (!p.act && n.hunger >= 60 && foodSat(n.inv) > 0) { p.act = { key: 'eat', min: 8, t: 0, text: 'Eating', tool: null, hold: 'plate', auto: true, run(n) { eatSat(n, n.inv); playerSay(n, 'Ate something'); } }; }
    playerDirs(p); const d = playerAim(n, p);
    if (d !== p.lastD) { p.lastD = d; if (p.lock && !p.needRelease) p.lock = false; }
    if (p.act && p.act.auto) { p.act.t += step; applyPlayerAct(n, p.act); if (p.act.t >= p.act.min) { const a = p.act; p.act = null; a.run(n); n.hold = null; n.pose = 'stand'; } continue; }
    if (!d && lf2Follow(n, p)) continue;
    if (!d) { p.idle = (p.idle || 0) + step;  if (p.act) { p.act = null; } p.grace = null; p.lock = false; p.skip = null; n.pose = 'stand'; n.tool = null; n.hold = null; n.status = 'Under your control'; continue; }
    if ((p.idle || 0) >= 0.25) p.fresh = true;   // (a press that starts from rest: this is how you ask to work a plot)
    p.idle = 0;
    const [dx, dy] = DIRV[d]; const pf = n.face || { dx: 0, dy: 1 }; n.face = { dx, dy };
    const fx = n.tx + dx, fy = n.ty + dy; p.fx = fx; p.fy = fy;
    if (p.grace) {
      const g = p.grace;
      if (g.x !== fx || g.y !== fy) { p.grace = null; p.act = null; }
      else { g.t += step; n.pose = 'stand'; n.tool = null; n.hold = null; if (g.t < g.max) continue; p.grace = null; p.act = null; if (g.talk) p.lock = true; else p.skip = { x: fx, y: fy }; }
    }
    if (p.lock) continue;
    let tg = itGate(n, lifeAct(n, p, fx, fy, dx, dy) || targetAt(n, fx, fy), walkable(fx, fy));
    // auto tools: a plot that needs work is worked only when you start from rest beside it (or keep going inside a field); walking over a field on your way somewhere never ploughs it
    if (IT_AUTO && !itBuildOn(n) && tg && tg.key && /^crop/.test(tg.key) && !p.fresh) tg = null;   // the thing in your hand must fit the action (player/items.ts)
    let occ = tileOwner.get(tkey(fx, fy)), pushed = false;
    // Push mode: people are pushed like furniture (they move one tile, or you swap places); it is harmless, not a crime
    if (itHand(n, 'push') && occ && occ !== n && !occ.infant) { pushed = true; if (!tg) occ = null; }   // (a person is a piece in the line: lifeAct has pushed them, or said why not)
    if (occ && occ !== n && !occ.infant && !pushed) {
      if (occ.pose === 'sleep') tg = { msg: occ.first + ' is asleep.' };
      else if (!itTalking(n)) tg = { msg: occ.first + ': ' + itWant(n, 'talk') };
      else if (occ.shop && occ.shop.serving && Math.abs(occ.shop.front.x - n.tx) + Math.abs(occ.shop.front.y - n.ty) <= 1.5) tg = { key: 'stall' + occ.id, min: 0.8, text: 'Stepping up to the larder', tool: null, run(n) { if (typeof openShop === 'function') openShop(occ.shop); } };
      else tg = { key: 'talk' + occ.id, min: 2, text: 'Talking to ' + occ.first, tool: null, run(n) { if (typeof openTalk === 'function' && occ.age >= 3) openTalk(occ); else if (!bumpTalk(n, occ, true)) playerSay(n, occ.first + ' nods and carries on.'); } };
    }
    if (occ && occ !== n && !occ.infant && !pushed && itTalking(n)) tg = lf2PersonAct(n, p, occ, tg) || tg;
    if (p.skip && (p.skip.x !== fx || p.skip.y !== fy)) p.skip = null;
    if (p.skip && tg && tg.key && !occ) tg = null;
    if (tg && tg.key) {
      if (!p.act || p.act.key !== tg.key) { p.act = Object.assign({ t: 0 }, tg); if (/^talk/.test(tg.key) && occ) { occ.talkUntil = Math.max(occ.talkUntil || 0, game.time + tg.min + 2 * gmPerSec()); faceTo(occ, n); if (occ.moving) occ.pose = 'stand'; } }
      p.act.t += step; applyPlayerAct(n, p.act);
      if (p.act.t >= p.act.min) {
        const a = p.act; playerFinish(n, a); n.tool = null; n.hold = null;
        if (!p.sleeping) { const nt = targetAt(n, fx, fy); if (!(nt && nt.key === a.key && a.repeat)) { /* bar stays full for a beat: let go to stay, keep holding to move on */ p.grace = { t: 0, max: 0.3 * (typeof state !== 'undefined' ? state.rate * state.speed : 2), x: fx, y: fy, talk: /^talk/.test(a.key) }; p.act = Object.assign({}, a, { t: a.min, done: true }); } }
      }
      continue;
    }
    if (p.act) p.act = null;
    if (tg && tg.msg) { if (clk() - p.msgAt > 40 || p.msg !== tg.msg) playerSay(n, tg.msg); p.lock = true; n.pose = 'stand'; continue; }
    if (walkable(fx, fy) && !(typeof noStep === 'function' && noStep(fx, fy))) { if (grid[fy][fx] !== T.CROP) p.fresh = false; p.skip = null; n.path = [{ x: fx, y: fy }]; n.moving = true; n.t = 0; n.pose = 'walk'; n.tool = null; n.hold = null; n.status = 'Walking'; stepNpc(n, step); }
    else { n.pose = 'stand'; n.tool = null; }
  }
}
function playerCarryFx(n) { n.carry = n.pose === 'walk' ? carryIcon(n) : null; }
function applyPlayerAct(n, a) { n.pose = a.tool ? 'work' : 'stand'; n.tool = a.tool || null; n.hold = a.hold || null; n.status = a.text; }

/* rest day afternoons are for resting: Tipping downs tools like everyone else */
const REST_NO = ['It is the rest day. The wood can wait until tomorrow.', 'Rest day! Not lifting a finger till morning.', 'No work on the rest day. Even the priest says so.', 'Tomorrow. Today I rest.'];
function targetAt(n, x, y): any {
  const t = targetAt0(n, x, y);
  if (t && t.key && /^(tree|rock|crop|wall|throw)/.test(t.key) && isRestDay() && game.time % 1440 >= 720) return { msg: REST_NO[Math.floor(game.time / 30) % REST_NO.length] };
  return t;
}

/** wood and stone go straight into the bag, without limit */
function bagGet(n, k) { n.inv[k] = (n.inv[k] || 0) + 1; if (n.player) playerSay(n, k === 'wood' ? '+1 wood' : '+1 stone'); }
/* (old) a felled tree leaves a log and a broken boulder leaves a stone on the ground: step onto it to pick it up */
function dropAt(x, y, k) { (town.drops = town.drops || []).push({ x, y, k, rt: typeof performance !== 'undefined' ? performance.now() : 0 }); }
function pickUpDrops(n) {
  const ds = town.drops; if (!ds || !ds.length) return;
  const i = ds.findIndex(d => d.x === n.tx && d.y === n.ty); if (i < 0) return;
  const p = n.player;
  const d = ds.splice(i, 1)[0]; n.inv[d.k] = (n.inv[d.k] || 0) + 1; p.fullAt = null;
  playerSay(n, d.k === 'wood' ? '+1 wood' : '+1 stone');
}

