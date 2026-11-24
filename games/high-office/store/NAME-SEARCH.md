# Name search (spec 7.1, 7.9; decision D1)

**Revision, 24 November 2026 (screens lead, bringing the store files in step with the build).** Decision
D14 acted on two findings below: Councillor Prudence Plumb is now Councillor Prudence Stitchley and the
first presidential rival is now Professor Ozias Kalends (the register `scripts/content/office/names.json`
holds the checked names); "Grand Goose" is the Order of the Folded Napkin (D29); the goose left the icon
and the emblem (D12: the emblem is a pair of ribbon scissors over a folded napkin). The searches below are
kept as they were run, with the old names.


Done 2026-11-23 by the listing step with generic web searches (no studio, project, repository or owner
name in any query or URL). This was a web search plus two Google Play search pages, not a search inside
App Store Connect or the Play Console: web search does not see every listing, and Play listings show up
far less than App Store ones. Repeat it in both consoles the day before the first submission.

What this search could not see: no icon and no screenshot of any game below. The page reader returns
text only, so every "icon and screenshots" note is what the listing's words say, not what its images
show (one exception: a store-data site described one game's screenshots in words, marked below). Spec
7.9 asks a person to put our icon and first screenshots beside the nearest games' in `SIDE-BY-SIDE.png`;
that check is still open, and this file lists which games it must include.

## Queries, verbatim

Web searches, in the order sent:

1. `"Proudly Adequate" game app`
2. `"Proudly Adequate"`
3. `"Flick of the Pen" game`
4. `"Signed, Not Read" game`
5. `"Proudly South African" slogan campaign`
6. `pen flick game app store sign papers`
7. `"Proudly Adequate" book OR film OR show OR podcast`
8. `mayor desk approve deny papers swipe game mobile`
9. `satire politics idle game fictional country app store 2026`
10. `"No. 10: Full Confidence" iOS game`
11. `Idle Mayor Tycoon app 2026`
12. `"Republic of Middling" OR "Middlingham"`
13. `"Dithering-on-the-Dawdle" OR "Upper Wobbling"`
14. `"Rodney Spinwell" OR "Gwendolyn Abacus" OR "Prudence Plumb"`
15. `"Barnaby Waft" OR "Ignatius Crumb" character`
16. `"Councillor Plumb" OR "Professor Crumb" fictional character politician`
17. `"Prudence Plumb"`
18. `Henry Plumb Baron Plumb President European Parliament`
19. `Mr Stink Mrs Crumb political candidate character`
20. `"Hilda Gourdley" OR "Gourdley" OR "Spinwell" character`
21. `"Signed Not Read" app OR "Signed, Not Read" itch.io`
22. `"Adequate" game app store title`
23. `"Proudly Adequate" trademark`
24. `Reigns swipe king card game app 2026 Devolver`

Pages read (text only):

- `https://play.google.com/store/search?q=proudly%20adequate&c=apps`: read (first 15 results; the page was cut off after them).
- `https://play.google.com/store/search?q=funny%20mayor%20desk%20game&c=apps`: read (first 18 results).
- `https://apps.apple.com/us/app/id1626927427` (returned by query 1): read; it is "Make Me Proud!".
- `https://itch.io/post/10732914` (returned by query 4): read; a comment on an unrelated game ("Limeri").
- `https://apps.apple.com/us/app/paperworkinc/id6758695829` (PaperworkINC): read.
- `https://apps.apple.com/us/app/-/id1454365394` (Mayor's Table): read.
- `https://apps.apple.com/us/app/id6763776410` (Election Tycoon): read.
- `https://apps.apple.com/us/app/-/id1487722225` (Pocket Politics 2): read.
- `https://mwm.ai/apps/reelected/6779709189` (Reelected, a store-data site): read.
- `https://mwm.ai/apps/president-simulator-election/6785552452` (President Simulator: Election, a store-data site; its screenshots are described there in words): read.
- `https://stonesignalstudio.itch.io/banana-clicktatorship`: read.
- `https://www.gamedeveloper.com/press-release/no-10-full-confidence-satirical-ios-game-goes-viral`: the page reader returned a different press release (a VR sheep game); No. 10: Full Confidence is described from query 10's search summary (the developer's own press release and a store listing), not from its page.

Queries that returned nothing useful, recorded as such: 2 and 7 (only essays, blogs and podcasts about
"adequacy"; no work titled "Proudly Adequate"), 13 (only pages on "dither" and "wobble"), 14, 15, 17 and
20 (only genealogy pages and other characters with one of the given names), 21 (only itch.io comments
about unsigned macOS and Android builds), 22 (only articles on app-title best practice).

## The title candidates

| Name | Where it is used | Found | Verdict |
|---|---|---|---|
| **Proudly Adequate** (spec 7.9, D1) | store title, home-screen name, the motto in the game | **no app, game, book, film, show or podcast of that name** in queries 1, 2, 7, 22 and 23 and on the Play search page, and no trademark of that name came up in query 23 (a web query: the USPTO and EUIPO registers themselves were not searched, so this is not trademark clearance). Query 1's nearest store hit is "Make Me Proud!" (Tunahan Oguz, App Store, an interactive story game; no shared word). Marks that share a word: ADEQUATE SYSTEMS / ADQ (Adequate Systems LLC, class 42, blockchain technology), ADEQUATE RECORDS (a record label), ADEQUATE (serial 85678661, dead), TO PROUDLY GO (a fundraising mark): none for games, none with both words. Utilities it could be mistaken for: none found | **clear; keep a distance on the "Proudly ___" slogan pattern** (next row) |
| "Proudly South African" (the echo D1 asks about; query 5) | not ours: a South African "buy local" campaign and logo, conceived at a presidential jobs summit in 1998 and launched in 2001 through NEDLAC; about 2,000 member companies; still running (campaigns in 2023 and later) | our title has the same "Proudly ___" shape. It is a pattern many buy-local and national-pride lines use ("Proudly Canadian", "Proudly made in ..."), and ours names no country, nationality or product origin; the joke is the deflation ("adequate"), aimed at an invented republic | **keep a distance, not a conflict**: the store text never writes "Proudly" followed by a nationality or "made in"; the icon has no flag colours of any country (spec 7.9: pale paper, violet ink; the goose is to leave the icon, see "Revision" below); the spec 7.8 lint already fails real slogans, and the sensitivity editor should add "proudly south african" and "proudly made in" to its deny list so no paper or line ever completes the real slogan. This is my reading of a pattern, not a rule from either store |
| **Signed, Not Read** (spec 7.9 alternative 2; queries 4 and 21) | runner-up | no app or game of that name. Query 4's search summary describes itch.io comments on an unnamed document-signing jam game (papers with long text, a signing area, an outbox, "funny texts in documents" so players read before signing); the one comment page read was about another game ("Limeri"), so that game's name stays unknown. Hempuli's "Signs-Read" (2009, a competition entry) and "Sign: A Game About Being Understood" (Thorny Games, 2020) differ in name and kind. Utilities: the words "signed" and "read" sit close to e-signature and document apps | **clear on the name; two weaknesses**: it may be read as a document or e-signature utility in a search list (the subtitle would have to carry the game at once), and "document" is a store word the spec keeps out (7.8). It also names a genre trope (sign papers at a desk) that game jams use often |
| **Flick of the Pen** (spec 7.9 alternative 1; queries 3 and 6) | not used | no game of that name. Results are pen-flipping games: Summer Flick (itch.io prototype: flick a pen), Flipen (itch.io: pen-spinning tricks), Flippy Pen (Ogma Studio, itch.io: arcade pen flips), Pen Challenge (App Store: flick a pen into a cup), Pen Toss 3D, Pineapple Pen | **clear on the name, poor in search**: every neighbour in its results is a pen-flip toy, and the spec's own risk (a pun on "stroke of the pen") stands. Third choice |

**Recommendation: "Proudly Adequate"**, with "Signed, Not Read" as runner-up. No candidate conflicts, so
no new titles were proposed. "Proudly Adequate" is the game's own motto, shares no word with "Pizza
Empire: Restaurant Sim", "Orbit Haulers" or "Lantern Row", has no civic word and no "X: Y" shape, and
cannot be mistaken for an official, news or polling app. Its weakness is that it says nothing about the
genre: the subtitle, "Sign silly papers, run a town" (revised after the store review; first "Funny mayor-to-president desk"), has to carry that.

## The live games nearest in name or theme

| Game | Developer, what it is today | Name | Icon and first screenshots (from words only) | Verdict |
|---|---|---|---|---|
| PaperworkINC (spec 1.2's Paperwork Inc; query 8, page read) | Chensu Games Corp, App Store, Simulation, free, 9+ (infrequent crude humour; horror/fear themes); subtitle "Office Chaos". "Paperwork Inc is a tapping office management game": approve or deny applications, hire workers, buy desks, unlock floors, decide how much bribe risk to take; itch.io page: a printer issues papers to desks | no shared word | page shows no screenshot text; an office floor with desks and workers | **clear on the name; keep a distance on the theme, as spec 1.2 argues**: our listing never says office chaos, paperwork, processing, application or bribe; no printer, floors or hired workers; our desk shows one paper and the player's hand. In the image comparison |
| President Simulator: Election (query 9, page read) | More Clues LLC, App Store, first released 7 July 2026, free; "a work of satire, with all characters, parties, nations and events fictional"; you govern a fictional nation: cabinet, tax rate, budget, sign laws, crises (a hurricane, a foreign coup), speeches, branching endings | shares "President" with our keywords and description (not the title or subtitle) | described screenshots: a title scene with confetti and flags, **"an Executive Order on a desk with Sign and Veto buttons"**, candidate cards with stars, a red-and-blue US-style election map, a press conference | **clear on the name; keep a distance on the image of a paper on a desk.** It is the nearest image to ours found. Our first screenshots never show a "Sign" or "Veto" button (our paper has no buttons: it is pushed or pulled), no flags or confetti, no red-and-blue map (our poll map is violet hatching and slate, spec 4.4), no "Executive Order" wording. In the image comparison |
| No. 10: Full Confidence (query 10) | Brewis Apps (solo, UK), iOS, macOS and Android, £2.99 paid, 13+; launched 20 May 2026, reported No. 1 in UK paid charts (developer's own claim); a satirical survival game as the British Prime Minister, a "ridiculous crisis" each game month (expenses scandals, diplomatic blunders), 200+ crises; an optional £1.99 "Special Adviser" pack adds timers, impact previews and a crisis log | no shared word | not seen | **clear; keep a distance on its real setting.** It is the best-known new satirical politics game and sits in a real country: our text never says Prime Minister, No. 10, Westminster or any real office; our papers always show their outcomes for free (no paid preview), which REVIEW-NOTES can say plainly. Our skipAds product is not named after a civil-service adviser in its title ("Skip the Ad Videos") |
| Reelected (query 9, page read) | Kristaps Ozolins, iOS, first released 16 June 2026; govern a fictional nation over 24-month terms: treasury, debt, taxes, bills with passage odds, factions, military, diplomacy and war, elections; one-time unlock, no ads | no shared word ("elected" only in our description) | described screenshots: a national dashboard (treasury, GDP, unemployment, approval), bills with odds, a military screen | **clear**: a strategy dashboard with a military; nothing like a desk of papers |
| Election Tycoon (query 9, page read) | seller Burak Akbay (© Big Cloud Games), App Store, Strategy, 9+ (infrequent mature themes); pick a country and candidate, rallies, debates, TV ads, election night, then decrees; gold packs $0.99 to $9.99 and **country packs for real countries** (Japan, India, France, Brazil) | shares "tycoon" (only in our description, never title, subtitle or keywords) | not seen | **clear**: real countries and a paid rally loop; our title never uses "Election" or "Tycoon" |
| Pocket Politics 2 (research [15]; page read) | Kongregate, App Store, 13+, subtitle "Idle Money", last update on the page 11/05/2020 (v1.010; a store-data site in query 9 reported a later update, not confirmed); "Choose your Candidate ... become President For Life! Choose to play as a Liberal or Conservative in this satirical idle game"; $1.99 to $29.99, VIP subscriptions | no shared word | not seen | **clear**: our text never says "for life", lobbies, Liberal or Conservative (the spec 7.8 lint fails "for life") |
| Reigns (research [1]; query 24) | Nerial / Devolver Digital, App Store 12+; alive: a 10th-anniversary free update (August 2026) and a spin-off, Reigns: The Witcher (25 February 2026, $5.99) | no shared word | single card swiped left or right over a coloured background (research, memory) | **clear on the name; spec 1.2 argues the mechanic** (vertical push and pull, no tilt, no four meters). Our text never says "swipe left or right", king or reign |
| Mayor's Table (query 8, page read) | Serious Games Interactive, App Store; a newly elected mayor balances four scores (environment, technology, social, economics) over waste-management dilemmas; neglect forces you out of office | no shared word | not seen | **clear**: a serious-games dilemma app with four scores |
| Mayor apps on Play (page read): Mayor Simulator (tucel.dev), Mayor 4000: City Builder (Septudio), Mayor: Simulator Game (Hidden Lake Games), Happy Citizens - Mayor Sim (LifeSim), Merge Mayor - Match Puzzle (StarBerry Games) | city builders and simulators | "mayor" is in our keywords and description, not the title or subtitle | not seen | **clear**: the research already says "mayor" alone reads as city building; our subtitle says "sign silly papers", which no city builder does |
| Idle Mayor Tycoon (research [8]; query 11) | T-Bull, Google Play only (no iOS listing found), a casual city-building idle game | no shared title word | not seen | **clear**: our title, subtitle and short description never write "idle" or "tycoon" |
| Banana Clicktatorship (query 9, page read) | StoneSignal Studios, itch.io browser game (Godot), pay what you want; an idle clicker in an invented island state (Minzibar) where "every click is a decree"; dark comedy: wars, uprisings, a real billionaire's name | no shared word. Our mode's internal id is `decree`; no player sees it | not seen | **clear**: a web game in the comic-strongman genre spec 1 and the research keep us out of. Our store text never says "decree" |
| The President (Coco Play), Hidden Lake's House of Power and President: Simulator Game, Tropico, Papers, Please, Suzerain, Democracy (research section 2) | as the research lists them; not re-read today | no shared word with "Proudly Adequate" | not seen | **clear on the name**; the research's distance rules hold (no Oval Office, "Mr President", El Presidente, lobbies, border stamps). Our text uses none of those words |

The image comparison of spec 7.9 (`SIDE-BY-SIDE.png`, a person, before release; fingerprint dimension 7)
should cover: President Simulator: Election, PaperworkINC, No. 10: Full Confidence, Reigns, and the three
games of this account.

## The invented places

| Name | Found | Verdict |
|---|---|---|
| Republic of Middling, Middlingham (query 12) | no page with either name. Near names: "The Middling" (a region in a World Anvil fantasy setting), "The Kingdom of the Middlands" (another World Anvil setting), a "Mediumese Republic" (a wiki of an invented world), micronation wikis (Middle Secundomia, Middlesock). "Middling" is also an ordinary English word | **clear**: no real place and no known fiction of that name. Not checked: small real hamlets called Middling or Middlingham in map gazetteers; the sensitivity editor's `names.json` check should run a place gazetteer |
| Dithering-on-the-Dawdle, Upper Wobbling (query 13) | nothing with either phrase; only pages on the words "dither" and "wobble" | **clear** |

## The five most prominent cast names (spec 7.3)

Chosen as the five a new player meets first and most: the Chief of Staff (scripted papers 1 and 2), the
Treasury Clerk (every budget slip), and the three first rivals, one per office (poll, election night,
store screenshots).

| Name | Found | Verdict |
|---|---|---|
| Rodney Spinwell (query 14, 20) | nothing: no person or character of that name; "Spinwell" appears nowhere as a surname in the results | **clear** |
| Gwendolyn Abacus (query 14) | nothing | **clear** |
| Councillor Prudence Plumb (queries 14, 16, 17, 18) | no person or character called Prudence Plumb. But the surname belongs to a well-known real politician: **Henry Plumb, Baron Plumb** (Lord Plumb, 1925 to 2022), British Conservative MEP 1979 to 1999 and **President of the European Parliament 1987 to 1989**, earlier president of the National Farmers' Union. Also: Prudence Farrow, an Australian politician (first name only) | **keep a distance, and I recommend renaming.** "Councillor Plumb", a rival who wins an election and then resigns, carries the surname of a real parliamentary president. The 7.8 lint's people list (heads of government, ministers, opposition leaders of seven countries since 1900) would not catch him, since he held none of those posts. Plumb is a common word and surname and the risk is small, but she is the first rival every player meets and her line appears on election night. Sent to the content desk (requests.md) |
| Barnaby Waft, Keeper of the Ceremonial Spoon (query 15) | nothing; only other Barnabys in TV listings | **clear** |
| Professor Ignatius Crumb (queries 15, 16, 19) | no Ignatius Crumb. But **Mrs Caroline Crumb is the political candidate in "Mr Stink"**, David Walliams's 2009 children's novel and its 2012 BBC film: Chloe's mother, standing for the local seat, disgraced on air. Also a minor "Mr. Crumb" in a TV listing | **conflict with spec 7.1's fourth list** ("places and characters of children's fiction") and its third (fictional politicians): a rival candidate surnamed Crumb echoes a well-known children's-book candidate. I recommend the content desk rename him (keeping his slogan joke, "Abolish Wednesdays"). Sent to the content desk (requests.md) |
| Hilda Gourdley (extra; query 20) | nothing; only other Hildas | **clear** |

Not checked by this step: the six player faces, the other spokespeople, lobbyists, ministers and the 15
other rivals; the content desk's `names.json` check covers them (spec 7.1).

Not trademark clearance: before the first submission someone should also search the USPTO and EUIPO
registers for "Proudly Adequate" in classes 9 and 41 (games), which this search cannot do.

## Revision (2026-11-23, after the listing's store review)

Queries, verbatim, sent by the revision:

25. `goose holding scissors game icon app store`
26. `"Sign silly papers" game`

- 25 found no app whose icon (as described in words) shows a goose with scissors: GOOSE.IO (a pond game,
  4+), I Am Goose (a goose chaos sandbox), Le Gooséry Store (papercraft geese defending a shop), Duck,
  Duck, Goose. Icons were not seen (text only). The reviewer's own searches found Goose Goose Duck live on
  the App Store (rated 4.7 from 12K ratings, iOS and Android) and Untitled Goose Game (a goose doing
  mischief with stolen objects; submitted to the App Store and rejected in March 2023). **Verdict on the
  icon plan (spec 7.9: "the goose with scissors"): keep a distance.** A goose up to mischief with an
  object leans on the best-known comic goose game and on a live goose-faced mobile game, and there are
  several goose-chaos apps besides. Recommended to P4 and the lead (requests.md): the paper, the violet
  signature and the giant ribbon scissors or the drawer tab; the goose at most a small seal mark under a
  fifth of the tile. Untitled Goose Game's key art and Goose Goose Duck's icon join the SIDE-BY-SIDE list.
- 26 (the new subtitle) found no game or app with that phrase; nearest are two game-jam games about
  signing paperwork, "Sign Here, Forever" (GMTK 2025, a signing-chain game) and "Sign Here" (GMTK 2021).
  **Clear** for a subtitle; they confirm that "sign papers at a desk" is a jam trope, which the runner-up
  title note above already says.

Also corrected: the title row no longer says "no trademark" without qualification (see the row).
