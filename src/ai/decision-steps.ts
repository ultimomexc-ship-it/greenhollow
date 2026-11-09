/* ---------- the decision ---------- */
function decide(n) {
  const tod = game.time % 1440;
  { const pp = lf2PreDecide(n, tod); if (pp) return pp; }
  const myParty = !n.player && typeof activeParty === 'function' && activeParty();
  if (myParty && myParty.who === n.id) { const bp = partyPlan(n, tod); if (bp) return bp; }
  if (!n.player && typeof lateNight === 'function' && lateNight() && !isAwake(n, tod)) {
    const ev = funeralPlan(n, tod) || weddingPlan(n, tod) || partyPlan(n, tod) || feastPlan(n, tod); if (ev) return ev;
  }
  if (!isAwake(n, tod)) {
    const sl = (n.wake - tod + 1440) % 1440 || 1;
    if (n.bladder >= 85 && !n.player) return lfNightTrip(n, sl);
    if (n.hunger >= 45 && n.bedEat !== Math.floor(game.time / 1440)) { n.bedEat = Math.floor(game.time / 1440); const ep = eatPlan(n); if (ep) return ep; }
    if (n.bed && n.bed.x != null) return [goS(n.bed, 'Heading to bed'), waitS(sl, 'sleep', 'Sleeping')];
    const tn = claimTent(n);
    if (tn) return [goS({ x: tn.x, y: tn.y, face: null }, 'Heading to a tent'), waitS(sl, 'sleep', 'Sleeping in a tent')];
    return [goS(() => floorSpot(null, n), 'Bedding down by the square'), waitS(sl, 'sleep', 'Sleeping')];
  }
  if (n.mourning && !town.funeral) n.mourning = null;
  if (n.tag && n.tag.until > game.time && isAwake(n, tod) && n.hunger < 80) { const pl = byId(n.tag.p); if (pl && pl.player && !pl.dead) { const t = n.tag;
    // once they have reached you and had their moment, they let you get on with things (nobody stays glued to you)
    if (Math.abs(pl.tx - n.tx) + Math.abs(pl.ty - n.ty) <= 2) t.near = t.near || game.time; if (t.near && game.time - t.near > 10) { /* had their moment: falls through, and the tag is cleared below */ } else return [goS(nn => { const b = besideTile(pl.tx, pl.ty, null); return b ? { x: b.x, y: b.y, face: { dx: Math.sign(pl.tx - b.x), dy: Math.sign(pl.ty - b.y) } } : null; }, t.text), waitS(2, 'stand', t.text, { social: true, nopie: true })]; } n.tag = null; }
  const fp = funeralPlan(n, tod); if (fp) return fp;
  const wp = weddingPlan(n, tod); if (wp) return wp;
  const bp = partyPlan(n, tod); if (bp) return bp;
  const fe = feastPlan(n, tod); if (fe) return fe;
  if (n.bladder >= (n.hunger >= 85 ? 92 : 75) && !n.player && n.age >= 4 && !n.trapped) return toiletPlan(n);
  const h = tod / 60, meal = (h >= 7 && h < 9) || (h >= 12 && h < 14) || (h >= 18 && h < 20);
  const fm = familyMealPlan(n, tod); if (fm && n.hunger < 80) return fm;
  if (n.hunger >= 55 || (meal && n.hunger >= 38)) { const p = eatPlan(n); if (p) return p; }
  { const lp = lifeDecide(n, tod) || lf2Decide(n, tod); if (lp) return lp; }
  const needs = needsPlan(n); if (needs) return needs;
  if (n.age >= 5 && n.social < 45 && game.time >= (n.chatCool || 0)) { n.chatCool = game.time + 140 + n.rand() * 100; const cp = chatPlan(n); if (cp) return cp; }
  if (working(n, tod)) {
    if (n.traits.includes('lazy') && n.role === 'Worker' && Math.random() < 0.1) return [waitS(25, 'leisure', 'Taking a long break. A very long break.')];
    const p = lf2Work0(n, tod) || lf2Slow(n, workPlan(n, tod)); if (p) return p;
  }
  const sp = socialPlan(n, tod); if (sp) return sp;
  return leisurePlan(n, tod);
}
function newPlan(n) {
  release(n);
  let p = decide(n);
  if (!p || !p.some(s => s.k === 'wait')) p = (p || []).concat([waitS(8, 'leisure', 'Thinking things over')]);
  if (!n.player && !n.infant && p[0] && p[0].k === 'go' && p[p.length - 1].act !== 'sleep' && !p.some(s => s.priv) && Math.random() < 0.22) p.unshift(waitS(4 + Math.random() * 7, 'stand', anyOf(['Catching their breath', 'Stretching a stiff back', 'Gazing at the sky', 'Pausing for a moment']), { nopie: true }));
  n.plan = p; n.si = 0; n.stepStarted = false; n.roaming = false;
}
// a tree falling or a boulder splitting: remembered for a moment so it can be drawn
function workFx(k, x, y, n) { (town.fx = town.fx || []).push({ k, x, y, dir: n && n.tx < x ? 1 : n && n.tx > x ? -1 : (Math.random() < 0.5 ? 1 : -1), rt: typeof performance !== 'undefined' ? performance.now() : 0 }); if (town.fx.length > 30) town.fx.shift(); }
function abortPlan(n) { n.plan = null; n.si = 0; n.stepStarted = false; n.roaming = false; n.moving = false; n.path = []; n.t = 0; n.x = n.tx; n.y = n.ty; }

/* ---------- running steps ---------- */
function logStep(n, text) { if (n.log.length && n.log[n.log.length - 1].text === text) return; n.log.push({ t: game.time, text }); if (n.log.length > 40) n.log.shift(); }
function poseOf(n, s) {
  if (s.act === 'sleep') return 'sleep';
  if (s.act === 'pray') return 'stand';
  if (n.spot && n.spot.sit) return 'sit';
  return s.act === 'work' ? 'work' : 'stand';
}
function applyWait(n, s) {
  n.pose = poseOf(n, s); n.hold = s.hold || null; n.tool = s.tool || null; n.status = s.text;
  if (n.spot && n.spot.face) n.face = n.spot.face;
}
function arrive(n) { n.moving = false; n.path = []; n.t = 0; n.x = n.tx; n.y = n.ty; if (n.spot && n.spot.face) n.face = n.spot.face; }
function unstick(n) {
  const seen = new Set([n.ty * W + n.tx]), q = [[n.tx, n.ty]];
  for (let h = 0; h < q.length && h < 400; h++) {
    const [x, y] = q[h];
    for (const [dx, dy] of DIRS) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(ny * W + nx)) continue; seen.add(ny * W + nx); if (walkable(nx, ny) && roomAt[ny][nx] < 0 && reach[ny * W + nx]) { n.tx = nx; n.ty = ny; n.x = nx; n.y = ny; n.path = []; n.moving = false; return; } q.push([nx, ny]); }
  }
}
function goTo(n, spot, text) {
  n.spot = spot;
  if (!walkable(n.tx, n.ty)) unstick(n);
  const p = findPath(n.tx, n.ty, spot.x, spot.y);
  if (!p) { if (lifeNoPath(n, spot)) return false; game.failures++; n.pf = (n.pf || 0) + 1; if (n.pf >= 3) { n.pf = 0; unstick(n); for (const [dx, dy] of DIRS) { const x = n.tx + dx, y = n.ty + dy; if (grid[y] && grid[y][x] === T.TREE && roomAt[y][x] < 0) { setT(x, y, T.GRASS); markDirty(x, y, 1, 1); town.treeDirty = true; town.treeCache = null; break; } } } return false; }
  n.pf = 0; n.path = p; n.status = text; logStep(n, text);
  if (!n.path.length) { arrive(n); return true; }
  n.moving = true; n.pose = 'walk'; n.hold = null; n.tool = null; return true;
}
/* ---------- people block each other: pause, then route around ---------- */
let tileOwner = new Map();
const tkey = (x, y) => y * W + x;
function rebuildOcc() {
  tileOwner = new Map();
  for (const o of npcs) { if (o.infant || o.dead) continue; tileOwner.set(tkey(o.tx, o.ty), o); if (o.moving && o.path && o.path[0] && o.t > 0) tileOwner.set(tkey(o.path[0].x, o.path[0].y), o); }
}
const BLOCK_PAUSE = 1.6, BLOCK_GIVEUP = 14;
function chatReach(n, o) { return Math.abs(n.tx - o.tx) + Math.abs(n.ty - o.ty) === 1 && !o.moving; }
function bumpInto(n, o) {
  const intent = n.chatTarget === o;
  if (intent) { n.chatTarget = null; n.path = []; arrive(n); }
  if (!o.moving) bumpTalk(n, o, intent);
}
function blockedStep(n, nx, dt) {
  if (town.pblock && town.pblock[nx.y * W + nx.x] && !lfBedAt(nx.x, nx.y)) {            // something was pushed into the way (a loose bed is walked over)
    const dest = n.path[n.path.length - 1], p = findPath(n.tx, n.ty, dest.x, dest.y);
    n.t = 0; n.blockT = 0;
    if (p && p.length) { n.path = p; return true; }
    n.path = []; return true;
  }
  const o = tileOwner.get(tkey(nx.x, nx.y));
  if (!o || o === n) { n.blockT = 0; return false; }
  if (n.ignoreBlock) return false;
  if (n.blockT === 0 || n.blockT === undefined) { n.blockT = 0.0001; n.blocker = o; if (!o.moving && !n.player) bumpTalk(n, o, n.chatTarget === o); }
  n.blockT += dt; n.pose = 'stand';
  const dest = n.path[n.path.length - 1];
  if (n.blockT > BLOCK_PAUSE && !n.rerouted) {
    n.rerouted = true;
    if (n.path.length > 1) {
      const avoid = new Set(); tileOwner.forEach((v, k) => { if (v !== n) avoid.add(k); });
      const p = findPath(n.tx, n.ty, dest.x, dest.y, avoid);
      if (p && p.length) { n.path = p; n.blockT = 0; n.rerouted = false; n.t = 0; return true; }
    }
  }
  if (n.blockT > (n.path.length === 1 ? 6 : BLOCK_GIVEUP)) {
    if (n.path.length === 1) { n.path = []; n.blockT = 0; n.rerouted = false; return true; }
    n.ignoreBlock = true; n.blockT = 0; n.rerouted = false;
  }
  if (n.blockT > BLOCK_PAUSE * 3) n.rerouted = false;
  return true;
}
function stepNpc(n, dt) {
  while (dt > 0 && n.path.length) {
    const nx = n.path[0];
    if (n.t === 0 && !n.player) {
      const o = n.chatTarget;
      if (o && !o.dead) {
        if (chatReach(n, o)) { bumpInto(n, o); return; }
        if (game.time > (n.chatUntil || 0)) { n.chatTarget = null; n.path = []; arrive(n); return; }
        const end = n.path[n.path.length - 1];
        if ((end.x !== o.tx || end.y !== o.ty) && game.time >= (n.repathAt || 0)) { n.repathAt = game.time + 3; const p = findPath(n.tx, n.ty, o.tx, o.ty); if (p && p.length) { n.path = p; continue; } }
      }
      if (blockedStep(n, nx, dt)) { if (!n.path.length) { arrive(n); return; } dt = 0; break; }
      n.ignoreBlock = false;
    }
    if (n.t === 0) { tileOwner.set(tkey(nx.x, nx.y), n); }
    const cost = TILE_MIN * tileCost(nx.x, nx.y) / n.speed;
    const need = (1 - n.t) * cost;
    n.face = { dx: Math.sign(nx.x - n.tx), dy: Math.sign(nx.y - n.ty) };
    if (n.pose !== 'walk' && !n.player) n.pose = 'walk';
    if (dt >= need) { dt -= need; if (tileOwner.get(tkey(n.tx, n.ty)) === n) tileOwner.delete(tkey(n.tx, n.ty)); n.tx = nx.x; n.ty = nx.y; n.t = 0; n.path.shift(); n.walked++; tileOwner.set(tkey(n.tx, n.ty), n); }
    else { n.t += dt / cost; dt = 0; }
  }
  if (n.path.length) { const nx = n.path[0]; n.x = n.tx + (nx.x - n.tx) * n.t; n.y = n.ty + (nx.y - n.ty) * n.t; }
  else if (n.moving) arrive(n);
}
function carrierOf(n) {
  const m = byId(n.fam.mother); if (m && !m.dead) return m;
  const f = byId(n.fam.father); if (f && !f.dead) return f;
  return npcs.find(o => o.homeRoom === n.homeRoom && o.age >= 16) || null;
}
function tickInfant(n) {
  const c = carrierOf(n);
  if (!c) { n.pose = 'stand'; return; }
  n.x = c.x + 0.3; n.y = c.y + 0.06; n.tx = c.tx; n.ty = c.ty; n.pose = c.pose === 'sleep' ? 'sleep' : 'stand'; n.moving = false; n.path = []; n.hold = null;
  n.status = c.pose === 'sleep' ? 'Asleep' : 'In ' + c.first + '\'s arms'; n.face = c.face;
}
function tickNpc(n, dt) {
  if (n.player) { tickPlayer(n, dt); return; }
  if (n.talkUntil > game.time) { if (n.moving) n.pose = 'stand'; return; }
  if (n.infant) { tickInfant(n); return; }
  if (n.moving) {
    stepNpc(n, dt);
    if (n.moving) { n.carry = carryIcon(n); return; }
    if (n.roaming) { n.roaming = false; const s = n.plan && n.plan[n.si]; if (s && s.k === 'wait') { applyWait(n, s); n.roamNext = game.time + s.roam[0] + n.rand() * (s.roam[1] - s.roam[0]); } }
  }
  for (let guard = 0; guard < 24; guard++) {
    if (!n.plan || n.si >= n.plan.length) newPlan(n);
    const s = n.plan[n.si];
    if (s.k === 'go') {
      if (!n.stepStarted) {
        n.stepStarted = true; const sp = typeof s.spot === 'function' ? s.spot(n) : s.spot;
        if (!sp || !goTo(n, sp, s.text)) { abortPlan(n); n.plan = [waitS(10, 'leisure', 'Wandering about, unsure which way to go')]; n.stepStarted = false; continue; }
        if (n.moving) { n.carry = carryIcon(n); return; }
      }
      n.stepStarted = false; n.si++; n.pose = 'stand'; continue;
    }
    if (s.k === 'wait') {
      if (!n.stepStarted) {
        n.stepStarted = true; n.until = game.time + s.min; applyWait(n, s); logStep(n, s.text);
        if (s.roam) n.roamNext = game.time + s.roam[0] + n.rand() * (s.roam[1] - s.roam[0]);
        n.carry = carryIcon(n); return;
      }
      if (game.time >= n.until) {
        n.stepStarted = false; n.si++;
        if (s.onEnd && s.onEnd(n) === false) { abortPlan(n); n.plan = [waitS(3, 'stand', 'Turned away, rethinking')]; }
        continue;
      }
      if (s.roam && game.time >= n.roamNext && game.time < n.until - 4) {
        const sp = pickFrom(s.area, n); n.roaming = true; const t0 = n.status;
        if (goTo(n, sp, t0)) { n.status = s.text; if (n.moving) { n.pose = 'walk'; return; } n.roaming = false; applyWait(n, s); n.roamNext = game.time + s.roam[0] + n.rand() * (s.roam[1] - s.roam[0]); } else n.roaming = false;
      }
      return;
    }
  }
}
function carryIcon(n) {
  if (n.pose !== 'walk' && !n.moving) return null;
  for (const g of ['wood', 'stone']) if ((n.inv[g] || 0) >= 1) return g;
  return null;
}
// the player's own clock: always runs, even when the calendar stands still
const clk = () => (game.ft == null ? game.time : Math.max(game.ft, game.time));
/** build mode stops the world: only you (walking, pushing, hammering) and the blocks move; the clock, villagers and economy wait */
function buildFrozen() { const n = game.player; return !!(n && n.player && itBuildOn(n) && !n.player.sleeping); }
function updateFrozen(dt) {
  const n = game.player, t = game.time, ft = game.ft;
  rebuildOcc(); tickPlayer(n, dt);
  game.time = t; game.ft = ft;
  if (typeof bldBrushStep === 'function') bldBrushStep(n);
  if (typeof bldTick === 'function') bldTick();
}
function updateSim(dt) {
  if (buildFrozen()) { updateFrozen(dt); return; }
  game.ft = clk() + dt;
  game.time += dt;
  if (typeof holdForPlayer === 'function') holdForPlayer(dt);
  tickEcon(dt); rebuildOcc();
  const list = npcs.slice();
  for (const n of list) {
    if (n.dead) continue;
    tickNpc(n, dt);
    if (n.shop) { const s = n.plan && n.plan[n.si]; n.shop.serving = !!(s && s.k === 'wait' && s.serve && n.stepStarted && !n.moving && n.pose !== 'walk'); }
  }
  const w = town.wedding; if (w && !w.done && game.time >= w.end) { w.done = true; if (!w.renewal && !w.a.dead && !w.b.dead) marry(w.a, w.b); else if (w.renewal) chron(`${w.a.first} and ${w.b.first} renewed their vows.`, "love"); town.wedding = null; }
  const f = town.funeral; if (f && !f.done && game.time >= f.end) finishFuneral(f);
  if (game.time - (town.waveT || 0) >= 6) { town.waveT = game.time; waveTick(); feastTick(); partyTick(); ceremonyTick(); lfGathTick(); lf2Tick(); }
  tickTalk(dt);
}
function fastForward(target) {
  if (target <= game.time) target += 1440 * Math.ceil((game.time - target + 1) / 1440);
  while (game.time < target) updateSim(Math.min(2, target - game.time));
  game.events.length = 0; if (typeof bubbles !== 'undefined') bubbles.length = 0;
}
function fmtTime(m) { m = Math.floor(m % 1440); return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }

function loadTown(seed, size, scenario?) {
  game.player = null;
  game.time = 5 * 60 + 30; game.ft = game.time; game.failures = 0; game.events.length = 0; pairCool.clear();
  let ok=false; for(let k=0;k<12&&!ok;k++){ try{ generateTown((seed+k*7919)>>>0, 'L'); ok=true; }catch(e){ if(!/no site/.test(e.message)) throw e; } }
  if(!ok) throw new Error('town generation failed');
  initEconomy();
  makeTownIndex2();
  if (scenario === 'blank') blankStart(); else { prebuildVillage(); housingTick(); growthProjects(); }
  town.scenario = scenario === 'blank' ? 'blank' : 'village';
  return town;
}
/** the blank island: you alone, with a tent in the empty camp; nobody else yet (visitors come later) */
function blankStart() {
  const keep = npcs.filter(n => canControl(n) && n.age >= 20 && n.age <= 36)[0] || npcs.find(canControl); if (!keep) throw new Error('no settler for the blank island');
  npcs = [keep]; town.byId = new Map([[keep.id, keep]]); town.founders = 1; town.tippingId = keep.id;
  for (const k of Object.keys(keep.fam || {})) keep.fam[k] = Array.isArray(keep.fam[k]) ? [] : null;
  keep.rel = {}; keep.know = {}; keep.aff = {}; keep.homeRoom = null; keep.bed = { owner: null }; keep.seat = null;
  town.tents = []; clearTentTiles(); town.crops = []; town.fields = 0; town.chron = []; town.dead = [];
  chron('You have reached the island alone, with a few tools. The camp ground is empty. Build a bed, then walls and a door, and see who comes.', 'note');
}
function makeTownIndex2() { npcs.forEach(n => { town.byId.set(n.id, n); }); }
