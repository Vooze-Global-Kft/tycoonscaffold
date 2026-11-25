/**
 * Every word the salvage screens show (AGENTS.md: one file per mode; the fingerprint and the voice
 * check read it). Owner from hour 0: package 9, strings and the text check (yard-stage1.md section 9);
 * a new key is a request to it and to the rules lead (the key list is src/engine/salvage/types.ts
 * `TEXT_KEYS`, and `TEXT` below must define exactly those keys: the typecheck holds both sides).
 *
 * Words follow yard-stage1.md section 5 (the voice of 5.6: short plain sentences in the trade's words; no
 * puns, no exclamation marks, no promises). Holes:
 * - `{arg}` filled from a Txt's typed arguments, numbers ONLY through the rules' formatters
 *   (src/engine/salvage.ts fmtMoney, fmtPrice, fmtMass, fmtDuration, fmtRank, fmtPct);
 * - `{id}` with a register id (homeYard, merchant, foundry, partnerFarm, rival.1, ...) filled from the
 *   game's `salvage.names` (written by the build script from scripts/content/yard/names.json, read by
 *   kind and name through `NAME_SELECTORS`; never a name written here, D13, S21).
 * `say(txt, content)` is the one function that turns a Txt into words.
 */
import * as R from '../../engine/salvage';
import type { SalvageContent } from '../../engine/salvage';

/** The texts by key, grouped by the package that shows them. */
export const TEXT = {
  // --- package 4: the top bar, the goal card, the one button (4.1) ---
  cash: '{x}',
  rankChip: '{rank} of {n} · next {rival} {t}',
  rankChipShort: '{rank} · next {rival}',
  rankChipToNext: '{rank} · {t} to next',
  rankChipTop: '{rank} of {n}',
  carry: '{a} / {b} kg',
  loadFull: 'Load full',
  open: 'Open',
  stepOut: 'Step out',
  trialLoad: 'Trial load {kg}',
  skipLoad: 'Load {kg}',
  goalProgress: '{a} / {b}',
  turnSideways: 'Turn your phone sideways',
  turnSidewaysBody: 'This game is played in landscape.',
  menu: 'Menu',
  close: 'Close',
  ok: 'OK',

  // --- package 3: place names (5.2, at most 18 characters) ---
  'place.rack': 'Tool rack',
  'place.office': 'Office',
  'place.scalehouse': 'Scale house',
  'place.scale': 'Platform scale',
  'place.weighbridge': 'Weighbridge',
  'place.noticeboard': 'Notice board',
  'place.dropoff': 'Public drop-off',
  'place.rubble': 'Rubble skip',
  'place.floor': 'Tipping floor',
  'place.park': 'Truck park',
  'place.stripper': 'Stripper pad',
  'place.bench': 'Motor bench',
  'place.crucible': 'Crucible',
  'place.stock': 'Old stock',
  'place.backfield': 'Back field',
  'place.bays': 'Bays',
  'place.merchant': '{merchant}',
  'place.lane': '{homeLane}',
  'place.bridge': 'Bridge',

  // --- packages 3 and 4: chips (4.2, 4.4) ---
  'chip.bay': '{grade} {kg} · today {x}',
  'chip.held': 'held',
  'chip.lowDay': 'low day',
  'chip.highDay': 'high day',
  'chip.reservedDeal': 'For the foundry {a} / {b}',
  'chip.forCrucible': 'For the crucible {a} / {b}',
  'chip.padlock': '{why}',
  'chip.padlockPrice': '{why} · {x}',
  'chip.crewWeighIn': '{role} · {kg} in',
  'chip.lotSold': 'Lot sold · {x}',
  'chip.certifiedEmpty': 'certified empty',
  'chip.bridgeLimit': 'Weight limit 7.5 t',
  'chip.needsTorchGate': 'Needs a cutting torch',

  // --- package 4: card titles (4.3) ---
  'title.rack': 'Tool rack',
  'title.rota': 'Rota',
  'title.partners': 'Partners',
  'title.processBoard': 'Process board',
  'title.machine': '{machine}',
  'title.board': 'Price board',
  'title.skip': '{partner}',
  'title.deal': 'Supply deal',
  'title.table': 'Industry table',
  'title.away': 'While you were away',
  'title.rung': '{homeYard}',
  'title.clipboard': 'Clipboard',
  'title.settings': 'Settings',
  'title.help': 'Help',
  'title.place': '{place}',

  // --- package 4: card rows and buttons (4.3, 5.2) ---
  'card.buy': 'Buy {x}',
  'card.hire': 'Hire {x}',
  'card.level': 'Level up {x}',
  'card.owned': 'Owned',
  'card.cameWithYard': 'Came with the yard',
  'card.sell': 'Sell {x}',
  'card.hold': 'Hold',
  'card.sign': 'Sign',
  'card.notNow': 'Not now',
  'card.fromBays': 'Take from bays',
  'card.poursIn': 'Pours in {t}',
  'card.readyToPour': 'Ready to pour',
  'card.heelAsk': 'Pour the heel as a short ingot?',
  'card.working': 'Working',
  'card.trayFull': 'Tray full',
  'card.waitingFor': 'Waiting for {grade}',
  'card.idle': 'Idle',
  'card.levelOnBoard': 'Level on the process board',
  'card.inOut': '{in} → {out}',
  'card.rateKgS': '{kg} a second',
  'card.charge': '{a} / {b}',
  'card.heel': 'Heel {kg}',
  'card.recipe': '{recipe}',
  'card.siteLicence': 'Site licence · metal dealer',
  'card.carriesRate': 'Carries {t} an hour',
  'card.cutsRate': 'Cuts {t} an hour',
  'card.drivesRate': 'Fetches a load in {t}',
  'card.opensAt': 'Opens at {t} supplied',
  'card.nightWatch': 'Away cap {a} h → {b} h',
  'card.dealTerms': '{kg} of {grade} a day for {n} days at {p} a kilo, locked at signing',
  'card.dealDaysLeft': '{n} days left',
  'card.dealReserve': 'Reserved {a} / {b}',
  'card.dealTrust': 'Trust {n} / 100',
  'card.dealLast': 'Last delivery {kg}',
  'card.skipState': '{partner} · full',
  'card.skipLine': '{thing} × {n} · {kg}',
  'card.skipNet': 'Net {kg}',
  'card.skipPrice': '{x}',
  'card.businessCard': '{contact} · {partner}',
  'card.converterPaid': 'Paid on assay: platinum {pt}, palladium {pd}, rhodium {rh}, less ceramic and assay fees',
  'card.levelAdds': '+{x} an hour {what}',
  'card.notBottleneck': 'Not the bottleneck now',
  'card.keptForLoad': 'Kept for the next load: {x}',
  'card.empty': '',

  // --- package 4: items, roles and effect lines (≤ 38) ---
  'item.sack': 'Sack truck',
  'item.trolley': 'Flat trolley',
  'item.frame': 'Carry frame',
  'item.spanners': 'Spanners and bolt cutters',
  'item.sledge': 'Sledge and grinder',
  'item.torch': 'Cutting torch',
  'item.truck': 'Hook-lift truck',
  'item.handStripper': 'Hand stripper',
  'item.stripper': 'Powered stripper',
  'item.bench': 'Motor bench',
  'item.crucible': 'Crucible',
  'item.brass': 'Brass recipe',
  'item.alu': 'Aluminium recipe',
  'item.night': 'Night watch',
  'role.hand': 'Yard hand',
  'role.cutter': 'Cutter',
  'role.driver': 'Driver',
  'effect.sack': 'Moves a washer in one trip',
  'effect.trolley': 'Moves a radiator in one trip',
  'effect.sledge': 'Breaks cast iron; cuts sheet faster',
  'effect.torch': 'Cuts beams, tanks and the car',
  'effect.truck': 'Fetches partners’ loads',
  'effect.stripper': 'Strips heavy cable to copper',
  'effect.bench': 'Takes motors apart: copper, steel, alu',
  'effect.crucible': 'Melts brass solids into ingots',
  'effect.alu': 'Melts cast aluminium into ingots',
  'effect.night': 'A longer away cap',
  'effect.hand': 'Carries to the scale and the hoppers',
  'effect.cutter': 'Cuts what waits at the drop-off',
  'effect.driver': 'Fetches full loads with the truck',

  // --- package 4: the price board (4.4) ---
  'board.head': 'Market day {date} (UTC) · next prices in {t}',
  'board.usual': 'usual',
  'board.lowDay': 'low day',
  'board.highDay': 'high day',
  'board.firstHint': '{grade}: a low day. Holding is free.',
  'board.sellTotal': 'Sell {x}',

  // --- package 4: the process board (4.5) ---
  'plate.handStripper': 'Hand stripper',
  'plate.stripper': 'Powered stripper',
  'plate.bench': 'Motor bench',
  'plate.crucible': 'Crucible',
  'plate.brass': 'Brass recipe',
  'plate.alu': 'Aluminium recipe',
  'plate.bronze': 'Bronze',
  'plate.lead': 'Lead',
  'plate.lithium': 'Lithium',
  'plate.pgm': 'Platinum group and iridium',
  'plate.tungsten': 'Tungsten',
  'plate.owned': 'Level {n}',
  'plate.price': '{x}',
  'plate.levelPrice': 'Level up {x}',
  'plate.locked': '{why}',

  // --- package 4: the industry table and the rung sign (2.11) ---
  'table.headline': 'the largest full metal recycling and resource supplier',
  'table.simulated': 'simulated',
  'table.rivalsSimulated': 'Rival firms (simulated)',
  'table.rung': '{t} supplied · {r} metals',
  'table.rungGate': 'Opens at {t} supplied',
  'table.range': '{n} metals',
  'table.you': '{homeYard}',
  'table.rungSign': '{homeYard} · {t} supplied',
  'table.rungOpens': '{what}',

  // --- package 4: the away card (4.4) ---
  'away.head': 'Away {t} (cap {c} h)',
  'away.line': '{grade} {kg} · {x}',
  'away.supplied': '{t} supplied · {x} (already in your account)',
  'away.loads': '{n} loads fetched',
  'away.deliveries': '{n} deal deliveries',
  'away.passed': 'You passed {rival}.',
  'away.hintCutter': 'A cutter keeps the yard working while you are away (Office)',
  'away.hintHand': 'A yard hand carries to the scale while you are away (Office)',
  'away.nothing': 'Nothing was weighed out.',

  // --- packages 3 and 4: tickets and slips (2.2) ---
  'ticket.weighInHead': '{homeYard} · No. {n}',
  'ticket.gradeToday': '{p}/kg',
  'ticket.todaysValue': 'today’s value {x}',
  'ticket.weighInLegal': 'Weighed into bays · not yet sold',
  'ticket.dropOffSlip': '{thing} · signed in · gate drop-off',
  'ticket.skipHead': '{partner} · {load}',
  'ticket.trial': 'trial load',
  'ticket.grossTareNet': 'Gross {a} · Tare {b} · Net {c}',
  'ticket.partnerLegal': 'Seller ID checked · paid by transfer',
  'ticket.collectionHead': '{homeYard} · ticket {n}',
  'ticket.gradeAmount': '{grade} {kg} {x}',
  'ticket.paid': 'Paid {x}',
  'ticket.lotSoldTo': 'Lot sold to {merchant}',
  'ticket.weighedOut': 'weighed out · paid by transfer',
  'ticket.dealDelivery': '{foundry} · {kg} cast iron · {x}',
  'ticket.more': '+ {n} more',
  'ticket.fromCar': 'from car ref. {ref}',
  'ticket.certifiedEmpty': 'certified empty',
  'ticket.date': '{date}',

  // --- package 4: lines (5.2) ---
  'line.portal': 'Every load checked. Every seller identified. Payment by transfer only.',
  'line.crewAway': 'The yard now earns while you are away.',
  'line.backfield': 'Back field · the works are being built here',
  'line.fictional': 'All prices, exchanges and shares are fictional and have no real-world value. Nothing in this game is financial advice.',
  'line.shortened': 'Building costs and times are shortened so the business grows in days, not decades; metal prices keep their true proportions.',
  'line.carName': 'End-of-life car from {partnerDemolition} · depolluted · treatment record ref. {ref}',

  // --- package 4: the clipboard and Settings (4.3) ---
  'clip.goals': 'Goals',
  'clip.places': 'Places',
  'clip.tickets': 'Tickets',
  'clip.settings': 'Settings',
  'clip.sound': 'Sound',
  'clip.music': 'Music',
  'clip.haptics': 'Haptics',
  'clip.help': 'Help',
  'clip.privacy': 'Privacy',
  'clip.version': 'Version {v}',
  'clip.restart': 'Start the yard again',
  'clip.restartConfirm': 'Start again from the first morning? Everything in this yard is lost.',
  'clip.glossary': 'Glossary',

  // --- package 8: goals (5.3, at most 30 characters, 1.3's order) ---
  'goal.takeWasher': 'Take the washer apart',
  'goal.weighIt': 'Weigh it on the scale',
  'goal.stripCable': 'Strip the cable',
  'goal.weighCopper': 'Weigh the copper',
  'goal.buySack': 'Buy the sack truck',
  'goal.takeAWasher': 'Take a washer apart',
  'goal.hireHand': 'Hire a yard hand',
  'goal.workDropoff': 'Work the drop-off',
  'goal.buySledge': 'Buy the sledge and grinder',
  'goal.breakRadiators': 'Break up the radiators',
  'goal.buyTruck': 'Buy the hook-lift truck',
  'goal.fetchTrial': 'Fetch the farm’s trial load',
  'goal.buyBench': 'Buy the motor bench',
  'goal.breakMotor': 'Break a motor on the bench',
  'goal.supplyRung2': 'Supply {t} ({r} metals)',
  'goal.hireCutter': 'Hire a cutter',
  'goal.signDeal': 'Sign the foundry deal',
  'goal.buyTrolley': 'Buy the flat trolley',
  'goal.buyStripper': 'Buy the powered stripper',
  'goal.buyCrucible': 'Buy the crucible',
  'goal.chargeCrucible': 'Charge the crucible',
  'goal.pourFirst': 'Pour your first ingot',
  'goal.hireDriver': 'Hire a driver',
  'goal.buyTorch': 'Buy the cutting torch',
  'goal.cutCar': 'Cut up the car',
  'goal.fetchDemolition': 'Fetch the demolition load',
  'goal.buyNight': 'Buy the Night watch',
  'goal.levelHand': 'Level the yard hand',
  'goal.levelStripper': 'Level the stripper',
  'goal.levelCutter': 'Level the cutter',
  'goal.supplyRung3': 'Supply {t} ({r} metals)',
  'goal.hireHand2': 'Hire a second yard hand',
  'goal.hireCutter2': 'Hire a second cutter',
  'goal.finishDeal': 'Finish the foundry deal',
  'goal.passRival': 'Pass {rival}',
  'goal.visitBackfield': 'Visit the back field',

  // --- package 8 and the tickets: lessons (5.5, one line of at most 48; no fixed multiples) ---
  'lesson.li': 'Light iron: thin steel from appliances.',
  'lesson.drum': 'The drum is stainless: it pays more sorted.',
  'lesson.mot': 'A whole motor: copper inside steel.',
  'lesson.cab': 'Cable is paid on the copper it yields.',
  'lesson.bb': 'Bare bright pays {n} times light iron today.',
  'lesson.no2': 'No.2: unalloyed copper, not clean.',
  'lesson.brs': 'Brass is copper and zinc.',
  'lesson.alw': 'Cast alloy wheels, tyres and weights off.',
  'lesson.alcast': 'Motor end caps are cast aluminium.',
  'lesson.ci': 'Cast iron breaks. Foundries remelt it.',
  'lesson.hms': 'HMS: thick steel cut to furnace size.',
  'lesson.hmsu': 'Cut to furnace size, it pays as HMS.',
  'lesson.cbody': 'Car bodies go to a shredder.',
  'lesson.bri': 'Melted, skimmed, cast: worth more than scrap.',
  'lesson.dross': 'Dross: the skimmed crust, still holding metal.',
  'lesson.ali': 'Cast aluminium remelted as alloy ingot.',
  'lesson.conv': 'From depolluted car ref. {ref}. Paid on assay.',

  // --- every package: refusals (5.4) ---
  'refusal.cash': 'Not enough cash: {x} more',
  'refusal.owned': 'Owned',
  'refusal.rung': 'Opens at {t} supplied',
  'refusal.ceiling': 'Yard capacity {c} t/h · grows at {t} supplied',
  'refusal.tool2': 'Needs a sledgehammer',
  'refusal.tool3': 'Needs a cutting torch',
  'refusal.tooHeavy': 'Too heavy to lift: {kg}',
  'refusal.topLevel': 'Top level',
  'refusal.noPlace': 'No free place on the rota',
  'refusal.filling': 'Filling · full in {t}',
  'refusal.loadCash': 'Needs {x} more for this load',
  'refusal.floor': 'The tipping floor needs room for {kg}',
  'refusal.weighFirst': 'Weigh it in first',
  'refusal.heatRunning': 'Wait for the heat to pour',
  'refusal.noTruck': 'Opens with the hook-lift truck',
  'refusal.noTorch': 'Opens with the cutting torch',
  'refusal.nothing': 'This would change nothing',
  'refusal.priceUpdated': 'Price updated: {a} → {b}',
  'refusal.confirmHeel': 'Pour the heel as a short ingot?',
  'refusal.notBuilt': 'Not available',
} as const satisfies Record<R.TextKey, string>;

// The other direction: every key of TEXT is a TextKey (an extra key fails here).
const _noExtra: Record<keyof typeof TEXT, R.TextKey> = Object.fromEntries(Object.keys(TEXT).map((k) => [k, k])) as Record<keyof typeof TEXT, R.TextKey>;
void _noExtra;

/**
 * Words written for keys that are not yet in the key list (requested in requests.md from the rules
 * lead, `[strings] TEXT_KEYS`). Nothing reads this block: when a key lands in the list, its text moves
 * into TEXT above and leaves here. `check.ts --all` checks it like TEXT (fit, voice, names).
 * Holes are the arguments the caller passes; the comment says which formatter fills each.
 */
export const TEXT_PENDING = {
  // goals (5.3; `goal.widen` and `goal.widenLevel` replace goal.levelHand, goal.levelStripper, goal.levelCutter)
  'goal.widen': 'Buy next: {item}', // item: { text: item.* | role.* | item.skip }
  'goal.widenLevel': 'Level up: {item}', // item: { text: role.* | item.* }
  'goal.buyAlu': 'Buy the aluminium recipe',
  // the advice line (2.10; Advice.line): the purchase that widens the yard now
  'advice.buy': 'Widens the yard now: {item} · {x}', // x: money
  'advice.level': 'Widens the yard now: {item} {n} · {x}', // n: the next level
  // tool rack, rota and process board rows (4.3; effect lines ≤ 38)
  'item.skip': 'Another skip',
  'effect.frame': 'A hand load on your back',
  'effect.spanners': 'Takes apart washers, bikes and cable',
  'effect.handStripper': 'Strips cable while you stand at it',
  'effect.brass': 'Melts brass solids into brass ingots',
  'card.levelN': 'Level {n}',
  'card.crewRow': '{name} · level {n}', // name: { name: crew.<n> }
  'card.on': 'On',
  'card.off': 'Off',
  // machines (4.3)
  'card.hopper': 'Hopper {a} / {b}', // a, b: mass
  'card.tray': 'Tray {a} / {b}',
  'card.heating': 'Heating',
  'card.cooling': 'Cooling',
  'card.handOnly': 'Turns only while you stand at it',
  'card.firstPour': 'Ready to pour · it waits for you',
  // partners and skips (2.7, 4.3)
  'card.levelFromTo': 'Level {n} → {m}',
  'card.skipsInRotation': 'Skips in rotation: {n}',
  'card.skipTrial': '{partner} · trial load',
  'card.skipReady': 'Full · ready to hook',
  'card.skipOnTruck': 'On the truck',
  'card.partnerLine': '{line}', // line: { text } from text.json partners.<id>.line once it is in the content
  // the supply deal (2.9, 4.3)
  'card.dealNoCharge': 'A short day costs nothing. Trust falls a little.',
  'card.dealDone': 'All deliveries made',
  // price board and bays (4.4)
  'board.stock': 'In the bay {kg}',
  'board.today': 'Today {p}',
  'board.usualPrice': 'usual {p}',
  'chip.aside': 'Set aside {kg} · {x}',
  // the industry table and the rung sign (2.11)
  'table.next': 'Next: {rival} · {t} to go', // rival: { name: rival.<n>.chip }
  'table.locked': 'Opens at {t} supplied · {r} metals',
  'opens.rung2': 'The cutting torch, a radiation portal and a supply deal',
  'opens.rung3': 'Yard capacity {c} t/h',
  // refusals (5.4): the driver's earmark
  'refusal.earmark': '{x} is kept for the load on its way',
  // Settings and Help (4.3)
  'clip.privacyLine': 'Your yard is saved on this phone. There is no account.',
  'clip.restartYes': 'Start again',
  'clip.restartNo': 'Keep my yard',
  'help.lessons': 'What the tickets taught',
  'help.glossary': 'Words of the trade',
  'help.about': 'About this game',
} as const;

// ================================================================================================ names

/**
 * The register ids of yard-stage1.md 5.1 and how each is found in scripts/content/yard/names.json
 * (the names desk's; read only, never copied) when the register has no `byId` table: a live entry
 * (verdict neither "changed" nor "rejected") by its `kind`, and where several share a kind, by a trade
 * word in the name or by tonnes. Since version 3 the register carries ids and `byId`, which win.
 */
export const NAME_SELECTORS: Record<string, { kind: string; prefix?: boolean; word?: string; contactOf?: string }> = {
  title: { kind: 'title (working)' },
  currency: { kind: 'currency', prefix: true },
  homeYard: { kind: 'the home yard' },
  homeLane: { kind: 'home lane' },
  homeTown: { kind: 'home town' },
  homeDistrict: { kind: 'home district' },
  partnerFarm: { kind: 'local partner (supplier)', word: 'Farm' },
  partnerDemolition: { kind: 'local partner (supplier)', word: 'Demolition' },
  farmContact: { kind: 'partner contact', prefix: true, contactOf: 'partnerFarm' },
  demolitionContact: { kind: 'partner contact', prefix: true, contactOf: 'partnerDemolition' },
  foundry: { kind: "local partner (stage 1's supply deal)" },
  // merchant: the register has no stage-1 merchant yet (notes/contract.md).
};
/** Rivals: the live entries whose kind starts with this, in the order of their tonnes (rival.1 smallest). */
export const RIVAL_KIND = 'rival firm (simulated)';

interface RegisterEntry {
  name: string;
  kind: string;
  verdict?: string;
  id?: string;
  current?: boolean;
  chip?: string;
  /** A short form for chips (the merchant's `short`), landing as `<id>.short`. */
  short?: string;
}

const live = (e: RegisterEntry) => !/^(changed|rejected)/.test(e.verdict ?? '');

/** Tonnes in a rival's kind ("rival firm (simulated), 1.25 Mt"), for their order. */
function tonnesOf(kind: string): number {
  const m = /,\s*([\d.]+)\s*(t|kt|Mt)\b/.exec(kind);
  if (!m) return Infinity;
  return Number(m[1]) * (m[2] === 'Mt' ? 1e6 : m[2] === 'kt' ? 1e3 : 1);
}

/**
 * Names by register id (the build script and tests call it; the app reads `salvage.names`). The
 * register's own `byId` table (version 3 on) is the source; each current entry's `chip` (≤ 14
 * characters) lands as `<id>.chip`, a `short` as `<id>.short`. A register without ids is read by kind and name (NAME_SELECTORS).
 */
export function namesFromRegister(register: { names: RegisterEntry[]; byId?: Record<string, string> }): Record<string, string> {
  if (register.byId && Object.keys(register.byId).length) {
    const out: Record<string, string> = { ...register.byId };
    for (const e of register.names) {
      if (e.id && e.current && e.chip) out[`${e.id}.chip`] = e.chip;
      if (e.id && e.current && e.short) out[`${e.id}.short`] = e.short;
    }
    return out;
  }
  const entries = register.names.filter(live);
  const out: Record<string, string> = {};
  for (const [id, sel] of Object.entries(NAME_SELECTORS)) {
    if (sel.contactOf) continue;
    const hit = entries.find((e) => (sel.prefix ? e.kind.startsWith(sel.kind) : e.kind === sel.kind) && (!sel.word || e.name.includes(sel.word)));
    if (hit) out[id] = hit.name;
  }
  for (const [id, sel] of Object.entries(NAME_SELECTORS)) {
    if (!sel.contactOf || !out[sel.contactOf]) continue;
    const hit = entries.find((e) => e.kind === `${sel.kind} (${out[sel.contactOf!]})`);
    if (hit) out[id] = hit.name;
  }
  entries
    .filter((e) => e.kind.startsWith(RIVAL_KIND))
    .sort((a, b) => tonnesOf(a.kind) - tonnesOf(b.kind))
    .forEach((e, i) => (out[`rival.${i + 1}`] = e.name));
  return out;
}

// ================================================================================================ say

type Content = Pick<SalvageContent, 'names' | 'grades' | 'objects'>;

/** One argument as text (numbers only through the rules' formatters). */
function argText(a: R.TxtArg, c: Content): string {
  if ('money' in a) return R.fmtMoney(a.money);
  if ('price' in a) return R.fmtPrice(a.price);
  if ('mass_g' in a) return R.fmtMass(a.mass_g, a.step, a.ferrous);
  if ('n' in a) return String(a.n);
  if ('rank' in a) return R.fmtRank(a.rank);
  if ('secs' in a) return R.fmtDuration(a.secs);
  if ('pct' in a) return R.fmtPct(a.pct);
  if ('name' in a) return c.names[a.name] ?? a.name;
  if ('grade' in a) return c.grades[a.grade]?.name ?? a.grade;
  if ('thing' in a) return c.objects[a.thing]?.name ?? a.thing;
  return say({ key: a.text }, c);
}

/** Fills `{hole}`s: a Txt argument first, else an invented name by register id, else the hole stays. */
export function fill(text: string, args: R.TxtArgs | undefined, c: Content): string {
  return text.replace(/\{([A-Za-z0-9_.]+)\}/g, (whole, h: string) => {
    const a = args?.[h];
    if (a) return argText(a, c);
    const n = c.names[h];
    return n ?? whole;
  });
}

/** THE function that turns a printed line into words. */
export function say(t: R.Txt, c: Content): string {
  return fill(TEXT[t.key], t.args, c);
}

// ================================================================================================ the ground work's

/** Labels the placeholder atlas draws on its boxes (src/ui/salvage/world/atlas.ts, the art director's; they go with the placeholders). */
export const WORLD_LABELS = {
  wreck: 'WRECK',
  machine: 'MACHINE',
  truck: 'TRUCK',
} as const;

/** The ground work's screen words (OverlayHost, Loading, SalvageShell): kept as they were until their owners move to TEXT. */
export const S = {
  rotateTitle: TEXT.turnSideways,
  rotateBody: TEXT.turnSidewaysBody,
  stepOut: TEXT.stepOut,
  open: TEXT.open,
  menu: TEXT.menu,
  panelTitle: 'PLACEHOLDER panel',
  panelBody: 'The side panel of the mode’s own overlays. Android back or the scrim closes it.',
  openCard: 'Open the card',
  close: TEXT.close,
  cardTitle: 'PLACEHOLDER card',
  cardBody: 'The centred card of the mode’s own overlays, on top of the panel.',
  ok: TEXT.ok,
  loading: 'Loading the yard…',
  hintStick: 'Thumb down on the left to walk',
} as const;
