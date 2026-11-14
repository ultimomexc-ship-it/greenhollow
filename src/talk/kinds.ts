/* The one list of life-event kinds (docs/talk-engine.md, section 3d). Adding a kind is one line here. Each has
     family   : the group it belongs to (trade, farm, make, body, home, place, people, crime, social, meddle), which also gives it generic wording and a digest row
     needs    : data the emitter must supply (LIFE.emit refuses without it, in tests it throws)
     tell     : how tellable it is, 0..1 (how likely it is to be brought up and passed on)
     tags     : for appraisal (same tags as LF2_TAGS)
   Game code emits these with structured data and never with words. */

const EVK = (id: string, family: string, o?: any) => REG.define('event', id, Object.assign({ family, needs: [], tell: 0.3, tags: [] }, o || {}));

/* ---- the events the village already makes (life2 `lfEmit`); they come through the contract as they are ---- */
for (const k of [
  'theft',
  'breakin',
  'pickpocket',
  'robbed',
  'cheat',
  'bribe',
  'escape',
  'arrest',
  'fined',
  'sabotage',
  'snoop',
  'blockdoor',
  'shutin'
])
  EVK(k, 'crime', { tell: 0.7 });
for (const k of ['quarrel', 'brawl', 'shove', 'confront', 'jealous', 'rumour', 'report']) EVK(k, 'social', { tell: 0.6 });
for (const k of ['lent_hand', 'sick_visit']) EVK(k, 'people', { tell: 0.25 });
for (const k of ['gift', 'help', 'charity', 'dole', 'repair', 'distract']) EVK(k, 'people', { tell: 0.4 });
for (const k of ['crush', 'courting', 'tryst']) EVK(k, 'romance', { tell: 0.7 });
for (const k of ['dice', 'sing', 'stumble', 'smelly', 'newclothes', 'knock', 'wake']) EVK(k, 'daily', { tell: 0.2 });
EVK('arrival', 'place', { tell: 0.9 });
EVK('moved_in', 'home', { tell: 0.5 });
EVK('stall_opened', 'place', { tell: 0.5 });
EVK('step_reached', 'place', { needs: ['qty'], tell: 0.1 });
EVK('came_ashore', 'home', { needs: ['qty'], tell: 0.4 });
EVK('apart', 'home', { tell: 0.5, tags: ['misfortune'] });
EVK('rent_paid', 'home', { needs: ['price'], tell: 0.12 });
EVK('rent_unpaid', 'home', { needs: ['price'], tell: 0.6, tags: ['misfortune'] });
EVK('no_yard', 'home', { tell: 0.55, tags: ['misfortune'] });

/* ---- the everyday life the talk will be made of (emitters arrive one system at a time; the kind is defined first so the contract can be checked) ---- */
// trade
EVK('bought', 'trade', { needs: ['item', 'qty'], tell: 0.25 });
EVK('sold', 'trade', { needs: ['item', 'qty'], tell: 0.2 });
EVK('could_not_afford', 'trade', { needs: ['item'], tell: 0.4, tags: ['misfortune'] });
EVK('out_of_stock', 'trade', { needs: ['item'], tell: 0.4 });
EVK('new_in_stock', 'trade', { needs: ['item'], tell: 0.55 });
EVK('price_up', 'trade', { needs: ['item'], tell: 0.4 });
EVK('price_down', 'trade', { needs: ['item'], tell: 0.4 });
// farm and work
EVK('planted', 'farm', { needs: ['qty'], tell: 0.25 });
EVK('harvested', 'farm', { needs: ['qty'], tell: 0.35 });
EVK('crop_failed', 'farm', { tell: 0.6 });
EVK('worked_shift', 'farm', { tell: 0.1 });
EVK('tool_worn', 'farm', { tell: 0.3 });
EVK('tool_broke', 'farm', { tell: 0.5 });
// making
EVK('baked', 'make', { tell: 0.3 });
EVK('cooked', 'make', { tell: 0.25 });
EVK('forged', 'make', { tell: 0.25 });
EVK('woven', 'make', { tell: 0.2 });
EVK('sawed', 'make', { tell: 0.15 });
EVK('mined', 'make', { tell: 0.2 });
EVK('built', 'make', { tell: 0.4 });
// body and needs
EVK('ate', 'body', { tell: 0.07 });
EVK('went_hungry', 'body', { tell: 0.5, tags: ['misfortune'] });
EVK('starving', 'body', { tell: 0.8, tags: ['misfortune'] });
EVK('slept', 'body', { needs: ['where'], tell: 0.08 });
EVK('slept_rough', 'body', { tell: 0.6, tags: ['misfortune'] });
EVK('bladder_emergency', 'body', { tell: 0.5, tags: ['embarrass'] });
EVK('used_privy', 'body', { tell: 0.05 });
EVK('no_privy', 'body', { tell: 0.6, tags: ['misfortune'] });
EVK('washed', 'body', { tell: 0.1 });
EVK('tired', 'body', { tell: 0.2 });
EVK('ill', 'body', { tell: 0.6, tags: ['health'] });
EVK('recovered', 'body', { tell: 0.5 });
EVK('worked_with', 'people', { needs: ['with'], tell: 0.3 });
EVK('ate_with', 'people', { needs: ['with'], tell: 0.3 });
EVK('found', 'daily', { needs: ['thing'], tell: 0.6 });
// home
EVK('got_bed', 'home', { tell: 0.5 });
EVK('lost_bed', 'home', { tell: 0.7, tags: ['misfortune'] });
EVK('moved_house', 'home', { tell: 0.6 });
// surprises (life2/surprise.ts): build mode changed somebody's place or home while time stood still; nobody knows who or how ({place} says what)
EVK('turned_up', 'home', { tell: 0.85, tags: ['mystery'] });
EVK('home_changed', 'home', { tell: 0.7, tags: ['mystery'] });
EVK('home_lost', 'home', { tell: 0.8, tags: ['mystery'] });
// meddling (phase 3)
EVK('wall_removed', 'meddle', { needs: ['place'], tell: 0.9, tags: ['embarrass', 'nuisance'] });
EVK('bed_moved', 'meddle', { tell: 0.8, tags: ['mystery'] });
EVK('home_destroyed', 'meddle', { tell: 1, tags: ['harm'] });
EVK('furniture_removed', 'meddle', { tell: 0.7, tags: ['nuisance'] });
EVK('person_pushed', 'meddle', { tell: 0.5, tags: ['nuisance', 'embarrass'] });
EVK('caught_bathing', 'meddle', { tell: 1, tags: ['embarrass', 'scandal'] });
EVK('caught_praying', 'meddle', { tell: 0.9, tags: ['embarrass', 'scandal'] });
EVK('betrayal', 'social', { tell: 0.8, tags: ['deceit', 'harm'] });
EVK('building_down', 'meddle', { tell: 0.9, tags: ['harm'] });
EVK('caught_on_privy', 'meddle', { tell: 1, tags: ['embarrass', 'scandal'] });

/* ---- things the events refer to: items (goods) and seeds are defined from the game's own tables, so a new good or seed is talkable the moment it exists ---- */
if (typeof GOODS !== 'undefined')
  for (const g of Object.keys(GOODS)) REG.define('item', g, { name: String(GOODS[g].name || g).toLowerCase(), category: 'good' });
if (typeof IT_SEEDS !== 'undefined')
  for (const k of Object.keys(IT_SEEDS)) REG.define('seed', k, { name: String(IT_SEEDS[k].word || k), category: 'seed' });

/* ---- what the digest calls the troubles people report ---- */
const LIFE_TROUBLE: any = {
  slept_rough: 'slept rough',
  no_privy: 'could not find a privy',
  bladder_emergency: 'only just made it',
  went_hungry: 'went hungry',
  starving: 'are starving',
  could_not_afford: 'could not afford something',
  rent_unpaid: 'could not pay the rent',
  no_yard: 'had no yard',
  apart: 'live apart from their spouse',
  out_of_stock: 'found it out of stock',
  tool_broke: 'broke a tool',
  lost_bed: 'lost their bed',
  ill: 'fell ill',
  crop_failed: 'lost a crop'
};

/* what an event was about, in a few words, for stories that refer back to it ("confronted Tipping in front of everyone over the wall"): REG meta `matter`, the {matter} slot of event lines */
const EV_MATTER: any = {
  wall_removed: 'the wall',
  home_destroyed: 'the house',
  building_down: 'the building',
  furniture_removed: 'the furniture',
  person_pushed: 'the shoving',
  bed_moved: 'the bed',
  caught_on_privy: 'the privy',
  caught_bathing: 'the bath',
  caught_praying: 'the prayer',
  theft: 'the theft',
  shove: 'the shoving',
  betrayal: 'the secret',
  quarrel: 'the quarrel',
  crush: 'the affair',
  jealous: 'the affair',
  brawl: 'the fight'
};
for (const k of Object.keys(EV_MATTER)) if (REG.has('event', k)) REG.get('event', k).matter = EV_MATTER[k];
