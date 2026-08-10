"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { RequireAuth } from "@/components/auth/require-auth";
import { BuilderHeader } from "@/components/builder/builder-header";
import { Palette } from "@/components/builder/palette";
import { WorkflowCanvas } from "@/components/builder/workflow-canvas";
import { Inspector } from "@/components/builder/inspector";
import { RunMonitor } from "@/components/builder/run-monitor";
import { useBuilder } from "@/store/builder";

function Builder() {
  const { id } = useParams<{ id: string }>();
  const { load, workflow, activeRun, loading, runError, setRunError } = useBuilder();
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    load(id).catch((e) =>
      setLoadError(e instanceof Error ? e.message : "Failed to load workflow"),
    );
  }, [id, load]);

  useEffect(() => {
    if (!runError) return;
    const t = setTimeout(() => setRunError(null), 6000);
    return () => clearTimeout(t);
  }, [runError, setRunError]);

  return (
    <div className="flex h-screen flex-col bg-bg">
      <BuilderHeader />

      {runError && (
        <div className="border-b border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          {runError}
        </div>
      )}
      {loadError && (
        <div className="border-b border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          {loadError}
        </div>
      )}

      {activeRun && <RunMonitor runId={activeRun.id} />}

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-fg-secondary">
          <span className="size-4 animate-spin rounded-full border-2 border-border-strong border-t-accent" />
        </div>
      ) : !workflow ? (
        <div className="flex flex-1 items-center justify-center text-sm text-fg-muted">
          Workflow not found.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <aside className="w-60 shrink-0 border-r border-border bg-surface">
            <Palette />
          </aside>
          <main className="min-w-0 flex-1">
            <WorkflowCanvas />
          </main>
          <aside className="w-80 shrink-0 border-l border-border bg-surface">
            <Inspector />
          </aside>
        </div>
      )}
    </div>
  );
}

export default function WorkflowPage() {
  return (
    <RequireAuth>
      <Builder />
    </RequireAuth>
  );
}
