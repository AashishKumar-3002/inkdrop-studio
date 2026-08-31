import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/Brand";
import { ThemeToggle } from "@/components/ThemeProvider";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Create an account" };

export default function RegisterPage() {
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
        <h1 className="mb-1 text-center text-xl font-semibold text-ink">
          Start your first book
        </h1>
        <p className="mb-6 text-center text-sm text-ink-muted">
          Free to set up. Bring your own model API key.
        </p>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
