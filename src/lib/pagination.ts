/** Collect a stable, uniquely ordered PostgREST query using inclusive ranges.
 * Callers must order by a unique key (or add a unique tie-breaker).
 * A final empty page is intentional when the size is an exact multiple.
 */
export async function collectPages<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 500,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1)
    throw new Error("Invalid page size");
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const result = await fetchPage(from, from + pageSize - 1);
    if (result.error) throw new Error("Unable to load complete results");
    const page = result.data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
