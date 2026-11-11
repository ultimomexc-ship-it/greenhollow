/* The plain lines of the island voice (docs/talk-review.md, task D). The voice rule in `lxSay` lets a speaker add an aside on at most one line in four;
   the other three need a short line that just says the thing. These are those lines, for the acts said most. One sentence, exact, no ornament:
   the dryness of the island is in what people choose to mention, not in every line having a second half. Add asides elsewhere; keep this file plain. */

{
  const S = (act: string, lines: string[], tags: any = {}) => { for (const t of lines) lxi(act, t, tags); };
  S('greet', ['Hello, {li}.', 'Morning.', 'There you are.', '{li}.', 'Good day.', 'Hello.']);
  S('greet_back', ['Hello.', 'Hello, {li}.', 'Morning.', 'Good day.', 'Yes. Hello.']);
  S('farewell', ['Goodbye.', 'I will go on, then.', 'See you, {li}.', 'I should get back.', 'Until later.', 'Be well.', 'That is me.', 'Right. Goodbye.']);
  S('farewell_back', ['Goodbye.', 'See you.', 'Go well.']);
  S('pre_close', ['I should get on.', 'Well. I have things to see to.', 'I will let you go.', 'That is all I had.', 'I must go.']);
  S('remark_place', ['It is quiet here.', 'This is a good spot.', 'Nobody about.', 'The path wants mending.', 'I like this corner.']);
  S('remark_work', ['There is plenty to do.', 'The work goes on.', 'I am behind, a little.', 'It was a full morning.', 'The work is the same as yesterday.']);
  S('remark_state', ['I am hungry.', 'I could eat.'], { state: 'hungry' });
  S('remark_state', ['I am tired.', 'I want to sit down.'], { state: 'tired' });
  S('remark_state', ['I feel well today.', 'It is a good day.'], { state: 'glad' });
  S('remark_state', ['I am a little low.', 'It is not my best day.'], { state: 'low' });
  S('remark_state', ['I am not well.', 'I have a fever.'], { state: 'ill' });
  S('ask_how', ['How are you?', 'How are you keeping?', 'Are you well?', 'How is it with you?']);
  S('ask_news', ['Any news?', 'What is being said?', 'Has anything happened?', 'What have I missed?']);
  S('no_news', ['Nothing.', 'No. Nothing.', 'Not that I have heard.', 'It has been quiet.', 'Nothing new.']);
  S('share_news', ['{news}.', 'You will not have heard. {news}.', 'There is this. {news}.']);
  S('share_news', ['I saw this. {news}.', '{news}. I was there.'], { how: 'saw' });
  S('share_news', ['I am told {news}.', 'They say {news}.'], { how: 'told' });
  S('share_news', ['I overheard this. {news}.'], { how: 'overheard' });
  S('share_news', ['I am not sure of it. {news}.', 'Possibly. {news}.'], { conf: 'low' });
  S('react_shock', ['No.', 'That is bad.', 'I did not expect that.']);
  S('react_amused', ['Ha.', 'That is quite funny.', 'I should not laugh.']);
  S('react_sympathy', ['Poor soul.', 'That is hard.', 'I am sorry to hear it.']);
  S('react_doubt', ['Are you sure?', 'I doubt that.', 'Who says so?']);
  S('react_delight', ['Good.', 'I am glad.', 'That is good to hear.', 'Well. Good.', 'That was kind.']);
  S('ask_day', ['How was your day?', 'What did you do today?', 'What have you been at?', 'Busy day?']);
  S('nothing_much', ['Not much.', 'Very little.', 'The usual.', 'Nothing to speak of.']);
  S('empathise', ['I am sorry.', 'That is hard.', 'That is a bad day.', 'I know.']);
  S('acknowledge', ['Good.', 'Well done.', 'That is a fair day.']);
  S('agree_opinion', ['I think so too.', 'Yes. The same.', 'That is how I find them.']);
  S('ask_opinion', ['What do you make of {about}?', 'How do you find {about}?', 'Do you know {about}?']);
  S('ask_family', ['How is {about}?', 'Is {about} well?', 'How is {about} keeping?']);
  for (const [st, ls] of [['fine', ['{about} is well.', '{about} is fine.']], ['hungry', ['{about} is hungry.']], ['tired', ['{about} is tired.', '{about} is worn out.']], ['glad', ['{about} is in good spirits.']], ['low', ['{about} is low.', '{about} has been quiet.']], ['ill', ['{about} is ill.', '{about} has a fever.']]] as any) S('answer_family', ls, { state: st });
  for (const [st, ls] of [['fine', ['Well enough.', 'I am well.', 'Fine.']], ['hungry', ['Hungry.', 'I have not eaten.']], ['tired', ['Tired.', 'I am worn out.']], ['glad', ['Well. Very well.', 'It is a good day.']], ['low', ['Not at my best.', 'A little low.']], ['ill', ['Not well.', 'I have a fever.']]] as any) S('answer_how', ls, { state: st });
  // the day, told plainly
  const L = (k: string, ls: string[]) => S('life:' + k, ls);
  L('slept', ['I slept well.', 'I had a full night.']);
  L('slept_rough', ['I slept on the ground.', 'I slept outside again.', 'I had no bed last night.']);
  L('no_privy', ['I could not find a privy.', 'There was no privy free.']);
  L('went_hungry', ['I have not eaten today.', 'I went without a meal.']);
  L('starving', ['I have not eaten in two days.']);
  L('tired', ['I am worn out.', 'I have been on my feet all day.']);
  L('ate', ['I had a proper meal.', 'I ate well today.']);
  L('planted', ['I planted {things}.', 'I put in {things} today.', '{things}, in the ground.']);
  L('harvested', ['I harvested {things}.', 'I brought in {things}.', '{things}, out of the ground.']);
  L('bought', ['I bought {things}.', 'I got {things} at the market.']);
  L('sold', ['I sold {things}.', 'I took {things} to the stall.']);
  L('baked', ['I baked {things}.', '{things}, out of the oven.']);
  L('new_in_stock', ['The {shop} has {item} now.', 'There is {item} at the {shop}.']);
  L('out_of_stock', ['The {shop} is out of {item}.', 'There was no {item} to be had.']);
  L('could_not_afford', ['I could not afford {item}.', 'I had not the money for {item}.']);
  L('price_up', ['{item} has gone up.', '{item} costs more at the {shop} now.']);
  L('price_down', ['{item} has come down.', '{item} is cheaper at the {shop} now.']);
  L('worked_with', ['I worked beside {about} today.', '{about} and I did the same rows.']);
  L('ate_with', ['I ate with {about}.', '{about} and I shared a table.']);
  L('found', ['I found {item}.', 'I picked up {item} today.']);
  L('ill', ['I am not well.', 'I have a fever.']);
  L('recovered', ['I am better.', 'The fever has gone.']);
}
