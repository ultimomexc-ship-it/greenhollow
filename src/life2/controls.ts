/* ================= life2 / controls: explicit actions. The thing in your hand decides what walking into something does ==========
   The hand (belt slot 1) has three modes, switched with Q: Talk, Push, Search. Tools are on the belt (1-9): axe, hammer, hoe, rod, lockpicks, seeds.
   See player/items.ts for the model, the hotbar and the bag (B), and player/control.ts for the movement that uses them. Shift does nothing.
   The verbs in lf2Verbs (steal, pick a lock, wreck, shove, give, wake, follow ...) are still registered in the hooks but nothing reaches them yet.   */
/* ---------------- pushing people like furniture ---------------- */
const lf2PersonOK = (x, y) => { const g = grid[y] && grid[y][x]; return walkable(x, y) && !(typeof noStep === 'function' && noStep(x, y)) && g !== T.SEAT && g !== T.BED && g !== T.PEW && g !== T.TENT && !lfPropAt(x, y); };
/** Put o on tile (x, y) at once (it slides there on screen) and let them find their feet; no event, no rumour. */
function lf2Relocate(o, x, y) {
  const fx = o.x, fy = o.y;
  if (tileOwner.get(tkey(o.tx, o.ty)) === o) tileOwner.delete(tkey(o.tx, o.ty));
  if (o.path && o.path[0] && tileOwner.get(tkey(o.path[0].x, o.path[0].y)) === o) tileOwner.delete(tkey(o.path[0].x, o.path[0].y));
  abortPlan(o);
  o.tx = x; o.ty = y; o.x = x; o.y = y; o.pose = 'stand'; o.chatTarget = null; tileOwner.set(tkey(x, y), o);
  o.plan = [waitS(1.2, 'stand', 'Stepping aside', { nopie: true })]; o.si = 0; o.stepStarted = false;
  o.slide = { fx, fy, st: performance.now() };
}
/** Push o one tile in the direction (dx, dy); when there is no room behind them you swap places. Returns true, or the reason it cannot be done. */
function lf2PushPerson(n, o, dx, dy): true | string {
  if (!lf2Adj(n, o)) return 'Too far to push.';
  if (o.pose === 'sit' || o.pose === 'kneel') return o.first + ' is settled in.';
  const bx = o.tx + dx, by = o.ty + dy, ox = o.tx, oy = o.ty;
  const move = o.pose === 'sleep' ? (x, y) => pushCarry(o, x, y, n) : (x, y) => lf2Relocate(o, x, y);   // (a sleeper is carried, still asleep)
  if (lf2PersonOK(bx, by) && !tileOwner.get(tkey(bx, by))) move(bx, by);
  else if (lf2PersonOK(n.tx, n.ty)) move(n.tx, n.ty);      // against a wall or a crowd: change places
  else return 'There is no room to push ' + o.first + '.';
  return true;   // (nobody notices a push while it happens: see life2/surprise.ts)
}
/** how a villager is drawn while they slide to the tile they were pushed onto (screen time, not game time) */
function gaSlide(n, now) {
  const s = n.slide; if (!s) return [n.x, n.y];
  if (s.by) { const f = s.by; if (f.moving && f.path && f.path.length && f.walked === s.w) { const t = Math.max(0, Math.min(1, f.t || 0)); return [s.fx + (n.x - s.fx) * t, s.fy + (n.y - s.fy) * t]; } n.slide = null; return [n.x, n.y]; }   // (carried along by the player's own step)
  const t = (now - s.st) / 170; if (!(t < 1)) { n.slide = null; return [n.x, n.y]; }
  const e = 1 - (1 - t) * (1 - t);
  return [s.fx + (n.x - s.fx) * e, s.fy + (n.y - s.fy) * e];
}

