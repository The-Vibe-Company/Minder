import type { Profile } from "@/lib/database.types";
import { collectPages } from "@/lib/pagination";
import { NextResponse } from "next/server";

import { route, session, membership, signed, check } from "@/lib/api";
export const GET = route(async (_, ctx) => {
  const { listId } = await ctx.params;
  const { db, user } = await session();
  await membership(db, listId, user.id, true);
  const {data:list,error} = await db.from("lists").select("id,title").eq("id",listId).single();
  check(error);
  const [items, votes, members] = await Promise.all([
    collectPages((from, to) =>
      db
        .from("items")
        .select("*")
        .eq("list_id", listId)
        .eq("status", "published")
        .order("id")
        .range(from, to),
    ),
    collectPages((from, to) =>
      db
        .from("votes")
        .select("*")
        .eq("list_id", listId)
        .order("id")
        .range(from, to),
    ),
    collectPages((from, to) =>
      db
        .from("list_members")
        .select("*")
        .eq("list_id", listId)
        .order("user_id")
        .range(from, to),
    ),
  ]);
  const ids = members.map((m) => m.user_id);
  // Keep IN filters small enough for gateway URL limits as families grow.
  const profiles: Profile[] = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const chunk = ids.slice(offset, offset + 100);
    profiles.push(
      ...(await collectPages((from, to) =>
        db
          .from("profiles")
          .select("*")
          .in("id", chunk)
          .order("id")
          .range(from, to),
      )),
    );
  }
  const person = (id: string) => ({
    id,
    display_name: profiles.find((p) => p.id === id)?.display_name ?? "Membre",
  });
  const result = (await signed(db, items))
    .map((item) => ({
      ...item,
      yes: votes
        .filter((v) => v.item_id === item.id && v.choice === "yes")
        .map((v) => person(v.user_id)),
      no: votes
        .filter((v) => v.item_id === item.id && v.choice === "no")
        .map((v) => person(v.user_id)),
    }))
    .sort((a, b) => b.yes.length - a.yes.length);
  return NextResponse.json({
    list,
    items: result,
    members: ids.map((id) => {
      const own = votes.filter((v) => v.user_id === id && items.some((i) => i.id === v.item_id));
      return {
        ...person(id),
        yes: own.filter((v) => v.choice === "yes").length,
        no: own.filter((v) => v.choice === "no").length,
        remaining: items.length - own.length,
      };
    }),
  });
});
