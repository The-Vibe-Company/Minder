/** Only HTTP(S) origins without credentials may be used for outgoing links. */
export function configuredSiteOrigin(): string | undefined {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "");
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password)
      return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

/** Explicit canonical configuration wins in every deployment environment. */
export function siteOrigin(request: Request): string {
  return configuredSiteOrigin() ?? new URL(request.url).origin;
}

/** Run before session handling, so cookies are read/set only on the final host. */
export function canonicalRedirect(request: Request): URL | undefined {
  const canonical = configuredSiteOrigin();
  if (!canonical || !["GET", "HEAD"].includes(request.method)) return;
  const url = new URL(request.url);
  if (url.origin === canonical ||
      !/^minder-[a-z0-9-]+-the-vibe-company\.vercel\.app$/.test(url.hostname) ||
      url.pathname.startsWith("/_next/") ||
      url.pathname === "/api/health") return;
  // Assign components rather than resolving a path (which could start with //).
  const target = new URL(canonical);
  target.pathname = url.pathname;
  target.search = url.search;
  return target;
}
