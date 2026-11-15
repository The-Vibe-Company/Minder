import { canAutoJoin } from "@/lib/navigation-guard";
import { inviteToken, joinCookieOptions } from "@/lib/invitations";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    if (request.nextUrl.pathname.startsWith("/lists")) {
      const login = new URL("/login", request.url);
      login.searchParams.set(
        "next",
        request.nextUrl.pathname + request.nextUrl.search,
      );
      return NextResponse.redirect(login);
    }
    const response = NextResponse.next();
    const token = inviteToken(request.nextUrl.pathname);
    if (token) response.cookies.set("minder_join", token, joinCookieOptions);
    return response;
  }
  let response = NextResponse.next({ request });
  const db = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user && request.nextUrl.pathname.startsWith("/lists")) {
    const login = new URL("/login", request.url);
    login.searchParams.set(
      "next",
      request.nextUrl.pathname + request.nextUrl.search,
    );
    const redirect = NextResponse.redirect(login);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }
  const token = inviteToken(request.nextUrl.pathname);
  if (token && !user) response.cookies.set("minder_join", token, joinCookieOptions);
  if (token && user && canAutoJoin(request)) {
    const { data, error } = await db.rpc("accept_invite", { p_token: token });
    if (!error && data) {
      const joined = NextResponse.redirect(new URL(`/lists/${data}`, request.url));
      response.cookies.getAll().forEach((cookie) => joined.cookies.set(cookie));
      joined.cookies.set("minder_join", "", { ...joinCookieOptions, maxAge: 0 });
      return joined;
    }
  }
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
