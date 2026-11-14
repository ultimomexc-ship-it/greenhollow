/* Words: the island voice, the day: how people are, what they did, how it went. Lines only (lxi, LXI, kidi, LXLI); the acts that say them are in the files that define ACTS. The one-sentence LXI entries are the short plain lines the voice rule leans on (keep them one sentence). */
lxi('ask_how', 'How are you? I would like to know the real number.');
lxi('ask_how', 'How are things with you, {li}?', { rel: 'friend' });
lxi('ask_how', 'How are you getting on?');
lxi('answer_how', 'Fine. About a six.', { state: 'fine' });
lxi('answer_how', 'Fine. Nothing to report. That is a report of a kind.', { state: 'fine' });
lxi('answer_how', 'Hungry. Otherwise fine.', { state: 'hungry' });
lxi('answer_how', 'Tired, but upright.', { state: 'tired' });
lxi('answer_how', 'Good. I do not know why. I have stopped asking.', { state: 'glad' });
lxi('answer_how', 'Not great. It will pass. These things do.', { state: 'low' });
/* the ordinary day */
lxi('ask_day', 'What did you do today? In order, if you can.');
lxi('ask_day', 'How has your day been? I mean the whole of it.');
lxi('nothing_much', 'Very little. Which is also something.');
lxi('nothing_much', 'Nothing worth telling. I walked about. The ground was where I left it.');
lxi('empathise', 'That sounds hard.');
lxi('empathise', 'I am sorry. I do not have anything useful to say, but I am sorry.');
lxi('acknowledge', 'Good.');
lxi('acknowledge', 'I see.');
lxi('acknowledge', "That is a decent day's work.");
lxi('acknowledge', 'And how did it go?');
lxi('life:slept', 'I slept. Properly. I want that noted.');
lxi('life:slept_rough', 'I slept on the ground. The ground was patient with me.');
lxi('life:slept_rough', 'I woke up with sand in my ear again. It is becoming a sort of companion.');
lxi('life:slept_rough', 'I still have no bed. I have started to think of the horizon as my bedroom.');
lxi('life:no_privy', 'I could not find a privy earlier. I will not go into it.');
lxi('life:bladder_emergency', 'I made it. Barely. We do not need to discuss the margin.');
lxi('life:went_hungry', 'I have not eaten properly. I notice it more than I expected to.');
lxi('life:starving', 'I am very hungry. I am saying so in case it matters.');
lxi('life:tired', 'I am worn out. All day on my feet, and the feet have started to take it personally.');
lxi('life:ate', 'I had a decent meal. I wanted that on the record.');
lxi('life:planted', 'I put in {things} today. Now we wait, which is most of farming.');
lxi('life:planted', 'I planted {things}. I told them nothing. They seem to know what to do.');
lxi('life:harvested', 'I brought in {things}. It was heavier than I remembered it being.');
lxi('life:harvested', 'Harvested {things}. The field gave them up without a fuss.');
lxi('life:bought', 'I bought {things} today.');
lxi('life:bought', 'I picked up {things}. The transaction went smoothly. I was suspicious of that.');
lxi('life:sold', 'I sold {things}. The stall took them as if it had been expecting them.');
lxi('life:baked', 'I baked {things}. The room smelled like a decision.');
lxi('life:baked', 'The oven gave me {things} today. I do not ask it how.');
lxi('life:cooked', 'I made {things} today.');
lxi('life:forged', 'I turned out {things} today.');
lxi('life:woven', 'I finished {things} on the loom.');
lxi('life:new_in_stock', 'The {shop} has {item} now. I stood and looked at it for a while.');
lxi('life:new_in_stock', 'The {shop} has {item} on the shelf that nobody ordered. I am not asking.');
lxi('life:out_of_stock', 'The {shop} was out of {item}. It was very quiet there.');
lxi('life:out_of_stock', 'I went for {item} and the {shop} had none. The shelf looked embarrassed.');
lxi('life:could_not_afford', 'I could not afford {item}. I counted twice.');
lxi('life:could_not_afford', 'Money is tight. I had to leave the {item} and walk away from it.');
lxi('life:price_up', 'The price of {item} has gone up at the {shop}. I think the {shop} knows.');
lxi('life:price_down', 'The price of {item} is down at the {shop} today. It will not last. It never does.');
lxi('vent', 'I am hungry, as it happens. It has been a while.', { state: 'hungry' });
lxi('vent', 'I am very tired. The tiredness has started to feel like a place.', { state: 'tired' });
lxi('vent', 'I have been low. It has no cause. That is what is wrong with it.', { state: 'low' });
lxi('console', 'That is hard. I am sorry. It is a small island and we are all here.');
lxi('console', 'It will pass. Not today, probably.');
lxi('ask_how', 'How are you? I mean really, not the answer you give the baker.', { rel: 'spouse' });
lxi('ask_how', 'Are you well? You look tired. You always look tired. It is part of the family.', { rel: 'parent' });
lxi('ask_how', 'Are you behaving? Do not answer.', { rel: 'child', kid: 'yes' });
lxi('ask_how', 'How is life, then? Tell me before everyone else does.', { rel: 'sibling' });
kidi('answer_how', 'Fine. I found a very good stick.', { state: 'fine' });
kidi('answer_how', 'I am hungry. Is it nearly time to eat? It feels nearly.', { state: 'hungry' });
kidi('answer_how', 'I am tired. I am not tired. I am a bit tired.', { state: 'tired' });
kidi('answer_how', 'Good. It has been a good day. I did not expect that of it.', { state: 'glad' });
for (const t of [
  'Fine. I looked into it and there is nothing to report.',
  'Fine. The day has not asked much of me.',
  'Well enough. I have checked.',
  'About a five. A good, honest five.',
  'Fine. There is a small noise in my left knee, which is the news.',
  'Fine. I was going to say I was well and it is true, which surprised me.',
  'Steady. That is the word I have settled on.',
  'Not bad. I say that and wait for the day to hear me.'
])
  lxi('answer_how', t, { state: 'fine' });
for (const t of [
  'Good. I would like to say why. I cannot.',
  'Very well. I have decided to enjoy it before it is noticed.',
  'Better than I expected. I recalibrated my expectations on the way here.',
  'Well. In a way that does not need explaining.'
])
  lxi('answer_how', t, { state: 'glad' });
for (const t of [
  'Low. It has no address, so I cannot send it back.',
  'Not well. It is a grey kind of not well, not an interesting one.',
  'I have had better days. I could name three.',
  'Flat. Like a field after rain, if the field had opinions.'
])
  lxi('answer_how', t, { state: 'low' });
for (const t of [
  'Hungry. It is a precise feeling and I recognise it.',
  'Hungry. My stomach has started to make announcements.',
  'Hungry. I have thought about bread more than is dignified.'
])
  lxi('answer_how', t, { state: 'hungry' });
for (const t of [
  'Tired. I could sleep standing. I may be.',
  'Worn out. The kind that sits behind the eyes.',
  'Tired in a way that sleep might help.'
])
  lxi('answer_how', t, { state: 'tired' });
for (const t of [
  'How are you holding up?',
  'How is the day treating you? I mean honestly.',
  'Are you keeping well? I ask in case.',
  'How have you been, since last time? Give me the short version.',
  'And you? How are things on your side of the island?'
])
  lxi('ask_how', t);
lxi('sympathise_how', 'I am sorry. I would offer something, but I have only the sentence.', { state: 'low' });
lxi('sympathise_how', 'Do you want to talk about it? I have time. I have, in fact, nothing but time.', { state: 'low' });
lxi('sympathise_how', 'You should eat. I say it as a person who has also been hungry on this island.', { state: 'hungry' });
lxi('sympathise_how', 'Bread. Find bread. That is the whole of my advice and I stand by it.', { state: 'hungry' });
lxi('sympathise_how', 'Rest if you can. The day will wait. It is good at that.', { state: 'tired' });
lxi('sympathise_how', 'You look it. Sit down. The ground is free.', { state: 'tired' });
lxi('share_gladness', 'Good. I am glad. I will try not to be suspicious of it.');
lxi('share_gladness', 'Good. Hold on to it. It does not come in great quantity.');
for (const t of [
  'That is a respectable day.',
  'Good. I would call that a day.',
  'That sounds like it went well. I will take your word for it.',
  'Well done. I mean that in a measured way.',
  'That is more than I managed, so well done.',
  'Good. Somebody should have a good day. It might as well be you.'
])
  lxi('acknowledge', t);
for (const t of [
  'I see. I will keep an eye on it, from a distance.',
  'Is that so. I had not noticed, which says something about me.',
  'Hm. That is something to know.',
  'Well. If you say so. I am inclined to.',
  'Odd. And yet it is the sort of thing that happens here.'
])
  lxi('acknowledge', t, { how: 'neutral' });
for (const t of [
  'That is a respectable day.',
  'Well done. I mean it in a measured way.',
  'That sounds like it went well. I will take your word for it.',
  'Good. Somebody should have a good day.'
])
  lxi('acknowledge', t, { how: 'good' });
LXLI('planted', [
  'Planted {things}. They went in without objection, which is how it usually goes.',
  'I put in {things} and stood there a while. It is a good way to spend a standing.',
  'I sowed {things}. I said a few words over them. It was mostly the weather.',
  '{things} went in today. I will check on them tomorrow and pretend I did not already.'
]);
LXLI('harvested', [
  'I harvested {things}. They had been waiting for me, and it was not clear they minded.',
  '{things}, brought in. I felt briefly like a person with a plan.',
  'I gathered {things}. I counted them twice. It is a small joy and I allow it.',
  'The field gave me {things}. I said thank you. I did not know to whom.'
]);
LXLI('bought', [
  'I bought {things}. I paid the number I was told, and it was accepted.',
  'I got {things}. The stall and I understand each other now.',
  'I bought {things}. I carried them home like a person with a purpose.',
  '{things}, bought. I did not haggle. I have not learned how, and it is not too late.'
]);
LXLI('sold', [
  'I sold {things}. The keeper counted the coins like a man making a promise.',
  '{things} sold. It felt good and slightly like losing something.',
  'I sold {things} and walked off with the same face I came with.',
  '{things} went. I was paid. The arrangement worked, which is rarer than it should be.'
]);
LXLI('baked', [
  'I baked {things}. The room smelled like something that would be forgiven.',
  '{things} out of the oven. They looked at me with their whole crust.',
  'I baked {things}. I did not burn any. I am noting it for the record.',
  '{things}. The oven and I worked well together today. I will not mention it to the oven.'
]);
LXLI('cooked', ['I cooked {things}. It was edible, and for some people that is a calling.', '{things}, cooked. The pot and I are friends again.']);
LXLI('forged', ['I forged {things}. The metal agreed, eventually.', '{things}, forged. I looked at them for a while. They looked back, being hard.']);
LXLI('woven', [
  'I wove {things}. It is a patient trade. The cloth does not hurry and neither do I.',
  '{things}, woven. I felt, briefly, like a thread.'
]);
LXLI('ate', [
  'I ate properly. I had forgotten how much of the day it fixes.',
  'I had a meal. It was a good meal. I want that said while it is still true.',
  'I ate. It was uneventful. I am grateful for the uneventful.'
]);
LXLI('slept', [
  'I slept in a bed. I want to say that again, slowly.',
  'I slept well. I woke up and the day was still there. I counted that as a gift.',
  'I slept all the way through. I do not know where I went. It was restful.'
]);
LXLI('slept_rough', [
  'I slept on the ground. The ground was patient with me. My back has reservations.',
  'No bed again. I made a nest of what I had. The island heard it and said nothing.',
  'I slept rough. I have decided to think of it as a short story.'
]);
LXLI('went_hungry', [
  'I have not eaten today. My stomach has started to make announcements.',
  'I went without. It is a precise feeling and I recognise it.',
  'I missed the meal. The day has taken on a certain sharpness.'
]);
LXLI('no_privy', [
  'I could not find a privy. I made an arrangement with a tree. We both said nothing.',
  'There was no privy to be had. I will not describe what followed. It was dignified for the most part.'
]);
LXLI('new_in_stock', [
  'New at the {shop}: {item}. That was not there before. I notice things.',
  'The {shop} is stocking {item}. I did not ask why. The shelf looked pleased.'
]);
LXLI('out_of_stock', [
  'The {shop} had no {item}. I stood there until it felt rude to stay.',
  'I went for {item}. The {shop} was out. It was very polite about it.'
]);
LXLI('price_up', [
  'The price of {item} has gone up at the {shop}. Not by much. By enough to be mentioned.',
  'I noticed the price of {item} is up at the {shop}. It is small, and I am treating it as large.'
]);
LXLI('price_down', [
  'The price of {item} is down at the {shop}. I will believe it when I am holding it.',
  'The {shop} has lowered the price of {item}. I did not ask why. I am enjoying it.'
]);
LXLI('could_not_afford', [
  'I could not afford {item}. I looked at it for a long time, to be fair to it.',
  'I wanted {item} and the purse said no. It has said no before. It is consistent.'
]);
LXLI('tired', ['I am very tired. It has a kind of weight, like a coat.', 'I am worn out. The tiredness has started to feel like a place.']);
LXI('ask_why_state', [
  'Why? What happened? You can give me the short version.',
  'What is the matter? I would rather know.',
  'Is something wrong? I mean in particular.'
]);
LXI('explain_state', [
  '{about} {reason}. I do not think there is more to it than that.',
  '{about} {reason}. It would do it to anyone.',
  'It is simple. {about} {reason}.'
]);
LXI('explain_unknown', ['I do not know. {about} has not said, and I have stopped asking.', 'Nobody knows. {about} least of all.']);
LXI('ask_more_day', [
  'And apart from that? I am interested in the whole of it.',
  'Anything else? I have time for a second thing.',
  'And after that?'
]);
LXLI('worked_with', [
  'I worked beside {about} today. We said about nine words. They were the right ones.',
  '{about} and I worked the same ground today. It goes faster with two, or it feels as though it does.',
  'I spent the day next to {about}. I know how {about} breathes when the work is hard now.'
]);
LXLI('ate_with', [
  'I ate with {about}. Neither of us mentioned it. It was pleasant.',
  '{about} and I had a meal at the same time, in the same place. I am calling it lunch together.',
  'I shared a table with {about}. The bread was ordinary and I remember it.'
]);
LXLI('found', [
  'I found {item}. I do not know what it is for. It is mine now.',
  'There was {item} on the ground. I picked it up before I had thought about it.',
  'I found {item} today. It was not there yesterday. I have asked nobody.'
]);
LXLI('ill', [
  'I am unwell. It arrived in the night, like the rest of us.',
  'I have a fever. I am told it is the ordinary kind. I do not find that comforting.',
  'I am not well. I am upright, which I am counting.'
]);
LXLI('recovered', [
  'I am better. I woke up and it had gone, without a word.',
  'The fever has left. I did not see it go. I am not going to look for it.',
  'I am well again. Everything tastes of something.'
]);
LXI(
  'answer_how',
  [
    'Unwell. I have a fever and an opinion about it.',
    'Not well. I am upright. That is the summary.',
    'Ill. It is the ordinary kind, I am told, by people who do not have it.'
  ],
  { state: 'ill' }
);
LXI(
  'sympathise_how',
  [
    'You should be lying down. I will say it again if you are still here in a minute.',
    'I am sorry. Rest. The island will manage without you for a day. It managed before.'
  ],
  { state: 'ill' }
);
LXI('vent', ['I feel dreadful. I am hot and cold, and I cannot decide which to complain about.'], { state: 'ill' });
LXI('ask_how', ['How are you?', 'How are you keeping?', 'Are you well?', 'How is it with you?']);
LXI('ask_day', ['How was your day?', 'What did you do today?', 'What have you been at?', 'Busy day?']);
LXI('nothing_much', ['Not much.', 'Very little.', 'The usual.', 'Nothing to speak of.']);
LXI('empathise', [
  'I am sorry.',
  'That is hard.',
  'That is a bad day.',
  'That sounds like a long day.',
  'I am sorry. That should not happen to anyone.'
]);
LXI('acknowledge', ['Good.', 'Well done.', 'That is a fair day.']);
for (const [st, ls] of [
  ['fine', ['Well enough.', 'I am well.', 'Fine.']],
  ['hungry', ['Hungry.', 'I have not eaten.']],
  ['tired', ['Tired.', 'I am worn out.']],
  ['glad', ['Well. Very well.', 'It is a good day.']],
  ['low', ['Not at my best.', 'A little low.']],
  ['ill', ['Not well.', 'I have a fever.']]
] as any)
  LXI('answer_how', ls, { state: st });
// the day, told plainly
LXI('life:slept', ['I slept well.', 'I had a full night.']);
LXI('life:slept_rough', ['I slept on the ground.', 'I slept outside again.', 'I had no bed last night.']);
LXI('life:no_privy', ['I could not find a privy.', 'There was no privy free.']);
LXI('life:went_hungry', ['I have not eaten today.', 'I went without a meal.']);
LXI('life:starving', ['I have not eaten in two days.']);
LXI('life:tired', ['I am worn out.', 'I have been on my feet all day.']);
LXI('life:ate', ['I had a proper meal.', 'I ate well today.']);
LXI('life:planted', ['I planted {things}.', 'I put in {things} today.', '{things}, in the ground.']);
LXI('life:harvested', ['I harvested {things}.', 'I brought in {things}.', '{things}, out of the ground.']);
LXI('life:bought', ['I bought {things}.', 'I got {things} at the market.']);
LXI('life:sold', ['I sold {things}.', 'I took {things} to the stall.']);
LXI('life:baked', ['I baked {things}.', '{things}, out of the oven.']);
LXI('life:new_in_stock', ['The {shop} has {item} now.', 'New at the {shop}: {item}.']);
LXI('life:out_of_stock', ['The {shop} is out of {item}.', 'There was no {item} to be had.']);
LXI('life:could_not_afford', ['I could not afford {item}.', 'I had not the money for {item}.']);
LXI('life:price_up', ['The price of {item} has gone up.', 'The price of {item} is up at the {shop} now.']);
LXI('life:price_down', ['The price of {item} has come down.', 'The price of {item} is down at the {shop} now.']);
LXI('life:worked_with', ['I worked beside {about} today.', '{about} and I did the same rows.']);
LXI('life:ate_with', ['I ate with {about}.', '{about} and I shared a table.']);
LXI('life:found', ['I found {item}.', 'I picked up {item} today.']);
LXI('life:ill', ['I am not well.', 'I have a fever.']);
LXI('life:recovered', ['I am better.', 'The fever has gone.']);
// sympathy that claims a shared trouble: only said by somebody who has had the same this week
LXI(
  'empathise',
  [
    'Ugh. Yes. I know that one.',
    'I know.',
    'The same happened to me. It does not get better for being shared.',
    'I had that too. I will not say it helps.',
    'Me too. I will not say it was better.'
  ],
  { shared: 'yes' }
);
LXI(
  'sympathise_how',
  [
    'I am sorry to hear it.',
    'Rest, if you can.',
    'That sounds like a long day.',
    'Sit down for a minute. I will stay.',
    'Eat something. Then see how it looks.'
  ],
  {}
);

/* the Hamlet: rent, yards and moving in (life2/rent.ts, yards.ts) */
LXLI('well_gave', ['I put {money} in the wishing well.', 'I dropped {money} in the well. It made a pleasant sound.', 'I gave the well {money}.']);
LXLI('rent_paid', ['I paid the rent at six.', 'The rent is paid. I checked my pocket twice afterwards.', 'I paid my rent today.']);
LXLI('rent_unpaid', ['I could not pay the rent today.', 'The rent was due at six. I was not ready at six.', 'I had no coin for the rent today.']);
LXLI('no_yard', ['I have no yard.', 'I have a patch of ground I stand on. It is not mine.', 'No fence has my name on it yet.']);
LXLI('moved_in', ['I have a yard now.', 'I moved in behind a fence. It has a gate.', 'There is a bed with a fence round it, and it is mine.']);
LXLI('came_ashore', [
  'I came ashore today.',
  'I arrived today. The yard was already there, with a bed in it.',
  'I landed today. I have decided not to ask how.'
]);
LXLI('apart', [
  'We are married and sleep in two yards.',
  'There is no room in the yard for my bed. We say goodnight across a fence.',
  'I live apart from the one I married. Temporarily, I am told.'
]);
LXLI('stall_opened', [
  'I keep a stall now.',
  'I opened a stall today. Nobody has asked yet what I am selling.',
  'I have a counter and a sign. I am a shopkeeper, apparently.'
]);

/* the Hamlet's two new ways of being: no bed, and behind with the rent */
lxi('answer_how', 'No bed yet. Otherwise fine.', { state: 'bedless' });
lxi('answer_how', 'I sleep on the ground. It is firm.', { state: 'bedless' });
lxi('answer_how', 'Behind with the rent. I have noticed.', { state: 'behind' });
lxi('answer_how', 'Short this week. The rent noticed first.', { state: 'behind' });
lxi('remark_state', 'I have nowhere to sleep. The ground is doing its best.', { state: 'bedless' });
lxi('remark_state', 'I could not pay the rent today. I counted twice.', { state: 'behind' });
lxi('vent', 'I have no bed. I have started to know the ground personally.', { state: 'bedless' });
lxi('vent', 'I would like a bed. I would like it more each night.', { state: 'bedless' });
lxi('vent', 'I am behind with the rent. It is not a debt. It feels like one.', { state: 'behind' });
lxi('vent', 'I had nothing for the rent today. It was a short walk home.', { state: 'behind' });
lxi('sympathise_how', 'A yard and a bed. That is all it would take. I mention it as a fact.', { state: 'bedless' });
lxi('sympathise_how', 'Somebody will build something. It is mostly how things happen here.', { state: 'bedless' });
lxi('sympathise_how', 'It is not a debt. It is only a day you could not pay. They pass.', { state: 'behind' });
lxi('sympathise_how', 'The crop will come in. It always has, so far.', { state: 'behind' });
lxi('answer_family', '{about} has nowhere to sleep. We are working on it.', { state: 'bedless' });
lxi('answer_family', '{about} is behind with the rent. It is bothering {about} more than it should.', { state: 'behind' });
lxi('remark_place', 'The fence {place} has held. I trust a fence that has held.', {}, ['feature:yards']);
lxi('remark_place', 'Everybody has a yard {place} and a gate. It is orderly in a way I did not expect.', {}, ['feature:yards']);
lxi('remark_place', 'The rent is paid at six. It is the one thing {place} that is on time.', {}, ['feature:rent']);
lxi('remark_work', 'I have a field of my own. It is a small thing and I think about it often.', {}, ['feature:yards']);
lxi('remark_state', 'I have no bed. I am told it is a phase.', { state: 'bedless' });
lxi('remark_state', 'The rent was due and I was not ready. It was brief.', { state: 'behind' });

/* ---- surprises (talk/surprise.ts, life2/surprise.ts), in the island voice: startled, and still exact ---- */
const SURP_LINES_I: any = {
  woke_moved: [
    'I went to sleep indoors and woke up outside, in the same bed.',
    'I was carried out of the house in my sleep. The bed came too.',
    'I woke up out of doors. I did not go to bed out of doors.'
  ],
  chair_moved: [
    'I was sitting in my chair and then the chair was somewhere else, with me in it.',
    'My chair moved while I sat in it. I did not get up.'
  ],
  moved: [
    'I was standing somewhere else a moment ago, and I did not walk here.',
    'I have been moved. I was in one place and now I am in this one.',
    'I turned up here without walking. I have checked my feet.'
  ],
  bed_new: ['There is a bed with my name on it. Nobody will say where it came from.', 'I have a bed now. It arrived while I was not looking.'],
  bed_gone: ['My bed is gone. Nobody saw it go.', 'I had a bed and now I do not.'],
  bed_moved: ['My bed is not where I left it.', 'My bed has moved. It did not ask.'],
  roof: ['There are walls round my bed now, and a roof.', 'I have a house. It was put up round me while nobody was looking.'],
  roof_gone: ['The walls round my bed have gone. I can see the sky from my pillow.', 'My roof is gone.'],
  window: ['My house has a window now.', 'There is a window in my wall that was not there before. I have looked through it several times.'],
  window_gone: ['My window has gone. It is wall now.'],
  yard: ['There is a fence round my place now, with a gate.', 'I have a yard. The fence turned up while I was elsewhere.'],
  yard_open: ['There is a gap in my fence.', 'Part of my fence is missing. The rest is where it was.'],
  yard_gone: ['My fence is gone. All of it.', 'I had a yard. Now I have the place where a yard was.'],
  fields_more: ['There are {qty} new fields in my yard.', 'Somebody laid {qty} fields in my yard. I counted them twice.'],
  fields_less: ['{qty} of my fields have gone back to grass.', 'I have {qty} fewer fields than I had.']
};
for (const k of Object.keys(SURP_LINES_I)) for (const t of SURP_LINES_I[k]) lxi('blurt', t, { how: k });
const SURP_CRY_I: any = {
  woke_moved: ['This is not my bedroom.', 'There is a tree where the ceiling was.'],
  chair_moved: ['I was indoors a moment ago.'],
  moved: ['I was not here a moment ago.', 'I do not know how I got here.', 'I was over there.'],
  bed_new: ['That bed has my name on it.'],
  bed_gone: ['My bed is not here.'],
  bed_moved: ['That is not where my bed was.'],
  roof: ['There are walls round my bed.'],
  roof_gone: ['My walls are gone.'],
  window: ['There is a window in my wall.'],
  window_gone: ['My window is gone.'],
  yard: ['There is a fence round my place.'],
  yard_open: ['There is a hole in my fence.'],
  yard_gone: ['My fence is gone.'],
  fields_more: ['Those fields are new.'],
  fields_less: ['Some of my fields are gone.']
};
for (const k of Object.keys(SURP_CRY_I)) for (const t of SURP_CRY_I[k]) lxi('odd_cry', t, { how: k });
lxi('odd_glad', 'That is good luck. I am glad for you.', { op: 'good' });
lxi('odd_glad', 'Nothing like that has happened to me. I would not say no.', { op: 'good' });
lxi('odd_sorry', 'That is a hard thing to find. I am sorry.', { op: 'bad' });
lxi('odd_sorry', 'I am sorry. That is not a fair thing to happen.', { op: 'bad' });
lxi('odd_wonder', 'That is strange.', {});
lxi('odd_wonder', 'Nobody saw anything. That is the strange part.', {});
lxi('odd_wonder', 'Things happen here that nobody does.', {});
lxi('odd_explain', 'You may have walked in your sleep.', { op: 'odd' });
lxi('odd_explain', 'You were more tired than you thought.', { op: 'odd' });
lxi('odd_explain', 'It may have been there all along.', { op: 'good' });
lxi('ev:turned_up', '{t} was suddenly {place} and did not walk there');
lxi('ev:turned_up', '{t} turned up {place}, and nobody knows how');
lxi('ev:home_changed', '{t} has {place} now, and nobody saw it arrive');
lxi('ev:home_changed', '{t} was given {place} by nobody anybody knows of');
lxi('ev:home_lost', "{t}'s {place} went missing, and nobody saw it go");
lxi('ev:home_lost', "{t}'s {place} is gone");
