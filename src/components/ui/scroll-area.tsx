import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

// Thin-scrollbar container. Global scrollbar styling lives in globals.css,
// so this is just an overflow-aware wrapper (kept as a primitive so the
// palette and inspector share a consistent scroll surface).
export const ScrollArea = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function ScrollArea({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn("overflow-y-auto", className)}
        {...props}
      />
    );
  },
);
