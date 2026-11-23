/**
 * The game data's cross-field checks, moved out of ./schema.ts unchanged. Node tools only
 * (scripts/validate.ts, scripts/generate-game.ts, tests): no app file imports this
 * (scripts/lib/modes.js NODE_ONLY), so its messages, which name every mode's things, ship in no game.
 */
import { HAUL_METRICS } from '../engine/haulMode';
import { MERGE_METRICS } from '../engine/mergeMode';
import { SHARED_METRICS } from '../engine/scores';
import { reminderTextProblems } from '../services/reminderTexts';
import { MACH_ICONS_BY_MODE, artIconsFor } from './artIcons';
import type { GameConfig } from './schema';
import { HaulSchema, lintHaul } from './schema.haul';
import { MergeSchema, lintMerge } from './schema.merge';

/**
 * Cross-field checks zod can't express per field. Returns a list of problems. `artIcons`: the
 * "art:" names the game's mode draws (default: what its entry registers, ./artIcons).
 */
export function lintGameConfig(cfg: GameConfig, artIcons: readonly string[] = artIconsFor(cfg.mode)): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const b of cfg.businesses) {
    if (ids.has(b.id)) problems.push(`duplicate business id "${b.id}"`);
    ids.add(b.id);
  }
  for (const u of cfg.upgrades) {
    if (u.target !== 'all' && !ids.has(u.target)) problems.push(`upgrade "${u.id}" targets unknown business "${u.target}"`);
  }
  const chars = new Set(cfg.characters.map((c) => c.id));
  for (const s of cfg.story) {
    if (!chars.has(s.characterId)) problems.push(`story beat "${s.id}" uses unknown character "${s.characterId}"`);
    if ((s.trigger.type === 'owned' || s.trigger.type === 'hired') && !ids.has(s.trigger.businessId)) {
      problems.push(`story beat "${s.id}" triggers on unknown business "${s.trigger.businessId}"`);
    }
    if (s.trigger.type === 'venue') {
      const venueId = s.trigger.venueId;
      if (!cfg.sim?.venues.some((v) => v.id === venueId)) problems.push(`story beat "${s.id}" triggers on unknown venue "${venueId}"`);
    }
  }

  // --- sim mode ---
  if (cfg.mode === 'sim' && !cfg.sim) problems.push('mode is "sim" but there is no "sim" block');
  if (cfg.mode !== 'sim' && cfg.sim) problems.push('there is a "sim" block but mode is not "sim"');
  if (cfg.sim) {
    // pizza-2: the three names a player reads in the stage strip and the rush button. Their schema
    // defaults are theme-free on purpose (shared code ships in every game), so a sim game must name
    // them itself; the defaults ('Send', 'Slot', 'Boost') parsed in mean the data left them out.
    const named: [string, string, string][] = [
      ['sim.transport.bellName', cfg.sim.transport.bellName, 'Send'],
      ['sim.sales.seatName', cfg.sim.sales.seatName, 'Slot'],
      ['sim.rush.name', cfg.sim.rush.name, 'Boost'],
    ];
    for (const [where, value, fallback] of named) {
      if (value === fallback) problems.push(`${where} is required for a sim game (the theme-free default "${fallback}" would show): name it in the game's own words`);
    }
    if (cfg.sim.venues[0].unlockCost !== 0) problems.push('the first venue must have unlockCost 0');
    if (new Set(cfg.sim.venues.map((x) => x.id)).size !== cfg.sim.venues.length) problems.push('venue ids must be unique');
    for (let i = 1; i < cfg.sim.venues.length; i++) {
      const [prev, v] = [cfg.sim.venues[i - 1], cfg.sim.venues[i]];
      if (v.scale <= prev.scale) problems.push(`venue "${v.id}" must have a larger scale than "${prev.id}"`);
      if (v.unlockCost <= prev.unlockCost) problems.push(`venue "${v.id}" must cost more to open than "${prev.id}"`);
    }
  }

  if (cfg.mode !== 'merge' && cfg.merge) problems.push('there is a "merge" block but mode is not "merge"');
  // --- haul mode (spec section 2 header, errata 8) ---
  if (cfg.mode === 'haul') {
    // The shared schema keeps the haul block opaque (its schema is the haul mode's): parse it here.
    const haul = cfg.haul ? HaulSchema.safeParse(cfg.haul) : null;
    if (!haul) problems.push('mode is "haul" but there is no "haul" block');
    else if (!haul.success) problems.push(...haul.error.issues.map((i) => `haul.${i.path.join('.')}: ${i.message}`));
    else problems.push(...lintHaul(haul.data, cfg.meta.cards.map((c) => c.id), cfg.meta.chests.map((c) => c.id)).map((m) => `haul: ${m}`));
    if (cfg.economy.prestige.bonusPerPoint !== 0) problems.push('economy.prestige.bonusPerPoint must be 0 in a haul game (Warp Cores are spent on the Star Map, never a passive bonus)');
    if (cfg.businesses.length > 0) problems.push('a haul game has no businesses');
    if (cfg.upgrades.length > 0) problems.push('a haul game has no upgrades');
    if (Object.keys(cfg.cast).length > 0) problems.push('a haul game draws no people: remove "cast" (portraits are "mach:" icons)');
    for (const m of cfg.meta.missions.templates) {
      if (m.type === 'taps' || m.type === 'bonus' || m.type === 'hires') problems.push(`mission "${m.id}" counts ${m.type}, which a haul game does not have`);
    }
  } else if (cfg.mode === 'merge') {
    // --- merge mode (Night Market, market-design.md section 2): the block is opaque in the shared schema too ---
    if (cfg.haul) problems.push('there is a "haul" block but mode is not "haul"');
    const merge = cfg.merge ? MergeSchema.safeParse(cfg.merge) : null;
    if (!merge) problems.push('mode is "merge" but there is no "merge" block');
    else if (!merge.success) problems.push(...merge.error.issues.map((i) => `merge.${i.path.join('.')}: ${i.message}`));
    else problems.push(...lintMerge(merge.data).map((m) => `merge: ${m}`));
    if (cfg.economy.prestige.bonusPerPoint !== 0) problems.push('economy.prestige.bonusPerPoint must be 0 in a merge game (closing a season pays no currency and grows no multiplier, spec 2.11)');
    if (cfg.businesses.length > 0) problems.push('a merge game has no businesses');
    if (cfg.upgrades.length > 0) problems.push('a merge game has no upgrades');
    if (Object.keys(cfg.cast).length > 0) problems.push('a merge game has no "cast": its animals are drawn by the mode ("beast:" icons, spec 7.2)');
    if (cfg.meta.missions.templates.length > 0) problems.push('a merge game has no missions (spec 5.7: cut on purpose)');
  } else {
    if (cfg.haul) problems.push('there is a "haul" block but mode is not "haul"');
    if (cfg.businesses.length === 0) problems.push('a sim or classic game needs at least one business');
    if (!(cfg.economy.prestige.bonusPerPoint > 0)) problems.push('economy.prestige.bonusPerPoint must be positive');
    for (const m of cfg.meta.missions.templates) {
      if (['hauled', 'launches', 'contracts', 'depleted', 'claims', 'seamDrags'].includes(m.type)) problems.push(`mission "${m.id}" counts ${m.type}, which only haul games have`);
    }
  }
  for (const s of cfg.story) {
    if (cfg.mode !== 'haul' && ['launches', 'ring', 'contracts', 'system', 'galaxy', 'jumpReady'].includes(s.trigger.type)) {
      problems.push(`story beat "${s.id}" triggers on "${s.trigger.type}", which only haul games have`);
    }
  }

  // --- meta: cards, chests, missions, deals ---
  const meta = cfg.meta;
  const unique = (what: string, list: { id: string }[]) => {
    const seen = new Set<string>();
    for (const x of list) {
      if (seen.has(x.id)) problems.push(`duplicate ${what} id "${x.id}"`);
      seen.add(x.id);
    }
    return seen;
  };
  const cardIds = unique('card', meta.cards);
  const chestIds = unique('chest', meta.chests);
  unique('mission', meta.missions.templates);
  unique('deal', meta.deals);
  unique('daily offer', meta.dailyShop.offers);
  const checkReward = (where: string, r: (typeof meta.deals)[number]['contents'][number]) => {
    if (r.type === 'chest' && !chestIds.has(r.chestId)) problems.push(`${where} grants unknown chest "${r.chestId}"`);
    if (r.type === 'card' && !cardIds.has(r.cardId)) problems.push(`${where} grants unknown card "${r.cardId}"`);
    if (r.type === 'randomCard' && !meta.cards.some((c) => c.rarity === r.rarity)) problems.push(`${where} grants a ${r.rarity} card but there are none`);
  };
  for (const c of meta.chests) {
    const { card, gems, cash } = c.slotWeights;
    if (card + gems + cash <= 0) problems.push(`chest "${c.id}" has no slot weights`);
    const w = c.rarityWeights;
    if (card > 0 && w.common + w.rare + w.epic + w.legendary <= 0) problems.push(`chest "${c.id}" has card slots but no rarity weights`);
    if (card > 0 && meta.cards.length === 0) problems.push(`chest "${c.id}" has card slots but the game has no cards`);
    for (const rarity of ['common', 'rare', 'epic', 'legendary'] as const) {
      if (card > 0 && w[rarity] > 0 && !meta.cards.some((x) => x.rarity === rarity)) problems.push(`chest "${c.id}" can roll a ${rarity} card but there are none`);
      if (c.cardCopies[rarity][0] < 1) problems.push(`chest "${c.id}" cardCopies.${rarity} must be at least 1`);
    }
  }
  if (!meta.chestsForSale) {
    const sold = (where: string, rewards: { type: string }[]) => {
      if (rewards.some((r) => r.type === 'chest')) problems.push(`${where} contains a chest, but meta.chestsForSale is off (chests are earned, not sold)`);
    };
    for (const c of meta.chests) if (c.gemCost !== undefined) problems.push(`chest "${c.id}" has a gem price, but meta.chestsForSale is off`);
    for (const d of meta.deals) sold(`deal "${d.id}"`, d.contents);
    for (const o of meta.dailyShop.offers) if (o.gemCost > 0) sold(`daily offer "${o.id}"`, [o.reward]);
  }
  if (meta.freeChest && !chestIds.has(meta.freeChest.chestId)) problems.push(`freeChest uses unknown chest "${meta.freeChest.chestId}"`);
  if (meta.adChest && !chestIds.has(meta.adChest.chestId)) problems.push(`adChest uses unknown chest "${meta.adChest.chestId}"`);
  for (const m of meta.missions.templates) {
    if (!m.text.includes('{n}')) problems.push(`mission "${m.id}" text must contain {n}`);
    if (m.type === 'rush' && !cfg.sim) problems.push(`mission "${m.id}" counts rush skills, which only sim games have`);
    if (m.type === 'serve' && !cfg.sim) problems.push(`mission "${m.id}" counts guests served, which only sim games have`);
    if (m.type === 'chests' && meta.chests.length === 0) problems.push(`mission "${m.id}" counts chests but the game has none`);
    checkReward(`mission "${m.id}"`, m.reward);
  }
  meta.missions.milestones.forEach((m) => checkReward(`mission milestone every ${m.every}`, m.reward));
  for (const d of meta.deals) {
    if (d.trigger.type === 'venue') {
      const venueId = d.trigger.venueId;
      if (!cfg.sim?.venues.some((v) => v.id === venueId)) problems.push(`deal "${d.id}" triggers on unknown venue "${venueId}"`);
    }
  }
  if (meta.missions.templates.length > 0 && meta.missions.templates.length < meta.missions.slots) {
    problems.push(`missions: ${meta.missions.slots} slots but only ${meta.missions.templates.length} templates`);
  }
  for (const d of meta.deals) {
    if (Boolean(d.productId) === Boolean(d.gemCost)) problems.push(`deal "${d.id}" needs exactly one of productId or gemCost`);
    if (d.productId) {
      const product = cfg.monetization.iap.products.find((p) => p.id === d.productId);
      if (!product) problems.push(`deal "${d.id}" uses unknown IAP product "${d.productId}"`);
      else if (product.kind !== 'deal') problems.push(`deal "${d.id}" must use an IAP product of kind "deal", not "${product.kind}"`);
    }
    d.contents.forEach((r) => {
      checkReward(`deal "${d.id}"`, r);
      // Deals are consumable purchases; permanent items are sold as their own products so they can be restored.
      if (r.type === 'noAds' || r.type === 'multiplier') problems.push(`deal "${d.id}" may not contain "${r.type}"; sell it as its own product`);
    });
  }
  for (const p of cfg.monetization.iap.products) {
    if (p.kind === 'deal' && meta.deals.filter((d) => d.productId === p.id).length !== 1) {
      problems.push(`IAP product "${p.id}" has kind "deal" and must be used by exactly one deal`);
    }
  }
  for (const o of meta.dailyShop.offers) checkReward(`daily offer "${o.id}"`, o.reward);

  const kw = cfg.store.keywords.join(',');
  if (kw.length > 100) problems.push(`store.keywords is ${kw.length} chars; iOS allows 100`);
  const assetKeys = new Set(Object.keys(cfg.assets));
  const iconFields = [
    cfg.theme.heroIcon,
    cfg.theme.particleIcon,
    cfg.strings.currencyIcon,
    cfg.strings.gemIcon,
    cfg.strings.prestigeIcon,
    ...Object.values(cfg.theme.icons).map((i) => i ?? ''),
    ...cfg.businesses.flatMap((b) => [b.icon, b.managerIcon ?? '']),
    ...cfg.upgrades.map((u) => u.icon ?? ''),
    ...cfg.characters.map((c) => c.portrait),
    ...cfg.story.map((b) => b.portrait ?? ''),
    ...cfg.monetization.iap.products.map((p) => p.icon ?? ''),
    ...cfg.businesses.map((b) => b.productIcon ?? ''),
    ...(cfg.sim ? [cfg.sim.buffer.icon, cfg.sim.transport.icon, cfg.sim.transport.managerIcon ?? '', cfg.sim.sales.icon, cfg.sim.rush.icon] : []),
    ...(cfg.sim?.venues.map((v) => v.icon) ?? []),
    ...meta.cards.map((c) => c.icon),
    ...meta.chests.map((c) => c.icon),
    ...meta.deals.map((d) => d.icon ?? ''),
    ...meta.dailyShop.offers.map((o) => o.icon ?? ''),
  ].filter(Boolean);
  const castIds = new Set(Object.keys(cfg.cast));
  const lookRefs = [
    ...cfg.businesses.map((b) => b.workerLook ?? ''),
    ...(cfg.sim ? [...cfg.sim.transport.looks, ...cfg.sim.sales.looks] : []),
    ...iconFields.filter((i) => i.startsWith('char:')).map((i) => i.slice(5)),
  ].filter(Boolean);
  for (const id of lookRefs) {
    if (!castIds.has(id)) problems.push(`character "${id}" is used but missing from cast`);
  }
  for (const key of [cfg.theme.displayFont, cfg.theme.sceneBackground]) {
    if (key && !assetKeys.has(key)) problems.push(`theme asset "${key}" has no entry in assets`);
  }
  for (const i of iconFields) {
    if (i.startsWith('asset:') && !assetKeys.has(i.slice(6))) problems.push(`icon "${i}" has no entry in assets`);
    if (i.startsWith('art:') && !artIcons.includes(i.slice(4)))
      problems.push(`icon "${i}" is not a drawn icon of mode "${cfg.mode}" (one of ${artIcons.map((n) => `art:${n}`).join(', ') || 'none'})`);
    if (i.startsWith('mach:') && !(MACH_ICONS_BY_MODE[cfg.mode] ?? []).includes(i.slice(5))) problems.push(`icon "${i}" is not a machine portrait of mode "${cfg.mode}"`);
    if (i.startsWith('char:') && cfg.mode === 'haul') problems.push(`icon "${i}": a haul game draws no people ("char:" icons); use a "mach:" portrait`);
  }
  // --- reminders (local notifications) ---
  if (cfg.reminders) {
    if (cfg.mode === 'haul' || cfg.mode === 'merge') {
      problems.push(`"reminders": a ${cfg.mode} game's reminder words live in its string table (src/ui/${cfg.mode}/strings.ts), which its mode entry hands over; remove the block from game.json`);
    }
    problems.push(...reminderTextProblems(cfg.reminders).map((m) => `reminders: ${m}`));
  }

  // --- leaderboards (Game Center, Play Games) ---
  if (cfg.leaderboards) {
    const metrics: readonly string[] = [...SHARED_METRICS, ...(cfg.mode === 'haul' ? HAUL_METRICS : cfg.mode === 'merge' ? MERGE_METRICS : [])];
    const lb = cfg.leaderboards;
    const seen = { key: new Set<string>(), iosId: new Set<string>(), androidId: new Set<string>() };
    for (const b of lb.boards) {
      if (!metrics.includes(b.metric)) problems.push(`leaderboard "${b.key}" ranks "${b.metric}", which a ${cfg.mode} game does not count (one of ${metrics.join(', ')})`);
      if (!b.iosId && !b.androidId) problems.push(`leaderboard "${b.key}" has no id on either platform: give it an iosId (chosen here, created in App Store Connect) or an androidId (from the Play Console)`);
      for (const field of ['key', 'iosId', 'androidId'] as const) {
        const value = b[field];
        if (!value) continue;
        if (seen[field].has(value)) problems.push(`leaderboards: two boards share the ${field} "${value}"`);
        seen[field].add(value);
      }
    }
    if (lb.boards.some((b) => b.androidId) && !lb.playGamesProjectId) problems.push('leaderboards: a board has an androidId but leaderboards.playGamesProjectId is missing (Play Console, Play Games Services, Configuration)');
  }

  // Each business should be meaningfully more expensive than the last, or the curve feels flat.
  for (let i = 1; i < cfg.businesses.length; i++) {
    if (cfg.businesses[i].baseCost <= cfg.businesses[i - 1].baseCost) {
      problems.push(`business "${cfg.businesses[i].id}" is not more expensive than the one before it`);
    }
  }
  return problems;
}
