import type { ProjectStatus } from "@/lib/supabase/types";

type BadgeVariant = "default" | ProjectStatus;

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<string, string> = {
  default: "bg-gray-100 text-gray-700",
  draft: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  review: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  archived: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_progress: "In Progress",
  review: "In Review",
  completed: "Completed",
  archived: "Archived",
};

export function Badge({
  variant = "default",
  children,
  className = "",
}: BadgeProps) {
  const classes = VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.default;
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        classes,
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge variant={status}>{STATUS_LABELS[status] ?? status}</Badge>
  );
}
