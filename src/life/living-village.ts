/* ================= A living village: needs, mood, privies, pushing, friends, jobs =================
   Everyone has needs (food, bladder, rest, company, fun); how those are doing, and what has happened to them lately, makes up
   their mood; mood drives what they choose to do. Things can be pushed about, doors can be blocked, friends organise things. */
const LF = { seeThru: false };
const LF_ART = { crate: 'crate', crate1: 'crate_1', barrel: 'barrel_o', stool: 'stool' };
const LF_NOUN = { crate: 'crate', crate1: 'crate', barrel: 'barrel', stool: 'stool' };
const LF_JOBN = { Fisher: 'fishing', Farmer: 'farming', Gatherer: 'foraging', Woodcutter: 'woodcutting', Stonecutter: 'stonecutting' };
const lfR = n => (n && n.rand) ? n.rand() : Math.random();
const lfDay = () => Math.floor(game.time / 1440);
const lfDist = (a, b) => Math.abs(a.tx - b.tx) + Math.abs(a.ty - b.ty);
const lfPrivyNames = ['The Necessary', 'The Throne Room', 'The Quiet Room', 'The Long Drop', 'Privy Council', 'Pit Stop', 'The Thinking Hut', 'Mossy Seat'];
let lfPrivyI = 0;
const lfPrivyName = () => lfPrivyNames[(lfPrivyI++) % lfPrivyNames.length];
const lfList = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : (a[0] || '');
function lfShout(n, text) { if (n.player) playerSay(n, text); else say(n, n, [[n, text]], true); }
function lfMod(n, id, text, v, dur) { n.mods = (n.mods || []).filter(m => m.id !== id); n.mods.push({ id, text, v, t0: game.time, dur: dur || 600 }); }
function lfModSum(n) { let s = 0; for (const m of n.mods || []) { const k = 1 - (game.time - m.t0) / m.dur; if (k > 0) s += m.v * k; } return Math.max(-60, Math.min(40, s)); }
function lfAff(a, b, v) { a.aff[b.id] = Math.max(-100, Math.min(100, (a.aff[b.id] || 0) + v)); relabel(a, b); }
const lfMoodWord = m => m >= 80 ? 'Delighted' : m >= 62 ? 'Happy' : m >= 45 ? 'Fine' : m >= 30 ? 'Low' : m >= 15 ? 'Miserable' : 'Despairing';

/* ---------------- needs and mood ---------------- */
function lifeInit(n) {
  n.bladder = 8 + lfR(n) * 40; n.energy = 70 + lfR(n) * 30; n.fun = 45 + lfR(n) * 40; n.mood = 64; n.mods = []; n.trapped = null; n._h = n.hunger; n._s = n.social;
  n.tidy = ((n.id * 2654435761) >>> 0) % 3 === 0; n.jobSat = 60;
  if (n.age >= 16 && n.age < 60 && n.role === 'Worker' && !n.job) n.job = lfFirstJob(n);
}
function lfFirstJob(n) {
  if (n.pref && LF_JOBN[n.pref] && lfR(n) < 0.8) return n.pref;
  const has = t => n.traits.includes(t), w = {
    Fisher: shoreTiles.length ? 1 + (has('dreamy') || has('shy') || has('anxious') ? 1.5 : 0) : 0.01, Farmer: 1 + (has('early bird') || has('homebody') || has('devout') ? 1.5 : 0),
    Gatherer: 1 + (has('curious') || has('generous') || has('cheerful') ? 1.5 : 0), Woodcutter: 0.8 + (has('brave') || has('proud') || has('grumpy') ? 1.5 : 0), Stonecutter: 0.5 + (has('brave') || has('greedy') ? 1 : 0) };
  return wpick(rng(town.seed + n.id * 313), w);
}
function lifeTick(dt) {
  if (!town.props) lfInitProps();
  const day = lfDay();
  for (const n of npcs.slice()) {
    if (n.infant || n.dead || n.bladder === undefined || n.inShip) continue;
    if (n.age < 4) { n.bladder = 0; continue; }
    const asleep = n.pose === 'sleep', st = n.plan && n.plan[n.si], busy = st && st.k === 'wait' && n.stepStarted && !n.moving;
    // eating fills the bladder; company lifts the spirits
    if (n.hunger < n._h - 4) n.bladder += (n._h - n.hunger) * 0.2; n._h = n.hunger;
    if (n.social > n._s + 4) n.fun = Math.min(100, n.fun + (n.social - n._s) * 0.8); n._s = n.social;
    n.bladder = Math.min(100, n.bladder + dt * (asleep ? 0.07 : 0.17));
    n.energy = asleep ? Math.min(100, n.energy + dt * 0.21) : Math.max(0, n.energy - dt * 0.06);
    n.fun = Math.max(0, n.fun - dt * 0.039);
    if (busy && st.act === 'leisure' && !asleep) n.fun = Math.min(100, n.fun + dt * 0.12);
    // mood: the needs, weighted towards the worst of them, plus what has happened lately
    const needs = [100 - n.hunger, 100 - n.bladder, Math.min(100, n.energy + 20), n.social, n.fun], mean = needs.reduce((a, b) => a + b, 0) / 5, mn = Math.min(...needs);
    const bias = (n.traits.includes('cheerful') ? 6 : 0) + (n.traits.includes('jovial') ? 4 : 0) - (n.traits.includes('grumpy') ? 6 : 0) - (n.traits.includes('anxious') ? 3 : 0);
    const target = Math.max(0, Math.min(100, 0.55 * mean + 0.45 * mn + lfModSum(n) + bias));
    n.mood += (target - n.mood) * Math.min(1, dt / 70);
    if (n.mods.length && n.mods.some(m => game.time - m.t0 > m.dur)) n.mods = n.mods.filter(m => game.time - m.t0 <= m.dur);
    // satisfaction with the work they do
    if (busy && st.act === 'work' && !st.social) n.jobSat = Math.max(0, Math.min(100, n.jobSat + (n.mood - 50) * dt / 1000));
    // starving takes a day or so of being completely empty
    if (n.starving > 1200 && npcs.length > 2) { die(n, 'hunger'); continue; }
    if (n.starving > 5 && !n.lfHungerSaid) { n.lfHungerSaid = true; lfShout(n, 'I am so hungry...'); }
    if (n.starving < 1) n.lfHungerSaid = false;
    // the bladder has the last word
    if (n.bladder >= 100 && !(st && st.priv && n.stepStarted)) { lfAccident(n); continue; }
    if (n.player) { if (n.bladder >= 72 && clk() - (n.player.wcAt || -1e9) > 120) { n.player.wcAt = clk(); playerSay(n, 'I really need a privy. Walk into the seat inside one.'); } }
    else {
      if (asleep) { if (n.bladder >= 85 && n.lfNight !== day) { n.lfNight = day; abortPlan(n); } }
      else if (n.bladder >= (n.hunger >= 85 ? 92 : 70) && (n.lfCool || 0) < game.time && !(st && (st.priv || st.act === 'sleep')) && !(st && st.act === 'eat' && n.bladder < 82) && !(n.talkUntil > game.time) && (!eventsBusy() || n.bladder >= 94)) { n.lfCool = game.time + 20; abortPlan(n); }
    }
    if (n.trapped) lfTrapTick(n, dt);
    else if (!asleep && game.time >= (n.lfConf || 0) && !n.moving) {            // shut in without ever having tried the door? (people who only want a privy never walk anywhere)
      n.lfConf = game.time + 8 + (n.id % 5);
      const sd = town.yard && town.yard.stand;
      if (sd && town.props.length && !lfReachSet()[n.ty * W + n.tx] && !findPath(n.tx, n.ty, sd.x, sd.y)) lifeNoPath(n, sd);
    }
  }
  lfBtnSync();
}
function lfAccident(n) {
  const bed = n.pose === 'sleep';
  n.bladder = 12; lfMod(n, 'accident', bed ? 'wet the bed' : 'did not make it to the privy', bed ? -20 : -34, 1800);
  (town.puddles = town.puddles || []).push({ x: Math.round(n.x), y: Math.round(n.y), t: game.time });
  if (town.puddles.length > 40) town.puddles.shift();
  addMem(n, 'shame', bed ? 'the night I wet the bed' : 'the day I did not make it to the privy', null, null);
  if (n.player) playerSay(n, 'Oh no. Oh no no no.');
  else if (!bed) lfShout(n, anyOf(['Oh no. Oh no no no.', 'Nobody saw that. Nobody saw that.', 'Not again!', 'Well. That is that.']));
  if (bed) return;
  let seen = 0;
  for (const o of npcs) {
    if (o === n || o.dead || o.infant || o.pose === 'sleep' || lfDist(o, n) > 7) continue; seen++;
    const af = o.aff[n.id] || 0;
    if (af < -10) { lfAff(n, o, -3); lfMod(o, 'laugh' + n.id, 'saw ' + n.first + ' wet themselves', 6, 400); if (!o.player && Math.random() < 0.5) lfShout(o, anyOf(['Ha!', 'Hehehe.', 'Oh, that is priceless.'])); }
    else { lfMod(o, 'pity' + n.id, 'felt for ' + n.first, -3, 300); if (af >= 20 && Math.random() < 0.3) lfAff(n, o, 2); }
    addMem(o, 'saw', `the day I saw ${n.first} not make it to the privy`, null, n.id);
  }
  if (seen > 1 || Math.random() < 0.4) chron(`${nameOf(n)} did not make it to the privy in time${seen > 1 ? ', in front of ' + seen + ' people' : ''}.`, 'life');
}

/* ---------------- privies ---------------- */
const lfPrivies = () => rooms.filter(r => r.kind === 'privy' && !r.dead && r.toilet);
function lfPrivyFor(n) {
  const list = lfPrivies().map(r => ({ r, d: Math.abs(r.toilet.x - n.tx) + Math.abs(r.toilet.y - n.ty) + ((r.user && r.user !== n.id && game.time < r.until) ? 16 : 0) })).sort((a, b) => a.d - b.d);
  for (const e of list.slice(0, 3)) if (findPath(n.tx, n.ty, e.r.toilet.x, e.r.toilet.y)) return e.r;
  return null;
}
function toiletPlan(n) {
  const r = lfPrivyFor(n); if (!r) return bushPlan(n);
  r.user = n.id; r.until = game.time + 18;
  return [goS({ x: r.toilet.x, y: r.toilet.y, face: r.toilet.face, sit: true }, 'Heading for ' + r.name),
    waitS(3 + lfR(n) * 3, 'leisure', 'Using the privy', { priv: true, nopie: true, onEnd(nn) { nn.bladder = 0; lfMod(nn, 'relief', 'relieved', 5, 150); if (r.user === nn.id) r.user = null; } })];
}
function bushPlan(n) {
  const c = [];
  for (let k = 0; k < 90 && c.length < 6; k++) {
    const x = n.tx + Math.round((Math.random() - 0.5) * 20), y = n.ty + Math.round((Math.random() - 0.5) * 20);
    if (x < 2 || y < 2 || x >= W - 2 || y >= H - 2 || grid[y][x] !== T.GRASS || roomAt[y][x] >= 0 || !walkable(x, y) || !reach[y * W + x]) continue;
    if (DIRS.some(([dx, dy]) => grid[y + dy][x + dx] === T.TREE)) c.push({ x, y, face: { dx: 0, dy: 1 } });
  }
  c.sort((a, b) => Math.abs(a.x - n.tx) + Math.abs(a.y - n.ty) - Math.abs(b.x - n.tx) - Math.abs(b.y - n.ty));
  for (const p of c.slice(0, 3)) {
    if (!findPath(n.tx, n.ty, p.x, p.y)) continue;
    return [goS(p, 'Looking for somewhere private'), waitS(3, 'stand', 'Relieving themselves behind a tree', { priv: true, nopie: true, onEnd(nn) { nn.bladder = 0; lfMod(nn, 'bush', 'had to go behind a tree', -5, 600); } })];
  }
  return [waitS(2, 'stand', 'Hopping from foot to foot', { priv: true, nopie: true })];
}
function lfNightTrip(n, sl) {
  const tp = toiletPlan(n);
  return tp.concat(n.bed && n.bed.x != null ? [goS(n.bed, 'Back to bed'), waitS(Math.max(5, sl - 12), 'sleep', 'Sleeping')] : [waitS(Math.max(5, sl - 12), 'sleep', 'Sleeping')]);
}

/* ---------------- things to push ---------------- */
function lfInitProps() { town.props = []; town.propAt = new Map(); town.pblock = new Uint8Array(W * H); town.puddles = []; town.gath = []; }
/* everything that can be walked to from the village stand, remembered until something is pushed */
function lfFlood() {
  const st = town.yard.stand, seen = new Uint8Array(W * H), q = [st.y * W + st.x]; seen[q[0]] = 1;
  for (let i = 0; i < q.length; i++) {
    const k = q[i], x = k % W, y = (k / W) | 0;
    for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue; const nk = ny * W + nx; if (!seen[nk] && walkable(nx, ny)) { seen[nk] = 1; q.push(nk); } }
  }
  seen.count = q.length; return seen;
}
function lfReachSet() { if (!town.lfReach || town.lfReachV !== town.lfPV || game.time - (town.lfReachT || -1e9) > 30) { town.lfReach = lfFlood(); town.lfReachV = town.lfPV; town.lfReachT = game.time; } return town.lfReach; }
/* would shoving this leave part of the village cut off? (villagers never do that to each other; players may) */
function lfPushKeepsOpen(pr, dx, dy) {
  const c0 = lfFlood().count, a = pr.y * W + pr.x, b = (pr.y + dy) * W + pr.x + dx;
  town.pblock[a] = 0; town.pblock[b] = 1; const c1 = lfFlood().count; town.pblock[a] = 1; town.pblock[b] = 0;
  return c1 >= c0;
}
const lfPropAt = (x, y) => (town.propAt && town.propAt.get(y * W + x)) || null;
function lfAddProp(kind, x, y) {
  const pr = { id: (town.propId = (town.propId || 0) + 1), kind, x, y, home: { x, y }, st: 0, dur: 260, seen: [] };
  town.props.push(pr); town.propAt.set(y * W + x, pr); town.pblock[y * W + x] = 1; town.lfPV = (town.lfPV || 0) + 1; return pr;
}
function lfPushOK(pr, dx, dy) {
  const nx = pr.x + dx, ny = pr.y + dy; if (nx < 2 || ny < 2 || nx >= W - 2 || ny >= H - 2) return false;
  if (!walkable(nx, ny) || tileOwner.get(ny * W + nx)) return false;
  const rm = roomAt[ny][nx];                                       // things slide about inside a room, but never through its door or onto the doorstep
  if (rm >= 0) { if (roomAt[pr.y][pr.x] !== rm) return false; const r = rooms[rm]; if (r.doorX != null && nx === r.doorX && (ny === r.doorY || ny === r.doorY + (r.side === 'b' ? -1 : 1))) return false; }
  const g = grid[ny][nx];
  if (g === T.SEAT || g === T.BED || g === T.PEW || g === T.CROP || g === T.PLOT || g === T.TENT) return false;
  if (town.siteAt[ny * W + nx] || noStep(nx, ny)) return false;
  if ((town.stalls || []).some(s => s.front.x === nx && s.front.y === ny)) return false;
  const y = town.yard; if (y && Math.abs(nx - y.x) <= 1 && ny >= y.y - 1 && ny <= y.y + 1) return false;
  return true;
}
function lfPush(pr, dx, dy, by) {
  if (!lfPushOK(pr, dx, dy)) return false;
  town.pblock[pr.y * W + pr.x] = 0; town.propAt.delete(pr.y * W + pr.x);
  pr.fx = pr.x; pr.fy = pr.y; pr.x += dx; pr.y += dy; pr.st = performance.now(); pr.moved = game.time; pr.by = by ? by.id : null;
  town.pblock[pr.y * W + pr.x] = 1; town.propAt.set(pr.y * W + pr.x, pr); town.lfPV = (town.lfPV || 0) + 1;
  pr.seen = []; for (const o of npcs) if (o !== by && !o.dead && !o.infant && o.pose !== 'sleep' && Math.abs(o.tx - pr.x) + Math.abs(o.ty - pr.y) <= 10) pr.seen.push(o.id);
  return true;
}
/* the tile in front of a door (and the two beside it) is never where the village leaves things: only a player seals a door */
function lfNearDoor(x, y) {
  for (const r of rooms) { if (r.dead || r.doorX == null) continue; const fy = r.side === 'b' ? r.doorY + 1 : r.doorY - 1; if (y === fy && Math.abs(x - r.doorX) <= 1) return true; }
  return false;
}
function lfPlaceProps() {
  const free = (x, y) => !lfNearDoor(x, y) && x > 2 && y > 2 && x < W - 3 && y < H - 3 && grid[y][x] === T.GRASS && roomAt[y][x] < 0 && !town.siteAt[y * W + x] && !town.nodeMap.has(y * W + x) && !lfPropAt(x, y) && walkable(x, y);
  const near = (x, y, kind) => { for (const d of [0, 1, -1, 2, -2]) for (const e of [0, 1, -1]) { if (free(x + d, y + e)) { lfAddProp(kind, x + d, y + e); return true; } } return false; };
  for (const r of rooms) {
    if (r.dead) continue;
    const fy = r.side === 'b' ? r.doorY + 1 : r.doorY - 1;
    if (r.kind === 'house' || r.kind === 'tavern') {
      near(r.doorX - 3, fy, 'crate'); near(r.doorX + 3, fy, r.kind === 'tavern' ? 'stool' : 'barrel');
      if (r.kind === 'tavern') near(r.doorX + 4, fy, 'stool');
      const R = rng(town.seed + r.x * 31 + r.y), cand = [];
      for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) if (grid[y][x] === T.FLOOR && Math.abs(x - r.doorX) >= 2 && !lfPropAt(x, y)) cand.push({ x, y });
      if (cand.length) { const c = cand[Math.floor(R() * cand.length)]; lfAddProp('stool', c.x, c.y); }
    }
    if (r.kind === 'privy') near(r.doorX + 2, fy, 'barrel');
  }
  const cx = town.cx, cy = town.cy;
  for (const [dx, dy, k] of [[-8, 3, 'crate1'], [8, 3, 'crate'], [-4, -7, 'barrel'], [7, -5, 'crate'], [2, 9, 'stool']]) { const x = cx + dx, y = cy + dy; if (grid[y] && (grid[y][x] === T.PATH || grid[y][x] === T.GRASS) && roomAt[y][x] < 0 && walkable(x, y) && !lfPropAt(x, y) && !town.siteAt[y * W + x] && !lfNearDoor(x, y)) lfAddProp(k, x, y); }
}
/* the game opens with you on your own doorstep, looking at the village, not in the dark of a bedroom */
function lifeStepOutside(n) {
  const r = n.homeRoom; if (!r || r.doorX == null) return;
  const fy = r.side === 'b' ? r.doorY + 1 : r.doorY - 1, dy2 = r.side === 'b' ? 1 : -1;
  for (const [x, y] of [[r.doorX, fy + dy2], [r.doorX + 1, fy + dy2], [r.doorX - 1, fy + dy2], [r.doorX, fy + 2 * dy2], [r.doorX + 2, fy + dy2]]) {
    if (!walkable(x, y) || roomAt[y][x] >= 0 || lfPropAt(x, y) || tileOwner.get(y * W + x)) continue;
    abortPlan(n); n.tx = x; n.ty = y; n.x = x; n.y = y; n.path = []; n.moving = false; n.pose = 'stand'; n.face = { dx: 0, dy: -dy2 }; rebuildOcc(); return;
  }
}
/* which pushed thing stands between this person and where they want to be? (the one that, taken away, opens the way) */
function lfBlocker(n, gx, gy) {
  let q; LF.seeThru = true; try { q = findPath(n.tx, n.ty, gx, gy); } finally { LF.seeThru = false; }
  if (!q || !q.length) return null;
  const ps = []; for (const t of q) { const p = lfPropAt(t.x, t.y); if (p && !ps.includes(p)) ps.push(p); }
  if (!ps.length) return null;
  for (const p of ps.slice(0, 4)) { town.pblock[p.y * W + p.x] = 0; const ok = findPath(n.tx, n.ty, gx, gy) !== null; town.pblock[p.y * W + p.x] = 1; if (ok) return p; }
  return ps[0];
}
/* goTo found no way. If a pushed thing is the reason, the person is stuck, not teleported out */
function lifeNoPath(n, spot) {
  if (!town.props || !town.props.length) return false;
  const pr = lfBlocker(n, spot.x, spot.y); if (!pr) return false;
  const st = town.yard.stand;
  if (findPath(n.tx, n.ty, st.x, st.y)) {                         // can still get about, just not there
    lfMod(n, 'blocked', 'found the way blocked', -5, 150);
    if (game.time >= (n.lfBlk || 0)) { n.lfBlk = game.time + 90; lfShout(n, anyOf(['Who put that there?', 'Something is in the way.', 'Really? Right there?'])); }
    return true;
  }
  if (!n.trapped) {
    const by = pr.by != null && game.time - (pr.moved || -1e9) < 240 ? byId(pr.by) : null;
    const known = by && by !== n && ((pr.seen || []).includes(n.id) || (pr.seen || []).some(id => { const o = byId(id); return o && (o.aff[n.id] || 0) >= 15; }));
    n.trapped = { since: game.time, prop: pr, nextShout: game.time + 4, shouts: 0, laughed: {}, cause: known ? by.id : null, chk: game.time + 3 };
    lfShout(n, anyOf(['Hello? Something is in the way!', 'The way is blocked!', 'Who put that there?']));
    addMem(n, 'stuck', 'the day I was shut in by something in the way', null, null);
  }
  n.trapped.prop = pr; return true;
}
function lfFreed(n) {
  const t = n.trapped; if (!t) return false;
  const st = town.yard.stand; if (!findPath(n.tx, n.ty, st.x, st.y)) return false;
  n.trapped = null;
  const mins = game.time - t.since, pr = t.prop;
  lfMod(n, 'shutin', 'was shut in', -10, 500);
  const by = pr && pr.by != null && game.time - (pr.moved || -1e9) < 60 ? byId(pr.by) : null, cause = t.cause != null ? byId(t.cause) : null;
  if (mins > 30 && cause && !cause.dead) {
    lfAff(n, cause, -Math.min(25, 4 + mins / 12)); lfMod(n, 'blame', 'furious with ' + cause.first, -Math.min(14, 4 + mins / 40), 900);
    addMem(n, 'blame', `the day ${cause.first} shut me in`, `when you shut me in`, cause.id);
  }
  if (mins > 30 && by && by !== n && !by.dead) {
    lfAff(n, by, by.player ? 8 : 9); lfMod(n, 'thanks', 'let out by ' + by.first, 10, 900);
    addMem(n, 'rescue', `the day ${by.first} let me out when I was stuck`, `when you got me out`, by.id); addMem(by, 'rescue', `the day I got ${n.first} out`, null, n.id);
    if (!n.player) lfShout(n, anyOf(['Thank goodness! Thank you!', 'I thought I would be in there forever.', 'You are a lifesaver.']));
  }
  if (mins > 40) chron(`${nameOf(n)} was stuck for ${mins > 90 ? Math.round(mins / 60) + ' hours' : Math.round(mins) + ' minutes'}${by && by !== n ? ' until ' + by.first + ' got ' + (n.female ? 'her' : 'him') + ' out' : ''}${cause && !cause.dead ? ', and blames ' + cause.first : ''}.`, 'life');
  return true;
}
function lfTrapTick(n, dt) {
  const t = n.trapped; if (!t) return;
  if (game.time >= t.chk) { t.chk = game.time + 3; if (lfFreed(n)) return; }
  const mins = game.time - t.since;
  if (n.pose !== 'sleep') t.aw = (t.aw || 0) + dt;
  if (t.aw > 400 && t.prop && !lfPushDirs(t.prop).length && game.time >= (t.hauled || 0)) { t.hauled = game.time + 60; lfHaul(n); }   // nobody can budge it: the street sorts it out in the end
  lfMod(n, 'trapped', 'shut in', -Math.min(34, 10 + mins / 25), 90);
  if (n.player) return;
  t.text = mins < 60 ? 'Stuck! Something is blocking the way' : 'Shut in for hours, getting desperate';
  if (n.status !== t.text && n.pose !== 'sleep') { n.status = t.text; logStep(n, t.text); }
  if (game.time >= t.nextShout && n.pose !== 'sleep') {
    t.nextShout = game.time + 20 + lfR(n) * 12; t.shouts++;
    lfShout(n, anyOf(t.shouts < 3 ? ['Hello? Is anybody there?', 'Help! The way is blocked!', 'Somebody! Please!'] : t.shouts < 8 ? ['I am stuck in here!', 'Anyone? Anyone at all?', 'This is not funny any more!'] : ['I am so hungry...', 'Please... somebody...', 'Is this how it ends? Stuck?']));
    lfCallHelp(n);
  }
}
function lfCallHelp(v) {
  const t = v.trapped, now = game.time, tod = now % 1440; const cands = [];
  if ((t.helper || 0) > now) return;                                // somebody is already on their way
  for (const o of npcs) {
    if (o === v || o.dead || o.infant || o.player || o.age < 10 || o.trapped || o.pose === 'sleep' || !isAwake(o, tod) || lfDist(o, v) > 18 || o.hunger > 88 || o.mourning || (o.outUntil || 0) > now) continue;
    const af = o.aff[v.id] || 0;
    if (af < -15) { if (!t.laughed[o.id]) { t.laughed[o.id] = 1; if (lfDist(o, v) < 14) lfShout(o, anyOf(['Ha! Serves you right.', 'Oh dear. What a shame.', 'I did not hear anything.'])); addMem(o, 'laugh', `the day ${v.first} got stuck and I left them to it`, null, v.id); } continue; }
    let s = 0.2 + (af - 25) / 70 + (isKin(o, v) ? 0.3 : 0) + (o.traits.includes('generous') ? 0.15 : 0) - (o.traits.includes('lazy') ? 0.15 : 0) - (o.traits.includes('shy') ? 0.05 : 0) + Math.random() * 0.2;
    s -= lfDist(o, v) / 60; cands.push({ o, s });
  }
  cands.sort((a, b) => b.s - a.s);
  const thr = 0.3 - Math.max(0, now - t.since - 30) / 200;       // the longer it goes on, the more people feel they ought to
  for (const c of cands.slice(0, 6)) { if (c.s <= thr) break; if (lfRescue(c.o, v)) { t.helper = now + 22; break; } }
}
function lfPushDirs(pr) {
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => lfPushOK(pr, dx, dy) && walkable(pr.x - dx, pr.y - dy) && roomAt[pr.y - dy][pr.x - dx] < 0 && !tileOwner.get((pr.y - dy) * W + pr.x - dx));   // nobody can shove from inside a building
}
/* the one way a shut door stays shut for good: nobody can budge the thing. After a long while the neighbours drag it off between them */
function lfHaul(v) {
  const t = v.trapped, pr = t && t.prop; if (!pr || lfPropAt(pr.x, pr.y) !== pr) return;
  let best = null, bd = 99;
  for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
    const x = pr.x + dx, y = pr.y + dy; if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3 || roomAt[y][x] >= 0 || lfPropAt(x, y) || !walkable(x, y) || tileOwner.get(y * W + x) || town.siteAt[y * W + x] || noStep(x, y) || lfNearDoor(x, y)) continue;
    const g = grid[y][x]; if (g !== T.GRASS && g !== T.PATH) continue;
    const d = Math.abs(dx) + Math.abs(dy); if (d < bd) { bd = d; best = { x, y }; }
  }
  if (!best) return;
  town.pblock[pr.y * W + pr.x] = 0; town.propAt.delete(pr.y * W + pr.x);
  pr.fx = pr.x; pr.fy = pr.y; pr.x = best.x; pr.y = best.y; pr.st = performance.now(); pr.moved = game.time; pr.by = null; pr.seen = [];
  town.pblock[pr.y * W + pr.x] = 1; town.propAt.set(pr.y * W + pr.x, pr); town.lfPV = (town.lfPV || 0) + 1;
  chron(`The neighbours finally dragged the ${LF_NOUN[pr.kind]} away from ${nameOf(v)}'s door.`, 'note');
}
function lfRescue(h, v) {
  const t = v.trapped; if (!t || !t.prop) return false;
  const pr = t.prop, st = town.yard.stand;
  if (lfPropAt(pr.x, pr.y) !== pr) return false;
  const dirs = lfPushDirs(pr);
  let pick = null; const opens = [];
  for (const [dx, dy] of dirs) {                                    // prefer a push that really opens the way
    if (!findPath(h.tx, h.ty, pr.x - dx, pr.y - dy)) continue;
    town.pblock[pr.y * W + pr.x] = 0; town.pblock[(pr.y + dy) * W + pr.x + dx] = 1;
    const open = findPath(v.tx, v.ty, st.x, st.y) !== null;
    town.pblock[(pr.y + dy) * W + pr.x + dx] = 0; town.pblock[pr.y * W + pr.x] = 1;
    if (open) opens.push([dx, dy]); else if (!pick) pick = [dx, dy];
  }
  if (opens.length) pick = opens[Math.floor(Math.random() * opens.length)];
  if (!pick) return false;
  const [dx, dy] = pick, label = LF_NOUN[pr.kind];
  lfShout(h, anyOf(['Hold on, I am coming!', 'I hear you! Hang on!', 'Right, let me see what is in the way...']));
  recruit(h, [goS({ x: pr.x - dx, y: pr.y - dy, face: { dx, dy } }, `Going to help ${v.first}`), waitS(1, 'work', `Shoving the ${label} out of the way`, { nopie: true, social: true, onEnd(nn) { if (lfPropAt(pr.x, pr.y) === pr && !lfPush(pr, dx, dy, nn)) t.helper = 0; } })], game.time + 25);   // it would not go: let the next call try another way
  return true;
}
function lfTidyPlan(n) {
  let best = null, bd = 99;
  for (const pr of town.props || []) { if (pr.x === pr.home.x && pr.y === pr.home.y) continue; const d = Math.abs(pr.x - n.tx) + Math.abs(pr.y - n.ty); if (d < bd && d <= 18) { bd = d; best = pr; } }
  if (!best) return null;
  const pr = best, ax = pr.home.x - pr.x, ay = pr.home.y - pr.y;
  const order = Math.abs(ax) >= Math.abs(ay) ? [[Math.sign(ax), 0], [0, Math.sign(ay)]] : [[0, Math.sign(ay)], [Math.sign(ax), 0]];
  for (const [dx, dy] of order) {
    if (!dx && !dy) continue; if (!lfPushOK(pr, dx, dy) || !lfPushKeepsOpen(pr, dx, dy)) continue; const sx = pr.x - dx, sy = pr.y - dy; if (!walkable(sx, sy) || roomAt[sy][sx] >= 0 || !findPath(n.tx, n.ty, sx, sy)) continue;
    const label = LF_NOUN[pr.kind];
    return [goS({ x: sx, y: sy, face: { dx, dy } }, `Putting the ${label} back where it belongs`), waitS(1, 'work', `Putting the ${label} back where it belongs`, { nopie: true, onEnd(nn) { if (lfPropAt(pr.x, pr.y) === pr && lfPush(pr, dx, dy, nn) && Math.random() < 0.3) lfShout(nn, anyOf(['Who keeps moving this?', 'Honestly. Things do not walk by themselves.', 'There. Better.'])); } })];
  }
  return null;
}

