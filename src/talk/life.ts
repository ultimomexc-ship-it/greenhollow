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
  if (who) { const w = (town.lifeWho || (town.lifeWho = {})), dw = w[day] || (w[day] = {}), a = dw[kind] || (dw[kind] = []); if (!a.includes(who.id)) a.push(who.id); for (const k of Object.keys(w)) if (+k < day - 14) delete w[k]; }
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

/* ---- watching conditions: the moments a body gets into trouble are reported once, when they begin (an adapter: it reads needs) ---- */
function lifeWatch() {
  if (!town) return;
  for (const n of npcs) {
    if (n.dead || n.player || n.infant || n.age < 6) continue; const c = n.lifeC || (n.lifeC = {});
    if (n.hunger >= 85 && !c.hungry) { c.hungry = true; LIFE.emit('went_hungry', n, {}); } else if (n.hunger < 60) c.hungry = false;
    if (n.starving > 5 && !c.starving) { c.starving = true; LIFE.emit('starving', n, {}); } else if (n.starving < 1) c.starving = false;
    if (n.energy != null && n.energy < 18 && !c.tired && n.pose !== 'sleep') { c.tired = true; LIFE.emit('tired', n, {}); } else if (n.energy > 50) c.tired = false;
  }
}
LF2.hourly.push(() => lifeWatch());

/* ---- what somebody has to tell about their day ---- */
const LIFE_TELL_HOURS = 18;
/** their last day, grouped by kind and thing (twelve plantings are one line), most tellable first; each carries what it is and how much */
LIFE.recent = function (n: any, listener?: any): any[] {
  const t0 = game.time - LIFE_TELL_HOURS * 60, groups: any = {};
  for (const e of n.day || []) {
    if (e.t < t0) continue; const def = REG.get('event', e.kind); if (!def || e.data && e.data.ev != null) continue; if (!LEX.some((l: any) => l.act === 'life:' + e.kind)) continue;
    const key = e.kind + '|' + (e.data.item || e.data.seed || e.data.where || ''), g = groups[key] || (groups[key] = { kind: e.kind, def, data: Object.assign({}, e.data, { qty: 0 }), ids: [], t: e.t, trouble: (def.tags || []).includes('misfortune') });
    g.data.qty += e.data.qty || 1; g.ids.push(e.id); g.t = Math.max(g.t, e.t);
  }
  const out = Object.keys(groups).map(k => groups[k]).filter(g => !(listener && (listener.heardLife || {})[n.id + ':' + g.ids[g.ids.length - 1]]));
  for (const g of out) g.score = g.def.tell * (g.trouble ? 1.6 : 1) * (0.6 + 0.4 * Math.exp(-(game.time - g.t) / 600)) * (0.8 + Math.random() * 0.4);
  return out.filter(g => g.score >= 0.16).sort((a, b) => b.score - a.score);   // (the unremarkable is not worth saying)
};
/** the troubles people have had lately, with how many and how many different people, for the town panel and for tuning */
LIFE.troubles = function (days?: number): any[] {
  const st = town.lifeStats || {}, who = town.lifeWho || {}, today = Math.floor(game.time / 1440), out: any[] = [];
  for (const kind of Object.keys(LIFE_TROUBLE)) { let n = 0; const ppl: any = {}; for (const k of Object.keys(st)) if (+k > today - (days || 7)) { n += st[k][kind] || 0; for (const id of (who[k] && who[k][kind]) || []) ppl[id] = 1; } if (n) out.push({ kind, n, people: Object.keys(ppl).length, label: LIFE_TROUBLE[kind] }); }
  return out.sort((a, b) => b.people - a.people || b.n - a.n);
};

/** the unit price somebody last paid or got for an item (from their own day log), or what they were told; null when they have no idea */
LIFE.lastPrice = function (n: any, item: string): number | null {
  const log = n.day || []; for (let i = log.length - 1; i >= 0; i--) { const e = log[i]; if ((e.kind === 'bought' || e.kind === 'sold') && e.data.item === item && e.data.price != null && e.data.qty) return Math.max(1, Math.round(e.data.price / e.data.qty)); }
  const mem = n.tmem || []; for (let i = mem.length - 1; i >= 0; i--) if (mem[i].kind === 'price' && mem[i].item === item) return mem[i].unit; return null;
};
