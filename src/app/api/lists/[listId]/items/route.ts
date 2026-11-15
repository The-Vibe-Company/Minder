import { NextResponse } from "next/server";
import { z } from "zod";
import { route, session, check, membership, signed, ApiError } from "@/lib/api";
import { describeImage } from "@/lib/ai";
export const maxDuration = 60;
export const POST = route(async (request, ctx) => {
  const { listId } = await ctx.params;
  const { db, user } = await session();
  await membership(db, listId, user.id, true);
  const { photoPath, title } = z
    .object({ photoPath: z.string().max(200), title: z.string().trim().max(120).optional() })
    .parse(await request.json());
  const pattern = new RegExp(
    `^${listId}/[0-9a-f-]{36}\\.(jpg|jpeg|png|webp|heic|heif)$`,
    "i",
  );
  if (!pattern.test(photoPath))
    throw new ApiError(400, "Chemin de photo invalide.");
  z.string().uuid().parse(photoPath.split("/")[1].split(".")[0]);
  const download = await db.storage.from("item-photos").download(photoPath);
  if (download.error) throw new ApiError(400, "Photo introuvable.");
  const created = await db
    .from("items")
    .insert({ list_id: listId, photo_path: photoPath, title: title || null })
    .select()
    .single();
  check(created.error);
  const item = created.data!;
  const { data: url } = await db.storage
    .from("item-photos")
    .createSignedUrl(photoPath, 300);
  const proposal = url ? await describeImage(url.signedUrl) : null;
  let enrichmentSaved = false;
  if (proposal) {
    const updated = await db
      .from("items")
      .update({
        title: item.title || proposal.title,
        description: proposal.description,
        description_auto: proposal.description,
      })
      .eq("id", item.id)
      .eq("updated_at", item.updated_at)
      .select()
      .maybeSingle();
    if (!updated.error && updated.data) {
      Object.assign(item, updated.data);
      enrichmentSaved = true;
    } else {
      // A manual edit wins over late AI output. Return that current version.
      const current = await db.from("items").select("*").eq("id", item.id).maybeSingle();
      if (current.data) Object.assign(item, current.data);
    }
  }
  return NextResponse.json(
    {
      item: (await signed(db, [item]))[0],
      aiAvailable: enrichmentSaved,
      notice: !enrichmentSaved
        ? "La description automatique est indisponible. Vous pouvez décrire l’objet vous-même."
        : null,
    },
    { status: 201 },
  );
});
