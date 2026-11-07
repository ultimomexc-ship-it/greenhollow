/* ================= dialogue / cv-answers: answering what was actually asked =================
   Every follow-up you can say has its own answer here, worked out from the village: ask what somebody is like and you hear about their
   character (their traits, their work, how the speaker feels about them); ask how somebody is taking a thing and you hear about that
   person's actual mood; ask how they know and you hear where the story came from. A joke gets laughed at (or not) and an answer that
   stays on the subject. Nothing here falls back to "the next layer" of whatever was being talked about.
   Lines are written as people say them; cv-speech.ts contracts anything left uncontracted on the way out.                              */

/** fill {Q} {he} {He} {him} {his} {His} for a person, plus any extra {key}s */
function cvQ(s: string, q, extra?: any): string {
  const ph = q ? cvPron(q) : { he: 'they', him: 'them', his: 'their', He: 'They' };
  return s.replace(/\{Q\}/g, q ? q.first : 'them').replace(/\{He\}/g, ph.He).replace(/\{he\}/g, ph.he).replace(/\{him\}/g, ph.him).replace(/\{His\}/g, cvCap(ph.his)).replace(/\{his\}/g, ph.his)
    .replace(/\{(\w+)\}/g, (m, k) => extra && extra[k] != null ? String(extra[k]) : m);
}
/** the line from a bank this listener heard least recently, with a person filled in */
function cvPkQ(c, bank: string[], q?, extra?): string { const s = cvFreshest(c.p, bank); cvMarkHeard(c.p, s); return cvQ(s, q, extra); }
/** how the speaker feels about somebody, in five bands */
function cvFeel(o, q): 'love' | 'like' | 'meh' | 'dislike' | 'hate' { const a = o.aff[q.id] || 0; return a > 55 ? 'love' : a > 18 ? 'like' : a > -18 ? 'meh' : a > -45 ? 'dislike' : 'hate'; }
/** a place as it sits in a sentence: "The Bakery" -> "the bakery", "Sulpicius House" -> "the Sulpicius house" */
function cvPlace(s: string): string {
  if (!s) return 'the square'; const m = s.match(/^(\w+) House$/); if (m) return `the ${m[1]} house`;
  if (/^The (Bakery|Smithy|Baths|Taberna|Thermopolium|Market Hall|Carcer)$/.test(s)) return 'the ' + s.slice(4).toLowerCase().replace('market hall', 'Market Hall').replace('taberna', 'Taberna').replace('thermopolium', 'Thermopolium').replace('carcer', 'Carcer');
  return s.replace(/^The /, 'the ');
}
const cvU = (text: string, hooks: CvHook[] = []): CvUtt => ({ text, hooks });
/** the next part of an old story that has not been said in this conversation */
function cvBackNext(c, b) { const told = c.told['bk' + b.id] || 0, layer = Math.min(2, told); c.told['bk' + b.id] = Math.max(told, layer + 1); cvLearnBack(c, b, layer); return cvBackText(b, c.o, layer) || cvBackText(b, c.o, 0); }

/* ---------------- what somebody is like ---------------- */
const CV_SKETCH: any = {
  cheerful: { warm: ['{He} could find the bright side of a flood. It\'s exhausting, and I\'d miss it terribly.', '{He} hums. All day. You stop noticing, and then {he}\'s away for a day and the whole lane feels wrong.'], cool: ['Cheerful. Relentlessly. Nobody is that pleased about porridge.', '{He} smiles at everything. I\'ve never trusted a person who smiles at weather.'] },
  grumpy: { warm: ['Grumbles like a cart with a bad wheel, but {he}\'s the first one there when your roof comes in.', '{He}\'d hate me saying it, but under all that scowl {he}\'s soft as new bread.'], cool: ['{He} could start a row with {his} own shadow, and has.', 'A temper like a kicked goat. You learn to stand well back.'] },
  devout: { warm: ['{He} prays for people and never tells them. I only know because I caught {him} at it once.', 'Steady as the church wall. When things go wrong you\'ll find {Q} quietly doing the right thing.'], cool: ['Holier than the rest of us, and doesn\'t let us forget it.', '{He} judges. Quietly, from a great height, with folded hands.'] },
  gossipy: { warm: ['{He} knows everything about everyone, and somehow it\'s never cruel. That\'s a gift.', 'If you want to know what\'s happening, ask {Q}. If you want to keep a secret, don\'t.'], cool: ['Tell {Q} something on the way to the well and it\'s round the village before you\'ve drawn the bucket.', 'A mouth like a sieve. Everything goes in; everything comes out.'] },
  curious: { warm: ['{He} asks about everything. How the tide works, why bread rises, what you dreamed. I like that in a person.', 'Sharp as a tack and twice as nosy. In the good way, mostly.'], cool: ['Into everything. Your pots, your business, your post.', '{He}\'s never once left a closed door alone.'] },
  lazy: { warm: ['{He}\'s not lazy, whatever they say. {He} just knows the job will still be there after a sit-down.', 'Slow as a rest day. But {he}\'s good company, and good company is work of its own.'], cool: ['Always about, never doing. {He} could watch a fence being built and call it a day\'s work.', '{He}\'d send a dog to fetch water if the dog would go.'] },
  greedy: { warm: ['Careful with money. Very careful. But {he}\'s never once cheated me, and I count.', '{He} likes a good price. Who doesn\'t? {He} just likes it more than most.'], cool: ['{He}\'d sell you your own shadow and charge for the shade.', 'Count your change twice when {Q}\'s been near it.'] },
  brave: { warm: ['Afraid of nothing. Well, nothing with legs. {He} pulled a child out of the surf once and went back for the bucket.', 'When there\'s trouble, {Q} walks towards it. The rest of us find something to look at.'], cool: ['Brave, they call it. I call it never once thinking first.', '{He}\'ll walk into a fight to see what it\'s about. One day it\'ll be about {him}.'] },
  shy: { warm: ['Quiet. You can sit a whole afternoon with {Q} and hear ten words, and all ten worth having.', '{He} blushes if you say good morning. It\'s very sweet. Don\'t tell {him} I said so; {he}\'d blush.'], cool: ['Says nothing, sees everything. You never quite know where you stand.', '{He} mumbles. I\'ve known {him} years and I still don\'t know what {his} voice sounds like at full size.'] },
  generous: { warm: ['{He}\'d give you the coat off {his} back and then apologise that it wasn\'t warmer.', 'Half the village owes {Q} something, and {he}\'s never once mentioned it.'], cool: ['Generous. Loudly. Everyone knows exactly what {he}\'s given and to whom.', 'Gives with one hand, keeps a tally with the other.'] },
  jovial: { warm: ['Laughs like a donkey and makes you laugh like one too. The tavern\'s emptier without {him}.', '{He} tells the same six jokes and I laugh every time. That\'s friendship, I suppose.'], cool: ['Laughs at {his} own jokes, which is lucky, because somebody has to.', 'Everything\'s a joke to {Q}. Even when it isn\'t.'] },
  anxious: { warm: ['{He} worries about everybody. Brings you soup if you sneeze. Then worries the soup was wrong.', 'Nervous as a hare, but kind. The nervous ones often are.'], cool: ['Frets. About everything. It\'s catching, and I\'ve no time to catch it.', '{He} jumps at shadows. It makes the rest of us jumpy.'] },
  proud: { warm: ['Proud, yes. But {he}\'s earned it. Look at {his} work and tell me {he} hasn\'t.', '{He} holds {his} head up. In a village this size, that takes some doing.'], cool: ['Can\'t stand being wrong. Can\'t stand anyone else being right.', '{He} walks like the lane was laid for {him} personally.'] },
  dreamy: { warm: ['Head in the clouds, but {he} sees things up there the rest of us miss.', '{He} stops in the middle of the lane to look at a cloud. I\'ve started stopping too.'], cool: ['Away with the gulls, most days. Ask {him} a question and come back tomorrow for the answer.', 'Lovely, in a useless sort of way.'] },
  'early bird': { warm: ['Up before the birds and cheerful about it. I don\'t understand it, but I admire it.', '{He}\'s had a full day by the time I\'ve found my shoes.'], cool: ['Bangs about at dawn like the rest of us aren\'t trying to sleep.', 'Up before light, and wants you to know it.'] },
  'night owl': { warm: ['{He} comes alive after dark. The best talks I\'ve had were with {Q}, by a dying fire.', 'Useless before noon. Wonderful after supper.'], cool: ['Up all night doing who knows what, and asleep all morning when there\'s work.', 'You hear {him} come in at all hours. The whole lane does.'] },
  homebody: { warm: ['Keeps a lovely house. Go round and you\'ll leave fed and warm and not quite sure how.', '{He} doesn\'t go out much. When you visit, it\'s like being let in on a secret.'], cool: ['Never goes out. Which is when you start to wonder what {he} gets up to in there.', '{He} treats the end of the lane like the edge of the world.'] },
  sociable: { warm: ['Knows everyone, likes everyone, and somehow means it.', '{He}\'s the one who gets people talking at a feast. Without {him} we\'d all stare at our bowls.'], cool: ['Everyone\'s friend. Which in my experience means nobody\'s.', '{He} can\'t bear a silence. Fills it with whatever comes to hand.'] },
};
const CV_WORKSKETCH: any = {
  Guard: ['As a watchman? Fair, mostly. Nobody likes being watched, but {he} does it without enjoying it.', 'In the uniform {he} stands a bit taller. Out of it, {he}\'s just {Q}.'],
  Farmer: ['{He} talks to the barley. Out loud. The barley seems to like it.', 'Give {him} a field and a dry week and {he}\'s the happiest soul alive.'],
  Gatherer: ['{He} knows every bush on the island and which ones bite.', 'Comes back from the hills with a full basket and scratches to the elbow.'],
  Builder: ['{He}\'s put up half the walls in the lane. Lean on one and you\'ll see they\'re straight.', 'Always covered in dust. I\'ve never seen {him} without a beam on one shoulder.'],
  Stonecutter: ['Hands like slabs, from the quarry. Gentle with them, though.', '{He} can look at a rock and tell you where it wants to split.'],
  Woodcutter: ['Swings an axe like it\'s nothing. I tried once. Ask me about my shoulder.', '{He} smells of pine, always. It\'s not unpleasant.'],
  Fisher: ['Out before light, back with the tide. {He} talks about fish the way some people talk about sweethearts.', '{He} can mend a net faster than I can tie a shoe.'],
  Baker: ['Flour to the elbows by dawn. The whole lane wakes up to {his} bread.', '{He} gets very serious about bread. Don\'t ever call it "just bread".'],
  Smith: ['Arms like hams and a laugh you can hear over the hammer.', '{He}\'s burnt every finger {he} owns at least once, and tells you about each one.'],
  Cook: ['{He} cooks like {he}\'s feeding an army, every time. Nobody leaves the Thermopolium hungry.', 'Never trust a thin cook, {he} says. {He} has nothing to worry about.'],
  Shopkeeper: ['Knows the price of everything, and what you paid last time, and what you said about it.', 'Behind that counter {he}\'s a different person. Sharper.'],
  BathKeeper: ['Runs the baths like a temple. Don\'t splash.', 'Hears more secrets than the priest. People talk in the steam.'],
  Weaver: ['{He} can sit at the loom all day without a word, and what comes off it is lovely.', 'Patient hands. You need them for the loom.'],
  Labourer: ['Carries whatever needs carrying, wherever. Never complains. Well. Rarely.', 'Strong back, and never says no to a job. The village would grind to a halt without {him}.'],
};
const CV_OPENER: any = { love: ['{Q}? The best of us.', 'I\'ll tell you what {Q}\'s like.', '{Q}\'s one of the good ones.'], like: ['{Q}? Decent. More than decent.', 'I like {Q}. Let me think how to put it.', '{Q}\'s all right.'], meh: ['{Q}? Hard to say.', '{Q}. Well.', 'I don\'t know {him} as well as some.'],
  dislike: ['{Q}? You want the polite version?', 'I\'ll try to be fair.', '{Q}. Hm.'], hate: ['You don\'t want my opinion of {Q}. Fine:', '{Q}? Where do I start.', 'I\'ll be honest, since you asked.'] };
const CV_KICK: any = { love: ['Don\'t tell {him} I said any of that.', 'I\'d trust {him} with my last coin.', ''], like: ['', '', 'You could do a lot worse for a neighbour.'], meh: ['', ''], dislike: ['', 'And that\'s me being fair.'], hate: ['That\'s me being kind.', '', 'And I\'ll say it to {his} face, too.'] };
const CV_KIDSKETCH = ['{Q}? A menace. A small, sticky menace. I\'d walk into the sea for {him}.', '{He}\'s at the age where everything is a question. Why is the sea wet. Why is the baker bald.', '{He} runs everywhere. I\'ve never once seen {Q} walk.', 'Bright as a button and twice as hard to find when there\'s work to do.', '{He} collects stones. Good ones, mind. {He}\'ll tell you which ones are good and why.'];
const CV_OLDSKETCH = ['{Q} has seen everything twice and tells you about it three times.', 'Old {Q}? Sharp as ever. Don\'t let the stick fool you.', '{He} remembers when the village was four houses and a goat. {He} remembers the goat\'s name.', '{He}\'s slowed down, but only on the outside.'];
/** "What is Q really like?": their character, as the speaker sees it */
function cvDescribe(c, q): CvUtt {
  const o = c.o, f = cvFeel(o, q), hooks: CvHook[] = [cvPersonHook(q)], rel = cvBackOf(o).find(b => b.a === q.id || b.b === q.id);
  if (rel) hooks.push({ k: 'back', key: 'bk' + rel.id, label: cvLabel({ kind: 'back', back: rel }), back: rel });
  if (q.age < 14) return cvU(cvPkQ(c, CV_KIDSKETCH, q), hooks);
  if ((o.know[q.id] || 0) < 8 && !isKin(o, q)) return cvU(cvPkQ(c, ['Honestly? I hardly know {him}. {He} nods at me at the well. That\'s the whole of it.', 'I couldn\'t tell you. We\'ve said good morning, and that\'s about it.', 'No idea, really. {He} keeps to {his} end of the village and I keep to mine.'], q), hooks);
  const warm = f === 'love' || f === 'like' || (f === 'meh' && Math.random() < 0.5), tr = (q.traits || []).filter(t => CV_SKETCH[t]), parts: string[] = [cvPkQ(c, CV_OPENER[f], q)];
  if (q.age >= 62 && Math.random() < 0.5) parts.push(cvPkQ(c, CV_OLDSKETCH, q));
  else if (tr.length) parts.push(cvPkQ(c, CV_SKETCH[tr[Math.floor(Math.random() * tr.length)]][warm ? 'warm' : 'cool'], q));
  if (q.job && CV_WORKSKETCH[q.job] && (parts.length < 2 || Math.random() < 0.35)) parts.push(cvPkQ(c, CV_WORKSKETCH[q.job], q));
  if (parts.length < 2) parts.push(cvQ(warm ? 'Good company, on the whole.' : 'Somebody I can only take in small amounts.', q));
  const k = cvPkQ(c, CV_KICK[f], q); if (k) parts.push(k);
  return cvU(parts.join(' '), hooks);
}
/** "How did you two end up like this?": the history between the speaker and q */
function cvHowYouTwo(c, q): CvUtt {
  const o = c.o, f = cvFeel(o, q), kw = kinWord(o, q);
  if (f === 'meh' && !kw && !cvBackOf(o).some(b => b.a === q.id || b.b === q.id)) return cvU(cvPkQ(c, ['Like what? We don\'t have a "like this". We nod. That\'s it.', 'End up? We never started. {Q}\'s just somebody I see about.'], q), [cvPersonHook(q)]);
  return cvTellPerson(c, { key: 'pe' + q.id, kind: 'person', q, sens: 0.25 }, 1) || cvU(cvQ('It just went that way. Most things do.', q), [cvPersonHook(q)]);
}
/** "There's more to you and Q than you say.": the crush, the old story, the reason; or the honest "there isn't" */
function cvProbePair(c, q): CvUtt {
  const o = c.o, w = cvWilling(c, 0.45, 'pe' + q.id), back = cvBackOf(o).find(b => b.a === q.id || b.b === q.id), hooks: CvHook[] = [cvPersonHook(q)];
  const secret = o.crush === q.id || (back && back.kind === 'flame'), why = sbTopWhy(o, q), wt = why && Math.abs(why.v) >= 4 && sbWhyText(o, q, why);
  if (!secret && !back && !wt) return cvU(cvPkQ(c, ['There isn\'t. I promise you, there isn\'t. Some people are just people you know.', 'You\'re looking for a story. There\'s no story. {Q} is {Q}, and I\'m me.'], q), hooks);
  if (w === 'no') return { text: cvDeflectLine(o, c.p), hooks: [{ k: 'avoid', key: 'avoid:pp' + q.id, label: q.first, extra: { k: 'person', key: 'pe' + q.id, label: q.first, q } }] };
  if (o.crush === q.id) return cvU(cvPkQ(c, ['…All right. I like {him}. More than like. There. Don\'t you dare say a word.', 'Is it that obvious? Gods. Yes. {Q}. Don\'t look at me like that.'], q), hooks);
  if (back) { hooks.push({ k: 'back', key: 'bk' + back.id, label: cvLabel({ kind: 'back', back }), back }); const a1 = cvBackNext(c, back), a2 = (c.told['bk' + back.id] || 0) < 3 ? cvBackNext(c, back) : ''; return cvU(`${a1} ${a2 !== a1 ? a2 : ''}`.trim(), hooks); }
  return cvU(cvCap(wt) + '. ' + cvPkQ(c, why.v < 0 ? ['That\'s what\'s between us. It\'s enough.', 'You don\'t forget a thing like that.'] : ['That\'s all. It\'s more than most people do for you.', 'You remember a thing like that.'], q), hooks);
}
/** "Do you two always get on like that?" / "Families. Nobody can drive you madder.": about kin */
function cvKinAns(c, q, which: number): CvUtt {
  const f = cvFeel(c.o, q), kw = kinWord(c.o, q) || 'family', good = f === 'love' || f === 'like', ex = { kw };
  if (kw === 'son' || kw === 'daughter' || kw === 'grandson' || kw === 'granddaughter') return cvU(cvPkQ(c, which === 0 ? (good ? ['Mostly. {He}\'s my {kw}; {he} gets away with murder.', 'Like that? Like what? …Yes. Don\'t tell {him}.'] : ['Not lately. {He}\'s at that age. Every age is that age, with {Q}.', 'We used to. I don\'t know what happened. I think {he} grew up.'])
    : (good ? ['Madder, and fonder. Both at once.', 'You\'re telling me. And I made {him}, so I\'ve only myself to blame.'] : ['Madder is the word. My own {kw}, and I don\'t understand a thing {he} does.']), q, ex), [cvPersonHook(q)]);
  if (kw === 'mother' || kw === 'father' || kw === 'grandmother' || kw === 'grandfather') return cvU(cvPkQ(c, which === 0 ? (good ? ['Mostly. I\'m turning into {him}, so we\'d better.', 'We do. Don\'t sound so surprised.'] : ['No. {He}\'s never once been pleased with me, and I\'ve stopped trying.', 'When I do as I\'m told. Which is never.'])
    : (good ? ['You\'re telling me. And I sound more like {him} every year.', 'Madder, and fonder. That\'s my {kw}.'] : ['Madder? {He} invented it.']), q, ex), [cvPersonHook(q)]);
  if (kw === 'wife' || kw === 'husband') return cvU(cvPkQ(c, which === 0 ? (good ? ['Mostly. Twenty years of practice. The trick is never to agree about anything important.', 'Like what? …Yes. Don\'t tell {him}; {he}\'ll get ideas.', 'We have our days. More good than bad. That\'s marriage, I\'m told.'] : ['Like what? …No. Not lately.', 'We used to. Ask me again when {he}\'s apologised.', 'You learn each other\'s silences. Ours have got very loud.'])
    : (good ? ['Madder, and fonder. Both at once. That\'s marriage.', 'You\'re telling me. {Q} can do it with one look.'] : ['Madder is the word. My own {kw}, and some days I can\'t be in a room with {him}.', 'Don\'t. I\'ve been married to it for years.']), q, ex), [cvPersonHook(q)]);
  const A = which === 0 ? (good ? ['Mostly. We\'ve had years of practice. The trick is never to agree about anything important.', 'Like what? …Yes. Since we were small. Don\'t tell {him}; {he}\'ll get ideas.'] : f === 'meh' ? ['Like what? …Fine. Not always. But I\'d still fight anyone who said a word against {him}.', 'Some days. Other days I go for a long walk.'] : ['No. Not lately. And I don\'t want to talk about why. …Well. Maybe a little.', 'We used to. Ask me again when {he}\'s apologised.'])
    : (good ? ['You\'re telling me. {Q} can do it with one look. I can do it back, mind.', 'Madder, and fonder. Both at once. That\'s family.'] : ['You don\'t know the half of it. {Q} can empty a room just by coming into it.', 'Madder is the word. My {kw}, and I can\'t be in a room with {him} for an hour.']);
  return cvU(cvPkQ(c, A, q, ex), [cvPersonHook(q)]);
}
/** "You light up when you say his name." / "If you like him that much, tell him." */
function cvFondAns(c, q, which: number): CvUtt {
  const o = c.o, kw = kinWord(o, q), crush = o.crush === q.id, kin = kw && !['friend', 'rival', 'sweetheart'].includes(kw);
  const A = crush ? (which === 0 ? ['Do I? …Don\'t. Don\'t you dare say a word to {him}.', 'I— is it that obvious? Gods.'] : ['Tell {him}? I\'d sooner swim to the mainland.', 'And watch {his} face fall? No. Thank you. No.'])
    : kin ? ['{He}\'s my {kw}. I\'m allowed.', 'Of course I do. {He}\'s my {kw}. One day you\'ll have somebody like that.'] : (which === 0 ? ['{Q}\'s a good friend. That\'s all. …Mostly all.', 'Everyone lights up for {Q}. It\'s not just me.'] : ['{He} knows. That\'s the nice thing about {Q}: you don\'t have to say it.', 'I tell {him} all the time. Usually by insulting {his} cooking.']);
  return cvU(cvPkQ(c, A, q, { kw }), [cvPersonHook(q)]);
}
/** "You say his name like it tastes of vinegar." / "Go on, what did Q do?": the reason they dislike them */
function cvSourAns(c, q, which: number): CvUtt {
  const o = c.o, why = sbTopWhy(o, q, -1), wt = why && sbWhyText(o, q, why), back = cvBackOf(o).find(b => b.a === q.id || b.b === q.id), hooks: CvHook[] = [cvPersonHook(q)];
  if (back) { hooks.push({ k: 'back', key: 'bk' + back.id, label: cvLabel({ kind: 'back', back }), back }); return cvU((which === 0 ? 'Because it does. ' : 'Spill my wine? I wish. ') + cvBackNext(c, back), hooks); }
  if (wt) return cvU((which === 0 ? cvPkQ(c, ['Because it does. ', 'It does, a bit. ']) : cvPkQ(c, ['Worse than wine. ', 'I wish it was wine. '])) + cvCap(wt) + '.', hooks);
  const tr = (q.traits || []).find(t => cvTraitWhy[t]); return cvU((which === 0 ? 'Does it? Well. ' : 'Nothing, exactly. ') + (tr ? cvQ(cvTraitWhy[tr], q) : cvQ('It\'s a feeling. I\'ve had it since the day we met.', q)), hooks);
}
/** "Does Q ever stop working?" */
function cvWorkAns(c, q): CvUtt {
  const t = q.traits || [], A = t.includes('lazy') ? ['Stop? {He}\'d have to start first.', 'Ha! You\'ve seen a different {Q} to me.'] : t.includes('early bird') ? ['Up before the birds, every day. It\'s indecent.', 'Never. I\'ve seen {him} working by lamplight and again at dawn.'] : ['{He} stops for supper. Sometimes.', 'On rest days. Then {he} sits and looks at {his} hands like {he}\'s missing something.', 'Not that I\'ve seen. I think {he} likes it, which is more than most of us can say.'];
  return cvU(cvPkQ(c, A, q), [cvPersonHook(q)]);
}
/** "That sounds like it hurts." about somebody they dislike */
function cvHurtAns(c, q): CvUtt {
  const why = sbTopWhy(c.o, q, -1), wt = why && sbWhyText(c.o, q, why);
  return cvU(cvPkQ(c, ['It does. More than I let on.', 'Hurts? …It did. Now it mostly itches.', 'It\'s not hurt, exactly. It\'s tiredness.'], q) + (wt ? ' ' + cvCap(wt) + '.' : ''), [cvPersonHook(q)]);
}
/** a baby or a small child as the subject */
function cvBabyAns(c, q, which: number): CvUtt {
  const o = c.o, kw = kinWord(o, q), mine = kw === 'son' || kw === 'daughter' || (q.fam && (q.fam.mother === o.id || q.fam.father === o.id));
  const mo = q.fam && byId(q.fam.mother), fa = q.fam && byId(q.fam.father);
  const A = which === 0 ? (mine ? ['Loud. Hungry. Perfect. I haven\'t slept since.', 'Growing like a weed. Screaming like a gull. We adore {him}.'] : ['Loud, I hear. Healthy, the gods be thanked.', 'Thriving, by the sound of it. You can hear {him} from the well.'])
    : [`${mo ? mo.first + '\'s eyes' : 'The mother\'s eyes'}, everyone says. I say ${fa ? fa.first + '\'s' : 'the father\'s'} temper.`, 'Too early to say. All babies look like a cross old man for the first month.'];
  return cvU(cvPkQ(c, A, q), []);
}

/* ---------------- events: suspicion, sources, doubt, how the victim is taking it ---------------- */
function cvEvSuspect(c, ev): CvUtt { const o = c.o, k = o.kn && o.kn[ev.id]; if (!k) return cvU('I couldn\'t say. I only know what everyone knows.'); return cvTellEvent(c, { key: 'ev' + ev.id, kind: 'event', ev }, 1) || cvU('Nobody knows who. That\'s what bothers me.'); }
function cvEvSource(c, ev, which: number): CvUtt {
  const o = c.o, k = o.kn && o.kn[ev.id], hooks: CvHook[] = [{ k: 'event', key: 'ev' + ev.id, label: cvLabel({ kind: 'event', ev }), ev }];
  if (!k) return cvU('I don\'t, really. It\'s what I heard.', hooks); const kind = sbKind(o, ev), from = k.from != null ? byId(k.from) : null;
  if (kind === 'own' || kind === 'fact' || k.mine) return cvU(cvPkQ(c, which === 0 ? ['I saw it with my own eyes. I\'d swear to it.', 'Because I was there. I wish I hadn\'t been.'] : ['I know my part of it. I was standing right there.', 'More than most. I saw it.']), hooks);
  if (from === c.p) return cvU('You told me. Are you saying it isn\'t?', hooks);
  if (from) { hooks.push(cvPersonHook(from)); const t = (o.aff[from.id] || 0) + sbTrustOf(o, from);
    return cvU(cvQ(t > 25 ? cvPkQ(c, ['{Q} told me, and {Q} doesn\'t make things up. Not about this.', 'From {Q}. I\'d trust {him} with my life, so I trust {him} with this.']) : t < -10 ? cvPkQ(c, ['{Q} told me. Which, now you mention it, is not a recommendation.', 'I had it from {Q}. I should probably have checked.']) : cvPkQ(c, ['{Q} told me. {He} had it from somebody else. You know how it goes.', 'From {Q}. I\'ve no reason to doubt {him}. No reason to trust {him} either.']), from), hooks); }
  return cvU(cvPkQ(c, which === 0 ? ['I don\'t, really. Everyone\'s saying it. That\'s not the same thing, I know.', 'It\'s going round. Things that go round are true about half the time.'] : ['Nobody knows the whole of anything here. I know my bit.', 'The whole story? In this village? Nobody has the whole story. Everybody has a piece.']), hooks);
}
function cvEvDoubt(c, ev, which: number): CvUtt {
  const o = c.o, k = o.kn && o.kn[ev.id], kind = k ? sbKind(o, ev) : 'rumour', from = k && k.from != null ? byId(k.from) : null, hooks: CvHook[] = [{ k: 'event', key: 'ev' + ev.id, label: cvLabel({ kind: 'event', ev }), ev }];
  if (kind === 'fact' || kind === 'own') return cvU(cvPkQ(c, which === 0 ? ['Differently? I was there. Whoever told you otherwise wasn\'t.', 'Then you heard it wrong. I saw it.'] : ['I was there. If anything, I\'m making it smaller.', 'Exaggerate? I\'m leaving bits out.']), hooks);
  return cvU(which === 0 ? (from ? cvQ(cvPkQ(c, ['Differently how? I had it from {Q}, and {Q} sounded very sure.', 'Did you? I got it from {Q}. One of you has it wrong.']), from) : cvPkQ(c, ['Differently how? Go on. It wouldn\'t be the first time a story changed on the way here.', 'Did you? Well, it was second-hand when it got to me.'])) : cvPkQ(c, ['Maybe. I only pass it on the way I got it.', 'Probably. Everything grows a bit in the telling. Even so.']), hooks);
}
function cvEvJoke(c, ev, which: number): CvUtt {
  const t = lf2By(ev.target), hurt = t && t !== c.o && (c.o.aff[t.id] || 0) > 40 && ev.tags.some(g => (LF2_TAGS[g] || {}).v < 0);
  if (hurt) return cvU(cvQ(cvPkQ(c, ['It isn\'t funny for {Q}.', 'Not funny. {Q}\'s a friend of mine.']), t), [cvPersonHook(t)]);
  const A = which === 0 ? (c.landed ? ['Ha! Dull. I\'d give a week\'s bread for dull.', 'Ha! No. Nobody\'s ever said that. Not once.'] : ['Hm. I\'d settle for a bit of dull, honestly.', 'Dull would be nice.']) : (c.landed ? ['Ha! Don\'t. The goose has an alibi.', 'Ha! The goose would never. The goose has standards.'] : ['…The goose was nowhere near it.', 'Leave the goose out of it.']);
  return cvU(cvPkQ(c, A), [{ k: 'event', key: 'ev' + ev.id, label: cvLabel({ kind: 'event', ev }), ev }]);
}
/** "Does anyone know how they're taking it?": the target's real state */
function cvEvTaking(c, ev): CvUtt {
  const o = c.o, t = lf2By(ev.target); if (!t || t === c.p) return cvU('I couldn\'t say.'); const hooks = [cvPersonHook(t)], ill = t.ill && t.ill.until > game.time, good = ev.tags.some(g => (LF2_TAGS[g] || {}).v > 0);
  const A = ill ? ['Badly. {He}\'s in bed and won\'t eat.', 'Not well. {He}\'s laid up, and the house is very quiet.'] : good ? ['Taking it? {He}\'s delighted. {He}\'s told everyone twice.', 'Very well indeed. {He}\'s been smiling at strangers.'] : (t.mood || 50) < 35 ? ['Not well. I saw {him} at the well this morning; {he} looked straight through me.', 'Badly, I think. {He}\'s gone very quiet, and {Q} is never quiet.'] : (t.mood || 50) > 65 ? ['Better than you\'d think. {He} was laughing about it by supper.', 'Fine, by the look of {him}. Tougher than {he} looks, {Q}.'] : ['Quietly. {He} hasn\'t said a word about it, which says plenty.', 'Hard to tell with {Q}. {He} keeps things in.'];
  const close = (o.aff[t.id] || 0) > 40 ? ' ' + cvPkQ(c, ['I\'m going round later.', 'I took {him} some bread yesterday.', 'I\'ll look in on {him} tonight.'], t) : '';
  return cvU(cvPkQ(c, A, t) + close, hooks);
}

/* ---------------- old stories ---------------- */
function cvBackHow(c, b): CvUtt {
  const o = c.o, A = byId(b.a), B = byId(b.b), self = o.id === b.a || o.id === b.b, other = self ? cvOther(b, o) : null, hooks: CvHook[] = [{ k: 'back', key: 'bk' + b.id, label: cvLabel({ kind: 'back', back: b }), back: b }, cvPersonHook(A), cvPersonHook(B)];
  if (self && cvWilling(c, b.sens, 'bk' + b.id) === 'no') return { text: cvDeflectLine(o, c.p), hooks: [{ k: 'avoid', key: 'avoid:bk' + b.id, label: 'that', extra: hooks[0] }] };
  cvLearnBack(c, b, 1);
  if (b.kind === 'debt') return cvU(self ? (o.id === b.a ? `I needed money for ${b.why}. ${B.first} had it. That's how these things always start: somebody being kind.` : `${A.first} needed money for ${b.why}, and I had a little put by. I'd do it again. I think.`) : `${A.first} needed money for ${b.why}. ${B.first} had it. That's how these things start.`, hooks);
  if (b.kind === 'feud') return cvU(self ? `Over ${b.why}. Ask ${cvPron(other).him} and it'll be my fault. Ask me and it's ${cvPron(other).his}.` : `Over ${b.why}, people say. Ask either of them and you'll get two different stories.`, hooks);
  return cvU(self ? `${cvCap(b.why)}. That's all I'll say about how it started.` : `${cvCap(b.why)}, I heard. These things start the way they always start.`, hooks);
}
function cvBackFix(c, b): CvUtt {
  const o = c.o, A = byId(b.a), B = byId(b.b), self = o.id === b.a || o.id === b.b, other = self ? cvOther(b, o) : null, hooks: CvHook[] = [{ k: 'back', key: 'bk' + b.id, label: cvLabel({ kind: 'back', back: b }), back: b }];
  if (!self) return cvU(cvPkQ(c, ['It isn\'t mine to put right. But somebody should.', 'Not my place. I\'ve thought about knocking their heads together, mind.']), hooks);
  if (b.kind === 'debt') return cvU(o.id === b.a ? cvPkQ(c, ['Every harvest I mean to. Every harvest something else needs the money first.', 'I\'ve got half of it in a jar. I keep spending the half.']) : cvQ(cvPkQ(c, ['It isn\'t mine to put right. I\'m the one who\'s owed.', 'I could forget it. I\'ve thought about it. Then I see {him} buying wine.']), other), hooks);
  if (b.kind === 'feud') return cvU(cvQ(cvPkQ(c, ['Once. I went round with a jar of honey. {He} shut the door before I\'d said a word.', 'I think about it. Then I see {his} face and I stop thinking about it.']), other), hooks);
  return cvU(cvPkQ(c, ['There\'s nothing to put right. That\'s the trouble with it.', 'Put what right? Nothing happened. That\'s the whole sad story.']), hooks);
}
function cvBackFlame(c, b): CvUtt {
  const o = c.o, self = o.id === b.a || o.id === b.b, other = self ? cvOther(b, o) : null, hooks: CvHook[] = [{ k: 'back', key: 'bk' + b.id, label: cvLabel({ kind: 'back', back: b }), back: b }];
  if (!self) return cvU(cvPkQ(c, ['Me? No! I meant them.', 'Not me. I only tell the story. I\'m not in it.']), hooks);
  return cvU(cvQ(lf2Spouse(o) ? cvPkQ(c, ['Hush. Not here. Not ever, actually.', 'I\'m married. I have no soft spots. …Don\'t look at me like that.']) : cvPkQ(c, ['Maybe. A small one. Don\'t tell {him}.', 'A soft spot? A bruise, more like. They feel the same, some days.']), other), hooks);
}
function cvBackPay(c, b): CvUtt {
  const o = c.o, A = byId(b.a), hooks: CvHook[] = [{ k: 'back', key: 'bk' + b.id, label: cvLabel({ kind: 'back', back: b }), back: b }];
  return cvU(o.id === b.a ? cvPkQ(c, ['With what? You\'ve seen my purse.', 'Oh, simply. Of course. Why didn\'t I think of that.']) : o.id === b.b ? 'I\'m not the one who owes! Weren\'t you listening?' : cvQ('It isn\'t my debt. Tell {Q}.', A), hooks);
}

/* ---------------- their own life ---------------- */
const CV_LIFEQ: any = {
  amb: {
    stop: ['Time. Coin. Nerve. Mostly nerve.', 'Me, mostly. I\'m very good at stopping me.', 'Everybody needs feeding first. Then the roof. Then there\'s no evening left.', 'Somebody has to want it more than they\'re frightened of it. I\'m working on it.', 'The thought of everyone watching me try.'],
    when: ['Spring. It\'s always spring. I\'ve been saying spring for six years.', 'Tomorrow. I say that every night.', 'When the roof\'s fixed. Then it\'ll be when the next thing\'s fixed.', 'I\'ve started. Twice. I\'ll start again.', 'When somebody tells me I can\'t. Then I\'ll do it out of spite.'],
    after: ['Sit down. For about a week. Then probably want something else; that\'s the trouble with wanting.', 'Tell everybody. Loudly. Then pretend I\'d never doubted it.', 'Cry, I expect. And then do it again, better.', 'I\'ve never once thought past getting it. Isn\'t that strange?'],
    good: ['You think so? I\'ve never said it out loud. It sounds smaller outside my head.', 'It is, isn\'t it? Thank you. People usually laugh.', 'Good to want. Hard to get. I\'ll take the first half for now.'],
  },
  reg: { heavy: ['It is. It comes back when it\'s quiet. Rain, mostly.', 'Heavier some days. You learn to carry it on the other shoulder.'], who: ['A few. Fewer than you\'d think. And now you.', 'Nobody, really. It\'s not the kind of thing you bring up at supper.'] },
  pri: { tease: ['It does. Next year I\'ll have carried two.', 'Better every year, and still true. Mostly true.', 'Ha! It does. You should hear the version I tell at the tavern.'], good: ['It\'s the one story I have that\'s entirely mine.', 'Thank you. Nobody says that. They just say "you told us".'] },
  fea: { since: ['Since I was small. You don\'t grow out of the real ones.', 'As long as I can remember.'], who: ['Nobody. I\'m very good at looking brave.', 'My family know. They\'re kind about it, which is worse.'], ok: ['Kind of you. I still won\'t go near one.', 'Isn\'t it? I tell myself that. My knees don\'t listen.'] },
  sec: { smile: ['The smiling kind. Mostly. It\'d still be embarrassing if it got out.', 'The kind that makes me smile, and then makes me check nobody saw.'], other: ['The other kind.', 'Not the smiling kind. Leave it there.'] },
};
const CV_SMILESECRET = ['cats', 'loan', 'poems', 'grand', 'dog', 'song', 'hide', 'letters'];
function cvLifeAns(c, kind: string, what: string): CvUtt {
  const o = c.o, L = cvLife(o), hooks: CvHook[] = [{ k: { amb: 'ambition', reg: 'regret', pri: 'pride', fea: 'fear', sec: 'secret' }[kind], key: kind, label: 'that' }], e = { amb: L.ambition, reg: L.regret, pri: L.pride, fea: L.fear }[kind];
  if (e && typeof e === 'object' && e[what]) return cvU(e[what], hooks);
  if (kind === 'sec') return cvU(cvPkQ(c, CV_LIFEQ.sec[L.secret && CV_SMILESECRET.includes(L.secret.kind) ? 'smile' : 'other']), hooks);
  const bank = CV_LIFEQ[kind] && CV_LIFEQ[kind][what]; return cvU(bank ? cvPkQ(c, bank) : cvPkQ(c, ['That\'s about the size of it.', 'There\'s not much more to say about it.']), hooks);
}

/* ---------------- legends, the day, the village ---------------- */
const CV_TRUE: any = { talkative: 'Every word. Well, most words. The best words, anyway.', reserved: 'Some of it.', nosy: 'I\'ve asked everyone who\'d know. They all say yes, and they all say it differently.', cynic: 'Not a word. It\'s still a good story.', sunny: 'I like to think so. It\'s nicer if it is.', wary: 'Enough of it. I wouldn\'t test it.', prickly: 'Does it matter? It\'s a story.', smooth: 'True enough to tell. That\'s all a story has to be.', lonely: 'I hope so. I\'d like there to be something like that here.' };
function cvLegendWho(c, h): CvUtt {
  const o = c.o, old = npcs.filter(q => q !== o && q !== c.p && !q.dead && q.age >= 55).sort((a, b) => (o.know[b.id] || 0) - (o.know[a.id] || 0))[0];
  if (old && Math.random() < 0.6) return cvU(cvPkQ(c, ['Old {Q}. {He} tells it every winter, and it gets longer every time.', '{Q}, when I was small. {He} used it to keep us off the rocks.'], old), [h, cvPersonHook(old)]);
  return cvU(cvPkQ(c, ['My grandmother. She told it to keep us in at night. It worked.', 'Everybody. Nobody. You just know it, growing up here.', 'A sailor, at the tavern, years ago. He cried at the end. So did I.']), [h]);
}
const CV_WORLDANS: any = {
  low: ['Twice a day, every day, since before anyone. The sea keeps better time than the bell.', 'Every day. You set your work by it here, or the work sets itself by the sea.'],
  high: ['Twice a day, near enough. Spring tides are the ones to watch.', 'Usual? It\'s the sea. It does what it likes, twice a day.'],
  rest: ['Every rest day, since before anyone can remember. Ask an old one why and you\'ll be there till supper.', 'Always has been. The one day nobody can tell you to work.'],
  eve: ['Every time. It\'s the best day of the week, the day before rest. Everything feels nearly done.', 'It\'s always like this. Nobody wants to be the one caught idle.'],
  feast: ['Every year. And every year somebody says they won\'t go, and every year they\'re the last to leave.', 'Every year. It\'s the one night the whole village is in one place.'],
  out: ['It\'s been happening more and more. The carts come late and the shelves go bare.', 'Usual enough, lately. Somebody\'s buying it all, and it isn\'t me.'],
  biz: ['Some weeks. This week especially.', 'It comes and goes. Mostly goes.'],
};
function cvWorldAns(c, h): CvUtt { return cvU(cvPkQ(c, CV_WORLDANS[h.facet] || ['It happens.', 'Often enough.']), []); }
function cvChronAns(c, h): CvUtt { return cvU(cvPkQ(c, ['Everyone, by now. It\'s the sort of thing that\'s all round the well by noon.', 'The whole village. There aren\'t many secrets in a place this size.', 'Anyone who was at the well this morning, which is everyone.']), h.q ? [cvPersonHook(h.q)] : []); }

/* ---------------- who feels what about whom; their own day ---------------- */
function cvRelDoesKnow(c, t): CvUtt {
  const o = c.o, a = t.q, b = t.extra && t.extra.b; if (!a || !b) return cvU('I couldn\'t say.'); const r = sbRelGet(o, a, b) || t.extra.r || { v: 0 }, back = b.aff[a.id] || 0, hooks = [cvPersonHook(a), cvPersonHook(b)];
  const L = r.v < 0 ? (back < -10 ? ['Oh, {B} knows. {B} gives as good as {he} gets.', '{B} knows. {B} has been returning the favour for years.'] : ['{B}? Not a clue. {B} still waves at {A} across the square. It\'s painful to watch.', 'I don\'t think so. {B} keeps being nice, and {A} keeps being cold, and nobody says anything.'])
    : (back > 30 ? ['{B} knows. Everyone knows except, apparently, the two of them.', 'Oh, {B} knows. {B} feels the same, if you ask me. Nobody asks me.'] : ['{B} hasn\'t noticed. Or is pretending not to. Hard to say with {B}.', 'Not yet. Somebody should tell {him}. Not me.']);
  return cvU(cvQ(cvPkQ(c, L), b, { A: a.first, B: b.first }), hooks);
}
const CV_CONVEND: any = { vent: ['It didn\'t end. {Q} ran out of breath, that\'s all.', 'With me nodding a lot.'], praise: ['With me agreeing, mostly.', 'Nicely. It\'s nice to hear somebody spoken well of, for a change.'], console: ['{He} was a bit better when I left. A bit.', 'With {him} asleep in the chair. That\'s a good ending, some days.'], row: ['Badly. Then supper, then nothing. That\'s how ours end.', 'With a door. You can say a lot with a door.'], argue: ['With both of us sure we were right.', 'It hasn\'t. We\'ll have the rest of it tomorrow.'], borrow: ['With a handshake and a promise. We\'ll see about the promise.'], lend: ['With a handshake and a promise. We\'ll see about the promise.'], refused: ['Badly. {He} walked off without a word.', 'With me standing there with my hand out. I won\'t do that again.'], asked: ['With {him} walking off. I don\'t blame {him}.', 'Badly. I said no. I\'d say it again, and I\'d feel just as rotten.'], repaid: ['Happily, for once.', 'With me counting it twice, to be polite.'], court: ['With a "see you tomorrow". …Why are you smiling?', 'It didn\'t. It\'s still going, sort of.'], 'heard secret': ['With me promising not to tell. So.', 'With {Q} looking over {his} shoulder. Which tells you something.'], rivalry: ['It doesn\'t end. It never ends.', 'With {Q} winning, as usual. Or saying so.'] };
function cvConvEnd(c, t): CvUtt { const n = t.extra && t.extra.n, w = t.q; return cvU(cvPkQ(c, (n && CV_CONVEND[n.ty]) || ['It just stopped. Most things do.'], w), w ? [cvPersonHook(w)] : []); }
function cvConvOk(c, t): CvUtt { const L = ['I\'ll live. …Thank you for asking.', 'I\'m all right. Better for saying it out loud.', 'Not really. But I will be.']; const u = cvTell(c, t, 1); return cvU(cvPkQ(c, L) + (u ? ' ' + u.text : ''), u ? u.hooks : [cvHook(t)]); }

/* ---------------- what they are doing ---------------- */
const CV_LIKEJOB: any = {
  Farmer: 'It\'s what there is. But there\'s a morning in spring when the shoots come up, and then I like it very much.', Fisher: 'I like the mornings. The sea\'s flat and nobody\'s awake and the fish don\'t argue.', Woodcutter: 'I like the smell. And the noise when a big one comes down. The rest is blisters.',
  Stonecutter: 'I like it when a stone splits clean. It doesn\'t happen often, so I like it a lot.', Gatherer: 'I like being out. Nobody finds you on the hill unless you want to be found.', Baker: 'I do. Is that strange? There\'s nothing like the first loaf out of the oven.',
  Smith: 'Like it? It\'s loud and hot and I\'d not do anything else.', Cook: 'I like feeding people. The cooking\'s just how you get there.', Shopkeeper: 'I like the talking. The selling\'s the price of the talking.', Guard: 'Some days. The quiet ones. The other days you just get through.', BathKeeper: 'Warm all day and everyone tells me everything. What\'s not to like?', Builder: 'I like walking past a wall I built. That never gets old.',
};
function cvActHow(c): CvUtt {
  const o = c.o, m = o.mood == null ? 50 : o.mood;
  return cvU(cvPkQ(c, m < 35 ? ['Badly, if you want the truth. Everything\'s taking twice as long.', 'Don\'t ask. Actually, you did ask. Badly.'] : m > 70 ? ['Well! Really well, for once. Don\'t jinx it.', 'Better than it has any right to.'] : ['It goes. Some days it goes faster.', 'Fine. Ordinary. I\'ll take ordinary.']), [{ k: 'act', key: 'act2', label: 'that' }]);
}
function cvActLike(c): CvUtt {
  const o = c.o, t = o.traits || [];
  if (t.includes('lazy')) return cvU(cvPkQ(c, ['Like it? Nobody likes work. Anybody who says they do is selling something.', 'It\'s what there is. I like the end of it best.']), []);
  if (o.age < 14) return cvU(cvPkQ(c, ['It\'s all right. I\'d rather be at the rock pools.', 'Mum says I will when I\'m older. I don\'t think that\'s how it works.']), []);
  return cvU(o.job && CV_LIKEJOB[o.job] ? CV_LIKEJOB[o.job] : cvPkQ(c, ['It\'s what there is. Some days that\'s enough.', 'I like parts of it. The stopping, mostly.']), []);
}
function cvActBusy(c, which: number): CvUtt { return cvU(cvPkQ(c, which === 0 ? ['Busy is better than the alternative. The alternative is my mother asking why I\'m not busy.', 'Looking busy is half the job. The other half is being busy.'] : ['Rest days. And even then I\'m thinking about it.', 'Once, I think. It was a Tuesday. I didn\'t enjoy it.']), []); }

/* ---------------- observations about them ---------------- */
function cvObsAns(c, id: string): CvUtt {
  const o = c.o, L: any = {
    baths: c.landed ? ['Cheek! …Tomorrow. Probably.', 'Ha! Fair. I\'ve been putting it off. The water\'s cold.'] : ['That\'s rich, coming from you.', 'I\'ve been working. Some of us do.'],
    aroma: ['I\'ve been working. Some of us do.', 'Well, you\'re no meadow yourself.'],
    different: o.mood > 65 ? ['Do I? I slept, for once.', 'Something good happened and I\'m not telling you what. Yet.'] : o.mood < 35 ? ['Nothing happened. That\'s the trouble.', 'Different how? Worse? Don\'t answer that.'] : ['Do I? Must be the light.', 'I don\'t think so. Same old me.'],
    well: ['Do I? I\'ll take it. The well water, probably.', 'Thank you. I don\'t feel it, but I\'ll take it.'],
    hat: ['This? My mother\'s work. I\'m not allowed to lose it.', 'Thank you! Nobody ever notices the hat.'],
    worse: ['Thank you so much. Truly. What a gift you are.', 'And you look like you\'ve never seen a mirror.'],
  };
  return cvU(cvPkQ(c, L[id] || ['Hm.']), []);
}

/* ---------------- things about you ---------------- */
function cvWhoToldMe(c, ev): CvUtt {
  const o = c.o, k = o.kn && o.kn[ev.id], from = k && k.from != null ? byId(k.from) : null, kind = k ? sbKind(o, ev) : 'rumour';
  if (kind === 'fact' || (k && !k.from)) return cvU(cvPkQ(c, ['Nobody. I saw you.', 'Nobody had to. I was there.']), []);
  if (from && from !== c.p) return cvU(cvQ(cvPkQ(c, ['{Q} told me. {He} tells everyone everything.', '{Q}. Don\'t be cross with {him}; {he} meant well. Probably.']), from), [cvPersonHook(from)]);
  return cvU(cvPkQ(c, ['It\'s going round. I couldn\'t tell you where I first heard it.', 'Everyone. Nobody. You know how it is.']), []);
}
function cvTheySayOfMe(c): CvUtt { const s = lf2Standing(c.o); return cvU(cvPkQ(c, s > 10 ? ['Nice things, mostly. I make a lot of soup.', 'That I\'m a soft touch. They\'re not wrong.'] : s < -10 ? ['Nothing I\'d repeat.', 'Oh, plenty. I don\'t listen.'] : ['Nothing. I\'m not interesting enough to talk about. I\'d like to keep it that way.', 'Very little. I\'m careful.']), []); }
function cvWhatTheySay(c): CvUtt {
  const o = c.o, p = c.p, bad = Object.keys(o.kn || {}).map(id => lf2EvById(+id)).filter(ev => ev && ev.actor === p.id && o.kn[ev.id].a && ev.tags.some(t => (LF2_TAGS[t] || {}).v < 0)).sort((a, b) => b.t - a.t)[0];
  if (bad) { const t = cvMe(o, sbText(o, bad)), tail = t.replace(/^You\s+/, ''); return cvU(`That you ${lf2Low(tail).replace(/\.$/, '')}. That's the main one.`, [{ k: 'event', key: 'ev' + bad.id, label: 'that', ev: bad }]); }
  return cvU(cvPkQ(c, ['That you\'re not to be trusted. Nobody\'s said why. That\'s how it goes here.', 'Nothing in particular. It\'s more a feeling going round. Those are the hardest to shift.']), []);
}

/* ---------------- asking about something you know of: people, events, old stories, places ----------------
   The player can steer: ask about anybody they know, any news they have heard, any old story they have learned, any building in the
   village. The answer comes from the speaker's own knowledge, opinion and willingness, including "never heard of it" (and then they
   would like you to tell them).                                                                                                     */
const CV_PLACE: any = {
  tavern: { fan: ['Most nights. Don\'t tell anyone. Everybody already knows.', 'It\'s the best room in the village, and the wine\'s the worst. Somehow that works.'], plain: ['The wine\'s thin and the dice are crooked, and everyone you know is in there.', 'Loud. Warm. Somebody\'s always singing something rude.', 'Good for news. Bad for your purse.'], prim: ['I don\'t go. I hear plenty about it, though.', 'A den. A lovely, warm, terrible den.'] },
  bakery: { plain: ['{who}\'s bread is the best thing on the island. Don\'t tell {him}.', 'Warm, and it smells like heaven. Get there early or don\'t bother.'], out: ['Empty shelves half the time. {who} can\'t bake fast enough.'], sour: ['The bread\'s good. Shame about {who}.'] },
  smithy: { plain: ['Loud. Hot. {who} shouting at iron.', 'You can hear it from the well. {who} doesn\'t believe in quiet mornings.'], out: ['No iron, so no work. {who} just sits there polishing the anvil.'], sour: ['Good tools. Bad temper. {who}\'s, I mean.'] },
  baths: { plain: ['The best coin you\'ll spend all week.', 'Warm water and everyone\'s secrets. Mind the hot pool.', 'Ask {who}; {he} hears everything in there.'], sour: ['Lovely water. Shame about who runs it.'] },
  shop: { plain: ['{who} sells everything, eventually. Bowls, cloth, string. Prices you argue about.', 'Dark, crowded, and you always come out with something you didn\'t go in for.'], sour: ['{who} charges what {he} likes and smiles while {he} does it.'] },
  thermopolium: { plain: ['Hot food on the street. {who}\'s stew is the best thing in it.', 'Quick and greasy and good. Don\'t ask what\'s in the pot.'], out: ['No fish, no stew. {who}\'s been staring at an empty pot all morning.'], sour: ['The stew\'s fine. I go when {who}\'s not on.'] },
  macellum: { plain: ['All the sellers under one roof now. You get rained on less while you\'re being overcharged.', 'Busy. Loud. Everyone\'s in there, and everyone\'s haggling.', 'I like it. You can buy fish and a bowl and an argument, all in one place.'] },
  jail: { plain: ['I\'ve never been inside, and I mean to keep it that way.', 'Cold and damp, they say. The watch keeps it tidy, at least.'], mine: ['It\'s quiet, mostly. I\'d like it to stay that way.'] },
  church: { fan: ['I\'m there every morning. It\'s quiet. The Noodle doesn\'t ask much.', 'It\'s the one place I can think.'], plain: ['I go on feast days. Everyone does.', 'Quiet. Smells of candles and old barley.', '{who} keeps it. {He} takes the Noodle very seriously.'] },
  privy: { plain: ['It\'s a privy. What do you want, poetry?', 'Somebody named it. That\'s the most I can say for it.', 'Clean, for once. Somebody\'s been at it with a bucket.'] },
};
/** who works in a room, if anybody */
function cvRoomWho(r) { if (!r) return null; if (r.kind === 'church') return npcs.find(q => !q.dead && q.role === 'Priest') || null; return npcs.find(q => !q.dead && q.age >= 16 && q.job && LF2_JOBS[q.job] && LF2_JOBS[q.job].room === r.kind) || (typeof lf2RoomHead === 'function' ? lf2RoomHead(r) : null); }
function cvPlaceAns(c, r): CvUtt {
  const o = c.o, P = CV_PLACE[r.kind] || CV_PLACE.privy, who = cvRoomWho(r), hooks: CvHook[] = who && who !== o && who !== c.p ? [cvPersonHook(who)] : [];
  if (who === o) return cvU(cvPkQ(c, P.mine || ['It\'s mine, more or less. Come and see for yourself.', 'I\'m in there all day. Ask me something I don\'t know.']) + (Math.random() < 0.6 ? ' ' + (sbWorkLine(o) || '') : ''), []);
  const sell = LF2_SELL[r.kind], g = sell && Object.keys(sell)[0], out = g && (lf2Stock(r)[g] || 0) <= 0, sour = who && (o.aff[who.id] || 0) < -25;
  const fan = (r.kind === 'tavern' && (lf2Has(o, 'jovial') || lf2Has(o, 'sociable') || (o.drunk || 0) > 20)) || (r.kind === 'church' && lf2Has(o, 'devout')), prim = r.kind === 'tavern' && lf2Has(o, 'devout');
  const bank = out && P.out ? P.out : sour && P.sour ? P.sour : fan && P.fan ? P.fan : prim && P.prim ? P.prim : P.plain;
  const usable = bank.filter(s => who || !/\{who\}|\{he\}|\{He\}|\{him\}/.test(s)); const s = cvFreshest(c.p, usable.length ? usable : P.plain.filter(x => !/\{/.test(x)).concat(['It\'s all right. Nothing to write home about.'])); cvMarkHeard(c.p, s);
  return cvU(who ? cvQ(s.replace(/\{who\}/g, '{Q}'), who) : s, hooks);
}
function cvAskPersonAns(c, q): CvUtt {
  const o = c.o; if (q === o) return cvU('Me? You\'re looking at it.');
  if ((o.know[q.id] || 0) < 8 && !isKin(o, q)) { const k = npcs.filter(x => x !== o && x !== q && x !== c.p && !x.dead && (x.know[q.id] || 0) > 40).sort((a, b) => (b.know[q.id] || 0) - (a.know[q.id] || 0))[0];
    return cvU(cvQ(pk(['{Q}? I hardly know {him}. We nod at the well.', '{Q} keeps to {his} end and I keep to mine. I couldn\'t say.', 'I couldn\'t tell you. We\'ve hardly said ten words.']), q) + (k ? ` ${k.first} would know. They're thick as thieves.` : ''), k ? [cvPersonHook(q), cvPersonHook(k)] : [cvPersonHook(q)]); }
  return Math.random() < 0.5 ? cvDescribe(c, q) : (cvTellPerson(c, { key: 'pe' + q.id, kind: 'person', q, sens: 0.25 }, 0) || cvDescribe(c, q));
}
function cvAskEventAns(c, ev): CvUtt {
  const o = c.o, k = o.kn && o.kn[ev.id], hooks: CvHook[] = [{ k: 'event', key: 'ev' + ev.id, label: cvLabel({ kind: 'event', ev }), ev }];
  if (ev.actor === o.id || ev.target === o.id) { if (k) { const u = cvTellEvent(c, { key: 'ev' + ev.id, kind: 'event', ev }, 0); if (u) return u; } return cvU(pk(['That? I\'d rather not go over it.', 'You heard about that. Of course you did.']), hooks); }
  if (!k) return cvU(cvPkQ(c, ['Never heard a word of it. What happened?', 'Nothing. Nobody tells me anything. Go on, then: tell me.', 'I don\'t know anything about it. Should I?', 'First I\'ve heard of it. Go on.', 'No! Tell me everything. Start at the beginning.', 'Nobody\'s said a thing to me. What is it?']), [{ k: 'tellit', key: 'tell' + ev.id, label: 'that', ev }]);
  c.told['ev' + ev.id] = 1; cvMem(o, c.p).topics['ev' + ev.id] = game.time; lf2Tell(o, c.p, ev, false, true);
  const j = lf2Judge(o, ev, k.a), actor = k.a && !k.sus ? lf2By(sbWhoId(o, ev)) : null, target = lf2By(ev.target); if (actor && actor !== o) hooks.push(cvPersonHook(actor)); if (target && target !== o && target !== actor) hooks.push(cvPersonHook(target));
  return { text: pk(['Oh, that. ', 'That? ', 'Yes. ', 'I heard. ', '']) + cvCap(cvSpeechOf(o, sbText(o, ev), c.p)) + '.' + cvHedge(o, ev, k) + (Math.random() < 0.6 ? ' ' + cvStanceLine(o, cvStanceOf(ev, j)) : ''), hooks };
}
function cvAskBackAns(c, b): CvUtt {
  const o = c.o, self = o.id === b.a || o.id === b.b, known = self || b.knownBy.includes(o.id);
  if (!known) return cvU(pk(['Between those two? Nothing that I know of. Why, what have you heard?', 'No idea. Is there something? There\'s always something.']), [{ k: 'tellit', key: 'tellbk' + b.id, label: 'that', back: b }]);
  if (self && cvWilling(c, b.sens, 'bk' + b.id) === 'no') return { text: cvDeflectLine(o, c.p), hooks: [{ k: 'avoid', key: 'avoid:bk' + b.id, label: 'that', extra: { k: 'back', key: 'bk' + b.id, label: 'that', back: b } }] };
  return cvTellBack(c, { key: 'bk' + b.id, kind: 'back', back: b, sens: b.sens }, 0) || cvU('Old business. Best left.');
}
/** a few things the player could ask about, from what they know */
function cvAskAbout(c): CvOpt[] {
  const o = c.o, p = c.p, out: CvOpt[] = [], asked = c.asked, h: CvHook = { k: 'world', key: 'ask', label: 'that' }, cur = new Set((c.hooks || []).map(x => x.q && x.q.id));
  const add = (key: string, text: string, w: number, then) => { if (asked['ab:' + key]) return; out.push({ text, intent: 'ask', w, hook: h, fam: 'ask.' + key.split(':')[0], then: c2 => { c2.asked['ab:' + key] = 1; return then(c2); } }); };
  // people the player knows
  const ppl = npcs.filter(q => q !== o && q !== p && !q.dead && !q.infant && q.age >= 6 && (p.know[q.id] || 0) >= 10 && !cur.has(q.id));
  for (let i = 0; i < 2 && ppl.length; i++) { const q = ppl.splice(Math.floor(Math.random() * ppl.length), 1)[0]; add('pe:' + q.id, cvQ(pk(['What do you make of {Q}?', 'Do you know {Q} at all?', 'What\'s the story with {Q}?', 'Tell me about {Q}.', 'How do you get on with {Q}?']), q), 0.7, c2 => cvAskPersonAns(c2, q)); }
  // news the player has heard
  const evs = Object.keys(p.kn || {}).map(id => lf2EvById(+id)).filter(ev => ev && game.time - ev.t < 5 * 1440 && ev.actor !== p.id && ev.target !== p.id && ev.actor !== o.id && ev.target !== o.id && !ev.fake && !(c.gossiped && c.gossiped[ev.id]));
  if (evs.length) { const ev = evs[Math.floor(Math.random() * evs.length)], lab = cvLabel({ kind: 'event', ev }); add('ev:' + ev.id, pk([`What do you know about ${lab}?`, `Have you heard anything about ${lab}?`, `What's the truth about ${lab}?`]), 0.8, c2 => cvAskEventAns(c2, ev)); }
  // old stories the player has learned
  const K = cvKnows(p).back; for (const id in K) { const b = cvWorld().back.find(x => x.id === +id); if (!b || b.a === p.id || b.b === p.id) continue; const A = byId(b.a), B = byId(b.b); if (!A || !B || A.dead || B.dead) continue;
    const self = o.id === b.a || o.id === b.b, other = self ? (o.id === b.a ? B : A) : null; add('bk:' + b.id, self ? pk([`What happened between you and ${other.first}?`, `Is it true about you and ${other.first}?`]) : pk([`What's going on between ${A.first} and ${B.first}?`, `What do you know about ${A.first} and ${B.first}?`]), self ? 0.5 : 0.7, c2 => cvAskBackAns(c2, b)); break; }
  // places
  const pl = rooms.filter(r => !r.dead && CV_PLACE[r.kind] && r.kind !== 'privy'); if (pl.length) { const r = pl[Math.floor(Math.random() * pl.length)], nm = cvPlace(r.name); add('pl:' + r.id, pk([`What's ${nm} like?`, `Do you go to ${nm} much?`, `What do you think of ${nm}?`]), 0.5, c2 => cvPlaceAns(c2, r)); }
  return out;
}
