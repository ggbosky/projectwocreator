/**
 * AI facade. Demo mode → local engine. Supabase mode → Edge Functions, which
 * hold the Anthropic / Apify keys server-side (never shipped to the browser).
 */
import { env } from "@/lib/env";
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
  ViralPost,
} from "@/lib/types";
import { sleep } from "@/lib/utils";
import { analyzeLocal, generateLocal } from "./localEngine";
import { searchLocal } from "./localRadar";

export const aiEngineLabel = env.authMode === "supabase" ? "Claude (Edge Function)" : "Lokální demo engine";

export async function generateContent(req: GenerateRequest, brand: BrandProfile): Promise<GeneratedContent> {
  if (env.authMode === "supabase") {
    const { content } = await invokeFunction<{ content: GeneratedContent }>("ai-generate", {
      request: { ...req, reference: req.reference ? stripReference(req.reference) : undefined },
      brand,
    });
    return content;
  }
  await sleep(900 + Math.random() * 600);
  return generateLocal(req, brand);
}

export async function analyzePost(
  req: AnalyzeRequest,
  brand: BrandProfile,
): Promise<{ analysis: PostAnalysis; tags: ContentTag[]; title: string; metrics?: { views: number; likes: number; comments: number } }> {
  if (env.authMode === "supabase") {
    return invokeFunction("ai-analyze", { request: req, brand: { name: brand.name, description: brand.description } });
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
      // Fall through to the local library so the radar stays useful without Apify/YouTube keys.
      console.warn("viral-radar fallback:", e);
    }
  }
  await sleep(700);
  return { ...searchLocal(req, existing), source: "Knihovna ukázkových dat" };
}

function stripReference(p: ViralPost) {
  const { id, platform, format, title, hookText, caption, transcript, analysis, tags, views, viralScore } = p;
  return { id, platform, format, title, hookText, caption, transcript, analysis, tags, views, viralScore };
}
