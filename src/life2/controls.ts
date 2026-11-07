/* ================= life2 / controls: one key. Walk into something and the obvious thing happens; Shift toggles crouching (like Caps Lock) ==========
   STANDING (default)   villager -> talk            sleeping villager -> nothing (they are asleep)   seller at their counter -> buy
                        barrel, crate, stool -> push it along   tree, rock -> fell it   water -> fish   berries, herbs, crops -> gather
   CROUCHING (Shift)    villager -> push past them (they move one tile, or you swap places; harmless: no crime, no gossip)
                        barrel, crate, stool -> search it       (trees and rocks are left alone; water is not fished)
   Nothing else has a key: no Space, E, R, C or Z. The verbs in lf2Verbs (steal, pick a lock, wreck, shove, give, wake, follow ...) are still registered
   in the hooks but nothing reaches them now; they wait for their own standing / crouching actions.
   On a touch screen a Crouch button does what Shift does.                                                                                              */
const lf2Crouching = p => !!(p && p.sneak);
function lf2ToggleCrouch(p) { p.sneak = !p.sneak; p.lock = false; p.skip = null; p.grace = null; p.act = null; }

/* ---------------- pushing people like furniture ---------------- */
const lf2PersonOK = (x, y) => { const g = grid[y] && grid[y][x]; return walkable(x, y) && !(typeof noStep === 'function' && noStep(x, y)) && g !== T.SEAT && g !== T.BED && g !== T.PEW && g !== T.TENT && !lfPropAt(x, y); };
const PUSH_WORDS = ['Oh! Excuse me.', 'Hm? Oh, right.', 'Mind how you go.', 'Oh, I will shift.', 'Right, right.'];
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
  if (o.pose === 'sleep') return o.first + ' is asleep.';
  if (o.pose === 'sit' || o.pose === 'kneel') return o.first + ' is settled in.';
  const bx = o.tx + dx, by = o.ty + dy, ox = o.tx, oy = o.ty;
  if (lf2PersonOK(bx, by) && !tileOwner.get(tkey(bx, by))) lf2Relocate(o, bx, by);
  else if (lf2PersonOK(n.tx, n.ty)) lf2Relocate(o, n.tx, n.ty);      // against a wall or a crowd: change places
  else return 'There is no room to push ' + o.first + '.';
  cvSaw(n, o, 'push');
  if (!o.player && Math.random() < 0.3) lfShout(o, anyOf(PUSH_WORDS));
  return true;
}
/** how a villager is drawn while they slide to the tile they were pushed onto (screen time, not game time) */
function gaSlide(n, now) {
  const s = n.slide; if (!s) return [n.x, n.y];
  const t = (now - s.st) / 170; if (!(t < 1)) { n.slide = null; return [n.x, n.y]; }
  const e = 1 - (1 - t) * (1 - t);
  return [s.fx + (n.x - s.fx) * e, s.fy + (n.y - s.fy) * e];
}

/* ---------------- the hint line: what walking into the thing in front of you does right now ---------------- */
function lf2HintText(n) {
  const p = n.player; if (!p || p.sleeping) return '';
  if (p.act && p.act.auto) return '';
  const c = lf2Crouching(p), tag = c ? 'Crouching · ' : '', { x, y } = lf2Front(n), o = lf2Occ(x, y, n), pr = lfPropAt(x, y);
  if (o && o.pose !== 'sleep') return tag + (c ? 'walk into ' + o.first + ' to push past' : 'walk into ' + o.first + ' to talk · Shift: crouch to push past');
  if (pr) return tag + (c ? 'walk into the ' + LF_NOUN[pr.kind] + ' to search it · Shift: stand to push it' : 'walk into the ' + LF_NOUN[pr.kind] + ' to push it · Shift: crouch to search it');
  return c ? 'Crouching · Shift to stand up' : '';
}

/* ---------------- keys ---------------- */
window.addEventListener('keydown', e => {
  if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === 'Space') { e.preventDefault(); return; }                       // Space does nothing now, but must not scroll the page or press a focused button
  if (e.key !== 'Shift' || e.repeat) return;
  const p = game.player && game.player.player; if (p) lf2ToggleCrouch(p);        // a toggle: tap once to crouch, again to stand
}, true);

/* ---------------- touch: a Crouch button, and the hint line ---------------- */
function lf2SyncModeBtn() {
  const b = document.getElementById('lf2mode'); if (!b) return;
  const p = game.player && game.player.player; b.hidden = !p;
  const c = lf2Crouching(p); b.textContent = c ? 'Stand' : 'Crouch'; b.setAttribute('aria-pressed', c ? 'true' : 'false');
}
(function () {
  const stage = canvas.parentNode; if (!stage) return;
  const css = document.createElement('style');
  css.textContent = '.lf2hint{position:absolute;left:50%;bottom:92px;transform:translateX(-50%);background:rgba(21,25,27,.78);color:#e8e4da;font-size:12px;padding:4px 12px;border-radius:999px;pointer-events:none;white-space:nowrap;max-width:92%;overflow:hidden;text-overflow:ellipsis;z-index:4}' +
    '#lf2mode{display:none;position:absolute;right:154px;bottom:74px;min-width:64px;height:42px;padding:0 10px;background:rgba(21,25,27,.8);border:1px solid var(--line);color:var(--fg);border-radius:8px;font-size:13px;touch-action:none}#lf2mode[aria-pressed="true"]{background:var(--amber);color:#1b1b1b}' +
    '@media (pointer:coarse){#lf2mode:not([hidden]){display:block}.lf2hint{bottom:176px}}';
  document.head.appendChild(css);
  const h = document.createElement('div'); h.id = 'lf2hint'; h.className = 'lf2hint'; h.hidden = true; stage.appendChild(h);
  const b = document.createElement('button'); b.type = 'button'; b.id = 'lf2mode'; b.textContent = 'Crouch'; b.hidden = true; b.setAttribute('aria-label', 'Crouch: push past people and search barrels'); b.setAttribute('aria-pressed', 'false'); stage.appendChild(b);
  b.addEventListener('pointerdown', e => { e.preventDefault(); const p = game.player && game.player.player; if (p) { lf2ToggleCrouch(p); lf2SyncModeBtn(); } });
  setInterval(() => {
    const n = game.player, t = n && !(typeof talkUI !== 'undefined' && talkUI && talkUI.o) ? lf2HintText(n) : '';
    if (h.textContent !== t) h.textContent = t; h.hidden = !t;
    lf2SyncModeBtn();
  }, 200);
})();
