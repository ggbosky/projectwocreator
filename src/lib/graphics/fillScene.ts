import { aiJson } from "@/lib/ai/service";
import { brandBlock } from "@/lib/ai/prompts";
import type { BrandProfile, SceneParams } from "@/lib/types";
import { SCENE_META } from "./scenes";

/** Lets Claude write the texts of a graphic template for a given topic. */
export async function fillScene(scene: SceneParams, topic: string, brand: BrandProfile): Promise<SceneParams> {
  const meta = SCENE_META[scene.type];
  const raw = await aiJson<Partial<SceneParams>>(`Jsi copywriter sociálních sítí. Vyplň texty grafické šablony "${meta.label}" (${meta.desc}) pro značku na téma: ${topic}.
${brandBlock(brand)}
Pravidla: česky, krátce a úderně (nadpis max 8 slov), žádná vymyšlená konkrétní jména klientů — u čísel buď realistický a použij [ČÍSLO], pokud si nejsi jistý, jen u šablony Počítadlo dej konkrétní celé číslo.
Odpověz POUZE JSON: {"headline": string, "subline": string, "items": string[] (3–6 položek, jen u Checklist/Notifikace, jinak []), "value": number, "labelA": string, "labelB": string, "url": string, "author": string}`);
  return {
    ...scene,
    headline: typeof raw.headline === "string" ? raw.headline : scene.headline,
    subline: typeof raw.subline === "string" ? raw.subline : scene.subline,
    items: Array.isArray(raw.items) && raw.items.length ? raw.items.map(String) : scene.items,
    value: typeof raw.value === "number" ? raw.value : scene.value,
    labelA: raw.labelA || scene.labelA,
    labelB: raw.labelB || scene.labelB,
    url: raw.url || scene.url,
    author: raw.author || scene.author,
  };
}
