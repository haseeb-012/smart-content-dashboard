# Dashboard — current state (2026-10-23)

## ▶ Resume here (status at end of 2026-10-23)

Full status + remaining steps: `smart-content-backend/docs/STATE.md`. Dashboard specifics:
- Every screen is live in live mode (Dashboard analytics, Videos, Analysis, Channels incl. niche search, Ideas, Hooks, Collections, Scripts, Projects, Exports, Settings incl. Social verification + Connectors/MCP, `/oauth/consent`).
- `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL` set. Optional/empty: `NEXT_PUBLIC_MCP_URL`, `NEXT_PUBLIC_HELP_URL`.
- On deploy (Vercel): set the same vars with the online backend URL; add the online `/auth/callback` to Supabase redirect URLs.


**All product features are built and pushed.** 115 backend tests green; live e2e passed for every module.

**Real setup done**
- Supabase: database connected (Session pooler, `postgresql+asyncpg`), migrations at `0008` (24 tables), sample Collections (8) + Hooks (16) seeded.
- Supabase website: Site URL `http://localhost:3001`, redirect `…/auth/callback`, Email on, OAuth Server on (`/oauth/consent`, dynamic registration), ES256 signing keys.
- Owner account `haseebsajjad666@gmail.com` signed up and confirmed; `is_admin = true`, `mcp_enabled = true`; workspace "Fitness".
- Stripe test: secret + publishable test keys and all 6 `STRIPE_PRICE_*` IDs filled in.
- Apify token filled in.

**Still to do (in this order)**
1. `GEMINI_API_KEY` → then `LLM_PROVIDER=gemini` (backend `.env`).
2. `CHANNEL_PROVIDER=apify` (token already present).
3. Full test with real Gemini + Apify (verify Apify field mapping, Gemini Interactions response shape, bio-code check fields).
4. Deploy: backend (Render/Railway), dashboard + landing (Vercel). Then set `PUBLIC_API_URL`, `DASHBOARD_URL`, `CORS_ORIGINS`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DASHBOARD_URL`, `NEXT_PUBLIC_MCP_URL`; Supabase Site URL + redirect URL → real domains.
5. Stripe webhook (needs the online URL): Developers → Webhooks → `https://<backend>/api/v1/billing/webhook`, events `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.paid`, `invoice.payment_failed` → `STRIPE_WEBHOOK_SECRET=whsec_…` → `BILLING_PROVIDER=stripe_test` (the app refuses to start in stripe_test without the secret). Stripe Customer Portal: enable cancel / update payment / switch plans (all 3 products).
6. Test payment with card 4242 4242 4242 4242; connect Claude to `https://<backend>/mcp`.

**Run locally**
- Backend: `cd smart-content-backend && uv run uvicorn app.main:app --port 8000` (uses `.env`; now the real Supabase DB).
- Dashboard: `cd smart-content-dashboard && npm run dev -- -p 3001` (live mode — `.env.local` has Supabase + API URL).
- Landing: `cd smart-content-landing && npm run dev` → :3000.

Run: `npm install && npm run dev -- -p 3001` → http://localhost:3001

## Two modes
| Mode | When | What's real |
|---|---|---|
| **Live** | `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL` | Supabase login (email/password, Google, Apple, forgot/reset), route protection, profile, workspaces (create/rename/deactivate, plan limit), plan, credits + history, Stripe test Checkout + Customer Portal, waitlist — all from the FastAPI backend |
| **Demo** | any of those missing | Everything local in the browser; "Demo mode" badge in the top bar |

**Collections are live** (Phase 5 step 1): list/filter/search/sort, detail with curated examples + transcripts, reference-sheet export — all from `/api/v1/collections`.

**Channels + Videos are live** (Phase 5 step 2): watchlist (add by URL / search / suggested, remove, refresh, sync status with auto-polling), Discover feed with all filters, sorts, paging and CSV export — cards open the original post until Deep Analysis ships.

**Deep Analysis is live**: feed cards open `/videos/{id}` → Analyze (1 credit, only on success) → progress polling → Summary/Transcript/Idea/Hook/Format/Visual tabs, plus Create script, Save hook, Add to project, Export for LLM.

**Create module is live** (`components/features/live-create.tsx`): Ideas (list, shortlist, delete, free generator, write script), Hooks (public library with filters, free generator, workspace watchlist), Scripts (create with `Idempotency-Key`, edit → versions, free expand, restore, server-side export), Projects (create, add/move/remove items, delete), Exports (workspace JSON, all scripts Markdown, copy for LLM, history). Verified e2e: 20/20.

Dashboard analytics, Social verification, niche search and MCP Connectors + `/oauth/consent` are live too. Nothing is demo-only in live mode any more.

## Step 3 (done)
- `@supabase/ssr` browser + server clients (`lib/supabase/*`), PKCE callback `app/auth/callback/route.ts`.
- `proxy.ts` (Next 16 "middleware"): refreshes the session cookie, redirects signed-out users to `/login?next=…`, sends signed-in users away from login/signup (to the chosen plan if `?plan=` is present). UX only — the backend verifies every token.
- `lib/api/client.ts`: typed `/api/v1` client, attaches the Supabase access token, maps `{error:{code,…}}` to `ApiError`.
- Store syncs `/me` + `/workspaces`; onboarding creates the first workspace on the server.
- Pricing flow: landing "Get started" → `/signup?plan=&cycle=` → onboarding → Settings shows "Continue to test checkout" → Stripe → back with `?checkout=success` → plan refreshes when the webhook lands.
- Verified end-to-end against the real backend with a local Supabase stand-in (JWKS): 8/8 checks (login redirect, onboarding, server workspace, credits, no demo badge, billing state, server-side plan limit).

## Screens (see previous milestone for the full list)
Dashboard, Videos, Video analysis, Channels, Ideas, Hooks, Collections, Scripts, Projects, Exports, Settings (Subscription, Profile, Social verification, Workspaces, Feature flags, Connectors), Login/Signup/Forgot/Reset, Onboarding.

## Supabase setup checklist
1. Auth → URL configuration: Site URL = dashboard URL; add `<dashboard>/auth/callback` to Redirect URLs.
2. Auth → Providers: enable Email; Google and Apple need their OAuth client IDs.
3. Copy URL + publishable key into `.env.local`; backend gets `SUPABASE_URL` + `DATABASE_URL`.
