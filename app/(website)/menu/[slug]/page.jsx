import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Flame } from "lucide-react";
import { Container } from "@/components/shared/container";
import { ImageSlot } from "@/components/shared/image-slot";
import { Badge } from "@/components/ui/badge";
import { MenuCard } from "@/features/menu/menu-card";
import { AddToOrderButton } from "@/features/menu/add-to-order-button";
import { formatPrice } from "@/lib/utils/format";
import { getMenuItemBySlug, getMenuItems, getRelatedItems } from "@/services/menu";

export async function generateStaticParams() {
  const items = await getMenuItems();
  return items.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const item = await getMenuItemBySlug(slug);
  return item ? { title: item.name, description: item.description } : { title: "Dish not found" };
}

export default async function MenuItemPage({ params }) {
  const { slug } = await params;
  const item = await getMenuItemBySlug(slug);
  if (!item) notFound();
  const related = await getRelatedItems(item);

  return (
    <>
      <section className="pb-20 pt-32 sm:pt-40">
        <Container className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <ImageSlot src={item.image} alt={item.name} caption={item.name} priority sizes="(min-width:1024px) 50vw, 100vw" className="aspect-[4/5] rounded-md" />
          <div className="flex flex-col justify-center">
            <Link href="/menu" className="text-sm text-gold underline-offset-4 hover:underline">Back to the menu</Link>
            <h1 className="mt-4 text-5xl sm:text-6xl">{item.name}</h1>
            <p className="mt-5 font-heading text-4xl text-gold">{formatPrice(item.price)}</p>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ivory/75">{item.description}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Badge variant="outline"><Clock className="mr-1.5 size-3.5" />{item.time}</Badge>
              {item.spice > 0 ? <Badge variant="outline"><Flame className="mr-1.5 size-3.5" />Spice level {item.spice} of 3</Badge> : null}
              <Badge variant={item.available ? "olive" : "outline"}>{item.available ? "Available today" : "Sold out"}</Badge>
            </div>

            <h2 className="mt-10 text-2xl">What is in it</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {item.ingredients.map((ing) => (<li key={ing} className="rounded-full border border-ivory/15 px-3 py-1 text-sm text-ivory/75">{ing}</li>))}
            </ul>

            <div className="mt-10 flex flex-wrap gap-3">
              <AddToOrderButton item={item} size="lg" />
              <Link href="/order" className="inline-flex h-13 items-center px-4 text-sm text-gold underline-offset-4 hover:underline">View basket</Link>
            </div>
          </div>
        </Container>
      </section>

      {related.length > 0 ? (
        <section className="border-t border-ivory/10 bg-[#101712] py-20">
          <Container>
            <h2 className="text-4xl">You may also like</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r, i) => (<MenuCard key={r.id} item={r} tone={i + 1} />))}
            </div>
          </Container>
        </section>
      ) : null}
    </>
  );
}
