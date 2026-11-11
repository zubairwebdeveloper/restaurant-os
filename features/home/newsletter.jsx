"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { newsletterSchema } from "@/lib/validations/forms";

export function Newsletter() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(newsletterSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async () => {
    // Phase 2: front-end only. Storage is connected in Phase 3/4.
    await new Promise((r) => setTimeout(r, 400));
    toast.message("Newsletter sign-up opens soon. Your email was not saved yet.");
    reset();
  };

  return (
    <section className="border-t border-ivory/10 py-20">
      <Container className="grid items-center gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-3xl sm:text-4xl">Hear about seasonal menus and events</h2>
          <p className="mt-3 text-ivory/65">One short email a month. No spam.</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-2">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="newsletter-email" className="sr-only">Email address</label>
            <Input id="newsletter-email" type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={!!errors.email} aria-describedby={errors.email ? "newsletter-error" : undefined} {...register("email")} />
            <Button type="submit" disabled={isSubmitting} className="sm:shrink-0">{isSubmitting ? "Sending" : "Subscribe"}</Button>
          </div>
          {errors.email ? <p id="newsletter-error" role="alert" className="text-xs text-red-300">{errors.email.message}</p> : null}
        </form>
      </Container>
    </section>
  );
}
