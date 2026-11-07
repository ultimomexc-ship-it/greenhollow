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
  forage: { say: ['Off to see whether the berry bushes have anything left.', 'Foraging. The good bushes get further out every week.', 'Berries. If I come back with an empty basket, we are eating air.'], ask: [['Any luck lately?', ['Some. The east bank is picked bare. Everyone had the same idea.', 'A basket on a good day. Half on most.']], ['Mind if I come along?', 'TAG:Come on, then. Two pairs of eyes.']] },
  eat: { say: ['My stomach is leading the way. Home for a meal.', 'Meal time. I think better with something in me.'], ask: [['What is for dinner?', ['Grain and whatever the larder spared.', 'Stew, if nobody has got at the pot.']]] },
  eating: { say: ['Mmf. Sorry. Eating.', 'Mid-bite. Give me a moment.', 'Eating. It is the best part of the day.'], ask: [['What are you having?', ['Whatever there was. It is good, though.', 'Grain and berries. The usual feast.']]] },
  bed: { say: ['Bed. Do not talk to me, I am already asleep.', 'Done for the day. The blanket is calling.'], ask: [['Long day?', ['Long enough that my bones have opinions.', 'Not bad, really. Habit, mostly.']]] },
  party: { say: ['Cake! Have you seen the cake?', 'A party! I have been looking forward to this all week.'], ask: [['Is it a good one?', ['It is going to be. There is cake.', 'Good enough. I am only here for the food.']]] },
  patrol: { say: ['Eyes open, boots on. Quiet streets are the best streets.', 'On patrol. Nothing to report, which is how I like it.'], ask: [['Anything to report?', ['Nothing. Somebody left a crate across a door, but that is a prank, not a crime.', 'Not a thing. Which is suspicious in itself.']]] },
  bakery: { say: ['Off for the morning bread. It is gone by seven if you dawdle.', 'Bread run. I cannot face the day without it.'], ask: [['Is it any good?', ['The best thing on the island. Do not tell the baker, he will charge more.', 'It is bread. It is warm. What more do you want?']]] },
  foodOut: { say: ['No fish, no grain. I am standing here hoping something changes.', 'The larder is empty and everyone is staring at it.'], ask: [['Can I spare you something?', 'FOOD:Oh. Thank you. Truly.']] },
  relax: { say: ['Doing nothing. It is harder than it looks.', 'Resting. Sit down if you like. Nobody is timing us.'], ask: [['Ever get bored?', ['Never. There is always someone to watch.', 'Constantly. I have started naming the ants.']]] },
  water: { say: ['A walk by the water. It clears the head.', 'I come to the water when the village gets too loud.'], ask: [['What do you think about out here?', ['Nothing. That is the whole point.', 'My knees, mostly. And whether it will rain.']], ['Mind some company?', 'TAG:Not at all. Keep up, though.']] },
  fishing: { say: ['Shh! You will scare them.', 'Fishing. Patience, mostly, and bread for bait.'], ask: [['Catching anything?', ['Two so far. One was a boot.', 'Nothing yet. They are being difficult.']]] },
  stall: { say: ['The stall is open. Have a look; nothing bites.', 'Minding the shop. Prices are fair. Mostly.'], ask: [['How is business?', 'BIZ']] },
  privy: { say: ['Not. Now.', '*shuffles urgently*', 'Please. Talk. Later.'], ask: [] },
  social: { say: ['Out with friends. It is nice to be asked.', 'A day out. I have been looking forward to it.'], ask: [['Room for one more?', 'TAG:Always! The more the merrier.']] },
  tag: { say: ['Dad says I should "learn the trade". I am learning to be bored.', 'Tagging along. It is less fun than it sounds.'], ask: [['Is it that bad?', ['Not bad. Just slow. Everything is slow when you are watching.', 'I get to carry things. It is practically a promotion.']]] },
  baths: { say: ['Off to the baths. A person can only be so grubby.', 'The baths. The heat gets the aches out.'], ask: [['Is it worth the fuss?', ['Every coin. Every splash.', 'Ask me when I am clean and sleepy.']]] },
  drink: { say: ['Just the one drink. Maybe two. It is a long evening.', 'Wine, dice and gossip. In that order.'], ask: [['Buy you another?', 'BUY:You are a good sort. Remind me of that tomorrow.']] },
  farm: { say: ['The barley is coming on slow this year. Or it is me.', 'Back to the field. The weeds never take a day off.', 'Ploughing. Straight lines are harder than they look.'], ask: [['How are the crops?', ['Thirsty. So am I.', 'Better than last year. Do not tell the crows.']], ['Need a hand?', 'HELP:Many hands! Thank you.']] },
  build: { say: ['Walls do not build themselves. I have checked.', 'Another beam, another blister.'], ask: [['How far along is it?', ['Further than yesterday. Not as far as I promised.', 'Closer. That is all I will say, or I jinx it.']], ['Need a hand?', 'HELP:That went quicker. You are a good sort.']] },
  smith: { say: ['Iron is honest work. Loud, but honest.', 'If you can hear me over the hammer, you are standing too far away.'], ask: [['What are you making?', ['Whatever someone breaks next. Nails, mostly.', 'A hinge. A very good hinge.']]] },
  sky: { say: ['Looking at the sky. Do not ask what for; I am busy.', 'The stars. There are more than anyone could count. I have tried.'], ask: [['See anything?', ['A bright one. It keeps winking at me.', 'Mostly dark. But it is a good dark.']]] },
  pray: { say: ['Prayers. Quietly, please; the Noodle is listening.', 'A moment of quiet before the day starts. You are welcome to it.'], ask: [['May I join you?', ['Sit. Close your eyes. Or do not; He is patient.', 'Of course. It is not a private noodle.']]] },
  any: { say: null, ask: [['How is your day going?', 'MOOD'], ['Anything new?', 'NEWS']] },
};
function cvActivity(c): string {
  const s = c.status, o = c.o;
  if (/privy/i.test(s)) return 'privy'; if (/Out of .*Waiting/i.test(s)) return 'foodOut'; if (/patrol/i.test(s)) return 'patrol'; if (/coming-of-age|party/i.test(s)) return 'party';
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
  for (const b of cvBackOf(o)) pool.push({ key: 'bk' + b.id, kind: 'back', back: b, w: 1.4, sens: b.sens });
  for (const b of cvWorld().back) if (b.knownBy.includes(o.id) && b.a !== o.id && b.b !== o.id) pool.push({ key: 'bk' + b.id, kind: 'back', back: b, w: 0.9, sens: 0.3 });
  // their own life
  const L = cvLife(o); pool.push({ key: 'amb', kind: 'ambition', w: 0.8, sens: 0.3 }, { key: 'pri', kind: 'pride', w: v.arch === 'talkative' || v.arch === 'smooth' ? 1.2 : 0.6, sens: 0.15 }, { key: 'fea', kind: 'fear', w: 0.5, sens: 0.45 });
  if (L.regret) pool.push({ key: 'reg', kind: 'regret', w: 0.6, sens: 0.55 }); if (L.secret) pool.push({ key: 'sec', kind: 'secret', w: 0.7, sens: L.secret.sens });
  for (const s of CV_STATES) { let ok = false; try { ok = s.ok(c); } catch (e) {} if (ok) pool.push({ key: 'st' + s.id, kind: 'state', id: s.id, w: 1.6, sens: 0.1 }); }
  // legends, the day, the village
  for (const g of CV_LEGENDS) pool.push({ key: 'lg' + g.id, kind: 'legend', id: g.id, w: 0.45 + (lf2Has(o, 'devout') || o.age > 50 ? 0.3 : 0) + (v.arch === 'sunny' || v.arch === 'talkative' ? 0.3 : 0), sens: 0.1 });
  pool.push(...cvWorldTopics(c));
  // the player
  pool.push(...cvPlayerTopics(c));
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
