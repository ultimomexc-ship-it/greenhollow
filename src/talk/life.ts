/* The life-event stream (docs/talk-engine.md, section 3c, 3d). Game code reports what really happens with `LIFE.emit(kind, who, data)`: structured data, never words.
   Every event does three jobs: it goes into the person's memory and a short day log, it is counted for the digest, and talk can read it.
   Kinds are defined in talk/kinds.ts; an unregistered kind, or missing data, is refused (it throws in tests, `LIFE.strict`; it warns once otherwise). */

const LIFE: any = { strict: !!(typeof window !== 'undefined' && (window as any).GH_LIFE_STRICT), stream: [] as any[], n: 0, warned: {} as any, listeners: [] as any[] };

LIFE.refuse = function (msg: string) { if (LIFE.strict) throw new Error(msg); const k = msg.slice(0, 60); if (!LIFE.warned[k]) { LIFE.warned[k] = 1; console.warn(msg); } return null; };
/** record something that happened: who did it (a person or null), and what */
LIFE.emit = function (kind: string, who: any, data?: any): any {
  const def = REG.get('event', kind); if (!def) return LIFE.refuse('LIFE.emit: unregistered event kind "' + kind + '" (define it in talk/kinds.ts)');
  data = data || {}; const miss = (def.needs || []).filter((k: string) => data[k] == null); if (miss.length) return LIFE.refuse('LIFE.emit(' + kind + '): missing ' + miss.join(', '));
  const rec: any = { id: ++LIFE.n, kind, fam: def.family, who: who ? who.id : null, t: game.time, place: data.place || (who ? placeOf(who) : ''), data };
  LIFE.stream.push(rec); if (LIFE.stream.length > 600) LIFE.stream.shift();
  const day = Math.floor(game.time / 1440), st = (town.lifeStats || (town.lifeStats = {})); const d = st[day] || (st[day] = {}); d[kind] = (d[kind] || 0) + 1;
  for (const k of Object.keys(st)) if (+k < day - 14) delete st[k];
  if (who && !who.dead) { const log = who.day || (who.day = []); log.push({ id: rec.id, kind, t: rec.t, data }); while (log.length > 60) log.shift(); TM.add(who, { kind: 'life', lk: kind, imp: def.tell, data, ev: null }); }
  for (const f of LIFE.listeners) { try { f(rec); } catch (e) { console.warn('life listener', e); } }
  return rec;
};
/** the old world events (`lfEmit`) come through the same stream: counted, logged for the actor, checked against the registry */
LIFE.fromLegacy = function (ev: any) {
  const def = REG.get('event', ev.kind); if (!def) return LIFE.refuse('lfEmit: unregistered event kind "' + ev.kind + '" (define it in talk/kinds.ts)');
  const who = ev.actor != null ? lf2By(ev.actor) : null, rec: any = { id: ++LIFE.n, kind: ev.kind, fam: def.family, who: ev.actor, t: ev.t, place: ev.place || '', data: { ev: ev.id, target: ev.target }, legacy: true };
  LIFE.stream.push(rec); if (LIFE.stream.length > 600) LIFE.stream.shift();
  const day = Math.floor(game.time / 1440), st = (town.lifeStats || (town.lifeStats = {})); const d = st[day] || (st[day] = {}); d[ev.kind] = (d[ev.kind] || 0) + 1;
  if (who && !who.dead) { const log = who.day || (who.day = []); log.push({ id: rec.id, kind: ev.kind, t: rec.t, data: rec.data }); while (log.length > 60) log.shift(); }
  return rec;
};
/** what somebody has done today (their day log), newest last */
LIFE.today = function (n: any): any[] { const t0 = Math.floor(game.time / 1440) * 1440; return (n.day || []).filter((e: any) => e.t >= t0); };
/** counts by kind and by family over the last `days` days, for the digest and for tuning */
LIFE.digest = function (days?: number) {
  const st = town.lifeStats || {}, today = Math.floor(game.time / 1440), kinds: any = {}, fams: any = {};
  for (const k of Object.keys(st)) if (+k > today - (days || 7)) for (const e of Object.keys(st[k])) { kinds[e] = (kinds[e] || 0) + st[k][e]; const f = (REG.get('event', e) || {}).family || '?'; fams[f] = (fams[f] || 0) + st[k][e]; }
  return { kinds, fams };
};

/* ---- ADAPTERS: the only place the contract reads the game's own plan steps. The step system calls `lifeStep` when a villager begins a step; this reports what it means.
   As each game system gets its own `LIFE.emit` call at the source (trade, farming ...), the matching case here goes away. ---- */
function lifeStep(n: any, s: any) {
  if (n.player || n.dead || n.infant) return;
  if (s.act === 'sleep') { const bed = !!(n.bed && n.bed.owner === n); LIFE.emit(bed ? 'slept' : 'slept_rough', n, { where: bed ? 'bed' : 'rough' }); }
  else if (s.priv) { const t = String(s.text || ''); LIFE.emit(/behind a tree/i.test(t) ? 'no_privy' : /hopping/i.test(t) ? 'bladder_emergency' : 'used_privy', n, {}); }
  else if (s.act === 'eat') LIFE.emit('ate', n, {});
}
