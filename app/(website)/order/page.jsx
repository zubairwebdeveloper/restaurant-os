import { PageHero } from "@/components/shared/page-hero";
import { Container } from "@/components/shared/container";
import { OrderBoard } from "@/features/orders/order-board";
import { getMenuItems } from "@/services/menu";

export const metadata = { title: "Order Online", description: "Build your Green Lagoon order for takeaway or dine in." };

export default async function OrderPage() {
  const items = await getMenuItems();
  return (
    <>
      <PageHero title="Order online" description="Build your basket now. Online checkout opens soon." />
      <section className="py-16 sm:py-20"><Container><OrderBoard items={items} /></Container></section>
    </>
  );
}
