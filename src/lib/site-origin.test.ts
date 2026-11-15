import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { siteOrigin } from "./api";

const request = (url: string) => new Request(url);
afterEach(() => vi.unstubAllEnvs());

it("uses the configured site URL in production", () => {
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://minder.example/path");
  expect(
    siteOrigin(request("https://minder-abc.vercel.app/api/auth/login")),
  ).toBe("https://minder.example");
});

it("uses the configured canonical origin in preview too", () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://minder.example");
  expect(
    siteOrigin(
      request("https://minder-git-branch-team.vercel.app/api/auth/login"),
    ),
  ).toBe("https://minder.example");
});

it("falls back to the request origin when no site URL is set", () => {
  vi.stubEnv("VERCEL_ENV", "");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  expect(siteOrigin(request("http://localhost:4310/api/auth/login"))).toBe(
    "http://localhost:4310",
  );
});
