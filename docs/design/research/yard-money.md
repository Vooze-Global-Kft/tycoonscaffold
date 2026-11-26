# Scrapyard: What a game earns when it sells cosmetics and currency (farm sims, tycoons and idle games)

Researched on 26 November 2026 by web search and by reading the pages themselves: the US App Store listings of six games (read today, prices in US dollars), the public game-pass list of one Roblox game (read today through Roblox's public web API), publishers' help pages and blogs, two market-data reports and three analysts' deconstructions. Google Play's listing pages were read with a script that took the first price range on each page; those ranges are marked "Play, parsed" because the page also carries other apps' data. Supercell's support pages would not load (they render by script), and two vendor blogs refused the reader; claims that rest on them are marked "search extract only". Marks used: **VERIFIED** (I read it today on the page named), **REPORTED** (a secondary source says so, read today), **ESTIMATE** (a market-data firm's or analyst's modelled number, not the publisher's), **OPINION** (an analyst's or developer's view), **INFERENCE** (my reasoning). This file does not repeat the law or the store rules: it names risks and leaves them to `yard-policy2.md`. The game's currency is "scrip" (§), from the names register.

---

## 0. The answer first

1. **Every leading game in our genre sells currency on the same short ladder**: $1.99, $4.99, $9.99, $19.99, and then $39.99 or $49.99 or $99.99, with a few percent more currency per dollar at each step (VERIFIED on five listings). Beside the ladder sit a first-purchase bundle ($1.99 to $7.99), a "no ads" purchase ($4.99 to $14.99), and in four of six games a monthly pass ($4.99 to $10.99).
2. **Idle and tycoon games sell their earned money in units of the player's own time**, not as fixed sums: "1 day", "7 days", "14 days" of the player's current profits (AdVenture Capitalist, VERIFIED), "12 hours, 1 day, 3 days" (Idle Miner Tycoon, REPORTED). This is the only way a fixed price stays fair when in-game prices grow a thousandfold, and it is how our scrip should be sold.
3. **The paid currency is mostly a time currency** (skips, slots, early unlocks, multipliers); cosmetics are a minority use. Play gives it away in small amounts, and "most players are saving their Super Cash for a rainy day" (Kolibri, 2020).
4. **Cosmetics are a strong driver in town and farm builders** where other players see your place (Township: decorations are "a strong monetization driver" though they do nothing, OPINION, Deconstructor of Fun, 2020). I found **no published share of revenue from cosmetics** for any sim or tycoon.
5. **In idle games, ads earn more than purchases**: 60 to 70 % of revenue from ads (Gamesforum Intelligence, 2025, no method given). In ad-led hybrid games the "no ads" purchase is often the single biggest purchase (about half of one game's purchase revenue, ESTIMATE, Naavik 2023).
6. **Ranked games that sell power protect the ranks with leagues by strength and caps in the ranked mode.** The best-known revolt over paying to win (Battlefront II, 2017) ended with every purchase switched off the night before launch (VERIFIED).
7. **For our game**: one paid currency, earned in play as well; it buys looks and "hours of your own income", never tonnes; scrip packs sized in hours of the player's own rated income; a "no ads" purchase that grants every ad reward at once; a first-purchase bundle; cosmetics that are seen on tours and the company page. The three levers: **the "no ads" purchase, the first-purchase bundle, and visible cosmetics** (section 6).

---

## 1. Six catalogues as listed today

All prices are the US App Store's "In-App Purchases" list, which shows at most ten items, read 26 November 2026 (VERIFIED). The list is the store's top items, not the whole shop.

| Game (kind, seller) | Earned / paid currency | Currency ladder (US $) | First buy and offers | No ads | Pass or subscription | Rating and notices (Apple) |
|---|---|---|---|---|---|---|
| **Hay Day** (farm sim with neighbourhoods of up to 30, Supercell) | coins / diamonds | Pile 1.99, Bag 4.99, Sack 9.99, Box 19.99, Chest 39.99 | "Special Offer" 1.99, 4.99, 9.99 | none listed | Farm Pass 4.99; Farm Pass Bundle 11.99 | 9+; contains Loot Boxes, Advertising, Messaging and Chat |
| **Township** (co-op town builder, Playrix) | coins / Township cash | Tiny 1.99, Small 4.99, Medium 9.99, Large 19.99 | Beginner's Bundle 1.99; Standard Bundle 6.99; Boost Bundle 5.99; Offer 3.99; Piggy bank 2.99 | none listed | Golden Ticket 4.99 | 13+; Contests (frequent), Loot Boxes, Messaging and Chat |
| **Idle Miner Tycoon** (idle tycoon, Kolibri) | idle cash / Super Cash | Bundle 1.99, Pile 4.99, Bag 9.99, Small Chest 19.99 | Starter Package 2 4.99; Event Offers 2.99, 19.99; Chest Offer 2.99 | sold (a review mentions it; not in the top ten) | Premium Pass Offer 9.99 | 13+; Loot Boxes, Advertising |
| **AdVenture Capitalist** (idle tycoon, Hyper Hippo) | cash, angels / gold bars, Mega Bucks | 20 gold 1.99, 55 gold 4.99, 115 gold 9.99, 240 gold 19.99 | First Time Buyer Bundle 3.99 and 7.99; Insider Deal 3.99; Extra Gold 4.99 | 30 Day Ad Removal Pass 14.99 | Gold Subscription 9.99 | 9+; Loot Boxes, Advertising |
| **Eatventure** (idle restaurant, Lessmore) | cash / gems | Tiny 2.19, Small 5.39, Medium 10.99 | Daily Offer 0.99; Small and Big Event Offer 5.39, 26.99; chest offers 2.19, 13.99 | (not in the top ten) | Event Pass 10.99; Permanent Boost 5.39 | 13+; Loot Boxes, Advertising |
| **My Perfect Hotel** (arcade idle, SayGames) | cash / gems | Handful 1.99, Pile 4.99, Stash 6.99, Bag 9.99 | Daily Endless Offer 1.99; Candy Offer 2.99; "Get a Pet Forever!" 2.99 | No Ads 9.99 (and "No Ads 20%" 7.99); "Turn off ads forever & get daily rewards" | none listed | 18+ shown today (cartoon violence, alcohol references, infrequent); Advertising |
| **Lumber Tycoon 2** (hands-on resource tycoon on Roblox, Defaultio) | in-game money / Robux (Roblox's own) | no currency sold | none | n/a | three permanent game passes: Super Blueprints 720 Robux ("fill any blueprint instantly"), Super Hoove 390 (ferry without a ticket), Super Bridge 220 (bridge down for free, for longer) | Roblox rating not read |

Google Play price ranges per item (Play, parsed, 26 November 2026): Hay Day $0.29 to $239.99; Township $0.99 to $149.99; Idle Miner Tycoon $0.49 to $99.99; My Perfect Hotel $0.99 to $99.99. Downloads: Hay Day, Idle Miner Tycoon and My Perfect Hotel 100M+, Township 500M+ (Play, parsed).

What the table shows (INFERENCE):

- **The ladder is genre-common**, not anyone's signature: four or five steps from $1.99 to $19.99 or $39.99. We may use the shape, with our own names and amounts.
- **The extra currency per dollar is small.** AdVenture Capitalist gives 10.1 gold per dollar at $1.99 and 12.0 at $19.99: about +10 %, +15 % and +19 % at the upper steps (computed from the listing). The big "value" numbers in these games sit on bundles and first-purchase offers, not on the plain packs.
- **"No ads" is priced high when ads carry the game**: $9.99 (My Perfect Hotel), $14.99 for 30 days (AdVenture Capitalist), 13.99 CAD in Idle Restaurant Tycoon in 2021 (GameRefinery, below). `yard-genre.md` found $3.99 to $12.99 in scrapyard-themed games.
- **Passes are everywhere but are not cosmetics or currency.** They are the biggest revenue events in Township and Hay Day (section 3). Under the owner's rule they are out unless he says otherwise (section 6.6).
- **Lumber Tycoon 2, the owner's model**, sells no currency at all: three one-off conveniences. A Roblox game also earns from Roblox's own payouts, so its catalogue is not a model for a phone store game.
- **Every phone listing except My Perfect Hotel shows "Loot Boxes".** We sell nothing random (`policy.md` §0), which is a difference we can state.
- Apple's ratings shown today range from 9+ to 18+ (My Perfect Hotel); I did not check why. Ratings are for `yard-policy2.md`.

---

## 2. Selling earned money when prices grow a thousandfold

### 2.1 What the games do

- **AdVenture Capitalist** (VERIFIED, the publisher's help page): a "Time Warp" pays a span of the player's own profits at once. The shop sells 1 day for 10 gold, 7 days for 25 gold and 14 days for 40 gold; the "Time Warp Express" gives "3 hours of profits instantly", and ten more cost 50 gold. The total is shown under the item before buying. The page warns that when profits are maxed "the 7 Day Time Warp will be a waste!" At the $9.99 rate (115 gold), a 7-day warp costs about $2.17 and a 1-day warp about $0.87 (computed).
- **Idle Miner Tycoon** (REPORTED, BlueStacks guide, 23 January 2024): the shop's "Instant Cash" section sells 12 hours, 1 day and 3 days of the player's current profit, bought with Super Cash. The same guide lists boosts that multiply all profits by 2, 5 or 10 for a while, from a shop whose stock refreshes every 24 hours.
- **Township** (OPINION and REPORTED, Deconstructor of Fun, 2020): coins are the soft currency but "the only option to purchase more coins is spending money"; the cash buys timer skips, and the "Piggy Bank" (paid cash that builds up as you ship goods, unlocked by paying) gives "by far the most bang for your buck".
- **Kolibri** (publisher's blog, 21 September 2020, VERIFIED): Super Cash "allows players to jump forward through the core loop, saving time".

### 2.2 What the paid currency buys

| Game | What the paid currency buys (source) |
|---|---|
| Hay Day | speed-ups, extra production and shop slots, hiring the helper, crafting nets, decorations (PocketGamer guide, 1 December 2020, REPORTED; decorations from a search extract) |
| Idle Miner Tycoon | removing barriers, building shafts, instant cash, boosts, pets (guide 2024 and a store review, REPORTED); "x2 profit multiplier for 2500 Super Cash" (store review, REPORTED) |
| AdVenture Capitalist | time warps, managers, multiplier tickets ("Purchase more Gold, Time Warps, or specific Managers", listing, VERIFIED) |
| Township | skipping timers, comfort items at the market (Deconstructor of Fun, OPINION) |

Cosmetics are a small use of the paid currency in idle games; in Hay Day and Township decorations sit beside the time uses.

### 2.3 How fast play gives it away

- **Hay Day** (PocketGamer, 1 December 2020, REPORTED): sources open level by level: occasional single diamonds on level-up, "single-digit diamonds" per achievement, diamonds on the event board and at derby thresholds, a daily free wheel spin, and the mine, where "You can excavate a maximum of ten diamonds per day." A trailer near the mailbox can pay diamonds (an ad).
- **Idle Miner Tycoon** (Kolibri, 2020): Super Cash comes free from "advancement, daily, expedition, and event mine rewards", and most players hoard it.
- I found **no published number** for the share of paid currency that players get free in any of these games, or for the free amount per day as a share of a pack.

**INFERENCE for us.** A pack sized in hours of the buyer's own income works at every point of a thousandfold curve, and the buyer sees the amount before paying (our rule: shown equals applied). It must be capped by what the yard can hold or use, or the AdVenture Capitalist "waste" case appears. Free paid currency should come from milestones (rungs, the foundry series, the company order), not from a daily login stream, which adds a return reward (a rating point in `yard-policy.md` §5).

---

## 3. Cosmetics in sims and tycoons

### 3.1 What sells

- **Decorations** for the home base: Township has "one of the most extensive decorative lists", and "the customization and decorations have no impact on the gameplay, it is still a strong monetization driver" (OPINION, Deconstructor of Fun, 2020).
- **Skins and outfits** in passes: Township's pass rewards are themed decorations, building skins and "animal outfits" (store text, search extract); Hay Day's Farm Pass includes "unique hats for farm animals" and "exclusive farm decorations" (a retailer's page, search extract); My Perfect Hotel's update notes promise "exclusive character skins" from an event pass and its leaderboard (VERIFIED, listing).
- **Pets** as a one-off purchase: "Get a Pet Forever!" $2.99 (My Perfect Hotel, VERIFIED).
- **How common**: GameRefinery's study of the top 200 grossing iOS games (April 2021) found decorative skins in "44% of the top 20% highest-grossing US games" and in 50 % in China, and said they let players "express themselves without affecting the game's balance" (REPORTED, Game World Observer, 19 April 2021). This is a count of games, not a share of revenue.

### 3.2 Their share of revenue

**Not found.** No publisher or market-data firm I could read gives the share of revenue from cosmetics in a farm sim, town builder or tycoon. A 2025 Finnish thesis has a section titled "Functional items are more central to monetisation than cosmetics" (table of contents only, not read). The nearest numbers are about passes, which mix cosmetics with production perks:

- Hay Day's Farm Pass (December 2020): spending "increased by 62 percent M/M to approximately $14 million" (ESTIMATE, Sensor Tower, April 2021, VERIFIED on the page).
- Township's pass (November 2019): spending up "more than 22 percent M/M to $29.8 million", and "almost every new Season has led to a surge" (ESTIMATE, Sensor Tower). Deconstructor of Fun: the Gold pass ($5.99 then) gives "an extra 30% Barn space", and "the highest revenue spikes in Township's recent history occurred in Gold pass release days" (OPINION).

INFERENCE: the passes that sell best in this genre sell production as well as looks. A pass with looks only would earn less, by an unknown amount.

### 3.3 How games make cosmetics seen

From memory, not verified today: Hay Day and Township let players visit each other's farms and towns from the member list and the market; Lumber Tycoon 2's bases stand on a shared server. VERIFIED: Township's regatta is "a periodic competition against other Co-ops/teams for rewards and global ratings" for full teams of 30 (Deconstructor of Fun); My Perfect Hotel ties skins to a leaderboard.

INFERENCE for us: our tours (yard-design.md 7.3) are the shop window. Liveries on trucks seen on a tour, the company emblem on every member's row, a plaque at the gate, the crew in company colours on the listing day each put a bought look where others meet it.

---

## 4. Selling currency in a ranked game without wrecking the ranks

### 4.1 How the genre protects ranks

- **Leagues by strength.** Hay Day's derby has five leagues, each with its own number of tasks and rewards; the lowest is Rookie with five tasks (Supercell support page, search extract only; the page would not load). A later update added a Champions League with its own leaderboard (REPORTED, GameZone, from a search extract). Egg, Inc. gives each player a grade from C to AAA from their bonus and recent contracts, and contracts are played within the grade (fan wiki, REPORTED); its support page says "Contracts can only be played in a co-op, even if its a co-op of 1" (VERIFIED, modified 20 May 2026).
- **Caps in the ranked mode.** Clash Royale capped "All Card Levels and Tower Power... at 11, across all Leagues" in its ranked ladder, so that "cards above Level 11 will be played at Level 11" (VERIFIED, Supercell blog, 31 March 2023). The post gives no reason. Later the cap rose to level 15 for the top leagues (REPORTED, RoyaleAPI, December 2023).
- **Co-op goals rather than individual races.** Hay Day's derby and Township's regatta score the group's tasks.

### 4.2 Revolts and what changed

| Case | What players objected to | What the publisher did | Source |
|---|---|---|---|
| Star Wars Battlefront II (console, 2017) | progression bought with currency and random crates | "We've heard the concerns about potentially giving players unfair advantages... we're turning off all in-game purchases" the night before launch; told investors it would have no "material impact" on guidance | TechCrunch, 16 November 2017 (VERIFIED); Game Informer, 20 November 2017 (VERIFIED) |
| Diablo Immortal (phone, 2022) | loot boxes and "a PvP mode 'ruined by pay to win'"; one estimate put a fully upgraded character at up to $110,000 | defended the model (the president said the content is "99.5%" free, search extract only); no change to PvP found | VGC, 6 June 2022 (VERIFIED); user score 0.8 at the time |

INFERENCE: both revolts were over random items bought for power in player-against-player modes, not currency in a co-operative tycoon. Our risk is narrower: a board that money visibly moves.

### 4.3 What this means for our ranks (INFERENCE)

- In our design the ranked unit is **tonnes**, not scrip. Scrip bought as currency adds no tonnes directly; it buys capacity, which adds tonnes later. That is the same effect the design measured for list B (an "Early cover" buyer at 1.76 × a non-buyer's lifetime tonnes at day 14, section 8), and it must be measured again for scrip packs.
- **Weekly brackets** (7.3) are banded by capacity derived on the server from all accepted assets, bought ones included, and each day is credited at most to the band's top. A buyer moves up a band. That board stays money-proof as designed.
- **The all-time board** (lifetime tonnes in cohorts) is the one money can move. Choices for the lead: (a) accept, measure the buyer's lead and print the store sentence that says so; (b) make the all-time board rank something money cannot move (weekly finishes, pennants, the company order's tiers); (c) cap how many hours of income one day's purchases can bring (a quantity cap may count as a quantity-limited offer: a risk for `yard-policy2.md`).
- **Company boards**: the listing's valuation counts members with 7 days of accepted play and a share of the company's tonnes (7.3), so one paying member cannot carry a company far. Keep that.

---

## 5. Ads beside purchases

### 5.1 Shares of revenue (all with dates)

| Figure | Kind | Source |
|---|---|---|
| Idle games: "Monetization relies heavily on ads (60-70% of revenue) with modest IAP" | ESTIMATE, no method given | Gamesforum Intelligence, casual gaming report (file dated May 2025, posted July 2025), read in the PDF |
| One idle developer, about 2019: roughly 60 % of revenue from ads | REPORTED | `genre.md` §5, source [1] there |
| Arcade idle: some reached 20 % of net revenue from purchases, against about 2 % in hyper-casual | REPORTED, search extract only | industry piece found by search, not opened |
| Hybrid-casual titles at Homa: weaker ones 15 % from purchases, top ones up to 40 % | REPORTED (co-founder, via Deconstructor of Fun, April 2023) | Naavik, 28 September 2023 |
| Dreamdale: 63 % ads / 37 % purchases; Mob Control 85/15 (Voodoo's own figure); Collect 'em All 25/75 | ESTIMATE (author's model on data.ai, July 2023) except Voodoo's | Naavik, 28 September 2023 |
| Market-research sites: purchases 55 % to 74 % of idle-game revenue in 2025 | ESTIMATE, low quality, mutually inconsistent | search extracts only |

Plain reading: for an idle game with a small team and no live events, **ads are the larger half**; purchases grow with offers, passes and events, which we limit.

### 5.2 Rewarded placements and caps

- **Placements**: double the away money on relaunch; a visitor every two to three minutes offering a boost; skip to morning for one video; up to 12 videos in a row to stack a boost; players "can easily watch 20–40 ads per session" (GameRefinery on Idle Restaurant Tycoon, 12 January 2021, VERIFIED; the count is the author's OPINION).
- **Caps**: one idle farm game (Hempire, LBC Studios) capped rewarded videos at 10 per user per day; raising one placement to 20 a day lifted that placement's ARPDAU by 37 % and the share of players using it by 80 % (VERIFIED, Unity case study, 31 January 2024; a vendor's case study). Microsoft's PlayFab guide calls 3 a day per player common; CrazyGames suggests up to 5 (search extracts only).
- **Engagement**: 25 to 50 % of users watch, 3 to 8 a day; idle examples about 25 to 35 % of users, 4 to 5.5 a day each (Kongregate's blog, search extract only; the page returned 404 today).

Our design caps ad rewards at 4 % of a day's income and five a day (D7, section 8). That is far below the genre's volume. INFERENCE: it keeps the game fair and calm, and it means our ad income per player will sit well under these benchmarks. The lever, if the owner wants more ad income, is more placements with small named rewards, not bigger rewards.

### 5.3 What a "no ads" purchase does

- In ad-led games it is often the **top purchase**: Dreamdale's "Ad-free Adventure" was "about 50% of IAP revenue" (ESTIMATE, Naavik 2023 on data.ai); in one ad-led hybrid-casual game, no-ads was 17 % of purchase revenue and currency packs 3 % (REPORTED, `meta.md` source [17]).
- In rewarded-only games it **grants the reward without the video**: "No more ads: Claim rewards instantly" (Idle Restaurant Tycoon, 2021); "Turn off ads forever & get daily rewards" (My Perfect Hotel, today). AdVenture Capitalist now sells it as a 30-day pass ($14.99) and calls the products "AdSkip Passes" (VERIFIED, version notes).
- Effect on ad revenue: the buyer stops earning ads for good. GameRefinery's author argues the price must exceed the ads that buyer would have watched, and that keeping such a player may raise later purchases (OPINION, no data). I found no published measurement of the net effect.

---

## 6. For the designers: a catalogue limited to cosmetics and currency

"Etc." is read narrowly, as the lead asked: currency, cosmetics, a "no ads" purchase, and fixed bundles of those. No passes, no subscriptions, no unlocks of what play unlocks later (list B's items), nothing random, nothing timed. All names below are placeholders for the names register (D13); all numbers are starting points for the numbers prototype, not tuned values.

### 6.1 The currencies

- **Scrip (§)**: earned, as now. Never sold as a fixed sum.
- **One paid currency** (placeholder "bars"; one paid currency, never expiring, never moved between players, real-money price shown beside every price: `policy.md` §2 and `yard-policy.md` §6). Recommended because it lets one ladder serve both looks and time, and play can give it away. Without one, every look and every pack is priced in dollars directly, which is simpler and honest but gives play nothing premium to hand out.

What bars buy:

| Use | How it works | Why |
|---|---|---|
| **Scrip in hours of your own income** | "4 h of income: §X" where X = the yard's rated income I × 240 min, fixed when the card opens (shown equals applied); steps 1 h, 4 h, 12 h, 24 h; refused when it would overflow what the yard can use (as AdVenture Capitalist warns) | stays fair on a thousandfold curve; the owner's "currency" |
| **Cosmetics** | liveries, decor, crew workwear, gate plaques, company emblem parts, the bell-ringing set | seen on tours and the company page |
| **Not**: tonnes, rank, away hours beyond play's cap, a rung, market power, bought metal at a better price | | the ranks and the trade stay earned (L4, 7.5) |

Speed-ups of builds are a third use common in the genre; the design has "Nothing costs by the clock" (ruling 9), so there is nothing to speed up, and we should not add timers in order to sell skips.

How play earns bars (INFERENCE, to tune): a few at each rung, at each foundry piece, at the company order's tiers and at a weekly pennant. Aim: a player who never pays can afford one small look a week and one 4-hour pack every few days. No daily login stream (a return reward is a rating point). Ads do not pay bars (D7: ad rewards are currency only, scrip).

### 6.2 The price ladder (starting points)

| Product | Price (US $) | Contents | Notes |
|---|---|---|---|
| Bars, small | 1.99 | 100 | base rate |
| Bars, medium | 4.99 | 260 | about +4 % per dollar |
| Bars, large | 9.99 | 550 | about +10 % |
| Bars, crate | 19.99 | 1,150 | about +15 % |
| Bars, container | 49.99 | 3,000 | about +20 %; the top step (genre runs to $99.99 or more; a lower top is a choice we can make) |
| **No ads** | 6.99 | every ad reward at once, same limits and caps; plus 100 bars once | genre $4.99 to $14.99; the design had $4.99 |
| **Founder's bundle** (first purchase, always on sale, no timer) | 4.99 | a yard livery + 300 bars + a gate plaque | the genre's first-buy offer without a clock |
| Livery sets | 2.99 each, or bars | six schemes for trucks and crane (design's item) | |
| Company emblem set | 1.99, or bars | extra shapes, glyphs, colours | |
| Decor packs | bars only | yard decor by theme (signage, flags, lamps, a mascot dog) | |

Hour packs priced in bars (starting points): 1 h 20 bars, 4 h 60, 12 h 150, 24 h 260. At the large pack's rate, 4 hours of income cost about $1.09. AdVenture Capitalist's 1 day costs about $0.87 at its $9.99 rate (computed above). Ours are dearer per hour because our away cap is shorter; the prototype sets them against the buyer's measured lead (6.4).

### 6.3 The three levers that matter most within this limit

1. **The "no ads" purchase**: price and contents. In ad-led games it is the largest single purchase. Because our ad rewards are small, its value to the player is small too; bundling bars into it is what makes it worth $6.99.
2. **The first purchase**: a fixed founder's bundle that is plainly the best value in the shop, always available. The genre's first-buy offers are its most common purchase type; ours carries no countdown.
3. **Cosmetics that others see**: tours, the company page, the listing day and company colours. Without visits there is little reason to buy a look; with them a look is status. This is the lever the owner's Hay Day model points to.

Second order: the hour-pack sizes (too small and nobody buys, too big and the all-time board tilts) and the free rate of bars (too generous and nobody pays).

### 6.4 What must be measured before tuning (INFERENCE)

- A buyer who spends $5, $20 and $50 in week 1 against a non-buyer: lifetime tonnes at days 7, 14 and 30. The design's guard for list B was a measured ratio the owner decides on; the same applies.
- That the weekly bracket stays money-proof with hour packs (it should: capacity bought counts in D).
- That no hour pack can be used to beat the away cap, and that a pack's shown scrip equals the scrip paid.

### 6.5 What would raise the age rating or break a store rule (risks named, rules left to `yard-policy2.md`)

| Risk | Why it is a risk |
|---|---|
| Any random contents (a "mystery crate" of looks) | paid random items: higher ratings, odds duties, bans in some countries (`policy.md` §0 and §1) |
| Timed or limited offers ("this week only", countdowns, "only 3 left") | PEGI's 2026 criteria put time- or quantity-limited offers at 12; EU rules on false urgency (`yard-policy.md` §5, `policy.md` §2) |
| A daily cap on how much can be bought | may count as a quantity-limited offer: ask `yard-policy2.md` |
| Bars or bought looks moving between players, or gifting inside a company | Apple and Google rules on gifting and currency; a path to resale and to pressure on minors (`yard-policy.md` §6) |
| Bars that expire, or bought scrip lost at a reset | Apple: bought currency may not expire |
| A daily login stream of bars | a reward for returning: PEGI 7, and 12 if absence is punished |
| Prices in bars without the money price beside them | EU consumer principles on virtual currency (`policy.md` §2) |
| A season pass or subscription | outside the owner's limit; a pass sold for a season may also be a time-limited offer |
| "Yard sales" read as shop sales (discount days) | if the owner meant discounts, these are timed offers (above). If he meant selling yards in the game, it is not a money question. **Ask the owner which he meant.** |
| Bank loans or investments bought with real money | anything that reads as real lending or investing crosses L4 and the simulated-money rules (`yard-policy.md` §1); loans and holdings must use scrip only and be designed by the economy designers |
| Store text that claims "never pay to win" while bought capacity moves the all-time board | misleading marketing (Apple 2.3.1, `yard-policy.md` §6) |

### 6.6 Decisions for the lead

1. One paid currency or none (recommended: one).
2. What happens to the all-time board when hour packs exist (section 4.3: accept and measure, rank only what money cannot move, or cap).
3. Whether the owner's "etc." includes a pass. Passes are the genre's biggest revenue spikes (section 3.2) but are not cosmetics or currency, and carry a timing risk. Recommended: ask the owner; build without.
4. What "yard sales" means (shop discounts or a game system).

### 6.7 Genre-common and signature

- Genre-common (free in our own words and numbers): a four- or five-step currency ladder, packs of the player's own income in hours, a first-purchase bundle, "no ads" that grants rewards, decor and liveries, leagues by strength, caps in ranked play, groups of 30 with a weekly goal.
- Signatures to avoid: other games' product and event names ("Time Warp", "Super Cash", "Farm Pass", "Golden Ticket", "Piggy Bank", "Derby", "Regatta"; pack names Pile, Bag, Sack, Chest) and their art.

---

## Where I found no data

- Any published share of revenue from cosmetics in a farm sim, town builder, idle or tycoon game.
- The share of paid currency that players receive free, or the free amount per day, in any of these games.
- A publisher's own split of ads and purchases for any idle or tycoon game after 2019 (only modelled estimates and one Voodoo figure for a different kind of game).
- The measured effect of a "no ads" purchase on a player's later purchases or on total revenue.
- The full current shops of these games (the App Store lists only ten items; I did not install games).
- Supercell's own derby league rules (its support pages would not load) and any Hay Day statement on what the Farm Pass contains.
- A case of player revolt over paying to win in a co-operative tycoon or farm game.

## Sources (all read 26 November 2026 unless marked)

1. Hay Day, US App Store: https://apps.apple.com/us/app/hay-day/id506627515
2. Township, US App Store: https://apps.apple.com/us/app/township/id638689075
3. Idle Miner Tycoon, US App Store: https://apps.apple.com/us/app/idle-miner-tycoon-gold-games/id1116645064
4. AdVenture Capitalist, US App Store: https://apps.apple.com/us/app/adventure-capitalist/id927006017
5. Eatventure, US App Store: https://apps.apple.com/us/app/-/id1600871388
6. My Perfect Hotel, US App Store: https://apps.apple.com/us/app/-/id1635760774
7. Lumber Tycoon 2 game passes, Roblox public API: https://apis.roblox.com/game-passes/v1/universes/2471084/game-passes?passView=Full&pageSize=50 (game page https://www.roblox.com/games/13822889/Lumber-Tycoon-2)
8. Google Play listings (parsed): https://play.google.com/store/apps/details?id=com.supercell.hayday , ...id=com.playrix.township , ...id=com.fluffyfairygames.idleminertycoon , ...id=com.master.hotelmaster
9. AdVenture Capitalist help, time warps (publisher): https://screenzilla.helpshift.com/hc/en/5-adventure-capitalist/faq/34-what-s-the-deal-with-all-these-time-warps
10. Kolibri Games, "Economy in free-to-play mobile games, part 2", 21 Sep 2020 (publisher): https://kolibrigames.com/blog/economy-in-free-to-play-mobile-games-part-2/
11. Kolibri help, currencies (publisher): https://kolibri-games.helpshift.com/hc/en/3-idle-miner-tycoon/faq/55-what-are-the-different-types-of-currency-in-the-game
12. BlueStacks, Idle Miner Tycoon currency guide, 23 Jan 2024 (secondary): https://www.bluestacks.com/blog/game-guides/idle-miner-tycoon/idt-currency-guide-en.html
13. PocketGamer, "Hay Day: All the ways to get free diamonds", 1 Dec 2020 (secondary): https://www.pocketgamer.com/hay-day/hay-day-all-the-ways-to-get-free-diamonds
14. Deconstructor of Fun, "How Playrix' Township Became a Billion Dollar Game", 2020 (analyst): https://www.deconstructoroffun.com/blog/2020/10/13/how-playrix-township-became-a-billion-dollar-game
15. Sensor Tower, battle pass success stories, April 2021 (market data): https://sensortower.com/blog/battle-pass-success-stories-2021
16. Game World Observer on GameRefinery's revenue drivers, 19 Apr 2021 (secondary on market data): https://wnhub.io/news/finance/item-44845
17. Gamesforum Intelligence, casual gaming report, 2025 (market report, PDF): https://investgame.net/wp-content/uploads/2025/07/Gamesforum-Intelligence-Casual-Gaming-Report.pdf
18. Naavik, "Evolution of hybridcasual", 28 Sep 2023 (analyst): https://naavik.co/deep-dives/evolution-of-hybridcasual-deepdive/
19. GameRefinery, "Masters of ad-placements: Idle Restaurant Tycoon", 12 Jan 2021 (analyst): https://www.gamerefinery.com/masters-of-ad-placements-idle-restaurant-tycoon-empire/
20. Unity, LBC Studios case study, 31 Jan 2024 (vendor): https://unity.com/resources/lbc-studios
21. Kongregate, best practices in game ads (404 today; search extract only): https://blog.kongregate.com/best-practices-in-game-ads
22. Supercell, Clash Royale "Mega Draft in Path of Legends", 31 Mar 2023 (publisher): https://supercell.com/en/games/clashroyale/blog/news/mega-draft-in-path-of-legends
23. RoyaleAPI, level 15 in Path of Legends, Dec 2023 (search extract only): https://royaleapi.com/blog/pol-elite-level-december-2023
24. Supercell support, Hay Day leagues and derby (would not load; search extract only): https://support.supercell.com/hay-day/en/articles/leagues.html , https://support.supercell.com/hay-day/en/articles/about-the-derby.html
25. Auxbrain support, Egg, Inc. co-ops, modified 20 May 2026 (publisher): https://auxbrain.freshdesk.com/support/solutions/articles/47001170222-how-do-i-join-a-co-op-
26. Egg, Inc. fan wiki, contracts (search extract only): https://egg-inc.fandom.com/wiki/Contracts
27. TechCrunch, Battlefront II purchases removed, 16 Nov 2017 (press): https://techcrunch.com/2017/11/16/hours-before-launch-ea-strips-micro-transactions-from-star-wars-battlefront-ii/
28. Game Informer, EA statement to investors, 20 Nov 2017 (press): https://www.gameinformer.com/b/news/archive/2017/11/20/ea-says-battlefront-ii-microtransaction-change-will-not-affect-earnings.aspx
29. VGC, Diablo Immortal backlash, 6 Jun 2022 (press): https://www.videogameschronicle.com/news/diablo-immortal-faces-a-backlash-as-metacritic-user-score-drops-to-blizzards-third-lowest-ever
30. Project files: `docs/design/research/policy.md`, `yard-policy.md`, `genre.md`, `meta.md`, `yard-genre.md`; `docs/design/yard-design.md` sections 7, 8, 14; `scripts/content/yard/names.json` (currency "scrip").
