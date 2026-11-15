import { canCompleteSession } from "@/lib/navigation-guard";
import { cookies } from "next/headers";
import { joinToken, joinCookieOptions } from "@/lib/invitations";
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/api";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  try {
    const db = await createClient();
    const code = url.searchParams.get("code"),
      token_hash = url.searchParams.get("token_hash"),
      type = url.searchParams.get("type");
    let error;
    if (code) ({ error } = await db.auth.exchangeCodeForSession(code));
    else if (
      token_hash &&
      type &&
      [
        "signup",
        "invite",
        "magiclink",
        "recovery",
        "email_change",
        "email",
      ].includes(type)
    )
      ({ error } = await db.auth.verifyOtp({
        token_hash,
        type: type as EmailOtpType,
      }));
    else if (url.searchParams.get("session") === "1") {
      if (!canCompleteSession(request)) {
        return NextResponse.redirect(new URL(next, url.origin));
      }
      const result = await db.auth.getUser();
      error = result.error ?? (result.data.user ? null : new Error("not authenticated"));
    } else
      return NextResponse.redirect(
        new URL(`/auth/complete?next=${encodeURIComponent(next)}`, url.origin),
      );
    if (!error) {
      await db.rpc("claim_email_invites").then(() => {}, () => {});
      const token = joinToken(next, (await cookies()).get("minder_join")?.value);
      if (token) {
        const { data, error: joinError } = await db.rpc("accept_invite", { p_token: token });
        const response = NextResponse.redirect(new URL(!joinError && data ? `/lists/${data}` : `/invite/${token}`, url.origin));
        if (!joinError && data) response.cookies.set("minder_join", "", { ...joinCookieOptions, maxAge: 0 });
        return response;
      }
      return NextResponse.redirect(new URL(next, url.origin));
    }
  } catch {}
  return NextResponse.redirect(
    new URL("/login?error=invalid_link", url.origin),
  );
}
