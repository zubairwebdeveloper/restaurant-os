import { Suspense } from "react";
import { connection } from "next/server";

import AuditLogTable from "@/features/platform-admin/components/AuditLogTable";
import { loadAuditLogs } from "@/lib/platform/data";

export const metadata = {
  title: "Audit logs",
};

async function AuditLogsData() {
  // Wait for an incoming request before accessing Firestore.
  await connection();

  const rows = await loadAuditLogs();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Audit logs</h1>

      <p className="mt-1 text-sm text-muted-foreground">
        The most recent 100 platform actions. Entries cannot be edited or
        deleted from the app.
      </p>

      <div className="mt-8">
        <AuditLogTable rows={rows} />
      </div>
    </div>
  );
}

function AuditLogsSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-md bg-muted" />
        <div className="h-4 w-96 max-w-full rounded-md bg-muted" />
      </div>

      <div className="space-y-3">
        <div className="h-12 rounded-lg bg-muted" />
        <div className="h-16 rounded-lg bg-muted" />
        <div className="h-16 rounded-lg bg-muted" />
        <div className="h-16 rounded-lg bg-muted" />
      </div>
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <Suspense fallback={<AuditLogsSkeleton />}>
      <AuditLogsData />
    </Suspense>
  );
}
