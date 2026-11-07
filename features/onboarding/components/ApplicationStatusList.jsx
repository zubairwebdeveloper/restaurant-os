import StatusBadge from "@/components/shared/StatusBadge";
import { formatDateTime } from "@/lib/utils/format";

const BADGE = {
  PENDING: { status: "PENDING", label: "Under review" },
  APPROVED: { status: "ACTIVE", label: "Approved" },
  REJECTED: { status: "REJECTED", label: "Not approved" },
};

export default function ApplicationStatusList({ applications }) {
  return (
    <ul className="space-y-3">
      {applications.map((a) => (
        <li key={a.id} className="rounded-lg border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{a.restaurantName}</p>
            <StatusBadge {...BADGE[a.status]} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Submitted {formatDateTime(a.createdAt)}</p>
          {a.status === "REJECTED" && a.rejectionReason ? <p className="mt-2 text-sm">Reason: {a.rejectionReason}</p> : null}
          {a.status === "PENDING" ? <p className="mt-2 text-sm text-muted-foreground">Our team is reviewing your application. You will get access as soon as it is approved.</p> : null}
        </li>
      ))}
    </ul>
  );
}
