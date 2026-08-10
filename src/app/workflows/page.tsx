"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUserData } from "@nhost/react";
import { RequireAuth } from "@/components/auth/require-auth";
import { Button } from "@/components/ui/button";
import { createWorkflow, fetchMemberships, fetchWorkflows } from "@/lib/graphql";
import type { Workflow } from "@/lib/types";

function WorkflowList() {
  const router = useRouter();
  const user = useUserData();
  const [workflows, setWorkflows] = useState<Workflow[] | null>(null);
  const [orgs, setOrgs] = useState<{ id: string; name: string; role: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [memberships, wfs] = await Promise.all([fetchMemberships(), fetchWorkflows()]);
        setOrgs(
          memberships.map((m) => ({
            id: m.org_id,
            name: m.organization.name,
            role: m.role,
          })),
        );
        setWorkflows(wfs);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
  }, []);

  const writableOrgs = orgs.filter((o) => o.role === "owner" || o.role === "editor");
  const canCreate = writableOrgs.length > 0 && !!user?.id;

  async function onNewWorkflow() {
    const org = writableOrgs[0];
    if (!canCreate || !org || !user?.id || creating) return;
    setCreating(true);
    try {
      const id = await createWorkflow(org.id, "Untitled workflow", user.id);
      router.push(`/workflows/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create workflow");
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Workflows</h1>
          <p className="mt-1 text-sm text-fg-secondary">
            Build, run, and monitor your agentic workflows.
          </p>
        </div>
        <Button
          onClick={onNewWorkflow}
          disabled={!canCreate || creating}
          title={!canCreate ? "You need owner or editor access to create workflows" : undefined}
        >
          {creating ? "Creating…" : "New workflow"}
        </Button>
      </header>

      {orgs.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {orgs.map((o) => (
            <span
              key={o.id}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-fg-secondary"
            >
              <span className="size-1.5 rounded-full bg-accent" />
              {o.name}
              <span className="text-fg-muted">· {o.role}</span>
            </span>
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {workflows === null && !error && (
        <div className="flex items-center gap-2 py-16 text-sm text-fg-secondary">
          <span className="size-4 animate-spin rounded-full border-2 border-border-strong border-t-accent" />
          Loading workflows…
        </div>
      )}

      {workflows && workflows.length === 0 && (
        <div className="rounded-xl border border-dashed border-border-strong py-16 text-center">
          <p className="text-sm text-fg-secondary">No workflows yet.</p>
          <p className="mt-1 text-xs text-fg-muted">
            Seed the database with <code className="font-mono">node scripts/seed-dev-data.mjs</code>{" "}
            to create the sample workflow.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {workflows?.map((w) => {
          const org = orgs.find((o) => o.id === w.org_id);
          const steps = w.steps?.length ?? 0;
          return (
            <Link
              key={w.id}
              href={`/workflows/${w.id}`}
              className="group flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-border-strong hover:bg-surface-2"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-surface-3 text-fg-secondary">
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="5" cy="6" r="2" />
                    <circle cx="12" cy="18" r="2" />
                    <circle cx="19" cy="6" r="2" />
                    <path d="M7 7l4 9M17 7l-4 9" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-fg group-hover:text-accent-hover">{w.name}</div>
                  <div className="text-xs text-fg-muted">
                    {steps} step{steps === 1 ? "" : "s"}
                    {org ? ` · ${org.name}` : ""}
                    {w.is_active ? "" : " · inactive"}
                  </div>
                </div>
              </div>
              <div className="text-fg-muted transition-colors group-hover:text-fg">
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function WorkflowsPage() {
  return (
    <RequireAuth>
      <WorkflowList />
    </RequireAuth>
  );
}
