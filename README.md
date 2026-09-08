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

I picked this up as an existing codebase with a data-loss bug hiding in the submission flow —
applicants were filling out fields that never actually made it into the database. That turned
out to be three separate issues stacked on top of each other (a hand-assembled payload dropping
fields, a race condition letting duplicate applications through, and no server-side validation
at all behind a browser-only check), and chasing it down led into a bunch of other things: the
whole Firestore database was publicly readable and writable, three admin API routes had no auth
whatsoever, the admin panel was reading every applicant's entire record on every single page
load instead of paginating properly, and most of the UI was rendering unstyled because the
design tokens the whole component library depends on were never actually defined.

I fixed all of that, added rate limiting and a proper test suite, and rebuilt the pages that
needed it most. Every fix in **[WORK.md](WORK.md)** is written up with what was actually broken,
why, what I changed, and how I checked it worked — against a real Firestore instance, not just
by reading the diff. That's the document worth reading if you want the reasoning, not just the
list of changes.
