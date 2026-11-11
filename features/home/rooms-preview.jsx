import Link from "next/link";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/animations/reveal";
import { Button } from "@/components/ui/button";
import { RoomCard } from "@/features/hotel/room-card";
import { getRooms } from "@/services/hotel";

export async function RoomsPreview() {
  const rooms = await getRooms();
  return (
    <section className="py-24 sm:py-32">
      <Container>
        <Reveal className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            title="Stay by the water"
            description="Three ways to spend the night at the lagoon, breakfast included."
          />
          <Button variant="outline">
            <Link href="/rooms">All rooms</Link>
          </Button>
        </Reveal>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {rooms.map((room, i) => (
            <Reveal key={room.id} delay={i * 0.08}>
              <RoomCard room={room} tone={i} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
