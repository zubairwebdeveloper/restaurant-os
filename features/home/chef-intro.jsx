import Link from "next/link";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/animations/reveal";
import { ImageSlot } from "@/components/shared/image-slot";
import { Button } from "@/components/ui/button";
import { getChefs } from "@/services/chefs";

export async function ChefIntro() {
  const [chef] = await getChefs();
  return (
    <section className="bg-[#101712] py-24 sm:py-32">
      <Container className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-24">
        <Reveal className="order-2 lg:order-1">
          <p className="font-heading text-3xl leading-snug text-ivory sm:text-4xl lg:text-5xl">
            &ldquo;Good food starts with patience. The coal tells you when it is
            ready.&rdquo;
          </p>
          <p className="mt-8 text-lg text-sand">
            {chef.name}, {chef.role}
          </p>
          <p className="mt-4 max-w-lg leading-relaxed text-ivory/65">
            {chef.bio}
          </p>
          <Button variant="outline" size="lg" className="mt-9">
            <Link href="/chefs">Meet the kitchen team</Link>
          </Button>
        </Reveal>
        <Reveal delay={0.1} className="order-1 lg:order-2">
          <ImageSlot
            src={chef.image}
            alt={chef.name}
            caption={chef.name}
            tone={2}
            sizes="(min-width:1024px) 40vw, 100vw"
            className="aspect-[4/5] rounded-md"
          />
        </Reveal>
      </Container>
    </section>
  );
}
