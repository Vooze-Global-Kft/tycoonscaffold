/**
 * The flick's responder (spec 4.3; React Native's responder system, no gesture library). Spread its
 * handlers on a view that covers exactly the paper's rectangle (from deskLayout), so a touch outside
 * the paper, at the screen's edges, stays with the system.
 *
 * JavaScript keeps the distance and the velocity from pageY and timestamps (./flick.ts) and writes ONE
 * shared value, `paperY` (the finger's distance, positive down), from which the UI thread derives the
 * paper's offset, the ink and the drawer's opening; JavaScript never reads it back. Vertical only. From 40 pt the side is armed (the strip grows
 * on the UI thread; uiState.preview: the bars preview) with one light haptic and no click; a second finger cancels the gesture until every
 * finger lifts; a touch that hardly moved is a tap (the second path, handled by the desk).
 */
import { useMemo, useRef } from 'react';
import type { GestureResponderEvent, GestureResponderHandlers } from 'react-native';
import { withSpring, type SharedValue } from 'react-native-reanimated';
import { fx } from '../../../services/fx';
import { useDecreeUi } from '../uiState';
import { FAST_UP_SPEED, SPRING, armedAt, isTap, releaseAt, velocityOf, type Release, type Sample } from './flick';

export interface FlickCallbacks {
  /** Whether a paper or slip lies on the desk to flick. */
  enabled: () => boolean;
  /** A tap at `y` points from the paper's top (the second path). */
  onTap: (y: number) => void;
  /** A release: commit up, down, or spring back (the desk animates and calls the rules). */
  onRelease: (r: Release, y: number) => void;
}

interface Gesture {
  startY: number;
  startT: number;
  samples: Sample[];
  maxMove: number;
  dy: number;
  cancelled: boolean;
  armed: 'sign' | 'refuse' | null;
  buzzed: boolean;
}

const touchCount = (e: GestureResponderEvent) => e.nativeEvent.touches?.length ?? 1;

export function useFlick(paperY: SharedValue<number>, paperTop: number, cb: FlickCallbacks): GestureResponderHandlers {
  const g = useRef<Gesture | null>(null);
  const cbRef = useRef(cb);
  cbRef.current = cb;
  const topRef = useRef(paperTop);
  topRef.current = paperTop;

  return useMemo<GestureResponderHandlers>(() => {
    const ui = useDecreeUi.getState;
    // A drag past 40 pt only PREVIEWS its side in the bars (uiState.preview, set a frame later so the
    // paper's move is not held up by their re-render); the strip's 110 % and the ink are drawn on the UI
    // thread from paperY. uiState.arm is the tap path's alone (finding 3: no desk re-render mid-drag).
    let raf: number | null = null;
    const preview = (side: 'sign' | 'refuse' | null) => {
      if (raf !== null) cancelAnimationFrame(raf);
      if (side === null) {
        raf = null;
        ui().setPreview(null);
        return;
      }
      raf = requestAnimationFrame(() => {
        raf = null;
        if (g.current?.armed === side) ui().setPreview(side);
      });
    };
    const arm = (side: 'sign' | 'refuse' | null) => {
      const s = g.current;
      if (!s || s.armed === side) return;
      s.armed = side;
      preview(side);
      if (side && !s.buzzed) {
        s.buzzed = true;
        const v = velocityOf(s.samples);
        // 4.3: from 40 pt a light haptic, no click. Up: the nib's first scratch (its haptic only when the
        // push is slow, so a fast flick does not buzz twice with the commit's). Down: the haptic alone.
        if (side === 'sign') fx.play('sign_ink', { haptic: Math.abs(v) < FAST_UP_SPEED });
        else fx.play('take_back', { volume: 0 });
      }
    };
    const end = (release: Release) => {
      const s = g.current;
      g.current = null;
      preview(null);
      ui().setFinger(false);
      cbRef.current.onRelease(release, s ? s.dy : 0);
    };
    return {
      onStartShouldSetResponder: () => cbRef.current.enabled(),
      onMoveShouldSetResponder: () => false,
      onResponderTerminationRequest: () => false,
      onResponderGrant: (e) => {
        const t = e.nativeEvent.timestamp || Date.now();
        g.current = { startY: e.nativeEvent.pageY, startT: t, samples: [{ y: e.nativeEvent.pageY, t }], maxMove: 0, dy: 0, cancelled: touchCount(e) > 1, armed: null, buzzed: false };
        ui().setFinger(true);
      },
      onResponderMove: (e) => {
        const s = g.current;
        if (!s || s.cancelled) return;
        if (touchCount(e) > 1) {
          // A second finger cancels: the paper springs back and nothing commits.
          s.cancelled = true;
          arm(null);
          paperY.value = withSpring(0, SPRING);
          return;
        }
        const t = e.nativeEvent.timestamp || Date.now();
        const y = e.nativeEvent.pageY;
        s.samples.push({ y, t });
        if (s.samples.length > 12) s.samples.shift();
        s.dy = y - s.startY;
        s.maxMove = Math.max(s.maxMove, Math.abs(s.dy));
        paperY.value = s.dy;
        arm(armedAt(s.dy));
      },
      onResponderRelease: (e) => {
        const s = g.current;
        if (!s) return;
        const t = e.nativeEvent.timestamp || Date.now();
        if (s.cancelled) return end('spring');
        if (isTap(s.maxMove, t - s.startT)) {
          g.current = null;
          preview(null);
          ui().setFinger(false);
          cbRef.current.onTap(e.nativeEvent.pageY - topRef.current);
          return;
        }
        // The release itself is a sample: iOS sends no move while a finger rests, so a fast push that
        // then rests and lifts must read as still (finding 0), never as the fast flick it once was.
        const r = releaseAt(s, e.nativeEvent.pageY, t);
        if (r === 'spring' && s.armed) arm(null);
        end(r);
      },
      onResponderTerminate: () => {
        if (g.current?.armed) arm(null);
        end('spring');
      },
    };
  }, [paperY]);
}
