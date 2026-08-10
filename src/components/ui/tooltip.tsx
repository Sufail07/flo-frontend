import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Tooltip({
  children,
  content,
  side = "bottom",
}: {
  children: ReactNode;
  content: ReactNode;
  side?: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);
  const pos =
    side === "top"
      ? "bottom-full left-1/2 -translate-x-1/2 mb-1.5"
      : "top-full left-1/2 -translate-x-1/2 mt-1.5";
  return (
    <span
      className="relative inline-block cursor-help"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          className={cn(
            "pointer-events-none absolute w-max max-w-xs rounded-md bg-surface-2 px-2 py-1 text-[10px] text-fg-secondary opacity-95",
            pos,
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
