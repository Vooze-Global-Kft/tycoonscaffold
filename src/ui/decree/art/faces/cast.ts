/**
 * The cast table (spec 7.3; the names register scripts/content/office/names.json, kind "cast"):
 * every person of the Republic of Middling as a look built from parts.
 *
 * THE TONE RULE, IN THE TABLE'S SHAPE: a row is the skin tone followed by the feature parts. The
 * tone is a palette parameter only (the colour of the skin wash, `ink.ts` TONES); no part's drawing
 * reads it, and no column of this table is derived from it. The tone sheet
 * (scripts/art/decree-faces.ts, `tones.png`) draws one set of parts across every tone to show it.
 *
 * Columns of a row (one string, space separated, `-` for none):
 *   tone head eyes brows nose mouth facial glasses extra hair hairColour hat hatColour garment cloth accent prop propAccent
 */
import { CLOTH, type Cloth, type HairColour, type ToneId } from './ink';
import { BROWS, EXTRAS, EYES, FACIAL, GLASSES, HAIRS, HEADS, MOUTHS, NOSES, type BrowsId, type ExtraId, type EyesId, type FacialId, type GlassesId, type HairId, type HeadId, type MouthId, type NoseId } from './head';
import { GARMENTS, HATS, type GarmentId, type HatId } from './wear';
import { PROPS, type PropId } from './props';
import { HAIR, TONE_IDS } from './ink';

export type CastGroup = 'player' | 'advisor' | 'spokesperson' | 'lobbyist' | 'other' | 'minister' | 'rival';

export interface Look {
  id: string;
  group: CastGroup;
  tone: ToneId;
  head: HeadId;
  eyes: EyesId;
  brows: BrowsId;
  nose: NoseId;
  mouth: MouthId;
  facial: FacialId;
  glasses: GlassesId;
  extra: ExtraId;
  hair: HairId;
  hairColour: HairColour;
  hat: HatId;
  hatColour: Cloth;
  garment: GarmentId;
  cloth: Cloth;
  accent: Cloth;
  prop: PropId | 'none';
  propAccent: Cloth;
}

/** The feature columns (everything but the tone): two looks may never share all of them. */
export const PART_COLUMNS = ['head',         'eyes', 'brows', 'nose', 'mouth', 'facial', 'glasses', 'extra', 'hair', 'hairColour', 'hat', 'hatColour', 'garment', 'cloth', 'accent', 'prop', 'propAccent'] as const;

// prettier-ignore
const ROWS: [string, CastGroup, string][] = [
  //  id            group           tone head   eyes    brows     nose     mouth  facial   glasses extra    hair     hairCol  hat      hatCol   garment    cloth      accent     prop        propAcc
  // You: six faces, at least four tones and both sexes (spec 7.3). The rosette is your vanity.
  ['bramble',      'player',       't2 egg    dot     arched    button   smile  none     none    none     bun      chestnut -        -        cardigan   sage       plum       rosette     violet'],
  ['fennel',       'player',       't5 square lidded  level     straight smirk  none     none    none     swept    brown    -        -        cardigan   copper     cream      rosette     violet'],
  ['quill',        'player',       't6 heart  dot     quizzical snub     smile  none     round   earrings cloud    black    -        -        bow        slate      terracotta rosette     violet'],
  ['marchpane',    'player',       't1 square crinkle bushy     bulb     smile  beard    round   freckles curly    sandy    -        -        coat       walnut     teal       rosette     violet'],
  ['tuttle',       'player',       't4 soft   dot     level     pointed  flat   none     cat     none     waves    auburn   -        -        pearls     plum       dove       rosette     violet'],
  ['larkspur',     'player',       't3 pear   dot     worried   snub     smile  brush    none    none     quiff    brown    -        -        scarf      teal       ochre      rosette     violet'],
  // Advisors
  ['spinwell',     'advisor',      't3 long   dot     arched    straight grin   none     none    none     part     black    -        -        suit       charcoal   violet     camera      charcoal'],
  ['abacus',       'advisor',      't1 egg    lidded  stern     pointed  pursed none     half    earrings bun      grey     -        -        cardigan   slateBlue  dove       abacus      walnut'],
  ['wimble',       'advisor',      't4 pear   wide    quizzical button   smile  none     square  pencil   crop     brown    -        -        jumper     sage       cream      forms       cream'],
  ['dimity',       'advisor',      't5 square lidded  level     snub     flat   none     none    none     bob      black    -        -        coat       moss       ochre      sandwich    cream'],
  ['fenn',         'advisor',      't2 long   lidded  worried   long     flat   none     half    none     pixie    white    -        -        pearls     navy       dove       folder      ochre'],
  // Spokespeople: two per club, each with one prop of the club; the club's colour in the accent.
  ['kerb',         'spokesperson', 't4 long   dot     level     straight flat   none     round   none     crop     black    flatcap  charcoal coat       slate      terracotta notebook    navy'],
  ['sprott',       'spokesperson', 't1 pear   wide    arched    snub     o      none     none    freckles curly    auburn   -        -        jumper     terracotta cream      binoculars  charcoal'],
  ['till',         'spokesperson', 't3 heart  dot     arched    pointed  smile  none     none    earrings flick    brown    -        -        bow        sage       cream      bell        ochre'],
  ['awning',       'spokesperson', 't6 egg    lidded  quizzical straight smirk  none     cat     none     pixie    black    beret    plum     turtleneck charcoal   sage       duster      sage'],
  ['gourdley',     'spokesperson', 't2 square dot     stern     bulb     pursed none     none    cheeks   waves    grey     cloche   slateBlue coat      moss       slateBlue  pumpkin     violet'],
  ['loam',         'spokesperson', 't5 soft   lidded  bushy     bulb     flat   beard    none    none     fringe   grey     -        -        waistcoat  slateBlue  ochre      balance     ochre'],
  ['bellows',      'spokesperson', 't6 square wide    bushy     bulb     grin   brush    none    cheeks   crop     grey     -        -        waistcoat  copper     cream      tuba        copper'],
  ['slide',        'spokesperson', 't3 egg    dot     worried   button   smile  none     round   none     ponytail auburn   -        -        jumper     copper     dove       cornet      copper'],
  ['hake',         'spokesperson', 't1 long   lidded  level     long     pursed none     none    none     long     fair     bucket   sage     coat       plum       sage       float       plum'],
  ['dabble',       'spokesperson', 't4 egg    close   worried   snub     flat   none     none    none     wisps    brown    bobble   moss     scarf      moss       plum       rod         plum'],
  ['loft',         'spokesperson', 't3 long   wide    arched    straight smile  none     none    none     curly    sandy    -        -        jumper     slate      ochre      kite        ochre'],
  ['updraught',    'spokesperson', 't5 heart  wide    arched    snub     o      none     none    freckles cloud    auburn   -        -        jumper     ochre      dove       reel        ochre'],
  ['topiary',      'spokesperson', 't2 long   dot     stern     pointed  flat   none     square  none     bob      black    -        -        bow        dove       baize      topiary     dove'],
  ['edging',       'spokesperson', 't6 pear   lidded  level     long     flat   sideburns half   none     crop     white    -        -        cardigan   dove       moss       shears      dove'],
  // Lobbyists, each with their absurd trade
  ['sash',         'lobbyist',     't1 egg    lidded  arched    pointed  smirk  none     none    none     swept    black    -        -        suit       plum       ochre      ribbon      violet'],
  ['vane',         'lobbyist',     't5 long   close   worried   long     flat   none     none    none     part     grey     trilby   charcoal coat       charcoal   slate      umbrella    navy'],
  ['goss',         'lobbyist',     't4 soft   dot     arched    button   smile  none     none    earrings bun      auburn   -        -        pearls     teal       dove       fountain    slate'],
  ['slake',        'lobbyist',     't3 square wide    quizzical snub     grin   none     none    none     crop     brown    hatOnHat ochre    waistcoat  cream      terracotta hatbox      terracotta'],
  // Others
  ['minute',       'other',        't2 pear   lidded  level     long     pursed beard    square  none     bald     white    -        -        suit       charcoal   plum       clipboard   walnut'],
  ['tallow',       'other',        't6 egg    dot     level     straight flat   none     round   none     bun      grey     -        -        cardigan   navy       dove       envelope    violet'],
  // Ministers
  ['pockle',       'minister',     't3 square dot     arched    button   smile  none     none    none     pixie    grey     -        -        coat       terracotta cream      magnifier   ochre'],
  ['pellow',       'minister',     't1 soft   crinkle level     snub     smile  none     none    cheeks   waves    chestnut -        -        jumper     slateBlue  cream      wateringCan slateBlue'],
  ['ferrule',      'minister',     't4 square lidded  stern     pointed  flat   beard    half    none     cloud    grey     -        -        suit       charcoal   sage       cane        walnut'],
  ['hush',         'minister',     't4 heart  lidded  level     button   pursed none     cat     none     bob      grey     -        -        pearls     sage       dove       teacup      sage'],
  ['bole',         'minister',     't2 square wide    bushy     bulb     grin   none     round   cheeks   pixie    auburn   -        -        bow        copper     ochre      bunting     copper'],
  ['gusset',       'minister',     't6 egg    dot     level     snub     smile  beard    none    none     crop     black    trilby   plum     jumper     plum       cream      lifebuoy    terracotta'],
  ['wren',         'minister',     't5 long   dot     arched    pointed  smile  none     round   earrings ponytail black    -        -        turtleneck ochre      dove       windsock    terracotta'],
  ['tamp',         'minister',     't1 square close   stern     straight flat   brush    square  none     crop     sandy    -        -        jumper     dove       moss       level       ochre'],
  ['nibley',       'minister',     't3 pear   wide    worried   snub     o      none     half    none     waves    fair     beret    plum     coat       plum       slate      boat        slateBlue'],
  // Rivals: an individual with a hobby (the prop), never a party or a colour
  ['stitchley',    'rival',        't4 egg    dot     arched    button   smile  none     none    earrings bob      auburn   flowers  plum     coat       dove       plum       none        plum'],
  ['dunnock',      'rival',        't2 long   lidded  bushy     long     flat   none     half    none     swept    white    -        -        waistcoat  walnut     ochre      knocker     ochre'],
  ['setter',       'rival',        't6 heart  dot     quizzical pointed  smirk  none     cat     none     pixie    grey     -        -        turtleneck slate      dove       crossword   slate'],
  ['waft',         'rival',        't3 soft   crinkle level     bulb     smile  beard    none    none     wisps    white    -        -        suit       navy       terracotta spoon       terracotta'],
  ['mallowby',     'rival',        't1 square wide    arched    snub     grin   none     none    freckles long     sandy    bobble   teal     jumper     teal       cream      accordion   terracotta'],
  ['noonday',      'rival',        't5 pear   lidded  level     straight flat   none     none    none     bald     black    -        -        cardigan   moss       ochre      sundial     slate'],
  ['kalends',      'rival',        't4 long   dot     worried   long     o      none     round   none     swept    grey     -        -        cardigan   walnut     slateBlue  calendar    terracotta'],
  ['strop',        'rival',        't6 square lidded  stern     straight smirk  none     none    earrings bun      white    -        -        bow        navy       dove       chair       plum'],
  ['ringrose',     'rival',        't2 heart  wide    arched    button   o      none     half    none     flick    grey     -        -        pearls     violet     dove       handbell    ochre'],
  ['mould',        'rival',        't5 square close   bushy     bulb     smile  beard    none    none     curly    grey     flatcap  moss     jumper     moss       walnut     trowel      walnut'],
  ['dovecote',     'rival',        't1 long   dot     level     pointed  smile  none     none    none     bun      fair     -        -        coat       slateBlue  dove       pigeon      dove'],
  ['pharos',       'rival',        't3 egg    lidded  level     straight flat   brush    square  none     swept    grey     -        -        coat       navy       cream      lighthouse  terracotta'],
  ['lathe',        'rival',        't4 soft   lidded  arched    snub     smile  none     half    earrings waves    black    -        -        cardigan   plum       sage       hoop        terracotta'],
  ['furlong',      'rival',        't6 long   wide    level     straight grin   none     none    none     quiff    black    -        -        jumper     slate      ochre      harmonica   dove'],
  ['tessel',       'rival',        't2 egg    wide    worried   snub     o      none     square  none     long     chestnut -        -        jumper     ochre      cream      jigsaw      teal'],
  ['pantry',       'rival',        't1 pear   dot     stern     bulb     flat   sideburns round   none     fringe   grey     bowler   charcoal suit       walnut     slate      barometer   walnut'],
  ['ambling',      'rival',        't5 heart  dot     level     pointed  smile  none     none    freckles ponytail auburn   bucket   moss     coat       moss       ochre      boots       walnut'],
  ['knapp',        'rival',        't3 square crinkle arched    bulb     o      sideburns none   cheeks   part     brown    -        -        scarf      walnut     teal       songsheet   cream'],
];

function parseRow(id: string, group: CastGroup, spec: string): Look {
  const t = spec.trim().split(/\s+/);
  if (t.length !== 18) throw new Error(`cast row ${id}: ${t.length} columns, 18 expected`);
  const [tone, head, eyes, brows, nose, mouth, facial, glasses, extra, hair, hairColour, hat, hatColour, garment, cloth, accent, prop, propAccent] = [t[0], ...t.slice(1)];
  return {
    id,
    group,
    tone: tone as ToneId,
    head: head as HeadId,
    eyes: eyes as EyesId,
    brows: brows as BrowsId,
    nose: nose as NoseId,
    mouth: mouth as MouthId,
    facial: facial as FacialId,
    glasses: glasses as GlassesId,
    extra: extra as ExtraId,
    hair: hair as HairId,
    hairColour: hairColour as HairColour,
    hat: (hat === '-' ? 'none' : hat) as HatId,
    hatColour: (hatColour === '-' ? 'charcoal' : hatColour) as Cloth,
    garment: garment as GarmentId,
    cloth: cloth as Cloth,
    accent: accent as Cloth,
    prop: prop as PropId | 'none',
    propAccent: propAccent as Cloth,
  };
}

/** Every look, in the names register's order. */
export const CAST: readonly Look[] = ROWS.map(([id, g, s]) => parseRow(id, g, s));
export const CAST_IDS: readonly string[] = CAST.map((l) => l.id);
const BY_ID = new Map(CAST.map((l) => [l.id, l]));

/**
 * How the six player faces read (spec 7.3: both sexes among them). Taken from their names in the
 * register (Hettie, Ada, Winifred; Osgood, Rupert, Cosmo); no part depends on it.
 */
export const PLAYER_PRESENTATION: Readonly<Record<string, 'woman' | 'man'>> = {
  bramble: 'woman',
  fennel: 'man',
  quill: 'woman',
  marchpane: 'man',
  tuttle: 'woman',
  larkspur: 'man',
};

/** The six player faces (spec 3.1's face picker), in the register's order. */
export const PLAYER_IDS: readonly string[] = CAST.filter((l) => l.group === 'player').map((l) => l.id);
/** Who stands on election night as a paper cut-out: the Counting Clerk and every rival. */
export const CUTOUT_IDS: readonly string[] = ['tallow', ...CAST.filter((l) => l.group === 'rival').map((l) => l.id)];

export function lookOf(castId: string): Look | undefined {
  return BY_ID.get(castId);
}

export function hasLook(castId: string): boolean {
  return BY_ID.has(castId);
}

/** A key of every part but the tone (the uniqueness test compares these). */
export function partsKey(l: Look): string {
  return PART_COLUMNS.map((k) => l[k]).join('|');
}

/** Checks a look's every part exists (tests). Returns the problems found. */
export function lookProblems(l: Look): string[] {
  const bad: string[] = [];
  const has = (table: object, k: string) => Object.prototype.hasOwnProperty.call(table, k);
  if (!TONE_IDS.includes(l.tone)) bad.push(`tone ${l.tone}`);
  const checks: [object, string, string][] = [
    [HEADS, l.head, 'head'],
    [EYES, l.eyes, 'eyes'],
    [BROWS, l.brows, 'brows'],
    [NOSES, l.nose, 'nose'],
    [MOUTHS, l.mouth, 'mouth'],
    [FACIAL, l.facial, 'facial'],
    [GLASSES, l.glasses, 'glasses'],
    [EXTRAS, l.extra, 'extra'],
    [HAIRS, l.hair, 'hair'],
    [HAIR, l.hairColour, 'hairColour'],
    [HATS, l.hat, 'hat'],
    [CLOTH, l.hatColour, 'hatColour'],
    [GARMENTS, l.garment, 'garment'],
    [CLOTH, l.cloth, 'cloth'],
    [CLOTH, l.accent, 'accent'],
    [CLOTH, l.propAccent, 'propAccent'],
  ];
  for (const [t, k, name] of checks) if (!has(t, k)) bad.push(`${name} ${k}`);
  if (l.prop !== 'none' && !has(PROPS, l.prop)) bad.push(`prop ${l.prop}`);
  return bad;
}
