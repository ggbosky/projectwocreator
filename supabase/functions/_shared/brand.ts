// deno-lint-ignore-file no-explicit-any
/** Turns the Brand Brain into a compact system-prompt section. */
export function brandContext(brand: any): string {
  const personas = (brand.personas ?? [])
    .map((p: any) => `- ${p.name}: ${p.description}\n  Bolesti: ${(p.pains ?? []).join("; ")}\n  Touhy: ${(p.desires ?? []).join("; ")}`)
    .join("\n");
  const products = (brand.products ?? []).map((p: any) => `- ${p.name} (${p.price}): ${p.description}`).join("\n");
  const refs = (brand.referencePosts ?? [])
    .filter((r: any) => r.text)
    .map((r: any) => `- [${r.platform}] "${r.text}" — ${r.why}`)
    .join("\n");
  return `<brand>
Značka: ${brand.name} (${brand.website})
Popis: ${brand.description}
Produkty:
${products}
USP:
${(brand.usps ?? []).map((u: string) => `- ${u}`).join("\n")}
Persony:
${personas}
Tón: ${(brand.tone ?? []).join(", ")}
Pravidla stylu: ${brand.toneNotes}
Zakázaná slova (nikdy nepoužívej): ${(brand.forbiddenWords ?? []).join(", ")}
Výchozí CTA: ${brand.defaultCta}
Značkové hashtagy: ${(brand.hashtags ?? []).join(" ")}
Referenční posty značky (napodob styl):
${refs || "- žádné"}
</brand>`;
}
