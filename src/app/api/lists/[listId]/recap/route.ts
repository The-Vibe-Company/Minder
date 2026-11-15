import { NextResponse } from "next/server";

import { route, session, check, membership, signed } from "@/lib/api";
export const GET = route(async (_, ctx) => {
  const { listId } = await ctx.params;
  const { db, user } = await session();
  await membership(db, listId, user.id, true);
  const [items, votes, members] = await Promise.all([
    db.from("items").select("*").eq("list_id", listId),
    db.from("votes").select("*").eq("list_id", listId),
    db.from("list_members").select("*").eq("list_id", listId),
  ]);
  check(items.error);
  check(votes.error);
  check(members.error);
  const ids = (members.data ?? []).map((m) => m.user_id);
  const profiles = ids.length
    ? await db.from("profiles").select("*").in("id", ids)
    : { data: [], error: null };
  check(profiles.error);
  const person = (id: string) => ({
    id,
    display_name:
      profiles.data?.find((p) => p.id === id)?.display_name ?? "Membre",
  });
  const result = (await signed(db, items.data ?? []))
    .map((item) => ({
      ...item,
      yes: (votes.data ?? [])
        .filter((v) => v.item_id === item.id && v.choice === "yes")
        .map((v) => person(v.user_id)),
      no: (votes.data ?? [])
        .filter((v) => v.item_id === item.id && v.choice === "no")
        .map((v) => person(v.user_id)),
    }))
    .sort((a, b) => b.yes.length - a.yes.length);
  return NextResponse.json({
    items: result,
    members: ids.map((id) => {
      const own = (votes.data ?? []).filter((v) => v.user_id === id);
      return {
        ...person(id),
        yes: own.filter((v) => v.choice === "yes").length,
        no: own.filter((v) => v.choice === "no").length,
        remaining: (items.data?.length ?? 0) - own.length,
      };
    }),
  });
});
