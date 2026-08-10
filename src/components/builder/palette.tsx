"use client";

import { useMemo, useState } from "react";
import { useBuilder } from "@/store/builder";
import { STEP_TYPES, stepTypeMeta, type StepTypeMeta } from "@/lib/step-meta";
import { iconPath } from "@/lib/flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const OWNER_ONLY_TYPES: StepTypeMeta["type"][] = ["db_write", "notify"];

// Heuristic: after a given step type, which step types are sensible next steps.
// Used to surface an intention-sorted "Suggested" group at the top of the
// palette so the builder nudges the obvious next action without forcing it.
const SUGGESTED_AFTER: Record<string, StepTypeMeta["type"][]> = {
  llm_call: ["conditional_branch", "db_write", "notify"],
  http_request: ["conditional_branch"],
  conditional_branch: ["db_write", "notify"],
};

export function Palette() {
  const { addStep, role, steps } = useBuilder();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<StepTypeMeta["type"]>("llm_call");

  const isOwner = role === "owner";
  const canEdit = role === "owner" || role === "editor";

  const lastType = useMemo(() => {
    const s = [...(steps ?? [])].sort((a, b) => a.position - b.position);
    return s.length ? s[s.length - 1].type : null;
  }, [steps]);

  const suggested = useMemo<StepTypeMeta[]>(() => {
    const ordered = SUGGESTED_AFTER[lastType ?? ""] ?? [];
    const byType = new Map(STEP_TYPES.map((t) => [t.type, t]));
    return ordered
      .map((t) => byType.get(t))
      .filter((t): t is StepTypeMeta => Boolean(t))
      .filter((t) => isOwner || !OWNER_ONLY_TYPES.includes(t.type));
  }, [lastType, isOwner]);

  const available = useMemo(
    () => STEP_TYPES.filter((t) => isOwner || !OWNER_ONLY_TYPES.includes(t.type)),
    [isOwner],
  );

  const dragType = (t: StepTypeMeta["type"]) => (e: React.DragEvent) => {
    e.dataTransfer.setData("application/x-step-type", t);
  };

  async function addByType(t: StepTypeMeta["type"]) {
    if (!canEdit) return;
    const label = stepTypeMeta(t).label;
    await addStep(t, name.trim() || label);
    setName("");
    setType("llm_call");
    setAdding(false);
  }

  if (!canEdit) {
    return (
      <aside className="flex h-full w-60 shrink-0 flex-col gap-3 overflow-y-auto border-r border-border bg-surface p-4 text-xs text-fg-muted">
        <div>Canvas palette</div>
        <p className="text-[11px]">You can view the workflow but cannot add steps.</p>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col gap-3 overflow-y-auto border-r border-border bg-surface p-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-fg-muted">
        Add step
      </div>

      {suggested.length > 0 && (
        <>
          <div className="text-[10px] font-medium text-fg-secondary">Suggested</div>
          <div className="grid grid-cols-2 gap-1.5">
            {suggested.map((t) => (
              <PaletteItem
                key={t.type}
                meta={t}
                ownerOnly={OWNER_ONLY_TYPES.includes(t.type)}
                isOwner={isOwner}
                onDrag={dragType(t.type)}
                onClick={() => {
                  setType(t.type);
                  setAdding(true);
                }}
              />
            ))}
          </div>
        </>
      )}

      {adding ? (
        <div className="space-y-3 rounded-xl border border-border bg-surface-2 p-3">
          <div className="text-[10px] font-medium text-fg-secondary">Add step</div>
          <div className="grid grid-cols-2 gap-1.5">
            {available.map((t) => (
              <PaletteItem
                key={t.type}
                meta={t}
                ownerOnly={OWNER_ONLY_TYPES.includes(t.type)}
                isOwner={isOwner}
                selected={type === t.type}
                onDrag={dragType(t.type)}
                onClick={() => setType(t.type)}
              />
            ))}
          </div>
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
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={submit}>
              Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
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
      )}

      {!adding && (
        <p className="text-[10px] text-fg-muted">
          Click a type to name it, or drag a type onto the canvas.
        </p>
      )}
    </aside>
  );

  function submit() {
    addByType(type);
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-medium uppercase tracking-wider text-fg-muted">
        {label}
      </div>
      {children}
    </div>
  );
}

function PaletteItem({
  meta,
  ownerOnly,
  isOwner,
  selected,
  onDrag,
  onClick,
}: {
  meta: StepTypeMeta;
  ownerOnly: boolean;
  isOwner: boolean;
  selected?: boolean;
  onDrag: (e: React.DragEvent) => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={onDrag}
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-left transition-colors"
      style={{
        borderColor:
          selected ? meta.accent : "var(--color-border)",
        backgroundColor: selected ? `${meta.accent}1a` : "transparent",
      }}
    >
      <span style={{ color: meta.accent }}>{iconPath(meta.icon)}</span>
      <span className="min-w-0 flex-1 truncate text-xs text-fg">{meta.label}</span>
      {ownerOnly && !isOwner && (
        <span
          className="rounded-xs ml-auto px-1.5 py-0.5 text-[9px] font-medium"
          style={{ color: "#fbbf24", backgroundColor: "#fbbf241a" }}
          title="Owner only"
        >
          Owner
        </span>
      )}
    </button>
  );
}
