import type { StepRunStatus, StepType } from "@/lib/types";

export interface StepTypeMeta {
  type: StepType;
  label: string;
  description: string;
  icon: string;
  accent: string;
}

export const STEP_TYPES: StepTypeMeta[] = [
  {
    type: "llm_call",
    label: "LLM Call",
    description: "Prompt an AI model",
    icon: "sparkles",
    accent: "#3b82f6",
  },
  {
    type: "http_request",
    label: "HTTP Request",
    description: "Call an external API",
    icon: "globe",
    accent: "#38bdf8",
  },
  {
    type: "db_write",
    label: "DB Write",
    description: "Write a workflow artifact",
    icon: "database",
    accent: "#22d3ee",
  },
  {
    type: "notify",
    label: "Notify",
    description: "Send a notification",
    icon: "bell",
    accent: "#a78bfa",
  },
  {
    type: "conditional_branch",
    label: "Condition",
    description: "Branch on a value",
    icon: "git-branch",
    accent: "#fbbf24",
  },
  {
    type: "approval_gate",
    label: "Approval Gate",
    description: "Pause for human approval",
    icon: "shield",
    accent: "#f472b6",
  },
];

export function stepTypeMeta(type: StepType): StepTypeMeta {
  return STEP_TYPES.find((s) => s.type === type) ?? STEP_TYPES[0];
}

export interface StepStatusMeta {
  status: StepRunStatus;
  label: string;
  color: string;
  dot: string;
}

export const STEP_STATUSES: Record<StepRunStatus, StepStatusMeta> = {
  pending: { status: "pending", label: "Queued", color: "#5c6a7a", dot: "#5c6a7a" },
  running: { status: "running", label: "Running", color: "#3b82f6", dot: "#3b82f6" },
  awaiting_approval: {
    status: "awaiting_approval",
    label: "Awaiting approval",
    color: "#fbbf24",
    dot: "#fbbf24",
  },
  succeeded: { status: "succeeded", label: "Succeeded", color: "#34d399", dot: "#34d399" },
  failed: { status: "failed", label: "Failed", color: "#f87171", dot: "#f87171" },
  skipped: { status: "skipped", label: "Skipped", color: "#4b5563", dot: "#4b5563" },
};

export function defaultConfigFor(type: StepType): Record<string, unknown> {
  switch (type) {
    case "llm_call":
      return {
        prompt_template: "Answer using {{run.input}}",
        model: "llama-3.3-70b-versatile",
        temperature: 0,
      };
    case "http_request":
      return { url: "https://api.example.com/endpoint", method: "POST", body_template: "{}" };
    case "db_write":
      return { key: "result", value_template: "{{step.output}}" };
    case "notify":
      return { channel: "email", target: "ops@example.com", subject: "", body: "" };
    case "conditional_branch":
      return { source: "{{run.input.value}}", operator: "equals", value: "" };
    case "approval_gate":
      return { note: "Approve this step before continuing." };
    default:
      return {};
  }
}
