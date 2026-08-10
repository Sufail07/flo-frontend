"use client";

import { useEffect, useMemo } from "react";
import { fetchStepRuns, fetchLatestRuns } from "@/lib/graphql";
import { useBuilder } from "@/store/builder";
import { useGraphQLSubscription } from "@/lib/use-graphql-subscription";
import type { StepRun, WorkflowRun } from "@/lib/types";

const STEP_RUNS_SUBSCRIPTION = /* GraphQL */ `
  subscription StepRuns($runId: uuid!) {
    step_runs(
      where: { workflow_run_id: { _eq: $runId } }
      order_by: { position: asc }
    ) {
      id
      workflow_run_id
      step_id
      org_id
      position
      name
      type
      config
      status
      input
      output
      error
      attempt
      max_attempts
      approved_by
      approved_at
      approval_note
      started_at
      finished_at
    }
  }
`;

const RUN_SUBSCRIPTION = /* GraphQL */ `
  subscription Run($runId: uuid!) {
    workflow_runs_by_pk(id: $runId) {
      id
      workflow_id
      org_id
      trigger_id
      trigger_type
      triggered_by
      status
      input
      error
      started_at
      finished_at
      created_at
    }
  }
`;

export function RunMonitor({ runId }: { runId: string }) {
  const { setStepRuns, setActiveRun, workflow } = useBuilder();

  const stepRunVars = useMemo(() => ({ runId }), [runId]);

  useEffect(() => {
    fetchStepRuns(runId).then((runs) => setStepRuns(runs)).catch(() => {});
    fetchLatestRuns(workflow?.id ?? "", 1)
      .then((runs) => {
        const run = runs.find((r) => r.id === runId);
        if (run) setActiveRun(run);
      })
      .catch(() => {});
  }, [runId, setStepRuns, setActiveRun, workflow?.id]);

  useGraphQLSubscription<{ step_runs: StepRun[] }>(
    STEP_RUNS_SUBSCRIPTION,
    stepRunVars,
    (data) => setStepRuns(data.step_runs),
    true,
  );

  useGraphQLSubscription<{ workflow_runs_by_pk: WorkflowRun | null }>(
    RUN_SUBSCRIPTION,
    stepRunVars,
    (data) => {
      if (data.workflow_runs_by_pk) setActiveRun(data.workflow_runs_by_pk);
    },
    true,
  );

  return null;
}
