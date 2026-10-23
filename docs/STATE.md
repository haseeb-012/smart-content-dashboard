# Dashboard — current state (2026-10-23)

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

Still demo-only in both modes: Dashboard analytics + social verification (next step).

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
