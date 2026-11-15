"use client";
import Link from "next/link";
import { useRef } from "react";
import { useResource, request } from "@/hooks/use-resource";
import { useTask } from "@/hooks/use-task";
import { Mug, Notice } from "./ui";
import { IconArrow, IconHeart, IconMail, IconPlus, IconShare } from "./icons";

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

// One list per family event: a few starters for the name field.
const EVENTS = [
  "Déménagement",
  "Achat de la maison",
  "Vide-maison",
  "Succession",
];

export function Lists() {
  const { data, error, refresh } = useResource<{ lists: List[] }>("/api/lists");
  const task = useTask();
  const field = useRef<HTMLInputElement>(null);
  const start = (name?: string) => {
    const input = field.current;
    if (!input) return;
    if (name) input.value = `${name} `;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  };
  const empty = data?.lists.length === 0;
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
      <h2 className="text-[22px] font-bold">Nouvelle liste</h2>
      <p className="mt-1 text-[15px] text-muted">
        Une liste par événement, autant qu’il vous en faut. Vous inviterez les
        proches concernés juste après.
      </p>
      <label htmlFor="title" className="field-label mt-4">
        Nom de la liste
      </label>
      <input
        ref={field}
        id="title"
        className="field"
        name="title"
        required
        maxLength={120}
        placeholder="Déménagement à Rennes"
        aria-describedby="idees"
      />
      <p id="idees" className="mt-3 text-[13px] font-bold text-muted">
        Des idées pour commencer :
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {EVENTS.map((name) => (
          <li key={name}>
            <button
              type="button"
              className="min-h-11 rounded-full bg-faience px-3.5 text-[14px] font-bold text-cobalt-deep transition-colors hover:bg-[#e3e8f6]"
              onClick={() => start(name)}
            >
              {name}
            </button>
          </li>
        ))}
      </ul>
      <button className="btn btn-block mt-4" disabled={task.busy}>
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
        {data && data.lists.length > 0 && (
          <p className="mt-1 text-[15px] text-muted">
            {plural(data.lists.length, "liste", "listes")} · un déménagement,
            une succession, un vide-maison… chacun a la sienne.
          </p>
        )}
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
        {empty && (
          <div className="mt-6 rounded-[28px] bg-faience px-5 py-8 lg:px-8 lg:py-10">
            <Mug />
            <h2 className="mt-4 text-center text-[26px] font-bold">
              Vous n’avez pas encore de liste
            </h2>
            <p className="mx-auto mt-2 max-w-[32em] text-center text-muted">
              Une liste rassemble les objets d’un événement : un déménagement,
              l’achat d’une maison, un vide-maison, une succession… Trois façons
              de vous mettre à table :
            </p>
            <ol className="mx-auto mt-6 grid max-w-[36em] gap-3">
              <li className="flex gap-3 rounded-[18px] bg-white p-4 shadow-[0_0_0_1.5px_var(--color-line)]">
                <span className="grid size-10 flex-none place-items-center rounded-full bg-cobalt text-enamel">
                  <IconPlus size={20} />
                </span>
                <span className="min-w-0">
                  <strong className="block">Créer une liste</strong>
                  <span className="text-[15px] text-muted">
                    Donnez-lui le nom de l’événement, puis invitez la famille.
                  </span>
                  <button
                    type="button"
                    className="mt-1 block min-h-11 font-bold text-cobalt underline underline-offset-4 lg:hidden"
                    onClick={() => start()}
                  >
                    Créer ma première liste
                  </button>
                </span>
              </li>
              <li className="flex gap-3 rounded-[18px] bg-white p-4 shadow-[0_0_0_1.5px_var(--color-line)]">
                <span className="grid size-10 flex-none place-items-center rounded-full bg-citron text-ink">
                  <IconShare size={20} />
                </span>
                <span className="min-w-0">
                  <strong className="block">Ouvrir un lien de partage</strong>
                  <span className="text-[15px] text-muted">
                    Un proche vous a envoyé un lien ? Ouvrez-le : la liste
                    apparaîtra ici.
                  </span>
                </span>
              </li>
              <li className="flex gap-3 rounded-[18px] bg-white p-4 shadow-[0_0_0_1.5px_var(--color-line)]">
                <span className="grid size-10 flex-none place-items-center rounded-full bg-bottle-soft text-[#0f5636]">
                  <IconMail size={20} />
                </span>
                <span className="min-w-0">
                  <strong className="block">Recevoir une invitation</strong>
                  <span className="text-[15px] text-muted">
                    Invité·e par e-mail ? Connectez-vous avec cette adresse : la
                    liste s’ajoute ici toute seule.
                  </span>
                </span>
              </li>
            </ol>
          </div>
        )}
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {data?.lists.map((l, index) => {
            const seen = l.itemCount - l.remainingCount;
            const pct = l.itemCount
              ? Math.round((seen / l.itemCount) * 100)
              : 0;
            return (
              <li
                key={l.id}
                className="rise min-w-0"
                style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
              >
                <Link
                  href={`/lists/${l.id}`}
                  className="group press block h-full rounded-[22px] bg-white p-5 shadow-[0_0_0_1.5px_var(--color-line)] transition-shadow hover:shadow-[0_0_0_2px_var(--color-cobalt)]"
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
        <aside className="grid min-w-0 gap-4 lg:sticky lg:top-24 lg:self-start">
          {create}
          {data && data.lists.length > 0 && (
            <Link
              href="/likes"
              className="press flex min-h-16 items-center gap-3 rounded-[22px] bg-bottle-soft px-4 py-3 text-[#0f5636] transition-[filter] hover:brightness-[1.03]"
            >
              <span className="grid size-10 flex-none place-items-center rounded-full bg-bottle text-white">
                <IconHeart size={20} />
              </span>
              <span className="min-w-0 flex-1 font-extrabold">
                Mes likes
                <small className="block text-[13px] font-semibold">
                  Tout ce que vous avez réclamé, liste par liste
                </small>
              </span>
              <IconArrow />
            </Link>
          )}
        </aside>
      )}
    </div>
  );
}
