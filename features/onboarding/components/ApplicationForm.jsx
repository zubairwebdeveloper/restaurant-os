"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import FormField from "@/components/shared/FormField";
import { BUSINESS_TYPES, tenantApplicationInputSchema } from "@/schemas/tenant.schema";
import { submitApplicationAction } from "@/app/dashboard/apply/actions";

const TYPE_LABELS = {
  RESTAURANT: "Restaurant", HOTEL: "Hotel restaurant", CAFE: "Cafe", FAST_FOOD: "Fast food",
  CLOUD_KITCHEN: "Cloud kitchen", OTHER: "Other food business",
};

export default function ApplicationForm() {
  const router = useRouter();
  const [formError, setFormError] = useState(null);
  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(tenantApplicationInputSchema),
    defaultValues: { restaurantName: "", businessType: "RESTAURANT", city: "", country: "", phone: "" },
  });

  async function onSubmit(values) {
    setFormError(null);
    const result = await submitApplicationAction(values);
    if (result.ok) {
      toast.success("Application submitted. We will review it shortly.");
      router.replace("/dashboard");
      router.refresh();
    } else {
      setFormError(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-xl space-y-4">
      {formError ? <Alert tone="error">{formError}</Alert> : null}
      <FormField id="restaurantName" label="Restaurant or business name" error={errors.restaurantName?.message}>
        {(a) => <Input {...a} autoComplete="organization" {...register("restaurantName")} />}
      </FormField>
      <FormField id="businessType" label="Type of business" error={errors.businessType?.message}>
        {(a) => (
          <select {...a} {...register("businessType")} className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm">
            {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
        )}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="city" label="City" error={errors.city?.message}>
          {(a) => <Input {...a} autoComplete="address-level2" {...register("city")} />}
        </FormField>
        <FormField id="country" label="Country" error={errors.country?.message}>
          {(a) => <Input {...a} autoComplete="country-name" {...register("country")} />}
        </FormField>
      </div>
      <FormField id="phone" label="Business phone" error={errors.phone?.message} hint="Used by our team to contact you about this application.">
        {(a) => <Input {...a} type="tel" autoComplete="tel" {...register("phone")} />}
      </FormField>
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {isSubmitting ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}
