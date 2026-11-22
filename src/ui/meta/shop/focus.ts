/**
 * "Open the shop at this section": the header's gem "+" asks for the packs, the shop scrolls there.
 * A tiny pending flag outside React: request() before or after the shop mounts both work.
 */
export type ShopSectionId = 'packs';
type Listener = (id: ShopSectionId) => void;

let pending: ShopSectionId | null = null;
const listeners = new Set<Listener>();

export const shopFocus = {
  /** Ask the shop to show a section (call it together with setTab('shop')). */
  request(id: ShopSectionId): void {
    pending = id;
    listeners.forEach((l) => l(id));
  },
  /** The section asked for and not yet shown; clears it. */
  take(): ShopSectionId | null {
    const id = pending;
    pending = null;
    return id;
  },
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
