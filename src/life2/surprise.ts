/* Surprises: what build mode does to people, seen from their side. Build mode stops time, so nobody sees it happen: a villager pushed across the island,
   carried out of the house asleep, given a bed, a roof, a window, a fence or fields, or losing them, only finds it changed when time runs again. Nobody knows
   who did it or how (no name, no suspicion, no grudge). When build mode starts each villager's place and home are noted (`surpTake`); when time runs
   again they are looked at again (`surpSettle`) and what changed goes on the person as surprises (`n.surp`: { k, q, t, ev, told }), with the main one as news
   for everybody (`turned_up`, `home_changed`, `home_lost`, or `bed_moved` for a sleeper). It is the first thing they bring up the next time they talk
   (`blurt`, talk/surprise.ts), to you or to anybody, each thing once per listener, for three days. Words: `blurt`, `odd_cry`, `odd_*` in talk/words/ *-life.ts. */

const SURP: any = { snap: null, pending: false, days: 3, cries: 4, criesLeft: 0 };
/** most striking first: what is said first, and what the news is about */
const SURP_ORDER = ['wish', 'woke_moved', 'chair_moved', 'moved', 'bed_gone', 'roof_gone', 'bed_new', 'roof', 'bed_moved', 'yard_gone', 'yard', 'yard_open', 'window', 'window_gone', 'fields_more', 'fields_less'];
const SURP_GOOD = ['wish', 'bed_new', 'roof', 'yard', 'window', 'fields_more'];
const SURP_BAD = ['bed_gone', 'roof_gone', 'yard_gone', 'yard_open', 'window_gone', 'fields_less'];
const surpTone = (k: string) => (SURP_GOOD.includes(k) ? 'good' : SURP_BAD.includes(k) ? 'bad' : 'odd');
/** what the news calls a change to somebody's home (the {place} of `ev:home_changed` / `ev:home_lost`) */
const SURP_WHAT: any = { bed_new: 'a bed of their own', roof: 'a roof over the bed', window: 'a window', yard: 'a fence round the yard', fields_more: 'new fields',
  bed_gone: 'bed', roof_gone: 'roof', window_gone: 'window', yard_gone: 'fence', yard_open: 'fence', fields_less: 'fields', bed_moved: 'bed' };

/** somebody's place and home as it stands */
function surpHome(n: any): any {
  const b = n.bed && n.bed.x != null && !n.homeless ? n.bed : null;
  const ri = b && roomAt[b.y] ? roomAt[b.y][b.x] : -1, r = ri >= 0 ? rooms[ri] : null, roof = !!(r && !r.dead);
  let win = false;
  if (roof) for (const k of r.walls || []) if ((town.win && town.win.has(k)) || (town.winS && town.winS.has(k))) { win = true; break; }
  const yd = b && typeof yardAtXY === 'function' ? yardAtXY(b.x, b.y) : null;
  let fields = 0;
  if (yd) for (const c of town.crops || []) if (town.yardAt.get(c.y * W + c.x) === yd) fields++;
  return { x: n.tx, y: n.ty, rm: roomAt[n.ty] ? roomAt[n.ty][n.tx] : -1, bed: b, bx: b ? b.x : null, by: b ? b.y : null, roof, win, yard: yd, yopen: !!(yd && yd.open != null), fields };
}
/** build mode starts: note everybody */
function surpTake() {
  if (typeof town === 'undefined' || !town || tut2Active()) { SURP.snap = null; return; }
  SURP.snap = new Map();
  for (const n of npcs) if (!n.dead && !n.player && !n.infant) SURP.snap.set(n.id, surpHome(n));
}
/** what changed for one person: [[kind, qty]] */
function surpDiff(n: any, a: any, b: any): any[] {
  const out: any[] = [], held = n.pose === 'sleep' || n.pose === 'sit';
  const far = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  if (!held && far > 0 && (far >= 2 || lvlOf(a.y) !== lvlOf(b.y) || a.rm !== b.rm)) out.push(['moved', far]);
  if (!a.bed && b.bed) out.push(['bed_new', 1]);
  else if (a.bed && !b.bed) out.push(['bed_gone', 1]);
  else if (a.bed && b.bed && !held && (a.bx !== b.bx || a.by !== b.by)) out.push(['bed_moved', 1]);
  if (b.bed && !a.roof && b.roof) out.push(['roof', 1]);
  if (a.bed && b.bed && a.roof && !b.roof) out.push(['roof_gone', 1]);
  if (b.roof && !a.win && b.win) out.push(['window', 1]);
  if (a.roof && b.roof && a.win && !b.win) out.push(['window_gone', 1]);
  if (b.yard && !a.yard) out.push(['yard', 1]);
  else if (a.yard && !b.yard && b.bed) out.push(['yard_gone', 1]);
  else if (b.yard && !a.yopen && b.yopen) out.push(['yard_open', 1]);
  const f0 = a.yard ? a.fields : 0, f1 = b.yard ? b.fields : 0;
  if (f1 > f0 && b.yard) out.push(['fields_more', f1 - f0]);
  else if (f1 < f0 && a.yard && b.yard) out.push(['fields_less', f0 - f1]);
  return out;
}
/** where somebody finds themselves, in a few words (the {place} of `ev:turned_up`) */
function surpWhere(n: any): string {
  const ri = roomAt[n.ty] ? roomAt[n.ty][n.tx] : -1, r = ri >= 0 ? rooms[ri] : null;
  if (r) return n.homeRoom === r || (n.bed && (r.beds || []).includes(n.bed)) ? 'back indoors at home' : 'in somebody else\'s house';
  const yd = typeof yardAtXY === 'function' ? yardAtXY(n.tx, n.ty) : null;
  if (yd) return yd === (typeof yardOfN === 'function' ? yardOfN(n) : null) ? (n.female ? 'in her own yard' : 'in his own yard') : 'in somebody else\'s yard';
  let trees = 0;
  for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) if (grid[n.ty + yy] && grid[n.ty + yy][n.tx + xx] === T.TREE) trees++;
  const g = grid[n.ty][n.tx];
  return trees >= 6 ? 'in the middle of the woods' : g === T.CROP ? 'in the middle of a field' : g === T.PATH ? 'in the middle of the road' : g === T.SAND ? 'on the beach' : trees >= 2 ? 'under a tree' : 'out in the open';
}
/** put surprises on somebody; the first (most striking) is news. Returns the records */
function surpAdd(n: any, list: any[], o: any = {}): any[] {
  if (!list.length || n.dead || n.player) return [];
  list.sort((x, y) => SURP_ORDER.indexOf(x[0]) - SURP_ORDER.indexOf(y[0]));
  const now = game.time, keep = (n.surp || []).filter((s: any) => now - s.t < SURP.days * 1440);
  const recs = list.map(([k, q]) => ({ k, q: q || 1, t: now, told: {} as any, ev: null as any }));
  const [k] = list[0], tone = surpTone(k);
  // news: nobody did it, as far as anybody knows (no actor, no suspicion), and the one it happened to knows it first-hand
  const kind = k === 'woke_moved' || k === 'chair_moved' ? 'bed_moved' : k === 'moved' ? 'turned_up' : tone === 'bad' || k === 'bed_moved' ? 'home_lost' : 'home_changed';
  const place = kind === 'turned_up' || kind === 'bed_moved' ? surpWhere(n) : String(SURP_WHAT[k] || 'something').replace('their', n.female ? 'her' : 'his');
  const ev = o.noNews ? null : lfEmit(kind, { actor: null, target: n, x: n.tx, y: n.ty, sev: tone === 'good' ? 1 : 2, tags: ['mystery'], place, witnessIds: [n.id], chron: false });
  recs[0].ev = ev ? ev.id : null;
  if (!o.noNews && (kind === 'turned_up' || kind === 'bed_moved')) chron(`${n.first} ${k === 'woke_moved' ? 'woke up' : k === 'chair_moved' ? 'got up' : 'found themselves'} ${place}${k === 'woke_moved' ? ', bed and all' : k === 'chair_moved' ? ', chair and all' : ''}. Nobody knows how.`, 'life');
  n.mood = Math.max(0, Math.min(100, (n.mood == null ? 60 : n.mood) + (tone === 'good' ? 4 : tone === 'bad' ? -6 : -2)));
  n.surp = keep.concat(recs).slice(-10);
  // they say so out loud, there and then, to nobody in particular
  if (!o.quiet && TALK.on.life !== false && (o.cry || SURP.criesLeft > 0)) {
    if (!o.cry) SURP.criesLeft--;
    const c: any = { a: n, b: n, solo: true, done: {}, turns: [{ by: n.id, act: 'odd_cry', x: { how: k } }], stage: 'topic', t0: now };
    talkFinish(c, n, n, !!game.player && lfDist(n, game.player) <= TALK.earshot);
  }
  return recs;
}
/** time runs again after build mode: what changed for each person */
function surpSettle() {
  const snap = SURP.snap; SURP.snap = null;
  if (!snap || tut2Active()) return;
  SURP.criesLeft = SURP.cries;
  for (const n of npcs) {
    if (n.dead || n.player || n.infant) continue;
    const a = snap.get(n.id); if (!a) continue;
    surpAdd(n, surpDiff(n, a, surpHome(n)));
  }
}
/** what somebody has not yet told li, most striking first */
function surpUntold(n: any, li: any): any {
  const now = game.time;
  return (n.surp || []).filter((s: any) => now - s.t < SURP.days * 1440 && !s.told[li.id]).sort((x: any, y: any) => SURP_ORDER.indexOf(x.k) - SURP_ORDER.indexOf(y.k))[0] || null;
}
// build mode on: note everybody; off: look again once time runs (after the new rooms, yards and beds have been worked out)
// @ts-expect-error -- deliberate patch
const _surpToggle = itBuildToggle; itBuildToggle = function (n: any, on?: boolean) {
  const was = !!(n.build && n.build.on); _surpToggle(n, on); const now = !!(n.build && n.build.on);
  if (n.player && !was && now) surpTake();
  if (n.player && was && !now && SURP.snap) SURP.pending = true;
};
LF2.tickers.push(() => { if (SURP.pending) { SURP.pending = false; if (typeof yardScan === 'function' && yardOn()) yardScan(true); surpSettle(); } });
