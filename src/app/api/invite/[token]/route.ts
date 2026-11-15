import {NextResponse} from 'next/server';
import {z} from 'zod';
import {route,session,check} from '@/lib/api';
import {createClient} from '@/lib/supabase/server';
export const GET=route(async(_,ctx)=>{const {token}=await ctx.params;z.string().regex(/^[a-f0-9]{64}$/).parse(token);const db=await createClient();const {data,error}=await db.rpc('invite_preview',{p_token:token});check(error);return NextResponse.json({invite:data?.[0]??null});});
export const POST=route(async(_,ctx)=>{const {token}=await ctx.params;z.string().regex(/^[a-f0-9]{64}$/).parse(token);const {db}=await session();const {data,error}=await db.rpc('accept_invite',{p_token:token});check(error);return NextResponse.json({listId:data});});
