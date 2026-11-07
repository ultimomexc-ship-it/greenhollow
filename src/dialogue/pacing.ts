/* ================= Pacing: say things once, when they change; bubbles for the rest ================= */
const siteStage = s => { const tot = s.slots ? s.slots.length : 1, left = logsLeft(s), built = tot - left; return left <= 3 ? 2 : built / tot >= 0.45 ? 1 : 0; };
// milestones and topics for the scenes that used to repeat
(function tune() {
  const S = id => SCENES.find(x => x.id === id);
  const hw: any = S('house_wait'); if (hw) { hw.cool = 0; hw.key = (n, p, c) => c.s.id + ':' + siteStage(c.s); hw.topic = (n, p, c) => 'site' + c.s.id + ':' + siteStage(c.s); }
  const yh: any = S('your_house'); if (yh) { yh.cool = 0; yh.key = (n, p, c) => c.s.id + ':' + siteStage(c.s); yh.topic = (n, p, c) => 'site' + c.s.id + ':' + siteStage(c.s); }
  const nt: any = S('need_timber'); if (nt) { nt.cool = 0; nt.key = (n, p, c) => c.s.id; nt.topic = (n, p, c) => 'site' + c.s.id + ':' + siteStage(c.s); }
  const te = S('tent'); if (te) te.cool = 0;
  const fs: any = S('food_short'); if (fs) { fs.cool = 0; fs.key = () => Math.floor(game.time / (3 * 1440)); fs.topic = () => 'food' + Math.floor(game.time / (3 * 1440)); }
  const bs: any = S('bonfire_soon'); if (bs) bs.topic = (n, p, c) => 'feast' + c.f.at;
  const ab: any = S('after_bonfire'); if (ab) ab.topic = () => 'feastafter' + (town.lastFeast || 0);
  const nc: any = S('new_chapel'); if (nc) nc.topic = () => 'chapel';
  const hu = S('hungry'); if (hu) hu.cool = 1440;
  const ex: any = S('expecting'); if (ex) { ex.cool = 0; ex.key = (n, p, c) => (n.preg ? n.preg.due : 0) + ':' + (c.soon ? 1 : 0); }
  const co = S('courting'); if (co) co.cool = 2 * 1440;
  const yf = S('your_family'); if (yf) yf.cool = 1440;
  const ld = S('lazy_caught'); if (ld) ld.cool = 3 * 1440;
  const kb = S('kid_bored'); if (kb) kb.cool = 2 * 1440;
  const kl = S('kid_learn'); if (kl) kl.cool = 3 * 1440;
  const hd: any = S('heard'); if (hd) hd.topic = (n, p, c) => 'deed' + c.d.t;
  const dr: any = S('dream'); if (dr) dr.topic = () => 'hope';
  const fo: any = S('founder'); if (fo) fo.topic = () => 'founder';
  const lg: any = S('legend'); if (lg) lg.topic = (n) => 'legend' + (believes(n) ? 1 : 0);
  const rd: any = S('rest_day'); if (rd) { rd.cool = 0; rd.key = () => Math.floor(game.time / 1440); }
})();
const dayN = () => Math.floor(game.time / 1440);
const BIG = 85; // scenes this important ignore the daily limit
function panelsToday(n, p) { const r = (n.panels || {})[p.id]; return r && r.d === dayN() ? r.c : 0; }
/* only the heart-to-hearts open the dialogue panel; everything else is said in passing, in bubbles */
const PANEL_SCENES = new Set(['crush', 'hungry', 'cried_parent', 'cleared', 'gift_thanks', 'liar_sulk']);
function sceneFor(n, p, mode?) {
  mode = mode || 'panel';
  n.seenSc = n.seenSc || {}; const now = game.time, heard = p.heardTopics || {}; let best = null, bs = 0;
  if (n.age < 5 || (mode === 'bubble' && recently(n.lastSceneWith && n.lastSceneWith[p.id], 0.12))) return null;
  for (const sc of SCENES as any[]) {
    if ((mode === 'panel') !== PANEL_SCENES.has(sc.id)) continue;
    let c; try { c = sc.when(n, p); } catch (e) { c = null; }
    if (!c) continue;
    const key = sc.id + ((sc as any).key ? ':' + (sc as any).key(n, p, c) : '') + ':' + p.id, last = n.seenSc[key];
    if (last !== undefined && (sc.cool === 0 || now - last < sc.cool)) continue;
    if ((sc as any).topic) { const tp = (sc as any).topic(n, p, c); if (heard[tp] !== undefined && heard[tp] !== n.id) continue; c._topic = tp; }
    c._key = key;
    const pr = sc.pri + Math.random() * 6;
    if (pr > bs) { bs = pr; best = { sc, c }; }
  }
  return best;
}
function talkBegin(n, p) {
  if (typeof eventsBusy === 'function' && eventsBusy()) return null;
  const b = sceneFor(n, p);
  if (!b) return null;
  n.seenSc = n.seenSc || {}; n.seenSc[b.c._key || (b.sc.id + ':' + p.id)] = game.time; (n.lastSceneWith = n.lastSceneWith || {})[p.id] = game.time;
  if (b.c._topic) (p.heardTopics = p.heardTopics || {})[b.c._topic] = n.id;
  { n.panels = n.panels || {}; const r = n.panels[p.id]; n.panels[p.id] = r && r.d === dayN() ? { d: r.d, c: r.c + 1 } : { d: dayN(), c: 1 }; }
  bumpKnow(n, p, 3);
  talkS = { n, p, sc: b.sc, c: b.c, stage: 0 };
  const opts = b.sc.opts(n, p, b.c).slice(0, 2);
  talkS.fns = opts.map(o => o[1]);
  // never the same words twice in a row
  n.lastSay = n.lastSay || {}; let say = b.sc.lines(n, p, b.c);
  for (let i = 0; i < 4 && n.lastSay[b.sc.id] === say; i++) say = b.sc.lines(n, p, b.c);
  n.lastSay[b.sc.id] = say;
  return { say, opts: opts.map((o, i) => ['o' + i, o[0]]) };
}

/* one-line bubbles for things already said */
function topicalBark(n, p) {
  const out = [];
  if (n.role === 'Priest') {
    if (Math.random() < 0.7) return anyOf([`May you be touched by His Noodly Appendage, ${p.first}.`, `Come by the fire in the mornings. I pray there till half ten. Bring a colander if you have one.`, `How is your family keeping, ${p.first}? Eating enough pasta?`, `Did you know the Flying Spaghetti Monster made the mountains? Then had a few drinks and made the rest of it.`, `Rest day is holy, ${p.first}. Every Friday, in fact. The Monster insists.`, `R'amen.`, `Fewer pirates, warmer winters. It is all in the scriptures. Probably.`, `If anything weighs on you, you know where to find me in the mornings.`, `Arr. Sorry. Holy word.`]);
  }
  const s = houseSiteOf(n); if (s) { const l = logsLeft(s); out.push(l <= 3 ? `${l} more! Only ${l}!` : anyOf([`${l} logs to go. Not that I am counting.`, `Still counting logs. ${l}.`])); }
  const ys = houseSiteOf(p); if (ys && (n.know[p.id] || 0) >= 15) out.push(anyOf([`Your walls are coming on!`, `${logsLeft(ys)} more for your place, I heard.`]));
  if (town.feast && game.time < town.feast.at) out.push(anyOf(['Bonfire tonight!', 'See you at the fire!']));
  if (n.preg) out.push(anyOf(['*pats belly* Any day now.', 'The little one is kicking!']));
  if (n.fam.partner && !n.fam.spouse) { const o = byId(n.fam.partner); if (o) out.push(`Have you seen ${o.first}? ...No reason.`); }
  return out.length ? anyOf(out) : null;
}

/* the '?' above a head: they have something new to say */
function talkMarks(p) {
  const m = new Map(); if (!p) return m;
  if (typeof eventsBusy === 'function' && eventsBusy()) return m; // quiet during a wedding, funeral, party or bonfire
  // who has something new to say (worked out every few game minutes, not every frame)
  if (!town._newT || game.time - town._newT >= 8 || town._newP !== p.id) {
    town._newT = game.time; town._newP = p.id; town._new = new Set();
    for (const n of npcs) { if (n === p || n.dead || n.infant || n.age < 5) continue; const b = sceneFor(n, p, 'panel'); if (b && !String(b.sc.id).startsWith('remind')) town._new.add(n.id); }
  }
  for (const id of town._new) m.set(id, '?');
  return m;
}
function hasNews(n) { const p = game.player; if (!p || !p.player || n === p) return false; if (!town._qm || town._qmT !== game.time) { town._qm = talkMarks(p); town._qmT = game.time; } return town._qm.get(n.id) === '?'; }
function refreshMarks() { town._newT = -1e9; }


/* ---------- bubble chats: walk into someone and have a quick word ---------- */
const NOT_SPEECH = /^(Sit|Leave|Tell|Share|Hand|Accept|Give|Pay|Stay|Say|Keep|Ask|Come on|Want|Should)/;
function bubbleChat(n, p) {
  { const cc = typeof ceremonyChat === 'function' && ceremonyChat(n, p); if (cc) return cc; }
  { const pc = typeof partyChat === 'function' && partyChat(n, p); if (pc) return pc; }
  { const pw = typeof priestWisdom === 'function' && !(typeof eventsBusy === 'function' && eventsBusy()) && priestWisdom(n, p); if (pw) return pw; }
  const b = sceneFor(n, p, 'bubble');
  if (b) {
    n.seenSc[b.c._key || (b.sc.id + ':' + p.id)] = game.time; (n.lastSceneWith = n.lastSceneWith || {})[p.id] = game.time;
    if (b.c._topic) (p.heardTopics = p.heardTopics || {})[b.c._topic] = n.id;
    n.lastSay = n.lastSay || {}; let say = b.sc.lines(n, p, b.c); for (let i = 0; i < 4 && n.lastSay[b.sc.id] === say; i++) say = b.sc.lines(n, p, b.c); n.lastSay[b.sc.id] = say;
    let ops = []; try { ops = b.sc.opts(n, p, b.c).map(o => o[0]).filter(l => !NOT_SPEECH.test(l)); } catch (e) {}
    const resp = ops.length ? anyOf(ops).replace(/([^.!?])$/, '$1.') : anyOf(['Ha!', 'Is that so?', 'Right.', 'Mm.', 'Oh!']);
    bumpKnow(n, p, 3); bumpAff(n, p, 1, 8);
    return [[n, say], [p, resp]];
  }
  return null;
}
function startFocus(n, p, lines) {
  const dur = 1 + linesSec(lines) * gmPerSec();
  game.focus = { a: n.id, b: p.id, until: game.time + dur };
  n.talkUntil = game.time + dur; faceTo(n, p); faceTo(p, n); if (n.moving) n.pose = 'stand';
  game.events.push({ time: game.time, a: n, b: p, place: placeOf(n), topic: 'talk', quiet: false, focus: true, lines: lines.map(([who, text]) => ({ who, text })) });
}
const focusOn = () => game.focus && game.time < game.focus.until;
