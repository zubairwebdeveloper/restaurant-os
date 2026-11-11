import Link from "next/link";
import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { ImageSlot } from "@/components/shared/image-slot";
import { Reveal } from "@/components/animations/reveal";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "About",
  description: "The story of Green Lagoon Hotel on the edge of Chashma Lake.",
};

const values = [
  {
    title: "Fire first",
    text: "Most dishes begin over coal or in clay. It is slower, and it tastes better.",
  },
  {
    title: "Local where we can",
    text: "River fish, regional lamb and vegetables from nearby farms shape the menu through the year.",
  },
  {
    title: "Unhurried hospitality",
    text: "We would rather you stay for a second cup of kahwa than rush you to the next table.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        title="A place to slow down beside the water"
        description="Green Lagoon Hotel sits on the edge of Chashma Lake in Mianwali, a restaurant and guest house built around the view."
      />
      <section className="py-16 sm:py-24">
        <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <Reveal>
            <h2 className="text-4xl sm:text-5xl">Our story</h2>
            <p className="mt-6 text-lg leading-relaxed text-ivory/70">
              We wanted a place where the food matched the setting: honest,
              generous and cooked with care. What started as a small lakeside
              kitchen has grown into a full restaurant and a hotel with quiet
              rooms above the water.
            </p>
            <p className="mt-4 leading-relaxed text-ivory/60">
              Today a small team of cooks, hosts and housekeepers looks after
              every guest as if they were visiting family.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <ImageSlot
              src="/images/about/terrace.jpg"
              alt="The terrace at Green Lagoon"
              caption="The terrace"
              tone={1}
              sizes="(min-width:1024px) 45vw, 100vw"
              className="aspect-[4/3] rounded-md"
            />
          </Reveal>
        </Container>
      </section>
      <section className="bg-[#101712] py-16 sm:py-24">
        <Container>
          <h2 className="text-4xl sm:text-5xl">What we care about</h2>
          <ul className="mt-12 grid gap-10 md:grid-cols-3">
            {values.map((v, i) => (
              <Reveal
                as="li"
                key={v.title}
                delay={i * 0.08}
                className="border-t border-gold/40 pt-6"
              >
                <h3 className="text-3xl">{v.title}</h3>
                <p className="mt-3 leading-relaxed text-ivory/65">{v.text}</p>
              </Reveal>
            ))}
          </ul>
          <div className="mt-14 flex flex-wrap gap-3">
            <Button size="lg">
              <Link href="/reservation">Reserve a table</Link>
            </Button>
            <Button size="lg" variant="outline">
              <Link href="/rooms">See the rooms</Link>
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
