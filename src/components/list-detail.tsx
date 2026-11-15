"use client";
import Link from "next/link";
import { request, useResource } from "@/hooks/use-resource";
import { useTask } from "@/hooks/use-task";
import { uploadPhotos } from "@/hooks/upload";
import { Item, Photo, Notice, ListNav } from "./ui";
function Editor({
  item,
  refresh,
}: {
  item: Item;
  refresh: () => Promise<void>;
}) {
  const task = useTask();
  return (
    <article className="panel">
      <Photo item={item} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const description = new FormData(e.currentTarget).get("description");
          void task.run(async () => {
            const result = await request<{ notice?: string }>(
              `/api/items/${item.id}`,
              "PATCH",
              { description },
            );
            task.setMessage(result.notice || "Description enregistrée.");
            await refresh();
          });
        }}
      >
        <label>
          Description
          <textarea
            name="description"
            defaultValue={item.description || ""}
            maxLength={3000}
          />
        </label>
        <button disabled={task.busy}>Enregistrer</button>
      </form>
      <button
        disabled={task.busy}
        onClick={() => {
          if (confirm("Supprimer cet objet et sa photo ?"))
            void task.run(async () => {
              await request(`/api/items/${item.id}`, "DELETE");
              await refresh();
            });
        }}
      >
        Supprimer
      </button>
      <Notice>{task.message}</Notice>
    </article>
  );
}
function Invites({ id }: { id: string }) {
  const { data, error, refresh } = useResource<{
    invites: {
      id: string;
      token: string;
      revoked_at: string | null;
      expires_at: string;
    }[];
  }>(`/api/lists/${id}/invites`);
  const task = useTask();
  return (
    <section className="panel my-6">
      <h2>Inviter la famille</h2>
      <button
        disabled={task.busy}
        onClick={() =>
          void task.run(async () => {
            const r = await request<{ url: string }>(
              `/api/lists/${id}/invites`,
              "POST",
            );
            task.setMessage(r.url);
            await refresh();
          })
        }
      >
        Créer un lien à partager
      </button>
      <Notice>{task.message || error}</Notice>
      <ul>
        {data?.invites.map((i) => (
          <li key={i.id} className="my-3 break-all">
            {i.revoked_at
              ? "Révoquée"
              : new Date(i.expires_at) < new Date()
                ? "Expirée"
                : "Invitation active"}
            {!i.revoked_at && (
              <button
                disabled={task.busy}
                onClick={() =>
                  void task.run(async () => {
                    await request(`/api/invites/${i.id}`, "DELETE");
                    await refresh();
                  })
                }
              >
                Révoquer
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
export function ListDetail({ id }: { id: string }) {
  const { data, error, refresh } = useResource<{
    list: { title: string };
    role: string;
    items: Item[];
    notice?: string;
  }>(`/api/lists/${id}`);
  const task = useTask();
  return (
    <>
      <h1>{data?.list.title || "La liste"}</h1>
      <ListNav id={id} />
      <Notice>{error || task.message || data?.notice}</Notice>
      {data?.role === "owner" ? (
        <>
          <section className="panel">
            <h2>Ajouter des photos</h2>
            <p>
              Photos JPEG, PNG ou WebP. Les descriptions restent modifiables.
            </p>
            <label>
              Choisir des photos
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={task.busy}
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  e.target.value = "";
                  void task.run(async () => {
                    await uploadPhotos(id, files, task.setMessage);
                    await refresh();
                    task.setMessage(
                      "Photos ajoutées. Les descriptions vides peuvent être complétées à la main.",
                    );
                  });
                }}
              />
            </label>
          </section>
          <Invites id={id} />
          <Link href={`/lists/${id}/recap`}>
            Voir le récapitulatif des souhaits →
          </Link>
          <div className="grid gap-6 sm:grid-cols-2 mt-6">
            {data.items.map((item) => (
              <Editor key={item.id} item={item} refresh={refresh} />
            ))}
          </div>
        </>
      ) : (
        data && (
          <>
            <Link href={`/lists/${id}/swipe`}>Commencer à choisir →</Link>
            <div className="grid gap-6 sm:grid-cols-2 mt-6">
              {data.items.map((item) => (
                <article key={item.id} className="panel">
                  <Photo item={item} />
                  <p>{item.description || "Description à venir"}</p>
                </article>
              ))}
            </div>
          </>
        )
      )}
      {data?.items.length === 0 && <p>Aucun objet pour le moment.</p>}
    </>
  );
}
