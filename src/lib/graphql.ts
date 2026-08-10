import { nhost } from "./nhost";
import type {
  ApproveStepResult,
  Organization,
  OrgMembership,
  RejectStepResult,
  StepRun,
  TriggerWorkflowRunResult,
  Workflow,
  WorkflowRun,
  WorkflowStep,
  WorkflowTrigger,
} from "./types";

export async function request<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const token = nhost.auth.getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }
  nhost.graphql.setAccessToken(token);
  const { data, error } = await nhost.graphql.request<{ __result: T }>(
    query,
    variables,
  );
  if (error) {
    const msg = Array.isArray(error)
      ? error.map((e: { message?: string }) => e.message).join("; ")
      : error.message;
    throw new Error(msg);
  }
  return data as unknown as T;
}

const MEMBERSHIPS_QUERY = /* GraphQL */ `
  query GetMemberships {
    org_members {
      org_id
      role
      org {
        id
        name
        slug
        quota_limit
        quota_used
        quota_period_start
      }
    }
  }
`;

export function fetchMemberships() {
  return request<{ org_members: Array<Omit<OrgMembership, "organization"> & { org: Organization }> }>(
    MEMBERSHIPS_QUERY,
  ).then((d) =>
    d.org_members.map((m) => ({ org_id: m.org_id, role: m.role, organization: m.org })),
  );
}

const WORKFLOW_FIELDS = `
  id
  org_id
  name
  description
  is_active
  created_by
  created_at
  updated_at
  steps(order_by: { position: asc }) {
    id
    workflow_id
    org_id
    position
    name
    type
    config
    max_attempts
    on_true_step_id
    on_false_step_id
  }
  triggers {
    id
    workflow_id
    type
    is_enabled
    config
    webhook_token
    cron_expr
    next_run_at
  }
`;

export function fetchWorkflows() {
  return request<{ workflows: Workflow[] }>(
    `query GetWorkflows { workflows { ${WORKFLOW_FIELDS} } }`,
  ).then((d) => d.workflows);
}

export function fetchWorkflow(id: string) {
  return request<{ workflows_by_pk: Workflow | null }>(
    `query GetWorkflow($id: uuid!) { workflows_by_pk(id: $id) { ${WORKFLOW_FIELDS} } }`,
    { id },
  ).then((d) => d.workflows_by_pk);
}

export function fetchLatestRuns(workflowId: string, limit = 20) {
  return request<{ workflow_runs: WorkflowRun[] }>(
    `query GetRuns($workflowId: uuid!, $limit: Int!) {
      workflow_runs(
        where: { workflow_id: { _eq: $workflowId } }
        order_by: { created_at: desc }
        limit: $limit
      ) {
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
    }`,
    { workflowId, limit },
  ).then((d) => d.workflow_runs);
}

export function fetchStepRuns(runId: string) {
  return request<{ step_runs: StepRun[] }>(
    `query GetStepRuns($runId: uuid!) {
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
    }`,
    { runId },
  ).then((d) => d.step_runs);
}

export function createWorkflow(orgId: string, name: string, createdBy: string) {
  return request<{ insert_workflows_one: { id: string } }>(
    `mutation CreateWorkflow($org_id: uuid!, $name: String!, $created_by: uuid!) {
      insert_workflows_one(object: { org_id: $org_id, name: $name, created_by: $created_by }) { id }
    }`,
    { org_id: orgId, name, created_by: createdBy },
  ).then((d) => d.insert_workflows_one.id);
}

const STEP_INPUT_FIELDS = `
  id
  workflow_id
  org_id
  position
  name
  type
  config
  max_attempts
  on_true_step_id
  on_false_step_id
`;

export function insertStep(
  workflowId: string,
  orgId: string,
  position: number,
  name: string,
  type: string,
  config: Record<string, unknown>,
) {
  return request<{ insert_workflow_steps_one: WorkflowStep }>(
    `mutation InsertStep($object: workflow_steps_insert_input!) {
      insert_workflow_steps_one(object: $object) { ${STEP_INPUT_FIELDS} }
    }`,
    { object: { workflow_id: workflowId, org_id: orgId, position, name, type, config } },
  ).then((d) => d.insert_workflow_steps_one);
}

export function updateStep(
  id: string,
  patch: {
    name?: string;
    config?: Record<string, unknown>;
    max_attempts?: number;
    position?: number;
    on_true_step_id?: string | null;
    on_false_step_id?: string | null;
  },
) {
  return request<{ update_workflow_steps_by_pk: WorkflowStep }>(
    `mutation UpdateStep($id: uuid!, $patch: workflow_steps_set_input!) {
      update_workflow_steps_by_pk(pk_columns: { id: $id }, _set: $patch) { ${STEP_INPUT_FIELDS} }
    }`,
    { id, patch },
  ).then((d) => d.update_workflow_steps_by_pk);
}

export function reorderSteps(pairs: { id: string; position: number }[]) {
  const selection = pairs
    .map(
      (_, i) =>
        `s${i}: update_workflow_steps_by_pk(pk_columns: { id: $pairs.${i}.id }, _set: { position: $pairs.${i}.position }) { ${STEP_INPUT_FIELDS} }`,
    )
    .join(" ");

  return request<Record<string, WorkflowStep | null>>(
    `mutation ReorderSteps($pairs: [workflow_steps_pk_position_input!]!) { ${selection} }`,
    { pairs },
  ).then((d) =>
    pairs
      .map((_, i) => d[`s${i}`] ?? null)
      .filter((s): s is WorkflowStep => s !== null),
  );
}

export function deleteStep(id: string) {
  return request<{ delete_workflow_steps_by_pk: { id: string } | null }>(
    `mutation DeleteStep($id: uuid!) {
      delete_workflow_steps_by_pk(id: $id) { id }
    }`,
    { id },
  ).then((d) => d.delete_workflow_steps_by_pk?.id);
}

export function updateWorkflow(id: string, patch: { name?: string; description?: string; is_active?: boolean }) {
  return request<{ update_workflows_by_pk: Workflow }>(
    `mutation UpdateWorkflow($id: uuid!, $patch: workflows_set_input!) {
      update_workflows_by_pk(pk_columns: { id: $id }, _set: $patch) {
        id
        org_id
        name
        description
        is_active
        created_by
        created_at
        updated_at
      }
    }`,
    { id, patch },
  ).then((d) => d.update_workflows_by_pk);
}

export function insertTrigger(workflowId: string, orgId: string, type: string) {
  return request<{ insert_workflow_triggers_one: WorkflowTrigger }>(
    `mutation InsertTrigger($object: workflow_triggers_insert_input!) {
      insert_workflow_triggers_one(object: $object) {
        id
        workflow_id
        type
        is_enabled
        config
        webhook_token
        cron_expr
        next_run_at
      }
    }`,
    { object: { workflow_id: workflowId, org_id: orgId, type } },
  ).then((d) => d.insert_workflow_triggers_one);
}

export function fetchQuota() {
  return request<{ organizations: Organization[] }>(
    `query GetQuota {
      organizations { id name slug quota_limit quota_used quota_period_start }
    }`,
  ).then((d) => d.organizations);
}

export function triggerWorkflowRun(workflowId: string) {
  return request<{ triggerWorkflowRun: TriggerWorkflowRunResult }>(
    `mutation TriggerRun($workflowId: uuid!) {
      triggerWorkflowRun(workflow_id: $workflowId) {
        run_id
        status
        paused_at_step_run_id
      }
    }`,
    { workflowId },
  ).then((d) => d.triggerWorkflowRun);
}

export function approveStep(stepRunId: string) {
  return request<{ approveStep: ApproveStepResult }>(
    `mutation ApproveStep($stepRunId: uuid!) {
      approveStep(step_run_id: $stepRunId) {
        run_id
        status
        approved_by
      }
    }`,
    { stepRunId },
  ).then((d) => d.approveStep);
}

export function updateWorkflowStep(id: string, patch: Partial<WorkflowStep>) {
  return request<{ update_workflow_steps_by_pk: WorkflowStep }>(
    `mutation UpdateWorkflowStep($id: uuid!, $patch: workflow_steps_set_input!) {
      update_workflow_steps_by_pk(pk_columns: { id: $id }, _set: $patch) {
        ${STEP_INPUT_FIELDS}
      }
    }`,
    { id, patch: { ...patch } },
  ).then((d) => d.update_workflow_steps_by_pk);
}

export function deleteWorkflowStep(id: string) {
  return request<{ delete_workflow_steps_by_pk: { id: string } | null }>(
    `mutation DeleteWorkflowStep($id: uuid!) {
      delete_workflow_steps_by_pk(id: $id) { id }
    }`,
    { id },
  ).then((d) => d.delete_workflow_steps_by_pk?.id);
}

export function rejectStep(stepRunId: string, note?: string | null) {
  return request<{ rejectStep: RejectStepResult }>(
    `mutation RejectStep($stepRunId: uuid!, $note: String) {
      rejectStep(step_run_id: $stepRunId, note: $note) {
        run_id
        status
        rejected_by
      }
    }`,
    { stepRunId, note: note ?? null },
  ).then((d) => d.rejectStep);
}
