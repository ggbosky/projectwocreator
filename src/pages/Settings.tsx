import { motion } from "framer-motion";
import {
  Bot,
  Clapperboard,
  Film,
  CheckCircle2,
  CircleDashed,
  Database,
  Download,
  KeyRound,
  Lock,
  Moon,
  Palette,
  RadioTower,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  Webhook,
  PlayCircle,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import { env } from "@/lib/env";
import { getSupabase, invokeFunction } from "@/lib/supabase";
import type { TeamRole } from "@/lib/types";
import { downloadJson } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import { useData } from "@/store/data";
import { useUi } from "@/store/ui";

const INTEGRATIONS: { key: string; name: string; desc: string; icon: ReactNode; placeholder: string; docs: string }[] = [
  { key: "anthropic_api_key", name: "Anthropic Claude", desc: "Generování scénářů, postů a analýzy virálů.", icon: <Bot />, placeholder: "sk-ant-…", docs: "https://console.anthropic.com/settings/keys" },
  { key: "fal_key", name: "fal.ai", desc: "Generování AI videí (Veo, Kling, Hailuo, Seedance) a obrázků (FLUX, Imagen).", icon: <Clapperboard />, placeholder: "fal key id:secret", docs: "https://fal.ai/dashboard/keys" },
  { key: "replicate_token", name: "Replicate", desc: "Alternativní poskytovatel AI videí a obrázků.", icon: <Film />, placeholder: "r8_…", docs: "https://replicate.com/account/api-tokens" },
  { key: "apify_token", name: "Apify", desc: "Stahování dat z Instagramu a TikToku (Viral Radar).", icon: <RadioTower />, placeholder: "apify_api_…", docs: "https://console.apify.com/settings/integrations" },
  { key: "youtube_api_key", name: "YouTube Data API", desc: "Vyhledávání virálních Shorts.", icon: <PlayCircle />, placeholder: "AIza…", docs: "https://console.cloud.google.com/apis/library/youtube.googleapis.com" },
  { key: "crm_webhook_secret", name: "CRM webhook secret", desc: "HMAC podpis požadavků do Project Two CRM.", icon: <Webhook />, placeholder: "náhodný řetězec 32+ znaků", docs: "" },
];

interface Member {
  id: string;
  email: string;
  full_name: string | null;
  role: TeamRole;
}

export default function SettingsPage() {
  const user = useAuth((s) => s.user);
  const isAdmin = user?.role === "admin";
  const live = env.authMode === "supabase";

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Nastavení" title="Klíče, tým" accent="a data" description="Správa přístupů a integrací. API klíče se nikdy neukládají do prohlížeče — žijí šifrovaně v Supabase Vault nebo v secrets Edge Functions." />
      <SecurityOverview />
      <div className="grid gap-6 xl:grid-cols-2">
        <ApiKeys isAdmin={isAdmin} live={live} />
        <CrmSettings isAdmin={isAdmin} live={live} />
        <Team isAdmin={isAdmin} live={live} />
        <AccountAndAppearance />
        <DataTools isAdmin={isAdmin} />
      </div>
    </div>
  );
}

function Card({ icon, title, desc, children, action }: { icon: ReactNode; title: string; desc?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-brand/10 text-brand [&_svg]:size-4">{icon}</span>
          <div>
            <h2 className="font-semibold">{title}</h2>
            {desc && <p className="text-sm text-muted">{desc}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </motion.section>
  );
}

function SecurityOverview() {
  const live = env.authMode === "supabase";
  const items = [
    { ok: live, label: "Supabase Auth (e-mail + heslo)", fallback: "Demo přihlášení z .env" },
    { ok: live, label: "Row Level Security na všech tabulkách", fallback: "Data jen v localStorage" },
    { ok: true, label: "Žádná veřejná registrace", fallback: "" },
    { ok: true, label: "Ochrana všech rout + přesměrování na login", fallback: "" },
    { ok: live, label: "API klíče jen na serveru (Vault / Edge secrets)", fallback: "Lokální AI engine bez klíčů" },
    { ok: !env.demo.usesDefaultPassword || live, label: "Vlastní heslo nastaveno", fallback: "Používáte výchozí demo heslo!" },
  ];
  return (
    <div className={`card flex flex-col gap-4 p-5 md:flex-row md:items-center ${live ? "border-success/30" : "border-warning/30"}`}>
      <div className="flex items-center gap-3 md:w-64">
        <span className={`grid size-11 place-items-center rounded-2xl ${live ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
          {live ? <ShieldCheck className="size-5" /> : <Lock className="size-5" />}
        </span>
        <div>
          <div className="font-semibold">{live ? "Produkční režim" : "Demo režim"}</div>
          <div className="text-xs text-muted">VITE_AUTH_MODE={env.authMode}</div>
        </div>
      </div>
      <ul className="grid flex-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-2">
            {i.ok ? <CheckCircle2 className="size-4 shrink-0 text-success" /> : <CircleDashed className="size-4 shrink-0 text-warning" />}
            <span className={i.ok ? "" : "text-warning"}>{i.ok ? i.label : i.fallback}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ApiKeys({ isAdmin, live }: { isAdmin: boolean; live: boolean }) {
  const [status, setStatus] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!live) return;
    const { data, error } = await getSupabase()!.rpc("list_integration_secrets");
    if (error) return toast.error(error.message);
    setStatus(Object.fromEntries(((data ?? []) as { name: string; updated_at: string }[]).map((r) => [r.name, r.updated_at])));
  }, [live]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const store = async (key: string, v: string) => {
    setBusy(true);
    try {
      const { error } = await getSupabase()!.rpc("set_integration_secret", { secret_name: key, secret_value: v });
      if (error) throw new Error(error.message);
      toast.success(v ? "Klíč bezpečně uložen do Supabase Vault" : "Klíč odstraněn");
      setEditing(null);
      setValue("");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card icon={<KeyRound />} title="API klíče" desc={live ? "Šifrováno v Supabase Vault. Čitelné jen pro Edge Functions (service role)." : "V demo režimu se AI generuje lokálně, bez klíčů."}>
      <ul className="divide-y divide-border/70">
        {INTEGRATIONS.map((i) => {
          const set = Boolean(status[i.key]);
          return (
            <li key={i.key} className="flex items-center gap-3 py-3">
              <span className="grid size-8 place-items-center rounded-lg bg-elevated text-muted [&_svg]:size-4">{i.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {i.name}
                  {live ? set ? <Badge tone="success">Nastaveno</Badge> : <Badge>Chybí</Badge> : <Badge tone="warning">Demo</Badge>}
                </div>
                <p className="truncate text-xs text-subtle">{i.desc}</p>
              </div>
              {live && isAdmin && (
                <Button variant="outline" size="sm" onClick={() => setEditing(i.key)}>
                  {set ? "Změnit" : "Nastavit"}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {!live && (
        <p className="mt-3 rounded-xl bg-elevated/60 p-3 text-xs text-muted">
          Proč nejde vložit klíč tady? Všechno v prohlížeči (včetně .env proměnných VITE_*) je veřejně čitelné. Klíče proto patří výhradně na server — po připojení Supabase je vložíte zde nebo přes <code>supabase secrets set</code>.
        </p>
      )}
      {live && !isAdmin && <p className="mt-3 text-xs text-subtle">Klíče může měnit jen administrátor.</p>}

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(o) => !o && setEditing(null)}
        size="sm"
        title={INTEGRATIONS.find((i) => i.key === editing)?.name ?? ""}
        description="Hodnota se po uložení už nikdy nezobrazí — ani administrátorovi."
        footer={
          <>
            {editing && status[editing] && (
              <Button variant="danger" className="mr-auto" onClick={() => editing && store(editing, "")} loading={busy}>
                <Trash2 /> Odstranit
              </Button>
            )}
            <Button onClick={() => editing && store(editing, value.trim())} loading={busy} disabled={value.trim().length < 8}>
              Uložit šifrovaně
            </Button>
          </>
        }
      >
        <Input type="password" autoComplete="off" value={value} onChange={(e) => setValue(e.target.value)} placeholder={INTEGRATIONS.find((i) => i.key === editing)?.placeholder} />
        {INTEGRATIONS.find((i) => i.key === editing)?.docs && (
          <a href={INTEGRATIONS.find((i) => i.key === editing)!.docs} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-brand hover:underline">
            Kde klíč získat →
          </a>
        )}
      </Dialog>
    </Card>
  );
}

function CrmSettings({ isAdmin, live }: { isAdmin: boolean; live: boolean }) {
  const [url, setUrl] = useState(env.crmWebhookUrl);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!live) return;
    void getSupabase()!
      .from("integration_settings")
      .select("value")
      .eq("key", "crm_webhook_url")
      .maybeSingle()
      .then(({ data }) => data?.value && setUrl(data.value as string));
  }, [live]);

  const save = async () => {
    if (url && !/^https:\/\/\S+$/i.test(url)) return toast.error("Webhook musí být https:// URL");
    setBusy(true);
    try {
      const { error } = await getSupabase()!.from("integration_settings").upsert({ key: "crm_webhook_url", value: url });
      if (error) throw new Error(error.message);
      toast.success("CRM webhook uložen");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card icon={<Webhook />} title="Project Two CRM" desc="Kam posílat obsah tlačítkem „Odeslat do Project Two CRM“.">
      <Field label="Webhook URL" hint={live ? "Požadavky podepisuje Edge Function hlavičkou X-Projectwo-Signature (HMAC-SHA256)." : "V demo režimu se nastavuje přes VITE_CRM_WEBHOOK_URL v .env."}>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hook.eu1.make.com/…" disabled={!live || !isAdmin} />
      </Field>
      <div className="mt-3 flex items-center justify-between">
        <a href={env.crmDashboardUrl} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline">
          Otevřít CRM dashboard →
        </a>
        {live && isAdmin && (
          <Button size="sm" onClick={save} loading={busy}>
            Uložit
          </Button>
        )}
      </div>
    </Card>
  );
}

function Team({ isAdmin, live }: { isAdmin: boolean; live: boolean }) {
  const user = useAuth((s) => s.user);
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<TeamRole>("editor");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!live) return;
    const { data, error } = await getSupabase()!.from("profiles").select("id, email, full_name, role").order("created_at");
    if (error) toast.error(error.message);
    else setMembers((data ?? []) as Member[]);
  }, [live]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const invite = async () => {
    setBusy(true);
    try {
      await invokeFunction("admin-users", { action: "invite", email: email.trim().toLowerCase(), fullName: name.trim(), role });
      toast.success(`Pozvánka odeslána na ${email}`);
      setInviteOpen(false);
      setEmail("");
      setName("");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (id: string, r: TeamRole) => {
    try {
      await invokeFunction("admin-users", { action: "set_role", userId: id, role: r });
      toast.success("Role změněna");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (id: string) => {
    try {
      await invokeFunction("admin-users", { action: "remove", userId: id });
      toast.success("Uživatel odebrán");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const list: Member[] = live ? members : user ? [{ id: user.id, email: user.email, full_name: user.fullName, role: user.role }] : [];

  return (
    <Card
      icon={<Users />}
      title="Tým"
      desc="Registrace jsou vypnuté. Nové členy přidává jen administrátor."
      action={
        live && isAdmin ? (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus /> Pozvat
          </Button>
        ) : undefined
      }
    >
      <ul className="divide-y divide-border/70">
        {list.map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-2.5">
            <div className="grid size-8 place-items-center rounded-lg bg-elevated text-xs font-bold">{(m.full_name || m.email).slice(0, 2).toUpperCase()}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {m.full_name || m.email} {m.id === user?.id && <span className="text-xs text-subtle">(vy)</span>}
              </div>
              <div className="truncate text-xs text-subtle">{m.email}</div>
            </div>
            {live && isAdmin && m.id !== user?.id ? (
              <>
                <Select value={m.role} onChange={(e) => changeRole(m.id, e.target.value as TeamRole)} className="h-8 w-28 text-xs">
                  <option value="admin">admin</option>
                  <option value="editor">editor</option>
                  <option value="viewer">viewer</option>
                </Select>
                <Button variant="ghost" size="icon-sm" onClick={() => remove(m.id)} aria-label="Odebrat uživatele">
                  <Trash2 />
                </Button>
              </>
            ) : (
              <Badge tone={m.role === "admin" ? "brand" : "neutral"}>{m.role}</Badge>
            )}
          </li>
        ))}
      </ul>
      {!live && <p className="mt-3 text-xs text-subtle">Správa týmu je dostupná po připojení Supabase (Edge Function `admin-users`).</p>}

      <Dialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        size="sm"
        title="Pozvat člena týmu"
        description="Pošleme e-mail s odkazem pro nastavení hesla."
        footer={
          <Button onClick={invite} loading={busy} disabled={!/^\S+@\S+\.\S+$/.test(email)}>
            Odeslat pozvánku
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="E-mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </Field>
          <Field label="Jméno">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Role" hint="admin = vše vč. klíčů a týmu · editor = obsah a značka · viewer = jen čtení">
            <Select value={role} onChange={(e) => setRole(e.target.value as TeamRole)}>
              <option value="editor">editor</option>
              <option value="viewer">viewer</option>
              <option value="admin">admin</option>
            </Select>
          </Field>
        </div>
      </Dialog>
    </Card>
  );
}

function AccountAndAppearance() {
  const user = useAuth((s) => s.user);
  const updatePassword = useAuth((s) => s.updatePassword);
  const { theme, toggleTheme } = useUi();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Card icon={<Palette />} title="Účet a vzhled">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div className="flex items-center gap-2 text-sm">
            <Moon className="size-4 text-subtle" /> Tmavý režim
          </div>
          <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
        </div>
        <div className="text-sm">
          <div className="label mb-1">Přihlášen jako</div>
          {user?.email} · <Badge tone="brand">{user?.role}</Badge>
        </div>
        {user?.mode === "supabase" ? (
          <div className="flex gap-2">
            <Input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nové heslo (min. 10 znaků)" />
            <Button
              variant="outline"
              loading={busy}
              disabled={pw.length < 10}
              onClick={async () => {
                setBusy(true);
                try {
                  await updatePassword(pw);
                  setPw("");
                  toast.success("Heslo změněno");
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Změnit
            </Button>
          </div>
        ) : (
          <p className="rounded-xl bg-elevated/60 p-3 text-xs text-muted">
            Demo heslo změníte příkazem <code>npm run hash-password -- "NoveHeslo"</code> a vložením hashe do <code>VITE_DEMO_PASSWORD_HASH</code>.
          </p>
        )}
      </div>
    </Card>
  );
}

function DataTools({ isAdmin }: { isAdmin: boolean }) {
  const { brand, creators, posts, content, seedSample, reset } = useData();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <Card icon={<Database />} title="Data" desc={`${creators.length} tvůrců · ${posts.length} postů · ${content.length} položek obsahu`}>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          loading={busy === "seed"}
          onClick={async () => {
            setBusy("seed");
            try {
              await seedSample();
              toast.success("Ukázková data nahrána");
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(null);
            }
          }}
        >
          <Database /> Naplnit ukázkovými daty
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            downloadJson(`projectwo-creator-export-${new Date().toISOString().slice(0, 10)}.json`, { exportedAt: new Date().toISOString(), brand, creators, posts, content });
            toast.success("Export stažen");
          }}
        >
          <Download /> Exportovat vše (JSON)
        </Button>
        {isAdmin && (
          <Button
            variant="danger"
            loading={busy === "reset"}
            onClick={async () => {
              if (!confirmReset) {
                setConfirmReset(true);
                setTimeout(() => setConfirmReset(false), 4000);
                return;
              }
              setBusy("reset");
              try {
                await reset();
                toast.success("Data byla resetována");
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(null);
                setConfirmReset(false);
              }
            }}
          >
            <RotateCcw /> {confirmReset ? "Klikněte znovu pro potvrzení" : "Resetovat data"}
          </Button>
        )}
      </div>
    </Card>
  );
}
