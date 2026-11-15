import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/site-origin", () => import("./site-origin"));
vi.mock("@/lib/profile", () => import("./profile"));
vi.mock("@/lib/api", () => import("./api"));
vi.mock("@/lib/navigation-guard", () => import("./navigation-guard"));
vi.mock("@/lib/invitations", () => import("./invitations"));
import { proxy } from "../proxy";
import { configuredSiteOrigin, siteOrigin } from "./site-origin";

afterEach(() => vi.unstubAllEnvs());
const canonical = "https://minder.thevibecompany.co";
const alias = "https://minder-git-feat-minder-skeleton-the-vibe-company.vercel.app";

it.each(["GET", "HEAD"])("redirects %s before auth, preserving the callback query", async method => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", canonical);
  const response = await proxy(new NextRequest(alias + "/auth/callback?code=a%2Bb&next=%2Finvite%2Ftoken", { method }));
  expect(response.status).toBe(308);
  expect(response.headers.get("location")).toBe(canonical + "/auth/callback?code=a%2Bb&next=%2Finvite%2Ftoken");
  expect(response.cookies.getAll()).toEqual([]);
});

it.each([
  [alias, "/login", "GET", ""],
  [canonical, "/login", "GET", canonical],
  ["http://localhost:3000", "/login", "GET", canonical],
  ["https://other-project.vercel.app", "/login", "GET", canonical],
  [alias + ".evil.example", "/login", "GET", canonical],
  [alias, "/api/auth/login", "POST", canonical],
  [alias, "/api/health", "GET", canonical],
  [alias, "/_next/static/chunk.js", "GET", canonical],
])("does not canonical-redirect %s%s %s", async (origin, path, method, configured) => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", configured);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  const response = await proxy(new NextRequest(origin + path, { method }));
  expect(response.status).toBe(200);
  expect(response.headers.get("location")).toBeNull();
});

it("redirects deployment URLs and invite paths without consuming the invitation", async () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", canonical);
  const response = await proxy(new NextRequest("https://minder-ab123-the-vibe-company.vercel.app/invite/token?x=1"));
  expect(response.status).toBe(308);
  expect(response.headers.get("location")).toBe(canonical + "/invite/token?x=1");
  expect(response.cookies.getAll()).toEqual([]);
});

it.each(["", "not a URL", "javascript:alert(1)", "ftp://example.com", "https://user:password@example.com"])("falls back safely for invalid configuration %s", configured => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", configured);
  vi.stubEnv("VERCEL_ENV", "preview");
  expect(configuredSiteOrigin()).toBeUndefined();
  expect(siteOrigin(new Request(alias))).toBe(alias);
});
