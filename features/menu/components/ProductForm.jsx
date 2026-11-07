"use client";

import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import FormField from "@/components/shared/FormField";
import { DIETARY_LABELS, LIMITS } from "@/config/menu";
import { productFormSchema, toProductForm, toProductInput } from "@/lib/menu/form";

const get = (errors, path) => path.split(".").reduce((o, k) => o?.[k], errors)?.message;

function Section({ title, hint, children }) {
  return (
    <fieldset className="space-y-4 rounded-lg border border-border bg-surface p-4">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      {hint ? <p className="-mt-2 text-xs text-muted-foreground">{hint}</p> : null}
      {children}
    </fieldset>
  );
}

function OptionRows({ control, register, errors, groupIndex }) {
  const { fields, append, remove } = useFieldArray({ control, name: `modifierGroups.${groupIndex}.options`, keyName: "_key" });
  return (
    <div className="space-y-2">
      {fields.map((field, oi) => {
        const base = `modifierGroups.${groupIndex}.options.${oi}`;
        return (
          <div key={field._key} className="grid grid-cols-[1fr_7rem_auto] items-start gap-2">
            <FormField id={`${base}.name`} label={`Option ${oi + 1} name`} error={get(errors, `${base}.name`)}>{(a) => <Input {...a} {...register(`${base}.name`)} />}</FormField>
            <FormField id={`${base}.price`} label="Extra price" error={get(errors, `${base}.price`)}>{(a) => <Input {...a} inputMode="decimal" {...register(`${base}.price`)} />}</FormField>
            <Button type="button" variant="ghost" size="icon" className="mt-6" aria-label={`Remove option ${oi + 1}`} onClick={() => remove(oi)} disabled={fields.length <= 1}><Trash2 aria-hidden="true" /></Button>
          </div>
        );
      })}
      {get(errors, `modifierGroups.${groupIndex}.options`) ? <p role="alert" className="text-xs font-medium text-destructive">{get(errors, `modifierGroups.${groupIndex}.options`)}</p> : null}
      <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", price: "0.00" })} disabled={fields.length >= LIMITS.MAX_OPTIONS_PER_GROUP}><Plus aria-hidden="true" />Add option</Button>
    </div>
  );
}

export default function ProductForm({ product, categories, defaultCategoryId, currency, onSubmit, onCancel }) {
  const [formError, setFormError] = useState(null);
  const {
    register, handleSubmit, control, formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(productFormSchema), defaultValues: toProductForm(product, defaultCategoryId) });
  const variantsField = useFieldArray({ control, name: "variants", keyName: "_key" });
  const groupsField = useFieldArray({ control, name: "modifierGroups", keyName: "_key" });
  const variants = useWatch({ control, name: "variants" });
  const hasVariants = (variants?.length ?? 0) > 0;

  async function submit(values) {
    setFormError(null);
    const error = await onSubmit(toProductInput(values));
    if (error) setFormError(error);
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="max-w-3xl space-y-5">
      <h2 className="text-lg font-semibold">{product ? "Edit product" : "New product"}</h2>
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <Section title="Basics">
        <FormField id="p-name" label="Name" error={errors.name?.message}>{(a) => <Input {...a} maxLength={80} {...register("name")} />}</FormField>
        <FormField id="p-description" label="Description (optional)" error={errors.description?.message}>{(a) => <Textarea {...a} rows={3} maxLength={500} {...register("description")} />}</FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="p-category" label="Category" error={errors.categoryId?.message}>
            {(a) => (
              <select {...a} {...register("categoryId")} className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm">
                <option value="">Choose a category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </FormField>
          {hasVariants ? (
            <p className="self-end pb-2 text-sm text-muted-foreground">The base price is the lowest variant price.</p>
          ) : (
            <FormField id="p-price" label={`Price (${currency})`} error={errors.price?.message} hint="For example 1250.00">{(a) => <Input {...a} inputMode="decimal" {...register("price")} />}</FormField>
          )}
        </div>
      </Section>

      <Section title="Variants" hint="Sizes or versions with their own price, for example Small and Large. Leave empty for a single price.">
        {variantsField.fields.map((field, i) => (
          <div key={field._key} className="grid grid-cols-[1fr_8rem_auto] items-start gap-2">
            <FormField id={`variants.${i}.name`} label={`Variant ${i + 1} name`} error={get(errors, `variants.${i}.name`)}>{(a) => <Input {...a} {...register(`variants.${i}.name`)} />}</FormField>
            <FormField id={`variants.${i}.price`} label="Price" error={get(errors, `variants.${i}.price`)}>{(a) => <Input {...a} inputMode="decimal" {...register(`variants.${i}.price`)} />}</FormField>
            <Button type="button" variant="ghost" size="icon" className="mt-6" aria-label={`Remove variant ${i + 1}`} onClick={() => variantsField.remove(i)}><Trash2 aria-hidden="true" /></Button>
          </div>
        ))}
        {get(errors, "variants") ? <p role="alert" className="text-xs font-medium text-destructive">{get(errors, "variants")}</p> : null}
        <Button type="button" variant="outline" size="sm" onClick={() => variantsField.append({ name: "", price: "" })} disabled={variantsField.fields.length >= LIMITS.MAX_VARIANTS}><Plus aria-hidden="true" />Add variant</Button>
      </Section>

      <Section title="Modifiers and add-ons" hint="Choices the customer makes, for example Extra toppings (choose up to 3). A minimum of 1 makes the choice required.">
        {groupsField.fields.map((field, gi) => (
          <div key={field._key} className="space-y-3 rounded-md border border-border p-3">
            <div className="grid grid-cols-[1fr_5rem_5rem_auto] items-start gap-2">
              <FormField id={`modifierGroups.${gi}.name`} label="Group name" error={get(errors, `modifierGroups.${gi}.name`)}>{(a) => <Input {...a} {...register(`modifierGroups.${gi}.name`)} />}</FormField>
              <FormField id={`modifierGroups.${gi}.min`} label="Min" error={get(errors, `modifierGroups.${gi}.min`)}>{(a) => <Input {...a} inputMode="numeric" {...register(`modifierGroups.${gi}.min`)} />}</FormField>
              <FormField id={`modifierGroups.${gi}.max`} label="Max" error={get(errors, `modifierGroups.${gi}.max`)}>{(a) => <Input {...a} inputMode="numeric" {...register(`modifierGroups.${gi}.max`)} />}</FormField>
              <Button type="button" variant="ghost" size="icon" className="mt-6" aria-label={`Remove group ${gi + 1}`} onClick={() => groupsField.remove(gi)}><Trash2 aria-hidden="true" /></Button>
            </div>
            <OptionRows control={control} register={register} errors={errors} groupIndex={gi} />
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => groupsField.append({ name: "", min: 0, max: 1, options: [{ name: "", price: "0.00" }] })} disabled={groupsField.fields.length >= LIMITS.MAX_MODIFIER_GROUPS}><Plus aria-hidden="true" />Add modifier group</Button>
      </Section>

      <Section title="Details">
        <fieldset>
          <legend className="text-sm font-medium">Dietary labels</legend>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            {Object.entries(DIETARY_LABELS).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" value={key} className="size-4" {...register("dietary")} />{label}</label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="p-prep" label="Preparation time (minutes)" error={errors.prepTimeMinutes?.message}>{(a) => <Input {...a} inputMode="numeric" {...register("prepTimeMinutes")} />}</FormField>
          <FormField id="p-visibility" label="Visibility" hint="Private items stay off the public menu.">
            {(a) => (
              <select {...a} {...register("visibility")} className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm">
                <option value="PUBLIC">Public</option>
                <option value="PRIVATE">Private (staff only)</option>
              </select>
            )}
          </FormField>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" {...register("featured")} />Featured item</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" {...register("available")} />Available today</label>
        </div>
      </Section>

      <div className="flex gap-3">
        <Button type="submit" size="lg" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}Save product</Button>
        <Button type="button" size="lg" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
      </div>
    </form>
  );
}
