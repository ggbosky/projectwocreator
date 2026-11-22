/**
 * Local, deterministic content engine used in demo mode (and as an offline
 * fallback). It remixes the reference post's winning structure with the
 * Brand Brain. Live mode uses Claude through the `ai-generate` Edge Function
 * and returns the exact same GeneratedContent shape.
 */
import type {
  AnalyzeRequest,
  BrandProfile,
  ContentTag,
  GenerateRequest,
  GeneratedContent,
  Hook,
  Persona,
  PostAnalysis,
  ScriptBeat,
  Slide,
} from "@/lib/types";
import { hashString, pick } from "@/lib/utils";

type HookFamily = "result" | "contrarian" | "data" | "trend" | "confession" | "myth" | "pov" | "barrier";

function detectFamily(pattern: string): HookFamily {
  const p = pattern.toLowerCase();
  if (p.includes("kontrovers") || p.includes("paradox") || p.includes("obviň")) return "contrarian";
  if (p.includes("statist") || p.includes("výzkum") || p.includes("vzorek") || p.includes("strach")) return "data";
  if (p.includes("trend")) return "trend";
  if (p.includes("přiznání") || p.includes("neintuitiv") || p.includes("underdog")) return "confession";
  if (p.includes("mýt")) return "myth";
  if (p.includes("pov") || p.includes("humor")) return "pov";
  if (p.includes("bariér")) return "barrier";
  return "result";
}

function cleanTopic(topic: string) {
  const t = topic.trim().replace(/\.$/, "");
  return t.length ? t : "proč váš web nepřináší poptávky";
}

function lowerFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function personaOf(brand: BrandProfile, id?: string): Persona {
  return (
    brand.personas.find((p) => p.id === id) ??
    brand.personas[0] ?? {
      id: "default",
      name: "Podnikatel",
      description: "Malý podnikatel",
      pains: ["Web nepřináší zakázky"],
      desires: ["Víc poptávek"],
    }
  );
}

function audienceWord(persona: Persona) {
  const d = `${persona.name} ${persona.description}`.toLowerCase();
  if (d.includes("živnost") || d.includes("řemesl")) return "živnostníci";
  if (d.includes("značk") || d.includes("kouč") || d.includes("tvůr")) return "tvůrci a osobní značky";
  if (d.includes("firm")) return "majitelé firem";
  return "podnikatelé";
}

const HOOK_TEMPLATES: Record<HookFamily, (t: string, pain: string, aud: string) => Hook> = {
  result: (_t, pain) => ({
    pattern: "Negativní výsledek + slib vysvětlení",
    onScreen: `0 poptávek za rok. Proč?`,
    spoken: `Tenhle web nepřinesl za rok ani jednu poptávku. Za 30 vteřin vám ukážu proč — a jestli nemáte stejný problém: ${lowerFirst(pain)}.`,
  }),
  contrarian: (t, _pain, aud) => ({
    pattern: "Kontroverzní tvrzení",
    onScreen: `Levný web = nejdražší web`,
    spoken: `Tohle ${aud} slyšet nechtějí: ${lowerFirst(t)} vás stojí víc, než si myslíte. Spočítejme to.`,
  }),
  data: (t) => ({
    pattern: "Vlastní data / statistika",
    onScreen: `Prošli jsme 50 webů. 37 má stejnou chybu.`,
    spoken: `Prošli jsme 50 webů českých podnikatelů. 37 z nich dělá stejnou chybu — a souvisí to s tím, ${lowerFirst(t)}.`,
  }),
  trend: (t) => ({
    pattern: "Trend + twist",
    onScreen: `AI web za 10 minut? Tady je háček.`,
    spoken: `Všichni teď dělají weby přes AI za 10 minut. Jenže nikdo neříká tohle: ${lowerFirst(t)}.`,
  }),
  confession: (t) => ({
    pattern: "Osobní přiznání",
    onScreen: `Tuhle chybu jsme dělali taky.`,
    spoken: `Přiznám se: první weby jsme stavěli úplně špatně. Až když jsme pochopili, ${lowerFirst(t)}, začaly klientům chodit poptávky.`,
  }),
  myth: (t) => ({
    pattern: "Mýtus vs. realita",
    onScreen: `„Web si udělám sám za víkend.“`,
    spoken: `„Web si udělám sám za víkend.“ Tohle říká každý druhý. Realita? ${t} — a tady je proč.`,
  }),
  pov: (t) => ({
    pattern: "POV / humor",
    onScreen: `POV: Konečně webař, který zvedá telefon`,
    spoken: `POV: Píšete webaři a odpoví vám ještě ten den. Žádná agentura, žádné čekání. A k tomu ${lowerFirst(t)}.`,
  }),
  barrier: (t) => ({
    pattern: "Odstranění bariéry",
    onScreen: `Nepotřebujete agenturu. Potřebujete tohle.`,
    spoken: `Nepotřebujete agenturu za statisíce. Potřebujete pochopit jednu věc: ${lowerFirst(t)}.`,
  }),
};

const CURIOSITY_HOOKS = [
  (t: string) => ({
    pattern: "Otevřená smyčka",
    onScreen: `Tohle na svém webu nejspíš nemáte`,
    spoken: `Jedna věc rozhoduje, jestli vám web přinese zakázku, nebo zákazníka pošle ke konkurenci. Souvisí s tím, ${lowerFirst(t)}.`,
  }),
  (t: string) => ({
    pattern: "Číslovaný slib",
    onScreen: `3 věci, které opravíte ještě dnes`,
    spoken: `3 věci na webu, které opravíte ještě dnes — bez programátora. Téma: ${lowerFirst(t)}.`,
  }),
  (t: string) => ({
    pattern: "Přímá otázka",
    onScreen: `Najde vás zákazník do 5 vteřin?`,
    spoken: `Otevřete si teď svůj web na mobilu. Najdete do 5 vteřin telefon? Pokud ne, poslouchejte — ${lowerFirst(t)}.`,
  }),
];

function buildHooks(req: GenerateRequest, brand: BrandProfile, persona: Persona, seed: number): Hook[] {
  const t = cleanTopic(req.topic);
  const pain = pick(persona.pains, seed) ?? "web nepřináší zakázky";
  const aud = audienceWord(persona);
  const refFamily = req.reference?.analysis ? detectFamily(req.reference.analysis.hook.pattern) : "result";
  const alternates = (["contrarian", "data", "confession", "myth", "barrier", "result"] as HookFamily[]).filter(
    (f) => f !== refFamily,
  );
  const second = alternates[seed % alternates.length];
  const hooks = [refFamily, second].map((f) => HOOK_TEMPLATES[f](t, pain, aud));
  hooks.push(pick(CURIOSITY_HOOKS, seed)(t));
  if (req.reference?.analysis) {
    hooks[0] = {
      ...hooks[0],
      pattern: `${req.reference.analysis.hook.pattern} (remix reference)`,
    };
  }
  // Swap in a brand-specific USP hook when the brand has a speed USP.
  const speedUsp = brand.usps.find((u) => /týdn|rychl/i.test(u));
  if (speedUsp && seed % 3 === 0) {
    hooks[2] = {
      pattern: "USP v hooku",
      onScreen: speedUsp,
      spoken: `${speedUsp}. Zní to jako slib z reklamy? Ukážu vám, jak to reálně děláme.`,
    };
  }
  return hooks;
}

function reelScript(req: GenerateRequest, brand: BrandProfile, persona: Persona, hook: Hook, seed: number): ScriptBeat[] {
  const t = cleanTopic(req.topic);
  const usp1 = brand.usps[0] ?? "Osobní přístup";
  const usp2 = brand.usps[1] ?? "Rychlé dodání";
  const pain = pick(persona.pains, seed + 1);
  const desire = pick(persona.desires, seed);
  const ref = req.reference?.analysis;
  const cta = ctaForGoal(req.goal, brand);
  return [
    {
      time: "0–3 s",
      label: "Hook",
      spoken: hook.spoken,
      onScreen: hook.onScreen,
      visual: ref?.visual.style.includes("Screen")
        ? "Telefon s webem v ruce těsně u kamery, rychlý push-in. Facecam v rohu."
        : "Detailní záběr na obličej, přímý oční kontakt, kamera v úrovni očí. Pohyb ruky do záběru na 1. slově.",
    },
    {
      time: "3–15 s",
      label: "Problém & napětí",
      spoken: `Většina lidí řeší ${lowerFirst(pain)}. A přitom chyba není ve vás — je v tom, jak je web postavený. ${
        ref?.retention.mechanisms[0] ? "Ukážu vám to na třech věcech." : "Podívejte se na tohle."
      }`,
      onScreen: `Chyba #1 · #2 · #3`,
      visual: "Screen recording starého webu na mobilu, červené kroužky na problémech, střih každých 1,5 s.",
    },
    {
      time: "15–30 s",
      label: "Řešení / transformace",
      spoken: `Takhle to děláme v ${brand.name}: ${lowerFirst(usp1)}. ${usp2}. Výsledek? ${desire}. A přesně o tom je ${lowerFirst(t)}.`,
      onScreen: `Před ➜ Po`,
      visual: "Split-screen před/po, plynulý scroll nového webu, zoom na tlačítko s telefonem. B-roll práce u notebooku.",
    },
    {
      time: "30–40 s",
      label: "CTA",
      spoken: cta.spoken,
      onScreen: cta.onScreen,
      visual: "Zpět na obličej, úsměv, ukázat na text na obrazovce. Logo Project Two na posledním framu.",
    },
  ];
}

function ctaForGoal(goal: GenerateRequest["goal"], brand: BrandProfile) {
  switch (goal) {
    case "reach":
      return {
        spoken: "Pošlete to někomu, kdo má web z roku 2015. Poděkuje vám.",
        onScreen: "Pošli to kamarádovi 📩",
        type: "Sdílení",
      };
    case "trust":
      return {
        spoken: "Sledujte nás — každý týden rozebereme jeden web a ukážeme, jak ho opravit.",
        onScreen: "Sleduj pro další díl",
        type: "Follow",
      };
    case "sales":
      return {
        spoken: `${brand.defaultCta || "Napište nám a pošleme vám návrh i cenu."}`,
        onScreen: "Odkaz v biu ➜ projectwo.com",
        type: "Přímá nabídka",
      };
    case "leads":
    default:
      return {
        spoken: "Napište do komentáře WEB a podíváme se zdarma i na ten váš.",
        onScreen: "Komentuj „WEB“ 👇",
        type: "Komentář s klíčovým slovem",
      };
  }
}

function visualDirection(req: GenerateRequest): GeneratedContent["visualDirection"] {
  const ref = req.reference?.analysis;
  return {
    camera: [
      "Formát 9:16, mobil na stativu ve výšce očí, zadní kamera (lepší kvalita).",
      "Světlo z okna před vámi, ne za vámi. Večer kruhové světlo 45° z boku.",
      "Mikrofon klopový nebo bezdrátový — zvuk je důležitější než obraz.",
      ...(ref?.visual.style ? [`Inspirace z reference: ${ref.visual.style}.`] : []),
    ],
    broll: [
      "Screen recording webu na mobilu (Nastavení → Záznam obrazovky).",
      "Ruce na klávesnici / skicování wireframu na papír.",
      "Detail telefonu s příchozí poptávkou (notifikace e-mailu).",
      "Klient v provozovně (se souhlasem) — autentičnost > dokonalost.",
    ],
    editing: [
      "Střih každé 1–2 s v prvních 10 s, pak pomaleji.",
      "Jump-cuts — vystřihnout všechny nádechy a pauzy.",
      "Zoom-in 110 % na klíčová slova, zvukový efekt 'whoosh' na přechodech.",
      ...(ref?.visual.notes ?? []).slice(0, 2),
    ],
    captions:
      "Titulky slovo po slově, Inter Bold, bílé s černým obrysem, klíčové slovo v oranžové #FF5A0F, umístění ve střední třetině (mimo UI platformy).",
  };
}

function caption(req: GenerateRequest, brand: BrandProfile, hook: Hook, persona: Persona, seed: number) {
  const t = cleanTopic(req.topic);
  const desire = pick(persona.desires, seed);
  const cta = ctaForGoal(req.goal, brand);
  return `${hook.onScreen}\n\n${t.charAt(0).toUpperCase() + t.slice(1)} — tohle je téma, které u klientů řešíme každý týden. Cíl je jednoduchý: ${lowerFirst(desire)}.\n\n${brand.usps
    .slice(0, 3)
    .map((u) => `✔︎ ${u}`)
    .join("\n")}\n\n${cta.spoken}`;
}

function hashtags(req: GenerateRequest, brand: BrandProfile): string[] {
  const base = brand.hashtags.slice(0, 5);
  const topicTags = cleanTopic(req.topic)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 4)
    .slice(0, 3)
    .map((w) => `#${w}`);
  const platformTags: Record<string, string[]> = {
    instagram: ["#reelsczech", "#marketingtipy"],
    tiktok: ["#fyp", "#podnikanitiktok"],
    youtube: ["#shorts"],
    linkedin: ["#marketing", "#podnikani"],
    x: [],
  };
  return Array.from(new Set([...base, ...topicTags, ...(platformTags[req.platform] ?? [])])).slice(0, req.platform === "linkedin" ? 4 : 12);
}

function carouselSlides(req: GenerateRequest, brand: BrandProfile, persona: Persona, hook: Hook): Slide[] {
  const t = cleanTopic(req.topic);
  const pains = persona.pains.slice(0, 3);
  const cta = ctaForGoal(req.goal === "reach" ? "reach" : req.goal, brand);
  return [
    { index: 1, headline: hook.onScreen, body: "Swipe ➜", visual: "Velký titulek přes 60 % plochy, tmavé pozadí, oranžové klíčové slovo, šipka vpravo dole." },
    { index: 2, headline: "Znáte to?", body: pains.map((p) => `• ${p}`).join("\n"), visual: "Seznam s ikonami ✕ v červené." },
    {
      index: 3,
      headline: "Problém není ve vás",
      body: `Problém je v tom, jak je web postavený. ${t.charAt(0).toUpperCase() + t.slice(1)} rozhoduje víc než hezký design.`,
      visual: "Screenshot starého webu s anotacemi.",
    },
    {
      index: 4,
      headline: "1 · Telefon nahoře",
      body: "Zákazník z mobilu musí vidět, jak vás kontaktovat, bez scrollování.",
      visual: "Mockup mobilu se zvýrazněnou horní lištou.",
    },
    {
      index: 5,
      headline: "2 · Skutečné fotky",
      body: "Fotobanka = důvěra 0. Vaše dílna, váš tým, vaše práce = důvěra 100.",
      visual: "Před/po: fotobanka vs. reálná fotka.",
    },
    {
      index: 6,
      headline: "3 · Jedno jasné tlačítko",
      body: "Ne pět. Jedno. Co má člověk udělat? Zavolat? Rezervovat? Napsat?",
      visual: "Hero sekce s jedním oranžovým tlačítkem.",
    },
    {
      index: 7,
      headline: req.goal === "reach" ? "Uložte si to 🔖" : `Chcete to mít hotové za ${brand.usps.find((u) => u.includes("týdn")) ? "2–3 týdny" : "pár týdnů"}?`,
      body: cta.spoken,
      visual: "Logo Project Two, fotka zakladatele, CTA v oranžovém boxu.",
    },
  ];
}

function textPost(req: GenerateRequest, brand: BrandProfile, persona: Persona, hook: Hook, seed: number) {
  const t = cleanTopic(req.topic);
  const pain = pick(persona.pains, seed);
  const desire = pick(persona.desires, seed + 2);
  const cta = ctaForGoal(req.goal, brand);
  const firstLine = hook.spoken.split(/(?<=[.!?])\s/)[0];
  const isX = req.format === "x_thread";
  const body = isX
    ? [
        `1/ ${firstLine}`,
        `2/ Většina podnikatelů řeší ${lowerFirst(pain)}. Ale chyba není v nich.`,
        `3/ Je v tom, jak je web postavený. ${t.charAt(0).toUpperCase() + t.slice(1)}.`,
        `4/ Co funguje u našich klientů:\n→ telefon nahoře\n→ skutečné fotky\n→ jedno tlačítko`,
        `5/ Výsledek: ${lowerFirst(desire)}.`,
        `6/ ${cta.spoken}`,
      ].join("\n\n")
    : [
        firstLine,
        "",
        `${pain}.`,
        "Slyšíme to od klientů skoro každý týden.",
        "",
        `A přitom ${lowerFirst(t)} jde vyřešit jednodušeji, než si myslíte.`,
        "",
        "Co děláme jinak:",
        ...brand.usps.slice(0, 3).map((u) => `→ ${u}`),
        "",
        `Výsledek? ${desire}.`,
        "",
        req.platform === "linkedin" ? "Jak to máte vy? Napište do komentářů." : cta.spoken,
      ].join("\n");
  return { firstLine, body, cta: cta.spoken };
}

export function generateLocal(req: GenerateRequest, brand: BrandProfile): GeneratedContent {
  const seed = hashString(`${req.topic}|${req.format}|${req.reference?.id ?? ""}|${Date.now() >> 16}`);
  const persona = personaOf(brand, req.personaId);
  const hooks = buildHooks(req, brand, persona, seed);
  const isVideo = req.format === "reel";
  const isCarousel = req.format === "carousel";
  const t = cleanTopic(req.topic);
  return {
    format: req.format,
    platform: req.platform,
    title: t.charAt(0).toUpperCase() + t.slice(1),
    hooks,
    script: isVideo ? reelScript(req, brand, persona, hooks[0], seed) : [],
    visualDirection: visualDirection(req),
    post: textPost(req, brand, persona, hooks[0], seed),
    slides: isCarousel ? carouselSlides(req, brand, persona, hooks[0]) : [],
    caption: caption(req, brand, hooks[0], persona, seed),
    hashtags: hashtags(req, brand),
    meta: {
      engine: "local",
      generatedAt: new Date().toISOString(),
      referenceId: req.reference?.id,
      topic: req.topic,
      goal: req.goal,
    },
  };
}

/** Heuristic analysis of a pasted post (demo mode). */
export function analyzeLocal(req: AnalyzeRequest): { analysis: PostAnalysis; tags: ContentTag[]; title: string } {
  const hook = (req.hookText || req.caption || req.transcript || "").split(/\n|(?<=[.!?])\s/)[0]?.trim() || "Hook nebyl vložen";
  const text = `${req.hookText ?? ""} ${req.caption ?? ""} ${req.transcript ?? ""}`.toLowerCase();
  const tags: ContentTag[] = [];
  const has = (...w: string[]) => w.some((x) => text.includes(x));
  if (has("%", "prošel", "výzkum", "data", "statist")) tags.push("Edukace");
  if (has("nejdražší", "nikdo vám", "přestaňte", "mýtus", "lež", "nesouhlas")) tags.push("Kontroverze");
  if (has("já jsem", "přiznám", "příběh", "když jsem", "rok jsem")) tags.push("Příběh");
  if (has("pov", "😂", "😅", "když klient")) tags.push("Humor");
  if (has("jak ", "návod", "krok", "trik", "tip")) tags.push("Tutoriál");
  if (has("před", "po ", "redesign", "předtím")) tags.push("Před/Po");
  if (has("ai", "chatgpt", "claude")) tags.push("Trend");
  if (!tags.length) tags.push("Edukace");

  const hasNumber = /\d/.test(hook);
  const isQuestion = hook.includes("?");
  const pattern = has("pov")
    ? "POV / humor"
    : tags.includes("Kontroverze")
      ? "Kontroverzní tvrzení / paradox"
      : hasNumber
        ? "Konkrétní číslo / statistika"
        : isQuestion
          ? "Přímá otázka"
          : tags.includes("Příběh")
            ? "Osobní přiznání"
            : "Otevřená smyčka";

  const er =
    req.views && req.views > 0 ? (((req.likes ?? 0) + (req.comments ?? 0) * 2) / req.views) * 100 : undefined;

  const analysis: PostAnalysis = {
    hook: {
      pattern,
      text: hook,
      why: hasNumber
        ? "Konkrétní číslo dodává důvěryhodnost a vytváří zvědavost — mozek chce vědět, co za číslem stojí."
        : isQuestion
          ? "Otázka aktivuje diváka: v hlavě si automaticky odpovídá a zůstává u videa."
          : "Hook otevírá informační mezeru — slibuje odpověď, kterou divák dostane jen když vydrží.",
    },
    retention: {
      mechanisms: [
        tags.includes("Tutoriál") ? "Číslované kroky (pocit postupu)" : "Otevřená smyčka až do konce",
        tags.includes("Před/Po") ? "Vizuální kontrast před/po" : "Rychlé střihy a změna záběru",
        "Titulky pro sledování bez zvuku",
      ],
      why:
        er !== undefined
          ? `Engagement ${er.toFixed(1).replace(".", ",")} % naznačuje, že obsah divákům dal důvod reagovat, ne jen koukat.`
          : "Struktura dává divákovi průběžné mini-odměny, takže nemá důvod scrollovat dál.",
    },
    storytelling: {
      structure: tags.includes("Příběh") ? "Situace → Konflikt → Zvrat → Poučení" : "Problém → Agitace → Řešení → CTA",
      beats: ["Hook", "Kontext / problém", "Hlavní hodnota", "Výsledek / payoff", "Výzva k akci"],
    },
    visual: {
      style: req.platform === "linkedin" || req.platform === "x" ? "Text-first, skenovatelné krátké řádky" : "Talking head + B-roll + titulky",
      notes: ["Silný první frame bez loga", "Kontrastní titulky", "Pohyb v prvních 0,5 s"],
    },
    cta: {
      type: has("koment") ? "Komentář" : has("ulož") ? "Uložit" : has("sdíl", "pošli") ? "Sdílení" : "Soft CTA / follow",
      text: (req.caption ?? "").split("\n").filter(Boolean).slice(-1)[0] ?? "—",
      why: "CTA by mělo vyžadovat minimální úsilí a zároveň posílat algoritmu silný signál (komentář, uložení, sdílení).",
    },
    takeaways: [
      `Zopakovat hook pattern „${pattern}“ s tématem Project Two`,
      "Držet jednu myšlenku na video",
      "CTA navázat na lead magnet (audit webu zdarma)",
    ],
    remixAngle: "Použít stejnou strukturu, ale s konkrétním klientským příběhem Project Two (živnostník, před/po, čísla).",
  };

  return { analysis, tags: Array.from(new Set(tags)).slice(0, 3), title: hook.slice(0, 90) };
}
