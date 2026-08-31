"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ProjectTopBar from "@/components/ProjectTopBar";
import { Wordmark } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeProvider";
import { UserMenu } from "@/components/UserMenu";
import { cn } from "@/components/ui";

const TABS = [
  { href: "bible", label: "Story Bible" },
  { href: "chapters", label: "Chapters" },
  { href: "storyboard", label: "Storyboard" },
  { href: "book", label: "Book & Cover" },
  { href: "settings", label: "Settings" },
];

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams<{ id: string }>();
  const isOnboarding = pathname?.includes("/onboarding");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg p-1 text-ink-subtle transition-colors hover:text-ink"
              aria-label="Back to your projects"
              title="Back to your projects"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Wordmark href="/dashboard" size={22} className="hidden sm:inline-flex" />
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden md:inline-flex" />
            <UserMenu />
          </div>
        </div>

        {!isOnboarding && (
          <nav
            aria-label="Project sections"
            className="mx-auto w-full max-w-6xl overflow-x-auto px-4 sm:px-6"
          >
            <ul className="flex gap-1 pb-2">
              {TABS.map((tab) => {
                const href = `/project/${params.id}/${tab.href}`;
                const active = pathname?.startsWith(href);
                return (
                  <li key={tab.href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "block whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-accent text-accent-ink font-medium"
                          : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                      )}
                    >
                      {tab.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </header>

      {!isOnboarding && <ProjectTopBar projectId={params.id} />}
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
