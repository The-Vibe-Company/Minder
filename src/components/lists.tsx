"use client";
import Link from "next/link";
import { useResource, request } from "@/hooks/use-resource";
import { useTask } from "@/hooks/use-task";
import { Notice } from "./ui";
export function Lists() {
  const { data, error, refresh } = useResource<{
    lists: {
      id: string;
      title: string;
      role: string;
      itemCount: number;
      remainingCount: number;
    }[];
  }>("/api/lists");
  const task = useTask();
  return (
    <>
      <h1>Mes listes</h1>
      <Notice>{error || task.message}</Notice>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const title = new FormData(form).get("title");
          void task.run(async () => {
            await request("/api/lists", "POST", { title });
            form.reset();
            await refresh();
          });
        }}
      >
        <label>
          Nom de la liste
          <input
            name="title"
            required
            maxLength={120}
            placeholder="La maison de famille"
          />
        </label>
        <button disabled={task.busy}>Créer une liste</button>
      </form>
      {!data && !error && <p>Chargement…</p>}
      <ul className="mt-8 space-y-4">
        {data?.lists.map((l) => (
          <li key={l.id} className="panel">
            <Link href={`/lists/${l.id}`} className="text-xl">
              {l.title}
            </Link>
            <p>
              {l.role === "owner" ? "Propriétaire" : "Invité"} · {l.itemCount}{" "}
              objets · {l.remainingCount} à découvrir
            </p>
          </li>
        ))}
      </ul>
      {data?.lists.length === 0 && (
        <p className="mt-8">
          Créez une liste ou ouvrez une invitation reçue de votre famille.
        </p>
      )}
    </>
  );
}
