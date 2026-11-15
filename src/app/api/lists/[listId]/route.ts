import { removeListPhotos } from "@/lib/storage-cleanup";
import { collectPages } from "@/lib/pagination";
import { NextResponse } from "next/server";

import { route, session, check, membership, signed } from "@/lib/api";
export const GET = route(async (_, ctx) => {
  const { listId } = await ctx.params;
  const { db, user } = await session();
  const role = await membership(db, listId, user.id);
  const { data: list, error } = await db
    .from("lists")
    .select("*")
    .eq("id", listId)
    .single();
  check(error);
  const items = await collectPages((from, to) =>
    db
      .from("items")
      .select("*")
      .eq("list_id", listId)
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to),
  );
  return NextResponse.json({
    list,
    role,
    ...(role === "owner" ? {drafts: items.filter((i) => i.status === "draft").length} : {}),
    items: await signed(db, items),
  });
});

export const DELETE = route(async (_, ctx) => {
  const {listId} = await ctx.params;
  const {db,user} = await session();
  await membership(db,listId,user.id,true);
  const removedPhotos = await removeListPhotos(db,listId);
  check((await db.from("lists").delete().eq("id",listId)).error);
  return NextResponse.json({ok:true,removedPhotos});
});
