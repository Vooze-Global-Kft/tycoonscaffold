# Orbit Haulers: notes for App Review and Play review

Paste the text between the lines into App Store Connect, App Review Information, "Notes", and into the
Play Console's "App access" instructions. Add the contact name, email and phone there by hand (no file
in this repository holds them). Written from spec section 7.6; the tap path and the timings must be
checked on the build being submitted, and this file corrected if they moved.

---

Built by our studio on our own engine. Our other game, Pizza Empire, is a restaurant sim where you tap stations and guests pay. Orbit Haulers is a different game:

1. You drag drones onto asteroids to set routes; rocks run dry and are replaced, and you re-route for contracts, rich seams and bonanza rocks all game.
2. Money arrives only when the freighter launches and warps out, and a buyer contract you take pays its rate on the units it asked for once they are all delivered, over several launches.
3. Modules work only when fitted into three typed sockets in the Fitting Bay, and the reset is spent on a Star Map of rule-changing nodes.

Tap path: open the app, follow the reticle: drag the drone onto the rock, then swipe up in the bay (about 30 s).
Fitting Bay: the third button on the bottom rail (three hexagons, between the pod crate and the three-armed star), open once the pod from the first ring-2 claim is opened (about 3 to 5 min).

No account or sign-in. Ads are rewarded only and always optional (a Survey Flare charge, a +50 % boost on the Shift Log after time away); salvage pods are earned in play and never sold, and their odds are shown before opening. Purchases: Clearance (every ad reward without watching the ad; the game has no banner or pop-up ads), Hangar Expansion, Prospector Charter (once) and two Dark Matter packs.

Notifications: the first time the player collects a Shift Log after time away, the game asks for permission to send notifications. They are reminders scheduled on the device itself (when the dock autopilot has shipped all it can, and once three days after the player left); the app registers for no remote push and has no push entitlement, and a reminder is never an offer. The switch is "Away pings" in the station menu.

Game Center: two leaderboards, "Contracts met" and "Freighter launches". "Fleet standings" in the station menu opens them. The game signs in to Game Center quietly at launch and shows Game Center's sign-in screen only when the player taps that button.

---

## Before pasting, check on the submitted build

- [ ] The first drag and the first swipe work as written, and the first payout comes within about 30 s.
- [ ] The Fitting Bay button is the third on the rail and opens at the stated time.
- [ ] The ad and purchase sentence matches what the build does (game.json `monetization`; spec 5.4 says
      no interstitials in the first version).
- [ ] The notification prompt appears after the first Shift Log is collected, not at launch, and "Away pings" in the station menu switches them (`src/ui/haul/strings.ts`, the `ping…` keys).
- [ ] The two leaderboards exist in App Store Connect under the ids of game.json `leaderboards` (orbithaulers.contracts, orbithaulers.launches), are attached to the version, and "Fleet standings" opens them.
- [ ] Nothing in the build, the screenshots or this text names the other game except the first sentence.
