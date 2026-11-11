/* The memory store (docs/talk-engine.md, section 5). Phase 1 keeps what a villager did and with whom; the news, versions and reflection come in phase 2.
   A memory: { kind, t, with?, subject?, conf (0..1), imp (0..1), ... }. Each person keeps a bounded set (`n.tmem`). */

const TM = {
  max: 120,
  add(n: any, m: any) {
    const mem = n.tmem || (n.tmem = []), rec = Object.assign({ t: game.time, conf: 1, imp: 0.3 }, m); mem.push(rec);
    if (mem.length > TM.max) { let k = 0, best = 1e9; for (let i = 0; i < mem.length; i++) { const s = mem[i].imp * 1000 - (game.time - mem[i].t) / 60; if (s < best) { best = s; k = i; } } mem.splice(k, 1); }
    return rec;   // (the stored record, so a flag set on it sticks)
  },
  /** when did a last talk with b (minutes of game time), or -Infinity */
  lastTalk(a: any, b: any): number { const mem = a.tmem; if (!mem) return -Infinity; for (let i = mem.length - 1; i >= 0; i--) if (mem[i].kind === 'talked' && mem[i].with === b.id) return mem[i].t; return -Infinity; },
  count(a: any, kind: string) { return (a.tmem || []).filter((m: any) => m.kind === kind).length; },
  /** remember an event: how (saw | did | felt | told | overheard), how sure, from whom, and *my version* of it (who I think did it, how bad) */
  addEv(n: any, ev: any, how: string, conf: number, from?: any, hop?: number, ver?: any) {
    if (TM.ofEv(n, ev.id)) return null;
    // one path for news (docs/talk-review.md, task F): what somebody is told or overhears is also what the watch and the law know of it. The old ledger (`n.kn`, read by life2/law.ts)
    // is kept as a mirror of the memory; nothing else spreads it (the old word-of-mouth ticker is gone). Feelings are moved by the talk engine (`TE.tell`), not here.
    if ((how === 'told' || how === 'overheard') && ev.know && !(n.kn && n.kn[ev.id])) {
      const who = ver && ver.who != null ? ver.who : null;
      (n.kn || (n.kn = {}))[ev.id] = { t: game.time, from: from ? from.id : null, cert: conf, a: who != null, who: who != null ? who : undefined, hop: (hop || 0), imp: 0.5 };
      ev.know.push(n.id); if (from && ev.chain) ev.chain.push({ from: from.id, to: n.id, t: game.time });
    }
    return TM.add(n, { kind: how, ev: ev.id, evk: ev.kind, conf, imp: TE.importance(n, ev), from: from ? from.id : null, hop: hop || 0, ver: ver || { who: ev.actor, sev: ev.sev }, told: [] });
  },
  ofEv(n: any, evId: number): any { const mem = n.tmem; if (!mem) return null; for (let i = mem.length - 1; i >= 0; i--) if (mem[i].ev === evId) return mem[i]; return null; },
};
