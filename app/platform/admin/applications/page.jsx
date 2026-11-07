import { Suspense } from "react";
import { connection } from "next/server";

import ApplicationsTable from "@/features/platform-admin/components/ApplicationsTable";
import { requirePlatformAdminSession } from "@/lib/auth/dal";
import { loadApplications } from "@/lib/platform/data";

export const metadata = {
  title: "Applications",
};

async function ApplicationsData() {
  // Wait for an incoming request before accessing dynamic data.
  await connection();

  const [session, rows] = await Promise.all([
    requirePlatformAdminSession(),
    loadApplications(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Applications</h1>

      <p className="mt-1 text-sm text-muted-foreground">
        Review restaurant applications. Approving creates the workspace and its
        Owner.
      </p>

      <div className="mt-8">
        <ApplicationsTable
          rows={rows}
          canManage={session.platformRole === "SUPER_ADMIN"}
        />
      </div>
    </div>
  );
}

function ApplicationsSkeleton() {
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

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<ApplicationsSkeleton />}>
      <ApplicationsData />
    </Suspense>
  );
}
