"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import FormField from "@/components/shared/FormField";
import { CURRENCIES } from "@/config/menu";
import { settingsFormSchema } from "@/schemas/pos.schema";
import { saveSettingsAction } from "@/app/dashboard/settings/actions";

export default function SettingsForm({ initial }) {
  const [formError, setFormError] = useState(null);
  const {
    register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(settingsFormSchema), defaultValues: initial });

  async function onSubmit(values) {
    setFormError(null);
    const result = await saveSettingsAction(values);
    if (result.ok) {
      toast.success("Settings saved.");
      reset(values);
    } else {
      setFormError(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-xl space-y-5">
      {formError ? <Alert tone="error">{formError}</Alert> : null}
      <FormField id="currency" label="Currency" error={errors.currency?.message} hint="Applies to your menu, orders and receipts. Change it only before taking orders.">
        {(a) => (
          <select {...a} {...register("currency")} className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm">
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="taxPercent" label="Sales tax (%)" error={errors.taxPercent?.message} hint="Leave 0 if you do not charge tax. Menu prices are tax-exclusive; tax is added at checkout.">
          {(a) => <Input {...a} inputMode="decimal" {...register("taxPercent")} />}
        </FormField>
        <FormField id="servicePercent" label="Service charge (%)" error={errors.servicePercent?.message} hint="Added before tax. Leave 0 for none.">
          {(a) => <Input {...a} inputMode="decimal" {...register("servicePercent")} />}
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="taxLabel" label="Tax name on receipts" error={errors.taxLabel?.message}>{(a) => <Input {...a} maxLength={20} {...register("taxLabel")} />}</FormField>
        <FormField id="taxRegistration" label="Tax registration number" error={errors.taxRegistration?.message} hint="Optional, printed on receipts.">{(a) => <Input {...a} maxLength={40} {...register("taxRegistration")} />}</FormField>
      </div>
      <FormField id="receiptFooter" label="Receipt footer" error={errors.receiptFooter?.message} hint="Optional message at the bottom of receipts.">{(a) => <Textarea {...a} rows={2} maxLength={200} {...register("receiptFooter")} />}</FormField>
      <Button type="submit" size="lg" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {isSubmitting ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
