"use client";
import { useState } from "react";
import { request } from "@/hooks/use-resource";
import { useTask } from "@/hooks/use-task";
import { Item, ListShell, Notice, Photo, itemName } from "./ui";
import { IconSearch } from "./icons";

export function Search({ id }: { id: string }) {
  const task = useTask();
  const [results, setResults] = useState<{ q: string; items: Item[] }>();
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
              const params = new URLSearchParams({ q });
              const r = await request<{ items: Item[] }>(
                `/api/lists/${id}/search?${params}`,
              );
              setResults({ q, items: r.items });
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
                placeholder="La lampe verte"
                className="field pl-12"
              />
            </div>
            <button className="btn flex-none" disabled={task.busy}>
              {task.busy ? "…" : "Chercher"}
            </button>
          </div>
          <p className="mt-2 text-[14px] text-muted">
            Un mot du nom ou de la description suffit : « lampe », « Quimper »,
            « velours ».
          </p>
        </form>
        <Notice tone="error">{task.message}</Notice>
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
