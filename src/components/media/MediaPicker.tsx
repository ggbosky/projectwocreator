import { FileAudio, ImagePlus, Music, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { MediaItem, MediaKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useData } from "@/store/data";
import { useMediaUpload } from "./useMediaUpload";

export type PickFilter = MediaKind | "visual";

const ACCEPT: Record<PickFilter, string> = { image: "image/*", video: "video/*", audio: "audio/*", visual: "image/*,video/*" };

export function MediaThumb({ item, className }: { item: MediaItem; className?: string }) {
  if (item.kind === "image") return <img src={item.url} alt={item.name} className={cn("h-full w-full object-cover", className)} crossOrigin="anonymous" loading="lazy" />;
  if (item.kind === "video") return <video src={item.url} muted playsInline preload="metadata" className={cn("h-full w-full object-cover", className)} crossOrigin="anonymous" onMouseEnter={(e) => void e.currentTarget.play().catch(() => undefined)} onMouseLeave={(e) => e.currentTarget.pause()} />;
  return (
    <div className={cn("grid h-full w-full place-items-center bg-elevated text-subtle", className)}>
      <Music className="size-8" />
    </div>
  );
}

/** Pick an item from the media library, or upload a new one. */
export function MediaPicker({ open, onOpenChange, filter, onPick, title = "Vybrat z knihovny" }: { open: boolean; onOpenChange: (o: boolean) => void; filter: PickFilter; onPick: (m: MediaItem) => void; title?: string }) {
  const media = useData((s) => s.media);
  const { upload, busy } = useMediaUpload();
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const items = useMemo(() => media.filter((m) => (filter === "visual" ? m.kind !== "audio" : m.kind === filter)), [media, filter]);

  const pick = (m: MediaItem) => {
    onPick(m);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={title}
      footer={
        <Button onClick={() => ref.current?.click()} loading={busy}>
          <Upload /> Nahrát nový soubor
        </Button>
      }
    >
      <input
        ref={ref}
        type="file"
        accept={ACCEPT[filter]}
        hidden
        onChange={async (e) => {
          const files = e.target.files;
          if (!files?.length) return;
          const saved = await upload(files);
          e.target.value = "";
          if (saved[0]) pick(saved[0]);
        }}
      />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setDrag(false);
          const saved = await upload(e.dataTransfer.files);
          if (saved[0]) pick(saved[0]);
        }}
        className={cn("min-h-[220px] rounded-2xl border-2 border-dashed p-3 transition-colors", drag ? "border-brand bg-brand/5" : "border-transparent")}
      >
        {items.length ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {items.map((m) => (
              <button key={m.id} onClick={() => pick(m)} className="group overflow-hidden rounded-xl border border-border text-left transition hover:border-brand/60 hover:ring-4 hover:ring-brand/10">
                <div className="aspect-square overflow-hidden bg-elevated">
                  <MediaThumb item={m} className="transition-transform group-hover:scale-105" />
                </div>
                <div className="truncate px-2 py-1.5 text-[11px] text-muted">{m.name}</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-center text-sm text-muted">
            {filter === "audio" ? <FileAudio className="size-8 text-subtle" /> : <ImagePlus className="size-8 text-subtle" />}
            Knihovna je zatím prázdná — přetáhněte sem soubor nebo ho nahrajte.
          </div>
        )}
      </div>
    </Dialog>
  );
}
