import { MapPin, Phone, Mail } from "lucide-react";
import { siteConfig } from "@/config/site";
import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { ContactForm } from "@/features/contact/contact-form";

export const metadata = { title: "Contact", description: "Contact Green Lagoon Hotel in Chashma, Mianwali." };

export default function ContactPage() {
  const { contact, hours } = siteConfig;
  return (
    <>
      <PageHero title="Get in touch" description="Questions about a booking, an event or a room? Write to us or call." />
      <section className="py-16 sm:py-20">
        <Container className="grid gap-14 lg:grid-cols-[1.4fr_1fr] lg:gap-24">
          <ContactForm />
          <div className="space-y-8 text-ivory/75">
            <ul className="space-y-5">
              <li className="flex gap-4"><MapPin className="mt-1 size-5 shrink-0 text-gold" />{contact.address}</li>
              <li className="flex gap-4"><Phone className="mt-1 size-5 shrink-0 text-gold" />{contact.phone}</li>
              <li className="flex gap-4"><Mail className="mt-1 size-5 shrink-0 text-gold" />{contact.email}</li>
            </ul>
            <div>
              <h2 className="text-3xl text-ivory">Hours</h2>
              <ul className="mt-3 space-y-2">{hours.map((h) => (<li key={h.days}><span className="text-ivory">{h.days}:</span> {h.time}</li>))}</ul>
            </div>
            <a href={contact.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-gold underline-offset-4 hover:underline">Get directions</a>
          </div>
        </Container>
      </section>
    </>
  );
}
