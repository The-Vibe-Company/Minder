import {NextResponse} from 'next/server';
import type {EmailOtpType} from '@supabase/supabase-js';
import {createClient} from '@/lib/supabase/server';
import {safeNext} from '@/lib/api';
export async function GET(request:Request){const url=new URL(request.url);const next=safeNext(url.searchParams.get('next'));try{const db=await createClient();const code=url.searchParams.get('code'),token_hash=url.searchParams.get('token_hash'),type=url.searchParams.get('type');let error;if(code)({error}=await db.auth.exchangeCodeForSession(code));else if(token_hash&&type&&['signup','invite','magiclink','recovery','email_change','email'].includes(type))({error}=await db.auth.verifyOtp({token_hash,type:type as EmailOtpType}));else return NextResponse.redirect(new URL('/login?error=invalid_link',url.origin));if(!error)return NextResponse.redirect(new URL(next,url.origin));}catch{}return NextResponse.redirect(new URL('/login?error=invalid_link',url.origin));}
