/**
 * AI illustrations: Claude draws an SVG (website mockups, icons, infographics,
 * stylised scenes); we sanitise it and rasterise to PNG for posts and videos.
 */
import { resolveEngine } from "@/lib/ai/service";
import { brandBlock } from "@/lib/ai/prompts";
import { sampleErrorMessage, useCapability } from "@/lib/runtime";
import { invokeFunction } from "@/lib/supabase";
import type { BrandProfile } from "@/lib/types";

export const SVG_PRESETS: { label: string; prompt: string }[] = [
  { label: "Web v roce 2014", prompt: "Mockup of an outdated 2014 small-business website on a desktop: image slider with arrows, tiny Comic Sans text, rainbow gradient buttons, visitor counter, cluttered sidebar. Faded colors." },
  { label: "Web v roce 2026", prompt: "Mockup of a modern 2026 mobile-first website for a florist: dark hero with big bold headline, one orange call-to-action button, clean product cards, generous white space." },
  { label: "Telefon s poptávkami", prompt: "A smartphone lock screen stacked with notifications 'Nová poptávka', confetti, orange accent, flat illustration." },
  { label: "Herní loading screen", prompt: "Stylised open-world video game loading screen illustration: sunset coastal city skyline, palm trees, bold italic title area at the bottom, saturated pink and orange gradient sky. No logos, no real game assets." },
  { label: "Infografika rychlosti", prompt: "Infographic comparing page load times: slow website 8.2 s vs fast website 1.1 s, two horizontal bars, stopwatch icon, clean minimal style." },
  { label: "Před/po redesign", prompt: "Split illustration: left half an ugly old website on an old laptop, right half a sleek modern website on a new phone, labels 'PŘED' and 'PO'." },
];

const ALLOWED = new Set([
  "svg", "g", "defs", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text", "tspan", "linearGradient", "radialGradient",
  "stop", "clipPath", "mask", "pattern", "filter", "feGaussianBlur", "feOffset", "feBlend", "feColorMatrix", "feDropShadow", "feMerge", "feMergeNode", "use", "title", "desc", "symbol",
]);

export function sanitizeSvg(raw: string): string {
  const m = raw.match(/<svg[\s\S]*<\/svg>/i);
  if (!m) throw new Error("AI nevrátila platnou SVG grafiku, zkuste to znovu.");
  const doc = new DOMParser().parseFromString(m[0], "image/svg+xml");
  if (doc.querySelector("parsererror")) throw new Error("SVG obsahuje chybu, zkuste to znovu.");
  const walk = (el: Element) => {
    for (const child of Array.from(el.children)) {
      if (!ALLOWED.has(child.tagName)) {
        child.remove();
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        const n = attr.name.toLowerCase();
        const v = attr.value.trim().toLowerCase();
        if (n.startsWith("on")) child.removeAttribute(attr.name);
        if ((n === "href" || n === "xlink:href") && !v.startsWith("#")) child.removeAttribute(attr.name);
        if (v.includes("javascript:") || (v.includes("url(") && !v.includes("url(#"))) child.removeAttribute(attr.name);
      }
      walk(child);
    }
  };
  const root = doc.documentElement;
  for (const attr of Array.from(root.attributes)) if (attr.name.toLowerCase().startsWith("on")) root.removeAttribute(attr.name);
  walk(root);
  if (!root.getAttribute("xmlns")) root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return new XMLSerializer().serializeToString(root);
}

export async function svgToPng(svg: string, width: number, height: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("SVG se nepodařilo vykreslit"));
      i.src = url;
    });
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, width, height);
    const s = Math.min(width / (img.naturalWidth || width), height / (img.naturalHeight || height));
    const w = (img.naturalWidth || width) * s;
    const h = (img.naturalHeight || height) * s;
    ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
    return await new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("Export PNG selhal"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

function svgPrompt(prompt: string, width: number, height: number, brand: BrandProfile) {
  return `You are a senior illustrator who draws in pure SVG. Draw: ${prompt}
Canvas: viewBox="0 0 ${width} ${height}" (exact). Rich, polished, social-media ready flat/semi-flat illustration with gradients, shadows (filters allowed) and real detail — not a sketch. Use only these elements: svg, g, defs, path, rect, circle, ellipse, line, polyline, polygon, text, tspan, linearGradient, radialGradient, stop, clipPath, mask, pattern, filter, feGaussianBlur, feOffset, feDropShadow, feColorMatrix, feBlend, feMerge, use. No scripts, no images, no external fonts or links; use font-family="Inter, Arial, sans-serif". Any text in Czech, short. Brand accent colour #FF5A0F, dark neutral #09090B.
Context about the brand (for tone only): ${brandBlock(brand).slice(0, 1200)}
Reply with ONLY the complete <svg>…</svg> markup.`;
}

export async function generateSvg(prompt: string, width: number, height: number, brand: BrandProfile): Promise<string> {
  const engine = await resolveEngine();
  const full = svgPrompt(prompt, width, height, brand);
  if (engine === "edge") {
    const { svg } = await invokeFunction<{ svg: string }>("trend-scout", { action: "svg", prompt: full });
    return sanitizeSvg(svg);
  }
  if (engine === "claude") {
    const sample = await useCapability("sample");
    if (!sample) throw new Error("Claude není dostupný");
    try {
      const { text } = await sample(full, { modelTier: "default" });
      return sanitizeSvg(text);
    } catch (e) {
      if (e instanceof Error && !("code" in e)) throw e;
      throw new Error(sampleErrorMessage(e));
    }
  }
  throw new Error("AI ilustrace potřebují Claude — povolte ho v aplikaci, nebo připojte Supabase.");
}
