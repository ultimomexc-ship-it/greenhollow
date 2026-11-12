/* Words: the plain voice, the day: how people are, what they did, how it went. Lines only (lx, LXP, kidl, LXLP); the acts that say them are in the files that define ACTS. */
lx('ask_how', 'plain', 'How are you?');
lx('ask_how', 'plain', 'How have you been?');
lx('ask_how', 'plain', 'How are things with you, {li}?', { rel: 'friend' });
lx('answer_how', 'plain', 'Fine, thanks.', { state: 'fine' });
lx('answer_how', 'plain', "Can't complain.", { state: 'fine' });
lx('answer_how', 'plain', 'Hungry, mostly.', { state: 'hungry' });
lx('answer_how', 'plain', 'Tired. You?', { state: 'tired' });
lx('answer_how', 'plain', 'Better than I expected.', { state: 'glad' });
lx('answer_how', 'plain', 'Good, actually.', { state: 'glad' });
lx('answer_how', 'plain', 'Not great.', { state: 'low' });
lx('answer_how', 'plain', 'Getting by.', { state: 'low' });
/* ---- the ordinary day (plain pack): first person, from what really happened. A kind with no line here is simply never told. ---- */
lx('ask_day', 'plain', 'What have you been up to?');
lx('ask_day', 'plain', "How's your day been?");
lx('ask_day', 'plain', 'Busy today?');
lx('ask_day', 'plain', 'Anything happen to you today?', { rel: 'friend' });
lx('nothing_much', 'plain', 'Nothing much. Same as always.');
lx('nothing_much', 'plain', 'Quiet day.');
lx('nothing_much', 'plain', 'Not a lot to report.');
lx('acknowledge', 'plain', 'Good going.');
lx('acknowledge', 'plain', "That's something.");
lx('acknowledge', 'plain', 'Fair enough.');
lx('acknowledge', 'plain', 'How did it go?');
lx('acknowledge', 'plain', 'Busy, then.');
lx('acknowledge', 'plain', 'I see.');
lx('empathise', 'plain', 'That sounds rough.');
lx('empathise', 'plain', "I'm sorry to hear it.");
lx('empathise', 'plain', 'You poor thing.', { rel: 'friend' });
lx('empathise', 'plain', 'Somebody ought to do something about that.');
lx('life:slept', 'plain', 'I slept well enough last night.');
lx('life:slept', 'plain', 'Slept like a log.');
lx('life:slept_rough', 'plain', 'I slept rough again last night.');
lx('life:slept_rough', 'plain', 'Another night on the ground.');
lx('life:slept_rough', 'plain', 'Still no bed of my own.');
lx('life:slept_rough', 'plain', 'I woke up with sand in my ear.');
lx('life:no_privy', 'plain', "I couldn't find a privy earlier. Not my best hour.");
lx('life:no_privy', 'plain', "There's nowhere decent to go round here.");
lx('life:bladder_emergency', 'plain', "I very nearly didn't make it to the privy. Don't ask.");
lx('life:went_hungry', 'plain', "I'm getting hungry. I haven't eaten properly.");
lx('life:went_hungry', 'plain', "There's not been much to eat today.");
lx('life:starving', 'plain', "I'm starving. I mean properly starving.");
lx('life:tired', 'plain', "I'm worn out. All day on my feet.");
lx('life:ate', 'plain', 'Had a decent meal at last.');
lx('life:bought', 'plain', 'I bought {things} today.');
lx('life:bought', 'plain', 'Picked up {things}.');
lx('life:sold', 'plain', 'I sold {things} today.');
lx('life:planted', 'plain', 'I planted {things} today.');
lx('life:planted', 'plain', 'Put in {things} earlier.');
lx('life:new_in_stock', 'plain', 'The {shop} has {item} in now.');
lx('life:new_in_stock', 'plain', 'Did you know the {shop} is selling {item} now?');
lx('life:new_in_stock', 'plain', 'The {shop} finally has {item}.');
lx('life:out_of_stock', 'plain', 'The {shop} had no {item} left.');
lx('life:out_of_stock', 'plain', 'Went for {item} and the {shop} was out.');
lx('life:could_not_afford', 'plain', "I couldn't afford {item} today.");
lx('life:could_not_afford', 'plain', 'Money is tight. I had to leave the {item}.');
lx('life:could_not_afford', 'plain', 'Everything costs more than I have.');
lx('life:price_up', 'plain', 'The price of {item} has gone up at the {shop}.');
lx('life:price_down', 'plain', 'The price of {item} is down at the {shop} now.');
lx('life:price_down', 'plain', 'You can get {item} for less at the {shop} today.');
lx('life:baked', 'plain', 'I baked {things} earlier.');
lx('life:baked', 'plain', 'The oven gave me {things} today.');
lx('life:cooked', 'plain', 'I made {things} today.');
lx('life:forged', 'plain', 'I turned out {things} today.');
lx('life:woven', 'plain', 'I finished {things} on the loom.');
lx('life:harvested', 'plain', 'I brought in {things}.');
lx('life:harvested', 'plain', 'Harvested {things} today.');
lx('vent', 'plain', "I'm starving, to be honest.", { state: 'hungry' });
lx('vent', 'plain', "I'm worn out. I could sleep standing.", { state: 'tired' });
lx('vent', 'plain', "I've been low lately. I don't know why.", { state: 'low' });
lx('console', 'plain', "That sounds hard. I'm sorry.");
lx('console', 'plain', 'It will pass. It usually does.');
lx('ask_how', 'plain', 'How are you really? Not the polite answer.', { rel: 'spouse' });
lx('ask_how', 'plain', 'Are you well? You look tired.', { rel: 'parent' });
lx('ask_how', 'plain', 'Are you behaving?', { rel: 'child', kid: 'yes' });
lx('ask_how', 'plain', "How's life, then? Anything I should know before the rest of the family does?", { rel: 'sibling' });
kidl('answer_how', 'Fine! I found a good stick.', { state: 'fine' });
kidl('answer_how', "I'm hungry. Is it time to eat yet?", { state: 'hungry' });
kidl('answer_how', "I'm tired. I'm not tired. I'm tired.", { state: 'tired' });
kidl('answer_how', "Great! I'm having a good day!", { state: 'glad' });
for (const t of [
  'Fine, thanks. You?',
  "Can't grumble.",
  'Getting by.',
  'Not bad. Not bad at all.',
  'Same as ever.',
  'Well enough.',
  "Mustn't complain.",
  'Fair to middling.'
])
  lx('answer_how', 'plain', t, { state: 'fine' });
for (const t of ['Better than I deserve.', 'Grand, really.', 'On top of the world, nearly.', 'Very well, as it happens.'])
  lx('answer_how', 'plain', t, { state: 'glad' });
for (const t of ['Not great, to be honest.', "Low. It'll pass.", "I've had better days.", 'Could be better.'])
  lx('answer_how', 'plain', t, { state: 'low' });
for (const t of ['Hungry! Starving, nearly.', "Hungry, to be honest. My stomach's been talking.", 'Starving. Is there bread?'])
  lx('answer_how', 'plain', t, { state: 'hungry' });
for (const t of ['Tired. Could sleep standing.', 'Worn out, honestly.', 'Weary to the bone.']) lx('answer_how', 'plain', t, { state: 'tired' });
for (const t of ['How are things?', "How's the day treating you?", 'Keeping well?', 'And how are you?', "How've you been keeping?"])
  lx('ask_how', 'plain', t);
lx('sympathise_how', 'plain', "Oh. I'm sorry to hear that.", { state: 'low' });
lx('sympathise_how', 'plain', "Do you want to talk about it? I've time.", { state: 'low' });
lx('sympathise_how', 'plain', 'You should eat something. Have you tried the baker?', { state: 'hungry' });
lx('sympathise_how', 'plain', "Get some bread in you. It'll help.", { state: 'hungry' });
lx('sympathise_how', 'plain', 'Get some rest if you can. The day will keep.', { state: 'tired' });
lx('sympathise_how', 'plain', 'You look it. Sit down for a minute.', { state: 'tired' });
lx('share_gladness', 'plain', "Good. I'm glad to hear it.");
lx('share_gladness', 'plain', "That's good to hear.");
for (const t of [
  'Good going.',
  "That's a fair day.",
  'Well done.',
  'Not bad at all.',
  'Sounds like it went well.',
  "That's something to be glad of."
])
  lx('acknowledge', 'plain', t);
for (const t of ['Is that so. I had not noticed.', 'Hm. I will have a look.', 'Odd. But there we are.', 'Well. If you say so.', 'Is it. Well.'])
  lx('acknowledge', 'plain', t, { how: 'neutral' });
for (const t of ['Good going.', 'That is a fair day.', 'Well done.', 'Sounds like it went well.']) lx('acknowledge', 'plain', t, { how: 'good' });
LXLP('planted', [
  'Got {things} in the ground today.',
  "Put in {things}. Now it's up to the weather.",
  'Sowed {things} earlier. Fingers crossed.',
  "{things} went in today. Back aches, but they're in."
]);
LXLP('harvested', [
  'Brought in {things}. Not a bad haul.',
  'Got {things} off the field today.',
  'Harvested {things}. Good to see it come to something.',
  "{things} in the barn. A fair day's work."
]);
LXLP('bought', [
  'Bought {things} earlier.',
  'Got {things} at the stall. Fair price.',
  'Picked up {things} on the way.',
  'Treated myself to {things}.'
]);
LXLP('sold', [
  'Sold {things} earlier. Decent price.',
  'Got rid of {things} at the stall.',
  'Sold {things}. Every coin helps.',
  '{things} went at the stall today.'
]);
LXLP('baked', [
  'Baked {things} earlier. Smells wonderful.',
  '{things} out of the oven. Not bad at all.',
  'Got {things} baked before the rush.',
  '{things}, fresh. The whole street knows.'
]);
LXLP('cooked', ['Cooked {things} today. Turned out all right.', 'Got {things} on the fire. Not bad.']);
LXLP('forged', ['Forged {things} today. Hard on the arms.', '{things} done at the forge. Not pretty. Strong.']);
LXLP('woven', ['Wove {things} today. Slow, steady work.', 'Got {things} off the loom.']);
LXLP('ate', ['Had a proper meal today. Felt like a new person.', 'Ate well. Made all the difference.', 'Got a good meal in me at last.']);
LXLP('slept', ['Slept well last night. First time in a while.', "Had a good night's sleep.", 'Slept like the dead.']);
LXLP('slept_rough', [
  'Slept on the ground last night. Never again.',
  "No bed again. My back'll hate me for a week.",
  "Slept rough. Cold, hard, and I'm done with it."
]);
LXLP('went_hungry', ['Went hungry today. Not a crumb.', 'Hardly ate. I could eat a horse.', "Missed my dinner. Stomach's been loud all day."]);
LXLP('no_privy', ["Couldn't find a privy. I won't say what I did.", 'Had to make do behind a tree. Not proud of it.']);
LXLP('new_in_stock', ['Saw {item} at the {shop}. New in.', "The {shop} has {item} now, if you're after some."]);
LXLP('out_of_stock', ['The {shop} had no {item}. Wasted trip.', 'Went for {item} and the {shop} had none. Typical.']);
LXLP('price_up', ['The price of {item} is up at the {shop} these days.', 'Noticed the price of {item} has gone up at the {shop}. Of course it has.']);
LXLP('price_down', ['The price of {item} is down at the {shop}. Worth a trip.', 'Good news: the price of {item} is down at the {shop}.']);
LXLP('could_not_afford', ["Couldn't afford {item} today. Next time.", 'Had my eye on {item}, but the purse said no.']);
LXLP('tired', ['Worn out today. Could sleep in a ditch.', 'Absolutely done in.']);
LXP('ask_why_state', ["Why? What's happened?", "Oh? What's the matter?", 'Is something wrong?']);
LXP('explain_state', ['{about} {reason}.', "Well. {about} {reason}. That'll do it.", "{about} {reason}, that's why."]);
LXP('explain_unknown', ["I couldn't tell you. {about} won't say.", "No idea. I've asked."]);
LXP('ask_more_day', ['And besides that?', 'Anything else?', 'And the rest of the day?']);
/* ---- the small things of a day (life2/smalllife.ts): the words ---- */
LXLP('worked_with', [
  'Worked alongside {about} today. Good company in a field.',
  '{about} and I got through a fair bit together today.',
  'Spent the day working next to {about}.'
]);
LXLP('ate_with', [
  'Had a bite with {about} earlier.',
  'Ate with {about} today. Makes a change from eating alone.',
  '{about} and I shared a table at midday.'
]);
LXLP('found', ['Found {item} earlier. No idea whose.', 'Look what I picked up: {item}.', 'I found {item} by the path. Keeping it.']);
LXLP('ill', ["I'm not well. Something's got hold of me.", 'Feeling rough. Fever, I think.', "I'm under the weather. Keep your distance."]);
LXLP('recovered', ["I'm over it. Back on my feet.", 'Feeling myself again, thank goodness.', "The fever's gone. I could eat a horse."]);
LXP('answer_how', ['Not well. Fever.', "Rough, to be honest. I'm ill.", "Poorly. I'll be all right."], { state: 'ill' });
LXP('sympathise_how', ['You should be in bed. Go on.', 'Oh, you poor thing. Rest. I mean it.'], { state: 'ill' });
LXP('vent', ['I feel dreadful. Hot and cold at once.'], { state: 'ill' });
// sympathy that claims a shared trouble: only said by somebody who has had the same this week
LXP(
  'empathise',
  [
    'Ugh. I know that one.',
    "Same here, I'm afraid.",
    'I had that too.',
    "That happened to me as well. It's no fun.",
    'Me too. You have my sympathy.'
  ],
  { shared: 'yes' }
);
LXP('empathise', ['That sounds awful.', 'Poor you.', "I'm sorry. That's hard."]);
LXP(
  'sympathise_how',
  [
    'I am sorry to hear it.',
    'Sit down a while. Go on.',
    'That sounds like a long day.',
    'Have something to eat. See how you feel after.',
    "Try to rest. It'll look better later."
  ],
  {}
);

/* the Hamlet: rent, yards and moving in (life2/rent.ts, yards.ts) */
LXLP('rent_paid', ['I paid the rent today.', 'Rent is paid. That is one thing settled.', 'Paid my rent at six, same as every day.']);
LXLP('rent_unpaid', ['I could not pay the rent today.', 'I had nothing for the rent today.', 'The rent went unpaid. I do not like that.']);
LXLP('no_yard', ['I have no yard of my own.', 'I have nowhere that is mine. No fence, no field.', 'Still no yard. I cannot grow a thing.']);
LXLP('moved_in', ['We have a yard of our own now.', 'I moved into a yard. A bed, a fence, a gate.', 'I have a place at last.']);
LXLP('came_ashore', [
  'I came ashore today. There was a yard waiting.',
  'We landed today and found a yard with beds in it.',
  'I only just arrived. Somebody had put out a bed for me.'
]);
LXLP('apart', [
  'We are married and still sleep in two yards.',
  'There is no room for my bed in our yard yet.',
  'Every night I walk home alone after saying goodnight.'
]);
LXLP('stall_opened', [
  'I have a stall now. I opened it this morning.',
  'I opened my stall today. Business is slow but honest.',
  'I am keeping a stall these days.'
]);

/* the Hamlet's two new ways of being: no bed, and behind with the rent */
lx('answer_how', 'plain', 'No bed yet. Otherwise fine.', { state: 'bedless' });
lx('answer_how', 'plain', 'Sleeping on the ground, to be honest.', { state: 'bedless' });
lx('answer_how', 'plain', "Behind with the rent. It's weighing on me.", { state: 'behind' });
lx('answer_how', 'plain', "Short this week. I couldn't pay the rent.", { state: 'behind' });
lx('remark_state', 'plain', "I've nowhere to sleep. Still.", { state: 'bedless' });
lx('remark_state', 'plain', "I couldn't pay the rent today.", { state: 'behind' });
lx('vent', 'plain', "I've no bed. It's wearing on me.", { state: 'bedless' });
lx('vent', 'plain', "I can't sleep on the ground much longer.", { state: 'bedless' });
lx('vent', 'plain', "I'm behind with the rent and I don't know how I'll catch up.", { state: 'behind' });
lx('vent', 'plain', "I couldn't pay today. I hate that.", { state: 'behind' });
lx('sympathise_how', 'plain', "That's hard. A yard and a bed would help, wouldn't it?", { state: 'bedless' });
lx('sympathise_how', 'plain', "You can't go on like that. Something will turn up.", { state: 'bedless' });
lx('sympathise_how', 'plain', "Rent's a worry. It'll be easier when the crop comes in.", { state: 'behind' });
lx('sympathise_how', 'plain', "Try not to fret about it. It isn't a debt, they say.", { state: 'behind' });
lx('answer_family', 'plain', '{about} has nowhere to sleep.', { state: 'bedless' });
lx('answer_family', 'plain', '{about} is behind with the rent.', { state: 'behind' });
lx('remark_place', 'plain', 'That fence has held up well {place}.', {}, ['feature:yards']);
lx('remark_place', 'plain', 'You can tell whose yard is whose from the fences {place}.', {}, ['feature:yards']);
lx('remark_place', 'plain', 'Rent day comes round quick {place}.', {}, ['feature:rent']);
lx('remark_work', 'plain', 'Good to have a field of my own to work.', {}, ['feature:yards']);
lx('remark_state', 'plain', "Still no bed. It's getting old.", { state: 'bedless' });
lx('remark_state', 'plain', "I'm behind with the rent.", { state: 'behind' });
