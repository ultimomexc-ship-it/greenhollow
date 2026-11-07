/* ================= dialogue / cv-topics: what a villager has to say, built from the actual village =================
   A topic is something they could talk about: an event they know of, another villager, an old story, a bit of their own life,
   a legend, what is going on today, or something about you. Each is told in layers (0 a hint, 1 the story, 2 what they do not usually say).
   Whether they tell it depends on how much they trust you, who they are, and what you have done in this conversation.                    */
interface CvHook { k: string; key: string; label: string; q?: any; ev?: any; back?: any; facet?: string; id?: any; opts?: any; extra?: any }
interface CvUtt { text: string; hooks: CvHook[]; end?: boolean }
const CV_MAXLAYER: any = { act: 1, state: 1, ambition: 2, regret: 2, pride: 1, fear: 1, secret: 2, person: 3, event: 3, back: 2, legend: 2, player: 2, world: 1, chron: 1, rel: 2, conv: 1 };

/* ---------------- how willing are they? ---------------- */
function cvOpenness(c) {
  const o = c.o, m = c.mem; let x = c.v.candour + (c.aff / 100) * 0.4 + (m.trust / 100) * 0.4 + c.warmth * 0.06;
  if ((o.drunk || 0) > 40) x += 0.2; if (c.know < 10) x -= 0.25; if (o.mood < 25) x -= 0.05;
  return x;
}
/** 'yes': they tell; 'hint': a vague version; 'no': they deflect */
function cvWilling(c, sens: number, key: string): 'yes' | 'hint' | 'no' {
  const x = cvOpenness(c) + (c.pressed[key] || 0) * (lf2Has(c.o, 'gossipy') || lf2Has(c.o, 'anxious') ? 0.14 : 0.08);
  if (x >= sens) return 'yes'; if (x >= sens - 0.15) return 'hint'; return 'no';
}
function cvSlips(c) { return (lf2Has(c.o, 'gossipy') || lf2Has(c.o, 'anxious') || (c.o.drunk || 0) > 45) && Math.random() < 0.3; }

/* ---------------- the player's journal: what they have learned ---------------- */
function cvLearnBack(c, b, layer) { const K = cvKnows(c.p).back; K[b.id] = Math.max(K[b.id] === undefined ? -1 : K[b.id], layer); }
function cvLearnLife(c, who, facet) { const K = cvKnows(c.p).life; (K[who.id] = K[who.id] || {})[facet] = 1; }

/* ---------------- activity small talk (what they are doing now) ---------------- */
const CV_ACTV: any = {
  forage: { say: ['Off to see whether the berry bushes have anything left.', 'Foraging. The good bushes get further out every week.', 'Berries. If I come back with an empty basket, we\'re eating air.', 'Herbs, if I can find any the goats haven\'t.', 'Out to the hedges. Wish me thorns.'], ask: [['Any luck lately?', ['Some. The east bank is picked bare. Everyone had the same idea.', 'A basket on a good day. Half on most.', 'Mushrooms yesterday. I think they were the good kind. I\'m still here, so.']], ['Mind if I come along?', 'TAG:Come on, then. Two pairs of eyes.'], ['Where are the best bushes?', ['If I told you, they wouldn\'t be the best bushes.', 'Past the old stones. Don\'t tell anyone I said.']]] },
  eat: { say: ['My stomach\'s leading the way. Home for a meal.', 'Meal time. I think better with something in me.', 'Supper. If anybody\'s left me any.', 'Off to eat. Don\'t keep me; I get cross when I\'m hungry.'], ask: [['What\'s for supper?', ['Grain and whatever the larder spared.', 'Stew, if nobody\'s got at the pot.', 'Bread. Then more bread. It\'s that sort of week.']], ['Who\'s cooking?', ['Me, sadly for everyone.', 'Whoever gets home first. It\'s a race nobody wants to win.']]] },
  eating: { say: ['Mmf. Sorry. Eating.', 'Mid-bite. Give me a moment.', 'Eating. It\'s the best part of the day.', 'Don\'t mind me. Chewing.'], ask: [['What are you having?', ['Whatever there was. It\'s good, though.', 'Grain and berries. The usual feast.', 'Fish. Again. I\'m starting to grow scales.']], ['Is it good?', ['Hot. That\'s the main thing.', 'Better than yesterday\'s.']]] },
  bed: { say: ['Bed. Don\'t talk to me, I\'m already asleep.', 'Done for the day. The blanket\'s calling.', 'Off to bed. If I\'m not up by dawn, let me be.'], ask: [['Long day?', ['Long enough that my bones have opinions.', 'Not bad, really. Habit, mostly.', 'Three days long, it felt.']]] },
  party: { say: ['Cake! Have you seen the cake?', 'A party! I\'ve been looking forward to this all week.', 'Somebody\'s getting old. Or older. There\'s cake either way.'], ask: [['Is it a good one?', ['It\'s going to be. There\'s cake.', 'Good enough. I\'m only here for the food.']], ['Who\'s here?', 'NEWS']] },
  patrol: { say: ['Eyes open, boots on. Quiet streets are the best streets.', 'On patrol. Nothing to report, which is how I like it.', 'Walking the lanes. Somebody has to.', 'Watching. It\'s mostly watching.'], ask: [['Anything to report?', ['Nothing. Somebody left a crate across a door, but that\'s a prank, not a crime.', 'Not a thing. Which is suspicious in itself.', 'A goat in the church. Again. I\'m not writing it down.']], ['Is it a good job?', ['It\'s a job. Some days it\'s a good one.', 'Nobody likes the watch until they need it.']]] },
  bakery: { say: ['Off for the morning bread. It\'s gone by seven if you dawdle.', 'Bread run. I can\'t face the day without it.', 'To the bakery, before the queue.'], ask: [['Is it any good?', ['The best thing on the island. Don\'t tell the baker; the price will go up.', 'It\'s bread. It\'s warm. What more do you want?']]] },
  foodOut: { say: ['No fish, no grain. I\'m standing here hoping something changes.', 'The larder\'s empty and everyone\'s staring at it.', 'Nothing on the shelves. I\'ll wait. What else can I do?'], ask: [['Can I spare you something?', 'FOOD:Oh. Thank you. Truly.']] },
  relax: { say: ['Doing nothing. It\'s harder than it looks.', 'Resting. Sit down if you like. Nobody\'s timing us.', 'Taking a moment. I\'ve earned it, I think.', 'Sitting. Watching the lane. It\'s better than people think.'], ask: [['Ever get bored?', ['Never. There\'s always someone to watch.', 'Constantly. I\'ve started naming the ants.', 'Bored? I\'ve never had the time.']]] },
  water: { say: ['A walk by the water. It clears the head.', 'I come to the water when the village gets too loud.', 'Just looking at the sea. It never says anything stupid.'], ask: [['What do you think about out here?', ['Nothing. That\'s the whole point.', 'My knees, mostly. And whether it\'ll rain.', 'The far side. What\'s over there. Who.']], ['Mind some company?', 'TAG:Not at all. Keep up, though.']] },
  fishing: { say: ['Shh! You\'ll scare them.', 'Fishing. Patience, mostly, and bread for bait.', 'They\'re biting. Or they were, until you walked up.'], ask: [['Catching anything?', ['Two so far. One was a boot.', 'Nothing yet. They\'re being difficult.', 'One. A little one. I put him back to fetch his father.']], ['What\'s the trick?', ['Be more patient than the fish. It\'s harder than it sounds.', 'Don\'t want it too much. They can tell.']]] },
  stall: { say: ['The stall\'s open. Have a look; nothing bites.', 'Minding the shop. Prices are fair. Mostly.', 'Open for business. Business is optional.'], ask: [['How\'s business?', 'BIZ'], ['What sells best?', ['Whatever ran out yesterday.', 'Bread, when there is any. Everything else is conversation.']]] },
  privy: { say: ['Not. Now.', '*shuffles urgently*', 'Please. Talk. Later.'], ask: [] },
  social: { say: ['Out with friends. It\'s nice to be asked.', 'A day out. I\'ve been looking forward to it.', 'Meeting a few people. Somebody promised wine.'], ask: [['Room for one more?', 'TAG:Always! The more the merrier.']] },
  tag: { say: ['Dad says I should "learn the trade". I\'m learning to be bored.', 'Tagging along. It\'s less fun than it sounds.'], ask: [['Is it that bad?', ['Not bad. Just slow. Everything\'s slow when you\'re watching.', 'I get to carry things. It\'s practically a promotion.']]] },
  baths: { say: ['Off to the baths. A person can only be so grubby.', 'The baths. The heat gets the aches out.', 'Bath day. Don\'t come too close till afterwards.'], ask: [['Is it worth the fuss?', ['Every coin. Every splash.', 'Ask me when I\'m clean and sleepy.']]] },
  drink: { say: ['Just the one drink. Maybe two. It\'s a long evening.', 'Wine, dice and gossip. In that order.', 'One for the road. The road\'s very long tonight.'], ask: [['Buy you another?', 'BUY:You\'re a good sort. Remind me of that tomorrow.'], ['Good wine?', ['No. But it\'s wet, and it\'s here.', 'It\'s the tavern\'s wine. It\'s a matter of faith.']]] },
  farm: { say: ['The barley\'s coming on slow this year. Or it\'s me.', 'Back to the field. The weeds never take a day off.', 'Ploughing. Straight lines are harder than they look.', 'Field work. My back sends its regards.'], ask: [['How are the crops?', ['Thirsty. So am I.', 'Better than last year. Don\'t tell the crows.', 'Coming on. Slowly. Like me.']], ['Need a hand?', 'HELP:Many hands! Thank you.']] },
  build: { say: ['Walls don\'t build themselves. I\'ve checked.', 'Another beam, another blister.', 'Building. Mostly carrying, if I\'m honest.'], ask: [['How far along is it?', ['Further than yesterday. Not as far as I promised.', 'Closer. That\'s all I\'ll say, or I\'ll jinx it.']], ['Need a hand?', 'HELP:That went quicker. You\'re a good sort.']] },
  smith: { say: ['Iron is honest work. Loud, but honest.', 'If you can hear me over the hammer, you\'re standing too far away.', 'Hot work. Don\'t touch anything.'], ask: [['What are you making?', ['Whatever somebody breaks next. Nails, mostly.', 'A hinge. A very good hinge.', 'A plough blade. Hold this. No, not that end.']]] },
  sky: { say: ['Looking at the sky. Don\'t ask what for; I\'m busy.', 'The stars. There are more than anyone could count. I\'ve tried.'], ask: [['See anything?', ['A bright one. It keeps winking at me.', 'Mostly dark. But it\'s a good dark.']]] },
  pray: { say: ['Prayers. Quietly, please; the Noodle is listening.', 'A moment of quiet before the day starts. You\'re welcome to it.'], ask: [['May I join you?', ['Sit. Close your eyes. Or don\'t; He\'s patient.', 'Of course. It isn\'t a private noodle.']]] },
  visit: { say: null, ask: [['Who are you off to see?', 'VISIT']] },
  any: { say: null, ask: [['How\'s your day going?', 'MOOD'], ['What are you up to today?', 'PLANS']] },
};
/** an open loan where they are the borrower ('to') or the lender ('from') */
function cvLoanOf(o, side: 'to' | 'from') { return (town.sbLoans || []).find(l => l.state !== 'paid' && l[side] === o.id && byId(side === 'to' ? l.from : l.to) && !byId(side === 'to' ? l.from : l.to).dead) || null; }
/** heading for, or in, a privy (they have names: the Privy Council, Pit Stop, the Thinking Hut ...) */
function cvToPrivy(s: string) { return !!s && (/privy/i.test(s) || rooms.some(r => r.kind === 'privy' && !r.dead && s.indexOf(r.name) >= 0)); }
function cvActivity(c): string {
  const s = c.status, o = c.o;
  if (cvToPrivy(s)) return 'privy'; if (/talk with|word with|Visiting|Going to see|to see \w+$/i.test(s)) return 'visit'; if (/Out of .*Waiting/i.test(s)) return 'foodOut'; if (/patrol/i.test(s)) return 'patrol'; if (/coming-of-age|party/i.test(s)) return 'party';
  if (/forage|berr|herb|larder/i.test(s)) return 'forage'; if (/to bed|Heading to bed/i.test(s)) return 'bed'; if (/bakery|bread/i.test(s)) return 'bakery';
  if (c.act === 'eat' || /\bEating\b/.test(s)) return 'eating'; if (/supper|breakfast|dinner|\beat\b|food home|shopping home|cook/i.test(s)) return 'eat';
  if (/Playing|play\b|Running/i.test(s)) return 'play'; if (/bath|wash/i.test(s)) return 'baths'; if (/drink|bar\b|tavern/i.test(s)) return 'drink'; if (/anvil|forge|furnace/i.test(s)) return 'smith';
  if (/stall|counter|shop/i.test(s)) return 'stall'; if (/Fishing|fishing trip|favourite fishing/i.test(s)) return 'fishing'; if (/Tagging along/i.test(s)) return 'tag';
  if (/picnic|friends|Out with|Going out with|Heading out with|talk with|word with/i.test(s)) return 'social'; if (/field|plough|seed|grain|rows/i.test(s)) return 'farm';
  if (/walls|plaster|build|timber|logs/i.test(s)) return 'build'; if (/sky|stars/i.test(s)) return 'sky'; if (/prayer|altar|pray/i.test(s)) return 'pray'; if (/water|stones on/i.test(s)) return 'water';
  if (/Relaxing|at home|door bolted/i.test(s)) return 'relax'; return 'any';
}
const CV_KIDSAY = ['Look! I can skip a stone eleven times!', 'I found a frog. He does not do anything, but he is mine.', 'I am not small. I am compact.', 'I am not allowed to say what we are playing. It is tag.', 'Do you know there are forty-one steps to the well? I counted.'];
function cvActSay(c) {
  const a = cvActivity(c), A = CV_ACTV[a] || CV_ACTV.any;
  if (c.kid && a !== 'privy') return anyOf(CV_KIDSAY);
  if (a === 'visit') { const m = c.status.match(/(?:with|see) (\w+)/), q = m && npcs.find(x => x.first === m[1] && !x.dead); return q ? cvQ(pk(['On my way to see {Q}. {He}\'ll have the kettle on, if {he}\'s any sense.', 'Off to see {Q}. We\'ve things to talk over.', 'Going round to {Q}\'s. {He} asked me to.']), q) : 'Off to see somebody. I\'m late, as usual.'; }
  if (a === 'any' || !A.say || !A.say.length) return /^[A-Z][a-z]+ing\b/.test(c.status) ? `Just ${cvLow(c.status)}.` : c.status ? c.status + ', as it happens.' : 'Mm? Oh, hello. I was miles away.';
  return anyOf(A.say);
}

/* ---------------- things on their mind right now (their state) ---------------- */
const cvToolNoun = o => ({ Farmer: 'hoe', Woodcutter: 'axe', Stonecutter: 'chisel', Fisher: 'net', Gatherer: 'basket' } as any)[o.job || o.cur] || (o.job === 'Smith' ? 'hammer' : 'tools');
const CV_STATES: any[] = [
  { id: 'tool', ok: c => c.o.toolQ != null && c.o.toolQ < 35 && c.o.job && c.o.job !== 'Guard', say: c => `My ${cvToolNoun(c.o)} is nearly worn through. Another week and it is a stick.`, deeper: ['Everything takes twice as long with a bad tool, and twice as long means less coin, and less coin means no new tool. It goes round.', 'The smith wants {tools} denarii. I have never seen that much in one place.'] },
  { id: 'hungry', ok: c => c.o.hunger >= 62, say: ['My stomach has been growling at me since morning.', 'I could eat a goat. A small one.'], deeper: ['Last time I ate properly was… the funeral? No. That was a different hunger.'] },
  { id: 'tired', ok: c => c.o.energy < 28 && c.activity !== 'bed', say: ['I could sleep on a fence post.', 'Barely keeping my eyes open. Do not let me stop moving.'], deeper: ['It is not the work. It is lying there at night, adding things up.', 'I keep waking at the same hour. Like somebody is calling me.'] },
  { id: 'poor', ok: c => (c.o.coin || 0) < 4 && c.close !== 'stranger', say: ['My purse is thin. I keep checking it, as if it might change its mind.', 'Money is tight. Do not repeat that. Pride, you understand.'], deeper: ['It is not even the amount. It is being a person who counts.'] },
  { id: 'low', ok: c => c.o.mood < 30 && c.close !== 'stranger', say: ['Rotten day. Everything has gone slightly wrong.', 'I am not myself today.'], deeper: ['It piles up. Small things. Then one more small thing, and suddenly you are crying over a bucket.'] },
  { id: 'high', ok: c => c.o.mood > 82, say: ['I am in a wonderful mood and I have no idea why.', 'Good day. Good, good day. I feel like singing.'], deeper: ['No reason. That is the best sort. Do not examine it.'] },
  { id: 'love', ok: c => c.o.crush != null && byId(c.o.crush) && !byId(c.o.crush).dead && c.close !== 'stranger', say: ['Sorry. My mind wandered off. It does that lately.', 'Hm? Oh. Nothing. Thinking. About… things.'], deeper: ['It is a someone. I will not say who. I do not want to jinx it.'] },
  { id: 'baby', ok: c => !!c.o.preg, say: ['*hand on belly* Any day now. Everyone keeps asking.', 'The little one has been kicking all morning. Practising for something.'], deeper: ['I am frightened and thrilled in equal measure. Mostly in the same breath.'] },
  { id: 'grief', w: 2, ok: c => c.o.mourning != null && typeof personById === 'function' && !!personById(c.o.mourning), q: c => personById(c.o.mourning), say: c => cvQ(pk(['I keep thinking about {Q}. Silly things. The way {he} laughed.', 'It\'s strange without {Q}. I keep setting out one bowl too many.']), personById(c.o.mourning)), deeper: ['It comes in waves. You\'re fine, and then you\'re not, and then you\'re fine again.', 'People stop asking after a week. That\'s when it gets hard.'] },
  { id: 'debt', w: 1.2, ok: c => !!cvLoanOf(c.o, 'to') && c.close !== 'stranger', q: c => byId(cvLoanOf(c.o, 'to').from), say: c => { const l = cvLoanOf(c.o, 'to'); return cvQ(pk([`I owe {Q} ${l.amt} denarii. It sits on me like a cat.`, `{Q} lent me ${l.amt} denarii. I haven\'t forgotten. I\'d like to.`]), byId(l.from)); }, deeper: ['I\'ll pay it. I always pay. It just takes me longer than I say.', 'Owing somebody changes how you walk past their door.'] },
  { id: 'owed', w: 1.2, ok: c => { const l = cvLoanOf(c.o, 'from'); return !!l && l.state === 'late'; }, q: c => byId(cvLoanOf(c.o, 'from').to), say: c => { const l = cvLoanOf(c.o, 'from'); return cvQ(pk([`{Q} still owes me ${l.amt} denarii. {He} said the end of the week. Which week, {he} didn\'t say.`, `${l.amt} denarii I lent {Q}. I\'ve stopped expecting it.`]), byId(l.to)); }, deeper: ['It isn\'t the money. It\'s being made a fool of.', 'I\'d forgive it if {he} would just say something. Anything.'] },
  { id: 'rich', w: 0.8, ok: c => (c.o.coin || 0) > 70 && c.close !== 'stranger', say: ['Good month. Don\'t tell anyone; they\'ll all want a loan.', 'I\'m doing all right, for once. It makes me nervous.'], deeper: ['I keep it under the floor. Don\'t look at my floor.'] },
  { id: 'newjob', w: 1.6, ok: c => (c.o.mem || []).some(m => m.kind === 'job' && game.time - m.t < 2 * 1440), say: c => `I'm the ${cvLow(lf2JobName(c.o) || 'new one')} now. I still don't know where anything is.`, deeper: ['I wanted it, and now I have it, and now I\'m terrified. Is that normal?', 'Everyone watches you the first week. Waiting.'] },
  { id: 'drunk', w: 1.5, ok: c => (c.o.drunk || 0) > 40, say: ['*hic* I\'ve had one. Two. A sensible number.', 'Is the lane moving, or is it me? It\'s me.'], deeper: ['Don\'t tell anyone, but I\'m not as drunk as I\'m pretending. I\'m drunker.', 'I only drink when I\'m happy. And when I\'m sad. And on rest days.'] },
  { id: 'lonely', w: 1.1, ok: c => (c.o.social || 50) < 22 && c.close !== 'stranger', say: ['I haven\'t talked to anyone properly in days. You\'re the first.', 'It\'s been a quiet week. Too quiet.'], deeper: ['It isn\'t that nobody\'s around. It\'s that nobody stops.', 'You start talking to the goats. They\'re good listeners. Bad at answering.'] },
  { id: 'courting', w: 1.4, ok: c => c.o.sbCourted != null && !!byId(c.o.sbCourted) && c.close !== 'stranger', q: c => byId(c.o.sbCourted), say: c => cvQ(pk(['I walked out with {Q} again yesterday. People are noticing.', '{Q} and I have been… walking. A lot. Don\'t make that face.']), byId(c.o.sbCourted)), deeper: ['I think it\'s serious. I think. Ask me in a month.', 'My mother keeps asking. I keep changing the subject. Like this.'] },
  { id: 'kidill', w: 2.2, ok: c => !!sbKids(c.o).find(k => k.ill && k.ill.until > game.time), q: c => sbKids(c.o).find(k => k.ill && k.ill.until > game.time), say: c => cvQ(pk(['{Q}\'s poorly. A fever. I\'ve been up all night.', 'I can\'t stop long. {Q}\'s not well.']), sbKids(c.o).find(k => k.ill && k.ill.until > game.time)), deeper: ['They\'re so small when they\'re ill. You forget how small.', 'I sit and listen to {him} breathe. That\'s all I do.'] },
  { id: 'kids', w: 1, ok: c => c.o.age >= 18 && sbKids(c.o).length > 0, q: c => sbKids(c.o)[0], say: c => { const k = sbKids(c.o)[0]; return cvQ(k.infant || k.age < 3 ? pk(['{Q} kept us up half the night. I\'m running on bread and spite.', '{Q} smiled at me this morning. Properly smiled.']) : pk(['{Q} asked me why the sea is salty. I said tears. Now {he} won\'t paddle.', '{Q} wants to be a watchman. This week.', '{Q} found a crab and named it after me. I\'m choosing to be flattered.', '{Q} lost a tooth and wants a coin for it. Where do they learn these things?']), k); }, deeper: ['They grow up while you\'re looking the other way.', 'You worry about them every minute. That\'s the job. Nobody tells you.'] },
  { id: 'work', w: 0.9, ok: c => c.o.age >= 16 && !!sbWorkLine(c.o), say: c => sbWorkLine(c.o), deeper: c => CV_LIKEJOB[c.o.job] || 'It\'s work. It pays. Mostly.' },
  { id: 'tent', w: 1.2, ok: c => !c.o.homeRoom && c.o.age >= 18 && c.close !== 'stranger', say: ['We\'re still in the tent. You get used to the wind. You don\'t, actually.', 'No roof yet. One day. The builders keep saying one day.'], deeper: ['It\'s not the cold. It\'s never being able to shut a door.'] },
];

/* ---------------- the pool: everything this person might bring up, weighted ---------------- */
interface CvTopic { key: string; kind: string; w: number; sens: number; q?: any; ev?: any; back?: any; facet?: string; id?: any; extra?: any }
function cvPool(c): CvTopic[] {
  const o = c.o, p = c.p, pool: CvTopic[] = [], v = c.v, evs = lf2Ev();
  // events they know of, recent
  for (let i = evs.length - 1; i >= 0 && pool.length < 40; i--) {
    const ev = evs[i]; if (game.time - ev.t > 30 * 1440) break; const k = o.kn && o.kn[ev.id]; if (!k || ev.actor === o.id && !k.brag) continue; if ((ev.target === o.id || ev.actor === o.id) && (o.sbConv || []).some(n => n.t >= ev.t - 5 && n.t <= ev.t + 5)) continue; if (game.time - ev.t > 5 * 1440 && (k.imp || 0) < 0.45) continue;
    if (ev.actor === p.id || ev.target === p.id) continue;                         // about the player: handled below
    const spice = Math.max(0, ...ev.tags.map(g => (LF2_TAGS[g] || {}).spice || 0.5)), rec = Math.max(0.3, 1.25 - (game.time - ev.t) / (5 * 1440)), mine = ev.target === o.id ? 1.2 : 1;
    pool.push({ key: 'ev' + ev.id, kind: 'event', ev, w: spice * (0.5 + 0.5 * ev.sev) * k.cert * rec * mine * (v.arch === 'nosy' ? 1.7 : 1), sens: ev.target === o.id ? 0.5 : 0.2 + 0.1 * (ev.tags.includes('scandal') || ev.tags.includes('affair') ? 3 : 0) });
  }
  // other people
  const rel: any[] = [];
  for (const q of npcs) { if (q === o || q === p || q.dead || q.infant || q.age < 8) continue; const a = o.aff[q.id] || 0, kin = isKin(o, q), kn = o.know[q.id] || 0, hasBack = cvBackOf(o).some(b => b.a === q.id || b.b === q.id);
    const w = Math.abs(a) / 35 + (kin ? 1 : 0) + (hasBack ? 1.2 : 0) + (kn > 40 ? 0.3 : 0); if (w > 0.8) rel.push({ key: 'pe' + q.id, kind: 'person', q, w: w * (v.arch === 'nosy' || v.arch === 'cynic' ? 1.3 : 1), sens: 0.25 }); }
  pool.push(...rel.sort((x, y) => y.w - x.w).slice(0, 6));
  // what they believe about others' feelings, and who they have talked to today
  pool.push(...cvRelTopics(c), ...cvConvTopics(c));
  // old stories
  for (const b of cvBackOf(o)) if (b.a !== p.id && b.b !== p.id) pool.push({ key: 'bk' + b.id, kind: 'back', back: b, w: 1.4, sens: b.sens });
  for (const b of cvWorld().back) if (b.knownBy.includes(o.id) && b.a !== o.id && b.b !== o.id && b.a !== p.id && b.b !== p.id) pool.push({ key: 'bk' + b.id, kind: 'back', back: b, w: 0.9, sens: 0.3 });
  // their own life
  const L = cvLife(o); pool.push({ key: 'amb', kind: 'ambition', w: 0.8, sens: 0.3 }, { key: 'pri', kind: 'pride', w: v.arch === 'talkative' || v.arch === 'smooth' ? 1.2 : 0.6, sens: 0.15 }, { key: 'fea', kind: 'fear', w: 0.5, sens: 0.45 });
  if (L.regret) pool.push({ key: 'reg', kind: 'regret', w: 0.6, sens: 0.55 }); if (L.secret) pool.push({ key: 'sec', kind: 'secret', w: 0.7, sens: L.secret.sens });
  for (const s of CV_STATES) { let ok = false; try { ok = s.ok(c); } catch (e) {} if (ok) pool.push({ key: 'st' + s.id, kind: 'state', id: s.id, w: s.w || 1.6, sens: ['debt', 'owed', 'grief', 'rich', 'courting'].includes(s.id) ? 0.3 : 0.1 }); }
  // legends, the day, the village
  for (const g of CV_LEGENDS) pool.push({ key: 'lg' + g.id, kind: 'legend', id: g.id, w: 0.45 + (lf2Has(o, 'devout') || o.age > 50 ? 0.3 : 0) + (v.arch === 'sunny' || v.arch === 'talkative' ? 0.3 : 0), sens: 0.1 });
  pool.push(...cvWorldTopics(c));
  // the player
  pool.push(...cvPlayerTopics(c));
  // what they told you in the last two days stays back, so the next conversation is a different one
  const past = cvMem(o, p).topics; for (const t of pool) { const at = past[t.key]; if (at != null && !c.told[t.key] && game.time - at < 2 * 1440) t.w *= 0.06; }
  return pool.filter(t => !c.told[t.key]);
}

/* the day, the weather (the tide), the shops, the chronicle */
function cvWorldTopics(c): CvTopic[] {
  const out: CvTopic[] = [], o = c.o, hr = c.hr, L = typeof tideLevel === 'function' ? tideLevel() : 50;
  if (town.coast) { if (L < 26) out.push({ key: 'w:tide', kind: 'world', facet: 'low', w: 0.7, sens: 0 }); else if (L > 82) out.push({ key: 'w:tide', kind: 'world', facet: 'high', w: 0.5, sens: 0 }); }
  if (isRestDay()) out.push({ key: 'w:rest', kind: 'world', facet: 'rest', w: 0.8, sens: 0 }); else if (isRestDay(game.time + 1440)) out.push({ key: 'w:rest', kind: 'world', facet: 'eve', w: 0.6, sens: 0 });
  if (town.feast && game.time < town.feast.end) out.push({ key: 'w:feast', kind: 'world', facet: 'feast', w: 1.1, sens: 0 });
  for (const r of rooms) { if (r.dead || !LF2_SELL[r.kind]) continue; const st = lf2Stock(r), g = Object.keys(LF2_SELL[r.kind])[0]; if ((st[g] || 0) <= 0) out.push({ key: 'w:out' + r.id, kind: 'world', facet: 'out', id: r.id, extra: g, w: 0.9, sens: 0 }); }
  const J = o.job && LF2_JOBS[o.job]; if (J && J.room) { const r = lf2Room(J.room); if (r && (o.coin || 0) < 8) out.push({ key: 'w:biz', kind: 'world', facet: 'biz', id: r.id, w: 1.5, sens: 0.1 }); }
  for (let i = town.chron.length - 1; i >= 0 && i > town.chron.length - 40; i--) { const ch = town.chron[i]; if (game.time - ch.time > 3 * 1440) break; if (ch.kind === 'life' || ch.kind === 'death' || ch.kind === 'wedding' || ch.kind === 'birth' || ch.kind === 'note') { out.push({ key: 'ch' + ch.time + ':' + i, kind: 'chron', extra: ch, w: 0.7, sens: 0 }); if (out.length > 14) break; } }
  return out;
}
/* things about you: what they saw, what you carry, what they have heard, what they remember */
function cvPlayerTopics(c): CvTopic[] {
  const o = c.o, p = c.p, out: CvTopic[] = [], cv = cvWorld();
  for (const s of cv.seen) { if (s.actor !== p.id || !s.w.includes(o.id) || game.time - s.t > 2 * 1440) continue; out.push({ key: 'sw' + s.t, kind: 'player', facet: 'saw', extra: s, w: 2.4, sens: 0 }); }
  const heavy = Object.keys(p.inv || {}).filter(g => (p.inv[g] || 0) >= 2 && (g === 'wood' || g === 'stone' || g === 'herbs' || g === 'cloth' || g === 'tools'))[0]; if (heavy) out.push({ key: 'carry' + heavy, kind: 'player', facet: 'carry', extra: heavy, w: 1.6, sens: 0 });
  const bad = Object.keys(o.kn || {}).map(id => lf2EvById(+id)).filter(ev => ev && ev.actor === p.id && !ev.fake && ev.tags.some(t => ['theft', 'crime', 'trespass', 'deceit', 'violence'].includes(t)) && game.time - ev.t < 4 * 1440 && o.kn[ev.id].a);
  if (bad.length) out.push({ key: 'susp', kind: 'player', facet: 'suspect', ev: bad[bad.length - 1], w: 3, sens: 0 });
  const good = Object.keys(o.kn || {}).map(id => lf2EvById(+id)).filter(ev => ev && ev.actor === p.id && ev.target === o.id && ev.tags.some(t => ['help', 'kindness', 'generous'].includes(t)) && game.time - ev.t < 6 * 1440);
  if (good.length) out.push({ key: 'thx', kind: 'player', facet: 'helped', ev: good[good.length - 1], w: 2.6, sens: 0 });
  const others = Object.keys(o.kn || {}).map(id => lf2EvById(+id)).filter(ev => ev && ev.actor === p.id && ev.target && ev.target !== o.id && !ev.fake && game.time - ev.t < 3 * 1440 && ev.tags.some(t => ['kindness', 'help', 'generous', 'harm', 'nuisance', 'embarrass'].includes(t)));
  if (others.length) out.push({ key: 'ow' + others[others.length - 1].id, kind: 'player', facet: 'heard', ev: others[others.length - 1], w: 1.8, sens: 0 });
  if (!c.close || c.close !== 'stranger') { const st = lf2Standing(p); if (Math.abs(st) > 12) out.push({ key: 'rep', kind: 'player', facet: st > 0 ? 'liked' : 'disliked', w: 0.9, sens: 0 }); }
  return out;
}
