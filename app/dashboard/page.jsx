import { Building2 } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";

export const metadata = { title: "Overview" };

export default function DashboardOverviewPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Overview</h1>
      <p className="mt-1 text-sm text-muted-foreground">Sales, orders and kitchen activity will appear here.</p>
      <EmptyState
        className="mt-8"
        icon={Building2}
        title="No restaurant workspace connected"
        description="Workspaces, sign-in and restaurant data arrive in the next phases. Until then, use the design system page to review the interface foundation."
      />
    </div>
  );
}
