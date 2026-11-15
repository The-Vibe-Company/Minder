import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { safeNext } from "./api";
import { emailInviteInput, inviteToken, joinToken } from "./invitations";
const token = "a".repeat(64);
it("parses only exact invite paths and prefers explicit next over cookie", () => {
  expect(inviteToken(`/invite/${token}`)).toBe(token);
  for (const path of [`//invite/${token}`, `/invite/${token}?x=1`, "/invite/bad", `/invite/${"A".repeat(64)}`]) expect(inviteToken(path)).toBeNull();
  expect(joinToken(`/invite/${token}`, "b".repeat(64))).toBe(token);
  expect(joinToken("/lists", token)).toBe(token);
  expect(joinToken("/lists/123", "bad")).toBeNull();
});
it("safeNext keeps list and invite paths but rejects external redirects", () => {
  for (const path of [`/invite/${token}`, "/lists/123"]) expect(safeNext(path)).toBe(path);
  for (const path of ["//evil.example", "https://evil.example", "/\\evil", "/\nevil", null]) expect(safeNext(path)).toBe("/lists");
});
it("normalizes email before validating", () => {
  expect(emailInviteInput.parse({ email: "  A@Example.COM " })).toEqual({ email: "a@example.com" });
  expect(emailInviteInput.safeParse({ email: "not-an-email" }).success).toBe(false);
});
it("signup creates only a profile; list visibility remains owner or member", () => {
  const sql = readFileSync("supabase/migrations/20261115000001_init.sql", "utf8");
  const signup = sql.split("function public.handle_new_user()")[1].split("end $$")[0];
  expect(signup).toContain("insert into public.profiles");
  expect(signup).not.toContain("insert into public.lists");
  expect(sql).toContain("using (public.is_list_member(id) or owner_id = auth.uid())");
  const migration = readFileSync("supabase/migrations/20261115000004_share_links_email_invites.sql", "utf8");
  expect(migration).not.toMatch(/(drop|create) policy lists_select/);
  expect(migration).toContain("u.email_confirmed_at is not null");
});
