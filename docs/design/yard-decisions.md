# Scrapyard: the lead's decisions, in the order they were made

This file keeps the three sets of decisions that the specifications refer to by number, so that a
later stage can be designed without the working folder they were written in. Order of authority for
the first yard: part 2 and part 3, then section 14 of `yard-design.md` (D1 onwards), then its text,
then part 1, then the first-yard document. File names inside the parts (`RULING.md`, `ECONOMY.md`,
`STAGE1-RULING.md`, `proto/...`, `stage1-critiques.json`) are those of the working folder; the texts
are complete here.

- Part 1: the ruling on three competing designs (points 1 to 16), before the specification.
- Part 2: the first yard's economy after the first numbers prototype (E1 to E10).
- Part 3: the first yard after its review (S1 to S24).

---

## The lead's ruling on the three designs (25 November)

It stands above the judges where they differ. A point that cannot work is reported with its
smallest example, never quietly replaced. The designs and the judges' verdicts in full are in
`design1-result.json` beside this file (keys: designs[hand, trade, league], judges[player, store,
builder]).

All three judges chose the "hand" design. It is the base.

1. **Base and title.** The "hand" design (the back-lane yard, the weighbridge ticket by grade, the
   tools and carrying tiers, the lane's partner skips, the industry table with its range gate),
   with the grafts and must-fixes the judges name, except where a point below says otherwise.
   Working title "Scrap to Ingot" (all three designs chose it); fallbacks "Heavy Melt", then
   others; a names step searches for clashes before anything is drawn with it.
2. **Words for the two bodies.** The owner wrote "join a company that someone created" and "list
   the company you make on an exchange". So a COMPANY is the body a player founds or joins, at
   most 30 members, and it is the company that is listed. A player's own operation (their yards
   and plants) is "your yard" at first and "your business" once it has more than one site; it has
   a trading name composed from our lists. A founder who never invites anyone has a company of
   one. In the local stand-in, simulated firms (labelled as simulated) can be members, so that
   everything a company does can be played with no network. The word "group" is not used for it.
3. **One ranking that never falls.** The industry table ranks LIFETIME tonnes supplied, with the
   range gate (the number of distinct metals supplied) so that nobody climbs on steel alone; a
   position on it never drops while the player is away. Invented rival firms fill it; the largest
   stands at roughly 6 to 10 million tonnes, not 150 million; a twice-a-day player passes a rival
   at least every one to two sessions in the first week and at least every three days after. The
   lead confirms the scale after the numbers prototype. The weekly race among players is a
   separate board (point 12). No trailing-week position anywhere.
4. **True prices.** Real per-kilogram ratios from steel to iridium with units that switch from
   tonnes to kilograms to grams; no compression. Balance comes from quantities.
5. **The first yard is a concept test the owner gets early** (the builder's cut, 12 to 15 thousand
   lines): the crane loading animation; the yard and the lane with two partner sites; stick, cut,
   carry, weigh; tools 1 to 3; carrying tiers 1 to 3; the cable stripper, the motor bench and a
   SMALL crucible furnace; three crew roles (yard hand, cutter, driver); the daily price board
   with a few days of history and a Hold flag on a bay; one small fixed-price supply deal; the
   industry table chip with its rivals; time away with a cap; the local save. Ads and purchases
   are stubs in this stage. Moved to stage 2: the baler, the magnet crane, the forklift, the third
   partner, further crew roles, the Trade Book, purchases. Its first five minutes must show, in
   this order: the crane loading screen ending in a poured bar; a wreck coming apart piece by
   piece onto the worker's back; a weighbridge ticket by weight and grade within about 25
   seconds; a value jump the player causes (stripped bare bright copper at tens of times the iron
   price) by about 1:30; a purchase arriving in the world; a hired helper carrying beside the
   player by minute 5 at the latest; the furnace pad in view from the first minute with its price
   and a sample ingot; the ladder chip passing a named rival. The truck and the first drive out
   to a partner's skip come by about minute 8 to 10; the first small pour of an ingot by about
   minute 18 to 25. At most one purchase prompt a minute.
6. **Buying is a card, not a tile.** No standing on a pad while a ring fills to buy (it is the mark
   of a hundred hyper-casual games). A purchase is made from a card at the place (the tool rack,
   the office, a machine's pad), one tap, the exact price shown; what was bought then arrives in
   the world.
7. **The hand stays worth it at every size.** Rewards of the hand scale with current income:
   feature lots (one every few hours, a few waiting at most, never expiring, opened only by the
   player's worker), hand lots at each later site, a foreman bonus for crews where the worker has
   lately worked, and commissioning new machines by standing at them. Target, measured at three
   rungs and not only in week three: a player who uses the hand earns at least a fifth more than
   one who only manages, and no single mechanism gives more than three fifths of that gain.
   Auto-pickup takes the highest value per kilogram first.
8. **The market.** Stage 1 has only the daily posted board (with its date, a few days of history
   and the Hold flag). The two exchanges, the dealers, the weekly patterns, the signals and
   shipped sales arrive in the market stage. Everything is on one market clock in UTC that never
   runs backwards; no exchange session hours in the first version. A sale or booking card carries
   the price step it showed and asks again ("Price updated: a to b") if the step has changed, so
   shown equals applied by mechanism. A shipped sale is priced at arrival, or at a fixed quote at
   dispatch that loses about one per cent a day of transit. Signals (stocks, bulletins) show no
   future price. Forward prices appear only as a word (shortage now, balanced, plenty), never as
   a number. Nothing may look like a real exchange's rules or like a trading app: no "limit
   order", no bets, leverage, shorts, futures or options; the line "All prices, exchanges and
   shares are fictional and have no real-world value" shows on first opening the board and the
   listing. A bot gate: no shipping strategy beats selling at once by more than about 8 % on the
   same tonnage; looking ahead by changing the clock gains nothing.
9. **Costs never run while the app is closed.** No wages, rent, decay or interest by the clock.
   Storage and the like are prepaid for a period shown on the card; when it runs out the stock
   waits and nothing is charged. A line whose margin is below zero pauses.
10. **A legal business, visibly.** Tickets carry "ID checked · paid by transfer"; a radiation
    portal and an ID desk appear at the gate early as a proud moment; cylinders and vessels are
    "certified empty"; catalytic converters come only from the yard's own depolluted cars and
    named garages, never from the public drop-off or as a random find.
11. **The fingerprint.** New honest vocabulary, each with a definition and a mechanic in stage 1
    that proves it: core_verb "steer"; production_topology "separation-tree" (one object splits
    into graded outputs and by-products that go to different places; not "walked-yard");
    main_screen_layout "three-quarter-world"; money_moment "graded-lot-sale" (material leaves as
    graded lots at a posted price that changes daily, and the player may hold a lot for a better
    day; this needs the Hold flag and the dated board in stage 1). progression_structure uses the
    existing word "tech-tree" (the lines unlock as a tree of unit processes), prestige_model
    "none". character_kind "humans" is shared with two games and is accepted: no robots to win a
    point. Nothing is counted as differing until it is measured.
12. **Other players.** As fixed point 12 of the frame, with these choices: weekly brackets of 30
    placed by capacity band at the week's start (capacity derived by the server from assets,
    never declared by the client), a newcomers' bracket for the first seven days, pennants for
    the top three and for the best growth, rewards cosmetic only; an all-time board anchored on
    the calendar so every player sees the same rows; a fairness gate that an always-on player
    supplies at most a quarter more than a twice-a-day player of equal capacity. A company has a
    leader and co-leaders, one weekly company order from an invented corporation sized to its
    members' capacity and fed by normal deliveries, rewards only for those who contributed, fixed
    phrases, invitations that can be declined and switched off, leadership passing on after 14
    days without a logged action. Visits are read-only tours; the only actions are follow, invite,
    report and block; no likes or counts. NOT in the first version: a shared company ship, rival
    firms' divestments, any takeover. The listing (point 2) turns the company's results into a
    market value by a published formula recomputed weekly; no shares are traded, issued to
    players or sold.
13. **Money: the owner decides, and it need not be decided before the online stage.** Every judge
    asked that nothing sold changes production, because production is ranked. The owner's stated
    aim for these games is earnings from ads and purchases. The specification therefore carries
    BOTH lists, and builds nothing in stage 1 that depends on the choice: list A (fair-first):
    "no ad videos", looks for the yard and the company emblem, a founder's plaque; list B
    (house-style, earns more): list A plus time-savers that play also reaches (the away cap that
    play earns later, given at once; faster building; a second crew slot early), with weekly
    brackets banded by a capacity that includes them, and never a consumable that adds tonnes or
    score at once. In neither list: anything random, anything limited in time or quantity, away
    hours beyond what play can earn. Rewarded ads give credits only, with the amount on the
    button, bounded per day, and never count toward a board.
14. **Names.** No name from the fourth game (Osmund, Dunnock and the like) and no near-miss of a
    real company, exchange, port or town. Every invented name (the title, the two exchanges, the
    corporations, the rival firms, the regions and ports, the currency) goes through a names
    register with a search before art or text is built on it. The first screenshot and the icon
    lead with copper, the ticket and the pour, not with a truck; the icon is not a lone gold bar
    (it reads as a bullion app) and is judged at 60 px beside the four other icons first.
15. **Size and order.** Stages, each a playable game: 1 the first yard; 2 the works (processing
    yard, more melt lines, purchases and ads live); 3 the market (exchanges, dealers, corporate
    partners and contracts, road and rail); 4 territories (regions, vessel and plane, hydro
    lines); 5 other players (boards, tours, companies of 30, the listing); 6 the top (tungsten,
    the platinum group and iridium, the last rungs, the store package). Cut order if a stage runs
    long: the simulated social layer's extras, rivals' moves, the buy-ratio lever. The late game
    is bounded in closed form: a cap on capacity per rung, so the server bound and the brackets
    are computable and the largest numbers stay readable.
16. **Engineering points from the builder judge that bind.** Mass as integer grams and money as
    integer hundredths; ten ticks a second; no Date.now and no Math.random in the rules; crew work
    computed as rates both live and away, with only the walking interpolated on screen; the away
    pass split at price steps so that revenue is mass times price per segment exactly, tested
    against a replay within half a per cent; the vehicle rule of the ground work (walk into it to
    drive; a "Step out" button) is the one rule everywhere; rival rows are a pure function, with
    the local table anchored on the player's start and the online all-time board on the calendar.

---

## The first yard's economy: the lead's decisions after the first prototype (25 November)

The first prototype (`proto/REPORT.txt`) played `docs/design/yard-stage1.md` as written. The first
five minutes hold for every player. After that the yard is starved: once the old stock is gone the
weigh-in bay is the only source (about §60 to §90 a minute), every purchase waits three to eight
minutes, the first drive, the first pour and rung 2 come late, nobody reaches rung 3 in the hour,
and the slow hand is barely slower than the brisk one, because supply and cash limit the pace and
the thumb does not. With partner skips at a fifth of their value money floods in after the torch;
at two thirds of their value the yard has no margin. A player who stops cutting after the first
hire is stuck for ever. The away pass as written differs from a replay by up to five times.

These decisions bind the second prototype and the revision of the first-yard document. They change
content and numbers freely; they change a rule only where they say so.

**E1. In the first hour the hand is the limit, not the supply.** This is a hands-on tycoon in the
manner the owner named: there is always more to cut than the worker can cut and carry, so every
better tool and every bigger carrier is felt at once as more money per minute. The yard the player
takes over is FULL: old stock in heaps by zone, several tonnes in all, enough that a normal player
is still working through it at minute 30. Each zone asks for a tool tier (spanners: appliances,
bicycles, cable bundles, taps and fittings; grinder: radiators, cylinders, a bath, gates and
railings; torch: the car, beams, a tank certified empty), and the better material lies in the
later zones. The weigh-in bay adds a trickle that never stops (the no-dead-end source). Partner
skips are the renewable supply that takes over as the heaps thin, first with the truck.

**E2. Purchases come from the payback rule, also in stage 1.** A purchase that raises income is
priced at a number of minutes of the income it adds (short at first: one to three minutes for the
first five purchases, rising through the hour), so that for the normal player the next useful
purchase is never more than three minutes of play away in the first hour, and never more than one
prompt a minute. Prices are derived by the prototype, not guessed; the document prints them marked
as tuned. The advice line calls a purchase useful when it widens the current bottleneck.

**E3. Partner skips are bought at a fair price and the margin is made by the yard.** A skip costs
about 70 % of the value of its contents AS FOUND (the unprepared, mixed, unstripped grades at mean
prices), its label shows contents and price before it is hooked, and nothing about it is hidden or
drawn at random after paying. The yard earns by preparing: cutting to size, stripping, the bench,
the melt. So partner mixes are made of material that the yard's tools and machines improve, in
true proportion to the trade (the reviewers from the trade correct the ratios; a motor is not a
quarter copper). The first load from each partner is a small trial load at a fixed price a new
yard can pay.

**E4. No dead end without the hand.** From any state, a player who never touches the stick again
still earns enough, slowly, to reach the next purchase: the first helper also carries whole light
things from the weigh-in bay to the scale at their unprepared grade. A test proves it from twenty
random states. The hand's worth stays large in the first hour (it is the main producer there); the
"at least a fifth more" aim is measured against a player who manages from cards after the second
hire, and the "no mechanism over three fifths" rule is measured from stage 2 on.

**E5. One rate engine, live and away.** Ruling 16 holds: crew work is a rate, live and away, from
one function. Live play does NOT move whole loads in the rules while the away pass moves flows:
both advance the same model, a set of stocks and rates that are constant between events (a stock
empties or fills, a slot frees, a heat ends, a skip refills, the price step changes, cash reaches a
gated price), jumping from event to event. The ten-times-a-second tick is the same function with a
small step. The helper walking with a 60 kg load on screen is a picture of that flow and decides
nothing. Piece-size limits, the weigh-in bay's slots and how a carrier divides its time between
routes are part of the rate function and are written out. The gate is exact agreement between
ticking and jumping (within rounding), on every bot run; no separate closed form exists to drift.

**E6. The crucible takes its charge by mass**, not by whole pieces.

**E7. The ladder's first rungs follow the tuned economy.** Rung 2 at 12 to 18 minutes and rung 3
at 55 to 65 minutes for the normal player are the aims; their tonnes are set by the prototype from
the tuned hour (the document's 2 t and 25 t are starting values). Four rivals are passed in the
hour, the first by minute 5.

**E8. Something to buy for three days.** Stage 1 is the concept test, and the owner may keep it
open: crew and machine levels priced by the payback rule keep a useful purchase within two
sittings for at least three days of the twice-a-day habit, and the yard's capacity ceiling for the
stage is a guard that a normal player meets late, if at all. A sign at the locked back field says
what is being built there; no text promises a date.

**E9. Ruling 5's beats stand** (the first ticket within about 25 s; the copper jump the player
causes by about 1:30; a purchase arriving in the world; a helper carrying by minute 5; the furnace
pad in view with its price from the first minute; a rival passed; the truck and the first drive
out by minute 8 to 10; the first small pour by minute 18 to 25), for the normal player on every
seed and for the slow player with at most half as much time again.

**E10. The converter stays in stage 1** (decision D11 of the specification), papered as the
specification has it; if it floods the last quarter of the hour its payable falls.

---

## The first yard: the lead's rulings after its review (25 November)

Three critics (a builder, a player and store reviewer, a person from the trade who also edited every
word: `stage1-critiques.json`, 71 findings) and a numbers prototype with its audit (`proto/REPORT.txt`,
`notes/proto-audit.md`) went through `docs/design/yard-stage1.md`, version 1. Their common verdict:
the document was written from the unrevised whole-game specification and contradicts the revised one
in six places; on each of those the whole-game specification (`docs/design/yard-design.md`, with the
decisions D1 to D17 in its section 14) is right. `ECONOMY.md` (E1 to E10) already rules the economy.
These rulings settle the rest, so that the prototype engineer and the designer do not each decide
them. Order of authority for the first yard: ECONOMY.md and this file, then section 14 of the
whole-game specification, then its text, then RULING.md, then version 1 of the first-yard document.
Every critic's finding not ruled here is to be fixed as the finding proposes; where two findings
disagree, the rule below decides, or the whole-game specification does.

### Selling, weighing, tickets

**S1. The money moment is the graded lot a merchant collects** (whole-game 5.2, risk 13.4). The
worker's scale weighs pieces IN, by grade, into that grade's bay; this prints a weigh-in ticket with
no payment on it (grade, kilograms, today's price per kilogram, and the lot's value at today's price
in a muted colour marked "today's value"). The merchant's flatbed collects every bay that is not
held; cash and supplied tonnes arrive at collection, on a ticket that names the buyer ("Lot sold to
{merchant} · weighed out · paid by transfer"). The round is event-driven and is one rule live and
away: the flatbed waits at the bays when idle; when any bay that is not held has stock it loads for
3 s, pays, and is away for P_round = 20 s (content; tune 15 to 30); stock arriving meanwhile waits
for its return. So the first ticket with money lands about 3 s after the first weigh-in, later ones
at most P_round + 3 s after theirs, and several grades come as one larger ticket. Hold keeps a bay
off the round; Sell on a held bay puts it on the next round. "Supplied" counts collected lots only.
The first-ticket beat (within about 25 s) is measured on the first collection ticket.

**S2. Two scales, as in a yard.** Loads on foot go on a platform scale by the scale house (reads to
0.1 kg, up to 300 kg); the truck goes over the weighbridge (20 kg steps), and a skip's ticket prints
gross, tare and net ("Gross 13,560 kg · Tare 12,540 kg · Net 1,020 kg · Seller ID checked · paid by
transfer"; tare is the truck's stored tare plus the empty skip, so no second pass). Printed
arithmetic stays exact under one rounding rule. The two stand side by side; the hero frame of S14
contains both.

**S3. Ticket wording is decision D8.** Incoming from a partner: "Seller ID checked · paid by
transfer". Household drop-offs at the gate are free and are signed in: "Signed in · gate drop-off".
Outgoing lots name their buyer. The site licence hangs on the portacabin from the first second. The
place is called the public drop-off. Closed vessels are labelled "certified empty".

### What the yard starts with, and what things are

**S4. The copper jump needs no purchase** (D10): an inherited hand stripper (1 kg/s) stands on the
stripper pad with a bundle of heavy cable offcuts beside it. Heavy cable yields 70 % copper, a shown
share of it tinned (to No.2 copper); cable as found is priced from its yield (0.85 of the value of
the copper it holds; tune 0.80 to 0.90). The powered stripper is a later purchase. Beyond that the
opening stock is E1's full yard, not the whole-game document's short list.

**S5. Prices are the whole-game specification's (4.2), in true proportion** (brass at least 0.55 of
copper; the ingot's margin comes from the crucible, never from holding scrap low). Lessons carry no
fixed multiples ("thirty times the iron price" is false on another day): either computed from the
day's board when printed or left out. Batteries are an intermediate, as in the whole-game document.

**S6. Things come apart as they really do** (the trade critic's findings on objects bind): a washing
machine has a stainless drum (sold as light iron in this stage, with a line saying it pays more once
stainless is sorted), a top panel of about 4 kg, cabinet sides; a car shell is "Car body (shredder
feed)"; a motor's end caps are cast aluminium; the aluminium recipe melts cast wheels only and pours
"Aluminium alloy ingot"; cast iron is broken with a sledgehammer, thin steel is cut with a grinder,
so tool tier 2 is "Sledgehammer and angle grinder" (one purchase). The prototype engineer may add
objects a run-down yard would hold; each comes apart truly (hold it against yard-metals.md).

**S7. The car and its converter** (D11): the car stands in the yard from the first second, locked
by "Needs a cutting torch", labelled as an end-of-life car from the named demolition partner,
"depolluted · treatment record ref. 0012"; its converter's ticket line says "from car ref. 0012";
content gives the car a source id and a test refuses a converter without one. The converter is paid
by the whole-game document's payables (4.3), shown on its card.

**S8. Carrying is safe to look at.** Tier 1 is a hand load on the carry frame of at most 30 kg
(tune 25 to 30). Every larger carrier has wheels (sack truck, then a flat trolley; names and
capacities from the prototype). Nobody is drawn bearing more than the hand load. The first purchase
prompt of the game is the sack truck, after the copper jump, and it is felt at once (a washing
machine's pieces in one trip instead of two). This replaces "gloves 60 kg" in the whole-game text.

### The hand

**S9. Pickup.** As the whole-game document has it (automatic within 1.0 m while capacity allows,
0.15 s a piece, highest value per kilogram first, by the usual price from content, never the day's
price), plus the swap: when the load is full and the worker stands still for the work delay with a
piece of higher value per kilogram in reach, the lowest-valued carried piece is put down and the
better one taken; never while moving; a test proves a swap never lowers the load's value. Piece
positions are a pure function of content (zone, thing, index), used by the rules, the screen and the
bots alike. Chalk drop circles appear and work only once a yard hand is hired.

**S10. The opening does not depend on the route.** Whatever pile a new player walks to first, the
first five minutes' beats hold: the first drop-off thing lies by the gate where the worker starts,
the cable bundle by the stripper, the scales between. The prototype plays at least two opening
routes for every player and reports both.

**S11. The crucible.** The charge is taken by mass from the bays through "Take from bays" on the
crucible's card (it reserves the recipe's grade from incoming weigh-ins up to one charge; this is
not Hold and goal texts never call it holding). The charge is new metal plus the heel, capped at
the pot's size; heat time and dross count the new metal only; a recipe change first pours the heel
as one short ingot of its grade, after one confirming line. The FIRST heat ever waits at "Ready to
pour" until the boss is within 6 m, then pours with a camera nudge and its sound; later heats pour
when they end. A person in face shield and apron is drawn at every pour, under the hood.

### Crew, time away, the clock

**S12. One priority for carriers**: the list by place (hopper, chalk circles, trays, the drop-off's
front, the tipping floor), and value per kilogram inside each place. A yard hand may carry a whole
uncut thing of at most its load to the scale at the thing's unprepared grade (E4). The driver and
the boss hook a skip only when the tipping floor has room for all of it; a skip that cannot be
tipped is never paid for (test).

**S13. The first time away pays.** After any first sitting of five minutes or more the away card
shows earnings above zero (E4's carrier does it); an away card with little to show says what would
have earned more. The aim "an hour away pays at least 0.3 of an hour played" is measured at minute
60 itself, and the prototype says what it takes to meet it.

**S14. The clock and the tick** are the whole-game document's (5.2): market time never runs
backwards and keeps advancing in live play after a clock-back. A gap of more than 2 s goes to the
away pass, which is the same engine (E5); the rules keep running under an open overlay (the worker
stands; the ground work's "the yard stops under them" changes to match). A tick returns the new
state and a list of typed events; a sale and its tonnes count when the lot is collected, whenever
its ticket is drawn.

### Ladder, progression, pace

**S15. Rungs are positions, never titles** (D8, D16): thresholds in supplied tonnes and range, the
crane hanging the yard's sign with its tonnes; goals read "Supply 2 t (3 metals)"; refusals read
"Opens at 2 t supplied". Rung 3 asks for range 5. The process board is the progression screen from
this stage: enamel plates joined as a tree (hand stripper lit from the start, powered stripper,
motor bench, crucible with its two recipes), each a tap from its machine's card, machine levels
bought on the plates; later stages' plates stand greyed behind a padlock with only their material
named (bronze, lead, lithium, platinum group, tungsten), no price and no promise. Crew levels are
bought on the rota.

**S16. Ceilings are a guard** (D5): 6, 20 and 160 t/h at rungs 1 to 3, met by a normal player at
most once in the first hour. E2's payback rule in minutes replaces the whole-game document's "about
two hours" for the first hour's shop; from rung 3 its nine hours apply.

**S17. Rivals.** Names, rows and pass points come from the names register and the whole-game
document's list, chips of at most 14 characters. A rival the player has passed never passes back:
its growth and starting tonnes are chosen so that it rarely would, and as a guard the k-th rival
below the player shows at most (1 − 0.03 k) of the player's tonnes, so no two rows print the same
figure (test). Position never falls while away.

**S18. The first drive out is at minute 8 to 10** (ruling 5; not widened), with E3's trial load.
An aim for the prototype: on the first partner's loads a minute of hand work earns at least one and
a half times what it earns at the drop-off, so that farther reads as richer. The demolition partner
stands before the weight-limited bridge; the bridge, with a plain padlock, leads to stage 2's
partners.

### The map and the screens

**S19. The working core is compact**: the platform scale, the weighbridge, the stripper pad, the
crucible pad and the copper and brass stillages, with the price board in view, fit one frame of
21 m by 9 m (the first store screenshot: copper, a ticket and a pour in one real frame), tested;
the tipping floor is within 12 m of the scales; the ferrous bays are beside them. The prototype
engineer fixes the coordinates in the content file (the routes are its distances); the document
describes the map from that file.

**S20. Text fits**, checked by a script at 667 points wide and font scale 1.3: goal text at most 30
characters, a panel's effect line 38, a grade name 18; a ticket shows at most three grade lines and
"+ n more", one lesson line of at most 48 characters (the full sentence lives in Help and the ticket
history), at most 150 points tall; price board rows are two lines; the legal line is 11 points. The
top bar uses the whole-game document's widths and has no spare slot. No text promises a future
update; locked things show a padlock and a plain condition.

**S21. Words.** "Night watch" and "rota", never "shift"; "supply deal", never "contract"; "licensed
waste carrier"; every invented name by its id from the names register and never as a literal in a
document or in code; the banned-word list gains "shift" and "freight".

**S22. Loading animation** is the whole-game document's (11): one plate per word of the title,
0.6 s each, the crucible pouring under its hood, the bar cooling to brass, about 3.5 s, then a calm
loop while atlases bake (never a frozen frame); a tap skips it from the second launch.

### Building it

**S23. Every file has one owner**; numbers live only in the content file; positions flow one way
(content → the game's data → the rules and the screen); every new source file is listed for the
bundle check before anyone creates it; the document's work packages say so.

**S24. The prototype's players are people**: a reaction is spent before every leg, not once per
decision; at least fifteen seeds; each beat is reported as a range and as the share of runs inside
its band, for two opening routes.
