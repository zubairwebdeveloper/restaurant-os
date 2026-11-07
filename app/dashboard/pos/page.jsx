import PosTerminal from "@/features/pos/components/PosTerminal";
import { loadPos } from "@/lib/pos/data";

export const metadata = { title: "POS" };

export default async function PosPage() {
  const data = await loadPos();
  return (
    <div>
      <h1 className="text-2xl font-semibold">Point of sale</h1>
      <p className="mt-1 text-sm text-muted-foreground">Tap items to build an order. Prices and totals are confirmed by the server.</p>
      <div className="mt-6">
        <PosTerminal {...data} />
      </div>
    </div>
  );
}
