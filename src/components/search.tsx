"use client";
import { useState } from "react";
import { request } from "@/hooks/use-resource";
import { useTask } from "@/hooks/use-task";
import { Item, ListShell, Notice, Photo, itemName } from "./ui";
import { IconSearch } from "./icons";

type Mode = "text" | "semantic";
const MODES: { value: Mode; label: string; hint: string }[] = [
  {
    value: "text",
    label: "Par les mots",
    hint: "Les objets dont le nom ou la description contient vos mots",
  },
  {
    value: "semantic",
    label: "Par le sens",
    hint: "« un truc pour s’asseoir » devrait trouver le fauteuil",
  },
];

export function Search({ id }: { id: string }) {
  const task = useTask();
  const [mode, setMode] = useState<Mode>("text");
  const [results, setResults] = useState<{ q: string; items: Item[] }>();
  const [fallback, setFallback] = useState(false);
  return (
    <ListShell id={id} active="rechercher" subtitle="Retrouver un objet">
      <div className="mx-auto max-w-[920px] px-4 pt-6 lg:px-8 lg:pt-10">
        <h1 className="text-[32px] font-extrabold lg:text-[40px]">
          Retrouver un objet
        </h1>
        <form
          className="mt-5"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            const q = String(
              new FormData(e.currentTarget).get("q") || "",
            ).trim();
            if (!q) return;
            void task.run(async () => {
              const params = new URLSearchParams({ q, mode });
              const r = await request<{
                items: Item[];
                semanticAvailable?: boolean;
              }>(`/api/lists/${id}/search?${params}`);
              setResults({ q, items: r.items });
              // The API searches by words only for now; meaning falls back to words.
              setFallback(mode === "semantic" && r.semanticAvailable !== true);
            });
          }}
        >
          <label htmlFor="q" className="sr-only">
            Que cherchez-vous ?
          </label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <IconSearch className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
              <input
                id="q"
                name="q"
                type="search"
                required
                maxLength={500}
                enterKeyHint="search"
                placeholder="La lampe verte du bureau"
                className="field pl-12"
              />
            </div>
            <button className="btn flex-none" disabled={task.busy}>
              {task.busy ? "…" : "Chercher"}
            </button>
          </div>
          <fieldset className="mt-3">
            <legend className="sr-only">Façon de chercher</legend>
            <div className="inline-flex rounded-full bg-faience p-1">
              {MODES.map((m) => (
                <label
                  key={m.value}
                  className={`flex min-h-11 items-center rounded-full px-4 text-[14px] font-bold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-citron ${
                    mode === m.value
                      ? "bg-ink text-enamel"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={m.value}
                    checked={mode === m.value}
                    onChange={() => setMode(m.value)}
                    className="sr-only"
                  />
                  {m.label}
                </label>
              ))}
            </div>
            <p className="mt-2 text-[14px] text-muted">
              {MODES.find((m) => m.value === mode)!.hint}
            </p>
          </fieldset>
        </form>
        <Notice tone="error">{task.message}</Notice>
        {fallback && (
          <Notice>
            La recherche par le sens n’est pas encore là : voici les résultats
            par mots, c’est déjà pas mal.
          </Notice>
        )}
        <section aria-live="polite" className="mt-6">
          {results && (
            <>
              <h2 className="text-[20px] font-bold">
                {results.items.length
                  ? `${results.items.length} objet${results.items.length > 1 ? "s" : ""} pour « ${results.q} »`
                  : `Rien pour « ${results.q} »`}
              </h2>
              {results.items.length === 0 && (
                <p className="mt-1 text-muted">
                  Essayez un mot plus court : « lampe » plutôt que « lampe de
                  chevet ».
                </p>
              )}
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {results.items.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-[22px] bg-white p-2 shadow-[0_0_0_1.5px_var(--color-line)]"
                  >
                    <div className="aspect-square overflow-hidden rounded-[14px]">
                      <Photo item={item} />
                    </div>
                    <p className="mt-2 truncate px-1 text-[15px] font-bold">
                      {itemName(item)}
                    </p>
                    <p className="line-clamp-2 px-1 pb-1 text-[13px] text-muted">
                      {item.description || "Sans description"}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </ListShell>
  );
}
