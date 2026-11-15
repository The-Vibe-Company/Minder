"use client";
// Toasts: one small message at a time at the bottom of the screen, with an
// optional action (« Annuler »). The store lives in the module, so a toast
// fired just before a client navigation is still shown on the next page.
import { useEffect, useRef, useSyncExternalStore } from "react";

export type Toast = {
  id: number;
  text: string;
  tone?: "info" | "error";
  action?: { label: string; run: () => void };
  /** Milliseconds before it leaves on its own. */
  duration?: number;
};

let current: Toast | null = null;
let next = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(t: Omit<Toast, "id">) {
  current = { duration: t.action ? 5000 : 3500, ...t, id: next++ };
  emit();
  return current.id;
}
export function dismissToast(id?: number) {
  if (!current || (id !== undefined && current.id !== id)) return;
  current = null;
  emit();
}
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function Toaster() {
  const t = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
  const paused = useRef(false);
  useEffect(() => {
    if (!t) return;
    let left = t.duration ?? 3500;
    let started = Date.now();
    let timer = setTimeout(() => dismissToast(t.id), left);
    // Hovering or focusing the toast stops the clock, so « Annuler » stays reachable.
    const pause = () => {
      if (paused.current) return;
      paused.current = true;
      clearTimeout(timer);
      left -= Date.now() - started;
    };
    const resume = () => {
      if (!paused.current) return;
      paused.current = false;
      started = Date.now();
      timer = setTimeout(() => dismissToast(t.id), Math.max(1200, left));
    };
    const el = document.getElementById("toast");
    el?.addEventListener("pointerenter", pause);
    el?.addEventListener("pointerleave", resume);
    el?.addEventListener("focusin", pause);
    el?.addEventListener("focusout", resume);
    return () => {
      clearTimeout(timer);
      paused.current = false;
      el?.removeEventListener("pointerenter", pause);
      el?.removeEventListener("pointerleave", resume);
      el?.removeEventListener("focusin", pause);
      el?.removeEventListener("focusout", resume);
    };
  }, [t]);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(88px+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 lg:bottom-8"
    >
      {t && (
        <div
          id="toast"
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className={`toast-in pointer-events-auto flex max-w-[440px] min-w-0 items-center gap-3 rounded-[18px] py-2 pr-2 pl-4 text-[15px] font-semibold shadow-[0_14px_30px_-12px_rgba(18,26,58,.6)] ${
            t.tone === "error" ? "bg-alert text-white" : "bg-ink text-enamel"
          }`}
        >
          <span className="min-w-0 py-1.5">{t.text}</span>
          {t.action && (
            <button
              className="btn btn-sm flex-none bg-citron text-ink hover:bg-[#ffe37a]"
              onClick={() => {
                t.action!.run();
                dismissToast(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
          <button
            aria-label="Fermer le message"
            className="grid size-11 flex-none place-items-center rounded-full text-[20px] leading-none opacity-80 hover:bg-white/10 hover:opacity-100"
            onClick={() => dismissToast(t.id)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
