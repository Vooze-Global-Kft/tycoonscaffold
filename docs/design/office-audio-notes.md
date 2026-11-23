# High Office (high-office): sound pack and music (spec section 6, package P5)

Status: first version. Every key of section 6 renders from this game's own recipes: 25 effect keys in 32 `.wav` files (`sign_ink`, `sign`, `study` and `tally` have three files each, `paper_arrive` two, all `pick: 'random'`), two `.m4a` stings (`majority`, `defeat`) and two `.m4a` loops. QA passes (0 failing), two renders give the same bytes, the cross-key comparison passes against each of the three other games on both legs, and the folder is 2.66 MB of the 3.0 MB budget.

**Nobody has listened to any of it.** There is no speaker here. Everything below was measured (loudness, spectra, phone-speaker loss, rows of twenty and fifty, similarity scores, interval runs) and the contact sheets were looked at; nothing was heard. What a person should listen for first is at the end, and it matters more than any number here.

## Files

| file | what it is |
|---|---|
| `scripts/audio/recipes_office.py` | the instruments of this game and one recipe per sound file (32). Own registry `OFFICE_RECIPES`, own `OfficeCtx`, the event table `EVENTS` (volume, minimum interval, haptic, brief, voices: the source of `catalog.decree.ts`), `FILES`, `ROW_KEYS`, `SHARED_SOUNDS` (the map for `soundKeys.ts`). Imports `math`, `numpy` and `dsp` only. |
| `scripts/audio/office_music.py` | the loops "Minutes of the Previous Meeting" (`music_main`, spec 6's music_desk) and "The Middling March" (`music_campaign`), and the stings `majority` and `defeat`. Imports the machinery of `music.py` and the instruments of `recipes_office.py`; edits nothing in `music.py`. `--score` prints the march. |
| `scripts/audio/render_office.py` | the entry point: `--check`, render, `--qa`, `--rows DIR`, `--tell`, `--accents`, `--sheets DIR`, `--hash`, `--only`, `--no-music`, `--out`. |
| `games/high-office/assets/sfx/` | 32 `.wav` and 4 `.m4a`, 2,663,021 bytes (budget 3,000,000: effects 1.23 MB, stings 0.13 MB, music 1.31 MB). |
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

- **Nib** (`nib`): impulses of the paper's tooth at a rate following the pen's speed (letter strokes 6 to 8.5 a second, pen lifts between letters), each ringing the nib's two tines (2.65 and 3.9 kHz, Q 10 to 12) and the sheet (1.25 kHz). A scratch with a small squeak in it.
- **Wire tray** (`wire_clink`): six or seven thin brass rods (free-free bar modes 1, 2.756, 5.404; 0.9 to 2.1 kHz) damped by the paper lying on them, then the tray settling 45 to 55 ms later (half the rods again, softer). With **card stock** (`card_slap`): one fat broadband slap.
- **Wood** (`creak`, `runner`, `wood_body`, `desk_tap`, `door_knock`, `drawer_thunk`, `gavel`): a stick-slip pulse train (40 to 110 a second) ringing three wood resonances is the creak, which has a pitch; damped plate and box modes for the desk, the drawer, a panelled door with a glass pane, a gavel's block. The low modes are high-passed at about 480 Hz: a phone keeps nothing under 300.
- **Brass** (`brass`): tuba, euphonium, trombone, cornet; additive, harmonic k growing as level^(1 + bright (k - 1) / 4) so a loud note is a bright blat; a lip scoop into pitch; breath buzz at the attack; a cup mute; slides. `clarinet`, `bassoon`, `kazoo` (a hummed voice through a buzzing membrane).
- **Bandstand** (`snare`, `snare_roll`, `bass_drum`, `clash`, `brush_tap`, `brush_sweep`), **office objects** (`hand_bell` tuned to its fundamental and twelfth, `shutter` of a press camera, `scissors`, `chalk` with a skipping stroke, `tube_air`, `latch`, `brass_coin` laid on a blotter, `newspaper_slap`), and `pizz` for the desk loop (a modal string through a wooden body: the spec asks for pizzicato there; it is not Karplus-Strong and is used in no effect).

What is not in the pack: no plucked instrument in any effect, no marimba, no bell ladder (the one hand bell is `storey`), no cash register, no bell on a money moment, no pulse blip, no radio squelch, no FM glass, no steam, felt, clay, hand drum, free reed or bowed pad, no swept whoosh, no chiptune. Paper appears only as short transients (card stock laid down, a newspaper's slap, a clipping), never as a rustle bed. Nothing of `recipes.py`, `recipes_haul.py`, `recipes_night.py` or `packs.py` is imported (`grep` below, and `render_office.py --check` fails if any is in `sys.modules`).

Pitched effects are in B-flat major (the brass band's key; `c.hz()` refuses anything else): Pizza Empire is in C pentatonic, Orbit Haulers in A pentatonic, Lantern Row in D dorian and G lydian.

## Keys, files and haptics (`catalog.decree.ts`)

| key | sound | ms | volume | min interval | voices | haptic |
|---|---|---|---|---|---|---|
| sign_ink (3 files) | the nib signing from 40 pt: a 280 ms flourish, pressure growing, pen lifts between letters | 281 | 0.4 | 250 | 1 | light |
| sign (3) | card stock into the wire out-tray, the rods clinking, the tray settling: bright, short | 192 | 0.5 | 150 | 2 | medium |
| study (3) | the drawer: a creak (rate rising and falling), the runners, a hollow thunk at the stop: low, woody | 352 to 359 | 0.5 | 150 | 2 | medium |
| take_back | one wire lifted (a small clink), the paper laid back (card tap) | 181 | 0.45 | 150 | 1 | light |
| denied | one dull knuckle tap on the desk, the pen jumping (three tiny ticks) | 110 | 0.5 | 300 | 1 | light |
| paper_arrive (2) | two knocks on a panelled door, the glass answering; the paper laid on the desk | 363, 391 | 0.4 | 5000 | 1 | none |
| slip_arrive | the slip nudged twice across the baize (fibre catches), laid flat (a soft thup) | 182 | 0.35 | 800 | 1 | none |
| buy_level | the nib's check mark, a brass token laid on the blotter and settling on its rim | 199 | 0.45 | 125 | 2 | light |
| open_ministry | a brass latch thrown, a tuba blat (B-flat) from the corridor | 641 | 0.6 | | 1 | medium |
| appoint | a press camera: release, leaf shutter, spring; the film-advance ratchet | 348 | 0.6 | | 1 | light |
| storey | a brass hand bell swung twice (F5), a tuba under the first stroke | 1,763 | 0.65 | | 1 | success |
| ribbon | scissors close, the ribbon parts, a clarinet flourish (G5 A5 B-flat5, down to F5) | 721 | 0.6 | | 1 | light |
| boycott_start | a wordless kazoo chant (three kazoos, D4 D4 F4 C4), a bass drum | 1,061 | 0.6 | | 1 | medium |
| boycott_end | a door unlatched and swinging open on its hinge | 561 | 0.55 | | 1 | light |
| scandal | a newspaper slapped down; a muted trombone's "oh dear" (F4, then D4 sliding to B-flat3) | 1,016 | 0.65 | | 1 | heavy |
| clipping | two snips, the clipping pressed onto the page | 250 | 0.45 | 300 | 1 | none |
| call_election | the gavel, twice | 419 | 0.65 | | 1 | medium |
| env_open | a snare roll swelling into one stroke (0.7 s) | 924 | 0.5 | | 1 | none |
| tally (3) | chalk on the board: the tap and a skipping stroke | 120 to 165 | 0.5 | 120 | 2 | none |
| district_held | the band's PAH (rimshot, tuba, euphoniums) and the tuba's oom answering | 580 | 0.6 | 300 | 1 | success |
| district_lost | a trombone sliding down a fourth (F4 to C4), soft | 885 | 0.5 | 300 | 1 | none |
| majority (.m4a) | eight bars of "The Middling March", the full bandstand, the eighth a held chord | 9,915 | 0.8 | | 1 | heavy |
| defeat (.m4a) | one tuba playing the march's first four bars slowly, its last note sagging | 8,197 | 0.7 | | 1 | soft |
| ui_open | a capsule arriving by pneumatic tube (tube air), dropping into its brass receiver | 190 | 0.4 | | 1 | none |
| ui_close | the receiver's lid falling shut (click, catch), the capsule's air let out | 192 | 0.35 | | 1 | none |
| music_main | "Minutes of the Previous Meeting" (spec 6's music_desk) | 90.7 s | 0.3 | | | |
| music_campaign | "The Middling March" | 90.0 s | 0.35 | | | |

**Haptics** (`--accents`): one pulse per key at most, on the sound's first accent; none for arrivals, slips, clippings, envelopes, tallies, a lost district or the sheets (spec 6: none for taxes, arrivals or payouts). Across plays every key with a haptic has a floor of at least 125 ms, so the fastest possible rate is 8.0 a second (`buy_level`); the haptics service's own floor (120 ms) holds the sum of several keys. A signing gesture is at most two pulses (light at 40 pt, medium at the commit, 300 ms or more apart). `district_held` (success) is 300 ms apart at least (spec 6); election night calls a district every 2.5 s.

**Loudness tiers** on the pack target (-17 dB K-weighted, as all other packs): FREQUENT -2 for the desk sounds, slips, the Ledger tick and the sheets; LOUD +1 for `storey`, `scandal`, `call_election`; the stings at +2 on their loudest 200 ms. Five short files sit at the peak ceiling 0.6 to 1.7 dB under their tier (a qa.py warning, allowed up to 3 dB): denied, buy_level, call_election, tally_1 to 3.

**Variants.** The shared player picks a random file for `pick: 'random'` (src/services/fx/variants.ts). Within a key the variants score 0.87 to 0.98 on the timbre leg (one sound, slightly different each time: rods, letter rhythm, creak rate).

## Phone speaker

Every effect loses at most 2.6 dB through the 550 Hz high-pass (worst `district_held` -2.6, `open_ministry` -2.5, `boycott_start` -2.2), and every effect has at least 52 % of its energy above 500 Hz (`render_office.py` fails a file under 50 %: the first render failed eleven, all of them wood, tuba or snare sounds, which is why the low modes are high-passed and the tuba's formants sit at 300 and 780 Hz). Stings: majority -3.5 dB, defeat -4.5 dB (a lone tuba). Loops: desk -5.7 dB (the pizzicato loses 8 dB; it is played in the cello's octave), march -2.9 dB.

## Rows: signing and the drawer, fifty in a row (`--rows`, `--tell`)

Rows at catalogue volume and voices, the files taking turns at random; dip = median level drop inside each interval; build = the row's loudness over one shot.

| key | files | every | dip | build | | key | every | dip | build |
|---|---|---|---|---|---|---|---|---|---|
| sign_ink | 3 | 250 ms / 1.2 s x50 | 73 / 95 dB | +0.9 / 0 | | take_back | 150 | 36 | +2.8 |
| sign | 3 | 150 ms / 1.2 s x50 | 32 / 101 | +2.8 / 0 | | denied | 300 | 104 | 0 |
| study | 3 | 150 ms / 1.2 s x50 | 21 / 103 | +2.8 / 0 | | buy_level | 125 | 62 | +3.0 |
| tally | 3 | 120 | 35 | +3.2 | | slip_arrive | 800 | 98 | 0 |
| clipping | 1 | 300 | 101 | 0 | | district_held | 300 | 36 | +0.1 |

Fifty decisions at a fast reading hand (one every 1.2 s +- 0.15, two of three signed with the nib and the clink 300 ms later, one studied): peak -7.6 dBFS, nothing clips, no row builds more than 3.2 dB. In `rows.png` (looked at) every row at the reading pace is separate events; at the 150 ms floors `study` (350 ms long) overlaps into a continuous wooden texture, which a hand cannot produce (a paper takes seconds to read).

Telling them apart with the screen off: signing is 192 ms, centroid 2.6 to 2.9 kHz, 73 to 90 % of its energy in 1 to 4 kHz and almost none under 1 kHz; the drawer is 355 ms, 75 to 77 % of its energy under 1 kHz, with a creak that has a pitch and a thunk at 200 ms. On compare.py's timbre leg (where 0.93 is "a copy") signing scores 0.50 to 0.55 against the drawer, nib + clink as a gesture 0.53 to 0.55, while the variants of one sound score 0.87 to 0.98.

## Music

| | music_main, "Minutes of the Previous Meeting" (spec 6 music_desk) | music_campaign, "The Middling March" |
|---|---|---|
| form | 34 bars of 4/4 at 90 bpm, F major, 17 chords of two bars (F, Dm7, Gm7, C7sus4, F, Bbmaj7, Am7, D7, Gm7, C7, Am7, Dm7, Bbmaj7, Bbm6, F/C, Gm7, C7) | 84 bars of 2/4 at 112 bpm, B-flat: intro 4, A 8, A' 8, trio in E-flat B 8, B' 8, a break of 8 (tuba asks, trombones answer), A, A' with a trombone counter-line, B, B' tutti, a tag of 8 back to the intro |
| instruments | pizzicato on beats 1 and 3 (a walk into eight of the changes), wire brushes stirring with taps on 2 and 4, a second bassoon holding a soft chord tone every four bars, a first bassoon with four short remarks (bars 4, 12, 20, 28), each different | cornet melody, euphoniums and a trombone on the after-beats, tuba oom on the beats, snare, bass drum, clash cymbals at the phrase starts; played from across a square (a 5.2 kHz top, a larger room) |
| under reading | no melody: the only notes that move are four remarks of two to four notes in 90 s; stems: pizzicato -24 K-RMS, held bassoon -28, brushes -34 and -37, the remarks -35 | the cornet leads at -25, tuba -27, after-beats -30 |
| measured | K-RMS -20.0 dB, peak -3.6 dBFS, phone -5.7 dB, 655 KB | K-RMS -20.1 dB, peak -4.7 dBFS, phone -2.9 dB, 651 KB |
| seam | level +8.4 dB (inside p99 9.9), spectrum p92, step 0.035 (p99.9 inside 0.062): clean | level +6.4 dB (inside p99 7.6), spectrum 13.8 dB at p99 (a qa.py warning: the tag's last F7 bar into the intro's B-flat downbeat), step 0.012 |

Both are whole AAC frames long, encoded by `music.py`'s gapless export at 56 kb/s (58 measured), tails folded through the seam by `music.mixdown`, the brushes' stir folded with an equal-power crossfade.

**Stings.** `majority`: the march's A strain (bars 1 to 7) tutti and an eighth bar held 2.2 s on a B-flat chord with a snare roll into it and a cymbal: 9.9 s. `defeat`: the first four bars of the tune on one tuba two octaves down at 70 bpm, the last note (F) sagging 45 cents: 8.2 s, ending on the dominant. Both are .m4a (mono content in a stereo file, 56 kb/s, 72 and 59 KB); a .wav of 9.9 s would be 870 KB. The decoded file carries 11 ms of encoder padding at its end, which a one-shot does not mind.

**Size.** The third game's budget, 3.0 MB with the music: 2.66 MB used.

**Who plays what.** The shared player starts only `music_main` (src/services/fx/mix.ts `MUSIC`), so the desk loop is that key; `music_campaign` is rendered and catalogued but is not heard until the shared player can switch loops for the run-up and election night (requested, as Lantern Row's summer loop was).

### Is "The Middling March" original?

It was written for this game (`office_music.py --score`). Two checks, with references I wrote down from memory (openings only, public-domain tunes; several marked approximate, because my memory of them is): Ode to Joy, God Save the King, The Star-Spangled Banner, La Marseillaise, Yankee Doodle, When the Saints Go Marching In, Battle Hymn of the Republic, Colonel Bogey, Stars and Stripes Forever (trio), the Radetzky March, Pomp and Circumstance No. 1 (trio), The British Grenadiers, the Toreador march, the Triumphal March from Aida, Entry of the Gladiators, Hail to the Chief, Mendelssohn's Wedding March. Each tune and each of the march's four strains were rendered as a plain melody at 112 bpm and scored with compare.py's joint measure at the music hop (50 ms), and their interval sequences compared.

- **Joint (chroma and rhythm at one alignment and transposition):** the march's strains score at most 0.28 against any reference (B against The British Grenadiers); the references score 0.23 median, 0.40 at most against each other (unrelated tunes); strain A against itself a minor third up scores 0.99. So the march is as far from every reference as unrelated tunes are from each other.
- **Intervals:** the longest run of consecutive melodic intervals shared with a reference is 3 to 5 for every pair but one: A' shares 8 intervals with my approximation of the Wedding March (a descending scale run, d-c-b-flat-a-g), with a different rhythm (1 interval in a row with the same rhythm). The references share up to 9 with each other. Runs with the same rhythm: at most 4 (B against The British Grenadiers).
- **Against the other three games' music** (compare.py --cross, music against music, joint): at most 0.11 against Pizza Empire and Orbit Haulers, 0.26 against Lantern Row (desk loop against "Lantern Dusk": slow tempos; the march against all of them 0.05 to 0.11).

The tool is in the session scratch (`office/sound/tools/originality.py`), not in the repository: it holds the reference tunes as note lists. A person who knows marches should still listen (below).

## The cross-key comparison (fingerprint dimension 16)

`compare.py high-office OTHER --cross` at the calibrated thresholds (joint 0.60; timbre 0.93 on effects), run on the recipes first (before any polishing) and again on the final files:

| | pairs | joint: max, over 0.60 | timbre: max, 0.90 or more, 0.93 or more | music against music, joint max |
|---|---|---|---|---|
| high-office vs pizza-empire | 1,860 | 0.58, 0 | 0.917 (`ui_open`~`toss`), 1, 0 | 0.11 |
| high-office vs space-miner | 1,764 | 0.58, 0 | 0.896 (`env_open`~`boost_start`), 0, 0 | 0.10 |
| high-office vs night-market | 1,064 | 0.59, 0 | 0.901 (`slip_arrive`~`ui_denied`), 1, 0 | 0.26 |
| the first run of the recipes | | 0.74, 17 / 0.75, 9 / 0.64, 1 | 0.950 (`slip_arrive`~Pizza `toss`), 1 failing | |

What the first run caught and what changed: `buy_level`'s brass coin rang a clear pitch with two contacts (0.74 against Pizza's `door`, taps and coins): the token now lies on a leather blotter (modes damped in 5 to 9 ms) and settles on its rim. `denied` was two knocks, the same gesture as Pizza's `ui_denied` (0.63): one tap and the pen jumping. `sign`'s few rods rang a note (0.75 against Orbit's `trait_pick`): six or seven rods and the tray settling. `slip_arrive`'s baize hush was a whoosh (timbre 0.950 against Pizza's `toss`): fibre catches in two pushes and a low thup. `tally`'s chalk stroke was close to Orbit's `module_remove` (0.74) and then, lengthened, to Pizza's `toss` (0.938): the chalk now skips (a dotted stroke) and the slate knocks. `district_held` (0.65 against Pizza's `upgrade`) became PAH-then-oom; `ui_close` (0.72 against Orbit's) became lid-then-air; `ribbon`'s clarinet (0.64 against Lantern Row's `festival_line`) plays other notes.

Pairs from 0.55 on joint or 0.88 on timbre, for a person to listen to side by side: against Pizza `district_held`~`chest_open` 0.58, `ui_open`~`ui_open` 0.58, `study_2`~`hint` 0.57, `ui_open`~`toss` timbre 0.917; against Orbit `storey`~`bonanza` 0.58, `ui_close`~`module_remove` 0.57, `tally_1`~`module_remove` 0.57, `env_open`~`boost_start` timbre 0.896, `open_ministry`~`system_online` 0.882, `ui_open`~`ui_open` 0.881, `district_held`~`contract_met` 0.881; against Lantern Row `take_back`~`lucky` 0.59, `ui_open`~`drop` 0.58, `slip_arrive`~`ui_denied` timbre 0.901, `slip_arrive`~`merge_3` 0.896, `open_ministry`~`shutter_open` 0.896, `ui_open`~`swap` 0.895.

The three existing games' own comparisons are unchanged: `compare.py space-miner pizza-empire --json`, `night-market pizza-empire --json`, and the cross-key runs `night-market pizza-empire`, `night-market space-miner`, `space-miner pizza-empire` give byte-identical stdout and JSON before and after this package (saved in the session scratch `office/sound/before/` and `after/`); compare.py itself is unchanged.

## Shared keys the store plays (for `src/modes/decree/soundKeys.ts`)

`recipes_office.SHARED_SOUNDS`: `ui_denied → denied`, `ui_open → ui_open`, `ui_close → ui_close`, `offline_collect → slip_arrive` (the Clerk's report on the desk; no haptic: a payout), `purchase_success → open_ministry` (a shop purchase is rare and deserves the latch and the blat), `unlock → open_ministry`, `prestige → storey` (moving up follows the result sheet, where `majority` has just played for 10 s; a second march would be too much), `milestone → storey`, `buy → buy_level`, `story_open → ui_open`, `deal_popup → ui_open`. `ui_tap` and `ui_tab` stay silent on purpose: a reading game needs no click per button, and the sheets they open already play `ui_open`.

The skeleton's first version differs in three values (`purchase_success → buy_level`, `prestige → majority`, `offline_collect → clipping`) and lacks `milestone`; I could not edit the file (not in my package's list), so the change is requested in requests.md.

## Things the specification left open (the reading I chose)

- **Keys.** The skeleton's catalogue shape and keys kept; `music_desk` is `music_main` (the shared player's key), as the skeleton named it. `sign_ink`, `sign`, `study`, `paper_arrive` and `tally` got variants (`files`, `pick: 'random'`).
- **`sign_ink` is a 280 ms one-shot** played when the drag crosses 40 pt (its floor 250 ms: once per gesture), not a sound that follows each pixel: the shared player cannot scrub. Its pressure grows over the file, which is how "growing from 40 pt" is rendered.
- **`study` is the drawer's whole gesture** (creak, slide, thunk) played at the commit; there is no separate drag sound for the pull (none is listed in section 6).
- **"majority and defeat ... heavy":** heavy for `majority`; `defeat` gets `soft` (a defeat is a rare peak, but it should not feel like a win).
- **Haptics the spec did not list:** light for `sign_ink`, `take_back`, `denied`, `buy_level`, `appoint`, `ribbon`, `boycott_end`; medium for `open_ministry`, `boycott_start`, `call_election`; success for `storey`; heavy for `scandal`; none for `clipping`, `env_open`, `tally`, `district_lost`, arrivals and sheets.
- **Section 6 lists "pneumatic air"** but gives it no key: it is the sheets (a capsule by tube).
- **Section 6 asks for pizzicato in the desk loop and forbids "pluck":** I read the ban as the first game's plucked instruments (Karplus-Strong mandolin and pluck); `pizz` is a modal string in the loop only.
- **The scandal's muted trombone** is two notes ("oh dear"), not the four-note descending "sad trombone" every listener knows.

## Not done, or not good enough yet

- **Nobody has listened** (spec 6: "a person listens"; 10.1 #7). Listen first for:
  1. **Signing, fifty in a row** (the nib from 40 pt, the clink): is the nib's squeak pleasant or a fingernail on a blackboard? Is the clink a tray or a coin? Do the three variants make it feel alive or random?
  2. **The drawer, fifty in a row**: does the creak read as a drawer, or as a door or a duck? Is 355 ms too long for a gesture made every few seconds?
  3. **Signing against the drawer with the screen off**: can you tell them apart at once?
  4. **The desk loop for twenty minutes, while reading**: calm or dreary; do the bassoon's remarks nag; is the pizzicato too bassy (it loses 8 dB on a phone, so on a phone it is mostly the brushes and the bassoons)?
  5. **"The Middling March"**: does it remind you of any march, anthem or song you know? (Measured against seventeen I could write down; a person knows more.) Is it pompous in a funny way, or just loud?
  6. **The kazoo chant** (`boycott_start`): funny, or irritating? It must not sound like a real chant.
  7. **`slip_arrive` and `paper_arrive`**, heard every 12 s and between: pleasant for an hour?
  8. **The listed near pairs** against the other three games, side by side.
  9. **The election night**: snare roll, chalk, PAH-oom, the trombone slide, the march: in order, at the 2.5 s pace and at four times that.
- **`music_campaign` is unplayed** until the shared player can choose a loop (requested).
- **The campaign loop's seam** warns (spectral step at p99: from the tag's F7 into the intro's downbeat); level and click are clean.
- **The shared-keys map** in `soundKeys.ts` still has the skeleton's three values (requested).
- **Who plays what when** (`src/modes/decree/actions.ts`, `fx.ts`, the election-night view) is the desk and screens packages' wiring: `sign_ink` once when a drag up crosses 40 pt, `sign` / `study` at the commit, `take_back` on the tap, `denied` when a short sign shakes the strip, `buy_level` on a slip flicked up, `env_open` per envelope, `tally` per chalk mark, `district_held` / `district_lost` per district, `majority` / `defeat` at the result (requested).
