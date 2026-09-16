import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeProvider";
import { Card } from "@/components/ui";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Create an account" };

export default function RegisterPage() {
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
            <h1 className="disp text-2xl">Start your first book</h1>
            <p className="mt-1.5 text-[13px] text-ink-muted">
              Free to set up. Bring your own model API key.
            </p>
          </div>
          <Card className="p-5">
            <RegisterForm />
          </Card>
          <p className="mt-5 text-center text-[13px] text-ink-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
