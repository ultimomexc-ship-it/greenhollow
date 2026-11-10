/* ================= social2 / sb-voice: what villagers say to each other, built from what is actually going on =================
   The Overheard list and the speech bubbles. Every exchange the social simulation runs (sb-exchange.ts) has its words here, filled with
   the facts of that exchange (who is being complained about and why, how much was lent, what the row is about, who is ill), and the
   small talk people make when they bump into each other is drawn from their real lives: their children by name, the work they are
   doing, where somebody they both know is right now, news they both have, the price of bread, the tide, the new field.
   Lines are picked by what the player has heard least recently, so the same pair does not come round again and again.               */

/** a line from a bank the player has heard least recently (any line will do in the pre-simulation) */
function sbPick(bank: any[]) { const P = game.player; if (!P || bank.length < 2) return bank[Math.floor(Math.random() * bank.length)]; const keyed = bank.map(x => Array.isArray(x) ? x.join(' / ') : x), k = cvFreshest(P, keyed); cvMarkHeard(P, k); return bank[keyed.indexOf(k)]; }
/** fill {a} {b} {q} {qhe} {qhim} {qhis} {QHe} and anything else in f */
function sbFill(s: string, f: any): string { return s.replace(/\{(\w+)\}/g, (m, k) => f[k] != null ? String(f[k]) : m); }
const sbPr = (q, f: any = {}) => { const p = q ? cvPron(q) : { he: 'they', him: 'them', his: 'their', He: 'They' }; return Object.assign(f, { q: q ? q.first : 'them', qhe: p.he, qhim: p.him, qhis: p.his, QHe: p.He }); };

/** text written for the chronicle, as somebody would say it: first names only, no clock times, the speaker as I and the listener as you */
function cvSpeechOf(o, text: string, listener?): string {
  if (!text) return text; let s = text;
  for (const q of npcs) if (q.surname) for (const full of [nameOf(q), q.first + ' ' + q.surname]) if (s.indexOf(full) >= 0) s = s.split(full).join(q.first);
  s = s.replace(/\bat (\d{1,2}):(\d\d)\b/g, (m, h) => { const x = +h; return x < 11 ? 'this morning' : x < 17 ? 'this afternoon' : x < 21 ? 'this evening' : 'tonight'; });
  s = s.replace(/\bis organising (cards|dice|an evening of songs|a picnic|a supper|[a-z ]+?) (this \w+|tonight)( at the tavern)?\b/, (m, what, when, tav) => `is getting ${what} together${tav || ''} ${when}`);
  if (o) s = cvMe(o, s); if (listener && listener !== o) s = cvToYou(s, listener);
  return s.replace(/\.$/, '');
}

/* ---------------- news: telling somebody what you know (called from lf2Tell) ---------------- */
const SB_NEWS_LEAD: any = { bad: ['Did you hear? {T}.', 'I shouldn\'t say, but {t}.', 'You won\'t believe it: {t}.', 'Have you heard? {T}.', 'Keep this to yourself. {T}.'], good: ['Nice news, for once: {t}.', 'Did you hear? {T}.', 'Here\'s something to cheer you up: {t}.'], plain: ['Have you heard? {T}.', 'Word is {t}.', 'They\'re saying {t}.', 'Did you know {t}?'] };
const SB_OWN_LEAD: any = { bad: ['Guess what happened to me. {T}.', 'You won\'t believe my day. {T}.', 'I have to tell somebody. {T}.'], good: ['You\'ll never guess. {T}!', 'Good news, for once. {T}.', 'I have to tell somebody. {T}!'], plain: ['Did I tell you? {T}.', 'Oh, I meant to say. {T}.'] };
const SB_YOU_LEAD = ['I don\'t know how to tell you this. {T}.', 'You ought to know. {T}.', 'I thought you should hear it from a friend. {T}.'];
const SB_NEWS_REPLY: any = { outraged: ['That\'s dreadful.', 'No! Really?', 'Somebody ought to do something.', 'In this village? I don\'t believe it.'], amused: ['Ha! Oh, I wish I\'d seen it.', 'Ha! Poor thing.', 'Stop it. You\'re making that up.'], pity: ['Oh, the poor soul.', 'That\'s hard. I\'ll look in on them.', 'Oh no. Is somebody with them?'], warm: ['That\'s lovely to hear.', 'Well, good for them.', 'See? People are better than they look.'], shrug: ['Well, well.', 'Is that so?', 'Huh. You don\'t say.', 'Can\'t say I\'m surprised.'] };
function sbNewsLines(a, b, ev, ver, reveal: boolean, j, fan: boolean, act, knowsA: boolean, firstHand: boolean): [string, string] {
  const ak = a.kn[ev.id], mine = ev.actor === a.id || ev.target === a.id, aboutB = ev.target === b.id || ev.actor === b.id, tone = j.v < -0.3 ? 'bad' : j.v > 0.3 ? 'good' : 'plain';
  const t = cvSpeechOf(a, sbText(a, ev), b), T = cvCap(t);
  if (reveal && act) return [sbPick([`You know what happened to you? It was ${act.first}. I saw it.`, `I know who it was. ${act.first}.`, `It was ${act.first}, you know. I'm sure of it.`]), j.v < -0.3 ? sbPick([`${act.first}? I won't forget this.`, 'I knew it!', `Wait till I see ${act.first}.`]) : 'Huh.'];
  const lead = mine ? sbPick(SB_OWN_LEAD[tone]) : aboutB ? sbPick(SB_YOU_LEAD) : sbPick(SB_NEWS_LEAD[tone]);
  const src = mine || !firstHand || ak.mine ? '' : ' ' + sbPick(['I saw it myself.', 'I was there.', 'Saw it with my own eyes.']);
  const line = lead.replace('{T}', T).replace('{t}', t) + src;
  const st = cvStanceOf(ev, j), mineR: any = { bad: ['Oh, no. Are you all right?', 'That\'s awful. I\'m sorry.', 'Oh, you poor thing.'], good: ['That\'s wonderful!', 'Well done, you!', 'Good for you. Really.'], plain: ['Did you? Well.', 'Huh. And how was that?'] };
  const reply = mine ? sbPick(mineR[tone]) : fan && act ? sbPick([`I don't believe it. Not ${act.first}.`, 'That can\'t be true.', `${act.first}? Never.`]) : st === 'outraged' && act && knowsA && (b.aff[act.id] || 0) < 10 ? sbPick([`I always thought ${act.first} was trouble.`, ...SB_NEWS_REPLY.outraged]) : sbPick(SB_NEWS_REPLY[st] || SB_NEWS_REPLY.shrug);
  return [line, reply];
}

/* ---------------- the exchanges of the social simulation, in words ---------------- */
const SB_SAY: any = {
  vent: f => f.defend ? [['I can\'t stand {q}. {why}', 'That isn\'t fair. {q}\'s been good to me.'], ['Don\'t get me started on {q}.', 'Then don\'t start. I won\'t hear it. Not about {q}.']]
    : [['I can\'t stand {q}. {why}', 'Hm. I had heard.'], ['Don\'t get me started on {q}. {why}', 'You\'re not the only one, believe me.'], ['{q} again. {why}', 'Shh. Not so loud.'], ['Do you know what gets me about {q}? {why}', 'Go on. I\'m listening.', 'I\'ll say it to {qhis} face one day.'],
      ['{q} looked straight through me this morning.', 'Did {qhe}? Well. That\'s {q} for you.'], ['I\'m going to say something to {q} one of these days.', 'You say that every week.'], ['If {q} says one more word to me…', 'Breathe. Then have a drink.']],
  praise: f => [['Say what you like, {q} is a good sort.', 'I\'ve always thought so.'], ['{q} did right by me. I won\'t forget it.', 'That\'s nice to hear.'], ['You know who I like more every year? {q}.', 'Everyone does. It\'s hard not to.'], ['I wish there were more like {q}.', 'One\'s plenty, some days. But yes.'], ['{q} asked after my mother yesterday. Nobody asks after my mother.', 'That\'s {q} all over.']],
  console: f => f.trouble === 'ill' ? [['How are you feeling?', 'Like a wet sack.', 'Back to bed with you.'], ['I brought you some broth.', 'You\'re a saint. A pushy saint.'], ['Any better?', 'A little. Don\'t fuss.', 'Somebody has to.']]
    : f.trouble === 'grief' ? [['I\'m so sorry. About {lost}.', 'Thank you. It doesn\'t feel real yet.'], ['Come here. You don\'t have to talk.', '…Thank you.'], ['{lost} would have hated all this fuss.', 'Ha. {lost} would. Thank you.']]
    : f.trouble === 'poor' ? [['Is it the money again?', 'It\'s always the money.', 'Something will turn up. It always does.'], ['Here. It\'s not much.', 'I can\'t take that.', 'You can, and you will.']]
    : f.trouble === 'hungry' ? [['When did you last eat?', 'I don\'t remember. Yesterday?', 'Come on. There\'s a bowl at mine.']]
    : [['Come here. It\'ll pass.', '…Thank you. I needed that.'], ['You look done in. Sit down a moment.', 'Is it that obvious?'], ['Whatever it is, it\'ll look smaller tomorrow.', 'Will it?', 'Usually. Not always. Usually.'], ['Do you want to talk about it?', 'Not really. But stay.']],
  argue: f => f.q ? [['You\'re wrong about {q}. You\'ve always been wrong about {q}.', 'And you\'re blind where {q}\'s concerned!'], ['How can you stick up for {q}?', 'Because I know {qhim}. You don\'t.'], ['Don\'t say {q}\'s name to me.', 'I\'ll say it as often as I like!']]
    : [['That isn\'t how it was, and you know it!', 'Don\'t raise your voice at me!'], ['You always do this.', 'And you never listen!'], ['Say that again. Go on.', 'I will! …Later. When there aren\'t people watching.'], ['I\'ve had just about enough of you.', 'The feeling is entirely mutual.']],
  row: f => ({ money: [['Where has the money gone?', 'Don\'t start. Not now.'], ['We can\'t keep living like this!', 'Then do something about it!']], pot: [['There\'s nothing in the pot. Again.', 'And whose turn was it to go to the market?']], sick: [['I sat up last night. It\'s your turn.', 'I sat up the night before! Are we counting now?']],
    chores: [['Would it kill you to fetch the water once?', 'It might! Have you seen the queue at the well?']], children: [['You let them run wild.', 'And you\'d have them sit in a row like turnips!']], mother: [['Your mother said it again.', 'Leave my mother out of this.']], brokenpot: [['That was my grandmother\'s pot.', 'It was an ugly pot.', '…It was an ugly pot.']],
    nothing: [['Why are you looking at me like that?', 'Like what? I\'m not looking at you like anything.', 'You are now.'], ['Fine.', 'Fine!', 'FINE.']] } as any)[f.about] || [['We can\'t keep living like this!', 'Then do something about it!']],
  court: f => f.into ? [['You look well today.', '…Do I? Thank you.'], ['Walk with me later?', 'I might. I just might.'], ['I saved you a seat at the bonfire. In case.', 'In case of what?', 'In case you wanted it.'], ['Is that a new tunic?', 'It\'s the same old tunic.', 'Then it\'s you that\'s new.'], ['I picked these for you. They\'re only weeds, really.', 'They\'re lovely weeds.']]
    : [['Walk with me later?', 'I\'m busy later. And tomorrow. Sorry.'], ['You look well today.', 'Thank you. I have to go.'], ['I saved you a seat.', 'Oh. That\'s… I\'m sitting with my sister.']],
  borrow: f => [['I hate to ask… could you spare a few coins? Just till the end of the week.', 'Here. {amt} denarii. Don\'t make me regret it.'], ['I\'m short this week. Could you…?', 'How much? …Fine. {amt}. Pay me back when you can.']],
  refuse: f => [['Could you spare a few coins? Just a few.', 'I\'m sorry. I\'ve nothing to spare.'], ['Just a loan. A small one.', 'Not this time. I\'m sorry. Truly.'], ['You know I\'d pay it back.', 'I know you\'d mean to.']],
  repay: f => f.late ? [['Here. I know it\'s late. I\'m sorry.', 'Late is better than never. Just.'], ['{amt} denarii. All of it. Finally.', 'I\'d nearly given up on you.']] : [['Here. Every coin, like I said.', 'You\'re as good as your word.'], ['{amt} denarii. Count it if you like.', 'I won\'t insult you. …All right, I\'ll count it.']],
  confide: f => [['Can I tell you something? You mustn\'t repeat it.', 'Of course. I\'m listening.'], ['Promise you won\'t tell?', 'Cross my heart.'], ['I\'ve never told anyone this.', 'Then I\'m honoured. Go on.']],
  leak: f => [['You didn\'t hear this from me, but {q} {secret}.', 'No! {q}? Really?'], ['Don\'t repeat this. {q} {secret}.', 'I won\'t. …Who else knows?'], ['Promise you won\'t say. {q} {secret}.', 'I knew there was something about {qhim}.']],
  rivalry: f => [['I hear you\'ve had a good week.', 'Better than yours, I hear.'], ['Nice work. For you.', 'High praise. From you.'], ['You\'ve been at it since dawn again, I see.', 'Somebody has to do it properly.']],
};
/** an exchange of the social simulation in words, if the player is near enough to hear it (two or three lines, alternating) */
function sbSayIfNear(a, b, ty, f: any = {}) {
  if (!sbNear(a, b)) return; const make = SB_SAY[ty]; if (!make) return; const opts = make(f); if (!opts || !opts.length) return;
  const pick = sbPick(opts), F = Object.assign({}, f, { why: f.why ? cvCap(f.why) + '.' : '' });
  say(a, b, pick.map((s, i) => [i % 2 === 0 ? a : b, sbFill(s, F).replace(/\s+/g, ' ').trim()]));
}
/** small talk, shop talk and family talk in the background get words too, when the player is close */
function sbSmallIfNear(a, b, kind?: string) { if (!sbNear(a, b)) return; const lines = sbSmallTalk(a, b, { place: placeOf(a), band: todBand(game.time), focus: kind }); if (lines && lines.length) say(a, b, lines.map(l => [l.who, l.text])); }

/* ---------------- small talk, from their lives ---------------- */
const SB_GREET: any = {
  morning: [['Morning, {b}.', 'Morning. Not nearly enough sleep.'], ['Up early, {b}?', 'The birds woke me. Cursed things.'], ['Good morning, {b}. Sleep well?', 'Like a log. You?'], ['Morning! Cold one.', 'My fingers have stopped talking to me.'], ['You\'re out early.', 'Couldn\'t sleep. You?', 'Never can.']],
  day: [['Afternoon, {b}.', 'Is it? Feels like it\'s been all day.'], ['Hello, {b}. Busy?', 'Always. You?'], ['{b}! Fine day.', 'It\'ll do.'], ['There you are. I looked for you this morning.', 'I was hiding. Not from you. From work.']],
  evening: [['Evening, {b}. Long day?', 'Feels like three days in one.'], ['{b}, you look tired.', 'I am tired. Good tired, mostly.'], ['Almost time to rest, {b}.', 'Not soon enough.'], ['Heading home?', 'Eventually. The long way.']],
  night: [['Still up, {b}?', 'Could say the same about you.'], ['Quiet night, {b}.', 'I like it. Fewer people.'], ['Mind the dark lanes, {b}.', 'I know them blind.'], ['Can\'t sleep either?', 'Never on a full moon.']],
};
const SB_SAME_JOB = ['Tell me about it. Mine\'s just the same.', 'Same here. Every single day.', 'Don\'t. I\'ve been at it since dawn.'];
const SB_REPLY = ['Is that so?', 'Hm. Sounds about right.', 'Better you than me.', 'Glad to hear it.', 'Same story everywhere.', 'You don\'t say.', 'There\'s always something.'];
function sbWorkLine(a): string | null {
  const job = a.job || a.cur, crops = town.crops || [], pi = town.pondInfo, room = typeof lf2Work === 'function' ? lf2Work(a) : null, st = room ? lf2Stock(room) : {};
  const sites = (town.sites || []).filter(s => s.kind === 'house' && !s.done).length;
  switch (job) {
    case 'Farmer': { const ripe = crops.filter(c => cropStage(c) === 4).length, grow = crops.filter(c => cropStage(c) === 2 || cropStage(c) === 3).length;
      return ripe > 3 ? sbPick(['Half the field\'s ready and only two pairs of hands.', 'The barley\'s ripe. If it rains now I\'ll cry.']) : grow ? sbPick(['The barley\'s coming on. Slowly. Like me.', 'Crows got into the east rows again.', 'One more dry week and I\'ll be hauling water by hand.']) : sbPick(['The soil\'s heavy this week.', 'Nothing in the ground yet. Everything to do.']); }
    case 'Fisher': return pi && pi.cap ? (pi.stock < pi.cap * 0.35 ? sbPick(['The fish have gone somewhere else. Can\'t say I blame them.', 'Fished out. Give it a few days.']) : sbPick(['They\'re practically jumping into the net.', 'Good water today. Cold, but good.'])) : sbPick(['There\'s a hole in my net and I can\'t find it.']);
    case 'Woodcutter': return sites > 1 ? sbPick([`${sites} houses going up and every one wants timber yesterday.`, 'My axe has done more work this week than I have.']) : sbPick(['Felled a good one today.', 'The axe needs honing again.']);
    case 'Stonecutter': return sites > 1 ? sbPick([`${sites} houses at once. My back\'s counting every block.`]) : sbPick(['My hands are more rock than hand by now.', 'Split a block clean this morning. Best feeling there is.']);
    case 'Builder': return sites ? sbPick([`${sites === 1 ? 'One house' : sites + ' houses'} on the go. I dream about beams.`, 'The walls are up. The roof\'s the hard part.']) : sbPick(['Nothing to build. I\'ve started straightening fences.']);
    case 'Baker': return (st.bread || 0) <= 0 ? sbPick(['Sold out before noon again.', 'Not a crumb left. I could have sold twice as much.']) : sbPick(['Fresh loaves, if you\'re passing.', 'The oven\'s been temperamental. Like me.']);
    case 'Cook': return sbPick(['The stew\'s on. Has been since dawn.', 'Everybody wants stew and nobody wants to bring fish.']);
    case 'Smith': return (st.iron || 0) <= 0 ? sbPick(['No iron. A smith with no iron is just a man with a hammer.']) : sbPick(['Three hinges and a plough blade before supper.', 'Burnt my thumb. Again.']);
    case 'Shopkeeper': return sbPick(['Everyone wants credit. Nobody wants to pay.', 'Sold six bowls this morning. Six!']);
    case 'BathKeeper': return sbPick(['Somebody left a sandal in the hot pool. Just the one.', 'The water\'s lovely today, if anyone ever came.']);
    case 'Guard': return sbPick(['Quiet shift. I like a quiet shift.', 'Somebody left a crate across a door again. Children, probably.']);
    case 'Miller': return (st.planks || 0) <= 0 ? sbPick(['Not a plank left. Everyone\'s building at once.']) : sbPick(['Sawdust in my hair, my bread and my bed.', 'Two logs, three planks. It never gets old. It does, actually.']);
    case 'Weaver': return sbPick(['Six days on one cloth. It\'s nearly worth it.', 'The loom ate a thread. It does that.']);
    case 'Gatherer': return sbPick(['The bushes grow back, but only if you leave some.', 'Found a patch of berries past the old stump.', 'Don\'t eat the red ones. Just don\'t.']);
  }
  return null;
}
const SB_MEMGOOD = ['outing', 'wedding', 'feast', 'birth', 'home', 'teach', 'share', 'comfort', 'gathering', 'job', 'crush', 'forgave', 'repaid', 'gift', 'help', 'windfall', 'bigcatch', 'returned', 'recovered', 'loan', 'keptcoins', 'newclothes', 'charity'];
const SB_MEMBAD = ['missed', 'betrayed', 'default', 'quarrel', 'theft', 'pilfer', 'lostcoins', 'illness', 'brawl', 'insult', 'robbed', 'pickpocket', 'sabotage', 'blackmail', 'secret', 'arrest', 'fined'];
const sbKids = a => npcs.filter(k => !k.dead && k.fam && (k.fam.mother === a.id || k.fam.father === a.id) && k.age < 16);
function sbSmallTalk(a, b, c: any = {}): { who: any; text: string }[] {
  const opts: any[] = [], band = c.band || todBand(game.time), kids = a.age < 14 && b.age < 14, adult = a.age >= 16, fa = a.fam || {}, P = game.player;
  const L = (...xs) => xs.filter(Boolean);
  opts.push([1, () => { const g = sbPick(SB_GREET[band]); return g.map(s => s.replace('{b}', b.first)); }]);
  if (adult) opts.push([2.5, () => { const w = sbWorkLine(a); if (!w) return null; const same = (a.job || a.cur) && (a.job || a.cur) === (b.job || b.cur); return [w, same ? sbPick(SB_SAME_JOB) : b.age >= 16 && Math.random() < 0.5 ? (sbWorkLine(b) || sbPick(SB_REPLY)) : sbPick(SB_REPLY)]; }, 'work']);
  // family, by name
  const f0 = opts.length;
  { const ks = sbKids(a).filter(k => k !== b), baby = ks.find(k => k.infant || k.age < 3), kid = ks.find(k => k.age >= 3), sp = typeof lf2Spouse === 'function' ? lf2Spouse(a) : null;
    if (baby && adult) opts.push([2.2, () => [sbFill(sbPick(['{k} kept us up half the night.', '{k} smiled at me this morning. Properly smiled.', '{k} has a tooth coming. The whole house knows.']), { k: baby.first }), sbPick(['They do that. It gets better. Then worse. Then better.', 'Enjoy it. They\'re only small for a minute.', 'Bless {k}.']).replace('{k}', baby.first)]]);
    if (kid && adult) opts.push([2, () => { const kp = cvPron(kid); return [sbFill(sbPick(kid.ill && kid.ill.until > game.time ? ['{k}\'s poorly. A fever. We\'re watching it.'] : ['{k} lost a tooth today. {He} wants a coin for it.', '{k} asked me why the sea is salty. I said tears. Now {he} won\'t paddle.', '{k} ran off to the rock pools again.', '{k} wants to be a watchman. This week.']), { k: kid.first, He: kp.He, he: kp.he }), sbPick(kid.ill && kid.ill.until > game.time ? ['Oh no. Send for me if you need anything.', 'Poor little thing. I\'ll bring something round.'] : ['Ha! That\'s {k} all over.', 'They grow up so fast. Too fast.', 'Mine are just the same.']).replace('{k}', kid.first)]; }]);
    if (sp && sp !== b && adult && Math.random() < 0.5) opts.push([1, () => [sbFill(sbPick(['{s} sends {his} love. Well, {he} said hello. I\'m improving it.', '{s}\'s been up since dawn mending the roof.', 'Have you seen {s}? {He} was meant to be home an hour ago.']), Object.assign({ s: sp.first }, (p => ({ his: p.his, he: p.he, He: p.He }))(cvPron(sp)))), sbPick(['Give {s} mine.', 'I saw {s} by the well.', 'You\'re lucky, you two.']).replace('{s}', sp.first)]]);
    const bk = sbKids(b).filter(k => k.age >= 1)[0]; if (bk && adult && (a.know[bk.id] || 0) > 5) opts.push([1.6, () => [`How's ${bk.first}?`, sbPick(bk.ill && bk.ill.until > game.time ? ['Poorly. A fever. We\'re watching it.', 'In bed. Don\'t worry. Well. Worry a bit.'] : bk.infant || bk.age < 3 ? ['Loud. Healthy. Perfect.', 'Growing like a weed.'] : ['Running wild. Same as ever.', 'Taller every morning. I swear it.', 'Asking questions I can\'t answer.'])]]); }
  for (let i = f0; i < opts.length; i++) opts[i][2] = 'fam';
  // somebody they both know, and where they are right now
  { const both = npcs.filter(q => q !== a && q !== b && q !== P && !q.dead && !q.infant && q.age >= 12 && (a.know[q.id] || 0) > 15 && (b.know[q.id] || 0) > 15);
    if (both.length && adult) opts.push([2, () => { const q = both[Math.floor(Math.random() * both.length)], f = sbPr(q), st = q.status ? cvLow(cvSpeechOf(b, q.status, a)).replace(/\bThe (Bakery|Smithy|Baths|Taberna|Thermopolium|Market Hall|Carcer)\b/g, (m, x) => 'the ' + (x === 'Bakery' || x === 'Smithy' || x === 'Baths' ? x.toLowerCase() : x)) : '', ill = q.ill && q.ill.until > game.time, fa2 = cvFeel(a, q);
      const ans = ill ? sbPick(['In bed, I heard. Fever.', '{QHe}\'s poorly. Somebody should look in.']) : q.pose === 'sleep' ? 'Asleep, last I saw. Lucky {qhim}.' : st && !/^(standing|idle)/.test(st) ? `Last I saw, ${f.qhe} was ${st.replace(/^is /, '')}.` : sbPick(['Not since yesterday.', 'Somewhere about. {QHe} always is.']);
      return [sbFill(sbPick(['Seen {q} today?', 'Have you seen {q} about?', 'Where\'s {q} got to?']), f), sbFill(ans, f), fa2 === 'love' || fa2 === 'like' ? sbFill(sbPick(['Good. I\'ve been meaning to drop by.', 'I\'ll catch {qhim} later.', '']), f) : fa2 === 'hate' || fa2 === 'dislike' ? sbFill(sbPick(['Good. Keep {qhim} there.', 'Shame.', '']), f) : '']; }]); }
  // news they both have
  { const evs = Object.keys(a.kn || {}).map(id => lf2EvById(+id)).filter(ev => ev && b.kn && b.kn[ev.id] && game.time - ev.t < 3 * 1440 && ev.actor !== a.id && ev.actor !== b.id && ev.target !== a.id && ev.target !== b.id && a.kn[ev.id].a);
    if (evs.length && adult && b.age >= 14) opts.push([2.5, () => { const ev = evs[Math.floor(Math.random() * evs.length)], t = cvSpeechOf(a, sbText(a, ev), b), j = lf2Judge(b, ev, !!(b.kn[ev.id] && b.kn[ev.id].a)), st = cvStanceOf(ev, j);
      return [sbPick(['I still can\'t get over it. {t}.', 'Did you ever think? {T}.', 'Everyone\'s talking about it. {T}.', '{T}. Of all things.']).replace('{t}', t).replace('{T}', cvCap(t)), sbPick(SB_NEWS_REPLY[st] || SB_NEWS_REPLY.shrug)]; }]); }
  // the price of bread, the shops, the tide, the day
  if (adult) { const bp = typeof marketPrice === 'function' ? marketPrice('bread') : null; if (bp && bp >= 4) opts.push([1.2, () => [`Bread's ${bp} coins now. ${bp}!`, sbPick(['I remember when it was two.', 'Then bake your own.', 'Don\'t. I\'ve stopped looking.'])]]);
    const out = rooms.filter(r => !r.dead && LF2_SELL[r.kind] && (lf2Stock(r)[Object.keys(LF2_SELL[r.kind])[0]] || 0) <= 0)[0]; if (out) opts.push([1.2, () => { const g = Object.keys(LF2_SELL[out.kind])[0], n = GOODS[g] ? GOODS[g].name : g; return [`${cvCap(cvPlace(out.name))} is out of ${n} again.`, sbPick(['Again? That\'s three times this week.', 'Then I\'m not walking over there.', 'Somebody\'s buying it all. And it isn\'t me.'])]; }]); }
  if (isRestDay() && adult) opts.push([1.6, () => sbPick([['No axes today. Feels strange.', 'Feels wonderful, you mean.'], ['What are you doing with the rest day?', 'As little as I can manage.'], ['Going to the water later?', 'If the little ones let me.'], ['I\'m going to sit in the sun and think about nothing.', 'You\'ll be asleep by noon.', 'That\'s the plan.'], ['I nearly picked up the hoe this morning. Habit.', 'Put it down. Slowly. Back away.'], ['Rest day, and I\'m still up at dawn.', 'Your body doesn\'t know what day it is.'], ['Fancy a walk round the headland?', 'Only if we stop at the tavern on the way back.'], ['Somebody\'s working. I can hear a hammer.', 'Let them. More rest for the rest of us.'], ['I\'m going to eat until I can\'t move.', 'Ambitious. I respect it.'], ['Have you seen the children? They\'re all on the flats.', 'Good. Peace.']])]);
  else if (isRestDay(game.time + 1440) && adult) opts.push([1, () => sbPick([['Rest day tomorrow.', 'Don\'t. I\'ll start thinking about it and stop working.'], ['One more day.', 'One more day.']])]);
  if (town.feast && game.time < town.feast.end && adult) opts.push([2, () => sbPick([['Are you going to the bonfire?', 'I said I wasn\'t. I\'m going.'], ['Save me a place by the fire.', 'Only if you bring the wine.']])]);
  // the village changing
  { const recent = (town.chron || []).filter(ch => game.time - ch.time < 2 * 1440 && ['build', 'life', 'love'].includes(ch.kind) && !new RegExp('\\b(' + a.first + '|' + b.first + ')\\b').test(ch.text));
    if (recent.length && adult) opts.push([2, () => { const ch = recent[Math.floor(Math.random() * recent.length)], t = cvSpeechOf(a, ch.text, b); return [sbPick(['Have you heard? {T}.', 'Did you see? {T}.', 'So. {T}.']).replace('{T}', cvCap(t)), sbPick(ch.kind === 'build' ? ['Good. We need the room.', 'More work. Still. It\'s good work.', 'About time.'] : ch.kind === 'love' ? ['That\'ll be fun.', 'I might go. I might not.', 'Count me in.'] : ['Good for them.', 'That\'s good news.', 'Well, well.'])]; }]); }
  // memories
  { const shared = typeof memWith === 'function' ? memWith(a, b) : [], own = (a.mem || []).filter(m => m.w !== b.id && game.time - m.t < 6 * YEAR && /^(the|losing|hearing|how|sharing|teaching|my|our|a|an)\b/.test(m.me || ''));
    if (shared.length) opts.push([3, () => { const m = shared[Math.floor(Math.random() * shared.length)]; return [`Remember ${m.we}?`, sbPick(MEM_REPLY[m.kind] || MEM_REPLY.x)]; }]);
    if (own.length && a.age >= 5) opts.push([1.5, () => { const m = own[Math.floor(Math.random() * own.length)]; const v = SB_MEMGOOD.includes(m.kind) ? 'good' : SB_MEMBAD.includes(m.kind) ? 'bad' : 'plain'; return [`I keep thinking about ${m.me}.`, sbPick(m.kind === 'loss' ? MEM_REPLY.loss : v === 'good' ? ['That sounds like a good day.', 'Hold on to that one.', 'I\'d keep thinking about that too.'] : v === 'bad' ? ['Let it go. It\'ll eat you up.', 'I\'m sorry. That stays with you.', 'Don\'t dwell on it.'] : ['You never told me that before.', 'Hm. I remember that.'])]; }]); }
  // hobbies
  if (a.hobby && a.age >= 12) opts.push([1.2, () => [sbPick(({ fishing: ['I know a spot where the fish practically jump into your hands.', 'Caught one this long yesterday. Well. This long.'], foraging: ['The best berries are past the old stones. Don\'t tell anyone.', 'Found mushrooms in the dell. The good kind. I think.'], walking: ['I walked all the way round the headland yesterday.', 'There\'s a path along the cliff nobody uses. I use it.'], whittling: ['I\'m carving a little fox. The tail\'s the hard part.', 'Look at this spoon. Go on, look at it.'], singing: ['I\'ve got a new song. Want to hear it?', 'I can\'t get that tune out of my head. The one from the tavern.'], stargazing: ['Did you see the stars last night? Like spilled salt.', 'There\'s a new star. Low, over the sea. Nobody believes me.'] } as any)[a.hobby] || ['Is that so?']), sbPick(['You and your ' + (HOBBY_TXT[a.hobby] || a.hobby) + '.', 'Show me sometime.', 'Is that so?', 'I don\'t know where you find the time.'])]]);
  // children at play
  if (kids) opts.push([6, () => sbPick([['Tag! You\'re it!', 'No fair, you cheated!'], ['Look, a frog!', 'Put it back, it\'s scared.'], ['Bet I can jump the whole puddle.', 'Bet you can\'t.'], ['I\'m the watchman and you\'re the thief.', 'I\'m always the thief!'], ['Race you to the well!', 'Go!'], ['I found a crab with one claw.', 'Can I hold him?', 'He bites.'], ['My dad says the bell under the flats is real.', 'My mum says your dad says a lot of things.'], ['Want to see a dead beetle?', 'Yes!'], ['I can whistle now. Listen.', 'That\'s not whistling. That\'s just air.']])]);
  else if (a.age < 12 && b.age >= 16) opts.push([2, () => sbPick([['When I\'m big I\'ll build my own house.', 'You\'ll need a lot of timber for that.'], ['Can I touch the well bucket?', 'Not with those hands, you can\'t.'], ['I found an enormous beetle!', 'Lovely. Keep it away from me.'], ['Why is the sea salty?', 'Ask your mother.', 'She said ask you.'], ['Do you want to see my stone?', 'Go on, then.', 'It\'s a good one, isn\'t it?'], ['I\'m not tired.', 'Nobody said you were.', 'I\'m just telling you.'], ['Are you very old?', 'Older than you.', 'Older than the well?'], ['Is it true the gull on the church is a sailor?', 'Only on rest days.']])]);
  // who they are to each other (a speaks)
  const f1 = opts.length;
  { const spouse = fa.spouse === b.id, sib = isKin(a, b) && a.fam && b.fam && ((a.fam.mother && a.fam.mother === b.fam.mother) || (a.fam.father && a.fam.father === b.fam.father)), aParent = b.fam && (b.fam.mother === a.id || b.fam.father === a.id), aChild = fa.mother === b.id || fa.father === b.id, rel = a.rel[b.id];
    if (spouse) opts.push([4, () => sbPick([['Don\'t forget the roof needs patching.', 'I won\'t. Did you eat?'], ['Long day?', 'Longer without you. Don\'t tell anyone I said that.'], ['Anything you need from the market?', 'Just you home before dark.'], ['You\'re humming.', 'Am I? It\'s your fault.']])]);
    else if (sib) opts.push([3, () => sbPick([['You still owe me a fish.', 'I gave you two at the harvest!'], ['Mother would have laughed at that.', 'She wouldn\'t. But I\'ll pretend.'], ['You\'re standing like Father.', 'Take that back.'], ['Do you remember the goat?', 'We agreed never to talk about the goat.'], ['You\'ve got flour on your nose.', 'And you\'ve got opinions on your face.'], ['Come for supper. I\'ve made too much.', 'You always make too much. I\'ll come.']])]);
    else if (aParent && b.age < 14) opts.push([4, () => [sbPick(['Back before dark, understand?', 'Have you eaten properly?', 'Mind the well.', 'Wash your hands. Both of them.']), sbPick(['Yes, yes.', 'Just a little longer?', 'I\'m not a baby!'])]]);
    else if (aParent) opts.push([3, () => [sbPick(['Have you eaten properly?', 'You work too hard.', 'Come for supper on rest day.']), sbPick(['Yes, Mother.', 'I\'m fine. Stop fussing.', 'I will. I promise.'].map(x => a.female ? x : x.replace('Mother', 'Father')))]]);
    else if (aChild && a.age < 14) opts.push([4, () => [sbPick(['Can I stay out a little longer?', 'Look what I found!', 'Is it nearly supper?']), sbPick(['Not a minute past dusk.', 'Very nice. Wash it first.', 'Soon enough.'])]]);
    else if (rel === 'friend') opts.push([3, () => sbPick([['Same as ever, {b}?', 'Same as ever. That\'s the good part.'], ['We should do something about this dull week.', 'Such as?'], ['Save me a seat later?', 'Always.'], ['I was hoping I\'d see you.', 'Here I am. Disappointed?']]).map(s => s.replace('{b}', b.first))]);
    else if (rel === 'rival') opts.push([3, () => [`${b.first}.`, `${a.first}.`]]);
    if (rel === 'partner' || fa.partner === b.id) opts.push([6, () => sbPick([[`I was hoping to see you today, ${b.first}.`, 'You always find me. I don\'t mind.'], ['I brought you something. A pretty stone, nothing more.', 'It\'s the nicest nothing I\'ve ever been given.'], ['I told my mother about you.', 'And what did she say?', 'She said she knew already.']])]); }
  for (let i = f1; i < opts.length; i++) opts[i][2] = 'fam';
  // places
  if (/tavern|Heron|Goose|Flagon|Anchor/i.test(c.place || '') && adult) opts.push([3, () => sbPick([['The stew here beats mine, and I\'ll deny I said it.', 'Your secret\'s safe. Pass the bread.'], ['Another round?', 'One more, then home.'], ['Hear anything interesting today?', 'Only what you\'ve just told me.'], ['Dice?', 'Not with you. I know your dice.']])]);
  if (/Church/.test(c.place || '')) opts.push([3, () => sbPick([['Peace be with you, {b}.', 'And with you. And with the Noodle.'], ['Do you think the bells really rang at midnight?', 'I try not to think about it in here.']]).map(s => s.replace('{b}', b.first))]);
  if (/Baths/.test(c.place || '')) opts.push([3, () => sbPick([['Mind the hot pool. It bites.', 'I\'m easing in. Slowly. Like a gentleman.'], ['Ah. That\'s the stuff.', 'Don\'t splash.']])]);
  if (a.age >= 60) opts.push([2, () => sbPick([['In my day we had one house and a rumour of a well.', 'And now look at us.'], ['I buried a lot of good people on that hill.', 'And we\'re still here because of them.'], [`Mind the little ones, ${b.first}. They\'re the whole point.`, 'I will. I do.'], ['My knees say rain. My knees are never wrong.', 'Your knees said rain last week.', 'And it rained somewhere.']])]);
  if (adult && a.hunger > 60) opts.push([2, () => sbPick([['I haven\'t eaten since morning.', 'Then go and eat. Don\'t stand here talking.'], ['I\'m so hungry I could eat the table.', 'The table\'s been eaten. Try the bakery.']])]);
  if (c.focus === 'shop') for (const o of opts) if (o[2] === 'work') o[0] = 9;
  if (c.focus === 'family') for (const o of opts) if (o[2] === 'fam') o[0] *= 3;
  let lines: any[] | null = null;
  for (let tries = 0; tries < 4 && !lines; tries++) { const tot = opts.reduce((s, o) => s + o[0], 0); let r = Math.random() * tot, f = opts[0]; for (const o of opts) { r -= o[0]; if (r < 0) { f = o; break; } } try { lines = f[1](); } catch (e) { lines = null; } }
  if (!lines) lines = sbPick(SB_GREET[band]).map(s => s.replace('{b}', b.first));
  return L(...lines).map((t, i) => { const who = i % 2 === 0 ? a : b; let text = t; const trait = who.traits.find(x => FLAVOR[x]); if (trait && Math.random() < 0.25) text = FLAVOR[trait](text); return { who, text }; });
}
