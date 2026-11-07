/* ================= life2 / core: events, witnesses, opinions, gossip, reputation =================
   Everything that happens is an EVENT described by tags:
       lfEmit('theft', { actor, target, sev: 2, tags: ['theft', 'crime'], text: 'Gaius took bread from Julia' })
   People who notice it (distance, light, walls, which way they face, how busy they are) learn it FIRST HAND. They judge it by
   the tags, their own character and their ties to the people involved, and may pass it on as a RUMOUR (less certain, and it
   can lose the "who did it" along the way). Opinions move liking, mood, reputation and memory; reaction handlers (guards,
   revenge, comfort...) hook in through LF2.react. A new mechanic only has to emit events with tags to join all of this.      */
const LF2: any = { shadows: false, react: [], tickers: [], hourly: [], pre: [], preD: [], dec: [], work: [], frame: [], verbs: [], social: [],
  feat: { gossip: true, law: true, npccrime: true, economy: true, cooking: true, couples: true, baths: true, tavern: true, romance: true, nightlocks: true, revenge: true } };
const LF2_FEATN = { gossip: 'Gossip and rumours', law: 'Guards, fines and jail', npccrime: 'Villagers commit crimes too', economy: 'Coins, trades and shops', cooking: 'Home cooking', couples: 'Couples go to bed together',
  baths: 'Hygiene and the public baths', tavern: 'Drinking, dice and brawls', romance: 'Crushes, affairs and jealousy', nightlocks: 'Doors barred at night', revenge: 'Grudges and getting even' };
LF2.on = k => LF2.feat[k] !== false;
try { const s = JSON.parse(localStorage.getItem('gh_feat') || 'null'); if (s) for (const k in s) if (k in LF2.feat) LF2.feat[k] = !!s[k]; } catch (e) {}
const lf2Save = () => { try { localStorage.setItem('gh_feat', JSON.stringify(LF2.feat)); } catch (e) {} };

/* what each tag means: v = how it reflects on the doer, spice = how worth repeating, pity = sympathy for whoever it happened to */
const LF2_TAGS = {
  harm: { v: -1, spice: 1.2, pity: 1 }, violence: { v: -1.3, spice: 1.6, pity: 1.2 }, theft: { v: -1, spice: 1.5, pity: 0.8 }, trespass: { v: -0.5, spice: 0.8, pity: 0.1 },
  nuisance: { v: -0.4, spice: 0.9, pity: 0.4 }, deceit: { v: -0.8, spice: 1.3, pity: 0.6 }, embarrass: { v: -0.12, spice: 1.4, pity: 0.35 }, scandal: { v: -0.35, spice: 2, pity: 0.3 },
  kindness: { v: 1, spice: 0.7, pity: 0 }, help: { v: 1, spice: 0.9, pity: 0 }, generous: { v: 0.9, spice: 0.7, pity: 0 }, brave: { v: 0.7, spice: 1, pity: 0 }, funny: { v: 0.4, spice: 1.1, pity: 0 },
  misfortune: { v: 0, spice: 1, pity: 1 }, romance: { v: 0.05, spice: 1.8, pity: 0 }, drunk: { v: -0.2, spice: 1.2, pity: 0.1 }, crime: { v: 0, spice: 1.3, pity: 0 }, prank: { v: -0.15, spice: 1.3, pity: 0.2 },
  arrest: { v: -0.6, spice: 1.6, pity: 0.2 }, justice: { v: 0.4, spice: 0.8, pity: 0 }, smelly: { v: -0.15, spice: 0.45, pity: 0 }, rich: { v: 0.1, spice: 0.6, pity: 0 }, gamble: { v: -0.1, spice: 0.8, pity: 0 },
  affair: { v: -0.6, spice: 2.2, pity: 0.9 }, jealous: { v: -0.3, spice: 1.4, pity: 0.3 }, sabotage: { v: -1, spice: 1.4, pity: 0.6 }, bribe: { v: -0.7, spice: 1.5, pity: 0 }
};
Object.assign(LF2_TAGS, { health: { v: 0, spice: 1, pity: 1.2 }, debt: { v: -0.4, spice: 1.3, pity: 0.3 }, honest: { v: 0.5, spice: 0.7, pity: 0 }, news: { v: 0, spice: 0.8, pity: 0 }, business: { v: 0, spice: 0.7, pity: 0.3 } });
/* character bends a judgement */
const LF2_TRAITMUL = {
  theft: { devout: 1.4, greedy: 0.5, generous: 1.2 }, trespass: { devout: 1.2, anxious: 1.3, curious: 0.6 }, nuisance: { grumpy: 1.6, anxious: 1.3, jovial: 0.5, cheerful: 0.6 },
  harm: { anxious: 1.3 }, violence: { anxious: 1.4, brave: 0.7 }, scandal: { devout: 2, jovial: 0.3 }, embarrass: { proud: 1.4, jovial: 0.5 }, kindness: { generous: 1.3, grumpy: 0.7 },
  funny: { grumpy: 0.4, jovial: 1.5, cheerful: 1.2 }, drunk: { devout: 1.8, jovial: 0.4 }, prank: { grumpy: 2, anxious: 1.5, jovial: 0.2, cheerful: 0.5 }, deceit: { devout: 1.3 },
  affair: { devout: 2, jovial: 0.6 }, gamble: { devout: 2, greedy: 0.3, jovial: 0.3 }, smelly: { proud: 1.5 }, bribe: { devout: 1.6, greedy: 0.3 }, arrest: { devout: 1.3, brave: 0.8 }
};
const lf2Ev = () => town.ev || (town.ev = []);
const lf2By = id => id == null ? null : byId(id);
const lf2EvById = id => { const e = lf2Ev(); for (let i = e.length - 1; i >= 0; i--) if (e[i].id === id) return e[i]; return null; };
const lf2Has = (n, t) => !!n && n.traits && n.traits.includes(t);
const lf2Cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const lf2Low = s => s && /^(Somebody|Someone|The|A|An|Nobody|Food|Word)\b/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s;

/* how likely someone is to notice something at (x, y): distance, light, walls, where they are looking, how busy they are */
function lf2Notice(o, x, y, loud?) {
  if (!o || o.dead || o.infant || o.inShip || o.age < 4 || o.jailHide) return 0;
  const d = Math.hypot(o.tx - x, o.ty - y);
  if (o.pose === 'sleep') return loud && d < 6 ? (lf2Has(o, 'anxious') ? 0.5 : 0.22) : 0;
  const day = daylight((game.time % 1440) / 60), R = 3.5 + 8.5 * day + (loud ? 4 : 0);
  if (d > R) return 0;
  if (d <= 1.5) return 0.95;
  if (seeThrough(o.tx, o.ty, x, y) < 0.5) return loud && d < 6 ? 0.5 : 0;
  const f = o.face || { dx: 0, dy: 1 }, dot = (f.dx * (x - o.tx) + f.dy * (y - o.ty)) / d;
  let p = (dot > 0.3 ? 1 : dot > -0.3 ? 0.65 : 0.3) * (1.25 - d / (R + 1));
  const st = o.plan && o.plan[o.si];
  if (st && st.act === 'work') p *= 0.7; if (st && st.act === 'eat') p *= 0.8; if (o.talkUntil > game.time) p *= 0.75;
  if ((o.drunk || 0) > 50) p *= 0.5; if (lf2Has(o, 'curious')) p *= 1.3; if (lf2Has(o, 'dreamy')) p *= 0.7; if (lf2Has(o, 'anxious')) p *= 1.15;
  if (o.job === 'Guard' && lf2OnDuty(o)) p *= 1.5;
  if (loud) p = Math.max(p, 0.6);
  return Math.max(0, Math.min(1, p));
}
function lf2Witnesses(x, y, skip, loud) {
  const out = [];
  for (const o of npcs) { if (skip && skip.includes(o)) continue; const p = lf2Notice(o, x, y, loud); if (p > 0 && Math.random() < p) out.push(o); }
  return out;
}
/* would anyone see me here right now? (used by villagers deciding whether to risk something) */
function lf2Watchers(x, y, skip) { let s = 0; for (const o of npcs) { if (skip && skip.includes(o)) continue; s += lf2Notice(o, x, y, false); } return s; }

/* ---- the heart of it ---- */
function lfEmit(kind, o) {
  const a = o.actor || null, t = o.target || null;
  const ev: any = { id: (town.evId = (town.evId || 0) + 1), kind, t: game.time, actor: a ? a.id : null, target: t ? t.id : null,
    x: o.x != null ? o.x : (a ? a.tx : t ? t.tx : 0), y: o.y != null ? o.y : (a ? a.ty : t ? t.ty : 0), sev: o.sev == null ? 1 : o.sev, tags: o.tags || [],
    text: o.text || kind, anonText: o.anonText || null, mem: o.mem || null, cause: o.cause || null, fake: !!o.fake, anon: !!o.anon, know: [], chain: [], effects: [], witnesses: [], place: o.place || (a ? placeOf(a) : '') };
  const evs = lf2Ev(); evs.push(ev); if (evs.length > 1500) evs.splice(0, evs.length - 1500);
  let w = o.witnessIds ? o.witnessIds.map(lf2By).filter(Boolean) : lf2Witnesses(ev.x, ev.y, [a], o.loud);
  if (t && o.aware !== false && !t.dead && (t.pose !== 'sleep' || o.loud) && !w.includes(t)) w.push(t);
  if (t && o.aware === false) w = w.filter(q => q !== t);
  if (a) w = w.filter(q => q !== a);
  ev.witnesses = w.map(q => q.id); ev.unseen = !w.some(q => q !== t || !o.anon);
  ev.sawActor = o.anon ? (o.sawActor || []).slice() : null;
  if (a && !a.dead) { (a.kn || (a.kn = {}))[ev.id] = { t: game.time, from: null, cert: 1, a: true, mine: true }; ev.know.push(a.id); }
  for (const q of w) lf2Learn(q, ev, null, 1, !ev.anon || ev.sawActor.includes(q.id));
  if (ev.anon) for (const id of ev.sawActor) { const q = lf2By(id); if (!q || q.dead || w.includes(q) || q === a) continue; const kn = q.kn || (q.kn = {}); if (!kn[ev.id]) { kn[ev.id] = { t: game.time, from: null, cert: 0.85, a: true, quiet: true }; ev.know.push(q.id); } }
  if (o.chron !== false && (ev.sev >= 2 || o.chron) && w.length) chron(lf2Cap(ev.text) + '.', ev.tags.includes('crime') ? 'note' : (o.chronKind || 'life'));
  for (const f of LF2.react) { try { if (f.emit) f.emit(ev); } catch (e) { console.warn('emit', e.message); } }
  return ev;
}
/* how one person feels about an event */
function lf2Judge(o, ev, knowsA) {
  const a = knowsA ? lf2By(sbWhoId(o, ev)) : null, t = lf2By(ev.target); let v = 0, pity = 0;
  for (const tag of ev.tags) { const d = LF2_TAGS[tag]; if (!d) continue; let m = 1; const tm = LF2_TRAITMUL[tag]; if (tm) for (const k in tm) if (lf2Has(o, k)) m *= tm[k]; v += d.v * m; pity += d.pity; }
  v *= 0.55 + 0.45 * ((o.kn && o.kn[ev.id] && o.kn[ev.id].sev2) || ev.sev);
  const victim = t === o, aA = a ? (o.aff[a.id] || 0) : 0, aT = t && !victim ? (o.aff[t.id] || 0) : 0;
  if (v < 0) { v *= victim ? 2 : 1 + Math.max(0, aT) / 70; if (aA > 40) v *= 0.55; if (aT < -30) v *= 0.4; }
  else if (v > 0) { if (victim) v *= 1.6; if (aA < -30) v *= 0.5; }
  return { v, pity: pity * (victim ? 1.4 : 1) * (0.35 + Math.max(0, aT) / 80), victim, a, t };
}
/* someone learns of an event (first hand when from is null) or, already knowing it, learns who did it */
function lf2Learn(o, ev, from, cert, knowsA, ver?) {
  if (!o || o.dead || o.infant || o.age < 5) return false;
  const kn = o.kn || (o.kn = {}); const old = kn[ev.id];
  if (old) {
    if (!knowsA || old.a || old.mine) return false;
    old.a = true; old.from = from ? from.id : old.from; if (ver && ver.who != null) old.who = ver.who; ev.chain.push({ from: from ? from.id : null, to: o.id, t: game.time, reveal: true });
    lf2Feel(o, ev, from, cert, true, true); return true;
  }
  kn[ev.id] = { t: game.time, from: from ? from.id : null, cert, a: !!knowsA, imp: sbImp(o, ev, !from) };
  if (ver) { const k = kn[ev.id]; if (ver.who != null) k.who = ver.who; if (ver.ext) k.ext = ver.ext; if (ver.sev2) k.sev2 = ver.sev2; if (ver.m) k.m = ver.m; k.hop = ver.hop || 1; }
  ev.know.push(o.id); if (from) ev.chain.push({ from: from.id, to: o.id, t: game.time });
  if (Object.keys(kn).length > 90) sbTrim(o);
  lf2Feel(o, ev, from, cert, knowsA, false);
  return true;
}
function lf2Feel(o, ev, from, cert, knowsA, reveal) {
  const j = lf2Judge(o, ev, knowsA), a = j.a, t = j.t, trust = from ? Math.max(0.2, Math.min(1.1, 0.6 + (o.aff[from.id] || 0) / 200)) : 1;
  const c = cert * trust * (ev.fake ? 0.85 : 1);
  if (a && a !== o) {
    if (Math.abs(j.v) > 0.05) lfAff(o, a, j.v * 8 * c, 'ev:' + ev.id);
    if (ev.tags.some(g => ['theft', 'deceit', 'bribe', 'debt'].includes(g))) sbTrust(o, a, -12 * c * ev.sev); else if (ev.tags.some(g => ['help', 'kindness', 'generous', 'honest'].includes(g))) sbTrust(o, a, 5 * c);
    if (ev.tags.some(g => ['brave', 'help'].includes(g))) sbResp(o, a, 4 * c); else if (ev.tags.some(g => ['embarrass', 'smelly', 'drunk'].includes(g))) sbResp(o, a, -3 * c);
    const rep = (o.rep || (o.rep = {}))[a.id] || (o.rep[a.id] = {});
    for (const tag of ev.tags) if (LF2_TAGS[tag] && tag !== 'crime') rep[tag] = (rep[tag] || 0) + ev.sev * c;
  }
  if (!reveal && t && t !== o && j.pity > 0.3) lfAff(o, t, j.pity * 2 * c, 'ev:' + ev.id);
  if (!o.player) sbRelFromEvent(o, ev, a, t, j, c);
  const hot = Math.abs(j.v * c) >= 0.5 || (j.victim && Math.abs(j.v) > 0.2);
  const who = a ? a.first : 'whoever did it', how = from ? ` (heard from ${from.first})` : '';
  if (hot && (a || !reveal)) {
    const label = j.v < 0 ? (j.victim ? `furious with ${who}` : `shocked by what ${a ? a.first : 'somebody'} did`) : j.v > 0 ? (j.victim ? `grateful to ${who}` : `touched by what ${a ? a.first : 'somebody'} did`) : 'upset about it';
    if (!o.player) lfMod(o, 'e' + ev.id, label + how, j.v * (j.victim ? 9 : 4) * c, j.victim ? 900 : 500);
    if (ev.effects.length < 10) ev.effects.push({ who: o.id, t: game.time, text: `${o.first} was ${label}${how}` });
    if (Math.abs(j.v) >= 0.8 && a) addMem(o, ev.kind, (from ? 'hearing that ' : '') + (ev.mem || lf2Low(ev.text)), null, a.id);
  } else if (!reveal && j.pity > 0.5 && t && t !== o && !o.player) lfMod(o, 'e' + ev.id, `sorry for ${t.first}`, -j.pity * 2 * c, 300);
  for (const f of LF2.react) { if (f.emit) continue; try { f(o, ev, j, c, !from, reveal); } catch (e) { console.warn('react', e.message); } }
}

/* ---------------- word of mouth ---------------- */
function lf2PickTale(a, b) {
  let best = null, bw = 0, rv = false;
  const aff = a.aff[b.id] || 0;
  for (const id in a.kn) {
    const k = a.kn[id]; if (k.mine && !k.brag) continue;
    const ev = lf2EvById(+id); if (!ev || game.time - ev.t > 4 * 1440 || ev.actor === b.id) continue;
    const bk = b.kn && b.kn[ev.id];
    const reveal = bk && !bk.a && k.a && ev.actor !== a.id;
    if (bk && !reveal) continue;
    if (ev.target === b.id && aff < 30 && !reveal) continue;
    if (ev.actor && (a.aff[ev.actor] || 0) > 60 && ev.tags.some(g => (LF2_TAGS[g] || {}).v < 0) && !lf2Has(a, 'gossipy')) continue;   // you do not tell tales on your best friend
    const w = Math.max(...ev.tags.map(g => (LF2_TAGS[g] || {}).spice || 0.5)) * (0.5 + 0.5 * ev.sev) * k.cert * (1.25 - (game.time - ev.t) / (5 * 1440)) * (reveal ? 1.8 : 1) * Math.random();
    if (w > bw) { bw = w; best = ev; rv = !!reveal; }
  }
  return best ? { ev: best, reveal: rv } : null;
}
function lf2Tell(a, b, ev, reveal, quiet?) {
  const ak = a.kn[ev.id], ver = sbPassOn(a, b, ev), act = lf2By(ver.who != null ? ver.who : ev.actor), knowsA = ver.a, txt = sbText(a, ev);
  const j = lf2Judge(b, ev, knowsA), fan = act && knowsA && (b.aff[act.id] || 0) >= 55 && j.v < 0;
  const firstHand = !ak.from, src = firstHand ? (ak.mine ? '' : ' I saw it myself.') : '';
  let line;
  if (reveal) line = anyOf([`You know what happened to you? It was ${act.first}. I saw it.`, `I know who it was. ${act.first}.`, `It was ${act.first}, you know. I am sure of it.`]);
  else line = (j.v < -0.3 ? anyOf(['Did you hear? ', 'I should not say, but ', 'You will not believe it: ']) : j.v > 0.3 ? anyOf(['Nice news: ', 'Did you hear? ']) : anyOf(['Have you heard? ', 'Word is that '])) + lf2Low(txt) + '.' + src;
  const reply = reveal ? (j.v < -0.3 ? anyOf([`${act.first}? I will not forget this.`, `I knew it!`, `Wait until I see ${act.first}.`]) : 'Huh.')
    : fan ? anyOf([`I do not believe it. Not ${act.first}.`, `That cannot be true.`]) : j.v < -0.5 ? anyOf([`That is dreadful.`, act && knowsA && (b.aff[act.id] || 0) < 10 ? `I always thought ${act.first} was trouble.` : `No! Really?`, `Somebody ought to do something.`])
    : j.v > 0.5 ? anyOf([`Well, good for ${act ? act.first : 'them'}.`, `That is lovely to hear.`]) : anyOf([`Ha! Poor thing.`, `Well, well.`, `Is that so?`]);
  if (!quiet) say(a, b, [[a, line], [b, reply]]);
  bumpAff(a, b, 1, 6);
  return lf2Learn(b, ev, a, fan ? ak.cert * 0.25 : ak.cert * (firstHand ? 0.85 : 0.75), knowsA, ver);
}
function lf2Gossip() {
  if (!LF2.on('gossip')) return;
  const live = npcs.filter(n => !n.dead && !n.infant && n.age >= 8 && n.pose !== 'sleep' && !n.trapped && n.kn);
  for (const a of live) {
    if (a.player || (a.lf2Talk || 0) > game.time) continue;
    for (const b of npcs) {
      if (b === a || b.dead || b.infant || b.age < 6 || b.pose === 'sleep' || lfDist(a, b) > 3 || (b.lf2Talk || 0) > game.time) continue;
      if (b.player && !(talkUI && talkUI.o === a)) { if (Math.random() > 0.15) continue; }
      if (seeThrough(a.tx, a.ty, b.tx, b.ty) < 0.5) continue;
      const aff = a.aff[b.id] || 0;
      const gos = (lf2Has(a, 'gossipy') ? 1.8 : 1) * (lf2Has(a, 'sociable') || lf2Has(a, 'jovial') ? 1.3 : 1) * (lf2Has(a, 'shy') ? 0.5 : 1) * (lf2Has(a, 'proud') ? 0.7 : 1) * ((a.drunk || 0) > 40 ? 1.8 : 1);
      if (Math.random() > 0.3 * gos * (aff >= 10 ? 1 : 0.35)) continue;
      const pk = lf2PickTale(a, b); if (!pk) continue;
      a.lf2Talk = b.lf2Talk = game.time + 30;
      lf2Tell(a, b, pk.ev, pk.reveal);
      break;
    }
  }
}
/* (news now travels through the social exchanges in social2/sb-exchange.ts, which call lf2PickTale / lf2Tell) */

/* ---------------- reputation: what somebody is known for ---------------- */
const LF2_REPWORD = { theft: 'a thief', violence: 'violent', harm: 'cruel', nuisance: 'a nuisance', prank: 'a prankster', deceit: 'a liar', kindness: 'kind', help: 'helpful', generous: 'generous', brave: 'brave',
  funny: 'a joker', drunk: 'a drunk', scandal: 'scandalous', embarrass: 'a laughing stock', trespass: 'a snoop', arrest: 'a jailbird', affair: 'a cheat', smelly: 'smelly', gamble: 'a gambler', sabotage: 'a saboteur', bribe: 'corrupt', rich: 'well off' };
function lf2Known(a) {
  const tot = {}; let n = 0;
  for (const o of npcs) { if (o.dead || o === a || !o.rep || !o.rep[a.id]) continue; n++; for (const k in o.rep[a.id]) tot[k] = (tot[k] || 0) + o.rep[a.id][k]; }
  const top = Object.keys(tot).map(k => [k, tot[k]]).filter(x => x[1] >= 2 && LF2_REPWORD[x[0]]).sort((x, y) => y[1] - x[1]).slice(0, 3);
  return { n, top, tot };
}
/* standing: how the village feels about someone on the whole, -100..100 */
function lf2Standing(a) { let s = 0, c = 0; for (const o of npcs) { if (o === a || o.dead || o.infant || o.age < 12) continue; s += o.aff[a.id] || 0; c++; } return c ? s / c : 0; }
/* how bad someone's known record is (only what people actually know about) */
function lf2Notoriety(a) { const t: any = lf2Known(a).tot; return (t.theft || 0) + (t.violence || 0) * 1.5 + (t.harm || 0) + (t.sabotage || 0) + (t.trespass || 0) * 0.4 + (t.nuisance || 0) * 0.3 + (t.bribe || 0) + (t.arrest || 0) * 0.5; }

