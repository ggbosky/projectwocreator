import type { Creator, RadarSearchRequest, ViralPost } from "@/lib/types";

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const SYNONYMS: Record<string, string[]> = {
  web: ["web", "website", "stranka", "redesign", "landing", "homepage", "hero"],
  marketing: ["marketing", "konverze", "copy", "growth", "obsah", "reels"],
  ai: ["ai", "chatgpt", "claude", "automatizace"],
  podnikani: ["podnikani", "zivnost", "firma", "freelanc", "klient", "e-shop", "eshop"],
  znacka: ["znacka", "brand", "osobni", "linktree"],
  design: ["design", "ux", "ui", "vizual"],
  produktivita: ["produktivita", "nastroj", "workflow"],
};

function expand(keywords: string[]) {
  const out = new Set<string>();
  for (const k of keywords.map(norm)) {
    out.add(k);
    for (const [root, list] of Object.entries(SYNONYMS)) {
      if (k.includes(root) || list.some((w) => k.includes(w))) list.forEach((w) => out.add(w));
    }
  }
  return [...out].filter((k) => k.length > 1);
}

export function searchLocal(req: RadarSearchRequest, data: { creators: Creator[]; posts: ViralPost[] }) {
  const terms = expand(req.keywords);
  const matchScore = (text: string) => (terms.length ? terms.reduce((s, t) => s + (norm(text).includes(t) ? 1 : 0), 0) : 1);

  const creators = data.creators
    .filter((c) => req.platforms.length === 0 || req.platforms.includes(c.platform))
    .filter((c) => req.language === "any" || c.language === req.language || (req.language === "cs" && c.language === "sk"))
    .map((c) => ({ c, s: matchScore(`${c.name} ${c.handle} ${c.niche.join(" ")} ${c.whyFollow}`) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.c.avgViews - a.c.avgViews)
    .map((x) => x.c);

  const creatorIds = new Set(creators.map((c) => c.id));
  const posts = data.posts
    .filter((p) => req.platforms.length === 0 || req.platforms.includes(p.platform))
    .filter((p) => p.views >= req.minViews)
    .map((p) => ({
      p,
      s: matchScore(`${p.title} ${p.hookText} ${p.caption} ${p.tags.join(" ")}`) + (p.creatorId && creatorIds.has(p.creatorId) ? 1 : 0),
    }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.p.viralScore - a.p.viralScore)
    .map((x) => x.p);

  return { creators, posts };
}
