/* Wishes (docs/wishing-well.md, step 2): the well is the town's quest log. Each household keeps one wish open (and the town up to three): what it lacks most,
   broadly put (a roof, more room, a window, flowers near the bed, a hen in the yard for a child). A wish is granted by whatever gives it, built any way you like, and
   the one who wished believes the well did it (a `wish` surprise, life2/surprise.ts, and `wish_granted`); one not granted in `WISH.days` expires and the household
   wishes for something else. Some wishes unlock what they ask for (a seed stall, a carpenter's stall). Shown in the well panel (life2/well.ts) with how far along
   each is; told in talk (`tell_wish`, talk/surprise.ts). `town.wishes` = [{ id, key (household), who, kind, made, until, done, state: 'open' | 'granted' | 'expired' }]. */

const WISH: any = { days: 6, town: 3, again: 2 * 1440 };
const wishYard = (n: any) => (typeof yardOfN === 'function' ? yardOfN(n) : null);
const wishMe = (o: any) => !!o && (o.player || o === game.player || (typeof yardPlayer === 'function' && o === yardPlayer()));
const wishPeople = (y: any) => (y ? yardPeople(y) : []).filter((o: any) => !o.dead && !wishMe(o) && !rentTrader(o));
function wishRoom(n: any): any { const b = n.bed; if (!b || b.x == null) return null; const ri = roomAt[b.y] ? roomAt[b.y][b.x] : -1, r = ri >= 0 ? rooms[ri] : null; return r && !r.dead ? r : null; }
function wishRoomFit(n: any): number[] { const r = wishRoom(n); if (!r) return [0, 1]; const cells = r.cells ? r.cells.size : r.w * r.h, ppl = npcs.filter((o: any) => !o.dead && o.bed && o.bed.x != null && r.cells && r.cells.has(o.bed.y * W + o.bed.x)).length; return [cells, ppl * 2 + 2]; }
function wishFields(n: any): number[] { const y = wishYard(n); if (!y) return [0, 1]; let f = 0; for (const c of town.crops || []) if (town.yardAt.get(c.y * W + c.x) === y) f++; return [f, Math.max(4, 4 * wishPeople(y).filter((o: any) => o.age >= 16).length)]; }
const wishBuilt = (kind: string) => (town.stalls || []).some((s: any) => s.built === kind);
/** what can be wished for: a label for the list, the check, and how far along it is ([have, need]) where that means something */
const WISH_DEF: any = {
  bed: { label: 'a bed of their own', ok: (n: any) => yardHasBed(n) },
  yard: { label: 'a fenced yard round the bed', ok: (n: any) => !!wishYard(n) },
  roof: { label: 'a roof over the bed', ok: (n: any) => rentHome(n).roof },
  room: { label: 'more room in the house', ok: (n: any) => { const [h, nd] = wishRoomFit(n); return h >= nd; }, prog: wishRoomFit },
  window: { label: 'a window', ok: (n: any) => rentHome(n).window },
  fields: { label: 'more fields', ok: (n: any) => { const [h, nd] = wishFields(n); return h >= nd; }, prog: wishFields },
  flowers: { label: 'flowers near the bed', ok: (n: any) => rentHome(n).flowers },
  hen: { label: 'a hen in the yard', child: true, ok: (n: any) => { const y = wishYard(n); return !!y && henCount(y) >= 1; } },
  axe: { label: 'an axe', ok: (n: any) => (n.items || []).some((i: any) => i.kind === 'axe') },
  seedstall: { label: 'a seed stall', town: true, unlock: 'seedstall', ok: () => wishBuilt('stallseed') },
  carpenter: { label: "a carpenter's stall", town: true, unlock: 'carpenter', ok: () => wishBuilt('stallcarp') }
};
const WISH_ADULT = ['bed', 'yard', 'roof', 'room', 'window', 'fields', 'flowers'];
const wishList = (): any[] => town.wishes || (town.wishes = []);
const wishOpen = (): any[] => wishList().filter((w: any) => w.state === 'open');
const wishKeyOf = (n: any) => { const y = wishYard(n); return y ? 'y' + y.id : 'p' + n.id; };
const wishSkip = (key: string, kind: string) => { const s = town.wishSkip || {}; return (s[key + ':' + kind] || -1e9) > game.time; };
/** how far along a wish is: [have, need] */
function wishProgress(w: any): number[] { const d = WISH_DEF[w.kind], n = byId(w.who); if (!d || !n) return [0, 1]; if (d.prog) return d.prog(n); return d.ok(n) ? [1, 1] : [0, 1]; }
/** make a wish for somebody: the record, the unlock, the life event */
function wishMake(n: any, kind: string, key: string): any {
  const w = { id: (town.wishId = (town.wishId || 0) + 1), key, who: n.id, kind, made: game.time, until: game.time + WISH.days * 1440, done: null, state: 'open' };
  wishList().push(w); if (wishList().length > 80) town.wishes = wishList().slice(-80);
  const d = WISH_DEF[kind]; if (d.unlock && typeof hamletUnlock === 'function' && !hamletUnlocked(d.unlock)) hamletUnlock(d.unlock);
  LIFE.emit('wished', n, {});
  return w;
}
/** what a household wishes for now: the first thing its grown-ups lack, or now and then a child's wish */
function wishPick(people: any[], key: string): any {
  const kids = people.filter((o: any) => o.age < 16 && !o.infant), adults = people.filter((o: any) => o.age >= 16);
  if (kids.length && Math.random() < 0.35 && !wishSkip(key, 'hen') && !WISH_DEF.hen.ok(kids[0])) return { n: kids[Math.floor(Math.random() * kids.length)], kind: 'hen' };
  for (const kind of WISH_ADULT) for (const n of adults) if (!wishSkip(key, kind) && !WISH_DEF[kind].ok(n)) return { n, kind };
  if (kids.length && !wishSkip(key, 'flowers') && !WISH_DEF.flowers.ok(kids[0])) return { n: kids[0], kind: 'flowers' };
  return null;
}
/** every hour: grant what has come true, let old wishes go, and give every household and the town something to wish for */
function wishTick() {
  if (!wellOn()) return;
  for (const w of wishOpen()) {
    const d = WISH_DEF[w.kind], n = byId(w.who);
    if (!d || !n || n.dead || wishMe(n)) { w.state = 'expired'; continue; }
    if (d.ok(n)) { w.state = 'granted'; w.done = game.time; LIFE.emit('wish_granted', n, {}); if (typeof surpAdd === 'function') surpAdd(n, [['wish', 1]], { noNews: true }); continue; }
    if (game.time > w.until) { w.state = 'expired'; (town.wishSkip || (town.wishSkip = {}))[w.key + ':' + w.kind] = game.time + WISH.again; }
  }
  const open = new Set(wishOpen().map((w: any) => w.key));
  const homes = new Map<string, any[]>();
  for (const n of npcs) { if (n.dead || wishMe(n) || n.infant || rentTrader(n)) continue; const k = wishKeyOf(n); if (!homes.has(k)) homes.set(k, []); homes.get(k).push(n); }
  for (const [key, people] of homes) { if (open.has(key)) continue; const p = wishPick(people, key); if (p) wishMake(p.n, p.kind, key); }
  // the town's wishes: the next stall it lacks, once there are households enough to want it
  const lived = (town.yards || []).filter((y: any) => yardPeople(y).length).length, townOpen = wishOpen().filter((w: any) => w.key === 'town');
  if (townOpen.length < WISH.town) for (const kind of ['seedstall', 'carpenter']) {
    if (townOpen.some((w: any) => w.kind === kind) || WISH_DEF[kind].ok() || wishSkip('town', kind) || lived < (kind === 'seedstall' ? 4 : 6)) continue;
    const who = npcs.filter((o: any) => !o.dead && !wishMe(o) && o.age >= 16 && !rentTrader(o)); if (who.length) wishMake(who[Math.floor(Math.random() * who.length)], kind, 'town'); break;
  }
}
LF2.hourly.push(() => wishTick());
/** the wish somebody made that is still open (for talk) */
const wishOf = (n: any) => wishOpen().find((w: any) => w.who === n.id) || null;
