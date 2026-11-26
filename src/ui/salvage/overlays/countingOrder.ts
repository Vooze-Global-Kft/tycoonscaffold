/**
 * The counting card's order (owner2-hud, item 2), as a plain object over injected steps: no React, no React Native,
 * so ./counting.test.ts checks it. The hook that wires it to the screen is ./counting.ts.
 */
export interface CountingSteps {
  /** An absence waits for its pass. */
  pending(): boolean;
  /** The loading curtain has parted (nothing shows under it). */
  curtainDone(): boolean;
  /** Show or hide the counting card (uiState.counting). */
  show(on: boolean): void;
  /** Close the card that is open, if any. */
  closeOpenCard(): void;
  /** Run `f` at the next frame; returns a cancel. */
  frame(f: () => void): () => void;
  /** The deferred pass (runPending). */
  run(): void;
  /** Poll `sync` while the curtain holds (on: start, off: stop). */
  poll(on: boolean): void;
  /** The web preview's ?counting=hold: the card stays and the pass never runs. */
  hold: boolean;
}

export interface Counting {
  /** Follow the waiting absence (on every change of it, and while the curtain holds). */
  sync(): void;
  /** The counting card is on screen (called after the commit that drew it): the pass runs two frames later. Returns a cancel. */
  painted(): () => void;
}

export function createCounting(st: CountingSteps): Counting {
  let shown = false;
  let polling = false;
  const sync = () => {
    const p = st.pending();
    const wait = p && !st.curtainDone();
    if (wait !== polling) {
      polling = wait;
      st.poll(wait);
    }
    if (p && !wait && !shown) {
      shown = true;
      st.closeOpenCard();
      st.show(true);
    } else if (!p && shown) {
      shown = false;
      st.show(false);
    }
  };
  const painted = () => {
    if (!shown || st.hold) return () => {};
    let cancel2: () => void = () => {};
    const cancel1 = st.frame(() => {
      cancel2 = st.frame(() => {
        // The pass, then the card goes: the away card opened from the store in the same update.
        st.run();
        shown = false;
        st.show(false);
      });
    });
    return () => {
      cancel1();
      cancel2();
    };
  };
  return { sync, painted };
}
