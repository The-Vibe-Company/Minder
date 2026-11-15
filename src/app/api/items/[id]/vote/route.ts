import { NextResponse } from "next/server";
import { z } from "zod";
import { route, session, check, membership, uuid, ApiError } from "@/lib/api";
async function itemContext(ctx: { params: Promise<Record<string, string>> }) {
  const { id } = await ctx.params;
  uuid.parse(id);
  const { db, user } = await session();
  const { data, error } = await db
    .from("items")
    .select("list_id")
    .eq("id", id)
    .single();
  check(error);
  if (!data) throw new ApiError(404, "Objet introuvable.");
  await membership(db, data.list_id, user.id);
  return { db, user, id, listId: data.list_id };
}
export const POST = route(async (request, ctx) => {
  const { db, user, id, listId } = await itemContext(ctx);
  const { choice } = z
    .object({ choice: z.enum(["yes", "no"]) })
    .parse(await request.json());
  check(
    (
      await db
        .from("votes")
        .upsert(
          { item_id: id, list_id: listId, user_id: user.id, choice },
          { onConflict: "item_id,user_id" },
        )
    ).error,
  );
  return NextResponse.json({ ok: true });
});
export const DELETE = route(async (_, ctx) => {
  const { db, user, id } = await itemContext(ctx);
  check(
    (await db.from("votes").delete().eq("item_id", id).eq("user_id", user.id))
      .error,
  );
  return NextResponse.json({ ok: true });
});
