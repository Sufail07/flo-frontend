"use client";

import { useAccessToken, useAuthenticationStatus } from "@nhost/react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const accessToken = useAccessToken();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !accessToken)) {
      router.replace("/login");
    }
  }, [isAuthenticated, accessToken, isLoading, router]);

  if (isLoading || !accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-fg-secondary">
        <span className="size-4 animate-spin rounded-full border-2 border-border-strong border-t-accent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;
  return <>{children}</>;
}
