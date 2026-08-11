"use client";

import { useEffect, useEffectEvent } from "react";
import { createClient, type Client } from "graphql-ws";
import { useAccessToken } from "@nhost/react";
import { nhost } from "@/lib/nhost";

export function useGraphQLSubscription<T>(
  document: string,
  variables: Record<string, unknown> | null,
  onData: (data: T) => void,
  enabled = true,
  onError?: (message: string | null) => void,
) {
  const token = useAccessToken();
  const onDataEvent = useEffectEvent(onData);
  const onErrorEvent = useEffectEvent((message: string | null) => onError?.(message));

  useEffect(() => {
    if (!enabled || !variables || !token) return;

    let client: Client;
    let closed = false;
    const wsUrl = nhost.graphql.wsUrl;

    const cleanup = () => {
      try {
        client?.dispose();
      } catch {
        /* already disposed */
      }
    };

    const connect = () => {
      client = createClient({
        url: wsUrl,
        connectionParams: {
          headers: { Authorization: `Bearer ${token}` },
        },
        lazy: true,
        retryAttempts: 5,
        // Without this a dropped socket is indistinguishable from an idle run:
        // the UI just stops updating and looks like nothing is happening.
        on: {
          connected: () => {
            if (!closed) onErrorEvent(null);
          },
          closed: () => {
            if (!closed) onErrorEvent("Live updates disconnected — reconnecting…");
          },
        },
      });

      const unsubscribe = client.subscribe(
        {
          query: document,
          variables,
        },
        {
          next: (payload) => {
            if (payload?.data && !closed) {
              onErrorEvent(null);
              onDataEvent(payload.data as T);
            }
          },
          error: (err) => {
            if (closed) return;
            const message =
              err instanceof Error
                ? err.message
                : Array.isArray(err)
                  ? err.map((e) => e?.message ?? String(e)).join("; ")
                  : "Live updates failed";
            onErrorEvent(message);
          },
          complete: () => {},
        },
      );

      return () => {
        unsubscribe();
      };
    };

    const cleanupFn = connect();
    return () => {
      closed = true;
      cleanupFn();
      cleanup();
    };
  }, [document, variables, token, enabled]);

  return null;
}
