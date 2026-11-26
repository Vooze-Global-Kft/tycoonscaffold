# Scrapyard: Groups of up to 30 in farm and tycoon games (the owner named Hay Day's neighbourhoods as the model)

Researched on 26 November 2026 for step "research-social", by reading pages today: the publishers' own help centres first (Supercell's Hay Day support portal, Playrix's Township and Gardenscapes help, Dream Games' Royal Match help, EA's SimCity BuildIt help), then two fan wikis (the Hay Day Fandom wiki and the Eatventure Fandom wiki, read through their public page-source interface), then trade press and analysts (PocketGamer.biz, mobilegamer.biz, GameRefinery, Naavik). Reddit and two help pages would not load (marked "search extract only"). Searches used only public game names and general words; nothing about this project went into any query. Every claim is marked **VERIFIED** (read today on the page named), **REPORTED** (a secondary source or a search extract) or **INFERENCE** (mine). Rules are described in my own words; no table, task list or text of another game is reproduced. Numbers are as read on 26 November 2026.

---

## The answer in brief

1. **What the owner pointed at is a group of up to 30 farms that share a weekly contest, ask each other for goods, and see each other.** Every member keeps their own farm. The group adds a building on each member's farm, a request board, a chat, and a weekly race against about 14 similar groups, with leagues that go up and down. That shape fits our design as it stands (section 7 of the specification): each player keeps their yard, and the company is the group.
2. **The weekly contest is what made the group matter.** Hay Day's former designers say neighbourhoods were "just a place to talk and perhaps do some trading" until the weekly race arrived, and that the race "changed the game completely" (REPORTED, PocketGamer.biz and mobilegamer.biz, 21 June 2022). Our weekly company order is the right centre.
3. **Its fairness comes from three rules worth having in our own form:** the roster is frozen when the week starts; groups are matched with groups that have the same number of *taking-part* members; and the goal per member is the same whatever the group's size. Without them a big group always wins and a small one never gets anywhere.
4. **Its weak spots are known:** players kicked during the week lose their prizes (complaints); tasks are generated from the highest-level member (low-level members can be shut out); premium currency buys an extra task and reshuffles prizes; the roadside shop's price floor of 1 coin makes it a channel for trading for real money (resellers advertise delivery through it). Our design should not copy any of these.
5. **30 is Hay Day's number; the trend has moved to 50.** Township's co-ops became "Teams" of up to 50 (recently), Gardenscapes and Royal Match allow 50, SimCity BuildIt's clubs 25. The owner chose 30: it is a good size for a weekly goal that each member can see their part in.
6. **Do not build a player-to-player stand with free prices.** The owner's "yard sales" belong to another researcher, but the stand is part of the model he named: its abuses are in section 3, and section 6 says what form is safe here.

---

## 1. The neighbourhood as it is today

| Question | What the game does today | Mark and source |
|---|---|---|
| Size | "a group of 1 to 30 players". The publisher's support pages I read do not state the number. | REPORTED, Hay Day wiki "Neighborhood" [W1]; not found on the support portal |
| Unlock and cost | The Neighborhood House can be repaired at farm level 10; creating a group costs 500 coins; joining is free. | VERIFIED [S1]; repair cost (200 coins) REPORTED [W1] |
| Name | 1 to 25 characters; no rude, offensive or political content, no personal information; "cannot be changed" once created; moderators may replace an inappropriate name with a default that cannot be changed back. | VERIFIED [S1] |
| Kinds | Anyone can join; request only (leaders accept or decline); invite only. A "Family Friendly" kind filters chat more strictly, cannot be changed back to regular, and is the only kind open to accounts under 16. | VERIFIED [S1], [S5] |
| Settings | Name, emblem, kind, minimum level, preferred chat language, tags; leaders can show or hide the contest's task log. | REPORTED [W2] |
| Emblem | A shape, a symbol, a background pattern and two colours picked from fixed lists; the emblem appears on the building on every member's farm. | REPORTED [W2] |
| Joining | From a suggested list, a search (with filters), an invitation, or by visiting a member's farm and tapping their building. The search shows name, kind, emblem and member count, and marks groups where friends are, whose average level matches yours, or whose chat language is yours. One group at a time. | VERIFIED [S1]; search details REPORTED [W1] |
| Tag | Each group has a unique code (a hash sign, letters and digits) used to find it or to name it to support. | VERIFIED [S2] |
| Roles | Four: Leader (invite and kick anyone, edit roles and settings, discard contest tasks, opt members out of the contest, step down in favour of a co-leader); Co-leaders (invite, accept requests, promote and kick members and elders, demote elders, discard tasks, opt members out); Elders (invite, accept requests, discard tasks); Members (no rights). | VERIFIED [S2] |
| Leader leaves | The highest role who has been in the group longest becomes Leader. | VERIFIED [S2] |
| Leader inactive | After 30 days, leadership passes to the longest-serving co-leader or elder; with neither, it is not reassigned. Only the new leader can give it back. "Support takes no direct action in Neighborhoods." | VERIFIED [S2] |
| Kick | A kicked player waits 24 hours before rejoining that group. | REPORTED [W2] |
| Chat | Free chat with a word filter that reads every line and name, judges language, topic and how harmful a message is, and catches misspellings and words split over two messages; family-friendly groups get a stricter filter that also blocks personal information and links away. Leaders and co-leaders can post up to 5 notices to all members. Muted accounts can play but not chat. | VERIFIED [S2], [S6], [S7] |
| Chat reports | If three members report the same player, that player is barred from chat for 24 hours. | REPORTED [W2] |
| Requests (help) | A member asks for one kind of item every 8 hours, in small amounts that depend on the item type; others donate one unit at a time; each player may donate up to 40 items a day and earns experience for each; you can only donate what was asked for. Diamonds skip the wait; a season-pass perk adds one request a day. | VERIFIED [S3] |
| Weekly recognition | Every Monday each member gets a title from their giving and asking in the past week; every member can see everyone's donation counts for the past week. | VERIFIED [S3] |
| Seasonal shared object | A newer seasonal event in which the group grows one shared object by completing weekly tasks, with group perks and personal rewards; tasks can be swapped for diamonds or extended by watching an ad. | VERIFIED [S4] (undated) |
| What members see of each other | Their farms (quick visit), their help signs, the past week's donation counts, and (if the leader allows) each member's contest tasks and points. | VERIFIED [S2], [S3]; REPORTED [W1] |
| Friends, blocks | Friends and followers are separate from the group; blocks expire after 30 days. | VERIFIED [S8] |

**What this means for us (INFERENCE).** Our specification (7.2) already has most of this: leader, up to three co-leaders, three kinds, an emblem from fixed parts, removal, succession on inactivity. What it lacks from the model the owner named is (a) a visible home of the company in each member's yard, (b) help requests between members, (c) a weekly line of recognition, and (d) a way to find a company that suits you. Section 6 turns these into our own form.

---

## 2. The weekly contest

### 2.1 The rules today (all VERIFIED on the support portal [S9]–[S12] unless marked)

- **When.** Tuesday 08:00 UTC to the following Monday 08:00 UTC; Monday is a 24-hour break.
- **Who.** Members at farm level 18 or above. During the Monday break a player opts in, opts out, or moves to another group; nobody can opt in after the race starts. Joining a group mid-race means waiting for the next one. The wiki adds that players inactive for a while are opted out automatically, and that a leader or co-leader can opt a member out but the member can opt back in (REPORTED [W3]).
- **Leaving mid-race.** If you leave or are kicked, your points still count for the group, but you cannot claim prizes.
- **Tasks.** Tasks sit on a shared board. Each player takes one at a time; it shows what to do, a time limit and its points. Finish within the time and the group gets the points; let the timer run out and you get nothing, and the attempt still uses up one of your tasks for the week (the last point REPORTED [W3]). Tasks are generated from the highest farm level among taking-part members; a member can take any task at or below their own level, even without the building it needs.
- **How many tasks.** A per-player weekly allowance that depends on the group's league. One extra task can be bought with diamonds (a cheaper daily one in the calm variant).
- **Discarding.** The leader, co-leaders and elders can discard an untaken task; a new one appears after a short wait (the wiki says 30 minutes [W3]).
- **Points and prizes.** Points move the group along a track; checkpoints along it each unlock one prize choice per member at the end. Members who completed no task, or who left, get nothing. The top three groups also get placement prizes, sometimes exclusive decorations. Players can pay diamonds to reshuffle their prize choices.
- **Ties.** Broken by who reached their points sooner.
- **Leagues.** Five leagues; each allows more tasks and prizes than the one below. The top three groups go up; the bottom three go down, and so does any group that did not reach the first checkpoint or had nobody taking part. Others stay. The top league has no promotion; instead a global table ranks groups by their average over the last four weeks, from points per taking-part player, a bonus for larger groups, a placement bonus, and a deduction for tasks discarded per player.
- **Matching.** A group is matched with up to 14 others in the same league "of a similar size", where size is the number of members who opted in, not the number in the group; in higher leagues a rival may have one member more or fewer.
- **Variants.** A calm week with no promotion or relegation, easier tasks, a daily allowance, task stacks that refill each day, and no discarding; an easier week worth the same points; weeks with a shared bonus grid or timed side-goals that reward planning together. (These are the publisher's own themed variants: signatures, see section 6.)

### 2.2 What a small or half-active group experiences

- **The goal scales with taking-part members.** The wiki's checkpoint table grows roughly in step with the number of opted-in members (REPORTED [W3]). So a group of 8 active members in a group of 30 races other groups of about 8: the 22 idle members cost nothing.
- **Very small groups cannot reach the last prizes.** The wiki notes that groups with fewer than 4 taking part cannot reach some checkpoints even with only the best tasks, "a known limitation" (REPORTED [W3]).
- **Doing nothing has a cost.** A group with nobody taking part drops a league (VERIFIED [S11]).
- **Opted-out members can still help** by supplying goods for others' tasks (REPORTED [W3], a strategy tip).

### 2.3 How it changed, and why

- **2014: groups first, as places to talk and trade.** "Neighbourhoods were just a place to talk and perhaps do some trading" (Camilla Avellar, former designer; REPORTED, PocketGamer.biz, 21 June 2022 [P1]).
- **First try: a leaderboard that went wrong.** "We introduced a leaderboard, but we had not fully thought through the design aspects of it"; players "were progressing in ways that we didn't want them to"; a rushed fix "made it even worse than before"; lesson: "don't make any drastic changes or decisions in the moment" (Stephan Demirdjian, former game lead; REPORTED, mobilegamer.biz, 21 June 2022 [P2]).
- **About 2015: the weekly race.** It "gave neighbourhoods a reason to play together collaboratively but also with competition in mind" (Demirdjian [P1]); "It's a big risk adding competition to a nice, casual farming game. But it really paid off" (Avellar [P2]). Press dated the launch to March 2015 (search extract only).
- **September 2015: leagues** with top-three promotion and bottom-three relegation, opting out of the next race, and showing members' points (REPORTED, IBTimes; dated by its linked forum threads [P3]).
- **Later: the top league with a global table** (search extract only, a winter update); today its score subtracts discarded tasks per player (VERIFIED [S11]). INFERENCE: the deduction exists because officers were cycling the board to fish for easy, high-point tasks.
- **"Our one metric is retention"** (Demirdjian [P1]).

### 2.4 Problems players report (REPORTED, individual complaints, search extracts only)

Players kicked after finishing all their tasks but before prizes; chat full of members "being kicked out or called out" that made a player "dread logging in"; leaders saying they remove those who take more than they give; groups recruiting with their own minimum points per week. Reddit would not load; these come from search extracts of a Reddit mirror and a complaints site [R1].

---

## 3. The roadside shop and its newspaper

### 3.1 The rules (VERIFIED on the support portal [S13], unless marked)

- Unlocks at level 7. Sell from your storage; each box holds up to 10 of one item; set the price; put on sale.
- **Price.** The wiki says the price runs from 1 coin up to 3.6 times the item's default value (REPORTED [W4]); the support page says only "adjust the price".
- **Advertising.** List a box in the shared newspaper once every 5 minutes, or skip the wait for 1 diamond. The wiki adds: an ad stops showing after 3 hours unsold; each player gets their own copy of the paper, refreshed every two minutes or so, with nine pages of ads (REPORTED [W4], [W5]).
- **Taking items back** now costs diamonds, rising with use (2, then 10, then 20), resetting after 14 days without a return. (The wiki still says items cannot be taken back: it is out of date here.)
- **More boxes** cost diamonds (up to 500) or come from adding friends (up to 13).
- **Daily limit.** At most 80 expansion and upgrade materials bought from other players per day. The wiki dates it to an October 2019 update (REPORTED [W4]).
- **Hired helper.** An errand character, hired for diamonds by the day, searches other players' shops for the cheapest offer of an item and fetches it; he naps two hours after each errand (VERIFIED [S14]). Non-player buyers also clear items left unsold for a few days (REPORTED [W4]).
- **Visiting.** Players buy from shops they find in the paper or by visiting farms; a "!" marks farms that want help with an order (REPORTED [W5]).
- **Bans.** Using third-party software leads to "a permanent ban of your Roadside Shop" (VERIFIED [S13]). Buying "in-game items or currencies from unauthorised sources" and selling accounts are against the rules (VERIFIED [S15], [S16]).

### 3.2 How it is abused

- **Trading for real money uses the shop.** A reseller site sells Hay Day coins and items for US dollars and says "We utilize the Roadside shop for transactions" (VERIFIED, read today [X1]). INFERENCE: a 1-coin floor lets a seller hand goods to a named buyer for nothing; a high ceiling lets a buyer hand coins to a seller by buying junk at the top price. Either way the shop becomes a transfer between two players who agreed elsewhere.
- **Arranged swaps.** The wiki describes forum conventions for swapping goods: a 1-coin "signal" item, then each side lists the agreed item for the other (REPORTED [W4]). Harmless in itself, it is the same mechanism.
- **Bots and modded clients** buying from the paper (the reason for the shop ban [S13]) and an old glitch that created coins by selling planks after buying a box (REPORTED [W4], fixed).
- **What the publisher did** (as far as visible): a daily limit on the scarcest goods, rising costs for taking items back, a shop ban for third-party software, account penalties for buying from outside. I found no published statement of why the daily limit came in. INFERENCE: limiting the scarce goods per day caps how much one account can funnel to another.

**For this game (INFERENCE).** Our rules forbid real money going between players and forbid anything that reads as real trading (L4), and the server must not trust a client with other people's data (L5c). A player-set price between two named players is exactly the channel the resellers use. Section 6 lists a safe form.

**Name collision to flag.** Hay Day also has a "Yard Sale Event" in which non-player visitors buy decorations from the farm (VERIFIED [S17]). "Yard sale" is plain English and free to use, but an event in which visitors buy a player's spare decorations would echo that game. The researcher on yard sales should know.

---

## 4. Comparable systems in other large casual games

| Game (publisher) | Group | Shared weekly goal | Help between members | Mark |
|---|---|---|---|---|
| **Township** (Playrix), farm and town builder | "Teams", the renamed co-ops; up to **50** (was 30); unlock at level 12; Leader, up to 5 co-leaders, members (the elder role was removed); open or closed (by-request removed); leader inactive **60 days** → longest-standing co-leader, else oldest member | A weekly boat race: 12 tasks on a board (6 puzzle, 6 town), no reserving, a per-player limit by league; points unlock chests; top 3 promote, bottom 3 or no chest relegate; matched with teams of about the same number of *active* participants (those who completed one task last race); people can join mid-race; "Players cannot be excluded from participation"; tokens to spend in a team-only store | Product requests every 4 hours, life and card requests, help with trains and planes; members see per-member help counters, reset weekly; team chat only, no private messages, no mail to all; an activity level (none to high) per team; escalating waits for leaving and rejoining (5 to 120 minutes) | VERIFIED [T1]–[T5]; the URLs suggest these pages were written about December 2025 (INFERENCE) |
| **Gardenscapes** (Playrix), puzzle and garden | Teams up to **50**; up to 3 co-leaders; leader inactive **14 days** → co-leader, else longest-standing active member; only finishing a level counts as activity, "simply entering the game is still counted as inactivity"; members inactive 180 days are removed | A weekly team rating from goals met in the last 7 days (levels, sending lives, growing the team, team events); rewards to members who contributed | Lives and cards; chat up to 500 characters; support "unable to change leadership or intervene" | VERIFIED [G1], [G2] |
| **Royal Match** (Dream Games), puzzle | Teams up to **50**; level 21; open or closed; a removed or rejected player cannot rejoin that team | Team Battle (time-limited): 20 teams; shields from beaten levels; the team needs at least 10 members; every member gets the same reward if the team is in the top 5, the top 3 contributors get extra; leaving or being kicked mid-event shuts you out of it; a contributor-by-contributor view | Lives and cards | VERIFIED [D1]–[D3] |
| **SimCity BuildIt** (EA), city-builder tycoon | Mayor's Club up to **25**; level 18; President, Vice Presidents, Seniors; the President's successor is the vice-president with most contest points; waits after being kicked grow from 30 minutes to a week | The contest is individual (5 days, 100 random mayors, six leagues, timed assignments, cancel with a cooldown); clubs fight each other in "Club Wars", a player-against-player mode | (not described on the page) | VERIFIED [E1] |
| **Eatventure** (Lessmore), idle restaurant tycoon | Clubs exist: the wiki lists a "Club Box" earned by "Leveling up Clubs" | Seasons of two weeks (REPORTED, earlier research); recruiting posts set their own minimum per season | Not found | Existence REPORTED [W6]; rules not found in any primary source |

**Clubs in idle tycoons.** Of the idle tycoons checked, only Eatventure has clubs, and I could not read its rules from the publisher. Idle Miner Tycoon's wiki shows no group feature (search of its wiki, nothing found). INFERENCE: a weekly company goal is uncommon in idle tycoons and common in farm, town and puzzle games: a point of difference for us, and no idle-tycoon model to copy.

---

## 5. What keeps players in groups, and how groups fail

### 5.1 What publishers and analysts say keeps players

- **A shared weekly goal turns a chat room into a reason to return.** Hay Day's team: before the race, groups were for talk and trade; the race "changed the game completely" (REPORTED [P1], [P2], 2022). A social feature "has its own loop" and keeps players longer than a content update (Demirdjian [P2]).
- **Groups help players find people like them.** Guilds help players find communities "with similar playing styles, interests, and levels of engagement" (GameRefinery, PocketGamer.biz, 7 November 2019 [A1]).
- **Casual games add them in steps.** First chat and simple ask-and-give, a few months later shared goals and team contests (GameRefinery, 30 July 2019 [A2]; [A1]).
- **Three hooks: something to grow, a reason to return each day, and obligation to the group.** Naavik (Becky Matthew, 8 September 2022 [A3]): groups work through progression (a group level), return triggers (daily giving limits, events) and social obligation; "Social pressures increase spending behavior and engagement". INFERENCE: this last mechanism is also the source of the pressure complaints; we should use the first two hard and the third gently.
- **Contributor rewards, not membership rewards.** Every one of the systems read rewards only members who did something (Hay Day, Township, Gardenscapes, Royal Match: VERIFIED above).

### 5.2 How groups fail

| Failure | Evidence | What publishers did |
|---|---|---|
| **Dead groups** (leader gone, nobody active) | Hay Day reassigns only after 30 days, and never if there is no co-leader or elder [S2]; players in other games ask for dead guilds to be pruned (REPORTED, player forums [R2]) | Automatic succession (14, 30, 60 days by game); activity defined as playing, not opening the app [G1]; removal after 180 days idle [G2]; activity levels shown on teams [T1] |
| **Big groups win, small groups lose** | — | Matching by number of taking-part members [S12], [T3]; minimum size to enter (Royal Match: 10) [D2] |
| **Task hoarding and board cycling** | Officers discarding tasks to fish for easy ones (INFERENCE from the penalty) | A deduction per discarded task on the top table [S11]; Township removed reserving [T2] |
| **Pressure and kick disputes** | Kicked after doing the work, before prizes; chats full of call-outs; group-set point minimums (REPORTED [R1]) | A calm no-relegation week (Hay Day [S10]); points of kicked members still count [S9]; Township no longer lets leaders bar members from the race [T2] |
| **Hopping between groups** for prizes | — | Frozen roster at the start [S9], [S12]; waits that grow with each leave or kick [T1], [E1]; no re-entry into the current event [D2] |
| **Chat moderation** | Supercell runs a filter on every line and name and still asks players to report [S6]; muting [S7]; Township removed private messages and mail [T4] | Family-friendly groups with stricter filters [S5]; under-16s only in those [S5]. Our own policy research already rules out free chat (yard-policy.md, "No free chat") |
| **Cheaters in the group contest** | Township: a detected cheater stays in the team but cannot race; their points may be deducted; the team is removed from the top tables [T5] | (our server checks in 7.5 do the same job) |
| **A leaderboard changed in a hurry** | "made it even worse than before" (Hay Day [P2]) | Change contest rules slowly, tested (Demirdjian's lesson) |

---

## 6. For the designers

The context: each player runs their own scrapyard; a company is a group of up to 30; the group shares a weekly order (specification 7.2, D6). The owner now allows currency packs (ruling 13). What follows is the research's advice; the designers and the lead decide.

### 6.1 Eight mechanics worth having, in our own form

**1. A company office in every member's yard.** *What:* joining puts a small company office (or a flag on the weighbridge cabin) in the member's yard, carrying the emblem and the week's order board; visitors on a tour can tap it to see the company and ask to join. *Why:* the model's group lives on the farm itself; the group is seen every session, not hidden in a menu. *Trap:* it must not take yard space the player needs, or become a second screen of chores. *Common or signature:* a group building on the home base is common (Hay Day, Township, SimCity BuildIt all do it); the house shape, its mouse and its names are Hay Day's. Use our own building and words.

**2. Finding a company that suits you.** *What:* a suggested list that shows each company's emblem, kind, members, a plain activity level (quiet, steady, busy) computed by the server from accepted rules actions, and a mark where the average rung matches yours; dormant companies are left out of suggestions. *Why:* the stated value of groups is finding people "with similar playing styles" [A1]; a newcomer who joins a dead group leaves. *Trap:* no typed search terms or tags (our names are composed from lists), and no activity shown for individuals to strangers. *Common:* yes (Township's activity level, Hay Day's matching icons).

**3. A weekly order with a frozen roster and fair matching.** *What:* before the week opens, each member says "in" or "out" (default: in if they played last week); the roster is fixed at the start; the order's size and its lines scale per member who is in, and each company's league table holds companies with about the same number of members in. A member who joins mid-week joins next week's order. *Why:* this is what lets a company of six compete fairly with a company of thirty, and stops hopping. *Trap:* the specification's current sizing ("25 h × Σ R of members with 7 days of accepted play") already scales by capacity; it should scale by those who said "in", not by all members, or idle members make the order unreachable for the rest. Our tiers (50, 80, 100, 125 %) already work like checkpoints. *Common:* the frozen roster and size-matched groups are common (Hay Day, Township, Royal Match). Keep our numbers.

**4. Claimed lines with a timer and a weekly allowance.** *What:* a member claims one line at a time (our "I can cover copper."); a claim carries a deadline (for example, the lot must arrive within a day) and lapses back to the board if missed; each member has a weekly number of claims. Officers may set aside an unclaimed line, at a cost to the company's standing (not to the member's), and a new one appears later. *Why:* stops one member sitting on the good lines, and stops officers cycling the board. *Trap:* a lapsed claim must cost nothing but the time (no fines: we are a cosy business game), and the allowance must never be extendable with currency. *Common or signature:* a task board with take-one, a timer and a discard is common to Hay Day, Township and SimCity BuildIt; Hay Day's horse, track, horseshoes and themed weeks are signatures. Our lines are by grade of metal and filled by real lots.

**5. Leagues with promotion and relegation, and a regular calm week.** *What:* five to seven tiers named in our world (for example by licence class); top three up, bottom three down; a company that took no part, or reached no tier, goes down; once a month a "maintenance week" with no relegation and smaller lines. *Why:* leagues give a company something to climb for months; the calm week answers the pressure complaints. *Trap:* relegation must never be caused by members who said "out"; a league must never be bought; a "calm week" must not copy the publisher's themed variant names or rules. *Common or signature:* top-three-up, bottom-three-down is common (Hay Day, Township, SimCity BuildIt). A named no-relegation week is close to one publisher's variant: keep ours plainly different (monthly, tied to a yard-wide maintenance theme).

**6. Help requests between members, paid at the board price.** *What:* a member posts one need at a time ("need 2 t of No.1 copper"), on a cooldown; others fill it from their bays in small lots; the requester pays the posted board price of the hour, as a normal sale, settled by the server; each member has a daily give cap; filling earns the helper standing, not money beyond the sale. *Why:* the most common group mechanic of all (every game in section 4) and the daily reason to open the company. *Trap:* this must not become a transfer channel: no player-set price, no gifts of currency, no picking a recipient outside the company, and no amount bigger than a day's normal sale. *Common:* yes.

**7. A weekly line of recognition.** *What:* each Monday, the company page shows plain positive counts per member for the past week (lines covered, tonnes sent, requests filled) and a few earned marks in our own words (for example "Steady supplier", "First to cover"). *Why:* it shows who carried the week without a leader having to say it, and it answers "what the group sees of each member". *Trap:* never rank the bottom, never show "did nothing", never name members who said "out"; the earlier complaints of call-outs came from public shaming. *Common or signature:* weekly per-member counts are common (Township's help counters, Royal Match's contributor tab); Hay Day's title names are its own: do not reuse them.

**8. Roles, succession, leaving and removal that keep rewards fair.** *What:* leader, up to three co-leaders, members (our specification 7.2); leadership passes after 14 days without a rules action (already decided); a removed member waits before rejoining that company, with the wait growing for repeated removals; a member removed during the week **keeps** their own contributor reward for what they delivered; leaving and rejoining any company has a growing short wait. *Why:* the commonest kick dispute is losing earned prizes; the waits stop hopping. *Trap:* officers must not be able to opt others out against their will (Township removed that); removal must not be a weapon in the last hour of the week. *Common:* roles and succession are common; keeping the removed member's earned reward is an improvement on the model, not a copy.

### 6.2 What not to take

- **Free chat.** Our policy research rules it out (yard-policy.md); fixed phrases and emotes stay. The model's chat needs a filter on every line, reports, mutes and moderators [S6], [S7].
- **A stand with player-set prices between named players**, or any send-to-a-player at a chosen price. It is the reseller channel [X1]. If the owner's yard sales include other players, sales go to simulated buyers or at the posted board price with a band and caps, resolved by the server.
- **Buying progress in the group contest.** The model sells an extra task for premium currency and lets players pay to reshuffle prizes [S10]. With currency packs now on sale (ruling 13), currency must never buy a claim, an allowance, a deadline, points, a tier or a reroll. The specification already says purchases and ads never touch ranked fields (7.5): hold to it.
- **Random prize picks or rerolls.** Choosing among shown prizes is fine; a paid reshuffle reads like a loot box (our rating table forbids random paid items).
- **Tasks sized by the strongest member.** Hay Day builds tasks from the highest level among members [S10]; INFERENCE: newcomers get lines they cannot fill. Size each line to what at least several "in" members can supply.
- **Losing earned prizes on removal**, and placement-only prizes (top three only). Reward every contributor by the tier reached.
- **Raids or wars on other players' yards** (SimCity BuildIt's Club Wars [E1]). Our game is a legal, cosy business: nothing harms another player.
- **Anything signed by one publisher:** the horse race, track, horseshoes, the themed weeks (bunny, bingo, calm, power), the newspaper and its name, the errand boy, the request birdhouse, the neighbourhood house, the generosity titles, their league names and colours, their task tables and checkpoint tables, and their numbers (5 to 9 tasks, 15 groups, 8-hour requests, 40 donations, 3.6 times price). Use what is common to the genre, in our words and our numbers.

### 6.3 Questions for the lead

1. Should the order be sized by members who said "in" rather than by all members with seven days of play (6.1, item 3)? The research says yes.
2. Should help requests (item 6) enter stage 5, since every comparable game has them and they are the daily reason to visit the company?
3. Should a removed member keep their week's contributor reward (item 8)? The research says yes.
4. Should "yard sales", if they involve other players, be confined to simulated buyers or the board price (section 3)? The research says yes.

---

## Sources

All read on 26 November 2026 unless marked.

**Publisher (primary)**
- [S1] Supercell, Hay Day support, "How To Create/Join a Neighborhood": support.supercell.com/hay-day/en/articles/creating-joining-neighborhood.html. "Creating a Neighborhood costs 500 Coins."; "Once a Neighborhood is created, its name cannot be changed."
- [S2] Supercell, "Neighborhood Guide": .../articles/neighborhood-guide.html. "If a Leader stays inactive for 30 days, the Neighborhood's leadership will pass to the longest-serving Co-leader or Elder."; "Support takes no direct action in Neighborhoods".
- [S3] Supercell, "Neighborhood Requests": .../articles/neighborhood-requests.html. "You can request one type of item every 8 hours."; "Each player can donate up to 40 items every 24 hours".
- [S4] Supercell, "Neighborhood Nurture": .../articles/neighborhood-nurture.html (shared seasonal object; tasks swappable for diamonds or ads).
- [S5] Supercell, "Family Friendly Neighborhoods": .../articles/family-friendly-neighborhoods-2.html. "Once this age reaches 16 years, you'll be able to join Neighborhoods of any type."
- [S6] Supercell, "The Word Filter": .../articles/the-word-filter.html. "It looks at every line of chat and every name submission in our games".
- [S7] Supercell, "Why was I muted?": .../articles/why-was-i-muted.html.
- [S8] Supercell, "How to add and manage Friends": .../articles/how-to-add-and-manage-friends-2.html. "Blocks expire automatically after 30 days."
- [S9] Supercell, "About The Derby": .../articles/about-the-derby.html. "This event starts from 8 AM UTC on Tuesdays and ends at 8 AM UTC the following Monday."; kicked or leaving: points count, no prizes.
- [S10] Supercell, "Derby Tasks & Rewards": .../articles/derby-tasks-2.html. "Derby tasks are generated based on the highest Farm level among participating Neighborhood members."
- [S11] Supercell, "Derby Leagues & Matchmaking": .../articles/leagues-2.html. "every task trashed from the General Task Board reduces your Neighborhood's weekly leaderboard score."
- [S12] Same page: "matches your Neighborhood with up to 14 other Neighborhoods of a similar size in the same League".
- (also read) Supercell, "Special Derbies": .../articles/special-derbies.html (themed variants; described only in general terms here).
- [S13] Supercell, "Roadside Shop": .../articles/roadside-shop-2-2.html. "You can buy up to 80 Expansion and Upgrade Materials per day from other players' Roadside Shop."
- [S14] Supercell, "Farm Helpers": .../articles/farm-helpers.html ("Tom will always look for the cheapest price").
- [S15] Supercell, "List of unacceptable behavior": .../articles/list-of-unacceptable-behavior.html. "buying in-game items or currencies from unauthorised sources."
- [S16] Supercell, "Fair Play: a bought account is never yours": .../articles/fair-play-a-bought-account-is-never-yours.html.
- [S17] Supercell, "Farm Visitors": .../articles/farm-visitors-3.html ("Yard Sale Event": visitors buy some decorations).
- [T1] Playrix, Township help, "What changed in Teams and the Regatta?": playrix.helpshift.com/hc/en/3-township/faq/16614-what-changed-in-teams-and-the-regatta-1765959232/. "Teams are the updated version of the old Co-ops."; "A team can have up to 50 members."; "If the Leader is inactive for 60 days, leadership is automatically transferred".
- [T2] Playrix, "About the Regatta": .../faq/16605-about-the-regatta-1765929812/. "Tasks cannot be reserved."; "Players cannot be excluded from participation."
- [T3] Playrix, "How are regatta opponents selected?": .../faq/16609-how-are-regatta-opponents-selected-1765929816/. "An active player is anyone who completed at least one task."
- [T4] Playrix, "How messages work in the Regatta": .../faq/16610-how-messages-work-in-the-regatta-1765929817/. "direct messaging is not available."
- [T5] Playrix, "What happens if a cheater is found in a team?": .../faq/16604-what-happens-if-a-cheater-is-found-in-a-team-1765929811/. Also read: "Leagues in the Regatta" .../faq/16606-leagues-in-the-regatta-1765929813/.
- [G1] Playrix, Gardenscapes help, "Teams updates and new features": playrix.helpshift.com/hc/en/5-gardenscapes/faq/16555-teams-updates-and-new-features-1765357057/. "Simply entering the game is still counted as inactivity."
- [G2] Playrix, "Roles of team members": .../faq/3049-roles-of-team-members/. "Players are removed from their teams automatically if they are inactive in the game for more than 180 days".
- [D1] Dream Games, Royal Match help, "What are teams?": dreamgames.helpshift.com/hc/en/3-royal-match/faq/52-what-are-teams/. "A team can have up to 50 members."
- [D2] Dream Games, "Team Battle": .../faq/109-team-battle/. "Your team needs to have at least 10 members to participate."
- [D3] Dream Games, "Team Management and Membership": .../faq/494-team-management-and-membership/. "Once removed, a player cannot rejoin the same team."
- [E1] EA, SimCity BuildIt help, "How does the Mayor's Club work?": help.ea.com/en/articles/simcity/simcity-buildit/mayors-club/ (read through a page download; WebFetch returned 503). "The Club might be full (25 members)". Page says "Updated 7 months ago".

**Fan wikis (secondary, well kept, not the publisher)**
- [W1] Hay Day Fandom wiki, "Neighborhood": hayday.fandom.com/wiki/Neighborhood. "A neighborhood is a group of 1 to 30 players."
- [W2] Hay Day Fandom wiki, "Neighborhood Management": hayday.fandom.com/wiki/Neighborhood_Management (emblem parts, three kinds, 24-hour rejoin wait, three reports → 24-hour chat bar).
- [W3] Hay Day Fandom wiki, "Derby": hayday.fandom.com/wiki/Derby (fewer than 4 taking part: some checkpoints out of reach; automatic opt-out of inactive players).
- [W4] Hay Day Fandom wiki, "Roadside Shop": hayday.fandom.com/wiki/Roadside_Shop (price from 1 coin to 3.6 × default; October 2019 daily limit; swap conventions; partly out of date on returns).
- [W5] Hay Day Fandom wiki, "Daily Dirt": hayday.fandom.com/wiki/Daily_Dirt.
- [W6] Eatventure Fandom wiki, "Equipment Boxes": eatventure-games.fandom.com/wiki/Equipment_Boxes ("Club Box"; "Leveling up Clubs").

**Press and analysts (secondary)**
- [P1] PocketGamer.biz, "Supercell: looking back on 10 years of Hay Day, part one", 21 June 2022: pocketgamer.biz/supercell-looking-back-10-years-of-hay-day-part-one/. "The absolute priority – our one metric – is retention."
- [P2] mobilegamer.biz, "What Supercell's Hay Day team learned from ten years of updates", 21 June 2022: mobilegamer.biz/what-supercells-hay-day-team-learned-from-ten-years-of-updates/. "It's a big risk adding competition to a nice, casual farming game."
- [P3] IBTimes India, "Hay Day update introduces Derby leagues" (undated; its linked threads date it to September 2015): ibtimes.co.in/hay-day-update-introduces-derby-leagues-optional-update-now-available-adds-new-fixes-647062.
- (also read, nothing on groups) PocketGamer.biz, "Supercell reveals rise in Hay Day active users", 20 January 2025; Supercell news, "Nothing bad happens in Hay Day", 18 June 2026.
- [A1] W. Voutilainen (GameRefinery), "Why casual games like Homescapes are adding midcore guild community features", PocketGamer.biz, 7 November 2019 (sponsored guest post).
- [A2] W. Voutilainen, "Casual Games are 'Guilding Up'", GameRefinery, 30 July 2019: gamerefinery.com/casual-games-guilding-up/.
- [A3] B. Matthew, "Get Social: Building Effective Clan Features", Naavik, 8 September 2022: naavik.co/f2p-mobile/building-clan-features/.

**Other**
- [X1] A reseller of game items (igitems.com/hayday-item/service), read only to confirm the practice: "We utilize the Roadside shop for transactions involving item packages". Not a recommendation; not linked from the game.
- [R1] Reddit r/HayDay threads (June 2024, January 2025) and a complaints site: search extract only (Reddit blocked automated reading).
- [R2] Gems of War community forum threads on pruning dead guilds: search extract only.

**Could not load:** the Clash Royale help page on leader rotation (HTTP 403); EA's news post introducing Mayor's Clubs (404); the GDC Europe 2013 talk slides on guild design (would not render); the Hay Day Derby launch article of March 2015 (search extract only).
