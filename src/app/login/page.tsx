import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { enabledOAuthProviders } from "@/lib/auth";
import { Wordmark } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeProvider";
import { Display, Kicker, LoadingState } from "@/components/ui";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main id="main" className="flex min-h-screen flex-col">
      <nav className="flex items-center gap-4 border-b-2 border-line px-4 py-3.5 sm:px-10">
        <Wordmark />
        <ThemeToggle className="ml-auto" />
      </nav>
      <div className="flex flex-1 items-center px-4 py-12 sm:px-10">
        <div className="w-full max-w-[400px]">
          <Kicker className="mb-3">Sign in</Kicker>
          <Display size={44}>Welcome back.</Display>
          <p className="mt-4 mb-8 text-ink-muted">
            Sign in to get back to your manuscript.
          </p>
          <Suspense fallback={<LoadingState />}>
            <LoginForm oauth={enabledOAuthProviders} />
          </Suspense>
          <p className="mt-6 text-sm text-ink-muted">
            New here?{" "}
            <Link href="/register" className="font-semibold text-accent underline underline-offset-4">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
