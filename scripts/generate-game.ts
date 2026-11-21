/**
 * Generates a whole new game from a one-line theme using Claude.
 *
 *   npm run generate -- "haunted hotel" --id haunted-hotel --org com.yourstudio
 *   npm run generate -- "dinosaur zoo" --base space-miner
 *
 * Claude writes only the *skin*: names, story, colours, emoji, store listing.
 * The economy (costs, timings, revenue) is copied from a base game you have
 * already balanced, so every generated game starts with known-good pacing.
 * Tune it afterwards with `npm run simulate`.
 *
 * Needs ANTHROPIC_API_KEY (or an `ant auth login` profile).
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { GameConfigSchema, lintGameConfig, type GameConfigInput } from '../src/config/schema';
import { args, fail } from './lib/cli';

const games = require('./lib/games.js');

const { positional, flags } = args();
const theme = positional[0];
if (!theme) fail('Usage: npm run generate -- "<theme>" [--id my-game] [--base pizza-empire] [--org com.yourstudio]');
const baseId = flags.base ?? 'pizza-empire';
const base = GameConfigSchema.parse(games.readGameJson(baseId));
const org = flags.org ?? 'com.example';

const Color = z.string().describe('hex colour, #RRGGBB');
const Emoji = z.string().describe('a single emoji');

const SkinSchema = z.object({
  id: z.string().describe('kebab-case id, e.g. "haunted-hotel"'),
  displayName: z.string().describe('home-screen name, 12 characters or fewer'),
  colors: z.object({
    background: Color, backgroundAlt: Color, surface: Color, primary: Color, primaryText: Color,
    accent: Color, text: Color, textMuted: Color, success: Color, danger: Color, progress: Color,
    gradient: z.array(Color).describe('3 colours for the header gradient'),
  }),
  heroIcon: Emoji,
  particleIcon: Emoji,
  strings: z.object({
    currencyName: z.string(), currencySymbol: z.string().describe('1 character'),
    gemName: z.string(), gemIcon: Emoji, prestigeName: z.string(), prestigeIcon: Emoji,
    prestigeVerb: z.string().describe('1-2 words'), prestigeDescription: z.string(),
    managerTab: z.string().describe('1 word'), upgradeTab: z.string().describe('1 word'), tapHint: z.string(),
  }),
  businesses: z.array(z.object({
    name: z.string(), icon: Emoji, flavor: z.string(), managerName: z.string(), managerIcon: Emoji,
  })),
  upgrades: z.array(z.object({ name: z.string(), icon: Emoji })),
  characters: z.array(z.object({ id: z.string(), name: z.string(), portrait: Emoji, color: Color })),
  story: z.array(z.object({
    id: z.string(), characterId: z.string(), title: z.string().nullable(), lines: z.array(z.string()),
  })),
  iapTitles: z.array(z.object({ title: z.string(), description: z.string() })),
  store: z.object({
    title: z.string().describe('30 characters or fewer, include the word "Idle" or "Tycoon"'),
    subtitle: z.string().describe('30 characters or fewer'),
    keywords: z.array(z.string()).describe('10-14 single search words, all together under 100 characters'),
    shortDescription: z.string().describe('80 characters or fewer'),
    description: z.string().describe('store description, 600-1200 characters, bullet points with •'),
  }),
});
type Skin = z.infer<typeof SkinSchema>;

function describeBase() {
  return {
    businesses: base.businesses.map((b, i) => ({ index: i, original: b.name, cycleSeconds: b.cycleSeconds })),
    upgrades: base.upgrades.map((u) => ({
      original: u.name,
      appliesTo: u.target === 'all' ? 'all businesses' : base.businesses.find((b) => b.id === u.target)?.name,
      premium: u.premium,
    })),
    story: base.story.map((s) => ({ id: s.id, trigger: s.trigger, lines: s.lines.length })),
    iap: base.monetization.iap.products.map((p) => ({ kind: p.kind, value: p.value, original: p.title })),
  };
}

async function generateSkin(): Promise<Skin> {
  const client = new Anthropic();
  const prompt = `Design the theme for a new idle tycoon mobile game. Theme: "${theme}".

The game engine and economy are fixed. You are writing the skin that replaces the base game's names and story, one for one. The base game's structure is:
${JSON.stringify(describeBase(), null, 2)}

Requirements:
- businesses: exactly ${base.businesses.length}, in the same order, going from a tiny humble start to something absurdly grand. Each later one should feel like a big step up.
- upgrades: exactly ${base.upgrades.length}, in the same order; each name should fit the business it applies to.
- story: exactly ${base.story.length} beats with the same ids (${base.story.map((s) => s.id).join(', ')}) and triggers as listed; 1-3 short lines each; each beat's characterId must be one of your characters. Give the game 1-3 memorable characters (a mentor and a rival work well). The first beat teaches the player to tap the first business.
- iapTitles: exactly ${base.monetization.iap.products.length}, same order and meaning as the base products, renamed for the theme.
- colors: a cohesive, high-contrast palette. text must be readable on background and surface; primaryText must be readable on primary.
- Use emoji that render on both iOS and Android (avoid very new emoji).
- Store listing: write for App Store and Google Play search. Put the most-searched relevant words in the title and keywords; don't repeat words between title and keywords. Don't name or imitate other games or brands.
- Tone: light, funny, family-friendly.`;

  const response = await client.beta.messages.parse({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    // If a request is declined, the API retries it on a fallback model automatically.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: betaZodOutputFormat(SkinSchema) },
    messages: [{ role: 'user', content: prompt }],
  });
  if (response.stop_reason === 'refusal') fail(`Claude declined this theme (${response.stop_details?.category ?? 'no category'}). Try another.`);
  if (response.stop_reason === 'max_tokens') fail('Response was cut off; try again.');
  if (!response.parsed_output) fail('Could not parse the generated theme; try again.');
  return response.parsed_output;
}

/** Merges the skin onto the base game, keeping all numbers. */
function merge(skin: Skin, id: string): GameConfigInput {
  const ids = base.businesses.map((_, i) => `${id.replace(/-/g, '_')}_${i + 1}`);
  const idMap = new Map(base.businesses.map((b, i) => [b.id, ids[i]]));
  const pick = <T>(arr: T[], i: number, what: string): T => arr[i] ?? fail(`Claude returned too few ${what}`);
  const slugPart = id.replace(/-/g, '');
  return {
    ...structuredClone(base),
    id,
    app: { displayName: skin.displayName.slice(0, 30), slug: `${id}-idle`, iosBundleId: `${org}.${slugPart}`, androidPackage: `${org}.${slugPart}`, version: '1.0.0', buildNumber: 1 },
    theme: { ...base.theme, colors: { ...skin.colors, gradient: skin.colors.gradient.slice(0, 3) }, heroIcon: skin.heroIcon, particleIcon: skin.particleIcon },
    assets: {},
    strings: { ...skin.strings, currencySymbol: skin.strings.currencySymbol.slice(0, 2) },
    businesses: base.businesses.map((b, i) => ({ ...b, id: ids[i], ...pick(skin.businesses, i, 'businesses') })),
    upgrades: base.upgrades.map((u, i) => ({
      ...u,
      id: `${slugPart}_u${i + 1}`,
      target: u.target === 'all' ? 'all' : idMap.get(u.target)!,
      ...pick(skin.upgrades, i, 'upgrades'),
    })),
    characters: skin.characters,
    story: base.story.map((s, i) => {
      const beat = skin.story.find((x) => x.id === s.id) ?? pick(skin.story, i, 'story beats');
      const trigger = s.trigger.type === 'owned' ? { ...s.trigger, businessId: idMap.get(s.trigger.businessId)! } : s.trigger;
      return { ...s, characterId: beat.characterId, title: beat.title ?? undefined, lines: beat.lines, trigger };
    }),
    monetization: {
      ...base.monetization,
      // Ad units are per app: create them in AdMob and paste them here before release.
      ads: { ...base.monetization.ads, forceTestAds: true },
      iap: {
        products: base.monetization.iap.products.map((p, i) => ({
          ...p,
          id: `${slugPart}_${p.kind.toLowerCase()}${p.kind === 'gems' || p.kind === 'multiplier' || p.kind === 'timeWarp' ? '_' + p.value : ''}`,
          ...pick(skin.iapTitles, i, 'IAP titles'),
        })),
      },
    },
    firebase: {},
    store: {
      ...base.store,
      title: skin.store.title.slice(0, 30),
      subtitle: skin.store.subtitle.slice(0, 30),
      keywords: trimKeywords(skin.store.keywords),
      shortDescription: skin.store.shortDescription.slice(0, 80),
      description: skin.store.description.slice(0, 4000),
    },
  };
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
  console.log(`Generating "${theme}" from base "${baseId}"...`);
  const skin = await generateSkin();
  const id = (flags.id ?? skin.id).toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const dir = path.join(games.GAMES_DIR, id);
  if (fs.existsSync(dir) && !flags.force) fail(`games/${id} already exists (pass --force to overwrite)`);

  const game = merge(skin, id);
  const parsed = GameConfigSchema.safeParse(game);
  if (!parsed.success) fail(`Generated config is invalid:\n${parsed.error.message}`);
  const problems = lintGameConfig(parsed.data);

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'game.json'), JSON.stringify(game, null, 2) + '\n');
  console.log(`\n✔ Wrote games/${id}/game.json — "${parsed.data.store.title}"`);
  if (problems.length) console.log('Lint warnings:\n  ' + problems.join('\n  '));
  console.log(`\nNext:\n  GAME=${id} npx expo start\n  npm run simulate -- ${id}\n  Add icon.png (1024×1024) and adaptive-icon.png to games/${id}/`);
}

main().catch((e) => {
  if (e instanceof Anthropic.AuthenticationError) fail('No Anthropic credentials. Set ANTHROPIC_API_KEY or run `ant auth login`.');
  if (e instanceof Anthropic.RateLimitError) fail('Rate limited by the Anthropic API; wait a minute and retry.');
  if (e instanceof Anthropic.APIError) fail(`Anthropic API error ${e.status}: ${e.message}`);
  throw e;
});
