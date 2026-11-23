# Lantern Row: notes for App Review and Play review

Paste the text between the lines into App Store Connect, App Review Information, "Notes", and into the
Play Console's "App access" instructions. Add the contact name, email and phone there by hand (no file
in this repository holds them). Written from spec sections 1.2, 3.1, 5.5, 5.7 and 7.4 and decisions M3,
M13, M14, M18, M36, M37, M46 and M48, against the tuned games/night-market/game.json; the tap path and
the figures must be checked on the build being submitted (list at the end), and this file corrected if
they moved.

---

Lantern Row comes from the same small team, and the same in-house code base, as our two earlier apps: Pizza Empire (tap the stations of a restaurant seen from the side; each guest pays for a dish) and Orbit Haulers (drag drones onto asteroids on a map; a freighter launch sells the hold). What a player does here is different in each of these ways:

1. It is a merge game. The whole play surface is a fixed board of 7 by 8 squares under a strip of street stalls; there is no map, no camera and no side view. You drag one snack onto an identical snack and the two become one snack of the next step, eight steps per stall. Nothing merges by itself, and nothing can be bought that merges for you.
2. Coins from play come only from complete order tickets. A customer at a counter holds a paper ticket of one to three lines; you drag the exact snack onto each line. A single snack, a merge or a discovery pays nothing, and a customer pays nothing on arrival: the price printed on the ticket is paid when its last line lands, and that last line is always placed by the player. There is no route, vehicle, depot or sale of a cargo: every snack on a ticket came onto the board from a stall's gear, a gift box or a merge, and is placed on its line by the player's drag; the one exception is the Fill one line ad, which can fill any line but never a ticket's last.
3. Seasons are not chosen and spend no currency. When the season's Festival ticket is filled, the player may close the season. The Festival pays no coins: it gives three Lucky Sparks (a Spark lifts one merge a step higher), the season's street piece and the right to close the season. Closing first opens any gift boxes still waiting; their coins go with the purse, which starts again. Later seasons, in a fixed order, change the board's shape or one rule of the place (the second season keeps the first one's rectangle and adds a stall and fireflies; the third has a moon gate in the board). There is no reset currency, no upgrade tree, no list of run conditions and no income multiplier.
4. There are two sources of coins, and we say plainly how they compare. Minders, one per stall, put a stall's house snack price into its till every 15 seconds, also while the app is closed (up to 4 hours); a player who looks in a few times a day gets most of their coins from the till, as in any idle game. Everything else is by hand: only the player merges, fills tickets, lights lanterns and closes seasons. The minders and the stalls dropping basic snacks onto the board are the game's only automation; minders correspond to the per-station managers of our restaurant game, which we state openly.

Tap path (under a minute): open the app. The board already holds six Pepper Skewers, and the fox at the first counter holds a ticket for a Twin Skewer. Drag one Pepper Skewer onto another: they become a Twin Skewer, and the hedgehog steps up to the second counter with a ticket for a Glazed Skewer. Drag the Twin Skewer onto the fox's ticket: the ticket is stamped, folds into a paper lantern and pays 12 coins. Merge the four skewers left into two Twin Skewers, and those into a Glazed Skewer (no waiting: the six skewers on the board are exactly what both tickets need), then drag it onto the hedgehog's ticket (29 coins). The grill drops a new skewer every 4 seconds from then on. The line under the coins names the next goal, at first "Open the Tea stall · 120": tap the line, then "Open" in the sheet, when the purse holds 120 (about a minute of play).
Ladder Book (every snack made): the "Book" button on the bottom row. Lantern Gate (feats): "Lanterns". Season scroll: "Season". Shop: "Shop". All four open from the first second.

Nothing needs a login. There is no energy, and no customer ever walks off. Every video ad is one the player starts from a button that says "Watch ad" and what it gives. The three button ads wait between uses, and that waiting time runs on play time (the button says, for example, "ready after 5 min of play"; 5 minutes for Fill one line, 15 for Gear rush, 20 for Call the dragon); the away bonus is offered once on each report of time away:
- Fill one line: fills the cheapest open line of a ticket with two or more lines still open, never its last.
- Gear rush: each open stall drops up to 6 basic snacks into free squares now.
- Call the dragon: the paper dragon comes to the next free counter with its gold ticket (at once when a counter is empty, otherwise when the next customer leaves).
- On the report shown after time away: half as much again.
The game shows no banner and no ad between screens.

Gift boxes (a paper bag of three slots, four after lantern 14) are earned by filling tickets; none are for sale. The bag shows its odds and its coins before it opens, and what is inside was fixed when it was earned.

Three things are for sale, none of them random, each a one-time purchase: Blue Silk Awnings, which changes only how the stalls look; Late Hours, which lets minders work 4 more hours while the app is closed; and Quiet Evening, which gives every "Watch ad" reward at once without playing the video. Our two earlier apps also sell a way to take ad rewards without the video, as most free games do; we say so here rather than leave it for you to find. Purchases can be restored from the Shop and from Settings.

Notifications: the first time the player collects coins after time away, the game asks for permission to send notifications. They are reminders scheduled on the device itself (when the minders have sold for as long as they can, and once three days after the player left); the app registers for no remote push and has no push entitlement, and a reminder is never an offer. The switch is "Reminders" in Settings (the menu button of the top bar).

Game Center: two leaderboards, "Tickets filled" and "Gold tickets". "Leaderboard" in Settings opens them. The game signs in to Game Center quietly at launch and shows Game Center's sign-in screen only when the player taps that button.
---

## Before pasting, check on the submitted build

- [ ] The tap path plays as written: six Pepper Skewers on the opening board, the fox's ticket asks for a Twin Skewer and pays 12, the hedgehog's for a Glazed Skewer and pays 29, the first coins come within about 15 s (spec 8.3 gate 1, decisions M18 and M42). If the tuned values moved a price, correct the figure above.
- [ ] The first goal on the line is the Tea stall and its price is 120 (game.json `merge.costs.stallOpen[0]`, decision M23: a tuned value).
- [ ] "every 15 seconds", "up to 4 hours", "every 4 seconds", "eight steps", "up to 6 basic snacks", "4 more hours", "three Lucky Sparks" match game.json (`merge.minders` Q, `merge.away.capHours`, `merge.gear.interval`, the tier count, `merge.ads.gearRushGoods`, `merge.away.lateHoursHours`, `merge.festivalSparks`; scripts/content/night-store.json `_numbers`).
- [ ] The bottom-row button names ("Book", "Lanterns", "Season", "Shop") and the ad buttons' words match `src/ui/merge/strings.ts`.
- [ ] The gift bag's slots (three, four after lantern 14) match game.json `merge.gift.slots` and the lantern whose effect is `giftSlots`.
- [ ] The ad waiting times (5, 15 and 20 minutes of play) match game.json `merge.ads` (`fillLineCooldown` 300, `gearRushCooldown` 900, `callDragonCooldown` 1200).
- [ ] The ad and purchase sentences match what the build does (game.json `monetization`: three products, `interstitials` false, `showBanner` false; spec 5.7 and decisions M13, M14, M46).
- [ ] The second season is still a rectangle and the third a moon gate (game.json `merge.seasons.table`); if the season table moved, correct point 3.
- [ ] The notification prompt appears after the first away report is collected, not at launch, and "Reminders" in Settings switches them (`src/ui/merge/strings.ts` `remind`, `sheets.reminders`).
- [ ] The two leaderboards exist in App Store Connect under the ids of game.json `leaderboards` (lanternrow.tickets, lanternrow.goldtickets), are attached to the version, and "Leaderboard" in Settings opens them.
- [ ] Nothing in the build, the screenshots or this text names the other games except the first paragraph.
