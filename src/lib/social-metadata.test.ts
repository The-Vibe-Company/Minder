import { afterEach, expect, it, vi } from "vitest";
import { resolveImages } from "next/dist/lib/metadata/resolvers/resolve-opengraph";
import { canonicalSocialMetadata } from "./social-metadata";

afterEach(() => vi.unstubAllEnvs());
const canonical = "https://minder.thevibecompany.co";
const branch = "minder-git-feat-minder-skeleton-the-vibe-company.vercel.app";

it("overrides file-image preview origin precedence with absolute social images", () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("VERCEL_BRANCH_URL", branch);
  vi.stubEnv("VERCEL_URL", "minder-deployment-the-vibe-company.vercel.app");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", canonical + "/");
  const social = canonicalSocialMetadata()!;
  // Reproduce the original bug using the installed Next.js resolver.
  expect(resolveImages([{ url: "/opengraph-image" }], social.metadataBase, true)?.[0].url.toString())
    .toBe("https://" + branch + "/opengraph-image");
  // Both explicit OG and Twitter image descriptors bypass that fallback,
  // even if resolved as file-based metadata.
  for (const isFile of [false, true]) {
    const image = resolveImages(social.images, social.metadataBase, isFile)?.[0];
    expect(image?.url.toString()).toBe(canonical + "/opengraph-image");
    expect(image).toMatchObject({ width: 1200, height: 630 });
  }
});

it.each(["", "invalid", "javascript:alert(1)"])("leaves Next defaults untouched without valid canonical config: %s", value => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", value);
  expect(canonicalSocialMetadata()).toBeUndefined();
});

it("normalizes configured origins outside previews too", () => {
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", canonical + "/ignored");
  const social = canonicalSocialMetadata()!;
  expect(social.metadataBase.origin).toBe(canonical);
  expect(social.images[0].url).toBe(canonical + "/opengraph-image");
});
