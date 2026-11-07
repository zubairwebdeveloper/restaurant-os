"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import FormField from "@/components/shared/FormField";
import { categorySchema } from "@/schemas/menu.schema";

export default function CategoryForm({ category, onSubmit, onCancel }) {
  const [formError, setFormError] = useState(null);
  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: category?.name ?? "", description: category?.description ?? "", visibility: category?.visibility ?? "PUBLIC" },
  });

  async function submit(values) {
    setFormError(null);
    const error = await onSubmit(values);
    if (error) setFormError(error);
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="max-w-xl space-y-4">
      <h2 className="text-lg font-semibold">{category ? "Edit category" : "New category"}</h2>
      {formError ? <Alert tone="error">{formError}</Alert> : null}
      <FormField id="cat-name" label="Name" error={errors.name?.message}>{(a) => <Input {...a} maxLength={60} {...register("name")} />}</FormField>
      <FormField id="cat-description" label="Description (optional)" error={errors.description?.message}>{(a) => <Input {...a} maxLength={200} {...register("description")} />}</FormField>
      <FormField id="cat-visibility" label="Visibility" hint="Private categories never appear on your public menu.">
        {(a) => (
          <select {...a} {...register("visibility")} className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm">
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Private (staff only)</option>
          </select>
        )}
      </FormField>
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}Save category</Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
      </div>
    </form>
  );
}
