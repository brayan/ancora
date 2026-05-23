import type { ReactNode } from "react";

export type StatusBadgeTone = "neutral" | "ready" | "warning";

export type StatusBadgeProps = Readonly<{
  children: ReactNode;
  className?: string;
  tone?: StatusBadgeTone;
}>;

export function StatusBadge({ children, className, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span className={className} data-tone={tone}>
      {children}
    </span>
  );
}
