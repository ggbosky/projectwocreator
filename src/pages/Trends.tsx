import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { cs } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Clapperboard,
  Flame,
  Infinity as InfinityIcon,
  Lightbulb,
  Loader2,
  Minus,
  Search,
  Sparkles,
  Star,
  Trash2,
  Wand2,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PlatformIcon } from "@/components/radar/PlatformIcon";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { CardSkeleton } from "@/components/ui/skeleton";
import { upcomingMoments } from "@/data/trends";
import { scoutTrends, trendIdeas } from "@/lib/ai/service";
import { useEngine } from "@/lib/ai/useEngine";
import type { Trend, TrendKind, TrendLifecycle } from "@/lib/types";
import { cn, FORMAT_LABEL } from "@/lib/utils";
import { useData } from "@/store/data";

const KIND: Record<TrendKind, { label: string; tone: BadgeTone }> = {
  popculture: { label: "Popkultura", tone: "purple" },
  meme: { label: "Meme", tone: "warning" },
  event: { label: "Událost", tone: "info" },
  audio: { label: "Zvuk", tone: "success" },
  format: { label: "Formát", tone: "brand" },
  challenge: { label: "Challenge", tone: "danger" },
};

const LIFE: Record<TrendLifecycle, { label: string; icon: ReactNode; cls: string }> = {
  rising: { label: "Roste", icon: <ArrowUpRight />, cls: "text-success" },
  peak: { label: "Vrchol", icon: <Flame />, cls: "text-brand" },
  fading: { label: "Opadá", icon: <ArrowDownRight />, cls: "text-subtle" },
  evergreen: { label: "Evergreen", icon: <InfinityIcon />, cls: "text-info" },
};

type Sort = "heat" | "fit" | "urgency" | "new";

export default function TrendsPage() {
  const { trends, brand, upsertTrends, deleteTrend, ready } = useData();
  const { engine, label } = useEngine();
  const navigate = useNavigate();
  const [focus, setFocus] = useState("");
  const [scouting, setScouting] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [kind, setKind] = useState<TrendKind | "all">("all");
  const [sort, setSort] = useState<Sort>("heat");
  const [savedOnly, setSavedOnly] = useState(false);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  const moments = useMemo(() => upcomingMoments().slice(0, 8), []);

  const scout = async () => {
    setScouting(true);
    try {
      const res = await scoutTrends(brand, focus.trim());
      // Same trend found again → refresh the existing card instead of duplicating it.
      const byName = new Map(trends.map((t) => [t.name.trim().toLowerCase(), t]));
      const merged = res.trends.map((t) => {
        const old = byName.get(t.name.trim().toLowerCase());
        return old ? { ...t, id: old.id, saved: old.saved, ideas: [...old.ideas, ...t.ideas.filter((i) => !old.ideas.some((o) => o.title === i.title))] } : t;
      });
      const saved = await upsertTrends(merged);
      setFreshIds(new Set(saved.map((t) => t.id)));
      setSource(res.source);
      setSort("new");
      toast.success(`Nalezeno ${saved.length} trendů`, { description: res.source });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setScouting(false);
    }
  };

  const list = useMemo(() => {
    let l = trends;
    if (kind !== "all") l = l.filter((t) => t.kind === kind);
    if (savedOnly) l = l.filter((t) => t.saved);
    const urgency = (t: Trend) => (t.date ? Math.max(0, differenceInCalendarDays(parseISO(t.date), new Date())) : t.windowDays ?? 999);
    return [...l].sort((a, b) =>
      sort === "fit"
        ? b.brandFit - a.brandFit
        : sort === "urgency"
          ? urgency(a) - urgency(b)
          : sort === "new"
            ? Number(freshIds.has(b.id)) - Number(freshIds.has(a.id)) || b.createdAt.localeCompare(a.createdAt)
            : b.heat * 0.6 + b.brandFit * 0.4 - (a.heat * 0.6 + a.brandFit * 0.4),
    );
  }, [trends, kind, savedOnly, sort, freshIds]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Trend Radar"
        title="Co právě"
        accent="frčí"
        description="Popkulturní momenty, meme formáty a události, na které se dá navázat. Každý trend má hotovou strukturu a nápady pro Project Two — jedním klikem z nich uděláte post nebo video."
        actions={<Badge tone={engine === "local" ? "warning" : "success"}>AI: {label}</Badge>}
      />

      {/* Scout */}
      <div className="card p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void scout();
          }}
          className="flex flex-col gap-3 md:flex-row"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <input
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="Volitelně zaměření — hry, sport, AI, Vánoce, nostalgie…"
              className="h-11 w-full rounded-xl border border-border bg-elevated/60 pl-10 pr-3 text-sm outline-none transition focus:border-brand/60 focus:ring-4 focus:ring-brand/10"
            />
          </div>
          <Button type="submit" size="lg" loading={scouting} className="md:w-56">
            <Sparkles /> Najít aktuální trendy
          </Button>
        </form>
        <p className="mt-2 text-xs text-subtle">
          {engine === "edge"
            ? "Claude prohledá web (zprávy, TikTok, Instagram) a vrátí trendy s nápady pro značku."
            : engine === "claude"
              ? "Claude navrhne trendy ze svých znalostí a kalendáře. Živé hledání na webu běží v ostrém režimu (Supabase)."
              : "Bez AI se zobrazí knihovna ověřených formátů."}
          {source && <span className="ml-1 text-muted">Poslední zdroj: {source}.</span>}
        </p>
      </div>

      {/* Calendar of moments */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="size-4 text-brand" /> Kalendář příležitostí
        </h2>
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          {moments.map((m) => {
            const days = differenceInCalendarDays(parseISO(m.date), new Date());
            const hot = days <= 14;
            return (
              <button
                key={m.name + m.date}
                onClick={() => {
                  const linked = trends.find((t) => t.name.startsWith(m.name.split(" ")[0]) || (m.trendId && t.id === m.trendId));
                  navigate(linked ? `/studio?trend=${linked.id}` : `/studio?format=reel`, { state: null });
                  if (!linked) toast.info(`Téma: ${m.name}`, { description: m.note });
                }}
                className={cn("card w-44 shrink-0 p-3 text-left transition-colors hover:border-brand/40", hot && "border-brand/40 bg-brand/[0.06]")}
              >
                <div className={cn("text-2xl font-bold tabular-nums", hot ? "text-brand" : "text-fg")}>{days === 0 ? "Dnes" : `${days} d`}</div>
                <div className="mt-1 truncate text-sm font-semibold">{m.name}</div>
                <div className="text-[11px] text-subtle">{format(parseISO(m.date), "EEEE d. MMMM", { locale: cs })}</div>
                <div className="mt-1 line-clamp-2 text-[11px] text-muted">{m.note}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setKind("all")} className={chip(kind === "all")}>
          Vše <span className="text-subtle">{trends.length}</span>
        </button>
        {(Object.keys(KIND) as TrendKind[]).map((k) => {
          const n = trends.filter((t) => t.kind === k).length;
          if (!n) return null;
          return (
            <button key={k} onClick={() => setKind(k)} className={chip(kind === k)}>
              {KIND[k].label} <span className="text-subtle">{n}</span>
            </button>
          );
        })}
        <button onClick={() => setSavedOnly((s) => !s)} className={chip(savedOnly)}>
          <Star className="size-3.5" /> Uložené
        </button>
        <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="ml-auto h-8 w-44 text-xs">
          <option value="heat">Nejžhavější pro nás</option>
          <option value="fit">Nejvíc sedí značce</option>
          <option value="urgency">Nejdřív končí</option>
          <option value="new">Nejnovější</option>
        </Select>
      </div>

      {!ready || scouting ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : list.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <AnimatePresence>
            {list.map((t, i) => (
              <TrendCard
                key={t.id}
                trend={t}
                index={i}
                fresh={freshIds.has(t.id)}
                onToggleSave={async () => {
                  await upsertTrends([{ ...t, saved: !t.saved }]);
                  toast.success(t.saved ? "Odebráno z uložených" : "Trend uložen");
                }}
                onDelete={async () => {
                  await deleteTrend(t.id);
                  toast.success("Trend odebrán");
                }}
                onMoreIdeas={async () => {
                  const ideas = await trendIdeas(t, brand);
                  const seen = new Set(t.ideas.map((x) => x.title));
                  await upsertTrends([{ ...t, ideas: [...t.ideas, ...ideas.filter((x) => !seen.has(x.title))] }]);
                  toast.success(`${ideas.length} nových nápadů`);
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState icon={<Flame />} title="Žádné trendy" text="Zkuste jiný filtr nebo spusťte hledání aktuálních trendů." />
      )}
    </div>
  );
}

function chip(active: boolean) {
  return cn(
    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
    active ? "border-brand/50 bg-brand/10 text-fg" : "border-border text-muted hover:text-fg",
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1">
      <div className="mb-1 flex justify-between text-[11px] text-subtle">
        <span>{label}</span>
        <span className="tabular-nums text-fg">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-brand to-amber-400" initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.7 }} />
      </div>
    </div>
  );
}

function TrendCard({ trend: t, index, fresh, onToggleSave, onDelete, onMoreIdeas }: { trend: Trend; index: number; fresh: boolean; onToggleSave: () => void; onDelete: () => void; onMoreIdeas: () => Promise<void> }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const life = LIFE[t.lifecycle];
  const daysLeft = t.date ? differenceInCalendarDays(parseISO(t.date), new Date()) : null;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className={cn("card flex flex-col p-5", fresh && "border-brand/40")}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={KIND[t.kind].tone}>{KIND[t.kind].label}</Badge>
            <span className={cn("flex items-center gap-0.5 text-xs font-medium [&_svg]:size-3.5", life.cls)}>
              {life.icon}
              {life.label}
            </span>
            {fresh && <Badge tone="brand">Nové</Badge>}
            {t.source !== "seed" && <Badge>{t.source === "web" ? "Z webu" : "AI"}</Badge>}
          </div>
          <h3 className="text-lg font-bold leading-tight tracking-tight">{t.name}</h3>
        </div>
        <div className="flex">
          <Button variant="ghost" size="icon-sm" onClick={onToggleSave} aria-label="Uložit trend" className={t.saved ? "text-brand" : ""}>
            <Star className={t.saved ? "fill-current" : ""} />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label="Odebrat trend">
            <Trash2 />
          </Button>
        </div>
      </div>

      <p className="mt-2 text-sm text-muted">{t.description}</p>

      <div className="mt-3 flex gap-4">
        <Meter label="Žhavost" value={t.heat} />
        <Meter label="Sedí značce" value={t.brandFit} />
      </div>

      <div className="mt-3 rounded-xl bg-elevated/50 p-3 text-sm">
        <div className="mb-1 flex items-center justify-between">
          <span className="label">Proč teď</span>
          {daysLeft !== null ? (
            <span className={cn("text-xs font-semibold", daysLeft <= 7 ? "text-brand" : "text-muted")}>{daysLeft <= 0 ? "Právě teď" : `za ${daysLeft} dní`}</span>
          ) : t.windowDays ? (
            <span className="flex items-center gap-1 text-xs text-muted">
              <Minus className="size-3" /> okno ~{t.windowDays} dní
            </span>
          ) : null}
        </div>
        {t.whyNow}
      </div>

      {t.structure.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-xs font-semibold text-muted hover:text-fg">Struktura formátu ({t.structure.length} kroků)</summary>
          <ol className="mt-2 space-y-1">
            {t.structure.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-mono text-xs text-brand">{i + 1}.</span>
                <span className="text-muted">{s}</span>
              </li>
            ))}
          </ol>
          {t.examples.length > 0 && <p className="mt-2 text-xs text-subtle">Příklady: {t.examples.join(" · ")}</p>}
        </details>
      )}

      <div className="mt-4 space-y-2">
        <div className="label flex items-center gap-1.5">
          <Lightbulb className="size-3.5 text-warning" /> Nápady pro Project Two
        </div>
        {t.ideas.map((idea) => (
          <div key={idea.title} className="group rounded-xl border border-border p-3 transition-colors hover:border-brand/40">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{idea.title}</p>
                <p className="mt-0.5 text-xs text-brand">„{idea.hook}“</p>
                <p className="mt-1 text-xs text-muted">{idea.angle}</p>
              </div>
              <Badge>{FORMAT_LABEL[idea.format]}</Badge>
            </div>
            <div className="mt-2 flex gap-1.5">
              <Button size="sm" onClick={() => navigate(`/studio?trend=${t.id}&format=${idea.format}&idea=${encodeURIComponent(`${idea.title} — ${idea.angle}`)}`)}>
                <Wand2 /> Vytvořit
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("/video", { state: { trendId: t.id, topic: `${idea.title}. Hook: ${idea.hook}. ${idea.angle}` } })}>
                <Clapperboard /> Video
              </Button>
            </div>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onMoreIdeas();
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} Další nápady od AI
        </Button>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        {t.platforms.map((p) => (
          <PlatformIcon key={p} platform={p} className="size-3.5" />
        ))}
        <span className="ml-auto truncate text-[11px] text-info">{t.hashtags.slice(0, 4).join(" ")}</span>
      </div>
    </motion.article>
  );
}
