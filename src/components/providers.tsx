"use client";

import { NhostProvider } from "@nhost/react";
import type { ReactNode } from "react";
import { nhost } from "@/lib/nhost";

export function Providers({ children }: { children: ReactNode }) {
  return <NhostProvider nhost={nhost}>{children}</NhostProvider>;
}
