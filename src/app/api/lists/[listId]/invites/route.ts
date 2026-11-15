import { collectPages } from "@/lib/pagination";
import { NextResponse } from "next/server";

import { route, session, check, membership, siteOrigin } from "@/lib/api";
export const GET = route(async (request, ctx) => {
  const { listId } = await ctx.params;
  const { db, user } = await session();
  await membership(db, listId, user.id, true);
  const data = await collectPages((from, to) =>
    db
      .from("invites")
      .select("*")
      .eq("list_id", listId)
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to),
  );
  const emailInvites = await collectPages((from, to) => db.from("list_email_invites").select("*").eq("list_id", listId).order("created_at", { ascending: false }).order("id").range(from, to));
  const active = data.find((invite) => !invite.revoked_at);
  const shareLink = active ? { id: active.id, token: active.token, url: `${siteOrigin(request)}/invite/${active.token}`, created_at: active.created_at } : null;
  return NextResponse.json({ invites: data, shareLink, emailInvites });
});
export const POST = route(async (request, ctx) => {
  const { listId } = await ctx.params;
  const { db, user } = await session();
  await membership(db, listId, user.id, true);
  const { data, error } = await db
    .rpc("rotate_share_link", { p_list_id: listId });
  check(error);
  return NextResponse.json(
    { invite: data, url: `${siteOrigin(request)}/invite/${data!.token}` },
    { status: 201 },
  );
});
