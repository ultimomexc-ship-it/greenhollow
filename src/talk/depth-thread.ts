/* The thread of a talk (docs/talk-review.md, task B): the nod, sympathy and gladness at how somebody is, and the follow-up "why?" with its answer, so an answer can be asked about. */

/* ---- backchannel: a nod to what was said ---- */
ACTS.backchannel = { kind: 'small', stage: 'topic', reply: true, when: () => true, w: () => 1, apply: () => {}, replies: [] };
/* ---- responsive talk: a bad answer gets a reaction ---- */
ACTS.answer_how.replies = ['sympathise_how', 'share_gladness'];
ACTS.sympathise_how = {
  kind: 'feeling',
  stage: 'topic',
  reply: true,
  when: (c: any) => ['low', 'tired', 'hungry', 'bedless', 'behind'].includes(c.state),
  w: () => 3,
  apply: (c: any, sp: any, li: any) => {
    li.mood = Math.min(100, (li.mood == null ? 50 : li.mood) + 2);
    lfAff(li, sp, 1, 'asked after me');
  },
  replies: []
};
ACTS.share_gladness = {
  kind: 'feeling',
  stage: 'topic',
  reply: true,
  when: (c: any) => c.state === 'glad',
  w: () => 2,
  apply: () => {},
  replies: []
};
ACTS.glad_courtship = { kind: 'romance', stage: 'topic', reply: true, when: () => true, w: () => 1, apply: () => {}, replies: [] };

/* ---- the thread: one thing more about what was just said ---- */
/** why somebody is the way they are, from what has really happened to them ('' when nothing explains it) */
function stateWhy(n: any, state: string): string {
  const log = (n.day || []).filter((e: any) => game.time - e.t < 2880).map((e: any) => e.kind);
  const felt = (n.tmem || []).filter((m: any) => m.kind === 'felt' && game.time - m.t < 1440 * 5).map((m: any) => m.evk);
  if (felt.includes('home_destroyed')) return 'has not been the same since the house came down';
  if (felt.includes('caught_on_privy') || felt.includes('caught_bathing')) return 'is still not over being walked in on';
  if (felt.includes('furniture_removed') || felt.includes('bed_moved')) return 'had the bed taken from under them, more or less';
  if (n.ill) return 'has a fever';
  if (n.homeless || !n.bed || n.bed.x == null) return 'has no bed to go to';
  if (typeof yardOn === 'function' && yardOn() && !yardOfN(n)) return 'has a bed and no yard to put it in';
  if (log.includes('rent_unpaid')) return 'could not pay the rent this morning';
  if (log.includes('starving') || log.includes('went_hungry')) return 'has not had a proper meal in days';
  if (log.includes('could_not_afford')) return 'could not pay for what was needed';
  if (log.includes('slept_rough')) return 'slept on the ground last night';
  if (log.includes('no_privy')) return 'could not find a privy when it mattered';
  if (state === 'tired' && n.job) return 'has been at the ' + String(n.job).toLowerCase() + ' work since first light';
  return '';
}
ACTS.ask_why_state = {
  kind: 'person',
  stage: 'topic',
  reply: true,
  when: (c: any) => !!c.about && ['low', 'tired', 'hungry', 'bedless', 'behind'].includes(c.state),
  w: () => 1,
  apply: () => {},
  replies: ['explain_state', 'explain_unknown']
};
ACTS.explain_state = {
  kind: 'person',
  stage: 'topic',
  reply: true,
  when: (c: any) => !!c.about && !!stateWhy(c.about, c.state),
  w: () => 3,
  apply: (c: any) => {
    c.reason = stateWhy(c.about, c.state);
  },
  replies: []
};
ACTS.explain_unknown = {
  kind: 'person',
  stage: 'topic',
  reply: true,
  when: (c: any) => !!c.about && !stateWhy(c.about, c.state),
  w: () => 3,
  apply: () => {},
  replies: []
};
ACTS.ask_family.follow = ['ask_why_state'];
ACTS.ask_more_day = {
  kind: 'life',
  stage: 'topic',
  reply: true,
  when: (c: any, sp: any, li: any) => (c.done.report_day || 0) === 1 && LIFE.recent(li, sp).length > 0,
  w: () => 1,
  apply: () => {},
  replies: ['report_day']
};
ACTS.ask_day.follow = ['ask_more_day'];
ACTS.sympathise_how.when = (c: any) => ['low', 'tired', 'hungry', 'ill', 'bedless', 'behind'].includes(c.state);
{
  const w0 = ACTS.vent.when;
  ACTS.vent.when = (c: any, sp: any, li: any) =>
    w0(c, sp, li) || (!c.done.vent && talkState(sp) === 'ill' && ((sp.aff[li.id] || 0) > 8 || sp.player));
}
