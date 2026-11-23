/**
 * Runtime configuration. Everything prefixed with VITE_ is embedded into the
 * client bundle, so NEVER put a secret here (AI keys, service_role key, ...).
 * The Supabase anon key is public by design — data is protected by RLS.
 */
const raw = import.meta.env;

export type AuthMode = "demo" | "supabase";

const requestedMode = (raw.VITE_AUTH_MODE ?? "demo").toLowerCase() as AuthMode;
const supabaseUrl = raw.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = raw.VITE_SUPABASE_ANON_KEY ?? "";
const hasSupabase = Boolean(supabaseUrl && supabaseAnonKey);

export const env = {
  authMode: (requestedMode === "supabase" && hasSupabase ? "supabase" : "demo") as AuthMode,
  requestedMode,
  supabaseMisconfigured: requestedMode === "supabase" && !hasSupabase,
  supabaseUrl,
  supabaseAnonKey,
  demo: {
    /** Login name for the local (demo) sign-in. */
    username: (raw.VITE_DEMO_USERNAME ?? "admin").trim().toLowerCase(),
    // SHA-256 of the demo password (never the password itself).
    passwordHash:
      raw.VITE_DEMO_PASSWORD_HASH ?? "4a10a5268ac9e6bec4ba1e87d1a147cf82314e357cf6ba82397cb97092749cb1",
    name: raw.VITE_DEMO_NAME ?? "Admin",
    usesDefaultPassword: !raw.VITE_DEMO_PASSWORD_HASH,
  },
  crmWebhookUrl: raw.VITE_CRM_WEBHOOK_URL ?? "",
  crmDashboardUrl: raw.VITE_CRM_DASHBOARD_URL ?? "https://ggbosky.github.io/projectwodashboard/",
  isProd: raw.PROD,
};
