/* ================= dialogue / cv-voice: who is talking, and how =================
   Nine ways of talking. Each person has one, worked out from their traits (and a little from who they are), and it shapes how willing they
   are to share, how long they talk, what they do when you are rude, how they gossip, how they say no. The banks below are the words.   */
type CvArch = 'talkative' | 'reserved' | 'nosy' | 'cynic' | 'sunny' | 'wary' | 'prickly' | 'smooth' | 'lonely';
const CV_ARCHS: CvArch[] = ['talkative', 'reserved', 'nosy', 'cynic', 'sunny', 'wary', 'prickly', 'smooth', 'lonely'];
const CV_CHAT: any = { talkative: 0.9, sunny: 0.7, nosy: 0.8, lonely: 0.8, smooth: 0.6, cynic: 0.45, wary: 0.35, prickly: 0.3, reserved: 0.2 };
const CV_CAND: any = { talkative: 0.8, nosy: 0.7, sunny: 0.7, lonely: 0.75, cynic: 0.5, smooth: 0.45, prickly: 0.35, wary: 0.25, reserved: 0.2 };
const CV_TICS = [null, null, null, 'you know', 'mark me', 'honestly', 'as it happens', 'I tell you', 'heh'];
function cvVoice(o) {
  if (o.cvV) return o.cvV;
  const h = cvHashStr((town.seed || 'x') + ':voice:' + o.id), noise = k => ((h >>> (k * 3)) & 7) / 7 * 0.8, t = x => lf2Has(o, x) ? 1 : 0;
  const lonely = (!o.fam || (!o.fam.spouse && !(o.fam.kids || []).length)) && o.age > 28 ? 1.2 : 0;
  const s: any = { talkative: t('sociable') * 2 + t('jovial') * 1.5 + t('cheerful') + noise(0), reserved: t('shy') * 2 + t('homebody') * 1.5 + noise(1), nosy: t('gossipy') * 2 + t('curious') * 1.5 + noise(2),
    cynic: t('grumpy') * 1.5 + t('proud') * 0.5 + (o.age > 45 ? 0.6 : 0) + noise(3), sunny: t('cheerful') * 1.5 + t('generous') + t('dreamy') * 0.4 + noise(4), wary: t('anxious') * 2 + t('devout') * 0.3 + noise(5),
    prickly: t('grumpy') * 1.5 + t('brave') + noise(6), smooth: t('greedy') * 1.5 + t('proud') + t('sociable') * 0.5 + noise(7), lonely: t('homebody') + t('dreamy') * 0.7 + lonely + noise(8) };
  if (o.age < 12) { s.talkative += 1; s.sunny += 1; s.cynic = s.prickly = s.smooth = -9; }
  let arch: CvArch = 'sunny', best = -1; for (const a of CV_ARCHS) if (s[a] > best) { best = s[a]; arch = a; }
  const humor = arch === 'cynic' || arch === 'smooth' ? 'dry' : arch === 'talkative' && (h & 1) ? 'bawdy' : arch === 'prickly' || arch === 'wary' ? 'none' : 'gentle';
  return (o.cvV = { arch, humor, chat: CV_CHAT[arch], candour: CV_CAND[arch], tic: CV_TICS[(h >>> 5) % CV_TICS.length] });
}

const VX: any = {
  greet: {
    talkative: { stranger: ['Oh, hello! New face, or I have not been paying attention.', 'Well, hello there! I do not think we have properly met.'], known: ['Ah, {p}! Come, come. What is the news?', '{p}! Just the person.'], friend: ['{p}! There you are. I was only just thinking about you.', '{p}! Sit, sit. I have a hundred things to tell you.'] },
    reserved: { stranger: ['Hm. Yes?'], known: ['{p}.'], friend: ['Oh. {p}. Good.'] },
    nosy: { stranger: ['Well! Somebody I do not know well enough. Yet.'], known: ['{p}! Tell me everything.', 'Ah, {p}. You look like you know something.'], friend: ['There you are. I have been saving things up for you.'] },
    cynic: { stranger: ['Yes? You look like you want something.'], known: ['Oh. It is you.', 'Ah. {p}. What now?'], friend: ['The only sensible one. Sit down.'] },
    sunny: { stranger: ['Hello! Lovely day for it, is it not?'], known: ['{p}! Lovely to see you!'], friend: ['{p}! My favourite!', 'Oh, it is you! Come here, come here.'] },
    wary: { stranger: ['…Yes? Do I know you?'], known: ['Oh. {p}. Hello.'], friend: ['{p}. Good. I can talk to you.'] },
    prickly: { stranger: ['What do you want?'], known: ['What now?'], friend: ['Hmph. You again. Fine.'] },
    smooth: { stranger: ['Ah, a new face. Delighted. Truly.'], known: ['{p}. A pleasure, as ever.'], friend: ['My friend! Come and tell me about your day.'] },
    lonely: { stranger: ['Oh! Hello. Hello. Do stop, if you like.'], known: ['Oh, {p}. I was hoping somebody would come.'], friend: ['{p}! You came. You actually came.'] },
  },
  react: {      // how they take what you said: warm, funny (a joke or tease that lands), sting (an insult or an accusation), flirtok, flirtno, press (you are pushing), thanks
    talkative: { warm: ['Ha! You are good for the soul, you know that?', 'Well, now you have gone and made my day.'], funny: ['Ha! Oh, that is a good one. I will be telling that one.', 'Stop, you will have me crying into the porridge.'], sting: ['Well! I will have you know I have been called worse by better.', 'Oh, that is how it is, is it? And here I was being friendly.'], flirtok: ['Careful. I talk a great deal, and I can flirt back.', 'Ha! Is that so? Go on.'], flirtno: ['Ha! No, no. Not in this life, my friend.', 'You have the wrong end of the stick, but I am flattered.'], press: ['You do not give up, do you? I like that. Not that, though.', 'Ah, now you are just being nosy. Delightful.'], thanks: ['Oh, you are a dear.', 'That is decent of you, that is.'] },
    reserved: { warm: ['…Thank you.', 'That is kind. I am not used to it.'], funny: ['Hm. *a small smile*', '…That is not bad.'], sting: ['Noted.', 'Right. I will remember that.'], flirtok: ['…Oh. Well.', 'I do not quite know where to look.'], flirtno: ['No.', 'I do not think so.'], press: ['I said no.', 'You will get nothing more from me.'], thanks: ['…Thanks.', 'Ta.'] },
    nosy: { warm: ['Oh! And I thought you only came for the gossip.', 'That is kind. Now, what do you know?'], funny: ['Ha! You are wasted on the fields.', 'Oh, you cheeky thing. Tell me more.'], sting: ['How rude! Who put that in your head?', 'I will remember that next time I hear something about you.'], flirtok: ['Ooh. Do go on. Does anyone else know?', 'Well, well. I will keep that to myself. For a while.'], flirtno: ['Oh, do not be silly, I am only interested in other people\'s love lives.', 'Not me, love. But I could tell you who.'], press: ['Ha! Now YOU are asking the questions I ask.', 'You are after something. I like it.'], thanks: ['Is that not sweet. Come closer, I will tell you something.', 'Oh, that is nice. I will owe you a secret.'] },
    cynic: { warm: ['Flattery. How novel. It is working, annoyingly.', 'Well. That is something.'], funny: ['Hm. Almost funny.', 'I would laugh, but my face would crack.'], sting: ['Charming. I will put it on the pile.', 'Go on, you are not the first today.'], flirtok: ['Is that supposed to work? …It is working a little.', 'Hm. Brave. Or stupid.'], flirtno: ['Hardly.', 'Save it for somebody with the energy.'], press: ['You will get nowhere with that.', 'Persistence. How tiresome.'], thanks: ['Do not make a habit of it.', 'Hm. Fine.'] },
    sunny: { warm: ['Aw, that is lovely of you!', 'You are a treasure, you know that?'], funny: ['Ha! Oh, I needed that!', 'You do make me laugh.'], sting: ['Oh. Oh, that was a bit sharp, was it not?', '…Ouch. I think I will just sit with that a moment.'], flirtok: ['Oh! Oh my. Well!', 'You are making me blush. Stop. Do not stop.'], flirtno: ['Aw, I am flattered, but no. Truly.', 'You are sweet. But no.'], press: ['Let us talk about something happier, shall we?', 'Oh, I do not think that is a cheerful subject.'], thanks: ['Bless you!', 'Thank you, truly!'] },
    wary: { warm: ['…Thank you. I was not expecting that.', 'That is kind. Is it a trick?'], funny: ['Ha. Sorry. I am on edge. That was funny.', 'Hm. You would say that, would you not?'], sting: ['That is — I do not like that. Please do not.', 'I thought you were all right. Maybe not.'], flirtok: ['Oh — I — hello. Goodness.', 'You cannot just say things like that!'], flirtno: ['Please do not.', 'I… no. Sorry.'], press: ['Why do you want to know? Who sent you?', 'You are asking a lot of questions.'], thanks: ['Thanks. I mean it.', '…Thank you.'] },
    prickly: { warm: ['Hm. Do not go soft on me.', '…Fine. Thanks.'], funny: ['Hmph. That was not funny. …It was a bit funny.', 'Do that again and I will hit you. Probably.'], sting: ['Say that again. Go on.', 'You have got a nerve.'], flirtok: ['Oh, shut up. …Say it again, though.', 'Hmph. Do not think that works.'], flirtno: ['Not a chance.', 'Do not be ridiculous.'], press: ['Leave it.', 'I said mind your own.'], thanks: ['Hmph. Right.', 'Do not mention it. Actually, do not.'] },
    smooth: { warm: ['You are too kind. Keep going.', 'Ah, {p}. You do understand people.'], funny: ['Ha! Wit and good looks. Dangerous.', 'You are sharper than you let on.'], sting: ['How very disappointing. I had thought better of you.', 'Oh dear. And we were getting on so nicely.'], flirtok: ['Now this is a conversation.', 'I wondered when you would say it.'], flirtno: ['You are charming, but no.', 'In another life. Not this one.'], press: ['Now, now, {p}. Some things have a price.', 'You are persistent. I admire that. It will not help.'], thanks: ['Always a pleasure.', 'I will remember that you said so.'] },
    lonely: { warm: ['Oh — that is — thank you. Nobody says that.', 'You have no idea what that means.'], funny: ['Ha! Oh, I had forgotten what that feels like.', 'That is the best thing anyone has said all week.'], sting: ['Oh. …Oh. That hurt.', 'I thought you would be kind.'], flirtok: ['Oh! Me? Really?', 'I — yes. Please, go on.'], flirtno: ['I… no. Sorry. I am just glad to talk.', 'Oh, no, I am only lonely, not — thank you, though.'], press: ['Please. Do not make me. Not today.', 'I would tell you, if I could.'], thanks: ['Thank you. Truly.', 'You are the first person who has asked.'] },
  },
  deflect: {
    talkative: ['Ha! You will have to buy me a drink before I tell you that one.', 'Now, now. Some things I keep for the second cup.'],
    reserved: ['I would rather not.', 'That is not for talking about.', 'Hm. No.'],
    nosy: ['Oh, I could not. …Who told you to ask?', 'I could tell you. But then you would have to tell me something, and you look careful.'],
    cynic: ['Of course you would ask that.', 'Ask me something I am paid to answer.'],
    sunny: ['Oh, let us not get into that today, hm?', 'That is a grey-cloud sort of subject. Ask me something sunny.'],
    wary: ['Why do you want to know?', 'Who has been talking? Who said I would say?'],
    prickly: ['None of your business.', 'Mind your own, {p}.'],
    smooth: ['A person of discretion does not tell. But I like that you asked.', 'Ah, {p}. You do ask the interesting questions. Not that one, though.'],
    lonely: ['…Not yet. But stay, and maybe.', 'Can we not? Talk about something else. Please.'],
  },
  lead: {       // the way they begin a bit of gossip
    talkative: ['Oh, you have not heard? Sit down.', 'Well! Where do I begin?'], reserved: ['Only what I saw.', 'I do not gossip. But —'], nosy: ['Now, this stays between us —', 'You did not hear it from me, but —'],
    cynic: ['Because somebody has to say it:', 'You will love this.'], sunny: ['Oh, it is all rather sweet, really:', 'Lovely news, or sad news, depending on who you ask:'], wary: ['Keep your voice down. —', 'I should not, but —'],
    prickly: ['Fine. Since you are asking:', 'If you must know:'], smooth: ['Between you and me, {p}:', 'I would only tell you:'], lonely: ['Oh — nobody ever asks me. All right:', 'Come closer, it is a long one:'],
  },
  stance: {     // how they feel about what they have just told
    talkative: { outraged: ['It is a scandal, is what it is. A scandal!'], amused: ['I laughed for a full minute. I am not ashamed.'], pity: ['Poor soul. I could cry.'], warm: ['It does the heart good, hearing that.'], shrug: ['There it is, then. Make of it what you will.'] },
    reserved: { outraged: ['It was wrong.'], amused: ['…I will admit I smiled.'], pity: ['I felt for them.'], warm: ['Good. People should do that more.'], shrug: ['Not mine to judge.'] },
    nosy: { outraged: ['Disgraceful. And I intend to find out the rest.'], amused: ['Oh, I could hardly breathe.'], pity: ['The poor thing. I will look in on them. And ask questions.'], warm: ['Is that not lovely? I do love a nice story.'], shrug: ['Well. More to follow, I expect.'] },
    cynic: { outraged: ['Of course. Of course they did.'], amused: ['Best thing that has happened all week, and it did not happen to me.'], pity: ['Somebody always pays for other people\'s mistakes.'], warm: ['Hm. Will not last, but it is nice.'], shrug: ['Same as ever.'] },
    sunny: { outraged: ['Oh, it made my stomach turn!'], amused: ['Oh, I could not stop giggling!'], pity: ['It broke my heart, honestly.'], warm: ['Oh, it was so lovely!'], shrug: ['Oh well! Onward.'] },
    wary: { outraged: ['It frightened me, honestly. What is next?'], amused: ['Funny, yes. But I would not like it to be me.'], pity: ['I could not sleep, thinking on it.'], warm: ['I could use more news like that.'], shrug: ['I try not to think on it.'] },
    prickly: { outraged: ['Disgraceful. Somebody ought to say something. I will.'], amused: ['Idiots, all of them. Funny, though.'], pity: ['Tough luck. Tougher world.'], warm: ['Hmph. Fine. Good for them.'], shrug: ['Not my business. Except it is, a bit.'] },
    smooth: { outraged: ['Appalling. And, between us, instructive.'], amused: ['One has to laugh.'], pity: ['A shame. One hates to see it.'], warm: ['Charming. I do enjoy a decent person now and then.'], shrug: ['The village does like its entertainments.'] },
    lonely: { outraged: ['It made me so sad I could not eat.'], amused: ['I laughed. By myself. It felt odd.'], pity: ['I thought of them all night.'], warm: ['It is good to hear about kind things. I do not get many.'], shrug: ['Nobody tells me anything. You are the first.'] },
  },
  pivot: { talkative: ['Which reminds me —', 'Oh, and while I think of it —'], reserved: ['…Also.'], nosy: ['And now I think of it —', 'Speaking of which —'], cynic: ['And, naturally, that leads to —', 'Which brings us to —'], sunny: ['Oh, that makes me think of —'], wary: ['Which — look, it connects —'], prickly: ['And another thing —'], smooth: ['Now that you mention it —'], lonely: ['Can I tell you something else? —'] },
  ask: [      // a personal question they put to you
    { id: 'whence', say: 'Where did you come from before all this, {p}? You never say.', opts: [['honest', 'Somewhere smaller than this. I do not miss it as much as I should.'], ['dodge', 'Somewhere I would rather not talk about. Not yet.'], ['joke', 'A very small village. They took the whole place off the map; it was easier.'], ['lie', 'A big house by a river. We had a bell and everything.']] },
    { id: 'miss', say: 'Do you ever miss anyone, {p}? I do. Odd, how it comes at strange moments.', opts: [['honest', 'Every day, a little. Mostly at supper.'], ['dodge', 'Do I? That is a question for a much longer evening.'], ['joke', 'Only the ones who owed me money.'], ['lie', 'No. I am quite fine on my own.']] },
    { id: 'freeday', say: 'If you had a whole free day and nobody needed you, what would you do?', opts: [['honest', 'Sleep late, then walk to the water and not think about anything.'], ['dodge', 'I would probably find a reason to be useful. It is a habit.'], ['joke', 'Eat, nap, argue with a goose. Not necessarily in that order.'], ['lie', 'Read. Constantly. I am very well read.']] },
    { id: 'happy', say: 'Are you happy here? Truly? You can tell me.', opts: [['honest', 'More than I expected. Some days even without trying.'], ['dodge', 'Ask me in the spring.'], ['joke', 'Define happy. Define here.'], ['lie', 'Blissful. Completely. Ask anyone.']] },
    { id: 'likes', say: 'Who do you like best in the village? Honestly. I will not say who said.', opts: [['honest', 'Hard to say. The ones who ask how I am and listen to the answer.'], ['dodge', 'It changes by the week. Do not tell anyone I said so.'], ['joke', 'The baker. For reasons that are largely bread.'], ['lie', 'You, obviously. Is that not what you wanted to hear?']] },
    { id: 'fear', say: 'What frightens you? Not the sensible things. The other ones.', opts: [['honest', 'Being unnecessary. I think about it more than I should.'], ['dodge', 'Heights, mostly. And questions.'], ['joke', 'Geese. Obviously. They know what they did.'], ['lie', 'Nothing. I am entirely without fear.']] },
  ],
};

/** pick a line from a bank that has not just been used by this person, with {p} filled in */
function cvLine(o, bank: string[], p?, key?: string) {
  const used = o.cvUsed || (o.cvUsed = {}), k = key || bank[0], fresh = bank.filter(s => !used[k + '|' + s] || game.time - used[k + '|' + s] > 240);
  const P = p || game.player, pool = fresh.length ? fresh : bank, s = P && typeof cvFreshest === 'function' ? cvFreshest(P, pool) : pool[Math.floor(Math.random() * pool.length)]; used[k + '|' + s] = game.time; if (P && typeof cvMarkHeard === 'function') cvMarkHeard(P, s);
  return p ? s.replace(/\{p\}/g, p.first) : s;
}
const cvArchOf = o => cvVoice(o).arch;
const cvGreetLine = (o, p, close) => cvLine(o, VX.greet[cvArchOf(o)][close === 'cold' ? 'stranger' : close === 'close' ? 'friend' : close] || VX.greet[cvArchOf(o)].known, p, 'greet' + close);
const cvReactLine = (o, p, cls) => cvLine(o, VX.react[cvArchOf(o)][cls], p, 'react' + cls);
const cvDeflectLine = (o, p) => cvLine(o, VX.deflect[cvArchOf(o)], p, 'deflect');
const cvLeadLine = (o, p) => cvLine(o, VX.lead[cvArchOf(o)], p, 'lead');
const cvStanceLine = (o, stance) => cvLine(o, VX.stance[cvArchOf(o)][stance] || VX.stance[cvArchOf(o)].shrug, null, 'stance' + stance);
const cvPivotLine = o => cvLine(o, VX.pivot[cvArchOf(o)], null, 'pivot');
