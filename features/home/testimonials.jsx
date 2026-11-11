"use client";

import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function Testimonials({ items }) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: "start" });
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => embla && setSelected(embla.selectedScrollSnap()), [embla]);

  useEffect(() => {
    if (!embla) return;
    embla.on("select", onSelect);
    return () => embla.off("select", onSelect);
  }, [embla, onSelect]);

  return (
    <section className="bg-olive/15 py-24 sm:py-32" aria-roledescription="carousel" aria-label="Guest reviews">
      <Container>
        <div className="flex items-end justify-between gap-6">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl">Kind words from our guests</h2>
          <div className="hidden gap-2 sm:flex">
            <Button variant="outline" size="icon" onClick={() => embla?.scrollPrev()} aria-label="Previous review"><ChevronLeft /></Button>
            <Button variant="outline" size="icon" onClick={() => embla?.scrollNext()} aria-label="Next review"><ChevronRight /></Button>
          </div>
        </div>

        <div ref={emblaRef} className="mt-14 overflow-hidden">
          <div className="flex">
            {items.map((t) => (
              <figure key={t.id} className="min-w-0 shrink-0 basis-full pr-6 md:basis-1/2 lg:basis-1/3">
                <div className="h-full rounded-md border border-gold/25 bg-forest/60 p-8">
                  <blockquote className="font-heading text-2xl leading-snug text-ivory">&ldquo;{t.text}&rdquo;</blockquote>
                  <figcaption className="mt-6 text-sm text-ivory/65">
                    <span className="text-sand">{t.name}</span>, {t.place}
                  </figcaption>
                </div>
              </figure>
            ))}
          </div>
        </div>

        <div className="mt-8 flex gap-2" role="tablist" aria-label="Choose review">
          {items.map((t, i) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={selected === i}
              aria-label={`Review ${i + 1}`}
              onClick={() => embla?.scrollTo(i)}
              className={cn("h-1.5 rounded-full transition-all", selected === i ? "w-8 bg-gold" : "w-3 bg-ivory/30")}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
