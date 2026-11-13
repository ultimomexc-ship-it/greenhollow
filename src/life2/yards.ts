/* Yards: fenced property (the Hamlet, docs/minimum-game.md). A ring of fence blocks with at least one gate, closed, is a yard. Whoever's bed stands inside is its household;
   the fields inside are theirs to farm, the food they keep is the yard's store. Nothing is assigned in a menu: you fence, you put beds in, you push beds about.
   - `yardScan()` finds the yards from the fences as they stand (a flood from the edge of the map, 8-way like room sealing, so fences touching only at a corner leak);
     a yard keeps its record while it stays closed, and for a game day after it opens (`open`: the grace), so a fence can be moved without anybody losing their home.
   - `town.yardAt` maps a tile to its yard; `yardOfN(n)` is the yard somebody's bed stands in; `yardPeople(y)` its household.
   - `yardHousing()` gives the bedless a free bed in a yard (a family stays together, in a yard nobody else lives in) and keeps `homeRoom`/`homeless` in step. */

const YARD_MIN = 12, YARD_MAX = 400, YARD_GRACE = 1440;
const yardOn = () => !!(town && town.scenario === 'hamlet');
const yardFence = (p: any) => !!p && (p.kind === 'fence' || p.kind === 'gate');
const yardAtXY = (x: number, y: number): any => (yardOn() && town.yardAt && town.yardAt.get(y * W + x)) || null;
const yardHasBed = (n: any) => !!(n && n.bed && n.bed.x != null && town.propAt && town.propAt.get(n.bed.y * W + n.bed.x) === n.bed);
const yardOfN = (n: any): any => yardHasBed(n) ? yardAtXY(n.bed.x, n.bed.y) : null;
/** the yard somebody lives in, in a world that has yards (null everywhere else: the old home rules apply) */
const yardHome = (n: any): any => yardOn() ? yardOfN(n) : null;
const yardPeople = (y: any): any[] => npcs.filter((n: any) => !n.dead && yardOfN(n) === y);
const yardBeds = (y: any): any[] => (town.props || []).filter((p: any) => p.kind === 'bed' && town.yardAt.get(p.y * W + p.x) === y);
const yardFreeBeds = (y: any): any[] => yardBeds(y).filter((p: any) => !p.owner || p.owner.dead || p.owner.bed !== p);
const yardPlayer = (): any => (town.hamletPlayer != null && byId(town.hamletPlayer)) || game.player || null;
function yardName(y: any): string {
  if (!y) return 'nobody';
  const ppl = yardPeople(y), pl = yardPlayer(); if (pl && ppl.includes(pl)) return 'your yard';
  const ad = ppl.filter(n => n.age >= 16)[0] || ppl[0]; return ad ? (ad.shop ? `${ad.first}'s yard` : `the ${ad.surname} yard`) : 'an empty yard';
}
/** may this person work this plot? Villagers farm only the fields in their own yard; you farm your own yard and everything outside every yard */
function yardMine(n: any, c: any): boolean {
  if (!yardOn()) return true;
  const y = yardAtXY(c.x, c.y), pl = yardPlayer();
  if (n === pl || n.player) return !y || y === yardOfN(n) || !yardPeople(y).length;
  return !!y && y === yardOfN(n);
}

function yardScan(force?: boolean) {
  if (!yardOn()) return;
  if (!town.yards) town.yards = []; if (!town.yardAt) town.yardAt = new Map();
  const sig = (town.lfPV || 0) + ':' + (town.props || []).length;
  if (force || sig !== town.yardSig) {
    town.yardSig = sig;
    const N = W * H, m = new Uint8Array(N), stack = new Int32Array(N); let sp = 0;   // m: 0 unknown, 1 outside, 2 fence or gate, 3 gate, 4 inside (taken)
    let any = false; for (const p of town.props || []) if (yardFence(p)) { m[p.y * W + p.x] = p.kind === 'gate' ? 3 : 2; any = true; }
    const found: any[] = [];
    if (any) {
      const push = (k: number) => { if (!m[k]) { m[k] = 1; stack[sp++] = k; } };
      for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); } for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
      while (sp) { const k = stack[--sp], x = k % W, y = (k / W) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; push(ny * W + nx); } }
      // what the flood did not reach is fenced in: one yard for each piece
      for (const p of town.props) {
        if (!yardFence(p)) continue;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const sx = p.x + dx, sy = p.y + dy; if (sx < 0 || sy < 0 || sx >= W || sy >= H || m[sy * W + sx]) continue;
          const cells: number[] = [], fences = new Set<number>(), gates = new Set<number>(); sp = 0; m[sy * W + sx] = 4; stack[sp++] = sy * W + sx;
          while (sp) { const k = stack[--sp], x = k % W, y = (k / W) | 0; cells.push(k);
            for (let ey = -1; ey <= 1; ey++) for (let ex = -1; ex <= 1; ex++) { if (!ex && !ey) continue; const nx = x + ex, ny = y + ey; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const q = ny * W + nx, v = m[q];
              if (!v) { m[q] = 4; stack[sp++] = q; } else if (v === 2) fences.add(q); else if (v === 3) { fences.add(q); gates.add(q); } } }
          if (cells.length >= YARD_MIN && cells.length <= YARD_MAX && gates.size) found.push({ cells, fences: [...fences], gates: [...gates] });
        }
      }
    }
    // keep the records: a piece is the yard it overlaps most
    const old: any[] = town.yards, at: Map<number, any> = town.yardAt, taken = new Set<any>(), next: any[] = [];
    found.sort((a, b) => b.cells.length - a.cells.length);
    for (const f of found) {
      const cnt = new Map<any, number>(); for (const k of f.cells) { const o = at.get(k); if (o && !taken.has(o)) cnt.set(o, (cnt.get(o) || 0) + 1); }
      let best: any = null, bn = 0; for (const [o, c] of cnt) if (c > bn) { bn = c; best = o; }
      const y = best || { id: (town.yardSeq = (town.yardSeq || 0) + 1), store: {}, made: game.time };
      taken.add(y); y.cells = f.cells; y.fences = f.fences; y.gates = f.gates; y.open = null; next.push(y);
    }
    for (const o of old) if (!taken.has(o)) { if (o.open == null) o.open = game.time; next.push(o); }   // (opened: the claim stands for a day)
    town.yards = next;
  }
  // an open yard is gone after a day; what was in its store goes to whoever holds the ground now, or stays with its people
  const keep: any[] = []; let changed = false;
  for (const y of town.yards) { if (y.open != null && game.time - y.open >= YARD_GRACE) { changed = true; y.gone = true; continue; } keep.push(y); }
  const at2 = new Map<number, any>();
  for (const y of keep) if (y.open == null) for (const k of y.cells) at2.set(k, y);
  for (const y of keep) if (y.open != null) for (const k of y.cells) if (!at2.has(k) && !(town.propAt.get(k) && yardFence(town.propAt.get(k)))) at2.set(k, y);
  if (changed) for (const y of town.yards) if (y.gone) { const heir = y.cells.map((k: number) => at2.get(k)).find(Boolean), ppl = npcs.filter((n: any) => !n.dead && yardHasBed(n) && town.yardAt.get(n.bed.y * W + n.bed.x) === y), to = heir ? heir.store : ppl[0] ? ppl[0].inv : null; if (to) for (const g of Object.keys(y.store || {})) to[g] = (to[g] || 0) + y.store[g]; }
  town.yards = keep; town.yardAt = at2;
  for (const y of keep) y.household = yardPeople(y).map(n => n.id);
}

/** family: spouse, partner and children under sixteen go together */
function yardGroup(n: any): any[] {
  const out = new Set<any>([n]); let grew = true;
  while (grew) { grew = false; for (const o of npcs) { if (o.dead || out.has(o)) continue; for (const q of out) { if (q.fam.spouse === o.id || o.fam.spouse === q.id || (o.age < 16 && (o.fam.mother === q.id || o.fam.father === q.id)) || (q.age < 16 && (q.fam.mother === o.id || q.fam.father === o.id))) { out.add(o); grew = true; break; } } } }
  return [...out];
}
/** beds and people: everybody with a bed belongs where it stands; the bedless are given free beds in a yard (their family's, or one nobody lives in) */
function yardHousing() {
  if (!yardOn()) return; yardScan();
  const pl = yardPlayer();
  for (const p of town.props || []) if (p.kind === 'bed' && p.owner && (p.owner.dead || p.owner.bed !== p)) p.owner = null;
  const sync = (n: any) => { const has = yardHasBed(n); if (!has && !(n.bed && n.bed.x != null && grid[n.bed.y] && grid[n.bed.y][n.bed.x] === T.BED)) n.bed = { owner: null };
    if (has) { const ri = roomAt[n.bed.y][n.bed.x], r = ri >= 0 ? rooms[ri] : null; n.homeRoom = r && !r.dead && r.hut ? r : null; n.seat = null; }
    n.homeless = !(n.bed && n.bed.x != null); };
  for (const n of npcs) if (!n.dead) sync(n);
  const give = (n: any, b: any) => { b.owner = n; n.bed = b; sync(n); if (typeof abortPlan === 'function' && !n.player) abortPlan(n); };
  const done = new Set<any>();
  for (const n of npcs) {
    if (n.dead || done.has(n) || !n.homeless || n.infant) continue;
    const grp = yardGroup(n); grp.forEach(o => done.add(o));
    const need = grp.filter(o => o.homeless).sort((a, b) => a.age - b.age); if (!need.length) continue;
    if (grp.includes(pl)) { if (pl.homeless) { const b = (town.props || []).filter((p: any) => p.kind === 'bed' && !p.owner && !(yardAtXY(p.x, p.y) && yardPeople(yardAtXY(p.x, p.y)).length)).sort((a: any, c: any) => Math.hypot(a.x - pl.tx, a.y - pl.ty) - Math.hypot(c.x - pl.tx, c.y - pl.ty))[0]; if (b) give(pl, b); } }
    let y = grp.map(yardOfN).find(q => q && q.open == null) || null;
    if (!y) y = town.yards.filter((q: any) => q.open == null && !yardPeople(q).length && yardFreeBeds(q).length).sort((a: any, b: any) => (yardFreeBeds(b).length >= need.length ? 1 : 0) - (yardFreeBeds(a).length >= need.length ? 1 : 0) || a.id - b.id)[0] || null;
    if (!y) continue;
    const moved: any[] = [];
    for (const o of need) { if (o === pl) continue; const b = yardFreeBeds(y)[0]; if (!b) break; give(o, b); moved.push(o); }
    if (moved.length) { chron(`${moved.map(o => o.first).join(' and ')} moved into ${moved.length < grp.length && grp.some(o => !moved.includes(o) && yardOfN(o) === y) ? 'the family yard' : 'a yard of their own'}.`, 'life'); LIFE.emit('moved_in', moved.find(o => o.age >= 16) || moved[0], { qty: moved.length }); }
  }
  for (const y of town.yards) y.household = yardPeople(y).map(n => n.id);
}
LF2.hourly.push(() => { if (yardOn()) { yardScan(true); yardHousing(); } });

/** what the player should know before leaving build mode: beds outside every yard, yards standing open */
function yardWarnings(): string[] {
  if (!yardOn()) return []; yardScan(); const out: string[] = [], pl = yardPlayer();
  for (const n of npcs) { if (n.dead || n === pl || !yardHasBed(n) || yardOfN(n)) continue; out.push(`${n.first}'s bed is outside every yard. ${n.first} will pay no rent and has no fields.`); }
  for (const y of town.yards) if (y.open != null) { const ppl = npcs.filter((n: any) => !n.dead && yardOfN(n) === y); if (ppl.length) out.push(`The fence round ${yardName(y)} is open. Close it within a day, or ${ppl.map(n => n === pl ? 'you' : n.first).join(' and ')} will have no yard.`); }
  return out;
}
/** leaving build mode: true when a warning card was put up instead (Back to building / Leave anyway) */
function yardLeaveCheck(n: any): boolean {
  if (!yardOn()) return false; const w = yardWarnings(), key = w.join('|');
  if (!w.length) { town.yardAck = ''; return false; }
  if (key === town.yardAck) return false;
  town.decision = { kind: 'yardwarn', who: n.id, key, title: 'Before you go', text: w.slice(0, 5).join(' ') + (w.length > 5 ? ` And ${w.length - 5} more.` : ''), opts: [{ k: 'yes', label: 'Back to building' }, { k: 'no', label: 'Leave anyway' }] };
  return true;
}

/** in build mode every yard is tinted (amber while it stands open), and a yard's name stands over its gate */
function drawYards(c: any, now: number) {
  if (!yardOn() || !town.yards || !town.yards.length || cam.z < 0.6) return;
  const pl = game.player, build = !!(pl && typeof itBuildOn === 'function' && itBuildOn(pl)), v = gaView();
  for (const y of town.yards) {
    if (build) { c.fillStyle = y.open != null ? 'rgba(232,170,60,.16)' : yardPeople(y).length ? 'rgba(120,210,110,.2)' : 'rgba(150,190,235,.2)';
      for (const k of y.cells) { const x = k % W, yy = (k / W) | 0; if (x < v.x0 || x >= v.x1 || yy < v.y0 || yy >= v.y1 || town.yardAt.get(k) !== y) continue; c.fillRect(x * TS, yy * TS, TS, TS); } }
  }
}
/** where a yard's wooden sign hangs: the middle of the longest stretch of its south fence without a gate (cached until the ring changes) */
function yardSignSpot(y: any): any {
  const key = y.fences.length + ':' + y.gates.join(',') + ':' + y.cells.length; if (y._signKey === key) return y._sign; y._signKey = key; y._sign = null;
  const cells = new Set<number>(y.cells), south = y.fences.filter((k: number) => cells.has(k - W)); if (!south.length) return null;
  const rows = new Map<number, number[]>(); for (const k of south) { const yy = (k / W) | 0; if (!rows.has(yy)) rows.set(yy, []); rows.get(yy)!.push(k % W); }
  let best: any = null;
  for (const [yy, xs] of rows) { xs.sort((a, b) => a - b); let s0 = xs[0], prev = xs[0];
    for (let i = 1; i <= xs.length; i++) { const x = xs[i]; if (x === prev + 1) { prev = x; continue; } const len = prev - s0 + 1; if (!best || len > best.len || (len === best.len && yy > best.y)) best = { x: (s0 + prev) / 2, y: yy, len }; s0 = prev = x; } }
  return (y._sign = best);
}
/* the sign itself: a small board on the fence with the yard's name burnt into it, drawn with the fence row so people pass in front of it */
YSORT.push(function (c: any, now: number) {
  if (!yardOn() || !town.yards || !town.yards.length || cam.z < 0.9) return [];
  const v = gaView(), out: any[] = [];
  for (const y of town.yards) {
    if (y.open != null) continue; const sp = yardSignSpot(y); if (!sp || sp.x < v.x0 - 2 || sp.x > v.x1 + 2 || sp.y < v.y0 || sp.y > v.y1) continue;
    out.push({ k: sp.y + 0.06, f: () => {
      const t = yardName(y).replace(/^./, (ch: string) => ch.toUpperCase()); c.save(); c.font = `700 ${Math.round(TS * 0.3)}px Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const cx = sp.x * TS + TS / 2, cy = sp.y * TS + TS * 0.42, w = Math.min(Math.max(c.measureText(t).width + TS * 0.4, TS * 1.2), Math.max(TS * 1.2, sp.len * TS - TS * 0.2)), h = TS * 0.5;
      c.fillStyle = '#5a3a1e'; c.fillRect(cx - w / 2 + TS * 0.12, cy + h / 2 - 1, TS * 0.1, TS * 0.32); c.fillRect(cx + w / 2 - TS * 0.22, cy + h / 2 - 1, TS * 0.1, TS * 0.32);   // (two posts)
      c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(cx - w / 2 + 1.5, cy - h / 2 + 2, w, h);
      const gr = c.createLinearGradient(0, cy - h / 2, 0, cy + h / 2); gr.addColorStop(0, '#c99a62'); gr.addColorStop(1, '#a8773f'); c.fillStyle = gr; c.fillRect(cx - w / 2, cy - h / 2, w, h);
      c.strokeStyle = 'rgba(90,56,26,.45)'; c.lineWidth = 0.6; for (const f of [0.3, 0.68]) { c.beginPath(); c.moveTo(cx - w / 2 + 2, cy - h / 2 + h * f); c.lineTo(cx + w / 2 - 2, cy - h / 2 + h * f + 0.4); c.stroke(); }   // (the grain)
      c.strokeStyle = '#4a2e14'; c.lineWidth = 1; c.strokeRect(cx - w / 2 + 0.5, cy - h / 2 + 0.5, w - 1, h - 1);
      c.fillStyle = '#3c2410'; for (const sx of [-1, 1]) { c.beginPath(); c.arc(cx + sx * (w / 2 - 2.6), cy - h / 2 + 2.6, 0.9, 0, 6.3); c.fill(); }   // (nails)
      let fs = Math.round(TS * 0.3); while (fs > 6 && c.measureText(t).width > w - TS * 0.25) { fs--; c.font = `700 ${fs}px Georgia, serif`; }
      c.fillStyle = 'rgba(255,230,190,.35)'; c.fillText(t, cx, cy + 0.6); c.fillStyle = '#3a2210'; c.fillText(t, cx, cy); c.restore();
    } });
  }
  return out;
});
