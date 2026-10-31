import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton rows with an accessible loading announcement. */
export default function LoadingState({ rows = 4, label = "Loading" }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}…</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
