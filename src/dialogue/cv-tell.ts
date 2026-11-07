/* ================= dialogue / cv-tell: turning a topic into words, one layer at a time =================
   Layer 0 is the hint or the headline, 1 the story or the reason, 2 and 3 what they do not usually say. Every layer names things the player can
   follow up (other people, an event, an old story), which is how a conversation wanders somewhere nobody planned.                        */
const cvKindWord: any = { theft: 'theft', pickpocket: 'stolen purse', quarrel: 'quarrel', brawl: 'brawl', insult: 'insult', gift: 'gift', help: 'kindness', fined: 'fine', arrest: 'arrest', escape: 'escape', bribe: 'bribe', breakin: 'break-in', snoop: 'snooping', robbed: 'robbery', jealous: 'jealous scene', flirt: 'flirting', crush: 'crush', confront: 'confrontation', cheat: 'cheating', sabotage: 'sabotage', blockdoor: 'blocked door', shutin: 'locked door', stumble: 'tumble', smelly: 'smell', sing: 'singing', rumour: 'rumour', dice: 'dice game', charity: 'charity', repair: 'repair', newclothes: 'new clothes', dole: 'grain dole', report: 'report', blackmail: 'blackmail', distract: 'distraction', knock: 'knocking', wake: 'wake-up' };
/** what you would call an event when asking about it ("the row between Junilla and Spurius", "Galba's lost coins") */
function cvEvLabel(ev): string {
  const a = ev.actor ? lf2By(ev.actor) : null, g = ev.target != null ? lf2By(ev.target) : null, A = a && a.first, G = g && g.first, k = ev.kind, grp = cvTagGroup(ev);
  if (['theft', 'pickpocket', 'robbed', 'pilfer', 'breakin'].includes(k) || grp === 'theft') return G ? `what was taken from ${G}` : 'the thieving';
  if (k === 'quarrel' || k === 'confront') return A && G ? `the row between ${A} and ${G}` : 'the row';
  if (grp === 'violence') return A && G ? `the fight between ${A} and ${G}` : 'the fight';
  if (grp === 'romance') return A && G ? `${A} and ${G}` : A ? `${A}'s sweetheart` : 'the romance';
  const own: any = { smelly: 'the smell about {A}', stumble: '{A}\'s tumble', sing: '{A}\'s singing', report: 'what {A} told the watch', arrest: '{G}\'s arrest', fined: '{A}\'s fine', illness: '{G}\'s illness', lostcoins: '{A}\'s lost coins', windfall: '{A}\'s good luck', bigcatch: '{A}\'s big catch', keptcoins: 'the coins {A} found', returned: 'the purse {A} gave back', secret: 'what came out about {A}', businessweek: '{A}\'s business', default: 'the money {A} owes {G}', loan: 'the loan {A} gave {G}', repaid: 'the money {A} paid back', delivery: 'the delivery', newclothes: '{A}\'s new clothes', dice: 'the dice game', rumour: 'what they\'re saying about {A}', blackmail: 'what {A} did to {G}' };
  const t = own[k]; if (t && (!/\{A\}/.test(t) || A) && (!/\{G\}/.test(t) || G)) return t.replace('{A}', A || '').replace('{G}', G || '');
  if (grp === 'kind') return A && G ? `what ${A} did for ${G}` : G ? `the kindness to ${G}` : 'the kindness';
  return G && G !== A ? `what happened to ${G}` : A ? `what ${A} did` : 'that business';
}
function cvLabel(t: any): string {
  switch (t.kind) {
    case 'event': return cvEvLabel(t.ev);
    case 'person': return t.q.first; case 'rel': return `${t.q.first} and ${t.extra.b.first}`; case 'conv': return `you and ${t.q.first}`;
    case 'back': { const a = byId(t.back.a), b = byId(t.back.b); return t.back.kind === 'debt' ? `the money between ${a.first} and ${b.first}` : t.back.kind === 'feud' ? `the quarrel between ${a.first} and ${b.first}` : `${a.first} and ${b.first}`; }
    case 'ambition': return 'that dream'; case 'regret': return 'that regret'; case 'pride': return 'that story'; case 'fear': return 'that fear'; case 'secret': return 'that secret';
    case 'state': return 'that'; case 'legend': return (CV_LEGENDS.find(g => g.id === t.id) || { title: 'that' }).title;
    default: return 'that';
  }
}
const cvHook = (t: any, label?: string): CvHook => ({ k: t.kind, key: t.key, label: label || cvLabel(t), q: t.q, ev: t.ev, back: t.back, facet: t.facet, id: t.id, extra: t.extra });
const cvPersonHook = (q): CvHook => ({ k: 'person', key: 'pe' + q.id, label: q.first, q });
const cvAdvise: any = { talkative: ['I\'d stand on the square and tell everyone, frankly.', 'If it were me, I\'d have said something at the time. Loudly. With gestures.', 'What would I do? Tell the tavern. Then tell them again with the good bits in.'], reserved: ['I\'d say nothing. And I\'d watch.', 'Keep out of it. That\'s what I\'m doing.', 'It isn\'t mine to fix.'], nosy: ['I\'m going to find out the rest. I always do.', 'There\'s more to it. I\'ll have it by supper.', 'Somebody knows the rest. I\'m working out who.'], cynic: ['Nothing. Nothing ever comes of it.', 'Do? Wait. It\'ll happen again. It always does.', 'Same as last time: nothing, and everyone pretending they did something.'], sunny: ['I\'d hope they sort it out between themselves.', 'I think it\'ll all come right. Most things do.', 'A bit of kindness would fix most of it. It usually does.'], wary: ['I\'d lock my door and hope for the best.', 'Stay out of it. That\'s my advice. Stay well out.', 'I\'m keeping my head down until it blows over.'], prickly: ['I\'d have it out with them. Loudly.', 'Somebody should say something to their face. Might be me.', 'If they try it with me, they\'ll regret it.'], smooth: ['I\'d make use of it. Quietly.', 'Knowing a thing is worth more than saying it.', 'I\'d remember it. Things like this come in useful.'], lonely: ['I\'d bake them something. I don\'t know why. It\'s what I do.', 'I\'d go and sit with them. Nobody ever minds being sat with.', 'I\'d listen, if anyone asked me to.'] };
const cvTraitWhy: any = { greedy: 'Light fingers, that one. Always has been.', grumpy: 'Temper like a kicked goat.', lazy: 'Always about, never doing.', shy: 'The quiet ones, you never quite know.', proud: 'Cannot stand being wrong. Cannot stand anyone else being right.', anxious: 'Frightened people do odd things.', gossipy: 'Talks too much. Fills the gaps with whatever is to hand.', brave: 'Does not think before doing. Never has.', devout: 'Judges everyone, quietly, from a great height.', curious: 'Gets into everything. Eventually, into the wrong thing.', jovial: 'Laughs it off. Then you find out what was behind the laugh.', cheerful: 'Too cheerful. Nobody is that happy for no reason.', dreamy: 'Head in the clouds; hands somewhere they should not be.', generous: 'Gives with one hand, keeps a ledger with the other.', sociable: 'Everyone\'s friend. Which means nobody\'s.', homebody: 'Never goes out. Which is when you wonder what they get up to.' };
const cvTraitGood: any = { generous: 'Gives with both hands, that one. Always has.', cheerful: 'Cannot help being kind. It is like a cough.', devout: 'Does it quietly and tells no one. Which is how I know.', brave: 'Does what needs doing, never mind who is looking.', jovial: 'Does good the way other people do gossip: constantly, and with relish.', shy: 'Never makes a fuss about it. You only find out afterwards.', sociable: 'Likes people. It really is that simple, in the end.', dreamy: 'Does the right thing and forgets to mention it.' };
const cvGoodWhy = (S) => { const t = (S.traits || []).find(x => cvTraitGood[x]); return t ? cvTraitGood[t] : `That is simply what ${S.first} is like. Always has been.`; };
const cvEvWhy = (o, S) => { const t = (S.traits || []).find(x => cvTraitWhy[x]); return t ? cvTraitWhy[t] : 'No reason. A feeling.'; };
function cvStanceOf(ev, j) { if (j.pity > 0.7 && j.v >= -0.6) return 'pity'; if (j.v < -0.55) return 'outraged'; if (ev.kind !== 'quarrel' && ev.kind !== 'confront' && ev.tags.some(t => ['embarrass', 'funny', 'prank', 'drunk', 'smelly'].includes(t)) && Math.abs(j.v) < 0.7) return 'amused'; if (j.v > 0.4) return 'warm'; if (j.v < -0.2) return 'outraged'; return 'shrug'; }
function cvSuspect(c, ev) {
  const o = c.o, key = ev.id; o.cvSusp = o.cvSusp || {}; if (o.cvSusp[key]) return byId(o.cvSusp[key]);
  const cand = npcs.filter(q => q !== o && !q.dead && !q.infant && q.age >= 14 && q.id !== ev.target && q !== c.p).map(q => ({ q, s: -(o.aff[q.id] || 0) + (q.traits.includes('greedy') ? 15 : 0) + Math.random() * 30 })).sort((a, b) => b.s - a.s);
  const pick = cand[0] && cand[0].q; if (pick) o.cvSusp[key] = pick.id; return pick;
}

function cvTellEvent(c, t, layer): CvUtt | null {
  const o = c.o, p = c.p, ev = t.ev, k = o.kn && o.kn[ev.id]; if (!k) return null;
  const j = lf2Judge(o, ev, k.a), stance = cvStanceOf(ev, j), actor = k.a && !k.sus ? lf2By(sbWhoId(o, ev)) : null, target = lf2By(ev.target), txt = cvMe(o, sbText(o, ev)), hooks: CvHook[] = [cvHook(t)];
  if (actor && actor !== o) hooks.push(cvPersonHook(actor)); if (target && target !== o && target !== actor) hooks.push(cvPersonHook(target));
  if (layer === 0) {
    lf2Tell(o, p, ev, false, true);
    if (ev.actor === o.id || ev.target === o.id) { const bad = ev.tags.some(g => (LF2_TAGS[g] || {}).v < 0);   // their own story: not gossip
      return { text: `${cvCap(lf2Low(txt))}. ${cvFreshest(p, bad ? ['I am not proud of it.', 'I would rather not go over it again.', 'It has been on my mind since.', 'I still do not know how it got that far.'] : ['I still think about it.', 'It meant more than I said at the time.', 'I keep meaning to say thank you properly.'])}`, hooks }; }
    const hedge = cvHedge(o, ev, k), soft = k.sus || sbKind(o, ev) === 'rumour';
    { const line = cvRule('ev.tell', cvEvFacts(c, ev, k), p); if (line) return { text: line + (soft ? hedge : ''), hooks }; }
    return { text: `${cvLeadLine(o, p)} ${cvCap(lf2Low(txt))}.${hedge}${Math.random() < 0.7 ? ' ' + cvStanceLine(o, stance) : ''}`, hooks };
  }
  if (layer === 1) {
    if (!actor && !ev.actor && target) { const tp = cvPron(target); return { text: target === o ? pk(['I will live. Everyone keeps telling me so, which is how I know they are worried.', 'It is nothing. It is not nothing. Ask me another day.']) : ev.tags.includes('health') ? `${target.first} will mend. ${cvCap(tp.he)} has people sitting up with ${tp.him}, which is more than some.` : `Nobody did anything. It just happened to ${target.first}. Those are the worst kind.`, hooks }; }
    if (!actor) { const S = k.sus && k.who != null ? byId(k.who) : cvSuspect(c, ev); if (!S) return { text: 'Nobody knows who. That is what bothers me.', hooks }; const ph = cvPron(S); hooks.push(cvPersonHook(S));
      return { text: `Me? I would look at ${S.first}. ${cvEvWhy(o, S)} I am not saying it was ${ph.him}. I am saying I would look.`, hooks }; }
    const rel = cvBackOf(actor).find(b => b.a === (target && target.id) || b.b === (target && target.id)), ph = cvPron(actor);
    if (rel) { hooks.push({ k: 'back', key: 'bk' + rel.id, label: cvLabel({ kind: 'back', back: rel }), back: rel }); return { text: `Why would ${actor.first} do it? You would have to know about ${actor.first} and ${target.first}. They have never got on. ${cvBackText(rel, o, 0) || ''}`, hooks }; }
    { const good = j.v > 0.25, f = { ...cvEvFacts(c, ev, k), good, why: good ? cvGoodWhy(actor) : cvEvWhy(o, actor) }; const a1 = cvRule('ev.why', f, p), a2 = target && target !== o && Math.random() < 0.6 ? cvRule('ev.feel', f, p) : ''; return { text: [a1, a2].filter(Boolean).join(' ') || f.why, hooks }; }
  }
  if (layer === 2) { const from = k.from && byId(k.from); return { text: `${cvFreshest(p, cvAdvise[c.v.arch])}${from === p ? ' Mind you, you are the one who told me.' : from ? ` Mind you, I only have it from ${from.first}, and I would not swear to ${cvPron(from).his} memory.` : ''}`, hooks }; }
  const names = (ev.witnesses || []).map(id => byId(id)).filter(q => q && q !== o && q !== p).slice(0, 3);
  if (!names.length || ev.unseen) return { text: 'Nobody saw it, you see. That is the part that keeps me up.', hooks };
  names.forEach(q => hooks.push(cvPersonHook(q)));
  return { text: `${names.map(q => q.first).join(', ')} ${names.length > 1 ? 'were' : 'was'} there. Ask ${names.length > 1 ? 'them' : cvPron(names[0]).him}. I would, only I have heard enough.`, hooks };
}

function cvTellPerson(c, t, layer): CvUtt | null {
  const o = c.o, p = c.p, q = t.q, a = o.aff[q.id] || 0, kw = kinWord(o, q), ph = cvPron(q), hooks: CvHook[] = [cvHook(t)], L = cvLife(q);
  if (layer === 0) {
    const band = a > 55 ? [`is the best of us. I'd walk into the sea for ${ph.him}.`, `is one of the good ones. Don't tell ${ph.him} I said so; I'd never hear the end of it.`, `is somebody I'd trust with anything. Anything at all.`, `makes this place better just by being in it.`] : a > 20 ? [`is decent. Reliable. That's rarer than people think.`, `is good company, on the whole.`, `is all right. More than all right, some days.`, `has always been fair with me.`] : a > -20 ? [`keeps to ${ph.his} own business. I respect that. Mostly.`, `I hardly know ${ph.him}, to be honest. ${cvCap(ph.he)} seems fine.`, `is somebody I nod to. We nod well.`, `seems pleasant enough. I've no complaints. I've no stories, either.`] : a > -45 ? [`and I don't get on.`, `is somebody I can only take in small amounts.`, `and I have an understanding. We stay out of each other's way.`, `tries my patience. ${cvCap(ph.he)} doesn't even have to try.`] : [`is somebody I'd cross the square to avoid.`, `— I don't say ${ph.his} name in my house.`, `is the worst thing about this village, and the village has a goose.`, `can stay on ${ph.his} side of the lane, and I'll stay on mine.`];
    const rel = cvBackOf(o).find(b => b.a === q.id || b.b === q.id); if (rel) hooks.push({ k: 'back', key: 'bk' + rel.id, label: cvLabel({ kind: 'back', back: rel }), back: rel });
    const job = q.age >= 16 && q.job && LF2_JOBS[q.job] ? lf2JobName(q) : q.age >= 16 && q.job ? (JOB_NOUN[q.job] || '').replace(/^an? /, '') : '';
    const b0 = cvFreshest(p, band), lead = /^(I |—)/.test(b0) ? `${q.first}? ` : `${q.first}${kw && kw !== 'friend' && kw !== 'rival' ? `, my ${kw},` : ''} `; cvMarkHeard(p, b0);
    return { text: `${lead}${b0}${job && a > -45 && Math.random() < 0.4 ? ` ${cvCap(ph.he)} is the ${cvLow(job)}, you know.` : ''}`, hooks };
  }
  if (layer === 1) {
    const rel = cvBackOf(o).find(b => b.a === q.id || b.b === q.id);
    if (rel) { hooks.push({ k: 'back', key: 'bk' + rel.id, label: cvLabel({ kind: 'back', back: rel }), back: rel }); return { text: cvBackText(rel, o, 0) + ' ' + (rel.kind === 'flame' ? 'Do not read too much into it.' : 'I would rather it was not like that.'), hooks }; }
    { const top = sbTopWhy(o, q, a >= 0 ? 1 : -1), wt = top && Math.abs(top.v) >= 3 && sbWhyText(o, q, top);
      if (wt) return { text: a >= 0 ? cvFreshest(p, [`If you want to know why: ${wt}.`, `${cvCap(wt)}. That is why.`, `${cvCap(wt)}. You do not forget a thing like that.`]) : cvFreshest(p, [`Why? ${cvCap(wt)}. That is why.`, `${cvCap(wt)}. I have not forgotten, and I will not.`, `Ask me why and I will tell you: ${wt}.`]), hooks }; }
    const evs = Object.keys(o.kn || {}).map(id => lf2EvById(+id)).filter(ev => ev && ev.actor === q.id && ev.target !== o.id && o.kn[ev.id].a && !o.kn[ev.id].sus && game.time - ev.t < 6 * 1440).sort((x, y) => y.sev - x.sev);
    if (evs.length) { const ev = evs[0], jv = lf2Judge(o, ev, true).v, et = cvMe(o, sbText(o, ev)); hooks.push({ k: 'event', key: 'ev' + ev.id, label: `what ${q.first} did`, ev });
      return { text: jv < -0.3 ? `Honestly? It is what ${q.first} did. ${cvCap(lf2Low(et))}. Hard to look at ${ph.him} the same way.` : jv > 0.3 ? `I think of the time ${lf2Low(et)}. People like that are rarer than they should be.` : `Remember when ${lf2Low(et)}? That is the sort of person ${q.first} is. Take that how you like.`, hooks }; }
    if (kw && !['friend', 'rival', 'sweetheart'].includes(kw)) { const K: any = { son: `Children. You love them and they send you the bill in grey hair.`, daughter: `Children. You love them and they send you the bill in grey hair.`, mother: `Parents. You spend your life turning into them and complaining about it.`, father: `Parents. You spend your life turning into them and complaining about it.`, husband: `Marriage. You learn each other's silences. Some of them are loud.`, wife: `Marriage. You learn each other's silences. Some of them are loud.` };
      return { text: K[kw] || `We grew up too close. You know how it is. You love someone and you cannot stand how ${ph.he} breathes.`, hooks }; }
    const tr = (q.traits || []).find(x => cvTraitWhy[x]); return { text: tr ? cvTraitWhy[tr] : `Nothing I could put a finger on. It is a feeling, and I do not trust feelings, and I have it anyway.`, hooks };
  }
  if (layer === 2) {
    const known = L.secret && L.secretKnownBy.includes(o.id);
    if (known) { hooks.push({ k: 'secret', key: 'qsec' + q.id, label: `${q.first}'s secret`, q }); return { text: `Between us — and I mean that — ${q.first} has something ${ph.he} would rather not have known. I am not saying what. I am saying it exists.`, hooks }; }
    const rum = Object.keys(o.kn || {}).map(id => lf2EvById(+id)).filter(ev => ev && ev.actor === q.id && ev.target !== o.id && o.kn[ev.id].a && !o.kn[ev.id].sus).sort((x, y) => y.t - x.t)[0];
    if (rum) { hooks.push({ k: 'event', key: 'ev' + rum.id, label: `what ${q.first} did`, ev: rum }); return { text: `People say ${lf2Low(cvMe(o, sbText(o, rum)))}. I do not know the half of it. People talk.`, hooks }; }
    return { text: pk([`Past that I know nothing for certain. And I do not guess about people I have to meet at supper.`, `That is the lot. If there is more, nobody has been brave enough to tell me.`, `I have said more than I meant. The rest is theirs to tell.`]), hooks };
  }
  const L3 = L.secret && L.secretKnownBy.includes(o.id); if (!L3) return null;
  cvLearnLife(c, q, 'secret'); return { text: `${q.first} ${cvThird(L.secret.text, q)}. There. I never said it, and neither did you.`, hooks };
}

function cvTellBack(c, t, layer): CvUtt | null {
  const o = c.o, b = t.back, txt = cvBackText(b, o, layer); if (!txt) return null; cvLearnBack(c, b, layer);
  const other = cvOther(b, o), hooks: CvHook[] = [cvHook(t)]; if (other && other !== o) hooks.push(cvPersonHook(other)); const A = byId(b.a), B = byId(b.b); if (!other || other === o) { hooks.push(cvPersonHook(A)); hooks.push(cvPersonHook(B)); }
  return { text: (layer === 0 && !(o.id === b.a || o.id === b.b) ? cvLeadLine(o, c.p) + ' ' : '') + txt, hooks };
}

function cvTellSelf(c, t, layer): CvUtt | null {
  const o = c.o, L = cvLife(o), hooks: CvHook[] = [cvHook(t)];
  switch (t.kind) {
    case 'ambition': return [{ text: cvFreshest(c.p, [`If I'm honest, and I am, with you: I'd like to ${L.ambition}.`, `Do you know what I want? To ${L.ambition}. There. I've said it.`, `One day I'm going to ${L.ambition}. Don't laugh.`]), hooks }, { text: pk(CV_LIFEQ.amb.stop), hooks }, { text: 'I\'ve never said that out loud. It sounds smaller outside my head.', hooks }][layer] || null;
    case 'regret': return [{ text: `${cvCap(cvFirst(L.regret.t))}. ${pk(['If I could undo one thing, that\'s the one.', 'It still sits with me.', 'I think about it more than I should.'])}`, hooks }, { text: L.regret.how, hooks }, { text: 'I never told anyone how it felt. I\'m not sure I know.', hooks }][layer] || null;
    case 'pride': return [{ text: `${cvCap(cvFirst(L.pride.t))}. ${pk(['Ask anyone. Well. Don\'t ask anyone. They\'d say I made it up.', 'True story.', 'I don\'t say it often. I think it often.'])}`, hooks }, { text: L.pride.how, hooks }][layer] || null;
    case 'fear': return [{ text: `${cvCap(cvFirst(L.fear.t))}, if you want the truth.`, hooks }, { text: L.fear.since, hooks }][layer] || null;
    case 'secret': { if (!L.secret) return null; if (layer === 0) return { text: 'There is something I do not talk about. Not because it is terrible. Because it is mine.', hooks };
      cvLearnLife(c, o, 'secret'); if (layer === 1) return { text: `${cvCap(cvFirst(L.secret.text))}. There. Now you have it.`, hooks };
      const kb = L.secretKnownBy.map(id => byId(id)).filter(q => q && !q.dead); kb.forEach(q => hooks.push(cvPersonHook(q))); return kb.length ? { text: `${kb.map(q => q.first).join(' and ')} know${kb.length > 1 ? '' : 's'}. If it gets round, I will know who to thank.`, hooks } : { text: 'You are the only person who knows. Please keep it that way.', hooks }; }
    case 'state': { const s = CV_STATES.find(x => x.id === t.id); if (!s) return null; let q = null; try { q = s.q ? s.q(c) : null; } catch (e) {} if (q && q !== c.p && !q.dead) hooks.push(cvPersonHook(q)); const d = layer === 0 ? pk(s.say, c) : pk(s.deeper, c); return d ? { text: (q ? cvQ(d, q) : d).replace('{tools}', '16'), hooks } : null; }
  }
  return null;
}
const CV_LEGEND_FLAVOUR: any = { cynic: ' Rubbish, obviously. I still would not drink from it.', sunny: ' I think it is lovely.', wary: ' Do not repeat that where it can hear you.', talkative: ' And that is the short version.', smooth: ' I tell it better after a drink.', lonely: ' Nobody asks me about it any more. Thank you.' };
function cvTellLegend(c, t, layer): CvUtt | null {
  const g = CV_LEGENDS.find(x => x.id === t.id); if (!g || !g.parts[layer]) return null; cvKnows(c.p).legend[g.id] = Math.max(cvKnows(c.p).legend[g.id] || 0, layer + 1);
  return { text: g.parts[layer] + (layer === g.parts.length - 1 ? (CV_LEGEND_FLAVOUR[c.v.arch] || '') : ''), hooks: [cvHook(t, g.title)] };
}
function cvTellWorld(c, t, layer): CvUtt | null {
  const o = c.o, hooks: CvHook[] = [cvHook(t, 'that')];
  switch (t.facet) {
    case 'low': return { text: cvFreshest(c.p, ['The tide\'s right out. The flats are full of crabs and children, and I wouldn\'t stand between either and a puddle.', 'Low water. You can smell it from here. Good for cockles, bad for noses.', 'The sea\'s gone out so far you could walk to the mainland. Don\'t.']), hooks };
    case 'high': return { text: cvFreshest(c.p, ['Water\'s right up to the wall. Mind your feet on the flats; it comes in faster than you think.', 'High tide. The boats are all bobbing about like they\'re pleased with themselves.', 'The sea\'s in a mood. Right up to the steps.']), hooks };
    case 'rest': return { text: cvFreshest(c.p, ['Rest day. I intend to do nothing, loudly.', 'Rest day! No axes, no ploughs, no excuses.', 'It\'s rest day, and I\'ve already been told off twice for working.']), hooks };
    case 'eve': return { text: cvFreshest(c.p, ['Tomorrow\'s rest day, so everybody\'s pretending to work today. It\'s rather touching.', 'One more day, then rest. I can taste it.', 'Rest day tomorrow. I\'ve plans. The plans are a nap.']), hooks };
    case 'feast': return { text: cvFreshest(c.p, ['There\'s a bonfire on the square. Everyone\'s pretending they aren\'t going.', 'The bonfire\'s lit! Have you seen it? You can feel it from the well.', 'Feast night. Somebody will sing, and somebody will regret it.']), hooks };
    case 'out': { const r = rooms.find(x => x.id === t.id) || rooms[t.id], g = t.extra; if (!r) return null; return { text: `${LF2_BLD[r.kind] || 'The shop'} is out of ${GOODS[g] ? GOODS[g].name : g} again. I could cry. I might.`, hooks }; }
    case 'biz': return { text: anyOf(['Business is thin. People walk past and look at the floor. I charge fair. I do not know what else they want from me.', 'The takings would not feed a sparrow. I do not say it to the customers; they feel bad enough.']), hooks };
  }
  return null;
}
function cvTellChron(c, t, layer): CvUtt | null {
  if (layer > 0) return null; const txt = t.extra.text as string, named = npcs.filter(q => !q.dead && q !== c.o && q !== c.p && new RegExp('\\b' + q.first + '\\b').test(txt)).slice(0, 2);
  if (!named.length || new RegExp('\\b' + c.o.first + '\\b').test(txt)) return null;
  return { text: `${cvLeadLine(c.o, c.p)} ${cvCap(cvSpeechOf(c.o, txt, c.p))}.`, hooks: named.map(cvPersonHook) };
}
const cvLiked = { liked: ['People like you, you know. I wasn\'t sure you realised.', 'You have a good name round here. Don\'t waste it.', 'Your name comes up. Nicely, for once. Usually names come up the other way.', 'Somebody said you\'re the best thing to happen to the lane in years. I didn\'t argue.'], disliked: ['People are talking about you, {p}. Not kindly.', 'I\'ll say it plainly: your name isn\'t a good one at the moment.', 'I\'d keep my head down for a bit, if I were you. People talk.', 'You\'ve upset people. I\'m not saying who. I\'m saying people.'] };
function cvTellPlayer(c, t, layer): CvUtt | null {
  const o = c.o, p = c.p, v = c.v.arch, hooks: CvHook[] = [cvHook(t, 'that')];
  switch (t.facet) {
    case 'saw': { const s = t.extra, q = byId(s.target); if (!q) return null; const a = o.aff[q.id] || 0; hooks.push(cvPersonHook(q));
      return { text: `I saw you shove ${q.first} out of the way. ${a > 35 ? 'Not nice, that.' : a < -20 ? 'I enjoyed that more than I should have.' : 'No harm done, I suppose. Everyone is fair game round here, apparently.'}`, hooks }; }
    case 'carry': { const g = t.extra, n = GOODS[g] ? GOODS[g].name : g; hooks[0] = { k: 'question', key: 'q:carry', label: 'that', id: 'carry', extra: n }; return { text: `What are you hauling all that ${n} about for? You look like a pack mule with opinions.`, hooks }; }
    case 'suspect': { const ev = t.ev; hooks[0] = cvHook({ kind: 'event', key: 'ev' + ev.id, ev }, 'what they say you did');
      const L: any = { wary: 'You are not going to take my purse, are you? I heard what you did.', prickly: 'I have heard what you did. Keep your hands off my things.', smooth: 'I heard something about you. I am not judging. I am… interested.', nosy: `Is it true? What they say you did? ${cvCap(ev.text)}. Tell me everything.`, cynic: `So you are the one who ${lf2Low(ev.text)}. I thought thieves would be taller.`, talkative: `Well! ${cvCap(ev.text)}. Everyone is talking. I almost did not talk to you. Almost.`, sunny: 'Oh, I heard about it. I am sure there is an explanation. Is there an explanation?', reserved: 'I heard. I have nothing to say about it. Yet.', lonely: 'They say things about you. I do not care. I am just glad you are here.' };
      return { text: L[v], hooks }; }
    case 'helped': return { text: anyOf(['I have not forgotten you helped me. People do not, round here. Not the good bits, at least.', 'You helped me, and I never said thank you properly. Thank you.']), hooks };
    case 'heard': { const ev = t.ev; hooks[0] = cvHook({ kind: 'event', key: 'ev' + ev.id, ev }, 'that'); return { text: `${cvLeadLine(o, p)} ${cvCap(lf2Low(cvMe(o, sbText(o, ev))))}. That was you, was it not?`, hooks }; }
    case 'liked': case 'disliked': return { text: cvLine(o, cvLiked[t.facet], p, 'rep'), hooks };
  }
  return null;
}
function cvTellAct(c): CvUtt { return { text: cvActSay(c), hooks: [{ k: 'act', key: 'act', label: 'that' }] }; }

/** one layer of a topic, as words (null when there is nothing deeper) */
function cvTell(c, t: any, layer: number): CvUtt | null {
  c.told[t.key] = Math.max(c.told[t.key] || 0, layer + 1); c.depth[t.key] = layer; cvMem(c.o, c.p).topics[t.key] = game.time;
  switch (t.kind) { case 'event': return cvTellEvent(c, t, layer); case 'person': return cvTellPerson(c, t, layer); case 'back': return cvTellBack(c, t, layer);
    case 'ambition': case 'regret': case 'pride': case 'fear': case 'secret': case 'state': return cvTellSelf(c, t, layer); case 'legend': return cvTellLegend(c, t, layer);
    case 'world': return layer > 0 ? null : cvTellWorld(c, t, layer); case 'chron': return cvTellChron(c, t, layer); case 'player': return cvTellPlayer(c, t, layer); case 'rel': return cvTellRel(c, t, layer); case 'conv': return cvTellConv(c, t, layer); case 'act': return cvTellAct(c); }
  return null;
}
