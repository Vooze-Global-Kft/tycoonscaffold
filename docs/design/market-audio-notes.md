# Lantern Row (night-market): sound pack and music (spec section 6, package P5)

Status: second version, after an independent check. Every key of 6.2 renders from this game's own recipes: 26 effect keys in 33 files (`merge` is 8 files), plus two music loops. QA passes (0 failing), the merge ladder passes its own rules, the cross-key comparison passes against both other games on both of its legs (pitch-and-rhythm `joint` and the new `timbre` leg), and a fresh full render gives the same bytes as the files in `games/night-market/assets/sfx/`.

**Nobody has listened to any of it.** There is no speaker here. Everything below was measured (loudness, spectra, phone-speaker loss, envelopes, rows of twenty, similarity scores) and the waveform and spectrogram pictures were looked at; nothing was heard. What a person should listen for first is at the end, and it matters more than any number here.

## What changed in the second version, and why

The check of the first version found, and measurement confirmed:

1. `ui_open` and `ui_close` were Orbit Haulers' recipes without the pulse (same length, sweep, Q and tick; timbre 0.98 and 0.95 against Orbit's). Both are redesigned as paper gestures with no sweep (below).
2. The cross-key gate could not see noise sounds: its `joint` score needs pitch, and a re-seeded or one-semitone copy of a whoosh scores 0.0 to 0.5 on it. `compare.py --cross` now has a timbre leg (below), and fingerprint dimension 16 is now measured for noise sounds too.
3. The most played sounds (merges, moves, swaps) and the sheets were short band-pass noise whooshes, the same algorithm as the warm pack's whoosh: on the timbre leg 32 pairs against Pizza and 38 against Orbit scored 0.90 or more, 9 of them 0.95 or more. Every swept band-pass is gone from the pack (`steam`, `brush` and the swept `cloth` were removed; `paper_slide` was rebuilt). Now: 3 pairs against Pizza and 6 against Orbit at 0.90 or more, none at 0.93.
4. The merge tiers barely grew (every tier the same energy, tiers 5 to 8 nearly alike, the "growing whoomph" did not grow). Rebuilt; `render_night.py --ladder` now measures and checks it.
5. Smaller: the spring loop lost 5.8 dB on a phone (now 4.2); the summer loop was heard as D-centred (its D drone is now quieter under the G); the notes' haptic ceiling was wrong (the service floor is 120 ms, not 125); two catalogue haptics can never fire as the game is wired (requested, below).

Not changed: one file per merge tier (no variants: the shared player cannot pick a random variant of a ladder rung; requested), and `ui_tap` still maps to `ui_open` in `src/modes/merge/soundKeys.ts` (I could not edit that file; requested).

## Files

| file | what it is |
|---|---|
| `scripts/audio/recipes_night.py` | the instruments of this game and one recipe per sound file (33). Own registry `NIGHT_RECIPES`, own `NightCtx`, the merge ladder's constants `MP`, the event table `EVENTS` (volume, minimum interval, haptic, brief, voices: the source of `catalog.merge.ts`), `FILES`, `ROW_KEYS`. Imports `math`, `numpy` and `dsp` only. |
| `scripts/audio/night_music.py` | the two loops, "Lantern Dusk" (`music_main`, spring) and "Firefly Lane" (`music_summer`). Imports the machinery of `music.py` and the instruments of `recipes_night.py`; edits nothing in `music.py`. |
| `scripts/audio/render_night.py` | the entry point: `--check`, render, `--qa`, `--ladder`, `--accents`, `--rows DIR`, `--sheets DIR`, `--hash`, `--only`, `--no-music`, `--out`. |
| `scripts/audio/compare.py` | gained the cross-key mode (`--cross`, `--top`, `--calibrate-cross`, `--timbre-threshold`, a folder accepted in place of a game id). Without the new flags its output is byte-identical to before (checked, below). |
| `games/night-market/assets/sfx/` | 33 `.wav` and 2 `.m4a`, 2,720,018 bytes (budget 3,000,000). |
| `src/services/fx/catalog.merge.ts` | the catalogue, in the skeleton's shape (28 keys), filled from `EVENTS`; `render_night.py --check` fails when the two disagree. |

## How to check

```sh
python3 scripts/audio/render_night.py --check            # every key of 6.2 has a night recipe; none falls back; EVENTS = catalog.merge.ts
python3 scripts/audio/render_night.py                    # render everything into games/night-market/assets/sfx, then QA (about 4 min, most of it music)
python3 scripts/audio/render_night.py --qa               # QA of the folder only
python3 scripts/audio/render_night.py --ladder           # the merge ladder per tier, with its rules (exit 1 on a broken rule)
python3 scripts/audio/render_night.py --hash [--out D]   # sha256 per file: render twice and compare
python3 scripts/audio/render_night.py --rows DIR         # rows of twenty at catalogue volume, numbers + DIR/rows.png
python3 scripts/audio/render_night.py --sheets DIR       # contact sheets (waveform over spectrogram) per group, and the music
python3 scripts/audio/render_night.py --accents          # sound accents next to the haptic patterns
python3 scripts/audio/compare.py night-market pizza-empire --cross     # the gate of fingerprint dimension 16 (both legs)
python3 scripts/audio/compare.py night-market space-miner --cross
python3 scripts/audio/compare.py night-market pizza-empire --cross --calibrate-cross
python3 scripts/audio/night_music.py --tune music_main --levels        # per-stem levels and phone loss
```

Everything is deterministic: every random stream is seeded by its name (`dsp.rng_for('night', key, ...)`), and the AAC export uses the bit-exact flags of `music.py`.

## Character, as built (6.1)

Steam, paper, cloth, clay and charcoal; a street at dusk. Every instrument is built in `recipes_night.py` from `dsp` primitives. **There is no swept band-pass "whoosh" anywhere in the pack**: the noise sounds are shaped by formants, stick-slip friction, chuffs or grains instead, which is what makes them measure (and, I expect, sound) unlike the other games' whooshes.

- **Steam** (`pff`, `lid_clink`, `rattle_gate`, `sizzle`, together `merge_puff`): a steamer lid lifted by the steam. A clay lid "tok" at the attack (2 to 3 ms of noise through two wide clay resonances at 2.1 and 3.4 kHz: a colour, not a note, the same lid for every tier); the breath of the puff as noise through two vowel-like resonances (f1 0.4 to 1.1 kHz, f2 1.7 to 3.2 kHz) with a deep valley between them; a low whoomph; all of it let out in chuffs as the lid rattles on its seat (about 18 a second, each gap 7 % longer); then a sizzle tail of sparse crackle grains (water on the hot lid).
- **Friction** (`stickslip`, `cloth_rub`): a stick-slip amplitude gate (20 to 110 slips a second) on noise in a fixed band. Cloth is low (300 to 1,500 Hz) and slow (20 to 40 slips a second).
- **Paper**: `crinkle` (Poisson grains of noise, band-limited) and `crinkle_burst`; `paper_slide` (a dense stream of fibre micro-clicks in two fixed bands with a stick-slip; a rising slide fades the upper band in: no swept filter); `paper_tick`; `paper_fold`.
- **Felt stamp**: a dull low thud, a fibrous pat at 880 Hz, a press of fibres above 2 kHz; no ring.
- **Clay coin** (`clay_click`): four inharmonic modes damped in 3 to 9 ms plus a grit click.
- **Awning** (`cloth_flap`), **charcoal crackle** (sparse sub-millisecond pops over a faint ember hiss).
- **Small hand drum**: circular-membrane mode ratios with a pitch drop, a palm slap and a skin buzz; dum, tek, ghost.
- **Low free reed**, **bowed pad voice**, **the one bell** (`temple_bell`, only in `festival_done`), **street air** (`wind`, `flame`, `crowd`).

What is not in the pack (6.1): no pitched ladder (below), no plucked string, no wood knock, no register, no marimba, no pulse blip, no radio squelch, no bell on any money moment (`ticket_filled`, `coins`, `basket_sell` and `undo` have none). Nothing of `recipes.py`, `recipes_haul.py` or `packs.py` is imported; `render_night.py --check` fails if any of the three is in `sys.modules`.

### The merges: size and brightness, not a scale (`render_night.py --ladder`)

Tier k lets the lid rattle k times, on the same schedule for every tier, so a bigger merge is longer and has more chuffs. The low whoomph's level is a measured table (one value per tier, `MP['wtab']`), the formants open about 16 % (f1) and 10 % (f2) a tier, the upper formant's share and the sizzle grow, and each file is mastered 0.4 dB louder than the tier below (tier 1 at 2.4 dB under the pack target, tier 8 at 0.4 dB over).

| file | length | centroid | step | span above -20 dB | step | energy < 300 Hz | step | > 500 Hz | 2 to 5 kHz | loudness |
|---|---|---|---|---|---|---|---|---|---|---|
| merge_1 (never played) | 60 ms | 1,463 Hz | | 32 ms | | 51.3 dB | | 69 % | 26 % | -19.4 |
| merge_2 | 96 ms | 1,296 Hz | | 80 ms | | 49.2 dB | | 63 % | 20 % | -19.0 |
| merge_3 | 174 ms | 1,520 Hz | +17 % | 143 ms | +78 % | 50.6 dB | +1.3 | 73 % | 30 % | -18.6 |
| merge_4 | 266 ms | 1,831 Hz | +21 % | 205 ms | +44 % | 52.0 dB | +1.4 | 80 % | 42 % | -18.2 |
| merge_5 | 344 ms | 2,049 Hz | +12 % | 276 ms | +34 % | 54.8 dB | +2.8 | 76 % | 48 % | -17.8 |
| merge_6 | 444 ms | 2,231 Hz | +9 % | 363 ms | +31 % | 55.4 dB | +0.6 | 75 % | 54 % | -17.4 |
| merge_7 | 502 ms | 2,448 Hz | +10 % | 474 ms | +31 % | 56.6 dB | +1.1 | 72 % | 54 % | -17.0 |
| merge_8 | 648 ms | 2,734 Hz | +12 % | 601 ms | +27 % | 57.6 dB | +1.0 | 73 % | 55 % | -16.6 |

The rules `--ladder` checks over the tiers that sound in play (2 to 8): centroid at least 8 % up a tier, span at least 15 % longer, low body at least 0.5 dB more and at least 1 dB a tier on average (measured: +1.39), 0.4 dB louder, at least 55 % of the energy above 500 Hz and at most 60 % in 2 to 5 kHz. All pass, two of them narrowly (tier 5 to 6: centroid +9 %, low body +0.6 dB). The strongest partial of each tier's loudest 50 ms is 415, 522, 398, 635, 102, 100 and 81 Hz with 0 to 10 dB of prominence: no scale.

What the check asked for that I did not reach: "about 1.5 dB more low body a tier" (measured 1.39 on average, 0.6 to 2.8 a step) together with "centroid at least 8 % up a tier". The two pull against each other once every file is normalised to its loudness: a whoomph that grows 1.5 dB a tier after mastering drags the centroid down and the phone share under 55 % by tier 7 (measured on the way: 37 % above 500 Hz at tier 8). I kept the centroid, the span and the phone share as hard rules and the low body at about 1.4 dB.

The share in 2 to 5 kHz of the top tiers fell from 71 % to 54 %.

`merge_1` is the odd one out (brighter than tier 2, with more low energy, because its single chuff gets the most mastering gain); it is never played: `src/modes/merge/actions.ts` plays `step = tier made - 1`, and a tier 1 cannot be made.

### Keys, files and haptics (`catalog.merge.ts`)

| key | sound | ms | volume | min interval | voices | haptic |
|---|---|---|---|---|---|---|
| merge (8 files) | a steamer lid lifted: tok, chuffed two-formant pff, whoomph, sizzle; tier k rattles k times | 60 to 648 | 0.5 | 60 | 3 | light |
| lucky | a tier-4 merge, then a brighter, quicker-rattling puff at 90 ms, a paper flutter | 379 | 0.6 | 120 | 2 | light |
| move | a cloth rub: 360 to 1,150 Hz, 32 slips a second, slowing | 132 | 0.35 | 80 | 2 | none |
| swap | two cloth rubs crossing, 70 ms apart (24 and 36 slips a second) | 182 | 0.38 | 80 | 2 | none |
| return | a dull paper tap: a low pat (300 to 1,100 Hz) and a few fibre grains | 73 | 0.35 | 80 | 2 | none |
| drop | charcoal crackle, five sparse pops, faint ember | 131 | 0.26 | 300 | 2 | none |
| line_fill | paper tick and a fibre flick | 39 | 0.45 | 60 | 2 | light |
| ticket_filled | felt stamp at 0, paper fold from 120 ms | 430 | 0.7 | 120 | 2 | medium |
| coins | five clay clicks, a cloth pouch rubbed shut | 310 | 0.45 | 150 | 2 | none |
| basket_sell | straw crinkling in three clumps, a creak at each, the lining rubbed | 290 | 0.5 | 150 | 1 | light |
| undo | the same rustle reversed, a tick at 0 | 304 | 0.5 | 150 | 1 | light |
| shutter_open | cane slats catching on the roller (9 dull knocks, uneven), the cane rubbing, felt stop | 584 | 0.6 | | 1 | medium |
| stall_open | awning: three cloth snaps, the cloth rubbing to rest | 566 | 0.7 | | 1 | medium |
| upgrade | a steamer coming to the boil: rising formants, the lid rattling faster (14 to 32 a second), a sizzle | 139 | 0.5 | 100 | 3 | light |
| minder_hire | cloth bow: a slowing rub down, felt pat, a quicker rub up | 477 | 0.6 | | 1 | medium |
| discovery | brush bristles dragging (grains, 55 slips a second, fixed band), stamp at 160 ms | 247 | 0.6 | 200 | 1 | light, 160, success |
| lantern_lit | paper rustle, flame catching at 220 ms | 821 | 0.65 | | 1 | light, 220, success |
| parade_arrive | hand drum roll accelerating, dum and tek at 1.1 s | 1,508 | 0.6 | | 1 | none |
| giftbox_open | paper bag unfolding: crease, two slides, settle | 634 | 0.6 | | 1 | light |
| slot_reveal | felt pat and a 30 ms crinkle | 61 | 0.55 | 120 | 3 | light |
| festival_line | low reed D3, scoop into pitch, breath push at 0.3 s | 872 | 0.65 | | 1 | medium |
| festival_done | the one bell (D5) and a lantern swell | 2,202 | 0.8 | | 1 | success |
| season_close | wind from 0, reeds at 0.3 s swelling to 0.9 s, thinning into wind | 2,688 | 0.85 | | 1 | light, 300, medium, 600, success |
| ui_open | a sheet unfolded: fold click and a loud crinkle burst at 0, softer lower bursts at 55 and 115 ms | 148 | 0.4 | | 1 | none |
| ui_close | the sheet folded away: soft crinkles at 0 and 50 ms, the fold pressed shut at 95 ms | 155 | 0.35 | | 1 | none |
| ui_denied | a soft crumple: three dull clumps of long low grains, a felt pat | 159 | 0.5 | 300 | 1 | light |
| music_main | "Lantern Dusk", spring | 90 s | 0.35 | | | |
| music_summer | "Firefly Lane", summer | 90 s | 0.35 | | | |

**Haptics**: only what the finger did (6.2); none for drops, coins, the Parade, moves, swaps, returns or the sheets. Patterns with more than one pulse land on the sound's own accents (`--accents`: discovery 0/160 ms, lantern_lit 0/220, season_close 0/300/900) and pulse at most 6.2 times a second within a pattern; `season_close` has 3 pulses (6.2 allows 4). Across plays, `merge` and `line_fill` may be played every 60 ms, so their haptic rate is held only by the haptics service's floor, `HAPTIC_MIN_GAP_MS = 120` in `src/services/fx/haptics.ts`: that is 8.3 pulses a second, a hair over 6.2's 8 (the first notes said 125 ms; that was wrong). A merge that is also lucky and a discovery queues three patterns at once; the service floor spaces them. Requested: 125 ms, or a per-key haptic floor.

Two catalogue haptics cannot fire as the game is wired today: `lantern_lit` and `slot_reveal` are played only from passive events with `{haptic:false}` (`src/modes/merge/fx.ts`), which is right for passive events. `lantern_lit` vibrates only when the shared store plays `mission_complete` (mapped onto it). `slot_reveal`'s "light per slot" needs the gift sheet to play it once per slot from the player's tap, and `giftbox_open` has no caller at all: both requested of the screens package.

**Loudness tiers** on the pack target (-17 dB K-weighted, as both other packs): FREQUENT -2 for move, swap, return, line_fill, coins, upgrade and the sheets; the merges from -2.4 (tier 1) to +0.4 (tier 8) in 0.4 dB steps; QUIET -4 for drop; LOUD +1 for ticket_filled; BIG +2 for festival_done and season_close. Six short files sit at the peak ceiling 1.1 to 1.7 dB under their tier (a qa.py warning, allowed up to 3 dB): return, drop, line_fill, ticket_filled, slot_reveal, ui_open. `drop`'s volume was raised from 0.22 to 0.26 to make up its 1.7 dB. With the volumes, the rare peaks sit about 8 dB over the sounds heard twenty times a minute.

### Shared keys the store plays, mapped onto this table (`src/modes/merge/soundKeys.ts`)

`MERGE_SHARED_SOUNDS` (moved by the skeleton out of `mergeMode.ts`) maps `offline_collect → coins`, `purchase_success → upgrade`, `prestige → season_close`, `unlock → stall_open`, `mission_complete → lantern_lit`, `card_levelup → upgrade`, `daily_claim → coins`, `gems → coins`, `boost_start → upgrade`, `buy → upgrade`, `milestone → lantern_lit`, `story_open → ui_open`, `deal_popup → ui_open`, and `ui_tap → ui_open`, `ui_tab → ui_open`. **The last two should be `return`** (the plain 70 ms paper tap): every button press should not be the sheet's unfolding. Requested (requests.md, fix round); the file is listed as P5's in the build plan, but my step could not edit it. `hint`, `tap`, `bell` and the rest stay unmapped, which means silent. The till is silent (6.2).

## QA numbers (render_night.py, qa.py's measures and checks with this pack's tiers)

- **Failures: 0 of 35.** Every effect is 44.1 kHz mono 16-bit, peak at most -1.3 dBFS, within its tier's tolerance, faded at both ends, no DC, no clipped sample. Warnings: the six peak-limited files above, `merge_7` and `merge_8` at -26 and -25 dB above 8 kHz (the sizzle; qa.py warns above -28), and the two seams.
- **Phone speaker** (loudness lost through a 550 Hz high-pass): every effect -2.4 dB or better (worst `parade_arrive` -2.4, `festival_line` -2.3, `move` -1.7, `return` -1.8).
- **Rows of twenty** (`--rows`, at catalogue volume and voices, at the key's floor and at 100 ms; dip = median level drop inside each interval; build = the row's loudness over one shot):

  | key | every | dip | build | | key | every | dip | build |
  |---|---|---|---|---|---|---|---|---|
  | merge_2 | 60 / 100 ms | 66 / 64 dB | +5.8 / +3.8 | | lucky | 120 | 36 | +2.9 |
  | merge_3 | 60 / 100 | 64 / 45 | +5.8 / +3.5 | | drop | 300 | 90 | 0 |
  | merge_4 | 60 / 100 | 64 / 28 | +5.5 / +3.5 | | move | 80 / 100 | 12 / 17 | +4.4 / +3.5 |
  | merge_5 | 60 / 100 | 58 / 17 | +5.5 / +4.1 | | swap | 80 / 100 | 9 / 13 | +4.6 / +3.4 |
  | merge_6 | 60 / 100 | 57 / 18 | +5.4 / +3.9 | | return | 80 / 100 | 56 / 101 | +4.8 / +3.8 |
  | merge_7 | 60 / 100 | 55 / 21 | +5.0 / +3.9 | | line_fill | 60 / 100 | 101 / 101 | +5.9 / +4.2 |
  | merge_8 | 60 / 100 | 58 / 20 | +5.3 / +4.0 | | coins | 150 | 21 | +2.4 |
  | | | | | | upgrade | 100 | 73 | +4.2 |
  | | | | | | slot_reveal | 120 | 102 | +3.0 |

  Nothing clips (highest row peak -6.0 dBFS) and no row builds more than 6 dB over one shot. Read the merge dips with care: the chuffs leave real silences inside every merge, so a large dip says the row is not one continuous hiss (it was, at 5 to 8 dB, in the first version), not that every hit stands apart. In `rows.png` (looked at) the merges at 60 ms are separate hits, each cut by the next after three voices; at 100 ms merges 4 to 8 overlap into a dense chuffing texture. `move` and `swap` at 80 to 100 ms are a continuous cloth texture (dips 9 to 17 dB): their rubs are 130 and 180 ms long. A real hand does not move a good every 80 ms, but a person should listen to a fast drag sequence. Each row is twenty copies of one file: there are no variants (requested of the shared player).
- **Pictures looked at** (session scratch `market/sound/fix/pics/` and `fix/rows/`): `sheet_merges` (the chuffs and the sizzle tail are visible; tier k has k chuffs), `sheet_interface` (ui_open: three bursts loudest first; ui_close: two soft bursts and the pressed fold; ui_denied: three dull clumps, which look like ui_open's rhythm in a lower band), `rows`.

## Music

Two loops of 27 bars of 4/4 at 72 bpm: 90.00 s each, a whole number of AAC frames, encoded by `music.py`'s gapless export at 56 kb/s (about 58 kb/s measured).

| | music_main, "Lantern Dusk" (spring) | music_summer, "Firefly Lane" (summer) |
|---|---|---|
| key, drone | D dorian, reed drone on D2 (its fundamental thinned, harmonics 2 to 4 lifted) + A2 | G lydian (C#), reed drone on G2, with the D3 above it at 0.3 (was 0.55) so the centre is G |
| chords (3 bars each) | Dm9, C/D add9, Bbmaj7/D, Gm9/D, Fmaj7, Am7, Gm7, Bbmaj9/D, A7sus4; every note under C4 voiced an octave up, brighter bow | Gmaj9, A/G, Em9, D6/9, Bm7, A6sus, Gmaj7#11, Em7, Dsus4(#4) |
| hand drum | sixteenth grid; sparse, fuller in bars 10 to 18; strokes high-passed at 180 Hz, lower in the mix | triplet grid, a lilting 12/8 pattern, a busier bar every fourth |
| melody | none | the reed sings three short phrases (bars 7, 14, 22) |
| crowd | 8 distant talkers | 12 nearer, busier talkers; fireflies |
| measured | K-RMS -20.0 dB, peak -5.9 dBFS, **phone loss -4.2 dB** (was -5.8), 650 KB | K-RMS -20.1 dB, peak -4.5 dBFS, phone loss -3.0 dB, 651 KB |
| seam | level +2.8 dB (inside p99 2.5, max 5.0), spectrum 6.6 dB at p97, step 0.028 (inside p99.9 0.033): a qa.py warning | level +4.7 dB (p99.3 of the steps inside, max 8.6), spectrum at p94, step 0.012: warning |

The two differ in key, mode, chords, rhythm grid, drum pattern, a melody, the crowd and the fireflies, not by a filter (6.2). The drone is exactly periodic over the loop, so it passes the seam with no crossfade; the crowd is folded back with an equal-power crossfade; pad and drum tails fold through the seam by `music.mixdown`. Spring's phone loss: the check aimed at -4 dB or better; it is -4.2. What a phone loses there is the drum's open stroke and the pad's lowest voices; the drone is heard through its harmonics (stem loss -2.6 dB).

**Size.** Two loops of 90 s cannot be encoded at Orbit's 76 kb/s within the budget (about 860 KB each). At 56 kb/s each is about 650 KB; the folder is 2.72 MB (effects 1.42 MB, music 1.30 MB) under the 3.0 MB budget.

**Playing the summer loop.** The shared player starts only `music_main` (`src/services/fx/mix.ts MUSIC`), so `music_summer` is rendered and catalogued but not heard yet (requested earlier).

## The cross-key comparison (6.1, fingerprint dimension 16)

`compare.py GAME OTHER --cross` scores every sound of one game against every sound of the other (effects against effects, music against music) on two legs, lists the nearest pairs and each sound's nearest neighbour, and fails when a pair fails either leg:

- **joint** (the specification's measure, threshold 0.6): the peak, over every lag and transposition, of the smaller of the onset and chroma correlations at that alignment. It hears shared melody, harmony and rhythm. Its chroma is weighted by how tonal a frame is, so **it is blind to noise sounds**: a sound with no tonal frame scores 0.00 against everything (this pack's `line_fill`, `ui_denied`, `slot_reveal` and its own shifted copies do), and a re-seeded or one-semitone copy of Pizza's `toss` scores 0.00 to 0.53.
- **timbre** (new, threshold 0.93, effects only): a 32-band log spectrogram (100 Hz to 8 kHz, 10 ms hops, each sound normalised to its own loudest band-frame, a 60 dB floor), the cosine of the two at the best time lag (up to half the shorter sound), with the norms of the whole sounds so that a length mismatch costs. It hears band, envelope and length, not pitch class. It is the measure the check used to find the problem (it reproduces the checker's numbers exactly: `merge_2`~Pizza `ui_close` 0.953, `ui_open`~Orbit `ui_open` 0.983).

### Calibration (`--calibrate-cross`)

| pack | timbre: unrelated pairs, p99 / max | re-seeded copies, min / median | +-1 semitone copies, median | at 0.93: unrelated flagged | at 0.93: copies caught |
|---|---|---|---|---|---|
| Pizza Empire | 0.81 / 0.91 | 0.91 / 0.97 | 0.92 / 0.94 (-1 / +1) | 0 of 1,622 | 140 of 290 (48 %) |
| Orbit Haulers | 0.88 / 0.93 | 0.90 / 0.97 | 0.97 / 0.95 (-1 / +1) | 1 of 1,485 | 184 of 275 (67 %) |
| Lantern Row | 0.90 / 0.94 | 0.93 / 0.98 | 0.98 / 0.98 | 1 of 500 | 158 of 165 (96 %) |

0.93 is where no unrelated pair of Pizza's is flagged (one of Orbit's 1,485: `pod_arrive`~`rock_dry` 0.933; one of this pack's 500), while re-seeded and one-semitone copies of noise sounds score 0.93 to 0.99 and are caught. Copies of Pizza's tonal sounds shifted two semitones (bells, coins) fall to 0.52 to 0.6: the timbre leg is not meant for them; the joint leg catches those (Pizza: 296 of 306 tonal shifted copies at 0.6). The two legs together cover what each misses. Pairs from 0.90 to 0.93 are listed for a person to listen to.

The joint leg's calibration is unchanged from the first version (Pizza: unrelated p95 0.59, shifted copies caught 88 %; Orbit: p99 0.62, 85 %); 0.6 stays its threshold.

For reference, the two shipped games against each other (`compare.py pizza-empire space-miner --cross`): 51 pairs over 0.6 joint, and on the timbre leg 4 pairs at 0.93 or more (`ui_close`~`ui_close` 0.954, `rush_end`~`rock_dry` 0.944, `card_flip`~`ui_close` 0.936, `ui_open`~`ui_open` 0.933) and 6 at 0.90 or more. The third game passes a gate the first two would not.

### Result

| | pairs | joint: max, over 0.60 | timbre: max | timbre at 0.90 or more | at 0.93 or more |
|---|---|---|---|---|---|
| night-market vs pizza-empire | 1,916 (1,914 effects) | 0.59 (`merge_1`~`coin_1`), 0 | 0.915 (`festival_line`~`reveal_epic`) | 3 | 0 |
| night-market vs space-miner | 1,817 (1,815 effects) | 0.58 (`merge_1`~`credit_tick`, `drop`~`rig_upgrade`), 0 | 0.919 (`festival_line`~`freighter_tier`) | 6 | 0 |
| first version, for comparison | | 0.58 / 0.55, 0 | 0.983 (`ui_open`~Orbit `ui_open`) | 32 / 38 | 15 keys |

Pairs from 0.90 to 0.93 (listen to these): against Pizza `festival_line`~`reveal_epic` 0.915, `undo`~`story_open` 0.913, `basket_sell`~`story_open` 0.908; against Orbit `festival_line`~`freighter_tier` 0.919, `shutter_open`~`gems` 0.917, `return`~`fleet_upgrade` 0.915, `shutter_open`~`contract_met` 0.906, `lantern_lit`~`gems` 0.904, `season_close`~`launch_charge` 0.901. The merges now score at most 0.865 (`merge_2`~Pizza `card_flip`), the moves 0.857 and 0.879, the sheets 0.81 and 0.84. Music against music: joint at most 0.10.

Three joint scores sit close to the line (0.58 and 0.59: `merge_1` against one-note coins and ticks, `drop`~`rig_upgrade`): single onsets with a faint pitch. `merge_1` is never played. Within this pack, the closest unrelated pairs on timbre are `merge_3`~`ui_open` 0.937, `line_fill`~`merge_1` 0.917, `ui_denied`~`ui_open` 0.902.

**Fingerprint dimension 16** is now measured for tonal sounds (joint) and noise sounds (timbre) alike. Neither is a listening test.

The same-key mode, unchanged: `compare.py space-miner pizza-empire --json FILE` and `--nearest --calibrate --json FILE` give byte-identical stdout and JSON before and after the change, and the same JSON as the baseline saved before P5 touched the file (session scratch `market/sound/compare_baseline.json`, `market/sound/fix/base/`). The brief's form `--json` with no file name is a usage error, before and after.

## Things the specification left open (the reading I chose)

- **Keys.** The skeleton's catalogue shape was kept (6.2 names `merge_1` ... `merge_8` and `music_spring`): `merge` is one key with 8 files (`pick: 'ladder'`), and the spring loop is `music_main`, because the shared player knows only that key.
- **"60 ms apart at most", "300 ms"** read as the minimum interval between two plays (`minIntervalMs` 60 for merges, 300 for drop). The check suggested raising the merge floor to 100 ms if the tiers still smear; at 60 ms they no longer do (rows above), so it stays at 6.2's 60. Other floors: move, swap, return 80; line_fill 60; coins and the basket 150; upgrade 100; lucky, ticket_filled and slot_reveal 120; discovery 200.
- **"light or medium"** for the purchase row: medium for the shutter, the stall and the minder, light for the upgrade.
- **"A rising steam hiss"** (`upgrade`): a steamer coming to the boil, rising by its formants and its rattle speeding up, not by a swept band (a swept band measured 0.96 against Orbit's `ui_open`).
- **The festival bell** is on D5; the loops' homes are D (spring) and G (summer).
- **`coins`** is played by `offline_collect` (shared map) and wherever the screens land a ticket's lantern in the purse; `ticket_filled` carries no coin sound.

## Not done, or not good enough yet

- **Nobody has listened** (10.1 #10). Listen first for:
  1. **The merges in play.** They are now a rattling lid, "tok-chuff-chuff-chuff-sizzle", not a soft puff: does that read as steam at a food stall, or as a rattle or a motor? Is a tier-5 merge clearly bigger and brighter than a tier-2? Is the 650 ms tier 8 too long? Twenty merges of one tier in a row are identical copies: tiring?
  2. **`return`**, which should become every button press (once soundKeys.ts maps `ui_tap` to it): is a 70 ms dull paper tap pleasant hundreds of times a session? It is also the closest of the small sounds to another game (0.915 against Orbit's `fleet_upgrade`).
  3. **The sheets**: `ui_open` (three crinkle bursts) against `ui_denied` (three duller clumps): can the ear tell "opened" from "refused"?
  4. **`ticket_filled`**: the money moment has no bell and no chime by rule. Is a felt stamp and a paper fold satisfying enough?
  5. **`drop` under the music on a phone**: four gears each drop every 5 s; it plays at about -34.6 dB effective (K-weighted loudness plus volume) against the music's -29.1. Is the crackle heard at all, and is it a texture or a nag?
  6. **`move` and `swap` in a fast drag**: their rubs run together at 80 to 100 ms.
  7. **The music**: calm or dreary; the crowd as a crowd or as noise; the summer reed as a tune; 56 kb/s clean on the pad's high partials; is summer now heard in G?
  8. **The pairs from 0.90 to 0.93** listed above, side by side with the other games' sounds.
  9. **`festival_done`**: the bell should be the one bright, ringing moment of the game.
- **No variants** per merge tier (and per anything): the shared player cannot pick a random variant of a ladder rung. Requested: variants per rung or a playback-rate jitter.
- **`ui_tap` / `ui_tab` still map to `ui_open`** until `src/modes/merge/soundKeys.ts` changes (requested).
- **`giftbox_open` has no caller and `slot_reveal`'s haptic never fires** until the gift sheet plays them (requested).
- **Haptic floor** 120 ms (8.3 a second) instead of 125 (requested).
- **The summer loop is unplayed** until the shared player can pick it (requested earlier).
- **Low body growth** 1.39 dB a tier, not the 1.5 the check suggested (above, and why).
