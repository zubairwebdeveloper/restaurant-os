import { Suspense } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import LoadingState from "@/components/shared/LoadingState";
import SessionHydrator from "@/features/auth/components/SessionHydrator";
import { requirePlatformAdminSession } from "@/lib/auth/dal";
import { PLATFORM_NAV_GROUPS, getVisibleNav } from "@/config/navigation";

async function PlatformGate({ children }) {
  // Redirects anyone who is not an active platform admin. Pages and data loaders
  // re-check on their own: layouts do not re-run on client-side navigation.
  const session = await requirePlatformAdminSession();
  return (
    <>
      <SessionHydrator session={session} />
      <DashboardShell navGroups={getVisibleNav(undefined, PLATFORM_NAV_GROUPS)} title="Platform admin" homeHref="/platform/admin/dashboard">
        {children}
      </DashboardShell>
    </>
  );
}

export default function PlatformLayout({ children }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-6 py-16"><LoadingState rows={5} label="Checking access" /></div>}>
      <PlatformGate>{children}</PlatformGate>
    </Suspense>
  );
}
