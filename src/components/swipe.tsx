"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { request, useResource } from "@/hooks/use-resource";
import {
  Item,
  ListShell,
  Mug,
  Notice,
  Photo,
  Skeleton,
  buzz,
  itemName,
} from "./ui";
import { IconHeart, IconUndo, IconX } from "./icons";

type Choice = "yes" | "no";
const THRESHOLD = 96;

export function Swipe({ id }: { id: string }) {
  const { data, error, refresh } = useResource<{ items: Item[] }>(
    `/api/lists/${id}/swipe`,
  );
  // Items answered here but maybe not yet gone from the server's batch.
  const [answered, setAnswered] = useState<string[]>([]);
  const [history, setHistory] = useState<{ item: Item; choice: Choice }[]>([]);
  const [message, setMessage] = useState("");
  const [count, setCount] = useState({ yes: 0, no: 0 });
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false, leaving: 0 });
  // After « Annuler », the card comes back from the side it left by.
  const [back, setBack] = useState<{ id: string; from: number } | null>(null);
  const [pop, setPop] = useState(0);
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const busy = useRef(false);

  const queue = (data?.items ?? []).filter((i) => !answered.includes(i.id));
  const item = queue[0];
  const nextItems = queue.slice(1, 3);

  // Keep the stack fed: fetch the next batch when the local one runs low.
  useEffect(() => {
    if (data && data.items.length >= 20 && queue.length <= 3) {
      const t = setTimeout(() => {
        void chain.current.then(refresh);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [data, queue.length, refresh]);

  function vote(choice: Choice) {
    if (!item || busy.current) return;
    busy.current = true;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setDrag((d) => ({ ...d, active: false, leaving: choice === "yes" ? 1 : -1 }));
    setBack(null);
    buzz(choice === "yes" ? 18 : 10);
    if (choice === "yes") setPop((p) => p + 1);
    // The request may fail before the card has left: then nothing is applied.
    const outcome = { applied: false, failed: false };
    setTimeout(
      () => {
        if (outcome.failed) {
          setDrag({ x: 0, y: 0, active: false, leaving: 0 });
          busy.current = false;
          return;
        }
        outcome.applied = true;
        setAnswered((a) => [...a, item.id]);
        setHistory((h) => [...h, { item, choice }]);
        setCount((c) => ({ ...c, [choice]: c[choice] + 1 }));
        setDrag({ x: 0, y: 0, active: false, leaving: 0 });
        setMessage("");
        busy.current = false;
      },
      reduce ? 0 : 280,
    );
    chain.current = chain.current.then(() =>
      request(`/api/items/${item.id}/vote`, "POST", { choice }).catch(
        (e: Error) => {
          outcome.failed = true;
          if (outcome.applied) {
            setAnswered((a) => a.filter((x) => x !== item.id));
            setHistory((h) => h.filter((x) => x.item.id !== item.id));
            setCount((c) => ({ ...c, [choice]: Math.max(0, c[choice] - 1) }));
          }
          setMessage(`${e.message} Votre choix n’a pas été gardé.`);
        },
      ),
    );
  }

  function undo() {
    const last = history[history.length - 1];
    if (!last || busy.current) return;
    setHistory((h) => h.slice(0, -1));
    setAnswered((a) => a.filter((x) => x !== last.item.id));
    setCount((c) => ({ ...c, [last.choice]: Math.max(0, c[last.choice] - 1) }));
    setMessage("");
    setBack({ id: last.item.id, from: last.choice === "yes" ? 1 : -1 });
    chain.current = chain.current.then(() =>
      request(`/api/items/${last.item.id}/vote`, "DELETE").catch((e: Error) =>
        setMessage(e.message),
      ),
    );
    // The item may have left the server batch: put it back on top.
    if (!data?.items.some((i) => i.id === last.item.id))
      void chain.current.then(refresh);
  }

  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keys.current = (e) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight") vote("yes");
      else if (e.key === "ArrowLeft") vote("no");
      else if (e.key === "Backspace" || e.key.toLowerCase() === "z") undo();
    };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keys.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const x = drag.leaving ? drag.leaving * 720 : drag.x;
  const y = drag.leaving ? drag.y + 60 : drag.y;
  const lean = Math.max(-1, Math.min(1, x / THRESHOLD));
  const entering = back && item && back.id === item.id ? back.from : 0;
  const last = history[history.length - 1];
  const done = data && !item;

  return (
    <ListShell
      id={id}
      active="swiper"
      subtitle={
        data
          ? done
            ? "Tout vu"
            : queue.length >= 20
              ? "Encore une bonne pile"
              : `Encore ${queue.length} objet${queue.length > 1 ? "s" : ""}`
          : undefined
      }
    >
      <h1 className="sr-only">Swiper les objets</h1>
      <Notice tone="error">{error}</Notice>
      {!data && !error && (
        <div
          role="status"
          aria-label="On met la table…"
          className="toile pt-5 pb-8 lg:mx-8 lg:mt-8 lg:rounded-[40px] lg:py-10"
        >
          <div className="mx-auto w-full max-w-[380px] rounded-[30px] bg-enamel p-2.5 lg:max-w-[420px]">
            <Skeleton className="aspect-[4/3.4] w-full rounded-[20px]" />
            <Skeleton className="mx-2 mt-4 h-6 w-2/3" />
            <Skeleton className="mx-2 mt-2 mb-2 h-4 w-5/6" />
          </div>
        </div>
      )}
      {item && (
        <section
          aria-label="Objet à choisir"
          className="toile overflow-x-clip pt-5 pb-8 lg:mx-8 lg:mt-8 lg:rounded-[40px] lg:py-10"
        >
          <div className="mx-auto grid max-w-[1000px] items-center justify-items-center gap-6 px-3.5 lg:grid-cols-[1fr_420px_1fr]">
            <div className="hidden lg:flex lg:flex-col lg:items-center lg:gap-3">
              <span className="rounded-full bg-enamel px-3.5 py-1.5 text-[14px] font-extrabold">
                ← Non merci
              </span>
              <button className="token token-no" onClick={() => vote("no")}>
                <IconX size={26} />
                Non merci
              </button>
            </div>
            <div className="relative w-full max-w-[380px] lg:max-w-[420px]">
              {nextItems
                .slice()
                .reverse()
                .map((n, i, arr) => (
                  <div
                    key={n.id}
                    aria-hidden="true"
                    className="absolute inset-0 rounded-[30px] bg-enamel shadow-[0_0_0_2px_var(--color-line)]"
                    style={{
                      transform:
                        i === arr.length - 1
                          ? `rotate(${2 - Math.abs(lean) * 2}deg) translateY(6px)`
                          : "rotate(-4deg) translateY(10px)",
                      transition: "transform 200ms ease-out",
                    }}
                  >
                    {i === arr.length - 1 && (
                      <div className="m-2.5 aspect-[4/3.4] overflow-hidden rounded-[20px] opacity-90">
                        <Photo item={n} />
                      </div>
                    )}
                  </div>
                ))}
              <article
                key={item.id}
                className={`swipe-card relative cursor-grab rounded-[30px] bg-enamel p-2.5 active:cursor-grabbing ${
                  entering > 0 ? "card-back-right" : entering < 0 ? "card-back-left" : ""
                }`}
                data-dragging={drag.active ? "true" : "false"}
                style={{
                  transform: `translate(${x}px, ${y}px) rotate(${x / 16 - (drag.active || x ? 0 : 1)}deg) scale(${drag.active ? 1.02 : 1})`,
                  opacity: drag.leaving ? 0 : 1,
                  boxShadow: drag.active
                    ? "0 1px 0 var(--color-line), 0 30px 40px -16px rgba(18,26,58,.55)"
                    : "0 1px 0 var(--color-line), 0 18px 30px -12px rgba(18,26,58,.45)",
                  transition: drag.active
                    ? "box-shadow 160ms ease-out"
                    : drag.leaving
                      ? "transform 280ms cubic-bezier(.5,0,.9,.6), opacity 280ms ease-in"
                      : "transform 520ms cubic-bezier(.16,1,.3,1), box-shadow 200ms ease-out",
                }}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  start.current = { x: e.clientX, y: e.clientY, t: Date.now() };
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDrag({ x: 0, y: 0, active: true, leaving: 0 });
                }}
                onPointerMove={(e) => {
                  if (!start.current) return;
                  setDrag({
                    x: e.clientX - start.current.x,
                    y: (e.clientY - start.current.y) * 0.3,
                    active: true,
                    leaving: 0,
                  });
                }}
                onPointerUp={(e) => {
                  if (!start.current) return;
                  const dx = e.clientX - start.current.x;
                  const speed =
                    Math.abs(dx) / Math.max(1, Date.now() - start.current.t);
                  start.current = null;
                  if (
                    Math.abs(dx) > THRESHOLD ||
                    (Math.abs(dx) > 40 && speed > 0.6)
                  )
                    vote(dx > 0 ? "yes" : "no");
                  else setDrag({ x: 0, y: 0, active: false, leaving: 0 });
                }}
                onPointerCancel={() => {
                  start.current = null;
                  setDrag({ x: 0, y: 0, active: false, leaving: 0 });
                }}
              >
                <div className="relative aspect-[4/3.4] overflow-hidden rounded-[20px]">
                  <Photo item={item} priority />
                  <span
                    aria-hidden="true"
                    className="stamp left-4 text-bottle"
                    style={{
                      opacity: Math.max(0, lean) ** 0.8,
                      transform: `rotate(-12deg) scale(${1.25 - Math.max(0, lean) * 0.25})`,
                    }}
                  >
                    Je le veux
                  </span>
                  <span
                    aria-hidden="true"
                    className="stamp right-4 text-ink"
                    style={{
                      opacity: Math.max(0, -lean) ** 0.8,
                      transform: `rotate(12deg) scale(${1.25 - Math.max(0, -lean) * 0.25})`,
                    }}
                  >
                    Non merci
                  </span>
                </div>
                <div className="px-2 pt-3.5 pb-2">
                  <h2 className="text-[24px] font-bold">{itemName(item)}</h2>
                  <p className="mt-1 text-[16px] leading-snug text-muted">
                    {item.description ||
                      "Pas encore de description : la photo parle pour lui."}
                  </p>
                </div>
              </article>
              {pop > 0 && (
                <span key={pop} aria-hidden="true" className="heart-pop text-bottle">
                  <IconHeart size={96} />
                </span>
              )}
            </div>
            <div className="hidden lg:flex lg:flex-col lg:items-center lg:gap-3">
              <span className="rounded-full bg-enamel px-3.5 py-1.5 text-[14px] font-extrabold">
                Je le veux →
              </span>
              <button className="token token-yes" onClick={() => vote("yes")}>
                <IconHeart size={26} />
                Je le veux
              </button>
            </div>
          </div>
        </section>
      )}
      {item && (
        <div className="mx-auto mt-5 grid max-w-[420px] grid-cols-[auto_1fr_auto] items-center gap-2 px-5 lg:mt-6 lg:flex lg:max-w-none lg:justify-center">
          <button
            className="token token-no lg:hidden"
            onClick={() => vote("no")}
          >
            <IconX size={26} />
            Non merci
          </button>
          <button
            className="btn btn-quiet btn-sm justify-self-center bg-enamel"
            disabled={!last}
            onClick={undo}
          >
            <IconUndo />
            Annuler
          </button>
          <button
            className="token token-yes lg:hidden"
            onClick={() => vote("yes")}
          >
            <IconHeart size={26} />
            Je le veux
          </button>
        </div>
      )}
      {item && (
        <p className="mt-4 hidden text-center text-[13px] text-muted lg:block">
          Au clavier : flèche gauche ou droite, et Z pour annuler.
        </p>
      )}
      <div className="px-4">
        <Notice tone="error">{message}</Notice>
        {last && item && (
          <p role="status" className="mt-3 text-center text-[14px] text-muted">
            Dernier choix : « {itemName(last.item)} »,{" "}
            {last.choice === "yes" ? "je le veux" : "non merci"}.
          </p>
        )}
      </div>
      {done && (
        <section className="rise mx-auto max-w-[720px] px-4 pt-10 pb-12 text-center lg:pt-16">
          <p className="kicker">Fin de la pile</p>
          <Mug className="mt-4" />
          <h2 className="mt-2 text-[44px] font-extrabold lg:text-[56px]">
            Tout vu.
          </h2>
          <p className="mx-auto mt-2 mb-5 max-w-[30em] text-muted">
            Vous avez fait le tour de la table. D’autres objets arriveront
            peut-être : revenez faire un tour dans quelques jours.
          </p>
          {count.yes + count.no > 0 && (
            <p className="mb-6 flex flex-wrap justify-center gap-2.5">
              <span className="rounded-full bg-faience px-3.5 py-2 text-[14px] font-bold">
                <b className="mr-1 font-display text-[18px]">{count.yes}</b>je
                le veux
              </span>
              <span className="rounded-full bg-faience px-3.5 py-2 text-[14px] font-bold">
                <b className="mr-1 font-display text-[18px]">{count.no}</b>non
                merci
              </span>
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            <Link href={`/lists/${id}`} className="btn">
              Revoir les objets
            </Link>
            {count.yes > 0 && (
              <Link href="/likes" className="btn btn-ghost">
                <IconHeart />
                Voir mes likes
              </Link>
            )}
            {last && (
              <button className="btn btn-ghost" onClick={undo}>
                <IconUndo />
                Annuler le dernier
              </button>
            )}
          </div>
        </section>
      )}
    </ListShell>
  );
}
