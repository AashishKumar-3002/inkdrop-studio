import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeProvider";
import { Display, Kicker } from "@/components/ui";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <main id="main" className="flex min-h-screen flex-col">
      <nav className="flex items-center gap-4 border-b-2 border-line px-4 py-3.5 sm:px-10">
        <Wordmark />
        <ThemeToggle className="ml-auto" />
      </nav>
      <div className="flex flex-1 items-center px-4 py-12 sm:px-10">
        <div className="w-full max-w-[400px]">
          <Kicker className="mb-3">Create an account</Kicker>
          <Display size={44}>Start your first book.</Display>
          <p className="mt-4 mb-8 text-ink-muted">
            Free to set up. Bring your own model API key.
          </p>
          <RegisterForm />
          <p className="mt-6 text-sm text-ink-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-accent underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
