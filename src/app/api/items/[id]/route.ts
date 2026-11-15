import { NextResponse } from "next/server";
import { z } from "zod";
import {
  route,
  session,
  check,
  membership,
  signed,
  uuid,
  ApiError,
} from "@/lib/api";
async function owned(ctx: { params: Promise<Record<string, string>> }, author = false) {
  const { id } = await ctx.params;
  uuid.parse(id);
  const { db, user } = await session();
  const { data, error } = await db
    .from("items")
    .select("*")
    .eq("id", id)
    .single();
  check(error);
  if (!data) throw new ApiError(404, "Objet introuvable.");
  await membership(db, data.list_id, user.id, !(author && data.created_by === user.id));
  return { db, item: data };
}
export const PATCH = route(async (request, ctx) => {
  const { db, item } = await owned(ctx, true);
  const changes = z.object({
    title: z.string().trim().max(120).optional(),
    description: z.string().trim().max(3000).optional(),
  }).refine((value) => value.title !== undefined || value.description !== undefined)
    .parse(await request.json());
  const { data, error } = await db
    .from("items")
    .update(changes)
    .eq("id", item.id)
    .select()
    .single();
  check(error);
  return NextResponse.json({
    item: (await signed(db, [data!]))[0],
    notice: null,
  });
});
export const DELETE = route(async (_, ctx) => {
  const { db, item } = await owned(ctx);
  check((await db.from("items").delete().eq("id", item.id)).error);
  const cleanup = await db.storage.from("item-photos").remove([item.photo_path]);
  if (cleanup.error) await db.storage.from("item-photos").remove([item.photo_path]);
  return NextResponse.json({ ok: true });
});
