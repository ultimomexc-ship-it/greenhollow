/* Acts: what is said, as data (docs/talk-engine.md, section 7). No words here and no wording choices: the lexicon turns an act into a line.
   An act: { kind (the switch group), stage ('open' | 'topic' | 'close'), when(c, sp, li), w(c, sp, li) (weight for the chooser), apply(c, sp, li), replies: [acts that can answer it] }.
   `c` is the conversation: { a, b, stage, done, turns, left, topic, last }. */

const talkHas = (n: any, t: string) => (n.traits || []).includes(t);
const ACTS: any = {
  /* ---- ritual: openings, pre-closings, farewells ---- */
  greet: { kind: 'ritual', stage: 'open', when: (c: any) => !c.done.greet, apply: (c: any) => { c.done.greet = 1; }, replies: ['greet_back'] },
  greet_back: { kind: 'ritual', stage: 'open', reply: true, when: () => true, apply: () => {}, replies: [] },
  pre_close: { kind: 'ritual', stage: 'close', when: (c: any) => !c.done.pre_close, apply: (c: any) => { c.done.pre_close = 1; }, replies: ['farewell'] },
  farewell: { kind: 'ritual', stage: 'close', reply: true, when: () => true, apply: () => {}, replies: ['farewell_back'] },
  farewell_back: { kind: 'ritual', stage: 'close', reply: true, when: () => true, apply: () => {}, replies: [] },
  /* ---- small talk: remarks that maintain the bond ---- */
  remark_time: { kind: 'small', stage: 'topic', when: (c: any) => !c.done.remark_time, w: () => 1.2, apply: (c: any) => { c.done.remark_time = 1; }, replies: ['agree'] },
  remark_place: { kind: 'small', stage: 'topic', when: (c: any, sp: any) => !c.done.remark_place && !!placeOf(sp), w: () => 1, apply: (c: any) => { c.done.remark_place = 1; }, replies: ['agree'] },
  remark_work: { kind: 'small', stage: 'topic', when: (c: any, sp: any) => !c.done.remark_work && !!sp.job, w: (c: any, sp: any) => 1.3 + (sp.pose === 'work' ? 0.5 : 0), apply: (c: any) => { c.done.remark_work = 1; }, replies: ['agree'] },
  remark_state: { kind: 'small', stage: 'topic', when: (c: any, sp: any) => !c.done.remark_state && !!talkState(sp), w: () => 1.4, apply: (c: any, sp: any) => { c.done.remark_state = 1; c.state = talkState(sp); }, replies: ['agree'] },
  ask_how: { kind: 'small', stage: 'topic', when: (c: any) => !c.done.ask_how, w: (c: any, sp: any, li: any) => 1 + Math.max(0, (sp.aff[li.id] || 0)) / 60, apply: (c: any) => { c.done.ask_how = 1; }, replies: ['answer_how'] },
  answer_how: { kind: 'small', stage: 'topic', reply: true, when: () => true, apply: (c: any, sp: any) => { c.state = talkState(sp) || 'fine'; }, replies: [] },
  /* ---- world: news and what people make of it ---- */
  ask_news: { kind: 'world', stage: 'topic', when: (c: any, sp: any, li: any) => !c.done.ask_news && !c.done.share_news && !TE.pick(sp, li, c), w: (c: any, sp: any) => 0.7 + (talkHas(sp, 'curious') || talkHas(sp, 'gossipy') ? 0.8 : 0), apply: (c: any) => { c.done.ask_news = 1; }, replies: ['share_news', 'no_news'] },
  no_news: { kind: 'world', stage: 'topic', reply: true, when: (c: any, sp: any, li: any) => !TE.pick(sp, li, c), apply: () => {}, replies: [] },
  share_news: { kind: 'world', stage: 'topic', when: (c: any, sp: any, li: any) => (c.done.share_news || 0) < 2 && !!(c.news = TE.pick(sp, li, c)), w: (c: any) => 1 + 4 * Math.min(1, c.news ? c.news.score : 0),
    apply: (c: any, sp: any, li: any) => {
      const pk = c.news; c.told = TE.tell(sp, li, pk, c); c.newsHow = pk.m.kind; c.newsConf = pk.m.conf > 0.7 ? 'high' : 'low'; c.newsWho = pk.ev.target != null ? lf2By(pk.ev.target) : null;
      c.done.share_news = (c.done.share_news || 0) + 1; (c.sharedEv || (c.sharedEv = [])).push(pk.ev.id); TE.overhear(c, sp, li, pk);
    }, replies: ['react_shock', 'react_amused', 'react_sympathy', 'react_doubt', 'react_delight', 'react_unmoved'] },
  react_shock: { kind: 'world', stage: 'topic', reply: true, when: (c: any) => !!c.told && c.told.react === 'shock', apply: () => {}, replies: [] },
  react_amused: { kind: 'world', stage: 'topic', reply: true, when: (c: any) => !!c.told && c.told.react === 'amused', apply: () => {}, replies: [] },
  react_sympathy: { kind: 'world', stage: 'topic', reply: true, when: (c: any) => !!c.told && c.told.react === 'sympathy', apply: () => {}, replies: [] },
  react_doubt: { kind: 'world', stage: 'topic', reply: true, when: (c: any) => !!c.told && c.told.react === 'doubt', apply: () => {}, replies: [] },
  react_delight: { kind: 'world', stage: 'topic', reply: true, when: (c: any) => !!c.told && c.told.react === 'delight', apply: () => {}, replies: [] },
  react_unmoved: { kind: 'world', stage: 'topic', reply: true, when: (c: any) => !!c.told && c.told.react === 'unmoved', apply: () => {}, replies: [] },
  agree: { kind: 'small', stage: 'topic', reply: true, when: () => true, apply: () => {}, replies: [] },
};
/** a short word for how somebody is, from their needs and mood (undefined when nothing stands out) */
function talkState(n: any): string | undefined {
  if (n.hunger > 70) return 'hungry'; if (n.energy != null && n.energy < 30) return 'tired'; if (n.mood != null && n.mood > 78) return 'glad'; if (n.mood != null && n.mood < 32) return 'low';
  return undefined;
}
