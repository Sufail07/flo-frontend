import { cn } from "@/lib/cn";

export function JsonBlock({
  data,
  label,
  className,
}: {
  data: unknown;
  label?: string;
  className?: string;
}) {
  if (data == null) {
    return (
      <span className="block text-xs text-fg-muted">— none —</span>
    );
  }
  const text =
    typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return (
    <pre
      className={cn(
        "overflow-x-auto rounded-md bg-surface-2 px-2 py-1.5 text-[11px] text-fg-secondary",
        className,
      )}
    >
      {label && (
        <span className="mb-1 block text-[10px] font-medium uppercase text-fg-muted">
          {label}
        </span>
      )}
      <code className="block whitespace-pre-wrap break-all">{text}</code>
    </pre>
  );
}
