/**
 * Prompt builders used when the app talks to Claude directly from the browser
 * (Artifact `sample` capability). The Supabase Edge Functions use equivalent
 * server-side prompts with structured outputs.
 */
import type { BrandProfile, GenerateRequest, Trend, VideoStyle } from "@/lib/types";

export function brandBlock(brand: BrandProfile) {
  const personas = brand.personas
    .map((p) => `- ${p.name}: ${p.description}. Bolesti: ${p.pains.join("; ")}. Touhy: ${p.desires.join("; ")}`)
    .join("\n");
  return `<brand>
Značka: ${brand.name} (${brand.website})
Popis: ${brand.description}
Produkty: ${brand.products.map((p) => `${p.name} (${p.price}) – ${p.description}`).join(" | ")}
USP: ${brand.usps.join(" | ")}
Persony:
${personas}
Tón: ${brand.tone.join(", ")}. ${brand.toneNotes}
Zakázaná slova: ${brand.forbiddenWords.join(", ") || "—"}
Výchozí CTA: ${brand.defaultCta}
Hashtagy: ${brand.hashtags.join(" ")}
Referenční posty: ${brand.referencePosts.map((r) => `"${r.text}" (${r.why})`).join(" | ") || "—"}
</brand>`;
}

const FORMAT_RULES: Record<string, string> = {
  reel: `Krátké vertikální video 25–45 s. "hooks" = přesně 3 (onScreen max 8 slov, spoken = první 3 s). "script" = 4–6 bloků s časy "0–3 s", "3–10 s"… poslední = CTA; každý má spoken, onScreen, visual (konkrétní záběr, střih, B-roll). "visualDirection" = praktické pokyny pro natáčení mobilem. "slides" = [].`,
  carousel: `Karusel. "slides" = 6–8 slidů (index od 1): slide 1 = hook (max 8 slov), poslední = CTA. Každý slide má "imagePrompt" (anglicky, pro AI generátor obrázků, 9:16 nebo 4:5, konkrétní scéna, světlo, styl). "hooks" = 3 varianty titulku slidu 1. "script" = [].`,
  linkedin: `LinkedIn post 900–1500 znaků. "post.firstLine" = úderný první řádek (max 12 slov), "post.body" = celý text vč. prvního řádku, krátké odstavce. "hooks" = 3 alternativní první řádky. "script" = [], "slides" = [].`,
  x_thread: `X vlákno 5–8 tweetů po max 270 znacích, číslované "1/"… v "post.body" (oddělené prázdným řádkem). "hooks" = 3 varianty prvního tweetu. "script" = [], "slides" = [].`,
  ig_post: `Statický IG post. "post.firstLine" = text na grafice, "caption" = popisek, "slides" = 1 slide s imagePrompt. "hooks" = 3 varianty titulku. "script" = [].`,
};

const GOALS: Record<string, string> = {
  reach: "Cíl: dosah — optimalizuj na sdílení a uložení.",
  trust: "Cíl: důvěra — ukaž expertízu, CTA na follow.",
  leads: "Cíl: leady — CTA na komentář s klíčovým slovem nebo DM.",
  sales: "Cíl: prodej — jasná nabídka, CTA na web.",
};

const OUTPUT_SHAPE = `{
  "title": string,
  "hooks": [{"onScreen": string, "spoken": string, "pattern": string}],
  "script": [{"time": string, "label": string, "spoken": string, "onScreen": string, "visual": string}],
  "visualDirection": {"camera": string[], "broll": string[], "editing": string[], "captions": string},
  "post": {"firstLine": string, "body": string, "cta": string},
  "slides": [{"index": number, "headline": string, "body": string, "visual": string, "imagePrompt": string,
              "compare": {"thenLabel": string, "nowLabel": string, "thenPrompt": string, "nowPrompt": string} | null}],
  "caption": string,
  "hashtags": string[]
}`;

export function trendBlock(t: Trend) {
  return `<trend>
Trend: ${t.name} (${t.kind}, ${t.lifecycle})
Co to je: ${t.description}
Proč teď: ${t.whyNow}
Struktura formátu: ${t.structure.map((s, i) => `${i + 1}. ${s}`).join(" ")}
</trend>
Použij STRUKTURU tohoto trendu (trend-jacking) a napoj ji přirozeně na značku. Pokud jde o formát "tehdy vs. dnes", vyplň u slidů "compare" (thenLabel/nowLabel např. "2016"/"2026" nebo "GTA V"/"GTA VI", thenPrompt/nowPrompt = anglické prompty pro obě poloviny obrázku). Nepoužívej loga ani chráněné postavy cizích značek — jen styl a nadsázku.`;
}

export function contentPrompt(req: GenerateRequest, brand: BrandProfile) {
  const persona = brand.personas.find((p) => p.id === req.personaId) ?? brand.personas[0];
  const ref = req.reference;
  return `Jsi seniorní social-media stratég a scenárista virálního obsahu (Reels, TikTok, karusely). Píšeš ${
    brand.language === "en" ? "anglicky" : "česky"
  }, v tónu značky. Žádné vymyšlené konkrétní výsledky klientů — místo čísel použij [ČÍSLO]. Referenci neopisuj, převezmi strukturu úspěchu.
${brandBlock(brand)}
FORMÁT: ${FORMAT_RULES[req.format]}
Platforma: ${req.platform}. ${GOALS[req.goal] ?? ""}
Persona: ${persona ? `${persona.name} — ${persona.description}` : "obecná"}
Téma: ${req.topic}
${req.extraInstructions ? `Doplňující pokyny: ${req.extraInstructions}` : ""}
${
  ref
    ? `<reference>${ref.platform}, ${ref.views} zhlédnutí. Hook: ${ref.hookText}. Popisek: ${ref.caption}. ${
        ref.analysis ? `Analýza: ${JSON.stringify(ref.analysis)}` : ""
      }</reference>`
    : ""
}
${req.trend ? trendBlock(req.trend) : ""}
Odpověz POUZE jedním JSON objektem tohoto tvaru (prázdná pole tam, kde formát nic nevyžaduje; "compare" null, pokud nejde o srovnání):
${OUTPUT_SHAPE}
"hashtags": 5–12 (LinkedIn max 3), včetně značkových.`;
}

export function analyzePrompt(input: { platform: string; url?: string; hookText?: string; caption?: string; transcript?: string; views?: number; likes?: number; comments?: number }, brand: BrandProfile) {
  return `Jsi analytik virálního obsahu. Rozeber česky, PROČ tento příspěvek fungoval — konkrétně a prakticky. Inspiraci hledá značka ${brand.name}: ${brand.description}
Platforma: ${input.platform}; URL: ${input.url ?? "—"}; metriky: ${input.views ?? 0} zhlédnutí, ${input.likes ?? 0} lajků, ${input.comments ?? 0} komentářů.
Hook: ${input.hookText ?? "—"}
Popisek: ${input.caption ?? "—"}
Přepis: ${input.transcript ?? "—"}
Odpověz POUZE JSON:
{"title": string, "tags": string[] (1–3 z: Edukace, Kontroverze, Příběh, Humor, Tutoriál, Před/Po, Mýtus, Behind the scenes, Case study, Trend),
 "analysis": {"hook": {"pattern": string, "text": string, "why": string}, "retention": {"mechanisms": string[], "why": string},
 "storytelling": {"structure": string, "beats": string[]}, "visual": {"style": string, "notes": string[]},
 "cta": {"type": string, "text": string, "why": string}, "takeaways": string[], "remixAngle": string}}`;
}

export function trendScoutPrompt(brand: BrandProfile, today: string, focus: string) {
  return `Jsi trend analytik pro český Instagram a TikTok. Dnes je ${today}.
Najdi 8 trendů, které má smysl využít v příštích 1–4 týdnech pro značku níže: aktuální popkulturní momenty (hry, filmy, seriály, sport, virální události), meme formáty, opakující se svátky a nákupní události (Black Friday, Vánoce, Nový rok, Valentýn…) a evergreen formáty, které právě znovu letí (např. "tehdy vs. dnes", POV, tier list).
${focus ? `Zaměř se hlavně na: ${focus}` : ""}
Buď poctivý: nemáš přístup na internet, proto u událostí uváděj jen to, co víš jistě, a "whyNow" formuluj opatrně. Neuváděj vymyšlená čísla ani konkrétní příspěvky.
${brandBlock(brand)}
Odpověz POUZE JSON polem 8 objektů:
[{"name": string, "kind": "meme"|"popculture"|"event"|"audio"|"format"|"challenge", "description": string, "whyNow": string,
  "lifecycle": "rising"|"peak"|"fading"|"evergreen", "heat": 0-100, "brandFit": 0-100, "date": "YYYY-MM-DD" | null, "windowDays": number | null,
  "platforms": ("instagram"|"tiktok"|"youtube"|"linkedin"|"x")[], "structure": string[] (3–6 kroků formátu), "examples": string[] (popis typických příkladů, ne URL),
  "hashtags": string[], "ideas": [{"title": string, "hook": string, "format": "reel"|"carousel"|"linkedin"|"x_thread"|"ig_post", "angle": string}] (3 nápady pro značku)}]`;
}

export function trendIdeasPrompt(trend: Trend, brand: BrandProfile) {
  return `Jsi kreativní stratég. Vymysli 5 konkrétních nápadů, jak využít trend pro značku. Každý nápad musí být natočitelný mobilem za 1 den a mít jasný hook.
${brandBlock(brand)}
${trendBlock(trend)}
Odpověz POUZE JSON polem: [{"title": string, "hook": string, "format": "reel"|"carousel"|"linkedin"|"x_thread"|"ig_post", "angle": string}]`;
}

export const STYLE_GUIDE: Record<VideoStyle, { label: string; prompt: string; desc: string }> = {
  ugc: {
    label: "UGC iPhone",
    desc: "Autentické, ruční kamera, jako od kamaráda",
    prompt: "handheld iPhone footage, natural window light, authentic UGC look, slight motion blur, vertical 9:16",
  },
  cinematic: {
    label: "Filmový",
    desc: "Pomalé jízdy, mělká hloubka ostrosti",
    prompt: "cinematic, anamorphic lens, shallow depth of field, slow dolly, teal and orange grade, 24fps, vertical 9:16",
  },
  meme_edit: {
    label: "Meme / rychlý střih",
    desc: "Zoom punch, rychlé střihy, nadsázka",
    prompt: "fast-paced social media edit, punchy zoom-ins, high contrast, bold colors, comedic timing, vertical 9:16",
  },
  game: {
    label: "Herní open-world",
    desc: "Jako trailer moderní open-world hry",
    prompt: "stylized open-world video game look, sunny coastal city, saturated colors, cinematic game trailer camera, vertical 9:16",
  },
  retro_vhs: {
    label: "Retro 2010 / VHS",
    desc: "Nostalgie, šum, staré UI",
    prompt: "retro 2010s look, VHS grain, low resolution webcam aesthetic, oversaturated, nostalgic, vertical 9:16",
  },
  product_3d: {
    label: "3D produkt",
    desc: "Čisté 3D rendery, studiové světlo",
    prompt: "clean 3D render, studio lighting, floating devices, soft shadows, premium tech commercial, vertical 9:16",
  },
  kinetic_text: {
    label: "Kinetická typografie",
    desc: "Jen text a grafika — bez AI videa",
    prompt: "kinetic typography, bold sans-serif text animation on dark background, orange accents, vertical 9:16",
  },
};

export function shotPlanPrompt(input: { topic: string; script?: string; hook?: string; style: VideoStyle; seconds: number; trend?: Trend }, brand: BrandProfile) {
  const style = STYLE_GUIDE[input.style];
  return `Jsi režisér virálních Reels/TikToků a prompt inženýr pro AI generátory videa (Veo, Kling, Sora, Runway, Hailuo).
Vytvoř storyboard krátkého vertikálního videa (${input.seconds} s celkem) pro značku. Hook musí zaujmout v první sekundě, každý záběr 2–6 s, střídej úhly, poslední záběr = CTA.
${brandBlock(brand)}
Téma: ${input.topic}
${input.hook ? `Hook: ${input.hook}` : ""}
${input.script ? `Scénář k převedení:\n${input.script}` : ""}
${input.trend ? trendBlock(input.trend) : ""}
Vizuální styl: ${style.label} — ${style.prompt}
Pro každý záběr napiš "prompt" ANGLICKY pro text-to-video model: subjekt, akce, prostředí, kamera, světlo, styl (zahrň "${style.prompt}"). Žádné texty v obraze, žádná loga cizích značek, žádné skutečné osobnosti.
"onScreenText" česky, max 7 slov. "voiceover" česky, přirozeně mluvené.
"scene" = animovaná grafika místo AI klipu, kde dává smysl (jinak null): "phone" (web v mobilu), "browser" (web v prohlížeči), "compare" (před/po, tehdy/dnes), "notifications" (příval poptávek), "counter" (velké číslo), "checklist" (body), "quote" (recenze), "headline" (úderný titulek, typicky hook nebo CTA). Použij ji u 2–4 záběrů. "sceneItems" = položky pro notifications/checklist, "sceneValue" = číslo pro counter.
Odpověz POUZE JSON:
{"title": string, "hookText": string, "cta": string, "music": {"mood": string, "bpm": number, "hint": string},
 "shots": [{"duration": number, "description": string, "prompt": string, "camera": string, "onScreenText": string, "voiceover": string, "transition": "cut"|"flash"|"zoom"|"whip",
   "scene": "phone"|"browser"|"compare"|"notifications"|"counter"|"checklist"|"quote"|"headline"|null, "sceneItems": string[], "sceneValue": number}]}`;
}
