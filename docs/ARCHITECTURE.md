# Architektura — Project Two Creator Studio

## 1. Přehled

```
┌──────────────────────────── Prohlížeč (React + Vite SPA) ────────────────────────────┐
│  /login  /reset-password        ◄── jediné veřejné routy                              │
│  <ProtectedRoute> ──► AppShell ──► Dashboard · Viral Radar · Studio · Pipeline ·      │
│                                    Brand Brain · Nastavení                            │
│                                                                                       │
│  store/auth.ts  ── demo: lokální login (SHA-256 hash z .env)                          │
│                 └─ supabase: Supabase Auth (e-mail + heslo, PKCE)                     │
│  store/data.ts  ── Repository ── LocalRepository (localStorage)  [demo]               │
│                               └─ SupabaseRepository (PostgREST + RLS)  [live]         │
│  lib/ai/service ── demo: localEngine.ts (deterministické šablony)                     │
│                 └─ live: supabase.functions.invoke(...) s JWT uživatele               │
└───────────────────────────────────────────┬───────────────────────────────────────────┘
                                            │ HTTPS + JWT (anon key je veřejný)
┌───────────────────────────────────────────▼───────────── Supabase ─────────────────────┐
│ Auth (signup VYPNUTÝ)  │  Postgres + RLS  │  Vault (šifrované API klíče)                │
│ Edge Functions (Deno):                                                                │
│   ai-generate  ── Claude (structured JSON output) → hooky, scénář, slidy, popisek      │
│   ai-analyze   ── Apify (metadata z URL) + Claude → rozbor Hook/Retence/Story/CTA     │
│   viral-radar  ── Apify (TikTok, Instagram) + YouTube Data API → tvůrci a posty       │
│   crm-sync     ── HMAC-podepsaný webhook → Project Two CRM (Make / n8n / vlastní API) │
│   admin-users  ── pozvánky, role, odebrání (service role, jen admin)                  │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

Frontend je čistá SPA (Vite + React 18 + TypeScript + Tailwind + Radix/shadcn‑style komponenty + Framer Motion + dnd‑kit).
Nehostuje žádný vlastní server: v ostrém režimu veškerou „backend“ logiku obstarává Supabase.
Díky tomu jde aplikace nasadit stejně jako stávající CRM — na GitHub Pages / Netlify / Vercel.

## 2. Bezpečnostní tok

### Přihlášení
1. Každá URL kromě `/login` a `/reset-password` je obalena `<ProtectedRoute>`.
   Dokud `useAuth().status !== "authenticated"`, nevykreslí se **nic** z aplikace (ani sidebar) a uživatel
   je přesměrován na `/login` (původní URL se zapamatuje a po přihlášení se na ni vrátí).
2. **Supabase režim:** `signInWithPassword` → JWT (1 h, auto-refresh, rotace refresh tokenů).
   Po přihlášení se načte řádek z `public.profiles`. Pokud neexistuje (účet není členem týmu),
   aplikace okamžitě zavolá `signOut()` — samotný účet v Auth tedy nestačí.
3. **Registrace neexistuje:** v UI není formulář, v Supabase je `enable_signup = false`.
   Účty vznikají jen ručně v dashboardu Supabase nebo přes Edge Function `admin-users` (pouze role `admin`).
4. Reset hesla: `resetPasswordForEmail` → e-mail → `/reset-password` (PKCE `?code=`) → `updateUser({ password })`.
5. Brute-force: Supabase má vlastní rate limiting; klient navíc po 5 chybách zamkne formulář na 60 s.

### Demo / preview bypass
- `VITE_AUTH_MODE=demo` (výchozí, nebo automaticky když chybí Supabase URL/klíč).
- Heslo **není** v kódu ani v `.env` jako text — jen jeho SHA-256 (`VITE_DEMO_PASSWORD_HASH`, `npm run hash-password`).
- Session je podepsaná hashem hesla → změna hesla v `.env` zneplatní všechny demo session. Expirace 12 h.
- ⚠️ Demo režim je **ochrana proti náhodnému přístupu, ne skutečná bezpečnost** — vše běží v prohlížeči.
  Data jsou v `localStorage` daného prohlížeče a AI engine je lokální (žádné API kredity nelze vyčerpat).
  Pro produkci vždy přepněte na `VITE_AUTH_MODE=supabase`.

### Ochrana dat (RLS)
- Všechny tabulky mají zapnuté RLS; role `anon` nemá na tabulky žádná práva.
- Pomocné funkce `is_team_member()`, `can_edit()`, `is_admin()`, `my_role()` jsou `SECURITY DEFINER`
  s pevným `search_path` (žádná rekurze v politikách, žádný search_path hijack).
- Role: **admin** (vše, klíče, tým, mazání), **editor** (obsah, Brand Brain, radar), **viewer** (jen čtení).
- Uživatel nemůže sám sobě zvýšit roli (`profiles_update_self` hlídá `role = my_role()`).

### API klíče
- **Nikdy v prohlížeči.** Vše s prefixem `VITE_` je veřejné — proto tam žádné klíče nejsou.
- Klíče žijí buď jako Edge Function secrets (`supabase secrets set`), nebo šifrovaně v **Supabase Vault**.
  Admin je v Nastavení může jen *zapsat* (`set_integration_secret`) a vidět, zda existují
  (`list_integration_secrets`). Dešifrovat je umí jen `get_integration_secret`, která je spustitelná
  výhradně rolí `service_role` (tj. uvnitř Edge Functions).
- Každá Edge Function: ověří JWT → ověří členství a roli v `profiles` → **rate limit** z `activity_log`
  (výchozí 60 AI požadavků / h / uživatel, 20 vyhledávání v radaru) → teprve pak volá placené API.
- CORS lze omezit na doménu aplikace secretem `APP_ORIGIN`.

## 3. Datový model

| Tabulka | Účel | Klíčové sloupce |
|---|---|---|
| `profiles` | Členové týmu (1:1 s `auth.users`) | `role` (`admin`/`editor`/`viewer`) |
| `brand_profiles` | Brand Brain | `description`, `products` (jsonb), `usps[]`, `personas` (jsonb), `tone[]`, `tone_notes`, `forbidden_words[]`, `reference_posts` (jsonb), `keywords[]` |
| `creators` | Virální tvůrci v radaru | `platform`, `handle` (unique s platformou), `followers`, `avg_views`, `engagement_rate`, `growth_30d` |
| `viral_posts` | Trendy + Swipe File | metriky (`views`, `likes`, `comments`, `shares`, `saves`), `tags[]`, `viral_score`, `analysis` (jsonb), `saved_to_swipe` |
| `content_items` | Pipeline + kalendář | `status` (`idea`→`generated`→`to_shoot`→`done`→`published`), `position`, `scheduled_for`, `output` (jsonb výstup AI), `crm_synced_at` |
| `integration_settings` | Ne-tajná konfigurace | např. `crm_webhook_url` |
| `activity_log` | Audit + rate limiting | `actor`, `action`, `meta` |
| `vault.secrets` | Šifrované API klíče | prefix `pw_` |

SQL: [`supabase/migrations/20261122000000_init.sql`](../supabase/migrations/20261122000000_init.sql).

## 4. AI vrstva

- `ai-generate` posílá Claude (`claude-opus-5-5`, adaptive thinking, effort `medium`) systémový prompt
  složený z Brand Brain + pravidla formátu + strukturu reference. Výstup je vynucen JSON schématem
  (`output_config.format`), takže frontend vždy dostane přesně `GeneratedContent`
  (3 hooky, scénář po vteřinách, vizuální pokyny, 7 slidů, text postu, popisek, hashtagy).
- Je zapnutý server-side refusal fallback (`fallbacks: "default"`); `stop_reason` `refusal` / `max_tokens`
  se převádí na srozumitelné chyby v UI.
- Model lze změnit secretem `CLAUDE_MODEL`.
- Demo engine (`src/lib/ai/localEngine.ts`) vrací stejný tvar dat, takže UI je identické v obou režimech.

## 5. Napojení na Project Two CRM

Tlačítko **„Odeslat do Project Two CRM“** posílá verzovaný payload:

```json
{
  "schema": "projectwo.creator.content/v1",
  "source": "projectwo-creator-studio",
  "sentAt": "2026-11-22T10:00:00.000Z",
  "brand": { "name": "Project Two", "website": "https://projectwo.com/" },
  "items": [{
    "id": "uuid", "title": "…", "format": "reel", "platform": "instagram",
    "status": "to_shoot", "scheduledFor": "2026-11-28", "topic": "…",
    "hooks": ["…"], "caption": "…", "hashtags": ["#projectwo"],
    "script": [{ "time": "0–3 s", "spoken": "…", "onScreen": "…", "visual": "…" }],
    "slides": [{ "index": 1, "headline": "…", "body": "…" }],
    "notes": "", "createdAt": "…", "updatedAt": "…"
  }],
  "sentBy": "admin@projectwo.com"
}
```

Hlavičky: `X-Projectwo-Event: content.export`, `X-Projectwo-Timestamp`, `X-Projectwo-Signature`
= hex(HMAC‑SHA256(`CRM_WEBHOOK_SECRET`, `${timestamp}.${body}`)). Ověření na straně CRM (Node):

```js
const expected = crypto.createHmac("sha256", SECRET).update(`${ts}.${rawBody}`).digest("hex");
if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) throw new Error("bad signature");
if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) throw new Error("stale request");
```

Pokud CRM běží na stejném Supabase projektu, lze místo webhooku číst přímo tabulku `content_items`
(stejné RLS) nebo použít Supabase Realtime.
