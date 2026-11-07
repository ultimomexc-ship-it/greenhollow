/* ================= social2 / sb-core: what each villager believes, and how they feel, with reasons =================
   Knowledge (o.kn, from life2/core) is extended here:
     - a VERSION per person: who they think did it (who), the extra detail that crept in (ext), how bad they think it was (sev2), how many
       times it changed on the way (m) and how many mouths it passed through (hop). Two people can believe different things about one event.
     - what KIND of knowledge it is: own (they did it), fact (they saw it), hearsay (they were told, and believe it), rumour (unsure, or false).
     - IMPORTANCE: trivial things fade in days, a betrayal stays for good.
   Second-order beliefs (o.sbRel['a:b']): what they think a feels about b, and why. Learned by watching and by being told.
   Feelings have REASONS (o.why[q] = [{why, v, t}]), and trust and respect are kept apart from liking (o.trust, o.resp).            */
const sbWhoId = (o, ev) => { const k = o && o.kn && o.kn[ev.id]; return k && k.who != null ? k.who : ev.actor; };
/** the event as this person would tell it: their culprit (or "somebody"), their extra detail */
function sbText(o, ev) {
  const k = o && o.kn && o.kn[ev.id], real = ev.actor ? lf2By(ev.actor) : null; let txt = ev.text || ev.kind;
  if (k && (!k.a || k.sus) && real) txt = ev.anonText || txt.replace(new RegExp('^' + real.first + ' and (\\w+) '), '$1 and somebody ').replace(new RegExp('^' + real.first + '\\b'), 'Somebody');
  else if (k && k.who != null && real && k.who !== ev.actor) { const fake = lf2By(k.who); if (fake) txt = txt.replace(new RegExp('\\b' + real.first + '\\b'), fake.first); }
  if (k && k.ext) txt += ', ' + k.ext;
  return txt;
}
/** what kind of knowledge this is for them */
function sbKind(o, ev): 'own' | 'fact' | 'hearsay' | 'rumour' {
  const k = o.kn && o.kn[ev.id]; if (!k) return 'rumour'; if (k.mine) return 'own';
  if (ev.fake || k.cert < 0.45 || (k.m || 0) > 1) return 'rumour'; return k.from == null ? 'fact' : 'hearsay';
}
/** how much this matters to them (0..1): how juicy and serious, and how close to home */
function sbImp(o, ev, firstHand) {
  const spice = Math.max(0.4, ...ev.tags.map(g => (LF2_TAGS[g] || {}).spice || 0.5)); let x = spice * (0.5 + 0.5 * ev.sev) / 3;
  const rel = id => { if (id == null) return 0; if (id === o.id) return 0.5; const q = lf2By(id); if (!q) return 0; if (o.fam && o.fam.spouse === id) return 0.35; if (isKin(o, q)) return 0.3; return (o.aff[id] || 0) > 40 ? 0.15 : (o.aff[id] || 0) < -30 ? 0.1 : 0; };
  x += Math.max(rel(ev.target), rel(ev.actor) * 0.8); if (firstHand) x += 0.1; return Math.max(0.03, Math.min(1, x));
}
/** forget what no longer matters: importance fades with age (slowly for big things; never for the biggest) */
function sbTrim(o, max = 80) {
  const kn = o.kn; if (!kn) return; const now = game.time, ids = Object.keys(kn);
  const eff = id => { const k = kn[id], imp = k.imp == null ? 0.3 : k.imp; if (imp >= 0.85 || k.mine) return 9; const age = (now - k.t) / 1440, half = 1 + 60 * imp * imp; return imp * Math.pow(0.5, age / half); };
  const drop = ids.filter(id => eff(id) < 0.03); for (const id of drop) delete kn[id];
  const rest = Object.keys(kn); if (rest.length > max) rest.sort((a, b) => eff(a) - eff(b)).slice(0, rest.length - max).forEach(id => delete kn[id]);
}

/* ---------------- stories change on the way ---------------- */
const SB_EXAG: any = { theft: ['and not for the first time', 'a whole sack of it', 'in broad daylight', 'and laughed about it after'], romance: ['and they were not even hiding it', 'for the third time this week', 'right outside the baths'],
  violence: ['and there was blood', 'and it took three people to pull them apart'], embarrass: ['in front of half the village', 'and it happened twice'], smell: ['and you could smell it from the well'], gamble: ['and lost the lot straight after'],
  kind: ['and would not take a coin for it'], debt: ['and has not paid back a single coin', 'and owes half the village besides'], health: ['and it is catching, they say'], other: ['in front of half the village', 'and that is not the half of it'] };
function sbScapegoat(a, ev) { let best = null, bw = 10; for (const q of npcs) { if (q === a || q.dead || q.infant || q.age < 12 || q.id === ev.target || q.id === ev.actor) continue; const w = -(a.aff[q.id] || 0) + Math.random() * 15; if (w > bw) { bw = w; best = q; } } return best; }
/** the version a teller passes on: their own, sometimes bent (exaggerated, pinned on somebody they dislike, the name lost, or softened for a friend) */
function sbPassOn(a, b, ev) {
  const k = a.kn[ev.id], v: any = { a: !!k.a, who: k.who, ext: k.ext, sev2: k.sev2, m: k.m || 0, hop: (k.hop || 0) + 1 };
  const p = 0.1 + (lf2Has(a, 'gossipy') ? 0.12 : 0) + (lf2Has(a, 'dreamy') ? 0.05 : 0) + ((a.drunk || 0) > 40 ? 0.15 : 0) + Math.min(0.15, (k.hop || 0) * 0.04);
  if (Math.random() < p) {
    const actor = lf2By(v.who != null ? v.who : ev.actor), likes = actor ? (a.aff[actor.id] || 0) : 0, bad = ev.tags.some(t => (LF2_TAGS[t] || {}).v < 0), r = Math.random(), grp = typeof cvTagGroup === 'function' ? cvTagGroup(ev) : 'other';
    if (likes > 35 && bad && r < 0.5) { v.sev2 = Math.max(1, (v.sev2 || ev.sev) - 1); v.ext = 'though I am sure it was a misunderstanding'; v.m++; }
    else if (r < 0.45) { v.sev2 = Math.min(3, (v.sev2 || ev.sev) + 1); v.ext = anyOf(SB_EXAG[grp] || SB_EXAG.other); v.m++; }
    else if (r < 0.7 && bad && (!v.a || k.cert < 0.6)) { const s = sbScapegoat(a, ev); if (s) { v.a = true; v.who = s.id; v.m++; } }
    else if (v.a && ev.actor) { v.a = false; v.who = null; v.m++; }
  }
  return v;
}

/* ---------------- what they think others feel about each other ---------------- */
function sbRelSet(o, a, b, v, cert, why?) {
  if (!o || !a || !b || a === b || o.dead) return; const R = o.sbRel || (o.sbRel = {}), key = a.id + ':' + b.id, old = R[key];
  if (!old) R[key] = { v, c: cert, t: game.time, why: why || null }; else { const w = Math.min(1, cert); old.v = old.v * (1 - w * 0.6) + v * w * 0.6; old.c = Math.max(old.c, cert); old.t = game.time; if (why) old.why = why; }
  const ks = Object.keys(R); if (ks.length > 60) { ks.sort((x, y) => R[x].t - R[y].t); delete R[ks[0]]; }
}
const sbRelGet = (o, a, b) => (o.sbRel && o.sbRel[a.id + ':' + b.id]) || null;
/** someone learns of an event: what it says about how the people in it feel about each other */
function sbRelFromEvent(o, ev, a, t, j, c) {
  if (!a || !t || a === t || a === o || t === o) return; const tags = ev.tags || [], why = 'ev:' + ev.id;
  if (['quarrel', 'brawl', 'insult', 'confront'].includes(ev.kind)) { sbRelSet(o, a, t, -0.6, c, why); sbRelSet(o, t, a, -0.6, c, why); return; }
  if (tags.includes('romance')) { sbRelSet(o, a, t, 0.8, c, why); return; }
  if (j.v < -0.2) { sbRelSet(o, t, a, -0.6, c, why); return; }
  if (j.v > 0.2) { sbRelSet(o, t, a, 0.5, c, why); sbRelSet(o, a, t, 0.4, c, why); }
}

/* ---------------- feelings with reasons; trust and respect ---------------- */
function sbWhy(a, b, v, why) {
  if (!a || !b || a === b) return; const L = a.why || (a.why = {}), arr = L[b.id] || (L[b.id] = []), key = why || 'time together', e = arr.find(x => x.why === key);
  if (e) { e.v += v; e.t = game.time; } else arr.push({ why: key, v, t: game.time });
  if (arr.length > 8) { arr.sort((x, y) => Math.abs(y.v) - Math.abs(x.v)); arr.length = 8; }
}
/** the main reason someone feels the way they do about q (most weight, positive or negative as asked) */
function sbTopWhy(o, q, sign?: number) { const arr = (o.why && o.why[q.id]) || []; let best = null; for (const e of arr) { if (sign && Math.sign(e.v) !== sign) continue; if (!best || Math.abs(e.v) > Math.abs(best.v)) best = e; } return best; }
function sbTrust(a, b, v, why?) { if (!a || !b || a === b) return; const T = a.trust || (a.trust = {}); T[b.id] = Math.max(-100, Math.min(100, (T[b.id] || 0) + v)); if (why) sbWhy(a, b, v * 0.3, why); }
function sbResp(a, b, v) { if (!a || !b || a === b) return; const T = a.resp || (a.resp = {}); T[b.id] = Math.max(-100, Math.min(100, (T[b.id] || 0) + v)); }
const sbTrustOf = (a, b) => (a.trust && a.trust[b.id]) || 0;
/** words for a reason, from the speaker's point of view */
function sbWhyText(o, q, e) {
  if (!e) return null; const w = e.why;
  if (w.startsWith('ev:')) { const ev = lf2EvById(+w.slice(3)); return ev && (ev.actor === q.id || ev.actor === o.id) ? lf2Low(typeof cvMe === 'function' ? cvMe(o, sbText(o, ev)) : sbText(o, ev)) : null; }
  const T: any = { 'unpaid loan': `the money ${q.first} still owes me`, 'paid me back': `${q.first} paid me back, every coin, when ${cvPron(q).he} said ${cvPron(q).he} would`, 'lent me money': `${q.first} lent me money when I had none`, 'refused a loan': `${q.first} would not lend me so much as a coin when I needed it`,
    'argument': `that row we had`, 'row at home': `the rows we have at home`, 'comforted me': `${q.first} sat with me when I was low`, 'confided': `${q.first} trusted me with something`, 'badmouthed a friend': `the things ${q.first} says about my friends`, 'took my side': `${q.first} took my side`, 'old feud': `the old business between ${q.first} and me`, 'misjudged': null, 'competition': `${q.first} is always trying to outdo me at work`, 'jealous': `${q.first} is after somebody I care about`,
    'rubs me up the wrong way': `${q.first} rubs me up the wrong way, I cannot say why`, 'pestering me': `${q.first} will not leave me alone`, 'heard good of': null, 'heard from': null, 'time together': null, 'courting': `${q.first} has been sweet on me` };
  return T[w] !== undefined ? T[w] : null;
}
