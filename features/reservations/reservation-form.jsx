"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/forms/form-field";
import { reservationSchema } from "@/lib/validations/forms";

const times = ["12:00", "13:00", "14:00", "15:00", "18:00", "19:00", "20:00", "21:00", "22:00"];
const occasions = ["None", "Birthday", "Anniversary", "Family gathering", "Business meal"];
const selectClass = "flex h-11 w-full rounded-sm border border-ivory/20 bg-charcoal/60 px-4 text-sm text-ivory focus-visible:border-gold focus-visible:outline-none aria-[invalid=true]:border-red-400";

export function ReservationForm() {
  const [summary, setSummary] = useState(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(reservationSchema),
    defaultValues: { name: "", phone: "", email: "", date: "", time: "", guests: 2, occasion: "None", notes: "" },
  });

  const onSubmit = async (values) => {
    // Phase 2: front-end only. Saving and confirmation emails arrive in Phase 4.
    await new Promise((r) => setTimeout(r, 500));
    setSummary(values);
    toast.message("Request prepared. Online booking is being finalised.");
  };

  if (summary) {
    return (
      <div className="rounded-md border border-gold/40 bg-charcoal/50 p-8 sm:p-10" role="status">
        <CheckCircle2 className="size-10 text-gold" />
        <h2 className="mt-5 text-3xl">Thank you, {summary.name.split(" ")[0]}</h2>
        <p className="mt-3 text-ivory/70">
          Your request is for {summary.guests} {summary.guests === 1 ? "guest" : "guests"} on {summary.date} at {summary.time}.
          Online booking is still being connected, so please call us to confirm your table.
        </p>
        <Button className="mt-7" variant="outline" onClick={() => { setSummary(null); reset(); }}>Make another request</Button>
      </div>
    );
  }

  const err = (k) => errors[k]?.message;
  const aria = (k) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-error` : undefined });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5 sm:grid-cols-2">
      <FormField id="name" label="Full name" error={err("name")}><Input id="name" autoComplete="name" {...aria("name")} {...register("name")} /></FormField>
      <FormField id="phone" label="Mobile number" error={err("phone")} hint="Example: 0300 1234567"><Input id="phone" type="tel" autoComplete="tel" {...aria("phone")} {...register("phone")} /></FormField>
      <FormField id="email" label="Email" error={err("email")} className="sm:col-span-2"><Input id="email" type="email" autoComplete="email" {...aria("email")} {...register("email")} /></FormField>
      <FormField id="date" label="Date" error={err("date")}><Input id="date" type="date" {...aria("date")} {...register("date")} /></FormField>
      <FormField id="time" label="Time" error={err("time")}>
        <select id="time" className={selectClass} {...aria("time")} {...register("time")}>
          <option value="">Choose a time</option>
          {times.map((t) => (<option key={t} value={t}>{t}</option>))}
        </select>
      </FormField>
      <FormField id="guests" label="Guests" error={err("guests")}><Input id="guests" type="number" min={1} max={40} inputMode="numeric" {...aria("guests")} {...register("guests")} /></FormField>
      <FormField id="occasion" label="Occasion" error={err("occasion")}>
        <select id="occasion" className={selectClass} {...register("occasion")}>{occasions.map((o) => (<option key={o} value={o}>{o}</option>))}</select>
      </FormField>
      <FormField id="notes" label="Notes" error={err("notes")} hint="Allergies, seating, celebrations" className="sm:col-span-2"><Textarea id="notes" {...aria("notes")} {...register("notes")} /></FormField>
      <div className="sm:col-span-2"><Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">{isSubmitting ? "Preparing request" : "Request this table"}</Button></div>
    </form>
  );
}
