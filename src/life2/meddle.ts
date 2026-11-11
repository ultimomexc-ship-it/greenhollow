/* Meddling (docs/talk-engine.md, phase 3). What you do in build mode happens while time stands still, so the deed is noted at once (`meddleNote`: who was near, who was asleep, who was on the
   privy, who could see you) and settled when time runs again (`meddleFlush`): the event goes through the world bus (`lfEmit`) with witnesses and, if nobody saw you, without your name;
   those who saw you cry out and think worse of you, the people it happened to feel it, and the news travels from there (`talk/events.ts`). Sleepers carried out of doors are told about in the
   ticker in life2/push.ts. */

const MEDDLE = { range: 8 };
/** the people who live in a room (a house or a hut) */
function meddleResidents(r: any): any[] {
  if (!r) return [];
  return npcs.filter((n: any) => !n.dead && !n.player && !n.infant && (n.homeRoom === r || (n.bed && (r.beds || []).includes(n.bed))));
}
/** note a deed at the moment it is done. `o`: { room: index of the room it happens in, residents, place } */
function meddleNote(kind: string, x: number, y: number, by: any, o: any = {}) {
  if (!by || !by.player || typeof town === 'undefined' || !town) return;
  const q = town.meddleQ || (town.meddleQ = []), res = o.residents || [], people: any[] = [];
  if (res.length && q.some((r: any) => r.kind === kind && r.people.some((p: any) => p.home && p.id === res[0].id) && game.time - r.t < 5)) return;   // (the same thing done again to the same person is one deed)
  for (const n of npcs) {
    if (n.dead || n.player || n.infant || lvlOf(n.ty) !== lvlOf(y)) continue;
    const d = Math.hypot(n.tx - x, n.ty - y), inRoom = o.room != null && o.room >= 0 && roomAt[n.ty] && roomAt[n.ty][n.tx] === o.room, home = res.includes(n);
    if (!inRoom && !home && d > MEDDLE.range) continue;
    const asleep = n.pose === 'sleep', s = n.plan && n.plan[n.si], privy = !!(s && s.priv) && !n.moving && inRoom, txt = String((s && s.text) || ''), exposure = privy ? 'privy' : !n.moving && d <= 6 && /bath|wash|soak/i.test(txt) ? 'bath' : !n.moving && d <= 6 && /pray|worship|altar/i.test(txt) ? 'pray' : '';
    const sawYou = !asleep && d <= MEDDLE.range + 2 && tsLine(n.tx, n.ty, by.tx, by.ty), sees = !asleep && (inRoom || sawYou || (d <= MEDDLE.range && tsLine(n.tx, n.ty, x, y)));
    people.push({ id: n.id, asleep, privy, exposure, inRoom, home, sawYou: !!sawYou, sees: !!sees });
  }
  if (!people.length && !res.length) return;   // (an empty place: nobody to know)
  q.push({ kind, x, y, by: by.id, t: game.time, place: o.place || '', people });
}
/** time runs again: settle what was noted */
const MEDDLE_TAGS: any = { home_destroyed: ['harm', 'nuisance'], building_down: ['harm', 'nuisance'], furniture_removed: ['nuisance'], person_pushed: ['nuisance', 'embarrass'] };
const MEDDLE_EXPOSED: any = { privy: 'caught_on_privy', bath: 'caught_bathing', pray: 'caught_praying' };
const MEDDLE_INCIDENT: any = { privy: 'The Day of the Open Privy', bath: 'The Day of the Open Bath', pray: 'The Interrupted Prayer', home: 'The Day the House Came Down' };
function meddleFlush() {
  const q = town.meddleQ; if (!q || !q.length) return; town.meddleQ = [];
  const P = game.player;
  for (const r of q) {
    const by = lf2By(r.by) || P, ps = r.people, victims = ps.filter((p: any) => p.home), main = lf2By((victims[0] || ps.find((p: any) => p.inRoom) || {}).id) || null;
    const seen = ps.filter((p: any) => p.sawYou).map((p: any) => p.id), wit = [...new Set(ps.filter((p: any) => p.sees || p.home).map((p: any) => p.id))];
    const tags = MEDDLE_TAGS[r.kind] || ['nuisance', 'embarrass'];
    lfEmit(r.kind, { actor: by, target: main, x: r.x, y: r.y, sev: r.kind === 'home_destroyed' ? 3 : 2, tags, anon: !seen.length, sawActor: seen, witnessIds: wit, place: r.place || undefined, chron: false, loud: true, text: `${by.first} ${r.kind}` });
    for (const p of ps.filter((q2: any) => q2.exposure)) {
      const v = lf2By(p.id); if (!v) continue; lfEmit(MEDDLE_EXPOSED[p.exposure], { actor: by, target: v, x: v.tx, y: v.ty, sev: 2, tags: ['embarrass', 'scandal'], anon: !seen.length, sawActor: seen, witnessIds: wit, chron: true, loud: true, text: `${v.first} was caught out when ${by.first} knocked the wall out` });
      v.mood = Math.max(0, (v.mood == null ? 60 : v.mood) - 10); if (wit.length >= 2) chron(`${MEDDLE_INCIDENT[p.exposure]}: ${v.first} was found out when the wall came down.`, 'note');
    }
    if (r.kind === 'home_destroyed') chron(`${MEDDLE_INCIDENT.home}: ${main ? main.first + '\'s' : 'a'} house was pulled down.`, 'note');
    // those who saw you: they cry out, think worse of you, and so does everyone it happened to
    const cried: any[] = [];
    for (const p of ps) {
      const n = lf2By(p.id); if (!n || n.dead) continue;
      const hurt = p.home || !!p.exposure; if (hurt) n.mood = Math.max(0, (n.mood == null ? 60 : n.mood) - (r.kind === 'home_destroyed' ? 18 : 8));
      if (p.sawYou) { lfAff(n, by, (hurt ? -9 : -3) * TALK.dial.sev, r.kind === 'home_destroyed' ? 'pulled down a house' : p.exposure ? 'knocked the wall out while I was in the middle of something' : r.kind === 'bed_moved' ? 'moved a bed' : r.kind === 'furniture_removed' ? 'took my furniture' : r.kind === 'person_pushed' ? 'pushed me about' : 'knocked a wall down'); cried.push({ n, p }); }
    }
    for (const { n, p } of cried.slice(0, 2)) {
      const how = p.exposure === 'privy' ? 'privy' : p.exposure === 'bath' ? 'bath' : p.exposure === 'pray' ? 'pray' : r.kind === 'home_destroyed' ? 'home' : r.kind === 'furniture_removed' ? 'furniture' : r.kind === 'person_pushed' ? 'pushed' : p.home ? 'wall_home' : 'wall';
      if (TALK.on.deed !== false) { const c: any = { a: n, b: by, done: {}, turns: [{ by: n.id, act: 'cry_deed', x: { how } }], stage: 'topic', t0: game.time }; faceTo(n, by); talkFinish(c, n, by, true); }
    }
    meddleReactions(r, by, ps);
    town.meddleCount = (town.meddleCount || 0) + 1;
  }
}
/** what each person who knows does about it (a plan they take up soon): stare at the damage, flee, tell a friend, go and have it out with you */
function meddleReactions(r: any, by: any, ps: any[]) {
  for (const p of ps) {
    const n = lf2By(p.id); if (!n || n.dead || n.player || p.asleep || n.infant || n.age < 8) continue;
    const bold = talkHas(n, 'prickly') || talkHas(n, 'proud') || talkHas(n, 'brave') || (n.aff[by.id] || 0) < -20, shy = talkHas(n, 'shy') || talkHas(n, 'anxious'), chatty = talkHas(n, 'gossipy') || talkHas(n, 'sociable') || talkHas(n, 'curious');
    const hurt = p.home || !!p.exposure; let type = '';
    if (p.exposure) type = Math.random() < 0.7 ? 'flee' : 'stare';
    else if (hurt) type = p.sawYou && bold && !shy ? 'confront' : r.kind === 'home_destroyed' || Math.random() < 0.5 ? 'stare' : (chatty ? 'tell' : 'stare');
    else type = chatty ? 'tell' : Math.random() < 0.5 ? 'stare' : '';
    if (type) n.react = { type, x: r.x, y: r.y, by: by.id, until: game.time + 240, ev: r.kind };
  }
}
/** tell a friend what happened: they share the story at once, the way anyone would */
function meddleTell(a: any, b: any) {
  const m = (a.tmem || []).filter((q: any) => q.ev != null && q.kind !== 'did').sort((x: any, y: any) => y.t - x.t)[0]; if (!m || TM.ofEv(b, m.ev)) return;
  const ev = lf2Ev().find((q: any) => q.id === m.ev); if (!ev) return; const c: any = { a, b, done: {}, turns: [], left: {}, news: { m, ev, score: 1 } };
  talkTurn(c, a, b, 'share_news'); const rep = talkChoose(c, b, a, ACTS.share_news.replies); if (rep) talkTurn(c, b, a, rep); talkFinish(c, a, b, talkListened(a, b));
}
LF2.dec.push(function (n: any) {
  const r = n.react; if (!r || n.player) return null; n.react = null; if (game.time > r.until) return null;
  const by = lf2By(r.by), site = () => besideTile(r.x, r.y, null);
  if (r.type === 'stare') return [goS(() => { const b = site(); return b ? { x: b.x, y: b.y, face: { dx: Math.sign(r.x - b.x), dy: Math.sign(r.y - b.y) } } : null; }, 'Going to see what happened'), waitS(8 + Math.random() * 8, 'stand', 'Staring at the damage', { nopie: true })];
  if (r.type === 'confront' && by) return [goS(() => { const b = besideTile(by.tx, by.ty, null); return b ? { x: b.x, y: b.y, face: { dx: Math.sign(by.tx - b.x), dy: Math.sign(by.ty - b.y) } } : null; }, `Looking for ${by.first} to have it out`), waitS(20, 'stand', `Waiting for ${by.first} to explain`, { nopie: true })];
  if (r.type === 'flee') { let spot: any = null; for (let i = 0; i < 20 && !spot; i++) { const x = r.x + Math.round((Math.random() * 2 - 1) * 14), y = r.y + Math.round((Math.random() * 2 - 1) * 8); if (x > 2 && y > 2 && x < W - 2 && y < GH() - 2 && walkable(x, y) && Math.hypot(x - r.x, y - r.y) > 9 && lvlOf(y) === lvlOf(n.ty)) spot = { x, y }; } if (!spot) return null; return [goS(spot, 'Hurrying away, mortified'), waitS(10, 'stand', 'Trying to forget it', { nopie: true })]; }
  if (r.type === 'tell') { const F = npcs.filter((o: any) => o !== n && !o.dead && !o.infant && o.age >= 10 && o.pose !== 'sleep' && (n.aff[o.id] || 0) > 15 && lvlOf(o.ty) === lvlOf(n.ty)).sort((a: any, b: any) => lfDist(n, a) - lfDist(n, b))[0]; if (!F) return null;
    return [goS(() => { const b = besideTile(F.tx, F.ty, null); return b ? { x: b.x, y: b.y, face: { dx: Math.sign(F.tx - b.x), dy: Math.sign(F.ty - b.y) } } : null; }, `Going to tell ${F.first} what happened`), waitS(2, 'stand', `Telling ${F.first} what happened`, { nopie: true, onEnd(nn: any) { if (lfDist(nn, F) <= 3) meddleTell(nn, F); } })]; }
  return null;
});
