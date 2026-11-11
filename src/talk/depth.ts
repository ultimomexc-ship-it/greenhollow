/* Conversation depth (docs/talk-engine.md, 6.2, 6.3, 6.5, 5.4 and the act catalogue): topics that link or start afresh ("Speaking of which" / "Anyway"), stories with a preface and an invitation,
   callbacks to what was said last time, daily reflection (patterns become opinions), and the small acts that make up an ordinary talk: a joke, a thought aloud, asking about work, asking where somebody is,
   a warning, advice, a proud parent, where I came from. The same for everybody. */

/* ---- topic links ---- */
const talkSubject = (c: any): string | null => c.aboutName || c.lifeItem || null;
const LX_LINKS: any = {
  plain: { linked: ['Speaking of which, ', 'On that note, ', 'And while we are on it, '], fresh: ['Anyway. ', 'Oh, and ', 'Changing the subject: '] },
  island: { linked: ['Related to that, ', 'On that subject, ', 'Staying with it for a moment, '], fresh: ['Anyway. ', 'Unrelated, but ', 'On a different note, '] }
};
function lxLink(text: string, link: string): string {
  const pk = (typeof town !== 'undefined' && town && town.pack) || 'plain', L = (LX_LINKS[pk] || LX_LINKS.plain)[link]; if (!L || !text) return text;
  const pre = L[Math.floor(Math.random() * L.length)], w0 = text.split(/[ ,.!?]/)[0];
  const keep = /[.:] $/.test(pre) || w0 === 'I' || /^I'/.test(text) || npcs.some((n: any) => n.first === w0);
  return pre + (keep ? text : text.charAt(0).toLowerCase() + text.slice(1));
}
/** called by talkTurn after a topic act: is this about the same thing as the last topic, or a fresh start? */
function talkLinkOf(c: any): string {
  const subj = talkSubject(c), prev = c.lastSubj; c.nTopics = (c.nTopics || 0) + 1; if (subj) c.lastSubj = subj;
  if (c.nTopics < 2) return ''; if (subj && prev && subj === prev) return Math.random() < 0.7 ? 'linked' : ''; return Math.random() < 0.4 ? 'fresh' : '';
}

/* ---- stories: preface, invitation, body, reaction ---- */
ACTS.story_preface = { kind: 'world', stage: 'topic', preview: () => ({}), w: () => 1.6,
  when: (c: any, sp: any, li: any) => { if (c.done.story_preface || (c.done.share_news || 0) >= 2) return false; const pk = TE.pick(sp, li, c); if (!pk || pk.m.imp < 0.55) return false; c.storyNews = pk; return true; },
  apply: (c: any) => { c.done.story_preface = 1; }, replies: ['story_invite'] };
ACTS.story_invite = { kind: 'world', stage: 'topic', reply: true, when: (c: any) => !!c.storyNews, w: () => 1, apply: () => {}, replies: ['share_news'] };
lx('story_preface', 'plain', 'You won\'t believe what I heard.'); lx('story_preface', 'plain', 'Have you got a minute? I\'ve something to tell you.'); lx('story_preface', 'plain', 'Sit down for this one.');
lx('story_invite', 'plain', 'Go on.'); lx('story_invite', 'plain', 'What? Tell me.'); lx('story_invite', 'plain', 'I\'m listening.');
lxi('story_preface', 'I have something to tell you. It is long by the standards of today.'); lxi('story_preface', 'You may want to stand still for this.'); lxi('story_preface', 'I heard something. I have been carrying it around since.');
lxi('story_invite', 'Go on. I have time. I always have time.'); lxi('story_invite', 'Please. Go ahead.'); lxi('story_invite', 'Yes. Tell me. I would like to know.');

/* ---- callbacks: what we said last time ---- */
const lastTalkMem = (sp: any, li: any) => { const mem = sp.tmem || []; for (let i = mem.length - 1; i >= 0; i--) if (mem[i].kind === 'talked' && mem[i].with === li.id) return mem[i]; return null; };
ACTS.callback = { kind: 'small', stage: 'topic', preview: (c: any, sp: any, li: any) => { const m = lastTalkMem(sp, li); return { about: m ? m.subj : '' }; }, w: () => 1.4,
  when: (c: any, sp: any, li: any) => { if (c.done.callback) return false; const m = lastTalkMem(sp, li); return !!m && !!m.subj && !m.called && game.time - m.t > 120 && game.time - m.t < 2880; },
  apply: (c: any, sp: any, li: any) => { const m = lastTalkMem(sp, li); m.called = true; c.done.callback = 1; c.aboutName = m.subj; }, replies: ['callback_answer'] };
ACTS.callback_answer = { kind: 'small', stage: 'topic', reply: true, when: () => true, w: () => 1, apply: () => {}, replies: [] };
lx('callback', 'plain', 'Last time we spoke you brought up {about}. Any news?'); lx('callback', 'plain', 'You mentioned {about} the other day. How did that go?');
lx('callback_answer', 'plain', 'Much as it was. Thank you for asking.'); lx('callback_answer', 'plain', 'Oh, that. It rumbles on.');
lxi('callback', 'Last time you mentioned {about}. I have been thinking about it, in the background.'); lxi('callback', 'You brought up {about} before. I remembered. Is there anything new?');
lxi('callback_answer', 'It is much as it was. Thank you for remembering. People do not, usually.'); lxi('callback_answer', 'There is no news. That is also a kind of news.');

/* ---- reflection: patterns become opinions ---- */
function reflect(n: any) {
  if (n.dead || n.infant || !n.why) return; const R = n.refl || (n.refl = {});
  for (const id of Object.keys(n.why)) {
    const L = n.why[id]; if (L.length < 2) continue; let pos = 0, neg = 0; for (const e of L) { if (PEOPLE_GENERIC.includes(e.why)) continue; if (e.v > 0) pos += e.v; else neg += e.v; }
    const o = byId(+id); if (!o || o.dead) continue; const w = neg < -8 && neg < -pos ? 'unkind' : pos > 8 && pos > -neg ? 'good' : '';
    if (w && (!R[id] || R[id].w !== w)) { R[id] = { w, t: game.time }; TM.add(n, { kind: 'inferred', about: o.id, trait: w, conf: 0.8, imp: 0.5 }); }
  }
}
LF2.hourly.push((h: number) => { if (h === 3) for (const n of npcs) reflect(n); });

/* ---- the small acts of an ordinary talk ---- */
ACTS.joke = { kind: 'small', stage: 'topic', preview: () => ({}), w: (c: any, sp: any) => 0.6 + (talkHas(sp, 'jovial') || talkHas(sp, 'cheerful') ? 1.2 : 0), when: (c: any, sp: any) => !c.done.joke && (sp.mood == null || sp.mood > 40), apply: (c: any) => { c.done.joke = 1; }, replies: ['laugh', 'groan'] };
ACTS.laugh = { kind: 'small', stage: 'topic', reply: true, when: () => true, w: (c: any, sp: any) => 1 + (talkHas(sp, 'jovial') ? 1 : 0), apply: (c: any, sp: any, li: any) => { lfAff(sp, li, 0.5, 'made me laugh'); sp.mood = Math.min(100, (sp.mood == null ? 50 : sp.mood) + 2); }, replies: [] };
ACTS.groan = { kind: 'small', stage: 'topic', reply: true, when: () => true, w: () => 0.7, apply: () => {}, replies: [] };
ACTS.wonder = { kind: 'small', stage: 'topic', preview: () => ({}), w: () => 0.5, when: (c: any, sp: any) => !c.done.wonder, apply: (c: any) => { c.done.wonder = 1; }, replies: ['wonder_reply'] };
ACTS.wonder_reply = { kind: 'small', stage: 'topic', reply: true, when: () => true, w: () => 1, apply: () => {}, replies: [] };
ACTS.ask_work = { kind: 'person', stage: 'topic', preview: (c: any, sp: any, li: any) => ({ about: li.first }), w: () => 0.8, when: (c: any, sp: any, li: any) => !c.done.ask_work && !!li.job && li.age >= 12 && (sp.know[li.id] || 0) < 60, apply: (c: any, sp: any, li: any) => { c.done.ask_work = 1; c.aboutName = li.first; }, replies: ['answer_work'] };
ACTS.answer_work = { kind: 'person', stage: 'topic', reply: true, when: (c: any, sp: any) => !!sp.job, w: () => 1, apply: () => {}, replies: [] };
ACTS.ask_where = { kind: 'person', stage: 'topic', preview: (c: any) => ({ about: c.whereObj ? c.whereObj.first : '' }), w: () => 0.8,
  when: (c: any, sp: any, li: any) => { if (c.done.ask_where) return false; const X = npcs.find((o: any) => o !== sp && o !== li && !o.dead && !o.infant && o.age >= 12 && (sp.aff[o.id] || 0) > 15 && lfDist(sp, o) > 12); if (!X) return false; c.whereObj = X; return true; },
  apply: (c: any, sp: any, li: any) => { c.done.ask_where = 1; c.aboutName = c.whereObj.first; }, replies: ['tell_where', 'dont_know_where'] };
const whereText = (X: any) => { const pl = String(placeOf(X) || '').replace(/^(in|at)\s+/, ''); return !pl ? 'about somewhere' : /^the /.test(pl) ? 'at ' + pl : 'in ' + pl; };
ACTS.tell_where = { kind: 'person', stage: 'topic', reply: true, preview: (c: any) => ({ about: c.whereObj ? c.whereObj.first : '', reason: c.whereObj ? whereText(c.whereObj) : '' }), when: (c: any, sp: any) => !!c.whereObj && lfDist(sp, c.whereObj) <= 30 && lvlOf(sp.ty) === lvlOf(c.whereObj.ty), w: () => 3, apply: (c: any) => { c.reason = whereText(c.whereObj); }, replies: [] };
ACTS.dont_know_where = { kind: 'person', stage: 'topic', reply: true, when: (c: any, sp: any) => !!c.whereObj && !(lfDist(sp, c.whereObj) <= 30 && lvlOf(sp.ty) === lvlOf(c.whereObj.ty)), w: () => 3, apply: () => {}, replies: [] };
const REP_THIRD: any = { vandal: 'knock things down', meddler: 'move things that are not theirs', thief: 'take what is not theirs', gossip: 'cannot keep a secret', bully: 'throw their weight about' };
ACTS.warn = { kind: 'world', stage: 'topic', preview: (c: any) => ({ about: c.warnOf ? c.warnOf.first : '', reason: c.warnTag ? REP_THIRD[c.warnTag] : '' }), w: (c: any, sp: any) => 1.3,
  when: (c: any, sp: any, li: any) => { if (c.done.warn || (sp.aff[li.id] || 0) < 5) return false; for (const Z of npcs) { if (Z === sp || Z === li || Z.dead || Z.infant) continue; const w = repWord(sp, Z); if (w && REP_THIRD[w] && !repTags(li, Z)[w]) { c.warnOf = Z; c.warnTag = w; return true; } } return false; },
  apply: (c: any, sp: any, li: any) => { c.done.warn = 1; c.aboutName = c.warnOf.first; c.reason = REP_THIRD[c.warnTag]; const Z = c.warnOf; TM.add(li, { kind: 'rumour', about: Z.id, tag: c.warnTag, from: sp.id, conf: 0.6, imp: 0.4 }); lfAff(li, Z, -3, 'was warned about them'); }, replies: ['warn_thanks'] };
ACTS.warn_thanks = { kind: 'world', stage: 'topic', reply: true, when: () => true, w: () => 1, apply: (c: any, sp: any, li: any) => { lfAff(sp, li, 1, 'looked out for me'); }, replies: [] };
ACTS.ask_advice = { kind: 'person', stage: 'topic', preview: () => ({}), w: () => 1.1, when: (c: any, sp: any, li: any) => { if (c.done.ask_advice || !(sp.hunger > 55)) return false; return WORLD.has('feature', 'bakery') || WORLD.has('feature', 'tavern'); }, apply: (c: any) => { c.done.ask_advice = 1; }, replies: ['give_advice'] };
ACTS.give_advice = { kind: 'person', stage: 'topic', reply: true, when: () => true, w: () => 1, apply: () => {}, replies: [] };
ACTS.brag_child = { kind: 'person', stage: 'topic', preview: (c: any) => ({ about: c.kid ? c.kid.first : '', qty: c.kid ? Math.floor(c.kid.age) : '' }), w: () => 0.9, when: (c: any, sp: any, li: any) => { if (c.done.brag_child) return false; const k = (sp.fam.kids || []).map(byId).filter((q: any) => q && !q.dead && q.age < 14)[0]; if (!k) return false; c.kid = k; return true; },
  apply: (c: any) => { c.done.brag_child = 1; c.aboutName = c.kid.first; c.lifeQty = Math.floor(c.kid.age); }, replies: ['congratulate'] };
ACTS.congratulate = { kind: 'person', stage: 'topic', reply: true, when: () => true, w: () => 1, apply: (c: any, sp: any, li: any) => { lfAff(sp, li, 0.5, 'was glad for me'); }, replies: [] };
ACTS.tell_back = { kind: 'person', stage: 'topic', preview: (c: any, sp: any) => ({ about: sp.back || '' }), w: () => 0.9, when: (c: any, sp: any) => !c.done.tell_back && !!sp.back, apply: (c: any, sp: any) => { c.done.tell_back = 1; c.aboutName = sp.back; }, replies: ['tell_back_reply'] };
ACTS.tell_back_reply = { kind: 'person', stage: 'topic', reply: true, when: () => true, w: () => 1, apply: () => {}, replies: [] };

lx('joke', 'plain', 'A man told me his wall was holding up the ceiling. It turned out to be the other way round.'); lx('joke', 'plain', 'I asked the baker for a loaf of yesterday. He said he\'d have it tomorrow.'); lx('joke', 'plain', 'My neighbour talks to his turnips. They\'ve never once disagreed with him.');
lx('laugh', 'plain', 'Ha! That\'s a good one.'); lx('laugh', 'plain', 'Ha. I\'ll remember that.'); lx('groan', 'plain', 'Oh, no. Really?'); lx('groan', 'plain', 'That one has a beard.');
lx('wonder', 'plain', 'I wonder what the sea does when nobody is looking.'); lx('wonder', 'plain', 'I sometimes wonder why the days are all the same length.'); lx('wonder_reply', 'plain', 'Now you\'ve got me wondering.'); lx('wonder_reply', 'plain', 'I couldn\'t say.');
lxi('joke', 'Somebody told me his wall was holding up the ceiling. It was the other way round. He was very calm about it.'); lxi('joke', 'I asked for a loaf of yesterday. They said they would have one tomorrow. I have decided to wait.'); lxi('joke', 'My neighbour talks to his turnips. They have never disagreed with him. I envy that.');
lxi('laugh', 'Ha. Good. I will repeat that to somebody who has not heard it.'); lxi('laugh', 'Ha. That is exactly the right size for a joke.'); lxi('groan', 'I have heard that one. I did not mind hearing it again.'); lxi('groan', 'Oh, no. And yet.');
lxi('wonder', 'I sometimes wonder what the sea does when nobody is looking. I assume the same thing.'); lxi('wonder', 'I wonder why the sky is the shape it is. It must have been decided by somebody.'); lxi('wonder', 'I wonder where the sand came from. The beach was not here before. Or it was. I do not remember.');
lxi('wonder_reply', 'Now I am wondering as well. It is not unpleasant.'); lxi('wonder_reply', 'I could not say. I have a feeling it is better not to.');
lx('ask_work', 'plain', 'What do you do with your days, {about}?'); lx('ask_work', 'plain', 'How\'s the work, {about}?'); lx('answer_work', 'plain', 'I\'m a {job}. It keeps me busy.'); lx('answer_work', 'plain', 'Mostly I\'m a {job}. Some days that\'s all of me.');
lxi('ask_work', 'What do you do with your days, {about}? I am only asking out of interest.'); lxi('answer_work', 'I am a {job}. It is a better job than it sounds, or exactly as good.'); lxi('answer_work', 'I am a {job}. I have done it since I got here. Before that I was somebody else.');
lx('ask_where', 'plain', 'Have you seen {about} about?'); lx('ask_where', 'plain', 'Do you know where {about} is?'); lx('tell_where', 'plain', 'I think {about} is {reason}.'); lx('tell_where', 'plain', 'Last I saw, {about} was {reason}.'); lx('dont_know_where', 'plain', 'No idea where {about} is.'); lx('dont_know_where', 'plain', 'Not today. Try the square.');
lxi('ask_where', 'Do you know where {about} is? I am not worried. I would like to know.'); lxi('tell_where', '{about} is {reason}. I looked, on the way past. I do not know why.'); lxi('dont_know_where', 'I do not know where {about} is. Nobody tells me anything on this island, and then I am surprised.');
lx('warn', 'plain', 'Watch out for {about}. They {reason}.'); lx('warn', 'plain', 'A word of warning: {about} is someone who will {reason}.'); lx('warn_thanks', 'plain', 'Thank you. I\'ll bear it in mind.'); lx('warn_thanks', 'plain', 'Good to know. I\'ll keep my distance.');
lxi('warn', 'I would be careful around {about}. They {reason}. I say it only because it is true.'); lxi('warn_thanks', 'Thank you. I will take it under advisement. It is a good word, advisement.');
lx('ask_advice', 'plain', 'I\'m starving. Where would you go for a meal?'); lx('give_advice', 'plain', 'Try the bakery. They always have something.', {}, ['feature:bakery']); lx('give_advice', 'plain', 'The tavern, if you\'ve any coin.', {}, ['feature:tavern']); lx('give_advice', 'plain', 'Ask around. Someone always has something to spare.');
lxi('ask_advice', 'I am hungry. Where would you go for a meal? I am asking for a friend, who is me.'); lxi('give_advice', 'The bakery. It is reliable. It is the most reliable thing here.', {}, ['feature:bakery']); lxi('give_advice', 'The tavern. It is not what it was. It was never anything.', {}, ['feature:tavern']); lxi('give_advice', 'Ask around. Somebody has bread. Someone always has bread.');
lx('brag_child', 'plain', '{about} is {qty} now. I don\'t know where the time goes.'); lx('brag_child', 'plain', 'My {about} is {qty}. Doing well. Growing like a weed.'); lx('congratulate', 'plain', 'That\'s lovely. They do grow fast.'); lx('congratulate', 'plain', 'You must be proud.');
lxi('brag_child', '{about} is {qty} now. I did not see it happen. I looked away once.'); lxi('brag_child', 'My {about} is {qty}. It is going well. I am rarely asked.'); lxi('congratulate', 'You must be proud. I would be. Is that the word? Yes.'); lxi('congratulate', 'That is wonderful. They are quite something at that age.');
lx('tell_back', 'plain', 'Before I came here I {about}.'); lx('tell_back_reply', 'plain', 'That\'s a story. Go on.'); lx('tell_back_reply', 'plain', 'Strange. I\'d have believed it of this place.');
lxi('tell_back', 'Before I came here I {about}. I mention it only because nobody asks.'); lxi('tell_back_reply', 'That is quite a story. I believe it. That is the strange part.'); lxi('tell_back_reply', 'I see. I find I am not surprised. I have stopped being surprised.');

/* ---- family talk: a spouse, a sibling, a parent and a child are not addressed like a neighbour ---- */
lx('greet', 'plain', 'There you are, love.', { rel: 'spouse' }); lx('greet', 'plain', 'Hello, my dear. Did you sleep?', { rel: 'spouse', band: 'morning' }); lx('greet', 'plain', 'Home at last. Come and sit.', { rel: 'spouse', band: 'evening' }); lx('greet', 'plain', 'There you are, {li}.', { rel: 'partner' });
lx('greet', 'plain', 'Oh, it\'s you. What do you want?', { rel: 'sibling' }); lx('greet', 'plain', '{li}. Look what the wind blew in.', { rel: 'sibling' }); 
lx('greet', 'plain', 'Have you eaten, {li}?', { rel: 'child' }); lx('greet', 'plain', '{li}! Come here and let me look at you.', { rel: 'child' }); lx('greet', 'plain', 'Hello. Is there supper?', { rel: 'parent' }); lx('greet', 'plain', 'Oh, it\'s you. Can I go out?', { rel: 'parent' }); lx('greet', 'plain', 'Hello, little one.', { rel: 'child' }); lx('greet', 'plain', 'There you are! Where have you been?', { rel: 'child' });
lx('greet_back', 'plain', 'There you are. I was just thinking of you.', { rel: 'spouse' }); lx('greet_back', 'plain', 'Hello, love.', { rel: 'spouse' }); lx('greet_back', 'plain', 'What now?', { rel: 'sibling' }); lx('greet_back', 'plain', 'You again. Good.', { rel: 'sibling' });
lx('greet_back', 'plain', 'Hello, dear. I\'m fine, don\'t fuss.', { rel: 'child' }); lx('greet_back', 'plain', 'Hello. Yes, I\'ve eaten.', { rel: 'parent' }); lx('greet_back', 'plain', 'Hello! I was only just out there.', { rel: 'parent' }); 
lx('farewell', 'plain', 'I\'ll see you at supper, love.', { rel: 'spouse' }); lx('farewell', 'plain', 'Mind yourself. Come home safe.', { rel: 'spouse' }); lx('farewell', 'plain', 'Try not to be an idiot.', { rel: 'sibling' }); lx('farewell', 'plain', 'Give my regards to nobody. See you.', { rel: 'sibling' });
lx('farewell', 'plain', 'Wrap up warm, dear.', { rel: 'child' }); lx('farewell', 'plain', 'Bye. I\'ll be home for supper.', { rel: 'parent' }); lx('farewell', 'plain', 'Don\'t be late for supper.', { rel: 'child' }); lx('farewell', 'plain', 'Be good. Or be careful.', { rel: 'child' });
lx('ask_how', 'plain', 'How are you really? Not the polite answer.', { rel: 'spouse' }); lx('ask_how', 'plain', 'Are you well? You look tired.', { rel: 'parent' }); lx('ask_how', 'plain', 'Are you behaving?', { rel: 'child' }); lx('ask_how', 'plain', 'How\'s life, then? Anything I should know before the rest of the family does?', { rel: 'sibling' });
lxi('greet', 'There you are. I was about to look for you, which is not the same as worrying.', { rel: 'spouse' }); lxi('greet', 'Hello. You are home. That is the best news of the afternoon.', { rel: 'spouse' }); lxi('greet', 'There you are, {li}.', { rel: 'partner' });
lxi('greet', 'It is you. I had hoped for someone else, and then I thought: no.', { rel: 'sibling' }); lxi('greet', '{li}. We have the same eyebrows. I notice every time.', { rel: 'sibling' });
lxi('greet', 'Have you eaten? I ask every time. The answer is never the point.', { rel: 'child' }); lxi('greet', 'Come here. Let me look at you. You are taller or I am less.', { rel: 'child' }); lxi('greet', 'Hello. Is there supper? I am only asking in general.', { rel: 'parent' }); lxi('greet', 'Hello. You are where I left you, or near it.', { rel: 'child' }); lxi('greet', 'There you are. I counted. You were still one.', { rel: 'child' });
lxi('greet_back', 'There you are. I was thinking about you, in a general way.', { rel: 'spouse' }); lxi('greet_back', 'Hello, love. I am here. It is where I live.', { rel: 'spouse' }); lxi('greet_back', 'What now? I am joking. Hello.', { rel: 'sibling' });
lxi('greet_back', 'Hello. Yes, I have eaten. I would tell you if I had not, which is not true.', { rel: 'parent' }); lxi('greet_back', 'Hello. I am here. I am fine. You do not need to look at me like that.', { rel: 'parent' });
lxi('farewell', 'I will see you at supper. I will be the one who is hungry.', { rel: 'spouse' }); lxi('farewell', 'Try not to be an idiot. I say it with love, and with a little concern.', { rel: 'sibling' }); lxi('farewell', 'Wrap up warm. It is a mild island, and still.', { rel: 'child' }); lxi('farewell', 'Bye. I will be home for supper. Probably before it.', { rel: 'parent' }); lxi('farewell', 'Do not be late for supper. I will notice and I will say nothing.', { rel: 'child' });
lxi('ask_how', 'How are you? I mean really, not the answer you give the baker.', { rel: 'spouse' }); lxi('ask_how', 'Are you well? You look tired. You always look tired. It is part of the family.', { rel: 'parent' }); lxi('ask_how', 'Are you behaving? Do not answer.', { rel: 'child' }); lxi('ask_how', 'How is life, then? Tell me before everyone else does.', { rel: 'sibling' });

/* ---- backchannel: a nod to what was said ---- */
ACTS.backchannel = { kind: 'small', stage: 'topic', reply: true, when: () => true, w: () => 1, apply: () => {}, replies: [] };
lx('backchannel', 'plain', 'Mm.'); lx('backchannel', 'plain', 'I see.'); lx('backchannel', 'plain', 'Right.'); lx('backchannel', 'plain', 'Is that so.'); lx('backchannel', 'plain', 'Ah.');
lxi('backchannel', 'Mm.'); lxi('backchannel', 'I see.'); lxi('backchannel', 'Yes. Well.'); lxi('backchannel', 'That is something.'); lxi('backchannel', 'Ah. Yes.');

/* ---- how children talk (under twelve): short, direct, and about what a child is busy with ---- */
const kidl = (act: string, text: string, tags: any = {}) => { lx(act, 'plain', text, Object.assign({ age: 'child' }, tags)); };
const kidi = (act: string, text: string, tags: any = {}) => { lxi(act, text, Object.assign({ age: 'child' }, tags)); };
kidl('greet', 'Hi!'); kidl('greet', 'Hello, {li}! Look what I found.'); kidl('greet', 'Are you going anywhere? Can I come?'); kidl('greet_back', 'Hi!'); kidl('greet_back', 'Hello! I was playing.'); kidl('greet_back', 'Oh, hello. I\'m busy.');
kidl('farewell', 'Bye! I\'m going to play.'); kidl('farewell', 'See you! Don\'t tell anyone.'); kidl('farewell_back', 'Bye!'); kidl('pre_close', 'I have to go. I\'m in the middle of something.'); kidl('pre_close', 'Can I go now?');
kidl('answer_how', 'Fine! I found a good stick.', { state: 'fine' }); kidl('answer_how', 'I\'m hungry. Is it supper yet?', { state: 'hungry' }); kidl('answer_how', 'I\'m tired. I\'m not tired. I\'m tired.', { state: 'tired' }); kidl('answer_how', 'Great! I\'m having a good day!', { state: 'glad' });
kidl('agree', 'Yes!'); kidl('agree', 'I know!'); kidl('remark_time', 'Is it time for lunch yet?'); kidl('remark_time', 'It\'s a long day when you\'re small.'); kidl('remark_place', 'I like it here. There\'s room to run.'); kidl('remark_work', 'I\'m helping. Mostly I\'m watching.');
kidi('greet', 'Hello. I am small, but I noticed you.'); kidi('greet', 'Hello, {li}. I found something. I will not say what.'); kidi('greet', 'Are you going somewhere? I could come. I would be quiet. Mostly.'); kidi('greet_back', 'Hello. I was doing something important.'); kidi('greet_back', 'Hello. I am small, but I am here.');
kidi('farewell', 'Bye. I am going to go and do something. I will not say what.'); kidi('farewell', 'Bye. Do not tell them where I went.'); kidi('farewell_back', 'Bye.'); kidi('pre_close', 'I have to go. There is a thing I am in the middle of.'); kidi('pre_close', 'Can I go now? I am asking nicely.');
kidi('answer_how', 'Fine. I found a very good stick.', { state: 'fine' }); kidi('answer_how', 'I am hungry. Is it nearly supper? It feels nearly.', { state: 'hungry' }); kidi('answer_how', 'I am tired. I am not tired. I am a bit tired.', { state: 'tired' }); kidi('answer_how', 'Good. It has been a good day. I did not expect that of it.', { state: 'glad' });
kidi('agree', 'Yes.'); kidi('agree', 'I know. I was going to say that.'); kidi('remark_time', 'Is it lunch yet? It feels like lunch.'); kidi('remark_time', 'It is a long day when you are small.'); kidi('remark_place', 'I like it here. There is room to run, and nobody has said not to.'); kidi('remark_work', 'I am helping. Mostly I am watching. It is also work.');

/* ---- more ways to say the little things (the same hello twenty times a day is what makes a village sound like a script) ---- */
for (const t of ['Good to see you, {li}.', 'Oh, {li}. How are things?', 'Hey, {li}.', 'Well met, {li}.', '{li}! Just the person.', 'Ah, {li}.', 'Busy day, {li}?', 'Hello there, {li}.', 'Is that you, {li}? It is.']) lx('greet', 'plain', t);
for (const t of ['Hello to you.', 'Ah, hello.', 'Oh! Hello, {li}.', 'Good to see you too.', 'Hello, hello.', 'There you are.', 'Hello. How are you?', 'Hey.', 'Well. Hello.']) lx('greet_back', 'plain', t);
for (const t of ['I\'d better get on.', 'Well. Work waits.', 'Must dash.', 'I won\'t keep you.', 'That\'s me, then.', 'Right. Off I go.', 'Mustn\'t stand about.', 'Time I wasn\'t here.', 'I should leave you to it.']) lx('pre_close', 'plain', t);
for (const t of ['Take care, {li}.', 'Until next time.', 'Safe on your way.', 'Good day to you.', 'Be well.', 'Mind how you go.', 'Cheerio.', 'Look after yourself.', 'All the best.']) lx('farewell', 'plain', t);
for (const t of ['And you.', 'Take care.', 'Be well.', 'Right you are.', 'Goodbye, then.', 'Off you go.', 'See you around.', 'Cheers.', 'Until then.']) lx('farewell_back', 'plain', t);
for (const t of ['I know.', 'Quite.', 'True enough.', 'That\'s right.', 'Exactly so.', 'I\'d say so.', 'Yes. Quite.', 'Without a doubt.', 'You\'re not wrong.']) lx('agree', 'plain', t);
for (const t of ['Hello. I did not expect to see you, and yet.', 'Ah, {li}. I was just thinking of something else.', 'Good. You are here. I was about to start talking to myself.', 'Hello. It is a day of some kind.', '{li}. Yes. There you are.', 'Ah. Company. I had been preparing for none.', 'Hello, {li}. I will say it first this time.', 'Hello. I see you have arrived, as one does.', '{li}. Good. I had a thought and nobody to give it to.']) lxi('greet', t);
for (const t of ['Hello. I was about to say that.', 'Ah. Hello. I had a feeling.', 'Hello. I am pleased and slightly startled.', 'Yes. Hello. It is that time.', 'Hello. Come to think of it, I was hoping.', 'Hello to you, in return.', 'Good. Hello. That is out of the way.', 'Hello. I have been standing here on purpose.', 'Ah, {li}. The island does arrange things.']) lxi('greet_back', t);
for (const t of ['I should get on. The day has noticed me.', 'Well. That is that, for now.', 'I will leave you to it. You were doing something.', 'That is the end of what I had.', 'I should go. I will pretend I have a reason.', 'I have a few things to be near. I will go and be near them.', 'Right. The afternoon will want me soon.', 'I will let the conversation end here. It has had a good run.', 'Off I go. I will not look back, which is a lie.']) lxi('pre_close', t);
for (const t of ['Take care, {li}. The island is small but it has edges.', 'Until next time. I will be somewhere.', 'Be well. I mean it in the ordinary way.', 'Goodbye, {li}. It was a good length.', 'Mind how you go. There is a lot of ground.', 'Look after yourself. Somebody has to, and I am here.', 'All the best. I have no better phrase.', 'Good day to you. It is, so far.', 'See you. I say it as a matter of course.']) lxi('farewell', t);
for (const t of ['And you.', 'Yes. Goodbye.', 'Be well, then.', 'Off you go. I will watch for a moment.', 'See you. I will be here, or near.', 'Goodbye. It was good.', 'Quite. Goodbye.', 'Right. Until then.', 'And the same to you, exactly.']) lxi('farewell_back', t);
for (const t of ['Yes. I was going to say that.', 'Quite. It is what I think too.', 'That is right. I am glad somebody said it.', 'True. It does not make it simpler.', 'I agree. I wish I did not.', 'Yes. That is it exactly.', 'Mm. Yes. I would put it that way.', 'You are right. I have been thinking so since Tuesday.', 'Agreed. That is a rare thing.']) lxi('agree', t);
for (const t of ['Fine, thanks. You?', 'Can\'t grumble.', 'Getting by.', 'Not bad. Not bad at all.', 'Same as ever.', 'Well enough.', 'Mustn\'t complain.', 'Fair to middling.']) lx('answer_how', 'plain', t, { state: 'fine' });
for (const t of ['Fine. I looked into it and there is nothing to report.', 'Fine. The day has not asked much of me.', 'Well enough. I have checked.', 'About a five. A good, honest five.', 'Fine. There is a small noise in my left knee, which is the news.', 'Fine. I was going to say I was well and it is true, which surprised me.', 'Steady. That is the word I have settled on.', 'Not bad. I say that and wait for the day to hear me.']) lxi('answer_how', t, { state: 'fine' });
for (const t of ['Better than I deserve.', 'Grand, really.', 'On top of the world, nearly.', 'Very well, as it happens.']) lx('answer_how', 'plain', t, { state: 'glad' });
for (const t of ['Good. I would like to say why. I cannot.', 'Very well. I have decided to enjoy it before it is noticed.', 'Better than I expected. I recalibrated my expectations on the way here.', 'Well. In a way that does not need explaining.']) lxi('answer_how', t, { state: 'glad' });
for (const t of ['Not great, to be honest.', 'Low. It\'ll pass.', 'I\'ve had better days.', 'Could be better.']) lx('answer_how', 'plain', t, { state: 'low' });
for (const t of ['Low. It has no address, so I cannot send it back.', 'Not well. It is a grey kind of not well, not an interesting one.', 'I have had better days. I could name three.', 'Flat. Like a field after rain, if the field had opinions.']) lxi('answer_how', t, { state: 'low' });
for (const t of ['Hungry! Starving, nearly.', 'Hungry, to be honest. My stomach\'s been talking.', 'Starving. Is there bread?']) lx('answer_how', 'plain', t, { state: 'hungry' });
for (const t of ['Hungry. It is a precise feeling and I recognise it.', 'Hungry. My stomach has started to make announcements.', 'Hungry. I have thought about bread more than is dignified.']) lxi('answer_how', t, { state: 'hungry' });
for (const t of ['Tired. Could sleep standing.', 'Worn out, honestly.', 'Weary to the bone.']) lx('answer_how', 'plain', t, { state: 'tired' });
for (const t of ['Tired. I could sleep standing. I may be.', 'Worn out. The kind that sits behind the eyes.', 'Tired in a way that sleep might help.']) lxi('answer_how', t, { state: 'tired' });
for (const t of ['How are things?', 'How\'s the day treating you?', 'Keeping well?', 'And how are you?', 'How\'ve you been keeping?']) lx('ask_how', 'plain', t);
for (const t of ['How are you holding up?', 'How is the day treating you? I mean honestly.', 'Are you keeping well? I ask in case.', 'How have you been, since last time? Give me the short version.', 'And you? How are things on your side of the island?']) lxi('ask_how', t);
