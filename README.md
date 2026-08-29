# Inkdrop Studio

A prototype web app for ideating a novel, building a story bible through a
visual onboarding questionnaire, and generating full chapters with an LLM
using that story bible plus prior-chapter context — plus a cover studio,
storyboard, and multi-format export.

## What's here

- **Onboarding wizard** (`/project/[id]/onboarding`) — a condensed set of the
  most important story questions, grouped into 10 short steps. Every
  question is a tap-to-select chip set (or a text prompt) with an "or write
  your own" field. Skip straight to the chapters and fill in the bible
  later if you'd rather.
- **Story Bible editor** (`/project/[id]/bible`) — every onboarding answer,
  editable anytime. Unanswered essential questions show a red asterisk.
  Already have notes? Paste text or upload a `.md`/`.txt` file and Inkdrop
  maps what it can onto the questionnaire (never overwriting answers you've
  already given).
- **Chapters** (`/project/[id]/chapters`) — list or grid view. Create a
  chapter from just an idea, or switch to "I already have this chapter" and
  paste it in directly with a Draft/Final status. Upload one or many
  `.txt`/`.md` files as chapters in bulk (you set title + status per file
  before import). Each chapter has a lock icon — a locked chapter's title,
  idea, and content are protected from edits, regeneration, and deletion
  until unlocked, so revising chapter 8 can't accidentally ripple into
  chapter 9 you've already finished.
- **Chapter workspace** — an idea box + **Generate**, which streams a full
  chapter draft assembled from the story bible, the hidden story-so-far
  summary, and recent chapters in full. Edit/Preview tabs, a "suggest a
  title" action for untitled chapters, and MD/PDF/EPUB export buttons per
  chapter.
- **Storyboard** (`/project/[id]/storyboard`) — a freeform corkboard: drag
  sticky notes around, sketch with a pen tool, and ask the floating agent
  things like "what do you think of the story so far?" — it reads your
  notes, any sketch on the canvas (sent as an image to a vision-capable
  model), your story bible, and the story-so-far summary.
- **Book & Cover** (`/project/[id]/book`) — set the book's title/subtitle/
  author (separate from the project's internal name), a Cover Studio that
  recommends art directions from your story bible and chapters, generates a
  cover image, and exports the whole book as EPUB (with cover + title
  page), PDF, or Markdown.
- **Settings** (`/project/[id]/settings`) — AI provider/model/API key,
  image-generation provider for covers, a toggle + viewer for the hidden
  rolling story summary, and a project export (`.inkdrop.json`) button. A
  compact status bar at the top of every project page also shows the
  current model and context window, editable inline.
- **Home page** — asks for a **project name** first (the book's own title is
  set separately, later, in Book & Cover) and lets you **import** a
  previously exported `.inkdrop.json` project.

Data is stored as plain JSON files under `data/projects/*.json` — no
database setup required for this prototype. Each file is the entire project
(story bible, chapters, settings, book meta, storyboard, rolling summary).

## The `.inkdrop.json` project format

`GET /api/projects/[id]/export` downloads a project as `.inkdrop.json` — the
full `Project` object from `src/lib/types.ts` (story bible, chapters,
settings, API keys, book meta, storyboard). `POST /api/projects/import`
accepts that same shape and always creates a **new** project with a fresh
id, so importing never overwrites anything. This is also how you'd move a
project between two machines running Inkdrop.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

To generate real chapters you need an API key. Either:

- Paste it into **Settings** within a project (stored in that project's JSON
  file), or
- Copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY` and/or
  `OPENAI_API_KEY` — used as a fallback when a project has no key of its own.

Cover art generation always goes through the OpenAI Images API (`gpt-image-1`
or `dall-e-3`) since Claude doesn't currently offer an image-generation API —
set an OpenAI key under Settings → "Cover art / image generation" even if
your writing model is Claude.

## Adding another AI provider

The provider interface lives in `src/lib/ai/types.ts`. To add a new
provider:

1. Create `src/lib/ai/providers/<name>.ts` implementing `AIProvider`
   (`generateChapter` should stream text via `onChunk`, resolve with the
   full text, and — if the underlying API supports vision — honor the
   optional `imageDataUrl` param, used by the storyboard agent; see
   `claude.ts` / `openai.ts`).
2. Register it in `src/lib/ai/providers/index.ts`'s `PROVIDERS` map and add
   its id to `AIProviderId` in `src/lib/types.ts`.
3. Add its display info (label, models, env var) to `PROVIDER_INFO` in
   `src/app/project/[id]/settings/page.tsx`.

## Where the "write the chapter" logic lives

`src/lib/ai/promptBuilder.ts` — `buildChapterPrompt()` assembles:

- A rendered brief of the story bible (`renderStoryBible`).
- Prior-chapter context (`renderPriorChapters`): the N most recent chapters
  in full text (N = the "full context window" setting, editable from the
  top bar or Settings). Older chapters are represented by the **hidden
  rolling summary** (`project.rollingSummary`, see below) rather than a
  naive text truncation.
- The chapter's own `idea` field.

## The hidden rolling story summary

After each successful generation, `src/lib/ai/summarize.ts` asks the model
for a short continuity note (characters, what changed) and
`project.rollingSummary.entries` appends it — keyed by chapter index, so
regenerating a chapter replaces its own entry. It's never shown in the
chapters themselves; it exists purely as background context so a 200-chapter
novel doesn't need to stuff every prior chapter's full text into the prompt.
Toggle it off, or read the raw log, from Settings.

## Export internals

`src/lib/export/{markdown,pdf,epub}.ts` build a chapter or a whole book from
a plain `{ title, author?, coverImageDataUrl?, chapters }` shape:

- **Markdown**: trivial string templating.
- **PDF**: [`pdfkit`](https://pdfkit.org/) — pure JS, no headless browser.
- **EPUB**: [`epub-gen-memory`](https://www.npmjs.com/package/epub-gen-memory),
  which only accepts a fetchable `http(s)` URL for a cover image (not an
  in-memory buffer or `data:` URL). Since the cover lives as a `data:` URL in
  the project JSON, `epub.ts` briefly spins up a loopback HTTP server to
  serve the cover bytes to the library, then tears it down — see
  `withLoopbackImageServer`.

## What's intentionally simplified (this is a UX/flow prototype)

- Auth / multi-user — everything is local, single-user.
- A "real" database — JSON files are fine for a prototype, not for scale.
- The storyboard's "drawing" is a simple pen tool on an HTML canvas, not
  handwriting/sketch OCR — when you ask the agent a question, the canvas is
  sent to the model as an image (if your provider/model supports vision), so
  it can genuinely look at rough diagrams or arrows, but it isn't
  transcribing handwritten prose.
- Deployment config — this is a plain Next.js app, deployable anywhere that
  runs Next (including Vercel) once you're ready.
# inkdrop-studio
