import { configuredSiteOrigin } from "./site-origin";

/** Explicit images bypass Next's file-based Vercel preview origin fallback.
 * See next/dist/lib/metadata/resolvers/resolve-url and
 * metadata-resolution-primitives: metadataBase alone does not override it.
 */
export function canonicalSocialMetadata() {
  const origin = configuredSiteOrigin();
  if (!origin) return undefined;
  const image = {
    url: new URL("/opengraph-image", origin).href,
    width: 1200,
    height: 630,
    alt: "Minder : la maison est vendue, on se partage les objets en famille",
  };
  return {
    metadataBase: new URL(origin),
    images: [image],
  };
}
