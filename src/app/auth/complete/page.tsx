"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

// Switching email templates to {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=...
// makes this fragment-completion page unnecessary.
export default function CompleteAuth() {
  const started = useRef(false);
  const [pending, setPending] = useState<{ access_token: string; refresh_token: string; email: string; next: string }>();
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const access_token = fragment.get("access_token");
    const refresh_token = fragment.get("refresh_token");
    const next = new URLSearchParams(window.location.search).get("next") ?? "/lists";
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    void (async () => {
      const { data: { user } } = await createClient().auth.getUser();
      if (user) {
        window.location.replace(`/auth/callback?session=1&next=${encodeURIComponent(next)}`);
        return;
      }
      if (!access_token || !refresh_token) throw new Error("missing tokens");
      // Unverified claim for display only; setSession performs authentication.
      const payload = access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const claims = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload), c => c.charCodeAt(0))));
      if (typeof claims.email !== "string" || !claims.email) throw new Error("missing email");
      setPending({ access_token, refresh_token, email: claims.email, next });
    })().catch(() => window.location.replace("/login?error=invalid_link"));
  }, []);
  const confirm = async () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      const db = createClient();
      // The decoded label is not proof of identity. Reject expired/forged
      // access tokens before auth-js could refresh into a different account.
      const verified = await db.auth.getUser(pending.access_token);
      if (verified.error || verified.data.user?.email !== pending.email) {
        throw new Error("invalid identity");
      }
      const existing = await db.auth.getUser();
      if (existing.data.user) {
        window.location.replace(`/auth/callback?session=1&next=${encodeURIComponent(pending.next)}`);
        return;
      }
      const { error } = await db.auth.setSession({
        access_token: pending.access_token, refresh_token: pending.refresh_token,
      });
      window.location.replace(error ? "/login?error=invalid_link" :
        `/auth/callback?session=1&next=${encodeURIComponent(pending.next)}`);
    } catch {
      window.location.replace("/login?error=invalid_link");
    }
  };
  return <main id="contenu" className="toile min-h-[calc(100dvh-65px)] px-4 py-8 lg:py-16">
    <div className="mx-auto max-w-[460px] rounded-[28px] bg-enamel p-6 lg:p-9" aria-live="polite">
      <p className="kicker">Connexion</p>
      {pending ? <>
        <h1 className="mt-3 text-[28px] font-extrabold">Se connecter en tant que <span className="break-all">{pending.email}</span>{" ?"}</h1>
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="btn" disabled={busy} onClick={() => void confirm()}>{busy ? "Connexion…" : "Continuer"}</button>
          <a className="btn btn-quiet" href="/login">Ce n&apos;est pas moi</a>
        </div>
      </> : <p role="status">Vérification de la connexion…</p>}
    </div>
  </main>;
}
