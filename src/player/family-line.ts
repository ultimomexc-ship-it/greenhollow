/* ================= the family line: when you die, you carry on as someone you loved ================= */
const heirRole = o => o.role === 'Worker' || o.role === 'Elder' || o.role === 'Child';
function heirCandidates(dead) {
  const pool = npcs.filter(o => !o.dead && !o.infant && o.age >= 8 && heirRole(o) && !o.player);
  const score = o => {
    const k = typeof kinWord === 'function' ? kinWord(dead, o) : null, aff = (dead.aff && dead.aff[o.id]) || 0, back = (o.aff && o.aff[dead.id]) || 0;
    let sc = { son: 100, daughter: 100, wife: 70, husband: 70, sweetheart: 65, brother: 60, sister: 60 }[k] || 0;
    if (!sc && (isKin(dead, o))) sc = 55;            // grandchildren, nieces and nephews and the like
    sc += Math.max(aff, back) * 0.6;
    if (o.age < dead.age) sc += Math.min(20, (dead.age - o.age) * 0.5); else sc -= 15;   // younger is better: more life to live
    if (o.age < 12) sc -= 10;
    return { o, sc, k, love: sc >= 40 || isKin(dead, o) || Math.max(aff, back) >= 30 };
  };
  const all = pool.map(score).sort((a, b) => b.sc - a.sc);
  const loved = all.filter(c => c.love);
  return (loved.length ? loved : all).slice(0, 3);
}
const HEIR_LINES = {
  child: ['I will make you proud. I promise.', 'You taught me everything. Let me show them.', 'I am not ready. But I will be.'],
  partner: ['We built all this together. I will keep it going.', 'I will carry on for both of us.'],
  sibling: ['Same blood, same stubbornness. I can do this.', 'Leave it to me. Like always.'],
  friend: ['You were my best friend. I will look after them all.', 'Somebody has to keep this place laughing.', 'I owe you that much.'],
};
function lifeDeeds(rec) {
  const id = rec.id, homes = npcs.filter(o => o.helpedBy && o.helpedBy[id]).map(o => o.homeRoom).filter((r, i, a) => r && a.indexOf(r) === i).length;
  return { homes, kids: rec.kids || 0 };
}
function beginSuccession(rec, person) {
  rec.wasPlayer = true; rec.deeds = lifeDeeds(rec);
  town.line = town.line || { gen: 1, history: [] };
  town.line.history.push({ name: rec.name, born: rec.born, died: rec.died, age: rec.age, cause: rec.cause });
  const cands = heirCandidates(person);
  if (!cands.length) { chron(`With ${rec.first} gone, there is nobody left to carry the story on.`, 'death'); town.succession = null; return; }
  town.succession = { rec, person, cands: cands.map(c => ({ id: c.o.id, k: c.k })), at: game.time };
  if (typeof showSuccession === 'function' && typeof document !== 'undefined') showSuccession(); else chooseHeir(cands[0].o.id);
}
function chooseHeir(id) {
  const s = town.succession; if (!s) return;
  if (s.swap && id === 'stay') { town.succession = null; if (game.player) playerSay(game.player, 'Whoa. That was... something. Better sit down a moment.'); return; }
  const h = byId(id); if (!h) return;
  if (s.swap) {
    town.succession = null; const old = s.person;
    if (typeof releasePlayer === 'function') releasePlayer();
    town.tippingId = h.id; town.line = town.line || { gen: 1, history: [] };
    chron(`${s.rec.first} ate a dreamcap in ${town.region ? town.region.name : 'the forest'} and dreamed of being ${nameOf(h)}. When ${s.rec.first} woke, it felt like waking in somebody else's life.`, 'life');
    if (old && !old.dead) { abortPlan(old); say(old, old, [[old, anyOf(['I had the strangest dream. I was... someone else?', 'Why am I out here? My head is all fog.', 'Mushrooms. Never again.'])]]); }
    if (typeof startPlaying === 'function' && typeof document !== 'undefined') startPlaying(h); else if (typeof takeControl === 'function') takeControl(h);
    return;
  }
  town.succession = null; town.tippingId = h.id; town.line.gen++;
  s.rec.heir = { id: h.id, k: (s.cands.find(c => c.id === id) || {}).k || null };
  const k = (s.cands.find(c => c.id === id) || {}).k;
  chron(`${nameOf(h)}${k ? ', ' + s.rec.first + "'s " + k + ',' : ''} carries the story on. Generation ${town.line.gen} begins.`, 'life');
  addMem(h, 'loss', `the day ${s.rec.first} died`, null, s.rec.id);
  if (typeof startPlaying === 'function' && typeof document !== 'undefined') startPlaying(h); else if (typeof takeControl === 'function') takeControl(h);
}

/* ---------- the funeral of the person you used to be ---------- */
function ownFuneral(f, rec, speak, step) {
  const h = byId(rec.heir.id); if (!h || h.dead) return;
  const k = rec.heir.k, him = rec.female ? 'her' : 'him', his = rec.female ? 'her' : 'his', he = rec.female ? 'she' : 'he';
  const word = k === 'son' || k === 'daughter' ? (rec.female ? 'Mum' : 'Dad') : rec.first;
  const think = (t) => game.events.push({ time: game.time, a: h, b: h, place: '', topic: 'life', quiet: true, self: true, lines: [{ who: h, text: '(' + t + ')' }] });
  const d = rec.deeds || { homes: 0, kids: 0 };
  step('p0', 2, () => think(anyOf(k === 'son' || k === 'daughter'
    ? [`It is so strange. I can still hear ${word} telling me to come in before dark.`, `Everyone keeps looking at me. I have ${his} eyes, they say.`]
    : k === 'wife' || k === 'husband' || k === 'sweetheart' ? [`All those years, and now just a cross and a crowd of faces.`, `I keep reaching for ${his} hand.`]
    : [`It feels like saying goodbye to a part of myself.`, `I knew ${him} better than anyone. Strange. Almost as if I had been ${him}.`])));
  // the eulogy is about the life you actually lived
  const deeds = [];
  if (d.homes) deeds.push(`${rec.first} helped raise the walls of ${d.homes === 1 ? 'a home' : d.homes + ' homes'} in ${town.name}. Families sleep warm under them tonight.`);
  if (d.kids) deeds.push(`${rec.first} leaves ${d.kids === 1 ? 'a child' : d.kids + ' children'} behind. That is a life that carries on.`);
  deeds.push(`${rec.first} ${rec.quirk}. We all laughed about it. We will miss it now.`);
  step('p1', 17, () => say(speak, speak, [[speak, deeds[0]], [speak, deeds[1] || `A ${rec.traits[0] || 'good'} soul. The Flying Spaghetti Monster has a seat waiting at the great pasta table.`]]));
  step('p2', 23, () => say(speak, h, [[speak, `${h.first}${k ? ', ' + rec.first + "'s " + k : ''}. ${rec.first} would want you to carry on. And you will not do it alone.`], [h, anyOf(['I know. Thank you.', 'I will try.', '*nods*'])]]));
  step('p3', 35, () => think(anyOf([`I will make it count. For both of us.`, `Whatever ${he} started, I will finish.`, `Goodbye, ${word}. I have got it from here.`])));
}

