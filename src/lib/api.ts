import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const uuid = z.string().uuid();
export type Client = Awaited<ReturnType<typeof createClient>>;
export function route(
  fn: (
    request: Request,
    ctx: { params: Promise<Record<string, string>> },
  ) => Promise<Response>,
) {
  return async (
    request: Request,
    ctx: { params: Promise<Record<string, string>> },
  ) => {
    try {
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
        const origin = request.headers.get("origin");
        if (origin && origin !== new URL(request.url).origin)
          throw new ApiError(403, "Origine de requête refusée.");
      }
      return await fn(request, ctx);
    } catch (error) {
      if (error instanceof ApiError)
        return NextResponse.json(
          { error: error.message },
          { status: error.status },
        );
      if (error instanceof z.ZodError)
        return NextResponse.json(
          {
            error: "Données invalides.",
            issues: error.issues.map((x) => ({
              path: x.path,
              message: x.message,
            })),
          },
          { status: 400 },
        );
      if (error instanceof SyntaxError)
        return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
      return NextResponse.json(
        { error: "Une erreur est survenue. Réessayez plus tard." },
        { status: 500 },
      );
    }
  };
}
export async function session() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
    throw new ApiError(503, "Supabase non configuré.");
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new ApiError(401, "Connectez-vous pour continuer.");
  return { db, user };
}
export function check(error: { message: string } | null) {
  if (error)
    throw new ApiError(
      400,
      "Opération impossible. Vérifiez vos droits et réessayez.",
    );
}
export async function membership(
  db: Client,
  listId: string,
  userId: string,
  owner = false,
) {
  uuid.parse(listId);
  const { data, error } = await db
    .from("list_members")
    .select("role")
    .eq("list_id", listId)
    .eq("user_id", userId)
    .single();
  if (error || !data || (owner && data.role !== "owner"))
    throw new ApiError(403, "Accès refusé.");
  return data.role;
}
export async function signed<T extends { photo_path: string }>(
  db: Client,
  items: T[],
) {
  return Promise.all(
    items.map(async (item) => {
      const { data } = await db.storage
        .from("item-photos")
        .createSignedUrl(item.photo_path, 3600);
      return { ...item, photoUrl: data?.signedUrl ?? null };
    }),
  );
}
export function safeNext(value: unknown) {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !/[\u0000-\u001f]/.test(value)
    ? value
    : "/lists";
}
export function siteOrigin(request: Request) {
  // On a Vercel preview, links (magic link, invites) come back to the preview
  // that was opened, never to the production URL the env may point at.
  if (process.env.VERCEL_ENV === "preview") {
    const origin = new URL(request.url).origin;
    if (origin && origin !== "null") return origin;
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  }
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      throw new ApiError(503, "URL du site invalide.");
    }
  }
  const origin = new URL(request.url).origin;
  if (origin) return origin;
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : origin;
}
