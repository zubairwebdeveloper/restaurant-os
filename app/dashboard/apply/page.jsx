import Link from "next/link";
import { connection } from "next/server";

import ApplicationForm from "@/features/onboarding/components/ApplicationForm";
import ApplicationStatusList from "@/features/onboarding/components/ApplicationStatusList";
import { Alert } from "@/components/ui/alert";
import { loadMyApplications } from "@/lib/onboarding/data";

export const metadata = { title: "Apply for a workspace" };

export default async function ApplyPage() {
  await connection();

  const applications = await loadMyApplications();
  const pending = applications.some((a) => a.status === "PENDING");

  return (
    <div>
      <h1 className="text-2xl font-semibold">
        Apply for a restaurant workspace
      </h1>

      <p className="mt-1 max-w-prose text-sm text-muted-foreground">
        Tell us about your business. Our team reviews every application, and you
        get access once it is approved.
      </p>

      <div className="mt-8 space-y-8">
        {pending ? (
          <Alert tone="info">
            You already have an application under review. You can apply again if
            it is not approved.
          </Alert>
        ) : (
          <ApplicationForm />
        )}

        {applications.length > 0 ? (
          <section aria-labelledby="your-applications">
            <h2 id="your-applications" className="mb-3 text-lg font-semibold">
              Your applications
            </h2>
            <ApplicationStatusList applications={applications} />
          </section>
        ) : null}

        <Link
          href="/dashboard"
          className="inline-block text-sm underline underline-offset-4"
        >
          Back to overview
        </Link>
      </div>
    </div>
  );
}
