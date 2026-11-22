// deno-lint-ignore-file no-explicit-any
import { arrOf, claudeJson, obj, str, strArr } from "../_shared/anthropic.ts";
import { enforceRateLimit, logActivity, requireMember } from "../_shared/auth.ts";
import { brandContext } from "../_shared/brand.ts";
import { handler, HttpError, json } from "../_shared/cors.ts";
import { getSecret } from "../_shared/secrets.ts";

const SCHEMA = obj({
  title: str,
  hooks: arrOf(obj({ onScreen: str, spoken: str, pattern: str })),
  script: arrOf(obj({ time: str, label: str, spoken: str, onScreen: str, visual: str })),
  visualDirection: obj({ camera: strArr, broll: strArr, editing: strArr, captions: str }),
  post: obj({ firstLine: str, body: str, cta: str }),
  slides: arrOf(obj({ index: { type: "integer" }, headline: str, body: str, visual: str })),
  caption: str,
  hashtags: strArr,
});

const FORMAT_RULES: Record<string, string> = {
  reel: `Formát: krátké vertikální video (Reel/TikTok/Short), 30–45 s.
- "hooks": přesně 3 varianty; onScreen max 8 slov, spoken = první 3 s mluveného slova.
- "script": 4–6 bloků s časy "0–3 s", "3–15 s", "15–30 s", … a poslední blok CTA. Každý blok: spoken, onScreen, visual (konkrétní záběr, střih, B-roll).
- "visualDirection": praktické pokyny pro natáčení mobilem (kamera, B-roll, střih, styl titulků).
- "slides": [] ; "post": krátké shrnutí videa pro popisek (firstLine = první řádek popisku).`,
  carousel: `Formát: Instagram/LinkedIn karusel.
- "slides": přesně 7 slidů (index 1–7). Slide 1 = hook (max 8 slov), slidy 2–6 = hodnota (max 25 slov), slide 7 = CTA.
- "hooks": 3 varianty titulku slidu 1. "script": []. "visualDirection": pokyny pro design slidů.`,
  linkedin: `Formát: LinkedIn textový post, 900–1500 znaků.
- "post.firstLine": úderný první řádek (max 12 slov), který přiměje kliknout na „zobrazit více“.
- "post.body": celý text včetně prvního řádku, krátké odstavce, bílé místo, max 3 hashtagy na konci nebo žádné.
- "hooks": 3 alternativní první řádky. "script": [], "slides": [].`,
  x_thread: `Formát: X (Twitter) vlákno, 5–8 tweetů po max 270 znacích, číslované "1/", "2/"…
- "post.body": celé vlákno, tweety oddělené prázdným řádkem. "hooks": 3 varianty prvního tweetu. "script": [], "slides": [].`,
  ig_post: `Formát: statický Instagram post.
- "post": text grafiky (firstLine = hlavní titulek) a "caption" = popisek. "hooks": 3 varianty titulku. "script": [], "slides": [].`,
};

const GOALS: Record<string, string> = {
  reach: "Cíl: maximální dosah — optimalizuj na sdílení a uložení.",
  trust: "Cíl: důvěra a expertíza — ukaž know-how, CTA na follow.",
  leads: "Cíl: leady — CTA vyzve ke komentáři s klíčovým slovem nebo DM.",
  sales: "Cíl: prodej — jasná nabídka a CTA na web/poptávku.",
};

Deno.serve(
  handler(async (req) => {
    const caller = await requireMember(req, "editor");
    await enforceRateLimit(caller, "ai.generate", Number(Deno.env.get("AI_RATE_LIMIT_PER_HOUR") ?? 60));

    const { request, brand } = (await req.json()) as { request: any; brand: any };
    if (!request?.topic || !request?.format || !FORMAT_RULES[request.format]) throw new HttpError(400, "Neplatný požadavek");
    if (String(request.topic).length > 2000) throw new HttpError(400, "Téma je příliš dlouhé");

    const apiKey = await getSecret(caller.admin, "anthropic_api_key", "ANTHROPIC_API_KEY");
    if (!apiKey) throw new HttpError(412, "Chybí Anthropic API klíč — nastavte ho v Nastavení → API klíče.");

    const persona = (brand.personas ?? []).find((p: any) => p.id === request.personaId) ?? brand.personas?.[0];
    const ref = request.reference;
    const language = brand.language === "en" ? "angličtině" : "češtině";

    const system = `Jsi seniorní social-media stratég a scenárista virálního obsahu pro malé firmy a osobní značky.
Píšeš výhradně v ${language}, v tónu značky níže. Nikdy nevymýšlej konkrétní čísla klientů, která nejsou v zadání — místo nich použij placeholder ve tvaru [ČÍSLO].
Neopisuj referenci doslova: převezmi její STRUKTURU úspěchu (typ hooku, retenční mechanismy, storytelling, CTA) a aplikuj ji na značku.
${brandContext(brand)}`;

    const user = `${FORMAT_RULES[request.format]}
Platforma: ${request.platform}
${GOALS[request.goal] ?? ""}
Persona: ${persona ? `${persona.name} — ${persona.description}. Bolesti: ${(persona.pains ?? []).join("; ")}` : "obecná cílovka značky"}
Téma: ${request.topic}
${request.extraInstructions ? `Doplňující pokyny: ${request.extraInstructions}` : ""}
${
  ref
    ? `<reference>
Virální reference (${ref.platform}, ${ref.views} zhlédnutí, Viral Score ${ref.viralScore}):
Titulek: ${ref.title}
Hook: ${ref.hookText}
Popisek: ${ref.caption ?? ""}
${ref.transcript ? `Přepis: ${ref.transcript}` : ""}
${ref.analysis ? `Analýza úspěchu: ${JSON.stringify(ref.analysis)}` : ""}
</reference>`
    : "Bez reference — použij osvědčené virální struktury."
}
Vrať JSON podle schématu. "hashtags" = 5–12 relevantních hashtagů (LinkedIn max 3), včetně značkových.`;

    const out = await claudeJson<any>({ apiKey, system, user, schema: SCHEMA, effort: "medium" });
    await logActivity(caller, "ai.generate", { format: request.format, platform: request.platform });

    return json({
      content: {
        ...out,
        format: request.format,
        platform: request.platform,
        meta: {
          engine: "claude",
          generatedAt: new Date().toISOString(),
          referenceId: ref?.id,
          topic: request.topic,
          goal: request.goal,
        },
      },
    });
  }),
);
