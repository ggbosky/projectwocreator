import { Sparkles, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { OutputView } from "@/components/studio/OutputView";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import type { ContentItem, ContentStatus } from "@/lib/types";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/utils";
import { useData } from "@/store/data";

export function ContentDetailDialog({ item, onClose }: { item: ContentItem | null; onClose: () => void }) {
  const { updateContent, deleteContent, moveContent } = useData();
  const live = useData((s) => s.content.find((c) => c.id === item?.id));
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (live) {
      setTitle(live.title);
      setNotes(live.notes);
      setDate(live.scheduledFor ?? "");
      setConfirmDelete(false);
    }
  }, [live?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!live) return null;

  const save = async () => {
    try {
      await updateContent(live.id, { title: title.trim() || live.title, notes, scheduledFor: date || undefined });
      toast.success("Změny uloženy");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Dialog
      open={Boolean(item)}
      onOpenChange={(o) => !o && onClose()}
      size="lg"
      title="Detail obsahu"
      description={live.topic}
      footer={
        <>
          {confirmDelete ? (
            <Button
              variant="danger"
              className="mr-auto"
              onClick={async () => {
                try {
                  await deleteContent(live.id);
                  toast.success("Obsah smazán");
                  onClose();
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              <Trash2 /> Opravdu smazat?
            </Button>
          ) : (
            <Button variant="ghost" className="mr-auto text-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Smazat
            </Button>
          )}
          {!live.output && (
            <Button variant="outline" onClick={() => navigate(`/studio?format=${live.format}${live.referencePostId ? `&ref=${live.referencePostId}` : ""}`)}>
              <Sparkles /> Vygenerovat ve Studiu
            </Button>
          )}
          <Button onClick={save}>Uložit</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_180px_170px]">
        <Field label="Název">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Stav">
          <Select
            value={live.status}
            onChange={async (e) => {
              await moveContent(live.id, e.target.value as ContentStatus);
              toast.success(`Přesunuto do „${STATUS_LABEL[e.target.value as ContentStatus]}“`);
            }}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Datum publikace">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Poznámky" className="mt-4">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Kdo točí, kde, rekvizity…" />
      </Field>
      {live.output && (
        <div className="mt-6 border-t border-border/70 pt-5">
          <OutputView output={live.output} />
        </div>
      )}
    </Dialog>
  );
}
