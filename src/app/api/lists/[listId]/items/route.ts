import { NextResponse } from "next/server";
import { z } from "zod";
import { route, session, check, membership, signed, ApiError } from "@/lib/api";
import { describeImage, embed, EMBEDDING_MODEL } from "@/lib/ai";
export const maxDuration = 180;
export const POST = route(async (request, ctx) => {
  const { listId } = await ctx.params;
  const { db, user } = await session();
  await membership(db, listId, user.id, true);
  const { photoPath } = z
    .object({ photoPath: z.string().max(200) })
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
    .insert({ list_id: listId, photo_path: photoPath })
    .select()
    .single();
  check(created.error);
  const item = created.data!;
  const { data: url } = await db.storage
    .from("item-photos")
    .createSignedUrl(photoPath, 300);
  const description = url ? await describeImage(url.signedUrl) : null;
  const embedding = description ? await embed(description, "document") : null;
  let enrichmentSaved = false;
  if (description) {
    const updated = await db
      .from("items")
      .update({
        description,
        description_auto: description,
        embedding,
        embedding_model: embedding ? EMBEDDING_MODEL : null,
      })
      .eq("id", item.id)
      .select()
      .single();
    if (!updated.error && updated.data) {
      Object.assign(item, updated.data);
      enrichmentSaved = true;
    }
  }
  return NextResponse.json(
    {
      item: (await signed(db, [item]))[0],
      notice: !enrichmentSaved
        ? "La description automatique est indisponible. Vous pouvez décrire l’objet vous-même."
        : !embedding
          ? "Recherche sémantique indisponible pour cet objet."
          : null,
    },
    { status: 201 },
  );
});
