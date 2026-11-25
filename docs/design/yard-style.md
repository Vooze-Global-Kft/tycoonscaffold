# Scrapyard: the look ("hi-vis-and-rust")

The art sheet for the fifth game (yard-design.md 11, ruling 14). Kit: `src/ui/salvage/art/` (README);
pictures: `npx tsx scripts/art/yard-sheets.ts <dir>`, icons: `scripts/art/yard-icons.ts <dir>`.

## 1. The idea

A clean daylight yard someone is proud of: pale concrete, painted yellow lines, hi-vis people, shining
copper and one hot thing, the pour. Unlike the four games (warm cream, cold dark panel, dusk, baize) and
the store's scrap games (dusty desert yards, tow trucks).

## 2. Palette (`palette.ts`, `YARD`)

| Name | Hex | Job |
|---|---|---|
| sky / skyLow | #EAF1F4 / #D6E4EA | loading screen sky, puddle reflections |
| concrete (+Light, Dark, joint) | #C9C4B8 | the yard floor; slabs 3 m with dark joints |
| asphalt | #4B4F54 | the lane outside the gate |
| linePaint | #F4C20D | painted bay lines, pad borders |
| oil / puddle | #2B2E33 at 16-22 % / #B7CCD6 | ground decals |
| galvanised / steel / steelDark | #9AA5AE / #7D868E / #565D64 | tubs, deck plate, frames |
| castIron | #4E5257 | radiators, moulds |
| rust / rustLight | #9A4B2B / #BE6A43 | freckles and streaks, never a whole surface |
| enamel | #F1F2EE | white goods |
| copper / Light / Dark / Sheen | #C8743A / #F0A46B / #8C4A22 / #FFE3C8 | copper and its glints |
| brass / Light / Dark | #D4AF37 / #F2D97E / #987A1C | taps, ingots |
| aluminium | #C7CED6 | cans, wheels |
| hivis / Light / Dark | #F4C20D / #FFE266 / #C99A00 | vests, the one button, crane, guards |
| navy | #36465E | work trousers and sleeves |
| vests: yard hand / cutter / driver | #9CCB3B / #3C8DDB / #1FA59A | crew roles |
| machine / Light / Dark | #5D7387 | machine enamel (blue-grey) |
| containers | #3F6E86 teal, #8F3B2B oxide, #6F806A sage | the yard wall |
| skip | #B8452C | skips |
| glow / glowHot / glowWhite / spark | #FF8A2A / #FFD36B / #FFF6D8 / #FFE680 | heat only |
| ink | #2B2E33 | every line and all text |
| paper / paperShade / paperLine | #FBFBF6 / #E9EAE3 / #C9CCC4 | chips, cards, the ticket |
| stampBlue | #2C5DA8 | the ticket's rubber stamp |
| led / ledOff / ledCase | #6CFF8E / #1E3A27 / #1D2024 | weighbridge digits |

Rules (tested in `art.test.ts`): ink on paper at least 7:1, ink on hi-vis at least 4.5:1; no colour
but the four heat colours lies within 45 RGB of the glow, so orange always means heat; an ingot cools
from glowHot through glow to its metal in 3 s (`coolingColour`).

## 3. Metals are told apart by more than hue

Each material has a colour, a **sheen mark** and a **pictogram** (`METAL`); ladder neighbours differ in
both: light iron freckles/plate, cast iron dots/radiator, steel band/beam, aluminium stripe/can, brass
four-point glint/tap, copper paired ticks/coil, lithium band/cell, iridium facets/crucible. Codes (CU,
BR, FE) in stencil on bays and dot matrix on tickets. In greyscale copper, brass and steel are close in
value: the marks carry them.

## 4. Line and shading

Flat fills in three tones from one base: tops light, south faces mid, turned faces darker (light from
the north-west). Ink outline round every part: 1.2 pt at 40 pt a metre, 1.4 pt round people. A light
bevel line on metal's top front edge. One flat ground shadow (ink 24 %). Gradients only for heat, sky
and the crucible's round body; no blur.

## 5. The three-quarter view

The ground work's: x east, y south, 40 pt a metre, tilt 0.7. Only top and south faces show; east and
west faces are edge-on. Anchor at the footprint centre, sorted by footprint y, shadow on the footprint.
Vehicles turn by any heading (boxes and discs), people by four directions (west mirrors east). Decals
(stains, puddles, lines, pads, the deck) draw before sprites.

## 6. Proportions

- The worker: four heads tall, 47 pt (1.65 m with hat): boots, navy trousers, a vest with silver bands,
  tan gloves. The boss: hi-vis yellow and a **white** hat (the site manager's); crews: role vest, yellow hat.
- Things at true size (a washing machine 0.6 x 0.6 x 0.85 m); hand machines and the crucible at 1.3x.
- Vehicles at two thirds of true length, four fifths of height: the hook-lift truck 4.6 x 2.0 m, white
  cab, hi-vis hook frame, red-oxide skip.

## 7. Pieces, stacks and loads

A piece is a slab in its metal's colours with its sheen mark; a carried load is a stack of slabs on a
back frame (above the hat from the front, on the back side-on). Stock lies in bays of concrete blocks,
the code stencilled on the back wall, a hi-vis flag when held. Cable comes on wooden drums (a flat coil
reads as a tyre); stripped copper as bright bundles; ingots as trapezoid bars with a cast mark.

## 8. The interface

- **Chips and cards** are ticket paper: rounded, a 1.3 pt ink edge and a hard ink drop 2 pt below (no
  blur). The top bar (cash with the § coin, the ladder chip with the rank in an ink badge and a copper
  progress bar, carry, the clipboard), the goal card with its bulldog clip, the padlock chip over a
  locked pad (padlock, what it opens, exact price), price tags.
- **The one button** is a 60 pt hi-vis disc with an ink ring and drop; the stick a pale ring with a
  paper knob.
- **The weighbridge ticket** is the signature object: continuous dot-matrix paper, a sprocket strip down
  the left, torn zigzag edges, a hi-vis header with the yard's name in stencil, the number and date, one
  block per grade (metal square, grade, net mass x posted price, amount), a double rule, TOTAL in bold
  print, and the blue rubber stamp "ID CHECKED · PAID BY TRANSFER" (ruling 10). It rises from the display
  when a load is weighed. The store set's caption strip is the same paper with its sprocket holes.
- **Numbers**: money always with §, masses always with their unit; the weighbridge shows green LED
  digits with ghost eights and no thousands mark.

**Type.** Interface words are the phone's system font (Inter stands in for the pictures): cash 15 pt
heavy, chips 12 (11 small), cards 13, goal 12, button 13, never under 11. Drawn letterings need no font:
stencil capitals (signs, bays, title plates), dot matrix (the ticket, 7 pt), seven segments (displays).

## 9. The loading animation (`loading.draw.ts`)

Daylight sky with a hazy far yard and two clouds, an overhead gantry crane in hi-vis yellow across the
top, the weighbridge deck across the middle, a display on the right leg, a mould in front, a crucible
at the right.

| t (s) | What happens |
|---|---|
| 0.0-0.4 | the trolley runs in from the left with the electromagnet; display reads 0 |
| 0.4-0.8 | it lowers the plate SCRAP (word cut through the steel) onto the deck; the display counts up; landing shake 2 pt |
| 0.8-1.2 | the same with TO |
| 1.2-1.6 | the same with INGOT; display 1240; the trolley runs off |
| 1.6-1.8 | the crucible tips |
| 1.8-2.1 | it pours; the bar fills the mould under the title |
| 2.1-2.4 | the crucible rights itself; the bar cools from orange to brass and glints |
| 2.4-2.75 | the picture parts down the middle like two gate leaves onto the yard |

A tap skips it from the second launch. In the app: one Reanimated shared value `t` (`withTiming`);
`loadingPose(t)` is a worklet giving every moving part; still layers are recorded once as a Skia
picture, moving ones drawn from the pose; the gate is two clipped copies sliding apart. No new dependency.

## 10. The first screenshot and the icon

The proof leads with copper (drums, stripper, bundles at §35.00/kg, the boss carrying copper onto the
weighbridge), the ticket rising from the display and the pour; no truck. Icon candidates: a ladle
pouring with a copper coil; a gloved hand with copper against a ticket; the display printing a ticket
over copper; on hi-vis yellow or daylight blue, colours none of the four games use.

## 11. Never drawn

A real brand, logo or livery, or one shaped like it; a real exchange, flag or currency sign (§ is two
stacked S strokes, never $); a tow truck, crusher, gavel or desert; anyone hurt, without gear, or near
sparks without a face shield; fire, smoke or a hazard made fun (heat is glow and light droplets;
batteries and cylinders only handled properly); a magnet lifting copper (it cannot); a lone gold bar.
