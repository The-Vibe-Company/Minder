import {NextResponse} from 'next/server';

import {route,session,check,membership,uuid,ApiError} from '@/lib/api';
export const DELETE=route(async(_,ctx)=>{const {id}=await ctx.params;uuid.parse(id);const {db,user}=await session();const {data,error}=await db.from('invites').select('list_id').eq('id',id).single();check(error);if(!data)throw new ApiError(404,'Invitation introuvable.');await membership(db,data.list_id,user.id,true);check((await db.from('invites').update({revoked_at:new Date().toISOString()}).eq('id',id)).error);return NextResponse.json({ok:true});});
