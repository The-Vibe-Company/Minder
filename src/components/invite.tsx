"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useResource, request } from "@/hooks/use-resource";
import { useTask } from "@/hooks/use-task";
import { Loading, Mug, Notice } from "./ui";
import { IconMail } from "./icons";

function Table() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 80"
      className="mx-auto h-20 w-[120px]"
    >
      <circle
        cx="60"
        cy="40"
        r="32"
        fill="#fff"
        stroke="#d5dbeb"
        strokeWidth="2"
      />
      <circle
        cx="60"
        cy="40"
        r="20"
        fill="none"
        stroke="#2343a6"
        strokeWidth="2.5"
      />
      <path
        d="M14 12v22M10 12v10M18 12v10M14 34v38"
        stroke="#121a3a"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M106 12c-7 6-7 20 0 24v36"
        stroke="#121a3a"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

// The server joins most signed-in visitors and redirects them to the list.
// Those who still land here (from another site, or after a prefetch) get a
// one-click join; visitors without a session sign in inline first.
export function Invite({ token }: { token: string }) {
  const { data, error, refresh } = useResource<{
    invite: { list_title: string; owner_name: string; expired: boolean } | null;
    signedIn?: boolean;
  }>(`/api/invite/${encodeURIComponent(token)}`);
  const task = useTask();
  const join = useTask();
  const router = useRouter();
  const field = useRef<HTMLInputElement>(null);
  const [sentTo, setSentTo] = useState<string>();
  // The session can end between loading the page and clicking « Rejoindre ».
  const [signedOut, setSignedOut] = useState(false);
  const sentHeading = useRef<HTMLHeadingElement>(null);
  const asked = useRef(false);
  // Keep keyboard focus on what just appeared: the « check your email »
  // heading after sending, the email field after « Changer d’adresse ».
  useEffect(() => {
    if (sentTo) {
      asked.current = true;
      sentHeading.current?.focus();
    } else if (asked.current) field.current?.focus();
  }, [sentTo]);
  useEffect(() => {
    if (signedOut) field.current?.focus();
  }, [signedOut]);
  const next = `/invite/${token}`;
  const valid = data?.invite && !data.invite.expired;
  const host = data?.invite?.owner_name || "Votre famille";
  const listTitle = data?.invite?.list_title ?? "";
  const signedIn = data?.signedIn === true && !signedOut;
  const joinList = () =>
    join.run(async () => {
      let r;
      try {
        r = await request<{ listId: string }>(
          `/api/invite/${encodeURIComponent(token)}`,
          "POST",
        );
      } catch (e) {
        if ((e as Error).message.includes("Connectez")) {
          setSignedOut(true);
          join.setMessage(
            "Votre session a expiré : indiquez votre e-mail pour recevoir un lien.",
          );
          return;
        }
        throw e;
      }
      router.push(`/lists/${r.listId}`);
      router.refresh();
    });
  const send = (email: string) =>
    task.run(async () => {
      await request("/api/auth/login", "POST", { email, next });
      setSentTo(email);
    });
  return (
    <main
      id="contenu"
      className="toile min-h-[calc(100dvh-65px)] px-4 py-8 lg:py-16"
    >
      <div className="rise mx-auto max-w-[480px] rounded-[28px] bg-enamel p-6 text-center shadow-[0_24px_40px_-24px_rgba(18,26,58,.55)] lg:p-9">
        {!data && !error && <Loading label="On cherche votre invitation…" />}
        {valid && sentTo && (
          <div aria-live="polite">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-citron text-ink">
              <IconMail size={30} />
            </span>
            <h1
              ref={sentHeading}
              tabIndex={-1}
              className="mt-5 text-[30px] font-extrabold outline-none lg:text-[34px]"
            >
              Vérifiez votre boîte mail
            </h1>
            <p className="mt-3 text-[17px] text-muted">
              Un lien de connexion vient de partir pour{" "}
              <strong className="text-ink [overflow-wrap:anywhere]">
                {sentTo}
              </strong>
              . Cliquez dessus sur cet appareil : vous arriverez directement
              dans « 
              {listTitle} ».
            </p>
            <p className="mt-3 text-[15px] text-muted">
              Rien reçu après quelques minutes ? Jetez un œil aux indésirables,
              puis renvoyez-le.
            </p>
            <Notice tone="error">{task.message}</Notice>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                className="btn"
                disabled={task.busy}
                onClick={() => void send(sentTo)}
              >
                {task.busy ? "Envoi…" : "Renvoyer le lien"}
              </button>
              <button
                className="btn btn-quiet"
                onClick={() => {
                  setSentTo(undefined);
                  task.setMessage("");
                }}
              >
                Changer d’adresse
              </button>
            </div>
          </div>
        )}
        {valid && !sentTo && (
          <>
            <Table />
            <p className="kicker mt-4">Une place vous attend</p>
            <h1 className="mt-3 text-[30px] font-extrabold lg:text-[36px]">
              {host} vous invite à « {listTitle} »
            </h1>
            <p className="mt-3 text-[17px] text-muted">
              Les objets défilent un par un : vous dites « je le veux » ou « non
              merci ». C’est tout, et c’est déjà beaucoup.
            </p>
            {signedIn ? (
              <>
                <button
                  className="btn btn-block mt-7 min-h-14 py-3 text-[17px] whitespace-normal! [overflow-wrap:anywhere]"
                  disabled={join.busy}
                  onClick={() => void joinList()}
                >
                  {join.busy ? "Un instant…" : `Rejoindre « ${listTitle} »`}
                </button>
                <p className="mt-3 text-[14px] text-muted">
                  Vous êtes déjà connecté·e : un clic et vous êtes à table.
                </p>
              </>
            ) : (
              <>
                <form
                  className="mt-7 text-left"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const email = String(
                      new FormData(e.currentTarget).get("email") || "",
                    ).trim();
                    if (email) void send(email);
                  }}
                >
                  <label htmlFor="email" className="field-label">
                    Votre e-mail
                  </label>
                  <input
                    ref={field}
                    id="email"
                    className="field"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="prenom@exemple.fr"
                    aria-describedby="comment"
                    required
                  />
                  <p id="comment" className="mt-2 text-[14px] text-muted">
                    Pas de mot de passe : on vous envoie un lien de connexion.
                    Cliquez dessus et vous arrivez directement dans la liste.
                  </p>
                  <button
                    className="btn btn-block mt-4 min-h-14 text-[17px]"
                    disabled={task.busy}
                  >
                    {task.busy ? "Envoi…" : "Recevoir mon lien et rejoindre"}
                  </button>
                </form>
                <Notice tone="error">{task.message}</Notice>
              </>
            )}
            <Notice tone="error">{join.message}</Notice>
          </>
        )}
        {error && !data && (
          <>
            <Mug />
            <h1 className="mt-3 text-[30px] font-extrabold">
              Minder ne répond pas
            </h1>
            <p className="mt-3 text-[17px] text-muted">
              Votre invitation est peut-être très bien : c’est la connexion qui
              coince. Vérifiez le réseau, puis réessayez.
            </p>
            <Notice tone="error">{error}</Notice>
            <button className="btn mt-3" onClick={() => void refresh()}>
              Réessayer
            </button>
          </>
        )}
        {data && !valid && (
          <>
            <Mug />
            <h1 className="mt-3 text-[30px] font-extrabold">
              Cette invitation a refroidi
            </h1>
            <p className="mt-3 text-[17px] text-muted">
              Le lien a expiré, a été révoqué ou remplacé par un nouveau, ou
              n’existe pas. Demandez le lien actuel à la personne qui vous l’a
              envoyé.
            </p>
            <Link href="/" className="btn mt-7">
              Retour à l’accueil
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
