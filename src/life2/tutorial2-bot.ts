/* The tutorial's bot (tools/tutorial.mjs and the "Watch the bot play" button): what a player would do now, step by step.
   `tut2BotDecide()` returns { key (a direction to hold), press (a key to tap), click (a shop button), done }; the tool turns it into real key presses,
   the button into the same actions inside the page, at normal speed and reading every bubble. */
/** a short path that steps round people and things standing in the way (findPath ignores people); a breadth-first search within 40 tiles */
function tut2BotPath(a: any, b: any): any[] | null {
  const P = game.player, R = 40, seen = new Map<number, number>(), q: number[] = [a.y * W + a.x]; seen.set(q[0], -1);
  const free = (x: number, y: number) => walkable(x, y) && (!lfPropAt(x, y) || (lfBedAt(x, y) && !(lfPropAt(x, y).kind === 'bed' && lfPropAt(x, y).owner && lfPropAt(x, y).owner !== P)) || (x === b.x && y === b.y)) && !(tileOwner.get(y * W + x) && tileOwner.get(y * W + x) !== P) && Math.abs(x - a.x) <= R && Math.abs(y - a.y) <= R;
  for (let h = 0; h < q.length; h++) { const k = q[h], x = k % W, y = (k / W) | 0; if (x === b.x && y === b.y) { const out: any[] = []; let c = k; while (c !== q[0]) { out.unshift({ x: c % W, y: (c / W) | 0 }); c = seen.get(c) as number; } return out; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, nk = ny * W + nx; if (seen.has(nk) || !free(nx, ny)) continue; seen.set(nk, k); q.push(nk); } }
  return findPath(a.x, a.y, b.x, b.y);   // (nothing better: the ordinary path)
}
function tut2BotDecide(): any {
  const T2 = town.tut2, P = game.player; if (!T2 || T2.done) return { done: true };
  const sc = TUT2_SCENES[T2.scene] || [], s = sc[T2.step] || {};
  const st: any = { scene: T2.scene, step: T2.step, do: s.do, strip: T2.ui.strip, bubble: performance.now() < TUT2.bubbleEnd, key: null };
  if (typeof ITEMCARD !== 'undefined' && ITEMCARD.open) return Object.assign(st, { press: 'Enter', card: true });   // (read the item card and close it)
  if (s.do !== 'wait' || !s.bot) return st;
  let h: any = s.bot(T2); if (!h) return st; if (h.x != null) h = { stand: h };
  if (h.pressOnly) return Object.assign(st, { press: h.key });   // (just tap the key)
  if (h.click) { if (!SHOP.open && !(typeof talkUI !== 'undefined' && talkUI.o)) return st; return Object.assign(st, { click: h.click }); }   // (a button in a panel)
  if (h.shop) { const sh = h.shop; if (!SHOP.open) return st; if (sh.close) return Object.assign(st, { click: '[data-spx]' }); if (SHOP.tab !== sh.tab) return Object.assign(st, { click: `[data-spt="${sh.tab}"]` }); return Object.assign(st, { click: `.sptile:nth-child(${sh.i + 1}) .spbtns button:${sh.all ? 'last-child' : 'first-child'}` }); }
  const DIR = (dx: number, dy: number) => dx > 0 ? 'ArrowRight' : dx < 0 ? 'ArrowLeft' : dy > 0 ? 'ArrowDown' : 'ArrowUp';
  const cur = P.moving && P.path && P.path.length ? P.path[P.path.length - 1] : { x: P.tx, y: P.ty };
  if (P.player.lock || P.player.edgeHold) return Object.assign(st, { lock: true });   // (stopped at a bump or at a field's edge: let go and press again)   // (a bump stopped you: let go and press again, as a player would)
  if (h.stand && (cur.x !== h.stand.x || cur.y !== h.stand.y)) {
    const p = tut2BotPath(cur, h.stand); if (!p || !p.length) return Object.assign(st, { nopath: true });
    return Object.assign(st, { key: DIR(p[0].x - cur.x, p[0].y - cur.y), hold: true });
  }
  if (P.moving) return Object.assign(st, { key: null });   // (arriving: let go so you stop on the tile)
  if (h.faceTo) { P.face = { dx: Math.sign(h.faceTo.x - P.tx), dy: Math.sign(h.faceTo.y - P.ty) }; }   // (the bot turns to face it: a player would tap the key)
  if (h.face) P.face = { up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 }, left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 } }[h.face];
  if (h.into && !P.player.act && !P.player.fresh && (P.player.idle || 0) < 0.3) return Object.assign(st, { rest: true });   // (work starts from rest: stop, then press toward it)
  if (h.into) return Object.assign(st, { key: DIR(h.into.x - P.tx, h.into.y - P.ty), hold: true, press: h.key || null });
  if (h.key) return Object.assign(st, { press: h.key });
  return st;
}

/* ---- the Watch button: the bot plays the tutorial in front of you ---- */
const TUTBOT: any = { on: false, t: 0 };
const BOT_KEYS: Record<string, string> = { ArrowRight: 'right', ArrowLeft: 'left', ArrowDown: 'down', ArrowUp: 'up' };
function tut2BotTick(dt: number) {
  const btn = tut2Dom('botbtn', 'botbtn');
  if (btn) { const show = tut2Active(); if (btn.hidden === show) { btn.hidden = !show; } const lab = TUTBOT.on ? 'Stop the bot' : 'Watch the bot play'; if (btn.textContent !== lab) btn.textContent = lab; btn.classList.toggle('on', TUTBOT.on); if (!btn.dataset.wired) { btn.dataset.wired = '1'; btn.addEventListener('click', () => { TUTBOT.on = !TUTBOT.on; const p = game.player && game.player.player; if (p) p.keys = {}; }); } }
  if (!TUTBOT.on) return; if (!tut2Active()) { TUTBOT.on = false; return; }
  TUTBOT.t += dt; if (TUTBOT.t < 0.1) return; TUTBOT.t = 0;
  const P = game.player, p = P && P.player; if (!p) return; const b = tut2BotDecide(); if (b.done) { TUTBOT.on = false; p.keys = {}; return; }
  if (b.click) { const el: any = document.querySelector(b.click); if (el) el.click(); }
  if (b.press) { p.keys = {};
    if (b.press === 'Enter') { if (ITEMCARD.open) itemCardNext(); }
    else if (b.press === 'b') itBuildToggle(P);
    else if (/^[0-9]$/.test(b.press)) { const i = b.press === '0' ? 9 : +b.press - 1; if (itBuildOn(P)) itBuildSelect(P, i); else itSelect(P, i); } }
  const d = b.key ? BOT_KEYS[b.key] : null; p.keys = d ? { [d]: true } : {}; if (d) p.lastKey = performance.now();
}
