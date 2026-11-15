import { NextResponse } from "next/server";
import { route,session,check,signed,uuid,ApiError,membership } from "@/lib/api";
export const POST = route(async (_,ctx) => {
  const {id} = await ctx.params; uuid.parse(id);
  const {db,user} = await session();
  const {data:item,error} = await db.from("items").select("*").eq("id",id).single();
  check(error);
  if (!item) throw new ApiError(404,"Objet introuvable.");
  await membership(db,item.list_id,user.id,item.created_by !== user.id);
  const {data,error: updateError} = await db.from("items").update({status:"published"}).eq("id",id).select().single();
  check(updateError);
  return NextResponse.json({item:(await signed(db,[data!]))[0]});
});
