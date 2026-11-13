/* The first morning: the tutorial of a new Hamlet island (docs/tutorial-script.md is the spec, docs/tutorial-prompts.md the build order).
   Scenes are data: lists of steps. One small runner plays them, in real seconds, from the frame loop (`tut2Tick`), also while build mode or a
   panel holds the sim. While the tutorial runs the clock stands still (`tut2Sim`), crops do not grow, needs are held, and the people it owns
   (`n.tutHold`) do only what its steps say. `town.tut2` is saved with the island: { scene, step, done, at (the places), who (ids), ui }. */

/** a new Hamlet island starts with the tutorial; tests and tools that want the old start set window.GH_NOTUT */
const HAMLET_TUTORIAL = (): boolean => !(typeof window !== 'undefined' && (window as any).GH_NOTUT);
const tut2Active = (): boolean => !!(typeof town !== 'undefined' && town && town.tut2 && !town.tut2.done);

/* ---- the places (the map in the script), relative to the house's top-left corner ---- */
const TUT2_MAP = {
  house: { w: 5, h: 3 }, door: [2, 2], window: [3, 0], bed: [1, 1], start: [2, 1], out: [2, 3],
  patch: { x: 7, y: 0, w: 3, h: 3 }, watch: [6, 1],                              // (where Paullus stands to watch the patch: west of its middle row)
  yard: { x: 14, y: -1, w: 6, h: 5 }, gate: [14, 1], jbed: [15, 0], jfield: [[16, 1], [17, 1], [18, 1], [16, 2], [17, 2], [18, 2]],   // (two clear tiles between your ring and hers, so a gate can be faced)
  own: { x: -1, y: -1, w: 13, h: 7 }, ownGate: [2, 5],                          // (your own yard: a fence ring round the house and the patch, the gate below the door: in the Hamlet only a fenced yard makes ground yours)
  box: { x0: -2, y0: -2, x1: 20, y1: 6 }                                        // (all of it, with a tile round it, must be clear grass)
};
/** find a clear piece of ground near the stall for the whole layout and keep its places in town.tut2.at */
function tut2Layout(st: any): any {
  const M = TUT2_MAP, sx = st.x, sy = st.y;
  const inMap = (x: number, y: number) => x > 3 && y > 3 && x < W - 4 && y < (town.h0 || H) - 4;
  const clear = (x: number, y: number) => (grid[y][x] === T.GRASS || grid[y][x] === T.PATH) && walkable(x, y) && !lfPropAt(x, y) && !(town.nodeMap && town.nodeMap.has(y * W + x)) && roomAt[y][x] < 0;
  const HARD = new Set([T.WATER, T.WALL, T.DOOR, T.STALL, T.FLOOR, T.MOUNTAIN, T.SKY, T.STAIR, T.STAIRD, T.STAIRM, T.STAIRU, T.EARTH, T.GRAVE, T.WELL]);
  const clearable = (x: number, y: number) => !HARD.has(grid[y][x]) && roomAt[y][x] < 0 && !(lfPropAt(x, y) && lfPropAt(x, y).fixed) && !(town.hgt && town.hgt[y * W + x] >= 0);   // (anything but water, buildings and stairs is cleared away: trees, rocks, bushes, sand, loose things)
  let best: any = null, bs = 1e9;
  for (const [lim, far] of [[11, 20], [16, 28], [24, 40]]) {   // (close to the stall first; further out if the ground near it will not do)
    for (let oy = sy - 40; oy <= sy + 40; oy++) for (let ox = sx - 46; ox <= sx + 40; ox++) {
      const yc = { x: ox + M.yard.x + 3, y: oy + M.yard.y + 2 }, hc = { x: ox + 2, y: oy + 3 };
      const dY = Math.hypot(yc.x - sx, yc.y - sy), dH = Math.hypot(hc.x - sx, hc.y - sy); if (dY > lim || dH > far) continue;
      let s = dY + dH * 0.5; if (s >= bs) continue;
      let ok = true; for (let y = oy + M.box.y0; y <= oy + M.box.y1 && ok; y++) for (let x = ox + M.box.x0; x <= ox + M.box.x1 && ok; x++) {
        if (!inMap(x, y) || Math.abs(x - sx) + Math.abs(y - sy) <= 2 || (x >= sx - 1 && x <= sx + 2 && y >= sy - 1 && y <= sy + 3)) { ok = false; break; }
        if (clear(x, y)) continue; if (clearable(x, y)) { s += 0.6; if (s >= bs) ok = false; continue; } ok = false; }
      if (ok) { best = { x: ox, y: oy }; bs = s; }
    }
    if (best) break;
  }
  if (best) for (let y = best.y + M.box.y0; y <= best.y + M.box.y1; y++) for (let x = best.x + M.box.x0; x <= best.x + M.box.x1; x++) if (!clear(x, y) && clearable(x, y)) {
    const pr = lfPropAt(x, y); if (pr) { town.props.splice(town.props.indexOf(pr), 1); town.propAt.delete(y * W + x); town.pblock[y * W + x] = 0; }
    if (town.nodeMap && town.nodeMap.has(y * W + x)) { const nd = town.nodeMap.get(y * W + x); town.nodes = (town.nodes || []).filter((q: any) => q !== nd); town.nodeMap.delete(y * W + x); }
    if (town.block) town.block[y * W + x] = 0; setT(x, y, T.GRASS); markDirty(x, y, 1, 1);
  }
  if (best) { town.gridV = (town.gridV || 0) + 1; town.lfPV = (town.lfPV || 0) + 1; town.treeCache = null; }
  if (!best) return null;
  const o = best, P = (p: number[]) => ({ x: o.x + p[0], y: o.y + p[1] });
  const at: any = { o, door: P(M.door), out: P(M.out), bed: P(M.bed), start: P(M.start), window: P(M.window), watch: P(M.watch), gate: P(M.gate), jbed: P(M.jbed), jfield: M.jfield.map(P),
    keep: { x: st.x, y: st.y }, front: { x: st.front.x, y: st.front.y }, patch: [], house: [], yard: [], own: [], ownGate: P(M.ownGate) };
  for (let j = 0; j < M.own.h; j++) for (let i = 0; i < M.own.w; i++) if (i === 0 || j === 0 || i === M.own.w - 1 || j === M.own.h - 1) at.own.push({ x: o.x + M.own.x + i, y: o.y + M.own.y + j });
  for (let j = 0; j < M.patch.h; j++) for (let i = 0; i < M.patch.w; i++) at.patch.push({ x: o.x + M.patch.x + i, y: o.y + M.patch.y + j });
  for (let j = 0; j < M.house.h; j++) for (let i = 0; i < M.house.w; i++) if (i === 0 || j === 0 || i === M.house.w - 1 || j === M.house.h - 1) at.house.push({ x: o.x + i, y: o.y + j });
  for (let j = 0; j < M.yard.h; j++) for (let i = 0; i < M.yard.w; i++) if (i === 0 || j === 0 || i === M.yard.w - 1 || j === M.yard.h - 1) at.yard.push({ x: o.x + M.yard.x + i, y: o.y + M.yard.y + j });
  const sh = (shoreTiles || []).slice().sort((a: any, b: any) => Math.hypot(a.x - sx, a.y - sy) - Math.hypot(b.x - sx, b.y - sy))[0];
  at.shore = sh ? { x: sh.x, y: sh.y } : { x: sx, y: sy + 6 };
  return at;
}
/** the island the tutorial starts on: you, Paullus and his stall, the old house (sealed from blocks, your bed inside) and a raw patch */
function tut2Start(P: any, TR: any, st: any) {
  // the old start made a family, a yard for the trader and loose beds: the tutorial has none of them
  for (const pr of town.props.slice()) if (pr.kind === 'bed' || pr.kind === 'fence' || pr.kind === 'gate') { town.props.splice(town.props.indexOf(pr), 1); town.propAt.delete(pr.y * W + pr.x); town.pblock[pr.y * W + pr.x] = 0; }
  npcs = [P, TR]; town.byId = new Map([[P.id, P], [TR.id, TR]]); town.hamletFamily = [];
  for (const n of [P, TR]) { n.bed = { owner: null }; n.homeless = true; n.homeRoom = null; n.know = {}; n.aff = {}; n.inv = {}; }
  P.know[TR.id] = 1; TR.know[P.id] = 1;
  if (TR.first !== 'Paullus') { town.used && town.used.add && town.used.add('Paullus'); TR.first = 'Paullus'; }
  P.coin = 15;
  const at = tut2Layout(st); if (!at) throw new Error('no room for the tutorial');
  // the old house: wall, window and door blocks, sealed into a room by the same code that seals what you build
  const spots: [number, number][] = [];
  for (const c of at.house) { const k = c.x === at.door.x && c.y === at.door.y ? 'bdoor' : c.x === at.window.x && c.y === at.window.y ? 'bwindow' : 'bwall'; lfAddProp(k, c.x, c.y); spots.push([c.x, c.y]); }
  bldEvaluate(spots);
  const bed: any = lfAddProp('bed', at.bed.x, at.bed.y); bed.v = 2; bed.rot = 0; bed.owner = P; P.bed = bed; P.homeless = false;
  if (typeof visHomes === 'function') visHomes();
  { const r = rooms.find((q: any) => !q.dead && q.cells && q.cells.has(at.bed.x + at.bed.y * W)); if (r) { P.homeRoom = r; r.name = 'The old house'; at.room = r.id; } }
  // your yard: a ring of fence with a gate round the house and the patch (Paullus's old place; in the Hamlet ground is yours inside your own fence)
  for (const c of at.own) { const g = c.x === at.ownGate.x && c.y === at.ownGate.y; const f: any = lfAddProp(g ? 'gate' : 'fence', c.x, c.y); f.rot = 0; }
  for (const t of at.jfield.concat(at.yard)) if (grid[t.y][t.x] !== T.GRASS) { setT(t.x, t.y, T.GRASS); markDirty(t.x, t.y, 1, 1); }   // (fields go on grass: a path tile there would refuse one)
  // the patch: nine raw plots
  for (const c of at.patch) { setT(c.x, c.y, T.CROP); town.crops.push({ x: c.x, y: c.y, f: 'tut', pl: 0, st: 0, t0: 0, byField: P.id }); markDirty(c.x, c.y, 1, 1); }
  town.gridV = (town.gridV || 0) + 1;
  town.tut2 = { scene: 0, step: 0, done: false, at, who: { you: P.id, paullus: TR.id }, ui: { strip: null, arrow: null, marks: [] }, said: [], log: [] };
  TR.tutHold = true; game.time = 8 * 60; game.ft = game.time;
  town.lfPV = (town.lfPV || 0) + 1; rebuildOcc(); refreshReach(); if (typeof yardScan === 'function') yardScan(true);
  chron('You woke up in a small stone house by the shore. A man was waiting at the door.', 'note');
}

/* ---- the runner ---- */
const TUT2: any = { st: null, skip: false, bubbleEnd: 0, t: 0, nudged: false, waitT: 0, last: null };
const tut2Who = (w: string): any => { if (!town.tut2) return null; if (w === 'you') return game.player; const id = town.tut2.who[w]; return id != null ? byId(id) : null; };
/** a place name or a {x,y} or a person: where it is */
function tut2Pos(p: any): any { if (!p) return null; if (typeof p === 'function') return tut2Pos(p(town.tut2)); if (typeof p === 'string') { const n = tut2Who(p); if (n) return { x: n.tx, y: n.ty }; return town.tut2.at[p] || null; } return p; }
const tut2Adj = (a: any, b: any) => !!a && !!b && Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
const tut2NextTo = (who: any, tiles: any[]) => tiles.some(t => tut2Adj({ x: who.tx, y: who.ty }, t));
/** walk a held villager to a tile (the normal path) */
function tut2Walk(n: any, to: any): boolean {
  if (!n || !to) return false; if (n.tx === to.x && n.ty === to.y && !n.moving) return true;
  const p = findPath(n.tx, n.ty, to.x, to.y); if (!p) return false;
  n.spot = { x: to.x, y: to.y }; n.path = p; n.t = 0; n.moving = p.length > 0; n.pose = n.moving ? 'walk' : 'stand'; n.status = 'Walking'; return true;
}
function tut2Face(n: any, to: any) {
  if (!n || !to) return; if (to.dir) { n.face = to.dir; return; }
  const q = to.tx != null ? to : { tx: to.x, ty: to.y }; faceTo(n, q);
}
/** a held villager's tick: walk if walking, otherwise stand */
function tut2Npc(n: any, dt: number) {
  if (n.moving && n.path && n.path.length) { stepNpc(n, dt); if (!n.moving) n.pose = 'stand'; }
  else { n.moving = false; if (n.pose === 'walk') n.pose = 'stand'; }
}
/** the sim while the tutorial runs: people move and act, the clock does not (like build mode, but everybody moves) */
function tut2Sim(dt: number) {
  const t = game.time, ft = game.ft; rebuildOcc();
  for (const n of npcs.slice()) if (!n.dead) tickNpc(n, dt);
  game.time = t; game.ft = ft;
  if (typeof bldTick === 'function') bldTick();
}
/** a line in a bubble over the speaker, on real time; returns when it ends */
function tut2Say(n: any, text: string, to?: any): number {
  const now = performance.now(), d = 1000 + 60 * text.length;
  if (!n) return now;
  for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].n === n) bubbles.splice(i, 1);
  bubbles.push({ n, to: to || null, text, from: now, until: now + d, tut: true });
  if (town.tut2) { town.tut2.said.push({ who: n.first, text, scene: town.tut2.scene }); if (town.tut2.said.length > 200) town.tut2.said.shift(); }
  return now + d;
}
function tut2Think(text: string): number { const P = game.player; if (P && P.player) playerSay(P, text); if (town.tut2) town.tut2.said.push({ who: 'you (thought)', text, scene: town.tut2.scene }); return performance.now() + 1000 + 60 * text.length; }
/** Space or a click ends the bubble that is showing */
function tut2SkipBubble() { if ((typeof ITEMCARD !== 'undefined' && ITEMCARD.open) || !tut2Active() || performance.now() >= TUT2.bubbleEnd) return false; TUT2.skip = true; return true; }
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e: any) => { if ((e.key === ' ' || e.code === 'Space') && !e.repeat && tut2SkipBubble()) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  window.addEventListener('pointerdown', () => { tut2SkipBubble(); }, true);
}
const tut2Scene = (): any[] => TUT2_SCENES[town.tut2.scene] || [];
/** one frame of the tutorial (real seconds) */
function tut2Tick(dt: number) {
  if (typeof tut2Hud === 'function') tut2Hud(); if (typeof tut2BotTick === 'function') tut2BotTick(dt); if (typeof tut2After === 'function' && town) tut2After();
  if (!tut2Active()) return; const T2 = town.tut2;
  if (typeof ITEMCARD !== 'undefined' && ITEMCARD.open) return;   // (the story waits while you read an item card)
  for (let guard = 0; guard < 40; guard++) {
    const sc = tut2Scene(); if (!sc.length) { T2.done = true; return; }
    if (T2.step >= sc.length) { T2.scene++; T2.step = 0; TUT2.st = null; if (!TUT2_SCENES[T2.scene]) { T2.done = true; return; } continue; }
    const s = sc[T2.step];
    if (TUT2.st !== s) { TUT2.st = s; TUT2.t = 0; TUT2.nudged = false; TUT2.skip = false; if (!tut2Begin(s)) { tut2Next(s); continue; } }
    TUT2.t += dt;
    if (!tut2Going(s, dt)) { tut2Next(s); continue; }
    return;
  }
}
function tut2Next(s: any) { const T2 = town.tut2; T2.log.push({ scene: T2.scene, step: T2.step, do: s.do, t: Math.round(TUT2.t * 10) / 10 }); if (T2.log.length > 400) T2.log.shift(); T2.step++; TUT2.st = null; }
/** start a step; false when it is over at once */
function tut2Begin(s: any): boolean {
  const T2 = town.tut2, ui = T2.ui;
  switch (s.do) {
    case 'set': s.fn(T2); return false;
    case 'say': { const n = tut2Who(s.who), to = s.to ? tut2Who(s.to) : game.player; if (n && to && n !== to && !n.moving) tut2Face(n, to); TUT2.bubbleEnd = tut2Say(n, s.text, to); return true; }
    case 'think': TUT2.bubbleEnd = tut2Think(s.text); return true;
    case 'walk': { const n = tut2Who(s.who), to = tut2Pos(s.to); tut2Walk(n, to); return !s.async; }
    case 'face': { const n = tut2Who(s.who); tut2Face(n, s.dir ? { dir: s.dir } : (typeof s.to === 'string' && tut2Who(s.to)) || tut2Pos(s.to)); return false; }
    case 'give': s.fn(game.player, T2); return false;
    case 'strip': ui.strip = s.text || null; return false;
    case 'arrow': ui.arrow = s.to ? { to: s.to, done: s.done || null } : null; return false;
    case 'mark': ui.marks = s.tiles ? [Object.assign({}, s, { do: undefined })] : []; return false;
    case 'fade': TUT2.f0 = ui.fade || 0; return true;
    case 'time': TUT2.time0 = game.time; TUT2.time1 = Math.floor(game.time / 1440) * 1440 + s.at + (s.nextDay ? 1440 : 0); if (!s.over) { game.time = game.ft = TUT2.time1; return false; } return true;
    case 'wait': return !s.until(T2);
  }
  return false;
}
/** keep a step going; false when it is over */
function tut2Going(s: any, dt: number): boolean {
  const T2 = town.tut2;
  switch (s.do) {
    case 'say': case 'think': if (TUT2.skip) { TUT2.skip = false; for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].tut) bubbles[i].until = performance.now(); return false; } return performance.now() < TUT2.bubbleEnd;
    case 'walk': { const n = tut2Who(s.who); if (!n) return false; if (!n.moving) { const to = tut2Pos(s.to); if (to && (n.tx !== to.x || n.ty !== to.y) && TUT2.t > 0.5 && Math.floor(TUT2.t) !== Math.floor(TUT2.t - dt)) tut2Walk(n, to); } return !!n.moving || TUT2.t < 0.05; }
    case 'fade': { const k = Math.min(1, TUT2.t / s.over); town.tut2.ui.fade = TUT2.f0 + (s.to - TUT2.f0) * k; return k < 1; }
    case 'time': { const k = Math.min(1, TUT2.t / s.over); game.time = game.ft = TUT2.time0 + (TUT2.time1 - TUT2.time0) * k; return k < 1; }
    case 'wait': {
      if (s.until(T2)) return false;
      if (s.nudge && !TUT2.nudged && TUT2.t >= s.nudge.after) { TUT2.nudged = true; const nu = s.nudge; if (nu.say) { const n = tut2Who(nu.say[0]); TUT2.bubbleEnd = tut2Say(n, nu.say[1], game.player); } if (nu.fn) nu.fn(T2); }
      return true;
    }
  }
  return false;
}
/** a bump on somebody the tutorial holds: they repeat what they last said in this scene (Off script) */
function tut2Bump(o: any): string {
  const T2 = town.tut2; const last = T2.said.slice().reverse().find((l: any) => l.scene === T2.scene && l.who === o.first);
  return last ? last.text : 'Mm.';
}

/* ---- the scenes (docs/tutorial-script.md, word for word) ---- */
const tsay = (who: string, text: string): any => ({ do: 'say', who, text });
const youNextTo = (place: string) => (T2: any) => { const P = game.player; const at = T2.at[place]; return !!P && tut2NextTo(P, Array.isArray(at) ? at : [at]); };
const TUT2_SCENES: any[][] = [
  // Scene 0: the state at load
  [
    { do: 'set', fn: (T2: any) => {
      const P = game.player, R = tut2Who('paullus'), at = T2.at;
      for (const [n, p, f] of [[P, at.start, { dx: 0, dy: 1 }], [R, at.out, { dx: 0, dy: -1 }]] as any[]) { if (!n) continue; n.tx = n.x = p.x; n.ty = n.y = p.y; n.path = []; n.moving = false; n.t = 0; n.pose = 'stand'; n.face = f; }
      if (R) { R.tutHold = true; R.plan = null; R.status = 'Waiting at the door'; }
      game.time = game.ft = Math.floor(game.time / 1440) * 1440 + 8 * 60;
    } }
  ],
  // Scene 1: the old house and the hoe
  [
    { do: 'strip', text: 'Walk out of the door.' }, { do: 'arrow', to: 'paullus' },
    { do: 'wait', until: (T2: any) => tut2Adj({ x: game.player.tx, y: game.player.ty }, tut2Pos('paullus')), nudge: { after: 20, say: ['paullus', 'Out here.'] }, bot: () => tut2Pos('door') },
    { do: 'face', who: 'paullus', to: 'you' }, { do: 'strip' }, { do: 'arrow' },
    tsay('paullus', 'Morning.'),
    tsay('paullus', "You're new. Everybody is, here."),
    tsay('paullus', "This was mine. It's yours now."),
    tsay('paullus', "Don't ask how. I'm bad at the long version."),
    tsay('paullus', "Before anything else you'll want to eat."),
    tsay('paullus', "And for that you'll want a field."),
    { do: 'give', fn: (P: any) => { if (!(P.items || []).some((i: any) => i.kind === 'hoe')) itGiveTool(P, 'hoe'); } },
    tsay('paullus', 'Here. A hoe. The pointed end goes in the ground.'),
    { do: 'mark', tiles: 'patch' }, { do: 'arrow', to: 'patch' }, { do: 'strip', text: 'Walk to the marked ground.' },
    { do: 'walk', who: 'paullus', to: 'watch', async: true },
    { do: 'wait', until: youNextTo('patch'), nudge: { after: 30, say: ['paullus', "It's just there. The patch with nothing on it."] }, bot: (T2: any) => ({ x: T2.at.patch[6].x, y: T2.at.patch[6].y + 1 }) },
    { do: 'face', who: 'paullus', dir: { dx: 1, dy: 0 } }
  ]
];
