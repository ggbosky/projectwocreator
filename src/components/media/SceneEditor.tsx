import { ImagePlus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SCENE_META } from "@/lib/graphics/scenes";
import type { SceneParams } from "@/lib/types";
import { MediaPicker } from "./MediaPicker";

/** Form for the parameters of one graphic/scene template. */
export function SceneEditor({ value, onChange, compact }: { value: SceneParams; onChange: (v: SceneParams) => void; compact?: boolean }) {
  const meta = SCENE_META[value.type];
  const [picking, setPicking] = useState<"media" | "media2" | null>(null);
  const set = <K extends keyof SceneParams>(k: K, v: SceneParams[K]) => onChange({ ...value, [k]: v });
  const needs = (n: (typeof meta.needs)[number]) => meta.needs.includes(n);

  const mediaSlot = (key: "media" | "media2", label: string) => (
    <div className="flex items-center gap-2">
      <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-border bg-elevated">
        {value[key] ? <img src={value[key]} alt="" className="h-full w-full object-cover" crossOrigin="anonymous" /> : null}
      </div>
      <Button size="sm" variant="outline" onClick={() => setPicking(key)}>
        <ImagePlus /> {label}
      </Button>
      {value[key] && (
        <Button size="icon-sm" variant="ghost" onClick={() => set(key, undefined)} aria-label="Odebrat obrázek">
          <X />
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className={compact ? "grid gap-2 md:grid-cols-2" : "space-y-3"}>
        <Field label={value.type === "meme" ? "Horní text" : value.type === "quote" ? "Citát" : "Nadpis"}>
          {value.type === "quote" ? <Textarea value={value.headline} onChange={(e) => set("headline", e.target.value)} rows={3} /> : <Input value={value.headline} onChange={(e) => set("headline", e.target.value)} />}
        </Field>
        <Field label={value.type === "meme" ? "Dolní text" : "Podtitulek"}>
          <Input value={value.subline} onChange={(e) => set("subline", e.target.value)} />
        </Field>
      </div>
      {needs("items") && (
        <Field label="Položky (každá na nový řádek)">
          <Textarea value={value.items.join("\n")} onChange={(e) => set("items", e.target.value.split("\n"))} rows={compact ? 3 : 5} />
        </Field>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {needs("value") && (
          <Field label="Číslo">
            <Input type="number" value={value.value} onChange={(e) => set("value", Number(e.target.value) || 0)} />
          </Field>
        )}
        {needs("url") && (
          <Field label="Adresa webu">
            <Input value={value.url} onChange={(e) => set("url", e.target.value)} />
          </Field>
        )}
        {needs("author") && (
          <Field label="Autor">
            <Input value={value.author} onChange={(e) => set("author", e.target.value)} />
          </Field>
        )}
        {needs("labels") && (
          <>
            <Field label="Štítek A (tehdy)">
              <Input value={value.labelA} onChange={(e) => set("labelA", e.target.value)} />
            </Field>
            <Field label="Štítek B (dnes)">
              <Input value={value.labelB} onChange={(e) => set("labelB", e.target.value)} />
            </Field>
          </>
        )}
        <Field label="Barvy">
          <Select value={value.theme} onChange={(e) => set("theme", e.target.value as SceneParams["theme"])}>
            <option value="dark">Tmavé</option>
            <option value="light">Světlé</option>
            <option value="brand">Oranžové</option>
          </Select>
        </Field>
      </div>
      {needs("media") && (
        <div className="space-y-2">
          <div className="label">{value.type === "compare" ? "Obrázky" : value.type === "meme" ? "Obrázek" : "Screenshot webu"}</div>
          {mediaSlot("media", value.type === "compare" ? value.labelA || "Tehdy" : "Vybrat obrázek")}
          {needs("media2") && mediaSlot("media2", value.labelB || "Dnes")}
          {(value.type === "phone" || value.type === "browser") && <p className="text-[11px] text-subtle">Tip: celostránkový screenshot webu (dlouhý obrázek) se ve videu plynule proscrolluje.</p>}
        </div>
      )}
      <MediaPicker open={picking !== null} onOpenChange={(o) => !o && setPicking(null)} filter="image" onPick={(m) => picking && set(picking, m.url)} />
    </div>
  );
}
