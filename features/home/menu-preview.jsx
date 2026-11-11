import Link from "next/link";
import { Container } from "@/components/shared/container";
import { SectionHeading } from "@/components/shared/section-heading";
import { Reveal } from "@/components/animations/reveal";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils/format";
import { getCategories, getMenuItems } from "@/services/menu";

export async function MenuPreview() {
  const [categories, items] = await Promise.all([
    getCategories(),
    getMenuItems(),
  ]);
  const groups = categories
    .filter((c) => ["starters", "mains", "desserts", "drinks"].includes(c.id))
    .map((c) => ({
      ...c,
      items: items.filter((i) => i.category === c.id).slice(0, 3),
    }));

  return (
    <section className="py-24 sm:py-32">
      <Container>
        <Reveal className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            title="From the menu"
            description="A short look at what is served tonight."
          />
          <Button variant="outline">
            <Link href="/menu">See the full menu</Link>
          </Button>
        </Reveal>

        <div className="mt-14 grid gap-x-20 gap-y-14 md:grid-cols-2">
          {groups.map((group, g) => (
            <Reveal key={group.id} delay={g * 0.06}>
              <h3 className="border-b border-gold/40 pb-3 text-3xl text-gold">
                {group.name}
              </h3>
              <ul className="mt-2 divide-y divide-ivory/10">
                {group.items.map((item) => (
                  <li key={item.id} className="py-5">
                    <div className="flex items-baseline gap-3">
                      <Link
                        href={`/menu/${item.slug}`}
                        className="font-heading text-2xl text-ivory transition-colors hover:text-gold"
                      >
                        {item.name}
                      </Link>
                      <span
                        aria-hidden="true"
                        className="min-w-6 flex-1 translate-y-[-4px] border-b border-dotted border-ivory/25"
                      />
                      <span className="font-heading text-xl text-sand">
                        {formatPrice(item.price)}
                      </span>
                    </div>
                    <p className="mt-1.5 max-w-md text-sm text-ivory/60">
                      {item.description}
                    </p>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
