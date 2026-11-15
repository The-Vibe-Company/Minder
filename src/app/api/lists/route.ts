import { collectPages } from "@/lib/pagination";
import { NextResponse } from "next/server";
import { z } from "zod";
import { route, session, check, membership } from "@/lib/api";
export const GET = route(async () => {
  const { db, user } = await session();
  await db.rpc("claim_email_invites").then(() => {}, () => {});
  const data = await collectPages((from, to) =>
    db
      .from("lists")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to),
  );
  const lists = await Promise.all(
    (data ?? []).map(async (list) => {
      const role = await membership(db, list.id, user.id);
      const [items, votes] = await Promise.all([
        db
          .from("items")
          .select("id", { count: "exact", head: true })
          .eq("list_id", list.id),
        db
          .from("votes")
          .select("id", { count: "exact", head: true })
          .eq("list_id", list.id)
          .eq("user_id", user.id),
      ]);
      check(items.error);
      check(votes.error);
      return {
        ...list,
        role,
        itemCount: items.count ?? 0,
        remainingCount: Math.max(0, (items.count ?? 0) - (votes.count ?? 0)),
      };
    }),
  );
  return NextResponse.json({ lists });
});
export const POST = route(async (request) => {
  const { db } = await session();
  const input = z
    .object({ title: z.string().trim().min(1).max(120) })
    .parse(await request.json());
  const { data, error } = await db
    .from("lists")
    .insert(input)
    .select()
    .single();
  check(error);
  return NextResponse.json({ list: data }, { status: 201 });
});
