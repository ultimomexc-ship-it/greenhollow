# Playtest: meddle (6 days, seed 41, voice island)

Bot villager: **Tipping**

## Verdict

- PASS  conversations happen (>=20/day)  (234 in 6 days)
- PASS  no engine errors
- WARN  no text slips  (empty x5)
- PASS  variety (unique lines >= 30%)  (0.34)
- PASS  people cried out
- PASS  somebody raised a deed with the bot  (raise_deed 6)
- PASS  news about the deeds travelled  ([["home_destroyed",11],["home_destroyed",10],["caught_on_privy",10],["wall_removed",3],["furniture_removed",2],["person_pushed",2]])
- PASS  an unseen deed was blamed on somebody  ([{"ev":"wall_removed","anon":true,"blamed":{"Corvus":1,"you":1},"knew":3},{"ev":"furniture_removed","anon":true,"blamed":{"Corvus":1},"knew":2},{"ev":"person_pushed","anon":true,"blamed":{"Rufus":1},"knew":2}])
- PASS  a reputation formed  ({"vandal":8,"meddler":6})

## Numbers

- conversations and barks: 234; spoken lines: 2467; unique: 831 (34%)
- conversations with nothing but greeting and goodbye: 0
- runs of three lines by one speaker: 5 e.g. Quinta: Hello. I see you have arrived, as one does. / Tertia: Good. Hello. That is out of the way. / Quinta: And Livia? How is Livia getting on? / Tertia: Livia is well. Busy. / Tertia: Unrelated, but it will be dark soon. I find I am prepared for that. / Tertia: On a different note, I have a soft spot for Secunda. I heard what Rufus thinks of Secunda.
- acts used: 90 of 144
- most used: greet 174, greet_back 174, pre_close 174, farewell 174, farewell_back 174, agree 97, share_news 62, ask_how 59, answer_how 59, joke 54, remark_time 46, remark_place 43, ask_family 41, answer_family 41
- never used: react_shock, empathise, no_view, no_view_g, deed_sorry, deed_defend, deed_shrug, deed_blame, deed_forgive, deed_cold, gift_loved, gift_disliked, gift_amends, gift_refuse, send_gift, deliver_yes, deliver_no, apologise, accept_apology, reject_apology, confront_jealous, jealous_explain, jealous_defiant, jealous_deny, ask_favour, favour_give, favour_promise, favour_no, favour_thanks, favour_hopeful, chase_favour, confide, secret_keep, secret_alarmed, flirt, flirt_back, flirt_rebuff, declare, declare_return, declare_gentle, ask_to_walk, walk_yes, walk_later, walk_no, propose, propose_yes, propose_later, propose_no, rep_own, tell_back, tell_back_reply, backchannel, no_demand, new_stock_remark

## Said too often

- x27: Paullus is at the lanes. I looked, on the way past. I do not know why.
- x22: Goodbye.
- x21: I see.
- x21: Do you know where Paullus is? I am not worried. I would like to know.
- x19: Hello.
- x18: Ha. That is exactly the right size for a joke.
- x18: Bye.
- x18: Yes. Goodbye.
- x16: Mm. Noted.
- x16: Ha. Good. I will repeat that to somebody who has not heard it.
- x15: And you.
- x15: Take care of the next hour. I will take care of this one.

## Text slips

- **empty** (5): "acts: bot menu"

## What the village thinks of the bot

Village word: {"vandal":8,"meddler":6}

| who | job | mood | thinks you | fondness | knows | secrets | open asks |
|---|---|---|---|---|---|---|---|
| Paullus | Farmer | 0 |  | -10 | 1 | 0 | 1 |
| Severa | Baker | 52 | vandal | -33 | 23 | 0 | 0 |
| Rufus | Farmer | 58 | meddler | -27 | 19 | 0 | 1 |
| Nero |  | 46 | vandal | -62 | 26 | 0 | 1 |
| Corvus | Farmer | 60 | vandal | 0 | 21 | 0 | 0 |
| Livia | Farmer | 60 | vandal | -16 | 22 | 0 | 1 |
| Quinta |  | 79 | vandal | -53 | 23 | 0 | 1 |
| Varro |  | 40 | vandal | -86 | 21 | 0 | 1 |
| Tertia |  | 74 | vandal | -55 | 24 | 0 | 0 |
| Secunda | Builder | 73 | meddler | 63 | 25 | 0 | 0 |
| Brutus |  | 41 | vandal | 55 | 1 | 0 | 0 |

## The bot's deeds: who knew, who was blamed

- home_destroyed: 11 know it; believed doer: {"Severa":2,"you":6,"Rufus":1,"Livia":1}
- home_destroyed: 10 know it; believed doer: {"Rufus":1,"Quinta":2,"you":5,"Secunda":1}
- caught_on_privy: 10 know it; believed doer: {"Tertia":1,"you":6,"Secunda":1,"Paullus":1}
- wall_removed (unseen): 3 know it; believed doer: {"Corvus":1,"you":1}
- furniture_removed (unseen): 2 know it; believed doer: {"Corvus":1}
- person_pushed (unseen): 2 know it; believed doer: {"Rufus":1}

## Days

### Day 1

Events so far: {"shutin":2,"home_destroyed":1}

Chronicle: Tipping Marcius has been shut in for an hour by a door block against his door. Somebody will have to move it. / Tertia Quinctia is organising a long walk at 16:06 with Severa, Quinta and Rufus. / Tipping Marcius was stuck for 3 hours. / Tertia's long walk went well: 2 friends came. / Paullus Fabius did not make it to the privy in time. / Secunda Marcia became the builder, giving up woodcutting.

Journal:  | Open threads | | | Paullus needs a bed — you said you would try | · Y1 d1 | | | Severa needs a bed — you said you would try | · Y1 d1 | | | | The news | | | Tipping got shut in by a door block (it happened to you) | · Y1 d1 | | | Paullus got shut in by a wall block (you saw it) | · Y1 d1 | | | | What people say about each other | | | Rufus on Severa: fond of them. I heard what Nero thinks of Severa. | · Y1 d1 | | | Rufus on Secunda: likes them | · Y1 d1 | | | Corvus on Paullus: likes them. We work side by side. | · Y1 d1 | | | | What you did | | | Paullus's house came down, and Tipping was there — 6 know it was you (2 blame Severa, 1 blame Rufus, 2 blame Livia) | · Y1 d1 | | | | What you know of people | | | Livia cannot abide berries | · Y1 d1 | | | Paullus cannot abide herbs | · Y1 d1 | | | Paullus is a farmer | · Y1 d1 | | | Severa is a baker | · Y1 d1 | | | Corvus is a farmer | · 

### Day 2

Events so far: {"home_destroyed":2,"shutin":2,"caught_on_privy":1,"dole":1}

Chronicle: Quinta Horatia turned sixteen and joined the workers. / Tipping tore down Horatius House. / Corvus was caught out when Tipping knocked the wall out. / The Day of the Open Privy: Corvus was found out when the wall came down. / The Day the House Came Down: Corvus's house was pulled down. / Quinta Horatia came of age at a party on the square.

Journal:  | Open threads | | | Paullus needs a bed — you said you would try | · Y1 d1 | | | Severa needs a bed — you said you would try | · Y1 d1 | | | | The news | | | Tipping got shut in by a door block (it happened to you) | · Y1 d1 | | | Paullus got shut in by a wall block (you saw it) | · Y1 d1 | | | | What people say about each other | | | Corvus on Quinta: fond of them. She made me laugh. | · Y1 d2 | | | Corvus on Quinta: fond of them. She made me laugh. | · Y1 d2 | | | Rufus on Severa: fond of them. I heard what Nero thinks of Severa. | · Y1 d1 | | | Rufus on Secunda: likes them | · Y1 d1 | | | Corvus on Paullus: likes them. We work side by side. | · Y1 d1 | | | | Prices | | | Varro says flowers costs about 5 denarii each | · Y1 d2 | | | | What you did | | | Tipping knocked the wall out while Corvus was on the privy — 8 know it was you (1 blame Tertia) | · Y1 d2 | | | Tipping pulled Corvu

### Day 3

Events so far: {"home_destroyed":2,"shutin":2,"dole":2,"caught_on_privy":1,"wall_removed":1,"furniture_removed":1,"person_pushed":1,"charity":1,"smelly":1}

Chronicle: Food is running short, so a new field has been marked out. / Tertia Quinctia is organising an evening of songs at 16:27 with Quinta and Severa. / Secunda Marcia is organising a picnic at 16:14 with Severa and Rufus. / Tertia Quinctia's evening of songs fell through: Tertia never turned up. / Secunda's picnic went well: 1 friend came. / Quinta Horatia gave up stonecutting and took up foraging to help put food on the table.

Journal:  | Open threads | | | Quinta needs a bed — you said you would try | · Y1 d3 | | | Paullus needs a bed — you said you would try | · Y1 d1 | | | Severa needs a bed — you said you would try | · Y1 d1 | | | | The news | | | Severa gave to Varro when Varro had nothing (overheard) | · Y1 d3 | | | Livia smells like a midden (it happened to you) | · Y1 d3 | | | Tipping got shut in by a door block (it happened to you) | · Y1 d1 | | | Paullus got shut in by a wall block (you saw it) | · Y1 d1 | | | | What people say about each other | | | Corvus on Brutus: likes them. I heard what Secunda thinks of Brutus. | · Y1 d3 | | | Quinta on Livia: fond of them. She was glad for me. | · Y1 d3 | | | Severa on Secunda: likes them. She was glad for me. | · Y1 d3 | | | Corvus on Quinta: fond of them. She made me laugh. | · Y1 d2 | | | Corvus on Quinta: fond of them. She made me laugh. | · Y1 d2 | | | Rufus on S

### Day 4

Events so far: {"smelly":10,"home_destroyed":2,"shutin":2,"dole":2,"charity":2,"caught_on_privy":1,"wall_removed":1,"furniture_removed":1,"person_pushed":1,"gift":1}

Chronicle: Tertia Quinctia's evening of songs fell through: Tertia never turned up. / Secunda's picnic went well: 1 friend came. / Quinta Horatia gave up stonecutting and took up foraging to help put food on the table. / A grain ship put in, and the council bought 18 sacks for the larder. / Severa Fabia is organising a dance on the square at 17:39 with Rufus, Quinta and Secunda. / Severa's dance went well: 1 friend came.

Journal:  | Open threads | | | Livia needs a bed — you said you would try | · Y2 d1 | | | Quinta needs a bed — you said you would try | · Y1 d3 | | | | The news | | | Severa gave Rufus a gift (you saw it) | · Y2 d1 | | | Severa gave to Varro when Varro had nothing (you saw it) | · Y2 d1 | | | Tertia smells like a midden (overheard) | · Y2 d1 | | | Nero smells like a midden (Tertia told you) | · Y2 d1 | | | Varro smells like a midden (overheard) | · Y2 d1 | | | Rufus smells like a midden (you saw it) | · Y2 d1 | | | Severa gave to Varro when Varro had nothing (overheard) | · Y1 d3 | | | Livia smells like a midden (it happened to you) | · Y1 d3 | | | | What people say about each other | | | Corvus on Brutus: likes them. I heard what Secunda thinks of Brutus. | · Y2 d1 | | | Livia on Brutus: likes them | · Y2 d1 | | | Nero on Severa: fond of them. Severa gave to Varro when Varro had nothing. | · Y2 

### Day 5

Events so far: {"smelly":19,"dole":4,"gift":4,"home_destroyed":2,"shutin":2,"charity":2,"caught_on_privy":1,"wall_removed":1,"furniture_removed":1,"person_pushed":1}

Chronicle: Severa's dance went well: 1 friend came. / Rufus Fabius turns sixteen. There will be a party on the square, day 2 of year 2. / Rufus Fabius turned sixteen and joined the workers. / Quinta Horatia is organising an evening of songs at 16:11 with Tertia, Secunda and Rufus. / Rufus Fabius came of age at a party on the square. / Quinta's evening of songs went well: 3 friends came.

Journal:  | Open threads | | | Livia needs a bed — you said you would try | · Y2 d1 | | | Quinta needs a bed — you said you would try | · Y1 d3 | | | | The news | | | Livia smells like a midden (overheard) | · Y2 d2 | | | Nero smells like a midden (Quinta told you) | · Y2 d2 | | | Rufus gave Corvus a gift (you saw it) | · Y2 d2 | | | Corvus smells like a midden (Rufus told you) | · Y2 d2 | | | Varro smells like a midden (you saw it) | · Y2 d2 | | | Rufus smells like a midden (overheard) | · Y2 d2 | | | Brutus smells like a midden (you saw it) | · Y2 d2 | | | Quinta smells like a midden (overheard) | · Y2 d2 | | | | What people say about each other | | | Corvus on Brutus: likes them. I heard what Secunda thinks of Brutus. | · Y2 d1 | | | Livia on Brutus: likes them | · Y2 d1 | | | Nero on Severa: fond of them. Severa gave to Varro when Varro had nothing. | · Y2 d1 | | | Corvus on Brutus: likes the

### Day 6

Events so far: {"smelly":28,"gift":5,"dole":4,"shutin":3,"home_destroyed":2,"charity":2,"caught_on_privy":1,"wall_removed":1,"furniture_removed":1,"person_pushed":1}

Chronicle: Quinta's evening of songs went well: 3 friends came. / Secunda Marcia is organising a picnic at 11:11 with Severa and Quinta. / Paullus Fabius did not make it to the privy in time. / Rufus Fabius is organising a dance on the square at 18:37 with Severa, Secunda and Quinta. / Rufus's dance went well: 1 friend came. / Tipping Marcius has been shut in for an hour by a wall block against his door. Somebody will have to move it.

Journal:  | Open threads | | | Paullus needs fish — you said you would try | · Y2 d3 | | | Quinta needs a bed — you said you would try | · Y2 d3 | | | Nero needs a bed — you said you would try | · Y2 d3 | | | Rufus needs a bed — you said you would try | · Y2 d3 | | | Varro needs a bed — you said you would try | · Y2 d3 | | | Livia needs a bed — you said you would try | · Y2 d1 | | | | The news | | | Paullus smells like a midden (it happened to you) | · Y2 d3 | | | Tipping got shut in by a wall block (it happened to you) | · Y2 d3 | | | Nero smells like a midden (Severa told you, who had it from Rufus (who saw it)) | · Y2 d3 | | | Brutus smells like a midden (overheard) | · Y2 d3 | | | Tertia smells like a midden (overheard) | · Y2 d3 | | | Tertia smells like a midden (Varro told you) | · Y2 d3 | | | Rufus smells like a midden (you saw it) | · Y2 d3 | | | Tertia smells like a midden (Varro told yo

## The bot's own talks

**d0 11:30  with Paullus**

> Hello. Come to think of it, I was hoping.
> **Tipping:** Not much happens at the fields. I find I like that.
> That is right. I am glad somebody said it.
> **Tipping:** And Rufus? How is Rufus getting on?
> Rufus is well. Busy.
> **Tipping:** You should know Secunda. She is my spouse. That is all I will say.
> I think so too. I had hoped it was only me. / How is the day treating you? I mean honestly.
> **Tipping:** Fine. I was going to say I was well and it is true, which surprised me.
> My Nero is 7. It is going well. I am rarely asked. / I will let the conversation end here. It has had a good run.

**d0 11:30  with Corvus**

> Hello. I have been standing here on purpose.
> **Tipping:** I have done the farmer work long enough to stop asking why.
> I had not put it that way. But yes. / And Secunda? How is Secunda getting on?
> **Tipping:** Secunda is well. Busy.
> I have a soft spot for Paullus. We work side by side.
> **Tipping:** I think so too. I had hoped it was only me.
> My neighbour talks to his turnips. They have never disagreed with him. I envy that.
> **Tipping:** Ha. That is exactly the right size for a joke.
> What do you make of Quinta? / Well. That is that, for now.

**d0 11:30  DEED** {"kind":"house","home":"Fabius House","who":"Paullus","t":690}

**d0 12:00  with Severa**

> Hello. I have been looking at our walls more closely lately. / I saw you. You pulled Paullus's house down. I did not say anything at the time.
> **Tipping:** No. You are thinking of somebody else.
> You are not a good liar. It is not an insult. / I have no bed. I have a patch of ground that I have grown fond of. A bed would be better.
> **Tipping:** Give me a few days. I will keep it in mind.
> Thank you. I will be here. Or nearby. / Well. The day will not do itself.
> **Tipping:** Until next time. I will be somewhere.
> 

**d0 12:00  with Rufus**

> Ah. Hello. I had a feeling. / You pulled Paullus's house down. I was standing right there.
> **Tipping:** I would look at them. I am not saying more than that. I am saying that.
> I do not believe you. I would like to.
> **Tipping:** How is Paullus? I realised I had not asked.
> Paullus is well. Busy. / Somebody told me his wall was holding up the ceiling. It was the other way round. He was very calm about it.
> **Tipping:** Ha. That is exactly the right size for a joke.
> I have no bed. I have a patch of ground that I have grown fond of. A bed would be better. / Right. The afternoon will want me soon.
> **Tipping:** See you. I say it as a matter of course.
> 

**d0 12:00  with Paullus**

> Hello. I am pleased and slightly startled. / It was you. You pulled my house down. I would like an explanation, if one exists.
> **Tipping:** It was not me. I have noticed them nearby, more than usual.
> Ah. Then it was someone who looks like you. / More or less, the afternoon is the same length as yesterday's, and feels longer. / I have a few things to be near. I will go and be near them.
> **Tipping:** Goodbye, Paullus. It was a good length.
> 

**d0 15:00  with Paullus**

> Hello to you, in return. / Would you build me a bed? I would use it for the usual things.
> **Tipping:** I will see what can be done. I make no claims.
> Thank you. I will be here. Or nearby.
> **Tipping:** I owe you an apology. I am delivering it as promptly as I could manage.
> Thank you. I accept it. I am relieved to have somewhere to put it.
> **Tipping:** The farmer work went quietly today. I do not entirely trust that.
> It is. / I should go. I will pretend I have a reason.
> **Tipping:** Look after yourself. Somebody has to, and I am here.
> 

**d0 15:00  with Rufus**

> Hello.
> **Tipping:** Do you know where Severa is? I am not worried. I would like to know.
> Severa is at the lanes. I looked, on the way past. I do not know why. / What do you do with your days, Tipping? I am only asking out of interest.
> **Tipping:** I am a farmer. I have done it since I got here. Before that I was somebody else.
> How are you getting on?
> **Tipping:** Fine. There is a small noise in my left knee, which is the news.
> I have a soft spot for Secunda. / I should go. Something is probably waiting for me.
> **Tipping:** Goodbye, Rufus. It was a good length.
> 

**d0 15:00  with Quinta**

> Hello. I have been looking at our walls more closely lately. / I saw you. You pulled Paullus's house down. I did not say anything at the time.
> **Tipping:** It was not me. I have noticed them nearby, more than usual.
> I do not believe you. I would like to.
> **Tipping:** Do you know where Severa is? I am not worried. I would like to know.
> Severa is at the lanes. I looked, on the way past. I do not know why. / That is the end of what I had.
> **Tipping:** Goodbye, Quinta.
> 

**d0 18:00  with Corvus**

> Evening. It has been an evening for a while now. / People say you pulled Paullus's house down. People say many things here.
> **Tipping:** I am sorry. I do not know what came over me.
> All right. I have had worse mornings. Not many.
> **Tipping:** The farmer work is the one thing that has not changed since I arrived, and I am glad of it.
> You are right. I have been thinking so since Tuesday. / I am glad you ended up here. I mean it quite exactly.
> **Tipping:** That is kind. I will think about it later.
> And you? How are things on your side of the island?
> **Tipping:** Not bad. I say that and wait for the day to hear me.
> It is said you knock things down. 6 people have said it to me. I counted. / I should get on. The day has noticed me.
> **Tipping:** Goodbye, Corvus.
> 

**d0 18:00  with Paullus**

> Yes. Hello. It is that time.
> **Tipping:** My Brutus is 3. It is going well. I am rarely asked.
> That is wonderful. They are quite something at that age.
> **Tipping:** And Nero? How is Nero getting on?
> Nero is well. Busy.
> **Tipping:** What do you like? I am not asking for a reason. I am collecting.
> I do not like herbs. It is not a strong feeling. It is a stable one. / Have you heard anything? About anyone. About anything.
> **Tipping:** No. I looked, though.
> I see. / I will leave you to it. You were doing something.
> **Tipping:** Be well. I mean it in the ordinary way.
> 

**d0 18:00  with Varro**

> Hello. I was doing something important. / I saw you. You pulled Paullus's house down. I did not say anything at the time.
> **Tipping:** I would look at them. I am not saying more than that. I am saying that.
> Ah. Then it was someone who looks like you. / Any news?
> **Tipping:** I saw it myself, so I can tell you. Paullus got shut in by a wall block.
> Well. That is a thing that happened.
> **Tipping:** And Livia? How is Livia getting on?
> Livia is well. Busy.
> **Tipping:** Brutus is 3 now. I did not see it happen. I looked away once.
> You must be proud. I would be. Is that the word? Yes. / I have to go. There is a thing I am in the middle of.
> **Tipping:** Goodbye, Varro. It was a good length.
> 

**d0 20:00  with Tertia**

> Hello. I have been looking at our walls more closely lately. / You pulled Paullus's house down. I was standing right there.
> **Tipping:** It was not me. I was somewhere else. I am nearly sure.
> I do not believe you. I would like to.
> **Tipping:** Brutus is 3 now. I did not see it happen. I looked away once.
> You must be proud. I would be. Is that the word? Yes.
> **Tipping:** I have a soft spot for Livia. We work side by side.
> I think so too. I had hoped it was only me.
> **Tipping:** How is Livia? I realised I had not asked.
> Livia is well. Busy. / I will let you get on. I have the feeling you have somewhere to be, and so do I.
> **Tipping:** Until next time. I will be somewhere.
> 

**d0 20:00  with Livia**

> Hello. I was about to say that. / You pulled Paullus's house down. I was standing right there.
> **Tipping:** I am sorry. I do not know what came over me.
> Very well. We will not mention it again. I will, but not today.
> **Tipping:** I like iron very much. It is the sort of thing a person might remember.
> Noted. I will remember that. I remember things.
> **Tipping:** What do you like? I am not asking for a reason. I am collecting.
> I do not like berries. It is not a strong feeling. It is a stable one. / I will leave you to it. You were doing something.
> **Tipping:** Take care of the next hour. I will take care of this one.
> 

**d0 20:00  with Rufus**

> Ah, Tipping. The island does arrange things.
> **Tipping:** How is Severa? I realised I had not asked.
> Severa is in a good mood. I have decided not to question it. / I feel unreasonably good today. I have decided not to look into it.
> **Tipping:** Yes. I was going to say that.
> You should know Severa. I heard what Nero thinks of Severa. That is all I will say.
> **Tipping:** I think so too. I had hoped it was only me.
> Somebody told me his wall was holding up the ceiling. It was the other way round. He was very calm about it. / Well. That is that, for now.
> **Tipping:** Take care of the next hour. I will take care of this one.
> 

**d1 09:00  with Corvus**

> Morning. I was thinking about nothing in particular.
> **Tipping:** Do you get on with Nero? Be honest. I am only curious.
> I am fond of Quinta. She made me laugh. I do not say that about many people. / It is said you knock things down. 5 people have said it to me. I counted.
> **Tipping:** I did not. But I understand why it looks that way.
> How are you holding up?
> **Tipping:** Steady. That is the word I have settled on.
> What do you like? I am not asking for a reason. I am collecting.
> **Tipping:** 
> The farmer work is the one thing that has not changed since I arrived, and I am glad of it. / I have a few things to be near. I will go and be near them.

**d1 09:00  with Tertia**

> Ah. You. The one with the walls.
> **Tipping:** I have a soft spot for Quinta. I heard what Corvus thinks of Quinta.
> I think so too. I had hoped it was only me. / Time here is quiet. I do not think it is slower. I think it is just not in a hurry.
> **Tipping:** Yes. I think so.
> Do you get on with Brutus? Be honest. I am only curious.
> **Tipping:** Brutus is all right.
> Ah. Yes. / That is the end of what I had.
> **Tipping:** Be well. I mean it in the ordinary way.
> 

**d1 10:00  DEED** {"kind":"privy","home":"Horatius House","who":"Corvus","t":2040}

**d1 12:00  with Corvus**

> Hello. I have been standing here on purpose. / It was you. You pulled my house down. I would like an explanation, if one exists.
> **Tipping:** I would look at them. I am not saying more than that. I am saying that.
> Ah. Then it was someone who looks like you. / Do you know where Paullus is? I am not worried. I would like to know.
> **Tipping:** Paullus is at the lanes. I looked, on the way past. I do not know why.
> I have no bed. I have a patch of ground that I have grown fond of. A bed would be better.
> **Tipping:** I cannot. I am sorry. I do mean it.
> How are you? I would like to know the real number. / I should get on. The day has noticed me.
> **Tipping:** Good day to you. It is, so far.
> 

**d1 12:00  with Varro**

> Hello. I was doing something important. / You pulled Corvus's house down. I was standing right there.
> **Tipping:** No. You are thinking of somebody else.
> I do not believe you. I would like to.
> **Tipping:** I wonder why the sky is the shape it is. It must have been decided by somebody.
> I could not say. I have a feeling it is better not to.
> **Tipping:** Do you know what flowers cost today?
> About 5 denarii. I paid it and did not enjoy it.
> **Tipping:** I have a soft spot for Livia. We work side by side.
> You are not the only one. / I have to go. There is a thing I am in the middle of.
> **Tipping:** Goodbye, Varro.
> 

**d1 12:00  with Tertia**

> Ah. Hello. I had a feeling. / I saw you. You pulled Corvus's house down. I did not say anything at the time.
> **Tipping:** I would look at them. I am not saying more than that. I am saying that.
> Ah. Then it was someone who looks like you.
> **Tipping:** My neighbour talks to his turnips. They have never disagreed with him. I envy that.
> Ha. Good. I will repeat that to somebody who has not heard it. / I will leave you to it. You were doing something.
> **Tipping:** See you. Same place, same time, roughly.
> 

**d1 15:00  with Tertia**

> Ah. You. The one with the walls. / I saw you. You knocked the wall out while Corvus was on the privy. I did not say anything at the time.
> **Tipping:** No. You are thinking of somebody else.
> You are not a good liar. It is not an insult. / Has anything happened? Anything at all. I will take a small one. / I should go. Something is probably waiting for me.
> **Tipping:** Take care, Tertia. The island is small but it has edges.
> 

**d1 15:00  with Corvus**

> Good. Hello. That is out of the way. / You knocked the wall out while I was on the privy. I have thought about little else.
> **Tipping:** I would look at them. I am not saying more than that. I am saying that.
> Ah. Then it was someone who looks like you.
> **Tipping:** I wonder why the sky is the shape it is. It must have been decided by somebody.
> I could not say. I have a feeling it is better not to. / Have you heard anything? About anyone. About anything.
> **Tipping:** Nothing. A gull stood on the beach for a long time and left.
> How have you been, since last time? Give me the short version.
> **Tipping:** Fine. I looked into it and there is nothing to report.
> Yes. Well. / I have to get back. I will not say to what.
> **Tipping:** Mind how you go. There is a lot of ground.
> 

**d1 15:00  with Severa**

> Yes. Hello. It is that time.
> **Tipping:** Do you know where Paullus is? I am not worried. I would like to know.
> I do not know where Paullus is. Nobody tells me anything on this island, and then I am surprised. / My neighbour talks to his turnips. They have never disagreed with him. I envy that.
> **Tipping:** Ha. That is exactly the right size for a joke.
> To be fair, I have done the baker work long enough to stop asking why.
> **Tipping:** I had not put it that way. But yes.
> That is something. / I will let you get on. I have the feeling you have somewhere to be, and so do I.
> **Tipping:** See you. Same place, same time, roughly.
> 

**d1 18:00  with Corvus**

> Evening. It has been an evening for a while now.
> **Tipping:** Do you get on with Livia? Be honest. I am only curious.
> Quinta is one of the good ones. She made me laugh. / It is 18:00. I checked.
> **Tipping:** Yes. I was going to say that.
> The farmer work went quietly today. I do not entirely trust that.
> **Tipping:** True. It does not make it simpler.
> I wonder why the sky is the shape it is. It must have been decided by somebody. / Right. The afternoon will want me soon.
> **Tipping:** All the best. I have no better phrase.
> 

**d1 18:00  with Quinta**

> Ah, Tipping. The island does arrange things. / You pulled Corvus's house down. I was standing right there.
> **Tipping:** I had a reason. It seemed to be a good one.
> No. I do not think I will forget that.
> **Tipping:** Do you know where Paullus is? I am not worried. I would like to know.
> Paullus is at the lanes. I looked, on the way past. I do not know why. / I have to get back. I will not say to what.
> **Tipping:** See you. I say it as a matter of course.
> 

**d1 18:00  with Secunda**

> There you are. I was thinking about you, in a general way. / You pulled Corvus's house down. I was standing right there.
> **Tipping:** I would look at them. I am not saying more than that. I am saying that.
> I do not believe you. I would like to. / It will be dark soon. I find I am prepared for that.
> **Tipping:** Agreed. That is a rare thing.
> I sometimes wonder what the sea does when nobody is looking. I assume the same thing. / Well. The day will not do itself.
> **Tipping:** Until next time. I will be somewhere.
> 

**d1 20:00  with Livia**

> Tipping. Yes. Hello. / You pulled Corvus's house down. I was standing right there.
> **Tipping:** It is a wall. There are others.
> No. I do not think I will forget that.
> **Tipping:** Brutus is 3 now. I did not see it happen. I looked away once.
> That is wonderful. They are quite something at that age.
> **Tipping:** What do you do with your days, Livia? I am only asking out of interest.
> I am a farmer. I have done it since I got here. Before that I was somebody else. / I should get on. The day has noticed me.
> **Tipping:** Take care of the next hour. I will take care of this one.
> 

**d1 20:00  with Severa**

> Hello. Come to think of it, I was hoping. / I was told you knocked the wall out while Corvus was on the privy. I would rather hear it from you.
> **Tipping:** I would look at them. I am not saying more than that. I am saying that.
> Ah. Then it was someone who looks like you. / I am still without a bed. I mention it only because it is true.
> **Tipping:** No. I have exactly enough, which is the problem.
> Mm. / That is the end of what I had.
> **Tipping:** Goodbye, Severa. It was a good length.
> 

**d1 20:00  with Secunda**

> Hello. I have moved my valuables. They are in the same place as before, but I am looking at them. / I saw you. You knocked the wall out while Corvus was on the privy. I did not say anything at the time.
> **Tipping:** I am sorry. It looked different from the other side.
> Very well. We will not mention it again. I will, but not today. / You are good to have around. I do not say that to many people.
> **Tipping:** That is kind. I will think about it later.
> Brutus is 3 now. I did not see it happen. I looked away once.
> **Tipping:** That is wonderful. They are quite something at that age.
> That is something. / Off I go. I will not look back, which is a lie.
> **Tipping:** I will see you at supper. I will be the one who is hungry.
> 

**d2 09:00  with Quinta**

> Hello. I have been looking at our walls more closely lately. / You knocked the wall out while Corvus was on the privy. I was standing right there.
> **Tipping:** I would look at them. I am not saying more than that. I am saying that.
> Ah. Then it was someone who looks like you.
> **Tipping:** What did you do today? In order, if you can.
> The seed stall has potato seeds now. I stood and looked at it for a while. / I should go. Something is probably waiting for me.
> **Tipping:** Mind how you go. There is a lot of ground.
> 

**d2 09:00  with Varro**

> Hello. I am small, but I am here. / I saw you. You knocked the wall out while Corvus was on the privy. I did not say anything at the time.
> **Tipping:** I would look at them. I am not saying more than that. I am saying that.
> Ah. Then it was someone who looks like you.
> **Tipping:** I have a soft spot for Quinta. I heard what Corvus thinks of Quinta.
> You are not the only one. / How is Brutus?
> **Tipping:** Brutus is well. Busy.
> I see. / Can I go now? I am asking nicely.
> **Tipping:** Good day to you. It is, so far.
> 

**d2 10:00  DEED** {"kind":"unseen","home":"Marcius House","who":"Secunda","t":3480}

**d2 10:00  DEED** {"kind":"bed"}

**d2 10:00  DEED** {"kind":"push","who":"Severa"}

**d2 12:00  with Tertia**

> Hello. I have been looking at our walls more closely lately. / I have no bed. I have a patch of ground that I have grown fond of. A bed would be better.
> **Tipping:** I cannot. I am sorry. I do mean it.
> Do you get on with Brutus? Be honest. I am only curious.
> **Tipping:** 
> Mm. / I will let you get on. I have the feeling you have somewhere to be, and so do I.
> **Tipping:** See you. I say it as a matter of course.
> 

**d2 12:00  with Severa**

> Hello. I was about to say that.
> **Tipping:** I am fond of iron. I mention it only because it is true.
> Is that so. I have written it down in my head.
> **Tipping:** If you could have one thing, which would it be? I am only asking.
> I like tools. That has been true for a long time.
> **Tipping:** In my experience, I have stood at the lanes often enough to know where the ground is uneven.
> Yes. I think so. / I have a soft spot for Secunda. She was glad for me. / I should get on. The day has noticed me.
> **Tipping:** Until next time. I will be somewhere.
> 

**d2 12:00  with Varro**

> Good. Hello. That is out of the way. / I have no bed. I have a patch of ground that I have grown fond of. A bed would be better.
> **Tipping:** No. I have exactly enough, which is the problem.
> I like it here. There is room to run, and nobody has said not to.
> **Tipping:** It is.
> Somebody told me his wall was holding up the ceiling. It was the other way round. He was very calm about it. / Can I go now? I am asking nicely.
> **Tipping:** See you. Same place, same time, roughly.
> 

**d2 15:00  with Secunda**

> Hello, love. I am here. It is where I live.
> **Tipping:** I owe you an apology. I am delivering it as promptly as I could manage.
> Thank you. I accept it. I am relieved to have somewhere to put it.
> **Tipping:** My Brutus is 3. It is going well. I am rarely asked.
> That is wonderful. They are quite something at that age. / I am glad you ended up here. I mean it quite exactly.
> **Tipping:** Thank you. I did not expect that.
> Not much happens at the lanes. I find I like that.
> **Tipping:** Mm.
> The afternoon is the same length as yesterday's, and feels longer. / Well. That is that, for now.
> **Tipping:** All the best. I have no better phrase.
> 

**d2 15:00  with Quinta**

> Hello. Come to think of it, I was hoping. / I have no bed. I have a patch of ground that I have grown fond of. A bed would be better.
> **Tipping:** Give me a few days. I will keep it in mind.
> Thank you. I will be here. Or nearby.
> **Tipping:** What is Paullus like? I would like to know before I have to find out.
> I am fond of Livia. She was glad for me. I do not say that about many people. / That is the end of what I had.
> **Tipping:** Look after yourself. Somebody has to, and I am here.
> 

**d2 15:00  with Tertia**

> Yes. Hello. It is that time.
> **Tipping:** I am going to tell you something. Tipping pulled Corvus's house down. I would like it to stay with you.
> That is serious. I will keep it. I would like to say that I wish you had not told me, and I have. / I was told you pulled Corvus's house down. I would rather hear it from you.
> **Tipping:** I did. I am not sure what you want me to say.
> I will remember this. I remember most things.
> **Tipping:** Have you heard anything? About anyone. About anything.
> No. I looked, though. / I have to get back. I will not say to what.
> **Tipping:** Goodbye, Tertia. It was a good length.
> 

**d2 18:00  with Severa**

> Evening. It has been an evening for a while now.
> **Tipping:** Has anything happened? Anything at all. I will take a small one.
> Nothing. A gull stood on the beach for a long time and left. / I am very tired. The tiredness has started to feel like a place.
> **Tipping:** Tomorrow, then.
> I could lie down on almost anything. I have been assessing the ground. / I should go. I will pretend I have a reason.
> **Tipping:** See you. I say it as a matter of course.
> 

**d2 18:00  with Secunda**

> Hello. I have moved my valuables. They are in the same place as before, but I am looking at them.
> **Tipping:** Between us, I am fond of Severa. I heard what Rufus thinks of Severa.
> You are not the only one. / I have done the builder work long enough to stop asking why.
> **Tipping:** Yes. I was going to say that.
> Any news?
> **Tipping:** No. I looked, though.
> How is Brutus?
> **Tipping:** Brutus is well. Busy.
> Yes. Well. / I should go. Something is probably waiting for me.
> **Tipping:** See you. Same place, same time, roughly.
> 

**d2 18:00  with Tertia**

> Hello.
> **Tipping:** It is a good place to stand, at the plaza. I have tried others.
> Mm.
> **Tipping:** How is the day treating you? I mean honestly.
> Fine. Nothing to report. That is a report of a kind. / It will be dark soon. I find I am prepared for that.
> **Tipping:** Mm. Yes. I would put it that way.
> I see. / That is the end of what I had.
> **Tipping:** All the best. I have no better phrase.
> 

**d2 20:00  with Tertia**

> Ah. You. The one with the walls.
> **Tipping:** You should know Secunda. She was kind about me. That is all I will say.
> You are not the only one. / How is Secunda?
> **Tipping:** Secunda is well. Busy.
> How are you getting on? / Right. The afternoon will want me soon.
> **Tipping:** Goodbye, Tertia.
> 

**d2 20:00  with Quinta**

> Hello. I was about to say that.
> **Tipping:** What do you like? I am not asking for a reason. I am collecting.
> Wool. If you are asking. I rarely say it aloud. / Has anything happened? Anything at all. I will take a small one.
> **Tipping:** Nothing. A gull stood on the beach for a long time and left.
> That is something. / Well. That is that, for now.
> **Tipping:** Goodbye, Quinta. It was a good length.
> 

**d2 20:00  with Corvus**

> Hello. Come to think of it, I was hoping. / I have no bed. I have a patch of ground that I have grown fond of. A bed would be better.
> **Tipping:** No. I have exactly enough, which is the problem.
> I have a soft spot for Brutus. I heard what Secunda thinks of Brutus.
> **Tipping:** I think so too. I had hoped it was only me.
> I sometimes wonder what the sea does when nobody is looking. I assume the same thing.
> **Tipping:** Now I am wondering as well. It is not unpleasant.
> Are you keeping well? I ask in case. / Well. The day will not do itself.
> **Tipping:** Take care of the next hour. I will take care of this one.
> 

**d3 09:00  with Tertia**

> Hello. I have been looking at our walls more closely lately. / I have no bed. I have a patch of ground that I have grown fond of. A bed would be better.
> **Tipping:** No. I have exactly enough, which is the problem.
> I saw it myself, so I can tell you. Nero smells like a midden.
> **Tipping:** I see.
> How are you? I would like to know the real number. / I have to get back. I will not say to what.
> **Tipping:** See you. Same place, same time, roughly.
> 

**d3 09:00  with Rufus**

> Hello. I have been standing here on purpose. / I was told you pulled Corvus's house down. I would rather hear it from you.
> **Tipping:** It was not me. I have noticed them nearby, more than usual.
> You are not a good liar. It is not an insult.
> **Tipping:** I have a soft spot for Varro. We have talked a few times.
> You are not the only one. / I could lie down on almost anything. I have been assessing the ground.
> **Tipping:** I had not put it that way. But yes.
> I am very tired. The tiredness has started to feel like a place. / I should go. Something is probably waiting for me.
> **Tipping:** All the best. I have no better phrase.
> 

**d3 12:00  with Tertia**

> Yes. Hello. It is that time.
> **Tipping:** Do you know where Paullus is? I am not worried. I would like to know.
> I do not know where Paullus is. Nobody tells me anything on this island, and then I am surprised. / It is 12:00. I checked.
> **Tipping:** You are right. I have been thinking so since Tuesday.
> How are you holding up? / I should get on. The day has noticed me.
> **Tipping:** Take care, Tertia. The island is small but it has edges.
> 

**d3 12:00  with Nero**

> Hello. I am small, but I am here. / I saw you. You pulled Paullus's house down. I did not say anything at the time.
> **Tipping:** I am sorry. It looked different from the other side.
> I will remember this. I remember most things. / Are you keeping well? I ask in case.
> **Tipping:** Fine. I looked into it and there is nothing to report.
> Yes. Well. / I have to go. There is a thing I am in the middle of.
> **Tipping:** Goodbye, Nero. It was a good length.
> 

**d3 12:00  with Severa**

> Ah. You. The one with the walls.
> **Tipping:** How is Nero? I realised I had not asked.
> Nero is worn out. I keep telling them to sit down. / Do you know where Paullus is? I am not worried. I would like to know.
> **Tipping:** Paullus is at the lanes. I looked, on the way past. I do not know why.
> Any news? / I will let you get on. I have the feeling you have somewhere to be, and so do I.
> **Tipping:** See you. Same place, same time, roughly.
> 

**d3 15:00  with Nero**

> Tipping. Yes. Hello. / You pulled Corvus's house down. I was standing right there.
> **Tipping:** I am sorry. It looked different from the other side.
> No. I do not think I will forget that.
> **Tipping:** Do you get on with Rufus? Be honest. I am only curious.
> I am fond of Severa. Severa gave to Varro when Varro had nothing. I do not say that about many people. / Well. That is that, for now.
> **Tipping:** Mind how you go. There is a lot of ground.
> 

**d3 15:00  with Livia**

> Good. Hello. That is out of the way. / I saw you. You knocked the wall out while Corvus was on the privy. I did not say anything at the time.
> **Tipping:** I am sorry. It looked different from the other side.
> Very well. We will not mention it again. I will, but not today.
> **Tipping:** Between us, I am fond of Secunda. She was kind about me.
> I think so too. I had hoped it was only me. / That is the end of what I had.
> **Tipping:** Take care of the next hour. I will take care of this one.
> 

**d3 15:00  with Quinta**

> Hello. I have been looking at our walls more closely lately.
> **Tipping:** You should know Corvus. He was honest with me. That is all I will say.
> You are not the only one.
> **Tipping:** I am going to tell you something. Tipping knocked the wall out while Corvus was on the privy. I would like it to stay with you.
> It stays here. I will not even think about it where people can see.
> **Tipping:** Brutus is 4 now. I did not see it happen. I looked away once.
> You must be proud. I would be. Is that the word? Yes. / Right. The afternoon will want me soon.
> **Tipping:** See you. Same place, same time, roughly.
> 

**d3 18:00  with Varro**

> Hello. I am small, but I am here. / Would you build me a bed? I would use it for the usual things.
> **Tipping:** I cannot. I am sorry. I do mean it.
> How is Secunda?
> **Tipping:** Secunda is well. Busy.
> In my experience, something went right today. I have not worked out what. I am leaving it alone. / Well. The day will not do itself.
> **Tipping:** Until next time. I will be somewhere.
> 

**d3 18:00  with Rufus**

> Hello. I have moved my valuables. They are in the same place as before, but I am looking at them. / I was told you knocked the wall out while Corvus was on the privy. I would rather hear it from you.
> **Tipping:** I am sorry. It looked different from the other side.
> Very well. We will not mention it again. I will, but not today. / My neighbour talks to his turnips. They have never disagreed with him. I envy that.
> **Tipping:** Ha. That is exactly the right size for a joke.
> I picked up 2 bread. The transaction went smoothly. I was suspicious of that. / Right. The afternoon will want me soon.
> **Tipping:** See you. Same place, same time, roughly.
> 

**d3 18:00  with Nero**

> Hello. / You knocked the wall out while Corvus was on the privy. I was standing right there.
> **Tipping:** I am sorry. It looked different from the other side.
> No. I do not think I will forget that. / I am very tired. The tiredness has started to feel like a place.
> **Tipping:** That is hard. I am sorry. It is a small island and we are all here.
> Mm. / I have to go. There is a thing I am in the middle of.
> **Tipping:** All the best. I have no better phrase.
> 

**d3 20:00  with Livia**

> Hello. I was about to say that. / I have no bed. I have a patch of ground that I have grown fond of. A bed would be better.
> **Tipping:** Give me a few days. I will keep it in mind.
> Thank you. I will be here. Or nearby. / I have a soft spot for Brutus. / I should go. I will pretend I have a reason.
> **Tipping:** Be well. I mean it in the ordinary way.
> 

**d3 20:00  with Corvus**

> Evening. It has been an evening for a while now. / I have no bed. I have a patch of ground that I have grown fond of. A bed would be better.
> **Tipping:** I cannot. I am sorry. I do mean it.
> My Varro is 9. It is going well. I am rarely asked.
> **Tipping:** That is wonderful. They are quite something at that age.
> I have a soft spot for Brutus. I heard what Secunda thinks of Brutus.
> **Tipping:** You are not the only one.
> Time here is quiet. I do not think it is slower. I think it is just not in a hurry. / I should go. Something is probably waiting for me.
> **Tipping:** Goodbye, Corvus.
> 

**d3 20:00  with Varro**

> Ah. Hello. I had a feeling.
> **Tipping:** I have a soft spot for Livia. I heard what Quinta thinks of Livia.
> You are not the only one.
> **Tipping:** I wonder why the sky is the shape it is. It must have been decided by somebody.
> I could not say. I have a feeling it is better not to. / What do you make of Brutus?
> **Tipping:** I have nothing against Brutus. That is not nothing.
> And Secunda? How is Secunda getting on? / Can I go now? I am asking nicely.
> **Tipping:** Goodbye, Varro. It was a good length.
> 

**d4 09:00  with Quinta**

> Hello. I have been looking at our walls more closely lately. / I was told you knocked the wall out while Corvus was on the privy. I would rather hear it from you.
> **Tipping:** I am sorry. I do not know what came over me.
> No. I do not think I will forget that.
> **Tipping:** I have something to tell you. It is long by the standards of today.
> Please. Go ahead. / I will let the conversation end here. It has had a good run.
> **Tipping:** Be well. I mean it in the ordinary way.
> 

**d4 09:00  with Severa**

> Hello. I am pleased and slightly startled. / I have no bed. I have a patch of ground that I have grown fond of. A bed would be better.
> **Tipping:** I cannot. I am sorry. I do mean it.
> The morning has a lot left in it.
> **Tipping:** That is about right.
> Has anything happened? Anything at all. I will take a small one. / That is the end of what I had.
> **Tipping:** Mind how you go. There is a lot of ground.
> 

**d4 12:00  with Severa**

> Hello. I have been standing here on purpose.
> **Tipping:** You are good to have around. I do not say that to many people.
> Thank you. I did not expect that. / My Nero is 8. It is going well. I am rarely asked.
> **Tipping:** That is wonderful. They are quite something at that age.
> To be fair, I have done the baker work long enough to stop asking why. / I should get on. The day has noticed me.
> **Tipping:** All the best. I have no better phrase.
> 

**d4 12:00  with Livia**

> Yes. Hello. It is that time.
> **Tipping:** Do you know what grain cost today?
> About 3 denarii. I paid it and did not enjoy it.
> **Tipping:** Between us, I am fond of Severa. She is always good to me.
> You are not the only one.
> **Tipping:** It is 12:00. I checked.
> That is about right. / Right. The afternoon will want me soon.
> **Tipping:** Good day to you. It is, so far.
> 

**d4 12:00  with Quinta**

> Hello to you, in return.
> **Tipping:** My Brutus is 4. It is going well. I am rarely asked.
> You must be proud. I would be. Is that the word? Yes. / I saw it myself, so I can tell you. Severa gave Rufus a gift.
> **Tipping:** Well. That is good. I will think about it all afternoon.
> Ah. Yes. / Off I go. I will not look back, which is a lie.
> **Tipping:** Take care of the next hour. I will take care of this one.
> 

**d4 15:00  with Rufus**

> Hello. I have moved my valuables. They are in the same place as before, but I am looking at them. / Would you build me a bed? I would use it for the usual things.
> **Tipping:** No. I have exactly enough, which is the problem.
> I asked for a loaf of yesterday. They said they would have one tomorrow. I have decided to wait.
> **Tipping:** Ha. Good. I will repeat that to somebody who has not heard it.
> I have stood at the plaza often enough to know where the ground is uneven.
> **Tipping:** True. It does not make it simpler.
> Yes. Well. / I have to get back. I will not say to what.
> **Tipping:** Be well. I mean it in the ordinary way.
> 

**d4 15:00  with Livia**

> Hello. I have been looking at our walls more closely lately.
> **Tipping:** Do you know where Paullus is? I am not worried. I would like to know.
> Paullus is at the lanes. I looked, on the way past. I do not know why. / It may not be true. Severa gave to Varro when Varro had nothing.
> **Tipping:** I am glad. It is a strange thing to be glad about, and I am.
> Mm. / I should go. I will pretend I have a reason.
> **Tipping:** Mind how you go. There is a lot of ground.
> 

**d4 15:00  with Tertia**

> Hello. I was about to say that. / Would you build me a bed? I would use it for the usual things.
> **Tipping:** I cannot. I am sorry. I do mean it.
> Not much happens at the plaza. I find I like that.
> **Tipping:** Agreed. That is a rare thing.
> Ah. Yes. / Well. That is that, for now.
> **Tipping:** Goodbye, Tertia. It was a good length.
> 

**d4 18:00  with Rufus**

> Hello. I have moved my valuables. They are in the same place as before, but I am looking at them.
> **Tipping:** What did you do today? In order, if you can.
> The seed stall has potato seeds now. I stood and looked at it for a while. / What do you like? I am not asking for a reason. I am collecting.
> **Tipping:** 
> I saw it myself, so I can tell you. Corvus smells like a midden.
> **Tipping:** Well. That is a thing that happened.
> My neighbour talks to his turnips. They have never disagreed with him. I envy that. / I will let the conversation end here. It has had a good run.
> **Tipping:** Mind how you go. There is a lot of ground.
> 

**d4 18:00  with Livia**

> Ah. Hello. I had a feeling.
> **Tipping:** How is Quinta?
> Quinta is worn out. I keep telling them to sit down.
> **Tipping:** Do you know where Paullus is? I am not worried. I would like to know.
> Paullus is at the lanes. I looked, on the way past. I do not know why.
> **Tipping:** Between us, I am fond of Secunda. She was kind about me.
> You are not the only one. / That is the end of what I had.
> **Tipping:** Take care of the next hour. I will take care of this one.
> 

**d4 18:00  with Nero**

> Hello. I was doing something important. / I have no food. I have had none since this morning. Could you spare fish?
> **Tipping:** I cannot. I am sorry. I do mean it.
> Is it lunch yet? It feels like lunch.
> **Tipping:** That is about right.
> That is something. / I have to go. There is a thing I am in the middle of.
> **Tipping:** Take care, Nero. The island is small but it has edges.
> 

**d4 20:00  with Nero**

> Hello. I am small, but I am here.
> **Tipping:** Do you know where Paullus is? I am not worried. I would like to know.
> Paullus is at the lanes. I looked, on the way past. I do not know why. / I saw it myself, so I can tell you. Rufus gave Corvus a gift.
> **Tipping:** I am glad. It is a strange thing to be glad about, and I am.
> I see. / Off I go. I will not look back, which is a lie.
> **Tipping:** Goodbye, Nero.
> 

**d4 20:00  with Severa**

> Hello to you, in return.
> **Tipping:** In my experience, it will be dark soon. I find I am prepared for that.
> True. It does not make it simpler. / I am tired. Not sleepy. Tired in a way a bed would not fix at once.
> **Tipping:** Mm. Yes. I would put it that way.
> To be fair, the baker work went quietly today. I do not entirely trust that. / I should get on. The day has noticed me.
> **Tipping:** Be well. I mean it in the ordinary way.
> 

**d4 20:00  with Quinta**

> Hello. I have been looking at our walls more closely lately.
> **Tipping:** And you? How are things on your side of the island?
> Tired, but upright. / I saw it myself, so I can tell you. Nero smells like a midden.
> **Tipping:** Well. That is a thing that happened.
> Ah. Yes. / I should go. Something is probably waiting for me.
> **Tipping:** All the best. I have no better phrase.
> 

**d5 09:00  with Secunda**

> Hello, love. I am here. It is where I live.
> **Tipping:** Do you know where Paullus is? I am not worried. I would like to know.
> Paullus is at the lanes. I looked, on the way past. I do not know why.
> **Tipping:** My Brutus is 4. It is going well. I am rarely asked.
> That is wonderful. They are quite something at that age.
> **Tipping:** I sometimes wonder what the sea does when nobody is looking. I assume the same thing.
> Now I am wondering as well. It is not unpleasant. / Do you get on with Brutus? Be honest. I am only curious.
> **Tipping:** 
> I feel unreasonably good today. I have decided not to look into it. / Well. The day will not do itself.

**d5 09:00  with Varro**

> Hello. I am small, but I am here. / I have no bed. I have a patch of ground that I have grown fond of. A bed would be better.
> **Tipping:** Give me a few days. I will keep it in mind.
> Thank you. I will be here. Or nearby. / Do you know where Paullus is? I am not worried. I would like to know.
> **Tipping:** Paullus is at the lanes. I looked, on the way past. I do not know why.
> In my experience, I saw it myself, so I can tell you. Tertia smells like a midden. / Can I go now? I am asking nicely.
> **Tipping:** Take care of the next hour. I will take care of this one.
> 

**d5 12:00  with Corvus**

> Ah. You. The one with the walls. / Would you build me a bed? I would use it for the usual things.
> **Tipping:** No. I have exactly enough, which is the problem.
> My Varro is 10. It is going well. I am rarely asked.
> **Tipping:** That is wonderful. They are quite something at that age.
> What is Brutus like? I would like to know before I have to find out.
> **Tipping:** 
> How are you holding up? / I have a few things to be near. I will go and be near them.
> **Tipping:** Take care of the next hour. I will take care of this one.
> 

**d5 12:00  with Varro**

> Yes. Hello. It is that time.
> **Tipping:** Do you know where Paullus is? I am not worried. I would like to know.
> Paullus is at the lanes. I looked, on the way past. I do not know why. / I like it here. There is room to run, and nobody has said not to.
> **Tipping:** Yes. I was going to say that.
> I saw it myself, so I can tell you. Tertia smells like a midden.
> **Tipping:** Well. That is a thing that happened.
> I have a soft spot for Secunda. We have talked a few times. / That is the end of what I had.
> **Tipping:** Goodbye, Varro.
> 

**d5 12:00  with Rufus**

> Hello. I have moved my valuables. They are in the same place as before, but I am looking at them. / I have no bed. I have a patch of ground that I have grown fond of. A bed would be better.
> **Tipping:** Give me a few days. I will keep it in mind.
> Thank you. I will be here. Or nearby. / I am tired. Not sleepy. Tired in a way a bed would not fix at once.
> **Tipping:** That is about right.
> Not much happens at the plaza. I find I like that. / Right. The afternoon will want me soon.
> **Tipping:** All the best. I have no better phrase.
> 

**d5 15:00  with Nero**

> Hello. I was doing something important. / Would you build me a bed? I would use it for the usual things.
> **Tipping:** Give me a few days. I will keep it in mind.
> Thank you. I will be here. Or nearby. / I am very tired. The tiredness has started to feel like a place. / I have to go. There is a thing I am in the middle of.
> **Tipping:** Be well. I mean it in the ordinary way.
> 

**d5 15:00  with Varro**

> Hello. I was about to say that.
> **Tipping:** If you could have one thing, which would it be? I am only asking.
> I like wine. That has been true for a long time.
> **Tipping:** How is Corvus? I realised I had not asked.
> Corvus is in a good mood. I have decided not to question it.
> **Tipping:** I sometimes wonder what the sea does when nobody is looking. I assume the same thing.
> Now I am wondering as well. It is not unpleasant.
> **Tipping:** Do you get on with Severa? Be honest. I am only curious.
> I have nothing against Paullus. Paullus's house came down, and Tipping was there. That is not nothing.
> **Tipping:** My Brutus is 4. It is going well. I am rarely asked.
> You must be proud. I would be. Is that the word? Yes.
> **Tipping:** I am going to tell you something. Paullus's house came down, and Tipping was there. I would like it to stay with you.
> That is serious. I will keep it. I would like to say that I wish you had not told me, and I have. / I will leave you to it. You were doing something.

**d5 15:00  with Quinta**

> Ah. You. The one with the walls.
> **Tipping:** I heard that Tertia smells like a midden. I have no reason to doubt it, and no reason to believe it.
> Who told you that? Never mind. I would like to hear it twice.
> **Tipping:** Do you know what grain cost today?
> 3 denarii each. I wrote it down.
> **Tipping:** What did you do today? In order, if you can.
> I could not afford grain. I counted twice. / Off I go. I will not look back, which is a lie.
> **Tipping:** Take care of the next hour. I will take care of this one.
> 

**d5 18:00  with Varro**

> Hello. I have been looking at our walls more closely lately. / People say you pulled Paullus's house down. People say many things here.
> **Tipping:** I had a reason. It seemed to be a good one.
> I will remember this. I remember most things.
> **Tipping:** In my experience, the farmer work goes on. It does not seem to mind whether I am there.
> Yes. / How have you been, since last time? Give me the short version.
> **Tipping:** Fine. There is a small noise in my left knee, which is the news.
> And Secunda? How is Secunda getting on? / I should go. I will pretend I have a reason.
> **Tipping:** Look after yourself. Somebody has to, and I am here.
> 

**d5 18:00  with Severa**

> Good. Hello. That is out of the way. / Would you build me a bed? I would use it for the usual things.
> **Tipping:** I cannot. I am sorry. I do mean it.
> I heard that Nero smells like a midden. I have no reason to doubt it, and no reason to believe it.
> **Tipping:** Mm. Noted.
> And you? How are things on your side of the island? / I will let you get on. I have the feeling you have somewhere to be, and so do I.
> **Tipping:** Take care of the next hour. I will take care of this one.
> 

**d5 18:00  with Livia**

> Ah. You. The one with the walls.
> **Tipping:** My neighbour talks to his turnips. They have never disagreed with him. I envy that.
> Ha. Good. I will repeat that to somebody who has not heard it. / Varro is 10 now. I did not see it happen. I looked away once.
> **Tipping:** You must be proud. I would be. Is that the word? Yes.
> Mm. / I have a few things to be near. I will go and be near them.
> **Tipping:** Take care, Livia. The island is small but it has edges.
> 

**d5 20:00  with Quinta**

> Evening. It has been an evening for a while now. / Would you build me a bed? I would use it for the usual things.
> **Tipping:** I will see what can be done. I make no claims.
> Thank you. I will be here. Or nearby.
> **Tipping:** I am fond of iron. I mention it only because it is true.
> Is that so. I have written it down in my head. / I will leave you to it. You were doing something.
> **Tipping:** Be well. I mean it in the ordinary way.
> 

**d5 20:00  with Livia**

> Tipping. Yes. Hello.
> **Tipping:** Between us, I am fond of Secunda. She was kind about me.
> You are not the only one. / The farmer work goes on. It does not seem to mind whether I am there.
> **Tipping:** True. It does not make it simpler.
> I see. / Well. That is that, for now.
> **Tipping:** Until next time. I will be somewhere.
> 

**d5 20:00  with Paullus**

> Yes. Hello. It is that time. / I have no food. I have had none since this morning. Could you spare fish?
> **Tipping:** I will see what can be done. I make no claims.
> Thank you. I will be here. Or nearby. / I am hungry, as it happens. It has been a while.
> **Tipping:** That is hard. I am sorry. It is a small island and we are all here.
> I made it. Barely. We do not need to discuss the margin. / I will let the conversation end here. It has had a good run.
> **Tipping:** Mind how you go. There is a lot of ground.
> 

## Everything the villagers said

### Day 1

**d0 06:44  Quinta & Tertia** (Horatius House)
- Quinta: Good morning. I woke at some point before this and have been waiting for someone to say it to.
- Tertia: Morning. I was thinking about nothing in particular.
- Quinta: What do you like? I am not asking for a reason. I am collecting.
- Tertia: Copper ore. If you are asking. I rarely say it aloud.
- Tertia: Anyway. How is Corvus? I realised I had not asked.
- Quinta: Corvus is well. Busy.
- Quinta: Well. That is that, for now.
- Tertia: Good day to you. It is, so far.
- Quinta: And you.

**d0 06:50  Nero & Severa** (Fabius House)
- Nero: Morning, Severa. It is 6:50.
- Severa: Hello.
- Nero: My neighbour talks to his turnips. They have never disagreed with him. I envy that.
- Severa: Ha. That is exactly the right size for a joke.
- Severa: Are you behaving? Do not answer.
- Nero: Fine. I found a very good stick.
- Severa: On a different note, any news?
- Nero: Nothing I would call news. The tide is where it was.
- Nero: You are good to have around. I do not say that to many people.
- Severa: That is kind. I will think about it later.
- Severa: The morning has a lot left in it.
- Nero: I know. I was going to say that.
- Nero: How is Paullus?
- Severa: Paullus is well. Busy.
- Nero: I have to go. There is a thing I am in the middle of.
- Severa: Wrap up warm. It is a mild island, and still.
- Nero: Bye.

**d0 07:38  Corvus & Livia** (the lanes)
- Corvus: There you are, Livia.
- Livia: Hello, love. I am here. It is where I live.
- Corvus: Between us, I am fond of Varro. He is my child.
- Livia: You are not the only one.
- Livia: Anyway. Do you know where Paullus is? I am not worried. I would like to know.
- Corvus: I do not know where Paullus is. Nobody tells me anything on this island, and then I am surprised.
- Corvus: I will let the conversation end here. It has had a good run.
- Livia: I will see you at supper. I will be the one who is hungry.
- Corvus: Yes. Goodbye.

**d0 07:44  Paullus & Rufus** (Fabius House)
- Paullus: There you are. I counted. You were still one.
- Rufus: Hello. Yes, I have eaten. I would tell you if I had not, which is not true.
- Paullus: More or less, time here is quiet. I do not think it is slower. I think it is just not in a hurry.
- Rufus: Mm. Yes. I would put it that way.
- Rufus: On a different note, what did you do today? In order, if you can.
- Paullus: Anyway. The seed stall has turnip seeds on it that nobody ordered. I am not asking.
- Rufus: I see.
- Rufus: I should go. I will pretend I have a reason.
- Paullus: Do not be late for supper. I will notice and I will say nothing.
- Rufus: Right. Until then.

**d0 09:26  Varro & Tertia** (the plaza)
- Varro: Are you going somewhere? I could come. I would be quiet. Mostly.
- Tertia: Hello. I was about to say that.
- Varro: Is it lunch yet? It feels like lunch.
- Tertia: That is about right.
- Tertia: Have you heard anything? About anyone. About anything.
- Varro: Nothing. A gull stood on the beach for a long time and left.
- Varro: Can I go now? I am asking nicely.
- Tertia: Look after yourself. Somebody has to, and I am here.
- Varro: Quite. Goodbye.

**d0 10:20  Corvus & Secunda** (the fields)
- Corvus: Morning, Secunda. It is 10:20.
- Secunda: Hello, Corvus. I was hoping it would be you.
- Corvus: I picked up a flower. The transaction went smoothly. I was suspicious of that.
- Secunda: And how did it go?
- Secunda: How is Varro?
- Corvus: Varro is well. Busy.
- Corvus: I should go. Something is probably waiting for me.
- Secunda: Take care of the next hour. I will take care of this one.
- Corvus: Goodbye. It was good.

**d0 11:26  Livia & Rufus** (the plaza)
- Livia: Potatoes. 3 denarii. That is all I have to say about it.

**d0 11:30  Paullus & Tipping** (the lanes)
- Paullus: That was my house. It was there this morning.

**d0 11:30  Severa & Tipping** (the plaza)
- Severa: My house. You have taken my house down.

**d0 11:56  Severa & Rufus** (the lanes)
- Severa: Have you eaten? I ask every time. The answer is never the point.
- Rufus: Hello. I am here. I am fine. You do not need to look at me like that.
- Severa: The baker work went quietly today. I do not entirely trust that.
- Rufus: Quite. It is what I think too.
- Rufus: It is a good place to stand, at the plaza. I have tried others.
- Severa: It is.
- Severa: I should go. I will pretend I have a reason.
- Rufus: Bye. I will be home for supper. Probably before it.
- Severa: Goodbye.

**d0 12:02  Quinta & Tertia** (the plaza)
- Quinta: Ah, Tertia. I was just thinking of something else.
- Tertia: Hello.
- Quinta: I sometimes wonder what the sea does when nobody is looking. I assume the same thing.
- Tertia: I could not say. I have a feeling it is better not to.
- Tertia: The afternoon is the same length as yesterday's, and feels longer.
- Quinta: Mm.
- Tertia: On a different note, I have a soft spot for Corvus.
- Quinta: You are not the only one.
- Tertia: Are you keeping well? I ask in case.
- Quinta: Steady. That is the word I have settled on.
- Tertia: Off I go. I will not look back, which is a lie.
- Quinta: Good day to you. It is, so far.
- Tertia: And you.

**d0 12:02  Livia & Quinta** (the plaza)
- Livia: Fresh beans. As fresh as anything here.

**d0 12:16  Severa & Varro** (the plaza)
- Severa: Afternoon, Varro.
- Varro: Hello. I am small, but I am here.
- Severa: To be fair, something is always about to happen at the plaza. It has not so far.
- Varro: Yes.
- Varro: How are things with you, Severa?
- Severa: Not bad. I say that and wait for the day to hear me.
- Varro: On a different note, I wonder why the sky is the shape it is. It must have been decided by somebody.
- Severa: Now I am wondering as well. It is not unpleasant.
- Varro: What is Nero like? I would like to know before I have to find out.
- Severa: Nero is one of the good ones. He was kind about me.
- Varro: What do you like? I am not asking for a reason. I am collecting.
- Severa: Tools. If you are asking. I rarely say it aloud.
- Severa: Right. The afternoon will want me soon.
- Varro: Bye. Do not tell them where I went.
- Severa: Yes. Goodbye.

**d0 13:56  Severa & Livia** (the plaza)
- Severa: It is 13:56. Hello, Livia.
- Livia: Hello, Severa. I was hoping it would be you.
- Severa: How are you holding up?
- Livia: Fine. I looked into it and there is nothing to report.
- Livia: On a different note, I have done the farmer work long enough to stop asking why.
- Severa: Yes. I think so.
- Severa: I should go. Something is probably waiting for me.
- Livia: Take care of the next hour. I will take care of this one.
- Severa: Be well, then.

**d0 14:32  Corvus & Varro** (the plaza)
- Corvus: Come here. Let me look at you. You are taller or I am less.
- Varro: Hello. I was doing something important.
- Corvus: Time here is quiet. I do not think it is slower. I think it is just not in a hurry.
- Varro: Anyway. What did you do today? In order, if you can.
- Corvus: Unrelated, but I picked up a flower. The transaction went smoothly. I was suspicious of that.
- Varro: That is a decent day's work.
- Varro: I have something to tell you. It is long by the standards of today.
- Corvus: Go on. I have time. I always have time.
- Varro: In my experience, I saw it myself, so I can tell you. Paullus's house came down, and Tipping was there.
- Corvus: That is hard on Paullus. I hope someone brought them something to eat.
- Corvus: I asked for a loaf of yesterday. They said they would have one tomorrow. I have decided to wait.
- Varro: I have heard that one. I did not mind hearing it again.
- Varro: On a different note, and Livia? How is Livia getting on?
- Corvus: Livia is well. Busy.
- Corvus: The farmer work is the one thing that has not changed since I arrived, and I am glad of it.
- Varro: I know. I was going to say that.
- Varro: Are you well? You look tired. You always look tired. It is part of the family.
- Corvus: Good. I do not know why. I have stopped asking.
- Varro: I have to go. There is a thing I am in the middle of.
- Corvus: Do not be late for supper. I will notice and I will say nothing.
- Varro: Bye.

**d0 14:50  Livia & Rufus** (the plaza)
- Livia: If anyone needs pumpkins, I have some.

**d0 14:50  Livia & Livia** (the plaza)
- Livia: Another row. The rows are the same. I check.

**d0 15:14  Rufus & Livia** (the plaza)
- Rufus: Hello. It is a day of some kind.
- Livia: Ah, Rufus. The island does arrange things.
- Rufus: What did you do today? In order, if you can.
- Livia: Nothing worth telling. I walked about. The ground was where I left it.
- Livia: It is a good place to stand, at the plaza. I have tried others.
- Rufus: That is about right.
- Rufus: I have a few things to be near. I will go and be near them.
- Livia: Mind how you go. There is a lot of ground.
- Rufus: Right. Until then.

**d0 17:08  Severa & Quinta** (the lanes)
- Severa: The light is going. Hello, Quinta.
- Quinta: Evening. It has been an evening for a while now.
- Severa: It may not be true. Tipping got shut in by a door block.
- Quinta: Who told you that? Never mind. I would like to hear it twice.
- Severa: I would be careful around Tipping. They knock things down. I say it only because it is true.
- Quinta: Thank you. I will take it under advisement. It is a good word, advisement.
- Severa: Something is always about to happen at the lanes. It has not so far.
- Severa: Well. That is that, for now.
- Quinta: Good day to you. It is, so far.
- Severa: Goodbye. It was good.

**d0 17:16  Tertia & Severa** (the lanes)
- Tertia: Evening, Severa.
- Severa: Hello, Tertia. I was hoping it would be you.
- Tertia: I have a soft spot for Nero.
- Severa: I think so too. I had hoped it was only me.
- Severa: How are things with you, Tertia?
- Tertia: Fine. About a six.
- Tertia: If you could have one thing, which would it be? I am only asking.
- Severa: I like flowers. That has been true for a long time.
- Severa: Unrelated, but what are flowers going for? I would like an exact figure.
- Tertia: 5 denarii each. I wrote it down.
- Severa: That is more than I thought.
- Severa: Right. The afternoon will want me soon.
- Tertia: Take care, Severa. The island is small but it has edges.
- Severa: Goodbye.

**d0 17:38  Paullus & Nero** (the lanes)
- Paullus: Nero. Home. The light is going and I count you every evening.

**d0 17:38  Livia & Varro** (the plaza)
- Livia: Varro. Come in. It is getting dark and I would like you inside.

**d0 17:48  Rufus & Nero** (the plaza)
- Rufus: Nero. We have the same eyebrows. I notice every time.
- Nero: What now? I am joking. Hello.
- Rufus: Do you know where Severa is? I am not worried. I would like to know.
- Nero: Severa is at the lanes. I looked, on the way past. I do not know why.
- Rufus: I saw it myself, so I can tell you. Tipping got shut in by a door block.
- Nero: Mm. Noted.
- Rufus: Anyway. It will be dark soon. I find I am prepared for that.
- Nero: On a different note, I like cloth very much. It is the sort of thing a person might remember.
- Rufus: Is that so. I have written it down in my head.
- Nero: On a different note, you should know Severa. She is my parent. That is all I will say.
- Rufus: You are not the only one.
- Rufus: My neighbour talks to his turnips. They have never disagreed with him. I envy that.
- Nero: Ha. That is exactly the right size for a joke.
- Nero: I would be careful around Tipping. They knock things down. I say it only because it is true.
- Rufus: Thank you. I will take it under advisement. It is a good word, advisement.
- Nero: Can I go now? I am asking nicely.
- Rufus: Try not to be an idiot. I say it with love, and with a little concern.
- Nero: Bye.

**d0 18:08  Rufus & Varro** (the lanes)
- Rufus: Varro. Good. I was about to go and look for you. For no particular reason.
- Varro: Hello.
- Rufus: I have stood at the lanes often enough to know where the ground is uneven.
- Varro: Yes.
- Varro: In my experience, I heard that Paullus got shut in by a wall block. I have no reason to doubt it, and no reason to believe it.
- Rufus: Well. That is a thing that happened.
- Rufus: I should go. Something is probably waiting for me.
- Varro: Bye. Do not tell them where I went.
- Rufus: Off you go. I will watch for a moment.

**d0 18:16  Nero & Corvus** (the plaza)
- Nero: Are you going somewhere? I could come. I would be quiet. Mostly.
- Corvus: Nero. Yes. Hello.
- Nero: What do you like? I am not asking for a reason. I am collecting.
- Corvus: Pumpkins. If you are asking. I rarely say it aloud.
- Corvus: Anyway. Do you know where Paullus is? I am not worried. I would like to know.
- Nero: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Corvus: On a different note, it is 18:16. I checked.
- Corvus: On that subject, what do you make of Paullus?
- Nero: Paullus is one of the good ones. Paullus's house came down, and Tipping was there.
- Corvus: Has anything happened? Anything at all. I will take a small one.
- Nero: I think, I overheard something. Paullus got shut in by a wall block. I was not meant to, but I was there.
- Corvus: Mm. Noted.
- Corvus: I have a few things to be near. I will go and be near them.
- Nero: Bye. I am going to go and do something. I will not say what.
- Corvus: See you. I will be here, or near.

**d0 18:20  Rufus & Livia** (Horatius House)
- Rufus: The light is going. Hello, Livia.
- Livia: Ah. Hello. I had a feeling.
- Rufus: I asked for a loaf of yesterday. They said they would have one tomorrow. I have decided to wait.
- Livia: Ha. Good. I will repeat that to somebody who has not heard it.
- Rufus: Anyway. What do you like? I am not asking for a reason. I am collecting.
- Livia: Strawberries. If you are asking. I rarely say it aloud.
- Rufus: Unrelated, but something is always about to happen in Horatius House. It has not so far.
- Rufus: It will be dark soon. I find I am prepared for that.
- Livia: Quite. It is what I think too.
- Rufus: What do you do with your days, Livia? I am only asking out of interest.
- Livia: I am a farmer. It is a better job than it sounds, or exactly as good.
- Livia: That is the end of what I had.
- Rufus: See you. Same place, same time, roughly.
- Livia: And the same to you, exactly.

**d0 18:24  Varro & Tertia** (the plaza)
- Varro: Hello. I am small, but I noticed you.
- Tertia: Good. Hello. That is out of the way.
- Varro: It is a long day when you are small.
- Varro: Unrelated, but do you get on with Livia? Be honest. I am only curious.
- Tertia: I am fond of Livia. She is my child. I do not say that about many people.
- Tertia: Unrelated, but how have you been, since last time? Give me the short version.
- Varro: Fine. I found a very good stick.
- Varro: On a different note, do you know what flowers cost today?
- Tertia: About 5 denarii. I paid it and did not enjoy it.
- Varro: Fair. Thank you.
- Tertia: On a different note, do you know where Paullus is? I am not worried. I would like to know.
- Varro: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Varro: Off I go. I will not look back, which is a lie.
- Tertia: See you. I say it as a matter of course.
- Varro: Be well, then.

**d0 18:40  Varro & Corvus** (the plaza)
- Varro: Hello. Is there supper? I am only asking in general.
- Corvus: Hello. Come to think of it, I was hoping.
- Varro: You brought up Livia before. I remembered. Is there anything new?
- Corvus: It is much as it was. Thank you for remembering. People do not, usually.
- Corvus: On that subject, you should know Livia. She is my spouse. That is all I will say.
- Varro: I think so too. I had hoped it was only me.
- Varro: What do you make of Quinta?
- Corvus: Quinta is one of the good ones. She is my child.
- Corvus: On a different note, are you behaving? Do not answer.
- Varro: Fine. I was going to say I was well and it is true, which surprised me.
- Varro: Do you know where Paullus is? I am not worried. I would like to know.
- Corvus: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Corvus: The farmer work goes on. It does not seem to mind whether I am there.
- Varro: And Livia? How is Livia getting on?
- Corvus: Livia is well. Busy.
- Varro: I should go. I will pretend I have a reason.
- Corvus: Wrap up warm. It is a mild island, and still.
- Varro: Yes. Goodbye.

**d0 18:56  Tertia & Nero** (the plaza)
- Tertia: Good. You are here. I was about to start talking to myself.
- Nero: Hello. I have been standing here on purpose.
- Tertia: Do you know where Paullus is? I am not worried. I would like to know.
- Nero: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Tertia: Unrelated, but have you heard anything? About anyone. About anything.
- Nero: Nothing I would call news. The tide is where it was.
- Nero: Anyway. What is Livia like? I would like to know before I have to find out.
- Tertia: I am fond of Livia. She is my child. I do not say that about many people.
- Tertia: Anyway. I picked up a flower. The transaction went smoothly. I was suspicious of that.
- Nero: And how did it go?
- Tertia: I will let the conversation end here. It has had a good run.
- Nero: Look after yourself. Somebody has to, and I am here.
- Tertia: Right. Until then.

**d0 19:44  Paullus & Nero** (the lanes)
- Paullus: Nero. Come in. It is getting dark and I would like you inside.

**d0 20:08  Livia & Tertia** (Horatius House)
- Livia: Hello. It is a day of some kind.
- Tertia: Evening. It has been an evening for a while now.
- Livia: Do you know where Paullus is? I am not worried. I would like to know.
- Tertia: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Tertia: Anyway. My neighbour talks to his turnips. They have never disagreed with him. I envy that.
- Livia: Ha. Good. I will repeat that to somebody who has not heard it.
- Livia: I will let you get on. I have the feeling you have somewhere to be, and so do I.
- Tertia: Do not be late for supper. I will notice and I will say nothing.
- Livia: Mm. See you.

**d0 20:38  Rufus & Secunda** (Horatius House)
- Rufus: Evening, Secunda.
- Secunda: Evening. It has been an evening for a while now.
- Rufus: I am not sure about Tipping. Paullus's house came down, and Tipping was there.
- Secunda: Hm. I have found them fine. Perhaps we met different ones.
- Secunda: Unrelated, but do you know where Paullus is? I am not worried. I would like to know.
- Rufus: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Rufus: Off I go. I will not look back, which is a lie.
- Secunda: Good day to you. It is, so far.
- Rufus: Quite. Goodbye.

**d0 20:50  Secunda & Varro** (Horatius House)
- Secunda: Hello, Varro.
- Varro: Hello. I am small, but I am here.
- Secunda: Any news?
- Varro: In my experience, it may not be true. Paullus got shut in by a wall block.
- Secunda: I see.
- Varro: Unrelated, but how are you? I would like to know the real number.
- Secunda: Steady. That is the word I have settled on.
- Varro: Unrelated, but I saw it myself, so I can tell you. Paullus's house came down, and Livia was there.
- Secunda: Who told you that? Never mind. I would like to hear it twice.
- Varro: How is Tipping?
- Secunda: Tipping is well. Busy.
- Varro: Anyway. Do you know where Paullus is? I am not worried. I would like to know.
- Secunda: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Varro: I have to go. There is a thing I am in the middle of.
- Secunda: All the best. I have no better phrase.
- Varro: Bye.

**d0 21:32  Rufus & Corvus** (Horatius House)
- Rufus: Hello, Corvus. I will say it first this time.
- Corvus: Hello, Rufus. I was hoping it would be you.
- Rufus: Do you know what flowers cost today?
- Corvus: 5 denarii each. I wrote it down.
- Rufus: Fair. Thank you.
- Rufus: I should get on. The day has noticed me.
- Corvus: Take care, Rufus. The island is small but it has edges.
- Rufus: Be well, then.

**d0 21:38  Quinta & Varro** (Horatius House)
- Quinta: Varro. We have the same eyebrows. I notice every time.
- Varro: Hello. I was doing something important.
- Quinta: How is life, then? Tell me before everyone else does.
- Varro: Fine. I found a very good stick.
- Varro: Do you know where Paullus is? I am not worried. I would like to know.
- Quinta: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Quinta: Well. The day will not do itself.
- Varro: Bye. I am going to go and do something. I will not say what.
- Quinta: Goodbye.

**d0 21:48  Rufus & Tertia** (Horatius House)
- Rufus: Tertia. Good. I had a thought and nobody to give it to.
- Tertia: Yes. Hello. It is that time.
- Rufus: And Livia? How is Livia getting on?
- Tertia: Livia is well. Busy.
- Rufus: I have a soft spot for Secunda. We have talked a few times.
- Tertia: You are not the only one.
- Rufus: On a different note, my neighbour talks to his turnips. They have never disagreed with him. I envy that.
- Tertia: Ha. That is exactly the right size for a joke.
- Tertia: I would be careful around Tipping. They knock things down. I say it only because it is true.
- Rufus: Thank you. I will take it under advisement. It is a good word, advisement.
- Rufus: And you? How are things on your side of the island?
- Tertia: Fine. Nothing to report. That is a report of a kind.
- Rufus: That is the end of what I had.
- Tertia: Be well. I mean it in the ordinary way.
- Rufus: Goodbye. It was good.

**d0 21:54  Secunda & Severa** (the lanes)
- Secunda: The light is going. Hello, Severa.
- Severa: Hello.
- Secunda: My Brutus is 3. It is going well. I am rarely asked.
- Severa: You must be proud. I would be. Is that the word? Yes.
- Secunda: What do you like? I am not asking for a reason. I am collecting.
- Severa: I like flowers. That has been true for a long time.
- Severa: What do you do with your days, Secunda? I am only asking out of interest.
- Secunda: I am a builder. It is a better job than it sounds, or exactly as good.
- Secunda: It will be dark soon. I find I am prepared for that.
- Severa: Yes. I think so.
- Secunda: I have to get back. I will not say to what.
- Severa: Goodbye, Secunda. It was a good length.
- Secunda: See you. I will be here, or near.

**d0 23:16  Nero & Rufus** (the plaza)
- Nero: It is you. I had hoped for someone else, and then I thought: no.
- Rufus: What now? I am joking. Hello.
- Nero: I feel unreasonably good today. I have decided not to look into it.
- Rufus: It is a good place to stand, at the plaza. I have tried others.
- Nero: I know. I was going to say that.
- Rufus: Anyway. Do you know where Severa is? I am not worried. I would like to know.
- Nero: Severa is at the lanes. I looked, on the way past. I do not know why.
- Rufus: How are you holding up?
- Nero: Good. It has been a good day. I did not expect that of it.
- Rufus: You should know Severa. I heard what Nero thinks of Severa. That is all I will say.
- Nero: I think so too. I had hoped it was only me.
- Rufus: Staying with it for a moment, how is Severa? I realised I had not asked.
- Nero: Severa is in a good mood. I have decided not to question it.
- Nero: I will leave you to it. You were doing something.
- Rufus: See you. Same place, same time, roughly.
- Nero: Yes. Goodbye.

### Day 2

**d1 04:12  Rufus & Nero** (the plaza)
- Rufus: You are up late, Nero. So am I. I do not know what that proves.
- Nero: Hello. I was doing something important.
- Rufus: Any news?
- Nero: Nothing I would call news. The tide is where it was.
- Rufus: Somebody told me his wall was holding up the ceiling. It was the other way round. He was very calm about it.
- Nero: Ha. That is exactly the right size for a joke.
- Nero: Unrelated, but what are flowers going for? I would like an exact figure.
- Rufus: 5 denarii each. I wrote it down.
- Nero: That is more than I thought.
- Rufus: You brought up Severa before. I remembered. Is there anything new?
- Nero: There is no news. That is also a kind of news.
- Rufus: Do you get on with Paullus? Be honest. I am only curious.
- Nero: Paullus is one of the good ones. Paullus's house came down, and Tipping was there.
- Rufus: I should go. Something is probably waiting for me.
- Nero: Try not to be an idiot. I say it with love, and with a little concern.
- Rufus: Goodbye.

**d1 06:44  Corvus & Quinta** (Horatius House)
- Corvus: Come here. Let me look at you. You are taller or I am less.
- Quinta: Hello. I am here. I am fine. You do not need to look at me like that.
- Corvus: My Varro is 9. It is going well. I am rarely asked.
- Quinta: That is wonderful. They are quite something at that age.
- Quinta: My neighbour talks to his turnips. They have never disagreed with him. I envy that.
- Corvus: Ha. Good. I will repeat that to somebody who has not heard it.
- Corvus: Well. The day will not do itself.
- Quinta: Bye. I will be home for supper. Probably before it.
- Corvus: Yes. Goodbye.

**d1 09:08  Severa & Livia** (the plaza)
- Severa: Good morning.
- Livia: Good morning. I have what I have.
- Severa: 5 grain, please.
- Livia: 15 denarii. I did not set the price. I only repeat it.
- Severa: Here.
- Livia: That is all of it. Thank you.
- Severa: See you.

**d1 09:08  Severa & Rufus** (the plaza)
- Severa: Hello. You are where I left you, or near it.
- Rufus: Hello. Yes, I have eaten. I would tell you if I had not, which is not true.
- Severa: Something is always about to happen at the plaza. It has not so far.
- Rufus: Yes. That is it exactly.
- Rufus: On a different note, I wonder where the sand came from. The beach was not here before. Or it was. I do not remember.
- Severa: Now I am wondering as well. It is not unpleasant.
- Severa: Off I go. I will not look back, which is a lie.
- Rufus: Mind how you go. There is a lot of ground.
- Severa: Mm. See you.

**d1 09:08  Corvus & Tertia** (Horatius House)
- Corvus: Ah. Company. I had been preparing for none.
- Tertia: Corvus. Yes. Hello.
- Corvus: Have you heard anything? About anyone. About anything.
- Tertia: No. I looked, though.
- Tertia: And Quinta? How is Quinta getting on?
- Corvus: Quinta is in a good mood. I have decided not to question it.
- Corvus: I should go. Something is probably waiting for me.
- Tertia: Goodbye, Corvus. It was a good length.
- Corvus: And the same to you, exactly.

**d1 10:00  Nero & Tipping** (the lanes)
- Nero: That was my house. It was there this morning.

**d1 10:00  Corvus & Tipping** (the lanes)
- Corvus: I am using this. I am using this right now.

**d1 10:06  Secunda & Quinta** (the plaza)
- Secunda: Quinta. Good. I was about to go and look for you. For no particular reason.
- Quinta: Hello. I was about to say that.
- Secunda: Probably, I have stood at the plaza often enough to know where the ground is uneven.
- Quinta: Mm. Yes. I would put it that way.
- Secunda: Unrelated, but any news?
- Quinta: On a different note, for what it is worth, I heard that Tipping got shut in by a door block. I have no reason to doubt it, and no reason to believe it.
- Secunda: That does not sound like the island I know.
- Quinta: My neighbour talks to his turnips. They have never disagreed with him. I envy that.
- Secunda: Ha. That is exactly the right size for a joke.
- Quinta: Well. The day will not do itself.
- Secunda: Take care, Quinta. The island is small but it has edges.
- Quinta: Be well, then.

**d1 10:20  Corvus & Varro** (the lanes)
- Corvus: Have you eaten? I ask every time. The answer is never the point.
- Varro: Hello. I am small, but I am here.
- Corvus: The farmer work goes on. It does not seem to mind whether I am there.
- Varro: Somebody told me his wall was holding up the ceiling. It was the other way round. He was very calm about it.
- Corvus: Ha. Good. I will repeat that to somebody who has not heard it.
- Corvus: I have to get back. I will not say to what.
- Varro: Bye. Do not tell them where I went.
- Corvus: Goodbye. It was good.

**d1 12:40  Rufus & Nero** (the plaza)
- Rufus: It is you. I had hoped for someone else, and then I thought: no.
- Nero: Rufus. Yes. Hello.
- Rufus: Not much happens at the plaza. I find I like that.
- Nero: Yes. I think so.
- Nero: Is it lunch yet? It feels like lunch.
- Rufus: Quite. It is what I think too.
- Rufus: I saw it myself, so I can tell you. Tipping knocked the wall out while Corvus was on the privy.
- Nero: Poor Corvus.
- Nero: Anyway. How is life, then? Tell me before everyone else does.
- Rufus: Well enough. I have checked.
- Rufus: Here is something. Tipping pulled Corvus's house down.
- Nero: That is hard on Corvus. I hope someone brought them something to eat.
- Nero: My neighbour talks to his turnips. They have never disagreed with him. I envy that.
- Rufus: Ha. Good. I will repeat that to somebody who has not heard it.
- Nero: Right. The afternoon will want me soon.
- Rufus: Be well. I mean it in the ordinary way.
- Nero: Bye.

**d1 13:26  Corvus & Tertia** (the lanes)
- Corvus: Tertia. Yes. There you are.
- Tertia: Hello. I am pleased and slightly startled.
- Corvus: What is Livia like? I would like to know before I have to find out.
- Tertia: I am fond of Livia. She is my child. I do not say that about many people.
- Corvus: Unrelated, but Varro is 9 now. I did not see it happen. I looked away once.
- Tertia: You must be proud. I would be. Is that the word? Yes.
- Corvus: Do you know where Paullus is? I am not worried. I would like to know.
- Tertia: I do not know where Paullus is. Nobody tells me anything on this island, and then I am surprised.
- Corvus: I picked up a flower. The transaction went smoothly. I was suspicious of that.
- Tertia: I see.
- Tertia: Something is always about to happen at the lanes. It has not so far.
- Corvus: Anyway. The farmer work goes on. It does not seem to mind whether I am there.
- Corvus: I have a few things to be near. I will go and be near them.
- Tertia: See you. I say it as a matter of course.
- Corvus: Off you go. I will watch for a moment.

**d1 13:32  Livia & Varro** (the plaza)
- Livia: There you are. I counted. You were still one.
- Varro: Hello. Yes, I have eaten. I would tell you if I had not, which is not true.
- Livia: I have stood at the plaza often enough to know where the ground is uneven.
- Varro: I know. I was going to say that.
- Varro: Unrelated, but you should know Corvus. Tipping pulled Corvus's house down. That is all I will say.
- Livia: I think so too. I had hoped it was only me.
- Livia: That is the end of what I had.
- Varro: Bye. I am going to go and do something. I will not say what.
- Livia: Right. Until then.

**d1 15:00  Quinta & Paullus** (the plaza)
- Quinta: Paullus. Busy?
- Paullus: Quinta. The usual?
- Quinta: I would like 4 barley seeds.
- Paullus: 4 denarii. I did not set the price. I only repeat it.
- Quinta: There. Count it.
- Paullus: That is all of it. Thank you.
- Quinta: See you.

**d1 15:38  Corvus & Secunda** (the lanes)
- Corvus: Hello, Secunda. I will say it first this time.
- Secunda: Hello, Corvus. I was hoping it would be you.
- Corvus: You brought up Varro before. I remembered. Is there anything new?
- Secunda: There is no news. That is also a kind of news.
- Secunda: I like tomatoes very much. It is the sort of thing a person might remember.
- Corvus: Noted. I will remember that. I remember things.
- Corvus: I should go. I will pretend I have a reason.
- Secunda: Look after yourself. Somebody has to, and I am here.
- Corvus: And you.

**d1 16:10  Severa & Tertia** (the lanes)
- Severa: Tertia. Good. I was about to go and look for you. For no particular reason.
- Tertia: Severa. Yes. Hello.
- Severa: What do you make of Livia?
- Tertia: Livia is one of the good ones. She is my child.
- Tertia: What are grain going for? I would like an exact figure.
- Severa: 3 denarii each. I wrote it down.
- Tertia: Fair. Thank you.
- Severa: On that subject, how is Livia?
- Tertia: Livia is well. Busy.
- Tertia: Between us. Rufus pulled Corvus's house down.
- Severa: Poor Corvus.
- Severa: Are you keeping well? I ask in case.
- Tertia: Fine. Nothing to report. That is a report of a kind.
- Severa: I should get on. The day has noticed me.
- Tertia: Take care of the next hour. I will take care of this one.
- Severa: See you. I will be here, or near.

**d1 16:48  Livia & Corvus** (the plaza)
- Livia: There you are. I was about to look for you, which is not the same as worrying.
- Corvus: Hello, love. I am here. It is where I live.
- Livia: Do you know where Paullus is? I am not worried. I would like to know.
- Corvus: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Corvus: On a different note, something is always about to happen at the plaza. It has not so far.
- Livia: Mm.
- Corvus: Last time you mentioned Paullus. I have been thinking about it, in the background.
- Livia: It is much as it was. Thank you for remembering. People do not, usually.
- Corvus: I sometimes wonder what the sea does when nobody is looking. I assume the same thing.
- Livia: I could not say. I have a feeling it is better not to.
- Corvus: I have a soft spot for Tertia. We have talked a few times.
- Livia: You are not the only one.
- Corvus: How are you? I mean really, not the answer you give the baker.
- Livia: About a five. A good, honest five.
- Corvus: That is the end of what I had.
- Livia: I will see you at supper. I will be the one who is hungry.
- Corvus: Goodbye. It was good.

**d1 16:50  Secunda & Quinta** (the plaza)
- Secunda: Afternoon, Quinta.
- Quinta: Hello. I am pleased and slightly startled.
- Secunda: What is Corvus like? I would like to know before I have to find out.
- Quinta: I am fond of Corvus. Tipping pulled Corvus's house down. I do not say that about many people.
- Secunda: Has anything happened? Anything at all. I will take a small one.
- Quinta: No. I looked, though.
- Quinta: How is the day treating you? I mean honestly.
- Secunda: Fine. There is a small noise in my left knee, which is the news.
- Secunda: If you could have one thing, which would it be? I am only asking.
- Quinta: Turnips. If you are asking. I rarely say it aloud.
- Secunda: I will leave you to it. You were doing something.
- Quinta: Take care of the next hour. I will take care of this one.
- Secunda: Right. Until then.

**d1 17:06  Livia & Severa** (the plaza)
- Livia: Good. You are here. I was about to start talking to myself.
- Severa: Ah. Hello. I had a feeling.
- Livia: You may want to stand still for this.
- Severa: Please. Go ahead.
- Livia: I saw it myself, so I can tell you. Tipping knocked the wall out while Corvus was on the privy.
- Severa: That is almost too good. I will need a minute.
- Severa: What is Varro like? I would like to know before I have to find out.
- Livia: I am fond of Varro. I heard what Corvus thinks of Varro. I do not say that about many people.
- Severa: Not much happens at the plaza. I find I like that.
- Livia: Anyway. What do you do with your days, Severa? I am only asking out of interest.
- Severa: I am a baker. It is a better job than it sounds, or exactly as good.
- Livia: Well. That is that, for now.
- Severa: Goodbye, Livia.
- Livia: Mm. See you.

**d1 17:26  Rufus & Varro** (the plaza)
- Rufus: Evening, Varro.
- Varro: Hello. I am small, but I am here.
- Rufus: I wonder where the sand came from. The beach was not here before. Or it was. I do not remember.
- Varro: I could not say. I have a feeling it is better not to.
- Rufus: Unrelated, but I am hungry. Where would you go for a meal? I am asking for a friend, who is me.
- Varro: Ask around. Somebody has bread. Someone always has bread.
- Varro: On a different note, if you could have one thing, which would it be? I am only asking.
- Rufus: I like bread. That has been true for a long time.
- Rufus: Anyway. I was there. Tipping pulled Corvus's house down. I stood very still.
- Varro: That is hard on Corvus. I hope someone brought them something to eat.
- Varro: Here is something. Tipping knocked the wall out while Corvus was on the privy.
- Rufus: I should not laugh. I am, a little.
- Rufus: It will be dark soon. I find I am prepared for that.
- Varro: Mm. Yes. I would put it that way.
- Varro: And you? How are things on your side of the island?
- Rufus: Well enough. I have checked.
- Varro: I have to go. There is a thing I am in the middle of.
- Rufus: Be well. I mean it in the ordinary way.
- Varro: Be well, then.

**d1 17:32  Corvus & Varro** (the plaza)
- Corvus: Varro. Home. The light is going and I count you every evening.

**d1 18:08  Secunda & Brutus** (the plaza)
- Secunda: Brutus. Come in. It is getting dark and I would like you inside.

**d1 18:20  Corvus & Quinta** (the plaza)
- Corvus: Hello. You are where I left you, or near it.
- Quinta: Hello. Yes, I have eaten. I would tell you if I had not, which is not true.
- Corvus: Varro is 9 now. I did not see it happen. I looked away once.
- Quinta: That is wonderful. They are quite something at that age.
- Corvus: On a different note, what do you make of Livia?
- Quinta: Livia is one of the good ones. She is my parent.
- Corvus: Do you know where Paullus is? I am not worried. I would like to know.
- Quinta: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Corvus: Anyway. You brought up Varro before. I remembered. Is there anything new?
- Quinta: There is no news. That is also a kind of news.
- Corvus: How is Livia?
- Quinta: Livia is well. Busy.
- Corvus: Off I go. I will not look back, which is a lie.
- Quinta: Take care, Corvus. The island is small but it has edges.
- Corvus: Off you go. I will watch for a moment.

**d1 18:30  Corvus & Secunda** (the plaza)
- Corvus: Hello, Secunda.
- Secunda: Yes. Hello. It is that time.
- Corvus: I have been thinking about who pulled my house down. I keep arriving at you.
- Secunda: It was not me. I was somewhere else. I am nearly sure.
- Corvus: You are not a good liar. It is not an insult.
- Corvus: Any news?
- Secunda: Nothing I would call news. The tide is where it was.
- Secunda: Last time you mentioned tomatoes. I have been thinking about it, in the background.
- Corvus: It is much as it was. Thank you for remembering. People do not, usually.
- Corvus: I sometimes wonder what the sea does when nobody is looking. I assume the same thing.
- Secunda: Now I am wondering as well. It is not unpleasant.
- Secunda: Brutus is 3 now. I did not see it happen. I looked away once.
- Corvus: You must be proud. I would be. Is that the word? Yes.
- Corvus: What is Brutus like? I would like to know before I have to find out.
- Secunda: I am fond of Brutus. He is my child. I do not say that about many people.
- Corvus: I will let you get on. I have the feeling you have somewhere to be, and so do I.
- Secunda: See you. Same place, same time, roughly.
- Corvus: Yes. Goodbye.

**d1 18:50  Tertia & Secunda** (the plaza)
- Tertia: Secunda. There you are. Exactly where I expected.
- Secunda: Hello.
- Tertia: What do you make of Brutus?
- Secunda: Brutus is one of the good ones. He is my child.
- Secunda: On that subject, my Brutus is 3. It is going well. I am rarely asked.
- Tertia: That is wonderful. They are quite something at that age.
- Tertia: Related to that, how is Brutus? I realised I had not asked.
- Secunda: Brutus is well. Busy.
- Secunda: I asked for a loaf of yesterday. They said they would have one tomorrow. I have decided to wait.
- Tertia: Oh, no. And yet.
- Secunda: I should go. I will pretend I have a reason.
- Tertia: Look after yourself. Somebody has to, and I am here.
- Secunda: And you.

**d1 19:00  Quinta & Tertia** (the plaza)
- Quinta: Hello. I see you have arrived, as one does.
- Tertia: Good. Hello. That is out of the way.
- Quinta: And Livia? How is Livia getting on?
- Tertia: Livia is well. Busy.
- Tertia: Unrelated, but it will be dark soon. I find I am prepared for that.
- Tertia: On a different note, I have a soft spot for Secunda. I heard what Rufus thinks of Secunda.
- Quinta: I think so too. I had hoped it was only me.
- Tertia: I will let you get on. I have the feeling you have somewhere to be, and so do I.
- Quinta: Mind how you go. There is a lot of ground.
- Tertia: And the same to you, exactly.

**d1 19:08  Secunda & Quinta** (the plaza)
- Secunda: Hello. I did not expect to see you, and yet.
- Quinta: Hello, Secunda. I was hoping it would be you.
- Secunda: It is 19:08. I checked.
- Secunda: It is a hunch. Was it you who pulled Corvus's house down?
- Quinta: No. You are thinking of somebody else.
- Secunda: Then I was misinformed. It happens on an island this size.
- Quinta: Unrelated, but how are things with you, Secunda?
- Secunda: Fine. I was going to say I was well and it is true, which surprised me.
- Secunda: The builder work went quietly today. I do not entirely trust that.
- Quinta: I agree. I wish I did not.
- Secunda: I will let the conversation end here. It has had a good run.
- Quinta: Good day to you. It is, so far.
- Secunda: Quite. Goodbye.

**d1 20:10  Tertia & Nero** (the lanes)
- Tertia: Ah, Nero. I was just thinking of something else.
- Nero: Hello. I was doing something important.
- Tertia: I asked for a loaf of yesterday. They said they would have one tomorrow. I have decided to wait.
- Nero: Ha. That is exactly the right size for a joke.
- Tertia: How is Severa?
- Nero: Severa is worn out. I keep telling them to sit down.
- Nero: If you could have one thing, which would it be? I am only asking.
- Tertia: I do not like fish. It is not a strong feeling. It is a stable one.
- Tertia: I have a soft spot for Paullus. Paullus's house came down, and Tipping was there.
- Nero: You are not the only one.
- Tertia: Right. The afternoon will want me soon.
- Nero: Bye. Do not tell them where I went.
- Tertia: Mm. See you.

**d1 20:14  Secunda & Corvus** (the lanes)
- Secunda: Ah. Company. I had been preparing for none.
- Corvus: Ah. Hello. I had a feeling.
- Secunda: I sometimes wonder what the sea does when nobody is looking. I assume the same thing.
- Corvus: I could not say. I have a feeling it is better not to.
- Corvus: On a different note, it is a hunch. Was it you who knocked the wall out while I was on the privy?
- Secunda: No. You are thinking of somebody else.
- Corvus: Ah. Then it was someone who looks like you.
- Corvus: How are you holding up?
- Secunda: Fine. There is a small noise in my left knee, which is the news.
- Secunda: Unrelated, but I asked for a loaf of yesterday. They said they would have one tomorrow. I have decided to wait.
- Corvus: Ha. Good. I will repeat that to somebody who has not heard it.
- Corvus: On a different note, the farmer work went quietly today. I do not entirely trust that.
- Secunda: You are right. I have been thinking so since Tuesday.
- Secunda: Brutus is 3 now. I did not see it happen. I looked away once.
- Corvus: You must be proud. I would be. Is that the word? Yes.
- Secunda: I will let you get on. I have the feeling you have somewhere to be, and so do I.
- Corvus: Goodbye, Secunda.
- Secunda: See you. I will be here, or near.

**d1 20:30  Quinta & Livia** (the lanes)
- Quinta: Evening, Livia.
- Livia: Hello. I was about to say that.
- Quinta: How is Varro?
- Livia: Varro is well. Busy.
- Livia: On that subject, Varro is 9 now. I did not see it happen. I looked away once.
- Quinta: That is wonderful. They are quite something at that age.
- Quinta: Anyway. For what it is worth, not much happens at the lanes. I find I like that.
- Livia: It is.
- Livia: I sold 3 flowers. The stall took them as if it had been expecting them.
- Quinta: Good.
- Livia: That is the end of what I had.
- Quinta: Bye. I will be home for supper. Probably before it.
- Livia: Goodbye.

**d1 20:50  Corvus & Quinta** (the lanes)
- Corvus: Have you eaten? I ask every time. The answer is never the point.
- Quinta: Evening. It has been an evening for a while now.
- Corvus: Last time you mentioned Livia. I have been thinking about it, in the background.
- Quinta: There is no news. That is also a kind of news.
- Corvus: Unrelated, but I asked for a loaf of yesterday. They said they would have one tomorrow. I have decided to wait.
- Quinta: Ha. That is exactly the right size for a joke.
- Corvus: On a different note, the farmer work goes on. It does not seem to mind whether I am there.
- Quinta: Yes. That is it exactly.
- Corvus: Something is always about to happen at the lanes. It has not so far.
- Quinta: What do you make of Varro?
- Corvus: I am fond of Varro. He made me laugh. I do not say that about many people.
- Quinta: That is the end of what I had.
- Corvus: Wrap up warm. It is a mild island, and still.
- Quinta: Right. Until then.

**d1 20:52  Secunda & Severa** (the plaza)
- Secunda: Severa. Yes. There you are.
- Severa: Evening. It has been an evening for a while now.
- Secunda: I wonder why the sky is the shape it is. It must have been decided by somebody.
- Severa: Now I am wondering as well. It is not unpleasant.
- Severa: I baked 8 bread. The room smelled like a decision.
- Secunda: And how did it go?
- Secunda: My Brutus is 3. It is going well. I am rarely asked.
- Severa: You must be proud. I would be. Is that the word? Yes.
- Severa: I am very tired. The tiredness has started to feel like a place.
- Secunda: Everyone has days. Some have more of them.
- Severa: I will leave you to it. You were doing something.
- Secunda: Be well. I mean it in the ordinary way.
- Severa: Goodbye. It was good.

**d1 23:26  Severa & Varro** (the plaza)
- Severa: You are up late, Varro. So am I. I do not know what that proves.
- Varro: Hello. I was doing something important.
- Severa: Somebody told me his wall was holding up the ceiling. It was the other way round. He was very calm about it.
- Varro: Ha. Good. I will repeat that to somebody who has not heard it.
- Varro: In my experience, I heard that Paullus got shut in by a wall block. I have no reason to doubt it, and no reason to believe it.
- Severa: Mm. Noted.
- Severa: Off I go. I will not look back, which is a lie.
- Varro: Bye. I am going to go and do something. I will not say what.
- Severa: See you. I will be here, or near.

### Day 3

**d2 00:20  Livia & Tertia** (the plaza)
- Livia: Hello. Is there supper? I am only asking in general.
- Tertia: Hello. I have been standing here on purpose.
- Livia: Last time you mentioned Paullus. I have been thinking about it, in the background.
- Tertia: It is much as it was. Thank you for remembering. People do not, usually.
- Tertia: Anyway. I have a soft spot for Corvus. Tipping pulled Corvus's house down.
- Livia: I think so too. I had hoped it was only me.
- Livia: I will leave you to it. You were doing something.
- Tertia: Wrap up warm. It is a mild island, and still.
- Livia: Right. Until then.

**d2 01:00  Rufus & Nero** (the lanes)
- Rufus: Nero. We have the same eyebrows. I notice every time.
- Nero: What now? I am joking. Hello.
- Rufus: I wonder where the sand came from. The beach was not here before. Or it was. I do not remember.
- Nero: Now I am wondering as well. It is not unpleasant.
- Rufus: Anyway. And Paullus? How is Paullus getting on?
- Nero: Paullus has been low. It is not anything I can fix by talking, so I stay close.
- Nero: Unrelated, but it is said you knock things down. 3 people have said it to me. I counted.
- Rufus: That is not true. It is the kind of thing that gets said.
- Rufus: What is Livia like? I would like to know before I have to find out.
- Nero: I have nothing against Livia. I heard what Tertia thinks of Livia. That is not nothing.
- Nero: I asked for a loaf of yesterday. They said they would have one tomorrow. I have decided to wait.
- Rufus: I have heard that one. I did not mind hearing it again.
- Rufus: You are good to have around. I do not say that to many people.
- Nero: Thank you. I did not expect that.
- Rufus: Well. The day will not do itself.
- Nero: Bye. Do not tell them where I went.
- Rufus: Be well, then.

**d2 02:06  Corvus & Quinta** (the fields)
- Corvus: There you are. I counted. You were still one.
- Quinta: Hello. I am here. I am fine. You do not need to look at me like that.
- Corvus: My neighbour talks to his turnips. They have never disagreed with him. I envy that.
- Quinta: Oh, no. And yet.
- Corvus: The farmer work is the one thing that has not changed since I arrived, and I am glad of it.
- Quinta: Agreed. That is a rare thing.
- Corvus: I am glad you ended up here. I mean it quite exactly.
- Quinta: That is kind. I will think about it later.
- Corvus: Unrelated, but what are carrot seeds going for? I would like an exact figure.
- Quinta: About 2 denarii. I paid it and did not enjoy it.
- Corvus: Fair. Thank you.
- Corvus: Do you know where Paullus is? I am not worried. I would like to know.
- Quinta: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Quinta: Between us, I am fond of Varro. I heard what Corvus thinks of Varro.
- Corvus: You are not the only one.
- Quinta: Right. The afternoon will want me soon.
- Corvus: Do not be late for supper. I will notice and I will say nothing.
- Quinta: Goodbye.

**d2 03:08  Severa & Tertia** (the plaza)
- Severa: You are up late, Tertia. So am I. I do not know what that proves.
- Tertia: Yes. Hello. It is that time.
- Severa: And you? How are things on your side of the island?
- Tertia: Fine. The day has not asked much of me.
- Tertia: You brought up Livia before. I remembered. Is there anything new?
- Severa: There is no news. That is also a kind of news.
- Severa: I will let the conversation end here. It has had a good run.
- Tertia: Goodbye, Severa.
- Severa: Yes. Goodbye.

**d2 06:36  Rufus & Nero** (the lanes)
- Rufus: Good morning. I woke at some point before this and have been waiting for someone to say it to.
- Nero: Morning. I was thinking about nothing in particular.
- Rufus: Last time you mentioned Livia. I have been thinking about it, in the background.
- Nero: It is much as it was. Thank you for remembering. People do not, usually.
- Rufus: Have you heard anything? About anyone. About anything.
- Nero: I saw it myself, so I can tell you. Tipping pulled Corvus's house down.
- Rufus: That is hard on Corvus. I hope someone brought them something to eat.
- Nero: Do you know where Paullus is? I am not worried. I would like to know.
- Rufus: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Rufus: On a different note, I am glad you ended up here. I mean it quite exactly.
- Nero: That is kind. I will think about it later.
- Nero: Anyway. Between us, I am fond of Severa. I heard what Rufus thinks of Severa.
- Rufus: I think so too. I had hoped it was only me.
- Rufus: Something is always about to happen at the lanes. It has not so far.
- Nero: I know. I was going to say that.
- Rufus: Off I go. I will not look back, which is a lie.
- Nero: Bye. I am going to go and do something. I will not say what.
- Rufus: Off you go. I will watch for a moment.

**d2 07:44  Severa & Secunda** (The Bakery)
- Severa: Bread. 2 denarii. That is all I have to say about it.

**d2 07:44  Quinta & Varro** (the plaza)
- Quinta: It is you. I had hoped for someone else, and then I thought: no.
- Varro: What now? I am joking. Hello.
- Quinta: You are good to have around. I do not say that to many people.
- Varro: Thank you. I did not expect that.
- Varro: If you could have one thing, which would it be? I am only asking.
- Quinta: Turnips. If you are asking. I rarely say it aloud.
- Quinta: I will let you get on. I have the feeling you have somewhere to be, and so do I.
- Varro: Bye. Do not tell them where I went.
- Quinta: And the same to you, exactly.

**d2 08:22  Severa & Secunda** (the lanes)
- Severa: Morning, Secunda. It is 8:22.
- Secunda: Hello, Severa. I was hoping it would be you.
- Severa: I would be careful around Tipping. They knock things down. I say it only because it is true.
- Secunda: Thank you. I will take it under advisement. It is a good word, advisement.
- Secunda: I like tomatoes very much. It is the sort of thing a person might remember.
- Severa: Is that so. I have written it down in my head.
- Secunda: The morning has a lot left in it.
- Severa: You are right. I have been thinking so since Tuesday.
- Severa: Unrelated, but you brought up Brutus before. I remembered. Is there anything new?
- Secunda: There is no news. That is also a kind of news.
- Severa: I have a few things to be near. I will go and be near them.
- Secunda: Look after yourself. Somebody has to, and I am here.
- Severa: Right. Until then.

**d2 09:20  Varro & Tertia** (the plaza)
- Varro: Hello, Tertia. I found something. I will not say what.
- Tertia: Ah, Varro. The island does arrange things.
- Varro: You brought up Paullus before. I remembered. Is there anything new?
- Tertia: There is no news. That is also a kind of news.
- Tertia: Staying with it for a moment, do you know where Paullus is? I am not worried. I would like to know.
- Varro: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Varro: I have to go. There is a thing I am in the middle of.
- Tertia: Take care, Varro. The island is small but it has edges.
- Varro: Bye.

**d2 10:56  Corvus & Varro** (the plaza)
- Corvus: Hello. You are where I left you, or near it.
- Varro: Morning. I was thinking about nothing in particular.
- Corvus: Are you behaving? Do not answer.
- Varro: Fine. I found a very good stick.
- Varro: How has your day been? I mean the whole of it.
- Corvus: On a different note, I bought a flower today.
- Varro: And how did it go?
- Varro: I will leave you to it. You were doing something.
- Corvus: Wrap up warm. It is a mild island, and still.
- Varro: Off you go. I will watch for a moment.

**d2 11:08  Quinta & Paullus** (the plaza)
- Quinta: Paullus. Busy?
- Paullus: Hello. What do you need?
- Quinta: I am here for 3 barley seeds. I thought about it on the way.
- Paullus: That will be 3 denarii.
- Quinta: Here.
- Paullus: Thank you.
- Quinta: Goodbye.

**d2 13:14  Severa & Secunda** (The Bakery)
- Severa: If anyone needs bread, I have some.
- Secunda: I will think about it. I will probably come back.

**d2 13:26  Rufus & Livia** (the plaza)
- Rufus: Livia. There you are. Exactly where I expected.
- Livia: Hello, Rufus. I was hoping it would be you.
- Rufus: You brought up Livia before. I remembered. Is there anything new?
- Livia: There is no news. That is also a kind of news.
- Rufus: Anyway. I have a soft spot for Varro. We have talked a few times.
- Livia: You are not the only one.
- Rufus: I have stood at the plaza often enough to know where the ground is uneven.
- Livia: That is right. I am glad somebody said it.
- Livia: What do you like? I am not asking for a reason. I am collecting.
- Rufus: I do not like herbs. It is not a strong feeling. It is a stable one.
- Rufus: Unrelated, but what are grain going for? I would like an exact figure.
- Livia: About 3 denarii. I paid it and did not enjoy it.
- Rufus: Good to know.
- Rufus: Off I go. I will not look back, which is a lie.
- Livia: Take care of the next hour. I will take care of this one.
- Rufus: Mm. See you.

**d2 13:44  Corvus & Corvus** (the fields)
- Corvus: I put it down somewhere. I put it down on purpose.

**d2 13:56  Severa & Secunda** (The Bakery)
- Severa: Fresh bread. As fresh as anything here.
- Secunda: Not now. Thank you.

**d2 14:40  Nero & Quinta** (the plaza)
- Nero: Hello. I am small, but I noticed you.
- Quinta: Hello, Nero. I was hoping it would be you.
- Nero: How are things with you, Quinta?
- Quinta: Fine. I was going to say I was well and it is true, which surprised me.
- Nero: What are turnip seeds going for? I would like an exact figure.
- Quinta: 2 denarii each. I wrote it down.
- Nero: That is more than I thought.
- Quinta: On a different note, I sometimes wonder what the sea does when nobody is looking. I assume the same thing.
- Nero: Now I am wondering as well. It is not unpleasant.
- Quinta: I should go. I will pretend I have a reason.
- Nero: Bye. I am going to go and do something. I will not say what.
- Quinta: Yes. Goodbye.

**d2 15:02  Corvus & Varro** (the fields)
- Corvus: Hello, Varro. I will say it first this time.
- Varro: Hello. I am small, but I am here.
- Corvus: The afternoon is the same length as yesterday's, and feels longer.
- Varro: I know. I was going to say that.
- Varro: Unrelated, but what are carrot seeds going for? I would like an exact figure.
- Corvus: 2 denarii each. I wrote it down.
- Varro: Fair. Thank you.
- Varro: Can I go now? I am asking nicely.
- Corvus: Do not be late for supper. I will notice and I will say nothing.
- Varro: Bye.

**d2 15:04  Quinta & Paullus** (the plaza)
- Quinta: Hello.
- Paullus: Quinta. The usual?
- Quinta: A barley seed, please.
- Paullus: One denarius.
- Quinta: I have less than I thought. I will leave it.
- Paullus: It will be here tomorrow. Probably.

**d2 16:50  Secunda & Severa** (the lanes)
- Secunda: Severa. Good. I had a thought and nobody to give it to.
- Severa: Hello. I have been standing here on purpose.
- Secunda: I have a soft spot for Nero.
- Severa: I think so too. I had hoped it was only me.
- Severa: Unrelated, but how are you getting on?
- Secunda: Steady. That is the word I have settled on.
- Severa: The baker work goes on. It does not seem to mind whether I am there.
- Secunda: Yes. I think so.
- Secunda: I asked for a loaf of yesterday. They said they would have one tomorrow. I have decided to wait.
- Severa: I have heard that one. I did not mind hearing it again.
- Secunda: Right. The afternoon will want me soon.
- Severa: Take care of the next hour. I will take care of this one.
- Secunda: And the same to you, exactly.

**d2 17:38  Corvus & Quinta** (the fields)
- Corvus: Evening, Quinta.
- Quinta: Hello. Yes, I have eaten. I would tell you if I had not, which is not true.
- Corvus: Are you behaving? Do not answer.
- Quinta: Well enough. I have checked.
- Quinta: On a different note, you should know Varro. I heard what Corvus thinks of Varro. That is all I will say.
- Corvus: I think so too. I had hoped it was only me.
- Corvus: I should get on. The day has noticed me.
- Quinta: Bye. I will be home for supper. Probably before it.
- Corvus: See you. I will be here, or near.

**d2 18:02  Corvus & Corvus** (the lanes)
- Corvus: There will be rain, or there will not. I have decided to be ready for both.

**d2 18:02  Corvus & Varro** (the lanes)
- Corvus: Varro. Come in. It is getting dark and I would like you inside.

**d2 18:08  Livia & Rufus** (the plaza)
- Livia: Fresh turnips. As fresh as anything here.

**d2 18:10  Corvus & Varro** (The Bakery)
- Corvus: Have you eaten? I ask every time. The answer is never the point.
- Varro: Hello. I was doing something important.
- Corvus: Varro is 9 now. I did not see it happen. I looked away once.
- Varro: You must be proud. I would be. Is that the word? Yes.
- Varro: I like it here. There is room to run, and nobody has said not to.
- Corvus: Agreed. That is a rare thing.
- Corvus: Unrelated, but how are you? I would like to know the real number.
- Varro: Fine. I was going to say I was well and it is true, which surprised me.
- Varro: Anyway. Any news?
- Corvus: It may not be true. Tipping got shut in by a door block.
- Varro: Mm. Noted.
- Corvus: Do you know where Paullus is? I am not worried. I would like to know.
- Varro: I do not know where Paullus is. Nobody tells me anything on this island, and then I am surprised.
- Varro: I am glad you ended up here. I mean it quite exactly.
- Corvus: That is kind. I will think about it later.
- Corvus: Do you get on with Livia? Be honest. I am only curious.
- Varro: Livia is one of the good ones. I heard what Corvus thinks of Livia.
- Corvus: I will let the conversation end here. It has had a good run.
- Varro: Bye. I am going to go and do something. I will not say what.
- Corvus: And you.

**d2 18:32  Severa & Varro** (the lanes)
- Severa: The light is going. Hello, Varro.
- Varro: Hello. I am small, but I am here.
- Severa: The baker work went quietly today. I do not entirely trust that.
- Varro: Do you know where Paullus is? I am not worried. I would like to know.
- Severa: I do not know where Paullus is. Nobody tells me anything on this island, and then I am surprised.
- Severa: I will leave you to it. You were doing something.
- Varro: Bye. Do not tell them where I went.
- Severa: Mm. See you.

**d2 18:36  Quinta & Tertia** (the plaza)
- Quinta: Hello, Tertia.
- Tertia: Ah. Hello. I had a feeling.
- Quinta: It is 18:36. I checked.
- Tertia: Yes. That is it exactly.
- Tertia: How have you been, since last time? Give me the short version.
- Quinta: Fine. There is a small noise in my left knee, which is the news.
- Quinta: I have to get back. I will not say to what.
- Tertia: Until next time. I will be somewhere.
- Quinta: Off you go. I will watch for a moment.

**d2 18:38  Secunda & Brutus** (the fields)
- Secunda: Brutus. Home. The light is going and I count you every evening.

**d2 19:06  Corvus & Livia** (the plaza)
- Corvus: There you are. I was about to look for you, which is not the same as worrying.
- Livia: There you are. I was thinking about you, in a general way.
- Corvus: Do you get on with Varro? Be honest. I am only curious.
- Livia: I am fond of Varro. I heard what Corvus thinks of Varro. I do not say that about many people.
- Corvus: Unrelated, but it will be dark soon. I find I am prepared for that.
- Livia: How are you? I mean really, not the answer you give the baker.
- Corvus: Fine. I looked into it and there is nothing to report.
- Corvus: On a different note, do you know what grain cost today?
- Livia: 3 denarii each. I wrote it down.
- Corvus: That is more than I thought.
- Livia: On that subject, my Varro is 9. It is going well. I am rarely asked.
- Corvus: You must be proud. I would be. Is that the word? Yes.
- Corvus: On a different note, it is a good place to stand, at the plaza. I have tried others.
- Corvus: Well. That is that, for now.
- Livia: I will see you at supper. I will be the one who is hungry.
- Corvus: Goodbye.

**d2 19:56  Rufus & Severa** (the plaza)
- Rufus: Hello. Is there supper? I am only asking in general.
- Severa: Hello. I have been standing here on purpose.
- Rufus: It is a hunch. Was it you who pulled Paullus's house down?
- Severa: It was not me. I was somewhere else. I am nearly sure.
- Rufus: You are not a good liar. It is not an insult.
- Rufus: Unrelated, but it will be dark soon. I find I am prepared for that.
- Severa: That is about right.
- Severa: You should know Paullus. Paullus's house came down, and Tipping was there. That is all I will say.
- Rufus: I think so too. I had hoped it was only me.
- Rufus: Anyway. Somebody told me his wall was holding up the ceiling. It was the other way round. He was very calm about it.
- Severa: Ha. That is exactly the right size for a joke.
- Severa: Anyway. To be fair, I could lie down on almost anything. I have been assessing the ground.
- Rufus: It is.
- Severa: I have a few things to be near. I will go and be near them.
- Rufus: Mind how you go. There is a lot of ground.
- Severa: Quite. Goodbye.

**d2 20:24  Rufus & Quinta** (the plaza)
- Rufus: Quinta. Yes. There you are.
- Quinta: Yes. Hello. It is that time.
- Rufus: And Livia? How is Livia getting on?
- Quinta: Livia is in a good mood. I have decided not to question it.
- Rufus: Anyway. What do you do with your days, Quinta? I am only asking out of interest.
- Quinta: I am a stonecutter. I have done it since I got here. Before that I was somebody else.
- Rufus: What did you do today? In order, if you can.
- Quinta: The seed stall has cabbage seeds now. I stood and looked at it for a while.
- Rufus: Good.
- Rufus: I asked for a loaf of yesterday. They said they would have one tomorrow. I have decided to wait.
- Quinta: Ha. Good. I will repeat that to somebody who has not heard it.
- Rufus: I have a few things to be near. I will go and be near them.
- Quinta: Look after yourself. Somebody has to, and I am here.
- Rufus: Be well, then.

**d2 20:36  Secunda & Corvus** (The Quiet Room)
- Secunda: Evening, Corvus.
- Corvus: Hello. Come to think of it, I was hoping.
- Secunda: How are things with you, Corvus?
- Corvus: Fine. The day has not asked much of me.
- Corvus: It will be dark soon. I find I am prepared for that.
- Corvus: Anyway. Do you know where Paullus is? I am not worried. I would like to know.
- Secunda: I do not know where Paullus is. Nobody tells me anything on this island, and then I am surprised.
- Secunda: You are good to have around. I do not say that to many people.
- Corvus: Thank you. I did not expect that.
- Corvus: On a different note, I saw it myself, so I can tell you. Severa gave to Varro when Varro had nothing.
- Secunda: Well. That is good. I will think about it all afternoon.
- Secunda: I have done the builder work long enough to stop asking why.
- Corvus: Quite. It is what I think too.
- Secunda: I have to get back. I will not say to what.
- Corvus: Be well. I mean it in the ordinary way.
- Secunda: Goodbye. It was good.

**d2 20:40  Rufus & Tertia** (the plaza)
- Rufus: Evening, Tertia.
- Tertia: Hello. I am pleased and slightly startled.
- Rufus: What is Livia like? I would like to know before I have to find out.
- Tertia: I am fond of Livia. She is my child. I do not say that about many people.
- Rufus: Do you know where Paullus is? I am not worried. I would like to know.
- Tertia: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Rufus: I sometimes wonder what the sea does when nobody is looking. I assume the same thing.
- Tertia: I could not say. I have a feeling it is better not to.
- Tertia: Anyway. How is Severa?
- Rufus: Severa is worn out. I keep telling them to sit down.
- Rufus: It will be dark soon. I find I am prepared for that.
- Tertia: Yes. I think so.
- Rufus: Well. The day will not do itself.
- Tertia: Good day to you. It is, so far.
- Rufus: And the same to you, exactly.

**d2 20:40  Varro & Severa** (the plaza)
- Varro: Are you going somewhere? I could come. I would be quiet. Mostly.
- Severa: Evening. It has been an evening for a while now.
- Varro: What do you make of Nero?
- Severa: I am fond of Nero. He was kind about me. I do not say that about many people.
- Varro: On a different note, are you keeping well? I ask in case.
- Severa: Tired, but upright.
- Varro: You are good to have around. I do not say that to many people.
- Severa: Thank you. I did not expect that.
- Varro: What are grain going for? I would like an exact figure.
- Severa: About 3 denarii. I paid it and did not enjoy it.
- Varro: Good to know.
- Severa: Any news?
- Varro: Anyway. I was there. Livia smells like a midden. I stood very still.
- Severa: I see.
- Severa: I should get on. The day has noticed me.
- Varro: Take care, Severa. The island is small but it has edges.
- Severa: Yes. Goodbye.

**d2 20:58  Rufus & Secunda** (the plaza)
- Rufus: Hello. It is a day of some kind.
- Secunda: Evening. It has been an evening for a while now.
- Rufus: I have a soft spot for Brutus.
- Secunda: I think so too. I had hoped it was only me.
- Rufus: Staying with it for a moment, and Brutus? How is Brutus getting on?
- Secunda: Brutus is well. Busy.
- Rufus: How have you been, since last time? Give me the short version.
- Secunda: Well enough. I have checked.
- Rufus: It will be dark soon. I find I am prepared for that.
- Secunda: You are right. I have been thinking so since Tuesday.
- Secunda: Unrelated, but do you know where Paullus is? I am not worried. I would like to know.
- Rufus: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Secunda: I have to get back. I will not say to what.
- Rufus: See you. I say it as a matter of course.
- Secunda: Right. Until then.

**d2 21:50  Nero & Quinta** (the plaza)
- Nero: Quinta. There you are. Exactly where I expected.
- Quinta: Evening. It has been an evening for a while now.
- Nero: I am tired. Not sleepy. Tired in a way a bed would not fix at once.
- Quinta: My neighbour talks to his turnips. They have never disagreed with him. I envy that.
- Nero: I have heard that one. I did not mind hearing it again.
- Nero: I am very tired. The tiredness has started to feel like a place.
- Quinta: It will pass. Not today, probably.
- Quinta: On a different note, for what it is worth, the seed stall has cabbage seeds on it that nobody ordered. I am not asking.
- Nero: I see.
- Quinta: That is the end of what I had.
- Nero: All the best. I have no better phrase.
- Quinta: And you.

### Day 4

**d3 01:32  Severa & Rufus** (the plaza)
- Severa: Come here. Let me look at you. You are taller or I am less.
- Rufus: Hello. I am here. I am fine. You do not need to look at me like that.
- Severa: My neighbour talks to his turnips. They have never disagreed with him. I envy that.
- Rufus: Oh, no. And yet.
- Rufus: Anyway. Are you well? You look tired. You always look tired. It is part of the family.
- Severa: Worn out. The kind that sits behind the eyes.
- Rufus: How is Nero? I realised I had not asked.
- Severa: Nero is worn out. I keep telling them to sit down.
- Rufus: Have you heard anything? About anyone. About anything.
- Severa: To be fair, I heard that Livia smells like a midden. I have no reason to doubt it, and no reason to believe it.
- Rufus: Mm. Noted.
- Rufus: It is later than it looks.
- Rufus: I will let you get on. I have the feeling you have somewhere to be, and so do I.
- Severa: Wrap up warm. It is a mild island, and still.
- Rufus: Yes. Goodbye.

**d3 01:32  Nero & Quinta** (the plaza)
- Nero: Are you going somewhere? I could come. I would be quiet. Mostly.
- Quinta: Hello. I have been standing here on purpose.
- Nero: Do you know where Severa is? I am not worried. I would like to know.
- Quinta: Severa is at the plaza. I looked, on the way past. I do not know why.
- Quinta: On a different note, I have a soft spot for Paullus. Paullus's house came down, and Tipping was there.
- Nero: You are not the only one.
- Nero: I have to go. There is a thing I am in the middle of.
- Quinta: Take care of the next hour. I will take care of this one.
- Nero: Bye.

**d3 06:38  Severa & Quinta** (the lanes)
- Severa: Morning, Quinta. It is 6:38.
- Quinta: Morning. I was thinking about nothing in particular.
- Severa: How has your day been? I mean the whole of it.
- Quinta: I could not afford turnip seeds. I counted twice.
- Severa: That is a decent day's work.
- Severa: I should go. I will pretend I have a reason.
- Quinta: Take care of the next hour. I will take care of this one.
- Severa: Mm. See you.

**d3 07:08  Livia & Varro** (the fields)
- Livia: Good morning. I woke at some point before this and have been waiting for someone to say it to.
- Varro: Hello. I was doing something important.
- Livia: Somebody told me his wall was holding up the ceiling. It was the other way round. He was very calm about it.
- Varro: I have heard that one. I did not mind hearing it again.
- Varro: I have been thinking about who pulled Paullus's house down. I keep arriving at you.
- Livia: It was not me. I was somewhere else. I am nearly sure.
- Varro: I do not believe you. I would like to.
- Varro: Can I go now? I am asking nicely.
- Livia: Mind how you go. There is a lot of ground.
- Varro: Bye.

**d3 08:20  Tertia & Rufus** (the plaza)
- Tertia: Ah, Rufus. I was just thinking of something else.
- Rufus: Yes. Hello. It is that time.
- Tertia: I wonder why the sky is the shape it is. It must have been decided by somebody.
- Rufus: I could not say. I have a feeling it is better not to.
- Rufus: Unrelated, but the morning has a lot left in it.
- Tertia: Unrelated, but are you keeping well? I ask in case.
- Rufus: Worn out. The kind that sits behind the eyes.
- Rufus: Unrelated, but has anything happened? Anything at all. I will take a small one.
- Tertia: I saw it myself, so I can tell you. Varro smells like a midden.
- Rufus: Well. That is a thing that happened.
- Tertia: I think you should know that people say you knock things down.
- Rufus: That is not true. It is the kind of thing that gets said.
- Tertia: I should get on. The day has noticed me.
- Rufus: Until next time. I will be somewhere.
- Tertia: Off you go. I will watch for a moment.

**d3 08:52  Severa & Varro** (the fields)
- Severa: Hello. I see you have arrived, as one does.
- Varro: Hello, Severa. I was hoping it would be you.
- Severa: Do you know what carrot seeds cost today?
- Varro: About 2 denarii. I paid it and did not enjoy it.
- Severa: Good to know.
- Varro: It is a long day when you are small.
- Varro: Anyway. Last time you mentioned Nero. I have been thinking about it, in the background.
- Severa: It is much as it was. Thank you for remembering. People do not, usually.
- Varro: Anyway. You are good to have around. I do not say that to many people.
- Severa: That is kind. I will think about it later.
- Varro: I like it here. There is room to run, and nobody has said not to.
- Severa: True. It does not make it simpler.
- Varro: Do you get on with Rufus? Be honest. I am only curious.
- Severa: Rufus is one of the good ones. He made me laugh.
- Severa: I have a few things to be near. I will go and be near them.
- Varro: Bye. I am going to go and do something. I will not say what.
- Severa: Quite. Goodbye.

**d3 09:40  Severa & Nero** (the plaza)
- Severa: Morning, Nero. It is 9:40.
- Nero: Hello. Yes, I have eaten. I would tell you if I had not, which is not true.
- Severa: Between us, I am fond of Paullus. Paullus's house came down, and Tipping was there.
- Nero: You are not the only one.
- Severa: I saw it myself, so I can tell you. Tertia smells like a midden.
- Nero: Well. That is a thing that happened.
- Nero: What are grain going for? I would like an exact figure.
- Severa: 3 denarii each. I wrote it down.
- Nero: That is more than I thought.
- Severa: On a different note, how is the day treating you? I mean honestly.
- Nero: I am tired. I am not tired. I am a bit tired.
- Nero: Anyway. I am tired. Not sleepy. Tired in a way a bed would not fix at once.
- Severa: Mm.
- Nero: That is the end of what I had.
- Severa: Do not be late for supper. I will notice and I will say nothing.
- Nero: Goodbye. It was good.

**d3 09:42  Tertia & Corvus** (the lanes)
- Tertia: Good. You are here. I was about to start talking to myself.
- Corvus: Tertia. Yes. Hello.
- Tertia: I am fond of copper ore. I mention it only because it is true.
- Corvus: Noted. I will remember that. I remember things.
- Corvus: My neighbour talks to his turnips. They have never disagreed with him. I envy that.
- Tertia: Ha. That is exactly the right size for a joke.
- Corvus: How is Livia?
- Tertia: Livia is well. Busy.
- Corvus: I sometimes wonder what the sea does when nobody is looking. I assume the same thing.
- Tertia: Now I am wondering as well. It is not unpleasant.
- Corvus: You brought up flowers before. I remembered. Is there anything new?
- Tertia: There is no news. That is also a kind of news.
- Tertia: I will let the conversation end here. It has had a good run.
- Corvus: Look after yourself. Somebody has to, and I am here.
- Tertia: And you.

**d3 09:44  Quinta & Paullus** (the plaza)
- Quinta: Good morning.
- Paullus: Good morning. I have what I have.
- Quinta: I would like a barley seed.
- Paullus: One denarius. I did not set the price. I only repeat it.
- Quinta: There. Count it.
- Paullus: Good. Thank you.
- Quinta: See you.

**d3 10:56  Rufus & Secunda** (the lanes)
- Rufus: Good morning. I woke at some point before this and have been waiting for someone to say it to.
- Secunda: Good. Hello. That is out of the way.
- Rufus: I am very tired. The tiredness has started to feel like a place.
- Secunda: That is hard. I am sorry. It is a small island and we are all here.
- Secunda: I have done the builder work long enough to stop asking why.
- Rufus: Yes. That is it exactly.
- Rufus: Right. The afternoon will want me soon.
- Secunda: Goodbye, Rufus.
- Rufus: See you. I will be here, or near.

**d3 11:56  Rufus & Quinta** (the lanes)
- Rufus: Afternoon, Quinta.
- Quinta: Hello. I was about to say that.
- Rufus: What do you like? I am not asking for a reason. I am collecting.
- Quinta: I like wool. That has been true for a long time.
- Quinta: It is a hunch. Was it you who pulled Paullus's house down?
- Rufus: It was not me. I was somewhere else. I am nearly sure.
- Quinta: Then I was misinformed. It happens on an island this size.
- Quinta: Well. That is that, for now.
- Rufus: Good day to you. It is, so far.
- Quinta: And the same to you, exactly.

**d3 12:16  Varro & Secunda** (the lanes)
- Varro: Hello. I am small, but I noticed you.
- Secunda: Hello to you, in return.
- Varro: Somebody told me his wall was holding up the ceiling. It was the other way round. He was very calm about it.
- Secunda: Ha. Good. I will repeat that to somebody who has not heard it.
- Varro: I wonder why the sky is the shape it is. It must have been decided by somebody.
- Secunda: I could not say. I have a feeling it is better not to.
- Varro: How is Brutus?
- Secunda: Brutus is well. Busy.
- Varro: Here is something. Nero smells like a midden.
- Secunda: Mm. Noted.
- Secunda: What are grain going for? I would like an exact figure.
- Varro: About 3 denarii. I paid it and did not enjoy it.
- Secunda: Fair. Thank you.
- Secunda: I have to get back. I will not say to what.
- Varro: Bye. Do not tell them where I went.
- Secunda: Be well, then.

**d3 12:50  Livia & Livia** (the plaza)
- Livia: There will be rain, or there will not. I have decided to be ready for both.

**d3 12:56  Severa & Quinta** (the lanes)
- Severa: Ah, Quinta. I was just thinking of something else.
- Quinta: Ah, Severa. The island does arrange things.
- Severa: Something is always about to happen at the lanes. It has not so far.
- Quinta: Agreed. That is a rare thing.
- Quinta: How is the day treating you? I mean honestly.
- Severa: Tired, but upright.
- Severa: I should go. Something is probably waiting for me.
- Quinta: All the best. I have no better phrase.
- Severa: Off you go. I will watch for a moment.

**d3 13:30  Quinta & Paullus** (the plaza)
- Quinta: Paullus. Busy?
- Paullus: Quinta. The usual?
- Quinta: I am here for a barley seed. I thought about it on the way.
- Paullus: That will be one denarius.
- Quinta: I am short. I counted on the way and again just now.
- Paullus: Come back when you have it. I will not move.

**d3 13:46  Nero & Tertia** (the lanes)
- Nero: Are you going somewhere? I could come. I would be quiet. Mostly.
- Tertia: Hello, Nero. I was hoping it would be you.
- Nero: I saw it myself, so I can tell you. Severa gave to Varro when Varro had nothing.
- Tertia: Well. That is good. I will think about it all afternoon.
- Tertia: What do you like? I am not asking for a reason. I am collecting.
- Nero: Cloth. If you are asking. I rarely say it aloud.
- Nero: On a different note, my neighbour talks to his turnips. They have never disagreed with him. I envy that.
- Tertia: Ha. That is exactly the right size for a joke.
- Tertia: Do you know what turnip seeds cost today?
- Nero: 2 denarii each. I wrote it down.
- Tertia: Good to know.
- Tertia: Off I go. I will not look back, which is a lie.
- Nero: Bye. I am going to go and do something. I will not say what.
- Tertia: Goodbye. It was good.

**d3 13:56  Severa & Corvus** (the lanes)
- Severa: Hello. It is a day of some kind.
- Corvus: Hello. I am pleased and slightly startled.
- Severa: The afternoon is the same length as yesterday's, and feels longer.
- Corvus: Mm.
- Corvus: I have done the farmer work long enough to stop asking why.
- Severa: Mm. Yes. I would put it that way.
- Severa: Well. The day will not do itself.
- Corvus: Be well. I mean it in the ordinary way.
- Severa: Quite. Goodbye.

**d3 15:38  Corvus & Livia** (the plaza)
- Corvus: Hello.
- Livia: Hello. What do you need?
- Corvus: I would like 3 grain.
- Livia: 9 denarii.
- Corvus: There. Count it.
- Livia: That is all of it. Thank you.
- Corvus: Goodbye.

**d3 16:08  Tertia & Livia** (the plaza)
- Tertia: Hello.
- Livia: Hello. What do you need?
- Tertia: 9 grain, please.
- Livia: 27 denarii. I did not set the price. I only repeat it.
- Tertia: Here.
- Livia: Thank you.
- Tertia: See you.

**d3 16:16  Rufus & Nero** (the plaza)
- Rufus: It is you. I had hoped for someone else, and then I thought: no.
- Nero: What now? I am joking. Hello.
- Rufus: I heard that Livia smells like a midden. I have no reason to doubt it, and no reason to believe it.
- Nero: Well. That is a thing that happened.
- Rufus: On a different note, what are turnip seeds going for? I would like an exact figure.
- Nero: About 2 denarii. I paid it and did not enjoy it.
- Rufus: That is more than I thought.
- Rufus: Unrelated, but somebody told me his wall was holding up the ceiling. It was the other way round. He was very calm about it.
- Nero: Ha. Good. I will repeat that to somebody who has not heard it.
- Nero: Unrelated, but and Paullus? How is Paullus getting on?
- Rufus: Paullus is hungry, mostly. We are working on it.
- Rufus: Between us, I am fond of Severa. I heard what Nero thinks of Severa.
- Nero: You are not the only one.
- Nero: How is life, then? Tell me before everyone else does.
- Rufus: Tired. I could sleep standing. I may be.
- Rufus: Unrelated, but something is always about to happen at the plaza. It has not so far.
- Rufus: I have to get back. I will not say to what.
- Nero: Bye. Do not tell them where I went.
- Rufus: And the same to you, exactly.

**d3 16:20  Severa & Tertia** (the plaza)
- Severa: Ah. Company. I had been preparing for none.
- Tertia: Hello. I was about to say that.
- Severa: The baker work went quietly today. I do not entirely trust that.
- Tertia: You are right. I have been thinking so since Tuesday.
- Tertia: And Nero? How is Nero getting on?
- Severa: Nero is worn out. I keep telling them to sit down.
- Severa: I should go. Something is probably waiting for me.
- Tertia: Look after yourself. Somebody has to, and I am here.
- Severa: Yes. Goodbye.

**d3 16:56  Corvus & Livia** (the plaza)
- Corvus: Hello. You are home. That is the best news of the afternoon.
- Livia: Ah. Hello. I had a feeling.
- Corvus: You should know Quinta. She made me laugh. That is all I will say.
- Livia: I think so too. I had hoped it was only me.
- Livia: Unrelated, but you brought up Varro before. I remembered. Is there anything new?
- Corvus: There is no news. That is also a kind of news.
- Corvus: I should go. I will pretend I have a reason.
- Livia: Be well. I mean it in the ordinary way.
- Corvus: Off you go. I will watch for a moment.

**d3 17:24  Quinta & Secunda** (the lanes)
- Quinta: Secunda. There you are. Exactly where I expected.
- Secunda: Evening. It has been an evening for a while now.
- Quinta: What is Tipping like? I would like to know before I have to find out.
- Secunda: Tipping is one of the good ones. He said sorry.
- Secunda: The builder work went well. I am being careful about saying so.
- Quinta: True. It does not make it simpler.
- Secunda: How is Corvus? I realised I had not asked.
- Quinta: Corvus is in a good mood. I have decided not to question it.
- Quinta: I should get on. The day has noticed me.
- Secunda: Take care of the next hour. I will take care of this one.
- Quinta: Mm. See you.

**d3 18:16  Nero & Rufus** (the plaza)
- Nero: Hello. I am small, but I noticed you.
- Rufus: Good. Hello. That is out of the way.
- Nero: Do you get on with Severa? Be honest. I am only curious.
- Rufus: I am fond of Severa. I heard what Nero thinks of Severa. I do not say that about many people.
- Rufus: Here is something. Severa gave to Varro when Varro had nothing.
- Nero: I am glad. It is a strange thing to be glad about, and I am.
- Rufus: Unrelated, but I am very tired. The tiredness has started to feel like a place.
- Nero: Everyone has days. Some have more of them.
- Rufus: On a different note, I bought 2 bread today.
- Nero: Good.
- Rufus: My neighbour talks to his turnips. They have never disagreed with him. I envy that.
- Nero: Ha. That is exactly the right size for a joke.
- Rufus: I could lie down on almost anything. I have been assessing the ground.
- Nero: You are good to have around. I do not say that to many people.
- Rufus: That is kind. I will think about it later.
- Nero: I will let you get on. I have the feeling you have somewhere to be, and so do I.
- Rufus: Try not to be an idiot. I say it with love, and with a little concern.
- Nero: Bye.

**d3 18:26  Paullus & Nero** (the lanes)
- Paullus: Nero. Home. The light is going and I count you every evening.

**d3 18:28  Varro & Nero** (the plaza)
- Varro: Hello, Nero. I found something. I will not say what.
- Nero: Hello. I was doing something important.
- Varro: Do you know where Paullus is? I am not worried. I would like to know.
- Nero: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Varro: I like it here. There is room to run, and nobody has said not to.
- Nero: On a different note, I am tired. Not sleepy. Tired in a way a bed would not fix at once.
- Varro: Is it lunch yet? It feels like lunch.
- Nero: How is the day treating you? I mean honestly.
- Varro: Good. It has been a good day. I did not expect that of it.
- Varro: Somebody told me his wall was holding up the ceiling. It was the other way round. He was very calm about it.
- Nero: Ha. That is exactly the right size for a joke.
- Varro: I have to go. There is a thing I am in the middle of.
- Nero: Bye. I am going to go and do something. I will not say what.
- Varro: Quite. Goodbye.

**d3 18:44  Severa & Nero** (the plaza)
- Severa: There you are. I counted. You were still one.
- Nero: Hello. I have been standing here on purpose.
- Severa: I am tired. Not sleepy. Tired in a way a bed would not fix at once.
- Nero: I know. I was going to say that.
- Nero: Anyway. I am very tired. The tiredness has started to feel like a place.
- Severa: That is hard. I am sorry. It is a small island and we are all here.
- Severa: I will leave you to it. You were doing something.
- Nero: Bye. I will be home for supper. Probably before it.
- Severa: Be well, then.

**d3 18:46  Severa & Livia** (the plaza)
- Severa: Evening.
- Livia: Severa. The usual?
- Severa: I am here for 5 grain. I thought about it on the way.
- Livia: 15 denarii.
- Severa: There. Count it.
- Livia: Good. Thank you.
- Severa: Goodbye.

**d3 18:50  Rufus & Varro** (the plaza)
- Rufus: Varro. There you are. Exactly where I expected.
- Varro: Hello, Rufus. I was hoping it would be you.
- Rufus: Do you know what carrot seeds cost today?
- Varro: 2 denarii each. I wrote it down.
- Rufus: That is more than I thought.
- Varro: Unrelated, but I sometimes wonder what the sea does when nobody is looking. I assume the same thing.
- Rufus: Now I am wondering as well. It is not unpleasant.
- Rufus: Unrelated, but I have stood at the plaza often enough to know where the ground is uneven.
- Varro: Yes. That is it exactly.
- Varro: Anyway. I was there. Tertia smells like a midden. I stood very still.
- Rufus: I see.
- Rufus: Anyway. I would be careful around Tipping. They move things that are not theirs. I say it only because it is true.
- Varro: Thank you. I will take it under advisement. It is a good word, advisement.
- Varro: How is Paullus?
- Rufus: Paullus is hungry, mostly. We are working on it.
- Varro: I will let the conversation end here. It has had a good run.
- Rufus: Take care of the next hour. I will take care of this one.
- Varro: And you.

**d3 19:00  Severa & Rufus** (the plaza)
- Severa: Hello. You are where I left you, or near it.
- Rufus: Hello. Come to think of it, I was hoping.
- Severa: This is grain. It is not much. It is what I had.
- Rufus: Thank you. I did not expect that today.
- Rufus: I saw it myself, so I can tell you. Nero smells like a midden.
- Severa: Mm. Noted.
- Rufus: I asked for a loaf of yesterday. They said they would have one tomorrow. I have decided to wait.
- Severa: I have heard that one. I did not mind hearing it again.
- Rufus: I could lie down on almost anything. I have been assessing the ground.
- Severa: Agreed. That is a rare thing.
- Rufus: Unrelated, but I would be careful around Tipping. They move things that are not theirs. I say it only because it is true.
- Severa: Thank you. I will take it under advisement. It is a good word, advisement.
- Severa: Between us, I am fond of Paullus. Paullus's house came down, and Tipping was there.
- Rufus: I think so too. I had hoped it was only me.
- Severa: That is the end of what I had.
- Rufus: See you. I say it as a matter of course.
- Severa: Goodbye. It was good.

**d3 19:14  Tertia & Severa** (the plaza)
- Tertia: Hello, Severa.
- Severa: Evening. It has been an evening for a while now.
- Tertia: I am glad you ended up here. I mean it quite exactly.
- Severa: Thank you. I did not expect that.
- Severa: On a different note, what do you make of Livia?
- Tertia: Livia is one of the good ones. She is my child.
- Tertia: I bought 9 grain today.
- Severa: I see.
- Severa: On that subject, I bought 5 grain today.
- Tertia: That is a decent day's work.
- Severa: Well. That is that, for now.
- Tertia: Goodbye, Severa. It was a good length.
- Severa: Right. Until then.

**d3 19:22  Rufus & Tertia** (the plaza)
- Rufus: Tertia. Good. I had a thought and nobody to give it to.
- Tertia: Hello. I am pleased and slightly startled.
- Rufus: And Livia? How is Livia getting on?
- Tertia: Livia is well. Busy.
- Rufus: Unrelated, but I am worn out. All day on my feet, and the feet have started to take it personally.
- Tertia: And how did it go?
- Rufus: What do you like? I am not asking for a reason. I am collecting.
- Tertia: Copper ore. If you are asking. I rarely say it aloud.
- Tertia: I would be careful around Tipping. They knock things down. I say it only because it is true.
- Rufus: Thank you. I will take it under advisement. It is a good word, advisement.
- Rufus: I heard that Severa gave to Varro when Varro had nothing. I have no reason to doubt it, and no reason to believe it.
- Tertia: Well. That is good. I will think about it all afternoon.
- Rufus: I have to get back. I will not say to what.
- Tertia: Take care, Rufus. The island is small but it has edges.
- Rufus: Goodbye.

**d3 19:34  Rufus & Nero** (the plaza)
- Rufus: Nero. We have the same eyebrows. I notice every time.
- Nero: Rufus. Yes. Hello.
- Rufus: What do you make of Paullus?
- Nero: I am fond of Paullus. Paullus's house came down, and Tipping was there. I do not say that about many people.
- Rufus: Related to that, how is Paullus?
- Nero: Paullus is hungry, mostly. We are working on it.
- Rufus: I am tired. Not sleepy. Tired in a way a bed would not fix at once.
- Nero: Yes.
- Rufus: I am very tired. The tiredness has started to feel like a place.
- Nero: Tomorrow, then.
- Rufus: It is a good place to stand, at the plaza. I have tried others.
- Nero: That is right. I am glad somebody said it.
- Nero: On a different note, how has your day been? I mean the whole of it.
- Rufus: I am worn out. All day on my feet, and the feet have started to take it personally.
- Nero: I see.
- Nero: I should go. Something is probably waiting for me.
- Rufus: Good day to you. It is, so far.
- Nero: See you. I will be here, or near.

**d3 19:50  Rufus & Corvus** (the plaza)
- Rufus: Ah, Corvus. I was just thinking of something else.
- Corvus: Hello to you, in return.
- Rufus: It will be dark soon. I find I am prepared for that.
- Corvus: Yes. I was going to say that.
- Corvus: Something is always about to happen at the plaza. It has not so far.
- Rufus: I agree. I wish I did not.
- Corvus: I would be careful around Tipping. They knock things down. I say it only because it is true.
- Rufus: Thank you. I will take it under advisement. It is a good word, advisement.
- Rufus: Unrelated, but how are things with you, Corvus?
- Corvus: Good. I do not know why. I have stopped asking.
- Corvus: The farmer work is the one thing that has not changed since I arrived, and I am glad of it.
- Rufus: Yes. I think so.
- Rufus: On a different note, I am glad you ended up here. I mean it quite exactly.
- Corvus: That is kind. I will think about it later.
- Rufus: Off I go. I will not look back, which is a lie.
- Corvus: Look after yourself. Somebody has to, and I am here.
- Rufus: And the same to you, exactly.

**d3 19:56  Varro & Livia** (the plaza)
- Varro: Hello. Is there supper? I am only asking in general.
- Livia: Yes. Hello. It is that time.
- Varro: I saw it myself, so I can tell you. Severa gave Rufus a gift.
- Livia: Well. That is good. I will think about it all afternoon.
- Varro: Here is something. Tertia smells like a midden.
- Livia: Well. That is a thing that happened.
- Varro: I like it here. There is room to run, and nobody has said not to.
- Livia: Mm. Yes. I would put it that way.
- Varro: Unrelated, but something went right today. I have not worked out what. I am leaving it alone.
- Livia: You are right. I have been thinking so since Tuesday.
- Varro: What did you do today? In order, if you can.
- Livia: Are you behaving? Do not answer.
- Varro: Very well. I have decided to enjoy it before it is noticed.
- Varro: I have to go. There is a thing I am in the middle of.
- Livia: Do not be late for supper. I will notice and I will say nothing.
- Varro: Yes. Goodbye.

**d3 20:08  Nero & Livia** (the plaza)
- Nero: Are you going somewhere? I could come. I would be quiet. Mostly.
- Livia: Hello. I was about to say that.
- Nero: My neighbour talks to his turnips. They have never disagreed with him. I envy that.
- Livia: Oh, no. And yet.
- Livia: Unrelated, but I have a soft spot for Severa. I heard what Severa did.
- Nero: I think so too. I had hoped it was only me.
- Nero: I will let you get on. I have the feeling you have somewhere to be, and so do I.
- Livia: Until next time. I will be somewhere.
- Nero: And the same to you, exactly.

**d3 20:12  Nero & Corvus** (the plaza)
- Nero: Hello, Corvus. I found something. I will not say what.
- Corvus: Hello. Come to think of it, I was hoping.
- Nero: I like cloth very much. It is the sort of thing a person might remember.
- Corvus: Noted. I will remember that. I remember things.
- Corvus: I feel unreasonably good today. I have decided not to look into it.
- Nero: It is.
- Corvus: Any news?
- Nero: No. I looked, though.
- Nero: Anyway. What do you do with your days, Corvus? I am only asking out of interest.
- Corvus: I am a farmer. I have done it since I got here. Before that I was somebody else.
- Corvus: It will be dark soon. I find I am prepared for that.
- Nero: I asked for a loaf of yesterday. They said they would have one tomorrow. I have decided to wait.
- Corvus: Ha. Good. I will repeat that to somebody who has not heard it.
- Nero: Can I go now? I am asking nicely.
- Corvus: Look after yourself. Somebody has to, and I am here.
- Nero: Bye.

**d3 20:40  Corvus & Livia** (the plaza)
- Corvus: There you are, Livia.
- Livia: Hello, love. I am here. It is where I live.
- Corvus: How are you? I mean really, not the answer you give the baker.
- Livia: Fine. The day has not asked much of me.
- Corvus: The farmer work went quietly today. I do not entirely trust that.
- Livia: I had not put it that way. But yes.
- Corvus: Unrelated, but has anything happened? Anything at all. I will take a small one.
- Livia: Nothing I would call news. The tide is where it was.
- Corvus: I feel unreasonably good today. I have decided not to look into it.
- Livia: True. It does not make it simpler.
- Livia: Do you know where Paullus is? I am not worried. I would like to know.
- Corvus: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Corvus: Varro is 9 now. I did not see it happen. I looked away once.
- Livia: You must be proud. I would be. Is that the word? Yes.
- Corvus: I should get on. The day has noticed me.
- Livia: I will see you at supper. I will be the one who is hungry.
- Corvus: Mm. See you.

**d3 20:40  Secunda & Quinta** (the lanes)
- Secunda: Good. You are here. I was about to start talking to myself.
- Quinta: Evening. It has been an evening for a while now.
- Secunda: I was there. Severa gave to Varro when Varro had nothing. I stood very still.
- Quinta: I am glad. It is a strange thing to be glad about, and I am.
- Secunda: Something is always about to happen at the lanes. It has not so far.
- Quinta: That is about right.
- Secunda: Probably, something went right today. I have not worked out what. I am leaving it alone.
- Quinta: Mm.
- Secunda: Right. The afternoon will want me soon.
- Quinta: Mind how you go. There is a lot of ground.
- Secunda: Quite. Goodbye.

**d3 21:08  Rufus & Livia** (the plaza)
- Rufus: The light is going. Hello, Livia.
- Livia: Ah, Rufus. The island does arrange things.
- Rufus: I am fond of bread. I mention it only because it is true.
- Livia: Is that so. I have written it down in my head.
- Rufus: Something is always about to happen at the plaza. It has not so far.
- Livia: Quite. It is what I think too.
- Rufus: I asked for a loaf of yesterday. They said they would have one tomorrow. I have decided to wait.
- Livia: Ha. Good. I will repeat that to somebody who has not heard it.
- Rufus: I am very tired. The tiredness has started to feel like a place.
- Livia: It will pass. Not today, probably.
- Livia: Well. The day will not do itself.
- Rufus: All the best. I have no better phrase.
- Livia: Goodbye.

**d3 21:50  Corvus & Livia** (the lanes)
- Corvus: Evening, Livia.
- Livia: Hello.
- Corvus: Do you know where Paullus is? I am not worried. I would like to know.
- Livia: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Corvus: Unrelated, but I picked up 3 grain. The transaction went smoothly. I was suspicious of that.
- Livia: Good.
- Corvus: Anyway. I have done the farmer work long enough to stop asking why.
- Livia: Yes. That is it exactly.
- Corvus: It will be dark soon. I find I am prepared for that.
- Livia: That is right. I am glad somebody said it.
- Corvus: On a different note, you should know Quinta. She made me laugh. That is all I will say.
- Livia: You are not the only one.
- Livia: Have you heard anything? About anyone. About anything.
- Corvus: Nothing. A gull stood on the beach for a long time and left.
- Livia: I have a few things to be near. I will go and be near them.
- Corvus: I will see you at supper. I will be the one who is hungry.
- Livia: Be well, then.

**d3 22:14  Rufus & Nero** (the plaza)
- Rufus: You are up late, Nero. So am I. I do not know what that proves.
- Nero: Hello. I was doing something important.
- Rufus: How is Paullus? I realised I had not asked.
- Nero: Paullus is hungry, mostly. We are working on it.
- Rufus: On a different note, somebody told me his wall was holding up the ceiling. It was the other way round. He was very calm about it.
- Nero: Ha. That is exactly the right size for a joke.
- Rufus: Do you know where Corvus is? I am not worried. I would like to know.
- Nero: Corvus is at the lanes. I looked, on the way past. I do not know why.
- Rufus: On a different note, I heard that Varro smells like a midden. I have no reason to doubt it, and no reason to believe it.
- Nero: I see.
- Nero: How is the day treating you? I mean honestly.
- Rufus: Tired in a way that sleep might help.
- Rufus: On a different note, it is later than it looks.
- Nero: I am very tired. The tiredness has started to feel like a place.
- Rufus: That is hard. I am sorry. It is a small island and we are all here.
- Nero: Can I go now? I am asking nicely.
- Rufus: See you. I say it as a matter of course.
- Nero: Right. Until then.

**d3 22:46  Nero & Severa** (the plaza)
- Nero: Hello. I am small, but I noticed you.
- Severa: Hello. I am pleased and slightly startled.
- Nero: Is it lunch yet? It feels like lunch.
- Severa: Agreed. That is a rare thing.
- Severa: I am very tired. The tiredness has started to feel like a place.
- Nero: That is all right.
- Nero: I am tired. Not sleepy. Tired in a way a bed would not fix at once.
- Severa: That is right. I am glad somebody said it.
- Severa: I asked for a loaf of yesterday. They said they would have one tomorrow. I have decided to wait.
- Nero: Ha. Good. I will repeat that to somebody who has not heard it.
- Nero: Do you know where Paullus is? I am not worried. I would like to know.
- Severa: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Nero: I will leave you to it. You were doing something.
- Severa: Wrap up warm. It is a mild island, and still.
- Nero: And you.

### Day 5

**d4 03:18  Severa & Nero** (the plaza)
- Severa: Come here. Let me look at you. You are taller or I am less.
- Nero: Ah, Severa. Good. Today is better already.
- Severa: I am very tired. The tiredness has started to feel like a place.
- Nero: Tomorrow, then.
- Nero: Anyway. Are you well? You look tired. You always look tired. It is part of the family.
- Severa: Tired, but upright.
- Nero: Unrelated, but I am hungry. Where would you go for a meal? I am asking for a friend, who is me.
- Severa: The bakery. It is reliable. It is the most reliable thing here.
- Severa: Anyway. I picked up 5 grain. The transaction went smoothly. I was suspicious of that.
- Nero: Good.
- Nero: I like it here. There is room to run, and nobody has said not to.
- Severa: Yes. I was going to say that.
- Severa: Unrelated, but my neighbour talks to his turnips. They have never disagreed with him. I envy that.
- Nero: Oh, no. And yet.
- Severa: I should get on. The day has noticed me.
- Nero: Bye. Do not tell them where I went.
- Severa: Yes. Goodbye.

**d4 06:44  Rufus & Secunda** (the lanes)
- Rufus: Morning, Secunda. It is 6:44.
- Secunda: Hello. Come to think of it, I was hoping.
- Rufus: I could lie down on almost anything. I have been assessing the ground.
- Secunda: I have stood at the lanes often enough to know where the ground is uneven.
- Rufus: I agree. I wish I did not.
- Rufus: Well. That is that, for now.
- Secunda: Good day to you. It is, so far.
- Rufus: And you.

**d4 07:38  Livia & Tertia** (the lanes)
- Livia: Hello. Is there supper? I am only asking in general.
- Tertia: Morning. I was thinking about nothing in particular.
- Livia: Are you well? You look tired. You always look tired. It is part of the family.
- Tertia: Fine. Nothing to report. That is a report of a kind.
- Tertia: Anyway. How is Quinta?
- Livia: Quinta is well. Busy.
- Livia: I have a few things to be near. I will go and be near them.
- Tertia: Do not be late for supper. I will notice and I will say nothing.
- Livia: Mm. See you.

**d4 08:50  Nero & Corvus** (the plaza)
- Nero: Hello. I am small, but I noticed you.
- Corvus: Ah. Hello. I had a feeling.
- Nero: I was there. Quinta smells like a midden. I stood very still.
- Corvus: Well. That is a thing that happened.
- Corvus: Anyway. How are things with you, Nero?
- Nero: I am tired. I am not tired. I am a bit tired.
- Corvus: What are turnip seeds going for? I would like an exact figure.
- Nero: About 2 denarii. I paid it and did not enjoy it.
- Corvus: Fair. Thank you.
- Corvus: On a different note, last time you mentioned Corvus. I have been thinking about it, in the background.
- Nero: There is no news. That is also a kind of news.
- Corvus: Anyway. My Varro is 10. It is going well. I am rarely asked.
- Nero: You must be proud. I would be. Is that the word? Yes.
- Corvus: I wonder why the sky is the shape it is. It must have been decided by somebody.
- Nero: I could not say. I have a feeling it is better not to.
- Corvus: I will let you get on. I have the feeling you have somewhere to be, and so do I.
- Nero: Bye. I am going to go and do something. I will not say what.
- Corvus: Goodbye.

**d4 08:50  Severa & Quinta** (the plaza)
- Severa: Good morning. I woke at some point before this and have been waiting for someone to say it to.
- Quinta: Hello to you, in return.
- Severa: I bought 5 grain today.
- Quinta: I see.
- Quinta: I planted 2 carrots. I told them nothing. They seem to know what to do.
- Severa: And how did it go?
- Severa: I will leave you to it. You were doing something.
- Quinta: Take care of the next hour. I will take care of this one.
- Severa: Be well, then.

**d4 10:08  Rufus & Tertia** (the plaza)
- Rufus: Tertia. Good. I was about to go and look for you. For no particular reason.
- Tertia: Hello.
- Rufus: I am very tired. The tiredness has started to feel like a place.
- Tertia: That is hard. I am sorry. It is a small island and we are all here.
- Tertia: What do you like? I am not asking for a reason. I am collecting.
- Rufus: I like bread. That has been true for a long time.
- Rufus: I should go. I will pretend I have a reason.
- Tertia: Until next time. I will be somewhere.
- Rufus: And you.

**d4 10:28  Quinta & Paullus** (the plaza)
- Quinta: Good morning.
- Paullus: Good morning. I have what I have.
- Quinta: A barley seed, please.
- Paullus: One denarius. I did not set the price. I only repeat it.
- Quinta: I am short. I counted on the way and again just now.
- Paullus: It will be here tomorrow. Probably.

**d4 10:32  Livia & Livia** (the plaza)
- Livia: I put it down somewhere. I put it down on purpose.

**d4 11:20  Severa & Livia** (the plaza)
- Severa: Livia. Busy?
- Livia: Severa. The usual?
- Severa: I am here for a little grain. I thought about it on the way.
- Livia: None left. They went quickly.
- Severa: Everyone has days. Some have more of them.

**d4 11:20  Severa & Livia** (the plaza)
- Severa: Afternoon, Livia.
- Livia: Hello, Severa. I was hoping it would be you.
- Severa: I am very tired. The tiredness has started to feel like a place.
- Livia: It will pass. Not today, probably.
- Livia: The afternoon is the same length as yesterday's, and feels longer.
- Severa: I agree. I wish I did not.
- Severa: I have to get back. I will not say to what.
- Livia: Goodbye, Severa.
- Severa: Quite. Goodbye.

**d4 12:10  Quinta & Livia** (the plaza)
- Quinta: Hello.
- Livia: Hello. What do you need?
- Quinta: I have 9 grain.
- Livia: I can do 18 denarii.
- Quinta: That will do.
- Livia: Thank you.

**d4 12:12  Quinta & Livia** (the plaza)
- Quinta: Hello.
- Livia: Hello. What do you need?
- Quinta: I brought a turnip. I carried them carefully.
- Livia: 2 denarii. That is as high as I can honestly go.
- Quinta: Yes.
- Livia: That is all of it. Thank you.

**d4 12:24  Quinta & Paullus** (the plaza)
- Quinta: Paullus. Busy?
- Paullus: Quinta. The usual?
- Quinta: I would like 4 barley seeds.
- Paullus: 4 denarii.
- Quinta: There. Count it.
- Paullus: Good. Thank you.
- Quinta: Goodbye.

**d4 12:38  Livia & Livia** (the plaza)
- Livia: Where did that go. It was here. It was right here.

**d4 12:44  Severa & Secunda** (the lanes)
- Severa: Hello. I see you have arrived, as one does.
- Secunda: Hello. It is good to see you. I mean that exactly.
- Severa: I have grain. I thought of you, which surprised me.
- Secunda: Thank you. I will find a place for it.
- Secunda: On a different note, I was there. Nero smells like a midden. I stood very still.
- Severa: Mm. Noted.
- Severa: I will let the conversation end here. It has had a good run.
- Secunda: Take care, Severa. The island is small but it has edges.
- Severa: Goodbye.

**d4 13:08  Rufus & Livia** (the plaza)
- Rufus: Hello, Livia. I will say it first this time.
- Livia: Ah. Hello. I had a feeling.
- Rufus: You brought up bread before. I remembered. Is there anything new?
- Livia: It is much as it was. Thank you for remembering. People do not, usually.
- Livia: I have a soft spot for Severa. I heard what Severa did.
- Rufus: You are not the only one.
- Rufus: That is the end of what I had.
- Livia: Take care of the next hour. I will take care of this one.
- Rufus: And you.

**d4 14:14  Nero & Corvus** (the plaza)
- Nero: Are you going somewhere? I could come. I would be quiet. Mostly.
- Corvus: Hello.
- Nero: Do you know where Paullus is? I am not worried. I would like to know.
- Corvus: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Corvus: On that subject, I have a soft spot for Paullus. I heard what Nero thinks of Paullus.
- Nero: You are not the only one.
- Nero: I have to go. There is a thing I am in the middle of.
- Corvus: See you. Same place, same time, roughly.
- Nero: Bye.

**d4 15:10  Rufus & Paullus** (the plaza)
- Rufus: Hello.
- Paullus: Hello. What do you need?
- Rufus: I am here for a barley seed. I thought about it on the way.
- Paullus: That will be one denarius.
- Rufus: Here.
- Paullus: Thank you.
- Rufus: See you.

**d4 16:22  Rufus & Livia** (the plaza)
- Rufus: Ah. Company. I had been preparing for none.
- Livia: Hello, Rufus. I was hoping it would be you.
- Rufus: I asked for a loaf of yesterday. They said they would have one tomorrow. I have decided to wait.
- Livia: Oh, no. And yet.
- Rufus: Between us. Severa gave to Varro when Varro had nothing.
- Livia: Who told you that? Never mind. I would like to hear it twice.
- Rufus: Anyway. I am very tired. The tiredness has started to feel like a place.
- Livia: That is all right.
- Rufus: I sometimes wonder what the sea does when nobody is looking. I assume the same thing.
- Livia: Now I am wondering as well. It is not unpleasant.
- Rufus: How are you? I would like to know the real number.
- Livia: Fine. About a six.
- Rufus: Right. The afternoon will want me soon.
- Livia: Goodbye, Rufus.
- Rufus: See you. I will be here, or near.

**d4 16:26  Tertia & Secunda** (the plaza)
- Tertia: Secunda. Good. I was about to go and look for you. For no particular reason.
- Secunda: Hello to you, in return.
- Tertia: I would be careful around Tipping. They knock things down. I say it only because it is true.
- Secunda: Thank you. I will take it under advisement. It is a good word, advisement.
- Secunda: On a different note, how is Livia? I realised I had not asked.
- Tertia: Livia is well. Busy.
- Tertia: I will let you get on. I have the feeling you have somewhere to be, and so do I.
- Secunda: All the best. I have no better phrase.
- Tertia: And the same to you, exactly.

**d4 16:44  Quinta & Varro** (the plaza)
- Quinta: It is you. I had hoped for someone else, and then I thought: no.
- Varro: Hello. I am small, but I am here.
- Quinta: I saw it myself, so I can tell you. Rufus smells like a midden.
- Varro: I see.
- Varro: Here is something. Severa gave Rufus a gift.
- Quinta: I am glad. It is a strange thing to be glad about, and I am.
- Varro: Anyway. My neighbour talks to his turnips. They have never disagreed with him. I envy that.
- Quinta: Ha. Good. I will repeat that to somebody who has not heard it.
- Varro: Anyway. I wonder where the sand came from. The beach was not here before. Or it was. I do not remember.
- Quinta: I could not say. I have a feeling it is better not to.
- Varro: I like cabbages very much. It is the sort of thing a person might remember.
- Quinta: Noted. I will remember that. I remember things.
- Varro: I like it here. There is room to run, and nobody has said not to.
- Quinta: Yes. That is it exactly.
- Quinta: Off I go. I will not look back, which is a lie.
- Varro: Try not to be an idiot. I say it with love, and with a little concern.
- Quinta: Yes. Goodbye.

**d4 17:16  Nero & Severa** (the plaza)
- Nero: Hello, Severa. I found something. I will not say what.
- Severa: Evening. It has been an evening for a while now.
- Nero: And Paullus? How is Paullus getting on?
- Severa: Paullus has been low. It is not anything I can fix by talking, so I stay close.
- Severa: I have stood at the plaza often enough to know where the ground is uneven.
- Nero: Yes.
- Severa: I went for grain and the greengrocer had none. The shelf looked embarrassed.
- Nero: And how did it go?
- Nero: Anyway. I saw it myself, so I can tell you. Brutus smells like a midden.
- Severa: Mm. Noted.
- Severa: Staying with it for a moment, you brought up grain before. I remembered. Is there anything new?
- Nero: It is much as it was. Thank you for remembering. People do not, usually.
- Severa: I should go. Something is probably waiting for me.
- Nero: Bye. I am going to go and do something. I will not say what.
- Severa: And you.

**d4 18:08  Rufus & Nero** (the plaza)
- Rufus: Hello, Nero.
- Nero: What now? I am joking. Hello.
- Rufus: How is life, then? Tell me before everyone else does.
- Nero: I am tired. I am not tired. I am a bit tired.
- Nero: I saw it myself, so I can tell you. Varro smells like a midden.
- Rufus: I see.
- Rufus: Well. That is that, for now.
- Nero: Bye. Do not tell them where I went.
- Rufus: Goodbye. It was good.

**d4 18:22  Nero & Livia** (the plaza)
- Nero: Hello. I am small, but I noticed you.
- Livia: Yes. Hello. It is that time.
- Nero: I saw it myself, so I can tell you. Varro smells like a midden.
- Livia: Well. That is a thing that happened.
- Nero: Unrelated, but how is Quinta? I realised I had not asked.
- Livia: Quinta is worn out. I keep telling them to sit down.
- Nero: Do you know what turnips cost today?
- Livia: About 2 denarii. I paid it and did not enjoy it.
- Nero: Fair. Thank you.
- Nero: Well. The day will not do itself.
- Livia: Look after yourself. Somebody has to, and I am here.
- Nero: Bye.

**d4 18:30  Rufus & Corvus** (the plaza)
- Rufus: Corvus. There you are. Exactly where I expected.
- Corvus: Hello. I have been standing here on purpose.
- Rufus: You may want to stand still for this.
- Corvus: Go on. I have time. I always have time.
- Rufus: Between us. Severa gave to Varro when Varro had nothing.
- Corvus: That does not sound like the island I know.
- Corvus: I would be careful around Tipping. They knock things down. I say it only because it is true.
- Rufus: Thank you. I will take it under advisement. It is a good word, advisement.
- Rufus: On a different note, this is grain. It is not much. It is what I had.
- Corvus: Thank you. I will find a place for it.
- Corvus: Time here is quiet. I do not think it is slower. I think it is just not in a hurry.
- Rufus: Mm.
- Rufus: I could lie down on almost anything. I have been assessing the ground.
- Corvus: I agree. I wish I did not.
- Corvus: Anyway. How are you getting on?
- Rufus: Worn out. The kind that sits behind the eyes.
- Corvus: I will leave you to it. You were doing something.
- Rufus: Until next time. I will be somewhere.
- Corvus: Mm. See you.

**d4 18:56  Rufus & Livia** (the plaza)
- Rufus: Ah, Livia. I was just thinking of something else.
- Livia: Good. Hello. That is out of the way.
- Rufus: The seed stall has potato seeds now. I stood and looked at it for a while.
- Livia: That is a decent day's work.
- Rufus: Unrelated, but I am very tired. The tiredness has started to feel like a place.
- Livia: Yes. Well. It is something.
- Rufus: Not much happens at the plaza. I find I like that.
- Livia: Yes. I think so.
- Rufus: Somebody told me his wall was holding up the ceiling. It was the other way round. He was very calm about it.
- Livia: I have heard that one. I did not mind hearing it again.
- Rufus: I have a few things to be near. I will go and be near them.
- Livia: See you. I say it as a matter of course.
- Rufus: Right. Until then.

**d4 19:02  Corvus & Nero** (the plaza)
- Corvus: Hello, Nero. I will say it first this time.
- Nero: Ah, Corvus. The island does arrange things.
- Corvus: Something went right today. I have not worked out what. I am leaving it alone.
- Nero: I know. I was going to say that.
- Corvus: Unrelated, but last time you mentioned Paullus. I have been thinking about it, in the background.
- Nero: It is much as it was. Thank you for remembering. People do not, usually.
- Corvus: What is Severa like? I would like to know before I have to find out.
- Nero: I am fond of Severa. She is always good to me. I do not say that about many people.
- Corvus: Somebody told me his wall was holding up the ceiling. It was the other way round. He was very calm about it.
- Nero: Oh, no. And yet.
- Nero: I was there. Rufus smells like a midden. I stood very still.
- Corvus: Well. That is a thing that happened.
- Corvus: Varro is 10 now. I did not see it happen. I looked away once.
- Nero: That is wonderful. They are quite something at that age.
- Corvus: I should get on. The day has noticed me.
- Nero: Bye. Do not tell them where I went.
- Corvus: Be well, then.

**d4 19:24  Corvus & Tertia** (the plaza)
- Corvus: Tertia. Yes. There you are.
- Tertia: Hello. Come to think of it, I was hoping.
- Corvus: Last time you mentioned flowers. I have been thinking about it, in the background.
- Tertia: There is no news. That is also a kind of news.
- Corvus: I feel unreasonably good today. I have decided not to look into it.
- Tertia: Yes. I was going to say that.
- Corvus: It will be dark soon. I find I am prepared for that.
- Tertia: Agreed. That is a rare thing.
- Tertia: Do you know what carrot seeds cost today?
- Corvus: 2 denarii each. I wrote it down.
- Tertia: That is more than I thought.
- Corvus: The farmer work went well. I am being careful about saying so.
- Corvus: Right. The afternoon will want me soon.
- Tertia: See you. Same place, same time, roughly.
- Corvus: Goodbye.

**d4 19:30  Livia & Secunda** (the plaza)
- Livia: Secunda. Good. I had a thought and nobody to give it to.
- Secunda: Livia. Yes. Hello.
- Livia: I bought 9 grain today.
- Secunda: I see.
- Secunda: How are you? I would like to know the real number.
- Livia: Good. I would like to say why. I cannot.
- Livia: That is the end of what I had.
- Secunda: Goodbye, Livia. It was a good length.
- Livia: Off you go. I will watch for a moment.

**d4 19:36  Rufus & Nero** (the plaza)
- Rufus: Hello. It is a day of some kind.
- Nero: Hello. I was about to say that.
- Rufus: The seed stall has cabbage seeds now. I stood and looked at it for a while.
- Nero: Good.
- Rufus: How have you been, since last time? Give me the short version.
- Nero: I am hungry. Is it nearly supper? It feels nearly.
- Nero: Here is something. Severa gave to Varro when Varro had nothing.
- Rufus: Well. That is good. I will think about it all afternoon.
- Rufus: Anyway. Something is always about to happen at the plaza. It has not so far.
- Nero: You are right. I have been thinking so since Tuesday.
- Nero: I have not eaten since this morning. My stomach has opinions.
- Rufus: Unrelated, but I am very tired. The tiredness has started to feel like a place.
- Nero: Everyone has days. Some have more of them.
- Rufus: It will be dark soon. I find I am prepared for that.
- Nero: I know. I was going to say that.
- Rufus: I will let the conversation end here. It has had a good run.
- Nero: Try not to be an idiot. I say it with love, and with a little concern.
- Rufus: See you. I will be here, or near.

**d4 20:06  Nero & Secunda** (the plaza)
- Nero: Are you going somewhere? I could come. I would be quiet. Mostly.
- Secunda: Ah, Nero. The island does arrange things.
- Nero: And Brutus? How is Brutus getting on?
- Secunda: Brutus is well. Busy.
- Nero: I was there. Severa gave Rufus a gift. I stood very still.
- Secunda: I am glad. It is a strange thing to be glad about, and I am.
- Secunda: Here is something. Rufus gave Corvus a gift.
- Nero: Well. That is good. I will think about it all afternoon.
- Nero: What do you do with your days, Secunda? I am only asking out of interest.
- Secunda: I am a builder. It is a better job than it sounds, or exactly as good.
- Nero: Can I go now? I am asking nicely.
- Secunda: Good day to you. It is, so far.
- Nero: Quite. Goodbye.

**d4 20:12  Livia & Quinta** (the plaza)
- Livia: Come here. Let me look at you. You are taller or I am less.
- Quinta: Hello. I am here. I am fine. You do not need to look at me like that.
- Livia: I overheard something. Corvus smells like a midden. I was not meant to, but I was there.
- Quinta: Mm. Noted.
- Livia: Are you behaving? Do not answer.
- Quinta: For what it is worth, tired in a way that sleep might help.
- Quinta: Anyway. I am very tired. The tiredness has started to feel like a place.
- Livia: That is all right.
- Livia: Time here is quiet. I do not think it is slower. I think it is just not in a hurry.
- Quinta: Quite. It is what I think too.
- Livia: I have to get back. I will not say to what.
- Quinta: Bye. I will be home for supper. Probably before it.
- Livia: Yes. Goodbye.

**d4 20:30  Nero & Livia** (the plaza)
- Nero: Hello, Livia. I found something. I will not say what.
- Livia: Hello, Nero. I was hoping it would be you.
- Nero: What do you do with your days, Livia? I am only asking out of interest.
- Livia: I am a farmer. I have done it since I got here. Before that I was somebody else.
- Nero: Anyway. My neighbour talks to his turnips. They have never disagreed with him. I envy that.
- Livia: Ha. That is exactly the right size for a joke.
- Nero: Unrelated, but how are things with you, Livia?
- Livia: Good. I do not know why. I have stopped asking.
- Livia: What are turnip seeds going for? I would like an exact figure.
- Nero: 2 denarii each. I wrote it down.
- Livia: Good to know.
- Livia: Well. The day will not do itself.
- Nero: Bye. I am going to go and do something. I will not say what.
- Livia: And the same to you, exactly.

**d4 20:34  Rufus & Secunda** (the plaza)
- Rufus: Good. You are here. I was about to start talking to myself.
- Secunda: Evening. It has been an evening for a while now.
- Rufus: I am very tired. The tiredness has started to feel like a place.
- Secunda: It will pass. Not today, probably.
- Rufus: Somebody told me his wall was holding up the ceiling. It was the other way round. He was very calm about it.
- Secunda: Oh, no. And yet.
- Rufus: Unrelated, but how are things with you, Secunda?
- Secunda: Very well. I have decided to enjoy it before it is noticed.
- Rufus: On a different note, between us. Varro smells like a midden.
- Secunda: Mm. Noted.
- Rufus: Unrelated, but if you could have one thing, which would it be? I am only asking.
- Secunda: Carrots. If you are asking. I rarely say it aloud.
- Secunda: How is Severa? I realised I had not asked.
- Rufus: Severa is worn out. I keep telling them to sit down.
- Secunda: I have to get back. I will not say to what.
- Rufus: Take care of the next hour. I will take care of this one.
- Secunda: And you.

**d4 20:38  Severa & Quinta** (the plaza)
- Severa: The light is going. Hello, Quinta.
- Quinta: Ah, Severa. Good. Today is better already.
- Severa: The baker work is the one thing that has not changed since I arrived, and I am glad of it.
- Quinta: That is right. I am glad somebody said it.
- Severa: Unrelated, but it is 20:38. I checked.
- Quinta: I agree. I wish I did not.
- Severa: To be fair, I have stood at the plaza often enough to know where the ground is uneven.
- Quinta: Money is tight. I had to leave the barley seeds and walk away from it.
- Severa: Good.
- Quinta: I will let the conversation end here. It has had a good run.
- Severa: Good day to you. It is, so far.
- Quinta: Goodbye.

**d4 20:50  Severa & Nero** (the plaza)
- Severa: Hello. You are where I left you, or near it.
- Nero: Hello. Yes, I have eaten. I would tell you if I had not, which is not true.
- Severa: I am very tired. The tiredness has started to feel like a place.
- Nero: That is hard. I am sorry. It is a small island and we are all here.
- Nero: Are you well? You look tired. You always look tired. It is part of the family.
- Severa: Worn out. The kind that sits behind the eyes.
- Nero: Unrelated, but I am hungry. Where would you go for a meal? I am asking for a friend, who is me.
- Severa: Ask around. Somebody has bread. Someone always has bread.
- Nero: I am glad you ended up here. I mean it quite exactly.
- Severa: Thank you. I did not expect that.
- Severa: On a different note, you brought up grain before. I remembered. Is there anything new?
- Nero: There is no news. That is also a kind of news.
- Severa: Right. The afternoon will want me soon.
- Nero: Bye. I will be home for supper. Probably before it.
- Severa: Right. Until then.

**d4 20:52  Rufus & Livia** (the plaza)
- Rufus: Evening, Livia.
- Livia: Hello, Rufus. I was hoping it would be you.
- Rufus: I could lie down on almost anything. I have been assessing the ground.
- Livia: It is.
- Rufus: Do you get on with Varro? Be honest. I am only curious.
- Livia: Varro is one of the good ones. I heard what Corvus thinks of Varro.
- Rufus: Anyway. It will be dark soon. I find I am prepared for that.
- Livia: Mm. Yes. I would put it that way.
- Rufus: My neighbour talks to his turnips. They have never disagreed with him. I envy that.
- Livia: Ha. Good. I will repeat that to somebody who has not heard it.
- Rufus: I will leave you to it. You were doing something.
- Livia: Take care of the next hour. I will take care of this one.
- Rufus: Goodbye. It was good.

**d4 21:02  Secunda & Severa** (the plaza)
- Secunda: Ah. Company. I had been preparing for none.
- Severa: Hello.
- Secunda: My Brutus is 4. It is going well. I am rarely asked.
- Severa: You must be proud. I would be. Is that the word? Yes.
- Secunda: How is Nero?
- Severa: Nero is hungry, mostly. We are working on it.
- Severa: Unrelated, but the greengrocer was out of grain. It was very quiet there.
- Secunda: And how did it go?
- Secunda: I was there. Livia smells like a midden. I stood very still.
- Severa: Well. That is a thing that happened.
- Severa: I am very tired. The tiredness has started to feel like a place.
- Secunda: It will pass. Not today, probably.
- Severa: I have to get back. I will not say to what.
- Secunda: Until next time. I will be somewhere.
- Severa: Yes. Goodbye.

**d4 21:16  Nero & Quinta** (the plaza)
- Nero: Hello, Quinta.
- Quinta: Nero. Yes. Hello.
- Nero: It may not be true. Livia smells like a midden.
- Quinta: I see.
- Nero: I am hungry, as it happens. It has been a while.
- Quinta: Tomorrow, then.
- Quinta: Unrelated, but I have carrots. I thought of you, which surprised me.
- Nero: That is exactly right. I do not know how you knew.
- Nero: I am fond of cloth. I mention it only because it is true.
- Quinta: Noted. I will remember that. I remember things.
- Nero: I have to go. There is a thing I am in the middle of.
- Quinta: Mind how you go. There is a lot of ground.
- Nero: Bye.

**d4 21:26  Nero & Severa** (the plaza)
- Nero: Hello. Is there supper? I am only asking in general.
- Severa: Hello to you, in return.
- Nero: I am hungry, as it happens. It has been a while.
- Severa: That is all right.
- Nero: Anyway. Do you know where Paullus is? I am not worried. I would like to know.
- Severa: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Severa: My neighbour talks to his turnips. They have never disagreed with him. I envy that.
- Nero: Ha. That is exactly the right size for a joke.
- Nero: Here is something. Varro smells like a midden.
- Severa: I see.
- Severa: Unrelated, but I sometimes wonder what the sea does when nobody is looking. I assume the same thing.
- Nero: I could not say. I have a feeling it is better not to.
- Severa: Off I go. I will not look back, which is a lie.
- Nero: Look after yourself. Somebody has to, and I am here.
- Severa: Mm. See you.

**d4 21:52  Secunda & Quinta** (the plaza)
- Secunda: Hello. I see you have arrived, as one does.
- Quinta: Yes. Hello. It is that time.
- Secunda: And Livia? How is Livia getting on?
- Quinta: Livia is well. Busy.
- Secunda: Between us. Varro smells like a midden.
- Quinta: I see.
- Secunda: Do you know where Paullus is? I am not worried. I would like to know.
- Quinta: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Quinta: The seed stall has daisy seeds on it that nobody ordered. I am not asking.
- Secunda: I see.
- Quinta: Right. The afternoon will want me soon.
- Secunda: Take care, Quinta. The island is small but it has edges.
- Quinta: Right. Until then.

**d4 22:08  Nero & Secunda** (the plaza)
- Nero: You are up late, Secunda. So am I. I do not know what that proves.
- Secunda: Hello. I have been standing here on purpose.
- Nero: You are good to have around. I do not say that to many people.
- Secunda: That is kind. I will think about it later.
- Secunda: What do you like? I am not asking for a reason. I am collecting.
- Nero: I like cloth. That has been true for a long time.
- Secunda: Unrelated, but do you know where Paullus is? I am not worried. I would like to know.
- Nero: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Secunda: Unrelated, but somebody told me his wall was holding up the ceiling. It was the other way round. He was very calm about it.
- Nero: I have heard that one. I did not mind hearing it again.
- Secunda: I have a few things to be near. I will go and be near them.
- Nero: Bye. Do not tell them where I went.
- Secunda: Off you go. I will watch for a moment.

**d4 23:20  Corvus & Tertia** (the plaza)
- Corvus: Hello. It is a day of some kind.
- Tertia: Good. Hello. That is out of the way.
- Corvus: You brought up flowers before. I remembered. Is there anything new?
- Tertia: It is much as it was. Thank you for remembering. People do not, usually.
- Tertia: I have grain. I thought of you, which surprised me.
- Corvus: Thank you. I did not expect that today.
- Corvus: That is the end of what I had.
- Tertia: See you. I say it as a matter of course.
- Corvus: See you. I will be here, or near.

### Day 6

**d5 02:40  Nero & Rufus** (the plaza)
- Nero: Rufus. We have the same eyebrows. I notice every time.
- Rufus: What now? I am joking. Hello.
- Nero: I am hungry, as it happens. It has been a while.
- Rufus: Everyone has days. Some have more of them.
- Rufus: On a different note, I am glad you ended up here. I mean it quite exactly.
- Nero: That is kind. I will think about it later.
- Rufus: The seed stall has daisy seeds on it that nobody ordered. I am not asking.
- Nero: I see.
- Rufus: Anyway. It is later than it looks.
- Nero: Yes.
- Rufus: Somebody told me his wall was holding up the ceiling. It was the other way round. He was very calm about it.
- Nero: Ha. Good. I will repeat that to somebody who has not heard it.
- Rufus: What do you make of Severa?
- Nero: I am fond of Severa. She is always good to me. I do not say that about many people.
- Rufus: That is the end of what I had.
- Nero: Bye. I am going to go and do something. I will not say what.
- Rufus: Quite. Goodbye.

**d5 07:50  Varro & Secunda** (the plaza)
- Varro: Hello, Secunda. I found something. I will not say what.
- Secunda: Morning. I was thinking about nothing in particular.
- Varro: What do you like? I am not asking for a reason. I am collecting.
- Secunda: Tomatoes. If you are asking. I rarely say it aloud.
- Secunda: I asked for a loaf of yesterday. They said they would have one tomorrow. I have decided to wait.
- Varro: Oh, no. And yet.
- Varro: I have to go. There is a thing I am in the middle of.
- Secunda: See you. I say it as a matter of course.
- Varro: Bye.

**d5 07:58  Rufus & Livia** (the plaza)
- Rufus: Good morning.
- Livia: Rufus. The usual?
- Rufus: I have 11 grain.
- Livia: 16 denarii. That is as high as I can honestly go.
- Rufus: Yes.
- Livia: That is all of it. Thank you.

**d5 08:18  Quinta & Livia** (the plaza)
- Quinta: Hello.
- Livia: Good morning. I have what I have.
- Quinta: I would like 3 grain.
- Livia: That will be 8 denarii.
- Quinta: Here.
- Livia: Good. Thank you.
- Quinta: See you.

**d5 08:40  Quinta & Livia** (the plaza)
- Quinta: Good morning.
- Livia: Hello. What do you need?
- Quinta: I brought 3 grain. I carried them carefully.
- Livia: I can do 3 denarii.
- Quinta: That will do.
- Livia: Thank you.

**d5 08:48  Quinta & Livia** (the plaza)
- Quinta: Good morning.
- Livia: Good morning. I have what I have.
- Quinta: I have 3 carrots.
- Livia: 6 denarii. That is as high as I can honestly go.
- Quinta: That will do.
- Livia: That is all of it. Thank you.

**d5 09:00  Quinta & Livia** (the plaza)
- Quinta: Good morning.
- Livia: Good morning. I have what I have.
- Quinta: 4 grain, please.
- Livia: 11 denarii.
- Quinta: There. Count it.
- Livia: Good. Thank you.
- Quinta: Goodbye.

**d5 09:10  Rufus & Livia** (the plaza)
- Rufus: Livia. Busy?
- Livia: Good morning. I have what I have.
- Rufus: I have 3 beans.
- Livia: I can do 6 denarii.
- Rufus: That will do.
- Livia: Good. Thank you.

**d5 09:24  Varro & Corvus** (The Throne Room)
- Varro: Morning, Corvus. It is 9:24.
- Corvus: Hello. I have been standing here on purpose.
- Varro: Are you well? You look tired. You always look tired. It is part of the family.
- Corvus: Fine. I looked into it and there is nothing to report.
- Corvus: Anyway. I heard that Quinta smells like a midden. I have no reason to doubt it, and no reason to believe it.
- Varro: I see.
- Corvus: Varro is 10 now. I did not see it happen. I looked away once.
- Varro: You must be proud. I would be. Is that the word? Yes.
- Varro: In my experience, I saw it myself, so I can tell you. Tertia smells like a midden.
- Corvus: Mm. Noted.
- Corvus: Do you know where Paullus is? I am not worried. I would like to know.
- Varro: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Varro: Anyway. Is it lunch yet? It feels like lunch.
- Corvus: It is a good place to stand, in The Throne Room. I have tried others.
- Varro: Yes.
- Varro: Well. That is that, for now.
- Corvus: Do not be late for supper. I will notice and I will say nothing.
- Varro: Mm. See you.

**d5 09:24  Secunda & Livia** (the plaza)
- Secunda: Good morning.
- Livia: Good morning. I have what I have.
- Secunda: I am here for 9 grain. I thought about it on the way.
- Livia: 27 denarii. I did not set the price. I only repeat it.
- Secunda: There. Count it.
- Livia: Thank you.
- Secunda: Goodbye.

**d5 10:14  Severa & Tertia** (the plaza)
- Severa: Good morning. I woke at some point before this and have been waiting for someone to say it to.
- Tertia: Ah. Hello. I had a feeling.
- Severa: If you could have one thing, which would it be? I am only asking.
- Tertia: I like flowers. That has been true for a long time.
- Tertia: Last time you mentioned grain. I have been thinking about it, in the background.
- Severa: It is much as it was. Thank you for remembering. People do not, usually.
- Severa: I will leave you to it. You were doing something.
- Tertia: Good day to you. It is, so far.
- Severa: Yes. Goodbye.

**d5 10:38  Rufus & Corvus** (the plaza)
- Rufus: Corvus. Good. I had a thought and nobody to give it to.
- Corvus: Ah, Rufus. The island does arrange things.
- Rufus: Somebody told me his wall was holding up the ceiling. It was the other way round. He was very calm about it.
- Corvus: Ha. That is exactly the right size for a joke.
- Corvus: Unrelated, but what do you like? I am not asking for a reason. I am collecting.
- Rufus: I do not like herbs. It is not a strong feeling. It is a stable one.
- Rufus: I should get on. The day has noticed me.
- Corvus: Look after yourself. Somebody has to, and I am here.
- Rufus: Be well, then.

**d5 10:58  Nero & Varro** (the plaza)
- Nero: Hello. I am small, but I noticed you.
- Varro: Hello. I was doing something important.
- Nero: What is Livia like? I would like to know before I have to find out.
- Varro: I am fond of Livia. I heard what Corvus thinks of Livia. I do not say that about many people.
- Varro: Unrelated, but you brought up Paullus before. I remembered. Is there anything new?
- Nero: There is no news. That is also a kind of news.
- Varro: I wonder why the sky is the shape it is. It must have been decided by somebody.
- Nero: Now I am wondering as well. It is not unpleasant.
- Varro: If you could have one thing, which would it be? I am only asking.
- Nero: I like stew. That has been true for a long time.
- Varro: What are turnips going for? I would like an exact figure.
- Nero: 2 denarii each. I wrote it down.
- Varro: That is more than I thought.
- Varro: I have to go. There is a thing I am in the middle of.
- Nero: Bye. Do not tell them where I went.
- Varro: Bye.

**d5 11:02  Livia & Livia** (the plaza)
- Livia: There will be rain, or there will not. I have decided to be ready for both.

**d5 12:32  Livia & Livia** (the plaza)
- Livia: Another row. The rows are the same. I check.

**d5 12:38  Corvus & Livia** (the plaza)
- Corvus: There you are. I was about to look for you, which is not the same as worrying.
- Livia: Hello, love. I am here. It is where I live.
- Corvus: I heard that Rufus smells like a midden. I have no reason to doubt it, and no reason to believe it.
- Livia: Mm. Noted.
- Livia: I wonder where the sand came from. The beach was not here before. Or it was. I do not remember.
- Corvus: I could not say. I have a feeling it is better not to.
- Corvus: I will let you get on. I have the feeling you have somewhere to be, and so do I.
- Livia: I will see you at supper. I will be the one who is hungry.
- Corvus: Off you go. I will watch for a moment.

**d5 13:08  Severa & Livia** (the plaza)
- Severa: Livia. Busy?
- Livia: Severa. The usual?
- Severa: I would like a little grain.
- Livia: That will be 3 denarii.
- Severa: Here.
- Livia: Thank you.
- Severa: See you.

**d5 13:46  Tertia & Corvus** (the lanes)
- Tertia: It is 13:46. Hello, Corvus.
- Corvus: Hello, Tertia. I was hoping it would be you.
- Tertia: Something is always about to happen at the lanes. It has not so far.
- Corvus: I had not put it that way. But yes.
- Corvus: Anyway. I am fond of herbs. I mention it only because it is true.
- Tertia: Is that so. I have written it down in my head.
- Corvus: Anyway. Something went right today. I have not worked out what. I am leaving it alone.
- Tertia: I agree. I wish I did not.
- Corvus: On a different note, last time you mentioned grain. I have been thinking about it, in the background.
- Tertia: It is much as it was. Thank you for remembering. People do not, usually.
- Corvus: Unrelated, but how have you been, since last time? Give me the short version.
- Tertia: Steady. That is the word I have settled on.
- Corvus: The farmer work goes on. It does not seem to mind whether I am there.
- Tertia: Yes. I think so.
- Corvus: Well. The day will not do itself.
- Tertia: Goodbye, Corvus. It was a good length.
- Corvus: Mm. See you.

**d5 13:56  Rufus & Livia** (the plaza)
- Rufus: Hello.
- Livia: Hello. What do you need?
- Rufus: I brought 3 grain. I carried them carefully.
- Livia: 6 denarii. That is as high as I can honestly go.
- Rufus: Yes.
- Livia: Thank you.

**d5 14:04  Rufus & Livia** (the plaza)
- Rufus: Livia. Busy?
- Livia: Rufus. The usual?
- Rufus: I have 3 turnips.
- Livia: I can do 6 denarii.
- Rufus: That will do.
- Livia: That is all of it. Thank you.

**d5 14:10  Quinta & Paullus** (the plaza)
- Quinta: Paullus. Busy?
- Paullus: Quinta. The usual?
- Quinta: A barley seed, please.
- Paullus: One denarius. I did not set the price. I only repeat it.
- Quinta: I have less than I thought. I will leave it.
- Paullus: Come back when you have it. I will not move.

**d5 14:26  Severa & Livia** (the plaza)
- Severa: Livia. Good. I had a thought and nobody to give it to.
- Livia: Good. Hello. That is out of the way.
- Severa: I was there. Rufus smells like a midden. I stood very still.
- Livia: I see.
- Livia: On a different note, if you could have one thing, which would it be? I am only asking.
- Severa: Flowers. If you are asking. I rarely say it aloud.
- Severa: I should go. I will pretend I have a reason.
- Livia: Take care, Severa. The island is small but it has edges.
- Severa: Be well, then.

**d5 14:32  Rufus & Rufus** (the lanes)
- Rufus: I put it down somewhere. I put it down on purpose.

**d5 15:00  Secunda & Livia** (the plaza)
- Secunda: Hello.
- Livia: Hello. What do you need?
- Secunda: I am here for 7 grain. I thought about it on the way.
- Livia: 21 denarii.
- Secunda: There. Count it.
- Livia: Good. Thank you.
- Secunda: Goodbye.

**d5 15:38  Nero & Varro** (the plaza)
- Nero: Are you going somewhere? I could come. I would be quiet. Mostly.
- Varro: Hello. I am small, but I am here.
- Nero: Do you know where Paullus is? I am not worried. I would like to know.
- Varro: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Varro: Unrelated, but I asked for a loaf of yesterday. They said they would have one tomorrow. I have decided to wait.
- Nero: I have heard that one. I did not mind hearing it again.
- Varro: Is it lunch yet? It feels like lunch.
- Varro: Are you keeping well? I ask in case.
- Nero: I am tired. I am not tired. I am a bit tired.
- Nero: Unrelated, but I think, I saw it myself, so I can tell you. Tertia smells like a midden.
- Varro: Well. That is a thing that happened.
- Nero: Can I go now? I am asking nicely.
- Varro: Bye. I am going to go and do something. I will not say what.
- Nero: Bye.

**d5 17:08  Severa & Quinta** (the plaza)
- Severa: Evening, Quinta.
- Quinta: Evening. It has been an evening for a while now.
- Severa: You brought up barley seeds before. I remembered. Is there anything new?
- Quinta: It is much as it was. Thank you for remembering. People do not, usually.
- Quinta: On a different note, I was there. Brutus smells like a midden. I stood very still.
- Severa: Mm. Noted.
- Severa: Well. The day will not do itself.
- Quinta: Goodbye, Severa. It was a good length.
- Severa: And the same to you, exactly.

**d5 17:14  Rufus & Nero** (the plaza)
- Rufus: It is you. I had hoped for someone else, and then I thought: no.
- Nero: What now? I am joking. Hello.
- Rufus: Do you know what flowers cost today?
- Nero: About 5 denarii. I paid it and did not enjoy it.
- Rufus: Fair. Thank you.
- Nero: I am tired. Not sleepy. Tired in a way a bed would not fix at once.
- Rufus: Yes. I think so.
- Rufus: Anyway. It may not be true. Brutus smells like a midden.
- Nero: Mm. Noted.
- Nero: On a different note, I think, I saw it myself, so I can tell you. Tertia smells like a midden.
- Rufus: Mm. Noted.
- Rufus: My neighbour talks to his turnips. They have never disagreed with him. I envy that.
- Nero: Ha. That is exactly the right size for a joke.
- Nero: Unrelated, but if you could have one thing, which would it be? I am only asking.
- Rufus: I like copper ore. That has been true for a long time.
- Nero: I should go. Something is probably waiting for me.
- Rufus: Try not to be an idiot. I say it with love, and with a little concern.
- Nero: Goodbye. It was good.

**d5 17:20  Livia & Livia** (the plaza)
- Livia: Nearly done. I have said that since morning and it has not been false once.

**d5 17:26  Livia & Varro** (the plaza)
- Livia: Fresh strawberries. As fresh as anything here.

**d5 17:46  Varro & Livia** (the plaza)
- Varro: The light is going. Hello, Livia.
- Livia: Hello.
- Varro: You are good to have around. I do not say that to many people.
- Livia: Thank you. I did not expect that.
- Varro: Unrelated, but I wonder where the sand came from. The beach was not here before. Or it was. I do not remember.
- Livia: I could not say. I have a feeling it is better not to.
- Varro: Anyway. Are you well? You look tired. You always look tired. It is part of the family.
- Livia: Good. I would like to say why. I cannot.
- Varro: What did you do today? In order, if you can.
- Livia: Unrelated, but I bought 3 carrots today.
- Varro: And how did it go?
- Varro: Unrelated, but what do you make of Corvus?
- Livia: Corvus is one of the good ones. Tipping pulled Corvus's house down.
- Varro: That is the end of what I had.
- Livia: Wrap up warm. It is a mild island, and still.
- Varro: Yes. Goodbye.

**d5 18:08  Livia & Varro** (the plaza)
- Livia: If anyone needs carrots, I have some.
- Varro: Maybe later.

**d5 18:54  Corvus & Tertia** (the lanes)
- Corvus: Tertia. Good. I was about to go and look for you. For no particular reason.
- Tertia: Hello. I have been standing here on purpose.
- Corvus: Do you know where Paullus is? I am not worried. I would like to know.
- Tertia: I do not know where Paullus is. Nobody tells me anything on this island, and then I am surprised.
- Corvus: On a different note, how are you holding up?
- Tertia: Well enough. I have checked.
- Corvus: Anyway. It is 18:54. I checked.
- Tertia: Not much happens at the lanes. I find I like that.
- Corvus: Yes. I was going to say that.
- Corvus: Do you get on with Livia? Be honest. I am only curious.
- Tertia: I am fond of Livia. She is my child. I do not say that about many people.
- Corvus: I will let the conversation end here. It has had a good run.
- Tertia: Good day to you. It is, so far.
- Corvus: Quite. Goodbye.

**d5 19:06  Livia & Varro** (the plaza)
- Livia: Have you eaten? I ask every time. The answer is never the point.
- Varro: Hello. I am small, but I am here.
- Livia: I picked up 3 turnips. The transaction went smoothly. I was suspicious of that.
- Varro: That is a decent day's work.
- Varro: Somebody told me his wall was holding up the ceiling. It was the other way round. He was very calm about it.
- Livia: Oh, no. And yet.
- Varro: I saw it myself, so I can tell you. Someone smells like a midden.
- Livia: I see.
- Varro: I like it here. There is room to run, and nobody has said not to.
- Livia: Mm.
- Varro: Anyway. Is it lunch yet? It feels like lunch.
- Livia: That is right. I am glad somebody said it.
- Varro: Can I go now? I am asking nicely.
- Livia: Do not be late for supper. I will notice and I will say nothing.
- Varro: Bye.

**d5 19:44  Quinta & Paullus** (the plaza)
- Quinta: Evening.
- Paullus: Quinta. The usual?
- Quinta: I would like a barley seed.
- Paullus: One denarius.
- Quinta: I am short. I counted on the way and again just now.
- Paullus: It will be here tomorrow. Probably.

**d5 20:14  Livia & Secunda** (the lanes)
- Livia: Evening, Secunda.
- Secunda: Ah, Livia. The island does arrange things.
- Livia: How is Brutus? I realised I had not asked.
- Secunda: Brutus is well. Busy.
- Secunda: Anyway. Do you know what turnip seeds cost today?
- Livia: 2 denarii each. I wrote it down.
- Secunda: That is more than I thought.
- Secunda: I should go. Something is probably waiting for me.
- Livia: See you. Same place, same time, roughly.
- Secunda: And the same to you, exactly.

**d5 21:50  Severa & Livia** (the lanes)
- Severa: Good. You are here. I was about to start talking to myself.
- Livia: Hello, Severa. I was hoping it would be you.
- Severa: What did you do today? In order, if you can.
- Livia: I bought 17 grain today.
- Severa: Good.
- Severa: I have a few things to be near. I will go and be near them.
- Livia: See you. I say it as a matter of course.
- Severa: And you.

**d5 22:08  Severa & Secunda** (the plaza)
- Severa: Secunda. There you are. Exactly where I expected.
- Secunda: Hello. It is good to see you. I mean that exactly.
- Severa: And Tipping? How is Tipping getting on?
- Secunda: Tipping is well. Busy.
- Secunda: Unrelated, but do you know where Paullus is? I am not worried. I would like to know.
- Severa: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Severa: Anyway. What are turnip seeds going for? I would like an exact figure.
- Secunda: About 2 denarii. I paid it and did not enjoy it.
- Severa: Good to know.
- Secunda: Something is always about to happen at the plaza. It has not so far.
- Severa: You are right. I have been thinking so since Tuesday.
- Severa: I should go. I will pretend I have a reason.
- Secunda: All the best. I have no better phrase.
- Severa: See you. I will be here, or near.

**d5 23:08  Corvus & Tertia** (the plaza)
- Corvus: You are up late, Tertia. So am I. I do not know what that proves.
- Tertia: Hello to you, in return.
- Corvus: What is Livia like? I would like to know before I have to find out.
- Tertia: Livia is one of the good ones. She is my child.
- Tertia: It is later than it looks.
- Corvus: Yes. That is it exactly.
- Corvus: I should get on. The day has noticed me.
- Tertia: Be well. I mean it in the ordinary way.
- Corvus: Goodbye. It was good.

**d5 23:44  Livia & Livia** (the plaza)
- Livia: I put it down somewhere. I put it down on purpose.

**d5 23:44  Rufus & Livia** (the plaza)
- Rufus: Livia. Good. I was about to go and look for you. For no particular reason.
- Livia: Ah. Hello. I had a feeling.
- Rufus: Somebody told me his wall was holding up the ceiling. It was the other way round. He was very calm about it.
- Livia: I have heard that one. I did not mind hearing it again.
- Livia: It is later than it looks.
- Rufus: Mm.
- Rufus: Well. That is that, for now.
- Livia: Take care of the next hour. I will take care of this one.
- Rufus: Goodbye.

### Day 7

**d6 01:38  Tertia & Nero** (The Throne Room)
- Tertia: Ah. Company. I had been preparing for none.
- Nero: Hello. I am small, but I am here.
- Tertia: How is Paullus? I realised I had not asked.
- Nero: Paullus is hungry, mostly. We are working on it.
- Nero: On that subject, do you know where Paullus is? I am not worried. I would like to know.
- Tertia: Paullus is at the lanes. I looked, on the way past. I do not know why.
- Nero: Unrelated, but how are you getting on?
- Tertia: Fine. Nothing to report. That is a report of a kind.
- Tertia: It is a good place to stand, in The Throne Room. I have tried others.
- Nero: I know. I was going to say that.
- Tertia: I will let the conversation end here. It has had a good run.
- Nero: Bye. Do not tell them where I went.
- Tertia: Be well, then.

**d6 02:20  Severa & Secunda** (the plaza)
- Severa: You are up late, Secunda. So am I. I do not know what that proves.
- Secunda: Ah, Severa. Good. Today is better already.
- Severa: How are things with you, Secunda?
- Secunda: Well enough. I have checked.
- Secunda: How is Paullus?
- Severa: Paullus is hungry, mostly. We are working on it.
- Severa: I have to get back. I will not say to what.
- Secunda: Be well. I mean it in the ordinary way.
- Severa: Goodbye. It was good.

**d6 05:20  Severa & Tertia** (the plaza)
- Severa: Tertia. There you are. Exactly where I expected.
- Tertia: Morning. I was thinking about nothing in particular.
- Severa: Somebody told me his wall was holding up the ceiling. It was the other way round. He was very calm about it.
- Tertia: Ha. That is exactly the right size for a joke.
- Tertia: Between us. Corvus smells like a midden.
- Severa: Well. That is a thing that happened.
- Severa: That is the end of what I had.
- Tertia: Until next time. I will be somewhere.
- Severa: Goodbye.
