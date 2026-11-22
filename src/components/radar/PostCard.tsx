import { motion } from "framer-motion";
import { Bookmark, BookmarkCheck, Eye, Heart, MessageCircle, Microscope, Play, Repeat2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { TagBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tip, ViralScore } from "@/components/ui/misc";
import type { Creator, ViralPost } from "@/lib/types";
import { cn, engagementRate, formatNumber, formatPercent, FORMAT_LABEL } from "@/lib/utils";
import { useData } from "@/store/data";
import { PlatformIcon } from "./PlatformIcon";

export function PostCard({ post, creator, onAnalyze, index = 0 }: { post: ViralPost; creator?: Creator; onAnalyze: (p: ViralPost) => void; index?: number }) {
  const navigate = useNavigate();
  const toggleSwipe = useData((s) => s.toggleSwipe);
  const er = engagementRate(post);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      className="card group flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:border-brand/30"
    >
      <div className={cn("relative h-40 bg-gradient-to-br p-4", post.thumbnailGradient)}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.18),transparent_55%)]" />
        <div className="relative flex items-start justify-between">
          <span className="flex items-center gap-1.5 rounded-full bg-black/45 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
            <PlatformIcon platform={post.platform} className="size-3 text-white" />
            {FORMAT_LABEL[post.format]}
            {post.durationSec ? ` · ${post.durationSec}s` : ""}
          </span>
          <div className="rounded-full bg-black/50 p-0.5 text-white backdrop-blur">
            <ViralScore score={post.viralScore} size="sm" />
          </div>
        </div>
        <p className="relative mt-4 line-clamp-3 text-[15px] font-semibold leading-snug text-white drop-shadow">„{post.hookText}“</p>
        {post.format === "reel" && (
          <Play className="absolute bottom-3 right-3 size-8 rounded-full bg-white/15 p-2 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100" />
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {creator && (
          <div className="mb-2 flex items-center gap-2 text-xs text-muted">
            <span className={cn("size-5 rounded-full bg-gradient-to-br", creator.avatarColor)} />
            <span className="font-medium text-fg">{creator.name}</span>
            <span>{creator.handle}</span>
          </div>
        )}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{post.title}</h3>

        <div className="mt-3 grid grid-cols-4 gap-1 text-[11px] text-muted">
          <Stat icon={<Eye />} v={formatNumber(post.views)} label="Zhlédnutí" />
          <Stat icon={<Heart />} v={formatNumber(post.likes)} label="Lajky" />
          <Stat icon={<MessageCircle />} v={formatNumber(post.comments)} label="Komentáře" />
          <Stat icon={<Repeat2 />} v={formatNumber(post.shares)} label="Sdílení" />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-elevated">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-brand to-rose-500" initial={{ width: 0 }} animate={{ width: `${Math.min(er * 5, 100)}%` }} transition={{ duration: 0.8 }} />
          </div>
          <span className="text-[11px] font-medium tabular-nums text-muted">ER {formatPercent(er)}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {post.tags.map((t) => (
            <TagBadge key={t} tag={t} />
          ))}
        </div>

        <div className="mt-auto flex items-center gap-1.5 pt-4">
          <Button size="sm" className="flex-1" onClick={() => navigate(`/studio?ref=${encodeURIComponent(post.id)}`)}>
            <Sparkles /> Verze pro Project Two
          </Button>
          <Tip content="Rozbor úspěchu">
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => onAnalyze(post)} aria-label="Analýza">
              <Microscope />
            </Button>
          </Tip>
          <Tip content={post.savedToSwipe ? "Odebrat ze Swipe File" : "Uložit do Swipe File"}>
            <Button
              size="icon"
              variant="outline"
              className={cn("h-8 w-8", post.savedToSwipe && "border-brand/40 text-brand")}
              onClick={async () => {
                try {
                  const saved = await toggleSwipe(post.id);
                  toast.success(saved ? "Uloženo do Swipe File" : "Odebráno ze Swipe File");
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
              aria-label="Swipe file"
            >
              {post.savedToSwipe ? <BookmarkCheck /> : <Bookmark />}
            </Button>
          </Tip>
        </div>
      </div>
    </motion.article>
  );
}

function Stat({ icon, v, label }: { icon: React.ReactNode; v: string; label: string }) {
  return (
    <div className="flex items-center gap-1 [&_svg]:size-3" title={label}>
      {icon}
      <span className="tabular-nums">{v}</span>
    </div>
  );
}
