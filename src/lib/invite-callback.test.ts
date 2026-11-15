import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), exchange: vi.fn(), cookie: vi.fn(), getUser: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.cookie }) }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession: mocks.exchange, getUser: mocks.getUser }, rpc: mocks.rpc }),
}));
vi.mock("@/lib/invitations", () => import("./invitations"));
vi.mock("@/lib/api", () => import("./api"));
import { GET } from "../app/auth/callback/route";
const token = "a".repeat(64);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.cookie.mockReset();
  mocks.exchange.mockResolvedValue({ error: null });
  mocks.rpc.mockImplementation(async (name) => name === "accept_invite" ? { data: "list-id", error: null } : { data: 0, error: null });
});
it("callback joins explicit invite and clears remembered token", async () => {
  const response = await GET(new Request(`https://minder.example/auth/callback?code=code&next=/invite/${token}`));
  expect(response.headers.get("location")).toBe("https://minder.example/lists/list-id");
  expect(mocks.rpc).toHaveBeenCalledWith("accept_invite", { p_token: token });
  expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
});
it("callback joins cookie even when login was opened directly", async () => {
  mocks.cookie.mockReturnValue({ value: token });
  const response = await GET(new Request("https://minder.example/auth/callback?code=code"));
  expect(response.headers.get("location")).toBe("https://minder.example/lists/list-id");
});
it("failed invite returns to preview; claim failures do not prevent joining", async () => {
  mocks.rpc.mockImplementation(async (name) => name === "claim_email_invites" ? Promise.reject(new Error("offline")) : { data: null, error: {} });
  const response = await GET(new Request(`https://minder.example/auth/callback?code=code&next=/invite/${token}`));
  expect(response.headers.get("location")).toBe(`https://minder.example/invite/${token}`);
});
it("failed authentication never claims or joins", async () => {
  mocks.exchange.mockResolvedValue({ error: {} });
  await GET(new Request(`https://minder.example/auth/callback?code=bad&next=/invite/${token}`));
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it("hands implicit fragments to browser completion without losing next", async () => {
  const response = await GET(new Request(`https://minder.example/auth/callback?next=/invite/${token}`));
  const target = new URL(response.headers.get("location")!);
  expect(target.pathname).toBe("/auth/complete");
  expect(target.searchParams.get("next")).toBe(`/invite/${token}`);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("browser completion must have a server-verified session", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
  const response = await GET(new Request("https://minder.example/auth/callback?session=1"));
  expect(response.headers.get("location")).toContain("/login?error=invalid_link");
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("verified browser completion claims email invites", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user" } }, error: null });
  const response = await GET(new Request("https://minder.example/auth/callback?session=1&next=/lists/id"));
  expect(response.headers.get("location")).toBe("https://minder.example/lists/id");
  expect(mocks.rpc).toHaveBeenCalledWith("claim_email_invites");
});
