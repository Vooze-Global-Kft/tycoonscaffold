/**
 * The hint pointer for the shared HintOverlay (parts.HintPointer, spec 3.1): our own firefly
 * (Pizza has a glove, Orbit a reticle). PLACEHOLDER of the skeleton: an amber dot with a halo.
 * Owned by the hints and platform package; the art kit draws the firefly
 * (docs/design/market-build-plan.md).
 */
import { Circle, Group } from '@shopify/react-native-skia';
import type { HintPointerProps } from '../modeParts';

export function FireflyPointer({ x, y, scale }: HintPointerProps) {
  return (
    <Group>
      <Circle cx={x} cy={y} r={14 * scale} color="rgba(242,165,65,0.25)" />
      <Circle cx={x} cy={y} r={5 * scale} color="#F2A541" />
    </Group>
  );
}
