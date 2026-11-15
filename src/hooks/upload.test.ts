import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/browser", () => ({ createClient: vi.fn() }));
import { uploadPhotos, type Uploader, type UploadUpdate } from "./upload";

const file = (name: string) => new File(["x"], name, { type: "image/jpeg" });

describe("uploadPhotos", () => {
  it("sends every photo in order and reports each step", async () => {
    const seen: [number, UploadUpdate][] = [];
    const send: Uploader = async (_, f, update) => {
      update({ step: "sending" });
      update({ step: "done", notice: f.name === "b.jpg" ? "note" : undefined });
    };
    await uploadPhotos(
      "l",
      [file("a.jpg"), file("b.jpg")],
      (i, u) => seen.push([i, u]),
      send,
    );
    expect(seen).toEqual([
      [0, { step: "sending" }],
      [0, { step: "done", notice: undefined }],
      [1, { step: "sending" }],
      [1, { step: "done", notice: "note" }],
    ]);
  });

  it("keeps going after a failed photo and reports its error", async () => {
    const seen: [number, UploadUpdate][] = [];
    const send: Uploader = async (_, f, update) => {
      if (f.name === "a.jpg") throw new Error("Impossible d’envoyer la photo.");
      update({ step: "done" });
    };
    await uploadPhotos(
      "l",
      [file("a.jpg"), file("b.jpg")],
      (i, u) => seen.push([i, u]),
      send,
    );
    expect(seen).toEqual([
      [0, { step: "error", notice: "Impossible d’envoyer la photo." }],
      [1, { step: "done" }],
    ]);
  });
});
