import { collectPages } from "@/lib/pagination";
import { NextResponse } from "next/server";

import { route, session, check, membership, siteOrigin } from "@/lib/api";
export const GET = route(async (_, ctx) => {
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
  return NextResponse.json({ invites: data });
});
export const POST = route(async (request, ctx) => {
  const { listId } = await ctx.params;
  const { db, user } = await session();
  await membership(db, listId, user.id, true);
  const { data, error } = await db
    .from("invites")
    .insert({ list_id: listId })
    .select()
    .single();
  check(error);
  return NextResponse.json(
    { invite: data, url: `${siteOrigin(request)}/invite/${data!.token}` },
    { status: 201 },
  );
});
