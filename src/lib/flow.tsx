import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type { StepRun, WorkflowStep } from "@/lib/types";

export const NODE_WIDTH = 232;
export const NODE_HEIGHT = 76;
export const GAP_X = 44;
export const GAP_Y = 90;

export interface StepNodeData {
  step: WorkflowStep;
  stepRun?: StepRun | null;
  selected: boolean;
  isActive: boolean;
  isDimmed?: boolean;
  [key: string]: unknown;
}

function branchTargets(steps: WorkflowStep[]): Set<string> {
  const targets = new Set<string>();
  for (const s of steps) {
    if (s.on_true_step_id) targets.add(s.on_true_step_id);
    if (s.on_false_step_id) targets.add(s.on_false_step_id);
  }
  return targets;
}

export function stepsToFlow(
  steps: WorkflowStep[],
  stepRuns: Map<string, StepRun>,
  activeStepIds: Set<string>,
  selectedId: string | null,
): { nodes: Node<StepNodeData, "step">[]; edges: Edge[] } {
  const sorted = [...steps].sort((a, b) => a.position - b.position);
  const targets = branchTargets(sorted);
  const branchSources = new Set(
    sorted.filter((s) => s.type === "conditional_branch").map((s) => s.id),
  );

  // Awaiting-approval gate (if any) drives the dim-others overlay.
  let awaitingId: string | null = null;
  for (const r of stepRuns.values()) {
    if (r.status === "awaiting_approval" && r.step_id) {
      awaitingId = r.step_id;
      break;
    }
  }
  const dimAll = awaitingId !== null;

  function isSourceAnimated(sourceId: string): boolean {
    const r = stepRuns.get(sourceId);
    return r?.status === "running" || r?.status === "succeeded";
  }

  const nodes: Node<StepNodeData, "step">[] = sorted.map((s, i) => {
    const isBranchTarget = targets.has(s.id);
    const layout = (s.config?.__layout as { x: number; y: number } | undefined) ?? null;
    const x = layout ? layout.x : i * (NODE_WIDTH + GAP_X);
    const y = layout ? layout.y : isBranchTarget && !branchSources.has(s.id) ? GAP_Y : 0;
    return {
      id: s.id,
      type: "step" as const,
      position: { x, y },
      data: {
        step: s,
        stepRun: stepRuns.get(s.id) ?? null,
        selected: s.id === selectedId,
        isActive: activeStepIds.has(s.id),
        isDimmed: dimAll && s.id !== awaitingId,
      },
      draggable: true,
      selectable: true,
    };
  });

  const edges: Edge[] = [];
  const indexById = new Map(sorted.map((s, i) => [s.id, i]));

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    if (s.type === "conditional_branch") {
      if (s.on_true_step_id && indexById.has(s.on_true_step_id)) {
        edges.push({
          id: `${s.id}-true`,
          source: s.id,
          target: s.on_true_step_id,
          sourceHandle: "true",
          label: "true",
          animated: isSourceAnimated(s.id),
          markerEnd: { type: MarkerType.ArrowClosed, color: "#2a3542" },
          style: { stroke: "#fbbf24", strokeDasharray: "4 4" },
          labelStyle: { fill: "#fbbf24", fontSize: 10 },
          labelBgStyle: { fill: "#0f141b", fillOpacity: 0.9 },
        });
      }
      if (s.on_false_step_id && indexById.has(s.on_false_step_id)) {
        edges.push({
          id: `${s.id}-false`,
          source: s.id,
          target: s.on_false_step_id,
          sourceHandle: "false",
          label: "false",
          animated: isSourceAnimated(s.id),
          markerEnd: { type: MarkerType.ArrowClosed, color: "#2a3542" },
          style: { stroke: "#5c6a7a", strokeDasharray: "4 4" },
          labelStyle: { fill: "#5c6a7a", fontSize: 10 },
          labelBgStyle: { fill: "#0f141b", fillOpacity: 0.9 },
        });
      }
      // An unconfigured branch has no explicit targets, so the runner falls
      // through to the next positional step. Draw the linear connector here
      // so the chain stays visible instead of the node hanging loose.
      if (!s.on_true_step_id && !s.on_false_step_id) {
        const branchNext = sorted[i + 1];
        if (branchNext) {
          edges.push({
            id: `${s.id}-next`,
            source: s.id,
            target: branchNext.id,
            animated: isSourceAnimated(s.id),
            markerEnd: { type: MarkerType.ArrowClosed, color: "#2a3542" },
          });
        }
      }
      continue;
    }
    const next = sorted[i + 1];
    if (next) {
      edges.push({
        id: `${s.id}-next`,
        source: s.id,
        target: next.id,
        animated: isSourceAnimated(s.id),
        markerEnd: { type: MarkerType.ArrowClosed, color: "#2a3542" },
      });
    }
  }

  return { nodes, edges };
}

import type { ReactElement } from "react";

export function iconPath(icon: string): ReactElement {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (icon) {
    case "sparkles":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
          <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
        </svg>
      );
    case "globe":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.6 3.5 5.6 3.5 9s-1 6.4-3.5 9c-2.5-2.6-3.5-5.6-3.5-9s1-6.4 3.5-9z" />
        </svg>
      );
    case "database":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
        </svg>
      );
    case "bell":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
        </svg>
      );
    case "git-branch":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="6" cy="6" r="2.5" />
          <circle cx="6" cy="18" r="2.5" />
          <circle cx="18" cy="6" r="2.5" />
          <path d="M6 8.5v7M18 8.5c0 4-12 2-12 7" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M12 3l8 3v6c0 5-3.4 8.2-8 9-4.6-.8-8-4-8-9V6l8-3z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

export function StepIcon({
  icon,
  className,
}: {
  icon: string;
  className?: string;
}) {
  return <span className={className}>{iconPath(icon)}</span>;
}
