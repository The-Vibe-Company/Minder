"use client";
import { useResource, request } from "@/hooks/use-resource";
import { useTask } from "@/hooks/use-task";
import { Notice } from "./ui";
export function Invite({ token }: { token: string }) {
  const { data, error } = useResource<{
    invite: { list_title: string; owner_name: string; expired: boolean } | null;
  }>(`/api/invite/${encodeURIComponent(token)}`);
  const task = useTask();
  return (
    <>
      <h1>Une invitation en famille</h1>
      <Notice>{error || task.message}</Notice>
      {data?.invite && !data.invite.expired ? (
        <>
          <p>
            {data.invite.owner_name || "Votre famille"} vous invite à découvrir
            « {data.invite.list_title} ».
          </p>
          <button
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
                    window.location.assign(
                      `/login?next=${encodeURIComponent(`/invite/${token}`)}`,
                    );
                    return;
                  }
                  throw e;
                }
                window.location.href = `/lists/${r.listId}`;
              })
            }
          >
            Rejoindre la liste
          </button>
          <p className="mt-4">
            <a href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}>
              Se connecter pour rejoindre
            </a>
          </p>
        </>
      ) : (
        data && (
          <p>
            Cette invitation est expirée ou introuvable. Demandez un nouveau
            lien à votre famille.
          </p>
        )
      )}
    </>
  );
}
