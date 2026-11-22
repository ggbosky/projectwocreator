import { motion } from "framer-motion";
import { KeyRound, ShieldAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wordmark } from "@/components/ui/logo";
import { useAuth } from "@/store/auth";

/** Landing page for the Supabase password-recovery e-mail link. */
export function ResetPasswordPage() {
  const { status, recovery, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSet = recovery || status === "authenticated";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw !== pw2) return setError("Hesla se neshodují.");
    setBusy(true);
    try {
      await updatePassword(pw);
      toast.success("Heslo bylo změněno");
      navigate("/", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center bg-bg px-4">
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(55% 45% at 50% 0%, rgb(var(--brand) / 0.2), transparent 70%)" }} />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass relative w-full max-w-[420px] rounded-2xl p-7">
        <Wordmark />
        <h1 className="mt-8 text-[26px] font-bold tracking-tight">
          Nové <span className="serif-accent">heslo</span>
        </h1>
        {canSet ? (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Input icon={<KeyRound />} type="password" autoComplete="new-password" placeholder="Nové heslo (min. 10 znaků)" value={pw} onChange={(e) => setPw(e.target.value)} />
            <Input icon={<KeyRound />} type="password" autoComplete="new-password" placeholder="Heslo znovu" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            {error && <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
            <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!pw || !pw2}>
              Uložit heslo
            </Button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="flex gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
              <ShieldAlert className="size-4 shrink-0" /> Odkaz je neplatný nebo vypršel. Požádejte o nový na přihlašovací obrazovce.
            </p>
            <Link to="/login" className="text-sm text-brand hover:underline">
              Zpět na přihlášení
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
}
