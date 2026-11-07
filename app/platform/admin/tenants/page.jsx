import { Suspense } from "react";
import { connection } from "next/server";

import TenantsTable from "@/features/platform-admin/components/TenantsTable";
import { requirePlatformAdminSession } from "@/lib/auth/dal";
import { loadTenants } from "@/lib/platform/data";

export const metadata = {
  title: "Restaurants",
};

async function TenantsData() {
  // Wait for an incoming request before accessing Firestore.
  await connection();

  const [session, rows] = await Promise.all([
    requirePlatformAdminSession(),
    loadTenants(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Restaurants</h1>

      <p className="mt-1 text-sm text-muted-foreground">
        Every restaurant workspace on the platform. Suspension takes effect on
        the next request.
      </p>

      <div className="mt-8">
        <TenantsTable
          rows={rows}
          canManage={session.platformRole === "SUPER_ADMIN"}
        />
      </div>
    </div>
  );
}

function TenantsSkeleton() {
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

export default function TenantsPage() {
  return (
    <Suspense fallback={<TenantsSkeleton />}>
      <TenantsData />
    </Suspense>
  );
}
