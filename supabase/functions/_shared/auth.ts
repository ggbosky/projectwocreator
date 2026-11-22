import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "./cors.ts";

export type Role = "admin" | "editor" | "viewer";

export interface Caller {
  userId: string;
  email: string;
  role: Role;
  /** Service-role client — bypasses RLS. Use only for server-side lookups. */
  admin: SupabaseClient;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const adminClient = () =>
  createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

/**
 * Verifies the caller's JWT and team membership. Every function calls this
 * first, so anonymous or non-member requests never reach paid APIs.
 */
export async function requireMember(req: Request, minRole: Role = "editor"): Promise<Caller> {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Missing Authorization header");

  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Invalid or expired session");

  const { data: profile } = await admin.from("profiles").select("role, email").eq("id", data.user.id).maybeSingle();
  if (!profile) throw new HttpError(403, "Not a team member");

  const rank: Record<Role, number> = { viewer: 0, editor: 1, admin: 2 };
  const role = profile.role as Role;
  if (rank[role] < rank[minRole]) throw new HttpError(403, `Requires role ${minRole}`);

  return { userId: data.user.id, email: profile.email as string, role, admin };
}

/** Simple per-user rate limit backed by activity_log (protects API credits). */
export async function enforceRateLimit(caller: Caller, action: string, maxPerHour: number) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await caller.admin
    .from("activity_log")
    .select("id", { count: "exact", head: true })
    .eq("actor", caller.userId)
    .eq("action", action)
    .gte("created_at", since);
  if ((count ?? 0) >= maxPerHour) {
    throw new HttpError(429, `Limit ${maxPerHour} požadavků za hodinu vyčerpán. Zkuste to později.`);
  }
}

export async function logActivity(caller: Caller, action: string, meta: Record<string, unknown> = {}) {
  await caller.admin.from("activity_log").insert({ actor: caller.userId, action, meta });
}
