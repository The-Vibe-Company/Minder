"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/browser";

// Supabase's implicit email flow returns tokens in a fragment, invisible to
// server routes. Consume them in the browser, erase them, then let the server
// verify the resulting session and perform the normal claim/join flow.
export default function CompleteAuth() {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const access_token = fragment.get("access_token");
    const refresh_token = fragment.get("refresh_token");
    const next = new URLSearchParams(window.location.search).get("next") ?? "/lists";
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    if (!access_token || !refresh_token) {
      window.location.replace("/login?error=invalid_link");
      return;
    }
    void createClient().auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      window.location.replace(error ? "/login?error=invalid_link" :
        `/auth/callback?session=1&next=${encodeURIComponent(next)}`);
    }).catch(() => window.location.replace("/login?error=invalid_link"));
  }, []);
  return <p>Connexion en cours…</p>;
}
