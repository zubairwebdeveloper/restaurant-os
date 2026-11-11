"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/forms/form-field";
import { contactSchema } from "@/lib/validations/forms";

export function ContactForm() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });
  const err = (k) => errors[k]?.message;
  const aria = (k) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `c-${k}-error` : undefined });

  const onSubmit = async () => {
    // Phase 2: front-end only. Delivery to the restaurant inbox is wired in Phase 3/5.
    await new Promise((r) => setTimeout(r, 500));
    toast.message("Messages are not delivered yet. Please call or email us directly for now.");
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5 sm:grid-cols-2">
      <FormField id="c-name" label="Full name" error={err("name")}><Input id="c-name" autoComplete="name" {...aria("name")} {...register("name")} /></FormField>
      <FormField id="c-email" label="Email" error={err("email")}><Input id="c-email" type="email" autoComplete="email" {...aria("email")} {...register("email")} /></FormField>
      <FormField id="c-subject" label="Subject" error={err("subject")} className="sm:col-span-2"><Input id="c-subject" {...aria("subject")} {...register("subject")} /></FormField>
      <FormField id="c-message" label="Message" error={err("message")} className="sm:col-span-2"><Textarea id="c-message" rows={6} {...aria("message")} {...register("message")} /></FormField>
      <div className="sm:col-span-2"><Button type="submit" size="lg" disabled={isSubmitting}>{isSubmitting ? "Sending" : "Send message"}</Button></div>
    </form>
  );
}
