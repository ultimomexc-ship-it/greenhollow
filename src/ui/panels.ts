/* ================= UI and main loop ================= */
const el = id => document.getElementById(id);
const state: any = { speed: 2, rate: 2, tab: 'people', size: 'L' };
const rows = new Map();
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
const GICON = { fish: 'fish', grain: 'grain', berries: 'berries', wood: 'timber', herbs: 'herbs' };
const clamp01 = v => Math.max(0, Math.min(1, v));
const yearOf = t => Math.floor(t / YEAR) + 1, dayOfYear = t => Math.floor((t % YEAR) / 1440) + 1;
const stamp = t => 'Y' + yearOf(t) + ' d' + dayOfYear(t);
const KINDCOL = { life: '#7fae5f', death: '#9aa39f', love: '#e58aa5', family: '#e0a93f', build: '#6fa3c8', note: '#9aa39f' };

/* ---------- roster ---------- */
let rosterSig = '';
function rosterKey() { return npcs.map(n => n.id + roleLabel(n) + n.age).join(','); }
function buildRoster() {
  const list = el('list'); list.innerHTML = ''; rows.clear(); rosterSig = rosterKey();
  npcs.slice().sort((a, b) => b.age - a.age).forEach(n => {
    const li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button'; b.className = 'row'; b.setAttribute('aria-pressed', n === view.selected ? 'true' : 'false');
    b.innerHTML = '<span class="sw"></span><span class="nm"></span><span class="st"></span>';
    (b.querySelector('.sw') as any).style.background = n.shirt;
    b.querySelector('.nm').innerHTML = esc(nameOf(n)) + '<small>' + esc(n.age < 16 ? lifeStage(n).toLowerCase() : roleLabel(n)) + ' · ' + n.age + '</small>';
    b.addEventListener('click', () => { select(n); centerOn(n.x, n.y); });
    li.appendChild(b); list.appendChild(li); rows.set(n, b);
  });
  el('popCount').textContent = npcs.length as any;
}
function select(n) {
  view.selected = n;
  rows.forEach((b, k) => b.setAttribute('aria-pressed', k === n ? 'true' : 'false'));
  buildCard();
}
const linkTo = n => '<a href="#" data-id="' + n.id + '">' + esc(n.first) + '</a>';
function famLinks() {
  const n = view.selected, by = id => id && byId(id), out = [];
  const grp = (label, arr) => { arr = arr.filter(Boolean); if (arr.length) out.push('<dt>' + label + '</dt><dd>' + arr.map(o => o.dead ? esc(o.first) + ' (late)' : linkTo(o)).join(', ') + '</dd>'); };
  const rec = id => { const p = by(id); if (p) return p; const r = town.dead.find(d => d.id === id); return r ? { first: r.first, dead: true } : null; };
  grp('Parents', [rec(n.fam.mother), rec(n.fam.father)]);
  grp(n.female ? 'Wife of' : 'Husband of', [n.fam.spouse && rec(n.fam.spouse)]);
  grp('Children', n.fam.kids.map(rec));
  grp('Siblings', npcs.filter(o => o !== n && n.rel[o.id] === 'sibling'));
  return out.length ? '<dl class="kv fam">' + out.join('') + '</dl>' : '<p class="sub">No family in town.</p>';
}
function friendList() {
  const n = view.selected;
  const f = npcs.filter(o => o !== n && (n.know[o.id] || 0) > 8).sort((a, b) => (n.aff[b.id] || 0) + (n.know[b.id] || 0) * .2 - (n.aff[a.id] || 0) - (n.know[a.id] || 0) * .2).slice(0, 5);
  return f.length ? '<ul class="plain">' + f.map(o => '<li>' + linkTo(o) + ' <span class="dim">' + esc((relLabel(n, o) || 'acquaintance').replace(o.first, '').replace(/\s+/g, ' ').trim().replace(/ (to|of)$/, ' $1 them')) + ' · knows ' + Math.round(n.know[o.id] || 0) + '%</span></li>').join('') + '</ul>' : '<p class="sub">Still meeting people.</p>';
}
function needBar(label, v, goodHigh, txt) {
  const f = clamp01(v / 100), tone = goodHigh ? (f < .2 ? 'bad' : f < .4 ? 'warn' : '') : (f > .8 ? 'bad' : f > .55 ? 'warn' : '');
  return '<div class="need"><span>' + label + '</span><div class="bar ' + tone + '"><i style="width:' + Math.round(f * 100) + '%"></i></div><b>' + (txt || Math.round(v)) + '</b></div>';
}
function buildCard() {
  const n = view.selected, card = el('card');
  if (!n) { card.innerHTML = '<h2>Villager</h2><p class="sub">Select a villager.</p>'; return; }
  if (n.dead) { card.innerHTML = '<h2>Villager</h2><h3>' + esc(nameOf(n)) + '</h3><p class="sub">Died aged ' + n.age + ' in ' + stamp(n.deathTime) + '. Buried in the churchyard.</p>'; return; }
  const bio = bioOf(n);
  card.innerHTML = '<h2>Villager</h2><h3>' + esc(nameOf(n)) + '</h3><p class="sub">' + esc(bio[0]) + '</p>' +
    // the "Play as" button is switched off: the '' && makes the condition always false
    // @ts-expect-error -- deliberately always false (see above)
    ('' && canControl(n) ? '<button type="button" class="btn primary" id="takeBtn" style="margin:4px 0 8px">Play as ' + esc(n.first) + '</button>' : '') + '<p class="bio">' + esc(bio.slice(2).join(' ')) + '</p><p class="sub">Home: ' + esc(n.homeRoom ? n.homeRoom.name : 'none yet, sleeping rough') + '</p>' + (n.age >= 6 ? '<p class="sub">Loves ' + esc(HOBBY_TXT[hobbyOf(n)]) + (n.pref ? ' · wants to be ' + esc(JOB_NOUN[n.pref]) : '') + '</p>' : '') + '<div id="cardLive"></div>';
  card.querySelectorAll('a[data-id]').forEach((a: any) => a.addEventListener('click', ev => { ev.preventDefault(); const o = byId(+a.dataset.id); if (o) { select(o); centerOn(o.x, o.y); } }));
  const tb = el('takeBtn'); if (tb) tb.addEventListener('click', () => { if (n.player) stopPlaying(); else startPlaying(n); });
  updateCard(true);
}
let cardSig = '';
function updateCard(force) {
  const n = view.selected; if (!n || n.dead) return;
  const live = el('cardLive'); if (!live) return;
  const inv = Object.entries<number>(n.inv).filter(([g, q]) => q > 0).map(([g, q]) => '<span class="chip">' + q + ' ' + (GICON[g] || g) + '</span>').join('');
  const pan = n.homeRoom ? pantryOf(n) : null, hh = hhOf(n).length;
  const pantry = pan ? FOODS.filter(g => pan[g] > 0).map(g => '<span class="chip dim">' + Math.round(pan[g]) + ' ' + GICON[g] + '</span>').join('') : '';
  const log = n.log.slice(-8).reverse().map(l => '<li><span>' + fmtTime(l.t) + '</span>' + esc(l.text) + '</li>').join('');
  const mood = n.mourning ? 'Grieving' : n.preg ? 'Expecting a baby' : '';
  const sig = [Math.round(n.hunger), Math.round(n.social), lifeSig(n), Math.round(n.coin), n.status, JSON.stringify(n.inv), JSON.stringify(pan), n.log.length, (n.mem || []).length, n.fam.spouse, n.fam.kids.length, npcs.length, Math.floor(game.time / 360)].join('|');
  if (!force && sig === cardSig) return; cardSig = sig;
  live.innerHTML = (mood ? '<p class="sub"><b style="color:var(--amber)">' + mood + '</b></p>' : '') +
    lifeBars(n) +
    (inv ? '<div class="chips" aria-label="Carrying">' + inv + '</div>' : '') +
    '<p class="sub" style="margin-top:8px">Pantry (' + hh + ' ' + (hh === 1 ? 'person' : 'people') + '): ' + (pantry ? '' : 'empty') + '</p>' + (pantry ? '<div class="chips" style="margin-top:0">' + pantry + '</div>' : '') +
    '<h2 class="gap">Family</h2>' + famLinks() + '<h2 class="gap">Knows best</h2>' + friendList() +
    ((n.mem || []).length ? '<h2 class="gap">Remembers</h2><ul class="log">' + n.mem.slice(-5).reverse().map(m => '<li><span>' + stamp(m.t) + '</span>' + esc(m.me.charAt(0).toUpperCase() + m.me.slice(1)) + '</li>').join('') + '</ul>' : '') +
    '<h2 class="gap">What they have been doing</h2><ul class="log">' + (log || '<li><span></span>Just woke up</li>') + '</ul>';
  live.querySelectorAll('a[data-id]').forEach((a: any) => a.addEventListener('click', ev => { ev.preventDefault(); const o = byId(+a.dataset.id); if (o) { select(o); centerOn(o.x, o.y); } }));
}

/* ---------- chronicle and town ---------- */
let chronSig = '';
function updateChron(force) {
  if (state.tab !== 'chron') return;
  const last = town.chron[town.chron.length - 1], sig = town.chron.length + '|' + (last ? last.time : 0);
  if (!force && sig === chronSig) return; chronSig = sig;
  el('chronList').innerHTML = town.chron.slice(-90).reverse().map(c => '<li><span style="color:' + (KINDCOL[c.kind] || '#9aa39f') + '">' + stamp(c.time) + '</span>' + esc(c.text) + '</li>').join('') || '<li><span></span>Nothing has happened yet.</li>';
}
/* ---------- event notices ---------- */
let noticeKey = '', noticeSpot = null;
function checkNotice() {
  { const box = el('notice'); if (box && !box.hidden) box.hidden = true; return; } // no more pop-up banners: you are walked to the events that matter
  const t = game.time, cands = [];
  const fe = town.feast; if (fe && t >= fe.at - 40 && t < fe.end) cands.push({ key: 'b' + fe.at, text: '🔥 Bonfire on the square' + (t < fe.at ? ' soon' : ''), x: town.cx, y: town.cy + 1 });
  const box = el('notice'); if (!box) return;
  const c = cands[0];
  if (!c) { if (!box.hidden) box.hidden = true; noticeKey = ''; return; }
  if (noticeKey === c.key + ':x') return;
  if (c.key !== noticeKey) { noticeKey = c.key; noticeSpot = c; box.hidden = false; }
  if (el('noticeText').textContent !== c.text) el('noticeText').textContent = c.text;
}
// where the player should stand: a free guest spot, like the villagers get, facing the middle
function guestSpotFor(c) {
  const t = game.time, n = game.player, w = town.wedding, f = town.funeral, pt = (town.parties || []).find(p => !p.done && t < p.end), fe = town.feast;
  let spots = null, mid = null;
  if (c.key[0] === 'w' && w) { const pl = w.place || weddingPlace(); spots = t >= w.at + WED_PARTY ? ceremonyArea(pl.x, pl.y, 6) : pl.guests; mid = { x: pl.x, y: pl.y }; }
  else if (c.key[0] === 'f' && f) { spots = mournSpots(f); mid = f.slot; }
  else if (c.key[0] === 'p' && pt) { spots = partyArea(pt); mid = cakeTile(); }
  else if (c.key[0] === 'b' && fe) { mid = { x: town.cx, y: town.cy + 1 }; spots = ceremonyArea(mid.x, mid.y, 4); }
  if (!spots || !spots.length) return null;
  const taken = new Set(npcs.filter(o => o !== n).map(o => { const st = o.plan && o.plan[o.si]; const g = o.path && o.path.length ? o.path[o.path.length - 1] : null; return g ? g.x + ',' + g.y : o.tx + ',' + o.ty; }));
  const free = spots.filter(q => !taken.has(q.x + ',' + q.y) && !noStep(q.x, q.y) && walkable(q.x, q.y));
  const pool = free.length ? free : spots;
  const best = pool.slice().sort((a, b) => (Math.abs(a.x - n.tx) + Math.abs(a.y - n.ty)) * 0.15 + Math.hypot(a.x - mid.x, a.y - mid.y) - ((Math.abs(b.x - n.tx) + Math.abs(b.y - n.ty)) * 0.15 + Math.hypot(b.x - mid.x, b.y - mid.y)))[0];
  return { x: best.x, y: best.y, face: { dx: Math.abs(mid.x - best.x) >= Math.abs(mid.y - best.y) ? Math.sign(mid.x - best.x) : 0, dy: Math.abs(mid.x - best.x) >= Math.abs(mid.y - best.y) ? 0 : Math.sign(mid.y - best.y) } };
}
el('noticeGo').addEventListener('click', () => { if (!noticeSpot) return; const n = game.player; if (!n || !n.player) return;
  const g = noticeSpot.key[0] === 'b' ? guestSpot(n, { mid: { x: town.cx, y: town.cy + 1 }, spots: ceremonyArea(town.cx, town.cy + 1, 4) }) : null;
  if (g) { const path = findPath(n.tx, n.ty, g.x, g.y); if (path) { const p = n.player; p.keys = {}; p.act = null; p.grace = null; p.autoGo = true; p.goFace = g.face; n.path = path; n.moving = path.length > 0; n.t = 0; n.pose = 'walk'; n.status = 'Walking over'; } else walkPlayerTo(n, noticeSpot.x, noticeSpot.y); }
  else walkPlayerTo(n, noticeSpot.x, noticeSpot.y); setFollow(true); canvas.focus({ preventScroll: true }); });
function walkPlayerTo(n, x, y) {
  x = Math.round(x); y = Math.round(y); let best = null, bd = 1e9;
  for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const tx = x + dx, ty = y + dy; if (tx < 1 || ty < 1 || tx >= W - 1 || ty >= H - 1 || !walkable(tx, ty) || tileOwner.get(tkey(tx, ty))) continue; const d = Math.abs(dx) + Math.abs(dy) + (roomAt[ty][tx] >= 0 && roomAt[y] && roomAt[y][x] < 0 ? 3 : 0); if (d < bd) { bd = d; best = { x: tx, y: ty }; } }
  if (!best) return false; const path = findPath(n.tx, n.ty, best.x, best.y); if (!path) { playerSay(n, 'I cannot find a way there.'); return false; }
  const p = n.player; p.keys = {}; p.act = null; p.grace = null; p.autoGo = true; n.path = path; n.moving = path.length > 0; n.t = 0; n.pose = 'walk'; n.status = 'Walking over'; return true;
}
el('noticeX').addEventListener('click', () => { el('notice').hidden = true; noticeKey = noticeKey + ':x'; });
/* ---------- calendar ---------- */
let calSig = '';
const CALICON = { wedding: '💍', funeral: '⚰', birthday: '🎂', birth: '👶', feast: '🔥', rest: '☀', party: '🎉' };
// parties start at 16:00 on the birthday, or the next day if the birthday falls after 15:00
// birthdays are noticed at midnight; the party is at 16:00 that day
function predictParty(b) { return (Math.floor(b / 1440) + 1) * 1440 + 960; }
function calUpcoming() {
  const now = game.time, out = [], lim = now + 3 * YEAR;
  const w = town.wedding; if (w && !w.done) out.push({ time: w.at, kind: 'wedding', text: nameOf(w.a) + ' and ' + nameOf(w.b) + ' marry' });
  const f = town.funeral; if (f && !f.done) out.push({ time: f.at, kind: 'funeral', text: 'Funeral of ' + f.rec.name });
  const fe = town.feast; if (fe) out.push({ time: fe.at, kind: 'feast', text: 'Bonfire on the square for ' + fe.why });
  (town.parties || []).filter(p => !p.done).forEach(p => { const b = byId(p.who); if (b) out.push({ time: p.at, kind: 'party', text: b.first + "'s " + ordinal(p.age) + ' birthday party on the square' }); });
  { const d0 = Math.floor(now / 1440); for (let d = d0; d < d0 + 6; d++) if (d % 3 === REST_DAY && (d + 1) * 1440 > now) out.push({ time: Math.max(now, d * 1440 + 720), kind: 'rest', text: 'Rest day: work stops at noon' }); }
  (town.funeralQ || []).forEach(r => out.push({ time: now + 1, kind: 'funeral', text: 'Funeral of ' + r.name, soon: true }));
  npcs.forEach(n => {
    if (n.preg && n.preg.due < lim) out.push({ time: n.preg.due, kind: 'birth', text: 'Baby due: ' + nameOf(n) });
    const a = n.age < 16 ? 16 : (n.age < 60 && n.role === 'Worker') ? 60 : (n.age < 68 && ['Priest', 'Trader', 'Barkeep'].includes(n.role)) ? 68 : 0;
    if (a && !(town.parties || []).some(p => p.who === n.id && !p.done)) { const t = predictParty(n.born + a * YEAR); if (t < lim) out.push({ time: t, kind: 'party', text: n.first + "'s " + ordinal(a) + ' birthday party' + (a === 16 ? ' (comes of age)' : ' (becomes an elder)') }); }
  });
  return out.sort((a, b) => a.time - b.time);
}
function buildCal(force) {
  if (state.tab !== 'cal') return;
  const up = calUpcoming(), past = (town.cal || []).slice(-40).reverse();
  const sig = up.length + '|' + past.length + '|' + Math.floor(game.time / 60);
  if (!force && sig === calSig) return; calSig = sig;
  const row = (c, soon?, tm?) => '<li><span>' + (soon ? 'soon' : stamp(c.time) + (tm && c.kind !== 'rest' ? ' ' + fmtTime(c.time).slice(-5) : '')) + '</span>' + (CALICON[c.kind] || '') + ' ' + esc(c.text) + '</li>';
  el('calPanel').innerHTML = '<h2>Calendar</h2><p class="sub">Year ' + yearOf(game.time) + ' · day ' + dayOfYear(game.time) + ' of 3. Weddings, funerals, births and coming-of-age days.</p>' +
    (town.line && town.line.history.length ? '<h3>Your story</h3><ul class="log chron">' + town.line.history.map((h, i) => '<li><span>Gen ' + (i + 1) + '</span>' + esc(h.name) + ', ' + h.age + ' years</li>').join('') + (game.player ? '<li><span>Gen ' + town.line.gen + '</span><b>' + esc(nameOf(game.player)) + '</b>, now</li>' : '') + '</ul>' : '') +
    '<h3>Coming up</h3><ul class="log chron">' + (up.map(c => row(c, c.soon, 1)).join('') || '<li><span></span>Nothing planned yet.</li>') + '</ul>' +
    '<h3>Recently</h3><ul class="log chron">' + (past.map(c => row(c)).join('') || '<li><span></span>Nothing has happened yet.</li>') + '</ul>';
}
function popChart() {
  const v = town.hist.pop; if (v.length < 2) return '';
  const mn = Math.min.apply(null, v), mx = Math.max.apply(null, v), r = Math.max(4, mx - mn), n = v.length;
  const pts = v.map((x, i) => (i / (n - 1) * 296 + 2).toFixed(1) + ',' + (58 - (x - mn) / r * 52).toFixed(1)).join(' ');
  return '<svg viewBox="0 0 300 62" width="100%" height="62" aria-label="Population over time"><polyline fill="none" stroke="#7fae5f" stroke-width="1.8" points="' + pts + '"/></svg><div class="sub" style="display:flex;justify-content:space-between;margin:0"><span>' + mn + ' lowest</span><span>' + mx + ' highest</span></div>';
}
let townSig = '';
const costTxt = c => [c.stone ? c.stone + ' stone' : '', c.wood ? c.wood + ' wood' : '', c.any ? c.any + ' wood or stone' : ''].filter(Boolean).join(' + ');
function waitingHtml() {
  const w = Object.keys(town.wants || {}).map(k => town.wants[k]);
  if (!w.length) return '';
  return '<h2 class="gap">Waiting to start</h2><ul class="plain">' + w.map(x => '<li>' + esc(x.text || x.kind) + ' <span class="dim">' + costTxt(x.cost) + (x.noRoom ? ' · no room yet' : x.queued ? ' · queued behind other work' : '') + '</span></li>').join('') + '</ul>';
}
function updateResBar() {
  const ws = Object.keys(town.wants || {}).map(k => town.wants[k]), d = demand(), fd = foodDaysNow(), w0 = ws[0];
  const html = '<span>Timber still needed <b>' + d.wood + '</b></span><span>Stone still needed <b>' + d.stone + '</b></span><span>Food <b>' + fd.toFixed(1) + '</b> days</span>' +
    (w0 ? '<span class="wait">Next: ' + esc(w0.text || w0.kind) + (w0.noRoom ? ' (no room yet)' : w0.queued ? ' (queued)' : '') + (ws.length > 1 ? ' +' + (ws.length - 1) + ' more' : '') + '</span>' : '');
  if (html !== resSig) { resSig = html; el('resbar').innerHTML = html; }
}
let resSig = '';
function buildTown(force) {
  const t = town, sig = npcs.length + '|' + t.dead.length + '|' + rooms.length + '|' + t.markets.length + '|' + t.sites.length + '|' + Math.floor(game.time / 1440);
  if (!force && sig === townSig) return; townSig = sig;
  const counts = {}; npcs.forEach(n => { const r = n.age < 16 ? 'Child' : n.role === 'Worker' ? (n.cur || 'Worker') : n.role; counts[r] = (counts[r] || 0) + 1; });
  const plural = (r, c) => c === 1 ? r.toLowerCase() : (r === 'Child' ? 'children' : r.toLowerCase() + 's');
  const people = Object.entries(counts).map(([r, c]) => c + ' ' + plural(r, c)).join(', ');
  const houses = rooms.filter(r => r.kind === 'house' && !r.dead).length;
  const sites = t.sites.map(s => '<li>' + ({ house: 'House', church: 'Church', tavern: 'Tavern', market: 'Village green', road: 'Road', field: 'Field', graveyard: 'Churchyard plot', demolish: 'Demolition' }[s.kind] || s.kind) + (s.kind === 'house' ? ' for ' + esc(s.surname || 'a family') : '') + ' · ' + Math.round(100 * siteFrac(s)) + '%' + (siteNeedText(s) ? ' <span class="dim">needs ' + siteNeedText(s) + '</span>' : '') + '</li>').join('');
  const dead = t.dead.slice(-25).reverse().map(d => '<li>' + esc(d.name) + ' <span class="dim">' + d.age + ' · ' + esc((d.label || d.role).toLowerCase()) + ' · ' + stamp(d.died) + '</span></li>').join('');
  el('townPanel').innerHTML = '<h2>The town</h2><h3>' + esc(t.name) + '</h3><p class="sub">' + npcs.length + ' villagers · ' + houses + ' homes · year ' + yearOf(game.time) + '</p>' +
    '<p class="bio">' + esc(t.founding) + '</p><h2 class="gap">Population</h2>' + popChart() +
    '<dl class="kv" style="margin-top:8px"><dt>Born</dt><dd>' + t.births + '</dd><dt>Married</dt><dd>' + t.weddings + '</dd><dt>Died</dt><dd>' + t.deaths + '</dd></dl>' +
    '<h2 class="gap">Buildings</h2><dl class="kv"><dt>Timber still needed</dt><dd>' + demand().wood + '</dd><dt>Stone still needed</dt><dd>' + demand().stone + '</dd><dt>Church</dt><dd>' + (t.church ? 'built' : t.sites.some(s => s.kind === 'church') ? 'being built' : 'not yet') + '</dd><dt>Tavern</dt><dd>' + (t.tavern ? 'built' : t.sites.some(s => s.kind === 'tavern') ? 'being built' : 'not yet') + '</dd></dl>' + waitingHtml() + '<h2 class="gap">Greens and larders</h2><ul class="plain">' + t.markets.map(m => '<li>' + esc(m.name) + ' <span class="dim">' + (m.stalls.some(s => s.owner) ? m.stalls.filter(s => s.owner).map(s => esc(s.owner.first)).join(', ') : 'no larder-keeper yet') + '</span></li>').join('') + '</ul>' +
    '<h2 class="gap">People</h2><p class="bio">' + esc(people) + '.</p>' +
    (sites ? '<h2 class="gap">Being built</h2><ul class="plain">' + sites + '</ul>' : '') +
    '<h2 class="gap">Churchyard</h2>' + (dead ? '<ul class="plain">' + dead + '</ul>' : '<p class="sub">No graves yet.</p>');
  el('townName').textContent = t.name;
  el('townSub').textContent = npcs.length + ' villagers · ' + houses + ' homes';
}

/* ---------- market tab ---------- */
function spark(vals, col) {
  if (!vals || vals.length < 2) return '<svg class="spark" viewBox="0 0 70 20"></svg>';
  const mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), r = Math.max(1, mx - mn), n = vals.length;
  const pts = vals.map((v, i) => (i / (n - 1) * 68 + 1).toFixed(1) + ',' + (18 - (v - mn) / r * 16).toFixed(1)).join(' ');
  return '<svg class="spark" viewBox="0 0 70 20" aria-hidden="true"><polyline fill="none" stroke="' + col + '" stroke-width="1.6" points="' + pts + '"/></svg>';
}
let mktSig: any = '';
function updateMarket(force) {
  if (state.tab !== 'market' || !town.eco) return;
  const sig = Math.floor(game.time / 20);
  if (!force && sig === mktSig) return; mktSig = sig;
  const goods = Object.keys(GOODS).filter(g => merchants.some(m => m.sells[g] || m.buys[g]));
  const gr = goods.map(g => {
    const p = marketPrice(g), st = merchants.reduce((s, m) => s + (m.sells[g] ? (m.stock[g] || 0) : 0), 0), ph = town.hist.price[g] || [];
    const trend = ph.length > 6 ? (ph[ph.length - 1] - ph[Math.max(0, ph.length - 24)]) : 0;
    return '<tr><td>' + cap1(GOODS[g].name) + '</td><td>' + spark(ph, trend > 0 ? '#e0a93f' : trend < 0 ? '#7fae5f' : '#9aa39f') + '</td><td class="num">' + (p === null ? 'sold out' : p + 'c') + '</td><td class="num">' + st + '</td></tr>';
  }).join('');
  const shops = merchants.map(m => '<div class="shopcard" data-id="' + m.n.id + '"><div class="tp"><b>' + esc(nameOf(m.n)) + ' <span style="font-weight:400;color:var(--muted)">· market stall</span></b><span class="' + (m.serving ? 'open' : 'shut') + '">' + (m.serving ? 'open' : 'closed') + '</span></div>' +
    '<div class="chips">' + Object.keys(m.sells).map(g => '<span class="chip">' + (m.stock[g] | 0) + ' ' + GICON[g] + ' @ ' + sellPrice(m, g) + 'c</span>').join('') + '</div><div class="sub" style="margin:2px 0 0">' + coinsOf(m.n) + ' coins in the till · ' + (m.stock.wood | 0) + ' timber for sale to builders</div></div>').join('');
  const crops = town.crops || [], cs = [0, 0, 0, 0, 0]; crops.forEach(c => cs[cropStage(c)]++);
  const pi = town.pondInfo, circ = Math.round(npcs.reduce((s, n) => s + n.coin, 0));
  const trees = town.treeCache ? town.treeCache.list.length : 0;
  el('mkt').innerHTML = '<h2>Prices today</h2><table class="mk"><thead><tr><th>Good</th><th>Trend</th><th style="text-align:right">Price</th><th style="text-align:right">In stock</th></tr></thead><tbody>' + gr + '</tbody></table>' +
    '<h2 class="gap">Town purse</h2><dl class="kv"><dt>Coins held by villagers</dt><dd>' + circ + '</dd><dt>Council treasury</dt><dd>' + Math.round(town.treasury) + '</dd><dt>Sold to the caravan</dt><dd>' + Math.round(town.eco.exported) + 'c</dd></dl>' +
    '<h2 class="gap">The land</h2><dl class="kv">' + (pi && pi.cap ? '<dt>Fish in the shallows</dt><dd>' + Math.round(pi.stock) + ' / ' + pi.cap + '</dd>' : '') + '<dt>Fields</dt><dd>' + (crops.length ? cs[1] + ' sown · ' + (cs[2] + cs[3]) + ' growing · ' + cs[4] + ' ripe' : 'none yet') + '</dd><dt>Wild plants</dt><dd>' + town.nodes.length + '</dd><dt>Cleared radius</dt><dd>' + town.clearR.toFixed(1) + ' tiles</dd></dl>' +
    '<h2 class="gap">Stall</h2>' + (shops || '<p class="sub">No trader at the moment.</p>');
  el('mkt').querySelectorAll('.shopcard').forEach((d: any) => d.addEventListener('click', () => { const m = merchants.find(x => String(x.n.id) === d.dataset.id); if (m) { select(m.n); centerOn(m.n.x, m.n.y); } }));
}

function addChatter(ev) {
  const ul = el('chat'); const li = document.createElement('li');
  li.innerHTML = '<div class="meta">' + fmtTime(ev.time) + ' · Day ' + (Math.floor(ev.time / 1440) + 1) + ' · ' + esc(cap1(ev.place)) + '</div>' +
    ev.lines.map(l => '<div class="ln"><b style="color:' + l.who.shirt + '">' + esc(l.who.first) + '</b> ' + esc(l.text) + '</div>').join('');
  li.addEventListener('click', () => { select(ev.a); centerOn(ev.a.x, ev.a.y); });
  ul.insertBefore(li, ul.firstChild);
  while (ul.children.length > 40) ul.removeChild(ul.lastChild);
  el('chatEmpty').hidden = true;
}
let chronSeen = 0;
let tradeSeen = 0;
// a long line becomes a few bubbles in a row, broken at the ends of sentences, so nothing gets cut off
function splitSpeech(text, max?) {
  max = max || 95; text = String(text || '');
  if (text.length <= max) return [text];
  const sent = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [text], out = []; let cur = '';
  for (const s0 of sent) {
    const s1 = s0.trim(); if (!s1) continue;
    if (s1.length > max) { if (cur) { out.push(cur); cur = ''; } let w = ''; for (const word of s1.split(' ')) { if ((w + ' ' + word).trim().length > max && w) { out.push(w + '...'); w = word; } else w = (w + ' ' + word).trim(); } cur = w; continue; }
    if ((cur + ' ' + s1).trim().length > max && cur) { out.push(cur); cur = s1; } else cur = (cur + ' ' + s1).trim();
  }
  if (cur) out.push(cur);
  return out;
}
function drainEvents(now) {
  while (game.events.length) {
    const ev = game.events.shift();
    for (const l of ev.lines) l.text = cvSpeak(l.text);   // speech is contracted on the way out (dialogue/cv-speech.ts)
    // you only speak when you chose to (walking into someone) or when someone speaks to you first
    if (!ev.focus && !ev.self && ev.lines.length && ev.lines[0].who && ev.lines[0].who.player) continue;
    if (ev.a.player || ev.b.player) { const f = ev.lines.find(l => !l.who.player); if (f && f.text.indexOf(f.who.first + ':') !== 0) f.text = f.who.first + ': ' + f.text; }
    if (!(ev.a.player || ev.b.player) && typeof hasNews === 'function' && (hasNews(ev.a) || hasNews(ev.b))) continue;
    if (typeof focusOn === 'function' && focusOn() && !(ev.a.id === game.focus.a || ev.b.id === game.focus.a) ) continue;
    if (ev.focus || (ev.a.player || ev.b.player)) { for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].n !== ev.a && bubbles[i].n !== ev.b) bubbles.splice(i, 1); }
    if (!ev.quiet) addChatter(ev);
    if (ev.a.player || ev.b.player) { for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].n === ev.a || bubbles[i].n === ev.b) bubbles.splice(i, 1); }
    else if (ev.a.bubbleUntil > now || ev.b.bubbleUntil > now) continue;
    let at = now; ev.lines.forEach(l => { for (const part of splitSpeech(l.text)) { const d = lineMs(part); bubbles.push({ n: l.who, text: part, from: at, until: at + d - 150 }); at += d; } });
    ev.a.bubbleUntil = ev.b.bubbleUntil = at;
  }
  const fresh = town.eco.trades - tradeSeen; tradeSeen = town.eco.trades;
  if (chronSeen > town.chron.length) chronSeen = 0;
}

