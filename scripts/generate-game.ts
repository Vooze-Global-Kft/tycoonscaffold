/**
 * Generates a whole new game from a one-line theme using Claude.
 *
 *   npm run generate -- "haunted hotel" --id haunted-hotel --org com.yourstudio
 *   npm run generate -- "dinosaur zoo" --base space-miner          (a classic game)
 *   npm run generate -- "haunted hotel" --base pizza-empire --dry-run --id _dry-test
 *
 * Claude writes only the *skin*: names, texts, icons, colours (stage colours too), characters
 * (drawn in code from a "look"), story, store listing, and in sim mode the names of the chain's
 * stages, the venues and the rush skill; plus card, chest, mission, deal and daily-offer texts.
 * Every number comes from the base game you have already balanced, then gets a seeded variation
 * of a few percent (scripts/lib/vary.ts) so no two games share an economy table: the stores
 * reject families of look-alike apps, and `npm run validate` rejects shared tables.
 * Tune it afterwards with `npm run simulate`.
 *
 * --dry-run skips the API and merges a built-in synthetic skin, to test the merge and validation
 * path without a key. Needs ANTHROPIC_API_KEY (or an `ant auth login` profile) otherwise.
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { lintGameConfig } from '../src/config/lint';
import { GameConfigSchema, type GameConfig } from '../src/config/schema';
import { BODY_SHAPES, BROWS, CHARACTER_KINDS, GLASSES, HAIR_STYLES, HATS, NECKWEAR, OUTFIT_STYLES, SPECIES } from '../src/ui/sim/art/types';
import { IDLE_TYCOON_TITLE } from './lib/checks';
import { args, fail } from './lib/cli';
import { seededRandom, TEST_ADMOB, varyEconomy } from './lib/vary';

const games = require('./lib/games.js');

const { positional, flags } = args();
const theme = positional[0];
if (!theme) fail('Usage: npm run generate -- "<theme>" [--id my-game] [--base pizza-empire] [--org com.yourstudio] [--dry-run] [--force]');
const baseId = flags.base ?? 'pizza-empire';
if (!fs.existsSync(path.join(games.gameDir(baseId), 'game.json'))) fail(`games/${baseId}/game.json does not exist`);
const baseRaw = games.readGameJson(baseId);
const base: GameConfig = GameConfigSchema.parse(baseRaw);
const org = flags.org ?? 'com.example';
const dryRun = flags['dry-run'] === 'true';
const isSim = base.mode === 'sim' && !!base.sim;

// ---------------------------------------------------------------- the skin Claude writes

const Color = z.string().describe('hex colour, #RRGGBB');
const Icon = z.string().describe('a single emoji that renders on iOS and Android (no very new emoji)');
const Look = z
  .object({
    kind: z.enum(CHARACTER_KINDS),
    species: z.enum(SPECIES),
    body: z.enum(BODY_SHAPES),
    skin: Color.describe('skin colour (metal colour for robots)'),
    hair: Color,
    hairStyle: z.enum(HAIR_STYLES),
    hat: z.enum(HATS),
    outfit: Color,
    accent: Color,
    outfitStyle: z.enum(OUTFIT_STYLES),
    glasses: z.enum(GLASSES).nullable(),
    brows: z.enum(BROWS),
    neck: z.enum(NECKWEAR),
  })
  .describe('how the code-drawn character looks; adults only, an original design');

function skinSchema(b: GameConfig) {
  const named = z.object({ name: z.string(), icon: Icon });
  return z.object({
    id: z.string().describe('kebab-case id, e.g. "haunted-hotel"'),
    displayName: z.string().describe('home-screen name, 12 characters or fewer'),
    colors: z.object({
      background: Color, backgroundAlt: Color, surface: Color, primary: Color, primaryText: Color,
      accent: Color, text: Color, textMuted: Color, success: Color, danger: Color, progress: Color,
      gradient: z.array(Color).describe('3 colours for the header gradient'),
      stages: z.object({ production: Color, transport: Color, sales: Color }).describe('three clearly different colours, one per stage of the chain'),
    }),
    heroIcon: Icon,
    particleIcon: Icon,
    strings: z.object({
      currencyName: z.string(), currencySymbol: z.string().describe('1 character'), currencyIcon: Icon,
      gemName: z.string(), gemIcon: Icon, prestigeName: z.string(), prestigeIcon: Icon,
      prestigeVerb: z.string().describe('1-2 words'), prestigeDescription: z.string(),
      managerTab: z.string().describe('1 word'), upgradeTab: z.string().describe('1 word'), tapHint: z.string(),
    }),
    bonusName: z.string().describe('the lucky item that flies across the screen'),
    comboName: z.string().describe('1-2 words in capitals, shown when tapping fast'),
    businesses: z.array(z.object({
      name: z.string(), icon: Icon, flavor: z.string(), managerName: z.string(), managerIcon: Icon,
      productName: z.string().describe('what this station makes (sim mode); repeat the name in classic mode'),
      productIcon: Icon,
    })),
    upgrades: z.array(named),
    characters: z.array(z.object({ id: z.string().describe('lowercase letters only'), name: z.string(), color: Color, look: Look })),
    story: z.array(z.object({ id: z.string(), characterId: z.string(), title: z.string().nullable(), lines: z.array(z.string()) })),
    iapTitles: z.array(z.object({ title: z.string(), description: z.string() })),
    sim: z
      .object({
        production: named, buffer: named,
        transport: z.object({ name: z.string(), workerName: z.string(), icon: Icon, managerName: z.string(), managerIcon: Icon, managerFlavor: z.string(), bellName: z.string() }),
        sales: z.object({ name: z.string(), seatName: z.string(), icon: Icon }),
        rush: named,
        venues: z.array(z.object({ name: z.string(), place: z.string(), icon: Icon, blurb: z.string(), wall: Color, floorA: Color, floorB: Color, trim: Color })),
      })
      .nullable()
      .describe(b.sim ? 'the production chain: required' : 'null (this base has no production chain)'),
    cards: z.array(z.object({ name: z.string(), title: z.string(), flavor: z.string(), look: Look })),
    chests: z.array(z.object({ name: z.string(), icon: Icon, blurb: z.string() })),
    missions: z.array(z.string().describe('mission text containing {n}')),
    deals: z.array(z.object({ title: z.string(), blurb: z.string(), icon: Icon })),
    dailyOffers: z.array(z.object({ title: z.string(), icon: Icon })),
    store: z.object({
      title: z.string().describe('30 characters or fewer; NOT "Idle <something> Tycoon"'),
      subtitle: z.string().describe('30 characters or fewer'),
      keywords: z.array(z.string()).describe('10-14 single search words, all together under 100 characters'),
      shortDescription: z.string().describe('80 characters or fewer'),
      description: z.string().describe('store description, 600-1200 characters, bullet points with •'),
    }),
  });
}
const SkinSchema = skinSchema(base);
type Skin = z.infer<typeof SkinSchema>;

const STAT_TEXT: Record<string, string> = {
  stationValue: 'boosts what a station makes', transportCapacity: 'boosts transport', salesSpend: 'boosts what guests pay',
  globalIncome: 'boosts all income', tapValue: 'boosts taps', offlineEarnings: 'boosts earnings while away',
  bonusValue: 'boosts the lucky bonus', rushDuration: 'makes the rush skill last longer',
};

/** What the model needs to know about the base: structure and meaning, never its words to copy. */
function describeBase() {
  const m = base.meta;
  return {
    mode: base.mode,
    businesses: base.businesses.map((b, i) => ({ index: i, original: b.name, cycleSeconds: b.cycleSeconds, ...(isSim ? { stationKind: b.stationKind ?? 'generic' } : {}) })),
    upgrades: base.upgrades.map((u) => ({
      original: u.name,
      appliesTo: u.target === 'all' ? 'all income' : base.businesses.find((b) => b.id === u.target)?.name,
      premium: u.premium,
    })),
    story: base.story.map((s) => ({ id: s.id, trigger: s.trigger, lines: s.lines.length })),
    iap: base.monetization.iap.products.map((p) => ({ kind: p.kind, value: p.value, original: p.title })),
    prestigeBonusPercent: base.economy.prestige.bonusPerPoint * 100,
    sim: base.sim
      ? { stages: ['production (stations)', `buffer (${base.sim.buffer.name})`, `transport (${base.sim.transport.name})`, `sales (${base.sim.sales.name})`], venues: base.sim.venues.length, rush: base.sim.rush.name }
      : null,
    cards: m.cards.map((c) => ({ rarity: c.rarity, effect: STAT_TEXT[c.stat] })),
    chests: m.chests.map((c) => ({ tier: c.tier, slots: c.slots })),
    missions: m.missions.templates.map((t) => ({ counts: t.type, original: t.text })),
    deals: m.deals.map((d) => ({ original: d.title, contents: d.contents.map((r) => r.type) })),
    dailyOffers: m.dailyShop.offers.map((o) => ({ original: o.title, reward: o.reward.type, free: o.gemCost === 0 })),
  };
}

function prompt(): string {
  const m = base.meta;
  const n = (k: string, count: number) => `- ${k}: exactly ${count}, in the same order as the base.`;
  return `Design the theme for a new idle game for phones. Theme: "${theme}".

The engine and every number are fixed. You write the skin that replaces the base game's names and texts one for one. The base game's structure:
${JSON.stringify(describeBase(), null, 2)}

Counts (the game breaks if they differ):
${n('businesses', base.businesses.length)} From a tiny humble start to something absurdly grand; each a big step up.${isSim ? ' They are stations in a production chain; productName is what each one makes.' : ''}
${n('upgrades', base.upgrades.length)} Each name fits what it applies to.
${n('story', base.story.length)} Same ids (${base.story.map((s) => s.id).join(', ')}) and meaning as the triggers; 1-3 short lines each; characterId must be one of your characters. The first beat teaches the first tap.
${n('iapTitles', base.monetization.iap.products.length)} Same meaning as the base products.
${n('cards', m.cards.length)} Staff or specialists whose job fits the effect listed.
${n('chests', m.chests.length)} Chests are earned, never bought: never write "buy" or a price in their texts.
${n('missions', m.missions.templates.length)} Each must contain {n} where the number goes and count the same thing as the base mission.
${n('deals', m.deals.length)} Plain titles. No "Buy now", no urgency, no fake discounts, no guilt.
${n('dailyOffers', m.dailyShop.offers.length)}
- sim: ${isSim ? `required, with exactly ${base.sim!.venues.length} venues from humble to grand.` : 'null.'}
- characters: 1-3 memorable, ORIGINAL characters (a mentor and a rival work well). Do not imitate characters, mascots or people from other games, films or brands.

Rules:
- Store title: never the pattern "Idle <something> Tycoon" (another studio registers those as trademarks) and do not name or imitate any other game, company, product or brand.
- No real brand names, trademarks, slogans or catchphrases anywhere, even as a joke (no "happiest place on Earth", "30 minutes or it's free" and the like).
- Audience 13+: show adults; nothing aimed at young children, nothing scary or violent.
- colors: cohesive and high-contrast. text must read on background and surface; primaryText on primary. The three stage colours must be easy to tell apart.
- Store listing: written for App Store and Google Play search; put the most-searched relevant words in the title and keywords, without repeating words between them. The description must be your own text, not a template.
- prestigeDescription mentions the ${describeBase().prestigeBonusPercent}% bonus per point.
- Tone: light, funny, warm.`;
}

async function generateSkin(): Promise<Skin> {
  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    // If a request is declined, the API retries it on a fallback model automatically.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: betaZodOutputFormat(SkinSchema) },
    messages: [{ role: 'user', content: prompt() }],
  });
  if (response.stop_reason === 'refusal') fail(`Claude declined this theme (${response.stop_details?.category ?? 'no category'}). Try another.`);
  if (response.stop_reason === 'max_tokens') fail('Response was cut off; try again.');
  if (!response.parsed_output) fail('Could not parse the generated theme; try again.');
  return response.parsed_output;
}

/** A deterministic stand-in skin for --dry-run: every field the merge needs, made from the theme. */
function syntheticSkin(): Skin {
  const r = seededRandom(theme);
  const word = theme.split(/\s+/).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  const hex = () => '#' + Array.from({ length: 3 }, () => Math.floor(40 + r() * 180).toString(16).padStart(2, '0')).join('');
  const look = (i: number) => ({
    kind: CHARACTER_KINDS[i % CHARACTER_KINDS.length], species: SPECIES[i % SPECIES.length], body: BODY_SHAPES[i % BODY_SHAPES.length],
    skin: hex(), hair: hex(), hairStyle: HAIR_STYLES[i % HAIR_STYLES.length], hat: HATS[i % HATS.length], outfit: hex(), accent: hex(),
    outfitStyle: OUTFIT_STYLES[i % OUTFIT_STYLES.length], glasses: null, brows: BROWS[1], neck: NECKWEAR[i % NECKWEAR.length],
  });
  const m = base.meta;
  const icons = ['🕯️', '🗝️', '🛎️', '🧳', '🕰️', '🎩', '🪞', '🛏️', '🍷', '🎻', '🏰', '🌙'];
  const ic = (i: number) => icons[i % icons.length];
  return {
    id: theme.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    displayName: word.slice(0, 12),
    colors: {
      background: '#1B1430', backgroundAlt: '#251B40', surface: '#2F2450', primary: '#E0A84F', primaryText: '#1B1430',
      accent: '#8FD3C1', text: '#F4EEDF', textMuted: '#B3A9C9', success: '#6BCB77', danger: '#E5685D', progress: '#E0A84F',
      gradient: ['#2F2450', '#3E2C66', '#1B1430'], stages: { production: '#E0A84F', transport: '#4FB0C6', sales: '#C77DFF' },
    },
    heroIcon: '🏨', particleIcon: '✨',
    strings: {
      currencyName: 'Coins', currencySymbol: '¢', currencyIcon: '🪙', gemName: 'Moonstones', gemIcon: '🌙',
      prestigeName: 'Keys', prestigeIcon: '🗝️', prestigeVerb: 'Renovate',
      prestigeDescription: `Start over with a fresh coat of paint. Every Key adds ${base.economy.prestige.bonusPerPoint * 100}% to all income for good.`,
      managerTab: 'Staff', upgradeTab: 'Ideas', tapHint: 'Tap to welcome guests!',
    },
    bonusName: 'Lucky Lantern', comboName: 'NIGHT SHIFT',
    businesses: base.businesses.map((_, i) => ({
      name: `${word} Room ${i + 1}`, icon: ic(i), flavor: `Floor ${i + 1} of the ${word}.`, managerName: `Keeper ${i + 1}`, managerIcon: '🧑‍💼',
      productName: `Service ${i + 1}`, productIcon: ic(i + 3),
    })),
    upgrades: base.upgrades.map((_, i) => ({ name: `${word} Idea ${i + 1}`, icon: ic(i + 5) })),
    characters: [
      { id: 'host', name: 'Mira the Host', color: '#E0A84F', look: look(3) },
      { id: 'rival', name: 'Baron Grimsby', color: '#C77DFF', look: look(1) },
    ],
    story: base.story.map((s, i) => ({ id: s.id, characterId: i % 3 === 2 ? 'rival' : 'host', title: null, lines: [`Beat ${i + 1} of the ${word} story.`] })),
    iapTitles: base.monetization.iap.products.map((p) => ({ title: `${word} ${p.kind}`, description: `A ${p.kind} pack.` })),
    sim: base.sim
      ? {
          production: { name: 'Back Office', icon: '🗄️' }, buffer: { name: 'Front Desk', icon: '🛎️' },
          transport: { name: 'Porters', workerName: 'Porter', icon: '🧳', managerName: 'Head Porter', managerIcon: '🎩', managerFlavor: 'Rings for you.', bellName: 'Desk bell' },
          sales: { name: 'Lobby', seatName: 'Armchair', icon: '🛋️' }, rush: { name: 'Full Moon', icon: '🌕' },
          venues: base.sim.venues.map((_, i) => ({ name: `${word} ${i + 1}`, place: `Town ${i + 1}`, icon: ic(i), blurb: `Branch ${i + 1}.`, wall: hex(), floorA: hex(), floorB: hex(), trim: hex() })),
        }
      : null,
    cards: m.cards.map((c, i) => ({ name: `Specialist ${i + 1}`, title: STAT_TEXT[c.stat], flavor: `Joined the ${word}.`, look: look(i) })),
    chests: m.chests.map((_, i) => ({ name: `Trunk ${i + 1}`, icon: '🧰', blurb: 'Earned, never sold.' })),
    missions: m.missions.templates.map((t) => `${t.type} {n}`),
    deals: m.deals.map((_, i) => ({ title: `Guest Pack ${i + 1}`, blurb: 'A fixed bundle.', icon: '🎁' })),
    dailyOffers: m.dailyShop.offers.map((_, i) => ({ title: `Daily Treat ${i + 1}`, icon: ic(i) })),
    store: {
      title: `${word}: After Dark`.slice(0, 30),
      subtitle: 'Synthetic dry-run listing',
      keywords: ['dry', 'run', 'test', 'synthetic'],
      shortDescription: `Dry-run skin for "${theme}" (not for release).`,
      description: `This is the built-in dry-run skin for the theme "${theme}", generated without the API to test the merge path. Replace it before release.`,
    },
  };
}

// ---------------------------------------------------------------- merging skin and base

/** Replaces the values of id-reference keys anywhere in a JSON tree. */
function remapRefs(node: any, maps: Record<string, Map<string, string>>): void {
  if (Array.isArray(node)) return node.forEach((x) => remapRefs(x, maps));
  if (!node || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) {
    if (typeof v === 'string' && maps[k]?.has(v)) node[k] = maps[k].get(v);
    else remapRefs(v, maps);
  }
}

/** Every string "asset:<key>" left in the tree becomes `fallback` (a generated game ships without the base's art). */
function dropAssetIcons(node: any, fallback: string, seen: string[] = []): string[] {
  if (Array.isArray(node)) node.forEach((x, i) => (typeof x === 'string' && x.startsWith('asset:') ? (seen.push(x), (node[i] = fallback)) : dropAssetIcons(x, fallback, seen)));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === 'string' && v.startsWith('asset:')) (seen.push(v), (node[k] = fallback));
      else dropAssetIcons(v, fallback, seen);
    }
  }
  return seen;
}

function exactly<T>(arr: T[], count: number, what: string): T[] {
  if (arr.length < count) fail(`Claude returned ${arr.length} ${what}, the base needs ${count}; try again`);
  return arr.slice(0, count);
}

const slugOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'x';

/** Merges the skin onto the base: the base's structure, the varied base numbers, the skin's words. */
function merge(skin: Skin, id: string): any {
  const g: any = varyEconomy(structuredClone(baseRaw), id);
  const m = g.meta ?? {};
  const slug = id.replace(/-/g, '');
  const key = id.replace(/-/g, '_');

  // New ids, so nothing of the base's fiction is left in saves or analytics.
  const maps: Record<string, Map<string, string>> = { businessId: new Map(), target: new Map(), venueId: new Map(), cardId: new Map(), chestId: new Map(), productId: new Map() };
  g.businesses.forEach((b: any, i: number) => (maps.businessId.set(b.id, `${key}_${i + 1}`), maps.target.set(b.id, `${key}_${i + 1}`)));
  (g.sim?.venues ?? []).forEach((v: any, i: number) => maps.venueId.set(v.id, `venue_${i + 1}`));
  (m.chests ?? []).forEach((c: any, i: number) => maps.chestId.set(c.id, `chest_${i + 1}`));
  const cardSkins = exactly(skin.cards, m.cards?.length ?? 0, 'cards');
  const cardIds = cardSkins.map((c, i) => `${slugOf(c.name).slice(0, 24)}_${i + 1}`);
  (m.cards ?? []).forEach((c: any, i: number) => maps.cardId.set(c.id, cardIds[i]));
  for (const p of g.monetization.iap.products) maps.productId.set(p.id, `${slug}_${p.id.split('_').slice(1).join('_') || p.kind}`);

  // --- cast: the skin's characters and card people, nothing from the base
  const cast: Record<string, unknown> = {};
  const chars = skin.characters.length ? skin.characters : fail('Claude returned no characters');
  for (const c of chars) cast[slugOf(c.id)] = c.look;
  cardSkins.forEach((c, i) => (cast[cardIds[i]] = c.look));
  g.cast = cast;
  g.characters = chars.map((c) => ({ id: slugOf(c.id), name: c.name, portrait: `char:${slugOf(c.id)}`, color: c.color }));
  const charIds = new Set(g.characters.map((c: any) => c.id));

  g.id = id;
  g.app = { displayName: skin.displayName.slice(0, 30), slug: id, iosBundleId: `${org}.${slug}`, androidPackage: `${org}.${slug}`, version: '1.0.0', buildNumber: 1 };
  g.theme = { ...g.theme, colors: { ...skin.colors, gradient: skin.colors.gradient.slice(0, 3) }, heroIcon: skin.heroIcon, particleIcon: skin.particleIcon };
  delete g.theme.displayFont;
  delete g.theme.sceneBackground;
  g.assets = {};
  g.strings = { ...skin.strings, currencySymbol: skin.strings.currencySymbol.slice(0, 2) };
  g.economy.bonus = { ...(g.economy.bonus ?? {}), name: skin.bonusName };
  g.economy.combo = { ...(g.economy.combo ?? {}), name: skin.comboName.toUpperCase() };

  const biz = exactly(skin.businesses, g.businesses.length, 'businesses');
  g.businesses = g.businesses.map((b: any, i: number) => {
    const s = biz[i];
    const out = { ...b, name: s.name, icon: s.icon, flavor: s.flavor, managerName: s.managerName, managerIcon: s.managerIcon };
    if (isSim) Object.assign(out, { productName: s.productName, productIcon: s.productIcon });
    delete out.workerLook; // generated looks; the base's cast is not copied
    return out;
  });
  const ups = exactly(skin.upgrades, g.upgrades?.length ?? 0, 'upgrades');
  g.upgrades = (g.upgrades ?? []).map((u: any, i: number) => ({ ...u, id: `${slug}_u${i + 1}`, name: ups[i].name, icon: ups[i].icon }));

  g.story = (g.story ?? []).map((s: any, i: number) => {
    const beat = skin.story.find((x) => x.id === s.id) ?? skin.story[i] ?? fail('Claude returned too few story beats');
    const out = { ...s, characterId: charIds.has(slugOf(beat.characterId)) ? slugOf(beat.characterId) : g.characters[0].id, lines: beat.lines.length ? beat.lines : s.lines };
    if (beat.title) out.title = beat.title;
    else delete out.title;
    delete out.portrait;
    return out;
  });

  const titles = exactly(skin.iapTitles, g.monetization.iap.products.length, 'IAP titles');
  g.monetization = {
    ...g.monetization,
    // Ad units are per app: create them in AdMob and paste them here before release.
    ads: { ...g.monetization.ads, ios: { appId: TEST_ADMOB.ios }, android: { appId: TEST_ADMOB.android }, forceTestAds: true },
    iap: { products: g.monetization.iap.products.map((p: any, i: number) => ({ ...p, ...titles[i] })) },
  };
  g.firebase = {};

  if (isSim) {
    const s = skin.sim ?? fail('Claude returned no sim block for a sim base');
    const sim = g.sim;
    sim.production = s.production;
    sim.buffer = s.buffer;
    Object.assign(sim.transport, s.transport, { looks: [] });
    Object.assign(sim.sales, s.sales, { looks: [] });
    sim.rush = { ...sim.rush, ...s.rush };
    const venues = exactly(s.venues, sim.venues.length, 'venues');
    sim.venues = sim.venues.map((v: any, i: number) => {
      const x = venues[i];
      return { ...v, name: x.name, place: x.place, icon: x.icon, blurb: x.blurb, palette: { wall: x.wall, floorA: x.floorA, floorB: x.floorB, trim: x.trim } };
    });
  }

  if (g.meta) {
    m.cards = (m.cards ?? []).map((c: any, i: number) => ({ ...c, name: cardSkins[i].name, title: cardSkins[i].title, flavor: cardSkins[i].flavor, icon: `char:${cardIds[i]}` }));
    const chests = exactly(skin.chests, m.chests?.length ?? 0, 'chests');
    m.chests = (m.chests ?? []).map((c: any, i: number) => ({ ...c, ...chests[i] }));
    const missions = exactly(skin.missions, m.missions?.templates?.length ?? 0, 'missions');
    if (m.missions) m.missions.templates = m.missions.templates.map((t: any, i: number) => ({ ...t, text: missions[i].includes('{n}') ? missions[i] : t.text }));
    const deals = exactly(skin.deals, m.deals?.length ?? 0, 'deals');
    m.deals = (m.deals ?? []).map((d: any, i: number) => ({ ...d, ...deals[i] }));
    const offers = exactly(skin.dailyOffers, m.dailyShop?.offers?.length ?? 0, 'daily offers');
    if (m.dailyShop) m.dailyShop.offers = m.dailyShop.offers.map((o: any, i: number) => ({ ...o, ...offers[i] }));
  }

  // Ids last, so every reference (upgrades, story, deals, rewards, free chest...) follows.
  remapRefs(g, maps);
  for (const b of g.businesses) b.id = maps.businessId.get(b.id) ?? b.id;
  for (const v of g.sim?.venues ?? []) v.id = maps.venueId.get(v.id) ?? v.id;
  for (const c of m.chests ?? []) c.id = maps.chestId.get(c.id) ?? c.id;
  for (const c of m.cards ?? []) c.id = maps.cardId.get(c.id) ?? c.id;
  for (const p of g.monetization.iap.products) p.id = maps.productId.get(p.id) ?? p.id;
  // Ids nothing else points at: plain numbered ones, so no word of the base survives.
  g.story.forEach((s: any, i: number) => (s.id = `beat_${i + 1}`));
  (m.deals ?? []).forEach((d: any, i: number) => (d.id = `deal_${i + 1}`));
  (m.missions?.templates ?? []).forEach((t: any, i: number) => (t.id = `mission_${i + 1}`));
  (m.dailyShop?.offers ?? []).forEach((o: any, i: number) => (o.id = `offer_${i + 1}`));

  const leftover = dropAssetIcons(g, skin.particleIcon);
  if (leftover.length) console.log(`  note: ${leftover.length} icons pointed at the base's art (${[...new Set(leftover)].join(', ')}); set to ${skin.particleIcon}`);

  g.store = {
    ...g.store,
    title: skin.store.title.slice(0, 30),
    subtitle: skin.store.subtitle.slice(0, 30),
    keywords: trimKeywords(skin.store.keywords),
    shortDescription: skin.store.shortDescription.slice(0, 80),
    description: skin.store.description.slice(0, 4000),
  };
  delete g.store.privacyPolicyUrl; // the base's policy page is not this game's
  delete g.store.supportUrl;
  delete g.store.marketingUrl;
  return g;
}

function trimKeywords(words: string[]): string[] {
  const out: string[] = [];
  for (const w of words.map((x) => x.trim().toLowerCase()).filter(Boolean)) {
    if ([...out, w].join(',').length > 100) break;
    if (!out.includes(w)) out.push(w);
  }
  return out;
}

async function main() {
  console.log(`Generating "${theme}" from base "${baseId}" (${base.mode})${dryRun ? ' — dry run, no API call' : ''}...`);
  const skin = dryRun ? syntheticSkin() : await generateSkin();
  // Folders starting with "_" are ignored by the app and the release tooling: handy for tests.
  const id = (flags.id ?? skin.id).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const dir = path.join(games.GAMES_DIR, id);
  if (fs.existsSync(dir) && flags.force !== 'true') fail(`games/${id} already exists (pass --force to overwrite)`);

  // The schema wants a kebab id; a "_test" folder keeps a valid id inside.
  const game = merge(skin, id.replace(/^_+/, '').replace(/_/g, '-') || 'generated');
  const parsed = GameConfigSchema.safeParse(game);
  if (!parsed.success) fail(`Generated config is invalid:\n${parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')}`);
  const problems = lintGameConfig(parsed.data);
  if (IDLE_TYCOON_TITLE.test(parsed.data.store.title)) problems.push(`store title "${parsed.data.store.title}" is an "Idle ... Tycoon" title; change it`);

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'game.json'), JSON.stringify(game, null, 2) + '\n');
  console.log(`\n✔ Wrote games/${id}/game.json — "${parsed.data.store.title}"`);
  if (problems.length) console.log('Problems to fix:\n  ' + problems.join('\n  '));
  console.log(`\nNext:\n  npm run validate -- ${id}\n  npm run simulate -- ${id}\n  GAME=${id} npx expo start\n  Add icon.png (1024×1024) and adaptive-icon.png to games/${id}/`);
}

main().catch((e) => {
  if (e instanceof Anthropic.AuthenticationError) fail('No Anthropic credentials. Set ANTHROPIC_API_KEY or run `ant auth login`.');
  if (e instanceof Anthropic.RateLimitError) fail('Rate limited by the Anthropic API; wait a minute and retry.');
  if (e instanceof Anthropic.APIError) fail(`Anthropic API error ${e.status}: ${e.message}`);
  throw e;
});
