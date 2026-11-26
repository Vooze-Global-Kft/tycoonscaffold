# Scrapyard: Loans, holdings and public sales: how tycoon games do them and how the scrap trade really does

Research step `research-finance`, 26 November 2026, after the owner's answer of the same day ("bank loans", "investments", "yard sales"). Web search and page reads on public subjects only (published games, their source code and patch notes, UK statutes, trade and finance guides); nothing about this project went into any query. Every page cited was opened on 26 November 2026 unless marked otherwise. Marks: **VERIFIED** = I read the page today and it says this; **REPORTED** = a secondary source or a search extract says it (the page would not load, or it is a fan or press source); **INFERENCE** = my reasoning. Sources are numbered [n] and listed at the end. Read with `yard-design.md` (sections 5, 7, 8, 14), `yard-metals.md`, `yard-policy.md`.

---

## 0. The answer in one page

1. **A loan is a tool when it buys something that earns soon, and a trap when it covers losses, compounds or ends in a lump sum.** The classics charge interest by the clock (OpenTTD: monthly; a failing company warned in month 4, offered for sale in month 7 [1]). This design forbids costs by the clock (ruling 9) and dead ends (E4, E11), so our loans are **repaid from sales, not from time**: a share of each lot until a total fixed at signing, as a merchant's advance is repaid in metal [9].
2. **Holdings are where games go wrong.** OpenTTD removed share trading because "you can generate infinite money with this" [2]; Offworld's designer saw buy-out winners "snowball forward" [3]. Safe forms have a fixed value and no resale market: a stake in a partner paid in material, a rival's yard bought as a site, a grant.
3. **"Investors" in idle games are a reset multiplier, not investing** (AdVenture Capitalist's angels [4]). This game has no reset; the word should not name a multiplier.
4. **Real yards finance plant on hire purchase or lease, secured on the machine [7][8], and working capital through buyers' prepayments repaid in metal, sized well below the delivery value (120 advanced against deliveries worth 180 [9]).** Prices are fixed ahead by forward sales (the game's deals); exchange hedging is explained in 3.3 and stays out.
5. **Selling to the public is legal retail for a licensed yard** [15b][16]; the UK cash ban is on paying for scrap [15].
6. **Build first: the yard sale** (a reuse rack fed by the hand, and a sale at the gate): no server, no fairness, gambling or finance question, and the owner's word made visible. **Then plant finance repaid from sales; then partner stakes** (5d).

---

## 1. Loans in tycoon and business games

### 1.1 The rules, game by game

| Game | How much | Cost and when | Repayment | At zero cash / bankruptcy | Mark |
|---|---|---|---|---|---|
| **OpenTTD** (Transport Tycoon remake) | maximum set per game | 2 to 4 % a year (default 2 %) [1b], charged monthly; a negative balance pays the same rate [1] | in steps, any time | monthly check: month 4 warning, month 7 **offered for sale** at asset value, month 10 removed (not the player's own in single player) [1] | VERIFIED (code) |
| **RollerCoaster Tycoon** 1 to 3 | per scenario (one: $50,000) | per scenario (one: 10.9 %) | any time | — | REPORTED [17] |
| **Parkitect** | several changing offers, two held at most; smaller loans cheaper | "loan fee payments" | early; "you can pay a loan with a loan" | — | VERIFIED (VICE, 25 Jan 2019) [18] |
| **Game Dev Tycoon** | the bank **offers** a bail-out below a line | more than borrowed | one lump sum after a period | declining ends the game | REPORTED [20] |
| **AirlineSim** (online) | from rating, equity, loans, profit; none at CCC or lower | prime rate plus a credit margin; secured aircraft loans cheaper | every 7 days; early end for a fee | **no overdraft**; unpaid salaries at week's end = liquidation | VERIFIED (handbook) [22] |
| **Railroad Tycoon 2 / 3** | bonds, by credit rating | set at issue by the economy | outstanding | bankruptcy possible | REPORTED [24][25] |
| **Animal Crossing: New Horizons** | house loans, 12,296,000 bells in all | none | any time, one at a time; paying the last makes renovations free | no deadline | VERIFIED [26]; "no interest" REPORTED [26b] |
| **Recettear** | 820,000 within a month | — | to a deadline | game over, restart keeping level and items, not money | VERIFIED [27] |

Also read: Two Point Hospital (three loan sizes; in debt you cannot hire) [19]; Farming Simulator 19 (portions of $5,000, about 0.56 % a day collected at midnight; negative balance allowed) [21]; both REPORTED guides. **Mobile tycoons:** I found no current mobile idle tycoon with a bank loan (they use resets and bought currency instead); **not found**, not proof that none exist.

### 1.2 What players and designers say makes a loan a tool or a trap

- **Tool:** it buys something that earns before the cost adds up. Players advise borrowing only if you can repay "within a few months" [19b] (VERIFIED, player forum). A reviewer calls Parkitect's loan "a way of financing the future" [18] (VERIFIED).
- **Trap, covering losses:** borrowing because cash is negative when nothing will earn it back [19b]; borrowed money spent on rooms nobody uses "could burry your hospital for good" [19] (VERIFIED).
- **Trap, the lump sum:** a bail-out repaid in one sum "will basically finish you off. You're just delaying it" [20] (REPORTED, forum).
- **Trap, time spent:** a Parkitect reviewer spent his play "trying to swim out of debt" [18] (VERIFIED).
- **Trap, forced debt:** forced mortgaging "takes choices away from players"; "Designers should avoid this type of mechanism" [28] (VERIFIED, fan-kept design reference).
- **Without a clock:** some board games make a loan lower ongoing income until repaid (Brass) or cost points at the end [28] (VERIFIED). A developer moved bankruptcy to zero because a line below zero "always felt arbitrary" [28b] (REPORTED).

**INFERENCE for us.** Every trap is a cost tied to the clock meeting a business that does not earn. In an idle game a clock cost runs while the player sleeps: compounding debt. Ruling 9 already forbids it. Animal Crossing shows a loan without a clock still works as a goal.

---

## 2. Holdings in games

### 2.1 Stakes and buy-outs

- **OpenTTD:** until 13.x a company could buy quarter shares of another. 14.0 replaced this with "hostile takeovers of AI companies" [2b] (VERIFIED). The author of the change said share selling "makes no sense at all" (it creates money nobody pays) and "you can generate infinite money with this"; another developer said by the time shares are affordable you no longer need the cash, so the only use was "bragging rights in network games" [2] (VERIFIED, 29 Apr 2023). What remains: a failing company is **offered for sale** at its asset value fixed in month 7; an AI company can be bought hostilely, outside network games, for assets plus loan plus twice its last four positive quarters [1] (VERIFIED code).
- **Offworld Trading Company:** built on stock buy-outs. Its designer writes that the winner of a buy-out race would "snowball forward and easily dominate the rest of the game"; dearer buy-outs made players hoard cash instead of playing. The fixes: a bought-out player becomes an AI-run subsidiary paying profit by share; majority buy-out at six of ten shares; the last five bought together; 20 % more per share held by a third party [3] (VERIFIED). This share race is Offworld's signature, and between players it is a transfer of wealth.
- **Railroad Tycoon 2:** stock of any company, bonds, buy-backs, dividends, mergers; some scenarios require them [24] (VERIFIED, Wikipedia).

### 2.2 Bonds, deposits, dividends

Capitalism Lab: bonds of 5 to 20 years, coupon set by term and rating, lost only if the issuer goes bankrupt [23] (VERIFIED). Railroad Tycoon 2: one economic state sets both bond interest and interest on cash [24] (VERIFIED). Animal Crossing cut its savings interest in 2020 (players estimated 0.5 % to 0.05 %) [26b] (REPORTED). INFERENCE: interest on idle cash pays the player for doing nothing, and gets cut.

### 2.3 "Investors" as a restart reward (a different thing)

AdVenture Capitalist: resetting earns "angel investors" that raise revenue from all products in the next run, and gold bought with real money can buy them without a reset [4] (VERIFIED, Wikipedia). Guides give +2 % profit per angel, additive [5] (REPORTED). The prestige currency follows lifetime earnings with a square root (p = 150 × √(c/10^15)), so each reset gives less unless the player has grown [6] (VERIFIED, Kongregate's analysis). **This is not investing.** No money is placed anywhere. It is a reset multiplier with a money word on it. Our game's prestige is `none` (1.2). The word should not be reused for a multiplier (INFERENCE).

### 2.4 How holdings go wrong

Money from nothing (OpenTTD's shares [2]); a runaway leader and hoarding (Offworld [3]); speculation, when a price can be bought low and sold high (INFERENCE); and wealth moving between players, which yard-policy.md forbids for bought value (INFERENCE).

---

## 3. How a real scrap and metal recycling business is financed

Plain words, typical terms. UK first, because the trade research used UK law.

### 3.1 Plant: hire purchase, leasing, asset loans

- **Hire purchase (HP):** "The customer pays an initial deposit, with the remainder of the balance and interest paid over a period of time"; "On completion, ownership of the asset transfers to the customer". The finance house owns the machine meanwhile; payments can be yearly or end in a "balloon" [7] (VERIFIED, ACCA).
- **Leasing:** the lessor keeps ownership; a finance lease covers most of the machine's life, an operating lease less, with the lessor keeping upkeep; on default the lender may take the asset back [8] (REPORTED, search extracts; the pages returned 403).
- **Recycling plant:** HP over 2 to 5 years, deposit 10 to 25 % (another page 10 to 30 %); on a £50,000 baler HP cost about £6,380 more than cash over five years but kept the cash free [8b] (REPORTED). Machine makers' finance arms lend to scrap processors [8c] (REPORTED).
- INFERENCE: a **plant-finance house** ("deposit now, the rest from earnings, the machine is security") is true to the trade.

### 3.2 Working capital

- **Invoice finance:** a lender advances most of the value of invoices you have issued. With **factoring** it also collects them; with **discounting** you collect yourself, often without the customer knowing. Advance up to about 90 %; fees of a fraction of a percent to 2.5 % of invoices, plus interest a few points over base rate [10] (REPORTED, search extracts; the British Business Bank pages returned 403).
- **Buyer's prepayment, repaid in metal:** "traders organise up-front prepayments for producing counterparties and are repaid over time in commodity shipments", for "as short as a few months or as long as five years", priced monthly against an exchange price, sized "with a built-in reserve": an advance of 120 against deliveries worth about 180, so a 20 % price fall is covered [9] (VERIFIED, trader's guide, 2020).
- **Stock finance against warehouse receipts:** the lender advances less than the stock's value (a "haircut", deeper for volatile metal, smaller if hedged) [11]; one farm-goods scheme lends up to 75 % [11c]; faked or double-pledged receipts cost banks money [11b] (all REPORTED).
- INFERENCE: a prepayment is a loan repaid in tonnes with headroom built in; it fits a game scored in tonnes better than any bank loan.

### 3.3 Fixing a price ahead (explained only; the game has no futures, options or leverage)

- **Forward sale:** a fixed price, or more often a formula on a published monthly index, which "has become the norm for many" [12] (REPORTED). The game has this already: supply deals, offtakes (5.3), the fixed quote at dispatch (5.4).
- **Exchange hedge:** buy scrap at today's price and sell the same metal content forward on an exchange; buy the hedge back when the metal is sold, so a fall while the stock is held is offset. Trade writers say unhedged ferrous stock held past about 30 days "is speculating", that firms need cash "to meet margin calls", and that hedging "is not a free and easy way to guarantee profits" [12] (REPORTED). Not in the game (yard-policy.md: no futures, options or leverage).

### 3.4 Grants

The UK Automotive Transformation Fund has paid grants to battery-recycling and magnet-recycling projects. It asks for at least £1 million of grant against eligible project costs and is matched by industry funding [13] (REPORTED, government grants portal and the fund's case studies, search extracts; the portal page returned 404). INFERENCE: a grant pays part of a new **line** (hydro, battery) on conditions (a certificate, a site). It is never repaid, which makes it the cleanest "free money" a game can give.

### 3.5 Outside shareholders in a growing recycler

Big plants are paid for with equity plus loans. Li-Cycle, a battery recycler, planned a plant first costed at $560 million, later near $1 billion; building paused in October 2023; it could not raise the equity a government loan required, entered creditor protection in May 2025, and its secured lender, a metals trader, bought the assets for about $40 million [14] (VERIFIED, Waste Dive, 8 Aug 2025; a law firm gives $46.4 million). INFERENCE: a game backer can pay for a line in return for a share of that line's output; the part where backers take the business if it fails stays out.

---

## 4. "Yard sales": what the trade sells to the public

### 4.1 The real formats

| Format | How it works | Mark |
|---|---|---|
| **Architectural salvage / reclamation yard** | sells reclaimed flooring, garden antiques, lighting, fireplaces, even whole buildings; dealers often bid for the right to remove features before demolition; a voluntary dealer code ("established to offer confidence to buyers"), theft alerts, a "genuine reclaimed" standard [29] | VERIFIED (code body's own page) |
| **Reuse shop at a council recycling centre** | donated household items resold "at prices people can afford": furniture, bikes, tools, books; small electricals PAT-tested and bikes safety-checked; some goods never sold second-hand (car seats, helmets, cot mattresses, petrol-powered items) [30] | VERIFIED (county council) |
| **Self-service car-parts yard** | cars in numbered rows by make; inventory updated daily; customer brings hand and battery tools only (no torches, grinders, jacks); price each part from a posted list before pulling it; over-16s only; a waiver [31] | VERIFIED (one yard's page); entry fee of a few dollars REPORTED |
| **Plant auction** | used machinery sold unreserved to the highest bidder, on site or online; buyer's commission (sources differ: 10 % on the first £2,000 then 2.5 %, or 2.5 % flat) [32] | REPORTED |
| **Open days** | recycling plants open to families on heritage-open-day weekends: booked hourly tours, high-visibility clothing and hard hats, ages 7 and up at one site [33] | REPORTED (search extracts; these are sorting plants, not metal yards) |

### 4.2 The rules that apply (UK)

- "A scrap metal dealer must not pay for scrap metal except" by a non-transferable cheque or "an electronic transfer of funds" [15] (VERIFIED). It governs paying, not selling.
- The dealer's business is "buying or selling scrap metal", "whether or not the metal is sold in the form in which it was bought" [15b] (VERIFIED): a sale stand is part of the licensed business.
- Selling to the public is retail: the yard is a "trader", a person buying for home use a "consumer" [16] (VERIFIED). Second-hand goods at a public auction that individuals can attend are outside Chapter 2's consumer protections [16] (VERIFIED).
- INFERENCE: tags show condition ("Working, tested" / "For parts"), as reuse shops do; nothing sealed or hazardous (gas bottles, airbags, batteries, converters) is ever on sale (L3).

### 4.3 How games do a stand, a market day, a garage sale

- **Hay Day:** the store text: "Become a successful farming tycoon with your own Roadside Shop" and "Join a neighborhood, or create your own with up to 30 players"; purchases include diamond and coin packs and "random items" [34] (VERIFIED, App Store). Players price goods on shop slots within limits; other players buy; a newspaper ad shows offers to strangers; extra slots cost premium currency [34b] (REPORTED). Common: a stand with a chosen price. Signature: the roadside shop with a newspaper of other players' offers, a player-to-player market.
- **Moonlighter:** you set a price and read reactions: "excited over a low price, happy with a normal one, irritated but still willing to pay a high price", or put off; the game keeps "a log of the best value that brought up a particular reaction" [35] (VERIFIED, Siliconera). The fun is a small puzzle of reading faces, kept as knowledge.
- **Recettear:** haggling; push too hard and the buyer leaves; one reviewer found it becomes "a thoughtless, mechanical exercise" once habits are known [27] (VERIFIED).
- INFERENCE: what works is a price chosen within limits, a visible reaction before money changes hands, buyers who come to you, and a log. What fails is a haggle repeated a hundred times.

---

## 5. For the designers: mechanics that fit this game

Constraints held throughout: one thumb; earns while away (cap 4 to 12 h); nothing costs by the clock (ruling 9); no dead end (E4); shown equals applied; payback pricing (6.3); server-checked tonnes (7.5); no futures, leverage, bets, random paid items or transfers of bought value (yard-policy.md); currency packs now allowed (wish 13). Numbers are starting values (tune); I = current income per hour.

**One rule for all three systems: bought currency never repays, unlocks, or speeds up a loan, a holding or a sale, and no shop prompt appears on any of their screens.** Otherwise currency packs turn debt into a sales funnel ("a purchase pushed by debt").

### 5a. Loans

| # | Mechanic | The number that makes it work | What the player sees and decides | The trap it avoids |
|---|---|---|---|---|
| **L-a** | **Plant finance** (the finance house, stage 2): buy a machine with a 20 % deposit; the rest plus a flat charge is paid by a share of every sale until done | deposit 20 % (trade 10 to 30 %); charge a **flat 8 %** of the amount financed (tune 5 to 12), fixed at signing; **sweep 25 %** of each lot's money (tune 15 to 30); amount financed at most 4 h of I; at most 2 agreements open | a card (example at I = §250,000 an hour): "Shredder §900,000. Pay §180,000 now. §777,600 comes from your sales (25 % of each lot). Total cost §957,600, 6.4 % more than cash. At today's pace paid off in about 12 h, away time included." Choose **Finance** or **Save up (ready in about 3 h 40 m)** | no clock: an idle night repays faster, never costs more; no compounding (flat, fixed charge); cash never goes below zero, because the sweep comes from money coming in; the machine cannot be sold while financed; a test: total paid = the number on the card |
| **L-b** | **Merchant's advance** (a partner's prepayment, stage 3): a partner pays now for tonnage you deliver later | advance = **two thirds** of the contracted tonnage's value at today's price (the trader's 120 : 180 [9]), minus a 3 % discount; delivery over 3 to 7 days from reserved bays | "Durnav Steel advances §400,000 now for 600 t of HMS over 5 days. Each delivery repays its share." | repaid in tonnes, so it fits the ladder; a short day carries over (trust −10, as in deals), no penalty in money, no due date that bites |
| **L-c** | **Bank loan for a new site** (the bank, stage 4): one loan per site purchase, repaid by a share of that site's sales | at most 50 % of the site's price; flat charge 10 %; sweep 20 % of that site's sales only | on the key board: "With the bank: §2.5 M now, §2.75 M from Saltreach's sales" beside "Buy outright" | the loan is limited to the thing it bought; the rest of the business is never drained; no second loan until the first is paid |
| **L-d** | **Grant** (stage 4): a clean-tech grant pays part of the battery or hydro line | 40 % of the line's price, once per line, on conditions (battery bay certificate, export consent) | "Grant offered: 40 % of the leach line, if the battery bay is certified." A checklist | free money with conditions the player can see and meet; never repaid; no dead end |
| — | **Not to build:** an overdraft, interest by the hour or day, a lump-sum bail-out, stock finance against held bays | — | — | each brings a clock or rewards holding stock for a better price (speculation) |

**The charge band** (INFERENCE, for the prototype): finance brings a purchase forward by the time needed to save the 80 %. A charge above what the machine earns in that time makes finance useless; far below it makes "Save up" dead and speeds every climb. Aim: a person-like player picks finance in about a third of eligible purchases.

**Server note** (7.5): ranked checks must add accepted borrowings to accepted earnings ("assets ≤ earnings + financed − still owed"), or a financed machine looks like a cheating client.

### 5b. Holdings ("investments")

| # | Mechanic | Number | What the player sees and decides | Trap avoided |
|---|---|---|---|---|
| **H-a** | **Stake in a partner's yard** (stage 2 or 3): buy 10 %, 20 % or 30 % of a local or regional partner | price = 10 h of the stake's yield (tune); yield paid **in material** (that share of the partner's loads arrives free) or as a 5 % better price on their deals; sold back only to the partner, **at the price paid** | a partner card with a "Stake" row: "20 % of Ruddock Demolition: §48,000. You receive 20 % of their loads free." | no price that moves, so nothing to speculate on; no resale market; a fixed return the player can compare with a machine |
| **H-b** | **Buy a rival's yard** (stage 4): a simulated firm the player has passed may offer its yard for sale (the OpenTTD "offered for sale" idea [1], in our words) | price = its assets at payback, as a site; its tonnes count from the day bought, never backwards (D19 kept) | a notice: "Kelderby Recycling is selling its Brack Road yard." Buy it as a new site, or let it go | simulated firms only, never players; no hostile take-over; no runaway, since it is priced like any site |
| **H-c** | **Outside backer for a big line** (stage 4 or 6): a backer pays half of a tankhouse or refinery for a share of that line's output | backer pays 50 %; takes 25 % of that line's money until it has had 1.5 × its stake, then nothing | "Backer offer: §30 M now. They take 25 % of the tankhouse's sales until they have had §45 M." | ends by itself; limited to the line; no loss of the business (Li-Cycle's lesson kept as flavour, not as a rule) |
| **H-d** | **Company project pledge** (stage 5, the company of up to 30): members pay from their own yard into a shared build (a company quay, a company furnace) whose benefit is **the same for every member** (a cosmetic, or 2 % on one grade's lots) | goal size from members' capacity (like the weekly order); each pledge limited to 2 h of that member's I a day | progress bar by member emblem; "Pledge 2 h of earnings" | no money moves between players; no member gets more for giving more except a pennant; bought currency cannot be pledged |
| — | **Not to build:** shares of other players' companies, a share price, a trading screen, deposits that pay interest, a "investors" reset multiplier | — | — | wealth transfer, speculation, money for nothing (OpenTTD's lesson), a forbidden reset |

### 5c. The yard sale

| # | Mechanic | Number | What the player sees and decides | Trap avoided |
|---|---|---|---|---|
| **Y-a** | **The reuse rack** (stage 2): while cutting, some items show "Reusable" (a cast-iron bath, a brass tap set, a radiator, a working motor, a bicycle); the hand chooses **Rack** or **Strip** | worth **2.5 ×** its scrap value on the rack (tune 2 to 4); rack of 6 slots (8, 12 with levels); share of items reusable fixed when the item is made (a counter hash, shown before the choice) | the carried item shows two prices: "Strip: §14 · Rack: about §35". Walk it to the rack under the canopy | uses the hand (D4); no randomness at purchase; the real reuse-shop list rules out hazards |
| **Y-b** | **Saturday yard sale** (stage 2): once a game day at a fixed time (or every 6 h of the market clock), the gate opens to the public for 20 minutes; buyers walk in with set budgets and buy from the rack | footfall 8 to 20 buyers per sale (rises with the sign, cosmetics never change it); the sale earns at most **8 %** of a day's income (tune 5 to 10), so it is a side earner | the player tags each slot **Bargain / Fair / Collector**; buyers show a face as they look (pleased, fine, doubtful, walking away), as in the shop-game genre [35]; a small notebook keeps the best tag per kind | the price is chosen before the sale and applied as shown; sells while away at the tags set; no haggling loop to repeat a hundred times |
| **Y-c** | **Parts day** (stage 2, with the depolluted cars): before a car goes to the crusher it can stand in the parts row for one sale; buyers pull parts at a posted list | each part at a fixed list price; the car's scrap value falls by what was taken; at most 3 cars in the row | the row with a list board; "Crush now: §310 · Parts day first: about §520" | the posted list is the trade's own form [31]; no tool work by customers is shown (L3) |
| **Y-d** | **Plant auction** (stage 3): a replaced machine is sold at an auction day for a stated share of its price | 35 % of what was paid, less 2.5 % commission [32] (stated before; no bidding randomness) | "Sell the old baler at Friday's plant auction: §5,850 after commission" | no random outcome; shown equals applied |

**Other players and the yard sale** (stage 5): visitors from the same company may "browse" a member's rack on a tour and leave an emote. They do not buy. A player-to-player market at prices the players set would be Hay Day's signature and a channel for bought value. If the lead wants members to buy, the price must be the game's own fixed price, paid by the game, not by the buyer (INFERENCE).

### 5d. What to build first, and why

1. **The yard sale (Y-a, Y-b) in stage 2.** It uses the hand at every size, is the most visible of the three words, needs no server or policy work, is capped as a side earner, and gives cosmetics (now the main purchases) an audience; an open day for visitors (cosmetic only) can follow.
2. **Plant finance (L-a) in stage 2:** the trade's commonest form, one card, no clock; measured first in the numbers prototype; the server check gains one term before stage 5.
3. **Partner stakes (H-a) in stage 3, with the merchant's advance (L-b).** Both are partner features and fit the deals screen.
4. **Later:** the site loan, grant, rival's yard and backer in stage 4; the company pledge in stage 5.

---

## 6. Common versus signature (originality)

Free to use, common to the genre: a loan with a limit repaid in steps; a failing firm offered for sale; a shop slot with a chosen price and visible reactions; bonds with a term and a rating; an interest-free loan as a goal. A single publisher's signature, not to be recreated: Offworld's share race with majority buy-outs; Hay Day's roadside shop with a newspaper of offers; AdVenture Capitalist's angel investors; Animal Crossing's house loan from its shopkeeper. The game's own words come from the trade: plant finance, advance, stake, grant, reuse rack, yard sale, parts day, plant auction, open day.

---

## Sources (read 26 November 2026 unless noted)

1. OpenTTD source, `src/economy.cpp` (CompanyCheckBankrupt, CompaniesPayInterest, CalculateCompanyValue, CmdBuyCompany), https://raw.githubusercontent.com/OpenTTD/OpenTTD/master/src/economy.cpp. VERIFIED.
1b. OpenTTD wiki, "Initial interest", https://wiki.openttd.org/en/Archive/Manual/Settings/Initial%20interest. VERIFIED.
2. OpenTTD pull request #10709 (merged 29 Apr 2023), https://github.com/OpenTTD/OpenTTD/pull/10709. VERIFIED.
2b. OpenTTD 14.0 changelog, https://cdn.openttd.org/openttd-releases/14.0/changelog.txt. VERIFIED.
3. Soren Johnson, "OTC Designer Notes #17: Stock Market", https://www.designer-notes.com/otc-designer-notes-17-stock-market/. VERIFIED.
4. Wikipedia, "AdVenture Capitalist", https://en.wikipedia.org/wiki/AdVenture_Capitalist. VERIFIED (secondary).
5. Guides on angels (+2 % each): https://gameplay.tips/guides/adventure-capitalist-basic-guide-angels-events-suits-badges.html; the fan wiki returned 402. REPORTED.
6. Anthony Pecorella, "The Math of Idle Games, Part III", https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii. VERIFIED.
7. ACCA, "Hire purchase", https://www.accaglobal.com/us/en/business-finance/types-finance/hire-purchase.html. VERIFIED.
8. British Business Bank, leasing and hire purchase, https://www.british-business-bank.co.uk/finance-hub/leasing-hire-purchase (403); ICAEW/FLA/BBB Asset Finance Guide 2016. Search extracts only. REPORTED.
8b. Gradeall, waste equipment financing, https://gradeall.com/waste-equipment-financing-uk/. Search extract. REPORTED.
8c. ISRI, "Paying for Equipment", https://isri.org/scrap-articles/paying-for-equipment (404 on fetch). Search extract. REPORTED.
9. Trafigura, "Prepayments demystified" (2020), https://www.trafigura.com/media/j0ydfhmm/2020_trafigura_prepayments_demystified_en.pdf. VERIFIED.
10. British Business Bank invoice finance pages (403); iwoca and eCapital guides. Search extracts. REPORTED.
11. LME, "Commodity financing: how hedging on exchange benefits both borrowers and lenders" (PDF 403). Search extract. REPORTED.
11b. Engineering News, "Paper trail on metal loans ended in fakes" (4 Jul 2017). Search extract. REPORTED.
11c. State Bank of India, warehouse receipt finance. Search extract. REPORTED.
12. Recycling Today articles on hedging (rt1114 metals trading hedging; "A game with few contestants"; ISRI "Managing risk"). The pages returned empty; search extracts only. REPORTED.
13. Find a Grant, "Automotive Transformation Fund", https://find-government-grants.service.gov.uk/grants/automotive-transformation-fund-atf-1 (404); APC case studies. Search extracts. REPORTED.
14. Waste Dive, "Glencore completes takeover of Li-Cycle battery recycling assets" (8 Aug 2025), https://www.wastedive.com/news/glencore-completes-takeover-of-li-cycle-battery-recycling-assets/757199/. VERIFIED. Torys (credit bid $46.4 M), search extract.
15. Scrap Metal Dealers Act 2013 s.12, https://www.legislation.gov.uk/ukpga/2013/10/section/12. VERIFIED.
15b. Scrap Metal Dealers Act 2013 s.21, https://www.legislation.gov.uk/ukpga/2013/10/section/21. VERIFIED.
16. Consumer Rights Act 2015 s.2, https://www.legislation.gov.uk/ukpga/2015/15/section/2. VERIFIED.
17. RollerCoaster Tycoon loan figures: rct.fandom.com (402), speedrun.com RCT3 Goldrush guide, TV Tropes. Search extracts. REPORTED.
18. Cameron Kunzelman, "The Wildest Ride in 'Parkitect' is Predatory Lending", VICE, 25 Jan 2019, https://www.vice.com/en/article/parkitect-loan-predatory-lending. VERIFIED.
19. Gamepressure, Two Point Hospital finances, https://www.gamepressure.com/two-point-hospital/finances/z3b494. VERIFIED (secondary).
19b. Steam discussion, Two Point Hospital, https://steamcommunity.com/app/535930/discussions/0/3428948355368609640. VERIFIED (player forum).
20. Game Dev Tycoon: speedrun.com GameOver% guide; Greenheart Games forum "Bank asks to much money"; TV Tropes. Search extracts. REPORTED.
21. Gamepressure, Farming Simulator 19 banks and loans, https://www.gamepressure.com/farming-simulator-19/banks-loans-and-bankruptcy/z7b957. VERIFIED (secondary).
22. AirlineSim handbook, "Bankruptcy and loans", http://handbook.airlinesim.aero/en/docs/advanced/finances/bankruptcy-and-loans/. VERIFIED.
23. Capitalism Lab, "Corporate bonds", https://www.capitalismlab.com/banking_dlc/corporate-bonds/. VERIFIED.
23b. Capitalism Lab Banking DLC tips and settings pages. Search extracts. REPORTED.
24. Wikipedia, "Railroad Tycoon II", https://en.wikipedia.org/wiki/Railroad_Tycoon_II. VERIFIED (secondary).
25. GameSpot and third-party reviews of Railroad Tycoon 3 (GameSpot 403). Search extracts. REPORTED.
26. Nookipedia, "Loan", https://nookipedia.com/wiki/Loan. VERIFIED (fan-kept).
26b. Guides on "no interest, no deadline"; savings-rate cut (McGraw Hill blog, Apr 2020). Search extracts. REPORTED.
27. Wikipedia, "Recettear: An Item Shop's Tale", https://en.wikipedia.org/wiki/Recettear:_An_Item_Shop%27s_Tale. VERIFIED (secondary).
28. Game Sushi, "Loans", https://gamesushi.github.io/quartz/Economics/Loans. VERIFIED (fan-kept design reference).
28b. Itch.io devlogs and posts on bankruptcy thresholds. Search extracts. REPORTED.
29. Salvo, "About", https://www.salvoweb.com/about. VERIFIED.
30. Lancashire County Council, reuse shops, https://lancashire.gov.uk/waste-and-recycling/reduce-reuse-recycle/reuse/reuse-shops. VERIFIED.
30b. East Sussex (503), Monmouthshire, MoneySavingExpert pages on reuse shops. Search extracts. REPORTED.
31. Carolina Pick-N-Pull, "How it works", https://carolinapicknpull.com/how-it-works. VERIFIED (one yard).
32. Euro Auctions coverage (Truck1, Agriland). Search extracts. REPORTED.
33. Somerset Council and Veolia open-day pages. Search extracts. REPORTED.
34. App Store, Hay Day (Ireland), https://apps.apple.com/ie/app/hay-day/id506627515. VERIFIED.
34b. Hay Day roadside shop guides (Pocket Gamer, GameRevolution 403, fan wiki 402). Search extracts. REPORTED.
35. Siliconera, "Moonlighter Is About Gouging Your Customers Just Right", https://siliconera.com/?p=709874. VERIFIED.
35b. Moonlighter guides (TrueAchievements, Destructoid 403). Search extracts. REPORTED.
