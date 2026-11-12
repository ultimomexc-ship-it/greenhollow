/* The conversation: open -> topics -> pre-close -> farewell (docs/talk-engine.md, section 6), and the villager chooser (section 8).
   `talkRun(a, b)` plays one whole conversation as a list of turns { by, act }. Each act's `apply` runs, the words are looked up only when somebody can hear
   (`TALK.words` forces them, for tests), and the result is logged in `TALK.log`.

   Bindings: an act's `when` may work out what the act would be about (which person, which item, which piece of news) and write that on the conversation.
   `talkBind` runs it against a *view* of the conversation, so those writes stay with the candidate: asking whether something could be said never changes
   what is being said. The binding of the act that is chosen is put on the conversation when its turn is taken (`talkTurn`). */

TALK.log = [] as any[];
TALK.words = false;
TALK.running = true;

/** how much a person has to say to this one: interest in the talk (their patience) */
function talkBudget(n: any, o: any): number {
  let b =
    (TALK.hyper ? 1.7 : 2.2) +
    (talkHas(n, 'sociable') ? 1.5 : 0) +
    (talkHas(n, 'gossipy') ? 0.6 : 0) -
    (talkHas(n, 'shy') ? 1 : 0) -
    (talkHas(n, 'grumpy') ? 0.6 : 0);
  b += Math.max(-1, Math.min(1.5, (n.aff[o.id] || 0) / 50)) + (100 - (n.social == null ? 50 : n.social)) / 60 + Math.random() * 1.2;
  if (n.hunger > 80) b -= 1;
  return Math.max(1, b);
}

/** what a conversation is *for*: the acts that come from a real reason (a grudge, a request, a crush, news, something owed). The first topic is one of these when there is one. */
const TALK_PURPOSE = [
  'raise_deed',
  'ask_favour',
  'chase_favour',
  'confront_jealous',
  'declare',
  'ask_to_walk',
  'propose',
  'flirt',
  'confide',
  'story_preface',
  'share_news',
  'warn',
  'apologise',
  'send_gift',
  'offer_gift',
  'callback',
  'report_day',
  'ask_day',
  'ask_news',
  'snap'
];

/** could sp say this act to li now, and about what? Returns the binding (what `when` worked out), or null. The conversation itself is not touched. */
function talkBind(c: any, sp: any, li: any, id: string): any {
  const A = ACTS[id];
  if (!A) return null;
  if (A.minAge && sp.age != null && sp.age < A.minAge && !sp.player) return null; // children say only what children say (talk/ages.ts)
  const view = Object.create(c);
  if (!A.when(view, sp, li)) return null;
  const bind: any = {};
  for (const k of Object.keys(view)) bind[k] = view[k];
  return bind;
}
/** the conversation as it would be with a binding applied (for weights, previews and menu labels): reads fall through to the real one, writes stay here */
function talkView(c: any, bind: any): any {
  return Object.assign(Object.create(c), bind || {});
}

/** the villager chooser: among the acts that fit this moment, a weighted pick (not the best one). The binding of the pick waits in `c.bound` for its turn. */
function talkChoose(c: any, sp: any, li: any, ids: string[]): string | null {
  const first = !c.turns.some((t: any) => ACTS[t.act] && ACTS[t.act].stage === 'topic' && !ACTS[t.act].reply);
  const opts: { id: string; w: number; bind: any }[] = [];
  for (const id of ids) {
    const A = ACTS[id];
    if (!A || !TALK.on[A.kind]) continue;
    const bind = talkBind(c, sp, li, id);
    if (!bind || talkStale(c, sp, li, id, bind)) continue;
    const base = A.w ? A.w(talkView(c, bind), sp, li) : 1;
    const purpose = first && !A.reply && TALK_PURPOSE.includes(id) ? 5 : 1;
    opts.push({ id, bind, w: Math.max(0.05, base * (0.8 + Math.random() * 0.4) * purpose) });
  }
  if (!opts.length) return null;
  let r = Math.random() * opts.reduce((s, o) => s + o.w, 0),
    pick = opts[opts.length - 1];
  for (const o of opts) {
    r -= o.w;
    if (r <= 0) {
      pick = o;
      break;
    }
  }
  c.bound = { id: pick.id, bind: pick.bind };
  return pick.id;
}
const TALK_TOPICS = () => Object.keys(ACTS).filter(k => ACTS[k].stage === 'topic' && !ACTS[k].reply);

/** what a turn's words need, as it is at this moment (words are looked up later, so each turn keeps its own copy) */
const talkX = (c: any) => ({
  state: c.state,
  how: c.newsHow,
  conf: c.newsConf,
  news: c.told && c.told.text,
  who: c.newsWho ? c.newsWho.first : 'them',
  line: c.lifeLine,
  qty: c.lifeQty,
  item: c.lifeItem,
  shop: c.lifeShop,
  price: c.priceUnit,
  pitem: c.priceName,
  about: c.aboutName,
  op: c.op,
  reason: c.reason,
  deed: c.deedText,
  evId: c.newsEvId,
  ver: c.told && c.told.ver
});

/** one act said by sp to li: its binding goes on the conversation, its effects happen now, and the turn is kept */
function talkTurn(c: any, sp: any, li: any, id: string, bind?: any): any {
  const A = ACTS[id];
  const b = bind || (c.bound && c.bound.id === id ? c.bound.bind : null);
  c.bound = null;
  const topic = A.stage === 'topic' && !A.reply;
  if (topic) c.aboutName = c.lifeItem = c.reason = c.lifeQty = undefined; // each topic has its own subject
  if (b) Object.assign(c, b);
  A.apply(c, sp, li);
  const t: any = { by: sp.id, act: id, x: talkX(c) };
  const chained = c.last === 'story_invite' || (c.last && ACTS[c.last] && ACTS[c.last].replies.includes(id));
  if (topic && !c.player && !chained && typeof talkLinkOf === 'function') {
    const lk = talkLinkOf(c);
    if (lk) t.x.link = lk;
  }
  if (topic) talkNote(c, sp, li, id);
  c.turns.push(t);
  c.last = id;
  return t;
}

/* ---- shared ground: what one person has lately said to another is not said again, and a talk does not go over the same person twice ---- */
const TALK_AGAIN: any = { small: 720, person: 4320, feeling: 720, gift: 1440, world: 360, life: 240 }; // minutes before the same thing is raised with the same person again
const talkKey = (c: any, id: string) => id + '|' + (c.aboutName || (c.about && c.about.first) || c.lifeItem || '');
function talkNote(c: any, sp: any, li: any, id: string) {
  const all = sp.saidTo || (sp.saidTo = {}),
    mine = all[li.id] || (all[li.id] = {});
  mine[talkKey(c, id)] = game.time;
  const about = c.about && c.about.id != null ? c.about.id : null;
  if (about != null) (c.aboutSeen || (c.aboutSeen = [])).push(about);
  const keys = Object.keys(mine);
  if (keys.length > 60) for (const k of keys) if (game.time - mine[k] > 7200) delete mine[k];
}
/** has sp said this (act and subject) to li too lately, or has this talk already been about that person? */
function talkStale(c: any, sp: any, li: any, id: string, bind: any): boolean {
  const A = ACTS[id];
  if (!A || A.reply || A.stage !== 'topic') return false;
  const v = talkView(c, bind),
    about = v.about && v.about.id != null ? v.about.id : null;
  if (about != null && (c.aboutSeen || []).includes(about)) return true;
  const again = TALK_AGAIN[A.kind];
  if (!again) return false;
  const t = ((sp.saidTo || {})[li.id] || {})[id + '|' + ((v.about && v.about.first) || '')];
  return t != null && game.time - t < again;
}

/* ---- how much ceremony: people who live together, or spoke a moment ago, do not greet and part like strangers ---- */
function talkRitual(a: any, b: any): number {
  const gap = game.time - TM.lastTalk(a, b),
    house = !!a.homeRoom && a.homeRoom === b.homeRoom && !a.homeRoom.dead;
  if (gap < 180 || (house && gap < 720)) return 0;
  if (house || gap < 1440 || (a.aff[b.id] || 0) > 40) return 1;
  return 2;
}

/* ---- the agenda: what each of them came to say (from memory: something to tell, to ask, to settle, to give), best first, two at most ---- */
function talkAgenda(c: any, sp: any, li: any): any[] {
  const out: any[] = [];
  for (const id of TALK_PURPOSE) {
    const A = ACTS[id];
    if (!A || A.reply || !TALK.on[A.kind]) continue;
    const bind = talkBind(c, sp, li, id);
    if (!bind || talkStale(c, sp, li, id, bind)) continue;
    out.push({ id, w: (A.w ? A.w(talkView(c, bind), sp, li) : 1) * (0.8 + Math.random() * 0.4) });
  }
  return out
    .sort((x, y) => y.w - x.w)
    .slice(0, 2)
    .map(x => x.id);
}

/** the words of a turn (a and b are the two people of the conversation, in any order) */
function talkWords(t: any, a: any, b: any): string {
  const s = t.by === a.id ? a : b,
    o = s === a ? b : a;
  const act = t.act === 'report_day' && t.x && t.x.line ? t.x.line : t.act;
  const txt = lxSay(act, s, o, t.x || {});
  return t.x && t.x.link && txt && typeof lxLink === 'function' ? lxLink(txt, t.x.link) : txt;
}

/** one whole conversation between a and b. `short`: a word in passing.
    Shape: as much greeting as the two of them need (`talkRitual`), then what each came to say (`talkAgenda`), each thing answered and now and then followed up,
    then small talk while patience lasts, then as much goodbye as the greeting was. Two people with nothing to say who spoke lately say nothing. */
function talkRun(a: any, b: any, listened?: boolean, short?: boolean): any {
  const r = Math.random(),
    f = r < 0.25 ? 0.5 : r > 0.85 ? 1.5 : 1; // some talks are short, some run on
  const left = short ? { [a.id]: 1.6, [b.id]: 1.6 } : { [a.id]: talkBudget(a, b) * f, [b.id]: talkBudget(b, a) * f };
  const c: any = { a, b, stage: 'topic', done: {}, turns: [], short: !!short, left, last: null, t0: game.time };
  const ritual = TALK.on.ritual ? Math.min(talkRitual(a, b), short ? 1 : 2) : 0;
  const agenda: any = { [a.id]: talkAgenda(c, a, b), [b.id]: talkAgenda(c, b, a) };
  if (ritual === 0 && !agenda[a.id].length && !agenda[b.id].length) return c; // nothing to say, and they spoke not long ago
  const say = (sp: any, li: any, id: string, bind?: any) => talkTurn(c, sp, li, id, bind);

  /* opening */
  if (ritual >= 1) {
    c.stage = 'open';
    say(a, b, 'greet');
    say(b, a, 'greet_back');
    c.stage = 'topic';
  }

  /* topics */
  let sp = a,
    li = b,
    small = 0;
  const smallMax = ritual === 0 ? 0 : short ? 1 : 2;
  let said = 0;
  while (c.turns.length < 26 && (said === 0 || (c.left[sp.id] > 1 && c.left[li.id] > 0.5))) {
    // (whoever came with something to say gets to say it, however short the talk)
    // what the speaker came to say comes first; then the other one's; then small talk, a little
    let id: string | null = null,
      bind: any = null;
    while (agenda[sp.id].length && !id) {
      const want = agenda[sp.id].shift();
      bind = talkBind(c, sp, li, want);
      if (bind && !talkStale(c, sp, li, want, bind)) id = want;
    }
    if (!id && agenda[li.id].length) {
      const t = sp;
      sp = li;
      li = t;
      continue;
    }
    if (!id) {
      if (small >= smallMax) break;
      id = talkChoose(
        c,
        sp,
        li,
        TALK_TOPICS().filter(k => !TALK_PURPOSE.includes(k))
      );
      bind = null;
      if (!id) break;
      small++;
    }
    say(sp, li, id, bind || undefined);
    said++;
    c.left[sp.id] -= 1;
    if (!ACTS[id].replies.length && ACTS[id].kind !== 'ritual' && Math.random() < 0.35) {
      // a nod to what was said
      say(li, sp, 'backchannel');
      c.left[li.id] -= 0.2;
    }
    talkAnswers(c, sp, li, id);
    // the thread: now and then the one who raised it asks one thing more
    const follow = ACTS[id].follow;
    if (follow && Math.random() < 0.6) {
      const fid = talkChoose(c, sp, li, follow);
      if (fid) {
        say(sp, li, fid);
        talkAnswers(c, sp, li, fid);
      }
    }
    if (c.left[li.id] > c.left[sp.id] || agenda[li.id].length) {
      const t = sp;
      sp = li;
      li = t;
    } // the other one's turn, if they have more to say
  }
  if (!c.turns.some((t: any) => ACTS[t.act].stage === 'topic') && ritual < 2) {
    c.turns = [];
    return c;
  } // a greeting and nothing else, between people who know each other: not worth the stop

  /* closing: as much as the opening was */
  c.stage = 'close';
  const closer = c.left[a.id] <= c.left[b.id] ? a : b,
    other = closer === a ? b : a;
  if (ritual === 2) {
    say(closer, other, 'pre_close');
    say(other, closer, 'farewell');
    say(closer, other, 'farewell_back');
  } else if (ritual === 1) {
    say(closer, other, 'farewell');
    if (Math.random() < 0.5) say(other, closer, 'farewell_back');
  }

  /* what stays: both remember it, they know each other a little better, and the need for company is met */
  for (const [x, y] of [
    [a, b],
    [b, a]
  ]) {
    TM.add(x, { kind: 'talked', with: y.id, imp: 0.2, n: c.turns.length, subj: c.lastSubj });
    x.social = Math.min(100, (x.social == null ? 50 : x.social) + 5 + c.turns.length);
    lfAff(x, y, 1, 'chatted');
  }
  talkFinish(c, a, b, listened);
  return c;
}
/** the answers to what sp just said: an answer, an answer to that, and so on (a story is four turns long) */
function talkAnswers(c: any, sp: any, li: any, id: string) {
  let cur = id,
    from = sp,
    to = li;
  for (let d = 0; d < 4 && ACTS[cur].replies.length; d++) {
    const reply = talkChoose(c, to, from, ACTS[cur].replies);
    if (!reply || (d === 0 && reply === 'agree' && Math.random() < 0.3)) break; // a nod is optional; an answer is not
    talkTurn(c, to, from, reply);
    c.left[to.id] -= 0.4;
    cur = reply;
    const t2 = from;
    from = to;
    to = t2;
  }
}

/** the words (only when somebody can hear), the log, the bubbles, and the hold on both people: shared by conversations and shop encounters */
function talkFinish(c: any, a: any, b: any, listened?: boolean) {
  let lines: any[] | null = null;
  if (listened || TALK.words) {
    lines = c.turns
      .map((t: any) => {
        const s = t.by === a.id ? a : b,
          text = talkWords(t, a, b);
        return text ? { who: s, text } : null;
      })
      .filter(Boolean);
  }
  // a bark (somebody muttering at work, a call across the street nobody answers) is no conversation: it is logged as a bark of one person, nobody is held in place
  // and no `talked` memory is written (those come from talkRun, which barks never go through)
  const solo = !!c.solo || a === b;
  TALK.log.push(
    solo
      ? {
          t: game.time,
          kind: 'bark',
          a: a.id,
          to: b !== a ? b.id : null,
          acts: c.turns.slice(),
          lines: lines ? lines.map((l: any) => l.who.first + ': ' + l.text) : null
        }
      : {
          t: game.time,
          a: a.id,
          b: b.id,
          d: lfDist(a, b),
          acts: c.turns.slice(),
          lines: lines ? lines.map((l: any) => l.who.first + ': ' + l.text) : null
        }
  );
  if (TALK.log.length > 300) TALK.log.shift();

  // you hear it: what is told in your hearing goes in your journal
  const pl = game.player;
  if (lines && lines.length && pl && a !== pl && b !== pl && (lfDist(pl, a) <= TALK.earshot || lfDist(pl, b) <= TALK.earshot)) {
    for (const t of c.turns) {
      if (t.act !== 'share_news' || !t.x || t.x.evId == null) continue;
      const ev = lf2Ev().find((q: any) => q.id === t.x.evId);
      if (!ev || TM.ofEv(pl, ev.id) || ev.actor === pl.id) continue;
      TM.addEv(pl, ev, 'overheard', 0.6, t.by === a.id ? a : b, 1, t.x.ver ? { who: t.x.ver.who, sev: t.x.ver.sev } : undefined);
    }
  }
  if (!lines && pl && typeof sndMurmur === 'function') sndMurmur(a);
  if (lines && lines.length) {
    game.events.push({ time: game.time, a, b, place: placeOf(a), topic: 'talk', quiet: false, talk: true, lines, self: solo });
  } else if (!solo) {
    const hold = game.time + c.turns.length * (c.short ? 0.2 : 0.7);
    a.talkUntil = Math.max(a.talkUntil || 0, hold);
    b.talkUntil = Math.max(b.talkUntil || 0, hold);
  }
}
