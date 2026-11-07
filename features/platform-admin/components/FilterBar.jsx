"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Search box + status select shared by the platform tables. */
export default function FilterBar({ search, onSearch, status, onStatus, statuses, searchLabel }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <label htmlFor="platform-search" className="sr-only">{searchLabel}</label>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input id="platform-search" type="search" value={search} onChange={(e) => onSearch(e.target.value)} placeholder={searchLabel} className="pl-9" />
      </div>
      <div>
        <label htmlFor="platform-status" className="sr-only">Filter by status</label>
        <select
          id="platform-status"
          value={status}
          onChange={(e) => onStatus(e.target.value)}
          className="h-11 w-full rounded-md border border-border bg-surface px-3 text-sm sm:w-48"
        >
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
