"use client";

import { create } from "zustand";
import {
  approveStep,
  deleteStep,
  fetchMemberships,
  fetchQuota,
  fetchWorkflow,
  insertStep,
  reorderSteps,
  rejectStep as rejectStepMutation,
  triggerWorkflowRun,
  updateStep,
  updateWorkflow,
} from "@/lib/graphql";
import { defaultConfigFor } from "@/lib/step-meta";
import type { StepRun, StepType, Workflow, WorkflowRun } from "@/lib/types";

function runsToMap(runs: StepRun[]): Map<string, StepRun> {
  return new Map(runs.map((r) => [r.step_id ?? String(r.position), r]));
}

interface BuilderState {
  workflow: Workflow | null;
  steps: Workflow["steps"];
  selectedStepId: string | null;
  stepRuns: Map<string, StepRun>;
  activeRun: WorkflowRun | null;
  runError: string | null;
  isRunning: boolean;
  approvingId: string | null;
  rejectingId: string | null;
  quota: { limit: number; used: number } | null;
  role: "owner" | "editor" | "viewer" | null;
  loading: boolean;
  liveError: string | null;
  load: (id: string) => Promise<void>;
  selectStep: (id: string | null) => void;
  addStep: (type: StepType, name: string) => Promise<void>;
  renameStep: (id: string, name: string) => Promise<void>;
  updateStepConfig: (id: string, config: Record<string, unknown>) => Promise<void>;
  updateStepBranch: (id: string, branch: "true" | "false", targetId: string | null) => Promise<void>;
  updateStepMaxAttempts: (id: string, maxAttempts: number) => Promise<void>;
  moveStep: (id: string, dir: -1 | 1) => Promise<void>;
  removeStep: (id: string) => Promise<void>;
  persistStepPosition: (id: string, x: number, y: number) => Promise<void>;
  saveWorkflow: (patch: { name?: string; description?: string; is_active?: boolean }) => Promise<void>;
  run: () => Promise<void>;
  approve: (stepRunId: string) => Promise<void>;
  reject: (stepRunId: string, note: string) => Promise<void>;
  setStepRuns: (runs: StepRun[]) => void;
  setActiveRun: (run: WorkflowRun | null) => void;
  setRunError: (msg: string | null) => void;
  setLiveError: (msg: string | null) => void;
}

export const useBuilder = create<BuilderState>((set, get) => ({
  workflow: null,
  steps: [],
  selectedStepId: null,
  stepRuns: new Map(),
  activeRun: null,
  runError: null,
  isRunning: false,
  approvingId: null,
  rejectingId: null,
  quota: null,
  role: null,
  loading: true,
  liveError: null,
  async load(id) {
    set({ loading: true });
    try {
      const wf = await fetchWorkflow(id);
      if (!wf) throw new Error("Workflow not found");
      const [quota, memberships] = await Promise.all([fetchQuota(), fetchMemberships()]);
      const org = quota.find((o) => o.id === wf.org_id);
      const membership = memberships.find((m) => m.org_id === wf.org_id);
      set({
        workflow: wf,
        steps: wf.steps ?? [],
        quota: org ? { limit: org.quota_limit, used: org.quota_used } : null,
        role: membership?.role ?? null,
        loading: false,
      });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  selectStep(id) {
    set({ selectedStepId: id });
  },

  async addStep(type, name) {
    const wf = get().workflow;
    if (!wf) return;
    const steps = [...(get().steps ?? [])].sort((a, b) => a.position - b.position);
    const position = steps.length + 1;
    const step = await insertStep(wf.id, wf.org_id, position, name, type, defaultConfigFor(type));
    set({ steps: [...steps, step], selectedStepId: step.id });
  },

  async renameStep(id, name) {
    const step = await updateStep(id, { name });
    set({ steps: (get().steps ?? []).map((s) => (s.id === id ? step : s)) });
  },

  async updateStepConfig(id, config) {
    const step = await updateStep(id, { config });
    set({ steps: (get().steps ?? []).map((s) => (s.id === id ? step : s)) });
  },

  async updateStepBranch(id, branch, targetId) {
    const patch = branch === "true" ? { on_true_step_id: targetId } : { on_false_step_id: targetId };
    const step = await updateStep(id, patch);
    set({ steps: (get().steps ?? []).map((s) => (s.id === id ? step : s)) });
  },

  async updateStepMaxAttempts(id, maxAttempts) {
    const step = await updateStep(id, { max_attempts: maxAttempts });
    set({ steps: (get().steps ?? []).map((s) => (s.id === id ? step : s)) });
  },

  async moveStep(id, dir) {
    const steps = [...(get().steps ?? [])].sort((a, b) => a.position - b.position);
    const idx = steps.findIndex((s) => s.id === id);
    const swapIdx = idx + dir;
    if (idx === -1 || swapIdx < 0 || swapIdx >= steps.length) return;
    const a = steps[idx];
    const b = steps[swapIdx];
    await reorderSteps([
      { id: a.id, position: b.position },
      { id: b.id, position: a.position },
    ]);
    set({
      steps: (get().steps ?? [])
        .map((s) => (s.id === a.id ? { ...s, position: b.position } : s.id === b.id ? { ...s, position: a.position } : s))
        .sort((x, y) => x.position - y.position),
    });
  },

   async removeStep(id) {
    await deleteStep(id);
    const remaining = (get().steps ?? [])
      .filter((s) => s.id !== id)
      .sort((a, b) => a.position - b.position)
      .map((s, i) => ({ ...s, position: i + 1 }));
    set({
      steps: remaining,
      selectedStepId: get().selectedStepId === id ? null : get().selectedStepId,
    });
    try {
      await reorderSteps(remaining.map((s) => ({ id: s.id, position: s.position })));
    } catch {
      /* non-fatal: positions may stay gapped, but the node is gone from the UI */
    }
  },

  async persistStepPosition(id, x, y) {
    const step = (get().steps ?? []).find((s) => s.id === id);
    if (!step) return;
    const base = (step.config ?? {}) as Record<string, unknown>;
    const config = { ...base, __layout: { x, y } };
    try {
      const updated = await updateStep(id, { config });
      set({ steps: (get().steps ?? []).map((s) => (s.id === id ? updated : s)) });
    } catch {
      /* non-fatal: layout persistence is best-effort */
    }
  },

  async saveWorkflow(patch) {
    const wf = get().workflow;
    if (!wf) return;
    const updated = await updateWorkflow(wf.id, patch);
    set({ workflow: { ...wf, ...updated } });
  },

  async run() {
    const wf = get().workflow;
    if (!wf || get().isRunning) return;
    set({ isRunning: true, runError: null, stepRuns: new Map(), activeRun: null });
    try {
      // The Action only creates the run and returns its id — an Event Trigger
      // executes the steps. Setting activeRun here mounts RunMonitor, so the
      // step_runs subscription is open before execution begins and progress
      // streams in live.
      const result = await triggerWorkflowRun(wf.id);
      set({
        activeRun: {
          id: result.run_id,
          workflow_id: wf.id,
          org_id: wf.org_id,
          trigger_id: null,
          trigger_type: "manual",
          triggered_by: null,
          status: result.status as WorkflowRun["status"],
          input: {},
          error: null,
          started_at: null,
          finished_at: null,
          created_at: new Date().toISOString(),
        },
      });
    } catch (e) {
      set({ runError: e instanceof Error ? e.message : "Failed to start run" });
    } finally {
      set({ isRunning: false });
    }
  },

  // Approve/reject only record the decision — the run resumes out-of-band, so
  // the live subscription (not a refetch here) delivers the remaining steps.
  async approve(stepRunId) {
    if (get().approvingId) return;
    set({ approvingId: stepRunId });
    try {
      await approveStep(stepRunId);
    } catch (e) {
      set({ runError: e instanceof Error ? e.message : "Approval failed" });
    } finally {
      set({ approvingId: null });
    }
  },

  async reject(stepRunId, note) {
    if (get().rejectingId) return;
    set({ rejectingId: stepRunId });
    try {
      await rejectStepMutation(stepRunId, note);
    } catch (e) {
      set({ runError: e instanceof Error ? e.message : "Rejection failed" });
    } finally {
      set({ rejectingId: null });
    }
  },

  setStepRuns(runs) {
    set({ stepRuns: runsToMap(runs) });
  },

  setActiveRun(run) {
    set({ activeRun: run });
  },

  setRunError(msg) {
    set({ runError: msg });
  },

  setLiveError(msg) {
    set({ liveError: msg });
  },
}));
