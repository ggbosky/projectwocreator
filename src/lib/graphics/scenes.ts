/**
 * Animated graphic templates for a web studio's social content. One renderer
 * serves three outputs: still images (progress = end), carousel/post graphics
 * and animated video scenes inside the ReelComposer.
 */
import type { SceneParams, SceneType } from "@/lib/types";

export const SCENE_META: Record<SceneType, { label: string; desc: string; needs: Array<"media" | "media2" | "items" | "value" | "url" | "author" | "labels"> }> = {
  phone: { label: "Web v mobilu", desc: "Screenshot webu v telefonu, plynule scrolluje", needs: ["media"] },
  browser: { label: "Web v prohlížeči", desc: "Okno prohlížeče, píše se adresa, web se načte", needs: ["media", "url"] },
  compare: { label: "Před / po", desc: "Dvě verze vedle sebe se štítky (tehdy / dnes)", needs: ["media", "media2", "labels"] },
  notifications: { label: "Notifikace poptávek", desc: "Telefon zasypaný novými poptávkami", needs: ["items"] },
  counter: { label: "Počítadlo", desc: "Velké číslo, které naroste (poptávky, %)", needs: ["value"] },
  checklist: { label: "Checklist", desc: "Body se postupně odškrtávají", needs: ["items"] },
  quote: { label: "Recenze klienta", desc: "Citát s hvězdičkami a autorem", needs: ["author"] },
  meme: { label: "Meme", desc: "Obrázek s horním a dolním textem", needs: ["media"] },
  headline: { label: "Titulek", desc: "Velký úderný text s akcentem", needs: [] },
};

export function defaultScene(type: SceneType, brand = "Project Two"): SceneParams {
  const base: SceneParams = { type, headline: "", subline: "", items: [], value: 0, labelA: "Tehdy", labelB: "Dnes", url: "projectwo.com", author: "", theme: "dark" };
  switch (type) {
    case "phone":
      return { ...base, headline: "Nový web za 2 týdny", subline: "Mobile-first, rychlý, prodává" };
    case "browser":
      return { ...base, headline: "Spuštěno 🚀", subline: "", url: "vasefirma.cz" };
    case "compare":
      return { ...base, headline: "Web tehdy vs. dnes", labelA: "2014", labelB: "2026" };
    case "notifications":
      return { ...base, headline: "Týden po spuštění", items: ["Nová poptávka – Jana N.", "Rezervace na pátek 14:00", "Nová poptávka – Petr K.", "Objednávka #1042", "Nová poptávka – Firma s.r.o."] };
    case "counter":
      return { ...base, headline: "poptávek za první měsíc", value: 37, subline: "dřív: 0" };
    case "checklist":
      return { ...base, headline: "Co musí mít web v 2026", items: ["Telefon vidět bez scrollu", "Načtení pod 2 s", "Skutečné fotky", "Jedno jasné tlačítko", "Online rezervace"] };
    case "quote":
      return { ...base, headline: "Za první týden 3 nové zakázky. Konečně web, za který se nestydím.", author: "Klientka, kadeřnictví", subline: "★★★★★" };
    case "meme":
      return { ...base, headline: "KDYŽ KLIENT ŘEKNE", subline: "„JEN JEDNODUCHÝ WEB“", theme: "dark" };
    case "headline":
      return { ...base, headline: "Váš web postavíme osobně", subline: brand };
  }
}

export type ImageGetter = (url: string) => HTMLImageElement | null;

interface Ctx {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  t: number; // seconds into scene
  dur: number;
  img: ImageGetter;
  brand: string;
}

const ACCENT = "#ff5a0f";
const ease = (x: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
const easeBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const v = Math.max(0, Math.min(1, x));
  return 1 + c3 * Math.pow(v - 1, 3) + c1 * Math.pow(v - 1, 2);
};

function palette(theme: SceneParams["theme"]) {
  if (theme === "light") return { bg1: "#fafaf9", bg2: "#ececec", fg: "#09090b", muted: "rgba(9,9,11,0.6)", card: "#ffffff" };
  if (theme === "brand") return { bg1: "#ff5a0f", bg2: "#c2410c", fg: "#ffffff", muted: "rgba(255,255,255,0.8)", card: "rgba(0,0,0,0.25)" };
  return { bg1: "#0b0b0e", bg2: "#1a1a20", fg: "#fafafa", muted: "rgba(250,250,250,0.65)", card: "#18181b" };
}

/** Draws one frame of a scene. `t` in seconds; pass t = dur for the final still. */
export function drawScene(ctx: CanvasRenderingContext2D, W: number, H: number, p: SceneParams, t: number, dur: number, img: ImageGetter, brand: string) {
  const c: Ctx = { ctx, W, H, t, dur, img, brand };
  const pal = palette(p.theme);
  background(c, pal, p.type === "meme");
  switch (p.type) {
    case "phone":
      return phone(c, p, pal);
    case "browser":
      return browser(c, p, pal);
    case "compare":
      return compare(c, p, pal);
    case "notifications":
      return notifications(c, p, pal);
    case "counter":
      return counter(c, p, pal);
    case "checklist":
      return checklist(c, p, pal);
    case "quote":
      return quote(c, p, pal);
    case "meme":
      return meme(c, p);
    case "headline":
      return headline(c, p, pal);
  }
}

/* --------------------------------- pieces --------------------------------- */

function background({ ctx, W, H, t }: Ctx, pal: ReturnType<typeof palette>, plain: boolean) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, pal.bg1);
  g.addColorStop(1, pal.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (plain) return;
  const x = W * (0.75 + 0.1 * Math.sin(t * 0.8));
  const y = H * (0.08 + 0.05 * Math.cos(t * 0.6));
  const rg = ctx.createRadialGradient(x, y, 0, x, y, Math.max(W, H) * 0.7);
  rg.addColorStop(0, "rgba(255,90,15,0.30)");
  rg.addColorStop(1, "rgba(255,90,15,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);
}

export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function lines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let cur = "";
    for (const w of para.split(/\s+/).filter(Boolean)) {
      const test = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(test).width > maxW && cur) {
        out.push(cur);
        cur = w;
      } else cur = test;
    }
    if (cur) out.push(cur);
  }
  return out;
}

function title({ ctx, W, H, t }: Ctx, text: string, sub: string, pal: ReturnType<typeof palette>, y = 0.11, size = 0.072) {
  if (!text) return y;
  const a = ease(t / 0.5);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = "center";
  ctx.fillStyle = pal.fg;
  const fs = Math.round(W * size);
  ctx.font = `800 ${fs}px Inter, system-ui, sans-serif`;
  const ls = lines(ctx, text, W * 0.86);
  let yy = H * y + fs + (1 - a) * 30;
  for (const l of ls) {
    ctx.fillText(l, W / 2, yy);
    yy += fs * 1.1;
  }
  if (sub) {
    ctx.font = `500 ${Math.round(W * 0.034)}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = pal.muted;
    ctx.fillText(sub, W / 2, yy + W * 0.01);
    yy += W * 0.05;
  }
  ctx.restore();
  return yy / H;
}

function placeholderShot(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string) {
  // A stylised website wireframe so templates look complete without a screenshot.
  ctx.save();
  ctx.fillStyle = "#f4f4f5";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#09090b";
  ctx.fillRect(x, y, w, h * 0.06);
  ctx.fillStyle = ACCENT;
  ctx.fillRect(x + w * 0.06, y + h * 0.015, w * 0.12, h * 0.03);
  ctx.fillStyle = "#18181b";
  ctx.font = `800 ${Math.round(Math.min(w * 0.08, h * 0.09))}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText(label, x + w * 0.94, y + h * 0.2);
  ctx.textAlign = "left";
  ctx.fillStyle = "#a1a1aa";
  for (let i = 0; i < 3; i++) ctx.fillRect(x + w * 0.06, y + h * (0.22 + i * 0.03), w * (0.8 - i * 0.15), h * 0.012);
  ctx.fillStyle = ACCENT;
  rr(ctx, x + w * 0.06, y + h * 0.33, w * 0.42, h * 0.05, h * 0.025);
  ctx.fill();
  ctx.fillStyle = "#d4d4d8";
  for (let i = 0; i < 4; i++) {
    rr(ctx, x + w * 0.06 + (i % 2) * w * 0.46, y + h * (0.45 + Math.floor(i / 2) * 0.22), w * 0.42, h * 0.18, 18);
    ctx.fill();
  }
  ctx.restore();
}

/** Draws a screenshot into a box, scrolling from top to bottom over `scroll` (0–1). */
function screenshot(c: Ctx, url: string | undefined, x: number, y: number, w: number, h: number, scroll: number, fallback: string) {
  const { ctx } = c;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const im = url ? c.img(url) : null;
  if (im) {
    const s = w / im.naturalWidth;
    const fullH = im.naturalHeight * s;
    const maxOff = Math.max(0, fullH - h);
    ctx.drawImage(im, x, y - maxOff * scroll, w, fullH);
  } else placeholderShot(ctx, x, y, w, h, fallback);
  ctx.restore();
}

function phoneFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 30;
  rr(ctx, x - w * 0.045, y - w * 0.045, w * 1.09, h + w * 0.09, w * 0.16);
  ctx.fillStyle = "#111114";
  ctx.fill();
  ctx.restore();
  ctx.save();
  rr(ctx, x - w * 0.045, y - w * 0.045, w * 1.09, h + w * 0.09, w * 0.16);
  ctx.strokeStyle = "#3f3f46";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
}

function phone(c: Ctx, p: SceneParams, pal: ReturnType<typeof palette>) {
  const { ctx, W, H, t, dur } = c;
  const top = title(c, p.headline, p.subline, pal, 0.06, 0.064);
  const avail = H * (0.97 - top) - W * 0.06;
  const ph = Math.min(avail, W * 1.7);
  const pw = ph / 2.05;
  const x = (W - pw) / 2;
  const enter = ease(t / 0.7);
  const y = H * top + W * 0.05 + (1 - enter) * H * 0.25;
  phoneFrame(ctx, x, y, pw, ph);
  ctx.save();
  rr(ctx, x, y, pw, ph, pw * 0.12);
  ctx.clip();
  screenshot(c, p.media, x, y, pw, ph, ease(Math.max(0, (t - 0.8) / Math.max(dur - 1.2, 0.5))), "Váš web");
  ctx.restore();
  // dynamic island
  ctx.fillStyle = "#000";
  rr(ctx, x + pw * 0.36, y + pw * 0.04, pw * 0.28, pw * 0.075, pw * 0.04);
  ctx.fill();
}

function browser(c: Ctx, p: SceneParams, pal: ReturnType<typeof palette>) {
  const { ctx, W, H, t, dur } = c;
  const top = title(c, p.headline, p.subline, pal, 0.08, 0.064);
  const bw = W * 0.88;
  const x = (W - bw) / 2;
  const y = H * top + W * 0.05;
  const bh = Math.min(H * 0.92 - y, bw * 1.3);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 24;
  rr(ctx, x, y, bw, bh, 28);
  ctx.fillStyle = "#27272a";
  ctx.fill();
  ctx.restore();
  const bar = bw * 0.1;
  ["#ef4444", "#f59e0b", "#22c55e"].forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(x + bar * 0.45 + i * bar * 0.32, y + bar / 2, bar * 0.1, 0, Math.PI * 2);
    ctx.fill();
  });
  rr(ctx, x + bar * 1.5, y + bar * 0.22, bw - bar * 1.9, bar * 0.56, bar * 0.28);
  ctx.fillStyle = "#3f3f46";
  ctx.fill();
  const typed = p.url.slice(0, Math.floor(p.url.length * ease(t / 1.1)));
  ctx.fillStyle = "#e4e4e7";
  ctx.font = `500 ${Math.round(bar * 0.3)}px Inter, system-ui, sans-serif`;
  ctx.fillText(`🔒 ${typed}${t < 1.2 && Math.floor(t * 3) % 2 === 0 ? "|" : ""}`, x + bar * 1.75, y + bar * 0.6);
  // page loads after typing
  const load = ease((t - 1.1) / 0.4);
  ctx.save();
  ctx.globalAlpha = load;
  ctx.beginPath();
  rr(ctx, x, y + bar, bw, bh - bar, 0);
  ctx.clip();
  screenshot(c, p.media, x, y + bar, bw, bh - bar, ease(Math.max(0, (t - 1.6) / Math.max(dur - 2, 0.6))), p.url.split(".")[0] || "Web");
  ctx.restore();
  if (load < 1) {
    ctx.fillStyle = ACCENT;
    ctx.fillRect(x, y + bar, bw * Math.min(1, t / 1.5), 6);
  }
}

function compare(c: Ctx, p: SceneParams, pal: ReturnType<typeof palette>) {
  const { ctx, W, H, t } = c;
  const top = title(c, p.headline, p.subline, pal, 0.05, 0.06);
  const y0 = H * top + W * 0.03;
  const h = H * 0.95 - y0;
  const half = h / 2;
  const x = W * 0.05;
  const w = W * 0.9;
  // "then" — desaturated
  ctx.save();
  rr(ctx, x, y0, w, half - 8, 24);
  ctx.clip();
  ctx.filter = "grayscale(0.7) sepia(0.35) contrast(0.9)";
  screenshot(c, p.media, x, y0, w, half, 0, "Web 2014");
  ctx.filter = "none";
  ctx.restore();
  // "now" — wipes in
  const reveal = ease((t - 0.6) / 0.8);
  ctx.save();
  rr(ctx, x, y0 + half + 8, w * reveal, half - 8, 24);
  ctx.clip();
  screenshot(c, p.media2, x, y0 + half + 8, w, half - 8, 0, "Web 2026");
  ctx.restore();
  const tag = (text: string, yy: number, bg: string) => {
    ctx.font = `italic 900 ${Math.round(W * 0.055)}px Inter, system-ui, sans-serif`;
    const tw = ctx.measureText(text.toUpperCase()).width;
    rr(ctx, x + 24, yy + 24, tw + 48, W * 0.085, 18);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(text.toUpperCase(), x + 48, yy + 24 + W * 0.062);
  };
  tag(p.labelA, y0, "rgba(0,0,0,0.75)");
  if (reveal > 0.2) tag(p.labelB, y0 + half + 8, ACCENT);
}

function notifications(c: Ctx, p: SceneParams, pal: ReturnType<typeof palette>) {
  const { ctx, W, H, t } = c;
  const top = title(c, p.headline, p.subline, pal, 0.07, 0.066);
  const items = p.items.length ? p.items : ["Nová poptávka"];
  const cardH = W * 0.15;
  const gap = W * 0.03;
  const per = Math.max(0.35, Math.min(0.7, (c.dur - 0.6) / items.length));
  items.forEach((it, i) => {
    const k = easeBack((t - 0.4 - i * per) / 0.35);
    if (k <= 0) return;
    const y = H * top + W * 0.05 + i * (cardH + gap);
    if (y + cardH > H * 0.97) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, k);
    ctx.translate(W / 2, y + cardH / 2);
    ctx.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k);
    ctx.translate(-W / 2, -(y + cardH / 2));
    rr(ctx, W * 0.06, y, W * 0.88, cardH, 32);
    ctx.fillStyle = p.theme === "light" ? "rgba(255,255,255,0.95)" : "rgba(39,39,42,0.92)";
    ctx.fill();
    rr(ctx, W * 0.09, y + cardH * 0.2, cardH * 0.6, cardH * 0.6, 18);
    ctx.fillStyle = ACCENT;
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `800 ${Math.round(cardH * 0.32)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("✉", W * 0.09 + cardH * 0.3, y + cardH * 0.62);
    ctx.textAlign = "left";
    ctx.fillStyle = pal.muted;
    ctx.font = `600 ${Math.round(cardH * 0.17)}px Inter, system-ui, sans-serif`;
    ctx.fillText(`${c.brand.toUpperCase()} · teď`, W * 0.09 + cardH * 0.8, y + cardH * 0.38);
    ctx.fillStyle = pal.fg;
    ctx.font = `700 ${Math.round(cardH * 0.22)}px Inter, system-ui, sans-serif`;
    ctx.fillText(lines(ctx, it, W * 0.62)[0] ?? it, W * 0.09 + cardH * 0.8, y + cardH * 0.7);
    ctx.restore();
  });
}

function counter(c: Ctx, p: SceneParams, pal: ReturnType<typeof palette>) {
  const { ctx, W, H, t, dur } = c;
  const k = ease(t / Math.max(0.8, dur * 0.7));
  const val = Math.round(p.value * k);
  const r = W * 0.3;
  const cx = W / 2;
  const cy = H * 0.45;
  ctx.lineWidth = W * 0.035;
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = ACCENT;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = pal.fg;
  ctx.font = `900 ${Math.round(W * 0.22)}px Inter, system-ui, sans-serif`;
  ctx.fillText(String(val), cx, cy + W * 0.075);
  ctx.font = `700 ${Math.round(W * 0.055)}px Inter, system-ui, sans-serif`;
  lines(ctx, p.headline, W * 0.8).forEach((l, i) => ctx.fillText(l, cx, cy + r + W * 0.14 + i * W * 0.065));
  if (p.subline) {
    ctx.fillStyle = pal.muted;
    ctx.font = `500 ${Math.round(W * 0.038)}px Inter, system-ui, sans-serif`;
    ctx.fillText(p.subline, cx, H * 0.12);
  }
  ctx.textAlign = "left";
}

function checklist(c: Ctx, p: SceneParams, pal: ReturnType<typeof palette>) {
  const { ctx, W, H, t, dur } = c;
  const top = title(c, p.headline, p.subline, pal, 0.08, 0.066);
  const items = p.items.length ? p.items : ["Bod 1"];
  const per = Math.max(0.3, (dur - 0.8) / items.length);
  const rowH = W * 0.14;
  items.forEach((it, i) => {
    const k = ease((t - 0.5 - i * per) / 0.3);
    const y = H * top + W * 0.06 + i * rowH;
    if (y > H * 0.93) return;
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.65 * Math.min(1, k + 0.001);
    rr(ctx, W * 0.08, y, rowH * 0.62, rowH * 0.62, 16);
    ctx.fillStyle = k > 0.5 ? ACCENT : "rgba(255,255,255,0.08)";
    ctx.fill();
    ctx.strokeStyle = k > 0.5 ? ACCENT : pal.muted;
    ctx.lineWidth = 4;
    ctx.stroke();
    if (k > 0.5) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 9;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(W * 0.08 + rowH * 0.15, y + rowH * 0.32);
      ctx.lineTo(W * 0.08 + rowH * 0.27, y + rowH * 0.45);
      ctx.lineTo(W * 0.08 + rowH * 0.48, y + rowH * 0.17);
      ctx.stroke();
    }
    ctx.fillStyle = pal.fg;
    ctx.font = `700 ${Math.round(W * 0.048)}px Inter, system-ui, sans-serif`;
    ctx.fillText(lines(ctx, it, W * 0.7)[0] ?? it, W * 0.08 + rowH * 0.85, y + rowH * 0.44);
    ctx.restore();
  });
}

function quote(c: Ctx, p: SceneParams, pal: ReturnType<typeof palette>) {
  const { ctx, W, H, t, dur } = c;
  ctx.fillStyle = ACCENT;
  ctx.font = `900 ${Math.round(W * 0.3)}px Georgia, serif`;
  ctx.fillText("“", W * 0.07, H * 0.3);
  const stars = Math.round(5 * ease(t / 0.8));
  ctx.font = `700 ${Math.round(W * 0.06)}px Inter, system-ui, sans-serif`;
  ctx.fillText("★".repeat(stars) + "☆".repeat(5 - stars), W * 0.1, H * 0.36);
  ctx.fillStyle = pal.fg;
  const fs = Math.round(W * 0.062);
  ctx.font = `700 ${fs}px Inter, system-ui, sans-serif`;
  const all = lines(ctx, p.headline, W * 0.8);
  const chars = Math.floor(p.headline.length * ease((t - 0.5) / Math.max(0.8, dur * 0.6)));
  let used = 0;
  all.forEach((l, i) => {
    const show = l.slice(0, Math.max(0, chars - used));
    used += l.length + 1;
    ctx.fillText(show, W * 0.1, H * 0.45 + i * fs * 1.25);
  });
  ctx.fillStyle = pal.muted;
  ctx.font = `600 ${Math.round(W * 0.038)}px Inter, system-ui, sans-serif`;
  ctx.fillText(`— ${p.author}`, W * 0.1, H * 0.45 + all.length * fs * 1.25 + W * 0.06);
}

function meme(c: Ctx, p: SceneParams) {
  const { ctx, W, H, t } = c;
  const im = p.media ? c.img(p.media) : null;
  if (im) {
    const s = Math.max(W / im.naturalWidth, H / im.naturalHeight) * (1 + 0.04 * Math.min(1, t / 3));
    ctx.drawImage(im, (W - im.naturalWidth * s) / 2, (H - im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s);
  } else {
    ctx.fillStyle = "#27272a";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#52525b";
    ctx.textAlign = "center";
    ctx.font = `600 ${Math.round(W * 0.04)}px Inter, system-ui, sans-serif`;
    ctx.fillText("Nahrajte obrázek", W / 2, H / 2);
  }
  const block = (text: string, y: number, from: "top" | "bottom") => {
    if (!text) return;
    const fs = Math.round(W * 0.085);
    ctx.font = `900 ${fs}px Impact, "Arial Black", Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.lineJoin = "round";
    const ls = lines(ctx, text.toUpperCase(), W * 0.9);
    ls.forEach((l, i) => {
      const yy = from === "top" ? y + (i + 1) * fs * 1.05 : y - (ls.length - 1 - i) * fs * 1.05;
      ctx.lineWidth = fs * 0.16;
      ctx.strokeStyle = "#000";
      ctx.strokeText(l, W / 2, yy);
      ctx.fillStyle = "#fff";
      ctx.fillText(l, W / 2, yy);
    });
  };
  block(p.headline, H * 0.03, "top");
  if (t > 0.8 || c.dur < 1) block(p.subline, H * 0.95, "bottom");
  ctx.textAlign = "left";
}

function headline(c: Ctx, p: SceneParams, pal: ReturnType<typeof palette>) {
  const { ctx, W, H, t } = c;
  const fs = Math.round(W * 0.11);
  ctx.font = `900 ${fs}px Inter, system-ui, sans-serif`;
  const ls = lines(ctx, p.headline, W * 0.84);
  const y0 = H / 2 - (ls.length * fs * 1.05) / 2;
  ls.forEach((l, i) => {
    const k = easeBack((t - i * 0.18) / 0.45);
    if (k <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, k);
    ctx.translate(0, (1 - Math.min(1, k)) * 50);
    ctx.fillStyle = i === ls.length - 1 ? ACCENT : pal.fg;
    ctx.fillText(l, W * 0.08, y0 + (i + 1) * fs * 1.05);
    ctx.restore();
  });
  if (p.subline) {
    ctx.fillStyle = pal.muted;
    ctx.font = `600 ${Math.round(W * 0.04)}px Inter, system-ui, sans-serif`;
    ctx.fillText(p.subline, W * 0.08, y0 + ls.length * fs * 1.05 + W * 0.1);
  }
}
