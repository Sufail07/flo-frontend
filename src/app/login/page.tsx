"use client";

import {
  useAuthenticationStatus,
  useSignInEmailPassword,
  useSignUpEmailPassword,
} from "@nhost/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const router = useRouter();
  const {
    signInEmailPassword,
    isLoading: signingIn,
    isError: signInIsError,
    error: signInError,
  } = useSignInEmailPassword();
  const {
    signUpEmailPassword,
    isLoading: signingUp,
    isError: signUpIsError,
    error: signUpError,
    needsEmailVerification,
  } = useSignUpEmailPassword();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace("/workflows");
  }, [isAuthenticated, isLoading, router]);

  const submitting = signingIn || signingUp;
  const isError = mode === "signin" ? signInIsError : signUpIsError;
  const error = mode === "signin" ? signInError : signUpError;

  function toggleMode() {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (mode === "signin") {
      const { isSuccess } = await signInEmailPassword(email, password);
      if (isSuccess) router.replace("/workflows");
    } else {
      const { isSuccess, needsEmailVerification: needsVerification } =
        await signUpEmailPassword(email, password, {
          displayName: displayName.trim() || undefined,
        });
      if (isSuccess && !needsVerification) router.replace("/workflows");
    }
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
          {mode === "signup" && (
            <div>
              <label htmlFor="displayName" className="mb-1.5 block text-xs font-medium text-fg-secondary">
                Name
              </label>
              <Input
                id="displayName"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
          )}
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
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={mode === "signup" ? 9 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
            />
          </div>

          {needsEmailVerification && (
            <p className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
              Check your inbox to verify your email before signing in.
            </p>
          )}
          {isError && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              {error?.message ?? (mode === "signin" ? "Sign in failed" : "Sign up failed")}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting
              ? mode === "signin"
                ? "Signing in…"
                : "Creating account…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-fg-muted">
          {mode === "signin" ? (
            <>
              New to AgentFlow?{" "}
              <button
                type="button"
                onClick={toggleMode}
                className="font-medium text-accent hover:text-accent-hover"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={toggleMode}
                className="font-medium text-accent hover:text-accent-hover"
              >
                Sign in
              </button>
            </>
          )}
        </p>

        <p className="mt-6 text-center text-xs text-fg-muted">
          Dev credentials: alice@acme.test / DevPass12345!
        </p>
      </div>
    </div>
  );
}
