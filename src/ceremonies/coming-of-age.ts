/* ================= Coming-of-age parties: child to adult, adult to elder =================
   The town gathers on the square round a birthday cake. The birthday person stands just north of it,
   still looking as they did; halfway through, the change happens in front of everyone. */
const partyAge = a => a === 16 || a === 60 || a === 68;
const ordinal = a => a + (a % 100 >= 11 && a % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][a % 10] || 'th');
const cakeTile = () => ({ x: town.cx, y: town.cy + 1 });
function honourTile() {
  const c = cakeTile();
  for (const [dx, dy] of [[0, -1], [-1, -1], [1, -1], [0, -2]]) { const x = c.x + dx, y = c.y + dy; if (walkable(x, y) && roomAt[y][x] < 0) return { x, y, face: { dx: 0, dy: 1 } }; }
  return { x: c.x, y: c.y - 1, face: { dx: 0, dy: 1 } };
}
function scheduleParty(n) {
  if (!modOn('event.birthday')) return;
  const a = n.age;
  if (a === 60 && n.role !== 'Worker') return;
  if (a === 68 && !['Priest', 'Trader', 'Barkeep'].includes(n.role)) return;
  town.parties = town.parties || [];
  if (town.parties.some(p => p.who === n.id && !p.done)) return;
  const kind = a === 16 ? 'adult' : 'elder';
  // they keep their old look until the moment itself
  n.lookHeld = { age: a - 1, scale: kind === 'adult' ? 0.64 : 1, hair: kind === 'elder' ? (n.hair0 || n.hair) : n.hair };
  let at = nextAt(16, 60);
  const clash = t => (town.wedding && Math.abs(town.wedding.at - t) < 240) || (town.funeral && Math.abs(town.funeral.at - t) < 240) || town.parties.some(p => !p.done && Math.abs(p.at - t) < 240);
  at = partyDay(at);
  town.parties.push({ who: n.id, age: a, kind, at, at0: at, end: at + 200, done: false });
  chron(kind === 'adult' ? `${nameOf(n)} turns sixteen. There will be a party on the square, ${dayLabel(at)}.` : `${nameOf(n)} turns ${a} and joins the elders. There will be a party on the square, ${dayLabel(at)}.`, 'life');
}
/* a coming-of-age party is held on the birthday itself if at all possible: a bonfire that day gets moved instead */
function partyDay(at) {
  const day = t => Math.floor(t / 1440);
  const busy = new Set([town.wedding && !town.wedding.done && town.wedding.at, town.funeral && !town.funeral.done && town.funeral.at].concat((town.parties || []).filter(p => !p.done).map(p => p.at)).filter(x => x).map(day));
  while (busy.has(day(at))) at += 1440;
  const f = town.feast;
  if (f && game.time < f.at && day(f.at) === day(at)) { let fa = f.at; const taken = new Set([...busy, day(at)]); while (taken.has(day(fa))) fa += 1440; f.end += fa - f.at; f.at = fa; }
  return at;
}
const activeParty = () => (town.parties || []).find(p => !p.done && game.time >= p.at - 30 && game.time < p.end);
function partyArea(pt) {
  const c = cakeTile();
  return plazaTiles.filter(t => Math.hypot(t.x - c.x, t.y - c.y) <= 4.6 && Math.hypot(t.x - c.x, t.y - c.y) >= 1.4 && walkable(t.x, t.y));
}
const invited = (o, n) => o === n || isKin(o, n) || (o.aff[n.id] || 0) >= 20 || (n.aff[o.id] || 0) >= 30 || o.age < 16 || npcs.length <= 14;
function partyPlan(n, tod) {
  const pt = activeParty(); if (!pt || n.infant || n.player || (n.hunger > 85 && pt.who !== n.id)) return null;
  const b = byId(pt.who); if (!b || !invited(n, b)) return null;
  if (n === b && n.hunger > 85) n.hunger = 85;
  if (n === b) { const h = honourTile(); return [goS(h, 'Walking to my own party'), waitS(pt.end - game.time, 'stand', pt.kind === 'adult' ? 'Turning sixteen in front of everyone' : `Turning ${pt.age} in front of everyone`, { social: true, nopie: true })]; }
  const area = partyArea(pt); if (!area.length) return null;
  return [goS(nn => pickFrom(area, nn), `Off to ${b.first}'s party`),
    waitS(pt.end - game.time, 'leisure', `At ${b.first}'s ${pt.kind === 'adult' ? 'coming-of-age' : 'elder'} party`, { area, roam: [12, 24], social: true, onEnd(n) { n.social = Math.min(100, n.social + 25); bumpAff(n, b, 5, 0); addMem(n, 'feast', `${b.first}'s ${ordinal(pt.age)} birthday`, null, b.id); } })];
}
function partyTick() {
  for (const pt of town.parties || []) {
    if (pt.done) continue;
    const b = byId(pt.who); if (!b) { pt.done = true; continue; }
    // the guest of honour drops everything (even a nap) to be there
    if (!b.player && !pt.called && game.time >= pt.at - 30) { pt.called = true; const st = b.plan && b.plan[b.si]; if (!st || !/own party/.test(st.text || '')) abortPlan(b); }
    const near = () => npcs.filter(o => o !== b && !o.infant && Math.abs(o.tx - b.tx) + Math.abs(o.ty - b.ty) <= 6);
    if (!pt.sung && game.time >= pt.at + 15) {
      pt.sung = true; const g = near()[0];
      if (g) say(g, b, [[g, anyOf([`Everybody! ${b.first} is ${pt.age} today!`, `Happy birthday, ${b.first}! Make a wish!`, `To ${b.first}! ${pt.kind === 'adult' ? 'All grown up!' : 'Welcome to the elders!'}`])], [b, pt.kind === 'adult' ? anyOf(['Do not make me blow them all out. Sixteen candles!', 'I am not crying. You are crying.']) : anyOf(['Do not count the candles. I beg you.', 'Where did all the years go?'])]]);
    }
    if (!pt.revealAt && game.time >= pt.at + 40) {
      pt.revealAt = game.time; b.lookHeld = null;
      say(b, near()[0] || b, [[b, pt.kind === 'adult' ? anyOf(['Look at me! I am a grown-up now!', 'Sixteen. I feel taller already. I AM taller!']) : anyOf(['Grey at last. Wise too, I hope.', 'An elder. Does that mean everyone listens to me now?'])], [near()[0] || b, pt.kind === 'adult' ? anyOf(['Look how you have grown!', 'Where did the little one go?']) : anyOf(['It suits you!', 'Distinguished, I would say.'])]]);
      chron(pt.kind === 'adult' ? `${nameOf(b)} came of age at a party on the square.` : `${nameOf(b)} was welcomed among the elders at a party on the square.`, 'life');
    }
    if (game.time >= pt.end) { pt.done = true; b.lookHeld = null; addMem(b, 'feast', pt.kind === 'adult' ? 'the day I came of age' : 'the day I joined the elders', null, null); b.social = 100; calAdd('birthday', `${nameOf(b)}'s ${ordinal(pt.age)} birthday party`); }
  }
}

/* ---------- talk at a party is all about the birthday ---------- */
function partyChat(n, p) {
  const pt = activeParty(); if (!pt || game.time < pt.at - 20) return null;
  const b = byId(pt.who); if (!b) return null;
  pt.chatted = pt.chatted || {}; const key = n.id + ':' + p.id;
  if (pt.chatted[key]) return null;
  const nearCake = Math.abs(p.tx - cakeTile().x) + Math.abs(p.ty - cakeTile().y) <= 10; if (!nearCake && n !== b) return null;
  pt.chatted[key] = 1;
  const adult = pt.kind === 'adult', grown = !!pt.revealAt;
  if (n === b) {
    bumpAff(b, p, 6, 10); addMem(b, 'feast', `${p.first} wishing me happy birthday`, null, p.id);
    return [[p, anyOf([`Happy birthday, ${b.first}!`, `Happy ${ordinal(pt.age)}, ${b.first}!`, `Many happy returns, ${b.first}!`])],
      [b, adult ? (grown ? anyOf([`Thank you, ${p.first}! Look, I am as tall as you now. Nearly.`, `Thanks! I get to work the trees tomorrow. Properly!`]) : anyOf([`Thank you! Sixteen! I feel exactly the same. Is that normal?`, `Thanks, ${p.first}! Did you see the cake? There is a candle for every year!`]))
        : (grown ? anyOf([`Thank you, ${p.first}. Grey suits me, does it not?`, `Thank you. An elder! I shall expect everyone to listen to me now.`]) : anyOf([`Thank you, dear. ${pt.age} years. I remember when this was all trees.`, `Oh, stop it. ...Thank you. It is lovely, all this fuss.`]))]];
  }
  const kin = kinWord(n, b), mine = kin === 'son' || kin === 'daughter', hb = b.hobby && HOBBY_TXT[b.hobby];
  const t = b.traits[0] && TRAIT_SEEN[b.traits[0]] ? TRAIT_SEEN[b.traits[0]](b) : 'is a good soul';
  const lines = adult ? (mine ? [`My little ${b.first}, sixteen. I am trying very hard not to cry.`, `Sixteen! I remember ${himHer(b)} in the cradle. Where did the years go?`]
      : [`Can you believe ${b.first} is sixteen? ${HeShe(b)} ${t}.`, `${b.first} will be out working with the rest of us tomorrow. ${hb ? 'Less time for ' + hb + ', I suppose.' : ''}`, `I knew ${b.first} would grow up fine. ${HeShe(b)} ${t}.`])
    : [`${pt.age}! ${b.first} has earned a rest, if anyone has.`, `They say ${b.first} ${b.quirk}. Still, after all these years.`, `${b.first} ${t}. Always has been. ${pt.age} years of it!`];
  return [[n, anyOf(lines)], [p, anyOf(adult ? ['Happy birthday to them!', 'Time flies.', 'Good for them.'] : ['Long may they live!', 'An elder now. Imagine.', 'Happy birthday to them!'])]];
}
