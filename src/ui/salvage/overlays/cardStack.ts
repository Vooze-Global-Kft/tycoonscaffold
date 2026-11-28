/**
 * Which card is open (one at a time, yard-stage1.md 4.3), the office's open tab, and the last refusal a
 * card's button met. Screen state only: never saved, never the rules'. Opening a card also marks the
 * shell's overlay stack (uiState: the yard's stick and the Open button stop while a card shows), and
 * closing it pops that mark, so the shell, Android back and the scrim agree.
 */
import { create } from 'zustand';
import * as R from '../../../engine/salvage';
import type { CardData, CardKind, CardRef, ProcessPage, SalvageConfig, SalvageContent, SalvageGame, Txt } from '../../../engine/salvage';
import { stageOn } from '../../../modes/salvage/stage';
import { useSalvageUi } from '../uiState';

/** The office's tabs (4.3: Rota, Partners, the process board). */
export type OfficeTab = 'rota' | 'partners' | 'processBoard';

/** A refusal shown under the row whose button met it (by row id), or at the card's foot. */
export interface CardNote {
  row: string;
  txt: Txt;
  at: number;
}

// ================================================================================================ stage 2 (C-CARDSUI, PLAN2 2.5)
// Everything below this line that changes what a card does is read only under stageOn() (the works' development switch,
// src/modes/salvage/stage.ts): with the switch off `open`, `close` and the views take today's path, bit for bit.

/**
 * v3: the office's pages under stageOn(): the three tabs and Agreements (the office's fourth tab, RULING2 9.7). `OfficeTab`
 * itself gains 'agreements' only when Office.tsx's tab titles do (its `Record<OfficeTab, Txt>` would not compile today;
 * Office.tsx is CRD-BANK's: PLAN2-errata C-CARDSUI).
 */
export type OfficeTabV3 = OfficeTab | 'agreements';

/**
 * The card kinds each drawn by a view of their own under stageOn() (PLAN2 2.5: the 12 v3 kinds, 'park' and 'floor').
 * The works card hands the line and bay plates to WorksLine and the halls to HallCard (`worksViewOf`). OverlayHost.tsx's
 * STAGE2_VIEWS is a `Record` over this list (the typecheck refuses a missing view); host.test.ts checks the list against
 * the rules' CARD_KINDS_V3.
 */
export const STAGE2_VIEW_KINDS = ['works', 'finance', 'letter', 'yardSale', 'lot', 'crate', 'shop', 'packSheet', 'ageQuestion', 'packCode', 'awayBonus', 'agreements', 'park', 'floor'] as const satisfies readonly CardKind[];
export type Stage2ViewKind = (typeof STAGE2_VIEW_KINDS)[number];
/** The view (overlays/<name>.tsx, exported function <name>) of each stage-2 kind. */
export const STAGE2_VIEW_FILES: Readonly<Record<Stage2ViewKind, string>> = {
  works: 'WorksCard',
  finance: 'Finance',
  letter: 'Letter',
  yardSale: 'YardSale',
  lot: 'Lot',
  crate: 'Crate',
  shop: 'Shop',
  packSheet: 'PackSheet',
  ageQuestion: 'AgeQuestion',
  packCode: 'PackCode',
  awayBonus: 'AwayBonus',
  agreements: 'Agreements',
  park: 'ParkCard',
  floor: 'FloorCard',
};
/** The kinds with a view of their own today (OverlayHost.tsx CARD_VIEWS; host.test.ts: unchanged with the switch off). */
export const TODAY_VIEW_KINDS = ['rack', 'machine', 'processBoard', 'board', 'skip', 'deal', 'table', 'away', 'rung', 'clipboard', 'settings', 'help'] as const satisfies readonly CardKind[];

/** Which kinds have a view of their own: today's, and with the switch on the stage-2 kinds too. */
export function viewKinds(on: boolean = stageOn()): readonly CardKind[] {
  return on ? [...TODAY_VIEW_KINDS, ...STAGE2_VIEW_KINDS] : TODAY_VIEW_KINDS;
}

/** Which view draws a works card: a hall (kind 'batch'), the shredder line or its depollution bay (a plate that comes `with` another, or the other), else the plot's. */
export function worksViewOf(c: Pick<SalvageContent, 'works'>, data: Pick<CardData, 'works'>): 'hall' | 'line' | 'plot' {
  const w = data.works;
  if (!w) return 'plot';
  if (w.kind === 'batch') return 'hall';
  const plates = c.works?.plates ?? {};
  if (plates[w.plate]?.with?.length) return 'line';
  for (const id in plates) if (plates[id].with?.includes(w.plate)) return 'line';
  return 'plot';
}

/**
 * A card the player leaves only by its OK (PLAN2 2.5, critic I6): the age question. The scrim does nothing, Android back is
 * swallowed, `close()` keeps it up; the card's OK calls `finish()`. (The counting card is not a ref: OverlayHost swallows
 * back while it shows and its scrim has no press.)
 */
export const MUST_KINDS: readonly CardRef['kind'][] = ['ageQuestion'];
export function mustOf(ref: CardRef | null, on: boolean = stageOn()): boolean {
  return on && !!ref && MUST_KINDS.includes(ref.kind);
}

/** Cards whose close the host reports to the rules as seen (requests.md rules-money item 3: the shop's close, noteSeen({card: 'shop'})). */
export const SEEN_ON_CLOSE: readonly CardKind[] = ['shop'];

/** What the stack asks of the world outside it (OverlayHost wires them at load; tests hand stand-ins). Pure stack, no service import. */
export interface CardHooks {
  /** The store account's country (services/region.ts storefrontCountry; null: unknown, packs off). */
  country: () => Promise<string | null>;
  /** A card noted as seen at its close (salvageActions.noteSeen({card})). */
  seen: (card: CardKind) => void;
}
const hooks: CardHooks = { country: async () => null, seen: () => {} };
/** Sets the hooks; returns a function that puts the previous ones back. */
export function setCardHooks(h: Partial<CardHooks>): () => void {
  const was = { ...hooks };
  Object.assign(hooks, h);
  return () => void Object.assign(hooks, was);
}

const sameRef = (a: CardRef | null, b: CardRef | null) => !!a && !!b && JSON.stringify(a) === JSON.stringify(b);

interface CardStack {
  ref: CardRef | null;
  tab: OfficeTabV3;
  note: CardNote | null;
  /** v3: the process board's page the open ref asked for (null: the newest purchase's; the board's view reads it). */
  page: ProcessPage | null;
  /** v3: cards due after the open one (the lender's letter after the card that made it due; a card asked for under a must card). */
  queue: CardRef[];
  /** v3: the store country as last read (once per card opening; kept between openings, so a re-read never waits for it). */
  country: string | null;
  /** v3: how many openings have read the country (the latest read wins). */
  countryReads: number;
  /** Opens a card (replacing the open one: one at a time). */
  open(ref: CardRef, tab?: OfficeTabV3): void;
  /** Closes the open card; false when none was open. A must card (stage on) stays: true (back is swallowed). */
  close(): boolean;
  /** v3: the must card's OK: closes the open card whatever it is, then opens the next one due. */
  finish(): boolean;
  /** v3: opens `ref` now, or after the open card closes (each ref queued once). */
  after(ref: CardRef): void;
  setTab(tab: OfficeTabV3): void;
  setNote(note: CardNote | null): void;
}

export const useCards = create<CardStack>((set, get) => {
  const popShell = () => {
    const ui = useSalvageUi.getState();
    while (ui.stack.length && useSalvageUi.getState().closeTop()) {
      /* pop the shell's marks too */
    }
  };
  const readCountry = () => {
    const n = get().countryReads + 1;
    set({ countryReads: n });
    let p: Promise<string | null>;
    try {
      p = hooks.country();
    } catch {
      p = Promise.resolve(null);
    }
    void p.then(
      (country) => {
        if (get().countryReads === n) set({ country });
      },
      () => {
        if (get().countryReads === n) set({ country: null });
      },
    );
  };
  const leaving = (prev: CardRef | null, next: CardRef | null) => {
    if (prev && !sameRef(prev, next) && (SEEN_ON_CLOSE as readonly string[]).includes(prev.kind)) hooks.seen(prev.kind as CardKind);
  };
  const shut = (): boolean => {
    const prev = get().ref;
    if (!prev) return false;
    set({ ref: null, note: null });
    popShell();
    leaving(prev, null);
    const [next, ...rest] = get().queue;
    if (next) {
      set({ queue: rest });
      get().open(next);
    }
    return true;
  };
  return {
    ref: null,
    tab: 'rota',
    note: null,
    page: null,
    queue: [],
    country: null,
    countryReads: 0,
    open: (ref, tab) => {
      const ui = useSalvageUi.getState();
      // A2 (owner2-fix-hud): nothing opens under the counting card; only the away card that takes its place.
      if (ui.counting && ref.kind !== 'away') return;
      if (!stageOn()) {
        if (!ui.stack.includes('panel')) ui.open('panel');
        set({ ref, tab: tab ?? (ref.kind === 'processBoard' ? 'processBoard' : 'rota'), note: null });
        return;
      }
      const prev = get().ref;
      // A must card stays up: what is asked for meanwhile waits behind it.
      if (mustOf(prev, true) && !sameRef(prev, ref)) {
        get().after(ref);
        return;
      }
      if (!ui.stack.includes('panel')) ui.open('panel');
      const t: OfficeTabV3 = tab ?? (ref.kind === 'office' ? ref.tab : ref.kind === 'processBoard' ? 'processBoard' : 'rota');
      const page = ref.kind === 'office' ? (ref.page ?? null) : null;
      set({ ref, tab: t, page, note: null, queue: get().queue.filter((q) => !sameRef(q, ref)) });
      leaving(prev, ref);
      readCountry();
    },
    close: () => {
      if (!get().ref) return false;
      if (!stageOn()) {
        set({ ref: null, note: null });
        popShell();
        return true;
      }
      if (mustOf(get().ref, true)) return true;
      return shut();
    },
    finish: () => (stageOn() ? shut() : get().close()),
    after: (ref) => {
      const s = get();
      if (!s.ref && !useSalvageUi.getState().counting) {
        s.open(ref);
        return;
      }
      if (sameRef(s.ref, ref) || s.queue.some((q) => sameRef(q, ref))) return;
      set({ queue: [...s.queue, ref] });
    },
    setTab: (tab) => set({ tab, note: null }),
    setNote: (note) => set({ note }),
  };
});

/**
 * The card's data as the host reads it: with the switch on, cardOf gets the context read at the opening (the store
 * country, PLAN2 2.5 / critic I4 a: cards.ts defaults to no country, "packs off"); with it off, today's call exactly.
 */
export function readCard(cfg: SalvageConfig, g: SalvageGame, ref: CardRef, now: number, on: boolean = stageOn()): CardData {
  return on ? R.cardOf(cfg, g, ref, now, { country: useCards.getState().country }) : R.cardOf(cfg, g, ref, now);
}

/**
 * A press that may take seconds (PLAN2 6.3, critic I17): the pressed state is shown AT ONCE (in the touch's own handler,
 * before anything is computed), the act runs on the next turn, and the button stays disabled until the act has landed:
 * a sync act when it returns, an async one (a video, a store sheet: actions.ts pressRunning) when it stops running.
 * A second press meanwhile does nothing. Pure: BuyButton.tsx hands it React state and the actions; host.test.ts drives it.
 */
export interface BuyPressSteps<T> {
  run(): T | null;
  running(): boolean;
  onRunning(f: () => void): () => void;
  defer(f: () => void): void;
  show(busy: boolean): void;
  answer(r: T | null): void;
}
export function createBuyPress<T>(s: BuyPressSteps<T>): { press(): boolean; busy(): boolean; dispose(): void } {
  let busy = false;
  let off: (() => void) | null = null;
  const land = () => {
    off?.();
    off = null;
    busy = false;
    s.show(false);
  };
  return {
    press() {
      if (busy) return false;
      busy = true;
      s.show(true);
      s.defer(() => {
        let r: T | null = null;
        try {
          r = s.run();
        } catch (e) {
          land();
          throw e;
        }
        s.answer(r);
        if (s.running()) off = s.onRunning(() => (s.running() ? undefined : land()));
        else land();
      });
      return true;
    },
    busy: () => busy,
    dispose() {
      off?.();
      off = null;
    },
  };
}

/** Opens a card from anywhere in the screens (the shell's Open button, a world label, a hint). */
export function openCard(ref: CardRef, tab?: OfficeTab): void {
  useCards.getState().open(ref, tab);
}

/** Closes the open card. */
export function closeCard(): boolean {
  return useCards.getState().close();
}
