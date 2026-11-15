"use client";
// Development-only preview: the real screens, fed by fake data through a
// stubbed fetch. The page that renders this 404s in production builds.
import Link from "next/link";
import { useState } from "react";
import { Lists } from "../lists";
import { ListDetail } from "../list-detail";
import { Swipe } from "../swipe";
import { Search } from "../search";
import { Recap } from "../recap";
import { Invite } from "../invite";
import { Login } from "../login";
import { SiteHeader } from "../site-header";
import { rememberList, type Item } from "../ui";
import type { Uploader } from "@/hooks/upload";
import { items as seed, LIST_ID, MEMBERS } from "./fixtures";
import { SCREENS, type Screen } from "./screens";

const TOKEN = "a".repeat(64);
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function install(screen: Screen) {
  const state = {
    items: seed(),
    voted: new Set<string>(
      screen === "swipe-fini" ? seed().map((i) => i.id) : [],
    ),
    shareLink: {
      id: "inv-2",
      token: "b".repeat(64),
      url: `${location.origin}/invite/${"b".repeat(64)}`,
      created_at: "2026-11-09T10:00:00Z",
    } as null | { id: string; token: string; url: string; created_at: string },
    emailInvites: [
      {
        id: "em-2",
        list_id: LIST_ID,
        email: "thomas.lebrun@exemple.fr",
        created_at: "2026-11-12T10:00:00Z",
        accepted_at: null as string | null,
      },
      {
        id: "em-1",
        list_id: LIST_ID,
        email: "claire@exemple.fr",
        created_at: "2026-11-10T10:00:00Z",
        accepted_at: "2026-11-10T18:00:00Z" as string | null,
      },
    ],
  };
  const role = screen === "proprietaire" ? "owner" : "member";
  const real = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
      window.location.origin,
    );
    const method = (init?.method || "GET").toUpperCase();
    const p = url.pathname;
    if (!p.startsWith("/api/")) return real(input, init);
    await wait(150);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const strip = (i: Item) => ({ ...i, yes: undefined, no: undefined });
    if (p === "/api/lists")
      return json({
        lists:
          screen === "lists-vide"
            ? []
            : [
                {
                  id: LIST_ID,
                  title: "La maison de Rennes",
                  role: "owner",
                  itemCount: 47,
                  remainingCount: 12,
                },
                {
                  id: "l2",
                  title: "Succession de Mamie Jeanne",
                  role: "member",
                  itemCount: 18,
                  remainingCount: 0,
                },
                {
                  id: "l3",
                  title: "Vide-maison, rue Saint-Malo",
                  role: "member",
                  itemCount: 9,
                  remainingCount: 9,
                },
              ],
      });
    if (p === `/api/lists/${LIST_ID}`)
      return json({
        list: { title: "La maison de Rennes" },
        role,
        items: state.items.map(strip),
      });
    if (p === `/api/lists/${LIST_ID}/invites`) {
      if (method === "POST") {
        const token = Date.now().toString(16).padStart(64, "d").slice(-64);
        state.shareLink = {
          id: `inv-${Date.now()}`,
          token,
          url: `${location.origin}/invite/${token}`,
          created_at: new Date().toISOString(),
        };
        return json({ invite: state.shareLink, url: state.shareLink.url }, 201);
      }
      return json({
        invites: [],
        shareLink: state.shareLink,
        emailInvites: state.emailInvites,
      });
    }
    if (p.match(/^\/api\/invites\/(.+)$/)) {
      state.shareLink = null;
      return json({ ok: true });
    }
    if (p === `/api/lists/${LIST_ID}/email-invites`) {
      if (method === "POST") {
        // An address containing "echec" stands for an e-mail that could not leave.
        const email = String(body.email).trim().toLowerCase();
        const found = state.emailInvites.find((i) => i.email === email);
        const invite = found ?? {
          id: `em-${Date.now()}`,
          list_id: LIST_ID,
          email,
          created_at: new Date().toISOString(),
          accepted_at: null,
        };
        if (!found) state.emailInvites.unshift(invite);
        return json(
          { invite, emailSent: !email.includes("echec") },
          found ? 200 : 201,
        );
      }
      return json({ emailInvites: state.emailInvites });
    }
    const emailInvite = p.match(/^\/api\/lists\/[^/]+\/email-invites\/(.+)$/);
    if (emailInvite) {
      state.emailInvites = state.emailInvites.filter(
        (i) => i.id !== emailInvite[1],
      );
      return json({ ok: true });
    }
    const item = p.match(/^\/api\/items\/([^/]+)$/);
    if (item) {
      if (method === "DELETE")
        state.items = state.items.filter((i) => i.id !== item[1]);
      else
        state.items = state.items.map((i) =>
          i.id === item[1]
            ? {
                ...i,
                title: body.title ?? i.title,
                description: body.description ?? i.description,
              }
            : i,
        );
      return json({ ok: true, notice: null });
    }
    const vote = p.match(/^\/api\/items\/([^/]+)\/vote$/);
    if (vote) {
      if (method === "DELETE") state.voted.delete(vote[1]);
      else state.voted.add(vote[1]);
      return json({ ok: true });
    }
    if (p === `/api/lists/${LIST_ID}/swipe`)
      return json({
        items: state.items.filter((i) => !state.voted.has(i.id)).map(strip),
      });
    if (p === `/api/lists/${LIST_ID}/search`) {
      await wait(350);
      const words = (url.searchParams.get("q") || "")
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2);
      return json({
        items: state.items
          .filter((i) =>
            words.some((w) =>
              `${i.title || ""} ${i.description || ""}`
                .toLowerCase()
                .includes(w),
            ),
          )
          .map(strip),
      });
    }
    if (p === `/api/lists/${LIST_ID}/recap`) {
      const all = [...state.items].sort(
        (a, b) => (b.yes?.length ?? 0) - (a.yes?.length ?? 0),
      );
      return json({
        items: all,
        members: MEMBERS.map((m) => {
          const yes = all.filter((i) =>
            i.yes?.some((y) => y.id === m.id),
          ).length;
          const no = all.filter((i) => i.no?.some((y) => y.id === m.id)).length;
          return { ...m, yes, no, remaining: all.length - yes - no };
        }),
      });
    }
    if (p.startsWith("/api/invite/")) {
      if (method === "POST") return json({ listId: LIST_ID });
      return json({
        invite: {
          list_title: "La maison de Rennes",
          owner_name: "Muriel",
          expired: screen === "invitation-expiree",
        },
        signedIn: screen === "invitation-connecte",
      });
    }
    if (p === "/api/auth/login") return json({ ok: true });
    return json({ error: "Introuvable." }, 404);
  };
  rememberList(LIST_ID, { title: "La maison de Rennes", role });
}

// Fake uploader: a photo whose name contains "flou" fails, the others go through.
const fakeUpload: Uploader = async (_, file, update) => {
  update({ step: "sending" });
  await wait(900);
  if (/flou/i.test(file.name)) throw new Error("La photo n’a pas pu partir.");
  update({ step: "describing" });
  await wait(1400);
  update({ step: "done" });
};

export function Preview({ screen }: { screen: Screen | null }) {
  const [ready] = useState(() => {
    if (typeof window !== "undefined" && screen) install(screen);
    return true;
  });
  if (!screen)
    return (
      <>
        <SiteHeader />
        <main id="contenu" className="mx-auto max-w-[720px] px-4 py-10">
          <h1 className="text-[32px] font-extrabold">Aperçu des écrans</h1>
          <p className="mt-2 text-muted">
            Données de démonstration, en développement seulement.
          </p>
          <ul className="mt-6 grid gap-2">
            {Object.entries(SCREENS).map(([k, v]) => (
              <li key={k}>
                <Link
                  className="btn btn-quiet btn-block justify-start"
                  href={`/dev/preview/${k}`}
                >
                  {v}
                </Link>
              </li>
            ))}
          </ul>
        </main>
      </>
    );
  if (!ready) return null;
  switch (screen) {
    case "lists":
    case "lists-vide":
      return (
        <>
          <SiteHeader />
          <main id="contenu">
            <Lists />
          </main>
        </>
      );
    case "proprietaire":
    case "invite":
      return <ListDetail id={LIST_ID} uploader={fakeUpload} />;
    case "swipe":
    case "swipe-fini":
      return <Swipe id={LIST_ID} />;
    case "recherche":
      return <Search id={LIST_ID} />;
    case "recap":
      return <Recap id={LIST_ID} />;
    case "invitation":
    case "invitation-connecte":
    case "invitation-expiree":
      return (
        <>
          <SiteHeader />
          <Invite token={TOKEN} />
        </>
      );
    case "connexion":
      return (
        <>
          <SiteHeader />
          <Login next="/lists" />
        </>
      );
  }
}
