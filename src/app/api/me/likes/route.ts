import { NextResponse } from "next/server";
import { route,session,check,signed } from "@/lib/api";
import { collectPages } from "@/lib/pagination";
export const GET = route(async () => {
  const {db,user} = await session();
  const votes = await collectPages((from,to) => db.from("votes").select("*").eq("user_id",user.id).eq("choice","yes").order("updated_at",{ascending:false}).order("id").range(from,to));
  const items = [];
  for (const vote of votes) {
    const {data:item,error} = await db.from("items").select("id,title,description,photo_path,list_id").eq("id",vote.item_id).eq("status","published").maybeSingle();
    check(error);
    if (!item) continue; // RLS removes former memberships and unpublished items.
    const {data:list,error:listError} = await db.from("lists").select("id,title").eq("id",item.list_id).maybeSingle();
    check(listError);
    if (list) items.push({...item,list,voted_at:vote.updated_at});
  }
  return NextResponse.json({items:await signed(db,items)});
});
