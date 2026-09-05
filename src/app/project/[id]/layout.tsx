"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ProjectTopBar from "@/components/ProjectTopBar";
import { Wordmark } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeProvider";
import { UserMenu } from "@/components/UserMenu";
import { api } from "@/lib/api";
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
  const [crumb, setCrumb] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getProject(params.id)
      .then((p) => {
        if (!cancelled) setCrumb(p.book?.title || p.name);
      })
      .catch(() => {
        // The page itself reports load failures; the breadcrumb just stays
        // empty rather than showing a second error.
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="flex items-center gap-4 border-b-2 border-line px-4 py-3 sm:px-10">
        <Wordmark href="/dashboard" />
        {crumb && (
          <span className="lbl hidden truncate md:block" title={crumb}>
            {crumb}
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden sm:block">
            <ThemeToggle />
          </span>
          <UserMenu />
        </div>
      </nav>

      {!isOnboarding && (
        <nav aria-label="Project sections" className="overflow-x-auto border-b-2 border-line">
          <ul className="flex min-w-max">
            {TABS.map((tab) => {
              const href = `/project/${params.id}/${tab.href}`;
              const active = pathname?.startsWith(href);
              return (
                <li key={tab.href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block whitespace-nowrap border-r border-hair px-5 py-3 font-display text-[12px] font-extrabold uppercase tracking-[0.09em] transition-colors",
                      active
                        ? "bg-accent text-accent-ink"
                        : "text-ink-muted hover:text-ink"
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

      {!isOnboarding && <ProjectTopBar projectId={params.id} />}
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
