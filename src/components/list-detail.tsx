"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { request, useResource } from "@/hooks/use-resource";
import { useTask } from "@/hooks/use-task";
import {
  uploadPhotos,
  uploadPhoto,
  type Uploader,
  type UploadStep,
} from "@/hooks/upload";
import {
  Item,
  ListShell,
  Loading,
  Mug,
  Notice,
  Photo,
  SectionHead,
  itemName,
  rememberList,
} from "./ui";
import { IconArrow, IconCards, IconCopy, IconPlus, IconShare } from "./icons";

function plural(n: number, one: string, many: string) {
  return `${n} ${n > 1 ? many : one}`;
}

/* ---------- Un objet, sa description modifiable ---------- */
function Editor({
  item,
  refresh,
}: {
  item: Item;
  refresh: () => Promise<void>;
}) {
  const task = useTask();
  const saved = item.description || "";
  const savedTitle = item.title || "";
  const [text, setText] = useState(saved);
  const [title, setTitle] = useState(savedTitle);
  const [base, setBase] = useState(`${savedTitle}\u0000${saved}`);
  if (base !== `${savedTitle}\u0000${saved}`) {
    // The server copy changed (refresh after a save or an upload): follow it.
    setBase(`${savedTitle}\u0000${saved}`);
    setText(saved);
    setTitle(savedTitle);
  }
  const dirty =
    text.trim() !== saved.trim() || title.trim() !== savedTitle.trim();
  const auto = Boolean(
    item.description &&
    item.description === item.description_auto &&
    text.trim() === saved.trim(),
  );
  const empty = !text.trim();
  const fieldId = `desc-${item.id}`;
  const save = () =>
    task.run(async () => {
      const result = await request<{ notice?: string | null }>(
        `/api/items/${item.id}`,
        "PATCH",
        { title, description: text },
      );
      task.setMessage(result.notice || "Enregistré.");
      await refresh();
    });
  return (
    <li className="grid grid-cols-[104px_1fr] gap-3 rounded-[22px] bg-white p-2.5 shadow-[0_0_0_1.5px_var(--color-line)] sm:grid-cols-1">
      <div className="aspect-square overflow-hidden rounded-xl sm:aspect-[4/3]">
        <Photo item={item} />
      </div>
      <form
        className="min-w-0"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label htmlFor={`title-${item.id}`} className="sr-only">
          Nom de l’objet
        </label>
        <input
          id={`title-${item.id}`}
          className="field mb-2 min-h-11 rounded-xl px-3 font-bold"
          value={title}
          maxLength={120}
          placeholder="Nom de l’objet"
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="mb-1.5 flex min-h-6 items-center gap-2">
          <label htmlFor={fieldId} className="text-[14px] font-extrabold">
            Description
          </label>
          {auto && (
            <span
              className="chip chip-citron"
              title="Écrite automatiquement d’après la photo, pas encore relue"
            >
              auto
            </span>
          )}
        </div>
        <textarea
          id={fieldId}
          className={`field min-h-[112px] rounded-xl sm:min-h-[92px] ${empty ? "border-dashed border-cobalt bg-faience" : ""}`}
          value={text}
          maxLength={3000}
          placeholder="Ajoutez une description"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && dirty) {
              e.preventDefault();
              void save();
            }
          }}
        />
        <div className="mt-2 flex flex-wrap items-center justify-end gap-1">
          <p
            role="status"
            className="mr-auto text-[13px] font-semibold text-muted"
          >
            {task.message}
          </p>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            disabled={task.busy}
            onClick={() => {
              if (confirm("Supprimer cet objet et sa photo ?"))
                void task.run(async () => {
                  await request(`/api/items/${item.id}`, "DELETE");
                  await refresh();
                });
            }}
          >
            Supprimer
          </button>
          <button className="btn btn-sm" disabled={task.busy || !dirty}>
            {task.busy ? "…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </li>
  );
}

/* ---------- En haut de la table : l'envoi des photos ---------- */
type Row = {
  key: number;
  file: File;
  preview: string;
  step: UploadStep;
  notice?: string;
};
const STEP: Record<UploadStep, { label: string; pct: number; chip: string }> = {
  waiting: { label: "en attente", pct: 0, chip: "" },
  sending: { label: "envoi…", pct: 35, chip: "chip-citron" },
  describing: { label: "description…", pct: 75, chip: "chip-citron" },
  done: { label: "ajoutée", pct: 100, chip: "chip-bottle" },
  error: { label: "échec", pct: 100, chip: "chip-alert" },
};

function Upload({
  id,
  refresh,
  send,
}: {
  id: string;
  refresh: () => Promise<void>;
  send: Uploader;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const previews = useRef<string[]>([]);
  useEffect(
    () => () => previews.current.forEach((u) => URL.revokeObjectURL(u)),
    [],
  );
  const [over, setOver] = useState(false);
  const next = useRef(0);
  const running = useRef(false);
  const pending = useRef<Row[]>([]);

  const patch = (key: number, p: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  async function drain() {
    if (running.current) return;
    running.current = true;
    while (pending.current.length) {
      const row = pending.current.shift()!;
      await uploadPhotos(id, [row.file], (_, u) => patch(row.key, u), send);
      await refresh();
    }
    running.current = false;
  }

  function track(url: string) {
    previews.current.push(url);
    return url;
  }

  function add(files: File[]) {
    const fresh = files
      .filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type))
      .map((file) => ({
        key: next.current++,
        file,
        preview: track(URL.createObjectURL(file)),
        step: "waiting" as UploadStep,
      }));
    if (!fresh.length) return;
    setRows((rs) => [...rs, ...fresh]);
    pending.current.push(...fresh);
    void drain();
  }

  function retry(row: Row) {
    patch(row.key, { step: "waiting", notice: undefined });
    pending.current.push(row);
    void drain();
  }

  function clearDone() {
    setRows((rs) => {
      rs.filter((r) => r.step === "done").forEach((r) =>
        URL.revokeObjectURL(r.preview),
      );
      return rs.filter((r) => r.step !== "done");
    });
  }

  const done = rows.filter((r) => r.step === "done").length;
  const failed = rows.filter((r) => r.step === "error").length;
  const busy = rows.some((r) => r.step !== "done" && r.step !== "error");
  const notices = [
    ...new Set(
      rows.filter((r) => r.step === "done" && r.notice).map((r) => r.notice!),
    ),
  ];

  return (
    <section
      aria-labelledby="ajout"
      className="toile rounded-[28px] p-3.5 lg:p-5"
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        add(Array.from(e.dataTransfer.files));
      }}
    >
      <div className="rounded-[14px] bg-enamel p-4 lg:p-6">
        <SectionHead
          title={<span id="ajout">En haut de la table</span>}
          meta={
            rows.length
              ? `${done} sur ${rows.length} ajoutée${done > 1 ? "s" : ""}${failed ? ` · ${failed} à reprendre` : ""}`
              : "Toutes les photos d’un coup, si vous voulez"
          }
        />
        <label
          className={`relative flex min-h-[84px] items-center gap-4 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-citron has-[:focus-visible]:shadow-[0_0_0_6px_var(--color-cobalt-deep)] rounded-2xl border-2 border-dashed border-cobalt p-4 transition-colors hover:bg-[#e3e8f6] ${over ? "bg-[#e3e8f6]" : "bg-faience"}`}
        >
          <span className="grid size-[52px] flex-none place-items-center rounded-full bg-cobalt text-enamel">
            <IconPlus size={26} />
          </span>
          <span>
            <strong className="block text-[17px]">Ajouter des photos</strong>
            <span className="text-[14px] text-muted">
              Plusieurs d’un coup · JPEG, PNG ou WebP
            </span>
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            onChange={(e) => {
              add(Array.from(e.target.files || []));
              e.target.value = "";
            }}
          />
        </label>
        {rows.length > 0 && (
          <ul
            className="mt-4 grid gap-3 lg:grid-cols-2 lg:gap-x-6"
            aria-live="polite"
          >
            {rows.map((r) => {
              const s = STEP[r.step];
              return (
                <li
                  key={r.key}
                  className="grid grid-cols-[52px_1fr_auto] items-center gap-3"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
                  <img
                    src={r.preview}
                    alt=""
                    className="size-[52px] rounded-xl bg-[#ece9e2] object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold">
                      {r.file.name}
                    </p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-faience">
                      <div
                        className={`h-full rounded-full transition-[width] duration-500 ${r.step === "error" ? "bg-alert" : r.step === "done" ? "bg-bottle" : "bg-cobalt"}`}
                        style={{ width: `${s.pct}%` }}
                      />
                    </div>
                    {r.step === "error" && r.notice && (
                      <p className="mt-1 truncate text-[12px] font-semibold text-alert">
                        {r.notice}
                      </p>
                    )}
                  </div>
                  {r.step === "error" ? (
                    <button
                      className="btn btn-sm min-h-11 bg-alert-soft px-3 text-[13px] text-alert hover:bg-[#f7d3cf]"
                      onClick={() => retry(r)}
                    >
                      Réessayer
                    </button>
                  ) : (
                    <span className={`chip ${s.chip}`}>{s.label}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {notices.map((n) => (
          <Notice key={n}>{n}</Notice>
        ))}
        {done > 0 && !busy && (
          <button className="btn btn-quiet btn-sm mt-4" onClick={clearDone}>
            Ranger les photos ajoutées
          </button>
        )}
      </div>
    </section>
  );
}

/* ---------- Une place de plus à table : l'invitation ---------- */
type Invite = {
  id: string;
  token: string;
  revoked_at: string | null;
  expires_at: string;
};
const noop = () => () => {};
function useCanShare() {
  return useSyncExternalStore(
    noop,
    () =>
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );
}
// Same origin as the server's invite links: the public site URL when set.
function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  // On a Vercel preview, stay on the preview, as the server does.
  const preview = process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";
  if (configured && !preview) {
    try {
      return new URL(configured).origin;
    } catch {
      /* fall back to this page's origin */
    }
  }
  return typeof window === "undefined" ? "" : window.location.origin;
}
const dateFr = (d: string) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

function Invites({ id, title }: { id: string; title: string }) {
  const { data, error, refresh } = useResource<{ invites: Invite[] }>(
    `/api/lists/${id}/invites`,
  );
  const task = useTask();
  const [created, setCreated] = useState<{ id: string; url: string }>();
  const [copied, setCopied] = useState(false);
  const canShare = useCanShare();
  const [now] = useState(() => Date.now());
  const active = (i: Invite) =>
    !i.revoked_at && new Date(i.expires_at).getTime() > now;
  const current = data?.invites.find(active);
  const url = current
    ? created?.id === current.id
      ? created.url
      : `${siteOrigin()}/invite/${current.token}`
    : undefined;
  const others = data?.invites.filter((i) => i.id !== current?.id) ?? [];

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      task.setMessage("Copie impossible : sélectionnez le lien à la main.");
    }
  }

  return (
    <section
      aria-labelledby="inviter"
      aria-busy={!data && !error}
      className={`rounded-[28px] bg-cobalt p-5 text-enamel ${!data && !error ? "min-h-[300px]" : ""}`}
    >
      <div className="flex items-center gap-4">
        <svg
          aria-hidden="true"
          viewBox="0 0 74 56"
          className="h-14 w-[74px] flex-none"
        >
          <circle cx="37" cy="28" r="22" fill="#fdfcf8" />
          <circle
            cx="37"
            cy="28"
            r="14"
            fill="none"
            stroke="#2343a6"
            strokeWidth="2"
          />
          <path
            d="M6 8v16M3 8v8M9 8v8M6 24v26"
            stroke="#ffd84a"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M68 8c-5 4-5 14 0 16v26"
            stroke="#ffd84a"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
        <div>
          <h2 id="inviter" className="text-[26px] font-bold">
            Inviter la famille
          </h2>
          <p className="text-[14px] text-[#d7def5]">
            Une place de plus à table.
          </p>
        </div>
      </div>
      <Notice tone="error">{error}</Notice>
      {url ? (
        <div className="mt-4 rounded-[18px] bg-cobalt-deep p-3">
          <label
            htmlFor="lien"
            className="text-[12px] font-extrabold tracking-[.06em] text-citron uppercase"
          >
            Lien actif · jusqu’au {dateFr(current!.expires_at)}
          </label>
          <input
            id="lien"
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1.5 mb-2.5 block min-h-11 w-full truncate rounded-[10px] bg-white/10 px-3 text-[16px] text-enamel"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              className="btn btn-citron btn-sm"
              onClick={() => void copy()}
            >
              <IconCopy />
              {copied ? "Copié !" : "Copier"}
            </button>
            {canShare ? (
              <button
                className="btn btn-sm bg-transparent text-enamel shadow-[inset_0_0_0_2px_rgba(255,255,255,.6)] hover:bg-white/10"
                onClick={() =>
                  void navigator
                    .share({
                      title: `${title} · Minder`,
                      text: `On se partage les objets de « ${title} ». Dites ce que vous voulez garder :`,
                      url,
                    })
                    .catch(() => {})
                }
              >
                <IconShare />
                Partager
              </button>
            ) : (
              <a
                className="btn btn-sm bg-transparent text-enamel shadow-[inset_0_0_0_2px_rgba(255,255,255,.6)] hover:bg-white/10"
                href={`mailto:?subject=${encodeURIComponent(`${title} · Minder`)}&body=${encodeURIComponent(`On se partage les objets de « ${title} ». Dites ce que vous voulez garder : ${url}`)}`}
              >
                <IconShare />
                Par e-mail
              </a>
            )}
          </div>
        </div>
      ) : (
        data && (
          <p className="mt-4 text-[15px] text-[#d7def5]">
            Créez un lien, envoyez-le à la famille : chacun le rejoint avec son
            e-mail.
          </p>
        )
      )}
      <button
        className={`btn btn-sm mt-3 w-full ${url ? "bg-transparent text-enamel shadow-[inset_0_0_0_2px_rgba(255,255,255,.35)] hover:bg-white/10" : "btn-light"}`}
        disabled={task.busy}
        onClick={() =>
          void task.run(async () => {
            const r = await request<{ invite: { id: string }; url: string }>(
              `/api/lists/${id}/invites`,
              "POST",
            );
            setCreated({ id: r.invite.id, url: r.url });
            await refresh();
          })
        }
      >
        {current ? "Créer un nouveau lien" : "Créer un lien à partager"}
      </button>
      <Notice tone="error">{task.message}</Notice>
      {others.length > 0 && (
        <details className="mt-2 group">
          <summary className="flex min-h-11 items-center text-[14px] font-bold text-[#d7def5] hover:text-enamel">
            Anciens liens ({others.length})
          </summary>
          <ul className="mt-1">
            {others.map((i) => (
              <li
                key={i.id}
                className="grid grid-cols-[1fr_auto] items-center gap-2.5 border-t border-white/20 py-2"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-bold">
                    {i.revoked_at
                      ? `Révoqué le ${dateFr(i.revoked_at)}`
                      : active(i)
                        ? `Valable jusqu’au ${dateFr(i.expires_at)}`
                        : `Expiré le ${dateFr(i.expires_at)}`}
                  </span>
                  <span className="block text-[12px] text-[#d7def5]">
                    {i.revoked_at || !active(i)
                      ? "Ne fonctionne plus"
                      : "Fonctionne encore"}
                  </span>
                </span>
                {!i.revoked_at && active(i) && (
                  <button
                    className="btn btn-sm bg-white/12 text-[13px] text-enamel hover:bg-white/22"
                    disabled={task.busy}
                    onClick={() =>
                      void task.run(async () => {
                        await request(`/api/invites/${i.id}`, "DELETE");
                        await refresh();
                      })
                    }
                  >
                    Révoquer
                  </button>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
      {current && (
        <button
          className="mt-1 min-h-11 text-[13px] font-bold text-[#d7def5] underline underline-offset-4 hover:text-enamel"
          disabled={task.busy}
          onClick={() =>
            void task.run(async () => {
              await request(`/api/invites/${current.id}`, "DELETE");
              setCreated(undefined);
              await refresh();
            })
          }
        >
          Révoquer le lien actif
        </button>
      )}
    </section>
  );
}

/* ---------- La page de la liste ---------- */
export function ListDetail({
  id,
  uploader = uploadPhoto,
}: {
  id: string;
  uploader?: Uploader;
}) {
  const { data, error, refresh } = useResource<{
    list: { title: string };
    role: string;
    items: Item[];
    notice?: string;
  }>(`/api/lists/${id}`);
  useEffect(() => {
    if (data) rememberList(id, { title: data.list.title, role: data.role });
  }, [id, data]);
  const owner = data?.role === "owner";
  const count = data?.items.length ?? 0;
  const toReview = data?.items.filter(
    (i) => !i.description || i.description === i.description_auto,
  ).length;

  return (
    <ListShell
      id={id}
      active="objets"
      role={data?.role ?? null}
      title={data?.list.title}
      subtitle={data ? plural(count, "objet", "objets") : undefined}
    >
      <div className="px-4 pt-6 lg:px-8 lg:pt-8">
        <h1 className="sr-only">{data?.list.title || "La liste"}</h1>
        <Notice tone="error">{error}</Notice>
        <Notice>{data?.notice}</Notice>
        {!data && !error && <Loading />}
        {data && owner && (
          <div className="grid gap-7 lg:grid-cols-[1fr_340px] lg:items-start lg:gap-8">
            <Upload id={id} refresh={refresh} send={uploader} />
            <aside className="grid gap-3.5 lg:sticky lg:top-28 lg:col-start-2 lg:row-span-2 lg:row-start-1">
              <Invites id={id} title={data.list.title} />
              <Link
                href={`/lists/${id}/recap`}
                className="flex min-h-16 items-center justify-between gap-3 rounded-[22px] bg-citron px-4 py-3 font-extrabold text-ink transition-[filter] hover:brightness-105"
              >
                <span>
                  Récapitulatif des souhaits
                  <small className="block text-[13px] font-semibold text-[#3b3a2a]">
                    Qui veut quoi, et ce qui se discute
                  </small>
                </span>
                <IconArrow />
              </Link>
            </aside>
            <section aria-labelledby="sur-la-table" className="lg:col-start-1">
              <SectionHead
                title={<span id="sur-la-table">Sur la table</span>}
                meta={
                  count
                    ? `${plural(count, "objet", "objets")}${toReview ? ` · ${toReview} à relire` : ""}`
                    : undefined
                }
              />
              {count === 0 ? (
                <p className="rounded-[22px] bg-faience px-5 py-8 text-center text-muted">
                  Rien sur la table pour l’instant. Commencez par la pièce de
                  votre choix.
                </p>
              ) : (
                <ul className="grid gap-3.5 sm:grid-cols-2">
                  {data.items.map((item) => (
                    <Editor key={item.id} item={item} refresh={refresh} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
        {data && !owner && (
          <>
            <section className="toile rounded-[28px] p-3.5 lg:p-5">
              <div className="flex flex-col items-start gap-4 rounded-[14px] bg-enamel p-5 lg:flex-row lg:items-center lg:justify-between lg:p-7">
                <div>
                  <p className="kicker">À vous de choisir</p>
                  <h2 className="mt-2 text-[28px] font-extrabold lg:text-[34px]">
                    {count
                      ? `${plural(count, "objet attend", "objets attendent")} votre avis`
                      : "La table se met"}
                  </h2>
                  <p className="mt-1 text-muted">
                    {count
                      ? "À droite si vous le voulez, à gauche sinon. On peut toujours revenir en arrière."
                      : "Les photos arrivent bientôt : revenez dans un moment."}
                  </p>
                </div>
                {count > 0 && (
                  <Link
                    href={`/lists/${id}/swipe`}
                    className="btn w-full min-h-14 text-[17px] lg:w-auto"
                  >
                    <IconCards />
                    Commencer à swiper
                  </Link>
                )}
              </div>
            </section>
            {count > 0 ? (
              <section aria-labelledby="sur-la-table" className="mt-8">
                <SectionHead
                  title={<span id="sur-la-table">Sur la table</span>}
                  meta={plural(count, "objet", "objets")}
                />
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {data.items.map((item) => (
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
                        {item.description || "Description à venir"}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <div className="mt-8 text-center">
                <Mug />
              </div>
            )}
          </>
        )}
      </div>
    </ListShell>
  );
}
