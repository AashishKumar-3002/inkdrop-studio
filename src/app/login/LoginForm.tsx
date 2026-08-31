"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button, Card, Field, Input } from "@/components/ui";

export function LoginForm({
  oauth,
}: {
  oauth: { google: boolean; github: boolean };
}) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setBusy(false);
    if (res?.error) {
      // Auth.js reports every credential failure identically; keep the
      // message vague so this form can't be used to probe for accounts.
      setError("That email and password combination didn't work.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  const hasOAuth = oauth.google || oauth.github;

  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {error && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full justify-center" loading={busy}>
          Sign in
        </Button>
      </form>

      {hasOAuth && (
        <>
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs text-ink-subtle">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <div className="space-y-2">
            {oauth.google && (
              <Button
                variant="secondary"
                className="w-full justify-center"
                onClick={() => signIn("google", { callbackUrl })}
              >
                Continue with Google
              </Button>
            )}
            {oauth.github && (
              <Button
                variant="secondary"
                className="w-full justify-center"
                onClick={() => signIn("github", { callbackUrl })}
              >
                Continue with GitHub
              </Button>
            )}
          </div>
        </>
      )}
    </Card>
  );
}
