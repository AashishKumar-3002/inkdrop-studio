"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import ProjectTopBar from "@/components/ProjectTopBar";
import { Wordmark } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeProvider";
import { UserMenu } from "@/components/UserMenu";
import { api } from "@/lib/api";
import { Container, cn } from "@/components/ui";

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
        // The page reports load failures; the breadcrumb just stays empty.
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/80 backdrop-blur-md">
        <Container className="flex h-14 items-center gap-2">
          <Wordmark href="/dashboard" />
          {crumb && (
            <>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-subtle" aria-hidden />
              <span className="min-w-0 truncate text-[13px] font-medium" title={crumb}>
                {crumb}
              </span>
            </>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="hidden sm:block">
              <ThemeToggle />
            </span>
            <UserMenu />
          </div>
        </Container>

        {!isOnboarding && (
          <Container>
            <nav aria-label="Project sections" className="-mb-px overflow-x-auto">
              <ul className="flex min-w-max gap-1">
                {TABS.map((tab) => {
                  const href = `/project/${params.id}/${tab.href}`;
                  const active = pathname?.startsWith(href);
                  return (
                    <li key={tab.href}>
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "block whitespace-nowrap border-b-2 px-2.5 pb-2.5 pt-1 text-[13px] transition-colors",
                          active
                            ? "border-ink font-medium text-ink"
                            : "border-transparent text-ink-muted hover:text-ink"
                        )}
                      >
                        {tab.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </Container>
        )}
      </header>

      {!isOnboarding && <ProjectTopBar projectId={params.id} />}
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
