"use client";

import { useAuthenticationStatus, useSignInEmailPassword } from "@nhost/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const router = useRouter();
  const { signInEmailPassword, isLoading: signingIn, isError, error } = useSignInEmailPassword();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace("/workflows");
  }, [isAuthenticated, isLoading, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const { isSuccess } = await signInEmailPassword(email, password);
    if (isSuccess) router.replace("/workflows");
  }

  if (isLoading) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="5" cy="6" r="2" />
              <circle cx="12" cy="18" r="2" />
              <circle cx="19" cy="6" r="2" />
              <path d="M7 7l4 9M17 7l-4 9" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-fg">AgentFlow</h1>
          <p className="mt-1 text-sm text-fg-secondary">Visual agentic workflow builder</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-fg-secondary">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@org.test"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-fg-secondary">
              Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
            />
          </div>

          {isError && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error?.message ?? "Sign in failed"}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={signingIn}>
            {signingIn ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-fg-muted">
          Dev credentials: alice@acme.test / DevPass12345!
        </p>
      </div>
    </div>
  );
}
