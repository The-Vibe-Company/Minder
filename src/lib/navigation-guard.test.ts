import { expect, it } from "vitest";
import { canAutoJoin, canCompleteSession } from "./navigation-guard";

it.each([
  ["GET", {}, true],
  ["HEAD", {}, false],
  ["GET", { "sec-fetch-dest": "empty" }, false],
  ["GET", { "next-router-prefetch": "1" }, false],
  ["GET", { purpose: "prefetch" }, false],
  ["GET", { "sec-purpose": "prefetch;prerender" }, false],
  ["GET", { rsc: "1" }, false],
  ["GET", { "sec-fetch-site": "cross-site" }, false],
  ["GET", { "sec-fetch-site": "none" }, true],
  ["GET", { "sec-fetch-site": "same-site" }, true],
  ["GET", { "sec-fetch-site": "same-origin", "sec-fetch-dest": "document" }, true],
] as [string, Record<string, string>, boolean][])("auto-join %s %j → %s", (method, headers, expected) => {
  expect(canAutoJoin(new Request("https://minder.example", { method, headers }))).toBe(expected);
});
it.each([null, "cross-site", "none", "same-site", "same-origin"])("session completion requires same-origin: %s", site => {
  const headers: Record<string, string> = site ? { "sec-fetch-site": site } : {};
  expect(canCompleteSession(new Request("https://minder.example", { headers }))).toBe(site === "same-origin");
});
