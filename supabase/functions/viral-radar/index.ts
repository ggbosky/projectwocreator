// deno-lint-ignore-file no-explicit-any
import { num, runActor } from "../_shared/apify.ts";
import { enforceRateLimit, logActivity, requireMember } from "../_shared/auth.ts";
import { handler, HttpError, json } from "../_shared/cors.ts";
import { getSecret } from "../_shared/secrets.ts";

/**
 * Viral Radar live search.
 *  - TikTok via Apify actor clockworks~tiktok-scraper (search queries)
 *  - Instagram via Apify actor apify~instagram-hashtag-scraper
 *  - YouTube Shorts via YouTube Data API v3
 * Results are normalised to the app's Creator / ViralPost shape. The client
 * persists them (RLS applies), this function never writes posts itself.
 */

const GRADIENTS = [
  "from-orange-500/80 via-rose-600/60 to-zinc-900",
  "from-violet-500/80 via-indigo-700/60 to-zinc-900",
  "from-teal-500/80 via-emerald-700/60 to-zinc-900",
  "from-sky-500/80 via-blue-700/60 to-zinc-900",
  "from-pink-500/80 via-fuchsia-700/60 to-zinc-900",
];
const AVATARS = ["from-orange-500 to-rose-500", "from-indigo-500 to-violet-600", "from-emerald-500 to-teal-600", "from-sky-500 to-blue-600"];

function viralScore(p: { views: number; likes: number; comments: number; shares: number; saves: number; followers?: number }) {
  const er = p.views ? ((p.likes + p.comments * 2 + p.shares * 3 + p.saves * 3) / p.views) * 100 : 0;
  const ratio = p.followers ? p.views / Math.max(p.followers, 1) : 1.5;
  // Same formula as src/lib/utils.ts → computeViralScore
  const s =
    Math.min(30, Math.max(0, (Math.log10(Math.max(p.views, 1)) - 3) * 8)) +
    Math.min(25, Math.log2(1 + ratio) * 6) +
    Math.min(25, er * 1.4) +
    Math.min(20, ((p.shares + p.saves) / Math.max(p.views, 1)) * 400);
  return Math.max(1, Math.min(99, Math.round(s * 1.1)));
}

const firstLine = (t = "") => t.split(/\n|(?<=[.!?])\s/)[0]?.slice(0, 160) ?? "";
const pick = <T,>(a: T[], i: number) => a[i % a.length];

async function tiktok(token: string, keywords: string[], language: string) {
  const items = await runActor(token, "clockworks~tiktok-scraper", {
    searchQueries: keywords,
    resultsPerPage: 12,
    searchSection: "/video",
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    proxyCountryCode: language === "cs" ? "CZ" : "None",
  });
  const creators = new Map<string, any>();
  const posts = items.map((it: any, i: number) => {
    const a = it.authorMeta ?? {};
    const handle = `@${a.name ?? "unknown"}`;
    const followers = num(a.fans);
    if (!creators.has(handle)) {
      creators.set(handle, {
        id: crypto.randomUUID(),
        name: a.nickName || a.name || handle,
        handle,
        platform: "tiktok",
        niche: keywords,
        followers,
        avgViews: num(it.playCount),
        engagementRate: 0,
        growth30d: 0,
        language: language === "any" ? "en" : language,
        avatarColor: pick(AVATARS, i),
        profileUrl: a.profileUrl,
        whyFollow: a.signature?.slice(0, 140) || "Nalezeno Viral Radarem (TikTok).",
        source: "apify",
      });
    }
    const p = { views: num(it.playCount), likes: num(it.diggCount), comments: num(it.commentCount), shares: num(it.shareCount), saves: num(it.collectCount) };
    return {
      id: crypto.randomUUID(),
      creatorId: creators.get(handle).id,
      platform: "tiktok",
      format: "reel",
      url: it.webVideoUrl,
      title: firstLine(it.text) || "TikTok video",
      hookText: firstLine(it.text),
      caption: it.text ?? "",
      thumbnailGradient: pick(GRADIENTS, i),
      ...p,
      durationSec: num(it.videoMeta?.duration) || undefined,
      postedAt: it.createTimeISO ?? new Date().toISOString(),
      tags: ["Trend"],
      viralScore: viralScore({ ...p, followers }),
      savedToSwipe: false,
      source: "apify",
    };
  });
  return { posts, creators: [...creators.values()] };
}

async function instagram(token: string, keywords: string[]) {
  const hashtags = keywords.map((k) => k.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "")).filter(Boolean);
  const items = await runActor(token, "apify~instagram-hashtag-scraper", { hashtags, resultsLimit: 12, resultsType: "reels" });
  return {
    creators: [],
    posts: items
      .filter((it: any) => it.caption || it.url)
      .map((it: any, i: number) => {
        const p = { views: num(it.videoPlayCount ?? it.videoViewCount), likes: num(it.likesCount), comments: num(it.commentsCount), shares: 0, saves: 0 };
        return {
          id: crypto.randomUUID(),
          platform: "instagram",
          format: it.type === "Sidecar" ? "carousel" : "reel",
          url: it.url,
          title: firstLine(it.caption) || `@${it.ownerUsername}`,
          hookText: firstLine(it.caption),
          caption: it.caption ?? "",
          thumbnailGradient: pick(GRADIENTS, i + 2),
          ...p,
          durationSec: num(it.videoDuration) || undefined,
          postedAt: it.timestamp ?? new Date().toISOString(),
          tags: ["Trend"],
          viralScore: viralScore(p),
          savedToSwipe: false,
          source: "apify",
        };
      }),
  };
}

async function youtube(key: string, keywords: string[], language: string, minViews: number) {
  const q = encodeURIComponent(keywords.join(" "));
  const lang = language === "any" ? "" : `&relevanceLanguage=${language}`;
  const search = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=short&order=viewCount&maxResults=15&q=${q}${lang}&key=${key}`).then((r) => r.json());
  if (search.error) throw new Error(`YouTube: ${search.error.message}`);
  const ids = (search.items ?? []).map((i: any) => i.id?.videoId).filter(Boolean);
  if (!ids.length) return { posts: [], creators: [] };
  const videos = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${ids.join(",")}&key=${key}`).then((r) => r.json());
  const channelIds = [...new Set((videos.items ?? []).map((v: any) => v.snippet.channelId))];
  const channels = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelIds.join(",")}&key=${key}`).then((r) => r.json());
  const creators = new Map<string, any>();
  (channels.items ?? []).forEach((c: any, i: number) => {
    const followers = num(c.statistics?.subscriberCount);
    creators.set(c.id, {
      id: crypto.randomUUID(),
      name: c.snippet.title,
      handle: c.snippet.customUrl ?? c.id,
      platform: "youtube",
      niche: keywords,
      followers,
      avgViews: followers ? Math.round(num(c.statistics?.viewCount) / Math.max(num(c.statistics?.videoCount), 1)) : 0,
      engagementRate: 0,
      growth30d: 0,
      language: language === "any" ? "en" : language,
      avatarColor: pick(AVATARS, i),
      profileUrl: `https://www.youtube.com/channel/${c.id}`,
      whyFollow: (c.snippet.description ?? "").slice(0, 140) || "Nalezeno Viral Radarem (YouTube).",
      source: "youtube",
    });
  });
  const posts = (videos.items ?? [])
    .map((v: any, i: number) => {
      const ch = creators.get(v.snippet.channelId);
      const p = { views: num(v.statistics?.viewCount), likes: num(v.statistics?.likeCount), comments: num(v.statistics?.commentCount), shares: 0, saves: 0 };
      return {
        id: crypto.randomUUID(),
        creatorId: ch?.id,
        platform: "youtube",
        format: "reel",
        url: `https://www.youtube.com/shorts/${v.id}`,
        title: v.snippet.title,
        hookText: v.snippet.title,
        caption: (v.snippet.description ?? "").slice(0, 600),
        thumbnailGradient: pick(GRADIENTS, i + 1),
        ...p,
        postedAt: v.snippet.publishedAt,
        tags: ["Trend"],
        viralScore: viralScore({ ...p, followers: ch?.followers }),
        savedToSwipe: false,
        source: "youtube",
      };
    })
    .filter((p: any) => p.views >= minViews);
  return { posts, creators: [...creators.values()] };
}

Deno.serve(
  handler(async (req) => {
    const caller = await requireMember(req, "editor");
    await enforceRateLimit(caller, "radar.search", Number(Deno.env.get("RADAR_RATE_LIMIT_PER_HOUR") ?? 20));
    const body = (await req.json()) as { keywords: string[]; platforms: string[]; language: string; minViews: number };
    const keywords = (body.keywords ?? []).map((k) => String(k).trim()).filter(Boolean).slice(0, 5);
    if (!keywords.length) throw new HttpError(400, "Zadejte alespoň jedno klíčové slovo");
    const want = (p: string) => !body.platforms?.length || body.platforms.includes(p);

    const [apify, yt] = await Promise.all([
      getSecret(caller.admin, "apify_token", "APIFY_TOKEN"),
      getSecret(caller.admin, "youtube_api_key", "YOUTUBE_API_KEY"),
    ]);

    const jobs: Promise<{ posts: any[]; creators: any[] }>[] = [];
    const sources: string[] = [];
    if (apify && want("tiktok")) (jobs.push(tiktok(apify, keywords, body.language)), sources.push("TikTok/Apify"));
    if (apify && want("instagram")) (jobs.push(instagram(apify, keywords)), sources.push("Instagram/Apify"));
    if (yt && want("youtube")) (jobs.push(youtube(yt, keywords, body.language, body.minViews ?? 0)), sources.push("YouTube API"));
    if (!jobs.length) return json({ posts: [], creators: [], source: "Žádný zdroj (chybí Apify / YouTube klíč)" });

    const settled = await Promise.allSettled(jobs);
    const posts: any[] = [];
    const creators: any[] = [];
    settled.forEach((s) => {
      if (s.status === "fulfilled") {
        posts.push(...s.value.posts);
        creators.push(...s.value.creators);
      } else console.warn("radar source failed", s.reason);
    });

    await logActivity(caller, "radar.search", { keywords, sources });
    return json({
      posts: posts.filter((p) => p.views >= (body.minViews ?? 0)).sort((a, b) => b.viralScore - a.viralScore).slice(0, 40),
      creators,
      source: sources.join(" · "),
    });
  }),
);
