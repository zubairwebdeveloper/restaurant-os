import MenuManager from "@/features/menu/components/MenuManager";
import { loadMenu } from "@/lib/menu/data";

export const metadata = { title: "Menu" };

export default async function MenuPage() {
  const { categories, products, currency, meta } = await loadMenu();
  return (
    <div>
      <h1 className="text-2xl font-semibold">Menu</h1>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">
        Build categories and products. Changes stay private until you publish the menu to your website.
      </p>
      <div className="mt-8">
        <MenuManager categories={categories} products={products} currency={currency} meta={meta} />
      </div>
    </div>
  );
}
