import { AnimatePresence, motion } from "framer-motion";
import { Clapperboard, Copy, Film, Music, Plus, Sparkles, Trash2, Wand2, Mic } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ReelPlayer } from "@/components/video/ReelPlayer";
import { ShotCard } from "@/components/video/ShotCard";
import { STYLE_GUIDE } from "@/lib/ai/prompts";
import { mediaStatus, planShots, submitMedia } from "@/lib/ai/service";
import { toShots } from "@/lib/ai/localVideo";
import { useEngine } from "@/lib/ai/useEngine";
import { env } from "@/lib/env";
import { toMediaItem } from "@/lib/media";
import type { CaptionStyle, GeneratedContent, Shot, VideoProject, VideoStyle } from "@/lib/types";
import { cn, copyToClipboard, uid } from "@/lib/utils";
import { API_MODELS, EXTERNAL_TOOLS } from "@/lib/video/providers";
import { useData } from "@/store/data";

const CAPTIONS: Record<CaptionStyle, string> = { bold: "Tučné (rolující)", karaoke: "Karaoke (slovo po slově)", minimal: "Minimal (spodní titulky)", game: "Herní (kurzíva, caps)" };

interface NavState {
  output?: GeneratedContent;
  topic?: string;
  trendId?: string;
  contentId?: string;
}

export default function VideoPage() {
  const { videos, brand, content, trends, saveVideo, deleteVideo, ready, addMedia } = useData();
  const location = useLocation();
  const navigate = useNavigate();
  const { engine, label } = useEngine();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [prefill, setPrefill] = useState<NavState | null>(null);
  const [activeShot, setActiveShot] = useState(0);
  const [model, setModel] = useState(API_MODELS[0].id);
  const [customModel, setCustomModel] = useState("");
  const polling = useRef(new Set<string>());

  const project = videos.find((v) => v.id === activeId) ?? null;
  const canGenerate = env.authMode === "supabase";

  // Arrive from Studio / Trends / Pipeline with something to turn into a video.
  useEffect(() => {
    const st = location.state as NavState | null;
    if (st && (st.output || st.topic || st.trendId || st.contentId)) {
      setPrefill(st);
      setNewOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (!activeId && videos.length) setActiveId(videos[0].id);
  }, [videos, activeId]);

  const update = async (patch: Partial<VideoProject>) => {
    if (!project) return;
    try {
      await saveVideo({ ...project, ...patch, updatedAt: new Date().toISOString() });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const updateShot = (id: string, patch: Partial<Shot>) => {
    if (!project) return;
    void update({ shots: project.shots.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  };

  const latest = useRef(project);
  latest.current = project;

  const generateShot = async (shot: Shot) => {
    if (!project) return;
    const m = API_MODELS.find((x) => x.id === model);
    const modelId = customModel.trim() || model;
    const provider = m?.provider ?? (modelId.includes("/") && !modelId.startsWith("fal-ai") ? "replicate" : "fal");
    const kind = m?.kind ?? "video";
    updateShot(shot.id, { status: "generating", error: undefined });
    try {
      const job = await submitMedia({ kind, provider, model: modelId, prompt: shot.prompt, aspect: project.aspect, duration: Math.round(shot.duration) });
      polling.current.add(shot.id);
      const startedAt = Date.now();
      const poll = async () => {
        if (!polling.current.has(shot.id)) return;
        try {
          const st = await mediaStatus({ ...job, kind });
          const cur = latest.current;
          if (st.status === "done" && st.url) {
            polling.current.delete(shot.id);
            if (cur) await saveVideo({ ...cur, shots: cur.shots.map((s) => (s.id === shot.id ? { ...s, status: "ready", [kind === "video" ? "videoUrl" : "imageUrl"]: st.url, provider, model: modelId, jobId: job.jobId } : s)) });
            toast.success(`Záběr ${cur ? cur.shots.findIndex((s) => s.id === shot.id) + 1 : ""} je hotový`);
            return;
          }
          if (st.status === "failed" || Date.now() - startedAt > 12 * 60_000) {
            polling.current.delete(shot.id);
            if (cur) await saveVideo({ ...cur, shots: cur.shots.map((s) => (s.id === shot.id ? { ...s, status: "failed", error: st.error ?? "Vypršel čas" } : s)) });
            toast.error(`Generování selhalo: ${st.error ?? "vypršel čas"}`);
            return;
          }
          setTimeout(poll, 5000);
        } catch (e) {
          polling.current.delete(shot.id);
          toast.error((e as Error).message);
        }
      };
      setTimeout(poll, 4000);
      toast.info("Klip se generuje", { description: `${m?.label ?? modelId} · obvykle 1–4 minuty` });
    } catch (e) {
      updateShot(shot.id, { status: "failed", error: (e as Error).message });
      toast.error((e as Error).message);
    }
  };

  useEffect(() => {
    const set = polling.current;
    return () => set.clear();
  }, []);

  const uploadShot = async (shot: Shot, file: File) => {
    const tid = toast.loading("Nahrávám soubor…");
    try {
      const [item] = await addMedia([await toMediaItem(file, file.name, "upload")]);
      const isVideo = item.kind === "video";
      updateShot(shot.id, { status: "ready", videoUrl: isVideo ? item.url : undefined, imageUrl: isVideo ? undefined : item.url, provider: "upload" });
      toast.success(item.persistent ? "Klip uložen i do knihovny" : "Klip přidán (jen do zavření záložky)", { id: tid });
    } catch (e) {
      toast.error((e as Error).message, { id: tid });
    }
  };

  const uploadAudio = async (kind: "musicUrl" | "voiceoverUrl", file: File) => {
    const tid = toast.loading("Nahrávám zvuk…");
    try {
      const [item] = await addMedia([await toMediaItem(file, file.name, "upload", [kind === "musicUrl" ? "hudba" : "voiceover"])]);
      await update({ [kind]: item.url });
      toast.success(kind === "musicUrl" ? "Hudba přidána" : "Voiceover přidán", { id: tid });
    } catch (e) {
      toast.error((e as Error).message, { id: tid });
    }
  };

  const total = project?.shots.reduce((a, s) => a + s.duration, 0) ?? 0;

  return (
    <div>
      <PageHeader
        eyebrow="Video Studio"
        title="Ze scénáře"
        accent="hotový Reel"
        description="AI rozpíše video na záběry, každý záběr vygenerujete libovolnou AI (Veo, Kling, Sora, Runway, Hailuo…) a tady ho složíte s virálními titulky, přechody a hudbou do hotového videa."
        actions={
          <>
            <Badge tone={engine === "local" ? "warning" : "success"}>Storyboard: {label}</Badge>
            <Button onClick={() => setNewOpen(true)}>
              <Plus /> Nové video
            </Button>
          </>
        }
      />

      {!ready ? null : !videos.length ? (
        <EmptyState
          icon={<Clapperboard />}
          title="Zatím žádné video"
          text="Začněte z vygenerovaného scénáře ve Studiu, z trendu, nebo jen zadejte téma — AI navrhne storyboard."
          action={
            <Button onClick={() => setNewOpen(true)}>
              <Wand2 /> Vytvořit první video
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {/* Project list */}
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
            {videos.map((v) => (
              <button
                key={v.id}
                onClick={() => setActiveId(v.id)}
                className={cn("group flex w-60 shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors", v.id === activeId ? "border-brand/40 bg-brand/[0.07]" : "border-border hover:bg-elevated")}
              >
                <Film className="size-4 shrink-0 text-subtle" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{v.title}</span>
                  <span className="text-[11px] text-subtle">
                    {v.shots.length} záběrů · {v.shots.filter((s) => s.videoUrl || s.imageUrl).length} s klipem
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* Storyboard */}
          {project && (
            <div className="min-w-0 space-y-4">
              <div className="card space-y-4 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Input value={project.title} onChange={(e) => update({ title: e.target.value })} className="h-10 min-w-[200px] flex-1 text-base font-semibold" aria-label="Název videa" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      await deleteVideo(project.id);
                      setActiveId(null);
                      toast.success("Video smazáno");
                    }}
                    aria-label="Smazat video"
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                  <Field label="Vizuální styl">
                    <Select value={project.style} onChange={(e) => update({ style: e.target.value as VideoStyle })}>
                      {Object.entries(STYLE_GUIDE).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Titulky">
                    <Select value={project.captionStyle} onChange={(e) => update({ captionStyle: e.target.value as CaptionStyle })}>
                      {Object.entries(CAPTIONS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Formát">
                    <Select value={project.aspect} onChange={(e) => update({ aspect: e.target.value as VideoProject["aspect"] })}>
                      <option value="9:16">9:16 Reels / TikTok</option>
                      <option value="1:1">1:1 Feed</option>
                      <option value="16:9">16:9 YouTube</option>
                    </Select>
                  </Field>
                  <Field label="Délka">
                    <div className="flex h-10 items-center rounded-xl border border-border bg-elevated/60 px-3 text-sm tabular-nums">{total.toFixed(1)} s</div>
                  </Field>
                </div>
                <Field label="Hook (první 2 s, velký text)">
                  <Input value={project.hookText} onChange={(e) => update({ hookText: e.target.value })} />
                </Field>

                <div className="grid gap-3 rounded-xl border border-border bg-elevated/30 p-3 2xl:grid-cols-2">
                  <div className="text-xs">
                    <div className="mb-1 flex items-center gap-1.5 font-semibold text-fg">
                      <Music className="size-3.5 text-brand" /> Hudba: {project.music.mood} · {project.music.bpm} BPM
                    </div>
                    <p className="text-muted">{project.music.hint}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 2xl:justify-end">
                    <AudioButton label={project.musicUrl ? "Vyměnit hudbu" : "Nahrát hudbu"} icon={<Music />} onFile={(f) => uploadAudio("musicUrl", f)} />
                    <AudioButton label={project.voiceoverUrl ? "Vyměnit voiceover" : "Nahrát voiceover"} icon={<Mic />} onFile={(f) => uploadAudio("voiceoverUrl", f)} />
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-border p-3">
                  <Field label="AI model pro generování klipů" hint={canGenerate ? "Klíče fal.ai / Replicate se nastavují v Nastavení. Lze zadat i libovolné jiné ID modelu." : "V demo režimu použijte „Prompt pro…“ a hotové klipy nahrajte. Přímé generování běží v ostrém režimu (Supabase + fal.ai)."}>
                    <div className="flex flex-col gap-2 lg:flex-row">
                      <Select value={model} onChange={(e) => setModel(e.target.value)} className="lg:w-80">
                        {API_MODELS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.kind === "image" ? "🖼 " : "🎬 "}
                            {m.label} — {m.note}
                          </option>
                        ))}
                      </Select>
                      <Input value={customModel} onChange={(e) => setCustomModel(e.target.value)} placeholder="nebo vlastní ID modelu" className="sm:flex-1" />
                    </div>
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        const tool = EXTERNAL_TOOLS[0];
                        const all = project.shots.map((s, i) => `ZÁBĚR ${i + 1} (${s.duration}s)\n${tool.format(s, project)}`).join("\n\n");
                        if (await copyToClipboard(all)) toast.success("Všechny prompty zkopírovány");
                      }}
                    >
                      <Copy /> Všechny prompty
                    </Button>
                    <Button disabled={!canGenerate} onClick={() => project.shots.filter((s) => !s.videoUrl && s.status !== "generating").forEach((s) => void generateShot(s))}>
                      <Sparkles /> Generovat vše
                    </Button>
                  </div>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {project.shots.map((s, i) => (
                  <ShotCard
                    key={s.id}
                    shot={s}
                    index={i}
                    count={project.shots.length}
                    project={project}
                    active={i === activeShot}
                    canGenerate={canGenerate}
                    onChange={(patch) => updateShot(s.id, patch)}
                    onMove={(dir) => {
                      const shots = [...project.shots];
                      const j = i + dir;
                      [shots[i], shots[j]] = [shots[j], shots[i]];
                      void update({ shots });
                    }}
                    onRemove={() => void update({ shots: project.shots.filter((x) => x.id !== s.id) })}
                    onGenerate={() => void generateShot(s)}
                    onUpload={(f) => void uploadShot(s, f)}
                  />
                ))}
              </AnimatePresence>
              <Button
                variant="outline"
                className="w-full border-dashed"
                onClick={() =>
                  void update({
                    shots: [
                      ...project.shots,
                      { id: uid(), duration: 3, description: "", prompt: STYLE_GUIDE[project.style].prompt, camera: "statický", onScreenText: "", voiceover: "", transition: "cut", status: "draft" },
                    ],
                  })
                }
              >
                <Plus /> Přidat záběr
              </Button>
            </div>
          )}

          {/* Player */}
          {project && (
            <div className="card h-fit p-5 xl:sticky xl:top-20">
              <ReelPlayer project={project} brandName={brand.name} onShotChange={setActiveShot} />
            </div>
          )}
          </div>
        </div>
      )}

      <NewVideoDialog
        open={newOpen}
        prefill={prefill}
        onOpenChange={(o) => {
          setNewOpen(o);
          if (!o) setPrefill(null);
        }}
        onCreated={(id) => setActiveId(id)}
        contentOptions={content.filter((c) => c.output?.script.length)}
        trendOptions={trends}
      />
    </div>
  );
}

function AudioButton({ label, icon, onFile }: { label: string; icon: React.ReactNode; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => ref.current?.click()}>
        {icon} {label}
      </Button>
      <input
        ref={ref}
        type="file"
        accept="audio/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </>
  );
}

function NewVideoDialog({
  open,
  onOpenChange,
  prefill,
  onCreated,
  contentOptions,
  trendOptions,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  prefill: NavState | null;
  onCreated: (id: string) => void;
  contentOptions: { id: string; title: string; output?: GeneratedContent }[];
  trendOptions: { id: string; name: string }[];
}) {
  const { brand, trends, saveVideo } = useData();
  const [source, setSource] = useState<"topic" | "content">("topic");
  const [topic, setTopic] = useState("");
  const [contentId, setContentId] = useState("");
  const [trendId, setTrendId] = useState("");
  const [style, setStyle] = useState<VideoStyle>("ugc");
  const [seconds, setSeconds] = useState(20);
  const [busy, setBusy] = useState(false);
  const [inlineOutput, setInlineOutput] = useState<GeneratedContent | null>(null);

  useEffect(() => {
    if (!open) return;
    setInlineOutput(prefill?.output ?? null);
    setTopic(prefill?.output?.title ?? prefill?.topic ?? "");
    setTrendId(prefill?.trendId ?? "");
    setContentId(prefill?.contentId ?? "");
    setSource(prefill?.contentId ? "content" : "topic");
    if (prefill?.trendId && /gta|tehdy/i.test(trends.find((t) => t.id === prefill.trendId)?.name ?? "")) setStyle("game");
  }, [open, prefill, trends]);

  const chosenContent = useMemo(() => contentOptions.find((c) => c.id === contentId), [contentOptions, contentId]);

  const create = async () => {
    const out = inlineOutput ?? (source === "content" ? chosenContent?.output : undefined);
    const theTopic = topic.trim() || out?.title || chosenContent?.title || "";
    if (!theTopic) return toast.error("Zadejte téma videa");
    setBusy(true);
    try {
      const trend = trends.find((t) => t.id === trendId);
      const plan = await planShots({ topic: theTopic, hook: out?.hooks[0]?.onScreen, script: out?.script, style, seconds, trend }, brand);
      const now = new Date().toISOString();
      const project: VideoProject = {
        id: uid(),
        title: plan.title || theTopic,
        topic: theTopic,
        contentItemId: source === "content" ? contentId : undefined,
        style,
        aspect: "9:16",
        captionStyle: style === "game" ? "game" : style === "meme_edit" ? "bold" : "karaoke",
        hookText: plan.hookText,
        music: plan.music,
        shots: toShots(plan.shots),
        cta: plan.cta,
        createdAt: now,
        updatedAt: now,
      };
      const saved = await saveVideo(project);
      onCreated(saved.id);
      onOpenChange(false);
      toast.success(`Storyboard hotový: ${project.shots.length} záběrů`);
    } catch (e) {
      toast.error((e as Error).message);
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
          <Clapperboard className="size-4 text-brand" /> Nové video
        </span>
      }
      description="AI navrhne storyboard: záběry, prompty pro AI video, texty a voiceover."
      footer={
        <Button onClick={create} loading={busy}>
          <Wand2 /> Navrhnout storyboard
        </Button>
      }
    >
      <div className="space-y-4">
        {inlineOutput ? (
          <div className="rounded-xl border border-brand/30 bg-brand/[0.06] p-3 text-sm">
            <div className="label text-brand">Ze Studia</div>
            <p className="mt-1 font-medium">{inlineOutput.title}</p>
            <p className="text-xs text-muted">{inlineOutput.script.length} bloků scénáře převedu na záběry.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {(["topic", "content"] as const).map((s) => (
                <button key={s} onClick={() => setSource(s)} className={cn("rounded-xl border p-3 text-left text-sm", source === s ? "border-brand/60 bg-brand/[0.08]" : "border-border")}>
                  <span className="font-semibold">{s === "topic" ? "Z tématu" : "Z uloženého scénáře"}</span>
                  <span className="block text-xs text-subtle">{s === "topic" ? "AI vymyslí celé video" : `${contentOptions.length} scénářů v Pipeline`}</span>
                </button>
              ))}
            </div>
            {source === "topic" ? (
              <Field label="Téma">
                <Textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={2} placeholder="Např. Web v éře GTA V vs. v éře GTA VI" />
              </Field>
            ) : (
              <Field label="Scénář z Pipeline">
                <Select value={contentId} onChange={(e) => setContentId(e.target.value)}>
                  <option value="">Vyberte…</option>
                  {contentOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </>
        )}
        <Field label="Trend (volitelně)">
          <Select value={trendId} onChange={(e) => setTrendId(e.target.value)}>
            <option value="">Bez trendu</option>
            {trendOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <div>
          <div className="label mb-2">Vizuální styl</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.entries(STYLE_GUIDE) as [VideoStyle, (typeof STYLE_GUIDE)[VideoStyle]][]).map(([k, v]) => (
              <button key={k} onClick={() => setStyle(k)} className={cn("rounded-xl border p-2.5 text-left", style === k ? "border-brand/60 bg-brand/[0.08] ring-4 ring-brand/10" : "border-border hover:border-fg/20")}>
                <span className="block text-sm font-semibold">{v.label}</span>
                <span className="block text-[11px] text-subtle">{v.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <Field label={`Cílová délka: ${seconds} s`}>
          <input type="range" min={8} max={60} step={1} value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} className="w-full accent-[rgb(var(--brand))]" />
        </Field>
      </div>
    </Dialog>
  );
}

export function useVideoFrom() {
  const navigate = useNavigate();
  return (state: NavState) => navigate("/video", { state });
}

// Keep framer-motion tree-shaken import used for layout animations in this module.
void motion;
