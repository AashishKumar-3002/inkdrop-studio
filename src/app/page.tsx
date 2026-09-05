import Link from "next/link";
import { redirect } from "next/navigation";
import { Image as ImageIcon, Layers, Lock, PenLine, Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { Wordmark } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeProvider";
import { Button, Display, Kicker, Rule, StatBand } from "@/components/ui";

const FEATURES = [
  {
    Icon: Sparkles,
    title: "A story bible, without the homework",
    body: "Answer a short visual questionnaire — tap chips, write your own when you want to. Or paste the notes you already have and let Inkdrop map them onto the questions for you.",
  },
  {
    Icon: PenLine,
    title: "Chapters drafted from your idea",
    body: "Say what has to happen in chapter 12. Inkdrop writes it in full, grounded in your bible, your voice, and everything that happened before it.",
  },
  {
    Icon: Layers,
    title: "Context that scales past chapter three",
    body: "A hidden rolling summary carries continuity across a whole novel, so the model remembers book one without you pasting it back in every time.",
  },
  {
    Icon: Lock,
    title: "Lock what's finished",
    body: "A locked chapter can't be edited, regenerated or deleted — revising chapter 8 never quietly rewrites the chapter 9 you were happy with.",
  },
  {
    Icon: ImageIcon,
    title: "Cover studio, then a real book",
    body: "Art directions drawn from your own story, a generated cover, and a proper title page on a valid EPUB. Any chapter or the whole manuscript, whenever you like.",
  },
];

const STATS = [
  { value: "10", label: "Bible sections, mostly taps" },
  { value: "4", label: "Providers — bring your own key" },
  { value: "3", label: "Export formats: MD · PDF · EPUB" },
  { value: "0", label: "Words of yours we keep" },
];

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <>
      <nav className="flex items-center gap-5 border-b-2 border-line px-4 py-3.5 sm:px-10">
        <Wordmark href={null} />
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span className="hidden sm:block">
            <ThemeToggle />
          </span>
          <Link href="/login">
            <Button variant="secondary" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </nav>

      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="px-4 py-16 sm:px-10 sm:py-24">
          <Display size={84} className="max-w-[15ch]">
            Write the novel you keep describing to people.
          </Display>
          <p className="mt-10 max-w-[58ch] text-[17px] leading-[var(--leading)]">
            Inkdrop Studio turns the story in your head into a working story bible,
            then drafts full chapters from your ideas — in your voice, with your
            continuity, all the way to an exportable book.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link href="/register">
              <Button size="lg">Start writing free</Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="lg">
                I already have an account
              </Button>
            </Link>
          </div>
        </section>

        <Rule />

        <section className="px-4 py-14 sm:px-10">
          <StatBand stats={STATS} />
        </section>

        <Rule />

        {/* Numbered feature rows — the system's ruled-row primitive at
            marketing scale. */}
        <section className="px-4 py-14 sm:px-10">
          <Kicker className="mb-5">What Inkdrop does</Kicker>
          {FEATURES.map(({ Icon, title, body }, i) => (
            <div
              key={title}
              className="grid gap-x-6 gap-y-3 border-t-2 border-line py-5 pl-6 md:grid-cols-[70px_minmax(0,380px)_minmax(0,1fr)] md:items-baseline md:pl-6"
            >
              <p className="rnum">{String(i + 1).padStart(2, "0")}</p>
              <h2 className="flex items-baseline gap-2 text-[22px] leading-tight">
                <Icon className="h-4 w-4 shrink-0 translate-y-0.5" aria-hidden />
                {title}
              </h2>
              <p className="leading-[var(--leading)] text-ink-muted">{body}</p>
            </div>
          ))}
        </section>

        {/* Already-writing band */}
        <section className="grid gap-8 px-4 py-14 sm:px-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <Kicker className="mb-5">Already writing</Kicker>
            <Display as="h2" size={36} className="max-w-[20ch]">
              You don&rsquo;t have to start at chapter one.
            </Display>
            <p className="mt-6 max-w-[44ch] leading-[var(--leading)] text-ink-muted">
              Upload what you have in bulk, mark what&rsquo;s a draft and
              what&rsquo;s final, and Inkdrop picks up from wherever you actually
              are.
            </p>
          </div>
          <figure
            className="hatch flex items-end p-3"
            style={{ aspectRatio: "951/665" }}
            aria-hidden
          >
            <span className="mono bg-paper px-2 py-1 uppercase">
              Your manuscript, imported
            </span>
          </figure>
        </section>

        {/* Poster — the one full-bleed accent block on the page. */}
        <section className="bg-accent px-4 py-12 text-accent-ink sm:px-10">
          <h2 className="disp max-w-[900px] text-[clamp(30px,6vw,52px)]">
            Your work stays yours. Export the whole project any time.
          </h2>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/register">
              <Button
                variant="ghost"
                className="border-accent-ink text-accent-ink hover:bg-[color-mix(in_srgb,white_18%,transparent)]"
              >
                Start writing free
              </Button>
            </Link>
            {["MARKDOWN", "PDF", "EPUB", ".INKDROP.JSON"].map((f) => (
              <span key={f} className="mono">
                {f}
              </span>
            ))}
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-10">
          <Wordmark href={null} size={14} />
          <span className="text-[13px] text-ink-muted">
            Bring your own model — Claude · GPT · OpenRouter · NVIDIA NIM
          </span>
        </footer>
      </main>
    </>
  );
}
