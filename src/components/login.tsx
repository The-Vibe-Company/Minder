"use client";
import { request } from "@/hooks/use-resource";
import { useTask } from "@/hooks/use-task";
import { Notice } from "./ui";
export function Login({ next }: { next: string }) {
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
      <Notice>{task.message}</Notice>
    </>
  );
}
export function Logout() {
  const task = useTask();
  return (
    <>
      <button
        disabled={task.busy}
        onClick={() =>
          void task.run(async () => {
            await request("/api/auth/logout", "POST");
            window.location.href = "/";
          })
        }
      >
        Déconnexion
      </button>
      <Notice>{task.message}</Notice>
    </>
  );
}
