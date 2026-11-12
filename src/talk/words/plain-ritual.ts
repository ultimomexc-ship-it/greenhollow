/* Words: the plain voice, greetings, farewells and the closing words of a talk. Lines only (lx, LXP, kidl, LXLP); the acts that say them are in the files that define ACTS. */
/* ---- plain pack (neutral; the test voice and the fallback for every other pack) ---- */
lx('greet', 'plain', 'Morning, {li}.', { band: 'morning' });
lx('greet', 'plain', 'Up early, {li}.', { band: 'morning' });
lx('greet', 'plain', 'Afternoon, {li}.', { band: 'day' });
lx('greet', 'plain', 'Evening, {li}.', { band: 'evening' });
lx('greet', 'plain', 'Still about, {li}?', { band: 'night' });
lx('greet', 'plain', 'Hello, {li}.');
lx('greet', 'plain', '{li}. Good to see you.', { rel: 'friend' });
lx('greet', 'plain', '{li}! There you are.', { rel: 'friend' });
lx('greet', 'plain', "Hello. I don't think we've talked much.", { rel: 'stranger' });
lx('greet_back', 'plain', 'Hello, {li}.');
lx('greet_back', 'plain', '{li}. Hello.');
lx('greet_back', 'plain', 'Morning.', { band: 'morning' });
lx('greet_back', 'plain', 'Good to see you too.', { rel: 'friend' });
lx('greet_back', 'plain', 'Evening.', { band: 'evening' });
lx('pre_close', 'plain', 'Well. I should get on.');
lx('pre_close', 'plain', 'Anyway. Things to do.');
lx('pre_close', 'plain', "I'd better go.");
lx('pre_close', 'plain', "I'll let you get back to it.");
lx('farewell', 'plain', 'See you, {li}.');
lx('farewell', 'plain', 'Take care.');
lx('farewell', 'plain', 'Bye for now.');
lx('farewell', 'plain', 'Goodbye.', { rel: 'stranger' });
lx('farewell_back', 'plain', 'You too.');
lx('farewell_back', 'plain', 'See you.');
lx('farewell_back', 'plain', 'Bye.');
/* greeting colours: how somebody greets a person they have a view of */
lx('greet_back', 'plain', "Oh. It's you.", { rep: 'vandal' });
lx('greet_back', 'plain', 'Mind where you walk. Walls are precious.', { rep: 'vandal' });
lx('greet_back', 'plain', 'Hello. Please leave the walls alone.', { rep: 'vandal' });
lx('greet_back', 'plain', 'Hello. Keep your hands to yourself, will you.', { rep: 'meddler' });
lx('greet_back', 'plain', "Hello. Don't move anything.", { rep: 'meddler' });
lx('greet_back', 'plain', "Hello. I've got my eye on my pockets.", { rep: 'thief' });
lx('greet_back', 'plain', 'Hello. Good to see you. Really.', { rep: 'kind' });
lx('greet_back', 'plain', 'Always a pleasure, {li}.', { rep: 'kind' });
/* ---- family talk: a spouse, a sibling, a parent and a child are not addressed like a neighbour ---- */
lx('greet', 'plain', 'There you are, love.', { rel: 'spouse' });
lx('greet', 'plain', 'Hello, my dear. Did you sleep?', { rel: 'spouse', band: 'morning' });
lx('greet', 'plain', 'Home at last. Come and sit.', { rel: 'spouse', band: 'evening' });
lx('greet', 'plain', 'There you are, {li}.', { rel: 'partner' });
lx('greet', 'plain', "Oh, it's you. What do you want?", { rel: 'sibling' });
lx('greet', 'plain', '{li}. Look what the wind blew in.', { rel: 'sibling' });
lx('greet', 'plain', 'Have you eaten, {li}?', { rel: 'child' });
lx('greet', 'plain', '{li}! Come here and let me look at you.', { rel: 'child', kid: 'yes' });
lx('greet', 'plain', 'Hello. Is there food?', { rel: 'parent', age: 'child' });
lx('greet', 'plain', "Oh, it's you. Can I go out?", { rel: 'parent', age: 'child' });
lx('greet', 'plain', 'Hello. Have you had a day?', { rel: 'parent' });
lx('greet', 'plain', 'Hello, little one.', { rel: 'child', kid: 'yes' });
lx('greet', 'plain', 'There you are! Where have you been?', { rel: 'child', kid: 'yes' });
lx('greet_back', 'plain', 'There you are. I was just thinking of you.', { rel: 'spouse' });
lx('greet_back', 'plain', 'Hello, love.', { rel: 'spouse' });
lx('greet_back', 'plain', 'What now?', { rel: 'sibling' });
lx('greet_back', 'plain', 'You again. Good.', { rel: 'sibling' });
lx('greet_back', 'plain', "Hello, dear. I'm fine, don't fuss.", { rel: 'child' });
lx('greet_back', 'plain', "Hello. Yes, I've eaten.", { rel: 'parent' });
lx('greet_back', 'plain', 'Hello! I was only just out there.', { rel: 'parent', age: 'child' });
lx('greet_back', 'plain', "Hello. Yes, I've eaten. Don't fuss.", { rel: 'parent' });
lx('farewell', 'plain', "I'll see you at the table, love.", { rel: 'spouse' });
lx('farewell', 'plain', 'Mind yourself. Come home safe.', { rel: 'spouse' });
lx('farewell', 'plain', 'Try not to be an idiot.', { rel: 'sibling' });
lx('farewell', 'plain', 'Give my regards to nobody. See you.', { rel: 'sibling' });
lx('farewell', 'plain', 'Wrap up warm, dear.', { rel: 'child' });
lx('farewell', 'plain', "Bye. I'll be home soon.", { rel: 'parent' });
lx('farewell', 'plain', "Don't be late home.", { rel: 'child' });
lx('farewell', 'plain', 'Be good. Or be careful.', { rel: 'child' });
lx('backchannel', 'plain', 'Mm.');
lx('backchannel', 'plain', 'I see.');
lx('backchannel', 'plain', 'Right.');
lx('backchannel', 'plain', 'Is that so.');
lx('backchannel', 'plain', 'Ah.');
kidl('greet', 'Hi!');
kidl('greet', 'Hello, {li}! Look what I found.');
kidl('greet', 'Are you going anywhere? Can I come?');
kidl('greet_back', 'Hi!');
kidl('greet_back', 'Hello! I was playing.');
kidl('greet_back', "Oh, hello. I'm busy.");
kidl('farewell', "Bye! I'm going to play.");
kidl('farewell', "See you! Don't tell anyone.");
kidl('farewell_back', 'Bye!');
kidl('pre_close', "I have to go. I'm in the middle of something.");
kidl('pre_close', 'Can I go now?');
/* ---- more ways to say the little things (the same hello twenty times a day is what makes a village sound like a script) ---- */
for (const t of [
  'Good to see you, {li}.',
  'Oh, {li}. How are things?',
  'Hey, {li}.',
  'Well met, {li}.',
  '{li}! Just the person.',
  'Ah, {li}.',
  'Busy day, {li}?',
  'Hello there, {li}.',
  'Is that you, {li}? It is.'
])
  lx('greet', 'plain', t);
for (const t of [
  'Hello to you.',
  'Ah, hello.',
  'Oh! Hello, {li}.',
  'Good to see you too.',
  'Hello, hello.',
  'There you are.',
  'Hello. How are you?',
  'Hey.',
  'Well. Hello.'
])
  lx('greet_back', 'plain', t);
for (const t of [
  "I'd better get on.",
  'Well. Work waits.',
  'Must dash.',
  "I won't keep you.",
  "That's me, then.",
  'Right. Off I go.',
  "Mustn't stand about.",
  "Time I wasn't here.",
  'I should leave you to it.'
])
  lx('pre_close', 'plain', t);
for (const t of [
  'Take care, {li}.',
  'Until next time.',
  'Safe on your way.',
  'Good day to you.',
  'Be well.',
  'Mind how you go.',
  'Cheerio.',
  'Look after yourself.',
  'All the best.'
])
  lx('farewell', 'plain', t);
for (const t of [
  'And you.',
  'Take care.',
  'Be well.',
  'Right you are.',
  'Goodbye, then.',
  'Off you go.',
  'See you around.',
  'Cheers.',
  'Until then.'
])
  lx('farewell_back', 'plain', t);

// registers (tag `reg`): said only by somebody of that manner; the ritual acts and a few replies
LXP('greet', ['Good day to you, {li}.', 'Greetings, {li}.', 'I bid you good day.'], { reg: 'formal' });
LXP('greet_back', ['And good day to you.', 'Greetings. It is a pleasure.', 'Well met.'], { reg: 'formal' });
LXP('farewell', ['I take my leave of you.', 'Farewell, {li}. May the day go well with you.', 'I shall bid you good day.'], { reg: 'formal' });
LXP('farewell_back', ['Farewell.', 'Good day to you, then.', 'Until we meet again.'], { reg: 'formal' });
LXP('pre_close', ['I must beg your leave.', 'Forgive me; I have duties to attend to.'], { reg: 'formal' });
LXP('greet', ["Hello, {li}! It's good to see you.", "There you are, {li}. I was hoping you'd come by.", '{li}! How lovely.'], { reg: 'warm' });
LXP('greet', ['Hello, friend. Come and sit a moment.'], { reg: 'warm', rel: 'friend' });
LXP('greet', ['Hello, love.', 'There you are, love.'], { reg: 'warm', rel: 'spouse' });
LXP('greet', ['Hello, dear. Have you eaten?', 'Hello, my dear.'], { reg: 'warm', rel: 'child' });
LXP('greet_back', ['Oh, hello! Come in, come in.', "Hello, {li}. You've made my day."], { reg: 'warm' });
LXP('greet_back', ['There you are, love.'], { reg: 'warm', rel: 'spouse' });
LXP('farewell', ['Take care of yourself, {li}.', "Come and see me soon, won't you?"], { reg: 'warm' });
LXP('farewell', ['Bye, love. Be careful.'], { reg: 'warm', rel: 'spouse' });
LXP('farewell', ['Bye, dear. Be good.'], { reg: 'warm', rel: 'child' });
LXP('farewell_back', ['Goodbye, {li}. Do come again.', 'Look after yourself.'], { reg: 'warm' });
LXP('farewell_back', ['Bye, friend.'], { reg: 'warm', rel: 'friend' });
LXP('pre_close', ["I'm sorry, I must be off, much as I'd love to stay.", "I could talk all day, but the work won't wait."], { reg: 'warm' });
LXP('acknowledge', ['Very good.', 'That is commendable.', 'I am pleased to hear it.'], { reg: 'formal' });
LXP('acknowledge', ["That's wonderful to hear.", 'Good for you, truly.', "I'm so glad."], { reg: 'warm' });
LXP('agree', ['Indeed.', 'Quite so.', 'I concur.'], { reg: 'formal' });
LXP('agree', ["I couldn't agree more.", "Yes, exactly. That's just what I think."], { reg: 'warm' });
LXP('answer_how', ['I am well, I thank you.', 'Well enough, I thank you for asking.'], { reg: 'formal' });
LXP('answer_how', ["I'm well, thank you for asking. And you?", 'Better for seeing you, {li}.'], { reg: 'warm' });
LXP('greet', ['Hello.', 'Right.'], { reg: 'terse' });
LXP('farewell', ['Bye.', 'Right. Off I go.'], { reg: 'terse' });
LXP('acknowledge', ['Good.', 'Fine.'], { reg: 'terse' });
