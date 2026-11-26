# Scrapyard: the lead's decisions, in the order they were made

This file keeps the three sets of decisions that the specifications refer to by number, so that a
later stage can be designed without the working folder they were written in. Order of authority for
the first yard: part 2 and part 3, then section 14 of `yard-design.md` (D1 onwards), then its text,
then part 1, then the first-yard document. File names inside the parts (`RULING.md`, `ECONOMY.md`,
`STAGE1-RULING.md`, `proto/...`, `stage1-critiques.json`) are those of the working folder; the texts
are complete here.

- Part 1: the ruling on three competing designs (points 1 to 16), before the specification.
- Part 2: the first yard's economy after the first numbers prototype (E1 to E36).
- Part 3: the first yard after its review (S1 to S24).
- Part 4: the first yard's map after the review of the built game (M1 to M7).
- Part 5: the rulings on the review of the built game, by finding (S, R, H, P, W, L).
- Part 6: the owner's decisions of 26 November (purchases limited to looks and scrip, bank loans,
  investments, yard sales, companies in the manner of neighbourhoods) and the lead's ruling on them
  (sections 1 to 8). The specification carries it as D20 to D68 in its section 14, and its amended
  passages are marked [26 Nov].

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

(Part 6. The ruling as the lead wrote it, `RULING2.md` in the working folder, complete; the
proposals, the judges' notes and their verdicts are `design2/proposal-*.md`, `notes/judge2-*.md`
and `design2/verdicts.json` beside it.)

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
