"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { priceOrder } from "@/lib/pos/pricing";
import { formatMoney } from "@/lib/utils/money";
import { POS_LIMITS } from "@/config/pos";

/** Chooses size and options for one product. Render with key={product.id} so state resets per product. */
export default function ItemDialog({ product, currency, onAdd, onClose }) {
  const variants = product.variants ?? [];
  const groups = product.modifierGroups ?? [];
  const [variantId, setVariantId] = useState(variants.length === 1 ? variants[0].id : "");
  const [chosen, setChosen] = useState({}); // groupId -> optionIds[]
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  const selections = Object.entries(chosen).filter(([, ids]) => ids.length > 0).map(([groupId, optionIds]) => ({ groupId, optionIds }));
  const line = { productId: product.id, ...(variantId ? { variantId } : {}), selections, quantity, note };

  // The same pricing function the server uses: it also tells us what is still missing.
  let priced = null;
  let problem = null;
  try {
    priced = priceOrder({ lines: [line], products: new Map([[product.id, product]]), settings: {}, discount: null }).lines[0];
  } catch (error) {
    problem = error.code;
  }

  function toggle(group, optionId) {
    setChosen((current) => {
      const ids = current[group.id] ?? [];
      if (group.max === 1) return { ...current, [group.id]: ids[0] === optionId ? [] : [optionId] };
      if (ids.includes(optionId)) return { ...current, [group.id]: ids.filter((id) => id !== optionId) };
      if (ids.length >= group.max) return current;
      return { ...current, [group.id]: [...ids, optionId] };
    });
  }

  const hint = { VARIANT_REQUIRED: "Choose a size to continue.", MODIFIER_REQUIRED: "Choose the required options to continue." }[problem] ?? null;

  function add() {
    onAdd({
      productId: product.id, name: product.name, variantId: priced.variantId, variantName: priced.variantName,
      selections, labels: priced.modifiers.flatMap((m) => m.options.map((o) => o.name)),
      quantity, note, unitPriceMinor: priced.unitPriceMinor,
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title={product.name} description={product.description || undefined}>
        {variants.length > 0 ? (
          <fieldset className="mb-4">
            <legend className="text-sm font-medium">Size <span className="text-muted-foreground">(required)</span></legend>
            <div className="mt-2 grid gap-2">
              {variants.map((v) => (
                <label key={v.id} className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-md border border-border px-3 has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary">
                  <span className="flex items-center gap-2"><input type="radio" name="variant" className="size-4" checked={variantId === v.id} onChange={() => setVariantId(v.id)} />{v.name}</span>
                  <span className="tabular text-sm">{formatMoney(v.priceMinor, currency)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {groups.map((group) => (
          <fieldset key={group.id} className="mb-4">
            <legend className="text-sm font-medium">
              {group.name}{" "}
              <span className="text-muted-foreground">({group.min >= 1 ? "required, " : ""}{group.max === 1 ? "choose 1" : `up to ${group.max}`})</span>
            </legend>
            <div className="mt-2 grid gap-2">
              {group.options.map((o) => {
                const checked = (chosen[group.id] ?? []).includes(o.id);
                return (
                  <label key={o.id} className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-md border border-border px-3 has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary">
                    <span className="flex items-center gap-2">
                      <input type={group.max === 1 ? "radio" : "checkbox"} name={`g-${group.id}`} className="size-4" checked={checked} onChange={() => toggle(group, o.id)} />
                      {o.name}
                    </span>
                    <span className="tabular text-sm text-muted-foreground">{o.priceMinor > 0 ? `+${formatMoney(o.priceMinor, currency)}` : "Free"}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}

        <div className="mb-4">
          <label htmlFor="item-note" className="text-sm font-medium">Note for the kitchen (optional)</label>
          <Input id="item-note" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2" role="group" aria-label="Quantity">
            <Button type="button" variant="outline" size="icon" aria-label="Decrease quantity" onClick={() => setQuantity((q) => Math.max(1, q - 1))}><Minus aria-hidden="true" /></Button>
            <span className="tabular w-8 text-center text-lg font-semibold" aria-live="polite">{quantity}</span>
            <Button type="button" variant="outline" size="icon" aria-label="Increase quantity" onClick={() => setQuantity((q) => Math.min(POS_LIMITS.MAX_QUANTITY, q + 1))}><Plus aria-hidden="true" /></Button>
          </div>
          <Button type="button" size="lg" onClick={add} disabled={!priced}>
            Add {priced ? formatMoney(priced.lineTotalMinor, currency) : ""}
          </Button>
        </div>
        {hint ? <p role="status" className="mt-2 text-sm text-muted-foreground">{hint}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
