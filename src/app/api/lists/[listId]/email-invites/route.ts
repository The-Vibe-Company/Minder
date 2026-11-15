import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { route, session, membership, check, siteOrigin } from "@/lib/api";
import { emailInviteInput } from "@/lib/invitations";
import { collectPages } from "@/lib/pagination";

export const GET = route(async (_, ctx) => {
  const { listId } = await ctx.params;
  const { db, user } = await session();
  await membership(db, listId, user.id, true);
  const emailInvites = await collectPages((from, to) =>
    db.from("list_email_invites").select("*").eq("list_id", listId)
      .order("created_at", { ascending: false }).order("id").range(from, to));
  return NextResponse.json({ emailInvites });
});
export const POST = route(async (request, ctx) => {
  const { listId } = await ctx.params;
  const { db, user } = await session();
  await membership(db, listId, user.id, true);
  const { email } = emailInviteInput.parse(await request.json());
  const result = await db.from("list_email_invites").insert({ list_id: listId, email }).select().single();
  let invite = result.data;
  const existing = result.error?.code === "23505";
  if (existing) {
    const found = await db.from("list_email_invites").select("*").eq("list_id", listId).eq("email", email).single();
    check(found.error);
    invite = found.data;
  } else check(result.error);
  let emailSent = false;
  try {
    // Separate non-persisting auth client: never mutate the owner's cookies or PKCE verifier.
    const sender = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { error } = await sender.auth.signInWithOtp({ email, options: {
      emailRedirectTo: `${siteOrigin(request)}/auth/callback?next=/lists/${listId}`, shouldCreateUser: true,
    } });
    emailSent = !error;
  } catch {}
  return NextResponse.json({ invite, emailSent }, { status: existing ? 200 : 201 });
});
