import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  Feather,
  Image as ImageIcon,
  Layers,
  Lock,
  PenLine,
  Sparkles,
  Upload,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { Wordmark } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeProvider";
import { Button, Card } from "@/components/ui";

const FEATURES = [
  {
    Icon: Sparkles,
    title: "A story bible, without the homework",
    body: "Answer a short visual questionnaire — tap chips, write your own when you want to. Or paste notes you already have and let Inkdrop map them onto the questions for you.",
  },
  {
    Icon: PenLine,
    title: "Chapters drafted from your idea",
    body: "Say what has to happen in chapter 12. Inkdrop writes it in full, grounded in your bible, your voice, and everything that happened before.",
  },
  {
    Icon: Layers,
    title: "Context that scales past chapter 3",
    body: "A hidden rolling summary keeps continuity across a whole novel, so the model remembers book one without you pasting it in every time.",
  },
  {
    Icon: Lock,
    title: "Lock what's finished",
    body: "A locked chapter can't be edited, regenerated or deleted — revising chapter 8 never quietly rewrites the chapter 9 you were happy with.",
  },
  {
    Icon: ImageIcon,
    title: "Cover studio",
    body: "Get art directions drawn from your own story, generate a cover, and put it on a real EPUB with a proper title page.",
  },
  {
    Icon: BookOpen,
    title: "Export a finished book",
    body: "Any chapter or the whole manuscript, as Markdown, PDF or EPUB. Take your project with you as a portable file whenever you like.",
  },
];

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Wordmark href={null} />
          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-muted">
              <Feather className="h-3.5 w-3.5" />
              Bring your own model — Claude, GPT, OpenRouter or NVIDIA NIM
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Write the novel you keep describing to people
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-ink-muted">
              Inkdrop Studio turns the story in your head into a working story
              bible, then drafts full chapters from your ideas — in your voice,
              with your continuity, all the way to an exportable book.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/register">
                <Button size="lg">Start writing free</Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="secondary">
                  I already have an account
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-ink-subtle">
              No credit card. You supply your own model API key, so you pay the
              provider directly and nothing sits in the middle.
            </p>
          </div>
        </section>

        <section className="border-y border-line bg-surface/60 py-16">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <h2 className="mb-2 text-center text-2xl font-semibold tracking-tight text-ink">
              Everything between the idea and the manuscript
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-ink-muted">
              Not a chatbot with a writing prompt — a workspace that actually
              holds your book.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ Icon, title, body }) => (
                <Card key={title} className="p-5">
                  <Icon className="mb-3 h-5 w-5 text-accent" />
                  <h3 className="mb-1.5 text-sm font-semibold text-ink">{title}</h3>
                  <p className="text-sm leading-relaxed text-ink-muted">{body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto w-full max-w-3xl px-4 text-center sm:px-6">
            <Upload className="mx-auto mb-4 h-6 w-6 text-ink-subtle" />
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              Already have chapters written?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-ink-muted">
              Upload them in bulk, mark what&rsquo;s a draft and what&rsquo;s
              final, and Inkdrop will pick up from wherever you actually are —
              you don&rsquo;t have to start at chapter one.
            </p>
            <Link href="/register" className="mt-7 inline-block">
              <Button size="lg">Create your workspace</Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 text-xs text-ink-subtle sm:flex-row sm:px-6">
          <Wordmark href={null} size={20} />
          <p>Your work stays yours. Export the whole project any time.</p>
        </div>
      </footer>
    </>
  );
}
