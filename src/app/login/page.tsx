import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { enabledOAuthProviders } from "@/lib/auth";
import { Wordmark } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeProvider";
import { Card, LoadingState } from "@/components/ui";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main id="main" className="relative flex min-h-screen flex-col">
      <div className="hero-glow" aria-hidden />
      <div className="relative flex items-center justify-between px-5 py-4 sm:px-8">
        <Wordmark />
        <ThemeToggle />
      </div>
      <div className="relative flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-[380px]">
          <div className="mb-6 text-center">
            <h1 className="disp text-2xl">Welcome back</h1>
            <p className="mt-1.5 text-[13px] text-ink-muted">
              Sign in to get back to your manuscript.
            </p>
          </div>
          <Card className="p-5">
            <Suspense fallback={<LoadingState />}>
              <LoginForm oauth={enabledOAuthProviders} />
            </Suspense>
          </Card>
          <p className="mt-5 text-center text-[13px] text-ink-muted">
            New here?{" "}
            <Link href="/register" className="font-medium text-accent hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
