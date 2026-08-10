"use client";

import { useMemo, useState } from "react";
import { useBuilder } from "@/store/builder";
import { STEP_TYPES, STEP_STATUSES, stepTypeMeta, type StepTypeMeta } from "@/lib/step-meta";
import { iconPath } from "@/lib/flow";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JsonBlock } from "@/components/ui/json-block";
import type { StepRun, WorkflowStep, WorkflowRun } from "@/lib/types";

const OWNER_ONLY_TYPES: StepTypeMeta["type"][] = ["db_write", "notify"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-medium uppercase tracking-wider text-fg-muted">{label}</div>
      {children}
    </div>
  );
}

function ConfigEditor({ step }: { step: WorkflowStep }) {
  const { updateStepConfig } = useBuilder();
  const [config, setConfig] = useState<Record<string, unknown>>(step.config ?? {});

  const meta = stepTypeMeta(step.type);

  const save = () => updateStepConfig(step.id, config);

  const set = (key: string, value: string) => {
    setConfig((c) => ({ ...c, [key]: value }));
  };

  return (
    <div className="space-y-3">
      {meta.type === "llm_call" && (
        <>
          <Field label="Prompt template">
            <textarea
              className="min-h-24 w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
              value={String(config.prompt_template ?? "Answer using {{run.input}}")}
              onChange={(e) => set("prompt_template", e.target.value)}
              onBlur={save}
            />
          </Field>
          <Field label="Model">
            <Input
              value={String(config.model ?? "llama-3.3-70b-versatile")}
              onChange={(e) => set("model", e.target.value)}
              onBlur={save}
            />
          </Field>
          <Field label="Temperature">
            <Input
              type="number"
              step="0.1"
              value={String(config.temperature ?? 0.2)}
              onChange={(e) => set("temperature", e.target.value)}
              onBlur={save}
            />
          </Field>
          <Field label="Max tokens">
            <Input
              type="number"
              value={String(config.max_tokens ?? 512)}
              onChange={(e) => set("max_tokens", e.target.value)}
              onBlur={save}
            />
          </Field>
        </>
      )}

      {meta.type === "http_request" && (
        <>
          <Field label="URL">
            <Input
              value={String(config.url ?? "")}
              placeholder="https://api.example.com/endpoint"
              onChange={(e) => set("url", e.target.value)}
              onBlur={save}
            />
          </Field>
          <Field label="Method">
            <select
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
              value={String(config.method ?? "GET")}
              onChange={(e) => set("method", e.target.value)}
              onBlur={save}
            >
              {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Body template">
            <textarea
              className="min-h-20 w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
              value={String(config.body_template ?? "{}")}
              onChange={(e) => set("body_template", e.target.value)}
              onBlur={save}
            />
          </Field>
          <Field label="Headers (JSON)">
            <textarea
              className="min-h-16 w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
              value={config.headers ? JSON.stringify(config.headers) : "{}"}
              onChange={(e) => {
                try {
                  setConfig((c) => ({ ...c, headers: JSON.parse(e.target.value || "{}") }));
                } catch {
                  /* ignore invalid JSON while typing */
                }
              }}
              onBlur={save}
            />
          </Field>
        </>
      )}

      {meta.type === "db_write" && (
        <>
          <Field label="Key">
            <Input
              value={String(config.key ?? "result")}
              onChange={(e) => set("key", e.target.value)}
              onBlur={save}
            />
          </Field>
          <Field label="Value template">
            <Input
              value={String(config.value_template ?? "{{step.output}}")}
              onChange={(e) => set("value_template", e.target.value)}
              onBlur={save}
            />
          </Field>
        </>
      )}

      {meta.type === "notify" && (
        <>
          <Field label="Channel">
            <select
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
              value={String(config.channel ?? "email")}
              onChange={(e) => set("channel", e.target.value)}
              onBlur={save}
            >
              {["email", "slack", "sms"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Target">
            <Input
              value={String(config.target ?? "")}
              placeholder="ops@example.com"
              onChange={(e) => set("target", e.target.value)}
              onBlur={save}
            />
          </Field>
          <Field label="Subject">
            <Input
              value={String(config.subject_template ?? "")}
              onChange={(e) => set("subject_template", e.target.value)}
              onBlur={save}
            />
          </Field>
          <Field label="Body">
            <textarea
              className="min-h-20 w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
              value={String(config.body_template ?? "")}
              onChange={(e) => set("body_template", e.target.value)}
              onBlur={save}
            />
          </Field>
        </>
      )}

      {meta.type === "conditional_branch" && (
        <>
          <Field label="Source path">
            <Input
              value={String(config.source ?? "previous.output.text")}
              placeholder="previous.output.text"
              onChange={(e) => set("source", e.target.value)}
              onBlur={save}
            />
          </Field>
          <Field label="Operator">
            <select
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
              value={String(config.operator ?? "is_truthy")}
              onChange={(e) => set("operator", e.target.value)}
              onBlur={save}
            >
              {[
                ["equals", "equals"],
                ["not_equals", "not equals"],
                ["contains", "contains"],
                ["not_contains", "not contains"],
                ["gt", "greater than"],
                ["lt", "less than"],
                ["is_truthy", "is truthy"],
              ].map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Compare value">
            <Input
              value={String(config.value ?? "")}
              onChange={(e) => set("value", e.target.value)}
              onBlur={save}
            />
          </Field>
        </>
      )}

      {meta.type === "approval_gate" && (
        <Field label="Approval note">
          <textarea
            className="min-h-20 w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
            value={String(config.note ?? "Approve this step before continuing.")}
            onChange={(e) => set("note", e.target.value)}
            onBlur={save}
          />
        </Field>
      )}

      {meta.type !== "llm_call" && meta.type !== "http_request" && meta.type !== "db_write" && meta.type !== "notify" && meta.type !== "conditional_branch" && meta.type !== "approval_gate" && (
        <p className="text-xs text-fg-muted">No configurable options.</p>
      )}
    </div>
  );
}

function BranchEditor({ step, steps }: { step: WorkflowStep; steps: WorkflowStep[] }) {
  const { updateStepBranch } = useBuilder();
  const others = steps.filter((s) => s.id !== step.id);
  const options = [...others].sort((a, b) => a.position - b.position);

  const select = (branch: "true" | "false", value: string) =>
    updateStepBranch(step.id, branch, value || null);

  return (
    <>
      <Field label="True branch →">
        <select
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
          value={step.on_true_step_id ?? ""}
          onChange={(e) => select("true", e.target.value)}
        >
          <option value="">— end of run —</option>
          {options.map((s) => (
            <option key={s.id} value={s.id}>
              #{s.position} {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="False branch →">
        <select
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
          value={step.on_false_step_id ?? ""}
          onChange={(e) => select("false", e.target.value)}
        >
          <option value="">— end of run —</option>
          {options.map((s) => (
            <option key={s.id} value={s.id}>
              #{s.position} {s.name}
            </option>
          ))}
        </select>
      </Field>
    </>
  );
}

function StepPalette({ isOwner }: { isOwner: boolean }) {
  const { addStep } = useBuilder();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<StepTypeMeta["type"]>("llm_call");

  const available = STEP_TYPES.filter((t) => isOwner || !OWNER_ONLY_TYPES.includes(t.type));

  async function submit() {
    await addStep(type, name.trim() || stepTypeMeta(type).label);
    setName("");
    setAdding(false);
  }

  if (!adding) {
    return (
      <Button
        variant="secondary"
        className="w-full"
        onClick={() => {
          setType("llm_call");
          setAdding(true);
        }}
      >
        + Add step
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-3">
      <div className="text-xs font-medium text-fg-secondary">Add step</div>
      <div className="grid grid-cols-2 gap-1.5">
        {available.map((t) => (
          <button
            key={t.type}
            type="button"
            onClick={() => setType(t.type)}
            className="flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-colors"
            style={{
              borderColor: type === t.type ? t.accent : "var(--color-border)",
              backgroundColor: type === t.type ? `${t.accent}1a` : "transparent",
            }}
          >
            <span style={{ color: t.accent }}>{iconPath(t.icon)}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-fg">{t.label}</span>
          </button>
        ))}
      </div>
      {type && (
        <Field label="Step name">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder={stepTypeMeta(type).label}
          />
        </Field>
      )}
      <div className="flex gap-2">
        <Button size="sm" className="flex-1" onClick={submit}>
          Add
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function RunOutputTab({
  stepRun,
  activeRun,
}: {
  stepRun: StepRun | null;
  activeRun: WorkflowRun | null;
}) {
  if (!activeRun) {
    return (
      <p className="text-xs text-fg-muted">
        No active run. Start a run (Run button) to inspect live step output.
      </p>
    );
  }
  if (!stepRun) {
    return (
      <p className="text-xs text-fg-muted">
        Select a node to see its run output, or select another step.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: STEP_STATUSES[stepRun.status].dot }}
        />
        <span className="text-xs font-medium text-fg">
          {STEP_STATUSES[stepRun.status].label}
        </span>
      </div>
      <Field label="Attempt">
        <span className="text-xs text-fg-secondary">
          {stepRun.attempt} / {stepRun.max_attempts}
        </span>
      </Field>
      {stepRun.approved_by && (
        <Field label="Approved by">
          <span className="text-xs text-fg-secondary break-all">
            {stepRun.approved_by}
            {stepRun.approved_at && ` · ${new Date(stepRun.approved_at).toLocaleString()}`}
          </span>
        </Field>
      )}
      {stepRun.approval_note && (
        <Field label="Approval note">
          <span className="text-xs text-fg-secondary break-words">
            {stepRun.approval_note}
          </span>
        </Field>
      )}
      {stepRun.error && (
        <Field label="Error">
          <span className="text-xs text-danger break-words">{stepRun.error}</span>
        </Field>
      )}
      <Field label="Input">
        <JsonBlock data={stepRun.input} />
      </Field>
      <Field label="Output">
        <JsonBlock data={stepRun.output} />
      </Field>
    </div>
  );
}

export function Inspector() {
  const {
    steps,
    selectedStepId,
    selectStep,
    role,
    renameStep,
    updateStepMaxAttempts,
    stepRuns,
    activeRun,
  } = useBuilder();
  const [name, setName] = useState<string | null>(null);
  const [tab, setTab] = useState<"config" | "run">("config");

  const selectedStep = useMemo(
    () => (steps ?? []).find((s) => s.id === selectedStepId) ?? null,
    [steps, selectedStepId],
  );

  const isOwner = role === "owner";
  const canEdit = role === "owner" || role === "editor";

  const stepRun: StepRun | null = useMemo(
    () => (selectedStepId ? (stepRuns.get(selectedStepId) ?? null) : null),
    [stepRuns, selectedStepId],
  );

  if (!selectedStep) {
    return (
      <div className="flex h-full flex-col p-4">
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <div className="flex size-10 items-center justify-center rounded-xl bg-surface-2 text-fg-muted">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 5h16M4 12h16M4 19h10" />
            </svg>
          </div>
          <p className="text-sm text-fg-secondary">Select a step</p>
          <p className="text-xs text-fg-muted">Click a node to inspect or edit its configuration.</p>
        </div>
        {canEdit && <StepPalette isOwner={isOwner} />}
      </div>
    );
  }

  const meta = stepTypeMeta(selectedStep.type);
  const editingName = name !== null ? name : selectedStep.name;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-center gap-2.5 border-b border-border p-4">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-lg"
          style={{ color: meta.accent, backgroundColor: `${meta.accent}1a` }}
        >
          {iconPath(meta.icon)}
        </div>
        <div className="min-w-0 flex-1">
          <Input
            value={editingName}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name !== null) {
                renameStep(selectedStep.id, name.trim() || selectedStep.name);
                setName(null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className="h-7 px-2 text-sm font-medium"
          />
          <div className="mt-0.5 text-xs text-fg-muted">
            {meta.label} · position {selectedStep.position}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {activeRun && (
          <div className="mb-2 flex gap-1 overflow-x-auto border-b border-border">
            <button
              type="button"
              onClick={() => setTab("config")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium",
                tab === "config"
                  ? "border-b-2 border-accent text-fg"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              Config
            </button>
            <button
              type="button"
              onClick={() => setTab("run")}
              className={cn(
                "px-3 py-1.5 text-xs font-medium",
                tab === "run"
                  ? "border-b-2 border-accent text-fg"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              Run output
            </button>
          </div>
        )}

        {tab === "config" && (
          <>
            <Field label="Type">
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg">
                <span className="size-1.5 rounded-full" style={{ backgroundColor: meta.accent }} />
                {meta.label}
              </div>
            </Field>

            <ConfigEditor step={selectedStep} />

            <Field label="Max attempts">
              <select
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
                value={selectedStep.max_attempts}
                onChange={(e) => updateStepMaxAttempts(selectedStep.id, Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>

            {selectedStep.type === "conditional_branch" && (
              <BranchEditor step={selectedStep} steps={steps ?? []} />
            )}
          </>
        )}

        {tab === "run" && (
          <RunOutputTab stepRun={stepRun} activeRun={activeRun} />
        )}

        <div className="flex gap-2 border-t border-border pt-3">
          <Button variant="ghost" size="sm" className="flex-1" onClick={() => selectStep(null)}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
