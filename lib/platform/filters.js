const includes = (value, needle) => typeof value === "string" && value.toLowerCase().includes(needle);

/** Substring search plus status filter. Done in memory: Firestore has no substring search. */
export function filterTenants(rows, { status = "ALL", search = "" } = {}) {
  const needle = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (status !== "ALL" && row.status !== status) return false;
    if (!needle) return true;
    return [row.name, row.ownerEmail, row.city, row.country].some((v) => includes(v, needle));
  });
}

export function filterApplications(rows, { status = "ALL", search = "" } = {}) {
  const needle = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (status !== "ALL" && row.status !== status) return false;
    if (!needle) return true;
    return [row.restaurantName, row.ownerEmail, row.city, row.country].some((v) => includes(v, needle));
  });
}
