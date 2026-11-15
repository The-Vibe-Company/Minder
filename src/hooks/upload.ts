import { createClient } from "@/lib/supabase/browser";
import { request } from "./use-resource";

async function jpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Conversion de photo indisponible.");
  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Photo non prise en charge."))),
      "image/jpeg",
      0.85,
    ),
  );
}

export type UploadStep =
  "waiting" | "sending" | "describing" | "done" | "error";
export type UploadUpdate = { step: UploadStep; notice?: string };
export type Uploader = (
  listId: string,
  file: File,
  update: (u: UploadUpdate) => void,
) => Promise<void>;

/** Sends one photo: JPEG conversion, private storage, then item creation and optional description. */
export const uploadPhoto: Uploader = async (listId, file, update) => {
  update({ step: "sending" });
  const blob = await jpeg(file);
  const supabase = createClient();
  const photoPath = `${listId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from("item-photos")
    .upload(photoPath, blob, { contentType: "image/jpeg" });
  if (error) throw new Error("Impossible d’envoyer la photo.");
  update({ step: "describing" });
  const result = await request<{ notice?: string | null }>(
    `/api/lists/${listId}/items`,
    "POST",
    { photoPath },
  );
  update({ step: "done", notice: result.notice ?? undefined });
};

/** Sends photos one after the other; a failed photo does not stop the others. */
export async function uploadPhotos(
  listId: string,
  files: File[],
  update: (index: number, u: UploadUpdate) => void,
  send: Uploader = uploadPhoto,
) {
  for (let i = 0; i < files.length; i++) {
    try {
      await send(listId, files[i], (u) => update(i, u));
    } catch (e) {
      update(i, { step: "error", notice: (e as Error).message });
    }
  }
}
