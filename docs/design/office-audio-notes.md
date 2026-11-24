# High Office (high-office): sound pack and music (spec section 6, package P5)

Status: second version, after an independent check (its findings and what changed are in "What the independent check changed" below). Every key of section 6 renders from this game's own recipes: 25 effect keys in 32 `.wav` files (`sign_ink`, `sign`, `study` and `tally` have three files each, `paper_arrive` two, all `pick: 'random'`), two `.m4a` stings (`majority`, `defeat`) and two `.m4a` loops. QA passes (0 failing; the stings are now held to the same phone rule as the effects), two renders give the same bytes, the cross-key comparison passes against each of the three other games on both legs, and the folder is 2.66 MB of the 3.0 MB budget.

**Nobody has listened to any of it.** There is no speaker here. Everything below was measured (loudness, spectra, phone-speaker loss, rows of twenty and fifty, similarity scores, interval runs) and the contact sheets were looked at; nothing was heard. What a person should listen for first is at the end, and it matters more than any number here.

## Files

| file | what it is |
|---|---|
| `scripts/audio/recipes_office.py` | the instruments of this game and one recipe per sound file (32). Own registry `OFFICE_RECIPES`, own `OfficeCtx`, the event table `EVENTS` (volume, minimum interval, haptic, brief, voices: the source of `catalog.decree.ts`), `FILES`, `ROW_KEYS`, `SHARED_SOUNDS` (the map for `soundKeys.ts`). Imports `math`, `numpy` and `dsp` only. |
| `scripts/audio/office_music.py` | the loops "Minutes of the Previous Meeting" (`music_main`, spec 6's music_desk) and "The Middling March" (`music_campaign`), and the stings `majority` and `defeat`. Imports the machinery of `music.py` and the instruments of `recipes_office.py`; edits nothing in `music.py`. `--score` prints the march. |
| `scripts/audio/render_office.py` | the entry point: `--check`, render, `--qa`, `--rows DIR`, `--tell`, `--accents`, `--sheets DIR`, `--hash`, `--only`, `--no-music`, `--out`. |
| `games/high-office/assets/sfx/` | 32 `.wav` and 4 `.m4a`, 2,656,148 bytes (budget 3,000,000: effects 1.22 MB, stings 0.13 MB, music 1.31 MB). |
| `src/services/fx/catalog.decree.ts` | the catalogue in the skeleton's shape (27 keys), filled from `EVENTS` and `FILES`; `render_office.py --check` fails when the two disagree. |

`scripts/audio/compare.py` was not changed: its folder and cross-key modes already take a fourth game (md5 before and after the same; the outputs below byte-identical).

## How to check

```sh
python3 scripts/audio/render_office.py --check             # every key of spec 6 has an office recipe; none falls back; EVENTS = catalog.decree.ts
python3 scripts/audio/render_office.py                     # render everything into games/high-office/assets/sfx, then QA (about 50 s)
python3 scripts/audio/render_office.py --qa                # QA of the folder only
python3 scripts/audio/render_office.py --hash [--out D]    # sha256 per file: render twice and compare
python3 scripts/audio/render_office.py --rows DIR          # rows of the fast sounds at catalogue volume, numbers + DIR/rows.png
python3 scripts/audio/render_office.py --tell              # signing against the drawer, measured
python3 scripts/audio/render_office.py --accents           # haptics against the sound's accents; the fastest pulse rate
python3 scripts/audio/render_office.py --sheets DIR        # contact sheets per group, the stings and the music
python3 scripts/audio/compare.py high-office pizza-empire --cross    # the gate of fingerprint dimension 16 (both legs)
python3 scripts/audio/compare.py high-office space-miner --cross
python3 scripts/audio/compare.py high-office night-market --cross
python3 scripts/audio/office_music.py --tune music_main --levels     # per-stem levels and phone loss
python3 scripts/audio/office_music.py --score                        # the march's melody, note by note
```

Everything is deterministic: every random stream is seeded by its name (`dsp.rng_for('office', key, ...)`, `rng_for('office-music', ...)`), and the AAC export uses `music.py`'s bit-exact flags.

## Character, as built

Wood, brass, a pen nib, pneumatic air, a wire tray, a creaking drawer and a distant bandstand. Every instrument is built in `recipes_office.py` from `dsp` primitives. The noise sounds are shaped by impulse trains ringing fixed resonances (a nib's tines, a drawer's runner, a slate, a pneumatic tube's own modes), never by a swept band-pass.

- **Nib** (`nib`): impulses of the paper's tooth at a rate following the pen's speed (letter strokes 6 to 9 a second, pen lifts between letters), each ringing the nib's tines and the sheet. For the signature (`sign_ink`) the tines are low and soft: the main tine at 1460, 1640 or 1950 Hz (one per variant: -2 and +3 semitones around 1640) at Q 6, a second tine 1.42 times higher at a third of the level, the sheet at 1.1 kHz, and the whole nib kept steeply to 0.9 to 3.4 kHz: a soft mid scratch, not a squeak. The Ledger's check mark (`buy_level`) keeps the first version's bright tines (2.65 and 3.9 kHz, Q 10 to 12): it is 45 ms long.
- **Wire tray** (`wire_clink`): six or seven thin brass rods (free-free bar modes 1, 2.756, 5.404; 0.9 to 2.1 kHz) damped by the paper lying on them, then the tray settling 45 to 55 ms later (half the rods again, softer). With **card stock** (`card_slap`): one fat broadband slap.
- **Wood** (`creak`, `runner`, `wood_body`, `desk_tap`, `door_knock`, `drawer_thunk`, `gavel`): a stick-slip pulse train (40 to 125 a second) ringing three wood resonances is the creak, which has a pitch (the three drawers of `study` are tuned 0, -2 and +2 semitones: creak rate, resonances and box); damped plate and box modes for the desk, the drawer, a panelled door with a glass pane, a gavel's block. The low modes are high-passed at about 480 Hz: a phone keeps nothing under 300.
- **Brass** (`brass`): tuba, euphonium, trombone, cornet; additive, harmonic k growing as level^(1 + bright (k - 1) / 4) so a loud note is a bright blat; a lip scoop into pitch; breath buzz at the attack; a cup mute; slides. `clarinet`, `bassoon`, `kazoo` (a hummed voice through a buzzing membrane).
- **Bandstand** (`snare`, `snare_roll`, `bass_drum`, `clash`, `brush_tap`, `brush_sweep`), **office objects** (`hand_bell` tuned to its fundamental and twelfth, `shutter` of a press camera, `scissors`, `chalk` with a skipping stroke, `tube_air` (at high Q the tube's hollow note, `ui_open`), `latch`, `brass_coin` laid on a blotter, `newspaper_slap`), and `pizz` for the desk loop (a modal string through a wooden body: the spec asks for pizzicato there; it is not Karplus-Strong and is used in no effect).

What is not in the pack: no plucked instrument in any effect, no marimba, no bell ladder (the one hand bell is `storey`), no cash register, no bell on a money moment, no pulse blip, no radio squelch, no FM glass, no steam, felt, clay, hand drum, free reed or bowed pad, no swept whoosh, no chiptune. Paper appears only as short transients (card stock laid down, a newspaper's slap, a clipping), never as a rustle bed. Nothing of `recipes.py`, `recipes_haul.py`, `recipes_night.py` or `packs.py` is imported (`grep` below, and `render_office.py --check` fails if any is in `sys.modules`).

Pitched effects are in B-flat major (the brass band's key; `c.hz()` refuses anything else; the one exception is the pneumatic tube's resonance in `ui_open`, about A-flat 4, the note of a length of pipe, not a played note): Pizza Empire is in C pentatonic, Orbit Haulers in A pentatonic, Lantern Row in D dorian and G lydian.

## Keys, files and haptics (`catalog.decree.ts`)

| key | sound | ms | volume | min interval | voices | haptic |
|---|---|---|---|---|---|---|
| sign_ink (3 files) | the nib signing from 40 pt: a 180 ms soft mid scratch (0.9 to 3.4 kHz), pressure growing, pen lifts between letters; three nib pitches | 182 | 0.35 | 250 | 1 | light |
| sign (3) | card stock into the wire out-tray, the rods clinking, the tray settling: bright, short | 192 | 0.5 | 150 | 2 | medium |
| study (3) | the drawer: a creak (rate rising and falling), the runners, a hollow thunk at the stop: low, woody; three drawers 0, -2, +2 semitones | 348 to 358 | 0.5 | 150 | 2 | medium |
| take_back | one wire lifted (a small clink), the paper laid back (card tap) | 181 | 0.45 | 150 | 1 | light |
| denied | one dull knuckle tap on the desk, the pen jumping (three tiny ticks) | 110 | 0.5 | 300 | 1 | light |
| paper_arrive (2) | two knocks on a panelled door, the glass answering; the paper laid on the desk (FREQUENT tier: under the signing) | 363, 390 | 0.3 | 5000 | 1 | none |
| slip_arrive | the slip slid slowly across the baize in ONE continuous push (340 ms, cloth friction kept to 550 Hz .. 1.2 kHz, swelling and fading), laid flat (a soft thup) | 389 | 0.35 | 800 | 1 | none |
| buy_level | the nib's check mark, a brass token laid on the blotter and settling on its rim | 199 | 0.45 | 125 | 2 | light |
| open_ministry | a brass latch thrown, a tuba blat (B-flat) from the corridor | 641 | 0.6 | | 1 | medium |
| appoint | a press camera: release, leaf shutter, spring; the film-advance ratchet | 348 | 0.6 | | 1 | light |
| storey | a brass hand bell swung twice (F5), a tuba under the first stroke | 1,763 | 0.65 | | 1 | success |
| ribbon | scissors close, the ribbon parts, a clarinet flourish (G5 A5 B-flat5, down to F5) | 721 | 0.6 | | 1 | light |
| boycott_start | a wordless kazoo chant (three kazoos, D4 D4 F4 C4), a bass drum | 1,061 | 0.6 | | 1 | medium |
| boycott_end | a door unlatched and swinging open on its hinge | 561 | 0.55 | | 1 | none |
| scandal | a newspaper slapped down; a muted trombone's "oh dear" (F4, then D4 sliding to B-flat3) | 1,016 | 0.65 | | 1 | heavy |
| clipping | two snips, the clipping pressed onto the page | 250 | 0.45 | 300 | 1 | none |
| call_election | the gavel, twice | 419 | 0.65 | | 1 | medium |
| env_open | a snare roll swelling into one stroke (0.7 s) | 924 | 0.5 | | 1 | none |
| tally (3) | chalk on the board: the tap and a skipping stroke | 120 to 165 | 0.5 | 120 | 2 | none |
| district_held | the band's PAH (rimshot, tuba, euphoniums) and the tuba's oom answering | 580 | 0.6 | 300 | 1 | success |
| district_lost | a trombone sliding down a fourth (F4 to C4), soft | 885 | 0.5 | 300 | 1 | none |
| majority (.m4a) | eight bars of "The Middling March", the full bandstand, the eighth a held chord | 9,915 | 0.8 | | 1 | heavy |
| defeat (.m4a) | one tuba, high in its register (an octave under the tune), playing the march's first four bars slowly, its last note sagging | 8,197 | 0.7 | | 1 | soft |
| ui_open | a capsule arriving by pneumatic tube (the tube's hollow note for 110 ms, not a hiss), dropping into its brass receiver; kept to 450 Hz .. 3 kHz | 202 | 0.4 | | 1 | none |
| ui_close | the receiver's lid falling shut (click, catch), the capsule's air let out | 192 | 0.35 | | 1 | none |
| music_main | "Minutes of the Previous Meeting" (spec 6's music_desk) | 90.7 s | 0.2 | | | |
| music_campaign | "The Middling March" | 90.0 s | 0.35 | | | |

**Haptics** (`--accents`): one pulse per key at most, on the sound's first accent; none for arrivals, slips, clippings, envelopes, tallies, a lost district, a boycott that ends on its own (D6: it changes no mood; the first version gave it a light pulse) or the sheets (spec 6: none for taxes, arrivals or payouts). For one key at a time, every key with a haptic has a floor of at least 125 ms, so one key alone pulses at most 8.0 a second (`buy_level`). Across keys, what holds the rate is the haptics service's floor, `HAPTIC_MIN_GAP_MS` = 120 ms, which allows 8.3 a second, not 8.0, and it holds only pulses that are not heavier than the last one: `PatternPlayer.play` (src/services/fx/pattern.ts) plays a heavier pulse at once (`first > lastWeight` gives a wait of 0). **A signing gesture is two pulses, and on a fast flick they come almost together**: spec 4.3 commits a fast flick at 48 pt and `sign_ink` fires at 40 pt, so the light pulse at 40 pt and `sign`'s medium at the commit can be 10 to 50 ms apart (the first version of these notes said 300 ms or more: that figure came from `--rows`, which places the clink 300 ms after the nib, and is true only for a slow drag). The fix belongs to the desk wiring (src/modes/decree/actions.ts, P6) and is requested: play `sign_ink` with `{ haptic: false }` when the commit comes within 120 ms of the 40 pt crossing, so a fast flick gives one medium pulse and a slow drag keeps the light pulse spec 6 asks for. Until then, that pair is the one place the rate goes past 8 a second. `district_held` (success) is 300 ms apart at least (spec 6); election night calls a district every 2.5 s.

**Loudness tiers** on the pack target (-17 dB K-weighted, as all other packs): FREQUENT -2 for the desk sounds, arrivals (papers and slips), the Ledger tick and the sheets; LOUD +1 for `storey`, `scandal`, `call_election`; the stings at +2 on their loudest 200 ms. Five short files sit at the peak ceiling 0.6 to 1.7 dB under their tier (a qa.py warning, allowed up to 3 dB): denied, buy_level, call_election, tally_1 to 3.

**Variants.** The shared player picks a random file for `pick: 'random'` (src/services/fx/variants.ts). Within a key the variants score 0.84 to 0.93 on the timbre leg (one sound, slightly different each time). They now differ in pitch, not only in noise: `sign_ink`'s strongest partial is 1459, 1690 and 2051 Hz (the first version: 2.65 kHz in all three), `study`'s 382, 444 and 501 Hz (the first version: 428 to 447 Hz, one note). Long-term spectra (40 log bands, dB RMS) between the variants: `sign_ink` 1.6 to 2.8 dB against 1.2 to 1.9 for a re-seeded render of the same file (before: 1.5 to 1.8 against 1.0 to 1.6), `study` 5.2 to 8.2 against 1.6 to 2.9 (before: 1.8 to 2.6), `sign` 4.5 to 7.3. So `sign_ink`'s three files are three nibs only by a little; the pitch is what differs.

**Loudness at catalogue volume** (loudest 200 ms, K-weighted, file loudness plus the volume): `sign` and `study` -25.0, `ui_open` -27.0, `sign_ink` -28.1, `slip_arrive` -28.1, `paper_arrive` -29.5 (an arrival is now under the player's own signing; the first version had it at -25.0, as loud). The desk loop at volume 0.2: loudest-400 ms windows median -30.9, p95 -27.1, max -25.0 (at 0.3 they were -28.7, -24.9 and -22.4, its loud moments above the desk effects): its loudest moment now equals the signing and nothing of it rises above.

## Phone speaker

Every effect loses at most 2.6 dB through the 550 Hz high-pass of qa.py (worst `district_held` -2.6, `open_ministry` -2.5, `boycott_start` -2.2), and every effect has at least 52 % of its energy above 500 Hz. `render_office.py` fails a file under 50 %, and since the independent check it applies that rule to the two stings too (it covered `.wav` effects only, and both stings failed it: `defeat` 31 %, `majority` 44 %). Now: `defeat` 56 % above 500 Hz (-4.7 dB through a 4th-order 700 Hz high-pass, a rough small-speaker model; was -7.1), because the tuba plays an octave higher, in the top of its register, harder (a brighter blat) and with its fundamental thinned under 400 Hz; `majority` 58 % (-3.7 dB; was -5.0), because the tuba and bass drum sit back (gain 0.25 instead of 0.36 and 0.40) and the sting is high-passed at 250 Hz. No file has hiss: at most 0.17 % of energy above 8 kHz, nothing above 12 kHz. Loops: desk -5.7 dB on qa.py's model, 24 % above 500 Hz (the pizzicato is in the cello's octave: on a phone the desk loop is mostly the brushes and the bassoons; it is background and is not held to the 50 % rule), march -2.9 dB.

## Rows: signing and the drawer, fifty in a row (`--rows`, `--tell`)

Rows at catalogue volume and voices, the files taking turns at random; dip = median level drop inside each interval; build = the row's loudness over one shot.

| key | files | every | dip | build | | key | every | dip | build |
|---|---|---|---|---|---|---|---|---|---|
| sign_ink | 3 | 250 ms / 1.2 s x50 | 99 / 97 dB | +0.7 / 0 | | take_back | 150 | 36 | +2.8 |
| sign | 3 | 150 ms / 1.2 s x50 | 32 / 101 | +2.8 / 0 | | denied | 300 | 104 | 0 |
| study | 3 | 150 ms / 1.2 s x50 | 24 / 103 | +2.8 / 0 | | buy_level | 125 | 62 | +3.0 |
| tally | 3 | 120 | 35 | +3.2 | | slip_arrive | 800 | 98 | 0 |
| clipping | 1 | 300 | 101 | 0 | | district_held | 300 | 36 | +0.1 |

Fifty decisions at a fast reading hand (one every 1.2 s +- 0.15, two of three signed with the nib and the clink 300 ms later, one studied): peak -7.8 dBFS, nothing clips, no row builds more than 3.2 dB. In `rows.png` (looked at, second version) every row at the reading pace is separate events; `sign_ink` is now a band of 0.9 to 3.4 kHz with nothing above (the first version was a 2 to 5 kHz streak); `slip_arrive` is one swell per arrival with no gaps inside; at the 150 ms floors `study` (350 ms long) overlaps into a continuous wooden texture, which a hand cannot produce (a paper takes seconds to read). (The rows' "nib and the clink 300 ms later" is a slow drag; a fast flick puts them 10 to 50 ms apart, see Haptics.)

**The nib, measured against the ear's harshest band** (the independent check's finding: the sound most likely to make a player mute the game). First version: 275 ms of sustained scratch, 82 to 85 % of its energy in 2 to 5 kHz, strongest partial 2.65 kHz, sharpness about 2.04 acum (a Zwicker-style estimate), the three variants differing only by noise seed. Now: 180 ms, 27 to 44 % in 2 to 5 kHz, strongest partial 1.46 / 1.69 / 2.05 kHz, sharpness 1.33 to 1.37 (the clink `sign` is 1.68 to 1.78, the drawer 1.53 to 1.58), volume 0.35 (was 0.4), so it is the softest and least sharp of the three desk sounds. It is still a scratch on every signature: listening item 1.

Telling them apart with the screen off: signing is 192 ms, centroid 2.6 to 2.9 kHz, 73 to 90 % of its energy in 1 to 4 kHz and almost none under 1 kHz; the drawer is 355 ms, 73 to 77 % of its energy under 1 kHz, with a creak that has a pitch and a thunk at 200 ms. On compare.py's timbre leg (where 0.93 is "a copy") the clink scores 0.51 to 0.57 against the drawer, nib + clink as a gesture 0.45 to 0.49, the nib alone 0.60 to 0.67, while the variants of one sound score 0.84 to 0.93. Long-term spectra: signing against the drawer 13.3 to 16.7 dB apart, the nib against the drawer 20.8 to 22.6.

## Music

| | music_main, "Minutes of the Previous Meeting" (spec 6 music_desk) | music_campaign, "The Middling March" |
|---|---|---|
| form | 34 bars of 4/4 at 90 bpm, F major, 17 chords of two bars (F, Dm7, Gm7, C7sus4, F, Bbmaj7, Am7, D7, Gm7, C7, Am7, Dm7, Bbmaj7, Bbm6, F/C, Gm7, C7) | 84 bars of 2/4 at 112 bpm, B-flat: intro 4, A 8, A' 8, trio in E-flat B 8, B' 8, a break of 8 (tuba asks, trombones answer), A, A' with a trombone counter-line, B, B' tutti, a tag of 8 back to the intro |
| instruments | pizzicato on beats 1 and 3 (a walk into eight of the changes), wire brushes stirring with taps on 2 and 4, a second bassoon holding a soft chord tone every four bars, a first bassoon with four short remarks (bars 4, 12, 20, 28), each different | cornet melody, euphoniums and a trombone on the after-beats, tuba oom on the beats, snare, bass drum, clash cymbals at the phrase starts; played from across a square (a 5.2 kHz top, a larger room) |
| under reading | no melody: the only notes that move are four remarks of two to four notes in 90 s; stems: pizzicato -24 K-RMS, held bassoon -28, brushes -34 and -37, the remarks -35 | the cornet leads at -25, tuba -27, after-beats -30 |
| measured | K-RMS -20.0 dB, peak -3.6 dBFS, phone -5.7 dB, 655 KB | K-RMS -20.1 dB, peak -4.7 dBFS, phone -2.9 dB, 651 KB |
| seam | level +8.4 dB (inside p99 9.9), spectrum p92, step 0.035 (p99.9 inside 0.062): clean | level +6.4 dB (inside p99 7.6), spectrum 13.8 dB at p99 (a qa.py warning: the tag's last F7 bar into the intro's B-flat downbeat), step 0.012 |

Both are whole AAC frames long, encoded by `music.py`'s gapless export at 56 kb/s (58 measured), tails folded through the seam by `music.mixdown`, the brushes' stir folded with an equal-power crossfade.

**Stings.** `majority`: the march's A strain (bars 1 to 7) tutti and an eighth bar held 2.2 s on a B-flat chord with a snare roll into it and a cymbal, the tuba and bass drum set back and the whole high-passed at 250 Hz for the phone: 9.9 s, 58 % of its energy above 500 Hz. `defeat`: the first four bars of the tune on one tuba an octave down (the top of the tuba's register, F3 to E-flat 4) at 70 bpm, blown harder, the last note (F) sagging 45 cents: 8.2 s, ending on the dominant, 56 % above 500 Hz (two octaves down, as first built, it had 31 % and would mostly vanish on a phone). Both are .m4a (mono content in a stereo file, 56 kb/s, 72 and 59 KB); a .wav of 9.9 s would be 870 KB. The decoded file carries 11 ms of encoder padding at its end, which a one-shot does not mind.

**Size.** The third game's budget, 3.0 MB with the music: 2.66 MB used.

**Who plays what.** The shared player starts only `music_main` (src/services/fx/mix.ts `MUSIC`), so the desk loop is that key; `music_campaign` is rendered and catalogued but is not heard until the shared player can switch loops for the run-up and election night (requested, as Lantern Row's summer loop was).

### Is "The Middling March" original?

It was written for this game (`office_music.py --score`). The check is against references I wrote down from memory (openings only, public-domain tunes; several marked approximate, because my memory of them is): Ode to Joy, God Save the King, The Star-Spangled Banner, La Marseillaise, Yankee Doodle, When the Saints Go Marching In, Battle Hymn of the Republic, Colonel Bogey, Stars and Stripes Forever (trio), the Radetzky March, Pomp and Circumstance No. 1 (trio), The British Grenadiers, the Toreador march, the Triumphal March from Aida, Entry of the Gladiators, Hail to the Chief, Mendelssohn's Wedding March; added since the independent check: the Kaiserhymne, Wagner's Bridal Chorus, O Canada (as the check wrote them), and The Liberty Bell, The Washington Post and Semper Fidelis, which I can write down only with LOW confidence (my note lists for these three are likely wrong in places). 23 references.

**The verdict rests on interval runs**, which do not depend on tempo or key: the longest run of consecutive melodic intervals (in semitones) the march's four strains share with a reference, and the longest run of intervals with the same rhythm.
- Same rhythm: at most 4 in a row (trio B against The British Grenadiers; trio B against the Kaiserhymne 4).
- Intervals alone: 3 to 5 for every pair but three: trio B shares 9 with my low-confidence Semper Fidelis trio (2 of them with the same rhythm), A' shares 8 with my approximation of the Wedding March (1 with the same rhythm), and the Kaiserhymne 5. The 9 and the 8 are the same figure: a leap up and a walk down the major scale step by step (trio B: up a fourth to E-flat, then D, C, B-flat, A-flat, G, F, G, A-flat), a figure most marches have. The references share up to 9 consecutive intervals among themselves (median 3).
- So no reference is copied in pitch and rhythm together; the two longest pitch runs are a stock scale walk in another rhythm. A person who knows marches must still listen, above all for the trio against Sousa's marches (listening item 5).

**What the chroma score does not show.** The first version of these notes said the march's chroma joint score (at most 0.28) put it "as far from every reference as unrelated tunes are"; the independent check showed that this score cannot see a copy at another tempo (strain A against itself at 100 bpm instead of 112 scores 0.13, under the median of unrelated tunes, 0.24). It is printed for the record only: with the 23 references the march scores at most 0.34 (trio B against Semper Fidelis), the references 0.24 median and 0.45 at most among themselves.

**Against the other three games' music** (compare.py --cross, music against music, joint): at most 0.10 against Pizza Empire and Orbit Haulers, 0.26 against Lantern Row (desk loop against Lantern Row's loop: slow tempos; the march against all of them 0.05 to 0.11).

The tool is in the session scratch (`office/sound/fix/originality2.py`, output `originality2.txt`; the first version `office/sound/tools/originality.py`), not in the repository: it holds the reference tunes as note lists.

## The cross-key comparison (fingerprint dimension 16)

`compare.py high-office OTHER --cross` at the calibrated thresholds (joint 0.60; timbre 0.93 on effects), run on the recipes first (before any polishing), on the first version's files, and on the files as they are now:

| | pairs | joint: max, over 0.60 | timbre: max, 0.87 or more, 0.93 or more | music against music, joint max |
|---|---|---|---|---|
| high-office vs pizza-empire | 1,860 | 0.58, 0 | 0.859 (`denied`~`ui_close`), 0, 0 | 0.10 |
| high-office vs space-miner | 1,764 | 0.58, 0 | 0.896 (`env_open`~`boost_start`), 4, 0 | 0.10 |
| high-office vs night-market | 1,064 | 0.59, 0 | 0.896 (`open_ministry`~`shutter_open`), 6, 0 | 0.26 |
| the first version | | 0.58 / 0.58 / 0.59, 0 | 0.917 / 0.896 / 0.901; 17 at 0.87 or more | |
| the first run of the recipes | | 0.74, 17 / 0.75, 9 / 0.64, 1 | 0.950 (`slip_arrive`~Pizza `toss`), 1 failing | |

**How much the timbre threshold says on this pack.** 0.93 was calibrated on Lantern Row, where it caught 96 % of copies. On this pack (`compare.py high-office night-market --cross --calibrate-cross`) it catches only 104 of 160 copies (65 %; copies = each effect re-seeded and shifted +-1 and +-2 semitones); 0.90 catches 83 %, 0.85 catches 93 % with 1 of 483 pairs of different sounds of this pack flagged (the highest: `district_lost`~`scandal` 0.867). So for this pack the gate (0.93) passes, but the line a listener should use is **0.87**: every pair of this game's sounds against another game's at or above 0.87 is listed below, and none is at 0.90 or more. The joint threshold 0.60 holds here: pairs of different sounds inside this pack reach 0.54 at p99 (one at 0.61, `call_election`~`study_3`), and 0.60 catches 75 % of pitch-shifted copies (111 of 126 of the tonal ones).

**The pairs at 0.87 or more on timbre** (10, all with joint 0.43 or less; the first version had 17): against Orbit Haulers `env_open`~`boost_start` 0.896, `open_ministry`~`system_online` 0.882, `district_held`~`contract_met` 0.881, `open_ministry`~`gems` 0.875, `district_held`~`gems` 0.875; against Lantern Row `open_ministry`~`shutter_open` 0.896, `env_open`~`lantern_lit` 0.891, `district_held`~`shutter_open` 0.886, `env_open`~`festival_line` 0.880, `district_lost`~`festival_line` 0.877. All are rare moments (a ministry, an envelope, a district), none a desk sound. The pairs nearest on joint: `take_back`~Lantern Row `lucky` 0.59, `district_held`~Pizza `chest_open` 0.58, `storey`~Orbit `bonanza` 0.58.

What the first run caught and what changed then: `buy_level`'s brass coin rang a clear pitch with two contacts (0.74 against Pizza's `door`, taps and coins): the token now lies on a leather blotter (modes damped in 5 to 9 ms) and settles on its rim. `denied` was two knocks, the same gesture as Pizza's `ui_denied` (0.63): one tap and the pen jumping. `sign`'s few rods rang a note (0.75 against Orbit's `trait_pick`): six or seven rods and the tray settling. `tally`'s chalk stroke was close to Orbit's `module_remove` (0.74) and then, lengthened, to Pizza's `toss` (0.938): the chalk now skips (a dotted stroke) and the slate knocks. `district_held` (0.65 against Pizza's `upgrade`) became PAH-then-oom; `ui_close` (0.72 against Orbit's) became lid-then-air; `ribbon`'s clarinet (0.64 against Lantern Row's `festival_line`) plays other notes.

**What the independent check caught and what changed then.**
- `slip_arrive` had the shape of Lantern Row's steam chuffs (`merge_k`, `ui_denied`), its most-played family: two or three short noise bursts in 182 ms, timbre 0.896 against `merge_3`, 0.901 against `ui_denied`, 0.886 against `ui_open`: above every pair of different sounds inside this pack, passing only because 0.93 is loose here. It is now one continuous push of 340 ms with no gaps, the cloth's friction kept steeply to 550 Hz .. 1.2 kHz, then the thup: against every `merge_1..8`, `ui_denied` and `ui_open` of Lantern Row at most 0.631 (`merge_5`; the aim was 0.80), against anything of the three games at most 0.837 (Pizza's `story_open`). A continuous push in a wide band was tried first and was a whoosh (0.93 to 0.94 against Pizza's `toss`): the narrow band is what makes it cloth.
- `ui_open`'s 100 ms of broadband tube hiss was a whoosh (0.917 against Pizza's `toss`, 0.895 against Lantern Row's `swap`). Shortened to 40 ms it rose on the joint leg (0.65 to 0.71 against Lantern Row's `drop`), so it was given a pitch instead: the tube's first three resonances at Q 40 (a hollow note near 415 Hz), a 620 Hz clunk, the whole kept to 450 Hz .. 3 kHz: timbre at most 0.817 (`swap`), joint at most 0.54.
- `sign_ink` (the nib) was rebuilt for the ear, not for the gate (see the nib paragraph above); band-limiting it also brought its timbre maximum against the three games down from 0.83 to 0.79 (`sign_ink_3`~Lantern Row `ui_denied`).
- The joint leg is fragile on short sounds: changing `sign_ink_2`'s letter rate from 8.5 to 8.0 strokes a second raised it from 0.31 to 0.66 against Orbit's `hold_tick`; 9.0 gives 0.45. Any later change to a recipe needs the three cross runs again.

The three existing games' own comparisons are unchanged: `compare.py space-miner pizza-empire --json`, `night-market pizza-empire --json`, and the cross-key runs `night-market pizza-empire`, `night-market space-miner`, `space-miner pizza-empire` give byte-identical stdout and JSON before this package and after its second version (session scratch `office/sound/before/` against `office/sound/fix/after/`); compare.py itself is unchanged (md5 8f869dc0c4f5724b99698b84533256f5).

## Shared keys the store plays (for `src/modes/decree/soundKeys.ts`)

`recipes_office.SHARED_SOUNDS`: `ui_denied → denied`, `ui_open → ui_open`, `ui_close → ui_close`, `offline_collect → slip_arrive` (the Clerk's report on the desk; no haptic: a payout), `purchase_success → open_ministry` (a shop purchase is rare and deserves the latch and the blat), `unlock → open_ministry`, `prestige → storey` (moving up follows the result sheet, where `majority` has just played for 10 s; a second march would be too much), `milestone → storey`, `buy → buy_level`, `story_open → ui_open`, `deal_popup → ui_open`. `ui_tap` and `ui_tab` stay silent on purpose: a reading game needs no click per button, and the sheets they open already play `ui_open`.

The skeleton's first version differs in three values (`purchase_success → buy_level`, `prestige → majority`, `offline_collect → clipping`) and lacks `milestone`; I could not edit the file (not in my package's list), so the change is requested in requests.md.

## Things the specification left open (the reading I chose)

- **Keys.** The skeleton's catalogue shape and keys kept; `music_desk` is `music_main` (the shared player's key), as the skeleton named it. `sign_ink`, `sign`, `study`, `paper_arrive` and `tally` got variants (`files`, `pick: 'random'`).
- **`sign_ink` is a 180 ms one-shot** (280 ms in the first version) played when the drag crosses 40 pt (its floor 250 ms: once per gesture), not a sound that follows each pixel: the shared player cannot scrub. Its pressure grows over the file, which is how "growing from 40 pt" is rendered.
- **`study` is the drawer's whole gesture** (creak, slide, thunk) played at the commit; there is no separate drag sound for the pull (none is listed in section 6).
- **"majority and defeat ... heavy":** heavy for `majority`; `defeat` gets `soft` (a defeat is a rare peak, but it should not feel like a win).
- **Haptics the spec did not list:** light for `take_back`, `denied`, `buy_level`, `appoint`, `ribbon` (`sign_ink`'s light is the spec's own); medium for `open_ministry`, `boycott_start`, `call_election`; success for `storey`; heavy for `scandal`; none for `clipping`, `env_open`, `tally`, `district_lost`, `boycott_end` (it ends on its own: not the thumb, not a peak), arrivals and sheets.
- **`defeat` is "one tuba playing it slowly"** an octave under the tune (the top of a tuba's register), not two octaves under: two octaves down a phone kept a third of it.
- **Section 6 lists "pneumatic air"** but gives it no key: it is the sheets (a capsule by tube).
- **Section 6 asks for pizzicato in the desk loop and forbids "pluck":** I read the ban as the first game's plucked instruments (Karplus-Strong mandolin and pluck); `pizz` is a modal string in the loop only.
- **The scandal's muted trombone** is two notes ("oh dear"), not the four-note descending "sad trombone" every listener knows.

## Not done, or not good enough yet

- **Nobody has listened** (spec 6: "a person listens"; 10.1 #7). Everything here was measured and the contact sheets looked at; nothing was heard. Listen first for:
  1. **Signing, fifty in a row** (the nib from 40 pt, then the clink): the nib is now a soft mid scratch (1.5 to 2 kHz, 180 ms) instead of a bright squeak: is it still pleasant on the fiftieth? does it still read as a pen nib, or has it become a vague rub? Is the clink a tray or a coin?
  2. **The drawer, fifty in a row**: does the creak read as a drawer, or as a door or a duck? Do the three drawers (0, -2, +2 semitones) sound like one drawer, slightly different each time, or like three pieces of furniture? Is 355 ms too long for a gesture made every few seconds?
  3. **Signing against the drawer with the screen off**: can you tell them apart at once?
  4. **`slip_arrive` and `paper_arrive`**, heard every 12 s and between: is the slip's slow push on the baize a slip of paper on cloth, or a breath / a brush stroke? Does the paper's knock sit under the signing now (it should)?
  5. **"The Middling March"**: does it remind you of any march, anthem or song you know, above all the trio against Sousa (my notes of Semper Fidelis, The Washington Post and The Liberty Bell are low-confidence)? Is it pompous in a funny way, or just loud?
  6. **`defeat` on the iPhone speaker**: is the tuba still a tuba an octave up, and still sad? **`majority`**: still a full band with the low end set back?
  7. **The desk loop for twenty minutes, while reading**, at volume 0.2: calm or dreary; do the bassoon's remarks nag; is it too quiet to notice (on a phone it is mostly the brushes and the bassoons)?
  8. **`ui_open`'s tube note** (about A-flat 4, out of the band's key): a pneumatic tube, or a wrong note?
  9. **The kazoo chant** (`boycott_start`): funny, or irritating? It must not sound like a real chant.
  10. **The listed pairs at 0.87 or more** against the other three games, side by side.
  11. **The election night**: snare roll, chalk, PAH-oom, the trombone slide, the march: in order, at the 2.5 s pace and at four times that.
  12. **A fast flick on a phone**: one buzz or two? (Until the desk wiring is changed, two pulses 10 to 50 ms apart.)
- **The fast-flick haptic pair** (see Haptics) needs the desk wiring: requested of P6.
- **`music_campaign` is unplayed** until the shared player can choose a loop (requested).
- **The campaign loop's seam** warns (spectral step at p99: from the tag's F7 into the intro's downbeat); level and click are clean.
- **The shared-keys map** in `soundKeys.ts`: check that it holds the map above (requested in the first version).
- **Who plays what when** (`src/modes/decree/actions.ts`, `fx.ts`, the election-night view) is the desk and screens packages' wiring: `sign_ink` once when a drag up crosses 40 pt (180 ms, floor 250 ms; without its haptic on a fast flick), `sign` / `study` at the commit, `take_back` on the tap, `denied` when a short sign shakes the strip, `buy_level` on a slip flicked up, `env_open` per envelope, `tally` per chalk mark, `district_held` / `district_lost` per district, `majority` / `defeat` at the result (requested).
