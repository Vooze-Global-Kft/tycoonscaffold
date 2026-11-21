import { registerRootComponent } from 'expo';
import App from './ui/App';

export function boot() {
  registerRootComponent(App);
}
