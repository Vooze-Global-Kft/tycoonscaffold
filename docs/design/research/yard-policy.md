# Scrapyard: store rules for pretend markets, names, groups and accounts

Read 25 November 2026; Apple's guidelines show "Last Updated: October 16, 2026". Checked the same day by a second reader, who re-opened A1–A5, G1, G3, G6–G12, G14, X1, X2, X4, F1, R3, L2–L4 and corrected §2, §3, §5 and the checklist. [n] marks a source (list at the end). Quotes are exact. **Inference** marks my reasoning. Forum posts and law-firm notes are individual reports. Not legal advice. `policy.md` and `spam.md` (chests, deals, gems, ad placement, COPPA basics, reskins) still apply and are not repeated.

## 1. Pretend prices, pretend shares, rankings

**The rules target real money.**
- Apple 5.3.3: "Apps may not use in-app purchase to purchase credit or currency for use in conjunction with real money gaming of any kind." 5.3.4: "Lottery apps must have consideration, chance, and a prize." [A1]
- Google: "we don't allow content or services that enable or facilitate users' ability to wager, stake, or participate using real money (including in-app items purchased with money) to obtain a prize of real world monetary value." [G1]
- Financial apps. Apple 3.2.1(viii): "Apps used for financial trading, investing, or money management should be submitted by the financial institution"; 3.2.2(viii): binary options apps "are not permitted" [A1]. Google: financial products are "those related to the management or investment of money and cryptocurrencies, including personalized advice", and "Any app that contains any financial features must complete the Financial features declaration form" [G2].

**What the rating forms ask.**
- Apple [A2]: "Gambling: Betting or wagering using real money or in-game currency that may be exchanged for real money." "Simulated Gambling: Betting or wagering without using real money or in-game currency that can be exchanged for real money." "Contests: Events that allow users to compete with one another for rankings, rewards, or the achievement of personal goals."
- Apple's resulting ratings [A2]: infrequent simulated gambling 13+ (Australia "R 18+", Brazil A12); frequent simulated gambling 18+; infrequent contests 4+; frequent contests 13+.
- IARC (Google Play): ratings are "determined by your questionnaire responses"; "Misrepresentation of your app's content may result in its removal or suspension" [G3]. The questions are visible only inside Play Console; not read.
- ESRB: "Simulated Gambling ... Typically assigned to simulations of casino-based gambling." [R1]

**Inference: how the game stays clearly outside gambling and finance.**
- Apple's test is "betting or wagering". Buying scrap, smelting it and selling ingots at a moving price is trade in goods.
- The game has none of these:
  - up/down stakes (a binary option);
  - leverage, margin, shorts, futures or options;
  - pots that a winner takes;
  - wheels or draws that set prices;
  - buying other firms' shares only to resell them.
- The player's own listing is a valuation of their own company, which is one step on the ladder.
- Prices follow in-game supply and demand, are shown before each choice and are applied as shown.
- Honest answers then: Simulated Gambling none; Contests frequent, giving Apple 13+, which is the house rating anyway.
- Words: market, price board, contract, valuation; never bet, stake, jackpot, odds, invest, tips, returns.
- The help screen says: "All prices, exchanges and shares are fictional and have no real-world value. Nothing in this game is financial advice."
- In-game money can never be cashed out or sold between players. A cash-out path, even an unofficial one, would make the honest answer "Gambling" (18+).
- No crypto, tokens or NFTs: Google lists "Blockchain-based Content" as restricted [G1], and PEGI rates NFT mechanics 18 [R3].

**Prizes of real value.**
- Apple 5.3.1: "Sweepstakes and contests must be sponsored by the developer of the app". 5.3.2: "Official rules ... must be presented in the app and make clear that Apple is not a sponsor" [A1].
- Google lists as a violation an app inviting users to "COMPETE!" in a tournament "for a chance to win a cash prize" where money takes part [G1].
- **Inference:** purchases help a company grow, so a prize for rank is a prize reached partly with "in-app items purchased with money", which Google bans. National prize-promotion law adds rules on top (from memory, not read). **No prize of real value, ever.** Rank rewards are cosmetic: titles, badges, a plaque in the yard.

## 2. Real names, logos, exchanges and prices

**Store rules.**
- Apple 5.2.1: "Don't use protected third-party material such as trademarks ... and don't include misleading, false, or copycat representations, names, or metadata". 1.1.2: "'Enemies' within the context of a game cannot solely target a specific ... corporation, or any other real entity." [A1]
- Google: "Don't use another party's trademarks, such as logos or brand names without permission and/or in a way that could confuse users"; infringement is use of "an identical or similar trademark in a way that is likely to cause confusion as to the source" [G4]; no apps that "impersonate any person or organization" [G5].

**The London exchange.**
- The Usage Licence is narrow: "A LME Usage Licence is required by any firm that uses LME data or trademark(s) for either of the following uses, other than for limited internal business use": valuation or pricing, or "As a reference price in transactions".
- Showing prices to app users is a different case: "Additional market data licensing agreements are required for" "Distribution of data to third parties" and "Creation of derived data products (e.g. indices, certificates or CFDs)" [X1].
- Licensees displaying data should show that it "may not be copied or further distributed or modified in whole or in part without the prior written permission of the LME" [X2].

**The Shanghai exchange** (its copyright statement; my translation in brackets).
- "本网站提供的所有资料（包括但不限于行情信息、市场统计信息等）...的知识产权均归属上海期货交易所" [all material, including quote information and market statistics, is the exchange's intellectual property].
- "未经上海期货交易所书面许可，任何机构或者个人不得以向他人出售牟利为目的，使用本网站的任何内容" [without written permission, no one may use any content for the purpose of selling to others for profit]. Non-commercial browsing is allowed [X4].

**Inference.**
- A game earning from purchases and ads is commercial. Real prices (live, delayed or historical), and numbers derived from them, need both exchanges' permission.
- The rule: no real feed, history or index. Prices come from the game's own model, in its own currency and units, so no number reads as today's copper price.

**Care that invented names and logos still need (Inference from the confusion tests).**
- No near-miss of a real name: no changed letter, no sound-alike, no swapped word ("Samsong", "London Metals Market", "LMX").
- No real city in an exchange name.
- No logo that recalls a known brand by its colour pair and shape, and no real ticker.
- Rival firms do nothing wrong that maps onto a real company.
- Search the title and every name in trademark registers and in both stores before release.
- Metal, alloy, process and machine-type names are generic words and are fine. Machine brands are not.

## 3. Text typed by players

**Apple 1.2** [A1]. Apps that let users "create, generate, upload, share, or otherwise contribute content" must include:
- "A method for filtering objectionable material from being posted to the app";
- "A mechanism to report offensive content and timely responses to concerns";
- "The ability to block abusive users from the service";
- "Published contact information so users can easily reach you".

Apps used "primarily for ... random or anonymous chat, ... or bullying do not belong on the App Store". "It is your responsibility to remove content that violates this guideline".

**Google, User Generated Content** [G6]. UGC "is content that users contribute to an app, and which is visible to or accessible by at least a subset of the app's users". The app must:
- require "users accept the app's terms of use ... before users can create or upload UGC";
- define objectionable content and prohibit it in those terms;
- provide "an in-app system for reporting and blocking objectionable UGC and users, and taking action";
- for "publicly accessible UGC", let users "report users and content, and ... block users";
- provide "safeguards to prevent in-app monetization from encouraging objectionable user behavior".

**Does a name alone count?** By Google's definition, yes. Apple's form lists "User-Generated Content ... broadly distributed ... text ... created by users" [A2]. **Inference:** a company or player name shown on a leaderboard, a company page or a member list needs the whole kit.

**What a reviewer asked for.** Individual report: a social app's developer posted the rejection text in November 2025 [F1]:
- "Require that users agree to terms (EULA) and these terms must make it clear that there is no tolerance for objectionable content or abusive users";
- a filter, flagging and blocking;
- "The developer must act on objectionable content reports within 24 hours by removing the content and ejecting the user who provided the offending content".

A later round added in-app contact details and a reviewer login or "a demonstration mode".

**Chat.**
- Apple: "Messaging and Chat" is declared; it is 4+ in the main table and A12 in Brazil [A2].
- IARC adds the notice "Users Interact: Indicates possible exposure to unfiltered/uncensored user-generated content, including user-to-user communications" [R1].
- PEGI from 2026: "Games with entirely unrestricted communication features, meaning no blocking or reporting functionality, will receive a PEGI 18 rating" [R3].
- UK: games where users create content or chat that others may see are user-to-user services. They need an illegal-content risk assessment and a children's access assessment [R4] (Ofcom's own page returned HTTP 403).
- **Inference:** free chat makes every message UGC to moderate, among strangers on anonymous accounts, close to Apple's "random or anonymous chat". Phrases picked from a fixed list are not user-created text, so they carry none of this. **No free chat.** Companies get fixed phrases and emotes, and founders pick notices from a fixed list.

**What small publishers usually do** (Inference and memory, not read today): a word filter on device and server (several languages, look-alike letters folded, no links or digit runs); new names visible only to their author until passed; a reported name falls back at once to "Company #48213"; generated default names offered.

**Other laws on the same features** (secondary [R3]; not read at the source).
- UK: Ofcom's children's codes, "in force since July 2025", require in-scope services to "allow children under the age of 18 to block or mute accounts, manage group chat invitations". **Inference:** company invitations can be declined and switched off by the player.
- EU: under the Digital Services Act, UGC "that make[s] information available to a potentially unlimited number of recipients may bring the service within the scope of the DSA's 'online platform' obligations" (reporting and complaints). A public leaderboard of player-typed names may qualify; which duties a small publisher is exempt from is from memory and unchecked: ask a lawyer.

**This game's kit (L5d).**
1. Terms accepted before the first name.
2. Name filtering on the device and on the server.
3. A report button on every name, company page and member row.
4. Blocking: the blocker stops seeing the other player's names, and the blocked player can neither join the blocker's company nor see their invitations.
5. Founders can remove members.
6. An operator queue, with action and bans within 24 hours.
7. An in-app support contact and a support URL.
8. A reviewer account or demo mode, and review notes that describe the kit.

## 4. Accounts and personal data

**A silent anonymous account is acceptable.**
- Apple 5.1.1(v): "If your app doesn't include significant account-based features, let people use it without a login"; apps "may not require users to enter personal information to function" [A1].
- Apple's deletion FAQ: "People should have the option to delete automatically generated accounts (sometimes called 'guest' accounts) and the data associated with those accounts." [A3]

**Sign in with Apple.**
- Required only when a third-party login such as "Google Sign-In" sets up the primary account. It is not needed if "Your app exclusively uses your company's own account setup and sign-in systems" (4.8 [A1]).
- **Inference:** not needed now. If Google or Facebook login is added later, Sign in with Apple (or an equal service) must be added too.

**Deletion, Apple** [A3]: "Make the account deletion option easy to find"; "only offering to temporarily deactivate or disable an account is insufficient"; outside regulated fields no "phone call, send an email"; if it takes time, "Inform the person how long it will take"; it covers "user-generated content that's shared with others"; it is offered everywhere, not only where "CCPA, GDPR, or other local laws" demand it.

**Deletion, Google** [G7].
- Provide "an in-app path to delete their app accounts and associated data" and "a web link resource where users can request app account deletion".
- The web page names the app or developer and works "without sending the user back to the app".
- Data kept for "security, fraud prevention or regulatory compliance" must be disclosed.
- "accounts that are created and operated offline are not app accounts".
- **Inference:** a server account needs both paths; the offline local mode (L5a) has no account.
- **Inference:** deleting removes the id, name, scores and history. A company is passed to its oldest member, or dissolved if the player was the last member.

**Apple privacy label** [A4].
- "User ID: Such as screen name, handle, account ID".
- "Gameplay Content: Such as saved games, multiplayer matching or gameplay logic, or user-generated content in-game".
- "'Personal Information' and 'Personal Data', as defined under relevant privacy laws, are considered linked to the user."
- **Inference:** declare User ID, Gameplay Content and Other User Content, all linked to the user, for App Functionality, plus whatever the SDKs collect.

**Google Data safety** [G8].
- "Name: ... first or last name, or nickname"; "User IDs: ... an account ID"; "Other user-generated content"; "Other actions: ... such as gameplay"; "Device or other IDs".
- A hosting "service provider" that "processes user data on behalf of the developer" is not "sharing", but the data still counts as collected.
- **Inference:** declare Name (display name), User IDs, Other UGC (company name), Other actions (scores), Device IDs if an install id is sent, and the SDKs.

**GDPR in plain words** [L1].
- Lawful basis: running the leaderboard and the companies a player joins is "necessary for the performance of a contract" (Art. 6(1)(b)). Anti-cheat and moderation rest on legitimate interests (6(1)(f)). Personalised ads need consent.
- The privacy policy must give what Art. 13 lists:
  - "the identity and the contact details of the controller";
  - purposes and "the legal basis";
  - "the recipients or categories of recipients" (name the server host and any moderation or analytics service);
  - transfers outside the EU and their safeguards;
  - "the period for which the personal data will be stored";
  - the rights of access and erasure;
  - "the right to lodge a complaint".
- Art. 8 sets a consent age of 16, which states may lower to 13, but only "Where point (a) of Article 6(1) applies". **Inference:** basing gameplay data on contract avoids parental consent for it; ad consent still follows the age rules.
- A data processing agreement with the host is required (Art. 28, from memory).

**US children's rule** [L2].
- Personal information includes "A screen or user name where it functions in the same manner as online contact information" and "A persistent identifier that can be used to recognize a user over time".
- Disclosure includes "Enabling a child to make personal information publicly available". The operator is not collecting "if it takes reasonable measures to delete all or virtually all personal information from a child's postings before they are made public".
- An id used to "Authenticate users of, or personalize the content" is internal support.
- **Inference:** the name filter (no digits, links or addresses) is also the COPPA safeguard.

**The privacy policy** (Apple 5.1.1(i) [A1] plus Art. 13) lists what is collected (id, names, membership, scores, reports, SDK data) and every use; every third party, each giving "the same or equal protection"; retention and how to "revoke consent and/or request deletion"; the Art. 13 items; how children are treated. It is linked in the app and both listings.

## 5. Children and the age rating

**Apple** [A2].
- UGC and Messaging and Chat are declared but sit at 4+ (Brazil: UGC A6, chat A12, and "Advertising" also A12, so this game shows A12 in Brazil whatever else it does).
- "Social Media: Redistribution, amplification, or interaction with user-generated content through a social feed ... views, likes, comments, and shares" is 13+.
- "Unrestricted Web Access" is 16+.
- **Inference:** a company page with no feed, likes or comments keeps the Social Media item off.

**IARC.**
- Interactive elements "do not influence the rating assignment" (ESRB [R1]).
- USK notes that "user-generated content might generally contribute to the youth protection relevance" [G3].
- In "the European Economic Area (EEA), Australia, Brazil, Indonesia, Singapore, Switzerland and the United Kingdom only", Google blocks 18+ apps for users determined to be minors [G3].

**Inference: the rating that follows.**
- With filtered names, fixed phrases, frequent contests and no gambling: Apple 13+.
- PEGI's 2026 criteria (secondary [R3], also in `policy.md` §2): "time-limited or quantity-limited purchase offers" give at least PEGI 12; rewards for returning (daily quests, login streaks) at least PEGI 7, and 12 if absence is punished. So with the house's timed deals, expect PEGI 12, not 3–7; without them and with daily rewards, PEGI 7. Whether IARC on Google Play already applies these criteria is unverified. Expect "Users Interact" and "In-Game Purchases" notices.
- Chat without reporting or blocking gives PEGI 18 [R3], and fails the store rules anyway.

**Stay out of the kids and families programmes.**
- Google's audience guide says apps for ages 9–12 may be unsuitable if they "Allow opportunity for direct interaction between users" [G9].
- A child audience brings social-feature duties: "an in-app reminder to be safe online", "a method for adults to manage social features", and "adult action before enabling features that allow children to exchange personal information" [G10]. It also limits ads to Families-certified SDKs [G3].
- Apple's Kids Category bars ungated purchases and most third-party ads [A1 1.3].
- Google adds that ages 13–15 "may be considered to include children in some locales" [G9].
- **Inference:** Google target 13+, never the Kids Category, an adult cast on the store page, ad settings as in `policy.md`.
- **Inference:** players in the under-13 age band (`policy.md` §3 and Checklist item 8) get the offline local mode only: no shown name, no companies.
- US state app-store laws (Texas, Utah, Louisiana) require developers to receive and use the store's age and parental-consent signals; Texas's took effect after an appeals court stayed an injunction on 28 May 2026, and Utah's dates have moved (law-firm reports found by search, not opened; individual reports). The age band of `policy.md` §3 is the hook; the dates need a lawyer.

## 6. Other players and purchases

**Selling advantages in a ranked game.**
- Odds disclosure does not apply (nothing random is sold), and no store rule bans selling advantages. What applies: Apple 2.3.1 ("marketing your app in a misleading way" [A1]), Google's monetisation safeguard [G6], the ban on real prizes (§1), the EU consumer principles (`policy.md` §2).
- **Inference:** purchases buy time and comfort, never a rank or market power that only money reaches; boards are seasonal, grouped by start week, and one ranks only what money cannot move.

**Gifting between players.**
- Apple 3.1.1: "Apps may enable gifting of items that are eligible for in-app purchase to others. Such gifts may only be refunded to the original purchaser and may not be exchanged." Bought currency "may not expire" [A1].
- Google: "In-app virtual currencies must only be used within the app or game title for which they were purchased" [G11].
- **Inference:** companies may pool earned resources toward shared goals. Bought currency or items never move between players: transfers feed outside resale for real money (§1), and they open a path for pressuring minors.

**Ad rewards.**
- `policy.md` §5 applies.
- Google exempts "rewarded ads which are explicitly opted-in by users" from its interruption rules [G12].
- **Inference:** ad rewards are personal and never count toward a ranking.

## 7. The stores' own game services

**Game Center** [A5]: "leaderboards, achievements, multiplayer matchmaking, and real-time play"; enabled games "appear in more places ... and on the App Store in featured placements"; "notifications automatically sent to players when their friends pass their score". No groups or guilds. 4.5.3 bars mining "Player IDs, aliases, or other information obtained through Game Center" [A1].

**Play Games Services** [G13]: "Achievements and leaderboards", "Consistent Gamer Profiles", "Social Graph"; public and social leaderboards with "tamper protection ... enabled by default". No groups.

**Neither is required by review.**
- Google's Level Up programme is "voluntary". It rewards games that "Integrate the Google Play Games Services v2 SDK and ensure it initializes at startup" and have "a minimum of 10 achievements" [G14].

**Inference.**
- Both need native modules, which Expo Go cannot load and which L5b forbids. They are a later option (achievements, a mirror of one board), and neither does companies of 30, so our own server is needed in any case.
- With our own server, §3 and §4 are ours to provide.
- The reviewer needs a test account or demo mode, a live seeded server, and notes on filtering, reporting and deletion (2.3.1(a) [A1]; [F1]).
- Online features switched on after review would be hidden features (2.5.19, `spam.md`).

## 8. Environmental and safety claims

**Green claims.**
- US: "It is deceptive to misrepresent, directly or by implication, that a product, package, or service offers a general environmental benefit"; "marketers should not make unqualified general environmental benefit claims" [L3].
- EU, from "27 September 2026": "Making a generic environmental claim for which a trader is not able to demonstrate recognised excellent environmental performance relevant to the claim" is banned outright [L4].
- Apple bars "unverifiable product claims" in creative assets (2.3.14) and in-app charity collection (3.2.2(iv)) [A1].
- **Inference:**
  - Playing recycles nothing, so "eco-friendly", "green", "sustainable", "help the planet" and tree-planting promises stay off the store page, the ads and the loading screens.
  - Recycling tonnage inside the fiction is fine.

**Dangerous activities.**
- Apple 1.1.3 bars "Depictions that encourage illegal or reckless use of weapons and dangerous objects". 1.4.5: apps "should not urge customers to participate in activities ... that risks physical harm" [A1].
- Google: "We don't allow apps that depict or facilitate gratuitous violence or other dangerous activities. Apps that depict fictional violence in the context of a game, such as cartoons ... are generally allowed"; and no "instructions for the manufacture of explosives" [G15].
- Store art must suit 4+ (2.3.8 [A1]).
- **Inference:**
  - Cartoon torches and furnaces are fine, with protective gear on every worker.
  - A battery fire is something the yard prevents and puts out; it is never a spectacle or a reward.
  - Processes are named and drawn, not taught step by step (L3).
  - No injuries, and no "try this" challenges.

## DO and DO NOT

**(a) Content, names and logos**
- DO invent every company, exchange, city, country, ticker and logo, and search each name; keep metals, alloys and processes real and generic.
- DO make prices in the game's own currency from its own model, show the "fictional, not financial advice" line, and show hazards handled safely.
- DO NOT use a real brand, a near-miss of one, a real city in an exchange name, or a real price feed, history or index.
- DO NOT add bets, up/down stakes, leverage, shorts, futures, options, pots, wheels, crypto, or speculation in other players' shares.
- DO NOT show real procedures, injuries or green-benefit claims.

**(b) Online features**
- DO create a silent anonymous account, with offline local mode for under-13s and for when there is no network.
- DO require terms before the first name; filter on the device and the server; hold new names until passed; use neutral fallback names.
- DO give report on every name, blocking, and founder removal; act on reports within 24 hours; provide an in-app contact.
- DO let a player decline and switch off company invitations.
- DO limit company talk to fixed phrases and emotes.
- DO offer in-app account deletion that states its time and removes names, scores and company data, plus a public web deletion page.
- DO check ranks on the server; run seasonal boards, one of them money-proof.
- DO NOT add free chat, feeds, likes or comments, and allow no links or digit runs in names.
- DO NOT allow transfers of bought currency or items, or cash-out of any kind.
- DO NOT give real-value prizes.
- DO NOT add social login without Sign in with Apple.
- DO NOT add Game Center or Play Games Services before a native build allows them.

**(c) Store page, purchases and ads**
- DO describe a fictional business sim, with purchases that speed up growth and online companies that are moderated.
- DO keep all of `policy.md`: no chests, honest offers, exact ad rewards, 13+, no kids programmes; timed deals mean PEGI 12.
- DO NOT write "eco", "green", "save the planet", "learn to trade", "invest", "win", "jackpot" or "prizes".
- DO NOT put real company or exchange names in keywords.
- DO NOT let ad rewards count toward a rank, and DO NOT sell rank, market power or company slots that play cannot earn.

## What the OWNER must do before release

1. Apple age rating form:
   - Gambling none; Simulated Gambling none; Contests frequent; Loot Boxes no.
   - User-Generated Content yes; Advertising yes; Social Media no.
   - Messaging and Chat no, provided only fixed phrases ship (**Inference**).
   - In-App Controls: "Age assurance" yes only if the age band ships [A2].
   - Then raise the rating to 13+ by hand.
2. Google Play forms:
   - IARC questionnaire with the same facts.
   - Target audience 13+.
   - Financial features declaration: none.
   - Ads declaration.
3. Apple privacy label and Google Data safety form as in §4, including the SDKs, the data deletion questions and the web deletion link.
4. Documents:
   - a privacy policy (the §4 list, naming the host);
   - terms of use with a zero-tolerance clause;
   - both linked in the app and in the listings;
   - a support URL and email.
5. A data processing agreement with the server host.
6. UK Online Safety Act assessments: illegal content and children's access [R4]. Ask a lawyer about the EU Digital Services Act and the US state app-store age laws (§3, §5).
7. Trademark searches for the title and every invented name and logo.
8. A moderator who reads reports within 24 hours, with operator tools.
9. Review notes covering filtering, reporting and deletion; a test account or demo mode; the server live and seeded during review.

## Sources (read 25 November 2026)

- [A1] Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- [A2] Apple, Age ratings values and definitions: https://developer.apple.com/help/app-store-connect/reference/age-ratings
- [A3] Apple, Offering account deletion in your app: https://developer.apple.com/support/offering-account-deletion-in-your-app/
- [A4] Apple, App privacy details: https://developer.apple.com/app-store/app-privacy-details/
- [A5] Apple, Game Center: https://developer.apple.com/game-center/
- [G1] Play, Real-Money Gambling, Games, and Contests: https://support.google.com/googleplay/android-developer/answer/9877032
- [G2] Play, Financial Services: https://support.google.com/googleplay/android-developer/answer/9876821
- [G3] Play, Content ratings: https://support.google.com/googleplay/android-developer/answer/9859655
- [G4] Play, Intellectual Property: https://support.google.com/googleplay/android-developer/answer/9888072
- [G5] Play, Impersonation: https://support.google.com/googleplay/android-developer/answer/9888689
- [G6] Play, User Generated Content: https://support.google.com/googleplay/android-developer/answer/9876937
- [G7] Play, Account deletion requirements: https://support.google.com/googleplay/android-developer/answer/13327111
- [G8] Play, Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- [G9] Play, Target audience: https://support.google.com/googleplay/android-developer/answer/9867159
- [G10] Play, Families: https://support.google.com/googleplay/android-developer/answer/9893335
- [G11] Play, Payments: https://support.google.com/googleplay/android-developer/answer/9858738
- [G12] Play, Ads: https://support.google.com/googleplay/android-developer/answer/9857753
- [G13] Play Games Services overview and leaderboards: https://developer.android.com/games/pgs/overview , https://developer.android.com/games/pgs/leaderboards
- [G14] Play Games Level Up guidelines: https://developer.android.com/games/guidelines
- [G15] Play, Inappropriate Content: https://support.google.com/googleplay/android-developer/answer/9878810
- [X1] LME Usage Licence FAQs, July 2026: https://www.lme.com/-/media/files/data/market-data-licencing/usage/usage-licence-faqs-july-2026.pdf
- [X2] LME Market Data Policy, July 2026, §4.3.2: https://www.lme.com/-/media/files/data/market-data-licencing/lme-market-data-policy-july-2026.pdf
- [X4] Shanghai Futures Exchange, 版权声明: https://www.shfe.com.cn/disclaimer/
- [R1] ESRB ratings guide: https://www.esrb.org/ratings-guide/
- [R3] Reed Smith on PEGI's 2026 criteria, 23 Mar 2026 (secondary): https://www.reedsmith.com/articles/pegi-launches-interactive-risk-categories-overhauls-age-ratings-for-loot-boxes-in-game-spending-and-communication-features/
- [R4] Lewis Silkin on Ofcom's games guidance, 24 Oct 2025 (secondary; Ofcom's page returned 403): https://www.lewissilkin.com/insights/2025/10/24/ofcom-issues-guidance-about-online-safety-act-in-video-gaming-context-102lr5v
- [F1] Apple Developer Forums, Guideline 1.2 rejection, Nov 2025 (individual report): https://developer.apple.com/forums/thread/807358
- [L1] GDPR Arts. 6, 8, 13 (text via gdpr-info.eu): https://gdpr-info.eu/art-13-gdpr/
- [L2] 16 CFR 312.2 (COPPA definitions): https://www.ecfr.gov/current/title-16/part-312/section-312.2
- [L3] 16 CFR 260.4 (Green Guides): https://www.ecfr.gov/current/title-16/part-260/section-260.4
- [L4] European Commission, Q&A on Directive (EU) 2024/825, Sep 2026: https://commission.europa.eu/document/download/3c257883-bb2a-4dd9-a6dc-501d587bb34f_en
