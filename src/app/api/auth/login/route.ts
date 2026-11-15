import { NextResponse } from "next/server";
import { z } from "zod";
import { route, ApiError, siteOrigin } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/api";
export const POST = route(async (request) => {
  const { email, next } = z
    .object({ email: z.string().email().max(254), next: z.string().optional() })
    .parse(await request.json());
  const db = await createClient();
  const url = `${siteOrigin(request)}/auth/callback?next=${encodeURIComponent(safeNext(next))}`;
  const { error } = await db.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: url },
  });
  if (error)
    throw new ApiError(
      400,
      "Impossible d’envoyer le lien de connexion. Réessayez dans un instant.",
    );
  return NextResponse.json({ ok: true });
});
