"use client";
import { useResource } from "@/hooks/use-resource";
import { Item, ListShell, Loading, Notice, Photo, Seat, seatColor } from "./ui";

type Member = {
  id: string;
  display_name: string;
  yes: number;
  no: number;
  remaining: number;
};
const name = (n: string | null | undefined) => n || "Membre";

function People({
  people,
}: {
  people: { id: string; display_name: string | null }[];
}) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {people.map((p) => (
        <li
          key={p.id}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-full py-1 pr-3 pl-1 text-[14px] font-bold"
          style={{
            background: `color-mix(in srgb, ${seatColor(p.id)} 14%, white)`,
          }}
        >
          <Seat id={p.id} name={p.display_name} size={28} />
          {name(p.display_name)}
        </li>
      ))}
    </ul>
  );
}

function ItemRow({
  item,
  tone,
}: {
  item: Item;
  tone: "conflict" | "one" | "none";
}) {
  const yes = item.yes ?? [];
  const no = item.no ?? [];
  return (
    <li
      className={`grid grid-cols-[88px_1fr] gap-3 rounded-[22px] bg-white p-2.5 sm:grid-cols-[120px_1fr] ${
        tone === "conflict"
          ? "shadow-[0_0_0_2.5px_var(--color-citron),0_10px_24px_-14px_rgba(18,26,58,.4)]"
          : "shadow-[0_0_0_1.5px_var(--color-line)]"
      }`}
    >
      <div className="aspect-square overflow-hidden rounded-xl">
        <Photo item={item} />
      </div>
      <div className="min-w-0 py-1 pr-1">
        <div className="flex flex-wrap items-center gap-2">
          {tone === "conflict" && (
            <span className="chip chip-citron">À discuter</span>
          )}
          <span className="chip chip-bottle">{yes.length} oui</span>
          {no.length > 0 && <span className="chip">{no.length} non</span>}
        </div>
        <p className="mt-2 line-clamp-2 text-[15px]">
          {item.description || "Sans description"}
        </p>
        <div className="mt-2.5">
          {yes.length ? (
            <People people={yes} />
          ) : (
            <p className="text-[14px] text-muted">Personne pour l’instant.</p>
          )}
        </div>
      </div>
    </li>
  );
}

export function Recap({ id }: { id: string }) {
  const { data, error } = useResource<{ items: Item[]; members: Member[] }>(
    `/api/lists/${id}/recap`,
  );
  const items = data?.items ?? [];
  const conflicts = items.filter((i) => (i.yes?.length ?? 0) >= 2);
  const single = items.filter((i) => i.yes?.length === 1);
  const nobody = items.filter((i) => !i.yes?.length);
  const groups = [
    {
      key: "conflict" as const,
      title: "À discuter",
      meta: "Plusieurs « je le veux » sur le même objet",
      list: conflicts,
    },
    {
      key: "one" as const,
      title: "Un seul preneur",
      meta: "C’est réglé",
      list: single,
    },
    {
      key: "none" as const,
      title: "Sans preneur",
      meta: "Pour l’instant, personne ne les réclame",
      list: nobody,
    },
  ];
  return (
    <ListShell id={id} active="recap" subtitle="Récapitulatif des souhaits">
      <div className="px-4 pt-6 lg:px-8 lg:pt-10">
        <h1 className="text-[32px] font-extrabold lg:text-[44px]">
          Qui veut quoi
        </h1>
        <Notice tone="error">{error}</Notice>
        {!data && !error && <Loading />}
        {data && (
          <div className="mt-6 grid gap-8 lg:grid-cols-[320px_1fr] lg:items-start">
            <aside className="toile rounded-[28px] p-3 lg:sticky lg:top-28">
              <section
                aria-labelledby="tablee"
                className="rounded-[14px] bg-enamel p-4"
              >
                <h2 id="tablee" className="text-[22px] font-bold">
                  Autour de la table
                </h2>
                <p className="mt-0.5 text-[14px] text-muted">
                  {conflicts.length} objet{conflicts.length > 1 ? "s" : ""} à
                  discuter · {single.length} réglé{single.length > 1 ? "s" : ""}
                </p>
                <ul className="mt-4 grid gap-3">
                  {data.members.map((m) => {
                    const total = m.yes + m.no + m.remaining;
                    const pct = total
                      ? Math.round(((m.yes + m.no) / total) * 100)
                      : 0;
                    return (
                      <li
                        key={m.id}
                        className="grid grid-cols-[44px_1fr] items-center gap-3"
                      >
                        <Seat id={m.id} name={m.display_name} />
                        <div className="min-w-0">
                          <p className="flex items-baseline justify-between gap-2">
                            <span className="truncate font-bold">
                              {name(m.display_name)}
                            </span>
                            <span className="flex-none text-[13px] text-muted">
                              {m.remaining
                                ? `${m.remaining} à voir`
                                : "tout vu"}
                            </span>
                          </p>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-faience">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                background: seatColor(m.id),
                              }}
                            />
                          </div>
                          <p className="mt-1 text-[13px] text-muted">
                            {m.yes} oui · {m.no} non
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </aside>
            <div className="grid gap-9">
              {items.length === 0 && (
                <p className="rounded-[22px] bg-faience px-5 py-8 text-center text-muted">
                  Aucun objet sur la table pour l’instant.
                </p>
              )}
              {groups.map(
                (g) =>
                  g.list.length > 0 && (
                    <section key={g.key} aria-labelledby={`g-${g.key}`}>
                      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3">
                        <h2 id={`g-${g.key}`} className="text-[26px] font-bold">
                          {g.title}{" "}
                          <span className="font-sans text-[18px] text-muted">
                            {g.list.length}
                          </span>
                        </h2>
                        <p className="text-[14px] text-muted">{g.meta}</p>
                      </div>
                      <ul className="grid gap-3 xl:grid-cols-2">
                        {g.list.map((item) => (
                          <ItemRow key={item.id} item={item} tone={g.key} />
                        ))}
                      </ul>
                    </section>
                  ),
              )}
            </div>
          </div>
        )}
      </div>
    </ListShell>
  );
}
