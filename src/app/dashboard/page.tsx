import type { Metadata } from "next";
import { Wordmark } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeProvider";
import { UserMenu } from "@/components/UserMenu";
import { DashboardClient } from "./DashboardClient";

export const metadata: Metadata = { title: "Your projects" };

export default function DashboardPage() {
  return (
    <>
      <nav className="flex items-center gap-4 border-b-2 border-line px-4 py-3.5 sm:px-10">
        <Wordmark href="/dashboard" />
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden sm:block">
            <ThemeToggle />
          </span>
          <UserMenu />
        </div>
      </nav>
      <main id="main" className="flex-1 px-4 py-10 sm:px-10 sm:py-12">
        <DashboardClient />
      </main>
    </>
  );
}
