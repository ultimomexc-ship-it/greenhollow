/* The conversation: open -> topics -> pre-close -> farewell (docs/talk-engine.md, section 6), and the villager chooser (section 8).
   `talkRun(a, b)` plays one whole conversation as a list of turns { by, act }. Each act's `apply` runs, the words are looked up only when somebody can hear
   (`TALK.words` forces them, for tests), and the result is logged in `TALK.log`. */

TALK.log = [] as any[]; TALK.words = false; TALK.running = true;

/** how much a person has to say to this one: interest in the talk (their patience) */
function talkBudget(n: any, o: any): number {
  let b = (TALK.hyper ? 1.7 : 2.2) + (talkHas(n, 'sociable') ? 1.5 : 0) + (talkHas(n, 'gossipy') ? 0.6 : 0) - (talkHas(n, 'shy') ? 1 : 0) - (talkHas(n, 'grumpy') ? 0.6 : 0);
  b += Math.max(-1, Math.min(1.5, (n.aff[o.id] || 0) / 50)) + (100 - (n.social == null ? 50 : n.social)) / 60 + Math.random() * 1.2;
  if (n.hunger > 80) b -= 1; return Math.max(1, b);
}
/** the villager chooser: among the acts that fit this moment, a weighted pick (not the best one) */
/** what a conversation is *for*: the acts that come from a real reason (a grudge, a request, a crush, news, something owed). The first topic is one of these when there is one. */
const TALK_PURPOSE = ['raise_deed', 'ask_favour', 'chase_favour', 'confront_jealous', 'declare', 'ask_to_walk', 'propose', 'flirt', 'confide', 'story_preface', 'share_news', 'warn', 'apologise', 'send_gift', 'offer_gift', 'callback', 'report_day', 'ask_day'];
function talkChoose(c: any, sp: any, li: any, ids: string[]): string | null {
  const opts: [string, number][] = [], first = !c.turns.some((t: any) => ACTS[t.act] && ACTS[t.act].stage === 'topic' && !ACTS[t.act].reply);
  for (const id of ids) { const A = ACTS[id]; if (!A || !TALK.on[A.kind] || !A.when(c, sp, li)) continue; opts.push([id, Math.max(0.05, (A.w ? A.w(c, sp, li) : 1) * (0.8 + Math.random() * 0.4) * (first && !A.reply && TALK_PURPOSE.includes(id) ? 5 : 1))]); }
  if (!opts.length) return null; let r = Math.random() * opts.reduce((s, o) => s + o[1], 0); for (const [id, w] of opts) { r -= w; if (r <= 0) return id; } return opts[opts.length - 1][0];
}
const TALK_TOPICS = () => Object.keys(ACTS).filter(k => ACTS[k].stage === 'topic' && !ACTS[k].reply);

/** what a turn's words need, as it is at this moment (words are looked up later, so each turn keeps its own copy) */
const talkX = (c: any) => ({ state: c.state, how: c.newsHow, conf: c.newsConf, news: c.told && c.told.text, who: c.newsWho ? c.newsWho.first : 'them', line: c.lifeLine, qty: c.lifeQty, item: c.lifeItem, shop: c.lifeShop, price: c.priceUnit, pitem: c.priceName, about: c.aboutName, op: c.op, reason: c.reason, deed: c.deedText, evId: c.newsEvId, ver: c.told && c.told.ver });
/** one act said by sp to li: its effects happen now; the turn is kept */
function talkTurn(c: any, sp: any, li: any, id: string): any { const A = ACTS[id]; if (A.stage === 'topic' && !A.reply) { c.aboutName = c.lifeItem = c.reason = c.lifeQty = undefined; }   /* (each topic has its own subject) */ A.apply(c, sp, li); const t: any = { by: sp.id, act: id, x: talkX(c) }; if (A.stage === 'topic' && !A.reply && !c.player && c.last !== 'story_invite' && !(c.last && ACTS[c.last] && ACTS[c.last].replies.includes(id)) && typeof talkLinkOf === 'function') { const lk = talkLinkOf(c); if (lk) t.x.link = lk; } c.turns.push(t); c.last = id; return t; }
/** the words of a turn (a and b are the two people of the conversation, in any order) */
function talkWords(t: any, a: any, b: any): string { const s = t.by === a.id ? a : b, o = s === a ? b : a; const txt = lxSay(t.act === 'report_day' && t.x && t.x.line ? t.x.line : t.act, s, o, t.x || {}); return t.x && t.x.link && txt && typeof lxLink === 'function' ? lxLink(txt, t.x.link) : txt; }

function talkRun(a: any, b: any, listened?: boolean, short?: boolean): any {
  const c: any = { a, b, stage: 'open', done: {}, turns: [], short: !!short, left: short ? { [a.id]: 1.6, [b.id]: 1.6 } : (() => { const r = Math.random(), f = r < 0.25 ? 0.5 : r > 0.85 ? 1.5 : 1; return { [a.id]: talkBudget(a, b) * f, [b.id]: talkBudget(b, a) * f }; })(), last: null, t0: game.time };   // (some talks are two lines, some run on)   // (short: a word in passing, one topic)
  const say = (sp: any, li: any, id: string) => { talkTurn(c, sp, li, id); };
  let sp = a, li = b;
  /* opening */
  if (TALK.on.ritual) { say(sp, li, 'greet'); say(li, sp, 'greet_back'); }
  /* topics: the speaker raises one; the listener answers (or lets it pass); the turn then goes to whoever has more left */
  c.stage = 'topic';
  while (c.turns.length < 26 && c.left[sp.id] > 1 && c.left[li.id] > 0.5) {
    const id = talkChoose(c, sp, li, TALK_TOPICS()); if (!id) break;
    say(sp, li, id); c.left[sp.id] -= 1;
    if (!ACTS[id].replies.length && ACTS[id].kind !== 'ritual' && Math.random() < 0.35) { say(li, sp, 'backchannel'); c.left[li.id] -= 0.2; }   // (a nod to what was said)
    let cur = id, from = sp, to = li;   // (an answer, an answer to that, and so on: a story is four turns long)
    for (let d = 0; d < 4 && ACTS[cur].replies.length; d++) {
      const reply = talkChoose(c, to, from, ACTS[cur].replies); if (!reply || (d === 0 && reply === 'agree' && Math.random() < 0.3)) break;   // (a nod is optional; an answer is not)
      say(to, from, reply); c.left[to.id] -= 0.4; cur = reply; const t2 = from; from = to; to = t2;
    }
    if (c.left[li.id] > c.left[sp.id]) { const t = sp; sp = li; li = t; }   // whoever has more left to say goes on
  }
  /* pre-closing and farewell: said by whoever ran out first */
  c.stage = 'close';
  if (TALK.on.ritual) { const closer = c.left[a.id] <= c.left[b.id] ? a : b, other = closer === a ? b : a; say(closer, other, 'pre_close'); say(other, closer, 'farewell'); say(closer, other, 'farewell_back'); }
  /* what stays: both remember it, they know each other a little better, and the need for company is met */
  for (const [x, y] of [[a, b], [b, a]]) { TM.add(x, { kind: 'talked', with: y.id, imp: 0.2, n: c.turns.length, subj: c.lastSubj }); x.social = Math.min(100, (x.social == null ? 50 : x.social) + 5 + c.turns.length); lfAff(x, y, 1, 'chatted'); }
  talkFinish(c, a, b, listened);
  return c;
}

/** the words (only when somebody can hear), the log, the bubbles, and the hold on both people: shared by conversations and shop encounters */
function talkFinish(c: any, a: any, b: any, listened?: boolean) {
  const lines = listened || TALK.words ? c.turns.map((t: any) => { const s = t.by === a.id ? a : b, o = s === a ? b : a, text = talkWords(t, a, b); return text ? { who: s, text } : null; }).filter(Boolean) : null;
  TALK.log.push({ t: game.time, a: a.id, b: b.id, d: lfDist(a, b), acts: c.turns.slice(), lines: lines ? lines.map((l: any) => l.who.first + ': ' + l.text) : null }); if (TALK.log.length > 300) TALK.log.shift();
  if (lines && lines.length && game.player && a !== game.player && b !== game.player && (lfDist(game.player, a) <= TALK.earshot || lfDist(game.player, b) <= TALK.earshot)) {   // (you hear it: what is told in your hearing goes in your journal)
    for (const t of c.turns) if (t.act === 'share_news' && t.x && t.x.evId != null) { const ev = lf2Ev().find((q: any) => q.id === t.x.evId); if (ev && !TM.ofEv(game.player, ev.id) && ev.actor !== game.player.id) TM.addEv(game.player, ev, 'overheard', 0.6, t.by === a.id ? a : b, 1, t.x.ver ? { who: t.x.ver.who, sev: t.x.ver.sev } : undefined); }
  }
  if (!lines && game.player && typeof sndMurmur === 'function') sndMurmur(a);
  if (lines && lines.length) game.events.push({ time: game.time, a, b, place: placeOf(a), topic: 'talk', quiet: false, talk: true, lines });
  else { const hold = game.time + c.turns.length * (c.short ? 0.2 : 0.7); a.talkUntil = Math.max(a.talkUntil || 0, hold); b.talkUntil = Math.max(b.talkUntil || 0, hold); }
}
