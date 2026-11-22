/**
 * Curated trend & format library + a recurring calendar of content moments.
 * Used offline, and as the base the AI trend scout adds to.
 */
import type { Trend } from "@/lib/types";

const now = () => new Date().toISOString();

function t(p: Omit<Trend, "source" | "saved" | "createdAt"> & { saved?: boolean }): Trend {
  return { ...p, source: "seed", saved: p.saved ?? false, createdAt: now() };
}

export const SEED_TRENDS: Trend[] = [
  t({
    id: "tr_then_now_gta",
    name: "Tehdy vs. dnes (GTA V → GTA VI)",
    kind: "popculture",
    description:
      "Karusel nebo video, kde vedle sebe ukážete, jak něco vypadalo „v éře GTA V“ (2013–2016) a jak to vypadá dnes „v éře GTA VI“. Sportovní, módní i tech účty tím teď sbírají obrovský dosah.",
    whyNow:
      "Hype kolem nové GTA zasahuje i lidi, kteří nehrají. Srovnání tehdy/dnes je okamžitě čitelné, vyvolává nostalgii a lidé ho sdílejí s komentářem „tohle jsem měl taky“.",
    lifecycle: "rising",
    heat: 97,
    brandFit: 92,
    windowDays: 21,
    platforms: ["instagram", "tiktok"],
    structure: [
      "Slide 1: titulek ve stylu herní obálky „[věc] v GTA V vs. v GTA VI“",
      "Slidy 2–6: dvojice obrázků nahoře/dole nebo vlevo/vpravo se štítky „GTA V“ / „GTA VI“",
      "Každá dvojice = jedna věc (web, logo, mobil, kancelář, fotka produktu…)",
      "Poslední slide: pointa + CTA („Ve které éře je váš web?“)",
    ],
    examples: [
      "Sportovní e-shop: dresy klubů v éře GTA V vs. GTA VI",
      "Hokejový účet: hráči a stadiony tehdy vs. dnes",
      "Tech účet: iPhone 6 vs. iPhone dneška",
    ],
    hashtags: ["#gta6", "#gtavi", "#tehdyvsdnes", "#nostalgie"],
    ideas: [
      { title: "Weby v GTA V vs. v GTA VI", hook: "Váš web je pořád v éře GTA V?", format: "carousel", angle: "Dvojice: hero sekce 2014 (slider, Comic Sans) vs. dnešní mobile-first hero" },
      { title: "Kadeřnictví online: 2015 vs. 2026", hook: "Takhle se objednávalo v éře GTA V", format: "carousel", angle: "Telefonování a Facebook vs. online rezervace za 10 s" },
      { title: "Video: web projíždí časem", hook: "Pozor, tenhle web se právě updatoval na GTA VI", format: "reel", angle: "Herní přechod (loading screen) ze starého webu na nový" },
    ],
  }),
  t({
    id: "tr_black_friday",
    name: "Black Friday & Cyber Monday",
    kind: "event",
    description: "Největší nákupní týden roku. Lidé hledají slevy, ale jsou zahlcení — vyhrává ten, kdo je vtipný nebo upřímný.",
    whyNow: "Black Friday je poslední pátek v listopadu, tedy za pár dní. Okno pro obsah se zavírá s Cyber Monday.",
    lifecycle: "rising",
    heat: 90,
    brandFit: 70,
    windowDays: 7,
    platforms: ["instagram", "tiktok", "linkedin"],
    structure: ["Hook s anti-slevou nebo vtipem", "Jasná nabídka s časovým limitem", "Sociální důkaz", "CTA s datem konce"],
    examples: ["„Na Black Friday nic nezlevňujeme. Tady je proč.“", "Odpočet nabídky v příbězích"],
    hashtags: ["#blackfriday", "#cybermonday"],
    ideas: [
      { title: "Anti-Black Friday", hook: "Na Black Friday slevu nedáme. Dáme vám tohle.", format: "reel", angle: "Místo slevy audit webu zdarma pro prvních 10" },
      { title: "Co si za cenu webu koupíte na Black Friday", hook: "Za tyhle peníze máte buď televizi, nebo zákazníky", format: "carousel", angle: "Srovnání ceny webu Start s věcmi ve slevě" },
    ],
  }),
  t({
    id: "tr_year_wrapped",
    name: "Rok v kostce / „Wrapped“",
    kind: "event",
    description: "Začátkem prosince sdílí všichni svoje roční souhrny. Formát „náš rok v číslech“ funguje i pro malé značky.",
    whyNow: "Hudební služby vydávají roční souhrny začátkem prosince — lidé jsou na formát naladění.",
    lifecycle: "rising",
    heat: 78,
    brandFit: 88,
    windowDays: 20,
    platforms: ["instagram", "linkedin", "tiktok"],
    structure: ["Titulní slide ve stylu ročního souhrnu", "Top čísla roku", "Nejlepší projekt", "Největší fail / poučení", "Plán na příští rok + CTA"],
    examples: ["„Project Two Wrapped 2026: [ČÍSLO] spuštěných webů, [ČÍSLO] káv“"],
    hashtags: ["#wrapped", "#rokvkostce"],
    ideas: [
      { title: "Project Two Wrapped 2026", hook: "Náš rok v číslech. Číslo 3 nás překvapilo.", format: "carousel", angle: "Spuštěné weby, nejrychlejší dodání, nejčastější požadavek klientů" },
    ],
  }),
  t({
    id: "tr_new_year",
    name: "Nový rok, nový web (předsevzetí)",
    kind: "event",
    description: "Leden je měsíc předsevzetí. Podnikatelé plánují, co v novém roce změní — ideální chvíle na obsah o redesignu.",
    whyNow: "Od konce prosince do půlky ledna lidé plánují a mají rozpočty na nový rok.",
    lifecycle: "evergreen",
    heat: 65,
    brandFit: 90,
    windowDays: 30,
    platforms: ["instagram", "linkedin"],
    structure: ["Hook: „Předsevzetí, které vám vydělá“", "3 kroky", "Checklist ke stažení", "CTA"],
    examples: [],
    hashtags: ["#novyrok", "#predsevzeti"],
    ideas: [{ title: "5 předsevzetí pro váš web na 2027", hook: "Tohle předsevzetí vám na rozdíl od posilovny vydrží", format: "carousel", angle: "Checklist rychlých změn" }],
  }),
  t({
    id: "tr_pov",
    name: "POV: …",
    kind: "meme",
    description: "Krátký skeč z pohledu diváka. Jedna situace, jedna pointa, text nahoře „POV: …“.",
    whyNow: "Evergreen formát, který algoritmus pořád tlačí kvůli vysokému rewatch rate.",
    lifecycle: "evergreen",
    heat: 72,
    brandFit: 80,
    platforms: ["tiktok", "instagram"],
    structure: ["Text „POV: [situace]“", "Reakce / skeč 5–12 s", "Pointa", "Bez CTA nebo jen v popisku"],
    examples: ["POV: Konečně webař, který zvedá telefon"],
    hashtags: ["#pov"],
    ideas: [{ title: "POV: Klient poprvé vidí svůj nový web", hook: "POV: ukazujete klientovi web po 2 týdnech", format: "reel", angle: "Skutečná reakce klienta (se souhlasem)" }],
  }),
  t({
    id: "tr_tier_list",
    name: "Tier list",
    kind: "format",
    description: "Seřazení věcí do pater S–D. Vyvolává nesouhlas v komentářích, a tím dosah.",
    whyNow: "Funguje pořád; v nice webů a nástrojů vede k dlouhým diskusím.",
    lifecycle: "evergreen",
    heat: 70,
    brandFit: 85,
    platforms: ["tiktok", "instagram", "youtube"],
    structure: ["„Řadím [věci] od nejlepší po nejhorší“", "Postupně přidávám položky s 1 větou zdůvodnění", "Kontroverzní umístění jedné položky", "Otázka: „Kam byste dali vy?“"],
    examples: ["Tier list website builderů", "Tier list fontů na web"],
    hashtags: ["#tierlist"],
    ideas: [{ title: "Tier list: jak si udělat web", hook: "Seřadil jsem všechny způsoby, jak získat web. Wix vás naštve.", format: "reel", angle: "Od „synovec“ po „Project Two“ s humorem" }],
  }),
  t({
    id: "tr_expect_reality",
    name: "Očekávání vs. realita",
    kind: "meme",
    description: "Rozdělená obrazovka nebo dva slidy: jak si to člověk představuje vs. jak to dopadne.",
    whyNow: "Evergreen, snadno se točí a skvěle sedí na DIY weby.",
    lifecycle: "evergreen",
    heat: 66,
    brandFit: 88,
    platforms: ["instagram", "tiktok"],
    structure: ["Štítek OČEKÁVÁNÍ + ideální stav", "Štítek REALITA + vtipný opak", "Opakovat 3×", "Řešení na konci"],
    examples: ["Web za víkend: očekávání vs. realita"],
    hashtags: ["#ocekavanivsrealita"],
    ideas: [{ title: "Web ve Wixu za víkend", hook: "Web za víkend: očekávání vs. realita", format: "reel", angle: "Skeč s převleky, týden 1–4" }],
  }),
  t({
    id: "tr_nostalgia_2016",
    name: "2016 je zpátky (nostalgie)",
    kind: "meme",
    description: "Vlna nostalgie po roce 2016: filtry, hudba, styl fotek. Lidé sdílí „takhle jsme vypadali v 2016“.",
    whyNow: "Desetiletá výročí a nostalgie po „jednodušším internetu“ drží formát nahoře.",
    lifecycle: "peak",
    heat: 74,
    brandFit: 75,
    windowDays: 30,
    platforms: ["instagram", "tiktok"],
    structure: ["Starý filtr / retro UI", "„V roce 2016 jsme…“", "Střih do současnosti", "Pointa"],
    examples: ["Weby z roku 2016 vs. dnes", "Jak vypadal Instagram firmy v 2016"],
    hashtags: ["#2016", "#nostalgie"],
    ideas: [{ title: "Váš web má pořád rok 2016", hook: "Pokud má váš web tohle, žije v roce 2016", format: "reel", angle: "Retro VHS styl, posuvník, Flash intro, návštěvní kniha" }],
  }),
  t({
    id: "tr_roast",
    name: "Roast my website",
    kind: "format",
    description: "Sledující posílají své weby, tvůrce je s humorem rozebere a ohodnotí X/10.",
    whyNow: "Vytváří nekonečný zdroj obsahu a zároveň leady (lidé posílají své weby).",
    lifecycle: "evergreen",
    heat: 76,
    brandFit: 98,
    platforms: ["tiktok", "instagram", "youtube"],
    structure: ["„Roastuju web od sledujícího“", "3 chyby s eskalací", "Známka X/10", "1 rychlá oprava", "„Pošlete svůj web“"],
    examples: ["Roast webu kadeřnictví 4/10"],
    hashtags: ["#roast", "#webdesign"],
    ideas: [{ title: "Pátek = Roast den", hook: "Tenhle web má tlačítko, které nikam nevede", format: "reel", angle: "Týdenní série se svolením majitele" }],
  }),
  t({
    id: "tr_things_sense",
    name: "Věci, které prostě dávají smysl",
    kind: "meme",
    description: "Série uspokojivých detailů s trendy hudbou: „things that just make sense“.",
    whyNow: "Krátký formát s vysokou mírou dokoukání a sdílení.",
    lifecycle: "peak",
    heat: 68,
    brandFit: 82,
    platforms: ["instagram", "tiktok"],
    structure: ["Text nahoře: „Věci na webu, které prostě dávají smysl“", "5–7 rychlých záběrů po 1,5 s", "Každý záběr jeden detail", "Žádné CTA"],
    examples: ["Tlačítko volat, které je vždy vidět"],
    hashtags: ["#satisfying"],
    ideas: [{ title: "Detaily webu, které dávají smysl", hook: "Weby, které tohle mají, prostě vyhrávají", format: "reel", angle: "Screen recordingy mikro-animací z webů klientů" }],
  }),
  t({
    id: "tr_ai_vs_human",
    name: "AI vs. člověk",
    kind: "popculture",
    description: "Stejné zadání dostane AI a člověk. Divák hádá a hodnotí výsledek.",
    whyNow: "AI nástroje na tvorbu webů jsou všude; lidé chtějí vidět poctivé srovnání.",
    lifecycle: "peak",
    heat: 82,
    brandFit: 95,
    windowDays: 45,
    platforms: ["tiktok", "instagram", "linkedin"],
    structure: ["Stejné zadání oběma", "Časomíra", "Výsledky vedle sebe", "Test na mobilu / rychlost", "Verdikt + otázka divákům"],
    examples: ["Web pro kavárnu: AI za 10 min vs. designér za 2 dny"],
    hashtags: ["#ai", "#aivsclovek"],
    ideas: [{ title: "AI web vs. Project Two web", hook: "Dali jsme AI a našemu designérovi stejné zadání", format: "reel", angle: "Split screen + hodnocení klienta naslepo" }],
  }),
  t({
    id: "tr_photo_dump",
    name: "Photo dump ze zákulisí",
    kind: "format",
    description: "Neuhlazený karusel 8–10 fotek z běžného týdne. Lidský, sympatický, buduje důvěru.",
    whyNow: "Algoritmus odměňuje autentické karusely; nízká produkční náročnost.",
    lifecycle: "evergreen",
    heat: 60,
    brandFit: 80,
    platforms: ["instagram"],
    structure: ["Nejlepší fotka první", "Mix: práce, káva, skici, klient, fail", "Krátký vtipný popisek"],
    examples: [],
    hashtags: ["#photodump"],
    ideas: [{ title: "Týden v Project Two", hook: "Photo dump: jak vzniká web za 2 týdny", format: "carousel", angle: "Skici, Figma, telefonát s klientem, spuštění" }],
  }),
];

/** Recurring moments, resolved to their next occurrence from today. */
export function upcomingMoments(from = new Date()): Array<{ name: string; date: string; trendId?: string; note: string }> {
  const y = from.getFullYear();
  const lastFridayOfNov = (year: number) => {
    const d = new Date(year, 10, 30);
    while (d.getDay() !== 5) d.setDate(d.getDate() - 1);
    return d;
  };
  const mk = (name: string, date: Date, note: string, trendId?: string) => ({ name, date: iso(date), note, trendId });
  const next = (fn: (year: number) => Date) => {
    const d = fn(y);
    return d >= startOfDay(from) ? d : fn(y + 1);
  };
  const list = [
    mk("Black Friday", next(lastFridayOfNov), "Poslední pátek v listopadu", "tr_black_friday"),
    mk("Cyber Monday", next((yr) => new Date(lastFridayOfNov(yr).getTime() + 3 * 864e5)), "Pondělí po Black Friday", "tr_black_friday"),
    mk("Roční souhrny (Wrapped)", next((yr) => new Date(yr, 11, 3)), "Začátek prosince", "tr_year_wrapped"),
    mk("Mikuláš", next((yr) => new Date(yr, 11, 5)), "Večer 5. 12."),
    mk("Štědrý den", next((yr) => new Date(yr, 11, 24)), "Poslední termín na vánoční obsah ~20. 12."),
    mk("Silvestr / Nový rok", next((yr) => new Date(yr, 11, 31)), "Předsevzetí a plány", "tr_new_year"),
    mk("Blue Monday", next((yr) => { const d = new Date(yr, 0, 31); while (d.getDay() !== 1) d.setDate(d.getDate() - 1); d.setDate(d.getDate() - 7); return d; }), "„Nejsmutnější den roku“ — motivační obsah"),
    mk("Valentýn", next((yr) => new Date(yr, 1, 14)), "Love brand / „náš nejoblíbenější klient“"),
    mk("Den žen", next((yr) => new Date(yr, 2, 8)), "Podnikatelky mezi klienty"),
    mk("Apríl", next((yr) => new Date(yr, 3, 1)), "Vtipný fake launch"),
    mk("Zpátky do školy", next((yr) => new Date(yr, 8, 1)), "Nový začátek, nový web"),
  ];
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
