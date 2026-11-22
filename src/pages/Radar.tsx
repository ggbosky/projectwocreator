import { AnimatePresence } from "framer-motion";
import { Bookmark, Flame, Link2, Radar as RadarIcon, Search, SlidersHorizontal, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AnalysisDialog } from "@/components/radar/AnalysisDialog";
import { AnalyzeLinkDialog } from "@/components/radar/AnalyzeLinkDialog";
import { CreatorCard } from "@/components/radar/CreatorCard";
import { PlatformIcon } from "@/components/radar/PlatformIcon";
import { PostCard } from "@/components/radar/PostCard";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { CardSkeleton } from "@/components/ui/skeleton";
import { SegmentedTabs } from "@/components/ui/tabs";
import { searchRadar } from "@/lib/ai/service";
import type { Platform, ViralPost } from "@/lib/types";
import { cn, PLATFORM_LABEL } from "@/lib/utils";
import { useData } from "@/store/data";

type Tab = "trends" | "creators" | "swipe";
type Sort = "score" | "views" | "newest" | "er";

const PLATFORMS: Platform[] = ["instagram", "tiktok", "youtube", "linkedin", "x"];

export default function RadarPage() {
  const { brand, creators, posts, ready, upsertPosts, upsertCreators } = useData();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "trends");
  const [query, setQuery] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [language, setLanguage] = useState<"cs" | "en" | "any">("any");
  const [minViews, setMinViews] = useState(0);
  const [sort, setSort] = useState<Sort>("score");
  const [creatorFilter, setCreatorFilter] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [resultIds, setResultIds] = useState<{ posts: string[]; creators: string[] } | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [analyzeOpen, setAnalyzeOpen] = useState(params.get("analyze") === "1");
  const [analysisPost, setAnalysisPost] = useState<ViralPost | null>(null);

  useEffect(() => {
    if (params.get("analyze") === "1") {
      setAnalyzeOpen(true);
      params.delete("analyze");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const creatorById = useMemo(() => new Map(creators.map((c) => [c.id, c])), [creators]);

  const runSearch = async (kw: string[]) => {
    setSearching(true);
    try {
      const res = await searchRadar({ keywords: kw, platforms, language, minViews }, { creators, posts });
      // Persist newly discovered items (live mode) so they stay in the radar.
      const newPosts = res.posts.filter((p) => !posts.some((x) => x.id === p.id));
      const newCreators = res.creators.filter((c) => !creators.some((x) => x.id === c.id));
      if (newCreators.length) await upsertCreators(newCreators);
      if (newPosts.length) await upsertPosts(newPosts);
      setResultIds({ posts: res.posts.map((p) => p.id), creators: res.creators.map((c) => c.id) });
      setSource(res.source);
      toast.success(`Nalezeno ${res.posts.length} příspěvků a ${res.creators.length} tvůrců`, { description: res.source });
    } catch (e) {
      toast.error(`Hledání selhalo: ${(e as Error).message}`);
    } finally {
      setSearching(false);
    }
  };

  const addKeyword = (k: string) => {
    const v = k.trim();
    if (!v || keywords.includes(v)) return;
    const next = [...keywords, v];
    setKeywords(next);
    setQuery("");
    void runSearch(next);
  };

  const removeKeyword = (k: string) => {
    const next = keywords.filter((x) => x !== k);
    setKeywords(next);
    if (next.length) void runSearch(next);
    else {
      setResultIds(null);
      setSource(null);
    }
  };

  const visiblePosts = useMemo(() => {
    let list = posts;
    if (tab === "swipe") list = list.filter((p) => p.savedToSwipe);
    if (resultIds && tab === "trends") {
      const order = new Map(resultIds.posts.map((id, i) => [id, i]));
      list = list.filter((p) => order.has(p.id));
    }
    if (creatorFilter) list = list.filter((p) => p.creatorId === creatorFilter);
    if (platforms.length) list = list.filter((p) => platforms.includes(p.platform));
    if (minViews) list = list.filter((p) => p.views >= minViews);
    if (language !== "any") list = list.filter((p) => !p.creatorId || creatorById.get(p.creatorId)?.language === language || (language === "cs" && creatorById.get(p.creatorId)?.language === "sk"));
    const er = (p: ViralPost) => (p.views ? (p.likes + p.comments + p.shares + p.saves) / p.views : 0);
    return [...list].sort((a, b) =>
      sort === "views" ? b.views - a.views : sort === "newest" ? +new Date(b.postedAt) - +new Date(a.postedAt) : sort === "er" ? er(b) - er(a) : b.viralScore - a.viralScore,
    );
  }, [posts, tab, resultIds, creatorFilter, platforms, minViews, language, sort, creatorById]);

  const visibleCreators = useMemo(() => {
    let list = creators;
    if (resultIds) {
      const set = new Set(resultIds.creators);
      list = list.filter((c) => set.has(c.id));
    }
    if (platforms.length) list = list.filter((c) => platforms.includes(c.platform));
    if (language !== "any") list = list.filter((c) => c.language === language || (language === "cs" && c.language === "sk"));
    return [...list].sort((a, b) => b.avgViews - a.avgViews);
  }, [creators, resultIds, platforms, language]);

  const swipeCount = posts.filter((p) => p.savedToSwipe).length;
  const suggestions = brand.keywords.filter((k) => !keywords.includes(k)).slice(0, 8);

  return (
    <div>
      <PageHeader
        eyebrow="Viral Radar"
        title="Co teď"
        accent="letí"
        description="Najděte virální tvůrce a příspěvky ve svém oboru, rozeberte, proč fungují, a jedním klikem z nich udělejte obsah pro Project Two."
        actions={
          <Button onClick={() => setAnalyzeOpen(true)}>
            <Link2 /> Analyzovat odkaz
          </Button>
        }
      />

      {/* Search */}
      <div className="card mb-5 p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) addKeyword(query);
            else if (keywords.length) void runSearch(keywords);
          }}
          className="flex flex-col gap-3 md:flex-row"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Klíčové slovo oboru — např. web design, osobní značka, AI, podnikání…"
              className="h-11 w-full rounded-xl border border-border bg-elevated/60 pl-10 pr-3 text-sm outline-none transition focus:border-brand/60 focus:ring-4 focus:ring-brand/10"
            />
          </div>
          <Button type="submit" size="lg" loading={searching} className="md:w-40">
            <RadarIcon /> Skenovat
          </Button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {keywords.map((k) => (
            <button key={k} onClick={() => removeKeyword(k)} className="flex items-center gap-1 rounded-full bg-brand/15 px-2.5 py-1 text-xs font-medium text-brand">
              {k} <X className="size-3" />
            </button>
          ))}
          {suggestions.map((k) => (
            <button key={k} onClick={() => addKeyword(k)} className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-brand/50 hover:text-brand">
              + {k}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
          <SlidersHorizontal className="size-4 text-subtle" />
          {PLATFORMS.map((p) => {
            const on = platforms.includes(p);
            return (
              <button
                key={p}
                onClick={() => setPlatforms(on ? platforms.filter((x) => x !== p) : [...platforms, p])}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  on ? "border-brand/50 bg-brand/10 text-fg" : "border-border text-muted hover:text-fg",
                )}
              >
                <PlatformIcon platform={p} className="size-3.5" /> {PLATFORM_LABEL[p]}
              </button>
            );
          })}
          <div className="ml-auto flex flex-wrap gap-2">
            <Select value={language} onChange={(e) => setLanguage(e.target.value as typeof language)} className="h-8 w-36 text-xs">
              <option value="any">Všechny jazyky</option>
              <option value="cs">Česky / slovensky</option>
              <option value="en">Anglicky</option>
            </Select>
            <Select value={minViews} onChange={(e) => setMinViews(Number(e.target.value))} className="h-8 w-40 text-xs">
              <option value={0}>Jakýkoli dosah</option>
              <option value={100000}>100 tis.+ zhlédnutí</option>
              <option value={500000}>500 tis.+ zhlédnutí</option>
              <option value={1000000}>1 M+ zhlédnutí</option>
            </Select>
            <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-8 w-36 text-xs">
              <option value="score">Viral Score</option>
              <option value="views">Zhlédnutí</option>
              <option value="er">Engagement</option>
              <option value="newest">Nejnovější</option>
            </Select>
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs
          value={tab}
          onValueChange={(v) => setTab(v as Tab)}
          layoutId="radar-tabs"
          items={[
            { value: "trends", label: <><Flame /> Trendy</>, count: tab === "trends" ? visiblePosts.length : undefined },
            { value: "creators", label: <><Users /> Tvůrci</>, count: visibleCreators.length },
            { value: "swipe", label: <><Bookmark /> Swipe File</>, count: swipeCount },
          ]}
        />
        <div className="flex items-center gap-2 text-xs text-subtle">
          {creatorFilter && (
            <button onClick={() => setCreatorFilter(null)} className="flex items-center gap-1 rounded-full bg-elevated px-2.5 py-1 text-fg">
              Tvůrce: {creatorById.get(creatorFilter)?.name} <X className="size-3" />
            </button>
          )}
          {source && <span>Zdroj: {source}</span>}
        </div>
      </div>

      {!ready || searching ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : tab === "creators" ? (
        visibleCreators.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence>
              {visibleCreators.map((c, i) => (
                <CreatorCard
                  key={c.id}
                  creator={c}
                  index={i}
                  postCount={posts.filter((p) => p.creatorId === c.id).length}
                  onShowPosts={() => {
                    setCreatorFilter(c.id);
                    setResultIds(null);
                    setTab("trends");
                  }}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <EmptyState icon={<Users />} title="Žádní tvůrci" text="Zkuste jiná klíčová slova nebo zrušte filtry platforem." />
        )
      ) : visiblePosts.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <AnimatePresence>
            {visiblePosts.map((p, i) => (
              <PostCard key={p.id} post={p} index={i} creator={p.creatorId ? creatorById.get(p.creatorId) : undefined} onAnalyze={setAnalysisPost} />
            ))}
          </AnimatePresence>
        </div>
      ) : tab === "swipe" ? (
        <EmptyState
          icon={<Bookmark />}
          title="Swipe File je prázdný"
          text="Ukládejte si posty, které vás inspirují — ikonou záložky na kartě, nebo vložte vlastní odkaz."
          action={<Button onClick={() => setAnalyzeOpen(true)}><Link2 /> Analyzovat odkaz</Button>}
        />
      ) : (
        <EmptyState icon={<RadarIcon />} title="Nic jsme nenašli" text="Zkuste obecnější klíčové slovo nebo snižte minimální počet zhlédnutí." />
      )}

      <AnalyzeLinkDialog open={analyzeOpen} onOpenChange={setAnalyzeOpen} onDone={(p) => setAnalysisPost(p)} />
      <AnalysisDialog post={analysisPost} onClose={() => setAnalysisPost(null)} />
    </div>
  );
}
