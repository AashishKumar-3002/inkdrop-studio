"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import ProjectTopBar from "@/components/ProjectTopBar";

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
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
            <Image src="/logo.png" alt="" width={22} height={22} className="rounded-full" />
            Inkdrop Studio
          </Link>
          {!isOnboarding && (
            <nav className="flex gap-1">
              {TABS.map((tab) => {
                const href = `/project/${params.id}/${tab.href}`;
                const active = pathname?.startsWith(href);
                return (
                  <Link
                    key={tab.href}
                    href={href}
                    className={`rounded-lg px-3 py-1.5 text-sm transition ${
                      active
                        ? "bg-neutral-900 text-white"
                        : "text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </header>
      {!isOnboarding && <ProjectTopBar projectId={params.id} />}
      <div className="flex-1 bg-neutral-50">{children}</div>
    </div>
  );
}
