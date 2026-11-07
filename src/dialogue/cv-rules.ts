/* ================= dialogue / cv-rules: lines chosen by the facts of the moment (experiment A) =================
   Valve-style rules: each rule says when it applies ({ tag: 'theft', relActor: 'foe', arch: 'prickly' ... }); of the rules that match,
   the most specific wins (the one with the most conditions), so a special case beats the general line without anyone having to order them.
   Tracery-style fill-ins: {actor}, {target}, {when}, {place}, {tail} ... come from the facts; #symbol# picks from a small grammar.
   Freshness is judged by the LISTENER: of the equally good lines, the one the player has heard least recently is said.              */
const cvHeard = p => p.cvHeard || (p.cvHeard = {});
/** of these lines, the one this listener heard least recently (ties at random) */
function cvFreshest(p, lines: string[]) {
  if (!p || lines.length < 2) return lines[0]; const H = cvHeard(p); let best = null, bt = Infinity;
  for (const s of lines.slice().sort(() => Math.random() - 0.5)) { const t = H[s] === undefined ? -Infinity : H[s]; if (t < bt) { bt = t; best = s; } } return best;
}
const cvMarkHeard = (p, s) => { if (p) cvHeard(p)[s] = game.time; };

/* the grammar: small pieces that recombine */
const CVG: any = {
  heard: ['Did you hear', 'Have you heard', 'You will have heard by now', 'Word is going round', 'Everyone is saying', 'I had it this morning'],
  shock: ['I nearly dropped my bread.', 'I had to sit down.', 'I have not stopped thinking about it.', 'I could hardly believe it.', 'My mouth fell open, I am not ashamed to say.'],
  laugh: ['I have not laughed so hard since the goose.', 'I laughed until I had to hold the wall.', 'It has made my whole week.', 'I am still laughing, and it was yesterday.'],
  soft: ['It made my whole day, and it was not even me.', 'There is hope for us yet.', 'It does the heart good.', 'That is the village I want to live in.'],
  wary: ['Lock your door tonight.', 'I am keeping my purse in my shoe from now on.', 'Nobody is safe, it seems.', 'I counted my spoons this morning.'],
  shrugs: ['These are the days we live in.', 'Make of it what you will.', 'I only pass it on.', 'Do with that what you like.'],
};
function cvFill(p, s: string, f: any, depth = 0): string {
  s = s.replace(/#(\w+)#/g, (_, k) => { const opts = CVG[k]; if (!opts || depth > 3) return ''; const pick = cvFreshest(p, opts); cvMarkHeard(p, pick); return cvFill(p, pick, f, depth + 1); });
  return s.replace(/\{(\w+)(\.cap)?\}/g, (_, k, cap) => { const v = f[k] === undefined || f[k] === null ? '' : String(f[k]); return cap ? cvCap(v) : v; }).replace(/\s+([.,!?])/g, '$1').replace(/ {2,}/g, ' ').trim();
}
/** the best rule for these facts (most conditions matched), then its freshest line for this listener */
function cvRule(cat: string, f: any, p): string | null {
  const rules = CV_RULES[cat] || []; let best: any[] = [], top = -1;
  for (const r of rules) { let ok = true, n = 0; for (const k in r.when) { const want = r.when[k], have = f[k]; if (Array.isArray(want) ? !want.includes(have) : typeof want === 'function' ? !want(have, f) : want !== have) { ok = false; break; } n++; }
    if (!ok) continue; if (n > top) { top = n; best = [r]; } else if (n === top) best.push(r); }
  if (!best.length) return null;
  const lines = best.flatMap(r => r.say), pick = cvFreshest(p, lines); cvMarkHeard(p, pick); return cvFill(p, pick, f);
}

/* ---------------- the facts of an event, as one person sees it ---------------- */
function cvTagGroup(ev): string {
  const k = ev.kind, t = ev.tags || [];
  if (k === 'theft' || k === 'pickpocket' || k === 'robbed' || t.includes('theft')) return 'theft';
  if (['courting', 'tryst', 'crush', 'flirt', 'jealous'].includes(k) || t.includes('romance') || t.includes('affair')) return 'romance';
  if (k === 'smelly' || t.includes('smelly')) return 'smell'; if (k === 'dice' || t.includes('gamble')) return 'gamble';
  if (t.includes('violence') || k === 'brawl' || k === 'shove') return 'violence'; if (t.includes('embarrass') || k === 'stumble' || k === 'sing') return 'embarrass';
  if (['gift', 'charity', 'help', 'newclothes', 'repair'].includes(k) || t.includes('kindness') || t.includes('help') || t.includes('generous')) return 'kind';
  if (['arrest', 'fined', 'escape'].includes(k)) return 'law'; return 'other';
}
function cvEvFacts(c, ev, k) {
  const o = c.o, a = k && k.a && ev.actor ? lf2By(ev.actor) : null, g = lf2By(ev.target), rel = q => !q ? 'none' : q === o ? 'me' : isKin(o, q) ? 'kin' : (o.aff[q.id] || 0) > 30 ? 'friend' : (o.aff[q.id] || 0) < -20 ? 'foe' : 'none';
  const d = Math.floor(game.time / 1440) - Math.floor(ev.t / 1440), j = lf2Judge(o, ev, !!(k && k.a)), txt = (k && k.a ? ev.text : (ev.anonText || ev.text)) || '';
  const tail = a && txt.startsWith(a.first + ' ') ? txt.slice(a.first.length + 1) : null;
  return { tag: cvTagGroup(ev), arch: c.v.arch, stance: cvStanceOf(ev, j), relActor: rel(a), relTarget: rel(g), known: !!a, me: g === o, src: k && k.from ? 'told' : k && !k.mine ? 'saw' : 'mine',
    actor: a ? a.first : 'somebody', target: g ? g.first : '', text: lf2Low(txt), tail: tail ? tail : lf2Low(txt), when: d <= 0 ? 'today' : d === 1 ? 'yesterday' : 'the other day', place: ev.place || 'the square',
    his: a ? cvPron(a).his : 'their', from: k && k.from && byId(k.from) ? byId(k.from).first : '', p: c.p.first };
}

/* ---------------- the rules ---------------- */
const CV_RULES: any = {
  'ev.tell': [
    { when: {}, say: ['#heard#? {text.cap}. #shrugs#', '{text.cap}, {when}. #shrugs#', '#heard#? {text.cap}.'] },
    { when: { tag: 'theft' }, say: ['#heard#? {text.cap}. #wary#', '{text.cap}, {when}. #wary#', 'Somebody has light fingers. {text.cap}. #wary#'] },
    { when: { tag: 'theft', known: false }, say: ['Somebody has been helping themselves, {when}. Nobody saw who. #wary#', 'Things are going missing. {text.cap}. And not a soul saw a thing.'] },
    { when: { tag: 'theft', me: true }, say: ['I have been robbed, {p}. {when.cap}. In my own village.', 'Somebody went through my things {when}. I have checked twice. It is gone.'] },
    { when: { tag: 'theft', relActor: 'foe' }, say: ['{actor} has been at it again. {text.cap}. I am only surprised it took this long.', 'Of course it was {actor}. {text.cap}. I could have told you a year ago.'] },
    { when: { tag: 'theft', relActor: 'friend' }, say: ['They are saying {actor} {tail}. I do not believe it. I do not want to believe it.', 'People say {actor} {tail}. I have known {actor} for years. It does not sound right.'] },
    { when: { tag: 'romance' }, say: ['{text.cap}. I am saying nothing. I am saying nothing very loudly.', '#heard#? {text.cap}. {when.cap}! Out in the open!', 'Love is in the air, or something is. {text.cap}.'] },
    { when: { tag: 'romance', arch: 'nosy' }, say: ['Now, I am not one to talk. But {text}. {when.cap}! In broad daylight!', 'I have been dying to tell somebody. {text.cap}. Who else knows? Do not tell me. Tell me.'] },
    { when: { tag: 'romance', arch: 'cynic' }, say: ['{text.cap}. Give it a month.', 'Romance. {text.cap}. I give it until the harvest.'] },
    { when: { tag: 'romance', arch: 'sunny' }, say: ['Oh, it is too lovely. {text.cap}!', '{text.cap}. I could burst.'] },
    { when: { tag: 'embarrass' }, say: ['#heard#? {text.cap}. #laugh#', '{text.cap}. Poor soul. #laugh#', 'Oh, you missed it. {text.cap}. #laugh#'] },
    { when: { tag: 'embarrass', relTarget: 'friend' }, say: ['{text.cap}. I laughed, and then I felt terrible, and then I laughed again.'] },
    { when: { tag: 'smell' }, say: ['Somebody needs to take {actor} to the baths. By force, if it comes to it.', 'You can smell {actor} before you see {his} face. {when.cap} was the worst yet.', '{text.cap}. Stand upwind, is my advice.'] },
    { when: { tag: 'gamble' }, say: ['{actor} has been at the dice again. {text.cap}. One day it will be the shirt off {his} back.', '{text.cap}. The dice give and the dice take, mostly take.', 'Dice again. {text.cap}. Somebody always thinks tonight is their night.'] },
    { when: { tag: 'gamble', arch: 'cynic' }, say: ['{text.cap}. The only one who wins at dice is the tavern.'] },
    { when: { tag: 'kind' }, say: ['{text.cap}. #soft#', '#heard#? {text.cap}. #soft#', 'A nice thing, for once: {text}. #soft#'] },
    { when: { tag: 'kind', arch: 'cynic' }, say: ['{text.cap}. I am sure there is an angle. There is always an angle.', '{text.cap}. Kindness. Suspicious, but there it is.'] },
    { when: { tag: 'violence' }, say: ['There was a fight. {text.cap}. Blood on the stones, they say.', '{text.cap}, {when}. Over nothing, as usual. #shock#'] },
    { when: { tag: 'law' }, say: ['The watch has been busy. {text.cap}.', '{text.cap}. So the watch does work, after all.'] },
    { when: { src: 'told' }, say: ['{from} told me {text}. #shrugs#', 'I had it from {from}: {text}. Make of that what you will.', '{from} says {text}. And {from} is rarely wrong. Rarely.'] },
    { when: { src: 'told', tag: 'romance' }, say: ['{from} swears {text}. {from} would know, apparently.'] },
  ],
  'ev.why': [
    { when: {}, say: ['Why would {actor} do it? {why}', 'What gets into a person? {why}', '{actor}? {why}', 'If you want my guess: {why}', 'You ask why. {why}'] },
    { when: { good: true }, say: ['Why did {actor} do it? {why}', 'That is {actor} all over. {why}', 'Some people are just made that way. {why}', 'Why? {why} I wish there were more like that.'] },
    { when: { arch: 'cynic' }, say: ['Why does anyone do anything? {why}', 'Motive? {why} Mine would be boredom.'] },
    { when: { arch: 'nosy' }, say: ['Oh, I have theories. {why} And that is only the first one.'] },
  ],
  'ev.feel': [
    { when: {}, say: ['{target} was always going to be the one to feel it.', 'And {target} is the one left picking up the pieces.', 'Poor {target} will be a while getting over it.', '{target} has not said a word about it, which says plenty.'] },
    { when: { good: true }, say: ['{target} will not forget it.', '{target} has told everyone. Twice.', 'You should have seen {target}\'s face.'] },
  ],
  'gossip.react': [
    { when: {}, say: ['Is that so? {actor}, of all people.', 'Well. I did not know that.', 'You are full of news today.'] },
    { when: { stance: 'outraged' }, say: ['That is dreadful. {actor}, of all people.', 'No! Really? I will never look at {actor} the same.', 'That is shameful. Does everyone know?'] },
    { when: { stance: 'outraged', relActor: 'friend' }, say: ['No. Not {actor}. There must be a mistake.', '{actor}? I do not believe it. Who told you?'] },
    { when: { stance: 'outraged', relActor: 'foe' }, say: ['Ha. I knew it. I have always said so about {actor}.', 'That sounds exactly like {actor}. Thank you for telling me.'] },
    { when: { stance: 'amused' }, say: ['Ha! Oh, that is wonderful. Poor {target}.', 'Stop. Stop it. I will tell everyone.', 'Ha! I wish I had seen it.'] },
    { when: { stance: 'pity' }, say: ['Oh, poor {target}. Somebody should look in on them.', 'That is hard. I will take round some bread.'] },
    { when: { stance: 'warm' }, say: ['How lovely. Good for {actor}.', 'That is the nicest thing I have heard all week.', 'You see? People are better than they seem.'] },
    { when: { tag: 'romance' }, say: ['No! {actor}? Does anyone else know? Do not answer, I will find out.', 'Well, well. I wondered about those two.'] },
  ],
};
