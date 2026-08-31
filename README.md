# Inkdrop Studio

A multi-user web app for writing a novel: build a story bible through a
visual questionnaire, generate full chapters with an LLM that knows your
book, and export a finished manuscript as Markdown, PDF or EPUB.

Next.js 16 (App Router) · TypeScript · Tailwind v4 · PostgreSQL + Drizzle ·
Auth.js.

---

## What's here

- **Accounts** — email/password sign-in, plus Google and GitHub when you
  configure them. Every project belongs to exactly one user, and every API
  route verifies ownership independently.
- **Onboarding wizard** (`/project/[id]/onboarding`) — a condensed set of
  the most important story questions in 10 short steps. Each question is a
  tap-to-select chip set with an "or write your own" field. You can skip it
  and fill the bible in later.
- **Story Bible** (`/project/[id]/bible`) — every answer, editable anytime,
  with a red asterisk on unanswered essentials. Already have notes? Paste
  text or upload a `.md`/`.txt` file and Inkdrop maps what it can onto the
  questionnaire, never overwriting an answer you've already given.
- **Chapters** (`/project/[id]/chapters`) — list or grid view. Create a
  chapter from an idea, or switch to "I already have this chapter" and paste
  it in with a Draft/Final status. Upload many `.txt`/`.md` files at once,
  setting title and status per file. Each chapter has a **lock**: a locked
  chapter's title, idea and content are protected from edits, regeneration
  and deletion — enforced server-side with a 409, not just greyed out in the
  UI — so revising chapter 8 can't quietly ripple into the chapter 9 you
  were happy with.
- **Chapter workspace** — an idea box and **Generate**, which streams a full
  draft built from the story bible, the hidden story-so-far summary, and
  recent chapters in full. Edit/Preview tabs, a Stop button that keeps
  whatever has streamed so far, a "suggest a title" action, and per-chapter
  MD/PDF/EPUB export.
- **Storyboard** (`/project/[id]/storyboard`) — a freeform corkboard: drag
  sticky notes, sketch with a pen (mouse, touch or stylus), and ask the
  agent things like "what do you think of the story so far?". It reads your
  notes, your bible, the story-so-far summary, and — on a vision-capable
  model — the sketch itself, sent as an image.
- **Book & Cover** (`/project/[id]/book`) — the book's title/subtitle/author
  (separate from the project's working name), a Cover Studio that proposes
  art directions from your own story and generates a cover, and whole-book
  export as EPUB (with cover and title page), PDF or Markdown.
- **Settings** (`/project/[id]/settings`) — provider, model, API key,
  cover-art provider, a toggle and viewer for the hidden rolling summary,
  and project export. A status bar on every project page shows the current
  model and context window, editable inline.
- **Dark mode**, keyboard-accessible throughout, and responsive down to
  small phones.

## Getting started

```bash
git clone <your-fork> && cd inkdrop-studio
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

```bash
DATABASE_URL="postgresql://inkdrop:inkdrop@localhost:5432/inkdrop"
AUTH_SECRET="$(openssl rand -base64 32)"
ENCRYPTION_KEY="$(openssl rand -hex 32)"
```

Then create the schema and start:

```bash
npm run db:migrate
npm run dev
```

Open http://localhost:3000, create an account, and start a project.

To generate anything you need a model API key — paste one into **Settings**
inside a project, or set a server-wide fallback (`ANTHROPIC_API_KEY`,
`OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `NVIDIA_API_KEY`). A user's own key
always wins over the server's.

### With Docker

```bash
cp .env.example .env      # set AUTH_SECRET and ENCRYPTION_KEY
docker compose up --build
docker compose exec app npx drizzle-kit migrate
```

That brings up Postgres and the app together. The image is built from
Next's `standalone` output, so it ships only the modules the server
actually imports.

## AI providers

Four are built in, all selectable per project:

| Provider | Key | Notes |
| --- | --- | --- |
| **Claude (Anthropic)** | `ANTHROPIC_API_KEY` | Native SDK, vision on every listed model |
| **OpenAI** | `OPENAI_API_KEY` | Also the only provider used for cover art |
| **OpenRouter** | `OPENROUTER_API_KEY` | One key, hundreds of models (`vendor/model` ids) |
| **NVIDIA NIM** | `NVIDIA_API_KEY` | Hosted open models; point `NVIDIA_NIM_BASE_URL` at your own NIM container to self-host |

OpenAI, OpenRouter and NVIDIA all speak the OpenAI Chat Completions
protocol, so they share one streaming implementation
(`src/lib/ai/providers/openaiCompatible.ts`) that differs only by base URL,
model list and headers. Anthropic has its own SDK and content-block format,
so it gets its own module.

Cover art always goes through the OpenAI Images API whatever your writing
model is, because Anthropic has no image-generation endpoint.

### Adding another provider

1. If it's OpenAI-compatible, that's one small file — copy
   `providers/openrouter.ts` and change the base URL, models and labels.
   Otherwise implement `AIProvider` from `src/lib/ai/types.ts` directly
   (stream via `onChunk`, resolve with the full text, honour `signal`, and
   support the optional `imageDataUrl` if the API has vision).
2. Add its id to `AI_PROVIDER_IDS` in `src/lib/types.ts`.
3. Register it in `providers/index.ts` — `PROVIDERS` and
   `ENV_VAR_BY_PROVIDER`.

The settings UI reads the catalogue from `/api/providers`, so it picks up
the new provider with no UI change at all.

## How generation works

`src/lib/ai/promptBuilder.ts` assembles each prompt from:

- a rendered brief of the story bible;
- prior-chapter context — the N most recent chapters in full (N is the
  "full context window" setting), with everything older represented by the
  **rolling summary** rather than a naive truncation;
- the chapter's own `idea`.

### The hidden rolling summary

After each successful generation, `src/lib/ai/summarize.ts` asks the model
for a short continuity note and stores it against the chapter's index, so
regenerating a chapter replaces its own entry rather than appending a
duplicate. It never appears in the manuscript — it exists so a 200-chapter
novel doesn't have to stuff every prior chapter into the prompt. Toggle it
off or read the raw log in Settings.

## Data model

PostgreSQL via Drizzle (`src/lib/db/schema.ts`). Chapters are a real table —
they grow unboundedly and need ordering and per-row updates — while the
smaller, deeply nested, schema-flexible documents (bible answers, settings,
storyboard, rolling summary) are `jsonb` columns on the project row, since
they're always read and written whole.

`src/lib/repo/projects.ts` is the only module that queries them, and every
function takes a `userId`. There is deliberately no "get project by id" that
skips the owner check: a project that doesn't exist and a project belonging
to someone else both return `null`, so the API answers 404 for both and
never confirms that an id exists.

Migrations are plain SQL in `drizzle/`, generated with `npm run db:generate`
and applied with `npm run db:migrate`.

## Security notes

- **API keys are encrypted at rest** with AES-256-GCM
  (`src/lib/crypto.ts`) under `ENCRYPTION_KEY`. They are never sent to the
  browser: the client receives only `configuredKeys: { openai: true }`, and
  the settings form posts a new key only when the user actually types one.
  Rotating `ENCRYPTION_KEY` makes stored keys undecryptable — users have to
  re-enter them.
- **Exports carry no credentials.** `.inkdrop.json` strips API keys and the
  owner id, so a file you send a collaborator can't leak your account.
  Importing always creates a new project owned by the importer.
- **Every input is validated** with Zod (`src/lib/validation.ts`) before it
  reaches the database.
- `src/proxy.ts` bounces signed-out visitors off app routes, but it's only a
  cookie-presence check for UX. The real boundary is `requireProject()` /
  `requireChapterContext()` in `src/lib/apiHelpers.ts`, which every route
  goes through.

## Coming from the prototype?

The earlier version stored each project as a JSON file under
`data/projects/`. To bring those in: register an account, then

```bash
npm run db:import-legacy -- --email you@example.com
```

It's safe to re-run — it skips projects whose name you already have. API
keys aren't carried across; re-enter them in Settings.

## Project layout

```
src/
  app/
    api/              REST routes (auth, projects, chapters, exports, health)
    project/[id]/     the workspace: onboarding, bible, chapters, storyboard, book, settings
    login, register, dashboard
  components/         UI kit (components/ui), theme, brand, top bar
  lib/
    ai/               providers, prompt builder, summarizer, bible extraction, image gen
    db/               Drizzle schema + connection
    repo/             the only module that queries projects/chapters
    export/           markdown, pdf, epub builders
    auth.ts crypto.ts validation.ts apiHelpers.ts settings.ts
drizzle/              generated SQL migrations
tests/                vitest unit tests
```

## Scripts

```bash
npm run dev              # dev server
npm run build            # production build
npm run start            # run the production build
npm test                 # vitest
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run db:generate      # generate a migration from schema changes
npm run db:migrate       # apply migrations
npm run db:studio        # browse the database
npm run db:import-legacy # import prototype JSON projects
```

## Export internals

`src/lib/export/{markdown,pdf,epub}.ts` build from a plain
`{ title, author?, coverImageDataUrl?, chapters }` shape:

- **Markdown** — string templating.
- **PDF** — [`pdfkit`](https://pdfkit.org/), pure JS, no headless browser.
- **EPUB** — [`epub-gen-memory`](https://www.npmjs.com/package/epub-gen-memory),
  which only accepts a fetchable `http(s)` URL for the cover (not a buffer
  or `data:` URL) **and** infers the image's media type from the URL's file
  extension. Since covers live as data URLs, `epub.ts` briefly serves the
  bytes from a loopback HTTP server at a path ending in `.png`/`.jpg`, then
  tears it down. An extensionless URL silently produces a coverless EPUB,
  which is why `tests/export.test.ts` asserts the cover is really in the
  archive.

## Known limitations

- Cover generation needs an OpenAI key specifically, whatever your writing
  model is.
- The storyboard's pen is a freehand canvas, not sketch OCR. On a
  vision-capable model the agent genuinely sees the drawing; it isn't
  transcribing handwriting.
- There's no collaboration or sharing yet — a project has exactly one owner.
