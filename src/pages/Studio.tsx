import { AnimatePresence, motion } from "framer-motion";
import {
  AtSign,
  Clapperboard,
  Copy,
  Flame,
  FileText,
  Film,
  KanbanSquare,
  Layers,
  Lightbulb,
  MessageSquareText,
  RefreshCw,
  Send,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { PlatformIcon } from "@/components/radar/PlatformIcon";
import { OutputView } from "@/components/studio/OutputView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/input";
import { PageHeader, ViralScore } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { generateContent } from "@/lib/ai/service";
import { useEngine } from "@/lib/ai/useEngine";
import { buildCrmPayload, sendToCrm } from "@/lib/crm";
import { fullText } from "@/lib/exportText";
import type { ContentFormat, GenerateRequest, GeneratedContent, Platform } from "@/lib/types";
import { cn, copyToClipboard, downloadJson, PLATFORM_LABEL } from "@/lib/utils";
import { useData } from "@/store/data";

const FORMATS: { value: ContentFormat; label: string; icon: ReactNode; platform: Platform; desc: string }[] = [
  { value: "reel", label: "Reel / TikTok", icon: <Film />, platform: "instagram", desc: "Hooky, scénář po vteřinách, B-roll" },
  { value: "carousel", label: "Karusel", icon: <Layers />, platform: "instagram", desc: "7 slidů + popisek" },
  { value: "linkedin", label: "LinkedIn", icon: <MessageSquareText />, platform: "linkedin", desc: "Text s úderným 1. řádkem" },
  { value: "x_thread", label: "X vlákno", icon: <AtSign />, platform: "x", desc: "Číslované vlákno" },
  { value: "ig_post", label: "IG post", icon: <FileText />, platform: "instagram", desc: "Statický post + caption" },
];

const GOALS: { value: GenerateRequest["goal"]; label: string; desc: string }[] = [
  { value: "reach", label: "Dosah", desc: "Sdílení a uložení" },
  { value: "trust", label: "Důvěra", desc: "Expertíza, followers" },
  { value: "leads", label: "Leady", desc: "Komentáře, DM" },
  { value: "sales", label: "Prodej", desc: "Přímá nabídka" },
];

export default function StudioPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { brand, posts, createContent, ready } = useData();

  const refId = params.get("ref");
  const reference = useMemo(() => posts.find((p) => p.id === refId), [posts, refId]);
  const trends = useData((s) => s.trends);
  const trendId = params.get("trend");
  const trend = useMemo(() => trends.find((t) => t.id === trendId), [trends, trendId]);
  const { engine, label: aiEngineLabel } = useEngine();

  const initialFormat = (params.get("format") as ContentFormat) || reference?.format || "reel";
  const [format, setFormat] = useState<ContentFormat>(FORMATS.some((f) => f.value === initialFormat) ? initialFormat : "reel");
  const [platform, setPlatform] = useState<Platform>(reference?.platform === "linkedin" ? "linkedin" : FORMATS.find((f) => f.value === format)!.platform);
  const [topic, setTopic] = useState("");
  const [goal, setGoal] = useState<GenerateRequest["goal"]>("leads");
  const [personaId, setPersonaId] = useState(brand.personas[0]?.id ?? "");
  const [extra, setExtra] = useState("");
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<GeneratedContent | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  // When a reference is chosen, prefill topic with its remix angle and match the format.
  useEffect(() => {
    if (!reference) return;
    setTopic((t) => t || reference.analysis?.remixAngle || reference.title);
    if (["reel", "carousel", "linkedin", "x_thread"].includes(reference.format)) {
      setFormat(reference.format);
      setPlatform(reference.platform === "youtube" ? "instagram" : reference.platform);
    }
  }, [reference]);

  useEffect(() => {
    const idea = params.get("idea");
    if (trend && !topic) setTopic(idea || trend.ideas[0]?.title || trend.name);
    const f = params.get("format") as ContentFormat | null;
    if (trend && f && FORMATS.some((x) => x.value === f)) {
      setFormat(f);
      setPlatform(FORMATS.find((x) => x.value === f)!.platform);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trend]);

  useEffect(() => {
    if (!personaId && brand.personas[0]) setPersonaId(brand.personas[0].id);
  }, [brand.personas, personaId]);

  const topicIdeas = useMemo(() => {
    const persona = brand.personas.find((p) => p.id === personaId);
    const fromPains = (persona?.pains ?? []).map((p) => `Jak vyřešit: ${p.toLowerCase()}`);
    const fromRefs = posts
      .filter((p) => p.savedToSwipe && p.analysis)
      .slice(0, 3)
      .map((p) => p.analysis!.remixAngle);
    return [...fromRefs, ...fromPains].slice(0, 5);
  }, [brand.personas, personaId, posts]);

  const generate = async () => {
    if (!topic.trim()) {
      toast.error("Zadejte téma — o čem má obsah být?");
      return;
    }
    setBusy(true);
    setSavedId(null);
    try {
      const res = await generateContent(
        { format, platform, topic: topic.trim(), goal, personaId, reference, trend, extraInstructions: extra.trim() || undefined },
        brand,
      );
      setOutput(res);
      toast.success("Obsah vygenerován ✨", { description: aiEngineLabel });
    } catch (e) {
      toast.error(`Generování selhalo: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const save = async (status: "generated" | "to_shoot" = "generated") => {
    if (!output) return;
    try {
      const item = await createContent({
        title: output.title,
        topic: output.meta.topic,
        format: output.format,
        platform: output.platform,
        status,
        output,
        referencePostId: reference?.id,
      });
      setSavedId(item.id);
      toast.success("Uloženo do Pipeline", {
        action: { label: "Otevřít", onClick: () => navigate("/pipeline") },
      });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const crm = async () => {
    if (!output) return;
    const now = new Date().toISOString();
    const payload = buildCrmPayload(
      [
        {
          id: savedId ?? "unsaved",
          title: output.title,
          format: output.format,
          platform: output.platform,
          status: "generated",
          topic: output.meta.topic,
          output,
          notes: "",
          position: 0,
          createdAt: now,
          updatedAt: now,
        },
      ],
      brand,
    );
    try {
      const r = await sendToCrm(payload);
      if (r.delivered) toast.success(r.message);
      else {
        downloadJson(`projectwo-crm-${Date.now()}.json`, payload);
        toast.info(r.message, { description: "JSON byl stažen." });
      }
    } catch (e) {
      toast.error(`CRM: ${(e as Error).message}`);
    }
  };

  return (
    <div onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && !busy && void generate()}>
      <PageHeader
        eyebrow="AI Content Studio"
        title="Z inspirace"
        accent="hotový obsah"
        description="Vyberte referenci z radaru, zadejte téma a nechte AI napsat hooky, scénář po vteřinách, vizuální pokyny i popisek — v tónu Project Two."
        actions={<Badge tone={engine === "local" ? "warning" : "success"}>AI: {aiEngineLabel}</Badge>}
      />

      <div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
        {/* Config */}
        <div className="card h-fit space-y-5 p-5 xl:sticky xl:top-20">
          {/* Reference */}
          <div>
            {trend && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-info/30 bg-info/[0.06] p-3">
                <Flame className="size-5 shrink-0 text-brand" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-subtle">Trend-jacking</div>
                  <p className="truncate text-sm font-medium">{trend.name}</p>
                </div>
                <button
                  onClick={() => {
                    params.delete("trend");
                    setParams(params, { replace: true });
                  }}
                  className="rounded-lg p-1 text-subtle hover:bg-elevated hover:text-fg"
                  aria-label="Odebrat trend"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}
            <div className="label mb-2">Reference (remix)</div>
            {reference ? (
              <div className="flex items-center gap-3 rounded-xl border border-brand/30 bg-brand/[0.06] p-3">
                <ViralScore score={reference.viralScore} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs text-subtle">
                    <PlatformIcon platform={reference.platform} className="size-3" /> {reference.analysis?.hook.pattern ?? "Bez analýzy"}
                  </div>
                  <p className="truncate text-sm font-medium">{reference.title}</p>
                </div>
                <button
                  onClick={() => {
                    params.delete("ref");
                    setParams(params, { replace: true });
                  }}
                  className="rounded-lg p-1 text-subtle hover:bg-elevated hover:text-fg"
                  aria-label="Odebrat referenci"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <Select
                value=""
                onChange={(e) => {
                  if (!e.target.value) return;
                  params.set("ref", e.target.value);
                  setParams(params, { replace: true });
                }}
              >
                <option value="">Bez reference — nebo vyberte virální post…</option>
                {[...posts]
                  .sort((a, b) => Number(b.savedToSwipe) - Number(a.savedToSwipe) || b.viralScore - a.viralScore)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.savedToSwipe ? "★ " : ""}
                      {p.viralScore} · {p.title}
                    </option>
                  ))}
              </Select>
            )}
          </div>

          {/* Format */}
          <div>
            <div className="label mb-2">Formát</div>
            <div className="grid grid-cols-2 gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => {
                    setFormat(f.value);
                    setPlatform(f.platform);
                  }}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all [&_svg]:size-4",
                    format === f.value ? "border-brand/60 bg-brand/[0.08] ring-4 ring-brand/10" : "border-border hover:border-fg/20",
                  )}
                >
                  <span className={cn("flex items-center gap-2 text-sm font-semibold", format === f.value && "[&_svg]:text-brand")}>
                    {f.icon}
                    {f.label}
                  </span>
                  <span className="text-[11px] text-subtle">{f.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Platforma">
              <Select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
                {(Object.keys(PLATFORM_LABEL) as Platform[]).map((p) => (
                  <option key={p} value={p}>
                    {PLATFORM_LABEL[p]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Persona">
              <Select value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
                {brand.personas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Téma">
            <Textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={3} placeholder="Např. Proč web za 5 000 Kč stojí ve skutečnosti 50 000 Kč" />
          </Field>
          {topicIdeas.length > 0 && (
            <div className="-mt-2 flex flex-wrap gap-1.5">
              <Lightbulb className="size-3.5 text-warning" />
              {topicIdeas.map((t) => (
                <button key={t} onClick={() => setTopic(t)} className="max-w-full truncate rounded-full border border-border px-2 py-0.5 text-[11px] text-muted hover:border-brand/40 hover:text-brand">
                  {t}
                </button>
              ))}
            </div>
          )}

          <div>
            <div className="label mb-2">Cíl</div>
            <div className="grid grid-cols-4 gap-1.5">
              {GOALS.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGoal(g.value)}
                  title={g.desc}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                    goal === g.value ? "border-brand/60 bg-brand/10 text-fg" : "border-border text-muted hover:text-fg",
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <Field label="Doplňující pokyny (volitelné)">
            <Textarea value={extra} onChange={(e) => setExtra(e.target.value)} rows={2} placeholder="Zmínit klienta Finelia, max. 30 s, bez emoji…" className="min-h-[64px]" />
          </Field>

          <Button size="lg" className="w-full" onClick={generate} loading={busy} disabled={!ready}>
            <Wand2 /> {output ? "Vygenerovat znovu" : "Vygenerovat obsah"}
          </Button>
          <p className="-mt-2 text-center text-[11px] text-subtle">Ctrl + Enter</p>
        </div>

        {/* Output */}
        <div className="card min-h-[560px] p-5 md:p-6">
          <AnimatePresence mode="wait">
            {busy ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Sparkles className="size-4 animate-pulse text-brand" /> Analyzuji referenci a píšu v tónu {brand.name}…
                </div>
                <Skeleton className="h-9 w-80" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full" />
                ))}
              </motion.div>
            ) : output ? (
              <motion.div key="output" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="mb-5 flex flex-col gap-3 border-b border-border/70 pb-5 2xl:flex-row 2xl:items-start 2xl:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-subtle">
                      <PlatformIcon platform={output.platform} className="size-3.5" />
                      {PLATFORM_LABEL[output.platform]} · {FORMATS.find((f) => f.value === output.format)?.label}
                      <Badge tone={output.meta.engine === "claude" ? "success" : "neutral"}>{output.meta.engine === "claude" ? "Claude" : "Lokální engine"}</Badge>
                    </div>
                    <h2 className="mt-1.5 text-xl font-bold tracking-tight">{output.title}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (await copyToClipboard(fullText(output))) toast.success("Celý scénář zkopírován do schránky");
                      }}
                    >
                      <Copy /> Kopírovat vše
                    </Button>
                    <Button variant="outline" size="sm" onClick={generate}>
                      <RefreshCw /> Znovu
                    </Button>
                    {(output.format === "reel" || output.script.length > 0) && (
                      <Button variant="outline" size="sm" onClick={() => navigate("/video", { state: { output, trendId: trend?.id } })}>
                        <Clapperboard /> Udělat video
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={crm}>
                      <Send /> Do CRM
                    </Button>
                    <Button size="sm" onClick={() => save(format === "reel" ? "to_shoot" : "generated")} disabled={Boolean(savedId)}>
                      <KanbanSquare /> {savedId ? "Uloženo" : "Uložit do Pipeline"}
                    </Button>
                  </div>
                </div>
                <OutputView output={output} />
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full min-h-[480px] flex-col items-center justify-center text-center">
                <div className="relative mb-6">
                  <div className="absolute inset-0 animate-pulse rounded-full bg-brand/25 blur-2xl" />
                  <div className="relative grid size-16 place-items-center rounded-2xl border border-brand/30 bg-brand/10">
                    <Sparkles className="size-7 text-brand" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold">
                  Připraveno k <span className="serif-accent">tvorbě</span>
                </h3>
                <p className="mt-2 max-w-md text-sm text-muted">
                  Vlevo zvolte formát a téma. Pro nejlepší výsledek vyberte virální referenci — AI převezme její strukturu úspěchu a přepíše ji pro {brand.name}.
                </p>
                <div className="mt-6 flex gap-2">
                  <Button variant="outline" onClick={() => navigate("/radar")}>
                    Najít referenci v radaru
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
