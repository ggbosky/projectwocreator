import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolves an integration secret. Order:
 *  1. Edge Function secret (supabase secrets set ANTHROPIC_API_KEY=...)
 *  2. Supabase Vault (set by an admin in the app's Settings page)
 */
export async function getSecret(admin: SupabaseClient, vaultName: string, envName: string): Promise<string | null> {
  const fromEnv = Deno.env.get(envName);
  if (fromEnv) return fromEnv;
  const { data, error } = await admin.rpc("get_integration_secret", { secret_name: vaultName });
  if (error) {
    console.error("vault lookup failed", vaultName, error.message);
    return null;
  }
  return (data as string | null) ?? null;
}
