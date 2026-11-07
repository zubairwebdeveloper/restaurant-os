const formatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

/** Fixed UTC formatting so server and browser render identical text (no hydration mismatch). */
export function formatDateTime(iso) {
  if (!iso) return "-";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "-" : `${formatter.format(date)} UTC`;
}
