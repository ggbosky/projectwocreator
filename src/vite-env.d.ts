/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_MODE?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_DEMO_USERNAME?: string;
  readonly VITE_DEMO_PASSWORD_HASH?: string;
  readonly VITE_DEMO_NAME?: string;
  readonly VITE_CRM_WEBHOOK_URL?: string;
  readonly VITE_CRM_DASHBOARD_URL?: string;
  readonly VITE_BASE_PATH?: string;
  readonly VITE_ROUTER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
