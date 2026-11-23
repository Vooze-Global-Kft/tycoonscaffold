# Name search (spec 7.1, decision M11)

Done 2026-11-23 by the store package with generic web searches (no studio, project, repository or
owner name in any query or URL). This was a web search, not a search inside the stores: web search
does not see every listing, and Play listings show up far less than App Store ones. Repeat it in App
Store Connect and the Play Console search the day before the first submission.

What this search could not see: no icon and no screenshot of any game below. The page reader returns
text only, so every "icon and screenshots" cell is what the listing's words say, not what its images
show. Spec 7.4 already asks a person to compare our icon and screenshots with the top merge and market
titles, Animal Night Market and Merge Feast by name; that check is still open.

## Queries, verbatim

Web searches, in the order sent:

1. `"Lantern Row" game app`
2. `lantern row merge game`
3. `Animal Night Market game app store`
4. `Merge Feast game google play`
5. `"Market Merge" game app`
6. `"Merge Market: Food Town"`
7. `merge snacks orders game street food stall`
8. `Merge Feast owl food bazaar merge game Leyshine`
9. `night market merge game mobile`
10. `"Paper Lantern Row"`
11. `"Lantern Row" google play`
12. `"Lantern Row Snacks"`
13. `lantern merge puzzle game app store animals snacks`
14. `merge game street food night market lanterns customers orders android`
15. `merge snacks orders`
16. `"Old Brindle" badger character game`

Revision 2, same day, after the store review (which ran its own generic queries, listed in
notes/listing-review.md, and found three neighbours this search had missed or softened). Sent by
this package to confirm them:

17. `Lamplighter Merge & Magic Lantern Town merge game`
18. `Zoo restaurant merge game animal customers App Store`
19. `"Lantern Row" mobile game`

Store pages read (text only):

- `https://apps.apple.com/us/app/id6757350629` (Animal Night Market): read.
- `https://apps.apple.com/us/app/merge-feast/id1665022240`, the same with `/gb/` and with `?uo=4`: all three returned 404 to the page reader, so Merge Feast is described from the search engine's summary of its listing, not from the page itself.
- `https://apps.apple.com/ml/app/market-merge/id6476511539` (Market Merge): 404; described from the search summary.
- `https://apps.apple.com/us/app/-/id6479881627` (Merge Night Live): 404; not described at all.
- `https://playgama.com/game/lantern-hollow-merge`: read.
- `https://playgama.com/game/lantern-alley-match-3`: read.
- `https://apps.apple.com/app/id6802679031` (Lanternlight: One Night): read.
- Revision 2: `https://playgama.com/game/snackrab`, `https://apps.apple.com/app/id6504385381` (Zoo
  restaurant) and `https://www.crazygames.com/game/lamplighter-merge-magic`: all three read.

Queries that returned nothing useful, recorded as such: 10 (`"Paper Lantern Row"`: only paper lantern
shops), 12 (`"Lantern Row Snacks"`: only recipe sites) and 15 (`merge snacks orders`: only e-commerce
help pages on merging orders). Query 11 found no Play listing of that name; it returned Lanterns: The
Harvest Festival and developer pages. Query 19 again found no game called "Lantern Row" (only
Lanterns: The Harvest Festival, Lanternlight: One Night and the Steam game Lantern Hollow).

## Verdicts

| Name | Where it is used | Found | Verdict |
|---|---|---|---|
| Lantern Row | store title, home-screen name | **no app or game of that name** in queries 1, 2 and 11. Nearest names: "Lanternlight: One Night" (Sankofa Digital, App Store, an adventure: carry one lantern through a sleeping town; subtitle "One lantern. Choices matter."), "Lanterns: The Harvest Festival" (Dire Wolf Digital, App Store and Play, a paid digital board game of tile placement), "Lantern Hollow Merge" and "Lantern Alley: Match 3" (rows below), "Lanternium" (an iOS puzzle with a raccoon), "Lantern Hollow" (Steam, a building game) | **keep "Lantern Row"**. Every near name shares only the word "lantern" (a common noun in many titles), and none is "Lantern Row" or a merge game about a street of stalls except Lantern Hollow Merge, below |
| Lantern Hollow Merge (found by query 2) | not ours: Jovany Nady, Playgama browser portal (listed for PC, Android, iOS), October 2026, updated November 2026 | the nearest title to ours in name and genre: "Lantern" first, a merge game, "cozy" in its category list, and it says "no energy system or waiting timer". Its play: tap generators, merge two into one, residents request items for stars that restore six locations of a darkened valley, lanterns upgraded to reveal the board, an Item Book, jigsaw puzzles, chests, a heroine Nell. No food, no street, no stalls, no tickets, no animals | **keep the title; the listings do share two genre phrases**: our title's second word differs ("Row", not "Hollow"), and it has no food, street, stalls, tickets or animals. Corrected in revision 2: the first version said our listing uses none of its phrases. That was wrong: our "No energy." matches its "no energy system", and our keyword "cozy" is in its category list. Both are common genre words and stay (spec 7.4 dictates "No energy."), but a reviewer setting the two pages side by side sees them. It never says "restore", "valley", "Item Book" or "no waiting timer" in our text. It sits on a web portal, not as a store listing we could find; watch for a store release before the first submission. Icon: in a "lantern merge" search it, Lamplighter (below) and we would sit together, so our icon leads with the ticket and the skewers, never a lone lantern on a dark ground (SCREENSHOTS.md) |
| Lantern Alley: Match 3 (query 2) | not ours: SoftGames, Playgama browser portal, September 2026 | a match-3 (swap tiles, 160 levels), anime heroines, lanterns lit along a map path; no food or market | **clear**: other genre, other second word |
| Animal Night Market (spec 7.1; query 3) | not ours: Memuu (seller CESTER CITY LIMITED), App Store (iPhone) and Google Play, Simulation; versions 1.0.0 (27 Jan) to 1.0.5 (14 Aug), page dated 2026 | a night-market **management sim** with animals: run stalls, develop dishes, decorate shops, arcade mini-games for start-up money; tagline "Build a 5-star night market!". The listing describes no merge. Sells resource packs, an ad-free pass, diamonds, a monthly pass | **clear on the name; keep a distance on the theme words**. Our title has no "Night Market" and no "Animal" (spec 7.1), and the subtitle, short description and keywords hold neither. It shares the setting (animals at a night food market): the icon must not show an animal at a stall front at night as its subject (ours is a ticket lantern over two skewers, 7.4) and the first two screenshots lead with the board, not a street scene. A person still compares the images (not seen here) |
| Merge Feast (spec 7.1; queries 4, 8, 9, 14) | not ours: Beijing Leyshine Technology, App Store (designed for iPad; version 1.2.0.1 the latest seen); no Play listing found | **the nearest game to ours in theme**: an owl-run night food bazaar ("Owl Food Bazaar"), merge items to unwrap food, feed a "Mysterious Boss" for stars, nine bazaar areas, stalls to unlock, move and decorate, fishing goldfish and ring toss | **clear on the name, keep a distance on owls and on "feast" and "bazaar"**. The name shares no word with ours. Owls are its hosts: spec 7.2 already keeps owls out of our icon and first two screenshots, and our listing names a fox, a hedgehog, a badger and an otter, not an owl. Our listing never says "feast" or "bazaar". One in-game item name of ours, "Noodle Feast" (Noodles tier 6, spec 2.2), uses the word; it is not in the listing, and the word is common, so it stays unless the lead wants a margin. Its money moment (feed one boss for stars) differs from ours (each customer's ticket pays coins when complete) |
| Merge Feast: Tasty Oz (query 4) | not ours: MergeLab, Google Play (updated 27 Mar 2026) and an App Store pre-order (15 May 2026) | an Oz-themed cooking merge: combine ingredients, rebuild kitchens, "no timers" | **clear**: no word of our title, another world |
| Market Merge (spec 7.1; query 5) | not ours: Backpack Games, App Store (designed for iPad), free | a level-based shelf puzzle: drag items together on a shelf to grow them, make the right size to fill orders in a basket; "100s of levels" | **clear**: no word of our title; it is a level puzzle, not a board with stalls and customers. Our keywords "market" and "merge" are its two words: they are plain genre words and stay, never written together as "market merge" in our text. Our Basket is a sell spot, not an order basket |
| Merge Market: Food Town (spec 7.1; query 6) | not ours: Gamejam Co., App Store (designed for iPad), 4.8 from 124 ratings | tap food generators, merge two into one, deliver food to orders or use it as restaurant decoration; a story of cooks against large companies | **clear**: no word of our title, an "X: Y" title we do not have; its loop (generator, merge, deliver to orders) is the merge genre's loop, which our subtitle names in its own words ("Merge snacks, fill each order"); none of its words ("food town", "generators", "decorate your restaurant") are in our listing |
| Snackrab: Cosy Beach Merge Game (query 7; page read in revision 2) | not ours: RAW Studio's, Playgama browser portal (listed for PC, Android, iOS) | a beach snack-stall merge: tap a machine for a snack, merge two identical snacks into the next treat; "Animal guests arrive holding up a picture of what they want", and you drag that snack onto the guest for coins; a patience ring, and "the guest walks away" when it runs out; coins buy beach additions (awning, bell, pier, lighthouse); a crab takes unwanted snacks | **clear on the name; it shares our core loop and our first image**. Corrected in revision 2: the first version called it simply "clear", which softened it. Its loop (merge snacks, an animal holds up its order, drag the snack onto it) is ours, and so is the subject of our first screenshot. What it lacks, and what shot 1 now leads with (SCREENSHOTS.md): a paper ticket with one to three lines and a printed price, paid only when complete; the board's gear rail; a fixed 7 by 8 board under a street of stalls. Ours has no patience ring and nobody leaves. Our text never says "cosy", "beach", "guest" or "treat". Added to the image comparison of spec 7.4 |
| Lamplighter: Merge & Magic (found by the store review; query 17; page read) | not ours: Eidolon, CrazyGames (January 2026, updated June 2026); Playgama lists Eidolon LLC and PC, Android, iOS | a merge game set in "Lantern Town", swallowed by darkness; you are the Lamplighter and relight an ancient beacon: open chests, collect magical items, merge them to restore the town and help its townsfolk; "a cozy atmosphere". No food, orders, customers or stalls on its page | **clear on the title, and a purchase renamed**: our title shares only "Lantern" with its setting, not its name. But our cosmetic product was called "Lamplighter's Street": a "Lamplighter" item on a lantern-street merge game leans on this game. Revision 2 renames it "Blue Silk Awnings" (night-store.json; the id `night_lamplighter` stays, players never see it, and the lead may rename it). Added to the image comparison; the icon point of the Lantern Hollow Merge row applies |
| Zoo restaurant (found by the store review; query 18; page read) | not ours: seller NADDIC GAMES Co Ltd (copyright line "© 2024 MAF Games"), App Store, designed for iPad | Mr. Bear runs a restaurant for forest animals; "merging food to make perfect food", served to "cute and lovely animals waiting for your order"; customers must be served "within a limited time" and leave without paying; food can burn; gems, passes, remove ads | **clear on the name**: no word of our title. It shares the theme of merged food for animal customers who order. Ours has no time limit, no cooking or burning, no restaurant room and no premium currency. Added to the image comparison of spec 7.4 |
| Merge Night Live (query 9) | not ours: App Store id 6479881627 | the page returned 404 and the search gave no description | **unchecked**: the name shares no word with ours; look at it in the App Store search before submission |
| Other food merge titles seen in passing (queries 6, 7, 13, 14): Merge Supermarket, Merge Fever Town, Merge Cafe, Merge Bistro: Yummy Fusion, Food Chronicles, Merge Inn, Cook & Merge, Food Truck Merge, Merge Teahouse, Mergeland of Animal Adventure, Anipang Merge, Merge Camp | not ours | merge or cooking games with orders; none at a night market with lanterns, none named with "Lantern" or "Row" | **clear**: genre neighbours; our title and subtitle share no name with them |
| Paper Lantern Row (spec alternative; query 10) | alternative title, not used | nothing: no game, app or product of that name, only lantern shops | **clear**, not needed: "Lantern Row" stands |
| Lantern Row Snacks (spec alternative; query 12) | alternative title, not used | nothing: only recipe sites | **clear**, not needed |

"Lantern Row" does not conflict with any live game found, so no new titles were proposed (M11).

The image comparison of spec 7.4 (a person, before release; fingerprint dimension 7) now covers:
Animal Night Market, Merge Feast, Snackrab, Zoo restaurant, Lantern Hollow Merge and Lamplighter:
Merge & Magic, plus the top merge titles of the day.

## Addendum, 23 November 2026: two live listings named "Lantern Row" (found by the ASO pass)

A search of the stores themselves on 23 November 2026 (the App Store's search interface and the two
store pages, read that day) found what the web search above could not:

| Name | Where | What the page shows | Verdict |
|---|---|---|---|
| Lantern Row: Idle Tycoon | App Store (US), id 6829851378, bundle `com.driftstudios.lanternrow`, seller Kyle Winston Bullock ("© 2026 Drift Studios"), category Simulation, released 22 November 2026 | subtitle "Cozy & Fun Town Building Sim": a cozy idle town-builder where you grow a night market on a floating island that keeps earning while you are away | **the same name, the same setting (a night market), and "cozy" and "idle" in its words.** Not a merge game. It went live the day before this search |
| Lantern Row Night Market Merge | Google Play, package `com.appcellence.lanternrow` (the page title was read; the research pass that found it reported the publisher as App-cellence, updated 17 October 2026, short description "Merge puzzle: match night-market goods, fill stall orders, and light the street.", a 5 by 5 board with energy; those details were not read a second time) | a merge game about night-market goods and stall orders | **the same name, the same genre and the same setting**, on the store where the earlier web search sees least |

M11 says the title "Lantern Row" stands *unless the store search finds a live game it would be confused
with*. Both of these are that. Neither is ours (our ids are still placeholders). **The name is the
owner's decision before any submission**: keep it and expect a player, and a reviewer under Apple 4.1(c)
or Google's impersonation policy, to set the pages side by side; or rename (the store title, the name
under the icon, the slug, the promotional text and description, REVIEW-NOTES.md, the leaderboard ids
and every screenshot that shows the name). Nothing was renamed by the pass that found this.

Also found that day, for Pizza Empire (which has no name-search file): Google Play lists "Pizza Empire:
Restaurant" (Curzio Games), almost our earlier store title "Pizza Empire: Restaurant Sim"; the store
title's descriptor was changed to "Pizza Empire: Idle Cooking Sim" (scripts/content/build-pizza.py).
"Pizza Empire" itself is used by several publishers on both stores.

## Minder and character names

One query only (16, `"Old Brindle" badger character game`): no character of that name in any game,
book or show found; the nearest fictional badgers are Mr. Badger (The Wind in the Willows) and Old
Brock (Watership Down). **Keep Old Brindle.** The other minders (Pim, Nettle, Juniper, Tansy, Marlo)
and the Paper Dragon are common words and given names and were not searched; a search of them as game
characters, as Orbit's file did for TALLY, is still to do before the first submission.

Not trademark clearance: before the first submission someone should also search the USPTO and EUIPO
registers for "Lantern Row" in class 9 and 41 (games), which this search cannot do.
