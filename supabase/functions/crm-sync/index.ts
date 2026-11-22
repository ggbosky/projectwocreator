import { enforceRateLimit, logActivity, requireMember } from "../_shared/auth.ts";
import { handler, HttpError, json } from "../_shared/cors.ts";
import { getSecret } from "../_shared/secrets.ts";

async function hmac(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Forwards content to the Project Two CRM webhook.
 * Headers sent:  X-Projectwo-Event, X-Projectwo-Timestamp, X-Projectwo-Signature
 * Signature = hex(HMAC-SHA256(secret, `${timestamp}.${body}`)) — verify it on the CRM side.
 */
Deno.serve(
  handler(async (req) => {
    const caller = await requireMember(req, "editor");
    await enforceRateLimit(caller, "crm.sync", 120);
    const { payload } = await req.json();
    if (!payload?.schema || !Array.isArray(payload.items)) throw new HttpError(400, "Neplatný payload");
    if (payload.items.length > 200) throw new HttpError(400, "Max 200 položek najednou");

    const { data: setting } = await caller.admin.from("integration_settings").select("value").eq("key", "crm_webhook_url").maybeSingle();
    const url = (setting?.value as string | undefined) ?? Deno.env.get("CRM_WEBHOOK_URL");
    if (!url) throw new HttpError(412, "CRM webhook URL není nastavená (Nastavení → Project Two CRM).");
    if (!/^https:\/\//i.test(url)) throw new HttpError(400, "CRM webhook musí být https://");

    const secret = await getSecret(caller.admin, "crm_webhook_secret", "CRM_WEBHOOK_SECRET");
    const body = JSON.stringify({ ...payload, sentBy: caller.email });
    const ts = Math.floor(Date.now() / 1000).toString();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Projectwo-Event": "content.export",
      "X-Projectwo-Timestamp": ts,
    };
    if (secret) headers["X-Projectwo-Signature"] = await hmac(secret, `${ts}.${body}`);

    const res = await fetch(url, { method: "POST", headers, body });
    if (res.ok) {
      const ids = payload.items.map((i: { id: string }) => i.id).filter((id: string) => /^[0-9a-f-]{36}$/i.test(id));
      if (ids.length) await caller.admin.from("content_items").update({ crm_synced_at: new Date().toISOString() }).in("id", ids);
    }
    await logActivity(caller, "crm.sync", { items: payload.items.length, status: res.status });
    return json({ delivered: res.ok, status: res.status });
  }),
);
