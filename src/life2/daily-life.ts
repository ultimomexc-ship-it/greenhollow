/* ================= life2 / daily life: kitchens, bedtime, baths, the tavern, barred doors, romance ================= */
const lf2Spouse = n => { const s = n.fam && (n.fam.spouse || n.fam.partner); const o = s != null ? byId(s) : null; return o && !o.dead ? o : null; };
const lf2Hr = () => (game.time % 1440) / 60;

/* ---------------- a hearth in every house ---------------- */
function lf2PlaceHearth(r) {
  if (r.hearth || r.dead || r.kind !== 'house') return;
  const inside = (x, y) => x > r.x && x < r.x + r.w - 1 && y > r.y && y < r.y + r.h - 1;
  const din = { x: r.doorX, y: r.side === 'b' ? r.doorY - 1 : r.doorY + 1 };
  const needs = [...(r.seats || []), ...(r.beds || []), r.spots.pantry].filter(Boolean);
  const reach = () => { const seen = new Set([din.y * W + din.x]), q = [din]; while (q.length) { const c = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = c.x + dx, y = c.y + dy, k = y * W + x; if (!inside(x, y) || seen.has(k) || BLOCKED.has(grid[y][x])) continue; seen.add(k); q.push({ x, y }); } } return needs.every(s => seen.has(s.y * W + s.x)); };
  for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
    if (grid[y][x] !== T.FLOOR || Math.abs(x - din.x) + Math.abs(y - din.y) <= 1 || needs.some(s => s.x === x && s.y === y)) continue;
    const wallAdj = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1); if (!wallAdj) continue;
    const cook = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: x + dx, y: y + dy, face: { dx: -dx, dy: -dy } })).find(c => inside(c.x, c.y) && grid[c.y][c.x] === T.FLOOR && !needs.some(s => s.x === c.x && s.y === c.y));
    if (!cook) continue;
    grid[y][x] = T.OVEN; if (!reach()) { grid[y][x] = T.FLOOR; continue; }
    setT(x, y, T.OVEN); markDirty(x, y, 1, 1); r.hearth = { x, y }; r.spots.cook = cook; return;
  }
  r.hearth = { none: true };
}
/* someone cooks supper: a hot meal lifts the whole family */
function lf2CookPlan(n, tod) {
  if (!LF2.on('cooking') || n.age < 14 || !n.homeRoom || n.player) return null;
  const r = n.homeRoom, h = tod / 60; if (h < 16.6 || h >= 17.6 || !r.spots || !r.spots.cook || r.cookDay === dayN() || !foodCount(r.pantry || {})) return null;
  const cooks = hhOf(n).filter(o => o.age >= 14 && !o.dead && !o.player && !o.jail).sort((a, b) => (lf2Has(b, 'homebody') ? 2 : 0) + (lf2Has(b, 'generous') ? 1 : 0) - (lf2Has(a, 'homebody') ? 2 : 0) - (lf2Has(a, 'generous') ? 1 : 0) + ((a.id + dayN()) % 3) - ((b.id + dayN()) % 3));
  if (cooks[0] !== n) return null;
  r.cookDay = dayN();
  const dish = (r.pantry.fish || 0) > 0 ? 'fish stew' : (r.pantry.grain || 0) > 0 ? 'porridge' : (r.pantry.bread || 0) > 0 ? 'bread and oil' : 'berry mash';
  return [goS(r.spots.cook, 'Heading home to cook supper'), waitS(30, 'work', `Cooking ${dish} at the hearth`, { tool: 'wipe', onEnd(nn) { r.cooked = { day: dayN(), by: nn.id, dish }; if (lf2Has(nn, 'cannot cook') || /cannot cook/.test(nn.quirk || '')) r.cooked.burnt = true; } })];
}
/* at supper: hot food, cold leftovers, or burnt porridge */
LF2.tickers.push(() => {
  if (!LF2.on('cooking')) return;
  for (const n of npcs) {
    if (n.dead || !n.homeRoom) continue; const st = n.plan && n.plan[n.si];
    if (!st || st.act !== 'eat' || !/supper/.test(st.text || '') || n.lf2Supper === dayN()) continue;
    n.lf2Supper = dayN(); const c = n.homeRoom.cooked, cook = c && c.day === dayN() ? byId(c.by) : null;
    if (cook && c.burnt) { lfMod(n, 'supper', `ate ${cook.first}'s burnt ${c.dish}`, -2, 300); if (cook !== n && Math.random() < 0.3) say(n, cook, [[n, anyOf(['It is... crunchy.', 'Lovely. Very... smoky.'])], [cook, 'I did my best!']]); }
    else if (cook) { lfMod(n, 'supper', `enjoyed a hot supper`, 5, 300); if (cook !== n) { lfAff(n, cook, 0.8); if (Math.random() < 0.15) say(n, cook, [[n, anyOf([`This ${c.dish} is good.`, 'Lovely supper, thank you.'])], [cook, 'Eat up, there is more.']]); } }
    else lfMod(n, 'supper', 'ate a cold supper', -2, 300);
  }
});

/* ---------------- bedtime together ---------------- */
LF2.tickers.push(() => {
  if (!LF2.on('couples')) return;
  const tod = game.time % 1440;
  for (const n of npcs) {
    if (n.dead || n.pose !== 'sleep' || !n.homeRoom || n.jail) continue;
    const s = lf2Spouse(n); if (!s || s.player || s.jail || s.pose === 'sleep' || s.hunger >= 50 || s.bladder >= 60 || s.homeRoom !== n.homeRoom || (s.lf2BedDay === dayN()) || (s.aff[n.id] || 0) < -10) continue;
    const toBed = (s.sleepAt - tod + 1440) % 1440; if (toBed > 150 || toBed === 0 || !s.bed || s.bed.x == null || lfDist(n, s) > 14 || eventsBusy()) continue;
    const st = s.plan && s.plan[s.si]; if (st && (st.priv || st.act === 'eat' || /party|wedding|funeral/i.test(st.text || ''))) continue;
    s.lf2BedDay = dayN(); const sl = (s.wake - tod + 1440) % 1440 || 1;
    recruit(s, [goS(s.bed, `Going to bed with ${n.first}`), waitS(sl, 'sleep', `Asleep beside ${n.first}`)], game.time + sl);
    bumpAff(n, s, 2, 4); lfMod(s, 'cosy', `went to bed with ${n.first}`, 4, 500); if (!n.player) lfMod(n, 'cosy', `went to bed with ${s.first}`, 4, 500);
    if (Math.random() < 0.5) say(s, n, [[s, anyOf(['Move over, you are hogging the blanket.', 'Long day. Goodnight, love.', 'Did you hear what happened today?', 'Your feet are freezing!'])], [n, anyOf(['Mm. Goodnight.', 'Shh. Sleeping.', 'Tell me tomorrow.'])]], true);
  }
  // nobody home: the one waiting up frets
  if (Math.floor(tod / 6) === Math.floor((23.5 * 60) / 6)) for (const n of npcs) { const s = lf2Spouse(n); if (!s || n.dead || n.player || !n.homeRoom || s.homeRoom !== n.homeRoom || lf2InRoom(s, n.homeRoom)) continue; lfMod(n, 'waiting', `waiting up for ${s.first}, who has not come home`, -6, 300); if (s.jail) lfMod(n, 'waiting', `worried sick: ${s.first} is in the cells`, -10, 900); }
});

/* ---------------- washing, and the public baths ---------------- */
const lf2Baths = () => lf2Room('baths');
function lf2BathSeats() { const b = lf2Baths(); return b ? (b.seats || []).filter(s => !npcs.some(o => !o.dead && o.tx === s.x && o.ty === s.y)) : []; }
LF2.tickers.push(() => {
  if (!LF2.on('baths')) return;
  const b = lf2Baths(), keeper = b && npcs.find(o => o.job === 'BathKeeper' && !o.dead && lf2InRoom(o, b));
  for (const n of npcs) {
    if (n.dead || n.infant || n.clean == null) { if (!n.dead && n.clean == null) n.clean = 70; continue; }
    const st = n.plan && n.plan[n.si];
    n.clean = Math.max(0, n.clean - 0.09 - (st && st.act === 'work' && n.stepStarted ? 0.06 : 0));
    if (b && lf2InRoom(n, b) && n.pose !== 'walk') {
      if (!n.lf2Paid && LF2.on('economy') && n.job !== 'BathKeeper') { n.lf2Paid = true; if (n.coin >= 1) { n.coin -= 1; b.till = (b.till || 0) + 1; } }
      n.clean = Math.min(100, n.clean + (keeper ? 9 : 5)); n.fun = Math.min(100, (n.fun || 0) + 1.5); n.social = Math.min(100, (n.social || 0) + 1);
      if (!keeper && Math.random() < 0.01) lfShout(n, 'The water is stone cold! Where is the bath keeper?');
    } else n.lf2Paid = false;
    if (n.clean < 6 && n.pose !== 'sleep' && !n.player && (n.lf2Smell || 0) < game.time) {
      const near = npcs.filter(o => o !== n && !o.dead && o.pose !== 'sleep' && lfDist(o, n) <= 2 && o.age >= 6);
      if (near.length && Math.random() < 0.12) { n.lf2Smell = game.time + 1440; const o = anyOf(near); lfAff(o, n, -1); lfEmit('smelly', { actor: n, target: o, sev: 1, tags: ['smelly'], chron: false, text: `${n.first} smells like a midden` }); if (Math.random() < 0.5) lfShout(o, anyOf(['*sniff* ...is that you?', 'Phew. Have you been rolling in something?'])); }
    }
  }
});
function lf2WashPlan(n, tod) {
  if (!LF2.on('baths') || n.player || n.age < 6 || n.clean == null || n.jail || (lf2Busy(n, tod) && n.clean > 12)) return null;
  const h = tod / 60, b = lf2Baths();
  if (b && n.clean < 55 && h >= 13 && h < 19 && (n.coin >= 1 || !LF2.on('economy')) && (n.lf2BathT || 0) < game.time && n.age >= 12) {
    n.lf2BathT = game.time + 900; const seat = anyOf(lf2BathSeats()); if (!seat) return null;
    return [goS(seat, 'Off to the baths'), waitS(40 + Math.random() * 30, 'leisure', anyOf(['Soaking in the warm pool', 'Steaming at the baths', 'Lounging by the bath pool']), { social: true, nopie: true })];
  }
  if (n.clean < 40 && n.homeRoom && n.homeRoom.spots.pantry && (n.lf2WashT || 0) < game.time) { n.lf2WashT = game.time + 300; return [goS(n.homeRoom.spots.pantry, 'Going home to wash'), waitS(10, 'stand', 'Washing at the basin', { nopie: true, onEnd(nn) { nn.clean = Math.min(100, nn.clean + 45); } })]; }
  return null;
}
LF2.dec.push(lf2WashPlan);
/* friends can organise a trip to the baths, like any other outing */
if (typeof LF_GATH !== 'undefined') {
  LF_GATH.baths = { label: 'a trip to the baths', noun: 'bath', hours: [13, 18], dur: 60, text: 'Soaking at the baths with friends', act: 'leisure', where: 'baths' };
  LF_GATH.dice = { label: 'dice at the tavern', noun: 'game of dice', hours: [18, 22], dur: 60, text: 'Rolling dice at the tavern', act: 'leisure', where: 'tavern' };
  const _ga = lfGArea; lfGArea = function (kind, host) { if (LF_GATH[kind] && LF_GATH[kind].where === 'baths') { if (!LF2.on('baths')) return []; return lf2BathSeats(); } return _ga(kind, host); };
}

/* ---------------- the tavern: wine, dice, brawls ---------------- */
function lf2TavernPlan(n, tod) {
  if (!LF2.on('tavern') || n.player || n.age < 18 || !town.tavern || n.jail || n.role === 'Barkeep' || n.role === 'Priest' || (n.lf2TavDay === dayN())) return null;
  const h = tod / 60; if (h < 18 || h >= 22.5 || n.coin < 2) return null;
  const want = 0.12 + (lf2Has(n, 'sociable') ? 0.12 : 0) + (lf2Has(n, 'jovial') ? 0.15 : 0) + (lf2Has(n, 'night owl') ? 0.1 : 0) + (n.mood < 35 ? 0.12 : 0) - (lf2Has(n, 'devout') ? 0.1 : 0) - (lf2Has(n, 'homebody') ? 0.1 : 0);
  n.lf2TavDay = dayN(); if (Math.random() > want) return null;
  const r = town.tavern, tiles = []; for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) if (walkable(x, y) && grid[y][x] !== T.BED) tiles.push({ x, y });
  const seat = (r.seats || []).find(s => !npcs.some(o => !o.dead && o.tx === s.x && o.ty === s.y));
  return [goS(seat || anyOf(tiles), 'Heading to the tavern for a cup of wine'), waitS(60 + Math.random() * 80, 'leisure', anyOf(['Drinking wine at the tavern', 'Nursing a cup of wine', 'Swapping stories over wine']), { social: true, nopie: true, roam: seat ? null : [12, 25], area: tiles })];
}
LF2.dec.push(lf2TavernPlan);
function lf2Dice(a, b, stake, cheat) {
  const st = Math.min(stake, Math.floor(a.coin), Math.floor(b.coin)); if (st < 1) return null;
  const aw = Math.random() < (cheat ? 0.78 : 0.5), win = aw ? a : b, lose = aw ? b : a;
  win.coin += st; lose.coin -= st;
  const caught = cheat && aw && Math.random() < (lf2Has(b, 'curious') ? 0.5 : 0.3) * (b.drunk > 50 ? 0.5 : 1);
  lfEmit('dice', { actor: win, target: lose, sev: 1, tags: ['gamble'], chron: false, text: `${win.first} won ${st} denarii off ${lose.first} at dice` });
  if (caught) { lfEmit('cheat', { actor: a, target: b, sev: 2, loud: true, tags: ['deceit', 'crime'], text: `${b.first} caught ${a.first} cheating at dice` }); if (!b.player && (lf2Has(b, 'brave') || lf2Has(b, 'grumpy') || b.drunk > 60) && Math.random() < 0.5) lf2Brawl(b, a); }
  return { win, lose, st, caught };
}
function lf2Brawl(a, b) {
  if (a.dead || b.dead || a.jail || b.jail) return;
  lfShout(a, anyOf(['That is it! Outside!', 'Say that again!', 'You want a fight? You have got one!']));
  lfEmit('brawl', { actor: a, target: b, sev: 2, loud: true, tags: ['violence', 'drunk'], text: `${a.first} started a brawl with ${b.first}${town.tavern ? ' at ' + town.tavern.name : ''}` });
  for (const o of [a, b]) { if (!o.player) { abortPlan(o); o.plan = [waitS(6, 'work', 'Brawling!', { nopie: true, tool: null })]; o.si = 0; o.stepStarted = false; } lfMod(o, 'brawl', 'bruised from a brawl', -8, 700); o.drunk = Math.max(0, (o.drunk || 0) - 20); }
  lfAff(a, b, -15); lfAff(b, a, -15);
}
LF2.tickers.push(() => {
  if (!LF2.on('tavern')) return;
  const r = town.tavern; const inT = []; const h = lf2Hr();
  for (const n of npcs) {
    if (n.dead) continue;
    if (r && lf2InRoom(n, r) && n.pose !== 'sleep' && n.role !== 'Barkeep' && n.age >= 16 && (h >= 15 || h < 2)) {
      inT.push(n);
      if (Math.random() < 0.55 && n.coin >= 1 && (n.drunk || 0) < 100) { n.coin -= 1; r.till = (r.till || 0) + 1; n.drunk = Math.min(100, (n.drunk || 0) + 6 + (lf2Has(n, 'jovial') ? 2 : 0)); n.bladder = Math.min(100, (n.bladder || 0) + 2); n.fun = Math.min(100, (n.fun || 0) + 2); }
    } else if (n.drunk) n.drunk = Math.max(0, n.drunk - 1.6);
    if ((n.drunk || 0) >= 65 && !n.player && Math.random() < 0.04 && (n.lf2DrunkT || 0) < game.time) {
      n.lf2DrunkT = game.time + 90; const loud = h >= 22 || h < 5;
      const k = Math.random();
      if (k < 0.45) { lfShout(n, anyOf(['♪ Oh the shepherd had a goat, and the goat had a... hic ♪', '♪ Drink to the emperor! Drink to his horse! ♪', '♪ Laaa la la LAAA ♪'])); lfEmit('sing', { actor: n, sev: 1, loud, tags: loud ? ['drunk', 'nuisance'] : ['drunk', 'funny'], chron: false, text: `${n.first} sang at the top of their voice, very drunk` }); }
      else if (k < 0.75) { lfShout(n, anyOf(['Whoops! Who moved the floor?', '*hic* I am FINE.', 'I love you all. Every one of you.'])); lfEmit('stumble', { actor: n, sev: 1, tags: ['drunk', 'embarrass'], chron: false, text: `${n.first} fell flat on their face, drunk` }); }
      else { const foe = inT.find(o => o !== n && ((n.aff[o.id] || 0) <= -5 || ((o.drunk || 0) > 70 && Math.random() < 0.25)) && !o.player); if (foe) lf2Brawl(n, foe); }
    }
  }
  // dice between two patrons
  if (inT.length >= 2 && Math.random() < 0.25) { const a = anyOf(inT.filter(o => !o.player)), b = anyOf(inT.filter(o => o !== a && !o.player)); if (a && b && a.coin >= 3 && b.coin >= 3 && (lf2Has(a, 'jovial') || lf2Has(a, 'greedy') || a.drunk > 30)) { const res = lf2Dice(a, b, 2 + Math.floor(Math.random() * 4), lf2Has(a, 'greedy') && Math.random() < 0.4); if (res && Math.random() < 0.4) say(res.win, res.lose, [[res.win, anyOf(['Sixes! Pay up.', 'The gods love me tonight!'])], [res.lose, res.caught ? 'Those dice are loaded!' : anyOf(['Again. Double or nothing.', 'Bah.'])]]); } }
});

/* ---------------- doors barred at night ---------------- */
const lf2Night = () => { const h = lf2Hr(); return h >= 22 || h < 6; };
function lf2DoorRoom(x, y) { for (const r of rooms) if (!r.dead && r.doorX === x && r.doorY === y) return r; return null; }
LF2.pre.push({ player(n, p, fx, fy) {
  if (!LF2.on('nightlocks') || !lf2Night() || grid[fy][fx] !== T.DOOR) return null;
  const r = lf2DoorRoom(fx, fy); if (!r || r.kind !== 'house' || r === n.homeRoom || r.unbarred === dayN() + ':' + n.id || lf2InRoom(n, r)) return null;
  return { msg: `${r.name} is barred for the night. (E for more)` };
} });
LF2.verbs.push((n, x, y, o, add) => {
  if (o || grid[y] === undefined || grid[y][x] !== T.DOOR) return null; const r = lf2DoorRoom(x, y); if (!r || r.kind !== 'house' || r === n.homeRoom) return null;
  const barred = LF2.on('nightlocks') && lf2Night() && r.unbarred !== dayN() + ':' + n.id;
  if (barred) add('Pick the lock', nn => {
    const inside = npcs.filter(q => !q.dead && lf2InRoom(q, r)); let heard = null;
    for (const q of inside) if (Math.random() < (q.pose === 'sleep' ? (lf2Has(q, 'anxious') ? 0.3 : 0.08) : 0.6)) heard = q;
    if (heard) { if (heard.pose === 'sleep') { heard.pose = 'stand'; abortPlan(heard); } lfShout(heard, anyOf(['Who is there?!', 'I hear you! Get away from my door!', 'Thieves! Wake up, everyone!'])); lfEmit('breakin', { actor: nn, target: heard, sev: 2, loud: true, tags: ['trespass', 'crime'], text: `${nn.first} tried to break into ${r.name} in the night` }); lf2Say(nn, 'Somebody heard you!'); return; }
    r.unbarred = dayN() + ':' + nn.id; lf2Say(nn, 'Click. The bar lifts.');
    lfEmit('breakin', { actor: nn, target: lf2RoomHead(r), sev: 2, aware: false, tags: ['trespass', 'crime'], chron: false, text: `${nn.first} picked the lock of ${r.name} in the night` });
  }, 12, 'Picking the lock', 'pick');
  add('Knock', nn => { const q = npcs.find(q => !q.dead && lf2InRoom(q, r) && q.pose !== 'sleep'); lf2Say(nn, q ? `${q.first} calls out: "${barred ? 'We are in bed! Go away.' : 'It is open, come in.'}"` : 'No answer.'); if (barred && q) lfEmit('knock', { actor: nn, target: q, sev: 1, tags: ['nuisance'], chron: false, text: `${nn.first} came knocking at ${r.name} in the middle of the night` }); });
  return r.name + (barred ? ' · barred' : '');
});

/* ---------------- crushes, affairs and jealousy ---------------- */
const lf2Single = n => !lf2Spouse(n) && n.age >= 17 && n.age < 50;
function lf2RomanceDaily() {
  if (!LF2.on('romance')) return;
  for (const n of npcs) {
    if (n.dead || n.player || n.age < 17 || n.age >= 55) continue;
    if (n.crush && (byId(n.crush) || {}).dead) n.crush = null;
    if (n.crush) continue;
    const sp = lf2Spouse(n), restless = sp && ((n.aff[sp.id] || 0) < 30 || (Math.random() < 0.06 && !lf2Has(n, 'devout')));
    if (sp && !restless) continue;
    const c = npcs.filter(o => o !== n && !o.dead && o.age >= 17 && o.age < 55 && o.female !== n.female && !isKin(n, o) && o !== sp && (n.aff[o.id] || 0) >= (sp ? 35 : 22)).sort((a, b) => (n.aff[b.id] || 0) - (n.aff[a.id] || 0))[0];
    if (!c || Math.random() > (sp ? 0.25 : 0.4)) continue;
    n.crush = c.id; addMem(n, 'crush', `the day I realised I had feelings for ${c.first}`, null, c.id);
    if (sp) lfEmit('crush', { actor: n, target: c, sev: 1, tags: ['romance'], witnessIds: [], aware: false, chron: false, text: `${n.first} has fallen for ${c.first}, though they are married to ${sp.first}` });
  }
}
function lf2TrystPlan(n, tod) {
  if (!LF2.on('romance') || !n.crush || n.player || n.jail || (n.lf2TrystT || 0) > game.time || lf2Busy(n, tod)) return null;
  const c = byId(n.crush); if (!c || c.dead || c.jail || c.player || c.pose === 'sleep') return null;
  const sp = lf2Spouse(n), mutual = (c.aff[n.id] || 0) >= 28 || c.crush === n.id, h = tod / 60;
  n.lf2TrystT = game.time + (sp ? 900 : 500);
  if (!mutual) { if (Math.random() < 0.5) return null; return [goS(() => { const b = besideTile(c.tx, c.ty, null); return b ? { x: b.x, y: b.y, face: { dx: Math.sign(c.tx - b.x), dy: Math.sign(c.ty - b.y) } } : null; }, `Finding an excuse to see ${c.first}`), waitS(4, 'stand', `Blushing at ${c.first}`, { social: true, nopie: true, onEnd(nn) { if (lfDist(nn, c) > 3) return; bumpAff(nn, c, 2, 5); say(nn, c, [[nn, anyOf(['Oh! Hello. I was just... passing.', 'You look nice today. I mean, you always... never mind.'])], [c, anyOf(['Er, thanks?', 'Hello, ' + nn.first + '.'])]]); } })]; }
  if (sp && !(h >= 21 || h < 1) && Math.random() < 0.7) return null;
  // somewhere quiet, away from eyes
  let spot = null; for (let i = 0; i < 25 && !spot; i++) { const x = 3 + Math.floor(Math.random() * (W - 6)), y = 3 + Math.floor(Math.random() * (H - 6)); if (walkable(x, y) && roomAt[y][x] < 0 && lf2Watchers(x, y, [n, c]) < 0.15 && findPath(n.tx, n.ty, x, y)) spot = { x, y }; }
  if (!spot) return null; const s2 = besideTile(spot.x, spot.y, null); if (!s2) return null;
  if (c.hunger >= 60 || n.hunger >= 60) return null;
  recruit(c, [goS(s2, sp ? 'Slipping out quietly' : `Meeting ${n.first}`), waitS(35, 'stand', sp ? `Meeting ${n.first} in secret` : `Walking out with ${n.first}`, { social: true, nopie: true })], game.time + 90);
  return [goS(spot, sp ? 'Slipping out quietly' : `Meeting ${c.first}`), waitS(35, 'stand', sp ? `Meeting ${c.first} in secret` : `Walking out with ${c.first}`, { social: true, nopie: true, onEnd(nn) {
    if (lfDist(nn, c) > 3) return; bumpAff(nn, c, 6, 12); lfMod(nn, 'tryst', 'giddy after time with ' + c.first, 8, 500);
    lfEmit(sp ? 'tryst' : 'courting', { actor: nn, target: c, sev: sp ? 2 : 1, x: nn.tx, y: nn.ty, tags: sp ? ['romance', 'affair', 'scandal'] : ['romance'], chron: false, text: sp ? `${nn.first} was seen kissing ${c.first} in secret, behind ${sp.first}'s back` : `${nn.first} and ${c.first} were seen walking out together` });
  } })];
}
LF2.dec.push(lf2TrystPlan);
/* the jealous spouse: hearing of an affair, they go and have it out, loudly */
LF2.react.push(function (o, ev, j, c, first) {
  if (!LF2.on('romance') || !ev.tags.includes('affair') || o.player) return;
  const a = lf2By(ev.actor), t = lf2By(ev.target); if (!a || lf2Spouse(a) !== o || c < 0.35) return;
  lfAff(o, a, -30 * c); if (t) lfAff(o, t, -35 * c); lfMod(o, 'betrayed', `betrayed by ${a.first}`, -25 * c, 2000);
  addMem(o, 'betrayed', `the day I found out about ${a.first} and ${t ? t.first : 'somebody'}`, null, a.id);
  o.lf2Confront = { who: a.id, ev: ev.id };
});
LF2.dec.push(function (n) {
  if (!n.lf2Confront || n.player) return null; const a = byId(n.lf2Confront.who); const ev = n.lf2Confront.ev; n.lf2Confront = null; if (!a || a.dead || a.jail) return null;
  return [goS(() => { const b = besideTile(a.tx, a.ty, null); return b ? { x: b.x, y: b.y, face: { dx: Math.sign(a.tx - b.x), dy: Math.sign(a.ty - b.y) } } : null; }, `Storming off to find ${a.first}`),
    waitS(5, 'stand', `Having it out with ${a.first}`, { nopie: true, onEnd(nn) { if (lfDist(nn, a) > 3) return; say(nn, a, [[nn, anyOf([`How could you?! Everyone knows!`, `I heard all about it. Do not even try to deny it.`])], [a, anyOf(['It is not what you think!', 'Keep your voice down!', 'I... I am sorry.'])]]);
      lfEmit('quarrel', { actor: nn, target: a, sev: 2, loud: true, tags: ['scandal', 'embarrass'], cause: ev, text: `${nn.first} screamed at ${a.first} in front of everyone about the affair` }); lfAff(a, nn, -10); } })];
});
/* jealousy: seeing your crush walking out with someone else */
LF2.react.push(function (o, ev, j, c, first) {
  if (!LF2.on('romance') || !first || !ev.tags.includes('romance') || o.player) return;
  const a = lf2By(ev.actor), t = lf2By(ev.target); if (!a || !t) return;
  for (const [x, y] of [[a, t], [t, a]]) if (o.crush === x.id && y !== o) { lfAff(o, y, -12); lfMod(o, 'jealous', `jealous of ${y.first}`, -10, 900); if (Math.random() < 0.5) lfEmit('jealous', { actor: o, target: y, sev: 1, tags: ['jealous'], chron: false, text: `${o.first} is eaten up with jealousy over ${x.first} and ${y.first}` }); }
});
LF2.hourly.push(h => { if (h === 9) lf2RomanceDaily(); });

/* ---------------- people shut in by a crate: an event with a culprit only some people know ---------------- */
LF2.tickers.push(() => {
  for (const n of npcs) {
    if (n.dead || !n.trapped || n.trapped.lf2) continue;
    const t = n.trapped, pr = t.prop; t.lf2 = true;
    const by = pr && pr.by != null ? byId(pr.by) : null, pe = pr && pr.pushEv ? lf2EvById(pr.pushEv) : null;
    lfEmit('shutin', { actor: by, target: n, sev: 2, anon: true, sawActor: pe ? pe.witnesses : (pr && pr.seen) || [], cause: pe ? pe.id : null, tags: by ? ['harm', 'prank'] : ['misfortune'], chron: false,
      text: by ? `${by.first} shut ${n.first} in with a ${LF_NOUN[pr.kind]}` : `${n.first} got shut in by a ${pr ? LF_NOUN[pr.kind] : 'crate'}`, anonText: `Somebody shut ${n.first} in with a ${pr ? LF_NOUN[pr.kind] : 'crate'}` });
  }
});

