import * as DM from "@radix-ui/react-dropdown-menu";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Check, Clapperboard, Copy, ExternalLink, Film, ImagePlus, Loader2, RefreshCw, Sparkles, Trash2, Upload, X } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Tip } from "@/components/ui/misc";
import type { Shot, Transition, VideoProject } from "@/lib/types";
import { cn, copyToClipboard } from "@/lib/utils";
import { EXTERNAL_TOOLS } from "@/lib/video/providers";

const TRANSITIONS: Record<Transition, string> = { cut: "Střih", flash: "Záblesk", zoom: "Zoom punch", whip: "Whip pan" };

interface Props {
  shot: Shot;
  index: number;
  count: number;
  project: VideoProject;
  active: boolean;
  canGenerate: boolean;
  onChange: (patch: Partial<Shot>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onGenerate: () => void;
  onUpload: (file: File) => void;
}

export function ShotCard({ shot, index, count, project, active, canGenerate, onChange, onMove, onRemove, onGenerate, onUpload }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const hasMedia = Boolean(shot.videoUrl || shot.imageUrl);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-2xl border bg-surface p-4 transition-colors", active ? "border-brand/50 ring-4 ring-brand/10" : "border-border")}
    >
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div className="relative w-24 shrink-0">
          <div className="aspect-[9/16] overflow-hidden rounded-xl border border-border bg-gradient-to-br from-zinc-800 to-zinc-950">
            {shot.videoUrl ? (
              <video src={shot.videoUrl} muted loop playsInline autoPlay className="h-full w-full object-cover" crossOrigin="anonymous" />
            ) : shot.imageUrl ? (
              <img src={shot.imageUrl} alt="" className="h-full w-full object-cover" crossOrigin="anonymous" />
            ) : (
              <div className="grid h-full place-items-center p-2 text-center text-[10px] text-zinc-400">
                {shot.status === "generating" ? <Loader2 className="size-5 animate-spin text-brand" /> : <Film className="size-5" />}
              </div>
            )}
          </div>
          <span className="absolute -left-2 -top-2 grid size-6 place-items-center rounded-lg bg-fg text-xs font-bold text-bg">{index + 1}</span>
          {hasMedia && (
            <button onClick={() => onChange({ videoUrl: undefined, imageUrl: undefined, status: "draft" })} className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-danger text-white" aria-label="Odebrat klip">
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Fields */}
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              min={1}
              max={15}
              step={0.5}
              value={shot.duration}
              onChange={(e) => onChange({ duration: Math.max(1, Math.min(15, Number(e.target.value) || 1)) })}
              className="h-8 w-20 text-xs"
              aria-label="Délka v sekundách"
            />
            <span className="text-xs text-subtle">s</span>
            <Select value={shot.transition} onChange={(e) => onChange({ transition: e.target.value as Transition })} className="h-8 w-32 text-xs" aria-label="Přechod">
              {Object.entries(TRANSITIONS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            {shot.status === "ready" && <Badge tone="success"><Check /> Klip</Badge>}
            {shot.status === "generating" && <Badge tone="warning"><Loader2 className="animate-spin" /> Generuje se</Badge>}
            {shot.status === "failed" && <Badge tone="danger" title={shot.error}>Chyba</Badge>}
            <div className="ml-auto flex">
              <Button variant="ghost" size="icon-sm" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Posunout nahoru"><ArrowUp /></Button>
              <Button variant="ghost" size="icon-sm" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Posunout dolů"><ArrowDown /></Button>
              <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label="Smazat záběr"><Trash2 /></Button>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <label className="space-y-1">
              <span className="label">Text na obrazovce</span>
              <Input value={shot.onScreenText} onChange={(e) => onChange({ onScreenText: e.target.value })} className="h-9" />
            </label>
            <label className="space-y-1">
              <span className="label">Kamera</span>
              <Input value={shot.camera} onChange={(e) => onChange({ camera: e.target.value })} className="h-9" />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="label">Voiceover (titulky)</span>
            <Textarea value={shot.voiceover} onChange={(e) => onChange({ voiceover: e.target.value })} rows={2} className="min-h-[56px]" />
          </label>
          <details className="group rounded-xl border border-border bg-elevated/40 px-3 py-2 text-sm">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-medium text-muted">
              <Clapperboard className="size-3.5 text-brand" /> {shot.description || "Popis záběru"} <span className="ml-auto text-subtle group-open:hidden">AI prompt ▾</span>
            </summary>
            <div className="mt-2 space-y-2">
              <Textarea value={shot.description} onChange={(e) => onChange({ description: e.target.value })} rows={2} className="min-h-[50px]" placeholder="Co je v záběru (česky)" />
              <Textarea value={shot.prompt} onChange={(e) => onChange({ prompt: e.target.value })} rows={3} className="font-mono text-xs" placeholder="Prompt pro AI video (anglicky)" />
            </div>
          </details>

          <div className="flex flex-wrap gap-1.5">
            <Tip content={canGenerate ? "Vygeneruje klip vybraným modelem" : "Vyžaduje ostrý režim (Supabase) a klíč fal.ai / Replicate"}>
              <span>
                <Button size="sm" onClick={onGenerate} disabled={!canGenerate || shot.status === "generating"}>
                  {shot.status === "generating" ? <Loader2 className="animate-spin" /> : hasMedia ? <RefreshCw /> : <Sparkles />}
                  {hasMedia ? "Znovu" : "Generovat AI klip"}
                </Button>
              </span>
            </Tip>
            <DM.Root>
              <DM.Trigger asChild>
                <Button size="sm" variant="outline">
                  <Copy /> Prompt pro…
                </Button>
              </DM.Trigger>
              <DM.Portal>
                <DM.Content sideOffset={6} className="z-50 w-64 rounded-xl border border-border bg-surface p-1.5 shadow-2xl">
                  {EXTERNAL_TOOLS.map((t) => (
                    <DM.Item
                      key={t.id}
                      onSelect={async () => {
                        if (await copyToClipboard(t.format(shot, project))) toast.success(`Prompt pro ${t.label} zkopírován`, { description: "Vložte ho do nástroje a hotový klip nahrajte zpět." });
                      }}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-elevated"
                    >
                      {t.label}
                      <a href={t.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-subtle hover:text-brand" aria-label={`Otevřít ${t.label}`}>
                        <ExternalLink className="size-3.5" />
                      </a>
                    </DM.Item>
                  ))}
                </DM.Content>
              </DM.Portal>
            </DM.Root>
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              {hasMedia ? <ImagePlus /> : <Upload />} Nahrát klip / obrázek
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="video/*,image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUpload(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
