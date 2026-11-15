import type { Metadata } from "next";
import { Lists } from "@/components/lists";
import { UserNav } from "@/components/me";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Mes listes" };

export default function Page() {
  return (
    <>
      <SiteHeader>
        <UserNav />
      </SiteHeader>
      <main id="contenu">
        <Lists />
      </main>
    </>
  );
}
