# Proudly Adequate: the sensitivity and comedy reads (engineers' reads, D9)

**Unsigned by any person.** Under decision D9 the comedy editors and the sensitivity readers of this build
are engineers, and their reads are recorded here as theirs. Nobody has signed this file. The owner (or
someone the owner names) still reads the game, and this file, before the first store submission
(RATING-NOTES.md, "By hand", item 6). Brought into the store folder by the store step on 24 November 2026
from the content desk's record; the working files it names (`scratchpad/office/...`) were the build's
scratch folder and are not in the repository: the assembled texts in `scripts/content/office/` are.

The store images (screenshots/, made from the game) show three papers whose words the owner's read should
also hear: may-bus-named ("Name the 7:02 bus after you, Mayor"), may-pumpkin-freedom ("Grant the prize
pumpkin the freedom of the town", note 6 below: the Freedom of the Town is a real civic honour) and its
follow-up ("now a Freeman of the town ... It has slides").

---


**These are engineers' reads under D9, not a person's signature.** In this build the comedy editors and the
sensitivity readers are engineers. Nothing here says a person read or signed the game. The owner's read (or
the read of someone the owner names) has not happened yet. It is still required before any store submission,
and it is on the list of what the owner must do. The notes the owner's read should look at are at the end.

## 1. The comedy read (writers, batch editors, the editor in chief)
- 27 batch files under `scripts/content/office/batches/`. Each was written by one writer and then read and
  rewritten by a batch editor (`notes/write-*.md`, `notes/edit-*.md`).
- The editor in chief (content-assemble) read every record as a player meets it, office by office, and built
  the 11 assembled files of 9.2 W. About 55 records were changed at assembly and none were cut. The reasons
  are in `scratchpad/office/content/edits.py`, the `EDIT` block.

## 2. The sensitivity read: four engineers, every shipped string
Each string was read three times: as the policy desk, as a parent or a reader from another background, and as
the player on the hundredth paper. Readers searched only with generic terms.

| Reader (label) | What was read | Strings | must | should | note |
|---|---|---|---|---|---|
| content-read-mayor | papers.mayor.json, papers.any.json | 263 | 1 | 8 | 8 |
| content-read-governor | papers.governor.json, templates.json (120 frames + 12 bigger studies), phrases.json (240) | 573, plus 720 filled frames (all 2,880 fillings length-checked) | 1 | 7 | 6 |
| content-read-president | papers.president.json | 267 | 1 | 15 | 8 |
| content-read-rest | chains, forms, events, campaign, lines; names.json (171 entries) | about 1,084, plus 171 register entries | 2 | 14 | 13 |
| **Total** | | **about 2,190 strings**, plus 720 fillings and 171 names | **5** | **44** | **35** |

None of the readers changed a file. Their findings went to the editor in chief.

## 3. What changed (content-assemble, the one pass)
Every change is in `scratchpad/office/content/edits.py`, in the `SENS` block, with its reason, and is applied
by `assemble.py`. The batches stay as the writers' record.

- **All 5 must-change findings were changed.** These were the hat favour that won a prize; the band route; the
  KITES WELCOME sign (now KITE CUSHION); the Quiet Press twist (now Busy Presses, with its five pairs); and the
  Acting caption (it now says the winner resigned for a hobby, D6).
- **42 of the 44 should-change findings are changed in the assembled files.** In none of them did the editor
  conclude the reader was wrong. Some got a new joke rather than the reader's wording, for one of these
  reasons:
  - the reader's line was over 90 characters, or did not fit its box (gov4-signpost-forms, the Busy Presses
    text, the Clerk's notes);
  - it duplicated another paper (the prize pumpkin pose is the mayor's, so the president poses with an onion);
  - "any other vegetable" would have called the president a vegetable, the same problem the reader flagged in
    MAYOR APOLOGISES TO VEGETABLE (now "entered you as an exhibit");
  - the lint failed it ("Sorry Season" became "Mending Season"; "a tuba's length" beside pumpkins is a size
    word by an object, so it became "four deckchairs");
  - D30's 72-character frame median (tpa-title-capitals, tpa-title-horns).
- **The other 2 are waiting on the names register** (names.json, which content-names owns; requests.md):
  - Cyril Dunnock is to become Silas Dunnock once the register has the name after its four-list check.
    `edits.py` applies it automatically when names.json has it.
  - Ambrose Minute's role in the register still reads "Committee on Committees". The runtime name is already
    "Committee on Next Meetings".
- **6 notes for the owner were fixed** because the fix cost nothing:
  - any-allotment-ribbon: clarity.
  - The cufflinks are now tin, so they are not jewellery of value.
  - pres-mill-shade: "on the band" was unclear.
  - pres-tills-teas-bandstand: its subject tag.
  - GOVERNOR'S FACE BOBS ON CANAL: a drowning picture.
  - SAME WIND TWICE: now BREEZE.
- In total, 78 player strings and 1 tag changed. Nothing was cut, and every count of 7.7 (with D19) holds.
  `check.ts --all --final` reports 0 errors and 25 warnings. Every warning is a near-duplicate already read
  (shared words, not shared jokes), apart from the label box assumption on "Return the scissors". Each deck's
  hand-written median is still 65.

## 4. For the owner's read (the notes: kept, and worth a person's ear)
1. "Proudly Adequate" (the motto and title, D1), with may-motto-paint ("We will pay to paint PROUDLY ADEQUATE on
   the bus station"). The phrase echoes a real country's buy-local campaign, "Proudly <country>". It stands or
   falls with D1's name search.
2. The vanity motif in all three offices: may-vanity-signature (signature on every ticket, "each journey,
   approved"), may2-shelter-portrait (portrait at every stop); the governor's portraits in every hall and
   corridor, face on vans, mugs, a song; the president's stamp, coin, clock, forecast, lighthouse initials,
   lamp plaques, coach wave, birthday holiday. Each is fair vanity at your expense. Together they come near a
   personality-cult read, heaviest in the president's deck. The birthday holiday also echoes monarchs' and
   one-party leaders' birthdays.
3. Counting jokes near the votes rule: gov-fish-census ("fourteen, or one fish fourteen times"), and caption 0
   ("unopposed. The other candidate went to the wrong hall"), which is the first thing a player reads.
4. Moving people on from public space: may3-standing-licence and may4-hatter-queue. Each is mild. Do not add
   more of this kind.
5. The bus-spotter jokes (may2-timetable-reading, may3-photocopier, may4-notebook-witness) lean on the
   "trainspotter" stereotype. They are affectionate, but the hobby must never be the butt.
6. Faint real echoes:
   - may2-what-is-a-vegetable (school-lunch vegetable rows);
   - may2-right-of-way (land access);
   - gov4-pound-group (imperial against metric);
   - the Freedom of the Town / Freeman (a real civic honour);
   - Tidy Hedge Committee (Ireland's Tidy Towns);
   - Sunday quiet (Sunday trading and Sabbath; chains[1], chains[24], a rival's slogan);
   - named benches and plaques (memorial benches);
   - pres-kite-awnings (Magritte).
7. Mild innuendo or fear to hear aloud:
   - pres-willow-hedge ("droop" plus "inspect");
   - the marrows in the president's deck (the reader counted 13 papers; this pass took out two marrow mentions, 24 to 22 occurrences in texts and favours) and repeated openings ("A study"
     16, "Then" 16);
   - gov-bridge-ride ("look brave" on a mended bridge);
   - note "the canal has been dredged. It gave back a hat";
   - the motorway-board notes (a ribbon across a slip road, next to 7.2's traffic rule).
8. gov3-nose-prints: nose prints filed by height. Is that a body measure, and does it suggest children?
9. Strop's slogan "Firmly Seated", among president rivals: an incumbent who will not leave? The night line is
   fine.
10. events.frontPages[13], PRESIDENT AWARDS SELF THE FOLDED NAPKIN: a dictator trope, but the butt is plainly
    you.
11. Names that call up someone:
    - Rupert Borage (a player face: a press baron, Rupert Bear);
    - "Early Doors" (a Britishism most other players will not parse);
    - chain title "One Bar" (shown alone, it reads as a pub first).
12. Lists the reader tested and found neutral, recorded so the owner can confirm: the hats list (a flat cap, a
    deerstalker) and pres-fountain-cufflinks as a gift (now tin).
13. Owner note from the rest reader, D6: the Acting caption should always be shown right after the rival's
    resignation line. The caption now carries the reason itself.
