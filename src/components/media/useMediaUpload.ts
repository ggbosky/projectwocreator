import { useState } from "react";
import { toast } from "sonner";
import { kindOf, toMediaItem } from "@/lib/media";
import type { MediaItem } from "@/lib/types";
import { useData } from "@/store/data";

const MAX_MB = 200;

/** Uploads files into the media library; returns the stored items. */
export function useMediaUpload() {
  const addMedia = useData((s) => s.addMedia);
  const [busy, setBusy] = useState(false);

  const upload = async (files: FileList | File[], source: MediaItem["source"] = "upload"): Promise<MediaItem[]> => {
    const list = Array.from(files).filter((f) => {
      if (!kindOf(f.type)) {
        toast.error(`${f.name}: nepodporovaný typ`);
        return false;
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        toast.error(`${f.name}: soubor je větší než ${MAX_MB} MB`);
        return false;
      }
      return true;
    });
    if (!list.length) return [];
    setBusy(true);
    const tid = toast.loading(`Nahrávám ${list.length} ${list.length === 1 ? "soubor" : "soubory"}…`);
    try {
      const items: MediaItem[] = [];
      for (const f of list) items.push(await toMediaItem(f, f.name, source));
      const saved = await addMedia(items);
      const temp = saved.some((m) => !m.persistent);
      toast.success(`Přidáno do knihovny: ${saved.length}`, { id: tid, description: temp ? "V demo režimu bez úložiště vydrží jen do zavření záložky." : undefined });
      return saved;
    } catch (e) {
      toast.error((e as Error).message, { id: tid });
      return [];
    } finally {
      setBusy(false);
    }
  };

  return { upload, busy };
}
