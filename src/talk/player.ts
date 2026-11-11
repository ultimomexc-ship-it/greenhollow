/* The player's turn (docs/talk-engine.md, section 8): walking into a villager opens a conversation run by the same engine as the villagers' own. The only difference is who chooses:
   the player picks from a short list of what they could say now (acts, said in their own voice by the lexicon); the villager answers and goes on by their own chooser (`talkChoose`).
   When the villager asks something, the options are the answers that fit. Every act has the same effects as it would between two villagers (what is told is remembered, opinions move). */

const PT: any = { s: null as any };

/** a word for how well they know each other, for the head of the talk box */
function closenessWord(o: any, p: any): string {
  const rel = o.rel && o.rel[p.id], a = o.aff[p.id] || 0, k = o.know[p.id] || 0;
  if (rel && ['spouse', 'partner', 'parent', 'child', 'sibling'].includes(rel)) return rel; if (a >= 40 && k >= 30) return 'friend'; if (a <= -25) return 'not a friend'; if (k > 25) return 'acquaintance'; return k > 4 ? 'met before' : 'stranger';
}
function ptBegin(o: any, p: any): any {
  const c: any = { a: p, b: o, stage: 'open', done: {}, turns: [], left: { [p.id]: 99, [o.id]: talkBudget(o, p) + 1.5 }, last: null, t0: game.time, player: true };
  const S: any = PT.s = { c, o, p, pending: null, opts: [], closing: false };
  talkS = { pt: S };
  talkTurn(c, p, o, 'greet'); const back = talkTurn(c, o, p, 'greet_back'); c.stage = 'topic';
  let say = talkWords(back, p, o);
  for (const id of ['raise_deed', 'ask_favour']) if (TALK.on[ACTS[id].kind] && !S.pending && ACTS[id].when(c, o, p)) { const t = talkTurn(c, o, p, id); say += '\n' + talkWords(t, p, o); S.pending = ACTS[id].replies.slice(); c.left[o.id] -= 1; }   // (somebody with a grievance against you does not wait to be asked)
  return ptMenu(S, say);
}
/** what the player could say now: the answers to what was just asked, or the topics they could raise; never more than five, always a way out */
function ptOptions(S: any): any[] {
  const c = S.c, p = S.p, o = S.o, out: any[] = []; const seen = new Set<string>();
  const ids: string[] = S.pending ? S.pending.slice() : TALK_TOPICS();
  for (const id of ids) {
    const A = ACTS[id]; if (!A || seen.has(id) || !TALK.on[A.kind]) continue; c.life = c.news = c.priceItem = undefined;
    let ok = false; try { ok = !!A.when(c, p, o); } catch (e) { ok = false; } if (!ok) continue;
    const snap = { life: c.life, news: c.news, priceItem: c.priceItem }, x = A.preview ? A.preview(c, p, o) : {};
    const label = lxSay(x.line || id, p, o, Object.assign({}, talkX(c), x, { state: talkState(p) || 'fine' }));   // (what the conversation has set, plus what the act says it needs) if (!label) continue;
    seen.add(id); out.push({ id, snap, label, kind: A.kind, w: Math.random() + (A.kind !== 'small' ? 0.6 : 0) });
  }
  out.sort((a, b) => b.w - a.w); const keep = out.slice(0, S.pending ? 6 : 5);
  if (!keep.some(q => q.kind === 'small') && out.some(q => q.kind === 'small')) keep[keep.length - 1] = out.find(q => q.kind === 'small');
  return keep;
}
function ptMenu(S: any, say: string): any {
  const c = S.c, o = S.o, p = S.p;
  if (S.closing) return { say, opts: [['bye', serviceLeave(p, o)]] };
  const polite = c.left[o.id] <= 0.5;
  if (polite) { talkTurn(c, o, p, 'pre_close'); say += '\n' + talkWords(c.turns[c.turns.length - 1], p, o); S.closing = true; S.pending = null; return { say, opts: [['bye', serviceLeave(p, o)]] }; }
  S.opts = ptOptions(S);
  const opts: any[] = S.opts.map((q: any, i: number) => ['o' + i, q.label]); opts.push(['bye', S.pending ? 'Say nothing, and leave.' : 'Leave.']);
  return { say, opts };
}
const serviceLeave = (p: any, o: any) => lxSay('farewell', p, o, {}) || 'Goodbye.';
/** the player picks option `key`: their act is said, the villager answers (by their own chooser) and may bring something up */
function ptStep(key: string): any {
  const S = PT.s; if (!S) return { close: true }; const c = S.c, o = S.o, p = S.p;
  if (key === 'bye') { if (!S.closing) { const t = talkTurn(c, p, o, 'pre_close'), f = talkTurn(c, o, p, 'farewell'); S.closing = true; return { say: talkWords(f, p, o), opts: [['bye', serviceLeave(p, o)]] }; } return { close: true }; }
  const i = +String(key).slice(1), q = S.opts[i]; if (!q) return { close: true };
  c.life = q.snap.life; c.news = q.snap.news; c.priceItem = q.snap.priceItem;
  talkTurn(c, p, o, q.id); S.pending = null; c.left[o.id] -= 0.6; const said: string[] = [];
  // the villager answers what was said
  const reps = ACTS[q.id].replies; let cont: string[] | null = null; if (reps && reps.length) { const rid = talkChoose(c, o, p, reps); if (rid) { const t = talkTurn(c, o, p, rid); said.push(talkWords(t, p, o)); c.left[o.id] -= 0.3; if ((rid === 'story_invite' || rid === 'share_news') && ACTS[rid].replies.length) cont = ACTS[rid].replies.slice(); } }   // (a story carries on: the player tells it, or answers it)
  // and sometimes brings something up of their own, which the player then answers
  if (!cont && c.left[o.id] > 0.5 && (!said.length || (c.left[o.id] > 1.2 && Math.random() < 0.55))) {   // (they always say something back)
    const tid = talkChoose(c, o, p, TALK_TOPICS()); if (tid) { const t = talkTurn(c, o, p, tid); said.push(talkWords(t, p, o)); c.left[o.id] -= 1; S.pending = ACTS[tid].replies && ACTS[tid].replies.length ? ACTS[tid].replies.slice() : null; }
  }
  if (!said.length && !cont) { const t = talkTurn(c, o, p, 'backchannel'); said.push(talkWords(t, p, o)); }   // (never silence: at least a nod)
  if (cont) S.pending = cont;
  const r = ptMenu(S, said.filter(Boolean).join('\n') || '…');
  if (S.pending && !r.opts.some((x: any) => x[0] !== 'bye')) { S.pending = null; const r2 = ptMenu(S, r.say); return r2; }   // (nothing the player can answer with: back to the open menu)
  return r;
}
/** the conversation is over: both remember it, they know each other a little better, and it is in the log */
function ptEnd() {
  const S = PT.s; if (!S) return; PT.s = null; const c = S.c, o = S.o, p = S.p; if (talkS && talkS.pt) talkS = null;
  for (const [x, y] of [[o, p], [p, o]]) { TM.add(x, { kind: 'talked', with: y.id, imp: 0.25, n: c.turns.length, subj: c.lastSubj }); x.social = Math.min(100, (x.social == null ? 50 : x.social) + 6 + c.turns.length); }
  lfAff(o, p, 1, 'talked with me'); lfAff(p, o, 1, 'talked with me'); o.know[p.id] = Math.min(100, (o.know[p.id] || 0) + 3); p.know[o.id] = Math.min(100, (p.know[o.id] || 0) + 3);
  TALK.log.push({ t: game.time, a: p.id, b: o.id, d: lfDist(p, o), acts: c.turns.slice(), lines: c.turns.map((t: any) => (t.by === p.id ? p : o).first + ': ' + talkWords(t, p, o)), player: true }); if (TALK.log.length > 300) TALK.log.shift();
}
