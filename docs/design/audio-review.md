# Audio review: warm pack, neutral loop, trattoria loop

Reviewer: a game audio pass over the synthesised pack, done by measurement
because nobody could listen. Inputs: `src/services/fx/catalog.ts` (the
briefs), `scripts/audio/*.py`, `docs/design/audio-notes.md`, `qa.py` output,
`docs/design/audio-qa.png`, plus my own numpy checks (kept in the session
scratch folder under `audio/review/`: `fx_check.py`, `repeat.py`,
`variants.py`, `epic.py`, `blip.py`, `music_check.py`, `stem_chroma.py`).
Every "measured" figure for a proposed change below comes from rendering
that change in scratch with the real pack code. No project file was edited.

**Measures used, beyond qa.py**

- **Phone loss.** The file's loudness after a 2nd-order 550 Hz high-pass (a rough model of a phone's built-in speaker), compared with its full-range loudness. 0 dB means nothing is lost; under -6 dB the sound mostly disappears on a phone.
- **Low share.** The fraction of the file's energy below 400 Hz.
- **Envelope.** Attack is the time to the peak of a 2 ms RMS envelope. T-20 is the time from that peak until the level is 20 dB below it.
- **Similarity.** The correlation of the mean log-band spectra (32 bands from 100 Hz to 16 kHz) of two files.
- **Chords.** Chroma per bar from the decoded `.m4a`, matched to triad templates, with bass-band chroma for the root.

## Verdict in one paragraph

The pack is clean and well built. Nothing clips, nothing has DC, every file
has a fast onset, the tap ladder is exactly in tune, and the two
compositions are real, coherent tunes with a clear phrase structure. The real
problems are not in the measurements QA makes. They are in **how it will
sound on a phone speaker** and **in the relative mix**:

- Several low sounds (`ui_denied` above all) vanish on a phone.
- Both music loops are mixed bass-first, which a phone throws away.
- Every effect is normalised to the same loudness, so big moments are barely louder than the sound you hear 20 times a minute.
- Many haptic patterns fire 100 to 600 ms before the musical hit they belong to.

On top of that, `catalog.ts` currently cannot be parsed (item 1), so nothing can be regenerated until that is fixed.

## Fixes, most important first

1. **BLOCKER: `src/services/fx/catalog.ts` has unresolved merge-conflict markers.**
   - **What is wrong:** markers sit at lines 12-19, 51-55, 65-69 and 90-119 (HEAD against `origin/sim-mode-engine`). Both `make_sfx.py` and `qa.py` stop with "could not parse the catalogue". When qa.py cannot read the catalogue it no longer knows the blips are measured as a stream, and it FAILS them at -6.0 dB (seen on the synth pack).
   - **Fix:** whoever owns the merge must resolve it. Both sides have the same 50 keys, so file coverage does not change.
   - **When resolving, keep HEAD's "no haptic"** for `cash`, `bonus_appear`, `deal_popup` and `rush_end`. The incoming side gives them `light`/`soft`, which breaks the catalogue's own rule: no vibration for things the simulation does (a guest paying, a bonus appearing, a timer ending) or for offers.
   - **Take the incoming side** for `chest_shake` (`['light', 50, 'light', 50, 'light', 50, 'medium']`, which lands on the knocks at 0/55/105/150 ms) and for `reveal_legendary` (`['heavy', 80, 'heavy', 80, 'heavy', 160, 'success']`, which lands on the pick-ups at 0/80/160 ms and the hit at 320 ms).
   - **Also change `qa.py`:** take `stream_ms` from `recipes.RECIPES[key].stream_ms` instead of from the catalogue, so QA does not fail blips whenever the catalogue is unreadable.

2. **`ui_denied` (recipe `ui_denied`) is inaudible on a phone.**
   - **Measured:** phone loss -17.0 dB, power centroid 187 Hz, 98 % of its energy below 400 Hz. The knocks are on G3 (196 Hz) and E3 (165 Hz) under a 1500 Hz low-pass. In the synth pack the loss is -18.8 dB. This is the "you can't afford it" feedback, so the player would get only the `warning` buzz.
   - **Change:** move the knocks to `G4` and `E4`, with `tone=0.6`. Add a second knock an octave above each one: `p.knock(p.hz(o) * 2, 0.9 * v, tau=0.03, tone=0.3)` at the same times. Raise the final `lowpass` from 1500 to 2800 Hz.
   - **Result, measured:** phone loss -3.8 dB, centroid 516 Hz. It is still a dull minor-third "uh-uh" and has no buzz.

3. **Trattoria loop mix (`music.py`, `trattoria()` strips): the bass carries the loudness and a phone discards it.**
   - **Stem K-RMS (dry, at mix level):**
     - bass -22.2 dB, which loses 14.1 dB on a phone
     - mandolin -26.5 dB
     - mandolin 2 -34.0 dB
     - accordion -34.7 dB, 8 dB under the lead
     - percussion -43.1 dB
   - **Why it matters:**
     - The loudness target (-20 K-RMS) is set mostly by a bass line a phone cannot play, and the whole mix loses 4.4 dB on a phone.
     - The accordion is the instrument that says "Italian", and it is barely there.
   - **Change the strips:**
     - `bass` gain 0.85 → 0.50
     - `accordion` gain 0.70 → 1.25
     - `percussion` gain 0.22 → 0.35
   - **Change `bass_note()`:** raise the low-pass from 1200 to 2000 Hz and add `0.25 * np.sin(2 * TAU * f * t) * perc(n, 6.0, 0.12)`, so the line is heard through its harmonics.
   - **Targets after re-render:** mandolin about 3 dB above the accordion, bass level with or just under the mandolin, phone loss of the mix better than -2.5 dB. **Do not change the score**: melody, chords, form and voicings are good (see "Leave alone").

4. **Neutral loop mix (`music.py`, `neutral()` strips): the same bass-first problem, and two stems nobody can hear.**
   - **Stem K-RMS:**
     - bass -24.1 dB, the loudest stem, which loses 23.4 dB on a phone
     - pad -25.6 dB
     - lead -26.1 dB
     - kalimba -33.4 dB
     - thump -43.8 dB, which loses 28.5 dB on a phone
     - shaker -57.4 dB, 31 dB under the lead
     - wood -58.6 dB
   - **Change the strips:**
     - `bass` 0.80 → 0.45, and in the bass loop `bright=0.7` → `1.0` with the bass `lowpass` 900 → 1600 Hz
     - `pad` 0.42 → 0.32
     - `shaker` 0.11 → 0.45
     - `wood` 0.16 → 0.50
     - `thump` 0.50 → 0.30
   - **Target:** lead the loudest stem; shaker and wood 15 to 20 dB under it, not 31 dB.

5. **The loudness tiers are too flat. Every effect is mastered to the same -17 dB, so the gap between big and routine sounds comes only from catalogue `volume`.**
   - **Measured:** effective level of `buy` -20.7 dB, `tap` -21.4 dB, `prestige` -17.9 dB, `reveal_legendary` -17.4 dB. The biggest moment in the game is 2.8 dB louder than the sound heard most. Polished idle games keep 5 to 8 dB between them.
   - **Change in `catalog.ts` (volumes may be tuned):**
     - `tap` 0.60 → 0.45
     - `buy` 0.65 → 0.50
     - `coin` 0.45 → 0.35
     - `ui_tap` 0.50 → 0.40
     - `card_flip` 0.55 → 0.45
   - Leave the big moments as they are. That gives about 5 dB of headroom.
   - **Alternative inside `scripts/audio`:** add a `loud_db` argument to `@recipe` (default 0) that offsets `target_db` in `dsp.master`. Then use +2 dB for `prestige`, `reveal_legendary` and `unlock_venue`, and -2 dB for `tap`, `buy`, `coin` and `ui_tap`.

6. **Haptic patterns that miss their sound's hit (`catalog.ts`, haptic only).** Pause values count from the previous pulse; the accents are from `make_sfx.py --accents` logic.

   | key | sound hits at (ms) | haptic now | change to |
   |---|---|---|---|
   | `upgrade` | 0, 240 | medium@0, medium@60 | `['medium', 240, 'medium']` |
   | `unlock` | 0, 85, 170, 255 | heavy@0, success@80 | `['heavy', 255, 'success']` |
   | `unlock_venue` | 0, 100, 200, 820 | heavy, heavy, success@200 | `['heavy', 100, 'heavy', 100, 'medium', 620, 'success']` |
   | `hire` | 0, 170 | medium@0, success@80 | `['medium', 170, 'success']` |
   | `boost_start` | 0, 240 | medium@0, success@70 | `['medium', 240, 'success']` |
   | `chest_open` | 0, 230 | heavy@0, success@90 | `['heavy', 230, 'success']` |
   | `reveal_epic` | 0, 90, 270 | heavy@0, medium@90 | `['heavy', 90, 'light', 180, 'heavy']` |
   | `card_levelup` | 0, 60, 320 | medium@0, success@60 | `['medium', 320, 'success']` |
   | `purchase_success` | 0 (till), 540 (fanfare) | success@0 | `['medium', 540, 'success']` |
   | `daily_claim` | 0, 110 | medium@0, light@60 | `['medium', 110, 'light']` |
   | `combo_up` | 0, 65, 130 | medium@0, light@40 | `['medium', 65, 'light', 65, 'light']` |
   | `rush_start` | 0, 75, 140 | heavy, medium@50, medium@100 | `['heavy', 75, 'medium', 65, 'medium']` |
   | `bonus_collect` | 0, 130 | heavy@0, success@60 | `['heavy', 130, 'success']` |

   `prestige` (0/120/240/440) is already exact. Do not change it.

7. **`buy` (recipe `buy`, `WarmPack.bloop`) is muddy at speed and thin on a phone.**
   - **At 5 per second it is fine:** the level dips 43 dB between hits and does not build up, so it stays pleasant.
   - **The problems:**
     - 48 % of its energy is below 400 Hz (the bloop starts at C4, 262 Hz), and its phone loss is -5.1 dB.
     - At the catalogue's 50 ms floor the low end piles up by +6.2 dB.
     - The 207 ms file outlives the 3 voices, so each new hit cuts an old one 150 ms in.
   - **Change:**
     - Give `bloop()` (both packs) parameters `h2=0.22, h3=0.06` in place of the fixed 0.22/0.06.
     - In `buy`: `p.bloop(p.hz('E4'), p.hz('C5'), dur=0.16, rise=0.06, tau=0.038, h2=0.5, h3=0.25)`.
     - Set `@recipe('buy', length=0.16)`.
     - Keep the click and the C6 tine as they are.
   - **Result, measured:** phone loss -3.3 dB, energy below 400 Hz -6.7 dB (it was -3.2 dB), 159 ms. It no longer needs a 4th voice at 50 ms.
   - **Optional (owner decision, because the file names change from `buy.wav` to `buy_1..3.wav`):** `files: 3, pick: 'random'`, with the variants ±8 cents apart and a slightly different click, as for `coin`.

8. **`reveal_epic` breaks the rarity escalation in brightness.**
   - **Lengths and layers do escalate:** 0.46 / 0.64 / 0.87 / 1.97 s, with 0 / 1 / 3 / 5 onsets.
   - **Brightness does not:** power centroids are 984 Hz (common), 1798 Hz (rare), **741 Hz (epic)** and 1333 Hz (legendary). Epic has 19 % of its energy below 400 Hz (low A3 pluck, A3/E4 pad, two thumps). Because loudness is normalised, the bass takes level away from its shine, and an epic pull sounds duller than a rare one.
   - **Change:**
     - first thump 0.9 → 0.7, hit thump 0.7 → 0.55
     - A3 pluck 0.7 → 0.35
     - pad an octave up (`A4`, `E5`), gain 0.45 → 0.30
     - bell strum gain 0.45 → 0.70
     - sparkle gain 0.55 → 0.85, `density` 34 → 48
   - **Result, measured:** centroid 741 → 947 Hz, energy below 400 Hz -12.7 dB.
   - **If it still reads darker than common after the re-render,** add `p.bell(p.hz('E7'), 0.4, ring=0.8, kind='hand')` at `hit + 0.02`.

9. **`chest_appear` loses 4.0 dB on a phone. 87 % of its energy is below 400 Hz, so the "heavy thud" becomes a faint sparkle.**
   - **Change:** thump `vel` 1.0 → 0.7, and add `p.knock(p.hz('C5'), 0.35, tau=0.022, tone=0.8)` at 0.002 s.
   - **Result, measured:** phone loss -2.9 dB, centroid 491 → 696 Hz, and it is still a thud. In the synth pack the loss is -10.8 dB, so the `SynthPack.thump` version needs the same knock layer.

10. **`serve` loses 8.6 dB on a phone.**
    - **Change:** knock `C4` → `G4`, its low-pass 1800 → 2600 Hz, clink `vel` 0.2 → 0.45.
    - **Result, measured:** -3.9 dB. In the synth pack the loss is -10.3 dB, so apply the same change there.

11. **`chest_shake` loses 5.8 dB on a phone; the wood knocks are G3/C4/A3/E4.**
    - **Change:** `woods = ('G4', 'C5', 'A4', 'E5')` and keep everything else.
    - **Expected:** about -2 dB. In the synth pack the loss is -9.4 dB.

12. **The whoosh family is nearly identical** (spectral correlation 0.976 to 0.994 across `toss`, `ui_open`, `ui_close`, `rush_end` and `story_open`).
    - `ui_open` and `ui_close` are told apart by their pops and `rush_end` by its glide, so they are fine.
    - `story_open` and `toss` are not: correlation 0.976, 266 against 214 ms. A character sliding in will sound like a dish flying over.
    - **Change `story_open`:**
      - `length` 0.27 → 0.34
      - whoosh path `[(0, 300), (0.18, 1100), (0.34, 800)]`, `q=1.3`
      - add `p.tine(p.hz('E5'), 0.35, ring=0.3)` at 0.11 s, a soft "here I am" tone
    - Leave `toss` alone.

13. **`boost_start` sounds like `combo_max`** (correlation 0.976, both 630 ms, both a C-E-G-C-E run into a C chord with a thump), and both fire in active play.
    - **Change `boost_start`:**
      - run `('G4', 'A4', 'C5', 'D5', 'E5', 'G5')` with `step=0.035`
      - whoosh gain 0.45 → 0.80
      - land on an open fifth: plucks `('G5', 'D6', 'G6')`, bells `('D6', 'G6', 'D7')`
    - It stays pentatonic and sounds "charged" rather than resolved.

14. **`blip_high` is darker than `blip_mid`** (power centroid 553 against 791 Hz) and loses 4.0 dB on a phone. The "ee" vowel at A4 puts its energy near the fundamental.
    - The autocorrelation F0 shows the three registers are distinct (E3 162 Hz, C4 264 Hz, A4 455 Hz). So the "B4/G5/A#4" readings that worried the author are a detector artefact, not a fault.
    - **Change:** `_blip(c, 'D5', 1.12, 'i')`.
    - **Result, measured:** centroid 1294 Hz, phone loss -0.7 dB. It is then clearly the small, excitable voice.
    - Leave `blip_mid` as it is.
    - For `blip_low` (phone loss -4.3 dB, its periodicity falls to 0.59 in its second half because of the growl): `rough` 0.3 → 0.2. It is optional.

15. **`card_flip` has a 20.6 ms onset; its envelope peaks at 80 % of the file.**
    - This only matters if the merge keeps the incoming `haptic: ['light']`. Then the buzz lands before the paper.
    - **Change in `WarmPack.paper`:** `env = points([(0, 0), (0.004, 0.5), (dur * 0.4, 0.4), (dur * 0.8, 1.0), (dur, 0)], n) ** 1.6`.
    - Its energy above 8 kHz (-32 dB, the highest in the pack) is right for paper. Do not darken it.
    - The other late starters the author worried about (`toss` 31.7 ms, `story_open` 8.5 ms) have no haptic, so they are fine. `ui_open` (9.6 ms, `soft`) is fine.

16. **Add a phone-speaker check to `qa.py`.**
    - **New column:** "phone" = `loudness_db(filt(x, butter('hp', 550, 2)))` minus `loudness_db(x)`. Warn under -3 dB and fail under -6 dB for one-shots.
    - **For loops:** print the per-stem K-RMS when `--stems` is given.
    - This would have caught items 2, 3, 4 and 7 to 11.

17. **Synth pack (scratch only): the same problems, but worse.**
    - **Phone loss:** `ui_denied` -18.8 dB, `chest_appear` -10.8 dB, `serve` -10.3 dB, `chest_shake` -9.4 dB, `buy` -5.1 dB.
    - **Rarity brightness is flat:** QA centroids 1767 / 1794 / 1429 / 1818 Hz.
    - Re-measure after items 2 and 7 to 11. Do not render the synth pack into any game folder until its phone losses are better than -4 dB.

18. **`docs/design/audio-notes.md`: correct the coin description.** The notes say the coin is "a modal coin on A6", but the 1.782 mode dominates, so it is heard (and measured) as G7 -10 / -1 / +9 cents. G is in the scale, so the sound itself is fine.
    - **Also add a paragraph on the phone check** and the loudness tiers once items 5 and 16 land.

19. **Optional polish: more air on metal sounds.** `master_eq` low-passes everything at 7.3 kHz (4th order), and the coins, `cash`, `gems`, `bell` and sparkles all end there.
    - A per-recipe `lp_hz=10000` for `coin`, `cash`, `gems`, `bonus_collect`, `offline_collect` and `bell` would add the "expensive" shimmer of polished mobile games without harshness. Their content above 8 kHz is under -45 dB today.
    - Leave 7.3 kHz on the noise-based sounds (whooshes, `card_flip`, shakers).

## Checked and fine: do not touch

- **Tap ladder `tap_1..8`.**
  - It is exactly C5 D5 E5 G5 A5 C6 D6 E6, measured at +0/+0/+0/+1/+0/+0/+0/+0 cents.
  - It gets shorter (215 → 145 ms) and brighter (centroid 849 → 1937 Hz) as it climbs.
  - Attack is 4 ms. At 10 taps a second the level dips 11 dB between hits.
  - On a phone it gets about 3 dB louder as it climbs, which suits a combo.
- **Coins `coin_1..3`.**
  - They are -10 / -1 / +9 cents apart (19 cents in all: audible in a stream, still clearly one coin).
  - Their ring differs (T-20 of 66 / 112 / 82 ms) and their centroids are 3290 / 3834 / 3579 Hz.
  - Attack is 2 to 6 ms. One voice per file at a 70 ms floor stays clean.
- **`bell`**, the hand-rung desk bell: 6 ms attack, 600 ms of ring, nothing lost on a phone. **`cook_done`, `door`, `happy`, `hint`, `pickup`, `cash`.**
- **`ui_tap`**: 48 ms, peak-limited 0.7 dB quiet, which is harmless. Its waveform and spectrum are exactly the brief: a soft sine pop with no click.
- **`ui_tab`, `ui_open`, `ui_close`, `toss`, `rush_start`, `rush_end`.**
- **`combo_up`, `combo_max`, `milestone`, `upgrade`** (sound only; fix its haptic in item 6), **`unlock`, `unlock_venue`, `hire`, `prestige`** (sound and haptic: the best file in the pack), **`offline_collect`, `bonus_appear`, `bonus_collect`.**
- **`reveal_common`, `reveal_rare`, `reveal_legendary`, `card_levelup`, `gems`, `deal_popup`, `mission_complete`, `daily_claim`, `purchase_success`** (sound only; fix their haptics in item 6).
- **Key discipline.** Every pitched effect stays on C D E G A. Apart from glides (blips, `happy`, `buy`) and noise, the share of off-scale chroma is under 7 % for every tonal file except `hire` (14 %, from its C6 → G6 slide whistle). Metal and wood sounds (`offline_collect`, `chest_shake`, `serve`) read higher only because their modes are inharmonic, which is correct for those materials.
- **Trattoria composition (the score).**
  - **Form:** A A' B B' A'', 40 bars.
  - **Melody:** 154 notes (3.9 per bar), range D5 to F6, 55 % steps and 18 % leaps. 13 chromatic neighbour and passing notes give it the Neapolitan curl.
  - **Repetition:** the 2-bar theme returns exactly at bars 9 and 33, which is memorable without being a loop of one motif.
  - **Harmony:** the decoded `.m4a` reproduces the written changes bar by bar. Where the bass deliberately plays the third, the chord reads as its first inversion (E under C, B under G7, A under F).
  - **Loop point:** it resolves V7 → I through the e-f-f# pick-up. The seam has no click (sample step 0.0145 against 0.064 for the 99.9th percentile inside the piece). Its level change matches the B' → A'' boundary inside the piece. The one-bar thinning from A'' (-19.5 dB) back to A (-20.7 dB) is a phrase reset, not a fault.
  - It is original as far as I can tell. A human ear should still confirm it does not recall a famous tarantella too closely.
- **Neutral composition.**
  - 16 bars, I-I-vi-vi-IV-IV-V-V | IV-V-I-vi-IV-V-I-V. All of it was detected correctly from the `.m4a`.
  - The lead uses only C D E G A, with no exactly repeated 2-bar cell. The last bar runs down onto bar 1 over V → I.
  - Seam: level -19.1 → -19.4 dB, step 0.0039. The F and B in its IV and V chords make at most a major 7th or a sus4 against the effects, which is acceptable.
- **Files and size.**
  - The catalogue's 50 keys need 58 effect files + `music_main.m4a`. `shared/sfx` has exactly those 59, with none missing and nothing extra.
  - Pizza Empire overrides only `music_main.m4a`.
  - Sizes: 2.47 MB of WAV, 2.87 MB folder (budget 3 MB). The neutral loop is 398 KB and the trattoria loop 521 KB (budget 700 KB).
  - Every effect is 44.1 kHz mono 16-bit, with peak ≤ -1.3 dBFS, no clipping and no DC.
