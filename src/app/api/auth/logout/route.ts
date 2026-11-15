import {NextResponse} from 'next/server';

import {route,session,check} from '@/lib/api';
export const POST=route(async()=>{const {db}=await session();check((await db.auth.signOut()).error);return NextResponse.json({ok:true});});
