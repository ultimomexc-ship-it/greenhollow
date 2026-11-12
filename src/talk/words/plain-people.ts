/* Words: the plain voice, opinions, family, advice, work and where people are. Lines only (lx, LXP, kidl, LXLP); the acts that say them are in the files that define ACTS. */
/* ---- words (plain) ---- */
lx('ask_opinion', 'plain', 'What do you make of {about}?');
lx('ask_opinion', 'plain', "What's {about} like, really?");
lx('ask_opinion', 'plain', 'Do you get on with {about}?');
lx('give_opinion', 'plain', "I'm fond of {about}. {reason}", { op: 'fond' });
lx('give_opinion', 'plain', '{about} is one of the good ones. {reason}', { op: 'fond' });
lx('give_opinion', 'plain', "{about}'s all right. {reason}", { op: 'like' });
lx('give_opinion', 'plain', "I've nothing against {about}. {reason}", { op: 'like' });
lx('give_opinion', 'plain', "I don't know {about} well. No complaints.", { op: 'neutral' });
lx('give_opinion', 'plain', 'Not much to say about {about}. {reason}', { op: 'neutral' });
lx('give_opinion', 'plain', "I'm not keen on {about}. {reason}", { op: 'wary' });
lx('give_opinion', 'plain', '{about}? Hard work. {reason}', { op: 'wary' });
lx('give_opinion', 'plain', "I can't stand {about}. {reason}", { op: 'dislike' });
lx('give_opinion', 'plain', 'Keep away from {about}, if you can. {reason}', { op: 'dislike' });
lx('no_view', 'plain', "I don't know {about} well enough to say.");
lx('no_view', 'plain', "No idea. I've hardly spoken to {about}.");
lx('no_view_g', 'plain', "I don't know them well enough to say.");
lx('no_view_g', 'plain', "Hm. I haven't formed a view.");
lx('gossip_person', 'plain', "Between us, I'm fond of {about}. {reason}", { op: 'fond' });
lx('gossip_person', 'plain', 'You should know {about}. One of the good ones. {reason}', { op: 'fond' });
lx('gossip_person', 'plain', "I've got a soft spot for {about}. {reason}", { op: 'like' });
lx('gossip_person', 'plain', "I'm not sure about {about}. {reason}", { op: 'wary' });
lx('gossip_person', 'plain', 'Watch yourself with {about}. {reason}', { op: 'dislike' });
lx('gossip_person', 'plain', "I'll say it: I can't stand {about}. {reason}", { op: 'dislike' });
lx('gossip_person', 'plain', 'Have you noticed {about}? {reason}', { op: 'neutral' });
lx('agree_opinion', 'plain', 'I think so too.');
lx('agree_opinion', 'plain', "You're not the only one.");
lx('agree_opinion', 'plain', "Funny, I'd say the same.");
lx('differ_opinion', 'plain', "Really? I've always got on with them.");
lx('differ_opinion', 'plain', "Hm. I've found them fine.");
lx('differ_opinion', 'plain', "I'd never have said that.");
lx('ask_family', 'plain', 'How is {about}?');
lx('ask_family', 'plain', 'How is {about} getting on?');
lx('ask_family', 'plain', 'And {about}? Everything all right?');
lx('answer_family', 'plain', '{about} is well. Busy.', { state: 'fine' });
lx('answer_family', 'plain', '{about} is hungry, mostly.', { state: 'hungry' });
lx('answer_family', 'plain', '{about} is worn out.', { state: 'tired' });
lx('answer_family', 'plain', '{about} is in a good mood. Rare.', { state: 'glad' });
lx('answer_family', 'plain', '{about} has been low lately.', { state: 'low' });
lx('praise', 'plain', "You're good company. I mean that.");
lx('praise', 'plain', "I'm glad you're here.");
lx('thank_praise', 'plain', "That's kind of you.");
lx('thank_praise', 'plain', 'Thank you. I needed that.');
lx('tell_rep', 'plain', 'People are saying you {about}. {qty} of them, at least.');
lx('tell_rep', 'plain', "You should know what's said about you. That you {about}.");
lx('rep_own', 'plain', "I know. I haven't helped that.");
lx('rep_deny', 'plain', "That isn't true. Somebody has got it wrong.");
lx('rep_deny', 'plain', 'People will say anything.');
lx('ask_work', 'plain', 'What do you do with your days, {about}?');
lx('ask_work', 'plain', "How's the work, {about}?");
lx('answer_work', 'plain', "I'm a {job}. It keeps me busy.");
lx('answer_work', 'plain', "Mostly I'm a {job}. Some days that's all of me.");
lx('ask_where', 'plain', 'Have you seen {about} about?');
lx('ask_where', 'plain', 'Do you know where {about} is?');
lx('tell_where', 'plain', 'I think {about} is {reason}.');
lx('tell_where', 'plain', 'Last I saw, {about} was {reason}.');
lx('dont_know_where', 'plain', 'No idea where {about} is.');
lx('dont_know_where', 'plain', 'Not today. Try the square.');
lx('warn', 'plain', 'Watch out for {about}. They {reason}.');
lx('warn', 'plain', 'A word of warning about {about}. They {reason}.');
lx('warn_thanks', 'plain', "Thank you. I'll bear it in mind.");
lx('warn_thanks', 'plain', "Good to know. I'll keep my distance.");
lx('ask_advice', 'plain', "I'm starving. Where would you go for a meal?");
lx('give_advice', 'plain', 'Try the bakery. They always have something.', {}, ['feature:bakery']);
lx('give_advice', 'plain', "The tavern, if you've any coin.", {}, ['feature:tavern']);
lx('give_advice', 'plain', 'Ask around. Someone always has something to spare.');
lx('brag_child', 'plain', "{about} is {qty} now. I don't know where the time goes.");
lx('brag_child', 'plain', 'My {about} is {qty}. Doing well. Growing like a weed.');
lx('congratulate', 'plain', "That's lovely. They do grow fast.");
lx('congratulate', 'plain', 'You must be proud.');
lx('tell_back', 'plain', 'Before I came here I {about}.');
lx('tell_back_reply', 'plain', "That's a story. Go on.");
lx('tell_back_reply', 'plain', "Strange. I'd have believed it of this place.");
lx('thanks_where', 'plain', "Thanks. I'll go and find {them}.");
lx('thanks_where', 'plain', "Right. That's where I'll look.");
for (const t of [
  '{about} was {reason}, the last I saw.',
  'Try {reason}. That is where {about} was.',
  'I passed {about} {reason} not long ago.',
  '{about}? {reason}, I believe.'
])
  lx('tell_where', 'plain', t);
for (const t of ["Thanks. I'll try there.", 'Right. Good to know.', "Ah. Thanks, I'll go and see."]) lx('thanks_where', 'plain', t);
LXP('ask_opinion', [
  'What do you think of {about}?',
  'Be honest. How do you find {about}?',
  'How do you get on with {about}?',
  "{about}. What's your view?",
  'Tell me about {about}. Properly.'
]);
LXP('ask_family', [
  "How's {about} keeping?",
  'And how is {about}? Still the same?',
  "Is {about} all right? I haven't seen them.",
  "How's {about} been lately?",
  'Tell {about} I was asking after them.'
]);
LXP('agree_opinion', [
  "That's how I see it too.",
  'Exactly my feeling.',
  "I've always thought so.",
  "Well said. I couldn't put it better.",
  'Mm. Same here.'
]);
LXP('answer_family', ['{about} is fine. Same as ever.', "{about}'s doing well, thanks for asking.", '{about} is keeping busy.'], { state: 'fine' });
LXP('answer_family', ['{about} is on top of the world, for once.', "{about}'s in a grand mood."], { state: 'glad' });
LXP('answer_family', ["{about}'s not been right lately.", '{about} is low. Worries me a bit.'], { state: 'low' });
LXP('answer_family', ['{about} is worn out. Needs a good rest.', "{about} is tired through. Can't blame them."], { state: 'tired' });
LXP('praise', [
  "You've a way of making a day better. Just so you know.",
  "I don't say it enough: I'm glad of you.",
  "You're one of the good ones, you are."
]);
LXP('thank_praise', ["Well. Thanks. That's made my day.", "You'll make me blush. Thank you.", "That's kind. I'll keep it."]);
LXP('congratulate', ['Lovely. They grow up fast.', "That's wonderful to hear.", 'You must be very proud.']);
LXP('answer_family', ['{about} is ill. A fever.', "{about}'s poorly. In bed, mostly."], { state: 'ill' });
LXP('warn', [
  'Mind yourself around {about}. They {reason}.',
  'Between us, about {about}: they {reason}. Keep an eye out.',
  'You should know about {about}. They {reason}.'
]);
LXP('warn_thanks', ['Thanks for the word.', 'I had wondered. Thank you.', 'I will watch out.']);
lx('call_child', 'plain', "{about}! Come in now, it's getting dark!");
lx('call_child', 'plain', '{about}! Time to come home!');
lx('tell_rep', 'plain', "Word is you {about}. Thought you'd want to know.");
lx('tell_rep', 'plain', "They say you {about}. I'm only passing it on.");
lx('tell_rep', 'plain', "I've heard you {about}, from {qty} people now.");
lx('tell_rep', 'plain', "You {about}, is what's going round.");
lx('tell_rep', 'plain', "I don't believe it, but they say you {about}.");
lx('tell_rep', 'plain', 'Folk are saying you {about}. Best you hear it from me.');
lx('rep_own', 'plain', 'Fair enough. I did.');
lx('rep_own', 'plain', "I won't argue.");
lx('rep_own', 'plain', "I know. I'm not proud of it.");
lx('rep_own', 'plain', 'Yes. I did.');
lx('rep_own', 'plain', "It's true. I'd rather you heard it from me.");
lx('rep_own', 'plain', "I can't say it isn't so.");
lx('rep_deny', 'plain', "That's not true.");
lx('rep_deny', 'plain', "Who's saying that?");
lx('rep_deny', 'plain', 'I never did.');
lx('rep_deny', 'plain', "It wasn't me. Truly.");
lx('rep_deny', 'plain', "Somebody's mixed me up with somebody else.");
lx('rep_deny', 'plain', "I'd never. Ask anyone.");
