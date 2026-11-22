import { CheckCircle2, Download, Send, Webhook } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CopyButton } from "@/components/ui/misc";
import { buildCrmPayload, sendToCrm } from "@/lib/crm";
import { env } from "@/lib/env";
import type { ContentItem } from "@/lib/types";
import { cn, downloadJson, FORMAT_LABEL, STATUS_LABEL } from "@/lib/utils";
import { useData } from "@/store/data";

export function CrmDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { content, brand, markSynced } = useData();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const candidates = useMemo(
    () => [...content].sort((a, b) => Number(Boolean(a.crmSyncedAt)) - Number(Boolean(b.crmSyncedAt)) || b.updatedAt.localeCompare(a.updatedAt)),
    [content],
  );
  const chosen: ContentItem[] = candidates.filter((c) => selected.has(c.id));
  const payload = useMemo(() => buildCrmPayload(chosen, brand), [chosen, brand]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const send = async () => {
    setBusy(true);
    try {
      const r = await sendToCrm(payload);
      if (r.delivered) {
        await markSynced(chosen.map((c) => c.id));
        toast.success(r.message, { description: `${chosen.length} položek` });
        setSelected(new Set());
        onOpenChange(false);
      } else {
        downloadJson(`projectwo-crm-${Date.now()}.json`, payload);
        toast.info(r.message, { description: "Payload byl stažen jako JSON." });
      }
    } catch (e) {
      toast.error(`Odeslání selhalo: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <Webhook className="size-4 text-brand" /> Odeslat do Project Two CRM
        </span>
      }
      description={
        env.authMode === "supabase"
          ? "Odešle se přes Edge Function `crm-sync` (podepsaný webhook, URL nastavená v Nastavení)."
          : env.crmWebhookUrl
            ? `Demo: POST na ${env.crmWebhookUrl}`
            : "Demo bez webhooku: payload se stáhne jako JSON pro ruční import."
      }
      footer={
        <>
          <Button variant="outline" disabled={!chosen.length} onClick={() => downloadJson(`projectwo-crm-${Date.now()}.json`, payload)}>
            <Download /> Stáhnout JSON
          </Button>
          <Button onClick={send} loading={busy} disabled={!chosen.length}>
            <Send /> Odeslat ({chosen.length})
          </Button>
        </>
      }
    >
      <div className="mb-3 flex items-center justify-between text-xs">
        <button className="text-brand hover:underline" onClick={() => setSelected(new Set(candidates.filter((c) => !c.crmSyncedAt).map((c) => c.id)))}>
          Vybrat vše neodeslané
        </button>
        <span className="text-subtle">{selected.size} vybráno</span>
      </div>
      <div className="max-h-64 space-y-1.5 overflow-y-auto">
        {candidates.map((c) => (
          <label key={c.id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 text-sm transition-colors", selected.has(c.id) ? "border-brand/50 bg-brand/[0.06]" : "border-border hover:bg-elevated/50")}>
            <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="size-4 accent-[rgb(var(--brand))]" />
            <span className="flex-1 truncate font-medium">{c.title}</span>
            <span className="text-xs text-subtle">
              {FORMAT_LABEL[c.format]} · {STATUS_LABEL[c.status]}
            </span>
            {c.crmSyncedAt && <CheckCircle2 className="size-4 text-success" />}
          </label>
        ))}
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="label">Náhled payloadu ({payload.schema})</span>
          <CopyButton text={JSON.stringify(payload, null, 2)} label="JSON zkopírován" />
        </div>
        <pre className="max-h-56 overflow-auto rounded-xl border border-border bg-elevated/60 p-3 font-mono text-[11px] leading-relaxed text-muted">
          {JSON.stringify(payload, null, 2)}
        </pre>
      </div>
    </Dialog>
  );
}
