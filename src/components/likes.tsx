"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { request, useResource } from "@/hooks/use-resource";
import { CardsSkeleton, Mug, Notice, Photo, Skeleton, itemName } from "./ui";
import { toast } from "./toast";
import { IconArrow, IconHeart } from "./icons";

export type Like = {
  id: string;
  title: string | null;
  description: string | null;
  photoUrl: string | null;
  list_id: string;
  list: { id: string; title: string };
  voted_at: string;
};

function plural(n: number, one: string, many: string) {
  return `${n} ${n > 1 ? many : one}`;
}

function Head({ children }: { children?: React.ReactNode }) {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="kicker">Vos « je le veux »</p>
          <h1
            id="mes-likes"
            tabIndex={-1}
            className="mt-2 text-[34px] font-extrabold outline-none lg:text-[44px]"
          >
            Mes likes
          </h1>
        </div>
        {children}
      </div>
      <p className="mt-2 max-w-[38em] text-[17px] text-muted">
        Tout ce que vous avez réclamé, liste par liste. Changé d’avis ? Retirez
        l’objet, il retournera sur la table.
      </p>
    </>
  );
}

function Waiting() {
  return (
    <div className="mt-8">
      <Skeleton className="mb-4 h-7 w-56" />
      <CardsSkeleton label="On rassemble vos likes…" />
    </div>
  );
}

export function LikesSkeleton() {
  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 lg:px-8 lg:py-12">
      <Head />
      <Waiting />
    </div>
  );
}

export function Likes() {
  const { data, error, mutate } = useResource<{ items: Like[] }>(
    "/api/me/likes",
  );
  // Cards on their way out: they shrink before the grid closes up.
  const [leaving, setLeaving] = useState<string[]>([]);
  const items = useMemo(() => data?.items ?? [], [data]);
  const groups = useMemo(() => {
    const byList = new Map<string, { list: Like["list"]; items: Like[] }>();
    for (const like of items) {
      const key = like.list?.id ?? like.list_id;
      if (!byList.has(key))
        byList.set(key, {
          list: like.list ?? { id: like.list_id, title: "Une liste" },
          items: [],
        });
      byList.get(key)!.items.push(like);
    }
    return [...byList.values()];
  }, [items]);

  function putBack(like: Like, index: number) {
    mutate((d) => {
      if (d.items.some((i) => i.id === like.id)) return d;
      const copy = [...d.items];
      copy.splice(Math.min(index, copy.length), 0, like);
      return { ...d, items: copy };
    });
  }

  // Remove at once (the DELETE is sent now, so nothing is lost if the page
  // closes); « Annuler » in the toast votes « je le veux » again.
  function remove(like: Like) {
    const index = items.findIndex((i) => i.id === like.id);
    const name = itemName(like);
    // Keyboard focus moves to the next « Retirer », or to the title.
    const all = [...document.querySelectorAll<HTMLButtonElement>("[data-like]")];
    const at = all.findIndex((b) => b.dataset.like === like.id);
    const usable = (b: HTMLButtonElement) => !b.disabled && b.dataset.like !== like.id;
    const next =
      all.slice(at + 1).find(usable) ?? all.slice(0, at).reverse().find(usable);
    (next ?? document.getElementById("mes-likes"))?.focus();
    setLeaving((l) => [...l, like.id]);
    const timer = setTimeout(() => {
      mutate((d) => ({ ...d, items: d.items.filter((i) => i.id !== like.id) }));
      setLeaving((l) => l.filter((x) => x !== like.id));
    }, 220);
    request(`/api/items/${like.id}/vote`, "DELETE").then(
      () =>
        toast({
          text: `« ${name} » retiré de vos likes.`,
          action: {
            label: "Annuler",
            run: () => {
              // Undo before the card has finished leaving: stop it leaving.
              clearTimeout(timer);
              setLeaving((l) => l.filter((x) => x !== like.id));
              putBack(like, index);
              setTimeout(
                () =>
                  document
                    .querySelector<HTMLElement>(`[data-like="${like.id}"]`)
                    ?.focus(),
                60,
              );
              request(`/api/items/${like.id}/vote`, "POST", {
                choice: "yes",
              }).catch((e: Error) => {
                mutate((d) => ({
                  ...d,
                  items: d.items.filter((i) => i.id !== like.id),
                }));
                toast({ tone: "error", text: `${e.message} Le like n’a pas été remis.` });
              });
            },
          },
        }),
      (e: Error) => {
        // A fast failure: the card has not left yet, keep it.
        clearTimeout(timer);
        setLeaving((l) => l.filter((x) => x !== like.id));
        putBack(like, index);
        toast({ tone: "error", text: `${e.message} « ${name} » reste dans vos likes.` });
      },
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 lg:px-8 lg:py-12">
      <Head>
        {data && items.length > 0 && (
          <p className="text-[15px] text-muted">
            {plural(items.length, "objet", "objets")} ·{" "}
            {plural(groups.length, "liste", "listes")}
          </p>
        )}
      </Head>
      <Notice tone="error">{error}</Notice>
      {!data && !error && <Waiting />}
      {data && items.length === 0 && !error && (
        <div className="rise mt-8 rounded-[28px] bg-faience px-5 py-10 text-center lg:py-14">
          <Mug />
          <h2 className="mt-4 text-[26px] font-bold">
            Pas encore de coup de cœur
          </h2>
          <p className="mx-auto mt-2 max-w-[30em] text-muted">
            Swipez un objet vers la droite, ou appuyez sur « Je le veux » : il
            vous attendra ici, rangé avec sa liste.
          </p>
          <Link href="/lists" className="btn mt-6">
            Voir mes listes
            <IconArrow />
          </Link>
        </div>
      )}
      <div className="mt-8 grid gap-10">
        {groups.map(({ list, items: likes }) => (
          <section
            key={list.id}
            aria-labelledby={`liste-${list.id}`}
            className="min-w-0"
          >
            <Link
              href={`/lists/${list.id}`}
              className="group mb-4 flex items-center gap-3 rounded-[18px] border-b-2 border-line pb-3"
            >
              <span className="min-w-0 flex-1">
                <h2
                  id={`liste-${list.id}`}
                  className="truncate text-[24px] font-bold lg:text-[28px]"
                  title={list.title}
                >
                  {list.title}
                </h2>
                <span className="text-[14px] text-muted">
                  {plural(likes.length, "like", "likes")} · ouvrir la liste
                </span>
              </span>
              <span className="grid size-11 flex-none place-items-center rounded-full bg-faience text-cobalt transition-transform group-hover:translate-x-0.5">
                <IconArrow />
              </span>
            </Link>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {likes.map((like) => (
                <li
                  key={like.id}
                  className={`rise flex flex-col rounded-[22px] bg-white p-2 shadow-[0_0_0_1.5px_var(--color-line)] ${leaving.includes(like.id) ? "leaving" : ""}`}
                >
                  <div className="relative aspect-square overflow-hidden rounded-[14px]">
                    <Photo item={like} />
                    <span
                      aria-hidden="true"
                      className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-bottle text-white shadow-[0_0_0_3px_var(--color-enamel)]"
                    >
                      <IconHeart size={16} />
                    </span>
                  </div>
                  <p className="mt-2 truncate px-1 text-[15px] font-bold">
                    {itemName(like)}
                  </p>
                  <p className="line-clamp-2 flex-1 px-1 text-[13px] text-muted">
                    {like.description || "Sans description"}
                  </p>
                  <button
                    className="btn btn-quiet btn-sm mt-2 w-full"
                    data-like={like.id}
                    aria-label={`Retirer « ${itemName(like)} » de mes likes`}
                    disabled={leaving.includes(like.id)}
                    onClick={() => remove(like)}
                  >
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
