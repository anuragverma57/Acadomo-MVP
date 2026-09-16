# PRD — AcaDomo-Style Student Accommodation Platform (MVP Showcase)

**Author:** Anurag Verma
**Purpose:** Demonstrate full-stack ownership (UI → Backend → DB → API) to AcaDomo, targeting their Full Stack Developer JD
**Build window:** ~15–17 focused hours (MVP) + ~11 hours (v2, before showcasing)
**Status:** Approved — build plan in `phases.md`, working rules in `CLAUDE.md`
**Revision:** v4 — PWA added; positioning corrected, student accounts + dark mode in scope, v2 roadmap defined

---

## 1. Problem & Goal

AcaDomo needs a developer who can independently take a business requirement through the full stack. This MVP demonstrates exactly that — one person carrying Business Requirement → UI → Backend → Database → API → Testing → Deployment.

**Positioning — this drives every build decision.** Anurag is a **backend developer with applied frontend skills**, and presents himself that way in interview. He is not claiming to be a frontend specialist, so the frontend is composed from libraries (shadcn/ui, next-themes, react-hook-form) exactly as a competent applied-frontend dev would do in real work. The engineering time goes into SQL, auth, validation, and service layering — the areas actually being claimed. Using a component library well is a judgment signal, not a weakness; hand-rolling a data table to prove an unclaimed skill would be the weakness.

**Success criteria is not "feature completeness."** It's: a stranger opens the deployed link, completes the core loop in under 60 seconds, sees a clean responsive UI in either theme — and a reviewer who opens the repo immediately finds a real, layered backend.

---

## 2. In Scope (build today)

### Core user loop (this is the entire demo)

1. Student lands on a property listing page (grid of accommodation cards: photo, city, price, room type).
2. Student searches by keyword and filters by **city**, **university**, **price range**, and **room type** — all **server-side in SQL**, not client-side array filtering. This is the single clearest backend-competence signal in the build.
3. Student clicks a property → sees a detail page (photos, description, amenities, price, "Enquire" button).
4. Student submits an enquiry form (name, email, phone, message) → stored in DB, confirmation shown.
5. Student optionally **signs up with an email OTP** (passwordless) → enquiries prefill and attach to their account → "My Enquiries" page. Enquiry stays public; signing in is an enhancement, never a gate.
6. Admin (seeded account) logs in → sees a table of enquiries and can mark them "contacted."
7. Light/dark/system theme toggle throughout.
8. The whole thing **installs to a phone home screen** and runs standalone — one codebase, no separate mobile build.

### Backend

- REST API via Next.js Route Handlers — the Node.js backend, kept in one deployable unit.
- PostgreSQL accessed with **raw parameterized SQL via `pg`** — no ORM. The JD names "database design and queries"; visible SQL is the point.
- JWT in httpOnly cookies across **two session realms** (admin, student) carrying a `realm` claim — a student token can never satisfy an admin check. A `role` column demonstrates role-based access, named in the JD.
- **Passwordless student auth via email OTP** (Resend): codes generated with `crypto.randomInt`, stored bcrypt-hashed, 10-minute expiry enforced in SQL, 5-attempt cap, single-use, send-throttled per email and per IP, with identical responses for known and unknown emails. This is the deepest backend work in the MVP and is treated as such.
- **Layered backend** (`CLAUDE.md` §2a): route handlers are thin controllers, business logic sits in `lib/services/`, all SQL in `lib/db/queries.ts`. No SQL in a handler, ever.
- Zod validation shared between client and server; server-side validation is mandatory on every request body.
- Seed script with 15 realistic properties across 5 cities and 6 universities, varied prices and room types.

### Frontend

- Next.js (App Router) + React — matches JD exactly.
- Tailwind + **shadcn/ui used liberally** (Table, Dialog, Sheet, Form, Tabs, Select, InputOTP, Sonner). Deliberate: see Positioning above.
- **Dark mode** via `next-themes` — light/dark/system, no flash, semantic tokens throughout. Set up in Phase 0 so it stays nearly free rather than becoming an 8-screen retrofit.
- **Installable PWA** — manifest, service worker, maskable icons, install prompt, offline browsing of cached listings. App-shell conventions (bottom tab nav on mobile, safe-area insets, ≥44px touch targets, no hover-only interactions) are adopted from Phase 0; the service-worker plumbing lands at Phase 7.5 after deploy. Offline *writes* are deliberately v2.
- Pages: Listing (search + filters), Property Detail, Admin login, Admin dashboard (enquiries table).
- Filter state lives in **URL search params**, so results are shareable and the back button works.
- Fully responsive (mobile breakpoint at minimum — JD explicitly lists this).
- Clean, minimal visual design: one consistent type scale, one accent color, generous whitespace. No template-looking Bootstrap defaults.

### Non-functional (kept minimal but real)

- HTTPS on deployment (Vercel/Railway/Render handle this by default).
- No secrets in client code or repo (`.env`, not committed).
- The enquiry POST is the only public write endpoint: honeypot field + in-memory IP throttle.
- Admin passwords bcrypt-hashed (cost 12), never logged or returned.
- Every admin API handler verifies the session itself — middleware is UX, the handler check is the security boundary.
- Login returns an identical generic error for wrong email and wrong password (no user enumeration).
- A thin test suite over validation, the filter query builder, and auth helpers — the JD lists Testing in its pipeline, and these are the security-relevant paths.

---

## 3. Explicitly Out of Scope (not today, not this MVP)

Cutting these is what makes "today" possible. Do not let scope creep back in mid-build.

| Cut                                            | Why                                                                                          |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Payment gateway integration                    | Complex, low demo value, easy to talk about in interview instead of build                    |
| Real user accounts / signup for students       | Enquiry flow doesn't need login; adds auth surface area for no payoff                        |
| Google Maps / location APIs                    | University + city dropdowns cover the discovery use case; map rendering adds an API key and zero demo value |
| Offline enquiry submission (write queue)       | **v2** — needs IndexedDB, Background Sync (unsupported on iOS Safari) and duplicate-submission handling; cached *browsing* is in the MVP |
| Push notifications                             | **v2** — depends on the PWA shell shipping first |
| Analytics dashboard                            | **v2, before showcasing** — a SQL aggregation showcase, deserves its own phase rather than a rushed chart |
| Multi-admin + policy-based access control      | **v2, before showcasing** — needs a real `can(user, action, resource)` policy layer and an audit log |
| Property-owner submission → approval workflow  | **v2, before showcasing** — the highest-value feature after the MVP; reuses the OTP flow for owner accounts |
| CRM/lead integrations                          | Zero interview value in a 1-day MVP                                                          |
| Multi-role admin (property managers, etc.)     | One hardcoded admin is enough to prove the pattern                                           |
| Property creation UI for admin (CRUD write UI) | Seed data is enough; read + status-update is enough to prove backend competence              |
| Notifications/email sending                    | Adds infra (SMTP/SES) for a feature nobody will test live                                    |
| Deep SEO / Core Web Vitals tuning              | Per-property `generateMetadata` + OG tags are included as a cheap signal; systematic CWV work is a "next steps" item |
| Image upload                                   | Use static/placeholder image URLs in seed data instead of building upload+storage            |
| Component and E2E tests                        | Unit tests cover the security-relevant logic; broader suites are stated as a known trade-off in the README |

---

## 4. Architecture (deliberately boring)

**Single Next.js app, monolithic, no microservices, no message queues, no separate services.**

```
Next.js app (App Router, TypeScript)
 ├── /app            pages + layouts (Server Components by default)
 ├── /app/api        route handlers — the Node.js backend
 ├── /components     ui/ (shadcn primitives) + hand-built feature components
 ├── /lib/db         client.ts (pg Pool) + queries.ts (all SQL lives here)
 ├── /lib            auth.ts (bcrypt + jose JWT), validation.ts (Zod)
 ├── /db             schema.sql, seed.ts
 ├── /public         PWA manifest icons (192 / 512 / maskable / apple-touch)
 └── PostgreSQL      local for dev · Neon free tier in production
```

Ships as an **installable PWA** — the same deployable serves the web app and the
home-screen app, so there is no separate mobile build to maintain.

Pages query the database directly through `lib/db/queries.ts`. API routes exist
for client-side calls and to demonstrate REST design — a Server Component
fetching its own API route would be a pointless network hop.

Rationale: the JD's stated stack is React/Next.js + Node.js + Postgres. A single Next.js deployable that uses API routes as the backend **is** that stack, deploys as one unit, and removes an entire class of "how do I deploy two things and connect them" risk on a one-day timeline. Microservices, queues, or a separate Express server add deployment risk for zero demo value today.

**Data model (minimal):**

- `properties`: id, title, slug, city, country, **university**, price_per_week (integer minor units), currency, room_type, description, amenities, image_url, created_at
- `enquiries`: id, property_id (FK, ON DELETE CASCADE), name, email, phone, message, status (`new`/`contacted`, CHECK), created_at
- `admin_users`: id, email (UNIQUE), password_hash, **role**, created_at
- `students`: id, email (UNIQUE), name, email_verified_at, created_at
- `otp_codes`: id, email, **code_hash**, expires_at, attempts, consumed_at, created_at

`enquiries` carries a nullable `student_id` FK, set when a signed-in student submits.

Indexed on `city`, `university`, `price_per_week`, `(status, created_at DESC)`, and `(email, expires_at)` on `otp_codes`.
Money is stored as an integer in minor units — never a float.

---

## 5. What This MVP Proves (and what it doesn't)

**Proves:** you can independently build a full vertical slice — UI → API → DB → auth → validation → testing → deployment — in your own hands, not just describe it. It covers the JD's numbered build items **1–9**: listing system, search and advanced filters, university/city discovery, property detail pages, student enquiry system, lead management, admin dashboard, and user accounts. It also shows security judgment (hashed expiring single-use OTPs, session realm separation, no enumeration, parameterized SQL throughout), architectural judgment (layered backend in a single deployable), and delivery judgment (one codebase serving web and installable mobile, rather than a second stack).

**Does not prove:** production-scale frontend design work (not claimed — see Positioning), payment integration, systematic SEO/CWV work, or third-party integrations beyond transactional email. Say that plainly in an interview rather than implying the MVP covers more than it does — the cut list is itself evidence of judgment.

---

## 6. Demo Script (for whoever reviews it)

1. Open deployed link → listing loads fast → search + drag price → results update, URL is shareable.
2. Filter by university → AcaDomo's actual core discovery use case.
3. Click into a property → detail page, clean layout → show the same page at 375px.
4. **Open the installed app from a phone home screen** — standalone, no browser chrome, bottom tab navigation.
5. Submit an enquiry → confirmation shown.
6. Log into `/admin` → enquiry appears in the table → mark contacted.
7. One sentence on stack, one on what was deliberately cut and why (judgment, not just output).

---

## 7. Build Artifacts

| File | Purpose |
| ---- | ------- |
| `phases.md` | Phase-by-phase build plan (0–8 MVP, 9–11 v2) with verification steps and commit checkpoints |
| `CLAUDE.md` | Working rules: stack decisions, security requirements, code conventions, scope discipline |
