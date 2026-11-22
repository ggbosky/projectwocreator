import { useDroppable } from "@dnd-kit/core";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import type { ContentItem, ContentStatus } from "@/lib/types";
import { cn, STATUS_LABEL, STATUS_ORDER } from "@/lib/utils";
import { DraggableCard } from "./ContentCard";

const DOT: Record<ContentStatus, string> = {
  idea: "bg-subtle",
  generated: "bg-info",
  to_shoot: "bg-warning",
  done: "bg-success",
  published: "bg-brand",
};

function Column({ status, items, onOpen, onAdd }: { status: ContentStatus; items: ContentItem[]; onOpen: (i: ContentItem) => void; onAdd: (s: ContentStatus) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}`, data: { type: "column", status } });
  return (
    <div className="flex w-[280px] shrink-0 flex-col md:w-auto md:min-w-0 md:flex-1">
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className={cn("size-2 rounded-full", DOT[status])} />
        <h3 className="text-sm font-semibold">{STATUS_LABEL[status]}</h3>
        <span className="rounded-md bg-elevated px-1.5 text-[11px] tabular-nums text-subtle">{items.length}</span>
        <button onClick={() => onAdd(status)} className="ml-auto rounded-md p-1 text-subtle hover:bg-elevated hover:text-fg" aria-label="Přidat">
          <Plus className="size-3.5" />
        </button>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[420px] flex-1 flex-col gap-2.5 rounded-2xl border border-dashed p-2.5 transition-colors",
          isOver ? "border-brand/60 bg-brand/[0.05]" : "border-border/70 bg-elevated/25",
        )}
      >
        <AnimatePresence initial={false}>
          {items.map((i) => (
            <motion.div key={i.id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <DraggableCard item={i} onOpen={onOpen} />
            </motion.div>
          ))}
        </AnimatePresence>
        {items.length === 0 && <div className="grid flex-1 place-items-center text-xs text-subtle">Přetáhněte sem</div>}
      </div>
    </div>
  );
}

export function Kanban({ content, onOpen, onAdd }: { content: ContentItem[]; onOpen: (i: ContentItem) => void; onAdd: (s: ContentStatus) => void }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
      {STATUS_ORDER.map((s) => (
        <Column
          key={s}
          status={s}
          onOpen={onOpen}
          onAdd={onAdd}
          items={content.filter((c) => c.status === s).sort((a, b) => a.position - b.position)}
        />
      ))}
    </div>
  );
}
