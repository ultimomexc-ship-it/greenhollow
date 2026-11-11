/* The lexicon: how an act is said (docs/talk-engine.md, section 9). An entry: { act, pack, tags, requires, text }.
   tags are conditions that must hold (band: time of day, rel: 'friend' | 'kin' | 'stranger', trait, state); each one that matches makes the line more specific and so more likely.
   requires: world things the line mentions ('feature:tavern'); a line whose things do not exist is never chosen. Slots: {li} the listener, {sp} the speaker, {place}, {job}, {state}. */

const LEX: any[] = [];
const lx = (act: string, pack: string, text: string, tags?: any, requires?: string[]) => LEX.push({ act, pack, text, tags: tags || {}, requires });
const TALK_PACK = { cur: 'plain' };

/* ---- plain pack (neutral; the test voice and the fallback for every other pack) ---- */
lx('greet', 'plain', 'Morning, {li}.', { band: 'morning' }); lx('greet', 'plain', 'Up early, {li}.', { band: 'morning' }); lx('greet', 'plain', 'Afternoon, {li}.', { band: 'day' });
lx('greet', 'plain', 'Evening, {li}.', { band: 'evening' }); lx('greet', 'plain', 'Still about, {li}?', { band: 'night' });
lx('greet', 'plain', 'Hello, {li}.'); lx('greet', 'plain', '{li}. Good to see you.', { rel: 'friend' }); lx('greet', 'plain', '{li}! There you are.', { rel: 'friend' }); lx('greet', 'plain', 'Hello. I don\'t think we\'ve talked much.', { rel: 'stranger' });
lx('greet_back', 'plain', 'Hello, {li}.'); lx('greet_back', 'plain', '{li}. Hello.'); lx('greet_back', 'plain', 'Morning.', { band: 'morning' }); lx('greet_back', 'plain', 'Good to see you too.', { rel: 'friend' }); lx('greet_back', 'plain', 'Evening.', { band: 'evening' });
lx('remark_time', 'plain', 'Morning goes quickly.', { band: 'morning' }); lx('remark_time', 'plain', 'Half the day gone already.', { band: 'day' }); lx('remark_time', 'plain', 'It\'ll be dark soon.', { band: 'evening' });
lx('remark_time', 'plain', 'Late to be about, isn\'t it.', { band: 'night' }); lx('remark_time', 'plain', 'The days feel long lately.'); lx('remark_time', 'plain', 'Time passes strangely here.');
lx('remark_place', 'plain', 'Quiet {place} today.'); lx('remark_place', 'plain', 'I always end up {place} around now.'); lx('remark_place', 'plain', 'Nice enough, {place}.'); lx('remark_place', 'plain', 'It\'s something, being {place}.');
lx('remark_work', 'plain', 'The {job} work never ends.'); lx('remark_work', 'plain', 'Busy with the {job} work.'); lx('remark_work', 'plain', 'I\'m getting better at the {job} work. Slowly.'); lx('remark_work', 'plain', 'Can\'t complain about the {job} work.', { state: 'glad' });
lx('remark_state', 'plain', 'I\'m starving.', { state: 'hungry' }); lx('remark_state', 'plain', 'I could eat a whole loaf.', { state: 'hungry' }); lx('remark_state', 'plain', 'I\'m worn out.', { state: 'tired' }); lx('remark_state', 'plain', 'I could sleep standing up.', { state: 'tired' });
lx('remark_state', 'plain', 'I\'m in a good mood, actually.', { state: 'glad' }); lx('remark_state', 'plain', 'Can\'t stop smiling today.', { state: 'glad' }); lx('remark_state', 'plain', 'Not my best day.', { state: 'low' }); lx('remark_state', 'plain', 'I\'ve felt better.', { state: 'low' });
lx('ask_how', 'plain', 'How are you?'); lx('ask_how', 'plain', 'How have you been?'); lx('ask_how', 'plain', 'How are things with you, {li}?', { rel: 'friend' });
lx('answer_how', 'plain', 'Fine, thanks.', { state: 'fine' }); lx('answer_how', 'plain', 'Can\'t complain.', { state: 'fine' }); lx('answer_how', 'plain', 'Hungry, mostly.', { state: 'hungry' }); lx('answer_how', 'plain', 'Tired. You?', { state: 'tired' });
lx('answer_how', 'plain', 'Better than I expected.', { state: 'glad' }); lx('answer_how', 'plain', 'Good, actually.', { state: 'glad' }); lx('answer_how', 'plain', 'Not great.', { state: 'low' }); lx('answer_how', 'plain', 'Getting by.', { state: 'low' });
lx('agree', 'plain', 'Mm.'); lx('agree', 'plain', 'True.'); lx('agree', 'plain', 'I know what you mean.'); lx('agree', 'plain', 'Yes.'); lx('agree', 'plain', 'It is.'); lx('agree', 'plain', 'Same here.'); lx('agree', 'plain', 'Right.');
lx('pre_close', 'plain', 'Well. I should get on.'); lx('pre_close', 'plain', 'Anyway. Things to do.'); lx('pre_close', 'plain', 'I\'d better go.'); lx('pre_close', 'plain', 'I\'ll let you get back to it.');
lx('farewell', 'plain', 'See you, {li}.'); lx('farewell', 'plain', 'Take care.'); lx('farewell', 'plain', 'Bye for now.'); lx('farewell', 'plain', 'Goodbye.', { rel: 'stranger' });
lx('farewell_back', 'plain', 'You too.'); lx('farewell_back', 'plain', 'See you.'); lx('farewell_back', 'plain', 'Bye.');

/* ---- news (plain pack) ---- */
lx('ask_news', 'plain', 'Any news?'); lx('ask_news', 'plain', 'Heard anything lately?'); lx('ask_news', 'plain', 'What\'s the word today?'); lx('ask_news', 'plain', 'Has anything happened?', { rel: 'friend' });
lx('no_news', 'plain', 'Nothing much.'); lx('no_news', 'plain', 'Not a thing.'); lx('no_news', 'plain', 'Quiet lately.'); lx('no_news', 'plain', 'Nothing I\'d call news.');
lx('share_news', 'plain', 'Did you hear? {news}.', { conf: 'high' }); lx('share_news', 'plain', 'I saw it myself: {news}.', { how: 'saw' }); lx('share_news', 'plain', 'I was there. {news}.', { how: 'saw', rel: 'friend' });
lx('share_news', 'plain', 'I heard that {news}.', { how: 'told' }); lx('share_news', 'plain', 'They\'re saying {news}.', { how: 'overheard' }); lx('share_news', 'plain', 'I\'m not sure it\'s true, but I heard {news}.', { conf: 'low' });
lx('share_news', 'plain', 'You didn\'t hear it from me, but {news}.', { rel: 'friend', conf: 'low' }); lx('share_news', 'plain', 'Listen. {news}.', { rel: 'friend' }); lx('share_news', 'plain', 'Have you heard? {news}.');
lx('react_shock', 'plain', 'No!'); lx('react_shock', 'plain', 'That\'s terrible.'); lx('react_shock', 'plain', 'I can\'t believe it.'); lx('react_shock', 'plain', 'Really? That\'s awful.');
lx('react_amused', 'plain', 'Ha! Good for them.'); lx('react_amused', 'plain', 'That\'s almost funny.'); lx('react_amused', 'plain', 'I wish I\'d seen it.'); lx('react_amused', 'plain', 'Oh, that\'s too good.');
lx('react_sympathy', 'plain', 'Poor {who}.'); lx('react_sympathy', 'plain', 'That\'s hard on {who}.'); lx('react_sympathy', 'plain', 'I feel for {who}.');
lx('react_doubt', 'plain', 'Is that really true?'); lx('react_doubt', 'plain', 'I\'d want to hear it twice.'); lx('react_doubt', 'plain', 'Hm. Who told you that?'); lx('react_doubt', 'plain', 'I\'ll believe it when I see it.');
lx('react_delight', 'plain', 'That\'s lovely to hear.'); lx('react_delight', 'plain', 'Good for them.'); lx('react_delight', 'plain', 'Well. That cheers me up.');
lx('react_unmoved', 'plain', 'Hm.'); lx('react_unmoved', 'plain', 'Is that so.'); lx('react_unmoved', 'plain', 'Well.'); lx('react_unmoved', 'plain', 'I see.');
/* what happened, as it is told after "I heard that" (event kinds that have no template yet fall back to the old sentence) */
lx('ev:arrival', 'plain', '{a} turned up on the beach this morning'); lx('ev:arrival', 'plain', '{a} came ashore with no explanation');
lx('ev:theft', 'plain', '{a} stole from {t}'); lx('ev:theft', 'plain', '{a} walked off with something of {t}\'s'); lx('ev:quarrel', 'plain', '{a} and {t} had words'); lx('ev:brawl', 'plain', '{a} and {t} came to blows');
lx('ev:shove', 'plain', '{a} pushed {t} around'); lx('ev:gift', 'plain', '{a} gave {t} a gift'); lx('ev:help', 'plain', '{a} helped {t} out'); lx('ev:charity', 'plain', '{a} gave to {t} when {t} had nothing');
lx('ev:arrest', 'plain', '{a} was taken in by the watch'); lx('ev:jealous', 'plain', '{a} is jealous of {t}'); lx('ev:crush', 'plain', '{a} has a soft spot for {t}'); lx('ev:rumour', 'plain', '{a} has been telling tales about {t}');

/* ---- the ordinary day (plain pack): first person, from what really happened. A kind with no line here is simply never told. ---- */
lx('ask_day', 'plain', 'What have you been up to?'); lx('ask_day', 'plain', 'How\'s your day been?'); lx('ask_day', 'plain', 'Busy today?'); lx('ask_day', 'plain', 'Anything happen to you today?', { rel: 'friend' });
lx('nothing_much', 'plain', 'Nothing much. Same as always.'); lx('nothing_much', 'plain', 'Quiet day.'); lx('nothing_much', 'plain', 'Not a lot to report.');
lx('acknowledge', 'plain', 'Good going.'); lx('acknowledge', 'plain', 'That\'s something.'); lx('acknowledge', 'plain', 'Fair enough.'); lx('acknowledge', 'plain', 'How did it go?'); lx('acknowledge', 'plain', 'Busy, then.'); lx('acknowledge', 'plain', 'I see.');
lx('empathise', 'plain', 'That sounds rough.'); lx('empathise', 'plain', 'I\'m sorry to hear it.'); lx('empathise', 'plain', 'Ugh. I know that one.'); lx('empathise', 'plain', 'You poor thing.', { rel: 'friend' }); lx('empathise', 'plain', 'Somebody ought to do something about that.');
lx('life:slept', 'plain', 'I slept well enough last night.'); lx('life:slept', 'plain', 'Slept like a log.');
lx('life:slept_rough', 'plain', 'I slept rough again last night.'); lx('life:slept_rough', 'plain', 'Another night on the ground.'); lx('life:slept_rough', 'plain', 'Still no bed of my own.'); lx('life:slept_rough', 'plain', 'I woke up with sand in my ear.');
lx('life:no_privy', 'plain', 'I couldn\'t find a privy this morning. Not my best hour.'); lx('life:no_privy', 'plain', 'There\'s nowhere decent to go round here.');
lx('life:bladder_emergency', 'plain', 'I very nearly didn\'t make it to the privy. Don\'t ask.');
lx('life:went_hungry', 'plain', 'I\'m getting hungry. I haven\'t eaten properly.'); lx('life:went_hungry', 'plain', 'There\'s not been much to eat today.');
lx('life:starving', 'plain', 'I\'m starving. I mean properly starving.');
lx('life:tired', 'plain', 'I\'m worn out. All day on my feet.');
lx('life:ate', 'plain', 'Had a decent meal at last.');
lx('life:bought', 'plain', 'I bought {things} today.'); lx('life:bought', 'plain', 'Picked up {things}.'); lx('life:sold', 'plain', 'I sold {things} today.');
lx('life:planted', 'plain', 'I planted {things} today.'); lx('life:planted', 'plain', 'Put in {things} this morning.');
lx('life:new_in_stock', 'plain', 'The {shop} has {item} in now.'); lx('life:new_in_stock', 'plain', 'Did you know the {shop} is selling {item} now?'); lx('life:new_in_stock', 'plain', 'The {shop} finally has {item}.');
lx('life:out_of_stock', 'plain', 'The {shop} had no {item} left.'); lx('life:out_of_stock', 'plain', 'Went for {item} and the {shop} was out.');
lx('life:could_not_afford', 'plain', 'I couldn\'t afford {item} today.'); lx('life:could_not_afford', 'plain', 'Money is tight. I had to leave the {item}.'); lx('life:could_not_afford', 'plain', 'Everything costs more than I have.');
lx('life:price_up', 'plain', '{item} has gone up at the {shop}.'); lx('life:price_down', 'plain', '{item} is cheaper at the {shop} now.'); lx('life:price_down', 'plain', 'You can get {item} for less at the {shop} today.');
lx('life:baked', 'plain', 'I baked {things} this morning.'); lx('life:baked', 'plain', 'The oven gave me {things} today.'); lx('life:cooked', 'plain', 'I made {things} today.'); lx('life:forged', 'plain', 'I turned out {things} today.'); lx('life:woven', 'plain', 'I finished {things} on the loom.');
lx('life:harvested', 'plain', 'I brought in {things}.'); lx('life:harvested', 'plain', 'Harvested {things} today.');

/* ---- at the stall (plain pack): customer = c, keeper = k ---- */
lx('shop_greet', 'plain', 'Morning.', { band: 'morning' }); lx('shop_greet', 'plain', 'Afternoon.', { band: 'day' }); lx('shop_greet', 'plain', 'Evening.', { band: 'evening' }); lx('shop_greet', 'plain', 'Hello, {li}.'); lx('shop_greet', 'plain', '{li}. Busy today?', { rel: 'friend' });
lx('shop_greet_back', 'plain', 'Morning. What can I get you?', { band: 'morning' }); lx('shop_greet_back', 'plain', 'Hello. What\'ll it be?'); lx('shop_greet_back', 'plain', 'Good day. Looking for something?'); lx('shop_greet_back', 'plain', '{li}! The usual?', { rel: 'friend' });
lx('ask_item', 'plain', 'I\'ll take {things}, please.'); lx('ask_item', 'plain', '{things}, please.'); lx('ask_item', 'plain', 'Could I have {things}?'); lx('ask_item', 'plain', 'Let me have {things}.');
lx('quote_price', 'plain', 'That\'s {money}.'); lx('quote_price', 'plain', '{money} for the lot.'); lx('quote_price', 'plain', 'That comes to {money}.'); lx('quote_price', 'plain', '{money}, and cheap at the price.');
lx('pay_ok', 'plain', 'Here you are.'); lx('pay_ok', 'plain', 'There. Count it.'); lx('pay_ok', 'plain', 'Right, {money}.');
lx('thank_shop', 'plain', 'Thank you.'); lx('thank_shop', 'plain', 'Much obliged.'); lx('thank_shop', 'plain', 'There you go. Thanks.'); lx('thank_shop', 'plain', 'Pleasure doing business.');
lx('cant_afford', 'plain', 'That\'s more than I\'ve got. I\'ll leave it.'); lx('cant_afford', 'plain', 'I\'m short today, sorry.'); lx('cant_afford', 'plain', 'Ah. I haven\'t got that much.');
lx('make_do', 'plain', 'Come back when you have it.'); lx('make_do', 'plain', 'No hurry. It\'ll keep.'); lx('make_do', 'plain', 'Take fewer, then.');
lx('no_stock', 'plain', 'Sorry, I\'m out of {item} just now.'); lx('no_stock', 'plain', 'None left, I\'m afraid.'); lx('no_stock', 'plain', 'The {item} sold out this morning.');
lx('shrug_off', 'plain', 'Next time, then.'); lx('shrug_off', 'plain', 'Never mind.'); lx('shrug_off', 'plain', 'I\'ll try again tomorrow.');
lx('offer_goods', 'plain', 'I\'ve {things} to sell.'); lx('offer_goods', 'plain', 'Would you take {things}?'); lx('offer_goods', 'plain', 'Brought you {things}.');
lx('bid_price', 'plain', 'I can give you {money} for them.'); lx('bid_price', 'plain', '{money}, and that\'s fair.'); lx('bid_price', 'plain', 'I\'ll say {money}.');
lx('accept_deal', 'plain', 'Done.'); lx('accept_deal', 'plain', 'That\'ll do.'); lx('accept_deal', 'plain', 'Fine.');
lx('no_demand', 'plain', 'I\'ve plenty of those already, thanks.'); lx('no_demand', 'plain', 'Not today. The stall is full of {item}.'); lx('no_demand', 'plain', 'I can\'t pay for any more today.');
lx('new_stock_remark', 'plain', 'We\'ve {item} in this week, if you\'re interested.'); lx('new_stock_remark', 'plain', 'New in: {item}.');
lx('farewell_shop', 'plain', 'Good day.'); lx('farewell_shop', 'plain', 'See you.'); lx('farewell_shop', 'plain', 'Right. Back to it.');

lx('ask_price', 'plain', 'What are {item} going for?'); lx('ask_price', 'plain', 'Seen what {item} cost lately?'); lx('ask_price', 'plain', 'Do you know what {item} are at the moment?');
lx('tell_price', 'plain', 'I paid {money} each last time.'); lx('tell_price', 'plain', 'About {money}, when I looked.'); lx('tell_price', 'plain', '{money} each. Not cheap, not dear.');
lx('react_price', 'plain', 'Hm. Good to know.'); lx('react_price', 'plain', 'That\'s more than I thought.'); lx('react_price', 'plain', 'Fair enough. Thanks.'); lx('react_price', 'plain', 'I\'ll see if it\'s cheaper elsewhere.');

/* ---- calls from the stall ---- */
lx('keeper_call', 'plain', 'New in this week: {item}.', { call: 'new' }); lx('keeper_call', 'plain', 'Come and see the {item}. Just in.', { call: 'new' }); lx('keeper_call', 'plain', 'We\'ve {item} now. First of the season.', { call: 'new' });
lx('keeper_call', 'plain', '{item} are cheap today. {money} each.', { call: 'cheap' }); lx('keeper_call', 'plain', 'Cheap {item} today, {money} each.', { call: 'cheap' });
lx('keeper_call', 'plain', 'Fresh {item}, {money} each.'); lx('keeper_call', 'plain', 'Get your {item} here.'); lx('keeper_call', 'plain', '{item}, {money}. Come and look.'); lx('keeper_call', 'plain', 'Anyone need {item}?');
lx('call_reply', 'plain', 'Maybe later.'); lx('call_reply', 'plain', 'Not today, thanks.'); lx('call_reply', 'plain', 'I\'ll be back.'); lx('call_reply', 'plain', 'Not now, I\'m busy.');

/** what a speaker's line may be conditioned on, for this act */
function lxContext(sp: any, li: any, c: any) {
  const rel = (sp.fam && (sp.fam.spouse === li.id || (sp.fam.kids || []).includes(li.id) || sp.fam.mother === li.id || sp.fam.father === li.id)) ? 'kin' : (sp.rel && sp.rel[li.id] === 'friend') || (sp.aff[li.id] || 0) > 30 ? 'friend' : (sp.know && (sp.know[li.id] || 0) > 10) ? 'acquaintance' : 'stranger';
  return { band: todBand(game.time), rel, state: c.state || talkState(sp) || 'fine', trait: (sp.traits || [])[0], how: c.how, conf: c.conf, call: c.call, op: c.op };
}
/** choose the wording of an act: the pack's lines that fit and whose things exist, the more specific the better, what the listener heard lately worse */
function lxSay(act: string, sp: any, li: any, c: any): string {
  const ctx: any = lxContext(sp, li, c); const heard = li.heard || (li.heard = {});
  const pool = (pack: string) => LEX.filter(e => e.act === act && e.pack === pack && WORLD.ok(e.requires) && Object.keys(e.tags).every(k => k === 'trait' ? (sp.traits || []).includes(e.tags[k]) : e.tags[k] === ctx[k]));
  const pk = (typeof town !== 'undefined' && town && town.pack) || TALK_PACK.cur; let cands = pool(pk); if (!cands.length) cands = pool('plain'); if (!cands.length) return '';
  let best: any = null, bs = -1e9;
  for (const e of cands) { const id = act + '|' + e.text, g = LX_RECENT[id], s = Object.keys(e.tags).length * 2 - (heard[id] != null ? 4 - Math.min(3, (game.time - heard[id]) / 600) : 0) - (g != null && game.time - g < 180 ? 2.2 : 0) + Math.random() * 1.5; if (s > bs) { bs = s; best = e; } }
  heard[act + '|' + best.text] = game.time; LX_RECENT[act + '|' + best.text] = game.time;   // (what was said lately, by anyone, is less likely to be said again)
  const place = String(placeOf(sp) || '').replace(/^(in|at)\s+/, ''); const inP = /^the /.test(place) ? 'at ' + place : place ? 'in ' + place : 'here';
  const raw = best.text.replace(/\{li\}/g, li.first).replace(/\{sp\}/g, sp.first).replace(/\{place\}/g, inP).replace(/\{job\}/g, String(sp.job || 'daily').toLowerCase()).replace(/\{state\}/g, ctx.state).replace(/\{clock\}/g, lxClock()).replace(/\{money\}/g, lxMoney(c.price)).replace(/\{price\}/g, c.price != null ? String(c.price) : '').replace(/\{about\}/g, c.about || 'them').replace(/\{reason\}/g, c.reason || '').replace(/\{shop\}/g, c.shop || 'stall').replace(/\{things\}/g, lxCount(c.qty, c.item)).replace(/\{qty\}/g, c.qty != null ? String(c.qty) : '').replace(/\{item\}/g, c.item || c.pitem || '').replace(/\{news\}/g, c.news || '').replace(/\{who\}/g, c.who || 'them');
  return placeWords(lxTic(sp, act, pk, raw).replace(/\s{2,}/g, ' ').replace(/\s+$/, '').replace(/(^|[.!?]\s+)([a-z])/g, (_m: string, a: string, b: string) => a + b.toUpperCase()));
}

/** a count of something, said the way people say it: "a cabbage", "7 barley", "12 turnips" (a plural name drops its s for one; a mass noun is "a little") */
function lxCount(qty: any, name: string): string {
  name = name || 'something'; if (qty == null) return name; if (qty !== 1) return qty + ' ' + name;
  if (/ies$/.test(name)) return 'a ' + name.slice(0, -3) + 'y'; if (/oes$/.test(name)) return 'a ' + name.slice(0, -2); if (/ss$/.test(name) || !/s$/.test(name)) return 'a little ' + name; return 'a ' + name.slice(0, -1);
}

/** money said the way people say it: "a denarius", "6 denarii" */
function lxMoney(n: any): string { if (n == null) return 'a few denarii'; n = Math.round(n); return n === 1 ? 'one denarius' : n + ' denarii'; }

/** the time as people say it: "7:40" */
function lxClock(): string { const m = Math.floor(game.time % 1440); return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'); }
/** a verbal habit: each person has none or one of the pack's small openers and now and then uses it on a statement, so people are recognisable by how they talk */
const LX_TICS: any = {
  plain: ['you know,', 'honestly,', 'mind you,', 'I suppose,', 'as it happens,'],
  island: ['as far as I know,', 'more or less,', 'I think,', 'for what it is worth,', 'in my experience,', 'probably,', 'to be fair,']
};
const LX_TIC_ACTS = /^(remark_|share_news|answer_how|report_day|life:|tell_price|ask_news|nothing_much)/;
const LX_RECENT: any = {};
function lxTic(sp: any, act: string, pack: string, text: string): string {
  const list = LX_TICS[pack] || LX_TICS.plain; if (!LX_TIC_ACTS.test(act) || text.length < 28 || text.split(/[.?]/)[0].length < 18) return text;
  const k = ((sp.id * 2654435761) >>> 0) % (list.length + 3); if (k >= list.length) return text;   // (some people have none)
  if (Math.random() > 0.3) return text; const t = list[k];
  const w0 = text.split(/[ ,.]/)[0]; const keep = w0 === 'I' || /^I'/.test(text) || npcs.some((n: any) => n.first === w0);   // (an I or a name keeps its capital)
  return t + ' ' + (keep ? text : text.charAt(0).toLowerCase() + text.slice(1));
}
