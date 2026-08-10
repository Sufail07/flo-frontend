"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { cn } from "@/lib/cn";
import { STEP_STATUSES, stepTypeMeta } from "@/lib/step-meta";
import { iconPath, NODE_HEIGHT, NODE_WIDTH, type StepNodeData } from "@/lib/flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBuilder } from "@/store/builder";
import type { StepRunStatus } from "@/lib/types";
import { useState } from "react";

export type StepNodeType = Node<StepNodeData, "step">;

function StatusBadge({ status }: { status: StepRunStatus }) {
  const meta = STEP_STATUSES[status];
  if (status === "pending" || status === "skipped") return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
      style={{
        color: meta.color,
        backgroundColor: `${meta.color}1a`,
      }}
    >
      <span
        className={cn("size-1.5 rounded-full", status === "running" && "animate-pulse")}
        style={{ backgroundColor: meta.dot }}
      />
      {meta.label}
    </span>
  );
}

function ApproveButton({ stepRunId }: { stepRunId: string }) {
  const { approve, approvingId } = useBuilder();
  const busy = approvingId === stepRunId;
  return (
    <Button
      size="sm"
      variant="primary"
      className="h-6 px-2 text-[11px]"
      disabled={busy}
      onClick={(e) => {
        e.stopPropagation();
        approve(stepRunId);
      }}
    >
      {busy ? "…" : "Approve"}
    </Button>
  );
}

function RejectButton({ stepRunId }: { stepRunId: string }) {
  const { reject, rejectingId } = useBuilder();
  const [note, setNote] = useState("");
  const [expanded, setExpanded] = useState(false);
  const busy = rejectingId === stepRunId;

  if (!expanded) {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-[11px] text-fg-muted"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(true);
        }}
      >
        Reject
      </Button>
    );
  }

  return (
    <div className="flex items-end gap-1.5" onClick={(e) => e.stopPropagation()}>
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="optional note"
        className="h-6 w-36 px-2 text-[11px]"
        aria-label="Rejection note"
      />
      <Button
        size="sm"
        variant="danger"
        className="h-6 px-2 text-[11px]"
        disabled={busy}
        onClick={() => {
          reject(stepRunId, note);
          setExpanded(false);
          setNote("");
        }}
      >
        {busy ? "…" : "Reject"}
      </Button>
      <button
        type="button"
        className="text-[10px] text-fg-muted hover:text-fg"
        onClick={() => {
          setExpanded(false);
          setNote("");
        }}
        aria-label="Cancel reject"
      >
        ✕
      </button>
    </div>
  );
}

export function StepNode({ data, selected }: NodeProps<StepNodeType>) {
  const { step, stepRun, isActive, isDimmed } = data;
  const { moveStep, removeStep, selectStep, steps, role } = useBuilder();
  const meta = stepTypeMeta(step.type);
  const status = stepRun?.status ?? "pending";
  const isBranch = step.type === "conditional_branch";
  const canEdit = role === "owner" || role === "editor";
  const hasApproval =
    step.type === "approval_gate" && stepRun?.status === "awaiting_approval";
  const index = (steps ?? []).filter((s) => s.position < step.position).length;
  const count = steps?.length ?? 0;

  const stateRing =
    status === "running"
      ? "step-running-pulse"
      : status === "awaiting_approval"
        ? "step-amber-ring"
        : "";

  return (
    <div
      style={{ width: NODE_WIDTH }}
      className={cn(
        "relative rounded-xl border bg-surface transition-colors",
        selected
          ? "border-accent shadow-[0_0_0_1px_var(--color-accent)]"
          : "border-border",
        isActive && !selected && "border-border-strong",
        isDimmed && "dim-overlay",
        stateRing,
      )}
    >
      {!isBranch && (
        <Handle
          type="target"
          position={Position.Left}
          className="!size-2 !border-0 !bg-transparent"
          style={{ left: 0 }}
        />
      )}
      {!isBranch && (
        <Handle
          type="source"
          position={Position.Right}
          className="!size-2 !border-0 !bg-transparent"
          style={{ right: 0 }}
        />
      )}
      {isBranch && (
        <>
          <Handle
            type="source"
            position={Position.Top}
            id="true"
            className="!size-2 !border-0 !bg-transparent"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!size-2 !border-0 !bg-transparent"
          />
        </>
      )}

      <div
        className="flex items-center gap-2.5 px-3 py-2.5"
        style={{ minHeight: NODE_HEIGHT }}
      >
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-lg"
          style={{ color: meta.accent, backgroundColor: `${meta.accent}1a` }}
        >
          {iconPath(meta.icon)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-fg">{step.name}</div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <StatusBadge status={status} />
            {hasApproval && stepRun.id && (
              <div className="nodrag" onClick={(e) => e.stopPropagation()}>
                <ApproveButton stepRunId={stepRun.id} />
                <RejectButton stepRunId={stepRun.id} />
              </div>
            )}
          </div>
        </div>
      </div>

      {stepRun?.error && (
        <div
          className="mx-3 mb-2 rounded-md bg-danger/10 px-2 py-1 text-[11px] text-danger"
          onClick={(e) => e.stopPropagation()}
        >
          {stepRun.error}
        </div>
      )}

      {canEdit && (
        <div
          className="nodrag flex items-center justify-end gap-0.5 border-t border-border px-2 py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            disabled={index === 0}
            onClick={(e) => {
              e.stopPropagation();
              moveStep(step.id, -1);
            }}
            className="rounded p-0.5 text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-30"
            aria-label="Move up"
          >
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            disabled={index === count - 1}
            onClick={(e) => {
              e.stopPropagation();
              moveStep(step.id, 1);
            }}
            className="rounded p-0.5 text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-30"
            aria-label="Move down"
          >
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </button>
          <span className="mx-0.5 h-3 w-px bg-border" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              selectStep(null);
              removeStep(step.id);
            }}
            className="rounded p-0.5 text-fg-muted transition-colors hover:bg-danger/15 hover:text-danger"
            aria-label="Delete step"
          >
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
