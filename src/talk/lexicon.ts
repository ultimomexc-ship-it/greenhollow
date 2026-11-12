/* The lexicon: how an act is said (docs/talk-engine.md, section 9). An entry: { act, pack, tags, requires, text }.
   tags are conditions that must hold (band: time of day, rel: 'friend' | 'kin' | 'stranger', trait, state); each one that matches makes the line more specific and so more likely.
   requires: world things the line mentions ('feature:tavern'); a line whose things do not exist is never chosen. Slots: {li} the listener, {sp} the speaker, {place}, {job}, {state}. */

const LEX: any[] = [];
const lx = (act: string, pack: string, text: string, tags?: any, requires?: string[]) => LEX.push({ act, pack, text, tags: tags || {}, requires });
const TALK_PACK = { cur: 'plain' };

/** what a speaker's line may be conditioned on, for this act */
function lxContext(sp: any, li: any, c: any) {
  const f = sp.fam || {},
    g = li.fam || {};
  const rel =
    f.spouse === li.id
      ? 'spouse'
      : f.partner === li.id
        ? 'partner'
        : (f.kids || []).includes(li.id)
          ? 'child'
          : f.mother === li.id || f.father === li.id
            ? 'parent'
            : (f.mother != null && f.mother === g.mother) || (f.father != null && f.father === g.father)
              ? 'sibling'
              : typeof isKin === 'function' && isKin(sp, li)
                ? 'kin'
                : (sp.rel && sp.rel[li.id] === 'friend') || (sp.aff[li.id] || 0) > 30
                  ? 'friend'
                  : sp.know && (sp.know[li.id] || 0) > 10
                    ? 'acquaintance'
                    : 'stranger';
  return {
    band: todBand(game.time),
    rel,
    state: c.state || talkState(sp) || 'fine',
    trait: (sp.traits || [])[0],
    how: c.how,
    conf: c.conf,
    call: c.call,
    op: c.op,
    rep: typeof repWord === 'function' ? repWord(sp, li) : undefined,
    age: sp.age < 12 ? 'child' : undefined,
    kid: li.age < 14 ? 'yes' : undefined,
    menu: c.menu,
    reg: lxRegister(sp),
    // the speaker has had the same trouble this week (so a line that claims "I know that one" is true): from their own day log
    shared:
      c.life && c.lifeTrouble && (sp.day || []).some((e: any) => e.kind === c.life.kind && game.time - e.t < 7 * 1440) ? 'yes' : undefined
  };
}
/** the values a line can use, from the speaker, the listener and what the turn carries. A slot with no value is undefined: a line that needs it is not said. */
function lxSlots(sp: any, li: any, c: any, ctx: any): any {
  const place = String(placeOf(sp) || '').replace(/^(in|at)\s+/, '');
  const item = c.item || c.pitem || undefined;
  const aboutP = c.about ? npcs.find((n: any) => n.first === c.about) : null;
  return {
    li: li.first,
    sp: sp.first,
    place: /^the /.test(place) ? 'at ' + place : place ? 'in ' + place : 'here',
    job: String(sp.job || 'daily').toLowerCase(),
    state: ctx.state,
    clock: lxClock(),
    money: c.price != null ? lxMoney(c.price) : undefined,
    price: c.price != null ? String(c.price) : undefined,
    about: c.about || undefined,
    reason: typeof peopleYou === 'function' ? peopleYou(c.reason || '', li) : c.reason || '',   // (the listener is "you" in every line, menu labels and previews included)
    them: !c.about ? undefined : aboutP ? (aboutP.female ? 'her' : 'him') : 'them',
    shop: c.shop || 'stall',
    item,
    things: item ? lxCount(c.qty, item) : undefined,
    qty: c.qty != null ? String(c.qty) : undefined,
    news: typeof peopleYou === 'function' && typeof c.news === 'string' ? peopleYou(c.news, li) : c.news || undefined,
    deed: c.deed || undefined,
    who: c.who || 'them'
  };
}
/** slots a line may leave empty (they have a default, or the sentence reads without them) */
const LX_MISS: any = {}; // act:slot -> how often a line could not be said for want of a value (the bindings test reads this)
const lxSlotsOf = (e: any): string[] => e.sl || (e.sl = (e.text.match(/\{(\w+)\}/g) || []).map((x: string) => x.slice(1, -1)));

/** choose the wording of an act: the pack's lines that fit, whose things exist and whose slots all have values; the more specific the better, what the listener heard lately worse */
/** a marked line: one that carries an aside (a second sentence) or runs long. The voice rule in `lxSay` rations these. */
const lxMarked = (t: string) => {
  const u = t
    .replace(/\{(news|reason)\}[.?]?/g, '')
    .replace(/^\s*(\{li\}|[A-Z][a-z]+)[.,]\s+/, '')
    .trim();
  return /[.?!…:]\s+\S/.test(u) || u.split(/\s+/).length > 11;
};
function lxSay(act: string, sp: any, li: any, c: any): string {
  const ctx: any = lxContext(sp, li, c);
  const slots = lxSlots(sp, li, c, ctx);
  const heard = li.heard || (li.heard = {});
  const fits = (e: any) =>
    Object.keys(e.tags).every(k =>
      k === 'trait'
        ? (sp.traits || []).includes(e.tags[k])
        : k === 'rel' && e.tags[k] === 'kin'
          ? ['kin', 'spouse', 'partner', 'child', 'parent', 'sibling'].includes(ctx.rel) // a line for kin fits any relative
          : k === 'rel' && e.tags[k] === 'partner'
            ? ['partner', 'spouse'].includes(ctx.rel) // one for a partner fits a spouse
            : e.tags[k] === ctx[k]
    );
  const filled = (e: any) => {
    for (const k of lxSlotsOf(e))
      if (slots[k] === undefined) {
        LX_MISS[act + ':' + k] = (LX_MISS[act + ':' + k] || 0) + 1;
        return false;
      }
    return true;
  };
  const pool = (pack: string) => LEX.filter(e => e.act === act && e.pack === pack && WORLD.ok(e.requires) && fits(e) && filled(e));
  const pk = (typeof town !== 'undefined' && town && town.pack) || TALK_PACK.cur;
  let cands = pool(pk);
  if (!cands.length) cands = pool('plain');
  if (!cands.length) return '';
  // the voice rule: most lines are short and plain; a line with an aside (a second sentence, or a long one) is allowed at most one time in four per speaker, and never on a menu label
  const spare = c.menu || lxRegister(sp) === 'terse' || (sp.sinceAside != null && sp.sinceAside < 3); // (a terse speaker never adds an aside)
  if (spare && !act.startsWith('ev:')) {
    const short = cands.filter(e => !lxMarked(e.text));
    if (short.length) cands = short;
  }
  let best: any = null,
    bs = -1e9;
  for (const e of cands) {
    const id = act + '|' + e.text,
      g = LX_RECENT[id];
    const heardPenalty = heard[id] != null ? 4 - Math.min(3, (game.time - heard[id]) / 600) : 0;
    const s = Object.keys(e.tags).length * 2 - heardPenalty - (g != null && game.time - g < 180 ? 2.2 : 0) + Math.random() * 1.5;
    if (s > bs) {
      bs = s;
      best = e;
    }
  }
  heard[act + '|' + best.text] = game.time;
  LX_RECENT[act + '|' + best.text] = game.time; // what was said lately, by anyone, is less likely to be said again
  const raw = best.text.replace(/\{(\w+)\}/g, (_m: string, k: string) => (slots[k] != null ? slots[k] : ''));
  const plainNow = spare || lxMarked(best.text); // (no tic and no run-on on top of an aside, or when the aside is not due)
  const voiced = c.menu ? raw : plainNow && lxRegister(sp) === 'chatty' ? raw : lxVoice(sp, li, act, pk, plainNow ? raw : lxTic(sp, act, pk, raw));
  if (!c.menu && !act.startsWith('ev:'))
    sp.sinceAside = lxMarked(best.text) || voiced.length > raw.length + 8 ? 0 : (sp.sinceAside == null ? 3 : sp.sinceAside) + 1;
  return placeWords(
    voiced
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+$/, '')
      .replace(/(^|[.!?]\s+)([a-z])/g, (_m: string, a: string, b: string) => a + b.toUpperCase())
  );
}

/** a count of something, said the way people say it: "a cabbage", "7 barley", "12 turnips" (a plural name drops its s for one; a mass noun is "a little") */
function lxCount(qty: any, name: string): string {
  name = name || 'something';
  if (qty == null) return name;
  if (qty !== 1) return qty + ' ' + name;
  if (/ies$/.test(name)) return 'a ' + name.slice(0, -3) + 'y';
  if (/oes$/.test(name)) return 'a ' + name.slice(0, -2);
  if (/ss$/.test(name) || !/s$/.test(name)) return 'a little ' + name;
  return 'a ' + name.slice(0, -1);
}

/** money said the way people say it: "a denarius", "6 denarii" */
function lxMoney(n: any): string {
  if (n == null) return 'a few denarii';
  n = Math.round(n);
  return n === 1 ? 'one denarius' : n + ' denarii';
}

/** the time as people say it: "7:40" */
function lxClock(): string {
  const m = Math.floor(game.time % 1440);
  return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
}
/** a verbal habit: each person has none or one of the pack's small openers and now and then uses it on a statement, so people are recognisable by how they talk */
const LX_TICS: any = {
  plain: ['you know,', 'honestly,', 'mind you,', 'I suppose', 'as it happens,'],
  island: ['as far as I know,', 'more or less,', 'I think', 'for what it is worth,', 'in my experience,', 'probably', 'to be fair,']
};
const LX_TIC_ACTS = /^(remark_|share_news|answer_how|report_day|life:|tell_price|nothing_much)/;
/* ---- registers: how a person sounds (fixed by who they are). Most speak in the island's dry voice; some are terse (the first sentence is all they give), warm (a pet word), formal (no contractions, stiff greetings) or chatty (they run on). */
const LX_REG = [
  'dry',
  'dry',
  'dry',
  'dry',
  'dry',
  'dry',
  'dry',
  'dry',
  'dry',
  'terse',
  'terse',
  'terse',
  'warm',
  'warm',
  'warm',
  'formal',
  'formal',
  'chatty',
  'chatty',
  'chatty'
];
const lxRegister = (n: any): string => LX_REG[(Math.imul((n.id | 0) + 11, 2246822519) >>> 0) % LX_REG.length];
const LX_RUNON: any = {
  plain: ['But I do go on.', 'Anyway, enough about me.', 'Mind you, that is just me.', 'I could say more.'],
  island: [
    'Ignore me. I run on.',
    'I could say more. I am choosing not to, for now.',
    'That is just how it looks from here.',
    'But I go on. I do that.'
  ]
};
function lxVoice(sp: any, li: any, act: string, pack: string, text: string): string {
  const reg = lxRegister(sp);
  if (reg === 'dry' || !text) return text;
  const ritual = /^(greet|greet_back|farewell|farewell_back|pre_close)$/.test(act),
    statement =
      LX_TIC_ACTS.test(act) ||
      /^(answer_how|answer_work|callback_answer|acknowledge|agree|joke|wonder|brag_child|tell_back|give_advice|share_gladness|sympathise_how)$/.test(
        act
      );
  if (!ritual && !statement) return text;
  // terse, warm and formal are lines of their own now (tags `reg`): see lxContext and the words files; only the chatty run-on is added to a finished line
  if (reg === 'chatty') {
    if (statement && !ritual && Math.random() < 0.4) {
      const L = LX_RUNON[pack] || LX_RUNON.plain;
      return text.replace(/\s*$/, ' ') + L[Math.floor(Math.random() * L.length)];
    }
    return text;
  }
  return text;
}
const LX_RECENT: any = {};
function lxTic(sp: any, act: string, pack: string, text: string): string {
  const list = LX_TICS[pack] || LX_TICS.plain;
  if (!LX_TIC_ACTS.test(act) || text.length < 28 || text.split(/[.?]/)[0].length < 18) return text;
  const k = ((sp.id * 2654435761) >>> 0) % (list.length + 3);
  if (k >= list.length) return text; // (some people have none)
  if (Math.random() > 0.3) return text;
  const t = list[k];
  const w0 = text.split(/[ ,.]/)[0];
  const keep = w0 === 'I' || /^I'/.test(text) || npcs.some((n: any) => n.first === w0); // (an I or a name keeps its capital)
  return t + ' ' + (keep ? text : text.charAt(0).toLowerCase() + text.slice(1));
}
