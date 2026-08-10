import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Badge = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function Badge({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
          className,
        )}
        {...props}
      />
    );
  },
);
