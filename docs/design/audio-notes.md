# Audio notes: how the sounds are made

Every sound effect and both music loops are synthesised from code in
`scripts/audio/` (Python 3 + numpy; ffmpeg only for the AAC music export). No
samples, no downloads, deterministic output: same code, same bytes.

| file | what it does |
| --- | --- |
| `dsp.py` | oscillators, filters, Karplus-Strong string, modal (struck object) synthesis, reverb, and `master()` (trim, fades, DC, EQ, loudness, limiter, WAV writer) |
| `recipes.py` | one recipe per catalogue key: *what* happens (notes, timing, layers, haptic accents) |
| `packs.py` | the instruments: *what it is played on*. `warm` (default) and `synth` |
| `music.py` | the two loop compositions (`trattoria`, `neutral`), their mix and the seamless fold |
| `make_sfx.py` | reads `src/services/fx/catalog.ts`, renders every key, fails loudly on a missing recipe |
| `qa.py` | measures a folder, fails on out-of-spec files, draws `docs/design/audio-qa.png` |

## Regenerate

```sh
# the default pack every game uses (58 effects + neutral music loop)
python3 scripts/audio/make_sfx.py --pack warm --out shared/sfx

# Pizza Empire's own music (a per-game override: only this one file)
python3 scripts/audio/make_sfx.py --pack warm --out games/pizza-empire/assets/sfx --only music_main --music trattoria

# the alternative sci-fi pack (A major pentatonic); render to a scratch folder to audition
python3 scripts/audio/make_sfx.py --pack synth --out /tmp/synth

# QA table + contact sheet (writes docs/design/audio-qa.png); exit code 1 on failure
python3 scripts/audio/qa.py shared/sfx games/pizza-empire/assets/sfx
python3 scripts/audio/qa.py shared/sfx games/pizza-empire/assets/sfx --stems   # + per-stem levels of each music loop

python3 scripts/audio/make_sfx.py --check     # coverage only: every catalogue key has a recipe (CI friendly)
python3 scripts/audio/make_sfx.py --list      # keys, file counts, recipes
python3 scripts/audio/music.py --tune trattoria --wav /tmp/t.wav --stems /tmp/stems   # audition stems, no ffmpeg
```

A full warm render takes about 15 s; the trattoria loop about 7 s.

## Output spec (enforced by qa.py)

- Effects: 44.1 kHz, mono, 16-bit WAV. Tails trimmed at -50 dB under the peak,
  3 ms raised-cosine fade-in, fade-out on every file, DC removed, 40 Hz high-pass
  and a gentle 7.3 kHz low-pass (nothing harsh above 8 kHz; QA reports the
  energy above 8 kHz per file).
- Loudness: every effect is normalised to a K-weighted RMS of its loudest
  200 ms, with a soft look-ahead limiter at a -1 dBFS ceiling. The target is
  -17 dB plus the recipe's loudness tier (`@recipe(..., loud_db=...)`):
  - `BIG` (+2 dB, target -15): `prestige`, `unlock`, `unlock_venue`,
    `chest_open`, `reveal_legendary`, `purchase_success`;
  - `FREQUENT` (-2 dB, target -19): `tap_*`, `buy`, `coin_*`, `ui_tap`, `card_flip`;
  - everything else 0 (target -17).
  With the catalogue volumes on top, `prestige` now plays about 6.8 dB louder
  than `buy` (it was 2.8 dB). QA reads the tier from the recipe and prints it. Very
  short percussive files (ui_tap) can hit the ceiling first and come out a
  little quieter; QA notes that as "peak-limited". The three typewriter blips
  are measured as a stream (one every 55 ms), which is how they are heard.
  The catalogue `volume` is applied at playback, never baked in.
- Music: AAC in .m4a, ~96-100 kb/s stereo, 30-45 s, K-RMS -20 dB (it sits
  under the effects), under 700 KB. Whole warm pack under 3 MB.
- Phone check: QA measures how much quieter each file gets through a 550 Hz
  high-pass (a rough model of a phone speaker, which plays little under
  ~500 Hz): column "phone". It warns when an effect loses more than 3 dB and
  fails it past 6 dB; music is only warned about past 6 dB. The usual fix is to
  move a low knock or bloop up an octave or give it 2nd/3rd harmonics, and to
  keep the low thumps as support, never as the only thing in a sound.
- Music seam: QA compares the level and spectrum of the last 50 ms with the
  first 50 ms, and against every boundary inside the piece. Because a loop
  starts on a downbeat, a level rise at the seam is normal; it fails only if it
  is bigger than every step inside the loop (sampled every 5 ms, so the piece's
  own downbeats are counted) or if the waveform steps (a click).

## How packs and overrides work

- `shared/sfx/` is the default pack, used by every game.
- A game overrides any sound by putting a file with the same base name in
  `games/<id>/assets/sfx/` (for example `bell.wav`, or `tap_3.wav`, or
  `music_main.m4a`). Pizza Empire overrides only `music_main.m4a`.
- To give a game a whole different palette, render another pack into its
  folder: `make_sfx.py --pack synth --out games/<id>/assets/sfx`. `--only`
  takes comma-separated keys or globs (`--only 'tap,coin,reveal_*'`) for a
  partial override.
- A new pack is a subclass of `Pack` in `packs.py` with a `transpose` (the
  recipes are written in C) and the same instrument methods (`pluck`, `bell`,
  `knock`, `whoosh`, `thump`, `sparkle`, `coin`, `desk_bell`, `brass`, `pad`,
  `verb`, ...). Register it in `PACKS`.

## How to add a sound

1. Add the key to `src/services/fx/catalog.ts` (keys are never renamed or removed).
2. `python3 scripts/audio/make_sfx.py --check` now fails, naming the key.
3. Add a recipe in `recipes.py`:
   ```python
   @recipe('my_key', length=0.4)
   def my_key(c):
       """What it should sound like (this text is the design brief)."""
       p, m = c.p, Mix()
       m.add(p.pluck(p.hz('E5'), 0.9, ring=0.2, rng=c.rng), 0.0)
       m.add(p.bell(p.hz('C6'), 0.5, ring=0.3, rng=c.rng), 0.06)
       c.accent(0.0, 0.06)              # moments worth a vibration
       return p.verb(m.out(), 0.1, tail=0.15)
   ```
   `c.i` / `c.n` are the variant index and count when the catalogue says
   `files: n`; `c.rng` / `c.sub(tag)` are deterministic random streams.
   Name notes in C and stay on C D E G A so everything harmonises.
4. Render, then run `qa.py` and look at the new cell on the contact sheet.

## The recipe ideas, by family

General rules: only pentatonic notes (C D E G A in the warm pack, transposed
to A in synth), so any two overlapping sounds are consonant; something audible
at t = 0 where the haptic fires; soft transients (no raw noise clicks, attack
filtered); short.

- **UI** (`ui_tap`, `ui_tab`, `ui_open`, `ui_close`, `hint`): a 40 ms sine
  bubble pop (tap), two soft wood ticks a fourth apart (tab), filtered whooshes
  ending in a rising pop (open) or starting with a falling one (close), a
  breathy "ps" into two kalimba tines (hint). `ui_denied` is a dull low-passed
  double bonk a minor third down (G3 to E3, "uh-uh"): no buzz, no dissonance.
- **Tap ladder** (`tap_1..8`): one marimba/kalimba pluck per file climbing the
  pentatonic scale C5 D5 E5 G5 A5 C6 D6 E6 (an octave and a third); higher
  steps are slightly shorter and brighter, so a streak opens up.
  `combo_up` / `combo_max`: rising arpeggios ending in a chord and sparkle.
- **Money** (`coin_1..3`, `cash`, `buy`): a modal "coin" written on A6, but
  heard as G7: its 1.782x mode dominates (QA's pitch column says G7). The
  three variants are -9 / 0 / +11 cents with slightly different ring and mode
  timing, so repeats never machine-gun. Cash is a quick run of tinks; buy is a
  click and a 160 ms bloop rising E4 to C5 with strong 2nd/3rd harmonics
  (short enough for 3 voices at the 50 ms floor; audible on a phone).
- **Rewards and progress** (`milestone`, `upgrade`, `unlock`, `hire`,
  `offline_collect`, `boost_start`, `mission_complete`, `daily_claim`,
  `purchase_success`, `card_levelup`, `gems`): always rise and end with a
  sparkle (a cloud of tiny high pentatonic bell grains).
- **Big moments** (`unlock_venue`, `prestige`, `chest_open`,
  `reveal_legendary`, `rush_start`): three layers, a low pitch-dropping thump,
  a mid chord (plucks, soft horns, pad), and a high sparkle tail.
- **Kitchen** (`cook_done`, `toss`, `bell`, `pickup`, `serve`, `door`,
  `happy`): `bell` is a modal desk bell (plunger clack, inharmonic strike
  partials on G6, slow beating ring, ~0.6 s). `toss` and `card_flip` are
  band-passed noise whooshes whose centre frequency follows the motion.
- **Chests and rarity** (`chest_appear`, `chest_shake`, `card_flip`,
  `reveal_*`): reveals escalate clearly. Common is one soft chime (0.46 s);
  rare two brighter chimes a fourth apart (0.64 s); epic a low A thump and a
  climbing A minor triad into the octave with bells, its low end trimmed and
  its pad an octave up so it is brighter than common (0.87 s); legendary a
  golden C major fanfare with thumps and a long sparkle (2 s).
- **Blips** (`blip_low/mid/high`): 40 ms vowel-like typewriter blips: a
  glottal-ish pulse through formant filters: "oh" on E3 sagging with a
  slight growl, "ah" on C4, "ee" on D5 bouncing up a tone; measured as a stream for loudness.

## Music

Both loops are written as text scores in `music.py`, performed onto stems
that are allowed to ring past the loop end, mixed to stereo with a short
reverb and then folded: everything after the last bar is added onto the start,
so decays and reverb run through the seam. The last bar is a pick-up into bar 1.

- **trattoria** (Pizza Empire, `games/pizza-empire/assets/sfx/music_main.m4a`):
  original 6/8 tarantella-lilt in C, 116 bpm, 40 bars (A A' B B' A''), 41.4 s.
  Karplus-Strong mandolin with tremolo on long notes carrying the melody, a
  second mandolin in thirds, an accordion (two detuned reed voices; stabs and a
  pad), a plucked bass, a light tambourine.
- **neutral** (shared fallback, `shared/sfx/music_main.m4a`): 16 bars of 4/4 at
  120 bpm, 32 s, played on the pack's own instruments (marimba, kalimba, pad,
  shaker), so it follows the pack's key and colour.

Mix after the audio review (per-stem K-RMS at mix level, `qa.py --stems`):

| trattoria | K-RMS | phone | | neutral | K-RMS | phone |
|---|---|---|---|---|---|---|
| bass (0.50) | -24.8 | -13.4 | | lead | -24.1 | -0.8 |
| mandolin | -25.1 | -0.2 | | pad (0.32) | -25.9 | -6.9 |
| accordion (1.25) | -28.2 | -2.4 | | bass (0.45) | -27.1 | -21.2 |
| mandolin 2 | -32.4 | -0.3 | | kalimba | -31.1 | -6.1 |
| percussion (0.35) | -37.5 | -1.6 | | shaker (0.45) | -42.9 | -0.0 |
| | | | | thump (0.30) | -46.3 | -28.5 |
| | | | | wood (0.50) | -46.5 | -1.7 |

The trattoria bass now carries its octave (2nd harmonic at 0.25, low-pass
2000 Hz) and the accordion sits 3 dB under the lead mandolin instead of 8.
The neutral bass is brighter (low-pass 1600 Hz) and no longer the loudest stem.
Whole-mix phone loss (loudest 200 ms): trattoria -0.7 dB, neutral -2.8 dB.

## Review decisions

The review is `docs/design/audio-review.md` (19 items). What was done with each:

1. **Catalogue merge.** By the time this pass ran, `catalog.ts` had been
   resolved by another agent (HEAD's side throughout; it parses, 50 keys).
   HEAD's "no haptic" for `cash`, `bonus_appear`, `deal_popup`, `rush_end` is
   kept. The incoming `chest_shake` / `reveal_legendary` patterns were **not**
   taken, because `catalog.ts` is outside the audio scripts' ownership; they
   are listed below for whoever owns the catalogue. `qa.py` now reads
   `stream_ms` (and the loudness tier) from `recipes.RECIPES` directly, file
   name -> recipe key, so the blips are measured right even when the catalogue
   cannot be parsed.
2. **ui_denied**: done as proposed (G4/E4, tone 0.6, octave knock at 0.9x,
   low-pass 2800 Hz). Phone -3.8 dB (was -17.0). Still warns by 0.8 dB;
   accepted: it is meant to be a dull "bonk", and more top would make it bite.
3. **Trattoria mix**: done exactly (bass 0.50, accordion 1.25, percussion
   0.35; bass_note low-pass 2000 Hz + 0.25 2nd harmonic). Score untouched.
4. **Neutral mix**: done exactly.
5. **Loudness tiers**: done with the per-recipe `loud_db` offset (+2 / -2 dB)
   rather than the catalogue volumes, since the catalogue is not ours to edit.
   Either alone gives the spread; doing both would double it.
6. **Haptic timings: not applied** (catalogue). The recipes' accents
   (`make_sfx.py --accents`) agree with the review's table, with one
   correction: `boost_start` now hits at **210 ms**, not 240 (item 13 shortened
   its run step to 35 ms), so its pattern should be `['medium', 210, 'success']`.
   Proposed catalogue patterns: upgrade `['medium', 240, 'medium']`, unlock
   `['heavy', 255, 'success']`, unlock_venue `['heavy', 100, 'heavy', 100,
   'medium', 620, 'success']`, hire `['medium', 170, 'success']`, boost_start
   `['medium', 210, 'success']`, chest_open `['heavy', 230, 'success']`,
   reveal_epic `['heavy', 90, 'light', 180, 'heavy']`, card_levelup
   `['medium', 320, 'success']`, purchase_success `['medium', 540, 'success']`,
   daily_claim `['medium', 110, 'light']`, combo_up `['medium', 65, 'light',
   65, 'light']`, rush_start `['heavy', 75, 'medium', 65, 'medium']`,
   bonus_collect `['heavy', 130, 'success']`; and from the incoming branch
   chest_shake `['light', 50, 'light', 50, 'light', 50, 'medium']`,
   reveal_legendary `['heavy', 80, 'heavy', 80, 'heavy', 160, 'success']`.
7. **buy**: done (`bloop()` got `h2`/`h3`; E4->C5, 160 ms). Phone -3.2 dB
   (was -5.1). The 3 random variants were **declined**: they change the
   catalogue's `files` count and file names, which is the owner's call.
8. **reveal_epic**: done as proposed. Centroid now between common and
   legendary; the low-end thump no longer dominates.
9. **chest_appear**: done. Phone -2.9 dB (was -4.0).
10. **serve**: done. Phone -3.9 dB (was -8.6); still warns, accepted because
    it is a soft "thud" at volume 0.25 that should stay in the background.
11. **chest_shake**: done (woods up an octave). Phone -2.6 dB (was -5.8).
12. **story_open**: done (0.34 s, slower resonant whoosh, E5 tine at 0.11 s).
    `toss` untouched.
13. **boost_start**: done (G A C D E G scale run at 35 ms, whoosh 0.8, open
    fifths on G). See item 6 for the haptic time.
14. **blip_high**: done (D5). Optional `blip_low` rough 0.3 -> 0.2 **declined**:
    the growl is what makes it read as "gruff", and it does not change its
    phone loss (-4.3 dB, warning accepted: a low voice is supposed to be low;
    in a typewriter stream the ear fills in the fundamental).
15. **card_flip**: done (paper envelope speaks at 4 ms) in both packs, even
    though the catalogue currently gives it no haptic.
16. **QA phone column / --stems**: done (see Output spec).
17. **Synth pack**: still renders (scratch only). It keeps worse phone losses
    (`chest_appear` -9.1 dB fails, `serve` -5.3, `ui_denied` -4.9) because its
    knock and thump are near-pure sines; it must not go into a game folder
    until those are fixed in `SynthPack`.
18. **Notes**: coin pitch, phone check and tiers documented above.
19. **10 kHz low-pass for metal sounds: declined.** Every sound it would touch
    (`coin`, `cash`, `gems`, `bell`, `bonus_collect`, `offline_collect`) is on
    the review's own "already good, do not touch" list, phone speakers add
    little above 8 kHz, and it would push those files towards QA's 8 kHz
    energy warning.

