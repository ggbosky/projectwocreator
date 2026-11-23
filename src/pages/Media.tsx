import { AnimatePresence, motion } from "framer-motion";
import { Camera, Clapperboard, Copy, Download, Film, Image as ImageIcon, LibraryBig, Music, Palette, Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MediaThumb } from "@/components/media/MediaPicker";
import { RecorderDialog } from "@/components/media/RecorderDialog";
import { useMediaUpload } from "@/components/media/useMediaUpload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { SegmentedTabs } from "@/components/ui/tabs";
import type { MediaItem } from "@/lib/types";
import { cn, copyToClipboard, downloadFile } from "@/lib/utils";
import { useData } from "@/store/data";
import { AddToVideoDialog } from "./Graphics";

type Filter = "all" | "image" | "video" | "audio";

const SOURCE: Record<MediaItem["source"], string> = { upload: "Nahráno", graphic: "Grafika", ai_svg: "AI ilustrace", ai_api: "AI", recording: "Natočeno" };

export default function MediaPage() {
  const { media, deleteMedia } = useData();
  const { upload, busy } = useMediaUpload();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [drag, setDrag] = useState(false);
  const [open, setOpen] = useState<MediaItem | null>(null);
  const [toVideo, setToVideo] = useState<MediaItem | null>(null);
  const [recording, setRecording] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const list = useMemo(() => (filter === "all" ? media : media.filter((m) => m.kind === filter)), [media, filter]);
  const count = (k: Filter) => (k === "all" ? media.length : media.filter((m) => m.kind === k).length);
  const totalMb = media.reduce((a, m) => a + m.size, 0) / 1e6;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        void upload(e.dataTransfer.files);
      }}
    >
      <PageHeader
        eyebrow="Knihovna médií"
        title="Všechny vaše"
        accent="podklady"
        description="Fotky, screenshoty webů, AI klipy, nahrávky a hudba na jednom místě. Odtud je vkládáte do videí, karuselů a grafik."
        actions={
          <>
            <Button variant="outline" onClick={() => setRecording(true)}>
              <Camera /> Natočit
            </Button>
            <Button onClick={() => fileRef.current?.click()} loading={busy}>
              <Upload /> Nahrát soubory
            </Button>
          </>
        }
      />
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*"
        hidden
        onChange={(e) => {
          if (e.target.files?.length) void upload(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs
          value={filter}
          onValueChange={(v) => setFilter(v as Filter)}
          layoutId="media-tabs"
          items={[
            { value: "all", label: <><LibraryBig /> Vše</>, count: count("all") },
            { value: "image", label: <><ImageIcon /> Obrázky</>, count: count("image") },
            { value: "video", label: <><Film /> Videa</>, count: count("video") },
            { value: "audio", label: <><Music /> Zvuk</>, count: count("audio") },
          ]}
        />
        <span className="text-xs text-subtle">{totalMb.toFixed(1)} MB</span>
      </div>

      <div className={cn("rounded-3xl transition-colors", drag && "bg-brand/5 outline-dashed outline-2 outline-brand")}>
        {list.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
            <AnimatePresence>
              {list.map((m, i) => (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ delay: Math.min(i * 0.02, 0.2) }}
                  className="card group overflow-hidden"
                >
                  <button onClick={() => setOpen(m)} className="block aspect-square w-full overflow-hidden bg-elevated">
                    <MediaThumb item={m} className="transition-transform duration-300 group-hover:scale-105" />
                  </button>
                  <div className="space-y-1.5 p-2.5">
                    <p className="truncate text-xs font-medium" title={m.name}>
                      {m.name}
                    </p>
                    <div className="flex items-center gap-1">
                      <Badge>{SOURCE[m.source]}</Badge>
                      {!m.persistent && <Badge tone="warning">dočasné</Badge>}
                      <span className="ml-auto text-[10px] tabular-nums text-subtle">{(m.size / 1e6).toFixed(1)} MB</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <EmptyState
            icon={<LibraryBig />}
            title={media.length ? "V této kategorii nic není" : "Knihovna je prázdná"}
            text="Přetáhněte sem fotky, screenshoty webů klientů, AI klipy nebo hudbu. Nebo si natočte video rovnou z prohlížeče."
            action={
              <Button onClick={() => fileRef.current?.click()}>
                <Upload /> Nahrát soubory
              </Button>
            }
          />
        )}
      </div>

      <Dialog
        open={Boolean(open)}
        onOpenChange={(o) => {
          if (!o) {
            setOpen(null);
            setConfirmDel(null);
          }
        }}
        size="lg"
        title={open?.name ?? ""}
        description={open ? `${SOURCE[open.source]} · ${(open.size / 1e6).toFixed(2)} MB${open.width ? ` · ${open.width}×${open.height}` : ""}` : ""}
        footer={
          open && (
            <>
              <Button
                variant={confirmDel === open.id ? "danger" : "ghost"}
                className="mr-auto"
                onClick={async () => {
                  if (confirmDel !== open.id) return setConfirmDel(open.id);
                  await deleteMedia(open.id);
                  setOpen(null);
                  setConfirmDel(null);
                  toast.success("Smazáno z knihovny");
                }}
              >
                <Trash2 /> {confirmDel === open.id ? "Opravdu smazat?" : "Smazat"}
              </Button>
              {open.kind === "image" && (
                <Button variant="outline" onClick={() => navigate("/graphics", { state: { media: open.url } })}>
                  <Palette /> Do grafiky
                </Button>
              )}
              {open.kind !== "audio" && (
                <Button variant="outline" onClick={() => setToVideo(open)}>
                  <Clapperboard /> Do videa
                </Button>
              )}
              <Button
                variant="outline"
                onClick={async () => {
                  const blob = await fetch(open.url).then((r) => r.blob());
                  if (await downloadFile(open.name, blob)) toast.success("Uloženo");
                }}
              >
                <Download /> Stáhnout
              </Button>
              <Button variant="ghost" size="icon" onClick={async () => (await copyToClipboard(open.url)) && toast.success("Odkaz zkopírován")} aria-label="Kopírovat odkaz">
                <Copy />
              </Button>
            </>
          )
        }
      >
        {open && (
          <div className="grid place-items-center">
            {open.kind === "image" && <img src={open.url} alt={open.name} className="max-h-[60vh] rounded-xl" />}
            {open.kind === "video" && <video src={open.url} controls playsInline className="max-h-[60vh] rounded-xl" />}
            {open.kind === "audio" && <audio src={open.url} controls className="w-full" />}
          </div>
        )}
      </Dialog>

      <AddToVideoDialog
        open={Boolean(toVideo)}
        onOpenChange={(o) => !o && setToVideo(null)}
        duration={toVideo?.kind === "video" ? 5 : 3}
        clipUrl={toVideo?.url}
        clipKind={toVideo?.kind === "video" ? "video" : "image"}
      />
      <RecorderDialog open={recording} onOpenChange={setRecording} />
    </div>
  );
}
