import { motion } from "framer-motion";
import { Camera, Clapperboard, Film, Hash, Layers, MessageSquareText, Mic, Type } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/misc";
import { SegmentedTabs } from "@/components/ui/tabs";
import { captionText, hooksText, postText, scriptText, slidesText, visualText } from "@/lib/exportText";
import type { GeneratedContent } from "@/lib/types";
import { cn } from "@/lib/utils";

type View = "hooks" | "script" | "visual" | "slides" | "post" | "caption";

export function OutputView({ output }: { output: GeneratedContent }) {
  const isReel = output.format === "reel";
  const isCarousel = output.format === "carousel";
  const isText = !isReel && !isCarousel;
  const tabs: { value: View; label: ReactNode }[] = [
    { value: "hooks", label: <><Mic /> Hooky</> },
    ...(isReel ? [{ value: "script" as View, label: <><Clapperboard /> Scénář</> }, { value: "visual" as View, label: <><Camera /> Vizuál</> }] : []),
    ...(isCarousel ? [{ value: "slides" as View, label: <><Layers /> Slidy</> }] : []),
    ...(isText ? [{ value: "post" as View, label: <><MessageSquareText /> Text</> }] : []),
    { value: "caption", label: <><Hash /> Popisek</> },
  ];
  const [view, setView] = useState<View>(isText ? "post" : "hooks");
  useEffect(() => setView(isText ? "post" : "hooks"), [output, isText]);

  return (
    <div>
      <div className="no-scrollbar -mx-1 mb-4 overflow-x-auto px-1">
        <SegmentedTabs value={view} onValueChange={(v) => setView(v as View)} items={tabs} layoutId="out-tabs" />
      </div>

      <motion.div key={view} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {view === "hooks" && (
          <Block title="3 varianty hooku" copy={hooksText(output)}>
            <div className="space-y-3">
              {output.hooks.map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className={cn("group rounded-xl border p-4", i === 0 ? "border-brand/40 bg-brand/[0.06]" : "border-border bg-elevated/40")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="grid size-6 place-items-center rounded-lg bg-fg text-xs font-bold text-bg">{i + 1}</span>
                      <Badge tone={i === 0 ? "brand" : "neutral"}>{h.pattern}</Badge>
                    </div>
                    <CopyButton text={`${h.onScreen}\n\n${h.spoken}`} label="Hook zkopírován" />
                  </div>
                  <div className="mt-3 flex gap-2 text-sm">
                    <Type className="mt-0.5 size-4 shrink-0 text-brand" />
                    <p className="font-semibold">{h.onScreen}</p>
                  </div>
                  <div className="mt-2 flex gap-2 text-sm">
                    <Mic className="mt-0.5 size-4 shrink-0 text-subtle" />
                    <p className="text-muted">{h.spoken}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Block>
        )}

        {view === "script" && (
          <Block title="Scénář po vteřinách" copy={scriptText(output)}>
            <ol className="relative space-y-4 border-l border-border pl-6">
              {output.script.map((b, i) => (
                <motion.li key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="relative">
                  <span className="absolute -left-[31px] top-1 grid size-4 place-items-center rounded-full border-2 border-brand bg-bg" />
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-brand/15 px-2 py-0.5 font-mono text-xs font-semibold text-brand">{b.time}</span>
                    <span className="text-sm font-semibold">{b.label}</span>
                    <CopyButton text={b.spoken} className="ml-auto" label="Text zkopírován" />
                  </div>
                  <div className="mt-2 grid gap-2 rounded-xl border border-border bg-elevated/40 p-3 text-sm md:grid-cols-3">
                    <Cell icon={<Mic />} label="Mluvené slovo">{b.spoken}</Cell>
                    <Cell icon={<Type />} label="Text na obrazovce">{b.onScreen}</Cell>
                    <Cell icon={<Film />} label="Záběr">{b.visual}</Cell>
                  </div>
                </motion.li>
              ))}
            </ol>
          </Block>
        )}

        {view === "visual" && (
          <Block title="Vizuální pokyny (kamera · B-roll · střih)" copy={visualText(output)}>
            <div className="grid gap-3 md:grid-cols-3">
              <List title="Kamera" icon={<Camera />} items={output.visualDirection.camera} />
              <List title="B-roll" icon={<Film />} items={output.visualDirection.broll} />
              <List title="Střih" icon={<Clapperboard />} items={output.visualDirection.editing} />
            </div>
            <div className="mt-3 rounded-xl border border-border bg-elevated/40 p-3 text-sm">
              <div className="label mb-1">Styl titulků</div>
              {output.visualDirection.captions}
            </div>
          </Block>
        )}

        {view === "slides" && (
          <Block title={`Karusel · ${output.slides.length} slidů`} copy={slidesText(output)}>
            <div className="no-scrollbar -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
              {output.slides.map((s, i) => (
                <motion.div
                  key={s.index}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "flex aspect-[4/5] w-56 shrink-0 snap-start flex-col rounded-2xl border p-4",
                    i === 0 ? "border-brand/50 bg-gradient-to-br from-brand/25 via-surface to-surface" : "border-border bg-elevated/50",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-subtle">{s.index}/{output.slides.length}</span>
                    <CopyButton text={`${s.headline}\n${s.body}`} label={`Slide ${s.index} zkopírován`} />
                  </div>
                  <h4 className={cn("mt-2 font-bold leading-tight", i === 0 ? "text-xl" : "text-base")}>{s.headline}</h4>
                  <p className="mt-2 whitespace-pre-line text-xs text-muted">{s.body}</p>
                  <p className="mt-auto border-t border-border/70 pt-2 text-[10px] text-subtle">🎨 {s.visual}</p>
                </motion.div>
              ))}
            </div>
          </Block>
        )}

        {view === "post" && (
          <Block title={output.format === "x_thread" ? "X vlákno" : "Text postu"} copy={postText(output)}>
            <div className="rounded-xl border border-border bg-elevated/40 p-4">
              <p className="mb-3 text-[15px] font-semibold">{output.post.firstLine}</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{output.post.body.replace(output.post.firstLine, "").trim()}</p>
            </div>
            <div className="mt-3 text-xs text-subtle">
              Znaků: {output.post.body.length}
              {output.platform === "linkedin" && output.post.body.length > 3000 && <span className="text-danger"> · LinkedIn limit je 3 000</span>}
            </div>
          </Block>
        )}

        {view === "caption" && (
          <Block title="Popisek + hashtagy" copy={captionText(output)}>
            <div className="whitespace-pre-line rounded-xl border border-border bg-elevated/40 p-4 text-sm leading-relaxed">{output.caption}</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {output.hashtags.map((h) => (
                <span key={h} className="rounded-full bg-info/10 px-2 py-0.5 text-xs text-info">
                  {h}
                </span>
              ))}
            </div>
          </Block>
        )}
      </motion.div>
    </div>
  );
}

function Block({ title, copy, children }: { title: string; copy: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <CopyButton text={copy} className="border border-border">
          Kopírovat vše
        </CopyButton>
      </div>
      {children}
    </section>
  );
}

function Cell({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-subtle [&_svg]:size-3">
        {icon}
        {label}
      </div>
      <p>{children}</p>
    </div>
  );
}

function List({ title, icon, items }: { title: string; icon: ReactNode; items: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-elevated/40 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-subtle [&_svg]:size-3.5 [&_svg]:text-brand">
        {icon}
        {title}
      </div>
      <ul className="space-y-1.5 text-sm">
        {items.map((x) => (
          <li key={x} className="flex gap-2">
            <span className="text-brand">•</span>
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
