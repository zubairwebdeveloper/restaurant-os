"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Inbox, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/shared/DataTable";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import ReasonDialog from "@/components/shared/ReasonDialog";
import { filterApplications } from "@/lib/platform/filters";
import { formatDateTime } from "@/lib/utils/format";
import { approveApplicationAction, rejectApplicationAction } from "@/app/platform/admin/actions";
import FilterBar from "./FilterBar";

const STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All statuses" },
];

const BADGE = {
  PENDING: { status: "PENDING", label: "Pending review" },
  APPROVED: { status: "ACTIVE", label: "Approved" },
  REJECTED: { status: "REJECTED", label: "Rejected" },
};

export default function ApplicationsTable({ rows, canManage }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [target, setTarget] = useState(null); // { type: "approve" | "reject", row }

  const filtered = useMemo(() => filterApplications(rows, { status, search }), [rows, status, search]);

  const columns = [
    {
      id: "name", header: "Restaurant", sortable: true, accessor: (r) => r.restaurantName,
      cell: (r) => (
        <div>
          <p className="font-medium">{r.restaurantName}</p>
          <p className="text-xs text-muted-foreground">{r.businessType?.replace(/_/g, " ").toLowerCase()}</p>
        </div>
      ),
    },
    {
      id: "owner", header: "Applicant", sortable: true, accessor: (r) => r.ownerEmail,
      cell: (r) => (
        <div>
          <p>{r.ownerName ?? "-"}</p>
          <p className="text-xs text-muted-foreground">{r.ownerEmail ?? "Account not found"}</p>
          <p className="text-xs text-muted-foreground">{r.phone}</p>
        </div>
      ),
    },
    { id: "location", header: "Location", sortable: true, accessor: (r) => [r.city, r.country].filter(Boolean).join(", ") },
    { id: "submitted", header: "Submitted", sortable: true, accessor: (r) => r.createdAt, cell: (r) => <span className="tabular whitespace-nowrap">{formatDateTime(r.createdAt)}</span> },
    {
      id: "status", header: "Status", sortable: true, accessor: (r) => r.status,
      cell: (r) => (
        <div>
          <StatusBadge {...BADGE[r.status]} />
          {r.status === "REJECTED" && r.rejectionReason ? <p className="mt-1 max-w-56 text-xs text-muted-foreground">{r.rejectionReason}</p> : null}
        </div>
      ),
    },
    {
      id: "actions", header: <span className="sr-only">Actions</span>,
      accessor: () => null,
      cell: (r) =>
        r.status === "PENDING" && canManage ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setTarget({ type: "approve", row: r })}><Check aria-hidden="true" />Approve</Button>
            <Button size="sm" variant="outline" onClick={() => setTarget({ type: "reject", row: r })}><X aria-hidden="true" />Reject</Button>
          </div>
        ) : null,
    },
  ];

  async function approve() {
    const result = await approveApplicationAction({ applicationId: target.row.id });
    if (result.ok) {
      toast.success(`${target.row.restaurantName} approved. Workspace created.`);
      startTransition(() => router.refresh());
    } else {
      toast.error(result.error);
    }
  }

  async function reject(reason) {
    const result = await rejectApplicationAction({ applicationId: target.row.id, reason });
    if (result.ok) {
      toast.success("Application rejected.");
      startTransition(() => router.refresh());
    }
    return result;
  }

  return (
    <div>
      <FilterBar search={search} onSearch={setSearch} status={status} onStatus={setStatus} statuses={STATUSES} searchLabel="Search by restaurant, applicant or city" />
      <DataTable
        caption="Restaurant applications"
        columns={columns}
        rows={filtered}
        getRowId={(r) => r.id}
        initialSort={{ id: "submitted", direction: "desc" }}
        emptyState={
          <EmptyState
            icon={Inbox}
            title={rows.length === 0 ? "No applications yet" : "No applications match"}
            description={rows.length === 0 ? "Restaurant owners will appear here after they submit an application." : "Try a different search or status."}
          />
        }
      />

      <ConfirmDialog
        open={target?.type === "approve"}
        onOpenChange={(open) => !open && setTarget(null)}
        title={`Approve ${target?.row.restaurantName ?? "application"}?`}
        description="This creates the restaurant workspace and gives the applicant the Owner role. The restaurant becomes active immediately."
        confirmLabel="Approve and create workspace"
        onConfirm={approve}
      />
      <ReasonDialog
        open={target?.type === "reject"}
        onOpenChange={(open) => !open && setTarget(null)}
        title={`Reject ${target?.row.restaurantName ?? "application"}?`}
        description="The reason is recorded in the audit log."
        confirmLabel="Reject application"
        destructive
        onConfirm={reject}
      />
    </div>
  );
}
