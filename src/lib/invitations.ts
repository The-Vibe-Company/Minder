import { z } from "zod";

export const emailInviteInput = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
});
export function inviteToken(path: string | null | undefined): string | null {
  return path?.match(/^\/invite\/([a-f0-9]{64})$/)?.[1] ?? null;
}
export function joinToken(next: string, cookie?: string): string | null {
  return inviteToken(next) ?? (cookie && /^[a-f0-9]{64}$/.test(cookie) ? cookie : null);
}
export const joinCookieOptions = {
  httpOnly: true, sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 7 * 24 * 60 * 60, path: "/",
};
