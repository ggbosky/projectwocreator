import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, Mic2, Plus, RotateCcw, Save, Trash2, UserRound, Users, Bookmark, X } from "lucide-react";
import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import type { BrandProfile, Persona, Platform, ReferencePost } from "@/lib/types";
import { cn, PLATFORM_LABEL, uid } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import { useData } from "@/store/data";

const TONE_PRESETS = ["lidský", "přímý", "edukativní", "dravý", "profesionální", "hravý", "sebevědomý", "empatický", "provokativní", "inspirativní", "věcný", "lehce hravý"];

const STEPS = [
  { id: "business", label: "Byznys", icon: Briefcase },
  { id: "audience", label: "Cílovka", icon: Users },
  { id: "voice", label: "Tone of Voice", icon: Mic2 },
  { id: "references", label: "Reference stylu", icon: Bookmark },
] as const;
type StepId = (typeof STEPS)[number]["id"];

export default function BrandPage() {
  const { brand, saveBrand, ready } = useData();
  const role = useAuth((s) => s.user?.role);
  const readOnly = role === "viewer";
  const [draft, setDraft] = useState<BrandProfile>(brand);
  const [step, setStep] = useState<StepId>("business");
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(brand), [brand]);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(brand), [draft, brand]);

  const set = <K extends keyof BrandProfile>(k: K, v: BrandProfile[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await saveBrand(draft);
      toast.success("Brand Brain uložen", { description: "AI bude od teď psát podle nového nastavení." });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-24">
      <PageHeader
        eyebrow="Brand Brain"
        title="Jak"
        accent="mluvíme"
        description="Všechno, co AI potřebuje vědět o Project Two: čím se živíme, pro koho, jak mluvíme a co nám funguje. Čím přesnější, tím lepší výstupy."
      />

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                step === s.id ? "bg-elevated text-fg ring-1 ring-border" : "text-muted hover:bg-elevated/50 hover:text-fg",
              )}
            >
              <span className={cn("grid size-6 place-items-center rounded-lg text-xs", step === s.id ? "bg-brand text-black" : "bg-elevated")}>{i + 1}</span>
              <s.icon className="size-4" />
              {s.label}
            </button>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="card space-y-5 p-5 md:p-6">
            {!ready && <p className="text-sm text-subtle">Načítám…</p>}
            {step === "business" && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Název značky">
                    <Input value={draft.name} onChange={(e) => set("name", e.target.value)} disabled={readOnly} />
                  </Field>
                  <Field label="Web">
                    <Input value={draft.website} onChange={(e) => set("website", e.target.value)} disabled={readOnly} />
                  </Field>
                </div>
                <Field label="Popis byznysu" hint="Co děláte, pro koho a čím se lišíte — 2–4 věty.">
                  <Textarea value={draft.description} onChange={(e) => set("description", e.target.value)} rows={4} disabled={readOnly} />
                </Field>
                <div>
                  <div className="label mb-2">Produkty a služby</div>
                  <div className="space-y-2">
                    {draft.products.map((p, i) => (
                      <div key={i} className="grid gap-2 rounded-xl border border-border bg-elevated/30 p-3 md:grid-cols-[1fr_140px_2fr_auto]">
                        <Input value={p.name} placeholder="Název" disabled={readOnly} onChange={(e) => set("products", draft.products.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                        <Input value={p.price} placeholder="Cena" disabled={readOnly} onChange={(e) => set("products", draft.products.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
                        <Input value={p.description} placeholder="Popis" disabled={readOnly} onChange={(e) => set("products", draft.products.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
                        <Button variant="ghost" size="icon" disabled={readOnly} onClick={() => set("products", draft.products.filter((_, j) => j !== i))} aria-label="Odebrat produkt">
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" disabled={readOnly} onClick={() => set("products", [...draft.products, { name: "", price: "", description: "" }])}>
                      <Plus /> Přidat produkt
                    </Button>
                  </div>
                </div>
                <ChipField label="USP — unikátní prodejní argumenty" values={draft.usps} onChange={(v) => set("usps", v)} placeholder="Napište USP a stiskněte Enter" disabled={readOnly} />
              </>
            )}

            {step === "audience" && (
              <>
                <p className="text-sm text-muted">Persony použije AI k výběru bolestí v hooku a k CTA. Ve Studiu si pak vyberete, pro koho píšete.</p>
                <div className="grid gap-4 xl:grid-cols-2">
                  {draft.personas.map((p, i) => (
                    <PersonaCard
                      key={p.id}
                      persona={p}
                      disabled={readOnly}
                      onChange={(np) => set("personas", draft.personas.map((x, j) => (j === i ? np : x)))}
                      onRemove={() => set("personas", draft.personas.filter((_, j) => j !== i))}
                    />
                  ))}
                </div>
                <Button
                  variant="outline"
                  disabled={readOnly}
                  onClick={() => set("personas", [...draft.personas, { id: uid("persona"), name: "Nová persona", description: "", pains: [], desires: [] }])}
                >
                  <Plus /> Přidat personu
                </Button>
              </>
            )}

            {step === "voice" && (
              <>
                <div>
                  <div className="label mb-2">Tón komunikace</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from(new Set([...TONE_PRESETS, ...draft.tone])).map((t) => {
                      const on = draft.tone.includes(t);
                      return (
                        <button
                          key={t}
                          disabled={readOnly}
                          onClick={() => set("tone", on ? draft.tone.filter((x) => x !== t) : [...draft.tone, t])}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-sm transition-all",
                            on ? "border-brand/60 bg-brand/15 text-fg" : "border-border text-muted hover:border-fg/30 hover:text-fg",
                          )}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Field label="Pravidla stylu" hint="Jak píšeme: délka vět, tykání/vykání, humor, emoji…">
                  <Textarea value={draft.toneNotes} onChange={(e) => set("toneNotes", e.target.value)} rows={4} disabled={readOnly} />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Výchozí CTA">
                    <Input value={draft.defaultCta} onChange={(e) => set("defaultCta", e.target.value)} disabled={readOnly} />
                  </Field>
                  <Field label="Jazyk výstupů">
                    <Select value={draft.language} onChange={(e) => set("language", e.target.value as "cs" | "en")} disabled={readOnly}>
                      <option value="cs">Čeština</option>
                      <option value="en">English</option>
                    </Select>
                  </Field>
                </div>
                <ChipField label="Zakázaná slova" values={draft.forbiddenWords} onChange={(v) => set("forbiddenWords", v)} tone="danger" disabled={readOnly} />
                <ChipField label="Značkové hashtagy" values={draft.hashtags} onChange={(v) => set("hashtags", v.map((h) => (h.startsWith("#") ? h : `#${h}`)))} disabled={readOnly} />
                <ChipField label="Klíčová slova oboru (pro Viral Radar)" values={draft.keywords} onChange={(v) => set("keywords", v)} disabled={readOnly} />
              </>
            )}

            {step === "references" && (
              <ReferenceEditor values={draft.referencePosts} onChange={(v) => set("referencePosts", v)} disabled={readOnly} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {dirty && !readOnly && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="glass fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-2xl px-4 py-3 shadow-2xl lg:left-[calc(50%+128px)]"
          >
            <span className="text-sm text-muted">Neuložené změny</span>
            <Button variant="ghost" size="sm" onClick={() => setDraft(brand)}>
              <RotateCcw /> Zahodit
            </Button>
            <Button size="sm" onClick={save} loading={saving}>
              <Save /> Uložit Brand Brain
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChipField({ label, values, onChange, placeholder = "Napište a stiskněte Enter", tone, disabled }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string; tone?: "danger"; disabled?: boolean }) {
  const [v, setV] = useState("");
  const add = () => {
    const t = v.trim();
    if (t && !values.includes(t)) onChange([...values, t]);
    setV("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !v && values.length) onChange(values.slice(0, -1));
  };
  return (
    <div>
      <div className="label mb-2">{label}</div>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-border bg-elevated/60 p-1.5 focus-within:border-brand/60 focus-within:ring-4 focus-within:ring-brand/10">
        {values.map((x) => (
          <span key={x} className={cn("flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium", tone === "danger" ? "bg-danger/10 text-danger" : "bg-surface text-fg ring-1 ring-border")}>
            {x}
            {!disabled && (
              <button onClick={() => onChange(values.filter((y) => y !== x))} aria-label={`Odebrat ${x}`}>
                <X className="size-3 opacity-60 hover:opacity-100" />
              </button>
            )}
          </span>
        ))}
        <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={onKey} onBlur={add} placeholder={values.length ? "" : placeholder} disabled={disabled} className="min-w-[160px] flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-subtle" />
      </div>
    </div>
  );
}

function PersonaCard({ persona, onChange, onRemove, disabled }: { persona: Persona; onChange: (p: Persona) => void; onRemove: () => void; disabled?: boolean }) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-elevated/30 p-4">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-brand/10 text-brand">
          <UserRound className="size-4" />
        </span>
        <Input value={persona.name} onChange={(e) => onChange({ ...persona, name: e.target.value })} className="font-semibold" disabled={disabled} />
        <Button variant="ghost" size="icon" onClick={onRemove} disabled={disabled} aria-label="Odebrat personu">
          <Trash2 />
        </Button>
      </div>
      <Textarea value={persona.description} onChange={(e) => onChange({ ...persona, description: e.target.value })} rows={2} placeholder="Kdo to je, věk, obor, situace…" disabled={disabled} className="min-h-[60px]" />
      <ChipField label="Bolesti" values={persona.pains} onChange={(v) => onChange({ ...persona, pains: v })} tone="danger" disabled={disabled} />
      <ChipField label="Touhy" values={persona.desires} onChange={(v) => onChange({ ...persona, desires: v })} disabled={disabled} />
    </div>
  );
}

function ReferenceEditor({ values, onChange, disabled }: { values: ReferencePost[]; onChange: (v: ReferencePost[]) => void; disabled?: boolean }) {
  const update = (i: number, patch: Partial<ReferencePost>) => onChange(values.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Vložte vlastní úspěšné příspěvky. AI z nich převezme styl, délku vět a slovník.</p>
      {values.map((r, i) => (
        <div key={r.id} className="space-y-3 rounded-2xl border border-border bg-elevated/30 p-4">
          <div className="grid gap-2 md:grid-cols-[160px_1fr_auto]">
            <Select value={r.platform} onChange={(e) => update(i, { platform: e.target.value as Platform })} disabled={disabled}>
              {Object.entries(PLATFORM_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
            <Input value={r.url} onChange={(e) => update(i, { url: e.target.value })} placeholder="https://…" disabled={disabled} />
            <Button variant="ghost" size="icon" onClick={() => onChange(values.filter((_, j) => j !== i))} disabled={disabled} aria-label="Odebrat referenci">
              <Trash2 />
            </Button>
          </div>
          <Textarea value={r.text} onChange={(e) => update(i, { text: e.target.value })} rows={3} placeholder="Text příspěvku / přepis videa" disabled={disabled} />
          <Input value={r.why} onChange={(e) => update(i, { why: e.target.value })} placeholder="Proč to fungovalo / co z toho převzít" disabled={disabled} />
        </div>
      ))}
      <Button variant="outline" disabled={disabled} onClick={() => onChange([...values, { id: uid("ref"), platform: "instagram", url: "", text: "", why: "" }])}>
        <Plus /> Přidat referenci
      </Button>
      <Hint>Tip: 3–5 nejlepších postů stačí. Víc referencí neznamená lepší výstup.</Hint>
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-info/20 bg-info/5 px-3 py-2 text-xs text-info">{children}</p>;
}
