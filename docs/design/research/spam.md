# A second game from the same account: store spam rules

Research date: 22 November 2026; policy pages read that day (Apple's guidelines show "Last Updated: October 16, 2026"). [n] marks a source. **Inference** marks my own reasoning. Forum and press items are individual reports, not store policy.

## 1. The rules (official text)

**Apple** [A1].
- 4.3(a): "Don't create multiple Bundle IDs of the same app ... If your app has different versions for specific locations, sports teams, universities, etc., consider submitting a single app and providing the variations using in-app purchase."
- 4.3(b): "Don't submit apps that are indistinguishable from what's already widely available. Opportunistically creating variants of existing app categories or popular apps degrades App Store discovery ..." It ends: "Repeated submissions of this kind may lead to removal from the Apple Developer Program." Press reported this tightened wording on 9 June 2026 [A6].
- 4.1(a): "Don't simply copy the latest popular app on the App Store, or make some minor changes to another app's name or UI and pass it off as your own."
- 4.2: "If your App doesn't provide some sort of lasting entertainment value or adequate utility, it may not be accepted."
- 4.2.6: "Apps created from a commercialized template or app generation service will be rejected unless they are submitted directly by the provider of the app's content."
- 2.3.7: "Choose a unique app name, assign keywords that accurately describe your app ..."
- 2.3.1(a): "All new features, functionality, and product changes must be described with specificity in the Notes for Review section of App Store Connect (generic descriptions will be rejected)".
- 2.5.19: "Don't include any hidden, dormant, or undocumented features in your app ... Attempting to hide undocumented features in your app binary ... is grounds for removal of your app from the App Store and termination of your developer account."
- Introduction: "If you attempt to cheat the system (for example, by trying to trick the review process, ... copy another developer's work, manipulate ratings or App Store discovery) your apps will be removed from the store and you will be expelled".
- The License Agreement lets Apple terminate for "misrepresenting the nature of Your Application (e.g., hiding or trying to hide functionality from Apple's review ...)" [A2].

**Google.**
- Repetitive Content: "We don't allow apps that merely provide the same experience as other apps already on Google Play. Apps should provide value to users through the creation of unique content or services." Listed violations: "Copying content from other apps without adding any original content or value" and "Creating multiple apps with highly similar functionality, content, and user experience. If these apps are each small in content volume, developers should consider creating a single app that aggregates all the content" [G1].
- Limited Functionality and Content: "We do not allow apps that only have limited functionality and content" [G2]. On 17 July 2024 Google announced it was "updating the Spam and Minimum Functionality policy to ensure apps meet uplifted standards for the Play catalog" [G3].
- The 2018 clause on apps "created by an automated tool, wizard service, or based on templates" [G7] is not on the live Spam page [G1].
- Enforcement: "Suspensions count as strikes ... Multiple strikes can result in the termination of individual and related Google Play Developer accounts." "Removals don't immediately impact the standing of your Google Play Developer account, but multiple removals may result in a suspension." Google uses "a combination of human and automated evaluation" [G4]. After a termination, "any related Google Play Developer accounts are also terminated, and any new accounts that you try to open will be terminated" [G4b].
- Personal accounts created after 13 November 2023 "must run a closed test for their app with a minimum of 12 testers who have been opted in continuously for at least 14 days" [G6].

## 2. How enforcement works

**Official:**
- Neither store publishes a similarity threshold or says what it compares.
- An App Review staff reply (January 2025) says 4.3 apps "Typically ... share a similar binary, metadata, and overall concept as apps already on the App Store, with only minor differences", and suggests an "App Review Appointment" [A3].

**Developer reports (anecdotes):**
- The rejection text quoted by developers: "shares a similar binary, metadata, and/or concept as apps submitted to the App Store by other developers, with only minor differences. Submitting similar or repackaged apps is a form of spam ..." [A3][A4].
- One developer relayed a list of factors (February 2024): "Submitting an app with the same source code or assets as other apps already submitted to the App Store", "Creating and submitting multiple similar apps using a repackaged app template", "Submitting several similar apps across multiple accounts" [A4].
- Your own catalogue counts: 4.3(a) itself is about one developer's bundle IDs [A1], and one developer (September 2026) quoted wording naming "apps submitted by us or other developers" [A5].
- One community reply (unverified) says rebuilding does not help because review compares "the outside of the binary and the listing" and names placeholder ids such as com.example as a red flag [A5].
- One developer had twelve updates, submitted within ninety minutes, rejected in one batch; their audit found release notes were the main overlap and they rewrote them (outcome not reported) [A7].
- Appeals: one community reply claims appeals naming a verifiable unique feature and its tap path succeed [A5]; one 4.3(b) appeal was upheld against the developer (April 2026) [A8]. On Google, some icon packs removed under Repetitive Content in 2023 were restored; one account was banned and the ban upheld on appeal [G8].

**Inference:**
- Game engines: no statement exempts them. 4.2.6 targets template *services* submitting for clients, so a studio's own engine is not a template under it. Shipping the same game twice is still 4.3(a).
- Portfolios exist: one studio lists three "... Empire Tycoon" games and two coffee-shop idle games [P1]; another has shipped "Idle ... Tycoon" titles since 2016 [P2]. A shared genre and title pattern are not fatal alone, but these show what survived, partly before June 2026, not what passes today.

## 3. Differentiation checklist (second game, same account)

**MUST differ** (without these, expect a rejection):
- **Core loop and what the fingers do.** Pizza: stations cook, waiters carry, guests pay. The second game needs a different verb and flow of goods (for example drill, haul, refine, sell), not the same chain renamed.
- **The moment money is made:** a different trigger and place on screen (contract delivered, ore sold at a depot), not a customer paying at a counter.
- **Main screen composition:** different camera, layout and focal object; a screenshot must never read as a palette swap.
- **Art, characters, animation:** no shared sprites, rigs or poses.
- **Store listing:** title, subtitle, description, promotional text, release notes, keywords, icon, screenshots and preview video made from scratch.
- **Bundle contents:** none of the other game's assets, strings or scene code (2.5.19 also forbids dormant features).
- **Distance from other developers' hits, not only our own** (4.3(b), 4.1(a), "by other developers"). A mining idle game must not copy an established series' signature (for example a vertical mine-shaft screen) or its title words ("Idle Miner").

**SHOULD differ:**
- **Progression structure.** Pizza: levels inside 8 restaurants, then a prestige reset. Use another shape (sector map, tech tree).
- **Active skills and events:** a different set and trigger (meteor storms, not rush hour).
- **Meta systems and screens:** names, layouts and at least one system should differ (a fleet or research screen instead of staff cards).
- **Sound and music:** new music; at most a few generic UI clicks shared.
- **Texts and tone:** different voice, no reused sentences.
- **Release timing and review notes:** see section 6.

**Probably safe to share** (**inference** from portfolio studios [P1][P2] and the lack of a rule against them): the engine and native code, libraries, ad, analytics and payment SDKs, save and offline-earnings systems, the genre, generic UI components restyled per game, the developer name and account, and cross-promotion. Caveat: Apple's relayed factor list names "the same source code or assets" [A4], so keep game-specific code out of the shared engine, and make sure meta screens are not merely restyled copies.

## 4. Measurable version

**No store publishes a threshold.** This is a risk-reduction device to stop an accidental re-skin, not a guarantee of approval. Each dimension scores 1 if games A and B differ. **[M]** = hard gate. "Read from" says where a tool gets the value: **cfg** = a field in `game.json` (labels such as layout or voice must be declared there by the designer, since code cannot infer them reliably), **build** = the built IPA/AAB or JS bundle, **store** = the store fields in `game.json`/`store/`, **log** = a release log the studio keeps, **human** = a person's check.

| # | Dimension | Values | Differs when | Read from |
|---|---|---|---|---|
| 1 | core_verb [M] | tap-target, hold, drag/route, swipe/aim, place/arrange, idle-only, steer (added for the scrapyard: one thumb moves an avatar or vehicle continuously through a world with a floating stick; work happens by stopping next to things; nothing is tapped, dragged onto or swiped at; yard-design.md 1.2) | values differ | cfg |
| 2 | production_topology [M] | linear-chain-with-transport, parallel-generators, vertical-shaft, spatial-grid, network-routes, single-node, separation-tree (added for the scrapyard: one input object splits into graded outputs and by-products that go to different places, and machines split them further; the reverse of an assembly chain, not a network of routes; yard-design.md 1.2) | values differ | cfg |
| 3 | money_moment [M] | customer-pays, sale-at-depot, contract-complete, auto-tick, tap-collect, graded-lot-sale (added for the scrapyard: material is weighed in by grade into bays and leaves as lots of one grade, collected by a named merchant or dealer at a price posted once a market day; any bay may be held for a better day; no customer, departure, completed order or timer pays; yard-design.md 1.2) | values differ | cfg |
| 4 | main_screen_layout [M] | side-cross-section, top-down-map, isometric-room, single-object-focus, card-list, grid-board (added for Night Market's fixed board, market-design.md 1.2), three-quarter-world (added for the scrapyard: a scrolling world several screens wide in three-quarter oblique view, followed by a camera, in landscape; yard-design.md 1.2) | values differ | cfg |
| 5 | art_asset_overlap [M] | share of image files shared by hash | 0 % | build |
| 6 | store_text_overlap [M] | trigram overlap of title, subtitle, description, promo text, release notes | <10 % | store |
| 7 | icon_and_screenshot_template [M] | own composition / shared template | own | human |
| 8 | bundle_foreign_content [M] | other game's assets, strings or scene modules in the bundle | none | build |
| 9 | progression_structure | location-levels, sector-map, tech-tree, endless-single, seasons, office-ladder (added for High Office: a short fixed ladder of offices, each entered only by winning a vote at the end of a term of decisions; a lost vote repeats the term in place; the top office continues as repeated terms; office-design.md 1.2) | values differ | cfg |
| 10 | prestige_model | reset-for-currency, new-location-carryover, none, seasonal | values differ | cfg |
| 11 | active_skills_events | set of ids | Jaccard < 0.5 | cfg |
| 12 | meta_systems | set (cards, chests, missions, offers, research, fleet, daily...) | Jaccard < 0.7 or one unique system | cfg |
| 13 | meta_screen_layouts | same / restyled / different | different | human |
| 14 | art_style | flat-vector, pixel, 3D-render, painted, plus palette family | either differs | cfg |
| 15 | character_kind | humans, robots, aliens, animals, none | values differ | cfg |
| 16 | audio_overlap | share of sound files shared by hash | <20 %, music 0 % | build |
| 17 | tone_and_string_overlap | voice label, share of in-game strings shared | voice differs and <5 % | cfg |
| 18 | keyword_overlap | Jaccard of store keywords | < 0.3 | store |
| 19 | release_gap | days since the other game's last submission | ≥14 | log |

Hash checks (5, 16) catch only exact copies, so rows 7 and 13 stay human checks. "Distance from other developers" cannot be measured from the repository; it needs a store search before naming.

**Recommended minimum:** all 8 [M] differ, **and** at least 15 of 19 overall. Below that, redesign or use section 7. Repository observations, to verify:
- Both bundle ids are `com.example.*` placeholders. Replace them with the studio's own domain.
- Both titles use "Empire".
- Both card sets use the same stat keys.
- `src/ui/sim/` holds restaurant scenes. Check that the space build does not import them.

## 5. The binary side (React Native / Expo)

Thousands of unrelated apps share the React Native and Expo native code, so it cannot by itself be a signal (**inference**); the JavaScript bundle, assets, Info.plist names and listing are what differ. Build per game with only its `game.json`, art and sounds; keep game-specific scenes in modules only that game imports; after each build, unzip the IPA and AAB and search for the other game's names. Content switched on after review is a hidden feature [A1 2.5.19][A2].

## 6. Release practice

- **One account.** Multiple accounts appear in the relayed factor list [A4]; Google's terminations extend to "related" accounts [G4][G4b].
- **Spacing.** Don't submit both games together or in a burst (**inference** from [A7]). On Google, the 14-day closed test [G6] spaces releases anyway.
- **Review notes.** 2.3.1(a) requires specific notes for new features [A1]; extending that to explaining the sibling game is **inference**. Write: "Built by our studio on our own engine. Our other game X is a restaurant sim; this one is Y. Core differences: 1. ... 2. ... 3. ... Tap path: ...". A community member advises mentioning any past rejection in every later submission [A10].
- **After a 4.3 or Repetitive Content rejection:** ask App Review what the app was compared with (developers report doing so [A7]); change the product and the listing, not only the code; appeal once, with specifics; book an App Review Appointment [A3].

## 7. Never do

- Open a second account for a near-copy or to get around a rejection or termination [G4b][A4].
- Hide a mode, theme or game from review and switch it on later [A1 2.5.19][A2].
- Ship another game's art, sounds, strings or scenes, or reuse its store text, release notes, screenshot templates, icon layout or video.
- Stuff keywords or chain pattern titles just to rank [A1 2.3.7].
- Resubmit an unchanged build after a spam rejection, or keep placeholder bundle ids.
- Buy reviews or ratings, or manipulate charts [A1][A2].

## 8. Fallback: one app, themes as worlds

Both stores name this fix: "consider submitting a single app" [A1] and "consider creating a single app that aggregates all the content" [G1]. Choose it when the second game fails a [M] gate on core loop or main screen; when each theme is small (a few hours of play); or after an upheld spam rejection with no real mechanic change planned. Pizza and space would be worlds inside one app, unlocked by play or bought in-app.

## Sources

- [A1] Apple, App Review Guidelines (intro, 2.3.1, 2.3.7, 2.5.19, 4.1, 4.2, 4.2.6, 4.3), last updated 16 Oct 2026, read 22 Nov 2026: https://developer.apple.com/app-store/review/guidelines/
- [A2] Apple Developer Program License Agreement (termination clause), read 22 Nov 2026: https://developer.apple.com/support/terms/apple-developer-program-license-agreement/
- [A3] Apple forums, 4.3(a) rejection text and App Review staff reply, Jan 2025: https://developer.apple.com/forums/thread/773257
- [A4] Rejection relayed in a React Native boilerplate discussion, 11–12 Feb 2024: https://github.com/infinitered/ignite/discussions/2633
- [A5] Apple forums, "Guideline 4.3(a) after rebuilding my app multiple times", Sep 2026 (one community reply, no Apple reply): https://developer.apple.com/forums/thread/847036
- [A6] 9to5Mac, 9 Jun 2026: https://9to5mac.com/2026/06/09/apple-tightens-app-review-guidelines-against-apps-that-do-not-add-value-to-the-app-store/ and MacRumors, 9 Jun 2026: https://macrumors.com/2026/06/09/app-store-guidelines-low-quality-apps/
- [A7] Apple forums, 4.3(a) rejection and developer replies, Aug 2026: https://developer.apple.com/forums/thread/842971
- [A8] Apple forums, 4.3(b) appeal upheld, Apr 2026: https://developer.apple.com/forums/thread/823323
- [A10] Apple forums, community advice on reviewer notes after a rejection, Jan 2025: https://developer.apple.com/forums/thread/773200
- [G1] Google Play, Spam policy, read 22 Nov 2026: https://support.google.com/googleplay/android-developer/answer/9899034
- [G2] Google Play, Functionality, Content, and User Experience, read 22 Nov 2026: https://support.google.com/googleplay/android-developer/answer/9898783
- [G3] Google Play policy announcement, 17 Jul 2024: https://support.google.com/googleplay/android-developer/answer/14993590
- [G4] Google Play, Enforcement Process, read 22 Nov 2026: https://support.google.com/googleplay/android-developer/answer/9899234
- [G4b] Google Play, account terminations, read 22 Nov 2026: https://support.google.com/googleplay/android-developer/answer/2491922
- [G6] Google Play, testing requirements for new personal accounts, read 22 Nov 2026: https://support.google.com/googleplay/android-developer/answer/14151465
- [G7] TechCrunch on the 2018 template clause, 27 Jul 2018: https://techcrunch.com/2018/07/27/google-follows-in-apples-footsteps-by-cleaning-up-its-play-store
- [G8] Android Police, icon packs removed under Repetitive Content, updated 29 Apr 2023: https://www.androidpolice.com/icon-pack-apps-and-google-in-depth/
- [P1] App Store developer page of an idle-tycoon studio, read 22 Nov 2026: https://apps.apple.com/us/developer/-/id516547990
- [P2] Wikipedia, Kolibri Games (titles and years): https://en.wikipedia.org/wiki/Kolibri_Games
