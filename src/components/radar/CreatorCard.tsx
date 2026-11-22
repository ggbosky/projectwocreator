import { motion } from "framer-motion";
import { ExternalLink, TrendingUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tip } from "@/components/ui/misc";
import type { Creator } from "@/lib/types";
import { cn, formatNumber, formatPercent, initials, PLATFORM_LABEL } from "@/lib/utils";
import { useData } from "@/store/data";
import { PlatformIcon } from "./PlatformIcon";

export function CreatorCard({ creator, postCount, onShowPosts, index = 0 }: { creator: Creator; postCount: number; onShowPosts: () => void; index?: number }) {
  const deleteCreator = useData((s) => s.deleteCreator);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.035, 0.35) }}
      className="card group relative p-4 transition-colors hover:border-brand/30"
    >
      <div className="flex items-start gap-3">
        <div className={cn("grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-sm font-bold text-white", creator.avatarColor)}>
          {initials(creator.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-semibold">{creator.name}</h3>
            <PlatformIcon platform={creator.platform} className="size-3.5" />
          </div>
          <div className="text-xs text-subtle">
            {creator.handle} · {PLATFORM_LABEL[creator.platform]} · {creator.language.toUpperCase()}
          </div>
        </div>
        <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
          {creator.profileUrl && (
            <a href={creator.profileUrl} target="_blank" rel="noreferrer noopener" className="rounded-lg p-1.5 text-subtle hover:bg-elevated hover:text-fg">
              <ExternalLink className="size-3.5" />
            </a>
          )}
          <Tip content="Odebrat tvůrce">
            <button
              onClick={async () => {
                try {
                  await deleteCreator(creator.id);
                  toast.success(`${creator.name} odebrán z radaru`);
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
              className="rounded-lg p-1.5 text-subtle hover:bg-danger/10 hover:text-danger"
              aria-label="Odebrat"
            >
              <Trash2 className="size-3.5" />
            </button>
          </Tip>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-muted">{creator.whyFollow}</p>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-elevated/60 p-2.5 text-center">
        <Metric label="Sledující" value={formatNumber(creator.followers)} />
        <Metric label="Ø zhlédnutí" value={formatNumber(creator.avgViews)} />
        <Metric label="Engagement" value={formatPercent(creator.engagementRate)} />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {creator.niche.slice(0, 3).map((n) => (
            <Badge key={n}>{n}</Badge>
          ))}
        </div>
        <Badge tone={creator.growth30d > 10 ? "success" : "neutral"}>
          <TrendingUp /> +{formatPercent(creator.growth30d, 0)}
        </Badge>
      </div>
      <button onClick={onShowPosts} className="mt-3 w-full rounded-xl border border-border py-1.5 text-xs font-medium text-muted transition-colors hover:border-brand/40 hover:text-brand">
        {postCount > 0 ? `Zobrazit virální posty (${postCount})` : "Zatím žádné uložené posty"}
      </button>
    </motion.div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] text-subtle">{label}</div>
    </div>
  );
}
