import Link from "next/link";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/animations/reveal";
import { ImageSlot } from "@/components/shared/image-slot";
import { Button } from "@/components/ui/button";
import { getGalleryImages } from "@/services/gallery";

const heights = [
  "aspect-[3/4]",
  "aspect-square",
  "aspect-[4/5]",
  "aspect-[3/4]",
];

export async function GalleryStrip() {
  const images = (await getGalleryImages()).slice(0, 4);
  return (
    <section className="py-24 sm:py-32">
      <Container>
        <Reveal className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading title="Moments at the lagoon" />
          <Button variant="outline">
            <Link href="/gallery">Open the gallery</Link>
          </Button>
        </Reveal>
        <div className="mt-12 grid grid-cols-2 items-start gap-4 lg:grid-cols-4">
          {images.map((img, i) => (
            <Reveal
              key={img.id}
              delay={i * 0.07}
              className={i % 2 ? "mt-10" : ""}
            >
              <Link
                href="/gallery"
                className="group block overflow-hidden rounded-md"
              >
                <ImageSlot
                  src={img.src}
                  alt={img.alt}
                  caption={img.alt}
                  tone={i}
                  sizes="(min-width:1024px) 22vw, 45vw"
                  className={`${heights[i]} transition-transform duration-700 group-hover:scale-105`}
                />
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
