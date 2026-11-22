import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 [&_svg]:size-3", {
  variants: {
    tone: {
      neutral: "border-border bg-elevated text-muted",
      brand: "border-brand/30 bg-brand/10 text-brand",
      success: "border-success/30 bg-success/10 text-success",
      warning: "border-warning/30 bg-warning/10 text-warning",
      danger: "border-danger/30 bg-danger/10 text-danger",
      info: "border-info/30 bg-info/10 text-info",
      purple: "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export function Badge({ className, tone, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

const TAG_TONES: Record<string, BadgeTone> = {
  Edukace: "info",
  Kontroverze: "danger",
  "Příběh": "purple",
  Humor: "warning",
  "Tutoriál": "success",
  "Před/Po": "brand",
  "Mýtus": "danger",
  "Behind the scenes": "neutral",
  "Case study": "brand",
  Trend: "success",
};

export function TagBadge({ tag }: { tag: string }) {
  return <Badge tone={TAG_TONES[tag] ?? "neutral"}>{tag}</Badge>;
}
