// deno-lint-ignore-file no-explicit-any
import { arrOf, claudeJson, claudeText, extractJson, obj, str } from "../_shared/anthropic.ts";
import { enforceRateLimit, logActivity, requireMember } from "../_shared/auth.ts";
import { brandContext } from "../_shared/brand.ts";
import { handler, HttpError, json } from "../_shared/cors.ts";
import { getSecret } from "../_shared/secrets.ts";

/**
 * actions:
 *  - (default) "scout": Claude + live web search → current trends with brand ideas
 *  - "ideas":  more brand ideas for one trend
 *  - "shots":  storyboard (shot list with text-to-video prompts) from a prompt built by the client
 */
const IDEA = obj({ title: str, hook: str, format: { type: "string", enum: ["reel", "carousel", "linkedin", "x_thread", "ig_post"] }, angle: str });

const SHOTS_SCHEMA = obj({
  title: str,
  hookText: str,
  cta: str,
  music: obj({ mood: str, bpm: { type: "number" }, hint: str }),
  shots: arrOf(
    obj({
      duration: { type: "number" },
      description: str,
      prompt: str,
      camera: str,
      onScreenText: str,
      voiceover: str,
      transition: { type: "string", enum: ["cut", "flash", "zoom", "whip"] },
    }),
  ),
});

Deno.serve(
  handler(async (req) => {
    const caller = await requireMember(req, "editor");
    const body = await req.json();
    const action = body.action ?? "scout";
    await enforceRateLimit(caller, `ai.${action}`, Number(Deno.env.get("AI_RATE_LIMIT_PER_HOUR") ?? 60));
    const apiKey = await getSecret(caller.admin, "anthropic_api_key", "ANTHROPIC_API_KEY");
    if (!apiKey) throw new HttpError(412, "Chybí Anthropic API klíč — nastavte ho v Nastavení → API klíče.");

    if (action === "shots") {
      if (typeof body.prompt !== "string" || body.prompt.length > 40_000) throw new HttpError(400, "Neplatné zadání");
      const plan = await claudeJson<any>({ apiKey, system: "Jsi režisér virálních krátkých videí. Odpovídej přesně podle schématu.", user: body.prompt, schema: SHOTS_SCHEMA, effort: "medium" });
      await logActivity(caller, "ai.shots", { shots: plan.shots?.length ?? 0 });
      return json({ plan });
    }

    if (action === "ideas") {
      const t = body.trend ?? {};
      const out = await claudeJson<{ ideas: any[] }>({
        apiKey,
        system: `Jsi kreativní stratég sociálních sítí. Píšeš česky.\n${brandContext(body.brand ?? {})}`,
        user: `Trend: ${t.name}\n${t.description}\nProč teď: ${t.whyNow}\nStruktura: ${(t.structure ?? []).join(" → ")}\n\nVymysli 5 konkrétních nápadů, jak trend využít pro značku. Každý natočitelný mobilem za 1 den, s jasným hookem. Žádná loga ani postavy cizích značek.`,
        schema: obj({ ideas: arrOf(IDEA) }),
        effort: "medium",
        maxTokens: 6000,
      });
      return json({ ideas: out.ideas });
    }

    // scout — live web search
    const today = String(body.today ?? new Date().toISOString().slice(0, 10));
    const focus = String(body.focus ?? "").slice(0, 200);
    const text = await claudeText({
      apiKey,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 8, user_location: { type: "approximate", country: "CZ", timezone: "Europe/Prague" } }],
      system: `Jsi trend analytik pro český Instagram a TikTok. Dnes je ${today}. Hledej na webu, co se děje TEĎ (posledních 14 dní a příštích 30 dní): popkulturní události (hry, filmy, seriály, sport, hudba), virální meme formáty a zvuky, svátky a nákupní události v ČR. Ověřuj data událostí. Ke každému trendu vymysli 3 nápady pro značku.\n${brandContext(body.brand ?? {})}`,
      user: `${focus ? `Zaměření: ${focus}\n` : ""}Najdi 8 trendů s nejvyšším potenciálem pro značku. Na konci odpověz JEDNÍM JSON polem (bez dalšího textu za ním):
[{"name": string, "kind": "meme"|"popculture"|"event"|"audio"|"format"|"challenge", "description": string, "whyNow": string (s konkrétním faktem z webu),
  "lifecycle": "rising"|"peak"|"fading"|"evergreen", "heat": 0-100, "brandFit": 0-100, "date": "YYYY-MM-DD"|null, "windowDays": number|null,
  "platforms": string[], "structure": string[], "examples": string[] (krátké popisy nebo URL zdrojů), "hashtags": string[],
  "ideas": [{"title": string, "hook": string, "format": "reel"|"carousel"|"linkedin"|"x_thread"|"ig_post", "angle": string}]}]`,
      effort: "medium",
    });
    const trends = extractJson<any[]>(text);
    if (!Array.isArray(trends)) throw new HttpError(502, "Neplatná odpověď");
    await logActivity(caller, "ai.scout", { count: trends.length, focus });
    return json({ trends, source: "Claude + živé hledání na webu" });
  }),
);
