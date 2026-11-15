import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/api", () => ({
  route: (fn: unknown) => fn,
  check: (error: unknown) => { if (error) throw error; },
}));
vi.mock("@/lib/invitations", () => import("./invitations"));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser }, rpc: mocks.rpc }),
}));
import { GET } from "../app/api/invite/[token]/route";

it.each([null, { id: "user" }])("preview exposes signedIn without changing invite for %j", async user => {
  const invite = { list_id: "list", list_title: "Title", owner_name: "Owner", expired: false };
  mocks.rpc.mockResolvedValue({ data: [invite], error: null });
  mocks.getUser.mockResolvedValue({ data: { user }, error: null });
  const response = await GET(new Request("https://minder.example"), {
    params: Promise.resolve({ token: "a".repeat(64) }),
  });
  expect(await response.json()).toEqual({ invite, signedIn: Boolean(user) });
});
