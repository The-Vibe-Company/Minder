"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { request } from "@/hooks/use-resource";
import { useTask } from "@/hooks/use-task";
import { Notice, Seat } from "./ui";
import {
  personName,
  retryMe,
  safePath,
  setMe,
  useMe,
  useMeFailed,
  type Me,
} from "./me";

/** Same rule as the API: 1 to 40 characters, no e-mail address. */
export function nameProblem(value: string) {
  const v = value.trim();
  if (!v) return "Un prénom, même court, suffit.";
  if (v.length > 40) return "40 caractères au plus, s’il vous plaît.";
  if (v.includes("@"))
    return "Juste votre prénom, sans adresse e-mail : c’est lui que la famille verra.";
  return "";
}

export function Welcome({ next, change = false }: { next: string; change?: boolean }) {
  const me = useMe();
  const failed = useMeFailed();
  const router = useRouter();
  const task = useTask();
  const target = safePath(next);
  const [name, setName] = useState<string>();
  const [touched, setTouched] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  // Signed out: sign in first, then come back here.
  useEffect(() => {
    if (me === null)
      router.replace(
        `/login?next=${encodeURIComponent(`/welcome?next=${encodeURIComponent(target)}`)}`,
      );
  }, [me, router, target]);
  const known = personName(me?.displayName, "");
  const value = name ?? known;
  const problem = nameProblem(value);
  const shown = touched && problem;
  const save = () =>
    task.run(async () => {
      setTouched(true);
      if (problem) {
        field.current?.focus();
        return;
      }
      const r = await request<Partial<Me>>("/api/me", "PATCH", {
        displayName: value.trim(),
      });
      if (me)
        setMe({
          ...me,
          ...r,
          displayName: r.displayName ?? value.trim(),
          onboarded: true,
        });
      router.replace(target);
      router.refresh();
    });
  return (
    <main
      id="contenu"
      className="toile min-h-[calc(100dvh-65px)] px-4 py-8 lg:py-16"
    >
      <div className="rise mx-auto max-w-[460px] rounded-[28px] bg-enamel p-6 shadow-[0_24px_40px_-24px_rgba(18,26,58,.55)] lg:p-9">
        <div className="flex items-center gap-4">
          <span className="grid size-[68px] flex-none place-items-center">
            <Seat
              id={me?.id ?? "nouveau"}
              name={value.trim() || "?"}
              size={60}
            />
          </span>
          <p className="kicker">{change ? "Votre prénom" : "Bienvenue à table"}</p>
        </div>
        <h1 className="mt-5 text-[32px] font-extrabold lg:text-[36px]">
          Comment vous appelez-vous ?
        </h1>
        <p className="mt-2 text-[17px] text-muted">
          Votre prénom s’affichera à côté de vos choix, pour que la famille
          sache qui veut la soupière.
        </p>
        <form
          className="mt-6"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label htmlFor="prenom" className="field-label">
            Votre prénom
          </label>
          <input
            ref={field}
            id="prenom"
            name="prenom"
            className={`field ${shown ? "border-alert" : ""}`}
            autoComplete="given-name"
            autoCapitalize="words"
            enterKeyHint="go"
            maxLength={60}
            placeholder="Muriel"
            value={value}
            disabled={me === undefined}
            aria-invalid={shown ? true : undefined}
            aria-describedby="prenom-aide"
            onChange={(e) => setName(e.target.value)}
            onBlur={() => value && setTouched(true)}
          />
          <p
            id="prenom-aide"
            className={`mt-2 text-[14px] ${shown ? "font-semibold text-alert" : "text-muted"}`}
          >
            {shown || "Un surnom de famille marche aussi : « Mamie Jeanne », « Tonton Jo »."}
          </p>
          <button
            className="btn btn-block mt-5 min-h-14 text-[17px]"
            disabled={task.busy || me === undefined}
          >
            {task.busy
              ? "Un instant…"
              : change
                ? "Enregistrer mon prénom"
                : value.trim() && !problem
                  ? `C’est moi, ${value.trim()} : on y va`
                  : "On y va"}
          </button>
        </form>
        <Notice tone="error">{task.message}</Notice>
        {failed && me === undefined && (
          <div role="alert" className="rise mt-4 rounded-2xl bg-alert-soft p-4 text-alert">
            <p className="font-semibold">
              Minder ne répond pas pour l’instant. Vérifiez le réseau, puis
              réessayez.
            </p>
            <button className="btn btn-sm mt-3" onClick={retryMe}>
              Réessayer
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
