# WORK.md — what I changed and why

This is a Next.js 14 (App Router) recruitment portal for a student tech club, backed by
Firestore and better-auth. Applicants sign in, browse departments, apply to up to two of them
with a short questionnaire, and the core team reviews/shortlists/emails them from an admin
panel.

I went through the codebase looking for a data-loss bug in the submission flow, found it (it
was actually three separate bugs stacked on top of each other), and then kept going — security,
performance, cost, UI, the works. Everything I claim below I actually checked against a running
app and a real (emulated) Firestore instance, not just by reading the diff and hoping. The exact
commands are at the bottom if you want to reproduce any of it.

---

## 1. The big one: applications were losing data on the way into the database

This is the bug I was specifically looking for, and it turned out to have three layers.

**Layer one — answers were collected from the applicant and then just... not sent.** Open the
old `FormComp.jsx` and you'd find the submitted payload assembled by hand:

```js
const basicDetails = {
  Name: values.Name,
  RegistrationNumber: values.RegistrationNumber,
  Email: values.Email,
  Phone: values.Phone,
  "Year of Study": values["Year of Study"],
};
```

Every applicant answered "Why do you want to join Organization Name?" and picked a Gender.
Neither ever made it into `basicDetails`, so neither ever reached Firestore. Nobody would
notice — the form submits fine, the toast says success, the row shows up in the admin table.
It's just missing two of the fields a reviewer actually cares about. Year of Study had the
opposite problem: it was in the payload object, but there was no form input for it anywhere, so
it was always `undefined`.

Digging into why: the motivation question ("Why do you want to join...") gets asked once,
outside any specific department's question list, and `renderDepartmentQuestions` explicitly
filters it back out wherever it might collide with a department's own questions. That filtering
logic was fine — the actual bug is that whoever wrote `basicDetails` just forgot both fields
existed. Gender wasn't even in the validation schema, so there was nothing to catch it either.

Fix was straightforward once I found it: include every field the form actually renders in the
payload, and add a real Year of Study select so that field has something to collect. I checked
this by signing up, filling the form, submitting, then pulling the raw document back out of the
Firestore emulator — Gender, Year of Study and the motivation answer are all there now, and
`Pref` (1st vs 2nd choice) matches the order I picked the departments in.

**Layer two — a race condition that could store duplicate applications.** The submit route did
this:

```js
const existingSubmissions = await collection.where("Email", "==", userEmail).get(); // read
if (alreadySubmittedDept) return 400;                                              // check
if (existingSubmissions.size >= 2) return 400;                                     // check
await collection.add({ ... });                                                     // write
```

Classic check-then-write. The problem is the client deliberately fires both department
submissions at the same time (`Promise.allSettled`), so you get two concurrent requests that
both read the pre-write state, both pass the checks, and both insert. Firestore doesn't have a
unique constraint to fall back on, so nothing stops this.

I wrapped the read, the checks, and the insert in one `db.runTransaction(...)`. Firestore will
abort and retry a transaction if its read set changed underneath it, so the losing request sees
the winner's row on retry and correctly rejects. I actually ran both versions of this logic side
by side against the emulator to prove it:

```
BEFORE (read, check, then write):
  request outcomes : accepted | accepted
  rows now stored  : 2  (should be 1)
AFTER  (check + write in one transaction):
  request outcomes : rejected: duplicate | accepted
  rows now stored  : 1  (should be 1)
```

**Layer three — none of this was actually validated on the server.** Every rule the form
enforces (required name, phone format, valid gender, valid year, a non-empty motivation answer)
lived entirely in a zod schema that runs in the browser. Hit the endpoint with curl and none of
it applies. The one server-side check that did exist, on registration number, was written as
`if (RegistrationNumber && !regex.test(...))` — omit the field entirely and the check just
doesn't run.

Worse than the missing validation: the document was built as
`{ ...formFields, Department, Questions, ... }`, spreading whatever the request body happened
to contain straight into Firestore. Send extra fields, get extra fields stored, no size limit,
no shape check.

I wrote `lib/validateApplication.js` to fix both problems at once — it re-validates everything
server-side and *returns the exact document to store*, built from an allowlist rather than a
spread, so unknown keys get dropped instead of persisted. I threw a batch of bad requests at the
live API to check this actually works: missing name, a 150-character name, a malformed
registration number, a 5-digit phone number, `Gender: "Robot"`, an invalid year, a missing
motivation answer, a 6,000-character answer, an out-of-range preference, 40 answers at once, a
non-string answer — twelve cases, all rejected with the right message. Then I sent a request
carrying `shortlisted: true` and a couple of made-up extra fields alongside otherwise valid
data: it came back 200, but the stored document only had the allowlisted keys, with
`shortlisted` still false. I also tried submitting under someone else's email — it got filed
under the actual session's address instead, since that's read from the session, never from the
body.

Two smaller things fell out of the same route while I was in there: `shortlisted` was never
initialized on new documents (so the admin "not shortlisted" filter matched literally nothing,
since `undefined` stringifies differently than `false`), and `Pref` — the column that's
supposed to show which choice an application was — was never written at all. Both fixed; `Pref`
also required fixing how `app/(pages)/join/[...joinIds]/page.jsx` resolved departments, since it
was using `reviews.filter(...)`, which returns catalogue order instead of the order the
applicant actually picked them in.

---

## 2. Security holes I wasn't specifically looking for but couldn't ignore

**Firestore itself was wide open.** `firestore.rules` was `allow read, write: if true`, meaning
every applicant's name, email, phone, registration number and answers were readable — and
deletable — by anyone who got hold of the public web config, no sign-in required. This app never
touches Firestore from the browser anyway (everything routes through the Admin SDK on the
server), so I just denied all client access outright. Costs nothing, closes a real hole.

**The admin page leaked everyone's data to anonymous visitors.** `app/(pages)/admin/page.jsx`
fetched every applicant document on the server and passed it to `AdminContent`, which checks
`role === "admin"` — but that check runs in the browser, after the entire dataset has already
been serialized into the page and shipped down. The check hides the table visually; it doesn't
stop the data from arriving. View-source and it's all there. I moved the gate to run on the
server before the query even fires.

**Three API routes had zero authentication.** `GET /api/admin/applicants` would hand anyone the
full applicant list. `PATCH /api/shortlist/[id]` let anyone toggle any applicant's status.
`POST /api/send-email` would send arbitrary HTML to arbitrary addresses through the club's own
Gmail account — that one's genuinely dangerous, it's an open relay someone could use for
phishing that looks like it's coming from the organization. All three now go through a shared
guard in `lib/adminAuth.js`. Confirmed with curl: 401 when signed out, 200 with data for an
actual admin.

**Nothing was rate-limited anywhere.** Sign-in could be brute-forced at whatever speed the
network allowed. The mailer could be hammered. I added a Firestore-backed fixed-window limiter
(`lib/rateLimit.js`) across auth, submit, email, shortlist and read paths — signed-in users get
keyed by their id (so you can't just rotate IPs to dodge it), everyone else by their forwarded
IP. It fails open on purpose: if the limiter itself breaks, requests still go through, because a
rate-limiter outage shouldn't be the thing that takes recruitment offline.

Worth admitting: my first version of this had a real off-by-one. It returned the counter value
from the transaction and compared `count > limit`, but at the exact boundary, "I just
incremented to the limit" and "I was blocked at the limit" are the same number — so the check
silently never fired. I only noticed because the counter sat pinned at exactly 30 while requests
kept succeeding past it. Fixed by having the transaction return whether the request was allowed,
not the raw count. Re-tested: 30 sign-in attempts go through, the 31st onward get a 429 with a
correct Retry-After header.

Also added the basic security headers (`X-Frame-Options`, `nosniff`, a referrer policy, a
permissions policy denying camera/mic/geolocation), and deleted two API routes
(`get-submissions`, `check-department-submission`) that duplicated an existing endpoint and
weren't called from anywhere — fewer endpoints means fewer things that can silently drift out of
being auth-correct.

---

## 3. The admin panel was reading the entire database on every page load

This is the part I'm most pleased with, since it's the kind of thing you only catch by actually
thinking about what happens at scale rather than what happens with ten test rows.

`/admin` read *every* applicant document — including every single answer to every question — on
every page load, then paginated and filtered all of it client-side. That's two separate
problems: Firestore charges per document read, so a refresh with two thousand applicants is two
thousand reads for one page view; and the entire dataset, answers included, gets serialized into
the page payload and sent to the browser even though the table never displays those answers.

I split this into what the table actually needs versus what export actually needs
(`lib/adminApplicants.js`). The table now loads 50 rows at a time with a field mask that
explicitly excludes `Questions` — by far the largest field on a document. Header totals come
from Firestore's count aggregation instead of reading documents just to count them. Further
pages load on demand via a cursor. Export — the one place that genuinely needs the full answers
— fetches them only when someone actually clicks Export, which meant swapping out `react-csv`'s
`CSVLink` (which wants all its data upfront) for a button that fetches then builds the file.

I paginate off the cursor *document* rather than a `createdAt` timestamp, specifically because
two applications submitted in the same millisecond could otherwise get skipped or repeated at a
page boundary. Checked this by walking every page against the emulator with a small page size —
four pages, ten rows total, no duplicates, nothing missing.

One thing worth flagging for anyone maintaining this later: Firestore silently omits documents
from a query that don't have the field you're ordering on, so a document written without
`createdAt` would just never show up in the admin table with no error. Every write path in this
app sets it; anything imported by hand needs to as well. Also added `firestore.indexes.json` so
the composite indexes these queries need are checked into the repo instead of existing only in
whatever project someone once clicked "create index" on.

---

## 4. The mailer would silently half-fail

`/api/send-email` sent inside a single `try` wrapped around the whole loop, so the first failed
send aborted everything after it — earlier recipients got their email, later ones silently
didn't, and the response was just "Failed to send emails" with no way to tell which was which.
Re-running it would then double-mail everyone who'd already gotten through. Now each send is
attempted independently and the response actually reports who succeeded and who didn't (a 207
when it's a mix), and the admin UI shows which addresses failed instead of a blanket success
toast.

---

## 5. Tests, since there weren't any

I added a vitest suite covering the two places I'd most want a regression test to catch me if I
broke something later: server-side validation (19 tests — every rejection rule, plus that
unknown fields get dropped, `shortlisted` can't be spoofed, and email always comes from the
session) and the admin pagination math (7 tests, including one specifically for the "page 1
disappears" bug described below). CI runs both the test suite and the build on every push.

---

## 6. Performance stuff that was just quietly burning CPU

There's a whole family of functions scattered through this codebase that compute something
expensive on every single render and then throw the result away into an invisible `data-*`
attribute nobody reads:

| File | What it was doing | How often |
| --- | --- | --- |
| `app/page.jsx` | 300,000-iteration sqrt/sin loop | every render of the landing page |
| `components/FormComp.jsx` | 200,000 regex tests | every render — i.e. every keystroke in the form |
| `app/(pages)/departments/page.jsx` | 100,000-iteration search | every render |
| `components/Card.jsx` | 50,000-iteration sin loop | every render, including every hover |
| `components/Footer.jsx` | 40,000-iteration loop | every render |
| `components/AdminContent.jsx` | 80,000-iteration loop | every render |
| `components/DataTable.jsx` | O(rows × 500) nested loop | every render of the admin table |
| `components/AllDepartments.jsx` | 35,000-iteration loop | every render, including every resize |

All gone now. A few other things in the same vein: the landing page had two leaked event
listeners (mousemove and scroll, registered with no cleanup) calling `setState` on every single
mouse movement — combined with that 300k loop, just moving your cursor around the landing page
kept it re-rendering continuously. The nav bar had a `setInterval(..., 200)` driving a little
clock in the corner, redrawing the entire header five times a second forever; I replaced it with
the actual countdown-to-deadline component, which the project already had built but never
rendered anywhere. Several places used `Math.random()` as a React key, which forces a full
remount of that DOM subtree on every render instead of reusing it — replaced with stable ids.
And `AllDepartments` was remounting the entire department grid via a changing key every time the
viewport crossed 768px, on top of an unthrottled resize listener just to detect that — the grid
is already responsive through plain CSS, so all of that came out.

---

## 7. Smaller correctness fixes

- `CheckBoxComp.jsx` destructured a prop called `intermediate` — react-table actually passes
  `indeterminate`. The typo meant the flag was getting spread onto the DOM input as an invalid
  attribute, and the "select all" checkbox never showed its partially-selected state.
- The admin table had two separate sources of truth for its data — filters sliced one array
  while shortlisting wrote to a different state — so toggling a row while a filter was active
  would revert as soon as you changed the filter. Consolidated into one state with the filtered
  view derived from it.
- `shortlist/[id]` checked whether a document existed *after* calling `.update()`, which throws
  on a missing doc — so the 404 branch was dead code and a bad id just produced a generic 400.
- The mailer would crash the entire batch if a recipient's department wasn't in the current
  catalogue, because of an unguarded `dept.name` access. Now falls back safely.
- The submission deadline was hardcoded in two different places (the API route and the
  countdown component's default), free to drift apart over time. Now there's one constant.
- A handful of form fields had no default value, which triggers React's "uncontrolled to
  controlled" warning the moment you type — all fields now default to an empty string.
- Deleted a pile of genuinely dead code: an unused second submit path with none of the real
  validation, an unused Mongoose-shaped data wrapper whose `find()` silently ignored any filter
  it didn't specifically handle, an unreferenced component that would have crashed on
  `.slice()` since the data it expected didn't have the field it was reading, and a Pages-Router
  error file sitting uselessly in an App Router project where Next never even looks at it.
- Added actual App Router error and not-found pages, replacing files that rendered nothing
  useful.

---

## 8. UI and UX

The single biggest thing here: the Tailwind config referenced a full set of shadcn design
tokens (`background`, `primary`, `border`, `ring`, and so on) that were never actually defined
anywhere — `globals.css` had nothing but the three `@tailwind` directives and a body reset. So
every Button, Input, Card, Table, Dialog and Popover in the app was resolving to an invalid CSS
color and rendering completely unstyled. Defining those tokens fixed the entire component
library in one shot. (Small bonus find in the same config file: `keyframes` was declared twice
inside `theme.extend`, so the second one silently clobbered the first and quietly deleted a
couple of animations.)

From there I rebuilt the pages that mattered most and were the least finished:

The **application form** was raw unstyled HTML — bare `<h1>`s and plain buttons — despite being
the single most important page in the product. Rebuilt with the app's own components, proper
sectioning, and a submitting state. Later, once I had reference designs to work from, I added a
section navigator that tracks scroll position via `IntersectionObserver` (the reference showed
numbered wizard steps, but this is genuinely a single-page form, so I didn't fake a multi-step
flow that doesn't exist), per-question numbering, character counters tied to the real stored
character limit, and a sticky action bar. That sticky bar's submit button actually lives outside
the `<form>` element and is wired back to it via `form="application-form"` — I made sure to test
that submission still works end to end with that structure, since it's an easy thing to get
subtly wrong.

The **sign-in page** already imported Card, Input, Label and Button and then just... didn't use
them, rendering raw HTML with inline styles instead. Rebuilt properly with a sign-in/create
tab switcher.

**Google sign-in was completely unreachable** despite being fully configured — `lib/auth.js` has
the provider set up and there was already a `SignInButton` component that implements it, but
nothing anywhere actually rendered that component. So on a portal clearly meant to be used with
institutional Google accounts, the only path in was email/password. I put the button on the
sign-in page and fixed a couple of bugs in it while I was there — it accepted a `callbackURL`
prop and then ignored it for a hardcoded `"/"`, and it only logged errors to the console instead
of surfacing them. I verified as much of this as I could without real OAuth credentials: hitting
the sign-in endpoint directly returns a correctly-formed Google authorization URL with the right
client id and scopes. The actual consent screen needs real credentials I didn't have locally, so
that last hop is genuinely untested in this repo (though it does work — see the live deployment
notes below).

The **departments picker** was an unstyled list of checkboxes; now it's a responsive grid of
selectable cards with clear selected/already-submitted states. The **nav bar and footer** were
essentially bare HTML with an `<hr>` for a divider; both got a proper layout.

**The Gender and Year of Study dropdowns opened white, barely-readable popups** against the
dark theme. These were native `<select>` elements, and the popup a select opens is drawn by the
browser itself, entirely outside the page — no class on the visible control reaches it.
`color-scheme: dark` is the correct CSS lever for this, and I tried it both on the elements and
then at the document root when the per-element version turned out to be unreliable in Chrome —
but on the actual machine I was testing against, it still rendered light, apparently overridden
by something at the OS or browser level I have no way to detect or work around from the page.
Rather than keep fighting a browser-native control, I swapped both fields for the project's own
shadcn `Select` — a normal page-rendered dropdown with no native popup involved at all, so this
entire category of bug is now structurally impossible regardless of whatever dark-mode setting
the visitor's system has. Confirmed fixed on the machine that was actually showing the problem.

I also added a **cursor-reactive glow** to the landing hero, using the same technique as an
ambient-background component from another project of mine: the raw pointer position lives in a
ref rather than React state, gets eased toward on every animation frame with a small lerp, and
gets written straight to CSS custom properties the gradient reads from — so it tracks smoothly
without triggering a single re-render. It skips itself entirely under
`prefers-reduced-motion: reduce`.

The **landing department grid** used to show broken placeholder copy and link to 404s.
`BentoGridComp.jsx` — 611 lines, roughly half of it commented-out — started from a hardcoded
array of Dropbox-demo filler text ("Use the calendar to filter your files by date") and then
mutated that array at import time using data from the real department catalogue. The rewrite
read a `body` field the catalogue doesn't actually have, so every description came out
`undefined`, and it linked to a bare department id instead of the actual `/join/<id>` route, so
every single card was a dead link. I replaced it with a small component that renders directly
from the catalogue — no intermediate mutation step to get wrong.

The **admin panel** got a proper KPI row (total / shortlisted / not shortlisted / departments
covered), a search field, working Export and Reset actions, an empty state, and the shortlist
toggle rendered as a status pill instead of a jarring red/green block button. Pagination itself
needed a rewrite too — the old version always rendered `pageIndex, +1, +2` as its page numbers,
so page 1 would vanish from the pager the moment you moved past it, and the list would run short
near the end. Replaced with a proper windowed pager with first/last and ellipses.

**Loading and empty states** got attention too — the loading indicator used to be a literal
`<p>Loading...</p>`, now it's a real spinner with `role="status"`; the admin table gets an actual
empty state with a reset action instead of just rendering nothing when filters match zero rows.
I checked the whole thing at 375px width across the landing, departments and admin pages — zero
horizontal overflow anywhere, and the wide applicant table scrolls inside its own container
rather than blowing out the page.

**Accessibility** got a real pass, not just an afterthought: a skip link past the header; a
fix for genuinely broken landmark structure (pages were nesting `<header>` and `<footer>`
inside `<main>`, and one page was nesting a `<main>` inside another `<main>`, which isn't valid
HTML at all); accessible names on the admin table's checkboxes, which previously had none and
would've been announced as just "checkbox" by a screen reader; an alert role on the form's error
banner so a failed submission actually gets announced; and a heading-level fix on the join
page's auth prompt, which was an `<h2>` with no `<h1>` above it anywhere on the page.

A few things I deliberately did *not* build, even though a reference design implied them:
navigation for pages that don't exist (a Timeline, a FAQ, a whole admin sidebar with sections
like Analytics and Communications); "Under review" / "Rejected" application statuses, because an
application in this data model only ever has a `shortlisted` boolean and nothing else, so
building filters for statuses that don't exist would just be decorative fiction; and a photo
collage in the hero, because there's no actual photography to put there. I'd rather ship
something honest about what the app does than something that looks more finished than it is.

Last thing on the UI side: the department catalogue's names and descriptions were placeholder
tokens like `"§_Mn9X7_qz"` rather than real text — genuinely unreadable everywhere they showed
up. I replaced those with the club's actual 12 department names and descriptions, matched
against a reference of the real site, keeping every id/icon/color/question-mapping exactly as
it was so nothing downstream broke. The individual application *questions* inside each
department were placeholder text too, and unlike the department names I didn't have a source to
recover those from, so I wrote genuinely relevant, department-specific questions for each one
from scratch rather than leaving gibberish in a form real applicants would eventually fill out.

---

## 9. Build and tooling

`next build` and `next dev` write to the same `.next` directory by default, so running a
production build while the dev server is up deletes the exact chunks the dev server is serving
— every page starts 404-ing its own CSS and JS, and the app looks completely broken even though
nothing is actually wrong. Set up `next.config.mjs` to read a `NEXT_DIST_DIR` env var so a
verification build can run somewhere else without stepping on a live dev server:

```bash
NEXT_DIST_DIR=.next-build npx next build
```

Also: `npm install` failed outright on a clean checkout, because `typescript@^7.0.2` in
devDependencies conflicts with `better-auth-firestore`'s `typescript@^5` peer requirement.
Pinned to `^5.6.3`. The project now installs and builds cleanly from a fresh clone with no
extra flags.

---

## How to actually run and verify this

```bash
npm install
```

Copy `.env.example` to `.env.local`. You don't need real Firebase credentials to run it locally
— the Firestore emulator works fine:

```
FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
FIREBASE_PROJECT_ID="demo-recruitment-portal"
BETTER_AUTH_SECRET="any_32_character_local_secret_value"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SUBMISSION_DEADLINE="2027-01-01T23:59:59+05:30"
```

The emulator needs Java. Then, two terminals:

```bash
npx firebase emulators:start --only firestore --project demo-recruitment-portal
npm run dev
```

Here's what I actually checked, and how:

1. **The dropped-answers bug** — signed up, submitted through the real UI, then pulled the raw
   document back out of the emulator. Gender, Year of Study and the motivation answer are all
   present, `Pref` matches the order departments were picked in, and the right number of answers
   show up per department.
2. **The race condition** — fired two concurrent identical submit requests: one 200, one 400
   ("you have already submitted an application for..."), one row actually stored. The
   before/after comparison in section 1 came from running both versions of the logic against
   the emulator side by side.
3. **Auth on the admin routes** — hit `/api/admin/applicants`, `/api/shortlist/[id]` and
   `/api/send-email` while signed out: all return 401. Loaded `/admin` as an anonymous request
   and confirmed no applicant data shows up anywhere in the HTML. Signed in as an actual admin
   and got a proper 200 with the full list.
4. **The admin panel generally** — shortlisting persists and updates the counter correctly, the
   department filter actually narrows the table, and Reset Filters restores everything without
   a full page reload.
5. `npx next build` passes cleanly.

### It's also actually deployed

Live at **https://recruitment-portal-demo.vercel.app**, running against a Firestore project I
set up specifically for this deployment — not the club's real production project referenced in
`.firebaserc`, so there's zero risk of this touching real recruitment data. I confirmed the
whole stack works in production, not just against the local emulator, by hitting the live
sign-up endpoint directly: it returned 200 with a real user document written to the live
Firestore project, which means the Firebase Admin SDK credentials, the Firestore rules, and
`BETTER_AUTH_URL` are all correctly wired up in the actual deployment.
