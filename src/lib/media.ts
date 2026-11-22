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
