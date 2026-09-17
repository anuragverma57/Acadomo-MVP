# CLAUDE.md — AcaDomo MVP Project Rules

Rules for working in this repo. Read before making changes.

---

## 0. Prime directive

**Simple, open-shut, graceful.** This is a portfolio MVP built to prove full-stack
ownership to AcaDomo — not a product. Every decision optimizes for:

1. A stranger can run it and demo the core loop in under 60 seconds.
2. A reviewer reading the code finds it obvious, not clever.
3. Security and architecture are real, not theatre — but scoped, not exhaustive.

When in doubt, choose the boring option and write one line explaining why.

### Who is presenting this

Anurag is a **backend developer with applied frontend skills**, and presents
himself that way. He is not claiming to be a frontend specialist.

This has a direct consequence for how we build:

- **Use frontend libraries aggressively.** shadcn/ui, next-themes, react-hook-form,
  sonner, lucide-react — reach for them first. Reusing a well-built component is
  what a competent applied-frontend dev does in real work; hand-rolling a Table
  or a Dialog to prove a skill he isn't claiming wastes hours that belong in the
  backend, which is what he *is* claiming.
- **Spend the saved time on backend depth** — SQL, auth, validation, data
  modelling, service structure. That is where this project's signal lives.
- **The backend must be structurally obvious.** See §2a.
- **This ships as an installable PWA.** Every screen is built app-first from
  Phase 0. See §5a — these conventions cost nothing if adopted early and are
  expensive to retrofit.

---

## 1. Git — hard rule

**Claude must NEVER run git commands that modify state.**

Forbidden: `git add`, `git commit`, `git push`, `git merge`, `git rebase`,
`git reset`, `git checkout -b`, `git stash`, `git tag`, `gh pr create`.

Allowed (read-only, only when asked): `git status`, `git diff`, `git log`.

Instead, at the end of each phase Claude outputs a **Commit Checkpoint**:

```
## Commit Checkpoint — Phase N
Files changed: <list>
Suggested message:
  <type>: <subject>
Then run: git add <paths> && git commit && git push
```

The user runs every git command themselves. No exceptions, no "helpfully" staging.

---

## 2. Stack — decided, do not re-litigate

| Layer     | Choice                                    |
|-----------|-------------------------------------------|
| Framework | Next.js (App Router) + TypeScript         |
| UI        | Tailwind CSS + shadcn/ui (used liberally) |
| Backend   | Next.js Route Handlers (`/app/api/*`)     |
| DB        | PostgreSQL via `pg` (node-postgres)       |
| SQL       | Hand-written parameterized SQL — no ORM   |
| Theming   | `next-themes` — light/dark/system          |
| Forms     | `react-hook-form` + `@hookform/resolvers` |
| Toasts    | `sonner`                                   |
| Icons     | `lucide-react`                             |
| Auth      | JWT in httpOnly cookie (`jose`) — two realms: admin + student |
| Email     | Resend (OTP delivery)                      |
| PWA       | `@ducanh2912/next-pwa` (Workbox under the hood) |
| Charts    | `recharts` — theme-aware via CSS tokens    |
| Validation| Zod, shared client + server               |
| Dev DB    | Local Postgres (`postgresql@18`, Homebrew)|
| Prod DB   | Neon free tier                            |
| Deploy    | Vercel                                    |

**Frontend libraries: use them freely.** Anything in the table above, plus any
shadcn/ui component, is pre-approved — just add it. For a *new* library outside
that set, propose it with a one-line justification first.

**Backend dependencies stay minimal.** The backend is the thing being evaluated;
reach for stdlib and hand-written SQL there, not convenience wrappers.

**No ORM, ever, in this repo.** The JD names "database design and queries" —
visible SQL is the point. Raw SQL is a feature, not debt.

### 2a. Backend shape — non-negotiable layering

We use Next.js route handlers rather than a separate Express server (one
deployable, no CORS, no cross-origin cookie handling, SSR retained). The cost is
that a reviewer skimming the repo might read route handlers as frontend-adjacent.
We buy that back with strict layering:

```
app/api/**/route.ts   thin controllers — parse, authorize, call a service, shape the response
lib/services/*.ts     business logic — the actual rules live here
lib/db/queries.ts     all SQL, parameterized, snake_case → camelCase at this boundary
```

Rules:
- **A route handler never contains SQL.** Not once, not "just this one".
- **A route handler holds no business logic** beyond validate → authorize →
  delegate → respond. If it grows a second `if` about domain rules, that logic
  belongs in a service.
- **Services never touch `req`/`res`.** They take plain arguments and return
  plain data, so they stay testable and portable.

This keeps the backend legible as a backend, and makes "extract an Express API"
a mechanical move rather than a rewrite. That is a deliberate, defensible
architecture decision — be ready to say so.

---

## 3. Security — non-negotiable, even at MVP scope

These are cheap and their absence is what a reviewer notices:

- **SQL:** every query parameterized (`$1, $2`). String-interpolating a value
  into SQL is a bug, always. Column/table names are never dynamic from input —
  if sorting by a user-supplied field, map it through an allowlist object.
- **Passwords:** bcrypt, cost 12. Never logged, never returned in any response,
  never selected unless the query is specifically authenticating.
- **Sessions:** JWT in an `httpOnly`, `secure` (in prod), `sameSite=lax` cookie.
  Never in `localStorage`. Short expiry (2h is fine).
- **Authorization:** every `/api/admin/*` handler verifies the session itself.
  Never rely on the UI hiding a button, and never rely on middleware alone.
- **Validation:** Zod on the server for every request body, without exception.
  Client-side validation is UX; server-side validation is security. Both.
- **Secrets:** only in `.env.local` (gitignored). Never in code, never in a
  committed file, never in anything sent to the client. Only `NEXT_PUBLIC_*`
  vars reach the browser — do not put a secret behind that prefix.
- **Public write endpoints:** enquiry POST, OTP request, and OTP verify. Each
  gets validation plus throttling; the enquiry form also gets a honeypot field.
- **OTP rules — all of these, or the flow is a liability:**
  - Codes generated with `crypto.randomInt`, never `Math.random`.
  - Codes **stored hashed** (bcrypt), never in plaintext — treat them as passwords.
  - 10-minute expiry, enforced in SQL, not just in JS.
  - Max 5 verify attempts per code, then the code is burned.
  - Codes are single-use: marked consumed inside the same transaction that
    creates the session.
  - Send throttled per email **and** per IP (3/hour) so this can't be a spam relay.
  - Requesting a code returns the **same response whether or not the email
    exists** — no account enumeration.
  - The code is never returned in an API response or logged in production.
- **Two session realms.** Admin and student sessions use different cookie names
  and carry a `realm` claim. A student token must never satisfy an admin check —
  verify the realm explicitly, not just the signature.
- **Errors:** client sees a generic message; details go to `console.error` on
  the server. Never leak stack traces, SQL, or driver errors to a response.

If a task would break one of these, stop and say so rather than doing it.

---

## 4. Code conventions

- **TypeScript everywhere.** No `any` — use `unknown` and narrow it.
- **Server Components by default.** `"use client"` only when a component needs
  state, effects, or event handlers. Filters and forms are client; pages are not.
- **Data fetching:** pages query the DB directly through `lib/db/queries.ts`.
  Do not `fetch()` your own API routes from a Server Component — that's an
  extra network hop for nothing. API routes exist for client-side calls and to
  demonstrate REST design.
- **File layout:**
  ```
  app/            routes, layouts, pages
  app/api/        route handlers
  components/     ui/ (shadcn primitives) + feature components
  lib/db/         client.ts, queries.ts
  lib/            auth.ts, validation.ts
  db/             schema.sql, seed.ts
  ```
- **Naming:** files kebab-case, components PascalCase, DB columns snake_case,
  TS properties camelCase. Map at the query boundary in `queries.ts`, so the
  rest of the app never sees snake_case.
- **Comments:** explain *why*, never *what*. Delete a comment that restates code.
- **Formatting:** Prettier defaults. Don't hand-format.

---

## 5. UI rules

- **Use shadcn/ui components wherever one fits.** Table, Dialog, Sheet, Form,
  Tabs, Select, Card, Badge, Skeleton, Dropdown, Sonner. Do not hand-roll
  something the library already does well. Composition and layout are our job;
  the primitives are not.
- One accent color, one type scale, generous whitespace. No gradients, no
  shadows-on-everything, no template look.
- **Dark mode is a first-class requirement.** `next-themes` with `class`
  strategy, light/dark/system toggle, no flash on load. Every new surface must
  be checked in both themes before it counts as done — a hardcoded `bg-white`
  or `text-black` anywhere is a bug. Use semantic tokens (`bg-background`,
  `text-foreground`, `bg-muted`) exclusively.
- **Filter controls read through `useOptimistic`, never raw `searchParams`.**
  `router.push` inside a transition leaves `searchParams` stale until the server
  responds, so a control bound directly to the URL shows the OLD value for the
  whole round-trip and then snaps — which reads as a glitch. See
  `hooks/use-optimistic-params.ts` and `hooks/use-filter-params.ts`.
- **Mobile first.** Every page checked at 375px before it's called done.
- Every interactive element reachable by keyboard with a visible focus ring.
- Every list has a real empty state and a loading state. "No results" is a
  designed state, not a blank page.
- Images: always `next/image` with explicit `alt`.

---

### 5a. PWA / app-shell conventions — apply from Phase 0

This installs to a home screen and must not feel like a website in a browser
frame. These rules are free if followed from the start and costly to retrofit,
so they apply to **every screen from Phase 0 onward**, not just at Phase 7.5.

- **Navigation:** fixed **bottom tab bar on mobile** (`md:hidden`), header nav on
  desktop (`hidden md:flex`). Native apps put navigation at the thumb.
- **Safe areas:** every fixed element uses `env(safe-area-inset-*)` —
  `pb-[env(safe-area-inset-bottom)]` on the bottom nav, inset-top on sticky
  headers. Without this the nav sits under the iPhone home indicator when installed.
- **No hover-only interactions, ever.** If something is reachable only on hover,
  it does not exist on touch. This is the single most painful thing to fix late.
- **Touch targets ≥ 44×44px.** Applies to icon buttons, table row actions, and
  close buttons especially.
- **`Sheet` over `Dialog` on mobile** — bottom sheets are the native pattern.
- **`overscroll-behavior: none`** on scroll containers; suppress the rubber-band
  bounce that instantly reads as "webpage".
- **No browser-chrome dependence.** Never rely on the URL bar or the browser back
  button — in standalone mode they are not there. Every screen deeper than a tab
  root needs its own in-app back affordance.
- **Skeletons, not spinners,** for content loads. Layout must not shift when data
  arrives.
- **`theme-color` meta follows the active theme** so the status bar matches in
  both light and dark.

**Offline scope is deliberately bounded:** cached browsing yes, offline writes no.
Enquiry and OTP submission require a connection and must show a clear offline
state rather than failing silently. An offline write queue is a v2 item — it
needs IndexedDB, Background Sync (unsupported on iOS Safari), and
duplicate-submission handling. Do not start it mid-MVP.

---

## 6. Scope discipline

Out of scope. Do not build, do not suggest building mid-phase:

payments · Google Maps · CRM integrations · SMS · image upload ·
property CRUD write UI · multi-tenant/partner portals · i18n

**In scope and confirmed:** student signup via email OTP, dark mode,
installable PWA with cached browsing.

**Deferred to v2 — planned, not cancelled** (see `phases.md`; to be built before
showcasing): analytics dashboard, multiple admin accounts with policy-based
access control, the property-owner submission → admin approval → published
listing workflow, push notifications, and an offline enquiry queue.

These belong in the README's "What I'd build next" section, which is itself a
deliverable — cut scope is evidence of judgment.

**If a phase's work is done, stop.** Do not start the next phase, do not add
polish that wasn't asked for. Report what's done and wait.

---

## 7. Testing

Vitest, and deliberately thin. Cover exactly:

- Zod validation schemas: valid input passes, bad email/phone/missing fields fail.
- The property filter query builder: filters compose, and no input path can
  produce unparameterized SQL.
- Password hash + verify round-trip.

No component tests, no E2E, no coverage target. The point is to show tests
exist and test the security-relevant logic — the JD lists Testing in its
pipeline. State the limited scope plainly in the README.

---

## 8. Working agreement

- **Phases are sequential.** Finish and verify a phase before starting the next.
  `phases.md` is the source of truth for what's next.
- **Verify before claiming done.** Run the build, hit the endpoint, look at the
  page. If something wasn't verified, say so rather than implying it works.
- **Report failures plainly.** A failing test or a broken build gets reported
  with its output, not worked around silently.
- **Ask when two readings of a request give materially different builds.**
  Otherwise make the call, state the assumption, and continue.
- **Never fabricate.** No invented commands, env vars, or file paths. If unsure
  whether something exists, check it.

---

### 8a. Known environment notes

- **`npm run typecheck` alone reports `Cannot find name 'LayoutProps'`.** That
  type is generated by Next 16 into `.next/types` during a build. Run
  `npm run build` first (or after any `.next` wipe); the build's own type check
  is the authoritative one. Not a bug — do not "fix" it by hand-declaring the type.
- **Port 3000 is often occupied** by another local app. This project's dev server
  runs on **3100** (`npm run dev -- --port 3100`). Two servers sharing port 3000
  across IPv4/IPv6 silently serve the wrong app to `curl`.
- **Supabase Postgres:** use the **transaction pooler** (port 6543), not the
  direct connection — serverless opens many short-lived connections. Supabase
  presents a cert from its own root CA (bundled at `db/certs/supabase-ca.crt`,
  valid to 2031), so TLS is pinned to that CA rather than verification being
  disabled. `npm run db:check` prints the real socket state.
- **`pg_stat_ssl` lies through a pooler.** It reports the pooler's own backend
  connection, not the client link, so it reads `ssl=false` on a TLSv1.3
  connection. Read `client.connection.stream.encrypted/authorized` instead.
- **Route interception lives in `proxy.ts`, not `middleware.ts`.** Next 16
  renamed the convention; the export is `export default function proxy`.
- **Never read `window` in a `useState` initialiser.** The server has no
  `window`, so the client renders something different and hydration breaks.
  Start from the server's value and correct in an effect.
- **No PWA plugin.** The service worker is hand-written at `public/sw.js`
  (next-pwa needs webpack; this app uses Turbopack). Bump `CACHE_VERSION` when
  caching rules change. Emergency off switch: `NEXT_PUBLIC_DISABLE_SW=1`.
- **Never cache authenticated responses.** `shouldBypass()` in `sw.js` is the
  boundary, and `tests/service-worker.test.ts` guards it.
- **SVG `stop-color` does not resolve `var(--token)`.** A gradient stop written
  as `stopColor="var(--chart-2)"` silently falls back to transparent black in
  Chrome and Safari — the fill vanishes with no error. Set it through CSS
  instead (`className="[stop-color:var(--chart-2)]"`), where `var()` resolves.
- **Charts are `recharts`, coloured from CSS custom properties.** A theme change
  repaints them with no JS: no theme listener, no re-render, no flash. Chart
  tokens `--chart-1…5` are defined in both theme blocks in `app/globals.css`.
- **A headless screenshot with `captureBeyondViewport` can rasterize before an
  SVG paints**, producing blank charts that are actually fine in the browser.
  Verify a chart through the DOM (path `d` attributes, computed fills) before
  believing a screenshot that shows it empty.

- **shadcn style is `base-nova`, built on Base UI — not Radix.** Components take
  a `render` prop, not `asChild`. `DropdownMenuTrigger` renders its own button,
  so style it with `buttonVariants(...)` rather than nesting a `<Button>`.

---

## 9. Definition of done (per phase)

A phase is done when:

- [ ] `npm run build` passes with no type errors
- [ ] The phase's feature works when actually exercised in the browser or via curl
- [ ] Mobile view checked at 375px (for any phase touching UI)
- [ ] Both light and dark themes checked
- [ ] No hover-only interaction introduced; touch targets ≥ 44px
- [ ] No secret, key, or password added to a tracked file
- [ ] `phases.md` checkboxes ticked
- [ ] Commit Checkpoint printed for the user to run

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
