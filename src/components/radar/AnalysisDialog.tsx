import { motion } from "framer-motion";
import { Clapperboard, Eye, Lightbulb, Magnet, Megaphone, Microscope, Repeat, Sparkles, Wand2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { TagBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CopyButton, ViralScore } from "@/components/ui/misc";
import { analyzePost } from "@/lib/ai/service";
import type { ViralPost } from "@/lib/types";
import { engagementRate, formatNumber, formatPercent, PLATFORM_LABEL } from "@/lib/utils";
import { useData } from "@/store/data";

export function AnalysisDialog({ post, onClose }: { post: ViralPost | null; onClose: () => void }) {
  const navigate = useNavigate();
  const { brand, upsertPosts } = useData();
  const [busy, setBusy] = useState(false);
  const live = useData((s) => s.posts.find((p) => p.id === post?.id)) ?? post;

  if (!live) return null;
  const a = live.analysis;

  const runAnalysis = async () => {
    setBusy(true);
    try {
      const res = await analyzePost(
        {
          url: live.url,
          platform: live.platform,
          hookText: live.hookText,
          caption: live.caption,
          transcript: live.transcript,
          views: live.views,
          likes: live.likes,
          comments: live.comments,
        },
        brand,
      );
      await upsertPosts([{ ...live, analysis: res.analysis, tags: live.tags.length ? live.tags : res.tags }]);
      toast.success("Analýza hotová");
    } catch (e) {
      toast.error(`Analýza selhala: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={Boolean(post)}
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <Microscope className="size-4 text-brand" /> Proč to fungovalo
        </span>
      }
      description={`${PLATFORM_LABEL[live.platform]} · ${formatNumber(live.views)} zhlédnutí · ER ${formatPercent(engagementRate(live))}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Zavřít
          </Button>
          <Button
            onClick={() => {
              onClose();
              navigate(`/studio?ref=${encodeURIComponent(live.id)}`);
            }}
          >
            <Sparkles /> Vytvořit verzi pro {brand.name}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4 rounded-2xl border border-border bg-elevated/50 p-4">
        <ViralScore score={live.viralScore} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{live.title}</h3>
          <p className="mt-1 text-sm text-muted">„{live.hookText}“</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {live.tags.map((t) => (
              <TagBadge key={t} tag={t} />
            ))}
          </div>
        </div>
      </div>

      {!a ? (
        <div className="mt-6 flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-muted">Tento příspěvek ještě nemá rozbor.</p>
          <Button onClick={runAnalysis} loading={busy}>
            <Wand2 /> Spustit AI analýzu
          </Button>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Section icon={<Magnet />} title="Hook (první 3 s)" delay={0}>
            <p className="text-xs font-medium uppercase tracking-wide text-brand">{a.hook.pattern}</p>
            <p className="mt-1.5 font-medium">„{a.hook.text}“</p>
            <p className="mt-1.5 text-muted">{a.hook.why}</p>
          </Section>
          <Section icon={<Repeat />} title="Retence — proč dokoukali" delay={0.05}>
            <ul className="space-y-1">
              {a.retention.mechanisms.map((m) => (
                <li key={m} className="flex gap-2">
                  <span className="text-brand">→</span>
                  {m}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-muted">{a.retention.why}</p>
          </Section>
          <Section icon={<Clapperboard />} title="Storytelling" delay={0.1}>
            <p className="font-medium">{a.storytelling.structure}</p>
            <ol className="mt-2 flex flex-wrap gap-1.5">
              {a.storytelling.beats.map((b, i) => (
                <li key={b} className="rounded-lg bg-elevated px-2 py-1 text-xs">
                  <span className="text-subtle">{i + 1}.</span> {b}
                </li>
              ))}
            </ol>
          </Section>
          <Section icon={<Eye />} title="Vizuální styl" delay={0.15}>
            <p className="font-medium">{a.visual.style}</p>
            <ul className="mt-1.5 list-inside list-disc text-muted">
              {a.visual.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </Section>
          <Section icon={<Megaphone />} title="Call to Action" delay={0.2}>
            <p className="text-xs font-medium uppercase tracking-wide text-brand">{a.cta.type}</p>
            <p className="mt-1.5 font-medium">„{a.cta.text}“</p>
            <p className="mt-1.5 text-muted">{a.cta.why}</p>
          </Section>
          <Section icon={<Lightbulb />} title="Co si vzít" delay={0.25}>
            <ul className="space-y-1">
              {a.takeaways.map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-success">✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </Section>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-brand/30 bg-brand/[0.07] p-4 md:col-span-2"
          >
            <div className="flex items-center justify-between">
              <span className="label text-brand">Úhel pro {brand.name}</span>
              <CopyButton text={a.remixAngle} />
            </div>
            <p className="mt-1.5 text-sm font-medium">{a.remixAngle}</p>
          </motion.div>
        </div>
      )}
    </Dialog>
  );
}

function Section({ icon, title, children, delay }: { icon: ReactNode; title: string; children: ReactNode; delay: number }) {
  return (
    <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="rounded-2xl border border-border bg-surface p-4 text-sm">
      <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-subtle [&_svg]:size-4 [&_svg]:text-brand">
        {icon}
        {title}
      </h4>
      {children}
    </motion.section>
  );
}
