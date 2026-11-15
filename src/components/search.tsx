"use client";
import { useState } from "react";
import { request } from "@/hooks/use-resource";
import { useTask } from "@/hooks/use-task";
import { Item, Photo, Notice, ListNav } from "./ui";
export function Search({ id }: { id: string }) {
  const task = useTask();
  const [results, setResults] = useState<Item[]>();
  return (
    <>
      <h1>Retrouver un objet</h1>
      <ListNav id={id} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          void task.run(async () => {
            const params = new URLSearchParams({
              q: String(form.get("q")),
              mode: String(form.get("mode")),
            });
            const r = await request<{
              items: Item[];
              semanticAvailable: boolean;
            }>(`/api/lists/${id}/search?${params}`);
            setResults(r.items);
            if (!r.semanticAvailable)
              task.setMessage(
                "La recherche par sens est indisponible. Voici les résultats par mots.",
              );
          });
        }}
      >
        <label>
          Que cherchez-vous ?
          <input
            name="q"
            required
            maxLength={500}
            placeholder="Une petite table en bois"
          />
        </label>
        <label>
          Recherche
          <select name="mode" defaultValue="hybrid">
            <option value="hybrid">Mots et sens</option>
            <option value="text">Mots uniquement</option>
            <option value="semantic">Par le sens</option>
          </select>
        </label>
        <button disabled={task.busy}>Rechercher</button>
      </form>
      <Notice>{task.message}</Notice>
      {results?.length === 0 && <p>Aucun objet trouvé.</p>}
      <div className="grid gap-6 sm:grid-cols-2 mt-6">
        {results?.map((item) => (
          <article className="panel" key={item.id}>
            <Photo item={item} />
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </>
  );
}
