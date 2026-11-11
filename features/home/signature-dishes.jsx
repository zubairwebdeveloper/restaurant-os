import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/animations/reveal";
import { MenuCard } from "@/features/menu/menu-card";
import { getMenuItems } from "@/services/menu";

export async function SignatureDishes() {
  const items = await getMenuItems({ featured: true });
  return (
    <section className="bg-[#101712] py-24 sm:py-32">
      <Container>
        <Reveal>
          <SectionHeading title="Dishes our guests come back for" description="Four plates from the grill and the wok that define the kitchen." />
        </Reveal>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.slice(0, 4).map((item, i) => (
            <Reveal key={item.id} delay={i * 0.08} className={i % 2 === 1 ? "lg:mt-12" : ""}>
              <MenuCard item={item} tone={i} imageClass="aspect-[3/4]" className="h-full" />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
