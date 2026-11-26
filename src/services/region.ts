/**
 * Which country the player is in, as an ISO 3166-1 alpha-2 code ("BE", "US").
 * Used for rules that differ by country, such as where randomised chests may
 * be sold. The store account's country is what counts legally; the device's
 * region setting is the fallback, used only when there is no store account at
 * all. Null when the country is not known. What null means is decided by the
 * caller: for chest sales the engine treats an unknown country as restricted
 * (meta.ts chestSalesAllowed), the safe side for a legal rule.
 */
import { Platform } from 'react-native';
import { loadPurchases } from './sdks';

/**
 * Storefront codes may be alpha-3 (Apple) or alpha-2 (Google). The full ISO 3166-1 table, packed as
 * "AAAbb" pairs: an unmapped code now means "unknown" (see detectRegion), so every country must be here.
 */
const ALPHA3: Record<string, string> = Object.fromEntries(
  (
  'AFGAF ALAAX ALBAL DZADZ ASMAS ANDAD AGOAO AIAAI ATAAQ ATGAG ARGAR ARMAM ABWAW AUSAU AUTAT AZEAZ ' +
  'BHSBS BHRBH BGDBD BRBBB BLRBY BELBE BLZBZ BENBJ BMUBM BTNBT BOLBO BESBQ BIHBA BWABW BVTBV BRABR ' +
  'IOTIO BRNBN BGRBG BFABF BDIBI CPVCV KHMKH CMRCM CANCA CYMKY CAFCF TCDTD CHLCL CHNCN CXRCX CCKCC ' +
  'COLCO COMKM COGCG CODCD COKCK CRICR CIVCI HRVHR CUBCU CUWCW CYPCY CZECZ DNKDK DJIDJ DMADM DOMDO ' +
  'ECUEC EGYEG SLVSV GNQGQ ERIER ESTEE SWZSZ ETHET FLKFK FROFO FJIFJ FINFI FRAFR GUFGF PYFPF ATFTF ' +
  'GABGA GMBGM GEOGE DEUDE GHAGH GIBGI GRCGR GRLGL GRDGD GLPGP GUMGU GTMGT GGYGG GINGN GNBGW GUYGY ' +
  'HTIHT HMDHM VATVA HNDHN HKGHK HUNHU ISLIS INDIN IDNID IRNIR IRQIQ IRLIE IMNIM ISRIL ITAIT JAMJM ' +
  'JPNJP JEYJE JORJO KAZKZ KENKE KIRKI PRKKP KORKR KWTKW KGZKG LAOLA LVALV LBNLB LSOLS LBRLR LBYLY ' +
  'LIELI LTULT LUXLU MACMO MDGMG MWIMW MYSMY MDVMV MLIML MLTMT MHLMH MTQMQ MRTMR MUSMU MYTYT MEXMX ' +
  'FSMFM MDAMD MCOMC MNGMN MNEME MSRMS MARMA MOZMZ MMRMM NAMNA NRUNR NPLNP NLDNL NCLNC NZLNZ NICNI ' +
  'NERNE NGANG NIUNU NFKNF MKDMK MNPMP NORNO OMNOM PAKPK PLWPW PSEPS PANPA PNGPG PRYPY PERPE PHLPH ' +
  'PCNPN POLPL PRTPT PRIPR QATQA REURE ROURO RUSRU RWARW BLMBL SHNSH KNAKN LCALC MAFMF SPMPM VCTVC ' +
  'WSMWS SMRSM STPST SAUSA SENSN SRBRS SYCSC SLESL SGPSG SXMSX SVKSK SVNSI SLBSB SOMSO ZAFZA SGSGS ' +
  'SSDSS ESPES LKALK SDNSD SURSR SJMSJ SWESE CHECH SYRSY TWNTW TJKTJ TZATZ THATH TLSTL TGOTG TKLTK ' +
  'TONTO TTOTT TUNTN TURTR TKMTM TCATC TUVTV UGAUG UKRUA AREAE GBRGB USAUS UMIUM URYUY UZBUZ VUTVU ' +
  'VENVE VNMVN VGBVG VIRVI WLFWF ESHEH YEMYE ZMBZM ZWEZW XKXXK'
  )
    .split(' ')
    .map((p) => [p.slice(0, 3), p.slice(3)]),
);

function normalise(code: string | null | undefined): string | null {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  if (c.length === 2) return c;
  if (c.length === 3) return ALPHA3[c] ?? null;
  return null;
}

export async function detectRegion(): Promise<string | null> {
  if (Platform.OS !== 'web') {
    try {
      const purchases = loadPurchases();
      const storefront = await purchases?.getStorefront();
      if (storefront?.countryCode) {
        // The store account's country is the one that counts. If its code cannot be read, say "unknown"
        // rather than fall back to the device language (a Belgian account on an en-US phone is still Belgian).
        return normalise(storefront.countryCode);
      }
    } catch {
      // Not configured (no key, Expo Go): fall through to the device setting.
    }
  }
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const match = /[-_]([A-Za-z]{2})(?:[-_]|$)/.exec(locale);
    return match ? match[1].toUpperCase() : null;
  } catch {
    return null;
  }
}

/** The development row "Store country" (Auto · US · DE · Unknown): 'auto' asks the store; a code or null is used as it is. */
let devStorefront: 'auto' | string | null = 'auto';

/**
 * Development builds only (the web preview and Expo Go, where no store account exists): what
 * storefrontCountry() answers. 'auto' (the default) asks the purchase module as a release does; a
 * code answers that code; null answers unknown. In a release build it does nothing.
 */
export function setStorefrontForDev(value: 'auto' | string | null): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  devStorefront = value === 'auto' ? 'auto' : normalise(value);
}

/**
 * The store account's country (ISO alpha-2) as the purchase module reports it, for rules that must
 * follow the account and nothing else (scrip packs, yard-stage2.md 2.15.3). Unlike detectRegion it
 * has NO device fallback: no purchase module (Expo Go, web), a module that is not configured, a call
 * that fails or a code that cannot be read all answer null, which the caller treats as unknown.
 * Read it at every opening of the screen that needs it; nothing is cached here.
 */
export async function storefrontCountry(): Promise<string | null> {
  if (devStorefront !== 'auto') return devStorefront;
  if (Platform.OS === 'web') return null;
  try {
    const purchases = loadPurchases();
    const storefront = await purchases?.getStorefront();
    return normalise(storefront?.countryCode);
  } catch {
    return null;
  }
}
