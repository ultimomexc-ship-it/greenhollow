/* ---------------- friends make plans ---------------- */
const LF_GATH: any = {
  picnic:  { label: 'a picnic', noun: 'picnic', hours: [11, 16], dur: 75, text: 'Having a picnic with friends', act: 'leisure', where: 'meadow' },
  songs:   { label: 'an evening of songs', noun: 'evening of songs', hours: [16, 20], dur: 60, text: 'Singing songs with friends', act: 'leisure', where: 'plaza' },
  dance:   { label: 'a dance on the square', noun: 'dance', hours: [16, 20], dur: 60, text: 'Dancing on the square', act: 'leisure', where: 'plaza', min: 3 },
  cards:   { label: 'cards at the tavern', noun: 'card game', hours: [16, 21], dur: 70, text: 'Playing cards with friends', act: 'leisure', where: 'tavern' },
  fishing: { label: 'a fishing trip', noun: 'fishing trip', hours: [7, 14], dur: 70, text: 'Fishing with friends', act: 'work', tool: 'fish', where: 'shore' },
  walk:    { label: 'a long walk', noun: 'long walk', hours: [9, 16], dur: 60, text: 'Out walking with friends', act: 'leisure', where: 'meadow' }
};
const lfFree = q => !(q.shop || q.role === 'Barkeep' || q.role === 'Priest');
function lfGArea(kind, host) {
  const w = LF_GATH[kind].where;
  if (w === 'plaza') return plazaTiles.filter(t => walkable(t.x, t.y) && !lfPropAt(t.x, t.y) && !noStep(t.x, t.y));
  if (w === 'shore') return nearTiles(shoreTiles, host, 14, fishOK);
  if (w === 'tavern') { const tv = town.tavern; return tv ? tv.seats.map(s => ({ x: s.x, y: s.y, face: s.face, sit: true })) : []; }
  const f = favSpot(host); if (!f) return [];
  const a = []; for (let y = f.y - 3; y <= f.y + 3; y++) for (let x = f.x - 3; x <= f.x + 3; x++) if (x > 1 && y > 1 && x < W - 2 && y < H - 2 && walkable(x, y) && roomAt[y][x] < 0 && reach[y * W + x] && !town.siteAt[y * W + x] && !lfPropAt(x, y)) a.push({ x, y });
  return a;
}
function lfOrganise(h) {
  if (h < 8 || h > 17 || eventsBusy()) return;
  const live = (town.gath || []).filter(g => !g.done);
  if (live.length >= 2) return;
  const tod = game.time % 1440, rest = isRestDay() ? 2 : 1;
  for (const o of npcs.slice()) {
    if (live.length >= 2) break;
    if (o.dead || o.player || o.infant || o.age < 16 || !lfFree(o) || o.trapped || (o.lfOrg || 0) > game.time || o.mood < 48 || o.hunger > 70 || o.pose === 'sleep' || !isAwake(o, tod)) continue;
    const sociable = o.traits.includes('sociable') || o.traits.includes('jovial') || o.traits.includes('cheerful');
    const want = (60 - o.fun) / 80 + (60 - o.social) / 120;
    const p = (0.035 + (sociable ? 0.05 : 0) + Math.max(0, want) * 0.08 + (o.mood - 50) / 600) * rest;
    if (Math.random() > p) continue;
    const g = lfPlan(o); o.lfOrg = game.time + 1440 * 1.2; if (g) live.push(g);
  }
}
function lfPlan(o) {
  const tod = game.time % 1440, h = tod / 60, hb = hobbyOf(o), opts = {};
  for (const k in LF_GATH) {
    const d = LF_GATH[k]; if (h + 1 > d.hours[1]) continue;
    if (d.where === 'tavern' && !town.tavern) continue; if (d.where === 'shore' && (!shoreTiles.length || !fishAvail())) continue;
    opts[k] = 1 + (k === 'fishing' && hb === 'fishing' ? 2.5 : 0) + (k === 'songs' && hb === 'singing' ? 2.5 : 0) + (k === 'walk' && hb === 'walking' ? 2 : 0) + (k === 'cards' && o.traits.includes('gossipy') ? 1.5 : 0) + (k === 'dance' && o.traits.includes('jovial') ? 1.5 : 0);
  }
  if (!Object.keys(opts).length) return null;
  const kind = wpick(o.rand || Math.random, opts), d = LF_GATH[kind];
  const cand = [];
  for (const q of npcs) {
    if (q === o || q.dead || q.infant || q.age < 12 || q.player || !lfFree(q) || lfDist(q, o) > 45) continue;
    const af = o.aff[q.id] || 0, fam = isKin(o, q) && q.age >= 14;
    if (af < 22 && !fam && o.rel[q.id] !== 'friend') continue; cand.push({ q, af: af + (fam ? 15 : 0) + Math.random() * 12 });
  }
  cand.sort((a, b) => b.af - a.af);
  const going = [];
  for (const { q, af } of cand.slice(0, 6)) {
    const pa = 0.45 + af / 170 + (q.mood - 50) / 260 - (q.hunger > 70 ? 0.2 : 0) - (q.trapped ? 1 : 0);
    if (Math.random() < pa) going.push(q.id);
  }
  if (going.length < (d.min || 1)) { if (cand.length) lfMod(o, 'nobody', 'nobody could come', -4, 400); return null; }
  const at = Math.max(game.time + 50, lfDay() * 1440 + Math.max(h + 1, d.hours[0]) * 60 + Math.floor(Math.random() * 40));
  const area = lfGArea(kind, o); if (!area.length) return null;
  const g = { id: (town.gathId = (town.gathId || 0) + 1), host: o.id, kind, at, end: at + d.dur, going, area, done: false, started: false };
  town.gath.push(g);
  chron(`${nameOf(o)} is organising ${d.label} at ${fmtTime(at)} with ${lfList(going.map(id => byId(id).first))}.`, 'love');
  return g;
}
function lfGathPlan(n, tod) {
  if (!lfFree(n)) return null;
  for (const g of town.gath || []) {
    if (g.done || game.time < g.at - 35 || game.time >= g.end) continue;
    if (g.host !== n.id && !g.going.includes(n.id)) continue;
    if (n.hunger > 85 || n.mourning || n.trapped) continue;
    const d = LF_GATH[g.kind], host = byId(g.host);
    const text = g.host === n.id ? `Hosting ${d.label}` : `Going to ${host ? host.first + "'s " : 'the '}${d.noun}`;
    const spot = nn => { const t = g.area[Math.floor(nn.rand() * g.area.length)]; return { x: t.x, y: t.y, face: t.face || null, sit: !!t.sit }; };
    const roams = g.kind !== 'fishing' && g.kind !== 'cards';
    return [goS(spot, text), waitS(g.end - game.time, d.act, d.text, { area: roams ? g.area : null, roam: roams ? [10, 22] : null, tool: d.tool, social: true, nopie: true })];
  }
  return null;
}
function lfGathTick() {
  for (const g of town.gath || []) {
    if (g.done) continue;
    const host = byId(g.host), d = LF_GATH[g.kind], mid = g.area[Math.floor(g.area.length / 2)] || { x: town.cx, y: town.cy };
    const here = id => { const q = byId(id); return q && !q.dead && q.pose !== 'sleep' && Math.abs(q.tx - mid.x) + Math.abs(q.ty - mid.y) <= 14; };
    if (!g.started && game.time >= g.at + 20) {
      g.started = true;
      if (!host || host.dead || !here(g.host)) {                    // the host never turns up
        g.done = true; const guests = g.going.filter(here).map(byId);
        guests.forEach(q => { lfMod(q, 'standup' + g.id, 'was stood up', -7, 700); if (host && !host.dead) lfAff(q, host, -3); });
        if (host && !host.dead) { lfMod(host, 'missed' + g.id, 'missed their own ' + d.noun, -14, 1100); addMem(host, 'missed', `the day I missed my own ${d.noun}`, null, null); }
        chron(`${host ? nameOf(host) : 'The host'}'s ${d.noun} fell through: ${host && !host.dead ? host.first + (host.trapped ? ' was stuck' : ' never turned up') : 'the host was gone'}.`, 'love');
        continue;
      }
    }
    if (game.time >= g.end) {
      g.done = true; const att = [g.host, ...g.going].filter(here).map(byId);
      if (att.length < 2) continue;
      att.forEach(a => {
        a.social = Math.min(100, a.social + 30); a.fun = Math.min(100, a.fun + 34); lfMod(a, 'gath' + g.id, `enjoyed the ${d.noun} with friends`, 12, 1500);
        addMem(a, 'gathering', `the ${d.noun} with ${lfList(att.filter(b => b !== a).slice(0, 2).map(b => b.first))}`, `when we had ${d.label}`, null);
        att.forEach(b => { if (a !== b) bumpAff(a, b, 3, 2); });
      });
      if (host && !host.dead) chron(`${host.first}'s ${d.noun} went well: ${att.length - 1} friend${att.length > 2 ? 's' : ''} came.`, 'love');
    }
  }
  town.gath = (town.gath || []).filter(g => !g.done || game.time - g.end < 2880);
}

/* ---------------- spirits drive what people do ---------------- */
function lifeDecide(n, tod) {
  if (n.age < 4 || n.infant || n.bladder === undefined) return null;
  if (n.bladder >= (n.hunger >= 85 ? 92 : 66)) return toiletPlan(n);
  if (n.hunger >= 75) return null;
  if (n.age >= 10) { const gp = lfGathPlan(n, tod); if (gp) return gp; }
  if (n.age >= 14 && n.mood >= 52 && (n.lfCare || 0) < game.time) { n.lfCare = game.time + 120; const cp = lfComfortPlan(n, tod); if (cp) return cp; }
  if (n.age >= 14 && n.mood < 32 && (n.lfSulk || 0) < game.time && lfFree(n)) { n.lfSulk = game.time + 110; const sp = lfSulkPlan(n, tod); if (sp) return sp; }
  if (n.age >= 14 && n.tidy && (n.lfTidy || 0) < game.time) { n.lfTidy = game.time + 40; const tp = lfTidyPlan(n); if (tp) return tp; }
  return null;
}
function lfComfortPlan(n, tod) {
  let best = null, bs = -1;
  for (const o of npcs) {
    if (o === n || o.dead || o.infant || o.pose === 'sleep' || o.trapped || o.mood > 30 || (o.lfCared || 0) > game.time || lfDist(o, n) > 40) continue;
    const af = n.aff[o.id] || 0, fam = isKin(n, o) && n.age >= 14; if (af < 28 && !fam) continue;
    const s = af + (fam ? 20 : 0) - lfDist(o, n) * 0.5 + Math.random() * 10; if (s > bs) { bs = s; best = o; }
  }
  if (!best) return null;
  const o = best; o.lfCared = game.time + 500;
  return [goS(() => { const b = besideTile(o.tx, o.ty, null); return b ? { x: b.x, y: b.y, face: { dx: Math.sign(o.tx - b.x), dy: Math.sign(o.ty - b.y) } } : null; }, `Going to cheer up ${o.first}`),
    waitS(7, 'stand', `Cheering up ${o.first}`, { social: true, nopie: true, onEnd(nn) {
      if (Math.abs(o.tx - nn.tx) + Math.abs(o.ty - nn.ty) > 3) return;
      bumpAff(nn, o, 7, 10); o.social = Math.min(100, o.social + 25); lfMod(o, 'comfort', 'cheered up by ' + nn.first, 24, 700);
      addMem(o, 'comfort', `the day ${nn.first} came to cheer me up`, `when you came to cheer me up`, nn.id); addMem(nn, 'comfort', `the day I cheered up ${o.first}`, null, o.id);
      if (!o.player) lfShout(o, anyOf(['Thank you. I needed that.', 'You are a good friend.', 'I feel a bit better already.']));
      if (Math.random() < 0.5) chron(`${nn.first} went to cheer up ${o.first}, who had been low.`, 'life');
    } })];
}
function lfSulkPlan(n, tod) {
  const h = tod / 60, o: any = {};
  if (n.homeRoom) o.home = 3; if (shoreTiles.length) o.shore = 2; if (town.tavern && h >= 16 && h < 23) o.tavern = 3; o.quarrel = 1.5 + (n.traits.includes('grumpy') ? 2 : 0) + (n.traits.includes('proud') ? 1 : 0);
  const k = wpick(n.rand || Math.random, o);
  if (k === 'home') return [goS(homeSpot, 'Heading home in a mood'), waitS(50 + lfR(n) * 40, 'stand', 'Sulking at home', { nopie: true })];
  if (k === 'shore') return [goS(nn => pickFrom(nearTiles(shoreTiles, nn, 12), nn), 'Wandering off alone'), waitS(40 + lfR(n) * 30, 'leisure', 'Brooding by the water', { nopie: true, area: nearTiles(shoreTiles, n, 12), roam: [10, 20] })];
  if (k === 'tavern') { const tv = town.tavern; return [goS(nn => { const s = tv.seats[Math.floor(nn.rand() * tv.seats.length)]; return { x: s.x, y: s.y, face: s.face, sit: true }; }, 'Heading to ' + tv.name + ' to be miserable'), waitS(45 + lfR(n) * 30, 'leisure', 'Drowning their sorrows at ' + tv.name, { nopie: true, onEnd(nn) { nn.social = Math.min(100, nn.social + 10); nn.fun = Math.min(100, nn.fun + 12); lfMod(nn, 'drink', 'had a few drinks', 8, 300); } })]; }
  if (k === 'quarrel') {
    let best = null, bs = 1e9; for (const q of npcs) { if (q === n || q.dead || q.infant || q.age < 12 || q.pose === 'sleep' || lfDist(q, n) > 30) continue; const af = n.aff[q.id] || 0; if (af < 5 && af < bs) { bs = af; best = q; } }
    if (best) { const q = best; return [goS(() => { const b = besideTile(q.tx, q.ty, null); return b ? { x: b.x, y: b.y, face: { dx: Math.sign(q.tx - b.x), dy: Math.sign(q.ty - b.y) } } : null; }, `Going to have it out with ${q.first}`),
      waitS(4, 'stand', `Arguing with ${q.first}`, { social: true, nopie: true, onEnd(nn) { if (Math.abs(q.tx - nn.tx) + Math.abs(q.ty - nn.ty) > 3) return; bumpAff(nn, q, -7, 4); lfMod(nn, 'row', 'had a row with ' + q.first, -6, 500); lfMod(q, 'row', 'had a row with ' + nn.first, -9, 600);
        say(nn, q, [[nn, anyOf(['I have had enough of you.', 'You never listen!', 'Do you know what kind of day I am having?'])], [q, anyOf(['Do not take it out on me!', 'What did I do now?', 'Charming. Truly.'])]]); chron(`${nn.first} and ${q.first} had a row.`, 'life'); } })]; }
  }
  return [waitS(30, 'stand', 'Staring into space', { nopie: true })];
}

/* ---------------- jobs: people have their own work, and may change it ---------------- */
function lfJobBias(n, sc) {
  if (!n.job || n.role !== 'Worker') return;
  for (const r in sc) sc[r] = r === n.job ? sc[r] * 1.8 + 22 : sc[r] * 0.55;
}
function lfJobOptions() {
  const o = [];
  if (shoreTiles.length && fishAvail()) o.push('Fisher'); if (town.crops.length) o.push('Farmer'); if (town.nodes.some(x => x.amt >= 1 && reach[x.y * W + x.x])) o.push('Gatherer');
  if (treeList().length) o.push('Woodcutter'); if (stoneList().length) o.push('Stonecutter'); return o;
}
function lfJobsDaily() {
  const fd = foodDaysNow(), opts = lfJobOptions(), food = ['Fisher', 'Farmer', 'Gatherer'];
  for (const n of npcs) {
    if (n.dead || n.player || n.role !== 'Worker' || n.age < 16 || n.age >= 60 || n.shop || LF2_JOBS[n.job]) continue;
    if (!n.job) { n.job = lfFirstJob(n); continue; }
    let why = null, next = null; const others = opts.filter(j => j !== n.job);
    if (fd < 1.6 && !food.includes(n.job)) { const f = opts.filter(j => food.includes(j)); next = f[Math.floor(Math.random() * f.length)] || null; why = 'to help put food on the table'; }
    else if (n.jobSat < 36 && Math.random() < 0.6) { next = others[Math.floor(Math.random() * others.length)] || null; why = 'after a miserable stretch at the old work'; }
    else if (Math.random() < 0.03) { next = others[Math.floor(Math.random() * others.length)] || null; why = 'on a whim'; }
    else if (n.mood < 60) {                                      // a happy friend's trade looks appealing
      const f = npcs.find(o => o !== n && o.job && o.job !== n.job && opts.includes(o.job) && (n.aff[o.id] || 0) >= 40 && o.mood > 66);
      if (f && Math.random() < 0.15) { next = f.job; why = 'to work alongside ' + f.first; }
    }
    if (next && next !== n.job && opts.includes(next)) {
      const old = n.job; n.job = next; n.cur = null; n.curUntil = 0; n.jobSat = 60;
      chron(`${nameOf(n)} gave up ${LF_JOBN[old]} and took up ${LF_JOBN[next]} ${why}.`, 'life'); addMem(n, 'job', `the day I took up ${LF_JOBN[next]}`, null, null);
    }
  }
}
function lifeHourly(hr) {
  const h = hr % 24;
  lfOrganise(h);
  if (h === 21) lfJobsDaily();
  if (h === 3 && town.puddles) town.puddles = town.puddles.filter(p => game.time - p.t < 1440);
}

/* ---------------- the ready-built village ---------------- */
function lfBuild(kind, w, h, o) {
  const s = createSite(kind, w, h, o); if (!s) { console.warn('prebuild: no room for', kind, w + 'x' + h); return null; }
  completeSite(s, true);
  town.sites.filter(q => q.kind === 'road').forEach(q => completeSite(q, true));
  refreshReach(); return s;
}
function prebuildVillage() {
  lfInitProps();
  // a green with a larder, a chapel and a tavern, then houses for every family, fields and privies
  lfBuild('market', 9, 7, { first: true });
  const seen = new Set(), all = npcs.filter(n => n.age >= 3);
  const rel = (p, q) => q.fam.spouse === p.id || p.fam.spouse === q.id || q.fam.kids.includes(p.id) || p.fam.kids.includes(q.id) || q.fam.mother === p.id || q.fam.father === p.id || p.fam.mother === q.id || p.fam.father === q.id;
  all.filter(n => n.age >= 16).forEach(adult => {
    if (seen.has(adult.id)) return;
    const fam = new Set([adult]); let ch = true;
    while (ch) { ch = false; all.forEach(p => { if (!fam.has(p) && [...fam].some(q => rel(p, q))) { fam.add(p); ch = true; } }); }
    const group = [...fam]; group.forEach(p => seen.add(p.id));
    const beds = Math.min(6, group.length + 1), d = houseDims(beds), o = { beds, owners: group.slice(0, 6), surname: adult.surname };
    for (const x of [{}, { tight: true }, { clear: true }, { tight: true, clear: true }]) if (lfBuild('house', d.w, d.h, Object.assign({}, o, x))) break;
  });
  for (const [w, h, tight, clear] of [[15, 11], [15, 11, false, true], [13, 9, false, true], [11, 8, true, true]]) if (lfBuild('church', w, h, { tight: !!tight, clear: !!clear })) break;
  for (const [w, h, tight, clear] of [[10, 7], [9, 6], [9, 6, true], [9, 6, true, true]]) if (lfBuild('tavern', w, h, { tight: !!tight, clear: !!clear })) break;
  for (let i = 0; i < 2; i++) lfBuild('field', 10, 5, {}) || lfBuild('field', 8, 4, {});
  const homes = rooms.filter(r => r.kind === 'house' && !r.dead), R = rng(town.seed + 99);
  for (let k = 0; k < Math.max(3, Math.ceil(homes.length * 1.2)); k++) { const hm = homes[k % Math.max(1, homes.length)]; if (hm) lfBuild('privy', 3, 3, { tight: true, near: { x: hm.x + hm.w / 2 + (R() - 0.5) * 8, y: hm.y + hm.h / 2 + (R() - 0.5) * 8 } }); }
  // stocked larders, a few days' worth
  const seenR = new Set();
  npcs.forEach(n => { if (!n.homeRoom || seenR.has(n.homeRoom)) return; seenR.add(n.homeRoom); const k = hhOf(n).length, p = n.homeRoom.pantry; p.berries = Math.round(k * (3 + R() * 2)); p.fish = Math.round(k * (2 + R() * 2)); p.grain = Math.round(k * (1 + R() * 2)); });
  refreshReach(); refreshShore(); syncTents(); staffMarkets();
  npcs.forEach(n => { if (n.homeRoom) n.inv = {}; });
  lfPlaceProps();
  // everyone has something of their own to do
  const ws = npcs.filter(n => n.role === 'Worker' && n.age >= 16 && n.age < 60 && !n.shop);
  const want = ['Farmer', 'Fisher', 'Farmer', 'Gatherer']; if (!shoreTiles.length) want.splice(1, 1);
  ws.forEach((n, i) => { n.job = want[i] || lfFirstJob(n); });
  lf2Prebuild();
  npcs.forEach(n => { if (n.homeRoom && n.bed && n.bed.x != null) { n.x = n.tx = n.bed.x; n.y = n.ty = n.bed.y; n.path = []; n.moving = false; } });
}

/* ---------------- how it looks ---------------- */
YSORT.push(function (c, now) {
  const out = [];
  for (const p of town.puddles || []) if (gaOnScreen(p.x, p.y, 1)) out.push({ k: p.y - 0.4, f: () => { c.fillStyle = 'rgba(214,190,70,.5)'; c.beginPath(); c.ellipse(p.x * TS + 12, p.y * TS + 19, 6, 2.6, 0, 0, 6.3); c.fill(); c.fillStyle = 'rgba(255,240,150,.3)'; c.beginPath(); c.ellipse(p.x * TS + 10, p.y * TS + 18.4, 2.6, 1, 0, 0, 6.3); c.fill(); } });
  for (const pr of town.props || []) {
    if (!gaOnScreen(pr.x, pr.y, 2)) continue;
    out.push({ k: pr.y - 0.015, f: () => {
      let x = pr.x, y = pr.y; if (pr.st) { const e = Math.min(1, (now - pr.st) / pr.dur); if (e < 1) { const q = e * e * (3 - 2 * e); x = pr.fx + (pr.x - pr.fx) * q; y = pr.fy + (pr.y - pr.fy) * q; } else pr.st = 0; }
      gaDraw(c, LF_ART[pr.kind] || 'crate', x * TS, y * TS, now, 0); } });
  }
  return out;
});
function lfDrawThoughts(c, now) {
  const k = Math.min(1.5, Math.max(0.5, cam.z * 0.8));
  for (const n of npcs) {
    if (n.dead || n.infant || n.inShip || n.pose === 'sleep' || n.bladder === undefined || !canSee(n.x, n.y)) continue;
    let icon = null;
    if (n.trapped) icon = 'trap'; else if (n.bladder >= 74) icon = 'drop'; else if (n.hunger >= 82) icon = 'food'; else if (n.mood < 24) icon = 'sad'; else if (n.mood > 88) icon = 'glad';
    if (!icon) continue;
    const L = n.look || assignLook(n), sy = (n.scale || 1) * (n.age >= 16 ? L.h : 1), s = toScreen(n.x * TS + TS / 2 + 9, n.y * TS + 22 - 21 * sy - 4);
    if (s.x < -30 || s.y < -30 || s.x > cam.cw + 30 || s.y > cam.ch + 40) continue;
    const r = 5.2 * k, bob = Math.sin(now / 260 + n.id) * 1.2 * k, x = s.x, y = s.y - r + bob;
    c.save(); c.lineWidth = 1.3 * k; c.strokeStyle = 'rgba(30,20,40,.85)';
    if (icon === 'drop') { c.fillStyle = '#58b4e8'; c.beginPath(); c.moveTo(x, y - r * 1.25); c.quadraticCurveTo(x + r * 1.05, y + r * 0.1, x, y + r * 0.95); c.quadraticCurveTo(x - r * 1.05, y + r * 0.1, x, y - r * 1.25); c.fill(); c.stroke(); c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.arc(x - r * 0.3, y, r * 0.22, 0, 6.3); c.fill(); }
    else if (icon === 'food') { c.fillStyle = '#e0a458'; c.beginPath(); c.ellipse(x, y, r * 1.1, r * 0.8, 0, 0, 6.3); c.fill(); c.stroke(); c.strokeStyle = 'rgba(120,70,30,.8)'; c.beginPath(); c.moveTo(x - r * 0.4, y - r * 0.5); c.lineTo(x - r * 0.1, y + r * 0.5); c.moveTo(x + r * 0.2, y - r * 0.5); c.lineTo(x + r * 0.5, y + r * 0.5); c.stroke(); }
    else if (icon === 'trap') { c.fillStyle = '#e24a3a'; c.beginPath(); c.arc(x, y, r * 1.15, 0, 6.3); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.fillRect(x - r * 0.18, y - r * 0.7, r * 0.36, r * 0.9); c.beginPath(); c.arc(x, y + r * 0.62, r * 0.22, 0, 6.3); c.fill(); }
    else { c.fillStyle = icon === 'sad' ? '#b0b8c8' : '#ffd86a'; c.beginPath(); c.arc(x, y, r * 1.1, 0, 6.3); c.fill(); c.stroke(); c.fillStyle = 'rgba(30,20,40,.85)'; c.beginPath(); c.arc(x - r * 0.4, y - r * 0.25, r * 0.16, 0, 6.3); c.arc(x + r * 0.4, y - r * 0.25, r * 0.16, 0, 6.3); c.fill(); c.beginPath(); c.arc(x, y + (icon === 'sad' ? r * 0.75 : r * 0.1), r * 0.5, icon === 'sad' ? Math.PI * 1.1 : Math.PI * 0.1, icon === 'sad' ? Math.PI * 1.9 : Math.PI * 0.9); c.stroke(); }
    c.restore();
  }
}

/* ---------------- you: pushing, the privy, the card and the bar ---------------- */
function lifePlayerPush(n, p, fx, fy, dx, dy) {
  const pr = lfPropAt(fx, fy); if (!pr) return null;
  const label = LF_NOUN[pr.kind];
  if (!p.push) return { msg: 'A ' + label + '. Hold Space and walk into it to push it.' };
  if (lfPush(pr, dx, dy, n)) return null;
  return { msg: 'The ' + label + ' will not budge.' };
}
function lifePrivyAct(n, x, y) {
  if (n.bladder < 12) return { msg: 'You do not need to go right now.' };
  return { key: 'privy', min: 4, text: 'Using the privy', tool: null, run(nn) { nn.bladder = 0; lfMod(nn, 'relief', 'relieved', 5, 150); playerSay(nn, anyOf(['Ahh. Much better.', 'That was close.', 'Why is this so satisfying?'])); } };
}
function lfWhy(n) {
  const out = [];
  const needs = [[n.hunger >= 70 ? 'hungry' : '', n.hunger], [n.bladder >= 70 ? 'desperate for the privy' : '', n.bladder], [n.energy < 20 ? 'exhausted' : '', 100 - n.energy], [n.social < 25 ? 'lonely' : '', 100 - n.social], [n.fun < 20 ? 'bored' : '', 100 - n.fun]].filter(x => x[0]).sort((a, b) => b[1] - a[1]);
  if (needs.length) out.push(needs[0][0]);
  (n.mods || []).map(m => ({ t: m.text, v: m.v * (1 - (game.time - m.t0) / m.dur) })).filter(m => Math.abs(m.v) >= 3).sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 2).forEach(m => out.push(m.t));
  return out.join(', ');
}
function lifeBars(n) {
  if (n.bladder === undefined) return needBar('Fullness', 100 - n.hunger, true, Math.round(100 - n.hunger) + '%') + needBar('Company', n.social, true, Math.round(n.social) + '%');
  const why = lfWhy(n);
  return '<p class="sub" style="margin:2px 0 6px"><b>' + lfMoodWord(n.mood) + '</b>' + (n.trapped ? ' · <b style="color:var(--amber)">stuck</b>' : '') + (why ? ' · ' + esc(why) : '') + '</p>' +
    needBar('Mood', n.mood, true, Math.round(n.mood) + '%') + needBar('Fullness', 100 - n.hunger, true, Math.round(100 - n.hunger) + '%') + needBar('Bladder', n.bladder, false, Math.round(n.bladder) + '%') +
    needBar('Rest', n.energy, true, Math.round(n.energy) + '%') + needBar('Fun', n.fun, true, Math.round(n.fun) + '%') + needBar('Company', n.social, true, Math.round(n.social) + '%') +
    (n.job && n.role === 'Worker' ? '<p class="sub" style="margin:6px 0 0">Usually ' + ({ Fisher: 'fishes', Farmer: 'works the fields', Gatherer: 'forages', Woodcutter: 'cuts timber', Stonecutter: 'cuts stone' }[n.job] || 'works') + '.</p>' : '');
}
let lifeSig = n => n.bladder === undefined ? '' : [Math.round(n.mood / 2), Math.round(n.bladder / 2), Math.round(n.energy / 2), Math.round(n.fun / 2), n.job, !!n.trapped, (n.mods || []).length].join(',');
function lifeHud(n) {
  if (n.bladder === undefined) return '';
  const b = Math.round(n.bladder), tone = b > 80 ? 'bad' : b > 55 ? 'warn' : '';
  return '<span>Bladder <span class="hbar ' + tone + '"><i style="width:' + b + '%"></i></span></span><span>' + lfMoodWord(n.mood) + '</span>';
}
function lifeHowAre(n, out) {
  if (n.trapped) { out.push('Stuck. Something is blocking the way, and I do not know who put it there.'); return; }
  if (n.bladder >= 75) out.push('Do not mind me. I just need the privy. Rather badly.');
  const m = (n.mods || []).filter(x => game.time - x.t0 < x.dur).sort((a, b) => Math.abs(b.v) - Math.abs(a.v))[0];
  if (n.mood < 30) out.push(anyOf(['Rotten, honestly.', 'Low. Everything feels like too much today.']) + (m ? ' I keep thinking about how I ' + m.text + '.' : ''));
  else if (n.mood > 80) out.push(anyOf(['Wonderful, actually!', 'Better than I have been in ages.']) + (m && m.v > 0 ? ' I ' + m.text + '.' : ''));
}
/* the hold-a-key controls (Space, Shift, E, R, C, Z) are in life2/controls.ts */
function lfBtnSync() { if (typeof lf2SyncModeBtn === 'function') lf2SyncModeBtn(); }

