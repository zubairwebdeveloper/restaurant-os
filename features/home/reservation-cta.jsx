import Link from "next/link";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/animations/reveal";
import { Button } from "@/components/ui/button";

export function ReservationCta() {
  return (
    <section className="py-24 sm:py-32">
      <Container>
        <Reveal className="relative overflow-hidden rounded-md border border-gold/40 bg-charcoal px-6 py-20 text-center sm:px-16">
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 size-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/15"
          />
          <div
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 size-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/20"
          />
          <div className="relative">
            <h2 className="mx-auto max-w-3xl text-4xl sm:text-5xl lg:text-6xl">
              Your table by the water is waiting
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-lg text-ivory/70">
              Tell us when you are coming and how many you are. We will keep the
              best table free.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Button size="lg">
                <Link href="/reservation">Book a table</Link>
              </Button>
              <Button size="lg" variant="outline">
                <Link href="/rooms">See the rooms</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
