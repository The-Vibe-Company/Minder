import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  session: vi.fn(), membership: vi.fn(), cleanup: vi.fn(), from: vi.fn(),
  deletion: vi.fn(), eq: vi.fn(), select: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/api", async () => ({
  ...await import("./api"), session: m.session, membership: m.membership,
}));
vi.mock("@/lib/pagination", () => import("./pagination"));
vi.mock("@/lib/storage-cleanup", () => ({ removeListPhotos: m.cleanup }));
import { ApiError } from "./api";
import { DELETE } from "../app/api/lists/[listId]/route";
const invoke = () => DELETE(new Request("https://minder.example/api/lists/list", { method: "DELETE" }), { params: Promise.resolve({ listId: "list" }) });
beforeEach(() => {
  vi.resetAllMocks();
  m.session.mockResolvedValue({ db: { from: m.from }, user: { id: "owner" } });
  m.membership.mockResolvedValue("owner");
  m.cleanup.mockResolvedValue(2);
  m.from.mockReturnValue({ delete: m.deletion });
  m.deletion.mockReturnValue({ eq: m.eq });
  m.eq.mockReturnValue({ select: m.select });
  m.select.mockResolvedValue({ data: [{ id: "list" }], error: null });
});
it("checks ownership, cleans storage while owner RLS still works, then confirms row deletion", async () => {
  const response = await invoke();
  expect(await response.json()).toEqual({ ok: true, removedPhotos: 2 });
  expect(m.membership).toHaveBeenCalledWith(expect.anything(), "list", "owner", true);
  expect(m.membership.mock.invocationCallOrder[0]).toBeLessThan(m.cleanup.mock.invocationCallOrder[0]);
  expect(m.cleanup.mock.invocationCallOrder[0]).toBeLessThan(m.deletion.mock.invocationCallOrder[0]);
  expect(m.eq).toHaveBeenCalledWith("id", "list");
  expect(m.select).toHaveBeenCalledWith("id");
});
it("does not touch storage when ownership fails", async () => {
  m.membership.mockRejectedValue(new ApiError(403, "forbidden"));
  expect((await invoke()).status).toBe(403);
  expect(m.cleanup).not.toHaveBeenCalled();
  expect(m.from).not.toHaveBeenCalled();
});
it("does not delete the row after cleanup failure", async () => {
  m.cleanup.mockRejectedValue(new Error("storage failed"));
  const response = await invoke();
  expect(response.status).toBe(500);
  expect((await response.json()).error).toContain("La liste n’a pas été supprimée");
  expect(m.from).not.toHaveBeenCalled();
});
it.each([
  { data: null, error: { message: "database failed" } },
  { data: [], error: null },
  { data: [{ id: "list" }, { id: "other" }], error: null },
])("reports partial failure instead of success when row deletion is unconfirmed", async result => {
  m.select.mockResolvedValue(result);
  const response = await invoke();
  expect(response.status).toBe(500);
  expect((await response.json()).error).toContain("Les photos ont été supprimées");
});
it("reports partial failure on thrown database errors too", async () => {
  m.select.mockRejectedValue(new Error("network failed"));
  const response = await invoke();
  expect(response.status).toBe(500);
  expect((await response.json()).error).toContain("Les photos ont été supprimées");
});
