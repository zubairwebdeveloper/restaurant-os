import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/animations/reveal";
import { Parallax } from "@/components/animations/parallax";
import { ImageSlot } from "@/components/shared/image-slot";
import { getExperiences } from "@/services/content";

export async function Experience() {
  const experiences = await getExperiences();
  return (
    <section className="bg-olive/15 py-24 sm:py-32">
      <Container>
        <div className="grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <Reveal>
              <SectionHeading title="More than a table with a view" description="Evenings at Green Lagoon move slowly: fire, water and a long meal." />
            </Reveal>
            <Reveal delay={0.1} className="mt-10 hidden lg:block">
              <Parallax className="aspect-[16/10] rounded-md" distance={24}>
                <ImageSlot src="/images/hero/lagoon.jpg" alt="Green Lagoon at sunset" caption="The lagoon at sunset" tone={1} sizes="45vw" className="size-full" />
              </Parallax>
            </Reveal>
          </div>
          <ul className="divide-y divide-ivory/15 border-y border-ivory/15">
            {experiences.map((e, i) => (
              <Reveal as="li" key={e.title} delay={i * 0.08} className="py-10">
                <h3 className="text-3xl sm:text-4xl">{e.title}</h3>
                <p className="mt-4 max-w-md leading-relaxed text-ivory/70">{e.text}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
