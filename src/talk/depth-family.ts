/* A warning, advice, a proud parent, where I came from (docs/talk-engine.md, act catalogue): what people say to look after each other. The same for everybody. */

const REP_THIRD: any = {
  vandal: 'knock things down',
  meddler: 'move things that are not theirs',
  thief: 'take what is not theirs',
  gossip: 'cannot keep a secret',
  bully: 'throw their weight about'
};
ACTS.warn = {
  kind: 'world',
  stage: 'topic',
  preview: (c: any) => ({ about: c.warnOf ? c.warnOf.first : '', reason: c.warnTag ? REP_THIRD[c.warnTag] : '' }),
  w: (c: any, sp: any) => 1.3,
  when: (c: any, sp: any, li: any) => {
    if (c.done.warn || (sp.aff[li.id] || 0) < 5) return false;
    for (const Z of npcs) {
      if (Z === sp || Z === li || Z.dead || Z.infant) continue;
      const w = repWord(sp, Z);
      if (w && REP_THIRD[w] && !repTags(li, Z)[w] && !(li.tmem || []).some((m: any) => m.kind === 'rumour' && m.about === Z.id && m.tag === w)) {
        /* a warning is given once: the listener remembers it */ c.warnOf = Z;
        c.warnTag = w;
        return true;
      }
    }
    return false;
  },
  apply: (c: any, sp: any, li: any) => {
    c.done.warn = 1;
    c.aboutName = c.warnOf.first;
    c.reason = REP_THIRD[c.warnTag];
    const Z = c.warnOf;
    TM.add(li, { kind: 'rumour', about: Z.id, tag: c.warnTag, from: sp.id, conf: 0.6, imp: 0.4 });
    lfAff(li, Z, -3, 'was warned about them');
  },
  replies: ['warn_thanks']
};
ACTS.warn_thanks = {
  kind: 'world',
  stage: 'topic',
  reply: true,
  when: () => true,
  w: () => 1,
  apply: (c: any, sp: any, li: any) => {
    lfAff(sp, li, 1, 'looked out for me');
  },
  replies: []
};
ACTS.ask_advice = {
  kind: 'person',
  stage: 'topic',
  preview: () => ({}),
  w: () => 1.1,
  when: (c: any, sp: any, li: any) => {
    if (c.done.ask_advice || !(sp.hunger > 55)) return false;
    return WORLD.has('feature', 'bakery') || WORLD.has('feature', 'tavern');
  },
  apply: (c: any) => {
    c.done.ask_advice = 1;
  },
  replies: ['give_advice']
};
ACTS.give_advice = { kind: 'person', stage: 'topic', reply: true, when: () => true, w: () => 1, apply: () => {}, replies: [] };
ACTS.brag_child = {
  kind: 'person',
  stage: 'topic',
  preview: (c: any) => ({ about: c.kid ? c.kid.first : '', qty: c.kid ? Math.floor(c.kid.age) : '' }),
  w: () => 0.9,
  when: (c: any, sp: any, li: any) => {
    if (c.done.brag_child) return false;
    const k = (sp.fam.kids || []).map(byId).filter((q: any) => q && !q.dead && q.age < 14)[0];
    if (!k) return false;
    c.kid = k;
    return true;
  },
  apply: (c: any) => {
    c.done.brag_child = 1;
    c.aboutName = c.kid.first;
    c.lifeQty = Math.floor(c.kid.age);
  },
  replies: ['congratulate']
};
ACTS.congratulate = {
  kind: 'person',
  stage: 'topic',
  reply: true,
  when: () => true,
  w: () => 1,
  apply: (c: any, sp: any, li: any) => {
    lfAff(sp, li, 0.5, 'was glad for me');
  },
  replies: []
};
ACTS.tell_back = {
  kind: 'person',
  stage: 'topic',
  preview: (c: any, sp: any) => ({ about: sp.back || '' }),
  w: () => 0.9,
  when: (c: any, sp: any) => !c.done.tell_back && !!sp.back,
  apply: (c: any, sp: any) => {
    c.done.tell_back = 1;
    c.aboutName = sp.back;
  },
  replies: ['tell_back_reply']
};
ACTS.tell_back_reply = { kind: 'person', stage: 'topic', reply: true, when: () => true, w: () => 1, apply: () => {}, replies: [] };
