/* The small things of a day (docs/talk-review.md, task C). Ordinary life gives people something to say and a reason to think well or ill of each other:
   working beside somebody, eating with them, finding a thing, falling ill and getting better. Each is a life event (`LIFE.emit`, kinds in talk/kinds.ts) with a
   who and, where it has one, a with-whom; the ones done together write a reason into the opinion ledger (`lfAff`), so "why do you like her?" has an answer
   that is not "we have talked". Switch: `sys.smalllife` (on in the farming village). The words are in talk/depth.ts; a snapped word in a talk is the `snap` act there. */

LF2.feat.smalllife = true;
const SMALL_FINDS = ['a shell with a hole in it', 'a smooth green stone', 'a coin nobody recognises', 'a gull feather', 'a button', 'a key that fits nothing', 'a piece of blue glass', 'a very straight stick'];
const smallAct = (n: any) => { const s = n.plan && n.plan[n.si]; return s && s.k === 'wait' && !n.moving ? s.act : ''; };
const smallOnce = (a: any, key: string) => { const d = Math.floor(game.time / 1440), m = a.smallDay && a.smallDay.d === d ? a.smallDay : (a.smallDay = { d, k: {} }); if (m.k[key]) return false; m.k[key] = 1; return true; };

function smallLifeHour(h: number) {
  if (!town || !LF2.feat.smalllife) return;
  const ps = npcs.filter((n: any) => !n.dead && !n.infant && !n.inShip && n.age >= 8);
  // done together: work side by side, a meal at the same table
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    const a = ps[i], b = ps[j];
    if (lvlOf(a.ty) !== lvlOf(b.ty) || lfDist(a, b) > 7) continue;
    const aa = smallAct(a), ab = smallAct(b), near = lfDist(a, b) <= 3;
    if (aa === 'work' && ab === 'work' && a.job && a.job === b.job && smallOnce(a, 'w' + b.id) && smallOnce(b, 'w' + a.id)) {
      lfAff(a, b, 1.5, 'worked beside me'); lfAff(b, a, 1.5, 'worked beside me');
      if (!a.player) LIFE.emit('worked_with', a, { with: b.id }); if (!b.player) LIFE.emit('worked_with', b, { with: a.id });
    }
    if (near && aa === 'eat' && ab === 'eat' && smallOnce(a, 'e' + b.id) && smallOnce(b, 'e' + a.id)) {
      lfAff(a, b, 1, 'ate with me'); lfAff(b, a, 1, 'ate with me');
      const kin = typeof isKin === 'function' && isKin(a, b);
      if (!kin) { if (!a.player) LIFE.emit('ate_with', a, { with: b.id }); if (!b.player) LIFE.emit('ate_with', b, { with: a.id }); }   // (a meal with the family is not news)
    }
    // a hand lent: somebody at leisure near somebody at work pitches in for a while (the village hears of it)
    for (const [w, h] of [[a, b], [b, a]]) {
      if (smallAct(w) !== 'work' || !['leisure', 'stand'].includes(smallAct(h)) || h.player || h.age < 12 || (h.aff[w.id] || 0) < 0 || Math.random() > 0.04 || !smallOnce(h, 'h' + w.id)) continue;
      lfAff(w, h, 4, 'lent me a hand'); lfEmit('lent_hand', { actor: h, target: w, sev: 1, tags: ['help', 'kindness'], chron: false, text: `${h.first} lent ${w.first} a hand with the work` });
    }
    // a visit to somebody who is ill
    for (const [sick, v] of [[a, b], [b, a]]) {
      if (!sick.ill || v.ill || v.player || v.age < 12 || (v.aff[sick.id] || 0) < 20 || !near || !smallOnce(v, 'v' + sick.id)) continue;
      lfAff(sick, v, 4, 'came to see me when I was ill'); sick.mood = Math.min(100, (sick.mood == null ? 50 : sick.mood) + 4);
      lfEmit('sick_visit', { actor: v, target: sick, sev: 1, tags: ['kindness'], chron: false, text: `${v.first} looked in on ${sick.first}, who is ill` });
    }
  }
  for (const n of ps) {
    if (n.player) continue;
    // a small find, out of doors, now and then (about one person in three finds something in a week)
    if (h >= 8 && h <= 19 && n.pose !== 'sleep' && roomAt[n.ty] && roomAt[n.ty][n.tx] < 0 && Math.random() < 0.012) {
      const thing = SMALL_FINDS[Math.floor(Math.random() * SMALL_FINDS.length)];
      n.trinket = thing; LIFE.emit('found', n, { thing }); n.mood = Math.min(100, (n.mood == null ? 50 : n.mood) + 3);
    }
    // a day or three under the weather
    if (n.ill && game.time >= n.ill.until) { n.ill = null; LIFE.emit('recovered', n, {}); n.mood = Math.min(100, (n.mood == null ? 50 : n.mood) + 6); }
    else if (!n.ill && h === 7 && n.age >= 6 && Math.random() < 0.012) { n.ill = { since: game.time, until: game.time + 1440 * (1.5 + Math.random() * 2) }; LIFE.emit('ill', n, {}); }
    if (n.ill) { n.mood = Math.max(0, (n.mood == null ? 50 : n.mood) - 0.4); if (n.energy != null) n.energy = Math.max(5, n.energy - 0.6); }
  }
}
LF2.hourly.push(smallLifeHour);
