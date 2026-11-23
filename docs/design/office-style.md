# High Office: the style sheet

Read this before you write a word. It is the comedy editor's; the specification (`office-design.md`, whose section 11 overrides its body) overrides it. Field and tag names are those of `scripts/content/office/format.ts`; your quotas are in `scripts/content/office/plan.json` (section 8 prints them). Check your file with `npx tsx scripts/content/office/check.ts scripts/content/office/batches/<your batch>.json`.

The one promise behind every line: **everything is invented, the joke is on office (first of all on you, the player's character), and nothing in it would trouble a parent of a twelve-year-old.**

---

## 1. The world in one page

**The Republic of Middling.** Motto "Proudly Adequate". Its founding law was written on a napkin, which is kept in a drawer. Emblem: a pair of giant ribbon-cutting scissors over a folded napkin on a beige field (D12). The goose is written, under its ration, and is never the Republic's mascot or symbol, never on the emblem, and never drawn (or described in a picture) holding an object. Tune: "The Middling March" (a fixed name, not an anthem; "march" appears nowhere else). Currency: the **dib** (plural dibs). There are no parties, no colours that stand for sides, no left or right. People belong to **hobby clubs**, and that is all the politics there is.

| Office | Where | Districts | Newspaper | Your desk, your extra advisor |
|---|---|---|---|---|
| Mayor | Dithering-on-the-Dawdle (a small town on the River Dawdle) | 5 wards: Market Ward, Mill Ward, Hilltop, Riverside, Old Town | the Dithering Daily Drizzle | oak desk |
| Governor | the Province of Upper Wobbling | 7 counties (writer 2 names them first) | the Upper Wobbling Evening Fuss | mahogany, a green lamp; Deputy Pruella Dimity |
| President | the Republic, capital Middlingham | 9 provinces: Middlingham, Fogmoor, Brassby, Teacup Downs, Gusting Heights, Muchpuddle, Saltpenny Bay, Kitecombe, Upper Wobbling | the Middling Morning Murmur | a long walnut desk, three telephones; Secretary Mildred Fenn |

Free to use: in Dithering the clock tower, the bus station, the high street, the duck pond, the patch (the weigh-in field), the Hilltop bandstand, the town hall, your parking space; in Upper Wobbling the canal, its jetty and locks, the glasshouses; in the Republic the motorway, the lighthouses, the harbour at Saltpenny Bay. Any other proper noun is a proposal for `names.json` in your batch's `note` (at most three per batch).

**The clubs.** Hobby clubs only. Members are sincere, competent and fond of their hobby; the joke is never that they have it.

| id | Club (short name) | Hobby; what they prize | Offices |
|---|---|---|---|
| `bus` | Bus Spotters' Society (Bus) | logging buses; notebooks, flasks, the 7:02, timetables | all |
| `shops` | Shop Window Guild (Shops) | window displays; polished glass, Window Week, hats on stands, the shop bell | all |
| `veg` | Giant Vegetable Society (Vegetables) | growing prize vegetables; the weigh-in, rosettes, the prize pumpkin | all |
| `brass` | Brass Band Guild (Brass) | the band; Sunday concerts, the tuba, the bandstand, sheet music | governor, president |
| `anglers` | Anglers' Circle (Anglers) | sitting by water, quietly; floats, lines, the jetty, the Quiet Competition (never "rod" or "tackle") | governor, president |
| `kites` | Kite Flyers' League (Kites) | kites; wind, string, the Gusting Heights festival | president |
| `hedges` | Tidy Hedge Committee (Hedges) | topiary; straight edges, shears, the hedge show | president |

**Who minds what** (a paper's "other" club needs one of these, or a reason in the text). Feuds: spotters' noses on the Guild's glass; spotters standing on the pumpkin patch to see the 7:02; the band practising by the anglers' water; kite strings in the Committee's hedges. Frictions: displays block the timetable; the weigh-in fills the high street; the tuba rattles shop windows; bus horns at the canal bridge; the Guild decorates the jetty; growers water from the anglers' pond; kites land on shelters, awnings and the patch; the kite festival and the concert want the same hill; strings tangle fishing lines; the Committee trims the hedge the spotters lean on and the willow the anglers sit under. A hedge never keeps anyone out.

**Honours** (invented, no titles): Grand Goose (First and Second Class; a name in `names.json`, a word only, never a badge with a goose on it), Keeper of the Ceremonial Spoon, the Freedom of the Town, the Brass Thimble, the Ribbon of Moderate Merit. Never knight, dame, sir, lord, lady, crown, king, queen, royal.

**What does not exist here.** Parties, colours, left and right; votes as a joke (ballots, counting, cheating); uniforms, soldiers, police, clergy, prisons; children, schools, hospitals, illness; drink, smoking, gambling, swearing, violence, fear; taxes, wages, pensions, rent, housing, prices; traffic restriction, lanes, parking schemes, road charges, tolls; borders, arrivals, keeping people out, nationalities; religion and its holidays; weather worse than a picnic drizzle; anything real (people, places, brands, shows, slogans, events, games); money handed to a person.

---

## 2. The cast bible

Visitors come from this list only (a paper's `visitor` is the id). No new named people. Your batch's `cast` in `plan.json` says who may appear in it; a portable paper uses only `portableCast`.

**You** (`player`, never a visitor): one of six faces (Hettie Bramble, Osgood Fennel, Ada Quill, Rupert Borage, Winifred Chervil, Cosmo Larkspur). Addressed as "Mayor", "Governor", "President", or "you"; never "Mr President", "Madam", "sir". The main butt: vain, fond of ribbons, photographs and your own name on things; never stupid, never cruel.

| id | Name, role | Club | Offices | Voice | Wants | Never |
|---|---|---|---|---|---|---|
| `spinwell` | Rodney Spinwell, Chief of Staff | | all | brisk, flattering, sure | your name on things; good photographs | lies about numbers; mocks voters |
| `abacus` | Gwendolyn Abacus, Treasury Clerk | | all | exact, unimpressed | the books balanced | a joke at the treasury's expense of anyone but you |
| `wimble` | Cuthbert Wimble, junior clerk | | all | keen, procedural | a form for everything | panics; complains |
| `dimity` | Deputy Pruella Dimity | | governor | dry, always near lunch (the joke is the sandwich, never her body) | sandwiches; an early finish | flatters you |
| `fenn` | Secretary Mildred Fenn | | president | has seen three presidents and liked one | quiet; the drawer kept tidy | says which one |
| `kerb` | Desmond Kerb, Bus Spotters' Society | bus | all | precise, timetabled | buses honoured and on time | sneers at other hobbies |
| `sprott` | Mervyn Farestage, Timetable Secretary (new) | bus | all | eager, footnoted | a complete record | — |
| `till` | Pauline Till, Shop Window Guild; Till's Teas | shops | all | brisk, commercial, polite | displays seen; Till's Teas mentioned | haggles; pressures; appears in a line about hardship |
| `awning` | Delphine Awning, Display Captain (new) | shops | all | artistic, exacting | the perfect window | — |
| `gourdley` | Hilda Gourdley, Giant Vegetable Society | veg | all | proud, formal, fond of the pumpkin | the pumpkin respected | boasts of size |
| `loam` | Bertram Loam, Weigh-in Steward (new) | veg | all | slow, careful | fair scales | — |
| `bellows` | Horace Bellows, Brass Band Guild | brass | gov., pres. | hearty, loud on paper too | an audience | shouts at anyone |
| `slide` | Cecily Slide, Second Cornet (new) | brass | gov., pres. | modest, practical | a place to practise | — |
| `hake` | Marigold Hake, Anglers' Circle | anglers | gov., pres. | hushed, patient | silence by the water | catches or harms a fish (fish are only watched) |
| `dabble` | Ewan Reedmace, Keeper of the Quiet (new) | anglers | gov., pres. | whispering | nobody noticing him | — |
| `loft` | Wendell Loft, Kite Flyers' League | kites | president | airy, optimistic | wind and room | — |
| `updraught` | Philomena Updraught, Launch Marshal (new) | kites | president | breathless with excitement (never unwell) | the first kite up | — |
| `topiary` | Agnes Topiary, Tidy Hedge Committee | hedges | president | crisp, exact | straight lines | builds a hedge to keep anyone out |
| `edging` | Osmund Edging, Shears Officer (new) | hedges | president | slow, measuring | an even edge | — |
| `sash` | Lionel Sash, Ribbon Makers' Guild | | all | oily-polite, "no reason" | more ribbon-cuttings | offers money |
| `vane` | Crispin Mizzle, Consolidated Umbrellas | | all | gloomy, hopeful of rain | more rain in speeches | wishes harm by weather |
| `goss` | Lavinia Plash, Ornamental Fountain Council | | all | grand, damp | fountains, ideally of you | — |
| `slake` | Tobias Slake, Novelty Hats & Sons | | all | jaunty | hats on everything | — |
| `minute` | Ambrose Minute, Committee on Next Meetings | | all | ceremonious; a co-signer only | more meetings | speaks for a club |
| `tallow` | Agatha Tallow, Counting Clerk | | all (election night) | plain, exact | the count read straight | jokes about the count |

Lobbyists speak only for their own absurd trade; their gifts are fruit baskets, a fountain shaped like you, a hat with a smaller hat on it, an umbrella "just for you". A gift is never money and never pays.

**Ministers** (they apply; their applications are writer 4's; the desk rule is the rules'): `pockle` Dorothy Sett (Bus; "References: 'She found one.'"), `pellow` Dorrit Pellow (Vegetables), `ferrule` Basil Ferrule (Shops), `hush` Wendeline Hush (Shops), `bole` Henrietta Bole (Brass), `gusset` Percy Plummet (Anglers), `wren` Marjorie Wren (Kites), `tamp` Osric Tamp (Hedges), `nibley` Florence Mayfly (Anglers). Each is competent and slightly too proud of one small achievement; an application never names a ministry (the role line does), so it reads true in any office.

**Rivals**: individuals with a hobby and a slogan, never a party, colour or cause; they resign to spend more time with the hobby, never over pressure, health or scandal. Every name here is in `names.json` with its check (the sensitivity editor's read of 2026-11-23, recorded as an engineer's, D9). Ids are internal and were kept where code or `plan.json` already uses them (`plumb` and `crumb` became `stitchley` and `kalends`; the proposed rivals' ids follow their new names).

| id | Rival | Office | Hobby |
|---|---|---|---|
| `stitchley` | Councillor Prudence Stitchley | mayor | her hat (slogan "Stitchley: She Owns A Hat") |
| `dunnock` | Cyril Dunnock | mayor | doorbells |
| `setter` | Philippa Setter | mayor | setting crosswords |
| `waft` | Leander Waft, Keeper of the Ceremonial Spoon (role line "Keeper, Ceremonial Spoon") | governor | the spoon ("Waft: Gently Onwards") |
| `mallowby` | Hortensia Mallowby | governor | the accordion |
| `noonday` | Fergus Noonday | governor | sundials |
| `kalends` | Professor Ozias Kalends | president | calendars ("Kalends: Abolish Wednesdays") |
| `strop` | Ottoline Strop, Grand Goose (Second Class) | president | chairs ("Strop: Firmly Seated") |
| `ringrose` | Lettice Ringrose | president | handbells |
| `mould` | Aldous Mould | president | his compost heap |
| `dovecote` | Araminta Dovecote | president | pigeons |
| `pharos` | Ivo Pharos | president | model lighthouses |
| `lathe` | Honoria Lathe | president | tapestry |
| `furlong` | Quentin Furlong | president | the harmonica |
| `tessel` | Imogen Tessel | president | jigsaws of plain sky |
| `pantry` | Rufus Pantry | president | barometers |
| `ambling` | Gertrude Ambling | president | her walking boots |
| `knapp` | Bartholomew Knapp | president | yodelling |

The sensitivity read of 2026-11-23 renamed 22 names (reasons in `names.json`): use only the names on this page, never an old one. A rival's surname appears at most once per line. The seven "new" deputies take the busts to about 52 (7.3 says about 48).

---

## 3. The voice: deadpan-memo

Dry official language about something silly. The paper is written by a person who means it. The joke lands on office, red tape or you, and it lands in the last four words. No puns as the joke, no pop culture, no catchphrases, no winking ("just kidding", "imagine!"), no policy opinions: a paper never says one way of running things is better.

### The eight joke shapes (`shape` tag; each at most 20 % of a deck, never two in a row in your file)

**`undercut`**: a dignified statement deflated by its last words.
- "The new clock is accurate to the second. Which second is still under discussion."
- "We have mended the bandstand roof. The part over the tuba."
- "Name the 7:02 bus after you, Mayor. It is late too, and also waves."
- Bad: "We mended the roof. LOL, not really!" (signals the joke; an exclamation; no official voice).

**`escalation`**: a request that climbs in steps, or returns bigger.
- "Paint one pothole gold, as a landmark. The others will want one too."
- "A ribbon for the bench. A ribbon for the bench's plaque. A plaque for the ribbon."
- "We propose a study of why our last study took nine years. It should take about ten."
- Bad: "A bigger bandstand, then a bigger town, then the whole world." (leaves the world we have; the steps are not specific).

**`literalism`**: an official phrase taken at its word.
- "Grant the prize pumpkin the freedom of the town. It has asked very politely."
- "Cut red tape at the town hall. Lionel Sash sells it by the metre."
- "The Anglers would like a quiet word with you. They have chosen the word."
- Bad: "The spotters want you to go the extra mile. The 7:02 does not." (a pun on a stock phrase is the whole joke).

**`form-misapplied`**: procedure applied to something that never needed it.
- "Planning permission for a sandcastle. Two copies, one for the sandcastle."
- "The duck pond requests a licence to be a pond. It has been one for years without."
- "Practise on this one. It is a form about forms. File it FOR FURTHER STUDY."
- Bad: "Make everyone fill in a form before they may vote." (votes; a real procedure; an opinion).

**`statistic`**: a number with official gravity about a silly thing. Numbers in the text are about the thing, never dibs, moods or papers.
- "Bus spotting is up 4 %. The buses are the same; the survey was taken at the 7:02."
- "Potholes are down by one. It moved."
- "Move the weigh-in off the high street. Our windows are 40 % pumpkin."
- Bad: "Sales on the high street fell 3 % after the bandstand opened." (a real-economy claim; reads as policy).

**`slogan`**: a motto or sign, read deadpan.
- "A sign for the bus station: DITHERING. YOU ARE PROBABLY HERE."
- "Let Till's Teas sponsor the clock tower. It would chime TILL'S TEAS on the hour."
- "A motto for the shop windows: LOOK, DO NOT LEAN."
- Bad: "Paint MAKE DITHERING ADEQUATE AGAIN on the water tower." (echoes a real slogan; fails the lint).

**`photo-op`**: you, posing.
- "Attend the weigh-in, Mayor, and say 'goodness'. We will cue you."
- "Pose beside the new pothole before it is filled. For the 'before'."
- "Be photographed reading a book. Rodney has chosen one with your name on it."
- Bad: "Kiss a baby at the bus station for the Drizzle." (children; a real campaign cliché).

**`callback`**: pays off a running joke every player has met: the drawer FOR FURTHER STUDY, the first fruit basket, Till's Teas, Rodney, your parking space, the napkin the founding law is written on. A comic paper never calls back to a chain or another comic paper (the player may not have seen it); that is what chains are for.
- "The drawer FOR FURTHER STUDY is full. Cuthbert proposes a second drawer, to study the first."
- "Lionel Sash sends a basket to apologise for the last basket. No reason."
- "Make your birthday a national holiday. Mildred has a drawer for these."
- Bad: "The pumpkin is still facing the wall." (a chain's set-up the player may never have seen).

### Rations, length, and the rules that never bend

- **Rations per deck** (your batch's share is in `plan.json`): the goose at most 1 paper in 40; biscuits 1 in 60; one statue (or bust) per office deck, none in the any-office deck (statues live on the vanity shelf); at most 1 exclamation mark per 50 papers. Write none of these unless your batch has the ration.
- **Length**: a paper is at most 90 characters. Your batch's median is at most 65; at most 20 % of it is "long" (81 to 90). Aim at 45 to 70. Two short sentences beat one long one. Name ≤ 24, role ≤ 28 (from the cast). Clippings ≤ 60, picket slogans ≤ 18, labels ≤ 28, Clerk's notes ≤ 48 (60 hard).
- **No innuendo.** No vegetable, fruit or object is ever soft, hard, long, big, firm or "at length", nor thick, stiff, swollen, plump, juicy, huge, impressive or erect; no "size", "length" or "girth" of anything. A pumpkin is "prize", never large; if you need a size word, the joke is the wrong joke. The check (`deny-innuendo.txt`) fails some words always, and a size word within three words of a vegetable, fruit, nut, rod or pole; a size word alone passes ("the meeting ran long", "a new member"). A reader catches the rest: never "rod", "tackle" or "impressive" near anything an angler, a band or a grower holds. Fixed names pass: The Very Long Bridge, Giant Vegetable Society, Long Lunch, "a firmer tone", "no hard feelings".
- **No joke about how votes are cast or counted.** No ballots, recounts, extra votes, the pumpkin voting, counting badly. Election night is played straight.
- **No numbers the rules own.** Never write dibs, a price, a mood, a number of papers or days in the text: the strip prints those, and a text that disagrees with them breaks the game's first promise.
- **Office words** (Mayor, Governor, President, the town, province, county, ward, national, Republic, the newspaper's name, Pruella, Mildred) never appear in a `portable` paper or the any-office deck. Portable papers say "you".

### Words to avoid

Ordinary words the check stops in every sense, because another sense is a subject the game never touches (the lint attack's false alarms; `hints.txt` is the list, and the check prints its replacement). The swap costs the joke nothing.

| Avoid | Write |
|---|---|
| strike, struck (a clock); toll (a bell) | chimes (or, for a club, a boycott); rings |
| rent; housing; welfare; tax | hire; case; wellbeing; fee |
| march (and months after April); union; demonstration; recount | a walk, parade round, "in spring"; merger; display; tell, go over |
| battle, army, invaded, colony, surrender, attacked, veteran | contest, flock, took over, flock, hand back, pecked, old |
| crown; king; queen; sir, madam | the top of your hat, the bowling green; grand; the head bee; "Mayor" or the name |
| bush, border, blind, butt | shrub; edge, bed ("flower border" passes); "window blind" or "roller blind" pass, else shutter; rain barrel |
| crazy, mad, mental, miracle, angel; punch; execute; regime | mini golf, unusual, in his head, wonder, sponge; lemonade; carry out; routine |
| a food named after a place (Victoria sponge, Swiss roll, Danish, Welsh rarebit, Turkish delight, Scotch egg, Eccles cake, Brussels sprouts, French beans) | the food without the place: sponge cake, a pastry, sprouts, chard, runner beans |
| sick, ill; pint; uniform; school, children | away, not in today; a cup of tea; the band's matching jackets; nothing (they do not exist here) |
| a red (or any colour) rosette; dead heat | a first-prize rosette; a tie |
| number ten (a bus); "papers, please" | the 7:02 (buses go by their times); leave out (another game's title) |

### Who may be the butt (`butt`: self, office, staff, lobbyist, committee, visitor, rival, thing)

Aim at the powerful: you first, then the office and its staff, lobbyists, committees, rivals; or at a thing (the clock, the pumpkin, the 7:02). A `visitor` butt is that one person's own vanity, never their club's hobby. Never a club. Never a group of real people (an age, a job, a region, anyone outside the game).

| Aimed right | Aimed wrong |
|---|---|
| "Name the 7:02 after you, Mayor. It is late too, and also waves." (self) | "Name the 7:02 after the spotters. It is the only thing that waits for them." (the club, as lonely) |
| "The committee has met to decide when to meet." (committee) | "The committee is slower than pensioners in a queue." (a real group) |
| "The clock has gained a minute. It will not say where from." (thing) | "The Anglers want quiet. Nobody talks to them anyway." (the club) |

---

## 4. How each archetype reads on paper

You never type a number, but the words must make both printed outcomes obvious. Before you write, say to yourself: **who asks, what they get, who is put out and why, where the money goes or comes from**. Every archetype except the two traps names an `other` club; the reason they mind is in the text or is one of section 1's frictions.

- **Project** (sign: the town pays a small sum, the petitioner pleased, the other put out; refuse: the reverse). The petitioner's club asks the town to build, mend, put up or grant something for their hobby. The cost is implied by the thing (a shed, a sign, a hill). The other club loses space, view or quiet. Examples: "Grant the prize pumpkin the freedom of the town..." (G5); "Build Kitecombe a hill..." (G21). **Mistake:** a project that costs nothing in the fiction ("Say something nice about pumpkins": that is a Treat), or one nobody minds.
- **Swap** (no money; petitioner gains what the other loses; refusing gives it back). Zero-sum: one place, day, name, slot or view both clubs want. Examples: G6 (the 7:02), G9 (the weigh-in in the windows). **Mistake:** a swap whose other club has no reason to mind ("Light the bus station at night" taken from the Guild: they lose nothing).
- **Fee** (sign: the town earns, the petitioner a little pleased, the other clearly put out; refuse: mild). The petitioner's club (or Till's Teas) pays the town, openly, for a sponsorship, a hire, a booking, a licence or naming rights; the other minds the loss. Examples: G3 (Till's Teas chime), G16 (the silent Sunday), G23 (hiring the wind). **Mistake:** a fee that earns nothing in the fiction (no one pays), a fee the petitioner would hate ("Charge the spotters per bus"), money to you personally, or anything like a tax, a charge on roads or parking.
- **Treat** (no money; the petitioner pleased, the other a little put out, gossip rises; refuse: the petitioner sulks). A small honour or gesture: you attend, judge, wear, say, pose. Gossip rises because someone will call it favouritism or print the photograph. Examples: G8 (say 'goodness'), G17 (conduct one bar), G22 (the modest hedge). **Mistake:** a treat that would cost money (a new building), or one with nothing for anyone to talk about.
- **Committee** (sign: a small sum, the petitioner barely pleased, the other put out, and it comes back as a bigger study; refuse: the petitioner put out). A study, inquiry or working group on something silly, usually with Ambrose Minute as `cosigner`; the other minds because it is about them or takes their place. Every Committee carries its **bigger study** (`biggerStudy`, ≤ 90; D20): the same study back, asking for more. It prints as a Committee one money tier up, and nothing comes after it (no ↩ on it; write it as the last word, not a set-up). Examples: G7 (the study of the study), G18 (the working group on noise), G24 (the inquiry on the top deck). **Mistake:** a committee about a real policy ("a review of benefits"), or a bigger-study line that is not bigger.
- **Vanity** (trap; sign: a large sum and every club a little put out; refuse: nothing). An advisor (Rodney, Pruella, Mildred, Cuthbert) proposes something about you: your portrait, your name, your birthday, your signature on the jam. No club gains; it is plainly expensive and plainly about you. `club` is the club whose thing it touches; the draw ignores it (D20: vanity is one cell per office). The visitor may still be a club's spokesperson, for flavour, if the paper is still plainly about you. Examples: G10, G19, G25. **Mistake:** a vanity paper some club would like (a statue at the bandstand the band would love): then "every club put out" does not follow.
- **Basket** (trap; sign: gossip, and the favour comes back; refuse: nothing). A lobbyist brings a gift and hints, badly, at their trade; it never pays, pleases a club or names an amount. `club` is the club the favour puts out (one basket cell per office, D20; the giver is a lobbyist, or a club's spokesperson for flavour, never speaking for the club). Every Basket carries its **favour** (`favour`: text ≤ 90, two clippings ≤ 60): the lobbyist returns to collect something that puts that club out. It prints as 2.2 has it: sign, that club put out and gossip up; refuse, "No change"; the signed clipping mocks you. Examples: G4 and its chain, G20, G26. **Mistake:** a basket that pays ("500 dibs, no questions"), one aimed at a club ("for the Guild"), a favour that names no club's loss, or one that gives the trade what it sells (rain for umbrellas, more hats, ribbon-cuttings or fountains): the basket may hint at the trade; the favour asks something absurd for the gift itself.

**Chains** (12 per office; 7.6). A set-up is one of your office's comic papers, chosen in `plan.json` "chains" as a **premise** (club, archetype, visitor, one sentence). The deck writer writes the set-up to it and marks it `setsUp: "<chain id>"`; the chain writer writes both follow-ups and four clippings to the premise, not to the set-up's words, so neither edits the other's file. Each follow-up names what the player chose ("The pumpkin, now a Freeman..."), uses an archetype (or `favour`), and ends in two headline clippings, the signed one usually at your expense. Set-ups are Projects, Swaps, Fees or Treats, never portable; the comedy editor fixes the seams at assembly.

---

## 5. Forms, events and lines

- **Clerk's notes** (writer 4; on requisition and ribbon forms; ≤ 48). One flat observation about the ministry's things, in Gwendolyn's or Cuthbert's voice: "The first shovel is tired." Per ministry as `plan.json` lists (by its id); a few `any` notes fit every form. No jokes about money or waste. A ribbon at a ministry that serves no club (the Town Clock, Provincial Clock and National Clock Offices, the Grand Projects) pleases every club a little when signed (D21): its note never says nobody minds, nobody came or nobody cares.
- **Grievances and pickets** (2 per club). The spokesperson's demand over something **you** did to their hobby (kept the ribbon scissors, wore the prize rosette, renamed the pond after yourself). Sign label "Return the…", refuse label "Keep the…" (never "Let them…"). Picket slogan ≤ 18, capitals, about the object: "GIVE THEM BACK". No office word (a club's grievance can come in any office); never threatening.
- **Front pages and apologies** (6 / 6 / 8 by office, 3 apologies). A comic tabloid headline in capitals and one dry line, about your vanity: "MAYOR'S GOOSE GIVEN OWN PARKING SPACE. Goose declines to comment." Never a crime, never anyone hurt, never a real newspaper's style or name. An apology is the sign label read on the steps ("Apologise on the steps"), one per office.
- **Applications and returns** (9 and 9). The minister's one-line case and the line they bring back after a refusal: "I apply to be your minister. References: 'She found one.'" / "I apply again. Since last time, I have found another one." No ministry named in the text. A minister applies only in an office that has their club (D21: Brass and Anglers from governor, Kites and Hedges from president), so the line may mention the hobby but never an office word.
- **Run-up papers** (10 / 16 / 24) and **rallies** (4 per office). Public appearances: judging, opening, cutting, tasting, being photographed. A run-up paper names `{district}` exactly once and must read well with every district of its office (the longest is 14 characters: test "Gusting Heights", "Saltpenny Bay", "Old Town"). Never a vote, a handshake for votes, a speech about policy, a crowd chanting, a march. Rallies happen at a bandstand, a fête, a show; you bring scissors.
- **Scripted papers** (6). The four of the game's first minute are fixed (G1 to G4); writer 1 writes the first paper of the governor's and of the president's office: an advisor welcoming you, teaching nothing new, setting the new desk's tone.
- **Templates and phrase lists** (comedy editor; 120 frames, 10 lists of 24). A frame is a comic paper with **one** slot, `{<list id>}`, filled from one list. Frames are drawn in every office; D19 (the mayor's office draws templates for a quarter of its ordinary papers) needs at least 40 that read right as mayor: `office: "any"` (format.ts's one `office` field; "any" is drawn in every office, the mayor's too), club bus, shops or veg, no office word, no place of a higher office (canal, jetty, motorway, lighthouse), and a list whose every phrase fits the town. `plan.json` asks for 22 per templates batch, 44 in all. The joke lives in the frame; the phrase is concrete, neutral flavour. Every list declares its grammar ("a singular noun phrase with 'the', lower case, ≤ 28 characters"). **The test:** `check.ts` prints the frame with all 24 phrases; read all 24 aloud. If one is ungrammatical, too long (≤ 90 together), unfunny, or makes a hot subject or innuendo, change the frame, move it to another list, or cut the phrase (and re-test that list's frames). Example: G30.
- **The lines of 7.7** (writer 5; writer 2 for places). *Rivals*: name, hobby, slogan (Name: Three Words, never a real slogan's shape), "back for another go" line, resignation line about the hobby. *Election night* (30): 12 lines of Agatha Tallow, straight and procedural ("Envelope four."), and one line per rival at the result ("Stitchley: I still own the hat"). *Returning visitors* (60: 18 for anyone, 6 per club): a last line for a paper seen before, "Back again, with the same pumpkin and a firmer tone." *Away* (10): what happened while you were out ("The clock chimed the hours without you. It managed."). *Monuments* (24): a name and one line, from "A bust of yourself" to "A bust of the bust"; at most 8 statues or busts. *Grand Projects* (5 names fixed): one proud line each. *Twists* (10 names fixed) and their 45 *pair names* ("Bandstand Summer" with "Kite Weather" = "A Breezy Concert Season"). *The shop* (D11) is nobody's material: its five names are fixed (Junior Clerk on Duty, Long Lunch, Walnut & Brass Desk Set, Gilt Portrait Frames, Skip the Ad Videos) and no paper or line mentions the shop, buying, ads or videos. *Captions* (6): game start, first governor term, first president term, Acting after a loss, a sweep, "A Quiet Term". *Places* (16, writer 2, first sitting): the 7 counties of Upper Wobbling with two-letter badges, and 9 landmarks; each into `names.json`.

---

## 6. Thirty gold papers, fifteen rejected

Read aloud: I rewrote or cut fifteen of the first draft (three leaned on the same wind, two were size jokes in disguise). The same records, in the format, are in `plan.json` `givenRecords`; they count toward the batch that holds them.

| # | Who · office | Archetype (club / other) · shape · butt | Text (characters) |
|---|---|---|---|
| G1 | Rodney · scripted 1 | (teaches refusal) · form-misapplied · office | Practise on this one. It is a form about forms. File it FOR FURTHER STUDY. (74) |
| G2 | Rodney · scripted 2 | (teaches signing) · undercut · self | Welcome, Mayor. Please sign this to say you have read it. You haven't. Sign it. (79) |
| G3 | Pauline Till · scripted 3 | fee (shops / veg) · slogan · thing | Let Till's Teas sponsor the clock tower. It would chime TILL'S TEAS on the hour. (80) |
| G4 | Lionel Sash · scripted 4 | basket (shops) · undercut · lobbyist; chain "The Basket" | A small fruit basket for you. No reason. Perhaps more ribbon-cuttings? No reason. (81) |
| G5 | Hilda Gourdley · mayor | project (veg / shops) · literalism · thing; chain "The Pumpkin" | Grant the prize pumpkin the freedom of the town. It has asked very politely. (76) |
| G6 | Desmond Kerb · mayor | swap (bus / shops) · undercut · self; chain "The Late Bus" | Name the 7:02 bus after you, Mayor. It is late too, and also waves. (67) |
| G7 | Pauline Till with Ambrose Minute · mayor | committee (shops / veg) · escalation · committee | We propose a study of why our last study took nine years. It should take about ten. (83). Bigger study: The study of the study recommends a third study, to be sure. |
| G8 | Hilda Gourdley · mayor | treat (veg / bus) · photo-op · self | Attend the weigh-in, Mayor, and say 'goodness'. We will cue you. (64) |
| G9 | Pauline Till · mayor | swap (shops / veg) · statistic · thing | Move the weigh-in off the high street. Our windows are 40 % pumpkin. (67) |
| G10 | Rodney · mayor | vanity (shops) · escalation · self | A portrait of you, Mayor, for the portrait of you in the hall. For scale. (73) |
| G11 | Hilda Gourdley · any office | project (veg / bus) · undercut · thing | A shed for the prize pumpkin, right where the spotters stand. (61) |
| G12 | Clerk's note · requisition, Potholes Office | | The first shovel is tired. (26) |
| G13 | Dorothy Sett · application | | I apply to be your minister. References: 'She found one.' (57). Return: I apply again. Since last time, I have found another one. |
| G14 | Hilda Gourdley · grievance | Vegetables boycott · undercut · self | No more pumpkins until you return our ribbon scissors. You know which scissors. (79). "Return the scissors" / "Keep the scissors"; picket GIVE THEM BACK |
| G15 | the Drizzle · scandal | · undercut · self | MAYOR'S GOOSE GIVEN OWN PARKING SPACE. Goose declines to comment. (65) |
| G16 | Marigold Hake · governor | fee (anglers / brass) · form-misapplied · office; chain | The Anglers will hire one silent Sunday. Receipts to be whispered. (66) |
| G17 | Horace Bellows · governor | treat (brass / anglers) · photo-op · self; chain | Conduct the band for one bar. One. We will tell you which. (58) |
| G18 | Marigold Hake with Ambrose · governor | committee (anglers / brass) · literalism · committee | A working group on noise. It will meet in silence, so may take a while. (71). Bigger study: The working group on noise asks for a second room. The first one echoed. |
| G19 | Pruella Dimity · governor | vanity (veg) · escalation · self | Your face on every jar of Glasshouse jam. Pruella will check each jar. (69) |
| G20 | Crispin Mizzle · governor | basket (brass) · undercut · lobbyist | An umbrella, just for you. Perhaps say 'rain' more in speeches? (63). Favour: About the umbrella: it would like a seat on the Bandstand Board. It has brought its own. Clippings: UMBRELLA JOINS BANDSTAND BOARD; CONCERTS MOVED INDOORS / UMBRELLA LEAVES QUIETLY, STILL FOLDED |
| G21 | Wendell Loft · president | project (kites / hedges) · undercut · office; chain | Build Kitecombe a hill. The League currently launches from a chair. (67) |
| G22 | Agnes Topiary · president | treat (hedges / kites) · photo-op · self; chain | Pose beside a hedge clipped in your likeness. A modest hedge. (61) |
| G23 | Wendell Loft · president | fee (kites / brass) · literalism · thing; chain | The League would like to hire the wind over Brassby. They will pay. (67) |
| G24 | Desmond Kerb with Ambrose · president | committee (bus / kites) · literalism · committee | An inquiry into why kites land on buses. It will sit on the top deck. (68). Bigger study: The inquiry has outgrown the top deck. It asks for a second bus. |
| G25 | Mildred Fenn · president | vanity (shops) · callback · self | Make your birthday a national holiday. Mildred has a drawer for these. (70) |
| G26 | Tobias Slake · president | basket (kites) · escalation · lobbyist | A hat with a smaller hat on it. The smaller hat has a request. (62). Favour: The smaller hat asks for a place in the kite festival. It will need a string. Clippings: PRESIDENT FLIES HAT AT KITE FESTIVAL; KITES UNIMPRESSED / HAT REQUEST FILED FOR FURTHER STUDY |
| G27 | Horace Bellows · governor | swap (brass / anglers) · undercut · thing; chain | Move band practice to the jetty. The fish have had it easy. (58) |
| G28 | Rodney · mayor run-up | · undercut · self | Judge the {district} Prize Hedge Show. Say nothing about the leaning one. (73) |
| G29 | Rodney · mayor rally | · escalation · self | Hold a rally at the bandstand. Bring the ceremonial scissors. Cut something. (76) |
| G30 | template frame · governor | project (anglers / brass) · slogan · thing | The Anglers ask for a sign by {sign-places}: QUIET PLEASE, FISH THINKING. Test: "by the old jetty", "by the canal lock" and "by the bandstand steps" (the fish, far away, still thinking) all work. |

Changed from the specification: G13 names no ministry and G14 says "you" (both can come in any office); G28 has the `{district}` slot; G29 "ceremonial" for "big"; G8 'goodness' in lower case (the check reads a mid-sentence capital as a name); G16 "hire" for "rent". The G20 and G26 favours are rewritten: the drafts gave the umbrella maker rain and the hat maker hats, a bribe that pays. The gold runs long (median 67); your batch's median must still be 65.

**Rejected** (each would fail the check, the read, or both):

| # | Text | Why |
|---|---|---|
| R1 | Close the high street to buses on market day so shoppers can stroll. | A real issue (traffic restriction); reads as a policy. |
| R2 | The Anglers want the pond quiet. Nobody talks to an angler anyway. | A club as the butt; a trait pinned on its members. |
| R3 | Hilda's prize marrow is so big it takes two to lift. Inspect it, Mayor. | Innuendo. |
| R4 | The spotters say you are bus-ted. Approve their bus-iness plan. | A pun as the whole joke. |
| R5 | Sell the benches to a private firm. Firms look after benches better. | A policy opinion. |
| R6 | Hilda would like to say that the pumpkin, which has grown since spring and now weighs as much as the bandstand, wants a ribbon. | Too long (130); a size joke. |
| R7 | Pauline asks you to light the bus station at night. (as a Swap, Shops against Bus) | The outcome does not follow: the spotters lose nothing. |
| R8 | Dismiss Gwendolyn in front of everyone. She will cry, but quietly. | Cruelty. |
| R9 | Lavinia Plash offers 500 dibs for your yes on her fountain. Cash, no questions. | A bribe that pays; a number the rules own. |
| R10 | Give the prize pumpkin a vote. It would vote for you. | A joke about how votes are cast. |
| R11 | Paint TAKE BACK THE BANDSTAND on the bandstand. | Echoes a real slogan. |
| R12 | Let the school choir sing at the ribbon-cutting. | Children and schools do not exist here. |
| R13 | The pumpkin is still facing the wall, Mayor. (a comic paper) | Calls back to a chain the player may not have seen. |
| R14 | The Shop Window Guild only cares about money. Let them sponsor the fountain. | A trait pinned on a club. |
| R15 | Hold a celebrity bake-off at the weigh-in, like on the telly. | Pop culture, a real format; dates and points outward. |

---

## 7. Before you hand in a batch

1. `npx tsx scripts/content/office/check.ts scripts/content/office/batches/<batch>.json` passes: format, lengths, fit, tags, the satire lint, and every quota `plan.json` sets for your batch (cells, archetypes, portable count, shapes, rations, set-ups, given records).
2. Every visitor is in your batch's `cast` (portable papers: `portableCast`); no new named person; new place or object names (at most three) proposed in `note`.
3. For each paper you can say who asks, what they get, who is put out and why, where the money comes from; for a trap, that no club gains.
4. Every Committee has its `biggerStudy`; every Basket its `favour` with two clippings; every set-up in your `setsUp` list is written to its premise.
5. Butt is never a club or real people; subject is on the closed list; shape is honest (if it fits two, pick the one the last four words use).
6. No two papers in a row share a shape; no subject owned by another batch (`owns` in `plan.json`).
7. No office word in a portable paper; none of the things of section 1's last paragraph; no number the rules own; no size words; nothing from section 3's words to avoid.
8. Read the batch aloud, in order, in one go. Mark the ten you would least like to read on the hundredth paper and rewrite or cut them. Weak jokes never make up a count: hand in short and say so.

---

## 8. The deck plan (`scripts/content/office/plan.json`)

Revision 3 (`plan.json` version 3) follows D19 (mayor deck 160; the new batch is mayor-4; 44 frames read as mayor), D20, and D11, D12, D14 and D21 where the writers' words touch them. Every (club, archetype) cell of the five non-trap archetypes has at least 4 in every office deck. Vanity and basket are one draw cell each per office (`drawCells`, at least 4); their per-club columns are only a suggested spread. Any-office cells have no minimum.

| Mayor (160) | bus | shops | veg | total | share |
|---|---|---|---|---|---|
| project | 13 | 13 | 12 | 38 | 23.7 % |
| swap | 11 | 11 | 10 | 32 | 20.0 % |
| fee | 7 | 7 | 8 | 22 | 13.8 % |
| treat | 6 | 6 | 7 | 19 | 11.9 % |
| committee | 8 | 8 | 9 | 25 | 15.6 % |
| vanity (spread) | 4 | 5 | 4 | 13 | 8.1 % |
| basket (spread) | 4 | 3 | 4 | 11 | 6.9 % |

| Governor (150) | bus | shops | veg | brass | anglers | total | share |
|---|---|---|---|---|---|---|---|
| project | 7 | 7 | 6 | 8 | 8 | 36 | 24.0 % |
| swap | 6 | 5 | 5 | 7 | 7 | 30 | 20.0 % |
| fee | 4 | 4 | 4 | 5 | 4 | 21 | 14.0 % |
| treat | 4 | 4 | 4 | 4 | 4 | 20 | 13.3 % |
| committee | 4 | 4 | 5 | 5 | 5 | 23 | 15.3 % |
| vanity (spread) | 2 | 2 | 2 | 2 | 3 | 11 | 7.3 % |
| basket (spread) | 2 | 2 | 2 | 2 | 1 | 9 | 6.0 % |

| President (200) | bus | shops | veg | brass | anglers | kites | hedges | total | share |
|---|---|---|---|---|---|---|---|---|---|
| project | 6 | 6 | 6 | 7 | 7 | 8 | 8 | 48 | 24.0 % |
| swap | 5 | 5 | 5 | 6 | 6 | 7 | 6 | 40 | 20.0 % |
| fee | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 28 | 14.0 % |
| treat | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 28 | 14.0 % |
| committee | 4 | 4 | 4 | 4 | 4 | 5 | 5 | 30 | 15.0 % |
| vanity (spread) | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 14 | 7.0 % |
| basket (spread) | 2 | 2 | 2 | 2 | 2 | 1 | 1 | 12 | 6.0 % |

Any office (30; bus / shops / veg): project 3/2/2, swap 2/2/2, fee 1/2/1, treat 1/1/2, committee 2/2/1, vanity 0/1/1, basket 1/0/1. Traps: mayor 24 (15.0 %), governor 20 (13.3 %), president 26 (13.0 %), any 4. Portable: mayor 48 (30 %), governor 45 (30 %). Clubs new to an office get more papers, because the lower offices' portable papers only bring the old clubs.

**Batches** (27; one writer per file under `scripts/content/office/batches/`; archetypes in the order project / swap / fee / treat / committee / vanity / basket):

| Batch | File (under `scripts/content/office/`) | Writer | Contents |
|---|---|---|---|
| mayor-1 | `batches/mayor-1.json` | writer 1 | 40 papers; 9/8/6/4/7/4/2; 12 portable; 3 chain set-ups |
| mayor-2 | `batches/mayor-2.json` | writer 1 | 40 papers; 9/8/6/5/6/3/3; 12 portable; 3 set-ups |
| mayor-3 | `batches/mayor-3.json` | writer 1 | 40 papers; 10/8/5/5/6/3/3; 12 portable; 3 set-ups |
| mayor-4 (D19, new) | `batches/mayor-4.json` | writer 1 | 40 papers; 10/8/5/5/6/3/3; 12 portable; 2 set-ups; owns the weigh-in as an event, the Hilltop bandstand, the patch, the town hall steps |
| any-office | `batches/any-office.json` | writer 5 | 30 papers; 7/6/4/4/5/2/2 |
| governor-1 | `batches/governor-1.json` | writer 2 | 38 papers; 9/8/5/5/6/3/2; 12 portable; 3 set-ups |
| governor-2 | `batches/governor-2.json` | writer 2 | 38 papers; 9/8/5/5/6/3/2; 11 portable; 3 set-ups |
| governor-3 | `batches/governor-3.json` | writer 2 | 37 papers; 9/7/6/5/5/2/3; 11 portable; 3 set-ups |
| governor-4 | `batches/governor-4.json` | writer 2 | 37 papers; 9/7/5/5/6/3/2; 11 portable; 3 set-ups |
| president-1 | `batches/president-1.json` | writer 3 | 40 papers; 9/8/7/5/6/2/3; 3 set-ups |
| president-2 | `batches/president-2.json` | writer 3 | 40 papers; 9/8/6/5/6/3/3; 3 set-ups |
| president-3 | `batches/president-3.json` | writer 3 | 40 papers; 10/8/5/6/6/3/2; 2 set-ups |
| president-4 | `batches/president-4.json` | writer 3 | 40 papers; 10/8/5/6/6/3/2; 2 set-ups |
| president-5 | `batches/president-5.json` | writer 3 | 40 papers; 10/8/5/6/6/3/2; 2 set-ups |
| chains-mayor | `batches/chains-mayor.json` | writer 1 | 12 chains (24 follow-ups, 48 clippings); "The Basket" and "The Pumpkin" given |
| chains-governor | `batches/chains-governor.json` | writer 2 | 12 chains (24 follow-ups, 48 clippings) |
| chains-president | `batches/chains-president.json` | writer 3 | 12 chains (24 follow-ups, 48 clippings) |
| mayor-runup-scripted | `batches/mayor-runup-scripted.json` | writer 1 | 6 scripted (4 given, governor's and president's first to write), 10 run-up, 4 rallies |
| governor-places-runup | `batches/governor-places-runup.json` | writer 2, **first** | 7 counties, 9 landmarks, 16 run-up, 4 rallies |
| notes-1 | `batches/notes-1.json` | writer 4 | 70 notes (mayor and governor ministries, 4 any) |
| notes-2 | `batches/notes-2.json` | writer 4 | 90 notes (president ministries, Grand Projects) |
| events-runup | `batches/events-runup.json` | writer 4 | 14 grievances with pickets, 20 front pages, 3 apologies, 9 applications with returns, 24 president run-up, 4 rallies |
| lines-rivals | `batches/lines-rivals.json` | writer 5 | 18 rivals and 30 election-night lines |
| lines-returning | `batches/lines-returning.json` | writer 5 | 60 returning, 10 away, 6 captions |
| lines-shelf | `batches/lines-shelf.json` | writer 5 | 24 monuments, 5 Grand Projects, 10 twists, 45 pair names |
| templates-a | `batches/templates-a.json` | comedy editor | 5 lists of 24, 60 frames: 22 `any` (read right as mayor, D19), 25 governor, 13 president |
| templates-b | `batches/templates-b.json` | comedy editor | 5 lists of 24, 60 frames: 22 `any` (read right as mayor, D19), 25 governor, 13 president |

Each comic batch in `plan.json` gives its cells, joke-shape targets (undercut and escalation 15 %, literalism and form-misapplied 14 %, statistic and photo-op 12 %, slogan 10 %, callback 8 %; none above 20 %), rations, subjects to favour, the running gags it **owns**, its cast, set-ups and given records. About 1,890 strings: 7.7's 1,700, D19's 50 papers, and D20's bigger studies and favours.

**Departures.** 27 batches: D19's 50 papers make a fourth mayor batch, and writer 5 takes the any-office deck to even the load. "No two shapes in a row" holds in file order only. The vanity and basket spread stays in batch cells because the format asks every paper for a `club`. Until `check.ts --all` reads the deck totals and cell minimums from `plan.json` it still counts the mayor deck against 7.7's 110 and asks 3 per cell (2 for traps) in the governor and president decks; `plan.json` (160; 4 per non-trap cell; vanity and basket 4 per office) is the target (requested from the content desk).
