# Proudly Adequate: notes for App Review and Play review

Paste the text between the lines into App Store Connect, App Review Information, "Notes", and into the
Play Console's "App access" instructions. Add the contact name, email and phone there by hand (no file
in this repository holds them).

Brought in step with the game as built on 24 November 2026 (after the reviews of the built game;
decisions D11, D13, D41 to D44 of docs/design/office-design.md). On purpose this text names no minute
figure, no term length, no call point and no boycott threshold: those numbers are still being tuned
(D34, D38, D44). The checklist at the end lists every number the text does state and where it comes from.

---

First, the content. Proudly Adequate is a comedy set in the Republic of Middling, a country we made up. All countries, parties, politicians, companies and newspapers in it are fictional. No real people, parties, flags or current events appear, and no user-written text is shared: players choose one of six drawn faces and never type a name. Elections are computed from numbers the player can see. The game is not made by or for any government and offers no government service.

The game: the player is mayor of a small invented town, and may later become governor and then president. Visitors lay papers on the mayor's desk one at a time (a bus spotter, a pumpkin grower, a lobbyist with a fruit basket). Each paper prints what signing and refusing will do, as numbers, before the player acts, and those numbers are what happens. A push upward signs the paper; a pull downward refuses it and files it in a drawer labelled FOR FURTHER STUDY. The comedy is aimed at office itself (ribbon-cuttings, committees, portraits of the mayor), never at real issues or real groups.

Our account has three earlier games, built by the same small team on one in-house code base: Pizza Empire (a side view of a kitchen and dining room; tap its stations; every guest pays for a meal), Orbit Haulers (a top-down asteroid map; drag drones onto rocks; launching the freighter sells its hold) and Lantern Row (a 7 by 8 board; merge snacks; filled tickets pay). This one is built differently, and where it is related we say so:
1. The only gesture is a vertical push or pull of the single paper on the desk, choosing one of its two printed outcomes. The player never carries anything to a chosen spot, never merges and has no stations to tap. Orbit Haulers' freighter is also swiped upward, and that is our nearest overlap; here the tutorial teaches the downward pull (refusing) first, the push has no arming tap, and it commits only what that paper prints. Nothing is launched, loaded or sold.
2. Money comes in every second from ministries (the Town Clock Office, the Potholes Office and others), scaled by how much the town's hobby clubs approve. No customer, buyer, contract or ticket exists. Some papers cost or pay a printed sum if signed.
3. Growth is the familiar idle-game part, and we name it: ministries are raised level by level, and they keep collecting at a lower rate with the app shut, for at most 4 hours. When the desk is free, the Treasury Clerk slides a budget slip onto it naming one purchase (a ministry raised by a few levels, or a new ministry opened) with its whole price and gain; up buys it at that price, down hands it back. The Ledger, a book of the ministries, lists the same purchases. Nine ministers arrive by application papers and each brings one printed desk rule; they are related to the per-station managers of our restaurant game and the stall minders of Lantern Row, which we state openly, but they are never bought, never random and never multiply income by a card.
4. Promotion is a ladder of three offices, reached only by winning an election (with a record of ministry levels as a second condition) and never by purchase. Losing an election keeps everything built. No venues, galaxies, seasons or reset currency.
5. The screen is one desk seen from above, green baize, walnut and violet ink, with editorial-cartoon busts of adults in oval photographs. Nobody walks, carries or serves.

Other well-known games of this kind:
- Swipe card games: our paper goes only up or down, never left or right, never tilts, and shows both results in numbers beforehand. No four meters, no run that ends, no line of rulers.
- Office games where papers are approved or denied (with a bribe-risk slider): no printer, conveyor, hired workers, floors or bribe slider here. A lobbyist's basket never pays money or pleases a club, and income comes from ministries, not from a count of papers handled.
- Border-inspection games: no border, passports, rulebook, stamps or family budget.
- President games set in real or US-styled countries: no real country, party, oval office or "Mr President"; the republic is invented and its map is a hand-drawn ward map in violet and slate.

Tap path (well under a minute):
1. Launch the app and tap any of the six faces on the first card, or "Pick for me", then "To the desk".
2. Paper 1 is a practice form from the Chief of Staff. A drawn pen shows the move: pull the paper down about a thumb's length; the drawer slides open and takes it. Each club's mood goes up by 1, as the paper printed.
3. Paper 2: push it upward. The signature writes itself as it rises, and the paper drops into the wire out-tray. Tapping the tray within 2 seconds returns it untouched.
4. The Treasury Clerk slides over a budget slip ("Town Clock Office +1 level", its price and its gain): up buys it, down hands it back. The rate in the top bar rises at once.
5. Paper 3 (Till's Teas) pays money and pleases one club at another's expense; paper 4 is the lobbyist's fruit basket, which if signed adds gossip and nothing else.
After that, while the game is open, a visitor arrives about every 12 seconds. Tapping a club's ring at the top names the club. The Ledger, the Cabinet, the Poll (the ward map with each ward's share) and the Office wall all open from the bottom row in the first minute.

Elections: a term lasts a fixed number of papers. Late in the term a "Call the election" button appears on the ribbon; the term also ends by itself. The poll board shows how each ward would vote right now; the count uses those same numbers, and election night chalks the wards up on a board one at a time. Rivals are invented individuals with a hobby and a slogan, never a party. A loss removes nothing: the player serves on as "Acting Mayor" until the next election. Before the count comes the run-up: a few campaign papers, each a public appearance in a named ward (judging a hedge show, opening a fete), and a rally. They are paid from the dibs the town treasury earned in play, like any other paper, at a moment when the Shop and every ad button are closed; refusing one costs nothing.

Ads: there are no banners and no ads between screens. Each video ad is started by the player from a button that names its reward: half again on the report after time away; Check the Sofa (a sum printed on its card, once a term); Call the Spin Doctor (ends the 10-paper income cut that follows "Say nothing" after a scandal); Send a Courier (ends a club's boycott); Open the Doors (fills the in-tray with papers when it is at most half full; 15 minutes of play between uses). The scandal and the boycott also end without an ad, after a printed number of papers. From the call of an election to the end of election night the game shows no ad button and no shop: the Settings sheet says "Closed during the run-up" where its Shop button stands. No ad or purchase moves a mood or a poll point: those move only by papers the player decides, and money only buys ministry levels, new ministries and monuments, or pays a paper's printed price. AdMob's "Politics" sensitive category is blocked for this app, so no real political ad can appear.

Purchases: five, none random, each bought once. Junior Clerk on Duty (the Standing Order, which buys the advised ministry level while the app is open, from the first day instead of from the governor's second term; it buys nothing the player could not buy, and never while the app is shut); Long Lunch (time away counts for 6 hours instead of 4); the Walnut & Brass Desk Set and Gilt Portrait Frames (appearance only); Skip the Ad Videos (a secretary sits through each ad, and its reward comes at once). Our three other games also sell a way to take ad rewards without the video, as most free games do; we say so here rather than leave it for you to find. Restore purchases is in the Shop and in Settings (the menu at the top right opens Settings; the Shop opens from there).

No login is needed. There is no chat, leaderboard, user-generated content or web view.
---

## Before pasting, check on the submitted build

- [ ] The tap path plays as written (spec 3.1): six faces and "Pick for me"; paper 1 teaches the pull down (every club +1); paper 2 the push up with the 2 s take-back; the first slip names the Town Clock Office; paper 3 is Till's Teas, paper 4 the basket.
- [ ] "about every 12 seconds" (game.json `decree.offices[0].tau`), "at most 4 hours" and "6 hours instead of 4" (`decree.away.capHours`, `longLunchHours`), "15 minutes" (`decree.ads.openDoorsCooldown` 900 s), "at most half full" (D42 (h)), "10-paper income cut" (`decree.scandal`), "Nine ministers" (spec 2.9) match the tuned game.json and `scripts/content/office-store.json` `_numbers`.
- [ ] No minute figure, term length, call point or boycott threshold was added back to this text (D44: they are tuned).
- [ ] The five products and their words match game.json `monetization.iap.products` (D11).
- [ ] Restore purchases is in the Shop and in Settings; the Shop opens from Settings (menu, top right).
- [ ] No ad button and no Shop is reachable from the call to the end of election night (spec 2.10, 10.1 item 4); Settings shows "Closed during the run-up" in the Shop button's place.
- [ ] Campaign papers appear in no store image or preview video (the store reviewer's finding 29).
- [ ] The Ledger appears in no store image (D43).
- [ ] The six images in screenshots/ were re-made from the final game.json (`npx tsx scripts/store/shots.ts --game high-office --write`) and each looked at: the refusal first, the signing, the pumpkin's follow-up, the poll, election night, the Office wall; no front page, run-up paper, Ledger, goose, flag, seal, building or date.
- [ ] The AdMob "Politics" sensitive category is blocked in the AdMob console for this app (policy research 3).
- [ ] The ad and purchase sentences match what the build does (game.json `monetization`: five products, `interstitials` false, `showBanner` false).
- [ ] The H10 bot gate (ad-everything against passive, all five products held: share, margin and Name Recognition per term within 3 points) passed in `build-office.py`'s final report.
- [ ] Nothing in the build, the screenshots or this text names the other games except the paragraphs that compare them.
- [ ] Category: one subcategory (Simulation), as `scripts/content/office-store.json` has it.
