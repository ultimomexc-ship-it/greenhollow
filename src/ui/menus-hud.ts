/* ---------- talking with someone: a proper conversation ---------- */
const talkUI = { o: null, say: '', q: '', prev: '2', opts: [], dy: 0 };
function openTalk(o) {
  const n = game.player; if (!n || !o || o.dead) return;
  if (o.age < 3 || o.infant || o.pose === 'sleep') { playerSay(n, o.pose === 'sleep' ? o.first + ' is asleep.' : o.first + ' gurgles.'); return; }
  if (!talkUI.o) { const cur: any = document.querySelector('[data-speed][aria-pressed="true"]'); talkUI.prev = cur ? cur.dataset.speed : '2'; const ps: any = document.querySelector('[data-speed="0"]'); if (ps) ps.click(); }
  if (PT.s) ptEnd();
  const r = ptBegin(o, n);   // the same engine the villagers use (talk/player.ts)
  talkUI.o = o; talkUI.q = '';
  o.talkUntil = game.time + 1e6; faceTo(o, n); faceTo(n, o); if (o.moving) o.pose = 'stand';
  if (n.player) n.player.keys = {};
  talkUI.say = r.say; talkUI.opts = r.opts; renderTalk();
}
function closeTalk() {
  const o = talkUI.o; if (!o) return; if (typeof ptEnd === 'function') ptEnd(); talkUI.o = null; el('talk').hidden = true; talkS = null; if (typeof refreshMarks === 'function') refreshMarks();
  o.talkUntil = game.time + 3; const n = game.player; if (n) { o.social = Math.min(100, o.social + 12); n.social = Math.min(100, n.social + 12); }
  pairCool.set(Math.min(n ? n.id : 0, o.id) * 1000 + Math.max(n ? n.id : 0, o.id), game.time + 60);
  const b: any = document.querySelector('[data-speed="' + talkUI.prev + '"]'); if (b) b.click();
  hudSig = ''; canvas.focus({ preventScroll: true });
}
function talkPick(key, label) {
  if (!talkUI.o || !talkS) return;
  const r: any = talkS.custom ? (key === 'bye' ? null : lf2TalkStep(key)) : ptStep(key);   // (a stall's own menu, or the conversation engine)
  if (!r || r.close) { closeTalk(); return; }
  if (r.say !== undefined) { talkUI.say = r.say; talkUI.q = r.you || label || ''; }
  talkUI.opts = r.opts; renderTalk();
}
/* ---------- every menu works with WASD: W and S move, D picks, A backs out (the mouse still works too) ---------- */
function menuNav(e, list, back) {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  const k = (e.key || '').toLowerCase(); e.preventDefault(); e.stopImmediatePropagation();
  if (e.repeat) return true;   /* a key still held from walking does nothing here */
  const L = list.filter(b => b && b.offsetParent !== null), i = L.indexOf(document.activeElement);
  const mark = b => { L.forEach(x => x.classList.toggle('kf', x === b)); if (b) { b.focus({ preventScroll: true }); b.scrollIntoView({ block: 'nearest' }); } };
  if (k === 'w' || k === 'arrowup' || k === 's' || k === 'arrowdown') { if (L.length) mark(L[i < 0 ? 0 : (i + (k === 'w' || k === 'arrowup' ? -1 : 1) + L.length) % L.length]); return true; }
  if (k === 'd' || k === 'arrowright' || k === 'enter' || k === ' ') { const b = i >= 0 ? L[i] : L[0]; if (b) b.click(); else if (back) back(); return true; }
  if ((k === 'a' || k === 'arrowleft' || k === 'escape') && back) { back(); return true; }
  if (/^[1-9]$/.test(k) && L[+k - 1]) { L[+k - 1].click(); return true; }
  return true; }
function menuFirst(root, sel) { const b = root && root.querySelector(sel); if (b) { b.classList.add('kf'); b.focus({ preventScroll: true }); } }
function renderTalk() {
  const o = talkUI.o, n = game.player, box = el('talk'); if (!o || !n) return;
  const a = Math.max(-100, Math.min(100, o.aff[n.id] || 0)), k = o.know[n.id] || 0;
  const tr = o.traits.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ');
  box.hidden = false;
  box.innerHTML = '<div class="tk"><div class="th"><div class="nm"><b>' + esc(nameOf(o)) + '</b><small>' + esc(closenessWord(o, n)) + '</small></div>' +
    '<small class="kh">W S choose · D pick</small><button type="button" class="lv" data-leave="1" title="Leave (A)">Leave <i>A</i></button></div>' +
    (talkUI.q ? '<div class="tq">' + esc(talkUI.q) + '</div>' : '') + '<div class="ta">' + esc(cvSpeak(talkUI.say)) + '</div>' +
    '<div class="topts">' + talkUI.opts.map((op, i) => '<button type="button" data-k="' + esc(op[0]) + '""><span>' + (i + 1) + '</span>' + esc(cvSpeak(op[1])) + '</button>').join('') + '</div></div>';
  { const tk: any = box.querySelector('.tk'); talkUI.dy = tk ? (tk.offsetHeight / 2 + 10) / (TS * cam.z) : 0; }
  box.querySelectorAll('[data-k]').forEach((b: any) => b.addEventListener('click', () => talkPick(b.dataset.k, b.textContent.replace(/^\d+/, ''))));
  const lv: any = box.querySelector('[data-leave]'); if (lv) lv.addEventListener('click', () => closeTalk());
  menuFirst(box, '[data-k]');
}
window.addEventListener('keydown', e => {
  if (!talkUI.o || typing(e)) return;
  menuNav(e, [...el('talk').querySelectorAll('[data-k]')], closeTalk);
}, true);

/* ---------- a nudge at supper time ---------- */
function mealNudge() {
  const n = game.player, p = n && n.player; if (!p || p.sleeping || !n.homeRoom) return;
  const tod = game.time % 1440, day = Math.floor(game.time / 1440);
  if (tod < 17 * 60 + 35 || tod > 18 * 60 + 10 || p.mealNote === day) return;
  if (hhOf(n).filter(o => !o.infant).length < 2 || !foodCount(pantryOf(n))) return;
  p.mealNote = day; const r = n.homeRoom, far = Math.abs(n.tx - (r.x + r.w / 2)) + Math.abs(n.ty - (r.y + r.h / 2)) > 6;
  game.events.push({ time: game.time, a: n, b: n, place: '', topic: 'greet', quiet: true, lines: [{ who: n, text: far ? anyOf(['Oh! Supper at home soon. Better head back.', 'Nearly six. The family will be sitting down to eat.', 'My stomach says it is supper time at ' + r.name + '.']) : anyOf(['Supper soon. I can smell it.', 'Time to sit down with the family.']) }] });
}

/* ---------- you are always Tipping ---------- */
/* ---------- succession: pick who you become ---------- */
function showSuccession() {
  const s = town.succession; if (!s) return;
  const cur: any = document.querySelector('[data-speed][aria-pressed="true"]'); s.prevSpeed = cur ? cur.dataset.speed : '2';
  const pz: any = document.querySelector('[data-speed="0"]'); if (pz) pz.click();
  let box = el('heirBox'); if (!box) { box = document.createElement('div'); box.id = 'heirBox'; document.body.appendChild(box); }
  box.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(6,8,10,.82);display:flex;align-items:center;justify-content:center;padding:16px';
  const cards = s.cands.map(c => { const o = byId(c.id); if (!o) return '';
    const kind = /son|daughter/.test(c.k || '') ? 'child' : /wife|husband|sweetheart/.test(c.k || '') ? 'partner' : /brother|sister/.test(c.k || '') ? 'sibling' : 'friend';
    const line = s.swap ? ['You can almost hear ' + o.first + '\'s heartbeat.', 'For a moment you see the valley through ' + o.first + '\'s eyes.', 'You smell ' + o.first + '\'s home, warm and familiar.'][(o.id + s.rec.id) % 3] : HEIR_LINES[kind][(o.id + s.rec.id) % HEIR_LINES[kind].length];
    const rel = c.k ? `${s.rec.first}'s ${c.k}` : ((s.person.aff[o.id] || 0) >= 50 ? `${s.rec.first}'s dear friend` : `a friend of ${s.rec.first}`);
    return `<button class="heirCard" data-heir="${o.id}" style="flex:1 1 200px;max-width:240px;text-align:left;background:#1d2326;border:1px solid #3a4448;border-radius:10px;padding:14px;color:#efe9da;cursor:pointer;font:inherit">
      <div style="font:600 18px var(--font-body,sans-serif)">${esc(nameOf(o))}</div>
      <div style="opacity:.75;font-size:13px;margin:2px 0 8px">${esc(rel)} · ${o.age} years old${o.age < 16 ? ' (still a child)' : o.age >= 60 ? ' (an elder)' : ''}</div>
      <div style="font-size:13px;opacity:.85">${esc((o.traits || []).join(', '))}</div>
      <div style="font-size:13px;margin-top:8px;font-style:italic;color:#e8d9a8">"${esc(line)}"</div></button>`; }).join('');
  if (s.swap) { if (!el('dreamCss')) { const st = document.createElement('style'); st.id = 'dreamCss'; st.textContent = '@keyframes dreamSwirl{0%{filter:hue-rotate(0deg) blur(0)}50%{filter:hue-rotate(160deg) blur(1px)}100%{filter:hue-rotate(360deg) blur(0)}}'; document.head.appendChild(st); }
    box.style.background = 'radial-gradient(circle at 30% 30%, rgba(150,90,230,.75), rgba(20,10,40,.92) 60%), radial-gradient(circle at 70% 70%, rgba(80,200,190,.5), transparent 50%)'; box.style.animation = 'dreamSwirl 6s linear infinite'; }
  else { box.style.animation = ''; }
  box.innerHTML = `<div style="max-width:780px;width:100%;text-align:center;color:#efe9da">
    <div style="font:600 13px var(--font-body,sans-serif);letter-spacing:.12em;opacity:.6">${s.swap ? 'A DREAMCAP' : 'GENERATION ' + ((town.line && town.line.gen) || 1) + ' ENDS'}</div>
    <div style="font:600 24px var(--font-body,sans-serif);margin:6px 0 4px">${s.swap ? 'The trees lean in, and the world begins to swirl...' : esc(s.rec.name) + ' has died, aged ' + s.rec.age + '.'}</div>
    <div style="opacity:.8;margin-bottom:18px">${s.swap ? 'Whose life do you dream of?' : 'Who carries the story on?'}</div>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">${cards}</div>${s.swap ? '<button data-heir="stay" class="btn" style="margin-top:16px">Shake it off and wake up as yourself</button>' : ''}</div>`;
  box.hidden = false;
  setTimeout(() => menuFirst(box, '[data-heir]'), 0);
  box.querySelectorAll('[data-heir]').forEach((b: any) => b.addEventListener('click', () => { const sp = s.prevSpeed; box.style.display = 'none'; box.innerHTML = ''; chooseHeir(b.dataset.heir === 'stay' ? 'stay' : +b.dataset.heir); const bb: any = document.querySelector('[data-speed="' + (sp && sp !== '0' ? sp : '2') + '"]'); if (bb) bb.click(); }));
}
function chooseTipping() {
  if (town.scenario === 'hamlet' && town.hamletPlayer) { const q = byId(town.hamletPlayer); if (q && canControl(q)) { if (q.first !== 'Tipping') { town.used && town.used.add && town.used.add('Tipping'); q.first = 'Tipping'; } town.tippingId = q.id; return q; } }   // (the hamlet's settler is made on purpose)
  const c = npcs.filter(n => canControl(n) && n.age >= 20 && n.age <= 36);
  const pool = c.filter(n => n.homeRoom && hhOf(n).length >= 2 && !n.female).concat(c.filter(n => !n.female), c, npcs.filter(canControl));
  const t = pool[0]; if (!t) return null;
  if (t.first !== 'Tipping') { town.used && town.used.add && town.used.add('Tipping'); t.first = 'Tipping'; }
  town.tippingId = t.id; return t;
}
/* ---------- on-screen clock and what is coming up ---------- */
let clockSig = '';
function relWhen(t) {
  const d = t - game.time; if (d <= 1) return 'now';
  if (d < 60) return 'in ' + Math.round(d) + ' min';
  const day0 = Math.floor(game.time / 1440), day1 = Math.floor(t / 1440);
  if (day1 === day0) return 'today ' + fmtTime(t);
  if (day1 === day0 + 1) return 'tomorrow ' + fmtTime(t);
  return 'in ' + (day1 - day0) + ' days';
}
function drawClock(now) {
  if (!el('clock') || now - ((drawClock as any).t || 0) < 400) return; (drawClock as any).t = now;
  const t = game.time, tod = t % 1440, h = tod / 60, part = h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night';
  const head = fmtTime(t) + '<small>Year ' + yearOf(t) + ' · Day ' + dayOfYear(t) + ' · ' + part + (isRestDay() ? ' · rest day' : '') + '</small>';
  const ups = (typeof calUpcoming === 'function' ? calUpcoming() : []).filter((e, i, arr) => e.kind !== 'rest' || arr.findIndex(x => x.kind === 'rest') === i).slice(0, 3);
  const items = ups.map(e => '<li><b>' + (CALICON[e.kind] || '•') + '</b>' + esc(e.text) + ' · ' + (e.soon ? 'soon' : relWhen(e.time)) + '</li>').join('');
  const sig = head + items; if (sig === clockSig) return; clockSig = sig;
  el('clockT').innerHTML = head; el('clockE').innerHTML = items;
}

window.addEventListener('keydown', e => { const box = el('heirBox'); if (!box || box.hidden || box.style.display === 'none' || !box.querySelector('[data-heir]')) return; menuNav(e, [...box.querySelectorAll('[data-heir]')], null); }, true);

