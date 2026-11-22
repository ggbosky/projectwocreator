import { Download, Loader2, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/misc";
import { useCapability } from "@/lib/runtime";
import type { VideoProject } from "@/lib/types";
import { cn, downloadFile } from "@/lib/utils";
import { ReelComposer } from "@/lib/video/composer";

/** Live preview + export of a VideoProject. Re-creates the composer when the project changes. */
export function ReelPlayer({ project, brandName, onShotChange }: { project: VideoProject; brandName: string; onShotChange?: (i: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const composerRef = useRef<ReelComposer | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState<number | null>(null);
  const [progressBar, setProgressBar] = useState(true);
  const [watermark, setWatermark] = useState(true);
  const [tts, setTts] = useState<Awaited<ReturnType<typeof useCapability<"tts">>>>(null);

  useEffect(() => {
    void useCapability("tts").then(setTts);
  }, []);

  // Rebuild whenever anything visual changes; keep the playhead.
  const key = JSON.stringify([project.shots.map((s) => [s.id, s.duration, s.onScreenText, s.voiceover, s.transition, s.videoUrl, s.imageUrl, s.description]), project.style, project.aspect, project.captionStyle, project.hookText, project.musicUrl, project.voiceoverUrl, progressBar, watermark]);
  useEffect(() => {
    if (!canvasRef.current) return;
    const c = new ReelComposer(canvasRef.current, project, { brandName, showProgress: progressBar, watermark });
    c.onTime = (t) => {
      setTime(t);
      onShotChange?.(c.shotAt(t).index);
    };
    c.onEnd = () => setPlaying(false);
    composerRef.current = c;
    c.seek(Math.min(time, c.total));
    setPlaying(false);
    return () => c.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const total = composerRef.current?.total ?? project.shots.reduce((a, s) => a + s.duration, 0);

  const toggle = () => {
    const c = composerRef.current;
    if (!c) return;
    if (c.isPlaying) {
      c.pause();
      setPlaying(false);
    } else {
      c.play();
      setPlaying(true);
    }
  };

  const exportVideo = async () => {
    const c = composerRef.current;
    if (!c) return;
    setExporting(0);
    try {
      const { blob, ext } = await c.export((p) => setExporting(p));
      const name = `${project.title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "reel"}.${ext}`;
      const ok = await downloadFile(name, blob);
      if (ok) toast.success(`Video uloženo (${ext.toUpperCase()}, ${(blob.size / 1e6).toFixed(1)} MB)`);
      else toast.error("Uložení bylo zrušeno nebo zablokováno.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(null);
      setPlaying(false);
    }
  };

  const speak = async () => {
    if (!tts) return;
    const text = project.shots.map((s) => s.voiceover).filter(Boolean).join(" ");
    try {
      await tts.speak(text.slice(0, 2000), { language: "cs" });
    } catch {
      /* stopped or unavailable */
    }
  };

  const aspectClass = project.aspect === "9:16" ? "aspect-[9/16] max-w-[340px]" : project.aspect === "1:1" ? "aspect-square max-w-[420px]" : "aspect-video max-w-[560px]";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={cn("relative w-full overflow-hidden rounded-[28px] border-[6px] border-zinc-800 bg-black shadow-2xl", aspectClass)}>
        <canvas ref={canvasRef} className="h-full w-full" onClick={toggle} />
        {!playing && exporting === null && (
          <button onClick={toggle} className="absolute inset-0 grid place-items-center bg-black/10" aria-label="Přehrát">
            <span className="grid size-16 place-items-center rounded-full bg-white/90 text-black shadow-xl">
              <Play className="ml-1 size-7" />
            </span>
          </button>
        )}
        {exporting !== null && (
          <div className="absolute inset-x-0 bottom-0 bg-black/70 p-3 text-center text-xs text-white">
            <Loader2 className="mr-1 inline size-3.5 animate-spin" /> Nahrávám video… {Math.round(exporting * 100)} %
          </div>
        )}
      </div>

      <div className="flex w-full max-w-[420px] items-center gap-2">
        <Button size="icon-sm" variant="subtle" onClick={toggle} disabled={exporting !== null} aria-label={playing ? "Pauza" : "Přehrát"}>
          {playing ? <Pause /> : <Play />}
        </Button>
        <input
          type="range"
          min={0}
          max={total}
          step={0.05}
          value={time}
          onChange={(e) => composerRef.current?.seek(Number(e.target.value))}
          className="flex-1 accent-[rgb(var(--brand))]"
          aria-label="Pozice"
          disabled={exporting !== null}
        />
        <span className="w-20 text-right font-mono text-[11px] tabular-nums text-subtle">
          {time.toFixed(1)} / {total.toFixed(1)} s
        </span>
        <Tip content="Na začátek">
          <Button size="icon-sm" variant="ghost" onClick={() => composerRef.current?.seek(0)} aria-label="Na začátek">
            <RotateCcw />
          </Button>
        </Tip>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={progressBar} onChange={(e) => setProgressBar(e.target.checked)} className="accent-[rgb(var(--brand))]" /> Progress bar
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={watermark} onChange={(e) => setWatermark(e.target.checked)} className="accent-[rgb(var(--brand))]" /> Vodoznak
        </label>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={exportVideo} loading={exporting !== null} disabled={!project.shots.length}>
          <Download /> Exportovat video
        </Button>
        {tts && (
          <Button variant="outline" onClick={speak}>
            <Volume2 /> Přečíst voiceover
          </Button>
        )}
      </div>
      <p className="max-w-[420px] text-center text-[11px] text-subtle">
        Export nahrává v reálném čase ({total.toFixed(0)} s). Záběry bez klipu se vykreslí jako animovaná grafika — nahraďte je AI klipy.
      </p>
    </div>
  );
}
