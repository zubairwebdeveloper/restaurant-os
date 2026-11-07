"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Pencil, Plus, Search, Star, Trash2, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { DIETARY_LABELS } from "@/config/menu";
import { filterProducts } from "@/lib/menu/form";
import { formatMoney } from "@/lib/utils/money";
import { cn } from "@/lib/utils/cn";
import {
  createCategoryAction, deleteCategoryAction, deleteProductAction, reorderCategoriesAction, reorderProductsAction,
  saveProductAction, setAvailabilityAction, setMenuPublishedAction, updateCategoryAction,
} from "@/app/dashboard/menu/actions";
import CategoryForm from "./CategoryForm";
import ProductForm from "./ProductForm";
import SortableList from "./SortableList";

function ProductSummary({ product, currency, categoryName, onToggle, onEdit, onDelete }) {
  const available = product.available !== false;
  const from = product.variants?.length > 0 ? "from " : "";
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-medium">
          <span className="truncate">{product.name}</span>
          {product.featured ? <Star className="size-4 shrink-0 text-warning" aria-label="Featured" /> : null}
          {product.visibility === "PRIVATE" ? <EyeOff className="size-4 shrink-0 text-muted-foreground" aria-label="Private, staff only" /> : null}
        </p>
        <p className="tabular text-sm text-muted-foreground">
          {from}{formatMoney(product.priceMinor, currency)}
          {categoryName ? ` · ${categoryName}` : ""}
          {product.dietary?.length ? ` · ${product.dietary.map((d) => DIETARY_LABELS[d] ?? d).join(", ")}` : ""}
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={available} onCheckedChange={onToggle} label={`${product.name} available`} />
        <span className={cn("w-16", !available && "font-medium")}>{available ? "Available" : "Sold out"}</span>
      </label>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label={`Edit ${product.name}`}><Pencil aria-hidden="true" /></Button>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label={`Delete ${product.name}`}><Trash2 aria-hidden="true" /></Button>
      </div>
    </div>
  );
}

export default function MenuManager({ categories, products, currency, meta }) {
  const router = useRouter();
  const [selected, setSelected] = useState("all");
  const [editing, setEditing] = useState(null); // { kind: "category" | "product", item? }
  const [confirm, setConfirm] = useState(null); // { kind, item }
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState("ALL");
  const [dietary, setDietary] = useState("ALL");
  const [publishing, setPublishing] = useState(false);

  const activeId = categories.some((c) => c.id === selected) ? selected : "all";
  const activeCategory = categories.find((c) => c.id === activeId) ?? null;
  const nameOf = (id) => categories.find((c) => c.id === id)?.name;
  const counts = Object.fromEntries(categories.map((c) => [c.id, products.filter((p) => p.categoryId === c.id).length]));

  const filtersActive = search.trim() !== "" || availability !== "ALL" || dietary !== "ALL";
  const visible = filterProducts(products, { categoryId: activeId, search, availability, dietary });
  const canReorder = activeCategory && !filtersActive;

  /** Runs an action, shows the outcome, refreshes server data. Returns the error message or null. */
  async function act(promise, success) {
    const result = await promise;
    if (!result.ok) {
      toast.error(result.error);
      return result.error;
    }
    if (success) toast.success(success);
    router.refresh();
    return null;
  }

  async function reorder(promise) {
    const result = await promise;
    if (!result.ok) toast.error(result.error);
    else router.refresh();
    return result.ok;
  }

  async function saveCategory(values) {
    const error = await act(editing.item ? updateCategoryAction({ categoryId: editing.item.id, input: values }) : createCategoryAction(values), "Category saved.");
    if (!error) setEditing(null);
    return error;
  }

  async function saveProduct(input) {
    const error = await act(saveProductAction({ productId: editing.item?.id, input }), "Product saved.");
    if (!error) setEditing(null);
    return error;
  }

  async function doConfirmed() {
    const { kind, item } = confirm;
    await act(kind === "category" ? deleteCategoryAction({ categoryId: item.id }) : deleteProductAction({ productId: item.id }), `${item.name} deleted.`);
  }

  async function setPublished(published) {
    setPublishing(true);
    await act(setMenuPublishedAction({ published }), published ? "Menu published." : "Menu removed from your website.");
    setPublishing(false);
  }

  if (editing?.kind === "category") {
    return <CategoryForm category={editing.item} onSubmit={saveCategory} onCancel={() => setEditing(null)} />;
  }
  if (editing?.kind === "product") {
    return (
      <ProductForm
        product={editing.item}
        categories={categories}
        defaultCategoryId={activeCategory?.id ?? categories[0]?.id ?? ""}
        currency={currency}
        onSubmit={saveProduct}
        onCancel={() => setEditing(null)}
      />
    );
  }

  const changed = meta.version > 0 && (!meta.published || meta.version !== meta.publishedVersion);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge
            status={meta.published ? (changed ? "PENDING" : "ACTIVE") : "neutral"}
            label={meta.published ? (changed ? "Unpublished changes" : "Menu is live") : "Not published"}
          />
          <p className="text-sm text-muted-foreground">
            {meta.published ? "Visitors see your menu on your website once the site itself is published." : "Publish to show your public items on your website."}{" "}
            <Link href="/dashboard/website" className="underline underline-offset-4">Website settings</Link>
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setPublished(true)} disabled={publishing || (meta.published && !changed) || categories.length === 0}>
            {meta.published ? "Publish changes" : "Publish menu"}
          </Button>
          {meta.published ? <Button variant="outline" onClick={() => setPublished(false)} disabled={publishing}>Unpublish</Button> : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <section aria-labelledby="categories-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="categories-heading" className="text-lg font-semibold">Categories</h2>
            <Button size="sm" variant="outline" onClick={() => setEditing({ kind: "category" })}><Plus aria-hidden="true" />Add</Button>
          </div>
          <button
            type="button"
            onClick={() => setSelected("all")}
            aria-pressed={activeId === "all"}
            className={cn("mb-2 flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-sm", activeId === "all" ? "bg-primary text-primary-foreground" : "bg-surface hover:bg-muted")}
          >
            <span>All items</span><span className="tabular">{products.length}</span>
          </button>
          {categories.length > 0 ? (
            <SortableList
              listId="categories"
              label="Categories"
              items={categories}
              getLabel={(c) => c.name}
              onReorder={(ids) => reorder(reorderCategoriesAction({ orderedIds: ids }))}
              renderItem={(c) => (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelected(c.id)}
                    aria-pressed={activeId === c.id}
                    className={cn("flex min-w-0 flex-1 items-center justify-between rounded-md px-2 py-1.5 text-left text-sm", activeId === c.id ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate">{c.name}</span>
                      {c.visibility === "PRIVATE" ? <EyeOff className="size-3.5 shrink-0" aria-label="Private" /> : <Eye className="sr-only" aria-hidden="true" />}
                    </span>
                    <span className="tabular">{counts[c.id] ?? 0}</span>
                  </button>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditing({ kind: "category", item: c })} aria-label={`Edit ${c.name}`}><Pencil aria-hidden="true" /></Button>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setConfirm({ kind: "category", item: c })} aria-label={`Delete ${c.name}`}><Trash2 aria-hidden="true" /></Button>
                </div>
              )}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No categories yet. Add one to start building your menu.</p>
          )}
        </section>

        <section aria-labelledby="products-heading" className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 id="products-heading" className="text-lg font-semibold">{activeCategory ? activeCategory.name : "All items"}</h2>
            <Button onClick={() => setEditing({ kind: "product" })} disabled={categories.length === 0}><Plus aria-hidden="true" />Add product</Button>
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <label htmlFor="menu-search" className="sr-only">Search products</label>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input id="menu-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" className="pl-9" />
            </div>
            <div>
              <label htmlFor="menu-availability" className="sr-only">Availability</label>
              <select id="menu-availability" value={availability} onChange={(e) => setAvailability(e.target.value)} className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm">
                <option value="ALL">All availability</option>
                <option value="AVAILABLE">Available</option>
                <option value="UNAVAILABLE">Sold out</option>
              </select>
            </div>
            <div>
              <label htmlFor="menu-dietary" className="sr-only">Dietary label</label>
              <select id="menu-dietary" value={dietary} onChange={(e) => setDietary(e.target.value)} className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm">
                <option value="ALL">All dietary labels</option>
                {Object.entries(DIETARY_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title={products.length === 0 ? "No products yet" : "No products match"}
              description={products.length === 0 ? (categories.length === 0 ? "Create a category first, then add your products." : "Add your first product to this menu.") : "Try a different search or filter."}
            />
          ) : canReorder ? (
            <>
              <p className="mb-2 text-xs text-muted-foreground">Drag the handle, or focus it and press space and the arrow keys, to change the order guests see.</p>
              <SortableList
                key={activeId}
                listId={`products-${activeId}`}
                label={`${activeCategory.name} products`}
                items={visible}
                getLabel={(p) => p.name}
                onReorder={(ids) => reorder(reorderProductsAction({ categoryId: activeId, orderedIds: ids }))}
                renderItem={(p) => (
                  <ProductSummary
                    product={p} currency={currency}
                    onToggle={(next) => act(setAvailabilityAction({ productId: p.id, available: next }))}
                    onEdit={() => setEditing({ kind: "product", item: p })}
                    onDelete={() => setConfirm({ kind: "product", item: p })}
                  />
                )}
              />
            </>
          ) : (
            <>
              {filtersActive || !activeCategory ? <p className="mb-2 text-xs text-muted-foreground">Select a category and clear the filters to change the order.</p> : null}
              <ul aria-label="Products" className="space-y-2">
                {visible.map((p) => (
                  <li key={p.id} className="rounded-lg border border-border bg-surface p-3">
                    <ProductSummary
                      product={p} currency={currency} categoryName={nameOf(p.categoryId)}
                      onToggle={(next) => act(setAvailabilityAction({ productId: p.id, available: next }))}
                      onEdit={() => setEditing({ kind: "product", item: p })}
                      onDelete={() => setConfirm({ kind: "product", item: p })}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        destructive
        title={`Delete ${confirm?.item.name ?? ""}?`}
        description={confirm?.kind === "category" ? "Only empty categories can be deleted." : "This removes the product from your menu. It stays on your public menu until you publish again."}
        confirmLabel={confirm?.kind === "category" ? "Delete category" : "Delete product"}
        onConfirm={doConfirmed}
      />
    </div>
  );
}
