import type { Metadata } from "next";
import { Lists } from "@/components/lists";
import { Logout } from "@/components/login";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Mes listes" };

export default function Page() {
  return (
    <>
      <SiteHeader>
        <Logout />
      </SiteHeader>
      <main id="contenu">
        <Lists />
      </main>
    </>
  );
}
