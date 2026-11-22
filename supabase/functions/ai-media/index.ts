// deno-lint-ignore-file no-explicit-any
import { enforceRateLimit, logActivity, requireMember } from "../_shared/auth.ts";
import { handler, HttpError, json } from "../_shared/cors.ts";
import { getSecret } from "../_shared/secrets.ts";

/**
 * Text-to-video / text-to-image through fal.ai (queue API) or Replicate.
 *  submit → { jobId, provider, model }
 *  status → { status: queued|running|done|failed, url? }
 * Finished files are copied into the private "media" bucket so they don't
 * expire with the provider's CDN, and returned as a long-lived signed URL.
 */

const ASPECT_SIZE: Record<string, { w: number; h: number }> = {
  "9:16": { w: 768, h: 1344 },
  "1:1": { w: 1024, h: 1024 },
  "16:9": { w: 1344, h: 768 },
  "4:5": { w: 896, h: 1120 },
};

function falInput(kind: string, model: string, prompt: string, aspect: string, duration?: number) {
  const input: Record<string, unknown> = { prompt, aspect_ratio: aspect };
  if (kind === "video") {
    // Providers differ in accepted durations; send the common forms.
    const d = Math.max(4, Math.min(10, Math.round(duration ?? 5)));
    input.duration = model.includes("veo") ? `${Math.min(8, d)}s` : model.includes("kling") ? (d > 7 ? "10" : "5") : String(d);
    if (model.includes("veo")) input.generate_audio = false;
  } else {
    const s = ASPECT_SIZE[aspect] ?? ASPECT_SIZE["4:5"];
    input.image_size = { width: s.w, height: s.h };
    input.num_images = 1;
  }
  return input;
}

function pickUrl(out: any): string | undefined {
  if (!out) return undefined;
  if (typeof out === "string") return out;
  if (Array.isArray(out)) return pickUrl(out[0]);
  return out.video?.url ?? out.images?.[0]?.url ?? out.image?.url ?? out.url ?? out.output?.[0] ?? undefined;
}

async function persist(admin: any, userId: string, url: string, kind: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) return url;
  const type = res.headers.get("content-type") ?? (kind === "video" ? "video/mp4" : "image/png");
  const ext = type.includes("mp4") ? "mp4" : type.includes("webm") ? "webm" : type.includes("jpeg") ? "jpg" : type.includes("webp") ? "webp" : kind === "video" ? "mp4" : "png";
  const path = `${userId}/ai-${Date.now()}.${ext}`;
  const { error } = await admin.storage.from("media").upload(path, await res.arrayBuffer(), { contentType: type });
  if (error) return url;
  const { data } = await admin.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl ?? url;
}

Deno.serve(
  handler(async (req) => {
    const caller = await requireMember(req, "editor");
    const body = await req.json();
    const provider = body.provider === "replicate" ? "replicate" : "fal";
    const model = String(body.model ?? "");
    if (!/^[a-z0-9][\w.\-/]{2,120}$/i.test(model)) throw new HttpError(400, "Neplatné ID modelu");
    const kind = body.kind === "image" ? "image" : "video";

    const key =
      provider === "fal"
        ? await getSecret(caller.admin, "fal_key", "FAL_KEY")
        : await getSecret(caller.admin, "replicate_token", "REPLICATE_API_TOKEN");
    if (!key) throw new HttpError(412, `Chybí klíč pro ${provider === "fal" ? "fal.ai" : "Replicate"} — nastavte ho v Nastavení → API klíče.`);

    if (body.action === "submit") {
      await enforceRateLimit(caller, "ai.media", Number(Deno.env.get("MEDIA_RATE_LIMIT_PER_HOUR") ?? 40));
      const prompt = String(body.prompt ?? "").slice(0, 4000);
      if (!prompt) throw new HttpError(400, "Chybí prompt");
      const aspect = String(body.aspect ?? "9:16");
      if (provider === "fal") {
        const res = await fetch(`https://queue.fal.run/${model}`, {
          method: "POST",
          headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify(falInput(kind, model, prompt, aspect, body.duration)),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.request_id) throw new HttpError(502, `fal.ai: ${data.detail ?? data.error ?? res.status}`);
        await logActivity(caller, "ai.media", { provider, model, kind });
        return json({ jobId: data.request_id, provider, model });
      }
      const res = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ input: { prompt, aspect_ratio: aspect, ...(kind === "video" ? { duration: Math.round(body.duration ?? 5) } : {}) } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.id) throw new HttpError(502, `Replicate: ${data.detail ?? data.error ?? res.status}`);
      await logActivity(caller, "ai.media", { provider, model, kind });
      return json({ jobId: data.id, provider, model });
    }

    if (body.action === "status") {
      const jobId = String(body.jobId ?? "");
      if (!/^[\w-]{6,80}$/.test(jobId)) throw new HttpError(400, "Neplatné ID úlohy");
      if (provider === "fal") {
        // Status/result URLs use the model's base path (owner/name) without sub-paths.
        const base = model.split("/").slice(0, 2).join("/");
        const st = await fetch(`https://queue.fal.run/${base}/requests/${jobId}/status`, { headers: { Authorization: `Key ${key}` } }).then((r) => r.json());
        if (st.status === "COMPLETED") {
          const result = await fetch(`https://queue.fal.run/${base}/requests/${jobId}`, { headers: { Authorization: `Key ${key}` } }).then((r) => r.json());
          const url = pickUrl(result);
          if (!url) return json({ status: "failed", error: result?.detail ?? "Výstup neobsahuje soubor" });
          return json({ status: "done", url: await persist(caller.admin, caller.userId, url, kind) });
        }
        if (st.status === "IN_QUEUE") return json({ status: "queued" });
        if (st.status === "IN_PROGRESS") return json({ status: "running" });
        return json({ status: "failed", error: st.detail ?? st.error ?? `stav ${st.status}` });
      }
      const p = await fetch(`https://api.replicate.com/v1/predictions/${jobId}`, { headers: { Authorization: `Bearer ${key}` } }).then((r) => r.json());
      if (p.status === "succeeded") {
        const url = pickUrl(p.output);
        if (!url) return json({ status: "failed", error: "Výstup neobsahuje soubor" });
        return json({ status: "done", url: await persist(caller.admin, caller.userId, url, kind) });
      }
      if (p.status === "failed" || p.status === "canceled") return json({ status: "failed", error: p.error ?? p.status });
      return json({ status: p.status === "starting" ? "queued" : "running" });
    }

    throw new HttpError(400, "Neznámá akce");
  }),
);
