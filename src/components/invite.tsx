"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useResource, request } from "@/hooks/use-resource";
import { useTask } from "@/hooks/use-task";
import { Loading, Mug, Notice } from "./ui";

export function Invite({ token }: { token: string }) {
  const { data, error, refresh } = useResource<{
    invite: { list_title: string; owner_name: string; expired: boolean } | null;
  }>(`/api/invite/${encodeURIComponent(token)}`);
  const task = useTask();
  const router = useRouter();
  const login = `/login?next=${encodeURIComponent(`/invite/${token}`)}`;
  const valid = data?.invite && !data.invite.expired;
  const host = data?.invite?.owner_name || "Votre famille";
  return (
    <main
      id="contenu"
      className="toile min-h-[calc(100dvh-65px)] px-4 py-8 lg:py-16"
    >
      <div className="rise mx-auto max-w-[480px] rounded-[28px] bg-enamel p-6 text-center shadow-[0_24px_40px_-24px_rgba(18,26,58,.55)] lg:p-9">
        {!data && !error && <Loading label="On cherche votre invitation…" />}
        {valid && (
          <>
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
            <p className="kicker mt-4">Une place vous attend</p>
            <h1 className="mt-3 text-[30px] font-extrabold lg:text-[36px]">
              {host} vous invite à « {data.invite!.list_title} »
            </h1>
            <p className="mt-3 text-[17px] text-muted">
              Les objets de la maison défilent un par un : vous dites « je le
              veux » ou « non merci ». C’est tout, et c’est déjà beaucoup.
            </p>
            <button
              className="btn btn-block mt-7 min-h-14 text-[17px]"
              disabled={task.busy}
              onClick={() =>
                void task.run(async () => {
                  let r;
                  try {
                    r = await request<{ listId: string }>(
                      `/api/invite/${encodeURIComponent(token)}`,
                      "POST",
                    );
                  } catch (e) {
                    if ((e as Error).message.includes("Connectez")) {
                      router.push(login);
                      return;
                    }
                    throw e;
                  }
                  router.push(`/lists/${r.listId}`);
                  router.refresh();
                })
              }
            >
              {task.busy ? "Un instant…" : "Prendre ma place"}
            </button>
            <p className="mt-4 text-[14px] text-muted">
              Pas encore connecté·e ?{" "}
              <a
                href={login}
                className="font-bold text-cobalt underline underline-offset-4"
              >
                Recevoir un lien de connexion
              </a>
            </p>
            <Notice tone="error">{task.message}</Notice>
          </>
        )}
        {error && !data && (
          <>
            <Mug />
            <h1 className="mt-3 text-[30px] font-extrabold">
              Minder ne répond pas
            </h1>
            <p className="mt-3 text-[17px] text-muted">
              Votre invitation est peut-être très bien : c’est la connexion qui
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
              Le lien a expiré, a été révoqué ou n’existe pas. Demandez-en un
              nouveau à la personne qui vous l’a envoyé.
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
