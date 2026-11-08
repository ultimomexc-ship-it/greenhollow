/* ---------- tabs ---------- */
function setTab(t) {
  state.tab = t;
  document.querySelectorAll('[data-tab]').forEach((b: any) => b.setAttribute('aria-pressed', b.dataset.tab === t ? 'true' : 'false'));
  ['people', 'chron', 'cal', 'chat', 'town', 'market', 'stories'].forEach(k => { const e = el('tab-' + k); if (e) e.hidden = k !== t; });
  if (t === 'stories' && typeof lf2Stories === 'function') lf2Stories(true);
  if (t === 'market') updateMarket(true); if (t === 'chron') updateChron(true); if (t === 'cal') buildCal(true); if (t === 'town') buildTown(true);
}
document.querySelectorAll('[data-tab]').forEach((b: any) => b.addEventListener('click', () => setTab(b.dataset.tab)));
el('goYard').addEventListener('click', () => { const g = town.graveyard.w ? town.graveyard : (town.church || { x: town.cx, y: town.cy, w: 1, h: 1 }); setFollow(false); cam.z = Math.max(cam.z, cam.fit * 2.2); centerOn(g.x + g.w / 2, g.y + g.h / 2); });
el('goSquare').addEventListener('click', () => { setFollow(false); cam.z = Math.max(cam.z, cam.fit * 2.2); centerOn(town.cx, town.cy); });

/* ---------- controls ---------- */
document.querySelectorAll('[data-speed]').forEach((b: any) => b.addEventListener('click', () => {
  state.speed = +b.dataset.speed;
  document.querySelectorAll('[data-speed]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
}));
document.querySelectorAll('[data-size]').forEach((b: any) => b.addEventListener('click', () => {
  state.size = b.dataset.size;
  document.querySelectorAll('[data-size]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  newTown(String(Math.floor(Math.random() * 1000000)));
}));
const dayNo = () => Math.floor(game.time / 1440);
function skipTo(min) { fastForward(min); bubbles.length = 0; updateUI(true); updateMarket(true); }
el('strip').addEventListener('click', e => {
  const r = el('strip').getBoundingClientRect();
  skipTo(dayNo() * 1440 + Math.max(0, Math.min(0.999, (e.clientX - r.left) / r.width)) * 1440);
});
el('strip').addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') skipTo(game.time + 30); else return;
  e.preventDefault();
});
let skipping = false;
document.querySelectorAll('.skip').forEach((b: any) => b.addEventListener('click', () => {
  if (skipping) return; skipping = true; const all = document.querySelectorAll('.skip'); all.forEach((x: any) => x.disabled = true);
  const pn = game.player; if (pn) releasePlayer();
  const yrs = +b.dataset.y, target = game.time + yrs * YEAR, label = b.textContent; let done = 0;
  const step = () => {
    if (game.time >= target - 1) { bubbles.length = 0; updateUI(true); buildTown(true); all.forEach((x: any) => x.disabled = false); b.textContent = label; skipping = false; if (pn && canControl(pn)) startPlaying(pn); else if (pn) { buildCard(); } return; }
    b.textContent = 'Y' + (done) + '/' + yrs + '…'; fastForward(Math.min(target, game.time + YEAR / 2)); done = Math.round((game.time - (target - yrs * YEAR)) / YEAR * 10) / 10; updateUI(true); setTimeout(step, 10);
  };
  setTimeout(step, 20);
}));
el('routes').addEventListener('change', e => { view.showRoutes = (e.target as any).checked; });
function seedFrom(text) { const t = String(text).trim(); if (!t) return Math.floor(Math.random() * 1e6); return /^\d+$/.test(t) ? (+t) >>> 0 : hashStr(t); }
function newTown(seedText?) {
  const raw = seedText === undefined ? String(Math.floor(Math.random() * 1000000)) : seedText;
  (el('seed') as any).value = raw;
  loadTown(seedFrom(raw), state.size);
  bubbles.length = 0; pops.length = 0; tradeSeen = 0; chronSeen = 0; cardSig = ''; mktSig = ''; chronSig = ''; townSig = '';
  el('chat').innerHTML = ''; el('chatEmpty').hidden = false;
  view.hover = null; view.selected = null; cam.follow = false; el('zfol').setAttribute('aria-pressed', 'false');
  buildStatic(); sizeCanvas(); fitCam(); cam.z = Math.max(cam.fit, 1.15); centerOn(town.cx, town.cy); clampCam();
  buildRoster(); buildTown(true); select(npcs.find(n => n.adult) || npcs[0]); updateUI(true); updateMarket(true);
  if (typeof sbPresim === 'function') { SB.count = {}; SB.pair = new Map(); sbPresim(); }      // the village's life before the player arrives
  { const pn = chooseTipping(); if (pn) { lifeStepOutside(pn); startPlaying(pn); } }
  el('legend').textContent = W + '×' + H + ' · ' + { S: 'small', M: 'medium', L: 'large' }[state.size];
}
el('newTown').addEventListener('click', () => newTown(String(Math.floor(Math.random() * 1000000))));
el('seedForm').addEventListener('submit', e => { e.preventDefault(); newTown((el('seed') as any).value); });

/* ---------- camera: drag, wheel, pinch, keys, buttons ---------- */
const ptrs = new Map(); let dragMoved = 0, pinch0 = 0;
const localXY = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
const worldTile = p => ({ x: (cam.x + p.x / cam.z) / TS, y: (cam.y + p.y / cam.z) / TS });
function hideHint() { el('maphint').classList.add('gone'); }
function setFollow(on) { cam.follow = on; el('zfol').setAttribute('aria-pressed', on ? 'true' : 'false'); }
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, localXY(e)); dragMoved = 0;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); }
});
canvas.addEventListener('pointermove', e => {
  const p = localXY(e);
  if (ptrs.has(e.pointerId)) {
    const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, p);
    if (ptrs.size === 1) {
      const dx = p.x - prev.x, dy = p.y - prev.y; dragMoved += Math.abs(dx) + Math.abs(dy);
      if (dragMoved > 5) { cam.x -= dx / cam.z; cam.y -= dy / cam.z; clampCam(); canvas.classList.add('dragging'); setFollow(false); hideHint(); }
    } else if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch0 > 0) zoomAt(d / pinch0, (a.x + b.x) / 2, (a.y + b.y) / 2); pinch0 = d; dragMoved = 99; hideHint();
    }
  } else { const w = worldTile(p); view.hover = npcAt(w.x, w.y); canvas.style.cursor = view.hover ? 'pointer' : ''; showTip(p, view.hover || (tsActive() && !tsSees(Math.floor(w.x), Math.floor(w.y)) && !(TSIGHT.hits && TSIGHT.hits.has(Math.floor(w.x) + ',' + Math.floor(w.y)))) ? null : tileTip(Math.floor(w.x), Math.floor(w.y))); }   // no tips about what you cannot see
});
canvas.addEventListener('pointerleave', () => showTip(null, null));
function showTip(p, html) {
  const t = el('tip'); if (!html || !p) { t.hidden = true; return; }
  if (t.innerHTML !== html) t.innerHTML = html;
  t.hidden = false; const w = t.offsetWidth, h = t.offsetHeight;
  t.style.left = Math.max(4, Math.min(cam.cw - w - 4, p.x + 14)) + 'px'; t.style.top = Math.max(4, Math.min(cam.ch - h - 4, p.y + 14)) + 'px';
}
function tileTip(x, y) {
  if (!town || x < 0 || y < 0 || x >= W || y >= H) return null;
  const g = grid[y][x];
  if (g === T.TENT) { const t = (town.tents || []).find(q => q.x === x && q.y === y); return '<b>Tent</b><br>' + (t && t.owner ? esc(t.owner.first) + ' is sleeping here' : 'Free. Anyone may use it.'); }
  return null;
}
function endPtr(e) {
  const had = ptrs.has(e.pointerId); ptrs.delete(e.pointerId); canvas.classList.remove('dragging');
  if (had && e.type === 'pointerup' && dragMoved <= 5 && ptrs.size === 0) { const w = worldTile(localXY(e)), n = npcAt(w.x, w.y); if (n) { select(n); setTab('people'); } }
  if (ptrs.size < 2) pinch0 = 0;
}
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('pointerleave', () => { view.hover = null; });
canvas.addEventListener('wheel', e => { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)), localXY(e).x, localXY(e).y); hideHint(); }, { passive: false });
canvas.addEventListener('keydown', e => {
  if (game.player) return;
  const s = 60 / cam.z; let used = true;
  if (e.key === 'ArrowLeft') cam.x -= s; else if (e.key === 'ArrowRight') cam.x += s; else if (e.key === 'ArrowUp') cam.y -= s; else if (e.key === 'ArrowDown') cam.y += s;
  else if (e.key === '+' || e.key === '=') zoomAt(1.25, cam.cw / 2, cam.ch / 2); else if (e.key === '-') zoomAt(0.8, cam.cw / 2, cam.ch / 2); else if (e.key === '0') fitCam(); else used = false;
  if (used) { e.preventDefault(); clampCam(); setFollow(false); hideHint(); }
});
el('zin').addEventListener('click', () => { zoomAt(1.35, cam.cw / 2, cam.ch / 2); hideHint(); });
el('zout').addEventListener('click', () => { zoomAt(1 / 1.35, cam.cw / 2, cam.ch / 2); hideHint(); });
function setFs(on) {
  const was = document.body.classList.contains('fs');
  document.body.classList.toggle('fs', on);
  // full screen starts two zoom steps closer than the windowed view; leaving puts the old zoom back
  if (on && !was) { cam.zPrev = cam.z; const z = Math.min(camMax(), cam.z * 1.35 * 1.35); requestAnimationFrame(() => { cam.z = z; if (typeof clampCam === 'function') clampCam(); }); cam.z = z; }
  else if (!on && was && cam.zPrev) { const z = cam.zPrev; cam.zPrev = null; cam.z = z; requestAnimationFrame(() => { cam.z = z; if (typeof clampCam === 'function') clampCam(); }); }
  try { if (on && !document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); else if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch (e) {}
  canvas.style.height = ''; if (town) { sizeCanvas(); requestAnimationFrame(() => { sizeCanvas(); }); }
  canvas.focus({ preventScroll: true });
}
el('zfs').addEventListener('click', () => setFs(!document.body.classList.contains('fs')));
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.body.classList.contains('fs')) setFs(false); });
window.addEventListener('keydown', e => { if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return; if ((e.key === 'l' || e.key === 'L') && town) { STYLE.light = !STYLE.light; e.preventDefault(); return; } if ((e.key === 'g' || e.key === 'G') && town) { STYLE.soft = !STYLE.soft; markDirty(0, 0, W, H); e.preventDefault(); return; } if (e.key === 'f' || e.key === 'F') { setFs(!document.body.classList.contains('fs')); e.preventDefault(); } else if (e.key === 'Escape' && document.body.classList.contains('fs') && !talkUI.o) { setFs(false); e.stopImmediatePropagation(); } }, true);
el('zfit').addEventListener('click', () => { fitCam(); setFollow(false); });
el('zfol').addEventListener('click', () => { if (!view.selected) return; setFollow(!cam.follow); if (cam.follow && cam.z < cam.fit * 1.6) cam.z = Math.min(camMax(), cam.fit * 2); });

let lastUI = 0;
function updateUI(force) {
  const now = performance.now();
  if (!force && now - lastUI < 200) return;
  lastUI = now;
  const d = dayNo();
  el('clock').textContent = fmtTime(game.time);
  el('dayline').textContent = 'Year ' + yearOf(game.time) + ' · day ' + dayOfYear(game.time) + ' of 3' + (isRestDay() ? ' · rest day' : '');
  checkNotice();
  el('mark').style.left = ((game.time % 1440) / 14.4) + '%';
  el('strip').setAttribute('aria-valuetext', fmtTime(game.time));
  if (rosterKey() !== rosterSig) buildRoster();
  rows.forEach((b, n) => { const s = b.querySelector('.st'), t = n.status; if (s.textContent !== t) s.textContent = t; });
  if (view.selected && view.selected.dead && el('cardLive')) buildCard();
  updateResBar(); updateHud(false); updateCard(false); updateMarket(false); updateChron(false); buildCal(false); buildTown(false); el('popCount').textContent = npcs.length as any;
}

/* ---------- playing a villager ---------- */
const KEYDIR = { w: 'up', a: 'left', s: 'down', d: 'right', ArrowUp: 'up', ArrowLeft: 'left', ArrowDown: 'down', ArrowRight: 'right' };
function startPlaying(n) {
  if (!takeControl(n)) return;
  select(n); setFollow(true); cam.z = Math.max(cam.z, Math.min(camMax(), cam.fit * 6)); hideHint();
  const b: any = document.querySelector('[data-speed="2"]'); if (b) b.click();
  canvas.focus({ preventScroll: true }); buildCard(); updateHud(true);
}
function stopPlaying() { closeTalk(); releasePlayer(); buildCard(); updateHud(true); }
const typing = e => /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || ''));
function steerAgain() { const t = byId(game.steer); if (!t || t.dead || !canControl(t) || town.succession || skipping) return null; startPlaying(t); return t.player || null; }
window.addEventListener('keydown', e => {
  if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
  const d = KEYDIR[e.key] || KEYDIR[(e.key || '').toLowerCase()]; if (!d) return;
  let p = game.player && game.player.player;
  if (!p && /^[wasdWASD]$/.test(e.key)) p = steerAgain();   // arrow keys keep panning the camera while nobody is steering
  if (!p) return;
  p.keys[d] = true; p.lastKey = performance.now(); setFollow(true); e.preventDefault();
});
window.addEventListener('keyup', e => { const p = game.player && game.player.player; if (!p) return; const d = KEYDIR[e.key] || KEYDIR[(e.key || '').toLowerCase()]; if (d) p.keys[d] = false; });
window.addEventListener('blur', () => { const p = game.player && game.player.player; if (p) p.keys = {}; });
document.querySelectorAll('#dpad button').forEach((b: any) => {
  const on = v => e => { let p = game.player && game.player.player; if (!p && v) p = steerAgain(); if (p) { p.keys[b.dataset.d] = v; p.lastKey = performance.now(); } e.preventDefault(); };
  b.addEventListener('pointerdown', on(true)); ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => b.addEventListener(t, on(false)));
});
let hudSig = '';
function updateHud(force) {
  if (game.playerNote) { const m = el('maphint'); m.textContent = game.playerNote; m.classList.remove('gone'); game.playerNote = null; setTimeout(() => m.classList.add('gone'), 6000); buildCard(); }
  const n = game.player, h = el('hud');
  el('dpad').hidden = !n;
  if (!n) { if (!h.hidden) { h.hidden = true; hudSig = ''; const mh = el('maphint'); if (mh) mh.style.bottom = ''; } return; }
  const p = n.player, full = Math.round(100 - n.hunger), tone = full < 25 ? 'bad' : full < 45 ? 'warn' : '';
  const hint = p.sleeping ? 'Sleeping. Press a movement key to get up.' : p.act ? p.act.text + '…' : n.hunger >= 60 && !foodSat(n.inv) ? 'Hungry: pick berries or fish, you eat automatically' : n.bladder >= 70 ? 'Bursting! Find a privy: walk into the seat inside one' : 'WASD to move · walk into things to use them · Q hand mode (Talk, Push, Search) · 1-9 belt · B bag';
  const sig = [full, JSON.stringify(n.inv), hint, n.status, Math.round((n.bladder || 0) / 4), Math.round((n.mood || 0) / 6)].join('|');
  if (!force && sig === hudSig) return; hudSig = sig; h.hidden = false;
  h.innerHTML = '<span><b>' + esc(nameOf(n)) + '</b></span><span>Fullness <span class="hbar ' + tone + '"><i style="width:' + Math.max(0, full) + '%"></i></span></span>' + lifeHud(n) + '<span class="hint">' + esc(hint) + '</span>';
  { const mh = el('maphint'); if (mh) mh.style.bottom = (h.offsetHeight + 18) + 'px'; }
}

/* let go of the keys for a while and your villager carries on alone, like everyone else */
const IDLE_MS = 25000;
function idleRelease(now) {
  const n = game.player, p = n && n.player; if (!p) return;
  const busy = state.speed === 0 || state.slowed || p.sleeping || p.act || p.summonGo || p.autoBed || n.moving || p.follow || n.jail || town.succession || (typeof talkUI !== 'undefined' && talkUI.o) || Object.values(p.keys).some(Boolean);
  if (busy) { p.lastKey = now; return; }
  if (now - (p.lastKey || (p.lastKey = now)) > IDLE_MS) { const nm = nameOf(n); stopPlaying(); game.playerNote = nm + ' carries on alone. Press W A S D to steer again.'; }
}
