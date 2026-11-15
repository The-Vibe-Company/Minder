"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { request, useResource } from "@/hooks/use-resource";
import { Item, ListShell, Loading, Mug, Notice, Photo, itemName } from "./ui";
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
  const [drag, setDrag] = useState({ x: 0, active: false, leaving: 0 });
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
    setDrag({ x: 0, active: false, leaving: choice === "yes" ? 1 : -1 });
    // The request may fail before the card has left: then nothing is applied.
    const outcome = { applied: false, failed: false };
    setTimeout(
      () => {
        if (outcome.failed) {
          setDrag({ x: 0, active: false, leaving: 0 });
          busy.current = false;
          return;
        }
        outcome.applied = true;
        setAnswered((a) => [...a, item.id]);
        setHistory((h) => [...h, { item, choice }]);
        setCount((c) => ({ ...c, [choice]: c[choice] + 1 }));
        setDrag({ x: 0, active: false, leaving: 0 });
        setMessage("");
        busy.current = false;
      },
      reduce ? 0 : 220,
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

  const x = drag.leaving ? drag.leaving * 640 : drag.x;
  const lean = Math.max(-1, Math.min(1, x / THRESHOLD));
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
      {!data && !error && <Loading />}
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
                className="swipe-card relative cursor-grab rounded-[30px] bg-enamel p-2.5 shadow-[0_1px_0_var(--color-line),0_18px_30px_-12px_rgba(18,26,58,.45)] active:cursor-grabbing"
                data-dragging={drag.active ? "true" : "false"}
                style={{
                  transform: `translateX(${x}px) rotate(${x / 18 - 1}deg)`,
                  opacity: drag.leaving ? 0 : 1,
                  transition: drag.active
                    ? "none"
                    : "transform 220ms cubic-bezier(.22,1,.36,1), opacity 220ms ease-out",
                }}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  start.current = { x: e.clientX, y: e.clientY, t: Date.now() };
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDrag({ x: 0, active: true, leaving: 0 });
                }}
                onPointerMove={(e) => {
                  if (!start.current) return;
                  setDrag({
                    x: e.clientX - start.current.x,
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
                  else setDrag({ x: 0, active: false, leaving: 0 });
                }}
                onPointerCancel={() => {
                  start.current = null;
                  setDrag({ x: 0, active: false, leaving: 0 });
                }}
              >
                <div className="relative aspect-[4/3.4] overflow-hidden rounded-[20px]">
                  <Photo item={item} priority />
                  <span
                    aria-hidden="true"
                    className="absolute top-3 left-3 rounded-full bg-enamel px-3 py-1.5 text-[14px] font-extrabold text-ink shadow-[inset_0_0_0_2px_var(--color-ink)]"
                    style={{
                      opacity: lean < 0 ? 0.35 + -lean * 0.65 : 0.35,
                      transform: `scale(${1 + Math.max(0, -lean) * 0.12})`,
                    }}
                  >
                    ← Non merci
                  </span>
                  <span
                    aria-hidden="true"
                    className="absolute top-3 right-3 rounded-full bg-bottle px-3 py-1.5 text-[14px] font-extrabold text-white"
                    style={{
                      opacity: lean > 0 ? 0.35 + lean * 0.65 : 0.35,
                      transform: `scale(${1 + Math.max(0, lean) * 0.12})`,
                    }}
                  >
                    Je le veux →
                  </span>
                </div>
                <div className="px-2 pt-3.5 pb-2">
                  <h2 className="text-[24px] font-bold">{itemName(item)}</h2>
                  <p className="mt-1 text-[16px] leading-snug text-muted">
                    {item.description ||
                      "Pas encore de description : la photo parle pour lui."}
                  </p>
                </div>
              </article>
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
          Au clavier : flèche gauche ou droite, et Z pour annuler.
        </p>
      )}
      <div className="px-4">
        <Notice tone="error">{message}</Notice>
        {last && item && (
          <p role="status" className="mt-3 text-center text-[14px] text-muted">
            Dernier choix : « {itemName(last.item)} »,{" "}
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
            peut-être : revenez faire un tour dans quelques jours.
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
