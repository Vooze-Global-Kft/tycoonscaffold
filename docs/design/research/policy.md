# Store policy and law: chests, deals, gems, ads, reskins

Web search worked. Checked 22 Nov 2026. Quoted rules were read on the primary page; `(?)` marks memory or a secondary source, `(own)` my judgement. Not legal advice.

## 0. Decide first: are chests sold?

A random item bought with money or gems (gems are sold) is a "paid random item". Rating forms are answered per app, so selling one anywhere sets ratings everywhere (own): PEGI 16 on Google Play in Europe [P1][P2]; on the App Store 16+ in Australia and 18+ in Brazil, where both stores block minors from 18+ apps [A2][A4][G8]. Timer, mission and ad chests trigger none of this. **Recommended: never sell chests; gems buy named cards and bundles with listed contents.**

## 1. Chests

- Apple 3.1.1: "must disclose the odds of receiving each type of item to customers prior to purchase" [A1]. Google: "in advance of, and in close and timely proximity to, that purchase" [G1]. AdMob: a random ad reward needs its chance disclosed before the ad [G2].
- FTC v. Cognosphere, 2025 (binds that company only): odds visible "without requiring any additional input"; no spending under 16 without parental consent [F1].
- Belgium: paid loot boxes are illegal gambling; publishers switch them off for that store country (?) [B1]. Brazil: banned since March 2026 in games "likely to be accessed" by under-18s [G8]. Netherlands: no ban (?); a 2025 ruling faulted a mobile game for missing odds and euro prices [B1].
- EU Digital Fairness Act proposal (11 Nov 2026, not law): no paid random rewards for minors; a rating under 18 means "directed at minors" [E3].

## 2. Deals and gems

- EU law bans "falsely stating that a product will only be available for a very limited time" and any "direct exhortation to children to buy" [E1]. Dutch regulator v. Epic, 2024: €562,500 for "Buy now", €562,500 for timers on items that stayed on sale; Dutch under-18s now see only offers of 48 h or more [N1].
- FTC: a countdown on an offer that is not time-limited deceives [F2]; a "was" price must really have been charged for a substantial period [F3]. Apple: "promoting a false price" can end the account; promotional pushes need opt-in [A1].
- EU consumer authorities, 2025: real-money price beside every gem price, at the undiscounted rate; one paid currency [E2].
- Bought gems "may not expire" (Apple) [A1] and work only "within the app or game title for which they were purchased" (Google) [G1].
- PEGI: time-limited offers 12; daily rewards 7 [P1].

## 3. Children

- The US children's privacy rule (COPPA) weighs "visual content, use of animated characters or child-oriented activities and incentives", ads, marketing and user reviews [F4]. HyperBeard, 2020: cartoon casual games counted as child-directed despite a not-under-13 notice (?); the breach was ad SDKs collecting device identifiers [F5].
- Google rejects a listing with "youthful animation or young characters" unless it changes or the app moves to under-13 [G4]. That means certified ad SDKs, no interest-based ads, no advertising ID "from children or users of unknown age" [G3].
- Apple's Kids Category excludes third-party ads and analytics, with narrow exceptions. Ads "must be appropriate for the app's age rating" [A1]; a higher rating can be set by hand [A3].
- Brazil requires apps likely to be accessed by minors to read the store's age range [G8]; Utah and Louisiana are similar (?) [A4]. `expo-age-range` wraps both store APIs [X1].

## 4. Many re-themed games

- Apple 4.3(a): "Don't create multiple Bundle IDs of the same app"; it suggests one app with the variations inside [A1]. App Review looks for "a similar binary, metadata, and overall concept ... with only minor differences" [A5].
- Google bans "multiple apps with highly similar functionality, content, and user experience" and suggests one app too; termination takes related accounts with it [G5].
- The README's model ("a new game is a new folder and a new store listing") is what both rules describe. Neither store publishes a threshold, so I cannot say how different is enough.

## 5. Ads and haptics

- Rewarded: opt-in, with "clear, accurate and conspicuous disclosure of the action(s) required and reward(s) offered"; declining must not "impede or interfere" [G2].
- Interstitials: never "when the user has chosen to do something else" [G6]. Banners: not beside "a custom app menu bar" or "on a game play screen where users are continuously interacting" [G7]. Ads must fit the app's content rating [G6].
- Haptics: no store rule (Apple's guidelines never mention them). The EU proposal covers "visual, auditory and other components" of a manipulative interface [E3].

## Checklist

1. **Never sell chests** (`sim.chests.paid: false`); gems buy named cards and fixed bundles. If overridden: off for store country BE, BR and unknown (`Purchases.getStorefront()`), off under 18, "includes random-item purchases" atop the listing [U1], accept PEGI 16.
2. **Odds sheet on every chest**, free and ad chests included, one tap away and shown before the ad. Generate it from the engine's drop table (live Remote Config values); test that shown odds equal roll weights. Same odds for everyone.
3. **Deals:** save `expiresAt` once, never reset or extend; no repeat for 30 days (own); show the end date; 48 h minimum.
4. **Price claims are computed:** `validate` derives "was" (lowest price in 30 days, the EU rule for goods (?)) and "+x %" (against the smallest gem pack).
5. **Gems:** real-money equivalent beside every gem price; one paid currency; never expire; never shared between games; prestige keeps everything bought.
6. **Sales feel:** no "Buy now!" or guilt text; close button visible at once; no haptic or alarm on offers and timers (drop the `deal_popup` haptic); deal pushes after opt-in only.
7. **Audience:** Play target 13+; Apple rating set to 13+, never Kids Category; listing shows adult staff, no "kids" wording. Apple's Loot Boxes and Advertising answers go in by hand: EAS metadata has no field [X1].
8. **Age band** from `expo-age-range` (mandatory for Brazil), neutral birth-year screen as fallback. Child: `ageRestrictedTreatment: CHILD`, G-rated non-personalised ads, no tracking prompt, no real-money shop (own). Teen: `TEEN`.
9. **`src/services/ads.ts`** never calls `setRequestConfiguration`: set `maxAdContentRating` from game.json (default `PG`) before `initialize()`.
10. **Rewarded buttons** state the action and exact reward ("Watch ad: ×2 income, 30 min").
11. **Interstitials, banner:** delete the `tab_change` trigger and the `offline_collect` one, which fires only after the player declines the rewarded double (`src/state/store.ts`); pause 1 s before the `prestige` one. Move `<Banner />` off the tap scene and away from `<TabBar />` (`src/ui/App.tsx`).
12. **Reskins:** each title differs in mechanics, numbers, art, audio and listing text; `validate` fails on a shared economy table or near-identical store text; one account, one release at a time. Fallback: one app with themes as worlds.

## Sources

- [A1] Apple review guidelines: https://developer.apple.com/app-store/review/guidelines/
- [A2] Apple age rating values: https://developer.apple.com/help/app-store-connect/reference/age-ratings
- [A3] Apple, set an age rating: https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/
- [A4] Apple news, 24 Feb 2026: https://developer.apple.com/news/?id=f5zj08ey
- [A5] App Review reply, Jul 2025: https://developer.apple.com/forums/thread/794830
- [G1] Play Payments: https://support.google.com/googleplay/android-developer/answer/9858738
- [G2] AdMob rewarded policies: https://support.google.com/admob/answer/7313578
- [G3] Play Families: https://support.google.com/googleplay/android-developer/answer/9893335
- [G4] Play target audience: https://support.google.com/googleplay/android-developer/answer/9867159
- [G5] Play Spam, enforcement: https://support.google.com/googleplay/android-developer/answer/9899034 and /answer/9899234
- [G6] Play Ads: https://support.google.com/googleplay/android-developer/answer/9857753
- [G7] AdMob banner guidance: https://support.google.com/admob/answer/6128877
- [G8] Play country requirements: https://support.google.com/googleplay/android-developer/answer/6223646
- [F1] FTC order: https://www.ftc.gov/system/files/ftc_gov/pdf/cognosphere_stiporder.pdf
- [F2] FTC dark patterns report: https://www.ftc.gov/node/79647
- [F3] 16 CFR 233: https://www.ecfr.gov/current/title-16/part-233
- [F4] COPPA Rule, 90 FR 16918: https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule
- [F5] FTC, HyperBeard: https://www.ftc.gov/node/31657
- [E1] Directive 2005/29/EC, Annex I points 7, 28: https://eur-lex.europa.eu/eli/dir/2005/29/oj
- [E2] CPC Network key principles: https://commission.europa.eu/document/8af13e88-6540-436c-b137-9853e7fe866a_en
- [E3] COM(2026) 1100, Articles 10, 15, recital 62: https://commission.europa.eu/document/download/0575d59f-554f-4a9e-b54b-e6b717175809_en
- [N1] ACM v. Epic: https://www.acm.nl/en/publications/acm-imposes-fine-epic-unfair-commercial-practices-aimed-children-fortnite-game
- [U1] UK ASA notice: https://www.asa.org.uk/resource/enforcement-notice-disclosure-of-loot-boxes-in-app-stores.html
- [P1] PEGI criteria, secondary: https://www.reedsmith.com/articles/pegi-launches-interactive-risk-categories-overhauls-age-ratings-for-loot-boxes-in-game-spending-and-communication-features/
- [P2] PEGI re-rating, secondary: https://www.pocketgamer.biz/games-with-loot-boxes-receive-updated-pegi-16-rating-for-paid-random-items/
- [B1] L. Xiao, secondary: https://sites.google.com/view/leon-xiao/policy/belgium and /policy/netherlands
- [X1] Expo: https://docs.expo.dev/versions/v58.0.0/sdk/age-range/ and https://docs.expo.dev/eas/metadata/schema/
