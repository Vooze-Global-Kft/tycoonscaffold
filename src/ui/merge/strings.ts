/**
 * Every word a player reads on the merge screens (spec 7.3: the voice is lantern-calm; names of
 * things come from game.json). The fingerprint (dimension 17) and the voice check read this file,
 * so no word stays in a component, a fallback or another string file.
 *
 * One marked section per package (spec 9.2): each package adds keys only in its own section.
 * The bars, sheets and spokes package is the steward of the file's structure. Written by the
 * skeleton with only the words the placeholder screen needs.
 */
/**
 * Word helpers for names that come from game.json: the plural of a good's name ("Twin Skewers",
 * "Tea Leaves", "Cups of Tea", "Candy Posies") and the name with "a" or "an". Any package may use
 * them; they hold no words of their own.
 */
export function plural(name: string): string {
  const of = name.indexOf(' of ');
  if (of > 0) return plural(name.slice(0, of)) + name.slice(of);
  if (/s$/i.test(name)) return name;
  if (/[^aeiou]y$/i.test(name)) return name.slice(0, -1) + 'ies';
  if (/af$/i.test(name)) return name.slice(0, -1) + 'ves';
  return name + 's';
}

export function article(name: string): string {
  return (/^[aeiou]/i.test(name) ? 'an ' : 'a ') + name;
}

export const S = {
  // ===== shell (the skeleton; then the bars, sheets and spokes package) ========================
  shell: {
    placeholder: 'PLACEHOLDER',
    /** The season chip: "<season> · Festival <filled>/<lines>". */
    seasonChip: (season: string, filled: number, lines: number) => `${season} · Festival ${filled}/${lines}`,
  },
  // ===== play canvas (board and street) =========================================================
  play: {
    /** A counter whose draw found no ticket (2.7 fallback step 5); drawn in paper-cut capitals, one word a line. */
    settingUp: 'Setting up…',
    /** The stamp on a paid ticket (4.2, 3.1). */
    filled: 'Filled',
    /** The mark on a stretch line (2.7). */
    newLine: 'New',
    /** The next shutter's condition, printed on its paper tag (2.2): "Grill 3" (a tier ever made) or "Steamer open". */
    shutterTier: (chain: string, tier: number) => `${chain} ${tier}`,
    shutterOpen: (chain: string) => `${chain} open`,
    /** The Festival banner before its lines show (4.2): "0/4". */
    festivalCount: (filled: number, lines: number) => `${filled}/${lines}`,
    /** The long-press chip (4.2): the good's name, then what it is worth on a ticket line. */
    chipWorth: (coins: string) => `Worth ${coins} on a ticket`,
    /** The long-press chip for a tier 8: it merges no further. */
    chipTop: 'The top of its ladder',
  },
  // ===== bars: top bar, goal line, bottom row ===================================================
  hud: {
    goalPlaceholder: 'Goal line',
    basket: 'Basket',
    book: 'Book',
    lanterns: 'Lanterns',
    season: 'Season',
    shop: 'Shop',
    menu: 'Menu',
    /** Accessibility labels of the top bar. */
    purseLabel: (coins: string) => `Purse, ${coins} coins`,
    menuLabel: 'Settings',
    giftLabel: (n: number) => (n === 1 ? 'A gift box waits' : `${n} gift boxes wait`),
    seasonLabel: 'Season and Festival',
    /** The season chip: the season's name over the Festival count; the count alone when the bar is narrow (M35). */
    festivalCount: (filled: number, lines: number) => `Festival ${filled}/${lines}`,
    festivalDone: 'Festival filled',
    /** The Basket's undo chip (4 s, spec 2.5). */
    undo: 'Undo',
    undoLabel: (coins: string) => `Undo the sale, give back ${coins}`,
    // --- the goal line (2.10): words, then the price, then the estimate ---
    goalGear: (chain: string, level: number) => `${chain} gear level ${level}`,
    /** M31: the gear level that halves the work for the Festival's missing good. */
    goalFestivalGear: (chain: string, level: number, tier: string) => `${chain} gear ${level}: ${plural(tier)} drop`,
    goalStall: (chain: string, level: number) => `${chain} stall level ${level}`,
    goalHire: (minder: string) => `Hire ${minder}`,
    goalMinderLevel: (minder: string, level: number) => `${minder} level ${level}`,
    goalOpenStall: (chain: string) => `Open the ${chain} stall`,
    goalShutter: 'Open a shutter',
    goalLantern: (have: number, need: number) => `The next lantern · ${have}/${need}`,
    goalFestival: (tier: string) => `The Festival waits for ${article(tier)}`,
    goalBasket: (tier: string) => `The board is full: sell ${article(tier)} in the Basket`,
    goalTicket: (who: string) => `Fill the ${who}'s ticket`,
    goalDragonTicket: 'Fill the paper dragon\'s ticket',
    /** The estimate (2.10): "about 20 s", "about 2 min", "about 1 h"; nothing when there is no rate. */
    about: (n: number, unit: 's' | 'min' | 'h') => `about ${n} ${unit}`,
    affordable: 'ready',
  },
  // ===== sheets =================================================================================
  sheets: {
    close: 'Close',
    coinsLabel: 'coins',
    // --- the stall sheet (4.4) ---
    stallTitle: (chain: string) => `${chain} stall`,
    gearHead: (gear: string, level: number) => `${gear} · level ${level}`,
    gearTop: (gear: string, level: number) => `${gear} · level ${level}, the top`,
    gearDrops: (tier: string, seconds: string) => `Drops ${article(tier)} every ${seconds} s`,
    gearRipe: (n: number, of: number, tier: string) => `${n} in ${of} is ${article(tier)}`,
    gearRipeNext: (n: number, of: number) => `→ ${n} in ${of}`,
    gearNextNone: (n: number, of: number, tier: string) => `Next level: ${n} in ${of} is ${article(tier)}`,
    gearBaseStep: (level: number, drops: string, asks: string) => `From level ${level}: drops ${plural(drops)}; orders ask for ${plural(asks)} and up.`,
    gearBaseNext: (drops: string, asks: string) => `Next level: drops ${plural(drops)}; orders ask for ${plural(asks)} and up.`,
    levelUp: 'Level up',
    stallHead: (level: number) => `Stall · level ${level}`,
    stallPays: (now: string, next: string) => `Pays ×${now} → ×${next}`,
    stallPaysTop: (now: string) => `Pays ×${now}, the most a stall pays`,
    minderHead: (name: string, level: number) => `${name} · level ${level}`,
    minderNone: (name: string) => `${name} would mind the stall`,
    minderSells: (tier: string, coins: string, seconds: string) => `Puts ${article(tier)}, ${coins}, in the till every ${seconds} s`,
    minderWould: (tier: string, coins: string, seconds: string) => `Would put ${article(tier)}, ${coins}, in the till every ${seconds} s`,
    minderNext: (tier: string, coins: string) => `Next level: ${article(tier)}, ${coins}`,
    heldByGear: 'held back by: gear level',
    heldByMinder: 'held back by: minder level',
    minderAway: (hours: string) => `Keeps selling while you are away, up to ${hours} h`,
    minderTop: 'The best house good this gear allows',
    /** M45: the rules refuse a minder level while the gear holds the house good back. */
    raiseGearFirst: 'Raise the gear first',
    hire: 'Hire',
    gearWaiting: 'Gear waiting: the shelf is full',
    shelf: (n: number) => `${n} on the shelf, waiting for room`,
    gearRush: 'Watch ad: gear rush',
    gearRushWhat: (n: number) => `Each open gear drops up to ${n} goods now`,
    openStall: (chain: string) => `Open the ${chain} stall`,
    openStallWhat: (gear: string) => `The ${gear} starts dropping, and customers ask for its goods.`,
    opensAfter: (chain: string) => `Opens after the ${chain} stall`,
    opensIn: (season: string) => `Opens in ${season}`,
    open: 'Open',
    // --- the shutter confirm (4.4) ---
    shutterTitle: 'A shutter',
    shutterCondTier: (tier: string) => `Opens once ${article(tier)} has been made`,
    shutterCondOpen: (chain: string) => `Opens once the ${chain} stall is open`,
    shutterReady: 'One more cell for the board',
    holdsGood: 'Holds a good',
    // --- the ticket detail (4.4) ---
    ticketTitle: (who: string) => `The ${who}'s ticket`,
    dragonTitle: 'The paper dragon\'s ticket',
    lineNew: 'NEW',
    lineFilled: 'filled',
    lineGone: 'No longer made at this stall',
    bonus: (pct: number, lines: number) => `+${pct} % for ${lines} lines`,
    paradePays: (x: string) => `The Parade pays ×${x}`,
    price: 'Pays',
    notTonight: 'Not tonight',
    notTonightWhat: 'The customer steps away; filled lines return to the board.',
    noRoom: (n: number) => `No room on the board for ${n} ${n === 1 ? 'good' : 'goods'}`,
    readyIn: (time: string) => `ready again in ${time}`,
    fillLine: 'Watch ad: fill one line',
    fillLineWhat: 'Fills the cheapest open line; the last line is yours to bring.',
    // --- the gift box (4.4, 5.5) ---
    giftTitle: 'A gift box',
    giftWaiting: (n: number) => (n === 1 ? '1 box waits.' : `${n} boxes wait.`),
    giftSlots: (n: number) => `${n} slots, each one of:`,
    giftCoins: (coins: string) => `${coins} coins`,
    giftGood: 'a good from an open stall',
    giftSpark: 'a Lucky Spark',
    giftOdds: (pct: number) => `${pct} %`,
    giftFixed: 'What is inside was set when the box was earned.',
    giftOpen: 'Open the bag',
    giftNext: 'Open the next bag',
    giftDone: 'Done',
    giftSparkGot: 'Lucky Spark',
    giftGoodWaits: 'to the board',
    giftNone: 'No gift box waits. One comes with filled tickets.',
    // --- the shop (4.4, 5.7) ---
    shopTitle: 'Shop',
    shopProducts: 'For good',
    awningsWhat: 'Every stall gets blue silk awnings and moon lanterns. Looks only.',
    lateHoursWhat: (hours: string) => `Your minders keep the stalls ${hours} more hours while you are away.`,
    quietEveningWhat: 'Every "Watch ad" button gives its reward at once, with no video.',
    owned: 'Yours',
    buy: (price: string) => price,
    restore: 'Restore purchases',
    restoring: 'Restoring…',
    restored: (n: number) => (n === 1 ? '1 purchase restored.' : `${n} purchases restored.`),
    restoredNone: 'Nothing to restore.',
    shopAds: 'Watch an ad',
    adFillLine: 'Fill one line',
    adFillLineWhat: 'On a ticket of two lines or more, open the ticket and fill its cheapest line.',
    adGearRush: 'Gear rush',
    adDragon: 'Call the dragon',
    adDragonWhat: 'The Paper Dragon Parade comes now with its gold ticket.',
    adDragonOut: 'The dragon is already here',
    adDragonWhen: 'Comes when a counter is free',
    adFromTicket: 'Open a ticket',
    adReady: 'Watch ad',
    adReadyAfter: (time: string) => `ready after ${time} of play`,
    adNotNow: 'Not possible right now',
    adNotLoaded: 'Ad not ready',
    // --- settings (4.4) ---
    settingsTitle: 'Settings',
    sound: 'Sound',
    music: 'Music',
    haptics: 'Haptics',
    on: 'On',
    off: 'Off',
    privacy: 'Privacy policy',
    privacyChoices: 'Privacy choices',
    version: (name: string, version: string, build: string | number) => `${name} ${version} (${build})`,
    // --- durations (cooldowns on the play clock, M10) ---
    seconds: (n: number) => `${n} s`,
    minutes: (n: number) => `${n} min`,
  },
  // ===== spokes =================================================================================
  spokes: {
    back: 'Back',
    // --- the Ladder Book (5.2) ---
    bookTitle: 'Ladder Book',
    bookFound: (n: number, of: number) => `${n} of ${of} goods found`,
    ladderCount: (n: number, of: number) => `${n}/${of}`,
    ladderLabel: (chain: string, n: number, of: number) => `${chain}, ${n} of ${of} found`,
    worth: (coins: string) => `Worth ${coins} on a ticket`,
    notYet: 'Not made yet',
    unknown: '?',
    bestLegend: 'A brass ring marks the best good of each ladder made this season.',
    ladderDone: (n: number) => `The ladder is complete. Lantern ${n} glows for it.`,
    ladderToGo: (n: number) => (n === 1 ? '1 more good completes this ladder.' : `${n} more goods complete this ladder.`),
    bookNote: 'A good made for the first time stamps its rung. Stamps light lanterns; they pay no coins.',
    oddsOpen: 'Odds',
    oddsLabel: 'Lucky and gift box odds',
    oddsTitle: 'Luck and gifts',
    luckyHead: 'Lucky merges',
    lucky: (n: number) => `1 in ${n} merges is Lucky and goes two tiers up.`,
    luckyBase: (n: number) => `The usual odds are 1 in ${n}.`,
    luckyFromSeason: (season: string) => `${season} sets them now.`,
    luckyFromLantern: (n: number) => `Lantern ${n} sets them now.`,
    sparks: (tiers: number, held: number) => `A Lucky Spark lifts a merge ${tiers === 1 ? 'one more tier' : `${tiers} more tiers`}. You hold ${held}.`,
    giftHead: 'Gift boxes',
    giftEvery: (n: number) => `A gift box comes with every ${n} filled tickets.`,
    giftSlots: (n: number) => `It holds ${n} slots; each slot is one of:`,
    giftCoins: (pct: number, coins: string) => `${pct} %: coins, ${coins} at today's pace`,
    giftGood: (pct: number) => `${pct} %: a good from an open stall`,
    giftSpark: (pct: number) => `${pct} %: a Lucky Spark`,
    oddsClose: 'Close',
    // --- the Lantern Gate (5.3) ---
    gateTitle: 'Lantern Gate',
    gateLit: (n: number, of: number) => `${n} of ${of} lanterns lit`,
    gateNote: 'Each lantern is earned once, by a feat, and stays lit for good.',
    gateNext: 'Next to light',
    gateLitHead: 'Lit',
    gateDark: 'Still dark',
    gateNone: 'No lantern is lit yet.',
    gateAll: 'Every lantern on the gate is lit.',
    lanternNo: (n: number) => `${n}`,
    progress: (have: string, need: string) => `${have}/${need}`,
    gives: (what: string) => `Lights: ${what}`,
    // the feats (5.3)
    featTickets: (n: string) => `Fill ${n} tickets`,
    featTier: (k: number) => `Make a good of tier ${k}`,
    featDiscover: (n: string) => `Find ${n} goods for the Book`,
    featMerges: (n: string) => `Make ${n} merges`,
    featSeasons: (n: number) => (n === 1 ? 'Close a season' : `Close ${n} seasons`),
    featLadder: 'Complete a ladder of the Book',
    featParades: (n: string) => `Fill ${n} Parade tickets`,
    featMinders: 'Hire every minder in one season',
    featThreeLine: (n: string) => `Fill ${n} tickets of three lines`,
    featShutters: (n: number) => `Open all ${n} shutters`,
    featTier8s: (n: number) => `Make ${n} goods of tier 8 in one season`,
    // what a lantern changes (5.3)
    effCounters: (n: number) => `${n} counters on the street`,
    effBasket: (pct: number) => `The Basket pays ${pct} % of a good's worth`,
    effShelf: (n: number) => `Shelves hold ${n} goods`,
    effParade: (min: string) => `A Parade every ${min} min`,
    effAway: (h: string) => `Minders keep the stalls ${h} h longer while you are away`,
    effLucky: (n: number) => `Lucky merges 1 in ${n}`,
    effStartOpen: (chain: string) => `The ${chain} stall opens with each season`,
    effSeasoned: (n: number) => (n === 1 ? 'Seasoned gear holds one step' : `Seasoned gear holds ${n} steps`),
    effParadePay: (x: string) => `Parades pay ×${x}`,
    effMinders: 'Minders start each season hired',
    effRipe: (pct: number) => `Every gear drops a finer good ${pct} % more often`,
    effBeta: (pct: number) => `Each extra ticket line adds ${pct} % more`,
    effGiftSlots: (n: number) => `Gift boxes hold ${n} slots`,
    effMinderPace: (s: string) => `Minders sell every ${s} s`,
    effSparkTiers: (n: number) => `A Lucky Spark lifts a merge ${n} tiers`,
    effFestival: (n: number) => `The Festival gives ${n} Lucky Sparks`,
    effGiftEvery: (n: number) => `A gift box every ${n} tickets`,
    effTicketPay: (pct: string) => `Every ticket pays ${pct} % more`,
    // --- the Season scroll (5.6, 2.8, 2.11) ---
    scrollTitle: 'Season',
    festivalHead: 'The Festival',
    festivalHow: 'Bring each good to the Festival banner on the street, by drag or by tap.',
    lineFilled: 'Filled',
    lineReady: 'On the board now',
    lineLater: (chain: string) => `Once the ${chain} stall is open`,
    lineWaits: 'Still to make',
    festivalGives: (sparks: number) => `Filled, it gives ${sparks} Lucky Sparks and the season's street piece, and the season may close.`,
    festivalDone: 'The Festival is filled. The season closes when you choose.',
    resets: 'Resets',
    stays: 'Stays',
    /** The words of the rules' own lists (SEASON_RESETS, SEASON_STAYS), by item id. */
    resetItems: {
      coins: 'coins',
      goods: 'goods on the board',
      gearLevels: 'gear levels',
      stallLevels: 'stall levels',
      minderLevels: 'minders',
      stalls: 'stalls',
      bestTiers: 'best tiers',
      shelves: 'shelves',
      tickets: 'tickets',
      till: 'the till',
    } as Record<string, string>,
    stayItems: {
      boardSpace: 'board space',
      lanterns: 'lanterns',
      ladderBook: 'the Ladder Book',
      giftGoods: 'gift box goods',
      giftBoxes: 'gift box goods',
      pendingGoods: 'goods waiting for room',
      luckySparks: 'Lucky Sparks',
      purchases: 'purchases',
      seasonedGear: 'seasoned gear',
    } as Record<string, string>,
    nextHead: (season: string) => `Next: ${season}`,
    /** One sentence about the next season's place, by its character (2.11: never a list of conditions). */
    place: {
      none: 'Lanterns along the wire, and the street as it always was.',
      fireflies: 'Fireflies drift over the stalls, and lucky merges come more often.',
      harvest: 'Harvest baskets crowd the counters, and longer tickets pay a little more.',
      warmGear: 'Every gear runs warm, and finer goods drop more often.',
      lateCrowd: 'A late crowd lingers, and minders sell more often.',
      marketDay: 'It is market day, and the paper dragon passes more often.',
    } as Record<string, string>,
    newStall: (gear: string) => `The ${gear} opens on the street.`,
    piecesHead: 'Street pieces',
    piecesNone: 'Each season leaves a piece on the street when its Festival is filled.',
    close: 'Close the season',
    closeLocked: 'Fill the Festival to close the season.',
    // --- the season close confirm and the change of season (2.11, M36) ---
    confirmTitle: (season: string) => `Close ${season}?`,
    confirmBoxes: (n: number) => (n === 1 ? 'The waiting gift box opens first: its coins go with the purse, its goods wait for room.' : `The ${n} waiting gift boxes open first: their coins go with the purse, their goods wait for room.`),
    confirmGo: 'Close the season',
    confirmStay: 'Not yet',
    refused: 'The Festival is not filled yet.',
    refusedOther: 'The season stays open for now.',
    ceremonyOut: (season: string) => `${season} ends`,
    ceremonyIn: (season: string) => season,
    ceremonyTap: 'Tap to step onto the street',
  },
  // ===== hints and platform (the firefly, Android back, the loading screen) =====================
  hints: {
    loading: 'Lighting the lanterns',
    /** The away report (spec 2.9, decision M8), the mode's own sheet. */
    away: {
      title: 'Back at the stalls',
      /** "3 h 10 m", "42 m", "40 s". */
      hours: (h: number, m: number) => `${h} h ${m} m`,
      minutes: (m: number) => `${m} m`,
      seconds: (s: number) => `${s} s`,
      /** Names joined: "Old Brindle and Pim", "Old Brindle, Pim and Nettle". */
      and: (list: string, last: string) => `${list} and ${last}`,
      comma: ', ',
      /** "While you were away (3 h 10 m): Old Brindle and Pim sold 1,520 house goods, +18.2K." */
      sold: (time: string, names: string, goods: string, one: boolean, coins: string) => `While you were away (${time}): ${names} sold ${goods} ${one ? 'house good' : 'house goods'}, +${coins}.`,
      /** Only the shelves (no minder hired): the report alone. */
      alone: (time: string) => `While you were away (${time}): your gear filled its shelves.`,
      shelves: 'Your gear filled its shelves.',
      /** Away longer than the minders keep the stalls. */
      capped: (cap: string) => `The minders keep the stalls for up to ${cap}.`,
      collect: 'Collect',
      /** The coins to collect, large: "+18.2K". */
      gain: (coins: string) => `+${coins}`,
      /** The ad's label (decision M8), the share from the rules' multiplier. */
      ad: (percent: number) => `Watch ad: +${percent} %`,
      adNotReady: 'The ad is still on its way',
    },
  },
} as const;
