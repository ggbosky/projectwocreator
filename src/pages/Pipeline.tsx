import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { format, parseISO } from "date-fns";
import { cs } from "date-fns/locale";
import { CalendarDays, KanbanSquare, Plus, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ContentCalendar } from "@/components/pipeline/Calendar";
import { ContentCardBody } from "@/components/pipeline/ContentCard";
import { ContentDetailDialog } from "@/components/pipeline/ContentDetailDialog";
import { CrmDialog } from "@/components/pipeline/CrmDialog";
import { Kanban } from "@/components/pipeline/Kanban";
import { NewIdeaDialog } from "@/components/pipeline/NewIdeaDialog";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { Skeleton } from "@/components/ui/skeleton";
import { SegmentedTabs } from "@/components/ui/tabs";
import type { ContentItem, ContentStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/utils";
import { useData } from "@/store/data";

export default function PipelinePage() {
  const { content, ready, moveContent, scheduleContent } = useData();
  const [view, setView] = useState<"kanban" | "calendar">("kanban");
  const [month, setMonth] = useState(new Date());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ContentItem | null>(null);
  const [newIn, setNewIn] = useState<ContentStatus | null>(null);
  const [crmOpen, setCrmOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const active = content.find((c) => c.id === activeId);

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const id = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;
    const item = content.find((c) => c.id === id);
    if (!item) return;
    try {
      if (overId.startsWith("col:")) {
        const status = overId.slice(4) as ContentStatus;
        await moveContent(id, status);
        if (status !== item.status) toast.success(`Přesunuto do „${STATUS_LABEL[status]}“`);
      } else if (overId.startsWith("card:")) {
        const targetId = overId.slice(5);
        if (targetId === id) return;
        const target = content.find((c) => c.id === targetId);
        if (view === "calendar") {
          if (target?.scheduledFor && target.scheduledFor !== item.scheduledFor) {
            await scheduleContent(id, target.scheduledFor);
            toast.success(`Naplánováno na ${format(parseISO(target.scheduledFor), "d. MMMM", { locale: cs })}`);
          }
          return;
        }
        if (target) {
          await moveContent(id, target.status, targetId);
          if (target.status !== item.status) toast.success(`Přesunuto do „${STATUS_LABEL[target.status]}“`);
        }
      } else if (overId.startsWith("day:")) {
        const date = overId.slice(4);
        if (date === item.scheduledFor) return;
        await scheduleContent(id, date);
        toast.success(`Naplánováno na ${format(parseISO(date), "EEEE d. MMMM", { locale: cs })}`);
      } else if (overId === "unscheduled" && item.scheduledFor) {
        await scheduleContent(id, null);
        toast.success("Termín zrušen");
      }
    } catch (err) {
      toast.error(`Uložení selhalo: ${(err as Error).message}`);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Content Pipeline"
        title="Od nápadu"
        accent="k publikaci"
        description="Přetahujte karty mezi fázemi a do kalendáře. Hotový obsah pošlete jedním klikem do Project Two CRM."
        actions={
          <>
            <Button variant="outline" onClick={() => setNewIn("idea")}>
              <Plus /> Nový nápad
            </Button>
            <Button onClick={() => setCrmOpen(true)}>
              <Send /> Odeslat do Project Two CRM
            </Button>
          </>
        }
      />
      <div className="mb-5">
        <SegmentedTabs
          value={view}
          onValueChange={(v) => setView(v as "kanban" | "calendar")}
          layoutId="pipe-tabs"
          items={[
            { value: "kanban", label: <><KanbanSquare /> Kanban</>, count: content.length },
            { value: "calendar", label: <><CalendarDays /> Kalendář</>, count: content.filter((c) => c.scheduledFor).length },
          ]}
        />
      </div>

      {!ready ? (
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[440px] flex-1" />
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
          {view === "kanban" ? (
            <Kanban content={content} onOpen={setDetail} onAdd={setNewIn} />
          ) : (
            <ContentCalendar content={content} month={month} setMonth={setMonth} onOpen={setDetail} />
          )}
          <DragOverlay dropAnimation={{ duration: 180 }}>{active ? <div className="w-64"><ContentCardBody item={active} dragging /></div> : null}</DragOverlay>
        </DndContext>
      )}

      <ContentDetailDialog item={detail} onClose={() => setDetail(null)} />
      <NewIdeaDialog status={newIn} onClose={() => setNewIn(null)} />
      <CrmDialog open={crmOpen} onOpenChange={setCrmOpen} />
    </div>
  );
}
