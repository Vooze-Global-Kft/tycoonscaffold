# Sound, music and haptics: the fx service

Everything the game feels and hears goes through one object, `fx`
(`src/services/fx`). Game code names an event; the service decides which file
plays, how loud, with which vibration, and whether anything should happen at
all (settings, app in the background, an ad on screen, the same event 5 ms ago).

```ts
import { fx } from '../services/fx';

fx.play('buy');
```

Nothing in this API throws, and nothing needs a sound file to exist: an event
without a file is silent and still vibrates.

## The API

```ts
fx.init(): Promise<void>
fx.play(name: FxName, opts?: { step?: number; volume?: number; haptic?: boolean }): void
fx.music.start(): void
fx.music.stop(): void
fx.settings.get(): { sound: boolean; music: boolean; haptics: boolean }
fx.settings.set(partial): void
fx.settings.subscribe(listener): () => void        // returns unsubscribe

// extras
fx.suspend(reason?: string): void                   // full-screen ads, see below
fx.resume(reason?: string): void
fx.ladderStep(name, level, levels): number          // helper for `step`, see "The tap ladder"
fx.setVolume(volume: number): void                  // master volume for effects, 0..1, not saved
fx.music.setVolume(volume: number): void            // music volume, 0..1, not saved
useFxSettings(): FxSettings                         // React hook, src/services/fx/useFxSettings.ts
```

| Call | What it does |
|---|---|
| `fx.init()` | Loads the saved settings, configures the audio session, starts preloading. Call once at startup (`App.tsx` does). Safe to call again; never rejects. Until it resolves, `play()` does nothing, so a player who muted the game never hears the first tap. If nobody calls it, the first `play()` or `music.start()` does. |
| `fx.play(name, opts)` | Fires one catalogue event. `name` is a key of `FX` in `src/services/fx/catalog.ts` (TypeScript checks it). |
| `opts.step` | Ladder sounds only (`tap`): which rung, **0 = the first file**. Fractions are floored, anything out of range is clamped. |
| `opts.volume` | Multiplies the catalogue volume for this one play: `0.5` is half as loud as designed, `1` is the default. The result is capped at full volume. |
| `opts.haptic` | `false` plays the sound without its vibration. |
| `fx.music.start()` / `stop()` | "The game wants music" / "it does not". Music actually plays only while the Music setting is on, the app is in front and nothing has suspended it. It eases in and out (0.6 s / 0.25 s); `stop()` pauses, so a later `start()` continues the loop. |
| `fx.settings.*` | The three switches. `set` takes effect immediately and is saved with AsyncStorage (key `fx:settings:v1`). `get()` returns the same frozen object until something changes. |

`src/services/feedback.ts` (`feedback.tap/buy/reward/denied`, `initAudio`,
`setMuted`) still works but is deprecated: it forwards to `fx` with the
closest event (`reward()` plays `milestone`). Please move callers to the real
event names; that is the whole point of the catalogue.

## For the UI team

**Call it freely.** Rate limiting is built in: each event has a minimum
interval in the catalogue (`coin` 70 ms, `door` 1.2 s, ...), and any event
fired twice within 30 ms counts once. Fire `coin` for every coin and
`cook_done` for every station; you do not need your own throttling.

**The tap ladder and the combo.** `tap` has eight files that climb a scale.
Pass the combo level as `step`. Pizza Empire's combo has 5 levels
(`economy.combo.maxMultiplier`) and the ladder 8 rungs, so spread them with
the helper; then level 1 is the lowest note and the top level the highest,
whatever a game configures:

```ts
// in the store's tapHero, where `mult` is E.comboMultiplier(cfg, taps): 1, 2, ... maxMultiplier
const step = fx.ladderStep('tap', mult - 1, cfg.economy.combo.maxMultiplier);
fx.play('tap', { step });
if (leveledUp) fx.play(mult >= cfg.economy.combo.maxMultiplier ? 'combo_max' : 'combo_up');
```

If you would rather climb one note per tap, `fx.play('tap', { step: taps - 1 })`
works as well; steps past the top stay on the top note.

**Haptics are for the player's own actions.** Pass `{ haptic: false }` when an
event was not caused by a touch: a customer paying on their own
(`fx.play('cash', { haptic: false })`), anything the simulation does while the
player watches. The catalogue pattern is for the case where a finger did it.

**Settings screen.**

```tsx
import { fx } from '../services/fx';
import { useFxSettings } from '../services/fx/useFxSettings';

const { sound, music, haptics } = useFxSettings();
<Switch value={haptics} onValueChange={(v) => { fx.settings.set({ haptics: v }); fx.play('ui_tap'); }} />
```

`set` applies before it returns, so the `fx.play('ui_tap')` right after it
already follows the new setting: switching haptics on confirms itself with a
tick, switching sound off is silent.

**Full-screen ads** (for whoever owns `src/services/ads.ts`). On iOS an ad is
shown inside the app, so the app stays "active" and the game would keep
playing sounds and music under the ad. Wrap every full-screen ad:

```ts
ad.addAdEventListener(gma.AdEventType.OPENED, () => fx.suspend('ad'));
ad.addAdEventListener(gma.AdEventType.CLOSED, () => fx.resume('ad'));
```

`suspend` silences sounds, music and haptics without touching the settings;
`resume` brings the music back and re-applies the audio session (ad SDKs
change it). Reasons are independent: the game stays silent until every reason
that suspended it has resumed. On Android the ad is a separate activity, the
app goes to the background and all of this already happens by itself; the two
lines are still harmless there.

**Do not call expo-audio or expo-haptics directly.** The audio session is
configured once, in `fx/audio.ts`. A second `setAudioModeAsync` somewhere else
can silently turn "mixes with the player's music" into "stops the player's
music".

**In development** `fx` is on the console: `fx.play('prestige')` in the web
preview's devtools auditions any event. The service logs missing files once at
startup (`[fx] no sound file for: ...`).

## Sound files and how a game overrides one

- The default pack is `shared/sfx/`. Every game gets it.
- A game overrides a sound by putting a file with the **same base name** in
  `games/<id>/assets/sfx/`. The game's file wins, whatever its type
  (`games/x/assets/sfx/buy.mp3` replaces `shared/sfx/buy.wav`).
- Names come from the catalogue: `<key>.wav`, or `<key>_1.wav` ...
  `<key>_<n>.wav` when the entry has `files: n` (`tap_1` ... `tap_8`,
  `coin_1` ... `coin_3`). To replace a sound with several files, replace each
  file; the ones you leave out keep coming from the shared pack.
- Music is `music_main.m4a` in the game's folder, with the neutral fallback
  `shared/sfx/music_main.m4a`.
- Types: `.wav`, `.m4a`, `.mp3`. Prefer WAV for effects: it needs no decoder,
  so it starts fastest and costs nothing on Android. If one folder has the same
  name twice, wav beats m4a beats mp3.
- File names are lowercase letters, digits and `_`, with a lowercase
  extension. Anything else is left out of the bundle with a warning (Metro
  would not resolve `x.WAV`, and Android resource names cannot hold other
  characters). Empty files are skipped.
- Nothing is listed in `game.json`. `scripts/lib/games.js` scans the two
  folders and writes `gameSounds` (key to `require()`) into
  `src/generated/activeGame.ts`, next to `gameAssets`; `src/config/game.ts`
  re-exports it. **After adding or removing a file, run `npm run select`** (or
  restart `expo start`): Metro needs the `require()` to exist. Changing the
  contents of an existing file is picked up by Metro on its own.
- A missing file is not an error. That event is silent, its haptics still
  play, and a ladder falls back to the nearest rung that exists.

Adding an event: add a key to `FX` in `catalog.ts` (keys are never renamed or
removed), drop the file in `shared/sfx/`, run `npm run select`.

## What the player gets

| | iOS | Android | Web |
|---|---|---|---|
| Ring/silent switch | Obeyed: silent switch on means no game audio | Not tied to the ringer; the media volume rules, as in every Android game | n/a |
| Their own music or podcast | Keeps playing, the game mixes on top ("ambient" session) | Keeps playing, no audio focus is requested | Keeps playing |
| App in the background | Music pauses, sounds are cut, pending haptics dropped; music resumes on return. Also when the app is merely inactive on iOS (app switcher, purchase sheet, system dialogs) | same | Tab hidden: same |
| Haptics | Taptic Engine impact, selection and notification feedback | System haptic constants (see below) | None, on purpose |
| Before the first tap | n/a | n/a | Browsers refuse audio; music starts with the first tap or key press |

Game music cannot tell whether the player's own music is playing (expo-audio
does not expose that), so both are heard together until the player switches
Music off.

## How it works inside

```
src/services/fx/
  catalog.ts     the contract: every event, its files, volume, interval, haptic pattern
  index.ts       builds the real service (expo-audio, expo-haptics, AsyncStorage, AppState)
  core.ts        fx itself: settings, rate limit, variants, lifecycle, suspend
  audio.ts       the sound engine on expo-audio
  haptics.ts     pattern playback on expo-haptics, per-platform mapping
  mix.ts         preload order, voices per sound, catalogue -> files plan
  limiter.ts  variants.ts  pattern.ts  settings.ts  clock.ts     small pure pieces
  useFxSettings.ts   React hook for a settings screen
  testkit.ts  *.test.ts   fakes and unit tests
```

Only `index.ts` and `useFxSettings.ts` import React Native. Everything else
takes the platform, the clock and the native modules as arguments, which is
why the engine, the haptics mapping and the whole service run in vitest.

### Audio (verified against expo-audio 58.0.12's sources)

- **Session first.** `setAudioModeAsync({ interruptionMode: 'mixWithOthers',
  playsInSilentMode: <false on iOS, true on Android>, shouldPlayInBackground:
  false })` is awaited before any player may play. Unconfigured, iOS would use
  a session that silences other apps and Android would request audio focus. If
  it ever fails the engine stays silent and tries again on the next return to
  the foreground.
- **Players are a budget.** An expo-audio player is an AVQueuePlayer on iOS, a
  whole ExoPlayer (thread, media session, audio track) on Android and an
  `<audio>` element on web. Android allows an app about 40 audio tracks (14
  before Android 9), mobile Chrome 40 media elements. Budgets: iOS 64, Android
  28 (10 before Android 9), web 32, music included.
- **Preload order** (`mix.ts`): one player for every frequent sound first
  (catalogue `preload` ranks, read by `preloadFirst` in mix.ts: UI taps, the tap ladder, buy, coins, the scene), then
  their extra voices, then the rest of the catalogue until the budget minus a
  small reserve is used. Two players are created every 30 ms so startup never
  stalls. Sounds that did not fit get a player the first time they are played
  (that first play starts a few tens of milliseconds late, which is fine for a
  fanfare). When the budget is spent, the player that has been idle longest is
  re-used (`player.replace()`), rarely used sounds before frequent ones, and
  never one that is still sounding.
- **Parking.** When a file has played to its end the engine pauses and rewinds
  that player at once. The next play is then a bare `play()` with nothing to
  seek or buffer, which is what keeps taps tight. (Pause before seek matters:
  a finished ExoPlayer still "wants to play" and would restart on the seek.)
- **Voices** (catalogue `voices`, read by `voicesOf` in `mix.ts`): `tap` 2 per rung, `buy` 3, `bell` 3,
  `cash`, `cook_done`, `card_flip`, `reveal_common`, `reveal_rare` 2. A voice
  is added when a sound actually overlaps itself, then they take turns.
  `coin` has three files that already rotate. Every other sound has one voice
  and restarts when triggered again.
- **Music** is one looping player with its own volume and short fades. It is
  paused from JavaScript on every lifecycle change (expo-audio also pauses
  players natively in the background; pausing from JS as well keeps the two in
  step). If something outside the game stops it (headphones unplugged, an
  interruption that never hands playback back), the next game event starts it
  again.
- **Broken players.** A player that reports an error is released and rebuilt
  on the next play; a file that fails twice is switched off for the session.
- If the sound setting is off at launch, no effect players are created at all.

### Haptics (verified against expo-haptics 58.0.8's sources)

A catalogue pattern is a list of pulses and pauses, e.g. `['heavy', 80,
'success']`: a number is the time in ms from one pulse to the next.

- One pattern at a time: a new pattern cancels the rest of an older one.
- Global gap of 80 ms between pulses (`HAPTIC_MIN_GAP_MS`), so events that
  arrive in a burst never turn into a buzz. A pattern that arrives inside the
  gap starts late by the difference, unless it opens with a stronger pulse
  than the one just played (a button's tick followed at once by `buy` is one
  firm tap, not two).
- A lone tick (`select`, `soft`, `light`) is dropped inside the gap, and it
  never interrupts a longer pattern that is still playing. This is a
  deliberate refinement of "new cancels old": without it, a customer paying
  would cut the prestige pattern in half.

| Catalogue pulse | iOS | Android (system constant, needs API) | Android fallback |
|---|---|---|---|
| `select` | selection | `Segment_Tick` (34), else `Clock_Tick` | |
| `soft` | impact soft | `Clock_Tick` | |
| `light` | impact light | `Context_Click` | |
| `medium` | impact medium | `Virtual_Key` | |
| `rigid` | impact rigid | `Keyboard_Tap` | |
| `heavy` | impact heavy | `Long_Press` | |
| `success` | notification success | `Confirm` (30) | `notificationAsync` |
| `warning` | notification warning | `Reject` (30) | `notificationAsync` |
| `error` | notification error | `Reject` (30) | `notificationAsync` |

On Android the system constants (`performAndroidHapticsAsync`) are used
because expo-haptics' `impactAsync` and `notificationAsync` are raw 40 to 60 ms
`Vibrator` pulses there. The constants are crisp, tuned by each manufacturer,
and follow the user's system "touch feedback" setting. The table is `ANDROID`
in `haptics.ts`.

### Where to tune

| To change | Edit |
|---|---|
| A sound's loudness, its minimum interval, its vibration | `catalog.ts` (the entry's `volume`, `minIntervalMs`, `haptic`) |
| Which sounds load first, how many may overlap | `preload`, `voices` in `catalog.ts` (read by `mix.ts`) |
| Player budgets, fade times | constants at the top of `audio.ts` |
| Haptic gap, Android mapping | `HAPTIC_MIN_GAP_MS`, `ANDROID` in `haptics.ts` |

## Not verified here, and things for other owners

- **Real devices.** Everything above is unit-tested against fakes and checked
  against the library sources, and the bundle resolves the files. Latency,
  loudness balance, how the Android haptic constants feel on different phones,
  the silent switch, mixing with Spotify and behaviour around phone calls need
  a pass on an iPhone and at least one Android phone.
- **`app.config.ts` uses the `expo-audio` plugin with its defaults**, which add
  the iOS background audio mode, a microphone usage string, and on Android
  `RECORD_AUDIO` plus a foreground media service. This game needs none of
  them, and both stores ask questions about each. Suggested:
  `['expo-audio', { microphonePermission: false, recordAudioAndroid: false, enableBackgroundPlayback: false }]`.
- **`ads.ts`** should wrap full-screen ads in `fx.suspend('ad')` /
  `fx.resume('ad')` (snippet above).
- **`README.md`** still says sounds are `sfx_tap`, `sfx_buy`, `sfx_cash` and
  `music` entries in a game's `assets`. Those keys are no longer read.
- On Android every expo-audio player registers a media session. A headset's
  play/pause button may therefore reach the game instead of the music app
  while the game is in front. That is how expo-audio is built.

## Tests

`npx vitest run src/services/fx` covers the rate limiter, variant picker,
pattern scheduler (fake timers), the haptics mapping per platform, the
settings store, the catalogue-to-files plan, the audio engine against a fake
expo-audio (budget, voices, parking, preloading, failures, music) and the
whole service end to end. `discovery.test.ts` covers the file scan in
`scripts/lib/games.js`.
