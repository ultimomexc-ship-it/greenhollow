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
  for (const n of npcs) {
    if (n.dead || n.player || n.infant || lvlOf(n.ty) !== lvlOf(y)) continue;
    const d = Math.hypot(n.tx - x, n.ty - y), inRoom = o.room != null && o.room >= 0 && roomAt[n.ty] && roomAt[n.ty][n.tx] === o.room, home = res.includes(n);
    if (!inRoom && !home && d > MEDDLE.range) continue;
    const asleep = n.pose === 'sleep', s = n.plan && n.plan[n.si], privy = !!(s && s.priv) && !n.moving && inRoom;
    const sawYou = !asleep && d <= MEDDLE.range + 2 && tsLine(n.tx, n.ty, by.tx, by.ty), sees = !asleep && (inRoom || sawYou || (d <= MEDDLE.range && tsLine(n.tx, n.ty, x, y)));
    people.push({ id: n.id, asleep, privy, inRoom, home, sawYou: !!sawYou, sees: !!sees });
  }
  if (!people.length && !res.length) return;   // (an empty place: nobody to know)
  q.push({ kind, x, y, by: by.id, t: game.time, place: o.place || '', people });
}
/** time runs again: settle what was noted */
function meddleFlush() {
  const q = town.meddleQ; if (!q || !q.length) return; town.meddleQ = [];
  const P = game.player;
  for (const r of q) {
    const by = lf2By(r.by) || P, ps = r.people, victims = ps.filter((p: any) => p.home), main = lf2By((victims[0] || ps.find((p: any) => p.inRoom) || {}).id) || null;
    const seen = ps.filter((p: any) => p.sawYou).map((p: any) => p.id), wit = [...new Set(ps.filter((p: any) => p.sees || p.home).map((p: any) => p.id))];
    const tags = r.kind === 'home_destroyed' || r.kind === 'building_down' ? ['harm', 'nuisance'] : r.kind === 'bed_moved' ? ['nuisance', 'embarrass'] : ['nuisance', 'embarrass'];
    const ev = lfEmit(r.kind, { actor: by, target: main, x: r.x, y: r.y, sev: r.kind === 'home_destroyed' ? 3 : 2, tags, anon: !seen.length, sawActor: seen, witnessIds: wit, place: r.place || undefined, chron: false, loud: true, text: `${by.first} ${r.kind}` });
    const privy = ps.filter((p: any) => p.privy);
    for (const p of privy) { const v = lf2By(p.id); if (!v) continue; lfEmit('caught_on_privy', { actor: by, target: v, x: v.tx, y: v.ty, sev: 2, tags: ['embarrass', 'scandal'], anon: !seen.length, sawActor: seen, witnessIds: wit, chron: true, loud: true, text: `${v.first} was caught on the privy when ${by.first} knocked the wall out` }); v.mood = Math.max(0, (v.mood == null ? 60 : v.mood) - 10); }
    // those who saw you: they cry out, think worse of you, and so does everyone it happened to
    const cried: any[] = [];
    for (const p of ps) {
      const n = lf2By(p.id); if (!n || n.dead) continue;
      const hurt = p.home || p.privy; if (hurt) n.mood = Math.max(0, (n.mood == null ? 60 : n.mood) - (r.kind === 'home_destroyed' ? 18 : 8));
      if (p.sawYou) { lfAff(n, by, hurt ? -9 : -3, r.kind === 'home_destroyed' ? 'pulled down a house' : p.privy ? 'knocked the wall out while I was on the privy' : r.kind === 'bed_moved' ? 'moved a bed' : 'knocked a wall down'); cried.push({ n, p }); }
    }
    for (const { n, p } of cried.slice(0, 2)) {
      const how = p.privy ? 'privy' : r.kind === 'home_destroyed' ? 'home' : p.home ? 'wall_home' : 'wall';
      if (TALK.on.deed !== false) { const c: any = { a: n, b: by, done: {}, turns: [{ by: n.id, act: 'cry_deed', x: { how } }], stage: 'topic', t0: game.time }; faceTo(n, by); talkFinish(c, n, by, true); }
    }
    if (typeof town.meddleCount === 'number' || true) town.meddleCount = (town.meddleCount || 0) + 1;
  }
}
