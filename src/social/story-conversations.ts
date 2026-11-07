/* ================= Story: relationship labels and biographies ================= */
const CRUSH_ITEM = { Stonecutter: 'a polished pebble', Builder: 'a carved spoon', Priest: 'a blessing', Barkeep: 'a free drink', Woodcutter: 'kindling', Fisher: 'a perch', Gatherer: 'a handful of berries', Farmer: 'turnips', Trader: 'a trinket', Elder: 'a blessing', Child: 'a pretty stone' };
function relLabel(n, o) {
  const r = n.rel[o.id];
  if (r === 'parent') return `parent of ${o.first}`;
  if (r === 'child') return `child of ${o.first}`;
  if (r === 'spouse') return `married to ${o.first}`;
  if (r === 'partner') return `courting ${o.first}`;
  if (r === 'sibling') return `sibling of ${o.first}`;
  if (r === 'friend') return `friends with ${o.first}`;
  if (r === 'rival') return `at odds with ${o.first}`;
  return null;
}
const lifeStage = n => n.age < 3 ? 'Baby' : n.age < 16 ? 'Child' : n.age >= 60 ? 'Elder' : 'Adult';
const roleLabel = n => n.role === 'Worker' ? 'worker' + (n.cur ? ' (' + ({ Woodcutter: 'timber', Stonecutter: 'stone', Fisher: 'fishing', Farmer: 'farming', Gatherer: 'foraging', Builder: 'building' }[n.cur] || n.cur.toLowerCase()) + ')' : '') : n.role === 'Trader' ? 'larder-keeper' : n.role.toLowerCase();
function bioOf(n) {
  const lines = [];
  const job = n.role === 'Child' ? (n.age < 3 ? 'baby' : 'child') : roleLabel(n);
  lines.push(`${n.age} years old, ${job}. ${n.traits.map(t => t[0].toUpperCase() + t.slice(1)).join(', ')}.`);
  const rels = npcs.filter(o => o !== n).map(o => relLabel(n, o)).filter(Boolean);
  if (n.preg) rels.push('expecting a baby');
  if (rels.length) lines.push(rels.slice(0, 8).join('; ') + '.');
  lines.push(`${n.first} ${n.quirk}.`);
  return lines;
}

/* ================= Conversations ================= */
const jobKey = n => n.role === 'Worker' ? (n.cur || 'Gatherer') : n.role;
const ROLE_TALK = {
  Stonecutter: ['My hands are more rock than hand by now.', 'That outcrop is half the size it was last week.', 'Every block of the chapel passed through these fingers.', 'The good stone is always one tree further in.'],
  Priest: ['The chapel is open to everyone, even the ones who only come for the roof.', 'Everyone is welcome to be married or buried here, though not both at once.', 'I have said a good many words over this town.', 'Stone by stone, the faith gets built too.'],
  Barkeep: ['The first round is never free, but the second is cheaper.', 'I hear everything and I repeat nothing. Mostly.', 'The tavern is only as good as its regulars.', 'Pull up a stool, everyone has a story.'],
  Woodcutter: ['Felled a good oak today. The clearing grows.', 'The axe needs honing again.', 'Every tree I take is a little more room for somebody\'s house.', 'The forest does not give up easily.'],
  Fisher: ['Caught a pike as long as my arm.', 'The water is cold but they are biting.', 'The pond gives what it gives, and no more.', 'There is a hole in my net and I cannot find it.'],
  Gatherer: ['Found a patch of berries by the old stump.', 'The bushes grow back, but only if you leave some.', 'I know where every herb in this forest hides.', 'Do not eat the red ones. Just do not.'],
  Farmer: ['The soil is heavy this week.', 'I think the grain will come in early.', 'Crows got into the east rows again.', 'One more dry week and I will be hauling water by hand.'],
  Trader: ['Take what you need, leave what you can. That is the whole rule.', 'Somebody left eleven fish this morning. ELEVEN.', 'The larder is full. I could feed the gulls. I will not feed the gulls.', 'Mind the berries, they bruise.'],
  Elder: ['When I was young this was all trees.', 'I remember every one of you being born.', 'My knees say rain. My knees are never wrong.', 'Sit down, sit down. The square is for sitting.'],
  Child: ['I found an enormous beetle!', 'Can I touch the well bucket?', 'Race you to the lamp post!', 'When I grow up I will build the biggest house.']
};
const GENERIC_REPLY = ['Is that so?', 'Hm. Sounds about right.', 'You always have something to say about that.', 'Better you than me.', 'I will keep an eye out.', 'Glad to hear it.', 'Same story here.'];
const REACT = { brave: 'Somebody ought to do something about it.', anxious: 'I have not slept properly since.', grumpy: 'Nothing good ever happens here.', cheerful: 'It will sort itself out, mark my words.',
  devout: 'I have said a prayer for it.', gossipy: 'I heard even more than that, you know.', curious: 'I would like to get to the bottom of it.', shy: 'I would rather not think about it.', lazy: 'Wake me when it is solved.' };
const GOSSIP = ['has been seen walking out past the stones at dusk', 'bought twice the usual bread this week', 'has been humming for days', 'has been avoiding the plaza lately', 'keeps looking over their shoulder'];
const TIME_GREET = {
  morning: [['Morning, {b}.', 'Morning. Not nearly enough sleep.'], ['Up early, {b}?', 'The birds woke me. Cursed things.'], ['Good morning, {b}. Sleep well?', 'Like a log. You?']],
  day: [['Afternoon, {b}.', 'Is it? Feels like it has been all day.'], ['Hello, {b}. Busy?', 'Always. You?'], ['{b}! Fine day.', 'It will do.']],
  evening: [['Evening, {b}. Long day?', 'Feels like three days in one.'], ['{b}, you look tired.', 'I am tired. Good tired, mostly.'], ['Almost time to rest, {b}.', 'Not soon enough.']],
  night: [['Still up, {b}?', 'Could say the same about you.'], ['Quiet night, {b}.', 'I like it. Fewer people.'], ['Mind the dark roads, {b}.', 'I know them blind.']]
};
const FLAVOR = { grumpy: t => 'Hmph. ' + t.replace(/!/g, '.'), shy: t => 'Um... ' + t, jovial: t => t + ' Ha!', cheerful: t => t.replace(/\.$/, '!'), anxious: t => t.replace(/\.$/, '...'), proud: t => t };

function todBand(m) { const h = (m % 1440) / 60; return h < 5 ? 'night' : h < 11 ? 'morning' : h < 17 ? 'day' : h < 22 ? 'evening' : 'night'; }
function placeOf(n) {
  const ri2 = roomAt[Math.round(n.y)] && roomAt[Math.round(n.y)][Math.round(n.x)];
  if (ri2 >= 0) return rooms[ri2].name;
  const g = grid[Math.round(n.y)][Math.round(n.x)];
  if (g === T.CROP) return 'the fields';
  if (town.markets.some(m => m.plaza.some(p => p.x === Math.round(n.x) && p.y === Math.round(n.y)))) return 'the plaza';
  return 'the lanes';
}
const fmt = (s, c) => s.replace(/\{(\w+)\}/g, (_, k) => (c[k] !== undefined ? c[k] : ''));

function makeConvo(a, b, c) {
  const rel = a.rel[b.id] || b.rel[a.id], third = c.third, tr = c.trouble;
  const ctx = { a: a.first, b: b.first, third: third ? third.first : 'someone', trouble: tr ? tr.short : 'the weather', place: c.place, quirk: third ? third.quirk : '' };
  const options = [];
  const kids = !a.adult && !b.adult;
  // greeting always possible
  options.push([2, () => pick(Math.random, TIME_GREET[c.band])]);
  options.push([2.5, () => {
    const l1 = pick(Math.random, ROLE_TALK[jobKey(a)] || ROLE_TALK.Gatherer);
    if (jobKey(a) === jobKey(b)) return [l1, 'Tell me about it. Mine is just the same.'];
    if (b.adult && Math.random() < .5) return [l1, pick(Math.random, ROLE_TALK[jobKey(b)] || ROLE_TALK.Gatherer)];
    return [l1, pick(Math.random, GENERIC_REPLY)];
  }]);
  if (tr) options.push([3 + (a.traits.includes('gossipy') ? 2 : 0), () => {
    const rc = REACT[(b.traits.find(t => REACT[t])) || 'x'] || 'Strange times.';
    return pick(Math.random, [
      [`Did you hear about ${tr.short}?`, `Everyone is talking about it. ${rc}`, 'Let us hope it passes.'],
      [`What do you make of ${tr.short}?`, `${rc} Why, what have you heard?`],
      [`I cannot stop thinking about ${tr.short}.`, rc, 'Same here, if I am honest.'],
      [`They say ${tr.short} will be dealt with soon.`, 'They say a great many things.']]);
  }]);
  if (third && third !== a && third !== b && a.adult) options.push([2 + (a.traits.includes('gossipy') ? 3 : 0), () => chance(Math.random, .5) ? [`Did you know ${third.first} ${third.quirk}?`, `${third.first}? Never would have guessed.`, `Keep it to yourself.`] : [`${third.first} ${pick(Math.random, GOSSIP)}.`, `That is not like ${third.first}.`, `That is what I said.`]]);
  if (c.place === 'the plaza' || c.band === 'day') options.push([1, () => ['Looks like rain, does it not?', 'My knee says otherwise.']]);
  if (/Flagon|Goose|Lantern|Anchor|Stag|Barrel|Heron|Plough|Crown|Kettle/.test(c.place)) options.push([3, () => pick(Math.random, [['The stew here beats mine, and I will deny I said it.', 'Your secret is safe. Pass the bread.'], ['Another round?', 'One more, then home.'], ['Hear anything interesting today?', 'Only what you have just told me.']])]);
  if (/Chapel/.test(c.place)) options.push([4, () => pick(Math.random, [['Peace be with you, {b}.', 'And with you.'], ['Do you think the bells really rang at midnight?', 'I try not to think about it in here.']])]);
  if (kids) options.push([6, () => pick(Math.random, [['Tag! You are it!', 'No fair, you cheated!'], ['Look, a frog!', 'Put it back, it is scared.'], ['Bet I can jump the whole puddle.', 'Bet you cannot.']])]);
  if (rel === 'spouse') options.push([5, () => pick(Math.random, [['Do not forget the roof needs patching.', 'I will not. Did you eat?'], ['Long day?', 'Longer without you. Do not tell anyone I said that.'], ['Anything you need from the lane?', 'Just you home before dark.']])]);
  if (rel === 'sibling') options.push([4, () => pick(Math.random, [['You still owe me a fish.', 'I gave you two at the harvest!'], ['Mother would have laughed at that.', 'She would not. But I will pretend.']])]);
  if (rel === 'parent') options.push([5, () => [pick(Math.random, ['Back before dark, understand?', 'Have you eaten properly?', 'Mind the well.']), pick(Math.random, ['Yes, yes.', 'Just a little longer?', 'I am not a baby!'])]]);
  if (rel === 'child') options.push([5, () => [pick(Math.random, ['Can I stay out a little longer?', 'Look what I found!', 'Is it nearly supper?']), pick(Math.random, ['Not a minute past dusk.', 'Very nice. Wash it first.', 'Soon enough.'])]]);
  if (rel === 'friend') options.push([4, () => pick(Math.random, [['Same as ever, {b}?', 'Same as ever. That is the good part.'], ['We should do something about that dull week.', 'Such as?'], ['Save me a seat later?', 'Always.']])]);
  if (rel === 'rival') options.push([5, () => [`${b.first}.`, `${a.first}.`, pick(Math.random, [`Still nothing to say about ${town.rival ? town.rival.why : 'that'}?`, 'Hm.']), 'Plenty. Not here.']]);
  if (rel === 'crush') options.push([7, () => [`Oh! Hello, ${b.first}. I, er... I have ${CRUSH_ITEM[jobKey(a)] || 'something'} if you want it.`, town.crush && town.crush.returned ? `That is kind of you, ${a.first}. Maybe I will stop by later.` : `Oh, thank you, ${a.first}. You are always so thoughtful.`, town.crush && town.crush.returned ? '...I would like that.' : null].filter(Boolean)]);
  // shared memories and stories
  { const shared = typeof memWith === 'function' ? memWith(a, b) : [];
    if (shared.length) options.push([6, () => { const m = pick(Math.random, shared); return [`Remember ${m.we}?`, pick(Math.random, MEM_REPLY[m.kind] || MEM_REPLY.x)]; }]);
    const own = (a.mem || []).filter(m => m.w !== b.id && game.time - m.t < 6 * YEAR);
    if (own.length && a.age >= 5) options.push([2.5, () => { const m = pick(Math.random, own); return m.kind === 'loss' ? [`I keep thinking about ${m.me}.`, pick(Math.random, MEM_REPLY.loss)] : [`I keep thinking about ${m.me}.`, pick(Math.random, ['That sounds like a good day.', 'You never told me that before.', 'Hold on to that one.'])]; }]);
    if (isRestDay() && a.age >= 16) options.push([2, () => pick(Math.random, [['No axes today. Feels strange.', 'Feels wonderful, you mean.'], ['What are you doing with the rest day?', 'As little as I can manage.'], ['Going to the water later?', 'If the little ones let me.']])]);
    if (a.hobby && a.age >= 12) options.push([1.5, () => [{ fishing: 'I know a spot where the fish practically jump into your hands.', foraging: 'The best berries are past the old stones. Do not tell anyone.', walking: 'I walked all the way to the far trees yesterday.', whittling: 'I am carving a little fox. The tail is the hard part.', singing: 'I have a new song. Want to hear it?', stargazing: 'Did you see the stars last night? Like spilled salt.' }[a.hobby], pick(Math.random, ['You and your ' + HOBBY_TXT[a.hobby] + '.', 'Show me sometime.', 'Is that so?'])]]);
  }
  // life in a growing town
  {
    const recent = (town.chron || []).filter(c => game.time - c.time < 2 * 1440 && ['life', 'love', 'death', 'build'].includes(c.kind));
    if (recent.length && a.age >= 16) options.push([3.5, () => { const c = pick(Math.random, recent); const rk = { death: ['It is a sad business.', 'We will all miss them.'], love: ['That is lovely news.', 'About time, I say.'], life: ['That is good news for the town.', 'Another pair of hands, one day.'], build: ['Good. We need the room.', 'More timber, more work. Still.'] }[c.kind]; return [`Have you heard? ${c.text}`, pick(Math.random, rk)]; }]);
    if (a.role === 'Elder') options.push([3, () => pick(Math.random, [['In my day we had one house and a rumour of a well.', 'And now look at us.'], ['I buried a lot of good people on that hill.', 'And we are still here because of them.'], ['Mind the little ones, ' + b.first + '. They are the whole point.', 'I will. I do.']])]);
    if (rel === 'partner') options.push([8, () => pick(Math.random, [[`I was hoping to see you today, ${b.first}.`, 'You always find me. I do not mind.'], ['I brought you something. A pretty stone, nothing more.', 'It is the nicest nothing I have ever been given.'], ['Do you think we will build somewhere near the pond?', `If you will help me with the roof, ${a.first}. Yes.`], ['I told my mother about you.', 'And what did she say?', 'She said she knew already.']])]);
    if (!a.adult && b.adult && town.births > 0) options.push([1.5, () => ['When I am big I will build my own house.', 'You will need a lot of timber for that.']]);
  }
  // larder talk: grounded in what is actually happening on the island
  {
    const pi = town.pondInfo, fp = marketPrice('fish'), gp = marketPrice('grain'), bp = marketPrice('bread');

    if (a.age >= 16 && a.hunger > 60) options.push([4, () => ['I have not eaten since morning.', 'Then go and eat. Do not stand here talking.']]);
    if (pi && fp && a.adult) options.push([2.5, () => pi.stock < pi.cap * .35 ? ['The pond looks fished out.', 'Give it a few days and it will recover.'] : ['The larder is full of fish again.', 'Good. I am sick of berries.']]);
  }
  const tot = options.reduce((s, o) => s + o[0], 0); let r = Math.random() * tot, f = options[0];
  for (const o of options) { r -= o[0]; if (r < 0) { f = o; break; } }
  const raw = f[1]().filter(Boolean);
  return raw.map((t, i) => {
    const who = i % 2 === 0 ? a : b; let text = fmt(t, i % 2 === 0 ? ctx : Object.assign({}, ctx, { a: b.first, b: a.first }));
    const trait = who.traits.find(x => FLAVOR[x]);
    if (trait && Math.random() < .3) text = FLAVOR[trait](text);
    return { who, text };
  });
}

/* ---------- trigger ---------- */
const pairCool = new Map();
function compat(a, b) { let c = 0; a.traits.forEach(t => { if (b.traits.includes(t)) c += 1; }); TRAIT_CLASH.forEach(([x, y]) => { if ((a.traits.includes(x) && b.traits.includes(y)) || (a.traits.includes(y) && b.traits.includes(x))) c -= 2.5; }); return c; }
function bumpKnow(a, b, v) { a.know[b.id] = Math.min(100, (a.know[b.id] || 0) + v); b.know[a.id] = Math.min(100, (b.know[a.id] || 0) + v); }
function relabel(a, b) {
  if (['spouse', 'partner', 'parent', 'child', 'sibling'].includes(a.rel[b.id])) return;
  const af = a.aff[b.id] || 0, k = a.know[b.id] || 0;
  a.rel[b.id] = af >= 40 && k >= 30 ? 'friend' : af <= -25 ? 'rival' : (a.rel[b.id] === 'friend' && af >= 25 ? 'friend' : null);
  if (!a.rel[b.id]) delete a.rel[b.id];
}
function bumpAff(a, b, v, soc) {
  a.aff[b.id] = Math.max(-100, Math.min(100, (a.aff[b.id] || 0) + v)); b.aff[a.id] = Math.max(-100, Math.min(100, (b.aff[a.id] || 0) + v));
  bumpKnow(a, b, v > 1 ? 3 : 0.5); relabel(a, b); relabel(b, a);
  const kin = isKin(a, b) || a.fam.spouse === b.id; const s2 = soc + (kin || (a.rel[b.id] === 'friend') ? 8 : 0);
  a.social = Math.min(100, a.social + s2); b.social = Math.min(100, b.social + s2);
}
let talkClock = 0;
function tickTalk(dt) { /* conversations now start only when people bump into each other (see bumpTalk) */ }
const gmPerSec = () => (typeof state !== 'undefined' ? state.rate * state.speed : 2);
// how long a speech bubble stays up: longer lines get time to be read (about 17 letters a second)
function lineMs(t) { return Math.max(2600, 1300 + String(t || '').length * 60); }
const linesSec = lines => lines.reduce((s, l) => s + lineMs(Array.isArray(l) ? l[1] : l.text), 0) / 1000;
function faceTo(a, b) { a.face = { dx: Math.sign(b.tx - a.tx), dy: Math.abs(b.tx - a.tx) < 0.5 ? Math.sign(b.ty - a.ty) : 0 }; if (!a.face.dx && !a.face.dy) a.face = { dx: 0, dy: 1 }; }
function bumpTalk(a, b, intent) {
  if (!(a.player || b.player) && typeof focusOn === 'function' && focusOn()) return false;
  if (a.dead || b.dead || a.infant || b.infant || a.age < 3 || b.age < 3) return false;
  if (a.pose === 'sleep' || b.pose === 'sleep') return false;
  const now = game.time, key = Math.min(a.id, b.id) * 1000 + Math.max(a.id, b.id);
  const cool = pairCool.get(key) || -1e9;
  const withPlayer = a.player || b.player;
  if (cool > now && !withPlayer) {
    if (intent) { if (Math.random() < 0.5) { const band = todBand(now), g = TIME_GREET[band][Math.floor(Math.random() * 3)]; game.events.push({ time: now, a, b, place: placeOf(a), topic: 'greet', quiet: true, lines: [{ who: a, text: g[0].replace('{b}', b.first) }, { who: b, text: g[1] }] }); } }
    return false;
  }
  let p = intent || a.player || b.player ? 1 : 0.45;
  const rel = a.rel[b.id] || b.rel[a.id];
  if (rel === 'friend' || rel === 'spouse') p *= 1.5; if (rel === 'rival') p *= .6; if (rel === 'crush') p *= 1.6;
  [a, b].forEach(x => { if (x.traits.includes('shy')) p *= .65; if (x.traits.includes('sociable') || x.traits.includes('gossipy')) p *= 1.4; });
  if (a.pose === 'work' || b.pose === 'work') p *= .6;
  if (Math.random() > p) return false;
  pairCool.set(key, now + 90);
  const others = npcs.filter(o => o !== a && o !== b);
  const speaker = Math.random() < .5 ? a : b, other = speaker === a ? b : a;
  const lines = makeConvo(speaker, other, { place: placeOf(a), band: todBand(now), third: others.length ? others[Math.floor(Math.random() * others.length)] : null, trouble: town.troubles && town.troubles.length ? town.troubles[Math.floor(Math.random() * town.troubles.length)] : null });
  faceTo(a, b); faceTo(b, a);
  const dur = withPlayer ? 2 + linesSec(lines) * gmPerSec() : 5 + Math.min(6, lines.length * 1.2);
  if (!a.player) a.talkUntil = now + dur; if (!b.player) b.talkUntil = now + dur;
  bumpAff(a, b, 3 + compat(a, b), 24); bumpKnow(a, b, 4); town.talks = (town.talks || 0) + 1;
  game.events.push({ time: now, a: speaker, b: other, place: placeOf(a), topic: 'talk', quiet: false, lines });
  if (game.events.length > 300) game.events.splice(0, game.events.length - 300);
  return true;
}

