/** Pure helpers behind components/shared/DataTable.jsx. */

function compare(a, b) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

/** Stable sort. Empty values (null/undefined) always sort last, in either direction. */
export function sortRows(rows, accessor, direction = "asc") {
  if (!accessor) return rows;
  const factor = direction === "desc" ? -1 : 1;
  return rows
    .map((row, index) => ({ row, index, value: accessor(row) }))
    .sort((x, y) => {
      const xEmpty = x.value == null;
      const yEmpty = y.value == null;
      if (xEmpty || yEmpty) return xEmpty && yEmpty ? x.index - y.index : xEmpty ? 1 : -1;
      return factor * compare(x.value, y.value) || x.index - y.index;
    })
    .map((x) => x.row);
}

export function paginate(rows, page, pageSize) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), page: current, pageCount, total: rows.length };
}
