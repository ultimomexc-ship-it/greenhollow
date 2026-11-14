/* Acts: what is said, as data (docs/talk-engine.md, section 7). No words here and no wording choices: the lexicon turns an act into a line.
   An act: { kind (the switch group), stage ('open' | 'topic' | 'close'), when(c, sp, li), w(c, sp, li) (weight for the chooser), apply(c, sp, li), replies: [acts that can answer it] }.
   `c` is the conversation: { a, b, stage, done, turns, left, topic, last }. */

const talkHas = (n: any, t: string) => (n.traits || []).includes(t);
const ACTS: any = {
  /* ---- ritual: openings, pre-closings, farewells ---- */
  greet: {
    kind: 'ritual',
    stage: 'open',
    when: (c: any) => !c.done.greet,
    apply: (c: any) => {
      c.done.greet = 1;
    },
    replies: ['greet_back']
  },
  greet_back: { kind: 'ritual', stage: 'open', reply: true, when: () => true, apply: () => {}, replies: [] },
  pre_close: {
    kind: 'ritual',
    stage: 'close',
    when: (c: any) => !c.done.pre_close,
    apply: (c: any) => {
      c.done.pre_close = 1;
    },
    replies: ['farewell']
  },
  farewell: { kind: 'ritual', stage: 'close', reply: true, when: () => true, apply: () => {}, replies: ['farewell_back'] },
  farewell_back: { kind: 'ritual', stage: 'close', reply: true, when: () => true, apply: () => {}, replies: [] },
  /* ---- small talk: remarks that maintain the bond ---- */
  remark_time: {
    kind: 'small',
    stage: 'topic',
    when: (c: any) => !c.done.remark_time,
    w: () => 0.4,
    apply: (c: any) => {
      c.done.remark_time = 1;
    },
    replies: ['agree']
  },
  remark_place: {
    kind: 'small',
    stage: 'topic',
    when: (c: any, sp: any) => !c.done.remark_place && !!placeOf(sp),
    w: () => 1,
    apply: (c: any) => {
      c.done.remark_place = 1;
    },
    replies: ['agree']
  },
  remark_work: {
    kind: 'small',
    stage: 'topic',
    when: (c: any, sp: any) => !c.done.remark_work && !!sp.job,
    w: (c: any, sp: any) => 1.3 + (sp.pose === 'work' ? 0.5 : 0),
    apply: (c: any) => {
      c.done.remark_work = 1;
    },
    replies: ['agree']
  },
  remark_state: {
    kind: 'small',
    stage: 'topic',
    when: (c: any, sp: any) => !c.done.remark_state && !!talkState(sp),
    w: () => 1.4,
    apply: (c: any, sp: any) => {
      c.done.remark_state = 1;
      c.state = talkState(sp);
    },
    replies: ['agree']
  },
  ask_how: {
    kind: 'small',
    stage: 'topic',
    when: (c: any) => !c.done.ask_how,
    w: (c: any, sp: any, li: any) => 1 + Math.max(0, sp.aff[li.id] || 0) / 60,
    apply: (c: any) => {
      c.done.ask_how = 1;
    },
    replies: ['answer_how']
  },
  answer_how: {
    kind: 'small',
    stage: 'topic',
    reply: true,
    when: () => true,
    apply: (c: any, sp: any) => {
      c.state = talkState(sp) || 'fine';
    },
    replies: []
  },
  /* ---- world: news and what people make of it ---- */
  ask_news: {
    kind: 'world',
    stage: 'topic',
    when: (c: any, sp: any, li: any) =>
      !c.done.ask_news &&
      !c.done.share_news &&
      !c.done.report_day &&
      !c.turns.some((t: any) => ACTS[t.act] && ACTS[t.act].stage === 'topic') &&
      !TE.pick(sp, li, c) &&
      (!!li.player || !!TE.pick(li, sp, c) || !!LIFE.recent(li, sp)[0]), // (asked first, and of somebody who looks as if they have something to tell: otherwise it only ever gets 'nothing')
    w: (c: any, sp: any) => 1.1 + (talkHas(sp, 'curious') || talkHas(sp, 'gossipy') ? 0.8 : 0),
    apply: (c: any) => {
      c.done.ask_news = 1;
    },
    replies: ['share_news', 'report_day', 'no_news']
  },
  no_news: { kind: 'world', stage: 'topic', reply: true, when: (c: any, sp: any, li: any) => !TE.pick(sp, li, c), apply: () => {}, replies: [] },
  share_news: {
    kind: 'world',
    stage: 'topic',
    preview: (c: any, sp: any, li: any) => ({
      news: TE.text(c.news.ev, c.news.m.ver, sp, li),
      how: c.news.m.kind,
      conf: c.news.m.conf > 0.7 ? 'high' : 'low'
    }),
    when: (c: any, sp: any, li: any) =>
      (c.done.share_news || 0) < 2 && (c.storyNews ? ((c.news = c.storyNews), true) : !!(c.news = TE.pick(sp, li, c))),
    w: (c: any) => 1 + 4 * Math.min(1, c.news ? c.news.score : 0),
    apply: (c: any, sp: any, li: any) => {
      const pk = c.news;
      c.storyNews = null;
      c.newsEvId = pk.ev.id;
      c.told = TE.tell(sp, li, pk, c);
      c.newsHow = pk.m.kind;
      c.newsConf = pk.m.conf > 0.7 ? 'high' : 'low';
      c.newsWho = pk.ev.target != null ? lf2By(pk.ev.target) : null;
      c.done.share_news = (c.done.share_news || 0) + 1;
      (c.sharedEv || (c.sharedEv = [])).push(pk.ev.id);
      TE.overhear(c, sp, li, pk);
    },
    replies: ['react_shock', 'react_amused', 'react_sympathy', 'react_doubt', 'react_delight', 'react_unmoved']
  },
  react_shock: { kind: 'world', stage: 'topic', reply: true, when: (c: any) => !!c.told && c.told.react === 'shock', apply: () => {}, replies: [] },
  react_amused: { kind: 'world', stage: 'topic', reply: true, when: (c: any) => !!c.told && c.told.react === 'amused', apply: () => {}, replies: [] },
  react_sympathy: {
    kind: 'world',
    stage: 'topic',
    reply: true,
    when: (c: any) => !!c.told && c.told.react === 'sympathy',
    apply: () => {},
    replies: []
  },
  react_doubt: { kind: 'world', stage: 'topic', reply: true, when: (c: any) => !!c.told && c.told.react === 'doubt', apply: () => {}, replies: [] },
  react_delight: {
    kind: 'world',
    stage: 'topic',
    reply: true,
    when: (c: any) => !!c.told && c.told.react === 'delight',
    apply: () => {},
    replies: []
  },
  react_unmoved: {
    kind: 'world',
    stage: 'topic',
    reply: true,
    when: (c: any) => !!c.told && c.told.react === 'unmoved',
    apply: () => {},
    replies: []
  },
  /* ---- life: the ordinary day, told from what really happened (talk/life.ts) ---- */
  ask_day: {
    kind: 'life',
    stage: 'topic',
    when: (c: any, sp: any, li: any) => !c.done.ask_day && !c.done.report_day && !LIFE.recent(sp, li).length && LIFE.recent(li, sp).length > 0,
    w: (c: any, sp: any) => 0.8 + (talkHas(sp, 'curious') || talkHas(sp, 'sociable') ? 0.6 : 0),
    apply: (c: any) => {
      c.done.ask_day = 1;
    },
    replies: ['report_day', 'nothing_much']
  },
  nothing_much: {
    kind: 'life',
    stage: 'topic',
    reply: true,
    when: (c: any, sp: any, li: any) => !LIFE.recent(sp, li).length,
    apply: () => {},
    replies: []
  },
  report_day: {
    kind: 'life',
    stage: 'topic',
    preview: (c: any) => {
      const g = c.life;
      const wo = g.data.with != null ? byId(g.data.with) : null;
      return {
        line: 'life:' + g.kind,
        qty: g.data.qty || 1,
        item: g.data.thing || (g.data.seed ? WORLD.name('seed', g.data.seed) : g.data.item ? WORLD.name('item', g.data.item) : ''),
        shop: g.data.place || '',
        about: wo ? wo.first : undefined
      };
    },
    when: (c: any, sp: any, li: any) => (c.done.report_day || 0) < 2 && !!(c.life = LIFE.recent(sp, li)[0]),
    w: (c: any) => 0.9 + 2 * Math.min(1, c.life ? c.life.score : 0),
    apply: (c: any, sp: any, li: any) => {
      const g = c.life;
      {
        const tk = g.kind + '|' + (g.data.item || g.data.seed || g.data.where || ''),
          tl = town.lifeTold || (town.lifeTold = {}),
          tt = tl[tk];
        tl[tk] = { n: (tt && game.time - tt.t < 720 ? tt.n : 0) + 1, t: game.time };
      }
      c.newsHow = ['harvested', 'baked', 'cooked', 'forged', 'woven', 'sawed', 'sold', 'got_bed', 'planted'].includes(g.kind) ? 'good' : 'neutral';
      c.lifeLine = 'life:' + g.kind;
      c.lifeShop = g.data.place || '';
      c.lifeQty = g.data.qty || 1;
      c.lifeTrouble = g.trouble;
      c.lifeItem = g.data.thing || (g.data.seed ? WORLD.name('seed', g.data.seed) : g.data.item ? WORLD.name('item', g.data.item) : '');
      {
        const wo = g.data.with != null ? byId(g.data.with) : null;
        c.aboutName = wo ? wo.first : undefined;
      }
      c.done.report_day = (c.done.report_day || 0) + 1;
      (li.heardLife || (li.heardLife = {}))[sp.id + ':' + g.ids[g.ids.length - 1]] = 1;
      TM.add(li, { kind: 'told_life', with: sp.id, lk: g.kind, data: g.data, conf: 0.9, imp: Math.min(0.6, g.def.tell) }); // (and now they know something about how the other one is doing)
    },
    replies: ['empathise', 'acknowledge']
  },
  acknowledge: { kind: 'life', stage: 'topic', reply: true, when: (c: any) => !c.lifeTrouble, apply: () => {}, replies: [] },
  empathise: {
    kind: 'life',
    stage: 'topic',
    reply: true,
    when: (c: any) => !!c.lifeTrouble,
    w: () => 3,
    apply: (c: any, sp: any, li: any) => {
      lfAff(sp, li, 1, 'listened to my troubles');
    },
    replies: []
  },
  agree: { kind: 'small', stage: 'topic', reply: true, when: () => true, apply: () => {}, replies: [] }
};
/** a short word for how somebody is, from their needs and mood (undefined when nothing stands out) */
function talkState(n: any): string | undefined {
  if (n.ill) return 'ill';
  if (n.hunger > 70) return 'hungry';
  if (typeof yardOn === 'function' && yardOn() && !n.player) {
    if (!yardHasBed(n) && !isPaullus(n)) return 'bedless';
    if (n.rentLast && !n.rentLast.ok && game.time - n.rentLast.t < 1440) return 'behind';
  }
  if (n.energy != null && n.energy < 30) return 'tired';
  if (n.mood != null && n.mood > 78) return 'glad';
  if (n.mood != null && n.mood < 32) return 'low';
  return undefined;
}
