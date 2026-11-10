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
  c.activity = cvActivity(c); c.cap = 2 + (v.chat > 0.75 && close !== 'stranger' && Math.random() < 0.35 ? 1 : 0); c.thread = 0; c.threadKey = null;   // replies before the goodbye: the third screen is usually the last
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
  { const b = cvBusy(c); if (b) return { text: b, hooks: [], end: true }; }
  if (c.close === 'cold' && !cvKinOf(c)) return { text: anyOf(['What.', 'Not now.', '*looks straight through you*', 'I have nothing to say to you.']), hooks: [{ k: 'cold', key: 'cold', label: 'that' }] };
  const cb = cvCallback(c); c.mem.talks++; c.mem.last = game.time;
  const kg = cvKinGreet(c);
  const greet = cb ? cb.text : kg ? kg : (c.mem.talks > 1 && game.time - c.mem.last < 90 ? '' : cvGreetLine(o, p, c.close));
  c.pool = cvPool(c);
  let utt: CvUtt | null = null;
  const chatty = Math.random() < 0.3 + v.chat * 0.65;
  if (chatty && c.pool.length) { const t = cvChoose(c, c.pool); utt = cvTell(c, t, 0); }
  if (!utt) utt = cvTellAct(c);
  return { text: [greet, utt.text].filter(Boolean).join(' '), hooks: utt.hooks };
}
/* ---------------- family: they know you ---------------- */
/** what the player is to this person's family: 'wife' | 'husband' | 'son' | 'daughter' | 'mother' | 'father' | 'brother' | 'sister' ... (the speaker's relation to the player) */
function cvKinOf(c): string | null {
  const w = kinWord(c.p, c.o); return w && ['wife', 'husband', 'son', 'daughter', 'mother', 'father', 'brother', 'sister', 'grandmother', 'grandfather', 'granddaughter', 'grandson'].includes(w) ? w : null;
}
const CV_KINSAY: any = {
  spouse: ['There you are. I was beginning to think the island had you.', 'Hello, {p}. I put something by for you. It is on the shelf, behind the other things.', '{p}. Good. I was about to talk to the wall, and the wall has stopped answering.', 'You look tired. Sit for a minute. The island will manage without you for a minute.', 'Oh, it is you. I have been saying your name to nobody in particular all morning.', 'Come here. No reason.', 'You have sand on your sleeve. You have had sand on your sleeve since the day we met. I would not know you without it.'],
  childYoung: ['{Dad}! {Dad}! You are here!', '{Dad}, look. No, look. You missed it.', '{Dad}, can we do something? Anything. It does not have to be big.', '{Dad}, I had a dream that the island was a boat. Do you think it is?', '{Dad}! I counted the stairs. There are not any stairs. I counted anyway.'],
  childOlder: ['Oh. Hi, {Dad}.', 'Hello, {Dad}. You look like you want to ask me something.', '{Dad}. I was just thinking about you. Not in a bad way.', 'You always turn up when I am in the middle of something. I do not mind.', 'Hi, {Dad}. I am fine. That was going to be your first question.'],
  parent: ['{p}, there you are. Have you eaten? No. Come here.', 'My {child}. Sit. You are standing like somebody who has not sat all day.', '{p}. I was just thinking of you, and here you are. That is how it goes with {children}.', 'Look at you. I would know that walk anywhere, even here.'],
  sibling: ['Oh, it is you. Good. I was bored of everybody else.', '{p}. You look the way you did when we were small and had broken something.', 'Hello, {p}. Do not tell me anything clever. I am not ready.'],
  grand: ['{p}! Come and sit by me. Tell me nothing. Just sit.', 'There you are. I was telling the sand about you.'],
};
function cvKinGreet(c): string | null {
  const k = cvKinOf(c); if (!k) return null; if (c.mem.talks > 1 && game.time - c.mem.last < 90) return '';
  const o = c.o, p = c.p; let bank: string[];
  if (k === 'wife' || k === 'husband') bank = CV_KINSAY.spouse;
  else if (k === 'son' || k === 'daughter') bank = o.age < 12 ? CV_KINSAY.childYoung : CV_KINSAY.childOlder;
  else if (k === 'mother' || k === 'father') bank = CV_KINSAY.parent;
  else if (k === 'brother' || k === 'sister') bank = CV_KINSAY.sibling; else bank = CV_KINSAY.grand;
  const dad = p.female ? 'Mum' : 'Dad', ln = cvLine(o, bank, p, 'kin' + k);
  return ln.replace(/\{Dad\}/g, dad).replace(/\{p\}/g, p.first).replace(/\{child\}/g, o.female ? 'daughter' : 'son').replace(/\{children\}/g, 'children');
}
/** too busy to talk: one line and they are gone (null when they have a moment) */
/** why they cannot talk right now ('ill', 'privy', 'hungry', 'rush', 'work'), or null */
function cvBusyWhy(c): string | null {
  const o = c.o, s = c.status || '', ill = o.ill && o.ill.until > game.time, shop = o.shop || c.activity === 'stall';
  return ill ? 'ill' : (o.bladder || 0) > 85 || cvToPrivy(s) ? 'privy' : (o.hunger || 0) > 88 ? 'hungry' : /hurry|rush|late|fetch|Taking .* home|for food|bite to eat|Going to bed with a fever/i.test(s) ? 'rush' : (c.act === 'work' || ['farm', 'build', 'smith'].includes(c.activity)) && !shop && !c.kid ? 'work' : null;
}
function cvBusy(c): string | null {
  const why = cvBusyWhy(c); if (!why) return null; const fr = c.close === 'close' || c.close === 'friend'; const kin = cvKinOf(c);
  if (kin && (why === 'work' || why === 'rush')) { const kids = kin === 'son' || kin === 'daughter', B = kids ? ['I am in the middle of something, but you can stay and watch.', 'Not now. Well. A little now. Talk while I work.'] : ['Walk with me. My hands are busy, my ears are not.', 'Hold on, {p}. Two minutes. Stay where I can see you.', 'I am rushing, but say it quickly, I will pretend I am not.']; const l = cvFreshest(c.p, B.map(x => x.replace('{p}', c.p.first))); cvMarkHeard(c.p, l); return l; }
  const L: any = { ill: ['*coughs* Not today. Please.', 'I\'m not fit for company. Come back when I\'m on my feet.', 'Keep back. Whatever I\'ve got, you don\'t want it.'], privy: ['Not. Now.', 'Later! Much later!', 'Can\'t. Stop. Talking.'], hungry: ['I need to eat something before I fall over. Later.', 'Food first. Then talk.', 'If I don\'t eat now, I\'ll bite somebody. Later.'],
    rush: fr ? ['Can\'t stop, sorry! Later!', 'Running late. Find me after.', 'I\'d love to, but I\'m late. Walk faster next time!'] : ['Sorry, can\'t stop.', 'Not now, I\'m in a hurry.', 'Can\'t. Late.'], work: fr ? ['Busy, busy. Catch me when I\'m done?', 'Hands full. Later, I promise.', 'Not now, love. Later, when this is done.'] : ['I\'m working.', 'Busy. Another time.', '*keeps working*', 'Can it wait? It\'ll have to.'] };
  const ln = cvFreshest(c.p, L[why]); cvMarkHeard(c.p, ln); return ln;
}
/** after a scene (the authored kind) the conversation carries on in this system */
function cvAfterScene(o, p, said) {
  const c = cvNew(o, p); talkS = { n: o, p, sc: null, c: null, stage: 0, custom: true, conv: c, fns: [] }; c.mem.talks++; c.pool = cvPool(c);
  const t = c.pool.length ? cvChoose(c, c.pool) : null, u = t ? cvTell(c, t, 0) : cvTellAct(c);
  return cvFrame(c, { text: said + ' ' + (u ? u.text : ''), hooks: u ? u.hooks : [] });
}

/* ---------------- following up: what you can say ---------------- */
const pick1 = (a: string[], c?) => a[Math.floor(Math.random() * a.length)];
function cvFollowUps(c, h: CvHook): CvOpt[] {
  const o = c.o, p = c.p, out: CvOpt[] = [], add = (text: string, intent: CvIntent, w = 1, then?, fam?: string) => out.push({ text, intent, hook: h, w, then, fam: fam || h.k + '.' + intent }),
    one = (texts: string[], intent: CvIntent, w: number, then: ((c2, i: number) => CvUtt | null) | null, fam?: string) => { const i = Math.floor(Math.random() * texts.length); add(texts[i], intent, w, then ? (c2 => then(c2, i)) : null, fam); },
    q = h.q, ph = q ? cvPron(q) : null, a = q ? (o.aff[q.id] || 0) : 0, U = cvU;
  switch (h.k) {
    case 'act': { const A = CV_ACTV[cvActivity(c)] || CV_ACTV.any, any = A === CV_ACTV.any;
      for (const [text, ans] of A.ask) add(text, 'ask', 1.4, c2 => cvActAnswer(c2, ans, text), 'act.' + text);
      if (!any) one(['And how is that going, really?', 'How\'s it going today?'], 'ask', 0.8, c2 => cvActHow(c2), 'act.how');
      if (!c.kid && !any) one(['Do you like it? Or is it just what there is?', 'Do you actually enjoy it?'], 'ask', 0.7, c2 => cvActLike(c2), 'act.like');
      if (['farm', 'build', 'smith', 'stall', 'forage', 'fishing', 'patrol', 'bakery', 'eat', 'baths'].includes(cvActivity(c))) one(['You always look busy.', 'Is it ever not like this?', 'You make it look like hard work.', 'Do you ever stop?'], 'tease', 0.5, (c2, i) => cvActBusy(c2, i % 2), 'act.busy'); break; }
    case 'person': {
      if (!q || q.dead) break;
      if (q.infant || q.age < 3) { one(['How\'s the baby doing?', 'How\'s the little one?'], 'ask', 1.2, c2 => cvBabyAns(c2, q, 0), 'pe.baby'); add(`Who does ${ph.he} take after?`, 'ask', 0.9, c2 => cvBabyAns(c2, q, 1), 'pe.baby2'); break; }
      if (q.age < 14) { const mo = q.fam && byId(q.fam.mother), fa = q.fam && byId(q.fam.father), par = [mo, fa].filter(x => x && !x.dead && x !== o);
        add(`What's ${q.first} like?`, 'ask', 1.2, c2 => cvDescribe(c2, q), 'pe.ask');
        add(`Is ${q.first} any trouble?`, 'ask', 0.9, c2 => U(cvPkQ(c2, ['Trouble? {He} put a frog in the baker\'s flour. So yes.', 'No more than any of them. Less, some days.', '{He}\'s a good one. Loud, but good.'], q), [cvPersonHook(q)]), 'pe.kid');
        if (par.length) add(`Whose is ${q.first}?`, 'ask', 0.7, c2 => U(`${par.map(x => x.first).join(' and ')}'s. ${cvQ(pk(['You can see it in the face.', '{He}\'s got the family nose, poor thing.', 'And doesn\'t {he} know it.']), q)}`, par.map(cvPersonHook)), 'pe.par');
        break; }
      const kw = kinWord(o, q), kin = !!kw && !['friend', 'rival', 'sweetheart'].includes(kw), hob = q.hobby && HOBBY_TXT[q.hobby], fond = a > 55 || o.crush === q.id, hist = Math.abs(a) > 18 || kin || cvBackOf(o).some(b => b.a === q.id || b.b === q.id);
      add(pk([`What's ${q.first} really like?`, `What sort of person is ${q.first}?`, `What's ${q.first} like, honestly?`, `Tell me about ${q.first}.`, `I don't really know ${q.first}. What's ${ph.he} like?`]), 'ask', 1.3, c2 => cvDescribe(c2, q), 'pe.ask');
      if (hist) add(pk(['How did you two end up like this?', `How did it get like that with ${q.first}?`, `Have you always been like that, you and ${q.first}?`]), 'ask', 1, c2 => cvHowYouTwo(c2, q), 'pe.how');
      one([`There's more to you and ${q.first} than you say.`, `You keep not saying something about ${q.first}.`], 'probe', 0.8, c2 => cvProbePair(c2, q), 'pe.probe');
      if (kin) one(['Do you two always get on like that?', 'Families. Nobody can drive you madder.'], 'tease', 0.9, (c2, i) => cvKinAns(c2, q, i), 'pe.kin');
      else if (fond) one([`You light up when you say ${ph.his} name.`, `If you like ${ph.him} that much, tell ${ph.him}.`], 'tease', 0.9, (c2, i) => cvFondAns(c2, q, i), 'pe.fond');
      else if (a < -25) one([`You say ${ph.his} name like it tastes of vinegar.`, `Go on, what did ${q.first} do? Spill your wine?`], 'tease', 0.9, (c2, i) => cvSourAns(c2, q, i), 'pe.sour');
      else if (hob) add(`Is it true ${q.first} is mad about ${hob}?`, 'ask', 0.8, c2 => U(cvPkQ(c2, ['Mad is the word. {He}\'d do it at {his} own wedding.', 'More or less. It\'s the only time {he}\'s truly quiet.', 'Every spare moment. And some that aren\'t spare.'], q), [cvPersonHook(q)]), 'pe.hobby');
      else if (q.job && CV_WORKSKETCH[q.job]) add(`Does ${q.first} ever stop working?`, 'tease', 0.7, c2 => cvWorkAns(c2, q), 'pe.work');
      if (a < -20) one(['That sounds like it hurts.', 'Sounds like it\'s cost you something.'], 'sympathize', 0.8, c2 => cvHurtAns(c2, q), 'pe.sym');
      if (a > -10 && a < 15 && !kin && (o.know[q.id] || 0) < 25 && o.crush !== q.id && lf2Spouse(o) !== q && q !== p) add(`You should spend more time with ${q.first}. I think you'd get on.`, 'matchmake', 0.5, c2 => cvMatch(c2, q), 'pe.match');
      const news = cvEventsAbout(c, q); if (news) add(`I heard ${lf2Low(cvToYou(cvMe(p, sbText(p, news)), o)).replace(/\.$/, '')}. Is that true?`, 'gossip', 1.2, c2 => cvGossipTell(c2, news), 'pe.gossip');
      if (a < 20 && !c.asked.lie && q !== p) add(`I'd watch ${q.first} around money, if I were you.`, 'lie', 0.3, c2 => { c2.asked.lie = 1; return cvLie(c2, q); }, 'pe.lie'); break; }
    case 'event': { const ev = h.ev; if (!ev) break; const t = lf2By(ev.target), k = o.kn && o.kn[ev.id], actor = k && k.a && !k.sus ? lf2By(sbWhoId(o, ev)) : null, bad = ev.tags.some(g => (LF2_TAGS[g] || {}).v < 0), sad = ev.tags.includes('health') || ev.kind === 'illness' || ev.kind === 'death';
      add('Where did this happen?', 'ask', 1, c2 => cvEvWhere(c2, ev), 'ev.where'); add('When was this?', 'ask', 0.8, c2 => cvEvWhen(c2, ev), 'ev.when'); if (!sad) add('Who saw it?', 'ask', 0.9, c2 => cvEvWho(c2, ev), 'ev.who');
      if (!actor && ev.actor && bad) add('Who do you think did it?', 'ask', 1.4, c2 => cvEvSuspect(c2, ev), 'ev.suspect');
      else if (actor && actor !== o && actor !== p && ['theft', 'violence', 'law', 'kind', 'romance', 'quarrel', 'gamble'].includes(cvTagGroup(ev))) add(`Why would ${actor.first} do that?`, 'ask', 1.2, c2 => cvEvSuspect(c2, ev), 'ev.why');
      if (k && !k.mine) one(['How do you know it\'s true?', 'Does anyone actually know the whole story?'], 'probe', 0.9, (c2, i) => cvEvSource(c2, ev, i), 'ev.probe');
      { const alt = cvVersionGap(c, ev); if (alt) add(actor ? `I heard it was ${alt.first}, not ${actor.first}.` : `I heard it was ${alt.first}.`, 'doubt', 1.5, c2 => cvContradict(c2, ev), 'ev.contra'); else if (k && !k.mine) one(['I heard it a bit differently.', 'That sounds like the kind of thing people exaggerate.'], 'doubt', 0.6, (c2, i) => cvEvDoubt(c2, ev, i), 'ev.doubt'); }
      if (!sad && t !== o && ev.actor !== o.id) one(['Well, nobody can say this village is dull.', 'Next you\'ll tell me the goose was involved.'], 'joke', 0.6, (c2, i) => cvEvJoke(c2, ev, i), 'ev.joke');
      if (t && t !== o && t !== p && !t.dead) add(pk([`Poor ${t.first}. Does anyone know how ${cvPron(t).he}'s taking it?`, `How's ${t.first} taking it?`, `Is ${t.first} all right?`]), 'sympathize', bad || sad ? 0.9 : 0.3, c2 => cvEvTaking(c2, ev), 'ev.sym'); break; }
    case 'back': { const b = h.back; if (!b) break; const self = o.id === b.a || o.id === b.b, A = byId(b.a), B = byId(b.b);
      one(['How did that start?', 'How did it come to that?'], 'ask', 1.2, c2 => cvBackHow(c2, b), 'bk.how'); add('There\'s more to it than that, isn\'t there?', 'probe', 1, null, 'bk.probe');
      if (b.kind === 'debt') add('How much are we talking about?', 'ask', 1.1, c2 => cvBackDetail(c2, b, 'amt'), 'bk.amt');
      add('Who else knows about this?', 'ask', 0.8, c2 => cvBackDetail(c2, b, 'who'), 'bk.who');
      if (self) { add(b.kind === 'flame' ? 'Do you ever wish it had gone differently?' : 'Have you ever tried to put it right?', 'ask', 0.8, c2 => cvBackFix(c2, b), 'bk.fix'); one(['That sounds like it\'s weighed on you.', 'I\'m sorry. That can\'t be easy.'], 'sympathize', 0.9, null, 'bk.sym');
        if (b.kind === 'flame') add('It sounds as if you still have a soft spot.', 'tease', 0.8, c2 => cvBackFlame(c2, b), 'bk.tease'); add('Whatever happened, I won\'t repeat it.', 'mercy', 0.8, null, 'bk.mercy');
        if (b.kind === 'debt' && o.id === b.a) add('Perhaps you could simply pay it back and sleep better.', 'doubt', 0.6, c2 => cvBackPay(c2, b), 'bk.pay'); }
      else if (A && B) { add('Whose side are you on?', 'probe', 0.9, c2 => { const x = o.aff[A.id] || 0, y = o.aff[B.id] || 0, w = x >= y ? A : B, l = w === A ? B : A; return U(Math.abs(x - y) < 15 ? `Neither. I like them both, and that's the worst place to stand.` : `${w.first}'s, if I'm honest. But ${l.first} has a point, and I'd never say so to ${cvPron(w).his} face.`, [cvPersonHook(A), cvPersonHook(B)]); }, 'bk.side');
        add('Has anyone tried to put it right?', 'ask', 0.7, c2 => cvBackFix(c2, b), 'bk.fix'); }
      break; }
    case 'ambition': one(['What\'s stopping you?', 'When would you start?'], 'ask', 1.2, (c2, i) => cvLifeAns(c2, 'amb', i ? 'when' : 'stop'), 'amb.ask'); add('That\'s a good thing to want.', 'praise', 0.9, c2 => cvLifeAns(c2, 'amb', 'good'), 'amb.good'); add('And what would you do once you had it?', 'tease', 0.7, c2 => cvLifeAns(c2, 'amb', 'after'), 'amb.after'); add('I have something like that. I never say it either.', 'confide', 0.8, c2 => cvReciprocate(c2), 'amb.conf'); break;
    case 'regret': add('How did it happen?', 'ask', 1.2, c2 => cvLifeAns(c2, 'reg', 'how'), 'reg.how'); add('What would you do differently?', 'ask', 1, c2 => cvLifeAns(c2, 'reg', 'diff'), 'reg.diff'); add('Could you put it right, even now?', 'ask', 0.9, c2 => cvLifeAns(c2, 'reg', 'fix'), 'reg.fix');
      add('That\'s a heavy thing to carry around.', 'sympathize', 1, c2 => cvLifeAns(c2, 'reg', 'heavy'), 'reg.sym'); add('I have a few of those myself.', 'confide', 0.9, c2 => cvReciprocate(c2), 'reg.conf'); add('Does anybody else know?', 'probe', 0.6, c2 => cvLifeAns(c2, 'reg', 'who'), 'reg.who'); break;
    case 'pride': add('How did that happen?', 'ask', 1.1, c2 => cvLifeAns(c2, 'pri', 'how'), 'pri.how'); add('Did anyone see?', 'ask', 0.8, c2 => cvLifeAns(c2, 'pri', 'saw'), 'pri.saw'); add('I bet that story gets better every year.', 'tease', 1, c2 => cvLifeAns(c2, 'pri', 'tease'), 'pri.tease'); add('That\'s something to be proud of.', 'praise', 0.9, c2 => cvLifeAns(c2, 'pri', 'good'), 'pri.good'); break;
    case 'fear': add('Since when?', 'ask', 1, c2 => cvLifeAns(c2, 'fea', 'since'), 'fea.since'); add('That\'s nothing to be ashamed of.', 'sympathize', 1, c2 => cvLifeAns(c2, 'fea', 'ok'), 'fea.ok'); add('Does anyone know?', 'probe', 0.7, c2 => cvLifeAns(c2, 'fea', 'who'), 'fea.who');
      add('I won\'t tell the geese.', 'joke', 0.5, c2 => U(c2.landed ? pk(['Ha! Thank you. They\'d use it against me.', 'Ha! Don\'t. They talk.']) : pk(['Hm.', 'It isn\'t funny. Well. It\'s a bit funny.'])), 'fea.joke'); break;
    case 'secret': if (q && q !== o) { one(['Go on. What is it?', 'You can\'t stop there.'], 'probe', 1.2, c2 => cvOtherSecret(c2, q), 'sec.other'); add('Then don\'t tell me. It isn\'t ours to pass round.', 'mercy', 0.8, c2 => { lfAff(c2.o, c2.p, 2); c2.mem.trust += 2; return U(pk(['…You\'re right. Thank you. I shouldn\'t have started.', 'Hm. You\'re a better person than me. Most people would have pushed.'])); }, 'sec.mercy'); break; }
      one(['You can tell me. I\'m good at keeping things.', 'Whatever it is, I won\'t judge.'], 'probe', 1.2, null, 'sec.probe'); add('Whatever it is, it stays with me.', 'mercy', 1, null, 'sec.mercy'); add('Is it the sort of secret that makes you smile, or the other kind?', 'ask', 0.8, c2 => cvLifeAns(c2, 'sec', 'smile'), 'sec.kind'); break;
    case 'state': { const id = h.id, sad = ['tool', 'hungry', 'tired', 'poor', 'low', 'grief', 'debt', 'owed', 'lonely', 'kidill', 'tent'].includes(id);
      if (id === 'courting') { add('Is it serious?', 'ask', 1.2, null, 'st.serious'); add('About time, if you ask me.', 'tease', 0.9, c2 => U(c2.landed ? pk(['Ha! Nobody asked you. …Thank you.', 'Ha! You and my mother both.']) : 'Hm. Nobody asked you.'), 'st.abouttime'); break; }
      if (id === 'newjob') { add('Congratulations. You\'ll be good at it.', 'praise', 1, null, 'st.cong'); add('How did you get it?', 'ask', 0.9, c2 => U(pk(['They asked, and I didn\'t say no fast enough.', 'Nobody else wanted it. Don\'t tell anyone I said that.', 'I asked. That\'s the whole secret. You ask.'])), 'st.how'); break; }
      if (id === 'kids') { add('How old is the little one now?', 'ask', 0.9, c2 => { const k = sbKids(c2.o)[0]; return U(k ? (k.age < 1 ? 'Months. A few months. It feels like years.' : `${Math.floor(k.age)}. ${pk(['Going on forty.', 'And already cleverer than me.', 'Every year faster.'])}`) : 'Old enough to be trouble.'); }, 'st.age'); add('They\'re lucky to have you.', 'praise', 0.8, null, 'st.lucky'); break; }
      if (id === 'work') { add('Do you like it?', 'ask', 1, c2 => cvActLike(c2), 'st.like'); add('Is it ever not like this?', 'tease', 0.6, c2 => cvActBusy(c2, 1), 'st.busy'); break; }
      if (id === 'drunk') { add('How many have you had?', 'ask', 1, null, 'st.many'); add('Go home and sleep it off.', 'sympathize', 0.8, c2 => U(pk(['Home! Yes. Which way is home?', 'In a bit. The lane\'s still moving.'])), 'st.home'); break; }
      if (id === 'rich') { add('So you can lend me something, then.', 'tease', 1, c2 => U(c2.landed ? 'Ha! See? This is exactly what I meant.' : 'No.'), 'st.lend'); add('Good for you. What happened?', 'ask', 0.9, null, 'st.what'); break; }
      if (id === 'love') { add('Who is it?', 'probe', 1.3, c2 => cvLoveWho(c2), 'st.who'); add('Go on, tell me. I won\'t tell a soul.', 'press', 0.7, c2 => cvLoveWho(c2), 'st.who2'); add('Whoever it is, they\'re lucky.', 'praise', 0.8, c2 => U(pk(['You\'re sweet. They don\'t know yet. That\'s the trouble.', 'Lucky? They\'re oblivious. Lovely, and oblivious.'])), 'st.lucky'); break; }
      if (id === 'baby') { add('Congratulations. Truly.', 'praise', 1, null, 'st.cong'); add('Boy or girl, do you think?', 'ask', 0.9, c2 => U(pk(['Everyone has an opinion. Mine changes by the hour.', 'A girl, says my mother. A boy, says the midwife. A goose, says my husband, who thinks he\'s funny.'])), 'st.bg'); break; }
      if (id === 'high') { add('What happened?', 'ask', 1, null, 'st.what'); add('Whatever it is, bottle it.', 'joke', 0.8, c2 => U(c2.landed ? pk(['Ha! I\'d sell it at the market. Two coins a sniff.', 'Ha! I would if I knew what it was.']) : 'Hm. Don\'t spoil it.'), 'st.bottle'); break; }
      one(['What\'s going on?', 'Want to talk about it?'], 'ask', 1, null, 'st.ask'); if (sad) add('That sounds hard.', 'sympathize', 0.9, null, 'st.sym');
      if (id === 'hungry' && cvHasFood(p)) add('Here, have something to eat.', 'offer', 1.3, c2 => cvFeed(c2), 'st.feed'); if ((id === 'poor' || id === 'tool') && p.coin >= 5) add('Here, take five denarii.', 'offer', 1.3, c2 => cvCoin(c2, 5), 'st.coin'); break; }
    case 'legend': { const g = CV_LEGENDS.find(x => x.id === h.id); if (!g) break; const lay = c.depth[h.key] || 0;
      if (lay + 1 < g.parts.length) one(['And then what?', 'Go on. What happened then?', 'Is there more?'], 'ask', 1.3, null, 'lg.more');
      add('Is any of that true?', 'ask', 0.9, c2 => U(CV_TRUE[c2.v.arch], [h]), 'lg.true'); add('Who told you that?', 'ask', 0.7, c2 => cvLegendWho(c2, h), 'lg.whotold');
      if (['well', 'bell', 'gull', 'road', 'whale', 'fog', 'lovers', 'fire', 'pines'].includes(g.id)) add('Have you ever seen it for yourself?', 'ask', 0.8, c2 => ({ text: cvLegendSeen(c2), hooks: [h] }), 'lg.seen');
      add('That sounds like something somebody made up to sell wine.', 'doubt', 0.6, c2 => U(c2.v.arch === 'cynic' ? 'Probably. Good wine, too.' : pk(['Maybe. People still do it, though. Just in case.', 'Then it worked. Somebody sold a lot of wine.', 'Say that out on the flats at low tide, and see how brave you feel.']), [h]), 'lg.doubt');
      add(pk(['I\'ve heard it told differently.', 'That\'s not how my mother told it.', 'I heard a different ending.']), 'confide', 0.5, c2 => cvLegendSwap(c2, h), 'lg.swap');
      add('Who tells it best round here?', 'ask', 0.6, c2 => { const q2 = npcs.filter(x => x !== o && x !== p && !x.dead && x.age > 30 && (lf2Has(x, 'gossipy') || lf2Has(x, 'jovial') || lf2Has(x, 'sociable'))).sort((x, y) => (o.know[y.id] || 0) - (o.know[x.id] || 0))[0]; return q2 ? { text: `${q2.first}. ${cvPron(q2).He}'s been adding to it for years. By now it has a dragon in it.`, hooks: [cvPersonHook(q2)] } : U('My gran did. Nobody\'s told it right since.'); }, 'lg.who');
      add(g.id === 'well' ? 'And I suppose the goose wrote it down.' : pk(['Next you\'ll say the well talks.', 'And I suppose the goose wrote it down.', 'And the gull told you, did it?']), 'joke', 0.4, c2 => U(c2.landed ? pk(['Ha! Don\'t you start.', 'Ha! You laugh. Wait till you\'re out there at night.', 'Ha! Stranger things have happened. Not many.']) : 'Laugh all you like. I wouldn\'t.', [h]), 'lg.joke'); break; }
    case 'world': if (!h.facet) break; one(['Is that usual?', 'Does that happen often?'], 'ask', 0.8, c2 => cvWorldAns(c2, h), 'w.ask');
      one(['I\'ll believe it when I see it.', 'Nobody tells me these things.'], 'joke', 0.5, (c2, i) => U(c2.landed ? pk(i ? ['Ha! Nobody tells anybody. We just find out.', 'Ha! You\'re telling me.'] : ['Ha! Then come and see.', 'Ha! Suit yourself.']) : pk(['Suit yourself.', 'Hm.'])), 'w.joke'); break;
    case 'chron': add('Who else knows?', 'ask', 1, c2 => cvChronAns(c2, h), 'ch.who'); break;
    case 'rel': { const b = h.extra && h.extra.b; if (!b || !q) break; const t = cvTopicOf(h);
      add('How do you know?', 'ask', 1.1, c2 => cvTellRel(c2, t, 2), 'rel.how'); add(`Does ${b.first} know?`, 'ask', 1, c2 => cvRelDoesKnow(c2, t), 'rel.know');
      one([`And what do you make of ${b.first}?`, 'Whose side are you on?'], 'probe', 1.2, c2 => cvTellRel(c2, t, 1), 'rel.side');
      one(['That\'ll end in tears.', 'Somebody should lock them in a room together.'], 'joke', 0.6, (c2, i) => U(c2.landed ? pk(i ? ['Ha! And charge for tickets.', 'Ha! I\'d hold the key.'] : ['Ha! Probably mine.', 'Ha! It usually does.']) : pk(['It\'s not funny to them.', 'Hm. Maybe.'])), 'rel.joke');
      add('That can\'t be easy for either of them.', 'sympathize', 0.5, c2 => U(pk(['It isn\'t. And the rest of us have to sit between them at feasts.', 'No. They\'ll sort it out or they won\'t. That\'s how it goes here.'])), 'rel.sym'); break; }
    case 'conv': { const t = cvTopicOf(h), n = h.extra && h.extra.n, good = n && ['praise', 'repaid', 'court', 'lend', 'borrow'].includes(n.ty);
      one(['What was it about?', 'What was that about?'], 'ask', 1.2, c2 => cvTell(c2, t, 1) || U('Nothing much. That was the trouble.'), 'conv.ask'); add('How did it end?', 'ask', 0.9, c2 => cvConvEnd(c2, t), 'conv.end');
      if (good) add('That sounds nice.', 'praise', 0.8, c2 => U(pk(['It was. I don\'t get many like that.', 'It was. I\'m still smiling, look.'])), 'conv.nice');
      else one(['That sounds like a lot.', 'Are you all right?'], 'sympathize', 0.9, c2 => cvConvOk(c2, t), 'conv.sym');
      one(['Half the village has had a morning like that.', 'And you\'re telling me. So it\'s news now.'], 'tease', 0.5, (c2, i) => U(i ? pk(['Ha. Fair. Forget I said it. …You won\'t, will you?', 'It isn\'t news if I only tell you. That\'s the rule.']) : pk(['Then half the village has my sympathy.', 'Has it? That\'s almost a comfort.'])), 'conv.tease'); break; }
    case 'tellit': { if (h.ev && p.kn && p.kn[h.ev.id]) { const ev = h.ev, txt = lf2Low(cvToYou(cvMe(p, sbText(p, ev)), o)).replace(/\.$/, ''); add(pick1([`I heard ${txt}.`, `Well. ${cvCap(txt)}.`]), 'gossip', 1.5, c2 => cvGossipTell(c2, ev), 'tell.ev'); }
      else if (h.back) { const b = h.back, A = byId(b.a), B = byId(b.b); if (A && B) add(b.kind === 'debt' ? `${A.first} owes ${B.first} money. Quite a lot.` : b.kind === 'feud' ? `${A.first} and ${B.first} haven't spoken in years.` : `${A.first} and ${B.first} were sweet on each other once.`, 'gossip', 1.5, c2 => cvBackGossip(c2, b), 'tell.bk'); }
      add('Never mind. It\'s probably nothing.', 'change', 0.6, c2 => cvU(pk(['Now I\'ll be wondering all day.', 'You can\'t do that to a person!', 'Hm. Suit yourself.'])), 'tell.no'); break; }
    case 'player': return cvPlayerOpts(c, h);
    case 'question': return cvQuestionOpts(c, h);
    case 'avoid': { const orig: CvHook = h.extra; one(['You went quiet just then.', 'That isn\'t all of it, is it?'], 'press', 1.2, null, 'av.press'); one(['It\'s all right. You can trust me with it.', 'You don\'t have to say. But I\'m not going anywhere.'], 'sympathize', 1.1, null, 'av.sym');
      one(['Fine. Another time.', 'We can leave that one. Tell me something else.'], 'change', 0.8, c2 => { const u = cvPivotUtt(c2, orig, true); return u.end ? u : { text: pk(['Thank you. ', 'Good. ', 'Yes. Well. ']) + u.text, hooks: u.hooks }; }, 'av.change'); break; }
    case 'leaving': add(`Walk with ${cvPron(o).him} for a bit.`, 'plain', 1.4, c2 => cvWalkWith(c2)); add(pick1(['Go on, then. I\'ll find you later.', 'Off you go. I\'ll be around.']), 'plain', 1, c2 => ({ text: pk(['Do. And think about what I said.', 'Mind how you go.']), hooks: [], end: true })); break;
    case 'cold': add('I\'m sorry about before.', 'apologize', 1.3, c2 => cvApologize(c2)); add('You\'re not worth the breath.', 'insult', 0.4); add('I\'ll leave you be.', 'plain', 0.8, c2 => ({ text: '…Good.', hooks: [], end: true })); break;
    case 'arrest': for (const t of ['Is this about the purse?', 'There must be some mistake, officer.', 'You\'ll have to catch me.']) add(t, 'plain', 1, c2 => { setTimeout(() => lf2ArrestDialog(c2.o, c2.p), 0); return null; }); break;
  }
  return out;
}
/** somebody else's secret: told only if they trust you enough */
function cvOtherSecret(c, q): CvUtt {
  const w = cvWilling(c, 0.75, 'qsec' + q.id); if (w !== 'yes') return { text: cvDeflectLine(c.o, c.p), hooks: [{ k: 'avoid', key: 'avoid:qsec' + q.id, label: 'that', extra: { k: 'secret', key: 'qsec' + q.id, label: 'that', q } }] };
  return cvTellPerson(c, { key: 'pe' + q.id, kind: 'person', q, sens: 0.25 }, 3) || cvU('No. It isn\'t mine to tell. I shouldn\'t have started.');
}
/** "Who is it?": the crush, if they trust you */
function cvLoveWho(c): CvUtt {
  const q = c.o.crush != null ? byId(c.o.crush) : null; if (!q || q.dead) return cvU(pk(['Nobody. It\'s nothing. Forget it.', 'I don\'t know what you mean.']));
  if (cvWilling(c, 0.5, 'stlove') === 'yes') return cvU(cvPkQ(c, ['…{Q}. There. Don\'t you dare.', 'If you must know: {Q}. Now forget I said it.', '{Q}. Don\'t laugh. Please don\'t laugh.'], q), [cvPersonHook(q)]);
  return cvU(pk(['I won\'t say. I don\'t want to jinx it.', 'Somebody. That\'s all you get.', 'Ha. No. Nice try.']));
}
/** a line the player says about the person they are talking to: their name becomes "you" */
function cvToYou(txt: string, o): string { if (!o || !txt) return txt; return txt.replace(new RegExp('^' + o.first + "'s\\b"), 'Your').replace(new RegExp('\\b' + o.first + "'s\\b", 'g'), 'your').replace(new RegExp('^' + o.first + '\\b'), 'You').replace(new RegExp('\\b' + o.first + '\\b', 'g'), 'you'); }
/* answers drawn from the event itself: where, when, who */
const cvDayWord = (t: number) => { const d = Math.floor(game.time / 1440) - Math.floor(t / 1440), hh = (t % 1440) / 60, part = hh < 11 ? 'in the morning' : hh < 17 ? 'in the afternoon' : hh < 21 ? 'towards evening' : 'late at night'; return (d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : d + ' days ago') + ' ' + part; };
function cvEvWhere(c, ev): CvUtt { const hooks: CvHook[] = [{ k: 'event', key: 'ev' + ev.id, label: 'that', ev }]; return { text: ev.place ? cvQ(pk(['By {pl}, I heard. Of all places.', 'Round {pl}. Everything happens round {pl}.', 'At {pl}. In broad daylight, too.']), null, { pl: cvPlace(ev.place) }) : 'Out in the open, which is the part I can\'t get over.', hooks }; }
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
    case 'saw': { const tq = h.extra && byId(h.extra.target), tp = tq ? cvPron(tq) : { He: 'They' }; add(`${tp.He} had it coming.`, 'joke', 1, c2 => cvU(c2.landed ? pk(['Ha! Probably.', 'Ha! I didn\'t say that. But ha.']) : pk(['That\'s not for me to say.', 'Hm. Nobody has it coming. Mostly.']))); add('I only needed to get past.', 'answer', 1, c2 => ({ text: pk(['Next time, say excuse me. It works wonders.', 'Fair enough. The lanes are narrow.']), hooks: [] })); add('Don\'t tell anyone, please.', 'confide', 0.8, c2 => ({ text: pk(['Who would I tell? …Don\'t answer that.', 'Your secret\'s safe. It isn\'t much of a secret.']), hooks: [] })); break; }
    case 'suspect': add('That wasn\'t me.', 'lie', 1, c2 => cvDeny(c2, h)); add('It was me. I\'m not proud of it.', 'confide', 1, c2 => cvConfess(c2, h)); add('Prove it.', 'accuse', 0.8, c2 => cvDefy(c2, h)); add('There\'s more to it than they say.', 'answer', 0.9, c2 => ({ text: 'There always is. Tell me, then. I\'m listening.', hooks: [h] })); break;
    case 'helped': add('It was nothing.', 'answer', 1, c2 => ({ text: pk(['It wasn\'t nothing. That\'s why I\'m saying it.', 'Don\'t argue with me. I\'m grateful and I\'m going to be about it.']), hooks: [] })); add('Anyone would have.', 'answer', 0.8, c2 => ({ text: 'No. They wouldn\'t. That\'s rather the point.', hooks: [] }));
      add('You can repay me with a story.', 'joke', 0.7, c2 => { const u = cvPivotUtt(c2, h, true); return u.end ? u : { text: pk(['A story? All right. ', 'Ha! All right, here\'s one. ']) + u.text, hooks: u.hooks }; }); break;
    case 'heard': add('Yes, that was me.', 'answer', 1, c2 => cvOwnUp(c2, h)); add('That\'s not how it happened.', 'lie', 0.8, c2 => cvDeny(c2, h)); if (h.ev) add('Who told you that?', 'probe', 0.9, c2 => cvWhoToldMe(c2, h.ev)); break;
    case 'liked': add('That\'s kind of you to say.', 'praise', 1, c2 => ({ text: 'It\'s simply true. Try not to spoil it.', hooks: [] })); add('And what do they say about you?', 'tease', 0.8, c2 => cvTheySayOfMe(c2)); break;
    case 'disliked': add('What are they saying?', 'ask', 1.2, c2 => cvWhatTheySay(c2)); add('Let them. I know what I am.', 'answer', 0.8, c2 => ({ text: pk(['Hm. I hope you do.', 'Good. That sort of confidence is useful. Or doomed.']), hooks: [] })); break;
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
  if (o.energy < 32) { add('You look a little tired. Everything all right?', 'sympathize', 1.2, c2 => cvStateSay(c2, 'tired')); add('Long night?', 'ask', 1, c2 => cvStateSay(c2, 'tired')); add('Well, you look terrible today.', 'insult', 0.5, c2 => cvObsAns(c2, 'worse')); }
  if (o.hunger > 60) { add('Have you eaten anything today?', 'sympathize', 1, c2 => cvStateSay(c2, 'hungry')); add('That stomach\'s louder than you are.', 'tease', 0.7, c2 => cvStateSay(c2, 'hungry')); }
  if (o.clean != null && o.clean < 35) { add('Been to the baths lately?', 'tease', 0.9, c2 => cvObsAns(c2, 'baths')); add('There\'s a certain aroma about you today.', 'insult', 0.4, c2 => cvObsAns(c2, 'aroma')); }
  if (o.mood < 38) { add('Having a rough day?', 'sympathize', 1.2, c2 => cvStateSay(c2, 'low')); add('Who stole your breakfast?', 'tease', 0.8, c2 => cvStateSay(c2, 'low')); }
  if (o.mood > 78) { add('You\'re in a good mood. What happened?', 'ask', 1.2, c2 => cvStateSay(c2, 'high')); add('Did somebody give you gold, or did you win the goose?', 'tease', 0.8, c2 => cvStateSay(c2, 'high')); }
  if (c.turns < 2 && o.hat && o.hat !== 'none') add(`That's a fine ${o.hat === 'cap' ? 'cap' : 'hat'}.`, 'praise', 0.6, c2 => cvObsAns(c2, 'hat'));
  if (o.toolQ != null && o.toolQ < 40 && o.job) add(`That ${cvToolNoun(o)} has seen better days.`, 'tease', 0.9, c2 => cvStateSay(c2, 'tool'));
  if (o.preg) add('You look well. When\'s the baby due?', 'ask', 1.1, c2 => cvStateSay(c2, 'baby'));
  if (!out.length && c.turns < 3) { add('You look different today. Did something happen?', 'ask', 0.5, c2 => cvObsAns(c2, 'different')); add('You look well.', 'praise', 0.5, c2 => cvObsAns(c2, 'well')); add('Well, you look like you\'ve seen better days.', 'insult', 0.2, c2 => cvObsAns(c2, 'worse')); }
  return out;
}
function cvStateSay(c, id) { const t = { key: 'st' + id, kind: 'state', id, sens: 0.1 }; const u = cvTell(c, t, c.told['st' + id] ? 1 : 0); return u || null; }

/* ---------------- things you can bring up yourself ---------------- */
function cvEventsAbout(c, q) { return Object.keys(c.p.kn || {}).map(id => lf2EvById(+id)).filter(ev => ev && !(c.gossiped && (c.gossiped[ev.id] || c.gossiped['t:' + ev.text])) && ev.actor === q.id && c.p.kn[ev.id] && c.p.kn[ev.id].a && !(c.o.kn && c.o.kn[ev.id] && c.o.kn[ev.id].a) && game.time - ev.t < 5 * 1440).sort((a, b) => b.t - a.t)[0] || null; }
const cvNewsToTell = c => Object.keys(c.p.kn || {}).map(id => lf2EvById(+id)).filter(ev => ev && !(c.gossiped && (c.gossiped[ev.id] || c.gossiped['t:' + ev.text])) && ev.actor !== c.o.id && ev.target !== c.o.id && ev.actor !== c.p.id && ev.target !== c.p.id && !new RegExp('\\b' + c.o.first + '\\b').test(ev.text) && game.time - ev.t < 4 * 1440 && !(c.o.kn && c.o.kn[ev.id] && (c.o.kn[ev.id].a || !c.p.kn[ev.id].a))).filter((ev, i, a) => a.findIndex(x => x.text === ev.text) === i).slice(-6).reverse();
function cvShare(c): CvOpt[] {
  const out: CvOpt[] = [], p = c.p, o = c.o, list = cvNewsToTell(c);
  if (list.length) { const ev = list[0], txt = lf2Low(cvMe(c.p, sbText(c.p, ev))).replace(/\.$/, ''), lead = cvFreshest(p, ['Did you hear? {T}.', 'Have you heard? {T}.', 'You\'ll never guess. {T}.', 'Here\'s something: {t}.', 'I heard {t}.', 'Word is {t}.', 'Somebody told me {t}.']); out.push({ text: lead.replace('{T}', cvCap(txt)).replace('{t}', txt), intent: 'gossip', w: 0.9, hook: { k: 'world', key: 'sh', label: 'that' }, then: c2 => cvGossipTell(c2, ev) }); }
  const K = cvKnows(p).back; for (const id in K) { const b = cvWorld().back.find(x => x.id === +id); if (!b || b.a === o.id || b.b === o.id || b.knownBy.includes(o.id)) continue; const A = byId(b.a), B = byId(b.b); if (!A || !B) continue;
    out.push({ text: b.kind === 'debt' ? pk([`I heard ${A.first} owes ${B.first} money.`, `Is it true ${A.first} owes ${B.first} a pile?`]) : b.kind === 'feud' ? pk([`Is it true ${A.first} and ${B.first} aren't speaking?`, `What's going on between ${A.first} and ${B.first}? They won't look at each other.`]) : pk([`I heard ${A.first} and ${B.first} were once… close.`, `Were ${A.first} and ${B.first} ever sweet on each other?`]), intent: 'gossip', w: 0.7, hook: { k: 'world', key: 'sh' + id, label: 'that' }, then: c2 => cvBackGossip(c2, b) }); break; }
  return out;
}
function cvDirt(c) { return Object.keys(c.p.kn || {}).map(id => lf2EvById(+id)).filter(ev => ev && ev.actor === c.o.id && c.p.kn[ev.id].a && !ev.fake && ev.tags.some(t => ['crime', 'affair', 'scandal', 'theft'].includes(t)) && !(c.o.lf2Paid && c.o.lf2Paid[ev.id])); }
function cvSpecial(c): CvOpt[] {
  const o = c.o, p = c.p, out: CvOpt[] = [], h: CvHook = { k: 'world', key: 'sp', label: 'that' };
  if (cvDirt(c).length && c.close !== 'stranger') { out.push({ text: 'I know what you did. I think we should talk about it.', intent: 'blackmail', w: 0.5, hook: h, then: c2 => cvBlackmail(c2) }); out.push({ text: 'Whatever you did, I won\'t breathe a word.', intent: 'mercy', w: 0.6, hook: h, then: c2 => cvMercy(c2) }); }
  if (town.tavern && lf2InRoom(p, town.tavern) && p.coin >= 3 && o.coin >= 3 && c.close !== 'cold') { out.push({ text: 'Fancy a hand of dice? Three denarii a throw.', intent: 'plain', w: 1.1, hook: h, then: c2 => cvDice(c2, false) }); out.push({ text: 'I brought my own dice. For luck.', intent: 'cheat', w: 0.4, hook: h, then: c2 => cvDice(c2, true) }); }
  if (lf2Single(o) && lf2Single(p) && o.female !== p.female && c.aff >= 10 && c.close !== 'cold') out.push({ text: pick1(['You are very easy to talk to. Among other things.', 'Do you always look this good, or is it for my benefit?', 'If I asked you to the bonfire, would you say yes?']), intent: 'flirt', w: 0.7, hook: h });
  if (!c.asked.village) out.push({ text: pick1(['Anything strange going on round here lately?', 'What\'s the word in the village? Nobody tells me anything.', 'What\'s the news?', 'Heard anything good lately?', 'What\'s everyone talking about?', 'Anything happening that I should know about?']), intent: 'ask', w: 0.8, hook: h, then: c2 => { c2.asked.village = 1; return cvVillageWord(c2); } });
  if (!c.asked.you) out.push({ text: pick1(['Tell me about yourself. Properly.', 'What\'s a day like for you, really?', 'What do you want out of life? Honestly.', 'What are you proud of?', 'I feel like I hardly know you. Tell me something.']), intent: 'ask', w: 0.6, hook: h, then: c2 => { c2.asked.you = 1; const L = cvLife(c2.o), keys = ['amb', 'pri', 'fea'], t = cvPool(c2).filter(x => keys.includes(x.key)); const tt = t.length ? t[Math.floor(Math.random() * t.length)] : null; return tt ? cvTell(c2, tt, 0) : null; } });
  return out;
}

/* ---------------- choosing your options ---------------- */
function cvOptions(c, utt: CvUtt): CvOpt[] {
  if (utt.end || c.activity === 'privy') return [];
  let follow: CvOpt[] = []; for (const h of utt.hooks) follow.push(...cvFollowUps(c, h));
  let obs: CvOpt[] = cvObserve(c).map(x => ({ ...x, w: x.w * 0.55 })), steer: CvOpt[] = [...cvAskAbout(c), ...cvShare(c).filter(x => !c.asked['s:' + x.text]).map(x => ({ ...x, w: x.w * 0.8 })), ...cvSpecial(c)];
  const sh = c.shownText || (c.shownText = {}), past = c.mem.opts || {}, ok = (o: CvOpt) => !c.usedOpt[o.text] && (sh[o.text] || 0) < 2, fresh = (o: CvOpt) => !(past[o.text] && game.time - past[o.text] < 2 * 1440);
  const prune = (arr: CvOpt[]) => { arr = arr.filter(ok); const f = arr.filter(fresh); return f.length >= Math.min(2, arr.length) ? f : arr; };
  follow = prune(follow); obs = prune(obs); steer = prune(steer);
  const used = new Set<string>(), picked: CvOpt[] = [], seen = c.shown || (c.shown = {}), byW = (arr: CvOpt[]) => arr.map(x => ({ x, s: x.w * (0.6 + Math.random() * 0.8) * Math.pow(0.3, seen[x.fam || x.intent] || 0) })).sort((a, b) => b.s - a.s).map(y => y.x);
  const take = (arr: CvOpt[], pred?: (o: CvOpt) => boolean) => { for (const o of byW(arr)) { if (pred && !pred(o)) continue; if (used.has(o.text)) continue; used.add(o.text); picked.push(o); return true; } return false; };
  const newCls = (o: CvOpt) => !picked.some(p => cvCls(p.intent) === cvCls(o.intent));
  // what they just said, asked about; the same subject, another way; and something of your own to bring up
  if (follow.length) take(follow, o => cvCls(o.intent) === 'inquisitive');
  if (!take(follow, newCls)) take(obs, newCls);
  if (!take(steer, o => cvCls(o.intent) !== 'hostile' || (c.turns > 0 && Math.random() < 0.3))) take(follow.concat(obs), newCls);
  if (picked.length < 3) take(follow.concat(obs, steer), o => !picked.some(p => p.intent === o.intent));
  if (picked.length < 3 && !follow.length) take(steer);
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
      c.landed = ok; if (ok) { lfAff(o, p, 2); c.warmth += 1; cvNote(o, p, 'joke', text); return { react: cvReactLine(o, p, 'funny') }; } lfAff(o, p, -1); cvNote(o, p, 'tease', text); return { react: opt.intent === 'tease' ? pk(['…Funny.', 'Hm. If you say so.', 'That was meant to be funny, was it?']) : pk(['…Right.', 'Hm.']) }; }
    case 'flirt': { const ok = aff > 30 || (aff > 15 && Math.random() < 0.3); c.landed = ok; lfAff(o, p, ok ? 5 : -2); if (ok && Math.random() < 0.4) o.crush = p.id; lfEmit('flirt', { actor: p, target: o, sev: 1, tags: ['romance'], chron: false, text: `${p.first} was flirting with ${o.first}` }); cvNote(o, p, 'flirt', text); return { react: cvReactLine(o, p, ok ? 'flirtok' : 'flirtno') }; }
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
  c.turns++; c.usedOpt[opt.text] = 1; c.lastIntent = opt.intent; (c.mem.opts || (c.mem.opts = {}))[opt.text] = game.time;
  { const h = opt.hook, k = h && (h.k === 'avoid' ? h.extra && h.extra.key : h.key), deeper = !!k && cvCls(opt.intent) === 'inquisitive' && !['act', 'world', 'question', 'leaving', 'cold'].includes(h.k);
    if (deeper && k === c.threadKey) c.thread++; else c.thread = 0; c.threadKey = deeper ? k : null; } if (opt.intent === 'gossip') c.asked['s:' + opt.text] = 1; cvSync(c);
  const fx = cvEffect(c, opt); if (fx.end) return { text: fx.react || '…', hooks: [], end: true };
  let body: CvUtt | null | undefined;
  if (opt.then && fx.react && cvCls(opt.intent) !== 'hostile' && opt.intent !== 'flirt') fx.react = '';
  if (opt.then) { body = opt.then(c); if (body === null && (opt.hook && opt.hook.k === 'arrest' || !opt.hook)) return null; }
  else if (opt.hook) body = cvContinue(c, opt);
  if (!body) body = cvPivotUtt(c, opt.hook);
  if (!body.text && !fx.react) body = cvPivotUtt(c, opt.hook);
  if (body && body.end) return { text: [fx.react, body.text].filter(Boolean).join(' '), hooks: [], end: true };
  return cvClose(c, { text: [fx.react, body.text].filter(Boolean).join(' '), hooks: body.hooks });
}
function cvContinue(c, opt: CvOpt): CvUtt | null {
  const h = opt.hook, cls = cvCls(opt.intent), o = c.o;
  if (h.k === 'avoid') { const orig = h.extra as CvHook; if (opt.intent === 'press') c.pressed[orig.key] = (c.pressed[orig.key] || 0) + 1; else if (opt.intent === 'sympathize') c.warmth += 2; else return cvPivotUtt(c, orig); return cvDeepen(c, orig, c.depth[orig.key] === undefined ? 0 : c.depth[orig.key] + 1); }
  if (cls === 'inquisitive' || cls === 'warm' || opt.intent === 'confide') { if (opt.intent === 'doubt' && h.k === 'person') return cvDeepen(c, h, (c.depth[h.key] || 0) + 1); return cvDeepen(c, h, c.depth[h.key] === undefined ? 1 : c.depth[h.key] + 1); }
  if (cls === 'playful' || cls === 'hostile') return { text: '', hooks: [h] };
  return cvPivotUtt(c, h);
}
function cvDeepen(c, h: CvHook, layer: number): CvUtt | null {
  const t = cvTopicOf(h), max = CV_MAXLAYER[h.k] === undefined ? 1 : CV_MAXLAYER[h.k]; if (layer > max) return cvPivotUtt(c, h);
  const w = cvWilling(c, t.sens + 0.08 * layer, h.key), o = c.o, p = c.p;
  if (w === 'no') {
    if (cvSlips(c)) { const u = cvTell(c, t, layer); if (u) return { text: `${u.text} …I should not have said that.`, hooks: u.hooks }; }
    if (['smooth', 'wary', 'prickly'].includes(c.v.arch) && (h.k === 'secret' || h.k === 'back') && Math.random() < 0.45) { c.mem.lied[h.key] = 1; const ln = cvFreshest(p, ['There is nothing to tell. You have been listening to gossip.', 'I do not know what you have heard. It is not true.', 'Whoever told you that wants something from you.', 'That is an old story, and a wrong one.', 'You have the wrong person, I am afraid.']); cvMarkHeard(p, ln); return { text: ln, hooks: [{ k: 'avoid', key: 'avoid:' + h.key, label: h.label, extra: h }] }; }
    return { text: cvDeflectLine(o, p), hooks: [{ k: 'avoid', key: 'avoid:' + h.key, label: h.label, extra: h }] };
  }
  const u = cvTell(c, t, layer); if (!u) return cvPivotUtt(c, h);
  if (w === 'hint') { const first = u.text.split(/(?<=[.!?])\s/)[0]; if (first.length >= 40 && first !== u.text) u.text = first + ' ' + cvFreshest(p, ['That\'s all I\'ll say for now.', 'The rest can wait.', 'I\'ll leave it there.']);
    else return { text: cvFreshest(p, ['There\'s more to it. Ask me another day.', 'Not today. Maybe when I know you better.', 'Some of it isn\'t mine to tell. Not yet.']), hooks: [{ k: 'avoid', key: 'avoid:' + h.key, label: h.label, extra: h }] }; }
  return u;
}
function cvPivotUtt(c, h?: CvHook, plain?: boolean): CvUtt {
  const o = c.o, pool = cvPool(c); c.pool = pool;
  const rel = (t: CvTopic) => { let w = t.w; if (h) { if (h.q && (t.q === h.q || (t.back && (t.back.a === h.q.id || t.back.b === h.q.id)) || (t.ev && (t.ev.actor === h.q.id || t.ev.target === h.q.id)))) w *= 4; if (h.ev && t.q && (t.q.id === h.ev.actor || t.q.id === h.ev.target)) w *= 4; if (h.k === t.kind) w *= 1.3; } return w; };
  if (pool.length) { let tot = 0; const ws = pool.map(t => { const w = Math.max(0.02, rel(t) * (t.sens > cvOpenness(c) + 0.3 ? 0.2 : 1)); tot += w; return w; }); let r = Math.random() * tot, pickT = pool[0]; for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) { pickT = pool[i]; break; } }
    const u = cvTell(c, pickT, 0); if (u) return { text: (plain ? '' : cvBridge(c, h, pickT, u.text)) + u.text, hooks: u.hooks }; }
  const qs = VX.ask.filter(x => !c.asked['q' + x.id] && !(c.mem.asked || {})[x.id]); if (qs.length) { const q = anyOf(qs); c.asked['q' + q.id] = 1; (c.mem.asked || (c.mem.asked = {}))[q.id] = game.time; return { text: q.say.replace('{p}', c.p.first), hooks: [{ k: 'question', key: 'q:' + q.id, label: 'that', id: q.id }] }; }
  return { text: pk(['I\'ve talked your ear off. Come back when I\'ve more to say.', 'That\'s all I have. You\'ve had the best of me today.']), hooks: [], end: true };
}
/** the words that carry a conversation to a new subject: none when the new one is plainly news or a question, a link when it shares a person,
    otherwise the speaker's own way of moving on, used sparingly */
function cvBridge(c, h: CvHook | undefined, t: CvTopic, text: string): string {
  const o = c.o, q = t.q || (t.ev && lf2By(t.ev.actor)) || null, same = h && q && (h.q === q || (h.ev && (h.ev.actor === q.id || h.ev.target === q.id)));
  if (/^(Did you hear|Have you heard|Oh, you have not heard|Well!|You will have heard|Word is)/.test(text) || /\?$/.test(text.split(/(?<=[.!?])\s/)[0])) return '';
  if (same && !new RegExp('^' + q.first + '\\b').test(text)) return cvFreshest(c.p, [`Talking of ${q.first}.`, `While we're on ${q.first}.`, `That reminds me, about ${q.first}.`]) + ' ';
  if (Math.random() < 0.45) return '';
  const ln = cvPivotLine(o); return ln ? ln + ' ' : '';
}
const CV_BYE: any = { _: ['Right. I\'d better get on.', 'Anyway. Things to do.', 'Well. I\'ll see you about.', 'I should get back to it.', 'Come and find me another day.', 'Mind how you go.', 'That\'s me, then.', 'I\'d best be off.', 'Look at the time. Well, the sun.', 'Good talking to you.', 'Off I go.', 'Until next time, then.'], talkative: ['That\'s enough of my chatter for one day.', 'Listen to me, going on. Off you go.', 'I could talk all day. I nearly have.'], reserved: ['Well.', 'That\'s all.', 'I\'ll be off.'], nosy: ['Come back when you\'ve heard something.', 'Off you go. Bring me news.'], cynic: ['Right. Back to the misery.', 'Well. This was tolerable.'], sunny: ['Lovely to see you! Come again soon.', 'Oh, this was nice. Mind how you go!'], wary: ['I should go. People will wonder.', 'I\'d better get on before anyone notices.'], prickly: ['Right. Enough.', 'Off you go, then.'], smooth: ['Always a pleasure. Until next time.', 'Do come again. I mean it, mostly.'], lonely: ['Will you come again? You don\'t have to say.', 'Thank you for stopping. Really.'] };
/** now and then they have somewhere to be; they say so, and you can go with them */
function cvClose(c, u: CvUtt): CvUtt {
  if (u.end) return u;
  if (u.hooks.some(h => h.k === 'tellit' || h.k === 'question') && c.turns < c.cap + 4) return u;   // they have just asked you something: they wait for the answer
  if (c.turns >= c.cap + Math.min(3, c.thread) && c.activity !== 'privy') { c.leaving = true;
    const more = c.thread > 0 ? ['There is more to that, but not today.', 'Ask me the rest another time.'] : [];
    const bye = cvFreshest(c.p, more.length && Math.random() < 0.6 ? more : (CV_BYE[c.v.arch] || []).concat(CV_BYE._)); cvMarkHeard(c.p, bye);
    return { text: u.text + ' ' + bye, hooks: [], end: true }; }
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
  else if (ans === 'VISIT') { const m = (c.status || '').match(/(?:with|see) (\w+)/), q = m && npcs.find(x => x.first === m[1] && !x.dead); t = q ? cvQ(pk(['{Q}. {He} asked me round, and you don\'t say no to {Q}.', '{Q}. We\'re overdue a talk.', '{Q}, if {he}\'s in. {He} usually is.']), q) : 'Nobody you\'d know.'; if (q) return { text: t, hooks: [cvPersonHook(q), { k: 'act', key: 'act', label: 'that' }] }; }
  else if (ans === 'PLANS') { const h = (game.time % 1440) / 60; t = pk(h < 11 ? ['Work, mostly. Then more work. Then supper, if I\'ve earned it.', 'Whatever needs doing first. Then whatever needs doing second.'] : h < 17 ? ['Same as this morning, but slower.', 'Finishing what I started this morning. In theory.'] : ['Supper, then bed. I\'m living the dream.', 'As little as possible, if I can get away with it.']); }
  else if (ans === 'MOOD') t = o.mood < 35 ? 'Could be better. Could be a lot better.' : o.mood > 70 ? 'Better than most, to be honest.' : 'Fine. Ordinary. I will take ordinary.';
  else t = cvVillageWord(c).text;
  return { text: t, hooks: [{ k: 'act', key: 'act', label: 'that' }] };
}
const cvFeed = c => { lf2GiveFood(c.p, c.o); cvNote(c.o, c.p, 'offer', 'a meal'); return { text: pk(['Oh, bless you. I was about to chew my sleeve.', 'Thank you. I will not forget that.']), hooks: [] as CvHook[] }; };
const cvCoin = (c, q) => { if (c.p.coin < q) return { text: 'You do not have ' + q + ' denarii on you. Kind thought, though.', hooks: [] as CvHook[] }; lf2Give(c.p, c.o, q); cvNote(c.o, c.p, 'offer', q + ' denarii'); c.mem.trust += 4; return { text: pk(['Are you sure? Thank you. I will not forget it.', 'That is… generous. Thank you.']), hooks: [] as CvHook[] }; };
function cvMatch(c, q) { const k = c.o.know[q.id] || 0; lfAff(c.o, q, 6); bumpKnow(c.o, q, 15); c.o.lf2Seek = q.id; return { text: cvQ(k < 8 ? pk(['Maybe. I hardly know {him}. I\'ll say hello at the well and see.', '{Q}? We\'ve barely spoken. All right. I\'ll try.']) : pk(['{Q}? I should talk to {him} more. You may be right.', 'Hm. {Q}. I\'ll make the effort. Don\'t make a fuss about it.']), q), hooks: [cvPersonHook(q)] }; }
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
  { const ko = o.kn && o.kn[ev.id]; if (ko && known) { ko.a = true; ko.who = k.who != null ? k.who : ev.actor; delete ko.sus; } }   // you said the name: it arrives with the name
  const a = known && ev.actor ? lf2By(ev.actor) : null, hooks: CvHook[] = [{ k: 'event', key: 'ev' + ev.id, label: cvLabel({ kind: 'event', ev }), ev }]; if (a && a !== o) hooks.push(cvPersonHook(a));
  c.told['ev' + ev.id] = 1; cvMem(o, p).topics['ev' + ev.id] = game.time; const f = cvEvFacts(c, ev, { a: known, from: null, mine: false }); return { text: cvRule('gossip.react', f, p) || cvStanceLine(o, stance), hooks };
}
function cvBackGossip(c, b): CvUtt {
  const o = c.o, hooks: CvHook[] = [{ k: 'back', key: 'bk' + b.id, label: cvLabel({ kind: 'back', back: b }), back: b }]; const A = byId(b.a), B = byId(b.b); hooks.push(cvPersonHook(A), cvPersonHook(B));
  if (!b.knownBy.includes(o.id)) b.knownBy.push(o.id); c.told['bk' + b.id] = 0; cvMem(o, c.p).topics['bk' + b.id] = game.time;
  const near = o.aff[A.id] > 40 || o.aff[B.id] > 40; return { text: near ? cvPkQ(c, ['Who told you that? That isn\'t for repeating.', 'You shouldn\'t carry that around. It\'ll hurt someone.', 'Careful. Those are my friends you\'re talking about.', 'I\'d keep that to yourself, if I were you. I mean it.', 'Where did you hear that? …Never mind. I don\'t want to know.']) : cvPkQ(c, ['So that\'s getting round. I thought only a few knew.', 'You\'ve heard that too. This village has no walls.', 'Old news, that. Older than you\'d think.', 'Ha! Everyone knows. Nobody says. That\'s the rule.', 'Is that what they\'re saying now? Well. It isn\'t wrong.']), hooks };
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
  { const said = c.saidS || (c.saidS = {}), ss = u.text.split(/(?<=[.!?…])\s+/), keep = ss.filter(x => x.length <= 12 || !said[x]); if (keep.length && keep.length < ss.length) u = { ...u, text: keep.join(' ') }; for (const x of ss) said[x] = 1; }
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
