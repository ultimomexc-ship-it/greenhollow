/* Words: the island voice, the stall and the price of things, shop talk and calls. Lines only (lxi, LXI, kidi, LXLI); the acts that say them are in the files that define ACTS. The one-sentence LXI entries are the short plain lines the voice rule leans on (keep them one sentence). */
/* the stall */
lxi('shop_greet', 'Good morning.', { band: 'morning' });
lxi('shop_greet', 'Hello.');
lxi('shop_greet', 'Evening.', { band: 'evening' });
lxi('shop_greet', '{li}. Busy?', { rel: 'friend' });
lxi('shop_greet_back', 'Hello. What do you need?');
lxi('shop_greet_back', 'Good morning. I have what I have.', { band: 'morning' });
lxi('shop_greet_back', '{li}. The usual?', { rel: 'friend' });
lxi('ask_item', '{things}, please.');
lxi('ask_item', 'I would like {things}.');
lxi('ask_item', 'I am here for {things}. I thought about it on the way.');
lxi('quote_price', '{money}.');
lxi('quote_price', 'That will be {money}.');
lxi('quote_price', '{money}. I did not set the price. I only repeat it.');
lxi('pay_ok', 'Here.');
lxi('pay_ok', 'There. Count it.');
lxi('thank_shop', 'Thank you.');
lxi('thank_shop', 'Good. Thank you.');
lxi('thank_shop', 'That is all of it. Thank you.');
lxi('cant_afford', 'I have less than I thought. I will leave it.');
lxi('cant_afford', 'I am short. I counted on the way and again just now.');
lxi('make_do', 'It will be here tomorrow. Probably.');
lxi('make_do', 'Come back when you have it. I will not move.');
lxi('no_stock', 'None left. They went quickly.');
lxi('no_stock', 'I have no {item}. I had some this morning. I cannot account for it.');
lxi('shrug_off', 'That is all right.');
lxi('shrug_off', 'Tomorrow, then.');
lxi('offer_goods', 'I have {things}.');
lxi('offer_goods', 'I brought {things}. I carried them carefully.');
lxi('bid_price', 'I can do {money}.');
lxi('bid_price', '{money}. That is as high as I can honestly go.');
lxi('accept_deal', 'Yes.');
lxi('accept_deal', 'That will do.');
lxi('no_demand', 'I have enough. Thank you.');
lxi('no_demand', 'The stall is full of {item}. I could not take another one.');
lxi('new_stock_remark', 'We have {item} now.');
lxi('new_stock_remark', 'New this week: {item}. Nobody ordered that. It arrived.');
lxi('farewell_shop', 'Goodbye.');
lxi('farewell_shop', 'See you.');
lxi('keeper_call', 'New: {item}.', { call: 'new' });
lxi('keeper_call', 'We have {item} now. This is the first I have seen of that.', { call: 'new' });
lxi('keeper_call', '{item}, {money}. It is a good price. I checked.', { call: 'cheap' });
lxi('keeper_call', 'Cheap {item} today. {money}.', { call: 'cheap' });
lxi('keeper_call', '{item}. {money}. That is all I have to say about it.');
lxi('keeper_call', 'Fresh {item}. As fresh as anything here.');
lxi('keeper_call', 'If anyone needs {item}, I have some.');
lxi('call_reply', 'Maybe later.');
lxi('call_reply', 'Not now. Thank you.');
lxi('call_reply', 'I will think about it. I will probably come back.');
lxi('ask_price', 'Do you know the price of {item} today?');
lxi('ask_price', 'What is the price of {item}? I would like an exact figure.');
lxi('tell_price', '{money} each. I wrote it down.');
lxi('tell_price', 'About {money}. I paid it and did not enjoy it.');
lxi('react_price', 'Good to know.');
lxi('react_price', 'That is more than I thought.');
lxi('react_price', 'Fair. Thank you.');
lxi('shrug_off', 'Yes. Well. It is something.');
lxi('shrug_off', 'Everyone has days. Some have more of them.');
LXI('ask_price', [
  'What is the price of {item} these days? I will need a number, not a mood.',
  'Do you know the price of {item}? I do not, and I dislike not.',
  'What is the going price of {item}? I have a figure in mind and no faith in it.',
  'Is {item} dear just now? Give me a figure and I will give you my opinion of it.',
  'How much for {item}, lately? I am collecting numbers.'
]);
LXI('tell_price', [
  '{money}. I counted it twice, then a third time, for company.',
  'About {money}. It was that when I stopped looking.',
  '{money} each. I am reporting, not recommending.',
  '{money}. I did not argue. I do not know how.',
  '{money}. The number has been the same for a while, which is a comfort.'
]);
LXI('react_price', [
  'That is about what I expected. I am disappointed to be right.',
  'Dearer. I will complain to the air and then pay it.',
  'Cheaper than I feared. I will be suspicious of it for a day.',
  'Fair. Fair is the worst price. It leaves nothing to say.'
]);
LXI('shop_greet', [
  'Hello. I come with a short list and a long hope.',
  'Good day. I have an errand and a purse.',
  'Hello. I will be quick, which is what everyone says.',
  'Hello. I am here for a thing.',
  'Hello. I was passing and decided to be a customer.'
]);
LXI('shop_greet_back', [
  'Hello. Tell me what you want and I will tell you what I have.',
  'Good day. The stall is open and I am at it.',
  'Hello. I am here, which is the main thing a stall needs.',
  'Hello. What is it today? I will not guess.'
]);
