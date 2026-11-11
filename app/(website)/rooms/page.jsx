import Link from "next/link";
import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/animations/reveal";
import { Button } from "@/components/ui/button";
import { RoomCard } from "@/features/hotel/room-card";
import { getRooms } from "@/services/hotel";

export const metadata = {
  title: "Rooms",
  description:
    "Lakeside rooms, suites and villas at Green Lagoon Hotel, Chashma.",
};

export default async function RoomsPage() {
  const rooms = await getRooms();
  return (
    <>
      <PageHero
        title="Rooms and suites"
        description="Quiet rooms facing the lagoon. Breakfast is included in every stay."
      />
      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-6 lg:grid-cols-3">
            {rooms.map((room, i) => (
              <Reveal key={room.id} delay={i * 0.08}>
                <RoomCard room={room} tone={i} />
              </Reveal>
            ))}
          </div>
          <div className="mt-20 rounded-md border border-gold/30 bg-charcoal/50 p-8 text-center sm:p-12">
            <h2 className="text-3xl sm:text-4xl">Planning a stay?</h2>
            <p className="mx-auto mt-3 max-w-md text-ivory/70">
              Send us your dates and we will confirm availability. Online room
              booking opens soon.
            </p>
            <Button size="lg" className="mt-7">
              <Link href="/contact">Send an inquiry</Link>
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
