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
) {
  const token = useAccessToken();
  const onDataEvent = useEffectEvent(onData);

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
      });

      const unsubscribe = client.subscribe(
        {
          query: document,
          variables,
        },
        {
          next: (payload) => {
            if (payload?.data && !closed) onDataEvent(payload.data as T);
          },
          error: () => {},
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
