import { cn } from "@/lib/utils/cn";

/** A single headline number. Values use tabular numerals so they align. */
export default function MetricCard({ label, value, hint, icon: Icon, className }) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface p-5 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Icon ? <Icon className="size-4 text-muted-foreground" aria-hidden="true" /> : null}
      </div>
      <p className="tabular mt-2 font-display text-3xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
