"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/shared/DataTable";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import ReasonDialog from "@/components/shared/ReasonDialog";
import { filterTenants } from "@/lib/platform/filters";
import { formatDateTime } from "@/lib/utils/format";
import { reactivateTenantAction, suspendTenantAction } from "@/app/platform/admin/actions";
import FilterBar from "./FilterBar";

const STATUSES = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "PENDING", label: "Pending" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function TenantsTable({ rows, canManage }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [target, setTarget] = useState(null); // { type: "suspend" | "reactivate", row }

  const filtered = useMemo(() => filterTenants(rows, { status, search }), [rows, status, search]);

  const columns = [
    {
      id: "name", header: "Restaurant", sortable: true, accessor: (r) => r.name,
      cell: (r) => (
        <div>
          <p className="font-medium">{r.name}</p>
          {r.status === "SUSPENDED" && r.statusReason ? <p className="max-w-56 text-xs text-muted-foreground">Reason: {r.statusReason}</p> : null}
        </div>
      ),
    },
    {
      id: "owner", header: "Owner", sortable: true, accessor: (r) => r.ownerEmail,
      cell: (r) => (
        <div>
          <p>{r.ownerName ?? "-"}</p>
          <p className="text-xs text-muted-foreground">{r.ownerEmail ?? "Account not found"}</p>
        </div>
      ),
    },
    { id: "plan", header: "Plan", sortable: true, accessor: (r) => r.planId, cell: (r) => <span className="capitalize">{r.planId ?? "-"}</span> },
    { id: "location", header: "Location", sortable: true, accessor: (r) => [r.city, r.country].filter(Boolean).join(", ") },
    { id: "created", header: "Created", sortable: true, accessor: (r) => r.createdAt, cell: (r) => <span className="tabular whitespace-nowrap">{formatDateTime(r.createdAt)}</span> },
    { id: "status", header: "Status", sortable: true, accessor: (r) => r.status, cell: (r) => <StatusBadge status={r.status} /> },
    {
      id: "actions", header: <span className="sr-only">Actions</span>,
      accessor: () => null,
      cell: (r) => {
        if (!canManage) return null;
        if (r.status === "ACTIVE") {
          return <Button size="sm" variant="outline" onClick={() => setTarget({ type: "suspend", row: r })}><Pause aria-hidden="true" />Suspend</Button>;
        }
        if (r.status === "SUSPENDED") {
          return <Button size="sm" variant="outline" onClick={() => setTarget({ type: "reactivate", row: r })}><Play aria-hidden="true" />Reactivate</Button>;
        }
        return null;
      },
    },
  ];

  async function confirm(reason) {
    const action = target.type === "suspend" ? suspendTenantAction : reactivateTenantAction;
    const result = await action({ tenantId: target.row.id, reason });
    if (result.ok) {
      toast.success(target.type === "suspend" ? `${target.row.name} suspended.` : `${target.row.name} reactivated.`);
      startTransition(() => router.refresh());
    }
    return result;
  }

  const suspending = target?.type === "suspend";

  return (
    <div>
      <FilterBar search={search} onSearch={setSearch} status={status} onStatus={setStatus} statuses={STATUSES} searchLabel="Search by restaurant, owner or city" />
      <DataTable
        caption="Restaurants"
        columns={columns}
        rows={filtered}
        getRowId={(r) => r.id}
        initialSort={{ id: "created", direction: "desc" }}
        emptyState={
          <EmptyState
            icon={Building2}
            title={rows.length === 0 ? "No restaurants yet" : "No restaurants match"}
            description={rows.length === 0 ? "Approved applications create restaurants, which then appear here." : "Try a different search or status."}
          />
        }
      />
      <ReasonDialog
        open={Boolean(target)}
        onOpenChange={(open) => !open && setTarget(null)}
        title={suspending ? `Suspend ${target?.row.name}?` : `Reactivate ${target?.row.name}?`}
        description={suspending ? "All staff lose access immediately, and the public website is hidden. The reason is recorded in the audit log." : "Staff regain access immediately."}
        confirmLabel={suspending ? "Suspend restaurant" : "Reactivate restaurant"}
        destructive={suspending}
        reasonRequired={suspending}
        onConfirm={confirm}
      />
    </div>
  );
}
