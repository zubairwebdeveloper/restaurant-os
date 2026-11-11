import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { ImageSlot } from "@/components/shared/image-slot";
import { Reveal } from "@/components/animations/reveal";
import { getChefs } from "@/services/chefs";

export const metadata = { title: "Our Chefs", description: "Meet the kitchen team behind Green Lagoon." };

export default async function ChefsPage() {
  const chefs = await getChefs();
  return (
    <>
      <PageHero title="The people at the fire" description="A small team that cooks with coal, clay and patience." />
      <section className="py-16 sm:py-24">
        <Container className="space-y-20 sm:space-y-28">
          {chefs.map((chef, i) => (
            <Reveal key={chef.id} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
              <ImageSlot src={chef.image} alt={chef.name} caption={chef.name} tone={i} sizes="(min-width:1024px) 45vw, 100vw" className={`aspect-[4/5] rounded-md ${i % 2 ? "lg:order-2" : ""}`} />
              <div>
                <h2 className="text-4xl sm:text-5xl">{chef.name}</h2>
                <p className="mt-3 font-heading text-2xl italic text-gold">{chef.role}</p>
                <p className="mt-6 max-w-md text-lg leading-relaxed text-ivory/70">{chef.bio}</p>
              </div>
            </Reveal>
          ))}
        </Container>
      </section>
    </>
  );
}
