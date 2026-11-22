import { Link2, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { analyzePost } from "@/lib/ai/service";
import type { ContentFormat, Platform, ViralPost } from "@/lib/types";
import { computeViralScore, detectPlatform, PLATFORM_LABEL, uid } from "@/lib/utils";
import { useData } from "@/store/data";

const GRADIENTS = [
  "from-orange-500/80 via-rose-600/60 to-zinc-900",
  "from-violet-500/80 via-indigo-700/60 to-zinc-900",
  "from-teal-500/80 via-emerald-700/60 to-zinc-900",
  "from-sky-500/80 via-blue-700/60 to-zinc-900",
];

export function AnalyzeLinkDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: (p: ViralPost) => void }) {
  const { brand, upsertPosts } = useData();
  const [url, setUrl] = useState("");
  const [platformOverride, setPlatformOverride] = useState<Platform | "">("");
  const [hook, setHook] = useState("");
  const [caption, setCaption] = useState("");
  const [transcript, setTranscript] = useState("");
  const [views, setViews] = useState("");
  const [likes, setLikes] = useState("");
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState(false);

  const detected = useMemo(() => detectPlatform(url), [url]);
  const platform: Platform = platformOverride || detected || "instagram";
  const validUrl = !url || /^https?:\/\/\S+$/i.test(url.trim());
  const canRun = validUrl && (url.trim() || hook.trim() || caption.trim());

  const reset = () => {
    setUrl("");
    setHook("");
    setCaption("");
    setTranscript("");
    setViews("");
    setLikes("");
    setComments("");
    setPlatformOverride("");
  };

  const run = async () => {
    setBusy(true);
    try {
      const res = await analyzePost(
        { url: url.trim() || undefined, platform, hookText: hook, caption, transcript, views: Number(views) || 0, likes: Number(likes) || 0, comments: Number(comments) || 0 },
        brand,
      );
      // Live mode can enrich metrics from the URL (Apify); manual values win.
      const v = Number(views) || res.metrics?.views || 0;
      const l = Number(likes) || res.metrics?.likes || 0;
      const c = Number(comments) || res.metrics?.comments || 0;
      const format: ContentFormat = platform === "linkedin" ? "linkedin" : platform === "x" ? "x_thread" : "reel";
      const post: ViralPost = {
        id: uid(),
        platform,
        format,
        url: url.trim() || undefined,
        title: res.title || hook || "Analyzovaný příspěvek",
        hookText: hook || res.analysis.hook.text,
        caption,
        transcript: transcript || undefined,
        thumbnailGradient: GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)],
        views: v,
        likes: l,
        comments: c,
        shares: 0,
        saves: 0,
        postedAt: new Date().toISOString(),
        tags: res.tags,
        viralScore: v ? computeViralScore({ views: v, likes: l, comments: c, shares: 0, saves: 0 }) : 50,
        analysis: res.analysis,
        savedToSwipe: true,
        source: "manual",
      };
      const [saved] = await upsertPosts([post]);
      toast.success("Rozbor hotový a uložený do Swipe File");
      reset();
      onOpenChange(false);
      onDone(saved ?? post);
    } catch (e) {
      toast.error(`Analýza selhala: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={
        <span className="flex items-center gap-2">
          <Link2 className="size-4 text-brand" /> Analyzovat virální příspěvek
        </span>
      }
      description="Vložte odkaz na Reel / TikTok / post. Pro přesnější rozbor přidejte hook nebo přepis."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
          <Button onClick={run} loading={busy} disabled={!canRun}>
            <Wand2 /> Rozebrat úspěch
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Odkaz" hint={detected ? `Rozpoznáno: ${PLATFORM_LABEL[detected]}` : "instagram.com/reel/…, tiktok.com/@…/video/…, youtube.com/shorts/…"}>
          <Input icon={<Link2 />} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/reel/…" autoFocus />
        </Field>
        {!validUrl && <p className="text-xs text-danger">Odkaz musí začínat http(s)://</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Platforma">
            <Select value={platform} onChange={(e) => setPlatformOverride(e.target.value as Platform)}>
              {Object.entries(PLATFORM_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Hook (první věta / text na obrazovce)">
            <Input value={hook} onChange={(e) => setHook(e.target.value)} placeholder="Tenhle web nepřinesl ani jednu zakázku…" />
          </Field>
        </div>
        <Field label="Popisek (volitelné)">
          <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} />
        </Field>
        <Field label="Přepis videa (volitelné)" hint="Živý režim umí přepis stáhnout přes Apify automaticky.">
          <Textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={3} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Zhlédnutí">
            <Input inputMode="numeric" value={views} onChange={(e) => setViews(e.target.value.replace(/\D/g, ""))} placeholder="0" />
          </Field>
          <Field label="Lajky">
            <Input inputMode="numeric" value={likes} onChange={(e) => setLikes(e.target.value.replace(/\D/g, ""))} placeholder="0" />
          </Field>
          <Field label="Komentáře">
            <Input inputMode="numeric" value={comments} onChange={(e) => setComments(e.target.value.replace(/\D/g, ""))} placeholder="0" />
          </Field>
        </div>
      </div>
    </Dialog>
  );
}
