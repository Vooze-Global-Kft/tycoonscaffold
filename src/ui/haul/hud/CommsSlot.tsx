/** SKELETON (package "shell"). The comms slot under the strip (spec 4.1, 3, 7.4): one line at a time, queued, call-sign portrait (mach:) plus the line; closes after 5 s or on tap; story lines 45 s apart, hint lines without the gap. Plays comms_in. */
import { Placeholder } from '../Placeholder';
import { useGame } from '../../../state/store';
import type { Rect } from '../layout';

export function CommsSlot({ rect }: { rect: Rect }) {
  const line = useGame((s) => s.cfg.story.find((b) => !s.game.storySeen.includes(b.id))?.lines[0] ?? '');
  return <Placeholder name="CommsSlot" pkg="hud/CommsSlot.tsx · shell" live={line} style={{ position: 'absolute', left: rect.x, top: rect.y, width: rect.width, height: rect.height }} />;
}
