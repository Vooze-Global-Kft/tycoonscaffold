/**
 * Decree states for tests, screens, the dev presets and the bot (spec 8.1 step 3: "rules and tests
 * on frozen fixtures"; lesson 4 of the brief: rules tests never pin tuned numbers).
 *
 * - `decreeTestConfig()`: the shared fields of the frozen fixture `base-game.json`, mode "decree", the
 *   FROZEN test numbers (`DECREE_TEST_NUMBERS`, ./decree.numbers.json: the specification's starting
 *   values with section 11's decisions as of 23 November 2026, D15 to D24 included) and the FROZEN test
 *   deck below. It reads neither the shipped game.json nor the schema's defaults for a number, so a
 *   tuned number, a changed default or a rewritten text can never turn a rules test red (lesson 4). A
 *   field the schema gains later takes its default until a rules change adds it here.
 * - `DECREE_TEST_DECK`: the papers and chains of 7.5 and 7.6 (texts as the specification printed
 *   them on 23 November 2026: scripted papers 1 to 4, the pumpkin, the 7:02 bus, the study of the
 *   study, Till's Teas, the portrait, the requisition's note, Dorothy Pockle's application, the
 *   scissors grievance, the goose front page, the hedge show and the rally; the chains "The Basket"
 *   and "The Pumpkin"), plus generated filler papers "Test paper n" so every (club, archetype) cell of
 *   every office holds at least three, and the fewest other records each draw needs.
 * - `freshState(cfg, seed)`: a new game by the rules' own create.
 * - `decreeFixtures(cfg)`: hand-made mid-game states, typed and valid: `mayorMidTerm` (day 30 of the
 *   first term, three ministries open, a swap paper on the desk), `governorAtCall` (the run-up of the
 *   first governor term, its first campaign paper on the desk, the Vegetables' boycott running after
 *   its grievance was refused), `presidentTerm3` (term 3 as President,
 *   a Grand Project open, six ministers, the term's twist).
 *
 * Web only (scripts/lib/modes.js WEB_ONLY): the web presets reach it, phones never do. Written by the
 * skeleton; owned afterwards by P1a (the bot engineer may add bot-played states beside these).
 */
import { GameConfigSchema } from '../../config/schema';
import { ARCHETYPE_IDS, DecreeSchema, FOLLOW_ONLY_ARCHETYPES, SHAPE_IDS, type ClubId, type DecreeContentInput, type OfficeId } from '../../config/schema.decree';
import * as R from '../decree';
import type { GameState } from '../types';
import baseGame from './base-game.json';
import testNumbers from './decree.numbers.json';

/**
 * The rules tests' own numbers, frozen (./decree.numbers.json; never regenerated from the schema's
 * defaults or from game.json: a rules change that needs a new number edits it and the tests that pin
 * it in the same commit). Everything of the `decree` block but the deck.
 */
export const DECREE_TEST_NUMBERS = testNumbers as unknown as Omit<DecreeContentInput, 'deck'>;

/** A fixed epoch for fixtures (23 Nov 2026, 12:00 UTC). */
export const FIXTURE_NOW = Date.UTC(2026, 10, 23, 12, 0, 0);

type Deck = NonNullable<DecreeContentInput['deck']>;
type V = { face: string; name: string; role: string; club: ClubId | null };
const v = (face: string, name: string, role: string, club: ClubId | null = null): V => ({ face: `face:${face}`, name, role, club });

/** The cast the test deck uses (7.3). */
const CAST = {
  rodney: v('spinwell', 'Rodney Spinwell', 'Chief of Staff'),
  hilda: v('gourdley', 'Hilda Gourdley', 'Giant Vegetable Society', 'veg'),
  desmond: v('kerb', 'Desmond Kerb', "Bus Spotters' Society", 'bus'),
  pauline: v('till', 'Pauline Till', 'Shop Window Guild', 'shops'),
  lionel: v('sash', 'Lionel Sash', "Ribbon Makers' Guild"),
  ambrose: v('minute', 'Ambrose Minute', 'Committee on Committees'),
  dorothy: v('pockle', 'Dorothy Pockle', 'Applicant'),
  test: (n: number, club: ClubId | null) => v('test', `Test Visitor ${n}`, 'Test role', club),
};
const t = { subject: 'paperwork' as const, butt: 'office' as const, shape: 'undercut' as const };

/** The clubs of each office, as the defaults have them. */
const OFFICE_CLUBS: Record<OfficeId, ClubId[]> = { mayor: ['bus', 'shops', 'veg'], governor: ['bus', 'shops', 'veg', 'brass', 'anglers'], president: ['bus', 'shops', 'veg', 'brass', 'anglers', 'kites', 'hedges'] };

/** "Test paper n" for every (club, archetype) cell of every office, three each; `other` the next club of the office (none for traps). */
function fillerPapers(): NonNullable<Deck['papers']> {
  const out: NonNullable<Deck['papers']> = [];
  let n = 0;
  for (const office of ['mayor', 'governor', 'president'] as const) {
    const clubs = OFFICE_CLUBS[office];
    clubs.forEach((club, ci) => {
      for (const archetype of ARCHETYPE_IDS) {
        if ((FOLLOW_ONLY_ARCHETYPES as readonly string[]).includes(archetype)) continue;
        const a = archetype as Exclude<(typeof ARCHETYPE_IDS)[number], (typeof FOLLOW_ONLY_ARCHETYPES)[number]>;
        const trap = a === 'vanity' || a === 'basket';
        for (let k = 0; k < 3; k++) {
          n++;
          // D20: every Committee carries its bigger study and every Basket its favour.
          const own = a === 'committee' ? { biggerStudy: `Test bigger study ${n}` } : a === 'basket' ? { favour: { text: `Test favour ${n}`, clippings: { sign: `TEST FAVOUR CLIPPING ${n}A`, refuse: `TEST FAVOUR CLIPPING ${n}B` } } } : {};
          out.push({ id: `test-${office}-${club}-${a}-${k + 1}`, office, visitor: CAST.test(n, trap ? null : club), club, other: trap ? null : clubs[(ci + 1) % clubs.length], archetype: a, text: `Test paper ${n}`, subject: 'paperwork', butt: 'office', shape: SHAPE_IDS[n % SHAPE_IDS.length], ...own });
        }
      }
    });
  }
  return out;
}

/** A test follow-up of a mayor's chain; `other` the next mayoral club (treat and committee name one; a favour names none). */
const followTest = (n: number, club: ClubId, archetype: 'treat' | 'favour' | 'committee', delay: [number, number]) => {
  const clubs = OFFICE_CLUBS.mayor;
  return { visitor: CAST.test(900 + n, club), club, other: archetype === 'favour' ? null : clubs[(clubs.indexOf(club) + 1) % clubs.length], archetype, text: `Test follow-up ${n}`, ...t, delay, clippings: { sign: `TEST CLIPPING ${n}A`, refuse: `TEST CLIPPING ${n}B` } };
};

/**
 * The rules tests' own deck, frozen (7.5 and 7.6 as printed on 23 November 2026, plus the fillers).
 * Never edit it to follow a rewrite; a rule change that needs a new record here changes the tests
 * that pin it in the same commit.
 */
export const DECREE_TEST_DECK: Deck = {
  scripted: [
    // 7.5 paper 1 (3.1 0:02: teaches refusal). SIGN No change · ↩; STUDY every club +1.
    { id: 'may-practise', office: 'mayor', slot: 1, visitor: CAST.rodney, text: 'Practise on this one. It is a form about forms. File it FOR FURTHER STUDY.', sign: [], refuse: [{ type: 'every', delta: 1 }], setsUp: 'test-form-about-forms' },
    // 3.1 0:10: teaches signing. SIGN every club +1; STUDY ↩ another copy.
    { id: 'may-welcome', office: 'mayor', slot: 2, visitor: CAST.rodney, text: "Welcome, Mayor. Please sign this to say you have read it. You haven't. Sign it.", sign: [{ type: 'every', delta: 1 }], refuse: [], setsUp: 'test-another-copy' },
    // 7.5 paper 6 as scripted paper 3: a fixed +60 (3.1 0:20).
    { id: 'may-tills-teas', office: 'mayor', slot: 3, visitor: CAST.pauline, club: 'shops', other: 'veg', archetype: 'fee', text: "Let Till's Teas sponsor the clock tower. It would chime TILL'S TEAS on the hour.", sign: [{ type: 'money', fixed: 60 }, { type: 'mood', club: 'petitioner', delta: 2 }, { type: 'mood', club: 'other', delta: -4 }], refuse: [{ type: 'mood', club: 'petitioner', delta: -1 }, { type: 'mood', club: 'other', delta: 1 }] },
    // 7.5 paper 4, the basket (3.1 0:38), set-up of chain A.
    { id: 'may-basket', office: 'mayor', slot: 4, visitor: CAST.lionel, club: 'shops', archetype: 'basket', text: 'A small fruit basket for you. No reason. Perhaps more ribbon-cuttings? No reason.', sign: [{ type: 'gossip', delta: 2 }], refuse: [], setsUp: 'the-basket' },
    { id: 'gov-first', office: 'governor', slot: 1, visitor: CAST.rodney, text: 'Test scripted paper of the governor.', sign: [{ type: 'every', delta: 1 }], refuse: [] },
    { id: 'pres-first', office: 'president', slot: 1, visitor: CAST.rodney, text: 'Test scripted paper of the president.', sign: [{ type: 'every', delta: 1 }], refuse: [] },
  ],
  papers: [
    // 7.5 papers 2, 3, 5, 6, 7.
    { id: 'may-pumpkin-freedom', office: 'mayor', visitor: CAST.hilda, club: 'veg', other: 'shops', archetype: 'project', text: 'Grant the prize pumpkin the freedom of the town. It has asked very politely.', subject: 'vegetable-shows', butt: 'thing', shape: 'literalism', setsUp: 'the-pumpkin' },
    { id: 'may-bus-name', office: 'mayor', visitor: CAST.desmond, club: 'bus', other: 'shops', archetype: 'swap', text: 'Name the 7:02 bus after you, Mayor. It is late too, and also waves.', subject: 'buses', butt: 'self', shape: 'undercut' },
    { id: 'may-study-study', office: 'mayor', visitor: CAST.pauline, cosigner: CAST.ambrose, club: 'shops', other: 'veg', archetype: 'committee', text: 'We propose a study of why our last study took nine years. It should take about ten.', subject: 'committees', butt: 'committee', shape: 'escalation', biggerStudy: 'Test bigger study of the study of the study.' },
    { id: 'may-tills-clock', office: 'mayor', visitor: CAST.pauline, club: 'shops', other: 'veg', archetype: 'fee', text: "Let Till's Teas sponsor the clock tower. It would chime TILL'S TEAS on the hour.", subject: 'clocks', butt: 'office', shape: 'literalism' },
    { id: 'may-portrait', office: 'mayor', visitor: CAST.rodney, club: 'shops', archetype: 'vanity', text: 'A portrait of you, Mayor, for the portrait of you in the hall. For scale.', subject: 'portraits', butt: 'self', shape: 'escalation' },
    ...fillerPapers(),
  ],
  chains: [
    // 7.6 A, "The Basket" (set-up paper 4).
    {
      id: 'the-basket',
      office: 'mayor',
      title: 'The Basket',
      afterSign: { visitor: CAST.lionel, club: 'shops', archetype: 'favour', text: 'About the basket: the goose at the bottom was not fruit. It would like an office.', subject: 'geese', butt: 'self', shape: 'escalation', delay: [10, 14], clippings: { sign: 'GOOSE GIVEN OFFICE; MAYOR GIVEN GOOSE', refuse: 'GOOSE RETURNED TO SENDER, WHO DENIES OWNING A GOOSE' } },
      afterRefuse: { visitor: CAST.lionel, club: 'veg', archetype: 'favour', text: 'No hard feelings. Please accept this smaller basket. It is one grape.', subject: 'vanity', butt: 'lobbyist', shape: 'undercut', delay: [10, 14], clippings: { sign: 'MAYOR ACCEPTS GRAPE', refuse: 'MAYOR REFUSES GRAPE. GRAPE DEVASTATED' } },
    },
    // 7.6 B, "The Pumpkin" (set-up paper 2).
    {
      id: 'the-pumpkin',
      office: 'mayor',
      title: 'The Pumpkin',
      afterSign: { visitor: CAST.hilda, club: 'veg', other: 'shops', archetype: 'committee', text: 'The pumpkin, now a Freeman of the town, wishes to address the council. It has slides.', subject: 'vegetable-shows', butt: 'thing', shape: 'escalation', delay: [8, 12], clippings: { sign: "PUMPKIN'S SPEECH CANCELLED; SLIDES LOST", refuse: 'PUMPKIN ADDRESSES EMPTY HALL' } },
      afterRefuse: { visitor: CAST.hilda, club: 'veg', other: 'shops', archetype: 'treat', text: 'The pumpkin has not left its crate since your refusal. It faces the wall.', subject: 'vegetable-shows', butt: 'thing', shape: 'callback', delay: [12, 16], clippings: { sign: 'MAYOR APOLOGISES TO VEGETABLE', refuse: 'PUMPKIN: NO COMMENT' } },
    },
    // The scripted papers' one-sided chains (3.1: paper 1 comes back after a sign, paper 2 after a study).
    { id: 'test-form-about-forms', office: 'mayor', title: 'Test chain 1', afterSign: followTest(1, 'bus', 'treat', [10, 14]) },
    { id: 'test-another-copy', office: 'mayor', title: 'Test chain 2', afterRefuse: followTest(2, 'shops', 'treat', [10, 14]) },
  ],
  notes: [
    { id: 'note-shovel', form: 'requisition', text: 'The first shovel is tired.' },
    { id: 'note-test-ribbon', form: 'ribbon', text: 'Test note of a ribbon.' },
  ],
  applications: [
    { id: 'app-pockle', minister: 'pockle', visitor: CAST.dorothy, text: "I apply to be Minister for Potholes. References: 'She found one.'", returnText: 'Test return of Dorothy Pockle.' },
    ...['pellow', 'ferrule', 'hush', 'bole', 'gusset', 'wren', 'tamp', 'nibley'].map((m, i) => ({ id: `app-${m}`, minister: m, visitor: CAST.test(800 + i, null), text: `Test application ${i + 2}`, returnText: `Test return ${i + 2}` })),
  ],
  grievances: [
    // 7.5 paper 10.
    { id: 'griev-scissors', club: 'veg', visitor: CAST.hilda, text: 'No more pumpkins until the Mayor returns our ribbon scissors. You know which scissors.', signLabel: 'Return the scissors', refuseLabel: 'Keep the scissors', picket: 'GIVE THEM BACK', subject: 'ribbons', butt: 'self', shape: 'undercut' },
    ...(['bus', 'shops', 'veg', 'brass', 'anglers', 'kites', 'hedges'] as const).flatMap((club, i) =>
      [1, 2].filter((k) => !(club === 'veg' && k === 1)).map((k) => ({ id: `griev-test-${club}-${k}`, club, visitor: CAST.test(700 + i * 2 + k, club), text: `Test grievance ${club} ${k}`, signLabel: 'Test settle', refuseLabel: 'Test keep', picket: `TEST PICKET ${club.toUpperCase()} ${k}`, ...t })),
    ),
  ],
  frontPages: [
    // 7.5 paper 11.
    { id: 'front-goose-parking', office: 'mayor', text: "MAYOR'S GOOSE GIVEN OWN PARKING SPACE. Goose declines to comment.", subject: 'geese', butt: 'self', shape: 'literalism' },
    { id: 'front-test', office: 'any', text: 'TEST FRONT PAGE. Test line.', ...t },
  ],
  apologies: [
    { id: 'apology-steps', text: 'Apologise on the steps' },
    { id: 'apology-test', text: 'Test apology' },
  ],
  runUp: [
    // 7.5 paper 12, with its district as the slot.
    { id: 'run-hedge-show', office: 'mayor', visitor: CAST.rodney, text: 'Judge the {district} Prize Hedge Show. Say nothing about the leaning one.', subject: 'hedges', butt: 'self', shape: 'photo-op' },
    ...(['mayor', 'governor', 'president'] as const).flatMap((office) => [1, 2, 3, 4, 5].map((k) => ({ id: `run-test-${office}-${k}`, office, visitor: CAST.rodney, text: `Test appearance ${k} in {district}.`, ...t }))),
  ],
  rallies: [
    { id: 'rally-bandstand', office: 'mayor', visitor: CAST.rodney, text: 'Hold a rally at the bandstand. Bring the big scissors. Cut something.', subject: 'bandstands', butt: 'self', shape: 'photo-op' },
    { id: 'rally-test-governor', office: 'governor', visitor: CAST.rodney, text: 'Test rally of the governor.', ...t },
    { id: 'rally-test-president', office: 'president', visitor: CAST.rodney, text: 'Test rally of the president.', ...t },
  ],
  frames: (['governor', 'president'] as const).flatMap((office) => OFFICE_CLUBS[office].map((club, i) => ({ id: `frame-test-${office}-${club}`, office, club, other: OFFICE_CLUBS[office][(i + 1) % OFFICE_CLUBS[office].length], archetype: 'swap' as const, frame: 'Test frame about {test-list}.', ...t }))),
  lists: [{ id: 'test-list', title: 'Test list', phrases: ['test phrase 1', 'test phrase 2', 'test phrase 3'] }],
  night: [
    { id: 'night-open', moment: 'open', text: 'Test line: the first envelope.' },
    { id: 'night-majority', moment: 'majority', text: 'Test line: a majority.' },
  ],
  returning: [{ id: 'back-pumpkin', text: 'Back again, with the same pumpkin and a firmer tone.' }],
  away: [{ id: 'away-test', text: 'Test away line.' }],
  captions: [{ id: 'caption-unopposed', text: 'Elected Mayor of Dithering-on-the-Dawdle, unopposed. The other candidate went to the wrong hall.' }],
  monuments: [
    { id: 'bust', name: 'A bust of yourself', text: 'Test monument line.' },
    { id: 'bust-of-bust', name: 'A bust of the bust', text: 'Test monument line 2.' },
  ],
};

/** The decree block of the test config: the frozen numbers and the frozen deck (`overrides` shallow per top-level key). */
export function decreeTestContent(overrides: Partial<DecreeContentInput> = {}) {
  return DecreeSchema.parse(JSON.parse(JSON.stringify({ ...DECREE_TEST_NUMBERS, deck: DECREE_TEST_DECK, ...overrides })));
}

/** The test config: the shared fields of the frozen fixture, mode "decree", the frozen numbers and deck (`overrides` shallow per top-level key). */
export function decreeTestConfig(overrides: Partial<DecreeContentInput> = {}): R.DecreeConfig {
  const raw = { ...(baseGame as Record<string, unknown>), mode: 'decree', soundPack: null, businesses: [], upgrades: [] };
  const cfg = GameConfigSchema.parse(raw);
  cfg.economy.prestige = { ...cfg.economy.prestige, bonusPerPoint: 0 };
  cfg.economy.startingCash = 30;
  return { ...cfg, decree: decreeTestContent(overrides) } as R.DecreeConfig;
}

/** A shared state shaped like economy.createInitialState's, without importing economy.ts. */
export function baseGameState(now: number, seed = 12345): GameState {
  return {
    version: 2,
    cash: 0,
    gems: 0,
    runEarnings: 0,
    lifetimeEarnings: 0,
    prestigePoints: 0,
    prestigeCount: 0,
    venues: {},
    activeVenue: 'main',
    upgrades: [],
    boostUntil: 0,
    rush: { until: 0, readyAt: 0 },
    storySeen: [],
    entitlements: { noAds: false, skipRewarded: false, products: [], multipliers: {} },
    daily: { lastClaimDay: null, streak: 0 },
    cards: {},
    chests: { owned: {}, freeAnchor: 0, freeClaimed: 0, adDay: null, adCount: 0, adNextAt: 0, sinceEpic: 0, sinceLegendary: 0, seed: seed ^ 0x4348, opened: {} },
    missions: { slots: [], completed: {}, total: 0, day: null, doneToday: 0 },
    deals: {},
    dailyShop: { day: null, offerIds: [], bought: [] },
    rng: seed >>> 0,
    stats: { taps: 0, adsWatched: 0, playSeconds: 0, firstOpenAt: now, served: 0, levelsBought: 0, hires: 0, chestsOpened: 0, bonusCaught: 0, rushes: 0, sessions: 0, venuesEver: 1, clockHigh: now },
    lastSavedAt: now,
  };
}

/** A new decree game (the rules' own create): scripted paper 1 on the desk. */
export function freshState(cfg: R.DecreeConfig = decreeTestConfig(), seed = 12345, now = FIXTURE_NOW): R.DecreeGame {
  return R.createDecree(cfg, baseGameState(now, seed));
}

/** A comic paper of the test deck fixed by hand (the skeleton has no draw yet): its archetype's base effects, jitter 1. */
function handPaper(cfg: R.DecreeConfig, g: R.DecreeGame, id: string): R.Paper {
  const def = cfg.decree.deck.papers.find((p) => p.id === id)!;
  const office = g.decree.office;
  const arch = cfg.decree.archetypes.find((a) => a.id === def.archetype)!;
  const sides = { petitioner: R.clubIndex(cfg, office, def.club), other: def.other ? R.clubIndex(cfg, office, def.other) : null };
  const side = (effects: typeof arch.sign) => ({ effects: R.resolveEffects(cfg, office, effects, sides), followUp: null, label: null });
  return { id: `comic:${id}:0`, kind: 'comic', source: id, office, visitor: { ...def.visitor, clubIx: sides.petitioner }, cosigner: def.cosigner ?? null, text: def.text, returning: null, archetype: def.archetype, petitioner: sides.petitioner, other: sides.other, tags: { subject: def.subject, butt: def.butt, shape: def.shape }, sign: side(arch.sign), refuse: side(arch.refuse), clipping: null, ministry: null, drawnLevel: null, district: null, note: null, jitter: 1 };
}

/** A campaign paper of the test deck fixed by hand (2.10: sign 45 s of B and the district's +4 campaign points | No change). */
function handCampaignPaper(cfg: R.DecreeConfig, g: R.DecreeGame, id: string, district: number): R.Paper {
  const def = cfg.decree.deck.runUp.find((p) => p.id === id)!;
  const office = g.decree.office;
  const f = cfg.decree.forms.campaign;
  const name = cfg.decree.offices[office].districts[district].name;
  const sign = R.resolveEffects(cfg, office, [{ type: 'money', seconds: f.seconds, sign: -1 }, { type: 'district', points: f.points }], { petitioner: null, other: null, district });
  return { id: `campaign:${id}:0`, kind: 'campaign', source: id, office, visitor: { ...def.visitor, clubIx: null }, cosigner: null, text: def.text.replace('{district}', name), returning: null, archetype: null, petitioner: null, other: null, tags: { subject: def.subject, butt: def.butt, shape: def.shape }, sign: { effects: sign, followUp: null, label: null }, refuse: { effects: [], followUp: null, label: null }, clipping: null, ministry: null, drawnLevel: null, district, note: null, jitter: 1 };
}

/** The office `office`'s fresh decree fields on a fresh game (the skeleton has no move yet: a hand-made seat). */
function seated(cfg: R.DecreeConfig, office: R.OfficeIx, seed: number): R.DecreeGame {
  const g = freshState(cfg, seed);
  return { ...g, decree: { ...R.freshDecree(cfg, g.decree.seed, office), scriptedDone: ['mayor:1', 'mayor:2', 'mayor:3', 'mayor:4'] } };
}

/** The hand-made mid-game states (typed and valid). */
export function decreeFixtures(cfg: R.DecreeConfig = decreeTestConfig()) {
  const fresh = freshState(cfg);

  // Day 30 of the first mayoral term, about minute 4: three ministries open, a swap paper on the desk.
  const mayor0: R.DecreeGame = {
    ...fresh,
    cash: 2_000,
    stats: { ...fresh.stats, playSeconds: 240 },
    decree: {
      ...fresh.decree,
      day: 30,
      ministries: [{ open: true, level: 10 }, { open: true, level: 7 }, { open: true, level: 3 }, { open: false, level: 0 }],
      moods: [55, 47, 52],
      gossip: 2,
      desk: null,
      scriptedDone: ['mayor:1', 'mayor:2', 'mayor:3', 'mayor:4'],
      applicationsDelivered: ['pockle'],
      cabinet: { pockle: { club: 'bus', termsServed: 0 } },
      nextArrivalAt: 250,
      stats: { ...fresh.decree.stats, decisions: 30, daysEver: 30, signed: 14, refused: 16 },
    },
  };
  const mayorMidTerm = R.landPaper(cfg, mayor0, handPaper(cfg, mayor0, 'may-bus-name'), 240);

  // The run-up of the first governor term, just called at day 70: the first of K = 4 campaign papers on
  // the desk (2.17: the first at once), the next τ later; the Vegetables (club 2) boycotting their
  // Glasshouse Office since their grievance was refused (it runs 5 more papers; no grievance waits).
  const gov = seated(cfg, 1, 4);
  const gov0: R.DecreeGame = {
    ...gov,
    cash: 1_500_000,
    stats: { ...gov.stats, playSeconds: 1_900 },
    decree: {
      ...gov.decree,
      day: 70,
      phase: 'campaign',
      nr: 12,
      ministries: [{ open: true, level: 20 }, { open: true, level: 14 }, { open: true, level: 9 }, { open: true, level: 6 }, { open: true, level: 2 }, { open: false, level: 0 }],
      moods: [52, 47, 18, 55, 60],
      armed: [true, true, false, true, true],
      strikes: [null, null, { papersLeft: 5, picket: 'GIVE THEM BACK', grievance: 'griev-scissors' }, null, null],
      campaign: { C: [0, 0, 0, 0, 0, 0, 0], papersLeft: 3, rallyDone: false },
      nextArrivalAt: 1_900 + cfg.decree.offices[1].tau,
      cabinet: { pockle: { club: 'bus', termsServed: 2 }, pellow: { club: 'veg', termsServed: 1 }, ferrule: { club: 'shops', termsServed: 1 } },
      applicationsDelivered: ['pockle', 'pellow', 'ferrule'],
      picketsThisTerm: ['GIVE THEM BACK'],
      wall: [{ office: 0, terms: 2, levels: [24, 22, 18, 16] }],
      stats: { ...gov.decree.stats, decisions: 250, daysEver: 250, boycotts: 1, elections: 2, wins: 2 },
    },
  };
  const governorAtCall = R.landPaper(cfg, gov0, handCampaignPaper(cfg, gov0, 'run-test-governor-1', 3), 1_900);

  // Term 3 as President: The Very Long Bridge open (term 2), six ministers, Bandstand Summer running (term 3's twist).
  const pres = seated(cfg, 2, 99);
  const presidentTerm3: R.DecreeGame = {
    ...pres,
    cash: 4.2e9,
    stats: { ...pres.stats, playSeconds: 10_800 },
    decree: {
      ...pres.decree,
      term: 3,
      presTerms: 3,
      day: 40,
      nr: 70,
      ministries: [...[30, 26, 22, 20, 16, 12, 9, 5].map((level) => ({ open: true, level })), { open: true, level: 1 }],
      moods: [58, 51, 49, 62, 44, 50, 47],
      gossip: 3,
      twistIndex: 2,
      twists: ['bandstand_summer'],
      vanity: ['bust', 'bust-of-bust'],
      cabinet: Object.fromEntries(['pockle', 'pellow', 'ferrule', 'hush', 'bole', 'gusset'].map((m) => [m, { club: cfg.decree.ministers.find((x) => x.id === m)!.club, termsServed: 3 }])),
      applicationsDelivered: ['pockle', 'pellow', 'ferrule', 'hush', 'bole', 'gusset'],
      wall: [{ office: 0, terms: 2, levels: [24, 22, 18, 16] }, { office: 1, terms: 3, levels: [40, 35, 30, 28, 22, 18] }],
      nextArrivalAt: 10_815,
      stats: { ...pres.decree.stats, decisions: 800, daysEver: 800, elections: 7, wins: 6 },
    },
  };

  return { fresh, mayorMidTerm, governorAtCall, presidentTerm3 };
}
