# Scrapyard: the look ("hi-vis-and-rust")

The art sheet for the fifth game (yard-design.md 11, ruling 14). Kit: `src/ui/salvage/art/` (README);
pictures: `npx tsx scripts/art/yard-sheets.ts <dir>`, icon: `scripts/art/yard-icons.ts <dir>`.

## 1. The idea

A working yard in warm late-day light: pale concrete, yellow lines, hi-vis people, shining copper, one
hot thing (the pour under its hood), the far yard past the wall. Not the four games' looks, not the
stores' desert yards and tow trucks.

## 2. Palette (`palette.ts`, `YARD`)

| Name | Hex | Job |
|---|---|---|
| sky / skyLow / far / farDark | #A9C8D8 / #F2DDB6 / #9DAFB8 / #8697A2 | late-day sky (blue to warm cream), far-yard silhouettes in haze |
| concrete (+Light, Dark, joint) | #C9C4B8 | the yard floor; 3 m slabs, dark joints, weeds at some crossings |
| grass / grassLight / sand | #7F9A55 / #A9C46F / #D9C9A0 | weeds; the dry sand under moulds |
| linePaint | #F4C20D | bay lines, pad borders |
| galvanised / steel | #9AA5AE / #7D868E | tubs, deck, frames, the hood |
| rust / rustLight | #9A4B2B / #BE6A43 | freckles and streaks, never a whole surface |
| enamel | #F1F2EE | white goods |
| hivis / Light / Dark | #F4C20D / #FFE266 / #C99A00 | vests, crane, guards |
| apron / apronDark | #D7DBDF / #9EA6AE | the aluminised apron at every pour |
| vests: yard hand / cutter / driver | #9CCB3B / #3C8DDB / #1FA59A | crew roles |
| machine / skip | #5D7387 / #B8452C | machine enamel; skips and the loading plates |
| containers | #3F6E86, #8F3B2B, #6F806A | the yard wall |
| glow / glowHot / glowWhite / spark | #FF8A2A / #FFD36B / #FFF6D8 / #FFE680 | heat only |
| shadow | #2E3A52 at 26 % | blue-grey ground shadows |
| ink | #2B2E33 | every line and all text |
| paper / paperShade / paperLine | #FBFBF6 / #E9EAE3 / #C9CCC4 | chips, cards, the ticket |
| stampBlue / led | #2C5DA8 / #6CFF8E | the stamp; LED digits |

Tested: ink on paper 7:1, on hi-vis 4.5:1; only heat within 45 RGB of the glow; ingots cool in 3 s.

## 3. Metals are told apart by value, shape and mark

| Metal | Base | L* | Piece shape (`pieces.draw.ts`) | Mark |
|---|---|---|---|---|
| light iron | #8E979E | 62 | bent plate, angle iron | rust freckles |
| cast iron | #4E5257 | 35 | radiator sections | cast dots |
| heavy steel (HMS) | #A5826A | 57 | I-beam offcuts showing their section | band |
| aluminium | #DCE2E8 | 90 | crushed cans, channel profiles | long stripe |
| brass | #C2A245 | 68 | taps, valves, elbows (spout, handle, hex) | short light streak |
| copper | #AE5226 | 46 | looped wire bundles, tube offcuts with bright cut ends | paired ticks, at least 4 pt |

Ladder neighbours (lead, lithium and iridium included) are at least 20 L* apart (tested). Brass is dull
olive, never polished gold. Bays, heaps, skips and the carried stack use the grade's own pieces.

## 4. Line, shading and light

Flat fills in three tones (tops light, south faces mid, turned faces darker), ink outlines (1.2 pt, 1.4
round people), a light bevel on metal. Low west sun: shadows swept east 0.42 m per metre of height
(`SUN`), blue-grey, never mirrored. Screenshots add a warm wash from the west. The pour lights the
ground and, by `lit()`, the furnace hand. Gradients only for heat, sky, the hood, round bodies; no blur.

## 5. The three-quarter view

The ground work's: x east, y south, 40 pt a metre, tilt 0.7; top and south faces show. Anchors at
footprint centres, sorted by footprint y. Decks and pads have a 3 pt front lip of darker concrete, so
they sit in the view. Every vehicle heading is the same projection: a truck turned 45 degrees shows a
diamond footprint because the world's grid is drawn that way, not a second projection. Seen end-on, a
wheel is a tread block. Past the north wall the far plane (`drawSkyline`) shows a tree line, container
stacks, a dock crane and a chimney.

## 6. Proportions and people

The worker: four heads, 47 pt (1.65 m), navy, banded vest, gloves. Boss: hi-vis, white hat; crews: role
vest, yellow hat, five skin tones and hair by crew index. At every pour: shield and aluminised apron. Hand
machines 1.3x, the furnace corner 1.2x, vehicles two thirds of true length.

## 7. Things

Cable on wooden drums (a flat coil reads as a tyre). Washer pieces: perforated drum, motor with copper
windings, bent panels. Taps stand out of their crate. The gate tip shows a wheel rim, a pipe, a panel. The furnace: a tilting crucible furnace on trunnions under a galvanised hood with its duct, lid
swung aside, a tilt wheel; its lip stands above the mould at full tilt and the stream falls straight
down, thick at the lip, into a mould on dry sand. Ingots are notched bars with a stamp; no sparkle.

## 8. The interface

Chips and cards are paper with a 1.3 pt ink edge and a hard drop: top bar, goal card, padlock chip
(drawn only when wholly on screen), price tags, the 60 pt button, the stick.

**The weighbridge ticket** is the signature object and is always tied to the weighbridge: it feeds out of
the printer slot under the display's LED digits, which stay visible and show the same kilograms.
Continuous paper, sprocket strip, torn edges, hi-vis header with the yard's name in stencil, number and
date, per grade: metal square and grade; net x price; amount; then TOTAL and the blue stamp "ID CHECKED
· PAID BY TRANSFER". Print is 7 pt in play and 9 pt in store pictures. It is never a caption template:
the store set's captions are plain ink on the late-day sky, not paper tags (Lantern Row and Proudly
Adequate already own paper).

**Type.** System font (Inter in pictures): cash 15 pt heavy, chips 12 (11), cards 13, goal 12, button 13,
never under 11. Drawn letterings: stencil capitals (bridges thin, at one joint: O a ring bridged top and
bottom, I solid, E and F with the middle arm bridged, B D P R bridged at one bowl joint), dot matrix,
seven segments with a clear decimal point.

## 9. The loading animation (`loading.draw.ts`)

Horizon at 56 % of the height, the far yard on it; a hi-vis gantry crane with A-frame legs, lattice
girder and cab; the weighbridge deck; the display on its post right of the plates; in front, a mould of
five cavities fed by a launder, the crucible in its tongs on a tilting stand, the furnace hand at the
handwheel in shield and apron.

| t (s) | What happens |
|---|---|
| 0.0-0.4 | the trolley runs in with the electromagnet; display 0 |
| 0.4-1.6 | three red-oxide plates, SCRAP / TO / INGOT cut through (the sky shows in the letters), lowered onto the deck one by one, each landing with a 2 pt shake and two sparks; the display counts to 1,240 |
| 1.6-1.8 | the trolley runs off; the crucible tips |
| 1.8-2.1 | the pour: the stream fills the launder and the cavities west to east; the glow lights the plates from below and the ground; sparks |
| 2.1-2.4 | the crucible rights; the ingots cool to brass with notches and a stamp; the display prints a short ticket, LOADED, 1,240 KG, ID OK |
| 2.4-2.75 | the picture parts down the middle like two gate leaves onto the yard |

In the app: one Reanimated shared value `t`; `loadingPose(t)` is a worklet; still layers recorded once as
a Skia picture; the gate is two clipped copies sliding apart. No new dependency.

## 10. The first screenshot and the icon

The proof: the far yard over the wall; cable drums, the stripper, bare bright bundles at §35.00/kg; the
boss carrying copper on the weighbridge; the ticket out of the display; the pour; bays in their own
pieces. No truck; the stick over open ground. The icon (`yard.icon.ts`): on hi-vis yellow, a
refractory crucible in steel tongs pours a copper-orange stream straight down into a glowing copper ingot;
a bundle of bare bright wire with cut ends at the lower left.

## 11. Never drawn

A real brand, logo or livery, or one shaped like it; a real exchange, flag or currency sign (§ is two
stacked S strokes); a name the names register changed; a tow truck, crusher, gavel or desert; anyone hurt,
without gear, or near sparks without a shield; fire, smoke or a hazard made fun; a magnet lifting copper;
four-point sparkles; a lone gold bar; polished-gold brass.
