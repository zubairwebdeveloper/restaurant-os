"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import FormField from "@/components/shared/FormField";
import { FONT_PAIRINGS, TEMPLATES } from "@/config/restaurant-templates";
import { brandingSchema } from "@/schemas/website.schema";
import { normalizeHex } from "@/lib/utils/color";
import { saveBrandingAction } from "@/app/dashboard/branding/actions";
import SitePreview from "./SitePreview";

export default function BrandingEditor({ tenantName, initialBranding, website }) {
  const router = useRouter();
  const [formError, setFormError] = useState(null);
  const {
    register, handleSubmit, control, setValue, reset, formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(brandingSchema), defaultValues: initialBranding });
  const values = useWatch({ control });

  async function onSubmit(data) {
    setFormError(null);
    const result = await saveBrandingAction(data);
    if (result.ok) {
      toast.success("Branding saved.");
      reset(result.branding);
      router.refresh();
    } else {
      setFormError(result.error);
    }
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {formError ? <Alert tone="error">{formError}</Alert> : null}

        <fieldset>
          <legend className="text-sm font-medium">Template</legend>
          <div className="mt-2 grid gap-2">
            {Object.values(TEMPLATES).map((t) => (
              <div key={t.id}>
                <input id={`tpl-${t.id}`} type="radio" value={t.id} className="peer sr-only" {...register("template")} />
                <label
                  htmlFor={`tpl-${t.id}`}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface p-3 peer-checked:border-primary peer-checked:ring-2 peer-checked:ring-primary peer-focus-visible:outline-2 peer-focus-visible:outline-ring"
                >
                  <span aria-hidden="true" className="size-8 shrink-0 rounded-md border border-border" style={{ background: t.vars["--background"], boxShadow: `inset 0 -12px 0 ${t.defaultPrimary}` }} />
                  <span>
                    <span className="block text-sm font-medium">{t.name}</span>
                    <span className="block text-xs text-muted-foreground">{t.description}</span>
                  </span>
                </label>
              </div>
            ))}
          </div>
        </fieldset>

        <FormField id="primaryColor" label="Brand colour" error={errors.primaryColor?.message} hint="Buttons and accents. Colours that make text hard to read are rejected.">
          {(a) => (
            <div className="flex gap-2">
              <input
                type="color"
                aria-label="Pick brand colour"
                value={normalizeHex(values.primaryColor) ?? "#000000"}
                onChange={(e) => setValue("primaryColor", e.target.value.toUpperCase(), { shouldDirty: true, shouldValidate: true })}
                className="h-11 w-14 cursor-pointer rounded-md border border-border bg-surface p-1"
              />
              <Input {...a} className="font-mono" {...register("primaryColor")} />
            </div>
          )}
        </FormField>

        <FormField id="fontPairing" label="Typography" error={errors.fontPairing?.message}>
          {(a) => (
            <select {...a} {...register("fontPairing")} className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm">
              {Object.entries(FONT_PAIRINGS).map(([id, f]) => <option key={id} value={id}>{f.label}</option>)}
            </select>
          )}
        </FormField>

        <FormField id="tagline" label="Tagline" error={errors.tagline?.message} hint="One short line shown under the headline.">
          {(a) => <Input {...a} maxLength={120} {...register("tagline")} />}
        </FormField>

        <Button type="submit" size="lg" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {isSubmitting ? "Saving…" : "Save branding"}
        </Button>
      </form>

      <SitePreview site={{ name: tenantName, branding: { ...initialBranding, ...values }, website }} />
    </div>
  );
}
