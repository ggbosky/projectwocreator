# Návod: ostrý provoz se Supabase (zdarma) krok za krokem

Celé nastavení zabere cca 20–30 minut. Free tier Supabase na interní nástroj bohatě stačí.

> Názvy položek v dashboardu Supabase se občas mírně mění. Pokud něco nenajdete,
> použijte vyhledávání v dashboardu (Ctrl K) s uvedeným anglickým názvem.

---

## Krok 0 — Vyzkoušejte demo (2 minuty)

```bash
npm install
```

```bash
npm run dev
```

Otevřete <http://localhost:5173> → přihlášení `admin@projectwo.com` / `projectwo-demo`.
Demo běží úplně bez backendu (data v prohlížeči, lokální AI engine).

Vlastní demo heslo:

```bash
npm run hash-password -- "MojeSilneHeslo123"
```

Výsledný hash vložte do `.env.local` jako `VITE_DEMO_PASSWORD_HASH=…` (soubor vytvořte kopií `.env.example`).

---

## Krok 1 — Založte Supabase projekt

1. Jděte na <https://supabase.com> → **Start your project** → přihlaste se (GitHub účet stačí).
2. **New project** → Organization: vaše, Name: `projectwo-creator`, Database password: vygenerujte a **uložte si ho**,
   Region: `Central EU (Frankfurt)` (nejblíž ČR) → Plan: **Free** → **Create new project**.
3. Počkejte ~2 minuty, než se projekt připraví.

## Krok 2 — Vytvořte databázi (SQL schéma + RLS)

1. V levém menu **SQL Editor** → **New query**.
2. Zkopírujte celý obsah souboru [`supabase/migrations/20261122000000_init.sql`](../supabase/migrations/20261122000000_init.sql) a vložte ho.
3. **Run**. Mělo by proběhnout bez chyb („Success. No rows returned“).
4. Kontrola: **Table Editor** → vidíte tabulky `profiles`, `brand_profiles`, `creators`, `viral_posts`,
   `content_items`, `integration_settings`, `activity_log` — všechny se štítkem **RLS enabled**.

*(Alternativa přes CLI: `supabase link --project-ref <ref>` a `supabase db push`.)*

## Krok 3 — Vypněte veřejné registrace (KRITICKÉ)

1. **Authentication** → **Sign In / Providers** (dříve „Providers“ / „Auth settings“).
2. Vypněte **Allow new users to sign up**. Uložte.
3. V sekci **Email** nechte provider zapnutý (přihlášení e-mailem a heslem) a zapněte **Confirm email**.
4. Volitelně **Authentication → Policies / Passwords**: minimální délka hesla 10, zapněte kontrolu uniklých hesel.

Od teď se nikdo nemůže zaregistrovat sám — ani přímým voláním API.

## Krok 4 — Nastavte adresy pro e-maily (reset hesla, pozvánky)

**Authentication** → **URL Configuration**:
- **Site URL**: adresa, kde aplikace poběží, např. `https://ggbosky.github.io/projectwocreator/`
  (pro lokální vývoj `http://localhost:5173`).
- **Redirect URLs**: přidejte `http://localhost:5173/reset-password` a `https://<vaše-doména>/<cesta>/reset-password`.

## Krok 5 — Vytvořte svůj jediný admin účet

1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. Zadejte svůj e-mail a silné heslo, zaškrtněte **Auto Confirm User** → **Create user**.
3. Trigger `on_auth_user_created` automaticky vytvoří řádek v `profiles`. **První uživatel dostane roli `admin`**,
   každý další `editor`.
4. Kontrola v SQL Editoru:

   ```sql
   select email, role from public.profiles;
   ```

   Kdyby role nebyla `admin`:

   ```sql
   update public.profiles set role = 'admin' where email = 'vas@email.cz';
   ```

Další členy týmu pak přidáte přímo z aplikace (**Nastavení → Tým → Pozvat**), nebo stejně jako v tomto kroku.

## Krok 6 — Připojte frontend

1. **Project Settings** → **API** (nebo **Data API** / **API Keys**): zkopírujte **Project URL** a **anon / publishable key**.
   ⚠️ Nikdy nekopírujte `service_role` / secret key do frontendu.
2. Vytvořte `.env.local`:

   ```ini
   VITE_AUTH_MODE=supabase
   VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

3. Restartujte `npm run dev` a přihlaste se účtem z kroku 5.
   Při prvním přihlášení se automaticky založí Brand Brain pro Project Two.
4. **Nastavení → Data → Naplnit ukázkovými daty** nahraje ukázkové tvůrce a virální posty do databáze.

## Krok 7 — Nasaďte Edge Functions (AI, radar, CRM, tým)

Nainstalujte Supabase CLI (<https://supabase.com/docs/guides/cli>), pak v kořeni projektu:

```bash
npx supabase login
```

```bash
npx supabase link --project-ref <project-ref>
```

`<project-ref>` je část URL `https://<project-ref>.supabase.co`.

```bash
npx supabase functions deploy ai-generate ai-analyze viral-radar crm-sync admin-users
```

Všechny funkce vyžadují platný JWT přihlášeného člena týmu (`verify_jwt = true` + kontrola role v kódu).

## Krok 8 — Vložte API klíče (bezpečně)

Získejte klíče:

| Služba | K čemu | Kde |
|---|---|---|
| Anthropic | generování obsahu + analýza | <https://console.anthropic.com/settings/keys> |
| Apify | data z Instagramu a TikToku | <https://console.apify.com/settings/integrations> |
| YouTube Data API v3 | vyhledávání Shorts | Google Cloud Console → APIs & Services → povolit „YouTube Data API v3“ → Credentials → API key |
| CRM webhook secret | podpis požadavků do CRM | libovolný náhodný řetězec, např. `openssl rand -hex 32` |

**Varianta A — z aplikace (nejjednodušší):** přihlaste se jako admin → **Nastavení → API klíče → Nastavit**.
Klíč se uloží šifrovaně do Supabase Vault; po uložení ho už nikdo (ani admin) neuvidí.

**Varianta B — přes CLI jako Edge Function secrets:**

```bash
cp supabase/functions/.env.example supabase/functions/.env
```

Vyplňte hodnoty v `supabase/functions/.env` (soubor je v `.gitignore`) a pak:

```bash
npx supabase secrets set --env-file supabase/functions/.env
```

Secrets z varianty B mají přednost před Vaultem. Doporučené doplňkové secrets: `APP_ORIGIN` (doména aplikace pro CORS)
a `APP_URL` (pro odkaz v pozvánkách).

## Krok 9 — Napojení na Project Two CRM

1. V CRM (nebo v Make / n8n / Zapier) vytvořte webhook endpoint, který přijme JSON.
2. V aplikaci **Nastavení → Project Two CRM → Webhook URL** vložte `https://…` a uložte.
3. V Pipeline klikněte **Odeslat do Project Two CRM**, vyberte položky → **Odeslat**.
   Formát payloadu a ověření podpisu: [ARCHITECTURE.md § 5](./ARCHITECTURE.md#5-napojení-na-project-two-crm).

## Krok 10 — Nasazení (GitHub Pages, stejně jako CRM)

V repozitáři je workflow [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

1. GitHub → repo → **Settings → Pages** → Source: **GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables**: přidejte `VITE_AUTH_MODE=supabase`,
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (anon klíč je veřejný, proto stačí *Variables*).
3. Push do `main` → aplikace poběží na `https://<user>.github.io/projectwocreator/`.
4. Tuto adresu doplňte do Supabase (krok 4) a do secretu `APP_ORIGIN` (`https://<user>.github.io`).

## Bezpečnostní checklist před ostrým spuštěním

- [ ] `VITE_AUTH_MODE=supabase` v produkčním buildu
- [ ] Sign-ups vypnuté (krok 3)
- [ ] Jen vaše účty v **Authentication → Users**
- [ ] Žádný `service_role` klíč ve frontendu ani v gitu
- [ ] API klíče jen ve Vault / Edge secrets
- [ ] `APP_ORIGIN` nastaven na vaši doménu
- [ ] V Supabase **Advisors → Security Advisor** žádná varování
