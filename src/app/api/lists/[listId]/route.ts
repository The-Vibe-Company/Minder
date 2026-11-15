import { removeListPhotos } from "@/lib/storage-cleanup";
import { collectPages } from "@/lib/pagination";
import { NextResponse } from "next/server";

import { route, session, check, membership, signed, ApiError } from "@/lib/api";
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
  // Storage DELETE uses is_list_owner(folder): deleting the list first revokes
  // permission to remove its photos (20261115000001_init.sql). Storage and
  // Postgres cannot be committed atomically here. Keep the row until cleanup
  // succeeds, and explicitly report the partial outcome if row deletion fails.
  let removedPhotos: number;
  try {
    removedPhotos = await removeListPhotos(db,listId);
  } catch {
    throw new ApiError(500, "Suppression des photos incomplète. La liste n’a pas été supprimée ; certaines photos peuvent avoir été retirées. Réessayez.");
  }
  try {
    const { data, error } = await db.from("lists").delete().eq("id",listId).select("id");
    if (error || data?.length !== 1 || data[0].id !== listId)
      throw new Error("List deletion not confirmed");
  } catch {
    throw new ApiError(500, "Les photos ont été supprimées, mais la suppression de la liste n’a pas pu être confirmée. Réessayez de supprimer la liste.");
  }
  return NextResponse.json({ok:true,removedPhotos});
});
