"use client";
import { useRouter } from "next/navigation";
import { request } from "@/hooks/use-resource";
import { useTask } from "@/hooks/use-task";
import { Notice } from "./ui";
export function Login({
  next,
  invalidLink,
}: {
  next: string;
  invalidLink?: boolean;
}) {
  const task = useTask();
  return (
    <>
      <h1>Retrouvons-nous</h1>
      <p>Un lien par e-mail, sans mot de passe.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const email = new FormData(e.currentTarget).get("email");
          void task.run(async () => {
            await request("/api/auth/login", "POST", { email, next });
            task.setMessage("Vérifiez votre boîte mail pour vous connecter.");
          });
        }}
      >
        <label>
          Votre e-mail
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <button disabled={task.busy}>Recevoir mon lien</button>
      </form>
      <Notice>
        {task.message ||
          (invalidLink
            ? "Ce lien est invalide ou expiré. Demandez un nouveau lien."
            : "")}
      </Notice>
    </>
  );
}
export function Logout() {
  const router = useRouter();
  const task = useTask();
  return (
    <>
      <button
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
      <Notice>{task.message}</Notice>
    </>
  );
}
