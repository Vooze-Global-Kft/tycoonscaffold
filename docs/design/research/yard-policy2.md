# Scrapyard: Store policy and law for selling currency, pretend loans and holdings, and sales between players

Researched on 26 November 2026, the day the owner decided on money, loans, investments, yard sales and Hay Day-style companies. I read the primary texts that day: Apple's App Review Guidelines ("Last Updated: October 16, 2026") and age-rating reference; Google Play's Payments, Gambling, Financial Services, financial-features declaration, User Generated Content and content-rating pages; the EU consumer authorities' 2025 principles; the Commission's Digital Fairness Act proposal of 11 November 2026; the UK advertising guidance on in-game purchases; the UK Online Safety Act; the EU Digital Services Act; PEGI's and USK's own descriptor pages; and the App Store pages of ten shipped games. Searches used only public subjects in general words. **VERIFIED** means I read it that day. **REPORTED** means others say it and I did not see it at the source. **INFERENCE** is my reasoning. [n] points to the source list. I am not a lawyer, and nothing here is legal advice. The earlier files `yard-policy.md` (25 Nov) and `policy.md` (22 Nov) still apply except where §0 says otherwise. Their points are not repeated here.

## 0. Answer first

1. **Selling currency is allowed by both stores. How it is sold decides almost everything else.** If the store sells **calvans** (the one currency the game is played with), three things follow. (a) Every calvan price in the game probably has to show what it costs in real money. (b) Buying progress becomes "pay-to-progress", which the EU proposal would ban for minors. (c) The weekly boards, the yard sales and the loans all carry bought money. **Recommended (INFERENCE):** two currencies behind a one-way wall:
   - **calvans**: earned only in play, never sold, never bought with the paid currency;
   - **one paid currency** (an invented name): it buys only looks (liveries, emblems, plaques, yard decorations) and the "no ad videos" pass, and it never turns into calvans.

   This keeps calvans outside the EU currency principles, the UK advertising guidance on in-game shops and Germany's "pay to win" weighting. It also keeps the store sentence "Purchases never add tonnes" true. It is still "currency" in the owner's sense, sold in packs.
2. **Pretend bank loans and holdings are allowed.** No store rule on loans or investments applies to an in-game currency that cannot leave the game. The risk is design, not law:
   - debt that pushes a player to buy;
   - prices that move by chance and pay out when the player times them well, which reads as simulated gambling. That costs 13+ on Apple, R 18+ in Australia and PEGI 18 where it looks like a casino.
3. **Sales between players are allowed if nothing bought moves and nothing can be cashed out.** A list of offers that other players can see is very probably "user-generated content" under Google's definition and the UK Act. The moderation kit already planned for names covers it.
4. **Companies: keep fixed phrases and composed names.** Today's texts confirm the earlier choice. Free chat would bring Apple's "Messaging and Chat" declaration, Germany's "communication risks" weighting, PEGI 18 if it cannot be blocked or moderated, and a full UK risk assessment for chat. Hay Day, which the owner named, does have free chat (its Apple rating lists "Messaging and Chat") [S10]. That is the cost of copying it.

### Where the earlier files change

| Earlier text | Status after today |
|---|---|
| `yard-design.md` §8: "Never: ... currency packs" | **Changed** by the owner. Currency packs are in. Recommended: the paid currency buys only looks (point 1). |
| `yard-design.md` §8, Lists A and B | **Replaced** by the owner's "cosmetics, currency etc." B's time-savers are out. |
| `yard-policy.md` §1: never write "invest" or "returns" | **Refined** (§3 below). In the game, "deposit", "interest", "loan" and "stake in a partner" are usable. On the store page, still no "invest", "returns", "trading" or "earn money". |
| `yard-policy.md` §6: bought currency never moves between players | **Stands.** With two currencies it is easy: yard sales use calvans only. |
| `yard-policy.md` §1: no cash-out, no real-value prizes | **Stands**, and matters more now: loans, holdings and sales are the paths by which a cash-out could appear. |
| `yard-policy.md` §5 and `policy.md` §2: PEGI criteria (secondary source) | **Now VERIFIED at PEGI** [R1]. New detail: time-limited offers give PEGI 12, or PEGI 7 if parental spending controls are off by default. |
| `yard-design.md` §7.7: "PEGI 3 (7 if pennants count as return rewards)" | **Check**: weekly company orders whose rewards lapse are "event-based rewards that expire", which is PEGI 7. If missing a week loses status, PEGI 12 [R1]. |
| `policy.md` §1: the EU Digital Fairness Act proposal limits paid random rewards for minors | **Wider than recorded.** The same proposal also covers paid currencies and pay-to-win for minors (§1.4). |

## 1. Selling in-game currency

### 1.1 Store payment rules (VERIFIED [A1][G1])

- Apple 3.1.1: in-game currencies must be sold through in-app purchase. "Any credits or in-game currencies purchased via in-app purchase may not expire". A restore mechanism is required for restorable purchases. A currency pack is a consumable and is not restored. INFERENCE: the server-side balance is what must survive a reinstall when the player has an account.
- Apple 3.1.1 on gifts: gifting of purchasable items "may only be refunded to the original purchaser and may not be exchanged".
- Google Payments: "In-app virtual currencies must only be used within the app or game title for which they were purchased." So nothing is shared with the other four games, and nothing is spent on a web shop.
- Neither store requires real-money prices next to items inside the game. That requirement comes from consumer law (1.2).

### 1.2 EU consumer authorities, Key Principles on in-game virtual currencies, 21 March 2025 (VERIFIED [E1])

**Scope.** The principles cover currencies "purchased with real-world monetary value and then used ... to pay a price". Footnote 2 leaves out currency "that can solely be obtained through gameplay and that are therefore not available to purchase with real-world money". **This footnote is the legal reason for the two-currency wall.**

**The principles.**

1. **Real-money prices.** When a currency or an item is offered for sale, its "price in real-world money ... should be clearly and prominently displayed". This also applies when an item is bought "directly or indirectly via another in-game virtual currency". The real-money figure is computed "without applying quantity discounts or other promotional offers", that is, at the rate of the smallest pack.
2. **Avoid** "mixing different in-game virtual currencies in one video game for purchasing in-game digital content or services", and "requiring several exchanges" before a purchase. INFERENCE: one paid currency that never converts meets this. A sold currency that converts into calvans would not.
3. **Avoid** "offering in-game virtual currencies only in bundles mismatching the value" of what they buy, and "denying consumers the possibility to choose the specific amount".
4. **Pre-contract information** with every offer: main characteristics, the trader's identity and contact, the real-money price, the right of withdrawal, the legal guarantee, and payment and delivery.
5. **Withdrawal.** The authorities say currency "is not digital content". Unused currency stays withdrawable for 14 days. An item is exempt only after express consent and an acknowledgement, given with a click separate from "buy", followed by a confirmation.
6. **Terms.** Avoid terms that let the trader "unilaterally modify the value of in-game virtual currencies", remove purchased content at will, or close accounts "without the ability to contest".
7. **Minors and vulnerable players.** "Any video game which is not exclusively intended for an adult audience should expect a significant part of its player base to be under the age of 18." Provide "functional parental controls with age-appropriate default settings, such as by default disabling the possibility of spending real-world money"; use the platforms' parental controls; and do not "directly exhort children to buy".

**Status.** The authorities themselves say "not respecting the recommendations ... cannot be automatically considered unlawful" [E1, footnote 1]. They are still the stated position of every EU consumer authority.

**What followed.**
- The network acted against a horse-riding MMO's publisher (Star Stable). The practices named included advertising that urged children to buy and influencer promotion not marked as paid (VERIFIED on a Spanish government relay of the Commission's notice [E2]).
- On 3 June 2025 the Commission held a stakeholder workshop on applying the principles. After it, the network "will decide on any subsequent step" (VERIFIED [E3]).
- I found no published outcome of the Star Stable case (not found).

### 1.3 UK advertising guidance on in-game purchases (CAP; reviewed May 2024; VERIFIED [U1])

- **Which shops count as advertising.** A shop priced in a currency "that can only be obtained by purchasing it" is advertising, because the currency acts "as a direct proxy for real money". If the currency "can be earned in the game", the shop is "very unlikely" to be advertising, even when the currency can also be bought. The page that sells currency for money is always in scope.
- **Price rules for the currency page.** The cost of the currency must be clear when packs vary in price per unit. "Best value" may refer only to the price per unit. Where items cost amounts that do not match pack sizes ("odd pricing"), showing the pack prices prominently is enough inside the game.
- **Pressure.** Avoid "short countdown timers", "implications that a purchase will lead to success", "complex offers" and "significant sums of money". Ads aimed at children may not exhort them to buy.
- **Disclosure.** Ads for the game must say that it has in-game purchases. CAP encourages saying "whether purchasing is entirely cosmetic".
- **INFERENCE.** Under the wall, the paid-currency shop is in scope only for looks, and the calvan shops are out of scope. If calvans are sold, every calvan shop moves into the grey zone.

### 1.4 EU Digital Fairness Act: a proposal, not law (Commission, 11 November 2026; VERIFIED [E4])

- **Article 14(1).** A trader offering "paid-for virtual currencies" must show the money value of items bought with them, or an estimate.
- **Article 14(2).** Where products are "directed at minors", the trader must make sure "paid-for virtual currencies are disabled by default for minors" and can be switched on "only ... upon parent or guardian approval".
- **Article 16.** No "pay-to-progress and pay-to-win mechanisms" for minors. These are defined as purchases "that are necessary or are presented as necessary for in-game or in-app progress or success" (Article 2(19)). Recital 65 adds "competitive structures in which outcomes are effectively determined by expenditure".
- **Recital 62.** A product counts as "directed at minors" when its age rating, PEGI's included, says it suits under-18s. INFERENCE: a 13+ game counts.
- **Recital 61.** Currencies "locked inside a specific video game ... that ... cannot be cashed out or traded outside" fall outside the EU payment-services and crypto-asset rules.
- **Definition.** A "paid-for virtual currency" includes one acquired "in exchange for another paid-for virtual currency" (Article 2(17)). So a soft currency that can be bought with the paid one becomes a paid one.
- **INFERENCE.** If this passes as written, selling calvans to minors would be forbidden, or would sit behind a parental switch, and calvans would count as pay-to-progress. Cosmetics-only paid currency still needs the parental default under Article 14(2), but Article 16 does not touch it. Adoption takes years; design for it now.

### 1.5 Ratings that weigh purchase pressure even when nothing random is sold

**PEGI** (VERIFIED [R1]). "Since June 2026, certain specific features related to in-game purchases have an influence on the age rating":
- time-limited or quantity-limited offers give PEGI 12, "If the game has built-in parental control tools with spending turned off by default, it can be a PEGI 7";
- paid random items give PEGI 16 (18 for social casino);
- NFTs that are tradable or central to play give PEGI 18;
- "Pressure to play" (daily quests, log-in streaks, "event-based rewards that expire") gives PEGI 7, and PEGI 12 if "players are punished by losing rewards or game status when they do not return in time";
- "In-game purchases" is shown whenever anything is sold, "virtual coins" included. It does not by itself raise the age.

**USK, Germany** (VERIFIED [R2]). The descriptor "Erhöhte Kaufanreize" (increased incentives to buy) raises the USK age. It weighs "confusing in-game shops (e.g. through multiple in-game currencies), purchasable game advantages (so-called Pay2Win mechanisms) and/or intrusive notifications that an offer is about to expire".
- Example: a card game was rated 12 for this reason alone [R3].
- On Google Play, German players see the USK rating through IARC (`yard-policy.md` [G3]).
- INFERENCE: calvans for sale, which buy machines, are "purchasable game advantages". Cosmetic-only paid currency is not. A second currency is only "confusing" if the shop mixes the two.

**Apple.** The age form has no purchase-pressure question. "Parental Controls" and "Age Assurance" are declared as In-App Controls (VERIFIED [A2]).

### 1.6 "Pay to win" disclosure

- No store rule requires a "pay to win" label (VERIFIED by absence in [A1][G1]).
- What bites: USK weighting (1.5), the EU proposal's ban for minors (1.4), CAP's encouragement to say purchases are cosmetic (1.3), and Apple 2.3.1 on misleading marketing.
- INFERENCE: under the wall, the store sentence can stay "Purchases change how your yard looks or remove ad videos. They never add calvans or tonnes."

### 1.7 One currency or two: how each is treated

| | Calvans sold directly | Two currencies, one-way wall (recommended) | Paid currency that converts into calvans (as Hay Day does) |
|---|---|---|---|
| EU principles [E1] | Calvans in scope: real-money value on every calvan price (INFERENCE) | Only the paid currency in scope | Both in scope; "mixing" and "several exchanges" warned against |
| UK CAP [U1] | Calvans can be earned, so calvan shops probably out of scope; the currency page in scope | Looks shop in scope (simple); calvan shops out | Paid-currency shop in scope |
| USK [R2] | "Pay2Win" likely | Not triggered | "Multiple currencies" plus Pay2Win |
| DFA proposal [E4] | Pay-to-progress for minors | Parental default only | Both |
| Weekly boards, loans, yard sales | Carry bought money | Money-proof | Carry bought money |

## 2. Pretend bank loans with interest

**Store rules on loans apply to real money only** (VERIFIED [A1][G2][G3]).
- Apple 3.2.2(ix) covers "Apps offering personal loans": APR disclosure, a maximum APR of 36 %, and no full repayment within 60 days.
- Google defines personal loans as "lending money from one individual, organization, or entity to an individual consumer". Loan apps must use the Finance category and show APR and repayment terms.
- Every developer must file Google's Financial features declaration, including those that "certify that no financial features are offered". Its list (banking and loans, stock trading and portfolio management, and others) describes real services.
- INFERENCE: a loan in calvans, which have no outside value, is not "money". The honest answer is "My app doesn't provide any financial features". A Play forum thread reports a rejection for an "inaccurate" financial-features declaration (search extract only; the thread did not load), so the review notes should say in one line that loans and deposits are fictional.

**Ratings.** No rating body has a question about loans (VERIFIED by absence in [A2][R1][R2]).

**Consumer-protection principles that bite** (INFERENCE from [E1] Principle 7, [U1] "implications that a purchase will lead to success", and [E4] Article 16):
- A loan becomes a dark pattern when debt can be cleared with bought currency, when a repayment shortfall shows a shop button, or when default takes away the yard or machines that play earned.
- Under the wall, loans are in calvans and repaid only from income. No bought item touches a loan, no offer appears in debt screens, and nothing a player built is ever repossessed.
- Recommended: a missed repayment only pauses new borrowing and adds simple, capped interest.

**Three shipped games with loans** (App Store pages, VERIFIED [S1–S3]):

| Game | Loan feature on its page | Apple rating and its listed reasons | Sells currency |
|---|---|---|---|
| Business Tycoon Simulator (Ilyon) | challenges "such as taking a loan from the bank" | 4+ | yes ("CEO" packs, $0.99 to $99.99) |
| TyconX: Business Tycoon Game | deposits, loans, credit, mortgages; says these "are virtual game mechanics, not real financial services or investments" | 13+: Advertising, Messaging and Chat, User-Generated Content, Social Media | yes (diamonds, VIP) |
| Idle Bank Tycoon (Kolibri) | the player's bank gives "loans and credits" | 9+: infrequent weapons, Loot Boxes, Advertising | yes (ingots) |

INFERENCE: loans and currency sales together did not raise any of these ratings. TyconX's 13+ comes from chat and social features. Ratings are self-declared, so this shows what passed review, not what is lawful.

## 3. Pretend holdings ("investments")

**The rating definitions** (VERIFIED):
- Apple: "Simulated Gambling: Betting or wagering without using real money or in-game currency that can be exchanged for real money" [A2]. In Australia, "Infrequent simulated gambling" shows R 18+ and loot boxes 16+ [A2].
- PEGI: "themes that prominently reference gambling" give PEGI 12; "Simulation of gambling, like games of chance that are normally carried out in casinos or gambling halls" gives PEGI 18 [R1]. Secondary sources date this criterion to PEGI's 2020 change [R4], REPORTED. Google's own rating page still lists simulated gambling under PEGI 12 [G4], which is out of date.
- USK: "Glücksspielthematik" (gambling themes) raises the age when the design conveys "an atmosphere typical of a gambling hall" [R2].
- Australia, since 22 September 2024: simulated gambling R 18+, paid chance purchases M (REPORTED; the government pages returned HTTP 503. Apple's Australian table above is consistent).

**Financial apps** (VERIFIED). Apple 3.2.1(viii) covers apps "used for financial trading, investing, or money management" [A1]; Google's financial services are those "related to the management or investment of money" [G2]. INFERENCE: neither covers calvans.

**Contests.** Already declared "frequent" (13+), unchanged. Prizes stay cosmetic (`yard-policy.md` §1).

**Three shipped games with pretend stock markets** (App Store pages, VERIFIED [S4–S6]):

| Game | What its page says | Apple rating | Sells currency |
|---|---|---|---|
| Business Empire: RichMan | "buy virtual shares in famous companies"; also crypto | 4+, Advertising only | yes ("Money pack" $0.99 to $9.99) |
| Stock Market: Investor Tycoon | shares whose prices "rise or fall", "Preferred shares pay recurring dividends" | 4+, Advertising only | yes (in-game cash, up to $39.99) |
| Investor Tycoon: Buy The World | "Invest and cashout at the right time to multiply your wealth"; compares itself to a crash-betting game | **13+: Infrequent Simulated Gambling** | yes (gems, energy) |

**Where the line falls (INFERENCE from the definitions and these three cases).**
- Holdings that pay a share of results are not simulated gambling. Neither is a deposit with fixed interest, or a valuation computed from a formula.
- Simulated gambling starts with a stake placed on a chance outcome and then cashed out by timing: crash or "cash out" mechanics, up/down calls, a draw or wheel that sets a return.
- RichMan's use of real company names is a trademark risk (`yard-policy.md` §2), not a rating precedent.
- **Rules for our holdings:**
  - stakes in invented partners pay a fixed share of that partner's published results, which come from the game's own model and are shown before buying;
  - deposits pay a stated fixed rate;
  - bonds pay a fixed coupon;
  - nothing is bought with the paid currency;
  - no random draw sets a return;
  - no "cash out now" moment;
  - no shares of other players' companies.
- The design's listing ("No shares can be bought, sold or owned by players") stays.

**Words.** No store publishes a list of words that triggers review (not found). The evidence:
- Google's declaration asks about features, not words [G3].
- A reviewer judged one game by its look ("this is gambling") despite no wagering. Its developer then declared gambling to stay listed (REPORTED, Kotaku, Jan 2025 [K1]).
- Four of the six games above use "invest", "shares", "dividends", "loans" or "bank" on their pages at 4+.

INFERENCE, a word list for designers:

| Where | Use | Avoid |
|---|---|---|
| Inside the game | loan, interest, deposit, repay, bond, stake in a partner, share of results, valuation | bet, odds, jackpot, cash out, double up, "multiply your money", tips, "get rich" |
| Store page and ads | "simulated bank loans", "fictional partners", "business sim" | invest, investing, returns, trading, stock market, earn money, financial advice |
| Help screen (one line) | "Loans, deposits and stakes are fictional and use calvans only. Nothing can be paid out, and nothing here is financial advice." | |

## 4. Sales between players (yard sales)

**Store rules** (VERIFIED [A1][G1]):
- Bought currency must stay in its game.
- Gifted purchasable items "may not be exchanged".
- Apple 3.1.1 bars unlocking content by any mechanism other than in-app purchase.
- No rule forbids players trading earned goods for earned currency.

**INFERENCE: what keeps it clean.**
1. Under the wall, stands sell goods for calvans only. Bought currency and bought looks never move between accounts.
2. Prices are capped near the posted board, so a stand cannot pass value from one account to another (the usual route for selling accounts or coins for real money).
3. Quantities per day are capped.
4. The server writes every sale.
5. Simulated buyers fill unsold stands, so a newcomer never depends on others.
6. Stands are built from fixed parts (item, quantity, a price within the cap). There is no free-text description.
7. The terms forbid trading for real money outside the game, and the operator bans accounts that do.

**Is a stand user-generated content?**
- Google: UGC "is content that users contribute to an app, and which is visible to or accessible by at least a subset of the app's users" [G5].
- UK Online Safety Act s.55(3): content "generated directly on the service by a user ... that may be encountered by another user" [U2]. A user-to-user service is one where such content "may be encountered by another user" (s.3) [U2].
- The Act's limited-functionality exemption (Sch. 1 para. 4) covers only comments and reviews on the provider's content, likes, emoji and ratings [U2].
- INFERENCE: a visible stand, a composed handle and a company page are each probably user-generated content. The game is probably a UK user-to-user service already, because of the boards and companies, and stands do not change that. They do add an item to the risk assessment (fraud and pressure between players).
- EU Digital Services Act [E5]:
  - storing "information provided by ... a recipient" is a hosting service, which needs a notice-and-action mechanism (Article 16) and statements of reasons (Article 17);
  - disseminating that information to the public makes it an online platform;
  - micro and small enterprises are exempt from the online-platform section, Article 28 on minors included, "with the exception of Article 24(3)", and from transparency reports (Article 15(2)).
  - INFERENCE: the report button and the 24-hour operator queue in `yard-policy.md` §3 can serve as the Article 16 mechanism if anyone, not only players, can file a report through the web support page.

**Children.**
- Ofcom's children's codes and UK s.11 duties apply if children are likely to use the service (`yard-policy.md` §3).
- INFERENCE: for 13–17 where known, stands are visible to their company only, or to all with sales to simulated buyers only. Under-13s keep the local mode, where all buyers are simulated.

**Original work.** Hay Day's own page names its "Roadside Shop", trading with neighbours and "weekly neighborhood derby events" [S10]. A market stand is common to the genre. Hay Day's names, its newspaper of offers and its look are its signature and must not be copied (L9). "Yard sale" is the owner's own generic phrase.

## 5. Groups (companies of up to 30)

**VERIFIED today:**
- Apple declares "Messaging and Chat" for "text, voice and/or video chat, direct and/or group messaging, or public posting" [A2].
- USK counts as chat only player-to-player exchange. It excludes "fixed response options or reactions ... such as 'emotes'" [R2], and "Erhöhte Kommunikationsrisiken" (increased communication risks) raises the age for "unrestricted and uncontrolled chat ... without reporting or blocking" [R2].
- PEGI: "a game with unrestricted communication features is rated PEGI 18", meaning it cannot be blocked or muted and has no moderation [R1].
- The UK Act's s.55 exempts only one-to-one live voice, email, SMS and MMS [U2]. Group text chat is fully in scope.

**Hay Day** [S10]. "Join a neighborhood, or create your own with up to 30 players", rated 9+ on Apple with Age Assurance, Parental Controls, Loot Boxes, Advertising, and Messaging and Chat (VERIFIED). The 30 cap is a common size, and the owner set it before naming Hay Day. "Neighborhood" and "derby" are Hay Day's words and are not ours (INFERENCE, L9).

| | Fixed phrases and emotes, composed names (current design) | Free text chat, typed names |
|---|---|---|
| Apple | Not Messaging and Chat (INFERENCE: nothing is user-written); UGC yes, conservatively | Messaging and Chat; UGC; same 13+ but A12 in Brazil |
| USK | Not "chat" by USK's own definition | Chat notice; communication-risk weighting if moderation is weak |
| PEGI | No effect | PEGI 18 without block, mute and moderation |
| UK Act | Low-risk user-to-user content | Chat is a main risk area: grooming, bullying, illegal-content duties, children's duties |
| Work | Name filter on composed parts is trivial | Filtering in many languages, a 24-hour queue for every message, retention and law-enforcement requests |

**Confirmed:** fixed phrases, emotes and composed names. A later free-chat option would need a moderation service and a lawyer (INFERENCE).

## 6. DO and DO NOT

**Currency and purchases**
- DO sell one paid currency in packs. It buys only looks and the no-ads pass, never expires, and never converts into calvans.
- DO show the real-money price of every pack, and the real-money value of every item priced in it, computed at the smallest pack's rate [E1].
- DO match pack sizes to item prices, or allow an exact top-up [E1][U1].
- DO put pre-contract information (what it is, who sells it, price, withdrawal) one tap from the buy button.
- DO add a parental switch with spending off by default where the player is known to be under 18, on top of the stores' controls [E1][E4]. This also earns PEGI 7 instead of 12 if any offer is ever time-limited [R1].
- DO NOT sell calvans, tonnes, time, machines or rank, and DO NOT add timers, "best value" on totals, "buy now" or guilt text.
- DO NOT let ad rewards or purchases touch a ranked figure.

**Loans and holdings**
- DO keep loans in calvans, repaid from income at a stated fixed rate, with a capped total, never repossession, and no shop on any debt screen.
- DO make holdings pay fixed shares of results shown before buying, or fixed rates, and add the Help line from §3.
- DO NOT add random returns, cash-out timing, up/down calls, leverage, shorts, crypto, or shares of players' companies.
- DO NOT use invest, returns, trading or earn money on the store page.

**Yard sales**
- DO price stands in calvans only, within caps, with daily limits, server-written, from fixed parts, with simulated buyers.
- DO forbid real-money trading in the terms and ban for it.
- DO NOT move bought currency or bought looks between accounts, and DO NOT allow free-text listings.

**Companies**
- DO keep fixed phrases, emotes, composed names, report, block, invitations off by default for 13–17, and local mode for under-13s.
- DO NOT add free chat, likes, feeds or comments.

### What the OWNER must create, declare or decide

1. **Decide**: two currencies behind a one-way wall (recommended), or calvans for sale knowing §1.7.
2. **Decide**: the paid currency's invented name, the packs and their prices, and what each look costs.
3. **Create**: terms of sale covering withdrawal, no currency devaluation, no removal of bought looks, and an appeal against bans [E1]; the in-shop pre-contract text; the parental switch; the real-money labels.
4. **Declare**:
   - Google financial features: none, with one review-note line about fictional loans;
   - Apple: Simulated Gambling none, Contests frequent, Parental Controls yes, Age Assurance yes if the age band ships, Messaging and Chat no;
   - IARC: in-game purchases yes, random no, time-limited no, chat no, user interaction yes.
5. **Create** (from `yard-policy.md` §3 and §6, now also covering stands): moderation, a web report form open to anyone, and the UK illegal-content and children's access assessments with yard sales in them.
6. **Write**: the store and ad line "In-game purchases (cosmetic only)" [U1].

### Three questions for a lawyer before a store submission

1. If calvans are earned only by play and a separate paid currency buys only looks, are calvans outside the EU currency principles and the Digital Fairness Act's "paid-for virtual currency"? And must the 14-day withdrawal for unused paid currency be offered by us when the stores are the seller of record?
2. Do composed handles, company pages and yard-sale stands make the game a UK user-to-user service and an EU hosting service or online platform? Which duties apply to a sole developer: the UK assessments, DSA Articles 16 and 17, and the micro-enterprise exemption?
3. Is "directed at minors" met by a 13+ rating? If so, what age assurance and parental default must the shop and the stands have in the EU, the UK, Brazil and the US states with app-store age laws?

## Sources (all read 26 November 2026 unless marked)

- [A1] Apple App Review Guidelines (Last Updated October 16, 2026): https://developer.apple.com/app-store/review/guidelines/
- [A2] Apple, Age ratings values and definitions: https://developer.apple.com/help/app-store-connect/reference/age-ratings
- [G1] Google Play, Payments: https://support.google.com/googleplay/android-developer/answer/9858738
- [G2] Google Play, Financial Services: https://support.google.com/googleplay/android-developer/answer/9876821
- [G3] Google Play, Financial features declaration: https://support.google.com/googleplay/android-developer/answer/13849271
- [G4] Google Play, Content ratings: https://support.google.com/googleplay/android-developer/answer/9859655
- [G5] Google Play, User Generated Content: https://support.google.com/googleplay/android-developer/answer/9876937
- [G6] Google Play, Real-Money Gambling, Games, and Contests: https://support.google.com/googleplay/android-developer/answer/9877032
- [E1] CPC Network, Key Principles on In-game Virtual Currencies, 21 Mar 2025: https://commission.europa.eu/document/download/8af13e88-6540-436c-b137-9853e7fe866a_en
- [E2] Spain's consumer portal relaying the Commission's action against Star Stable Entertainment, 2025: https://portal-cec.consumo.gob.es/en/comunicacion/noticias/2025/european-commission-and-national-authorities-act-protect-children
- [E3] European Commission, stakeholder workshop on the Key Principles, 3 Jun 2025: https://commission.europa.eu/news/european-commission-hosts-stakeholders-talks-application-cpc-networks-key-principles-games-virtual-2025-06-03_en
- [E4] COM(2026) 1100, Digital Fairness Act proposal, 11 Nov 2026 (Arts. 2, 14–16; recitals 61–65): https://commission.europa.eu/document/download/0575d59f-554f-4a9e-b54b-e6b717175809_en
- [E5] Regulation (EU) 2022/2065, Digital Services Act (Arts. 3, 15, 16, 17, 19, 28): https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R2065
- [U1] CAP and BCAP, Guidance on advertising in-game purchases (reviewed May 2024): https://www.asa.org.uk/static/4028c436-5861-4035-8d98c148d3c66b7e/Guidance-on-advertising-in-game-purchases.pdf
- [U2] Online Safety Act 2023, s.3, s.55, Sch. 1 (legislation.gov.uk, up to date to 24 Nov 2026): https://www.legislation.gov.uk/ukpga/2023/50/section/55 , /section/3 , /schedule/1 (Ofcom's games page returned HTTP 403)
- [R1] PEGI, What do the labels mean: https://pegi.info/what-do-the-labels-mean
- [R2] USK, The USK Age Ratings: https://usk.de/en/the-usk-age-ratings/
- [R3] USK title record, Skatfreunde (12, "Erhöhte Kaufanreize"): https://usk.de/en/usktitle/57710/
- [R4] Secondary, on PEGI's 2020 gambling criterion: https://www.askaboutgames.com/news/pegi-rating-for-gambling-is-now-always-18 (search extract only)
- [K1] Kotaku, 2 Jan 2025, on Luck Be a Landlord and Google Play (secondary): https://kotaku.com/balatro-luck-landlord-google-play-store-gambling-mobile-1851731303
- Australia, mandatory minimum classifications from 22 Sep 2024: https://www.classification.gov.au/about-us/media-and-news/news/new-mandatory-minimum-classifications-for-gambling-games-content (HTTP 503; search extract only)
- App Store pages (US store):
  - [S1] Business Tycoon Simulator: https://apps.apple.com/us/app/id1630754749
  - [S2] TyconX: https://apps.apple.com/us/app/id6755660496
  - [S3] Idle Bank Tycoon: https://apps.apple.com/us/app/id1645281275
  - [S4] Business Empire: RichMan: https://apps.apple.com/us/app/id6451208928
  - [S5] Stock Market: Investor Tycoon: https://apps.apple.com/us/app/id1556009493
  - [S6] Investor Tycoon: Buy The World: https://apps.apple.com/us/app/id1634081571
  - [S10] Hay Day: https://apps.apple.com/us/app/id506627515
  - Also read, not cited above: Farming Simulator 23 Mobile, 4+, sells coin packs (https://apps.apple.com/us/app/id6444400410); RollerCoaster Tycoon Classic, 4+, sells expansions only (https://apps.apple.com/us/app/id1113736426); Transport Tycoon, 4+, paid (https://apps.apple.com/us/app/id634013256). Their loan features are from memory and were not shown on the pages.
