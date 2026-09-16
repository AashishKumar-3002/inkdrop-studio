import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Check,
  FileDown,
  Image as ImageIcon,
  Layers,
  Lock,
  PenLine,
  Sparkles,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { Wordmark } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeProvider";
import { Badge, Button, Container } from "@/components/ui";

const FEATURES = [
  {
    Icon: Sparkles,
    title: "A story bible, without the homework",
    body: "A short visual questionnaire you mostly tap through. Or paste the notes you already have and let Inkdrop map them onto the questions.",
  },
  {
    Icon: PenLine,
    title: "Chapters drafted from your idea",
    body: "Say what has to happen in chapter 12. It arrives written in full — in your voice, consistent with everything before it.",
  },
  {
    Icon: Layers,
    title: "Context that scales past chapter three",
    body: "A rolling summary carries continuity across a whole novel, so the model remembers book one without you pasting it back in.",
  },
  {
    Icon: Lock,
    title: "Lock what's finished",
    body: "A locked chapter can't be edited, regenerated or deleted — revising chapter 8 never quietly rewrites chapter 9.",
  },
  {
    Icon: ImageIcon,
    title: "Cover studio",
    body: "Art directions drawn from your own story, a generated cover, and a proper title page on a valid EPUB.",
  },
  {
    Icon: FileDown,
    title: "Export anything, any time",
    body: "One chapter or the whole manuscript, as Markdown, PDF or EPUB. Take the project itself with you as a portable file.",
  },
];

/** Static preview of the chapter list — shows the product, not a grey box. */
function AppPreview() {
  const rows = [
    { n: "01", title: "The Ferry at Dusk", words: "4,182", tone: "final" },
    { n: "02", title: "Salt on Everything", words: "3,940", tone: "final" },
    { n: "03", title: "What the Letter Said", words: "5,006", tone: "draft" },
    { n: "04", title: "What the Sea Kept", words: "1,904", tone: "writing" },
  ] as const;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-overlay">
      <div className="flex items-center gap-2 border-b border-hair bg-surface-2 px-3.5 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="mono ml-2 truncate text-ink-subtle">
          The Salt Road — Chapters
        </span>
      </div>
      <div className="divide-y divide-hair">
        {rows.map((r) => (
          <div
            key={r.n}
            className={`flex items-center gap-3 px-4 py-3 ${
              r.tone === "writing" ? "bg-accent-soft" : ""
            }`}
          >
            <span className="tnum w-6 text-xs text-ink-subtle">{r.n}</span>
            <span className="flex-1 truncate text-[13px] font-medium">{r.title}</span>
            {r.tone === "final" && <Badge tone="success">Final</Badge>}
            {r.tone === "draft" && <Badge>Drafted</Badge>}
            {r.tone === "writing" && <Badge tone="accent">Writing…</Badge>}
            <span className="tnum hidden w-14 text-right text-xs text-ink-muted sm:block">
              {r.words}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-hair bg-surface-2 px-4 py-2.5">
        <span className="text-xs text-ink-muted">
          Claude Sonnet · last 3 chapters in full
        </span>
        <span className="tnum text-xs text-ink-subtle">15,032 words</span>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/80 backdrop-blur-md">
        <Container className="flex h-14 items-center justify-between gap-4">
          <Wordmark href={null} />
          <div className="flex items-center gap-2">
            <span className="hidden sm:block">
              <ThemeToggle />
            </span>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </Container>
      </header>

      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="grid-fade" aria-hidden />
          <div className="hero-glow" aria-hidden />
          <Container className="relative pb-16 pt-16 text-center sm:pt-24">
            <Link
              href="/register"
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-muted shadow-xs transition-colors hover:border-line-strong"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Bring your own model — Claude, GPT, OpenRouter, NVIDIA
              <ArrowRight className="h-3 w-3" />
            </Link>

            <h1 className="disp mx-auto max-w-[16ch] text-[clamp(34px,6.4vw,60px)]">
              Write the novel you keep describing to people
            </h1>
            <p className="mx-auto mt-5 max-w-[54ch] text-[15px] leading-relaxed text-ink-muted sm:text-base">
              Inkdrop turns the story in your head into a working story bible,
              then drafts full chapters from your ideas — in your voice, with
              your continuity, all the way to a finished book.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
              <Link href="/register">
                <Button size="lg">
                  Start writing free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary" size="lg">
                  Sign in
                </Button>
              </Link>
            </div>

            <p className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-ink-subtle">
              {["No credit card", "Your keys, your bill", "Export everything"].map(
                (t) => (
                  <span key={t} className="inline-flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-success" />
                    {t}
                  </span>
                )
              )}
            </p>

            <div className="mx-auto mt-14 max-w-[720px] text-left">
              <AppPreview />
            </div>
          </Container>
        </section>

        {/* Features */}
        <section className="border-t border-line py-16 sm:py-20">
          <Container>
            <div className="mx-auto max-w-[46ch] text-center">
              <h2 className="disp text-[clamp(24px,3.6vw,34px)]">
                Everything between the idea and the manuscript
              </h2>
              <p className="mt-3 text-ink-muted">
                Not a chatbot with a writing prompt — a workspace that actually
                holds your book.
              </p>
            </div>

            <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-xl border border-line bg-surface p-5 shadow-xs transition-shadow duration-200 hover:shadow-card"
                >
                  <div className="mb-3.5 grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface-2 text-accent">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-[15px] font-semibold">{title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-line py-16 sm:py-20">
          <Container>
            <div className="relative overflow-hidden rounded-2xl border border-line bg-surface px-6 py-14 text-center shadow-card">
              <div className="hero-glow" aria-hidden />
              <div className="relative">
                <h2 className="disp mx-auto max-w-[20ch] text-[clamp(24px,3.6vw,32px)]">
                  You don&rsquo;t have to start at chapter one
                </h2>
                <p className="mx-auto mt-3 max-w-[48ch] text-ink-muted">
                  Upload what you already have, mark what&rsquo;s draft and
                  what&rsquo;s final, and pick up from where you actually are.
                </p>
                <Link href="/register" className="mt-7 inline-block">
                  <Button size="lg">
                    Create your workspace
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </Container>
        </section>

        <footer className="border-t border-line py-7">
          <Container className="flex flex-wrap items-center justify-between gap-3">
            <Wordmark href={null} size={14} />
            <span className="text-xs text-ink-subtle">
              Your work stays yours — export the whole project any time.
            </span>
          </Container>
        </footer>
      </main>
    </>
  );
}
