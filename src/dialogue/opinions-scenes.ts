/* ================= Opinions: everyone has a few things they feel strongly about ================= */
const tr = (n, t) => n.traits.includes(t) ? 1 : 0;
const OPINIONS = {
  chapel: { when: () => !!town.church, label: 'the chapel', score: n => tr(n, 'devout') * 3 + tr(n, 'anxious') - tr(n, 'grumpy') * 2 - tr(n, 'greedy') * 1.5 - tr(n, 'night owl') - tr(n, 'curious') * 0.5,
    pro: ['It is the heart of this town. Whatever else happens, the bells keep us together.', 'I feel calmer just walking past it. You should try sitting in there some evening.'],
    con: ['All that stone for a building we use once a week. We could have had three more houses.', 'I am not one for kneeling. The open sky is chapel enough for me.'],
    mid: ['It is handsome enough. I go for the weddings and the funerals, like everyone.'] },
  tavern: { when: () => !!town.tavern, label: 'the tavern', score: n => tr(n, 'sociable') * 3 + tr(n, 'jovial') * 2 + tr(n, 'night owl') - tr(n, 'devout') * 2 - tr(n, 'anxious') - tr(n, 'homebody') * 1.5 - tr(n, 'greedy'),
    pro: ['Best place in town after a long day. Ale, songs, and nobody asks about work.', 'Half the news in this town starts at that bar. The other half ends there.'],
    con: ['Too loud, too late, too much ale. Somebody will fall in the pond one of these nights.', 'Cider in, sore heads out. I do not see the appeal.'],
    mid: ['I go now and then. One cup, then home.'] },
  market: { when: () => town.markets.some(m => m.stalls.length), label: 'the shared larder', score: n => tr(n, 'cheerful') + tr(n, 'sociable') + tr(n, 'generous') * 2 - tr(n, 'greedy') * 3 - tr(n, 'grumpy') + (n.role === 'Trader' ? 4 : 0),
    pro: ['Take what you need, leave what you can. Best idea we ever had.', 'Nobody goes hungry on this island. That is the larder.'],
    con: ['Somebody takes all the good berries and leaves the squashed ones. I know who.', 'I leave six fish and take one berry. It is not FAIR.'],
    mid: ['I leave a bit, I take a bit. It evens out.'] },
  rest: { when: () => true, label: 'the rest day', score: n => tr(n, 'lazy') * 3 + tr(n, 'devout') * 1.5 + tr(n, 'sociable') + tr(n, 'cheerful') + (n.fam.kids.length ? 1 : 0) - tr(n, 'proud') * 2 - tr(n, 'greedy') * 2 - tr(n, 'early bird'),
    pro: ['Best idea anyone ever had. Half a day with the family and nobody shouting about timber.', 'A body needs rest. So does a soul.'],
    con: ['Half a day of lost work, every few days. The houses do not build themselves.', 'I do not know what to do with myself. I end up chopping wood anyway.'],
    mid: ['I take the afternoon, same as everyone. I do not think about it much.'] },
  bonfire: { when: () => !!(town.lastFeast || town.feast), label: 'the bonfires', score: n => tr(n, 'jovial') * 3 + tr(n, 'sociable') * 2 + tr(n, 'cheerful') + tr(n, 'night owl') - tr(n, 'anxious') * 3 - tr(n, 'grumpy') * 2 - tr(n, 'homebody') - tr(n, 'early bird'),
    pro: ['When the fire is roaring and somebody starts singing? That is what we are all working for.', 'I danced until my shoes gave up last time. Worth it.'],
    con: ['One stray spark and the whole camp goes up. Nobody listens to me.', 'Noise until all hours. Some of us work in the morning.'],
    mid: ['I go, I eat, I leave before the singing. Everybody wins.'] },
  growth: { when: () => npcs.length >= 10, label: 'how the town is growing', score: n => tr(n, 'sociable') * 2 + tr(n, 'curious') + tr(n, 'brave') + tr(n, 'cheerful') + tr(n, 'proud') - tr(n, 'homebody') * 2 - tr(n, 'anxious') * 2 - tr(n, 'grumpy') - tr(n, 'shy'),
    pro: ['More neighbours, more hands. I like a busy town. One day this will be a proper village.', 'Every new house is a little proof we are going to make it.'],
    con: ['I liked it better when I knew every face. Now there are strangers at the well.', 'More mouths, same pond, same trees. Somebody should be doing the sums.'],
    mid: ['It grows. Towns do. As long as there is bread.'] },
  pond: { when: () => shoreTiles.length > 0, label: 'all the fishing', score: n => (n.cur === 'Fisher' || n.hobby === 'fishing' ? 2.5 : 0) + tr(n, 'greedy') - tr(n, 'anxious') * 2.5 - tr(n, 'dreamy') - tr(n, 'generous') * 0.5,
    pro: ['That water feeds half the town. Best thing about this place.', 'There is nothing like a fresh fish on a fire. Nothing.'],
    con: ['They will fish that water dry and then what? Nobody thinks past supper.', 'I feel sorry for the fish, if I am honest. Do not tell anyone.'],
    mid: ['Fish is fish. I eat it when it is there.'] },
  kids: { when: () => npcs.some(o => o.age < 16), label: 'the children running about', score: n => tr(n, 'cheerful') * 2 + tr(n, 'generous') + (n.fam.kids.length ? 2 : 0) + (n.age < 16 ? 3 : 0) + (n.role === 'Elder' ? 1 : 0) - tr(n, 'grumpy') * 3 - tr(n, 'proud') - tr(n, 'anxious') * 0.5,
    pro: ['They are the whole point, are they not? Listen to them laughing.', 'Best sound in the world, little ones playing on the square.'],
    con: ['Under my feet all day long. Somebody teach them to carry a log.', 'Someone let them near my woodpile again. Again!'],
    mid: ['They are loud. They are ours. That is all there is to say.'] },
  forest: { when: () => true, label: 'the forest past the fields', score: n => tr(n, 'curious') * 2.5 + tr(n, 'brave') * 2 + tr(n, 'dreamy') + (n.cur === 'Woodcutter' ? 1 : 0) - tr(n, 'anxious') * 3 - tr(n, 'homebody') * 1.5,
    pro: ['There is so much out there nobody has seen. One day I will walk until I find the end of it.', 'Quiet, green, full of berries. The best part of this land.'],
    con: ['I hear things at night out there. Something is watching the town. I am sure of it.', 'People go in there and come back strange. I stay by the lamps.'],
    mid: ['Trees. Lots of trees. Good for timber.'] }
};
function stanceOf(n, k) { n.stance = n.stance || {}; if (n.stance[k] === undefined) { const R = rng(town.seed + n.id * 313 + k.length * 71 + k.charCodeAt(0)); n.stance[k] = OPINIONS[k].score(n) + (R() - 0.5) * 2.2; } return n.stance[k]; }
function petTopics(n) { return Object.keys(OPINIONS).filter(k => OPINIONS[k].when()).sort((a, b) => Math.abs(stanceOf(n, b)) - Math.abs(stanceOf(n, a))).slice(0, 2); }
function opinionTalk(n, k) { const s = stanceOf(n, k), o = OPINIONS[k]; return anyOf(s > 1 ? o.pro : s < -1 ? o.con : o.mid); }

/* ================= The person on their mind ================= */
function onMind(n, p) {
  let best = null, bs = 0;
  for (const o of npcs) {
    if (o === n || o === p || o.infant || o.age < 3) continue;
    const a = n.aff[o.id] || 0, kw = kinWord(n, o); let s = 0, kind = null;
    if (crushOK(n, o) && a >= 25) { s = 100 + a; kind = 'crush'; }
    else if (n.fam.partner === o.id) { s = 80; kind = 'partner'; }
    else if (a <= -20 || n.rel[o.id] === 'rival') { s = 60 - a; kind = 'rival'; }
    else if (!kw && a >= 45) { s = 30 + a / 2; kind = 'friend'; }
    else if (kw && (kw === 'son' || kw === 'daughter') && o.age >= 16 && o.homeRoom !== n.homeRoom) { s = 35; kind = 'away'; }
    if (s > bs) { bs = s; best = { o, kind }; }
  }
  return best;
}
const eligibleNow = n => n.age >= 16 && n.age < 60 && !n.fam.spouse && !n.fam.partner && !(n.grief > game.time);
const crushOK = (n, o) => eligibleNow(n) && eligibleNow(o) && n.female !== o.female && Math.abs(n.age - o.age) <= 14 && !isKin(n, o) && !npcs.some(x => x.player && x === o);

/* ================= The conversation itself ================= */
let talkS = null;
/* ================= Scenes: people speak first, about what is actually going on =================
   Bumping into someone picks the one thing most worth saying to you right now.
   If there is nothing, they brush you off with a single line and carry on. */

/* ---------- every town has its own little history ---------- */
const LORE_LEGEND = [
  { k: 'well', thing: 'the old well', tale: 'that a girl fell into the old well, years before any of us came, and on still nights you can hear her humming down there' },
  { k: 'stag', thing: 'the white stag', tale: 'that a white stag walks the edge of the forest, and whoever sees it will have a child within the year' },
  { k: 'bell', thing: 'the drowned bell', tale: 'that there is a church bell at the bottom of the water, and it rings when someone is about to die' },
  { k: 'lights', thing: 'the marsh lights', tale: 'that little lights dance out past the fields, and if you follow them you never come back the same' },
  { k: 'stones', thing: 'the humming stones', tale: 'that the grey rocks out past the trees hum if you put your ear to them, and they only hum for liars' }
];
const LORE_HARD = ['the hungry first winter', 'the fever that came with the second spring', 'the flood that took the first camp', 'the year the fish all vanished'];
const LORE_HOPE = ['a mill on the river, so we stop grinding by hand', 'a proper road to the city, so traders come to us', 'a stone bridge across the water', 'a bell for the chapel, a real one', 'a school, so the little ones learn letters'];
const LORE_LOST = ['the founder\'s silver locket', 'the first iron plough blade', 'a wedding ring nobody ever claimed', 'the town\'s first lucky pebble, the one from the shipwreck'];
function lore() {
  if (town.lore) return town.lore;
  const R = rng(town.seed * 7 + 3), elders = npcs.filter(n => n.age >= 40).sort((a, b) => b.age - a.age);
  const founder = (pick(R, SURNAMES) || 'Ashby'), used = new Set(npcs.map(n => n.first)), fn = FIRST_F.concat(FIRST_M).filter(x => !used.has(x));
  return (town.lore = { legend: pick(R, LORE_LEGEND), hard: pick(R, LORE_HARD), hope: pick(R, LORE_HOPE), lost: pick(R, LORE_LOST), founder: 'Old ' + (pick(R, fn.length ? fn : FIRST_F) ) + ' ' + founder, firstOld: elders[0] ? elders[0].id : null });
}
const believes = n => { lore(); n.believe = n.believe === undefined ? (tr(n, 'anxious') + tr(n, 'dreamy') + tr(n, 'devout') - tr(n, 'grumpy') - tr(n, 'proud') - tr(n, 'curious') * 0.5 + (rng(town.seed + n.id * 17)() - 0.5) * 1.6) > 0 : n.believe; return n.believe; };

/* ---------- helpers ---------- */
const like = (n, p, v) => bumpAff(n, p, v, 4);
const recently = (t, days) => t !== undefined && t !== null && game.time - t < days * 1440;
const houseSiteOf = o => town.sites.find(s => s.kind === 'house' && (s.owners || []).includes(o.id) && s.slots && s.slots.some(q => !q.built));
const logsLeft = s => siteRem(s, 'wood') + siteRem(s, 'stone');
const kidsOf = n => (n.fam.kids || []).map(byId).filter(k => k && !k.dead);
const Mum = (kid, par) => par.female ? 'Mum' : 'Dad';
const recentDeathOf = n => (town.dead || []).filter(r => recently(r.died, 2) && r.person && (kinWord(n, r.person) && kinWord(n, r.person) !== 'friend' && kinWord(n, r.person) !== 'rival' || (n.aff[r.id] || 0) >= 70) && !(n.grieved || {})[r.id]).sort((a, b) => b.died - a.died)[0];
function tagAlong(n, p, mins, text) { n.tag = { p: p.id, until: game.time + mins, text }; n.outUntil = game.time + mins; }
function deed(p, text) { (town.deeds = town.deeds || []).push({ p: p.id, t: game.time, text }); if (town.deeds.length > 60) town.deeds.shift(); }
const youName = (n, p) => { const k = kinWord(n, p); return k === 'son' || k === 'daughter' ? (n.female ? 'love' : 'lad') : k === 'husband' || k === 'wife' ? 'love' : p.first; };

/* ---------- the scenes ----------
   when(n,p) -> context object (truthy) or null;  pri: higher wins;  cool: minutes before it can play again (0 = once)
   lines(n,p,c) -> string;  opts(n,p,c) -> [[label, fn -> reply string]] */
const SCENES = [

  /* --- grief --- */
  { id: 'grief', pri: 100, cool: 1440,
    when: (n, p) => { const r = recentDeathOf(n); return r && r.id !== p.id ? { r, kw: r.person ? kinWord(n, r.person) : null } : null; },
    lines: (n, p, c) => { (n.grieved = n.grieved || {})[c.r.id] = 1; return n.age < 12 ? `${c.r.first} is in the ground now. ${n.age < 8 ? 'Will ' + (c.r.female ? 'she' : 'he') + ' be cold?' : 'I keep thinking ' + (c.r.female ? 'she' : 'he') + ' will come round the corner.'}` : c.kw === 'husband' || c.kw === 'wife' ? `I keep setting two bowls out. Every night. Then I remember, and I put one back.` : c.kw === 'mother' || c.kw === 'father' ? `My ${c.kw} used to ${anyOf(['hum when the kettle was on', 'fall asleep in the chair after supper', 'tell me off for my muddy boots'])}. I would give anything to be told off one more time.` : c.kw === 'son' || c.kw === 'daughter' ? `Nobody should bury their child. Nobody. I keep his... I keep the little things. I cannot move them.`.replace('his...', c.r.female ? 'her...' : 'his...') : c.kw && c.kw !== 'friend' ? `${c.r.first} was my ${c.kw}. ${anyOf(['We were not always close. Now I wish we had been.', 'Family is family. There is a hole where ' + (c.r.female ? 'she' : 'he') + ' used to be.'])}` : `${c.r.first} was the best friend I ever had. I do not know who to tell things to now.`; },
    opts: (n, p, c) => [['Sit with them a while', () => { like(n, p, 8); n.social = Math.min(100, n.social + 20); addMem(n, 'share', `the day ${p.first} sat with me after I lost ${c.r.first}`, `when you sat with me, after ${c.r.first}`, p.id); return '...Thank you. I did not want to be alone with it.'; }],
      [`Tell them a good memory of ${c.r.first}`, () => { like(n, p, 5); return `${c.r.first} ${c.r.quirk}. Ha... yes. I had almost forgotten. Thank you.`; }], ['Leave them be', () => '']] },
  { id: 'condolence', pri: 85, cool: 1440,
    when: (n, p) => { const r = recentDeathOf(p); return r && (n.know[p.id] || 0) >= 20 && !(r.person && isKin(n, r.person)) ? { r } : null; },
    lines: (n, p, c) => anyOf([`I heard about ${c.r.first}. I am so sorry, ${p.first}. If you need anything at all, you come to me.`, `${p.first}. I was at the churchyard. I did not know what to say, so I said nothing. I am sorry about ${c.r.first}.`]),
    opts: (n, p, c) => [['Thank you', () => { like(n, p, 4); return anyOf(['Come by for supper. I mean it.', 'It gets easier. Not soon. But it does.']); }], ['I am fine', () => tr(n, 'generous') || tr(n, 'cheerful') ? 'No, you are not. But all right.' : 'If you say so.']] },

  /* --- hunger --- */
  { id: 'hungry', pri: 92, cool: 600,
    when: (n, p) => n.hunger >= 60 && n.age >= 3 && !foodSat(n.homeRoom ? pantryOf(n) : n.inv) ? {} : null,
    lines: (n, p) => n.age < 16 ? `My tummy has been growling all day. There is nothing in the house.` : anyOf([`Sorry, I am no company today. The pantry is empty and my stomach knows it.`, `Do you know what I would do for a fish right now? Anything. Almost anything.`]),
    opts: (n, p) => FOODS.some(g => (p.inv[g] || 0) > 0) ? [['Share your food', () => { const g = FOODS.find(x => (p.inv[x] || 0) > 0), q = Math.min(2, p.inv[g]); p.inv[g] -= q; n.inv[g] = (n.inv[g] || 0) + q; eatSat(n, n.inv); like(n, p, 10); addMem(n, 'share', `the day ${p.first} fed me`, 'when you shared your food with me', p.id); deed(p, `shared food with a hungry ${n.first}`); return n.age < 16 ? 'Thank you! You are the best grown-up.' : `${p.first}, you are a good soul. I will pay it back.`; }], ['Sorry, I cannot', () => 'No, of course. Everyone is tight.']]
      : [['Hang in there', () => 'I am trying.']] },
  { id: 'feed_you', pri: 88, cool: 900,
    when: (n, p) => p.hunger >= 60 && (isKin(n, p) || tr(n, 'generous') || (n.aff[p.id] || 0) >= 30) && foodSat(n.homeRoom ? pantryOf(n) : n.inv) > 150 && n.age >= 12 ? {} : null,
    lines: (n, p) => anyOf([`${youName(n, p)}, you look half-starved. When did you last eat?`, `I can hear your stomach from here. Come on. Sit.`]),
    opts: (n, p) => [['Accept the food', () => { const pool = n.homeRoom ? pantryOf(n) : n.inv; eatSat(p, pool); like(p, n, 6); addMem(p, 'share', `the time ${n.first} fed me`, 'when you fed me', n.id); return anyOf(['There. Better? Do not make me worry about you.', 'Eat slower! Nobody is going to steal it.']); }], ['I am fine, really', () => 'Hm. Stubborn as a goat.']] },

  /* --- homes --- */
  { id: 'house_thanks', pri: 90, cool: 0,
    when: (n, p) => { const h = n.helpedBy && n.helpedBy[p.id]; return h && recently(h.t, 3) && n.homeRoom ? { h } : null; },
    lines: (n, p, c) => `${p.first}! I counted. ${c.h.n} of the logs in our walls came from your hands. I lay in bed last night and touched the wall and thought, ${p.first} carried that one.`,
    opts: (n, p) => [['It was nothing', () => { like(n, p, 6); addMem(n, 'home', `how ${p.first} helped build our house`, 'when you helped build our house', p.id); return 'It was not nothing. Come for supper. That is not a question.'; }], ['You would have done the same', () => { like(n, p, 6); return 'I would. And now I owe you, so I will have to.'; }]] },
  { id: 'house_wait', pri: 72, cool: 900,
    when: (n, p) => { const s = houseSiteOf(n); return s ? { s, left: logsLeft(s) } : null; },
    lines: (n, p, c) => c.left <= 4 ? `${c.left} more! Only ${c.left}. I can almost smell the hearth. Tomorrow we sleep under our own roof, I can feel it.` : n.age < 16 ? `We are getting a house! A real one! It needs ${c.left} more logs. I counted them. Twice.` : anyOf([`Every morning I walk past our site and count the logs. ${c.left} still to go. The children ask every day. I say soon.`, `${c.left} more logs and we have a roof. I know it is only wood. It does not feel like only wood.`]),
    opts: (n, p, c) => [['I will bring timber', () => { like(n, p, 3); n.promised = n.promised || {}; n.promised[p.id] = game.time; return anyOf(['Would you? Every log counts. Throw it on the wall, anywhere it fits.', 'Truly? Then I will save you a seat by the fire.']); }], ['It will be done soon', () => anyOf(['From your lips.', 'Everyone keeps saying that.'])]] },
  { id: 'your_house', pri: 70, cool: 1200,
    when: (n, p) => { const s = houseSiteOf(p); return s && (n.know[p.id] || 0) >= 15 && !(s.owners || []).includes(n.id) ? { s, left: logsLeft(s) } : null; },
    lines: (n, p, c) => c.left <= 5 ? `Your walls are nearly up, ${p.first}! ${c.left} more and you are in. You will have us all round for supper, I hope.` : anyOf([`I walked past your site this morning. ${c.left} still to go. It is a good spot. Morning sun.`, `${c.left} logs till your house is done. If I find a spare one, it is yours.`]),
    opts: (n, p, c) => [['I cannot wait', () => tr(n, 'generous') ? (() => { if (handsUsed(n) > 0 && (n.inv.wood || 0) > 0) { n.inv.wood--; p.inv.wood = (p.inv.wood || 0) + 1; return 'Here. Take this one. For your wall.'; } return 'I will carry one over myself when I can.'; })() : 'Nor can I. Someone has to host the next bonfire.'], ['It is slow going', () => 'Everything good is.']] },
  { id: 'tent', pri: 60, cool: 1440,
    when: (n, p) => !n.homeRoom && n.age >= 3 && !houseSiteOf(n) ? {} : null,
    lines: (n, p) => n.age < 16 ? `I sleep in a tent! It is like an adventure. Except when it rains. And a hedgehog comes every night!` : anyOf([`Another night under canvas. The ground has learned the shape of my back. At least the hedgehog keeps me company.`, `One day I will have walls. For now I have a tent, and a very nosy hedgehog.`]),
    opts: (n, p) => [['Things will turn around', () => anyOf(['They had better.', 'Hope is free. I have plenty of it.'])], ['A hedgehog?', () => `He comes every night. I call him ${anyOf(['Bristle', 'Sir Prickles', 'Old Tom'])}. Do not tell anyone.`]] },

  /* --- family moments --- */
  { id: 'new_baby', pri: 90, cool: 0,
    when: (n, p) => { const k = kidsOf(n).filter(k => recently(k.born, 1.2))[0]; return k ? { k } : null; },
    lines: (n, p, c) => `Have you seen ${himHer(c.k)}? Little ${c.k.first}. ${anyOf([`${HeShe(c.k)} has my nose. Poor thing.`, `${HeShe(c.k)} grabbed my finger and would not let go. I would not either.`, `I have not slept in two days and I have never been happier.`])}`,
    opts: (n, p, c) => [['Congratulations', () => { like(n, p, 4); return anyOf(['Thank you. Come and meet properly when the house is quiet. Ha. As if.', 'I keep looking at the cot to check it is real.']); }], [`${c.k.first} is a fine name`, () => { like(n, p, 5); return `It was ${anyOf(['my grandmother\'s', 'the name of the first star I saw that night', 'the only one we did not argue about'])}.`; }]] },
  { id: 'expecting', pri: 65, cool: 1440,
    when: (n, p) => n.preg ? { soon: n.preg.due - game.time < 0.2 * YEAR } : null,
    lines: (n, p, c) => c.soon ? `Any day now. The little one kicks like a mule. A mule with opinions.` : `I am expecting. Do not make a fuss. ...You can make a small fuss.`,
    opts: (n, p) => [['That is wonderful news', () => { like(n, p, 3); return 'It is, is it not? I am terrified. Wonderful and terrified.'; }], ['Boy or girl, do you think?', () => anyOf(['A girl. I just know.', 'A boy. He kicks like his father.', 'As long as it sleeps, I do not mind.'])]] },
  { id: 'first_fish', pri: 82, cool: 0,
    when: (n, p) => { const k = kidsOf(n).find(k => k.firstFish && (k.mem || []).some(m => /first one/.test(m.me) && recently(m.t, 1.5))); return k && k !== p ? { k } : null; },
    lines: (n, p, c) => `${c.k.first} has not stopped talking about that fish. ${HeShe(c.k)} is sleeping with it. With it. It is starting to smell.`,
    opts: (n, p, c) => [['Let them keep it one more night', () => { like(n, p, 4); return 'Ha! You are as bad as the child. One more night. Then it goes in the pot.'; }],
      [`I will take ${c.k.first} out for a bigger one`, () => { like(n, p, 6); tagAlong(c.k, p, 240, `Following ${p.first} to the water`); addMem(c.k, 'outing', `the day ${p.first} took me fishing`, 'when you took me fishing', p.id); return `Would you? ${HeShe(c.k)} will follow you anywhere now. Go on, ${c.k.first}! Off you go!`; }],
      ['That is disgusting', () => 'You have clearly never been a parent.']] },
  { id: 'kid_learn', pri: 58, cool: 1440,
    when: (n, p) => { if (n.age < 8 || n.age >= 16) return null; const j = Object.entries(n.learn || {}).sort((a, b) => b[1] - a[1])[0]; const pj = p.cur; return pj && JOB_VERB[pj] ? { j: pj, mine: j && j[0] === pj } : null; },
    lines: (n, p, c) => c.mine ? `You ${JOB_VERB[c.j]} like my ${anyOf(['mum', 'dad'])} does! Can I watch you? I will be quiet. Mostly quiet.` : `How do you ${JOB_VERB[c.j]}? Is it hard? Can you show me? Please?`,
    opts: (n, p, c) => [['Come on then', () => { tagAlong(n, p, 180, `Watching ${p.first} ${JOB_VERB[c.j]}`); n.learn = n.learn || {}; n.learn[c.j] = (n.learn[c.j] || 0) + 2; like(n, p, 6); addMem(n, 'teach', `the day ${p.first} showed me how to ${JOB_VERB[c.j]}`, `when you showed me how to ${JOB_VERB[c.j]}`, p.id); return 'YES! I am coming! Wait for me!'; }], ['Another day', () => 'Promise? You have to promise.']] },
  { id: 'kid_bored', pri: 40, cool: 900,
    when: (n, p) => n.age >= 4 && n.age < 12 && n.social < 55 ? {} : null,
    lines: (n, p) => anyOf([`Nobody will play with me. Everyone is busy being grown-up.`, `I am SO bored. I counted all the fence posts. There are not enough.`, `Do you want to see a frog? I have a frog. Well. I had a frog.`]),
    opts: (n, p) => [['Tag! You are it!', () => { n.social = Math.min(100, n.social + 30); like(n, p, 6); tagAlong(n, p, 90, `Chasing ${p.first}`); return 'No fair! Come back here!'; }], ['Go help your parents', () => tr(n, 'cheerful') ? 'Booooring. Fine.' : '*sighs very loudly*']] },
  { id: 'your_family', pri: 55, cool: 1200,
    when: (n, p) => { const k = kinWord(n, p); const kind = k === 'husband' || k === 'wife' ? 'spouse' : (k === 'mother' || k === 'father') && n.age < 16 ? 'kid' : (k === 'son' || k === 'daughter') ? 'parent' : null; if (!kind) return null; const pool = FAMILY_BITS[kind]; return { kind, bit: pool[Math.floor(Math.random() * pool.length)] }; },
    lines: (n, p, c) => c.bit.say(n, p),
    opts: (n, p, c) => c.bit.opts(n, p) },
  /* --- love --- */
  { id: 'wedding_nerves', pri: 95, cool: 1200,
    when: (n, p) => { const w = town.wedding; return w && !w.done && (w.a === n || w.b === n) ? { o: w.a === n ? w.b : w.a, at: w.at } : null; },
    lines: (n, p, c) => anyOf([`I am marrying ${c.o.first} ${dayLabel(c.at)}. Me! What if I trip? What if I forget the words? What if ${heShe(c.o)} comes to ${hisHer(c.o)} senses?`, `Have you seen ${c.o.first}? Do not tell ${himHer(c.o)} I was looking. Bad luck. Or is that just the dress?`]),
    opts: (n, p, c) => [['You will be fine', () => { like(n, p, 4); return 'Say it again. Slower.'; }], [`${c.o.first} is lucky`, () => { like(n, p, 6); return `No. I am. Will you be there? Promise you will be there.`; }]] },
  { id: 'courting', pri: 62, cool: 1200,
    when: (n, p) => { const o = n.fam.partner && !n.fam.spouse ? byId(n.fam.partner) : null; return o && o !== p ? { o } : null; },
    lines: (n, p, c) => anyOf([`${c.o.first} walked me home last night. All the way. The long way. On purpose.`, `Do you think ${c.o.first} likes stones? I found a pretty one. Is that a stupid present? It is a stupid present.`, `I am going to ask ${c.o.first} to marry me. Not today. Maybe tomorrow. Maybe at the bonfire. Do not tell anyone.`]),
    opts: (n, p, c) => [['Go on, ask!', () => { if (n.aff[c.o.id] !== undefined) n.aff[c.o.id] += 5; like(n, p, 3); return 'You think so? ...You are right. Life is short.'; }], ['Take it slowly', () => tr(n, 'anxious') ? 'Slowly. Yes. Slowly is good.' : 'Slow is for snails.']] },
  { id: 'crush', pri: 75, cool: 1440,
    when: (n, p) => { const om = onMind(n, p); return om && om.kind === 'crush' && ((n.aff[p.id] || 0) >= 20 || (n.know[p.id] || 0) >= 35 || kinWord(n, p)) && !n.hopeless ? { o: om.o } : null; },
    lines: (n, p, c) => tr(n, 'shy') || tr(n, 'anxious') ? `Can I tell you something? You have to swear not to laugh. ...It is ${c.o.first}. Every time ${heShe(c.o)} walks past, I forget how to stand.` : tr(n, 'proud') ? `I am going to say this once. I have... feelings. For ${c.o.first}. There. If you repeat it I will deny everything.` : `I think I am in love with ${c.o.first}. I cannot sleep, I cannot eat, I put salt in my tea this morning.`,
    opts: (n, p, c) => [[`Tell ${himHer(c.o)} yourself`, () => tr(n, 'brave') || tr(n, 'proud') ? 'You are right. I will. Soon. Probably.' : 'I could never! I would faint. Actually faint.'], ['Your secret is safe', () => { like(n, p, 4); return 'Thank you. It feels lighter, having said it out loud.'; }]] },
  { id: 'feud', pri: 66, cool: 1440,
    when: (n, p) => { const om = onMind(n, p); return om && om.kind === 'rival' && om.o !== p ? { o: om.o, why: anyOf(['moved my fence post a whole foot', 'told everyone my fish smell', 'took the best spot by the water and will not move', 'laughed at my singing at the bonfire', 'still owes me three coins and pretends not to']) } : null; },
    lines: (n, p, c) => `Do you know what ${c.o.first} did? ${HeShe(c.o)} ${c.why}. And then smiled at me! Smiled!`,
    opts: (n, p, c) => [[`${c.o.first} was out of line`, () => { like(n, p, 8); if (c.o.aff[p.id] !== undefined || true) c.o.aff[p.id] = (c.o.aff[p.id] || 0) - 5; deed(p, `took ${n.first}'s side against ${c.o.first}`); return `Thank you! Finally someone says it.`; }],
      ['Maybe talk to each other?', () => { if (tr(n, 'proud') || tr(n, 'grumpy')) { like(n, p, -3); return `Talk? To ${himHer(c.o)}? I would rather eat a boot.`; } n.aff[c.o.id] = (n.aff[c.o.id] || 0) + 12; return `...Maybe. Maybe I will. Do not tell ${himHer(c.o)} I said so.`; }], ['Stay out of it', () => 'Wise. Very wise.']] },

  /* --- what is happening in town --- */
  { id: 'bonfire_soon', pri: 64, cool: 0,
    when: (n, p) => town.feast && game.time < town.feast.at ? { f: town.feast } : null,
    lines: (n, p, c) => tr(n, 'anxious') || tr(n, 'grumpy') ? `A bonfire, for ${c.f.why}. Lovely. Someone will fall in it. Mark my words.` : anyOf([`Bonfire tonight for ${c.f.why}! I have been practising my dancing. Do not watch.`, `Are you coming to the bonfire? Everyone is. Even the grumpy ones pretend not to enjoy it.`]),
    opts: (n, p) => [['I will be there', () => { like(n, p, 2); return 'Good. Save me a spot near the fire.'; }], ['I might skip it', () => tr(n, 'sociable') || tr(n, 'jovial') ? 'Skip it? Nobody skips it!' : 'Suit yourself.']] },
  { id: 'after_bonfire', pri: 50, cool: 0,
    when: (n, p) => { const m = (n.mem || []).find(m => m.kind === 'feast' && recently(m.t, 0.8)); return m ? { m } : null; },
    lines: (n, p) => anyOf([`My feet. My poor feet. Was it a good night or was I just tired? It was a good night.`, `Did you see ${(npcs.find(o => o !== n && o !== p && o.age >= 16 && (o.traits.includes('jovial') || o.traits.includes('sociable'))) || n).first} dancing? I will never unsee it. Never.`]),
    opts: (n, p) => [['Best night in ages', () => { like(n, p, 2); return 'It was, was it not? We should have more of them.'; }], ['I left early', () => 'You missed the best part! There was a goose.']] },
  { id: 'need_timber', pri: 56, cool: 900,
    when: (n, p) => { const s = town.sites.find(s => s.slots && s.slots.some(q => !q.built)); return s && (p.inv.wood || p.inv.stone) && !(s.owners || []).includes(n.id) ? { s, k: p.inv.wood ? 'wood' : 'stone' } : null; },
    lines: (n, p, c) => `Is that ${c.k === 'wood' ? 'timber' : 'stone'} for ${siteName(c.s)}? Good. They are ${siteRem(c.s, c.k)} short${c.s.kind === 'house' ? ' and nobody can sleep in half a house' : c.s.kind === 'church' ? ' and the chapel will not build itself' : ''}.`,
    opts: (n, p) => [['That is the plan', () => { like(n, p, 2); return 'Good. Throw it on the walls, anywhere it fits.'; }], ['Just carrying it about', () => tr(n, 'grumpy') ? 'Hmph. Carry it somewhere useful.' : 'Ha. Each to their own.']] },
  { id: 'food_short', pri: 54, cool: 1440,
    when: (n, p) => foodDaysNow() < 1.4 && n.age >= 14 ? {} : null,
    lines: (n, p) => tr(n, 'anxious') ? `Have you looked in the pantries? I have. Everyone's. We have a day of food, maybe two. I have not slept.` : anyOf([`Food is thin. If the fields do not come in soon, we will be eating bark soup.`, `Remember ${lore().hard}? I do. I do not want another one.`]),
    opts: (n, p) => [['I will fish and forage', () => { like(n, p, 3); return 'Good. Every mouthful counts.'; }], ['We will get through it', () => tr(n, 'anxious') ? 'You do not know that.' : 'We always have.']] },
  { id: 'new_chapel', pri: 60, cool: 0,
    when: (n, p) => town.church && (town.chron || []).some(c => /Weddings and funerals can be held/.test(c.text) && recently(c.time, 1.5)) ? {} : null,
    lines: (n, p) => tr(n, 'devout') ? `Have you been inside the chapel yet? The light through the door in the morning... I cried. Do not tell anyone I cried.` : tr(n, 'grumpy') || tr(n, 'greedy') ? `All that stone and not a single new bed. Still. It is handsome. I will give it that.` : `A real chapel. Now we can marry and bury properly. Funny how the same building does both.`,
    opts: (n, p) => [['It is beautiful', () => tr(n, 'devout') ? (like(n, p, 5), 'It is. Come with me one morning.') : 'It will do.'], ['It was a lot of stone', () => tr(n, 'grumpy') ? (like(n, p, 4), 'Thank you!') : 'Worth every block.']] },
  { id: 'rest_day', pri: 45, cool: 1440,
    when: (n, p) => isRestDay() && n.age >= 12 ? { h: hobbyOf(n) } : null,
    lines: (n, p, c) => ({ fishing: `No work this afternoon. I am going fishing, and I am not coming back until I catch something or it gets dark.`, foraging: `Rest day! I am going berry picking. Not for the pantry. For me.`, walking: `I am going to walk until I find somewhere I have never been. There is always somewhere.`, whittling: `Rest day. I am going to finish my little fox. The tail has defeated me twice.`, singing: `I have a new song. Rest days are for singing. Do you want to hear it? You do. You will.`, stargazing: `Tonight the sky should be clear. Rest days are good for staying up.` })[c.h],
    opts: (n, p, c) => [['Can I come?', () => { tagAlong(n, p, 150, `Out with ${p.first}`); like(n, p, 5); addMem(n, 'outing', `the rest day ${p.first} came along`, 'that rest day we spent together', p.id); return 'Course you can! Lead on, I will follow.'; }], ['Enjoy it', () => 'I will!']] },
  { id: 'lazy_caught', pri: 48, cool: 1440,
    when: (n, p) => tr(n, 'lazy') && n.role === 'Worker' && working(n, game.time % 1440) ? {} : null,
    lines: (n, p) => anyOf([`Shh. If anyone asks, I am inspecting this tree. Very thoroughly. From the shade.`, `I am not resting. I am thinking about working. It is the first step.`]),
    opts: (n, p) => [['Your secret is safe', () => { like(n, p, 4); return 'A friend for life.'; }], ['Get back to work!', () => { like(n, p, -2); return 'You sound like my mother.'; }]] },

  /* --- the town's own history --- */
  { id: 'legend', pri: 42, cool: 0,
    when: (n, p) => n.age >= 10 && (believes(n) || tr(n, 'gossipy')) ? { L: lore().legend } : null,
    lines: (n, p, c) => believes(n) ? anyOf([`Do you know what they say? They say ${c.L.tale}. I believe it. I have felt it.`, `Promise you will not laugh. People say ${c.L.tale}. I used to laugh too. Not any more.`, `My grandmother told me ${c.L.tale}. She was never wrong about anything else.`]) : anyOf([`Have you heard the nonsense about ${c.L.thing}? People say ${c.L.tale}. People will say anything.`, `If one more person tells me ${c.L.tale}, I will scream. It is a story to scare children.`]),
    opts: (n, p, c) => [['I believe it too', () => { if (believes(n)) like(n, p, 5); else like(n, p, -1); return believes(n) ? 'I knew you were one of the sensible ones.' : 'Oh, not you as well.'; }], ['Sounds like a story', () => { if (!believes(n)) like(n, p, 4); return believes(n) ? 'Laugh all you like. Go and see for yourself one night.' : 'That is exactly what it is.'; }]] },
  { id: 'founder', pri: 46, cool: 0,
    when: (n, p) => n.age >= 50 ? { L: lore() } : null,
    lines: (n, p, c) => `When we first came here, it was ${c.L.founder} who said, we stop here. Nothing but trees and that water. We survived ${c.L.hard} on stubbornness alone. And now look. Chimneys.`,
    opts: (n, p, c) => [['Tell me more', () => { like(n, p, 5); return `${c.L.founder} lost ${c.L.lost} that first winter. Searched for weeks. Never found it. Some say it is still out there.`; }], ['You must be proud', () => { like(n, p, 3); return 'Proud and tired. Mostly tired.'; }]] },
  { id: 'dream', pri: 38, cool: 0,
    when: (n, p) => n.age >= 14 && (tr(n, 'dreamy') || tr(n, 'curious') || tr(n, 'brave') || tr(n, 'proud')) ? { h: lore().hope } : null,
    lines: (n, p, c) => `Do you know what this town needs? ${c.h.charAt(0).toUpperCase() + c.h.slice(1)}. I think about it every day. One day.`,
    opts: (n, p) => [['One day', () => { like(n, p, 4); return 'You understand. Not everyone does.'; }], ['Bread first, dreams later', () => tr(n, 'proud') ? 'Small thinking builds small towns.' : 'Ha. Fair.']] },

  /* --- what people have heard about you --- */
  { id: 'heard', pri: 52, cool: 1440,
    when: (n, p) => { const d = (town.deeds || []).filter(d => d.p === p.id && recently(d.t, 4) && !(n.heard || {})[d.t]).slice(-1)[0]; return d && ((n.know[p.id] || 0) >= 10 || tr(n, 'gossipy')) ? { d } : null; },
    lines: (n, p, c) => { (n.heard = n.heard || {})[c.d.t] = 1; return /took .* side/.test(c.d.text) && !tr(n, 'gossipy') ? `I heard you ${c.d.text}. Careful. This is a small town, and feuds have long memories.` : tr(n, 'grumpy') ? `So. You ${c.d.text}. Everyone is talking about it. I suppose you think you are a saint now.` : `I heard you ${c.d.text}. That was good of you, ${p.first}.`; },
    opts: (n, p) => [['Word travels fast', () => tr(n, 'gossipy') ? 'Only if you know who to ask. I always know who to ask.' : 'It is a small town.'], ['It was nothing', () => { like(n, p, 3); return 'It is never nothing.'; }]] },

  /* --- getting to know someone --- */
  { id: 'meet', pri: 44, cool: 0,
    when: (n, p) => (n.know[p.id] || 0) < 12 && n.age >= 6 ? {} : null,
    lines: (n, p) => `${n.age < 16 ? 'Hello! ' : ''}I do not think we have properly met. I am ${n.first}. ` + (n.age < 16 ? `I am ${n.age}. Nearly ${n.age + 1}.` : (TRAIT_SELF[n.traits[0]] || '')),
    opts: (n, p) => [[`I am ${p.first}`, () => { bumpKnow(n, p, 12); like(n, p, 3); return anyOf([`Good to meet you, ${p.first}. Properly, I mean.`, `${p.first}. I will remember that. I am good with names. Faces, less so.`]); }], ['Nice to meet you', () => { bumpKnow(n, p, 8); return 'And you.'; }]] },
  { id: 'quirk', pri: 34, cool: 0,
    when: (n, p) => (n.know[p.id] || 0) >= 30 && n.age >= 10 ? {} : null,
    lines: (n, p) => quirkLine(n),
    opts: (n, p) => [['Your secret is safe with me', () => { like(n, p, 5); n.toldSecret = n.toldSecret || {}; n.toldSecret[p.id] = true; return 'I know. That is why I told you.'; }], ['That is a bit odd', () => tr(n, 'proud') ? (like(n, p, -3), 'Then forget I said it.') : (like(n, p, 1), 'I know! I cannot help it.')]] }
];
const QUIRK_LINES = {
  'hums while working and does not notice': `Somebody told me I hum when I work. I do not hum. Do I hum? ...Do not answer that.`,
  'is afraid of geese': `Did you see a goose by the water? A big one? Do not laugh. They have teeth. In their tongues. I have seen them.`,
  'is saving rope to build a boat and leave one day': `Can I tell you something? I have a pile of rope under my bed. One day I am going to build a boat and see what is past the horizon. Not yet. One day.`,
  'writes poems nobody has read': `I write poems. Bad ones, probably. Nobody has read them. Maybe one day I will let someone.`,
  'secretly feeds the stray cats': `If you see a ginger cat by the woodpile, do not shoo it. That is Pudding. I may have been feeding Pudding. For a year.`,
  'claims to have once seen a dragon': `I saw a dragon once. Do not look at me like that. Over the hills, before we came here. Big as a barn. Nobody believes me.`,
  'collects odd stones': `Look at this stone. No, really look. See the little line? I have forty-three of them. Forty-four now.`,
  'talks to the weather': `I talk to the weather. Do not laugh. I asked the rain to hold off yesterday and it did. Mostly.`,
  'never forgets a face or a debt': `I never forget a face. Or a debt. ${anyOf(['You do not owe me anything. Yet.', 'Remember that.'])}`,
  'cannot cook but keeps trying': `I tried to bake bread yesterday. It came out as a brick. A warm brick. I am trying again tonight.`,
  'keeps a diary of everyone\'s habits': `I keep a little book. Who goes where, who eats what. Not for anything bad! I just like knowing. You get up early, by the way.`,
  'swears they can predict rain by their knee': `My knee says rain tomorrow. It has never been wrong. Well. Twice. Three times.`,
  'has a lucky pebble they never let go of': `See this pebble? Lucky. Never put it down, never will. The day I put it down, the luck goes. Everyone knows that.`,
  'sings terribly and loudly': `I am going to sing at the next bonfire. People say I should not. People are jealous.`,
  'is certain the well is haunted': `I will not drink from the well after dark. Something down there hums. You think I am mad. I am not mad.`,
  'dreams of owning a boat': `One day I will have a boat. A little one, with a red sail. I will name it after my mother. Do not laugh.`
};
function quirkLine(n) { return QUIRK_LINES[n.quirk] || `Not many people know this, but ${firstPerson(n.quirk)}.`; }


/* brush-offs: when there is nothing worth saying */
function brushOff(n, p) {
  if (typeof topicalBark === 'function' && Math.random() < 0.65) { const tb = topicalBark(n, p); if (tb) return tb; }
  const s = n.plan && n.plan[n.si], act = s && s.act, k = n.know[p.id] || 0, a = n.aff[p.id] || 0, kw = kinWord(n, p);
  if (n.age < 7) return anyOf(['Hi!', '*giggles and runs off*', 'I am playing!', 'Look, a beetle!']);
  if (act === 'eat') return anyOf(['Mmf. Eating.', 'Can it wait till I have finished?']);
  if (act === 'work') return anyOf({ Woodcutter: ['Can not stop, this tree is half down.', 'Mind your toes.'], Stonecutter: ['Stand back, chips fly.', 'Busy.'], Fisher: ['Shh! You will scare them.', 'Not now, something is biting.'], Farmer: ['These rows will not dig themselves.', 'Busy, busy.'], Gatherer: ['Berries wait for nobody.', 'Busy!'] }[n.cur] || ['Busy, sorry.', 'Later!']);
  if (n.pose === 'sit' || /Praying|prayers/.test(n.status || '')) return anyOf(['*nods quietly*', 'Shh.']);
  if (kw === 'husband' || kw === 'wife') return anyOf(['Love you. Now shoo.', 'Supper soon.', '*squeezes your hand*']);
  if (kw === 'mother' || kw === 'father') return anyOf(['Did you wash your hands?', 'Off you go, love.', 'Have you eaten?']);
  if (a < -15) return anyOf(['What.', 'Not now.', '*looks straight through you*']);
  if (k < 10) return anyOf(['Hello.', '*nods politely*', 'Morning.']);
  if (tr(n, 'grumpy')) return anyOf(['Hmph.', 'What now?', 'Not today.']);
  if (tr(n, 'shy')) return anyOf(['*smiles and looks away*', 'Oh, um, hello.']);
  if (tr(n, 'jovial') || tr(n, 'cheerful')) return anyOf(['Lovely day for it!', `${p.first}! Ha! Good to see you.`, 'Cannot stop, but hello!']);
  return anyOf([`Hello, ${p.first}.`, 'All right?', 'Can not stop, sorry.', 'Fine day.']);
}

/* ---------- choosing and playing a scene ---------- */
function talkStep(key) {
  const S = talkS; if (!S) return null;
  if (key === 'lf2more') return lf2SocialMenu();
  if (S.custom) return lf2TalkStep(key);
  if (key === 'bye') return null;
  const i = +key.slice(1), fn = S.fns && S.fns[i]; if (!fn) return { say: '', opts: [['bye', 'Leave']] };
  let say = ''; try { say = fn() || ''; } catch (e) { say = '...'; }
  S.fns = null; bumpAff(S.n, S.p, 1, 6);
  if (!say) return { close: true };
  return { say, opts: [['bye', anyOf(['Goodbye', 'See you around', 'Take care', 'Leave'])]] };
}

const MD = p => p.female ? 'Mum' : 'Dad';
const FAMILY_BITS = {
  spouse: [
    { say: () => `Supper is at six. Do not be late, or I am giving yours to the dog. We do not have a dog. I will get one.`, opts: (n, p) => [['I will be there', () => { like(n, p, 3); return 'Good. I am making your favourite. Do not ask what it is, it is a surprise. It is stew.'; }], ['Get the dog', () => 'Do not tempt me.']] },
    { say: (n, p) => `I was thinking about the day we met. You were ${anyOf(['covered in mud', 'arguing with a goose', 'so very serious'])}. You still are.`, opts: (n, p) => [['I love you', () => { like(n, p, 4); return 'I know. Go on, get out of here before I get soppy.'; }], ['You were worse', () => 'I was charming. Everyone said so.']] },
    { say: () => `You were up before the birds again. Come home early tonight. Please. I miss you, and you are right here.`, opts: (n, p) => [['I will come home early', () => { like(n, p, 4); return 'Promise. Say it properly.'; }], ['There is so much to do', () => 'There always is. That is why I am asking.']] }
  ],
  kid: [
    { say: (n, p) => `${MD(p)}! Can we go fishing? You said. You SAID.`, opts: (n, p) => [['Come on then', () => { tagAlong(n, p, 200, `Following ${MD(p)}`); like(n, p, 6); addMem(n, 'outing', `the day ${MD(p)} took me along`, 'when you took me along with you', p.id); return 'YAY! Wait for me!'; }], ['Not today', () => 'You always say that.']] },
    { say: (n, p) => `${MD(p)}, look how tall I am! Taller than yesterday! Measure me!`, opts: (n, p) => [['Look at you!', () => { like(n, p, 4); return 'I am going to be taller than you. Taller than the chapel.'; }], ['Same as yesterday', () => 'NO. Look again. On my toes.']] },
    { say: (n, p) => `${MD(p)}, are we poor? Bertie said we were poor.`, opts: (n, p) => [['We have each other', () => { like(n, p, 4); return 'That is what poor people say. ...It is nice, though.'; }], ['Bertie talks too much', () => 'That is what I said! Then he pushed me in a puddle.']] },
    { say: (n, p) => `${MD(p)}, I found a frog and I named him after you. Is that all right?`, opts: (n, p) => [['I am honoured', () => { like(n, p, 4); return 'He is very handsome. Like you. Mostly.'; }], ['Put the frog back', () => 'He likes me though!']] }
  ],
  parent: [
    { say: () => `Have you been eating? You look thin. You always look thin.`, opts: (n, p) => [['I am fine', () => 'You always say that. Take some bread.'], ['Not really', () => { like(n, p, 3); return 'I knew it. Come by tonight. I will feed you up.'; }]] },
    { say: () => `You never visit. I know, I know. You are busy. Busy, busy, busy.`, opts: (n, p) => [['I will come tonight', () => { like(n, p, 5); return 'I will believe it when I see it. ...Bring an appetite.'; }], ['I am here now', () => { like(n, p, 2); return 'So you are. Let me look at you.'; }]] },
    { say: (n, p) => `I watched you working today. You have your ${anyOf(['grandfather\'s', 'grandmother\'s'])} hands. Steady. I was proud.`, opts: (n, p) => [['Thank you', () => { like(n, p, 4); return 'Do not let it go to your head.'; }], ['I learned from you', () => { like(n, p, 6); return 'Oh, stop. ...Say it again.'; }]] }
  ]
};
