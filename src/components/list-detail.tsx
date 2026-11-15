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
import {
  IconArrow,
  IconCards,
  IconCopy,
  IconMail,
  IconPlus,
  IconShare,
} from "./icons";

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
              if (confirm("Supprimer cet objet et sa photo ?"))
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

/* ---------- Une place de plus à table : le lien et les invitations ---------- */
type ShareLink = { id: string; token: string; url: string; created_at: string };
type EmailInvite = {
  id: string;
  email: string;
  created_at: string;
  accepted_at: string | null;
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
const outline =
  "btn btn-sm bg-transparent text-enamel shadow-[inset_0_0_0_2px_rgba(255,255,255,.6)] hover:bg-white/10";
const textButton =
  "min-h-11 text-[14px] font-bold text-[#d7def5] underline underline-offset-4 hover:text-enamel disabled:opacity-60";

function Invites({ id, title }: { id: string; title: string }) {
  const { data, error, refresh } = useResource<{
    shareLink: ShareLink | null;
    emailInvites: EmailInvite[];
  }>(`/api/lists/${id}/invites`);
  const link = useTask();
  const mail = useTask();
  const [linkNote, setLinkNote] = useState("");
  const [mailNote, setMailNote] = useState<{
    tone: "ok" | "info";
    text: string;
  }>();
  const [copied, setCopied] = useState(false);
  // After a revoke the focused button is gone: hand focus to « Créer le lien ».
  const revoked = useRef(false);
  const createLink = useRef<HTMLButtonElement>(null);
  const canShare = useCanShare();
  const share = data?.shareLink ?? null;
  useEffect(() => {
    if (revoked.current && !share && !link.busy) {
      revoked.current = false;
      createLink.current?.focus();
    }
  }, [share, link.busy]);
  const url = share?.url;
  const pitch = `On se partage les objets de « ${title} ». Dites ce que vous voulez garder :`;
  const invites = data?.emailInvites ?? [];
  const waiting = invites.filter((i) => !i.accepted_at).length;

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      link.setMessage("Copie impossible : sélectionnez le lien à la main.");
    }
  }
  const rotate = (confirmFirst: boolean) => {
    if (
      confirmFirst &&
      !confirm(
        "Régénérer le lien ? L’ancien lien cessera de fonctionner : il faudra renvoyer le nouveau.",
      )
    )
      return;
    setLinkNote("");
    setMailNote(undefined);
    void link.run(async () => {
      await request(`/api/lists/${id}/invites`, "POST");
      await refresh();
      setLinkNote(
        confirmFirst
          ? "Nouveau lien prêt. L’ancien ne fonctionne plus."
          : "Lien prêt : envoyez-le à la famille.",
      );
    });
  };
  const revoke = () => {
    if (!share) return;
    if (
      !confirm(
        "Révoquer le lien ? Plus personne ne pourra rejoindre la liste avec. Les proches déjà à table la gardent.",
      )
    )
      return;
    setLinkNote("");
    setMailNote(undefined);
    void link.run(async () => {
      await request(`/api/invites/${share.id}`, "DELETE");
      await refresh();
      setLinkNote("Lien révoqué. Créez-en un nouveau quand vous voulez.");
      revoked.current = true;
    });
  };

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

      {data && (
        <div className="mt-4">
          <h3 className="text-[12px] font-extrabold tracking-[.06em] text-citron uppercase">
            Lien de partage
          </h3>
          {url ? (
            <div className="mt-2 rounded-[18px] bg-cobalt-deep p-3">
              <label htmlFor="lien" className="text-[14px] text-[#d7def5]">
                Valable tant que vous ne le changez pas. Toute personne qui
                l’ouvre peut rejoindre la liste.
              </label>
              <input
                id="lien"
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="mt-2 mb-2.5 block min-h-11 w-full truncate rounded-[10px] bg-white/10 px-3 text-[16px] text-enamel"
              />
              <button
                className="btn btn-citron btn-sm w-full"
                onClick={() => void copy()}
              >
                <IconCopy />
                {copied ? "Copié !" : "Copier le lien"}
              </button>
              <div
                className={`mt-2 grid gap-2 ${canShare ? "grid-cols-2" : ""}`}
              >
                {canShare && (
                  <button
                    className={outline}
                    onClick={() =>
                      void navigator
                        .share({ title: `${title} · Minder`, text: pitch, url })
                        .catch(() => {})
                    }
                  >
                    <IconShare />
                    Partager
                  </button>
                )}
                <a
                  className={outline}
                  href={`mailto:?subject=${encodeURIComponent(`${title} · Minder`)}&body=${encodeURIComponent(`${pitch} ${url}`)}`}
                >
                  <IconMail />
                  Par e-mail
                </a>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-5">
                <button
                  className={textButton}
                  disabled={link.busy}
                  onClick={() => rotate(true)}
                >
                  Régénérer le lien
                </button>
                <button
                  className={textButton}
                  disabled={link.busy}
                  onClick={revoke}
                >
                  Révoquer le lien
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-2 text-[15px] text-[#d7def5]">
                Un seul lien pour toute la liste, sans date limite : chacun le
                rejoint avec son e-mail.
              </p>
              <button
                ref={createLink}
                className="btn btn-light btn-sm mt-3 w-full"
                disabled={link.busy}
                onClick={() => rotate(false)}
              >
                {link.busy ? "Un instant…" : "Créer le lien de partage"}
              </button>
            </>
          )}
          <Notice tone="error">{link.message}</Notice>
          {!link.message && linkNote && <Notice tone="ok">{linkNote}</Notice>}

          <form
            className="mt-5 border-t border-white/20 pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const email = String(
                new FormData(form).get("email") || "",
              ).trim();
              if (!email) return;
              setMailNote(undefined);
              setLinkNote("");
              void mail.run(async () => {
                const r = await request<{ emailSent: boolean }>(
                  `/api/lists/${id}/email-invites`,
                  "POST",
                  { email },
                );
                form.reset();
                await refresh();
                setMailNote(
                  r.emailSent
                    ? {
                        tone: "ok",
                        text: `Invitation envoyée à ${email}. Le lien reçu l’amène droit dans la liste.`,
                      }
                    : {
                        tone: "info",
                        text: "Invitation enregistrée : elle verra la liste en se connectant avec cette adresse. Envoyez-lui aussi le lien.",
                      },
                );
              });
            }}
          >
            <h3 className="text-[12px] font-extrabold tracking-[.06em] text-citron uppercase">
              Inviter par e-mail
            </h3>
            <label
              htmlFor="invite-email"
              className="mt-1 block text-[14px] text-[#d7def5]"
            >
              Adresse d’un proche
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="invite-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="off"
                required
                maxLength={254}
                placeholder="prenom@exemple.fr"
                className="field min-h-11 min-w-0 flex-1 rounded-[10px] border-0 px-3"
              />
              <button
                className="btn btn-light btn-sm flex-none"
                disabled={mail.busy}
              >
                {mail.busy ? "Envoi…" : "Inviter"}
              </button>
            </div>
          </form>
          <Notice tone="error">{mail.message}</Notice>
          {!mail.message && mailNote && (
            <Notice tone={mailNote.tone}>{mailNote.text}</Notice>
          )}
          {invites.length > 0 && (
            <>
              <h4 className="mt-4 text-[14px] font-bold text-[#d7def5]">
                {plural(
                  invites.length,
                  "personne invitée",
                  "personnes invitées",
                )}
                {waiting ? ` · ${waiting} en attente` : ""}
              </h4>
              <ul className="mt-1">
                {invites.map((i) => (
                  <li
                    key={i.id}
                    className="grid min-h-12 grid-cols-[1fr_auto] items-center gap-x-2.5 gap-y-1 border-t border-white/20 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block text-[14px] font-bold [overflow-wrap:anywhere]">
                        {i.email}
                      </span>
                      <span
                        className={`chip mt-1 ${i.accepted_at ? "chip-bottle" : "chip-citron"}`}
                      >
                        {i.accepted_at ? "a rejoint" : "en attente"}
                      </span>
                    </span>
                    {!i.accepted_at && (
                      <button
                        className="btn btn-sm bg-white/12 text-[13px] text-enamel hover:bg-white/22"
                        disabled={mail.busy}
                        aria-label={`Annuler l’invitation de ${i.email}`}
                        onClick={() => {
                          setMailNote(undefined);
                          setLinkNote("");
                          void mail.run(async () => {
                            await request(
                              `/api/lists/${id}/email-invites/${i.id}`,
                              "DELETE",
                            );
                            await refresh();
                            setMailNote({
                              tone: "info",
                              text: `Invitation de ${i.email} annulée.`,
                            });
                            document.getElementById("invite-email")?.focus();
                          });
                        }}
                      >
                        Annuler
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
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
                      : "Les photos arrivent bientôt : revenez dans un moment."}
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
