/**
 * Stores uploaded or generated media and returns a URL the app can keep:
 *  - Supabase mode → private "media" bucket + long-lived signed URL
 *  - claude.ai Artifact → the artifact's asset store (persists with the page)
 *  - plain demo → in-memory object URL (valid until the tab closes)
 */
import { env } from "./env";
import { useCapability } from "./runtime";
import { getSupabase } from "./supabase";

export interface StoredMedia {
  url: string;
  persistent: boolean;
}

export async function storeMedia(file: Blob, name: string): Promise<StoredMedia> {
  if (env.authMode === "supabase") {
    const sb = getSupabase()!;
    const { data: u } = await sb.auth.getUser();
    const safe = name.toLowerCase().replace(/[^a-z0-9.\-_]/g, "-").slice(-60);
    const path = `${u.user?.id ?? "anon"}/${Date.now()}-${safe}`;
    const { error } = await sb.storage.from("media").upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (error) throw new Error(error.message);
    const { data, error: e2 } = await sb.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (e2 || !data) throw new Error(e2?.message ?? "Nelze vytvořit odkaz na soubor");
    return { url: data.signedUrl, persistent: true };
  }
  const assets = await useCapability("assets");
  if (assets) {
    try {
      const r = await assets.upload(file, { type: file.type || undefined });
      return { url: r.url, persistent: true };
    } catch (e) {
      console.warn("asset upload failed, using session URL", e);
    }
  }
  return { url: URL.createObjectURL(file), persistent: false };
}

import type { MediaItem, MediaKind } from "./types";
import { uid } from "./utils";

function probe(url: string, kind: MediaKind): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    if (kind === "image") {
      const i = new Image();
      i.onload = () => resolve({ width: i.naturalWidth, height: i.naturalHeight });
      i.onerror = () => resolve({});
      i.src = url;
    } else if (kind === "video") {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => resolve({ width: v.videoWidth, height: v.videoHeight });
      v.onerror = () => resolve({});
      v.src = url;
    } else resolve({});
    setTimeout(() => resolve({}), 6000);
  });
}

export function kindOf(mime: string): MediaKind | null {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return null;
}

/** Stores a file/blob and returns a library item (not yet added to the store). */
export async function toMediaItem(file: Blob, name: string, source: MediaItem["source"], tags: string[] = []): Promise<MediaItem> {
  const kind = kindOf(file.type);
  if (!kind) throw new Error(`Nepodporovaný typ souboru: ${file.type || name}`);
  const { url, persistent } = await storeMedia(file, name);
  const dims = await probe(url, kind);
  return { id: uid(), name, kind, url, mime: file.type, size: file.size, ...dims, source, persistent, tags, createdAt: new Date().toISOString() };
}
