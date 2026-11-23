/**
 * Where the sheets and spokes of spec 4.4 mount (one at a time, `useMergeUi` sheet / spoke; each is
 * the kit Sheet or registers with useOverlay), above the play canvas and the bars. PLACEHOLDER of
 * the skeleton: mounts nothing yet. Owned by the bars, sheets and spokes package; the hints and
 * platform package mounts the overlay registration and the away report here
 * (docs/design/market-build-plan.md).
 */
import type { MergeLayout } from '../layout';
// ===== PLATFORM (hints and platform package): Android back, the firefly, the away report =====
import { PlatformLayer } from '../platform';
// ===== end PLATFORM =====

export function Overlays({ layout }: { layout: MergeLayout }) {
  return (
    <>
      {/* ===== PLATFORM ===== */}
      <PlatformLayer layout={layout} />
      {/* ===== end PLATFORM ===== */}
    </>
  );
}
