import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), pages: vi.fn(), session: vi.fn(), membership: vi.fn() }));
vi.mock("@/lib/api", () => ({
  route: (fn: unknown) => fn, session: mocks.session, membership: mocks.membership,
  siteOrigin: () => "https://minder.example",
  check: (error: unknown) => { if (error) throw error; },
}));
vi.mock("@/lib/pagination", () => ({ collectPages: mocks.pages }));
import { GET, POST } from "../app/api/lists/[listId]/invites/route";
const ctx = { params: Promise.resolve({ listId: "list" }) };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ db: { rpc: mocks.rpc }, user: { id: "owner" } });
});
it("GET retains invites and exposes shareLink and emailInvites", async () => {
  const invite = { id: "id", token: "token", created_at: "date", revoked_at: null };
  mocks.pages.mockResolvedValueOnce([invite]).mockResolvedValueOnce([{ email: "guest@example.com" }]);
  const response = await GET(new Request("https://minder.example"), ctx);
  expect(await response.json()).toEqual({
    invites: [invite],
    shareLink: { id: "id", token: "token", created_at: "date", url: "https://minder.example/invite/token" },
    emailInvites: [{ email: "guest@example.com" }],
  });
  expect(mocks.membership).toHaveBeenCalledWith(expect.anything(), "list", "owner", true);
});
it("GET returns null when no share link exists", async () => {
  mocks.pages.mockResolvedValue([]);
  expect(await (await GET(new Request("https://minder.example"), ctx)).json()).toEqual({ invites: [], shareLink: null, emailInvites: [] });
});
it("POST uses atomic rotation and preserves response shape", async () => {
  mocks.rpc.mockResolvedValue({ data: { token: "token" }, error: null });
  const response = await POST(new Request("https://minder.example", { method: "POST" }), ctx);
  expect(response.status).toBe(201);
  expect(mocks.rpc).toHaveBeenCalledWith("rotate_share_link", { p_list_id: "list" });
  expect(await response.json()).toEqual({ invite: { token: "token" }, url: "https://minder.example/invite/token" });
});
