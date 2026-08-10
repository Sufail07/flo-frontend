"use client";

import Link from "next/link";
import { useState } from "react";
import { useBuilder } from "@/store/builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

export function BuilderHeader() {
  const { workflow, isRunning, run, quota, activeRun, role, saveWorkflow } = useBuilder();
  const [name, setName] = useState<string | null>(null);

  const pct = quota && quota.limit > 0 ? Math.min(100, Math.round((quota.used / quota.limit) * 100)) : 0;
  const exhausted = quota !== null && quota.used >= quota.limit;
  const nearLimit = quota !== null && !exhausted && (quota.used / quota.limit) > 0.8;
  const canEdit = role === "owner" || role === "editor";
  const canRun = role !== "viewer";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/workflows"
          className="flex size-8 items-center justify-center rounded-lg text-fg-secondary transition-colors hover:bg-surface-2 hover:text-fg"
          aria-label="Back to workflows"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <div className="min-w-0">
          {canEdit ? (
            <Input
              value={name !== null ? name : (workflow?.name ?? "Workflow")}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                if (name !== null && workflow) {
                  saveWorkflow({ name: name.trim() || workflow.name });
                  setName(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              }}
              className="h-6 w-56 px-1.5 text-sm font-medium"
            />
          ) : (
            <div className="truncate text-sm font-medium text-fg">{workflow?.name ?? "Workflow"}</div>
          )}
          <div className="text-[11px] text-fg-muted">
            {activeRun
              ? `Run ${activeRun.id.slice(0, 8)} · ${activeRun.status}`
              : "Draft"}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {quota && (
          <Tooltip
            content={
              exhausted
                ? "Quota exhausted"
                : nearLimit
                  ? `${quota.used} / ${quota.limit} — running low`
                  : `${quota.used} / ${quota.limit}`
            }
          >
            <div
              className={cn(
                "relative flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-1.5 sm:flex",
                nearLimit && "animate-pulse-soft",
                exhausted && "bg-danger/15",
              )}
            >
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: exhausted ? "#f87171" : "#3b82f6",
                  }}
                />
              </div>
              <span className="text-[11px] text-fg-secondary">
                {quota.used}/{quota.limit}
              </span>
            </div>
          </Tooltip>
        )}

        <Button onClick={() => run()} disabled={isRunning || !workflow || exhausted || !canRun}>
          {isRunning ? (
            <>
              <span className="size-3 animate-spin rounded-full border-[1.5px] border-white/30 border-t-white" />
              Starting…
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor">
                <path d="M8 5.14v13.72L19 12 8 5.14z" />
              </svg>
              Run
            </>
          )}
        </Button>
      </div>
    </header>
  );
}
