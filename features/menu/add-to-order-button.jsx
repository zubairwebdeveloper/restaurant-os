"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart-store";

export function AddToOrderButton({ item, size = "sm", className }) {
  const add = useCartStore((s) => s.add);
  return (
    <Button
      size={size}
      variant="outline"
      className={className}
      disabled={!item.available}
      onClick={() => {
        add(item);
        toast.success(`${item.name} added to your basket`);
      }}
    >
      <Plus /> {item.available ? "Add" : "Unavailable"}
    </Button>
  );
}
