import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck, User } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wordmark } from "@/components/ui/logo";
import { env } from "@/lib/env";
import { useAuth } from "@/store/auth";

export function LoginPage() {
  const { status, signIn, requestPasswordReset } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [view, setView] = useState<"login" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  if (status === "authenticated") return <Navigate to={from} replace />;

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      toast.success("Vítejte zpět 👋");
      navigate(from === "/login" ? "/" : from, { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  const onReset = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setResetSent(true);
      toast.success("Odkaz pro obnovu hesla odeslán");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-bg px-4">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(55% 45% at 50% 0%, rgb(var(--brand) / 0.22), transparent 70%)" }}
      />
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="glass relative w-full max-w-[420px] rounded-2xl p-7 shadow-2xl"
      >
        <Wordmark badge="Creator" />

        <AnimatePresence mode="wait">
          {view === "login" ? (
            <motion.div key="login" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
              <h1 className="mt-8 text-[28px] font-bold tracking-tight">
                Vítejte <span className="serif-accent">zpět</span>.
              </h1>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                <Lock className="size-3.5" /> Interní nástroj — jen pro členy týmu.
              </p>

              <form onSubmit={onLogin} className="mt-7 space-y-4" noValidate>
                <label className="block space-y-1.5">
                  <span className="label">{env.authMode === "demo" ? "Jméno" : "E-mail"}</span>
                  <Input
                    icon={env.authMode === "demo" ? <User /> : <Mail />}
                    type={env.authMode === "demo" ? "text" : "email"}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={env.authMode === "demo" ? "Jméno" : "vy@projectwo.com"}
                    autoFocus
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="flex items-center justify-between">
                    <span className="label">Heslo</span>
                    <button
                      type="button"
                      onClick={() => {
                        setView("reset");
                        setError(null);
                      }}
                      className="text-xs text-subtle hover:text-brand"
                    >
                      Zapomenuté heslo?
                    </button>
                  </span>
                  <div className="relative">
                    <Input
                      icon={<KeyRound />}
                      type={show ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-fg"
                      aria-label={show ? "Skrýt heslo" : "Zobrazit heslo"}
                    >
                      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </label>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
                      role="alert"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <Button type="submit" className="w-full" size="lg" loading={busy} disabled={!email || !password}>
                  Přihlásit se
                </Button>
              </form>
            </motion.div>
          ) : (
            <motion.div key="reset" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
              <button
                onClick={() => {
                  setView("login");
                  setError(null);
                  setResetSent(false);
                }}
                className="mt-6 flex items-center gap-1 text-sm text-subtle hover:text-fg"
              >
                <ArrowLeft className="size-4" /> Zpět na přihlášení
              </button>
              <h1 className="mt-4 text-[26px] font-bold tracking-tight">
                Obnova <span className="serif-accent">hesla</span>
              </h1>
              <p className="mt-2 text-sm text-muted">Pošleme vám odkaz pro nastavení nového hesla. Funguje jen pro existující účty týmu.</p>
              {resetSent ? (
                <div className="mt-6 flex gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">
                  <ShieldCheck className="size-5 shrink-0" />
                  Pokud účet existuje, poslali jsme na {email} odkaz pro obnovu. Zkontrolujte i spam.
                </div>
              ) : (
                <form onSubmit={onReset} className="mt-6 space-y-4">
                  <Input icon={<Mail />} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vy@projectwo.com" />
                  {error && <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
                  <Button type="submit" className="w-full" size="lg" loading={busy} disabled={!email}>
                    Poslat odkaz
                  </Button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
