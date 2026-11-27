/**
 * Every word the salvage screens show (AGENTS.md: one file per mode; the fingerprint and the voice
 * check read it). Owner: package 9, strings and the text check (yard-stage1.md section 9); a new key is
 * ONE request to it (the key list is src/engine/salvage/textKeys.ts `TEXT_KEYS`, also the strings
 * package's, and `TEXT` below must define exactly those keys: the typecheck holds both sides).
 *
 * Words follow yard-stage1.md section 5 (the voice of 5.6: short plain sentences in the trade's words; no
 * puns, no exclamation marks, no promises). Holes:
 * - `{arg}` filled from a Txt's typed arguments, numbers ONLY through the rules' formatters
 *   (src/engine/salvage.ts fmtMoney, fmtPrice, fmtMass, fmtDuration, fmtRank, fmtPct);
 * - `{id}` with a register id (homeYard, merchant, foundry, partnerFarm, rival.1, ...) filled from the
 *   game's `salvage.names` (written by the build script from scripts/content/yard/names.json, read by
 *   kind and name through `NAME_SELECTORS`; never a name written here, D13, S21);
 * - `{grade|short}`: a `{ grade }` argument printed as the grade's short name (tickets and bay chips;
 *   text.json grades.<id>.short, ≤ 15 characters), its name where the content has no short one;
 * - `{id|short}` (and a `{ name }` argument with `|short`): the register's short form `<id>.short`, else the name;
 * - `{id|cap}`: the name (or argument) with its first letter in capitals ("Scrip packs": the currency starts a sentence).
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
  // P1 (owner2-fix-hud): what happened and where the load goes (it showed while the chip still had room).
  loadFull: 'No room: weigh your load at the scale',
  open: 'Open',
  stepOut: 'Step out',
  getIn: 'Get in', // hud: the one button beside the free truck (owner2-hud, ruling 18.4); the disc box as stepOut
  carryDriving: '{kg}', // hud: the carry chip while driving, after the skip pictogram (the lead's ruling 2, 15:55); kg = { mass_g, step: 'bridge' }
  goalProgress: '{a} / {b}',
  turnSideways: 'Turn your phone sideways',
  turnSidewaysBody: 'This game is played in landscape.',
  menu: 'Menu',
  close: 'Close',
  ok: 'OK',
  cashDebit: '−{x} · {partner}', // P12: under the cash counter at a hook; x: money (positive), partner: { name }
  passedToast: 'You passed {rival} · {rank} of {n}', // P16: rival { name: rival.<n>.chip }, rank { rank }, n { n }

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
  'chip.bay': '{grade|short} {kg} · today {x}',
  'chip.bayHeld': '{grade|short} {kg} · held · {x}', // rules-book L10/W4: a held bay's first line, x = what Sell pays now
  'chip.bayKg': '{grade|short} {kg}', // rules-book: a bay with nothing free to sell (all reserved)
  'chip.bayKgHeld': '{grade|short} {kg} · held',
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
  'chip.bridgeLimit': 'Axle limit 10 t', // stage 2 (T9, LEAD L13): the bridge's one number; a three-axle hook-lift crosses
  'chip.needsTorchGate': 'Needs a cutting torch',
  'chip.count': '{what} · {n}',

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
  'card.crewWhy.nothing': 'Nothing to carry', // owner1 H6 (at most 22 characters)
  'card.crewWhy.uncut': 'Waiting for cut pieces',
  'card.crewWhy.yours': 'Leaving those to you',
  'card.crewWhy.tool2': 'Needs the hammer',
  'card.crewWhy.tool3': 'Needs the torch',
  'card.levelOnBoard': 'Level on the process board',
  'card.inOut': '{in} → {out}',
  'card.inOut2': '{in} → {a}, {b}', // rules-book W7: every output, largest first
  'card.inOut3': '{in} → {a}, {b}, {c}',
  'card.charge': '{a} / {b}',
  'card.heel': 'Heel {kg}',
  'card.recipe': '{recipe}',
  'card.siteLicence': 'Site licence · metal dealer',
  'card.drivesRate': 'Fetches a load in {t}',
  'card.opensAt': 'Opens at {t} supplied',
  'card.nightWatch': 'Runs while away: {a} h → {b} h', // a, b: { n } hours (cards.ts passes n); W20: no 'cap'
  'card.dealTerms': '{grade}: {kg} a day for {n} days at {p}/kg, locked at signing',
  'card.dealDaysLeft': '{n} days left',
  'card.dealReserve': 'Reserved {a} / {b}',
  'card.dealTrust': 'Trust {n} / 100',
  'card.dealLast': 'Last delivery {kg}',
  'card.skipState': '{partner} · full',
  'card.skipLine': '{thing} × {n} · {kg}',
  'card.skipFree': 'Free trial load', // owner1-fix finding 10: SkipLabel.free
  'card.skipNet': 'Net {kg}',
  'card.skipPrice': '{x}',
  'card.businessCard': '{contact} · {partner}',
  'card.converterPaid': 'Paid on assay: platinum {pt}, palladium {pd}, rhodium {rh}, less fees',
  'card.notBottleneck': 'Not the bottleneck now', // E19: the state line; no absolute rate on a row (W5)
  'card.keptForLoad': 'Kept for the next load: {x}',
  'card.empty': '',
  // W5: no absolute rates on a row in this stage
  'card.carriesTrip': 'Carries {kg} a trip', // kg: { mass_g }
  'card.cutsBest': 'Cuts with the yard’s best tool',
  'card.levelFaster': '+{pct} faster', // pct: { pct } (0.25 → "25 %")
  'card.skipMore': 'Adds a skip at {partner}', // W5; partner: { name } (the ruling's 'One more skip filling at' does not fit 285 pt at 1.3)
  'card.runsItself': 'Runs by itself',
  'card.levelOpensAt': 'Level up opens at {t} supplied', // P18; t: { tonnes_g }
  // W18: buttons name the action, rows name the state
  'card.use': 'Use',
  'card.start': 'Start',
  'card.stop': 'Stop',

  // --- package 4: items, roles and effect lines (≤ 38) ---
  'item.sack': 'Sack truck',
  'item.trolley': 'Flat trolley',
  'item.frame': 'Carry frame',
  'item.spanners': 'Spanners and bolt cutters',
  'item.sledge': 'Sledgehammer and grinder',
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
  'effect.torch': 'Cuts thick steel; frees converters', // W9 (the ruling's 41 characters do not fit the 38 of 4.6)
  'effect.truck': 'Fetches partners’ loads',
  'effect.stripper': 'Strips heavy cable to copper',
  'effect.bench': 'Takes motors apart: copper, steel, alu',
  'effect.crucible': 'Melts brass solids into ingots',
  'effect.alu': 'Melts cast aluminium into ingots',
  'effect.night': 'Earns for longer while you are away',
  'effect.hand': 'Carries to the scale and the hoppers',
  'effect.cutter': 'Cuts what waits at the drop-off',
  'effect.driver': 'Fetches full loads with the truck',

  // --- package 4: the price board (4.4) ---
  'board.head': 'Market day {date} (UTC) · next prices in {t}',
  'board.usual': 'usual',
  'board.lowDay': 'low day',
  'board.highDay': 'high day',
  'board.firstHint': '{grade}: a low day. Holding is free.',
  'board.heldUntil': 'Held until a high day, two days at most',
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
  'plate.levelPrice': 'Next {x}',
  'plate.locked': '{why}',

  // --- package 4: the industry table and the rung sign (2.11) ---
  'table.headline': 'The largest full metal recycling and resource supplier',
  'table.simulated': 'simulated',
  'table.rivalsSimulated': 'Rival firms (simulated)',
  'table.rung': '{t} supplied · {r} materials',
  'table.rungGate': 'Opens at {t} supplied',
  'table.range': '{n} materials',
  'table.you': '{homeYard}',
  'table.rungSign': '{homeYard} · {t} supplied',
  'table.rungOpened': '{homeYard} · Opened at {t}', // owner1-fix finding 14: the rung sign's own line (t: the rung's tonnage)
  'table.rungOpens': '{what}',

  // --- package 4: the away card (4.4) ---
  'away.head': 'Away {t} · the yard ran {c}', // R6/W20: t: { secs } the absence, c: { secs } what the yard ran
  'away.line': '{grade|short} {kg} · {x}',
  'away.supplied': '{t} supplied · {x} (already in your account)',
  'away.loads': '{n} loads fetched',
  'away.deliveries': '{n} deliveries to {foundry}', // one line per delivery: ticket.dealDelivery
  'away.passed': 'You passed {rival}.',
  'away.passedN': 'You passed {n} firms.', // desk2 (4c): at a large font scale, two or more rivals on one line
  'away.hintCutter': 'A cutter keeps the yard working while you are away (Office)',
  'away.hintHand': 'A yard hand carries to the scale while you are away (Office)',
  'away.nothing': 'Nothing was weighed out.',
  // P3: what was applied, in this order
  'away.sales': 'Sales {x}',
  'away.bought': '{n} loads bought · −{x}', // x: money (positive)
  'away.boughtFrom': '{partner}: {n} loads bought · −{x}',
  'away.net': 'Net +{x} (already in your account)',
  'away.netLoss': 'Net −{x} (taken from your account)', // x positive, when spent > sales
  'away.unsold': 'In the bays, not yet sold: {x}', // join3: x money, the stock the time away left unsold (today's price)
  'away.heldSold': 'Sold from hold to keep the yard going: {grade|short}', // engine2-income (E40): grade: { grade }, one line a bay that left Hold while away
  'away.next': 'Next: {goal}', // goal: { text: goal.* }
  'away.longerRung': 'From the next rung it runs up to {c}', // c: { secs }
  'away.longerNight': 'With the night watch it runs up to {c}', // c: { secs }

  // --- packages 3 and 4: tickets and slips (2.2) ---
  'ticket.weighInHead': '{homeYard} · No. {n}',
  'ticket.gradeToday': '{p}/kg',
  'ticket.todaysValue': 'today’s value {x}',
  'ticket.weighInLegal': 'Weighed into bays · not yet sold',
  'ticket.dropOffSlip': '{thing} · signed in · gate drop-off',
  'ticket.dropOffHeld': '{n} things signed in at the gate', // owner1-fix finding 12: the slips held while the boss was beyond the gate, on his return
  'ticket.skipHead': '{partner} · {load}',
  'ticket.trial': 'trial load',
  'ticket.grossTareNet': 'Gross {a} · Tare {b} · Net {c}',
  'ticket.partnerLegal': 'Seller ID checked · paid by transfer',
  'ticket.collectionHead': '{homeYard} · ticket {n}',
  'ticket.gradeAmount': '{grade|short} {kg} {x}', // the clipboard's ticket history (overlays-b)
  'ticket.paid': 'Paid {x}', // money IN only (collections, deal deliveries)
  'ticket.boughtFor': 'Bought for {x}', // P12/S3: the skip weigh-in, money OUT
  'ticket.freeTrial': "Free: the farm's trial", // owner1-fix finding 10: skipWeighIn ticket.free (instead of Bought for)
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
  'line.fictional': 'Prices, exchanges, loans, partnerships and listings in this game are fictional and use {currency} only. Nothing can be paid out, and nothing here is financial advice.', // stage 2 (RULING2 9.14, 5.3): the one sentence Help carries
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
  'goal.workDropoff': 'Clear the public drop-off',
  'goal.buySledge': 'Buy the hammer and grinder',
  'goal.breakRadiators': 'Break up the radiators',
  'goal.buyTruck': 'Buy the hook-lift truck',
  'goal.fetchTrial': 'Fetch the farm’s trial load',
  'goal.tipTrial': 'Tip it on the floor', // P14
  'goal.step.truck': 'Get in the truck', // owner1 T2
  'goal.step.drive': 'Drive out to the load',
  'goal.step.hook': 'Keep still: hooking',
  'goal.step.weigh': 'Drive onto the weighbridge',
  'goal.step.tip': 'Tip it on the floor',
  'goal.step.pullUp': 'Pull up to the skip', // owner1-fix finding 3
  'goal.buyBench': 'Buy the motor bench',
  'goal.breakMotor': 'Break a motor on the bench',
  'goal.supplyRung2': 'Supply {t} ({r} materials)',
  'goal.hireCutter': 'Hire a cutter',
  'goal.signDeal': 'Sign the foundry deal',
  'goal.buyTrolley': 'Buy the flat trolley',
  'goal.buyStripper': 'Buy the powered stripper',
  'goal.buyCrucible': 'Buy the crucible',
  'goal.chargeCrucible': 'Charge the crucible',
  'goal.pourFirst': 'Pour your first ingot',
  'goal.hireDriver': 'Hire a driver',
  'goal.buyTorch': 'Buy the cutting torch',
  'goal.cutCar': 'Strip the car for the shredder',
  'goal.fetchDemolition': 'Fetch the demolition load',
  'goal.buyNight': 'Buy the night watch',
  'goal.supplyRung3': 'Supply {t} ({r} materials)',
  'goal.hireHand2': 'Hire a second yard hand',
  'goal.hireCutter2': 'Hire a second cutter',
  'goal.finishDeal': 'Finish the foundry deal',
  'goal.passRival': 'Pass {rival}',
  'goal.visitBackfield': 'Visit the back field',

  // --- package 8 and the tickets: lessons (5.5, one line of at most 48; no fixed multiples) ---
  'lesson.li': 'Light iron: thin steel from appliances.',
  'lesson.drum': 'Stainless drum: sold here with light iron.',
  'lesson.mot': 'A whole motor: copper inside steel.',
  'lesson.cab': 'Cable is paid on the copper it yields.',
  'lesson.bb': 'Bare bright pays {n} times light iron today.',
  'lesson.no2': 'No.2 copper: coated, tinned or soldered.',
  'lesson.brs': 'Brass is copper and zinc.',
  'lesson.alw': 'Clean alloy wheels: tyres and weights off.',
  'lesson.alcast': 'Motor end caps are cast aluminium.',
  'lesson.ci': 'Cast iron breaks. Foundries remelt it.',
  'lesson.hms': 'HMS: thick steel cut to furnace size.',
  'lesson.hmsu': 'Uncut steel pays less. Cut to size, it is HMS.',
  'lesson.cbody': 'Car bodies go to a shredder.',
  'lesson.bri': 'An ingot pays more than the scrap it came from.',
  'lesson.dross': 'Dross: the skimmed crust, still holding metal.',
  'lesson.ali': 'The crucible casts cast aluminium into ingot.',
  'lesson.conv': 'From depolluted car ref. {ref}. Paid on assay.',

  // --- every package: refusals (5.4) ---
  'refusal.cash': 'Not enough cash: {x} more',
  'refusal.owned': 'Owned',
  'refusal.rung': 'Opens at {t} supplied',
  'refusal.ceiling': 'Capacity {c} t/h · grows at {t}',
  'refusal.tool2': 'Needs the hammer and grinder',
  'refusal.tool3': 'Needs a cutting torch',
  'refusal.tooHeavy': 'Too heavy to lift: {kg}',
  'refusal.topLevel': 'Top level',
  'refusal.noPlace': 'No free place on the rota',
  'refusal.filling': 'Filling · full in {t}',
  'refusal.loadCash': 'Needs {x} more for this load',
  'refusal.floor': 'Tipping floor needs {kg} free',
  'refusal.weighFirst': 'Weigh it in first',
  'refusal.toWeighbridge': 'Drive onto the weighbridge', // owner1 T2: stepping out with a load not weighed
  'refusal.toFloor': 'Tip it on the floor', // owner1 T2: stepping out with a weighed load not tipped
  'refusal.heatRunning': 'Wait for the heat to pour',
  'refusal.noTruck': 'Opens with the hook-lift truck',
  'refusal.noTorch': 'Opens with the cutting torch',
  'refusal.nothing': 'This would change nothing',
  'refusal.priceUpdated': 'Price updated: {a} → {b}',
  'refusal.confirmHeel': 'Pour the heel as a short ingot?',
  'refusal.notBuilt': 'Not available',

  // --- added by the contract's fix pass (25 November): keys moved from TEXT_PENDING and the attacks' new keys; strings owns them from here ---
  rankChipPassed: '{rank} of {n} · passed {rival}',
  'place.board': 'Price board',
  'place.stillages': 'Stillages',
  'chip.aside': 'Set aside {kg} · {x}',
  'card.levelN': 'Level {n}',
  'card.levelFromTo': 'Level {n} → {m}',
  'card.onItsWay': 'On its way',
  'card.on': 'On',
  'card.off': 'Off',
  'card.firstPour': 'Ready to pour · it waits for you',
  'card.heating': 'Heating',
  'card.cooling': 'Cooling',
  'card.handOnly': 'Turns while you stand at it',
  'card.hopper': 'Hopper · {grade|short} × {n} · {kg}', // overlays-a: the next input and what waits
  'card.tray': 'Tray · {grade|short} {kg}',
  'card.crewRow': '{name} · level {n}', // name: { name: crew.<n> }
  'card.dealNoCharge': 'A short day costs nothing. Trust falls a little.',
  'card.dealDone': 'All deliveries made',
  'card.skipsInRotation': 'Skips in rotation: {n}',
  'card.skipTrial': '{partner} · trial load',
  'card.skipFilling': '{partner} · filling', // a skip in rotation that is not full yet (its state line is refusal.filling)
  'card.skipReady': 'Full · ready to hook',
  'card.skipOnTruck': 'On the truck',
  'card.anotherSkip': 'Another skip · {x}', // overlays-a: the partner wall's row (5.2)
  'card.partnerLine': '{line}', // line: { text } from text.json partners.<id>.line once it is in the content
  'item.skip': 'Another skip',
  'effect.frame': 'A hand load on your back',
  'effect.spanners': 'Takes apart washers and bikes',
  'effect.handStripper': 'Strips cable while you stand at it',
  'effect.brass': 'Melts brass solids into brass ingots',
  'board.stock': 'In the bay {kg}',
  'board.today': 'Today {p}',
  'board.usualPrice': 'usual {p}',
  'plate.needsCrucible': 'Needs the crucible',
  'plate.atRung': 'At {t} supplied',
  'table.next': 'Next: {rival} · {t} to go', // rival: { name: rival.<n>.chip }
  'table.locked': 'Opens at {t} supplied · {r} materials',
  'table.nextRung': 'Next: opens at {t} supplied · {r} materials', // W13a
  'opens.rung2': 'The cutting torch, a radiation portal and a supply deal',
  'opens.rung3': 'Yard capacity {c} t/h',
  'clip.privacyLine': 'Your yard is saved on this phone. There is no account.',
  'clip.restartYes': 'Start again',
  'clip.restartNo': 'Keep my yard',
  // overlays-b, fix pass (first wordings; the words fixer owns them)
  'board.empty': 'Grades appear here once weighed in',
  'table.mine': 'You: {t} supplied · {r} materials',
  'table.lockedBare': '{t} supplied',
  'help.lessons': 'What the tickets taught',
  'help.glossary': 'Words of the trade',
  'help.about': 'About this game',
  'goal.buyAlu': 'Buy the aluminium recipe',
  'goal.widen': 'Buy next: {item}', // item: { text: item.* | role.* | item.skip }
  'goal.widenLevel': 'Level up: {item}', // item: { text: role.* | item.* }
  'advice.buy': 'Next: {item} · {x}', // x: money
  'advice.level': '{item} level {n} · {x}', // n: the next level
  'refusal.earmark': '{x} is kept for the load on its way',
  'refusal.notOwned': 'Buy it first',
  'refusal.stopFirst': 'Stop the truck first',
  // E25's gate by another item owned (moved from TEXT_PENDING by rules-sim with REFUSAL_KEYS' needsItem, 17:10)
  'refusal.needsItem': 'Opens with: {item}', // item: { text: item.* }

  // ============================================================================================ STAGE 2
  // strings2 (26 November; yard-stage2.md 5.3, 4, 2.14 to 2.16). Holes as above; the stage's own:
  // {plate}: { text: 'title.works.<id>' } (a plate's name); {bank}, {reclaimer}, {partner.garage}, ...:
  // register ids (names.json byId), `|short` the register's short form where it has one; {currency|cap}:
  // the currency's name with a capital (a sentence starts with it). Money is { money } unless a ticket's
  // { exact }; a count { n }; a duration { secs }.

  // --- places (5.3; ≤ 18): the works layer's plates, plots and pads (content map.works.places.<id>.label) ---
  'place.shredder': 'Shredder',
  'place.rotaryHall': 'Rotary hall',
  'place.inductionHall': 'Induction hall',
  'place.leadLine': 'Lead line',
  'place.yardSale': 'Yard sale', // the owner's word (RULING2 9.7); never "the rack" (the tool rack's word)
  'place.oversizePad': 'Oversize pad',
  'place.pickingTable': 'Picking table', // T11: the crate's player word
  'place.carPad': 'Car pad',
  'place.worksBunkers': 'Works bunkers',
  'place.worksStillages': 'Works stillages',
  'place.batteryBox': 'Battery box',
  'place.forklift': 'Forklift',
  'place.baler': 'Baler',
  'place.crane': 'Magnet crane',
  'place.depollution': 'Depollution bay',
  'place.granulator': 'Granulator',
  'place.shear': 'Shear',
  'place.eddy': 'Eddy current',
  'place.sorter': 'Sensor sorter',
  'place.smelter': 'Lead smelter',
  'place.copperHall': 'Copper hall', // s2f-copper (RULING2 27.5, 28.7 c)

  // --- chips (4.3, 4.6, 4.5; world chips, 11 pt) ---
  'chip.works.bankTag': '{bank|short}', // the financed plate's tag beside its ring (the ring prints no amount, P7)
  'chip.commissioned': 'Commissioned · {plate}', // T25: the trade's word stays on the chip; 2.6 s
  'chip.weighedAtWorks': 'Weighed at the works · {grade|short}', // 2.8.1: a back-field plate's belt weigher, only in sight
  'chip.cod': 'Certificate of destruction issued', // 4.3 (33): a car's depollution done
  'chip.lotSoldBank': 'Lot sold · {x} · bank {y}', // 4.5: a crew sale while an agreement is open; x gross, y the bank's
  'chip.rackSold': 'Sold at the gate · {x}', // 4.6: at the card reader; x { money } (whole § from §100)
  'chip.van': '{reclaimer} · {x}', // 4.6: the van's collection
  'chip.forPlate': '{plate} · {a} / {b}', // 2.8.1: a bay's reserve for a station, up to its inbuf (the first yard's chip.forCrucible's twin)
  'chip.leadArea': 'Lead area · masks on', // 3.3, T6: the sign at the breaker's door
  'chip.visitorsKeep': 'Visitors: keep to this area', // 3.3, T7: the public bay's rail
  'chip.payHere': 'Pay here', // 3.3, T7: the card reader on the canopy's east post

  // --- titles (4.2 to 4.9): the thirteen plates' names (≤ 18; also the process board's plates and {plate}) ---
  'title.works.crane': 'Magnet crane',
  'title.works.shear': 'Shear',
  'title.works.baler': 'Baler',
  'title.works.analyser': 'Analyser',
  'title.works.depollution': 'Depollution bay',
  'title.works.granulator': 'Granulator',
  'title.works.shredder': 'Shredder',
  'title.works.eddy': 'Eddy current',
  'title.works.sorter': 'Sensor sorter',
  'title.works.rotary': 'Rotary furnace',
  'title.works.induction': 'Induction furnace',
  'title.works.breaker': 'Battery breaker',
  'title.works.smelter': 'Lead smelter',
  'title.finance': 'Bank loan · {plate}', // 4.5: the owner's words
  'title.letter': '{bank} · loans for machines', // 4.5, T16: "plant finance" stays in the rules and Help's body
  'title.agreements': 'Agreements', // RULING2 9.7: the office's fourth tab
  'title.shop': 'Shop',
  'title.yardSale': 'Yard sale',
  'title.lot': 'Oversize piece', // T11: a delivered lot in player text
  'title.crate': 'Picking table',
  'title.packSheet': '{currency|cap} pack',
  'title.ageQuestion': 'What year were you born?', // 4.8: no default; kept as a band only
  'title.packCode': '{currency|cap} packs',
  'title.awayBonus': 'For your time away', // 4.9
  'title.works.copper': 'Copper furnace', // s2f-copper: the copper refining hall's tilting furnace (RULING2 27.5, 28.7 c)

  // --- tabs (4.4 the process board's pages; 4.11 the price board's families, content BOARD_TABS) ---
  'tab.first': 'First yard',
  'tab.yard': 'Yard and shredder',
  'tab.melt': 'Melt and lead',
  'tab.ferrous': 'Ferrous',
  'tab.nonFerrous': 'Non-ferrous',
  'tab.works': 'Products', // 4.11 "Works products" (bales, shred, ingots, granules) does not fit a fourth of the row at 1.3
  'tab.intermediates': 'Intermediates',
  'board.tabEmpty': 'Nothing in stock', // 4.11: a tab with no row

  // --- a hall's recipes (2.8) ---
  'recipe.alu': 'Aluminium',
  'recipe.brass': 'Brass',
  'recipe.bronze': 'Bronze',
  'recipe.lead': 'Lead',
  // s2f-copper: the copper refining hall's three recipes (No.2 copper; copper cylinders whole; thin cable chopped to granules)
  'recipe.copper': 'No.2 copper',
  'recipe.cylinders': 'Cylinders',
  'recipe.cable': 'Cable',

  // --- the works plate in the world (4.3; every line ≤ 31, `worksPlateLine`) ---
  'plate.works.buyable': '{plate} · {x}', // "Baler · §9,000"
  'plate.works.arriving': 'On its way',
  'plate.works.commission': 'Stand here to start · {n} s', // n: works.commission_s
  'plate.works.selfStart': 'Starts by itself in {t}', // t: { secs }
  'plate.works.hopperFull': 'Hopper full',
  'plate.works.trayFull': 'Tray full',
  'plate.works.waiting': 'Waiting for {grade|short}',
  'plate.works.ready': 'Ready to pour · waits for you', // 4.3's "Ready to pour · it waits for you" is 32 characters, the box 31
  'plate.opens': 'Opens at {t}', // T19: "Opens at 1,000 t" (t: { tonnes_g }), the world plate and the process board alike
  'plate.filter': 'Filter', // 4.4: a hall's filter, a sub-plate riveted to its hall's plate
  // --- the tag (4.6) ---
  'plate.reuse.tag': 'Reusable',
  'plate.reuse.tagChecked': 'Reusable · Checked', // T15: a bicycle from a named partner's load
  'plate.reuse.prices': 'Gate {q} · as scrap {v}', // q, v: { money }; 4.6's "§{q} at the gate · §{v} as scrap" is 36 at §9,999, the box 31
  'plate.reuse.heavy': 'Too heavy to lift: {kg}',
  'plate.reuse.full': 'Yard sale full · cut as scrap',
  'plate.reuse.hands': 'Yard hands will set it out',
  // --- an oversize piece and the picking table (4.7) ---
  'plate.lot': '{thing}', // 4.7's one line "{partner|short} · {thing}" is 39 at its widest (no short form of the bridge partners yet), the box 31: three lines
  'plate.lotFrom': 'From {partner|short}', // partner: { name: <register id> } (T18: the plate names its sender)
  'plate.lotValue': '{kg} · cut: about {x}', // T18: the only "about"; 4.7's "... once cut" is 33 at its widest
  'plate.crate': 'Picking table · {n} things',
  'plate.crateStand': 'Stand here · {n} s a thing', // P11: n crate.sort_s

  // --- the works card (4.3) ---
  'card.works.inOut': '{in} → {out}', // "Light iron → Baled light iron"
  'card.works.inOut2': '{in} → {a}, {b}', // every output, largest first (as card.inOut2)
  'card.works.gain': '+{pct} on {grade}', // what a kilogram of input gains at p̄: "+24 % on Light iron"; never tonnes an hour
  'card.works.installed': 'Installed · stand here {n} s',
  'card.works.selfStart': 'Starts by itself in {t}',
  'card.works.levelGain': '+{pct} on this machine', // "Level 3 → 4" is card.levelFromTo
  'card.works.takesFrom': 'Takes from: {a}', // a: { grade } (or { thing }); a bay-fed plate's inputs
  'card.works.takesFrom2': 'Takes from: {a} · {b}',
  'card.works.takesFrom3': 'Takes from: {a} · {b} · {c}',
  'card.works.toBays': 'Out to the works bunkers', // 2.8.1: a back-field plate has no tray and no ticket
  'card.works.depollution': 'Fluids and gas out · airbags made safe', // T13 (38); nothing is shown of how
  'card.works.waste': 'Waste to a licensed waste carrier', // T13, P18
  'card.works.car': 'End-of-life car · ref. {ref}',
  'card.works.carIn': 'Depolluted in {t}',
  'card.works.noCar': 'No car on the apron',
  'card.works.filter': 'Bought with its filter', // 2.6.5: one price, one plot; no furnace runs without one (L3)
  'card.works.loan': 'Bank loan', // the owner's words (RULING2 9.7)
  'card.works.saveUp': 'Save up (about {t})', // t: { secs }; only the time is "about"
  'card.works.loanShort': 'You pay now {d} · {x} more', // d, x: { money }
  'card.works.bankLeft': 'Bank loan · {left} left of {total}', // left, total: { money }; the card showsDebt
  'card.rota.permitElv': 'Treatment permit · end-of-life cars', // T21: comes with the plate, no price
  'card.rota.permitLead': 'Permit · lead smelting',
  'card.bay.route': 'Goes to: {to}', // to: { text: 'title.works.<id>' } or { text: 'card.bay.sellFromBay' }
  'card.bay.sellFromBay': 'Sell from the bay',
  // s2e-levels (economy 2.11, RULING2 27.3 D5): a level's row from the works' opening; x: { money } = levelGain as applied, t: { secs } = price ÷ gain
  'card.levelEarns': '+{x} an hour on your yard', // s2e-advice (the build's words): the same words as the advice line's gain (advice.gain)
  'card.levelPays': 'Pays for itself in about {t}', // t: { secs } = price ÷ gain, the yard's running hours
  'card.works.carPrice': 'A car from the garage · {x}', // s2f-plasma-cars (RULING2 28.7 b): x: { money } = the label price its landing pays today
  'card.works.recipeHall': 'The hall chooses: {recipe}', // s2g-halls (RULING2 29.1): recipe: { text: recipe.<id> }; at each heat the recipe that adds the most worth
  'card.works.recipeKept': 'Kept on {recipe} by you', // a tapped recipe holds until "Let the hall choose"
  'card.works.letChoose': 'Let the hall choose',
  'refusal.notLimit': 'Not the limit now · +{x} an hour', // x: { money } = levelGain; no Buy

  // --- the bank (2.14, 4.5; RULING2 9.7, 11.4). {share}: { text: 'share.fifth' } while content bank.share is 0.2
  // (bank.shareWords "A fifth"), else { pct: share } ("20 %"); mid-line `share.fifthIn`. ---
  'card.letter.lend': 'We lend on machines that earn.',
  'card.letter.split': 'You pay some of the price now. The bank pays the rest.', // D24: the letter avoids "part"
  'card.letter.rule': '{share} of each sale goes to the bank until it is repaid. No date.',
  'card.finance.price': 'Price',
  'card.finance.deposit': 'You pay now',
  'card.finance.lent': 'The bank pays',
  'card.finance.charge': 'Charge',
  'card.finance.total': 'You repay',
  'card.finance.rule': '{share} of each sale goes to the bank until {x} is repaid. No date.', // the lead's fixed sentence
  'card.letter.keep': 'While it is repaid you keep about {x} an hour', // s2e-bank (economy 2.14.5): the FINANCE card's line under its rule (the centred box); x: { money } = I − share × G_r, as computed
  'card.agreements.row': '{bank} · {plate}',
  'card.agreements.repay': 'You repay {total} · repaid {taken}',
  'card.agreements.left': '{left} left · {share} of each sale', // share: { text: 'share.fifthIn' }
  'card.agreements.history': '{plate} · {total} · repaid {date}', // date: { day }
  'card.agreements.historyHead': 'Repaid',
  'card.agreements.none': 'No open agreement',
  'share.fifth': 'A fifth',
  'share.fifthIn': 'a fifth',

  // --- the Yard sale, oversize pieces, the picking table, the batch (4.6, 4.7) ---
  'card.yardSale.thing': '{x} at the gate', // the row's name is the thing's
  'card.yardSale.free': '{n} free places',
  'card.yardSale.freeOne': 'One free place',
  'card.yardSale.full': 'No free place',
  'card.yardSale.next': 'Next visitor in {t}',
  'card.yardSale.empty': 'Set out a thing and visitors come', // the rack is empty: nobody comes
  'card.yardSale.soldToday': 'Sold today: {n} · {x}',
  'card.yardSale.level': 'More room · {a} → {b} places', // a, b: { n }
  'card.yardSale.corner': '{reclaimer|short} · {n} batches',
  'card.yardSale.van': 'Van in {t}', // 4.6's one line "... · van in {t}" is 43 at its widest: the van's date on a line of its own
  'card.yardSale.cornerEmpty': '{reclaimer|short} · no batches',
  'card.lot.value': '{kg} · about {x} once cut',
  'card.lot.cut': 'Only you can cut this · {n} s',
  'card.lot.from': 'From {partner}',
  'card.crate.count': '{n} things wait',
  'card.crate.stand': 'Stand here · {n} s a thing',
  'card.crate.empty': 'Nothing to sort',
  'skip.reuseBatch': 'Reusable: {thing} × {n} · {kg}', // 4.6: on the skip plate and card, before Buy
  'card.rung.styleNew': 'New sign style: rung {n}', // 4.10
  'card.rung.useIt': 'Use it',

  // --- the shop (2.15, 4.8; RULING2 15.4, 15.11, 15.12) ---
  'card.shop.row': 'Shop', // the row on the Rota and in Settings
  'card.shop.looks': 'Looks',
  'card.shop.colours': 'Yard colours',
  'card.shop.coloursLine': 'Trucks, vests and skips',
  'card.shop.decorations': 'Yard decorations',
  'card.shop.plaqueLine': 'Poured in your crucible, by the gate', // 4.8's "..., set by the gate" is 40, the effect line 38
  'card.shop.look': '{name}', // name: { name: 'product.<id>' } or { name: 'look.<id>' }
  'card.shop.earned': 'Earned',
  'card.shop.signStyle': 'Sign style · rung {n}',
  'card.shop.foundryPlate': '{foundry} plate',
  'card.shop.reachRung': 'Reach rung {n}',
  'card.shop.use': 'Use',
  'card.shop.inUse': 'In use',
  'card.shop.buy': 'Buy', // the store's own price string is the screen's (iap.priceOrNull), never a made-up one
  'card.shop.unavailable': 'Unavailable',
  'card.shop.noAds': '{product.skipAds}',
  'card.shop.noAdsLine': 'Get every ad reward without watching', // RULING2 9.14
  'card.shop.packs': '{currency|cap} packs',
  'card.shop.packName': '{x}', // the pack's S
  'card.shop.packLine': 'about {n} h of the yard’s own earnings', // RULING2 28.2 (d) via the lead's fallback (fit: 285 pt, 38 characters); n: H (2, 5)
  'card.shop.noRoom': 'Nothing to spend it on yet',
  'card.shop.waiting': 'Waiting for approval', // pending (15.4); also the row for as long as it waits (15.11 c)
  'card.shop.unconfirmed': 'The store has not confirmed this purchase yet. If you were charged, your {currency} arrives when it does.', // 15.4, word for word
  'card.shop.alsoWaiting': 'One purchase still awaits approval.', // the lead 11:50 (his words "One purchase is still waiting for approval." need 2 lines at 1.3 in a row's second line: shortened): an offer row while a waiting quote of it, past its 24 hours, still stands
  'card.shop.nothingCharged': 'Nothing was charged.', // only when the store refused (15.11 d); a cancel shows nothing
  'card.shop.unreachable': 'The store cannot be reached. Nothing was charged.', // 15.3, 15.12 e
  'card.shop.expired': 'A purchase that was waiting never arrived. Nothing was added.', // 15.11 f, until the card is closed
  'card.shop.updated': 'Updated: {a} → {b}', // a, b: { money }
  'card.shop.restore': 'Restore',
  'card.shop.restoreLine': '{currency|cap} bought here lives in this device’s save.',
  'card.packSheet.amount': '{x} for this yard',
  'card.packSheet.save': 'Bought {currency} lives in this device’s save. It is not restored on another device or a new install.',
  'card.code.set': 'Choose a four-digit code',
  'card.code.confirm': 'Enter it again',
  'card.code.enter': 'Enter the code',
  'card.restart.packLost': 'Bought {currency}, and any purchase still waiting for approval, stay with this yard and are lost if it starts again.', // P16
  'refusal.toApron': 'Set the car down at the depollution bay', // s2e-line (D1): a weighed car is set on the bay's apron, never tipped on the floor

  // --- ads (2.16, 4.9) ---
  'card.ad.spot': 'Video · +{x}', // the spot buyer beside a held bay's Sell
  'card.ad.bonus': 'Bonus · +{x}', // the same with No ad videos owned
  'card.ad.video': 'Watch a video',
  'card.ad.take': 'Take +{x}',
  'card.ad.amount': '+{x}',
  'card.ad.notReady': 'Video not ready',

  // --- items (5.3; ≤ 38 effect lines) ---
  'item.truckBridge': 'Three-axle truck',
  'item.pallet': 'Pallet truck',
  'item.forklift': 'Forklift',
  'item.plasma': 'Plasma cutter',
  'effect.truckBridge': 'Three axles: crosses the bridge', // T9 (30)
  'effect.pallet': 'Moves a bath in one trip',
  'effect.forklift': 'Lifts a car onto the depollution bay', // T1: the only way a car reaches the apron
  'effect.plasma': 'Cuts stainless and aluminium too', // T8 (32)

  // --- the rung signs 4 and 5, and what rung 3 opens (4.10, 1.4) ---
  'table.rungN': 'Rung {n} · {t} supplied',
  'opens.works': 'Machines by the tipping floor',
  'opens.backfield': 'The back field',
  'opens.yardSale': 'A Yard sale by the gate',
  'opens.shredder': 'The shredder line',
  'opens.halls': 'Two furnace halls',
  'opens.lead': 'The lead line',
  'opens.levelsOn': 'Every machine can still level up',

  // --- the away card (2.17, 4.5) ---
  'away.bank': 'To {bank}: {x}', // the card showsDebt
  'away.repaid': 'Repaid in full: {plate}',
  'away.rack': 'Sold at the gate: {n} · {x}',
  'away.van': '{reclaimer}: {x}',
  'away.lots': '{n} oversize pieces wait for you', // T11
  'away.lotOne': 'An oversize piece waits for you',
  // owner1-hud (the owner's review, point 6): the away card as a weighbridge docket; labels, cells and rows
  'away.labelAway': 'Away',
  // owner2-hud (the second update, item 2): the counting card painted before the away pass runs (no numbers, no button)
  'away.counting': 'Counting what the yard did while you were away…',
  'away.labelRan': 'The yard ran',
  'away.labelSold': 'Sold',
  'away.labelBought': 'Bought',
  'away.labelNet': 'Net',
  'away.time': '{t}', // t: { secs }
  'away.grade': '{grade}', // grade: { grade }
  'away.kg': '{kg}', // kg: { mass_g, step: 'lot' }
  'away.amount': '{x}', // x: money
  'away.cost': '−{x}', // x: money (positive), money that went out
  'away.netUp': '+{x}', // x: money, the net (the card's big number)
  'away.netDown': '−{x}', // x: money (positive)
  'away.inAccount': 'Already in your account',
  'away.fromAccount': 'Taken from your account',
  'away.salesTotal': 'Sales',
  'away.partner': '{partner}', // partner: { name }
  'away.loadsN': '{n} loads',
  'away.loadOne': '{n} load', // n: 1
  'away.dealName': 'Foundry deal delivery',
  'away.rackName': 'Yard sale at the gate',
  'away.vanName': '{reclaimer|short}',
  'away.thingsN': '{n} things',
  'away.thingOne': '{n} thing', // n: 1
  'away.bankName': 'To {bank}',
  'away.sumBoth': 'Sold +{x} · Loads −{y}', // owner1-fix finding 8: beside NET, CardData's own totals (x: money, y: spent)
  'away.sumBank': 'Sold +{x} · Loads −{y} · Bank −{z}', // z: the bank's share
  'away.sumSoldBank': 'Sold +{x} · Bank −{z}',

  // --- tickets (2.19, 4.5 to 4.7) ---
  'ticket.bankSplit': 'to the bank {y} · to you {z}', // under "Paid {x}" (ticket.paid, bold); ≤ 38 at five figures
  'ticket.rackHead': '{homeYard} · Yard sale',
  'ticket.rackSale': 'Sold at the gate · {thing} · {x}', // x: { exact }
  'ticket.vanCollection': 'Collected by {reclaimer}',
  'ticket.vanLine': '{thing} × {n} · {kg} · {x}',
  'ticket.crateLot': 'Sorted by hand · {n} things', // one ticket a sorting, a line a thing
  'ticket.note.analysed': 'Analysed',
  'ticket.note.drained': 'Depolluted', // T13: the glossary's word
  'ticket.cod': 'Certificate of destruction issued',

  // --- Settings and Help (4.8; 5.3) ---
  'clip.shop': 'Shop',
  'clip.packsShown': '{currency|cap} packs: shown',
  'clip.packsHidden': '{currency|cap} packs: hidden',
  'help.bank': 'Bank loans',
  'help.bankBody': 'Plant finance: {bank} lends on a machine that earns. You pay some of the price now and the bank the rest, for a charge fixed at signing. Some of each sale goes to the bank until it is repaid. No date.', // T16; no share named (it is content's)
  'help.yardSale': 'The Yard sale',
  'help.yardSaleBody': 'The public buys single things fit for reuse at the gate: baths, radiators, stoves, gates. Set a tagged thing on the Yard sale and a visitor pays more than its scrap value. Visitors keep to the railed bay by the gate.',
  'help.packs': '{currency|cap} packs',
  'help.packsBody': 'Some hours of the yard’s own earnings in {currency}, where the store allows it and never while a Bank loan is open. It stays on this device, is not restored on another, never repays a loan and adds no tonnes.', // RULING2 28.2 (c), (d)
  'help.code': 'The code',
  'help.codeBody': 'Whoever hides {currency} packs in Settings chooses a four-digit code; showing them again asks for it. A forgotten code clears only when the game is installed again, which starts a new yard.',
  'help.packLost': 'Bought {currency}, and any purchase still waiting for approval, stay with this yard and are lost if it starts again.', // P16
  'help.breaker': 'The battery breaker',
  'help.breakerBody': 'The breaker opens lead-acid batteries into plastic chips and lead paste. The acid is neutralised and leaves as a salt solution, with a licensed waste carrier. The smelter melts the paste into lead ingot.', // T20

  // --- goals (5.3; ≤ 30; goals.json list `stage2`, 1.3's order) ---
  'goal.rackBath': 'Put the bath on the Yard sale',
  'goal.buyBaler': 'Buy the baler',
  'goal.startBaler': 'Start up the baler', // T25
  'goal.buyAnalyser': 'Buy the analyser',
  'goal.buyShear': 'Buy the shear',
  'goal.buyTruckBridge': 'Buy the three-axle truck',
  'goal.fetchGarage': 'Fetch the garage’s first load', // as the first yard's "Fetch the farm’s trial load": the register has no short garage name, and the full one makes 35
  'goal.fetchPlumbing': 'Fetch the plumber’s first load',
  'goal.cutLot': 'Cut an oversize piece', // T11
  'goal.sortCrate': 'Sort the picking table',
  'goal.buyDepollution': 'Buy the depollution bay',
  'goal.supplyRung4': 'Supply {t} ({r} metals)', // T12: "metals" in stage 2's goals; t { tonnes_g }, r { n }
  'goal.buyCrane': 'Buy the magnet crane',
  'goal.walkBackfield': 'Walk into the back field', // P10: just before "Buy the shredder"
  'goal.buyShredder': 'Buy the shredder',
  'goal.buyRotary': 'Buy the rotary furnace',
  'goal.pourRotary': 'Pour at the rotary furnace', // T12, P14: done poured:rotary
  'goal.buyInduction': 'Buy the induction furnace',
  'goal.buyBreaker': 'Buy the battery breaker',
  'goal.buySmelter': 'Buy the lead smelter',
  'goal.pourLead': 'Pour a lead ingot', // done poured:smelter
  'goal.supplyRung5': 'Supply {t} ({r} metals)',
  // s2e-content (yard-stage2-economy.md 1.3; RULING2.md 27): the new goal list's three new goals
  'goal.buyPlasma': 'Buy the plasma cutter', // before "Cut an oversize piece" (the stainless and bronze kinds need it)
  'goal.startAnalyser': 'Start up the analyser', // the start-up the baler taught moves to the analyser; done commissioned:analyser
  'goal.pourInduction': 'Pour at the induction furnace', // done poured:induction
  // s2e-advice (yard-stage2-economy.md 1.3): the repeating goal after the list when the advice line names nothing
  'goal.rungToGo': 'Rung {n}: {t} to go', // n: the next rung; t: { tonnes_g } still to supply (adviceWait)
  'goal.buyShredderLine': 'Buy the shredder line', // s2e-fix1 (RULING2 28.5 c): the line is one purchase (the bay and the shredder); goal.buyShredder stays for old contents
  'goal.buyCopper': 'Buy the copper furnace', // s2f-copper (RULING2 28.7 c): done plate:copper
  'goal.pourCopper': 'Pour at the copper furnace', // done poured:copper
  // s2e-advice (RULING2 28.2 (d)): Help's scrip page says what an hour of the yard's earnings is (its own row, after help.packsBody)
  'help.packsHourBody': 'An hour of the yard’s own earnings is what it makes in an hour with nobody in it, at today’s prices.',
  // s2e-advice (yard-stage2-economy.md 2.6.2; RULING2 27.3 D6): words for Phase C. A plot whose item opens at the next rung shows
  // its gate and price from the rung below; the process board's greyed row names what comes with a later stage (no date, no promise).
  'plate.works.opensRung': 'Opens at rung {n} · {x}', // n: the item's gate rung; x: { money } its price (what the card will charge)
  'plate.batteriesLead': 'Batteries and lead', // the greyed row (beside Lithium, Platinum group and iridium, Tungsten)
  'plate.cable': 'Cable', // the greyed row
  // s2e-advice (yard-stage2-economy.md 2.17; s2e-crew's contract AwayCard.works, every number the one applied): the stage-2 away
  // card's lines, for Phase C (the card is designed there; "To {bank}: {x}" is away.bank, "Repaid in full: {plate}" away.repaid).
  'away.gross': 'Earned {x}', // x: { money } = works.gross
  'away.toYou': 'To you: {x}', // x: { money } = works.toYard (gross less the bank's share)
  'away.loanLeft': 'Left to repay: {x}', // x: { money } = works.loan.left (while an agreement is open)
  'away.pours': '{plate}: {n} pours', // plate: { text: title.works.<id> }; n: works.pours[].n (2 or more)
  'away.pourOne': '{plate}: {n} pour', // n: 1
  'away.lotsOf': 'Oversize pieces waiting: {n} of {m}', // n, m: works.lots {n, max}
  'away.crate': 'On the picking table: {n}', // n: works.crate (things)
  'away.grewMost': 'Grew most: {grade}', // grade: { grade }, the first grade of works.grown[0].material (no material keys yet)
  'advice.loanHint': 'A loan suits a machine that earns.', // 2.13: the bank's one sentence, under its four conditions
  // s2-fix-small (R3, 21.5): what the yard waits for when nothing is left to buy (advice.ts AdviceWait). The line and,
  // under it, who brings the material: each one line of the opened goal card at font scale 1.3 (check.ts goalMore).
  'advice.waitTonnes': 'Rung {n}: {t} to go', // n: the next rung; t: { tonnes_g } still to supply
  'advice.waitGrade': 'Rung {n} waits for {grade}', // grade: the material's first grade (its name, as the table's range chips print it)
  'advice.waitBrings': '{partner} brings it', // partner: { name: <partner id> } (the register)
  'advice.waitMakes': '{plate} makes it', // plate: { text: 'title.works.<id>' }
  // s2e-advice (yard-stage2-economy.md 2.13; RULING2 27): the line from the works' opening (advice.ts AdviceWorks). Each one
  // line of the opened goal card at font scale 1.3 (check.ts goalMore). The gain is the calculated one on the player's state.
  'advice.gain': '+{x} an hour on your yard', // x: { money } = AdviceWorks.gain_h, the calculated gain on this yard (never a table's mean)
  'advice.saveFor': 'Save up: {item}', // item: { text }: the target (AdviceWorks.saveUp_s set); "Save up for {item}" does not fit at 1.3
  'advice.saveTime': 'Cash for it in about {t}', // t: { secs } = AdviceWorks.saveUp_s, the card's closed form (only the time is "about")
  'advice.meanwhile': 'For now: {item}', // item: { text }: AdviceWorks.meanwhile, a purchase that leaves the target affordable on return; "Meanwhile: {item}" does not fit at 1.3

  // --- lessons (5.3, T14; ≤ 48) ---
  'lesson.ss': 'A magnet hardly holds 304 stainless.',
  'lesson.bzs': 'An analyser tells bronze from brass.',
  'lesson.bzi': 'Bronze is copper and tin.',
  'lesson.pb': 'A battery is broken, then its lead is smelted.', // 5.3's "... first, then its lead smelted." is 49, the lesson 48
  'lesson.zorba': 'Zorba: mixed metals from the eddy current.',
  'lesson.lib': 'Bales pay more than loose light iron.',

  // --- refusals of stage 2 (2.19; refusals.ts REFUSAL_KEYS_V3) ---
  'refusal.bankOne': 'One loan at a time. This one is repaid as you sell.', // 2.14.3
  'refusal.bankReserve': 'Kept for the next load: {x}', // E19, E29
  'refusal.bankTerms': 'The terms changed. Look again.', // as priceUpdated
  'refusal.notFinanceable': 'No bank loan for this',
  'refusal.quoteUpdated': 'Updated: {a} → {b}', // a, b: { money }
  'refusal.packPending': 'Waiting for approval', // the same words as card.shop.waiting
  'refusal.packHeadroom': 'Nothing to spend it on yet',
  'refusal.packOff': 'Not offered here', // names nothing of packs (P13)
  'refusal.packCode': 'That code does not match',
  'refusal.badYear': 'Enter a year of four digits',
  'refusal.rackFull': 'The Yard sale is full',
  'refusal.notReusable': 'Not for the Yard sale',
  'refusal.forkliftLoad': 'Too heavy for the forklift: {kg}',
  'refusal.noRoute': 'That machine does not take this',
  'refusal.routed': 'This feeds the {plate}. Choose Sell from the bay first.', // T17: a toast of two lines
  'refusal.adCap': 'No more this market day',
  'refusal.inForklift': 'Step out of the forklift first', // R4: an act of his own tried from the forklift
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
export const TEXT_PENDING: Record<string, string> = {};

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
  // W11: a ticket keeps its hundredths ({ exact }, rules-book's fmtMoneyExact); bars, cards and labels use { money }.
  if ('exact' in a) return R.fmtMoneyExact((a as { exact: number }).exact);
  if ('money' in a) return R.fmtMoney(a.money);
  if ('price' in a) return R.fmtPrice(a.price);
  if ('mass_g' in a) return R.fmtMass(a.mass_g, a.step, a.ferrous);
  if ('tonnes_g' in a) return R.fmtTonnes(a.tonnes_g);
  if ('kg_g' in a) return R.fmtKg(a.kg_g);
  if ('rate_g_h' in a) return R.fmtRate(a.rate_g_h);
  if ('day' in a) return R.fmtDay(a.day, (c as { board?: { epochMs: number } }).board?.epochMs ?? 0);
  if ('hours' in a) return R.fmtHours(a.hours);
  if ('n' in a) return String(a.n);
  if ('rank' in a) return R.fmtRank(a.rank);
  if ('secs' in a) return R.fmtDuration(a.secs);
  if ('pct' in a) return R.fmtPct(a.pct);
  if ('name' in a) return c.names[a.name] ?? a.name;
  if ('grade' in a) return c.grades[a.grade]?.name ?? a.grade;
  if ('thing' in a) return c.objects[a.thing]?.name ?? a.thing;
  if ('ref' in a) return a.ref;
  return say({ key: a.text }, c);
}

/** Fills `{hole}`s: a Txt argument first, else an invented name by register id, else the hole stays. */
export function fill(text: string, args: R.TxtArgs | undefined, c: Content): string {
  return text.replace(/\{([A-Za-z0-9_.]+)(?:\|(short|cap))?\}/g, (whole, h: string, mod?: string) => {
    const a = args?.[h];
    if (mod === 'short' && a && 'grade' in a) {
      const g = c.grades[a.grade] as { name?: string; short?: string } | undefined;
      return g?.short ?? g?.name ?? a.grade;
    }
    // strings2: `{id|short}` and `{partner|short}` ({ name }) print the register's short form (`<id>.short`) where it has one.
    if (mod === 'short' && a && 'name' in a) return c.names[`${a.name}.short`] ?? c.names[a.name] ?? a.name;
    let out: string;
    if (a) out = argText(a, c);
    else {
      const n = mod === 'short' ? (c.names[`${h}.short`] ?? c.names[h]) : c.names[h];
      if (n === undefined) return whole;
      out = n;
    }
    // strings2: `{currency|cap}` starts a sentence with the name's first letter in capitals.
    return mod === 'cap' ? out.charAt(0).toUpperCase() + out.slice(1) : out;
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

/** The loading curtain's accessibility label (src/ui/salvage/loading/LoadingStage.tsx); the ground work's placeholder words are gone (no screen reads them). */
export const S = {
  loading: 'Loading the yard…',
} as const;
