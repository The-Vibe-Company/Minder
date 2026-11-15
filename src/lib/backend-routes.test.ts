import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), membership: vi.fn(), signed: vi.fn(async (_db, items) => items), session: vi.fn() }));
vi.mock("@/lib/api", () => ({
  route: (fn: unknown) => fn,
  session: mocks.session,
  membership: mocks.membership,
  signed: mocks.signed,
  check: (error: unknown) => { if (error) throw error; },
}));
import { GET } from "../app/api/lists/[listId]/search/route";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({db: {rpc: mocks.rpc}, user: {id: "user"}});
});
it("uses only title-aware text RPC and ignores legacy/unknown modes", async () => {
  const items = [{id: "item", title: "Chaise bleue", photo_path: "photo"}];
  mocks.rpc.mockResolvedValue({ data: items, error: null });
  const response = await GET(new Request("https://minder.example/api/lists/list/search?q=chaise&mode=anything"), {params: Promise.resolve({listId: "list"})});
  expect(mocks.membership).toHaveBeenCalledWith(expect.anything(), "list", "user");
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("search_items_text", {p_list_id: "list", p_query: "chaise", p_limit: 50});
  expect(await response.json()).toEqual({items});
});
it("propagates database failures rather than returning false empty results", async () => {
  mocks.rpc.mockResolvedValue({data: null, error: new Error("database unavailable")});
  await expect(GET(new Request("https://minder.example/?q=chaise"), {params: Promise.resolve({listId: "list"})})).rejects.toThrow("database unavailable");
});
