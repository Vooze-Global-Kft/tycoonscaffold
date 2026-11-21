import { registerRootComponent } from 'expo';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

// Skia on web needs its WebAssembly (public/canvaskit.wasm) loaded before any component renders.
export function boot() {
  LoadSkiaWeb({ locateFile: (file: string) => `/${file}` }).then(() => {
    registerRootComponent(require('./ui/App').default);
  });
}
