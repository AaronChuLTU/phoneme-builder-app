# Phoneme Activity Builder

A data-driven web app for Speech Pathology teachers to build phoneme-based
Wordle and Word Search activities, store them in a database, monitor how
they are used, and export them as standalone HTML files learners open in any
browser.

**Aaron Truong Chu** · Student number 22298193
La Trobe University · CSE3CWA · Assessment 3 — Data-driven application and reporting

| Tag | Stage |
| --- | --- |
| [`assessment-1`](../../tree/assessment-1) | Frontend builder |
| [`assessment-2`](../../tree/assessment-2) | Backend, database, Docker |
| `main` | Assessment 3 — dashboard, observability, testing |

---

## What it does

- **Wordle** — each tile is one phoneme, not one letter. Green / yellow / grey
  feedback; English spelling revealed on a win
- **Word Search** — each cell holds one phoneme; solvable by drag, two clicks,
  or keyboard
- **Word lists** — stored in SQLite, managed through the app (full CRUD)
- **Saved activities** — settings stored per activity; Generate builds the
  HTML from the words currently in the list
- **Dashboard** — live health, usage statistics, alerts and reports

---

## Running it

**Docker** (recommended — production build):

```bash
docker compose up --build -d
docker compose exec app npx tsx prisma/simulate.ts   # optional: 14 days of simulated history
```

**Locally** (Node.js 20+):

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run db:simulate      # optional
npm run dev
```

Open <http://localhost:3000> · dashboard at `/dashboard` · health at `/health`

---

## Dashboard and observability

`/dashboard` is a server component — it queries the database while rendering,
then re-runs every 15 seconds (pausable).

**Key numbers**

- Activities created — split by Wordle / Word Search
- Word lists and total words
- Successful and failed generations, success rate
- Most-used activity type (by generations)
- Average time on page
- Average generation time

**Alerts** — severity shown as a word, not just colour

- Database unreachable
- Failure rate over 10% in 24 hours (error) or any failures (warning)
- Activities that **cannot** generate — e.g. a 5-phoneme Wordle filter on a
  list with no 5-phoneme words
- Activities with very few possible answers
- Word searches with words longer than the grid
- Empty word lists, and words with no phonemes (invalid data)

**Reports**

- Generations per day, last 14 days
- Activities and generated output — settings, word list, **usable words**,
  success / failed, last generated, with **Preview** and **Download**
- Generations by activity type
- Time on page by route
- Word lists by phoneme length
- Recent failed generations, with the reason the teacher saw

**JSON:** `GET /api/metrics/summary` — same data the dashboard uses.

### How the data is collected

| Metric source | How |
| --- | --- |
| `GenerationEvent` | Written by the generate route on **every** attempt. The recording wraps the route, so no path — including a crash — can skip it |
| `PageView` | `PageTimer` component measures visible time per page and sends it with `navigator.sendBeacon` when the page is left |
| Health | `lib/health.ts` — shared by `/health` and the dashboard, so they cannot disagree |

Design decisions:

- **Metrics never break generation** — recording errors are logged, not thrown
- **Raw events, not running totals** — every number traces back to its rows
- **`onDelete: SetNull`** — deleting an activity keeps its generation history
- **Page time limits** — visits under 0.5 s or over 30 min are discarded;
  hidden-tab time is not counted
- **Simulated records are flagged** (`simulated: true`) — the dashboard states
  how many it includes, and `npm run db:simulate -- --clear` removes only those

---

## Testing

### Playwright — end-to-end

```bash
npm run test:e2e        # headless
npm run test:e2e:ui     # visual runner
```

| Test | Use case | Proves |
| --- | --- | --- |
| Builder CRUD | Teacher | Create list → add word via phoneme keyboard → edit → delete. Page reloads after each step prove it reached the database |
| Play a Wordle | Learner | Dashboard → Preview → play a guess → dashboard success count rises by exactly 1 |
| Download a Word Search | Teacher → learner | Downloads the file and opens it **from disk with no server** |

### JMeter — load testing

```powershell
powershell -ExecutionPolicy Bypass -File load-tests\run-load-tests.ps1 -JmeterBin <path>\jmeter.bat
```

Each virtual user: health → word lists → open list → activities → generate
Wordle → generate Word Search → dashboard summary, with 200–800 ms think time.
Run against the Docker production build.

| Level | Requests | Avg ms | Median | P95 | Generate avg | Errors | Req/s |
| --- | --- | --- | --- | --- | --- | --- | --- |
| x1 | 70 | 11 | 6 | 22 | 17 | 0% | 1.9 |
| x10 | 700 | 10 | 5 | 27 | 18 | 0% | 16.5 |
| x100 | 3,500 | 26 | 13 | 91 | 37 | 0% | 121.5 |
| x1000 | 14,000 | 1,808 | 1,336 | 4,903 | 2,568 | 0% | 175.5 |

- **Scales cleanly to 100 users** — under 30 ms average
- **Ceiling between 100 and 1,000** — throughput plateaus near 175 req/s while
  response time rises ~70×
- **Generation degrades most** — the only step that writes, and SQLite allows
  one writer at a time
- **No errors at any level** — requests queue rather than fail
- x10000 not run: JMeter and the app share one machine, so results would
  measure the laptop, not the app
- **Next step to scale:** PostgreSQL for concurrent writes, then multiple
  containers (a single SQLite file cannot be shared between them)

### Lighthouse — accessibility

**100** on Home, Dashboard, Activities, Wordle builder, and a generated Wordle.

Accessibility built in rather than retrofitted:

- Skip link, visible focus rings, `prefers-reduced-motion`
- Phoneme keys carry `aria-label`s — a screen reader cannot pronounce a bare
  IPA symbol
- Charts drawn as **tables** — readable by screen readers
- Alert severity shown as **text**, not colour alone
- Auto-refresh is **pausable** (WCAG 2.2.2)

Lighthouse limits: it only checks automatable rules, and only the page's
initial state. Wordle tiles that turn green after a guess are never seen by it,
so feedback colour contrast was checked manually.

---

## API

| Route | Methods |
| --- | --- |
| `/health` | GET — 200 if the database answers, 503 if not |
| `/api/phonemes` | GET |
| `/api/word-lists` | GET, POST |
| `/api/word-lists/:id` | GET, PATCH, DELETE |
| `/api/word-lists/:id/words` | POST |
| `/api/words/:id` | GET, PATCH, DELETE |
| `/api/activities` | GET, POST |
| `/api/activities/:id` | GET, PATCH, DELETE |
| `/api/activities/:id/generate` | GET — download; `?view=1` opens in browser |
| `/api/metrics/summary` | GET — dashboard data |
| `/api/metrics/page-view` | POST — time-on-page beacon |

---

## Database

Seven models: `Phoneme`, `WordList`, `Word`, `WordPhoneme`, `Activity`,
`GenerationEvent`, `PageView`.

- **`WordPhoneme`** stores each phoneme as its own row with a `position` —
  symbols like `tʃ` and `æɪ` are two characters, so a phoneme string can never
  be safely split
- **`Activity.wordLength`** restricts a Wordle to one phoneme count
- **`GenerationEvent` / `PageView`** hold the raw events behind every metric

---

## Structure

```
app/          pages, API routes, /health, /dashboard
components/   NavBar, PageHeader, PhonemeKeyboard, PageTimer, AutoRefresh, ...
lib/          generators, validation, Prisma client, health, metrics, summary
prisma/       schema, migrations, seed.ts, simulate.ts
tests/e2e/    Playwright tests
load-tests/   JMeter plan and runner, results/summary.csv
```

---

## References

Apache Software Foundation. (n.d.). *Apache JMeter user's manual*.
https://jmeter.apache.org/usermanual/index.html

Beyer, B., Jones, C., Petoff, J., & Murphy, N. R. (Eds.). (2016). *Site
reliability engineering: How Google runs production systems*. O'Reilly Media.

Google. (n.d.). *Lighthouse overview*. Chrome for Developers.
https://developer.chrome.com/docs/lighthouse/overview

Majors, C., Fong-Jones, L., & Miranda, G. (2022). *Observability engineering:
Achieving production excellence*. O'Reilly Media.

Microsoft. (n.d.). *Playwright documentation*. https://playwright.dev/docs/intro

Prisma. (n.d.). *Prisma ORM documentation*. https://www.prisma.io/docs

World Wide Web Consortium. (2023). *Web content accessibility guidelines
(WCAG) 2.2*. https://www.w3.org/TR/WCAG22/

---

## AI acknowledgement

Generative AI (Claude) was used during development for scaffolding code,
debugging, test design, and discussing design decisions. All AI-assisted work
was reviewed, tested and integrated by me. A completed AI acknowledgement form
is submitted with this assessment.

## Tech stack

Next.js (App Router) · React · TypeScript · Tailwind CSS · Prisma · SQLite ·
Docker · Playwright · JMeter · Lighthouse
