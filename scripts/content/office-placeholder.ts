/**
 * Writes the PLACEHOLDER games/high-office/game.json (the skeleton's, office-design.md 9.2 "Hour 0"):
 * the `decree` block's starting values (the schema's defaults, src/config/schema.decree.ts) with the
 * small frozen test deck of src/engine/fixtures/decree.ts and `skeletonPlaceholder: true` (validate
 * then reports the satire lint's findings as warnings), and the store listing and products of
 * scripts/content/office-store.json (the listing step's), so the real store text reaches game.json,
 * `npm run sync` and `validate` before build-office.py exists.
 *
 *   npx tsx scripts/content/office-placeholder.ts && npm run sync
 *
 * Owned by the bot and numbers package (P2) until scripts/content/build-office.py replaces it (that
 * script maps the writers' files onto the runtime deck, writes the tuned numbers and never sets
 * `skeletonPlaceholder`); then delete this file. docs/design/office-build-plan.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DecreeSchema } from '../../src/config/schema.decree';
import { DECREE_TEST_DECK } from '../../src/engine/fixtures/decree';

const ROOT = path.join(__dirname, '..', '..');
const listing = JSON.parse(fs.readFileSync(path.join(__dirname, 'office-store.json'), 'utf8')) as {
  title: string;
  subtitle: string;
  keywords: string[];
  shortDescription: string;
  promotionalText: string;
  description: string;
  privacyPolicyUrl: string;
  primaryCategory: string;
  subcategories: string[];
  products: { id: string; kind: string; title: string; description: string; fallbackPrice: string }[];
};

const decree = DecreeSchema.parse(JSON.parse(JSON.stringify({ deck: DECREE_TEST_DECK, skeletonPlaceholder: true })));
const P = 'PLACEHOLDER';
const game = {
  schemaVersion: 1,
  id: 'high-office',
  app: { displayName: listing.title, slug: 'proudly-adequate', iosBundleId: 'com.example.proudlyadequate', androidPackage: 'com.example.proudlyadequate', version: '1.0.0', buildNumber: 1, trackingText: `${P}: the app asks this to match the optional ads you can choose to watch.` },
  theme: {
    colors: { background: '#2E4A3E', backgroundAlt: '#6B4A33', surface: '#ECEFEA', primary: '#5B3E8C', primaryText: '#ECEFEA', accent: '#C9A45C', text: '#ECEFEA', textMuted: '#B9C2BC', success: '#5B3E8C', danger: '#B0563F', progress: '#C9A45C', gradient: ['#2E4A3E', '#24392F'] },
    radius: 8,
    scene: 'skia',
    heroIcon: '✒️',
    particleIcon: '✒️',
    darkStatusBar: false,
  },
  strings: { currencyName: 'Dibs', currencySymbol: 'd', currencyIcon: '✒️', gemName: 'Gems', prestigeName: 'Offices', prestigeIcon: '✒️', prestigeVerb: 'Stand for the next office', prestigeDescription: `${P}: win an election with enough Name Recognition and record.` },
  economy: {
    startingCash: decree.desk.treasury,
    tapBase: 0,
    tapPercentOfIncome: 0,
    milestones: [],
    prestige: { threshold: 1e15, scale: 1, exponent: 0.5, bonusPerPoint: 0 },
    offline: { maxHours: decree.away.capHours, efficiency: 1, minSecondsToShow: 60 },
    boost: { multiplier: 2, minutesPerAd: 30, maxMinutes: 240 },
    daily: { gems: [] },
    timeWarp: { hours: 1, gemCost: 25 },
  },
  businesses: [],
  mode: 'decree',
  soundPack: null,
  decree,
  characters: [],
  story: [],
  monetization: {
    ads: { ios: { appId: 'ca-app-pub-3940256099942544~1458002511' }, android: { appId: 'ca-app-pub-3940256099942544~3347511713' }, forceTestAds: true, showBanner: false, interstitials: false },
    // Decision D11: five products, {unlock, unlock, cosmetic, cosmetic, skipAds}; the listing step's texts.
    iap: { products: listing.products },
  },
  store: {
    title: listing.title,
    subtitle: listing.subtitle,
    keywords: listing.keywords,
    shortDescription: listing.shortDescription,
    description: listing.description,
    primaryCategory: listing.primaryCategory,
    subcategories: listing.subcategories,
    privacyPolicyUrl: listing.privacyPolicyUrl,
    promotionalText: listing.promotionalText,
  },
};
const out = path.join(ROOT, 'games', 'high-office', 'game.json');
fs.writeFileSync(out, JSON.stringify(game, null, 1) + '\n');
console.log(`wrote ${path.relative(ROOT, out)} (${fs.statSync(out).size} bytes)`);
