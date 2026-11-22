import { addDays, format, isWithinInterval, parseISO, startOfDay } from "date-fns";
import { cs } from "date-fns/locale";
import { motion } from "framer-motion";
import { ArrowRight, Bookmark, Brain, CalendarDays, Clapperboard, Flame, Layers, Lightbulb, Link2, Send, Sparkles } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PlatformIcon } from "@/components/radar/PlatformIcon";
import { TagBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ViralScore } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatNumber, FORMAT_LABEL, STATUS_LABEL } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import { useData } from "@/store/data";

function greeting() {
  const h = new Date().getHours();
  if (h < 10) return "Dobré ráno";
  if (h < 18) return "Dobrý den";
  return "Dobrý večer";
}

export default function DashboardPage() {
  const user = useAuth((s) => s.user);
  const { posts, content, brand, ready, creators } = useData();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const now = new Date();
    return {
      ideas: content.filter((c) => c.status === "idea" || c.status === "generated").length,
      toShoot: content.filter((c) => c.status === "to_shoot").length,
      published: content.filter((c) => c.status === "published" || c.status === "done").length,
      swipe: posts.filter((p) => p.savedToSwipe).length,
      upcoming: content
        .filter((c) => c.scheduledFor && isWithinInterval(parseISO(c.scheduledFor), { start: startOfDay(now), end: addDays(now, 14) }))
        .sort((a, b) => (a.scheduledFor ?? "").localeCompare(b.scheduledFor ?? "")),
    };
  }, [content, posts]);

  const trending = useMemo(() => [...posts].sort((a, b) => b.viralScore - a.viralScore).slice(0, 4), [posts]);
  const recent = useMemo(() => [...content].filter((c) => c.output).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4), [content]);

  const brandChecks = [
    { ok: brand.description.length > 40, label: "Popis byznysu" },
    { ok: brand.usps.length >= 3, label: "Alespoň 3 USP" },
    { ok: brand.personas.length >= 1, label: "Persona cílovky" },
    { ok: brand.tone.length >= 2, label: "Tone of voice" },
    { ok: brand.referencePosts.length >= 1, label: "Referenční post" },
    { ok: brand.keywords.length >= 3, label: "Klíčová slova oboru" },
  ];
  const brandScore = Math.round((brandChecks.filter((c) => c.ok).length / brandChecks.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="label mb-2">{format(new Date(), "EEEE d. MMMM", { locale: cs })}</div>
          <h1 className="text-3xl font-bold tracking-tight">
            {greeting()}, <span className="serif-accent">{user?.fullName.split(" ")[0]}</span>.
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {stats.toShoot > 0 ? `Na natočení čeká ${stats.toShoot} ${stats.toShoot === 1 ? "video" : "videí"}. ` : ""}
            V radaru sledujete {creators.length} tvůrců a {posts.length} virálních příspěvků.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/radar?analyze=1")}>
            <Link2 /> Analyzovat odkaz
          </Button>
          <Button onClick={() => navigate("/studio")}>
            <Sparkles /> Vytvořit obsah
          </Button>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi loading={!ready} icon={<Lightbulb />} label="Nápady & vygenerováno" value={stats.ideas} to="/pipeline" />
        <Kpi loading={!ready} icon={<Clapperboard />} label="K natočení" value={stats.toShoot} to="/pipeline" accent />
        <Kpi loading={!ready} icon={<Send />} label="Hotovo / publikováno" value={stats.published} to="/pipeline" />
        <Kpi loading={!ready} icon={<Bookmark />} label="Swipe File" value={stats.swipe} to="/radar?tab=swipe" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Trending */}
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold">
              <Flame className="size-4 text-brand" /> Nejvirálnější v oboru
            </h2>
            <Link to="/radar" className="flex items-center gap-1 text-xs text-subtle hover:text-brand">
              Viral Radar <ArrowRight className="size-3" />
            </Link>
          </div>
          {!ready ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : trending.length ? (
            <div className="space-y-2">
              {trending.map((p, i) => (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => navigate(`/studio?ref=${encodeURIComponent(p.id)}`)}
                  className="group flex w-full items-center gap-4 rounded-xl border border-transparent p-2.5 text-left transition-colors hover:border-border hover:bg-elevated/50"
                >
                  <div className={cn("grid size-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br", p.thumbnailGradient)}>
                    <PlatformIcon platform={p.platform} className="size-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.title}</p>
                    <p className="truncate text-xs text-muted">„{p.hookText}“</p>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-subtle">
                      {formatNumber(p.views)} zhlédnutí
                      {p.tags.slice(0, 2).map((t) => (
                        <TagBadge key={t} tag={t} />
                      ))}
                    </div>
                  </div>
                  <ViralScore score={p.viralScore} size="sm" />
                  <span className="hidden items-center gap-1 rounded-lg bg-brand/10 px-2 py-1 text-xs font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100 md:flex">
                    <Sparkles className="size-3" /> Remix
                  </span>
                </motion.button>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Flame />} title="Radar je prázdný" text="Naplňte ho ukázkovými daty v Nastavení nebo vyhledejte tvůrce." />
          )}
        </section>

        <div className="space-y-6">
          {/* Brand Brain */}
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <Brain className="size-4 text-brand" /> Brand Brain
              </h2>
              <span className="text-sm font-bold tabular-nums">{brandScore} %</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-elevated">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-brand to-amber-400" initial={{ width: 0 }} animate={{ width: `${brandScore}%` }} transition={{ duration: 0.8 }} />
            </div>
            <ul className="mt-3 space-y-1.5 text-sm">
              {brandChecks.map((c) => (
                <li key={c.label} className={cn("flex items-center gap-2", c.ok ? "text-muted" : "text-fg")}>
                  <span className={cn("grid size-4 place-items-center rounded-full text-[10px]", c.ok ? "bg-success/15 text-success" : "border border-border")}>{c.ok ? "✓" : ""}</span>
                  {c.label}
                </li>
              ))}
            </ul>
            {brandScore < 100 && (
              <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => navigate("/brand")}>
                Doplnit profil značky
              </Button>
            )}
          </section>

          {/* Upcoming */}
          <section className="card p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <CalendarDays className="size-4 text-brand" /> Příštích 14 dní
            </h2>
            {stats.upcoming.length ? (
              <ul className="space-y-2">
                {stats.upcoming.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex items-center gap-3 text-sm">
                    <div className="w-12 shrink-0 rounded-lg bg-elevated py-1 text-center">
                      <div className="text-[10px] uppercase text-subtle">{format(parseISO(c.scheduledFor!), "EEE", { locale: cs })}</div>
                      <div className="font-bold">{format(parseISO(c.scheduledFor!), "d.")}</div>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.title}</p>
                      <p className="text-xs text-subtle">
                        {FORMAT_LABEL[c.format]} · {STATUS_LABEL[c.status]}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">
                Nic naplánováno.{" "}
                <Link to="/pipeline" className="text-brand hover:underline">
                  Přetáhněte obsah do kalendáře
                </Link>
                .
              </p>
            )}
          </section>
        </div>
      </div>

      {/* Recent generated */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Naposledy vygenerováno</h2>
          <Link to="/pipeline" className="flex items-center gap-1 text-xs text-subtle hover:text-brand">
            Pipeline <ArrowRight className="size-3" />
          </Link>
        </div>
        {recent.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {recent.map((c) => (
              <Link key={c.id} to="/pipeline" className="card p-4 transition-colors hover:border-brand/30">
                <div className="flex items-center gap-1.5 text-xs text-subtle">
                  <PlatformIcon platform={c.platform} className="size-3" /> {FORMAT_LABEL[c.format]}
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-semibold">{c.title}</p>
                <p className="mt-2 line-clamp-2 text-xs text-muted">{c.output?.hooks[0]?.spoken}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <QuickStart icon={<Clapperboard />} title="Scénář pro Reel" text="Hooky + scénář po vteřinách" onClick={() => navigate("/studio?format=reel")} />
            <QuickStart icon={<Layers />} title="Karusel" text="7 slidů z virální reference" onClick={() => navigate("/studio?format=carousel")} />
            <QuickStart icon={<Link2 />} title="Rozbor virálu" text="Vložte odkaz, AI řekne proč fungoval" onClick={() => navigate("/radar?analyze=1")} />
          </div>
        )}
      </section>
    </div>
  );
}

function Kpi({ icon, label, value, to, accent, loading }: { icon: ReactNode; label: string; value: number; to: string; accent?: boolean; loading?: boolean }) {
  return (
    <Link to={to} className={cn("card group p-4 transition-all hover:-translate-y-0.5", accent && "border-brand/30 bg-gradient-to-br from-brand/[0.1] to-transparent")}>
      <div className="flex items-center justify-between">
        <span className={cn("grid size-8 place-items-center rounded-lg [&_svg]:size-4", accent ? "bg-brand text-black" : "bg-elevated text-muted")}>{icon}</span>
        <ArrowRight className="size-4 text-subtle opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      {loading ? <Skeleton className="mt-4 h-8 w-12" /> : <div className="mt-4 text-3xl font-bold tabular-nums">{value}</div>}
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </Link>
  );
}

function QuickStart({ icon, title, text, onClick }: { icon: ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card group flex items-center gap-3 p-4 text-left transition-colors hover:border-brand/40">
      <span className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand [&_svg]:size-5">{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted">{text}</span>
      </span>
      <ArrowRight className="size-4 text-subtle transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
