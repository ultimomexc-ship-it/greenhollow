/* The player's turn (docs/talk-engine.md, section 8): walking into a villager opens a conversation run by the same engine as the villagers' own. The only difference is who chooses:
   the player picks from a short list of what they could say now (acts, said in their own voice by the lexicon); the villager answers and goes on by their own chooser (`talkChoose`).
   When the villager asks something, the options are the answers that fit. Every act has the same effects as it would between two villagers (what is told is remembered, opinions move). */

const PT: any = { s: null as any, fallbacks: 0 }; // fallbacks: how often an option showed its spoken line because it had no label of its own or shared one with another option

/** a word for how well they know each other, for the head of the talk box */
function closenessWord(o: any, p: any): string {
  const rel = o.rel && o.rel[p.id],
    a = o.aff[p.id] || 0,
    k = o.know[p.id] || 0;
  if (rel && ['spouse', 'partner', 'parent', 'child', 'sibling'].includes(rel)) return rel;
  if (a >= 40 && k >= 30) return 'friend';
  if (a <= -25) return 'not a friend';
  if (k > 25) return 'acquaintance';
  return k > 4 ? 'met before' : 'stranger';
}
/** The menu says what an option does, not the words (docs/talk-review.md, task E): "Ask about Livia", "Tell: Corvus lent Paullus a hand". The words are chosen when it is picked
    and shown as what you said. Each entry: [group, label]; groups order the menu (answers first, then asking, telling, giving, feeling, small talk). A missing entry falls back to the line itself. */
const PT_GROUPS = ['Answer', 'Ask', 'Tell', 'Give', 'Heart', 'Small talk'];
const PT_LABEL: any = {
  remark_time: ['Small talk', 'Remark on the hour'],
  remark_place: ['Small talk', 'Remark on the place'],
  remark_work: ['Small talk', 'Talk about work'],
  remark_state: ['Small talk', 'Say how you feel'],
  joke: ['Small talk', 'Make a joke'],
  wonder: ['Small talk', 'Wonder aloud'],
  callback: ['Small talk', 'Pick up where you left off'],
  ask_how: ['Ask', 'Ask how they are'],
  ask_news: ['Ask', 'Ask for news'],
  ask_day: ['Ask', 'Ask about their day'],
  ask_opinion: ['Ask', 'Ask what they think of {about}'],
  ask_family: ['Ask', 'Ask after {about}'],
  ask_work: ['Ask', 'Ask about their work'],
  ask_where: ['Ask', 'Ask where {about} is'],
  ask_advice: ['Ask', 'Ask for advice'],
  ask_price: ['Ask', 'Ask the price of {item}'],
  ask_preference: ['Ask', 'Ask what they like'],
  ask_favour: ['Ask', 'Ask a favour: {item}'],
  chase_favour: ['Ask', 'Remind them of their promise'],
  ask_why_state: ['Ask', 'Ask why'],
  ask_more_day: ['Ask', 'Ask to hear more'],
  share_news: ['Tell', 'Tell the news: {news}'],
  story_preface: ['Tell', 'Tell a story you heard'],
  report_day: ['Tell', 'Tell about your day'],
  gossip_person: ['Tell', 'Say what you think of {about}'],
  tell_rep: ['Tell', 'Tell what is said about {about}'],
  warn: ['Tell', 'Warn them about {about}'],
  brag_child: ['Tell', 'Talk about your child'],
  tell_back: ['Tell', 'Tell how you came here'],
  confide: ['Tell', 'Confide a secret'],
  hint_gift: ['Tell', 'Drop a hint about a gift'],
  raise_deed: ['Tell', 'Bring up what {about} did'],
  offer_gift: ['Give', 'Give a gift: {item}'],
  send_gift: ['Give', 'Ask them to take a gift to {about}'],
  praise: ['Heart', 'Praise them'],
  vent: ['Heart', 'Say what is weighing on you'],
  apologise: ['Heart', 'Apologise'],
  flirt: ['Heart', 'Flirt'],
  declare: ['Heart', 'Say what you feel for them'],
  ask_to_walk: ['Heart', 'Ask them to walk out with you'],
  propose: ['Heart', 'Propose marriage'],
  confront_jealous: ['Heart', 'Ask about {about}'],
  snap: ['Heart', 'Snap at them'],
  blurt: ['Tell', 'Tell what happened'],
  // answers
  odd_glad: ['Answer', 'Be glad for them'],
  odd_sorry: ['Answer', 'Feel for them'],
  odd_wonder: ['Answer', 'Say it is strange'],
  odd_explain: ['Answer', 'Offer an explanation'],
  answer_how: ['Answer', 'Say how you are'],
  share_gladness: ['Answer', 'Be glad with them'],
  sympathise_how: ['Answer', 'Sympathise'],
  no_news: ['Answer', 'Say there is no news'],
  nothing_much: ['Answer', 'Say not much happened'],
  react_shock: ['Answer', 'Be shocked'],
  react_amused: ['Answer', 'Laugh at it'],
  react_sympathy: ['Answer', 'Feel for them'],
  react_doubt: ['Answer', 'Doubt it'],
  react_delight: ['Answer', 'Be glad of it'],
  react_unmoved: ['Answer', 'Shrug'],
  empathise: ['Answer', 'Sympathise'],
  acknowledge: ['Answer', 'Nod'],
  agree: ['Answer', 'Agree'],
  give_opinion: ['Answer', 'Say what you think of {about}'],
  no_view: ['Answer', 'Say you have no view'],
  no_view_g: ['Answer', 'Say you have no view'],
  agree_opinion: ['Answer', 'Agree about {about}'],
  differ_opinion: ['Answer', 'Disagree about {about}'],
  answer_family: ['Answer', 'Say how {about} is'],
  answer_work: ['Answer', 'Say how the work goes'],
  deed_sorry: ['Answer', 'Say you are sorry'],
  deed_defend: ['Answer', 'Defend what you did'],
  deed_deny: ['Answer', 'Deny it'],
  deed_shrug: ['Answer', 'Shrug it off'],
  deed_blame: ['Answer', 'Blame {about}'],
  deed_forgive: ['Answer', 'Forgive them'],
  deed_cold: ['Answer', 'Stay cold'],
  deed_believe: ['Answer', 'Believe them'],
  deed_doubt: ['Answer', 'Doubt them'],
  gift_thanks: ['Answer', 'Thank them'],
  gift_delight: ['Answer', 'Be delighted'],
  gift_amends: ['Answer', 'Accept it as amends'],
  gift_refuse: ['Answer', 'Refuse the gift'],
  gift_loved: ['Answer', 'Say you love it'],
  gift_disliked: ['Answer', 'Say it is not to your taste'],
  tell_preference: ['Answer', 'Say what you like'],
  hint_noted: ['Answer', 'Take the hint'],
  deliver_yes: ['Answer', 'Agree to take it'],
  deliver_no: ['Answer', 'Decline to take it'],
  accept_apology: ['Answer', 'Accept the apology'],
  reject_apology: ['Answer', 'Reject the apology'],
  jealous_explain: ['Answer', 'Explain'],
  jealous_defiant: ['Answer', 'Stand by it'],
  jealous_deny: ['Answer', 'Deny it'],
  favour_give: ['Answer', 'Give it to them'],
  favour_promise: ['Answer', 'Promise to see to it'],
  favour_no: ['Answer', 'Say no'],
  favour_thanks: ['Answer', 'Thank them'],
  favour_hopeful: ['Answer', 'Say you will wait'],
  console: ['Answer', 'Comfort them'],
  shrug_off: ['Answer', 'Make light of it'],
  thank_praise: ['Answer', 'Thank them'],
  secret_keep: ['Answer', 'Promise to keep it'],
  secret_alarmed: ['Answer', 'Be alarmed'],
  flirt_back: ['Answer', 'Flirt back'],
  flirt_rebuff: ['Answer', 'Turn it aside'],
  declare_return: ['Answer', 'Say you feel the same'],
  declare_gentle: ['Answer', 'Let them down gently'],
  walk_yes: ['Answer', 'Say yes'],
  walk_later: ['Answer', 'Say not yet'],
  walk_no: ['Answer', 'Say no'],
  glad_courtship: ['Answer', 'Be glad'],
  propose_yes: ['Answer', 'Say yes'],
  propose_later: ['Answer', 'Ask for time'],
  propose_no: ['Answer', 'Say no'],
  rep_own: ['Answer', 'Own up to it'],
  rep_deny: ['Answer', 'Deny it'],
  story_invite: ['Answer', 'Ask to hear it'],
  callback_answer: ['Answer', 'Answer'],
  laugh: ['Answer', 'Laugh'],
  groan: ['Answer', 'Groan'],
  wonder_reply: ['Answer', 'Wonder with them'],
  tell_where: ['Answer', 'Say where {about} is'],
  dont_know_where: ['Answer', 'Say you do not know'],
  thanks_where: ['Answer', 'Thank them'],
  warn_thanks: ['Answer', 'Thank them for the warning'],
  give_advice: ['Answer', 'Give advice'],
  congratulate: ['Answer', 'Congratulate them'],
  tell_back_reply: ['Answer', 'Take it in'],
  explain_state: ['Answer', 'Explain why'],
  explain_unknown: ['Answer', 'Say you do not know why'],
  snap_back: ['Answer', 'Snap back'],
  let_it_go: ['Answer', 'Let it go'],
  tell_price: ['Answer', 'Tell the price'],
  react_price: ['Answer', 'Remark on the price']
};
/** the label of one option: what it does, with who or what it is about; '' when there is no entry or a name it needs is missing (the line itself is used then) */
function ptLabel(id: string, x: any): string {
  const L = PT_LABEL[id];
  if (!L) return '';
  let ok = true;
  const t = L[1].replace(/\{(\w+)\}/g, (_m: string, k: string) => {
    let v = k === 'about' ? x.about || x.aboutName || x.them : x[k];
    if (v == null || v === '') {
      ok = false;
      return '';
    }
    v = String(v);
    return v.length > 46 ? v.slice(0, 44).replace(/\s+\S*$/, '') + '…' : v;
  });
  return ok ? t : L[1].replace(/[:]?\s*(about |after |of |to |where )?\{\w+\}.*$/, '').trim();
}

function ptBegin(o: any, p: any): any {
  const c: any = {
    a: p,
    b: o,
    stage: 'open',
    done: {},
    turns: [],
    left: { [p.id]: 99, [o.id]: talkBudget(o, p) + 1.5 },
    last: null,
    t0: game.time,
    player: true
  };
  const S: any = (PT.s = { c, o, p, pending: null, opts: [], closing: false });
  talkS = { pt: S };
  talkTurn(c, p, o, 'greet');
  const back = talkTurn(c, o, p, 'greet_back');
  c.stage = 'topic';
  let say = talkWords(back, p, o);
  // something startling that happened to them comes out first (life2/surprise.ts); then a grievance against you, or something to ask of you: none of it waits to be asked
  for (const id of ['blurt', 'raise_deed', 'ask_favour']) {
    if (S.pending || !TALK.on[ACTS[id].kind]) continue;
    const bind = talkBind(c, o, p, id);
    if (!bind) continue;
    const t = talkTurn(c, o, p, id, bind);
    say += '\n' + talkWords(t, p, o);
    S.pending = ACTS[id].replies.slice();
    c.left[o.id] -= 1;
  }
  return ptMenu(S, say);
}
/** what the player could say now: the answers to what was just asked, or the topics they could raise; never more than five (six answers), always a way out.
    Each option keeps its binding (what the act would be about), so what the label says is what is said when it is picked. */
function ptOptions(S: any): any[] {
  const c = S.c,
    p = S.p,
    o = S.o,
    out: any[] = [];
  const seen = new Set<string>();
  const ids: string[] = S.pending ? S.pending.slice() : TALK_TOPICS();
  for (const id of ids) {
    const A = ACTS[id];
    if (!A || seen.has(id) || !TALK.on[A.kind]) continue;
    let bind: any = null;
    try {
      bind = talkBind(c, p, o, id);
    } catch (e) {
      bind = null;
    }
    if (!bind) continue;
    // the label is worked out on a view: a new topic starts with no subject of its own; an answer keeps the subject of what was asked
    const view = talkView(c, bind);
    if (A.stage === 'topic' && !A.reply) for (const k of ['aboutName', 'lifeItem', 'reason', 'lifeQty']) if (!(k in bind)) view[k] = undefined;
    const x = A.preview ? A.preview(view, p, o) : {};
    for (const k of Object.keys(view)) if (view[k] !== undefined) bind[k] = view[k]; // (what the preview settled on, e.g. whom to blame, is part of the option)
    const slots = Object.assign({}, talkX(view), x, { state: talkState(p) || 'fine', menu: true });
    const line = lxSay(x.line || id, p, o, slots);
    if (!line) continue; // (nothing sayable: not offered)
    seen.add(id);
    const what = ptLabel(id, slots),
      group = PT_LABEL[id] ? PT_LABEL[id][0] : A.reply ? 'Answer' : 'Tell';
    if (!what) PT.fallbacks++;
    out.push({ id, bind, label: what || line, line, group, kind: A.kind, w: Math.random() + (A.kind !== 'small' ? 0.6 : 0) });
  }
  out.sort((a, b) => b.w - a.w);
  const keep = out.slice(0, S.pending ? 6 : 5);
  if (!keep.some(q => q.kind === 'small') && out.some(q => q.kind === 'small')) keep[keep.length - 1] = out.find(q => q.kind === 'small');
  // two options that would read the same are told apart by their words; then the menu is put in order: asking, telling, giving, the heart, small talk
  for (const q of keep)
    if (keep.some(r => r !== q && r.label === q.label)) {
      q.label = q.line;
      PT.fallbacks++;
    }
  keep.sort((a, b) => PT_GROUPS.indexOf(a.group) - PT_GROUPS.indexOf(b.group));
  return keep;
}
function ptMenu(S: any, say: string): any {
  const c = S.c,
    o = S.o,
    p = S.p;
  if (S.closing) return { say, opts: [['bye', serviceLeave(p, o)]] };
  const polite = c.left[o.id] <= 0.5 && !S.pending; // (somebody who has just asked something waits for the answer)
  if (polite) {
    talkTurn(c, o, p, 'pre_close');
    say += '\n' + talkWords(c.turns[c.turns.length - 1], p, o);
    S.closing = true;
    S.pending = null;
    return { say, opts: [['bye', serviceLeave(p, o)]] };
  }
  S.opts = ptOptions(S);
  const opts: any[] = S.opts.map((q: any, i: number) => ['o' + i, q.label]);
  opts.push(['bye', S.pending ? 'Say nothing, and leave.' : 'Leave.']);
  return { say, opts };
}
const serviceLeave = (p: any, o: any) => lxSay('farewell', p, o, {}) || 'Goodbye.';
/** the player picks option `key`: their act is said, the villager answers (by their own chooser) and may bring something up */
function ptStep(key: string): any {
  const S = PT.s;
  if (!S) return { close: true };
  const c = S.c,
    o = S.o,
    p = S.p;
  if (key === 'bye') {
    if (!S.closing) {
      const t = talkTurn(c, p, o, 'pre_close'),
        f = talkTurn(c, o, p, 'farewell');
      S.closing = true;
      return { say: talkWords(f, p, o), opts: [['bye', serviceLeave(p, o)]] };
    }
    return { close: true };
  }
  const i = +String(key).slice(1),
    q = S.opts[i];
  if (!q) return { close: true };
  const mine = talkTurn(c, p, o, q.id, q.bind);
  S.pending = null;
  c.left[o.id] -= 0.6;
  const said: string[] = [];
  const you = talkWords(mine, p, o) || q.line; // (what you said, in words: shown above their answer)
  // the villager answers what was said
  const reps = ACTS[q.id].replies;
  let cont: string[] | null = null;
  if (reps && reps.length) {
    const rid = talkChoose(c, o, p, reps);
    if (rid) {
      const t = talkTurn(c, o, p, rid);
      said.push(talkWords(t, p, o));
      c.left[o.id] -= 0.3;
      if ((rid === 'story_invite' || rid === 'share_news') && ACTS[rid].replies.length) cont = ACTS[rid].replies.slice();
    }
  } // (a story carries on: the player tells it, or answers it)
  // and sometimes brings something up of their own, which the player then answers
  if (!cont && c.left[o.id] > 0.5 && (!said.length || (c.left[o.id] > 1.2 && Math.random() < 0.55))) {
    // (they always say something back)
    const tid = talkChoose(c, o, p, TALK_TOPICS());
    if (tid) {
      const t = talkTurn(c, o, p, tid);
      said.push(talkWords(t, p, o));
      c.left[o.id] -= 1;
      S.pending = ACTS[tid].replies && ACTS[tid].replies.length ? ACTS[tid].replies.slice() : null;
    }
  }
  if (!said.length && !cont) {
    const t = talkTurn(c, o, p, 'backchannel');
    said.push(talkWords(t, p, o));
  } // (never silence: at least a nod)
  if (cont) S.pending = cont;
  let r = ptMenu(S, said.filter(Boolean).join('\n') || '…');
  if (S.pending && !r.opts.some((x: any) => x[0] !== 'bye')) {
    S.pending = null;
    r = ptMenu(S, r.say);
  } // (nothing the player can answer with: back to the open menu)
  r.you = you;
  return r;
}
/** the conversation is over: both remember it, they know each other a little better, and it is in the log */
function ptEnd() {
  const S = PT.s;
  if (!S) return;
  PT.s = null;
  const c = S.c,
    o = S.o,
    p = S.p;
  if (talkS && talkS.pt) talkS = null;
  for (const [x, y] of [
    [o, p],
    [p, o]
  ]) {
    TM.add(x, { kind: 'talked', with: y.id, imp: 0.25, n: c.turns.length, subj: c.lastSubj });
    x.social = Math.min(100, (x.social == null ? 50 : x.social) + 6 + c.turns.length);
  }
  lfAff(o, p, 1, 'talked with me');
  lfAff(p, o, 1, 'talked with me');
  o.know[p.id] = Math.min(100, (o.know[p.id] || 0) + 3);
  p.know[o.id] = Math.min(100, (p.know[o.id] || 0) + 3);
  TALK.log.push({
    t: game.time,
    a: p.id,
    b: o.id,
    d: lfDist(p, o),
    acts: c.turns.slice(),
    lines: c.turns.map((t: any) => (t.by === p.id ? p : o).first + ': ' + talkWords(t, p, o)),
    player: true
  });
  if (TALK.log.length > 300) TALK.log.shift();
}
