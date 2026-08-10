"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo } from "react";
import type { DragEvent } from "react";
import { stepsToFlow, type StepNodeData } from "@/lib/flow";
import { StepNode } from "@/components/builder/step-node";
import { useBuilder } from "@/store/builder";
import type { StepRun, StepType } from "@/lib/types";

type StepFlowNode = Node<StepNodeData, "step">;
const nodeTypes = { step: StepNode };

function isEdgeActive(stepRuns: Map<string, StepRun>, sourceId: string): boolean {
  const r = stepRuns.get(sourceId);
  return r?.status === "running" || r?.status === "succeeded";
}

export function WorkflowCanvas() {
  const {
    steps,
    stepRuns,
    selectedStepId,
    selectStep,
    persistStepPosition,
    addStep,
  } = useBuilder();

  const stepRunsMap = useMemo(
    () =>
      new Map<string, StepRun>(
        Array.from(stepRuns.entries()).map(([k, v]) => [k, v]),
      ),
    [stepRuns],
  );

  const activeStepIds = useMemo(() => {
    const set = new Set<string>();
    for (const run of stepRunsMap.values()) {
      if (run.status === "running" || run.status === "awaiting_approval") {
        if (run.step_id) set.add(run.step_id);
      }
    }
    return set;
  }, [stepRunsMap]);

  // The set of step ids is the only trigger for a structural re-sync. Status /
  // selection changes must NOT re-run this effect or they would clobber
  // positions the user has dragged on screen.
  const stepIdsKey = useMemo(
    () => (steps ?? []).map((s) => s.id).join(","),
    [steps],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<StepFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Effect A: re-sync structure + seed positions only when the step set
  // changes. Existing dragged positions and React Flow's own selection state
  // are preserved by merging onto the previous node objects.
  useEffect(() => {
    const { nodes: next, edges: nextEdges } = stepsToFlow(
      steps ?? [],
      stepRunsMap,
      activeStepIds,
      selectedStepId,
    );
    setNodes((prev) => {
      const byId = new Map(prev.map((n) => [n.id, n]));
      return next.map((n) => {
        const p = byId.get(n.id);
        return {
          ...n,
          position: p ? p.position : n.position,
          selected: p ? p.selected : n.selected,
        };
      });
    });
    setEdges(nextEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdsKey, setNodes, setEdges]);

  // Effect B: keep per-node data (status / active / dim) live without touching
  // positions. Fires on every run update so node visuals track the live run.
  useEffect(() => {
    let awaitingId: string | null = null;
    for (const run of stepRunsMap.values()) {
      if (run.status === "awaiting_approval" && run.step_id) {
        awaitingId = run.step_id;
        break;
      }
    }
    const dimAll = awaitingId !== null;

    setNodes((prev) =>
      prev.map((n) => {
        const run = stepRunsMap.get(n.id);
        const nextData: StepNodeData = {
          ...n.data,
          stepRun: run ?? null,
          isActive: activeStepIds.has(n.id),
          isDimmed: dimAll && n.id !== awaitingId,
        };
        return { ...n, data: nextData };
      }),
    );

    // Keep edge data-flow animation live too.
    setEdges((prev) =>
      prev.map((e) => ({
        ...e,
        animated: isEdgeActive(stepRunsMap, e.source),
      })),
    );
  }, [stepRunsMap, activeStepIds, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: unknown, node: StepFlowNode) => selectStep(node.id),
    [selectStep],
  );

  const onPaneClick = useCallback(() => selectStep(null), [selectStep]);

  const onNodeDragStop = useCallback(
    (_event: MouseEvent | TouchEvent, node: StepFlowNode) => {
      const step = (steps ?? []).find((s) => s.id === node.id);
      const layout =
        (step?.config?.__layout as { x: number; y: number } | undefined) ?? null;
      if (!layout || layout.x !== node.position.x || layout.y !== node.position.y) {
        persistStepPosition(node.id, node.position.x, node.position.y);
      }
    },
    [steps, persistStepPosition],
  );

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData("application/x-step-type");
      if (!raw) return;
      addStep(raw as StepType, "");
    },
    [addStep],
  );

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <div
      className="relative h-full w-full"
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow<StepFlowNode, Edge>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodesConnectable={false}
        elementsSelectable
        noDragClassName="nodrag"
        fitView
        fitViewOptions={{ padding: 0.25 }}
        minZoom={0.4}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#1e2631" />
        <Controls showInteractive={false} position="bottom-left" />
      </ReactFlow>
    </div>
  );
}
