export type Platform = "instagram" | "tiktok" | "youtube" | "linkedin" | "x";
export type ContentFormat = "reel" | "carousel" | "linkedin" | "x_thread" | "ig_post";
export type ContentStatus = "idea" | "generated" | "to_shoot" | "done" | "published";
export type TeamRole = "admin" | "editor" | "viewer";

export interface Product {
  name: string;
  price: string;
  description: string;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  pains: string[];
  desires: string[];
}

export interface ReferencePost {
  id: string;
  platform: Platform;
  url: string;
  text: string;
  why: string;
}

export interface BrandProfile {
  id: string;
  name: string;
  website: string;
  description: string;
  products: Product[];
  usps: string[];
  personas: Persona[];
  tone: string[];
  toneNotes: string;
  forbiddenWords: string[];
  defaultCta: string;
  hashtags: string[];
  keywords: string[];
  referencePosts: ReferencePost[];
  language: "cs" | "en";
  updatedAt: string;
}

export interface Creator {
  id: string;
  name: string;
  handle: string;
  platform: Platform;
  niche: string[];
  followers: number;
  avgViews: number;
  engagementRate: number;
  growth30d: number;
  language: "cs" | "en" | "sk";
  avatarColor: string;
  profileUrl?: string;
  whyFollow: string;
  source: "seed" | "manual" | "apify" | "youtube";
}

export type ContentTag =
  | "Edukace"
  | "Kontroverze"
  | "Příběh"
  | "Humor"
  | "Tutoriál"
  | "Před/Po"
  | "Mýtus"
  | "Behind the scenes"
  | "Case study"
  | "Trend";

export interface PostAnalysis {
  hook: { pattern: string; text: string; why: string };
  retention: { mechanisms: string[]; why: string };
  storytelling: { structure: string; beats: string[] };
  visual: { style: string; notes: string[] };
  cta: { type: string; text: string; why: string };
  takeaways: string[];
  remixAngle: string;
}

export interface ViralPost {
  id: string;
  creatorId?: string;
  platform: Platform;
  format: ContentFormat;
  url?: string;
  title: string;
  hookText: string;
  caption: string;
  transcript?: string;
  thumbnailGradient: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  durationSec?: number;
  postedAt: string;
  tags: ContentTag[];
  viralScore: number;
  analysis?: PostAnalysis;
  savedToSwipe: boolean;
  source: "seed" | "manual" | "apify" | "youtube";
}

export interface Hook {
  onScreen: string;
  spoken: string;
  pattern: string;
}

export interface ScriptBeat {
  time: string;
  label: string;
  spoken: string;
  onScreen: string;
  visual: string;
}

export interface Slide {
  index: number;
  headline: string;
  body: string;
  visual: string;
  /** English prompt for an image model (Midjourney, Flux, DALL·E, Imagen…). */
  imagePrompt?: string;
  /** "Tehdy vs. dnes" pairs: labels and prompts for both halves. */
  compare?: { thenLabel: string; nowLabel: string; thenPrompt: string; nowPrompt: string };
}

export interface GeneratedContent {
  format: ContentFormat;
  platform: Platform;
  title: string;
  hooks: Hook[];
  script: ScriptBeat[];
  visualDirection: { camera: string[]; broll: string[]; editing: string[]; captions: string };
  post: { firstLine: string; body: string; cta: string };
  slides: Slide[];
  caption: string;
  hashtags: string[];
  meta: { engine: "local" | "claude"; generatedAt: string; referenceId?: string; topic: string; goal: string };
}

export interface ContentItem {
  id: string;
  title: string;
  format: ContentFormat;
  platform: Platform;
  status: ContentStatus;
  topic: string;
  referencePostId?: string;
  output?: GeneratedContent;
  notes: string;
  scheduledFor?: string; // yyyy-MM-dd
  position: number;
  crmSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  role: TeamRole;
  mode: "demo" | "supabase";
}

export interface GenerateRequest {
  format: ContentFormat;
  platform: Platform;
  topic: string;
  goal: "reach" | "trust" | "leads" | "sales";
  personaId?: string;
  reference?: ViralPost;
  trend?: Trend;
  extraInstructions?: string;
}

/* ------------------------------- Trends -------------------------------- */

export type TrendKind = "meme" | "popculture" | "event" | "audio" | "format" | "challenge";
export type TrendLifecycle = "rising" | "peak" | "fading" | "evergreen";

export interface TrendIdea {
  title: string;
  hook: string;
  format: ContentFormat;
  angle: string;
}

export interface Trend {
  id: string;
  name: string;
  kind: TrendKind;
  description: string;
  whyNow: string;
  lifecycle: TrendLifecycle;
  /** 0–100: how hot it is right now. */
  heat: number;
  /** 0–100: how well it fits the brand. */
  brandFit: number;
  /** ISO date of the event / peak (events and pop-culture moments). */
  date?: string;
  /** How many days the window stays open. */
  windowDays?: number;
  platforms: Platform[];
  /** Step-by-step structure of the format. */
  structure: string[];
  examples: string[];
  ideas: TrendIdea[];
  hashtags: string[];
  source: "seed" | "claude" | "web" | "manual";
  saved: boolean;
  createdAt: string;
}

/* -------------------------------- Video -------------------------------- */

export type VideoStyle = "ugc" | "cinematic" | "meme_edit" | "game" | "retro_vhs" | "product_3d" | "kinetic_text";
export type CaptionStyle = "bold" | "karaoke" | "minimal" | "game";
export type Transition = "cut" | "flash" | "zoom" | "whip";
export type ShotStatus = "draft" | "generating" | "ready" | "failed";

/* ------------------------------ Media & scenes ----------------------------- */

export type MediaKind = "image" | "video" | "audio";

export interface MediaItem {
  id: string;
  name: string;
  kind: MediaKind;
  url: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  source: "upload" | "graphic" | "ai_svg" | "ai_api" | "recording";
  /** False for session-only object URLs (plain demo without storage). */
  persistent: boolean;
  tags: string[];
  createdAt: string;
}

/** Animated graphic templates — rendered as images, carousel slides or video scenes. */
export type SceneType = "phone" | "browser" | "notifications" | "counter" | "compare" | "checklist" | "quote" | "meme" | "headline";

export interface SceneParams {
  type: SceneType;
  headline: string;
  subline: string;
  /** Primary image / screenshot (URL). */
  media?: string;
  /** Second image for compare. */
  media2?: string;
  items: string[];
  value: number;
  labelA: string;
  labelB: string;
  url: string;
  author: string;
  theme: "dark" | "light" | "brand";
}

export interface Shot {
  id: string;
  /** Animated template drawn when the shot has no clip of its own. */
  scene?: SceneParams;
  duration: number; // seconds
  description: string; // Czech, what we see
  prompt: string; // English prompt for text-to-video models
  camera: string;
  onScreenText: string;
  voiceover: string;
  transition: Transition;
  status: ShotStatus;
  videoUrl?: string;
  imageUrl?: string;
  provider?: string;
  model?: string;
  jobId?: string;
  error?: string;
}

export interface VideoProject {
  id: string;
  title: string;
  topic: string;
  contentItemId?: string;
  style: VideoStyle;
  aspect: "9:16" | "1:1" | "16:9";
  captionStyle: CaptionStyle;
  hookText: string;
  music: { mood: string; bpm: number; hint: string };
  musicUrl?: string;
  voiceoverUrl?: string;
  shots: Shot[];
  cta: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyzeRequest {
  url?: string;
  platform: Platform;
  hookText?: string;
  caption?: string;
  transcript?: string;
  views?: number;
  likes?: number;
  comments?: number;
}

export interface RadarSearchRequest {
  keywords: string[];
  platforms: Platform[];
  language: "cs" | "en" | "any";
  minViews: number;
}
