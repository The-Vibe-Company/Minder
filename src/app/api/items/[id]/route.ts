import {NextResponse} from 'next/server';
import {z} from 'zod';
import {route,session,check,membership,signed,uuid,ApiError} from '@/lib/api';
import {embed,EMBEDDING_MODEL} from '@/lib/ai';
export const maxDuration=120;
async function owned(ctx:{params:Promise<Record<string,string>>}){const {id}=await ctx.params;uuid.parse(id);const {db,user}=await session();const {data,error}=await db.from('items').select('*').eq('id',id).single();check(error);if(!data)throw new ApiError(404,'Objet introuvable.');await membership(db,data.list_id,user.id,true);return {db,item:data};}
export const PATCH=route(async(request,ctx)=>{const {db,item}=await owned(ctx);const {description}=z.object({description:z.string().trim().max(3000)}).parse(await request.json());const embedding=await embed(description,'document');const {data,error}=await db.from('items').update({description,embedding,embedding_model:embedding?EMBEDDING_MODEL:null}).eq('id',item.id).select().single();check(error);return NextResponse.json({item:(await signed(db,[data!]))[0],notice:!embedding?'Description enregistrée ; recherche textuelle disponible.':null});});
export const DELETE=route(async(_,ctx)=>{const {db,item}=await owned(ctx);check((await db.storage.from('item-photos').remove([item.photo_path])).error);check((await db.from('items').delete().eq('id',item.id)).error);return NextResponse.json({ok:true});});
