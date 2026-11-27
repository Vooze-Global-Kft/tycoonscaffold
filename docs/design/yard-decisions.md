# Scrapyard: the lead's decisions, in the order they were made

This file keeps the three sets of decisions that the specifications refer to by number, so that a
later stage can be designed without the working folder they were written in. Order of authority for
the first yard: part 2 and part 3, then section 14 of `yard-design.md` (D1 onwards), then its text,
then part 1, then the first-yard document. File names inside the parts (`RULING.md`, `ECONOMY.md`,
`STAGE1-RULING.md`, `proto/...`, `stage1-critiques.json`) are those of the working folder; the texts
are complete here.

- Part 1: the ruling on three competing designs (points 1 to 16), before the specification.
- Part 2: the first yard's economy after the first numbers prototype (E1 to E41; E37 to E41 came after
  the owner's decisions of 26 November).
- Part 3: the first yard after its review (S1 to S24).
- Part 4: the first yard's map after the review of the built game (M1 to M7).
- Part 5: the rulings on the review of the built game, by finding (S, R, H, P, W, L).
- Part 6: the owner's decisions of 26 November (purchases limited to looks and scrip, bank loans,
  partnerships, yard sales, the company as a neighbourhood) and the lead's ruling on them (sections 1
  to 13; later sections change earlier ones).

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

> Where an entry of this part and part 6 differ, part 6 is right: it is the later ruling (E37's
> "own output grades" is corrected by E41 and part 6 section 11; E39's "a part in a partner" is a
> partnership, part 6 sections 9.7 and 9.10).

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

## After the second prototype (25 November, afternoon)

The second prototype (`proto/REPORT2.txt`, `content2.json`, `yard2.py`) holds E5's gate exactly and
E9's beats for the normal player on all fifteen seeds (first ticket about 0:17, the copper jump about
0:40, the sack truck 1:12, a yard hand carrying 2:23, the first drive 9:14, rung 2 about 14 minutes,
the first pour about 22), the slow player within half as long again. Its own tables show four
weaknesses, and these decisions bind the third pass, the content file and the tuning on the real
rules. The prototype engineer's rule changes R1, R2, R4 to R12 are accepted (R6 only as a
simplification of the prototype: the game keeps the heel of S11). R3 is rejected (E11).

**E11. No credit.** Nothing is ever bought on account. E4 (no dead end without the hand) holds from
the first hire on; before it the hand is needed, and the first two purchases are within three
minutes of hand play for the slow player.

**E12. The shop is saved for, not showered.** In the second prototype the normal player holds three
to five times the next price for the first eight minutes, so only the one-prompt-a-minute rule
paces the opening, and a player who opens the rack and the office can buy six purchases at once.
Aim: when a purchase's goal arrives in the first thirty minutes the normal player holds between
half and one and a quarter times its price, never waits more than three minutes for it, and a
player who buys everything affordable the moment it is affordable gets at most two purchases ahead
of the goal list by minute 10. Mechanism: the price floor is a share of the income at that moment
of about three fifths to one (the prototype's fifth is too low), and the very rich things of the
first five minutes (E15) no longer pay for the whole early shop.

**E13. Levels cost what their capacity is worth, and the bottleneck alternates.** In the second
prototype crew and machine levels add about §5 a minute and cost §100, cash is §20,000 at the hour
and §5 M on day 3, because from minute 30 only partner supply binds. Decisions: (a) a level's price
is tau(L) × the capacity it adds × the mean margin per tonne at usual prices (rated, not measured at
a moment when it does not bind), tau rising from about 20 minutes to nine hours; (b) "another skip
in rotation" at each partner (R10) is a level like the others, bought on the office's partner wall;
(c) crew and machine rates and the partners' fill times are tuned so that from about minute 25 the
binding constraint alternates between supply (skips in rotation), cutting, carrying and the machines:
after a supply level the advice line names a crew level, and the other way round; (d) the advice
line names only the level that binds, and every card shows what a level adds in the yard's own
units ("+1.2 t an hour cut"); (e) cash at minute 60 is at most about ten minutes of income for the
normal player, and after three days of the twice-a-day habit at most about a day's income, with a
useful purchase at every sitting to the end of day 3.

**E14. Bands.** Rung 3 at 28 t. On the opening route that goes to the cable first, the first paid
ticket is the copper ticket and its band is 35 s.

**E15. Income climbs.** Measured over five-minute windows the normal player's income never falls
below three fifths of its best earlier window before minute 60 (the second prototype falls from
§750 a minute at minute 5 to §220 at minute 10, and from §2,640 at minute 30 to §314 at minute 45).
Mechanisms, in the trade's true proportions: the copper and brass of zones 1 and 2 is less and
smaller (a hot-water cylinder is about 9 kg, and the content file already says so: check that the
program does too; one bundle and one crate make the first minutes' jumps, the rest of the rich
material sits in things that need a tool, a machine or a partner's load); each later zone and each
partner raises the value of a minute's work by a step that lasts; lots from a large load are
collected over the minutes it takes to prepare it, not in one round.

**E16. The car carries no battery** (it arrives depolluted); lead is a greyed plate in this stage.

### After the audit of the second prototype (same afternoon)

The audit (`notes/proto-audit2.md`, in full under "audit" in `proto2-result.json`) reproduced every
table and then showed what stands behind them. These decisions answer it. E17 changes the engine
and binds the contract, the specification's 2.12 to 2.16 and the rules engineers at once.

**E17. Whole things and whole pieces; mass only where material is loose.** This replaces E5's
"stocks and rates" wording; E5's purpose stands (one function for live play and time away, no second
model to drift). Stock is of two kinds. (a) THINGS AND PIECES ARE WHOLE: a thing in a heap, on the
drop-off or the tipping floor, a piece on the ground, on a load or in a hopper is one item with its
mass from content; a piece exists from the moment its cut is complete; a carrier moves whole pieces
and whole things; a whole thing is weighed in whole; the converter is one piece. (b) LOOSE AND
MOLTEN MATERIAL IS MASS in grams: what lies in bays, trays, bins and the pot, and what a machine
makes. The scale turns pieces into a bay's grams, rounded once to the scale's step, and what is
paid is the sum of the rounded lines. Crew are agents on legs, not flows: a cutter's piece
completes at a time computed when he starts it, a yard hand's trip leaves with whole pieces and
lands at a time computed when it leaves (he chooses the place by S12's priority at each departure),
the driver's run and the merchant's round likewise; machines work mass at a rate between events.
The engine keeps a queue of dated events and jumps from one to the next; the 0.1 s tick is the same
function called with a nearer horizon, and time away is the same function with the boss absent, so
ticking and jumping are equal by construction; the gate compares them minute by minute (cash,
supplied, every stock), not only at the end. The crew member the player sees walking IS that trip.
No ticket prints a fraction of a whole thing. A cut by the boss interrupted by walking keeps its
progress on that piece. Time away up to the cap must stay cheap: a cutter's event is a whole thing
(its pieces appear together when the thing is done) whenever the boss is not within sight of it,
and the bench says how long six hours away take.

**E18. The shop is cash-gated without any waiting rule** (the audit's findings 2 and 3; sharpens
E12). The bots buy as a person does: a goal's purchase the moment it is affordable and its card
has been read; a second habit buys everything affordable at once. Every beat holds for both habits
(the second may run at most a minute early). The one-prompt-a-minute rule is how goals are SHOWN,
never what paces the economy. Prices are derived from what a purchase is worth over the following
twenty to thirty minutes with every later purchase still made (leave-one-out), with the floor of
E12; the harness is fixed so that the branch without an item cannot buy it.

**E19. What is sold after the torch.** From the torch to the end of the hour and through three days
there is always a purchase that widens the yard's bottleneck: skips in rotation (E13b), a third
tier of load at each partner if needed, and crew and machine levels that bind in turn (E13c). A
level that would change nothing now is shown with what it would add and "not the bottleneck now",
and the advice line never names it. Cash is never spent by the bots, nor advised to be spent, below
the price of a load that will be ready within two minutes (R11 becomes the advice line's rule and
the driver's reserve: the card shows "kept for the next load: §x"). Playing never earns less than
being away: from every state of the hour, an hour played by the normal hand earns at least a
quarter more than the same hour away.

**E20. The yard's margin is its work** (finding 9). At least three fifths of a load's margin over
its price comes from preparing it (cutting, breaking, stripping, the bench, the melt), the rest from
the purchase price; k and the loads' contents are set to make it so at true prices (k nearer 0.85
than 0.70; loads of whole cast iron, cable, motors, uncut steel and appliances, little that is
already clean). Nothing in a partner's load needs a tool the player cannot own when that partner
opens. S18's aim holds after the load's price.

**E21. True prices** (finding 10; corrects the whole-game table): brass solids at least three fifths
of copper (about §22.40), the brass ingot about §27 so that the melt's margin is about 15 % after
dross; whole motors at two thirds to three quarters of what the bench gets out of them. The car's
loom is "Thin cable" at its own low yield, never heavy cable. One gram of rhodium in the converter.

**E22. The aluminium recipe** melts cast aluminium only (alloy wheels, and the cast aluminium of
motors and loads) into "Aluminium alloy ingot". It is a plate on the process board and is in the
first hour's goal order only if the third pass shows it pays back inside its tau with the material
the hour really brings; otherwise it waits on the day-1 list. A purchase that changes nothing is
never in the goal order (the second yard hand, the second cutter and the Night watch are held to
the same test: the Night watch is "a longer away cap" and is offered when the player has been away
once).

**E23. The map has footprints** (finding 13). Every place in the content's map has a footprint in
metres; nothing overlaps (the two scales, the stripper and the stillages, the flatbed's stand and
the bays); zone 1 stands clear of the container wall and its gaps; the hero frame of S19 is tested
on footprints, at the game's scale (vehicles at two thirds of true length, so the weighbridge deck
fits the game's truck).

**E24. Measures.** The slow player is held against the normal player on the same seed (within half
as long again on nine pairs of ten, each beat) and is run to 100 minutes; the hands-off test aims
at the next goal purchase from states with little cash; rivals are growing pure functions of the
market day with S17's guard, their starting tonnes placed from the tuned hour.

### While the third pass runs (15:35): three rules decided for the contract

**E25. No shop rule beyond cash and named gates.** The third pass's "one purchase on sale at a
time" and "the next card 60 s after the last purchase" are refused (E18). A shop item may carry one
gate that content names and the card shows with a padlock: a rung ("Opens at 2.5 t supplied") or
another item owned ("Needs the hook-lift truck"). Everything else is paced by price alone: prices
rise along the goal list as the income does (each is about what the normal player has earned and
not yet spent when its goal should arrive), so buying a later thing first is a choice that delays
the rest, never a way round the pace. Crew, machine and partner levels open at rung 2.

**E26. Skips in rotation are skips.** A partner at level L has L skips at its site; each fills
`fill_s` after it was hooked and set back; the driver and the boss hook any full one (the one full
longest); the label and the lane show every skip. Supply is L loads per fill time. The prototype
models the same.

**E27. Rivals run from the player's start**, as the specification has it: tonnes = T0 × (1 + g ×
min(d, 40)) with d the market days since this player's first second, so every player meets the
same race whenever they begin; starting tonnes come from the tuned hour. A formula on the calendar
day is refused: it would move the first hour's passes for everyone who starts later.

The boss may feed any hopper (specification 2.1); "the boss no longer feeds the bench" is a habit
of the prototype's player, not a rule.

### After the third pass (15:45)

The third pass (`proto/REPORT3.txt`, `content3.json`, `yard3.py`; result in `proto3-result.json`)
fixed the windfalls, the loads, the levels and the three days. Its own hour table shows what is
still wrong: the normal player's income by five-minute window runs §242, 229, 272, 310, 579, 1,069,
1,213, 1,356, 1,384, 1,514, 1,494, 1,498: flat for twenty minutes through ten purchases, one jump
when the torch arrives at minute 24, flat again from minute 35. Prices are flat with it (§230 to
§750 for 24 minutes), which is why the pass needed a waiting rule (refused, E25) to keep the
opening from being a burst.

**E28. The hour climbs in steps the player feels.** Aim for the normal player's income by
five-minute window: about §120, 250, 450, 800, 1,300, 1,800, then rising by about a tenth each
window to about §3,500 at the hour; no window under the one before it (after minute 5); every goal
purchase before the torch raises the next five minutes' income by at least a fifth over leaving it
out (leave-one-out, the pass's own measure), or it leaves the first hour's goal order. Prices rise
along the list with the income, each about one to two and a half minutes of the income at its
moment, so that the list cannot be bought in a burst and a later item is always dearer than an
earlier one. Mechanisms the lead expects, in the trade's true proportions: each tool, carrier and
hire shortens the boss's own cycle on stock that is worth his minute (zone 2 clearly richer by the
kilogram than zone 1; the farm's loads richer by the minute than the heaps, S18); the torch comes
right after the truck's first loads, at rung 2 (about minute 13), dear enough to be saved for; the
powered stripper, the bench and the crucible come after it, when cable, motors and brass arrive in
loads, each priced on the margin it adds to what then flows; the first pour stays in its band.

**E29. Small rulings.** The driver's and the advice line's reserve covers a load that is full now
or within 60 s. Rung 3's tonnes are set for the buy-when-affordable habit; the other habit may
reach it up to three minutes earlier. E24's same-seed comparison of the slow player applies to
beats after minute 2 (before that the slow profile's own reactions decide). The farm load's margin
from work reaches three fifths by k 0.88 or by the as-found shares, whichever keeps prices true.
Trial loads at fixed prices (R17), whole things sold whole (R19), the advice line's binding rule
(R16) and levels to 20 (R15, opening at rung 2 by E25) are accepted. R13 is refused (E25); R18 is a
habit, not a rule.

**E30. Rulings at 17:00.** goals.json follows the fourth pass's order (the cutter after the torch).
The truck stays in the hour's goal order as the first drive's purchase although its first five
minutes measure below E28's fifth. S14's gap to the away pass is 10 s. reach.sight is 10 m. Rung 3
is at 23 t (E14's 28 t is superseded). The three ceilings are set from the tuned content (about 1.3
times what an always-on full spender can reach on that rung) so that no card is locked by a ceiling
in a normal hour. After the fixed goals the advice line names another skip in rotation whenever the
tipping floor is empty and the driver idle.

### After the bots on the real rules (18:30)

The bots (`proto/REPORT5.txt`; `src/engine/salvage/bot.ts`, `scripts/content/yard-bot.ts`) played
the real game on fifteen seeds and five unseen. The opening beats, the torch, the first pour, four
rivals, the hand against the card manager, the no-hand floor and the three days hold; rung 2 runs a
little early, the first drive is in its band on about half the seeds; three engine faults were
found and fixed with tests. What misses is the last third of the hour: sales stay near §1,200 a
minute from minute 35, because one driver's round and the tipping floor bind, and levels change
little.

**E31. The late hour grows by hauling and by levels that are felt.** (a) A driver's level shortens
his whole round, the hooking and the tipping as well as the driving, by the level's factor (today
it only speeds the drive). (b) A cutter's and a yard hand's level adds a quarter (not an eighth),
priced by E13a, so that each is seen in the yard. (c) E28's later aim becomes: sales of at least
§2,000 a minute by minute 60 for the normal hand, and no five-minute window after minute 30 under
the one before. A second truck is stage 2's (with the forklift and the crane), not this stage's.
(d) Rung 2 at 2.4 t. The torch's wait behind its rung gate is accepted as the hour's one long save.

**E32. Hold waits for a better day and then lets go.** A held bay rejoins the round by itself at
the first high day, or after two market days, whichever comes first; its card says so ("Held until
a high day, two days at most"). The bots showed that a bay held and forgotten through days away
cost a fifth to a third of three days' earnings; Hold is a small lever (E, the +3 % aim), never a
trap.

### After the rules review (19:00)

**E33. The away cap grows with the rung.** Half an hour on rung 1, two hours on rung 2, four hours
on rung 3; the Night watch adds two hours on any rung. The review showed that a player who stops
after five minutes and returns after four hours holds twice the price of the whole hour's goal
list (the public drop-off's copper and brass, carried whole by one yard hand, are worth about §70 a
minute): the shop was showered, not saved for (E12). The away card says how long the yard ran
without the boss and what makes it run longer ("The yard ran 30 min. From 2.4 t supplied it runs
two hours."). S13 holds (a first sitting of five minutes pays).

**E34. Deal deliveries happen at every midnight that passed**, inside the away cap or beyond it,
from the reserve as it stood when the boss left; the away card lists them. Nothing is charged for
a short day, as before.

### After the bots' second measurement on the real rules (21:47)

**E35. The tipping floor never silts up.** A whole thing that needs no cutting (motors, cable coils,
fittings) is taken off the tipping floor by a yard hand whenever the boss is away, and while he is
in the yard once more than half of the floor's room is used: motors to the bench's hopper when the
bench is owned, cable to the powered stripper's hopper when it is owned, otherwise to the platform
scale at the thing's as-found grade. The floor's slots stay inside its footprint (past the last slot
things share slots; room stays by mass). The bots found the dead end: after an hour and 11.75 hours
away the floor held 275 things nobody would ever move, and the next absence of the same length paid
§155. E4 (no dead end without the hand) is the principle; this closes its hole.

### After the bots' final measurement (REPORT6, 22:15)

**E36. What the first yard misses and keeps for the next stage.** REPORT6 measured the game as it
goes to the owner: the eight beats of the opening, the first drive, the torch, rung 2, the first
pour and rung 3 are in their bands on 12 to 15 of 15 seeds and on five new seeds; no hard promise
broke on 124 runs; a tick equals a jump. Three aims miss and are accepted for this stage, each with
the reason: (a) E31c: sales at minutes 55 to 60 are a median §1,757 a minute against §2,000; the one
truck and the cutting bind; the driver's level adding a quarter, or the second truck, is the next
stage's first tuning step (no number changes now: the game the owner plays is the game that was
measured). (b) E33 at fifteen minutes: a long absence after rung 2 runs the yard two hours and buys
the four goal purchases left at once; that is the return an idle game owes its player, and levels,
the Night watch and rung 3 remain to save for. (c) Hold never beats selling at once in this stage
(the bots' day-word holder loses 4 to 39 per cent, through absences in which every bay is held and
nothing sells); it costs no value (the away card prints what stands in the bays, not yet sold), and
it is reworked with the two exchanges in the next stage, where timing a sale is the game. (d) The
slow hand's first drive is within one and a half times the normal hand's on 11 seeds of 15 (E24
asks nine of ten): kept as measured.

### After the owner's decisions of 26 November (the ruling RULING2.md)

**E37. E11 amended: credit exists, from rung 3, on works plates only.** E11 now reads: no credit in
the first hour's shop: tools, carriers, crew and the first machines are bought with cash. From rung
3 the bank's plant finance exists, on works plates that earn: the bank pays at most four fifths of
the price and at most min(2 h, 0.15 x tau) of rated income; a flat charge fixed at signing; repaid
only as a share of the payments for the financed plate's own output grades; no date, nothing that
grows, no button to repay, cash never below zero (RULING2.md section 3). E4 (no dead end) holds:
an idle plate pays nothing and its debt waits.

**E38. Rated income, I.** Everything priced in hours of income (scrip packs, the bank's limit, a
helper's daily limit) uses the scrip an hour the yard would earn with its present assets, no boss,
at usual prices. It is computed from assets, never from recent sales, and it must agree with the
measured away income an hour within a tenth at rungs 3 to 5 (RULING2.md 2.1).

**E39. E20 restated for holdings.** With every part in a partner owned, three fifths of a load's
margin still come from the yard's work: a part takes at most a tenth off a partner's load price
and is capped to the trade done with that partner when it was bought (RULING2.md 4.2).

**E40. Hold never stops the yard (it replaces E36(c)'s deferral; amended after the attack on the
engine step, RULING2.md 14.6).** While the boss is away and the cash cannot pay the next load, the
yard sets aside from one held bay just enough, at today's price, to pay for that load: first a bay
whose word of the day is not low, then the one worth most. Hold stays on; the away card names the
grade. Built with the engine step that opens stage 2.

**E41. The bank's share is of every sale (it corrects E37's "own output grades").** From signing
the bank takes a fifth (tune 0.15 to 0.25) of every lot payment until the total is repaid; nothing
else repays; no date, no button; one agreement at a time in stage 2 (RULING2.md section 11).

**E42. From rung 3 the crew works in runs (RULING2.md 14.1).** A yard hand keeps at one kind of
trip for up to 30 s and a cutter at one place for up to 120 s before choosing again, in the boss's
sight and out of it alike; out of sight the run is planned ahead with one dated end (that is what
makes time away cheap). The first hour below rung 3 is unchanged. From rung 3 the yard clears its
floor faster than the first yard's leg-by-leg order did (the attacker measured 6 to 17 % more
tonnes over three days with the limits as first built); that move is accepted as stage 2's
baseline, and the bots' report on the new engine (REPORT7) states it.

**E43. The merchant's round is the same watched or not (RULING2.md 14.3).** It is never lengthened
for time away.

**E44. The driver and the farm's skips (RULING2.md section 16; as it ended, 16.9: the yard hands' rule alone removed the fault and the driver keeps the first yard's rule).** In the first yard as merged the
hired driver fetched the skip that had been full longest, and "Another skip" for the farm made the
yard poorer once demolition was open (its light skips crowded out loads that net twice as much).
From rung 3 he ranks partners by what a load nets and keeps the floor's room for the best; a
partner's level never lowers what the yard keeps. No purchase may make the yard poorer: the bots
check every purchase, hire and level for it from now on.

**E45. No purchase makes the yard poorer (RULING2.md section 17).** Buying the motor bench at rung
2 lowered what the first yard kept by about 30 %: yard hands fed machines and emptied trays before
they cleared the tipping floor. From now on every purchase, hire and level is walked by the bots
in every report: the mean change in what the yard keeps is never below -1 %. The hands' order of
work puts the floor first while it is more than half full (or the rule the measurement finds
better), and each machine is shown to pay at a crew a player can hire.

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

---

## The map of the first yard: the lead's ruling for the fix pass (25 November, after the review)

This outranks `docs/design/yard-ground.md`'s plan, the specification's section 3 and the content's
present map wherever they differ. It answers findings P5, P6, P13, P15, P20, L1, L2, L5, L6 together.

### Why

Six reviewers and the lead saw the same thing in the running game: the first view is two thirds
empty grey slab with one washer on it; no old stock is in sight; the working row floats in the
middle of a 64 x 40 m slab; the walk to the tool rack and the office takes half a minute; the
truck's line runs over the public drop-off. The art director's picture of the same yard
(`look/stage1/yard-844.png`, drawn by `drawHero` in `src/ui/salvage/art/proof.draw.ts` ON THE MAP'S
OWN COORDINATES) shows a different place: a working row against a lock-block back wall at y = 15.2
with the neighbour's stacks and cranes over it, old stock heaped against the wall, everything close.
The picture is right and the map is wrong. The map moves to the picture.

Numbers for thinking: 40 points a metre, tilt 0.7, so a 844 x 390 screen shows 21.1 m by 13.9 m of
ground and a 667 x 375 screen 16.7 m by 13.4 m. The top 84 points are under the bars and the goal
card. The camera follows the boss, who stands at about 61 % of the screen's height.

### The principles (the checker enforces M4 to M6; a person looks at the rest)

M1 THE BACK WALL. The first yard ends north at a lock-block wall along y = 15.2, across the whole
   width. Content gets `map.north: 15.2`. Nothing of the yard lies north of it; nobody walks or
   drives north of it (it is solid); the camera never shows more than the wall and the band of far
   yard over it. Every place and zone now north of it moves south of it.

M2 THE WORKING ROW HUGS THE WALL. The bays, the scale house and the stillage block stand with their
   backs against the back wall. The pads in front of them (platform scale, hand stripper with its
   cable bundle, the price board, the crucible pad, the motor bench) have their centres within about
   five metres of the wall, so that the wall and the far yard are in view while the boss works at
   the scale, the stripper or the drop-off.

M3 OLD STOCK IN SIGHT AND NEAR.
   - Zone 1 (washers and bicycles, hand tools: the stock of the first ten minutes) lies in the
     corner of the back wall and the east fence, north of the gate, its bed's near edge within about
     three metres of the platform scale: it is in the first view at both sizes.
   - The public drop-off is a small bay of its eight waiting places (two rows of four) by the gate,
     NOT on the truck's line. The first washer stands on it at the start.
   - Zone 2 (radiators, the bath, stoves, gates: the sledgehammer's stock) lies against the back
     wall, the next nearest heap after zone 1.
   - Zone 3 (beams, tanks, the car: the torch's stock) stays west of the dividing wall, south of the
     back wall.
   - A zone is a BED: a rectangle `zones.<id>.bed: { x0, y0, w, d }` (new field; `centre`, `r` and
     `footprint` kept in step for old readers). Its things are laid inside it on a seeded, jittered
     pattern by the rules (finding L5: rules-sim). A bed is a heap: dense (about 0.65 m2 a washer,
     1 m2 a bicycle or a radiator, more for a beam, a tank, the car), against a wall or a fence on
     at least one side, open to the boss on at least one long side.

M4 ONE DRIVE LINE. From the gate west to the weighbridge, on to the merchant's stand, and to the
   tipping floor and the truck's parking place: a corridor at least 3.6 m wide with NO place, bed,
   waiting place, chalk circle or person's standing spot in it (the weighbridge deck and the stand
   are part of it). The merchant's flatbed and the hook-lift truck drive only in it. The boss
   crosses it; nothing stands in it.

M5 SHORT WALKS. The tool rack and the office (the yard's gatehouse) stand within twelve metres'
   walk of the platform scale and outside the drive line. From the drop-off's first place to the
   platform scale at most ten metres; from the cable bundle to the hand stripper at most three; from
   the stripper to the platform scale at most eight.

M6 NO POCKETS. Between any two solids (places with `solid: true`, walls, the fence, the back wall,
   every position of the stillage block at its full size) a gap is either at least 1.5 m or zero
   (closed, and drawn closed). A pad that is not solid needs no gap.

M7 THE TWO FRAMES.
   - The first view (the boss at `start`, the camera kept inside the east fence): the drop-off's
     first washer, zone 1's bed, the platform scale and the scale house's display are inside the
     free world (below the top 84 points) at 844 x 390 and at 667 x 375.
   - The hero frame (the store's first screenshot, `map.hero`): the back wall with at least 40
     points of far yard under the top bar, the bays, the scale house, the platform scale, the hand
     stripper's pad, the copper and brass stillages, the price board, the crucible pad, the north
     edge of the weighbridge and some old stock (a zone's bed, at least 1.5 m of it) all inside ONE
     frame of 16.7 m by 9.7 m of ground south of the wall (so that it holds at 667 x 375), and the
     same frame widened at 844 x 390.

### A sketch to start from (not a table to copy: fit it with the checker and LOOK at it)

Back wall y 15.2 (its south face about 15.6). Back row against it, west to east: zone 2's bed about
x 26.5 to 34; the stillage block, two rows, growing WEST from x 43.4 (copper and brass nearest the
bays); the bays about x 44.6 to 52.6; the scale house closed against the bays' east end, about
x 52.6 to 55.6; zone 1's bed in the corner, about x 57 to 63.4, y 15.8 to 19.8. Front row, centres
about y 20 to 21: the platform scale under the scale house's display (about 54.3, 20), the cable
bundle and the hand stripper's pad west of it (about 51 and 48.3), the price board, the crucible pad
about (43.5, 21), the motor bench west of it. The drop-off's bay south of zone 1 and north of the
drive line, the start beside its first place. Drive line y about 24 to 27.6 from the gate (centre
about y 25.8, six metres wide) over the weighbridge (as now, about (50.5, 25.5)) to the merchant's
stand west of it. South of the line: the tipping floor, the truck's parking place, the office as the
gatehouse by the gate's south post with the tool rack at its door. West of the dividing wall, south
of the back wall: zone 3 with the car, the back field's gate.

The rubble skip is dressing: it goes wherever it closes a pocket, or away.

---

## The rulings on the review of the built first yard (25 November, evening)

Six reviewers played and read the joined first yard and reported 101 findings. Each is listed with what it said in one sentence and the lead's ruling, which outranked the reviewer's own proposal in the one pass of fixes. "do" means: as the finding proposed.

### Findings of the casual player (P)

- **P1** (blocking). On every fresh game I played by hand, the first public trickle at 20 s is a crate of brass taps (8 kg, §181).
  Ruling: do (blocking): the drop-off's first arrivals are a fixed opening list of washers and bicycles (no taps, no cable, no cylinder) until five minutes have passed; then the mix. The bots measure the opening again.
- **P2** (blocking). The value-jump test compares a new grade with the HIGHEST price weighed before it.
  Ruling: do (blocking): the lessons of the value grades (bare bright copper, brass, the converter) ALWAYS show on that grade's first weigh-in, whatever was weighed before; the hints' twin of the rule changes with it; a test with brass weighed first.
- **P3** (blocking). The away card shows the gross sales as '§78,171 (already in your account)', but the cash counter shows §7,233.
  Ruling: do (blocking): the away card says what was applied: 'Sales {x}', '{n} loads bought · −{y}', 'Net +{z} (already in your account)'; held stock is never listed as sold; one line says what to do next. With E33 its head says how long the yard ran.
- **P4** (blocking). The most important number on screen is cut off with an ellipsis at 667 x 375 with font scale 1.3: '§280...' at minute 1 and '§14,0...' at m30.
  Ruling: do (blocking): cash is never cut: fitted to its slot at every font scale, the slot wide enough for six figures at 667 and 1.3 (take width from the ladder chip, which has short forms); bars and cards print money without hundredths from §100 up (tickets keep them).
- **P5** (blocking). The running game falls well short of look/stage1/yard-844.png.
  Ruling: do (blocking): the running yard gets the composed picture's light and place: a warm wash from the west and shadows swept east for every standing thing and person, darker slab joints with weeds and dirt beds under heaps, the north wall with the far yard's skyline wherever the camera sees the north edge, and ground outside the fence everywhere the camera can show it (verge, road, neighbouring yards): never a void. Held against look/stage1/yard-844.png at ?view=hero and at the first second.
- **P6** (important). The first view at 0:00 is mostly empty concrete with one small washer on an 8 x 2 m slab.
  Ruling: do: the first second shows a full yard: zone 1's heap of washers and bicycles moves to within about ten metres of the platform scale and into the first view (zone 2 takes zone 1's old place, zone 3 stays behind the wall); the drop-off's slab shrinks to its waiting places; the hero frame holds some old stock. The content fixer moves the map FIRST and tells the world fixer and the bots the new places.
- **P7** (important). Labels sit on what they name and on each other.
  Ruling: do: one plate per thing ('Crucible · §800'), placed above its sprite, hidden while the boss stands in its footprint or a ticket is up there; plates and chips are laid out against each other and against the bars' rectangles; a plate that cannot be shown whole is not shown.
- **P8** (important). The weigh-in ticket rises straight over the boss on the platform scale and hides him for its 4 s.
  Ruling: do: the weigh-in ticket comes out beside the scale's display, never over the boss; tickets keep clear of the goal card at its real height; one ticket at a time, the next waits.
- **P9** (important). For the first ~2-3 s of launch the curtain is half transparent.
  Ruling: do: the loading curtain is opaque from its first frame.
- **P10** (important). The first drive out is fiddly and empty.
  Ruling: do: the boss drives at 9 m/s (the driver's speed is its own number); the camera zooms out while driving; the truck is drawn with a skip only when it carries one; a partner's label is placed where it can be read; the lane ends at a drawn barrier before the bridge.
- **P11** (important). Hiring the yard hand feels like nothing at first: he stands idle for 35 s even though cut pieces are waiting at the drop-off, and he is not visible near the office.
  Ruling: do: a yard hand sets out the moment he is hired, from the office door. While the boss is in the yard he carries PIECES only (cable to a stripper that runs by itself, else he leaves cable for the boss); whole things he carries only while the boss is away or when every waiting place at the drop-off is taken (ECONOMY.md E4 stands for time away).
- **P12** (important). Money leaves without being shown.
  Ruling: do: money going out is seen: a debit line under the cash counter at a hook ('−§1,877 · {partner}'); the skip ticket's amount reads 'Bought for {x}'.
- **P13** (important). One-thumb walking keeps getting stuck.
  Ruling: do: no gap between solids narrower than 1.2 m unless closed; the boss slides along an obstacle on a diagonal push; every drawn stillage is solid; the tool rack and the office stand within about twelve metres of the scales (the content fixer's map move, with P6).
- **P14** (important). 'Fetch the farm's trial load' completes at the weighbridge, before the tip.
  Ruling: do: a goal 'Tip it on the floor' follows the first fetch (done at the tip), before 'Hire a cutter'.
- **P15** (important). The merchant's flatbed drives across the platform scale and over the boss while he stands on it, and its first parking spot covers the stripper pad's corner.
  Ruling: do: the merchant's flatbed never drives through the scale's, the stripper's or the boss's place; its route and stand are checked at its full drawn size.
- **P16** (minor). Passing the first rival, 'the first ranking moment', happens with no moment: between two screenshots 12 s apart the chip's words changed from 'next Bramley 0.01 t' to 'passed Bramley'.
  Ruling: do: passing a rival slides the chip and shows a two-second line ('You passed {rival} · 25th of 26'), after any open card.
- **P17** (minor). The rung box reads '0.00 t supplied · 0 metals' (rung 1's threshold), while the row below says 'Cinder Lane Yard 0.09 t' and I had sold five grades.
  Ruling: do: the rung box shows the player's own tonnes and materials; the next rung's condition on its own line.
- **P18** (minor). Right after hiring, the rota row reads 'Ben · level 1 / Carries 27.2 t an hour / Opens at 2.20 t supplied'.
  Ruling: do: 'Level up opens at {t} supplied'; rates in words the yard uses (W5).
- **P19** (minor). At 667 with font scale 1.3 the best news ('75 loads fetched', 'You passed Kolbeck', 'You passed Tunney & Sons', 'You passed Oakbridge') is below the fold of the scroll.
  Ruling: do: away card order: net money, rivals passed, the next step, then at most three grade lines at large type.
- **P20** (minor). Between minutes 5 and 10 the work pays very little.
  Ruling: do through P6 and P13 (nearer stock, nearer rack and office) and P1 (copper and brass come from the drop-off after minute five and from zone 2's radiators with their brass valves); the bots report the walk-to-buy time of each purchase at a person's hand.

### Findings of the look (L)

- **L1** (blocking). The running world never draws the sky, the far-yard skyline, the warm low-sun wash or the multiply.
  Ruling: do (blocking), with P5 and MAP.md M1: the RUNNING world is the art director's picture. (a) The back wall: one course of lock blocks along y = map.north across the yard, solid, drawn by the proof's own block function, with the proof's floodlight; above its top, in SCREEN space, the late-day sky and drawFarYard's skyline at a parallax of about 0.3 (never a flat colour, never the yard's own ground north of the wall). (b) Light: SUN_WASH under the sprites and SUN_MULTIPLY as one Multiply rectangle over the finished world (under the bars, tickets and cards), exactly as drawHero does; if a Multiply layer over the whole canvas costs frames on a phone, bake the multiply into the ground and atlas sheets instead and say what was measured. (c) Shadows swept east at the proof's low-sun angle for every standing thing and person. (d) The ground is the proof's warm concrete (drawConcrete with weeds) with its decals (paint lines, hatches, oil, puddles, weeds) at the proof's density, dirt beds under every heap. (e) Outside the east fence and along the lane: verge, road, hedges, fields: no clear colour anywhere the camera can go. The test of done: ?view=hero at 844 x 390 beside look/stage1/yard-844.png reads as the same place (the world fixer and the artist each look and say honestly where it still differs).
- **L2** (blocking). ?view=hero-store, the first store screenshot, does not show copper, a ticket and a pour in one frame.
  Ruling: do: (content) the hero frame of MAP.md M7 holds some old stock and fits 16.7 m; (world-b) the hero camera shows the wall with the far yard under the bar and every member at 844 and 667, and the store variant hides the edge arrow, the hint brackets, the stick, the one button and any plate cut by a bar; (wiring) a preset 'pour' PLAYED on the real rules and the real content to the first brass pour and frozen in its pour leg with a copper weigh-in ticket up (the state the store's first screenshot and the confirmation need); if the rules cannot hold a pour leg still, the preset stops one second before it and the view lets it run.
- **L3** (blocking). World plates sit on top of what they name and on each other.
  Ruling: do (blocking), with P7: one plate per thing, anchored ABOVE the sprite's top; hidden while the boss or a crew member stands in the footprint or works there, and while a ticket is up there; a padlock chip and its place's name are ONE plate ('Crucible · §800' with the padlock); identical 'Needs ...' plates of one floor or zone are ONE plate with a count; every plate laid out against the others and against the bars', the goal card's, the stick's and the one button's rectangles and the side margins; a plate that cannot be shown whole is not shown.
- **L4** (important). The weigh-in ticket rises over the platform scale and covers the boss standing on it, the display it prints from and the scale's plate.
  Ruling: do, with P8 and W17: the weigh-in ticket feeds out of the scale's printer slot (the manifest's slot of plant.scale.platform, as ticketOutOfSlot does in the proof) on the side AWAY from the boss and never covers his sprite box or the goal card; the collection ticket hangs at the flatbed's cab, the skip ticket beside the weighbridge's display clear of the cab; a ticket whose anchor is off screen falls back to under the cash counter, never to the far edge; every world ticket folds away while a card is open; one ticket at a time.
- **L5** (important). Old stock reads as a stamp, not a scrapyard.
  Ruling: do: (rules-sim) a zone's things lie inside the zone's bed rectangle (content zones.<id>.bed, MAP.md M3) on a seeded, jittered, rotated pattern with mirrored variants, no two sprites' footprints overlapping, the big things (the car, tanks, beams) placed first; the same seed gives the same heap; a test that every thing lies inside its bed and that from the bed's open side the boss can reach a thing (reach.work) without entering a pocket. Heap things are worked from the bed's edge inward: they are not walls to walk between. (art) each bed has its dirt-bed decal at its full rectangle when full and shrinking with the stock, drawn crisp at density 2 (baked at ground-sheet density), and the things of a kind have at least two looks (mirror, turn, a dent or a door open) chosen from the thing's id. (content) the beds' rectangles; the mix stays as tuned (zone 1 is washers and bicycles: its value must not change; variety comes from looks and from zone 2's bath, stoves, radiators and gates being in sight).
- **L6** (important). Beat 1 and section 3 promise that the first view at both sizes shows the scales, the price board, the stripper pad, the crucible pad and the flatbed.
  Ruling: do, changed: the first view is the FOLLOW view at the start, and MAP.md M7 says what it holds (the drop-off's first washer, zone 1's heap, the platform scale and the scale house's display); the specification's sentence about the crucible pad in the first view is withdrawn (the hero frame shows it). (world-a) on foot inside the yard the camera never shows more than about a metre of verge past the east fence or the south fence, and never north of the wall's skyline band; the boss stands at about 61 % of the screen's height (the free world's middle); the test: at 844 x 390 and 667 x 375, with the boss at start, the listed footprints lie inside the free world.
- **L7** (important). The lane and the partner sites read as unfinished.
  Ruling: do, with P10: (art) beyond the lane's hedges fields, hedgerows and the skyline band, never a void; roadside variety every 30 to 40 m (a milepost, a field gate, a telegraph pole, a lay-by) so that motion reads; each partner's site is a place: the farm with its yard, a gate sign carrying the partner's mark from the register, the skip under a lean-to; the demolition site with its hoarding and gate; the truck's north and south frames with wheels and a cab roof. (world-a) draws them from the lane's own sheet; the site's load plate above the skip, clear of the buildings; the camera zooms out to about 30 points a metre while the boss drives and back when he steps out; the lane ends at a drawn barrier before the bridge.
- **L8** (important). The player's own row is clipped and looks like a placeholder.
  Ruling: do, with S10 and W12: the rank cell fits '26th' at font scale 1.3 on one line; the player's row carries the yard's own mark (the yard's plate from the register and the art's mark function), never an empty box; the player's tonnes fit the row.
- **L9** (important). At font scale 1.3 the cash is truncated to '§13,3...' in the top bar, so the player cannot read their money.
  Ruling: do, with P4, H10 and W1 (one fix).
- **L10** (important). A held bay's chip is a five-line paper card ('Cast iron 4,500 kg / today §0.00 / held / high day / For the foundry 150 kg / 150 kg') that covers the bays and the price board for the whole session.
  Ruling: do, with S4 and W4: a bay's chip is two lines at most ('{grade} {kg} · held' / 'For the foundry {a} / {b}'), today's value from the board's own selector (what Sell would pay now), the day word only on the board; chips are plates and obey L3's layout.
- **L11** (important). The curtain's first frame is translucent over the game: the top bar ('§0.00', '26th of 26'), the goal line and world plates ('Platform scale', 'Weighbridge', 'Public drop-off') show through the sky, and a lighter rectangle covers the right third.
  Ruling: do, with P9, S11, H5: the curtain is opaque from its first frame (the splash's colour, then the sky); the bars, plates and buttons mount only when the gate starts to part; ingots dull brass, notched, with a dross skin and one glint; the mould on a stand under the tipping crucible with five separate cavities (it must not read as a progress bar); the last ticket's print at 11 points or more; the horizon lower with the yard's silhouette (the back wall and the far yard's cranes) on it.
- **L12** (important). Plausible draw-order fault.
  Ruling: do: a building with a door is sorted by its front edge and the boss is drawn in front when his y is greater; the boss is kept inside the fence and south of the back wall on foot; every card place can be REACHED: its standing spot (in front of its door or face) is free of solids and inside reach, and the autoplay's walk to each of them ends there (a test over every place with card: true).
- **L13** (important). While the player is holding the stick and walking, the hint's ghost thumb plays its drag at the same time.
  Ruling: do: the ghost thumb never shows while a real touch is down in the stick's zone, nor for two seconds after it lifts; target brackets are sized from the target's footprint plus half a metre.
- **L14** (minor). Some machine card rows are titled by a state instead of a name.
  Ruling: do, with W7 and W18: each machine section is titled by the machine's name with its state on the effect line; buttons are verbs ('Switch on', 'Switch off', 'Use', 'Start', 'Stop'); a list that scrolls shows it (a fade or a half row at its foot).
- **L15** (minor). The skip card is a flat red rectangle (it reads as a box, not a skip) over an empty white card with one line.
  Ruling: do: the skip card shows the oblique skip sprite with its fill and the partner's mark and the load's rows as on the site's plate; the rung sign takes its numbers from ONE selector (the rung's own threshold; with P17 the player's own tonnes on their own line).
- **L16** (minor). The hook-lift truck with its skip at diagonal headings is drawn as a large dark-red wedge in a different projection from the oblique yard.
  Ruling: do what the bake allows, in this order: (1) the truck is drawn with a skip only when it carries one, and with an empty skip after tipping (frames chosen from the truck's state; world-a selects, art bakes); (2) the cab from the side with a window and a raked bonnet; (3) the diagonal headings redrawn in the yard's tilt-0.7 oblique. Say which were done.
- **L17** (minor). The splash is the icon inside a rounded tile on white, and the tongs and the mould break out past the tile's edge.
  Ruling: do: a plain splash in the loading sky's first colour with the pour mark centred, no tile, nothing breaking an edge; the app's splash background colour is the same colour (through the game's app data and build script, whoever owns the line).

### Findings of the store reviewer (S)

- **S1** (important). The listing says the player buys the car: "Buy better tools and wheeled carriers: a sledgehammer and angle grinder for cast iron, a cutting torch for steel beams and a depolluted end-of-life car, delivered with its paperwork." Nobody buys the car in this stage.
  Ruling: do: the listing says what is true (the car came with the yard and its paperwork; nobody buys it); fix the possessive.
- **S2** (important). These sentences go to App Review and are not true of the build as it plays.
  Ruling: do: REVIEW-NOTES says only what the build does (partner loads over the weighbridge with seller ID and transfer; household items signed in on a slip); the pour sentence stays only if the confirmation sees a pour with shield and apron.
- **S3** (important). The skip weigh-in ticket prints "Paid §976.06" in bold for money the yard PAID OUT to Hob's Farm Clearance.
  Ruling: do: the skip ticket's amount reads 'Bought for {x}' in a cost colour, no coin arc on a weigh-in over the weighbridge; 'Paid {x}' only where the yard is paid.
- **S4** (important). A held bay's chip reads "Cast iron 4,500 kg / today §0.00 / held / high day".
  Ruling: do: a bay's chip shows the value of ALL its grams at today's price; 'held' and reserves are their own lines; never §0.00 for a stocked bay.
- **S5** (important). The closest overlap with Orbit Haulers is named nowhere.
  Ruling: do (a): one line in REVIEW-NOTES and the fingerprint notes naming the kinship with the other game's delivery board and how the supply deal differs; keep 'foundry' and 'smelter' out of the keywords. Screenshots are a later step.
- **S6** (important). Several 'differs' rest on declarations nobody checked against this build.
  Ruling: do: the fingerprint declares only what this build contains (events: rung-sign, posted-price-step; systems: crews, partners, price-board, industry-table, process-board, goal list); re-run validate.
- **S7** (important). Two of the eight must-differ dimensions are still pending, and each needs evidence that does not exist yet.
  Ruling: not now: the pending dimensions (store set, export report, a person's verdict, the release date) belong to the store step before a submission, not to the owner's phone test.
- **S8** (minor). This stage claims 'no ads and no purchases' (REVIEW-NOTES, RATING-NOTES), but the config still carries AdMob, and src/state/store.ts:448 calls ads.init() at boot.
  Ruling: do: no ads block in this stage's game data (ads off), so no consent or tracking prompt can appear in any build of stage 1.
- **S9** (minor). (1) The Settings 'Privacy' button opens store.privacyPolicyUrl, which is the placeholder https://example.com/scrap-to-ingot/privacy: the owner gets a broken page tonight, and a reviewer rejects it later.
  Ruling: do both: hide the Privacy button while the link is a placeholder (the line about the save stays); an empty price board says 'Grades appear here once weighed in' under the fictional line.
- **S10** (minor). Rungs 4 to 9 show padlocks with 'Opens at 150.00 t supplied · 6 metals' and so on up to 500,000 t.
  Ruling: do: rungs past this stage's last show a bare padlock with their tonnage and no 'Opens'; the rank cell fits '26th' at font scale 1.3.
- **S11** (minor). The cooled brass ingots on the loading screen are bright yellow bars with highlights and read as gold bars.
  Ruling: do: the loading animation's ingots are dull brass with a notch or cast mark, one glint, never gold.
- **S12** (minor). 'scrapyard' is both in the subtitle and in the keywords (Apple counts title and subtitle words already).
  Ruling: do: keywords without 'scrapyard' (already in the subtitle) and 'smelter'; add 'idle', 'crucible'; stay within 100 characters and keep the overlap with the four other games at zero.

### Findings of the phone engineer (H)

- **H1** (blocking). save() stamps lastSavedAt = Date.now() even while the store is paused (in the background).
  Ruling: do (blocking; a shared file, for all five games): save() never moves the start of the time away while the store is paused; a store-level test: pause, autosave, resume after ten minutes pays ten minutes; the four other games' regression tests stay green.
- **H2** (important). On a warm resume the away card never opens.
  Ruling: do: a warm resume opens the away card (subscribe to the waiting card as the finding proposes).
- **H3** (important). The away pass is slow, and it runs synchronously in the AppState 'active' handler on the JS thread.
  Ruling: do with R3 (the same fault): after R3's work the pass must be at most 150 ms in node on the played real state; if it is not, the resume shows the yard first and runs the pass after one frame.
- **H4** (important). Sound loops outlive what they belong to.
  Ruling: do: sound segments are cleared when the app leaves the foreground and re-seeded from the frame when it returns and when the epoch changes.
- **H5** (important). The loading animation cannot show its first frame until every part has been baked into a CPU raster image at the screen's density (3 on an iPhone), synchronously inside the render of the app's loading screen.
  Ruling: do: the loading animation shows its first frame from pictures; images are baked after it in slices; a rotation reuses them.
- **H6** (important). The yard bake is started only by a fixed 1.5 s timer at module load.
  Ruling: do: the loading stage starts the yard's bake at its third frame; the timer stays as a fallback; sheets A and B bake at density 2 on phones if that halves the time (say what was measured).
- **H7** (important). Every touch move reads the stick's shared value on the JS thread.
  Ruling: do: the stick never reads a shared value on the JS thread while steering; the one button asks a JS-side stickHeld().
- **H8** (important). The frame worklet's closure holds the pools X, RC and C (3 x CAP = 3 x 1560 Skia objects: RSXforms, rects, Float32Array colours), statics, rects and T.
  Ruling: do: the frame worklet is built once per bake and size; pools and statics live in one shared value; steer and insets are shared values.
- **H9** (important). (a) The stick zone reaches the bottom of the screen (`height: height - y`), so a thumb that lands in the iOS home-indicator strip (bottom 21 pt) starts the stick, and pushing up there is the iPhone's go-home swipe.
  Ruling: do: the stick zone ends above the home indicator and starts at least 20 points from the left edge; Android back is swallowed while a stick touch is held or just ended.
- **H10** (important). At font scale 1.3 on a 667-point screen the cash, the game's main number, is cut with an ellipsis once it reaches five figures.
  Ruling: do: the cash is fitted to its slot from its target value at every font scale.
- **H11** (important). Atlas draws a frame exceed the lead's limit of 12 in the played states: people and pieces (sheet A) interleave in depth with vehicles, machines and props (sheet B).
  Ruling: do if cheap: sort by depth band (a quarter metre) first and sheet second so neighbours of one sheet merge; check the hero frame's overlaps by eye; the lead's limit becomes twenty draws a frame for this stage.
- **H12** (minor). A card that opens while the thumb steers (the rung sign, triggered from a tick) zeroes the stick in the shell's effect, but the finger stays tracked.
  Ruling: do: a card that opens while the thumb steers releases the stick properly.
- **H13** (minor). Each store change (about 20 a second while walking: ticks plus presence samples) computes the frame at least twice: useRulesTable and the FxCanvas push.
  Ruling: do: the frame is memoised on the state's identity (callers never mutate it).
- **H14** (minor). Intervals keep running while the app is in the background.
  Ruling: do: intervals stop while the app is not active.
- **H15** (minor). HintLayer builds its own hudLayout from useWindowDimensions().fontScale, while the HUD uses useFontScale(), which honours the preview's ?fontScale=.
  Ruling: do: the hint layer uses the same font scale as the bars.
- **H16** (minor). During a JS stall (the away pass, the loading prepare) the UI thread keeps queueing a presence sample every 100 ms.
  Ruling: do: only the newest presence sample is applied after a stall.

### Findings of the rules attacker (R)

- **R1** (blocking). A recipe change with a heel in the pot pours the heel, and pour() then calls crucibleFromBays while the OLD recipe is still set.
  Ruling: do (blocking): a recipe change pours the heel WITHOUT refilling, sets the new recipe, and only then takes from the bays; the test the finding names.
- **R2** (important). If the boss uses Step out with a skip on the truck (weighed or not), the hired driver never touches it.
  Ruling: do: the hired driver finishes a loaded truck the boss left (live and away); the test the finding names.
- **R3** (important). Time away on the real content far exceeds the 50 ms aim, so the phone stalls when the player comes back.
  Ruling: do: time away on the REAL content is cheap: running totals for the floor, the idle driver re-checked only when floor, cash or a skip changed, no per-instant sorting; a bench on games/scrap-yard/game.json at a played minute-60 state: six hours in at most 150 ms of node CPU (the aim stays 50).
- **R4** (important). E31b is not built: hand.lev is 0.12 and cutter.lev is 0.15, not the quarter E31b asks for.
  Ruling: do: crew.hand.lev and crew.cutter.lev 0.25 (E31b), levels priced by E13a; rebuild; the bots measure E31c again.
- **R5** (important). Beats outside their bands on seeds the tuning never saw: (1) the buy-everything habit's first pour at 25:41 to 27:55, 0 of 5 in band (18 to 25); (2) the slow hand's first drive at a median of 11:05 and its torch at 17:10, 0 of 5 in band; (3) the brisk hand reaches rung 3 at 52:09, 0 of 5; (4) the day-word holder ends 20 % below the same days without Hold on one seed even with E32, so Hold is still a trap on some draws.
  Ruling: partly: tune with the unseen seeds included; the first pour's band is for the buy-when-affordable habit (the other habit may pour later); the slow hand is judged by E24 (within half as long again of the normal hand: holds); the brisk hand may reach rung 3 early; find why Hold costs a fifth on that seed and say whether E32 needs a one-day limit.
- **R6** (important). The first time away floods the shop.
  Ruling: do, by a rule (ECONOMY.md E33): the away cap grows with the rung: half an hour on rung 1, two hours on rung 2, four hours on rung 3; the Night watch adds two hours on any rung; the away card says how long the yard ran and what makes it run longer. Then the bots measure the burst after 5 min + 4 h and after 15 min + 12 h.
- **R7** (minor). The presence sample is not clamped.
  Ruling: do: presence samples are clamped (standingFor, position inside yard and lane, driving only when the boss holds the truck).
- **R8** (minor). When the boss's pickup act ends, takeFromPile takes the piece without checking its claim.
  Ruling: do: a claimed piece is not taken by the boss's pickup.
- **R9** (minor). A leftover debug test with no assertion.
  Ruling: do: delete the debug test.
- **R10** (minor). A deal day whose midnight falls beyond the away cap A is never delivered: the market day jumps without a day event.
  Ruling: do, by a rule (ECONOMY.md E34): the supply deal delivers at every market midnight that passed while away, inside the cap or beyond it, from the reserve as it stood (it was set aside before the boss left); the away card lists the deliveries.

### Findings of the trade and words desk (W)

- **W1** (blocking). The player cannot read their money.
  Ruling: do with P4.
- **W2** (blocking). The card says the time away brought '§78,171 (already in your account)' and '75 loads fetched'.
  Ruling: do with P3.
- **W3** (important). The lesson prints 'From depolluted car ref.
  Ruling: do: the record reference prints as written ('0012') everywhere; a test.
- **W4** (important). The chip reads 'Cast iron 4,500 kg · today §0.00 · held'.
  Ruling: do: a held bay's chip shows what Sell would pay now (the bay less its reservations at today's price), the board's own number.
- **W5** (important). One yard hand 'Carries 27.2 t an hour', a cutter 'Cuts 36.0 t an hour', 'Another skip +21.1 t an hour', the hand stripper '1.0 kg a second' (3.6 t an hour of cable stripped by hand) and the powered stripper '6.0 kg a second'.
  Ruling: do (a): no absolute tonnes-an-hour on any row in this stage: a yard hand 'Carries {kg} a trip', a cutter 'Cuts with the yard's best tool', a level '+25 % faster', another skip 'One more skip filling at {partner}', the hand stripper 'Turns while you stand at it', the powered stripper 'Runs by itself'.
- **W6** (important). A whole bicycle is weighed in and sold as 'Appliances 15.0 kg §5.55'.
  Ruling: do: the grade is 'Light iron, uncut' (short 'Uncut iron') in words and content.
- **W7** (important). The motor bench card reads 'Electric motors → No.2 copper'.
  Ruling: do: machine cards list every output, largest first; each owned machine's row is named by the machine.
- **W8** (important). Light iron sells at 0.50 against HMS 80:20 at 1.20, a ratio of 0.42.
  Ruling: not now: unprocessed light iron at about half of HMS is inside what yards pay; the price ladder is reviewed against the metals research when stage 2 adds the baler and the shredder. The lesson's computed multiple stays true to the board.
- **W9** (important). No yard takes an end-of-life car shell apart with an oxy torch into eight 100 kg pieces.
  Ruling: do: nobody torch-cuts a car body. The car gives its four wheels and its loom by hand, the torch frees the converter, and the stripped shell is weighed whole as 'Car body' and leaves on the merchant's next round from where it stands (one whole unit; no pieces to carry). Goal 'Strip the car for the shredder'; the torch's line 'Cuts beams and tanks; frees the converter'.
- **W10** (important). The lit range chips are Light iron, Cast iron, HMS 80:20, Brass and No.2 copper.
  Ruling: do, with the word 'materials': 'Supply {t} ({r} materials)', '{t} supplied · {r} materials'.
- **W11** (important). Tonnes print with two fixed decimals: '21.50 t', '150.00 t', '2.20 t', '707.20 t', '0.00 t'.
  Ruling: do: tonnes with at most three figures and no trailing zeros ('0.39 t', '2.4 t', '21.5 t', '150 t'); shop prices and labels without hundredths from §100.
- **W12** (important). The player's rank '22nd' wraps to '22n / d' in the rank column, and the player's tonnes '25.93 t' are clipped at the row's right edge.
  Ruling: do with S10.
- **W13** (important). (a) The rung-2 sign says what the rung opened ('The cutting torch, a radiation portal and a supply deal') and, right under it, the padlock line 'Opens at 21.50 t supplied · 5 metals'.
  Ruling: do both: 'Next:' before the next rung's condition; the held row prints 'Held until a high day, two days at most'.
- **W14** (important). S3: household drop-offs are 'signed in' on a slip ('Washing machine · signed in · gate drop-off').
  Ruling: do: a slip chip over the drop-off when a thing arrives (and for the first washer), and a chip for a deal delivery.
- **W15** (important). The converter is the dearest piece of the first yard (about §990), and S7 says it is paid by payables shown on its card.
  Ruling: do: the converter's payables line is printed on its bay card and in the ticket history.
- **W16** (important). The first weigh-in of the game is 'Cinder Lane Yard · No.
  Ruling: do: weigh-in tickets and sale tickets are numbered in two series, each from 1.
- **W17** (important). When the goal card carries its lesson line, it covers the ticket's head (the yard's name and number): '...rd · No.
  Ruling: do with P8.
- **W18** (important). The recipe button's label is the recipe's name, so it shows 'Aluminium ...' (cut) beside the row 'Aluminium recipe · Off'.
  Ruling: do: buttons name the action ('Use', 'Start', 'Stop'), rows name the state.
- **W19** (minor). 'Sledge' alone means a sled to most readers of English as a second language; S6 names the purchase 'Sledgehammer and angle grinder'.
  Ruling: do.
- **W20** (minor). 'Away 3 h 12 m (cap 6 h)' and 'A longer away cap'.
  Ruling: do, with E33: 'Away {t} · the yard ran {c}' and the line saying what makes it run longer; no 'cap' in any player text.
- **W21** (minor). 'Work the drop-off' is an idiom (work = clear) that a second-language reader takes literally.
  Ruling: do.
- **W22** (minor). Small true-to-the-trade fixes.
  Ruling: do.
- **W23** (minor). rival.7's chip is the home town's word: the first yard also has Oakbridge (town), Oakbridge Vale and Oakbridge Foundry Co-op, so 'You passed Oakbridge.' reads as passing a town.
  Ruling: do: rival.1 becomes a firm of the word 'Marchford' and rival.7 of 'Redport' (both cleared by the names desk as candidates and unused), with chips of at most 14 characters; the register records them with their existing check records and byId is rebuilt.
- **W24** (minor). 'Buy the powered stripper', 'Buy the crucible', 'Charge the crucible' and 'Buy the motor bench' are unticked while all four are owned and the crucible is heating.
  Ruling: do: a goal whose condition already holds is ticked in the list.
- **W25** (minor). The motor bench's icon sits on the 'M' of 'Motor bench' and the aluminium recipe's icon on the 'A' of 'Aluminium'.
  Ruling: do.
- **W26** (minor). E31b ('a cutter's and a yard hand's level adds a quarter') and E31d (rung 2 at 2.4 t) are not in the content: hand.lev 0.12, cutter.lev 0.15, rung2.t 2.2.
  Ruling: do with R4 (E31b and rung 2 at 2.4 t).

---

## The lead's ruling on the owner's decisions of 26 November

After the first yard was delivered, the owner decided: "Purchases should be limited to cosmetics,
currency etc. Maybe you could even get bank loans, Etc... investments, yard sales," and "30 players
could join a company like for instance how Hay Day is designed you can have neighborhoods".

Four researchers gathered the facts and a second person checked each (`docs/design/research/`:
`yard-social.md`, `yard-policy2.md`, `yard-money.md`, `yard-finance.md`). Three designers proposed
inside a frame the lead set (`design2/FRAME.md`); four judges judged (a player and the owner's
intent; store policy, ratings and fair boards; the economy and its exploits; the builder). This
ruling stands above the proposals and the judges. A point that cannot work is reported with its
smallest example, never quietly replaced. Numbers given here are starting values for the numbers
prototype unless a point says "fixed".

### 1. How the owner's words are read

1. "Cosmetics" are LOOKS: things that change how a yard looks and nothing else.
2. "Currency" is SCRIP (§), the one currency the first yard has, sold only as hours of the buyer's
   own yard's rated income. There is no second, paid currency (the EU consumer authorities warn
   against mixing currencies and against exchanges before a purchase).
3. "Etc." is read narrowly: a NO AD VIDEOS purchase, and bundles of looks with it. No pass, nothing
   random, no timer on any offer, nothing that adds tonnes or rank directly.
4. "Bank loans" are the bank's PLANT FINANCE (stage 2), a merchant's ADVANCE (stage 3) and a SITE
   LOAN (stage 4): each repaid only out of sales.
5. "Investments" are A PART IN A PARTNER that comes back as better terms on real trade with that
   partner (stage 3), and A PASSED RIVAL'S YARD bought as a site (stage 4). Player text never says
   invest, returns, shares, stock, dividend or stake.
6. "Yard sales" are a REUSE RACK at the gate from which the public buys (stage 2). Between players
   nothing is ever sold at a price a player sets.
7. "A company like a neighbourhood": every player keeps their own yard; a company is founded and
   joined, at most 30 members (the design's section 7 stands), and members HELP each other a
   little every day and share a WEEKLY ORDER. The groups, the rack and the weekly order are our
   own in theme, words, rules and numbers: nothing of another game is copied.

### 2. Money

2.1 **Rated income, I (fixed).** Everything priced in hours uses one measure: the scrip an hour the
    yard would earn with its present assets, no boss, at usual prices (rated capacity times the
    margin a tonne of what that capacity makes). It is computed from ASSETS, never from the moving
    average of recent sales (a player can pump that: hold every bay through a low day, sell all,
    open the card). The rated function must count the step that binds (the bots found cutting and
    the one truck bind late). Gate: I is within 0.9 to 1.1 of the measured away income an hour at
    rungs 3, 4 and 5.
2.2 **The catalogue of stage 2.** All real-money prices are on ONE card, the shop (opened from the
    office and from Settings; it is not a new place on the first yard's map). No working card
    (truck, crane, gate, machine) ever carries a real-money button.
    - LOOKS, each $1.99 to $2.99, bought once, restored on reinstall: six fleet colours, four
      yard-dressing sets, a founder's plaque poured in the yard's own crucible. Emblem parts and
      company looks go on sale only in stage 5, when others can see them.
    - EARNED LOOKS, never sold: a sign style at each rung and the foundry's plate, so that a player
      who never pays has looks to show.
    - NO AD VIDEOS, $4.99: every ad reward at once, same limits.
    - ONE BUNDLE of looks with No ad videos, at one fixed price, always on sale, never timed, never
      limited in number, offered only while the player owns none of its parts. A bundle never
      holds scrip (a bundle with scrip is a consumable whose looks would not restore).
    - SCRIP PACKS: 2, 5.5, 11.5 and 24 hours of I at $1.99, $4.99, $9.99 and $19.99. The largest
      pack is at most the payback time of the rung where packs open.
2.3 **How a scrip pack works (fixed).**
    - Packs open at RUNG 4, never before: the measured first day is the same for everyone.
    - The amount S = H x I is fixed when the card opens (shown again if the market step changed
      before the store's sheet opens) and granted exactly as shown however late the approval comes
      (a parent's approval can take hours). A ledger of granted transaction ids, a listener for
      pending purchases and a reconcile at start keep a paid pack from being lost or paid twice;
      bought scrip survives a restore and a save migration.
    - Headroom: a pack is offered only while the yard can spend it now (the sum of what is buyable
      now under the rung's ceiling). Otherwise its row reads "Nothing to spend it on yet" and has
      no Buy button.
    - The card prints the scrip and "about H hours of your yard's earnings". It never says "H hours
      ahead" (the real lead is tau x ln(1 + H / tau), less than H) and never promises success.
    - The grant goes through this mode's own money rules (a salvage consumable kind), not the
      shared time-warp kind, which pays a moving average.
2.4 **The switch (fixed).** Scrip packs are switched by country in the game's data: OFF in the EEA
    and Switzerland at launch (until the owner has a lawyer's answer on showing a real-money figure
    beside every scrip price), OFF where the country is unknown, ON elsewhere. Settings carries a
    plain switch "Scrip packs: shown / hidden" so that a parent can hide them. The frame's "off for
    players the platform reports as under 18" cannot fire today: no age signal exists without a
    native module, and Expo Go has none. It becomes real when a store build carries the platform's
    age signal, which is the owner's decision before the first store build; until then nothing in
    the game or its store page claims it. THE GAME IS WHOLE WITH PACKS OFF: a player without packs
    lacks only time, and every aim is measured in both modes.
2.5 **Never.** No goal, advice line, away card, refusal, ticket or debt card ever names a real-money
    product. No real-money prompt in the first session. No ad and no shop button on any card or
    ticket that shows a debt.
2.6 **Ads.** Rewarded videos only, behind labelled buttons that show what they pay: together at
    most 4 % of a day's rated income (two away bonuses of up to 15 minutes of I, three spot buyers
    of up to 8 minutes of I: 54 minutes a day). The away bonus is offered on its own small card
    after the away card is closed, never on the away card. Ad rewards never count on a board and
    never repay anything.
2.7 **Boards stay worth playing for someone who buys nothing (stage 5).**
    - Weekly brackets: every player is credited at most min(D frozen at placement, the band's top)
      for the whole week, so capacity bought on Tuesday moves nothing until next week's placement.
    - The company order: a member's credited deliveries are at most 1.25 times their own frozen
      share (6.2).
    - The all-time board: the shared credit curve. A player is credited at most the tonnes an
      always-on player who never pays would have reached by that day; the figure is labelled
      "credited", and the private ladder keeps every real tonne.
2.8 **The store sentence.** With packs on: "Purchases change how your yard looks, remove ad videos,
    or add scrip worth some hours of your own yard's earnings. Nothing sold adds tonnes directly,
    and shared boards credit no more than play can reach." With packs off: "Purchases change how
    your yard looks or remove ad videos. They never add scrip or tonnes."
2.9 **Ratings expected.** Apple 13+ (contests); the European rating 3 to 7 (nothing timed, nothing
    random, no relegation; "in-game purchases" shown); the German rating very likely 12 where packs
    are on ("increased incentives to buy"): accepted.
2.10 **On the owner's phone.** In Expo Go purchases are simulated: Buy gives the look or the scrip
    and no money is taken. A dev switch sets the region so that the owner can see the shop with
    packs on and off. Real charges begin with the first store build.

### 3. The bank

3.1 **ECONOMY E11 is amended by name.** "No credit in the first hour's shop: tools, carriers, crew
    and the first machines are bought with cash. From rung 3 the bank's plant finance exists, on
    works plates only."
3.2 **Plant finance (stage 2, from rung 3; fixed in form).**
    - Who: one invented lender, the bank's plant-finance desk ([bank]).
    - What: a works plate that earns (a machine with its own output grades), priced at least half
      an hour of I. "Finance what earns" is the only sentence the advice line ever says about it.
    - How much: the bank pays F, at most 80 % of the price and at most F_max = min(2 h, 0.15 x
      tau_r) x I; the player pays the rest now (the deposit, at least 20 %), and the deposit never
      takes the reserve the driver's next load needs (E19, E29).
    - What it costs: a flat charge c = 8 % of F (tune 5 to 12), fixed at signing. Total T = F x
      (1 + c), printed on the card.
    - How it is repaid: a share s = 25 % (tune 15 to 30) of each payment for lots of the financed
      plate's OWN OUTPUT GRADES, until T is paid: the machine pays for itself, and nothing is taken
      from the yard's other trade. No due date, nothing that grows, no "repay now" button, cash
      never below zero. A plate that stands idle pays nothing and its debt stays as it was.
    - How many: one agreement at a time in stage 2; later never more than 40 % of any payment in
      all.
    - Time away: the same function; lots collected while away repay by the same share.
    - What the player sees: the lender's letter the first time a works card costs more than the
      cash in hand while the deposit is in hand; on the card "Finance" beside "Save up (about x)"
      (only the time is "about": every other number is applied as shown); a tag and a ring that
      fills on the machine; on each ticket for those lots "Paid §x · to the bank §y · to you §z";
      a ledger page in the office. A debt never shows in the top bar, the goal card or the advice
      line.
    - Worked example (rung 3, I about §54,500 an hour, tau about 9 h): a baler at §80,000. Deposit
      §16,000; F = §64,000 (under F_max = 1.35 h x I = §73,600); T = §69,120; a quarter of each
      bale lot goes to the bank until §69,120 is paid.
3.3 **Aims (measured by the bots before the screens exist).** The sum taken equals T exactly; cash
    never below zero; a tick equals a jump with an agreement open; with an agreement open no
    bought load loses money at any rung (else s falls); a bot that always finances reaches rung 5
    at most a tenth sooner than one that never does; by the card's own numbers finance is the
    better choice on a quarter to a half of the purchases where it is offered.
3.4 **Later.** Stage 3: the merchant's advance: a charge fixed at signing; repaid from every lot of
    the advanced grade whoever buys it; no delivery date and no penalty. Stage 4: the site loan,
    repaid from that site's payments; a grant with conditions the player can see and meet.
3.5 **The server (stage 5).** The bound on a client's claims becomes: assets + cash <= gross
    earnings + verified pack grants + financed - repaid.
3.6 The agreement is in the save and changes the contract's version. The review notes carry one
    line: loans in the game are fictional, in scrip, and pay nothing out.

### 4. Holdings

4.1 **Words.** "A part in [partner]", "your part", "terms"; the office's ledger page is "Holdings";
    Help says: fictional, scrip only, nothing is paid out, not financial advice.
4.2 **A part in a partner (stage 3).** One per partner, in three steps. It returns only as better
    terms on real trade with that partner: at most a tenth off that partner's load price for the
    lane partners; a fixed percentage more on deliveries for the foundry co-op (membership). It is
    priced by the payback rule on the trade done with that partner WHEN BOUGHT and it is capped to
    that trade (so many loads or tonnes a market day; raised only by buying the next step): raising
    the flow later never raises the benefit for free. It is never resold and never lost; it pays
    only on loads actually bought; it never adds tonnes. The weighbridge ticket prints "Your part:
    -§x". ECONOMY E20 is restated: with every holding owned, three fifths of a load's margin still
    come from the yard's work.
4.3 **A passed rival's yard (stage 4).** A simulated firm the player has passed may offer its yard
    on the key board; bought as a site, with its old stock in heaps (hand work at once); its
    tonnes count from the day bought. Simulated firms only, never players.
4.4 **Not built.** A resale of anything; a price or a return set by chance; a deposit that pays by
    the clock; anything in another player's company; a company pot or project paid in scrip (bought
    scrip would reach every member's yard, and paying in would become a social duty). If a company
    build comes in stage 5 it is paid in delivered tonnes and gives a look only; it is the first
    thing cut.
4.5 **Aims.** Each holding pays back in 0.8 to 1.5 tau; all holdings together add at most a tenth
    of a day's income at day 14; no holding changes tonnes.

### 5. Yard sales

5.1 **The reuse rack (stage 2, from rung 3).** A rack under a canopy by the gate, new at rung 3 (the
    first yard's map before rung 3 does not change). A thing fit for reuse is fixed as such when it
    is made (a hash; a green tag shows it before any choice): single real things (a bath, a
    radiator, a bicycle, brass taps, a stove, gates). Never racked: anything electrical or sealed,
    cylinders, batteries, converters, car parts. The hand lifts a tagged thing whole instead of
    cutting it and carries it to the rack; yard hands carry tagged things there too.
5.2 **The sale.** Members of the public come on foot (agents on dated legs, off the drive line),
    one every period while the rack holds anything, the same whether the player is there or away,
    with a defined restart when an empty rack gets a thing (a tick equals a jump). One price in
    stage 2: 2.5 times the thing's scrap value at the sale's step (no timing edge from racking on
    a high day). A choice of price tags is the first thing cut and comes back only if the rack
    fills in play.
5.3 **So that it is still felt at rung 5.** Partner loads may carry a reusable batch, printed on the
    load's label before paying; set aside whole at the rack's trade corner, it is collected by a
    reclamation dealer's van (not carried out by the public) at 1.5 times its cut value.
5.4 **The first moment.** At rung 3 one reusable bath stands beside the new rack; the first visitor
    comes within four minutes.
5.5 **The ladder.** Mass sold from the rack counts as supplied tonnes (one ladder), with its term in
    the server's bound.
5.6 **Aims.** 2 to 5 % of a day's income at rungs 3 to 5, never above 8 %; a minute of the boss's
    racking earns at least 1.2 times a minute of his cutting; the same result present or away.
5.7 **Between players (stage 5).** A member's rack is read-only on a tour (an emote may be left). No
    stand, no price a player sets, no scrip from one player to another, no "send a buyer".

### 6. The company

6.1 The design's section 7 stands. The company's place is a flagpole at every member's gate.
6.2 **The weekly order.** Each member sets "in" or "out" before the week; the roster freezes at the
    week's start. The order is 25 h x the sum of the in-members' rated capacity at the freeze. A
    member's credited deliveries are at most 1.25 times their own frozen share, so capacity bought
    in mid-week cannot lift the company. Lines by grade where at least two members can supply. A
    claim ("I can cover copper.") stays the visible marker the design gave it and lapses quietly
    after 24 hours at no cost. Tiers at 50, 80, 100 and 125 % are credited automatically at the
    week's close; rewards are looks, kept for good, and kept by a member removed in mid-week. Once
    a month a calm week (an inspection week): the order at 60 %, no class moves.
6.3 **Classes, not leagues.** Companies are ranked within classes of about fifteen companies of
    like size and capacity, by how much of their order they completed; pennants for the top three,
    kept for good; nothing is ever lost for a quiet week; no relegation (losing status for not
    returning is what the European rating calls pressure, and rates 12).
6.4 **Help, every day.** (a) A request for feed: a grade one of the poster's machines takes; one
    request a market day; at most two hours of the requester's I; the price is locked at posting
    for both sides; the requester pays the game, the helper is paid the same amount by the game;
    a helper gives at most one hour of their own flow a day; the received mass is booked so that no
    tonne is counted twice; it applies at the first event after the client receives it, never
    back-dated; the server writes it; an unfilled request stays open and withdrawing it returns
    what was set aside (no merchant's fallback at a premium). (b) Covering a short delivery of a
    member's supply deal: it moves neither goods nor scrip, prevents a loss of trust and never adds
    trust. If stage 5 runs over, (a) is kept and its lorry animation is cut first.
6.5 Nothing bought and no ad ever buys a claim, a request, points, an allowance, a deadline, a
    class or a second draw of rewards.
6.6 A removed member keeps what they earned; the wait before joining another company grows with
    each removal. A list for finding a company shows its emblem, its members, an activity word and
    a mark where its average rung matches the player's. Fixed phrases and emotes; no free chat, no
    typed names. Without a network, and for a player under 13, simulated firms play the whole
    company in the local mode.

### 7. The stages

7.1 **Stage 2, the works (the next build)** is the design's stage 2 with: the shop (looks, No ad
    videos, the bundle; scrip packs from rung 4 where the country's switch is on; simulated in
    Expo Go); the earned sign styles; rewarded ads; plant finance; the reuse rack and its sale;
    and two things owed from the first yard: the aggregation of crew legs so that time away is
    cheap, and the tuning step of ECONOMY E36 (the driver's level or a second truck).
    In the order a player meets it: the first hour as built; at rung 3 the back field with the
    first works plate (a baler) and the lender's letter; the rack with its bath and the first
    visitor; from the second session the shop; at rung 4 the scrip packs, the shredder line and
    the melt lines; rung 5.
    The shared store files change FIRST and by one owner, with the four other games' tests green,
    before any shop screen is built.
7.2 **If stage 2 runs over**, one melt line (the battery breaker and lead) moves to stage 3. Never
    cut: the country switch and its unknown-country default; the rung-4 gate on packs; the refusal
    above headroom; the frozen quote and the ledger; the share and the total printed on finance and
    their tests; no shop and no ad on a debt card. Cut first, in this order: the second kind of
    reusable batch, the 11.5 h and 24 h packs, two dressing sets, levels of the rack.
7.3 Stage 3 (the market): the merchant's advance; a part in a partner. Stage 4 (territories): the
    site loan, a grant, a passed rival's yard as a site, a rack at each site. Stage 5 (other
    players): the company's flagpole, the in and out roster, help, classes, the calm week, the
    finder; the credit curve and the frozen brackets; emblem parts and company looks on sale; the
    age signal if the owner chose it. Stage 6 as designed.
7.4 Each stage's aims are measured only up to that stage's top rung; the buyer-against-non-buyer
    aims at days 7, 14 and 30 stay in the numbers prototype until the stages they need exist.

### 8. What the owner is told and asked

1. Scrip packs are in, as hours of your own yard's earnings. They are off in the EU and
   Switzerland at launch until a lawyer has answered one question (there, every scrip price might
   have to show its real-money value); looks and No ad videos sell everywhere.
2. With packs on, Germany's rating will very likely be 12. A buyer climbs their own ladder faster;
   the shared boards credit no more than play can reach.
3. Companies compete in classes of like companies for pennants; no company is ever dropped down
   for a quiet week (that would raise the European age rating).
4. Hiding packs from under-18s needs the phone to report an age, which needs a native module in
   the first store build: your decision then. On your phone in Expo Go all purchases are pretend.

### 9. Rulings on what the writer and the critics found (01:50; these change sections 1 to 8 where they differ)

9.1 **The packs' ladder.** 2, 5, 10 and 20 hours of I at $1.99, $4.99, $9.99 and $19.99: one flat
    rate, no discount for size, and the largest pack under the payback time of rung 4 (22 h). (It
    replaces 2, 5.5, 11.5 and 24 in 2.2.)
9.2 **No bundle in stage 2.** A store product has one fixed price, so a bundle either charges for
    parts already owned or is a one-chance offer. The shop of stage 2 sells looks, No ad videos
    and packs. (It replaces the bundle of 2.2 and 7.1.)
9.3 **A neutral age question makes the under-18 rule real.** Asked once, the first time something
    needs it (the packs' rows where the country's switch is on; in stage 5 before the terms): year
    of birth, no default; kept on the device as a band only (under 13, 13 to 17, 18 or over).
    Under 18: packs hidden. Under 13: the local mode only (the design's 7.6). A platform's age
    signal may replace the question in a store build (the owner's decision). (It amends 2.4.)
9.4 **The Settings switch is locked.** Whoever sets "Scrip packs: hidden" chooses a four-digit
    code; showing them again asks for it. It is a courtesy to parents, NOT declared to a store as
    "parental controls"; the review notes name the platforms' own purchase approval.
9.5 **The country** is the store account's country as the purchase module reports it, read each
    time the shop opens; never the device's language or region, never an address on the network.
    Until it answers, or if it fails: unknown, so packs are off.
9.6 **One store sentence, true everywhere:** "Purchases change how your yard looks or remove ad
    videos; in some countries they can also add scrip worth some hours of your own yard's income
    in the game. Nothing sold adds tonnes directly, and shared boards count no more than play can
    reach." Never "cosmetic only". The German rating is very likely 12 for the whole app, although
    packs are off in Germany at launch: a rating is of the app, not of a country's switch.
9.7 **The owner's words on screen.** The finance card's button reads "Bank loan" beside "Save up
    (about 1 h 20 m)"; its lines: Price · You pay now · The bank pays · Charge · You repay · "{x}
    of each {output} lot goes to the bank until it is repaid. No date." The advice line's one
    sentence: "A loan suits a machine that earns." The rack's card is titled "Yard sale" (the
    owner's word, for our own thing: the public buys things fit for reuse from a scrapyard); it
    never sells looks or decorations and has no sale time. A holding is a PARTNERSHIP: "Partnership
    with [partner] · step 1 of 3"; the ticket line "Partner terms: -§x"; the office's page for
    loans and partnerships is "Agreements". (It replaces "a part in a partner", "your part" and
    "Holdings" in section 4.)
9.8 **The bank's share never makes a machine worse than none.** The share s is set per plate so
    that a financed kilogram never nets less than the same kilogram unprocessed; first value 0.18
    for the baler (baled §0.62 against loose §0.50); the bots raise it only while that holds. The
    card prints the share that applies.
9.9 **Ads and the bank never meet.** The spot buyer is never offered on an output grade of a plate
    with an open agreement. The away bonus is half of the away cash that reached the player after
    the bank's share, paid as its own line and never part of a payment the bank shares in. No ad
    button stands on screen beside a card or ticket that shows a debt (a screen test).
9.10 **A partnership must be worth having.** With the first yard's loads E20 leaves almost nothing
    for a discount (1.25 % at the demolition partner, none at the farm). Stage 3's specification
    and its numbers prototype choose the form among: better terms within E20, first pick of the
    partner's loads (a richer mix, which raises the value of the yard's own work too), a share of
    the foundry co-op's premium on what the player delivers; each step pays back in 0.8 to 1.5 tau
    by the card's own numbers. Nothing of it is built in stage 2.
9.11 **Help is priced when it arrives.** Each part of a request's mass is priced at the posted
    price of the step at which it arrives, the same for both sides (the game pays the helper
    exactly what the requester pays); the price at posting is a guide; what the requester's
    set-aside and cash cannot pay is not sent. (It replaces "locked at posting" in 6.4.)
9.12 **Classes are formed afresh each week** from that week's frozen roster size and capacity only,
    never from results; they have no order and no ranking names ("12 companies of your size");
    about twelve to a class (tune 10 to 14). The monthly easy week is "Inspection week" in player
    text.
9.13 **Looks and companies.** Emblem parts on sale and emblem parts earned are separate sets;
    nothing the weekly order gives is ever sold. A look bought by a member shows on that member's
    own flagpole and yard only; a company's shared emblem uses earned parts only.
9.14 **Words.** "Counted", not "credited", on boards ("Counted on this board: 41.2 t"). "I can send
    copper." "No ad videos: get every ad reward without watching." Player text never says "daily"
    or "missed". One sentence in Help for everything pretend: "Prices, exchanges, loans,
    partnerships and listings in this game are fictional and use scrip only. Nothing can be paid
    out, and nothing here is financial advice." "Stock" is banned only as a word for a holding
    ("old stock" stays).
9.15 **Names in the design.** Every name in the design document is the names register's current
    name or a placeholder in square brackets; the old currency name goes.

### 10. Rulings on the second critic's points (exploits and buildability; 02:00)

10.1 **The bank's share cannot be dodged.** Repayment is tied to what the financed plate MAKES, not
    to how its output is sold. Each time mass of the plate's output leaves its tray, whatever its
    destination (a lot, or another machine's hopper), an amount falls DUE: s_p x that mass x the
    step's posted price for that output, never more than what remains of the total. What is due is
    collected from the yard's next lot payments, at most 40 % of any one payment, and from nothing
    else (not from cash in hand, ad rewards or packs), so cash never goes below zero. An idle
    plate makes nothing, so nothing falls due. The ticket prints "to the bank §y" on a payment
    that carries a collection. (It replaces "of each payment for lots of the plate's own output
    grades" in 3.2.) The stage-3 advance is collected from every lot's payment by a share.
10.2 **The share per plate.** s_p = min(bank.share, 0.8 x u_p), where u_p is the part of the
    output's value that the plate adds (1 - the input's value per kilogram of output / the
    output's value per kilogram, at usual prices), computed by the content script. The baler: u =
    0.194, s = 0.155. (It replaces 9.8's first value.)
10.3 **The cut that moves the lead line** also lowers rung 5's range in stage 2's content, and the
    no-dead-end test and the bots run on the cut content before it is accepted.
10.4 **Time away made cheap is a change to the ONE engine.** Crew trips are grouped whenever no
    boss is within sight, in a tick, a jump and time away alike (as the cutter's whole-thing rule
    already does), so that a tick equals a jump and present equals away stay exact. It is built
    and benched as its own engine step BEFORE any stage-2 rule, together with rated income I and
    10.5.
10.5 **Hold never stops the yard (ECONOMY E40; it replaces E36(c)'s "next stage").** While the boss
    is away and the cash cannot pay the next load, the held bay worth most rejoins the merchant's
    round, one bay at a time; the away card names it ("Sold from hold to keep the yard running:
    {grade}").
10.6 **Rated income at named moments.** I is stated and gated at each rung's entry and at its last
    purchase. "A day's income" is I x the production hours of the twice-a-day habit (12.3 h at
    rung 3). The margin per tonne in I uses, for a machine with several recipes, the recipe with
    the lowest margin (a player cannot raise I by switching a furnace before opening the shop).
    The quote S is fixed when the card opens and shown again only when a purchase has arrived.
10.7 **Ads fit the day.** All ad rewards together are at most 4 % of a day's income as defined in
    10.6: at rung 3 about 30 minutes of I (one away bonus of up to 15 minutes; three spot buyers
    of up to 5). The spot buyer is attached to a held bay's Sell, whose amount is known: it pays
    min(a tenth of that Sell, its cap), and the button shows the figure. (It replaces 2.6's
    numbers.)
10.8 **A pack lives in this device's save.** The reconcile grants only transactions dated after
    the save was created and missing from the ledger, at the amount stored with the pending
    quote. The sheet shown before a purchase says that bought scrip lives in this device's save
    (a consumable is not restored by a store). "Survives a restore" becomes "survives a save
    migration" until stage 5 gives the player an account.
10.9 **The shop in the shared code.** A shared product kind for hours of income (consumable) and a
    hook in the modes' contract by which a mode grants a product with its transaction id and its
    quote; no mode's name in a shared list. The four other games' tests stay green.
10.10 **The yard sale's pace follows value.** The next visitor is dated at t + period x (the price
    of the thing just sold / a reference price), so the rack earns at most a fixed rate whatever
    is on it. The van is dated at t + its period when a batch reaches an empty trade corner; a
    batch is valued at its prepared value at the collection's step. While the boss is in the yard
    a tagged thing is his (he racks it or cuts it); while he is away yard hands rack tagged things
    within their load; a tagged thing nobody present can lift is cut as any other. Content keys
    are reuse.* (the tool rack keeps "rack").
10.11 **Boards (stage 5).** A weekly bracket ranks by counted tonnes over the player's own frozen
    capacity (how fully the yard ran that week), so capacity, bought or earned, cannot rank anyone
    above a band-mate. On the all-time board the day and the cohort are anchored at the server's
    first sight of the player, and ties on the curve break by the date the curve was reached. The
    server's money bound sums every channel at its factor (the rack, the van, deals and orders)
    with verified ad grants and booked fees.
10.12 **The company order (stage 5).** Lines for grades that at least two in-members can supply,
    and one "any grade" line for the rest, so that a company of one has a line. A member counts
    "in" by default only with an accepted action in the last seven days. The order's size is a
    content number tuned so that about three fifths of active companies reach 100 % (first value:
    half of the in-members' frozen weekly capacity; it replaces "25 h"). "Send to the company
    order" is refused beyond the member's counted cap ("Your part of the order is full") and pays
    the posted price of the delivery's step, with no premium. A cover is one per member per week
    and only for a shortfall of at most a quarter of that day's quantity.
10.13 **On the owner's phone.** A development row in Settings (region, and a jump to a played
    rung-4 yard) exists only in development builds and is checked absent from every release
    export; the project rules record the exception. The shop's entry is on the office's first tab,
    never on the Agreements page; the ad button hides while any card that shows a debt is open.

### 11. The bank's share, corrected (02:15; it replaces 9.8, 10.1 and 10.2)

The worked example showed the fault in 10.1 and 10.2: a share of the value the baler adds repays
the first loan (§69,120) only after 719 tonnes of bales, days of play, and one agreement at a time
would then shut the player out of the bank for most of the stage. A real lender that takes no
dates takes a share of ALL sales, and that is the rule:

11.1 **A fifth of every sale.** From signing, the bank takes s = bank.share (first value 0.2, tune
    0.15 to 0.25) of EVERY lot payment the yard receives, whatever the lot, until the total T is
    repaid. Nothing else repays (not cash in hand, ad rewards or packs), there is no date and no
    button to repay, and cash never goes below zero. There is nothing to dodge: every sale counts.
11.2 **One agreement at a time in stage 2.** Later, all agreements together never take more than
    bank.share of a payment: they are collected one after another, oldest first. (It replaces "at
    most 40 %".)
11.3 **What may be financed** stays as ruled: a works plate that earns, priced at least half an
    hour of I; the bank pays at most four fifths of the price and at most min(2 h, 0.15 x tau) x
    I; a flat charge of 8 % fixed at signing.
11.4 **The card's line:** "A fifth of each sale goes to the bank until §69,120 is repaid. No date."
    Every ticket while an agreement is open: "Paid §x · to the bank §y · to you §z".
11.5 **Aims.** The sum taken equals T exactly; cash never below zero; a tick equals a jump with an
    agreement open; with an agreement open no bought load nets a loss at any rung (the first
    yard's loads: the farm's skip, bought at §958 and worth §1,320 prepared, nets +§98 at a fifth;
    the demolition skip, §1,842 and §2,689, nets +§309): this aim sets the share's ceiling; the
    first loan (the baler, §69,120) is repaid within about four hours of the yard's running; a
    bot that always finances reaches rung 5 at most a tenth sooner than one that never does.
11.6 The stage-3 advance and the stage-4 site loan follow the same rule (a share of every lot
    payment; for the site loan, of that site's payments).

### 12. The engine step, after the specification's critics (03:20)

The rulings G1 to G3 (crew trips grouped), I1 to I6 (rated income) and H1, D1 in
`notes/engine2-LEAD.md` are part of this ruling. In short: a tick equals a jump exactly, and
grouping may move the three-day tables by at most 2 %; rated income is NET, counts the one truck
once (as a time budget shared by the partners), is bounded by what feeds the yard, and never reads
a switch the player can flip (it assigns material to machines by margin, best first; this replaces
10.6's "lowest margin"); its gate is measured at usual prices and counts stock and what a bank
took.

### 13. After the critics of stage 2's specification (03:35)

Four critics read stage 2's specification (78 findings; each with its ruling in
`stage2/critics-ruled.json`; the writers' seventeen points in `stage2/LEAD.md`). Where they change
this ruling:

13.1 **A tagged thing's owner is decided by sight** (it replaces 10.10's "while the boss is in the
    yard a tagged thing is his"): it is the boss's only while he is within sight of it and a slot
    of the yard sale is free; otherwise yard hands rack it within their load while a slot is free,
    and crews cut it when none is. Tags exist only from rung 3.
13.2 **"The second session"** everywhere means: the first away card from an absence of at least
    thirty minutes has been closed. The shop's rows, its Settings rows and every ad button are
    gated on that one stored moment, so nothing of money or ads can appear in the first hour.
13.3 **Nothing expires.** The crate waits for the boss for ever; no countdown, no hand-over.
13.4 **Safety and the trade.** A car that still holds its fluids is never tipped or lifted by the
    magnet; batteries come in a closed box; the public stays in a railed bay by the gate and pays
    at the rack; the lead line's people wear respirators; a furnace is charged only from covered
    bays; filter dusts go where the trade sends them.
13.5 **Every plate and recipe pays.** At usual prices, after reagents, each nets at least a
    twentieth more than its input (a content check).
13.6 **The shop in the shared list.** Products sit in the game's shared product list with the
    existing kinds for looks and No ad videos and one new shared kind for hours of income; what is
    owned is read from the shared entitlements.
13.7 **Children.** A player who gives an age under 13 sees no shop and gets child-treated ad
    requests; 13 to 17: no packs. Ad consent and tracking are asked only when the first ad button
    would show.
13.8 **Rated income is net** (stage2/LEAD.md L2); the ads are an away bonus of up to 15 minutes of
    I and three spot buyers of up to 4 (L3); the Trade Book moves to stage 3 (L15).

13.9 **The away bench.** Grouping brought six hours away from about 727 ms to about 175 ms of node
    CPU (the first hour's tables reproduce exactly; grouping moves six hours' sales by a
    thousandth). The gate for stage 2 is 250 ms; 150 and the aim of 50 wait for whole-cycle
    aggregation of the work per whole item. Run limits as built: yard hands 30 s, cutters 120 s.

### 14. After the attack on the engine step (05:05; it replaces G2 of section 12 and 13.9's run limits, and amends 10.4, 10.5 and E40)

An engineer who wrote none of it attacked the engine step (`attack/engine2/`; seven findings,
each with its ruling in `attack/engine2/ruled.json`). What held: a tick equals a jump on the whole
state; an absence cut into many passes equals one pass at a fixed rung; 934 actions pressed
inside runs broke nothing; mass is exact; absences and a clock set back pay once; an old save
loads; the state stays bounded. What did not hold, and what the lead rules:

14.1 **THE RUN IS THE RULE, IN SIGHT AND OUT OF SIGHT** (finding 1, blocking). As built, crew out
    of the boss's sight worked in planned runs (a yard hand keeps at one kind of trip for up to
    30 s, a cutter at one place for up to 120 s) while crew in his sight chose again by the first
    yard's order at every departure. Measured by the attacker: the unwatched yard supplied 6 to 17 %
    more tonnes over three days than the watched one. A yard that does better when nobody looks is
    wrong in this game. The lead does not go back to single trips (the bench would be about 290 ms
    and the lever that keeps time away cheap in later stages would be gone). Instead the run is
    made the rule of the yard from rung `group.fromRung` (3), whoever is looking:
    (a) A run starts at a departure where the first yard's order chooses the first trip (for a
        cutter: the first thing). It has a kind, a place, a destination and a start t0. At every
        later departure inside the run the member takes the next trip of the same kind from the
        same place to the same destination (the planner's own in-place choice; for a cutter the
        next thing at the same place in score order), if that trip would end no later than
        t0 + `group.handRun_s` (a cutter: `group.cutRun_s`). When there is none, or it would end
        later, the run is over and the first yard's order chooses again. The first trip always goes.
    (b) OUT OF SIGHT at a departure (no fresh boss within `reach.sight` of the start, the source
        or the destination), the rest of the run is planned there, claimed, with one dated end:
        as built. IN SIGHT the member makes the same run trip by trip: each trip an ordinary trip
        of the first yard (its own leg ends, claims only for the trip under way, landing at its own
        drop), chosen at its own departure by (a). Nothing a person can see is claimed ahead.
    (c) A run begun in sight whose member departs out of sight plans the REST of the run (to
        t0 + the limit). A planned run that comes into sight is opened as built, and its member
        goes on with the same run trip by trip (kind, place, destination and t0 are kept).
    (d) The run's kind, place, destination and t0 are kept on the member in the state: saved,
        optional, bounded; a save without them chooses by the first yard's order.
    (e) The rules that differ with presence on purpose (pieces only while the boss is in the yard,
        the floor's whole things, the foreman, the hand stripper) are untouched.
    (f) A switch for tests and the bots: `group.ahead` (true; false: every run is made trip by trip
        even out of sight). `group.fromRung` beyond the ladder: no runs at all (the first yard's rules).
    The numbers of `group` move into the content (schema and `salvage.content.ts`): fromRung 3,
    handRun_s 30, cutRun_s 120, ahead true.

14.2 **THE GATE, restated (it replaces G2).** Planning ahead is a shortcut and may move little:
    (i) from the same played state, one capped absence with `ahead` true against false: net within
    2 % on at least 8 of 10 states (five seeds, minute 60 and day 1); (ii) the bots' three days at
    the twice-a-day habit, `ahead` true against false: supplied tonnes and LIFETIME EARNINGS within
    2 % at day 1 and day 3 on at least 13 of 15 seeds (cash at a sitting's end is no measure: the
    bot spends it at different moments); (iii) no crew trip lost (mass, as tested). Reported, not
    gated: the same three days with no runs at all (`fromRung` 99): this is what the rule itself
    does to the yard from rung 3. The lead accepts that move as stage 2's baseline (ECONOMY E42):
    below rung 3 nothing changes at all, and stage 2's numbers are tuned on the new engine.

14.3 **THE MERCHANT'S ROUND IS NEVER LENGTHENED** (findings 1 and 6). `group.roundAway_s` and the
    opening of a long round are removed: the round is away `merchant.round_s` in every presence
    state. Measured by the lead on the bench's state at load 0.0: 186 ms without the long round
    against 199 ms with it: it saved nothing, moved net by about +2.5 %, and after an absence of a
    minute it printed a card on which nothing had been paid.

14.4 **THE CHECKS FOLLOW THE STATE, NOT THE PASS** (finding 2). Partners opening, the rung, rivals
    passed and the deal's offer are checked at every dirty instant away, as in live play. Goals
    alone keep a timer, and it is the state's: they are checked when the yard's clock enters a new
    minute since `goalsAt` (kept in the state). Nothing is forced at the end of an away pass. An
    absence cut into passes equals one pass ALSO when a rung is reached inside it.

14.5 **RATED INCOME IS GATED ON YARDS AS PLAYERS PLAY THEM** (findings 3 and 4). I is held against
    G (I5) also on states played with the normal price board (G still measured at usual prices):
    within 0.9 to 1.1 on at least 17 of 20 moments (ten seeds, minute 60 and day 1), and no moment
    outside 0.85 to 1.15. The carrying term is corrected until it does. The crucible counts in I
    only once it can run with nobody there (owned and poured at least once).

14.6 **HOLD SELLS ONLY WHAT THE NEXT LOAD NEEDS, AND STAYS ON** (finding 5; it amends 10.5 and
    E40). When, with the boss away, the merchant waits with nothing to take, the driver is idle
    with the truck free and the cheapest full skip costs more than the cash: the yard sets aside,
    from ONE held bay, just enough at today's price to pay for that skip (rounded up to the scale's
    step, at most what the bay holds), exactly as the Sell button sets a lot aside. The bay: first
    those whose word of the day is not low, then the one worth most. Hold stays switched on. The
    away card's line is unchanged. If the bots' three days with the day-word Hold then lose more
    than a tenth against the same days without Hold, the lot covers two skips instead of one.

14.7 **A TICK'S COST** (finding 7) is measured again on a quiet machine. The promise as it can be
    kept: median at most 0.2 ms, 99 of 100 ticks under 1 ms; a single tick over 8 ms that is not
    the runtime collecting garbage is a fault. No landing is spread over ticks (a tick must land
    what a jump lands).

14.8 **THE BENCH.** The gate stays 250 ms for six hours away (13.9), measured alone on a quiet
    machine after these changes. If 14.3 and 14.4 push it over, the saving is taken from the work
    per whole item (the index of pieces by pile the first engineer named), not from the rule.

14.9 **THE GATE OF 14.2, RESTATED AFTER THE FIX (06:10).** The first fixer built 14.1 (the run as
    the rule, watched or not) and measured the shortcut against it honestly (`notes/engine2-fixA.md`
    section 4). Two facts. (a) The yard is chaotic: the cutters' power changed by one part in a
    billion moves one absence's net by up to 4 % (7 of 10 states within 2 %). So no bound on
    single trajectories can be a gate, and 14.2's "within 2 % on 8 of 10 states / 13 of 15 seeds"
    is withdrawn. (b) On MEANS the shortcut costs about what the noise does: one capped absence,
    planned ahead against trip by trip, net -1.0 % (ten states; the noise alone -0.7 %); three
    days on fifteen seeds, lifetime earnings +0.5 % at day 1 and +1.0 % at day 3 (standard error
    about 0.8), supplied tonnes +1.4 % and +3.6 %. THE GATE NOW: over at least fifteen seeds (ten
    states for the single absence), the MEAN difference between `group.ahead` true and false is
    within 2 % for net and for lifetime earnings and within 5 % for supplied tonnes, with the
    noise floor printed beside it (the same runs with the cutters' power times 1 + 1e-9). It is
    met as measured. The rule's own effect (no runs against runs) is about a sixth more tonnes by
    day 3, watched or not (E42). What was tried to bring plan and trip-by-trip closer (landing at
    the yard's own instants, a fair share of claims, full loads only) made the gap larger and is
    not in the code. The machines' grouped segment is removed (it depended on sight and saved
    nothing).

14.10 **RATED INCOME'S GATE, RESTATED (06:20; it replaces 14.5's count and I5's band).** Measured
    after the fix (`fixB/income-after.txt`): G itself spreads by up to 8 % either way between seeds
    whose assets are identical, so "17 of 20 moments within 0.9 to 1.1" cannot hold for any I that
    is computed from assets. And on the engine as it now stands I is biased: about +10 % at rung
    3's entry, -14 % at day 1, -9 % at day 3 (crews in runs carry more than I's carrying term
    knows; levels count for too little). THE GATE NOW, at each named moment over at least fifteen
    seeds, on the flat board and on the normal board: the MEDIAN of I/G within 0.95 to 1.05; at
    least 13 of 15 seeds within 0.88 to 1.12; none outside 0.80 to 1.25. And I is MONOTONE: no
    purchase, hire or level lowers it (a test over every asset step on five played states). It is
    NOT met today. It is owed before any stage-2 rule reads I for money (the bank's limit, a
    pack's quote, an ad's cap): one calibration step of its own on the merged engine, by one
    engineer who owns `rate.ts` for it, with the bots' tables before and after.

14.11 **HOLD'S MEASURE COUNTS WHAT IS STILL HELD (06:20).** The second fixer built 14.6 and, when
    one skip a lot lost about a fifth, its fallback (a lot covers two skips). The day-word holder
    still shows 10 to 15 % less LIFETIME EARNINGS over three days than the same days without Hold,
    but part of that is stock it still holds at the end. The bound stays a tenth and is measured
    as lifetime earnings plus unsold stock at usual prices at the end, on at least 13 of 15 seeds;
    the bots' report prints both measures.

### 15. Paid packs: which purchase belongs to which quote (06:50; after the attack on the shared shop files; it replaces 10.8's date rule and amends the specification's 2.15.4 and 2.15.5)

An engineer who wrote none of it attacked the shared purchase plumbing (`notes/store-attack-money.md`,
tests in `attack/store/money.test.ts`). It held where it was meant to (one grant per id, the quote
on disk before the store's sheet, a kill between sheet, grant and save, restore, the four games).
It did NOT hold where a purchase is matched to a quote: by product and date only. That gave free
scrip from the account's older purchases (a kill at the sheet, then any old transaction; a clock
set back at a new save), took a waiting quote away from its approval, lost a paid pack after a
store error, and blocked a pack for ever when the device's clock had been wrong. The lead rules:

15.1 **No clock decides a grant.** A store date is never compared with the device's clock.
    `iap.createdMs` stays in the save as information only. (This replaces 10.8's "only
    transactions dated after the save was created".)
15.2 **One name for a purchase.** A transaction is known by the id the store's LISTING gives it;
    the result of a purchase is read through the same listing, never through a second id.
15.3 **A quote knows what was there before it.** At Buy, before the quote is made, the store asks
    the listing afresh for the ids of that product (`known`). If it cannot be asked on a real
    store, no sheet opens ("The store cannot be reached. Nothing was charged."). The quote keeps
    `known`. A quote is never granted with an id in its `known`, nor with an id in the ledger.
15.4 **A quote has a state**: OPEN from Buy until the sheet's outcome; WAITING when the store
    answered pending, or with any error that does not prove nothing was charged. Outcomes that
    withdraw the quote: the player cancelled; the store refused (not allowed, invalid, product
    unavailable); no sheet could open. The words: "Nothing was charged." only on those;
    "Waiting for approval" on pending; "The store has not confirmed this purchase yet. If you
    were charged, your scrip arrives when it does." on the others.
15.5 **Who gets an arriving purchase.** The sheet's own result: the id that is new against the
    quote's `known` goes to THAT quote (shown equals applied: the S on the row). Later arrivals
    (the listener, the check at start): an id not in the ledger goes to the OLDEST standing quote
    of its product whose `known` lacks it. With no such quote it belongs to another save and is
    not granted. While a sheet for a product is open, that product's arrivals are held and
    replayed when the sheet has answered. A withdraw names its quote; it never drops "the last".
15.6 **How long a quote stands.** At most ONE open quote per product: a new Buy withdraws an older
    open one (a purchase that did complete then arrives at the newer quote). A WAITING quote
    refuses a new Buy of that product ("Waiting for approval") for 24 hours of the device's clock
    (this clock use decides no grant); after that a new Buy gets its own quote and the old one
    keeps standing. Any standing quote is withdrawn when a FRESH listing (from the network), at
    least 72 hours after it was made, shows nothing new for it. Headroom counts every standing
    quote.
15.7 **Looks and No ad videos that wait for approval** (the salvage route only; the four games
    stay exactly as they are): the banner says "Waiting for approval", not that it failed, and
    the look is applied when its approval arrives, not at the next start.
15.8 **The small ones**: the check at start reads a fresh listing and is run once more after the
    listener is subscribed; one native listener per program, removed with its store; when the
    store's date cannot be read no device time stands in for it.
15.9 **Accepted until there is a server** (stage 5, with the boards): two devices on one store
    account. A purchase made on one can also be granted on the other only while that other holds
    a standing quote of the same product (a deliberate kill at the sheet, or an approval that
    waits): at most one grant a purchase a device. Bought scrip never counts on a board (2.5).
15.10 **Where it lives.** The shared store carries purchases and outcomes to the mode and holds
    arrivals back while a sheet is open; the MODE's shop rules own the quotes, their `known`,
    their states, the ledger and every decision above (pure functions of the save, tested there).
    The contract's `iap.pending` entries become `{id, product, S, I, atMs, known, state}`.

14.12 **THE ENGINE STEP AS IT STANDS (07:25, after the confirmation and the bots' REPORT7).**
    Confirmed by an engineer who wrote none of it: a tick equals a jump on the whole state with the
    boss walking in and out of sight of runs; an absence cut into passes equals one pass across
    every rung; mass, the save and 934 actions inside runs are clean; live play below rung 3 is
    bit for bit the first yard as merged; the long round is gone; the checks follow the state;
    Hold sells only what the loads need and stays on. The watched yard is no longer the poorer one
    (over an hour it carries 3 % more tonnes and earns 0.4 % more than the unwatched). Measured by
    the lead alone on a quiet machine: six hours away 218 ms (gate 250); one tick's median 0.13 ms,
    99 of 100 under 1 ms, the largest 4.8 ms. The bots (REPORT7): every beat below rung 3 as on the
    owner's phone; from rung 3 the runs lift sales (minutes 60 to 90: §2,020 a minute against
    §1,930 without runs); planned ahead against trip by trip within the gate of 14.9; runs against
    no runs +12 % tonnes at day 1 and +16 % at day 3 (E42).
    STILL OWED, each with its place: (a) rated income's gate and its monotony (14.10): a
    calibration step of its own in Phase A, before any rule reads I for money; (b) a yard hand's
    planned run tests sight only at its first pick-up spot (minor): the loop's engineer in Phase A;
    (c) Hold: the day-word holder ends three days a median 8.7 % behind the same days without
    Hold, counting the stock it still holds (10.8 % in lifetime earnings; the worst seed 14.8 %).
    The lead accepts this as the cost of holding in a yard that grows this fast: the bound is now
    "a median of at most a tenth, no seed over 15 %", and Hold is looked at again with stage 3's
    market, where prices swing further. No absence pays nothing (E40's promise): met.

15.11 **What section 15 left open, settled (07:55, after the specification's editor listed it).**
    (a) A quote's id is its product and the moment it was made (`<product>:<atMs>`), the same two
    the shared store names it by. (b) "Nothing new for it" at 72 hours: after the arrivals of a
    FRESH listing have been routed, every quote still standing that was made at least 72 hours
    before is withdrawn. (c) Words: the shared store's banner is the passing notice in neutral
    words; the pack's row carries the state in the game's own words for as long as the quote waits
    ("Waiting for approval"; "The store has not confirmed this purchase yet. If you were charged,
    your scrip arrives when it does."). (d) A cancel by the player shows nothing: no banner, no
    line. "Nothing was charged." is said only when the store refused or could not be reached.
    (e) A look or No ad videos that the store has not confirmed gets the same "not confirmed"
    notice as a pack (it is as true there). (f) A withdrawn quote emits `quoteWithdrawn {product,
    why: 'cancelled' | 'refused' | 'replaced' | 'expired'}`; for 'expired' the shop card shows one
    line until it is closed: "A purchase that was waiting never arrived. Nothing was added."
    (g) Whether a listing called fresh can still come from a cache when the phone is offline is
    checked on a store build (the device list in `notes/store-shared.md`); until then a quote is
    withdrawn at 72 hours only on a listing that the store itself answered.

15.12 **Three holes in 15.6, found by the confirmation of the shared files, closed (08:05).** The
    seams are confirmed ("stage 2's rules may be built on them"); the holes were in the lead's own
    rule, and each lost a PAID pack:
    (a) THE 72 HOURS ARE THE STORE'S, NOT THE DEVICE'S. A player who sets the clock three days
        forward while a parent's approval waits must not lose the pack. Every listing carries the
        store's own request time; a quote keeps the request time of the listing read at its Buy
        (`askedMs`); it is withdrawn only when a FRESH listing whose request time is at least 72
        hours after `askedMs` has been routed and the quote still stands. No device clock.
    (b) AN OPEN QUOTE IS NOT WITHDRAWN BY A NEW BUY. (A sheet paid, the app killed before the
        store listed it, a new Buy, that sheet cancelled: the first payment then found no quote.)
        A superseded open quote keeps standing, does not block Buy, counts in headroom, and goes
        by (a). 15.6's "at most one open quote per product" is withdrawn; instead at most
        `iap.maxStanding` (3) quotes of a product stand at once, and a further Buy is refused with
        the waiting words.
    (c) THE 24 HOURS of a waiting quote stay on the device's clock (they decide no grant), but a
        clock that reads earlier than the quote's `atMs` counts as elapsed, so a clock that was
        ahead never blocks a pack for long.
    (d) "OLDEST" IS THE ORDER IN WHICH QUOTES WERE MADE (the list's order), never `atMs`.
    (e) AT BUY THE LISTING MUST BE FRESH on a real store: if the store's cache could not be
        cleared and read anew, no sheet opens ("The store cannot be reached. Nothing was charged.").
    (f) A refused Buy's reason (the quote changed, a pack is waiting, no headroom) is the mode's
        to keep for its row; the shared store only says refused.
    The contract's `iap.pending` entry is `{id, product, S, I, atMs, askedMs, known, state}`.

15.13 **Last small points on paid packs (08:35, after the contract and the specification were brought
    into step).** (a) A quote's id is the contract's counter in the order quotes were made (`q<n>`);
    this replaces 15.11 (a): the shared store goes on naming a quote by its product and `atMs`, and
    "oldest" is the smallest counter. (b) The event is `quoteWithdrawn {product, atMs, why:
    'cancelled' | 'refused' | 'expired'}`: "refused" also when no sheet could open (the store could
    not be reached, the product is unavailable, the save could not be written), each with "Nothing
    was charged."; 'replaced' does not exist (15.12 b). (c) `iap.maxStanding` is fixed at 3.
    (d) A first-yard save that is migrated keeps `iap.sessions2At` null (the specification's 2.20;
    the answer N3 in its 11.3 is withdrawn): the shop appears after the player's next absence of
    thirty minutes or more. The development rows' prepared yards ("Start at rung 3", "Start at
    rung 4") have it set, so that the owner sees the shop at once on the phone.

### 16. The driver fetches what pays best (09:35; found while rated income was being calibrated)

The engineer who calibrated rated income found a fault in the FIRST yard's own economy
(`notes/s2a-engine2-income2.md` section 3): buying "Another skip" for the farm partner makes the
yard earn LESS once the demolition partner is open (seed 1, day 1, demolition at 2 skips: the yard
keeps §47,949, §43,129, §38,145 an hour with the farm at 1, 2, 3 skips; four of five seeds lose
4.5 to 7.7 % at minute 90). The driver fetches the skip that has been full longest and fits the
floor; the farm's light skips are full first and fit first, and they crowd out the demolition
loads, which net about twice as much a load. A purchase that makes the yard poorer is a fault
(the economy's first rule), and no rated income can be both honest and rising while the yard
itself falls. The lead rules:

16.1 **The rule.** From rung `truck.pickFromRung` (first value 3, so that the first hour as merged
    is untouched), the hired driver chooses by what a load nets, not by which skip was full first:
    (a) every open partner has a rated net a load, from the content alone: the load's contents at
        usual prices as they weigh in, less the load's price at usual prices;
    (b) he departs for the best-ranked partner that has a full skip the yard can pay for and whose
        load fits the tipping floor;
    (c) he does not depart for a lesser partner while a better-ranked partner has a full skip the
        yard can pay for that does not fit: he waits, and the floor's room is kept for the load
        that pays best;
    (d) equal ranks: the skip that has been full longest, as before;
    (e) a skip the yard cannot pay for blocks nobody (no dead end; Hold's rule 14.6 as it is);
    (f) the boss at the wheel fetches whatever he likes; a truck the boss left loaded is finished
        as before.
    Below `truck.pickFromRung` the first yard's rule stands, bit for bit.
16.2 **Rated income follows the same rule** in its replay of the driver, so that I rises (or
    stays) when a partner is levelled.
16.3 **The gates.** (i) Levelling ANY partner never lowers what the yard keeps: on fifteen seeds at
    minute 90, day 1 and day 3, each partner's level set by hand one step up: the MEAN change of G
    is not below -1 % and no seed loses more than 4 % (the yard's own noise). (ii) The yard under
    the new rule keeps at least what it kept under the old one, on means, at the same three
    moments. (iii) A tick equals a jump; an absence cut into passes equals one pass; mass; the
    first hour below the rung bit for bit. (iv) Rated income's band (14.10) measured again on the
    new rule, with the monotony restated: no single purchase, hire or level lowers I by more than
    5 %, and none where the yard's own G rises by more than I falls (what is left are artefacts of
    a replay that must cost under a millisecond; they are printed, not hidden).
16.4 **The first hour.** The bots also play the first hour with `truck.pickFromRung` 1 (the rule
    from the first trip) and print its beats beside the merged ones; the lead decides from that
    table whether the rule starts at rung 1 (as he will for the runs, LEAD L16).

### 17. No purchase makes the yard poorer (09:55; the critic of Phase A found the second case)

The critic of Phase A measured a second purchase of the FIRST yard that makes it poorer, far
worse than the farm's skips (section 16): buying the motor bench at rung 2 lowers what the real
yard keeps by about 30 % (seed 31: §33,946 to §23,016 an hour over a capped absence at usual
prices; a second state §31,067 to §22,254; the same with no runs, that is, on the owner's phone
today). The likely cause, to be measured before anything is changed: the first yard's order of
work sends yard hands to feed machines and to empty their trays BEFORE they clear the tipping
floor; in a yard bound by carrying, a machine whose work adds less than the hands' time it takes
makes the yard poorer. (The runs of 14.1 gained their sixth for the same reason: hands that stay
on the floor.) The lead rules:

17.1 **The aim, as a gate for this game from now on.** For every purchase, hire and level a
    player can make, from fifteen played states at each of minute 30, minute 60, minute 90, day 1
    and day 3, bought by hand one step at a time: the MEAN change in what the yard keeps an hour
    (G: a capped absence at usual prices, stock counted) is not below -1 %, and no seed loses
    more than 4 % (the yard's own noise). The bots run this walk in every report.
17.2 **The rule for the hands' order of work.** The engineer first measures where the bench's
    30 % goes (the hands' time by kind of trip, the floor's mass, loads, what is sold by grade,
    before and after the purchase), then builds the smallest rule that meets 17.1 and keeps every
    machine worth buying. The lead's first candidate, to be measured against at least one other
    (each trip valued in scrip a second and the best taken): WHILE THE TIPPING FLOOR IS MORE THAN
    HALF FULL, A YARD HAND CLEARS THE FLOOR BEFORE HE FEEDS A MACHINE OR EMPTIES ITS TRAY, except
    for a machine whose work at least doubles the worth of what it takes (from the content at
    usual prices). Whatever is built: one rule in every presence state; the first choice of a
    run (14.1), which then goes on as built; the rules that differ with presence on purpose stay
    as they are; a tick equals a jump; no dead end.
17.3 **A machine stays worth buying.** With hands enough for the floor each machine raises what
    the yard keeps: the table of G with and without each machine at two, three and four yard
    hands is printed; if a machine never pays at any crew a player can hire, its rate or its
    shares are a content fault and are reported to the lead.
17.4 **Rated income follows** the order as built (and the driver's rule of section 16); its band
    (14.10) and its restated monotony (16.3 iv) are measured again.
17.5 **From which rung, and the first hour.** Sections 16 and 17 fix the first hour too (the
    bench is bought in it). The engineer measures the first hour with both rules from rung 1
    (`truck.pickFromRung` and `crew.orderFromRung` 1). IF every beat before the first of the
    changed moments is unchanged, and the later beats can be brought back into their bands
    (rung 3 at 55 to 65 minutes; the storyboard's order) by the rung-3 tonnage alone, he sets
    both keys to 1, retunes that one number, and prints the hour's tables before and after
    (with the late hour's sales a minute: the aim of §2,000 at minutes 55 to 60 may now be met).
    IF NOT, both keys stay at 3 and the table goes to the lead. Either way the first yard's
    pinned figures that move are listed one by one.

16.5 **The rank is what a load nets for the step it loads most (12:25; it replaces 16.1 (a)).** The
    engineer built 16.1 as worded and measured it (`notes/dispatch-engine2.md` 3.3): the farm's
    fault is gone, but a DEMOLITION level now makes a cut-bound yard poorer (-8 to -9 % from
    minute 60 on the bots' yards): a demolition load nets 2.15 times a farm load, but it needs
    1,200 s of cutting against 433 s, so a cutting second earns less on it (0.58 against 0.75).
    "No ranking from the content alone can be right both ways": the lead's (a) was wrong. THE
    RANK NOW: a load's rated net divided by the time it costs the yard's slowest step for it: the
    greatest of the truck's round trip, its cutting seconds over the cutters the yard has, and
    its carrying seconds over the yard hands it has (rated income's own per-load terms, from the
    content and the yard's ASSETS; cached on rated income's asset key; never a switch a player can
    flip, never recent sales). 16.1 (b) to (f) stand as built. The engineer measured this ("rate")
    before the ruling allowed it: the demolition level passes from minute 60 on, and four steps
    are left at minute 30 or on one seed, at the size of the yard's own noise. It is built in the
    step's one pass of fixes, with the walk of 17.1 printed again; rated income's replay follows
    the same rank.
16.6 **What a player is told.** A truck that stands while a skip shows ready, and a machine that
    waits while the hands are on the floor, each get one line where the player looks: on the
    waiting skip's card and label ("The driver is keeping the floor for a better load"), on the
    machine's card ("The yard hands are clearing the floor first"). The words' and screens'
    engineers build them in Phase C; the rules give the card the reason now.
16.7 **The measurement over three days is owed again** once the bots know stage 2: today the
    bots follow the goal card into stage 2's list, which they cannot play yet, and three days
    earn half of this morning's with the old rules too (the engineer's 5c). The comparison of new
    against old over three days (16.3 ii) is run by the bots' engineer after the join, on bots
    that play the stage.

16.8 **The driver's rule must beat the yard hands' rule alone, or it goes (12:50, after the
    independent check).** The check measured on ten new seeds: the hands' rule (17.2) alone
    raises what the yard keeps by about a tenth on every seed; the driver's rule as first built
    (net a load, waiting for room) then LOSES 10 to 14 % on every yard with one level-2 cutter
    and 13 to 15 % over the bots' three days. So in the one pass of fixes: (1) measure the walk
    of 17.1 with the hands' rule ALONE (`truck.pickFromRung` beyond the ladder): if a farm level
    no longer lowers what the yard keeps there (mean not below -1 %, no seed below -4 %), the
    driver keeps the first yard's rule (the key stays beyond the ladder; the code stays as an
    option for later stages) and 16.1 and 16.5 are not shipped; (2) if the farm's fault is still
    there, build 16.5's rank and ship it ONLY if, on the same states and over the bots' days, it
    keeps at least what the hands' rule alone keeps (mean within -1 %, no seed below -4 %) and
    clears the farm's and the demolition's rows; if neither (1) nor (2) holds, ship the hands'
    rule alone and report the farm's row to the lead with its numbers. (3) The bench in a yard of
    two cutters and two hands (-1.7 to -1.9 % on means, the worst seed -6.4 %; it was -26 %): one
    honest try in this pass; if it stays, the lead accepts it as within the yard's noise at that
    crew and the bots watch the row. (4) Rated income: the band again on the rules as shipped;
    the feed term as the check proposes. (5) NOT changed: rated income never reads a switch (the
    crucible's "Take from bays"): a player who turns it off earns less and gains nothing (I4).
    (6) For the bots' tuning, not this pass: a farm skip beyond the third adds nothing on any
    seed: no level a player can buy may add exactly nothing (a lower top level or a rising fill
    rate).

16.9 **How the two purchase faults ended (13:35, after the one pass of fixes).** THE YARD HANDS' RULE
    ALONE SHIPS (17.2 as built: while the tipping floor is more than half full a yard hand clears
    it before he feeds a machine or empties its tray; a FULL tray keeps its place), from rung 1,
    with rung 3 at 28.5 t. The hired driver keeps the first yard's rule (`truck.pickFromRung`
    beyond the ladder); the rank of 16.5 is built and stays in the code as an option, not
    shipped: on the same states it keeps what the hands' rule alone keeps and fixes the demolition
    level, but it buys nothing the simpler rule does not, and a truck that stands beside a ready
    skip is exactly what confuses a player (the owner's review, point 5). Measured as shipped on
    fifteen seeds: against the old rules the yard keeps 11 to 18 % more on means; the purchase walk
    of 17.1 passes every row on means (the farm level at minute 30: -0.9 %, one seed -5.4 %; the
    bench at two cutters and two hands: -1.2 % at minute 60, -0.8 % at day 1: both accepted as at
    the yard's noise, watched by the bots in every report); every beat of the first hour up to the
    first pour is unchanged to the second; sales at minutes 55 to 60 reach §2,000 a minute on 5 of
    15 seeds (none before). 16.6's line for the skip is not needed; the machine's reason (the yard
    hands are clearing the floor first) is in the card's data for Phase C's words. Still owed, by
    the join and the bots: rated income's terms for the van and the Yard sale (its medians are
    0.90 to 0.92 from rung 3 until then); the three days on bots that play the stage (16.7); an
    hour away is now 0.81 of an hour played (E19 asks at most 0.8: the bots' tuning looks at it).

### 18. The owner's first review of the yard on the phone (13:55; the ruling is `owner1/RULING-owner1.md`)

The owner played the first yard on the phone and wrote seven points (OWNER.txt). The diagnosis
(`notes/owner1-diagnose.md`) found that each was real and why: (2) between his hire and the
cutter's the helper stood idle 70 to 86 % of the time, on the platform scale, because the first
yard's rules kept him from everything the boss had cut ("never from the heaps") and from whole
things while the boss was in the yard, and the screen said nothing; (5) the trial load cost §150
right after the truck's purchase (refused for cash on a fifth of seeds, with one toast), and the
goal was only done on the weighbridge, which nothing pointed at: a player who parked and stepped
out was stuck until a driver was hired; (7) the screen drew the truck's park phase along the whole
lane trip: 140 to 290 m/s through the yard with jumps of up to 285 m; the driver tipped on the
floor's centre, on top of the people working there; purchase vans drove through the office; and
the trucks' real speeds (10.8 to 21.6 m/s) were no yard's; (1) the rules' frame was built twice or
more at each of about twenty store changes a second. The ruling in one line each: what the boss
cuts and leaves, the yard hand carries; nobody waits on the scale; a waiting worker says why; the
trial load is free and the goal follows the load step by step; every phase of a trip has its own
path; no vehicle exceeds 4 m/s inside the fence (the lane pays for it: no table moves); arrivals
follow the drive line; the frame is built once. And `release.stage` keeps stage 2 dark on the
owner's phone until its screens exist, so that these fixes, the cheaper time away and the yard
hands' order of work can go to the phone now.

#### 18.1 The ruling on the behaviour points (13:55; `owner1/RULING-owner1.md`, copied here so that the repository holds it)

The owner's words are in OWNER.txt and at the head of every step. The diagnosis is `notes/owner1-diagnose.md`
(read it whole: every mechanism, script and number below is from it). This file says what is built. Where it
differs from the first yard's specification (2.6's "never from the heaps", P11, the trial's price, the truck's
speeds), this file is right: the specification was measured for its timings, never for what a player sees.

##### Point 2: a helper who stands still (he was idle 70 to 86 % of the time between his hire and the cutter's)

H1. WHAT THE BOSS CUTS AND LEAVES, THE YARD HAND CARRIES (the diagnosis's V1). A yard hand may carry cut
    pieces that lie beside a thing in a heap's bed when the boss is more than `crew.hand.leaveM` (3 m) from
    them; they come after the tipping floor in his order of work. Pieces within 3 m of the boss stay his. The
    chalk circles stay as they are (pieces in a circle first).
H2. A WHOLE THING AT THE DROP-OFF WHEN HE WOULD OTHERWISE STAND (V2): only when nothing else is offered and
    the boss is beyond `reach.sight` of it.
H3. THE CABLE BUNDLE GOES TO THE POWERED STRIPPER (V3, a bug against P11 as written).
H4. "IN THE YARD" MEANS INSIDE THE FENCE. A boss driving on the lane beyond the gate is away for P11 and E35
    (today a boss who sits at the farm keeps the hands off whole things and the yard earns nothing).
H5. NOBODY WAITS ON THE PLATFORM SCALE. A yard hand or cutter with nothing to do walks to a waiting place
    beside the scale house (content `map.points`: places for as many crew as the yard can hire, clear of the
    scale, the bays' fronts and the drive line; the checker knows them) as an ordinary dated leg, and waits
    there. He is offered work again at every event AND at every presence sample while anybody waits (the boss
    walking away from a heap frees its pieces: nobody may stand until "something else happens").
H6. HE SAYS WHY. The frame's crew entry carries `idleWhy`: 'nothing' (nothing in the yard to carry or cut),
    'uncut' (only things that need cutting or a tool the yard lacks), 'yours' (only pieces at the boss's
    feet), and for a cutter 'tool' (the next thing needs a tool or a tier he has not). The rota's row carries
    the same. Words (three text files; the words' check at 0 findings), at most 22 characters each, plain:
    "Nothing to carry", "Waiting for cut pieces", "Leaving those to you", "Needs the torch" (the tool's name by
    key). The world draws them as a small bubble over a waiting worker (the world's engineer).
H7. THE FIRST HOUR IS MEASURED AGAIN. H1 to H4 make the hour faster (the diagnosis: about 9 % more earned by
    minute 60, rung 2 two minutes earlier, rung 3 three). Bring every beat back into its band of
    docs/design/yard-bots.md by the rung-2 and rung-3 tonnages ALONE (`ladder.rung2.t`, `ladder.rung3.t` and
    their copies in `rungs`); if a beat cannot be brought back by those two numbers, leave it and report it
    with the table. Then print: the yard hand's idle share between his hire and the cutter's (the aim: under
    a third on every style and seed, and never a wait of over 30 s while cut pieces lie anywhere), the
    purchase walk of ruling 17.1, the hard promises, a tick against a jump.

##### Point 5: the farm's trial container

T1. THE TRIAL LOAD IS FREE at the hook (`partners.partnerFarm.trialPrice` 0; the farm lets the first one go
    on trust). It can never be refused for cash.
T2. THE GOAL FOLLOWS THE LOAD. "Fetch the farm's trial load" shows the step the player is at, and the chevron
    points at it: to the truck (not driving), to the gate and the farm (driving, no skip), "Keep still: hooking"
    (at the skip, the ring running), "Drive onto the weighbridge" (a skip aboard, not weighed: the chevron on
    the weighbridge), "Tip it on the floor" (weighed: the chevron on the floor's stop). Stepping out with a
    skip aboard that is not yet weighed or tipped shows the step's words as a toast and the chevron stays on
    the truck. The same steps serve every later load the boss fetches himself.
T3. THE BOSS HOOKS IN 4 SECONDS, not 10 (`truck.bossHandle_s` 4; the hired driver's `handle_s` stays 10, so
    his trip and every measured table stay). The ring is the rules' (the act's dated end).
T4. A REFUSAL STAYS ON SCREEN for as long as it holds (the act stays `refused.<why>` and the frame carries the
    reason and its figure: "Needs §x more", "No room on the floor"): the screens show it on the skip's plate
    and by the one button until it ends, not as one toast.

##### Point 7: the vehicles

V1. EVERY PHASE OF A TRIP CARRIES ITS OWN PATH (frame.ts; one function in positions.ts shared with the rules'
    distances): out: park, turn, line, gate, lane, skip; hook: standing at the skip; back: skip, lane, gate,
    line, weighbridge; weigh: standing on it; tip: weighbridge to the floor's stop; park: the floor's stop,
    turn, park. No phase is ever drawn along another phase's path (today the park phase draws the whole lane
    trip in a second and a half: 140 to 290 m/s through the yard, with jumps of up to 285 m: this is what the
    owner saw). A test walks every phase of every partner's trip: the drawn point is continuous across phase
    switches (no jump over half a metre) and never faster than the phase's own speed.
V2. THE DRIVER TIPS AT THE FLOOR'S STOP on the drive line (`driveLine.stops.floor`), as the boss does, never
    on the floor's centre where people work.
V3. A YARD'S SPEED IN THE YARD. Inside the fence no vehicle moves faster than `truck.yardV` (4 m/s); beyond
    the gate the lane's speed is raised so that the TOTAL of every trip, at every driver's level and with the
    foreman's boost, is what it was to the millisecond (a test over every level): no measured table moves.
    The boss's own truck: at most `truck.bossYardV` (4.5 m/s) inside the fence and `truck.bossV` 11 on the
    lane, so that the first drive's beat stays within five seconds of today's.
V4. WHAT ARRIVES, ARRIVES BY THE DRIVE LINE: the purchase van, the machine flatbed and the merchant's flatbed
    follow the line to the stop nearest their place and set down there (the thing is then at its place, as the
    rules date it); no drawn path crosses a solid; no jump at set-down. The map's checker refuses an arrival
    path through a solid.
V5. NOBODY GIVES WAY BY RULE (dated legs stay dated). The world draws the nearer of two in front; the review
    looks again once V1 to V4 are in.

##### Point 1: what the rules hand the screen

L1. `frame()` is computed ONCE for a state and shared (a memo by the state's identity in frame.ts; the hud,
    the rings, the hints and the labels read the same object), and reuses its unchanged parts (things and
    pieces change only at events).
L2. A presence sample that changes nothing but the boss's own position pushes no new scene to the screen (the
    boss is the screen's own).
The screen's side (who reads `frame()` and when; the truck's smoothing) is the world's engineer's.

##### The switch: stage 2 stays dark on the owner's phone until its screens exist

S1. Content `release.stage` (1 or 2; absent means 2, so every test and frozen content keeps working; the real
    content says 1 until the lead changes it). At stage 1: the works never open (no works layer, no stage-2
    grade, thing, partner, shop item, bay, lot, rack, plate; the stage's goal list is never offered); the
    ladder's top is rung 3 (rungs 4 and up shown padlocked, as the first yard showed them); no shop row, no
    pack, no ad offer, no away bonus, no letter, no Agreements tab, no bank; the away caps as the first
    yard's. What stays ON, because it is the first yard's engine now: runs from rung 3, the yard hands' order
    of work, Hold's release, the cheaper time away, everything of this ruling.
S2. Tests: three days of bots at stage 1 touch no stage-2 state (works empty, no agreement, the shop's state
    as created, lots and reuse undated, no stage-2 event, no stage-2 card or row from any frozen state); a
    save made at stage 1 loads at stage 2 and opens the works at its first live instant at rung 3 or more; the
    first hour at stage 1 equals the first hour at stage 2 below rung 3, bit for bit.
S3. Also in this pass: the test fix2a.test.ts "backFieldOpen is heard exactly once" (its mock of works.ts is
    bypassed: repair the test so that it tests the rule on the real opening path).

#### 18.2 After the review of the fixes (about 16:45): a player's findings and the lead's rulings

A player and a phone engineer who built none of it looked at the result. The player's verdict was
"close, not ready": four things would still look broken in the first ten minutes. One pass of fixes
followed (three engineers: world, hud, rules). Each finding and its ruling:

- Finding 1 (blocking, world): My own worker vanishes. Standing at the tool rack only a helmet tip shows above the roof; walking near the office he is gone for minutes at a time.
  RULING: A PLAYER ALWAYS SEES HIMSELF. Whenever the boss's position lies under a roof or canopy as it is drawn (the tool rack, the office, the scale house, any shed), that roof is drawn see-through (about a third of its ink, eased over a fifth of a second) for as long as he is under it; crew under a roof are drawn the same way through it. No walkable ground changes. A test over every roofed place of the map: with the boss at its centre and at each edge his sprite is not fully covered. Pictures at the tool rack and the office, looked at.
- Finding 2 (blocking, world): The merchant's flatbed drives through yard hands who stand on the weighbridge and the drive line. This is the owner's 'running people over', still visible at the right speed.
  RULING: PEOPLE STEP ASIDE, on the screen only (dated legs stay dated: the lead's V5 stands for the rules). While a moving vehicle's drawn body would overlap a drawn person (the vehicle's width plus 0.4 m either side, over the next second of its dated path), that person is drawn stepped off the vehicle's path to the nearer side, eased out and back, by at most 1.6 m; his rules position is untouched and he arrives where and when the rules say. A person who STANDS on the drive line or the weighbridge while waiting is a rules fault: report in requests.md where the rules made him stand (the rules' engineer moves the waiting places). A test: the played minute-30 state run for five minutes of frames: no frame in which a person's drawn centre is inside a moving vehicle's drawn body.
- Finding 3 (blocking, rules): Stopping beside the farm's sign, a truck's length short of the skip, does nothing and says nothing. The goal still reads 'Drive out to the load' and only a chevron sits on the skip. The preview's own scripted driver stopped there and went home empty.
  RULING: THE WHOLE SITE IS THE STOP. A truck that stands still anywhere on the partner's site (from 6 m before its sign to 6 m past its last skip, the lane's width; content: derived from the site's own points, checked by the map's checker) hooks the full skip: the 4 s ring starts wherever it stands. Outside the site but within 15 m of it and standing still, the goal's step reads 'Pull up to the skip' and the chevron stays on the skip (a new step; words within the goal line's box at font scale 1.3). Also the preview's scripted drive route stops inside the site. Test: the reviewer's stop at lane x 236 hooks; a stop 10 m short shows the step and does not hook.
- Finding 4 (blocking, hud): At 844, after the hook the disc went blank and dim while I was still in the truck, all the way home, during the weigh and during the tip: no 'Step out'. At 667 the same drive kept 'Step out', so it happens only sometimes.
  RULING: THE DISC NEVER GOES BLANK IN THE TRUCK. The one button's mode comes from the rules (the frame's truck: the boss is at the wheel) and not from the world's own driving flag alone: at the wheel it always reads 'Step out', also at the truck's park (finding 11: never 'Open' while in the truck; a place's card opens only on foot). Find where the flag dropped after the hook at 844 and say it. A test over a whole scripted trip: every frame at the wheel the disc's label is 'Step out'.
- Finding 5 (important, rules): With the boss standing at the drop-off holding a full load, the yard hand waits beside the platform scale for about 80% of two minutes under 'Leaving those to you'. That is the owner's frozen-helper picture with a label added. 'Those' is unclear, and nothing tells me to move.
  RULING: THE HELPER CARRIES UNLESS THE BOSS IS ABOUT TO. H1 and H2 of the ruling change: a cut piece in a heap, and a whole thing at the drop-off that the yard hand may carry, are the boss's ONLY while all three hold: he is within crew.hand.leaveM (3 m) of it, his load has room for it, and he has moved or worked within the last crew.hand.leaveS (5 s). Otherwise the yard hand takes it (H2 no longer waits for the boss to be beyond sight, and no longer only when nothing else is offered: whole drop-off things come in his order after the heaps' pieces). The reason 'yours' is given only under those three. The waiting places move to the scale house's wall (content points; clear of the scale's plate, the bays' fronts and the drive line; the checker), and nobody ever waits ON the drive line or the weighbridge (the world's engineer will tell you in requests.md if he sees it). Then the first hour again with the bots (15 seeds, 2 routes): bring rung 2 and rung 3 back into their bands by their two tonnages alone, print the yard hand's idle share between his hire and the cutter's (aim: under a third on the median of every style) and the longest wait with something he may carry lying anywhere (aim: under 15 s), the purchase walk, the hard promises, a tick against a jump.
- Finding 6 (important, world): The 'Keep still: hooking' pill lies on the skip's label and hides its last lines ('+ 2 more · Net 540 kg'). At 844 I saw no ring in the three frames where the pill showed; at 667 the ring is drawn clearly.
  RULING: The hook's words stand BELOW the truck (never on the skip's label), and the ring is drawn at 844 as at 667 (find why three frames at 844 showed none: its size, its place behind the label, or its start). Pictures at both sizes during the 4 s.
- Finding 7 (important, hud): Standing between the tool rack and the weighbridge, the card that opened with the tool rack's list was titled 'Weighbridge'.
  RULING: A place's card is titled from the place whose rows it shows (the tool rack's list was titled 'Weighbridge' when opened between the two). Find the cause (the card's ref against the nearest place) and pin it with a test at the reviewer's two positions.
- Finding 8 (important, hud): The first view lists sales worth about §106,000, yet NET reads +§21,580. The load costs (Hob's Farm Clearance, 43 loads, -§41,971) appear only after scrolling, so the first sight looks like the numbers do not add up.
  RULING: THE AWAY CARD ADDS UP AT FIRST SIGHT. The fixed foot shows, beside NET, one line 'Sold +§x · Loads −§y' (and the bank's share when there is one), from CardData's own totals, so that the first view explains the net without scrolling; both sizes, font scale 1.3.
- Finding 9 (minor, hud): The goal card repeats itself: 'Tip it on the floor' and then '▸ Tip it on the floor'.
  RULING: Hide the goal's step line when its words equal the goal's own.
- Finding 10 (minor, rules): 'Net 540 kg · §0.00' and a red 'Bought for §0.00' read as if the load is worthless or broken.
  RULING: A FREE LOAD SAYS FREE. The trial load's skip label and its weighbridge ticket say 'Free trial load' (label) and 'Free: the farm's trial' (ticket line) instead of §0.00 and a red 'Bought for §0.00': the ticket's data carries a flag the screens print (tell the hud's engineer its name in requests.md); words in the three text files, the check at 0 findings.
- Finding 11 (minor, hud): Sitting in the truck at the park the disc reads 'Open' (the park card), and the truck put me in the driver's seat while the shop card was still open.
  RULING: With finding 4: at the wheel the disc reads 'Step out' everywhere; the park's card opens only on foot; entering the truck closes an open card first.
- Finding 12 (minor, hud): 'Washing machine · signed in · gate drop-off' toasts keep coming while I am at the farm, 180 m away.
  RULING: Drop-off toasts ('signed in') are held while the boss is beyond the gate and shown as one line when he is back inside ('{n} things signed in at the gate'), if any.
- Finding 13 (minor, world): Two empty dashed circles with an X near the weighbridge look like unfinished art. At m5 the ghost-thumb hint sits on top of the stripper bench.
  RULING: An EMPTY chalk circle is drawn faint (a quarter of its ink); the ghost thumb's hint never sits on a machine or a place's label (move it to free ground near the stick's rest).
- Finding 14 (minor, hud): The crane's sign reads 'Cinder Lane Yard · 2.8 t supplied' while the line below reads 'You: 9.01 t supplied'. They look contradictory.
  RULING: The rung sign's own line reads 'Opened at {t}' (the rung's tonnage) so that it does not contradict 'You: {t} supplied' below it; words in the three text files.
- Finding 15 (important, rules): A farm level at minute 90 lowers what the yard keeps by 3.8 % on means (it was 0.0 after the yard hands' rule alone).
  RULING: not now (the lead: it goes to the bots' tuning with stage 2: a lower top level for the farm's skips or the driver's rank of ruling 16.5; print the row again after finding 5's change so that the lead sees whether it moved).

What the one pass measured (15 seeds, four styles): the yard hand's idle share between his hire and
the cutter's fell from 48 to 63 % to 44 to 52 % (the aim of under a third is NOT met: about 60 % of
what remains is "nothing cut yet", which no rule about his order of work can change before a cutter
is hired); the longest wait with something he may carry lying about is over 15 s on 6 of 60 runs
(worst 26.5 s). Rung 2 moved from 2.8 t to 3.0 t and rung 3 from 31.5 t to 32.2 t to keep the normal
hand's beats in their bands (rung 2 at 13:12, rung 3 at 59:27); the slow hand's rung 3 is in band on
7 of 15 runs (it was 12): the bots' tuning with stage 2 looks at it. No hard promise broke on 144
runs. Finding 15's row (the farm's level at minute 90) reads -3.33 % on means: left for that tuning.

#### 18.3 Who sits in the cab (the lead, about 17:45)

Behind point 5 there was a second cause, found while closing the fixers' requests. The screen and
the rules each decided for themselves whether the boss sits in the truck: the yard view flips into
the cab the frame the player steers into the truck; the rules seated him only when a presence
sample lay within `truck.enter`, the door was armed again (`truck:out`) AND no act of his was still
running. A pick-up's ring beside the truck (pieces on the floor, a tray) kept him on foot in the
rules while the screen drove away: a truck the rules thought parked, which hooked nothing, until a
hired driver took that parked truck on trips: the owner's words exactly. Samples are also coalesced
after a stall of the JavaScript thread, which could leave the two doors armed differently; and the
other way round the rules could seat him (the truck pulls up beside him) while the screen kept him
on foot, the rules' truck then following a walking man.

RULING: THE TWO NEVER DISAGREE ON WHO DRIVES, AND WHAT THE PLAYER SEES IS WHAT THE RULES HAVE.
- The screen's cab flag is the player's getting in: a presence sample that says "at the wheel" seats
  the boss whenever the truck stands free (owned, nobody at its wheel, on no trip, not on its way
  in), cancelling the act that was running (work keeps its progress) and without asking whether the
  door was armed. The sample's place stays clamped as any sample's (R7), so the truck goes no
  faster than a truck. The rules' own walk-in stays for a sample without the flag (the truck that
  pulls up beside him) and for the bots, which never send the flag unseated: no measurement moves.
- The screen follows the rules back: when the rules seat him, the yard view puts him in the cab;
  when the truck leaves with the driver before the rules heard he was in it, he is set down; at a
  snap (a reload, time away) the view takes the rules' word both ways (time away at the wheel gives
  the truck to the driver: he is on foot when the player returns).
- Step out: the view tells the rules exactly what it did (at the wheel, still, the truck's place
  and its heading, one of eight) and waits for their answer; if they refuse, he is back in the cab.
  The truck no longer turns to an old heading when he steps out.
- The screens' "driving" flag is said by the frame loop at every snap; the shell no longer resets
  it on mount (that reset could land after the first frame and blank the button at the wheel).
Tests: `src/engine/salvage/seat.test.ts`. Seen in the preview: the first drive from the park by the
gate to the farm, the hook, the weighbridge, the floor; and the same with a Step out at the gate, a
walk to the weighbridge and back into the truck.

#### 18.4 The confirm before the merge (about 18:05): a player and an attacker of the cab change

A player who built none of it watched point 5 work twice end to end (the first drive; the same with a
Step out at the gate and back in) and the away card at both sizes: READY on points 5 and 6, nothing
blocking; points 1, 2, 3, 7 and the button at 667 were not looked at again in that pass (the earlier
reviewers' pictures and the tests carry them). An attacker read the cab's handshake frame by frame
and ran the engine: SOUND, nothing blocking, two important and six minor findings. Rulings:

- THE AWAY CARD STAYS (important, a regression of the one pass): the effect that closes an open card
  when the wheel is taken closed the "while you were away" card of a player who had left the phone
  at the wheel. The wheel now closes only a PLACE's card. And where the boss is after time away at
  the wheel: with nobody to take the truck it waits where he left it and he comes back at its wheel;
  when a hired driver takes it home with a skip aboard from beyond the fence, the boss rides with
  him and waits where a fresh yard starts (he is not left on the lane).
- ONLY AT THE DOOR (important before stage 5's boards; today only a tampered screen could use it):
  the cab flag seats the boss only when the sample's clamped place is within `truck.enter +
  truck.rearm` of the free truck. The screen sends the entering sample at the truck's own place and
  never drops it (it goes ahead of any sample still waiting), so an honest entry is always at the
  door whatever stalls happen. A flag from farther off seats nobody and moves no truck.
- Step out takes the screen's place for the truck only within a sample's slack of the presence, and
  its heading always (one of eight).
- The truck's heading: at the wheel every sample carries it, so the rules' truck faces as the drawn
  one (after a reload or time away it no longer snaps to an old heading); at Step out the drawn
  angle stays when it rounds to the rules' heading.
- A remount just after Step out: the door is disarmed while he stands beside the truck.
- A second tap on the disc during Step out: the rules hear the Step out before the screens' flag
  falls.
- The same sample twice is the same object also when its cab flag cannot be honoured.
- The player's finding (important): on foot beside the truck after Step out the disc is blank while
  the goal says "Get in the truck". RULING: the one button GETS IN: within reach of the free truck
  the disc reads "Get in" and a press seats him (the walk-in stays). Not in today's update (new
  words, a new act of the button, pictures): it is the first item of the next one.
- Minor, not now: the truck left slanted across the gate is drawn over the hedge; the preview's
  scripted thumb weaves at the farm's skip (a tool).
Tests: `seat.test.ts` (10). Seen again in the preview after these changes: route `cab`, 844 x 390.

#### 18.5 The second update for the phone (26 November, evening): what was built, its review, the rulings

BUILT after the first update went out (main 60db4fd): THE ONE BUTTON GETS IN (the rules' frame says
`boss.button` 'getIn' when the boss is on foot, the truck stands free, no away card waits and he is
within `truck.enter + truck.rearm` of it and nearer it than the point of the place whose card would
open; order: Step out, Get in, Open; the yard view seats him on the press and sends the entering
sample at the truck's place); NO FROZEN SCREEN ON RETURNING (the mode hands the store its engine
wrapped: an absence long enough for the away card waits; a counting card in the away card's frame
is painted first, the pass runs once two frames later, the away card takes its place; ticks, the
presence and every action are held meanwhile); FEWER STATES WHILE HE STANDS (the yard view sends a
standing boss's sample every 0.3 s instead of 0.1 s, and at once when steering starts or stops, when
he gets in or out and when his standing time reaches the work delay: nothing a player does starts
later); fewer allocations per frame.

A LATE PHONE IS NOT AN ABSENT BOSS (the lead): `feel.staleS` 0.6 -> 1.5 s. After a stall of the
JavaScript thread a tick can run before the late sample; with standing samples every 0.3 s and
0.6 s of grace a stall of 0.3 s made the rules find the boss gone and cancel his act (it took 0.5 s
before). The bots stand at min(0.3, staleS/2) = 0.3 s as before: no measured table moves.

AT THE INSTANT OF STEP OUT HE IS ON FOOT (the lead): `stepOut` also sets the stored presence's
cab flag off, so the very same sample at the wheel right after is a new one and seats him.

Measured for the return (node, the bots' states, absences at the caps): 2 h at rung 2: 235 ms; 6 h
with the Night watch at rung 3: 333 to 394 ms (628 to 1,776 ms with the compiler off): on a phone
about half a second to a second and a half, now behind the counting card. The pass itself is no
cheaper yet.

A player (READY, with findings) and an attacker (one money hole) reviewed it. Each finding and its
ruling:

- A1 (important, hud, from attacker): The away pass for an absence killed while waiting is lost. The signature returning.ts relies on (the saved lastSavedAt more than cardS later than the yard's clock.highMs) never survives a start. The shared reconcileState keeps the saved lastSavedAt; salvageMode then calls reconcileSalvage with now = that lastSavedAt; freshSalvage(c, now) gets highMs = now; and save.ts:141 takes the larger of the two. So on reload hig
  RULING: THE ABSENCE SURVIVES A KILL. Build the attacker's change: deferAway also wraps the mode's `reconcile`: when the raw save shows the signature (its lastSavedAt more than cardS later than its salvage.clock.highMs), the loaded game keeps the SAVED yard clock (clock.highMs), so the next start counts the absence from the instant the yard last ran. The principle to write at the head of returning.ts: clock.highMs is the device time up to which the yard has been computed, and an absence is always counted from it; the store's stamps (lastSavedAt, stats.clockHigh) only guard against a clock set back. Tests THROUGH THE REAL LOAD PATH (the store's boot steps: reconcileState, the mode's reconcile, offline), not on the raw object: (a) the attacker's two sequences (${D}/attack/owner2/kill.test.ts: copy its cases into your own test file): killed after resume's save; killed during the loading curtain after an autosave; (b) no double pay: after a pass that ran, a kill and a restart pay only the time since; a pass, then a pause in which saves continue and ticks do not (the page hidden, the phone upright), then a kill: the restart pays the pause and the absence once; (c) a device clock set back while it waits pays nothing and loses nothing when it is set right again.
- A2 (minor, hud, from attacker): While an absence waits, every card action is reported to the screen as applied, although nothing is applied. In this module null means 'applied, or nothing to change'. So a Buy or Hire pressed in that window shows no refusal and may play its success response, while the state does not change, which breaks 'what a card shows is what is applied'. The window is short: two frames after the counting card is painted. During
  RULING: A HELD ACTION IS A REFUSAL, AND NOTHING IS PRESSABLE WHILE IT COUNTS. (1) src/modes/salvage/actions.ts act(): while an absence waits return the refusal `nothing` (as every other 'nothing to do' does), not null. (2) The counting card's scrim covers the WHOLE screen, the top band included (no card can be opened under it), and openCard is ignored while uiState.counting is set; the pass is scheduled only for the counting card that was painted. A test for each.
- A3 (minor, hud, from attacker): If the engine's offline throws on a given state, pending is cleared, nothing is stored, and highMs stays at `from`. The next tick finds the same gap and holds again, so the counting card flashes every few frames and the yard never runs. The old path also froze such a yard, because every tick threw, but it did so without a flashing card. This is not reachable on valid states.
  RULING: A PASS THAT THROWS DOES NOT FREEZE THE YARD. If the engine's offline throws in runPending: record it (crash.record, as now) and store the game with salvage.clock.highMs raised to `now` (the absence is lost, the yard runs on), so the next tick does not hold again; never a second counting card for the same absence. And a SAFETY NET the lead adds: an absence never waits for the screen for ever: if it has been pending for more than 8 seconds of device time when a tick arrives (the loop runs, so the screen is up), that tick runs the pass itself (the same one function, once) and the away card opens as it would have. Tests: a throwing engine (injected, as runPending's `engine` argument allows) leaves a running yard and no pending absence; the 8 seconds.
- P1 (important, hud, from player): 'Load full' shows while the load chip still shows room, and it repeats about every second while the boss keeps cutting onto the ground. The screen contradicts itself (lesson 2), and the toast blinks on and off for as long as he stands at the wreck.
  RULING: THE MESSAGE SAYS WHAT TO DO, ONCE. This is the first yard's own behaviour (a cut piece that does not fit the room left drops beside the thing, which is fine: the yard hand now carries it), but the toast contradicts the chip and nags. (a) WORDS: the refusal `loadFull` reads 'No room: weigh your load at the scale' (or shorter words that say both things: there is no room for this piece, and where the load goes; the words' check at 0 findings; the three text files). (b) ONCE: the hud shows it once per load: not again while the boss's carried mass has not changed since it was last shown (a later piece that does not fit the same load says nothing), and again only after the load changed. No change in the rules. A test on the hud's toast logic (the same event ten times with an unchanged load: one toast; after a weigh and a new fill: one more), and frames at ?preset=m30 with the boss cutting.
- P2 (important, world, from player): Next to a parked truck, a person whose feet are inside the truck's outline is drawn on top of it. They look like they are standing on the flatbed or on its cab. This is the owner's point 7 ('looks like it's running people over') in still form.
  RULING: NOBODY IS DRAWN STANDING ON A VEHICLE. (a) THE BOSS cannot walk into a standing vehicle's drawn outline (his own parked truck, the merchant's flatbed at its stand, a van while it stands): collide with its rectangle (as wide and long as it is drawn, turned as it stands), not with the small circle of today; he slides along it; the walk-in and the disc's 'Get in' still work from its sides (the rules' reach is truck.enter + truck.rearm from its centre: check in the preview that he can get in from both sides and that he is never stuck between a vehicle and a wall, the fence or a machine: if a parked truck would trap him, the outline lets him out). A player always sees himself: he is never hidden behind a vehicle either. (b) CREW (dated legs the rules own: nobody gives way by rule, V5): a worker whose drawn place lies inside a standing vehicle's outline is drawn stepped aside to its nearest edge (the step-aside you built for moving vehicles, world/motion.ts stepAside, extended to standing ones), eased, never jumping; where that is not possible he is drawn BEHIND the vehicle, never on top of it. A test in the manner of aside.test.ts: over five minutes of the played m30 with the boss's truck parked on the drive line, at the weighbridge and at the gate: zero frames in which a person's feet lie inside a standing vehicle's outline and he is drawn in front of it. Pictures at the rack, the weighbridge and the gate, both sizes.
- P3 (minor, world, from player): A truck going slanted through the gate is drawn over the hedge and a post.
  RULING: If the hour allows, after finding P2: the hedge row covers what stands behind it at the gate (split the row at the gate, or sort the truck from its north-most corner while it overlaps the hedge). Otherwise leave it and say so.
- P4 (minor, hud, from player): A sale ticket already on screen stays bright above the counting card's scrim, and its last line ('paid by tr...') is cut off by the card. At that moment the first impression is 'two cards'.
  RULING: While the counting card or any overlay card is up, open sale tickets and toasts are not drawn above its scrim (hide them, or draw them under it), and come back after. A picture of the counting card with a ticket that was open before it.
- P5 (minor, hud, from player): The hand waits on the scale labelled 'Waiting for cut pieces' while the boss stands nearby with a full 150 kg load of cut pieces. A new player will ask why he doesn't take them.
  RULING: With P1: the words of `loadFull` now say where the load goes ('weigh your load at the scale'), which answers this. Nothing else now; the yard hand does not take from the boss's load (not now).
- P6 (minor, world, from player): Pressing Get in moves the view sideways by about 100 px in one frame, onto the truck.
  RULING: Getting in (by the disc or by walking in) eases the camera onto the truck over about 0.3 s instead of moving it in one frame; the same on Step out. If the camera already eases and the jump is the followed point's, ease that point.
- P7 (minor, world, from player): A blurred stack of containers, taller than the screen, covers the middle of the view where the boss works. It looks like a rendering glitch rather than scenery.
  RULING: Find out what the tall soft block is (the dressing's foreground stack by the east fence?). A PLAYER ALWAYS SEES HIMSELF holds for it as for roofs: anything of the scenery drawn in front of the yard's floor that can cover the boss or a worker is drawn see-through while one of them stands behind it (the roofs' rule, world/actors.ts roofTable and underRoof), and a foreground object is never taller on screen than about a third of the view where people work: make it so, or say exactly why it is as it is. Pictures at ?preset=m15 and m30.
- P8 (minor, world, from player): Every load of ?preset=m15 opens the 'Cinder Lane Yard, Opened at 3 t' rung card again. Pressing its OK opened the Industry table, which the player then has to close.
  RULING: not now (the preview's preset only).
- L1 (blocking, hud, from join2b / the lead): src/modes/entries.test.ts fails 3 tests with `ReferenceError: __DEV__ is not defined`: the salvage entry now reaches services/firebase (and expo-constants) at import through returning.ts. The entry's imports must stay loadable in node as they were (the test pins what each mode's entry hands over).
  RULING: BLOCKING for the merge: src/modes/entries.test.ts green again WITHOUT editing it or any shared file; then run the whole of src/modes and src/state once (the full suite is the lead's gate). Say in your account why it passed before and what the rule is for the next file the entry imports.

THE RULE OF THE YARD'S CLOCK, written down because the attacker's hole came from not having it:
`salvage.clock.highMs` is the device time up to which the yard has been computed. An absence is
always counted from it. The store's stamps (`lastSavedAt`, `stats.clockHigh`) only guard against a
device clock set back. Whoever computes time away (a tick's gap, a resume, a start, the deferred
pass) moves highMs to the end of what it computed, so no interval is paid twice and none is lost.

THE CONFIRM OF THE SECOND UPDATE (about 20:20): one who built none of it: READY to merge. The return
held against four more attack tests through the real store (a pause while it counts and two resumes:
the whole absence paid once; a cold start whose counting card never shows: the safety net runs one
pass and the away card waits; a 40 s trip leaves nothing pending); nothing calls the rules' own
`offline` or `tick` past the wrapper except the deferred pass itself. Findings, all minor, and the
rulings: (1) his four tests stay in the repository (`src/modes/salvage/owner2c.attack.test.ts`).
(2) The safety net counts its 8 seconds from the start of the wait, so on a cold start whose
loading curtain lasts longer it runs the pass under the curtain (the curtain's animation stands
still for the length of the pass; one pass, nothing lost): NEXT: start the net's clock when the
curtain parts. (3) Not looked at by anyone with their own thumb: walking against a standing truck
from every side at the gate and the farm, a truck parked across the gateway, a vehicle coming to a
stand on the boss, crew stepped aside into a machine or the fence: the lead walked away from and
back into the parked truck from its side in the preview (free to leave; seated on walking in), the
rest rests on the fixer's tests (standing.test.ts) until the owner or the next review looks.

THE LEAD'S CALL ON THE ENTRY'S PIN: the fixer had put the deferral on the rules' engine object in
place, because `src/modes/entries.test.ts` pinned that the salvage entry hands over that very
object. The pin is the lead's to keep in step: the entry now hands over a plain wrapper
(`salvageReturningEngine`), the pin says so (its three time-away seams are the wrapper's, everything
else the rules' own), and whoever imports `salvageEngineMode` gets the rules as they are.

### 19. The bots' first play of stage 2 (26 November, about 21:45): rulings before the numbers are set

The bots now play stage 2 (`notes/` of content2-bots; `yard-bot.ts --stage 2`): every bot of 8.2's
table but one reaches rung 4 on three seeds, none reaches rung 5 within eight days, no hard promise
broke (three apparent breaks were the bots' own measuring). What they showed, and what holds from
now on:

19.1 THE PAYBACK RULE READS WHAT THE YARD EARNS, MEASURED (it replaces "the ΔI it adds" of 2.6.4).
    Rated income I carries terms for four plates only (baler, granulator, shredder, induction); for
    the crane, the shear, the analyser, the depollution bay, the eddy current, the sorter, the
    rotary furnace, the breaker and the smelter its ΔI is zero, so τ_r × ΔI prices nothing. A
    plate's price is set from the bots' own play instead: on the reference yard (the normal hand,
    the goal habit), from the state at the plate's planned moment with every earlier plate of the
    goal order owned, play two branches (bought now, not bought) for the walk's horizon of ruling
    17.1 (the same walk, the same seeds, the same absence at the cap): ΔE is the difference in what
    the yard earned (sales less loads, reagents and every other cost; the plate's own price left
    out) as a rate per hour of yard time, on means over the seeds. PRICE = max(`works.floor`,
    τ_r × ΔE), rounded as the content rounds prices, written by the script into
    `bots/plates.json` as before. A plate that only makes a later plate possible (its own ΔE at
    or below the floor's worth) costs the floor, and the plate that completes the chain carries the
    chain's gain: the sum is right, and no purchase is a trap. The vehicles and tools of the stage
    (payback-priced, 2.9) by the same measure. The gate of 17.1 then holds by construction; print
    its table all the same.
19.2 RATED INCOME MUST STILL BE RIGHT, because packs, ad rewards and the bank read it and what a
    pack says ("hours of your yard's income") must be true: I may never be read from trailing sales
    (a player could hold and then sell to inflate it). Its missing plate terms (every plate, the
    hands' carrying to the yard plates, whole things as inputs, the van) are the FIX PASS's work in
    rate.ts, calibrated to 19.1's measured gains, to the band of 14.10 (medians 0.95 to 1.05 at
    rungs 3, 4 and 5); and the facade's ratedIncome, ratedTerms and stockValue read the content at
    the state (they read the base content today and leave out every plate: a fault). UNTIL THEN the
    bots measure I through their own wrappers and report it against earnings; nothing is priced
    from I.
19.3 RUNG 5 COMES ON DAY 4 TO 6 (8.2), by its tonnage alone: the yard supplies about 700 t a
    sitting at rung 4, so 10,000 t arrives about day 8.5 to 9, and from sitting 8 on nothing useful
    is left to buy while cash grows to §8M to §21M. Bring rung 5 into its band with
    `ladder.rungs` (rung 5's tonnes) and nothing else; the aim that goes with it: the last goal
    purchase of the stage and rung 5 lie within about two sittings of each other on the normal
    hand. If the tonnage alone cannot do it (the range of materials binds first), say which
    material binds and leave it.
19.4 STEEL-MAX STALLS AT RUNG 3, and that is the design: rung 4 asks for eight materials and the
    ferrous plates give six ("the largest FULL metal recycler"). 8.2's row changes to say so. What
    the rung's tile shows such a player (which materials are missing) is the screens' work.
19.5 THE CUTTER'S HABIT is measured as the rules allow it: a tagged thing is racked before it can be
    cut while the rack has a free place. No rule changes.
19.6 L1 (the first Bank loan within two sittings of rung 3) is a measure, not a gate: a yard that
    pays its rung-3 plates in cash is doing well.
19.7 THE CARD MANAGER at stage 2 (its advice presses refused while the driver's load holds money):
    find out in the measure whether that is the bot or a rule that keeps a player who only uses
    cards from buying a plate; if a rule, it is a finding of severity blocking for the fix pass.
19.8 THE FULL TABLE (15 seeds, 5 of them unseen, 13 of 15 in band) waits for engine step 3 (time
    away at stage 2 costs 3 s for six hours today): until it lands, three to five seeds, shards and
    caches; the table is printed again after it.
19.9 The shop's sixteen products now stand in the shared `monetization.iap.products` (prefix
    `yard_`) and `monetization.ads.initOn` is 'firstOffer'. Before anything of this is merged for
    the phone, a test shows that at `release.stage` 1 none of it shows or runs (no product asked of
    the store, no row, no ad start that differs from the first yard's); else the build script
    writes both only at stage 2.

### 20. Engine step 3 (26 November, late evening): time away cheaper, not one result changed; what it did not reach

Built under one rule (no state, event or away card differs, bit for bit) with a recorded baseline of
results as its gate, then checked by an engineer who wrote none of it, on states the builder did not
pick (the old engine, commit aeda1dd, beside the new, each in its own process).
- RESULTS: the builder's checker: 0 differences over 135 cases and 1,566 computations; the
  checker's own: 0 differences over 137 cases, 1,684 computations, 144,324 comparison points
  (other seeds and hands, the instants around rungs, purchases and pours, awkward absences, an
  absence cut in two by a save, three in a row against one, every frozen state of both stages, an
  hour of live play); no cache could be made stale; no test or number was touched.
- COST (node CPU; builder / checker): stage 2, six hours at rung 4 with seven plates: 2,719 to
  1,180 ms / 2,933 to 1,455 ms (2.0 to 2.3 times cheaper); the rung-3 entry 588 to 422 ms; the
  first yard's six hours 282 to 377 ms before, 250 to 277 ms after; a tick unchanged.
- WHAT WAS SAVED: the magnet crane's departure skipped while it provably would again move nothing;
  a route's answer kept for one transition; smaller exact savings in the crew, the things, the
  partners, the positions, the truck and the board.
20.1 THE AIMS STAND AS AIMS (150 ms for the first yard's six hours, 400 ms for stage 2's heaviest
    rung) and were not reached: the first yard's profile is flat (each of a dozen functions scans
    things and pieces at every departure and landing, 2 to 5 % each).
20.2 THE BENCH'S LIMITS stay as they are (BENCH_STRICT 250 ms on the first yard's minute 60, the
    suite's alarm at 700 ms: an alarm under load, not a measure). Stage 2 gets its own strict limit
    when step 4 lands, set from its measured table.
20.3 STAGE 2 DOES NOT GO TO A PHONE WITH A PASS THAT COSTS OVER A SECOND IN NODE. ENGINE STEP 4, THE
    INDEX, is built before stage 2's screens are merged: things by place and pieces by pile kept
    beside the state for one transition (about twenty places move a thing or a piece: a version
    counter bumped at each, checked by the memo's verify mode), a thing by its id through the same
    index, the idle driver's ranking kept as the crane's no-move is; under the same rule and the
    same gate (the recorded baseline, then an independent check against the old engine). It is
    built in its own working copy so that the bots' measurements never run on a half-built engine.
20.4 The first yard on the owner's phone: the counting card covers today's quarter of a second in
    node (half a second to a second and a half on a phone). Steps 3 and 4 reach the phone with the
    next update that is merged, after ruling 19.9's test.

### 21. The bots' first measured table of stage 2 (27 November, about 01:00; `docs/design/yard-bots2.md`)

Measured on five seeds (three for the habits, five unseen for the normal hand): rung 4 on day 2.0,
rung 5 on day 4.0 after its tonnage went from 10,000 t to 3,600 t (19.3); no hard promise broke on
65 runs; a minute of ticks equals a jump at all 30 checks; the first yard plays bit for bit as
before. What holds from here:

21.1 THE MEASURED GAIN IS MEASURED WITH THE BOSS IN THE YARD TOO (19.1 as it was meant). The first
    prices were set from the gain over one capped absence alone, and six plates that are fed only
    while the boss plays (the crane, the shear, the depollution bay, the granulator, the eddy
    current, the sorter: oversize pieces, cars by the forklift, car bodies and appliances in the
    shredder's stream) showed a gain of exactly nothing and were priced at the floor (§3,000). The
    walk's horizon is an hour of play by the reference bot (the normal hand, the goal habit) and
    then one absence at the cap; the gain is taken over both, as a rate per hour of yard time. A
    plate that still shows no gain for a yard whose boss plays is a finding about the plate, not a
    price. The six prices, and the vehicles' and tools', are set again by this in the fix pass's
    measurement; L1 and L5 (the first loan near rung 3, repaid before rung 4) are read again after
    it (they cannot hold while every rung-3 plate costs the floor).
21.2 THE MAGNET CRANE MAKES THE YARD POORER (what the yard keeps over a capped absence falls by 14
    to 29 % at its planned moment). BLOCKING, by ruling 17 (no purchase makes the yard poorer). The
    fix pass finds why with the smallest example (what it moves, where to, at what loss: whole
    things into the shear that a cutter would have cut into dearer grades; hoppers kept full so
    that hands stand; the floor's rule of 17.2) and changes the crane's rule so that it only ever
    does what leaves the yard at least as rich. The walk of 17.1 is its gate.
21.3 The walk's other failing steps (the baler; the driver's level and the farm's level at rung 3;
    the demolition's level on day 3): each with its smallest example in the fix pass. Where the
    cause is the driver's choice of load, the rank of ruling 16.5 is measured again at stage 2 (it
    stays unshipped at stage 1).
21.4 RATED INCOME as 19.2: its terms completed in rate.ts and calibrated against the bots' measured
    earnings to the band of 14.10 at the six named moments on both boards (medians 0.88 to 1.33
    today).
21.5 WHEN NOTHING IS LEFT TO BUY, THE YARD SAYS WHAT IT IS WAITING FOR. Between the last goal
    purchase and the next rung the advice line and the goal card name the rung's missing tonnes and
    materials; a level is named only when it pays back within τ_r by the rules' own measure. No
    rule invents a purchase.
21.6 THE LEAD CUT (a yard without the battery breaker and the lead smelter has eight materials and
    rung 5 asks for nine: a dead end no tonnage can fix): the build refuses a content whose rung
    asks for more materials than its plates and partners can supply at that rung (a check in
    build-yard.py). The shipped content keeps the lead line.
21.7 ACCEPTED AS MEASURED until the fifteen-seed table (after engine step 4): rung 5 at 3,600 t; the
    van's batch factor 1.25 (the Yard sale and the van at 5.2, 4.7 and 4.5 % of days 1 to 3); an
    hour away at 0.46 of an hour played at stage 2; ads at most 1.6 % of a day; the hand at twice
    the card manager; the shredder's and the breaker's payback short of τ (0.65 to 0.87 and 0.57
    to 0.83): looked at again with 21.1's prices. The first yard's own open rows (the farm level at
    minute 90, the slow hand's rung 3, an hour away at 0.81 of an hour played) stay as they are on
    the owner's phone until the owner has played more.
21.8 19.9's test is the lead's, before any store build: the sixteen products and
    `ads.initOn` 'firstOffer' are already in the build on the owner's phone and inactive there
    (Expo Go has no store; the first yard has no shop and makes no offer, so the ad SDK is never
    started).

### 22. Stage 2's rules after three attacks (27 November, about 02:20): the findings and the rulings

Three engineers who wrote none of it attacked the stage as joined and measured. EXACTNESS: the stage
is exact where it promises (a tick equals a jump on 40 states with the boss stale and walking; an
absence in 2 and 11 passes equals one; mass to the gram over 15 days; every card button pressed at
random instants: no fault; saves load; stage 1 stays dark), with two real faults. MONEY: the bank
takes exactly its share to the cent, cash never goes below zero, the shop's shared attack cases hold
on the real mode inside the real store; one fault that blocks any store build, four important.
THE ECONOMY: not ready for real scrip: an endless supply of oversize pieces, partner levels priced
at the floor while the advice line sells the worst buys, a dead end reached by the best money play,
and the crane's loss confirmed at more than a fifth of lifetime earnings.

- M1 (blocking; owner content; money attacker): At release.stage 1 the build still runs stage 2's purchase plumbing. iap.init asks the store for all 16 yard_ products. Because grantsHoursOfIncome reads the shared product list and not the mode's content, the check at start reads the customer listing twice and subscribes the transaction listener. A store build at stage 1 would therefore fetch 16 products the app never shows (A
  RULING: STAGE 2'S PRODUCTS ARE NOT IN THE FIRST YARD'S BUILD (rulings 19.9 and 21.8; BLOCKING for any store build; FIRST of your items). The sixteen products are DEFINED in the mode's own content (a block under salvage, dark at release.stage 1 through stageView) and build-yard.py MIRRORS them into the shared monetization.iap.products only when the content's release.stage is 2 or more; at stage 1 the shared list is empty, so a stage-1 build asks the store for nothing, reads no listing, subscribes no purchase listener. monetization.ads.initOn stays 'firstOffer' at both stages (the first yard makes no offer, so the ad SDK is never started: that is right). Tests and bots that need stage 2 get the game configuration through ONE helper (parse with release.stage 2 AND the shared product list filled from the mode's block: put it beside the fixtures and use it in yard-bot.ts --stage 2 and in every stage-2 test that reads products): nothing else changes for them. A test on the real game.json: at release.stage 1 the shared product list is empty, grantsHoursOfIncome is false for every id, and the store's boot makes no listing call (the money attacker's test in attack/s2/ shows how he observed the calls: move it into the repository). npm run sync and validate stay green (RATING-NOTES and the fingerprint follow).
- M2 (important; owner money; money attacker): setAgeBand has no guard for a content without iap. At release.stage 1 it keeps an age band in the save. adAudience then returns 'child' or 'teen', and the shared store's followAudience hands that to the ad service. It is the only money action that saves stage-2 state at stage 1. No stage-1 screen calls it today, so it is latent, but it falls under the highest-severity class the
  RULING: setAgeBand does nothing and saves nothing where the content has no shop (release.stage 1): a refusal 'nothing', the state untouched; adAudience at stage 1 is as the first yard's. Test at stage 1. (Latent today: no first-yard screen calls it.)
- M3 (important; owner money; money attacker): 'Start the yard again' builds a completely fresh state. (a) Bought looks and No ad videos disappear from the entitlements until the next app start, when owned() restores them: paid content goes missing in the same session. (b) The age band and the packs-hidden lock are cleared. A 13 to 17 year old (or a child) can press Start again and answer the age question again, and the par
  RULING: WHAT WAS PAID FOR AND WHAT A PARENT ANSWERED SURVIVE 'START THE YARD AGAIN'. A restart keeps: every owned look and No ad videos (in the same session, not only after the next start), the age band, the packs-hidden lock, the country read; it loses, as the card says, bought scrip and a purchase still waiting. Build it in the mode's own create/restart path if the shared store hands the previous game to it; if the shared store's reset() gives the mode no way to see the previous state, do NOT edit src/state: write the smallest seam you need for the lead in requests.md (an optional EngineMode function the store calls on reset with the previous game), build your side against it, and test your side. Tests: restart at rung 4 with two looks, No ad videos, a teen's band, the lock on.
- M4 (important; owner money; money attacker): Opening a card reports noteSeen({ card: data.kind, place? }) without the plate. actionsMoney.ts onSeen sets the lender's letter only for { card: 'works', plate }, so from the screens the letter can never fall due, letterSeen stays false, and the Bank loan is never offered to a real player. The bots call noteSeen with the plate directly, so their L1 and offer counts do not show 
  RULING: The works card's opening reports its plate: in src/modes/salvage/actions.ts (the 'open' case) noteSeen carries { card: 'works', plate } for a works card, so the lender's letter can fall due from a real screen (the bots called onSeen directly). A test through the mode's action, not through the rules' function.
- M5 (important; owner money; money attacker): On the real played yard, headroom almost never admits the two larger packs. pack20 (§1.58M at I §79,044) never fits. pack10 fits only with cash 0 in the first rung-4 sitting, and never with the bot's own cash. From sitting 6 to rung 5, U is about 0.5 h of I and no pack fits at all (21.5's 'nothing left to buy'). The $9.99 and $19.99 products are listed but cannot be bought. Rul
  RULING: A PRODUCT THAT CAN NEVER BE BOUGHT IS NOT LISTED. First fix E3 (partner levels priced from their own gain): headroom U will be far larger. Then measure with the bots' owner (a line in requests.md): on the normal hand, at which ordinary moments of rungs 4 and 5 does each pack fit U. Report the table. If the 20-hour pack still never fits, say so for the lead (the list of ruling 9.1 changes only by the lead's word). Fix M10 with it.
- M6 (minor; owner money; money attacker): Help's three pack pages ('Scrip packs', 'The code', 'Bought scrip … lost if it starts again') show from the first minute, before the second session and at every rung, wherever the country is on. Ruling 13.2 says nothing of money appears before the second session. They also show to t13, who can never buy a pack.
  RULING: Nothing of money before the second session, the help included: Help's three pack pages show only where the pack rows themselves would (the second session reached, the country on, the age band allowing packs). Test from firstHour2min and for a child's band.
- M7 (minor; owner money; money attacker): On the shipped content no plate can be financed at rung 3. Every rung-3 plate costs the floor §3,000, below 0.5 h × I (§16,023 at the rung-3 entry, §39,275 by sitting 3). The analyser (§29,100) is flagged not financeable. The bank first appears at rung 4 (shredder, rotary, induction). The specification's fallback (the floor falls) is not built. This is known in part through rul
  RULING: not now: it follows from the first prices (six rung-3 plates at the floor); read again after the bots' second measurement (ruling 21.1).
- M8 (minor; owner money; money attacker): The spot buyer offers a video for trivial amounts: 'Video · +§0.20' at I §15,494. Ads run from the second session at any rung, but dayHours_h is null at rungs 1 and 2. So the 4 % daily ceiling is unchecked exactly where the second session usually begins.
  RULING: AN OFFER TOO SMALL TO MATTER IS NOT MADE, AND THE DAY'S CEILING HOLDS AT EVERY RUNG: the spot buyer offers a video only when its reward is at least content ads.minOffer_min minutes of I (a new key, 2); ads.dayHours_h gets real values for rungs 1 and 2 (the same ceiling rule as rung 3: at most maxDayShare of a day's income), so the 4 % ceiling is checked wherever the second session begins. Keys through the content's owner (a line in requests.md; the schema's key is yours to add).
- M9 (minor; owner screens; money attacker): The restart confirmation does not show 'Bought scrip, and any purchase still waiting for approval, stay with this yard and are lost if it starts again.' (card.restart.packLost, P16), although R.restartPackLost(g) exists. A waiting pack really is lost at reset.
  RULING: not now (the stage's screens, Phase C): recorded for it.
- M10 (minor; owner money; money attacker): Latent. buyCheck and levelCheck test the money refusal before the ceiling, so an item the ceiling forbids reads 'cantAfford' with its price when cash is short, and headroomU counts it. U then depends on the cash in hand, against E10 ('what the cash can pay does not decide it'). No ceiling binds on the frozen r3 or r4 states, so the numbers do not differ today.
  RULING: The ceiling is tested before the money in buyCheck and levelCheck (an item the ceiling forbids reads its ceiling refusal whatever the cash), so headroom U never depends on the cash in hand (E10). Test with cash 0 and cash 10^9 on a ceiling-bound state: the same U.
- X1 (blocking; owner works; exactness attacker): Oversize pieces never stop coming while the boss cuts them. With four waiting, nextAt is null. A cut sets nextAt = t, the arrival at that same t makes four again and sets nextAt back to null, and the next cut repeats it. The spec contradicts itself: 'when the arrival makes four, nextAt = null' against 'the next is dated t + period'.
  RULING: BLOCKING. A NEW OVERSIZE PIECE COMES ONE PERIOD AFTER A CUT, NEVER AT ONCE: in lotActEnd the next arrival is dated t + lots.period_s whenever a cut frees the pad from full (and an arrival that makes four leaves nextAt null as now). The specification's sentence is corrected to this (a line for the lead: 2.10.1). Test: four waiting, cut in a row: at most one new piece per period; ten minutes at the pad cut at most the pieces that were there plus what the periods bring. Both attackers' tests move into the repository.
- X2 (important; owner loop; exactness attacker): An absence longer than away.gapS (10 s) and shorter than cardS (60 s), while an away card is still open, runs a full pass that pays and buys loads, but its money is not added to the open card. The card then disagrees with the cash, in either direction.
  RULING: AN OPEN AWAY CARD TAKES EVERY PASS: showCard = (raw > cardS && played) || an away card is still open: a pass made while the card waits is added to it (its sold rows, its loads, its net, its time away), so the card always equals what the cash moved. This is the first yard too (the owner's phone): tests at stage 1 on the shipped content (two hours away, then 30 s more with the card open: the card's net equals the cash's change to the cent) and at stage 2. The mode's deferral (src/modes/salvage/returning.ts: a counting card only for an absence over cardS) needs no change: say so in your account after reading it.
- X3 (important; owner works; exactness attacker): A cut oversize piece is split into pieces of the object's own piece size, not into the few 'batch' pieces the spec describes. Its mass grows with rated income: a 60 kg catering table arrives as 4.4 t, an engine casing as 5.9 t, which breaks L2 (real physics) on the plate that prints the mass. Thousands of pieces then land on a floor that holds about 4 t.
  RULING: A CUT OVERSIZE PIECE IS WEIGHED WHERE IT IS CUT, AND IT WEIGHS WHAT SUCH A THING WEIGHS. (a) At the cut its grades go straight into their bays on one ticket with a line a grade (as things.ts shellWeighIn does for a car's shell): no thousands of pieces on the floor (a tick at rung 5 costs 2.3 ms because of them). If a grade's bay is held or its route says a plate, the ticket follows the same rule as any weigh-in. (b) Real physics (L2): a lot's printed object and its printed mass agree: each lot object of the content carries a mass range a real one has (a line to the content's owner with your proposal: objects heavy enough for the works' rungs: a ship's propeller, a transformer core, a press frame, a boiler drum: names through the register), the lot's mass is drawn inside its object's range, and its worth follows from mass and grades, not from scaling a 60 kg table to 4.4 t. The rule mu x I for a lot's worth becomes the choice of WHICH object comes (the heaviest whose worth is at most mu x I), not a multiplier on its mass. Tests: every lot's mass within its object's range on 5 seeds at rungs 3, 4, 5; no ground piece created by a cut.
- X4 (minor; owner works; exactness attacker): A corrupt works.<plate>.work in a save is not repaired, and the yard throws at its first jump.
  RULING: A corrupt works.<plate>.work in a save is repaired as the first yard's machine work is (kept only when its piece's grams are finite and its grade and times valid, else null); goals.done is an array after any load. The attacker's two corruptions become tests.
- X5 (minor; owner works; exactness attacker): A save and reload does not continue bit for bit when reuse.nextAt (the next visitor's date) is in the past with the rack empty: the live yard keeps the old date, the load moves it up to the save's clock. Nothing is paid differently.
  RULING: A save and reload goes on bit for bit also when the next visitor's date lies in the past with the rack empty: do not clamp reuse.nextAt on load while the rack is empty (or null it in the live yard when the rack empties: choose the one that keeps tick = jump and save = unsaved, and test both).
- X6 (minor; owner loop; exactness attacker): A stage-2 save loaded by a stage-1 build does not throw, but stage 2 keeps going: the yard stays at rung 5 with 13 works, the works keep running and the cash keeps rising.
  RULING: A SAVE THAT HAS SEEN STAGE 2, LOADED BY A BUILD AT release.stage 1, IS KEPT AND FROZEN: nothing of stage 2 advances, pays or shows (the works, the bank, the shop, the lots, the rack: no event, no money, no card), the first yard's rules run on what the first yard owns, the ladder shows at most rung 3, and every stage-2 field is kept as saved for the day a build at stage 2 loads it again (then it goes on from where it was). A test with the attacker's save (rung 5, 13 works) at stage 1 for a day of play and an absence: cash moves only by the first yard's earnings; then loaded at stage 2: the works as saved.
- E1 (blocking; owner works; economy attacker): Cutting a lot while four are waiting dates the next lot at once (if nextAt === null then nextAt = t), so a full pad is refilled after every cut. The period never applies. Each lot is worth mu (18 min) x I, and a cut takes 4 to 10 s. A boss standing at the pad turns about 7 s into 18 minutes of income: on seed 202 that was 29 hours of I in one 15-minute sitting. This is a domina
  RULING: The same fault as X1 (the economy attacker measured it at 29 hours of income in one 15-minute sitting): fixed there. Add his rules test.
- E2 (important; owner works; economy attacker): PLAUSIBLE (the bot's fault or the rules'): on seed 201 at rung 5 the boss takes 'cut lot17' 284 times in 15 minutes and the cut never finishes (lots.n stays at 19). The yard then supplies fewer tonnes than with an idle boss.
  RULING: Find out with the bots' owner (requests.md) why 'cut lot17' is taken 284 times in 15 minutes and never finishes (seed 201, rung 5): whether the act's hold fails where the bot stands (reach.work against the thing's size) or the bot walks off at every decision. Whichever side: an act that is refused or broken says why (a refusal the screen can show, lesson 12); and a test that a boss standing where the frame's own stand point for the lot is finishes the cut.
- E3 (blocking; owner money; economy attacker): Bridge partner levels: (a) they are priced with the yard's mean margin of §0.641 a kg, when a plumbing load nets about §2.2 a kg plus the works' grades; (b) each level adds a full skip flow (20 loads an hour) and nothing downstream binds, so the gain does not diminish; (c) binding() lists partners only when no crew binds, and at stage 2 the hands always 'bind'. So the card says
  RULING: BLOCKING. A PARTNER'S LEVEL COSTS WHAT IT EARNS, AND THE ADVICE NAMES THE BEST BUY. (a) levelPrice for a partner = levelTau x the rated gain of that level (rated income with the level less without: rate.ts carries the partner terms), as a plate's level is priced; never the yard's mean margin a kilogram. The first yard's prices (rungs 1 to 3 at release.stage 1) must come out AS THEY ARE on the owner's phone: this is a stage-2 rule (from the works' opening); a test pins the first yard's partner level prices at stage 1 to today's. (b) The card's 'not the bottleneck now' is said only when the level's rated gain is zero. (c) See E7 for the advice.
- E4 (blocking; owner loop; economy attacker): A dead end reached by the stage's best money play. A player who levels the two bridge partners (they reach level 20 by sitting 4, §918.6k in all) makes +52 % lifetime earnings by day 3 and +55 % by day 6. But the driver then always fetches the better-paying bridge skips, so the farm and demolition loads that bring light iron stop. Light iron stays at about §25k worth against th
  RULING: BLOCKING. NO WAY OF PLAYING WELL ENDS IN A DEAD END. A player who levels the bridge partners must still reach rung 5. (a) THE DRIVER KEEPS EVERY OPEN PARTNER SERVED: among full skips he takes the best by his rule, but no open partner's full skip waits longer than content truck.fairAfter_trips (a new key, 4) of his trips; from the works' opening only (the first yard's driver is unchanged at stage 1: test). (b) The rung's tile and the advice line name the material that is missing and who supplies it (with the words' owner: a line in requests.md; 19.4 asks the same). (c) A check for the content's owner (requests.md): every material a rung asks for can be supplied by the partners open at that rung at a rate that reaches the rung's worth within the rung's band. Test (a) with the attacker's strategy as a bot pair: bridge partners levelled to 20 by sitting 4 reaches rung 5 within the band.
- E5 (blocking; owner works; economy attacker): Confirmation in play of 21.2, at a much larger size than the walk's -5.6 %. A player who never buys the crane (a goal purchase) beats the goal-card player by more than a fifth, so the strategy the game teaches loses by more than a fifth.
  RULING: BLOCKING (ruling 21.2). THE CRANE NEVER LEAVES THE YARD POORER. Find the cause with the smallest example (the economy attacker: a player who never buys it earns 51 to 55 % more by day 3 and has 29 to 30 % more tonnes): what it lifts, where to, and what that costs (whole things into the shear that a cutter would have cut into dearer grades; hoppers kept full so that yard hands stand; the floor emptied so that the rule of 17.2 stops). Change its rule so that it only does what leaves the yard at least as rich (it lifts a thing only when the plate it feeds will make of it at least what the yard would have made without the crane, and never takes work a waiting cutter or hand would do at a better worth). GATE: the bot pair 'never buys the crane' against the normal hand: within 2 % of lifetime earnings at day 3 on five seeds (the crane may win, never lose by more), and the walk's crane step at or above -1 %.
- E6 (important; owner money; economy attacker): Rated income I is not monotone through levels. partnerFarm and driver levels LOWER I, while G rises or stays flat (sitting 6: farm L+1 is +1.31 % G and -§2,089 I). Packs (S = H x I), the ads' caps, the bank's F and the lots' mass all read I. A purchase can therefore shrink the next pack or ad offer.
  RULING: RATED INCOME NEVER FALLS WHEN THE YARD GAINS (important; packs, ads, the bank and the lots read it): no purchase, hire or level lowers I. In the partner queue's valuation, rank by net per truck-second and take I as at least what it was without the new capacity. A rules test over every purchase step on the frozen stage-2 states and on the bots' states: I(after) >= I(before). With it, rulings 19.2 and 21.4: I's terms for every plate, the hands' carrying to the yard plates, whole things as inputs and the van, calibrated to the bots' measured earnings to the band of 14.10 (medians 0.95 to 1.05) at the six named moments on both boards; and the facade's ratedIncome, ratedTerms and stockValue read the content at the state.
- E7 (important; owner money; economy attacker): E13 table of what binds (seed 201, unseen). r3 entry (sitting 1): binding says hand and driver; the real best buys are the bridge truck (+60.7 %, §12k) and the plasma (+28 %, §8k), and the hand levels it names are +0.35 to 0.44 %. r3 last purchase (sitting 3): hand; real: plumbing +27.8 %, garage +7.7 %, hand +1.2 to 1.4 %. r4 entry (sitting 4): hand; real: shredder +30 %, plum
  RULING: THE ADVICE LINE ADVISES BY PAYBACK, at stage 2 (from the works' opening; the first yard's advice at release.stage 1 is unchanged: test): among everything the player can buy now (plates, levels of plates, crew, machines and partners, vehicles, tools), it names the one with the shortest payback (price over rated gain an hour) when that payback is within tau_r; 'what binds' no longer decides. When nothing pays back within tau_r it says what the yard is waiting for (ruling 21.5: the next rung's missing tonnes and materials). Test with the attacker's table (seed 201): at each of his five moments the line names his 'real best buy' or one within a tenth of its payback.
- E8 (minor; owner content; economy attacker): Claims my runs do not reproduce, or that the report states without its own evidence. (a) 'sittings 7-8 offer nothing useful' and 'the advice line names only binding levels': the report's own walk shows level partner.plumbing +12.97 % (day 3) and +20 % (r4 entry), but only losses are flagged. (b) 'the hand's worth 2.0x the manager': lifetime earnings on runs where the lot loop f
  RULING: The bots' report says what it measured: add to yard-bot.ts's walk a 'hidden best buy' flag (any step whose gain is over 5 % at a payback under tau_r that neither the advice line nor the goal names) and a line of lots cut per sitting; correct the three claims the economy attacker could not reproduce in docs/design/yard-bots2.md (mark them 'before the lot fix'). The full re-measurement is the confirm step's, after the rules are fixed.
- E9 (minor; owner money; economy attacker): Finance is neutral, so the 'better on a quarter to a half of offers' aim fails. With F at most 2 h of I on a §419k plate repaid within one absence, signing changes lifetime earnings by +0.7 % and cash by -§31k by day 3. The player's choice carries no weight.
  RULING: not now: a measure, as 19.6 (the bank changes lifetime earnings by under 1 %; it is a convenience, not a strategy).
- L1 (important; owner loop; the lead (ruling 21.3)): Five of 64 steps of the walk fail: the crane (E5), the baler (-3.4 %), the driver's level and the farm's level at rung 3, the demolition's level on day 3.
  RULING: Each failing step but the crane's with its smallest example: why does the yard keep less after it. Where the cause is the driver's choice of load, measure the rank of ruling 16.5 at stage 2 with the bots' owner (it stays unshipped at stage 1) and say whether it ships from the works' opening; the baler's step is the works' owner's if the cause is in the baler's feed (a line in requests.md).
- L2 (minor; owner content; the lead (ruling 21.6)): A content variant without the lead line has eight materials while rung 5 asks for nine: a dead end the build accepts.
  RULING: The build refuses a content in which a rung asks for more materials than its plates and partners can supply at that rung (with E4 (c): and at a rate that reaches the rung's worth). A selftest case for the refusal.

ORDER OF WORK: engine step 4 is merged first (its gate is the recorded results of the old engine,
which the rule changes below would break); then one pass of fixes by four owners (money and content
may start at once: their files are not the engine step's); then the bots measure the stage again
(prices with a played hour, 21.1; the crane pair; fifteen seeds), a confirmation by engineers who
wrote none of it, and the specification is brought into step.

20.5 ENGINE STEP 4 (27 November, about 02:40): built in its own working copy, checked by an engineer
    who wrote none of it against the engine before steps 3 and 4 (137 cases, 1,684 computations,
    144,324 comparison points: 0 differences; no writer goes past the index; no cache could be made
    stale), merged into the working line (1bfb34a). Six hours away in node, before steps 3 and 4 /
    after step 3 / after step 4: the first yard at minute 120 with the Night watch 331 / 290 /
    267 ms; stage 2 at rung 4 with seven plates 2,806 / 1,204 / 966 ms. The aims of 20.1 are still
    not met and the profile is flat (departures that set out and plan a run, and their landings).
    From now on every change of the things or the pieces goes through lookup.ts's writers. What is
    left for a later step: planning a run more cheaply, and the oversize pieces weighed where they
    are cut (finding X3: thousands of fragments on the floor cost a tick 2.3 ms at rung 5).

### 23. The one pass of fixes on stage 2 (27 November, from 02:30): what the owners handed back for a ruling

23.1 THE FAIR DRIVER AT TWELVE TRIPS (E4 (a)). Built as ruled (from the works' opening no open
    partner's full skip waits more than N trips; a count a partner; tick, jump and time away agree;
    the first yard plays byte for byte the same), it reached rung 5 with the bridge partners
    levelled, but at N = 4 it cost the normal hand 25 to 28 % of lifetime earnings by day 6 (trips
    spent on poorer loads). `truck.fairAfter_trips` is 12: the normal hand is unchanged, the
    bridge-partner play reaches rung 5 at 6 % less, and the build's supply check still passes
    (rung 5: light iron within 29.4 h of 49). The attacker's dead end did not reproduce on the tree
    as it stood when the rule was built, with the rule off; the confirm step looks for it again.
23.2 NET IS WHAT THE CASH MOVED. The away card's net is sold less loads less the bank's share (it
    was sold less loads, with the bank's share on its own line: a card that prints NET alone
    overstated the cash while an agreement was open). The sold total stays gross and the bank's
    line stays beside it. It replaces the sentence of 2.14.4 and 2.17. The first yard has no bank:
    its card is unchanged.
23.3 WHAT WAS PAID FOR SURVIVES A RESTART (M3): the shared store's reset hands the game the player
    had to the mode (`EngineMode.onReset`, optional: the four other games are unchanged); the yard
    keeps the entitlements, the age band, the packs-hidden lock and a chosen look that is an owned
    product, and loses the cash, the yard and a purchase still waiting, as its card says. Tested
    through the real store at both stages.
23.4 RATED INCOME (E6, E7, 19.2, 21.4). From the works' opening rated income is the best replay over
    the yard's effective assets and partner loads are ranked by net per truck-second; over the
    attacker's 597 purchase steps it now falls on 6 (it fell on 38): not yet "never". The advice
    line names the shortest payback within τ_r and matches the attacker's best buy at 3 of his 5
    moments (at two it names the garage, which rated income overrates). Both wait for ONE more
    step, the calibration of rated income against the bots' measured gains (every plate's term,
    the hands' carrying, whole things, the van; the band of 14.10; no fall at any purchase step of
    the bots' runs), which follows the bots' second measurement. Until then nothing is priced
    from a term that is known to be wrong: a partner's level is priced from its own rated gain
    (E3), which the attacker measured at a tenth to a quarter of what the yard keeps.
23.5 PACKS AGAINST HEADROOM (M5): on states played under the old prices the 20-hour pack never
    fits and the 10-hour pack only at rung 4's entry with no cash. Read again on the bots' second
    measurement (partner levels now cost what they earn, so headroom is larger); a pack that still
    never fits at an ordinary moment is taken off the list of ruling 9.1.
23.6 A SAVE THAT HAS SEEN STAGE 2, IN A BUILD AT STAGE 1 (X6), as built: the stage's dates are
    moved on by the time the first yard ran (a thawed save goes on from where it froze); a crew
    member caught on stage-2 work is made idle and his load put on the tipping floor; a first-yard
    partner's waiting skip keeps its works-layer things aside. Accepted.
