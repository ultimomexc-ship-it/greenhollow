/* The memory store (docs/talk-engine.md, section 5). Phase 1 keeps what a villager did and with whom; the news, versions and reflection come in phase 2.
   A memory: { kind, t, with?, subject?, conf (0..1), imp (0..1), ... }. Each person keeps a bounded set (`n.tmem`). */

const TM = {
  max: 120,
  add(n: any, m: any) {
    const mem = n.tmem || (n.tmem = []); mem.push(Object.assign({ t: game.time, conf: 1, imp: 0.3 }, m));
    if (mem.length > TM.max) { let k = 0, best = 1e9; for (let i = 0; i < mem.length; i++) { const s = mem[i].imp * 1000 - (game.time - mem[i].t) / 60; if (s < best) { best = s; k = i; } } mem.splice(k, 1); }
    return m;
  },
  /** when did a last talk with b (minutes of game time), or -Infinity */
  lastTalk(a: any, b: any): number { const mem = a.tmem; if (!mem) return -Infinity; for (let i = mem.length - 1; i >= 0; i--) if (mem[i].kind === 'talked' && mem[i].with === b.id) return mem[i].t; return -Infinity; },
  count(a: any, kind: string) { return (a.tmem || []).filter((m: any) => m.kind === kind).length; },
};
