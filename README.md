# Project Two — Creator Studio

Interní nástroj [Project Two](https://projectwo.com/) pro tvorbu virálního obsahu (Instagram Reels, TikTok, LinkedIn, X):
**najdi virální tvůrce → pochop, proč to fungovalo → vygeneruj hotový scénář / post pro Project Two → naplánuj → pošli do CRM.**

Designově navazuje na [Project Two CRM](https://ggbosky.github.io/projectwodashboard/) — tmavé UI, ember oranžová `#FF5A0F`,
Inter + Instrument Serif, skleněné panely, světlý režim jedním klikem.

| Sekce | Co umí |
|---|---|
| **Dashboard** | KPI pipeline, nejvirálnější posty v oboru, stav Brand Brain, plán na 14 dní |
| **Viral Radar** | Hledání tvůrců a trendů podle klíčových slov, filtry platforem/jazyka/dosahu, Viral Score, engagement, štítky (Edukace, Kontroverze, Příběh…), Swipe File, **rozbor odkazu** (Hook · Retence · Storytelling · Vizuál · CTA) |
| **AI Content Studio** | Remix virální reference → 3 hooky (text na obrazovce + mluvené slovo), scénář po vteřinách, B-roll/kamera/střih/titulky, popisek + hashtagy; karusel 7 slidů; LinkedIn post; X vlákno |
| **Pipeline & Kalendář** | Kanban (Nápady → Vygenerováno → K natočení → Hotovo → Publikováno) a měsíční kalendář, obojí drag & drop; **Odeslat do Project Two CRM** (podepsaný JSON webhook) |
| **Brand Brain** | Popis byznysu, produkty, USP, persony (bolesti/touhy), tone of voice, zakázaná slova, referenční posty |
| **Nastavení** | API klíče (šifrovaně v Supabase Vault), tým a role, CRM webhook, export/seed dat, motiv |

## Rychlý start (demo, bez backendu)

```bash
npm install
```

```bash
npm run dev
```

Otevřete <http://localhost:5173>, přihlaste se `admin@projectwo.com` / `projectwo-demo` (heslo si změňte — viz `.env.example`).

## Ostrý provoz

Supabase Auth (bez veřejné registrace) + Postgres s RLS + Edge Functions s Claude/Apify/YouTube:
**[docs/SETUP.md](docs/SETUP.md)** — návod krok za krokem (založení projektu, admin účet, vypnutí registrací, API klíče, nasazení).

Architektura, bezpečnostní tok, datový model a formát CRM payloadu: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Struktura

```
src/
  pages/            Login, ResetPassword, Dashboard, Radar, Studio, Pipeline, Brand, Settings
  components/       ui/ (shadcn-style primitiva), layout/, radar/, studio/, pipeline/
  store/            auth (demo + Supabase), data (optimistické mutace), ui (motiv)
  lib/repo/         Repository: LocalRepository (demo) | SupabaseRepository (RLS)
  lib/ai/           service (přepínač), localEngine (demo AI), localRadar
  lib/crm.ts        CRM payload + odeslání
  data/seed.ts      Brand Brain Project Two + ukázkoví (fiktivní) tvůrci a virální posty
supabase/
  migrations/       SQL schéma, RLS politiky, Vault funkce
  functions/        ai-generate, ai-analyze, viral-radar, crm-sync, admin-users (Deno)
```

## Skripty

| Příkaz | Popis |
|---|---|
| `npm run dev` | vývojový server |
| `npm run build` | typecheck + produkční build do `dist/` (+ `404.html` pro SPA routing) |
| `npm run preview` | náhled buildu |
| `npm run hash-password -- "heslo"` | SHA-256 hash pro `VITE_DEMO_PASSWORD_HASH` |

> Ukázkoví tvůrci v `src/data/seed.ts` jsou fiktivní profily sloužící k vyzkoušení. Skutečná data dodá Viral Radar
> po vložení Apify / YouTube klíčů.
