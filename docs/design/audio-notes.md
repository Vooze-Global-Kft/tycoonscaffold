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
- Loudness: every effect is normalised to the same K-weighted RMS of its loudest
  200 ms (-17 dB), with a soft look-ahead limiter at a -1 dBFS ceiling. Very
  short percussive files (ui_tap) can hit the ceiling first and come out a
  little quieter; QA notes that as "peak-limited". The three typewriter blips
  are measured as a stream (one every 55 ms), which is how they are heard.
  The catalogue `volume` is applied at playback, never baked in.
- Music: AAC in .m4a, ~96-100 kb/s stereo, 30-45 s, K-RMS -20 dB (it sits
  under the effects), under 700 KB. Whole warm pack under 3 MB.
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
- **Money** (`coin_1..3`, `cash`, `buy`): a modal "coin" on A6, the three
  variants -9 / 0 / +11 cents with slightly different ring and mode timing, so
  repeats never machine-gun. Cash is a quick run of tinks; buy is a round
  pluck with a low body.
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
  climbing A minor triad into the octave with bells (0.87 s); legendary a
  golden C major fanfare with thumps and a long sparkle (2 s).
- **Blips** (`blip_low/mid/high`): 40 ms vowel-like typewriter blips: a
  glottal-ish pulse through formant filters: "oh" on E3 sagging with a
  slight growl, "ah" on C4, "ee" on A4 bouncing up a tone; measured as a stream for loudness.

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
