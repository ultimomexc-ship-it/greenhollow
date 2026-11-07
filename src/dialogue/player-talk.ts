/* ================= Talking with the player: a small dialogue tree built from real facts ================= */
const heShe = o => o.female ? 'she' : 'he', HeShe = o => o.female ? 'She' : 'He', himHer = o => o.female ? 'her' : 'him', hisHer = o => o.female ? 'her' : 'his';
const R0 = () => Math.random();
const anyOf = a => a[Math.floor(Math.random() * a.length)];
function personById(id) { return byId(id) || (town.dead || []).find(r => r.id === id) || null; }
const isDeadRec = o => !!(o && o.died !== undefined && !o.fam);

function kinWord(n, o) {
  if (n.fam.spouse === o.id) return o.female ? 'wife' : 'husband';
  if (n.fam.partner === o.id) return 'sweetheart';
  if (n.fam.mother === o.id) return 'mother'; if (n.fam.father === o.id) return 'father';
  if (o.fam && (o.fam.mother === n.id || o.fam.father === n.id)) return o.female ? 'daughter' : 'son';
  if (o.fam && ((n.fam.mother && o.fam.mother === n.fam.mother) || (n.fam.father && o.fam.father === n.fam.father))) return o.female ? 'sister' : 'brother';
  const par = [n.fam.mother, n.fam.father].map(byId).filter(Boolean);
  if (par.some(p => p.fam.mother === o.id || p.fam.father === o.id)) return o.female ? 'grandmother' : 'grandfather';
  if (o.fam && [o.fam.mother, o.fam.father].map(byId).filter(Boolean).some(p => p.fam.mother === n.id || p.fam.father === n.id)) return o.female ? 'granddaughter' : 'grandson';
  if (o.fam && isKin(n, o)) return 'cousin';
  const r = n.rel[o.id]; if (r === 'friend' || r === 'rival') return r;
  return null;
}
const TRAIT_SEEN = {
  cheerful: o => `is always smiling, even in the rain`, grumpy: o => `grumbles about everything, but means well`, devout: o => `never misses a prayer`,
  gossipy: o => `knows everyone's business before they do`, curious: o => `is always poking at something new`, lazy: o => `is not one for hard work, between us`,
  greedy: o => `counts every fish twice`, brave: o => `is afraid of nothing at all`, shy: o => `keeps to ${himHer(o)}self`, generous: o => `would give you the shirt off ${hisHer(o)} back`,
  jovial: o => `laughs louder than anyone in town`, anxious: o => `worries about everything`, proud: o => `is a proud one, and does not like being told`,
  dreamy: o => `is always somewhere else in ${hisHer(o)} head`, 'early bird': o => `is up before the birds`, 'night owl': o => `is up long after the lamps go out`,
  homebody: o => `rarely leaves the house if ${heShe(o)} can help it`, sociable: o => `will talk to anyone who stands still`
};
const TRAIT_SELF = {
  cheerful: 'I try to find the bright side. There usually is one.', grumpy: 'People say I grumble. I say I notice things.', devout: 'I say my prayers morning and night. It keeps me steady.',
  gossipy: 'I like to know what is going on. Is that so bad?', curious: 'I always want to know how things work, and what is past the trees.', lazy: 'I believe in working hard. Just not for too long at once.',
  greedy: 'A fish in the pantry is a fish nobody else gets. I like having them.', brave: 'Not much frightens me. Except maybe being bored.', shy: 'I am not much of a talker. You may have noticed.',
  generous: 'If I have something, it might as well do someone some good.', jovial: 'Life is short. Might as well laugh.', anxious: 'I worry. About the stores, the winter, the little ones.',
  proud: 'I do things properly, or not at all.', dreamy: 'I drift off sometimes. There is a lot to think about.', 'early bird': 'Best part of the day is before anyone else is up.',
  'night owl': 'I come alive after dark. Mornings are a punishment.', homebody: 'Give me my own hearth and I am happy.', sociable: 'I like people. Even the difficult ones.'
};
function firstPerson(q) {
  const w = q.split(' '), v = w[0];
  const map = { is: 'am', has: 'have', does: 'do', claims: 'claim', swears: 'swear' };
  w[0] = map[v] || (/(ch|sh|ss|x)es$/.test(v) ? v.slice(0, -2) : v.endsWith('s') ? v.slice(0, -1) : v);
  return ('I ' + w.join(' ')).replace(/ and does not /, ' and do not ').replace(/they can/, 'I can').replace(/they never/, 'I never').replace(/everyone's/, "everyone's");
}
function siteName(s) { return s.kind === 'house' ? (s.surname ? `the ${s.surname} house` : 'the spare house') : s.kind === 'church' ? 'the chapel' : s.kind === 'tavern' ? 'the tavern' : s.kind === 'market' ? 'the village green' : s.kind === 'road' ? 'the new road' : 'the ' + s.kind; }
function whereWord(sp) {
  const dx = sp.x - town.cx, dy = sp.y - town.cy, d = Math.hypot(dx, dy);
  if (d < 7) return 'just off the square';
  const dir = Math.abs(dx) > Math.abs(dy) * 1.6 ? (dx > 0 ? 'east' : 'west') : Math.abs(dy) > Math.abs(dx) * 1.6 ? (dy > 0 ? 'south' : 'north') : (dy > 0 ? 'south' : 'north') + (dx > 0 ? '-east' : '-west');
  return `out to the ${dir}` + (shoreTiles.some(t => t.x === sp.x && t.y === sp.y) ? ', down by the water' : '');
}
function closenessWord(n, p) {
  const a = n.aff[p.id] || 0, k = n.know[p.id] || 0, kw = kinWord(n, p);
  const base = k < 10 ? 'a stranger' : a >= 60 ? 'a dear friend' : a >= 30 ? 'a friend' : a >= 10 ? 'friendly' : a > -15 ? 'an acquaintance' : 'not fond of you';
  return kw ? `your ${kinWord(p, n) || kw}` + (k >= 10 ? ', ' + base.replace(/^an? /, '') : '') : base;
}

/* ---------- answers ---------- */
function greetLine(n, p) {
  const k = n.know[p.id] || 0, a = n.aff[p.id] || 0, kw = kinWord(n, p);
  if (n.mourning) { const r = personById(n.mourning); if (r) return `Oh... ${p.first}. Sorry. I keep thinking about ${r.first}.`; }
  if (k < 10) return anyOf([`I do not think we have properly met. I am ${n.first}. ${n.first} ${n.surname}.`, `Hello there. ${n.first}, ${n.age < 16 ? 'and I am ' + n.age : 'pleased to meet you'}.`]);
  if (kw === 'mother' || kw === 'father') return anyOf([`Hello, love. Have you eaten?`, `There you are. I was wondering where you had got to.`]);
  if (kw === 'son' || kw === 'daughter') return n.age < 16 ? anyOf([`${p.female ? 'Mum' : 'Dad'}! Guess what I saw today!`, `${p.female ? 'Mum' : 'Dad'}! Are you done working?`]) : anyOf([`Hello, ${p.female ? 'Mother' : 'Father'}.`, `Hello. Sit down a minute, you look tired.`]);
  if (kw === 'husband' || kw === 'wife' || kw === 'sweetheart') return anyOf([`There you are. I was hoping I would see you.`, `Hello, you.`, `${p.first}. Come here.`]);
  if (a < -20) return anyOf([`${p.first}.`, `What do you want?`, `Oh. It is you.`]);
  if (n.hunger >= 70) return `${p.first}. Sorry, I am half-starved. What is it?`;
  const band = todBand(game.time);
  return anyOf([band === 'morning' ? `Morning, ${p.first}.` : band === 'night' ? `Out late, ${p.first}?` : `Afternoon, ${p.first}.`, `${p.first}! Good to see you.`, `Hello again, ${p.first}.`]);
}
function howAreYou(n, p) {
  const out = [];
  if (n.mourning) { const r = personById(n.mourning); if (r) out.push(`Not good. ${r.first} is gone, and the house is so quiet.`); }
  if (n.hunger >= 70) out.push(anyOf(['Hungry. Properly hungry.', 'I have not eaten all day, if I am honest.']));
  else if (n.hunger <= 25) out.push('Well fed, at least.');
  lifeHowAre(n, out);
  if (n.preg) { const d = (n.preg.due - game.time) / YEAR; out.push(d < 0.15 ? 'The baby is coming any day now.' : 'I am expecting, you know. A little one, before long.'); }
  if (!n.homeRoom && n.age >= 3) out.push(anyOf(['Sleeping in a tent. The ground gets cold at night.', 'Still no roof of my own. Maybe soon.']));
  if (n.social < 30) out.push(anyOf(['Lonely, a bit. Glad you stopped.', 'It has been a quiet few days. Too quiet.']));
  if (n.grief && n.grief > game.time && !n.mourning) out.push('Some days are better than others since I lost my ' + (n.female ? 'husband' : 'wife') + '.');
  const rec = (n.mem || []).filter(m => game.time - m.t < 1440 && m.kind !== 'loss').slice(-1)[0];
  if (rec) out.push(`Still smiling about ${rec.me}.`);
  if (!out.length) out.push(TRAIT_SELF[n.traits[0]] ? ({ cheerful: 'Never better!', grumpy: 'Same as always. Which is to say, tired.', anxious: 'Worried. I am always a little worried.', jovial: 'Grand! Ask me again after supper.', dreamy: 'Hm? Oh, fine. Do you ever look at the clouds properly?', lazy: 'Tired. It has been a long day of avoiding work.', proud: 'Very well, thank you for asking.' }[n.traits[0]] || 'Well enough, thank you. Well enough.') : 'Well enough.');
  return out.slice(0, 3).join(' ');
}
function jobTalk(n, p) {
  if (n.age < 3) return '...';
  if (n.age < 16) {
    const lj = Object.entries(n.learn || {}).sort((a, b) => b[1] - a[1])[0];
    const par = [n.fam.mother, n.fam.father].map(byId).filter(x => x && !x.dead)[0];
    return `I am a child! I play, mostly. ` + (lj && par ? `And sometimes I help ${par.female ? 'Mum' : 'Dad'} ${JOB_VERB[lj[0]]}. When I am big I want to be ${JOB_NOUN[lj[0]]}.` : anyOf([`When I am sixteen I will work like the grown-ups.`, `I am going to build my own house one day.`]));
  }
  let s = '';
  if (n.role === 'Trader' && n.shop) { s = `I keep the larder at ${n.shop.mk ? n.shop.mk.name || 'the green' : 'the green'}. Leave what you gathered, take what you need. Nobody counts. Well. I count. Nobody minds.`; }
  else if (n.role === 'Priest') s = `I serve the Flying Spaghetti Monster. ${town.weddings || 0} weddings and ${town.deaths || 0} funerals so far. I remember every one. R'amen.`;
  else if (n.role === 'Barkeep') s = `I pour the drinks at ${town.tavern ? town.tavern.name : 'the tavern'} and listen. Mostly I listen.`;
  else if (n.role === 'Elder') s = anyOf([`I am retired. My hands did their share.`, `These days I watch the young ones work and tell them they are doing it wrong.`]);
  else if (n.role === 'Worker') {
    const r = n.cur, d = demand();
    const site = town.sites.filter(q => q.slots && siteRem(q, r === 'Stonecutter' ? 'stone' : 'wood') > 0)[0];
    s = { Woodcutter: site ? `I cut timber. ${siteName(site)} still needs ${siteRem(site, 'wood')} logs, so I keep at the trees.` : `I cut timber when the town needs it.`,
      Stonecutter: site ? `Stone, mostly. ${siteName(site)} needs ${siteRem(site, 'stone')} more blocks.` : `I break stone out at the rocks.`,
      Fisher: `I fish. ` + (town.pondInfo && town.pondInfo.stock < town.pondInfo.cap * 0.35 ? 'The water is getting fished out, though.' : 'Good water around here.'),
      Farmer: `I work the fields. Plough, sow, wait, harvest. The field never rests, so neither do I.`,
      Gatherer: `Berries and herbs, wherever they grow. I know every bush for a mile.` }[r] || `I go where the town needs hands. Timber, stone, fish, whatever is short.`;
    if (n.pref) { const par = [n.fam.mother, n.fam.father].map(personById).filter(Boolean)[0]; s += (n.pref === r ? ` It is what I always wanted` : ` Truth is, I always wanted to be ${JOB_NOUN[n.pref]}`) + (par ? `, ever since ${par.female ? 'Mum' : 'Dad'} let me tag along.` : '.'); }
  }
  if (n.traits.includes('lazy')) s += ' Between you and me, I could do with less of it.';
  if (n.traits.includes('proud')) s += ' And I am good at it, whatever anyone says.';
  return s;
}
function funTalk(n, p) {
  if (n.age < 6) return anyOf(['Playing! And running! And jumping!', 'I like frogs.']);
  const h = hobbyOf(n), f = favSpot(n), where = f ? whereWord(f) : 'wherever I can';
  const lines = { fishing: `Fishing, when I get the chance. There is a spot ${where}. The fish practically jump.`, foraging: `Berry picking. Not for work, just for the quiet. The best bushes are a secret.`,
    walking: `Long walks. There is a place ${where} where you can hear nothing but the wind.`, whittling: `Whittling. Little birds, foxes, a spoon if I am feeling useful. I sit ${where}.`,
    singing: `Singing! Badly, according to some. I go ${where} where it carries.`, stargazing: `I watch the stars at night, ${where}. They are always there. I like that.` };
  return lines[h] + ((n.aff[p.id] || 0) >= 25 ? ' Come with me some time.' : '');
}
function familyTalk(n, p) {
  const parts = [];
  const sp = n.fam.spouse && personById(n.fam.spouse);
  if (sp && sp.id === p.id) parts.push(anyOf(['We are well, love. You know that.', 'Us? We are fine. Better than fine.']));
  else if (sp) parts.push(isDeadRec(sp) ? `My ${sp.female ? 'wife' : 'husband'}, ${sp.first}, is buried up by the chapel.` : `I am married to ${sp.first}` + ((n.aff[sp.id] || 0) >= 50 ? ', and I would do it all again.' : '.'));
  else if (n.fam.partner) { const pt = byId(n.fam.partner); if (pt) parts.push(`I have been walking out with ${pt.first}. Do not tell anyone. Everyone knows.`); }
  const kids = (n.fam.kids || []).map(personById).filter(Boolean);
  if (kids.length) { const live = kids.filter(k => !isDeadRec(k)), dead = kids.filter(isDeadRec);
    const lv = live.filter(k => k.id !== p.id);
    if (live.some(k => k.id === p.id)) parts.push(anyOf(['And you, of course. My favourite. Do not tell the others.', 'You are still my little one, whatever you say.']));
    if (lv.length) parts.push(lv.map(k => k.age < 16 ? `${k.first} is ${k.age} and into everything` : `${k.first} is grown now`).join('. ') + '.');
    if (dead.length) parts.push(`We lost ${dead.map(k => k.first).join(' and ')}. I think about ${dead.length > 1 ? 'them' : himHer(dead[0])} every day.`); }
  const par = [n.fam.mother, n.fam.father].map(personById).filter(Boolean);
  if (par.length) parts.push(par.map(q => q.id === p.id ? `You know my ${q.female ? 'mother' : 'father'} better than anyone` : isDeadRec(q) ? `My ${q.female ? 'mother' : 'father'} ${q.first} passed on` : `My ${q.female ? 'mother' : 'father'} is ${q.first}`).join('. ') + '.');
  const sib = npcs.filter(o => o !== n && ((n.fam.mother && o.fam.mother === n.fam.mother) || (n.fam.father && o.fam.father === n.fam.father)));
  if (sib.length) parts.push(`${sib.length === 1 ? (sib[0].female ? 'A sister' : 'A brother') : 'Brothers and sisters'}: ${sib.map(o => o.first).join(', ')}.`);
  if (!parts.length) return anyOf([`No family here. Just me. The town is family enough, some days.`, `I came on my own. Maybe one day there will be more of us.`]);
  return parts.join(' ');
}
function memoryTalk(n, p) {
  const ms = (n.mem || []).slice();
  if (!ms.length) return n.age < 8 ? 'I remember... um... yesterday?' : 'Nothing much has happened to me yet. Give it time.';
  const shared = ms.filter(m => m.w === p.id && m.we);
  if (shared.length && Math.random() < 0.6) { const m = shared[shared.length - 1]; return `Remember ${m.we}? I think about that often.`; }
  const m = ms.filter(x => x.kind !== 'feast').sort((a, b) => ({ loss: 3, outing: 2, wedding: 2, birth: 2, share: 2, teach: 2, home: 1 }[b.kind] || 0) - ({ loss: 3, outing: 2, wedding: 2, birth: 2, share: 2, teach: 2, home: 1 }[a.kind] || 0) + Math.random() - 0.5)[0] || ms[ms.length - 1];
  return { loss: `${m.me.charAt(0).toUpperCase() + m.me.slice(1)}. That one stays with you.`, outing: `${m.me.charAt(0).toUpperCase() + m.me.slice(1)}. One of my best days.`, wedding: `${m.me.charAt(0).toUpperCase() + m.me.slice(1)}. The whole town was there.`, share: `${m.me.charAt(0).toUpperCase() + m.me.slice(1)}. I will not forget it.`, birth: `${m.me.charAt(0).toUpperCase() + m.me.slice(1)}. Nothing compares.`, teach: `${m.me.charAt(0).toUpperCase() + m.me.slice(1)}. I was so proud.`, home: `${m.me.charAt(0).toUpperCase() + m.me.slice(1)}. Every log of it.` }[m.kind] || `I often think about ${m.me}.`;
}
function secretTalk(n, p) {
  const k = n.know[p.id] || 0, a = n.aff[p.id] || 0;
  if (!(k >= 40 || a >= 35 || kinWord(n, p))) return anyOf([`Ha! Ask me again when we know each other better.`, `A secret? From me? Buy me a drink first.`, `Hm. Maybe one day, ${p.first}.`]);
  n.toldSecret = n.toldSecret || {}; n.toldSecret[p.id] = true;
  return anyOf(['Between you and me... ', 'Do not laugh. ', 'Not many people know this, but ']) + firstPerson(n.quirk) + '.';
}
function aboutTalk(n, o, p) {
  if (o === p) return `You? ` + ((n.aff[p.id] || 0) >= 40 ? `You are one of the good ones, ${p.first}.` : (n.aff[p.id] || 0) < -15 ? 'I have my opinions. I will keep them.' : 'You are all right, I suppose.');
  const kw = kinWord(n, o), k = n.know[o.id] || 0, a = n.aff[o.id] || 0, parts = [];
  parts.push(kw ? `${o.first}? My ${kw}.` : k < 15 ? `${o.first}? I hardly know ${himHer(o)}.` : `${o.first}?`);
  if (k >= 15 || kw) {
    const job = o.age < 16 ? `still a child` : o.role === 'Worker' ? ({ Woodcutter: 'cuts timber', Stonecutter: 'works the stone', Fisher: 'fishes', Farmer: 'works the fields', Gatherer: 'forages' }[o.cur] || 'works wherever the town needs') : o.role === 'Trader' ? 'keeps the village larder' : o.role === 'Priest' ? 'is our priest of the Flying Spaghetti Monster. Wears a colander and everything' : o.role === 'Barkeep' ? 'runs the tavern' : 'is retired now';
    parts.push(`${HeShe(o)} ${job}.`);
    const t = o.traits.find(x => TRAIT_SEEN[x]); if (t) parts.push(`${HeShe(o)} ${TRAIT_SEEN[t](o)}.`);
  }
  parts.push(a >= 60 ? `I would do anything for ${himHer(o)}.` : a >= 30 ? `I am fond of ${himHer(o)}.` : a <= -30 ? `We do not get on. Leave it at that.` : a <= -10 ? `${HeShe(o)} gets under my skin, if I am honest.` : '');
  const sh = (n.mem || []).filter(m => m.w === o.id && m.me).slice(-1)[0]; if (sh) parts.push(`I will never forget ${sh.me}.`);
  if (n.traits.includes('gossipy') && k >= 25 && !(o.toldSecret && o.toldSecret[p.id])) parts.push(`And did you know ${heShe(o)} ${o.quirk}? You did not hear it from me.`);
  if (o.fam.partner && !o.fam.spouse && k >= 20) { const pt = byId(o.fam.partner); if (pt) parts.push(`Between us, ${heShe(o)} has been walking out with ${pt.first}.`); }
  return parts.filter(Boolean).join(' ');
}
function townTalk(n, p) {
  const out = [], w = town.wedding, f = town.funeral, fe = town.feast;
  if (w && !w.done) out.push(`${w.a.first} and ${w.b.first} are getting married, ${dayLabel(w.at)}. I will be there.`);
  if (f && !f.done) out.push(`The funeral for ${f.rec.first} is ${dayLabel(f.at)}. Sad times.`);
  if (fe) out.push(`There is a bonfire on the square for ${fe.why}. Bring your dancing feet.`);
  const s = town.sites.filter(q => q.slots && q.slots.some(x => !x.built))[0];
  if (s) { const w2 = siteRem(s, 'wood'), st = siteRem(s, 'stone'); out.push(`${siteName(s).charAt(0).toUpperCase() + siteName(s).slice(1)} is going up. It still needs ${[w2 ? w2 + ' timber' : '', st ? st + ' stone' : ''].filter(Boolean).join(' and ')}.`); }
  const fd = foodDaysNow(); out.push(fd < 1.5 ? 'Food is short. People are worried, and so am I.' : fd > 6 ? 'The pantries are full, thank goodness.' : 'We have enough to eat, for now.');
  const news = (town.chron || []).filter(c => game.time - c.time < 1.5 * 1440 && ['life', 'love', 'death', 'family'].includes(c.kind)).slice(-1)[0];
  if (news && out.length < 4) out.push(`And did you hear? ${news.text}`);
  if (isRestDay()) out.push('It is the rest day, too. No axes after noon.');
  return out.slice(0, 4).join(' ');
}
function giveFood(n, p) {
  const g = FOODS.filter(x => (p.inv[x] || 0) > 0).sort((a, b) => GOODS[b].sat - GOODS[a].sat)[0]; if (!g) return 'You have nothing to give.';
  const q = Math.min(p.inv[g], n.hunger >= 50 ? 2 : 1); p.inv[g] -= q;
  const hungry = n.hunger >= 50; if (hungry) { n.hunger = Math.max(0, n.hunger - q * GOODS[g].sat); } else { const pool = n.homeRoom ? pantryOf(n) : n.inv; pool[g] = (pool[g] || 0) + q; }
  bumpAff(n, p, hungry ? 12 : 6, 10);
  if (hungry) { addMem(n, 'share', `the time ${p.first} fed me when I was hungry`, 'when you fed me when I was hungry', p.id); addMem(p, 'share', `sharing food with ${n.first}`, 'when I shared my food with you', n.id); }
  const t = n.traits;
  return (hungry ? anyOf([`Oh, bless you. I have not eaten since morning.`, `You are a lifesaver, ${p.first}. Truly.`]) :
    t.includes('greedy') ? 'Free? I will take it.' : t.includes('proud') ? 'I do not need charity... but thank you.' : t.includes('generous') ? 'You are too kind. I will share it with the little ones.' : `For me? Thank you, ${p.first}.`) + ` (${q} ${GOODS[g].name})`;
}
/* the menu: every answer leads back to a set of choices */
function talkNode(key, n, p, arg) {
  const root = () => {
    const o = [['how', 'How are you?'], ['me', 'Tell me about yourself.'], ['people', 'Ask about someone…'], ['town', 'What is new in town?']];
    if (FOODS.some(g => (p.inv[g] || 0) > 0)) o.push(['give', n.hunger >= 50 ? 'You look hungry. Have some food.' : 'I brought you something to eat.']);
    o.push(['bye', 'Goodbye.']); return o;
  };
  const me = () => [['job', n.age < 16 ? 'What do you do all day?' : 'What is your work like?'], ['fun', 'What do you do for fun?'], ['family', 'Tell me about your family.'], ['mem', 'What do you remember most?'], ['self', 'What kind of person are you?'], ['secret', 'Tell me something nobody knows.'], ['root', 'Back']];
  const people = () => {
    const fam = npcs.filter(o => o !== n && o !== p && kinWord(n, o) && kinWord(n, o) !== 'friend' && kinWord(n, o) !== 'rival');
    const rest = npcs.filter(o => o !== n && o !== p && !fam.includes(o) && (n.know[o.id] || 0) >= 15).sort((a, b) => (n.know[b.id] || 0) - (n.know[a.id] || 0));
    return fam.concat(rest).slice(0, 7).map(o => ['about:' + o.id, o.first + (kinWord(n, o) ? ' (' + kinWord(n, o) + ')' : '')]).concat([['about:' + p.id, 'What do you think of me?'], ['root', 'Back']]);
  };
  switch (key) {
    case 'hello': return { say: greetLine(n, p), opts: root() };
    case 'root': return { say: null, opts: root() };
    case 'how': return { say: howAreYou(n, p), opts: root(), topic: 1 };
    case 'me': return { say: null, opts: me() };
    case 'job': return { say: jobTalk(n, p), opts: me(), topic: 1 };
    case 'fun': return { say: funTalk(n, p), opts: me(), topic: 1 };
    case 'family': return { say: familyTalk(n, p), opts: me(), topic: 1 };
    case 'mem': return { say: memoryTalk(n, p), opts: me(), topic: 2 };
    case 'secret': return { say: secretTalk(n, p), opts: me(), topic: 2 };
    case 'self': return { say: TRAIT_SELF[n.traits[0]] || 'I am just me.', opts: me(), topic: 1 };
    case 'people': return { say: null, opts: people() };
    case 'town': return { say: townTalk(n, p), opts: root(), topic: 1 };
    case 'give': return { say: giveFood(n, p), opts: root() };
    default:
      if (key.startsWith('about:')) { const o = byId(+key.slice(6)); return { say: o ? aboutTalk(n, o, p) : 'Who?', opts: people(), topic: 1 }; }
      return { say: null, opts: root() };
  }
}
function voiced(n, text) { const t = n.traits.find(x => FLAVOR[x]); return t && Math.random() < 0.25 && text.length < 160 ? FLAVOR[t](text) : text; }

