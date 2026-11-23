/**
 * Native linking per game. React Native Firebase is installed for every game, but its iOS pods fail
 * `pod install` unless the whole app is built with dynamic frameworks, and nothing loads it without
 * the game's two Firebase files (src/services/firebase.ts). So a game without them is built without
 * Firebase's native code. The game is the GAME env var, as in app.config.ts.
 */
const games = require('./scripts/lib/games.js');

const FIREBASE = ['app', 'analytics', 'crashlytics', 'remote-config'].map((name) => '@react-native-firebase/' + name);
const off = { platforms: { ios: null, android: null } };

module.exports = {
  dependencies: games.firebaseFiles(games.resolveGameId()).enabled ? {} : Object.fromEntries(FIREBASE.map((name) => [name, off])),
};
