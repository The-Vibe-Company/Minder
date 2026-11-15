"use client";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import {
  IconBack,
  IconCards,
  IconGrid,
  IconHeart,
  IconRecap,
  IconSearch,
} from "./icons";

export type Item = {
  id: string;
  title?: string | null;
  description: string | null;
  description_auto?: string | null;
  photoUrl?: string | null;
  status?: "draft" | "published";
  published_at?: string | null;
  yes?: { id: string; display_name: string | null }[];
  no?: { id: string; display_name: string | null }[];
};

/** What to call an object: its title, else the start of its description. */
export function itemName(item: Pick<Item, "title" | "description">) {
  const title = item.title?.trim();
  if (title) return title;
  const text = item.description?.trim();
  if (!text) return "Un objet sans nom";
  const first = text.split(/[.,;:!?]/)[0].trim();
  return first.length > 60 ? `${first.slice(0, 57)}…` : first;
}

/* ---------- Marque ---------- */
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-display text-[22px] font-extrabold tracking-tight ${light ? "text-enamel" : "text-ink"}`}
    >
      <span
        aria-hidden="true"
        className="toile block size-[22px] rounded-[6px] shadow-[inset_0_0_0_2px_var(--color-cobalt)]"
        style={{ backgroundSize: "auto, 11px 11px, 11px 11px" }}
      />
      Minder
    </span>
  );
}

/* ---------- Message d'état ---------- */
export function Notice({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "error" | "ok";
}) {
  if (!children) return null;
  const tones = {
    info: "bg-faience text-ink",
    error: "bg-alert-soft text-alert",
    ok: "bg-bottle-soft text-[#0f5636]",
  };
  return (
    <p
      role="status"
      className={`rise my-4 rounded-2xl px-4 py-3 text-[15px] font-semibold ${tones[tone]}`}
    >
      {children}
    </p>
  );
}

/* ---------- Photo d'objet ---------- */
// Private signed URLs are short lived; unoptimized images avoids sending private URLs to an image optimizer.
export function Photo({
  item,
  className = "",
  priority = false,
}: {
  item: Item;
  className?: string;
  priority?: boolean;
}) {
  return item.photoUrl ? (
    <Image
      unoptimized
      priority={priority}
      width={1600}
      height={1600}
      draggable={false}
      src={item.photoUrl}
      alt={item.title || item.description || "Objet à découvrir"}
      className={`block size-full bg-[#ece9e2] object-contain ${className}`}
    />
  ) : (
    <div
      role="img"
      aria-label="Photo indisponible"
      className={`grid size-full place-items-center bg-[#ece9e2] p-3 text-center text-[13px] font-semibold text-muted ${className}`}
    >
      Photo indisponible
    </div>
  );
}

/* ---------- Couleur d'un proche ---------- */
const SEATS = [
  "#2343a6",
  "#17704a",
  "#a3407a",
  "#b4540b",
  "#5b45b0",
  "#0f6b78",
  "#8a5a14",
];
export function seatColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return SEATS[h % SEATS.length];
}
export function initials(name: string | null | undefined) {
  const n = (name || "?").trim();
  return n.slice(0, 1).toUpperCase() || "?";
}
export function Seat({
  id,
  name,
  size = 44,
}: {
  id: string;
  name: string | null | undefined;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className="plate"
      style={
        {
          "--seat": seatColor(id),
          width: size,
          height: size,
          fontSize: Math.max(12, size * 0.38),
        } as React.CSSProperties
      }
    >
      {initials(name)}
    </span>
  );
}

/* ---------- La liste en cours : titre et rôle mémorisés ---------- */
type ListInfo = { title: string; role: string };
const key = (id: string) => `minder:list:${id}`;
export function rememberList(id: string, info: ListInfo) {
  try {
    const value = JSON.stringify(info);
    if (sessionStorage.getItem(key(id)) !== value) {
      sessionStorage.setItem(key(id), value);
      window.dispatchEvent(new Event("minder:list"));
    }
  } catch {
    /* stockage indisponible : on s'en passe */
  }
}
export function forgetList(id: string) {
  try {
    sessionStorage.removeItem(key(id));
  } catch {
    /* rien à oublier */
  }
}
const noop = () => () => {};
function subscribe(cb: () => void) {
  window.addEventListener("minder:list", cb);
  return () => window.removeEventListener("minder:list", cb);
}
export function useListInfo(id: string): ListInfo | null {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return sessionStorage.getItem(key(id));
      } catch {
        return null;
      }
    },
    () => null,
  );
  return useMemo(() => {
    try {
      return raw ? (JSON.parse(raw) as ListInfo) : null;
    } catch {
      return null;
    }
  }, [raw]);
}

/* ---------- Coquille d'une liste : barre, onglets ---------- */
type Tab = "objets" | "swiper" | "rechercher" | "recap";
export function ListShell({
  id,
  active,
  subtitle,
  title,
  role,
  children,
}: {
  id: string;
  /** The visitor's role when the page already knows it; null while it loads. */
  role?: string | null;
  active: Tab;
  subtitle?: React.ReactNode;
  title?: string;
  children: React.ReactNode;
}) {
  const info = useListInfo(id);
  const hydrated = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  // Tabs appear once the role is known, so the Récap tab never pushes the others.
  const known = role !== undefined ? role !== null : hydrated;
  const owner = (role ?? info?.role) === "owner";
  const tabs: {
    id: Tab;
    label: string;
    href: string;
    icon: React.ReactNode;
  }[] = [
    { id: "objets", label: "Objets", href: `/lists/${id}`, icon: <IconGrid /> },
    {
      id: "swiper",
      label: "Swiper",
      href: `/lists/${id}/swipe`,
      icon: <IconCards />,
    },
    {
      id: "rechercher",
      label: "Rechercher",
      href: `/lists/${id}/search`,
      icon: <IconSearch />,
    },
  ];
  if (owner || active === "recap")
    tabs.push({
      id: "recap",
      label: "Récap",
      href: `/lists/${id}/recap`,
      icon: <IconRecap />,
    });
  const heading = title || info?.title;
  return (
    <>
      <header className="sticky top-0 z-20 bg-cobalt text-enamel">
        <div className="mx-auto flex min-h-16 max-w-[1180px] items-center gap-3 px-4 py-2.5 lg:min-h-[76px] lg:gap-5 lg:px-8">
          <Link
            href="/lists"
            aria-label="Mes listes"
            className="grid size-11 flex-none place-items-center rounded-full bg-white/12 text-enamel transition-colors hover:bg-white/22"
          >
            <IconBack />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[22px] font-bold leading-tight lg:text-[26px]">
              {heading ??
                (role === null ? (
                  <span className="skeleton inline-block h-[22px] w-44 rounded-full bg-white/20 align-middle">
                    <span className="sr-only">Chargement de la liste</span>
                  </span>
                ) : (
                  "La liste"
                ))}
            </p>
            <p className="min-h-[18px] truncate text-[13px] leading-[18px] text-[#d7def5]">
              {subtitle}
            </p>
          </div>
          <nav
            aria-label="Navigation de la liste"
            className={`hidden ${known ? "lg:block" : ""}`}
          >
            <ul className="flex gap-1">
              {tabs.map((t) => (
                <li key={t.id}>
                  <Link
                    href={t.href}
                    aria-current={t.id === active ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-[14px] font-bold whitespace-nowrap transition-colors ${
                      t.id === active
                        ? "bg-enamel text-cobalt-deep"
                        : "text-[#d7def5] hover:bg-white/12 hover:text-enamel"
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <Link
            href="/likes"
            aria-label="Mes likes"
            title="Mes likes"
            className="press grid size-11 flex-none place-items-center rounded-full bg-white/12 text-enamel transition-colors hover:bg-white/22"
          >
            <IconHeart />
          </Link>
        </div>
        <div className="toile-band" aria-hidden="true" />
      </header>
      <main id="contenu" className="mx-auto max-w-[1180px] pb-28 lg:pb-16">
        {children}
      </main>
      <nav
        aria-label="Navigation de la liste"
        hidden={!known}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-enamel/95 px-2 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
      >
        <ul className="flex justify-around">
          {tabs.map((t) => (
            <li key={t.id}>
              <Link
                href={t.href}
                aria-current={t.id === active ? "page" : undefined}
                className={`flex min-h-[52px] min-w-16 flex-col items-center justify-center gap-0.5 rounded-2xl px-3 text-[12px] font-bold transition-colors ${
                  t.id === active
                    ? "bg-ink text-enamel"
                    : "text-muted hover:bg-faience hover:text-ink"
                }`}
              >
                {t.icon}
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

/* ---------- Titre de section ---------- */
export function SectionHead({
  title,
  meta,
  as: As = "h2",
}: {
  title: React.ReactNode;
  meta?: React.ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <As className="m-0 text-[26px] font-bold">{title}</As>
      {meta && <p className="m-0 text-[14px] text-muted">{meta}</p>}
    </div>
  );
}

/* ---------- Le bol de café des états vides ---------- */
export function Mug({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      className={`mx-auto block size-[120px] ${className}`}
    >
      <ellipse cx="58" cy="104" rx="38" ry="5" fill="#d5dbeb" />
      <path
        d="M50 18c-4 6 4 9 0 15M62 16c-4 6 4 9 0 15"
        fill="none"
        stroke="#4c5577"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="28" y="40" width="58" height="60" rx="12" fill="#2343a6" />
      <path
        d="M86 54h6a12 12 0 010 24h-6"
        fill="none"
        stroke="#2343a6"
        strokeWidth="9"
      />
      <circle cx="47" cy="66" r="3.4" fill="#fdfcf8" />
      <circle cx="67" cy="66" r="3.4" fill="#fdfcf8" />
      <circle cx="57" cy="78" r="3.4" fill="#fdfcf8" />
    </svg>
  );
}

export function Loading({ label = "On met la table…" }: { label?: string }) {
  return (
    <p role="status" className="my-10 text-center font-semibold text-muted">
      {label}
    </p>
  );
}

/* ---------- Squelettes : la forme de ce qui arrive ---------- */
export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`skeleton block ${className}`} />;
}
export function CardsSkeleton({
  count = 4,
  label = "On met la table…",
  className = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
}: {
  count?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div role="status" aria-label={label}>
      <ul aria-hidden="true" className={className}>
        {Array.from({ length: count }, (_, i) => (
          <li
            key={i}
            className="rounded-[22px] bg-white p-2 shadow-[0_0_0_1.5px_var(--color-line)]"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="mt-3 h-4 w-3/4" />
            <Skeleton className="mt-2 mb-1 h-3 w-1/2" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Un peu de fête : quelques miettes de faïence ---------- */
const CRUMBS = ["#2343a6", "#ffd84a", "#17704a", "#172d73", "#ffd84a", "#2343a6"];
export function Burst({ count = 12 }: { count?: number }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="crumb"
          style={
            {
              background: CRUMBS[i % CRUMBS.length],
              "--a": `${(360 / count) * i + (i % 2 ? 9 : -9)}deg`,
              "--d": `${-38 - (i % 3) * 14}px`,
              animationDelay: `${(i % 4) * 25}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}

/** A tiny vibration on phones that have one; nothing elsewhere. */
export function buzz(ms = 12) {
  try {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      navigator.vibrate?.(ms);
  } catch {
    /* pas de vibreur : tant pis */
  }
}
