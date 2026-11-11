/* The world registry: what exists, so nobody talks about what does not (docs/talk-engine.md, section 4).
   Acts hold ids; wording resolves them here when it is spoken. A feature or item that is gone answers `has` with false, and every act or line that needs it falls silent. */

const WORLD = {
  has(kind: string, id: any): boolean {
    if (!town) return false;
    switch (kind) {
      case 'feature': if (id === 'tavern') return !!town.tavern; if (id === 'church' || id === 'chapel') return !!town.church;
        return rooms.some((r: any) => !r.dead && (r.kind === id || r.fn === id));
      case 'item': return typeof GOODS !== 'undefined' && !!GOODS[id];
      case 'place': return true;
      case 'person': { const p = personById(id); return !!p && !p.dead; }
      case 'job': return true;
    }
    return false;
  },
  /** the name of a thing in the current voice (the island says "the camp fire" for a tavern that was never built) */
  name(kind: string, id: any): string {
    switch (kind) {
      case 'feature': return placeWords('the ' + (id === 'church' ? 'chapel' : id));
      case 'item': return typeof GOODS !== 'undefined' && GOODS[id] ? String(GOODS[id].name).toLowerCase() : String(id);
      case 'person': { const p = personById(id); return p ? p.first : 'somebody'; }
      case 'place': return placeWords(String(id));
    }
    return String(id);
  },
  /** every requirement of a lexicon line, like 'feature:tavern', must be met */
  ok(reqs?: string[]): boolean { return !reqs || reqs.every(q => { const i = q.indexOf(':'); return WORLD.has(q.slice(0, i), q.slice(i + 1)); }); },
};
