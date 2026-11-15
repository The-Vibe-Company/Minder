import { z } from "zod";
export const displayName = z.string().trim().min(1).max(40).refine((name) => !name.includes("@"));
export function onboardingPath(path: string, onboarded: boolean) {
  return !onboarded && (path === "/lists" || path.startsWith("/lists/") || path.startsWith("/lists?"))
    ? `/welcome?next=${encodeURIComponent(path)}` : null;
}
