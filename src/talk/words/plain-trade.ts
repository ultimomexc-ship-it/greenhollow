/* Words: the plain voice, the stall and the price of things, shop talk and calls. Lines only (lx, LXP, kidl, LXLP); the acts that say them are in the files that define ACTS. */
/* ---- at the stall (plain pack): customer = c, keeper = k ---- */
lx('shop_greet', 'plain', 'Morning.', { band: 'morning' });
lx('shop_greet', 'plain', 'Afternoon.', { band: 'day' });
lx('shop_greet', 'plain', 'Evening.', { band: 'evening' });
lx('shop_greet', 'plain', 'Hello, {li}.');
lx('shop_greet', 'plain', '{li}. Busy today?', { rel: 'friend' });
lx('shop_greet_back', 'plain', 'Morning. What can I get you?', { band: 'morning' });
lx('shop_greet_back', 'plain', "Hello. What'll it be?");
lx('shop_greet_back', 'plain', 'Good day. Looking for something?');
lx('shop_greet_back', 'plain', '{li}! The usual?', { rel: 'friend' });
lx('ask_item', 'plain', "I'll take {things}, please.");
lx('ask_item', 'plain', '{things}, please.');
lx('ask_item', 'plain', 'Could I have {things}?');
lx('ask_item', 'plain', 'Let me have {things}.');
lx('quote_price', 'plain', "That's {money}.");
lx('quote_price', 'plain', '{money} for the lot.');
lx('quote_price', 'plain', 'That comes to {money}.');
lx('quote_price', 'plain', '{money}, and cheap at the price.');
lx('pay_ok', 'plain', 'Here you are.');
lx('pay_ok', 'plain', 'There. Count it.');
lx('pay_ok', 'plain', 'Right, {money}.');
lx('thank_shop', 'plain', 'Thank you.');
lx('thank_shop', 'plain', 'Much obliged.');
lx('thank_shop', 'plain', 'There you go. Thanks.');
lx('thank_shop', 'plain', 'Pleasure doing business.');
lx('cant_afford', 'plain', "That's more than I've got. I'll leave it.");
lx('cant_afford', 'plain', "I'm short today, sorry.");
lx('cant_afford', 'plain', "Ah. I haven't got that much.");
lx('make_do', 'plain', 'Come back when you have it.');
lx('make_do', 'plain', "No hurry. It'll keep.");
lx('make_do', 'plain', 'Take fewer, then.');
lx('no_stock', 'plain', "Sorry, I'm out of {item} just now.");
lx('no_stock', 'plain', "None left, I'm afraid.");
lx('no_stock', 'plain', 'The {item} sold out this morning.');
lx('shrug_off', 'plain', 'Next time, then.');
lx('shrug_off', 'plain', 'Never mind.');
lx('shrug_off', 'plain', "I'll try again tomorrow.");
lx('offer_goods', 'plain', "I've {things} to sell.");
lx('offer_goods', 'plain', 'Would you take {things}?');
lx('offer_goods', 'plain', 'Brought you {things}.');
lx('bid_price', 'plain', 'I can give you {money} for them.');
lx('bid_price', 'plain', "{money}, and that's fair.");
lx('bid_price', 'plain', "I'll say {money}.");
lx('accept_deal', 'plain', 'Done.');
lx('accept_deal', 'plain', "That'll do.");
lx('accept_deal', 'plain', 'Fine.');
lx('no_demand', 'plain', "I've plenty of those already, thanks.");
lx('no_demand', 'plain', 'Not today. The stall is full of {item}.');
lx('no_demand', 'plain', "I can't pay for any more today.");
lx('new_stock_remark', 'plain', "We've {item} in this week, if you're interested.");
lx('new_stock_remark', 'plain', 'New in: {item}.');
lx('farewell_shop', 'plain', 'Good day.');
lx('farewell_shop', 'plain', 'See you.');
lx('farewell_shop', 'plain', 'Right. Back to it.');
lx('ask_price', 'plain', 'What is the going price of {item}?');
lx('ask_price', 'plain', 'Seen the price of {item} lately?');
lx('ask_price', 'plain', 'Do you know the price of {item} at the moment?');
lx('tell_price', 'plain', 'I paid {money} each last time.');
lx('tell_price', 'plain', 'About {money}, when I looked.');
lx('tell_price', 'plain', '{money} each. Not cheap, not dear.');
lx('react_price', 'plain', 'Hm. Good to know.');
lx('react_price', 'plain', "That's more than I thought.");
lx('react_price', 'plain', 'Fair enough. Thanks.');
lx('react_price', 'plain', "I'll see if it's cheaper elsewhere.");
/* ---- calls from the stall ---- */
lx('keeper_call', 'plain', 'New in this week: {item}.', { call: 'new' });
lx('keeper_call', 'plain', 'Come and see the {item}. Just in.', { call: 'new' });
lx('keeper_call', 'plain', "We've {item} now. First of the season.", { call: 'new' });
lx('keeper_call', 'plain', 'Cheap today: {item}. {money} each.', { call: 'cheap' });
lx('keeper_call', 'plain', 'Cheap {item} today, {money} each.', { call: 'cheap' });
lx('keeper_call', 'plain', 'Fresh {item}, {money} each.');
lx('keeper_call', 'plain', 'Get your {item} here.');
lx('keeper_call', 'plain', '{item}, {money}. Come and look.');
lx('keeper_call', 'plain', 'Anyone need {item}?');
lx('call_reply', 'plain', 'Maybe later.');
lx('call_reply', 'plain', 'Not today, thanks.');
lx('call_reply', 'plain', "I'll be back.");
lx('call_reply', 'plain', "Not now, I'm busy.");
lx('shrug_off', 'plain', 'Hm. Well.');
lx('shrug_off', 'plain', 'We all have days.');
LXP('ask_price', [
  'What would I pay for {item} now?',
  'Do you know the going rate for {item}?',
  'What are you seeing for {item}?',
  'Is {item} dear at the moment?',
  'Heard what {item} fetch?'
]);
LXP('tell_price', [
  '{money}, last I looked.',
  'About {money} each, I think.',
  'It was {money} the other day.',
  "{money}. It's fair.",
  '{money} and not a coin less.'
]);
LXP('react_price', ["That's about what I expected.", 'Dearer than last time.', 'Cheaper than I feared.', "Fair enough. I'll think on it."]);
LXP('shop_greet', ['Hello there.', 'Hi. Got a minute?', 'Afternoon. Anything good today?', 'Hello. Having a quiet day?', 'Hello. Is it a busy one?']);
LXP('shop_greet_back', [
  'Hello. What can I do for you?',
  'Good to see you. What are we after?',
  'Hello. Take your time.',
  "Hello there. What'll it be?"
]);
