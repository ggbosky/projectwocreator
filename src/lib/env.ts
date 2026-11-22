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
    email: (raw.VITE_DEMO_EMAIL ?? "admin@projectwo.com").toLowerCase(),
    // SHA-256 of the demo password. Default = sha256("projectwo-demo").
    passwordHash:
      raw.VITE_DEMO_PASSWORD_HASH ?? "d168875a8a155824e8519a363726b30bdb74b59a75b8f052bc36e95139537218",
    name: raw.VITE_DEMO_NAME ?? "Admin",
    usesDefaultPassword: !raw.VITE_DEMO_PASSWORD_HASH,
  },
  crmWebhookUrl: raw.VITE_CRM_WEBHOOK_URL ?? "",
  crmDashboardUrl: raw.VITE_CRM_DASHBOARD_URL ?? "https://ggbosky.github.io/projectwodashboard/",
  isProd: raw.PROD,
};
