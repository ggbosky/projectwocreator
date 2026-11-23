import { Camera, Circle, Monitor, Square, VideoOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { toMediaItem } from "@/lib/media";
import type { MediaItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ReelComposer } from "@/lib/video/composer";
import { useData } from "@/store/data";

type Source = "camera" | "screen";

/**
 * Records the camera (with a scrolling teleprompter) or the screen (website
 * walkthroughs) straight into the media library.
 */
export function RecorderDialog({ open, onOpenChange, script = "", onDone }: { open: boolean; onOpenChange: (o: boolean) => void; script?: string; onDone?: (m: MediaItem) => void }) {
  const addMedia = useData((s) => s.addMedia);
  const videoRef = useRef<HTMLVideoElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const [source, setSource] = useState<Source>("camera");
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState(script);
  const [speed, setSpeed] = useState(40);
  const [state, setState] = useState<"idle" | "countdown" | "recording" | "saving">("idle");
  const [count, setCount] = useState(3);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (open) setText(script);
  }, [open, script]);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (!open) {
      stopStream();
      setState("idle");
      return;
    }
    let cancelled = false;
    setError(null);
    const start = async () => {
      try {
        if (!navigator.mediaDevices) throw new Error("unsupported");
        const stream =
          source === "camera"
            ? await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: true })
            : await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        stopStream();
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
      } catch {
        setError(
          source === "camera"
            ? "Kameru se nepodařilo zapnout. Povolte přístup v prohlížeči. V náhledu uvnitř Claude kamera nefunguje — otevřete nasazenou verzi aplikace (GitHub Pages)."
            : "Nahrávání obrazovky nebylo povoleno, nebo ho tady prohlížeč nepodporuje.",
        );
      }
    };
    void start();
    return () => {
      cancelled = true;
    };
  }, [open, source]);

  // Teleprompter scroll + timer while recording.
  useEffect(() => {
    if (state !== "recording") return;
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      const s = (performance.now() - t0) / 1000;
      setElapsed(s);
      if (promptRef.current) promptRef.current.scrollTop = s * speed;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, speed]);

  const begin = () => {
    if (!streamRef.current) return;
    setState("countdown");
    setCount(3);
    let n = 3;
    const iv = setInterval(() => {
      n -= 1;
      setCount(n);
      if (n <= 0) {
        clearInterval(iv);
        if (promptRef.current) promptRef.current.scrollTop = 0;
        const { mime } = ReelComposer.pickMime();
        const rec = new MediaRecorder(streamRef.current!, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
        const chunks: Blob[] = [];
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        rec.onstop = async () => {
          setState("saving");
          try {
            const blob = new Blob(chunks, { type: mime.split(";")[0] });
            const ext = mime.includes("mp4") ? "mp4" : "webm";
            const item = await toMediaItem(blob, `${source === "camera" ? "natoceni" : "obrazovka"}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.${ext}`, "recording", [source]);
            const [saved] = await addMedia([item]);
            toast.success("Nahrávka uložena do knihovny");
            onDone?.(saved);
            onOpenChange(false);
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setState("idle");
          }
        };
        rec.start(500);
        recRef.current = rec;
        setState("recording");
      }
    }, 800);
  };

  const stop = () => recRef.current?.state === "recording" && recRef.current.stop();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (state === "recording") stop();
        onOpenChange(o);
      }}
      size="xl"
      title="Natočit"
      description="Kamera s teleprompterem, nebo záznam obrazovky (průchod webem klienta). Nahrávka se uloží do knihovny."
      footer={
        state === "recording" ? (
          <Button variant="danger" onClick={stop}>
            <Square /> Zastavit ({elapsed.toFixed(0)} s)
          </Button>
        ) : (
          <Button onClick={begin} disabled={!!error || state !== "idle"} loading={state === "saving"}>
            <Circle className="fill-current" /> Začít nahrávat
          </Button>
        )
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative mx-auto aspect-[9/16] w-full max-w-[320px] overflow-hidden rounded-3xl bg-black">
          {error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-zinc-300">
              <VideoOff className="size-8 text-zinc-500" />
              {error}
            </div>
          ) : (
            <video ref={videoRef} muted playsInline className={cn("h-full w-full object-cover", source === "camera" && "-scale-x-100")} />
          )}
          {source === "camera" && !error && text && (
            <div ref={promptRef} className="no-scrollbar absolute inset-x-0 top-0 h-2/5 overflow-hidden bg-gradient-to-b from-black/80 via-black/50 to-transparent px-5 pt-6 text-center text-lg font-semibold leading-relaxed text-white">
              <div className="pb-[60%]">{text}</div>
            </div>
          )}
          {state === "countdown" && <div className="absolute inset-0 grid place-items-center bg-black/40 text-7xl font-black text-white">{count}</div>}
          {state === "recording" && (
            <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
              <span className="size-2 animate-pulse rounded-full bg-white" /> REC {elapsed.toFixed(0)}s
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["camera", "screen"] as Source[]).map((s) => (
              <button key={s} disabled={state !== "idle"} onClick={() => setSource(s)} className={cn("flex items-center gap-2 rounded-xl border p-3 text-sm font-medium", source === s ? "border-brand/60 bg-brand/[0.08]" : "border-border")}>
                {s === "camera" ? <Camera className="size-4" /> : <Monitor className="size-4" />}
                {s === "camera" ? "Kamera" : "Obrazovka"}
              </button>
            ))}
          </div>
          {source === "camera" && (
            <>
              <label className="block space-y-1.5">
                <span className="label">Text pro teleprompter</span>
                <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="Vložte scénář — při nahrávání se bude posouvat nahoře přes obraz." />
              </label>
              <label className="flex items-center gap-3 text-xs text-muted">
                Rychlost
                <input type="range" min={10} max={120} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="flex-1 accent-[rgb(var(--brand))]" />
              </label>
            </>
          )}
          <p className="text-xs text-subtle">
            Tip: točte na výšku, světlo z okna před sebou, telefon/notebook ve výšce očí. Odpočet 3-2-1 vám dá čas se nadechnout.
          </p>
        </div>
      </div>
    </Dialog>
  );
}
