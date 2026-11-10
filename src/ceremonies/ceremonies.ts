/* ================= Ceremonies: a priest from the start, weddings by the fire, crosses for the dead ================= */

/* ---------- one celebration per day ---------- */
function eventTimes() {
  const t = []; if (town.wedding && !town.wedding.done) t.push(town.wedding.at); if (town.funeral && !town.funeral.done) t.push(town.funeral.at);
  (town.parties || []).forEach(p => { if (!p.done) t.push(p.at); }); if (town.feast) t.push(town.feast.at); return t;
}
function spaceOut(at) { const days = new Set(eventTimes().map(x => Math.floor(x / 1440))); while (days.has(Math.floor(at / 1440))) at += 1440; return at; }

/* ---------- a priest is chosen early ---------- */
function ensurePriest() {
  if (npcs.some(n => n.role === 'Priest' && !n.dead)) return;
  if (town.scenario === 'blank' && !town.church) return;   // (nobody takes holy orders before there is a chapel to take them in)
  const c = npcs.filter(n => n.age >= 28 && n.age < 58 && n.role === 'Worker' && !n.player && !n.shop).sort((a, b) => (b.traits.includes('devout') ? 4 : 0) - (a.traits.includes('devout') ? 4 : 0) + (b.age - a.age) * 0.05)[0];
  if (!c || npcs.filter(n => n.role === 'Worker' && n.age >= 16).length < 4) return;
  setRole(c, 'Priest'); c.quirk = anyOf(['wears a colander on their head and calls it holy', 'says "R\'amen" after every meal, even breakfast', 'insists pirates are sacred and talks like one on Fridays', 'blesses every pot of pasta personally']);
  chron(town.church ? `${nameOf(c)} has been chosen as priest of the Church of the Flying Spaghetti Monster.` : `${nameOf(c)} has put on a colander and will lead the town's prayers, weddings and funerals by the camp fire, in the name of the Flying Spaghetti Monster.`, 'life');
}
/* The priest keeps a short morning prayer (9:00-10:30) where people can find him,
   then spends the rest of the day doing the rounds: chatting, visiting, blessing the work. */
const PRAY_FROM = 9, PRAY_TO = 10.5;
function priestPlan(n, tod) {
  const h = tod / 60; if (h < 7.5 || h > 18) return null;
  if (h >= PRAY_FROM - 0.5 && h < PRAY_TO) {
    const c = town.church, left = Math.max(5, (PRAY_TO - h) * 60);
    if (c && c.spots.altar) return [goS(c.spots.altar, 'Going to the altar for morning prayers'), waitS(left, 'work', 'Morning pasta prayers in the chapel', { tool: 'bless' })];
    const f = fireTile(); return [goS({ x: f.x, y: f.y - 1, face: { dx: 0, dy: 1 } }, 'Walking to the camp fire for morning prayers'), waitS(left, 'work', 'Morning pasta prayers by the fire', { tool: 'bless' })];
  }
  return priestRounds(n, h);
}
function priestRounds(n, h) {
  const now = game.time, r = n.rand();
  const live = npcs.filter(o => o !== n && !o.dead && !o.infant && o.pose !== 'sleep' && Math.abs(o.tx - n.tx) + Math.abs(o.ty - n.ty) <= (h < PRAY_FROM ? 12 : 30));
  // someone who could use a visit: grieving, hungry, or not seen in a while
  const needy = live.filter(o => (o.grief && o.grief > now) || o.hunger > 70 || (o.mourn && o.mourn > now) || (now - ((n.visited || {})[o.id] || -1e9)) > 1440 * 2);
  if (r < 0.45 && needy.length) {
    const o = needy[Math.floor(n.rand() * needy.length)];
    (n.visited = n.visited || {})[o.id] = now;
    const cp = chatPlan(n, o);
    if (cp) return cp.concat([waitS(6 + n.rand() * 6, 'stand', 'Checking in on ' + o.first, { social: true, nopie: true, onEnd(n) { bumpAff(o, n, 3, 2); o.social = Math.min(100, o.social + 8); } })]);
  }
  if (r < 0.65) {
    const workers = live.filter(o => o.plan && o.plan[o.si] && o.plan[o.si].act === 'work' && o.role !== 'Priest');
    if (workers.length) {
      const o = workers[Math.floor(n.rand() * workers.length)];
      return [goS(() => ({ x: o.tx, y: o.ty, face: null }), 'Walking over to ' + o.first),
        waitS(5 + n.rand() * 5, 'stand', `Giving ${o.first}'s work a noodly blessing`, { tool: 'bless', nopie: true, onEnd(n) { bumpAff(o, n, 2, 1); } })];
    }
  }
  if (r < 0.85) { const near = live.filter(o => Math.abs(o.tx - n.tx) + Math.abs(o.ty - n.ty) <= 18); if (near.length) { const cp = chatPlan(n, near[Math.floor(n.rand() * near.length)]); if (cp) return cp; } }
  const pl = plazaNear(n);
  return [goS(nn => pickFrom(pl, nn), 'Strolling through the village'), waitS(12 + n.rand() * 12, 'leisure', 'Wandering and greeting folk', { area: pl, roam: [8, 18], social: true, nopie: true })];
}
const fireTile = () => ({ x: town.cx, y: town.cy + 1 });
const priestOf = () => npcs.find(n => n.role === 'Priest' && !n.dead) || null;

/* ---------- where things happen ---------- */
function weddingPlace() {
  const c = town.church;
  if (c && c.spots && c.spots.altar) {
    const a = c.spots.altar, dir = -(a.face ? a.face.dy : -1) || 1;
    const guests = (c.pews && c.pews.length ? c.pews : c.floorTiles || []).map(p => ({ x: p.x, y: p.y, sit: !!p.sit, face: p.face || { dx: 0, dy: -dir } }));
    return { church: true, priest: { x: a.x, y: a.y, face: { dx: 0, dy: dir } }, couple: [{ x: a.x, y: a.y + dir, face: { dx: 0, dy: -dir } }, { x: a.x + 1, y: a.y + dir, face: { dx: 0, dy: -dir } }], guests, x: a.x, y: a.y };
  }
  const f = fireTile();
  const guests = plazaTiles.filter(t => { const d = Math.hypot(t.x - f.x, t.y - f.y); return d >= 2.5 && d <= 5 && t.y >= f.y && walkable(t.x, t.y); }).map(t => ({ x: t.x, y: t.y, face: { dx: Math.abs(t.x - f.x) > Math.abs(t.y - f.y) ? Math.sign(f.x - t.x) : 0, dy: Math.abs(t.x - f.x) > Math.abs(t.y - f.y) ? 0 : -1 } }));
  return { church: false, priest: { x: f.x, y: f.y - 1, face: { dx: 0, dy: 1 } }, couple: [{ x: f.x, y: f.y, face: { dx: 0, dy: -1 } }, { x: f.x + 1, y: f.y, face: { dx: 0, dy: -1 } }], guests, x: f.x, y: f.y };
}
const WED_PARTY = 52, WED_LEN = WED_PARTY + 196, FUN_WAKE = 46, FUN_LEN = FUN_WAKE + 108;
function scheduleWedding(a, b) {
  const at = spaceOut(nextAt(16, 12 * 60)), pl = weddingPlace();
  town.wedding = { a, b, at, end: at + WED_LEN, done: false, place: pl, mk: { plaza: pl.guests.length ? pl.guests : plazaTiles, x: pl.x, y: pl.y, church: pl.church } };
  chron(`${a.first} ${a.surname} and ${b.first} ${b.surname} will be married ${pl.church ? 'in the chapel' : 'on the square'} on ${dayLabel(at)}.`, 'love');
}
function weddingPlan(n, tod) {
  const w = town.wedding; if (!w || w.done || game.time < w.at - (w.lead || 30) || game.time >= w.end) return null;
  const pl = w.place || weddingPlace(), pr = priestOf();
  if (game.time >= w.at + WED_PARTY) { // the vows are said: music, dancing, clapping
    const me = n === w.a || n === w.b;
    const guestOK = me || n === pr || (!n.infant && n.hunger <= 85 && (npcs.length <= 24 || isKin(n, w.a) || isKin(n, w.b) || (n.know[w.a.id] || 0) > 25 || (n.know[w.b.id] || 0) > 25));
    if (!guestOK) return null;
    const left = w.end - game.time, slot = Math.min(left, 18 + n.rand() * 14), mid = { x: pl.x, y: pl.y };
    const faceMid = q => { const hx = Math.abs(mid.x - q.x) >= Math.abs(mid.y - q.y); return { x: q.x, y: q.y, face: { dx: hx ? Math.sign(mid.x - q.x) : 0, dy: hx ? 0 : Math.sign(mid.y - q.y) } }; };
    // in the chapel the party stays inside; out on the square it spreads around the arch
    const ring = pl.church ? (a, b) => { const all = chapelArea(), r = all.filter(q => { const d = Math.hypot(q.x - mid.x, q.y - mid.y); return d >= a && d <= b; }); return r.length ? r : all; } : (a, b) => ceremonyArea(mid.x, mid.y, b).filter(q => Math.hypot(q.x - mid.x, q.y - mid.y) >= a);
    const fin = { onEnd(n) { if (game.time >= w.end - 1) { n.social = Math.min(100, n.social + 25); if (!me) addMem(n, 'feast', `${w.a.first} and ${w.b.first}'s wedding`, null, w.a.id); } } };
    if (me) { const sp = pl.couple[n === (w.a.female ? w.b : w.a) ? 0 : 1], o = n === w.a ? w.b : w.a; return [goS(sp, 'Taking ' + o.first + ' for a dance'), waitS(slot, 'stand', 'Dancing with ' + o.first, Object.assign({ social: true, nopie: true }, fin))]; }
    if (n.id === w.musician) { const sp = { x: pl.priest.x + 2, y: pl.priest.y, face: { dx: 0, dy: 1 } }; return [goS(walkable(sp.x, sp.y) ? sp : nn => pickFrom(ring(2, 3), nn), 'Fetching the fiddle'), waitS(left, 'stand', 'Playing the fiddle', Object.assign({ social: true, nopie: true }, fin))]; }
    if (n === pr) return [goS(nn => faceMid(pickFrom(ring(3, 5), nn)), 'Stepping back to watch'), waitS(slot, 'stand', 'Watching the dancing', Object.assign({ social: true, nopie: true }, fin))];
    const dance = n.rand() < (n.age < 16 ? 0.8 : n.age >= 60 ? 0.3 : 0.55);
    if (dance) return [goS(nn => pickFrom(ring(1.5, 3.6), nn), 'Joining the dance'), waitS(slot, 'stand', n.age < 16 ? 'Dancing and spinning' : 'Dancing at the wedding', Object.assign({ social: true, nopie: true }, fin))];
    return [goS(nn => faceMid(pickFrom(ring(4, 6), nn)), 'Finding a spot to watch'), waitS(slot, 'stand', anyOf(['Clapping along', 'Tapping a foot to the music', 'Watching the dancers']), Object.assign({ social: true, nopie: true }, fin))];
  }
  if (n === w.a || n === w.b) { const sp = pl.couple[n === (w.a.female ? w.b : w.a) ? 0 : 1]; return [goS(sp, 'Going to be married'), waitS(w.end - game.time, 'stand', 'Being married', { social: true, nopie: true })]; }
  if (n === pr) return [goS(pl.priest, 'Going to marry ' + w.a.first + ' and ' + w.b.first), waitS(w.end - game.time, 'stand', 'Marrying ' + w.a.first + ' and ' + w.b.first, { social: true, nopie: true, tool: 'bless' })];
  if (n.infant || n.hunger > 85 || !(npcs.length <= 24 || isKin(n, w.a) || isKin(n, w.b) || (n.know[w.a.id] || 0) > 25 || (n.know[w.b.id] || 0) > 25)) return null;
  return [goS(nn => { const g = pl.guests.length ? pickFrom(pl.guests, nn) : pickFrom(plazaTiles, nn); const src = pl.guests.find(q => q.x === g.x && q.y === g.y); return src ? Object.assign({}, src) : g; }, 'Heading to the wedding'), waitS(w.end - game.time, 'stand', `At ${w.a.first} and ${w.b.first}'s wedding`, { social: true, nopie: true })];
}

/* ---------- crosses instead of a graveyard ---------- */
const CROSS_LIFE = 4 * YEAR;
function pickCrossSpot() {
  const cx = town.cx, cy = town.cy, R = Math.random, c = [];
  for (let k = 0; k < 1500 && c.length < 30; k++) {
    const a = R() * 6.283, d = 7.5 + R() * 4, x = Math.round(cx + Math.cos(a) * d * 1.3), y = Math.round(cy + Math.sin(a) * d);
    if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3 || grid[y][x] !== T.GRASS || roomAt[y][x] >= 0 || town.siteAt[y * W + x] || town.nodeMap.has(y * W + x) || !reach[y * W + x]) continue;
    if ((town.crosses || []).some(q => Math.abs(q.x - x) + Math.abs(q.y - y) < 2)) continue;
    let open = 0, tree = 0; for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const g = grid[y + j][x + i]; if (g === T.GRASS || g === T.PATH) open++; if (g === T.TREE) tree++; }
    if (open < 12) continue;
    c.push({ x, y, s: tree * 0.5 - Math.hypot(x - cx, y - cy) * 0.6 + ((town.crosses || []).some(q => Math.hypot(q.x - x, q.y - y) < 6) ? 6 : 0) + R() * 2 });
  }
  c.sort((a, b) => b.s - a.s); return c[0] || null;
}
function raiseCross(rec, sp) {
  town.crosses = town.crosses || []; town.crossAt = town.crossAt || new Map();
  const q = { id: (town.crossId = (town.crossId || 0) + 1), x: sp.x, y: sp.y, rec, made: game.time, flowers: true };
  town.crosses.push(q); town.crossAt.set(sp.y * W + sp.x, q); town.block[sp.y * W + sp.x] = 1; markDirty(sp.x, sp.y, 1, 1); town.graves = (town.graves || 0) + 1;
  return q;
}
function crossTick() {
  for (const q of (town.crosses || []).slice()) {
    if (game.time - q.made > CROSS_LIFE) { town.crosses.splice(town.crosses.indexOf(q), 1); town.crossAt.delete(q.y * W + q.x); town.block[q.y * W + q.x] = 0; markDirty(q.x, q.y, 1, 1); }
    else if (q.flowers && game.time - q.made > 0.5 * YEAR) q.flowers = false;
  }
}
const crossAge = q => (game.time - q.made) / CROSS_LIFE;
function epitaph(rec) {
  const sp = rec.spouse && personById(rec.spouse), kids = rec.kids || 0;
  const bits = [];
  if (sp) bits.push(`Beloved ${rec.female ? 'wife' : 'husband'} of ${sp.first}.`);
  if (kids) bits.push(`${rec.female ? 'Mother' : 'Father'} of ${kids}.`);
  if (rec.age < 16) bits.push('Gone too soon.');
  bits.push(`${rec.first} ${rec.quirk}.`);
  return bits.join(' ');
}
function readCross(q) {
  const a = crossAge(q), rec = q.rec, full = `Here lies ${rec.name}, ${rec.age}. ${epitaph(rec)}`;
  if (a < 0.45) return full;
  if (a < 0.8) return `Here lies ${rec.name}, ${rec.age}. The rest has worn away.`;
  return `Here lies ${rec.first.slice(0, 2)}... The letters are almost gone.`;
}

/* ---------- funerals at the cross ---------- */
function startFuneral(rec) {
  const at = spaceOut(nextAt(15, 5 * 60)), sp = pickCrossSpot();
  const slot = sp ? { x: sp.x, y: sp.y } : { x: town.cx + 9, y: town.cy + 6 };
  town.funeral = { rec, at, end: at + FUN_LEN, slot, leader: null, done: false, started: game.time, cross: null };
  chron(`The funeral of ${rec.name} will be held on ${dayLabel(at)}${priestOf() ? ', led by ' + priestOf().first : ''}.`, 'death');
}
function mournSpots(f) {
  const sl = f.slot, out = [];
  for (let y = sl.y - 3; y <= sl.y + 3; y++) for (let x = sl.x - 3; x <= sl.x + 3; x++) {
    const d = Math.hypot(x - sl.x, y - sl.y); if (d < 1.4 || d > 3.2 || y < sl.y) continue;
    if (x > 0 && y > 0 && x < W - 1 && y < H - 1 && walkable(x, y) && roomAt[y][x] < 0) out.push({ x, y, face: { dx: Math.abs(x - sl.x) > Math.abs(y - sl.y) ? Math.sign(sl.x - x) : 0, dy: Math.abs(x - sl.x) > Math.abs(y - sl.y) ? 0 : Math.sign(sl.y - y) } });
  }
  return out.length ? out : [{ x: sl.x, y: sl.y + 1 }];
}
// the open floor of the chapel: somewhere to stand, sit in the pews or dance
function chapelArea() {
  const c = town.church; if (!c) return [];
  const t = (c.floorTiles || []).filter(q => walkable(q.x, q.y) && grid[q.y][q.x] !== T.ALTAR);
  return t.length ? t : (c.floorTiles || []);
}
function ceremonyArea(x, y, r) {
  const a = [], R = Math.ceil(r); for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) { const X = x + i, Y = y + j, d = Math.hypot(i, j); if (d < 1.5 || d > r || X < 1 || Y < 1 || X >= W - 1 || Y >= H - 1) continue; if (walkable(X, Y) && roomAt[Y][X] < 0) a.push({ x: X, y: Y }); }
  return a.length ? a : [{ x, y: y + 2 }];
}
function funeralPlan(n, tod) {
  const f = town.funeral; if (!f || f.done || game.time < f.at - 45 || game.time >= f.end) return null;
  if (game.time >= f.at + FUN_WAKE) { // after the words: people linger, comfort each other, share memories
    if (n !== priestOf() && (n.hunger > 85 || !attends(n, f.rec))) return null;
    n.mourning = f.rec.id; const area = ceremonyArea(f.slot.x, f.slot.y, 5);
    return [goS(nn => pickFrom(area, nn), 'Staying a while'), waitS(f.end - game.time, 'stand', `Remembering ${f.rec.first}`, { area, roam: [14, 26], social: true, nopie: true })];
  }
  if (n === priestOf()) return [goS({ x: f.slot.x, y: f.slot.y - 1, face: { dx: 0, dy: 1 } }, `Going to lay ${f.rec.first} to rest`), waitS(f.end - game.time, 'stand', `Leading ${f.rec.first}'s funeral`, { social: true, nopie: true, tool: 'bless' })];
  if (n.hunger > 85 || !attends(n, f.rec)) return null;
  n.mourning = f.rec.id; const spots = mournSpots(f);
  return [goS(nn => { const g = pickFrom(spots, nn); const s = spots.find(q => q.x === g.x && q.y === g.y); return s || g; }, `Walking to ${f.rec.first}'s funeral`), waitS(f.end - game.time, 'stand', `At ${f.rec.first}'s funeral`, { social: true, nopie: true })];
}
function finishFuneral(f) {
  const rec = f.rec; f.done = true; town.remains = (town.remains || []).filter(r => r.id !== rec.id);
  if (!f.cross) f.cross = raiseCross(rec, f.slot);
  const here = npcs.filter(n => n.mourning === rec.id);
  here.forEach(n => { n.social = Math.min(100, n.social + 35); n.mourning = null; });
  const pr = priestOf();
  chron(`${rec.name} was laid to rest beneath a wooden cross${pr ? ', with ' + pr.first + ' speaking the words' : ''}${here.length ? ' and ' + here.length + ' mourners present' : ''}.`, 'death');
  calAdd('funeral', `Funeral of ${rec.name}`); town.funeral = null; town.lastFuneral = game.time;
  if (rec.wasPlayer && rec.heir) { const h = byId(rec.heir.id); if (h) { chron(`${nameOf(h)} stood at ${rec.first}'s graveside and, for a moment, felt like they were saying goodbye to themselves.`, 'life'); addMem(h, 'loss', `standing at ${rec.first}'s grave`, null, rec.id); } }
}

/* ---------- the words spoken ---------- */
function ceremonyTick() {
  const t = game.time, pr = priestOf();
  const w = town.wedding;
  if (w && !w.done && t >= w.at) {
    const speak = pr || npcs.filter(o => o.age >= 40).sort((a, b) => b.age - a.age)[0]; if (!speak) return;
    const venue = (w.place && w.place.church) ? 'in this chapel' : 'here on the square';
    const g = npcs.find(o => o !== w.a && o !== w.b && o !== speak && !o.infant && Math.abs(o.tx - w.a.tx) + Math.abs(o.ty - w.a.ty) <= 6) || speak;
    const step = (k, at, fn) => { if (!w['s' + k] && t >= w.at + at) { w['s' + k] = true; fn(); } };
    step(1, 4, () => say(speak, w.a, [[speak, `Friends, family, fellow believers in the Flying Spaghetti Monster. We are gathered ${venue} to join ${w.a.first} and ${w.b.first}.`], [speak, anyOf([`Love is like good pasta. It should never be overcooked, and it is best shared.`, `May His Noodly Appendage wrap around you both, as sauce wraps around spaghetti.`, `Two noodles, one bowl. That is all marriage is, really.`])]]));
    step(2, 16, () => say(speak, w.a, [[speak, `${w.a.first}, will you have ${w.b.first}, to share your hearth, your harvests and your meatballs, in lean years and good ones?`], [w.a, anyOf(['I will.', 'I will. With all my heart.'])]]));
    step(3, 28, () => say(speak, w.b, [[speak, `${w.b.first}, will you have ${w.a.first}, through every winter and every spring, al dente or overcooked?`], [w.b, anyOf(['I will.', 'I will. Always.'])]]));
    step(4, 40, () => say(speak, g, [[speak, `Then by the power of His Noodly Appendage, I name you husband and wife! R'amen!`], [g, anyOf(['R\'amen! *cheers*', 'R\'amen!', '*throws petals* R\'amen!'])]]));
    step(5, 46, () => say(w.a, w.b, [[w.a, '*kiss*'], [w.b, anyOf(['*laughs*', 'Finally.', '*blushes*'])]]));
    step(6, WED_PARTY, () => { const mus = npcs.filter(o => !o.player && o !== w.a && o !== w.b && o !== pr && o.age >= 14 && !o.infant && Math.abs(o.tx - w.a.tx) + Math.abs(o.ty - w.a.ty) <= 12).sort((x, y) => (y.hobby === 'singing' ? 2 : 0) - (x.hobby === 'singing' ? 2 : 0) + Math.random() - 0.5)[0]; if (mus) { w.musician = mus.id; say(mus, mus, [[mus, anyOf(['Right! Who wants a tune?', '*tunes the fiddle* This one is for the happy couple!'])]]); }
      npcs.forEach(o => { const st = o.plan && o.plan[o.si]; if (!o.player && st && /wedding|married|Marrying/.test(st.text || '')) abortPlan(o); }); say(speak, speak, [[speak, anyOf([`Now eat, drink and dance! This is a happy day!`, `Go on then, everyone. Celebrate!`])]]); });
  }
  const f = town.funeral;
  if (f && !f.done && t >= f.at) {
    const speak = pr || npcs.filter(o => o.age >= 40 && o.mourning === f.rec.id).sort((a, b) => b.age - a.age)[0]; if (!speak) return;
    const rec = f.rec, kin = npcs.filter(o => o.mourning === rec.id && rec.person && isKin(o, rec.person) && o !== speak)[0];
    const step = (k, at, fn) => { if (!f['s' + k] && t >= f.at + at) { f['s' + k] = true; fn(); } };
    step(0, 1, () => { if (!f.cross) f.cross = raiseCross(rec, f.slot); town.remains = (town.remains || []).filter(r => r.id !== rec.id); });
    step(1, 5, () => say(speak, speak, [[speak, `We have come to say goodbye to ${rec.first}, who lived ${rec.age} years among us.`]]));
    if (!rec.wasPlayer) step(2, 17, () => say(speak, speak, [[speak, rec.age < 16 ? `${rec.first} was only ${rec.age}. Too little time, and every minute of it was bright.` : `${rec.first} ${rec.quirk}. A ${rec.traits[0] || 'good'} soul. The Flying Spaghetti Monster has a seat waiting at the great pasta table.`]]));
    step(3, 29, () => { if (!kin) return; const m = (kin.mem || []).filter(x => x.w === rec.id && x.we).slice(-1)[0]; say(kin, speak, [[kin, m ? `I will always remember ${m.we.replace(/\byou\b/g, rec.first).replace(/\bwe\b/g, rec.first + ' and I').replace(/\byour\b/g, rec.first + "'s")}.` : anyOf([`I do not know what to do without ${rec.female ? 'her' : 'him'}.`, `Goodbye, ${rec.first}.`])]]); });
    step(4, 41, () => say(speak, speak, [[speak, `Rest now, ${rec.first}. May the Beer Volcano never run dry for you. ${town.name} will keep your name. R'amen.`]]));
    if (rec.wasPlayer && rec.heir) ownFuneral(f, rec, speak, step);
    step(5, FUN_WAKE, () => npcs.forEach(o => { const st = o.plan && o.plan[o.si]; if (!o.player && st && /funeral|to rest/.test(st.text || '')) abortPlan(o); }));
  }
}
/* visiting a loved one's cross */
function graveVisitPlan(n, tod) {
  if (n.age < 8 || !(town.crosses || []).length) return null;
  const mine = town.crosses.filter(q => ((q.rec.person && isKin(n, q.rec.person)) || (n.aff[q.rec.id] || 0) >= 45) && crossAge(q) < 0.8);
  if (!mine.length) return null;
  const q = mine[Math.floor(Math.random() * mine.length)], b = besideTile(q.x, q.y); if (!b) return null;
  n.mourning = q.rec.id;
  return [goS({ x: b.x, y: b.y, face: { dx: Math.sign(q.x - b.x), dy: Math.sign(q.y - b.y) } }, `Walking to ${q.rec.first}'s cross`),
    waitS(18, 'stand', `Visiting ${q.rec.first}'s cross`, { social: true, nopie: true, onEnd(n) { n.mourning = null; n.social = Math.min(100, n.social + 8); if (Math.random() < 0.5) q.flowers = true; } })];
}

/* ---------- late nights: on a bonfire or celebration night, bedtime waits ---------- */
function lateNight() {
  const t = game.time, on = e => e && !e.done && t >= e.at - 30 && t < e.end;
  return on(town.feast) || on(town.wedding) || on(town.funeral) || !!(typeof activeParty === 'function' && activeParty());
}


/* the player can't walk through the fire, the cake or an open grave */
function noStep(x, y) {
  const t = game.time, f = town.feast, pt = typeof activeParty === 'function' && activeParty(), fu = town.funeral;
  if (((f && t >= f.at - 10 && t < f.end) || (town.yard && !town.fireGone)) && x === town.cx && y === town.cy + 1) return true;
  if (typeof fireList === 'function' && fireList().some(q => !q.home && q.x === x && q.y === y)) return true;
  if (pt && t >= pt.at - 10) { const c = cakeTile(); if (x === c.x && y === c.y) return true; }
  if (fu && !fu.done && t >= fu.at - 45 && x === fu.slot.x && y === fu.slot.y) return true;
  if ((town.remains || []).some(r => r.x === x && r.y === y)) return true;
  return false;
}

/* ---------- small talk at a wedding or funeral is about the people in it ---------- */
function ceremonyChat(n, p) {
  const t = game.time, w = town.wedding, f = town.funeral;
  if (w && !w.done && t >= w.at - 20 && t < w.end) {
    w.chatted = w.chatted || {}; const key = n.id + ':' + p.id; if (w.chatted[key]) return null;
    const near = Math.abs(p.tx - w.place.x) + Math.abs(p.ty - w.place.y) <= 12; if (!near) return null;
    w.chatted[key] = 1; const other = n === w.a ? w.b : w.a;
    if (n === w.a || n === w.b) {
      if (t < w.at + 46) return [[p, anyOf(['Good luck!', 'You look wonderful!'])], [n, anyOf(['My knees are shaking.', 'Shh, it is starting!', '*smiles nervously*'])]];
      bumpAff(n, p, 5, 10); addMem(n, 'feast', `${p.first} congratulating us on our wedding`, null, p.id);
      return [[p, anyOf([`Congratulations, ${n.first}!`, `Congratulations to you both!`, `You two look so happy.`])],
        [n, w.renewal ? anyOf([`Thank you! Second time is just as nice.`, `Thank you. I would marry ${other.first} a hundred times.`]) : anyOf([`Thank you, ${p.first}! I still cannot believe it.`, `Thank you! ${other.first} is stuck with me now.`, `Thank you. Did you see ${other.first} blush?`, `I am so happy I could burst.`])]];
    }
    const ka = kinWord(n, w.a), kb = kinWord(n, w.b), mineA = ka === 'son' || ka === 'daughter', mineB = kb === 'son' || kb === 'daughter';
    const ta = w.a.traits[0] && TRAIT_SEEN[w.a.traits[0]] ? TRAIT_SEEN[w.a.traits[0]](w.a) : 'is a good soul';
    const lines = t < w.at + 46 ? [`Shh, they are about to say their vows.`, `Doesn't ${w.b.first} look lovely?`, `I always knew those two would end up together.`]
      : mineA || mineB ? [`My ${mineA ? w.a.first : w.b.first}, married! I cried the whole way through.`, `I have gained a ${mineA ? (w.b.female ? 'daughter' : 'son') : (w.a.female ? 'daughter' : 'son')} today. ${mineA ? w.b.first : w.a.first} had better be good to my child.`]
      : [`${w.a.first} ${ta}. ${w.b.first} will keep ${w.a.female ? 'her' : 'him'} on ${w.a.female ? 'her' : 'his'} toes, though.`, `I saw ${w.a.first} and ${w.b.first} making eyes at each other ages ago.`, `A wedding! Just what this town needed.`, `Did you see ${w.a.first}'s face during the vows? Pure joy.`, `They will need a bigger house soon, if you know what I mean.`];
    return [[n, anyOf(lines)], [p, anyOf(['They make a good pair.', 'It was lovely.', 'Here is to them!', 'I know. Wonderful.'])]];
  }
  if (f && !f.done && t >= f.at - 20 && t < f.end) {
    f.chatted = f.chatted || {}; const key = n.id + ':' + p.id; if (f.chatted[key]) return null;
    if (Math.abs(p.tx - f.slot.x) + Math.abs(p.ty - f.slot.y) > 10) return null;
    f.chatted[key] = 1; const rec = f.rec, kin = rec.person && isKin(n, rec.person), hs = rec.female ? 'she' : 'he', his = rec.female ? 'her' : 'his';
    if (rec.wasPlayer && rec.heir && p.id === rec.heir.id) { bumpAff(n, p, 4, 10); return [[n, anyOf([`You have ${his} way of standing, you know.`, `${rec.first} talked about you all the time.`, `If you need anything, anything at all, you come to me.`, `${rec.first} built half this place. Now it is yours to look after.`, `I keep expecting ${rec.first} to walk up behind you.`])], [p, anyOf(['Thank you.', 'I know.', '*swallows hard*', 'That means a lot.'])]]; }
    if (kin) { bumpAff(n, p, 5, 10); return [[p, anyOf([`I am so sorry, ${n.first}.`, `I am sorry for your loss.`])], [n, anyOf([`Thank you for coming, ${p.first}. It means a lot.`, `I keep expecting ${rec.first} to walk round the corner.`, `${rec.age} years. It still was not enough.`])]]; }
    const m = (n.mem || []).filter(x => x.w === rec.id).slice(-1)[0];
    const lines = [m ? `I will never forget ${m.me}. ${rec.first} was good to me.` : `${rec.first} ${rec.quirk}. I will miss that.`, `It was a good send-off. ${rec.first} would have liked it.`, `${rec.age} years. ${hs[0].toUpperCase() + hs.slice(1)} saw this whole town grow up.`, `I still have the ${anyOf(['basket', 'knife', 'scarf'])} ${hs} gave me.`];
    return [[n, anyOf(lines)], [p, anyOf(['Rest well.', 'We will all miss ' + rec.first + '.', '*nods quietly*'])]];
  }
  return null;
}

/* ---------- the player is expected at weddings, funerals and birthday parties ---------- */
function summonEvent(n) {
  const t = game.time, w = town.wedding, f = town.funeral;
  if (w && !w.done && t >= w.at - 30 && t < w.end) { const pl = w.place || weddingPlace(), mine = n === w.a || n === w.b; return { key: 'w' + w.at0, kind: 'wedding', begun: !!w.begun, mid: { x: pl.x, y: pl.y }, spots: t >= w.at + WED_PARTY ? (pl.church ? chapelArea() : ceremonyArea(pl.x, pl.y, 6)) : mine ? [pl.couple[n === (w.a.female ? w.b : w.a) ? 0 : 1]] : pl.guests, go: `Oh! ${w.a.first} and ${w.b.first}'s wedding. I had better get over there.`, back: 'I should get back to the wedding.' }; }
  if (f && !f.done && t >= f.at - 45 && t < f.end) return { key: 'f' + f.at0, kind: 'funeral', begun: !!f.begun, mid: f.slot, spots: t >= f.at + FUN_WAKE ? ceremonyArea(f.slot.x, f.slot.y, 5) : mournSpots(f), go: `It is time for ${f.rec.first}'s funeral. I should go.`, back: `I should be with the others, for ${f.rec.first}.` };
  const pt = typeof activeParty === 'function' && activeParty();
  if (pt && pt.who !== n.id) { const b = byId(pt.who); if (b) return { key: 'p' + pt.at0, kind: 'party', begun: !!pt.begun, mid: cakeTile(), spots: partyArea(pt), go: `${b.first}'s birthday party! I nearly forgot.`, back: `Back to ${b.first}'s party.` }; }
  return null;
}
function guestSpot(n, ev) {
  const mid = ev.mid, spots = ev.spots || []; if (!spots.length) return null;
  const taken = new Set(npcs.filter(o => o !== n).map(o => { const g = o.path && o.path.length ? o.path[o.path.length - 1] : null; return g ? g.x + ',' + g.y : o.tx + ',' + o.ty; }));
  const free = spots.filter(q => !taken.has(q.x + ',' + q.y) && !noStep(q.x, q.y) && walkable(q.x, q.y)), pool = free.length ? free : spots;
  const sc = q => (Math.abs(q.x - n.tx) + Math.abs(q.y - n.ty)) * 0.15 + Math.hypot(q.x - mid.x, q.y - mid.y);
  const best = pool.slice().sort((a, b) => sc(a) - sc(b))[0], hx = Math.abs(mid.x - best.x) >= Math.abs(mid.y - best.y);
  return { x: best.x, y: best.y, face: { dx: hx ? Math.sign(mid.x - best.x) : 0, dy: hx ? 0 : Math.sign(mid.y - best.y) } };
}
/* nothing starts without you: the words wait until the player has arrived (up to two hours) */
function holdForPlayer(dt) {
  const pl = game.player; if (!pl || !pl.player || pl.dead) return;
  const hold = (e, mid, r) => {
    if (!e || e.done || e.begun) return; if (e.at0 == null) e.at0 = e.at;
    if (game.time < e.at) return;
    if (Math.abs(pl.tx - mid.x) + Math.abs(pl.ty - mid.y) <= r || e.at - e.at0 >= 120) { e.begun = true; return; }
    e.at += dt; e.end += dt;
  };
  const w = town.wedding; if (w) { const p = w.place || weddingPlace(); hold(w, { x: p.x, y: p.y }, 7); }
  const f = town.funeral; if (f) hold(f, f.slot, 6);
  const pt = (town.parties || []).find(p => !p.done && game.time >= p.at - 30 && game.time < p.end); if (pt) hold(pt, cakeTile(), pt.who === pl.id ? 3 : 7);
}

/* ---------- the priest's wisdom: ask him anything, get something ---------- */
const WISDOM = [
  ['A watched pot never boils. An unwatched pot boils over. The Monster teaches us there is no winning with pots.', ['Deep.', 'I will mind my pots.']],
  ['Every noodle is a little different, Tipping. Some are short, some are long, some are stuck to the bottom of the pan. All are loved.', ['Even the stuck ones?', 'Especially the stuck ones.']],
  ['The Monster made the world in four days, then rested for three. That is why I am so firm about the rest day.', ['Only four?', 'Seems sensible.']],
  ['Heaven has a beer volcano. Hell has one too, but the beer is warm and flat.', ['That is terrifying.', 'Good to know.']],
  ['When you cannot see the path ahead, follow the smell of garlic.', ['That works?', 'Noted.']],
  ['They say the Monster is invisible. That is why you have never seen Him. Checkmate.', ['Hard to argue.', 'Hmm.']],
  ['A colander keeps the water out and the pasta in. Be like a colander, Tipping. Let worries drain through you.', ['I will try.', 'That is... actually nice.']],
  ['Pirates were the first holy men. Fewer pirates, warmer winters. Look out at the water. No pirates. And it is cold. Coincidence?', ['Probably.', 'I suppose not.']],
  ['Never trust a man who eats his spaghetti with a spoon. Never.', ['Why not?', 'I will watch out.']],
  ['Life is like a meatball. You never know how big it will be until someone drops it on the floor.', ['That makes no sense.', 'So true.']],
  ['Do not fear the dark, child. It is just the Monster dimming the lights for dinner.', ['Comforting.', 'Is He nearby?']],
  ['I once tried to count the stars. I got to forty-two, then ate a bowl of noodles. The stars are still there. So was the bowl. Make of that what you will.', ['I will think on it.', 'Riveting.']],
  ['Overcooked pasta and an unkind word have this in common: you cannot take either back.', ['Wise.', 'I will be careful.']],
  ['When the Monster touches you with His Noodly Appendage, you will know. It feels like a warm sneeze.', ['Lovely.', 'Ew.']],
  ['A good wall is built one log at a time. A good sauce is stirred one turn at a time. A good priest... is late for most things, I find.', ['Ha!', 'I have noticed.']],
  ['Do not ask what the town can do for you. Ask what you can bring to the next feast.', ['I will bring berries.', 'Fair.']],
  ['The mountains are just the Monster\'s leftovers. He had a big lunch.', ['That is a lot of leftovers.', 'Makes sense.']],
  ['I do not know where we go after we die. But I am fairly sure there is parmesan.', ['That helps.', 'I hope so.']],
  ['The wise man knows he knows nothing. The wiser man knows where the bread is kept.', ['Where is it kept?', 'Ha.']],
  ['If a tree falls in the forest and nobody hears it, someone still has to carry the logs. Usually you.', ['Story of my life.', 'True.']],
  ['There are two kinds of people: those who break the spaghetti before boiling and those who are right.', ['Which am I?', 'I break it.']],
  ['Arrr. Forgive me. When the spirit moves me, it moves me like a pirate.', ['Arrr.', 'Forgiven.']],
  ['The Monster sees all, but mostly He is looking at the cooking pot.', ['Me too, really.', 'Understandable.']],
  ['Patience is a virtue. So is salting the water. Too many forget the water.', ['I always forget.', 'Noted.']],
  ['Every cross out there in the grass is a story. Every bowl of pasta is a story too. Fewer people cry over the pasta.', ['Hm.', 'Thank you.']],
  ['You look tired, Tipping. Sleep is a little death, but with snoring.', ['I am tired.', 'Cheerful.']],
  ['Some say faith moves mountains. I say a strong back and a good cart do it faster.', ['Practical.', 'Ha!']],
  ['If you meet the Monster on the road, offer Him a meatball. He will not take it. He is a spirit. But it is polite.', ['I will.', 'Odd but nice.']],
  ['Life is short. Eat the good bread first.', ['Wise words.', 'Already do.']],
  ['A friend is someone who tells you there is sauce on your chin. You have sauce on your chin.', ['Oh! Thanks.', 'I do not even have sauce.']],
];
function priestWisdom(n, p) {
  if (n.role !== 'Priest' || p !== game.player) return null;
  const heard = p.wisdom = p.wisdom || [];
  if (heard.length >= WISDOM.length) heard.length = 0;
  const left = WISDOM.map((w, i) => i).filter(i => !heard.includes(i)), i = left[Math.floor(Math.random() * left.length)]; heard.push(i);
  const [line, reps]: any = WISDOM[i]; bumpKnow(n, p, 2); bumpAff(n, p, 1, 6);
  return [[n, line.replace(/Tipping/g, p.first)], [p, anyOf(reps)]];
}

