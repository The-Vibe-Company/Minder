import { NextResponse } from "next/server";
import { route, session, membership, check, uuid } from "@/lib/api";
export const DELETE = route(async (_, ctx) => {
  const { listId, id } = await ctx.params;
  uuid.parse(id);
  const { db, user } = await session();
  await membership(db, listId, user.id, true);
  check((await db.from("list_email_invites").delete().eq("id", id).eq("list_id", listId)).error);
  return NextResponse.json({ ok: true });
});
