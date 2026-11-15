import { describe, expect, it, vi } from "vitest";
import { collectPages } from "./pagination";
describe("collectPages", () => {
  it("collects beyond the database default row limit", async () => {
    const rows = Array.from({ length: 2105 }, (_, id) => ({ id }));
    const fetchPage = vi.fn(async (from: number, to: number) => ({
      data: rows.slice(from, to + 1),
      error: null,
    }));
    expect(await collectPages(fetchPage)).toEqual(rows);
    expect(fetchPage.mock.calls).toEqual([
      [0, 499],
      [500, 999],
      [1000, 1499],
      [1500, 1999],
      [2000, 2499],
    ]);
  });
  it("requests the final empty page for exact multiples", async () => {
    const rows = [1, 2, 3, 4];
    const fetchPage = vi.fn(async (from: number, to: number) => ({
      data: rows.slice(from, to + 1),
      error: null,
    }));
    expect(await collectPages(fetchPage, 2)).toEqual(rows);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });
  it("returns empty collections and rejects partial failures", async () => {
    expect(await collectPages(async () => ({ data: [], error: null }))).toEqual(
      [],
    );
    await expect(
      collectPages(
        async (from) =>
          from === 0
            ? { data: [1], error: null }
            : { data: null, error: new Error("failure") },
        1,
      ),
    ).rejects.toThrow("Unable to load complete results");
  });
  it("rejects invalid page sizes", async () => {
    await expect(
      collectPages(async () => ({ data: [], error: null }), 0),
    ).rejects.toThrow("Invalid page size");
  });
});
