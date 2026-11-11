import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

/** Label + control + error message, wired for React Hook Form. */
export function FormField({ id, label, error, hint, className, children }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error ? <p className="text-xs text-ivory/50">{hint}</p> : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
