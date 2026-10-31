"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import LoadingState from "@/components/shared/LoadingState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";

const SWATCHES = [
  ["Background", "bg-background"], ["Surface", "bg-surface"], ["Muted", "bg-muted"],
  ["Primary", "bg-primary"], ["Accent", "bg-accent"], ["Success", "bg-success"],
  ["Warning", "bg-warning"], ["Destructive", "bg-destructive"], ["Info", "bg-info"],
];

function Section({ title, children }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemDemo() {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Design system</h1>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">
        Tokens and shared components used across the platform. Switch the theme in the header to check both modes.
      </p>

      <Section title="Colour tokens">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SWATCHES.map(([name, cls]) => (
            <li key={name} className="rounded-lg border border-border bg-surface p-3">
              <div className={`h-12 rounded-md border border-border ${cls}`} />
              <p className="mt-2 text-sm font-medium">{name}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button><Plus />Add item</Button>
          <Button variant="secondary">Save draft</Button>
          <Button variant="outline">Cancel</Button>
          <Button variant="ghost">Skip</Button>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)}>Suspend restaurant</Button>
          <Button size="lg" onClick={() => toast.success("Changes saved")}>Save changes</Button>
          <Button disabled>Unavailable</Button>
        </div>
      </Section>

      <Section title="Status badges">
        <div className="flex flex-wrap gap-2">
          {["ACTIVE", "PENDING", "SUSPENDED", "REJECTED", "CANCELLED"].map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
      </Section>

      <Section title="Typography and numbers">
        <div className="rounded-lg border border-border bg-surface p-5">
          <p className="font-display text-3xl font-semibold">Page heading</p>
          <p className="mt-2 max-w-prose text-sm text-muted-foreground">
            Body copy stays under 80 characters per line for readability.
          </p>
          <p className="tabular mt-4 text-2xl font-semibold">1,234.50</p>
          <p className="tabular text-2xl font-semibold">9,876.00</p>
          <p className="mt-1 text-xs text-muted-foreground">Tabular numerals keep money columns aligned.</p>
        </div>
      </Section>

      <Section title="Loading and empty states">
        <div className="grid gap-4 lg:grid-cols-2">
          <LoadingState rows={3} label="Loading orders" />
          <EmptyState
            icon={UtensilsCrossed}
            title="No menu items yet"
            description="Add your first category to start building the menu."
            action={<Button size="sm"><Plus />Add category</Button>}
          />
        </div>
      </Section>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        destructive
        title="Suspend this restaurant?"
        description="Staff will lose access until the restaurant is reactivated."
        confirmLabel="Suspend restaurant"
        onConfirm={() => toast("Restaurant suspended (demo only)")}
      />
    </div>
  );
}
