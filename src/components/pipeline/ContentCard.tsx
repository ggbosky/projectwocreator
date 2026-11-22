import { useDraggable, useDroppable } from "@dnd-kit/core";
import { format, parseISO } from "date-fns";
import { cs } from "date-fns/locale";
import { CalendarDays, CloudUpload, GripVertical } from "lucide-react";
import { PlatformIcon } from "@/components/radar/PlatformIcon";
import { Badge } from "@/components/ui/badge";
import type { ContentItem } from "@/lib/types";
import { cn, FORMAT_LABEL } from "@/lib/utils";

export function ContentCardBody({ item, dragging, compact }: { item: ContentItem; dragging?: boolean; compact?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface p-3 text-left shadow-sm transition-all",
        dragging ? "rotate-2 scale-[1.03] border-brand/60 shadow-2xl shadow-brand/20" : "hover:border-fg/20",
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-subtle">
        <PlatformIcon platform={item.platform} className="size-3" />
        {FORMAT_LABEL[item.format]}
        {item.crmSyncedAt && (
          <span title="Odesláno do CRM" className="ml-auto text-success">
            <CloudUpload className="size-3.5" />
          </span>
        )}
        <GripVertical className={cn("size-3.5 opacity-40", !item.crmSyncedAt && "ml-auto")} />
      </div>
      <p className={cn("mt-1.5 font-medium leading-snug", compact ? "line-clamp-1 text-xs" : "line-clamp-2 text-sm")}>{item.title}</p>
      {!compact && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {item.output ? <Badge tone="success">AI výstup</Badge> : <Badge>Nápad</Badge>}
          {item.scheduledFor && (
            <Badge tone="info">
              <CalendarDays /> {format(parseISO(item.scheduledFor), "d. MMM", { locale: cs })}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

/** Kanban card: draggable + a drop target so cards can be inserted before it. */
export function DraggableCard({ item, onOpen, compact }: { item: ContentItem; onOpen: (i: ContentItem) => void; compact?: boolean }) {
  const drag = useDraggable({ id: item.id, data: { type: "item" } });
  const drop = useDroppable({ id: `card:${item.id}`, data: { type: "card", status: item.status } });
  return (
    <div ref={drop.setNodeRef} className="relative">
      {drop.isOver && !drag.isDragging && <div className="absolute -top-1.5 left-0 right-0 h-0.5 rounded-full bg-brand" />}
      <div
        ref={drag.setNodeRef}
        {...drag.listeners}
        {...drag.attributes}
        onClick={() => onOpen(item)}
        className={cn("cursor-grab touch-none active:cursor-grabbing", drag.isDragging && "opacity-30")}
      >
        <ContentCardBody item={item} compact={compact} />
      </div>
    </div>
  );
}
