import { useDroppable } from "@dnd-kit/core";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { cs } from "date-fns/locale";
import { CalendarX2, ChevronLeft, ChevronRight } from "lucide-react";
import type { ContentItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DraggableCard } from "./ContentCard";

const WEEKDAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

function Day({ date, items, month, onOpen }: { date: Date; items: ContentItem[]; month: Date; onOpen: (i: ContentItem) => void }) {
  const key = format(date, "yyyy-MM-dd");
  const { setNodeRef, isOver } = useDroppable({ id: `day:${key}`, data: { type: "day", date: key } });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[112px] flex-col gap-1.5 border-b border-r border-border/70 p-1.5 transition-colors",
        !isSameMonth(date, month) && "bg-elevated/30 opacity-50",
        isOver && "bg-brand/[0.08]",
      )}
    >
      <span className={cn("grid size-6 place-items-center rounded-full text-xs", isToday(date) ? "bg-brand font-bold text-black" : "text-muted")}>{format(date, "d")}</span>
      {items.map((i) => (
        <DraggableCard key={i.id} item={i} onOpen={onOpen} compact />
      ))}
    </div>
  );
}

function Unscheduled({ items, onOpen }: { items: ContentItem[]; onOpen: (i: ContentItem) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: "unscheduled", data: { type: "unscheduled" } });
  return (
    <div ref={setNodeRef} className={cn("card flex flex-col gap-2 p-3 transition-colors lg:w-72", isOver && "border-brand/50 bg-brand/[0.05]")}>
      <div className="flex items-center gap-2 px-1 pb-1">
        <CalendarX2 className="size-4 text-subtle" />
        <h3 className="text-sm font-semibold">Nenaplánováno</h3>
        <span className="rounded-md bg-elevated px-1.5 text-[11px] text-subtle">{items.length}</span>
      </div>
      <p className="px-1 text-xs text-subtle">Přetáhněte obsah na den v kalendáři. Zpět sem = zrušit termín.</p>
      <div className="flex max-h-[640px] flex-col gap-2 overflow-y-auto">
        {items.map((i) => (
          <DraggableCard key={i.id} item={i} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

export function ContentCalendar({ content, month, setMonth, onOpen }: { content: ContentItem[]; month: Date; setMonth: (d: Date) => void; onOpen: (i: ContentItem) => void }) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const byDay = new Map<string, ContentItem[]>();
  content.forEach((c) => {
    if (!c.scheduledFor) return;
    byDay.set(c.scheduledFor, [...(byDay.get(c.scheduledFor) ?? []), c]);
  });

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <Unscheduled items={content.filter((c) => !c.scheduledFor && c.status !== "published")} onOpen={onOpen} />
      <div className="card flex-1 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <h3 className="text-base font-semibold capitalize">{format(month, "LLLL yyyy", { locale: cs })}</h3>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => setMonth(addMonths(month, -1))} aria-label="Předchozí měsíc">
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setMonth(new Date())}>
              Dnes
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setMonth(addMonths(month, 1))} aria-label="Další měsíc">
              <ChevronRight />
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-7 border-b border-border/70">
              {WEEKDAYS.map((d) => (
                <div key={d} className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-subtle">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 border-l border-border/70">
              {days.map((d) => (
                <Day key={d.toISOString()} date={d} month={month} items={byDay.get(format(d, "yyyy-MM-dd")) ?? []} onOpen={onOpen} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
