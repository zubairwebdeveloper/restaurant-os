import { siteConfig } from "@/config/site";
import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { ReservationForm } from "@/features/reservations/reservation-form";

export const metadata = { title: "Reserve a Table", description: "Reserve a table at Green Lagoon Hotel, Chashma." };

export default function ReservationPage() {
  return (
    <>
      <PageHero title="Reserve a table" description="Tell us when you are coming. We hold tables for 20 minutes past your booking time." />
      <section className="py-16 sm:py-20">
        <Container className="grid gap-14 lg:grid-cols-[1.4fr_1fr] lg:gap-24">
          <ReservationForm />
          <aside className="space-y-8 text-ivory/75">
            <div>
              <h2 className="text-3xl text-ivory">Opening hours</h2>
              <ul className="mt-4 space-y-3">{siteConfig.hours.map((h) => (<li key={h.days}><span className="block text-ivory">{h.days}</span>{h.time}</li>))}</ul>
            </div>
            <div>
              <h2 className="text-3xl text-ivory">Large groups</h2>
              <p className="mt-3">For more than 10 guests or a private supper, call {siteConfig.contact.phone} a few days ahead.</p>
            </div>
          </aside>
        </Container>
      </section>
    </>
  );
}
