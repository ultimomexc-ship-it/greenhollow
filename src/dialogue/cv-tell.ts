/* ================= dialogue / cv-tell: turning a topic into words, one layer at a time =================
   Layer 0 is the hint or the headline, 1 the story or the reason, 2 and 3 what they do not usually say. Every layer names things the player can
   follow up (other people, an event, an old story), which is how a conversation wanders somewhere nobody planned.                        */
const cvKindWord: any = { theft: 'theft', pickpocket: 'stolen purse', quarrel: 'quarrel', brawl: 'brawl', insult: 'insult', gift: 'gift', help: 'kindness', fined: 'fine', arrest: 'arrest', escape: 'escape', bribe: 'bribe', breakin: 'break-in', snoop: 'snooping', robbed: 'robbery', jealous: 'jealous scene', flirt: 'flirting', crush: 'crush', confront: 'confrontation', cheat: 'cheating', sabotage: 'sabotage', blockdoor: 'blocked door', shutin: 'locked door', stumble: 'tumble', smelly: 'smell', sing: 'singing', rumour: 'rumour', dice: 'dice game', charity: 'charity', repair: 'repair', newclothes: 'new clothes', dole: 'grain dole', report: 'report', blackmail: 'blackmail', distract: 'distraction', knock: 'knocking', wake: 'wake-up' };
function cvLabel(t: any): string {
  switch (t.kind) {
    case 'event': { const a = t.ev.actor ? lf2By(t.ev.actor) : null, g = lf2By(t.ev.target); return a && g ? `the ${cvKindWord[t.ev.kind] || 'business'} between ${a.first} and ${g.first}` : g ? `what happened to ${g.first}` : a ? `what ${a.first} did` : `the ${cvKindWord[t.ev.kind] || 'business'}`; }
    case 'person': return t.q.first;
    case 'back': { const a = byId(t.back.a), b = byId(t.back.b); return t.back.kind === 'debt' ? `the money between ${a.first} and ${b.first}` : t.back.kind === 'feud' ? `the quarrel between ${a.first} and ${b.first}` : `${a.first} and ${b.first}`; }
    case 'ambition': return 'that dream'; case 'regret': return 'that regret'; case 'pride': return 'that story'; case 'fear': return 'that fear'; case 'secret': return 'that secret';
    case 'state': return 'that'; case 'legend': return (CV_LEGENDS.find(g => g.id === t.id) || { title: 'that' }).title;
    default: return 'that';
  }
}
const cvHook = (t: any, label?: string): CvHook => ({ k: t.kind, key: t.key, label: label || cvLabel(t), q: t.q, ev: t.ev, back: t.back, facet: t.facet, id: t.id, extra: t.extra });
const cvPersonHook = (q): CvHook => ({ k: 'person', key: 'pe' + q.id, label: q.first, q });
const cvAdvise: any = { talkative: 'I would stand on the square and tell everyone, frankly.', reserved: 'I would say nothing. And I would watch.', nosy: 'I am going to find out the rest. I always do.', cynic: 'Nothing. Nothing ever comes of it.', sunny: 'I would hope they sort it out between themselves.', wary: 'I would lock my door and hope for the best.', prickly: 'I would have it out with them. Loudly.', smooth: 'I would make use of it. Quietly.', lonely: 'I would bake them something. I do not know why. It is what I do.' };
const cvTraitWhy: any = { greedy: 'Light fingers, that one. Always has been.', grumpy: 'Temper like a kicked goat.', lazy: 'Always about, never doing.', shy: 'The quiet ones, you never quite know.', proud: 'Cannot stand being wrong. Cannot stand anyone else being right.', anxious: 'Frightened people do odd things.', gossipy: 'Talks too much. Fills the gaps with whatever is to hand.', brave: 'Does not think before doing. Never has.', devout: 'Judges everyone, quietly, from a great height.', curious: 'Gets into everything. Eventually, into the wrong thing.', jovial: 'Laughs it off. Then you find out what was behind the laugh.', cheerful: 'Too cheerful. Nobody is that happy for no reason.', dreamy: 'Head in the clouds; hands somewhere they should not be.', generous: 'Gives with one hand, keeps a ledger with the other.', sociable: 'Everyone\'s friend. Which means nobody\'s.', homebody: 'Never goes out. Which is when you wonder what they get up to.' };
const cvTraitGood: any = { generous: 'Gives with both hands, that one. Always has.', cheerful: 'Cannot help being kind. It is like a cough.', devout: 'Does it quietly and tells no one. Which is how I know.', brave: 'Does what needs doing, never mind who is looking.', jovial: 'Does good the way other people do gossip: constantly, and with relish.', shy: 'Never makes a fuss about it. You only find out afterwards.', sociable: 'Likes people. It really is that simple, in the end.', dreamy: 'Does the right thing and forgets to mention it.' };
const cvGoodWhy = (S) => { const t = (S.traits || []).find(x => cvTraitGood[x]); return t ? cvTraitGood[t] : `That is simply what ${S.first} is like. Always has been.`; };
const cvEvWhy = (o, S) => { const t = (S.traits || []).find(x => cvTraitWhy[x]); return t ? cvTraitWhy[t] : 'No reason. A feeling.'; };
function cvStanceOf(ev, j) { if (j.pity > 0.7 && j.v >= -0.6) return 'pity'; if (j.v < -0.55) return 'outraged'; if (ev.tags.some(t => ['embarrass', 'funny', 'prank', 'drunk', 'smelly'].includes(t)) && Math.abs(j.v) < 0.7) return 'amused'; if (j.v > 0.4) return 'warm'; if (j.v < -0.2) return 'outraged'; return 'shrug'; }
function cvSuspect(c, ev) {
  const o = c.o, key = ev.id; o.cvSusp = o.cvSusp || {}; if (o.cvSusp[key]) return byId(o.cvSusp[key]);
  const cand = npcs.filter(q => q !== o && !q.dead && !q.infant && q.age >= 14 && q.id !== ev.target && q !== c.p).map(q => ({ q, s: -(o.aff[q.id] || 0) + (q.traits.includes('greedy') ? 15 : 0) + Math.random() * 30 })).sort((a, b) => b.s - a.s);
  const pick = cand[0] && cand[0].q; if (pick) o.cvSusp[key] = pick.id; return pick;
}

function cvTellEvent(c, t, layer): CvUtt | null {
  const o = c.o, p = c.p, ev = t.ev, k = o.kn && o.kn[ev.id]; if (!k) return null;
  const j = lf2Judge(o, ev, k.a), stance = cvStanceOf(ev, j), actor = k.a ? lf2By(ev.actor) : null, target = lf2By(ev.target), txt = k.a ? ev.text : (ev.anonText || ev.text), hooks: CvHook[] = [cvHook(t)];
  if (actor && actor !== o) hooks.push(cvPersonHook(actor)); if (target && target !== o && target !== actor) hooks.push(cvPersonHook(target));
  if (layer === 0) {
    lf2Tell(o, p, ev, false, true);
    const src = k.from ? ` ${byId(k.from) ? byId(k.from).first : 'Someone'} told me.` : k.mine ? '' : ' I saw it myself.';
    return { text: `${cvLeadLine(o, p)} ${cvCap(lf2Low(txt))}.${src}${Math.random() < 0.7 ? ' ' + cvStanceLine(o, stance) : ''}`, hooks };
  }
  if (layer === 1) {
    if (!actor) { const S = cvSuspect(c, ev); if (!S) return { text: 'Nobody knows who. That is what bothers me.', hooks }; const ph = cvPron(S); hooks.push(cvPersonHook(S));
      return { text: `Me? I would look at ${S.first}. ${cvEvWhy(o, S)} I am not saying it was ${ph.him}. I am saying I would look.`, hooks }; }
    const rel = cvBackOf(actor).find(b => b.a === (target && target.id) || b.b === (target && target.id)), ph = cvPron(actor);
    if (rel) { hooks.push({ k: 'back', key: 'bk' + rel.id, label: cvLabel({ kind: 'back', back: rel }), back: rel }); return { text: `Why would ${actor.first} do it? You would have to know about ${actor.first} and ${target.first}. They have never got on. ${cvBackText(rel, o, 0) || ''}`, hooks }; }
    if (j.v > 0.25) return { text: `Why did ${actor.first} do it? ${cvGoodWhy(actor)} ${target && target !== o ? `${target.first} will not forget it.` : ''}`.trim(), hooks };
    return { text: `Why would ${actor.first} do it? ${cvEvWhy(o, actor)} ${target && target !== o ? `And ${target.first} was always going to be the one to feel it.` : ''}`.trim(), hooks };
  }
  if (layer === 2) { const from = k.from && byId(k.from); return { text: `${cvAdvise[c.v.arch]}${from ? ` Mind you, I only have it from ${from.first}, and I would not swear to ${cvPron(from).his} memory.` : ''}`, hooks }; }
  const names = (ev.witnesses || []).map(id => byId(id)).filter(q => q && q !== o && q !== p).slice(0, 3);
  if (!names.length || ev.unseen) return { text: 'Nobody saw it, you see. That is the part that keeps me up.', hooks };
  names.forEach(q => hooks.push(cvPersonHook(q)));
  return { text: `${names.map(q => q.first).join(', ')} ${names.length > 1 ? 'were' : 'was'} there. Ask ${names.length > 1 ? 'them' : cvPron(names[0]).him}. I would, only I have heard enough.`, hooks };
}

function cvTellPerson(c, t, layer): CvUtt | null {
  const o = c.o, p = c.p, q = t.q, a = o.aff[q.id] || 0, kw = kinWord(o, q), ph = cvPron(q), hooks: CvHook[] = [cvHook(t)], L = cvLife(q);
  if (layer === 0) {
    const band = a > 55 ? [`is the best of us. I would walk into the sea for ${ph.him}.`, `is one of the good ones. Do not tell ${ph.him} I said so; I would never hear the end of it.`] : a > 20 ? [`is decent. Reliable. That is rarer than people think.`, `is good company, on the whole.`] : a > -20 ? [`keeps to ${ph.his} own business. I respect that. Mostly.`, `I hardly know ${ph.him}, to be honest. ${cvCap(ph.he)} seems fine.`] : a > -45 ? [`and I do not get on.`, `is somebody I can only take in small quantities.`] : [`is somebody I would cross the square to avoid.`, `— I do not say ${ph.his} name in my house.`];
    const rel = cvBackOf(o).find(b => b.a === q.id || b.b === q.id); if (rel) hooks.push({ k: 'back', key: 'bk' + rel.id, label: cvLabel({ kind: 'back', back: rel }), back: rel });
    const job = q.age >= 16 && q.job && LF2_JOBS[q.job] ? lf2JobName(q) : q.age >= 16 && q.job ? (JOB_NOUN[q.job] || '').replace(/^an? /, '') : '';
    return { text: `${q.first}${kw && kw !== 'friend' && kw !== 'rival' ? `, my ${kw},` : ''} ${anyOf(band)}${job && a > -45 && Math.random() < 0.4 ? ` ${cvCap(ph.he)} is the ${cvLow(job)}, you know.` : ''}`, hooks };
  }
  if (layer === 1) {
    const rel = cvBackOf(o).find(b => b.a === q.id || b.b === q.id);
    if (rel) { hooks.push({ k: 'back', key: 'bk' + rel.id, label: cvLabel({ kind: 'back', back: rel }), back: rel }); return { text: cvBackText(rel, o, 0) + ' ' + (rel.kind === 'flame' ? 'Do not read too much into it.' : 'I would rather it was not like that.'), hooks }; }
    const evs = Object.keys(o.kn || {}).map(id => lf2EvById(+id)).filter(ev => ev && ev.actor === q.id && o.kn[ev.id].a && game.time - ev.t < 6 * 1440).sort((x, y) => y.sev - x.sev);
    if (evs.length) { const ev = evs[0], jv = lf2Judge(o, ev, true).v; hooks.push({ k: 'event', key: 'ev' + ev.id, label: `what ${q.first} did`, ev });
      return { text: jv < -0.3 ? `Honestly? It is what ${q.first} did. ${cvCap(lf2Low(ev.text))}. Hard to look at ${ph.him} the same way.` : jv > 0.3 ? `I think of the time ${lf2Low(ev.text)}. People like that are rarer than they should be.` : `Remember when ${lf2Low(ev.text)}? That is the sort of person ${q.first} is. Take that how you like.`, hooks }; }
    if (kw && !['friend', 'rival', 'sweetheart'].includes(kw)) { const K: any = { son: `Children. You love them and they send you the bill in grey hair.`, daughter: `Children. You love them and they send you the bill in grey hair.`, mother: `Parents. You spend your life turning into them and complaining about it.`, father: `Parents. You spend your life turning into them and complaining about it.`, husband: `Marriage. You learn each other's silences. Some of them are loud.`, wife: `Marriage. You learn each other's silences. Some of them are loud.` };
      return { text: K[kw] || `We grew up too close. You know how it is. You love someone and you cannot stand how ${ph.he} breathes.`, hooks }; }
    const tr = (q.traits || []).find(x => cvTraitWhy[x]); return { text: tr ? cvTraitWhy[tr] : `Nothing I could put a finger on. It is a feeling, and I do not trust feelings, and I have it anyway.`, hooks };
  }
  if (layer === 2) {
    const known = L.secret && L.secretKnownBy.includes(o.id);
    if (known) { hooks.push({ k: 'secret', key: 'qsec' + q.id, label: `${q.first}'s secret`, q }); return { text: `Between us — and I mean that — ${q.first} has something ${ph.he} would rather not have known. I am not saying what. I am saying it exists.`, hooks }; }
    const rum = Object.keys(o.kn || {}).map(id => lf2EvById(+id)).filter(ev => ev && ev.actor === q.id && o.kn[ev.id].a).sort((x, y) => y.t - x.t)[0];
    if (rum) { hooks.push({ k: 'event', key: 'ev' + rum.id, label: `what ${q.first} did`, ev: rum }); return { text: `There is the matter of ${cvLow(rum.text)}. I do not know the half of it. People talk.`, hooks }; }
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
    case 'ambition': return [{ text: `If I am honest, and I am, with you: I would like to ${L.ambition}.`, hooks }, { text: anyOf(['What is stopping me? Time. Coin. Nerve. Mostly nerve.', 'People think wanting is the hard part. It is the easy part. The rest is getting out of bed.']), hooks }, { text: 'I have never said that out loud. It sounds smaller outside my head.', hooks }][layer] || null;
    case 'regret': return [{ text: `${cvCap(cvFirst(L.regret))}. If I could undo one thing, that is the one.`, hooks }, { text: 'It comes back when it is quiet. Rain, mostly.', hooks }, { text: 'I never told anyone how it felt. I am not sure I know.', hooks }][layer] || null;
    case 'pride': return [{ text: `${cvCap(cvFirst(L.pride))}. Ask anyone. Well. Do not ask anyone. They would say I made it up.`, hooks }, { text: 'It is the one story I have that is entirely mine.', hooks }][layer] || null;
    case 'fear': return [{ text: `${cvCap(cvFirst(L.fear))}, if you want the truth.`, hooks }, { text: 'I know it is silly. Knowing does not help.', hooks }][layer] || null;
    case 'secret': { if (!L.secret) return null; if (layer === 0) return { text: 'There is something I do not talk about. Not because it is terrible. Because it is mine.', hooks };
      cvLearnLife(c, o, 'secret'); if (layer === 1) return { text: `${cvCap(cvFirst(L.secret.text))}. There. Now you have it.`, hooks };
      const kb = L.secretKnownBy.map(id => byId(id)).filter(q => q && !q.dead); kb.forEach(q => hooks.push(cvPersonHook(q))); return kb.length ? { text: `${kb.map(q => q.first).join(' and ')} know${kb.length > 1 ? '' : 's'}. If it gets round, I will know who to thank.`, hooks } : { text: 'You are the only person who knows. Please keep it that way.', hooks }; }
    case 'state': { const s = CV_STATES.find(x => x.id === t.id); if (!s) return null; return layer === 0 ? { text: pk(s.say, c), hooks } : { text: pk(s.deeper, c).replace('{tools}', '16'), hooks }; }
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
    case 'low': return { text: 'The tide is right out. The flats are full of crabs and children, and I would not stand between either and a puddle.', hooks };
    case 'high': return { text: 'Water is right up to the wall. Mind your feet on the flats; it comes in faster than you think.', hooks };
    case 'rest': return { text: 'Rest day. I intend to do nothing, loudly.', hooks };
    case 'eve': return { text: 'Tomorrow is rest day, so everybody is pretending to work today. It is rather touching.', hooks };
    case 'feast': return { text: 'There is a bonfire on the square. Everyone is pretending they are not going.', hooks };
    case 'out': { const r = rooms[t.id], g = t.extra; return { text: `${LF2_BLD[r.kind] || 'The shop'} is out of ${GOODS[g] ? GOODS[g].name : g} again. I could cry. I might.`, hooks }; }
    case 'biz': return { text: anyOf(['Business is thin. People walk past and look at the floor. I charge fair. I do not know what else they want from me.', 'The takings would not feed a sparrow. I do not say it to the customers; they feel bad enough.']), hooks };
  }
  return null;
}
function cvTellChron(c, t, layer): CvUtt | null {
  if (layer > 0) return null; const txt = t.extra.text as string, named = npcs.filter(q => !q.dead && q !== c.o && q !== c.p && new RegExp('\\b' + q.first + '\\b').test(txt)).slice(0, 2);
  if (!named.length || new RegExp('\\b' + c.o.first + '\\b').test(txt)) return null;
  return { text: `${cvLeadLine(c.o, c.p)} ${txt}`, hooks: named.map(cvPersonHook) };
}
const cvLiked = { liked: ['People like you, you know. I was not sure you realised.', 'You have a good name round here. Do not waste it.'], disliked: ['People are talking about you, {p}. Not kindly.', 'I will say it plainly: your name is not a good one at the moment.'] };
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
    case 'heard': { const ev = t.ev; hooks[0] = cvHook({ kind: 'event', key: 'ev' + ev.id, ev }, 'that'); return { text: `${cvLeadLine(o, p)} ${cvCap(lf2Low(ev.text))}. That was you, was it not?`, hooks }; }
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
    case 'world': return layer > 0 ? null : cvTellWorld(c, t, layer); case 'chron': return cvTellChron(c, t, layer); case 'player': return cvTellPlayer(c, t, layer); case 'act': return cvTellAct(c); }
  return null;
}
