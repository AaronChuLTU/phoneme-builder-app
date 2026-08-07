# Phoneme Activity Builder

A web app that lets Speech Pathology teachers build phoneme-based classroom
activities and export them as standalone HTML files students can open in any
browser.

**Aaron Truong Chu** · Student number 22298193
La Trobe University · Assessment 1 — Frontend Builder

## What it does

Teachers configure an activity, preview it, and download a single `.html`
file. That file contains everything — markup, styling and game logic — so it
runs offline with nothing installed.

- **Wordle** — each tile is one phoneme instead of one letter. Standard
  green / yellow / grey feedback, English spelling revealed on a win.
- **Word Search** — each grid cell holds one phoneme. Selectable by drag,
  by two clicks, or by keyboard.

Built around the HCE phoneme inventory supplied with the assessment brief.

## Running it

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

## Pages

| Route          | Purpose                                          |
| -------------- | ------------------------------------------------ |
| `/`            | Introduction and links to both builders          |
| `/wordle`      | Build and download a phoneme Wordle              |
| `/word-search` | Build and download a phoneme word search         |
| `/about`       | Scope, author details, walkthrough video         |
| `/settings`    | Theme and text size, stored in cookies           |

## Structure

```
app/         one folder per route, plus the shared layout
components/  Header, NavBar, Footer, PageHeader, PhonemeKeyboard, ThemeSync
lib/         phoneme data, puzzle generation, HTML generators, preferences
```

## Key design decisions

**The builder is not the game.** `generateWordle.js` and
`generateWordSearch.js` are pure functions that take settings and return a
complete HTML document as a string. Students may be on locked-down school
machines, so the output carries its own CSS and JavaScript inline and makes no
network requests.

**Shared, stateless components.** `PhonemeKeyboard` holds no state — both
builders use it with different props. `PageHeader` exists so page title
spacing is defined once rather than repeated across five pages.

**Seeded puzzle generation.** `buildPuzzle()` takes a seed instead of calling
`Math.random()`, so the preview and the downloaded file are always the same
puzzle.

**Preferences in cookies, not localStorage.** The server can read cookies and
render the correct theme in the first response, avoiding a visible flash of
the wrong theme on every page load.

## Known limitations

- Wordle feedback uses colour alone; a shape indicator would be the next
  accessibility improvement
- The word search uses a fixed word list, as the brief permits at this stage
- Custom Wordle words are capped at eight phonemes
- Nothing is saved between sessions — persistence arrives in Assessment 2

## AI acknowledgement

Generative AI (Claude) was used during development, mainly for scaffolding
component code, debugging, and discussing design decisions. All AI-assisted
work was reviewed, tested and integrated by me. A completed AI acknowledgement
form is submitted with this assessment.

## Tech stack

Next.js (App Router) · React · Tailwind CSS · TypeScript
