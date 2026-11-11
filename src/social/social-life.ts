/* ================= Social life: rest day, outings, hobbies, memories, sharing, feasts, small touches ================= */
const REST_DAY = -1; // no rest day any more (it got in the way of testing and of play): nothing matches it
const isRestDay = (t?) => Math.floor((t === undefined ? game.time : t) / 1440) % 3 === REST_DAY;
const HOBBIES = ['fishing', 'foraging', 'walking', 'whittling', 'singing', 'stargazing'];
const HOBBY_TXT = { fishing: 'fishing', foraging: 'berry picking', walking: 'long walks', whittling: 'whittling', singing: 'singing', stargazing: 'stargazing' };
const JOB_VERB = { Woodcutter: 'chop wood', Stonecutter: 'cut stone', Fisher: 'fish', Farmer: 'work the field', Gatherer: 'pick berries' };
const JOB_NOUN = { Woodcutter: 'a woodcutter', Stonecutter: 'a stonecutter', Fisher: 'a fisher', Farmer: 'a farmer', Gatherer: 'a forager' };
const MEM_REPLY = {
  outing: ['I will never forget it.', 'We should go again soon.', 'You still owe me a bigger one.', 'Best day of the season.'],
  wedding: ['Best day of my life.', 'The whole town danced till dark.'],
  loss: ['I miss them every day.', 'They would be proud of you.', 'Some days it still does not feel real.'],
  share: ['You would have done the same.', 'That is what neighbours are for.', 'Nobody goes hungry here. Not while I can help it.'],
  feast: ['What a night that was.', 'My feet still ache from the dancing.'],
  birth: ['The best day.', 'Look how far we have come.'],
  home: ['Our own roof at last.', 'Every log of it, by hand.'],
  teach: ['You were a good teacher.', 'You were a quick learner.'],
  x: ['I remember.', 'Good times.']
};
const parentWord = (kid, p) => p.female ? 'Mum' : 'Dad';
const isParentOf = (p, k) => k.fam.mother === p.id || k.fam.father === p.id;
const eventsBusy = () => { const w = town.wedding, f = town.funeral, fe = town.feast, t = game.time; return (w && t >= w.at - 60 && t < w.end) || (f && t >= f.at - 60 && t < f.end) || (fe && t >= fe.at - 30 && t < fe.end) || (typeof activeParty === 'function' && !!activeParty()); };
const say = (_a?: any, _b?: any, _lines?: any, _quiet?: boolean) => {};   // silent until the new talk engine (docs/talk-engine.md)

/* ---------- memories ---------- */
function addMem(n, kind, me, we, withId) {
  if (!n || n.dead) return;
  const m = n.mem || (n.mem = []);
  const i = m.findIndex(x => x.me === me); if (i >= 0) m.splice(i, 1);
  m.push({ t: game.time, kind, me, we: we || null, w: withId || null });
  if (m.length > 14) m.shift();
}
const memWith = (a, b) => (a.mem || []).filter(m => m.w === b.id && m.we);

/* ---------- hobbies and favourite places ---------- */
function hobbyOf(n) {
  if (n.hobby) return n.hobby;
  const R = rng(town.seed + n.id * 131), has = t => n.traits.includes(t), o: any = {};
  HOBBIES.forEach(h => { o[h] = 1; });
  o.fishing = shoreTiles.length ? 2 : 0;
  if (has('curious') || has('brave')) o.walking += 2;
  if (has('dreamy') || has('night owl')) o.stargazing += 3;
  if (has('jovial') || has('cheerful') || has('sociable')) o.singing += 2;
  if (has('homebody') || has('shy') || has('proud')) o.whittling += 2;
  if (has('generous') || has('early bird')) o.foraging += 1.5;
  return (n.hobby = wpick(R, o));
}
function favSpot(n) {
  const f = n.fav; if (f && walkable(f.x, f.y) && roomAt[f.y][f.x] < 0 && reach[f.y * W + f.x] && !town.siteAt[f.y * W + f.x]) return f;
  n.favTries = (n.favTries || 0) + 1;
  const R = rng(town.seed + n.id * 77 + n.favTries * 7919), h = hobbyOf(n); let c = [];
  if (h === 'fishing' && shoreTiles.length) c = shoreTiles.filter(t => reach[t.y * W + t.x]);
  else if (h === 'singing' || h === 'whittling') c = plazaTiles.filter(t => walkable(t.x, t.y) && reach[t.y * W + t.x]);
  if (!c.length) for (let k = 0; k < 80; k++) {
    const a = R() * 6.283, r = (h === 'walking' ? 13 : 8) + R() * 10, x = Math.round(town.cx + Math.cos(a) * r), y = Math.round(town.cy + Math.sin(a) * r);
    if (x > 1 && y > 1 && x < W - 2 && y < H - 2 && grid[y][x] === T.GRASS && roomAt[y][x] < 0 && reach[y * W + x] && !town.siteAt[y * W + x]) c.push({ x, y });
  }
  if (!c.length) return null;
  const t = c[Math.floor(R() * c.length)];
  return (n.fav = { x: t.x, y: t.y, face: t.face || null });
}
function placeWord(sp) { const t = sp && grid[sp.y] && grid[sp.y][sp.x]; return shoreTiles.some(s => s.x === sp.x && s.y === sp.y) ? 'the water' : plazaTiles.some(s => s.x === sp.x && s.y === sp.y) ? 'the square' : 'the meadow'; }
function besideTile(x, y, avoid?) {
  let out = null;
  for (const [dx, dy] of DIRS) { const sx = x + dx, sy = y + dy; if (sx < 1 || sy < 1 || sx >= W - 1 || sy >= H - 1 || !walkable(sx, sy) || roomAt[sy][sx] >= 0 || !reach[sy * W + sx]) continue; if (avoid && avoid.x === sx && avoid.y === sy) continue; out = { x: sx, y: sy }; if (dy === 0) break; }
  return out;
}

/* ---------- who is free to be invited ---------- */
function freeFor(o, tod) {
  if (o.dead || o.player || o.infant || o.inShip || o.age < 4 || o.hunger > 65 || o.talkUntil > game.time || o.mourning) return false;
  if (!isAwake(o, tod) || working(o, tod) || (o.outUntil || 0) > game.time) return false;
  const s = o.plan && o.plan[o.si]; if (s && (s.act === 'eat' || s.act === 'sleep' || s.social)) return false;
  return true;
}
function recruit(o, steps, until) { if (o.jail) return; abortPlan(o); release(o); o.plan = steps; o.si = 0; o.stepStarted = false; o.outUntil = until; }

/* ---------- outings: doing something together ---------- */
function outingPlan(n, tod) {
  if (n.age < 16 || n.player || (n.nextOuting || 0) > game.time || eventsBusy()) return null;
  const h = tod / 60; if (h < 8 || h > 19) return null;
  let best = null, bs = 0;
  for (const o of npcs) {
    if (o === n || Math.abs(o.tx - n.tx) + Math.abs(o.ty - n.ty) > 40 || !freeFor(o, tod)) continue;
    let s = (n.aff[o.id] || 0) / 20;
    if (isParentOf(n, o) && o.age < 16) s += 5 + (o.age >= 6 ? 1 : -2);
    if (n.fam.spouse === o.id || n.fam.partner === o.id) s += 3;
    if (n.rel[o.id] === 'friend') s += 2;
    if (n.rel[o.id] === 'rival') s -= 6;
    s += Math.random() * 1.5;
    if (s > bs) { bs = s; best = o; }
  }
  n.nextOuting = game.time + 600 + Math.random() * 600;
  if (!best || bs < 2.5) return null;
  const c = best, kid = isParentOf(n, c) && c.age < 16, couple = n.fam.spouse === c.id || n.fam.partner === c.id;
  let kind = hobbyOf(n); if (kid && shoreTiles.length && Math.random() < 0.6) kind = 'fishing';
  if (kind === 'stargazing' && h < 18) kind = 'walking';
  let sp = null, csp = null, act = 'leisure', tool = null, ctool = null, cact = 'leisure', text = '', ctext = '', sit = false;
  const dur = 45 + Math.random() * 35;
  if (kind === 'fishing' && shoreTiles.length) {
    const near = nearTiles(shoreTiles, n, 12, fishOK); if (!near.length) return null;
    const t = near[Math.floor(Math.random() * near.length)]; sp = { x: t.x, y: t.y, face: t.face };
    const t2 = shoreTiles.find(q => Math.abs(q.x - t.x) + Math.abs(q.y - t.y) === 1 && reach[q.y * W + q.x]);
    csp = t2 ? { x: t2.x, y: t2.y, face: t2.face } : besideTile(t.x, t.y);
    act = cact = 'work'; tool = ctool = 'fish'; text = `Fishing with ${c.first}`; ctext = `Fishing with ${kid ? parentWord(c, n) : n.first}`;
  } else if (kind === 'foraging') {
    const nd = town.nodes.filter(x => x.kind === 'berry' && x.amt >= 2 && !x.claim && reach[x.y * W + x.x]).sort((a, b) => Math.hypot(a.x - n.tx, a.y - n.ty) - Math.hypot(b.x - n.tx, b.y - n.ty))[0];
    if (!nd) return null; const b1 = besideSpot(n, nd.x, nd.y); sp = b1; const b2 = besideTile(nd.x, nd.y, b1); csp = b2 ? { x: b2.x, y: b2.y, face: { dx: Math.sign(nd.x - b2.x), dy: Math.sign(nd.y - b2.y) } } : besideTile(b1.x, b1.y);
    act = cact = 'work'; tool = ctool = 'pick'; text = `Picking berries with ${c.first}`; ctext = `Picking berries with ${kid ? parentWord(c, n) : n.first}`;
    nd.claim = n; n.claims.push(nd); sp.node = nd;
  } else {
    const f = favSpot(n); if (!f) return null; sp = { x: f.x, y: f.y, face: f.face, sit: true }; const b = besideTile(f.x, f.y); csp = b ? { x: b.x, y: b.y, sit: true, face: { dx: Math.sign(f.x - b.x), dy: Math.sign(f.y - b.y) } } : null; sit = true;
    if (kind === 'singing') { act = 'work'; tool = 'lute'; text = `Singing to ${c.first}`; ctext = `Listening to ${n.first} sing`; }
    else if (kind === 'whittling') { act = 'work'; tool = 'weave'; text = `Whittling a toy for ${c.first}`; ctext = `Watching ${n.first} whittle`; if (!kid) text = `Whittling and talking with ${c.first}`; }
    else if (kind === 'stargazing') { text = `Watching the stars with ${c.first}`; ctext = text.replace(c.first, kid ? parentWord(c, n) : n.first); }
    else { text = `Sitting out by ${placeWord(f)} with ${c.first}`; ctext = `Out with ${kid ? parentWord(c, n) : n.first}`; kind = 'walking'; }
  }
  if (!csp) return null;
  const startL = kid ? (kind === 'fishing' ? [[n, `Hold the rod still, ${c.first}. Wait for the float to bob.`], [c, 'Is it bobbing? I think it is bobbing!']]
    : kind === 'foraging' ? [[n, `Only the dark ones, ${c.first}. The red ones are not ready.`], [c, 'One for the basket, one for me.']]
    : kind === 'singing' ? [[n, 'This one my mother sang to me.'], [c, 'Again! Sing it again!']]
    : kind === 'whittling' ? [[n, 'What shall it be? A bird or a fox?'], [c, 'A fox! With a big tail!']]
    : [[n, `Come on, ${c.first}. Let us get out for a bit.`], [c, 'Can we stay out till dark?']])
    : couple ? sbPick([[[n, 'Just us. I needed this.'], [c, 'Me too. Don\'t tell the others where we went.']], [[n, 'No children, no chores. Just the water.'], [c, 'Don\'t say chores. You\'ll summon them.']], [[n, 'I packed bread. And the good cheese.'], [c, 'The good cheese! What\'s the occasion?'], [n, 'You.']]])
    : kind === 'fishing' ? sbPick([[[n, 'Last one to catch something buys the drinks.'], [c, 'You\'re on.']], [[n, 'Quiet now. They can hear you think.'], [c, 'Then I\'d better stop thinking.']], [[n, 'My spot. Don\'t tell anyone about my spot.'], [c, 'Everyone knows about your spot.']], [[n, 'Bet you a cup I land the first one.'], [c, 'Done. Prepare to lose a cup.']]])
    : [[n, pick(Math.random, ['Good to get away from the axe for a while.', 'Nice out today, is it not?', 'I am glad you came.'])], [c, pick(Math.random, ['Glad you asked.', 'We should do this more often.', 'It is.'])]];
  const end = game.time + dur + 60;
  const finish = n2 => {
    let caught = 0;
    if (kind === 'fishing') { const r = Math.random(); caught = r < 0.55 ? 1 : r < 0.7 ? 2 : 0; if (caught) { n.inv.fish = (n.inv.fish || 0) + caught; town.eco.caught = (town.eco.caught || 0) + caught; } }
    if (kind === 'foraging' && sp.node) { const t = Math.min(sp.node.amt, 4); sp.node.amt -= t; n.inv.berries = (n.inv.berries || 0) + t; if (sp.node.claim === n) sp.node.claim = null; }
    bumpAff(n, c, 8, 30); n.social = Math.min(100, n.social + 25); c.social = Math.min(100, c.social + 25);
    const what = { fishing: 'went fishing', foraging: 'picked berries', singing: 'sang songs', whittling: 'whittled by the fire', stargazing: 'watched the stars', walking: 'sat out by ' + placeWord(sp) }[kind];
    if (kid) {
      const first = kind === 'fishing' && caught && !c.firstFish; if (first) c.firstFish = true;
      addMem(c, 'outing', first ? `the day ${parentWord(c, n)} taught me to fish and I caught my very first one` : `the day ${parentWord(c, n)} and I ${what}`, first ? 'when you taught me to fish and I caught my first one' : `when we ${what} together`, n.id);
      addMem(n, 'outing', `the day ${c.first} and I ${what}`, first ? `your first fish. You would not stop shouting` : `when we ${what}, just the two of us`, c.id);
      if (kind === 'fishing') say(c, n, caught ? [[c, caught > 1 ? 'Two! I caught two!' : 'I caught one! Look, look!'], [n, 'That is a fine fish. We will cook it tonight.']] : [[c, 'Nothing. Not even a nibble.'], [n, 'The fish are clever today. Next time.']]);
      if (Math.random() < (first ? 1 : 0.35)) chron(first ? `${n.first} took ${c.first} fishing, and ${c.first} caught a first fish.` : `${n.first} took ${c.first} out ${kind === 'fishing' ? 'fishing' : kind === 'foraging' ? 'berry picking' : 'for the afternoon'}.`, 'family');
    } else {
      addMem(n, 'outing', `the day ${c.first} and I ${what}`, `when we ${what} together`, c.id);
      addMem(c, 'outing', `the day ${n.first} and I ${what}`, `when we ${what} together`, n.id);
      if (kind === 'fishing' && caught) say(n, c, [[n, sbPick(caught > 1 ? ['Two! Drinks are on you.', 'Two! Look at that. Two!'] : ['Got one. Drinks are on you.', 'There! Look at him. A beauty.', 'One! Not a big one. It counts.'])], [c, sbPick(['Beginner\'s luck.', 'That\'s a sardine. That\'s a sardine with ambition.', 'Fine. I\'m buying. Don\'t gloat.'])]]);
      else if (kind === 'fishing') say(n, c, [[n, sbPick(['Nothing. Not a nibble.', 'The fish have the day off.'])], [c, sbPick(['Same time tomorrow?', 'The company was good, at least.'])]]);
    }
    n.outUntil = 0; c.outUntil = 0;
  };
  // the companion goes along
  recruit(c, [goS(csp, kid ? `Going ${kind === 'fishing' ? 'fishing' : 'out'} with ${parentWord(c, n)}` : `Going out with ${n.first}`),
    waitS(dur + 8, cact, ctext, { tool: ctool, social: true, nopie: true })], end);
  n.outUntil = end;
  return [goS(sp, kid ? `Taking ${c.first} ${kind === 'fishing' ? 'fishing' : 'out'}` : `Heading out with ${c.first}`),
    waitS(2, 'stand', text, { social: true, nopie: true, onEnd(nn) { say(n, c, startL); } }),
    waitS(dur, act, text, { tool, social: true, nopie: true, onEnd: finish })];
}

/* ---------- hobby on one's own ---------- */
function hobbyPlan(n, tod) {
  if (n.age < 12 || eventsBusy()) return null;
  const h = hobbyOf(n), hr = tod / 60;
  if (h === 'stargazing' && hr < 19) return null;
  const dur = 30 + Math.random() * 30;
  if (h === 'fishing' && shoreTiles.length) {
    const f = favSpot(n); if (!f) return null;
    return [goS(f, 'Walking to a favourite fishing spot'), waitS(dur, 'work', 'Fishing for fun at a favourite spot', { tool: 'fish', social: true, nopie: true, onEnd(n) { if (Math.random() < 0.45) { n.inv.fish = (n.inv.fish || 0) + 1; } n.social = Math.min(100, n.social + 6); } })];
  }
  if (h === 'foraging') {
    const nd = town.nodes.filter(x => x.kind === 'berry' && x.amt >= 1 && !x.claim && reach[x.y * W + x.x]).sort((a, b) => Math.hypot(a.x - n.tx, a.y - n.ty) - Math.hypot(b.x - n.tx, b.y - n.ty))[0]; if (!nd) return null;
    nd.claim = n; n.claims.push(nd);
    return [goS(nn => besideSpot(nn, nd.x, nd.y), 'Wandering out to the berry bushes'), waitS(dur * 0.6, 'work', 'Picking berries, just because', { tool: 'pick', social: true, nopie: true, onEnd(n) { const t = Math.min(nd.amt, 2); nd.amt -= t; n.inv.berries = (n.inv.berries || 0) + t; } })];
  }
  const f = favSpot(n); if (!f) return null;
  const pl = placeWord(f);
  if (h === 'singing') return [goS({ x: f.x, y: f.y, face: f.face }, 'Off to sing on ' + pl), waitS(dur, 'work', 'Singing on ' + pl, { tool: 'lute', social: true, nopie: true, onEnd(n) { n.social = Math.min(100, n.social + 10); } })];
  if (h === 'whittling') return [goS({ x: f.x, y: f.y, face: f.face, sit: true }, 'Finding a quiet spot to whittle'), waitS(dur, 'work', 'Whittling a little wooden bird', { tool: 'weave', social: true, nopie: true })];
  if (h === 'stargazing') return [goS({ x: f.x, y: f.y, face: { dx: 0, dy: -1 }, sit: true }, 'Walking out to watch the stars'), waitS(dur, 'leisure', 'Lying in the grass, watching the stars', { social: true, nopie: true })];
  const area = []; for (let y = f.y - 3; y <= f.y + 3; y++) for (let x = f.x - 3; x <= f.x + 3; x++) if (x > 0 && y > 0 && x < W - 1 && y < H - 1 && walkable(x, y) && roomAt[y][x] < 0 && reach[y * W + x]) area.push({ x, y });
  return [goS(f, 'Going for a long walk'), waitS(dur, 'leisure', 'Out walking by ' + pl, { area, roam: [6, 12], social: true, nopie: true })];
}

/* ---------- children: tag along to work, run to meet a parent ---------- */
function followPlan(n, tod) {
  if (n.age < 7 || n.age >= 16 || isRestDay()) return null;
  const ps = npcs.filter(p => isParentOf(p, n) && p.role === 'Worker' && p.cur && JOB_VERB[p.cur] && !p.player && working(p, tod) && Math.abs(p.tx - n.tx) + Math.abs(p.ty - n.ty) < 45);
  const p = ps[Math.floor(Math.random() * ps.length)]; if (!p) return null;
  const job = p.cur, w = parentWord(n, p);
  return [goS(nn => { const b = besideTile(p.tx, p.ty); return b ? { x: b.x, y: b.y, face: { dx: Math.sign(p.tx - b.x), dy: Math.sign(p.ty - b.y) } } : null; }, `Tagging along with ${w}`),
    waitS(25 + Math.random() * 15, 'stand', `Watching ${w} ${JOB_VERB[job]}`, { social: true, nopie: true, onEnd(n) {
      n.learn = n.learn || {}; n.learn[job] = (n.learn[job] || 0) + 1;
      if (n.learn[job] === 1) { addMem(n, 'teach', `the first time ${w} let me help ${JOB_VERB[job]}`, `when you first let me help you ${JOB_VERB[job]}`, p.id); addMem(p, 'teach', `teaching ${n.first} to ${JOB_VERB[job]}`, `when I first showed you how to ${JOB_VERB[job]}`, n.id); }
      if (Math.random() < 0.4 && Math.abs(p.tx - n.tx) + Math.abs(p.ty - n.ty) <= 2) say(p, n, pick(Math.random, [[[n, 'Can I try?'], [p, 'When you are bigger. Watch my hands.']], [[p, `See how I do it, ${n.first}?`], [n, 'I could do that!']], [[n, 'Why do you do it like that?'], [p, 'Because my mother did. And it works.']]]), true);
      bumpAff(n, p, 2, 6);
    } })];
}
function greetParentPlan(n, tod) {
  if (n.age < 4 || n.age >= 14) return null;
  const h = tod / 60; if (h < 16.5 || h > 19.5) return null;
  const p = npcs.find(q => isParentOf(q, n) && q.moving && !q.player && /home|supper/i.test(q.status || '') && Math.abs(q.tx - n.tx) + Math.abs(q.ty - n.ty) < 16 && (q.greetKey || 0) !== Math.floor(game.time / 1440));
  if (!p) return null; p.greetKey = Math.floor(game.time / 1440);
  const w = parentWord(n, p);
  return [goS(() => ({ x: p.tx, y: p.ty, face: null }), `Running to meet ${w}`),
    waitS(3, 'stand', `Hugging ${w}`, { social: true, nopie: true, onEnd(n) { if (Math.abs(p.tx - n.tx) + Math.abs(p.ty - n.ty) <= 2) { say(n, p, [[n, `${w}! You are back!`], [p, pick(Math.random, ['There is my little one.', 'Oof! You are getting heavy.', 'Did you behave today?'])]]); bumpAff(n, p, 3, 15); } } })];
}

/* ---------- graves and the chapel ---------- */
function chapelPlan(n, tod) {
  const ch = town.church; if (!ch || !ch.floorTiles || !ch.floorTiles.length || n.age < 6) return null;
  const h = tod / 60; if (h < 8 || h > 18) return null;
  return [goS(nn => pickFrom(ch.floorTiles, nn), 'Walking to the chapel'), waitS(25 + Math.random() * 20, 'pray', 'Praying quietly in the chapel', { social: true, nopie: true, onEnd(n) { n.social = Math.min(100, n.social + 10); } })];
}

/* ---------- sharing food ---------- */
const poolOf = (o, n) => (n.homeRoom && o.homeRoom === n.homeRoom) || !o.homeRoom ? o.inv : o.shop ? o.shop.stock : pantryOf(o);
function sharePlan(n) {
  if ((n.askCool || 0) > game.time) return null; n.askCool = game.time + 90;
  let best = null, bs = -1e9;
  for (const o of npcs) {
    if (o === n || o.dead || o.infant || o.age < 16 || o.player || o.pose === 'sleep') continue;
    const same = n.homeRoom && o.homeRoom === n.homeRoom; if (same && !foodCount(o.inv)) continue;
    const pool = poolOf(o, n), pd = same ? 2 : foodSat(pool) / (o.shop ? 300 : Math.max(1, hhOf(o).filter(q => !q.infant).length) * 100);
    if (pd < (o.shop ? 1 : 1.3)) continue;
    const kin = isKin(n, o), af = o.aff[n.id] || 0, gen = o.traits.includes('generous'), greedy = o.traits.includes('greedy');
    if (greedy && !kin) continue;
    if (!kin && af < 10 && !gen && pd < 3) continue;
    const s = pd + (kin ? 4 : 0) + af / 15 + (gen ? 3 : 0) - (Math.abs(o.tx - n.tx) + Math.abs(o.ty - n.ty)) / 12;
    if (s > bs) { bs = s; best = o; }
  }
  if (!best) return null;
  const o = best;
  return [goS(() => ({ x: o.tx, y: o.ty, face: null }), `Going to ask ${o.first} for food`),
    waitS(4, 'stand', `Asking ${o.first} for a bite to eat`, { social: true, nopie: true, onEnd(n) {
      if (Math.abs(o.tx - n.tx) + Math.abs(o.ty - n.ty) > 3) return false;
      const ate = eatSat(n, poolOf(o, n)); if (!ate) return false;
      town.eco.shared = (town.eco.shared || 0) + ate;
      say(n, o, [[n, n.age < 16 ? `${o.first}, I am so hungry...` : `I have not eaten all day, ${o.first}.`], [o, pick(Math.random, ['Here, take this. Nobody goes hungry while I have food.', 'Sit. Eat. Pay me back when the fields come in.', 'Go on, it is yours. You would do the same.'])]]);
      addMem(n, 'share', `the time ${o.first} fed me when I had nothing`, 'when you fed me when I had nothing', o.id);
      addMem(o, 'share', `sharing my food with ${n.first}`, 'when I shared my supper with you', n.id);
      bumpAff(n, o, 10, 15);
    } })];
}

/* ---------- feasts on the square ---------- */
function requestFeast(why) {
  return; // bonfires are retired: birthdays, weddings and funerals are the town's gatherings now
  if (town.feast || game.time - (town.lastFeast || -1e9) < YEAR * 1.4 || npcs.length < 6) return;
  if ((town.parties || []).some(p => !p.done && Math.abs(p.at - nextAt(19, 90)) < 600)) return;
  const at = spaceOut(nextAt(19, 90)); town.feast = { at, end: at + 200, why, done: false };
  chron(`There will be a bonfire on the square on ${dayLabel(at)} to celebrate ${why}.`, 'life');
}
function feastPlan(n, tod) {
  const f = town.feast; if (!f || game.time < f.at - 20 || game.time >= f.end || n.infant || n.hunger > 85) return null;
  let area = plazaTiles.filter(t => Math.hypot(t.x - town.cx, t.y - town.cy - 1) <= 4.8 && Math.hypot(t.x - town.cx, t.y - town.cy - 1) >= 1.4 && walkable(t.x, t.y)); if (!area.length) area = plazaTiles;
  return [goS(nn => pickFrom(area, nn), 'Heading to the bonfire on the square'), waitS(f.end - game.time, 'leisure', n.age < 16 ? 'Dancing round the bonfire' : 'Celebrating at the bonfire', { area, roam: [8, 18], social: true, onEnd(n) { n.social = Math.min(100, n.social + 30); addMem(n, 'feast', `the bonfire for ${f.why}`, `the night of the bonfire, when we danced till late`, null); } })];
}
function feastTick() {
  const f = town.feast; if (!f) return;
  if (!f.started && game.time >= f.at) { f.started = true; const here = npcs.filter(n => !n.infant && n.age >= 6); const a = here[Math.floor(Math.random() * here.length)], b = here[Math.floor(Math.random() * here.length)]; if (a && b && a !== b) say(a, b, [[a, `To ${f.why}!`], [b, `To ${town.name}!`]]); }
  if (game.time >= f.end) { chron(`The bonfire for ${f.why} burned late into the night.`, 'life'); calAdd('feast', `Bonfire for ${f.why}`); town.lastFeast = game.time; town.feast = null; }
}

/* ---------- waving at friends ---------- */
const waveCool = new Map();
function waveTick() {
  const now = game.time; let made = 0;
  for (const n of npcs) {
    if (made >= 2) break;
    if (focusOn() || !n.moving || n.roaming || n.player || n.infant || hasNews(n) || n.age < 4 || n.traits.includes('grumpy') || (n.waveNext || 0) > now) continue;
    n.waveNext = now + 30;
    for (const o of npcs) {
      if (o === n || o.infant || o.pose === 'sleep' || o.talkUntil > now) continue;
      const d = Math.abs(o.tx - n.tx) + Math.abs(o.ty - n.ty); if (d < 2 || d > 4) continue;
      const kin = isKin(n, o), af = n.aff[o.id] || 0; if (!kin && af < 30) continue;
      const key = Math.min(n.id, o.id) * 1000 + Math.max(n.id, o.id); if ((waveCool.get(key) || -1e9) > now) continue;
      waveCool.set(key, now + 360);
      const kid = isParentOf(o, n) && n.age < 16, band = todBand(now);
      const hi = kid ? `Hi ${parentWord(n, o)}!` : pick(Math.random, [band === 'morning' ? `Morning, ${o.first}!` : `Evening, ${o.first}!`, `Hey, ${o.first}!`, `${o.first}! Good to see you.`]);
      n.waveUntil = now + 4; o.waveUntil = now + 4;
      say(n, o, [[n, hi]], true); made++;
      break;
    }
  }
}

/* ---------- the social choice, made in free time ---------- */
function socialPlan(n, tod) {
  if (n.player || n.infant) return null;
  const h = tod / 60, rest = isRestDay(), has = t => n.traits.includes(t), r = Math.random();
  if (n.age < 16) {
    if (n.hunger >= 50) return null;
    const g = greetParentPlan(n, tod); if (g && r < 0.7) return g;
    if (r < (rest ? 0.05 : 0.28)) { const f = followPlan(n, tod); if (f) return f; }
    if (rest && r < 0.12) { const gv = graveVisitPlan(n, tod); if (gv) return gv; }
    if (n.age >= 12 && r < 0.2) return hobbyPlan(n, tod);
    return null;
  }
  if (has('anxious') && h >= 19.5) return [goS(homeSpot, 'Hurrying home before it is too dark'), waitS(30, 'leisure', 'Safe at home, door bolted')];
  if (rest && has('devout') && h < 13 && r < 0.6) { const c = chapelPlan(n, tod); if (c) return c; }
  const gr = rest ? 0.22 : 0.04; if (r < gr) { const gv = graveVisitPlan(n, tod); if (gv) return gv; }
  const oc = (rest ? 0.45 : 0.16) + (has('sociable') || has('cheerful') || has('jovial') ? 0.1 : 0) - (has('shy') ? 0.08 : 0);
  if (Math.random() < oc) { const o = outingPlan(n, tod); if (o) return o; }
  const hc = (rest ? 0.35 : 0.2) + (has('homebody') || has('dreamy') || has('lazy') ? 0.1 : 0);
  if (Math.random() < hc) { const hp = hobbyPlan(n, tod); if (hp) return hp; }
  if (rest && h >= 12 && h < 18 && Math.random() < 0.2) { const c = chapelPlan(n, tod); if (c && has('devout')) return c; }
  return null;
}
