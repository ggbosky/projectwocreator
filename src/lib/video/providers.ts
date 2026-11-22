/**
 * Video / image model catalog. "api" models are generated directly through the
 * `ai-media` Edge Function (keys server-side). "external" tools get a
 * copy-ready prompt in that tool's preferred phrasing; the user generates the
 * clip there and drops the file back into the storyboard.
 */
import type { Shot, VideoProject } from "@/lib/types";
import { STYLE_GUIDE } from "@/lib/ai/prompts";

export interface ApiModel {
  id: string;
  provider: "fal" | "replicate";
  label: string;
  kind: "video" | "image";
  note: string;
  maxDuration: number;
}

/** Model ids change often — any id from fal.ai / Replicate can also be typed in the UI. */
export const API_MODELS: ApiModel[] = [
  { id: "fal-ai/veo3/fast", provider: "fal", label: "Google Veo 3 Fast", kind: "video", note: "Nejrealističtější, umí i zvuk", maxDuration: 8 },
  { id: "fal-ai/kling-video/v2.5-turbo/pro/text-to-video", provider: "fal", label: "Kling 2.5 Turbo Pro", kind: "video", note: "Skvělý pohyb lidí, dobrá cena", maxDuration: 10 },
  { id: "fal-ai/minimax/hailuo-02/standard/text-to-video", provider: "fal", label: "MiniMax Hailuo 02", kind: "video", note: "Levný, rychlý, fyzika", maxDuration: 10 },
  { id: "fal-ai/bytedance/seedance/v1/pro/text-to-video", provider: "fal", label: "Seedance 1 Pro", kind: "video", note: "Filmové záběry, multi-shot", maxDuration: 10 },
  { id: "fal-ai/wan/v2.2-a14b/text-to-video", provider: "fal", label: "Wan 2.2", kind: "video", note: "Open-source, nejlevnější", maxDuration: 5 },
  { id: "fal-ai/flux-pro/v1.1-ultra", provider: "fal", label: "FLUX 1.1 Pro Ultra", kind: "image", note: "Fotorealistické obrázky na karusely", maxDuration: 0 },
  { id: "fal-ai/imagen4/preview", provider: "fal", label: "Google Imagen 4", kind: "image", note: "Čisté produktové a lifestyle fotky", maxDuration: 0 },
  { id: "black-forest-labs/flux-1.1-pro", provider: "replicate", label: "FLUX 1.1 Pro (Replicate)", kind: "image", note: "Alternativa přes Replicate", maxDuration: 0 },
];

export interface ExternalTool {
  id: string;
  label: string;
  url: string;
  format: (shot: Shot, p: VideoProject) => string;
}

const styleOf = (p: VideoProject) => STYLE_GUIDE[p.style].prompt;
const ar = (p: VideoProject) => p.aspect;

export const EXTERNAL_TOOLS: ExternalTool[] = [
  {
    id: "sora",
    label: "OpenAI Sora",
    url: "https://sora.chatgpt.com/",
    format: (s, p) => `${s.prompt}\n\nCamera: ${s.camera}. Duration: ${Math.round(s.duration)}s. Aspect ratio ${ar(p)}. Style: ${styleOf(p)}. No on-screen text, no logos.`,
  },
  {
    id: "veo",
    label: "Google Veo (Flow / Gemini)",
    url: "https://labs.google/fx/tools/flow",
    format: (s, p) => `Shot: ${s.prompt}\nCamera movement: ${s.camera}\nLook: ${styleOf(p)}\nAudio: ambient sound only, no music, no dialogue\nFormat: ${ar(p)}, ${Math.round(s.duration)} seconds`,
  },
  {
    id: "kling",
    label: "Kling AI",
    url: "https://app.klingai.com/",
    format: (s, p) => `${s.prompt}, ${s.camera}, ${styleOf(p)}\nNegative: text, watermark, logo, distorted hands, blurry faces`,
  },
  {
    id: "runway",
    label: "Runway Gen-4",
    url: "https://app.runwayml.com/",
    format: (s, p) => `[${s.camera}] ${s.prompt}. ${styleOf(p)}.`,
  },
  {
    id: "higgsfield",
    label: "Higgsfield",
    url: "https://higgsfield.ai/",
    format: (s, p) => `${s.prompt} | camera preset: ${s.camera} | ${styleOf(p)} | ${ar(p)}`,
  },
  {
    id: "hailuo",
    label: "Hailuo / MiniMax",
    url: "https://hailuoai.video/",
    format: (s, p) => `${s.prompt} [${s.camera}] ${styleOf(p)}`,
  },
  {
    id: "midjourney",
    label: "Midjourney (statický záběr)",
    url: "https://www.midjourney.com/",
    format: (s, p) => `${s.prompt}, ${styleOf(p)} --ar ${ar(p)} --style raw --v 7`,
  },
];
