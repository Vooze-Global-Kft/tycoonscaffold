/**
 * The privacy policy page of one game: games/<id>/store/privacy-policy.html, written by `npm run
 * sync` from game.json, so the page always names what the build really contains (ads, analytics,
 * purchases, leaderboards, reminders). Host the file at `store.privacyPolicyUrl`; both stores
 * require the link for a game with ads or purchases.
 *
 * A draft for the owner to read before publishing, not legal advice. The two facts no tool knows
 * (who publishes the game and how to reach them) come from game.json `store.developerName` and
 * `store.contactEmail`; until they are set the page says so in capitals and `validate --release` fails.
 */
import type { GameConfig } from '../../src/config/schema';

export const POLICY_MISSING = { developer: '[DEVELOPER NAME: set store.developerName]', email: '[CONTACT EMAIL: set store.contactEmail]' } as const;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** True while the page would still show a placeholder for the publisher or the contact address. */
export function policyIncomplete(g: GameConfig): boolean {
  return !g.store.developerName || !g.store.contactEmail;
}

export function privacyPolicyHtml(g: GameConfig): string {
  const name = esc(g.app.displayName);
  const developer = esc(g.store.developerName ?? POLICY_MISSING.developer);
  const email = g.store.contactEmail ? `<a href="mailto:${esc(g.store.contactEmail)}">${esc(g.store.contactEmail)}</a>` : esc(POLICY_MISSING.email);
  const ads = g.monetization.ads;
  const hasAds = Boolean(ads.ios || ads.android);
  const sells = g.monetization.iap.products.length > 0;
  const boards = g.leaderboards?.boards ?? [];
  const gameCenter = boards.some((b) => b.iosId);
  const playGames = boards.some((b) => b.androidId);
  // The same condition as the app: a sim or classic game writes its reminder words in game.json, the other modes bring their own.
  const reminders = Boolean(g.reminders) || g.mode === 'haul' || g.mode === 'merge';
  const formats = ['rewarded videos you choose to watch', ...(ads.interstitials === false ? [] : ['full-screen ads at natural breaks']), ...(ads.showBanner ? ['a banner'] : [])];

  const P: string[] = [];
  const h = (t: string) => P.push(`<h2>${t}</h2>`);
  const p = (t: string) => P.push(`<p>${t}</p>`);
  const ul = (items: string[]) => P.push(`<ul>\n${items.map((i) => `  <li>${i}</li>`).join('\n')}\n</ul>`);

  const address = g.store.developerAddress ? esc(g.store.developerAddress) : null;
  p(`This policy explains what information the mobile game <strong>${name}</strong> ("the game") handles, why, and what you can do about it. The game is published by ${developer}${address ? `, ${address}` : ''} ("we"), which is the data controller for the information described here.`);
  p(`You can play ${name} without creating an account. We do not ask for your name, email address, phone number, contacts, photos or precise location, and the game has no chat.`);

  h('What is stored on your device');
  p(`Your game progress and settings are saved on your device. They are included in your device's own backup (iCloud or a computer backup on iPhone, Google's backup on Android) if you have backups turned on, so a new or restored device can continue your game. We do not receive a copy of your save.`);

  h('Information handled by the services built into the game');
  p('The game includes software from other companies. They receive the information below directly from your device and handle it under their own privacy policies.');
  const services: string[] = [];
  if (hasAds) {
    services.push(
      `<strong>Google AdMob</strong> (advertising: ${formats.join(', ')}). AdMob receives device identifiers such as the advertising ID, your IP address (from which an approximate location is derived), and information about the ads shown and tapped. It uses them to show ads, to limit how often you see the same ad and to prevent fraud; with your permission it also uses them to show ads based on your interests. Policy: <a href="https://policies.google.com/privacy">policies.google.com/privacy</a>; how Google uses information from apps that use its services: <a href="https://policies.google.com/technologies/partner-sites">policies.google.com/technologies/partner-sites</a>.`,
    );
  }
  services.push(
    `<strong>Google Firebase</strong> (Analytics, Crashlytics and Remote Config). Firebase receives an app-instance identifier, device and system information (model, operating system version, language, country), what happens in the game (for example sessions, levels reached, ads watched, purchases made) and crash reports. We use this to see how the game is played, to fix errors and to tune the game. Policy: <a href="https://firebase.google.com/support/privacy">firebase.google.com/support/privacy</a>.`,
  );
  if (sells) {
    services.push(
      `<strong>RevenueCat</strong> (in-app purchases). Purchases are paid through your Apple or Google account; we never see your payment details. RevenueCat receives an anonymous app user identifier and your purchase history in this game, so that purchases can be confirmed and restored. Policy: <a href="https://www.revenuecat.com/privacy">revenuecat.com/privacy</a>.`,
    );
  }
  if (gameCenter) {
    services.push(
      `<strong>Apple Game Center</strong> (leaderboards, on iPhone). If you are signed in to Game Center, the game sends your scores to Apple so they can appear on the leaderboards under your Game Center name. Game Center is run by Apple under Apple's privacy policy: <a href="https://www.apple.com/legal/privacy/">apple.com/legal/privacy</a>. You can sign out of Game Center in your device's Settings.`,
    );
  }
  if (playGames) {
    services.push(
      `<strong>Google Play Games Services</strong> (leaderboards, on Android). If you are signed in to Play Games, the game sends your scores to Google so they can appear on the leaderboards under your Play Games profile. Policy: <a href="https://policies.google.com/privacy">policies.google.com/privacy</a>. You can manage your Play Games profile in the Play Games settings.`,
    );
  }
  ul(services);

  h('Why this information is used, and on what legal basis');
  const bases: string[] = [];
  if (hasAds) {
    bases.push('<strong>Your consent</strong>: personalised advertising and the use of your device\'s advertising identifier for it. You can withdraw consent at any time (see "Your choices"); the game then shows ads that are not based on your interests.');
  }
  bases.push(
    `<strong>Our legitimate interests</strong>: understanding how the game is played, finding and fixing errors, tuning the game${hasAds ? ', showing ads that are not personalised, limiting how often an ad is shown, and preventing fraud' : ''}. You can object to this use by writing to us.`,
  );
  if (sells) bases.push('<strong>Performing our contract with you</strong>: confirming, delivering and restoring the purchases you make.');
  if (gameCenter || playGames) bases.push('<strong>Your own action</strong>: scores are sent to a leaderboard only while you are signed in to the platform\'s game service.');
  ul(bases);

  h('Where information is processed');
  p('The companies named above process information on servers in several countries, including the United States. Where personal data leaves the European Economic Area, the United Kingdom or Switzerland, they rely on the safeguards described in their own policies, such as the EU-US Data Privacy Framework or the European Commission\'s standard contractual clauses.');

  if (reminders) {
    h('Notifications');
    p(`If you allow notifications, the game schedules reminders on your own device (for example when your offline earnings are full). They are created on the device: no notification data is sent to us and we do not use a push service. You can turn them off in the game's settings or in your device's settings at any time.`);
  }

  h('Your choices');
  const choices: string[] = [];
  if (hasAds) {
    choices.push(`<strong>Ad consent.</strong> Where the law requires it (for example in the European Economic Area, the United Kingdom and some US states), the game asks for your choice before showing personalised ads. You can change it at any time under "Privacy choices" in the game's settings.`);
    choices.push(`<strong>Tracking on iPhone.</strong> The game asks for permission before using your device's advertising identifier. You can change this in Settings, Privacy &amp; Security, Tracking.`);
    choices.push(`<strong>Advertising ID on Android.</strong> You can reset or delete your advertising ID in Settings, Google, Ads.`);
  }
  choices.push(`<strong>Deleting your data.</strong> Deleting the game removes your save from the device. To ask for the deletion of information held by the services above, or to ask what is held, write to us at ${email} and tell us which game and which device you use; we will pass the request on to the services that can identify the data.`);
  const authority = g.store.dataAuthority ? ` You can complain to the data protection authority where you live, or to ours: ${esc(g.store.dataAuthority)}.` : ' You can also complain to your data protection authority.';
  choices.push(`<strong>Your rights.</strong> Depending on where you live (for example under the GDPR or the CCPA), you have the right to access, correct, delete or restrict the use of your personal data, to receive a copy of it, to object to its use and to withdraw a consent you gave.${authority} We do not sell personal information.`);
  ul(choices);

  h('Children');
  p(`${name} is not directed at children under 13, and we do not knowingly collect personal information from them. If you believe a child has provided personal information through the game, write to us at ${email} and we will have it deleted.`);

  h('How long information is kept');
  p('Analytics and crash information is kept by the services above for the periods set in their own policies (Firebase Analytics data for up to 14 months). Purchase records are kept as long as they are needed to restore your purchases and to meet legal obligations.');

  h('Changes to this policy');
  p('When we change this policy we will publish the new version at this address and change the date below.');

  h('Contact');
  p([developer, address, email].filter(Boolean).join('<br>'));
  if (g.store.privacyPolicyUpdated) p(`Last updated: ${esc(g.store.privacyPolicyUpdated)}`);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name}: Privacy Policy</title>
<style>
  body { font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1c1c1e; background: #ffffff; margin: 0; }
  main { max-width: 720px; margin: 0 auto; padding: 32px 16px 64px; }
  h1 { font-size: 28px; line-height: 1.25; margin: 0 0 24px; }
  h2 { font-size: 19px; margin: 32px 0 8px; }
  li { margin-bottom: 12px; }
  a { color: #0b57d0; overflow-wrap: anywhere; }
  @media (prefers-color-scheme: dark) { body { color: #f2f2f7; background: #1c1c1e; } a { color: #8ab4f8; } }
</style>
</head>
<body>
<main>
<h1>${name}: Privacy Policy</h1>
${P.join('\n')}
</main>
</body>
</html>
`;
}
