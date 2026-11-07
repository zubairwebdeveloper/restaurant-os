"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { paginate, sortRows } from "@/lib/utils/table";
import { cn } from "@/lib/utils/cn";

/**
 * Accessible, sortable, paginated table (no extra dependencies).
 * columns: [{ id, header, accessor(row) (used for sorting), cell?(row), sortable?, className? }]
 * Wide tables scroll inside their own container so the page never scrolls sideways.
 */
export default function DataTable({
  columns, rows, caption, getRowId, pageSize = 10, initialSort, emptyState,
}) {
  const [sort, setSort] = useState(initialSort ?? null); // { id, direction }
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.id === sort.id);
    return sortRows(rows, column?.accessor, sort.direction);
  }, [rows, columns, sort]);

  const view = paginate(sorted, page, pageSize);

  function toggleSort(column) {
    setPage(1);
    setSort((current) =>
      current?.id === column.id ? { id: column.id, direction: current.direction === "asc" ? "desc" : "asc" } : { id: column.id, direction: "asc" },
    );
  }

  if (rows.length === 0) return emptyState ?? null;

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-border bg-muted/60 text-xs text-muted-foreground">
            <tr>
              {columns.map((column) => {
                const active = sort?.id === column.id;
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}
                    className={cn("px-4 py-3 font-medium", column.className)}
                  >
                    {column.sortable ? (
                      <button type="button" onClick={() => toggleSort(column)} className="inline-flex items-center gap-1 hover:text-foreground">
                        {column.header}
                        {active ? (sort.direction === "asc" ? <ArrowUp className="size-3.5" aria-hidden="true" /> : <ArrowDown className="size-3.5" aria-hidden="true" />) : null}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {view.rows.map((row) => (
              <tr key={getRowId(row)} className="hover:bg-muted/40">
                {columns.map((column) => (
                  <td key={column.id} className={cn("px-4 py-3 align-middle", column.className)}>
                    {column.cell ? column.cell(row) : column.accessor(row) ?? "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
        <p className="tabular" aria-live="polite">
          Page {view.page} of {view.pageCount} · {view.total} {view.total === 1 ? "result" : "results"}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(view.page - 1)} disabled={view.page <= 1} aria-label="Previous page">
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage(view.page + 1)} disabled={view.page >= view.pageCount} aria-label="Next page">
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
