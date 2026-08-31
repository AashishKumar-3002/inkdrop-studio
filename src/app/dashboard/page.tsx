import type { Metadata } from "next";
import { Wordmark } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeProvider";
import { UserMenu } from "@/components/UserMenu";
import { DashboardClient } from "./DashboardClient";

export const metadata: Metadata = { title: "Your projects" };

export default function DashboardPage() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Wordmark href="/dashboard" />
          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <UserMenu />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <DashboardClient />
      </main>
    </>
  );
}
