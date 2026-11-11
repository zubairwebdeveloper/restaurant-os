"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MenuCard } from "@/features/menu/menu-card";

export function MenuBrowser({ categories, items }) {
  const [active, setActive] = useState("all");
  const visible = active === "all" ? items : items.filter((i) => i.category === active);

  return (
    <div>
      <Tabs value={active} onValueChange={setActive}>
        <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <TabsList aria-label="Menu categories" className="min-w-max">
            <TabsTrigger value="all">All</TabsTrigger>
            {categories.map((c) => (<TabsTrigger key={c.id} value={c.id}>{c.name}</TabsTrigger>))}
          </TabsList>
        </div>
      </Tabs>

      {visible.length === 0 ? (
        <p className="mt-16 text-center text-ivory/60">Nothing in this category yet. Check back soon.</p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item, i) => (<MenuCard key={item.id} item={item} tone={i} />))}
        </div>
      )}
    </div>
  );
}
