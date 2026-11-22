import * as T from "@radix-ui/react-tabs";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TabsProps {
  value: string;
  onValueChange: (v: string) => void;
  items: { value: string; label: ReactNode; count?: number }[];
  className?: string;
  layoutId?: string;
}

/** Segmented control with an animated pill (Linear-style). */
export function SegmentedTabs({ value, onValueChange, items, className, layoutId = "seg" }: TabsProps) {
  return (
    <T.Root value={value} onValueChange={onValueChange}>
      <T.List className={cn("inline-flex rounded-xl border border-border bg-elevated/60 p-1", className)}>
        {items.map((it) => (
          <T.Trigger
            key={it.value}
            value={it.value}
            className="relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors data-[state=active]:text-fg"
          >
            {value === it.value && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-lg bg-surface shadow-sm ring-1 ring-border"
                transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5 [&_svg]:size-4">{it.label}</span>
            {typeof it.count === "number" && (
              <span className="relative z-10 rounded-md bg-border/70 px-1.5 text-[10px] tabular-nums text-muted">{it.count}</span>
            )}
          </T.Trigger>
        ))}
      </T.List>
    </T.Root>
  );
}
