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
  extraInstructions?: string;
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
