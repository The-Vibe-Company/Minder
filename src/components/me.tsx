"use client";
// Who is signed in: the first name shown in the header, never the e-mail.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { request } from "@/hooks/use-resource";
import { useTask } from "@/hooks/use-task";
import { Seat } from "./ui";
import { IconHeart } from "./icons";

export type Me = {
  id: string;
  email: string | null;
  displayName: string | null;
  onboarded: boolean;
};

/** A person's name for the screen: never an e-mail address. */
export function personName(name: string | null | undefined, fallback = "Membre") {
  const n = (name || "").trim();
  if (!n) return fallback;
  return n.includes("@") ? fallback : n;
}

/** Same rule as the server's safeNext: a path on this site, nothing else. */
export function safePath(value: string | null | undefined, fallback = "/lists") {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !/[\u0000-\u001f]/.test(value)
    ? value
    : fallback;
}

// One shared request per page view; set again after the first name changes.
let me: Me | null | undefined;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
function load() {
  loading ??= fetch("/api/me")
    .then(async (r) => {
      if (r.status === 401) me = null;
      else if (r.ok) me = (await r.json()) as Me;
      else throw new Error(String(r.status));
    })
    .catch(() => {
      // A network hiccup is not a sign-out: stay « loading », ask again next time.
      loading = null;
    })
    .finally(() => listeners.forEach((l) => l()));
  return loading;
}
export function setMe(value: Me) {
  me = value;
  listeners.forEach((l) => l());
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  void load();
  return () => listeners.delete(cb);
}
/** undefined while loading, null when signed out. */
export function useMe() {
  return useSyncExternalStore(
    subscribe,
    () => me,
    () => undefined,
  );
}

export function UserNav() {
  const user = useMe();
  const path = usePathname();
  const router = useRouter();
  const logout = useTask();
  const menu = useRef<HTMLDetailsElement>(null);
  // Close the menu on a click outside it or on Escape.
  useEffect(() => {
    const close = (e: Event) => {
      const d = menu.current;
      if (!d?.open) return;
      if (e instanceof KeyboardEvent) {
        if (e.key !== "Escape") return;
        d.open = false;
        d.querySelector("summary")?.focus();
      } else if (!d.contains(e.target as Node)) d.open = false;
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  const name = personName(user?.displayName, "Moi");
  const here = path === "/likes";
  return (
    <nav aria-label="Mon compte" className="flex items-center gap-1.5">
      <Link
        href="/likes"
        aria-current={here ? "page" : undefined}
        className={`btn btn-sm gap-1.5 px-3.5 ${here ? "bg-ink text-enamel hover:bg-ink" : "btn-quiet"}`}
      >
        <IconHeart className={here ? "text-enamel" : "text-bottle"} />
        Mes likes
      </Link>
      <details ref={menu} className="group relative">
        <summary
          aria-label={user ? `Mon compte, ${name}` : "Mon compte"}
          className="press flex min-h-11 list-none items-center gap-2 rounded-full py-1 pr-1 pl-1 transition-colors hover:bg-faience sm:pr-3 [&::-webkit-details-marker]:hidden"
        >
          {user ? (
            <Seat id={user.id} name={name} size={32} />
          ) : (
            <span className="skeleton block size-8 rounded-full" />
          )}
          <span className="hidden max-w-[10em] truncate text-[15px] font-bold sm:inline">
            {user ? name : ""}
          </span>
        </summary>
        <div className="pop-in absolute right-0 z-30 mt-2 w-64 rounded-[18px] bg-white p-2 shadow-[0_0_0_1.5px_var(--color-line),0_18px_30px_-14px_rgba(18,26,58,.45)]">
          <p className="px-3 pt-2 pb-2.5 text-[14px] text-muted">
            À table sous le nom de{" "}
            <strong className="text-ink">{name}</strong>
          </p>
          <Link
            href={`/welcome?change=1&next=${encodeURIComponent(path || "/lists")}`}
            className="flex min-h-11 items-center rounded-xl px-3 font-bold hover:bg-faience"
          >
            Changer de prénom
          </Link>
          <Link
            href="/lists"
            className="flex min-h-11 items-center rounded-xl px-3 font-bold hover:bg-faience"
          >
            Mes listes
          </Link>
          <button
            className="flex min-h-11 w-full items-center rounded-xl px-3 text-left font-bold text-alert hover:bg-alert-soft"
            disabled={logout.busy}
            onClick={() =>
              void logout.run(async () => {
                await request("/api/auth/logout", "POST");
                me = null;
                loading = null;
                router.push("/");
                router.refresh();
              })
            }
          >
            {logout.busy ? "À bientôt…" : "Se déconnecter"}
          </button>
          {logout.message && (
            <p role="status" className="px-3 pb-2 text-[13px] text-alert">
              {logout.message}
            </p>
          )}
        </div>
      </details>
    </nav>
  );
}
