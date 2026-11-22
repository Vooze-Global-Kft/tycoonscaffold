/**
 * A 3x3 matrix (row-major, 9 numbers) for a Skia `matrix` prop, recomputed on the UI thread
 * whenever one of `deps` changes, WITHOUT allocating: two preallocated arrays are filled in turn
 * (Skia sees a new reference, so it redraws) and `step` writes into the one it is given.
 * `step` may return false to say nothing changed: the previous matrix stays, nothing redraws.
 */
import { useEffect, useState } from 'react';
import { startMapper, stopMapper, useSharedValue, type SharedValue } from 'react-native-reanimated';

export type Mat3 = number[];

const ident = (): Mat3 => [1, 0, 0, 0, 1, 0, 0, 0, 1];

function isShared(v: unknown): v is SharedValue<unknown> {
  return typeof v === 'object' && v !== null && (v as { _isReanimatedSharedValue?: boolean })._isReanimatedSharedValue === true;
}

/** o = translate(tx, ty) * scale(sx, sy). */
export function putTS(o: Mat3, tx: number, ty: number, sx: number, sy: number) {
  'worklet';
  o[0] = sx;
  o[1] = 0;
  o[2] = tx;
  o[3] = 0;
  o[4] = sy;
  o[5] = ty;
  o[6] = 0;
  o[7] = 0;
  o[8] = 1;
}

/** o = translate(tx, ty) * rotate(rot). */
export function putTR(o: Mat3, tx: number, ty: number, rot: number) {
  'worklet';
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  o[0] = c;
  o[1] = -s;
  o[2] = tx;
  o[3] = s;
  o[4] = c;
  o[5] = ty;
  o[6] = 0;
  o[7] = 0;
  o[8] = 1;
}

export function useMatrix(step: (o: Mat3) => void | false, deps: readonly unknown[]): SharedValue<Mat3> {
  const [first] = useState<Mat3>(() => {
    const o = ident();
    step(o);
    return o;
  });
  const out = useSharedValue<Mat3>(first);
  const bufs = useSharedValue<{ flip: number; a: Mat3; b: Mat3 }>({ flip: 0, a: ident(), b: ident() });
  useEffect(() => {
    const id = startMapper(
      () => {
        'worklet';
        const st = bufs.value;
        const o = st.flip === 0 ? st.a : st.b;
        if (step(o) === false) return;
        st.flip = 1 - st.flip;
        out.value = o;
      },
      deps.filter(isShared),
      [out as SharedValue<unknown>],
    );
    return () => stopMapper(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return out;
}
