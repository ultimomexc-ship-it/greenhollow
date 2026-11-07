/* ================= dialogue / cv-world: the village behind the conversations =================
   Everyone has a life beyond the player: an ambition, a regret, a pride, a fear, and sometimes a secret. People are tied to each
   other by older stories (debts, feuds, old flames, things somebody saw). The village has legends. And people remember you.

   All of it is generated once per town, from the town's seed, the first time somebody talks (so a seed always gives the same village),
   and it feeds the simulation a little (a debtor avoids their creditor; a feud sours two people), so what is said is also true.

   Facts are told in layers: 0 a hint, 1 the story, 2 what they do not usually say. cv-talk.ts decides how much they reveal.            */
const cvHashStr = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function cvRng(seed: string) { let a = cvHashStr(seed); return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** a line from an array, or the result of a function, or the string itself */
const pk = (x, ...a) => { const v = typeof x === 'function' ? x(...a) : x; return Array.isArray(v) ? anyOf(v) : v; };
const cvPick = (R, arr) => arr[Math.floor(R() * arr.length) % arr.length];
const cvCap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const cvLow = (s: string) => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
/** pronouns and the verb forms a first-person bank line needs: cvSay('{I} {have} lost {my} ring', o) -> "He has lost his ring" */
function cvPron(o) { return o.female ? { he: 'she', him: 'her', his: 'her', He: 'She' } : { he: 'he', him: 'him', his: 'his', He: 'He' }; }
function cvThird(s: string, o) { const p = cvPron(o); return s.replace(/^\{I\} /, '').replace(/\{I\}/g, p.He).replace(/\{my\}/g, p.his).replace(/\{am\}/g, 'is').replace(/\{have\}/g, 'has').replace(/\{me\}/g, p.him); }
function cvFirst(s: string) { return s.replace(/^\{(am|have)\}/, 'I {$1}').replace(/\{I\}/g, 'I').replace(/\{my\}/g, 'my').replace(/\{am\}/g, 'am').replace(/\{have\}/g, 'have').replace(/\{me\}/g, 'me'); }
const cvAdult = n => n && !n.dead && !n.infant && n.age >= 16;

/* ---------------- a life: ambition, regret, pride, fear, and maybe a secret ---------------- */
const CV_AMB: any = {
  Farmer: ['own the big field by the stream', 'grow a pumpkin the size of a goat', 'put by enough to stop dreading winter'],
  Woodcutter: ['build a house with a window that faces the sea', 'fell the oldest pine and hear it come down', 'teach somebody to swing an axe properly'],
  Stonecutter: ['carve something that outlasts the village', 'build one wall that never needs patching'],
  Fisher: ['land the great grey eel everybody swears is out there', 'own a boat with a real sail', 'see what is on the far side of the sea'],
  Gatherer: ['find a berry nobody has ever named', 'keep a herb garden of my own'],
  Baker: ['bake bread people talk about in other villages', 'be trusted with the wedding cakes'],
  Smith: ['forge one blade good enough to hang on a wall'],
  Guard: ['go a whole year without arresting anybody I like', 'be remembered as fair'],
  Cook: ['feed the whole village at one long table'],
  Priest: ['hear a confession that actually surprises me'],
  child: ['be a watchman when I grow up', 'catch a fish bigger than my arm', 'have a dog (do not tell Mum)', 'stay up all night, just once'],
  elder: ['see the little ones grown and settled', 'sit in the sun and be left alone', 'be buried near the old pine'],
  any: ['learn to read properly', 'see the whole island from the highest hill at dawn', 'be remembered for something besides my cooking', 'host the bonfire one year', 'learn to swim', 'be asked to dance', 'see this place with a second house in it'],
};
const CV_REGRET = ['{I} never learned to read', '{I} left someone behind on the mainland and never wrote', '{I} sold {my} father\'s boat for far too little', '{I} said something at {my} mother\'s funeral that cannot be taken back', '{I} was too proud to ask for help when it mattered', '{I} never told someone how {I} felt, and then it was too late', '{I} chose the safe thing every single time', '{I} laughed at somebody who was being brave, and never said sorry'];
const CV_PRIDE = ['{I} once carried a whole sheep home on {my} back', '{I} can out-walk anyone on the island', '{I} have never missed a day of work', '{I} won the dice at the harvest feast, fair and square', '{I} can tell the tide by the smell of the flats', '{I} pulled somebody out of the water once. They never said thank you; {I} did not mind', '{I} can name every bird on the island by its voice'];
const CV_FEAR = ['{am} afraid of deep water', '{am} afraid of being left alone', '{am} afraid of ending up like {my} father', '{am} afraid there is nothing past the horizon', '{am} afraid of dying before the house is finished', '{am} afraid of geese', '{am} afraid that everyone is only being polite'];
/* guilty secrets: [kind, text, how much they would hate it to get out, who it suits] */
const CV_SECRETS: any[] = [
  ['skim', '{I} {have} been taking a handful of grain from the larder every week', 0.8, n => lf2Has(n, 'greedy') || n.coin < 6],
  ['poems', '{I} {have} been writing love poems to somebody who is not {my} spouse', 0.9, n => !!(n.fam && n.fam.spouse)],
  ['ring', '{I} lost the family ring at dice and told everyone it was stolen', 0.85, n => n.age > 22],
  ['reader', '{I} cannot actually read, and {have} been bluffing for years', 0.7, n => n.age > 25],
  ['bottle', '{I} keep a bottle hidden behind the hearth and visit it more than {I} admit', 0.6, n => n.age > 25],
  ['grand', '{I} told everyone {I} came from a grand family. {I} did not', 0.6, n => true],
  ['coward', '{I} ran when the roof gave way at the chapel and left somebody underneath', 0.95, n => n.age > 22],
  ['cats', '{I} feed every stray in the village and pretend {I} dislike them', 0.25, n => lf2Has(n, 'generous') || lf2Has(n, 'grumpy')],
  ['loan', '{I} {have} been quietly lending coins to people who will never repay', 0.5, n => lf2Has(n, 'generous')],
  ['leave', '{I} plan to take the next ship out and not come back', 0.85, n => n.age < 40],
];
function cvLife(o) {
  if (o.cvLife) return o.cvLife;
  const R = cvRng((town.seed || 'x') + ':life:' + o.id), job = o.job || o.cur || o.role;
  const ambs = o.age < 14 ? CV_AMB.child : o.age >= 60 ? CV_AMB.elder : (CV_AMB[job] || []).concat(CV_AMB.any);
  const sec = o.age >= 18 && R() < 0.55 ? CV_SECRETS.filter(s => s[3](o)) : [];
  const s = sec.length ? cvPick(R, sec) : null;
  return (o.cvLife = { ambition: cvPick(R, ambs), regret: o.age >= 20 ? cvPick(R, CV_REGRET) : null, pride: cvPick(R, CV_PRIDE), fear: cvPick(R, CV_FEAR),
    secret: s ? { kind: s[0], text: s[1], sens: s[2] } : null, secretKnownBy: [] });
}

/* ---------------- the old stories that tie people together ---------------- */
const CV_DEBT_WHY = ['a new roof after the storm', 'seed grain in a bad year', 'a funeral nobody planned for', 'a boat that leaked', 'a wedding that cost more than anyone said'];
const CV_FEUD_WHY = ['a fence that moved six inches in the night', 'a goat that ate the wrong thing', 'something said at a wedding', 'who was meant to pay for the well rope', 'a borrowed axe that never came back', 'a recipe somebody swears was stolen'];
const CV_FEUD_DEEP = ['they did not come to my mother\'s funeral', 'they took the other side when it mattered', 'they laughed, and I never forgave it', 'they were right, and I could not stand it'];
const CV_FLAME_WHY = ['one summer, years ago, at the harvest', 'before either of us married', 'the winter we nearly sailed away together'];
const CV_LEGENDS: any[] = [
  { id: 'well', title: 'the well', parts: ['They say the well was dug in a single night by somebody who never asked to be paid.', 'You leave a coin on the rim for them. Nobody has ever seen a coin go, but the rim is bare by morning.', 'Some say the water tastes different when you owe somebody something. I have not tested it.'] },
  { id: 'bell', title: 'the bell under the flats', parts: ['Out on the flats, at the lowest tide, there is supposed to be a bell under the sand. A drowned chapel, they say.', 'My gran swore she heard it ring the night before the first storm. She also swore the cat was a bishop.', 'The odd thing is that every storm season somebody swears they hear it. Never the same somebody.'] },
  { id: 'rest', title: 'the rest day', parts: ['We rest every third day, and it is older than the village. Older than anyone can say.', 'The story is that the first settlers worked eleven days straight, and on the eleventh the plough walked off by itself. Since then, we rest.', 'Working on a rest day is bad luck. The last man who cut wood on one lost the axe. Not the hand: the axe.'] },
  { id: 'fire', title: 'the bonfire', parts: ['The bonfire on the square goes back to the first winter. They burned the boat they arrived in, so nobody could be tempted to leave.', 'Which is why we cheer when it catches, and why nobody likes talking about the boat.', 'Once a year somebody throws a tiny model of it on the fire. Nobody admits to making them.'] },
  { id: 'pines', title: 'the old pines', parts: ['The oldest pines past the fields were the first thing planted here, by a woman who arrived with a bag of seeds and nothing else.', 'They say she is buried under the biggest one. They also say it drops a branch on anyone who lies about it.', 'I have lain there twice. The branch missed. Make of that what you will.'] },
  { id: 'goose', title: 'the tavern goose', parts: ['The tavern is named for a goose. That is all anyone will tell you.', 'It lived in the rafters for three winters, heard everything, and was therefore allowed to stay.', 'There is a rule that nothing said under those rafters is repeated at the baths. It has never once worked.'] },
];

function cvWorld() {
  if (town.cv) return town.cv;
  const R = cvRng((town.seed || 'x') + ':world'), cv: any = town.cv = { back: [], legends: CV_LEGENDS, seen: [], day: -1 };
  const ppl = npcs.filter(n => cvAdult(n) && !n.player && n.id !== game.steer), used = new Set<number>();
  for (const o of ppl) cvLife(o);
  const free = (o) => !used.has(o.id);
  const pickPair = (pred?) => { for (let t = 0; t < 40; t++) { const a = cvPick(R, ppl), b = cvPick(R, ppl); if (a !== b && free(a) && free(b) && (!pred || pred(a, b))) return [a, b]; } return null; };
  const add = (b) => { b.id = cv.back.length + 1; b.knownBy = b.knownBy || []; cv.back.push(b); return b; };
  const target = Math.max(3, Math.round(ppl.length * 0.55));
  const kinds = ['debt', 'feud', 'flame', 'debt', 'feud', 'flame', 'debt'];
  for (let i = 0, g = 0; cv.back.length < target && g < 60; g++) {
    const kind = kinds[i % kinds.length]; i++;
    const pr = pickPair((a, b) => !isKin(a, b) && !(lf2Spouse(a) === b)); if (!pr) continue; const [a, b] = pr;
    if (kind === 'debt') { const amt = 6 + Math.floor(R() * 34); const by = add({ kind, a: a.id, b: b.id, amt, why: cvPick(R, CV_DEBT_WHY), sens: 0.5 }); a.aff[b.id] = (a.aff[b.id] || 0) - 6; b.aff[a.id] = (b.aff[a.id] || 0) - 10; used.add(a.id); by.paid = false; }
    else if (kind === 'feud') { add({ kind, a: a.id, b: b.id, why: cvPick(R, CV_FEUD_WHY), deep: cvPick(R, CV_FEUD_DEEP), sens: 0.4 }); a.aff[b.id] = (a.aff[b.id] || 0) - 25; b.aff[a.id] = (b.aff[a.id] || 0) - 25; if (typeof sbWhy === 'function') { sbWhy(a, b, -25, 'old feud'); sbWhy(b, a, -25, 'old feud'); } used.add(a.id); used.add(b.id); }
    else { const married = lf2Spouse(a) || lf2Spouse(b); add({ kind: 'flame', a: a.id, b: b.id, why: cvPick(R, CV_FLAME_WHY), sens: married ? 0.85 : 0.45 }); a.aff[b.id] = (a.aff[b.id] || 0) + 8; b.aff[a.id] = (b.aff[a.id] || 0) + 8; used.add(a.id); used.add(b.id); }
  }
  // somebody always knows more than they should: a couple of people know each secret, and a couple more know each old story
  for (const o of ppl) { const L = cvLife(o); if (!L.secret) continue; const n = Math.floor(R() * 3); for (let k = 0; k < n; k++) { const w = cvPick(R, ppl); if (w !== o && !L.secretKnownBy.includes(w.id)) L.secretKnownBy.push(w.id); } }
  for (const b of cv.back) for (let k = 0; k < 2; k++) { const w = cvPick(R, ppl); if (w.id !== b.a && w.id !== b.b && !b.knownBy.includes(w.id)) b.knownBy.push(w.id); }
  return cv;
}
const cvBackOf = (o) => cvWorld().back.filter(b => b.a === o.id || b.b === o.id);
const cvOther = (b, o) => byId(b.a === o.id ? b.b : b.a);
/* a backstory as one of its two people tells it, in layers; or as a third person who has heard of it */
function cvBackText(b, o, layer: number) {
  const A = byId(b.a), B = byId(b.b); if (!A || !B) return null;
  const me = o.id === b.a ? A : o.id === b.b ? B : null, other = me === A ? B : A, ph = cvPron(other);
  if (b.kind === 'debt') {
    if (me === A) return [`I owe ${B.first} money. Not a fortune. Enough that I cross the square to avoid ${ph.him}.`, `${b.amt} denarii, for ${b.why}. I meant to pay at harvest. Then there was another harvest.`, `${ph.He} has never once asked. That is the part I cannot stand.`][layer];
    if (me === B) return [`${A.first} and I have an arrangement. ${cvPron(A).He} knows what it is.`, `${b.amt} denarii, for ${b.why}. I do not ask. I keep count, though.`, `I would forgive it tomorrow if ${cvPron(A).he} would just look me in the eye.`][layer];
    return [`${A.first} owes ${B.first} a pile, last I heard. Do not repeat it.`, `${b.amt} denarii or thereabouts, for ${b.why}.`, `And neither of them will mention it. That is the real trouble.`][layer];
  }
  if (b.kind === 'feud') {
    if (me) return [`${other.first} and I do not speak. It is easier.`, `It started over ${b.why}. ${cvCap(ph.he)} will tell it differently.`, `It was never really about that. It was that ${b.deep}.`][layer];
    return [`${A.first} and ${B.first}? Do not seat them together.`, `It began with ${b.why}. At least, that is the version people tell.`, `Some say it was never about that at all.`][layer];
  }
  if (me) return [`${other.first} and I were close, once.`, `${cvCap(b.why)}. We never spoke about it again.`, `I still think of it more than I should. ${lf2Spouse(me) ? 'Do not breathe a word.' : 'Silly, at my age.'}`][layer];
  return [`${A.first} and ${B.first}? There was something there once.`, `${cvCap(b.why)}, I heard. Nobody ever talks about it.`, `It is not finished with either of them. You can tell from how they do not look at each other.`][layer];
}

/* ---------------- people remember you ---------------- */
function cvMem(o, p) { const m = o.cvm || (o.cvm = {}); return m[p.id] || (m[p.id] = { talks: 0, last: -1e9, topics: {}, moments: [], trust: 0, lied: {} }); }
function cvNote(o, p, kind: string, text: string) { const m = cvMem(o, p); m.moments.push({ k: kind, t: game.time, text }); if (m.moments.length > 14) m.moments.shift(); }
/** what the player has learned about the village from talking (a journal; also the currency for gossip and accusations) */
function cvKnows(p) { return p.cvK || (p.cvK = { back: {}, life: {}, legend: {} }); }
/** somebody saw you do something harmless (push a person, drag a crate): people may mention it, but it is not a crime or a rumour */
function cvSaw(actor, target, kind) {
  const cv = cvWorld(), w = npcs.filter(q => q !== actor && q !== target && !q.dead && !q.infant && q.pose !== 'sleep' && Math.abs(q.tx - actor.tx) + Math.abs(q.ty - actor.ty) <= 9).map(q => q.id);
  cv.seen.push({ t: game.time, actor: actor.id, target: target ? target.id : null, kind, w }); if (cv.seen.length > 40) cv.seen.shift();
}

/* a debtor pays when they can; a creditor who is never paid sours a little (once a day) */
LF2.tickers.push(() => {
  if (!town.cv) return; const day = Math.floor(game.time / 1440); if (town.cv.day === day) return; town.cv.day = day;
  for (const b of town.cv.back) { if (b.kind !== 'debt' || b.paid) continue; const a = byId(b.a), c = byId(b.b); if (!a || !c || a.dead || c.dead) { b.paid = true; continue; }
    if (a.coin >= b.amt + 14 && Math.random() < 0.35) { a.coin -= b.amt; c.coin = (c.coin || 0) + b.amt; b.paid = true; lfAff(a, c, 5); lfAff(c, a, 8); chron(`${a.first} paid back ${b.amt} denarii to ${c.first}.`, 'note'); }
    else if (Math.random() < 0.08) lfAff(c, a, -1); }
});
