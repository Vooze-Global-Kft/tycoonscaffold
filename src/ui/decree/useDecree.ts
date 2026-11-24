/**
 * Selecting from the decree game in the shared store: the ONE way the decree screens of all four
 * packages read the game (AGENTS.md: select the few values a component shows; the game changes ten
 * times a second). Every value comes from the rules' public interface (src/engine/decree.ts); a
 * screen never computes a price, a rate, a share or a time itself.
 *
 * - `useDecree(fn, fallback)`: `fn(cfg, game)` must return a primitive or a reference the rules keep
 *   stable (the desk item: the tick returns the same object while it does not change).
 * - `useDecreeShallow(fn, fallback)`: a small flat object or array of primitives, compared by entry.
 * - `useDecreeJson(fn, fallback)`: any plain data (rows of objects): compared by its JSON text, so a
 *   component re-renders only when what it shows changes. Parsed once per change.
 * A selector whose rule is not built yet (NotBuiltError) or throws gives `fallback`, so a screen never
 * shows a red screen while the rules are being joined.
 *
 * The named selectors below are what the bars, sheets and views show; add one here (BARS owns this
 * file) by asking in requests.md, or select with the three hooks above in your own file.
 * Written by the skeleton; owned by the bars package (BARS).
 */
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import * as R from '../../engine/decree';
import { useGame } from '../../state/store';

function pick<T>(fn: (cfg: R.DecreeConfig, g: R.DecreeGame) => T, fallback: T) {
  return (s: { cfg: unknown; game: unknown }): T => {
    const cfg = s.cfg as R.DecreeConfig;
    const g = s.game as R.DecreeGame;
    if (!R.isDecree(cfg) || !g.decree) return fallback;
    try {
      return fn(cfg, g);
    } catch {
      return fallback;
    }
  };
}

export function useDecree<T>(fn: (cfg: R.DecreeConfig, g: R.DecreeGame) => T, fallback: T): T {
  return useGame(pick(fn, fallback));
}

export function useDecreeShallow<T extends object>(fn: (cfg: R.DecreeConfig, g: R.DecreeGame) => T, fallback: T): T {
  return useGame(useShallow(pick(fn, fallback)));
}

/** Plain data compared by its JSON text (stable while unchanged). `fn` must return JSON-safe data (no Infinity, no functions). */
export function useDecreeJson<T>(fn: (cfg: R.DecreeConfig, g: R.DecreeGame) => T, fallback: T): T {
  const text = useGame(
    pick((cfg, g) => {
      const v = fn(cfg, g);
      return v === undefined ? '' : JSON.stringify(v);
    }, ''),
  );
  return useMemo(() => (text ? (JSON.parse(text) as T) : fallback), [text]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** The decree config, or null outside a decree game (it does not change while the game runs). */
export function useDecreeCfg(): R.DecreeConfig | null {
  return useGame((s) => (R.isDecree(s.cfg) ? s.cfg : null));
}

// ----------------------------------------------------------------------------- the desk

/** The desk item (paper or slip, `shown` frozen at landing), as the rules keep it: ONE stable reference while it does not change. */
export function useDeskItem(): R.DeskItem | null {
  return useDecree((_c, g) => g.decree.desk, null);
}

/** The paper resting in its take-back window, or null (stable reference). */
export function usePending(): R.Pending | null {
  return useDecree((_c, g) => g.decree.pending, null);
}

/** What a strip of the desk item prints, as data (the rules' `stripOf`), for `side`; null when `side` is null or nothing is on the desk. */
export function useStrip(side: R.Choice | null): R.Strip | null {
  return useDecreeJson((cfg, g) => (side && g.decree.desk ? R.stripOf(cfg, g, side) : null), null);
}

// ----------------------------------------------------------------------------- the office and its phase

export function useOffice(): R.OfficeIx {
  return useDecree((_c, g) => g.decree.office, 0 as R.OfficeIx);
}

export function usePhase(): R.Phase {
  return useDecree((_c, g) => g.decree.phase, 'governing' as R.Phase);
}

/** True from the call until election night ends: no ad and no product is offered then (2.10). */
export function useRunUp(): boolean {
  return useDecree((cfg, g) => !R.canShop(cfg, g), false);
}

// ----------------------------------------------------------------------------- the bars

/** The top bar's values (4.1) but the treasury (TopBar follows the cash outside React): income rounded by the rules. */
export function useTopBarView(): Omit<R.TopBar, 'cash'> {
  return useDecreeShallow(
    (cfg, g) => {
      const t = R.topBar(cfg, g);
      return { income: R.roundDibs(cfg, t.income), approval: t.approval, multiplier: t.multiplier, gossip: t.gossip, gossipMax: t.gossipMax };
    },
    { income: 0, approval: 0, multiplier: 1, gossip: 0, gossipMax: 0 },
  );
}

/** The last headline (5.5, the Gazette corner) and the office's newspaper. */
export function useHeadline(): { paper: string; headline: string | null } {
  const none: { paper: string; headline: string | null } = { paper: '', headline: null };
  return useDecreeShallow((cfg, g): { paper: string; headline: string | null } => ({ paper: R.officeOf(cfg, g.decree.office).newspaper, headline: g.decree.clippings[g.decree.clippings.length - 1] ?? null }), none);
}

export interface ClubView {
  club: number;
  id: string;
  short: string;
  icon: string;
  mood: number;
  boycott: boolean;
  /** D25: in a huff (the poll's `huffing`); D31: won over (the poll's `wonOver`). */
  huff: boolean;
  wonOver: boolean;
}

/** The club strip (4.1) with the poll's huff and won-over marks (D25, D31), from the rules only. */
export function useClubs(): ClubView[] {
  return useDecreeJson((cfg, g) => {
    const p = R.poll(cfg, g);
    const huffing = new Set(p.huffing);
    const won = new Set(p.wonOver);
    return R.clubStrip(cfg, g).map((c) => ({ ...c, huff: huffing.has(c.club), wonOver: won.has(c.club) }));
  }, []);
}

/** The term ribbon's values (4.1, 2.10), the office's title and phase. */
export function useRibbonView(): (R.TermRibbon & { title: string; phase: R.Phase }) | null {
  return useDecreeJson((cfg, g) => ({ ...R.termRibbon(cfg, g), title: R.officeOf(cfg, g.decree.office).title, phase: g.decree.phase }), null);
}

/** The goal line's goal (2.16), with the names its words need and whether its ad may be offered now. */
export interface GoalView {
  goal: R.Goal;
  /** The purchase's ministry name (from the config), or null. */
  name: string | null;
  /** The boycotting club's short name and the papers its boycott still runs, for 'settle' and the courier. */
  club: string | null;
  papersLeft: number | null;
  /** The papers "Say nothing" still runs (2.8), or null. */
  scandalLeft: number | null;
  /** The goal's ad may be offered now (the rules' canWatchAd). */
  adOk: boolean;
  runUp: boolean;
}

export function useGoalView(): GoalView | null {
  return useDecreeJson((cfg, g) => {
    const goal = R.goalLine(cfg, g);
    const d = g.decree;
    let name: string | null = null;
    if (goal.kind === 'purchase' && goal.purchase.type !== 'monument') name = ministryName(cfg, d.office, goal.purchase.ministry);
    const clubIx = goal.kind === 'settle' ? goal.club : goal.kind === 'ad' && goal.ad === 'courier' ? d.strikes.findIndex((x) => !!x) : -1;
    const strip = clubIx >= 0 ? R.clubStrip(cfg, g)[clubIx] : null;
    const papersLeft = clubIx >= 0 ? (d.strikes[clubIx]?.papersLeft ?? null) : null;
    const adOk = goal.kind === 'ad' ? R.canWatchAd(cfg, g, goal.ad) : false;
    return { goal, name, club: strip?.short ?? null, papersLeft, scandalLeft: d.scandal?.papersLeft ?? null, adOk, runUp: !R.canShop(cfg, g) };
  }, null);
}

/** A ministry's (or Grand Project's) name and art id in office `o` (config data). */
export function ministryName(cfg: R.DecreeConfig, o: R.OfficeIx, i: number): string {
  const row = R.officeOf(cfg, o);
  const m = row.ministries[i];
  if (m) return m.name;
  return cfg.decree.grandProjects[i - row.ministries.length]?.name ?? '';
}
export function ministryId(cfg: R.DecreeConfig, o: R.OfficeIx, i: number): string {
  const row = R.officeOf(cfg, o);
  const m = row.ministries[i];
  if (m) return m.id;
  return cfg.decree.grandProjects[i - row.ministries.length]?.id ?? '';
}

/** The in-tray: how many wait, and the next three visitors' faces and names (4.1's peek). */
export function useTray(): { count: number; next: { face: string; name: string; role: string }[] } {
  return useDecreeJson(
    (_c, g) => ({ count: g.decree.tray.length, next: g.decree.tray.slice(0, 3).map((p) => ({ face: p.visitor.face, name: p.visitor.name, role: p.visitor.role })) }),
    { count: 0, next: [] },
  );
}

// ----------------------------------------------------------------------------- the sheets

export function useLedgerView(): R.Ledger | null {
  return useDecreeJson((cfg, g) => R.ledger(cfg, g), null);
}

export function usePollView(): R.Poll | null {
  return useDecreeJson((cfg, g) => R.poll(cfg, g), null);
}

export function useCabinetView(): ReturnType<typeof R.cabinet> {
  return useDecreeJson((cfg, g) => R.cabinet(cfg, g), []);
}

/** Whether the Shop may offer products now (2.10, 5.11). */
export function useCanShop(): boolean {
  return useDecree((cfg, g) => R.canShop(cfg, g), true);
}

/** Whether the rewarded ad `kind` may be offered now (the rules' canWatchAd). */
export function useCanAd(kind: R.DecreeAdKind): boolean {
  return useDecree((cfg, g) => R.canWatchAd(cfg, g, kind), false);
}

/** The ad skip is owned ("Skip the Ad Videos"): no video plays, the buttons say what they give. */
export function useAdFree(): boolean {
  return useGame((s) => !!s.game.entitlements.skipRewarded);
}

/** The Standing Order's switch (5.10, D11): whether it exists now and whether it is on. */
export function useStandingOrder(): { available: boolean; on: boolean } {
  return useDecreeShallow((cfg, g) => ({ available: R.standingOrderAvailable(cfg, g), on: g.decree.standingOrder }), { available: false, on: false });
}
