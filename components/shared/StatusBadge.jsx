import { CircleCheck, Clock, Ban, CircleX, Info, TriangleAlert, Circle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Status is always shown as icon + text, never colour alone (WCAG 1.4.1).
 * Tenant lifecycle statuses map to the platform's PENDING / ACTIVE / SUSPENDED / REJECTED / CANCELLED.
 */
const STATUS = {
  ACTIVE: { label: "Active", tone: "success", icon: CircleCheck },
  PENDING: { label: "Pending review", tone: "warning", icon: Clock },
  SUSPENDED: { label: "Suspended", tone: "warning", icon: Ban },
  REJECTED: { label: "Rejected", tone: "destructive", icon: CircleX },
  CANCELLED: { label: "Cancelled", tone: "neutral", icon: CircleX },
  success: { label: "Success", tone: "success", icon: CircleCheck },
  warning: { label: "Warning", tone: "warning", icon: TriangleAlert },
  danger: { label: "Error", tone: "destructive", icon: CircleX },
  info: { label: "Info", tone: "info", icon: Info },
  neutral: { label: "Neutral", tone: "neutral", icon: Circle },
};

const TONES = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  destructive: "bg-destructive-soft text-destructive",
  info: "bg-info-soft text-info",
  neutral: "bg-muted text-muted-foreground",
};

export default function StatusBadge({ status = "neutral", label, className }) {
  const cfg = STATUS[status] ?? STATUS.neutral;
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        TONES[cfg.tone],
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label ?? cfg.label}
    </span>
  );
}
