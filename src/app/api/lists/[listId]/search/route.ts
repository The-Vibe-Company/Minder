import { NextResponse } from "next/server";
import { z } from "zod";
import { route, session, check, membership, signed } from "@/lib/api";
export const GET = route(async (request, ctx) => {
  const { listId } = await ctx.params;
  const { db, user } = await session();
  await membership(db, listId, user.id);
  const params = new URL(request.url).searchParams;
  const q = z.string().trim().min(1).max(500).parse(params.get("q"));
  const text = await db.rpc("search_items_text", {
    p_list_id: listId,
    p_query: q,
    p_limit: 50,
  });
  check(text.error);
  return NextResponse.json({ items: await signed(db, text.data ?? []) });
});
