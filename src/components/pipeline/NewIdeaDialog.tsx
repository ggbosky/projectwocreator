import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import type { ContentFormat, ContentStatus, Platform } from "@/lib/types";
import { FORMAT_LABEL, PLATFORM_LABEL, STATUS_LABEL } from "@/lib/utils";
import { useData } from "@/store/data";

export function NewIdeaDialog({ status, onClose }: { status: ContentStatus | null; onClose: () => void }) {
  const createContent = useData((s) => s.createContent);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState<ContentFormat>("reel");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status) {
      setTitle("");
      setTopic("");
    }
  }, [status]);

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      await createContent({ title: title.trim(), topic: topic.trim() || title.trim(), format, platform, status: status ?? "idea" });
      toast.success("Nápad přidán");
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={Boolean(status)}
      onOpenChange={(o) => !o && onClose()}
      size="sm"
      title="Nový nápad"
      description={status ? `Sloupec: ${STATUS_LABEL[status]}` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Zrušit
          </Button>
          <Button onClick={submit} loading={busy} disabled={!title.trim()}>
            Přidat
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field label="Název">
          <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Roast webu od sledujícího" />
        </Field>
        <Field label="Téma / poznámka">
          <Textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={2} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Formát">
            <Select value={format} onChange={(e) => setFormat(e.target.value as ContentFormat)}>
              {Object.entries(FORMAT_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Platforma">
            <Select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
              {Object.entries(PLATFORM_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </form>
    </Dialog>
  );
}
