"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import FormField from "@/components/shared/FormField";
import StatusBadge from "@/components/shared/StatusBadge";
import { websiteSchema } from "@/schemas/website.schema";
import { saveWebsiteAction, setPublishedAction } from "@/app/dashboard/website/actions";
import SitePreview from "./SitePreview";

function Section({ title, children }) {
  return (
    <fieldset className="space-y-4 rounded-lg border border-border bg-surface p-4">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

export default function WebsiteEditor({ tenantName, branding, initialWebsite, published: initialPublished }) {
  const router = useRouter();
  const [published, setPublished] = useState(initialPublished);
  const [formError, setFormError] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const {
    register, handleSubmit, control, reset, formState: { errors, isSubmitting, isDirty },
  } = useForm({ resolver: zodResolver(websiteSchema), defaultValues: initialWebsite });
  const values = useWatch({ control });
  const savedSlug = initialWebsite.slug;

  async function onSubmit(data) {
    setFormError(null);
    const result = await saveWebsiteAction(data);
    if (result.ok) {
      toast.success(result.published ? "Saved. Changes are live." : "Saved.");
      reset(result.website);
      router.refresh();
    } else {
      setFormError(result.error);
    }
  }

  async function togglePublished() {
    setPublishing(true);
    setFormError(null);
    const result = await setPublishedAction({ published: !published });
    setPublishing(false);
    if (result.ok) {
      setPublished(result.published);
      toast.success(result.published ? "Your website is live." : "Your website is no longer public.");
      router.refresh();
    } else {
      setFormError(result.error);
    }
  }

  const err = (path) => path.split(".").reduce((o, k) => o?.[k], errors)?.message;

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,32rem)_minmax(0,1fr)]">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={published ? "ACTIVE" : "PENDING"} label={published ? "Published" : "Draft"} />
          {published && savedSlug ? (
            <a href={`/r/${savedSlug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm underline underline-offset-4">
              View live site <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </div>
        {formError ? <Alert tone="error">{formError}</Alert> : null}

        <Section title="Web address">
          <FormField id="slug" label="Address" error={err("slug")} hint={`Your site appears at /r/${values.slug || "your-name"}. Needed before publishing.`}>
            {(a) => <Input {...a} className="font-mono" autoCapitalize="none" {...register("slug")} />}
          </FormField>
        </Section>

        <Section title="Hero">
          <FormField id="hero.headline" label="Headline" error={err("hero.headline")}>{(a) => <Input {...a} maxLength={90} {...register("hero.headline")} />}</FormField>
          <FormField id="hero.subheadline" label="Subheadline" error={err("hero.subheadline")}>{(a) => <Input {...a} maxLength={240} {...register("hero.subheadline")} />}</FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="hero.ctaLabel" label="Button label" error={err("hero.ctaLabel")}>{(a) => <Input {...a} maxLength={30} {...register("hero.ctaLabel")} />}</FormField>
            <FormField id="hero.ctaUrl" label="Button link" error={err("hero.ctaUrl")} hint="https:// only">{(a) => <Input {...a} type="url" {...register("hero.ctaUrl")} />}</FormField>
          </div>
        </Section>

        <Section title="About">
          <FormField id="about.title" label="Title" error={err("about.title")}>{(a) => <Input {...a} maxLength={80} {...register("about.title")} />}</FormField>
          <FormField id="about.body" label="Story" error={err("about.body")}>{(a) => <Textarea {...a} rows={5} maxLength={2000} {...register("about.body")} />}</FormField>
        </Section>

        <Section title="Contact">
          <FormField id="contact.address" label="Address" error={err("contact.address")}>{(a) => <Input {...a} {...register("contact.address")} />}</FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="contact.phone" label="Phone" error={err("contact.phone")}>{(a) => <Input {...a} type="tel" {...register("contact.phone")} />}</FormField>
            <FormField id="contact.email" label="Email" error={err("contact.email")}>{(a) => <Input {...a} type="email" {...register("contact.email")} />}</FormField>
          </div>
          <FormField id="contact.mapUrl" label="Map link" error={err("contact.mapUrl")} hint="https:// only">{(a) => <Input {...a} type="url" {...register("contact.mapUrl")} />}</FormField>
        </Section>

        <Section title="Opening hours">
          <div className="space-y-2">
            {initialWebsite.hours.map((h, i) => (
              <div key={h.day} className="grid grid-cols-[6rem_1fr_1fr] items-center gap-2 sm:grid-cols-[7rem_auto_1fr_1fr]">
                <span className="text-sm font-medium">{h.day}</span>
                <label className="col-span-2 flex items-center gap-2 text-sm sm:col-span-1">
                  <input type="checkbox" {...register(`hours.${i}.closed`)} className="size-4" />
                  Closed
                </label>
                <Input type="time" aria-label={`${h.day} opens`} aria-invalid={err(`hours.${i}.open`) ? true : undefined} {...register(`hours.${i}.open`)} />
                <Input type="time" aria-label={`${h.day} closes`} aria-invalid={err(`hours.${i}.close`) ? true : undefined} {...register(`hours.${i}.close`)} />
              </div>
            ))}
          </div>
          {err("hours") ? <p role="alert" className="text-xs font-medium text-destructive">{err("hours")}</p> : null}
        </Section>

        <Section title="Social links">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="social.instagram" label="Instagram" error={err("social.instagram")} hint="https:// link">{(a) => <Input {...a} type="url" {...register("social.instagram")} />}</FormField>
            <FormField id="social.facebook" label="Facebook" error={err("social.facebook")} hint="https:// link">{(a) => <Input {...a} type="url" {...register("social.facebook")} />}</FormField>
            <FormField id="social.tiktok" label="TikTok" error={err("social.tiktok")} hint="https:// link">{(a) => <Input {...a} type="url" {...register("social.tiktok")} />}</FormField>
            <FormField id="social.website" label="Other website" error={err("social.website")} hint="https:// link">{(a) => <Input {...a} type="url" {...register("social.website")} />}</FormField>
          </div>
          <FormField id="social.whatsapp" label="WhatsApp number" error={err("social.whatsapp")}>{(a) => <Input {...a} type="tel" {...register("social.whatsapp")} />}</FormField>
        </Section>

        <Section title="Search appearance (SEO)">
          <FormField id="seo.title" label="Page title" error={err("seo.title")} hint="Up to 70 characters. Defaults to your restaurant name.">{(a) => <Input {...a} maxLength={70} {...register("seo.title")} />}</FormField>
          <FormField id="seo.description" label="Description" error={err("seo.description")} hint="Up to 160 characters.">{(a) => <Textarea {...a} rows={2} maxLength={160} {...register("seo.description")} />}</FormField>
        </Section>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {isSubmitting ? "Saving…" : "Save changes"}
          </Button>
          <Button type="button" size="lg" variant={published ? "outline" : "secondary"} onClick={togglePublished} disabled={publishing || isDirty || isSubmitting}>
            {publishing ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {published ? "Unpublish site" : "Publish site"}
          </Button>
        </div>
        {isDirty ? <p className="text-xs text-muted-foreground">Save your changes before publishing or unpublishing.</p> : null}
      </form>

      <SitePreview site={{ name: tenantName, branding, website: { ...initialWebsite, ...values } }} />
    </div>
  );
}
