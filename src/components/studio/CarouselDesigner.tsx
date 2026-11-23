import { ChevronLeft, ChevronRight, Copy, Download, ImagePlus, LibraryBig, Loader2, Sparkles } from "lucide-react";
import { MediaPicker } from "@/components/media/MediaPicker";
import { useData } from "@/store/data";
import { toMediaItem } from "@/lib/media";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { mediaStatus, submitMedia } from "@/lib/ai/service";
import { env } from "@/lib/env";
import type { GeneratedContent, Slide } from "@/lib/types";
import { cn, copyToClipboard, downloadFile } from "@/lib/utils";
import { roundRect, wrap } from "@/lib/video/composer";

type Template = "ember" | "clean" | "compare";
type SlotKey = "bg" | "then" | "now";
type Images = Record<number, Partial<Record<SlotKey, string>>>;

const W = 1080;
const H = 1350;

const loaded = new Map<string, HTMLImageElement>();
function img(url: string, onLoad: () => void) {
  let i = loaded.get(url);
  if (!i) {
    i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = onLoad;
    i.src = url;
    loaded.set(url, i);
  }
  return i.complete && i.naturalWidth ? i : null;
}

function cover(ctx: CanvasRenderingContext2D, im: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / im.naturalWidth, h / im.naturalHeight);
  const dw = im.naturalWidth * s;
  const dh = im.naturalHeight * s;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(im, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

function render(ctx: CanvasRenderingContext2D, slide: Slide, total: number, tpl: Template, imgs: Partial<Record<SlotKey, string>>, brand: string, redraw: () => void) {
  const dark = tpl !== "clean";
  const accent = "#ff5a0f";
  const fg = dark ? "#fafafa" : "#09090b";
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = dark ? "#09090b" : "#fafaf9";
  ctx.fillRect(0, 0, W, H);

  const isCompare = tpl === "compare" && slide.compare;
  if (isCompare) {
    const half = H / 2;
    const thenIm = imgs.then ? img(imgs.then, redraw) : null;
    const nowIm = imgs.now ? img(imgs.now, redraw) : null;
    if (thenIm) {
      cover(ctx, thenIm, 0, 0, W, half);
      ctx.fillStyle = "rgba(60,40,20,0.25)"; // faded, older look
      ctx.fillRect(0, 0, W, half);
    } else {
      const g = ctx.createLinearGradient(0, 0, W, half);
      g.addColorStop(0, "#3b3a36");
      g.addColorStop(1, "#1d1c1a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, half);
    }
    if (nowIm) cover(ctx, nowIm, 0, half, W, half);
    else {
      const g = ctx.createLinearGradient(0, half, W, H);
      g.addColorStop(0, "#ff3d7f");
      g.addColorStop(1, "#ffb000");
      ctx.fillStyle = g;
      ctx.fillRect(0, half, W, half);
    }
    ctx.fillStyle = "#000";
    ctx.fillRect(0, half - 4, W, 8);
    const label = (text: string, y: number, bg: string) => {
      ctx.font = "italic 900 64px Inter, system-ui, sans-serif";
      const tw = ctx.measureText(text.toUpperCase()).width;
      roundRect(ctx, 40, y, tw + 56, 96, 20);
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(text.toUpperCase(), 68, y + 70);
    };
    label(slide.compare!.thenLabel, 40, "rgba(0,0,0,0.75)");
    label(slide.compare!.nowLabel, half + 40, accent);
    // Topic caption across the seam
    ctx.font = "800 52px Inter, system-ui, sans-serif";
    const t = slide.headline;
    const tw = Math.min(W - 120, ctx.measureText(t).width + 64);
    roundRect(ctx, (W - tw) / 2, half - 48, tw, 96, 48);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.fillStyle = "#09090b";
    ctx.textAlign = "center";
    ctx.fillText(wrap(ctx, t, W - 180)[0] ?? t, W / 2, half + 18);
    ctx.textAlign = "left";
  } else {
    const bg = imgs.bg ? img(imgs.bg, redraw) : null;
    if (bg) {
      cover(ctx, bg, 0, 0, W, H);
      const g = ctx.createLinearGradient(0, H * 0.3, 0, H);
      g.addColorStop(0, "rgba(9,9,11,0.1)");
      g.addColorStop(1, dark ? "rgba(9,9,11,0.92)" : "rgba(250,250,249,0.95)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    } else if (dark) {
      const rg = ctx.createRadialGradient(W * 0.8, 0, 0, W * 0.8, 0, W);
      rg.addColorStop(0, "rgba(255,90,15,0.35)");
      rg.addColorStop(1, "rgba(255,90,15,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
    }
    const first = slide.index === 1;
    const size = first ? 104 : 76;
    ctx.fillStyle = fg;
    ctx.font = `800 ${size}px Inter, system-ui, sans-serif`;
    const lines = wrap(ctx, slide.headline, W - 160);
    const blockTop = bg ? H - 140 - lines.length * size * 1.08 - 260 : first ? H * 0.32 : 220;
    lines.forEach((l, i) => ctx.fillText(l, 80, blockTop + i * size * 1.08));
    // accent underline
    ctx.fillStyle = accent;
    ctx.fillRect(80, blockTop + lines.length * size * 1.08 - size * 0.55, 140, 12);
    ctx.font = "500 44px Inter, system-ui, sans-serif";
    ctx.fillStyle = dark ? "rgba(250,250,250,0.78)" : "rgba(9,9,11,0.72)";
    const bodyLines = slide.body.split("\n").flatMap((p) => wrap(ctx, p, W - 160));
    bodyLines.slice(0, 9).forEach((l, i) => ctx.fillText(l, 80, blockTop + lines.length * size * 1.08 + 60 + i * 60));
  }

  // Footer: brand + pager + swipe hint
  ctx.font = "700 34px Inter, system-ui, sans-serif";
  ctx.fillStyle = isCompare ? "#fff" : fg;
  ctx.fillText(brand, 80, H - 70);
  ctx.textAlign = "right";
  ctx.fillStyle = isCompare ? "rgba(255,255,255,0.85)" : dark ? "rgba(250,250,250,0.6)" : "rgba(9,9,11,0.55)";
  ctx.fillText(`${slide.index}/${total}${slide.index < total ? "  →" : ""}`, W - 80, H - 70);
  ctx.textAlign = "left";
}

export function CarouselDesigner({ open, onOpenChange, output, brandName }: { open: boolean; onOpenChange: (o: boolean) => void; output: GeneratedContent; brandName: string }) {
  const slides = output.slides;
  const hasCompare = slides.some((s) => s.compare);
  const [tpl, setTpl] = useState<Template>(hasCompare ? "compare" : "ember");
  const [i, setI] = useState(0);
  const [images, setImages] = useState<Images>({});
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingSlot = useRef<SlotKey>("bg");
  const [tick, setTick] = useState(0);
  const [libSlot, setLibSlot] = useState<SlotKey | null>(null);
  const addMedia = useData((s) => s.addMedia);
  const redraw = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (open) {
      setI(0);
      setTpl(hasCompare ? "compare" : "ember");
    }
  }, [open, hasCompare]);

  useEffect(() => {
    const c = canvasRef.current;
    const slide = slides[i];
    if (!c || !slide) return;
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d")!;
    render(ctx, slide, slides.length, tpl, images[slide.index] ?? {}, brandName, redraw);
  }, [i, tpl, images, slides, brandName, tick, redraw, open]);

  const slide = slides[i];
  if (!slide) return null;
  const compareMode = tpl === "compare" && Boolean(slide.compare);
  const slots: { key: SlotKey; label: string; prompt?: string }[] = compareMode
    ? [
        { key: "then", label: slide.compare!.thenLabel, prompt: slide.compare!.thenPrompt },
        { key: "now", label: slide.compare!.nowLabel, prompt: slide.compare!.nowPrompt },
      ]
    : [{ key: "bg", label: "Pozadí", prompt: slide.imagePrompt }];

  const setSlot = (key: SlotKey, url: string) => setImages((m) => ({ ...m, [slide.index]: { ...m[slide.index], [key]: url } }));

  const aiImage = async (key: SlotKey, prompt?: string) => {
    if (!prompt) return toast.error("Slide nemá prompt pro obrázek");
    setBusySlot(key);
    try {
      const job = await submitMedia({ kind: "image", provider: "fal", model: "fal-ai/flux-pro/v1.1-ultra", prompt, aspect: compareMode ? "16:9" : "4:5" });
      for (let n = 0; n < 60; n++) {
        await new Promise((r) => setTimeout(r, 3000));
        const st = await mediaStatus({ ...job, kind: "image" });
        if (st.status === "done" && st.url) {
          setSlot(key, st.url);
          toast.success("Obrázek vygenerován");
          return;
        }
        if (st.status === "failed") throw new Error(st.error ?? "Generování selhalo");
      }
      throw new Error("Vypršel čas generování");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusySlot(null);
    }
  };

  const exportAll = async () => {
    setExporting(true);
    try {
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const ctx = c.getContext("2d")!;
      let saved = 0;
      for (const s of slides) {
        render(ctx, s, slides.length, tpl, images[s.index] ?? {}, brandName, () => undefined);
        const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
        if (!blob) throw new Error("Obrázek se nepodařilo vytvořit (zablokovaný obrázek bez CORS?)");
        const name = `slide-${String(s.index).padStart(2, "0")}.png`;
        await addMedia([await toMediaItem(blob, name, "graphic", ["karusel"])]);
        if (await downloadFile(name, blob)) saved++;
      }
      toast.success(`Uloženo ${saved} slidů (PNG 1080×1350)`, { description: "Kopie jsou i v Knihovně médií." });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title="Designer karuselu"
      description="Hotové slidy 1080×1350 připravené na Instagram. Přidejte vlastní fotky nebo AI obrázky."
      footer={
        <Button onClick={exportAll} loading={exporting}>
          <Download /> Uložit všechny slidy (PNG)
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col items-center gap-3">
          <canvas ref={canvasRef} className="aspect-[4/5] w-full max-w-[420px] rounded-2xl border border-border shadow-xl" />
          <div className="flex items-center gap-3">
            <Button size="icon-sm" variant="outline" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0} aria-label="Předchozí slide">
              <ChevronLeft />
            </Button>
            <span className="text-sm tabular-nums text-muted">
              {i + 1} / {slides.length}
            </span>
            <Button size="icon-sm" variant="outline" onClick={() => setI((x) => Math.min(slides.length - 1, x + 1))} disabled={i === slides.length - 1} aria-label="Další slide">
              <ChevronRight />
            </Button>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <div className="label mb-2">Šablona</div>
            <div className="grid grid-cols-3 gap-1.5">
              {(["ember", "clean", "compare"] as Template[]).map((t) => (
                <button key={t} onClick={() => setTpl(t)} className={cn("rounded-lg border px-2 py-2 text-xs font-medium", tpl === t ? "border-brand/60 bg-brand/10" : "border-border text-muted")}>
                  {t === "ember" ? "Tmavá" : t === "clean" ? "Světlá" : "Tehdy/dnes"}
                </button>
              ))}
            </div>
            {tpl === "compare" && !slide.compare && <p className="mt-2 text-xs text-subtle">Tento slide nemá dvojici tehdy/dnes — zobrazí se klasicky.</p>}
          </div>
          {slots.map((s) => (
            <div key={s.key} className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{s.label}</span>
                {images[slide.index]?.[s.key] && <span className="text-xs text-success">✓ obrázek</span>}
              </div>
              {s.prompt && <p className="line-clamp-3 font-mono text-[11px] text-subtle">{s.prompt}</p>}
              <div className="flex flex-wrap gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    pendingSlot.current = s.key;
                    fileRef.current?.click();
                  }}
                >
                  <ImagePlus /> Nahrát
                </Button>
                <Button size="sm" variant="outline" onClick={() => setLibSlot(s.key)}>
                  <LibraryBig /> Knihovna
                </Button>
                {s.prompt && (
                  <Button size="sm" variant="outline" onClick={async () => (await copyToClipboard(`${s.prompt} --ar ${compareMode ? "16:9" : "4:5"}`)) && toast.success("Prompt zkopírován", { description: "Midjourney, ChatGPT, Gemini, Flux…" })}>
                    <Copy /> Prompt
                  </Button>
                )}
                {env.authMode === "supabase" && (
                  <Button size="sm" onClick={() => aiImage(s.key, s.prompt)} disabled={busySlot !== null}>
                    {busySlot === s.key ? <Loader2 className="animate-spin" /> : <Sparkles />} AI obrázek
                  </Button>
                )}
              </div>
            </div>
          ))}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                const [item] = await addMedia([await toMediaItem(f, f.name, "upload", ["karusel"])]);
                setSlot(pendingSlot.current, item.url);
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          />
          <MediaPicker open={libSlot !== null} onOpenChange={(o) => !o && setLibSlot(null)} filter="image" onPick={(m) => libSlot && setSlot(libSlot, m.url)} />
          <p className="text-xs text-subtle">Tip: obrázek vygenerujte v jakékoli AI (prompt výše) a nahrajte ho sem — text, štítky a branding doplní designer.</p>
        </div>
      </div>
    </Dialog>
  );
}
