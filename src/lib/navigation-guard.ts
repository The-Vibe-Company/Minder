// Only real document navigations may cause implicit membership changes.
export function isDocumentNavigation(request: Request): boolean {
  const h = request.headers;
  const dest = h.get("sec-fetch-dest");
  return request.method === "GET" &&
    (dest === null || dest === "document") &&
    !h.has("next-router-prefetch") &&
    !/prefetch/i.test(h.get("purpose") ?? "") &&
    !/prefetch/i.test(h.get("sec-purpose") ?? "") &&
    !(h.get("rsc") === "1" && dest !== "document");
}

export function canAutoJoin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  return isDocumentNavigation(request) &&
    (site === null || ["none", "same-origin", "same-site"].includes(site));
}

export function canCompleteSession(request: Request): boolean {
  return isDocumentNavigation(request) &&
    request.headers.get("sec-fetch-site") === "same-origin";
}
