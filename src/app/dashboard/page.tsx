import type { Metadata } from "next";
import { Wordmark } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeProvider";
import { UserMenu } from "@/components/UserMenu";
import { Container } from "@/components/ui";
import { DashboardClient } from "./DashboardClient";

export const metadata: Metadata = { title: "Your projects" };

export default function DashboardPage() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-paper/80 backdrop-blur-md">
        <Container className="flex h-14 items-center justify-between gap-4">
          <Wordmark href="/dashboard" />
          <div className="flex items-center gap-2">
            <span className="hidden sm:block">
              <ThemeToggle />
            </span>
            <UserMenu />
          </div>
        </Container>
      </header>
      <main id="main" className="flex-1 py-8 sm:py-10">
        <Container>
          <DashboardClient />
        </Container>
      </main>
    </>
  );
}
