# WORK.md — Recruitment Portal: fixes and improvements

Next.js 14 (App Router) + Firestore + better-auth recruitment portal. Applicants sign in,
pick up to two departments, answer a questionnaire; admins review, filter, shortlist and
email them.

Everything below was verified by running the app against a real (emulated) Firestore, not
just by reading the diff. The verification commands are at the end.

---

## 1. The response-storage bug (the main one)

### 1a. Applicants' answers were collected and then silently thrown away

**Symptom:** every applicant answered "Why do you want to join Organization Name?" and picked
a Gender, and neither ever reached the database. Nobody would notice from the UI — the form
submits successfully, the toast says "Application submitted", and the row appears in the
admin table. The answers are simply not in it.

**Root cause** — `components/FormComp.jsx`. The submitted payload was assembled by hand:

```js
const basicDetails = {
  Name: values.Name,
  RegistrationNumber: values.RegistrationNumber,
  Email: values.Email,
  Phone: values.Phone,
  "Year of Study": values["Year of Study"],
};
```

Three separate mismatches between what the form rendered and what this object carried:

| Field | Rendered in the form? | In the stored payload? |
| --- | --- | --- |
| `Why do you want to join…?` | yes (in "About You") | **no** |
| `Gender` | yes (a `<select>`) | **no** |
| `Year of Study` | **no input existed** | yes (always `undefined`) |

The motivation question was doubly missed: `renderDepartmentQuestions` explicitly *filtered it
out* of each department's question list (because it is asked once globally rather than per
department), and the per-department `Questions` object was built only from that filtered list.
So it fell through both paths. `Gender` was not even in the zod schema, so it was never
validated either.

**Fix:** the payload now includes every rendered field, and a real "Year of study" select was
added so the field that was being stored is actually collected. The server route already
spreads unknown fields into the document (`...formFields`), so no server change was needed
for this part.

**Why it matters:** for a recruitment portal, the motivation answer is one of the main things
a reviewer reads. Losing it is silent, permanent data loss — the applicant sees success, the
reviewer sees a blank they never knew existed.

### 1b. Duplicate / over-limit applications from a race condition

**Symptom:** the same applicant could end up with two rows for the same department, or more
than the advertised maximum of two applications.

**Root cause** — `app/api/submit-form/route.js` used check-then-write:

```js
const existingSubmissions = await collection.where("Email", "==", userEmail).get(); // read
if (alreadySubmittedDept) return 400;                                              // check
if (existingSubmissions.size >= 2) return 400;                                     // check
await collection.add({ ... });                                                     // write
```

The client submits both chosen departments **concurrently** (`Promise.allSettled` in
`FormComp.handleSubmit`), and a double-click or a retried request produces concurrent
identical requests. Two requests that both read before either writes each see the pre-write
state, both pass the checks, and both insert. Firestore has no unique constraint to catch it.

**Fix:** the read, the checks and the insert now happen inside one `db.runTransaction(...)`.
Firestore aborts and retries a transaction whose read set changed, so the losing request
re-reads, sees the winner's row, and rejects correctly.

**Proved with a before/after run against the emulator** (two concurrent identical requests):

```
BEFORE (read, check, then write):
  request outcomes : accepted | accepted
  rows now stored  : 2  (should be 1)
AFTER  (check + write in one transaction):
  request outcomes : rejected: duplicate | accepted
  rows now stored  : 1  (should be 1)
```

### 1c. The payload was validated in the browser only, and stored unfiltered

Every rule the application form enforces — required name, phone format, gender, year of study,
the motivation answer — lived in a zod schema in `components/FormComp.jsx`, which runs in the
browser. The endpoint is reachable with `curl`, so none of it was actually enforced. The only
server-side check was on `RegistrationNumber`, and it was written as
`if (RegistrationNumber && !regex.test(...))` — a request that omitted the field entirely
skipped the check.

Worse, the document was assembled as `{ ...formFields, Department, Questions, ... }`, spreading
whatever keys the request happened to contain straight into Firestore. Arbitrary fields — of
arbitrary size — could be written into the applications collection.

`lib/validateApplication.js` now re-checks every rule on the server and **returns the document
to store**, built from an allowlist, so unknown keys are dropped rather than persisted. Bounds
(`FIELD_LIMITS`) cap answer and name lengths and the number of answers. `Email` is always taken
from the session, never from the body. Gender and year are checked against the same
`GENDER_OPTIONS` / `YEAR_OPTIONS` the form's `<select>`s render from, so the accepted values and
the offered values cannot drift.

Verified against the running API — 12 malformed payloads each rejected with the right message
(missing name, 150-character name, missing/badly formatted registration number, 5-digit phone,
`Gender: "Robot"`, `Year of Study: "7th Year"`, missing motivation, 6,000-character answer,
`Pref: "99"`, 40 answers, a non-string answer) — and for a request carrying
`shortlisted: true`, `adminNote` and `evil` alongside valid data, the stored document contained
only the allowlisted keys, with `shortlisted` still `false`. A submission with someone else's
`Email` in the body was filed under the session's address. The real form still submits both
applications correctly end to end.

### 1d. The route stored whatever department string it was handed

`Department` was never checked against the real catalogue — it was destructured straight out of
the request body and written to Firestore. A crafted request (the form is not the only way to
reach the endpoint) could create applications for departments that do not exist, and those rows
then appear in the admin table, populate the department filter, and land in the CSV export as
genuine applications. `Questions` was equally untrusted: an array or a string would be stored
as-is and break the admin table's rendering and the CSV flattening, which both assume an
object.

The route now rejects a `Department` that is not in `DEPARTMENT_NAMES` (derived from the same
`reviews` catalogue the UI renders, so the two cannot drift), and rejects a `Questions` value
that is not a plain object. Verified: bogus department → `400`, `Questions` as an array →
`400`, valid submission → `200`, and nothing from the rejected requests reached the database.

### 1e. Two smaller storage-shape fixes in the same route

- **`shortlisted` was never initialised.** New documents had no `shortlisted` field at all,
  so the admin "Shortlisted: No" filter (`String(row.shortlisted) === "false"`) matched
  nothing — `undefined` stringifies to `"undefined"`. New rows are now written with
  `shortlisted: false`.
- **`Pref` was never written.** The admin table and the CSV export both have a "Preference"
  column keyed on `Pref`, and nothing ever populated it — the column was empty for every
  applicant. The client now sends `Pref` as the applicant's own ordering (1st or 2nd choice).
  This only means anything because of the related fix in
  `app/(pages)/join/[...joinIds]/page.jsx`: that page resolved departments with
  `reviews.filter(d => ids.includes(d.id))`, which returns them in **catalogue** order rather
  than the order the applicant picked. It now maps over the URL ids, preserving choice order.

---

## 2. Security

### 2a. Firestore was world-readable and world-writable

`firestore.rules` was:

```
match /{document=**} { allow read, write: if true; }
```

Every applicant's name, email, phone number, registration number and answers could be read —
and deleted — by anyone holding the public `NEXT_PUBLIC_FIREBASE_*` web config, which is by
design shipped to every visitor's browser. No sign-in needed, and the Next.js API would never
see the request.

This app never touches Firestore from the browser: every access goes through a route handler
using the Firebase Admin SDK, which bypasses rules entirely. So the rules now deny all client
access (`if false`), which costs the app nothing.

### 2b. The admin page leaked every applicant's data to anonymous visitors

`app/(pages)/admin/page.jsx` is a server component. It fetched **all** applicant documents and
passed them as a prop to `AdminContent`, whose `role === "admin"` check runs *in the browser*.
By then the full dataset had already been serialised into the page payload and sent to
whoever requested `/admin` — signed in or not. The check hid the table; it did not withhold
the data. Anyone could read it from view-source.

The gate now runs on the server **before** the Firestore read: non-admins get redirected or
refused and no query is issued. `AdminContent` keeps its client check as defence in depth.

### 2c. Three API routes had no authentication at all

| Route | What anyone on the internet could do |
| --- | --- |
| `GET /api/admin/applicants` | download every applicant's full record |
| `PATCH /api/shortlist/[id]` | shortlist or un-shortlist any applicant |
| `POST /api/send-email` | send arbitrary HTML email to arbitrary addresses **through the organisation's Gmail account** |

The last one is the worst: an open relay attached to a real mailbox, usable for phishing that
genuinely originates from the club's address.

All three now use a shared `lib/adminAuth.js` guard (`getAdminSession` / `adminGuardResponse`)
built on the same `auth.api.getSession` pattern the other routes already used. Verified: 401
when signed out, 200 with data for a real admin.

### 2d. Nothing was rate limited

Sign-in and sign-up accepted requests as fast as the network allowed, so passwords could be
brute-forced against a known address and accounts created in bulk. `/api/submit-form` and
`/api/send-email` were equally open — the mailer sends through a real mailbox, where a runaway
loop costs money and burns the sender's reputation.

`lib/rateLimit.js` adds a Firestore-backed fixed-window limiter. The read and the increment run
in a single transaction, for the same reason the submit route needed one: two concurrent
requests must not both see the same count and slip past. Signed-in callers are keyed by user id
(so quota can't be multiplied by rotating IPs), anonymous ones by the first `x-forwarded-for`
address. Buckets: `auth` 30 per 15 min, `submit` 10/hr, `email` 20/hr, `shortlist` 300/hr,
`read` 120/hr. Blocked requests get `429` with a `Retry-After` header.

Two deliberate choices:

- **It fails open.** If the counter can't be read or written, the request proceeds and the
  error is logged. A limiter outage should not take applications offline mid-recruitment.
- **Only credential-submitting auth paths are limited** (`/sign-in`, `/sign-up`,
  `/forget-password`, `/reset-password`). Session lookups run on every page load and would
  otherwise exhaust the bucket during ordinary browsing.

Counters are swept opportunistically (~2% of calls delete windows older than two days), so the
collection doesn't grow without bound and no cron job is needed.

**A bug this caught, worth recording:** the first version returned the counter value from the
transaction and compared `count > limit`. At the boundary, "I just incremented to the limit"
and "I was blocked at the limit" produce the same number, so the check never fired — the
counter pinned at exactly 30 while requests kept succeeding. The transaction now returns
whether the request was *allowed*, not the count. Verified after the fix: 30 sign-in attempts
pass and the 31st onward return `429` with `Retry-After: 109`; on the per-user `submit` bucket,
exactly 10 attempts pass and the 11th and 12th are blocked.

### 2e. Security response headers

`next.config.mjs` now sets `X-Frame-Options: DENY` (clickjacking), `X-Content-Type-Options:
nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` and a `Permissions-Policy`
denying camera/microphone/geolocation.

### 2f. Reduced attack surface

Deleted `app/api/get-submissions` and `app/api/check-department-submission`: both were
unreferenced by any client code and duplicated `/api/check-applications`. Every extra endpoint
is another one that has to stay auth-correct forever.

---

## 3. Cost and scale on the admin path

`/admin` read **every applicant document, including every answer, on every page load**, then
paginated and filtered them in the browser. Two separate costs: Firestore bills per document
read, so a refresh with 2,000 applicants is 2,000 reads; and the whole dataset — every answer
to every question — was serialised into the page payload and shipped to the browser, where the
table never displays it.

`lib/adminApplicants.js` now separates the two jobs:

- **The table loads a page of 50**, ordered newest-first, with `.select(...)` limited to the
  columns the table renders. `Questions` — by far the largest field — is not fetched for the
  table at all.
- **Counts come from Firestore's count aggregation** (`collection.count().get()`), so the
  header totals describe every applicant without reading a single document.
- **Further pages load on demand** through the existing admin API with a cursor, and the header
  shows "Loaded" against the true total so it is clear the table holds a subset.
- **Export fetches the full records, with answers, only when someone exports.** That meant
  replacing `react-csv`'s `CSVLink` (which needs the data up front) with a button that fetches
  and builds the file. The expensive query now runs when it is actually wanted.

Paging uses the cursor document rather than a `createdAt` value, so two applications submitted
in the same millisecond can't be skipped or repeated at a page boundary. Verified against the
emulator by walking every page: 4 pages of 3, 10 rows total, zero duplicates.

**A constraint worth knowing:** Firestore omits documents that lack the field being ordered on,
so a document written without `createdAt` would silently not appear in the admin table. Every
document this app writes sets it; anything imported by hand must too. This is noted in
`lib/adminApplicants.js`.

**Indexes are now in version control.** `firestore.indexes.json` declares the composite indexes
the filtered and ordered queries need (Email, Department and shortlisted, each paired with
`createdAt`), so a fresh project can be provisioned reproducibly instead of relying on indexes
someone once created by clicking a link in an error message.

## 4. The bulk mailer

`/api/send-email` sent sequentially in a `for` loop with a single `try` around the whole batch,
so **the first failure aborted the run**: recipients before it received their mail, everyone
after silently did not, and the response — a flat "Failed to send emails" — gave no way to tell
which was which. Re-running the batch would then double-mail everyone who had already received
it.

Each send is now attempted independently and the route reports what happened: `200` when all
succeeded, `207` with the per-recipient failure list when some did not, `502` when none did.
The admin UI shows a warning listing the addresses it could not reach instead of a success
toast.

## 5. Tests and CI

There were no tests. `vitest` now covers the two pieces of pure logic where a regression would
be both easy and expensive:

- `tests/validateApplication.test.js` (19 tests) — every rejection rule, plus the three
  properties that matter most: unknown fields are dropped rather than stored, `shortlisted`
  cannot be set by the request, and `Email` always comes from the session.
- `tests/pagination.test.js` (7 tests) — including a regression test for the bug the old pager
  had, where page 1 disappeared once you moved past it.

`.github/workflows/ci.yml` runs `npm test` and `npm run build` on every push and pull request.

## 6. Performance (client)

The codebase contained a family of expensive functions whose results were only ever written to
invisible `data-*` attributes, each recomputed on **every render**:

| File | What ran | When |
| --- | --- | --- |
| `app/page.jsx` | 300,000-iteration `sqrt`/`sin` loop | every render of the landing page |
| `components/FormComp.jsx` | 200,000 regex tests | every render — i.e. **every keystroke** in the application form |
| `app/(pages)/departments/page.jsx` | 100,000-iteration search | every render |
| `components/Card.jsx` | 50,000-iteration `sin` loop | every render, including every hover |
| `components/Footer.jsx` | 40,000-iteration loop | every render |
| `components/AdminContent.jsx` | 80,000-iteration loop | every render |
| `components/DataTable.jsx` | O(rows × 500) nested loop | every render of the admin table |
| `components/AllDepartments.jsx` | 35,000-iteration loop | every render, incl. every resize event |

All removed. Alongside them:

- **`app/page.jsx` leaked two event listeners** (`mousemove` and `scroll` registered with no
  cleanup) and called `setState` on every single mouse-move event. Combined with the 300k
  loop above, moving the pointer across the landing page re-rendered it continuously. Both
  listeners and the state they fed are gone.
- **`components/NavBar.jsx` re-rendered the whole header five times a second, forever** — a
  `setInterval(..., 200)` driving a wall clock in the corner. Replaced with the
  applications-close countdown, which the project already had a component for
  (`CountdownTimer`) but never rendered anywhere.
- **`Math.random()` in React `key`s** (`DataTable`, `Departments`, the departments page) gave
  every row, header and cell a fresh identity on each render, so React threw away and
  recreated the entire DOM subtree every time. Replaced with stable ids.
- **`AllDepartments` remounted the whole department grid** whenever the viewport crossed
  768px, via a changing `key` — plus an unthrottled resize listener to detect it. The grid is
  responsive in CSS; all of it was removed.
- **`DepartmentListItem` was defined inside the departments page component**, making it a new
  component type on every render — React unmounted and remounted every checkbox in the list
  each time anything changed. Hoisted to module scope.
- Long chains of `useState` + `useEffect` that derived values from other state (7 steps in
  `Departments.jsx`, 6 in `NavBar`, 5 in `Footer`, 5 in the departments page) were replaced
  with plain derivations / `useMemo`. Each link in such a chain is an extra render pass, and
  it also means the first paint renders with empty data.

---

## 7. Correctness and code quality

- **`components/CheckBoxComp.jsx` destructured `intermediate`** — react-table passes
  `indeterminate`. The typo meant the flag was spread onto the DOM `<input>` (React warned
  about a non-boolean attribute) and the admin "select all" checkbox never displayed its
  partially-selected state. `indeterminate` is a DOM *property*, so it is now assigned to the
  element in an effect.
- **The admin table had two sources of truth.** Both filters sliced the original `data` prop
  while shortlisting wrote to a separate `tableData` state, so toggling a row while a filter
  was active reverted it as soon as the filter changed. There is now one `records` state with
  the filtered view derived from it. "Reset Filters" also no longer does
  `window.location.reload()` — it clears the filters in place, without a full page reload and
  refetch of every applicant.
- **`app/api/shortlist/[id]`** checked `snapshot.exists` *after* calling `update()`, which
  throws on a missing document — so a bad id produced a generic 400 and the 404 branch was
  unreachable. It now checks first and validates that `shortlisted` is a boolean.
- **`app/api/send-email`** crashed the entire batch on `dept.name` if any recipient's
  department was no longer in the catalogue. Now falls back safely, and the payload is
  validated.
- **The submission deadline was hardcoded twice** — `2026-08-23T23:59:59+05:30` in both the
  API route and `CountdownTimer`'s default prop, free to drift apart. Now one
  `SUBMISSION_DEADLINE` constant, overridable via `NEXT_PUBLIC_SUBMISSION_DEADLINE`.
- **Uncontrolled-to-controlled input warning** in the application form: question fields had no
  default values, so each started as `undefined`. All fields now default to `""`.
- **react-table's `key` was being spread into JSX** for every table row, header and cell.
  Destructured out and passed directly.
- **Dead code removed:** `lib/actions/form.action.js` (a second, unused submit path with no
  auth, no deadline check and no duplicate check), `lib/modals/form.modal.ts` (an unused
  Mongoose-shaped wrapper whose `find()` silently ignored any query field it did not
  special-case), `lib/actions/data.action.js`, `lib/actions/user.action.js`,
  `lib/modals/user.modal.js` (superseded by better-auth), `components/Departments.jsx`
  (unreferenced, and would have thrown on `body.slice` since the data it maps has no `body`
  field), and `app/_error.js` (a Pages Router error component in an App Router tree, so Next
  never rendered it).
- **Proper App Router error handling added:** `app/error.jsx` (error boundary with a retry)
  and `app/not-found.jsx`, replacing the file that did nothing.

---

## 8. UI / UX

**The design system was never wired up.** `tailwind.config.js` maps every shadcn/ui colour
(`background`, `primary`, `border`, `input`, `ring`, `muted`, …) to `hsl(var(--token))`, and
none of those CSS variables were defined anywhere — `app/globals.css` contained only the three
`@tailwind` directives and a body reset. So every `Button`, `Input`, `Card`, `Table`, `Dialog`
and `Popover` in the app resolved to an invalid colour and rendered unstyled. Defining the
tokens (and adding `class="dark"`, which is what `darkMode: "class"` needs) restores the
entire component library at once — it is the single largest visual change in this work.

Also in the config: `theme.extend` declared `keyframes` **twice**, so the second literal
silently overwrote the first and deleted the `shine-pulse` and accordion animations. Merged.

On top of that:

- **The application form** (`FormComp.jsx`) — the most important page in the product — was
  bare unstyled HTML (`<h1>`, `<p>`, plain `<button>`) while the rest of the site used
  Tailwind and framer-motion. Rebuilt with the app's own UI primitives: card sections, a
  two-column responsive grid, real labels and validation messages, a submit/cancel row, and a
  proper submitting state.
- **The sign-in page** imported `Card`, `Input`, `Label` and `Button` and then rendered raw
  HTML with inline styles. Rebuilt into a real card with a sign-in / create-account tab
  switcher and correct `autoComplete` attributes.
- **Google sign-in was unreachable.** `lib/auth.js` configures the Google provider and
  `components/SignInButton.jsx` implements the button, but nothing in the app ever rendered
  that component — so the only way in was email/password, on a portal meant to be used with
  institute Google accounts. The button is now on the sign-in page below an "or" divider.
  `SignInButton` also accepted a `callbackURL` prop and then ignored it in favour of a
  hardcoded `"/"`; it now honours it, disables itself while redirecting, and surfaces failures
  as a toast instead of only a console error. Verified as far as it can be locally:
  `POST /api/auth/sign-in/social` returns a correctly-formed
  `accounts.google.com/o/oauth2/v2/auth` URL with the configured client id, scopes and state.
  Completing the consent screen needs real Google OAuth credentials, so that last hop is
  untested here.
- **The departments page** was an unstyled `<ul>` of checkboxes. Now a responsive two-column
  grid of selectable cards with clear selected / already-submitted states and a live
  "n / 2 selected" counter.
- **The nav bar and footer** were unstyled with an `<hr>`; both are now proper layout with a
  sticky, blurred header.
- **The Gender and Year of Study dropdowns opened white, unreadable popups.** They were native
  `<select>` elements; the popup a `<select>` opens is drawn by the browser itself, not the
  page, so no class on the closed control reaches it. `color-scheme: dark` (first tried on the
  elements, then moved to `:root` when that turned out to be unreliable per-element in Chrome)
  is the CSS-level way to ask the browser to draw that popup in dark mode, but on the user's
  actual Chrome/Windows setup it still rendered light — apparently overridden by something at
  the browser or OS level (a forced-dark-mode flag is the likely culprit) that this app has no
  way to detect or correct for. Rather than keep fighting a browser-drawn control from the page,
  both fields are now the project's own shadcn `Select` (Radix UI) — a normal page-rendered
  dropdown with no native popup involved, so this entire class of bug is now structurally
  impossible regardless of the visitor's browser or OS dark-mode settings. Confirmed dark and
  readable on the reporting user's own machine after the change; `color-scheme: dark` stays on
  `:root` for other native chrome (scrollbars) since it's still doing that job correctly.
- **A cursor-reactive ambient glow in the hero**, at the user's request, using the same
  technique as the Ergent dashboard's ambient background: raw pointer position lives in a ref
  (never React state), eased toward every animation frame with a 0.08 lerp, and written
  directly to CSS custom properties the gradient reads — so the glow tracks smoothly without
  a single re-render. `components/CursorGlow.jsx` is a reusable wrapper; skips all of it under
  `prefers-reduced-motion: reduce`, leaving just the static wash. Verified the position pipeline
  end to end (CSS var in, computed `background-image` position out); the automated browser
  session's tab reports `visibilityState: "hidden"`, which pauses `requestAnimationFrame`
  browser-wide and made the glow look frozen in headless testing — worth checking in your own
  foregrounded browser, where rAF runs normally.
- **The landing page was three unstyled headings and a button.** `Hero.jsx` is rebuilt with a
  real type scale, an open/closed status pill, the countdown, a primary call to action and a
  small stats strip. Its own busy work went with it: a nested loop running 50,000 iterations on
  every render, plus three chained effects that split the description into characters and
  counted its vowels for nothing.
- **`PopupComp` was a fake modal.** It imported shadcn's `Dialog` and then rendered a
  `<div style={{ border: "1px solid black" }}>` — an inline box with no overlay, no focus trap,
  no Escape handling and nothing announcing it to assistive tech. It now uses the `Dialog` it
  was already importing. Verified in the browser: `role="dialog"`, `aria-labelledby` and
  `aria-describedby` set, an overlay present, focus moved inside on open, and both Escape and
  the button return it to `data-state="closed"`.
- **The landing department grid showed placeholder copy and linked to 404s.**
  `BentoGridComp.jsx` (611 lines, roughly half commented-out) started from a hardcoded array of
  Dropbox-style filler ("Use the calendar to filter your files by date", "Notifications" twice)
  and then **mutated that module-level array at import time** from `reviews`. The rewrite read
  `r.body` — a field the catalogue does not have — so every description resolved to
  `undefined`, and it set `href` to a bare id rather than `/join/<id>`, so every card linked to
  a page that 404s. It also had more departments (12) than slots in the array, and rendered via
  `features.slice(5, 10)` and `features[10]` with hardcoded indices.

  Replaced by `components/DepartmentsPreview.jsx`, which renders straight from `reviews`: the
  departments shown are exactly the ones you can apply to, each card tinted with that
  department's own `tone` from the catalogue. Verified in the browser: 12 cards, every `href`
  a real `/join/<id>`, no empty descriptions.

- **The application form** got the layout from the reference: a section navigator beside it
  (highlighting the section you're actually in, via `IntersectionObserver` — the reference
  showed numbered wizard steps, but this form is a single page, so pretending otherwise would
  have been a lie), per-question numbering, character counters bound to the real
  `FIELD_LIMITS.answer`, and a sticky action bar. The submit button lives in that bar, outside
  the `<form>`, associated back to it with `form="application-form"` — verified end to end that
  submission still works and both applications store correctly.
- **The admin panel** got a KPI row (total, shortlisted, not shortlisted, departments covered),
  a search field with an icon, Export/Reset actions, an empty state, hover rows, and shortlist
  rendered as a status pill rather than a red/green block button.
- **Pagination was rewritten.** It always rendered `pageIndex, +1, +2`, so the first page
  vanished as soon as you moved past it and the list ran short at the end. It now renders a
  windowed pager with first/last and ellipses, plus a "Showing 7 – 9 of 10 applicants" summary.
  Verified by dropping the page size to 3: four pages, correct ranges on each.

- **Loading and empty states.** The loader was a bare `<p>Loading...</p>`; it is now a proper
  spinner announced with `role="status"`, reused by the route-level loading file, the sign-out
  page (which showed unstyled "Signing out...") and the join page. The admin table gained an
  empty state with a reset action, rather than rendering an empty grid when filters match
  nothing.
- **Mobile verified at 375px** on the landing, departments and admin pages: zero horizontal
  page overflow on all three, with the dense nine-column applicant table scrolling inside its
  own container rather than stretching the page.

**Accessibility pass:**

- A skip link, visible on focus, jumping past the header to `#main-content`.
- **Landmark structure fixed.** Pages wrapped `NavBar` (which renders `<header>`) and `Footer`
  inside `<main>`, so the banner and contentinfo landmarks were nested in the main one; and
  `FormComp` rendered its own `<main>` *inside* the join page's `<main>`, which is invalid
  HTML. Header and footer are now siblings of a single `<main id="main-content">` per page.
- The admin table's select-all and per-row checkboxes render with no visible text and had no
  accessible name — a screen reader announced them only as "checkbox". They now carry labels
  ("Select all applicants on this page", "Select Test Applicant"), the table has an off-screen
  caption summarising its contents, and every header cell is `scope="col"`.
- The form's error banner is `role="alert" aria-live="assertive"`, so a failed submission is
  announced rather than only appearing on screen.
- The "Authentication required" section on the join page used an `<h2>` with no `<h1>` above
  it; it is now the page's `<h1>`.
- A global `:focus-visible` ring (added earlier with the design tokens) means keyboard focus is
  visible on every control.

**Deliberately not built from the references:** navigation items for pages that don't exist
(Timeline, FAQ, an admin sidebar with Dashboard/Analytics/Communications/Settings); "Under
review" and "Rejected" statuses, since an application carries a `shortlisted` boolean and
nothing else, so those filters would have queried something never stored; and the hero's photo
collage, since there is no photography to put in it.

**Removed as dead and broken:** `AllDepartments.jsx` and `BentoGridComp.jsx` (nothing rendered
them, and `BentoGridComp` was an `async` function component inside a `"use client"` file, which
React does not allow); `DeptHero.jsx`, which called `setIsLoading(false)` in an effect and so
crashed for any caller that did not pass the prop; the `/development` page, which was that
caller — it was unreachable from any navigation, threw on load (caught by the new error
boundary), and its two department links pointed at ids that are not in the catalogue; and the
`technicalCards` / `nonTechnicalCards` arrays in `constants`, imported nowhere, whose
`formLink` values were missing the `/join` prefix and would have 404'd if they ever had been.
- **Applicant counts surfaced in the admin table** ("4 applicants shown · 1 shortlisted") —
  the component was already computing these numbers and throwing them away into unused state.
- **A visible focus ring** for keyboard users is defined globally in `globals.css`.
- `app/layout.js` imported the `Inter` font and never applied it, and imported a
  `ThemeProvider` it never used. Font applied, dead import removed.

---

## 9. Build / tooling

`next build` and `next dev` both write to `.next`, so running a production build while the dev
server is up deletes the chunks it is serving and every page starts 404-ing its CSS and JS —
the app looks catastrophically broken while nothing is actually wrong with it. `next.config.mjs`
now honours a `NEXT_DIST_DIR` env var, so a verification build can be run alongside a live dev
server:

```bash
NEXT_DIST_DIR=.next-build npx next build
```

`npm install` failed outright on a clean checkout: `typescript@^7.0.2` in devDependencies
conflicts with `better-auth-firestore`'s `typescript@^5` peer range (`ERESOLVE`). Pinned to
`^5.6.3`, which satisfies every peer. The project now installs, builds and runs from a fresh
clone with no flags.

---

## How to run and verify

```bash
npm install
```

Create `.env.local` (see `.env.example`); for a credential-free local run, the Firestore
emulator is enough:

```
FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
FIREBASE_PROJECT_ID="demo-recruitment-portal"
BETTER_AUTH_SECRET="any_32_character_local_secret_value"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SUBMISSION_DEADLINE="2027-01-01T23:59:59+05:30"
```

The emulator needs Java installed. Then, in two terminals:

```bash
npx firebase emulators:start --only firestore --project demo-recruitment-portal
npm run dev
```

What was checked, and how:

1. **Dropped answers (1a)** — signed up, submitted through the UI, then read the document back
   out of the emulator: `Gender`, `Year of Study` and the motivation answer are all present,
   with `Pref` 1 and 2 matching the order the departments were picked in, and the right
   number of per-department answers on each row.
2. **Race condition (1b)** — two concurrent identical `POST /api/submit-form` requests: one
   `200`, one `400 "You have already submitted an application for …"`, one row stored. The
   before/after table in section 1b came from running both versions of the logic against the
   emulator.
3. **Auth (2b, 2c)** — `/api/admin/applicants`, `/api/shortlist/[id]` and `/api/send-email`
   all return `401` when signed out; `/admin` renders no applicant data in its HTML for an
   anonymous request; an admin account gets `200` with the full list.
4. **Admin panel** — shortlisting persists through the API and updates the counter, the
   department filter narrows the table, and "Reset Filters" restores it without a page reload.
5. **`npx next build`** passes cleanly.
