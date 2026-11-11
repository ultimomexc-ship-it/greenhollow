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

/** what a speaker's line may be conditioned on, for this act */
function lxContext(sp: any, li: any, c: any) {
  const rel = (sp.fam && (sp.fam.spouse === li.id || (sp.fam.kids || []).includes(li.id) || sp.fam.mother === li.id || sp.fam.father === li.id)) ? 'kin' : (sp.rel && sp.rel[li.id] === 'friend') || (sp.aff[li.id] || 0) > 30 ? 'friend' : (sp.know && (sp.know[li.id] || 0) > 10) ? 'acquaintance' : 'stranger';
  return { band: todBand(game.time), rel, state: c.state || talkState(sp) || 'fine', trait: (sp.traits || [])[0], how: c.how, conf: c.conf };
}
/** choose the wording of an act: the pack's lines that fit and whose things exist, the more specific the better, what the listener heard lately worse */
function lxSay(act: string, sp: any, li: any, c: any): string {
  const ctx: any = lxContext(sp, li, c); const heard = li.heard || (li.heard = {});
  const pool = (pack: string) => LEX.filter(e => e.act === act && e.pack === pack && WORLD.ok(e.requires) && Object.keys(e.tags).every(k => k === 'trait' ? (sp.traits || []).includes(e.tags[k]) : e.tags[k] === ctx[k]));
  let cands = pool(TALK_PACK.cur); if (!cands.length) cands = pool('plain'); if (!cands.length) return '';
  let best: any = null, bs = -1e9;
  for (const e of cands) { const id = act + '|' + e.text, s = Object.keys(e.tags).length * 2 - (heard[id] != null ? 4 - Math.min(3, (game.time - heard[id]) / 600) : 0) + Math.random() * 1.5; if (s > bs) { bs = s; best = e; } }
  heard[act + '|' + best.text] = game.time;
  const place = String(placeOf(sp) || '').replace(/^(in|at)\s+/, ''); const inP = /^the /.test(place) ? 'at ' + place : place ? 'in ' + place : 'here';
  const raw = best.text.replace(/\{li\}/g, li.first).replace(/\{sp\}/g, sp.first).replace(/\{place\}/g, inP).replace(/\{job\}/g, String(sp.job || 'daily').toLowerCase()).replace(/\{state\}/g, ctx.state).replace(/\{news\}/g, c.news || '').replace(/\{who\}/g, c.who || 'them');
  return placeWords(raw.replace(/(^|[.!?]\s+)([a-z])/g, (_m: string, a: string, b: string) => a + b.toUpperCase()));
}
