import { motion } from "framer-motion";
import { Clapperboard, Download, Film, ImageDown, LibraryBig, Loader2, Palette, RotateCcw, Sparkles, Wand2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { SceneEditor } from "@/components/media/SceneEditor";
import { MediaThumb } from "@/components/media/MediaPicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { SegmentedTabs } from "@/components/ui/tabs";
import { useEngine } from "@/lib/ai/useEngine";
import { generateSvg, svgToPng, SVG_PRESETS } from "@/lib/graphics/aiSvg";
import { defaultScene, drawScene, SCENE_META } from "@/lib/graphics/scenes";
import { fillScene } from "@/lib/graphics/fillScene";
import { toMediaItem } from "@/lib/media";
import type { SceneParams, SceneType, VideoProject } from "@/lib/types";
import { cn, downloadFile, uid } from "@/lib/utils";
import { ReelComposer } from "@/lib/video/composer";
import { useData } from "@/store/data";

const FORMATS = { "9:16": [1080, 1920], "4:5": [1080, 1350], "1:1": [1080, 1080], "16:9": [1920, 1080] } as const;
type Fmt = keyof typeof FORMATS;

export default function GraphicsPage() {
  const location = useLocation();
  const initialMedia = (location.state as { media?: string } | null)?.media;
  const [tab, setTab] = useState<"templates" | "ai">("templates");
  return (
    <div>
      <PageHeader
        eyebrow="Grafika"
        title="Obrázky a animace"
        accent="bez grafika"
        description="Šablony pro webové studio — web v mobilu, před/po, notifikace poptávek, počítadla — jako obrázek na post, animace na Reels, nebo rovnou scéna ve videu. A AI ilustrace podle popisu."
      />
      <div className="mb-5">
        <SegmentedTabs
          value={tab}
          onValueChange={(v) => setTab(v as "templates" | "ai")}
          layoutId="gfx-tabs"
          items={[
            { value: "templates", label: <><Palette /> Šablony</> },
            { value: "ai", label: <><Sparkles /> AI ilustrace</> },
          ]}
        />
      </div>
      {tab === "templates" ? <TemplateStudio initialMedia={initialMedia} /> : <AiIllustrations />}
    </div>
  );
}

/* -------------------------------- Templates -------------------------------- */

function TemplateStudio({ initialMedia }: { initialMedia?: string }) {
  const { brand, addMedia } = useData();
  const { engine } = useEngine();
  const [scene, setScene] = useState<SceneParams>(() => ({ ...defaultScene("phone", brand.name), media: initialMedia }));
  const [fmt, setFmt] = useState<Fmt>("9:16");
  const [duration, setDuration] = useState(5);
  const [busy, setBusy] = useState<string | null>(null);
  const [toVideo, setToVideo] = useState(false);
  const [topic, setTopic] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const images = useRef(new Map<string, HTMLImageElement>());
  const start = useRef(performance.now());
  const [, force] = useState(0);

  const getImage = useCallback((url: string) => {
    let im = images.current.get(url);
    if (!im) {
      im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => force((x) => x + 1);
      im.src = url;
      images.current.set(url, im);
    }
    return im.complete && im.naturalWidth ? im : null;
  }, []);

  // Live looping preview.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const [W, H] = FORMATS[fmt];
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d")!;
    let raf = 0;
    const loop = () => {
      const t = ((performance.now() - start.current) / 1000) % (duration + 1.2);
      drawScene(ctx, W, H, scene, Math.min(t, duration), duration, getImage, brand.name);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [scene, fmt, duration, getImage, brand.name]);

  const pickType = (type: SceneType) => {
    setScene((s) => ({ ...defaultScene(type, brand.name), media: s.media, media2: s.media2, theme: s.theme }));
    start.current = performance.now();
  };

  const renderStill = async (): Promise<Blob> => {
    const [W, H] = FORMATS[fmt];
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    drawScene(c.getContext("2d")!, W, H, scene, duration, duration, getImage, brand.name);
    return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("Obrázek nejde exportovat (obrázek bez CORS?)"))), "image/png"));
  };

  const fileBase = `${SCENE_META[scene.type].label}-${(scene.headline || "grafika").slice(0, 24)}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-");

  const saveImage = async (download: boolean) => {
    setBusy(download ? "png" : "lib");
    try {
      const blob = await renderStill();
      if (download) {
        if (await downloadFile(`${fileBase}.png`, blob)) toast.success("PNG uloženo");
      } else {
        const item = await toMediaItem(blob, `${fileBase}.png`, "graphic", [scene.type]);
        await addMedia([item]);
        toast.success("Uloženo do knihovny");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const exportAnimation = async () => {
    setBusy("anim");
    try {
      // Reuse the reel composer with a single scene shot — same renderer as videos.
      const project: VideoProject = {
        id: "tmp",
        title: fileBase,
        topic: "",
        style: "kinetic_text",
        aspect: fmt === "16:9" ? "16:9" : fmt === "1:1" ? "1:1" : "9:16",
        captionStyle: "minimal",
        hookText: "",
        music: { mood: "", bpm: 0, hint: "" },
        shots: [{ id: "s1", duration, description: "", prompt: "", camera: "", onScreenText: "", voiceover: "", transition: "cut", status: "draft", scene }],
        cta: "",
        createdAt: "",
        updatedAt: "",
      };
      const canvas = document.createElement("canvas");
      const comp = new ReelComposer(canvas, project, { brandName: brand.name, showProgress: false, watermark: false });
      await new Promise((r) => setTimeout(r, 400)); // let images load
      const { blob, ext } = await comp.export();
      comp.destroy();
      const item = await toMediaItem(blob, `${fileBase}.${ext}`, "graphic", [scene.type, "animace"]);
      await addMedia([item]);
      await downloadFile(`${fileBase}.${ext}`, blob);
      toast.success(`Animace hotová (${ext.toUpperCase()}) a uložená v knihovně`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const aiFill = async () => {
    if (!topic.trim()) return toast.error("Napište téma, AI podle něj vyplní texty");
    setBusy("fill");
    try {
      setScene(await fillScene(scene, topic.trim(), brand));
      start.current = performance.now();
      toast.success("Texty vyplněny");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const aspectCls = fmt === "9:16" ? "aspect-[9/16] max-w-[320px]" : fmt === "4:5" ? "aspect-[4/5] max-w-[380px]" : fmt === "1:1" ? "aspect-square max-w-[420px]" : "aspect-video max-w-[560px]";

  return (
    <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_340px]">
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-1 xl:content-start">
        {(Object.keys(SCENE_META) as SceneType[]).map((t) => (
          <button
            key={t}
            onClick={() => pickType(t)}
            className={cn("rounded-xl border p-3 text-left transition-all", scene.type === t ? "border-brand/60 bg-brand/[0.08] ring-4 ring-brand/10" : "border-border hover:border-fg/20")}
          >
            <span className="block text-sm font-semibold">{SCENE_META[t].label}</span>
            <span className="block text-[11px] text-subtle">{SCENE_META[t].desc}</span>
          </button>
        ))}
      </div>

      <div className="card flex flex-col items-center gap-4 p-5">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {(Object.keys(FORMATS) as Fmt[]).map((f) => (
            <button key={f} onClick={() => setFmt(f)} className={cn("rounded-lg border px-3 py-1.5 text-xs font-medium", fmt === f ? "border-brand/60 bg-brand/10" : "border-border text-muted")}>
              {f}
            </button>
          ))}
          <Button size="icon-sm" variant="ghost" onClick={() => (start.current = performance.now())} aria-label="Přehrát znovu">
            <RotateCcw />
          </Button>
        </div>
        <motion.canvas key={fmt} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} ref={canvasRef} className={cn("w-full rounded-2xl border border-border shadow-2xl", aspectCls)} />
        <div className="flex w-full max-w-md items-center gap-3 text-xs text-muted">
          Délka animace
          <input type="range" min={2} max={10} step={0.5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="flex-1 accent-[rgb(var(--brand))]" />
          <span className="w-10 tabular-nums">{duration} s</span>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => saveImage(false)} loading={busy === "lib"}>
            <LibraryBig /> Uložit do knihovny
          </Button>
          <Button variant="outline" onClick={() => saveImage(true)} loading={busy === "png"}>
            <ImageDown /> Stáhnout PNG
          </Button>
          <Button variant="outline" onClick={exportAnimation} loading={busy === "anim"}>
            <Film /> Export animace
          </Button>
          <Button variant="outline" onClick={() => setToVideo(true)}>
            <Clapperboard /> Přidat do videa
          </Button>
        </div>
      </div>

      <div className="card h-fit space-y-4 p-5">
        {engine !== "local" && (
          <div className="space-y-2 rounded-xl border border-brand/30 bg-brand/[0.05] p-3">
            <div className="label text-brand">AI vyplní texty</div>
            <Textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={2} placeholder="Např. výsledky webu pro kadeřnictví po prvním měsíci" className="min-h-[56px]" />
            <Button size="sm" onClick={aiFill} loading={busy === "fill"} className="w-full">
              <Wand2 /> Vyplnit podle tématu
            </Button>
          </div>
        )}
        <SceneEditor value={scene} onChange={setScene} />
      </div>

      <AddToVideoDialog open={toVideo} onOpenChange={setToVideo} scene={scene} duration={duration} />
    </div>
  );
}

export function AddToVideoDialog({ open, onOpenChange, scene, duration, clipUrl, clipKind }: { open: boolean; onOpenChange: (o: boolean) => void; scene?: SceneParams; duration: number; clipUrl?: string; clipKind?: "image" | "video" }) {
  const { videos, saveVideo, brand } = useData();
  const [target, setTarget] = useState<string>("new");
  useEffect(() => {
    if (open) setTarget(videos[0]?.id ?? "new");
  }, [open, videos]);

  const add = async () => {
    const shot = {
      id: uid(),
      duration,
      description: scene ? SCENE_META[scene.type].label : "Klip z knihovny",
      prompt: "",
      camera: "statický",
      onScreenText: "",
      voiceover: "",
      transition: "zoom" as const,
      status: clipUrl ? ("ready" as const) : ("draft" as const),
      scene,
      videoUrl: clipKind === "video" ? clipUrl : undefined,
      imageUrl: clipKind === "image" ? clipUrl : undefined,
    };
    try {
      if (target === "new") {
        const now = new Date().toISOString();
        await saveVideo({
          id: uid(),
          title: scene?.headline || "Nové video",
          topic: scene?.headline ?? "",
          style: "kinetic_text",
          aspect: "9:16",
          captionStyle: "karaoke",
          hookText: "",
          music: { mood: "pulzující", bpm: 120, hint: "Trendy zvuk z knihovny Reels" },
          shots: [shot],
          cta: brand.defaultCta,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        const v = videos.find((x) => x.id === target);
        if (!v) return;
        await saveVideo({ ...v, shots: [...v.shots, shot] });
      }
      toast.success("Přidáno do videa", { description: "Najdete ho ve Video Studiu." });
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} size="sm" title="Přidat do videa" description="Vloží se jako nový záběr na konec." footer={<Button onClick={add}>Přidat záběr</Button>}>
      <Field label="Video">
        <Select value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="new">+ Nové video</option>
          {videos.map((v) => (
            <option key={v.id} value={v.id}>
              {v.title} ({v.shots.length} záběrů)
            </option>
          ))}
        </Select>
      </Field>
    </Dialog>
  );
}

/* ------------------------------ AI illustrations ----------------------------- */

const AI_SIZES = { "4:5": [1080, 1350], "9:16": [1080, 1920], "1:1": [1080, 1080], "16:9": [1920, 1080] } as const;

function AiIllustrations() {
  const { brand, media, addMedia } = useData();
  const { engine } = useEngine();
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<keyof typeof AI_SIZES>("4:5");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [toVideo, setToVideo] = useState<string | null>(null);
  const recent = useMemo(() => media.filter((m) => m.source === "ai_svg"), [media]);

  const generate = async () => {
    if (!prompt.trim()) return toast.error("Popište, co má AI nakreslit");
    setBusy(true);
    setPreview(null);
    try {
      const [W, H] = AI_SIZES[size];
      // Claude draws at a smaller logical size; we rasterise at full resolution.
      const svg = await generateSvg(prompt.trim(), Math.round(W / 2), Math.round(H / 2), brand);
      const png = await svgToPng(svg, W, H);
      const item = await toMediaItem(png, `ai-${prompt.trim().slice(0, 30).toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`, "ai_svg", ["ai"]);
      const [saved] = await addMedia([item]);
      setPreview(saved.url);
      toast.success("Ilustrace hotová a uložená v knihovně");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
      <div className="card h-fit space-y-4 p-5">
        <Field label="Co má AI nakreslit">
          <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5} placeholder="Např. mockup starého webu truhláře z roku 2014 na starém monitoru" />
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {SVG_PRESETS.map((p) => (
            <button key={p.label} onClick={() => setPrompt(p.prompt)} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted hover:border-brand/50 hover:text-brand">
              {p.label}
            </button>
          ))}
        </div>
        <Field label="Formát">
          <Select value={size} onChange={(e) => setSize(e.target.value as keyof typeof AI_SIZES)}>
            <option value="4:5">4:5 — post / karusel</option>
            <option value="9:16">9:16 — Reels / Stories</option>
            <option value="1:1">1:1 — čtverec</option>
            <option value="16:9">16:9 — YouTube</option>
          </Select>
        </Field>
        <Button className="w-full" onClick={generate} loading={busy} disabled={engine === "local"}>
          <Sparkles /> Nakreslit
        </Button>
        <p className="text-xs text-subtle">
          {engine === "local"
            ? "AI ilustrace potřebují Claude — povolte ho, až se aplikace zeptá."
            : "Claude kreslí vektorovou grafiku: mockupy webů, infografiky, ikony, stylizované scény. Na fotorealistické obrázky použijte prompt v Midjourney/ChatGPT a výsledek nahrajte do knihovny."}
        </p>
      </div>
      <div className="space-y-4">
        <div className="card grid min-h-[360px] place-items-center p-5">
          {busy ? (
            <div className="flex flex-col items-center gap-2 text-sm text-muted">
              <Loader2 className="size-6 animate-spin text-brand" /> Claude kreslí… (obvykle 20–60 s)
            </div>
          ) : preview ? (
            <div className="flex flex-col items-center gap-3">
              <img src={preview} alt="AI ilustrace" className="max-h-[520px] rounded-2xl border border-border shadow-xl" />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setToVideo(preview)}>
                  <Clapperboard /> Přidat do videa
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const blob = await fetch(preview).then((r) => r.blob());
                    await downloadFile("ai-ilustrace.png", blob);
                  }}
                >
                  <Download /> Stáhnout
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-subtle">Tady se zobrazí ilustrace.</p>
          )}
        </div>
        {recent.length > 0 && (
          <div>
            <div className="label mb-2">Poslední AI ilustrace <Badge className="ml-1">{recent.length}</Badge></div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {recent.slice(0, 10).map((m) => (
                <button key={m.id} onClick={() => setPreview(m.url)} className="aspect-[4/5] overflow-hidden rounded-xl border border-border hover:border-brand/50">
                  <MediaThumb item={m} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <AddToVideoDialog open={toVideo !== null} onOpenChange={(o) => !o && setToVideo(null)} duration={3} clipUrl={toVideo ?? undefined} clipKind="image" />
    </div>
  );
}
