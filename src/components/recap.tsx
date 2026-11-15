"use client";
import { useResource } from "@/hooks/use-resource";
import { Item, Photo, Notice, ListNav } from "./ui";
export function Recap({ id }: { id: string }) {
  const { data, error } = useResource<{
    items: Item[];
    members: {
      id: string;
      display_name: string;
      yes: number;
      no: number;
      remaining: number;
    }[];
  }>(`/api/lists/${id}/recap`);
  return (
    <>
      <h1>Les souhaits de la famille</h1>
      <ListNav id={id} />
      <Notice>{error}</Notice>
      <h2>Avancement</h2>
      <ul>
        {data?.members.map((m) => (
          <li key={m.id}>
            {m.display_name || "Membre"} : {m.yes} oui · {m.no} non ·{" "}
            {m.remaining} à voir
          </li>
        ))}
      </ul>
      <h2 className="mt-8">Objets les plus demandés</h2>
      <div className="grid gap-6 sm:grid-cols-2 mt-6">
        {data?.items.map((item) => (
          <article className="panel" key={item.id}>
            <Photo item={item} />
            <p>{item.description || "Sans description"}</p>
            <p>
              Oui :{" "}
              {item.yes?.map((p) => p.display_name || "Membre").join(", ") ||
                "Personne pour le moment"}
            </p>
            <p>
              Non :{" "}
              {item.no?.map((p) => p.display_name || "Membre").join(", ") ||
                "—"}
            </p>
          </article>
        ))}
      </div>
    </>
  );
}
