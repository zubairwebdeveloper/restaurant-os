"use client";

import { ScrollText } from "lucide-react";
import DataTable from "@/components/shared/DataTable";
import EmptyState from "@/components/shared/EmptyState";
import { formatDateTime } from "@/lib/utils/format";
import { auditLabel } from "./labels";

export default function AuditLogTable({ rows, pageSize = 15 }) {
  const columns = [
    { id: "when", header: "When", sortable: true, accessor: (r) => r.createdAt, cell: (r) => <span className="tabular whitespace-nowrap">{formatDateTime(r.createdAt)}</span> },
    { id: "action", header: "Action", sortable: true, accessor: (r) => auditLabel(r.action), cell: (r) => <span className="font-medium">{auditLabel(r.action)}</span> },
    { id: "actor", header: "By", sortable: true, accessor: (r) => r.actorUid, cell: (r) => <code className="text-xs">{r.actorUid}</code> },
    { id: "target", header: "Target", accessor: (r) => `${r.targetType ?? ""} ${r.targetId ?? ""}`, cell: (r) => <code className="text-xs">{r.targetType}: {r.targetId}</code> },
    { id: "details", header: "Details", accessor: () => null, cell: (r) => <span className="text-muted-foreground">{r.details?.reason ?? r.details?.email ?? (r.details?.tenantId ? `tenant ${r.details.tenantId}` : "")}</span> },
  ];

  return (
    <DataTable
      caption="Platform audit log"
      columns={columns}
      rows={rows}
      getRowId={(r) => r.id}
      pageSize={pageSize}
      initialSort={{ id: "when", direction: "desc" }}
      emptyState={<EmptyState icon={ScrollText} title="No activity yet" description="Approvals, rejections and suspensions are recorded here." />}
    />
  );
}
