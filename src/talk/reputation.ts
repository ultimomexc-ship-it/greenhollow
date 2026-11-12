/* Reputation, suspicion and blame (docs/talk-engine.md, 3b.3). What people say about somebody is made of what each of them knows (`repTags`: from their own memories of events whose believed doer is that person),
   and the village's word is the sum (`repVillage`). A deed nobody saw is not nameless for long: each person who learns it guesses who (`repSuspect`: a grudge, a stranger, somebody who has done such things,
   now and then the real doer) or has no idea, so an innocent can be blamed for what somebody else did, the blame travels as news, and sticks to their name until it is cleared (they deny, the guilty confess, or somebody
   else is blamed in their place: `deed_blame`). Same for everybody; the player is just another suspect. */

const REP_KIND: any = {
  wall_removed: 'vandal',
  home_destroyed: 'vandal',
  building_down: 'vandal',
  bed_moved: 'meddler',
  caught_on_privy: 'meddler',
  theft: 'thief',
  pickpocket: 'thief',
  robbed: 'thief',
  breakin: 'thief',
  cheat: 'thief',
  gift: 'kind',
  help: 'kind',
  charity: 'kind',
  betrayal: 'gossip',
  shove: 'bully',
  brawl: 'bully'
};
const REP_BAD = ['vandal', 'meddler', 'thief', 'gossip', 'bully'];
/** what `obs` believes about `subj`: tag -> weight (sum of confidences of what they believe subj did) */
/** what each person has been told or has seen of everybody else, kept for an hour of game time per observer (dropped when they get a memory, or when a memory's standing changes: `repDirty`) */
function repDirty() {
  for (const n of npcs) n._repC = null;
}
function repTags(obs: any, subj: any): any {
  const cache = obs._repC && obs._repC.t > game.time - 60 ? obs._repC : (obs._repC = { t: game.time, m: {} });
  if (cache.m[subj.id]) return cache.m[subj.id];
  const out: any = (cache.m[subj.id] = {});
  if (!obs.tmem) return out;
  for (const m of obs.tmem) {
    if (m.ev == null || m.kind === 'did' || m.forgiven || m.cleared) continue;
    const ev = lf2EvById(m.ev);
    if (!ev) continue;
    const tag = REP_KIND[ev.kind];
    if (!tag) continue;
    const who = m.ver && m.ver.who !== undefined ? m.ver.who : ev.actor;
    if (who !== subj.id) continue;
    out[tag] = (out[tag] || 0) + (m.conf || 0.5);
  }
  return out;
}
/** the village's word: tag -> number of people who hold it (at least a fair belief) */
function repVillage(subj: any): any {
  const out: any = {};
  for (const o of npcs) {
    if (o.dead || o === subj || o.infant) continue;
    const t = repTags(o, subj);
    for (const k of Object.keys(t)) if (t[k] >= 0.45) out[k] = (out[k] || 0) + 1;
  }
  return out;
}
/** how sp sees li, one word, or undefined: the worst thing they believe, else 'kind' if they have seen it twice */
function repWord(sp: any, li: any): string | undefined {
  const t = repTags(sp, li),
    bad = REP_BAD.filter(k => t[k] >= 0.6).sort((a, b) => t[b] - t[a])[0];
  if (bad) return bad;
  if (t.kind >= 1.5) return 'kind';
  return undefined;
}
/** w guesses who did a deed nobody saw (or has no idea): { id, conf } or null */
function repSuspect(w: any, ev: any): any {
  const tag = REP_KIND[ev.kind],
    cands = npcs.filter((c: any) => !c.dead && !c.infant && c.age >= 12 && c !== w && c.id !== ev.target);
  if (!cands.length) return null;
  const ws = cands.map(
    (c: any) =>
      0.25 +
      Math.max(0, -(w.aff[c.id] || 0)) / 40 +
      ((w.know[c.id] || 0) < 8 ? 0.4 : 0) +
      (tag ? (repTags(w, c)[tag] || 0) * 0.9 : 0) +
      (c.id === ev.actor ? 0.5 : 0)
  );
  const none = 1.3,
    total = ws.reduce((a: number, b: number) => a + b, 0) + none;
  let r = Math.random() * total;
  for (let i = 0; i < cands.length; i++) {
    r -= ws[i];
    if (r < 0) return { id: cands[i].id, conf: Math.min(0.75, 0.5 + 0.25 * Math.min(1, (ws[i] / total) * 3)) };
  }
  return null;
}
const REP_WORDS: any = {
  vandal: 'knock things down',
  meddler: 'move things that are not yours',
  thief: 'take what is not yours',
  gossip: 'cannot keep a secret',
  bully: 'throw your weight about',
  kind: 'are good to people'
}; // (said to the person: "people say you ...")

/* telling somebody what is said about them */
ACTS.tell_rep = {
  kind: 'person',
  stage: 'topic',
  preview: (c: any) => ({ about: c.repTag ? REP_WORDS[c.repTag] : '', qty: c.repN }),
  w: (c: any, sp: any, li: any) => 0.5 + Math.max(0, sp.aff[li.id] || 0) / 80,
  when: (c: any, sp: any, li: any) => {
    if (c.done.tell_rep || (sp.aff[li.id] || 0) < 10) return false;
    const already = (t: string) =>
      (sp.tmem || []).some((m: any) => m.kind === 'told_rep' && m.with === li.id && m.tag === t && game.time - m.t < 10 * 1440); // (what was told once is not told again for ten days)
    const v = repVillage(li),
      k = Object.keys(v)
        .filter(t => v[t] >= 2 && REP_BAD.includes(t) && !already(t))
        .sort((a, b) => v[b] - v[a])[0];
    if (!k) return false;
    c.repTag = k;
    c.repN = v[k];
    return true;
  },
  apply: (c: any, sp: any, li: any) => {
    c.done.tell_rep = 1;
    c.aboutName = REP_WORDS[c.repTag];
    c.lifeQty = c.repN;
    li.mood = Math.max(0, (li.mood == null ? 50 : li.mood) - 3);
    lfAff(li, sp, 1, 'was honest with me');
    TM.add(sp, { kind: 'told_rep', with: li.id, tag: c.repTag, imp: 0.1 });
  },
  replies: ['rep_own', 'rep_deny']
};
ACTS.rep_own = { kind: 'person', stage: 'topic', reply: true, when: () => true, w: () => 1, apply: () => {}, replies: [] };
ACTS.rep_deny = { kind: 'person', stage: 'topic', reply: true, when: () => true, w: () => 1, apply: () => {}, replies: [] };
