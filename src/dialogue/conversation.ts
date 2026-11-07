/* ================= dialogue / conversation: people talk about what they are doing and what is on their mind =================
   Opening a conversation:   what they say comes from what they are doing right now (and often one thing on their mind),
                             coloured by who they are (their voice) and how well they know you.
   Your replies:             at most two, and only ones that follow from what they just said. Often one; sometimes none.
   Tone:                     every reply can be said four ways. Hold E (kind), Shift (sly) or R (harsh) while you pick, or tap the
                             tone buttons; the line you would say changes as you hold the key. Honest is the default.
                             Compliments, insults, lies and rumours are tones, not menu items.
   The talk box (ui/menus-hud.ts) and its W / S / D / A keys are unchanged; this file only decides what is said.           */
type CvTone = 'honest' | 'kind' | 'sly' | 'harsh';
const CV_KEYTONE = { help: 'kind', take: 'sly', rough: 'harsh' };
const pk = (x, ...a) => { const v = typeof x === 'function' ? x(...a) : x; return Array.isArray(v) ? anyOf(v) : v; };
const cvHash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
const cvLower = (s: string) => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;

function convTone(): CvTone {
  const p = game.player && game.player.player, m = p && lf2ActiveMod(p);
  return (talkUI as any).tone || (m && CV_KEYTONE[m]) || 'honest';
}

/* ---------------- what the player would say, in each tone (used when a reply does not write its own) ---------------- */
const CV_GEN = {
  ask: { kind: ['I would love to hear about it.', 'Tell me everything. You make it interesting.'], sly: ['Everyone says you know most about this.', 'I hear you are the one to ask.'], harsh: ['Do you ever talk about anything else?', 'Spare me the speech.'] },
  offer: { kind: ['Please, let me. I would like to.', 'You do enough for everyone. Let me.'], sly: ['I could. For a favour later.', 'I will, and you will remember it.'], harsh: ['You are doing it wrong. Move.', 'Hopeless. Give it here.'] },
  agree: { kind: ['You are doing better than you think.', 'You make it look easy.'], sly: ['Everyone says you have the knack. Everyone.', 'Between us, nobody does it better.'], harsh: ['Not that you are any good at it.', 'Shame you are so bad at it.'] },
};
function convLabel(r, tone: CvTone): string {
  const base = typeof r.label === 'function' ? r.label() : r.label;
  if (tone === 'honest') return base;
  if (r.tones && r.tones[tone]) return r.tones[tone];
  const g = CV_GEN[r.type || 'ask'][tone]; return g[cvHash(base + tone) % g.length];
}

/* ---------------- the person and the moment ---------------- */
function convCtx(o, p) {
  const aff = o.aff[p.id] || 0, know = o.know[p.id] || 0, st = o.plan && o.plan[o.si];
  const close = aff < -15 ? 'cold' : aff >= 60 ? 'close' : aff >= 25 ? 'friend' : know >= 10 ? 'known' : 'stranger';
  const ctx = { o, p, aff, know, close, status: o.status || '', activity: '', act: st && st.act, hr: (game.time % 1440) / 60, kid: o.age < 12, job: o.job || o.cur || null,
    personal: close === 'friend' || close === 'close', used: {} as any, fx: null as any, cur: [] as any[] };
  ctx.activity = convActivity(ctx); return ctx;
}
/* what they are doing, as a key into CV_ACT */
function convActivity(c): string {
  const s = c.status, o = c.o;
  if (/privy/i.test(s)) return 'privy';
  if (/Out of .*Waiting/i.test(s)) return 'foodOut';
  if (/patrol/i.test(s)) return 'patrol';
  if (/coming-of-age|party/i.test(s)) return 'party';
  if (/forage|berr|herb|larder/i.test(s)) return 'forage';
  if (/to bed|Heading to bed/i.test(s)) return 'bed';
  if (/bakery|bread/i.test(s)) return 'bakery';
  if (c.act === 'eat' || /^Eating|\bEating\b/.test(s)) return 'eating';
  if (/supper|breakfast|dinner|\beat\b|food home|shopping home|cook/i.test(s)) return 'eat';
  if (/Playing|play\b|Running/i.test(s)) return 'play';
  if (/bath|wash/i.test(s)) return 'baths';
  if (/drink|bar\b|tavern/i.test(s)) return 'drink';
  if (/anvil|forge|furnace/i.test(s)) return 'smith';
  if (/stall|counter|shop/i.test(s)) return 'stall';
  if (/Fishing|fishing trip|favourite fishing/i.test(s)) return 'fishing';
  if (/Tagging along/i.test(s)) return 'tag';
  if (/picnic|friends|Out with|Going out with|Heading out with|Tagging along|talk with|word with/i.test(s)) return 'social';
  if (/field|plough|seed|grain|rows/i.test(s)) return 'farm';
  if (/walls|plaster|build|timber|logs/i.test(s)) return 'build';
  if (/sky|stars/i.test(s)) return 'sky';
  if (/prayer|altar|pray/i.test(s)) return 'pray';
  if (/water|stones on/i.test(s)) return 'water';
  if (/Relaxing|at home|door bolted/i.test(s)) return 'relax';
  return 'any';
}

/* ---------------- activity bits: what they say, and what you can answer ---------------- */
const CV_ACT: any = {
  forage: { say: ['Off to see whether the berry bushes have anything left.', 'Foraging. The good bushes get further out every week.', 'Berries. If I come back with an empty basket, we are eating air.'],
    r: [{ label: 'Any luck lately?', tones: { kind: 'You always find the best bushes.', sly: 'I heard you found a secret patch.', harsh: 'You look hopeless at it.' }, ans: ['Some. The east bank is picked bare. Everyone had the same idea.', 'A basket on a good day. Half on most.', 'Enough to keep the pantry from sulking.'] },
        { label: 'Mind if I come along?', tones: { kind: 'I would love your company.', sly: 'I know the best spot. I will show you. For a favour.', harsh: 'Fine. Try not to slow me down.' }, type: 'offer', ans: c => { tagAlong(c.o, c.p, 120, 'Foraging with ' + c.p.first); like(c.o, c.p, 2); return anyOf(['Come on, then. Two pairs of eyes.', 'Bring a basket. I only have the one.']); } }] },
  eat: { say: ['My stomach is leading the way. Home for a meal.', 'Meal time. I think better with something in me.', 'Off to eat. I am no use to anyone before.'],
    r: [{ label: 'What is for dinner?', tones: { kind: 'Whatever it is, it smells wonderful.', sly: 'I hear the cook outdid themselves.', harsh: 'Slop again, I expect.' }, ans: ['Grain and whatever the larder spared.', 'Stew, if nobody has got at the pot.', 'Honestly? Nobody told me. I am hoping.'] },
        { label: 'Enjoy it.', type: 'agree', ans: ['I will. Properly. Sitting down.', 'Ha! I intend to.'] }] },
  eating: { say: ['Mmf. Sorry. Eating.', 'Mid-bite. Give me a moment.', 'Eating. It is the best part of the day.'],
    r: [{ label: 'What are you having?', ans: ['Whatever there was. It is good, though.', 'Grain and berries. The usual feast.', 'I have stopped asking. I just eat it.'] }, { label: 'Do not let me stop you.', type: 'agree', ans: ['I was not going to.', 'Wise. I get dangerous when interrupted.'] }] },
  bed: { say: ['Bed. Do not talk to me, I am already asleep.', 'Done for the day. The blanket is calling.'],
    r: [{ label: 'Long day?', tones: { kind: 'You work so hard. It shows.', sly: 'I heard you were up before dawn. Impressive.', harsh: 'You look it.' }, ans: c => c.o.energy < 35 ? 'Long enough that my bones have opinions.' : 'Not bad, really. Habit, mostly.' }, { label: 'Sleep well.', type: 'agree', ans: ['You too. Do not let the bugs bite.', 'Mm. Goodnight.'] }] },
  party: { say: ['Cake! Have you seen the cake?', 'A party! I have been looking forward to this all week.'],
    r: [{ label: 'Is it a good one?', ans: ['It is going to be. There is cake.', 'Good enough. I am only here for the food.'] }, { label: 'Save me a slice.', type: 'agree', ans: ['No promises. I am a weak person.', 'Cross my heart. Probably.'] }] },
  patrol: { say: ['Eyes open, boots on. Quiet streets are the best streets.', 'On patrol. Nothing to report, which is how I like it.'],
    r: [{ label: 'Anything to report?', tones: { kind: 'It is good to know you are out there.', sly: 'Heard anything about the crate across a door?', harsh: 'Another dull patrol, I bet.' }, ans: ['Nothing. Somebody left a crate across a door, but that is a prank, not a crime.', 'Not a thing. Which is suspicious in itself.'] }, { label: 'Stay safe out there.', type: 'agree', ans: ['I always do. Mostly by being boring.', 'It is a very small island. I will manage.'] }] },
  bakery: { say: ['Off for the morning bread. It is gone by seven if you dawdle.', 'Bread run. I cannot face the day without it.'],
    r: [{ label: 'Is it any good?', tones: { kind: 'I am sure it is the best bread around.', sly: 'The baker told me the secret ingredient.', harsh: 'It looks stale from here.' }, ans: ['The best thing on the island. Do not tell the baker, he will charge more.', 'It is bread. It is warm. What more do you want?'] }, { label: 'Fetch me a loaf?', type: 'offer', ans: ['Ha! Buy your own. Queue is short, you can see for yourself.', 'Only if you carry it back.'] }] },
  foodOut: { say: ['No fish, no grain. I am standing here hoping something changes.', 'The larder is empty and everyone is staring at it.'],
    r: [{ label: 'Can I spare you something?', type: 'offer', ans: c => { const g = FOODS.concat(['bread', 'stew']).find(g => (c.p.inv[g] || 0) > 0); if (!g) return 'Kind of you, but you look as empty-handed as I am.'; lf2GiveFood(c.p, c.o); return 'Oh. Thank you. Truly.'; } },
        { label: 'It will turn up.', type: 'agree', ans: ['It always does. Eventually.', 'I hope you are right. My stomach has stopped believing.'] }] },
  relax: { say: ['Doing nothing. It is harder than it looks.', 'Resting. Sit down if you like. Nobody is timing us.'],
    r: [{ label: 'Ever get bored?', ans: ['Never. There is always someone to watch.', 'Constantly. I have started naming the ants.'] }, { label: 'A quiet moment is a good thing.', type: 'agree', ans: ['It is. They do not come often.', 'Mm. Savour it.'] }] },
  water: { say: ['A walk by the water. It clears the head.', 'I come to the water when the village gets too loud.'],
    r: [{ label: 'What do you think about out here?', tones: { kind: 'You seem like a deep thinker.', sly: 'I bet you are planning something big.', harsh: 'Nothing, by the look of you.' }, ans: ['Nothing. That is the whole point.', 'My knees, mostly. And whether it will rain.'] }, { label: 'Mind some company?', type: 'offer', ans: c => { tagAlong(c.o, c.p, 90, 'Walking with ' + c.p.first); like(c.o, c.p, 2); return 'Not at all. Keep up, though.'; } }] },
  fishing: { say: ['Shh! You will scare them.', 'Fishing. Patience, mostly, and bread for bait.'],
    r: [{ label: 'Catching anything?', tones: { kind: 'You have the patience of a saint.', sly: 'I heard you landed the big one yesterday.', harsh: 'Not a thing, by the look of it.' }, ans: ['Two so far. One was a boot.', 'Nothing yet. They are being difficult.', 'A few. The big one is watching me from under that rock.'] }, { label: 'Will you teach me?', type: 'offer', ans: ['Stand still, say nothing, and wait. That is the whole of it.', 'Ha. Not today, the tide is wrong. Ask me again.'] }] },
  stall: { say: ['The stall is open. Have a look; nothing bites.', 'Minding the shop. Prices are fair. Mostly.'],
    r: [{ label: 'How is business?', tones: { kind: 'Everything you sell is the best on the island.', sly: 'I hear your prices are generous. To me.', harsh: 'Nobody buys anything from you, do they?' }, ans: c => c.o.coin < 5 ? 'Thin. Everyone is counting coins.' : 'Steady. Better after supper, when people are hungry and careless.' }, { label: 'What is good today?', ans: ['Whatever is freshest. Ask me nicely.', 'Everything. Obviously.'] }] },
  privy: { say: ['Not. Now.', '*shuffles urgently*', 'Please. Talk. Later.'], r: [] },
  social: { say: ['Out with friends. It is nice to be asked.', 'A day out. I have been looking forward to it.'],
    r: [{ label: 'Room for one more?', tones: { kind: 'I always have the best time with you.', sly: 'I will bring wine. Nobody has to know.', harsh: 'I will come. Someone must keep an eye on you.' }, type: 'offer', ans: c => { tagAlong(c.o, c.p, 120, 'Out with ' + c.p.first); like(c.o, c.p, 2); return 'Always! The more the merrier.'; } }, { label: 'Who else is coming?', ans: ['Whoever turns up. That is how it works.', 'The usual lot. You know how it is.'] }] },
  tag: { say: ['Dad says I should "learn the trade". I am learning to be bored.', 'Tagging along. It is less fun than it sounds.', 'I am being shown how things are done. Again.'],
    r: [{ label: 'Is it that bad?', ans: ['Not bad. Just slow. Everything is slow when you are watching.', 'I get to carry things. It is practically a promotion.'] }, { label: 'You will thank them one day.', type: 'agree', ans: ['That is what they say. Every single time.', 'Hm. Maybe. Not today.'] }] },
  baths: { say: ['Off to the baths. A person can only be so grubby.', 'The baths. The heat gets the aches out.'],
    r: [{ label: 'Is it worth the fuss?', tones: { kind: 'You always look so fresh afterwards.', sly: 'I hear the bath keeper gives friends a discount.', harsh: 'You could use it.' }, ans: ['Every coin. Every splash.', 'Ask me when I am clean and sleepy.'] }, { label: 'Enjoy your soak.', type: 'agree', ans: ['I plan to turn into a prune.', 'Do not wait up.'] }] },
  drink: { say: ['Just the one drink. Maybe two. It is a long evening.', 'Wine, dice and gossip. In that order.'],
    r: [{ label: 'Buy you another?', type: 'offer', ans: c => { if (c.p.coin < 3) return 'Kind of you to offer with empty pockets.'; c.p.coin -= 3; c.o.coin = (c.o.coin || 0) + 3; like(c.o, c.p, 3); return 'You are a good sort. Remind me of that tomorrow.'; } },
        { label: 'Heard anything?', ans: c => convNewsLine(c) || 'Only that the wine is watered.' }] },
  farm: { say: ['The barley is coming on slow this year. Or it is me.', 'Back to the field. The weeds never take a day off.', 'Ploughing. Straight lines are harder than they look.'],
    r: [{ label: 'How are the crops?', tones: { kind: 'Your field is the envy of the island.', sly: 'I heard the neighbours are jealous of yours.', harsh: 'They look half dead. Like you.' }, ans: ['Thirsty. So am I.', 'Better than last year. Do not tell the crows.', 'Alive. That is about the best I can say.'] }, { label: 'Need a hand?', tones: { kind: 'Let me carry that for you.', sly: 'I will help. You will owe me.', harsh: 'You are too slow. Move over.' }, type: 'offer', ans: c => convHelp(c) }] },
  build: { say: ['Walls do not build themselves. I have checked.', 'Another beam, another blister.'],
    r: [{ label: 'How far along is it?', ans: ['Further than yesterday. Not as far as I promised.', 'Closer. That is all I will say, or I jinx it.'] }, { label: 'Need a hand?', tones: { kind: 'Let me carry that for you.', sly: 'I will help. You will owe me.', harsh: 'You are too slow. Move over.' }, type: 'offer', ans: c => convHelp(c) }] },
  smith: { say: ['Iron is honest work. Loud, but honest.', 'If you can hear me over the hammer, you are standing too far away.'],
    r: [{ label: 'What are you making?', tones: { kind: 'Your work is the finest on the island.', sly: 'Is it true the watch ordered one of those?', harsh: 'Whatever it is, it looks bent.' }, ans: ['Whatever someone breaks next. Nails, mostly.', 'A hinge. A very good hinge.'] }, { label: 'Looks hot in here.', type: 'agree', ans: ['It is. That is the job.', 'Hot? You should see me in summer.'] }] },
  sky: { say: ['Looking at the sky. Do not ask what for; I am busy.', 'The stars. There are more than anyone could count. I have tried.'],
    r: [{ label: 'See anything?', tones: { kind: 'You have such a good eye for it.', sly: 'I heard a comet is due. Do not tell anyone.', harsh: 'Nothing. You are just staring.' }, ans: ['A bright one. It keeps winking at me.', 'Mostly dark. But it is a good dark.'] }, { label: 'Mind if I look too?', type: 'offer', ans: ['Lie down. The grass is damp, but the view is free.', 'Go on. Count the ones on the left.'] }] },
  pray: { say: ['Prayers. Quietly, please; the Noodle is listening.', 'A moment of quiet before the day starts. You are welcome to it.'],
    r: [{ label: 'May I join you?', type: 'offer', ans: ['Sit. Close your eyes. Or do not; He is patient.', 'Of course. It is not a private noodle.'] }, { label: 'Sorry to interrupt.', type: 'agree', ans: ['Hm. He is used to it.', 'No harm done.'] }] },
  any: { say: c => [/^[A-Z][a-z]+ing\b/.test(c.status) ? `Just ${cvLower(c.status)}.` : c.status ? c.status + ', as it happens.' : 'Just on my way.', 'Mm? Oh, hello. I was miles away.', 'Can I help you? Or are we both just standing here?'][cvHash(c.o.first + Math.floor(game.time / 90)) % 3],
    r: [{ label: 'How is your day going?', tones: { kind: 'You look like you are doing well.', sly: 'I heard good things about you today.', harsh: 'You look terrible.' }, ans: c => c.o.mood < 35 ? 'Could be better. Could be a lot better.' : c.o.mood > 70 ? 'Better than most, to be honest.' : 'Fine. Ordinary. I will take ordinary.' }, { label: 'Anything new?', tones: { kind: 'You always know the interesting things.', sly: 'I have heard rumours. Have you?', harsh: 'Nothing, I expect. It is dull here.' }, ans: c => convNewsLine(c) || 'Nothing worth saying. Quiet lately.' }] },
};
/* children say children's things */
const CV_KID: any[] = [
  { say: ['Look! I can skip a stone eleven times!', 'I found a frog. He does not do anything, but he is mine.', 'I am not small. I am compact.', 'I am not allowed to say what we are playing. It is tag.'],
    r: [{ label: 'Show me!', ans: ['Watch! Watch! …it sank. That was practice.', 'Ready? Really ready? You have to watch properly.'] }, { label: 'Is that so?', type: 'agree', ans: ['It IS so. Ask anyone.', 'Yes. Obviously. Grown-ups never listen.'] }] },
];

/* ---------------- what is on their mind: things that change with their life ---------------- */
function convToolNoun(o) { return ({ Farmer: 'hoe', Woodcutter: 'axe', Stonecutter: 'chisel', Fisher: 'net', Gatherer: 'basket' } as any)[o.job || o.cur] || (o.job === 'Smith' ? 'hammer' : 'tools'); }
function convPerson(c) {
  const o = c.o; let best = null, bw = 0;
  for (const q of npcs) { if (q === o || q === c.p || q.dead || q.infant || q.age < 12) continue; const k = o.know[q.id] || 0; if (k < 20 && !isKin(o, q)) continue; const w = Math.abs(o.aff[q.id] || 0) + (isKin(o, q) ? 30 : 0) + Math.random() * 25; if (w > bw) { bw = w; best = q; } }
  return best;
}
function convNewsLine(c) {
  const pkd = lf2PickTale(c.o, c.p); if (!pkd) return null; lf2Tell(c.o, c.p, pkd.ev, pkd.reveal, true);
  const k = c.o.kn[pkd.ev.id], txt = k.a ? pkd.ev.text : (pkd.ev.anonText || pkd.ev.text);
  return (pkd.reveal ? `You know about that? It was ${lf2By(pkd.ev.actor).first}.` : anyOf(['Well, ', 'Between us, ', 'Word is ']) + lf2Low(txt) + '.') + (k.from ? ` ${byId(k.from) ? byId(k.from).first : 'Someone'} told me.` : k.mine ? '' : ' I saw it myself.');
}
function convHelp(c) {
  const o = c.o, st = o.plan && o.plan[o.si];
  if (!st || st.act !== 'work') return anyOf(['Kind, but I have not started yet.', 'Not just now. Ask me when I am knee-deep.']);
  o.until = Math.max(game.time, (o.until || game.time) - 15); bumpAff(c.p, o, 4, 8);
  lfEmit('help', { actor: c.p, target: o, sev: 1, tags: ['help', 'kindness'], chron: false, text: `${c.p.first} lent ${o.first} a hand with the work` });
  return anyOf(['Many hands! Thank you.', 'That went quicker. You are a good sort.']);
}
function convGive(c, q) {
  if (c.p.coin < q) return 'You do not have ' + q + ' denarii on you. Kind thought, though.';
  lf2Give(c.p, c.o, q); return anyOf(['Are you sure? Thank you. I will not forget it.', 'That is… generous. Thank you.']);
}
/* a lie or a rumour about someone, told to o (the machinery from the old menu: it spreads, and it can get you caught) */
function convFake(c, who, kind, tags, sev, text) {
  const p = c.p, ev: any = lfEmit(kind, { actor: who, sev, tags, fake: true, witnessIds: [], chron: false, text }); ev.liar = p.id; ev.know = [p.id];
  delete (who.kn || {})[ev.id]; (p.kn || (p.kn = {}))[ev.id] = { t: game.time, from: null, cert: 1, a: true, mine: true, liar: true }; return ev;
}
/** the sly tone on a topic about somebody else: a rumour (it spreads, and it can come back on you) */
function convRumour(c, q) {
  const o = c.o, p = c.p, a = o.aff[q.id] || 0, trust = Math.max(0.2, Math.min(1, 0.55 + (o.aff[p.id] || 0) / 120));
  if (!c.fx || !c.fx.believed) return anyOf(['I would not go saying that about people.', 'Nobody has said anything like that to me.']);
  if (a > 35 && Math.random() < 0.6) { const ev = convFake(c, q, 'rumour', ['kindness'], 1, `${q.first} has been quietly helping folk who are struggling`); lf2Learn(o, ev, p, 0.7 * trust, true); return anyOf(['That is lovely to hear. It sounds just like them.', 'Is that so? I always thought they had it in them.']); }
  const ev = convFake(c, q, 'rumour', ['theft'], 1, `${q.first} has been stealing from neighbours`); lf2Learn(o, ev, p, 0.7 * trust, true);
  return a > 50 ? `${q.first}? I do not believe a word of it.` : anyOf(['I knew it.', 'Really? I will keep an eye on my things.']);
}

/* ---------------- the things the old "Something else…" menu did, now part of a conversation ---------------- */
const cvSnub = c => { const f: any = convToneFx(c, 'harsh'); return { say: f.say, end: true }; };       // a harsh tone on a reply that has no hostile version
const cvDirt = c => Object.keys(c.p.kn || {}).map(id => lf2EvById(+id)).filter(ev => ev && ev.actor === c.o.id && c.p.kn[ev.id].a && !ev.fake && ev.tags.some(t => ['crime', 'affair', 'scandal', 'theft'].includes(t)) && !(c.o.lf2Paid && c.o.lf2Paid[ev.id]));
const cvSecret = c => Object.keys(c.o.kn || {}).map(id => lf2EvById(+id)).filter(ev => ev && ev.know.length <= 4 && !(c.p.kn && c.p.kn[ev.id]) && ev.actor !== c.p.id && ev.tags.some(t => (LF2_TAGS[t] || {}).spice >= 1.2)).pop();
const cvNewsToTell = c => Object.keys(c.p.kn || {}).map(id => lf2EvById(+id)).filter(ev => ev && ev.actor !== c.o.id && game.time - ev.t < 4 * 1440 && !(c.o.kn && c.o.kn[ev.id] && (c.o.kn[ev.id].a || !c.p.kn[ev.id].a))).slice(-6).reverse();
function cvBlackmail(c, tone) {
  const o = c.o, p = c.p, ev = cvDirt(c).pop(); if (!ev) return { say: 'I do not know what you mean.', end: true };
  const full = Math.max(5, Math.round(o.coin * 0.4)), pays = (lf2Has(o, 'anxious') || lf2Has(o, 'proud') || ev.tags.includes('affair')) && !lf2Has(o, 'brave') && o.coin >= 5;
  if (tone === 'kind') { lfAff(o, p, 8); (o.lf2Paid = o.lf2Paid || {})[ev.id] = 1; return { say: 'You… thank you. I will not forget this. I mean it.' }; }
  if (tone === 'honest') { lfAff(o, p, -3); return { say: anyOf(['I do not know what you mean.', '…Who told you? Never mind. Please. Do not spread it.']) }; }
  if (tone === 'sly') { if (!pays) return { say: 'I do not follow. Say it plainly, or not at all.' }; const ask = Math.max(3, Math.round(full / 2)); o.coin -= ask; p.coin += ask; (o.lf2Paid = o.lf2Paid || {})[ev.id] = 1; lfAff(o, p, -8); return { say: `Ah. I see. Perhaps ${ask} denarii would help you keep it quiet.`, end: true }; }
  lfAff(o, p, -25); lfEmit('blackmail', { actor: p, target: o, sev: 2, tags: ['deceit', 'crime'], witnessIds: [], chron: false, text: `${p.first} blackmailed ${o.first} over ${lf2Low(ev.text).replace(new RegExp('^' + o.first + ' '), 'how they ')}` });
  if (pays) { o.coin -= full; p.coin += full; (o.lf2Paid = o.lf2Paid || {})[ev.id] = 1; return { say: `…How much? Fine. ${full} denarii. Now leave me alone.`, end: true }; }
  if (Math.random() < 0.3) o.lf2Report = { ev: lf2Ev()[lf2Ev().length - 1].id, t: game.time, a: true };
  return { say: anyOf(['Go on, tell everyone. See if I care.', 'You would not dare.', 'Get out of my sight.']), end: true };
}
function cvFlirt(c, tone) {
  const o = c.o, p = c.p; if (tone === 'harsh') return cvSnub(c);
  const ok = (o.aff[p.id] || 0) > (tone === 'kind' ? 25 : tone === 'sly' ? 35 : 30);
  lfAff(o, p, ok ? (tone === 'kind' ? 6 : 5) : (tone === 'sly' ? -3 : -2)); if (ok && Math.random() < 0.4) o.crush = p.id;
  lfEmit('flirt', { actor: p, target: o, sev: 1, tags: ['romance'], chron: false, text: `${p.first} was flirting with ${o.first}` });
  return { say: ok ? anyOf(['Oh! Well. Maybe.', '*laughs* You are terrible.', 'Hm. You are not so bad yourself.']) : anyOf(['I do not think so.', 'Is that supposed to work?']) };
}
function cvDice(c, tone) {
  const o = c.o, p = c.p; if (p.coin < 3 || o.coin < 3) return { say: 'I have no money to bet.', end: true };
  const r = lf2Dice(p, o, 3, tone === 'sly');
  if (r && r.caught) return { say: 'Those dice are LOADED!', end: true };
  if (tone === 'harsh') lfAff(o, p, -1);
  return { say: r ? (r.win === p ? anyOf(['Bah! Take it.', 'Again? You are lucky tonight.']) : 'Ha! Mine.') : '…', next: [CV_DICE_AGAIN] };
}
const CV_DICE_AGAIN: any = { label: 'Again?', type: 'agree', tones: { kind: 'One more. I am enjoying this.', sly: 'One more. I feel lucky. Very lucky.', harsh: 'Again. I want to see you lose.' }, own: cvDice };
function cvTellNews(c, tone) {
  const o = c.o, p = c.p; let list = cvNewsToTell(c); if (!list.length) return { say: 'Nothing new, then. Pity.' };
  const val = ev => lf2Judge(o, ev, p.kn[ev.id].a).v;
  if (tone === 'kind') list = list.slice().sort((a, b) => val(b) - val(a)); else if (tone === 'sly') list = list.slice().sort((a, b) => Math.max(...b.tags.map(g => (LF2_TAGS[g] || {}).spice || 0.5)) - Math.max(...a.tags.map(g => (LF2_TAGS[g] || {}).spice || 0.5)));
  const ev = list[0], j = lf2Judge(o, ev, p.kn[ev.id].a); lf2Tell(p, o, ev, false, true);
  return { say: j.v < -0.4 ? anyOf(['That is terrible!', 'No! I had no idea.']) : j.v > 0.4 ? 'How lovely.' : anyOf(['Really?', 'Well, well.']) + ' ' + lf2Cap(p.kn[ev.id].a ? ev.text : (ev.anonText || ev.text)) + '. Who would have thought.' };
}
function cvSecretTell(c, tone) {
  const sec = cvSecret(c); if (!sec) return { say: 'Actually… no. Forget I said anything.' };
  lf2Tell(c.o, c.p, sec, false, true); return { say: `Keep this to yourself, but ${lf2Low(c.o.kn[sec.id].a ? sec.text : (sec.anonText || sec.text))}.` };
}
const CV_LIFE: any[] = [
  { id: 'tool', ok: c => c.o.toolQ != null && c.o.toolQ < 35 && c.o.job && c.job !== 'Guard',
    say: c => [`My ${convToolNoun(c.o)} is nearly worn through. Another week and it is a stick.`, `The ${convToolNoun(c.o)} is on its last legs. So am I, some days.`],
    r: c => [{ label: 'That sounds hard.', type: 'agree', ans: ['It is slow work with a bad tool. Everything takes twice as long.', 'I will manage. I always do. Muttering helps.'] },
             { label: 'Here, take five denarii.', type: 'offer', tones: { sly: 'Five denarii. You will owe me one, of course.' }, ans: c => convGive(c, 5) }] },
  { id: 'hungry', ok: c => c.o.hunger >= 62 && !/^(eat|eating|foodOut|forage|bakery)$/.test(c.activity),
    say: ['My stomach has been growling at me since morning.', 'I could eat a goat. A small one.'],
    r: c => [{ label: 'Have something to eat.', type: 'offer', ans: c => { const g = FOODS.concat(['bread', 'stew']).find(g => (c.p.inv[g] || 0) > 0); if (!g) return 'You have nothing on you either, have you? Kind thought.'; lf2GiveFood(c.p, c.o); return 'Oh, bless you. I was about to chew my sleeve.'; } },
             { label: 'When did you last eat?', ans: ['Yesterday. Probably. The days run together.', 'Long enough ago to count.'] }] },
  { id: 'tired', ok: c => c.o.energy < 28 && c.activity !== 'bed',
    say: ['I could sleep on a fence post.', 'Barely keeping my eyes open. Do not let me stop moving.'],
    r: c => [{ label: 'Go and rest.', type: 'agree', ans: ['After this. Probably. If I do not fall over first.', 'You are right. I know you are right.'] }, { label: 'Late night?', ans: ['Early morning. Same thing.', 'The kind where you lie there thinking. You know how it is.'] }] },
  { id: 'poor', ok: c => (c.o.coin || 0) < 4 && c.personal,
    say: ['My purse is thin. I keep checking it, as if it might change its mind.', 'Money is tight. Do not repeat that. Pride, you understand.'],
    r: c => [{ label: 'Here, take five denarii.', type: 'offer', ans: c => convGive(c, 5) }, { label: 'Times are hard for everyone.', type: 'agree', ans: ['They are. It helps to hear it, strangely.', 'We get by. Somehow we always do.'] }] },
  { id: 'low', ok: c => c.o.mood < 30 && c.personal,
    say: ['Rotten day. Everything has gone slightly wrong.', 'I am not myself today. Ask me tomorrow.'],
    r: c => [{ label: 'What is wrong?', ans: ['Nothing, really. Everything. You know the feeling.', 'It piles up, you know? Small things. Then one more small thing.'] }, { label: 'It will pass.', type: 'agree', ans: ['It usually does. Thank you for saying so.', 'I know. It just takes longer than I would like.'] }] },
  { id: 'high', ok: c => c.o.mood > 82,
    say: ['I am in a wonderful mood and I have no idea why.', 'Good day. Good, good day. I feel like singing.'],
    r: c => [{ label: 'What is the secret?', ans: ['No secret. Sleep, food, nobody shouting. It is a short list.', 'I have not found out yet. I will tell you when I do.'] }, { label: 'It suits you.', type: 'agree', ans: ['Ha! Does it? I will wear it more often.', 'Careful, you will make me blush.'] }] },
  { id: 'love', ok: c => c.o.crush != null && c.personal && byId(c.o.crush) && !byId(c.o.crush).dead,
    say: ['Hm? Oh. Nothing. I was thinking. About… things.', 'Sorry. My mind wandered off. It does that lately.'],
    r: c => [{ label: 'Who is it?', ans: c => { const q = byId(c.o.crush); return c.close === 'close' ? `…${q.first}. Do not look at me like that. Do not tell anyone.` : 'I do not know what you mean. I do not know what you mean at all.'; } },
             { label: 'You look happy.', type: 'agree', ans: ['Do I? I did not mean to. It just happens.', 'I suppose I am.'] }] },
  { id: 'baby', ok: c => !!c.o.preg,
    say: ['*hand on belly* Any day now. Any day. Everyone keeps asking.', 'The little one has been kicking all morning. Practising for something.'],
    r: c => [{ label: 'How are you feeling?', ans: ['Enormous. Happy. Enormous.', 'Tired and thrilled. Mostly in that order.'] }, { label: 'Congratulations.', type: 'agree', ans: ['Thank you. I am still getting used to the idea.', 'Thank you. It has not sunk in yet.'] }] },
  { id: 'news', ok: c => c.close !== 'stranger' && !!lf2PickTale(c.o, c.p),
    say: ['Have you heard? I should not say. …I am going to say.', 'There is word going round. Do you want to hear it?'],
    r: c => [{ label: 'Go on, tell me.', ans: c => convNewsLine(c) || 'Actually, never mind. Forget I spoke.' }, { label: 'I would rather not.', type: 'agree', ans: ['Fair enough. Probably wise.', 'Hm. You are the first person to say that. I respect it.'] }] },
  { id: 'folk', ok: c => c.close !== 'stranger' && c.close !== 'cold' && !!(c.q = c.q || convPerson(c)),
    say: c => { const q = c.q, a = c.o.aff[q.id] || 0; return a > 35 ? [`Have you seen ${q.first} today? Lovely person.`, `${q.first} did me a kindness the other day. I have not forgotten.`] : a < -20 ? [`Have you had dealings with ${q.first}? I would be careful.`, `Do not get me started on ${q.first}.`] : [`Have you seen ${q.first} lately? I have not.`, `I keep meaning to talk to ${q.first}.`]; },
    r: c => { const q = c.q; return [
      { label: `What is ${q.first} like, really?`, about: q, tones: { kind: `I have always liked ${q.first}.`, sly: `Funny. I heard something about ${q.first}…`, harsh: `${q.first} is a menace, if you ask me.` }, sly: c => convRumour(c, q), ans: c => { const w = q.mood > 65 ? 'doing well' : q.mood < 35 ? 'having a rough time' : 'getting by', a = c.o.aff[q.id] || 0; return `${q.first} is ${w}, I think. ${a > 40 ? 'I am fond of ' + q.first + '.' : a < -20 ? 'We are not close.' : 'Decent enough.'}`; } },
      { label: `Give ${q.first} my best.`, type: 'agree', about: q, tones: { kind: `${q.first} deserves all the best.`, sly: `Tell ${q.first} I said something nice. I did not.`, harsh: `Tell ${q.first} to mind their own business.` }, ans: c => { lfAff(c.o, q, 1); return anyOf(['I will. They will like that.', 'I will let them know.']); } }]; } },
  { id: 'hobby', ok: c => !!c.o.hobby && c.personal && (c.act === 'leisure' || c.hr > 17),
    say: c => [`I would rather be ${HOBBY_TXT[c.o.hobby]} than almost anything.`, `Nothing beats a bit of ${HOBBY_TXT[c.o.hobby]} after a long day.`],
    r: c => [{ label: 'Are you any good at it?', ans: ['Terrible. It is not about being good.', 'Ha! No. But I am enthusiastic.'] }, { label: 'We should go together.', type: 'offer', ans: c => { tagAlong(c.o, c.p, 120, `${lf2Cap(HOBBY_TXT[c.o.hobby])} with ${c.p.first}`); like(c.o, c.p, 3); return 'We should. Now? Why not now?'; } }] },
  { id: 'quirk', ok: c => c.close === 'close' && !!c.o.quirk && Math.random() < 0.5,
    say: c => [`Can I tell you something silly? People say I ${convQuirk(c.o.quirk)}. Do not laugh.`],
    r: c => [{ label: 'I will not laugh.', type: 'agree', ans: ['You are laughing on the inside. I can see it.', 'Thank you. It means a lot that you would listen.'] }, { label: 'That is wonderful.', type: 'agree', ans: ['Is it? I never thought so. Thank you.', 'Ha! I like that you think so.'] }] },
  { id: 'unease', ok: c => c.close !== 'stranger' && c.close !== 'cold' && cvDirt(c).length > 0,
    say: ['You keep looking at me strangely. Is something wrong?', 'Do I have something on my face? You keep staring.'],
    r: c => [{ label: 'I know what you did.', type: 'ask', own: (c, tone) => cvBlackmail(c, tone), harshOK: true, tones: { kind: 'Your secret is safe with me.', sly: 'It would be a shame if folk found out…', harsh: 'I know what you did. Pay up.' } },
             { label: 'Nothing. Sorry.', type: 'agree', ans: ['Hm. If you say so.', 'Good. I am a private person.'] }] },
  { id: 'spark', ok: c => lf2Single(c.o) && lf2Single(c.p) && c.o.female !== c.p.female && c.aff >= 10 && c.close !== 'cold',
    say: ['You are looking well today. Not that I noticed.', 'Oh! I did not see you there. …I mean, hello.'],
    r: c => [{ label: 'So are you.', type: 'agree', own: (c, tone) => cvFlirt(c, tone), tones: { kind: 'I think about you more than I should.', sly: 'Funny. I was hoping to run into you.', harsh: 'Do not flatter yourself.' } },
             { label: 'Thank you.', type: 'agree', ans: ['Ha. Do not let it go to your head.', 'It was only an observation.'] }] },
  { id: 'dice', ok: c => !!town.tavern && lf2InRoom(c.p, town.tavern) && c.p.coin >= 3 && c.o.coin >= 3 && c.close !== 'cold',
    say: ['Fancy a hand of dice? Three denarii a throw.', 'Dice? The wine is better when someone is losing money.'],
    r: c => [{ label: 'You are on.', type: 'agree', own: cvDice, tones: { kind: 'Let us make a night of it.', sly: 'Dice? I brought my own. For luck.', harsh: 'Let us see you lose, then.' } },
             { label: 'Not tonight.', type: 'agree', ans: ['Your loss. Literally, probably.', 'Suit yourself.'] }] },
  { id: 'secret', ok: c => c.close === 'close' && !!cvSecret(c),
    say: ['There is something I have been dying to tell someone.', 'Can you keep a secret? Because I cannot.'],
    r: c => [{ label: 'You can trust me.', type: 'agree', own: (c, tone) => tone === 'harsh' ? cvSnub(c) : cvSecretTell(c, tone), tones: { kind: 'Whatever it is, it stays with me.', sly: 'I am a vault. Mostly.', harsh: 'Spit it out, then.' } },
             { label: 'Maybe not.', type: 'agree', ans: ['Wise. I would not trust me either.', 'Fair. Forget I spoke.'] }] },
  { id: 'gossipTo', ok: c => c.close !== 'stranger' && c.close !== 'cold' && (lf2Has(c.o, 'gossipy') || lf2Has(c.o, 'curious') || Math.random() < 0.25) && cvNewsToTell(c).length > 0,
    say: ['I never hear anything. Tell me something.', 'What is the word about town? I am always the last to know.'],
    r: c => [{ label: 'Well, I heard…', type: 'agree', own: (c, tone) => tone === 'harsh' ? cvSnub(c) : cvTellNews(c, tone), tones: { kind: 'Something nice, actually…', sly: 'Between us…', harsh: 'You really are the last to know.' } },
             { label: 'Nothing much.', type: 'agree', ans: ['Typical. The one day I ask.', 'Hm. I will find out some other way.'] }] },
];
const CV_QV: any = { hums: 'hum', is: 'am', has: 'have', does: 'do', writes: 'write', feeds: 'feed', claims: 'claim', collects: 'collect', talks: 'talk', forgets: 'forget', keeps: 'keep', swears: 'swear', sings: 'sing', dreams: 'dream' };
function convQuirk(q: string) {
  const w = q.split(' '); let i = 0; while (i < w.length - 1 && /^(secretly|never|always)$/.test(w[i])) i++;
  w[i] = CV_QV[w[i]] || w[i]; return w.join(' ').replace(/\bthey\b/g, 'I').replace(/\btheir\b/g, 'my');
}

/* ---------------- how it comes across: their voice ---------------- */
const CV_VOICE: any = { cheerful: ['Ha! ', ''], jovial: ['Ho! ', ''], grumpy: ['Hmph. ', ''], shy: ['Oh. Um. ', ''], anxious: ['Oh! ', ''], dreamy: ['*gazes off* ', ''] };
function convVoice(o, say: string) {
  if (!o.cvVoiced || game.time - o.cvVoiced > 20) { const t = o.traits.find(x => CV_VOICE[x]); if (t && Math.random() < 0.4) { o.cvVoiced = game.time; return CV_VOICE[t][0] + say; } }
  return say;
}

/* ---------------- opening, replying ---------------- */
const CV_COLD = ['What.', 'Not now.', '*looks straight through you*', 'I have nothing to say to you.'];
function convPickLife(c, more) {
  const seen = c.o.cvSeen || (c.o.cvSeen = {}); const pool = CV_LIFE.filter(L => { if (c.used[L.id]) return false; if (!more && seen[L.id] && game.time - seen[L.id] < 240) return false; try { return L.ok(c); } catch (e) { return false; } });
  if (!pool.length) return null; const L = anyOf(pool); c.used[L.id] = 1; seen[L.id] = game.time; return L;
}
function convOpen(c, more?: boolean) {
  const o = c.o;
  if (c.close === 'cold') return { say: anyOf(CV_COLD), replies: [{ label: 'About before. I am sorry.', type: 'agree', ans: c => { const ok = c.aff > -40; if (ok) lfAff(c.o, c.p, 6); return ok ? 'Hm. …Thank you. I will think about it.' : 'Words are cheap.'; } }] };
  if (o.job === 'Guard' && lf2Wanted()[c.p.id]) return { say: anyOf(['Stop right there, ' + c.p.first + '.', 'We need to talk about what happened.', 'I have been looking for you.']), replies: [{ label: 'About that business…', type: 'agree', harshOK: true, tones: { kind: 'I would like to explain.', sly: 'Whatever do you mean, officer?', harsh: 'Come and get me.' }, own: (c, tone) => { setTimeout(() => lf2ArrestDialog(c.o, c.p), 0); return { close: true }; } }] };
  if (c.kid) { const K = anyOf(CV_KID); return { say: convVoice(o, pk(K.say)), replies: K.r }; }
  const A = CV_ACT[convActivity(c)] || CV_ACT.any;       // (a guard walking somewhere is just a person walking somewhere)
  let say = pk(A.say, c), replies = A.r.slice();
  const L = (more || c.close !== 'stranger') && (more || Math.random() < 0.55) ? convPickLife(c, more) : null;
  if (L) { say = more ? pk(L.say, c) : say + ' ' + anyOf(['', '', 'Oh. ', 'Anyway. ']) + pk(L.say, c); replies = L.r(c); }
  else if (more) return { say: anyOf(['That is about all I have, really.', 'Nothing more. You have had the best of me.']), replies: [] };
  return { say: convVoice(o, say), replies: replies.slice(0, 2) };
}

/* how they take your tone (and what it does to how they feel about you) */
function convToneFx(c, tone: CvTone, r?) {
  const o = c.o, p = c.p, aff = o.aff[p.id] || 0, has = t => lf2Has(o, t);
  if (r && r.about) {      // the tone is aimed at the person being talked about, not at the one you are talking to
    const q = r.about, a = o.aff[q.id] || 0;
    if (tone === 'harsh') { if (a > 40) { lfAff(o, p, -4); return { end: true, say: 'That is a friend of mine you are talking about. I will not listen to that.' }; } lfAff(o, p, 2); lfAff(o, q, -1); return { react: anyOf(['Ha! You are not wrong.', 'Do not let them hear you say that. …Go on, though.']) }; }
    if (tone === 'kind') { if (a < -20) { lfAff(o, p, -1); return { react: 'Hm. If you say so.' }; } lfAff(o, p, 2); lfAff(o, q, 1); return { react: 'That is kind of you to say.' }; }
  }
  if (tone === 'kind') {
    if (aff <= -20) { lfAff(o, p, 1); return { react: 'Flattery will not work on me.' }; }
    lfAff(o, p, has('shy') || has('proud') || has('cheerful') ? 4 : 3);
    return { react: has('shy') ? 'Oh! Um. Thank you.' : has('proud') ? 'Well. Naturally.' : has('grumpy') ? 'Hm. Do not get used to it.' : has('jovial') || has('cheerful') ? 'Ha! You are too kind!' : anyOf(['That is kind of you.', 'Oh, stop it. (Do not stop.)']) };
  }
  if (tone === 'sly') {
    const trust = Math.max(0.2, Math.min(1, 0.55 + aff / 120)) * (has('curious') ? 0.75 : 1);
    if (Math.random() < trust) { lfAff(o, p, 1); return { react: Math.random() < 0.35 ? anyOf(['Heh. You are too clever by half.', 'Is that right? Well, well.', 'Flatterer.']) : '', believed: true }; }
    lfAff(o, p, -2); return { react: anyOf(['Is that so?', 'You are not being straight with me.', 'Hm. I am not sure I believe you.']), believed: false };
  }
  if (tone === 'harsh') {
    lfEmit('insult', { actor: p, target: o, sev: 1, loud: true, tags: ['nuisance', 'embarrass'], chron: false, text: `${p.first} was rude to ${o.first}'s face` });
    lfAff(o, p, o.age < 14 ? -8 : -5);
    if ((has('brave') || has('grumpy') || (o.drunk || 0) > 60) && Math.random() < 0.35 && LF2.on('tavern')) { setTimeout(() => lf2Brawl(o, p), 0); return { end: true, say: 'Right. That does it!' }; }
    return { end: true, say: has('shy') ? '*flinches and looks away*' : has('anxious') ? 'That… that was unkind.' : has('proud') ? 'You will regret that tone.' : anyOf(['How dare you.', 'Charming.', 'Get away from me.']) };
  }
  like(o, p, 1); return { react: '' };
}
function convPick(c, r) {
  const tone = convTone(); (talkUI as any).tone = null;
  const o = c.o, p = c.p; bumpKnow(o, p, 2);
  if (r.own) {      // a reply that decides for itself what each tone does (blackmail, flirting, dice ...)
    const res = r.own(c, tone); if (!res || res.close) return null;
    return res.end ? { say: res.say, opts: [] } : convTurn(c, { say: res.say, replies: (res.next || []).slice(0, 2) });
  }
  const fx = convToneFx(c, tone, r); c.fx = fx; c.tone = tone;
  if (fx.end) return { say: fx.say, opts: [] };
  let ans = '';
  if (tone === 'sly' && r.sly) ans = r.sly(c);
  else if (r.ans) ans = pk(r.ans, c, tone, r);
  const say = ((fx.react ? fx.react + ' ' : '') + (ans || '')).trim();
  // a conversation between people who know each other keeps going: now and then they pick up something else
  let next = r.then ? r.then(c) : [], tail = '';
  if (!next.length && c.personal && Math.random() < 0.45) { const L = convPickLife(c, true); if (L) { tail = ' ' + anyOf(['', 'Oh. ', 'Anyway. ']) + pk(L.say, c); next = L.r(c); } }
  return convTurn(c, { say: say + tail, replies: next.slice(0, 2) });
}
/** a turn in the form lf2TalkStep wants: say + [label, fn] pairs */
function convTurn(c, t) {
  c.cur = t.replies; const tone = convTone();
  return { say: t.say, opts: t.replies.map(r => [convLabel(r, tone), () => convPick(c, r)]) };
}
/** the first turn, in the form openTalk wants (keys c0, c1 …) and with talkS set up for lf2TalkStep */
function convBegin(o, p) {
  const c = convCtx(o, p); bumpKnow(o, p, 2);
  talkS = { n: o, p, sc: null, c: null, stage: 0, custom: true, conv: c, fns: [] };
  return convFrame(c, convOpen(c));
}
function convFrame(c, t) {
  const turn = convTurn(c, t); talkS.fns = turn.opts.map(x => x[1]);
  return { say: turn.say, opts: turn.opts.map((x, i) => ['c' + i, x[0]]) };
}
/** "Anything else?" at the end of an authored scene */
function convMore() {
  const S = talkS, c = convCtx(S.n, S.p); S.custom = true; S.conv = c; return convFrame(c, convOpen(c, true));
}

/* ---------------- tone buttons and the live preview ---------------- */
function convSyncLabels() {
  if (!talkUI.o || !talkS || !talkS.conv) return;
  const tone = convTone(), box = document.getElementById('talk'); if (!box) return;
  (talkS.conv.cur || []).forEach((r, i) => { const b = box.querySelector('[data-k="c' + i + '"]'); if (b && b.lastChild) b.lastChild.textContent = convLabel(r, tone); });
  box.querySelectorAll('[data-tone]').forEach((b: any) => b.classList.toggle('on', b.dataset.tone === tone));
}
function convDecorate(box) {
  if (!talkS || !talkS.conv) return;
  const tk = box.querySelector('.tk'); if (!tk) return;
  const row = document.createElement('div'); row.className = 'tones';
  row.innerHTML = '<small>Say it:</small>' + [['kind', 'Kind', 'E'], ['sly', 'Sly', 'Shift'], ['harsh', 'Harsh', 'R']].map(t => `<button type="button" data-tone="${t[0]}">${t[1]}<i>${t[2]}</i></button>`).join('');
  tk.appendChild(row);
  row.querySelectorAll('[data-tone]').forEach((b: any) => b.addEventListener('click', e => { e.preventDefault(); (talkUI as any).tone = (talkUI as any).tone === b.dataset.tone ? null : b.dataset.tone; convSyncLabels(); }));
  convSyncLabels();
}
// keydown: the held key is already recorded (controls.ts listens first). keyup: this listener runs after controls.ts clears it.
window.addEventListener('keydown', e => { if (talkUI.o && talkS && talkS.conv && /^(e|r|shift)$/i.test((e as any).key || '')) convSyncLabels(); }, true);
window.addEventListener('keyup', e => { if (talkUI.o && talkS && talkS.conv && /^(e|r|shift)$/i.test((e as any).key || '')) convSyncLabels(); });   // (bubble phase: runs after controls.ts has cleared the key)
