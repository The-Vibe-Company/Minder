"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { request } from "@/hooks/use-resource";
import { useTask } from "@/hooks/use-task";
import { Notice } from "./ui";
import { IconMail } from "./icons";

export function Login({
  next,
  invalidLink,
}: {
  next: string;
  invalidLink?: boolean;
}) {
  const task = useTask();
  const [sentTo, setSentTo] = useState<string>();
  const send = (email: string) =>
    task.run(async () => {
      await request("/api/auth/login", "POST", { email, next });
      setSentTo(email);
    });
  const invited = next.startsWith("/invite/");
  return (
    <main
      id="contenu"
      className="toile min-h-[calc(100dvh-65px)] px-4 py-8 lg:py-16"
    >
      <div className="rise mx-auto max-w-[460px] rounded-[28px] bg-enamel p-6 shadow-[0_24px_40px_-24px_rgba(18,26,58,.55)] lg:p-9">
        {sentTo ? (
          <div aria-live="polite">
            <span className="grid size-16 place-items-center rounded-full bg-citron text-ink">
              <IconMail size={30} />
            </span>
            <h1 className="mt-5 text-[32px] font-extrabold">
              Regardez vos e-mails
            </h1>
            <p className="mt-3 text-[17px] text-muted">
              Un lien de connexion vient de partir pour{" "}
              <strong className="break-all text-ink">{sentTo}</strong>.
              Ouvrez-le sur cet appareil, et vous voilà à table.
            </p>
            <p className="mt-3 text-[15px] text-muted">
              Rien reçu après quelques minutes ? Jetez un œil aux indésirables,
              puis renvoyez-le.
            </p>
            <Notice tone="error">{task.message}</Notice>
            <div className="mt-6 flex flex-wrap gap-3">
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
        ) : (
          <>
            <p className="kicker">
              {invited ? "Une place vous attend" : "Connexion"}
            </p>
            <h1 className="mt-3 text-[34px] font-extrabold">Retrouvons-nous</h1>
            <p className="mt-2 text-[17px] text-muted">
              Pas de mot de passe à retenir : on vous envoie un lien par e-mail.
            </p>
            <Notice tone="error">
              {invalidLink
                ? "Ce lien de connexion est expiré ou a déjà servi. Demandez-en un nouveau ci-dessous."
                : ""}
            </Notice>
            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                const email = String(
                  new FormData(e.currentTarget).get("email") || "",
                ).trim();
                void send(email);
              }}
            >
              <label htmlFor="email" className="field-label">
                Votre e-mail
              </label>
              <input
                id="email"
                className="field"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="prenom@exemple.fr"
                required
              />
              <button className="btn btn-block mt-4" disabled={task.busy}>
                {task.busy ? "Envoi…" : "Recevoir mon lien"}
              </button>
            </form>
            <Notice tone="error">{task.message}</Notice>
          </>
        )}
      </div>
    </main>
  );
}

export function Logout() {
  const router = useRouter();
  const task = useTask();
  return (
    <>
      <button
        className="btn btn-quiet btn-sm"
        disabled={task.busy}
        onClick={() =>
          void task.run(async () => {
            await request("/api/auth/logout", "POST");
            router.push("/");
            router.refresh();
          })
        }
      >
        Déconnexion
      </button>
      {task.message && (
        <span role="status" className="sr-only">
          {task.message}
        </span>
      )}
    </>
  );
}
