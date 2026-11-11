import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { MenuBrowser } from "@/features/menu/menu-browser";
import { getCategories, getMenuItems } from "@/services/menu";

export const metadata = { title: "Menu", description: "Charcoal grills, clay-pot mains, desserts and drinks at Green Lagoon." };

export default async function MenuPage() {
  const [categories, items] = await Promise.all([getCategories(), getMenuItems()]);
  return (
    <>
      <PageHero title="The Green Lagoon menu" description="Cooked over charcoal and in clay. Prices in Pakistani rupees. All meat is halal." />
      <section className="py-16 sm:py-20"><Container><MenuBrowser categories={categories} items={items} /></Container></section>
    </>
  );
}
