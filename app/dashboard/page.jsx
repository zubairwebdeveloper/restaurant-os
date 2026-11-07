import Link from "next/link";
import { Building2 } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import ApplicationStatusList from "@/features/onboarding/components/ApplicationStatusList";
import { getSession } from "@/lib/auth/dal";
import { loadMyApplications } from "@/lib/onboarding/data";

export const metadata = { title: "Overview" };

export default async function DashboardOverviewPage() {
  const session = await getSession();
  const active = session?.memberships.find((m) => m.tenantId === session.activeTenantId) ?? null;
  const applications = active ? [] : await loadMyApplications();
  const canEditSite = active?.permissions.includes("SETTINGS_MANAGE");

  return (
    <div>
      <h1 className="text-2xl font-semibold">{active ? active.tenantName : "Welcome"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {active ? "Sales, orders and kitchen activity will appear here." : "Get your restaurant workspace set up."}
      </p>

      {active ? (
        <div className="mt-8 rounded-lg border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status="ACTIVE" label="Workspace active" />
            <span className="text-sm text-muted-foreground">
              You are signed in as <span className="font-medium text-foreground">{active.role.replace(/_/g, " ").toLowerCase()}</span>.
            </span>
          </div>
          {canEditSite ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <Button  variant="outline"><Link href="/dashboard/branding">Set up branding</Link></Button>
              <Button  variant="outline"><Link href="/dashboard/website">Edit website</Link></Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {applications.length > 0 ? <ApplicationStatusList applications={applications} /> : null}
          {applications.some((a) => a.status === "PENDING") ? null : (
            <EmptyState
              icon={Building2}
              title="No restaurant workspace yet"
              description="Submit an application for your restaurant. After our team approves it, your workspace opens here."
              action={<Button ><Link href="/dashboard/apply">Apply for a workspace</Link></Button>}
            />
          )}
        </div>
      )}
    </div>
  );
}
