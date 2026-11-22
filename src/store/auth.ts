import { create } from "zustand";
import { env } from "@/lib/env";
import { safeStorage } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase";
import type { AppUser, TeamRole } from "@/lib/types";
import { sha256Hex, sleep } from "@/lib/utils";

type Status = "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  status: Status;
  user: AppUser | null;
  /** True after a Supabase password-recovery link was opened. */
  recovery: boolean;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const DEMO_SESSION_KEY = "pw-demo-session";
const LOCK_KEY = "pw-login-lock";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;

interface DemoSession {
  email: string;
  name: string;
  exp: number;
  sig: string;
}

/** Signature binds the session to the configured password hash, so changing the
 * demo password in .env invalidates every existing demo session. */
async function signDemo(email: string, exp: number) {
  return sha256Hex(`${email}|${exp}|${env.demo.passwordHash}`);
}

async function readDemoSession(): Promise<DemoSession | null> {
  try {
    const raw = safeStorage.get(DEMO_SESSION_KEY);
    if (!raw) return null;
    const sess = JSON.parse(raw) as DemoSession;
    if (sess.exp < Date.now()) return null;
    if (sess.sig !== (await signDemo(sess.email, sess.exp))) return null;
    return sess;
  } catch {
    return null;
  }
}

function lockState(): { attempts: number; until: number } {
  try {
    return JSON.parse(safeStorage.get(LOCK_KEY) ?? "") as { attempts: number; until: number };
  } catch {
    return { attempts: 0, until: 0 };
  }
}

function registerFailure() {
  const s = lockState();
  const attempts = s.attempts + 1;
  const until = attempts >= MAX_ATTEMPTS ? Date.now() + LOCK_MS : 0;
  safeStorage.set(LOCK_KEY, JSON.stringify({ attempts: until ? 0 : attempts, until }));
}

function assertNotLocked() {
  const { until } = lockState();
  if (until > Date.now()) {
    const secs = Math.ceil((until - Date.now()) / 1000);
    throw new Error(`Příliš mnoho pokusů. Zkuste to znovu za ${secs} s.`);
  }
}

async function loadSupabaseProfile(userId: string, email: string): Promise<AppUser> {
  const sb = getSupabase()!;
  const { data, error } = await sb.from("profiles").select("id, email, full_name, role").eq("id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    // Authenticated in Supabase Auth but not a team member → no access.
    await sb.auth.signOut();
    throw new Error("Tento účet nemá přístup do Creator Studia. Kontaktujte administrátora.");
  }
  return {
    id: data.id as string,
    email: (data.email as string) ?? email,
    fullName: (data.full_name as string) || email.split("@")[0],
    role: data.role as TeamRole,
    mode: "supabase",
  };
}

let authListenerBound = false;

export const useAuth = create<AuthState>((set, get) => ({
  status: "loading",
  user: null,
  recovery: false,

  init: async () => {
    if (env.authMode === "demo") {
      const sess = await readDemoSession();
      set(
        sess
          ? {
              status: "authenticated",
              user: { id: "demo-admin", email: sess.email, fullName: sess.name, role: "admin", mode: "demo" },
            }
          : { status: "unauthenticated", user: null },
      );
      return;
    }

    const sb = getSupabase()!;
    if (!authListenerBound) {
      authListenerBound = true;
      sb.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY") set({ recovery: true });
        if (event === "SIGNED_OUT" || !session) {
          set({ status: "unauthenticated", user: null });
          return;
        }
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          // Defer DB calls outside the auth callback (supabase-js recommendation).
          setTimeout(async () => {
            try {
              const user = await loadSupabaseProfile(session.user.id, session.user.email ?? "");
              set({ status: "authenticated", user });
            } catch {
              set({ status: "unauthenticated", user: null });
            }
          }, 0);
        }
      });
    }
    const { data } = await sb.auth.getSession();
    if (!data.session) {
      set({ status: "unauthenticated", user: null });
      return;
    }
    try {
      const user = await loadSupabaseProfile(data.session.user.id, data.session.user.email ?? "");
      set({ status: "authenticated", user });
    } catch {
      set({ status: "unauthenticated", user: null });
    }
  },

  signIn: async (emailRaw, password) => {
    const email = emailRaw.trim().toLowerCase();
    assertNotLocked();
    if (env.authMode === "demo") {
      await sleep(450); // uniform delay, slows down brute force
      const ok = email === env.demo.email && (await sha256Hex(password)) === env.demo.passwordHash;
      if (!ok) {
        registerFailure();
        throw new Error("Nesprávný e-mail nebo heslo.");
      }
      safeStorage.remove(LOCK_KEY);
      const exp = Date.now() + SESSION_TTL_MS;
      const sess: DemoSession = { email, name: env.demo.name, exp, sig: await signDemo(email, exp) };
      safeStorage.set(DEMO_SESSION_KEY, JSON.stringify(sess));
      set({
        status: "authenticated",
        user: { id: "demo-admin", email, fullName: env.demo.name, role: "admin", mode: "demo" },
      });
      return;
    }
    const sb = getSupabase()!;
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      registerFailure();
      throw new Error(error?.message === "Invalid login credentials" ? "Nesprávný e-mail nebo heslo." : error?.message ?? "Přihlášení selhalo.");
    }
    safeStorage.remove(LOCK_KEY);
    const user = await loadSupabaseProfile(data.user.id, data.user.email ?? email);
    set({ status: "authenticated", user });
  },

  signOut: async () => {
    if (env.authMode === "demo") {
      safeStorage.remove(DEMO_SESSION_KEY);
    } else {
      await getSupabase()!.auth.signOut();
    }
    set({ status: "unauthenticated", user: null, recovery: false });
  },

  requestPasswordReset: async (email) => {
    if (env.authMode === "demo") {
      await sleep(600);
      throw new Error(
        "V demo režimu se heslo mění v souboru .env (VITE_DEMO_PASSWORD_HASH, viz `npm run hash-password`).",
      );
    }
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}reset-password`;
    const { error } = await getSupabase()!.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
    if (error) throw new Error(error.message);
  },

  updatePassword: async (password) => {
    if (password.length < 10) throw new Error("Heslo musí mít alespoň 10 znaků.");
    if (env.authMode === "demo") throw new Error("V demo režimu nelze heslo měnit z aplikace.");
    const { error } = await getSupabase()!.auth.updateUser({ password });
    if (error) throw new Error(error.message);
    set({ recovery: false });
    void get().init();
  },
}));
