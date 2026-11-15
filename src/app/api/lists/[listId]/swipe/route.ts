import { NextResponse } from "next/server";

import { route, session, check, membership, signed } from "@/lib/api";
export const GET = route(async (_, ctx) => {
  const { listId } = await ctx.params;
  const { db, user } = await session();
  await membership(db, listId, user.id);
  const { data, error } = await db.rpc("items_to_swipe", {
    p_list_id: listId,
    p_limit: 20,
  });
  check(error);
  return NextResponse.json({ items: await signed(db, data ?? []) });
});
