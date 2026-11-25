/**
 * Where a ticket comes from in the world (findings L4, P8, W17): the PRINTER SLOT of a place's display, as
 * the art's manifest gives it (`slots.printer`, points round the sprite's anchor at pen.VIEW), turned into
 * the yard's metres and a height, so the ticket layer projects it through the camera like any world point.
 * The proof's hero frame does the same (art/proof.draw.ts ticketOutOfSlot). A place drawn with extra
 * sprites (the weighbridge's display on its pole, world/actors.ts PLACE_ART) takes the slot of the extra
 * that has one. No coordinate lives here: the place's point is the content's, the slot the art's.
 */
import type { SalvageConfig } from '../../../engine/salvage';
import { VIEW } from '../art/pen';
import { PLACE_ART, entryOf } from '../world/actors';

export interface WorldPoint {
  x: number;
  y: number;
  z: number;
}

/** The printer slot of a place's display in metres (x, y on the ground and z up), or null when its art has none. */
export function printerSlot(cfg: SalvageConfig, place: string): WorldPoint | null {
  const c = cfg.salvage;
  const p = c.map.points[place];
  const pl = c.map.places[place] as { sprite?: string } | undefined;
  if (!p || !pl?.sprite) return null;
  const art = PLACE_ART[pl.sprite];
  const parts = [{ id: art?.id ?? pl.sprite, dx: 0, dy: 0 }, ...(art?.extra ?? [])];
  for (const part of parts) {
    const e = entryOf(part.id) as { slots?: Record<string, { x: number; y: number; w: number; h: number }>; drawScale?: number } | undefined;
    const b = e?.slots?.printer;
    if (!b) continue;
    const k = e?.drawScale ?? 1;
    const px = (b.x + b.w / 2) * k;
    const py = (b.y + b.h / 2) * k;
    return { x: p[0] + part.dx + px / VIEW.ppm, y: p[1] + part.dy, z: -py / (VIEW.ppm * VIEW.lift) };
  }
  return null;
}
