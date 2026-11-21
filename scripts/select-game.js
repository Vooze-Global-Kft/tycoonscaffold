// Writes src/generated/activeGame.ts for $GAME. Runs automatically on EAS
// (eas-build-post-install); locally, app.config.ts does the same on `expo start`.
const g = require('./lib/games.js');
const id = g.resolveGameId();
g.writeActiveGame(id);
console.log(`Active game: ${id}`);
