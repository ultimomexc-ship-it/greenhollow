/* ================= dialogue / cv-world: the village behind the conversations =================
   Everyone has a life beyond the player: an ambition, a regret, a pride, a fear, and sometimes a secret. People are tied to each
   other by older stories (debts, feuds, old flames, things somebody saw). The village has legends. And people remember you.

   All of it is generated once per town, from the town's seed, the first time somebody talks (so a seed always gives the same village),
   and it feeds the simulation a little (a debtor avoids their creditor; a feud sours two people), so what is said is also true.

   Facts are told in layers: 0 a hint, 1 the story, 2 what they do not usually say. cv-talk.ts decides how much they reveal.            */
const cvHashStr = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function cvRng(seed: string) { let a = cvHashStr(seed); return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** a line from an array, or the result of a function, or the string itself */
const pk = (x, ...a) => { const v = typeof x === 'function' ? x(...a) : x; return Array.isArray(v) ? anyOf(v) : v; };
const cvPick = (R, arr) => arr[Math.floor(R() * arr.length) % arr.length];
const cvCap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const cvLow = (s: string) => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
/** pronouns and the verb forms a first-person bank line needs: cvSay('{I} {have} lost {my} ring', o) -> "He has lost his ring" */
function cvPron(o) { return o.female ? { he: 'she', him: 'her', his: 'her', He: 'She' } : { he: 'he', him: 'him', his: 'his', He: 'He' }; }
function cvThird(s: string, o) { const p = cvPron(o); return s.replace(/\{\+(\w+)\}/g, (m, v) => /(s|sh|ch|x|o)$/.test(v) ? v + 'es' : v + 's').replace(/^\{I\} /, '').replace(/\{I\}/g, p.He).replace(/\{my\}/g, p.his).replace(/\{am\}/g, 'is').replace(/\{have\}/g, 'has').replace(/\{me\}/g, p.him); }
function cvFirst(s: string) { return s.replace(/\{\+(\w+)\}/g, '$1').replace(/^\{(am|have)\}/, 'I {$1}').replace(/\{I\}/g, 'I').replace(/\{my\}/g, 'my').replace(/\{am\}/g, 'am').replace(/\{have\}/g, 'have').replace(/\{me\}/g, 'me'); }
const cvAdult = n => n && !n.dead && !n.infant && n.age >= 16;

/* ---------------- a life: ambition, regret, pride, fear, and maybe a secret ---------------- */
const CV_AMB: any = {
  Farmer: ['own the big field by the stream', 'grow a pumpkin the size of a goat', 'put by enough to stop dreading winter', 'have an orchard. Apples. Rows of them', 'win the prize for the best barley, just once'],
  Woodcutter: ['build a house with a window that faces the sea', 'fell the oldest pine and hear it come down', 'teach somebody to swing an axe properly', 'carve a chair so good nobody dares sit in it'],
  Stonecutter: ['carve something that outlasts the village', 'build one wall that never needs patching', 'put a face on the church that people stop and look at'],
  Fisher: ['land the great grey eel everybody swears is out there', 'own a boat with a real sail', 'see what is on the far side of the sea', 'sail round the whole island in a day'],
  Gatherer: ['find a berry nobody has ever named', 'keep a herb garden of my own', 'know every plant on the island by its first leaf'],
  Baker: ['bake bread people talk about in other villages', 'be trusted with the wedding cakes', 'make a loaf the shape of the church, with a door that opens'],
  Smith: ['forge one blade good enough to hang on a wall', 'make a bell for the church and hear it ring', 'teach an apprentice who turns out better than me'],
  Guard: ['go a whole year without arresting anybody I like', 'be remembered as fair', 'catch somebody truly wicked, just once, so it was all worth it'],
  Cook: ['feed the whole village at one long table', 'make a stew people cross the island for', 'write my recipes down before I forget them'],
  Shopkeeper: ['have a shop with two doors and a sign', 'go one whole month without anyone asking for credit'],
  BathKeeper: ['get the big pool truly hot, the way the old baths on the mainland were', 'have one quiet day at the baths. Just one'],
  Builder: ['build something with a second floor', 'put up a house in a week, start to finish'],
  Priest: ['hear a confession that actually surprises me'],
  child: ['be a watchman when I grow up', 'catch a fish bigger than my arm', 'have a dog (do not tell Mum)', 'stay up all night, just once', 'climb the church roof and touch the gull', 'be the fastest runner in the village'],
  elder: ['see the little ones grown and settled', 'sit in the sun and be left alone', 'be buried near the old pine', 'see one more bonfire. Then another one', 'hear somebody sing my mother\'s songs before I go'],
  any: ['learn to read properly', 'see the whole island from the highest hill at dawn', 'be remembered for something besides my cooking', 'host the bonfire one year', 'learn to swim', 'be asked to dance', 'see this place with a second house in it', 'go to the mainland and come back with a story', 'have a garden with a bench in it, and sit on the bench', 'learn to play the pipes', 'have my own boat, even a little one', 'make enough to stop counting coins'],
};
/* a life's facts carry their own follow-ups: how it happened, what they would do differently, whether it can be put right, who saw, since when */
const CV_REGRET: any[] = [
  { t: '{I} never learned to read', how: 'There was a teacher one winter, when I was small. I went twice, and then the boat needed mending. Then it always needed mending.', diff: 'I\'d have gone the third time. That\'s all. Just the third time.', fix: 'It\'s not too late, people say. People say a lot of things. I\'d have to sit with the children.' },
  { t: '{I} left someone behind on the mainland and never wrote', how: 'A sister. We had words the night before the boat. I thought I\'d write when I was settled. I\'m still not settled.', diff: 'I\'d have said sorry on the dock instead of looking at the sea.', fix: 'I don\'t even know if she\'s alive. A letter could go to nobody.' },
  { t: '{I} sold {my} father\'s boat for far too little', how: 'I needed the money that winter, and a man from the mainland knew it. He smiled the whole time.', diff: 'I\'d have gone hungry a week longer and kept the boat.', fix: 'I see her sometimes, out on the water with somebody else\'s sail. You can\'t buy back a thing like that.' },
  { t: '{I} said something at {my} mother\'s funeral that cannot be taken back', how: 'My brother had been drinking and I\'d been grieving, and I said what I\'d been thinking for ten years. In front of everyone.', diff: 'I\'d have said it ten years earlier, quietly, to his face. Or never.', fix: 'We nod at each other now. That took five years. Maybe five more.' },
  { t: '{I} was too proud to ask for help when it mattered', how: 'The winter the roof came in. I patched it myself, badly, and my youngest took a chill that wouldn\'t leave.', diff: 'I\'d have knocked on every door in the lane.', fix: 'I ask now. Not well, but I ask.' },
  { t: '{I} never told someone how {I} felt, and then it was too late', how: 'They sailed with the spring boats. I had it all ready to say, and then the boat was ready and they went.', diff: 'I\'d have run down to the water and said it badly. Badly is better than never.', fix: 'There\'s no putting it right. There\'s only saying the next thing when it comes.' },
  { t: '{I} chose the safe thing every single time', how: 'Every time a door opened I looked at the weather and stayed in. Thirty years of good sense. Look where it\'s got me: here.', diff: 'Just once, I\'d have got on the boat.', fix: 'I\'m working up to something. Don\'t ask what. I\'ll lose my nerve.' },
  { t: '{I} laughed at somebody who was being brave, and never said sorry', how: 'A boy stood up at the harvest feast to sing. His voice broke. I laughed loudest. He never sang again.', diff: 'I\'d have kept my mouth shut, at the very least.', fix: 'He\'s grown now. I keep meaning to say something. What do you say?' },
  { t: '{I} let {my} brother take the blame for something {I} did', how: 'A broken cart, years ago. Our father belted him for it, and he looked at me the whole time and said nothing.', diff: 'I\'d have spoken up. I was nine. Nine is old enough.', fix: 'He\'s never mentioned it. That\'s worse than if he had.' },
  { t: '{I} missed {my} father\'s last words because {I} was at the tavern', how: 'They sent a boy for me. I said I\'d come after this cup. There was no after.', diff: 'I\'d have put down the cup.', fix: 'I hardly drink now. It\'s not much of a penance, but it\'s mine.' },
  { t: '{I} turned away a stranger in a storm', how: 'A man at the door, soaked, asking for a corner by the fire. I didn\'t like his face. I said we were full.', diff: 'I\'d have let him in. A face is just a face.', fix: 'They found him in the morning, under the boats. He was fine. I wasn\'t.' },
  { t: '{I} broke off {my} engagement by letter', how: 'I was a coward about it. Three lines, folded twice, left under a stone where we used to meet.', diff: 'I\'d have said it to their face. They deserved that much.', fix: 'They married somebody kinder. Good. It doesn\'t make the letter any better.' },
  { t: '{I} took money that was meant for the church roof', how: 'Only once. Only a little. There was a week with nothing on the table.', diff: 'I\'d have asked. Somebody would have helped. Somebody always does, here.', fix: 'I\'ve put back twice what I took, a coin at a time. Nobody knows. That\'s not the same as it being right.' },
  { t: '{I} never learned {my} grandmother\'s songs before she died', how: 'She sang them all day long and I thought there\'d always be time.', diff: 'I\'d have sat with her more. Asked her to sing them slowly.', fix: 'I remember two. Half of one. I hum it and it comes out wrong.' },
  { t: '{I} burned a whole harvest through carelessness', how: 'A lamp in the barn. One night. The whole year\'s grain.', diff: 'I\'d have carried the lamp outside. Such a small thing.', fix: 'I check every lamp twice now. People laugh. Let them.' },
  { t: '{I} let a friendship go cold over nothing', how: 'We argued about whose turn it was to fetch water. Truly. That was it. Then neither of us went round.', diff: 'I\'d have fetched the water. Both turns.', fix: 'We say good morning. It\'s the coldest good morning in the village.' },
  { t: '{I} told a secret that was not mine to tell', how: 'Somebody trusted me, and I traded it for a laugh at the tavern.', diff: 'I\'d have kept my mouth shut and gone home early.', fix: 'They know it was me. They\'ve never said. Every time they\'re kind to me it\'s like a slap.' },
  { t: '{I} wasted {my} best years being angry', how: 'At my father, at the sea, at the price of grain. Everything. It was like carrying a hot stone about.', diff: 'I\'d have put the stone down sooner. You can just put it down. Nobody tells you that.', fix: 'I\'m trying. Most days I manage it by noon.' },
];
const CV_PRIDE: any[] = [
  { t: '{I} once carried a whole sheep home on {my} back', how: 'It broke its leg on the cliff path in a storm. Two miles. It bleated in my ear the entire way.', saw: 'The whole lane, when I came in. I was soaked and the sheep was furious. Nobody has let me forget it.' },
  { t: '{I} can out-walk anyone on the island', how: 'Practice. When you\'ve nowhere you want to be, you walk. Eventually you\'re quick at it.', saw: 'Ask anyone who\'s tried to keep up. They\'ll tell you, once they\'ve got their breath back.' },
  { t: '{I} have never missed a day of work', how: 'Not for rain, not for fever, not for my own wedding. I was back at it by noon.', saw: 'Everyone. That\'s the point. You can\'t hide not missing a day.' },
  { t: '{I} won the dice at the harvest feast, fair and square', how: 'Three sixes on the last throw, with the whole tavern watching. I nearly fainted.', saw: 'Everyone. Half of them still say I cheated. I didn\'t. That\'s what makes it sweet.' },
  { t: '{I} pulled somebody out of the water once. They never said thank you; {I} did not mind', how: 'A child, off the rocks, in the cold months. I didn\'t think. You don\'t. I was in before I knew it.', saw: 'Only the child. And they were too busy coughing.' },
  { t: '{I} can name every bird on the island by its voice', how: 'My grandfather. Mornings on the hill, before the work. He\'d whistle and I\'d answer.', saw: 'Come up the hill at dawn and I\'ll prove it. Bring bread; the birds expect it.' },
  { t: '{I} built the first stone wall in the village that is still standing', how: 'Every stone by hand, fitted so tight you couldn\'t slide a knife in. No mortar. Just patience.', saw: 'Walk down the north lane and look. It\'s the one the children sit on.' },
  { t: '{I} once argued a tax man out of the village', how: 'He came over on the boat with a ledger and a hat. I talked for an hour about drainage. He left on the evening boat.', saw: 'Half the village was hiding behind the well. They cheered when he went.' },
  { t: '{I} got a family through the worst winter anyone remembers', how: 'Thin soup and stories. The soup ran out before the stories did.', saw: 'Look at them now. That\'s who saw.' },
  { t: '{I} beat the smith at arm-wrestling', how: 'He\'d had two cups and I\'d had none. I\'m not saying it was fair. I\'m saying I won.', saw: 'The whole tavern. He\'s been sour about it since.' },
  { t: '{I} once sang at a wedding and made the bride cry, in the good way', how: 'An old song about the sea. I didn\'t know I could hold the last note that long. Neither did anyone.', saw: 'Everyone. Ask the bride. She still asks me to sing it.' },
  { t: '{I} found the spring on the hill that half the village drinks from', how: 'I followed a deer. I\'m not joking. It knew where the water was and I didn\'t.', saw: 'Nobody. But everyone drinks from it, so.' },
  { t: '{I} kept a whole household fed with a fishing line and a stubborn streak', how: 'The year the grain failed. Every morning before light, on the rocks.', saw: 'The fish, mostly. And the gulls, who were very interested.' },
  { t: '{I} made the bench outside the church, and nobody knows', how: 'One winter, from a fallen oak. I left it there one night and never said.', saw: 'Nobody. That\'s what I like about it. Don\'t you tell.' },
];
const CV_FEAR: any[] = [
  { t: '{am} afraid of deep water', since: 'Since I went through the ice on the pond as a child. I remember the colour more than the cold.' },
  { t: '{am} afraid of being left alone', since: 'Since I can remember. My mother used to go to market and I\'d sit by the door until she came back.' },
  { t: '{am} afraid of ending up like {my} father', since: 'Since I caught myself shouting at a bucket the way he did. Same words. Same voice.' },
  { t: '{am} afraid there is nothing past the horizon', since: 'Since a sailor told me, drunk, that he\'d been to the edge. He was lying. Probably.' },
  { t: '{am} afraid of dying before the house is finished', since: 'Since I started the house. Which tells you how long it\'s been going on.' },
  { t: '{am} afraid of geese', since: 'Since a goose. That\'s all I\'ll say. It knows what it did.' },
  { t: '{am} afraid that everyone is only being polite', since: 'Since a feast, when I heard them laughing as I walked away. Might have been about something else. Might not.' },
  { t: '{am} afraid of the dark under the trees', since: 'Since my uncle\'s stories. He was a cruel storyteller. Very good, and very cruel.' },
  { t: '{am} afraid of fire', since: 'Since the barn went up when I was eight. You never forget that sound.' },
  { t: '{am} afraid of being forgotten', since: 'Since my grandmother died, and within a year nobody said her name but me.' },
  { t: '{am} afraid of the sea in winter', since: 'Since the storm that took the Lucius boat. We watched from the cliff. We couldn\'t do a thing.' },
  { t: '{am} afraid of getting old and useless', since: 'Since my knees started telling me the weather.' },
  { t: '{am} afraid of thunder', since: 'Always. Grown, and I still count between the flash and the bang.' },
  { t: '{am} afraid somebody will find out what {I} really think of them', since: 'Since I started thinking it. Which was about a week after I met them.' },
  { t: '{am} afraid of falling ill with nobody noticing', since: 'Since last winter. I had a fever for three days and nobody knocked.' },
];
/* guilty secrets: [kind, text, how much they would hate it to get out, who it suits] */
const CV_SECRETS: any[] = [
  ['skim', '{I} {have} been taking a handful of grain from the larder every week', 0.8, n => lf2Has(n, 'greedy') || n.coin < 6],
  ['poems', '{I} {have} been writing love poems to somebody who is not {my} spouse', 0.9, n => !!(n.fam && n.fam.spouse)],
  ['ring', '{I} lost the family ring at dice and told everyone it was stolen', 0.85, n => n.age > 22],
  ['reader', '{I} cannot actually read, and {have} been bluffing for years', 0.7, n => n.age > 25],
  ['bottle', '{I} {+keep} a bottle hidden behind the hearth and {+visit} it more than {I} {+admit}', 0.6, n => n.age > 25],
  ['grand', '{I} told everyone {I} came from a grand family. {I} did not', 0.6, n => true],
  ['coward', '{I} ran when the roof gave way at the chapel and left somebody underneath', 0.95, n => n.age > 22],
  ['cats', '{I} {+feed} every stray in the village and {+pretend} {I} {+dislike} them', 0.25, n => lf2Has(n, 'generous') || lf2Has(n, 'grumpy')],
  ['loan', '{I} {have} been quietly lending coins to people who will never repay', 0.5, n => lf2Has(n, 'generous')],
  ['leave', '{I} {+plan} to take the next ship out and not come back', 0.85, n => n.age < 40],
  ['letters', '{I} still {+write} to an old sweetheart on the mainland and never {+send} the letters', 0.6, n => n.age > 25],
  ['swim', '{I} cannot swim, and {have} let everyone believe {I} can', 0.45, n => n.age > 16],
  ['stone', '{I} moved the boundary stone by {my} field, a little, years ago', 0.85, n => n.job === 'Farmer' || n.age > 30],
  ['song', '{I} wrote the rude song about the council that everybody sings', 0.5, n => n.age > 18],
  ['dog', '{I} {have} been sneaking scraps to the tavern dog for years, which is why it is so fat', 0.2, n => true],
  ['wager', '{I} bet {my} winter savings on one throw of the dice and lost the lot', 0.75, n => n.age > 20],
  ['name', '{I} was born with a different name and changed it on the boat over', 0.7, n => n.age > 25],
  ['hide', '{I} hid in the privy for a whole afternoon to get out of the harvest', 0.3, n => n.age > 16],
];
function cvLife(o) {
  if (o.cvLife) return o.cvLife;
  const R = cvRng((town.seed || 'x') + ':life:' + o.id), job = o.job || o.cur || o.role;
  const ambs = o.age < 14 ? CV_AMB.child : o.age >= 60 ? CV_AMB.elder : (CV_AMB[job] || []).concat(CV_AMB.any);
  const sec = o.age >= 18 && R() < 0.55 ? CV_SECRETS.filter(s => s[3](o)) : [];
  const s = sec.length ? cvPick(R, sec) : null;
  return (o.cvLife = { ambition: cvPick(R, ambs), regret: o.age >= 20 ? cvPick(R, CV_REGRET) : null, pride: cvPick(R, CV_PRIDE), fear: cvPick(R, CV_FEAR),
    secret: s ? { kind: s[0], text: s[1], sens: s[2] } : null, secretKnownBy: [] });
}

/* ---------------- the old stories that tie people together ---------------- */
const CV_DEBT_WHY = ['a new roof after the storm', 'seed grain in a bad year', 'a funeral nobody planned for', 'a boat that leaked', 'a wedding that cost more than anyone said'];
const CV_FEUD_WHY = ['a fence that moved six inches in the night', 'a goat that ate the wrong thing', 'something said at a wedding', 'who was meant to pay for the well rope', 'a borrowed axe that never came back', 'a recipe somebody swears was stolen'];
const CV_FEUD_DEEP = ['they did not come to my mother\'s funeral', 'they took the other side when it mattered', 'they laughed, and I never forgave it', 'they were right, and I could not stand it'];
const CV_FLAME_WHY = ['one summer, years ago, at the harvest', 'before either of us married', 'the winter we nearly sailed away together'];
const CV_LEGENDS: any[] = [
  { id: 'well', title: 'the well', parts: ['They say the well was dug in a single night by somebody who never asked to be paid.', 'You leave a coin on the rim for them. Nobody has ever seen a coin go, but the rim is bare by morning.', 'Some say the water tastes different when you owe somebody something. I haven\'t tested it.'] },
  { id: 'rest', title: 'the rest day', parts: ['We rest every third day, and it\'s older than the village. Older than anyone can say.', 'The story is that the first settlers worked eleven days straight, and on the eleventh the plough walked off by itself. Since then, we rest.', 'Working on a rest day is bad luck. The last man who cut wood on one lost the axe. Not the hand: the axe.'] },
  { id: 'fire', title: 'the bonfire', parts: ['The bonfire on the square goes back to the first winter. They burned the boat they came in, so nobody could be tempted to leave.', 'Which is why we cheer when it catches, and why nobody likes talking about the boat.', 'Once a year somebody throws a tiny model of it on the fire. Nobody admits to making them.'] },
  { id: 'pines', title: 'the old pines', parts: ['There was a forest of old pines at the heart of the island once. They say the first of them was planted by a woman who arrived with a bag of seeds and nothing else.', 'They cleared it all for building. The old ones say the biggest pine stood right where the houses are now, and that she\'s buried under it still.', 'My grandmother wouldn\'t walk over that ground at night. I do. Mostly.'] },
  { id: 'goose', title: 'the tavern goose', parts: ['The tavern had a goose once. That\'s all anyone will tell you.', 'It lived in the rafters for three winters, heard everything, and was therefore allowed to stay.', 'There\'s a rule that nothing said under those rafters is repeated at the baths. It has never once worked.'] },
  { id: 'gull', title: 'the one-eyed gull', parts: ['There\'s a one-eyed gull on the church roof that\'s been there longer than anyone\'s been alive.', 'They say it was a sailor who cheated at dice and was turned into a gull for it. It still watches the tavern.', 'If it lands on your roof you\'ll lose money within the week. I\'ve seen it happen. Twice. Well, once and a half.'] },
  { id: 'loaf', title: 'the first loaf', parts: ['The first loaf ever baked here was buried under the bakery floor, for luck.', 'Every baker since has added a crumb on their first day. It\'s meant to keep the ovens honest.', 'One baker didn\'t, and every loaf came out flat for a year. That\'s the story. The bakers all swear by it.'] },
  { id: 'noodle', title: 'the Noodle', parts: ['The church? The founder saw the Noodle in a pot of boiling barley, and that was that.', 'He swore it winked at him. He built the church the same week, out of driftwood and conviction.', 'The pot is still in the church, behind the altar. Nobody has cooked in it since. Nobody dares.'] },
  { id: 'privy', title: 'the Privy Council', parts: ['The privies are named for the old village council. They used to meet in the first one. It was the only room with a door.', 'Most of the village laws were decided sitting down, you might say.', 'The rule about not singing after dark was passed in the Thinking Hut. You can still feel the weight of it in there.'] },
  { id: 'king', title: 'the mainland king', parts: ['Somewhere on the mainland there\'s a king who thinks he owns this island.', 'He sent a man once, to count us. We gave him wine until he couldn\'t count.', 'Every few years a boat comes with a letter. Nobody can read the seal, so we use it to light the bonfire.'] },
  { id: 'whale', title: 'the whale bones', parts: ['Up on the headland there were whale bones, big as a house, when the first settlers came.', 'They used the ribs for the first roofs. Some say the church door is a jawbone. Knock on it and see.', 'On stormy nights, they say, the whale sings, looking for its bones. That\'s why the church door rattles.'] },
  { id: 'cheese', title: 'the lost cheese', parts: ['There\'s a wheel of cheese hidden somewhere in the village that\'s older than anyone living.', 'A cheesemaker hid it during a famine and died before telling anyone where. It\'s supposed to be the best cheese ever made.', 'People still look. Under floors, in wells. If you ever smell something marvellous in an old wall, tell nobody and dig.'] },
  { id: 'lovers', title: 'the two pines', parts: ['On the cliff path there are two pines that lean together. Lovers, the story goes, from families who hated each other.', 'They met there every night until their fathers found out. Then they went over the cliff together rather than part.', 'If you kiss under them you\'ll be married within the year. Or fall off the cliff. The story isn\'t clear on that.'] },
  { id: 'fog', title: 'the fog walker', parts: ['On foggy mornings there\'s somebody who walks the shore. Tall. You never see the face.', 'Some say it\'s the first fisher, still looking for the boat that went out without him.', 'If you call out, it stops. If you call out twice, it turns round. Nobody has called out three times.'] },
];

function cvWorld() {
  if (town.cv) return town.cv;
  const R = cvRng((town.seed || 'x') + ':world'), cv: any = town.cv = { back: [], legends: CV_LEGENDS, seen: [], day: -1 };
  const ppl = npcs.filter(n => cvAdult(n) && !n.player && n.id !== game.steer), used = new Set<number>();
  for (const o of ppl) cvLife(o);
  const free = (o) => !used.has(o.id);
  const pickPair = (pred?) => { for (let t = 0; t < 40; t++) { const a = cvPick(R, ppl), b = cvPick(R, ppl); if (a !== b && free(a) && free(b) && (!pred || pred(a, b))) return [a, b]; } return null; };
  const add = (b) => { b.id = cv.back.length + 1; b.knownBy = b.knownBy || []; cv.back.push(b); return b; };
  const target = Math.max(3, Math.round(ppl.length * 0.55));
  const kinds = ['debt', 'feud', 'flame', 'debt', 'feud', 'flame', 'debt'];
  for (let i = 0, g = 0; cv.back.length < target && g < 60; g++) {
    const kind = kinds[i % kinds.length]; i++;
    const pr = pickPair((a, b) => !isKin(a, b) && !(lf2Spouse(a) === b)); if (!pr) continue; const [a, b] = pr;
    if (kind === 'debt') { const amt = 6 + Math.floor(R() * 34); const by = add({ kind, a: a.id, b: b.id, amt, why: cvPick(R, CV_DEBT_WHY), sens: 0.5 }); a.aff[b.id] = (a.aff[b.id] || 0) - 6; b.aff[a.id] = (b.aff[a.id] || 0) - 10; used.add(a.id); by.paid = false; }
    else if (kind === 'feud') { add({ kind, a: a.id, b: b.id, why: cvPick(R, CV_FEUD_WHY), deep: cvPick(R, CV_FEUD_DEEP), sens: 0.4 }); a.aff[b.id] = (a.aff[b.id] || 0) - 25; b.aff[a.id] = (b.aff[a.id] || 0) - 25; if (typeof sbWhy === 'function') { sbWhy(a, b, -25, 'old feud'); sbWhy(b, a, -25, 'old feud'); } used.add(a.id); used.add(b.id); }
    else { const married = lf2Spouse(a) || lf2Spouse(b); add({ kind: 'flame', a: a.id, b: b.id, why: cvPick(R, CV_FLAME_WHY), sens: married ? 0.85 : 0.45 }); a.aff[b.id] = (a.aff[b.id] || 0) + 8; b.aff[a.id] = (b.aff[a.id] || 0) + 8; used.add(a.id); used.add(b.id); }
  }
  // somebody always knows more than they should: a couple of people know each secret, and a couple more know each old story
  for (const o of ppl) { const L = cvLife(o); if (!L.secret) continue; const n = Math.floor(R() * 3); for (let k = 0; k < n; k++) { const w = cvPick(R, ppl); if (w !== o && !L.secretKnownBy.includes(w.id)) L.secretKnownBy.push(w.id); } }
  for (const b of cv.back) for (let k = 0; k < 2; k++) { const w = cvPick(R, ppl); if (w.id !== b.a && w.id !== b.b && !b.knownBy.includes(w.id)) b.knownBy.push(w.id); }
  return cv;
}
const cvBackOf = (o) => cvWorld().back.filter(b => b.a === o.id || b.b === o.id);
const cvOther = (b, o) => byId(b.a === o.id ? b.b : b.a);
/* a backstory as one of its two people tells it, in layers; or as a third person who has heard of it */
function cvBackText(b, o, layer: number) {
  const A = byId(b.a), B = byId(b.b); if (!A || !B) return null;
  const me = o.id === b.a ? A : o.id === b.b ? B : null, other = me === A ? B : A, ph = cvPron(other);
  if (b.kind === 'debt') {
    if (me === A) return [`I owe ${B.first} money. Not a fortune. Enough that I cross the square to avoid ${ph.him}.`, `${b.amt} denarii, for ${b.why}. I meant to pay at harvest. Then there was another harvest.`, `${ph.He} has never once asked. That is the part I cannot stand.`][layer];
    if (me === B) return [`${A.first} and I have an arrangement. ${cvPron(A).He} knows what it is.`, `${b.amt} denarii, for ${b.why}. I do not ask. I keep count, though.`, `I would forgive it tomorrow if ${cvPron(A).he} would just look me in the eye.`][layer];
    return [`${A.first} owes ${B.first} a pile, last I heard. Do not repeat it.`, `${b.amt} denarii or thereabouts, for ${b.why}.`, `And neither of them will mention it. That is the real trouble.`][layer];
  }
  if (b.kind === 'feud') {
    if (me) return [`${other.first} and I do not speak. It is easier.`, `It started over ${b.why}. ${cvCap(ph.he)} will tell it differently.`, `It was never really about that. It was that ${b.deep}.`][layer];
    return [`${A.first} and ${B.first}? Do not seat them together.`, `It began with ${b.why}. At least, that is the version people tell.`, `Some say it was never about that at all.`][layer];
  }
  if (me) return [`${other.first} and I were close, once.`, `${cvCap(b.why)}. We never spoke about it again.`, `I still think of it more than I should. ${lf2Spouse(me) ? 'Do not breathe a word.' : 'Silly, at my age.'}`][layer];
  return [`${A.first} and ${B.first}? There was something there once.`, `${cvCap(b.why)}, I heard. Nobody ever talks about it.`, `It is not finished with either of them. You can tell from how they do not look at each other.`][layer];
}

/* ---------------- people remember you ---------------- */
function cvMem(o, p) { const m = o.cvm || (o.cvm = {}); return m[p.id] || (m[p.id] = { talks: 0, last: -1e9, topics: {}, moments: [], trust: 0, lied: {} }); }
function cvNote(o, p, kind: string, text: string) { const m = cvMem(o, p); m.moments.push({ k: kind, t: game.time, text }); if (m.moments.length > 14) m.moments.shift(); }
/** what the player has learned about the village from talking (a journal; also the currency for gossip and accusations) */
function cvKnows(p) { return p.cvK || (p.cvK = { back: {}, life: {}, legend: {} }); }
/** somebody saw you do something harmless (push a person, drag a crate): people may mention it, but it is not a crime or a rumour */
function cvSaw(actor, target, kind) {
  const cv = cvWorld(), w = npcs.filter(q => q !== actor && q !== target && !q.dead && !q.infant && q.pose !== 'sleep' && Math.abs(q.tx - actor.tx) + Math.abs(q.ty - actor.ty) <= 9).map(q => q.id);
  cv.seen.push({ t: game.time, actor: actor.id, target: target ? target.id : null, kind, w }); if (cv.seen.length > 40) cv.seen.shift();
}

/* a debtor pays when they can; a creditor who is never paid sours a little (once a day) */
LF2.tickers.push(() => {
  if (!town.cv) return; const day = Math.floor(game.time / 1440); if (town.cv.day === day) return; town.cv.day = day;
  for (const b of town.cv.back) { if (b.kind !== 'debt' || b.paid) continue; const a = byId(b.a), c = byId(b.b); if (!a || !c || a.dead || c.dead) { b.paid = true; continue; }
    if (a.coin >= b.amt + 14 && Math.random() < 0.35) { a.coin -= b.amt; c.coin = (c.coin || 0) + b.amt; b.paid = true; lfAff(a, c, 5); lfAff(c, a, 8); chron(`${a.first} paid back ${b.amt} denarii to ${c.first}.`, 'note'); }
    else if (Math.random() < 0.08) lfAff(c, a, -1); }
});
