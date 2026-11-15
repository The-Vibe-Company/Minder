import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
export async function proxy(request:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key){if(request.nextUrl.pathname.startsWith('/lists')){const login=new URL('/login',request.url);login.searchParams.set('next',request.nextUrl.pathname+request.nextUrl.search);return NextResponse.redirect(login);}return NextResponse.next();}
 let response=NextResponse.next({request});const db=createServerClient(url,key,{cookies:{getAll:()=>request.cookies.getAll(),setAll(values){values.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});values.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
 const {data:{user}}=await db.auth.getUser();
 if(!user&&request.nextUrl.pathname.startsWith('/lists')){const login=new URL('/login',request.url);login.searchParams.set('next',request.nextUrl.pathname+request.nextUrl.search);const redirect=NextResponse.redirect(login);response.cookies.getAll().forEach(cookie=>redirect.cookies.set(cookie));return redirect;}return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']};
