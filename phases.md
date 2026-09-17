# phases.md — AcaDomo MVP Development Plan

Sequential build plan. Each phase ends in a working, committable state.
**Rule: finish and verify a phase before starting the next.** See `CLAUDE.md`.

Claude never runs git. Each phase ends with a Commit Checkpoint for you to run.

**Estimated total: ~15–17 focused hours.** Phases 0–5 are the demo-critical path;
5.5 adds student accounts; 7.5 makes it installable; 6–8 turn a working demo
into a credible portfolio piece.

**Positioning:** built by a backend developer with applied frontend skills.
Frontend libraries are used liberally and deliberately; backend depth is where
the time goes. See `CLAUDE.md` §0.

**Ships as an installable PWA.** App-shell UI conventions (bottom nav, safe
areas, ≥44px touch targets, no hover-only interactions) apply from **Phase 0** —
they are free early and expensive to retrofit. The service worker and manifest
land at Phase 7.5, after deploy. See `CLAUDE.md` §5a.

---

## Phase 0 — Foundation & Repo Hygiene
**Goal:** a running Next.js skeleton with nothing secret in it.
**Est: 30 min**

- [x] `create-next-app` — TypeScript, App Router, Tailwind, ESLint, `src/` no, alias `@/*`
- [x] `.gitignore` verified: `.env*.local`, `node_modules`, `.next`, `*.log`
- [x] `.env.example` committed with **empty** values (`DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`)
- [x] `.env.local` created with real values — **never committed**
- [x] Tailwind config: accent color, type scale, container widths
- [x] shadcn/ui init (`npx shadcn@latest init`) — CSS variables mode, so dark mode is free
- [x] `next-themes` wired: `ThemeProvider` with `attribute="class"`, `suppressHydrationWarning` on `<html>`, `defaultTheme="system"`
- [x] `components/theme-toggle.tsx` — light/dark/system dropdown, **no flash on load**
- [x] `app/layout.tsx` — font, metadata, header with theme toggle, `<Toaster />`
- [x] **App shell built now** (`CLAUDE.md` §5a):
  - [x] `components/bottom-nav.tsx` — fixed bottom tabs, `md:hidden`, with `pb-[env(safe-area-inset-bottom)]`
  - [x] Desktop header nav `hidden md:flex`
  - [x] `viewport-fit=cover` in the viewport meta so safe-area insets resolve
  - [x] `theme-color` meta bound to the active theme
  - [x] `overscroll-behavior: none` in globals.css
- [x] Root page renders a placeholder; `npm run dev` serves it

**Dark mode and the app shell are set up in Phase 0 on purpose** — retrofitting
either after 8 screens exist means auditing every one. Establishing both now
makes them nearly free; every later phase just uses semantic tokens and drops
content into the existing shell.

**Verify:** `npm run build` passes · toggle switches themes with no flash on reload · bottom nav on mobile / header on desktop · `git status` shows no `.env.local`

> **Commit Checkpoint 0** — `chore: scaffold Next.js app with app shell, shadcn/ui, and dark mode`

---

## Phase 1 — Database: Schema, Client, Seed
**Goal:** real Postgres with realistic data, queryable from Node.
**Est: 1 hr**

- [x] Local DB created: `createdb acadomo_dev`
- [x] `db/schema.sql`:
  - `properties` — id, title, slug, city, country, **university**, price_per_week (int, minor units), currency, room_type, description, amenities (text[]), image_url, created_at
  - `enquiries` — id, property_id FK → properties ON DELETE CASCADE, name, email, phone, message, status (`new` | `contacted`, CHECK constraint), created_at
  - `admin_users` — id, email UNIQUE, password_hash, **role** (default `admin`), created_at
  - `students` — id, email UNIQUE (citext or lowercased), name, email_verified_at, created_at
  - `otp_codes` — id, email, code_hash, expires_at, attempts (default 0), consumed_at, created_at
  - `enquiries` gains a nullable `student_id` FK → students (set when submitted by a signed-in student)
  - Indexes on `properties(city)`, `properties(university)`, `properties(price_per_week)`, `enquiries(status, created_at DESC)`, `otp_codes(email, expires_at)`
- [x] `lib/db/client.ts` — `pg` Pool, singleton across hot reloads, SSL on in prod
- [x] `db/seed.ts` — 15 properties across 5 cities / 6 universities, varied price + room type, Unsplash image URLs; seeds admin user with bcrypt-hashed password from env
- [x] npm scripts: `db:reset`, `db:seed`

**Why `university` and `role`:** the JD names university-based discovery (#4) and
role-based access explicitly. Both cost one column each.

**Why price as integer minor units:** never store money as float.

**Verify:** `npm run db:reset && npm run db:seed` · `psql acadomo_dev -c "select count(*) from properties"` → 15

> **Commit Checkpoint 1** — `feat(db): add schema, pooled client, and seed data`

---

## Phase 2 — Backend: Queries, Validation, REST API
**Goal:** the backend works and is provable with curl, before any UI exists.
**Est: 1.5 hrs**

- [x] `lib/validation.ts` — Zod schemas: `propertyFilters`, `enquiryInput`, `adminLogin`
- [x] `lib/services/` — business logic layer. Route handlers stay thin: validate → authorize → delegate → respond. **No SQL in a route handler, ever** (`CLAUDE.md` §2a)
- [x] `lib/db/queries.ts` — all SQL lives here, all parameterized, snake_case → camelCase mapped at this boundary:
  - `listProperties(filters)` — **server-side** filtering: city, university, min/max price, room type, text search (`ILIKE` on title/city/university), sort via allowlist map, `LIMIT`/`OFFSET`
  - `getPropertyBySlug(slug)`
  - `getFilterOptions()` — DISTINCT cities / universities / room types for the dropdowns
  - `createEnquiry(input)`
  - `listEnquiries()` · `updateEnquiryStatus(id, status)`
- [x] `GET /api/properties` — filters from query string, Zod-parsed, returns `{ items, total, page }`
- [x] `GET /api/properties/[slug]` — 404 when missing
- [x] `POST /api/enquiries` — Zod validation, honeypot field, in-memory IP throttle (5/min), verifies `property_id` exists
- [x] Consistent error shape `{ error: string }`; generic message to client, detail to `console.error`

**Critical:** filtering happens **in SQL**, never by fetching all rows and
filtering in JS. This is the single clearest backend-competence signal in the build.

**Layering is the other signal.** A reviewer should open `lib/services/` and
`lib/db/queries.ts` and immediately see a real backend. Keep it that way.

**Verify with curl** (before any UI):
```
curl 'localhost:3000/api/properties?city=London&maxPrice=30000&q=studio'
curl -X POST localhost:3000/api/enquiries -H 'content-type: application/json' -d '{...}'
```
Confirm: bad email → 400 · missing field → 400 · 6th rapid POST → 429

> **Commit Checkpoint 2** — `feat(api): property search, filters, and enquiry endpoints`

---

## Phase 3 — Frontend: Listing Page + Search & Filters
**Goal:** the page a reviewer sees first. This is the money shot.
**Est: 2 hrs**

- [x] Add shadcn components as needed: `card`, `badge`, `select`, `slider`, `skeleton`, `sheet`, `input`
- [x] `components/property-card.tsx` — composed from shadcn `Card` + `Badge`: image, title, city + university, price/week, room-type badge
- [x] `components/filter-bar.tsx` — shadcn `Select` + `Slider`, in a `Sheet` on mobile; `"use client"`
- [x] Filters drive **URL search params** → Server Component re-queries the DB.
      Shareable URLs, back button works, no client-side state library.
- [x] `app/page.tsx` — hero + filter bar + responsive grid (1 / 2 / 3 cols)
- [x] `loading.tsx` with skeleton cards
- [x] Designed empty state: "No properties match these filters" + clear-filters action
- [x] Result count: "12 properties in London"

**Mobile:** verified at 375px — filters collapse into a `Sheet`, cards go single
column, no horizontal scroll, content clears the bottom nav (`pb-20 md:pb-0`),
and nothing depends on hover.

**Verify:** change a filter → URL updates → results change · reload URL → filters restored · 375px clean · **both themes clean**

> **Commit Checkpoint 3** — `feat(ui): property listing with server-side search and filters`

---

## Phase 4 — Frontend: Property Detail + Enquiry Flow
**Goal:** close the student loop end to end.
**Est: 1.5 hrs**

- [x] `app/properties/[slug]/page.tsx` — Server Component, hero image, title, city/university, price, description, amenities list
- [x] `generateMetadata` per property — title + description + OG tags (cheap SEO signal; the JD names SEO)
- [x] `not-found.tsx` for a bad slug
- [x] `components/enquiry-form.tsx` — `"use client"`, shadcn `Form` + `react-hook-form` + `zodResolver` sharing **the same Zod schema as the server**, inline field errors, disabled + spinner while submitting, hidden honeypot input
- [ ] If a student is signed in, name/email prefill and the enquiry links to their account (see Phase 5.5)
- [x] Success state: inline confirmation replacing the form (no page nav needed)
- [x] Server error surfaces as a readable message, not a silent failure
- [x] "Back to listings" preserving prior filters

**Verify:** submit → row lands in `enquiries` (check via psql) · submit with bad email → inline error, no request wasted · 375px clean · both themes clean

> **Commit Checkpoint 4** — `feat(ui): property detail page and enquiry submission`

---

## Phase 5 — Auth + Admin Dashboard
**Goal:** prove auth, protected routes, and role-based access.
**Est: 1.5 hrs**

- [x] `lib/auth.ts` — bcrypt verify (cost 12), JWT sign/verify via `jose`, `getSession()` helper reading the cookie. Tokens carry a **`realm` claim** (`admin` | `student`) and use distinct cookie names — a student token must never satisfy an admin check
- [x] `POST /api/admin/login` — verify credentials, set `httpOnly` + `secure` + `sameSite=lax` cookie, 2h expiry. **Identical generic error** for wrong email and wrong password (no user enumeration)
- [x] `POST /api/admin/logout` — clears cookie
- [x] `middleware.ts` — redirects unauthenticated `/admin/*` to login
- [x] **Each `/api/admin/*` handler independently verifies the session and role.** Middleware is UX; the handler check is the actual security boundary
- [x] `app/admin/login/page.tsx` — minimal centered form
- [x] `app/admin/page.tsx` — enquiries table (shadcn `table`): date, property, name, email, phone, message, status
- [x] Mark-contacted action → `PATCH /api/admin/enquiries/[id]` → optimistic UI or `router.refresh()`
- [x] Filter tabs: All / New / Contacted; logout button

**Verify:** hit `/admin` logged out → redirected · `curl` the admin API with no cookie → **401** · a student session cookie on an admin route → **401** · wrong password → generic error · mark contacted → persists across reload

> **Commit Checkpoint 5** — `feat(admin): JWT auth, protected routes, and enquiry management`

---

## Phase 5.5 — Student Accounts (Email OTP + Saved Properties)
**Goal:** passwordless student accounts that change what the product does.
**Est: 3.5–4 hrs**

Passwordless is the right call: no password storage, no reset flow, no "forgot
password" surface, and it mirrors how real accommodation platforms onboard.

**Why saved properties:** without it, signing in buys a student nothing they
can't already do. Students comparing accommodation shortlist 5–10 places over
days — this is the reason accounts exist on a real platform, and it serves
AcaDomo's own "discover, compare, book" pitch.

### Schema
- [x] `saved_properties` — student_id FK, property_id FK, created_at,
      PRIMARY KEY (student_id, property_id) so a double-save is impossible
- [x] Index on `(student_id, created_at DESC)`

### OTP service — every rule enforced server-side
- [x] `lib/services/otp.ts`:
  - [x] `crypto.randomInt` for a 6-digit code — **never `Math.random`**
  - [x] Code stored **bcrypt-hashed**; plaintext exists only in the outbound email
  - [x] 10-minute expiry, enforced in the SQL `WHERE`, not just in JS
  - [x] Max 5 verify attempts, then the code is burned
  - [x] Single-use: consumed inside the same transaction that creates the session
  - [x] Any older unconsumed codes for that email invalidated on a new request
  - [x] Send throttle: 3/hour per email **and** per IP
- [x] Email delivery via Resend. **With no `RESEND_API_KEY` set, the code is
      logged to the server console instead** — the flow is fully testable
      without a provider, and adding the key later changes no code
- [x] Never return or log the code in production

### Routes
- [x] `POST /api/auth/request-otp` — **identical response whether or not the
      email exists** (no enumeration)
- [x] `POST /api/auth/verify-otp` — upsert student, set `email_verified_at`,
      issue `realm=student` JWT cookie (30-day)
- [x] `POST /api/auth/logout`
- [x] `POST /api/saved/[id]` / `DELETE /api/saved/[id]` — session-scoped
- [x] Every route resolves `student_id` **from the session**, never from the body

### UI
- [x] `app/signup/page.tsx` — two-step form: email → 6-digit code
      (shadcn `InputOTP`), resend-with-cooldown, clear error states
- [x] Post-verify redirect returns the student **where they started**;
      the `next` param is validated server-side as a relative path
      (`/^\/(?!\/)/`) so it cannot become an open redirect
- [x] Save/unsave heart control on property cards and detail page
- [x] `app/saved/page.tsx` — the shortlist
- [x] `app/account/page.tsx` — enquiry history, scoped by session `student_id`
      **in the SQL**, never by a client-supplied id
- [x] Header shows signed-in state + sign out
- [x] Enquiry form prefills name/email and attaches `student_id` when signed in
- [x] Enquiry flow **stays public** — signing in is an enhancement, never a gate

### Security checklist — all must pass before this phase is done
- [x] Codes in the DB are hashes, verified by eye in psql
- [x] Expired code rejected · 6th attempt rejected · reused code rejected
- [x] Unknown email → same response and timing as a known one
- [x] 4th send in an hour → 429
- [x] Student cookie on an admin route → 401
- [x] `/account` and `/saved` never return another student's rows (two accounts)
- [x] `next=https://evil.com` does not redirect off-site

**Verify:** full signup with the console-logged code · psql shows hashed codes ·
save a property, sign out, sign back in, shortlist persists · both themes · 375px

> **Commit Checkpoint 5.5** — `feat(auth): student accounts with email OTP and saved properties`

---

## Phase 6 — Tests
**Goal:** small, honest suite over the security-relevant logic.
**Est: 45 min**

- [x] Vitest configured, `npm test` script
- [x] `validation.test.ts` — enquiry schema: valid passes; bad email, bad phone, missing name, oversized message all fail
- [x] `queries.test.ts` — filter builder: combined filters compose correctly; sort key outside the allowlist falls back to the default instead of reaching SQL
- [x] `auth.test.ts` — hash/verify round-trip; wrong password rejected; a `realm=student` token fails an admin check
- [x] `otp.test.ts` — **the highest-value tests here**: expired code rejected · 6th attempt rejected · consumed code cannot be reused · correct code within limits succeeds

Deliberately no component or E2E tests. The README states this trade-off plainly.

**Verify:** `npm test` green

> **Commit Checkpoint 6** — `test: cover validation, filter building, and auth helpers`

---

## Phase 6.5 — Visual Design Pass
**Goal:** make it look designed, not defaulted.
**Est: 2.5–3 hrs**

Direction: **editorial & warm**. Reference craft (font pairing, type scale,
section rhythm) taken from design-led studio sites; their theatrics (scroll
jacking, parallax, decorative marquees) deliberately left out — AcaDomo is a
product a student scans quickly, not a brochure.

- [x] **Typography:** Space Grotesk (display) + Inter (body/UI) via `next/font`
  - [x] Hero scale `text-5xl → text-7xl`, tracking `-0.03em`, tight leading
  - [x] `tabular-nums` on prices so they align down the grid
- [x] **Palette:** warm off-white ground, warm ink text, deepened teal accent;
      warm charcoal in dark mode (not blue-black)
- [x] **Navbar:** transparent over hero → blurred + hairline border on scroll;
      display face on the logo; sign-in as a real button
- [x] **Hero (~60vh, results stay visible):** large headline, search inline,
      **university marquee** built from real `getFilterOptions()` values,
      each chip links to that university's filter — information, not decoration
- [x] **Cards:** hairline borders (no drop shadows), price as focal point,
      hover lifts 2px + border darkens
- [x] **Motion:** CSS-only fade-up ~250ms, marquee pauses on hover,
      **everything inside `prefers-reduced-motion`**
- [x] **No new dependencies** — `next/font` + CSS only

**Verify:** every screen (listing, detail, signup, saved, account, admin, login,
404) checked in **both themes** at **375px and desktop** · `npm test` still green
· build + lint clean · reduced-motion honoured

> **Commit Checkpoint 6.5** — `feat(ui): editorial design system, hero, and navbar polish`

---

## Phase 7 — Deployment
**Goal:** a live URL a stranger can open.
**Est: 45 min**

- [x] Neon project created; `schema.sql` applied; seed run against it
- [x] Vercel project linked to the GitHub repo
- [x] Env vars set in Vercel: `DATABASE_URL` (pooled Neon string), `JWT_SECRET` (fresh, **not** the dev one), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `RESEND_API_KEY`
- [x] Production build deploys clean
- [x] Smoke test on the live URL: listing loads · filters work · detail page loads · enquiry submits · **student OTP signup delivers a real email and verifies** · admin login works · admin API returns 401 without a cookie · dark mode persists
- [x] Confirm HTTPS and that the session cookie is `Secure` in prod

**Verify:** open the live URL on a phone and complete the whole loop

> **Commit Checkpoint 7** — `chore: production deployment configuration`

---

## Phase 7.5 — PWA: Installable App
**Goal:** installs to a home screen and works offline for browsing.
**Est: 1.5 hrs**

Deliberately **after** deploy: service workers require HTTPS, and aggressive SW
caching during local development causes stale-asset confusion all build long.

- [x] **Hand-written `public/sw.js`** — no PWA plugin. `@ducanh2912/next-pwa`
      requires webpack (this app builds with Turbopack) and is stale since
      Sept 2024. Zero new dependencies.
- [x] SW registers in production only; unregisters and clears caches in dev
- [x] **Kill switch:** `NEXT_PUBLIC_DISABLE_SW=1` in Vercel + redeploy
      unregisters the worker on every client, no code change needed
- [x] `app/manifest.ts` — name, short_name, `display: "standalone"`,
      `start_url: "/"`, theme/background color, portrait orientation
- [x] Icons: 192px, 512px, and a 512px **maskable** variant (without maskable,
      Android crops the icon badly). Plus `apple-touch-icon` for iOS
- [x] `apple-mobile-web-app-capable` + status bar style meta for iOS standalone
- [x] Runtime caching strategy:
  - App shell + static assets → precached
  - Property images → `CacheFirst`, 30-day expiry, capped entry count
  - `/api/properties*` → `NetworkFirst` with a short timeout, so viewed listings survive offline
  - **Never cache** `/api/auth/*` or `/api/admin/*` — auth responses must not be served from a cache
- [x] `app/offline/page.tsx` — offline fallback
- [x] `components/install-prompt.tsx` — captures `beforeinstallprompt`, shows a
      dismissible install button; dismissal remembered in `localStorage`
- [x] Online/offline detection: writes (enquiry, OTP) show a clear offline state
      instead of failing silently

**Also fixed here (pre-existing mobile bugs the PWA exposed):** the header now
paints a background on mobile so `viewport-fit=cover` cannot let content show
through behind the status bar; OTP slots raised from 32px to 48×42px and inputs
to 16px minimum, so taps land and iOS does not zoom on focus.

**Out of scope here:** offline write queue and push notifications — both are v2
(see Phase 12). Do not start them.

**Verify:**
- [ ] Chrome DevTools → Application → Manifest: no errors; installable
- [ ] Install on an actual Android/iOS device from the deployed URL
- [ ] Launch from home screen → standalone, **no browser chrome**
- [ ] Airplane mode → previously viewed listings still browse; offline page on a cold route
- [ ] Safe areas correct on a notched device — bottom nav clears the home indicator
- [ ] Lighthouse PWA audit passes
- [ ] Log out, go offline, confirm no cached authenticated response is served

> **Commit Checkpoint 7.5** — `feat(pwa): installable app with offline browsing support`

---

## Phase 8 — README & Demo Polish
**Goal:** the framing that turns a working app into an interview asset.
**Est: 45 min**

- [x] `README.md`:
  - [x] One-paragraph what + live link · **screenshots: placeholders in place, capture pending**
  - "Install as an app" instructions for Android and iOS
  - Stack table and **why each choice** (one line each)
  - Local setup: clone → `.env` → `db:reset` → `db:seed` → `dev` (test these steps from scratch)
  - Architecture sketch + data model
  - **"Deliberately out of scope"** table with reasons — cut scope is evidence of judgment
  - **"What I'd build next"** — the v2 roadmap below, plus payments, maps, notifications, SEO/CWV work, Docker, CI
  - A short **"How I work"** note: backend developer with applied frontend; UI composed from shadcn/ui so the time went into SQL, auth, and service layering
  - Honest note on test scope
- [x] Favicon + page titles across all routes
- [x] Final pass: 404 page, no console errors, no `console.log` left in client code
- [ ] Lighthouse run on the listing page (Performance + PWA); record both in the README

**Verify:** follow your own README on a clean clone and confirm it actually runs

> **Commit Checkpoint 8** — `docs: add README with architecture, setup, and scope notes`

---

## v2 — after the MVP ships, before showcasing

Planned, not cancelled. Build only once Phases 0–8 are deployed and green.

### Phase 9 — Analytics Dashboard (~2.5 hrs)
- [ ] `property_views` table (property_id, viewed_at, session hash — no raw IPs)
- [ ] Admin overview: enquiries over time, top properties by views and by
      enquiries, conversion rate (views → enquiries), breakdown by city/university
- [ ] Charts via `recharts` (shadcn `Chart` wrapper), theme-aware
- [ ] All aggregation in **SQL** — `GROUP BY`, `date_trunc`, window functions.
      This is the point: it's a query-design showcase, not a charting exercise

### Phase 10 — Multi-Admin + Policy-Based Access Control (~2.5 hrs)
- [ ] Multiple admin accounts; invite flow
- [ ] Roles: `super_admin` · `admin` · `moderator`
- [ ] `lib/authz.ts` — a central `can(user, action, resource)` policy function.
      Permission checks read as `can(user, 'approve', property)` everywhere; no
      role strings scattered through handlers
- [ ] Audit log: who changed what, when
- [ ] UI reflects permissions, and **every handler re-checks** — the UI is never the boundary

### Phase 11 — Property Owner Submission & Approval Workflow (~3.5 hrs)
- [ ] `owners` table + owner signup (reuse the OTP flow — the payoff for building it well)
- [ ] Owner dashboard: submit a property, see status, edit while pending
- [ ] `properties` gains `status` (`draft` → `pending` → `approved` / `rejected`),
      `owner_id`, `rejection_reason`, `reviewed_by`, `reviewed_at`
- [ ] Admin review queue: approve / reject with a reason
- [ ] **Only `approved` properties are visible to students** — enforced in the
      query layer, not in the UI
- [ ] State transitions guarded in a service (no arbitrary status jumps)

### Phase 12 — Push Notifications & Offline Writes (~3 hrs)
- [ ] Web Push (VAPID) — notify a student when their enquiry is marked contacted
- [ ] Notification permission requested **contextually**, never on first load
- [ ] Offline enquiry queue: IndexedDB + Background Sync, with an
      idempotency key so a flushed queue cannot double-submit
- [ ] iOS fallback — Background Sync is unsupported there; flush on next app open
- [ ] Admin notified of new enquiries

### Still cut, even for v2
payments · Google Maps · CRM integrations · SMS · i18n

Each remains a README line and an interview answer, not code.

---

## Demo script (2 minutes)

1. Live URL → listing loads fast → search "London", drag price → results update, URL is shareable
2. Filter by university → AcaDomo's actual core use case
3. Open a property → detail page → show the same page at 375px
4. Submit an enquiry → confirmation
5. `/admin` → log in → the enquiry is there → mark contacted
6. Close: *"Single Next.js deployable, raw SQL on Postgres, server-side filtering, JWT in an httpOnly cookie. I cut payments, maps, and student accounts on purpose — they're integration work, not proof I can build the vertical slice."*
