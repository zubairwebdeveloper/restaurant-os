import Link from "next/link";
import { Container } from "@/components/shared/container";
import { Reveal } from "@/components/animations/reveal";
import { Parallax } from "@/components/animations/parallax";
import { ImageSlot } from "@/components/shared/image-slot";
import { Button } from "@/components/ui/button";

export function Intro() {
  return (
    <section id="intro" className="scroll-mt-20 py-24 sm:py-32">
      <Container className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-24">
        <Reveal>
          <Parallax className="aspect-[4/5] rounded-md" distance={30}>
            <ImageSlot
              src="/images/about/story.jpg"
              alt="The Green Lagoon terrace"
              caption="The terrace at Green Lagoon"
              tone={0}
              sizes="(min-width:1024px) 40vw, 100vw"
              className="size-full"
            />
          </Parallax>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl">
            A lakeside kitchen built on fire and patience
          </h2>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-ivory/70">
            Green Lagoon began as a place to eat well beside the water. Our
            cooks work with charcoal, clay pots and iron woks, and build each
            dish from river fish, local lamb and what the season gives.
          </p>
          <p className="mt-4 max-w-xl leading-relaxed text-ivory/60">
            Upstairs, quiet rooms look over the lagoon, so a long dinner can end
            with a short walk to bed.
          </p>
          <Button variant="outline" size="lg" className="mt-9">
            <Link href="/about">Our story</Link>
          </Button>
        </Reveal>
      </Container>
    </section>
  );
}
