import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";

export default function FormField({
  id,
  label,
  error,
  hint,
  required = false,
  children,
  className,
}) {
  return (
    <Field data-invalid={Boolean(error)} className={className}>
      {label && (
        <FieldLabel htmlFor={id}>
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </FieldLabel>
      )}

      {typeof children === "function"
        ? children({
            id,
            "aria-invalid": Boolean(error),
            "aria-describedby": error
              ? `${id}-error`
              : hint
                ? `${id}-hint`
                : undefined,
          })
        : children}

      {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}

      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}
