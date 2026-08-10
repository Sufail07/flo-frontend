"use client";

import { NhostClient } from "@nhost/react";

const subdomain = process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN ?? "local";
const region = process.env.NEXT_PUBLIC_NHOST_REGION ?? undefined;

export const nhost = new NhostClient({
  subdomain,
  ...(region ? { region } : {}),
});

export const BACKEND_URL = "https://local.hasura.local.nhost.run/v1";
