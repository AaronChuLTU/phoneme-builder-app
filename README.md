# Phoneme Activity Builder

A web app that lets Speech Pathology teachers build phoneme-based transcription
activities, backed by a database, and export them as standalone HTML files
students can open in any browser.

**Aaron Truong Chu** · Student number 22298193
La Trobe University · Assessment 2 — Backend and Database

## What it does

Teachers manage phoneme word lists and saved activity configurations through
the app, all stored in a SQLite database via Prisma. Pressing Generate builds
a single `.html` file from that stored data — markup, styling and game logic
all inline, so it runs offline with nothing installed.

- **Wordle** — each tile is one phoneme instead of one letter. Standard
  green / yellow / grey feedback, English spelling revealed on a win.
- **Word Search** — each grid cell holds one phoneme. Selectable by drag,
  by two clicks, or by keyboard.

Built around the HCE phoneme inventory supplied with the assessment brief,
now stored as data rather than hardcoded.

## Running it

**Locally**, requires Node.js 20+:

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

Then open <http://localhost:3000>.

**In Docker**, requires Docker Desktop:

```bash
docker compose up --build
```

The container applies migrations and seeds the database automatically on
first start. Then open <http://localhost:3000>, or <http://localhost:3000/health>
for the health check.

## Pages

| Route                | Purpose                                        |
| --------------------- | ----------------------------------------------- |
| `/`                    | Introduction and links to both builders          |
| `/wordle`              | Build and download a phoneme Wordle              |
| `/word-search`         | Build and download a phoneme word search         |
| `/manage`              | Create, rename and delete word lists             |
| `/manage/[id]`         | Full CRUD on the words within one list           |
| `/manage/activities`   | Saved activity configurations, with Generate      |
| `/about`               | Scope, author details, walkthrough video          |
| `/settings`            | Theme and text size, stored in cookies            |

## API

| Route                                | Methods              |
| -------------------------------------- | --------------------- |
| `/health`                              | GET — liveness check  |
| `/api/phonemes`                        | GET                   |
| `/api/word-lists`                      | GET, POST             |
| `/api/word-lists/:id`                  | GET, PATCH, DELETE    |
| `/api/word-lists/:id/words`            | POST                  |
| `/api/words/:id`                       | GET, PATCH, DELETE    |
| `/api/activities`                      | GET, POST             |
| `/api/activities/:id`                  | GET, PATCH, DELETE    |
| `/api/activities/:id/generate`         | GET — downloads HTML  |

## Structure

```
app/         one folder per route, plus API routes under app/api and app/health
components/  Header, NavBar, Footer, PageHeader, PhonemeKeyboard, ThemeSync
lib/         generators, puzzle logic, preferences, Prisma client, API helpers,
             validation, and the fetch wrapper used by the management pages
prisma/      schema, migrations, seed script
```

## Database schema

Five models: `Phoneme`, `WordList`, `Word`, `WordPhoneme`, `Activity`.

The one worth explaining: phonemes are never stored as a string on `Word`.
Symbols like `tʃ`, `dʒ`, `æɪ` and `ɐː` occupy two character spaces, so
splitting a string by character would corrupt them — this is the exact bug
that a duplicated `g` character caused in Assessment 1. Instead `WordPhoneme`
is a join table with an explicit `position` column: "thin" is stored as three
rows, `(θ, 0)`, `(ɪ, 1)`, `(n, 2)`, so no string is ever split to recover the
sounds.

`onDelete: Cascade` from `Word` to `WordList` means deleting a list removes
its words. `onDelete: Restrict` from `WordPhoneme` to `Phoneme` means a
phoneme in use cannot be deleted out from under the words that depend on it.

SQLite has no enum type, so `Activity.type` and `Activity.difficulty` are
plain strings, validated in application code before every write.

## Key design decisions

**The builder is not the game.** `generateWordle.js` and
`generateWordSearch.js` are unchanged from Assessment 1 — still pure functions
that take settings and return a complete HTML document as a string. Only what
feeds them changed: React state before, a database query now. Neither
generator has any idea a database exists.

**Validation is separate from the database layer.** `lib/validation.ts` checks
shape and domain rules — an unknown phoneme symbol, an out-of-range guess
count — before anything is written. `lib/api.ts` translates Prisma's own
constraint errors (duplicate name, missing foreign key) into matching HTTP
statuses, so a request that fails gets back a specific reason rather than a
generic 500.

**The seed script is idempotent.** It checks the database for existing data
before writing anything, and only seeds when it is empty. This matters
specifically because Docker runs it on every container start: an
unconditional wipe-and-reseed would erase a teacher's edits on every restart.

**Shared, stateless components.** `PhonemeKeyboard` holds no state — both
builders and the word management page use it with different props. It is now
fed by `/api/phonemes` rather than a hardcoded array, so the keyboard layout
is data.

**Preferences in cookies, not localStorage.** The server reads cookies and
renders the correct theme in the first response, avoiding a flash of the
wrong theme.

## Docker

Multi-stage build: `deps` and `builder` install and compile with dev
dependencies included; a separate `prod-deps` stage runs a clean
production-only install; `runner` assembles the final image from both.

Two details worth knowing if something looks unusual on inspection:

- The Prisma schema lists two `binaryTargets` — the engine generated locally
  on Windows is not the one the Linux container needs, so `prisma generate`
  runs again inside the `builder` stage to produce a matching Linux binary.
- The SQLite file lives in a Docker volume at `/app/data`, not inside
  `/app/prisma`. A volume mounted at `/app/prisma` would shadow the schema
  and migrations baked into the image, since a mount point takes on the
  volume's contents rather than merging with what is already there.

## Known limitations

- Wordle feedback uses colour alone; a shape indicator would be the next
  accessibility improvement
- The word search's fixed-list constraint from Assessment 1 is gone — words
  can now be added freely through `/manage`
- Custom Wordle words are capped at eight phonemes
- No authentication — anyone with access to the app can edit any word list

## AI acknowledgement

Generative AI (Claude) was used during development, for scaffolding component
and API code, debugging, and discussing design and schema decisions. All
AI-assisted work was reviewed, tested and integrated by me. A completed AI
acknowledgement form is submitted with this assessment.

## Tech stack

Next.js (App Router) · React · Tailwind CSS · TypeScript · Prisma · SQLite · Docker
