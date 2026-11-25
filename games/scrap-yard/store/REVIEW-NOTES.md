# Scrap to Ingot: notes for App Review and Play review

**PLACEHOLDER of the first yard (25 November 2026; re-checked in the fix pass the same evening), for the owner's phone test through Expo Go. Not for
submission.** This is the house's shape filled honestly for what the first yard (docs/design/yard-stage1.md)
contains today. Before any submission the store step rewrites it for the build that is submitted (with the
online stage, ads and purchases, if they ship), checks every line against that build, and adds the contact
name, email and phone by hand in the consoles (no file in this repository holds them). Names below come from
the names register (scripts/content/yard/names.json) as of this date.

Paste the text between the lines into App Store Connect, App Review Information, "Notes", and into the Play
Console's "App access" instructions.

---

First, the content. Scrap to Ingot is a management game set in a licensed scrapyard in a country we made up.
Every company, person, place, market and price in it is invented; no real company, brand, logo, exchange or
price feed appears. The metals, grades and machines are real and correctly named. The business is a legal
one: loads bought from the two partners are weighed over the weighbridge (gross, tare, net) with the seller's
ID checked and paid by transfer; household items left at the public drop-off are signed in on a slip; a site
licence hangs in the yard office from the first minute, closed vessels arrive certified empty, and the one car in the yard is
a depolluted end-of-life car delivered with its paperwork. Nothing in the game shows how to do anything
dangerous or illegal. All money in the game is simulated: no real money goes into or comes out of a price or
anything else, and nothing in it is gambling, trading or financial advice.

This build has no account, no sign-in, no online features, no other players, no typed text, no ads and no
purchases.

The game, in landscape: one thumb steers a worker around a yard several screens wide, seen in a three-quarter
view. Work needs no button: the worker stops beside a washing machine, a radiator or a cable bundle and it
comes apart piece by piece onto the frame on his back (light iron panels, a whole motor, a counterweight to
the rubble skip). On the platform scale each piece is weighed into a bay by grade at the day's posted price;
the merchant's flatbed collects every bay the player has not held and pays by transfer, printed on a
collection ticket. An old hand stripper that came with the yard strips cable into bare bright copper, and a
small crucible under an extraction hood melts brass into ingots. The player buys tools and wheeled carriers, a hook-lift truck that fetches
labelled loads from two local partners over a weighbridge (gross, tare, net), and hires a yard hand, a
cutter and a driver who keep the yard working while the app is closed. A table ranks the yard against
simulated rival firms by tonnes supplied.

Our account has four earlier games, built by the same small team on one in-house code base: Pizza Empire
(a side view of a kitchen; tap its stations; guests pay for meals), Orbit Haulers (a top-down asteroid map;
drag drones onto rocks; a freighter is swiped away to sell its hold), Lantern Row (a board of cells; merge
snacks; filled tickets pay) and Proudly Adequate (a desk; papers pushed up to sign or pulled down to refuse;
ministries pay every second). This one is built differently, and where it is related we say so:
1. The only control is steering: a floating stick moves the worker (and the truck, which he enters by
   walking into it) continuously through the yard; work happens by standing next to things. Nothing is
   tapped to earn, dragged onto a target or swiped away. Orbit Haulers also gathers material on a map and
   brings it home; here there are no drones, routes or freighter, the player walks the worker himself, and
   the view is a wide oblique yard followed by a camera, not a top-down map.
2. Production runs backwards from an assembly line: one object splits into graded outputs and waste that go
   to different places (a washing machine into panels, a motor and a counterweight; a cable into copper and
   PVC; a crucible charge into an ingot and dross). Pizza Empire's chain builds one product out of parts.
3. Money comes only when the merchant's flatbed collects a bay of one grade at the price posted for that day
   (one price a day per family of metals, shown with the days before it and a word: low day, usual, high
   day); any bay can be held for a better day. No customer, departure, finished order or timer pays.
4. Hired crew (a yard hand, a cutter, a driver) are related to the managers of our restaurant game, the
   minders of Lantern Row and the ministers of Proudly Adequate, which we state openly: they are hired with
   in-game money, never random, and each takes over one step of the work the player does by hand.
5. People are drawn adults in safety gear, as in Pizza Empire and Proudly Adequate; the art, sounds, music
   and every text are this game's own.
6. A list of goals on a clipboard leads the first hour, as the missions of Pizza Empire and Orbit Haulers do.
   Once the yard reaches its second rung, an optional supply deal offers to take one grade from the yard's
   own bays each day for a few days at a price locked when it is signed; it is related to Orbit Haulers'
   contract board (deliver metal for a premium). It differs: no departure or timer pays, nothing is charged
   for a short day, and the metal is the yard's own graded stock, not a hold to fill.

Tap path (well under a minute):
1. Launch the app, in landscape. A loading animation plays: a crane sets one steel plate per word of the
   title on a weighbridge, a crucible pours, the bar cools, the picture parts like two gate leaves.
2. Put a thumb anywhere in the lower left and drag toward the washing machine with the pulsing ring by the
   gate; let go beside it. It comes apart; the pieces go onto the worker's frame.
3. Steer onto the platform scale: a weigh-in ticket prints by grade. The merchant's flatbed loads the bays and
   a collection ticket prints "Lot sold to Tollbridge Metals · weighed out · paid by transfer"; the cash in
   the top bar rises.
4. Steer to the hand stripper by the cable bundle and stand there: copper spools into the tray. Weigh it in:
   the copper is worth many times the iron.
5. At the tool rack the round button lower right reads "Open": a card lists tools and carriers with exact
   prices and one Buy each.

---

Checklist (for the store step, not for pasting):
- Every statement above is true of the first yard on 25 November 2026: no account, no online part, no ads,
  no purchases (they are stubs in stage 1, yard-design.md 8); re-check each against the submitted build.
- No number here that tuning can move (prices, times, the away cap, the rivals' count).
- The kinships named here (crew, people, the goal list, the supply deal) are the ones the fingerprint names
  (store/fingerprint.json _notes).
- Safety gear at the pour: the sentence "the worker wears a face shield and an aluminised apron at every pour"
  was taken out in the fix pass (finding S2): nobody has yet seen the pour pose close enough on screen to
  confirm both. Put it back only after a person sees it in the preview (`?preset=m30&pour=1`: the first pour,
  by the boss, a moment after the curtain parts).
- Fix pass (25 November 2026, evening): the incoming-loads sentence says only what the build does (S2); the
  goal list and the supply deal's kinship are named (S5, S6).
- Ratings: PENDING (store/RATING-NOTES.md, the hand-written block).
