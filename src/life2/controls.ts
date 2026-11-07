/* ================= life2 / controls: hold a key to change what walking into something does =================
   Walk into it     -> the obvious thing: talk, search a crate, buy at a counter, fell a tree ...
   hold Space       -> PUSH: crates, barrels and people are shoved along like furniture. Harmless: no crime, no gossip.
                       (Step back while holding it and you pull a crate after you.)
   hold Shift       -> SNEAK: pick a pocket, steal, pick a lock, wreck an oven
   hold E (or tap)  -> HELP / USE: lend a hand, give, wake someone, knock, look
   hold R           -> ROUGH: the hostile shove, with all its consequences
   tap C            -> follow whoever is in front of you          tap Z -> sleep, when you are in the cells
   On a touch screen the Mode button cycles through these.                                                       */
const LF2_MODS: any[] = [
  { id: 'push', key: 'Space', name: 'Push', hold: true, match: e => e.code === 'Space' },
  { id: 'take', key: 'Shift', name: 'Sneak', hold: true, match: e => e.key === 'Shift' },
  { id: 'help', key: 'E', name: 'Help', hold: true, tap: true, match: e => e.code === 'KeyE' },
  { id: 'rough', key: 'R', name: 'Rough', hold: true, match: e => e.code === 'KeyR' },
  { id: 'follow', key: 'C', name: 'Follow', tap: true, match: e => e.code === 'KeyC' },
  { id: 'rest', key: 'Z', name: 'Rest', tap: true, match: e => e.code === 'KeyZ' },
];
const lf2ModOf = e => LF2_MODS.find(m => m.match(e));

/* which verb belongs to which key (the verbs themselves are added by the hooks in town.ts, law.ts, daily-life.ts ...) */
function lf2VerbMod(label: string): string {
  if (/^(Pick their pocket|Pick the lock|Pick the cell lock|Steal|Wreck)/.test(label)) return 'take';
  if (/^Rough/.test(label)) return 'rough';
  if (/^Follow/.test(label)) return 'follow';
  if (/^Sleep until/.test(label)) return 'rest';
  if (/^(Push it|Pull it)/.test(label)) return 'push';
  if (/^(Talk|Search it|Buy something)/.test(label)) return 'walk';       // what walking into it already does
  return 'help';
}
const lf2VerbSpec = (v, x, y) => ({ key: 'v:' + v.label + ':' + x + ',' + y, min: v.min, text: v.text, tool: v.tool, run: v.f });
/* of the verbs on a key, the one that fits the moment: help on a sleeper wakes them, on someone at work lends a hand, on someone hungry gives food */
function lf2PickVerb(n, list, mod, o) {
  const c = list.filter(v => v.mod === mod); if (!c.length) return null;
  if (mod === 'help' && o) {
    const by = l => c.find(v => v.label === l);
    if (o.pose === 'sleep') return by('Wake them up') || c[0];
    const st = o.plan && o.plan[o.si];
    if (st && st.act === 'work' && by('Lend a hand')) return by('Lend a hand');
    if (o.hunger >= 55 && by('Give some food')) return by('Give some food');
    if ((o.coin || 0) < 5 && by('Give 5 denarii')) return by('Give 5 denarii');
    return by('Inspect') || c[0];
  }
  return c[0];
}

/* ---------------- what is held ---------------- */
const lf2Held = p => p.held || (p.held = []);
function lf2SetMod(p, id, on) { const h = lf2Held(p), i = h.indexOf(id); if (on && i < 0) h.push(id); if (!on && i >= 0) h.splice(i, 1); p.push = h.includes('push'); }
const lf2ActiveMod = p => { const h = p.held; return h && h.length ? h[h.length - 1] : null; };

/** The action for walking into tile (fx, fy) while a key other than Space is held (null when there is nothing for that key to do). */
function lf2ModAct(n, p, fx, fy, occ) {
  const m = lf2ActiveMod(p); if (!m || m === 'push') return null;
  const v = lf2PickVerb(n, lf2Verbs(n, fx, fy).list, m, occ || lf2Occ(fx, fy, n));
  return v ? lf2VerbSpec(v, fx, fy) : null;
}
/** Tap a key (E, C, Z) while standing still facing something: do that thing now. */
function lf2Tap(n, id) {
  const p = n.player; if (!p || p.sleeping || p.act || n.moving || (typeof talkUI !== 'undefined' && talkUI.o) || playerDir(p)) return false;
  const { x, y } = lf2Front(n), o = lf2Occ(x, y, n), v = lf2PickVerb(n, lf2Verbs(n, x, y).list, id, o);
  if (!v) { if (id === 'help') lf2Say(n, 'Nothing to help with here.'); return id === 'help'; }
  lf2Do(n, lf2VerbSpec(v, x, y)); return true;
}
/** Space + stepping back from the crate you were facing pulls it after you. */
function lf2TryPull(n, pf, dx, dy) {
  if (dx !== -pf.dx || dy !== -pf.dy) return false;
  const pr = lfPropAt(n.tx + pf.dx, n.ty + pf.dy); if (!pr) return false;
  lf2Pull(n, pr); return true;
}

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

/* ---------------- the hint line ---------------- */
function lf2HintText(n) {
  const p = n.player; if (!p || p.sleeping) return '';
  if (p.act && p.act.auto) return '';
  if (p.follow) { const o = byId(p.follow); return o ? 'Following ' + o.first + ' · move to stop' : ''; }
  const { x, y } = lf2Front(n), o = lf2Occ(x, y, n), pr = lfPropAt(x, y), v = lf2Verbs(n, x, y), parts: string[] = [];
  if (o && o.pose !== 'sleep') parts.push('Walk: talk to ' + o.first);
  else if (pr) parts.push('Walk: search the ' + LF_NOUN[pr.kind]);
  if (o ? o.pose !== 'sleep' : !!pr) parts.push('Space: push');
  for (const m of LF2_MODS) { if (m.id === 'push') continue; const it = lf2PickVerb(n, v.list, m.id, o); if (it) parts.push(m.key + ': ' + lf2Low(it.label).toLowerCase()); }
  if (!parts.length) return '';
  return (v.title && !o ? v.title + ' · ' : '') + parts.join(' · ');
}

/* ---------------- keys ---------------- */
window.addEventListener('keydown', e => {
  if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
  const m = lf2ModOf(e); if (!m) return;
  const n = game.player, p = n && n.player; if (!p) return;
  if (m.id === 'push') e.preventDefault();                                     // Space must not scroll the page or press a focused button
  if (m.hold && !lf2Held(p).includes(m.id)) { lf2SetMod(p, m.id, true); if (m.id === 'push') p.lock = false; }
  if (m.tap && !e.repeat && lf2Tap(n, m.id)) e.preventDefault();
}, true);
window.addEventListener('keyup', e => { const m = lf2ModOf(e); if (!m || !m.hold) return; const p = game.player && game.player.player; if (p) lf2SetMod(p, m.id, false); });
window.addEventListener('blur', () => { const p = game.player && game.player.player; if (p) { p.held = []; p.push = false; } });
window.addEventListener('keydown', e => { const n = game.player; if (n && n.player && KEYDIR && (KEYDIR[e.key] || KEYDIR[(e.key || '').toLowerCase()])) n.player.follow = null; }, true);

/* ---------------- touch: a Mode button that cycles through the keys, and the hint line ---------------- */
const LF2_TOUCH_CYCLE = [null, 'push', 'take', 'help', 'rough'];
function lf2SyncModeBtn() {
  const b = document.getElementById('lf2mode'); if (!b) return;
  const p = game.player && game.player.player; b.hidden = !p;
  const m = p ? lf2ActiveMod(p) : null, def = LF2_MODS.find(x => x.id === m);
  b.textContent = def ? def.name : 'Walk'; b.setAttribute('aria-pressed', m ? 'true' : 'false');
}
(function () {
  const stage = canvas.parentNode; if (!stage) return;
  const css = document.createElement('style');
  css.textContent = '.lf2hint{position:absolute;left:50%;bottom:92px;transform:translateX(-50%);background:rgba(21,25,27,.78);color:#e8e4da;font-size:12px;padding:4px 12px;border-radius:999px;pointer-events:none;white-space:nowrap;max-width:92%;overflow:hidden;text-overflow:ellipsis;z-index:4}' +
    '#lf2mode{display:none;position:absolute;right:154px;bottom:74px;min-width:64px;height:42px;padding:0 10px;background:rgba(21,25,27,.8);border:1px solid var(--line);color:var(--fg);border-radius:8px;font-size:13px;touch-action:none}#lf2mode[aria-pressed="true"]{background:var(--amber);color:#1b1b1b}' +
    '@media (pointer:coarse){#lf2mode:not([hidden]){display:block}.lf2hint{bottom:176px}}';
  document.head.appendChild(css);
  const h = document.createElement('div'); h.id = 'lf2hint'; h.className = 'lf2hint'; h.hidden = true; stage.appendChild(h);
  const b = document.createElement('button'); b.type = 'button'; b.id = 'lf2mode'; b.textContent = 'Walk'; b.hidden = true; b.setAttribute('aria-label', 'Interaction mode: walk, push, sneak, help, rough'); b.setAttribute('aria-pressed', 'false'); stage.appendChild(b);
  b.addEventListener('pointerdown', e => {
    e.preventDefault(); const p = game.player && game.player.player; if (!p) return;
    const cur = lf2ActiveMod(p), nx = LF2_TOUCH_CYCLE[(LF2_TOUCH_CYCLE.indexOf(cur) + 1) % LF2_TOUCH_CYCLE.length];
    p.held = nx ? [nx] : []; p.push = nx === 'push'; if (nx === 'push') p.lock = false; lf2SyncModeBtn();
  });
  setInterval(() => {
    const n = game.player, t = n && !(typeof talkUI !== 'undefined' && talkUI && talkUI.o) ? lf2HintText(n) : '';
    if (h.textContent !== t) h.textContent = t; h.hidden = !t;
    lf2SyncModeBtn();
  }, 200);
})();
