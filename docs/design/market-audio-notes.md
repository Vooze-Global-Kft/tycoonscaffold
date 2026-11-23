# Lantern Row (night-market): sound pack and music (spec section 6, package P5)

Status: first version. Every key of 6.2 renders from this game's own recipes: 26 effect keys in 33 files (`merge` is 8 files), plus two music loops. QA passes, the cross-key comparison against both other games passes at the calibrated threshold, and two renders give the same bytes.

**Nobody has listened to any of it.** There is no speaker here. Everything below was measured (loudness, spectra, phone-speaker loss, envelopes, rows of twenty, similarity scores) and the waveform and spectrogram pictures were looked at; nothing was heard. What a person should listen for first is at the end.

## Files

| file | what it is |
|---|---|
| `scripts/audio/recipes_night.py` | the instruments of this game and one recipe per sound file (33). Own registry `NIGHT_RECIPES`, own `NightCtx`, the event table `EVENTS` (volume, minimum interval, haptic, brief, voices: the source of `catalog.merge.ts`), `FILES`, `ROW_KEYS`. Imports `dsp` only. |
| `scripts/audio/night_music.py` | the two loops, "Lantern Dusk" (`music_main`, spring) and "Firefly Lane" (`music_summer`). Imports the machinery of `music.py` (Loop, `loop_of`, `mixdown`, `master_loop`, `encode_m4a`, `decode`) and the instruments of `recipes_night.py`; edits nothing in `music.py`. |
| `scripts/audio/render_night.py` | the entry point: `--check`, render, `--qa`, `--accents`, `--rows DIR`, `--sheets DIR`, `--hash`, `--only`, `--no-music`, `--out`. |
| `scripts/audio/compare.py` | gained the cross-key mode (`--cross`, `--top`, `--calibrate-cross`, and a folder accepted in place of a game id). Without the new flags its output is byte-identical to before (checked, below). |
| `games/night-market/assets/sfx/` | 33 `.wav` and 2 `.m4a`, 2.63 MB (budget 3.0 MB). |
| `src/services/fx/catalog.merge.ts` | the catalogue, in the skeleton's shape (28 keys), filled from `EVENTS`. |

## How to check

```sh
python3 scripts/audio/render_night.py --check            # every key of 6.2 has a night recipe; none falls back; EVENTS = catalog.merge.ts
python3 scripts/audio/render_night.py                    # render everything into games/night-market/assets/sfx, then QA (about 2 min, most of it music)
python3 scripts/audio/render_night.py --qa               # QA of the folder only
python3 scripts/audio/render_night.py --hash             # sha256 per file: render twice and compare
python3 scripts/audio/render_night.py --rows DIR         # rows of twenty at catalogue volume, numbers + DIR/rows.png
python3 scripts/audio/render_night.py --sheets DIR       # contact sheets (waveform over spectrogram) per group, and the music
python3 scripts/audio/render_night.py --accents          # sound accents next to the haptic patterns
python3 scripts/audio/compare.py night-market pizza-empire --cross     # the gate of fingerprint dimension 16
python3 scripts/audio/compare.py night-market space-miner --cross
python3 scripts/audio/compare.py night-market pizza-empire --cross --calibrate-cross
python3 scripts/audio/night_music.py --tune music_summer --levels      # per-stem levels and phone loss
```

Everything is deterministic: every random stream is seeded by its name (`dsp.rng_for('night', key, ...)`), and the AAC export uses the bit-exact flags of `music.py`.

## Character, as built (6.1)

Steam, paper, cloth, clay and charcoal; a street at dusk. Every instrument is new, built in `recipes_night.py` from `dsp` primitives (noise, state-variable and biquad filters, envelopes, additive and modal voices):

- **Steam puff** (`steam`): band-passed noise whose centre jumps up and settles, a fine hiss above 2.4 kHz, random turbulence, a soft low whoomph. The band centre wanders randomly (about ±20 %), so no puff has a pitch.
- **Paper**: `crinkle` (Poisson grains of noise, band-limited), `paper_slide` (a noise band following a path, with fibre grain), `paper_tick`, `paper_fold`.
- **Felt stamp**: a dull low thud, a fibrous pat at 880 Hz, a press of fibres above 2 kHz; no ring.
- **Clay coin** (`clay_click`): four inharmonic modes damped in 3 to 9 ms plus a grit click: a "tok" with a colour, not a tone, and not a ring.
- **Cloth** (`cloth`, `cloth_flap`): pink-ish noise in a moving band with a slow friction grain.
- **Charcoal crackle**: a few sub-millisecond pops of random polarity over an ember hiss.
- **Small hand drum**: circular-membrane mode ratios (1, 1.59, 2.14, 2.30 ...) with a pitch drop, a palm slap and a skin buzz, in three strokes: dum, tek, ghost.
- **Low free reed**: additive, with formants at 650 and 1,500 Hz, odd harmonics a little stronger, a breath chiff, a vibrato that grows in, an optional scoop into pitch.
- **Bowed pad voice**: a saw-like additive spectrum under a soft low-pass, bow noise, slow vibrato and swell.
- **The one bell** (`temple_bell`): a struck modal bell (hum, minor-third and fifth partials, slow beating pairs), used only in `festival_done`.
- **Street air**: `wind`, `flame` (a fwump through an opening low-pass, then a burning hiss), `brush` (a bristle-grained band sliding along a stroke), `crowd` (talkers made of noise through vowel formants, gated in syllables and phrases, rendered at a quarter rate and band-limited to 250 to 2,800 Hz).

What is not in the pack (6.1): no pitched ladder (the eight merge files differ in size and brightness, see below), no plucked string, no wood knock, no register, no marimba, no pulse blip, no radio squelch, no bell on any money moment (`ticket_filled`, `coins`, `basket_sell` and `undo` have none). Nothing of `recipes.py`, `recipes_haul.py` or `packs.py` is imported; `render_night.py --check` fails if any of the three is in `sys.modules`.

### The merges: size and brightness, not a scale

| file | length | band centre peak | measured centroid | layers |
|---|---|---|---|---|
| merge_1 | 99 ms | 1.1 kHz | 2,445 Hz | one puff, attack 3 ms |
| merge_2 | 125 ms | 1.3 kHz | 2,603 Hz | |
| merge_3 | 155 ms | 1.7 kHz | 2,688 Hz | |
| merge_4 | 186 ms | 2.0 kHz | 2,978 Hz | a second puff 40 ms later |
| merge_5 | 222 ms | 2.4 kHz | 3,244 Hz | |
| merge_6 | 259 ms | 2.8 kHz | 3,208 Hz | |
| merge_7 | 295 ms | 3.0 kHz | 3,408 Hz | a third puff 85 ms later |
| merge_8 | 331 ms | 3.6 kHz | 3,460 Hz | and a charcoal sizzle under the tail |

The attack slows from 3 to 12 ms, the hissing tail lengthens, the low whoomph grows. Every file is mastered to the same loudness (the FREQUENT tier), so a bigger merge is longer and brighter, not louder. `src/modes/merge/actions.ts` plays `step = tier made - 1`, so `merge_k` is "a tier-k good was made" and `merge_1` is never heard (a tier 1 cannot be made). That is intended; it must not become a pitch ladder.

### Keys, files and haptics (`catalog.merge.ts`)

| key | sound | ms | volume | min interval | voices | haptic |
|---|---|---|---|---|---|---|
| merge (8 files) | steam puff by tier | 99 to 331 | 0.5 | 60 | 3 | light |
| lucky | a tier-4 puff, a brighter puff at 90 ms, a paper flutter | 354 | 0.6 | 120 | 2 | light |
| move | cloth slide | 91 | 0.35 | 80 | 2 | none |
| swap | two cloth slides crossing, 55 ms apart | 158 | 0.38 | 80 | 2 | none |
| return | dull paper tap and a short settle | 82 | 0.35 | 80 | 2 | none |
| drop | charcoal crackle, quiet | 99 | 0.22 | 300 | 2 | none |
| line_fill | paper tick and pen flick | 53 | 0.45 | 60 | 2 | light |
| ticket_filled | felt stamp at 0, paper fold from 120 ms | 436 | 0.7 | 120 | 2 | medium |
| coins | five clay clicks, a cloth pouch closing | 312 | 0.45 | 150 | 2 | none |
| basket_sell | basket rustle with creaks | 297 | 0.5 | 150 | 1 | light |
| undo | the same rustle reversed, a tick at 0 | 299 | 0.5 | 150 | 1 | light |
| shutter_open | cane shutter rolling up: 11 slat clicks, rumble, felt stop | 511 | 0.6 | | 1 | medium |
| stall_open | awning: three cloth snaps, the cloth settling | 575 | 0.7 | | 1 | medium |
| upgrade | steam hiss rising 0.8 to 3.6 kHz in 90 ms, cut by a puff | 121 | 0.5 | 100 | 3 | light |
| minder_hire | cloth bow: swish down, felt pat, swish up | 499 | 0.6 | | 1 | medium |
| discovery | brush stroke, stamp at 160 ms | 224 | 0.6 | 200 | 1 | light, 160, success |
| lantern_lit | paper rustle, flame catching at 220 ms | 821 | 0.65 | | 1 | light, 220, success |
| parade_arrive | hand drum roll accelerating, dum and tek at 1.1 s | 1,508 | 0.6 | | 1 | none |
| giftbox_open | paper bag unfolding: crease, two slides, settle | 634 | 0.6 | | 1 | light |
| slot_reveal | crinkle and a felt pat | 120 | 0.55 | 120 | 3 | light |
| festival_line | low reed D3, scoop into pitch, breath push at 0.3 s | 872 | 0.65 | | 1 | medium |
| festival_done | the one bell (D5) and a lantern swell (reeds, bowed fifth, warm air) | 2,202 | 0.8 | | 1 | success |
| season_close | wind from 0, reeds at 0.3 s swelling to 0.9 s, thinning into wind | 2,688 | 0.85 | | 1 | light, 300, medium, 600, success |
| ui_open | paper slide out | 124 | 0.4 | | 1 | none |
| ui_close | paper slide back, soft pat | 117 | 0.35 | | 1 | none |
| ui_denied | soft crumple | 156 | 0.5 | 300 | 1 | light |
| music_main | "Lantern Dusk", spring | 90 s | 0.35 | | | |
| music_summer | "Firefly Lane", summer | 90 s | 0.35 | | | |

Haptics: only what the finger did (6.2). None for drops, coins, the Parade, moves, swaps, returns or the paper slides of a sheet. Every haptic file speaks within 3 ms of its start except `giftbox_open` and `ui_open` (5.4 and 5.6 ms) and `undo` (15.8 ms: its reversed rustle grows in; the tick at 0 is what the pulse lands on); qa.py warns from 25 ms. Patterns with more than one pulse land on the sound's own accents (`--accents`) and are at most 6.2 pulses a second (discovery, 160 ms apart), under the service's ceiling of 8 (125 ms). `season_close` has 3 pulses (6.2 allows 4). The skeleton's first draft had `minder_hire` light and `season_close` as four pulses 200 ms apart that matched nothing in the sound; both changed.

Loudness tiers on the pack target (-17 dB K-weighted, as both other packs): FREQUENT -2 for the merges, move, swap, return, line_fill, coins, upgrade and the two paper slides; QUIET -4 for drop; LOUD +1 for ticket_filled; BIG +2 for festival_done and season_close. With the volumes, the rare peaks sit about 8 dB over the sounds heard twenty times a minute (audio-review.md item 5 asked for 5 to 8).

### Shared keys the store plays, mapped onto this table (for `src/modes/merge` and `src/engine/mergeMode.ts`)

The skeleton's `MERGE_SHARED_SOUNDS` maps `offline_collect → coins`, `purchase_success → upgrade`, `prestige → season_close`, `unlock → stall_open`, `mission_complete → lantern_lit`, `card_levelup → upgrade`, `daily_claim → coins`, `ui_tap → ui_open`, `ui_tab → ui_open`. All targets exist. Requested in addition (requests.md), for the other shared keys the merge bundle can reach (store.ts, feedback.ts, Modals.tsx): `gems → coins`, `boost_start → upgrade`, `buy → upgrade`, `milestone → lantern_lit`, `story_open → ui_open`, `deal_popup → ui_open`; optionally `ui_tap → return` (a dull paper tap) so a Settings toggle does not sound like a sheet opening. `hint`, `tap`, `bell` and the rest stay unmapped, which means silent. The till is silent (6.2).

## QA numbers (render_night.py, qa.py's measures and checks with this pack's tiers)

- **Failures: 0 of 35.** Every effect is 44.1 kHz mono 16-bit, peak at most -1.3 dBFS, within 1 dB of its tier target, faded at both ends, no DC, no clipped sample.
- **Above 8 kHz:** every effect under -28 dB (the noise instruments go through a 5.6 kHz 4th-order ceiling; the first render had seven merges between -17 and -23 dB, which failed qa.py's -20 dB rule).
- **Phone speaker** (loudness lost through a 550 Hz high-pass): every effect better than -2.5 dB; worst `parade_arrive` -2.4, `festival_line` -2.3, `shutter_open` -1.7, `festival_done` -1.5. Fixed on the way: the first hand drum lost 7.7 dB (its strokes were mostly under 400 Hz: now higher strokes with a slap and a skin buzz), the first bell on A4 lost 4.2 dB (now D5 with a quieter hum).
- **Rows of twenty** (`--rows`, at catalogue volume and voices, the key's floor and 100 ms; the dip is the median level drop between hits; build is the row's loudness over one shot):

  | key | every | dip | build | | key | every | dip | build |
  |---|---|---|---|---|---|---|---|---|
  | merge_1 | 60 / 100 ms | 13 / 47 dB | +5.9 / +3.7 | | drop | 300 ms | 90 dB | 0 |
  | merge_2 | 60 / 100 | 14 / 22 | +5.7 / +3.5 | | move | 80 / 100 | 14 / 71 | +4.5 / +3.5 |
  | merge_3 | 60 / 100 | 8 / 18 | +5.6 / +3.5 | | swap | 80 / 100 | 9 / 9 | +4.4 / +3.4 |
  | merge_4 | 60 / 100 | 7 / 15 | +5.6 / +3.4 | | return | 80 / 100 | 22 / 99 | +4.6 / +3.7 |
  | merge_5 | 60 / 100 | 8 / 14 | +5.2 / +3.5 | | line_fill | 60 / 100 | 51 / 101 | +5.9 / +3.7 |
  | merge_6 | 60 / 100 | 5 / 11 | +5.4 / +3.3 | | coins | 150 | 22 | +3.2 |
  | merge_7 | 60 / 100 | 6 / 9 | +5.5 / +3.5 | | upgrade | 100 | 16 | +3.5 |
  | merge_8 | 60 / 100 | 6 / 8 | +5.4 / +3.4 | | slot_reveal | 120 | 27 | +2.9 |

  Nothing clips in any row (highest row peak -6.5 dBFS) and no row builds more than 6 dB over one shot. The honest part: at the 60 ms floor, merges 4 to 8 run together into one moving hiss (dips of 5 to 8 dB), and at 100 ms merges 7 and 8 still do. A run of big merges that fast is not a realistic case (two tier-7 goods are needed for one tier 8; a hand drags at most about three merges a second), and at 300 ms every merge stands alone. `upgrade` at 80 ms also became one hiss (dip 7.5 dB), so it was shortened to 121 ms and its floor raised to 100 ms (dip 16 dB). The picture was looked at (`rows.png`).
- **Pictures looked at** (session scratch `market/sound/pics/`, rebuilt by `--sheets DIR` and `--rows DIR`): `sheet_merges`, `sheet_hand`, `sheet_purchases`, `sheet_events`, `sheet_interface`, `sheet_music`, `rows`. Fixed after looking: the merges of tiers 5 to 8 were flat slabs of noise with no "pff" (now a peak and a falling tail), the upgrade smeared in a row.

## Music

Two loops of 27 bars of 4/4 at 72 bpm: 90.00 s each, a whole number of AAC frames, encoded by `music.py`'s gapless export at 56 kb/s (about 58 kb/s measured).

| | music_main, "Lantern Dusk" (spring) | music_summer, "Firefly Lane" (summer) |
|---|---|---|
| key, drone | D dorian, reed drone on D2 + A2 | G lydian (C#), reed drone on G2 + D3 |
| chords (3 bars each) | Dm9, C/D add9, Bbmaj7/D, Gm9/D, Fmaj7, Am7, Gm7, Bbmaj9/D, A7sus4 | Gmaj9, A/G, Em9, D6/9, Bm7, A6sus, Gmaj7#11, Em7, Dsus4(#4) |
| hand drum | sixteenth grid; sparse (dum, tek, ghost), fuller in bars 10 to 18 | triplet grid, a lilting 12/8 pattern, a busier bar every fourth |
| melody | none | the reed sings three short phrases (bars 7, 14, 22) |
| crowd | 8 distant talkers | 12 nearer, busier talkers |
| extra | | fireflies: soft high grain shimmers |
| measured | K-RMS -20.1 dB, peak -4.1 dBFS, phone loss -5.8 dB, 650 KB | K-RMS -20.1 dB, peak -4.1 dBFS, phone loss -2.8 dB, 652 KB |
| seam | level +4.4 dB (a downbeat: p99.2 of the steps inside, the largest inside 7.1), spectrum at p93, step 0.003 (p99.9 inside 0.031): a qa.py warning, not a fail | level +4.5 dB (p99.3, largest inside 8.3), spectrum at p94, step 0.011 (p99.9 inside 0.044): warning |

The two differ in key, mode, chords, rhythm grid, drum pattern, a melody, the crowd and the fireflies, not by a filter (6.2). The drone is exactly periodic over the loop (frequency, vibrato and breathing rounded to whole cycles per loop, noise filtered circularly), so it passes the seam with no crossfade; the crowd is rendered 3 s longer and folded back with an equal-power crossfade; pad and drum tails fold through the seam by `music.mixdown`. The seam warnings are the drum's downbeat after the last bar's decay, the same kind of step Orbit Haulers accepted (+4.2 dB).

Stem levels (`--levels`, K-RMS at mix level / phone loss): spring pad about -27 each (-7, -6.6: the pad sits in D3 to E4), drone -27 (-2.6), drum about -32 after a raise from -39, crowd -49 and -51 (distant on purpose). Summer pad -28 (-5), drone -28 (-2.5), drum -32 (-5.9), song about -29, crowd -48, fireflies about -53. Spring's mix loses 5.8 dB on a phone, just inside qa.py's -6 dB music warning: on a phone it will be mostly the reed and the drum.

**Size.** Two loops of 90 s cannot be encoded at Orbit's 76 kb/s within the budget (about 860 KB each, over qa.py's 700 KB per loop and, with the effects, over 3 MB). At 56 kb/s each is about 650 KB; the folder is 2.63 MB (effects 1.33 MB, music 1.30 MB) under the 3.0 MB budget. A person should judge whether 56 kb/s AAC is clean enough on the pad's high partials; at 64 kb/s both loops would be about 740 KB each (folder 2.8 MB, still under 3 MB but over qa.py's 700 KB per loop).

**Playing the summer loop.** The shared player starts only `music_main` (`src/services/fx/mix.ts MUSIC`), so `music_summer` is rendered and catalogued but not heard yet. Requested (requests.md): resolve the music key through `modeSounds.key('music_main')`, so the merge entry can map it to `music_summer` in summer and winter seasons (spring and autumn keep `music_main`; 6.2 "tinted for autumn and winter in v1").

## The cross-key comparison (6.1, fingerprint dimension 16)

`compare.py GAME OTHER --cross` scores every sound of one game against every sound of the other (effects against effects, music against music), with the joint score of the same-key mode: the peak, over every lag and transposition, of the smaller of the onset and chroma correlations at that alignment. It lists the nearest pairs and each sound's nearest neighbour, and fails when any pair is over the threshold.

### Calibration (`--calibrate-cross`)

As the second game calibrated the same-key rule, on the packs' own files:
- **U**: every pair of different sounds within one pack (what unrelated sounds score);
- **P**: every sound against copies of itself pitch-shifted by -4, -2, -1, +1, +2 and +4 semitones with the same length and timing (a phase vocoder, then resampling; what "the same sound, moved" scores).

| pack | U median | U p95 | U p99 | U max | U over 0.6 | P median | P caught at 0.6 | P of tonal sounds caught at 0.6 |
|---|---|---|---|---|---|---|---|---|
| Pizza Empire | 0.30 | 0.59 | 0.79 | 0.87 | 5 % | 0.89 | 305 of 348 (88 %) | 296 of 306 |
| Orbit Haulers | 0.21 | 0.48 | 0.62 | 0.82 | 1 % | 0.84 | 282 of 330 (85 %) | 249 of 270 |
| Lantern Row | 0.10 | 0.32 | 0.42 | 0.63 | 1 of 500 | 0.19 | 22 of 198 (11 %) | 17 of 24 |

At 0.4 Pizza's unrelated pairs are flagged 27 % of the time, at 0.5 12 %, at 0.6 5 %, at 0.7 2 %; copies are caught 95, 91, 88 and 84 %. **0.6 stays the threshold**: it is where unrelated pairs of the two tonal packs sit at their p95 to p99 while 85 to 88 % of shifted copies (96 % of the tonal ones in Pizza) are still caught. For reference, the two shipped games against each other in this mode (`compare.py space-miner pizza-empire --cross`) have 51 pairs over 0.6 (max 0.80, `credit_tick` against `tap_8`): the cross-key mode is stricter than the same-key one, as it should be, and the first two games would not pass it.

**Where the measure is blind.** Its pitch half (chroma) is weighted by how tonal a frame is, so for sounds of noise (most of this pack: steam, paper, cloth, charcoal) it says little: a pitch-shifted copy of this pack's sounds scores a median 0.19 and is caught only 11 % of the time. For those sounds, passing the check means "no shared melody or harmony", not "a different timbre". The other side of the same weakness: a noise sound with a few faintly tonal frames can still reach 0.6 against a one-note tick, because the chroma is normalised by its own (tiny) weight. That is what the first run found (below).

### Result

| | pairs | max joint | p99 | over 0.60 |
|---|---|---|---|---|
| night-market vs pizza-empire | 1,916 | 0.58 (`merge_3` ~ `ui_close`, `festival_line` ~ `chest_open`) | 0.40 | 0 |
| night-market vs space-miner | 1,817 | 0.55 (`merge_3` ~ `module_remove`) | 0.42 | 0 |

The first run, on the first recipes (before any polish), had 6 pairs over 0.6 against Pizza and 4 against Orbit, all of them a single onset with a faint pitch: `return` against Pizza's `ui_tab` (0.65) and Orbit's `hold_tick` (0.70), `merge_4` against Pizza's `ui_tap` and `tap_6` to `tap_8` (0.60 to 0.65), `merge_8` and `merge_4` against Orbit's `ui_close` (0.67, 0.65) and `credit_tick` (0.63), `festival_line` against Pizza's `chest_open` (0.62). Fixed in the recipes: the steam band's centre now wanders (no puff keeps a pitch), the extra puffs are wider (Q 0.65), `return` became a wide-band tap with a short paper settle (no resonance), `festival_line` a single reed with a scoop into pitch and a second breath push (no fifth). Music against music: at most 0.10. The closest pairs left (0.55 to 0.58) are two noise sounds whose chroma is a few faint frames: the blind spot above, not a shared gesture. Within this pack the one unrelated pair over 0.6 is `line_fill` ~ `merge_1` (0.63, two single noise onsets).

The same-key mode, unchanged: night-market against pizza-empire shares 5 keys (`music_main`, `ui_open`, `ui_close`, `ui_denied`, `upgrade`; highest joint 0.36, `ui_open`), against space-miner 4 (highest 0.29). `compare.py space-miner pizza-empire --json FILE` and `--nearest --calibrate --json FILE` give byte-identical stdout and JSON before and after the change (saved in the session scratch `market/sound/compare_baseline*`).

## Things the specification left open (the reading I chose)

- **Keys.** The skeleton's catalogue shape was kept (6.2 names `merge_1` ... `merge_8` and `music_spring`): `merge` is one key with 8 files (`pick: 'ladder'`), and the spring loop is `music_main`, because the shared player knows only that key.
- **"60 ms apart at most", "300 ms"** read as the minimum interval between two plays (`minIntervalMs` 60 for merges, 300 for drop). The other floors are mine: move, swap, return 80; line_fill 60; coins and the basket 150; upgrade 100; lucky, ticket_filled and slot_reveal 120; discovery 200.
- **"light or medium"** for the purchase row: medium for the shutter, the stall and the minder (rare, chosen), light for the upgrade (repeatable, several a second).
- **The festival bell** is on D5, the loops' home is D (spring) and G (summer): the bell sits in both.
- **`coins`** is played by `offline_collect` (shared map) and wherever the screens land a ticket's lantern in the purse; `ticket_filled` itself carries no coin sound, so the paid moment is a stamp and a fold.

## Not done, or not good enough yet

- **Nobody has listened** (10.1 #10). Listen first for:
  1. The merges in play: does a tier-5 merge sound bigger and brighter than a tier-2 one, and pleasant at the speed a hand really merges? Is the steam too hissy or too "white noise" on a phone?
  2. `ticket_filled`: the money moment has no bell and no chime by rule. Is a felt stamp and a paper fold satisfying enough to be the game's reward sound?
  3. `drop` against the music: four gears each drop every 5 s; is the crackle a texture or a nag?
  4. The music: is the D dorian pad over the drone calm or dreary; does the crowd read as a crowd or as noise; does the summer reed song sound like a tune; is 56 kb/s clean?
  5. The paper family (`ui_open`, `ui_close`, `line_fill`, `slot_reveal`, `giftbox_open`): do they tell apart, and are they too alike to Pizza's whooshes where the measure is blind (noise has no chroma)?
  6. `festival_done`: the bell should be the one bright, ringing moment of the game.
- **Fast runs of big merges smear** (above): accepted, not fixed.
- **The summer loop is unplayed** until the shared player can pick it (requested).
- **Similarity of noise sounds is not measured** by the gate (blind spot above); only a listening check can say that the paper slides are not Pizza's whooshes.
