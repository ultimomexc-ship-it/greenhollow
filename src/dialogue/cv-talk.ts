/* ================= dialogue / cv-talk: the conversation itself =================
   You say whole sentences. The attitude of a sentence (a joke, sympathy, an insult, a probe, a flirt, a bit of gossip, a lie) is part of the sentence,
   not a setting, and the person answers the attitude as well as the words: a sunny person is hurt by an insult, a cynic shrugs it off, a prickly
   one hits back. Every answer opens new things to follow up, so a conversation can wander for as long as there is something to find.
   They remember: what you said, what you did, what you told them.                                                                                        */
type CvIntent = 'ask' | 'probe' | 'press' | 'doubt' | 'sympathize' | 'praise' | 'offer' | 'agree' | 'tease' | 'joke' | 'flirt' | 'insult' | 'accuse' | 'gossip' | 'confide' | 'lie' | 'blackmail' | 'mercy' | 'matchmake' | 'change' | 'answer' | 'cheat' | 'apologize' | 'plain';
interface CvOpt { text: string; intent: CvIntent; hook?: CvHook; w: number; then?: (c) => CvUtt | null; fam?: string }
const CV_CLS: any = { warm: ['sympathize', 'praise', 'offer', 'agree', 'mercy', 'matchmake', 'apologize'], playful: ['tease', 'joke', 'flirt'], hostile: ['insult', 'accuse', 'blackmail'], inquisitive: ['ask', 'probe', 'press', 'doubt'], sharing: ['gossip', 'confide', 'lie', 'answer'] };
const cvCls = (i: string) => { for (const k in CV_CLS) if (CV_CLS[k].includes(i)) return k; return 'other'; };
const CV_BANNED = [/that'?s interesting/i, /i see what you mean/i, /it'?s complicated/i, /anything else (you'?d like|you want) to know/i, /that'?s life in the village/i, /^anything else\??$/i, /^goodbye\.?$/i, /how can i help you/i, /as an ai/i];

/* ---------------- starting up ---------------- */
function cvNew(o, p) {
  cvWorld();
  const aff = o.aff[p.id] || 0, know = o.know[p.id] || 0, st = o.plan && o.plan[o.si], close = aff < -15 ? 'cold' : aff >= 60 ? 'close' : aff >= 25 ? 'friend' : know >= 10 ? 'known' : 'stranger', v = cvVoice(o);
  const c: any = { o, p, v, mem: cvMem(o, p), aff, know, close, status: o.status || '', act: st && st.act, hr: (game.time % 1440) / 60, kid: o.age < 12, warmth: 0, patience: 3 + v.chat * 5 + (close === 'close' ? 2 : 0), turns: 0, depth: {}, told: {}, pressed: {}, usedOpt: {}, hooks: [], activity: '', cap: 0, log: [], asked: {}, said: {} };
  c.activity = cvActivity(c); c.cap = Math.round(5 + v.chat * 10 + (close === 'friend' ? 3 : close === 'close' ? 5 : 0) - (close === 'stranger' ? 2 : 0));
  return c;
}
const cvSync = c => { c.aff = c.o.aff[c.p.id] || 0; };

/* ---------------- memory: what they bring up from last time ---------------- */
const CV_CB: any = {
  insult: { hurt: ['Back again? Last time you told me "{t}". I have not forgotten.', 'I thought about what you said. "{t}". I decided to be the bigger person. Hello.'], sharp: ['Oh good, it is you. The one who said "{t}".', 'You called me — "{t}". Charming. Hello again.'] },
  flirt: { any: ['Hm. Are you going to say something clever again, or just stand there? You said "{t}" and I have been thinking about it.', 'You said "{t}" to me. I remembered. I am not sure what to do with that.'] },
  offer: { any: ['{p}! I have not forgotten you helped me. What can I do for you?', 'You — the one who helped. I owe you.'] },
  joke: { any: ['Ha — you are the one who said "{t}". I have told it to three people.', 'I still laugh about "{t}". Do not tell anyone.'] },
  tease: { any: ['You said "{t}" and nobody laughed. Including me. But I remembered.'] },
  confide: { any: ['I have been thinking about what you told me. "{t}". I am glad you did.', 'You trusted me with "{t}". I have kept it. All of it.'] },
  praise: { any: ['I have been smiling about "{t}" all week. Thank you.'] },
};
function cvCallback(c) {
  const o = c.o, p = c.p, ms = c.mem.moments.filter(m => !m.used && game.time - m.t < 3 * 1440 && CV_CB[m.k]); if (!ms.length) return null;
  const order = ['insult', 'flirt', 'offer', 'confide', 'joke', 'tease', 'praise']; ms.sort((a, b) => order.indexOf(a.k) - order.indexOf(b.k)); const m = ms[0]; m.used = true;
  const bank = CV_CB[m.k], hurt = ['sunny', 'lonely', 'wary', 'reserved'].includes(c.v.arch), list = bank.any || (hurt ? bank.hurt : bank.sharp);
  return { text: cvLine(o, list, p, 'cb' + m.k).replace('{t}', m.text.replace(/\.$/, '')) };
}

/* ---------------- choosing what to bring up ---------------- */
const CV_KINDMUL: any = { nosy: { event: 1.5, person: 1.3, back: 1.3 }, reserved: { world: 1.3, event: 0.6, person: 0.6, back: 0.4, secret: 0.3, regret: 0.3 }, cynic: { person: 1.2, world: 1.2 }, lonely: { ambition: 1.4, regret: 1.4, state: 1.4 }, wary: { player: 1.5 }, talkative: { legend: 1.4, pride: 1.4 }, sunny: { legend: 1.3, world: 1.2 }, prickly: { person: 1.2 }, smooth: { pride: 1.3, person: 1.3 } };
function cvChoose(c, pool: CvTopic[]) {
  const mul = CV_KINDMUL[c.v.arch] || {}, open = cvOpenness(c); let tot = 0; const ws = pool.map(t => { let w = t.w * (mul[t.kind] || 1); if (t.sens > open + 0.3) w *= 0.2; w = Math.max(0.02, w); tot += w; return w; });
  let r = Math.random() * tot; for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) return pool[i]; } return pool[pool.length - 1];
}
const cvTopicOf = (h: CvHook): any => ({ key: h.key, kind: h.k, q: h.q, ev: h.ev, back: h.back, facet: h.facet, id: h.id, extra: h.extra, sens: cvSensOf(h) });
function cvSensOf(h: CvHook) { switch (h.k) { case 'back': return h.back ? h.back.sens : 0.4; case 'secret': return 0.8; case 'regret': return 0.55; case 'fear': return 0.45; case 'event': return 0.25; case 'person': return 0.25; default: return 0.15; } }

/* ---------------- opening ---------------- */
function cvOpen(c): CvUtt {
  const o = c.o, p = c.p, v = c.v;
  if (o.job === 'Guard' && lf2Wanted()[p.id]) return { text: anyOf(['Stop right there, ' + p.first + '.', 'We need to talk about what happened.', 'I have been looking for you.']), hooks: [{ k: 'arrest', key: 'arrest', label: 'that' }] };
  if (c.activity === 'privy') return { text: anyOf(CV_ACTV.privy.say), hooks: [] };
  if (c.close === 'cold') return { text: anyOf(['What.', 'Not now.', '*looks straight through you*', 'I have nothing to say to you.']), hooks: [{ k: 'cold', key: 'cold', label: 'that' }] };
  const cb = cvCallback(c); c.mem.talks++; c.mem.last = game.time;
  const greet = cb ? cb.text : (c.mem.talks > 1 && game.time - c.mem.last < 90 ? '' : cvGreetLine(o, p, c.close));
  c.pool = cvPool(c);
  let utt: CvUtt | null = null;
  const chatty = Math.random() < 0.3 + v.chat * 0.65;
  if (chatty && c.pool.length) { const t = cvChoose(c, c.pool); utt = cvTell(c, t, 0); }
  if (!utt) utt = cvTellAct(c);
  return { text: [greet, utt.text].filter(Boolean).join(' '), hooks: utt.hooks };
}
/** after a scene (the authored kind) the conversation carries on in this system */
function cvAfterScene(o, p, said) {
  const c = cvNew(o, p); talkS = { n: o, p, sc: null, c: null, stage: 0, custom: true, conv: c, fns: [] }; c.mem.talks++; c.pool = cvPool(c);
  const t = c.pool.length ? cvChoose(c, c.pool) : null, u = t ? cvTell(c, t, 0) : cvTellAct(c);
  return cvFrame(c, { text: said + ' ' + (u ? cvPivotLine(o) + ' ' + u.text : ''), hooks: u ? u.hooks : [] });
}

/* ---------------- following up: what you can say ---------------- */
const pick1 = (a: string[], c?) => a[Math.floor(Math.random() * a.length)];
function cvFollowUps(c, h: CvHook): CvOpt[] {
  const o = c.o, p = c.p, out: CvOpt[] = [], add = (text: string, intent: CvIntent, w = 1, then?, fam?: string) => out.push({ text, intent, hook: h, w, then, fam: fam || h.k + '.' + intent }), q = h.q, ph = q ? cvPron(q) : null, a = q ? (o.aff[q.id] || 0) : 0, l = h.label;
  switch (h.k) {
    case 'act': { const A = CV_ACTV[cvActivity(c)] || CV_ACTV.any;
      for (const [text, ans] of A.ask) add(text, 'ask', 1.4, c2 => cvActAnswer(c2, ans, text));
      add(anyOf(['And how is that going, really?', 'Do you like it? Or is it just what there is?']), 'ask', 0.8); add(anyOf(['You always look busy.', 'Is it ever not like this?']), 'tease', 0.5); break; }
    case 'person': { const kw = kinWord(o, q), kin = kw && !['friend', 'rival', 'sweetheart'].includes(kw), job = q.age >= 16 && q.job && JOB_VERB[q.job], hob = q.hobby && HOBBY_TXT[q.hobby], fond = a > 55 || (o.crush === q.id);
      add(pick1([`What is ${q.first} really like?`, `How did you two end up like this?`]), 'ask', 1.3, null, 'pe.ask');
      add(pick1([`There is more to you and ${q.first} than you say.`, `You keep not saying something about ${q.first}.`]), 'probe', 1, null, 'pe.probe');
      if (kin) add(pick1([`Do you two always get on like that?`, `Families. Nobody can drive you madder.`]), 'tease', 0.9, null, 'pe.kin');
      else if (fond) add(pick1([`You light up when you say ${ph.his} name.`, `If you like ${ph.him} that much, tell ${ph.him}.`]), 'tease', 0.9, null, 'pe.fond');
      else if (a < -25) add(pick1([`You say ${ph.his} name like it tastes of vinegar.`, `Go on, what did ${q.first} do? Spill your wine?`]), 'tease', 0.9, null, 'pe.sour');
      else if (hob) add(`Is it true ${q.first} spends every spare moment at ${hob}?`, 'ask', 0.8, c2 => ({ text: pk([`Every one. ${cvCap(ph.he)} would do it at ${ph.his} own wedding.`, `More or less. It is the only time ${ph.he} is truly quiet.`]), hooks: [cvHook({ kind: 'person', key: 'pe' + q.id, q })] }), 'pe.hobby');
      else if (job) add(`Does ${q.first} ever stop working?`, 'tease', 0.7, null, 'pe.work');
      if (a < -20) add(pick1(['That sounds like it hurts.', 'Sounds like it has cost you something.']), 'sympathize', 0.8, null, 'pe.sym');
      if (a > -10 && a < 40 && (o.know[q.id] || 0) < 35) add(`You should spend more time with ${q.first}. I think you would get on.`, 'matchmake', 0.5, c2 => cvMatch(c2, q), 'pe.match');
      const news = cvEventsAbout(c, q); if (news) add(`I heard ${lf2Low(news.text)}. Is that true?`, 'gossip', 1.2, c2 => cvGossipTell(c2, news), 'pe.gossip');
      if (a < 20 && !c.asked.lie) add(`I would watch ${q.first} around money, if I were you.`, 'lie', 0.3, c2 => { c2.asked.lie = 1; return cvLie(c2, q); }, 'pe.lie'); break; }
    case 'event': { const ev = h.ev, t = lf2By(ev.target), k = o.kn && o.kn[ev.id], actor = k && k.a ? lf2By(ev.actor) : null;
      add('Where did this happen?', 'ask', 1.1, c2 => cvEvWhere(c2, ev), 'ev.where'); add('When was this?', 'ask', 0.9, c2 => cvEvWhen(c2, ev), 'ev.when'); add('Who saw it?', 'ask', 1, c2 => cvEvWho(c2, ev), 'ev.who');
      if (!actor) add('Who do you think did it?', 'ask', 1.4, null, 'ev.suspect');
      add(pick1(['How do you know it is true?', 'Does anyone actually know the whole story?']), 'probe', 0.9, null, 'ev.probe'); add(pick1(['I heard it a bit differently.', 'That sounds like the kind of thing people exaggerate.']), 'doubt', 0.7, null, 'ev.doubt');
      add(pick1(['Well, nobody can say this village is dull.', 'Next you will tell me the goose was involved.']), 'joke', 0.6, null, 'ev.joke'); if (t && t !== o) add(`Poor ${t.first}. Does anyone know how ${cvPron(t).he} is taking it?`, 'sympathize', 0.8, null, 'ev.sym'); break; }
    case 'back': { const b = h.back; add(pick1(['How did that start?', 'Have you ever tried to put it right?']), 'ask', 1.2, null, 'bk.ask'); add('There is more to it than that, is there not?', 'probe', 1, null, 'bk.probe');
      if (b && b.kind === 'debt') add('How much are we talking about?', 'ask', 1.1, c2 => cvBackDetail(c2, b, 'amt'), 'bk.amt');
      if (b && b.kind === 'feud') add('Who started it?', 'ask', 1.1, c2 => cvBackDetail(c2, b, 'start'), 'bk.start');
      add('Who else knows about this?', 'ask', 0.9, c2 => cvBackDetail(c2, b, 'who'), 'bk.who');
      add(pick1(['That sounds like it has weighed on you.', 'I am sorry. That cannot be easy.']), 'sympathize', 0.9, null, 'bk.sym');
      if (b && b.kind === 'flame') add('It sounds as if you still have a soft spot.', 'tease', 0.8, null, 'bk.tease'); add('Whatever happened, I will not repeat it.', 'mercy', 0.9, null, 'bk.mercy');
      if (b && b.kind === 'debt') add('Perhaps you could simply pay it back and sleep better.', 'doubt', 0.6, null, 'bk.pay'); break; }
    case 'ambition': add(pick1(['What is stopping you?', 'When would you start?']), 'ask', 1.2); add('That is a good thing to want.', 'praise', 0.9); add('And what would you do once you had it?', 'tease', 0.7); add('I have something like that. I never say it either.', 'confide', 0.8, c2 => cvReciprocate(c2)); break;
    case 'regret': add(pick1(['That is a heavy thing to carry around.', 'Could you put it right, even now?']), 'sympathize', 1.2); add('What would you do differently?', 'ask', 1); add('I have a few of those myself.', 'confide', 0.9, c2 => cvReciprocate(c2)); add('Does anybody else know?', 'probe', 0.7); break;
    case 'pride': add(pick1(['How did it happen?', 'Did anyone see?']), 'ask', 1.1); add('I bet that story gets better every year.', 'tease', 1); add('That is something to be proud of.', 'praise', 0.9); add('You are telling that story differently from last time. I think.', 'doubt', 0.3); break;
    case 'fear': add('Since when?', 'ask', 1); add('That is nothing to be ashamed of.', 'sympathize', 1); add('Does anyone know?', 'probe', 0.7); add('I will not tell the geese.', 'joke', 0.5); break;
    case 'secret': add(pick1(['You can tell me. I am good at keeping things.', 'Whatever it is, I will not judge.']), 'probe', 1.2); add('Whatever it is, it stays with me.', 'mercy', 1); add('Is it the sort of secret that makes you smile or the other kind?', 'ask', 0.8); break;
    case 'state': { add(pick1(['What is going on?', 'Want to talk about it?']), 'ask', 1); add('That sounds hard.', 'sympathize', 0.9);
      if (h.id === 'hungry' && cvHasFood(p)) add('Here, have something to eat.', 'offer', 1.3, c2 => cvFeed(c2)); if ((h.id === 'poor' || h.id === 'tool') && p.coin >= 5) add('Here, take five denarii.', 'offer', 1.3, c2 => cvCoin(c2, 5));
      if (h.id === 'love') { add('Who is it?', 'probe', 1.3); add('Go on, tell me. I will not tell a soul.', 'press', 0.7); } if (h.id === 'baby') add('Congratulations. Truly.', 'praise', 1); if (h.id === 'high') add('Whatever it is, bottle it.', 'joke', 0.8); break; }
    case 'legend': { const g = CV_LEGENDS.find(x => x.id === h.id);
      add(pick1(['Is any of that true?', 'Who told you that?']), 'ask', 1, null, 'lg.ask'); add('Have you ever seen it for yourself?', 'ask', 1, c2 => ({ text: cvLegendSeen(c2), hooks: [h] }), 'lg.seen');
      add('That sounds like something somebody made up to sell wine.', 'doubt', 0.7, null, 'lg.doubt'); add('I have heard it told differently.', 'confide', 0.5, c2 => cvLegendSwap(c2, h), 'lg.swap');
      add('Who tells it best round here?', 'ask', 0.8, c2 => { const q = npcs.filter(x => x !== o && x !== p && !x.dead && x.age > 30 && (lf2Has(x, 'gossipy') || lf2Has(x, 'jovial') || lf2Has(x, 'sociable'))).sort((x, y) => (o.know[y.id] || 0) - (o.know[x.id] || 0))[0]; return q ? { text: `${q.first}. ${cvPron(q).He} has been adding to it for years. By now it has a dragon in it.`, hooks: [cvPersonHook(q)] } : null; }, 'lg.who');
      add('Next you will say the well talks.', 'joke', 0.5, null, 'lg.joke'); break; }
    case 'world': add(pick1(['Is that usual?', 'Does that happen every year?']), 'ask', 0.8); add(pick1(['I will believe it when I see it.', 'Nobody tells me these things.']), 'joke', 0.5); break;
    case 'chron': add('Who else knows?', 'ask', 1); add('Poor things. All of them.', 'sympathize', 0.6); break;
    case 'player': return cvPlayerOpts(c, h);
    case 'question': return cvQuestionOpts(c, h);
    case 'avoid': { const orig: CvHook = h.extra; add(pick1(['You went quiet just then.', 'That is not all of it, is it?']), 'press', 1.2); add(pick1(['It is all right. You can trust me with it.', 'You do not have to say. But I am not going anywhere.']), 'sympathize', 1.1);
      add(pick1(['Fine. Another time.', 'We can leave that one. Tell me something else.']), 'change', 0.8); break; }
    case 'leaving': add(`Walk with ${cvPron(o).him} for a bit.`, 'plain', 1.4, c2 => cvWalkWith(c2)); add(pick1(['Go on, then. I will find you later.', 'Off you go. I will be around.']), 'plain', 1, c2 => ({ text: pk(['Do. And think about what I said.', 'Mind how you go.']), hooks: [], end: true })); break;
    case 'cold': add('I am sorry about before.', 'apologize', 1.3, c2 => cvApologize(c2)); add('You are not worth the breath.', 'insult', 0.4); add('I will leave you be.', 'plain', 0.8, c2 => ({ text: '…Good.', hooks: [], end: true })); break;
    case 'arrest': for (const t of ['Is this about the purse?', 'There must be some mistake, officer.', 'You will have to catch me.']) add(t, 'plain', 1, c2 => { setTimeout(() => lf2ArrestDialog(c2.o, c2.p), 0); return null; }); break;
  }
  return out;
}
/* answers drawn from the event itself: where, when, who */
const cvDayWord = (t: number) => { const d = Math.floor(game.time / 1440) - Math.floor(t / 1440), hh = (t % 1440) / 60, part = hh < 11 ? 'in the morning' : hh < 17 ? 'in the afternoon' : hh < 21 ? 'towards evening' : 'late at night'; return (d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : d + ' days ago') + ' ' + part; };
function cvEvWhere(c, ev): CvUtt { const hooks: CvHook[] = [{ k: 'event', key: 'ev' + ev.id, label: 'that', ev }]; return { text: ev.place ? pk([`By ${ev.place}, I heard. Of all places.`, `Round ${ev.place}. Everything happens round ${ev.place}.`]) : 'Out in the open, which is the part I cannot get over.', hooks }; }
function cvEvWhen(c, ev): CvUtt { const hooks: CvHook[] = [{ k: 'event', key: 'ev' + ev.id, label: 'that', ev }]; return { text: `${cvDayWord(ev.t)}. It feels longer; news does that.`, hooks }; }
function cvEvWho(c, ev): CvUtt { const names = (ev.witnesses || []).map(id => byId(id)).filter(q => q && q !== c.o && q !== c.p && !q.dead).slice(0, 3), hooks: CvHook[] = [{ k: 'event', key: 'ev' + ev.id, label: 'that', ev }]; names.forEach(q => hooks.push(cvPersonHook(q)));
  return { text: !names.length || ev.unseen ? 'Nobody, supposedly. Which is exactly what somebody would say who wanted it unseen.' : `${names.map(q => q.first).join(', ')}, among others. I would ask ${names.length > 1 ? 'them' : cvPron(names[0]).him} before you ask me again.`, hooks }; }
function cvBackDetail(c, b, what): CvUtt {
  const o = c.o, A = byId(b.a), B = byId(b.b), hooks: CvHook[] = [{ k: 'back', key: 'bk' + b.id, label: cvLabel({ kind: 'back', back: b }), back: b }, cvPersonHook(A), cvPersonHook(B)];
  const self = o.id === b.a || o.id === b.b, w = cvWilling(c, b.sens + 0.1, 'bk' + b.id); if (self && w === 'no') return { text: cvDeflectLine(o, c.p), hooks: [{ k: 'avoid', key: 'avoid:bk' + b.id, label: 'that', extra: hooks[0] }] };
  if (what === 'amt') { cvLearnBack(c, b, 1); return { text: self ? `${b.amt} denarii. I know to the coin. ${o.id === b.a ? 'I lie awake counting it.' : 'I check the jar.'}` : `About ${b.amt}, I heard. It does not sound much until it is you.`, hooks }; }
  if (what === 'start') return { text: `Ask ${self ? cvPron(cvOther(b, o)).him : A.first} and you will hear it was the other one. It was ${b.why}. After that it did not matter who began.`, hooks };
  const k = b.knownBy.map(id => byId(id)).filter(q => q && q !== o && q !== c.p && !q.dead).slice(0, 3); k.forEach(q => hooks.push(cvPersonHook(q)));
  return { text: k.length ? `${k.map(q => q.first).join(' and ')}, as far as I know. ${pk(['And then there is you, now.', 'It is never as few as people think.'])}` : 'Nobody, I thought. And now you.', hooks };
}
const CV_SEEN: any = { talkative: 'Seen it? I have practically lived in it. Ask me about the time I was nearly in it.', reserved: 'No.', nosy: 'No, but I know three people who have. I am going through them one at a time.', cynic: 'No. Neither has anyone. That is how you know it is a good story.', sunny: 'No, but I like to think of it. Is that not nearly as good?', wary: 'I stay well away. Some places do not like being looked at.', prickly: 'Do I look like someone who goes and looks at things?', smooth: 'I have seen a great many things. Most of them were just as disappointing.', lonely: 'I go sometimes, when it is quiet. I like it better than pretending.' };
const cvLegendSeen = c => CV_SEEN[c.v.arch];
const cvHasFood = p => FOODS.concat(['bread', 'stew']).some(g => (p.inv[g] || 0) > 0);

/* ---------------- replies to things about you ---------------- */
function cvPlayerOpts(c, h: CvHook): CvOpt[] {
  const out: CvOpt[] = [], add = (text: string, intent: CvIntent, w: number, then) => out.push({ text, intent, hook: h, w, then }), o = c.o;
  switch (h.facet) {
    case 'saw': add('He had it coming.', 'joke', 1, c2 => cvLine2(c2, 'tease', ['Ha! Probably.', 'That is not for me to say.'])); add('I only needed to get past.', 'answer', 1, c2 => ({ text: pk(['Next time, say excuse me. It works wonders.', 'Fair enough. The paths are narrow.']), hooks: [] })); add('Do not tell anyone, please.', 'confide', 0.8, c2 => ({ text: pk(['Who would I tell? …Do not answer that.', 'Your secret is safe. It is not much of a secret.']), hooks: [] })); break;
    case 'suspect': add('That was not me.', 'lie', 1, c2 => cvDeny(c2, h)); add('It was me. I am not proud of it.', 'confide', 1, c2 => cvConfess(c2, h)); add('Prove it.', 'accuse', 0.8, c2 => cvDefy(c2, h)); add('There is more to it than they say.', 'answer', 0.9, c2 => ({ text: 'There always is. Tell me, then. I am listening.', hooks: [h] })); break;
    case 'helped': add('It was nothing.', 'answer', 1, c2 => ({ text: pk(['It was not nothing. That is why I am saying it.', 'Do not argue with me. I am grateful and I am going to be about it.']), hooks: [] })); add('Anyone would have.', 'answer', 0.8, c2 => ({ text: 'No. They would not. That is rather the point.', hooks: [] })); add('You can repay me with a story.', 'joke', 0.7, c2 => cvPivotUtt(c2, h)); break;
    case 'heard': add('Yes, that was me.', 'answer', 1, c2 => cvOwnUp(c2, h)); add('That is not how it happened.', 'lie', 0.8, c2 => cvDeny(c2, h)); add('Who told you that?', 'probe', 0.9, c2 => cvPivotUtt(c2, h)); break;
    case 'liked': add('That is kind of you to say.', 'praise', 1, c2 => ({ text: 'It is simply true. Try not to spoil it.', hooks: [] })); add('And what do they say about you?', 'tease', 0.8, c2 => cvPivotUtt(c2, h)); break;
    case 'disliked': add('What are they saying?', 'ask', 1.2, c2 => cvPivotUtt(c2, h)); add('Let them. I know what I am.', 'answer', 0.8, c2 => ({ text: pk(['Hm. I hope you do.', 'Good. That sort of confidence is useful. Or doomed.']), hooks: [] })); break;
  }
  return out;
}
function cvQuestionOpts(c, h: CvHook): CvOpt[] {
  if (h.id === 'carry') return [{ text: 'It is for the house. A bit at a time.', intent: 'answer', hook: h, w: 1, then: c2 => ({ text: pk(['Slowly. Honest work. I respect it.', 'That is how every house starts. With a person looking foolish carrying things.']), hooks: [] }) }, { text: 'Rocks have excellent conversation.', intent: 'joke', hook: h, w: 1, then: c2 => cvLine2(c2, 'joke', ['Ha! More than some of my neighbours.', 'I have met worse company.']) }, { text: 'It is a gift. For the whole village. Secret.', intent: 'lie', hook: h, w: 0.8, then: c2 => ({ text: pk(['A gift of… a rock? I will act surprised.', 'Mysterious. I like it. I will tell nobody. Except possibly everybody.']), hooks: [] }) }];
  const q = VX.ask.find(x => x.id === h.id); if (!q) return [];
  return q.opts.map(([kind, text]) => ({ text, intent: kind === 'honest' ? 'confide' : kind === 'joke' ? 'joke' : kind === 'lie' ? 'lie' : 'answer', hook: h, w: 1, then: c2 => cvAnswerQuestion(c2, kind, text) } as CvOpt));
}
function cvAnswerQuestion(c, kind, text) {
  const o = c.o, p = c.p; cvNote(o, p, kind === 'honest' ? 'confide' : kind === 'joke' ? 'joke' : 'answer', text);
  if (kind === 'honest') { c.mem.trust += 5; lfAff(o, p, 3); return { text: `${cvReactLine(o, p, 'warm')} ${pk(['I will remember that.', 'That means something to me.'])}`, hooks: [{ k: 'self-p', key: 'k', label: 'that' }] as CvHook[] }; }
  if (kind === 'joke') { const ok = Math.random() < 0.55 + (c.v.humor === 'none' ? -0.25 : 0.1); lfAff(o, p, ok ? 2 : 0); return { text: ok ? cvReactLine(o, p, 'funny') : pk(['Hm. Very good. Avoid the question much?', 'Ha. You dodge well.']), hooks: [] }; }
  if (kind === 'lie') { c.mem.lied[text] = 1; return { text: pk(['Is that so? How… impressive.', 'Hm. I will take your word for it.']), hooks: [] }; }
  return { text: pk(['Fair enough. Everyone is allowed a locked door.', 'I understand. Some questions are for later.']), hooks: [] };
}
const cvLine2 = (c, cls, bank: string[]) => ({ text: pk(bank), hooks: [] as CvHook[] });

/* ---------------- observations: what you can say about them, right now ---------------- */
function cvObserve(c, h?: CvHook): CvOpt[] {
  const o = c.o, out: CvOpt[] = [], add = (text: string, intent: CvIntent, w: number, then?, hook?) => out.push({ text, intent, w, hook: hook || { k: 'state', key: 'obs:' + text, label: 'that', id: 'obs' }, then });
  if (o.energy < 32) { add('You look a little tired. Everything alright?', 'sympathize', 1.2, c2 => cvStateSay(c2, 'tired')); add('Long night?', 'ask', 1, c2 => cvStateSay(c2, 'tired')); add('Well, you look terrible today.', 'insult', 0.5); }
  if (o.hunger > 60) { add('Have you eaten anything today?', 'sympathize', 1, c2 => cvStateSay(c2, 'hungry')); add('That stomach is louder than you are.', 'tease', 0.7, c2 => cvStateSay(c2, 'hungry')); }
  if (o.clean != null && o.clean < 35) { add('Been to the baths lately?', 'tease', 0.9); add('There is a certain aroma about you today.', 'insult', 0.4); }
  if (o.mood < 38) { add('Having a rough morning?', 'sympathize', 1.2, c2 => cvStateSay(c2, 'low')); add('Who stole your breakfast?', 'tease', 0.8, c2 => cvStateSay(c2, 'low')); }
  if (o.mood > 78) { add('You are in a good mood. What happened?', 'ask', 1.2, c2 => cvStateSay(c2, 'high')); add('Did somebody give you gold, or did you win the goose?', 'tease', 0.8, c2 => cvStateSay(c2, 'high')); }
  if (c.turns < 2 && o.hat && o.hat !== 'none') add(`That is a fine ${o.hat === 'cap' ? 'cap' : 'hat'}.`, 'praise', 0.6);
  if (o.toolQ != null && o.toolQ < 40 && o.job) add(`That ${cvToolNoun(o)} has seen better days.`, 'tease', 0.9, c2 => cvStateSay(c2, 'tool'));
  if (o.preg) add('You look well. When is the baby due?', 'ask', 1.1, c2 => cvStateSay(c2, 'baby'));
  if (!out.length && c.turns < 3) { add('You look different today. Did something happen?', 'ask', 0.5); add('You look well.', 'praise', 0.5); add('Well, you look like you have seen better days.', 'insult', 0.2); }
  return out;
}
function cvStateSay(c, id) { const t = { key: 'st' + id, kind: 'state', id, sens: 0.1 }; const u = cvTell(c, t, c.told['st' + id] ? 1 : 0); return u || null; }

/* ---------------- things you can bring up yourself ---------------- */
function cvEventsAbout(c, q) { return Object.keys(c.p.kn || {}).map(id => lf2EvById(+id)).filter(ev => ev && !(c.gossiped && (c.gossiped[ev.id] || c.gossiped['t:' + ev.text])) && ev.actor === q.id && c.p.kn[ev.id] && c.p.kn[ev.id].a && !(c.o.kn && c.o.kn[ev.id] && c.o.kn[ev.id].a) && game.time - ev.t < 5 * 1440).sort((a, b) => b.t - a.t)[0] || null; }
const cvNewsToTell = c => Object.keys(c.p.kn || {}).map(id => lf2EvById(+id)).filter(ev => ev && !(c.gossiped && (c.gossiped[ev.id] || c.gossiped['t:' + ev.text])) && ev.actor !== c.o.id && game.time - ev.t < 4 * 1440 && !(c.o.kn && c.o.kn[ev.id] && (c.o.kn[ev.id].a || !c.p.kn[ev.id].a))).filter((ev, i, a) => a.findIndex(x => x.text === ev.text) === i).slice(-6).reverse();
function cvShare(c): CvOpt[] {
  const out: CvOpt[] = [], p = c.p, o = c.o, list = cvNewsToTell(c);
  if (list.length) { const ev = list[0], txt = c.p.kn[ev.id].a ? ev.text : (ev.anonText || ev.text); out.push({ text: `Did you hear? ${cvCap(lf2Low(txt))}.`, intent: 'gossip', w: 1.3, hook: { k: 'world', key: 'sh', label: 'that' }, then: c2 => cvGossipTell(c2, ev) }); }
  const K = cvKnows(p).back; for (const id in K) { const b = cvWorld().back.find(x => x.id === +id); if (!b || b.a === o.id || b.b === o.id || b.knownBy.includes(o.id)) continue; const A = byId(b.a), B = byId(b.b); if (!A || !B) continue;
    out.push({ text: b.kind === 'debt' ? `I heard ${A.first} owes ${B.first} money.` : b.kind === 'feud' ? `Is it true ${A.first} and ${B.first} are not speaking?` : `I heard ${A.first} and ${B.first} were once… close.`, intent: 'gossip', w: 1.2, hook: { k: 'world', key: 'sh' + id, label: 'that' }, then: c2 => cvBackGossip(c2, b) }); break; }
  return out;
}
function cvDirt(c) { return Object.keys(c.p.kn || {}).map(id => lf2EvById(+id)).filter(ev => ev && ev.actor === c.o.id && c.p.kn[ev.id].a && !ev.fake && ev.tags.some(t => ['crime', 'affair', 'scandal', 'theft'].includes(t)) && !(c.o.lf2Paid && c.o.lf2Paid[ev.id])); }
function cvSpecial(c): CvOpt[] {
  const o = c.o, p = c.p, out: CvOpt[] = [], h: CvHook = { k: 'world', key: 'sp', label: 'that' };
  if (cvDirt(c).length && c.close !== 'stranger') { out.push({ text: 'I know what you did. I think we should talk about it.', intent: 'blackmail', w: 1, hook: h, then: c2 => cvBlackmail(c2) }); out.push({ text: 'Whatever you did, I will not breathe a word.', intent: 'mercy', w: 1, hook: h, then: c2 => cvMercy(c2) }); }
  if (town.tavern && lf2InRoom(p, town.tavern) && p.coin >= 3 && o.coin >= 3 && c.close !== 'cold') { out.push({ text: 'Fancy a hand of dice? Three denarii a throw.', intent: 'plain', w: 1.1, hook: h, then: c2 => cvDice(c2, false) }); out.push({ text: 'I brought my own dice. For luck.', intent: 'cheat', w: 0.4, hook: h, then: c2 => cvDice(c2, true) }); }
  if (lf2Single(o) && lf2Single(p) && o.female !== p.female && c.aff >= 10 && c.close !== 'cold') out.push({ text: pick1(['You are very easy to talk to. Among other things.', 'Do you always look this good, or is it for my benefit?', 'If I asked you to the bonfire, would you say yes?']), intent: 'flirt', w: 0.7, hook: h });
  if (!c.asked.village) out.push({ text: pick1(['Anything strange going on round here lately?', 'What is the word in the village? Nobody tells me anything.']), intent: 'ask', w: 0.8, hook: h, then: c2 => { c2.asked.village = 1; return cvVillageWord(c2); } });
  if (!c.asked.you) out.push({ text: pick1(['Tell me about yourself. Properly.', 'What is a day like for you, really?']), intent: 'ask', w: 0.6, hook: h, then: c2 => { c2.asked.you = 1; const L = cvLife(c2.o), keys = ['amb', 'pri', 'fea'], t = cvPool(c2).filter(x => keys.includes(x.key)); const tt = t.length ? t[Math.floor(Math.random() * t.length)] : null; return tt ? cvTell(c2, tt, 0) : null; } });
  return out;
}

/* ---------------- choosing your options ---------------- */
function cvOptions(c, utt: CvUtt): CvOpt[] {
  if (utt.end || c.activity === 'privy') return [];
  let cands: CvOpt[] = [], follow: CvOpt[] = [];
  for (const h of utt.hooks) follow.push(...cvFollowUps(c, h));
  follow = follow.filter(o => !c.usedOpt[o.text]);
  cands.push(...follow, ...cvObserve(c).map(x => ({ ...x, w: x.w * 0.55 })), ...cvShare(c).filter(x => !c.asked['s:' + x.text]).map(x => ({ ...x, w: x.w * 0.7 })), ...cvSpecial(c));
  if (c.v.chat > 0.4 && !c.asked.q && c.turns > 2 && c.close !== 'stranger') {}
  const sh = c.shownText || (c.shownText = {}); cands = cands.filter(o => !c.usedOpt[o.text] && (sh[o.text] || 0) < 2);
  const used = new Set<string>(), picked: CvOpt[] = [], seen = c.shown || (c.shown = {}), byW = (arr: CvOpt[]) => arr.map(x => ({ x, s: x.w * (0.6 + Math.random() * 0.8) * Math.pow(0.3, seen[x.fam || x.intent] || 0) })).sort((a, b) => b.s - a.s).map(y => y.x);
  const take = (arr: CvOpt[], pred?: (o: CvOpt) => boolean) => { for (const o of byW(arr)) { if (pred && !pred(o)) continue; if (used.has(o.text)) continue; used.add(o.text); picked.push(o); return true; } return false; };
  if (follow.length) { take(follow, o => cvCls(o.intent) === 'inquisitive'); }
  take(follow.length ? follow : cands, o => !picked.some(p => cvCls(p.intent) === cvCls(o.intent)));
  take(cands, o => !picked.some(p => cvCls(p.intent) === cvCls(o.intent)));
  if (picked.length < 3) take(cands, o => !picked.some(p => p.intent === o.intent));
  if (!picked.length) picked.push({ text: anyOf(['Go on.', 'You were saying.']), intent: 'ask', w: 1, hook: utt.hooks[0] });
  const fin = picked.slice(0, 3); for (const o of fin) { seen[o.fam || o.intent] = (seen[o.fam || o.intent] || 0) + 1; sh[o.text] = (sh[o.text] || 0) + 1; } return fin;
}

/* ---------------- how they take it ---------------- */
function cvEffect(c, opt: CvOpt): { react?: string; end?: boolean } {
  const o = c.o, p = c.p, v = c.v, cls = cvCls(opt.intent), has = t => lf2Has(o, t), aff = o.aff[p.id] || 0, m = c.mem, text = opt.text;
  switch (opt.intent) {
    case 'praise': { if (aff <= -20) { lfAff(o, p, 1); return { react: pk(['Flattery will not work on me.', 'Hm. What do you want?']) }; } lfAff(o, p, has('shy') || has('proud') || has('cheerful') ? 4 : 3); m.trust += 1; c.warmth += 1; cvNote(o, p, 'praise', text); return { react: cvReactLine(o, p, 'warm') }; }
    case 'sympathize': case 'mercy': lfAff(o, p, 2); m.trust += 2; c.warmth += 2; return Math.random() < 0.6 ? { react: cvReactLine(o, p, 'thanks') } : {};
    case 'offer': case 'matchmake': case 'agree': c.warmth += 1; return {};
    case 'apologize': return {};
    case 'tease': case 'joke': { const ok = Math.random() < Math.max(0.15, Math.min(0.9, 0.35 + aff / 150 + (v.humor !== 'none' ? 0.25 : 0) + (['sunny', 'talkative', 'smooth'].includes(v.arch) ? 0.1 : 0) - (['wary', 'reserved'].includes(v.arch) ? 0.1 : 0)));
      if (ok) { lfAff(o, p, 2); c.warmth += 1; cvNote(o, p, 'joke', text); return { react: cvReactLine(o, p, 'funny') }; } lfAff(o, p, -1); cvNote(o, p, 'tease', text); return { react: opt.intent === 'tease' ? pk(['…Funny.', 'Hm. If you say so.', 'That was meant to be funny, was it?']) : pk(['…Right.', 'Hm.']) }; }
    case 'flirt': { const ok = aff > 30 || (aff > 15 && Math.random() < 0.3); lfAff(o, p, ok ? 5 : -2); if (ok && Math.random() < 0.4) o.crush = p.id; lfEmit('flirt', { actor: p, target: o, sev: 1, tags: ['romance'], chron: false, text: `${p.first} was flirting with ${o.first}` }); cvNote(o, p, 'flirt', text); return { react: cvReactLine(o, p, ok ? 'flirtok' : 'flirtno') }; }
    case 'insult': { lfEmit('insult', { actor: p, target: o, sev: 1, loud: true, tags: ['nuisance', 'embarrass'], chron: false, text: `${p.first} was rude to ${o.first}'s face` }); lfAff(o, p, o.age < 14 ? -8 : -5); m.trust -= 4; c.patience -= 2; c.warmth -= 3; cvNote(o, p, 'insult', text);
      if ((has('brave') || has('grumpy') || (o.drunk || 0) > 60) && Math.random() < 0.35 && LF2.on('tavern')) { setTimeout(() => lf2Brawl(o, p), 0); return { react: 'Right. That does it!', end: true }; }
      const r = cvReactLine(o, p, 'sting'); return c.patience <= 0 ? { react: r + ' ' + pk(['I am done talking to you.', 'We are finished here.']), end: true } : { react: r }; }
    case 'accuse': lfAff(o, p, -4); m.trust -= 2; c.patience -= 1; return { react: cvReactLine(o, p, 'sting') };
    case 'probe': case 'press': case 'doubt': { if (opt.intent === 'press') c.patience -= ['prickly', 'wary', 'reserved'].includes(v.arch) ? 1 : 0.4; if (c.patience <= 0) return { react: cvReactLine(o, p, 'press') + ' ' + pk(['I am going now.', 'That is enough of that.']), end: true }; return opt.intent === 'press' && Math.random() < 0.5 ? { react: cvReactLine(o, p, 'press') } : {}; }
    case 'confide': m.trust += 4; lfAff(o, p, 2); c.warmth += 2; cvNote(o, p, 'confide', text); return {};
    default: return {};
  }
}

/* ---------------- going deeper, wandering, closing ---------------- */
function cvRespond(c, opt: CvOpt): CvUtt | null {
  c.turns++; c.usedOpt[opt.text] = 1; if (opt.intent === 'gossip') c.asked['s:' + opt.text] = 1; cvSync(c);
  const fx = cvEffect(c, opt); if (fx.end) return { text: fx.react || '…', hooks: [], end: true };
  let body: CvUtt | null | undefined;
  if (opt.then) { body = opt.then(c); if (body === null && (opt.hook && opt.hook.k === 'arrest' || !opt.hook)) return null; }
  else if (opt.hook) body = cvContinue(c, opt);
  if (!body) body = cvPivotUtt(c, opt.hook);
  if (body && body.end) return { text: [fx.react, body.text].filter(Boolean).join(' '), hooks: [], end: true };
  return cvClose(c, { text: [fx.react, body.text].filter(Boolean).join(' '), hooks: body.hooks });
}
function cvContinue(c, opt: CvOpt): CvUtt | null {
  const h = opt.hook, cls = cvCls(opt.intent), o = c.o;
  if (h.k === 'avoid') { const orig = h.extra as CvHook; if (opt.intent === 'press') c.pressed[orig.key] = (c.pressed[orig.key] || 0) + 1; else if (opt.intent === 'sympathize') c.warmth += 2; else return cvPivotUtt(c, orig); return cvDeepen(c, orig, c.depth[orig.key] === undefined ? 0 : c.depth[orig.key] + 1); }
  if (cls === 'inquisitive' || cls === 'warm' || opt.intent === 'confide') { if (opt.intent === 'doubt' && h.k === 'person') return cvDeepen(c, h, (c.depth[h.key] || 0) + 1); return cvDeepen(c, h, c.depth[h.key] === undefined ? 1 : c.depth[h.key] + 1); }
  if (cls === 'playful' || opt.intent === 'insult') return Math.random() < 0.6 ? cvDeepen(c, h, c.depth[h.key] === undefined ? 1 : c.depth[h.key] + 1) : cvPivotUtt(c, h);
  return cvPivotUtt(c, h);
}
function cvDeepen(c, h: CvHook, layer: number): CvUtt | null {
  const t = cvTopicOf(h), max = CV_MAXLAYER[h.k] === undefined ? 1 : CV_MAXLAYER[h.k]; if (layer > max) return cvPivotUtt(c, h);
  const w = cvWilling(c, t.sens + 0.08 * layer, h.key), o = c.o, p = c.p;
  if (w === 'no') {
    if (cvSlips(c)) { const u = cvTell(c, t, layer); if (u) return { text: `${u.text} …I should not have said that.`, hooks: u.hooks }; }
    if (['smooth', 'wary', 'prickly'].includes(c.v.arch) && (h.k === 'secret' || h.k === 'back') && Math.random() < 0.45) { c.mem.lied[h.key] = 1; return { text: pk(['There is nothing to tell. You have been listening to gossip.', 'I do not know what you have heard. It is not true.']), hooks: [{ k: 'avoid', key: 'avoid:' + h.key, label: h.label, extra: h }] }; }
    return { text: cvDeflectLine(o, p), hooks: [{ k: 'avoid', key: 'avoid:' + h.key, label: h.label, extra: h }] };
  }
  const u = cvTell(c, t, layer); if (!u) return cvPivotUtt(c, h);
  if (w === 'hint') u.text = pk(['I will say this much: ', 'I will only say: ']) + u.text.split(/(?<=[.!?])\s/)[0];
  return u;
}
function cvPivotUtt(c, h?: CvHook): CvUtt {
  const o = c.o, pool = cvPool(c); c.pool = pool;
  const rel = (t: CvTopic) => { let w = t.w; if (h) { if (h.q && (t.q === h.q || (t.back && (t.back.a === h.q.id || t.back.b === h.q.id)) || (t.ev && (t.ev.actor === h.q.id || t.ev.target === h.q.id)))) w *= 4; if (h.ev && t.q && (t.q.id === h.ev.actor || t.q.id === h.ev.target)) w *= 4; if (h.k === t.kind) w *= 1.3; } return w; };
  if (pool.length) { let tot = 0; const ws = pool.map(t => { const w = Math.max(0.02, rel(t) * (t.sens > cvOpenness(c) + 0.3 ? 0.2 : 1)); tot += w; return w; }); let r = Math.random() * tot, pickT = pool[0]; for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) { pickT = pool[i]; break; } }
    const u = cvTell(c, pickT, 0); if (u) return { text: (['event', 'chron'].includes(pickT.kind) || Math.random() > 0.55 ? '' : cvPivotLine(o) + ' ') + u.text, hooks: u.hooks }; }
  const qs = VX.ask.filter(x => !c.asked['q' + x.id]); if (qs.length) { const q = anyOf(qs); c.asked['q' + q.id] = 1; return { text: q.say.replace('{p}', c.p.first), hooks: [{ k: 'question', key: 'q:' + q.id, label: 'that', id: q.id }] }; }
  return { text: pk(['I have talked your ear off. Come back when I have more to say.', 'That is all I have. You have got the best of me today.']), hooks: [], end: true };
}
/** now and then they have somewhere to be; they say so, and you can go with them */
function cvClose(c, u: CvUtt): CvUtt {
  if (u.end) return u;
  if (c.turns >= c.cap && !c.leaving && c.activity !== 'privy') { c.leaving = true; const walk = ['talkative', 'lonely', 'sunny', 'nosy'].includes(c.v.arch) ? ' Walk with me a little? I will finish the story.' : '';
    return { text: u.text + ' ' + pk(['I have kept you, and I have things to do.', 'Look at me going on. I have got to get back to it.']) + walk, hooks: [{ k: 'leaving', key: 'leaving', label: 'that' }] }; }
  if (c.patience <= 0) return { text: u.text + ' ' + pk(['I am going now.', 'That is enough for one day.']), hooks: [], end: true };
  return u;
}

/* ---------------- the specific things you can do ---------------- */
function cvActAnswer(c, ans, label): CvUtt {
  const o = c.o, p = c.p; let t: string;
  if (Array.isArray(ans)) t = anyOf(ans); else if (ans.startsWith('TAG:')) { tagAlong(o, p, 120, 'With ' + p.first); like(o, p, 2); t = ans.slice(4); }
  else if (ans.startsWith('HELP:')) t = (() => { const st = o.plan && o.plan[o.si]; if (!st || st.act !== 'work') return pk(['Kind, but I have not started yet.', 'Not just now. Ask me when I am knee-deep.']); o.until = Math.max(game.time, (o.until || game.time) - 15); bumpAff(p, o, 4, 8); lfEmit('help', { actor: p, target: o, sev: 1, tags: ['help', 'kindness'], chron: false, text: `${p.first} lent ${o.first} a hand with the work` }); cvNote(o, p, 'offer', label); return ans.slice(5); })();
  else if (ans.startsWith('FOOD:')) t = cvHasFood(p) ? (() => { lf2GiveFood(p, o); cvNote(o, p, 'offer', label); return ans.slice(5); })() : 'Kind of you, but you look as empty-handed as I am.';
  else if (ans.startsWith('BUY:')) t = p.coin < 3 ? 'Kind of you to offer with empty pockets.' : (() => { p.coin -= 3; o.coin = (o.coin || 0) + 3; like(o, p, 3); return ans.slice(4); })();
  else if (ans === 'BIZ') t = (o.coin || 0) < 6 ? 'Thin. Everyone is counting coins.' : 'Steady. Better after supper, when people are hungry and careless.';
  else if (ans === 'MOOD') t = o.mood < 35 ? 'Could be better. Could be a lot better.' : o.mood > 70 ? 'Better than most, to be honest.' : 'Fine. Ordinary. I will take ordinary.';
  else t = cvVillageWord(c).text;
  return { text: t, hooks: [{ k: 'act', key: 'act', label: 'that' }] };
}
const cvFeed = c => { lf2GiveFood(c.p, c.o); cvNote(c.o, c.p, 'offer', 'a meal'); return { text: pk(['Oh, bless you. I was about to chew my sleeve.', 'Thank you. I will not forget that.']), hooks: [] as CvHook[] }; };
const cvCoin = (c, q) => { if (c.p.coin < q) return { text: 'You do not have ' + q + ' denarii on you. Kind thought, though.', hooks: [] as CvHook[] }; lf2Give(c.p, c.o, q); cvNote(c.o, c.p, 'offer', q + ' denarii'); c.mem.trust += 4; return { text: pk(['Are you sure? Thank you. I will not forget it.', 'That is… generous. Thank you.']), hooks: [] as CvHook[] }; };
function cvMatch(c, q) { lfAff(c.o, q, 6); bumpKnow(c.o, q, 15); c.o.lf2Seek = q.id; return { text: pk([`${q.first}? I should talk to ${cvPron(q).him} more. You may be right.`, `Hm. ${q.first}. I will make the effort. Do not make a fuss about it.`]), hooks: [cvPersonHook(q)] }; }
function cvLie(c, q) {
  const o = c.o, p = c.p, trust = Math.max(0.2, Math.min(1, 0.55 + (o.aff[p.id] || 0) / 120 + c.mem.trust / 300)) * (lf2Has(o, 'curious') ? 0.75 : 1);
  if (Math.random() >= trust) { lfAff(o, p, -2); c.mem.trust -= 2; return { text: pk(['I would not go saying that about people.', 'Nobody has said anything like that to me. Where did you get it?']), hooks: [cvPersonHook(q)] }; }
  const same = Object.keys(p.kn || {}).map(id => lf2EvById(+id)).find(e => e && e.fake && e.actor === q.id && e.liar === p.id && game.time - e.t < 4 * 1440);
  const ev: any = same || lfEmit('rumour', { actor: q, sev: 1, tags: ['theft'], fake: true, witnessIds: [], chron: false, text: `${q.first} has been stealing from neighbours` }); if (!same) { ev.liar = p.id; ev.know = [p.id]; delete (q.kn || {})[ev.id]; (p.kn || (p.kn = {}))[ev.id] = { t: game.time, from: null, cert: 1, a: true, mine: true, liar: true }; }
  lf2Learn(o, ev, p, 0.7 * trust, true); cvNote(o, p, 'lie', `${q.first} cannot be trusted`);
  return { text: (o.aff[q.id] || 0) > 50 ? `${q.first}? I do not believe a word of it.` : pk(['I knew it.', 'Really? I will keep an eye on my things.']), hooks: [cvPersonHook(q)] };
}
function cvGossipTell(c, ev): CvUtt {
  const o = c.o, p = c.p, k = p.kn[ev.id], known = k.a, j = lf2Judge(o, ev, known), stance = cvStanceOf(ev, j); (c.gossiped = c.gossiped || {})[ev.id] = 1; c.gossiped['t:' + ev.text] = 1;
  if (o.kn && o.kn[ev.id] && (o.kn[ev.id].a || !known)) return { text: pk(['Old news, I am afraid. It reached me yesterday.', 'You are the third to tell me that. It has been a busy day for it.', 'I know. Everyone knows. It is only you who thinks it is a secret.']), hooks: [{ k: 'event', key: 'ev' + ev.id, label: cvLabel({ kind: 'event', ev }), ev }] };
  lf2Tell(p, o, ev, false, true); bumpAff(p, o, 1, 6);
  const a = known && ev.actor ? lf2By(ev.actor) : null, hooks: CvHook[] = [{ k: 'event', key: 'ev' + ev.id, label: cvLabel({ kind: 'event', ev }), ev }]; if (a && a !== o) hooks.push(cvPersonHook(a));
  c.told['ev' + ev.id] = 1; return { text: `${cvStanceLine(o, stance)} ${a ? `${a.first}, of all people.` : ''}`.trim(), hooks };
}
function cvBackGossip(c, b): CvUtt {
  const o = c.o, hooks: CvHook[] = [{ k: 'back', key: 'bk' + b.id, label: cvLabel({ kind: 'back', back: b }), back: b }]; const A = byId(b.a), B = byId(b.b); hooks.push(cvPersonHook(A), cvPersonHook(B));
  if (!b.knownBy.includes(o.id)) b.knownBy.push(o.id); c.told['bk' + b.id] = 0;
  const near = o.aff[A.id] > 40 || o.aff[B.id] > 40; return { text: near ? pk(['Who told you that? That is not for repeating.', 'You should not carry that around. It will hurt someone.']) : pk(['So that is getting round. I thought only a few knew.', 'You have heard that too. This village has no walls.']), hooks };
}
function cvReciprocate(c): CvUtt | null { const o = c.o; c.mem.trust += 3; const keys = ['reg', 'sec', 'fea', 'amb'].filter(k => !c.told[k]), t = cvPool(c).find(x => keys.includes(x.key)); if (!t) return null; const u = cvTell(c, t, c.told[t.key] ? 1 : 0); return u ? { text: `${pk(['Thank you for telling me that.', 'I did not expect that, and I am glad of it.'])} Since we are being honest: ${u.text}`, hooks: u.hooks } : null; }
function cvLegendSwap(c, h: CvHook): CvUtt { lfAff(c.o, c.p, 1); return { text: pk(['Different? How? Tell me. I love a second version.', 'Ha! Everyone has their own. Which makes me think mine is wrong.']), hooks: [h] }; }
function cvWalkWith(c): CvUtt { tagAlong(c.o, c.p, 120, 'Walking with ' + c.p.first); like(c.o, c.p, 3); return { text: pk(['Come on, then. Keep up.', 'Good. I hate finishing a story to an empty road.']), hooks: [], end: true }; }
function cvApologize(c): CvUtt { const o = c.o, p = c.p, ok = (o.aff[p.id] || 0) > -40; if (ok) { lfAff(o, p, 6); return { text: pk(['…Thank you. I will think about it.', 'Hm. That cost you something to say. I noticed.']), hooks: [{ k: 'act', key: 'act', label: 'that' }] }; } return { text: 'Words are cheap.', hooks: [], end: true }; }
function cvVillageWord(c): CvUtt { const pool = cvPool(c).filter(t => t.kind === 'event' || t.kind === 'chron' || t.kind === 'back'); if (!pool.length) return { text: pk(['Quiet, honestly. Suspiciously quiet.', 'Nothing worth repeating. Which means somebody is up to something.']), hooks: [] }; const u = cvTell(c, cvChoose(c, pool), 0); return u || { text: 'Nothing worth repeating.', hooks: [] }; }
function cvDeny(c, h: CvHook): CvUtt { const o = c.o, p = c.p, trust = Math.max(0.15, Math.min(0.9, 0.4 + (o.aff[p.id] || 0) / 140 + c.mem.trust / 250)); if (Math.random() < trust) { lfAff(o, p, 1); return { text: pk(['Then I will believe you. People make things up.', 'I thought so. It did not sound like you.']), hooks: [] }; } lfAff(o, p, -3); c.mem.trust -= 3; return { text: pk(['That is not what I heard.', 'Hm. You said that quickly.']), hooks: [h] }; }
function cvConfess(c, h: CvHook): CvUtt { const o = c.o, p = c.p; lfAff(o, p, lf2Has(o, 'devout') || lf2Has(o, 'proud') ? -4 : 2); c.mem.trust += 3; return { text: pk(['Well. I appreciate you saying so. That is more than most would.', 'I did not think you would admit it. That is worth something.']), hooks: [] }; }
function cvDefy(c, h: CvHook): CvUtt { lfAff(c.o, c.p, -3); c.patience -= 1; return { text: pk(['I do not need to. Everyone is saying it.', 'Hm. Bold.']), hooks: [h] }; }
function cvOwnUp(c, h: CvHook): CvUtt { lfAff(c.o, c.p, 1); return { text: pk(['I thought so. It sounded like you.', 'Good. People who own what they do are rarer than they should be.']), hooks: [] }; }
function cvBlackmail(c): CvUtt {
  const o = c.o, p = c.p, ev = cvDirt(c).pop(); if (!ev) return { text: 'I do not know what you mean.', hooks: [], end: true };
  const ask = Math.max(5, Math.round(o.coin * 0.4)), pays = (lf2Has(o, 'anxious') || lf2Has(o, 'proud') || ev.tags.includes('affair')) && !lf2Has(o, 'brave') && o.coin >= 5;
  lfAff(o, p, -25); c.mem.trust -= 20; lfEmit('blackmail', { actor: p, target: o, sev: 2, tags: ['deceit', 'crime'], witnessIds: [], chron: false, text: `${p.first} blackmailed ${o.first} over ${lf2Low(ev.text).replace(new RegExp('^' + o.first + ' '), 'how they ')}` }); cvNote(o, p, 'insult', 'I know what you did');
  if (pays) { o.coin -= ask; p.coin += ask; (o.lf2Paid = o.lf2Paid || {})[ev.id] = 1; return { text: `…How much? Fine. ${ask} denarii. Now leave me alone.`, hooks: [], end: true }; }
  if (Math.random() < 0.3) o.lf2Report = { ev: lf2Ev()[lf2Ev().length - 1].id, t: game.time, a: true };
  return { text: pk(['Go on, tell everyone. See if I care.', 'You would not dare.', 'Get out of my sight.']), hooks: [], end: true };
}
function cvMercy(c): CvUtt { const o = c.o, p = c.p, ev = cvDirt(c).pop(); if (ev) (o.lf2Paid = o.lf2Paid || {})[ev.id] = 1; lfAff(o, p, 8); c.mem.trust += 10; cvNote(o, p, 'confide', 'I will not breathe a word'); return { text: pk(['You… thank you. I will not forget this. I mean it.', 'I do not know what to say. Nobody has ever done that.']), hooks: [{ k: 'act', key: 'act', label: 'that' }] }; }
function cvDice(c, cheat: boolean): CvUtt {
  const o = c.o, p = c.p; if (p.coin < 3 || o.coin < 3) return { text: 'I have no money to bet.', hooks: [] };
  const r = lf2Dice(p, o, 3, cheat); if (r && r.caught) { cvNote(o, p, 'insult', 'loaded dice'); return { text: 'Those dice are LOADED!', hooks: [], end: true }; }
  return { text: r ? (r.win === p ? pk(['Bah! Take it.', 'Again? You are lucky tonight.']) : 'Ha! Mine.') : '…', hooks: [{ k: 'act', key: 'act', label: 'that' }] };
}

/* ---------------- plumbing into the talk box ---------------- */
function cvTurn(c, u: CvUtt) {
  const opts = cvOptions(c, u); c.hooks = u.hooks; c.cur = opts;
  for (const re of CV_BANNED) if (re.test(u.text)) console.warn('banned phrase in dialogue:', u.text);
  c.log.push({ who: 'npc', text: u.text }); return { say: u.text, opts: opts.map(o => [o.text, () => cvStep(c, o)]) };
}
function cvStep(c, opt: CvOpt) { c.log.push({ who: 'p', text: opt.text }); const u = cvRespond(c, opt); if (!u) return null; return cvTurn(c, u); }
function cvFrame(c, u: CvUtt) { const t = cvTurn(c, u); talkS.fns = t.opts.map(x => x[1]); return { say: t.say, opts: t.opts.map((x, i) => ['c' + i, x[0]]) }; }
/** the first turn, in the form openTalk wants (keys c0, c1 …); talkS is set up for lf2TalkStep */
function convBegin(o, p) {
  const c = cvNew(o, p); talkS = { n: o, p, sc: null, c: null, stage: 0, custom: true, conv: c, fns: [] };
  bumpKnow(o, p, 2); return cvFrame(c, cvOpen(c));
}
