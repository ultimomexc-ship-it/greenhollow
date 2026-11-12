/* Words: the plain voice, short lines. The voice rule (CLAUDE.md, Talk) lets a speaker add an aside on one line in four; the other three need a line that just says the thing.
   Every tag group of the most-used acts that had asides but fewer than three one-sentence lines gets them here (`node tools/lexpool.mjs --pack=plain --deficits <acts>` lists the gaps).
   A Roman villager, everyday, contractions allowed, one sentence of under ten words, nothing to explain. Keep them that way. */

const PLAIN_SHORT: [string, any, string[]][] = [
  ['agree', { reg: 'warm' }, ['Yes, exactly.', 'I think so too.']],
  ['answer_family', { state: 'fine' }, ['{about} is doing well.']],
  ['answer_family', { state: 'glad' }, ['{about} is in good spirits.']],
  ['answer_family', { state: 'ill' }, ['{about} is ill.', '{about} has a fever.', '{about} is unwell.']],
  ['answer_family', { state: 'low' }, ['{about} is a bit low.']],
  ['answer_family', { state: 'tired' }, ['{about} is tired.', '{about} is worn out.']],
  ['answer_how', { age: 'child', state: 'fine' }, ["I'm fine.", 'Okay.', 'Good, thanks.']],
  ['answer_how', { age: 'child', state: 'glad' }, ["I'm happy.", 'Really good.', 'Great, thanks.']],
  ['answer_how', { age: 'child', state: 'hungry' }, ["I'm hungry.", 'I want a snack.', 'Hungry.']],
  ['answer_how', { age: 'child', state: 'tired' }, ["I'm sleepy.", 'Tired.', "I'm tired."]],
  ['answer_how', { reg: 'warm' }, ["I'm well, thanks.", 'Doing well, thank you.']],
  ['answer_how', { state: 'hungry' }, ['I could eat.']],
  ['answer_how', { state: 'ill' }, ["I'm not well.", "I'm ill."]],
  ['answer_work', {}, ['Busy, as ever.', 'It goes on.', "Can't complain."]],
  ['ask_how', { rel: 'parent' }, ['How are you keeping?', 'Are you well?', 'How are you today?']],
  ['ask_how', { rel: 'sibling' }, ['How are you keeping?', 'Are you well?', 'How are you today?']],
  ['ask_how', { rel: 'spouse' }, ['How are you, love?', 'All right?', "How's your day?"]],
  ['farewell', { age: 'child' }, ['Bye!', 'See you!', "I'm off."]],
  ['farewell', { reg: 'formal' }, ['Good day to you.']],
  ['farewell', { reg: 'warm', rel: 'child' }, ['Bye, dear.', 'Be good.', 'See you soon, dear.']],
  ['farewell', { reg: 'warm', rel: 'spouse' }, ['Bye, love.', 'See you later, love.', 'Take care, love.']],
  ['farewell', { rel: 'child' }, ['Off you go.']],
  ['farewell', { rel: 'sibling' }, ['Bye.', 'See you.']],
  ['farewell', { rel: 'spouse' }, ['See you soon.', 'Bye, love.', 'Be careful.']],
  ['farewell_back', { reg: 'warm' }, ['Bye, friend.', 'Take care.']],
  [
    'give_opinion',
    { kin: 'child', op: 'fond' },
    ["{about} is my child and I'm fond of them.", "{about} is my child, so I'm biased.", '{about} is my child and a joy.']
  ],
  [
    'give_opinion',
    { kin: 'child', op: 'like' },
    ["{about} is my child and I'm proud of them.", '{about} is my child and a good one.', '{about} is my child and doing fine.']
  ],
  [
    'give_opinion',
    { kin: 'parent', op: 'fond' },
    ['{about} is my parent and I owe them a lot.', '{about} is my parent and a good one.', '{about} is my parent and I love them.']
  ],
  [
    'give_opinion',
    { kin: 'parent', op: 'like' },
    ['{about} is my parent and we get on.', '{about} is my parent and I could do worse.', '{about} is my parent and all right.']
  ],
  [
    'give_opinion',
    { kin: 'parent', op: 'wary' },
    ["{about} is my parent and we don't always agree.", '{about} is my parent and it can be hard.', '{about} is my parent and we try.']
  ],
  [
    'give_opinion',
    { kin: 'sibling', op: 'fond' },
    ['{about} is my sibling and I love them.', "{about} is my sibling and I'd do anything for them.", '{about} is my sibling and my friend.']
  ],
  [
    'give_opinion',
    { kin: 'sibling', op: 'like' },
    ['{about} is my sibling and we get on.', '{about} is my sibling and we manage.', '{about} is my sibling and all right.']
  ],
  [
    'give_opinion',
    { kin: 'sibling', op: 'wary' },
    ['{about} is my sibling and we argue.', '{about} is my sibling and it is complicated.', '{about} is my sibling and we try.']
  ],
  [
    'give_opinion',
    { kin: 'spouse', op: 'wary' },
    ['{about} is my spouse and we manage.', "{about} is my spouse and it's not always easy.", '{about} is my spouse and we try.']
  ],
  ['give_opinion', { op: 'neutral' }, ["I don't know {about} well.", "{about}'s all right, I suppose."]],
  ['give_opinion', { op: 'wary' }, ["I'm wary of {about}.", "I'm not keen on {about}."]],
  ['gossip_person', { op: 'dislike' }, ["I can't stand {about}.", 'Watch yourself with {about}.']],
  ['gossip_person', { op: 'fond' }, ["I'm fond of {about}.", "{about}'s a good sort."]],
  ['greet', { age: 'child', rel: 'parent' }, ['Hello!', 'Hi, there.']],
  ['greet', { age: 'child' }, ['Hello, {li}.', 'Hi, {li}.']],
  ['greet', { band: 'evening', rel: 'spouse' }, ['Evening, love.', 'Hello, love.', 'There you are.']],
  ['greet', { band: 'morning', rel: 'spouse' }, ['Morning, love.', 'Hello, love.', 'Up already?']],
  ['greet', { kid: 'yes', rel: 'child' }, ['Hello, dear.', 'There you are.']],
  ['greet', { reg: 'warm', rel: 'child' }, ['Hello, love.', 'There you are, dear.']],
  ['greet', { reg: 'warm', rel: 'friend' }, ['Hello, friend.', 'Good to see you.', 'There you are.']],
  ['greet', { reg: 'warm' }, ['Good to see you.', 'Hello, {li}.', 'There you are.']],
  ['greet', { rel: 'friend' }, ['Hello, friend.', 'Good to see you.']],
  ['greet', { rel: 'sibling' }, ['Hello.', 'There you are.']],
  ['greet_back', { age: 'child', rel: 'parent' }, ['Hi.', 'Hello.', 'Hi, there.']],
  ['greet_back', { age: 'child' }, ['Hi.', 'Hello.']],
  ['greet_back', { reg: 'warm' }, ['Hello.', 'Good to see you.', 'There you are.']],
  ['greet_back', { rel: 'child' }, ['Hello, dear.', 'Hi, there.', 'Hello, love.']],
  ['greet_back', { rel: 'parent' }, ['Hello.', 'Hi.']],
  ['greet_back', { rel: 'sibling' }, ['Hello.', 'Hi.']],
  ['greet_back', { rel: 'spouse' }, ['Hello, love.', 'There you are.']],
  ['greet_back', { rep: 'kind' }, ['Hello, friend.', 'Good to see you.']],
  ['greet_back', { rep: 'vandal' }, ['Hello.']],
  ['groan', {}, ['Ugh.', 'Oh, no.']],
  [
    'joke',
    {},
    [
      'My turnips are shy, and will not come out.',
      "I'd offer you a joke, but I've sold them all.",
      'The bread rose early today and I am still catching up.'
    ]
  ],
  ['offer_gift', { how: 'return' }, ['Here. For last time.', 'This is for you, to even things up.', 'Here. I owe you.']],
  ['pre_close', { age: 'child' }, ["I've got to go.", 'Bye now.']],
  ['pre_close', { reg: 'warm' }, ['I must be off.', 'I really must go.']],
  ['remark_place', { age: 'child' }, ['I like it here.', "It's fun here.", "There's lots to look at."]],
  ['remark_state', { state: 'ill' }, ["I'm not well.", 'I feel awful.', "I've a fever."]],
  ['remark_work', { age: 'child' }, ["I'm helping.", "I've got jobs to do.", "I'm busy."]],
  ['shop_greet_back', { rel: 'friend' }, ['Hello, friend.', 'Good to see you.', "What'll it be?"]]
];
for (const [act, tags, lines] of PLAIN_SHORT) LXP(act, lines, tags);
