/* The small acts of an ordinary talk (docs/talk-engine.md, act catalogue): a joke and the laugh or groan it gets, a thought aloud and the answer to it. The same for everybody. */

/* ---- the small acts of an ordinary talk ---- */
ACTS.joke = {
  kind: 'small',
  stage: 'topic',
  preview: () => ({}),
  w: (c: any, sp: any) => 0.25 + (talkHas(sp, 'jovial') || talkHas(sp, 'cheerful') ? 1.2 : 0),
  when: (c: any, sp: any) => !c.done.joke && (sp.mood == null || sp.mood > 40),
  apply: (c: any) => {
    c.done.joke = 1;
  },
  replies: ['laugh', 'groan']
};
ACTS.laugh = {
  kind: 'small',
  stage: 'topic',
  reply: true,
  when: () => true,
  w: (c: any, sp: any) => 1 + (talkHas(sp, 'jovial') ? 1 : 0),
  apply: (c: any, sp: any, li: any) => {
    lfAff(sp, li, 0.5, 'made me laugh');
    sp.mood = Math.min(100, (sp.mood == null ? 50 : sp.mood) + 2);
  },
  replies: []
};
ACTS.groan = { kind: 'small', stage: 'topic', reply: true, when: () => true, w: () => 0.7, apply: () => {}, replies: [] };
ACTS.wonder = {
  kind: 'small',
  stage: 'topic',
  preview: () => ({}),
  w: () => 0.3,
  when: (c: any, sp: any) => !c.done.wonder,
  apply: (c: any) => {
    c.done.wonder = 1;
  },
  replies: ['wonder_reply']
};
ACTS.wonder_reply = { kind: 'small', stage: 'topic', reply: true, when: () => true, w: () => 1, apply: () => {}, replies: [] };
