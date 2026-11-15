"use client";
import Link from "next/link";
import { useResource, request } from "@/hooks/use-resource";
import { useTask } from "@/hooks/use-task";
import { Mug, Notice } from "./ui";
import { IconArrow, IconPlus } from "./icons";

type List = {
  id: string;
  title: string;
  role: string;
  itemCount: number;
  remainingCount: number;
};

function plural(n: number, one: string, many: string) {
  return `${n} ${n > 1 ? many : one}`;
}

export function Lists() {
  const { data, error, refresh } = useResource<{ lists: List[] }>("/api/lists");
  const task = useTask();
  const create = (
    <form
      className="rounded-[22px] bg-white p-5 shadow-[0_0_0_1.5px_var(--color-line)]"
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
      <h2 className="text-[22px] font-bold">Une nouvelle liste</h2>
      <p className="mt-1 text-[15px] text-muted">
        Une maison, une liste. Vous inviterez la famille juste après.
      </p>
      <label htmlFor="title" className="field-label mt-4">
        Nom de la liste
      </label>
      <input
        id="title"
        className="field"
        name="title"
        required
        maxLength={120}
        placeholder="La maison de Rennes"
      />
      <button className="btn btn-block mt-3" disabled={task.busy}>
        <IconPlus />
        {task.busy ? "Création…" : "Créer la liste"}
      </button>
      <Notice tone="error">{task.message}</Notice>
    </form>
  );
  return (
    <div className="mx-auto grid max-w-[1180px] gap-8 px-4 py-8 lg:grid-cols-[1fr_360px] lg:gap-10 lg:px-8 lg:py-12">
      <section aria-labelledby="mes-listes" className="min-w-0">
        <h1
          id="mes-listes"
          className="text-[34px] font-extrabold lg:text-[44px]"
        >
          Mes listes
        </h1>
        <Notice tone="error">{error}</Notice>
        {!data && !error && (
          <ul aria-hidden="true" className="mt-6 grid gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <li
                key={i}
                className="h-[136px] animate-pulse rounded-[22px] bg-faience"
              />
            ))}
          </ul>
        )}
        {data && data.lists.length === 0 && (
          <div className="mt-6 rounded-[28px] bg-faience px-6 py-10 text-center">
            <Mug />
            <h2 className="mt-4 text-[26px] font-bold">La table est vide</h2>
            <p className="mx-auto mt-2 max-w-[30em] text-muted">
              Créez la liste de la maison, ou ouvrez le lien d’invitation qu’on
              vous a envoyé : la liste apparaîtra ici.
            </p>
          </div>
        )}
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {data?.lists.map((l) => {
            const seen = l.itemCount - l.remainingCount;
            const pct = l.itemCount
              ? Math.round((seen / l.itemCount) * 100)
              : 0;
            return (
              <li key={l.id} className="min-w-0">
                <Link
                  href={`/lists/${l.id}`}
                  className="group block h-full rounded-[22px] bg-white p-5 shadow-[0_0_0_1.5px_var(--color-line)] transition-shadow hover:shadow-[0_0_0_2px_var(--color-cobalt)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`chip ${l.role === "owner" ? "chip-citron" : ""}`}
                    >
                      {l.role === "owner" ? "Votre liste" : "Invité·e"}
                    </span>
                    <IconArrow className="text-cobalt transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <h2 className="mt-3 truncate text-[24px] font-bold">
                    {l.title}
                  </h2>
                  <p className="mt-1 text-[15px] text-muted">
                    {plural(l.itemCount, "objet", "objets")} ·{" "}
                    {l.remainingCount === 0
                      ? "tout vu"
                      : `${l.remainingCount} à découvrir`}
                  </p>
                  <div
                    className="mt-4 h-1.5 overflow-hidden rounded-full bg-faience"
                    role="progressbar"
                    aria-label="Objets vus"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-cobalt"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
      {/* Shown with the lists, so it never jumps down when they arrive. */}
      {(data || error) && (
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          {create}
        </aside>
      )}
    </div>
  );
}
