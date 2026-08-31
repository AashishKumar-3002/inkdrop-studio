import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { enabledOAuthProviders } from "@/lib/auth";
import { Wordmark } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeProvider";
import { LoadingState } from "@/components/ui";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main
      id="main"
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
    >
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Wordmark size={32} />
        </div>
        <h1 className="mb-1 text-center text-xl font-semibold text-ink">Welcome back</h1>
        <p className="mb-6 text-center text-sm text-ink-muted">
          Sign in to get back to your manuscript.
        </p>
        <Suspense fallback={<LoadingState />}>
          <LoginForm oauth={enabledOAuthProviders} />
        </Suspense>
        <p className="mt-6 text-center text-sm text-ink-muted">
          New here?{" "}
          <Link href="/register" className="font-medium text-accent hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
