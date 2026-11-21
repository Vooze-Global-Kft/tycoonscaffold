import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

// Skia on web needs its WebAssembly loaded before any component renders.
// Native platforms register straight away.
if (Platform.OS === 'web') {
  const { LoadSkiaWeb } = require('@shopify/react-native-skia/lib/module/web');
  LoadSkiaWeb({ locateFile: (file: string) => `/${file}` }).then(() => {
    registerRootComponent(require('./src/ui/App').default);
  });
} else {
  registerRootComponent(require('./src/ui/App').default);
}
