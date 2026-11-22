import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let client: SupabaseClient | null = null;

/** Returns the Supabase client, or null when the app runs in demo mode. */
export function getSupabase(): SupabaseClient | null {
  if (env.authMode !== "supabase") return null;
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        storageKey: "pw-creator-auth",
      },
    });
  }
  return client;
}

export function requireSupabase(): SupabaseClient {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase není nakonfigurován (VITE_AUTH_MODE=supabase + URL + anon key).");
  return sb;
}

/** Calls a Supabase Edge Function with the current user's JWT. */
export async function invokeFunction<T>(name: string, body: unknown): Promise<T> {
  const sb = requireSupabase();
  const { data, error } = await sb.functions.invoke<T>(name, { body: body as Record<string, unknown> });
  if (error) {
    let message = error.message;
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const payload = await ctx.json();
        if (payload?.error) message = payload.error;
      } catch {
        /* response body was not JSON */
      }
    }
    throw new Error(message);
  }
  if (data === null) throw new Error(`Funkce ${name} nevrátila žádná data.`);
  return data;
}
