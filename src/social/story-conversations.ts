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

/** what two villagers say when they bump into each other: drawn from their lives (social2/sb-voice.ts) */
function makeConvo(a, b, c) { return sbSmallTalk(a, b, c); }

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

