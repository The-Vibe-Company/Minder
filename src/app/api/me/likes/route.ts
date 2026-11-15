import { NextResponse } from "next/server";
import { route, session, signed } from "@/lib/api";
import { collectPages } from "@/lib/pagination";

function chunks<T>(values: T[]): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < values.length; i += 100)
    result.push(values.slice(i, i + 100));
  return result;
}

export const GET = route(async () => {
  const { db, user } = await session();
  const votes = await collectPages((from, to) =>
    db.from("votes").select("item_id,updated_at")
      .eq("user_id", user.id).eq("choice", "yes")
      .order("updated_at", { ascending: false }).order("id").range(from, to),
  );
  const items = (await Promise.all(chunks([...new Set(votes.map(v => v.item_id))]).map(ids =>
    collectPages((from, to) =>
      db.from("items").select("id,title,description,photo_path,list_id")
        .in("id", ids).eq("status", "published").order("id").range(from, to),
    ),
  ))).flat();
  const lists = (await Promise.all(chunks([...new Set(items.map(item => item.list_id))]).map(ids =>
    collectPages((from, to) =>
      db.from("lists").select("id,title").in("id", ids).order("id").range(from, to),
    ),
  ))).flat();
  const itemById = new Map(items.map(item => [item.id, item]));
  const listById = new Map(lists.map(list => [list.id, list]));
  // RLS can remove items or lists after membership changes. Keep vote ordering,
  // not the arbitrary order of the batched item responses.
  const liked = votes.flatMap(vote => {
    const item = itemById.get(vote.item_id);
    const list = item && listById.get(item.list_id);
    return item && list ? [{ ...item, list, voted_at: vote.updated_at }] : [];
  });
  return NextResponse.json({ items: await signed(db, liked) });
});
