/**
 * AI facade with three engines, picked automatically:
 *  1. "edge"   — Supabase Edge Functions (Claude with server-held keys, web search, video APIs)
 *  2. "claude" — Claude called from the page via the claude.ai Artifact runtime (`sample`)
 *  3. "local"  — deterministic templates, always available offline
 */
import { SEED_TRENDS } from "@/data/trends";
import { env } from "@/lib/env";
import { sampleErrorMessage, useCapability } from "@/lib/runtime";
import { invokeFunction } from "@/lib/supabase";
import type {
  AnalyzeRequest,
  BrandProfile,
  ContentTag,
  Creator,
  GenerateRequest,
  GeneratedContent,
  PostAnalysis,
  RadarSearchRequest,
  Shot,
  Trend,
  TrendIdea,
  VideoStyle,
  ViralPost,
} from "@/lib/types";
import { sleep, uid } from "@/lib/utils";
import { analyzeLocal, generateLocal } from "./localEngine";
import { searchLocal } from "./localRadar";
import { planShotsLocal, type ShotPlan } from "./localVideo";
import { analyzePrompt, contentPrompt, shotPlanPrompt, trendIdeasPrompt, trendScoutPrompt } from "./prompts";

export type Engine = "edge" | "claude" | "local";

let enginePromise: Promise<Engine> | null = null;
let claudeRefused = false;

export function resolveEngine(): Promise<Engine> {
  if (env.authMode === "supabase") return Promise.resolve("edge");
  if (claudeRefused) return Promise.resolve("local");
  if (!enginePromise) enginePromise = useCapability("sample").then((s) => (s ? "claude" : "local"));
  return enginePromise;
}

export const ENGINE_LABEL: Record<Engine, string> = {
  edge: "Claude (server)",
  claude: "Claude",
  local: "Lokální šablony",
};

/** Runs a Claude JSON call; on refusal of consent falls back to local for the session. */
async function claudeJson<T>(prompt: string, tier: "quick" | "default" | "complex" = "default", signal?: AbortSignal): Promise<T> {
  const sample = await useCapability("sample");
  if (!sample) throw new Error("Claude není dostupný");
  try {
    return await sample.json<T>(prompt, { modelTier: tier, signal });
  } catch (e) {
    if ((e as { code?: string }).code === "not_granted") {
      claudeRefused = true;
      enginePromise = Promise.resolve("local");
    }
    throw new Error(sampleErrorMessage(e));
  }
}

/* ------------------------------ normalizers ------------------------------ */

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || d);

function normalizeContent(raw: Record<string, unknown>, req: GenerateRequest, engine: "claude" | "local"): GeneratedContent {
  const vd = (raw.visualDirection ?? {}) as Record<string, unknown>;
  const post = (raw.post ?? {}) as Record<string, unknown>;
  return {
    format: req.format,
    platform: req.platform,
    title: str(raw.title, req.topic),
    hooks: arr<Record<string, unknown>>(raw.hooks).map((h) => ({ onScreen: str(h.onScreen), spoken: str(h.spoken), pattern: str(h.pattern) })),
    script: arr<Record<string, unknown>>(raw.script).map((b) => ({
      time: str(b.time),
      label: str(b.label),
      spoken: str(b.spoken),
      onScreen: str(b.onScreen),
      visual: str(b.visual),
    })),
    visualDirection: {
      camera: arr<string>(vd.camera),
      broll: arr<string>(vd.broll),
      editing: arr<string>(vd.editing),
      captions: str(vd.captions),
    },
    post: { firstLine: str(post.firstLine), body: str(post.body), cta: str(post.cta) },
    slides: arr<Record<string, unknown>>(raw.slides).map((s, i) => {
      const c = s.compare as Record<string, unknown> | null | undefined;
      return {
        index: num(s.index, i + 1),
        headline: str(s.headline),
        body: str(s.body),
        visual: str(s.visual),
        imagePrompt: str(s.imagePrompt) || undefined,
        compare: c && typeof c === "object" ? { thenLabel: str(c.thenLabel, "Tehdy"), nowLabel: str(c.nowLabel, "Dnes"), thenPrompt: str(c.thenPrompt), nowPrompt: str(c.nowPrompt) } : undefined,
      };
    }),
    caption: str(raw.caption),
    hashtags: arr<string>(raw.hashtags),
    meta: { engine, generatedAt: new Date().toISOString(), referenceId: req.reference?.id, topic: req.topic, goal: req.goal },
  };
}

function normalizeTrend(raw: Record<string, unknown>, source: Trend["source"]): Trend {
  const kinds = ["meme", "popculture", "event", "audio", "format", "challenge"];
  const life = ["rising", "peak", "fading", "evergreen"];
  return {
    id: uid(),
    name: str(raw.name, "Trend"),
    kind: (kinds.includes(str(raw.kind)) ? raw.kind : "format") as Trend["kind"],
    description: str(raw.description),
    whyNow: str(raw.whyNow),
    lifecycle: (life.includes(str(raw.lifecycle)) ? raw.lifecycle : "rising") as Trend["lifecycle"],
    heat: Math.max(0, Math.min(100, num(raw.heat, 60))),
    brandFit: Math.max(0, Math.min(100, num(raw.brandFit, 60))),
    date: /^\d{4}-\d{2}-\d{2}$/.test(str(raw.date)) ? str(raw.date) : undefined,
    windowDays: raw.windowDays ? num(raw.windowDays) : undefined,
    platforms: arr<Trend["platforms"][number]>(raw.platforms).filter((p) => ["instagram", "tiktok", "youtube", "linkedin", "x"].includes(p)),
    structure: arr<string>(raw.structure),
    examples: arr<string>(raw.examples),
    hashtags: arr<string>(raw.hashtags),
    ideas: normalizeIdeas(raw.ideas),
    source,
    saved: false,
    createdAt: new Date().toISOString(),
  };
}

function normalizeIdeas(v: unknown): TrendIdea[] {
  const formats = ["reel", "carousel", "linkedin", "x_thread", "ig_post"];
  return arr<Record<string, unknown>>(v).map((i) => ({
    title: str(i.title),
    hook: str(i.hook),
    format: (formats.includes(str(i.format)) ? i.format : "reel") as TrendIdea["format"],
    angle: str(i.angle),
  }));
}

/* -------------------------------- content -------------------------------- */

export async function generateContent(req: GenerateRequest, brand: BrandProfile): Promise<GeneratedContent> {
  const engine = await resolveEngine();
  if (engine === "edge") {
    const { content } = await invokeFunction<{ content: GeneratedContent }>("ai-generate", {
      request: { ...req, reference: req.reference ? stripReference(req.reference) : undefined },
      brand,
    });
    return content;
  }
  if (engine === "claude") {
    const raw = await claudeJson<Record<string, unknown>>(contentPrompt(req, brand), "default");
    return normalizeContent(raw, req, "claude");
  }
  await sleep(900 + Math.random() * 600);
  return generateLocal(req, brand);
}

export async function analyzePost(
  req: AnalyzeRequest,
  brand: BrandProfile,
): Promise<{ analysis: PostAnalysis; tags: ContentTag[]; title: string; metrics?: { views: number; likes: number; comments: number } }> {
  const engine = await resolveEngine();
  if (engine === "edge") {
    return invokeFunction("ai-analyze", { request: req, brand: { name: brand.name, description: brand.description } });
  }
  if (engine === "claude") {
    const raw = await claudeJson<{ title: string; tags: ContentTag[]; analysis: PostAnalysis }>(analyzePrompt(req, brand), "default");
    if (!raw?.analysis?.hook) throw new Error("Claude vrátil neúplný rozbor, zkuste to znovu.");
    return { title: str(raw.title), tags: arr<ContentTag>(raw.tags), analysis: raw.analysis };
  }
  await sleep(1100);
  return analyzeLocal(req);
}

export async function searchRadar(
  req: RadarSearchRequest,
  existing: { creators: Creator[]; posts: ViralPost[] },
): Promise<{ creators: Creator[]; posts: ViralPost[]; source: string }> {
  if (env.authMode === "supabase") {
    try {
      const live = await invokeFunction<{ creators: Creator[]; posts: ViralPost[]; source: string }>("viral-radar", req);
      if (live.posts.length || live.creators.length) return live;
    } catch (e) {
      console.warn("viral-radar fallback:", e);
    }
  }
  await sleep(700);
  return { ...searchLocal(req, existing), source: "Knihovna ukázkových dat" };
}

/* --------------------------------- trends -------------------------------- */

export async function scoutTrends(brand: BrandProfile, focus: string): Promise<{ trends: Trend[]; source: string }> {
  const engine = await resolveEngine();
  const today = new Date().toISOString().slice(0, 10);
  if (engine === "edge") {
    const res = await invokeFunction<{ trends: Record<string, unknown>[]; source: string }>("trend-scout", { brand, focus, today });
    return { trends: res.trends.map((t) => normalizeTrend(t, "web")), source: res.source };
  }
  if (engine === "claude") {
    const raw = await claudeJson<Record<string, unknown>[]>(trendScoutPrompt(brand, today, focus), "default");
    return { trends: arr<Record<string, unknown>>(raw).map((t) => normalizeTrend(t, "claude")), source: "Claude (znalosti bez živého webu)" };
  }
  await sleep(800);
  const f = focus.toLowerCase();
  const list = SEED_TRENDS.filter((t) => !f || `${t.name} ${t.description} ${t.hashtags.join(" ")}`.toLowerCase().includes(f));
  return { trends: (list.length ? list : SEED_TRENDS).map((t) => ({ ...t, id: uid(), source: "seed" as const })), source: "Knihovna formátů" };
}

export async function trendIdeas(trend: Trend, brand: BrandProfile): Promise<TrendIdea[]> {
  const engine = await resolveEngine();
  if (engine === "edge") {
    const res = await invokeFunction<{ ideas: unknown }>("trend-scout", { action: "ideas", trend, brand });
    return normalizeIdeas(res.ideas);
  }
  if (engine === "claude") return normalizeIdeas(await claudeJson<unknown>(trendIdeasPrompt(trend, brand), "default"));
  await sleep(600);
  return trend.ideas;
}

/* --------------------------------- video --------------------------------- */

export async function planShots(
  input: { topic: string; hook?: string; script?: GeneratedContent["script"]; style: VideoStyle; seconds: number; trend?: Trend },
  brand: BrandProfile,
): Promise<ShotPlan & { engine: Engine }> {
  const engine = await resolveEngine();
  const scriptText = input.script?.map((b) => `[${b.time}] ${b.spoken} | text: ${b.onScreen} | záběr: ${b.visual}`).join("\n");
  if (engine === "edge" || engine === "claude") {
    const prompt = shotPlanPrompt({ ...input, script: scriptText }, brand);
    const raw =
      engine === "edge"
        ? (await invokeFunction<{ plan: Record<string, unknown> }>("trend-scout", { action: "shots", prompt })).plan
        : await claudeJson<Record<string, unknown>>(prompt, "default");
    const music = (raw.music ?? {}) as Record<string, unknown>;
    const transitions = ["cut", "flash", "zoom", "whip"];
    const shots = arr<Record<string, unknown>>(raw.shots).map((s) => ({
      duration: Math.max(1.5, Math.min(8, num(s.duration, 3))),
      description: str(s.description),
      prompt: str(s.prompt),
      camera: str(s.camera),
      onScreenText: str(s.onScreenText),
      voiceover: str(s.voiceover),
      transition: (transitions.includes(str(s.transition)) ? s.transition : "cut") as Shot["transition"],
    }));
    if (!shots.length) throw new Error("AI nevrátila žádné záběry, zkuste to znovu.");
    return {
      engine,
      title: str(raw.title, input.topic),
      hookText: str(raw.hookText, input.hook ?? ""),
      cta: str(raw.cta, brand.defaultCta),
      music: { mood: str(music.mood), bpm: num(music.bpm, 110), hint: str(music.hint) },
      shots,
    };
  }
  await sleep(700);
  return { ...planShotsLocal(input, brand), engine };
}

export interface MediaJob {
  jobId: string;
  provider: string;
  model: string;
}

/** Text-to-video / image via Supabase Edge Function `ai-media` (fal.ai / Replicate). */
export async function submitMedia(input: { kind: "video" | "image"; provider: string; model: string; prompt: string; aspect: string; duration?: number }): Promise<MediaJob> {
  return invokeFunction<MediaJob>("ai-media", { action: "submit", ...input });
}

export async function mediaStatus(job: MediaJob & { kind: "video" | "image" }): Promise<{ status: "queued" | "running" | "done" | "failed"; url?: string; error?: string }> {
  return invokeFunction("ai-media", { action: "status", ...job });
}

function stripReference(p: ViralPost) {
  const { id, platform, format, title, hookText, caption, transcript, analysis, tags, views, viralScore } = p;
  return { id, platform, format, title, hookText, caption, transcript, analysis, tags, views, viralScore };
}
