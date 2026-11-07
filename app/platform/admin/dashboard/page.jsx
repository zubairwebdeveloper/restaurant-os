import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { Building2, CircleCheck, Inbox, PauseCircle } from "lucide-react";

import MetricCard from "@/components/shared/MetricCard";
import AuditLogTable from "@/features/platform-admin/components/AuditLogTable";
import { loadOverview } from "@/lib/platform/data";

export const metadata = {
  title: "Platform overview",
};

async function DashboardData() {
  // Execute Firestore queries only during an incoming request.
  await connection();

  const { totals, recentActivity } = await loadOverview();

  return (
    <>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Restaurants" value={totals.total} icon={Building2} />

        <MetricCard label="Active" value={totals.active} icon={CircleCheck} />

        <MetricCard
          label="Pending applications"
          value={totals.pendingApplications}
          icon={Inbox}
          hint={
            totals.pendingApplications > 0
              ? "Waiting for review"
              : "Nothing waiting"
          }
        />

        <MetricCard
          label="Suspended"
          value={totals.suspended}
          icon={PauseCircle}
        />
      </div>

      <section className="mt-10" aria-labelledby="recent-activity">
        <h2 id="recent-activity" className="mb-4 text-lg font-semibold">
          Recent activity
        </h2>

        <AuditLogTable rows={recentActivity} pageSize={8} />
      </section>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div
      className="mt-8 space-y-8"
      aria-label="Loading dashboard"
      aria-busy="true"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-xl border bg-muted/40"
          />
        ))}
      </div>

      <div className="space-y-4">
        <div className="h-6 w-40 animate-pulse rounded bg-muted/40" />
        <div className="h-64 animate-pulse rounded-xl border bg-muted/40" />
      </div>
    </div>
  );
}

export default function PlatformOverviewPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Platform overview</h1>

      <p className="mt-1 text-sm text-muted-foreground">
        Restaurants and applications across the platform.
      </p>

      <div className="mt-4 text-sm">
        <Link
          href="/platform/admin/applications"
          className="font-medium underline underline-offset-4"
        >
          Review applications
        </Link>
      </div>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardData />
      </Suspense>
    </div>
  );
}
