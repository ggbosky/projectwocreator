import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ContentFormat, ContentStatus, Platform } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(prefix = ""): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}_${id}` : id;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(".", ",")} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 100_000 ? 0 : 1).replace(".", ",")} tis.`;
  return n.toLocaleString("cs-CZ");
}

export function formatPercent(n: number, digits = 1): string {
  return `${n.toFixed(digits).replace(".", ",")} %`;
}

export function engagementRate(p: { views: number; likes: number; comments: number; shares: number; saves: number }) {
  if (!p.views) return 0;
  return ((p.likes + p.comments * 2 + p.shares * 3 + p.saves * 3) / p.views) * 100;
}

/**
 * Viral Score 0–100. Combines reach relative to creator size, weighted
 * engagement (saves & shares count more than likes) and comment depth.
 */
export function computeViralScore(p: {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  followers?: number;
}): number {
  const er = engagementRate(p);
  const reachRatio = p.followers ? p.views / Math.max(p.followers, 1) : 1.5;
  const reachScore = Math.min(30, Math.max(0, (Math.log10(Math.max(p.views, 1)) - 3) * 8)); // 1k → 0, 1M → 24
  const ratioScore = Math.min(25, Math.log2(1 + reachRatio) * 6); // views vs. audience size
  const erScore = Math.min(25, er * 1.4);
  const shareScore = Math.min(20, ((p.shares + p.saves) / Math.max(p.views, 1)) * 400); // saves+shares rate
  return Math.max(1, Math.min(99, Math.round((reachScore + ratioScore + erScore + shareScore) * 1.1)));
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function detectPlatform(url: string): Platform | null {
  const u = url.toLowerCase();
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("linkedin.com")) return "linkedin";
  if (u.includes("x.com") || u.includes("twitter.com")) return "x";
  return null;
}

export const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  x: "X",
};

export const FORMAT_LABEL: Record<ContentFormat, string> = {
  reel: "Reel / Short",
  carousel: "Karusel",
  linkedin: "LinkedIn post",
  x_thread: "X vlákno",
  ig_post: "IG post",
};

export const STATUS_LABEL: Record<ContentStatus, string> = {
  idea: "Nápady",
  generated: "Vygenerováno",
  to_shoot: "K natočení",
  done: "Hotovo",
  published: "Publikováno",
};

export const STATUS_ORDER: ContentStatus[] = ["idea", "generated", "to_shoot", "done", "published"];

export function pick<T>(arr: readonly T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
