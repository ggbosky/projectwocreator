import * as Tooltip from "@radix-ui/react-tooltip";
import { motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { cn, copyToClipboard } from "@/lib/utils";

export function Tip({ content, children, side = "top" }: { content: ReactNode; children: ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <Tooltip.Root delayDuration={250}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side={side} sideOffset={6} className="z-[60] rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-fg shadow-lg">
          {content}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function CopyButton({ text, label = "Zkopírováno do schránky", className, children }: { text: string; label?: string; className?: string; children?: ReactNode }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        const ok = await copyToClipboard(text);
        if (ok) {
          setDone(true);
          toast.success(label);
          setTimeout(() => setDone(false), 1600);
        } else toast.error("Kopírování se nepovedlo");
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-subtle transition-colors hover:bg-elevated hover:text-fg [&_svg]:size-3.5",
        className,
      )}
      aria-label="Kopírovat"
    >
      {done ? <Check className="text-success" /> : <Copy />}
      {children}
    </button>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-14 text-center"
    >
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-brand/10 text-brand [&_svg]:size-6">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

export function ViralScore({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const r = size === "lg" ? 26 : size === "md" ? 19 : 14;
  const stroke = size === "lg" ? 5 : 4;
  const c = 2 * Math.PI * r;
  const color = score >= 85 ? "rgb(var(--brand))" : score >= 70 ? "rgb(var(--warning))" : "rgb(var(--subtle))";
  const dim = (r + stroke) * 2;
  return (
    <div className="relative grid place-items-center" style={{ width: dim, height: dim }} title={`Viral Score ${score}/100`}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle cx={dim / 2} cy={dim / 2} r={r} stroke="rgb(var(--border))" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (score / 100) * c }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </svg>
      <span className={cn("absolute font-bold tabular-nums", size === "lg" ? "text-lg" : size === "md" ? "text-sm" : "text-[10px]")}>{score}</span>
    </div>
  );
}

export function PageHeader({ eyebrow, title, accent, description, actions }: { eyebrow?: string; title: string; accent?: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <div className="label mb-2">{eyebrow}</div>}
        <h1 className="text-2xl font-bold tracking-tight md:text-[28px]">
          {title} {accent && <span className="serif-accent">{accent}</span>}
        </h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
