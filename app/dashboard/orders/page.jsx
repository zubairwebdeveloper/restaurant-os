import OrdersManager from "@/features/orders/components/OrdersManager";
import { loadOrders } from "@/lib/pos/data";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  const data = await loadOrders();
  return (
    <div>
      <h1 className="text-2xl font-semibold">Orders</h1>
      <p className="mt-1 text-sm text-muted-foreground">Order history, payments, refunds and receipts.</p>
      <div className="mt-8">
        <OrdersManager {...data} />
      </div>
    </div>
  );
}
