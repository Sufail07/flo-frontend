export type StepType =
  | "llm_call"
  | "http_request"
  | "db_write"
  | "notify"
  | "conditional_branch"
  | "approval_gate";

export type TriggerType = "manual" | "webhook" | "scheduled" | "database_event";

export type RunStatus = "pending" | "running" | "paused" | "succeeded" | "failed";
export type StepRunStatus =
  | "pending"
  | "running"
  | "awaiting_approval"
  | "succeeded"
  | "failed"
  | "skipped";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  quota_limit: number;
  quota_used: number;
  quota_period_start: string;
}

export interface OrgMembership {
  org_id: string;
  role: "owner" | "editor" | "viewer";
  organization: Organization;
}

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  org_id: string;
  position: number;
  name: string;
  type: StepType;
  config: Record<string, unknown>;
  max_attempts: number;
  on_true_step_id: string | null;
  on_false_step_id: string | null;
}

export interface WorkflowTrigger {
  id: string;
  workflow_id: string;
  type: TriggerType;
  is_enabled: boolean;
  config: Record<string, unknown>;
  webhook_token: string | null;
  cron_expr: string | null;
  next_run_at: string | null;
}

export interface Workflow {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  steps?: WorkflowStep[];
  triggers?: WorkflowTrigger[];
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  org_id: string;
  trigger_id: string | null;
  trigger_type: TriggerType;
  triggered_by: string | null;
  status: RunStatus;
  input: Record<string, unknown>;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export interface StepRun {
  id: string;
  workflow_run_id: string;
  step_id: string | null;
  org_id: string;
  position: number;
  name: string;
  type: StepType;
  config: Record<string, unknown>;
  status: StepRunStatus;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  attempt: number;
  max_attempts: number;
  approved_by: string | null;
  approved_at: string | null;
  approval_note: string | null;
  started_at: string | null;
  finished_at: string | null;
}

export interface Notification {
  id: string;
  org_id: string;
  workflow_run_id: string | null;
  step_run_id: string | null;
  channel: string;
  target: string;
  subject: string | null;
  body: string;
  status: string;
  error: string | null;
  sent_at: string | null;
}

export interface TriggerWorkflowRunResult {
  run_id: string;
  status: string;
  paused_at_step_run_id: string | null;
}

export interface ApproveStepResult {
  run_id: string;
  status: string;
  approved_by: string;
}

export interface RejectStepResult {
  run_id: string;
  status: string;
  rejected_by: string;
}
