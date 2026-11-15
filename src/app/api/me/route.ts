import { NextResponse } from "next/server";
import { z } from "zod";
import { route, session, check } from "@/lib/api";
import { displayName } from "@/lib/profile";
export const GET = route(async () => {
  const { db, user } = await session();
  const {data, error} = await db.from("profiles").select("display_name,onboarded_at").eq("id",user.id).single();
  check(error);
  return NextResponse.json({id:user.id,email:user.email,displayName:data?.display_name ?? null,onboarded:!!data?.onboarded_at});
});
export const PATCH = route(async (request) => {
  const {displayName: name} = z.object({displayName}).parse(await request.json());
  const {db,user} = await session();
  check((await db.from("profiles").update({display_name:name,onboarded_at:new Date().toISOString()}).eq("id",user.id)).error);
  return NextResponse.json({id:user.id,email:user.email,displayName:name,onboarded:true});
});
