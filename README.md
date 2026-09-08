# Recruitment Portal

**Live demo: [recruitment-portal-demo.vercel.app](https://recruitment-portal-demo.vercel.app)**
(deployed against a Firestore project created specifically for this demo — safe to sign up and
submit a test application; nothing here touches real recruitment data)

A recruitment portal for a student technical club. Applicants sign in, browse departments,
apply to up to two of them with a department-specific questionnaire, and the core team reviews,
filters, shortlists and emails them from an admin panel.

Built with **Next.js 14** (App Router), **Cloud Firestore**, **better-auth**, **Tailwind CSS**
and **shadcn/ui**.

See **[WORK.md](WORK.md)** for the full list of bugs found and fixed, with root cause,
fix, and verification evidence for each — that's the document to read for the reasoning behind
every change in this repo.

---

## Features

**For applicants**
- Email/password or Google sign-in
- Department catalogue; pick up to two departments per applicant
- One combined application form covering both choices, with per-department questions
- Answers are drafted to `localStorage` as you type, so a refresh doesn't lose work
- Countdown to the application deadline; submissions close automatically

**For the core team**
- Admin-only dashboard listing every application
- Search, department filter, shortlisted filter, sorting and pagination
- One-click shortlist / un-shortlist
- Bulk email to selected applicants with a template (`#name`, `#dept` placeholders)
- CSV export including flattened questionnaire answers

---

## Getting started

```bash
npm install
```

Create `.env.local` from `.env.example`. To run without any real Firebase credentials, point
the app at the local Firestore emulator:

```
FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
FIREBASE_PROJECT_ID="demo-recruitment-portal"
BETTER_AUTH_SECRET="any_32_character_local_secret_value"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SUBMISSION_DEADLINE="2027-01-01T23:59:59+05:30"
```

Then, in two terminals (the emulator requires Java):

```bash
npx firebase emulators:start --only firestore --project demo-recruitment-portal
```

```bash
npm run dev
```

The app runs at http://localhost:3000 and the emulator UI at http://localhost:4000.

To grant yourself the admin panel, set `role: "admin"` on your document in the `users`
collection (in the emulator UI, or in the Firebase console for a real project), then sign out
and back in so the session picks up the new role.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | Firebase Admin SDK service account |
| `FIRESTORE_EMULATOR_HOST` | Use the local emulator instead of a real project |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | Session signing and callback base URL |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth provider |
| `EMAIL_USERNAME` / `EMAIL_PASSWORD` | Gmail account used for the bulk mailer |
| `NEXT_PUBLIC_SUBMISSION_DEADLINE` | When applications close (defaults to the date in `constants/index.js`) |

---

## Project structure

```
app/
  (pages)/admin            Admin dashboard (server-gated)
  (pages)/departments      Department picker
  (pages)/join/[...ids]    Application form for the chosen departments
  api/submit-form          Stores an application (transactional)
  api/check-applications   How many applications the signed-in user has
  api/admin/applicants     Admin: list all applications
  api/shortlist/[id]       Admin: toggle shortlist
  api/send-email           Admin: bulk mail
components/                UI, admin table, form, filters
lib/
  db.ts                    Firestore Admin SDK connection
  auth.js / auth-client.js better-auth server and client
  adminAuth.js             Shared admin session guard
  validateApplication.js   Server-side validation + allowlisted document shape
constants/index.js         Departments, questionnaire, CSV headers, deadline
firestore.rules            Client access rules (deny-all; all access is server-side)
```

**Data model.** One Firestore collection, `formData`; one document per application (so an
applicant applying to two departments has two documents). Each document holds the applicant's
details, `Department`, `Pref` (1st or 2nd choice), a `Questions` map of question → answer,
`shortlisted`, and `createdAt`. better-auth owns `users`, `sessions` and `accounts`.

---

## Work done in this repository

This started as an existing codebase with a data-loss bug in the submission flow. That bug is
fixed, along with a set of security, performance and UI problems found along the way. Full
detail — root causes, reasoning and the evidence for each — is in **[WORK.md](WORK.md)**.

### The storage bug

- **Answers were collected and then silently dropped.** The submitted payload was assembled by
  hand and left out two fields the form actually rendered (the motivation answer and Gender),
  while including one for which no input existed. Submissions reported success, so the loss
  was invisible from both sides.
- **A race condition stored duplicates.** The route read the applicant's existing rows,
  checked them, then inserted — while the client submits both departments concurrently. Two
  in-flight requests both passed the check and both wrote. The check and the insert now share
  a single Firestore transaction.
- **`shortlisted` and `Pref` were never written**, so the "not shortlisted" filter matched
  nothing and the Preference column was always blank.
- **Nothing was validated on the server.** Every form rule lived in a browser-only zod schema,
  and the stored document was spread from the request body — so a request sent outside the form
  could store an application for a department that does not exist, with any fields it liked, of
  any size. Validation now runs server-side (`lib/validateApplication.js`) and the document is
  built from an allowlist, with `Email` always taken from the session.

### Security

- Firestore rules were `allow read, write: if true` — the whole database was readable and
  writable by anyone holding the public web config. Client access is now denied outright; all
  access is server-side through the Admin SDK.
- `/admin` fetched every applicant's record on the server and only checked `role === "admin"`
  in the browser, so the data reached anonymous visitors regardless. The gate now runs before
  the query.
- `/api/admin/applicants`, `/api/shortlist/[id]` and `/api/send-email` had no authentication at
  all — the last one being an open mailer on the club's Gmail account. All three now require an
  admin session.
- Nothing was rate limited — sign-in could be brute-forced and the mailer hammered. Added a
  Firestore-backed fixed-window limiter (`lib/rateLimit.js`) over auth, submit, email,
  shortlist and read paths, keyed by user id when signed in and by IP otherwise.
- Added `X-Frame-Options`, `nosniff`, `Referrer-Policy` and `Permissions-Policy` headers.

### Performance

- Removed eight per-render busy loops (35,000–300,000 iterations each) whose results were only
  written to invisible `data-*` attributes — including one that ran on every keystroke in the
  application form.
- Removed two leaked event listeners that re-rendered the landing page on every mouse move, and
  a 200 ms interval that re-rendered the header five times a second indefinitely.
- Replaced `Math.random()` React keys (which forced full DOM remounts), hoisted a component out
  of a render body, and collapsed chains of state-derived effects into plain derivations.

### UI

- The Tailwind config mapped every shadcn/ui colour to CSS variables that were never defined,
  so the entire component library rendered unstyled. Defining the design tokens fixed the whole
  app at once.
- Rebuilt the application form, sign-in page and department picker with the project's own UI
  primitives, and added proper App Router `error` and `not-found` pages.
- Rebuilt the landing page: a real hero, and a department grid rendered from the catalogue.
  The old grid was built from hardcoded placeholder copy, mutated at import time from a field
  the catalogue does not have (so every description was `undefined`), and linked to bare ids
  rather than `/join/<id>` — every card was a 404.
- Turned the "notice" popup into an actual dialog. It imported shadcn's `Dialog` and rendered a
  bordered `<div>` instead: no overlay, no focus trap, no Escape, invisible to screen readers.
- Surfaced Google sign-in: the provider was configured and a button component existed, but
  nothing rendered it, so the OAuth path was unreachable from the UI.

### Cost and scale

- The admin page read **every applicant document, with every answer, on every page load**, then
  paginated in the browser. It now loads a page of 50 with a field mask that excludes the large
  `Questions` field, takes its header totals from Firestore's count aggregation (no document
  reads), loads further pages on demand by cursor, and fetches full records with answers only
  when someone exports.
- Composite indexes are declared in `firestore.indexes.json` instead of existing only in
  whatever console someone once clicked.

### Reliability

- The bulk mailer sent inside one `try` around the whole loop, so the first failure aborted the
  batch: earlier recipients got their mail, later ones silently did not, and the response could
  not say which. Sends are now attempted per recipient and the route reports exactly who failed.

### Tests

`npm test` runs a vitest suite covering server-side validation (unknown fields dropped,
`shortlisted` unspoofable, email taken from the session) and the pagination window, including a
regression test for a bug where the first page vanished from the pager. CI runs the tests and
the build on every push.

### Verification

Checked against a real (emulated) Firestore rather than by inspection: a full signup → apply →
inspect-the-document round trip, a two-concurrent-request test showing 2 stored rows before the
fix and 1 after, and unauthenticated calls to each admin endpoint returning `401`. `next build`
passes.
