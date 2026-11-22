// deno-lint-ignore-file no-explicit-any
import { arrOf, claudeJson, obj, str, strArr } from "../_shared/anthropic.ts";
import { num, runActor } from "../_shared/apify.ts";
import { enforceRateLimit, logActivity, requireMember } from "../_shared/auth.ts";
import { handler, HttpError, json } from "../_shared/cors.ts";
import { getSecret } from "../_shared/secrets.ts";

const TAGS = ["Edukace", "Kontroverze", "Příběh", "Humor", "Tutoriál", "Před/Po", "Mýtus", "Behind the scenes", "Case study", "Trend"];

const SCHEMA = obj({
  title: str,
  tags: arrOf({ type: "string", enum: TAGS }),
  analysis: obj({
    hook: obj({ pattern: str, text: str, why: str }),
    retention: obj({ mechanisms: strArr, why: str }),
    storytelling: obj({ structure: str, beats: strArr }),
    visual: obj({ style: str, notes: strArr }),
    cta: obj({ type: str, text: str, why: str }),
    takeaways: strArr,
    remixAngle: str,
  }),
});

/** Optionally enrich a pasted URL with caption/metrics via Apify. */
async function enrich(token: string | null, url: string | undefined, platform: string) {
  if (!token || !url) return null;
  try {
    if (platform === "instagram") {
      const [item] = await runActor(token, "apify~instagram-scraper", { directUrls: [url], resultsType: "posts", resultsLimit: 1 }, 60);
      if (!item) return null;
      return {
        caption: item.caption as string,
        views: num(item.videoPlayCount ?? item.videoViewCount),
        likes: num(item.likesCount),
        comments: num(item.commentsCount),
        transcript: undefined,
      };
    }
    if (platform === "tiktok") {
      const [item] = await runActor(token, "clockworks~tiktok-scraper", { postURLs: [url], resultsPerPage: 1, shouldDownloadVideos: false }, 60);
      if (!item) return null;
      return {
        caption: item.text as string,
        views: num(item.playCount),
        likes: num(item.diggCount),
        comments: num(item.commentCount),
        transcript: undefined,
      };
    }
  } catch (e) {
    console.warn("apify enrich failed", e);
  }
  return null;
}

Deno.serve(
  handler(async (req) => {
    const caller = await requireMember(req, "editor");
    await enforceRateLimit(caller, "ai.analyze", Number(Deno.env.get("AI_RATE_LIMIT_PER_HOUR") ?? 60));
    const { request, brand } = (await req.json()) as { request: any; brand: any };
    if (!request?.platform) throw new HttpError(400, "Chybí platforma");

    const apiKey = await getSecret(caller.admin, "anthropic_api_key", "ANTHROPIC_API_KEY");
    if (!apiKey) throw new HttpError(412, "Chybí Anthropic API klíč — nastavte ho v Nastavení → API klíče.");
    const apifyToken = await getSecret(caller.admin, "apify_token", "APIFY_TOKEN");

    const extra = await enrich(apifyToken, request.url, request.platform);
    const caption = request.caption || extra?.caption || "";
    const views = request.views || extra?.views || 0;
    const likes = request.likes || extra?.likes || 0;
    const comments = request.comments || extra?.comments || 0;
    if (!request.hookText && !caption && !request.transcript) {
      throw new HttpError(422, "Z odkazu se nepodařilo načíst obsah. Vložte prosím hook nebo popisek ručně.");
    }

    const system = `Jsi analytik virálního obsahu. Rozebíráš, PROČ příspěvek fungoval, konkrétně a prakticky, česky.
Značka, pro kterou hledáš inspiraci: ${brand?.name ?? "Project Two"} — ${brand?.description ?? ""}`;
    const user = `Platforma: ${request.platform}
URL: ${request.url ?? "—"}
Metriky: ${views} zhlédnutí, ${likes} lajků, ${comments} komentářů
Hook: ${request.hookText ?? "—"}
Popisek: ${caption || "—"}
Přepis: ${request.transcript ?? "—"}

Rozeber: hook (vzorec + proč funguje), retenční mechanismy, storytelling strukturu (beats), vizuální styl, CTA,
3–5 takeaways a "remixAngle" = jedna konkrétní myšlenka, jak stejnou strukturu použít pro značku.
"title" = krátký výstižný název příspěvku. "tags" = 1–3 štítky.`;

    const out = await claudeJson<any>({ apiKey, system, user, schema: SCHEMA, effort: "low", maxTokens: 8000 });
    await logActivity(caller, "ai.analyze", { platform: request.platform, enriched: Boolean(extra) });
    return json({ ...out, metrics: { views, likes, comments } });
  }),
);
